/**
 * Breadth-first search on the device (design 8.4, 3.3 line 807, 9.7; P8-T6 / P8-T7 / P8-T8, the P8 plan's PD-5 /
 * PD-6 / PD-7 / PD-14 / PD-18 / PD-21 / PD-23 / PD-24 / PD-26 / DEP-P8-B): the direction-optimizing traversal over
 * the `Frontier` of P8-T4, every per-level choice made ON THE DEVICE. Every level is eight recorded dispatches, all
 * DIRECT (2026-09-25, docs/decisions/G8.md G8-F5: Dawn validates every `dispatchWorkgroupsIndirect` with an internal
 * clamp pass costing about 0.4 ms of device time whether or not it dispatches anything, in Node and in Chromium
 * alike, and that was 97 % of a traversal's wall time) -- `frontier-finalize` role 0 (the level boundary: rotates
 * the counts, advances `level`, decides `done`, evaluates Beamer's test and CHOOSES, writing the choice into the
 * block's `path` word: 3 bottom-up, 2 fused for a top-down frontier below `fusedMax` entries, 1 two-phase for any
 * other, 0 done), `advance-expand` (the frontier's rows into the edge queue), `frontier-finalize` role 1 (clamps
 * `edgeCount`, or, when the edge queue overflowed, sets `path` 4 for the fused retry, PD-23), `bfs-contract` (the
 * claim `atomicMin(&depth[v], level + 1)`, the winners packed into the next vertex queue), `bfs-fused` (one workgroup
 * per frontier entry with the same claim inline and no edge queue; the fused level and the retry alike), then the
 * bottom-up trio: a `fill` zeroing the frontier bitset, `bfs-bitset-build` setting the frontier's bits, and
 * `bfs-bottom-up` sweeping the unvisited list over the REVERSE core (each unvisited vertex reads its in-neighbours
 * until the first one in the bitset and claims itself). Every kernel is a grid-stride dispatch of a host-planned
 * grid (`planGridStride`) that loops to its count word and reads the path word first, so exactly one path does the
 * level's work and the others cost one uniform load per workgroup. The unvisited set Beamer's test is against (PD-18) is rebuilt exactly once per submit, before
 * the levels, by `bfs-unvisited-flags` plus `compact` over an iota queue, and maintained between rebuilds by
 * subtraction inside the selector (whose JSDoc states the boundary rule). The host records `MAX_LEVELS_PER_SUBMIT`
 * levels into ONE command buffer, submits, and reads four bytes, the `done` word (PD-7): a road network has
 * thousands of levels and a per-level `mapAsync` would be slower than the CPU. A level recorded past the end is a
 * no-op (its boundary finds `done` set, zeroes its slots and moves no counter), so the loop needs no diameter and
 * ends on `done`; a traversal has at most `n` levels, so more submits than that is E_VALIDATION, never a hang. The
 * thresholds are uniform fields (`FUSED_FRONTIER_MAX`; alpha derived as `max(1, floor(arcCount / n))`, PD-21;
 * `BEAMER_BETA`; `mode 1` pinning top-down -- each unless the tuning says otherwise), so a test forces any path
 * without recompiling; the block's `fusedLevels` / `twoPhaseLevels` / `bottomUpLevels` / `overflowLevels` /
 * `switches` words record which path each level took.
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
 *
 * A core whose `colIdx` exceeds `maxStorageBufferBindingSize` is bound as arc windows and EXECUTED (P8-T12, DEP-P8-E
 * lifted for the frontier family): `advance-expand`, `bfs-fused` and `sssp-pred` run once per window of the
 * forward core and `bfs-bottom-up` once per window of the reverse core, every window its own dispatch with its own
 * `FrontierParams` record carrying the window's owned arc range (`coreWindows`), and the claims, being `atomicMin`s
 * and an `INVALID_INDEX` entry test, are idempotent across windows. The ring is sized per run by `bfsRingSlots`.
 */

import { type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";

import { BEAMER_BETA, FUSED_FRONTIER_MAX, MAX_LEVELS_PER_SUBMIT, U32_MAX } from "../constants.js";
import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { CommandBatch } from "../kernel/batch.js";
import { type DispatchPlan, plan1d, planGridStride } from "../kernel/dispatch.js";
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
import { prepareCompact } from "../primitives/compact.js";
import { coreOfView, coreWindows } from "../primitives/core-shape.js";
import { type FrontierFinalizeFields, prepareFrontier, W } from "../primitives/frontier.js";
import { prepareRadixSort, radixHistBytes } from "../primitives/radix-sort.js";
import { assertDeviceComputes } from "../primitives/verify.js";
import { type BfsOptions } from "../types/accelerator.js";
import { type Binding } from "../types/memory.js";
import { type GpuRunOptions } from "../types/run.js";
import { type GpuBfsResult } from "../types/traversal.js";
import { type AlgorithmScope, algorithmScope } from "./scope.js";

const ALGORITHM = "breadthFirstSearch";

/**
 * Params slots of the ring, COUNTED per run (P8-T12), because `UniformRing.reserve` wraps to slot 0 when a submit's
 * records outrun the ring and silently overwrites a record the submit still reads; the ring's `overruns` counts
 * exactly that reuse, `AlgorithmScope.ringOverruns()` exposes it, and the faked-limit test holds it at 0 for the
 * whole run. The bound per level is `5 + 4 x windows`: five recorded once per level (`frontier-finalize` twice,
 * `bfs-contract`, the bits `fill`, `bfs-bitset-build`) and four re-issued once per arc window (`advance-expand`,
 * `bfs-fused`, the fused retry, `bfs-bottom-up`). The driver as built writes fewer -- the contract and the bitset
 * build share one window-free record, a window's two fused dispatches share one, the bits fill has one record per
 * submit, and a directed snapshot's reverse view is one window whatever the forward core's count -- so at most
 * `3 + 3 x windows` per level, and the bound holds with room. The 16 covers the per-submit rebuild
 * (`bfs-unvisited-flags` and `compact`, whose scan is at most 9 dispatches for any n below 2^32, so 10, plus the
 * bits fill). The result batch flushes in its own submit, so the ring must hold IT too, and its size grows with `n`,
 * not with the cadence: the iota `fill`, the radix sort's four passes of one record plus its scan's `2 x levels - 1`
 * (the table is `256 x ceil(n / WG)` words and a level covers `WG` of them, so four levels for any n below 2^32 at
 * the package's WG of 256), the `pred` `fill` and `sssp-pred` once per window -- `2 + 4 x 8 + windows = 34 + windows`
 * at most, which a small cadence undercuts (built 2026-09-25: `(5 + 4) x 1 + 16 = 25` slots against the 27 a
 * 262,143-node result batch records wrapped over the radix sort's own records and returned a wrong `order`, silently
 * -- the plan's `19 + windows` count had no scan level in it). The slot count is therefore the larger of the two
 * batches. At one window and `MAX_LEVELS_PER_SUBMIT` it is P8-T6's 304; test/device/constants.test.ts pins the
 * arithmetic.
 * @internal
 * @param windows - the forward core's arc windows (1 when it is not windowed)
 * @param levelsPerSubmit - the levels recorded per submit
 * @returns the ring's slot count
 */
export function bfsRingSlots(windows: number, levelsPerSubmit: number): number {
    return Math.max((5 + 4 * windows) * levelsPerSubmit + 16, RESULT_BATCH_SLOTS + windows);
}

/** The result batch's records before its per-window `sssp-pred` dispatches: two `fill`s and the 32-bit radix sort's four passes of at most eight records each (see `bfsRingSlots`). */
const RESULT_BATCH_SLOTS = 2 + 4 * 8;

/**
 * The knobs the tests need and nothing public offers (PD-26): the per-level candidate rule, the edge queue's size,
 * the submit cadence, the predecessor kind, and the two inspect seams.
 * @internal
 */
export interface BfsTuning {
    /** `"auto"` (default) lets the selector choose per level by Beamer's test; `"top-down"` disables the bottom-up candidate (`mode 1`). */
    readonly direction?: "auto" | "top-down" | undefined;
    /** Beamer's alpha (`max(1, floor(arcCount / n))` when absent, PD-21): top-down switches to bottom-up when the frontier's degree sum exceeds the unvisited degree sum divided by it and the frontier is growing. */
    readonly alpha?: number | undefined;
    /** Beamer's beta (`BEAMER_BETA` when absent): bottom-up switches back when `next * beta < unvisitedCount` and the frontier is shrinking; 0 makes that half of the test true whenever anything is unvisited. */
    readonly beta?: number | undefined;
    /** The fused expand-contract threshold (`FUSED_FRONTIER_MAX` when absent): a level whose frontier is below it takes the fused path; 0 never fuses, `U32_MAX` always does. */
    readonly fusedMax?: number | undefined;
    /** The edge queue's entry count; a test fakes a small one to force the overflow path (PD-23). */
    readonly edgeCapacity?: number | undefined;
    /** Levels recorded per submit (default `MAX_LEVELS_PER_SUBMIT`); 1 hands `onLevel` the block after every level. */
    readonly levelsPerSubmit?: number | undefined;
    /** What the post-pass writes into `parent`: 1 (default) the node index, 0 the arc index (P8-T9's unit-weight route). */
    readonly predKind?: 0 | 1 | undefined;
    /** The inspect seam (design 11.9 item 2): after every SUBMIT, the index of the last level recorded, the whole counters block as the submit left it, the vertices the submit's last level claimed (the next level's input queue, `nextFrontierCount` long), and the total `compact` wrote when it rebuilt the unvisited list at the top of the submit (the independent count the block's `unvisitedListLen` must equal, P8-T8). */
    readonly onLevel?:
        | ((level: number, counters: UniformValues, frontier: U32, compactCount: number) => void)
        | undefined;
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
 * A degree view's one array on the device (the `outDegree` / `inDegree` views of P7, one u32 per vertex).
 * @param ctx - the context
 * @param s - the snapshot
 * @param name - the view
 * @returns the binding
 */
function degreeView(ctx: GpuContext, s: GraphSnapshot, name: "outDegree" | "inDegree"): Binding {
    const { bindings }: { readonly bindings: Readonly<Partial<Record<"outDegree" | "inDegree", Binding>>> } =
        ctx.residency.view(s, name);
    const { [name]: binding } = bindings;
    if (binding === undefined) {
        throw new WebGpuGraphError("E_VALIDATION", `${ALGORITHM}: the ${name} view has no ${name} binding`, {
            label: `${ALGORITHM}/${name}`,
            message: `the ${name} view has no ${name} binding`,
        });
    }
    return binding;
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
    // a windowed core (colIdx above the binding limit) is executed, not refused (P8-T12 lifts DEP-P8-E): every
    // frontier-walking kernel is dispatched once per arc window with the window's owned range in its record
    const forward = coreWindows(core);
    // the bottom-up sweep walks in-neighbours over the reverse core: on an undirected snapshot the forward arrays
    // themselves (graph-format invariant I7; P7's residency aliases them, so a windowed core's windows ARE the
    // reverse's), on a directed one the reverse VIEW, which spec 4.3 never windows -- so a directed snapshot whose
    // reverse adjacency exceeds one binding is refused here, as the residency refuses the undirected view, instead
    // of failing at the device's bind-group validation
    if (s.directed && 4 * s.arcCount > ctx.caps.limits.maxStorageBufferBindingSize) {
        throw new WebGpuGraphError(
            "E_TOO_LARGE",
            `${ALGORITHM}: the reverse adjacency of a directed snapshot (${4 * s.arcCount} bytes) needs arc windows, which no view executes (spec 4.3); the bottom-up sweep binds it whole`,
            {
                needed: 4 * s.arcCount,
                limit: ctx.caps.limits.maxStorageBufferBindingSize,
                path: "windowed",
                algorithm: ALGORITHM,
            },
        );
    }
    const reverse = s.directed ? coreOfView(ctx.residency.view(s, "reverse"), s.arcCount) : core;
    const backward = coreWindows(reverse);
    // the two degree views the unvisited rebuild reads (P8-T8)
    const outDegree = degreeView(ctx, s, "outDegree");
    const inDegree = degreeView(ctx, s, "inDegree");
    const scope = algorithmScope(ctx, ALGORITHM, bfsRingSlots(forward.length, levelsPerSubmit));
    tuning.onScope?.(scope);
    try {
        const bytes = 4 * n;
        const wg = ctx.workgroupSize;
        const depth = bindingOf(scope.scratch(bytes, "depth"), bytes);
        // the sweep's input, one buffer in two regions: the unvisited list at word 0 and the frontier bitset at
        // word bitsBase = roundUp(n, 64), so the bits region's byte offset is 256-aligned and fill can bind it alone
        const bitsBase = Math.ceil(n / 64) * 64;
        const bitsWords = Math.ceil(n / 32);
        const sweepBytes = 4 * (bitsBase + bitsWords);
        const sweepIn = bindingOf(scope.scratch(sweepBytes, "sweep-in"), sweepBytes);
        const unvisitedList: Binding = { buffer: sweepIn.buffer, offset: 0, size: bytes, window: null };
        const frontierBits: Binding = {
            buffer: sweepIn.buffer,
            offset: 4 * bitsBase,
            size: 4 * bitsWords,
            window: null,
        };
        const flags = bindingOf(scope.scratch(bytes, "unvisited-flags"), bytes);
        const iota = bindingOf(scope.scratch(bytes, "iota"), bytes);
        const compactCount = bindingOf(scope.scratch(4, "compact-count"), 4);
        await ctx.allocator.check();
        const planner = await prepareFrontier(scope, n, s.arcCount, tuning.edgeCapacity);
        const advance = await prepareAdvance(scope, core);
        const compact = await prepareCompact(scope);
        const contract = await ctx.pipelines.kernel(kernelSpec("bfs-contract"));
        const fused = await ctx.pipelines.kernel(kernelSpec("bfs-fused", graphOverrides(core, null)));
        const bitset = await ctx.pipelines.kernel(kernelSpec("bfs-bitset-build"));
        const bottomUp = await ctx.pipelines.kernel(kernelSpec("bfs-bottom-up", graphOverrides(reverse, null)));
        const unvisited = await ctx.pipelines.kernel(kernelSpec("bfs-unvisited-flags"));
        const pred = await ctx.pipelines.kernel(kernelSpec("sssp-pred", { ...graphOverrides(core, null), MODE: 1 }));
        const fill = await ctx.pipelines.kernel(kernelSpec("fill"));
        const sort = await prepareRadixSort(scope);
        const { frontier } = planner;
        const { counters } = frontier;
        const { queue } = ctx.device;
        const fillPlan = plan1d(n, wg, ctx.caps);
        // the level kernels are DIRECT grid-stride dispatches gated by the selector's path word (word 24): the plan
        // bounds the grid, the kernel loops to its count word. The contract walks the edge queue and the bitset build
        // the frontier from one record, so one plan covers both; bfs-fused is one workgroup per entry and takes the
        // plan's GROUP count as its stride (planGridStride's cap applies to the groups)
        const levelPlan = planGridStride(Math.max(n, frontier.edgeCapacity), wg, ctx.caps);
        const sweepPlan = planGridStride(n, wg, ctx.caps);
        const fusedPlan = planGridStride(n * wg, wg, ctx.caps);
        const bitsPlan = plan1d(bitsWords, wg, ctx.caps);
        const recordFill = (pass: GPUComputePassEncoder, dst: Binding, value: number, mode: 0 | 1): void => {
            const params = scope.params(FILL_PARAMS, { count: n, value, mode, pad0: 0 });
            fill.dispatch(pass, fill.bind({ dst, P: params.binding }), fillPlan, [params.offset]);
        };
        const flagsPlan: DispatchPlan = planGridStride(n, wg, ctx.caps);
        /**
         * The rebuild of the unvisited set (PD-18), recorded at the top of every submit before its levels.
         * @param pass - the compute pass
         */
        const recordRebuild = (pass: GPUComputePassEncoder): void => {
            const params = scope.params(FRONTIER_PARAMS, { wg, n, stride: flagsPlan.stride ?? n });
            const bound = unvisited.bind({ outDegree, inDegree, depth, flags, counters, P: params.binding });
            unvisited.dispatch(pass, bound, flagsPlan, [params.offset]);
            compact.record(pass, {
                queue: iota,
                flags,
                count: n,
                out: unvisitedList,
                outCount: compactCount,
                outIndex: 0,
            });
        };
        const submit = (batch: CommandBatch): ReturnType<CommandBatch["submit"]> => {
            scope.flush();
            return batch.submit();
        };

        // setup: depth = INVALID_INDEX everywhere and the iota queue compact reads; then the source at 0 and the
        // seeded block, both queue writes ordered before the first level submit (the seed is rotated in by the
        // first boundary, P8-T4)
        const setup = new CommandBatch(ctx, `${ALGORITHM}/setup`);
        const setupPass = setup.pass("fill");
        recordFill(setupPass, depth, INVALID_INDEX, 0);
        recordFill(setupPass, iota, 0, 1);
        setup.endPass();
        await submit(setup).readback;
        ctx.assertReady();
        queue.writeBuffer(depth.buffer, depth.offset + 4 * source, Uint32Array.of(0));
        frontier.reset(queue, source, { nextFrontierCount: 1, level: U32_MAX });

        // the levels: MAX_LEVELS_PER_SUBMIT per submit, four bytes back (PD-7); Beamer's test chooses the direction
        // per level (mode 0; mode 1 pins top-down), with the fused path below fusedMax (P8-T7)
        const fields: FrontierFinalizeFields = {
            mode: tuning.direction === "top-down" ? 1 : 0,
            alpha: tuning.alpha ?? Math.max(1, Math.floor(s.arcCount / n)),
            beta: tuning.beta ?? BEAMER_BETA,
            fusedMax: tuning.fusedMax ?? FUSED_FRONTIER_MAX,
            maxDepth,
        };
        let levelsRecorded = 0;
        let submits = 0;
        for (;;) {
            // the rebuild (PD-18): the three unvisited words zeroed by a queue write ordered before this submit,
            // then the flags kernel and compact at the top of the pass, unconditionally, never per level
            queue.writeBuffer(counters.buffer, counters.offset + 4 * W.unvisitedCount, new Uint32Array(3));
            const batch = new CommandBatch(ctx, `${ALGORITHM}/levels`);
            const pass = batch.pass("bfs");
            recordRebuild(pass);
            const bitsParams = scope.params(FILL_PARAMS, { count: bitsWords, value: 0, mode: 0, pad0: 0 });
            const boundBitsFill = fill.bind({ dst: frontierBits, P: bitsParams.binding });
            for (let level = 0; level < levelsPerSubmit; level++) {
                planner.recordFinalize(pass, 0, level, { ...fields, firstOfSubmit: Math.min(level, 2) });
                advance.record(pass, frontier);
                planner.recordFinalize(pass, 1, level, fields);
                // one window-free record serves the contract and the bitset build, which read no arc; the kernels that
                // walk arcs (the fused dispatch, the sweep) get one record per window below (P8-T12)
                const params = scope.params(FRONTIER_PARAMS, {
                    wg,
                    n,
                    edgeCapacity: frontier.edgeCapacity,
                    arcBase: 0,
                    arcEnd: s.arcCount,
                    bitsBase,
                    stride: levelPlan.stride ?? wg,
                });
                const boundContract = contract.bind({
                    edgeQueue: frontier.edgeQueue,
                    counters,
                    depth,
                    frontierOut: frontier.output,
                    P: params.binding,
                });
                contract.dispatch(pass, boundContract, levelPlan, [params.offset]);
                // the fused path (role 0's choice) and the overflow retry (role 1's, PD-23): ONE dispatch per window that
                // the path word turns into the level's work or into nothing (the claim is idempotent across windows)
                for (const w of forward) {
                    const fusedParams = scope.params(FRONTIER_PARAMS, {
                        wg,
                        n,
                        edgeCapacity: frontier.edgeCapacity,
                        arcBase: w.arcBase,
                        arcEnd: w.arcEnd,
                        stride: fusedPlan.x * fusedPlan.y,
                    });
                    const boundFused = fused.bind({
                        ...graphBindings(w.core, null),
                        frontierIn: frontier.input,
                        counters,
                        depth,
                        frontierOut: frontier.output,
                        P: fusedParams.binding,
                    });
                    fused.dispatch(pass, boundFused, fusedPlan, [fusedParams.offset]);
                }
                // the bottom-up level (role 0's choice under Beamer's test, P8-T8): the bitset zeroed (every level: a
                // top-down level zeroes bits nobody reads, cheaper than a gate), the frontier's bits set, the unvisited
                // list swept over the reverse core
                fill.dispatch(pass, boundBitsFill, bitsPlan, [bitsParams.offset]);
                const boundBitset = bitset.bind({
                    frontierIn: frontier.input,
                    counters,
                    bits: sweepIn,
                    P: params.binding,
                });
                bitset.dispatch(pass, boundBitset, levelPlan, [params.offset]);
                // the sweep once per window of the REVERSE core (an entry claimed in one window is skipped in the next)
                for (const w of backward) {
                    const sweepParams = scope.params(FRONTIER_PARAMS, {
                        wg,
                        n,
                        arcBase: w.arcBase,
                        arcEnd: w.arcEnd,
                        bitsBase,
                        stride: sweepPlan.stride ?? wg,
                    });
                    const boundSweep = bottomUp.bind({
                        ...graphBindings(w.core, null),
                        sweepIn,
                        counters,
                        depth,
                        frontierOut: frontier.output,
                        P: sweepParams.binding,
                    });
                    bottomUp.dispatch(pass, boundSweep, sweepPlan, [sweepParams.offset]);
                }
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
                          count: batch.readback(compactCount.buffer, compactCount.offset, 4),
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
                const rebuilt = new Uint32Array(back, inspect.count.offset, 1)[0];
                tuning.onLevel(levelsRecorded - 1, block, claimed.slice(), rebuilt);
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
        // the post-pass once per arc window (its atomicMin admits the same smallest parent whichever window holds the arc)
        const predPlan = planGridStride(n, wg, ctx.caps);
        for (const w of forward) {
            const predParams = scope.params(FRONTIER_PARAMS, {
                wg,
                n,
                arcBase: w.arcBase,
                arcEnd: w.arcEnd,
                predKind,
                source,
                stride: predPlan.stride ?? n,
            });
            const predBound = pred.bind({
                ...graphBindings(w.core, null),
                dist: depth,
                pred: parent,
                P: predParams.binding,
            });
            pred.dispatch(pass, predBound, predPlan, [predParams.offset]);
        }
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
 * @returns the depths, parents, order, visited count, level count and switches (the direction changes Beamer's test made on the device)
 */
export function breadthFirstSearch(
    ctx: GpuContext,
    s: GraphSnapshot,
    source: number,
    options?: BfsOptions & GpuRunOptions,
): Promise<GpuBfsResult> {
    return bfsWithTuning(ctx, s, source, options, {});
}
