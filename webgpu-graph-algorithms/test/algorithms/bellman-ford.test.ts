/**
 * Bellman-Ford with negative-cycle detection (design 8.4, 3.3 line 809, 9.7, 11.3; P8-T10, the P8 plan's PD-12 /
 * PD-22 / PD-27) against the f32 Bellman-Ford oracle, the f64 Dijkstra where the weights are non-negative and `sssp`
 * on the same graph and option -- every readback naming its buffer: the P8-T9 fixture list with weights (the
 * non-negative ones, cross-checked bitwise against `sssp`), a directed DAG with negative arcs, a planted negative
 * cycle reachable from the source (the gate's item), the same cycle unreachable (the flag must be FALSE: the case a
 * naive implementation gets wrong), a zero-weight cycle (false), an undirected graph with a negative edge (a
 * negative cycle of length two: TRUE), `cutoff` on the non-negative fixtures exactly as P8-T9 normalises it (`NaN`
 * refused before any device work, -1 the source alone, Infinity no cap, an integer attained exactly), the `weights`
 * override on an unweighted snapshot (never dropped, PD-22) and an asymmetric override on an undirected snapshot
 * (refused before any device work, because the kernel reads one weight per logical edge), the directed identity
 * path whose `edgeToArc` the driver binds as an iota, PD-27's two counterexamples under the tight-subgraph rule, and
 * the rounded cycle the driver refuses; `dist` BITWISE against the f32 oracle, `predArc` EXACTLY the arc PD-27's
 * tight rule picks with every chain walked to the source, run-twice bitwise, `retryExhaustedRounds === 0` on every
 * fixture so the bound is known to be adequate, and the reported round count at most `n - 1`.
 */

import { type F32, type GraphSnapshot, INVALID_INDEX, type NumericVector, type U32 } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import {
    bellmanFord,
    type BellmanFordRun,
    type BellmanFordTuning,
    bellmanFordWithTuning,
} from "../../src/algorithms/bellman-ford.js";
import { breadthFirstSearch } from "../../src/algorithms/bfs.js";
import { sssp } from "../../src/algorithms/sssp.js";
import { MAX_LEVELS_PER_SUBMIT } from "../../src/constants.js";
import { GpuContext } from "../../src/context.js";
import { type WebGpuGraphError } from "../../src/errors.js";
import { verifyDevice } from "../../src/primitives/verify.js";
import { type SsspOptions } from "../../src/types/accelerator.js";
import {
    bellmanFordReport,
    fanIn,
    GRID_WITH_CYCLE_NODES,
    gridWithCycle,
    negativeDag,
    ROUNDED_CYCLE_NODES,
    roundedCycle,
} from "../helpers/bellman-ford.js";
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
import { LeakCounter } from "../helpers/leak-counter.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { absorbPath, distBits, relSpread, ssspTolerance, weightedEdges, zeroPlateau } from "../helpers/sssp.js";
import { expectPredArcAttains, expectTriangleInequality } from "../helpers/traversal-check.js";
import { bellmanFordOracle, bfsOracle, dijkstraOracle } from "../oracle/traversal.js";
import { acquire, acquireRaw, requireGpu } from "../setup/gpu.js";

/** One fixture: its edges, an optional node count and the sources to run from (`-1` = the last index). */
interface Fixture {
    readonly name: string;
    readonly edges: readonly EdgeSpec[];
    readonly nodeCount?: number | undefined;
    readonly sources: readonly number[];
}

/** The P8-T9 fixture list (every weight non-negative), run directed and undirected. */
const FIXTURES: readonly Fixture[] = [
    { name: "karate/uniform", edges: weightedEdges(KARATE_EDGES, "uniform", 1), sources: [0, 16, -1] },
    { name: "grid30/integer", edges: weightedEdges(gridEdges(30, 30), "integer", 2), sources: [0, 465, -1] },
    { name: "grid30/zeros", edges: weightedEdges(gridEdges(30, 30), "zeros", 3), sources: [0, -1] },
    { name: "path500/uniform", edges: weightedEdges(pathEdges(500), "uniform", 4), sources: [0, 250, -1] },
    { name: "star10k/integer", edges: weightedEdges(starEdges(10_000), "integer", 5), sources: [0, -1] },
    { name: "complete64/uniform", edges: weightedEdges(completeEdges(64), "uniform", 6), sources: [0, -1] },
    {
        name: "random1k-isolated/decades",
        edges: weightedEdges(randomEdges(1000, 5000, 1001), "decades", 7),
        nodeCount: 1003,
        sources: [0, -1],
    },
    { name: "loose", edges: randomEdgesLoose(600, 2400, 7), nodeCount: 600, sources: [0, -1] },
    { name: "rmat14/decades", edges: weightedEdges(rmatEdges(14, 10, 7), "decades", 9), sources: [0, -1] },
    // PD-27's counterexamples under the tight-subgraph rule
    { name: "zeroPlateau8", edges: zeroPlateau(8), sources: [8] },
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

/** The BFS depths as f32 distances (`+Infinity` for `INVALID_INDEX`). */
function depthsAsDist(depth: ArrayLike<number>): F32 {
    const out = new Float32Array(depth.length);
    for (let v = 0; v < depth.length; v++) {
        out[v] = depth[v] === INVALID_INDEX ? Infinity : depth[v];
    }
    return out;
}

/** The reached mask of a distance array. */
function reachedOf(dist: ArrayLike<number>): boolean[] {
    return Array.from({ length: dist.length }, (_, v) => dist[v] !== Infinity);
}

/** Whether a per-arc vector (or the snapshot's column when absent) has a negative entry. */
function hasNegative(s: GraphSnapshot, weights: NumericVector | undefined): boolean {
    const vector = weights ?? s.weights;
    if (vector === null) {
        return false;
    }
    for (const w of vector) {
        if (w < 0) {
            return true;
        }
    }
    return false;
}

/**
 * With a negative cycle the chains are still acyclic (the key strictly decreases along them) but may end short of
 * the source at a node the tight subgraph never reached: every chain either reaches the source or `INVALID_INDEX`
 * within `n` steps, and never revisits a node.
 * @param predArc - the predecessor arcs
 * @param s - the snapshot
 * @param source - the source node index
 */
function expectPredChainsAcyclic(predArc: U32, s: GraphSnapshot, source: number): void {
    const n = s.nodeCount;
    for (let v = 0; v < n; v++) {
        let cur = v;
        let steps = 0;
        while (cur !== source && predArc[cur] !== INVALID_INDEX) {
            const arc = predArc[cur];
            expect(arc, `predArc[${cur}] is an arc`).toBeLessThan(s.arcCount);
            // the source of an arc: the row whose range holds it
            let u = 0;
            while (s.rowPtr[u + 1] <= arc) {
                u += 1;
            }
            cur = u;
            steps += 1;
            expect(steps, `predArc chain from node ${v} revisits a node (a cycle)`).toBeLessThanOrEqual(n);
        }
    }
}

/**
 * A per-EDGE seeded integer weight 1..10 expanded to the arcs of an undirected snapshot (both arcs of an edge equal).
 * @param s - the undirected snapshot
 * @param seed - the stream seed
 * @returns the symmetric per-arc vector
 */
function symmetricIntegerOverride(s: GraphSnapshot, seed: number): F32 {
    const random = xorshift(seed);
    const perEdge = new Float32Array(s.edgeCount);
    for (let e = 0; e < s.edgeCount; e++) {
        perEdge[e] = 1 + Math.floor(random() * 10);
    }
    const out = new Float32Array(s.arcCount);
    for (let a = 0; a < s.arcCount; a++) {
        out[a] = perEdge[s.arcToEdge[a]];
    }
    return out;
}

describe("bellmanFord (design 8.4 / 9.7; P8-T10)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "bellman-ford" }));
        shared = ctx;
        return ctx;
    }

    /**
     * The differential of one run: twice through the tuning entry; the flag against the oracle's; without a negative
     * cycle `dist` bitwise against the f32 oracle (the dist buffer), the triangle inequality, `predArc` by the tight
     * rule with every chain walked to the source, `reachedCount`, both runs bitwise, and where the weights are
     * non-negative the f64 Dijkstra within the derived tolerance and `sssp`'s `dist` on the same option bitwise; with
     * a negative cycle the reached set, the count, the flag twice and acyclic chains; `retryExhaustedRounds === 0`
     * and the reported rounds at most `n - 1` on every run.
     */
    async function checkRun(
        ctx: GpuContext,
        label: string,
        s: GraphSnapshot,
        source: number,
        options?: SsspOptions,
        tuning?: BellmanFordTuning,
    ): Promise<BellmanFordRun> {
        const n = s.nodeCount;
        const negative = hasNegative(s, options?.weights);
        const cutoff = options?.cutoff;
        // the Bellman-Ford oracle has no cutoff: a cutoff run is compared with the f32 Dijkstra, non-negative only
        if (cutoff !== undefined) {
            expect(negative, `${label}: a cutoff case runs on a non-negative fixture only`).toBe(false);
        }
        const want =
            cutoff === undefined
                ? bellmanFordOracle(s, source, options?.weights)
                : {
                      ...dijkstraOracle(s, source, "f32", { cutoff: Math.fround(cutoff), weights: options?.weights }),
                      hasNegativeCycle: false,
                  };
        const first = await bellmanFordWithTuning(ctx, s, source, options, tuning ?? {});
        const second = await bellmanFordWithTuning(ctx, s, source, options, tuning ?? {});
        const { result } = first;
        expect(result.dist).toBeInstanceOf(Float32Array);
        expect(result.dist).toHaveLength(n);
        expect(result.predArc).toHaveLength(n);
        expect(result.hasNegativeCycle, `${label}: hasNegativeCycle (the flags block)`).toBe(want.hasNegativeCycle);
        expect(second.result.hasNegativeCycle, `${label}: hasNegativeCycle, run twice`).toBe(want.hasNegativeCycle);
        expect(first.retryExhaustedRounds, `${label}: retryExhaustedRounds`).toBe(0);
        expect(second.retryExhaustedRounds, `${label}: retryExhaustedRounds, run twice`).toBe(0);
        expect(first.rounds, `${label}: rounds (at most n - 1)`).toBeLessThanOrEqual(Math.max(0, n - 1));
        expect(result.reachedCount, `${label}: reachedCount`).toBe(want.reachedCount);
        expect(reachedOf(result.dist), `${label}: the reached set (the dist buffer)`).toEqual(reachedOf(want.dist));
        if (want.hasNegativeCycle) {
            // the last round's values: the schedule decides which improvement of the cycle landed last
            expectPredChainsAcyclic(result.predArc, s, source);
            expect(second.result.reachedCount).toBe(result.reachedCount);
            return first;
        }
        expectBitwiseEqual(
            distBits(result.dist),
            distBits(want.dist),
            `${label}: dist (the dist buffer) vs the f32 oracle`,
        );
        expectTriangleInequality(result.dist, s, options?.weights, cutoff);
        expectPredArcAttains(result.dist, result.predArc, s, source, "tight", options?.weights);
        expectBitwiseEqual(distBits(second.result.dist), distBits(result.dist), `${label}: dist, run twice`);
        expectBitwiseEqual(second.result.predArc, result.predArc, `${label}: predArc (the pred buffer), run twice`);
        expect(second.result.reachedCount).toBe(result.reachedCount);
        if (!negative) {
            const want64 = dijkstraOracle(s, source, "f64", { cutoff, weights: options?.weights });
            expect(
                relSpread(result.dist, want64.dist),
                `${label}: dist vs the f64 oracle, relative spread`,
            ).toBeLessThanOrEqual(ssspTolerance().value);
            const near = await sssp(ctx, s, source, options);
            expectBitwiseEqual(distBits(near.dist), distBits(result.dist), `${label}: dist vs sssp on the same option`);
            expect(near.reachedCount).toBe(result.reachedCount);
        }
        return first;
    }

    for (const fixture of FIXTURES) {
        for (const directed of [false, true]) {
            const kind = directed ? "directed" : "undirected";
            it(`${fixture.name} (${kind}): dist bitwise vs the f32 oracle and sssp, within the derived tolerance of the f64 one, the triangle inequality, predArc by the tight rule, reachedCount, no negative cycle, run twice`, async (t) => {
                const ctx = await context(t);
                const s = snapshotOf(fixture.edges, {
                    directed,
                    nodeCount: fixture.nodeCount,
                    label: `${fixture.name}-${kind}`,
                });
                expect(s.flags.allWeightsOne, `${fixture.name}: a weighted fixture`).toBe(false);
                for (const raw of fixture.sources) {
                    const source = raw < 0 ? s.nodeCount - 1 : raw;
                    const run = await checkRun(ctx, `${fixture.name} ${kind} from ${source}`, s, source);
                    expect(run.result.hasNegativeCycle).toBe(false);
                }
                ctx.release(s);
            }, 300_000);
        }
    }

    it("a directed DAG with negative arcs: no negative cycle, some distance negative, dist bitwise vs the f32 oracle, every chain reaches the source", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(negativeDag(300, 1500, 13), { directed: true, label: "bf-dag" });
        expect(s.flags.nonNegativeWeights).toBe(false);
        const run = await checkRun(ctx, "negativeDag from 0", s, 0);
        expect(run.result.hasNegativeCycle).toBe(false);
        expect(Math.min(...run.result.dist), "some distance is negative").toBeLessThan(0);
        expect(run.result.reachedCount).toBeGreaterThan(100);
        ctx.release(s);
    }, 120_000);

    it("a planted negative cycle reachable from the source is reported (dist and predArc are the last round's, chains acyclic); the same cycle unreachable from the source is NOT (the naive case); a zero-weight cycle is not; an undirected negative edge is a negative cycle of length two", async (t) => {
        const ctx = await context(t);
        const planted = snapshotOf(gridWithCycle(-3, true), {
            directed: true,
            nodeCount: GRID_WITH_CYCLE_NODES,
            label: "bf-planted",
        });
        const found = await checkRun(ctx, "plantedCycle from 0", planted, 0);
        expect(found.result.hasNegativeCycle).toBe(true);
        expect(found.rounds, "every one of the n - 1 rounds ran before the decision round").toBe(
            GRID_WITH_CYCLE_NODES - 1,
        );
        // from inside the cycle too
        expect((await checkRun(ctx, "plantedCycle from 901", planted, 901)).result.hasNegativeCycle).toBe(true);
        ctx.release(planted);
        const unreachable = snapshotOf(gridWithCycle(-3, false), {
            directed: true,
            nodeCount: GRID_WITH_CYCLE_NODES,
            label: "bf-unreachable",
        });
        const missed = await checkRun(ctx, "unreachableCycle from 0", unreachable, 0);
        expect(missed.result.hasNegativeCycle).toBe(false);
        expect(missed.result.reachedCount).toBe(900);
        // from a node of the cycle it IS reachable
        expect((await checkRun(ctx, "unreachableCycle from 900", unreachable, 900)).result.hasNegativeCycle).toBe(true);
        ctx.release(unreachable);
        const zero = snapshotOf(gridWithCycle(0, true), {
            directed: true,
            nodeCount: GRID_WITH_CYCLE_NODES,
            label: "bf-zero-cycle",
        });
        const flat = await checkRun(ctx, "zeroCycle from 0", zero, 0);
        expect(flat.result.hasNegativeCycle).toBe(false);
        expect(flat.result.reachedCount).toBe(GRID_WITH_CYCLE_NODES);
        expect(Array.from(flat.result.dist.subarray(900, 903))).toEqual([1, 2, 3]);
        ctx.release(zero);
        const edges = weightedEdges(KARATE_EDGES, "uniform", 1).map((edge, e) =>
            e === 3 ? ([edge[0], edge[1], -0.5] as const) : edge,
        );
        const undirected = snapshotOf(edges, { label: "bf-undirected-negative" });
        expect(undirected.directed).toBe(false);
        const two = await checkRun(ctx, "karate with a negative edge from 0", undirected, 0);
        expect(two.result.hasNegativeCycle).toBe(true);
        ctx.release(undirected);
    }, 300_000);

    it("cutoff on the non-negative integer grid, exactly as sssp: an integer distance some node attains is reached (the <= case), -1 is the source alone, Infinity is no cap, NaN is E_INVALID_ARGUMENT { argument: 'cutoff' } before any device work", async (t) => {
        const ctx = await context(t);
        const grid = snapshotOf(weightedEdges(gridEdges(30, 30), "integer", 2), { label: "bf-grid-cutoff" });
        const full = dijkstraOracle(grid, 0, "f32");
        const attained = full.dist[465];
        expect(Number.isInteger(attained)).toBe(true);
        const exact = await checkRun(ctx, `grid30/integer cutoff ${attained}`, grid, 0, { cutoff: attained });
        expect(exact.result.dist[465], "the node at the cutoff is reached").toBe(attained);
        expect(exact.result.reachedCount).toBeLessThan(full.reachedCount);
        const alone = await checkRun(ctx, "grid30/integer cutoff -1", grid, 0, { cutoff: -1 });
        expect(alone.result.reachedCount).toBe(1);
        expect(alone.result.dist[0]).toBe(0);
        const uncapped = await checkRun(ctx, "grid30/integer cutoff Infinity", grid, 0, { cutoff: Infinity });
        expectBitwiseEqual(distBits(uncapped.result.dist), distBits(full.dist), "cutoff Infinity vs no cap: dist");
        const nan = await expectRejection(bellmanFord(ctx, grid, 0, { cutoff: Number.NaN }), "E_INVALID_ARGUMENT");
        expect(nan.details).toMatchObject({ argument: "cutoff" });
        ctx.release(grid);
    }, 120_000);

    it("weights overrides (PD-22): an integer override on the unweighted path500 is bitwise the f32 oracle's on that vector and NOT the depths; on an undirected snapshot an override whose two arcs of one edge differ is E_UNSUPPORTED { feature: 'bellmanFord.asymmetricUndirectedWeights' } before any device work, and the same override made symmetric runs and equals sssp", async (t) => {
        requireGpu(t);
        const { device } = await acquireRaw();
        const counter = LeakCounter.wrap(device);
        const own = GpuContext.from(device);
        try {
            const path = snapshotOf(pathEdges(500), { label: "bf-override-path" });
            expect(path.flags.allWeightsOne).toBe(true);
            expect(path.weights).toBeNull();
            const vector = symmetricIntegerOverride(path, 22);
            const got = await checkRun(own, "unweighted path500, integer override", path, 0, { weights: vector });
            expect(distBits(got.result.dist), "an override's dist is not the depths").not.toEqual(
                distBits(depthsAsDist(bfsOracle(path, 0).depth)),
            );
            // one reverse arc's weight raised by one: the forward arc of its edge no longer agrees
            const asymmetric = new Float32Array(vector);
            let reverse = -1;
            for (let a = 0; a < path.arcCount; a++) {
                if (path.edgeToArc[path.arcToEdge[a]] !== a) {
                    reverse = a;
                    break;
                }
            }
            expect(reverse).toBeGreaterThanOrEqual(0);
            asymmetric[reverse] += 1;
            await verifyDevice(own);
            counter.resetMapAsync();
            const err = await expectRejection(bellmanFord(own, path, 0, { weights: asymmetric }), "E_UNSUPPORTED");
            expect(err.details).toMatchObject({ feature: "bellmanFord.asymmetricUndirectedWeights" });
            expect(String(err.details.hint)).toContain("directed");
            expect(counter.mapAsyncCalls, "no device work before the refusal").toBe(0);
            const symmetric = new Float32Array(asymmetric);
            symmetric[path.edgeToArc[path.arcToEdge[reverse]]] += 1;
            const again = await checkRun(own, "unweighted path500, symmetric override", path, 0, {
                weights: symmetric,
            });
            expect(again.result.reachedCount).toBe(path.nodeCount);
            own.release(path);
        } finally {
            own.dispose();
        }
        counter.restore();
    }, 300_000);

    it("the directed identity path (pathEdges(64), weights a + 1): arcToEdge is the identity, the residency binds no edgeToArc (the driver's iota), dist bitwise vs the f32 oracle, the reported rounds at most n - 1", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(
            pathEdges(64).map(([u, v], a) => [u, v, a + 1] as const),
            { directed: true, label: "bf-identity-path" },
        );
        expect(s.flags.arcToEdgeIsIdentity).toBe(true);
        expect(ctx.residency.core(s, ["rowPtr", "colIdx", "weights", "edgeToArc"]).edgeToArc).toBeNull();
        expect(new Set(s.weights ?? []).size, "no two arcs share a weight").toBe(s.arcCount);
        const run = await checkRun(ctx, "identity path from 0", s, 0);
        expect(run.result.reachedCount).toBe(64);
        expect(run.rounds).toBeLessThanOrEqual(63);
        console.warn(`[bellmanFord] identity path: ${run.rounds} rounds before the decision round`);
        // the last node's distance is the sum 1 + 2 + ... + 63 = 2016 (exact in f32)
        expect(run.result.dist[63]).toBe(2016);
        ctx.release(s);
    }, 120_000);

    it("the rounded cycle (0 -> 1 at 2^24, 1 -> 2 at +1, 2 -> 1 at -1, frozen with spare nodes so n - 1 rounds settle it): the f32 oracle settles at [0, 2^24 - 1, 2^24] with the flag false, and the call is E_UNSUPPORTED { feature: 'bellmanFord.roundedCycle' } because the tight subgraph never reaches node 1", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(roundedCycle(), {
            directed: true,
            nodeCount: ROUNDED_CYCLE_NODES,
            label: "bf-rounded-cycle",
        });
        const want = bellmanFordOracle(s, 0);
        expect(Array.from(want.dist.subarray(0, 3))).toEqual([0, 2 ** 24 - 1, 2 ** 24]);
        expect(want.hasNegativeCycle).toBe(false);
        const err = await expectRejection(bellmanFord(ctx, s, 0), "E_UNSUPPORTED");
        expect(err.details).toMatchObject({ feature: "bellmanFord.roundedCycle" });
        ctx.release(s);
    });

    it("the unit route (PD-22): an unweighted snapshot is the BFS -- dist the depths as f32, hasNegativeCycle false, reachedCount the visited count; an all-ones override on a weighted snapshot takes the same route", async (t) => {
        const ctx = await context(t);
        const grid = snapshotOf(gridEdges(30, 30), { label: "bf-unit-grid" });
        expect(grid.weights).toBeNull();
        const plain = await checkRun(ctx, "grid30 unit from 0", grid, 0);
        const bfs = await breadthFirstSearch(ctx, grid, 0);
        expectBitwiseEqual(plain.result.dist, depthsAsDist(bfs.depth), "unit route: dist vs the BFS depths");
        expect(plain.result.hasNegativeCycle).toBe(false);
        expect(plain.result.reachedCount).toBe(bfs.visitedCount);
        expect(plain.rounds).toBe(0);
        ctx.release(grid);
        const weighted = snapshotOf(weightedEdges(gridEdges(30, 30), "integer", 2), { label: "bf-unit-override" });
        const ones = new Float32Array(weighted.arcCount).fill(1);
        const routed = await checkRun(ctx, "weighted grid, all-ones override", weighted, 0, { weights: ones });
        expectBitwiseEqual(
            routed.result.dist,
            depthsAsDist(bfsOracle(weighted, 0).depth),
            "all-ones override: dist vs the depths",
        );
        ctx.release(weighted);
    }, 120_000);

    it("the errors and the run options: source, dest, a short / NaN / infinite weights vector, an aborted signal, a bad tuning; onProgress is monotone; dest is filled and returned", async (t) => {
        const ctx = await context(t);
        const empty = snapshotOf([], { nodeCount: 0, label: "bf-empty" });
        for (const source of [0, 1, -1]) {
            const err = await expectRejection(bellmanFord(ctx, empty, source), "E_INVALID_ARGUMENT");
            expect(err.details).toMatchObject({ argument: "source" });
        }
        const path = snapshotOf(weightedEdges(pathEdges(100), "uniform", 8), { label: "bf-options" });
        const n = path.nodeCount;
        for (const source of [100, -1, 1.5, Number.NaN]) {
            const err = await expectRejection(bellmanFord(ctx, path, source), "E_INVALID_ARGUMENT");
            expect(err.details).toMatchObject({ argument: "source" });
        }
        const dest = new Float32Array(n);
        const seen: number[] = [];
        const result = await bellmanFord(ctx, path, 0, {
            dest,
            onProgress: (done) => {
                seen.push(done);
            },
        });
        expect(result.dist).toBe(dest);
        expectBitwiseEqual(distBits(dest), distBits(bellmanFordOracle(path, 0).dist), "dest (the dist buffer)");
        expect(seen.length).toBeGreaterThan(0);
        for (let i = 1; i < seen.length; i++) {
            expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
        }
        const wrong = await expectRejection(
            bellmanFord(ctx, path, 0, { dest: new Uint32Array(n) }),
            "E_INVALID_ARGUMENT",
        );
        expect(wrong.details).toMatchObject({ argument: "dest" });
        const short = await expectRejection(
            bellmanFord(ctx, path, 0, { weights: new Float32Array(path.arcCount - 1) }),
            "E_INVALID_ARGUMENT",
        );
        expect(short.details).toMatchObject({ argument: "weights" });
        for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
            const vector = new Float32Array(path.arcCount).fill(2);
            vector[3] = bad;
            const err = await expectRejection(bellmanFord(ctx, path, 0, { weights: vector }), "E_UNSUPPORTED");
            expect(err.details).toMatchObject({ feature: "bellmanFord.nonFiniteWeights" });
        }
        const controller = new AbortController();
        controller.abort();
        await expectRejection(bellmanFord(ctx, path, 0, { signal: controller.signal }), "E_ABORTED");
        for (const maxRetries of [0, -1, 1.5]) {
            const err = await expectRejection(
                bellmanFordWithTuning(ctx, path, 0, undefined, { maxRetries }),
                "E_INVALID_ARGUMENT",
            );
            expect(err.details).toMatchObject({ argument: "maxRetries" });
        }
        for (const roundsPerBatch of [0, MAX_LEVELS_PER_SUBMIT + 1, 1.5]) {
            const err = await expectRejection(
                bellmanFordWithTuning(ctx, path, 0, undefined, { roundsPerBatch }),
                "E_INVALID_ARGUMENT",
            );
            expect(err.details).toMatchObject({ argument: "roundsPerBatch" });
        }
        ctx.release(path);
    });

    it("PD-12, the bound is real: on the fan-in whose 4,096 distinct ascending candidates land in one round, maxRetries 1 makes the losing lanes exhaust the bound (retryExhaustedRounds >= 1, dist still exact because the next round repairs a lost update) while under the default bound the reloaded value is the smallest candidate and no lane retries past its first failure (retryExhaustedRounds 0)", async (t) => {
        const ctx = await context(t);
        const fan = snapshotOf(fanIn(4096), { directed: true, label: "bf-fan-in" });
        const want = bellmanFordOracle(fan, 0);
        const bounded = await bellmanFordWithTuning(ctx, fan, 0, undefined, { maxRetries: 1 });
        expect(bounded.retryExhaustedRounds, "retryExhaustedRounds under maxRetries 1").toBeGreaterThanOrEqual(1);
        expectBitwiseEqual(distBits(bounded.result.dist), distBits(want.dist), "fan-in, maxRetries 1: dist");
        expect(bounded.result.hasNegativeCycle).toBe(false);
        const run = await checkRun(ctx, "fanIn4096 from 0", fan, 0);
        expect(run.result.dist[4097]).toBe(2);
        ctx.release(fan);
    }, 120_000);

    it("the sabotage check passes on the real kernels (factor 0)", async (t) => {
        const ctx = await context(t);
        const report = await bellmanFordReport(ctx);
        expect(report.worst).toBe(0);
        assertCheckPasses(report);
    }, 120_000);
});
