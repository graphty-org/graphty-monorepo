/**
 * PageRank and personalized PageRank against the NetworkX-semantics f64 oracle (spec 8.2, 9.7, 11.3; M8b-T5):
 * every named fixture after equal iterations within 1e-5 relative, convergence and the first converged iteration,
 * the top-k order, the weighted / unweighted / dangling / directed legs, the personalization legs, the degenerate
 * sizes, bitwise repeatability, the run options and G7's leak clause (ONE mapAsync per batch of 8).
 */

import { type GraphSnapshot } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import { pageRank, personalizedPageRank } from "../../src/algorithms/pagerank.js";
import { GpuContext } from "../../src/context.js";
import { type WebGpuGraphError } from "../../src/errors.js";
import { GraphResidency } from "../../src/memory/residency.js";
import { verifyDevice } from "../../src/primitives/verify.js";
import { fakeCaps } from "../helpers/caps-tables.js";
import { withResidency } from "../helpers/degree-check.js";
import { fixture, FIXTURE_NAMES, KARATE_EDGES, randomEdges, snapshotOf } from "../helpers/graphs.js";
import { LeakCounter } from "../helpers/leak-counter.js";
import { expectAllClose, expectBitwiseEqual, maxRelError } from "../helpers/matchers.js";
import { pageRankOracle, type PageRankOracleOptions, pageRankOracleTo } from "../oracle/pagerank.js";
import { acquire, acquireRaw, gpuScale, requireGpu } from "../setup/gpu.js";

/** The defaults of pageRank, spelled for the oracle. */
const OPTS: PageRankOracleOptions = { alpha: 0.85, tolerance: 1e-6, maxIterations: 100, weighted: true };
/** Spec 9.7: relative error per node after equal iterations. */
const PARITY = { rel: 1e-5, abs: 0 };
/** The denominator floor of maxRelError (scores are at least (1 - alpha) / n, far above it). */
const FLOOR = 1e-12;

/** A directed snapshot with a sink (node 3 has no out-arcs, so it is dangling). */
function directedWithSink(): GraphSnapshot {
    return snapshotOf(
        [
            [0, 1],
            [1, 2],
            [2, 0],
            [2, 3],
            [0, 3],
        ],
        { directed: true, label: "sink" },
    );
}

/** The indices of the k largest scores, ties broken by index. */
function topK(scores: ArrayLike<number>, k: number): number[] {
    const order = Array.from({ length: scores.length }, (_, i) => i);
    order.sort((a, b) => scores[b] - scores[a] || a - b);
    return order.slice(0, k);
}

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

describe("pageRankOracle (pure)", () => {
    it("a two-node cycle converges to 1/2 each at the first iteration; a sink redistributes its mass uniformly", () => {
        const cycle = snapshotOf(
            [
                [0, 1],
                [1, 0],
            ],
            { directed: true },
        );
        const r = pageRankOracle(cycle, OPTS);
        expect(Array.from(r.scores)).toEqual([0.5, 0.5]);
        expect(r.iterations).toBe(1);
        expect(r.converged).toBe(true);
        expect(r.danglingMass).toBe(0);
        const sink = snapshotOf([[0, 1]], { directed: true });
        const one = pageRankOracleTo(sink, OPTS, 1);
        // x0 = [0.5, 0.5]; node 1 is dangling: x1[0] = 0.075 + 0.85 * 0.25, x1[1] = 0.075 + 0.85 * (0.5 + 0.25)
        expect(one[0]).toBeCloseTo(0.2875, 12);
        expect(one[1]).toBeCloseTo(0.7125, 12);
        expect(pageRankOracle(sink, OPTS).danglingMass).toBeGreaterThan(0);
    });

    it("a personalization vector is normalised and replaces 1/n in the teleport; weighted: false folds 1 per arc", () => {
        const s = snapshotOf(
            [
                [0, 1, 3],
                [0, 2, 1],
            ],
            { directed: true, weighted: true },
        );
        const oneHot = pageRankOracleTo(s, OPTS, 1, [2, 0, 0]);
        // x0 = 1/3; node 0 has out-weight 4: x1[1] = 0.85 * (3/4)/3, x1[2] = 0.85 * (1/4)/3, dangling = 2/3 -> node 0
        expect(oneHot[1]).toBeCloseTo(0.2125, 12);
        expect(oneHot[2]).toBeCloseTo(0.0708333333, 9);
        expect(oneHot[0]).toBeCloseTo(0.15 + 0.85 * (2 / 3), 12);
        const flat = pageRankOracleTo(s, { ...OPTS, weighted: false }, 1);
        expect(flat[1]).toBeCloseTo(flat[2], 12);
    });

    it("n = 0 is empty, converged, zero iterations", () => {
        const r = pageRankOracle(snapshotOf([], { nodeCount: 0 }), OPTS);
        expect(r.scores.length).toBe(0);
        expect(r.iterations).toBe(0);
        expect(r.converged).toBe(true);
    });
});

describe("pageRank / personalizedPageRank (GPU, spec 8.2 / 9.7)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "pagerank" }));
        shared = ctx;
        return ctx;
    }

    for (const name of FIXTURE_NAMES) {
        it(`matches the oracle after exactly 8 iterations on ${name} within 1e-5 relative`, async (t) => {
            const ctx = await context(t);
            const { snapshot } = fixture(name, gpuScale());
            const result = await pageRank(ctx, snapshot, { maxIterations: 8 });
            expect(result.precision).toBe("f32");
            expect(result.scores).toBeInstanceOf(Float32Array);
            expectAllClose(result.scores, pageRankOracleTo(snapshot, OPTS, 8), PARITY, name);
            ctx.release(snapshot);
        });
    }

    it("converged is identical to the oracle's and iterations within +-1 on every fixture", async (t) => {
        const ctx = await context(t);
        for (const name of FIXTURE_NAMES) {
            const { snapshot } = fixture(name, gpuScale());
            const result = await pageRank(ctx, snapshot);
            const expected = pageRankOracle(snapshot, OPTS);
            expect(result.converged, `${name}: converged`).toBe(expected.converged);
            expect(Math.abs(result.iterations - expected.iterations), `${name}: iterations`).toBeLessThanOrEqual(1);
            ctx.release(snapshot);
        }
    });

    it("the top-10 rank order is identical on karate, random1k and hub10k", async (t) => {
        const ctx = await context(t);
        for (const name of ["karate", "random1k", "hub10k"]) {
            const { snapshot } = fixture(name, gpuScale());
            const result = await pageRank(ctx, snapshot, { maxIterations: 8 });
            const expected = pageRankOracleTo(snapshot, OPTS, 8);
            expect(topK(result.scores, 10), name).toEqual(topK(expected, 10));
            ctx.release(snapshot);
        }
    });

    it("weighted with zero-weight arcs (parallel) and a directed sink; weighted: false folds 1 and differs from the weighted run", async (t) => {
        const ctx = await context(t);
        const { snapshot: parallel } = fixture("parallel", gpuScale());
        expect(parallel.weights).not.toBeNull();
        const weighted = await pageRank(ctx, parallel, { maxIterations: 8 });
        expectAllClose(weighted.scores, pageRankOracleTo(parallel, OPTS, 8), PARITY, "parallel weighted");
        const unweighted = await pageRank(ctx, parallel, { weighted: false, maxIterations: 8 });
        const ones = pageRankOracleTo(parallel, { ...OPTS, weighted: false }, 8);
        expectAllClose(unweighted.scores, ones, PARITY, "parallel weighted: false");
        expect(maxRelError(unweighted.scores, weighted.scores, FLOOR)).toBeGreaterThan(1e-5);
        ctx.release(parallel);

        const sink = directedWithSink();
        const result = await pageRank(ctx, sink, { maxIterations: 8 });
        expectAllClose(result.scores, pageRankOracleTo(sink, OPTS, 8), PARITY, "sink");
        expect(result.danglingMass).toBeGreaterThan(0);
        const full = await pageRank(ctx, sink);
        const expected = pageRankOracle(sink, OPTS);
        expect(full.converged).toBe(expected.converged);
        expect(Math.abs(full.danglingMass - expected.danglingMass)).toBeLessThan(1e-5);
        ctx.release(sink);
    });

    it("directed and undirected forms of the same edge set each match their oracle and differ from each other", async (t) => {
        const ctx = await context(t);
        const directed = snapshotOf(KARATE_EDGES, { directed: true, label: "karate-directed" });
        const undirected = snapshotOf(KARATE_EDGES, { label: "karate-undirected" });
        const d = await pageRank(ctx, directed, { maxIterations: 8 });
        const u = await pageRank(ctx, undirected, { maxIterations: 8 });
        expectAllClose(d.scores, pageRankOracleTo(directed, OPTS, 8), PARITY, "directed");
        expectAllClose(u.scores, pageRankOracleTo(undirected, OPTS, 8), PARITY, "undirected");
        expect(maxRelError(d.scores, u.scores, FLOOR)).toBeGreaterThan(1e-2);
        ctx.release(directed);
        ctx.release(undirected);
    });

    it("personalization: one-hot e_0 matches the oracle; uniform 1/n equals plain pageRank within 1e-6", async (t) => {
        const ctx = await context(t);
        const { snapshot } = fixture("karate", gpuScale());
        const n = snapshot.nodeCount;
        const oneHot = new Float32Array(n);
        oneHot[0] = 1;
        const personal = await personalizedPageRank(ctx, snapshot, oneHot, { maxIterations: 8 });
        expectAllClose(personal.scores, pageRankOracleTo(snapshot, OPTS, 8, oneHot), PARITY, "one-hot");
        const uniform = await personalizedPageRank(ctx, snapshot, new Float32Array(n).fill(3), { maxIterations: 8 });
        const plain = await pageRank(ctx, snapshot, { maxIterations: 8 });
        expectAllClose(uniform.scores, plain.scores, { rel: 1e-6, abs: 0 }, "uniform vs plain");
        const converged = await personalizedPageRank(ctx, snapshot, oneHot);
        const expected = pageRankOracle(snapshot, OPTS, oneHot);
        expect(converged.converged).toBe(expected.converged);
        expect(Math.abs(converged.iterations - expected.iterations)).toBeLessThanOrEqual(1);
        // the mass stays concentrated at node 0: it is the top score
        expect(topK(converged.scores, 1)).toEqual([0]);
        ctx.release(snapshot);
        // the validation: a wrong length, a negative entry, a NaN, an all-zero vector
        const { snapshot: k2 } = fixture("karate", gpuScale());
        for (const bad of [
            new Float32Array(n - 1),
            Float32Array.of(-1, ...new Float32Array(n - 1)),
            new Float32Array(n),
        ]) {
            const error = await expectRejection(personalizedPageRank(ctx, k2, bad), "E_INVALID_ARGUMENT");
            expect(error.details.argument).toBe("personalization");
        }
        const withNaN = new Float32Array(n).fill(1);
        withNaN[2] = Number.NaN;
        await expectRejection(personalizedPageRank(ctx, k2, withNaN), "E_INVALID_ARGUMENT");
        ctx.release(k2);
    });

    it("n = 0 returns an empty result with no GPU work; arcCount = 0 returns 1/n everywhere", async (t) => {
        const ctx = await context(t);
        const empty = snapshotOf([], { nodeCount: 0 });
        const before = ctx.residency.stats();
        const r0 = await pageRank(ctx, empty);
        expect(r0.scores.length).toBe(0);
        expect(r0.iterations).toBe(0);
        expect(r0.converged).toBe(true);
        expect(ctx.residency.stats()).toEqual(before);
        const lonely = snapshotOf([], { nodeCount: 5 });
        const r5 = await pageRank(ctx, lonely);
        expect(Array.from(r5.scores)).toEqual([0.2, 0.2, 0.2, 0.2, 0.2].map(Math.fround));
        expect(r5.converged).toBe(true);
        expectAllClose(r5.scores, pageRankOracleTo(lonely, OPTS, 8), PARITY, "lonely");
        const p5 = await personalizedPageRank(ctx, lonely, Float32Array.of(2, 0, 0, 0, 2));
        expect(Array.from(p5.scores)).toEqual([0.5, 0, 0, 0, 0.5]);
        ctx.release(lonely);
    });

    it("two runs are bitwise identical", async (t) => {
        const ctx = await context(t);
        const { snapshot } = fixture("random1k", gpuScale());
        const first = await pageRank(ctx, snapshot);
        const second = await pageRank(ctx, snapshot);
        expectBitwiseEqual(first.scores, second.scores, "twice");
        expect(second.iterations).toBe(first.iterations);
        expect(second.danglingMass).toBe(first.danglingMass);
        ctx.release(snapshot);
    });

    it("dest of the wrong length is E_INVALID_ARGUMENT; an aborted signal is E_ABORTED; onProgress is monotone; dest is returned", async (t) => {
        const ctx = await context(t);
        const { snapshot } = fixture("karate", gpuScale());
        const n = snapshot.nodeCount;
        const wrong = await expectRejection(
            pageRank(ctx, snapshot, { dest: new Float32Array(n - 1) }),
            "E_INVALID_ARGUMENT",
        );
        expect(wrong.details.argument).toBe("dest");
        await expectRejection(pageRank(ctx, snapshot, { dest: new Uint32Array(n) }), "E_INVALID_ARGUMENT");
        const controller = new AbortController();
        controller.abort();
        await expectRejection(pageRank(ctx, snapshot, { signal: controller.signal }), "E_ABORTED");
        const midway = new AbortController();
        await expectRejection(
            pageRank(ctx, snapshot, {
                signal: midway.signal,
                onProgress: () => {
                    midway.abort();
                },
            }),
            "E_ABORTED",
        );
        await expectRejection(pageRank(ctx, snapshot, { maxIterations: 0 }), "E_INVALID_ARGUMENT");
        const seen: number[] = [];
        let total = -1;
        const dest = new Float32Array(n);
        const result = await pageRank(ctx, snapshot, {
            dest,
            maxIterations: 20,
            onProgress: (done, max) => {
                seen.push(done);
                total = max;
            },
        });
        expect(result.scores).toBe(dest);
        expect(total).toBe(20);
        expect(seen.length).toBeGreaterThan(0);
        for (let i = 1; i < seen.length; i++) {
            expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
        }
        expect(seen[seen.length - 1]).toBe(20);
        ctx.release(snapshot);
    });

    it("G7 leak clause: a 100-node run pinned to 8 iterations maps exactly ONE staging buffer, and leaves no buffer alive", async (t) => {
        requireGpu(t);
        const { device } = await acquireRaw();
        const counter = LeakCounter.wrap(device);
        const own = GpuContext.from(device);
        const s = snapshotOf(randomEdges(100, 300, 5), { nodeCount: 100, label: "leak" });
        try {
            // the device self-check runs once per device, on an ADOPTED device too (GpuContext.from); pay it
            // before counting, so what is counted is one algorithm run (src/primitives/verify.ts)
            await verifyDevice(own);
            counter.resetMapAsync();
            const result = await pageRank(own, s, { maxIterations: 8 });
            expect(counter.mapAsyncCalls, "mapAsync calls of one batch of 8").toBe(1);
            expectAllClose(result.scores, pageRankOracleTo(s, OPTS, 8), PARITY, "leak run");
            own.release(s);
            expect(own.residency.stats().buffers).toBe(0);
        } finally {
            own.dispose();
        }
        expect(counter.live, "live buffers after release + dispose").toBe(0);
        counter.restore();
    });

    it("a windowed core is refused with E_TOO_LARGE { path: 'windowed', algorithm } before any work, directed and undirected (DEP-P4-B)", async (t) => {
        const ctx = await context(t);
        // karate: rowPtr (140 B) fits a 256-byte binding, colIdx (624 B) does not, so the core plan is windowed
        const caps = fakeCaps(ctx.caps, { maxStorageBufferBindingSize: 256 });
        const residency = new GraphResidency(ctx.device, caps, ctx.allocator, { warnUnreleasedSnapshots: 2 });
        const proxied = withResidency(ctx, residency);
        try {
            for (const directed of [true, false]) {
                const s = snapshotOf(KARATE_EDGES, { directed });
                const err = await expectRejection(pageRank(proxied, s), "E_TOO_LARGE");
                expect(err.details).toMatchObject({ path: "windowed", algorithm: "pageRank", needed: 4 * s.arcCount });
                const ppr = await expectRejection(
                    personalizedPageRank(proxied, s, new Float32Array(s.nodeCount).fill(1)),
                    "E_TOO_LARGE",
                );
                expect(ppr.details).toMatchObject({ path: "windowed", algorithm: "personalizedPageRank" });
            }
        } finally {
            residency.destroyAll();
        }
        expect(ctx.residency.stats().snapshots).toBe(0);
    });
});
