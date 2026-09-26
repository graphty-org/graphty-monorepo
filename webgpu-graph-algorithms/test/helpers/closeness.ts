/**
 * The closeness checks (design 8.4, 9.7; P8-T11, the P8 plan's PD-13 / PD-25 / DEP-P8-F) shared by
 * test/algorithms/closeness.test.ts and test/sabotage/closeness.test.ts: the run that collects every batch's
 * `perSource` block (`newCount`, `reached`, `sumLo`, `sumHi` per source) through the driver's inspect seam into
 * per-node arrays, the funnel fixture whose middle layer reaches one vertex from many frontier entries at once (the
 * only shape on which a claim counted without its `atomicOr` result is caught deterministically: the lanes of one
 * SIMD group load the visited word together, so the mutant counts the vertex once per lane), the one-workgroup
 * `closeness-reduce` run that proves the 64-bit accumulation with no graph at all (no runnable fixture's per-source
 * sum crosses 2^32, so the carry is seeded by hand: `newCount[0] = 65537` at distance `65536`, `sumLo[0] =
 * 0xFFFFF000`), and the report the sabotage suite measures, bitwise (ratioOf(|a - b|, 0): any mismatch is
 * Infinity): the exact `reached` and 64-bit `sum` of every source of karate, the 70-node path (three batches, one
 * partial) and the funnel against the oracle, the f32 scores, every `newCount` word zero after its batch, and the
 * hand-seeded reduce's five words. A driver refusal is the maximal miss.
 */

import { type GraphSnapshot, type U32 } from "@graphty/graph-format";

import {
    type ClosenessTuning,
    closenessWithTuning,
    PER_SOURCE_WORDS,
    SOURCES_PER_BATCH,
} from "../../src/algorithms/closeness.js";
import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { CommandBatch } from "../../src/kernel/batch.js";
import { plan1d } from "../../src/kernel/dispatch.js";
import { UniformRing } from "../../src/kernel/uniform-ring.js";
import { FRONTIER_COUNTERS, FRONTIER_PARAMS, kernelSpec } from "../../src/kernels.js";
import { W } from "../../src/primitives/frontier.js";
import { type HitsOptionsLike } from "../../src/types/accelerator.js";
import { type GpuScoresResult } from "../../src/types/algorithms.js";
import { type GpuRunOptions } from "../../src/types/run.js";
import { closenessOracle } from "../oracle/traversal.js";
import { bindingOf, readU32, scratchBuffer, uploadBuffer } from "./device.js";
import { bitwiseReports } from "./frontier.js";
import { type EdgeSpec, KARATE_EDGES, pathEdges, snapshotOf } from "./graphs.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";

/** The words of one `perSource` block, by region: `newCount` @0, `reached` @32, `sumLo` @64, `sumHi` @96. */
const REGION = Object.freeze({
    newCount: 0,
    reached: SOURCES_PER_BATCH,
    sumLo: 2 * SOURCES_PER_BATCH,
    sumHi: 3 * SOURCES_PER_BATCH,
});

/** One run of the bit-parallel route with every batch's block folded into per-node arrays. */
export interface SweepRun {
    readonly result: GpuScoresResult;
    /** `reached[v]`: the nodes source `v` reached (its own `perSource.reached` word). */
    readonly reached: U32;
    /** `sum[v]`: the exact 64-bit sum of the distances from `v` (`sumHi x 2^32 + sumLo`, exact below 2^53). */
    readonly sum: Float64Array;
    /** `newCount[v]`: the per-level claim counter as the batch left it (0 after the last level's boundary). */
    readonly newCount: U32;
    /** The raw 128-word blocks by batch, in batch order (the run-twice comparison's subject). */
    readonly blocks: readonly U32[];
}

/**
 * The bit-parallel route through the inspect seam: the scores plus every batch's `perSource` block.
 * @param ctx - the context
 * @param s - the snapshot
 * @param options - the run's options
 * @param tuning - the run's tuning (`onBatch` is this helper's)
 * @returns the run
 */
export async function runSweep(
    ctx: GpuContext,
    s: GraphSnapshot,
    options?: HitsOptionsLike & GpuRunOptions,
    tuning?: Omit<ClosenessTuning, "onBatch">,
): Promise<SweepRun> {
    const n = s.nodeCount;
    const reached = new Uint32Array(n);
    const sum = new Float64Array(n);
    const newCount = new Uint32Array(n);
    const blocks: U32[] = [];
    const result = await closenessWithTuning(ctx, s, options, {
        ...tuning,
        onBatch: (batchStart, block) => {
            blocks.push(block);
            const k = Math.min(SOURCES_PER_BATCH, n - batchStart);
            for (let i = 0; i < k; i++) {
                newCount[batchStart + i] = block[REGION.newCount + i];
                reached[batchStart + i] = block[REGION.reached + i];
                sum[batchStart + i] = block[REGION.sumHi + i] * 2 ** 32 + block[REGION.sumLo + i];
            }
        },
    });
    return { result, reached, sum, newCount, blocks };
}

/**
 * The funnel: `0 -- i` and `i -- k + 1` for `i` in 1..k (undirected, `k + 2` nodes). From source 0 the level-1
 * frontier is the whole middle layer and every one of its `k` rows reaches `k + 1`: the arcs `(i, k + 1)` sit at
 * every other strip position of one workgroup, so the lanes of one SIMD group claim `k + 1` for source 0 together.
 * @param k - the middle layer's size
 * @returns the edges
 */
function funnelEdges(k: number): EdgeSpec[] {
    const edges: EdgeSpec[] = [];
    for (let i = 1; i <= k; i++) {
        edges.push([0, i]);
    }
    for (let i = 1; i <= k; i++) {
        edges.push([i, k + 1]);
    }
    return edges;
}

/**
 * One run's per-source words and scores against the oracle, every sample bitwise (the scores as f32 of the oracle's
 * f64, which is what the driver stores).
 * @param label - the scenario
 * @param run - the run
 * @param want - the oracle's answer
 * @returns the reports
 */
function sweepReports(label: string, run: SweepRun, want: ReturnType<typeof closenessOracle>): CheckReport[] {
    return [
        ...bitwiseReports(`${label}.reached`, run.reached, want.reached),
        ...bitwiseReports(`${label}.sum`, run.sum, want.sum),
        ...bitwiseReports(`${label}.scores`, run.result.scores, Float32Array.from(want.scores)),
        ...bitwiseReports(`${label}.newCount`, run.newCount, new Uint32Array(run.newCount.length)),
    ];
}

/** The words the hand-seeded `closeness-reduce` run uploads: `counters[0] = 1` (not done) and the level, `newCount[0]`, `sumLo[0]`, `sumHi[0]`. */
export const REDUCE_SEED: Readonly<{ level: number; newCount: number; sumLo: number; sumHi: number }> = Object.freeze({
    level: 0xffff,
    newCount: 0x10001,
    sumLo: 0xfffff000,
    sumHi: 0,
});

/** What role 0 must leave: `65537 x 65536 = 0x1_0001_0000` added to `0xFFFFF000` with the carry (`8589996032n`), `reached[0] = 65537`, `newCount[0] = 0`, the level word `0x10000`, `done = 0`. */
export const REDUCE_EXPECTED: Readonly<{ sum: bigint; sumLo: number; sumHi: number; reached: number; level: number }> =
    Object.freeze({ sum: 8589996032n, sumLo: 0xf000, sumHi: 2, reached: 0x10001, level: 0x10000 });

/**
 * The one-workgroup `closeness-reduce` run in role 0 over hand-uploaded `counters` and `perSource` (`bits` a scratch
 * the role never reads): the words as the kernel left them, read back by name.
 * @param ctx - the context
 * @returns the 128 `perSource` words and the 24 counters words
 */
export async function runReduceOneWorkgroup(
    ctx: GpuContext,
): Promise<{ readonly perSource: U32; readonly counters: U32 }> {
    const countersIn = new Uint32Array(FRONTIER_COUNTERS.byteLength / 4);
    countersIn[W.frontierCount] = 1;
    countersIn[W.level] = REDUCE_SEED.level;
    const perSourceIn = new Uint32Array(PER_SOURCE_WORDS);
    perSourceIn[REGION.newCount] = REDUCE_SEED.newCount;
    perSourceIn[REGION.sumLo] = REDUCE_SEED.sumLo;
    perSourceIn[REGION.sumHi] = REDUCE_SEED.sumHi;
    const counters = uploadBuffer(ctx, countersIn, "closeness-reduce/counters");
    const perSource = uploadBuffer(ctx, perSourceIn, "closeness-reduce/per-source");
    const bits = scratchBuffer(ctx, 256, "closeness-reduce/bits");
    const ring = new UniformRing(ctx.device, ctx.allocator, 1, "closeness-reduce/ring");
    try {
        const wg = ctx.workgroupSize;
        const kernel = await ctx.pipelines.kernel(kernelSpec("closeness-reduce"));
        ring.write(0, FRONTIER_PARAMS, { role: 0, n: 1, bitsBase: 64 });
        const bound = kernel.bind({
            counters: bindingOf(counters),
            perSource: bindingOf(perSource),
            bits: bindingOf(bits),
            P: ring.binding(FRONTIER_PARAMS),
        });
        const batch = new CommandBatch(ctx, "closeness-reduce");
        kernel.dispatch(batch.pass("reduce"), bound, plan1d(wg, wg, ctx.caps), [ring.offsetOf(0)]);
        ring.flush();
        await batch.submit().readback;
        return {
            perSource: await readU32(ctx, perSource, PER_SOURCE_WORDS),
            counters: await readU32(ctx, counters, FRONTIER_COUNTERS.byteLength / 4),
        };
    } finally {
        ring.destroy();
        counters.destroy();
        perSource.destroy();
        bits.destroy();
    }
}

/**
 * The hand-seeded reduce as report rows: the 64-bit sum (BigInt), its two words, `reached[0]`, `newCount[0]`, the
 * level word, `done`, and every other source's four words still zero.
 * @param ctx - the context
 * @returns the reports
 */
async function reduceReports(ctx: GpuContext): Promise<CheckReport[]> {
    const { perSource, counters } = await runReduceOneWorkgroup(ctx);
    const sum = (BigInt(perSource[REGION.sumHi]) << 32n) | BigInt(perSource[REGION.sumLo]);
    const row = (label: string, ok: boolean): CheckReport => ({
        worst: ratioOf(ok ? 0 : 1, 0),
        worstLabel: `reduce.${label}`,
        samples: 1,
    });
    const others = new Uint32Array(PER_SOURCE_WORDS);
    others[REGION.reached] = REDUCE_EXPECTED.reached;
    others[REGION.sumLo] = REDUCE_EXPECTED.sumLo;
    others[REGION.sumHi] = REDUCE_EXPECTED.sumHi;
    return [
        row("sum64", sum === REDUCE_EXPECTED.sum),
        row("reached", perSource[REGION.reached] === REDUCE_EXPECTED.reached),
        row("newCount", perSource[REGION.newCount] === 0),
        row("level", counters[W.level] === REDUCE_EXPECTED.level),
        row("done", counters[W.done] === 0),
        ...bitwiseReports("reduce.perSource", perSource, others),
    ];
}

/**
 * The sabotage check of the two closeness kernels (spec 11.9 item 1): karate (two batches), the 70-node path (three
 * batches, one partial; long distances) and the 200-funnel (the concurrent claims of one vertex), every per-source
 * word and score bitwise against the oracle, plus the hand-seeded reduce (the 64-bit carry, which no graph reaches).
 * @param ctx - the context
 * @returns the report
 */
export async function closenessReport(ctx: GpuContext): Promise<CheckReport> {
    const reports: CheckReport[] = [];
    const fixtures: readonly { readonly label: string; readonly edges: readonly EdgeSpec[] }[] = [
        { label: "karate", edges: KARATE_EDGES },
        { label: "path70", edges: pathEdges(70) },
        { label: "funnel200", edges: funnelEdges(200) },
    ];
    for (const { label, edges } of fixtures) {
        const s = snapshotOf(edges, { label: `closeness-report-${label}` });
        try {
            const run = await runSweep(ctx, s);
            reports.push(...sweepReports(label, run, closenessOracle(s, false)));
        } catch (err) {
            if (isWebGpuGraphError(err) && err.code === "E_VALIDATION") {
                reports.push({ worst: Infinity, worstLabel: `${label}.scores (${err.message})`, samples: 1 });
            } else {
                throw err;
            }
        } finally {
            ctx.release(s);
        }
    }
    reports.push(...(await reduceReports(ctx)));
    return mergeReports(reports);
}
