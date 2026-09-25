/**
 * Breadth-first search on the device (design 8.4, 3.3 line 807, 9.7; P8-T6, the P8 plan's PD-5 / PD-6 / PD-7 /
 * PD-14 / PD-24 / PD-26 / DEP-P8-B): the two-phase top-down workhorse over the `Frontier` of P8-T4. Every level is
 * four recorded dispatches -- `frontier-finalize` role 0 (the level boundary: rotates the counts, advances `level`,
 * decides `done`, sizes the expand slot), `advance-expand` (the frontier's rows into the edge queue, indirect),
 * `frontier-finalize` role 1 (clamps `edgeCount`, sizes the contract slot) and `bfs-contract` (the claim
 * `atomicMin(&depth[v], level + 1)`, the winners packed into the next vertex queue, indirect) -- and the host records
 * `MAX_LEVELS_PER_SUBMIT` levels into ONE command buffer, submits, and reads four bytes, the `done` word (PD-7): a
 * road network has thousands of levels and a per-level `mapAsync` would be slower than the CPU. A level recorded
 * past the end is a no-op (its boundary finds `done` set, zeroes its slots and moves no counter), so the loop needs
 * no diameter and ends on `done`; a traversal has at most `n` levels, so more submits than that is E_VALIDATION,
 * never a hang.
 *
 * There is no dedupe (DEP-P8-B, PD-5): the edge queue holds duplicates -- a vertex with three frontier neighbours
 * appears three times -- but for one level exactly one invocation observes `INVALID_INDEX` at `depth[v]` and
 * exactly that one appends `v`, so the next vertex frontier is duplicate-free by construction and an ownership
 * dedupe would have nothing to remove. `parent` is not written by the claim (PD-24): `sssp-pred` in `MODE 1` runs
 * once over the settled depths and writes the SMALLEST `u` with `depth[u] + 1 == depth[v]` and an arc `u -> v`, so
 * it is bitwise reproducible where a claim-time parent would be a scheduling accident. `order` (PD-14) is one
 * stable radix sort of the node indices by `depth`: grouped by level, ascending by index within a level,
 * `INVALID_INDEX` last, and the first `visitedCount` values are the result. The result batch stages every array
 * into one staging slot, so a traversal maps `ceil(levels / 32) + 1` buffers in all.
 *
 * `maxDepth` reaches the device as a `u32` field of `FrontierParams`, and the uniform writer refuses anything that
 * is not an integer in `[0, 2^32 - 1]`; the host therefore normalises it first, to exactly the CPU port's rule
 * (`algorithms/src/indexed/bfs.ts`: a node at depth `d >= maxDepth` is reached and not expanded, unbounded when
 * absent). The tuning entry `bfsWithTuning` (PD-26) is what the tests drive; nothing public exposes it.
 */

import { type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";

import { FRONTIER_CANDIDATES, MAX_LEVELS_PER_SUBMIT, U32_MAX } from "../constants.js";
import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { CommandBatch } from "../kernel/batch.js";
import { plan1d, planGridStride } from "../kernel/dispatch.js";
import { type UniformValues } from "../kernel/struct-block.js";
import {
    FILL_PARAMS,
    FRONTIER_COUNTERS,
    FRONTIER_PARAMS,
    graphBindings,
    graphOverrides,
    kernelSpec,
} from "../kernels.js";
import { prepareAdvance } from "../primitives/advance.js";
import { assertWholeCore } from "../primitives/core-shape.js";
import { type FrontierFinalizeFields, prepareFrontier, SLOT, W } from "../primitives/frontier.js";
import { prepareRadixSort, radixHistBytes } from "../primitives/radix-sort.js";
import { assertDeviceComputes } from "../primitives/verify.js";
import { type BfsOptions } from "../types/accelerator.js";
import { type Binding } from "../types/memory.js";
import { type GpuRunOptions } from "../types/run.js";
import { type GpuBfsResult } from "../types/traversal.js";
import { type AlgorithmScope, algorithmScope } from "./scope.js";

const ALGORITHM = "breadthFirstSearch";

/**
 * Params slots of the ring, COUNTED, because `UniformRing.reserve` wraps to slot 0 when a submit's records outrun
 * the ring and silently overwrites the submit's first record: per level `frontier-finalize` twice, `advance-expand`
 * and `bfs-contract` (4 records; P8-T7 adds the two fused dispatches, 6; P8-T8 adds the bits `fill`,
 * `bfs-bitset-build` and `bfs-bottom-up`, 9), plus per submit P8-T8's rebuild (`bfs-unvisited-flags` and `compact`,
 * whose scan is at most 9 dispatches for any n below 2^32, so 10) and the result batch's records (the two `fill`s,
 * the radix sort's per-pass records and `sssp-pred`; they flush in their own submit but must fit the same ring).
 * `9 x MAX_LEVELS_PER_SUBMIT + 16` covers every submit of the finished driver with room; P8-T7 and P8-T8 re-count it
 * when they add their records.
 */
const RING_SLOTS = 9 * MAX_LEVELS_PER_SUBMIT + 16;

/**
 * The knobs the tests need and nothing public offers (PD-26): the per-level candidate rule, the edge queue's size,
 * the submit cadence, the predecessor kind, and the two inspect seams.
 * @internal
 */
export interface BfsTuning {
    /** `"auto"` lets the selector choose per level (P8-T8 wires Beamer's test); `"top-down"` disables the bottom-up candidate. Top-down only until P8-T8. */
    readonly direction?: "auto" | "top-down" | undefined;
    /** Beamer's alpha (P8-T8; derived from the graph when absent). */
    readonly alpha?: number | undefined;
    /** Beamer's beta (P8-T8; `BEAMER_BETA` when absent). */
    readonly beta?: number | undefined;
    /** The fused expand-contract threshold (P8-T7; `FUSED_FRONTIER_MAX` when absent). Passed as 0 until P8-T7 lands the fused kernel. */
    readonly fusedMax?: number | undefined;
    /** The edge queue's entry count; a test fakes a small one to force the overflow path (PD-23). */
    readonly edgeCapacity?: number | undefined;
    /** Levels recorded per submit (default `MAX_LEVELS_PER_SUBMIT`); 1 hands `onLevel` the block after every level. */
    readonly levelsPerSubmit?: number | undefined;
    /** What the post-pass writes into `parent`: 1 (default) the node index, 0 the arc index (P8-T9's unit-weight route). */
    readonly predKind?: 0 | 1 | undefined;
    /** The inspect seam (design 11.9 item 2): after every SUBMIT, the index of the last level recorded, the whole counters block as the submit left it, and the vertices the submit's last level claimed (the next level's input queue, `nextFrontierCount` long). */
    readonly onLevel?: ((level: number, counters: UniformValues, frontier: U32) => void) | undefined;
    /** Fires once, right after `algorithmScope(...)`, so a test can hold the scope and read its ring counters after the run. */
    readonly onScope?: ((scope: AlgorithmScope) => void) | undefined;
}

/**
 * The CPU port's `maxDepth` as a `u32`: `U32_MAX` (no cap) when absent, `NaN` (`d >= NaN` never holds) or at or
 * above `U32_MAX` (which covers `Infinity`); otherwise `max(0, ceil(maxDepth))` -- `2.5` behaves as 3 because
 * `d >= 2.5` first holds at `d == 3`, and a negative value gives 0, the source alone, because `0 >= -1` already holds.
 * @param maxDepth - the caller's option
 * @returns the value the uniform carries
 */
function normaliseMaxDepth(maxDepth: number | undefined): number {
    if (maxDepth === undefined || Number.isNaN(maxDepth) || maxDepth >= U32_MAX) {
        return U32_MAX;
    }
    return Math.max(0, Math.ceil(maxDepth));
}

/**
 * Validates `options.dest` for a depth result of `n` elements.
 * @param dest - the caller's destination array, if any
 * @param n - the node count
 * @returns the destination as a U32, or null when none was given
 */
function checkDest(dest: Float32Array | Uint32Array | undefined, n: number): U32 | null {
    if (dest === undefined) {
        return null;
    }
    if (dest instanceof Uint32Array && dest.length === n && dest.buffer instanceof ArrayBuffer) {
        return dest as U32;
    }
    throw new WebGpuGraphError(
        "E_INVALID_ARGUMENT",
        `${ALGORITHM}: dest must be a Uint32Array of length ${n} over an ArrayBuffer`,
        {
            argument: "dest",
            value: `${dest.constructor.name}(${dest.length})`,
            expected: `Uint32Array(${n}) over an ArrayBuffer`,
        },
    );
}

/**
 * Whole-buffer binding of a scratch buffer over its first `size` bytes.
 * @param buffer - the buffer
 * @param size - the bound byte length
 * @returns the binding
 */
function bindingOf(buffer: GPUBuffer, size: number): Binding {
    return { buffer, offset: 0, size, window: null };
}

/**
 * The E_ABORTED error of a signal.
 * @param batchId - the last submitted batch, when one exists
 * @returns the error
 */
function aborted(batchId?: number): WebGpuGraphError {
    return new WebGpuGraphError(
        "E_ABORTED",
        `${ALGORITHM}: the signal was aborted`,
        batchId === undefined ? {} : { batchId },
    );
}

/**
 * One scalar word of a decoded block (every FrontierCounters field is a u32, so anything else is a decoder bug).
 * @param block - the decoded block
 * @param name - the field
 * @returns the word
 */
function wordOf(block: UniformValues, name: string): number {
    const value = block[name];
    if (typeof value !== "number") {
        throw new WebGpuGraphError("E_VALIDATION", `${ALGORITHM}: counters.${name} did not decode to a number`, {
            label: `${ALGORITHM}/counters`,
            message: `the field ${name} did not decode to a number`,
        });
    }
    return value;
}

/**
 * Breadth-first search with the test knobs of PD-26; `breadthFirstSearch` is this with an empty tuning.
 * @internal
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param source - the source node index
 * @param options - `maxDepth`, plus dest / signal / onProgress
 * @param tuning - the knobs
 * @returns the depths, parents, order, visited count, level count and switches
 */
export async function bfsWithTuning(
    ctx: GpuContext,
    s: GraphSnapshot,
    source: number,
    options: (BfsOptions & GpuRunOptions) | undefined,
    tuning: BfsTuning,
): Promise<GpuBfsResult> {
    ctx.assertReady();
    await assertDeviceComputes(ctx);
    const n = s.nodeCount;
    if (!Number.isInteger(source) || source < 0 || source >= n) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `${ALGORITHM}: source ${source} is outside [0, ${n})`, {
            argument: "source",
            value: source,
            expected: `an integer in [0, ${n})`,
        });
    }
    const levelsPerSubmit = tuning.levelsPerSubmit ?? MAX_LEVELS_PER_SUBMIT;
    if (!Number.isInteger(levelsPerSubmit) || levelsPerSubmit < 1 || levelsPerSubmit > MAX_LEVELS_PER_SUBMIT) {
        throw new WebGpuGraphError(
            "E_INVALID_ARGUMENT",
            `${ALGORITHM}: levelsPerSubmit must be an integer in [1, ${MAX_LEVELS_PER_SUBMIT}]`,
            {
                argument: "levelsPerSubmit",
                value: levelsPerSubmit,
                expected: `an integer in [1, ${MAX_LEVELS_PER_SUBMIT}]`,
            },
        );
    }
    const dest = checkDest(options?.dest, n);
    const maxDepth = normaliseMaxDepth(options?.maxDepth);
    const predKind = tuning.predKind ?? 1;
    if (options?.signal?.aborted) {
        throw aborted();
    }
    const core = ctx.residency.core(s);
    assertWholeCore(core, s.arcCount, ctx.caps.limits.maxStorageBufferBindingSize, ALGORITHM);
    const scope = algorithmScope(ctx, ALGORITHM, RING_SLOTS);
    tuning.onScope?.(scope);
    try {
        const bytes = 4 * n;
        const wg = ctx.workgroupSize;
        const depth = bindingOf(scope.scratch(bytes, "depth"), bytes);
        await ctx.allocator.check();
        const planner = await prepareFrontier(scope, n, s.arcCount, tuning.edgeCapacity);
        const advance = await prepareAdvance(scope, core);
        const contract = await ctx.pipelines.kernel(kernelSpec("bfs-contract"));
        const pred = await ctx.pipelines.kernel(kernelSpec("sssp-pred", { ...graphOverrides(core, null), MODE: 1 }));
        const fill = await ctx.pipelines.kernel(kernelSpec("fill"));
        const sort = await prepareRadixSort(scope);
        const { frontier } = planner;
        const { counters } = frontier;
        const { queue } = ctx.device;
        const fillPlan = plan1d(n, wg, ctx.caps);
        const recordFill = (pass: GPUComputePassEncoder, dst: Binding, value: number, mode: 0 | 1): void => {
            const params = scope.params(FILL_PARAMS, { count: n, value, mode, pad0: 0 });
            fill.dispatch(pass, fill.bind({ dst, P: params.binding }), fillPlan, [params.offset]);
        };
        const submit = (batch: CommandBatch): ReturnType<CommandBatch["submit"]> => {
            scope.flush();
            return batch.submit();
        };

        // setup: depth = INVALID_INDEX everywhere; then the source at 0 and the seeded block, both queue writes
        // ordered before the first level submit (the seed is rotated in by the first boundary, P8-T4)
        const setup = new CommandBatch(ctx, `${ALGORITHM}/setup`);
        recordFill(setup.pass("fill"), depth, INVALID_INDEX, 0);
        setup.endPass();
        await submit(setup).readback;
        ctx.assertReady();
        queue.writeBuffer(depth.buffer, depth.offset + 4 * source, Uint32Array.of(0));
        frontier.reset(queue, source, { nextFrontierCount: 1, level: U32_MAX });

        // the levels: MAX_LEVELS_PER_SUBMIT per submit, four bytes back (PD-7); the trivial candidate rule until
        // P8-T7 / P8-T8 (mode 1 = top-down only, fusedMax 0 = never fused)
        const fields: FrontierFinalizeFields = { mode: 1, fusedMax: 0, maxDepth };
        const window = { arcBase: 0, arcEnd: s.arcCount };
        let levelsRecorded = 0;
        let submits = 0;
        for (;;) {
            const batch = new CommandBatch(ctx, `${ALGORITHM}/levels`);
            const pass = batch.pass("bfs");
            for (let level = 0; level < levelsPerSubmit; level++) {
                planner.recordFinalize(pass, 0, level, { ...fields, firstOfSubmit: Math.min(level, 2) });
                advance.record(pass, frontier, level, window);
                planner.recordFinalize(pass, 1, level, fields);
                const params = scope.params(FRONTIER_PARAMS, { wg, n, edgeCapacity: frontier.edgeCapacity });
                const bound = contract.bind({
                    edgeQueue: frontier.edgeQueue,
                    counters,
                    depth,
                    frontierOut: frontier.output,
                    P: params.binding,
                });
                contract.dispatchIndirect(pass, bound, frontier.args, level * FRONTIER_CANDIDATES + SLOT.contract, [
                    params.offset,
                ]);
                frontier.swap();
            }
            batch.endPass();
            const doneRequest = batch.readback(counters.buffer, counters.offset + 4 * W.done, 4);
            const inspect =
                tuning.onLevel === undefined
                    ? null
                    : {
                          block: batch.readback(counters.buffer, counters.offset, FRONTIER_COUNTERS.byteLength),
                          frontier: batch.readback(frontier.input.buffer, frontier.input.offset, frontier.input.size),
                      };
            const submitted = submit(batch);
            const back = await submitted.readback;
            levelsRecorded += levelsPerSubmit;
            submits += 1;
            ctx.assertReady();
            if (options?.signal?.aborted) {
                throw aborted(submitted.id);
            }
            options?.onProgress?.(Math.min(levelsRecorded, n), n);
            if (inspect !== null && tuning.onLevel !== undefined) {
                const block = FRONTIER_COUNTERS.read(new DataView(back), inspect.block.offset);
                const claimed = new Uint32Array(back, inspect.frontier.offset, wordOf(block, "nextFrontierCount"));
                tuning.onLevel(levelsRecorded - 1, block, claimed.slice());
            }
            if (new Uint32Array(back, doneRequest.offset, 1)[0] !== 0) {
                break;
            }
            if (submits > n + 1) {
                throw new WebGpuGraphError(
                    "E_VALIDATION",
                    `${ALGORITHM}: the done flag never rose in ${submits} submits (a traversal has at most ${n} levels)`,
                    { label: ALGORITHM, message: `the done flag never rose in ${submits} submits` },
                );
            }
        }

        // the result batch: order by one stable radix sort of the node indices by depth (PD-14), parent by the
        // post-pass in depth mode (PD-24), then every array through ONE staging slot
        const keys = bindingOf(scope.scratch(bytes, "order/keys"), bytes);
        const vals = bindingOf(scope.scratch(bytes, "order/vals"), bytes);
        const histBytes = radixHistBytes(n, wg);
        const scratch = {
            keys: bindingOf(scope.scratch(bytes, "order/keys-scratch"), bytes),
            vals: bindingOf(scope.scratch(bytes, "order/vals-scratch"), bytes),
            hist: bindingOf(scope.scratch(histBytes, "order/hist"), histBytes),
            offsets: bindingOf(scope.scratch(histBytes, "order/offsets"), histBytes),
        };
        const parent = bindingOf(scope.scratch(bytes, "parent"), bytes);
        const result = new CommandBatch(ctx, `${ALGORITHM}/result`);
        result.copy(depth, keys, bytes);
        const pass = result.pass("result");
        recordFill(pass, vals, 0, 1);
        const sorted = sort.record(pass, keys, vals, n, 32, scratch);
        recordFill(pass, parent, INVALID_INDEX, 0);
        const predPlan = planGridStride(n, wg, ctx.caps);
        const predParams = scope.params(FRONTIER_PARAMS, {
            wg,
            n,
            arcBase: 0,
            arcEnd: s.arcCount,
            predKind,
            source,
            stride: predPlan.stride ?? n,
        });
        const predBound = pred.bind({ ...graphBindings(core, null), dist: depth, pred: parent, P: predParams.binding });
        pred.dispatch(pass, predBound, predPlan, [predParams.offset]);
        result.endPass();
        const depthRequest = result.readback(depth.buffer, depth.offset, bytes);
        const parentRequest = result.readback(parent.buffer, parent.offset, bytes);
        const orderRequest = result.readback(sorted.vals.buffer, sorted.vals.offset, bytes);
        const blockRequest = result.readback(counters.buffer, counters.offset, FRONTIER_COUNTERS.byteLength);
        const back = await submit(result).readback;
        ctx.assertReady();
        const block = FRONTIER_COUNTERS.read(new DataView(back), blockRequest.offset);
        const visitedCount = wordOf(block, "visitedCount");
        if (visitedCount > n) {
            // every vertex is claimed at most once, so a count above n is a kernel bug (a claim that lets two
            // same-level claimants append), never a result to return
            throw new WebGpuGraphError(
                "E_VALIDATION",
                `${ALGORITHM}: visitedCount ${visitedCount} exceeds the ${n} vertices (a duplicate claim)`,
                {
                    label: `${ALGORITHM}/visitedCount`,
                    message: `the device counted ${visitedCount} visits of ${n} vertices`,
                },
            );
        }
        const level = wordOf(block, "level");
        // done by an empty frontier (the level word already counts the boundary that found it), or by maxDepth with
        // a reached-but-unexpanded level
        const levels = wordOf(block, "frontierCount") === 0 ? level : level + 1;
        const depthOut = dest ?? new Uint32Array(n);
        depthOut.set(new Uint32Array(back, depthRequest.offset, n));
        return {
            depth: depthOut,
            parent: new Uint32Array(back, parentRequest.offset, n).slice(),
            order: new Uint32Array(back, orderRequest.offset, visitedCount).slice(),
            visitedCount,
            levels,
            switches: wordOf(block, "switches"),
        };
    } finally {
        scope.dispose();
    }
}

/**
 * Breadth-first search on the device (spec 3.3 line 807, design 8.4, 9.7): `depth` exact, `parent` the smallest
 * predecessor one depth down (PD-24), `order` grouped by depth and ascending by index within a depth (PD-14), all
 * bitwise reproducible; `maxDepth` as the CPU port reads it (a node at the cap is reached and not expanded).
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param source - the source node index (E_INVALID_ARGUMENT outside `[0, n)`, so the empty graph refuses every source)
 * @param options - `maxDepth`, plus dest (a Uint32Array of length n for `depth`) / signal / onProgress
 * @returns the depths, parents, order, visited count, level count and switches (0: top-down only until P8-T8)
 */
export function breadthFirstSearch(
    ctx: GpuContext,
    s: GraphSnapshot,
    source: number,
    options?: BfsOptions & GpuRunOptions,
): Promise<GpuBfsResult> {
    return bfsWithTuning(ctx, s, source, options, {});
}
