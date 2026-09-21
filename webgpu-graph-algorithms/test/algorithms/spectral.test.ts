/**
 * HITS, eigenvector centrality and Katz centrality against the f64 oracles (spec 8.2, 9.7, 11.3; M8b-T6): every
 * named fixture after exactly 8 iterations within 1e-5 relative, convergence and the first converged iteration,
 * the top-10 order, the directed / undirected legs, the degenerate sizes, bitwise repeatability, the two-pulls
 * identity of HITS and the beta = 0 identity of Katz, the HITS chains stopping at different counts, PD-10's leak
 * clause (ONE mapAsync per run of 8) and the weighted: false leg. The pure check pins the eigenvector recurrence
 * against 500 dense f64 power iterations that share none of the oracle's code.
 */

import { type F32, type GraphSnapshot } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import { coreOf, reverseOf, runPowerIteration } from "../../src/algorithms/power-iteration.js";
import { eigenvectorCentrality, hits, katzCentrality } from "../../src/algorithms/spectral.js";
import { GpuContext } from "../../src/context.js";
import { fixture, FIXTURE_NAMES, KARATE_EDGES, randomEdges, snapshotOf } from "../helpers/graphs.js";
import { LeakCounter } from "../helpers/leak-counter.js";
import { expectAllClose, expectBitwiseEqual, maxRelError } from "../helpers/matchers.js";
import { eigenvectorOracle, hitsOracle, katzOracle, type SpectralOracleOptions } from "../oracle/spectral.js";
import { acquire, acquireRaw, gpuScale, requireGpu } from "../setup/gpu.js";

/** The defaults of the three entry points, spelled for the oracles. */
const OPTS: SpectralOracleOptions = { maxIterations: 100, tolerance: 1e-6, weighted: true };
/** Katz's default coefficients. */
const KATZ = { alpha: 0.1, beta: 1 };
/** Spec 9.7: relative error per node after equal iterations (the abs floor absorbs exact zeros on both sides). */
const PARITY = { rel: 1e-5, abs: 1e-9 };
/** The denominator floor of maxRelError. */
const FLOOR = 1e-12;

/** One entry point under test, with its oracle, both pinned to k iterations. */
interface Leg {
    readonly name: string;
    gpu(ctx: GpuContext, s: GraphSnapshot, k: number, weighted?: boolean): Promise<F32>;
    oracle(s: GraphSnapshot, k: number, weighted?: boolean): Float64Array;
}

const LEGS: readonly Leg[] = [
    {
        name: "hits",
        gpu: async (ctx, s, k, weighted) => (await hits(ctx, s, { maxIterations: k, weighted })).hubs,
        oracle: (s, k, weighted) => hitsOracle(s, { ...OPTS, maxIterations: k, weighted: weighted ?? true }).hubs,
    },
    {
        name: "eigenvectorCentrality",
        gpu: async (ctx, s, k, weighted) => (await eigenvectorCentrality(ctx, s, { maxIterations: k, weighted })).scores,
        oracle: (s, k, weighted) =>
            eigenvectorOracle(s, { ...OPTS, maxIterations: k, weighted: weighted ?? true }).scores,
    },
    {
        name: "katzCentrality",
        gpu: async (ctx, s, k, weighted) => (await katzCentrality(ctx, s, { maxIterations: k, weighted })).scores,
        oracle: (s, k, weighted) =>
            katzOracle(s, { ...OPTS, ...KATZ, maxIterations: k, weighted: weighted ?? true }).scores,
    },
];

/** The indices of the k largest scores, ties broken by index. */
function topK(scores: ArrayLike<number>, k: number): number[] {
    const order = Array.from({ length: scores.length }, (_, i) => i);
    order.sort((a, b) => scores[b] - scores[a] || a - b);
    return order.slice(0, k);
}

/** The ranks of a vector (1-based, ties by index), for Spearman. */
function ranks(x: ArrayLike<number>): Float64Array {
    const order = topK(x, x.length);
    const out = new Float64Array(x.length);
    order.forEach((index, rank) => {
        out[index] = rank + 1;
    });
    return out;
}

/** Spearman's rank correlation: Pearson over the ranks. */
function spearman(a: ArrayLike<number>, b: ArrayLike<number>): number {
    const ra = ranks(a);
    const rb = ranks(b);
    const n = ra.length;
    const mean = (n + 1) / 2;
    let cov = 0;
    let va = 0;
    let vb = 0;
    for (let i = 0; i < n; i++) {
        cov += (ra[i] - mean) * (rb[i] - mean);
        va += (ra[i] - mean) ** 2;
        vb += (rb[i] - mean) ** 2;
    }
    return cov / Math.sqrt(va * vb);
}

/** The dominant eigenvector of the karate adjacency by 500 dense f64 power iterations (no oracle code involved). */
function densePowerIteration(): Float64Array {
    const n = 34;
    const a = new Float64Array(n * n);
    for (const [u, v] of KARATE_EDGES) {
        a[u * n + v] = 1;
        a[v * n + u] = 1;
    }
    let x = new Float64Array(n).fill(1);
    for (let iteration = 0; iteration < 500; iteration++) {
        const next = new Float64Array(n);
        let norm = 0;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                next[i] += a[i * n + j] * x[j];
            }
            norm += next[i] * next[i];
        }
        norm = Math.sqrt(norm);
        for (let i = 0; i < n; i++) {
            next[i] /= norm;
        }
        x = next;
    }
    return x;
}

describe("spectral oracles (pure)", () => {
    it("the eigenvector recurrence on karate correlates above 0.999 (Spearman) with 500 dense power iterations", () => {
        const s = snapshotOf(KARATE_EDGES, { label: "karate" });
        const result = eigenvectorOracle(s, OPTS);
        expect(result.converged).toBe(true);
        expect(spearman(result.scores, densePowerIteration())).toBeGreaterThan(0.999);
        // and the vector itself: the oracle's final L2 normalisation makes them comparable directly
        expectAllClose(result.scores, densePowerIteration(), { rel: 1e-4, abs: 1e-6 }, "eigenvector");
    });

    it("HITS on a single arc and on a path separates hubs from authorities exactly (the alternating recurrence)", () => {
        const arc = hitsOracle(snapshotOf([[0, 1]], { directed: true }), OPTS);
        expect(Array.from(arc.hubs)).toEqual([1, 0]);
        expect(Array.from(arc.authorities)).toEqual([0, 1]);
        const path = hitsOracle(snapshotOf([[0, 1], [1, 2]], { directed: true }), OPTS);
        expect(Array.from(path.hubs)).toEqual([0.5, 0.5, 0]);
        expect(Array.from(path.authorities)).toEqual([0, 0.5, 0.5]);
        expect(path.converged).toBe(true);
        // an odd pin swaps which chain ends on the hubs; the vectors must not
        const odd = hitsOracle(snapshotOf([[0, 1], [1, 2]], { directed: true }), { ...OPTS, maxIterations: 7 });
        expect(Array.from(odd.hubs)).toEqual([0.5, 0.5, 0]);
        expect(Array.from(odd.authorities)).toEqual([0, 0.5, 0.5]);
    });

    it("a two-node cycle: HITS hubs and authorities are 1/2 each; Katz with beta = 1 is uniform; n = 0 is empty", () => {
        const cycle = snapshotOf(
            [
                [0, 1],
                [1, 0],
            ],
            { directed: true },
        );
        const h = hitsOracle(cycle, OPTS);
        expect(Array.from(h.hubs)).toEqual([0.5, 0.5]);
        expect(Array.from(h.authorities)).toEqual([0.5, 0.5]);
        expect(h.converged).toBe(true);
        const k = katzOracle(cycle, { ...OPTS, ...KATZ });
        expect(k.scores[0]).toBeCloseTo(Math.SQRT1_2, 12);
        expect(k.scores[1]).toBeCloseTo(Math.SQRT1_2, 12);
        const e = eigenvectorOracle(snapshotOf([], { nodeCount: 0 }), OPTS);
        expect(e.scores.length).toBe(0);
        expect(e.iterations).toBe(0);
        expect(e.converged).toBe(true);
    });
});

describe("hits / eigenvectorCentrality / katzCentrality (GPU, spec 8.2 / 9.7)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "spectral" }));
        shared = ctx;
        return ctx;
    }

    for (const leg of LEGS) {
        for (const name of FIXTURE_NAMES) {
            it(`${leg.name} matches the oracle after exactly 8 iterations on ${name} within 1e-5 relative`, async (t) => {
                const ctx = await context(t);
                const { snapshot } = fixture(name, gpuScale());
                const scores = await leg.gpu(ctx, snapshot, 8);
                expect(scores).toBeInstanceOf(Float32Array);
                expectAllClose(scores, leg.oracle(snapshot, 8), PARITY, `${leg.name}/${name}`);
                ctx.release(snapshot);
            });
        }
    }

    it("converged is identical to the oracle's and iterations within +-1 on every fixture, for all three", async (t) => {
        const ctx = await context(t);
        for (const name of FIXTURE_NAMES) {
            const { snapshot } = fixture(name, gpuScale());
            const runs = [
                [await hits(ctx, snapshot), hitsOracle(snapshot, OPTS), "hits"],
                [await eigenvectorCentrality(ctx, snapshot), eigenvectorOracle(snapshot, OPTS), "eigenvector"],
                [await katzCentrality(ctx, snapshot), katzOracle(snapshot, { ...OPTS, ...KATZ }), "katz"],
            ] as const;
            for (const [result, expected, label] of runs) {
                expect(result.converged, `${label}/${name}: converged`).toBe(expected.converged);
                expect(Math.abs(result.iterations - expected.iterations), `${label}/${name}: iterations`).toBeLessThanOrEqual(1);
            }
            ctx.release(snapshot);
        }
    });

    it("the top-10 order is identical on karate and random1k, for all three", async (t) => {
        const ctx = await context(t);
        for (const name of ["karate", "random1k"]) {
            const { snapshot } = fixture(name, gpuScale());
            for (const leg of LEGS) {
                const scores = await leg.gpu(ctx, snapshot, 8);
                expect(topK(scores, 10), `${leg.name}/${name}`).toEqual(topK(leg.oracle(snapshot, 8), 10));
            }
            ctx.release(snapshot);
        }
    });

    it("directed and undirected forms of the same edge set each match their oracle; directed HITS separates hubs from authorities", async (t) => {
        const ctx = await context(t);
        const edges = randomEdges(60, 200, 11);
        const directed = snapshotOf(edges, { directed: true, label: "directed" });
        const undirected = snapshotOf(edges, { label: "undirected" });
        for (const leg of LEGS) {
            expectAllClose(await leg.gpu(ctx, directed, 8), leg.oracle(directed, 8), PARITY, `${leg.name}/directed`);
            expectAllClose(await leg.gpu(ctx, undirected, 8), leg.oracle(undirected, 8), PARITY, `${leg.name}/undirected`);
        }
        const d = await hits(ctx, directed, { maxIterations: 8 });
        expect(maxRelError(d.hubs, d.authorities, FLOOR)).toBeGreaterThan(1e-2);
        const u = await hits(ctx, undirected, { maxIterations: 8 });
        expectAllClose(u.hubs, u.authorities, { rel: 1e-5, abs: 0 }, "undirected hubs = authorities");
        ctx.release(directed);
        ctx.release(undirected);
    });

    it("n = 0 returns an empty result with no GPU work; arcCount = 0 gives zeros (HITS, eigenvector) and the uniform beta (Katz)", async (t) => {
        const ctx = await context(t);
        const empty = snapshotOf([], { nodeCount: 0 });
        const before = ctx.residency.stats();
        const e0 = await eigenvectorCentrality(ctx, empty);
        const h0 = await hits(ctx, empty);
        const k0 = await katzCentrality(ctx, empty);
        expect(e0.scores.length + h0.hubs.length + h0.authorities.length + k0.scores.length).toBe(0);
        expect([e0.iterations, h0.iterations, k0.iterations]).toEqual([0, 0, 0]);
        expect([e0.converged, h0.converged, k0.converged]).toEqual([true, true, true]);
        expect(ctx.residency.stats()).toEqual(before);
        const lonely = snapshotOf([], { nodeCount: 5 });
        const e5 = await eigenvectorCentrality(ctx, lonely);
        expect(Array.from(e5.scores)).toEqual([0, 0, 0, 0, 0]);
        expect(e5.converged).toBe(true);
        const h5 = await hits(ctx, lonely);
        expect(Array.from(h5.hubs)).toEqual([0, 0, 0, 0, 0]);
        expect(Array.from(h5.authorities)).toEqual([0, 0, 0, 0, 0]);
        const k5 = await katzCentrality(ctx, lonely);
        expectAllClose(k5.scores, new Float64Array(5).fill(1 / Math.sqrt(5)), PARITY, "lonely katz");
        expectAllClose(k5.scores, katzOracle(lonely, { ...OPTS, ...KATZ }).scores, PARITY, "lonely katz oracle");
        expect(k5.converged).toBe(true);
        ctx.release(lonely);
    });

    it("two runs are bitwise identical, for all three", async (t) => {
        const ctx = await context(t);
        const { snapshot } = fixture("random1k", gpuScale());
        for (const leg of LEGS) {
            expectBitwiseEqual(await leg.gpu(ctx, snapshot, 100), await leg.gpu(ctx, snapshot, 100), `${leg.name} twice`);
        }
        const first = await hits(ctx, snapshot);
        const second = await hits(ctx, snapshot);
        expectBitwiseEqual(first.authorities, second.authorities, "authorities twice");
        expect(second.iterations).toBe(first.iterations);
        ctx.release(snapshot);
    });

    it("HITS: hubs of s are the authorities of the reverse orientation (at an even and an odd pin); Katz with beta = 0 is the eigenvector direction", async (t) => {
        const ctx = await context(t);
        const edges = randomEdges(60, 200, 12);
        const forward = snapshotOf(edges, { directed: true, label: "forward" });
        const backward = snapshotOf(
            edges.map(([u, v]) => [v, u] as const),
            { directed: true, label: "backward" },
        );
        for (const maxIterations of [8, 7]) {
            const f = await hits(ctx, forward, { maxIterations });
            const b = await hits(ctx, backward, { maxIterations });
            expectAllClose(f.hubs, b.authorities, PARITY, `hubs(s) = authorities(reverse s) at ${maxIterations}`);
            expectAllClose(f.authorities, b.hubs, PARITY, `authorities(s) = hubs(reverse s) at ${maxIterations}`);
            const o = hitsOracle(forward, { ...OPTS, maxIterations });
            expectAllClose(f.hubs, o.hubs, PARITY, `hubs at ${maxIterations}`);
            expectAllClose(f.authorities, o.authorities, PARITY, `authorities at ${maxIterations}`);
        }
        ctx.release(forward);
        ctx.release(backward);
        const { snapshot: karate } = fixture("karate", gpuScale());
        const katz = await katzCentrality(ctx, karate, { beta: 0, maxIterations: 8 });
        const eigen = await eigenvectorCentrality(ctx, karate, { maxIterations: 8 });
        expectAllClose(katz.scores, eigen.scores, { rel: 1e-4, abs: 1e-7 }, "katz(beta = 0) = eigenvector");
        ctx.release(karate);
    });

    it("HITS whose two chains stop after a different number of iterations (an odd maxIterations, one chain converging in the first batch) returns the latest hub vector AND the latest authority vector, never two of one kind", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(randomEdges(60, 200, 11), { directed: true, label: "odd-chains" });
        const options = { maxIterations: 9, tolerance: 3.2e-3 };
        // the two chains as hits() runs them, to learn where each stopped: a multiple of 8, or maxIterations
        const shared = { normMode: 1 as const, alpha: 1, beta: 0, uniformP: 0, ...options, weights: undefined };
        const forward = coreOf(ctx, s, "hits");
        const reverse = reverseOf(ctx, s);
        const hubSeeded = await runPowerIteration(ctx, s.nodeCount, {
            ...shared,
            adjacency: reverse,
            alternate: forward,
            label: "hub-seeded",
            signal: undefined,
            onProgress: undefined,
        });
        const authoritySeeded = await runPowerIteration(ctx, s.nodeCount, {
            ...shared,
            adjacency: forward,
            alternate: reverse,
            label: "authority-seeded",
            signal: undefined,
            onProgress: undefined,
        });
        const mh = hubSeeded.iterationsRun;
        const ma = authoritySeeded.iterationsRun;
        expect(mh, `the chains stop at different counts (hub-seeded ${mh}, authority-seeded ${ma})`).not.toBe(ma);
        expect(hubSeeded.previous).not.toBeNull();
        // a chain holds its seed's kind after an even count and the other kind after an odd one; h(i) / a(i) are
        // what the oracle returns at maxIterations i whichever chain holds them
        const hubIndex = Math.max(mh % 2 === 0 ? mh : mh - 1, ma % 2 === 1 ? ma : ma - 1);
        const authorityIndex = Math.max(ma % 2 === 0 ? ma : ma - 1, mh % 2 === 1 ? mh : mh - 1);
        expect(hubIndex).not.toBe(authorityIndex);
        const result = await hits(ctx, s, options);
        const expectedHubs = hitsOracle(s, { ...OPTS, maxIterations: hubIndex }).hubs;
        const expectedAuthorities = hitsOracle(s, { ...OPTS, maxIterations: authorityIndex }).authorities;
        expectAllClose(result.hubs, expectedHubs, PARITY, `hubs = h(${hubIndex})`);
        expectAllClose(result.authorities, expectedAuthorities, PARITY, `authorities = a(${authorityIndex})`);
        // and the two are of different kinds: an authority vector is nowhere near the hub vector on a directed graph
        expect(maxRelError(result.authorities, expectedHubs, FLOOR)).toBeGreaterThan(1e-2);
        ctx.release(s);
    });

    it("PD-10 leak clause: 8 iterations on 100 nodes map exactly ONE staging buffer per run (eigenvector 1, Katz 1, HITS 2: its two interleaved chains) and leave no buffer alive", async (t) => {
        requireGpu(t);
        const { device } = await acquireRaw();
        const counter = LeakCounter.wrap(device);
        const own = GpuContext.from(device);
        const s = snapshotOf(randomEdges(100, 300, 5), { nodeCount: 100, label: "leak" });
        try {
            counter.resetMapAsync();
            const eigen = await eigenvectorCentrality(own, s, { maxIterations: 8 });
            expect(counter.mapAsyncCalls, "mapAsync calls of eigenvectorCentrality over 8 iterations").toBe(1);
            expectAllClose(eigen.scores, eigenvectorOracle(s, { ...OPTS, maxIterations: 8 }).scores, PARITY, "leak eigen");
            counter.resetMapAsync();
            await katzCentrality(own, s, { maxIterations: 8 });
            expect(counter.mapAsyncCalls, "mapAsync calls of katzCentrality over 8 iterations").toBe(1);
            counter.resetMapAsync();
            await hits(own, s, { maxIterations: 8 });
            expect(counter.mapAsyncCalls, "mapAsync calls of hits over 8 iterations (two chains, one batch each)").toBe(2);
            own.release(s);
            expect(own.residency.stats().buffers).toBe(0);
        } finally {
            own.dispose();
        }
        expect(counter.live, "live buffers after release + dispose").toBe(0);
        counter.restore();
    });

    it("weighted: false on parallel equals the oracle with all weights 1 and differs from the weighted run", async (t) => {
        const ctx = await context(t);
        const { snapshot } = fixture("parallel", gpuScale());
        expect(snapshot.weights).not.toBeNull();
        for (const leg of LEGS) {
            const weighted = await leg.gpu(ctx, snapshot, 8);
            const unweighted = await leg.gpu(ctx, snapshot, 8, false);
            expectAllClose(unweighted, leg.oracle(snapshot, 8, false), PARITY, `${leg.name} weighted: false`);
            expect(maxRelError(unweighted, weighted, FLOOR), `${leg.name} differs`).toBeGreaterThan(1e-5);
        }
        ctx.release(snapshot);
    });

    it("dest of the wrong length is E_INVALID_ARGUMENT; an aborted signal is E_ABORTED; a non-finite Katz alpha is E_INVALID_ARGUMENT; dest is returned", async (t) => {
        const ctx = await context(t);
        const { snapshot } = fixture("karate", gpuScale());
        const n = snapshot.nodeCount;
        await expect(eigenvectorCentrality(ctx, snapshot, { dest: new Float32Array(n - 1) })).rejects.toMatchObject({
            code: "E_INVALID_ARGUMENT",
        });
        const controller = new AbortController();
        controller.abort();
        await expect(hits(ctx, snapshot, { signal: controller.signal })).rejects.toMatchObject({ code: "E_ABORTED" });
        await expect(katzCentrality(ctx, snapshot, { alpha: Number.NaN })).rejects.toMatchObject({
            code: "E_INVALID_ARGUMENT",
        });
        await expect(katzCentrality(ctx, snapshot, { maxIterations: 0 })).rejects.toMatchObject({
            code: "E_INVALID_ARGUMENT",
        });
        const dest = new Float32Array(n);
        const seen: number[] = [];
        const result = await hits(ctx, snapshot, {
            dest,
            maxIterations: 16,
            onProgress: (done) => {
                seen.push(done);
            },
        });
        expect(result.hubs).toBe(dest);
        expect(seen[seen.length - 1]).toBe(32);
        ctx.release(snapshot);
    });
});
