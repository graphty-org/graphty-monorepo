/**
 * Closeness centrality (design 8.4, 3.3 line 810, 9.7, 11.3) against `closenessOracle`, the CPU
 * `closenessCentrality` of `@graphty/algorithms` (the parity target: `1 / sumOfDistances`, `0` when nothing is
 * reached, no reached factor and no Wasserman-Faust scaling; or the sum of `1 / distance` under `harmonic`), and the
 * closed forms of the path and the star.
 *
 * The three routes are each checked on their own and against each other:
 * - the LEVEL route (`closeness-level`), through the driver's `onBatch` seam, which hands over every source's exact
 *   sum and reached count: every fixture with the step chosen per level, forced to push and forced to pull, at the
 *   default words per node and at one word (several batches, one partial);
 * - the ALL-PAIRS route (the blocked sweep plus `closeness-rowsum`): bitwise the level route on unweighted graphs
 *   (both sum integers exactly), and bitwise an emulation of the device's f32 row reduction on weighted and harmonic
 *   runs;
 * - the ONE-SEARCH-PER-SOURCE route (weighted above the all-pairs ceiling, weighted sampled runs): bitwise the f32
 *   oracle.
 * Plus the routing rule, harmonic closeness on every route, `maxIterations` / `tolerance` refused before any device
 * work, the submit cadence, the `mapAsync` count, the sampled runs and the edge cases. Run-twice bitwise everywhere.
 */

import { accelerated, closenessCentrality as cpuClosenessCentrality } from "@graphty/algorithms";
import { type F32, type GraphSnapshot } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import { createAccelerator } from "../../src/accelerator.js";
import {
    ALL_PAIRS_MAX_NODES,
    closenessCentrality,
    type ClosenessRoute,
    closenessWithTuning,
    MAX_WORDS,
    PULL_MAX_DEGREE,
} from "../../src/algorithms/closeness.js";
import { GpuContext } from "../../src/context.js";
import { type WebGpuGraphError } from "../../src/errors.js";
import { KERNELS } from "../../src/kernels.js";
import { verifyDevice } from "../../src/primitives/verify.js";
import { type ClosenessAcceleratorOptions, type HitsOptionsLike } from "../../src/types/accelerator.js";
import { type GpuRunOptions } from "../../src/types/run.js";
import { allPairsScores, closenessReport, funnelEdges, type LevelRun, runLevels, STEPS } from "../helpers/closeness.js";
import { type EdgeSpec, KARATE_EDGES, pathEdges, randomEdges, snapshotOf, starEdges } from "../helpers/graphs.js";
import { LeakCounter } from "../helpers/leak-counter.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { ssspTolerance, weightedEdges } from "../helpers/sssp.js";
import { closenessOracle, dijkstraOracle } from "../oracle/traversal.js";
import { acquire, acquireRaw, requireGpu } from "../setup/gpu.js";

/** Design 9.7: the score tolerance against an f64 reference (the sums are exact; only the f32 store rounds). */
const SCORE_REL = 1e-6;

type Options = ClosenessAcceleratorOptions & HitsOptionsLike & GpuRunOptions;

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

/**
 * The route an exact run takes, and its result.
 * @param ctx - the context
 * @param s - the snapshot
 * @param options - the options
 * @param route - a forced route, or undefined for the driver's choice
 * @returns the route and the scores
 */
async function routed(
    ctx: GpuContext,
    s: GraphSnapshot,
    options?: Options,
    route?: ClosenessRoute,
): Promise<{ readonly route: ClosenessRoute | null; readonly scores: F32 }> {
    let taken: ClosenessRoute | null = null;
    const result = await closenessWithTuning(ctx, s, options, {
        route,
        onRoute: (r) => {
            taken = r;
        },
    });
    return { route: taken, scores: result.scores };
}

/**
 * The route a run would take, without running it: the route callback throws before any device work.
 * @param ctx - the context
 * @param s - the snapshot
 * @param options - the options
 * @returns the route
 */
async function routeOf(ctx: GpuContext, s: GraphSnapshot, options?: Options): Promise<ClosenessRoute> {
    const stop = new Error("route chosen");
    let taken: ClosenessRoute | null = null;
    try {
        await closenessWithTuning(ctx, s, options, {
            onRoute: (r) => {
                taken = r;
                throw stop;
            },
        });
    } catch (err) {
        if (err !== stop) {
            throw err;
        }
    }
    expect(taken).not.toBeNull();
    return taken as unknown as ClosenessRoute;
}

describe("closenessCentrality (design 8.4 / 9.7)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "closeness" }));
        shared = ctx;
        return ctx;
    }

    /**
     * The level route three ways (the per-level choice, push only, pull only), each run twice: the scores and sums
     * bitwise across the runs and across the three ways, `reached` and `sum` exactly the oracle's, the scores within
     * 1e-6 of the oracle's f64.
     */
    async function checkLevels(
        ctx: GpuContext,
        label: string,
        s: GraphSnapshot,
        options?: Options,
        words?: number,
    ): Promise<LevelRun> {
        const want = closenessOracle(s, false);
        let first: LevelRun | null = null;
        for (const [step, tuning] of STEPS) {
            const run = await runLevels(ctx, s, options, { ...tuning, words });
            const again = await runLevels(ctx, s, options, { ...tuning, words });
            expectBitwiseEqual(run.result.scores, again.result.scores, `${label}/${step}: scores, run twice`);
            expect(Array.from(run.reached), `${label}/${step}: reached`).toEqual(Array.from(want.reached));
            expect(Array.from(run.sum), `${label}/${step}: sum`).toEqual(Array.from(want.sum));
            expectScoresClose(run.result.scores, want.scores, SCORE_REL, `${label}/${step}: scores`);
            expect(run.result.converged).toBe(true);
            expect(run.result.precision).toBe("f32");
            if (first === null) {
                first = run;
            } else {
                expectBitwiseEqual(run.result.scores, first.result.scores, `${label}/${step}: scores vs auto`);
            }
        }
        return first as unknown as LevelRun;
    }

    it("the kernel's workgroup tally holds MAX_WORDS words of lanes", () => {
        expect(KERNELS["closeness-level"].body).toContain(`const max_words: u32 = ${MAX_WORDS}u;`);
    });

    it("pathEdges(70): an end node scores 2 / (n (n - 1)) and the middle node's sum is the two triangular numbers; one word per node runs three batches, one partial", async (t) => {
        const ctx = await context(t);
        const n = 70;
        const s = snapshotOf(pathEdges(n), { label: "closeness-path70" });
        const run = await checkLevels(ctx, "path70", s);
        expect(run.result.iterations, "one batch at three words per node").toBe(1);
        const narrow = await checkLevels(ctx, "path70 one word", s, undefined, 1);
        expect(narrow.result.iterations).toBe(3);
        const end = 2 / (n * (n - 1));
        expect(Math.abs(run.result.scores[0] - end) / end).toBeLessThanOrEqual(SCORE_REL);
        expect(Math.abs(run.result.scores[n - 1] - end) / end).toBeLessThanOrEqual(SCORE_REL);
        expect(run.sum[0]).toBe((n * (n - 1)) / 2);
        expect(run.reached[0]).toBe(n - 1);
        // the middle node 35 of 0..69: 35 to the left (1..35) and 34 to the right (1..34)
        expect(run.sum[35]).toBe((35 * 36) / 2 + (34 * 35) / 2);
        ctx.release(s);
    }, 60_000);

    it("starEdges(40): the hub scores 1 / k and every leaf 1 / (2k - 1), the pull's early exit included", async (t) => {
        const ctx = await context(t);
        const k = 40;
        const s = snapshotOf(starEdges(k), { label: "closeness-star40" });
        const run = await checkLevels(ctx, "star40", s);
        expect(run.sum[0]).toBe(k);
        for (let leaf = 1; leaf <= k; leaf++) {
            expect(run.sum[leaf], `leaf ${leaf}`).toBe(2 * k - 1);
        }
        ctx.release(s);
    }, 60_000);

    it("a hub of more than PULL_MAX_DEGREE in-arcs keeps every level a push, one invocation per arc: a forced pull still gives the star's closed form", async (t) => {
        const ctx = await context(t);
        const k = PULL_MAX_DEGREE + 1;
        const s = snapshotOf(starEdges(k), { label: "closeness-big-star" });
        for (const [step, tuning] of STEPS) {
            const run = await runLevels(ctx, s, undefined, tuning);
            expect(run.sum[0], `${step}: the hub`).toBe(k);
            expect(
                Array.from(run.sum.subarray(1)).every((sum) => sum === 2 * k - 1),
                `${step}: every leaf`,
            ).toBe(true);
        }
        ctx.release(s);
    }, 120_000);

    it("karate: the oracle's sums exactly, and score for score within 1e-6 of the CPU closenessCentrality with no options (the legacy 1 / sum, never the NetworkX form)", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(KARATE_EDGES, { label: "closeness-karate" });
        const run = await checkLevels(ctx, "karate", s);
        const cpu = cpuClosenessCentrality(s).scores;
        expectScoresClose(run.result.scores, cpu, SCORE_REL, "karate vs the CPU closeness");
        // the NetworkX / Wasserman-Faust form would be 33x every legacy number on this connected graph
        expect(run.result.scores[0] * 33).not.toBeCloseTo(cpu[0], 6);
        ctx.release(s);
    }, 60_000);

    it("a disconnected graph: an unreached node adds nothing to a sum, an isolated node scores 0 (never 1 / 0)", async (t) => {
        const ctx = await context(t);
        // a 5-path on 0..4, a triangle on 6..8, node 5 and node 9 isolated
        const edges: EdgeSpec[] = [...pathEdges(5), [6, 7], [7, 8], [8, 6]];
        const s = snapshotOf(edges, { nodeCount: 10, label: "closeness-disconnected" });
        const run = await checkLevels(ctx, "disconnected", s);
        expect(run.result.scores[5]).toBe(0);
        expect(run.result.scores[9]).toBe(0);
        expect(run.reached[5]).toBe(0);
        expect(run.sum[0]).toBe(1 + 2 + 3 + 4);
        expect(run.sum[6]).toBe(2);
        expectScoresClose(run.result.scores, cpuClosenessCentrality(s).scores, SCORE_REL, "vs the CPU closeness");
        ctx.release(s);
    }, 60_000);

    it("the funnel, a directed graph (the pull walks the reverse adjacency) and a 600-node graph at eight words per node (two batches, one partial), against the oracle", async (t) => {
        const ctx = await context(t);
        const cases: [string, GraphSnapshot][] = [
            ["funnel200", snapshotOf(funnelEdges(200), { label: "closeness-funnel" })],
            [
                "directed120",
                snapshotOf(randomEdges(120, 360, 5), { nodeCount: 120, directed: true, label: "closeness-directed" }),
            ],
            ["random600", snapshotOf(randomEdges(600, 1500, 11), { nodeCount: 600, label: "closeness-random600" })],
        ];
        for (const [label, s] of cases) {
            await checkLevels(ctx, label, s);
            expectScoresClose(
                (await runLevels(ctx, s)).result.scores,
                cpuClosenessCentrality(s).scores,
                SCORE_REL,
                `${label} vs the CPU closeness`,
            );
            ctx.release(s);
        }
        const big = snapshotOf(randomEdges(600, 1500, 11), { nodeCount: 600, label: "closeness-random600-batches" });
        expect((await runLevels(ctx, big)).result.iterations).toBe(Math.ceil(600 / (32 * MAX_WORDS)));
        ctx.release(big);
    }, 120_000);

    it("the all-pairs route on unweighted graphs: bitwise the level route (both sum integers exactly) and bitwise the emulated row sums", async (t) => {
        const ctx = await context(t);
        const cases: [string, GraphSnapshot][] = [
            ["karate", snapshotOf(KARATE_EDGES, { label: "closeness-ap-karate" })],
            ["path70+5", snapshotOf(pathEdges(70), { nodeCount: 75, label: "closeness-ap-path" })],
            [
                "directed120",
                snapshotOf(randomEdges(120, 360, 5), {
                    nodeCount: 120,
                    directed: true,
                    label: "closeness-ap-directed",
                }),
            ],
        ];
        for (const [label, s] of cases) {
            const allPairs = await routed(ctx, s, undefined, "all-pairs");
            const again = await routed(ctx, s, undefined, "all-pairs");
            expect(allPairs.route).toBe("all-pairs");
            expectBitwiseEqual(allPairs.scores, again.scores, `${label}: run twice`);
            expectBitwiseEqual(allPairs.scores, (await runLevels(ctx, s)).result.scores, `${label}: vs levels`);
            expectBitwiseEqual(
                allPairs.scores,
                allPairsScores(s, false, false, ctx.workgroupSize),
                `${label}: vs the emulation`,
            );
            ctx.release(s);
        }
    }, 120_000);

    it("the weighted karate takes the all-pairs route: bitwise the emulated f32 row sums, within the derived SSSP tolerance of the f64 Dijkstra sums; one search per source above the all-pairs ceiling, bitwise the f32 oracle", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(weightedEdges(KARATE_EDGES, "uniform", 1), { label: "closeness-weighted-karate" });
        expect(s.flags.weighted).toBe(true);
        const n = s.nodeCount;
        const explicit = await routed(ctx, s, { weighted: true });
        const implicit = await closenessCentrality(ctx, s);
        expect(explicit.route).toBe("all-pairs");
        expectBitwiseEqual(explicit.scores, implicit.scores, "weighted: true equals the snapshot's default");
        expectBitwiseEqual(explicit.scores, allPairsScores(s, true, false, ctx.workgroupSize), "vs the emulation");
        const tolerance = ssspTolerance();
        for (let source = 0; source < n; source++) {
            const { dist } = dijkstraOracle(s, source, "f64");
            let sum = 0;
            for (let v = 0; v < n; v++) {
                if (v !== source && dist[v] !== Infinity) {
                    sum += dist[v];
                }
            }
            expect(
                Math.abs(explicit.scores[source] - 1 / sum) * sum,
                `scores[${source}] vs f64 (${tolerance.basis})`,
            ).toBeLessThanOrEqual(tolerance.value);
        }
        // a binding too small for karate's matrix: one sssp per source
        const small = new Proxy(ctx, {
            get(target, key, receiver): unknown {
                if (key === "caps") {
                    const limits = new Proxy(target.caps.limits, {
                        get: (real, name): unknown =>
                            name === "maxBufferSize" ? 4 * 30 * 30 : Reflect.get(real, name),
                    });
                    return { ...target.caps, limits };
                }
                const value: unknown = Reflect.get(target, key, receiver);
                return typeof value === "function" ? value.bind(target) : value;
            },
        });
        const perSource = await routed(small, s, { weighted: true });
        expect(perSource.route).toBe("per-source");
        const f32 = closenessOracle(s, true);
        for (let v = 0; v < n; v++) {
            expect(perSource.scores[v], `scores[${v}] vs the f32 oracle`).toBe(Math.fround(f32.scores[v]));
        }
        ctx.release(s);
    }, 120_000);

    it("the weighted karate under weighted: false ignores the column by request: bitwise the unweighted karate", async (t) => {
        const ctx = await context(t);
        const weighted = snapshotOf(weightedEdges(KARATE_EDGES, "uniform", 1), { label: "closeness-karate-ignored" });
        const plain = snapshotOf(KARATE_EDGES, { label: "closeness-karate-plain" });
        expectBitwiseEqual(
            (await closenessCentrality(ctx, weighted, { weighted: false })).scores,
            (await closenessCentrality(ctx, plain)).scores,
            "scores",
        );
        await checkLevels(ctx, "weighted karate, weighted: false", weighted, { weighted: false });
        ctx.release(weighted);
        ctx.release(plain);
    }, 60_000);

    it("harmonic closeness on every route: the CPU port's harmonic scores (a zero distance and an unreached node add nothing); refused with sampled sources", async (t) => {
        const ctx = await context(t);
        const plain = snapshotOf(
            [...pathEdges(5), [6, 7], [7, 8], [8, 6], ...KARATE_EDGES.map(([a, b]) => [a + 10, b + 10] as EdgeSpec)],
            {
                nodeCount: 44,
                label: "closeness-harmonic",
            },
        );
        const want = cpuClosenessCentrality(plain, { harmonic: true }).scores;
        for (const route of ["levels", "all-pairs"] as const) {
            const first = await routed(ctx, plain, { harmonic: true }, route);
            const again = await routed(ctx, plain, { harmonic: true }, route);
            expect(first.route).toBe(route);
            expectBitwiseEqual(first.scores, again.scores, `${route}: run twice`);
            expectScoresClose(first.scores, want, SCORE_REL, `${route} vs the CPU harmonic`);
            expect(first.scores[5], `${route}: an isolated node`).toBe(0);
        }
        expectBitwiseEqual(
            (await routed(ctx, plain, { harmonic: true }, "all-pairs")).scores,
            allPairsScores(plain, false, true, ctx.workgroupSize),
            "all-pairs vs the emulation",
        );
        for (const [step, tuning] of STEPS) {
            const run = await closenessWithTuning(ctx, plain, { harmonic: true }, { ...tuning, route: "levels" });
            expectScoresClose(run.scores, want, SCORE_REL, `levels/${step}`);
        }
        // weighted, with a zero-weight edge: the zero distance adds nothing, as on the CPU
        const weighted = snapshotOf([...weightedEdges(KARATE_EDGES, "integer", 3), [0, 34, 0]], {
            label: "closeness-harmonic-weighted",
        });
        const wantWeighted = cpuClosenessCentrality(weighted, { harmonic: true, weighted: true }).scores;
        const tolerance = ssspTolerance();
        for (const route of ["all-pairs", "per-source"] as const) {
            const run = await routed(ctx, weighted, { harmonic: true, weighted: true }, route);
            expect(run.route).toBe(route);
            expectScoresClose(run.scores, wantWeighted, tolerance.value, `weighted ${route} (${tolerance.basis})`);
        }
        const refused = await expectRejection(
            closenessCentrality(ctx, plain, { harmonic: true, sources: [0] }),
            "E_UNSUPPORTED",
        );
        expect(refused.details).toMatchObject({ feature: "closenessCentrality.sampledHarmonic" });
        ctx.release(plain);
        ctx.release(weighted);
    }, 120_000);

    it("the routing rule: unweighted graphs up to ALL_PAIRS_MAX_NODES and weighted graphs whose matrix fits take the all-pairs route, other unweighted graphs the level route, sampled runs never the all-pairs route", async (t) => {
        const ctx = await context(t);
        const karate = snapshotOf(KARATE_EDGES, { label: "closeness-route-karate" });
        expect((await routed(ctx, karate)).route).toBe("all-pairs");
        const atBound = snapshotOf(pathEdges(ALL_PAIRS_MAX_NODES), { label: "closeness-route-bound" });
        const pastBound = snapshotOf(pathEdges(ALL_PAIRS_MAX_NODES + 1), { label: "closeness-route-past" });
        expect(await routeOf(ctx, atBound)).toBe("all-pairs");
        expect(await routeOf(ctx, pastBound)).toBe("levels");
        ctx.release(atBound);
        ctx.release(pastBound);
        let taken: ClosenessRoute | null = null;
        await closenessWithTuning(ctx, karate, { sources: [0, 1] }, { onRoute: (r) => (taken = r) });
        expect(taken).toBe("levels");
        ctx.release(karate);
        const weighted = snapshotOf(weightedEdges(KARATE_EDGES, "uniform", 1), { label: "closeness-route-weighted" });
        await closenessWithTuning(ctx, weighted, { sources: [0, 1] }, { onRoute: (r) => (taken = r) });
        expect(taken).toBe("per-source");
        ctx.release(weighted);
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

    it("levelsPerSubmit 1 equals the default cadence bitwise (the frontier rotation and the control ring survive a submit boundary)", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(pathEdges(70), { label: "closeness-cadence" });
        for (const [step, tuning] of STEPS) {
            const one = await runLevels(ctx, s, undefined, { ...tuning, levelsPerSubmit: 1 });
            const many = await runLevels(ctx, s, undefined, tuning);
            expectBitwiseEqual(one.result.scores, many.result.scores, `${step}: scores`);
            expect(Array.from(one.sum)).toEqual(Array.from(closenessOracle(s, false).sum));
        }
        await expectRejection(closenessWithTuning(ctx, s, undefined, { levelsPerSubmit: 0 }), "E_INVALID_ARGUMENT");
        await expectRejection(
            closenessWithTuning(ctx, s, undefined, { route: "levels", words: MAX_WORDS + 1 }),
            "E_INVALID_ARGUMENT",
        );
        ctx.release(s);
    }, 120_000);

    it("one mapAsync per submit: karate on the level route (one batch, depth 5) maps once, on the all-pairs route once (the row sums; the sweep reads nothing back)", async (t) => {
        requireGpu(t);
        const { device } = await acquireRaw();
        const counter = LeakCounter.wrap(device);
        const own = GpuContext.from(device);
        try {
            const s = snapshotOf(KARATE_EDGES, { label: "closeness-maps" });
            await verifyDevice(own);
            await closenessWithTuning(own, s, undefined, { route: "levels" });
            await closenessWithTuning(own, s, undefined, { route: "all-pairs" });
            counter.resetMapAsync();
            const levels = await closenessWithTuning(own, s, undefined, { route: "levels" });
            expect(levels.iterations).toBe(1);
            expect(counter.mapAsyncCalls, "mapAsync calls of the level route").toBe(1);
            counter.resetMapAsync();
            await closenessWithTuning(own, s, undefined, { route: "all-pairs" });
            expect(counter.mapAsyncCalls, "mapAsync calls of the all-pairs route").toBe(1);
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
        expect(Array.from((await closenessCentrality(ctx, one)).scores)).toEqual([0]);
        expect(Array.from((await runLevels(ctx, one)).result.scores)).toEqual([0]);
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
        const ignored = await closenessCentrality(ctx, negative, { weighted: false });
        expect(Array.from(ignored.scores)).toEqual([Math.fround(1 / 3), Math.fround(1 / 2), Math.fround(1 / 3)]);
        ctx.release(negative);
    }, 60_000);

    it("sampled sources, every node of karate: bitwise the exact run's scores (the same integer sums, folded per node instead of per source)", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(KARATE_EDGES, { label: "closeness-sampled-every" });
        const every = Array.from({ length: s.nodeCount }, (_, i) => i);
        const exact = await closenessCentrality(ctx, s);
        for (const [step, tuning] of STEPS) {
            const sampled = await closenessWithTuning(ctx, s, { sources: every }, tuning);
            expectBitwiseEqual(sampled.scores, exact.scores, `${step}: sampled over every node vs exact`);
            expect(sampled.sourcesUsed).toBe(s.nodeCount);
        }
        ctx.release(s);
    }, 60_000);

    it("sampled sources: the CPU port on the same sources, score for score, duplicates run twice, run twice bitwise", async (t) => {
        const ctx = await context(t);
        const cases: [string, GraphSnapshot, number[]][] = [
            ["karate", snapshotOf(KARATE_EDGES, { label: "closeness-sampled-karate" }), [0, 33, 5, 5, 16]],
            // a duplicate straddling two one-word batches
            [
                "random70",
                snapshotOf(randomEdges(70, 200, 11), { nodeCount: 70, label: "closeness-sampled-random70" }),
                Array.from({ length: 40 }, (_, i) => (i * 7) % 70).concat([0]),
            ],
            [
                "disconnected",
                snapshotOf([...pathEdges(5), [6, 7], [7, 8], [8, 6]], {
                    nodeCount: 10,
                    label: "closeness-sampled-disconnected",
                }),
                [0, 9, 7],
            ],
        ];
        for (const [label, s, sources] of cases) {
            const cpu = cpuClosenessCentrality(s, { sources });
            for (const [step, tuning] of STEPS) {
                for (const words of [undefined, 1]) {
                    const first = await closenessWithTuning(ctx, s, { sources }, { ...tuning, words });
                    const second = await closenessWithTuning(ctx, s, { sources }, { ...tuning, words });
                    expectBitwiseEqual(first.scores, second.scores, `${label}/${step}: run twice`);
                    expect(first.sourcesUsed).toBe(sources.length);
                    expectScoresClose(first.scores, cpu.scores, SCORE_REL, `${label}/${step}/${words ?? "auto"}`);
                }
            }
            ctx.release(s);
        }
    }, 120_000);

    it("sampled by k through the dispatcher: the accelerator runs the port's own draw, so CPU and GPU agree score for score; an exact harmonic call reaches the accelerator", async (t) => {
        const ctx = await context(t);
        const acc = createAccelerator(ctx);
        const s = snapshotOf(randomEdges(70, 200, 11), { nodeCount: 70, label: "closeness-sampled-k" });
        for (const k of [1, 20, 45]) {
            const gpu = await accelerated(acc).closenessCentrality(s, { k });
            const cpu = cpuClosenessCentrality(s, { k });
            expect(gpu.sourcesUsed).toBe(k);
            expect(gpu.scores).toBeInstanceOf(Float32Array);
            expectScoresClose(gpu.scores, cpu.scores, SCORE_REL, `k = ${k}`);
        }
        const harmonic = await accelerated(acc).closenessCentrality(s, { harmonic: true });
        expect(harmonic.scores, "the accelerator's f32 result").toBeInstanceOf(Float32Array);
        expectScoresClose(harmonic.scores, cpuClosenessCentrality(s, { harmonic: true }).scores, SCORE_REL, "harmonic");
        acc.release(s);
    }, 120_000);

    it("sampled sources on the weighted karate (one sssp per source): within the derived SSSP tolerance of the CPU port's sampled sums", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(weightedEdges(KARATE_EDGES, "uniform", 1), { label: "closeness-sampled-weighted" });
        const sources = [0, 33, 2, 2];
        const gpu = await closenessCentrality(ctx, s, { weighted: true, sources });
        expect(gpu.sourcesUsed).toBe(4);
        expect(gpu.iterations).toBe(4);
        const cpu = cpuClosenessCentrality(s, { weighted: true, sources });
        const tolerance = ssspTolerance();
        expectScoresClose(gpu.scores, cpu.scores, tolerance.value, `weighted vs CPU (${tolerance.basis})`);
        ctx.release(s);
    }, 120_000);

    it("sampled sources refused: a directed snapshot is E_UNSUPPORTED, a source outside the snapshot E_INVALID_ARGUMENT, an empty list scores 0 with no batch", async (t) => {
        const ctx = await context(t);
        const directed = snapshotOf(pathEdges(5), { directed: true, label: "closeness-sampled-directed" });
        const refused = await expectRejection(closenessCentrality(ctx, directed, { sources: [0] }), "E_UNSUPPORTED");
        expect(refused.details).toMatchObject({ feature: "closenessCentrality.directedSources" });
        ctx.release(directed);
        const s = snapshotOf(pathEdges(5), { label: "closeness-sampled-bad" });
        const bad = await expectRejection(closenessCentrality(ctx, s, { sources: [5] }), "E_INVALID_ARGUMENT");
        expect(bad.details).toMatchObject({ argument: "sources" });
        const none = await closenessCentrality(ctx, s, { sources: [] });
        expect(Array.from(none.scores)).toEqual([0, 0, 0, 0, 0]);
        expect(none.sourcesUsed).toBe(0);
        expect(none.iterations).toBe(0);
        ctx.release(s);
    }, 60_000);

    it("the sabotage report passes on the real kernels (factor 0)", async (t) => {
        const ctx = await context(t);
        const report = await closenessReport(ctx);
        expect(report.worst, report.worstLabel).toBe(0);
        assertCheckPasses(report);
    }, 120_000);

    afterAll(() => {
        shared?.dispose();
        shared = null;
    });
});
