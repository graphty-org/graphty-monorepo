/**
 * Closeness centrality (design 8.4, 3.3 line 810, 9.7, 11.3; P8-T11, the P8 plan's PD-13 / PD-19 / PD-25 / DEP-P8-F)
 * against `closenessOracle`, the legacy `closenessCentrality` of `@graphty/algorithms` called with no options (the
 * parity target: the legacy `1 / sumOfDistances`, `0` when nothing is reached, no reached factor and no
 * Wasserman-Faust scaling), and the closed forms of the path and the star -- every readback naming its buffer: the
 * `perSource` block of every batch (the exact integer `reached` and 64-bit `sum` per source, read through the inspect
 * seam) and the `scores` the driver folds from it. The path and the star analytically, karate against the oracle AND
 * the legacy function, a disconnected graph (an unreached node adds nothing, an isolated node scores 0), a 70-node
 * graph (three batches, one partial), the weighted karate under `weighted: true` (one `sssp` per source: within the
 * derived SSSP tolerance of the f64 Dijkstra sums, bitwise the f32 oracle) and under `weighted: false` (the column
 * ignored: bitwise the unweighted karate), `maxIterations` / `tolerance` refused before any device work while
 * `undefined` passes, the hand-seeded `closeness-reduce` role 0 proving the 64-bit accumulation, cadence 1 bitwise
 * the default cadence (the region parity survives a submit boundary), one `mapAsync` per submit, and the edge cases
 * (the empty graph, one node, `dest`, a negative weight). Run-twice bitwise on `perSource` and `scores` everywhere.
 */

import { closenessCentrality as legacyClosenessCentrality, Graph } from "@graphty/algorithms";
import { type GraphSnapshot } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import { closenessCentrality, closenessWithTuning, SOURCES_PER_BATCH } from "../../src/algorithms/closeness.js";
import { GpuContext } from "../../src/context.js";
import { type WebGpuGraphError } from "../../src/errors.js";
import { verifyDevice } from "../../src/primitives/verify.js";
import { type HitsOptionsLike } from "../../src/types/accelerator.js";
import { type GpuRunOptions } from "../../src/types/run.js";
import {
    closenessReport,
    REDUCE_EXPECTED,
    REDUCE_SEED,
    runReduceOneWorkgroup,
    runSweep,
    type SweepRun,
} from "../helpers/closeness.js";
import { type EdgeSpec, KARATE_EDGES, pathEdges, randomEdges, snapshotOf, starEdges } from "../helpers/graphs.js";
import { LeakCounter } from "../helpers/leak-counter.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { ssspTolerance, weightedEdges } from "../helpers/sssp.js";
import { closenessOracle, dijkstraOracle } from "../oracle/traversal.js";
import { acquire, acquireRaw, requireGpu } from "../setup/gpu.js";

/** Design 9.7: the score tolerance (the integer sums are compared exactly; only the f64 division is approximate). */
const SCORE_REL = 1e-5;

/** Awaits a rejection and asserts its code; returns the error for detail assertions. */
async function expectRejection(promise: Promise<unknown>, code: string): Promise<WebGpuGraphError> {
    let caught: unknown = null;
    try {
        await promise;
    } catch (err) {
        caught = err;
    }
    expect(caught).toMatchObject({ code });
    return caught as WebGpuGraphError;
}

/**
 * The legacy CPU closeness on the same graph as an object graph, no options (every node added first so an isolated
 * node exists), index-aligned.
 * @param edges - the edges
 * @param n - the node count
 * @returns the legacy scores by node index
 */
function legacyScores(edges: readonly EdgeSpec[], n: number): Float64Array {
    const graph = new Graph();
    for (let v = 0; v < n; v++) {
        graph.addNode(v);
    }
    for (const [u, v] of edges) {
        graph.addEdge(u, v);
    }
    const scores = legacyClosenessCentrality(graph);
    return Float64Array.from({ length: n }, (_, v) => scores[String(v)]);
}

/**
 * Every score within a relative tolerance of the expectation (an expectation of 0 demands exactly 0).
 * @param got - the scores
 * @param want - the expected scores
 * @param rel - the relative tolerance
 * @param label - the scenario
 */
function expectScoresClose(got: ArrayLike<number>, want: ArrayLike<number>, rel: number, label: string): void {
    expect(got.length, `${label}: length`).toBe(want.length);
    for (let v = 0; v < want.length; v++) {
        if (want[v] === 0) {
            expect(got[v], `${label}: scores[${v}]`).toBe(0);
        } else {
            expect(Math.abs(got[v] - want[v]) / Math.abs(want[v]), `${label}: scores[${v}]`).toBeLessThanOrEqual(rel);
        }
    }
}

describe("closenessCentrality (design 8.4 / 9.7; P8-T11)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "closeness" }));
        shared = ctx;
        return ctx;
    }

    /**
     * The differential of one bit-parallel run: twice through the tuning entry, the `perSource` blocks and the
     * scores bitwise across the runs; `reached` and the 64-bit `sum` of every source exactly the oracle's; the scores
     * within 1e-5 relative of the oracle's f64; `newCount` zero after every batch; `iterations` the batch count;
     * `converged` and `precision` as PD-25 fixes them.
     */
    async function checkRun(
        ctx: GpuContext,
        label: string,
        s: GraphSnapshot,
        options?: HitsOptionsLike & GpuRunOptions,
    ): Promise<SweepRun> {
        const first = await runSweep(ctx, s, options);
        const second = await runSweep(ctx, s, options);
        expect(second.blocks.length, `${label}: batches`).toBe(first.blocks.length);
        first.blocks.forEach((block, k) => {
            expectBitwiseEqual(block, second.blocks[k], `${label}: perSource of batch ${k}, run twice`);
        });
        expectBitwiseEqual(first.result.scores, second.result.scores, `${label}: scores, run twice`);
        const want = closenessOracle(s, false);
        expect(Array.from(first.reached), `${label}: reached (perSource words 32..63)`).toEqual(
            Array.from(want.reached),
        );
        expect(Array.from(first.sum), `${label}: sum (perSource words 64..127)`).toEqual(Array.from(want.sum));
        expect(Array.from(first.newCount), `${label}: newCount (perSource words 0..31)`).toEqual(
            new Array<number>(s.nodeCount).fill(0),
        );
        expectScoresClose(first.result.scores, want.scores, SCORE_REL, `${label}: scores`);
        expect(first.result.iterations, `${label}: iterations`).toBe(Math.ceil(s.nodeCount / SOURCES_PER_BATCH));
        expect(first.result.converged).toBe(true);
        expect(first.result.precision).toBe("f32");
        return first;
    }

    it("pathEdges(70): three batches, one partial; an end node scores 2 / (n (n - 1)) and the middle node's sum is the two triangular numbers, exactly the oracle's sums", async (t) => {
        const ctx = await context(t);
        const n = 70;
        const s = snapshotOf(pathEdges(n), { label: "closeness-path70" });
        const run = await checkRun(ctx, "path70", s);
        expect(run.result.iterations).toBe(3);
        const end = 2 / (n * (n - 1));
        expect(Math.abs(run.result.scores[0] - end) / end).toBeLessThanOrEqual(SCORE_REL);
        expect(Math.abs(run.result.scores[n - 1] - end) / end).toBeLessThanOrEqual(SCORE_REL);
        // the sums themselves: n (n - 1) / 2 at an end, and every node reaches the other n - 1
        expect(run.sum[0]).toBe((n * (n - 1)) / 2);
        expect(run.reached[0]).toBe(n - 1);
        // the middle node 35 of 0..69: 35 to the left (1..35) and 34 to the right (1..34)
        const middle = (35 * 36) / 2 + (34 * 35) / 2;
        expect(run.sum[35]).toBe(middle);
        ctx.release(s);
    }, 60_000);

    it("starEdges(40): the hub scores 1 / k and every leaf 1 / (2k - 1); two batches, one partial", async (t) => {
        const ctx = await context(t);
        const k = 40;
        const s = snapshotOf(starEdges(k), { label: "closeness-star40" });
        const run = await checkRun(ctx, "star40", s);
        expect(run.result.iterations).toBe(2);
        expect(run.sum[0]).toBe(k);
        expect(Math.abs(run.result.scores[0] - 1 / k) / (1 / k)).toBeLessThanOrEqual(SCORE_REL);
        for (let leaf = 1; leaf <= k; leaf++) {
            expect(run.sum[leaf], `leaf ${leaf}`).toBe(2 * k - 1);
            expect(Math.abs(run.result.scores[leaf] - 1 / (2 * k - 1)) / (1 / (2 * k - 1))).toBeLessThanOrEqual(
                SCORE_REL,
            );
        }
        ctx.release(s);
    }, 60_000);

    it("karate: the oracle's sums exactly, and score for score within 1e-5 relative of the legacy closenessCentrality with no options (the legacy 1 / sum, never the NetworkX form)", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(KARATE_EDGES, { label: "closeness-karate" });
        const run = await checkRun(ctx, "karate", s);
        const legacy = legacyScores(KARATE_EDGES, s.nodeCount);
        expectScoresClose(run.result.scores, legacy, SCORE_REL, "karate vs legacy");
        // the NetworkX / Wasserman-Faust form would be 33x every legacy number on this connected graph
        expect(run.result.scores[0] * 33).not.toBeCloseTo(legacy[0], 6);
        ctx.release(s);
    }, 60_000);

    it("a disconnected graph: an unreached node adds nothing to a sum, an isolated node scores 0 (never 1 / 0), through the oracle and the legacy function", async (t) => {
        const ctx = await context(t);
        // a 5-path on 0..4, a triangle on 6..8, node 5 and node 9 isolated
        const edges: EdgeSpec[] = [...pathEdges(5), [6, 7], [7, 8], [8, 6]];
        const s = snapshotOf(edges, { nodeCount: 10, label: "closeness-disconnected" });
        const run = await checkRun(ctx, "disconnected", s);
        expect(run.result.scores[5]).toBe(0);
        expect(run.result.scores[9]).toBe(0);
        expect(run.reached[5]).toBe(0);
        expect(run.sum[5]).toBe(0);
        expect(run.reached[0]).toBe(4);
        expect(run.sum[0]).toBe(1 + 2 + 3 + 4);
        expect(run.reached[6]).toBe(2);
        expect(run.sum[6]).toBe(2);
        expectScoresClose(run.result.scores, legacyScores(edges, 10), SCORE_REL, "disconnected vs legacy");
        ctx.release(s);
    }, 60_000);

    it("a seeded 70-node random graph: three batches, one partial, against the oracle", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(randomEdges(70, 200, 11), { nodeCount: 70, label: "closeness-random70" });
        const run = await checkRun(ctx, "random70", s);
        expect(run.result.iterations).toBe(3);
        ctx.release(s);
    }, 60_000);

    it("the weighted karate under weighted: true (the default of a weighted snapshot) is one sssp per source: within the derived SSSP tolerance of the f64 Dijkstra sums, bitwise the f32 oracle, iterations n", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(weightedEdges(KARATE_EDGES, "uniform", 1), { label: "closeness-weighted-karate" });
        expect(s.flags.weighted).toBe(true);
        expect(s.flags.allWeightsOne).toBe(false);
        const n = s.nodeCount;
        const explicit = await closenessCentrality(ctx, s, { weighted: true });
        const implicit = await closenessCentrality(ctx, s);
        expectBitwiseEqual(explicit.scores, implicit.scores, "weighted: true equals the snapshot's default");
        expect(explicit.iterations).toBe(n);
        expect(explicit.converged).toBe(true);
        expect(explicit.precision).toBe("f32");
        const f32 = closenessOracle(s, true);
        for (let v = 0; v < n; v++) {
            expect(explicit.scores[v], `scores[${v}] vs the f32 oracle`).toBe(Math.fround(f32.scores[v]));
        }
        const tolerance = ssspTolerance();
        for (let source = 0; source < n; source++) {
            const { dist } = dijkstraOracle(s, source, "f64");
            let sum = 0;
            for (let v = 0; v < n; v++) {
                if (v !== source && dist[v] !== Infinity) {
                    sum += dist[v];
                }
            }
            const want = sum === 0 ? 0 : 1 / sum;
            expect(
                Math.abs(explicit.scores[source] - want) / want,
                `scores[${source}] vs f64 (${tolerance.basis})`,
            ).toBeLessThanOrEqual(tolerance.value);
        }
        ctx.release(s);
    }, 120_000);

    it("the weighted karate under weighted: false ignores the column by request: bitwise the unweighted karate on perSource and scores", async (t) => {
        const ctx = await context(t);
        const weighted = snapshotOf(weightedEdges(KARATE_EDGES, "uniform", 1), { label: "closeness-karate-ignored" });
        const plain = snapshotOf(KARATE_EDGES, { label: "closeness-karate-plain" });
        const ignored = await checkRun(ctx, "weighted karate, weighted: false", weighted, { weighted: false });
        const unweighted = await runSweep(ctx, plain);
        expect(ignored.blocks.length).toBe(unweighted.blocks.length);
        ignored.blocks.forEach((block, k) => {
            expectBitwiseEqual(block, unweighted.blocks[k], `perSource of batch ${k}`);
        });
        expectBitwiseEqual(ignored.result.scores, unweighted.result.scores, "scores");
        ctx.release(weighted);
        ctx.release(plain);
    }, 60_000);

    it("maxIterations and tolerance are E_UNSUPPORTED { option } before any device work; undefined for both runs and equals the no-option result", async (t) => {
        requireGpu(t);
        const { device } = await acquireRaw();
        const counter = LeakCounter.wrap(device);
        const own = GpuContext.from(device);
        try {
            const s = snapshotOf(KARATE_EDGES, { label: "closeness-options" });
            await verifyDevice(own);
            counter.resetMapAsync();
            const iterations = await expectRejection(
                closenessCentrality(own, s, { maxIterations: 1 }),
                "E_UNSUPPORTED",
            );
            expect(iterations.details).toMatchObject({ option: "maxIterations" });
            expect(iterations.details.feature).toBeUndefined();
            expect(String(iterations.details.hint)).toContain("exact traversal");
            const tolerance = await expectRejection(closenessCentrality(own, s, { tolerance: 1e-3 }), "E_UNSUPPORTED");
            expect(tolerance.details).toMatchObject({ option: "tolerance" });
            expect(counter.mapAsyncCalls, "no device work before the refusal").toBe(0);
            const bare = await closenessCentrality(own, s, { maxIterations: undefined, tolerance: undefined });
            const plain = await closenessCentrality(own, s);
            expectBitwiseEqual(bare.scores, plain.scores, "an undefined option is no option");
            own.release(s);
        } finally {
            own.dispose();
        }
        counter.restore();
    }, 60_000);

    it("closeness-reduce role 0, hand-bound with no graph: the 16-bit split product and the carry make the 64-bit sum exact (perSource words 64 and 96 read back by name)", async (t) => {
        const ctx = await context(t);
        const { perSource, counters } = await runReduceOneWorkgroup(ctx);
        const sumLo = perSource[64];
        const sumHi = perSource[96];
        expect(sumHi, "sumHi[0]").toBe(REDUCE_EXPECTED.sumHi);
        expect(sumLo, "sumLo[0]").toBe(REDUCE_EXPECTED.sumLo);
        const sum = (BigInt(sumHi) << 32n) | BigInt(sumLo);
        expect(sum).toBe(BigInt(REDUCE_SEED.sumLo) + BigInt(REDUCE_SEED.newCount) * BigInt(REDUCE_SEED.level + 1));
        expect(sum).toBe(REDUCE_EXPECTED.sum);
        expect(perSource[32], "reached[0]").toBe(REDUCE_EXPECTED.reached);
        expect(perSource[0], "newCount[0]").toBe(0);
        expect(counters[11], "the level word").toBe(REDUCE_EXPECTED.level);
        expect(counters[15], "done").toBe(0);
        for (let s = 1; s < 32; s++) {
            for (const region of [0, 32, 64, 96]) {
                expect(perSource[region + s], `perSource[${region + s}]`).toBe(0);
            }
        }
    }, 60_000);

    it("levelsPerSubmit 1 equals the default cadence bitwise on perSource and scores (the frontier / next parity survives a submit boundary)", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(pathEdges(70), { label: "closeness-cadence" });
        const cadenceOne = await runSweep(ctx, s, undefined, { levelsPerSubmit: 1 });
        const cadenceDefault = await runSweep(ctx, s);
        expect(cadenceOne.blocks.length).toBe(cadenceDefault.blocks.length);
        cadenceOne.blocks.forEach((block, k) => {
            expectBitwiseEqual(block, cadenceDefault.blocks[k], `perSource of batch ${k}`);
        });
        expectBitwiseEqual(cadenceOne.result.scores, cadenceDefault.result.scores, "scores");
        expect(Array.from(cadenceOne.sum)).toEqual(Array.from(closenessOracle(s, false).sum));
        await expectRejection(closenessWithTuning(ctx, s, undefined, { levelsPerSubmit: 0 }), "E_INVALID_ARGUMENT");
        ctx.release(s);
    }, 120_000);

    it("one mapAsync per submit: karate (two batches, each within one submit) maps exactly twice", async (t) => {
        requireGpu(t);
        const { device } = await acquireRaw();
        const counter = LeakCounter.wrap(device);
        const own = GpuContext.from(device);
        try {
            const s = snapshotOf(KARATE_EDGES, { label: "closeness-maps" });
            await verifyDevice(own);
            counter.resetMapAsync();
            const result = await closenessCentrality(own, s);
            expect(result.iterations).toBe(2);
            expect(counter.mapAsyncCalls, "mapAsync calls of two batches").toBe(2);
            own.release(s);
        } finally {
            own.dispose();
        }
        counter.restore();
    }, 60_000);

    it("edge cases: the empty graph scores nothing, one node scores 0, dest is honoured or refused, a negative weight is E_UNSUPPORTED { feature: 'closenessCentrality.negativeWeights' }", async (t) => {
        const ctx = await context(t);
        const empty = snapshotOf([], { nodeCount: 0, label: "closeness-empty" });
        const none = await closenessCentrality(ctx, empty);
        expect(none.scores.length).toBe(0);
        expect(none.iterations).toBe(0);
        ctx.release(empty);
        const one = snapshotOf([], { nodeCount: 1, label: "closeness-one" });
        const single = await checkRun(ctx, "one node", one);
        expect(Array.from(single.result.scores)).toEqual([0]);
        ctx.release(one);
        const s = snapshotOf(pathEdges(5), { label: "closeness-dest" });
        const dest = new Float32Array(5);
        const into = await closenessCentrality(ctx, s, { dest });
        expect(into.scores).toBe(dest);
        expect(dest[0]).toBe(Math.fround(1 / 10));
        const wrong = await expectRejection(
            closenessCentrality(ctx, s, { dest: new Float32Array(4) }),
            "E_INVALID_ARGUMENT",
        );
        expect(wrong.details).toMatchObject({ argument: "dest" });
        ctx.release(s);
        const negative = snapshotOf(
            [
                [0, 1, 1],
                [1, 2, -1],
            ],
            { label: "closeness-negative" },
        );
        const refused = await expectRejection(closenessCentrality(ctx, negative), "E_UNSUPPORTED");
        expect(refused.details).toMatchObject({ feature: "closenessCentrality.negativeWeights" });
        const stillSweeps = await closenessCentrality(ctx, negative, { weighted: false });
        expect(Array.from(stillSweeps.scores)).toEqual([Math.fround(1 / 3), Math.fround(1 / 2), Math.fround(1 / 3)]);
        ctx.release(negative);
    }, 60_000);

    it("the sabotage report passes on the real kernels (factor 0)", async (t) => {
        const ctx = await context(t);
        const report = await closenessReport(ctx);
        expect(report.worst).toBe(0);
        assertCheckPasses(report);
    }, 120_000);

    afterAll(() => {
        shared?.dispose();
        shared = null;
    });
});
