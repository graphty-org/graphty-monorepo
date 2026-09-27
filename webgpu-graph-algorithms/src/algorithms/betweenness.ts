/**
 * Betweenness and edge betweenness on the device (design 8.4 "Betweenness (A7)", 3.3 lines 811-812, 9.7): Brandes'
 * algorithm as McLaughlin-Bader run it, k sources at a time.
 *
 * A source batch keeps four `n x k` arrays -- `depthK`, `sigmaK` (u32 shortest-path counts), `deltaK` (f32
 * dependencies) and the claim log `S` -- plus `ends`, the level boundaries into the log. Every array is indexed by
 * `s * n + v`, and a log entry IS that index, so one u32 names a `(vertex, source)` pair: `4 n k` bytes can never
 * reach 2^32 because each array is one storage binding. The forward pass is a tagged breadth-first search: every
 * level is `bc-finalize` (the boundary: `ends[level + 1] = stackTop`, `done` on an empty level) and then ONE forward
 * dispatch, either `bc-forward` (block-mapped over the level's range of the log) or `bc-forward-edge` (every edge of
 * the `edgeList` view for every source), both claiming, counting and appending with the same rules. Levels are
 * recorded `MAX_LEVELS_PER_SUBMIT` per submit with one small readback (the counters block and the `ends` prefix), and
 * the log's `ends` is known on the host when the forward phase ends, so the backward pass is planned exactly: one
 * `bc-backward` dispatch per level from the deepest to depth 1, each writing `delta[s][w]` once by pulling over the
 * successors; then `bc-gather` adds each vertex's k dependencies into `bc` (and `bc-edge-gather` each arc's k terms
 * into `arcScores`). Nothing accumulates a float through an atomic, so the scores are bitwise reproducible.
 *
 * The batch size k is planned from the device limits at 16 bytes per (node, source) -- the three arrays design 4.7
 * counts plus the 4-byte log entry it omits -- as `min(floor(maxStorageBufferBindingSize / 4n), floor(0.25 x
 * maxBufferSize / 16n), 64)`, at least 1 (`planBatchSize`); a graph whose single source does not fit one binding is
 * E_TOO_LARGE. The forward form is chosen per batch: the first batch runs `bc-forward`; a later one runs the
 * edge-parallel form when the previous batch's level count -- the MAXIMUM depth over its sources, the only depth
 * figure the host has, which over-estimates the median of design 8.4's rule and so errs toward the frontier form --
 * is below `BC_EDGE_PARALLEL_GAMMA x log2(n)`.
 *
 * The host applies the CPU package's convention after the readback (`@graphty/algorithms` betweenness.ts): the vertex
 * scores are halved on an undirected snapshot (the gather counts each unordered pair from both ends); the edge scores
 * are folded with `foldArcs(s, perArc, "first")` and NOT halved, because on an undirected snapshot both arcs of an
 * edge carry the same sum and the fold keeps one of them, which is already the score over unordered pairs (the path
 * 0-1-2: arcs 0->1 and 1->0 both collect 2, and edge {0, 1} lies on the pairs (0, 1) and (0, 2)). `normalized`
 * divides both by `(n - 1)(n - 2)` directed or half that undirected, when positive. A sampled run (`sources` or `k`)
 * is the UNSCALED sum over the sources run, reported beside `sourcesUsed`. `endpoints: true` is refused: the CPU's
 * endpoints branch (`algorithms/src/algorithms/centrality/betweenness.ts`, `predecessors.length === 0 && w !==
 * source`) can never fire for a vertex on the Brandes stack, so there is no behaviour to be in parity with.
 * Betweenness is breadth-first on both packages; weights are ignored.
 */

import { type F32, foldArcs, type GraphSnapshot, type U32 } from "@graphty/graph-format";

import {
    BC_BACKWARD_LEVELS_PER_SUBMIT,
    BC_BATCH_BUDGET_FRACTION,
    BC_EDGE_PARALLEL_GAMMA,
    BC_MAX_BATCH,
    MAX_LEVELS_PER_SUBMIT,
} from "../constants.js";
import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { CommandBatch } from "../kernel/batch.js";
import { plan1d, planGridStride } from "../kernel/dispatch.js";
import { type BoundKernel, type Kernel } from "../kernel/kernel.js";
import { BC_PARAMS, FILL_PARAMS, FRONTIER_COUNTERS, kernelSpec } from "../kernels.js";
import { assertWholeCore } from "../primitives/core-shape.js";
import { W } from "../primitives/frontier.js";
import { assertDeviceComputes } from "../primitives/verify.js";
import { type BetweennessAcceleratorOptions } from "../types/accelerator.js";
import { type GpuBetweennessResult, type GpuEdgeScoresResult } from "../types/betweenness.js";
import { type Binding } from "../types/memory.js";
import { type GpuRunOptions } from "../types/run.js";
import { type AlgorithmScope, algorithmScope } from "./scope.js";
import { aborted, bindingOf, checkDest } from "./sssp.js";

const ALGORITHM = "betweennessCentrality";

/** Bytes one (node, source) pair holds in a batch: depthK, sigmaK, deltaK and the claim-log entry, 4 each. */
const BYTES_PER_NODE_SOURCE = 16;

/** The seed of the deterministic draw of `k` sources (any fixed value: the draw only has to repeat). */
const SAMPLE_SEED = 0x9e3779b9;

/** Params slots of the ring: a backward submit's levels plus the fills, the seed, the gathers and the per-submit forward records. */
const RING_SLOTS = BC_BACKWARD_LEVELS_PER_SUBMIT + 16;

/** The device limits the batch planner reads. */
interface BatchLimits {
    readonly maxStorageBufferBindingSize: number;
    readonly maxBufferSize: number;
}

/**
 * Which forward body a batch runs: pinned by the tuning, or chosen per batch.
 * @internal
 */
export type ForwardForm = "frontier" | "edge";

/**
 * What the inspect seam hands the tests after every batch.
 * @internal
 */
export interface BetweennessBatchReport {
    /** The batch's sources, in tag order. */
    readonly sources: readonly number[];
    /** The forward body the batch ran. */
    readonly forward: ForwardForm;
    /** The non-empty levels (depth 0 .. levels - 1). */
    readonly levels: number;
    /** `ends[0 .. levels + 1]`: the entries at depth L are `S[ends[L] .. ends[L + 1])`. */
    readonly ends: U32;
    /** Whether a u32 path count wrapped in this batch. */
    readonly sigmaOverflow: boolean;
    /** The `n x k` arrays as the batch left them (null unless the tuning asked for them). */
    readonly depthK: U32 | null;
    readonly sigmaK: U32 | null;
    readonly deltaK: F32 | null;
}

/**
 * The knobs the tests need and nothing public offers.
 * @internal
 */
export interface BetweennessTuning {
    /** Pins the forward body (default: the per-batch choice). */
    readonly forward?: ForwardForm | "auto" | undefined;
    /** Forward levels recorded per submit (default `MAX_LEVELS_PER_SUBMIT`). */
    readonly levelsPerSubmit?: number | undefined;
    /** Faked device limits for the planner (a test's way to make k shrink). */
    readonly limits?: BatchLimits | undefined;
    /** Called after every batch. */
    readonly onBatch?: ((report: BetweennessBatchReport) => void) | undefined;
    /** Read the batch's `depthK`, `sigmaK` and `deltaK` back for `onBatch`. */
    readonly readArrays?: boolean | undefined;
}

/** The raw outcome of a run: the unhalved, unnormalised sums. */
interface RawBetweenness {
    readonly vertex: F32;
    readonly perArc: F32 | null;
    readonly sourcesUsed: number;
    readonly sigmaOverflow: boolean;
    readonly batches: number;
}

/**
 * The source batch size (design 8.4, 10.1): `min(floor(maxStorageBufferBindingSize / 4n), floor(0.25 x maxBufferSize /
 * 16n), 64, remaining)`, at least 1. Each of the four `n x k` arrays is one binding of `4 n k` bytes, and the batch's
 * four together stay inside a quarter of the largest buffer.
 * @internal
 * @param n - the vertex count (>= 1)
 * @param remaining - the sources still to run (>= 1)
 * @param limits - the device limits
 * @returns k
 * @throws E_TOO_LARGE when one source's `4n`-byte array exceeds the binding limit
 */
export function planBatchSize(n: number, remaining: number, limits: BatchLimits): number {
    const kByBinding = Math.floor(limits.maxStorageBufferBindingSize / (4 * n));
    if (kByBinding < 1) {
        throw new WebGpuGraphError(
            "E_TOO_LARGE",
            `${ALGORITHM}: one source needs ${4 * n} bytes per array at n = ${n}, above maxStorageBufferBindingSize = ${limits.maxStorageBufferBindingSize}; a limit of at least ${4 * n} admits one source per batch`,
            { needed: 4 * n, limit: limits.maxStorageBufferBindingSize, path: "binding", algorithm: ALGORITHM },
        );
    }
    const kByBudget = Math.floor((BC_BATCH_BUDGET_FRACTION * limits.maxBufferSize) / (BYTES_PER_NODE_SOURCE * n));
    return Math.max(1, Math.min(kByBinding, kByBudget, BC_MAX_BATCH, remaining));
}

/**
 * `k` distinct vertices drawn by a partial Fisher-Yates shuffle over a fixed-seed mulberry32 stream: the same call
 * draws the same sources every time.
 * @param n - the vertex count
 * @param k - how many to draw (<= n)
 * @returns the sources
 */
function drawSources(n: number, k: number): number[] {
    const pool = Array.from({ length: n }, (_, i) => i);
    let state = SAMPLE_SEED;
    for (let i = 0; i < k; i++) {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = Math.imul(state ^ (state >>> 15), state | 1);
        t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
        const unit = ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
        const j = i + Math.floor(unit * (n - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, k);
}

/**
 * The E_INVALID_ARGUMENT of a bad option.
 * @param argument - the option
 * @param value - its value
 * @param expected - what it must be
 * @returns the error
 */
function badArgument(argument: string, value: unknown, expected: string): WebGpuGraphError {
    return new WebGpuGraphError("E_INVALID_ARGUMENT", `${ALGORITHM}: ${argument} must be ${expected}`, {
        argument,
        value,
        expected,
    });
}

/**
 * The sources a call runs: `sources` as given, else `k` drawn, else every vertex.
 * @param options - the call's options
 * @param n - the vertex count
 * @returns the sources
 */
function resolveSources(options: BetweennessAcceleratorOptions | undefined, n: number): number[] {
    const k = options?.k;
    if (k !== undefined && (!Number.isInteger(k) || k < 0 || k > n)) {
        throw badArgument("k", k, `an integer in [0, ${n}]`);
    }
    const given = options?.sources;
    if (given !== undefined) {
        for (const v of given) {
            if (!Number.isInteger(v) || v < 0 || v >= n) {
                throw badArgument("sources", v, `node indices in [0, ${n})`);
            }
        }
        if (k !== undefined && k !== given.length) {
            throw badArgument("k", k, `absent or equal to sources.length (${given.length})`);
        }
        return [...given];
    }
    if (k !== undefined) {
        return drawSources(n, k);
    }
    return Array.from({ length: n }, (_, i) => i);
}

/** The device state of a run: the batch arrays sized for the largest batch, the results, the kernels. */
interface RunState {
    readonly ctx: GpuContext;
    readonly scope: AlgorithmScope;
    readonly n: number;
    readonly S: Binding;
    readonly ends: Binding;
    readonly depthK: Binding;
    readonly sigmaK: Binding;
    readonly deltaK: Binding;
    readonly counters: Binding;
    readonly bc: Binding;
    readonly arcScores: Binding | null;
    readonly rowPtr: Binding;
    readonly colIdx: Binding;
    readonly edgeSrc: Binding | null;
    readonly edgeDst: Binding | null;
    readonly edgeCount: number;
    readonly arcCount: number;
    readonly fill: Kernel;
    readonly finalize: Kernel;
    readonly forward: Kernel;
    readonly forwardEdge: Kernel | null;
    readonly backward: Kernel;
    readonly gather: Kernel;
    readonly edgeGather: Kernel | null;
    /** Each bc kernel bound once per run: its resources never change inside a run, only the params offset does. */
    readonly bound: Map<Kernel, BoundKernel>;
}

/**
 * Records one `fill` of `count` words.
 * @param state - the run
 * @param pass - the pass
 * @param dst - the buffer
 * @param count - the words
 * @param value - the u32 written
 */
function recordFill(state: RunState, pass: GPUComputePassEncoder, dst: Binding, count: number, value: number): void {
    const { scope, fill, ctx } = state;
    const params = scope.params(FILL_PARAMS, { count, value, mode: 0, pad0: 0 });
    fill.dispatch(pass, fill.bind({ dst, P: params.binding }), plan1d(count, ctx.workgroupSize, ctx.caps), [
        params.offset,
    ]);
}

/**
 * Records a kernel with one BcParams record; the kernel is bound on its first use in the run.
 * @param state - the run
 * @param pass - the pass
 * @param kernel - the kernel
 * @param resources - its storage bindings (the same on every call for one kernel)
 * @param fields - the BcParams fields
 * @param items - the items the grid-stride plan covers
 */
function recordBc(
    state: RunState,
    pass: GPUComputePassEncoder,
    kernel: Kernel,
    resources: Readonly<Record<string, Binding>>,
    fields: Readonly<Record<string, number>>,
    items: number,
): void {
    const { scope, ctx } = state;
    const plan = planGridStride(items, ctx.workgroupSize, ctx.caps);
    const params = scope.params(BC_PARAMS, { ...fields, stride: plan.stride ?? 0 });
    let bound = state.bound.get(kernel);
    if (bound === undefined) {
        bound = kernel.bind({ ...resources, P: params.binding });
        state.bound.set(kernel, bound);
    }
    kernel.dispatch(pass, bound, items === 0 ? plan1d(1, ctx.workgroupSize, ctx.caps) : plan, [params.offset]);
}

/**
 * Submits after flushing the ring and waits for the readback; aborts between submits.
 * @param state - the run
 * @param batch - the batch
 * @param signal - the caller's signal
 * @returns the readback bytes
 */
async function submit(state: RunState, batch: CommandBatch, signal: AbortSignal | undefined): Promise<ArrayBuffer> {
    state.scope.flush();
    const submitted = batch.submit();
    const back = await submitted.readback;
    state.ctx.assertReady();
    if (signal?.aborted) {
        throw aborted(ALGORITHM, submitted.id);
    }
    return back;
}

/**
 * One source batch: seed, forward levels until an empty one, backward levels, the gathers.
 * @param state - the run
 * @param sources - the batch's sources
 * @param form - the forward body
 * @param levelsPerSubmit - the forward cadence
 * @param tuning - the knobs
 * @param signal - the caller's signal
 * @returns the batch's levels and overflow flag
 */
async function runBatch(
    state: RunState,
    sources: readonly number[],
    form: ForwardForm,
    levelsPerSubmit: number,
    tuning: BetweennessTuning,
    signal: AbortSignal | undefined,
): Promise<{ levels: number; overflow: boolean }> {
    const { ctx, n, S, ends, depthK, sigmaK, deltaK, counters } = state;
    const k = sources.length;
    const words = n * k;
    const seeds = Uint32Array.from(sources, (v, s) => s * n + v);
    ctx.device.queue.writeBuffer(S.buffer, S.offset, seeds);

    // the forward phase: the first submit also clears the batch's arrays and seeds it
    const forwardFields = { n, k, count: form === "edge" ? state.edgeCount : 0 };
    const forwardItems = form === "edge" ? state.edgeCount : words;
    let recorded = 0;
    let levels = 0;
    let overflow = false;
    let endsWords: U32 | null = null;
    for (let first = true; endsWords === null; first = false) {
        const batch = new CommandBatch(ctx, `${ALGORITHM}/forward`);
        const pass = batch.pass("forward");
        if (first) {
            recordFill(state, pass, depthK, words, 0xffffffff);
            recordFill(state, pass, sigmaK, words, 0);
            recordFill(state, pass, deltaK, words, 0);
            recordBc(state, pass, state.finalize, { counters, ends, S, depthK, sigmaK }, { n, k, role: 1 }, 1);
        }
        for (let level = 0; level < levelsPerSubmit; level++) {
            recordBc(state, pass, state.finalize, { counters, ends, S, depthK, sigmaK }, { n, k, role: 0 }, 1);
            if (form === "edge" && state.forwardEdge !== null && state.edgeSrc !== null && state.edgeDst !== null) {
                recordBc(
                    state,
                    pass,
                    state.forwardEdge,
                    { edgeSrc: state.edgeSrc, edgeDst: state.edgeDst, S, ends, counters, depthK, sigmaK },
                    forwardFields,
                    forwardItems,
                );
            } else {
                recordBc(
                    state,
                    pass,
                    state.forward,
                    { rowPtr: state.rowPtr, colIdx: state.colIdx, S, ends, counters, depthK, sigmaK },
                    forwardFields,
                    forwardItems,
                );
            }
        }
        recorded += levelsPerSubmit;
        batch.endPass();
        const endsCount = Math.min(n + 2, recorded + 1);
        const countersRequest = batch.readback(counters.buffer, counters.offset, FRONTIER_COUNTERS.byteLength);
        const endsRequest = batch.readback(ends.buffer, ends.offset, 4 * endsCount);
        const back = await submit(state, batch, signal);
        const words32 = new Uint32Array(back, countersRequest.offset, FRONTIER_COUNTERS.byteLength / 4);
        if (words32[W.done] !== 0) {
            levels = words32[W.level];
            overflow = words32[W.sigmaOverflow] !== 0;
            endsWords = new Uint32Array(back, endsRequest.offset, endsCount).slice(0, levels + 1);
        } else if (recorded > n + 2) {
            // a batch claims at most n - 1 levels deep, then one level is empty
            throw new WebGpuGraphError("E_VALIDATION", `${ALGORITHM}: the done flag never rose in ${recorded} levels`, {
                label: ALGORITHM,
                message: `the done flag never rose in ${recorded} levels`,
            });
        }
    }

    // the backward phase, planned from ends: depth levels - 1 down to 1, then the gathers
    const backwardLevels: number[] = [];
    for (let level = levels - 1; level >= 1; level--) {
        backwardLevels.push(level);
    }
    let arrays: { depthK: U32; sigmaK: U32; deltaK: F32 } | null = null;
    for (let i = 0; ; i += BC_BACKWARD_LEVELS_PER_SUBMIT) {
        const chunk = backwardLevels.slice(i, i + BC_BACKWARD_LEVELS_PER_SUBMIT);
        const last = i + BC_BACKWARD_LEVELS_PER_SUBMIT >= backwardLevels.length;
        const batch = new CommandBatch(ctx, `${ALGORITHM}/backward`);
        const pass = batch.pass("backward");
        for (const level of chunk) {
            const start = endsWords[level];
            const count = endsWords[level + 1] - start;
            recordBc(
                state,
                pass,
                state.backward,
                { rowPtr: state.rowPtr, colIdx: state.colIdx, S, depthK, sigmaK, deltaK },
                { n, k, start, count },
                count,
            );
        }
        if (last) {
            recordBc(state, pass, state.gather, { deltaK, bc: state.bc }, { n, k }, n);
            if (state.edgeGather !== null && state.arcScores !== null) {
                recordBc(
                    state,
                    pass,
                    state.edgeGather,
                    { rowPtr: state.rowPtr, colIdx: state.colIdx, depthK, sigmaK, deltaK, arcScores: state.arcScores },
                    { n, k, count: state.arcCount },
                    state.arcCount,
                );
            }
        }
        batch.endPass();
        const wantArrays = last && tuning.readArrays === true;
        const requests = wantArrays
            ? [depthK, sigmaK, deltaK].map((b) => batch.readback(b.buffer, b.offset, 4 * words))
            : [];
        const back = await submit(state, batch, signal);
        if (wantArrays) {
            arrays = {
                depthK: new Uint32Array(back, requests[0].offset, words).slice(),
                sigmaK: new Uint32Array(back, requests[1].offset, words).slice(),
                deltaK: new Float32Array(back, requests[2].offset, words).slice(),
            };
        }
        if (last) {
            break;
        }
    }
    tuning.onBatch?.({
        sources,
        forward: form,
        levels,
        ends: endsWords.slice(),
        sigmaOverflow: overflow,
        depthK: arrays?.depthK ?? null,
        sigmaK: arrays?.sigmaK ?? null,
        deltaK: arrays?.deltaK ?? null,
    });
    return { levels, overflow };
}

/**
 * The raw sums of a run over `sources` (see the file comment).
 * @param ctx - the context
 * @param s - the snapshot
 * @param sources - the sources (non-empty, n >= 1)
 * @param withEdges - also accumulate the per-arc scores
 * @param tuning - the knobs
 * @param options - signal / onProgress
 * @returns the raw sums
 */
async function runRaw(
    ctx: GpuContext,
    s: GraphSnapshot,
    sources: readonly number[],
    withEdges: boolean,
    tuning: BetweennessTuning,
    options: GpuRunOptions | undefined,
): Promise<RawBetweenness> {
    const n = s.nodeCount;
    const pinned = tuning.forward ?? "auto";
    const levelsPerSubmit = tuning.levelsPerSubmit ?? MAX_LEVELS_PER_SUBMIT;
    if (!Number.isInteger(levelsPerSubmit) || levelsPerSubmit < 1 || levelsPerSubmit > MAX_LEVELS_PER_SUBMIT) {
        throw badArgument("levelsPerSubmit", levelsPerSubmit, `an integer in [1, ${MAX_LEVELS_PER_SUBMIT}]`);
    }
    const limits = tuning.limits ?? ctx.caps.limits;
    const kMax = planBatchSize(n, sources.length, limits);
    const core = ctx.residency.core(s);
    assertWholeCore(core, s.arcCount, ctx.caps.limits.maxStorageBufferBindingSize, ALGORITHM);
    const { edgeCount } = s;
    const edgeView = pinned !== "frontier" && edgeCount > 0 ? ctx.residency.view(s, "edgeList") : null;
    const scope = algorithmScope(ctx, ALGORITHM, RING_SLOTS);
    try {
        const arrayBytes = 4 * n * kMax;
        const lease = (bytes: number, label: string): Binding => bindingOf(scope.scratch(bytes, label), bytes);
        const arcBytes = 4 * Math.max(1, s.arcCount);
        const [fill, finalize, forward, backward, gather] = await Promise.all(
            (["fill", "bc-finalize", "bc-forward", "bc-backward", "bc-gather"] as const).map((id) =>
                ctx.pipelines.kernel(kernelSpec(id)),
            ),
        );
        const forwardEdge =
            edgeView === null
                ? null
                : await ctx.pipelines.kernel(kernelSpec("bc-forward-edge", { UNDIRECTED: !s.directed }));
        const edgeGather = withEdges ? await ctx.pipelines.kernel(kernelSpec("bc-edge-gather")) : null;
        const state: RunState = {
            ctx,
            scope,
            n,
            S: lease(arrayBytes, "S"),
            ends: lease(4 * (n + 2), "ends"),
            depthK: lease(arrayBytes, "depthK"),
            sigmaK: lease(arrayBytes, "sigmaK"),
            deltaK: lease(arrayBytes, "deltaK"),
            counters: lease(FRONTIER_COUNTERS.byteLength, "counters"),
            bc: lease(4 * n, "bc"),
            arcScores: withEdges ? lease(arcBytes, "arc-scores") : null,
            rowPtr: core.rowPtr,
            colIdx: core.colIdx ?? core.rowPtr,
            edgeSrc: edgeView?.bindings.src ?? null,
            edgeDst: edgeView?.bindings.dst ?? null,
            edgeCount,
            arcCount: s.arcCount,
            fill,
            finalize,
            forward,
            forwardEdge,
            backward,
            gather,
            edgeGather,
            bound: new Map(),
        };
        await ctx.allocator.check();

        // the result accumulators start at 0
        const setup = new CommandBatch(ctx, `${ALGORITHM}/setup`);
        const setupPass = setup.pass("setup");
        recordFill(state, setupPass, state.bc, n, 0);
        if (state.arcScores !== null) {
            recordFill(state, setupPass, state.arcScores, arcBytes / 4, 0);
        }
        setup.endPass();
        await submit(state, setup, options?.signal);

        let overflow = false;
        let batches = 0;
        let previousLevels = -1;
        for (let start = 0; start < sources.length; ) {
            const k = planBatchSize(n, sources.length - start, limits);
            let form: ForwardForm = pinned === "edge" ? "edge" : "frontier";
            if (pinned === "auto" && previousLevels >= 0) {
                form = previousLevels < BC_EDGE_PARALLEL_GAMMA * Math.log2(n) ? "edge" : "frontier";
            }
            if (state.forwardEdge === null) {
                form = "frontier"; // no edges to run edge-parallel over
            }
            const batch = sources.slice(start, start + k);
            const outcome = await runBatch(state, batch, form, levelsPerSubmit, tuning, options?.signal);
            overflow = overflow || outcome.overflow;
            previousLevels = outcome.levels;
            start += k;
            batches += 1;
            options?.onProgress?.(start, sources.length);
        }

        const result = new CommandBatch(ctx, `${ALGORITHM}/result`);
        const vertexRequest = result.readback(state.bc.buffer, state.bc.offset, 4 * n);
        const arcRequest =
            state.arcScores === null
                ? null
                : result.readback(state.arcScores.buffer, state.arcScores.offset, 4 * s.arcCount);
        const back = await submit(state, result, options?.signal);
        return {
            vertex: new Float32Array(back, vertexRequest.offset, n).slice(),
            perArc: arcRequest === null ? null : new Float32Array(back, arcRequest.offset, s.arcCount).slice(),
            sourcesUsed: sources.length,
            sigmaOverflow: overflow,
            batches,
        };
    } finally {
        scope.dispose();
    }
}

/**
 * The CPU's normalisation factor: `(n - 1)(n - 2)` directed, half that undirected; 1 when not normalising or when the
 * factor is not positive.
 * @param s - the snapshot
 * @param normalized - the option
 * @returns the divisor
 */
function normaliser(s: GraphSnapshot, normalized: boolean | undefined): number {
    const n = s.nodeCount;
    const factor = s.directed ? (n - 1) * (n - 2) : ((n - 1) * (n - 2)) / 2;
    return normalized === true && factor > 0 ? factor : 1;
}

/**
 * The checks every entry makes before any device work.
 * @param ctx - the context
 * @param options - the options
 */
async function precheck(ctx: GpuContext, options: BetweennessAcceleratorOptions | undefined): Promise<void> {
    ctx.assertReady();
    await assertDeviceComputes(ctx);
    if (options?.endpoints === true) {
        throw new WebGpuGraphError("E_UNSUPPORTED", `${ALGORITHM}: endpoints: true is not supported`, {
            feature: "betweenness.endpoints",
            hint: "the CPU endpoints branch in algorithms/src/algorithms/centrality/betweenness.ts (predecessors.length === 0 && w !== source) never fires, so there is no convention to match",
        });
    }
}

/**
 * Vertex betweenness with the test knobs; `betweennessCentrality` is this with an empty tuning.
 * @internal
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot
 * @param options - the betweenness options plus dest / signal / onProgress
 * @param tuning - the knobs
 * @returns the scores
 */
export async function betweennessWithTuning(
    ctx: GpuContext,
    s: GraphSnapshot,
    options: (BetweennessAcceleratorOptions & GpuRunOptions) | undefined,
    tuning: BetweennessTuning,
): Promise<GpuBetweennessResult> {
    await precheck(ctx, options);
    const n = s.nodeCount;
    const scores = checkDest(ALGORITHM, options?.dest, n) ?? new Float32Array(n);
    const sources = resolveSources(options, n);
    if (options?.signal?.aborted) {
        throw aborted(ALGORITHM);
    }
    if (n === 0 || sources.length === 0) {
        scores.fill(0);
        return { scores, iterations: 0, converged: true, precision: "f32", sourcesUsed: 0, sigmaOverflow: false };
    }
    const raw = await runRaw(ctx, s, sources, false, tuning, options);
    const divisor = (s.directed ? 1 : 2) * normaliser(s, options?.normalized);
    for (let v = 0; v < n; v++) {
        scores[v] = raw.vertex[v] / divisor;
    }
    return {
        scores,
        iterations: raw.batches,
        converged: true,
        precision: "f32",
        sourcesUsed: raw.sourcesUsed,
        sigmaOverflow: raw.sigmaOverflow,
    };
}

/**
 * Edge betweenness with the test knobs; `edgeBetweennessCentrality` is this with an empty tuning.
 * @internal
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot
 * @param options - the betweenness options plus dest (a Float32Array of edgeCount) / signal / onProgress
 * @param tuning - the knobs
 * @param onArcs - called with the per-arc scores before the fold (the tests' pairing check)
 * @returns the per-edge scores
 */
export async function edgeBetweennessWithTuning(
    ctx: GpuContext,
    s: GraphSnapshot,
    options: (BetweennessAcceleratorOptions & GpuRunOptions) | undefined,
    tuning: BetweennessTuning,
    onArcs?: (perArc: F32) => void,
): Promise<GpuEdgeScoresResult> {
    await precheck(ctx, options);
    const n = s.nodeCount;
    const scores = checkDest("edgeBetweennessCentrality", options?.dest, s.edgeCount) ?? new Float32Array(s.edgeCount);
    const sources = resolveSources(options, n);
    if (options?.signal?.aborted) {
        throw aborted(ALGORITHM);
    }
    if (n === 0 || sources.length === 0 || s.arcCount === 0) {
        scores.fill(0);
        return { scores, precision: "f32", sourcesUsed: sources.length, sigmaOverflow: false };
    }
    const raw = await runRaw(ctx, s, sources, true, tuning, options);
    const perArc = raw.perArc ?? new Float32Array(s.arcCount);
    onArcs?.(perArc);
    const folded = foldArcs(s, perArc, "first");
    const divisor = normaliser(s, options?.normalized);
    for (let e = 0; e < s.edgeCount; e++) {
        scores[e] = folded[e] / divisor;
    }
    return { scores, precision: "f32", sourcesUsed: raw.sourcesUsed, sigmaOverflow: raw.sigmaOverflow };
}

/**
 * Betweenness centrality on the device (spec 3.3 line 811, design 8.4): Brandes' algorithm, k sources per batch.
 * Exact over every vertex by default; `sources` or `k` gives the SAMPLED form, whose scores are the unscaled sum over
 * the sources run (`sourcesUsed` beside them; multiply by `n / sourcesUsed` for the estimator of the full sum). The
 * CPU package's convention: halved on an undirected snapshot, `normalized` divides by `(n - 1)(n - 2)` directed or
 * half that undirected. Weights are ignored (breadth-first on both packages). `endpoints: true` is E_UNSUPPORTED.
 * `sigmaOverflow` is true when some pair has more than 2^32 shortest paths: the scores are then wrong.
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param options - `normalized`, `endpoints`, `sources`, `k`, plus dest (a Float32Array of length n) / signal / onProgress (sources done, sources total)
 * @returns the f32 scores, `iterations` (the source batches run), `converged: true`, `sourcesUsed`, `sigmaOverflow`
 */
export function betweennessCentrality(
    ctx: GpuContext,
    s: GraphSnapshot,
    options?: BetweennessAcceleratorOptions & GpuRunOptions,
): Promise<GpuBetweennessResult> {
    return betweennessWithTuning(ctx, s, options, {});
}

/**
 * Edge betweenness centrality on the device (spec 3.3 line 812, design 8.4): the per-arc terms of the same batches,
 * folded to one score per edge with `foldArcs(s, perArc, "first")` and NOT halved on an undirected snapshot (both
 * arcs of an edge carry the same sum and the fold keeps one, which already counts each unordered pair once; this is
 * the CPU package's number). `normalized`, sampling, `endpoints` and `sigmaOverflow` as in `betweennessCentrality`.
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param options - as `betweennessCentrality`, dest a Float32Array of length edgeCount
 * @returns the f32 per-edge scores, `sourcesUsed`, `sigmaOverflow`
 */
export function edgeBetweennessCentrality(
    ctx: GpuContext,
    s: GraphSnapshot,
    options?: BetweennessAcceleratorOptions & GpuRunOptions,
): Promise<GpuEdgeScoresResult> {
    return edgeBetweennessWithTuning(ctx, s, options, {});
}
