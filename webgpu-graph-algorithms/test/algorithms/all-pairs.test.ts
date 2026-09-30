/**
 * All-pairs shortest paths (design 8.7, 3.3 line 813, 9.7, 11.3) against the shipped CPU port
 * (`allPairsShortestPath` of @graphty/algorithms: exact unweighted, `1e-5` weighted) and the two CPU references of
 * test/oracle/all-pairs.ts: the unweighted matrix EXACTLY equal to one breadth-first search per source (integers are
 * exact in f32), the weighted matrix BITWISE equal to Floyd-Warshall in the blocked order with f32 rounding (the
 * device's own order of additions) and within design 9.7's `1e-5` of the textbook f64 Floyd-Warshall; the triangle
 * inequality over every arc and source; symmetry on undirected snapshots, bitwise; the run twice, bitwise; and the
 * snapshot's checksums intact afterwards (no kernel wrote into a view). The fixtures are the design 11.3 list sized so
 * `n * n` stays small -- the empty graph, one node, a self-loop, karate, the 30 x 30 grid, the 500-path, the
 * 1000-star, K64, the 101-cycle, seeded G(n, m) with and without self-loops and parallels, directed and undirected,
 * weighted and not, a disconnected graph -- plus the two sizes the blocking alone can get wrong: 33 nodes and
 * `32 x 33 + 1 = 1057`, where exactly one tile of each kind is a partial edge tile. Then `weighted: false`, the
 * refusals (a negative or non-finite weight, a wrong `dest`, an aborted signal, the node count one above the
 * device's ceiling), the submit split, and the ceiling arithmetic.
 */

import { allPairsShortestPath as cpuAllPairsShortestPath } from "@graphty/algorithms";
import { type GraphSnapshot } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import { allPairsCeiling, allPairsShortestPath, allPairsWithTuning } from "../../src/algorithms/all-pairs.js";
import { type GpuContext } from "../../src/context.js";
import { type WebGpuGraphError } from "../../src/errors.js";
import { allPairsReport, blockedF32, PARALLEL_EDGES } from "../helpers/all-pairs.js";
import {
    completeEdges,
    cycleEdges,
    type EdgeSpec,
    gridEdges,
    KARATE_EDGES,
    pathEdges,
    randomEdges,
    randomEdgesLoose,
    snapshotOf,
    starEdges,
} from "../helpers/graphs.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { relSpread, weightedEdges } from "../helpers/sssp.js";
import {
    apspRowsOracle,
    expectMatrixTriangleInequality,
    expectSymmetric,
    floydWarshallOracle,
} from "../oracle/all-pairs.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

/** Design 9.7 line 3327: all-pairs parity is exact unweighted and `1e-5` relative weighted. */
const WEIGHTED_REL = 1e-5;

/** One fixture: its edges, directedness and node count. */
interface Fixture {
    readonly name: string;
    readonly edges: readonly EdgeSpec[];
    readonly directed?: boolean | undefined;
    readonly nodeCount?: number | undefined;
}

/** The largest n of the scaled fixtures on this adapter (1057 on hardware, 50 on a software adapter at 1 / 50). */
const BIG = gpuScale() < 1 ? 50 : 1057;

const FIXTURES: readonly Fixture[] = [
    { name: "empty", edges: [], nodeCount: 0 },
    { name: "one-node", edges: [], nodeCount: 1 },
    { name: "self-loop", edges: [[0, 0, 4]] },
    { name: "parallel", edges: PARALLEL_EDGES },
    { name: "karate", edges: KARATE_EDGES },
    { name: "karate/uniform", edges: weightedEdges(KARATE_EDGES, "uniform", 1) },
    { name: "grid30", edges: gridEdges(30, 30) },
    { name: "grid30/integer", edges: weightedEdges(gridEdges(30, 30), "integer", 2) },
    { name: "path500/uniform", edges: weightedEdges(pathEdges(500), "uniform", 4) },
    { name: "star1000", edges: starEdges(1000) },
    { name: "complete64/uniform", edges: weightedEdges(completeEdges(64), "uniform", 6) },
    { name: "cycle101/directed", edges: cycleEdges(101), directed: true },
    {
        name: "random300/decades/directed",
        edges: weightedEdges(randomEdges(300, 900, 9), "decades", 9),
        directed: true,
    },
    { name: "loose/directed", edges: randomEdgesLoose(400, 1600, 7), directed: true, nodeCount: 400 },
    { name: "loose/undirected", edges: randomEdgesLoose(400, 1600, 8), nodeCount: 400 },
    // three isolated vertices above the random graph's indices
    { name: "disconnected", edges: weightedEdges(randomEdges(200, 300, 11), "integer", 12), nodeCount: 203 },
    // one partial edge tile of each kind
    { name: "random33/uniform", edges: weightedEdges(randomEdges(33, 80, 13), "uniform", 14) },
    {
        name: `random${BIG}/uniform/directed`,
        edges: weightedEdges(randomEdges(BIG, 4 * BIG, 15), "uniform", 16),
        directed: true,
    },
    { name: `random${BIG}`, edges: randomEdges(BIG, 3 * BIG, 17) },
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

describe("allPairsShortestPath (design 8.7 / 9.7)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "all-pairs" });
    });

    afterAll(() => {
        ctx.dispose();
    });

    for (const fixture of FIXTURES) {
        it(`${fixture.name}: the matrix against the references, the invariants, run twice bitwise, the snapshot unchanged`, async (t: TestContext) => {
            requireGpu(t);
            const s = snapshotOf(fixture.edges, {
                directed: fixture.directed,
                nodeCount: fixture.nodeCount,
                checksum: true,
            });
            const n = s.nodeCount;
            const weighted = s.weights !== null && !s.flags.allWeightsOne;
            try {
                const first = await allPairsShortestPath(ctx, s);
                const second = await allPairsShortestPath(ctx, s);
                expect(first.n).toBe(n);
                expect(first.dist.length).toBe(n * n);
                expectBitwiseEqual(first.dist, second.dist, `${fixture.name}: dist run twice`);
                if (weighted) {
                    expect(Array.from(first.dist), `${fixture.name}: dist vs the blocked f32 reference`).toEqual(
                        Array.from(blockedF32(s, true)),
                    );
                    const f64 = floydWarshallOracle(s, { weighted: true, precision: "f64" });
                    const spread = relSpread(first.dist, f64);
                    console.warn(`[all-pairs] ${fixture.name}: f32 vs the f64 textbook sweep, relative ${spread}`);
                    expect(spread, `${fixture.name}: dist vs the f64 reference`).toBeLessThanOrEqual(WEIGHTED_REL);
                    const cpu = cpuAllPairsShortestPath(s).dist;
                    expect(relSpread(first.dist, cpu), `${fixture.name}: dist vs the CPU port`).toBeLessThanOrEqual(
                        WEIGHTED_REL,
                    );
                } else {
                    expect(Array.from(first.dist), `${fixture.name}: dist vs one BFS per source`).toEqual(
                        Array.from(apspRowsOracle(s)),
                    );
                    expect(Array.from(first.dist), `${fixture.name}: dist vs the CPU port`).toEqual(
                        Array.from(cpuAllPairsShortestPath(s).dist),
                    );
                }
                expectMatrixTriangleInequality(first.dist, s, weighted, weighted ? WEIGHTED_REL : 0);
                if (!s.directed) {
                    expectSymmetric(first.dist, n);
                }
                for (let i = 0; i < n; i++) {
                    expect(first.dist[i * n + i], `${fixture.name}: the diagonal at ${i}`).toBe(0);
                }
                s.validate({ checksum: true });
            } finally {
                ctx.release(s);
            }
        }, 120_000);
    }

    it("weighted: false on a weighted snapshot computes hop counts: bitwise the unweighted snapshot's matrix", async (t) => {
        requireGpu(t);
        const weighted = snapshotOf(weightedEdges(KARATE_EDGES, "uniform", 1));
        const plain = snapshotOf(KARATE_EDGES);
        try {
            const hops = await allPairsShortestPath(ctx, weighted, { weighted: false });
            const want = await allPairsShortestPath(ctx, plain);
            expectBitwiseEqual(hops.dist, want.dist, "weighted: false vs unweighted");
            const distances = await allPairsShortestPath(ctx, weighted, { weighted: true });
            expect(Array.from(distances.dist)).not.toEqual(Array.from(hops.dist));
        } finally {
            ctx.release(weighted);
            ctx.release(plain);
        }
    });

    it("a negative weight is E_UNSUPPORTED { feature: 'allPairs.negativeWeights' } before any device work; weighted: false runs", async (t) => {
        requireGpu(t);
        const s = snapshotOf([
            [0, 1, -1],
            [1, 2, 2],
        ]);
        try {
            const err = await expectRejection(allPairsShortestPath(ctx, s), "E_UNSUPPORTED");
            expect(err.details).toMatchObject({ feature: "allPairs.negativeWeights" });
            const { dist } = await allPairsShortestPath(ctx, s, { weighted: false });
            expect(Array.from(dist)).toEqual([0, 1, 2, 1, 0, 1, 2, 1, 0]);
        } finally {
            ctx.release(s);
        }
    });

    it("an infinite weight is E_UNSUPPORTED { feature: 'allPairs.nonFiniteWeights' }", async (t) => {
        requireGpu(t);
        const s = snapshotOf([
            [0, 1, Infinity],
            [1, 2, 2],
        ]);
        try {
            const err = await expectRejection(allPairsShortestPath(ctx, s), "E_UNSUPPORTED");
            expect(err.details).toMatchObject({ feature: "allPairs.nonFiniteWeights" });
        } finally {
            ctx.release(s);
        }
    });

    it("dest of length n * n is filled and returned; any other length is E_INVALID_ARGUMENT", async (t) => {
        requireGpu(t);
        const s = snapshotOf(pathEdges(5));
        try {
            const dest = new Float32Array(25);
            const result = await allPairsShortestPath(ctx, s, { dest });
            expect(result.dist).toBe(dest);
            expect(dest[4]).toBe(4);
            const err = await expectRejection(
                allPairsShortestPath(ctx, s, { dest: new Float32Array(24) }),
                "E_INVALID_ARGUMENT",
            );
            expect(err.details).toMatchObject({ argument: "dest" });
        } finally {
            ctx.release(s);
        }
    });

    it("an aborted signal is E_ABORTED before the first submit and between submits", async (t) => {
        requireGpu(t);
        const s = snapshotOf(randomEdges(100, 300, 21));
        try {
            const before = new AbortController();
            before.abort();
            await expectRejection(allPairsShortestPath(ctx, s, { signal: before.signal }), "E_ABORTED");
            const between = new AbortController();
            const progress: number[] = [];
            await expectRejection(
                allPairsWithTuning(
                    ctx,
                    s,
                    {
                        signal: between.signal,
                        onProgress: (done) => {
                            progress.push(done);
                            between.abort();
                        },
                    },
                    { roundsPerSubmit: 1 },
                ),
                "E_ABORTED",
            );
            expect(progress).toEqual([1]);
        } finally {
            ctx.release(s);
        }
    });

    it("roundsPerSubmit 1 (one submit per round) is bitwise the single-submit sweep; onProgress counts rounds", async (t) => {
        requireGpu(t);
        const s = snapshotOf(weightedEdges(randomEdges(100, 300, 23), "uniform", 24));
        try {
            const progress: [number, number][] = [];
            const split = await allPairsWithTuning(
                ctx,
                s,
                { onProgress: (done, total) => progress.push([done, total]) },
                { roundsPerSubmit: 1 },
            );
            const whole = await allPairsShortestPath(ctx, s);
            expectBitwiseEqual(split.dist, whole.dist, "one submit per round vs one submit");
            expect(progress).toEqual([
                [1, 4],
                [2, 4],
                [3, 4],
                [4, 4],
            ]);
            await expectRejection(allPairsWithTuning(ctx, s, undefined, { roundsPerSubmit: 0 }), "E_INVALID_ARGUMENT");
        } finally {
            ctx.release(s);
        }
    });

    it("one node more than the device's ceiling is E_TOO_LARGE naming the node count, the ceiling, the limit and GpuContextOptions.limits", async (t) => {
        requireGpu(t);
        const { maxNodes, limit, limitName } = allPairsCeiling(ctx.caps.limits);
        const s: GraphSnapshot = snapshotOf([], { nodeCount: maxNodes + 1 });
        try {
            const err = await expectRejection(allPairsShortestPath(ctx, s), "E_TOO_LARGE");
            expect(err.message).toContain(`${maxNodes + 1} nodes`);
            expect(err.message).toContain(`at most ${maxNodes} nodes`);
            expect(err.message).toContain(`${limitName} of ${limit} bytes`);
            expect(err.message).toContain("GpuContextOptions.limits");
            expect(err.details).toMatchObject({ nodes: maxNodes + 1, maxNodes, limit, path: "allPairs.matrix" });
        } finally {
            ctx.release(s);
        }
    });

    it("the ceiling is floor(sqrt(limit / 4)) over the smaller of the two buffer limits: 5,792 / 23,170 / 32,767 (design 8.7)", () => {
        const at = (binding: number, buffer = 2 ** 40): number =>
            allPairsCeiling({ maxStorageBufferBindingSize: binding, maxBufferSize: buffer }).maxNodes;
        expect(at(128 * 2 ** 20)).toBe(5792);
        expect(at(2 ** 31 - 4)).toBe(23170);
        expect(at(2 ** 32 - 4)).toBe(32767);
        expect(at(4 * 100 * 100)).toBe(100);
        expect(at(4 * 100 * 100 - 1)).toBe(99);
        expect(allPairsCeiling({ maxStorageBufferBindingSize: 2 ** 31, maxBufferSize: 256 * 2 ** 20 })).toMatchObject({
            maxNodes: 8192,
            limitName: "maxBufferSize",
        });
    });

    it("the sabotage report passes on the real kernels (factor 0)", async (t) => {
        requireGpu(t);
        const report = await allPairsReport(ctx);
        expect(report.worst).toBe(0);
        assertCheckPasses(report);
    }, 120_000);
});
