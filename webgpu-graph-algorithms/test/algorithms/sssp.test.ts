/**
 * Weighted single-source shortest paths over the near-far queue (design 8.4, 9.7, 11.3; P8-T9) against the f32
 * AND the f64 Dijkstra oracles (PD-10) on the P8-T6 fixture list with weights -- uniform [0.1, 10], integers 1..10, a
 * third of the arcs at weight 0, six decades, the two PD-27 counterexamples `zeroPlateau` and `absorbPath`, directed
 * and undirected, unreachable components -- every readback naming its buffer: `dist` BITWISE against the f32
 * oracle as `Uint32Array` views of the bit patterns PD-9 stores (the settled value is the minimum of a fixed set of
 * f32 sums, so it is order-independent), within the DERIVED tolerance of the f64 oracle (the committed floor of
 * benchmarks/results/noise-floor.json, never a literal), the triangle inequality over every arc, `predArc` EXACTLY
 * the arc PD-27's plateau rule picks (recomputed on the host) with every chain walked to the source under a step
 * bound, `reachedCount`, and run-twice bitwise on `dist`, `predArc` and the counters block after every submit; the
 * two routings of PD-22 (a run without a weight vector, or whose vector is all ones, is the unit-weight BFS with a
 * depth cap derived from `cutoff`, and an override on an unweighted snapshot is scanned and routed on its own
 * values); `cutoff` as the CPU port reads it (`dv <= cutoff`: an integer some node attains exactly, -1, Infinity,
 * 2.5 on the unit route) and `NaN` refused before any device work; `weights` as an F64 override that differs from
 * the column, as an integer override on an unweighted snapshot, short, negative and non-finite; the exact round
 * count of the weight-2 path under `delta 32` (64 near rounds and three far pass-throughs); the run options; the
 * f32-versus-f64 spread recorded as the noise-floor row the tolerance derives from; and the sabotage check on the
 * real kernels.
 */

import { type F32, type GraphSnapshot, INVALID_INDEX, type NumericVector } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import { breadthFirstSearch } from "../../src/algorithms/bfs.js";
import { sssp, type SsspTuning, ssspWithTuning } from "../../src/algorithms/sssp.js";
import { MAX_LEVELS_PER_SUBMIT } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { type WebGpuGraphError } from "../../src/errors.js";
import { type UniformValues } from "../../src/kernel/struct-block.js";
import { type SsspOptions } from "../../src/types/accelerator.js";
import { type GpuSsspResult } from "../../src/types/traversal.js";
import {
    completeEdges,
    type EdgeSpec,
    gridEdges,
    KARATE_EDGES,
    pathEdges,
    randomEdges,
    randomEdgesLoose,
    rmatEdges,
    snapshotOf,
    starEdges,
    xorshift,
} from "../helpers/graphs.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { recordNoiseRow } from "../helpers/noise-floor.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import {
    absorbPath,
    distBits,
    relSpread,
    SSSP_F32_VS_F64,
    ssspReport,
    ssspTolerance,
    WEIGHT2_DELTA,
    WEIGHT2_ROUNDS,
    weightedEdges,
    weightTwoPath,
    zeroPlateau,
} from "../helpers/sssp.js";
import { expectPredArcAttains, expectTriangleInequality } from "../helpers/traversal-check.js";
import { bfsOracle, dijkstraOracle } from "../oracle/traversal.js";
import { acquire, requireGpu } from "../setup/gpu.js";

/** One weighted fixture: its edges, an optional node count (isolated vertices above the edges' indices) and the sources to run from (`-1` = the last index). */
interface Fixture {
    readonly name: string;
    readonly edges: readonly EdgeSpec[];
    readonly nodeCount?: number | undefined;
    readonly sources: readonly number[];
}

const FIXTURES: readonly Fixture[] = [
    { name: "karate/uniform", edges: weightedEdges(KARATE_EDGES, "uniform", 1), sources: [0, 16, -1] },
    { name: "grid30/integer", edges: weightedEdges(gridEdges(30, 30), "integer", 2), sources: [0, 465, -1] },
    // a third of the arcs at weight 0: the gate's zero-weight fixture
    { name: "grid30/zeros", edges: weightedEdges(gridEdges(30, 30), "zeros", 3), sources: [0, -1] },
    { name: "path500/uniform", edges: weightedEdges(pathEdges(500), "uniform", 4), sources: [0, 250, -1] },
    { name: "star10k/integer", edges: weightedEdges(starEdges(10_000), "integer", 5), sources: [0, -1] },
    { name: "complete64/uniform", edges: weightedEdges(completeEdges(64), "uniform", 6), sources: [0, -1] },
    // three isolated vertices above the random graph's indices (unreachable components); six decades of weight
    {
        name: "random1k-isolated/decades",
        edges: weightedEdges(randomEdges(1000, 5000, 1001), "decades", 7),
        nodeCount: 1003,
        sources: [0, -1],
    },
    // self-loops, parallels and the generator's own integer weights 1..10
    { name: "loose", edges: randomEdgesLoose(600, 2400, 7), nodeCount: 600, sources: [0, -1] },
    { name: "rmat14/decades", edges: weightedEdges(rmatEdges(14, 10, 7), "decades", 9), sources: [0, -1] },
    // PD-27's counterexamples: the zero-weight plateau and the f32 absorption plateau
    { name: "zeroPlateau8", edges: zeroPlateau(8), sources: [8] },
    // a plateau 69 hops deep: the hop passes need three batches (the re-record path of P8-T9 Step 5)
    { name: "zeroPlateau70", edges: zeroPlateau(70), sources: [70] },
    { name: "absorbPath8", edges: absorbPath(8), sources: [8] },
];

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
 * Every finite entry within `rel` (with the absolute floor) of the f64 oracle, and the same nodes unreached.
 * @param actual - the device's distances
 * @param expected - the f64 oracle's
 * @param rel - the derived tolerance
 * @param label - the scenario
 */
function expectWithinDerived(actual: ArrayLike<number>, expected: ArrayLike<number>, rel: number, label: string): void {
    const spread = relSpread(actual, expected);
    expect(spread, `${label}: dist (the dist buffer) vs the f64 oracle, relative spread`).toBeLessThanOrEqual(rel);
}

/** The BFS depths as f32 distances (`+Infinity` for `INVALID_INDEX`). */
function depthsAsDist(depth: ArrayLike<number>): F32 {
    const out = new Float32Array(depth.length);
    for (let v = 0; v < depth.length; v++) {
        out[v] = depth[v] === INVALID_INDEX ? Infinity : depth[v];
    }
    return out;
}

/**
 * A seeded per-ARC override, `arcCount` long, of the given constructor.
 * @param s - the snapshot
 * @param seed - the stream seed
 * @param make - the array constructor
 * @param draw - one weight from a uniform in [0, 1)
 * @returns the vector
 */
function overrideOf(
    s: GraphSnapshot,
    seed: number,
    make: (n: number) => NumericVector,
    draw: (u: number) => number,
): NumericVector {
    const random = xorshift(seed);
    const out = make(s.arcCount);
    for (let a = 0; a < s.arcCount; a++) {
        out[a] = draw(random());
    }
    return out;
}

describe("sssp (design 8.4 / 9.7; P8-T9)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "sssp" }));
        shared = ctx;
        return ctx;
    }

    /**
     * The differential of one run: twice through the tuning entry (which reads the counters block after every
     * submit), `dist` bitwise against the f32 oracle and within the derived tolerance of the f64 one, the triangle
     * inequality, `predArc` by the plateau rule, `reachedCount`, the two runs bitwise.
     */
    async function checkRun(
        ctx: GpuContext,
        label: string,
        s: GraphSnapshot,
        source: number,
        options?: SsspOptions,
        tuning?: SsspTuning,
    ): Promise<GpuSsspResult> {
        const cutoff = options?.cutoff;
        const want32 = dijkstraOracle(s, source, "f32", {
            cutoff: cutoff === undefined ? undefined : Math.fround(cutoff),
            weights: options?.weights,
        });
        const want64 = dijkstraOracle(s, source, "f64", { cutoff, weights: options?.weights });
        const blocks: UniformValues[] = [];
        const first = await ssspWithTuning(ctx, s, source, options, {
            ...tuning,
            onRound: (_round, block) => {
                blocks.push(block);
            },
        });
        const again: UniformValues[] = [];
        const second = await ssspWithTuning(ctx, s, source, options, {
            ...tuning,
            onRound: (_round, block) => {
                again.push(block);
            },
        });
        expect(first.dist).toBeInstanceOf(Float32Array);
        expect(first.dist).toHaveLength(s.nodeCount);
        expectBitwiseEqual(
            distBits(first.dist),
            distBits(want32.dist),
            `${label}: dist (the dist buffer) vs the f32 oracle`,
        );
        expectWithinDerived(first.dist, want64.dist, ssspTolerance().value, label);
        expectTriangleInequality(first.dist, s, options?.weights, cutoff);
        expectPredArcAttains(first.dist, first.predArc, s, source, "plateau", options?.weights);
        expect(first.reachedCount, `${label}: reachedCount`).toBe(want32.reachedCount);
        expectBitwiseEqual(distBits(second.dist), distBits(first.dist), `${label}: dist, run twice`);
        expectBitwiseEqual(second.predArc, first.predArc, `${label}: predArc (the pred buffer), run twice`);
        expect(second.reachedCount).toBe(first.reachedCount);
        // the near-far route's round count and pile counts follow the schedule (a near vertex relaxed before or
        // after a same-round neighbour improves it settles one round earlier or later), so of the counters block only
        // the words that are functions of the settled state are held bitwise: done and the seeded delta
        const unit = options?.weights === undefined ? s.flags.allWeightsOne : options.weights.every((w) => w === 1);
        if (!unit) {
            expect(blocks.length, `${label}: submits`).toBeGreaterThan(0);
            const last = blocks[blocks.length - 1];
            expect(last.done, `${label}: the done word`).toBe(1);
            expect(again[again.length - 1].done, `${label}: the done word, run twice`).toBe(1);
            expect(again[again.length - 1].deltaBits, `${label}: deltaBits, run twice`).toBe(last.deltaBits);
        } else {
            expect(blocks, `${label}: the unit route records no near-far round`).toEqual([]);
        }
        return first;
    }

    for (const fixture of FIXTURES) {
        for (const directed of [false, true]) {
            const kind = directed ? "directed" : "undirected";
            it(`${fixture.name} (${kind}): dist bitwise vs the f32 oracle and within the derived tolerance of the f64 one, the triangle inequality, predArc by the plateau rule, reachedCount, run twice`, async (t) => {
                const ctx = await context(t);
                const s = snapshotOf(fixture.edges, {
                    directed,
                    nodeCount: fixture.nodeCount,
                    label: `${fixture.name}-${kind}`,
                });
                expect(s.flags.allWeightsOne, `${fixture.name}: a weighted fixture`).toBe(false);
                for (const raw of fixture.sources) {
                    const source = raw < 0 ? s.nodeCount - 1 : raw;
                    await checkRun(ctx, `${fixture.name} ${kind} from ${source}`, s, source);
                }
                ctx.release(s);
            }, 300_000);
        }
    }

    it("the empty graph is E_INVALID_ARGUMENT { argument: 'source' } for any source; so is a source outside [0, n)", async (t) => {
        const ctx = await context(t);
        const empty = snapshotOf([], { nodeCount: 0, label: "sssp-empty" });
        for (const source of [0, 1, -1]) {
            const err = await expectRejection(sssp(ctx, empty, source), "E_INVALID_ARGUMENT");
            expect(err.details).toMatchObject({ argument: "source" });
        }
        const karate = snapshotOf(weightedEdges(KARATE_EDGES, "uniform", 1), { label: "sssp-karate-source" });
        for (const source of [34, -1, 1.5, Number.NaN]) {
            const err = await expectRejection(sssp(ctx, karate, source), "E_INVALID_ARGUMENT");
            expect(err.details).toMatchObject({ argument: "source" });
        }
        ctx.release(karate);
    });

    it("cutoff on the weighted route (the integer grid from the corner): an integer distance some node attains exactly is reached (the <= case), -1 is the source alone, Infinity is no cap, a non-integer cap between two integers is the floor's set, NaN is E_INVALID_ARGUMENT { argument: 'cutoff' } before any device work", async (t) => {
        const ctx = await context(t);
        const grid = snapshotOf(weightedEdges(gridEdges(30, 30), "integer", 2), { label: "sssp-grid-cutoff" });
        const full = dijkstraOracle(grid, 0, "f32");
        const attained = full.dist[465];
        expect(Number.isInteger(attained)).toBe(true);
        const exact = await checkRun(ctx, `grid30/integer cutoff ${attained}`, grid, 0, { cutoff: attained });
        expect(exact.dist[465], "the node at the cutoff is reached").toBe(attained);
        let beyond = 0;
        for (const d of full.dist) {
            if (d > attained) {
                beyond += 1;
            }
        }
        expect(beyond, "some node lies beyond the cutoff").toBeGreaterThan(0);
        expect(exact.reachedCount).toBe(full.reachedCount - beyond);
        const half = await checkRun(ctx, `grid30/integer cutoff ${attained + 0.5}`, grid, 0, {
            cutoff: attained + 0.5,
        });
        expectBitwiseEqual(distBits(half.dist), distBits(exact.dist), "cutoff + 0.5 vs the integer cutoff: dist");
        const alone = await checkRun(ctx, "grid30/integer cutoff -1", grid, 0, { cutoff: -1 });
        expect(alone.reachedCount).toBe(1);
        expect(alone.dist[0]).toBe(0);
        const uncapped = await checkRun(ctx, "grid30/integer cutoff Infinity", grid, 0, { cutoff: Infinity });
        expectBitwiseEqual(distBits(uncapped.dist), distBits(full.dist), "cutoff Infinity vs no cap: dist");
        const nan = await expectRejection(sssp(ctx, grid, 0, { cutoff: Number.NaN }), "E_INVALID_ARGUMENT");
        expect(nan.details).toMatchObject({ argument: "cutoff" });
        ctx.release(grid);
    }, 120_000);

    it("the unit-weight route (PD-22): on an unweighted snapshot sssp(s, source) with no options (the element's call) is the BFS -- dist the depths as f32, predArc a tight arc one depth down, reachedCount the visited count; cutoff Infinity is the same, 2.5 reaches depth <= 2, -1 the source alone, NaN is refused; an all-ones override on a weighted snapshot takes the same route", async (t) => {
        const ctx = await context(t);
        for (const [name, edges, sources] of [
            ["grid30", gridEdges(30, 30), [0, 465]],
            ["path500", pathEdges(500), [0, 499]],
        ] as const) {
            const s = snapshotOf(edges, { label: `sssp-unit-${name}` });
            expect(s.weights).toBeNull();
            for (const source of sources) {
                const label = `${name} unit from ${source}`;
                const plain = await checkRun(ctx, label, s, source);
                const bfs = await breadthFirstSearch(ctx, s, source);
                expectBitwiseEqual(plain.dist, depthsAsDist(bfs.depth), `${label}: dist vs the BFS depths`);
                expect(plain.reachedCount).toBe(bfs.visitedCount);
                const uncapped = await checkRun(ctx, `${label} cutoff Infinity`, s, source, { cutoff: Infinity });
                expectBitwiseEqual(uncapped.dist, plain.dist, `${label}: cutoff Infinity vs no cap`);
                const two = await checkRun(ctx, `${label} cutoff 2.5`, s, source, { cutoff: 2.5 });
                const capped = bfsOracle(s, source, 2);
                expectBitwiseEqual(two.dist, depthsAsDist(capped.depth), `${label}: cutoff 2.5 vs maxDepth 2`);
                expect(two.reachedCount).toBe(capped.visitedCount);
                const alone = await checkRun(ctx, `${label} cutoff -1`, s, source, { cutoff: -1 });
                expect(alone.reachedCount).toBe(1);
                const nan = await expectRejection(sssp(ctx, s, source, { cutoff: Number.NaN }), "E_INVALID_ARGUMENT");
                expect(nan.details).toMatchObject({ argument: "cutoff" });
            }
            ctx.release(s);
        }
        const weighted = snapshotOf(weightedEdges(gridEdges(30, 30), "integer", 2), { label: "sssp-unit-override" });
        expect(weighted.flags.allWeightsOne).toBe(false);
        const ones = new Float32Array(weighted.arcCount).fill(1);
        const routed = await checkRun(ctx, "weighted grid, all-ones override", weighted, 0, { weights: ones });
        expectBitwiseEqual(
            routed.dist,
            depthsAsDist(bfsOracle(weighted, 0).depth),
            "all-ones override: dist vs the depths",
        );
        ctx.release(weighted);
    }, 300_000);

    it("weights overrides (PD-22): an F64 vector differing from the column on the weighted grid; an integer U32 vector on the unweighted path and an F32 one on the unweighted grid, bitwise the f32 oracle's on that vector and NOT the depths (the option is never dropped when the snapshot's own flags say unit weights); a short vector is E_INVALID_ARGUMENT { argument: 'weights' }", async (t) => {
        const ctx = await context(t);
        const grid = snapshotOf(weightedEdges(gridEdges(30, 30), "integer", 2), { label: "sssp-override-grid" });
        const f64 = overrideOf(
            grid,
            21,
            (n) => new Float64Array(n),
            (u) => 0.1 + 9.9 * u,
        );
        const column = dijkstraOracle(grid, 0, "f32");
        const overridden = await checkRun(ctx, "weighted grid, F64 override", grid, 0, { weights: f64 });
        expect(distBits(overridden.dist)).not.toEqual(distBits(column.dist));
        ctx.release(grid);
        for (const [name, edges, make] of [
            ["path500", pathEdges(500), (n: number): NumericVector => new Uint32Array(n)],
            ["grid30", gridEdges(30, 30), (n: number): NumericVector => new Float32Array(n)],
        ] as const) {
            const s = snapshotOf(edges, { label: `sssp-override-${name}` });
            expect(s.flags.allWeightsOne).toBe(true);
            expect(s.weights).toBeNull();
            const vector = overrideOf(s, 22, make, (u) => 1 + Math.floor(u * 10));
            const got = await checkRun(ctx, `unweighted ${name}, integer override`, s, 0, { weights: vector });
            expect(distBits(got.dist), `${name}: an override's dist is not the depths`).not.toEqual(
                distBits(depthsAsDist(bfsOracle(s, 0).depth)),
            );
            const short = await expectRejection(
                sssp(ctx, s, 0, { weights: new Float32Array(s.arcCount - 1) }),
                "E_INVALID_ARGUMENT",
            );
            expect(short.details).toMatchObject({ argument: "weights" });
            ctx.release(s);
        }
    }, 300_000);

    it("a negative weight (a column or an override) is E_UNSUPPORTED { feature: 'sssp.negativeWeights' } with a bellmanFord hint; a NaN or an infinite override is E_UNSUPPORTED { feature: 'sssp.nonFiniteWeights' }; all before any device work", async (t) => {
        const ctx = await context(t);
        const negative = snapshotOf(
            [
                [0, 1, 1],
                [1, 2, -1],
            ],
            { label: "sssp-negative" },
        );
        expect(negative.flags.nonNegativeWeights).toBe(false);
        const column = await expectRejection(sssp(ctx, negative, 0), "E_UNSUPPORTED");
        expect(column.details).toMatchObject({ feature: "sssp.negativeWeights" });
        expect(String(column.details.hint)).toContain("bellmanFord");
        ctx.release(negative);
        const grid = snapshotOf(gridEdges(10, 10), { label: "sssp-bad-override" });
        const minus = new Float32Array(grid.arcCount).fill(1);
        minus[7] = -0.5;
        const override = await expectRejection(sssp(ctx, grid, 0, { weights: minus }), "E_UNSUPPORTED");
        expect(override.details).toMatchObject({ feature: "sssp.negativeWeights" });
        for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
            const vector = new Float32Array(grid.arcCount).fill(2);
            vector[3] = bad;
            const err = await expectRejection(sssp(ctx, grid, 0, { weights: vector }), "E_UNSUPPORTED");
            expect(err.details).toMatchObject({ feature: "sssp.nonFiniteWeights" });
        }
        ctx.release(grid);
    });

    it("the round count, exact and derived: the 64-node path at weight 2 under delta 32 dispatches 64 near rounds and three far pass-throughs (the level word reads 67), and no far entry is ever dropped (every node reached)", async (t) => {
        const ctx = await context(t);
        const path = snapshotOf(weightTwoPath(), { label: "sssp-weight2" });
        const blocks: UniformValues[] = [];
        const result = await ssspWithTuning(ctx, path, 0, undefined, {
            delta: WEIGHT2_DELTA,
            onRound: (_round, block) => {
                blocks.push(block);
            },
        });
        expect(result.reachedCount).toBe(path.nodeCount);
        expectBitwiseEqual(distBits(result.dist), distBits(dijkstraOracle(path, 0, "f32").dist), "weight-2 path: dist");
        const last = blocks[blocks.length - 1];
        expect(last.done, "the done word").toBe(1);
        expect(last.level, "the level word (rounds dispatched)").toBe(WEIGHT2_ROUNDS);
        // at cadence 1 every submit is one round: the block after submit k is round k's
        const perRound: UniformValues[] = [];
        await ssspWithTuning(ctx, path, 0, undefined, {
            delta: WEIGHT2_DELTA,
            roundsPerSubmit: 1,
            onRound: (_round, block) => {
                perRound.push(block);
            },
        });
        expect(perRound).toHaveLength(WEIGHT2_ROUNDS + 1);
        const modes = perRound.slice(0, WEIGHT2_ROUNDS).map((block) => Number(block.direction));
        expect(
            modes.filter((mode) => mode === 1),
            "the far rounds",
        ).toHaveLength(3);
        expect(modes.indexOf(1), "the first far round follows the first bucket's 16 near rounds").toBe(16);
        ctx.release(path);
    }, 120_000);

    it("the run options: dest is filled and returned as dist, a wrong dest is E_INVALID_ARGUMENT, an aborted signal is E_ABORTED, onProgress reports per submit, a bad roundsPerSubmit is refused", async (t) => {
        const ctx = await context(t);
        const path = snapshotOf(weightedEdges(pathEdges(100), "uniform", 8), { label: "sssp-options" });
        const n = path.nodeCount;
        const dest = new Float32Array(n);
        const seen: number[] = [];
        const result = await sssp(ctx, path, 0, {
            dest,
            onProgress: (done) => {
                seen.push(done);
            },
        });
        expect(result.dist).toBe(dest);
        expectBitwiseEqual(
            distBits(dest),
            distBits(dijkstraOracle(path, 0, "f32").dist),
            "dest (the dist buffer) vs the f32 oracle",
        );
        expect(seen.length).toBeGreaterThan(0);
        for (let i = 1; i < seen.length; i++) {
            expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
        }
        const wrong = await expectRejection(sssp(ctx, path, 0, { dest: new Uint32Array(n) }), "E_INVALID_ARGUMENT");
        expect(wrong.details).toMatchObject({ argument: "dest" });
        const short = await expectRejection(
            sssp(ctx, path, 0, { dest: new Float32Array(n - 1) }),
            "E_INVALID_ARGUMENT",
        );
        expect(short.details).toMatchObject({ argument: "dest" });
        const controller = new AbortController();
        controller.abort();
        await expectRejection(sssp(ctx, path, 0, { signal: controller.signal }), "E_ABORTED");
        for (const roundsPerSubmit of [0, MAX_LEVELS_PER_SUBMIT + 1, 1.5]) {
            const err = await expectRejection(
                ssspWithTuning(ctx, path, 0, undefined, { roundsPerSubmit }),
                "E_INVALID_ARGUMENT",
            );
            expect(err.details).toMatchObject({ argument: "roundsPerSubmit" });
        }
        // the unit route forwards dest and the signal too
        const unit = snapshotOf(pathEdges(100), { label: "sssp-options-unit" });
        const unitDest = new Float32Array(n);
        const unitResult = await sssp(ctx, unit, 0, { dest: unitDest });
        expect(unitResult.dist).toBe(unitDest);
        await expectRejection(sssp(ctx, unit, 0, { signal: controller.signal }), "E_ABORTED");
        ctx.release(unit);
        ctx.release(path);
    });

    it("the f32-versus-f64 Dijkstra spread over every fixture and source is under the derived tolerance (recorded as the noise-floor row it derives from under GRAPHTY_NOISE_FLOOR_WRITE=1)", () => {
        let worst = 0;
        let worstAbs = 0;
        let samples = 0;
        for (const fixture of FIXTURES) {
            for (const directed of [false, true]) {
                const s = snapshotOf(fixture.edges, { directed, nodeCount: fixture.nodeCount });
                for (const raw of fixture.sources) {
                    const source = raw < 0 ? s.nodeCount - 1 : raw;
                    const f32 = dijkstraOracle(s, source, "f32").dist;
                    const f64 = dijkstraOracle(s, source, "f64").dist;
                    worst = Math.max(worst, relSpread(f32, f64));
                    for (let v = 0; v < s.nodeCount; v++) {
                        if (f64[v] !== Infinity) {
                            worstAbs = Math.max(worstAbs, Math.abs(f32[v] - f64[v]));
                            samples += 1;
                        }
                    }
                }
            }
        }
        console.warn(
            `[sssp] f32-vs-f64 spread ${worst.toExponential(3)} (abs ${worstAbs.toExponential(3)}) over ${samples} finite distances`,
        );
        expect(Number.isFinite(worst)).toBe(true);
        recordNoiseRow({
            id: SSSP_F32_VS_F64,
            kernel: "sssp-relax",
            fixture: "p8-t9-fixtures",
            comparison: "oracle-f64",
            a: "oracle-f32",
            b: "oracle-f64",
            maxRelError: worst,
            maxAbsError: worstAbs,
            samples,
        });
        expect(worst, "the spread vs the tolerance in use").toBeLessThanOrEqual(ssspTolerance().value);
    });

    it("the sabotage check passes on the real kernels (factor 0)", async (t) => {
        const ctx = await context(t);
        const report = await ssspReport(ctx);
        expect(report.worst).toBe(0);
        assertCheckPasses(report);
    }, 120_000);
});
