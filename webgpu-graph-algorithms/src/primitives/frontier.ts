/**
 * The `Frontier` of design 6 row 7 and the device-side dispatch selector of design 5.4 (P8-T4; the P8 plan's PD-1,
 * PD-3, PD-8, PD-23, DEP-P8-A, DEP-P8-C). A traversal's per-level state is two n-slot vertex queues, ONE 25-word
 * counters block (every counter of the phase is a word of it: a four-byte word is never a legal storage-binding
 * offset, and the selector must reach every count it acts on through one binding) and the edge queue. The host
 * never reads a counter inside a submit: `frontier-finalize`, one lane, runs at the START of every level (role 0:
 * rotates `nextFrontierCount` into `frontierCount`, advances `level`, decides `done`, chooses the level's path) and
 * again once the edge queue is filled (role 1: clamps `edgeCount`, or on an overflow -- `edgeCountUnclamped >
 * edgeCapacity` -- switches the path to the fused retry, PD-23). The choice is the block's `path` word (`W.path`,
 * word 24); every level kernel is a direct grid-stride dispatch that reads it first and does nothing unless the
 * word names it (design/decisions/2026-09-25-frontier-kernels-dispatch-directly.md: the seven indirect slots the
 * selector once wrote per level cost about 0.4 ms of Dawn validation each and were 97 % of a traversal's wall
 * time; they and their args buffer are gone). The host records up to `MAX_LEVELS_PER_SUBMIT` levels per submit and
 * reads `done` (four bytes) once per submit; a boundary that finds `done` set writes path 0 and moves no counter,
 * so the recorded levels past the end are no-ops and the counters freeze at the finishing boundary's values.
 *
 * The seed: `frontierCount` is NEVER seeded, because the first boundary rotates it out unread. A BFS driver calls
 * `reset(queue, source, { nextFrontierCount: 1, level: U32_MAX })`: the first boundary rotates the 1 in, adds it into
 * `visitedCount`, and wraps `level` to 0, so the level-0 expansion claims the source's neighbours at `level + 1 == 1`.
 * `reset` is a queue write, ordered before the submit that follows, and it puts the source on side 0.
 *
 * Every buffer comes from the caller's ONE lease (`scope.scratch`) so the algorithm's dispose()
 * releases them together (design 4.4). The two vertex queues are two BUFFERS, never two ranges of one: `Kernel.bind`
 * rejects one buffer bound read-only and read-write in one dispatch even for disjoint ranges. `src/primitives/**`
 * never imports `src/context.ts`.
 */

import { MAX_LEVELS_PER_SUBMIT, U32_MAX } from "../constants.js";
import { WebGpuGraphError } from "../errors.js";
import { plan1d } from "../kernel/dispatch.js";
import { type Kernel } from "../kernel/kernel.js";
import { FRONTIER_COUNTERS, FRONTIER_PARAMS, kernelSpec } from "../kernels.js";
import { type Binding } from "../types/memory.js";
import { type ReduceScope } from "./reduce.js";

/** The values of the `path` word (`W.path`): what a level's kernels run; every level kernel reads it first. */
export const PATH: Readonly<{
    none: 0;
    twoPhase: 1;
    fused: 2;
    bottomUp: 3;
    fusedRetry: 4;
    near: 5;
    far: 6;
}> = Object.freeze({ none: 0, twoPhase: 1, fused: 2, bottomUp: 3, fusedRetry: 4, near: 5, far: 6 });

/** The words of the counters block (`FRONTIER_COUNTERS`), by index: byte offset 4 x word; no driver types a number. */
export const W: Readonly<{
    frontierCount: 0;
    nextFrontierCount: 1;
    frontierDegreeSum: 2;
    prevFrontierCount: 3;
    prevDegreeSum: 4;
    unvisitedCount: 5;
    unvisitedDegreeSum: 6;
    unvisitedListLen: 7;
    edgeCount: 8;
    edgeCountUnclamped: 9;
    overflowLevels: 10;
    level: 11;
    visitedCount: 12;
    switches: 13;
    direction: 14;
    done: 15;
    arcsScanned: 16;
    fusedLevels: 17;
    twoPhaseLevels: 18;
    bottomUpLevels: 19;
    farCount: 20;
    nextFarCount: 21;
    thresholdBits: 22;
    deltaBits: 23;
    path: 24;
}> = Object.freeze({
    frontierCount: 0,
    nextFrontierCount: 1,
    frontierDegreeSum: 2,
    prevFrontierCount: 3,
    prevDegreeSum: 4,
    unvisitedCount: 5,
    unvisitedDegreeSum: 6,
    unvisitedListLen: 7,
    edgeCount: 8,
    edgeCountUnclamped: 9,
    overflowLevels: 10,
    level: 11,
    visitedCount: 12,
    switches: 13,
    direction: 14,
    done: 15,
    arcsScanned: 16,
    fusedLevels: 17,
    twoPhaseLevels: 18,
    bottomUpLevels: 19,
    farCount: 20,
    nextFarCount: 21,
    thresholdBits: 22,
    deltaBits: 23,
    path: 24,
});

/** The words a `reset` seeds (every other word is zeroed). */
export type FrontierSeed = Readonly<Partial<Record<keyof typeof W, number>>>;

/** The `FrontierParams` fields a caller passes to `recordFinalize`; the planner fills `role`, `wg`, `edgeCapacity` and `n` itself. A missing field is written as 0. */
export type FrontierFinalizeFields = Readonly<
    Partial<
        Record<
            | "alpha"
            | "beta"
            | "fusedMax"
            | "maxDepth"
            | "mode"
            | "cutoffBits"
            | "arcBase"
            | "arcEnd"
            | "predKind"
            | "bitsBase"
            | "source"
            | "stride"
            | "firstOfSubmit"
            | "iteration",
            number
        >
    >
>;

/**
 * The given words of a partial record (a key spelled with an undefined value is dropped, so the block writer sees
 * only numbers).
 * @param words - the partial record
 * @returns the defined entries
 */
function definedWords(words: Readonly<Partial<Record<string, number>>>): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [name, value] of Object.entries(words)) {
        if (value !== undefined) {
            out[name] = value;
        }
    }
    return out;
}

/** The largest role `frontier-finalize` knows: 0 and 1 land here (P8-T4), 2 and 3 are the SSSP piles' (P8-T9). */
const MAX_ROLE = 3;

/**
 * The E_INVALID_ARGUMENT of a value that is not a non-negative integer.
 * @param argument - the argument name
 * @param value - the value
 */
function assertCount(argument: string, value: number): void {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `frontier: ${argument} must be a non-negative integer`, {
            argument,
            value,
            expected: "a non-negative integer",
        });
    }
}

/** The frontier queue of design 6 row 7: two vertex queues, the counters block and the edge queue, all leased by the caller's scope. */
export class Frontier {
    /** The two n-slot u32 vertex queues (`vertices[side]` is the input of the current level). */
    readonly vertices: readonly [Binding, Binding];
    /** The `FrontierCounters` block, 112 B, bound by every kernel as `array<atomic<u32>>`. */
    readonly counters: Binding;
    /** The edge queue: `edgeCapacity` entries of u32 (the target vertex of an arc). */
    readonly edgeQueue: Binding;
    /** How many entries the edge queue holds; role 1 clamps `edgeCount` to it and detects an overflow above it. */
    readonly edgeCapacity: number;
    /** The vertex count (a `reset` source is below it). */
    readonly n: number;
    private sideIndex: 0 | 1 = 0;

    /**
     * Wraps the leased buffers; use prepareFrontier().
     * @param vertices - the two vertex queues
     * @param counters - the counters block
     * @param edgeQueue - the edge queue
     * @param edgeCapacity - the edge queue's entry count
     * @param n - the vertex count
     */
    constructor(
        vertices: readonly [Binding, Binding],
        counters: Binding,
        edgeQueue: Binding,
        edgeCapacity: number,
        n: number,
    ) {
        this.vertices = vertices;
        this.counters = counters;
        this.edgeQueue = edgeQueue;
        this.edgeCapacity = edgeCapacity;
        this.n = n;
    }

    /**
     * Which vertex queue is the input of the current level (a host-side index between two cached bind-group sets).
     * @returns 0 or 1
     */
    get side(): 0 | 1 {
        return this.sideIndex;
    }

    /**
     * The vertex queue the current level expands from.
     * @returns `vertices[side]`
     */
    get input(): Binding {
        return this.sideIndex === 0 ? this.vertices[0] : this.vertices[1];
    }

    /**
     * The vertex queue the current level's claims append to.
     * @returns `vertices[1 - side]`
     */
    get output(): Binding {
        return this.sideIndex === 0 ? this.vertices[1] : this.vertices[0];
    }

    /** Flips the two vertex queues; the counts rotate inside the block, so nothing else moves. */
    swap(): void {
        this.sideIndex = this.sideIndex === 0 ? 1 : 0;
    }

    /**
     * Seeds a traversal: one `queue.writeBuffer` of the whole 112-byte block (zero except the caller's words) and one of
     * `vertices[0][0] = source`, both ordered before the submit that follows; the source is on side 0 afterwards.
     * `frontierCount` is not a word to seed: the first boundary rotates word 1 into it (the BFS seed is
     * `{ nextFrontierCount: 1, level: U32_MAX }`). A source outside `[0, n)`, an unknown word or a value that is not a
     * u32 is E_INVALID_ARGUMENT before anything is written.
     * @param queue - the device queue
     * @param source - the source vertex
     * @param seed - the words to seed
     */
    reset(queue: GPUQueue, source: number, seed: FrontierSeed): void {
        if (!Number.isInteger(source) || source < 0 || source >= this.n) {
            throw new WebGpuGraphError("E_INVALID_ARGUMENT", `frontier: source ${source} is outside [0, ${this.n})`, {
                argument: "source",
                value: source,
                expected: `an integer in [0, ${this.n})`,
            });
        }
        const bytes = new ArrayBuffer(FRONTIER_COUNTERS.byteLength);
        FRONTIER_COUNTERS.write(new DataView(bytes), definedWords(seed));
        this.sideIndex = 0;
        queue.writeBuffer(this.counters.buffer, this.counters.offset, bytes);
        queue.writeBuffer(this.vertices[0].buffer, this.vertices[0].offset, Uint32Array.of(source));
    }
}

/** A prepared frontier (design 6 row 7): the leased queue and the recorded selector dispatches. */
export interface FrontierPlanner {
    /** The queue the planner's selector rotates and chooses the path of. */
    readonly frontier: Frontier;
    /**
     * Records one `frontier-finalize` dispatch (one workgroup) in `role` for `level` of the current submit: one
     * `FrontierParams` record with `wg`, `edgeCapacity` and `n` filled by the planner and every other field from
     * `fields`. A level outside `[0, MAX_LEVELS_PER_SUBMIT)` (the selector addresses nothing by level any more, but
     * the host's submit cadence still is the bound) or a role outside `[0, 3]` is E_INVALID_ARGUMENT before
     * anything is recorded.
     * @param pass - the compute pass
     * @param role - 0 the level boundary, 1 the edge-queue role (2 and 3 are P8-T9's)
     * @param level - the level inside the submit
     * @param fields - the tuning and window words
     */
    recordFinalize(pass: GPUComputePassEncoder, role: number, level: number, fields: FrontierFinalizeFields): void;
}

/**
 * Leases the frontier's buffers from the scope and compiles the selector so `recordFinalize` is synchronous. The
 * edge capacity defaults to `max(1, min(arcCount, floor(maxStorageBufferBindingSize / 4)))` (never a zero-length
 * buffer: the one-node graph has no arcs); a test passes a small one to force the overflow path. The planner lives
 * exactly as long as the scope: never use it after the scope's dispose().
 * @param scope - the caller's scope (device, caps, cache, scratch, params)
 * @param n - the vertex count
 * @param arcCount - the arc count (the natural edge-queue size)
 * @param edgeCapacity - the edge queue's entry count, when the caller chooses it (an integer >= 1)
 * @returns the planner
 */
export async function prepareFrontier(
    scope: ReduceScope,
    n: number,
    arcCount: number,
    edgeCapacity?: number,
): Promise<FrontierPlanner> {
    assertCount("n", n);
    assertCount("arcCount", arcCount);
    const capacity =
        edgeCapacity ?? Math.max(1, Math.min(arcCount, Math.floor(scope.caps.limits.maxStorageBufferBindingSize / 4)));
    if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > U32_MAX) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", "frontier: edgeCapacity must be an integer >= 1", {
            argument: "edgeCapacity",
            value: capacity,
            expected: "an integer in [1, 2^32)",
        });
    }
    const kernel = await scope.pipelines.kernel(kernelSpec("frontier-finalize"));
    const queueBytes = 4 * Math.max(1, n);
    const vertices: readonly [Binding, Binding] = [
        { buffer: scope.scratch(queueBytes, "frontier/vertices-0"), offset: 0, size: queueBytes, window: null },
        { buffer: scope.scratch(queueBytes, "frontier/vertices-1"), offset: 0, size: queueBytes, window: null },
    ];
    const counters: Binding = {
        buffer: scope.scratch(FRONTIER_COUNTERS.byteLength, "frontier/counters"),
        offset: 0,
        size: FRONTIER_COUNTERS.byteLength,
        window: null,
    };
    const edgeQueue: Binding = {
        buffer: scope.scratch(4 * capacity, "frontier/edge-queue"),
        offset: 0,
        size: 4 * capacity,
        window: null,
    };
    const frontier = new Frontier(vertices, counters, edgeQueue, capacity, n);
    return new FrontierPlannerImpl(scope, kernel, frontier);
}

/** The planner: the selector kernel bound once to the frontier's block. */
class FrontierPlannerImpl implements FrontierPlanner {
    readonly frontier: Frontier;
    private readonly scope: ReduceScope;
    private readonly kernel: Kernel;

    /**
     * Wraps the resolved kernel; use prepareFrontier().
     * @param scope - the caller's scope
     * @param kernel - the `frontier-finalize` kernel
     * @param frontier - the leased queue
     */
    constructor(scope: ReduceScope, kernel: Kernel, frontier: Frontier) {
        this.scope = scope;
        this.kernel = kernel;
        this.frontier = frontier;
    }

    /**
     * Records one selector dispatch (see the interface).
     * @param pass - the compute pass
     * @param role - the role
     * @param level - the level inside the submit
     * @param fields - the caller's fields
     */
    recordFinalize(pass: GPUComputePassEncoder, role: number, level: number, fields: FrontierFinalizeFields): void {
        if (!Number.isInteger(level) || level < 0 || level >= MAX_LEVELS_PER_SUBMIT) {
            throw new WebGpuGraphError("E_INVALID_ARGUMENT", `frontier: level ${level} is outside the submit`, {
                argument: "level",
                value: level,
                expected: `an integer in [0, ${MAX_LEVELS_PER_SUBMIT})`,
            });
        }
        if (!Number.isInteger(role) || role < 0 || role > MAX_ROLE) {
            throw new WebGpuGraphError("E_INVALID_ARGUMENT", `frontier: role ${role} is not a finalize role`, {
                argument: "role",
                value: role,
                expected: `an integer in [0, ${MAX_ROLE}]`,
            });
        }
        const { scope, frontier } = this;
        const params = scope.params(FRONTIER_PARAMS, {
            ...definedWords(fields),
            role,
            wg: scope.workgroupSize,
            edgeCapacity: frontier.edgeCapacity,
            n: frontier.n,
        });
        const bound = this.kernel.bind({ counters: frontier.counters, P: params.binding });
        this.kernel.dispatch(pass, bound, plan1d(1, scope.workgroupSize, scope.caps), [params.offset]);
    }
}
