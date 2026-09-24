/**
 * The `radixSort` primitive driver (spec 6 row 6; P4-T4, PD-5): a STABLE LSD key-value sort of u32 words, 8 bits per
 * pass, `bits / 8` passes. Every pass runs `radix-hist` (one 256-bin digit histogram per WG-wide block, stored
 * DIGIT-MAJOR `hist[digit * groups + group]`), `exclusiveScan` over that table (so each word becomes, per digit, the
 * offset of its workgroup in workgroup order) and `radix-scatter` (lane 0 ranks its block's keys serially in index
 * order, every lane writes its pair at `offsets[digit * groups + group] + rank`). The pairs swap after every pass, so an
 * odd pass count (bits 8 / 24) leaves the result in the caller's scratch pair and an even one (16 / 32) in the input
 * pair; record() RETURNS the pair so no caller guesses. u32 arithmetic and a serial ranking make two runs on any two
 * adapters bitwise identical.
 *
 * The scan cannot run in place: `Kernel.bind` (and WebGPU's usage-scope rule) rejects one buffer bound `storage-ro`
 * and `storage` in one dispatch, so the caller supplies TWO tables of `radixHistBytes`: `scratch.hist` (the raw
 * digit-major table `radix-hist` writes; the LAST pass's table stays there) and `scratch.offsets` (its exclusive
 * scan, what `radix-scatter` reads). Both are the caller's so a per-iteration sort (the grid, PD-11) binds the same
 * buffers every iteration and `Kernel.bind`'s identity cache holds.
 *
 * The driver owns no device objects and acquires no scratch of its own: the caller supplies a ReduceScope (the
 * record `reduce` and `exclusiveScan` take; the scan's block sums come from it) and the compute pass to record
 * into. `src/primitives/**` never imports `src/context.ts`.
 */

import { RADIX_BINS, U32_MAX } from "../constants.js";
import { WebGpuGraphError } from "../errors.js";
import { plan1d } from "../kernel/dispatch.js";
import { type Kernel } from "../kernel/kernel.js";
import { kernelSpec, RADIX_PARAMS } from "../kernels.js";
import { type Binding } from "../types/memory.js";
import { type ReduceScope } from "./reduce.js";
import { prepareScan, type ScanPlanner } from "./scan.js";

/** The bits of one pass. */
const RADIX_DIGIT_BITS = 8;

/** The key widths record() accepts: `bits / 8` passes, so the low `bits` of every key order the pairs. */
export type RadixBits = 8 | 16 | 24 | 32;

/**
 * The caller's scratch: a second key-value pair the passes ping-pong with, the digit-major histogram table and its
 * scanned twin (each `radixHistBytes` bytes at least).
 */
export interface RadixSortScratch {
    readonly keys: Binding;
    readonly vals: Binding;
    /** The raw digit-major table `radix-hist` writes (the last pass's stays readable after the sort). */
    readonly hist: Binding;
    /** The exclusive scan of `hist`, what `radix-scatter` reads. */
    readonly offsets: Binding;
}

/** Where the sorted pairs landed: the input pair or the scratch pair (record() decides by the pass count). */
export interface RadixSortResult {
    readonly keys: Binding;
    readonly vals: Binding;
}

/** A prepared radix sort (spec 6 row 6): records the pass dispatches of one sort into a pass. */
export interface RadixSortPlanner {
    /**
     * Records the stable sort of `count` (key, value) pairs by the low `bits` of the key; returns the pair holding the
     * result (the scratch pair after an odd pass count, the input pair after an even one); count 0 records nothing and
     * returns the input pair.
     * @param pass - the compute pass
     * @param keys - the keys (at least 4 x count bytes)
     * @param vals - the values (at least 4 x count bytes)
     * @param count - the pair count (a non-negative integer below 2^32)
     * @param bits - the key width: 8, 16, 24 or 32
     * @param scratch - the second pair, the histogram table and its scanned twin
     * @returns the pair the result lives in
     */
    record(
        pass: GPUComputePassEncoder,
        keys: Binding,
        vals: Binding,
        count: number,
        bits: RadixBits,
        scratch: RadixSortScratch,
    ): RadixSortResult;
    /** Dispatches the last record() issued: 0 for count 0, else `passes x (2 + the scan's dispatches over the table)`. */
    readonly lastDispatches: number;
}

/**
 * The byte size of the digit-major histogram table of one pass over `count` keys at workgroup size `wg`:
 * `4 x 256 x ceil(count / wg)` (the caller sizes `scratch.hist` by it; 0 for count 0, which records nothing).
 * @param count - the pair count
 * @param wg - the workgroup size (`scope.workgroupSize`)
 * @returns the bytes
 */
export function radixHistBytes(count: number, wg: number): number {
    return 4 * RADIX_BINS * Math.ceil(count / wg);
}

/**
 * Prepares the two radix pipelines and the scan of a scope (compiles once) so record() is synchronous. The planner
 * lives exactly as long as the scope: never use a planner after its scope's dispose().
 * @param scope - the caller's scope (device, caps, cache, scratch, params)
 * @returns the planner
 */
export async function prepareRadixSort(scope: ReduceScope): Promise<RadixSortPlanner> {
    const hist = await scope.pipelines.kernel(kernelSpec("radix-hist"));
    const scatter = await scope.pipelines.kernel(kernelSpec("radix-scatter"));
    const scan = await prepareScan(scope);
    return new RadixSortPlannerImpl(scope, hist, scatter, scan);
}

/**
 * One binding-size check of record().
 * @param argument - the argument name
 * @param binding - the binding
 * @param bytes - the bytes it must hold
 */
function checkBinding(argument: string, binding: Binding, bytes: number): void {
    if (binding.size < bytes) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `radixSort: ${argument} is smaller than ${bytes} bytes`, {
            argument,
            value: binding.size,
            expected: bytes,
        });
    }
}

/**
 * The argument checks of record() (E_INVALID_ARGUMENT before anything is recorded).
 * @param keys - the keys
 * @param vals - the values
 * @param count - the pair count
 * @param bits - the key width
 * @param scratch - the scratch
 * @param wg - the workgroup size
 */
function checkRecordArguments(
    keys: Binding,
    vals: Binding,
    count: number,
    bits: RadixBits,
    scratch: RadixSortScratch,
    wg: number,
): void {
    if (bits !== 8 && bits !== 16 && bits !== 24 && bits !== 32) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", "radixSort: bits must be 8, 16, 24 or 32", {
            argument: "bits",
            value: bits,
            expected: [8, 16, 24, 32],
        });
    }
    if (!Number.isSafeInteger(count) || count < 0 || count > U32_MAX) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", "radixSort: count must be a non-negative integer below 2^32", {
            argument: "count",
            value: count,
        });
    }
    const pairBytes = 4 * count;
    checkBinding("keys", keys, pairBytes);
    checkBinding("vals", vals, pairBytes);
    checkBinding("scratch.keys", scratch.keys, pairBytes);
    checkBinding("scratch.vals", scratch.vals, pairBytes);
    const tableBytes = radixHistBytes(count, wg);
    checkBinding("scratch.hist", scratch.hist, tableBytes);
    checkBinding("scratch.offsets", scratch.offsets, tableBytes);
}

/** The planner: the two resolved kernels and the scan over one scope. */
class RadixSortPlannerImpl implements RadixSortPlanner {
    private readonly scope: ReduceScope;
    private readonly hist: Kernel;
    private readonly scatter: Kernel;
    private readonly scan: ScanPlanner;
    private dispatches = 0;

    /**
     * Wraps the resolved kernels; use prepareRadixSort().
     * @param scope - the caller's scope
     * @param hist - the `radix-hist` kernel
     * @param scatter - the `radix-scatter` kernel
     * @param scan - the scan planner of the same scope
     */
    constructor(scope: ReduceScope, hist: Kernel, scatter: Kernel, scan: ScanPlanner) {
        this.scope = scope;
        this.hist = hist;
        this.scatter = scatter;
        this.scan = scan;
    }

    /**
     * Dispatches the last record() issued.
     * @returns the count
     */
    get lastDispatches(): number {
        return this.dispatches;
    }

    /**
     * Records the passes into the pass (see the interface).
     * @param pass - the compute pass
     * @param keys - the keys
     * @param vals - the values
     * @param count - the pair count
     * @param bits - the key width
     * @param scratch - the second pair, the histogram table and its scanned twin
     * @returns the pair the result lives in
     */
    record(
        pass: GPUComputePassEncoder,
        keys: Binding,
        vals: Binding,
        count: number,
        bits: RadixBits,
        scratch: RadixSortScratch,
    ): RadixSortResult {
        const wg = this.scope.workgroupSize;
        checkRecordArguments(keys, vals, count, bits, scratch, wg);
        if (count === 0) {
            this.dispatches = 0;
            return { keys, vals };
        }
        const groups = Math.ceil(count / wg);
        const plan = plan1d(count, wg, this.scope.caps);
        const tableWords = RADIX_BINS * groups;
        const tableBytes = 4 * tableWords;
        const histTable: Binding = { ...scratch.hist, size: tableBytes };
        const offsets: Binding = { ...scratch.offsets, size: tableBytes };
        let src: RadixSortResult = { keys, vals };
        let dst: RadixSortResult = { keys: scratch.keys, vals: scratch.vals };
        let dispatches = 0;
        const passes = bits / RADIX_DIGIT_BITS;
        for (let p = 0; p < passes; p++) {
            const params = this.scope.params(RADIX_PARAMS, { count, shift: RADIX_DIGIT_BITS * p, groups, pad0: 0 });
            const histBound = this.hist.bind({ keys: src.keys, hist: histTable, P: params.binding });
            this.hist.dispatch(pass, histBound, plan, [params.offset]);
            this.scan.record(pass, histTable, tableWords, offsets);
            const scatterBound = this.scatter.bind({
                keys: src.keys,
                vals: src.vals,
                offsets,
                keysOut: dst.keys,
                valsOut: dst.vals,
                P: params.binding,
            });
            this.scatter.dispatch(pass, scatterBound, plan, [params.offset]);
            dispatches += 2 + this.scan.lastDispatches;
            [src, dst] = [dst, src];
        }
        this.dispatches = dispatches;
        return src;
    }
}
