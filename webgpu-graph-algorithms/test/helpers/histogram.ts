/**
 * The histogram / counting-sort checks (spec 6 row 5; P4-T3) shared by test/primitives/histogram.test.ts and
 * test/sabotage/histogram.test.ts: seeded keys in [0, bins), one histogram or one counting sort recorded into a
 * plain encoder through testReduceScope, the outputs read back, and the bitwise reports (ratioOf(|a - b|, 0):
 * any mismatch is Infinity). The counting-sort report checks `outStart` bitwise, that `outIndex` is a permutation of
 * [0, count), and the KEY sequence `keys[outIndex[j]]` bitwise against the stable oracle's -- the index order inside
 * a bin is set-deterministic and never asserted (design 6 row 5).
 */

import { type U32 } from "@graphty/graph-format";

import { type GpuContext } from "../../src/context.js";
import { prepareCountingSort, prepareHistogram } from "../../src/primitives/histogram.js";
import { countingSortOracle, histogramOracle } from "../oracle/histogram.js";
import { bindingOf, readU32, uploadBuffer } from "./device.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";
import { testReduceScope } from "./segmented-reduce.js";

/** The seed every key input derives from (plus the count). */
export const HIST_SEED = 20260921;

/** The poison an unwritten output word keeps (never a valid index below 2^32 - 1 in these tests, never a valid count). */
const POISON = 0xdeadbeef;

/**
 * Seeded keys: `count` u32 in [0, bins) (an LCG; the state is a PRNG word, not an arc index).
 * @param count - the key count
 * @param bins - the bin count
 * @param seed - the seed
 * @returns the keys
 */
export function histKeys(count: number, bins: number, seed: number): U32 {
    const out = new Uint32Array(count);
    let x = seed >>> 0;
    for (let i = 0; i < count; i++) {
        x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
        out[i] = (x >>> 8) % bins;
    }
    return out;
}

/**
 * One histogram run: the counts and the dispatch count. The return type of runHistogram (knip: exported for the
 * signature, not imported by name).
 * @public
 */
export interface HistogramRun {
    readonly hist: U32;
    readonly dispatches: number;
}

/**
 * Uploads `keys`, histograms them once into a poisoned `hist` (so the fill is visible) and reads the counts back.
 * @param ctx - the context
 * @param keys - the keys
 * @param bins - the bin count
 * @returns the run
 */
export async function runHistogram(ctx: GpuContext, keys: U32, bins: number): Promise<HistogramRun> {
    const count = keys.length;
    const keysBuffer = uploadBuffer(ctx, count > 0 ? keys : new Uint32Array(1), "hist/keys");
    const hist = uploadBuffer(ctx, new Uint32Array(bins).fill(POISON), "hist/hist");
    const scope = testReduceScope(ctx);
    try {
        const planner = await prepareHistogram(scope);
        const encoder = ctx.device.createCommandEncoder({ label: "hist/test" });
        const pass = encoder.beginComputePass({ label: "hist/test" });
        planner.record(pass, bindingOf(keysBuffer), count, bins, bindingOf(hist));
        pass.end();
        ctx.device.queue.submit([encoder.finish()]);
        return { hist: await readU32(ctx, hist, bins), dispatches: planner.lastDispatches };
    } finally {
        scope.dispose();
        keysBuffer.destroy();
        hist.destroy();
    }
}

/**
 * One counting-sort run: the bin starts, the sorted indices and the dispatch count. The return type of
 * runCountingSort (knip: exported for the signature, not imported by name).
 * @public
 */
export interface CountingSortRun {
    readonly outStart: U32;
    readonly outIndex: U32;
    readonly dispatches: number;
}

/**
 * Uploads `keys`, sorts them once (poisoned scratch and outputs, so an unwritten slot is visible) and reads the
 * starts and the indices back.
 * @param ctx - the context
 * @param keys - the keys, each below bins
 * @param bins - the bin count
 * @returns the run
 */
export async function runCountingSort(ctx: GpuContext, keys: U32, bins: number): Promise<CountingSortRun> {
    const count = keys.length;
    const words = Math.max(count, 1);
    const keysBuffer = uploadBuffer(ctx, count > 0 ? keys : new Uint32Array(1), "csort/keys");
    const hist = uploadBuffer(ctx, new Uint32Array(bins).fill(POISON), "csort/hist");
    const cursor = uploadBuffer(ctx, new Uint32Array(bins).fill(POISON), "csort/cursor");
    const outIndex = uploadBuffer(ctx, new Uint32Array(words).fill(POISON), "csort/outIndex");
    const outStart = uploadBuffer(ctx, new Uint32Array(bins).fill(POISON), "csort/outStart");
    const scope = testReduceScope(ctx);
    try {
        const planner = await prepareCountingSort(scope);
        const encoder = ctx.device.createCommandEncoder({ label: "csort/test" });
        const pass = encoder.beginComputePass({ label: "csort/test" });
        planner.record(
            pass,
            bindingOf(keysBuffer),
            count,
            bins,
            { hist: bindingOf(hist), cursor: bindingOf(cursor) },
            bindingOf(outIndex),
            bindingOf(outStart),
        );
        pass.end();
        ctx.device.queue.submit([encoder.finish()]);
        return {
            outStart: await readU32(ctx, outStart, bins),
            outIndex: count > 0 ? await readU32(ctx, outIndex, count) : new Uint32Array(0),
            dispatches: planner.lastDispatches,
        };
    } finally {
        scope.dispose();
        keysBuffer.destroy();
        hist.destroy();
        cursor.destroy();
        outIndex.destroy();
        outStart.destroy();
    }
}

/**
 * The key sequence `keys[outIndex[j]]` a sorted index list induces: the scatter's set-deterministic output in its
 * bitwise form. An index outside [0, keys.length) yields NaN (so a bitwise check reports Infinity).
 * @param keys - the keys
 * @param outIndex - the sorted indices
 * @returns the key sequence (Float64Array so NaN can stand for an invalid index)
 */
export function keySequence(keys: U32, outIndex: U32): Float64Array<ArrayBuffer> {
    const seq = new Float64Array(outIndex.length);
    for (let j = 0; j < outIndex.length; j++) {
        const i = outIndex[j];
        seq[j] = i < keys.length ? keys[i] : NaN;
    }
    return seq;
}

/**
 * Whether `outIndex` is a permutation of [0, count).
 * @param outIndex - the indices
 * @param count - the count
 * @returns true when every index of [0, count) occurs exactly once
 */
export function isPermutation(outIndex: U32, count: number): boolean {
    if (outIndex.length !== count) {
        return false;
    }
    const seen = new Uint8Array(count);
    for (let j = 0; j < count; j++) {
        const i = outIndex[j];
        if (i >= count || seen[i] !== 0) {
            return false;
        }
        seen[i] = 1;
    }
    return true;
}

/**
 * The bitwise check of one histogram of `count` seeded keys over `bins` bins (spec 11.9 item 1: the sabotage suite
 * asserts the same report fails on a mutant).
 * @param ctx - the context
 * @param count - the key count
 * @param bins - the bin count
 * @returns the report
 */
export async function histogramReport(ctx: GpuContext, count: number, bins: number): Promise<CheckReport> {
    const keys = histKeys(count, bins, HIST_SEED + count);
    const got = await runHistogram(ctx, keys, bins);
    const want = histogramOracle(keys, bins);
    const reports: CheckReport[] = [];
    for (let k = 0; k < bins; k++) {
        reports.push({ worst: ratioOf(Math.abs(got.hist[k] - want[k]), 0), worstLabel: `hist[${k}]`, samples: 1 });
    }
    return mergeReports(reports);
}

/**
 * The check of one counting sort of `count` seeded keys over `bins` bins: `outStart` bitwise, `outIndex` a
 * permutation (Infinity at "permutation" when a duplicate or an unwritten slot exists), and the key sequence bitwise
 * against the stable oracle's.
 * @param ctx - the context
 * @param count - the key count
 * @param bins - the bin count
 * @returns the report
 */
export async function countingSortReport(ctx: GpuContext, count: number, bins: number): Promise<CheckReport> {
    const keys = histKeys(count, bins, HIST_SEED + count);
    const got = await runCountingSort(ctx, keys, bins);
    const want = countingSortOracle(keys, bins);
    const reports: CheckReport[] = [];
    for (let k = 0; k < bins; k++) {
        reports.push({
            worst: ratioOf(Math.abs(got.outStart[k] - want.outStart[k]), 0),
            worstLabel: `outStart[${k}]`,
            samples: 1,
        });
    }
    reports.push({ worst: isPermutation(got.outIndex, count) ? 0 : Infinity, worstLabel: "permutation", samples: 1 });
    const gotSeq = keySequence(keys, got.outIndex);
    const wantSeq = keySequence(keys, want.outIndex);
    for (let j = 0; j < count; j++) {
        reports.push({ worst: ratioOf(Math.abs(gotSeq[j] - wantSeq[j]), 0), worstLabel: `keySeq[${j}]`, samples: 1 });
    }
    return mergeReports(reports);
}
