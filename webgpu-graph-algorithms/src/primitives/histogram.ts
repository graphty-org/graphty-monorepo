/**
 * The `histogram` and `countingSortByKey` primitive drivers (spec 6 row 5; P4-T3, PD-4). `histogram` zeroes `hist`
 * with a `fill` dispatch and then adds one per key in global memory: order-independent, so bitwise deterministic on
 * every adapter. `countingSortByKey` is the histogram, an exclusive scan of it into `outStart`, a zeroed per-bin
 * `cursor`, and the scatter `outIndex[outStart[k] + atomicAdd(&cursor[k], 1)] = i`: the SET of indices inside a bin
 * is fixed, their order follows the schedule (set-deterministic, design 6). Every zeroing is a dispatch inside the
 * caller's pass (PD-12), never an encoder clear.
 *
 * The drivers own no device objects: the caller supplies a ReduceScope (the same record `reduce` takes) and the
 * compute pass to record into. `src/primitives/**` never imports `src/context.ts`.
 */

import { WebGpuGraphError } from "../errors.js";
import { plan1d } from "../kernel/dispatch.js";
import { type Kernel } from "../kernel/kernel.js";
import { FILL_PARAMS, HIST_PARAMS, kernelSpec } from "../kernels.js";
import { type Binding } from "../types/memory.js";
import { type ReduceScope } from "./reduce.js";
import { prepareScan, type ScanPlanner } from "./scan.js";

/** A prepared histogram (spec 6 row 5): records the fill and the one counting dispatch into a pass. */
export interface HistogramPlanner {
    /**
     * Records the histogram of `count` u32 keys of `keys` over `bins` bins into `hist` (zeroed first by a `fill`
     * dispatch); a key >= bins is not counted. For count 0 only the fill is recorded, so `hist` is all zero.
     * @param pass - the compute pass
     * @param keys - the keys (at least 4 x count bytes)
     * @param count - the key count (a non-negative integer below 2^32)
     * @param bins - the bin count (an integer in [1, 2^32))
     * @param hist - the counts (at least 4 x bins bytes)
     */
    record(pass: GPUComputePassEncoder, keys: Binding, count: number, bins: number, hist: Binding): void;
    /** Dispatches the last record() issued: 1 (the fill) for count 0, else 2. */
    readonly lastDispatches: number;
}

/** The two per-bin scratch arrays of a counting sort: the histogram and the scatter cursor, each at least 4 x bins bytes. */
interface CountingSortScratch {
    readonly hist: Binding;
    readonly cursor: Binding;
}

/** A prepared counting sort by key (spec 6 row 5): records the histogram, the scan, the cursor fill and the scatter into a pass. */
export interface CountingSortPlanner {
    /**
     * Records the counting sort of `count` keys of `keys` (every key < bins) into `outIndex` (the indices in key
     * order; the order inside a bin follows the schedule) and `outStart` (the exclusive scan of the histogram, so bin
     * k holds `outIndex[outStart[k] .. outStart[k + 1])` when outStart has bins + 1 words, as the grid's does).
     * For count 0 the two fills and the scan run and `outStart` is all zero.
     * @param pass - the compute pass
     * @param keys - the keys (at least 4 x count bytes)
     * @param count - the key count (a non-negative integer below 2^32)
     * @param bins - the bin count (an integer in [1, 2^32))
     * @param scratch - the per-bin histogram and cursor (each at least 4 x bins bytes)
     * @param outIndex - the sorted indices (at least 4 x count bytes)
     * @param outStart - the bin starts (at least 4 x bins bytes)
     */
    record(
        pass: GPUComputePassEncoder,
        keys: Binding,
        count: number,
        bins: number,
        scratch: CountingSortScratch,
        outIndex: Binding,
        outStart: Binding,
    ): void;
    /** Dispatches the last record() issued: the histogram's + the scan's + 1 (the cursor fill) + 1 (the scatter, count > 0 only). */
    readonly lastDispatches: number;
}

/** The largest u32: the largest value `HistParams.count` / `bins` can carry. */
const U32_MAX = 0xffffffff;

/**
 * Prepares the histogram pipelines of a scope (compiles `histogram` and `fill` once) so record() is synchronous.
 * @param scope - the caller's scope (device, caps, cache, scratch, params)
 * @returns the planner
 */
export async function prepareHistogram(scope: ReduceScope): Promise<HistogramPlanner> {
    return prepareHistogramImpl(scope);
}

/**
 * The concrete histogram planner (its recordZero is what the counting sort reuses for the cursor).
 * @param scope - the caller's scope
 * @returns the planner
 */
async function prepareHistogramImpl(scope: ReduceScope): Promise<HistogramPlannerImpl> {
    const histogram = await scope.pipelines.kernel(kernelSpec("histogram"));
    const fill = await scope.pipelines.kernel(kernelSpec("fill"));
    return new HistogramPlannerImpl(scope, histogram, fill);
}

/**
 * Prepares the counting-sort pipelines of a scope (the histogram's, the scan's and `counting-scatter`) so record()
 * is synchronous. The planner lives exactly as long as the scope (the scan keeps a scratch word of it).
 * @param scope - the caller's scope
 * @returns the planner
 */
export async function prepareCountingSort(scope: ReduceScope): Promise<CountingSortPlanner> {
    const histogram = await prepareHistogramImpl(scope);
    const scan = await prepareScan(scope);
    const scatter = await scope.pipelines.kernel(kernelSpec("counting-scatter"));
    return new CountingSortPlannerImpl(scope, histogram, scan, scatter);
}

/**
 * The E_INVALID_ARGUMENT of a binding shorter than `words` u32.
 * @param name - the argument name
 * @param binding - the binding
 * @param words - the words it must hold
 */
function checkWords(name: string, binding: Binding, words: number): void {
    if (binding.size < 4 * words) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `histogram: ${name} is smaller than 4 x ${words} bytes`, {
            argument: name,
            value: binding.size,
            expected: 4 * words,
        });
    }
}

/**
 * The argument checks shared by both record() methods (E_INVALID_ARGUMENT before anything is recorded).
 * @param keys - the keys binding
 * @param count - the key count
 * @param bins - the bin count
 * @param hist - the histogram binding
 */
function checkHistogramArguments(keys: Binding, count: number, bins: number, hist: Binding): void {
    if (!Number.isSafeInteger(count) || count < 0 || count > U32_MAX) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", "histogram: count must be a non-negative integer below 2^32", {
            argument: "count",
            value: count,
        });
    }
    if (!Number.isSafeInteger(bins) || bins < 1 || bins > U32_MAX) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", "histogram: bins must be an integer in [1, 2^32)", {
            argument: "bins",
            value: bins,
        });
    }
    checkWords("keys", keys, count);
    checkWords("hist", hist, bins);
}

/** The planner: the histogram and fill kernels over one scope. */
class HistogramPlannerImpl implements HistogramPlanner {
    private readonly scope: ReduceScope;
    private readonly histogram: Kernel;
    private readonly fill: Kernel;
    private dispatches = 0;

    /**
     * Wraps the resolved kernels; use prepareHistogram().
     * @param scope - the caller's scope
     * @param histogram - the `histogram` kernel
     * @param fill - the `fill` kernel
     */
    constructor(scope: ReduceScope, histogram: Kernel, fill: Kernel) {
        this.scope = scope;
        this.histogram = histogram;
        this.fill = fill;
    }

    /**
     * Dispatches the last record() issued.
     * @returns the count
     */
    get lastDispatches(): number {
        return this.dispatches;
    }

    /**
     * Records the fill and the histogram (see the interface).
     * @param pass - the compute pass
     * @param keys - the keys
     * @param count - the key count
     * @param bins - the bin count
     * @param hist - the counts
     */
    record(pass: GPUComputePassEncoder, keys: Binding, count: number, bins: number, hist: Binding): void {
        checkHistogramArguments(keys, count, bins, hist);
        this.recordZero(pass, hist, bins);
        this.dispatches = 1;
        if (count === 0) {
            return;
        }
        const params = this.scope.params(HIST_PARAMS, { count, bins, pad0: 0, pad1: 0 });
        const bound = this.histogram.bind({ keys, hist, P: params.binding });
        this.histogram.dispatch(pass, bound, plan1d(count, this.scope.workgroupSize, this.scope.caps), [params.offset]);
        this.dispatches = 2;
    }

    /**
     * Records a `fill` of `words` zeros into `dst` (PD-12: a dispatch inside the pass, never an encoder clear).
     * @param pass - the compute pass
     * @param dst - the words to zero
     * @param words - how many (>= 1)
     */
    recordZero(pass: GPUComputePassEncoder, dst: Binding, words: number): void {
        const params = this.scope.params(FILL_PARAMS, { count: words, value: 0, mode: 0, pad0: 0 });
        const bound = this.fill.bind({ dst, P: params.binding });
        this.fill.dispatch(pass, bound, plan1d(words, this.scope.workgroupSize, this.scope.caps), [params.offset]);
    }
}

/** The planner: the histogram planner, the scan planner and the scatter kernel over one scope. */
class CountingSortPlannerImpl implements CountingSortPlanner {
    private readonly scope: ReduceScope;
    private readonly histogram: HistogramPlannerImpl;
    private readonly scan: ScanPlanner;
    private readonly scatter: Kernel;
    private dispatches = 0;

    /**
     * Wraps the resolved planners and kernel; use prepareCountingSort().
     * @param scope - the caller's scope
     * @param histogram - the histogram planner (also the zeroing of the cursor)
     * @param scan - the scan planner
     * @param scatter - the `counting-scatter` kernel
     */
    constructor(scope: ReduceScope, histogram: HistogramPlannerImpl, scan: ScanPlanner, scatter: Kernel) {
        this.scope = scope;
        this.histogram = histogram;
        this.scan = scan;
        this.scatter = scatter;
    }

    /**
     * Dispatches the last record() issued.
     * @returns the count
     */
    get lastDispatches(): number {
        return this.dispatches;
    }

    /**
     * Records the four stages (see the interface).
     * @param pass - the compute pass
     * @param keys - the keys
     * @param count - the key count
     * @param bins - the bin count
     * @param scratch - the histogram and cursor
     * @param outIndex - the sorted indices
     * @param outStart - the bin starts
     */
    record(
        pass: GPUComputePassEncoder,
        keys: Binding,
        count: number,
        bins: number,
        scratch: CountingSortScratch,
        outIndex: Binding,
        outStart: Binding,
    ): void {
        checkHistogramArguments(keys, count, bins, scratch.hist);
        checkWords("cursor", scratch.cursor, bins);
        checkWords("outIndex", outIndex, count);
        checkWords("outStart", outStart, bins);
        this.histogram.record(pass, keys, count, bins, scratch.hist);
        this.scan.record(pass, scratch.hist, bins, outStart);
        this.histogram.recordZero(pass, scratch.cursor, bins);
        this.dispatches = this.histogram.lastDispatches + this.scan.lastDispatches + 1;
        if (count === 0) {
            return;
        }
        const params = this.scope.params(HIST_PARAMS, { count, bins, pad0: 0, pad1: 0 });
        const bound = this.scatter.bind({ keys, start: outStart, cursor: scratch.cursor, outIndex, P: params.binding });
        this.scatter.dispatch(pass, bound, plan1d(count, this.scope.workgroupSize, this.scope.caps), [params.offset]);
        this.dispatches += 1;
    }
}
