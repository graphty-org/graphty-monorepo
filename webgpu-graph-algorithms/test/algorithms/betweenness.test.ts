/**
 * Betweenness and edge betweenness (design 8.4, 9.7, 11.3) against the Brandes reference of test/oracle/betweenness.ts
 * and, on every simple fixture, the CPU port's `betweennessCentrality` / `edgeBetweennessCentrality`. Covered: the batch
 * planner's k against faked limits (pure); the forward pass on its own -- every batch's `depthK` exactly the
 * reference's depths and `sigmaK` exactly its path counts, at k = 1, k = 2 and the planner's k; the overflow flag on
 * the layered fixture and its control; the published scores within 1e-4 on the fixture list with the top-k order,
 * run twice bitwise; the closed forms of the path and the star; `normalized`; the frontier, edge-parallel and
 * automatic forward forms bitwise identical, and the automatic choice picking each form where it should; faked
 * limits shrinking k without changing a bit of the scores; sampling (an explicit list equals the reference on the
 * same list, `k` draws the same sources every time, the result is the unscaled sum, and a 256-source sample ranks
 * like the exact scores); edge betweenness (the arcs of an undirected edge equal before the fold, the folded scores
 * against the reference, the path's closed form, a sample against the reference on the same sources); parallel edges
 * counted as distinct paths, unlike the CPU; the edge list left unuploaded by a one-batch run; and the refusals before
 * any device work.
 */

import {
    accelerated,
    betweennessCentrality as cpuBetweenness,
    edgeBetweennessCentrality as cpuEdgeBetweenness,
    PathCountOverflowError,
} from "@graphty/algorithms";
import { type F32, type GraphSnapshot } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import { createAccelerator } from "../../src/accelerator.js";
import {
    type BetweennessBatchReport,
    betweennessCentrality,
    type BetweennessTuning,
    betweennessWithTuning,
    edgeBetweennessCentrality,
    edgeBetweennessWithTuning,
    planBatchSize,
} from "../../src/algorithms/betweenness.js";
import { type GpuContext } from "../../src/context.js";
import { type WebGpuGraphError } from "../../src/errors.js";
import { type BetweennessAcceleratorOptions } from "../../src/types/accelerator.js";
import { limitsForK } from "../helpers/betweenness.js";
import {
    arcPairGap,
    edgeConvention,
    scoreError,
    spearman,
    topKAgrees,
    vertexConvention,
} from "../helpers/centrality-check.js";
import {
    completeEdges,
    cycleEdges,
    type EdgeSpec,
    gridEdges,
    KARATE_EDGES,
    layeredEdges,
    pathEdges,
    randomEdges,
    randomEdgesLoose,
    rmatEdges,
    snapshotOf,
    starEdges,
    wideAndNarrowEdges,
} from "../helpers/graphs.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { brandesOracle } from "../oracle/betweenness.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

/** Design 9.7's betweenness tolerance; the f32 reference sits 2.6e-6 from the f64 one on the random 2k fixture. */
const TOLERANCE = 1e-4;

/** Awaits a rejection and asserts its code. */
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
 * An edge list without its weights: the kernel counts hops, and refuses a weighted snapshot.
 * @param edges - the edge list
 * @returns the same edges, unweighted
 */
function hops(edges: readonly EdgeSpec[]): EdgeSpec[] {
    return edges.map(([u, v]) => [u, v] as const);
}

/** The fixture list of design 13 row P9 (sized by gpuScale on a software adapter). */
function fixtures(): readonly { readonly name: string; readonly s: GraphSnapshot }[] {
    const big = gpuScale() < 1 ? 400 : 2000;
    return [
        { name: "karate", s: snapshotOf(KARATE_EDGES) },
        { name: "path(500)", s: snapshotOf(pathEdges(500)) },
        { name: "star(1000)", s: snapshotOf(starEdges(1000)) },
        { name: "cycle(101)", s: snapshotOf(cycleEdges(101)) },
        { name: "grid(15, 15)", s: snapshotOf(gridEdges(15, 15)) },
        { name: `random(${big}, ${4 * big}, 7)`, s: snapshotOf(randomEdges(big, 4 * big, 7)) },
        { name: "complete(64)", s: snapshotOf(completeEdges(64)) },
        { name: "disconnected", s: snapshotOf([...pathEdges(20), [30, 31], [31, 32]], { nodeCount: 40 }) },
        { name: "directed random(300, 1200, 5)", s: snapshotOf(randomEdges(300, 1200, 5), { directed: true }) },
        { name: "loops and parallels(200, 800, 9)", s: snapshotOf(hops(randomEdgesLoose(200, 800, 9))) },
    ];
}

describe("betweenness batch planner (design 8.4, 10.1)", () => {
    it("k = min(binding / 4n, 0.25 x maxBufferSize / 16n, 64, remaining), at least 1; a faked maxBufferSize shrinks it", () => {
        const dawn = { maxStorageBufferBindingSize: 128 * 2 ** 20, maxBufferSize: 256 * 2 ** 20 };
        expect(planBatchSize(100_000, 256, dawn)).toBe(41); // the budget: floor(64 MiB / 1.6 MB); the binding allows 335
        expect(planBatchSize(34, 34, dawn)).toBe(34);
        expect(planBatchSize(34, 1000, dawn)).toBe(64);
        expect(planBatchSize(1000, 1000, { ...dawn, maxBufferSize: 64 * 16 * 1000 * 4 })).toBe(64);
        expect(planBatchSize(1000, 1000, { ...dawn, maxBufferSize: 8 * 16 * 1000 * 4 })).toBe(8);
        expect(planBatchSize(1000, 1000, { ...dawn, maxBufferSize: 1 })).toBe(1);
        expect(planBatchSize(1000, 1000, { maxStorageBufferBindingSize: 4000 * 3, maxBufferSize: 2 ** 40 })).toBe(3);
        expect(() => planBatchSize(1000, 1, { maxStorageBufferBindingSize: 3999, maxBufferSize: 2 ** 40 })).toThrow(
            /E_TOO_LARGE|maxStorageBufferBindingSize = 3999/,
        );
        // `ends` is 4 (n + 2) bytes in one binding: the largest n one source fits is binding / 4 - 2
        const binding = dawn.maxStorageBufferBindingSize;
        expect(planBatchSize(binding / 4 - 2, 1, dawn)).toBe(1);
        expect(() => planBatchSize(binding / 4 - 1, 1, dawn)).toThrow(/maxStorageBufferBindingSize/);
    });
});

describe("betweennessCentrality and edgeBetweennessCentrality (design 8.4 / 9.7)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "betweenness" }));
        shared = ctx;
        return ctx;
    }

    /** A run that also collects every batch's report (and its arrays when asked). */
    async function collect(
        ctx: GpuContext,
        s: GraphSnapshot,
        options: BetweennessAcceleratorOptions | undefined,
        tuning: BetweennessTuning,
    ): Promise<{ scores: F32; batches: BetweennessBatchReport[]; overflow: boolean; sourcesUsed: number }> {
        const batches: BetweennessBatchReport[] = [];
        const result = await betweennessWithTuning(ctx, s, options, {
            ...tuning,
            onBatch: (report) => batches.push(report),
        });
        return { scores: result.scores, batches, overflow: result.sigmaOverflow, sourcesUsed: result.sourcesUsed };
    }

    /** Every batch's depthK and sigmaK exactly the reference's, per tag. */
    function expectForwardExact(s: GraphSnapshot, batches: readonly BetweennessBatchReport[], label: string): void {
        const n = s.nodeCount;
        for (const batch of batches) {
            const { perSource } = brandesOracle(s, { sources: batch.sources });
            const { depthK } = batch;
            const { sigmaK } = batch;
            expect(depthK, label).not.toBeNull();
            expect(sigmaK, label).not.toBeNull();
            if (depthK === null || sigmaK === null) {
                return;
            }
            let maxDepth = 0;
            batch.sources.forEach((_, tag) => {
                const want = perSource[tag];
                for (let v = 0; v < n; v++) {
                    const depth = depthK[tag * n + v];
                    expect(depth === 0xffffffff ? -1 : depth, `${label}: depth[${tag}][${v}]`).toBe(want.depth[v]);
                    expect(sigmaK[tag * n + v], `${label}: sigma[${tag}][${v}]`).toBe(want.sigma[v]);
                    maxDepth = Math.max(maxDepth, want.depth[v]);
                }
            });
            expect(batch.levels, `${label}: levels`).toBe(maxDepth + 1);
            expect(batch.ends[0]).toBe(0);
            expect(batch.ends[1], `${label}: the seeds are level 0`).toBe(batch.sources.length);
        }
    }

    it("the forward pass alone: depthK and sigmaK exactly the reference's at k = 1, k = 2 and the planner's k", async (t) => {
        const ctx = await context(t);
        const cases: readonly [string, GraphSnapshot][] = [
            ["karate", snapshotOf(KARATE_EDGES)],
            ["grid(15, 15)", snapshotOf(gridEdges(15, 15))],
            ["directed random(300, 1200, 5)", snapshotOf(randomEdges(300, 1200, 5), { directed: true })],
            ["loops and parallels(200, 800, 9)", snapshotOf(hops(randomEdgesLoose(200, 800, 9)))],
        ];
        for (const [name, s] of cases) {
            const sources = [0, 3, 7, 11, 19].filter((v) => v < s.nodeCount);
            for (const k of [1, 2, null]) {
                const limits = k === null ? undefined : limitsForK(s.nodeCount, k);
                for (const forward of ["frontier", "edge"] as const) {
                    const run = await collect(ctx, s, { sources }, { limits, forward, readArrays: true });
                    expectForwardExact(s, run.batches, `${name} k=${k ?? "planned"} ${forward}`);
                    expect(run.batches.length).toBe(k === null ? 1 : Math.ceil(sources.length / k));
                }
            }
        }
    }, 120_000);

    it("path counts past 2^32 (grid(20, 20), grid(40, 40), layered(4, 18)) are rescaled level by level and equal the CPU in both forward forms", async (t) => {
        const ctx = await context(t);
        // grid(40, 40) has C(78, 39), about 2.6e22, corner-to-corner paths: past u32 and far past f32's 2^24 integers
        for (const [name, s] of [
            ["grid(20, 20)", snapshotOf(gridEdges(20, 20))],
            ["grid(40, 40)", snapshotOf(gridEdges(40, 40))],
            ["layered(4, 18)", snapshotOf(layeredEdges(4, 18))],
        ] as const) {
            const want = cpuBetweenness(s).scores;
            for (const forward of ["frontier", "edge"] as const) {
                const got = await collect(ctx, s, undefined, { forward });
                expect(got.overflow, `${name} ${forward}`).toBe(false);
                expect(got.batches[0].scaled, `${name} ${forward}: the first batch's u32 counts wrap`).toBe(true);
                expect(scoreError(got.scores, want), `${name} ${forward}`).toBeLessThanOrEqual(TOLERANCE);
            }
            const edges = await edgeBetweennessCentrality(ctx, s);
            expect(edges.sigmaOverflow, name).toBe(false);
            expect(scoreError(edges.scores, cpuEdgeBetweenness(s).scores), name).toBeLessThanOrEqual(TOLERANCE);
        }
    }, 300_000);

    it("the overflow flag: counts at one depth spread wider than f32 can hold (wideAndNarrow(130)) raise it and the dispatcher refuses the scores; wideAndNarrow(100) does not", async (t) => {
        const ctx = await context(t);
        for (const forward of ["frontier", "edge"] as const) {
            const over = await betweennessWithTuning(
                ctx,
                snapshotOf(wideAndNarrowEdges(130)),
                { sources: [0] },
                { forward },
            );
            expect(over.sigmaOverflow, forward).toBe(true);
            const under = snapshotOf(wideAndNarrowEdges(100));
            const fine = await betweennessWithTuning(ctx, under, { sources: [0] }, { forward });
            expect(fine.sigmaOverflow, forward).toBe(false);
            const want = vertexConvention(under, brandesOracle(under, { sources: [0] }).vertex);
            expect(scoreError(fine.scores, want), forward).toBeLessThanOrEqual(TOLERANCE);
        }
        const dispatch = accelerated(createAccelerator(ctx));
        await expect(
            dispatch.betweennessCentrality(snapshotOf(wideAndNarrowEdges(130)), { sources: [0] }),
        ).rejects.toBeInstanceOf(PathCountOverflowError);
    }, 120_000);

    it("exact betweenness on the fixture list within 1e-4 of the reference, top-10 order kept, bitwise run to run, the snapshot unchanged", async (t) => {
        const ctx = await context(t);
        for (const { name, s } of fixtures()) {
            const first = await betweennessCentrality(ctx, s);
            const second = await betweennessCentrality(ctx, s);
            expectBitwiseEqual(second.scores, first.scores);
            const want = vertexConvention(s, brandesOracle(s).vertex);
            const error = scoreError(first.scores, want);
            expect(error, name).toBeLessThanOrEqual(TOLERANCE);
            expect(topKAgrees(first.scores, want, 10), `${name}: top-10`).toBe(true);
            expect(first.sourcesUsed).toBe(s.nodeCount);
            expect(first.sigmaOverflow).toBe(false);
            expect(first.converged).toBe(true);
            expect(first.precision).toBe("f32");
        }
        const checked = snapshotOf(KARATE_EDGES, { checksum: true, label: "karate-checksum" });
        await betweennessCentrality(ctx, checked);
        await edgeBetweennessCentrality(ctx, checked);
        expect(() => checked.validate({ checksum: true })).not.toThrow();
    }, 300_000);

    it("every simple fixture equals the CPU port's betweennessCentrality and edgeBetweennessCentrality within 1e-4, exact, normalized and on a source list; the dispatcher's k runs the port's draw", async (t) => {
        const ctx = await context(t);
        const sources = [0, 3, 3, 7, 11];
        for (const { name, s } of fixtures()) {
            if (s.flags.multigraph) {
                continue; // the port collapses parallel edges and the dispatcher keeps multigraphs on it
            }
            for (const options of [{}, { normalized: true }, { sources }] as const) {
                const label = `${name} ${JSON.stringify(options)}`;
                const got = await betweennessCentrality(ctx, s, options);
                expect(scoreError(got.scores, cpuBetweenness(s, options).scores), label).toBeLessThanOrEqual(TOLERANCE);
                const edges = await edgeBetweennessCentrality(ctx, s, options);
                expect(scoreError(edges.scores, cpuEdgeBetweenness(s, options).scores), label).toBeLessThanOrEqual(
                    TOLERANCE,
                );
            }
        }
        const s = snapshotOf(randomEdges(1000, 4000, 21));
        const dispatch = accelerated(createAccelerator(ctx));
        const k = { k: 50 };
        expect(
            scoreError((await dispatch.betweennessCentrality(s, k)).scores, cpuBetweenness(s, k).scores),
        ).toBeLessThanOrEqual(TOLERANCE);
        expect(
            scoreError((await dispatch.edgeBetweennessCentrality(s, k)).scores, cpuEdgeBetweenness(s, k).scores),
        ).toBeLessThanOrEqual(TOLERANCE);
    }, 300_000);

    it("the closed forms: path(n) scores i (n - 1 - i); star(L) the hub L (L - 1) / 2 and every leaf 0; normalized divides by (n - 1)(n - 2) / 2", async (t) => {
        const ctx = await context(t);
        const n = 60;
        const path = await betweennessCentrality(ctx, snapshotOf(pathEdges(n)));
        expect(Array.from(path.scores)).toEqual(Array.from({ length: n }, (_, i) => i * (n - 1 - i)));
        const leaves = 300;
        const star = await betweennessCentrality(ctx, snapshotOf(starEdges(leaves)));
        expect(star.scores[0]).toBe((leaves * (leaves - 1)) / 2);
        expect(Array.from(star.scores.slice(1))).toEqual(new Array<number>(leaves).fill(0));
        const normalized = await betweennessCentrality(ctx, snapshotOf(pathEdges(n)), { normalized: true });
        const factor = ((n - 1) * (n - 2)) / 2;
        expect(
            scoreError(
                normalized.scores,
                Float64Array.from(path.scores, (x) => x / factor),
            ),
        ).toBeLessThanOrEqual(1e-7);
        const directed = snapshotOf(randomEdges(100, 400, 3), { directed: true });
        const norm = await betweennessCentrality(ctx, directed, { normalized: true });
        const want = vertexConvention(directed, brandesOracle(directed).vertex, true);
        expect(scoreError(norm.scores, want)).toBeLessThanOrEqual(TOLERANCE);
    }, 60_000);

    it("the three forward forms give bitwise identical scores; auto runs edge-parallel on a shallow graph and frontier on a deep one", async (t) => {
        const ctx = await context(t);
        const shallow = snapshotOf(rmatEdges(gpuScale() < 1 ? 9 : 12, 8, 3));
        const deep = snapshotOf(gridEdges(300, 3));
        for (const [name, s] of [
            ["rmat", shallow],
            ["grid(300, 3)", deep],
        ] as const) {
            const sources = [0, 1, 2, 3, 4, 5];
            const limits = limitsForK(s.nodeCount, 2);
            const frontier = await collect(ctx, s, { sources }, { limits, forward: "frontier" });
            const edge = await collect(ctx, s, { sources }, { limits, forward: "edge" });
            const auto = await collect(ctx, s, { sources }, { limits });
            expectBitwiseEqual(edge.scores, frontier.scores);
            expectBitwiseEqual(auto.scores, frontier.scores);
            expect(auto.batches[0].forward, `${name}: the first batch is always frontier-driven`).toBe("frontier");
            const later = auto.batches.slice(1).map((b) => b.forward);
            expect(later, name).toEqual(new Array<string>(later.length).fill(s === shallow ? "edge" : "frontier"));
            const exact = vertexConvention(s, brandesOracle(s, { sources }).vertex);
            expect(scoreError(frontier.scores, exact), name).toBeLessThanOrEqual(TOLERANCE);
        }
    }, 120_000);

    it("a faked maxBufferSize shrinks k and adds batches without changing a single bit of the scores", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(randomEdges(500, 2000, 13));
        const planned = await collect(ctx, s, undefined, {});
        const shrunk = await collect(ctx, s, undefined, {
            limits: {
                maxStorageBufferBindingSize: ctx.caps.limits.maxStorageBufferBindingSize,
                maxBufferSize: 5 * 16 * 500 * 4,
            },
        });
        expect(planned.batches[0].sources.length).toBeGreaterThan(5);
        expect(shrunk.batches[0].sources.length).toBe(5);
        expect(shrunk.batches.length).toBe(100);
        expect(shrunk.batches.length).toBeGreaterThan(planned.batches.length);
        expectBitwiseEqual(shrunk.scores, planned.scores);
    }, 120_000);

    it("sampling: an explicit list equals the reference on that list, unscaled; k draws the same sources every time; a 256-source sample ranks like the exact scores", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(randomEdges(1000, 4000, 21));
        const sources = [5, 17, 17, 400, 999, 3];
        const listed = await betweennessCentrality(ctx, s, { sources });
        expect(listed.sourcesUsed).toBe(sources.length);
        expect(
            scoreError(listed.scores, vertexConvention(s, brandesOracle(s, { sources }).vertex)),
        ).toBeLessThanOrEqual(TOLERANCE);
        const drawnA: number[] = [];
        const drawnB: number[] = [];
        const a = await betweennessWithTuning(ctx, s, { k: 50 }, { onBatch: (b) => drawnA.push(...b.sources) });
        const b = await betweennessWithTuning(ctx, s, { k: 50 }, { onBatch: (r) => drawnB.push(...r.sources) });
        expect(drawnA).toEqual(drawnB);
        expect(new Set(drawnA).size).toBe(50);
        expectBitwiseEqual(b.scores, a.scores);
        expect(a.sourcesUsed).toBe(50);
        expect(
            scoreError(a.scores, vertexConvention(s, brandesOracle(s, { sources: drawnA }).vertex)),
        ).toBeLessThanOrEqual(TOLERANCE);
        const all = Array.from({ length: s.nodeCount }, (_, i) => i);
        expectBitwiseEqual(
            (await betweennessCentrality(ctx, s, { sources: all })).scores,
            (await betweennessCentrality(ctx, s)).scores,
        );
        const sampled = await betweennessCentrality(ctx, s, { k: 256 });
        const exact = await betweennessCentrality(ctx, s);
        expect(spearman(sampled.scores, exact.scores)).toBeGreaterThanOrEqual(0.9);
    }, 120_000);

    it("edge betweenness: both arcs of an undirected edge equal before the fold, the folded scores within 1e-4 of the reference, the path's closed form (i + 1)(n - 1 - i), a sample against the reference on the same sources", async (t) => {
        const ctx = await context(t);
        for (const { name, s } of fixtures()) {
            let perArc: Float32Array | null = null;
            const got = await edgeBetweennessWithTuning(ctx, s, undefined, {}, (arcs) => {
                perArc = arcs;
            });
            expect(got.scores.length, name).toBe(s.edgeCount);
            if (s.arcCount > 0) {
                expect(perArc, name).not.toBeNull();
                expect(arcPairGap(s, perArc ?? new Float32Array(0)), `${name}: arc pairs`).toBeLessThanOrEqual(1e-5);
            }
            const want = edgeConvention(s, brandesOracle(s).perArc);
            expect(scoreError(got.scores, want), name).toBeLessThanOrEqual(TOLERANCE);
        }
        const n = 50;
        const path = await edgeBetweennessCentrality(ctx, snapshotOf(pathEdges(n)));
        expect(Array.from(path.scores)).toEqual(Array.from({ length: n - 1 }, (_, i) => (i + 1) * (n - 1 - i)));
        const three = await edgeBetweennessCentrality(ctx, snapshotOf(pathEdges(3)));
        expect(Array.from(three.scores)).toEqual([2, 2]);
        // a sample: from source 2 alone, edge {1, 2} lies on (2, 1) and (2, 0), edge {0, 1} on (2, 0); halved as the
        // vertex scores are. Its two arcs differ, so keeping one arc instead of summing both scores {0, 1} as 0.
        const fromTwo = await edgeBetweennessCentrality(ctx, snapshotOf(pathEdges(3)), { sources: [2] });
        expect(Array.from(fromTwo.scores)).toEqual([0.5, 1]);
        const sampledGraph = snapshotOf(randomEdges(1000, 4000, 21));
        for (const sources of [
            [5, 17, 17, 400, 999, 3],
            [0, 2],
        ]) {
            const sampled = await edgeBetweennessCentrality(ctx, sampledGraph, { sources });
            const want = edgeConvention(sampledGraph, brandesOracle(sampledGraph, { sources }).perArc);
            expect(scoreError(sampled.scores, want), `sources ${sources.join(",")}`).toBeLessThanOrEqual(TOLERANCE);
        }
        const normalized = await edgeBetweennessCentrality(ctx, snapshotOf(pathEdges(n)), { normalized: true });
        const factor = ((n - 1) * (n - 2)) / 2;
        expect(
            scoreError(
                normalized.scores,
                Float64Array.from(path.scores, (x) => x / factor),
            ),
        ).toBeLessThanOrEqual(1e-7);
    }, 300_000);

    it("parallel edges are distinct shortest paths, unlike the CPU package, which collapses them to one", async (t) => {
        const ctx = await context(t);
        const edges: EdgeSpec[] = [
            [0, 1],
            [0, 1],
            [1, 2],
            [0, 3],
            [3, 2],
        ];
        const s = snapshotOf(edges, { nodeCount: 4 });
        const got = (await betweennessCentrality(ctx, s)).scores;
        expect(scoreError(got, vertexConvention(s, brandesOracle(s).vertex))).toBeLessThanOrEqual(TOLERANCE);
        // 0 -> 2 has three shortest paths (two through 1, one through 3): vertex 1 carries 2/3 of the pair
        expect(got[1]).toBeCloseTo(2 / 3, 6);
        expect(cpuBetweenness(s).scores[1]).toBeCloseTo(0.5, 6);
    });

    it("a one-batch run leaves the edge list unuploaded; a pinned edge-parallel run uploads it", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(KARATE_EDGES);
        ctx.residency.core(s);
        const coreOnly = ctx.residency.stats().buffers;
        await betweennessCentrality(ctx, s);
        expect(ctx.residency.stats().buffers).toBe(coreOnly);
        await betweennessWithTuning(ctx, s, undefined, { forward: "edge" });
        expect(ctx.residency.stats().buffers).toBeGreaterThan(coreOnly);
        ctx.release(s);
    });

    it("the edge cases: the empty graph, one vertex, no sources, dest, onProgress and the signal", async (t) => {
        const ctx = await context(t);
        const empty = await betweennessCentrality(ctx, snapshotOf([], { nodeCount: 0 }));
        expect(empty.scores.length).toBe(0);
        expect(empty.sourcesUsed).toBe(0);
        const one = await betweennessCentrality(ctx, snapshotOf([], { nodeCount: 1 }));
        expect(Array.from(one.scores)).toEqual([0]);
        expect((await edgeBetweennessCentrality(ctx, snapshotOf([], { nodeCount: 3 }))).scores.length).toBe(0);
        const s = snapshotOf(KARATE_EDGES);
        const none = await betweennessCentrality(ctx, s, { sources: [] });
        expect(none.sourcesUsed).toBe(0);
        expect(Array.from(none.scores)).toEqual(new Array<number>(34).fill(0));
        const dest = new Float32Array(34);
        const progress: number[] = [];
        const into = await betweennessWithTuning(
            ctx,
            s,
            { dest, onProgress: (done) => progress.push(done) },
            { limits: limitsForK(34, 10) },
        );
        expect(into.scores).toBe(dest);
        expect(progress).toEqual([10, 20, 30, 34]);
        const controller = new AbortController();
        controller.abort();
        await expectRejection(betweennessCentrality(ctx, s, { signal: controller.signal }), "E_ABORTED");
    }, 60_000);

    it("refuses endpoints: true, bad sources, a bad k, a k that contradicts sources and a wrong dest, before any device work", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(KARATE_EDGES);
        const endpoints = await expectRejection(betweennessCentrality(ctx, s, { endpoints: true }), "E_UNSUPPORTED");
        expect(endpoints.details).toMatchObject({ feature: "betweenness.endpoints" });
        await expectRejection(edgeBetweennessCentrality(ctx, s, { endpoints: true }), "E_UNSUPPORTED");
        await expect(betweennessCentrality(ctx, s, { endpoints: false })).resolves.toBeDefined();
        await expectRejection(betweennessCentrality(ctx, s, { sources: [34] }), "E_INVALID_ARGUMENT");
        await expectRejection(betweennessCentrality(ctx, s, { sources: [1.5] }), "E_INVALID_ARGUMENT");
        await expectRejection(betweennessCentrality(ctx, s, { k: 35 }), "E_INVALID_ARGUMENT");
        await expectRejection(betweennessCentrality(ctx, s, { k: -1 }), "E_INVALID_ARGUMENT");
        await expectRejection(betweennessCentrality(ctx, s, { k: 2, sources: [1, 2, 3] }), "E_INVALID_ARGUMENT");
        await expectRejection(betweennessCentrality(ctx, s, { dest: new Float32Array(3) }), "E_INVALID_ARGUMENT");
        await expectRejection(betweennessWithTuning(ctx, s, undefined, { levelsPerSubmit: 0 }), "E_INVALID_ARGUMENT");
    }, 60_000);

    it("refuses a weighted snapshot unless weighted: false, since the kernel counts hops; a column of ones is hops already", async (t) => {
        const ctx = await context(t);
        const weighted = snapshotOf(KARATE_EDGES.map(([u, v], e) => [u, v, 1 + (e % 3)] as const));
        const refused = await expectRejection(betweennessCentrality(ctx, weighted), "E_UNSUPPORTED");
        expect(refused.details).toMatchObject({ option: "weighted" });
        await expectRejection(edgeBetweennessCentrality(ctx, weighted, { weighted: true }), "E_UNSUPPORTED");
        const hops = await betweennessCentrality(ctx, weighted, { weighted: false });
        const plain = await betweennessCentrality(ctx, snapshotOf(KARATE_EDGES));
        expectBitwiseEqual(hops.scores, plain.scores, "weighted: false vs the unweighted snapshot");
        const ones = snapshotOf(KARATE_EDGES.map(([u, v]) => [u, v, 1] as const));
        expectBitwiseEqual((await betweennessCentrality(ctx, ones)).scores, plain.scores, "a column of ones");
        ctx.release(weighted);
        ctx.release(ones);
    }, 60_000);

    afterAll(() => {
        shared?.dispose();
    });
});
