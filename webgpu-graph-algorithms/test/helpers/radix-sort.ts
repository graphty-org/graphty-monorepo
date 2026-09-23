/**
 * The radixSort check (spec 6 row 6; P4-T4) shared by test/primitives/radix-sort.test.ts and
 * test/sabotage/radix-sort.test.ts: seeded random u32 keys with `vals = index`, one sort recorded into a plain
 * encoder through testReduceScope with a poisoned scratch pair and tables (0xdeadbeef in every word, so an unwritten
 * word is visible), the returned pair read back, and the bitwise report against radixSortOracle (ratioOf(|a - b|, 0)
 * per word of keys AND vals: any mismatch is Infinity; the vals are what make stability visible).
 */

import { type U32 } from "@graphty/graph-format";

import { type GpuContext } from "../../src/context.js";
import {
    prepareRadixSort,
    type RadixBits,
    radixHistBytes,
    type RadixSortPlanner,
    type RadixSortResult,
    type RadixSortScratch,
} from "../../src/primitives/radix-sort.js";
import { radixSortOracle } from "../oracle/radix-sort.js";
import { bindingOf, readU32, uploadBuffer } from "./device.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";
import { testReduceScope } from "./segmented-reduce.js";

/** The seed every radix input derives from (plus the count). */
export const RADIX_SEED = 20260920;

/** The poison every scratch word starts with. */
const POISON = 0xdeadbeef;

/**
 * A seeded input of `count` random u32 keys over the whole 32-bit range (an LCG; the state is a PRNG word, not an
 * arc index).
 * @param count - the key count
 * @param seed - the seed
 * @returns the keys
 */
export function radixKeys(count: number, seed: number): U32 {
    const out = new Uint32Array(count);
    let x = seed >>> 0;
    for (let i = 0; i < count; i++) {
        x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
        out[i] = x;
    }
    return out;
}

/**
 * The identity permutation of `count` words.
 * @param count - the word count
 * @returns `[0, 1, .., count - 1]`
 */
export function identityVals(count: number): U32 {
    const out = new Uint32Array(count);
    for (let i = 0; i < count; i++) {
        out[i] = i;
    }
    return out;
}

/**
 * One sort run: the sorted pair, which pair it came back in, the raw (unscanned) histogram table of the last pass
 * and the dispatch count. The return type of runRadixSort (knip: exported for the signature, not imported by name).
 * @public
 */
export interface RadixRun {
    readonly keys: U32;
    readonly vals: U32;
    /** "scratch" when the result pair is the scratch pair, "input" when it is the input pair. */
    readonly resultPair: "input" | "scratch";
    /** `scratch.hist` read back after the sort: the raw digit-major table of the LAST pass, before its scan (radixHistBytes / 4 words). */
    readonly histTable: U32;
    readonly dispatches: number;
}

/**
 * Uploads the pairs, sorts them once with a poisoned scratch pair and tables and reads the returned pair back.
 * @param ctx - the context
 * @param keys - the keys
 * @param vals - the values (the same length)
 * @param bits - the key width
 * @returns the run
 */
export async function runRadixSort(ctx: GpuContext, keys: U32, vals: U32, bits: RadixBits): Promise<RadixRun> {
    const count = keys.length;
    const words = Math.max(count, 1);
    const histWords = Math.max(radixHistBytes(count, ctx.workgroupSize) / 4, 1);
    const keysBuf = uploadBuffer(ctx, count > 0 ? keys : new Uint32Array(1), "radix/keys");
    const valsBuf = uploadBuffer(ctx, count > 0 ? vals : new Uint32Array(1), "radix/vals");
    const sKeys = uploadBuffer(ctx, new Uint32Array(words).fill(POISON), "radix/scratch-keys");
    const sVals = uploadBuffer(ctx, new Uint32Array(words).fill(POISON), "radix/scratch-vals");
    const sHist = uploadBuffer(ctx, new Uint32Array(histWords).fill(POISON), "radix/scratch-hist");
    const sOffsets = uploadBuffer(ctx, new Uint32Array(histWords).fill(POISON), "radix/scratch-offsets");
    const scope = testReduceScope(ctx);
    try {
        const planner: RadixSortPlanner = await prepareRadixSort(scope);
        const encoder = ctx.device.createCommandEncoder({ label: "radix/test" });
        const pass = encoder.beginComputePass({ label: "radix/test" });
        const scratch: RadixSortScratch = {
            keys: bindingOf(sKeys),
            vals: bindingOf(sVals),
            hist: bindingOf(sHist),
            offsets: bindingOf(sOffsets),
        };
        const result: RadixSortResult = planner.record(
            pass,
            bindingOf(keysBuf),
            bindingOf(valsBuf),
            count,
            bits,
            scratch,
        );
        pass.end();
        ctx.device.queue.submit([encoder.finish()]);
        const resultPair = result.keys.buffer === sKeys ? "scratch" : "input";
        const outKeys = count > 0 ? await readU32(ctx, result.keys.buffer, count) : new Uint32Array(0);
        const outVals = count > 0 ? await readU32(ctx, result.vals.buffer, count) : new Uint32Array(0);
        const histTable = count > 0 ? await readU32(ctx, sHist, histWords) : new Uint32Array(0);
        return { keys: outKeys, vals: outVals, resultPair, histTable, dispatches: planner.lastDispatches };
    } finally {
        scope.dispose();
        keysBuf.destroy();
        valsBuf.destroy();
        sKeys.destroy();
        sVals.destroy();
        sHist.destroy();
        sOffsets.destroy();
    }
}

/**
 * The bitwise report of a sorted pair against the oracle: ratioOf(|a - b|, 0) per word of keys and vals.
 * @param got - the GPU pair
 * @param want - the oracle pair
 * @returns the report
 */
function radixCompare(
    got: { readonly keys: U32; readonly vals: U32 },
    want: { readonly keys: U32; readonly vals: U32 },
): CheckReport {
    const reports: CheckReport[] = [];
    for (let i = 0; i < want.keys.length; i++) {
        reports.push({ worst: ratioOf(Math.abs(got.keys[i] - want.keys[i]), 0), worstLabel: `keys[${i}]`, samples: 1 });
        reports.push({ worst: ratioOf(Math.abs(got.vals[i] - want.vals[i]), 0), worstLabel: `vals[${i}]`, samples: 1 });
    }
    if (got.keys.length !== want.keys.length || got.vals.length !== want.vals.length) {
        reports.push({ worst: Infinity, worstLabel: "length", samples: 1 });
    }
    return mergeReports(reports);
}

/**
 * The bitwise check of one sort of `count` seeded random keys with `vals = index` at `bits` (spec 11.9 item 1: the
 * sabotage suite asserts the same report fails on a mutant).
 * @param ctx - the context
 * @param count - the pair count
 * @param bits - the key width
 * @returns the report
 */
export async function radixReport(ctx: GpuContext, count: number, bits: RadixBits): Promise<CheckReport> {
    const keys = radixKeys(count, RADIX_SEED + count);
    const vals = identityVals(count);
    const got = await runRadixSort(ctx, keys, vals, bits);
    return radixCompare(got, radixSortOracle(keys, vals, bits));
}
