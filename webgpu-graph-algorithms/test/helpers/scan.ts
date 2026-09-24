/**
 * The exclusiveScan check (spec 6 row 2; P4-T2) shared by test/primitives/scan.test.ts and
 * test/sabotage/scan.test.ts: a seeded u32 input in [0, 2^16) (so a 2^20-word total wraps past 2^32), one scan
 * recorded into a plain encoder through testReduceScope, the exclusive output and the returned total word read back,
 * and the bitwise report against scanOracle (ratioOf(|a - b|, 0) per word: any mismatch is Infinity).
 */

import { type U32 } from "@graphty/graph-format";

import { type GpuContext } from "../../src/context.js";
import { prepareScan, type ScanPlanner, type ScanTotal } from "../../src/primitives/scan.js";
import { scanOracle } from "../oracle/scan.js";
import { bindingOf, readU32, uploadBuffer } from "./device.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";
import { testReduceScope } from "./segmented-reduce.js";

/** The seed every scan input derives from (plus the count). */
export const SCAN_SEED = 20260920;

/**
 * A seeded input of `count` u32 words in [0, 2^16) (an LCG; the state is a PRNG word, not an arc index).
 * @param count - the word count
 * @param seed - the seed
 * @returns the words
 */
export function scanInput(count: number, seed: number): U32 {
    const out = new Uint32Array(count);
    let x = seed >>> 0;
    for (let i = 0; i < count; i++) {
        x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
        out[i] = x % 65536;
    }
    return out;
}

/**
 * One scan run: the exclusive output, the total word and the dispatch count. The return type of runScan (knip:
 * exported for the signature, not imported by name).
 * @public
 */
export interface ScanRun {
    readonly out: U32;
    readonly total: number;
    readonly dispatches: number;
}

/**
 * Uploads `values`, scans them once into a poisoned out buffer (0xdeadbeef in every word, so an unwritten word is
 * visible) and reads the output and the total word back.
 * @param ctx - the context
 * @param values - the input words
 * @returns the run
 */
export async function runScan(ctx: GpuContext, values: U32): Promise<ScanRun> {
    const count = values.length;
    const words = Math.max(count, 1);
    const src = uploadBuffer(ctx, count > 0 ? values : new Uint32Array(1), "scan/src");
    const out = uploadBuffer(ctx, new Uint32Array(words).fill(0xdeadbeef), "scan/out");
    const scope = testReduceScope(ctx);
    try {
        const planner: ScanPlanner = await prepareScan(scope);
        const encoder = ctx.device.createCommandEncoder({ label: "scan/test" });
        const pass = encoder.beginComputePass({ label: "scan/test" });
        const total: ScanTotal = planner.record(pass, bindingOf(src), count, bindingOf(out));
        pass.end();
        ctx.device.queue.submit([encoder.finish()]);
        const result = count > 0 ? await readU32(ctx, out, count) : new Uint32Array(0);
        const totalWord = await readU32(ctx, total.binding.buffer, 1, total.binding.offset + 4 * total.index);
        return { out: result, total: totalWord[0], dispatches: planner.lastDispatches };
    } finally {
        scope.dispose();
        src.destroy();
        out.destroy();
    }
}

/**
 * The bitwise check of one scan of `count` seeded words (spec 11.9 item 1: the sabotage suite asserts the same report
 * fails on a mutant): ratioOf(|a - b|, 0) per output word and for the total.
 * @param ctx - the context
 * @param count - the word count
 * @returns the report
 */
export async function scanReport(ctx: GpuContext, count: number): Promise<CheckReport> {
    const values = scanInput(count, SCAN_SEED + count);
    const got = await runScan(ctx, values);
    const want = scanOracle(values);
    const reports: CheckReport[] = [];
    for (let i = 0; i < count; i++) {
        reports.push({ worst: ratioOf(Math.abs(got.out[i] - want.out[i]), 0), worstLabel: `out[${i}]`, samples: 1 });
    }
    reports.push({ worst: ratioOf(Math.abs(got.total - want.total), 0), worstLabel: "total", samples: 1 });
    return mergeReports(reports);
}
