/**
 * Weighted single-source shortest paths on the device (design 8.4, 3.3 line 808, 9.7; P8-T9, the P8 plan's PD-9 /
 * PD-10 / PD-11 / PD-14 / PD-19 / PD-20 / PD-22 / PD-27 / DEP-P8-E): Davidson's near-far queue over the `Frontier`
 * of P8-T4 with the `dedupe` of P8-T3, every per-round decision made ON THE DEVICE. `dist` is `array<atomic<u32>>`
 * holding the f32 bit patterns of the distances (`F32_INF_BITS` = unreached), claimed by `atomicMin`, which is
 * exact on non-negative floats (PD-9): the settled value is the minimum of a fixed set of f32 sums, so it is
 * bitwise reproducible, bitwise identical across adapters, and bitwise equal to the f32 Dijkstra oracle.
 *
 * A round is eight recorded dispatches: `frontier-finalize` role 2 (the round boundary: a non-empty raw near half
 * is deduped into `nearIn` for a near round; an empty one with a non-empty far half raises the threshold by the
 * delta and dedupes the far half into `farIn` for a pass-through; both empty is `done`), `dedupe-claim` and
 * `dedupe-filter` over each half (direct grid-stride dispatches; role 2 writes the chosen half's raw count into that
 * dedupe's count word -- `edgeCount` for the near half, `edgeCountUnclamped` for the far one, two words SSSP borrows
 * -- and 0 into the other's, so the half not chosen is a no-op), role 3 (restarts the raw half), and `sssp-relax`
 * twice (role 0 over `nearIn`, role 1 over `farIn`; the block's `path` word, 5 a near round and 6 a far one, makes
 * the other role's dispatch a no-op). The far pile is re-bucketed by the
 * relax kernel's pass-through, not by `compact` (PD-20): a far entry whose settled distance fell below the previous
 * threshold was relaxed in the near band already and is dropped, the rest go back to near or far against the raised
 * threshold. The near pile is ONE pile (no sub-partitions). The host records `MAX_LEVELS_PER_SUBMIT` rounds per
 * submit and reads four bytes, the `done` word: 1 finished, 2 a raw half above its capacity (E_TOO_LARGE
 * `sssp.pile`: the far half accumulates one entry per improving relaxation beyond the threshold across a bucket's
 * near rounds and is deduped only at the split, so the refusal is reachable on a graph whose vertices improve many
 * times inside one bucket), 3 the f32 threshold absorbed the delta (E_UNSUPPORTED `sssp.thresholdAbsorbed`). The
 * rounds are at most `n + ceil(sum / delta) + 1` (each near round settles the pile's minimum, one pass-through per
 * bucket), so more submits than that is E_VALIDATION, never a hang.
 *
 * The two routings (PD-22) are decided by the RUN's weight vector: `options.weights` when given (`arcCount` long or
 * E_INVALID_ARGUMENT; narrowed to `Float32Array` when it is not one -- a `U32` or `I32` value above 2^24, or the
 * bits of an `F64` value below the f32 ulp, is rounded silently, the package-wide f32 caveat and not a refusal --
 * uploaded into a lease buffer and bound in the graph group's weights slot with `HAS_WEIGHTS` set even on an
 * unweighted snapshot), else the snapshot's column, else none. A run whose vector is all ones, or has none, is the
 * unit-weight BFS of P8-T6 with a depth cap derived from `cutoff` (`dv <= cutoff` on unit weights is
 * `depth <= floor(cutoff)`), its `predArc` from `sssp-pred` in depth mode writing arc indices, `reachedCount` the
 * visited count -- not a fallback, a better algorithm for the input. A negative weight is E_UNSUPPORTED
 * `sssp.negativeWeights` (use bellmanFord), a non-finite one E_UNSUPPORTED `sssp.nonFiniteWeights` (the bit-pattern
 * order is undefined for NaN); `cutoff: NaN` is E_INVALID_ARGUMENT, because the CPU port's `dv <= NaN` relaxes
 * nothing while the kernel's `nd > NaN` guard would relax everything (PD-19). All host-side, before any device work.
 * The delta is `SSSP_DELTA_FACTOR x avgWeight / avgDegree` over the vector in use (1 for an all-zero vector), seeded
 * into the counters block as `deltaBits` and `thresholdBits`.
 *
 * `predArc` is a second pass over the settled distances (PD-11), never packed into the distance atomic: `sssp-pred`
 * in `MODE 0` follows PD-27's plateau rule -- the smallest TIGHT arc whose source sits one key step below `v`, the
 * key `(dist, hops)` with `hops` the plateau depth from a root -- through three roles over one buffer (the arcs,
 * the hop counts, the changed word and the orphan word), so the chain strictly decreases the key, ends at the
 * source, and is bitwise reproducible. A hop batch of `MAX_LEVELS_PER_SUBMIT` passes that still changed something
 * is recorded again without the roots pass; a reached node the key never reached is a kernel bug (E_VALIDATION),
 * never a result. The tuning entry `ssspWithTuning` (PD-26's shape) is what the tests drive; nothing public
 * exposes it.
 *
 * The host-side helpers of the two routings (`resolveWeights`, `normaliseCutoff`, `checkDest`, `assertSource`,
 * `unitWeightRoute`) and the predecessor pass (`predecessorPass`, both PD-27 keys) are shared with
 * `bellman-ford.ts` (P8-T10), which is the same seam type over the same `SsspOptions`; they take the algorithm's
 * name for their messages and are `@internal`.
 */

import { type F32, type GraphSnapshot, INVALID_INDEX, type NumericVector, type U32 } from "@graphty/graph-format";

import { F32_INF_BITS, MAX_LEVELS_PER_SUBMIT, SSSP_DELTA_FACTOR } from "../constants.js";
import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { CommandBatch } from "../kernel/batch.js";
import { plan1d, planGridStride } from "../kernel/dispatch.js";
import { type Kernel } from "../kernel/kernel.js";
import { type UniformValues } from "../kernel/struct-block.js";
import {
    FILL_PARAMS,
    FRONTIER_COUNTERS,
    FRONTIER_PARAMS,
    graphBindings,
    graphOverrides,
    kernelSpec,
} from "../kernels.js";
import { type DedupeRecord, prepareCompact } from "../primitives/compact.js";
import { assertWholeCore } from "../primitives/core-shape.js";
import { prepareFrontier, W } from "../primitives/frontier.js";
import { assertDeviceComputes } from "../primitives/verify.js";
import { type SsspOptions } from "../types/accelerator.js";
import { type Binding } from "../types/memory.js";
import { type GpuRunOptions } from "../types/run.js";
import { type GpuSsspResult } from "../types/traversal.js";
import { bfsWithTuning } from "./bfs.js";
import { type AlgorithmScope, algorithmScope } from "./scope.js";

const ALGORITHM = "sssp";

/** The arc-window alignment of the raw halves: the far half's byte offset is `4 x cap`, a multiple of 256, so `dedupe` can bind it alone. */
const HALF_ALIGN = 64;

/**
 * Params slots of the ring, COUNTED (`UniformRing.reserve` wraps silently): per round `frontier-finalize` twice and
 * the two dedupe records (4), plus the two relax records shared by every round of a submit (the near and the far
 * role read the same fields), so `4 x MAX_LEVELS_PER_SUBMIT + 2` for a round submit; the predecessor batch is the
 * roots pass, `MAX_LEVELS_PER_SUBMIT` hop passes, one `fill` and the predecessor pass (35) and the setup batch two
 * `fill`s; they flush in their own submits but must fit the same ring.
 */
const RING_SLOTS = 4 * MAX_LEVELS_PER_SUBMIT + 40;

/**
 * The knobs the tests need and nothing public offers (PD-26's shape): the submit cadence, the near-far delta and the
 * inspect seam.
 * @internal
 */
export interface SsspTuning {
    /** Rounds recorded per submit (default `MAX_LEVELS_PER_SUBMIT`); 1 hands `onRound` the block after every round. */
    readonly roundsPerSubmit?: number | undefined;
    /** The near-far delta (a finite positive number) in place of the derived `SSSP_DELTA_FACTOR x avgWeight / avgDegree`. */
    readonly delta?: number | undefined;
    /** The inspect seam: after every SUBMIT, the index of the last round recorded and the whole counters block as the submit left it. */
    readonly onRound?: ((round: number, counters: UniformValues) => void) | undefined;
}

/**
 * The weight vector a run uses and what the host scan found in it.
 * @internal
 */
export interface WeightVector {
    /** The per-arc weights (the snapshot's column, or the override narrowed to f32). */
    readonly values: F32;
    /** Null when the snapshot's own column is used (the core's binding serves); else the override to upload. */
    readonly override: F32 | null;
    readonly allOne: boolean;
    readonly nonNegative: boolean;
    readonly finite: boolean;
    /** The f64 sum of the vector (the delta's numerator and the round bound's). */
    readonly sum: number;
}

/**
 * The f32 bit pattern of a number (the form the counters block and `FrontierParams` carry).
 * @internal
 * @param value - the number (rounded to f32 first)
 * @returns the pattern
 */
export function bitsOf(value: number): number {
    return new Uint32Array(Float32Array.of(value).buffer)[0];
}

/**
 * Whole-buffer binding of a scratch buffer over its first `size` bytes.
 * @internal
 * @param buffer - the buffer
 * @param size - the bound byte length
 * @returns the binding
 */
export function bindingOf(buffer: GPUBuffer, size: number): Binding {
    return { buffer, offset: 0, size, window: null };
}

/**
 * The E_ABORTED error of a signal.
 * @internal
 * @param algorithm - the algorithm's name (the message prefix)
 * @param batchId - the last submitted batch, when one exists
 * @returns the error
 */
export function aborted(algorithm: string, batchId?: number): WebGpuGraphError {
    return new WebGpuGraphError(
        "E_ABORTED",
        `${algorithm}: the signal was aborted`,
        batchId === undefined ? {} : { batchId },
    );
}

/**
 * E_INVALID_ARGUMENT unless `source` is an integer in `[0, n)`.
 * @internal
 * @param algorithm - the algorithm's name (the message prefix)
 * @param source - the caller's source node index
 * @param n - the node count
 */
export function assertSource(algorithm: string, source: number, n: number): void {
    if (!Number.isInteger(source) || source < 0 || source >= n) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `${algorithm}: source ${source} is outside [0, ${n})`, {
            argument: "source",
            value: source,
            expected: `an integer in [0, ${n})`,
        });
    }
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
 * Validates `options.dest` for a distance result of `n` elements.
 * @internal
 * @param algorithm - the algorithm's name (the message prefix)
 * @param dest - the caller's destination array, if any
 * @param n - the node count
 * @returns the destination as an F32, or null when none was given
 */
export function checkDest(algorithm: string, dest: Float32Array | Uint32Array | undefined, n: number): F32 | null {
    if (dest === undefined) {
        return null;
    }
    if (dest instanceof Float32Array && dest.length === n && dest.buffer instanceof ArrayBuffer) {
        return dest as F32;
    }
    throw new WebGpuGraphError(
        "E_INVALID_ARGUMENT",
        `${algorithm}: dest must be a Float32Array of length ${n} over an ArrayBuffer`,
        {
            argument: "dest",
            value: `${dest.constructor.name}(${dest.length})`,
            expected: `Float32Array(${n}) over an ArrayBuffer`,
        },
    );
}

/**
 * The CPU port's `cutoff` before any device work: absent is no cap; `NaN` is refused (PD-19: `dv <= NaN` relaxes
 * nothing on the CPU while the kernel's `nd > NaN` guard would relax everything, a silently inverted option);
 * anything else is a finite or infinite number.
 * @internal
 * @param algorithm - the algorithm's name (the message prefix)
 * @param cutoff - the caller's option
 * @returns the cap
 */
export function normaliseCutoff(algorithm: string, cutoff: number | undefined): number {
    if (cutoff === undefined) {
        return Infinity;
    }
    if (Number.isNaN(cutoff)) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `${algorithm}: cutoff must not be NaN`, {
            argument: "cutoff",
            value: cutoff,
            expected: "a number (the CPU port and the kernel would disagree on NaN)",
        });
    }
    return cutoff;
}

/**
 * The weight vector of the run (PD-22): the override, validated and narrowed, else the snapshot's column, else
 * null; scanned once on the host for the routing flags and the sum.
 * @internal
 * @param algorithm - the algorithm's name (the message prefix)
 * @param s - the snapshot
 * @param weights - the caller's override, if any
 * @returns the vector and its flags, or null when the run has no weights at all
 */
export function resolveWeights(
    algorithm: string,
    s: GraphSnapshot,
    weights: NumericVector | undefined,
): WeightVector | null {
    if (weights === undefined) {
        if (s.weights === null) {
            return null;
        }
        let sum = 0;
        for (const w of s.weights) {
            sum += w;
        }
        return {
            values: s.weights,
            override: null,
            allOne: s.flags.allWeightsOne,
            nonNegative: s.flags.nonNegativeWeights,
            finite: s.flags.finiteWeights,
            sum,
        };
    }
    if (weights.length !== s.arcCount) {
        throw new WebGpuGraphError(
            "E_INVALID_ARGUMENT",
            `${algorithm}: weights has ${weights.length} entries, the snapshot ${s.arcCount} arcs`,
            { argument: "weights", value: weights.length, expected: s.arcCount },
        );
    }
    // the f32 narrowing: a U32 / I32 value above 2^24 or the bits of an F64 value below the f32 ulp round silently
    const values: F32 = weights instanceof Float32Array ? weights : Float32Array.from(weights);
    let allOne = true;
    let nonNegative = true;
    let finite = true;
    let sum = 0;
    for (const w of values) {
        if (w !== 1) {
            allOne = false;
        }
        if (w < 0) {
            nonNegative = false;
        }
        if (!Number.isFinite(w)) {
            finite = false;
        }
        sum += w;
    }
    return { values, override: values, allOne, nonNegative, finite, sum };
}

/**
 * The unit-weight route (PD-22): the BFS with `cutoff` as a depth cap (`dv <= cutoff` on unit weights is
 * `depth <= floor(cutoff)`; no cap or `+Infinity` is no cap, a negative cutoff the source alone), its `parent` in
 * arc form, its depths as f32 distances.
 * @internal
 * @param ctx - the context
 * @param s - the snapshot
 * @param source - the source node index
 * @param cutoff - the normalised cutoff
 * @param dest - the caller's destination, if any
 * @param options - the run options
 * @returns the result
 */
export async function unitWeightRoute(
    ctx: GpuContext,
    s: GraphSnapshot,
    source: number,
    cutoff: number,
    dest: F32 | null,
    options: GpuRunOptions | undefined,
): Promise<GpuSsspResult> {
    const maxDepth = cutoff === Infinity ? undefined : Math.floor(cutoff);
    const bfs = await bfsWithTuning(
        ctx,
        s,
        source,
        { maxDepth, signal: options?.signal, onProgress: options?.onProgress },
        { predKind: 0 },
    );
    const dist = dest ?? new Float32Array(s.nodeCount);
    for (let v = 0; v < s.nodeCount; v++) {
        const d = bfs.depth[v];
        dist[v] = d === INVALID_INDEX ? Infinity : d;
    }
    return { dist, predArc: bfs.parent, reachedCount: bfs.visitedCount };
}

/**
 * The words of PD-27's `pred` buffer for `n` nodes: the arcs at 0, the hop counts at `hb = roundUp(n, 64)`, the
 * changed word at `2 hb` and the orphan word after it, in a 64-word tail.
 * @internal
 * @param n - the node count
 * @returns the word count (`2 x hb + 64`)
 */
export function predBufferWords(n: number): number {
    return 2 * Math.ceil(n / 64) * 64 + 64;
}

/**
 * What the predecessor pass needs from its driver.
 * @internal
 */
export interface PredecessorPassInput {
    /** The algorithm's name (the batch labels and the E_VALIDATION label). */
    readonly algorithm: string;
    readonly ctx: GpuContext;
    readonly scope: AlgorithmScope;
    /** `sssp-pred` compiled in `MODE 0` with the run's graph overrides. */
    readonly predKernel: Kernel;
    /** Records one `fill` of `count` words of `dst` with `value` (the driver's own closure over its `fill` kernel). */
    readonly recordFill: (pass: GPUComputePassEncoder, dst: Binding, count: number, value: number) => void;
    /** The graph group with the run's weights in the weights slot. */
    readonly graph: Readonly<Record<"rowPtr" | "colIdx" | "weights" | "perm", Binding>>;
    /** The settled distances (f32 bit patterns, `F32_INF_BITS` unreached). */
    readonly dist: Binding;
    /** The `predBufferWords(n)`-word pred buffer, every word `INVALID_INDEX` (the driver's setup fill). */
    readonly pred: Binding;
    readonly n: number;
    readonly arcCount: number;
    readonly source: number;
    /** PD-27's key: 0 the plateau rule (`sssp`; a roots pass first), 1 the tight-subgraph rule (`bellmanFord`; the source is the only root). */
    readonly mode: 0 | 1;
}

/**
 * What the predecessor pass read back, in one batch with the arcs.
 * @internal
 */
export interface PredecessorPassOutput {
    /** The settled distances (the dist buffer), a view of the batch's copy. */
    readonly dist: Float32Array;
    /** `pred[0, n)`: the arcs. */
    readonly predArc: U32;
    /** The orphan word: reached non-source nodes the key never reached. */
    readonly orphans: number;
}

/**
 * The predecessor pass (PD-11, PD-27): the source is the one seeded root and the two flag words are zeroed by
 * `queue.writeBuffer`; then ONE batch of the roots pass (the plateau rule only), `MAX_LEVELS_PER_SUBMIT` hop passes
 * with `P.iteration` counting inside the batch, the arcs re-filled with `INVALID_INDEX` and the predecessor pass,
 * with the readbacks of `dist`, `pred[0, n)` and the two flag words; recorded again without the roots pass while the
 * last hop pass still changed something (a plateau, or a tight subgraph, `k` hops deep needs `ceil((k + 1) / 32)`
 * batches). More than `ceil((n + 1) / MAX_LEVELS_PER_SUBMIT) + 1` batches is E_VALIDATION, because a hop count is at
 * most `n`. The orphan word is returned, not judged: `sssp` treats it as a kernel bug and `bellmanFord` as the rounded
 * cycle PD-27 names.
 * @internal
 * @param input - the driver's buffers, kernels and key rule
 * @returns the distances, the arcs and the orphan count
 */
export async function predecessorPass(input: PredecessorPassInput): Promise<PredecessorPassOutput> {
    const { algorithm, ctx, scope, predKernel, recordFill, graph, dist, pred, n, arcCount, source, mode } = input;
    const wg = ctx.workgroupSize;
    const { queue } = ctx.device;
    const bytes = 4 * n;
    const hb = Math.ceil(n / 64) * 64;
    const predArcs: Binding = { buffer: pred.buffer, offset: pred.offset, size: bytes, window: null };
    queue.writeBuffer(pred.buffer, pred.offset + 4 * (hb + source), Uint32Array.of(0));
    queue.writeBuffer(pred.buffer, pred.offset + 4 * 2 * hb, new Uint32Array(2));
    const predPlan = planGridStride(n, wg, ctx.caps);
    const predFields = {
        wg,
        n,
        arcBase: 0,
        arcEnd: arcCount,
        predKind: 0,
        source,
        stride: predPlan.stride ?? n,
        mode,
    };
    const maxBatches = Math.ceil((n + 1) / MAX_LEVELS_PER_SUBMIT) + 1;
    let batches = 0;
    for (;;) {
        const batch = new CommandBatch(ctx, `${algorithm}/pred`);
        const pass = batch.pass("pred");
        const recordRole = (role: number, iteration: number): void => {
            const params = scope.params(FRONTIER_PARAMS, { ...predFields, role, iteration });
            const bound = predKernel.bind({ ...graph, dist, pred, P: params.binding });
            predKernel.dispatch(pass, bound, predPlan, [params.offset]);
        };
        if (batches === 0 && mode === 0) {
            recordRole(0, 0);
        }
        for (let iteration = 0; iteration < MAX_LEVELS_PER_SUBMIT; iteration++) {
            recordRole(1, iteration);
        }
        recordFill(pass, predArcs, n, INVALID_INDEX);
        recordRole(2, 0);
        batch.endPass();
        const distRequest = batch.readback(dist.buffer, dist.offset, bytes);
        const predRequest = batch.readback(pred.buffer, pred.offset, bytes);
        const flagsRequest = batch.readback(pred.buffer, pred.offset + 4 * 2 * hb, 8);
        scope.flush();
        const back = await batch.submit().readback;
        ctx.assertReady();
        batches += 1;
        const [changed, orphans] = new Uint32Array(back, flagsRequest.offset, 2);
        if (changed < MAX_LEVELS_PER_SUBMIT) {
            return {
                dist: new Float32Array(back, distRequest.offset, n),
                predArc: new Uint32Array(back, predRequest.offset, n).slice(),
                orphans,
            };
        }
        if (batches > maxBatches) {
            throw new WebGpuGraphError(
                "E_VALIDATION",
                `${algorithm}: the hop passes still changed something after ${batches} batches (a hop count is at most ${n})`,
                { label: `${algorithm}/pred`, message: `the hop passes did not converge in ${batches} batches` },
            );
        }
        queue.writeBuffer(pred.buffer, pred.offset + 4 * 2 * hb, new Uint32Array(2));
    }
}

/**
 * Single-source shortest paths with the test knobs of PD-26's shape; `sssp` is this with an empty tuning.
 * @internal
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param source - the source node index
 * @param options - `cutoff` and `weights`, plus dest / signal / onProgress
 * @param tuning - the knobs
 * @returns the distances, the predecessor arcs and the reached count
 */
export async function ssspWithTuning(
    ctx: GpuContext,
    s: GraphSnapshot,
    source: number,
    options: (SsspOptions & GpuRunOptions) | undefined,
    tuning: SsspTuning,
): Promise<GpuSsspResult> {
    ctx.assertReady();
    await assertDeviceComputes(ctx);
    const n = s.nodeCount;
    assertSource(ALGORITHM, source, n);
    const roundsPerSubmit = tuning.roundsPerSubmit ?? MAX_LEVELS_PER_SUBMIT;
    if (!Number.isInteger(roundsPerSubmit) || roundsPerSubmit < 1 || roundsPerSubmit > MAX_LEVELS_PER_SUBMIT) {
        throw new WebGpuGraphError(
            "E_INVALID_ARGUMENT",
            `${ALGORITHM}: roundsPerSubmit must be an integer in [1, ${MAX_LEVELS_PER_SUBMIT}]`,
            {
                argument: "roundsPerSubmit",
                value: roundsPerSubmit,
                expected: `an integer in [1, ${MAX_LEVELS_PER_SUBMIT}]`,
            },
        );
    }
    if (tuning.delta !== undefined && !(Number.isFinite(tuning.delta) && tuning.delta > 0)) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `${ALGORITHM}: delta must be a finite positive number`, {
            argument: "delta",
            value: tuning.delta,
            expected: "a finite positive number",
        });
    }
    const dest = checkDest(ALGORITHM, options?.dest, n);
    const vector = resolveWeights(ALGORITHM, s, options?.weights);
    const cutoff = normaliseCutoff(ALGORITHM, options?.cutoff);
    if (options?.signal?.aborted) {
        throw aborted(ALGORITHM);
    }
    if (vector === null || vector.allOne) {
        return unitWeightRoute(ctx, s, source, cutoff, dest, options);
    }
    if (!vector.nonNegative) {
        throw new WebGpuGraphError("E_UNSUPPORTED", `${ALGORITHM}: a negative weight has no shortest path here`, {
            feature: "sssp.negativeWeights",
            hint: "use bellmanFord",
        });
    }
    if (!vector.finite) {
        throw new WebGpuGraphError("E_UNSUPPORTED", `${ALGORITHM}: a NaN or infinite weight has no bit-pattern order`, {
            feature: "sssp.nonFiniteWeights",
        });
    }
    const { arcCount } = s;
    const core = ctx.residency.core(s);
    const limit = ctx.caps.limits.maxStorageBufferBindingSize;
    assertWholeCore(core, arcCount, limit, ALGORITHM);
    // the raw halves: cap entries each, the far half at word cap so its byte offset is 256-aligned; one binding
    // of both halves is what the relax kernel sees, so the whole buffer is held to the binding limit (DEP-P8-E)
    const cap = Math.ceil(Math.max(1, arcCount) / HALF_ALIGN) * HALF_ALIGN;
    if (8 * cap > limit) {
        throw new WebGpuGraphError(
            "E_TOO_LARGE",
            `${ALGORITHM}: the near-far queue of ${cap} entries per half needs ${8 * cap} bytes, above the ${limit}-byte binding limit (the relax is never windowed)`,
            { needed: 8 * cap, limit, path: "sssp.queue", algorithm: ALGORITHM },
        );
    }
    // PD-22: the delta from the vector in use; an all-zero vector would land every relaxation on the far pile
    const delta = Math.fround(
        tuning.delta ?? (vector.sum === 0 ? 1 : (SSSP_DELTA_FACTOR * (vector.sum / arcCount)) / (arcCount / n)),
    );
    const deltaBits = bitsOf(delta);
    const maxRounds = n + Math.ceil(vector.sum / delta) + 1;
    const maxSubmits = Math.ceil((maxRounds + 1) / roundsPerSubmit) + 1;
    const scope = algorithmScope(ctx, ALGORITHM, RING_SLOTS);
    try {
        const wg = ctx.workgroupSize;
        const bytes = 4 * n;
        const dist = bindingOf(scope.scratch(bytes, "dist"), bytes);
        const owner = bindingOf(scope.scratch(bytes, "owner"), bytes);
        const queueOut = bindingOf(scope.scratch(8 * cap, "queue-out"), 8 * cap);
        const nearHalf: Binding = { buffer: queueOut.buffer, offset: 0, size: 4 * cap, window: null };
        const farHalf: Binding = { buffer: queueOut.buffer, offset: 4 * cap, size: 4 * cap, window: null };
        // the pred buffer of PD-27: the arcs at 0, the hop counts at hb, the changed word at 2 hb, the orphan word after it
        const predWords = predBufferWords(n);
        const pred = bindingOf(scope.scratch(4 * predWords, "pred"), 4 * predWords);
        const { queue } = ctx.device;
        let weightsBinding: Binding | undefined;
        if (vector.override !== null) {
            const uploaded = scope.scratch(4 * arcCount, "weights");
            queue.writeBuffer(uploaded, 0, vector.override);
            weightsBinding = bindingOf(uploaded, 4 * arcCount);
        }
        await ctx.allocator.check();
        const planner = await prepareFrontier(scope, n, arcCount, cap);
        const compact = await prepareCompact(scope);
        const overrides = graphOverrides(core, null, weightsBinding);
        const relax = await ctx.pipelines.kernel(kernelSpec("sssp-relax", overrides));
        const predKernel = await ctx.pipelines.kernel(kernelSpec("sssp-pred", { ...overrides, MODE: 0 }));
        const fill = await ctx.pipelines.kernel(kernelSpec("fill"));
        const graph = graphBindings(core, null, weightsBinding);
        const { frontier } = planner;
        const { counters } = frontier;
        const nearIn = frontier.vertices[0];
        const farIn = frontier.vertices[1];
        const recordFill = (pass: GPUComputePassEncoder, dst: Binding, count: number, value: number): void => {
            const params = scope.params(FILL_PARAMS, { count, value, mode: 0, pad0: 0 });
            fill.dispatch(pass, fill.bind({ dst, P: params.binding }), plan1d(count, wg, ctx.caps), [params.offset]);
        };
        const submit = (batch: CommandBatch): ReturnType<CommandBatch["submit"]> => {
            scope.flush();
            return batch.submit();
        };

        // setup: dist = +Inf everywhere and the pred buffer INVALID_INDEX; then the source at 0, the seeded block
        // (the source in the RAW near half so the first boundary dedupes a one-entry pile like every later one)
        const setup = new CommandBatch(ctx, `${ALGORITHM}/setup`);
        const setupPass = setup.pass("fill");
        recordFill(setupPass, dist, n, F32_INF_BITS);
        recordFill(setupPass, pred, predWords, INVALID_INDEX);
        setup.endPass();
        await submit(setup).readback;
        ctx.assertReady();
        queue.writeBuffer(dist.buffer, dist.offset + 4 * source, Uint32Array.of(0));
        frontier.reset(queue, source, { nextFrontierCount: 1, thresholdBits: deltaBits, deltaBits });
        queue.writeBuffer(queueOut.buffer, queueOut.offset, Uint32Array.of(source));

        // the rounds: MAX_LEVELS_PER_SUBMIT per submit, four bytes back
        const nearDedupe: DedupeRecord = {
            queue: nearHalf,
            count: cap,
            countIndex: W.edgeCount, // role 2 writes the raw near count here when it chooses a near round, 0 otherwise
            counters,
            owner,
            out: nearIn,
            outCount: counters,
            outIndex: W.frontierCount,
        };
        const farDedupe: DedupeRecord = {
            queue: farHalf,
            count: cap,
            countIndex: W.edgeCountUnclamped, // and the raw far count here on a far round
            counters,
            owner,
            out: farIn,
            outCount: counters,
            outIndex: W.farCount,
        };
        const relaxPlan = planGridStride(n, wg, ctx.caps); // a pile holds at most n entries; the kernel loops to the count word
        const relaxFields = {
            wg,
            n,
            edgeCapacity: cap,
            arcBase: 0,
            arcEnd: arcCount,
            cutoffBits: bitsOf(cutoff),
            source,
            stride: relaxPlan.stride ?? wg,
        };
        let roundsRecorded = 0;
        let submits = 0;
        for (;;) {
            const batch = new CommandBatch(ctx, `${ALGORITHM}/rounds`);
            const pass = batch.pass("sssp");
            const near = scope.params(FRONTIER_PARAMS, { ...relaxFields, role: 0 });
            const far = scope.params(FRONTIER_PARAMS, { ...relaxFields, role: 1 });
            const boundNear = relax.bind({ ...graph, dist, counters, queueIn: nearIn, queueOut, P: near.binding });
            const boundFar = relax.bind({ ...graph, dist, counters, queueIn: farIn, queueOut, P: far.binding });
            for (let round = 0; round < roundsPerSubmit; round++) {
                // every dispatch of a round is DIRECT: role 2 writes the chosen half's raw count into the dedupe's count
                // word (the other's is 0) and the path word the relax roles gate on, so the half not chosen is a no-op
                planner.recordFinalize(pass, 2, round, {});
                compact.recordDedupe(pass, nearDedupe);
                compact.recordDedupe(pass, farDedupe);
                planner.recordFinalize(pass, 3, round, {});
                relax.dispatch(pass, boundNear, relaxPlan, [near.offset]);
                relax.dispatch(pass, boundFar, relaxPlan, [far.offset]);
            }
            batch.endPass();
            const doneRequest = batch.readback(counters.buffer, counters.offset + 4 * W.done, 4);
            const inspect =
                tuning.onRound === undefined
                    ? null
                    : batch.readback(counters.buffer, counters.offset, FRONTIER_COUNTERS.byteLength);
            const submitted = submit(batch);
            const back = await submitted.readback;
            roundsRecorded += roundsPerSubmit;
            submits += 1;
            ctx.assertReady();
            if (options?.signal?.aborted) {
                throw aborted(ALGORITHM, submitted.id);
            }
            options?.onProgress?.(Math.min(roundsRecorded, maxRounds), maxRounds);
            if (inspect !== null && tuning.onRound !== undefined) {
                tuning.onRound(roundsRecorded - 1, FRONTIER_COUNTERS.read(new DataView(back), inspect.offset));
            }
            const done = new Uint32Array(back, doneRequest.offset, 1)[0];
            if (done === 1) {
                break;
            }
            if (done !== 0) {
                const block = FRONTIER_COUNTERS.read(
                    new DataView(
                        await ctx.readback.read(
                            counters.buffer,
                            FRONTIER_COUNTERS.byteLength,
                            undefined,
                            counters.offset,
                        ),
                    ),
                );
                if (done === 2) {
                    const needed = Math.max(wordOf(block, "nextFrontierCount"), wordOf(block, "nextFarCount"));
                    throw new WebGpuGraphError(
                        "E_TOO_LARGE",
                        `${ALGORITHM}: a raw pile of ${needed} entries overflowed its ${cap}-entry half`,
                        { needed, limit: cap, path: "sssp.pile", algorithm: ALGORITHM },
                    );
                }
                throw new WebGpuGraphError(
                    "E_UNSUPPORTED",
                    `${ALGORITHM}: the f32 threshold ${wordOf(block, "thresholdBits")} absorbed the delta ${deltaBits} (as bit patterns); the far pile can no longer be bucketed`,
                    { feature: "sssp.thresholdAbsorbed", hint: "the distances outgrew the delta's f32 precision" },
                );
            }
            if (submits > maxSubmits) {
                throw new WebGpuGraphError(
                    "E_VALIDATION",
                    `${ALGORITHM}: the done flag never rose in ${submits} submits (at most ${maxRounds} rounds)`,
                    { label: `${ALGORITHM}/rounds`, message: `the done flag never rose in ${submits} submits` },
                );
            }
        }

        // the predecessor pass (PD-11, PD-27) under the plateau rule
        const passed = await predecessorPass({
            algorithm: ALGORITHM,
            ctx,
            scope,
            predKernel,
            recordFill,
            graph,
            dist,
            pred,
            n,
            arcCount,
            source,
            mode: 0,
        });
        if (passed.orphans !== 0) {
            // (2) of PD-27: every reached non-source node has an admitted in-arc under non-negative weights
            throw new WebGpuGraphError(
                "E_VALIDATION",
                `${ALGORITHM}: ${passed.orphans} reached node(s) the predecessor key never reached (a kernel bug)`,
                { label: `${ALGORITHM}/pred`, message: `${passed.orphans} orphan(s) in the predecessor pass` },
            );
        }
        const distOut = dest ?? new Float32Array(n);
        distOut.set(passed.dist);
        let reachedCount = 0;
        for (const d of distOut) {
            if (d !== Infinity) {
                reachedCount += 1;
            }
        }
        return { dist: distOut, predArc: passed.predArc, reachedCount };
    } finally {
        scope.dispose();
    }
}

/**
 * Single-source shortest paths on the device (spec 3.3 line 808, design 8.4, 9.7): `dist` in f32, bitwise equal to
 * the f32 Dijkstra (PD-9), `predArc` a tight arc one PD-27 key step below each reached node (the chain always ends
 * at the source), `reachedCount`; `cutoff` as the CPU port reads it (`dv <= cutoff`), `weights` a per-arc override
 * of the snapshot's column for this run; a run with unit weights is the BFS (PD-22).
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param source - the source node index (E_INVALID_ARGUMENT outside `[0, n)`)
 * @param options - `cutoff` and `weights`, plus dest (a Float32Array of length n for `dist`) / signal / onProgress
 * @returns the distances, the predecessor arcs and the reached count
 */
export function sssp(
    ctx: GpuContext,
    s: GraphSnapshot,
    source: number,
    options?: SsspOptions & GpuRunOptions,
): Promise<GpuSsspResult> {
    return ssspWithTuning(ctx, s, source, options, {});
}
