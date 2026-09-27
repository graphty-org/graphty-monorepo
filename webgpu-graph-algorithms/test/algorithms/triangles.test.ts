/**
 * Triangle counting with the clustering coefficient and the transitivity (design 8.5, 9.7; the P11 plan's P11-T8)
 * against the Set-per-row reference on every named fixture: `perNode` and `total` exactly (u32 counts), the
 * coefficient BITWISE the reference's f64 rounded to f32 (both are computed in f64 from the same integers), the
 * transitivity exactly. Plus the analytic anchors (complete graphs, karate's published 45), the simple-graph
 * semantics (a directed snapshot and a multigraph with self-loops give their simple graph's answer), the merge and the
 * binary-search intersections bitwise equal, run twice, and the run options.
 */

import { type GraphSnapshot } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import { triangleCount, triangleCountWithSearch } from "../../src/algorithms/triangles.js";
import { type GpuContext } from "../../src/context.js";
import {
    completeEdges,
    type EdgeSpec,
    fixture,
    KARATE_EDGES,
    randomEdges,
    snapshotOf,
    starEdges,
} from "../helpers/graphs.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { messyEdges } from "../helpers/structure.js";
import { simpleSymmetricOracle } from "../oracle/coo.js";
import { triangleOracle } from "../oracle/structure.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const FIXTURES = [
    "empty",
    "one",
    "self-loop",
    "karate",
    "grid10",
    "path1k",
    "star200",
    "complete6",
    "random1k",
    "hub10k",
    "isolated",
    "parallel",
    "rmat14",
] as const;

/**
 * Disjoint complete graphs of the given sizes.
 * @param sizes - the clique sizes
 * @returns the edges
 */
function cliques(sizes: readonly number[]): EdgeSpec[] {
    const edges: EdgeSpec[] = [];
    let base = 0;
    for (const size of sizes) {
        for (const [u, v] of completeEdges(size)) {
            edges.push([u + base, v + base]);
        }
        base += size;
    }
    return edges;
}

describe("triangleCount (GPU, design 8.5)", () => {
    let shared: GpuContext | null = null;
    const tracked: GraphSnapshot[] = [];

    /** Releases the snapshots tracked before, then tracks this one (three resident at once trip the residency warning). */
    function track(s: GraphSnapshot): GraphSnapshot {
        for (const old of tracked.splice(0)) {
            shared?.release(old);
        }
        tracked.push(s);
        return s;
    }

    afterEach(() => {
        for (const s of tracked.splice(0)) {
            shared?.release(s);
        }
    });

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "triangles" }));
        shared = ctx;
        return ctx;
    }

    for (const name of FIXTURES) {
        it(`${name}: counts exact, coefficient bitwise, transitivity exact, twice`, async (t) => {
            const ctx = await context(t);
            const { snapshot } = fixture(name, gpuScale());
            const want = triangleOracle(simpleSymmetricOracle(snapshot));
            const a = await triangleCount(ctx, snapshot);
            const b = await triangleCount(ctx, snapshot);
            expectBitwiseEqual(a.perNode, b.perNode, `${name} run-twice`);
            expectBitwiseEqual(a.perNode, want.perNode, `${name} perNode`);
            expect(a.total).toBe(want.total);
            expectBitwiseEqual(a.coefficient, Float32Array.from(want.coefficient), `${name} coefficient`);
            expect(a.transitivity).toBe(want.transitivity);
            ctx.release(snapshot);
        });
    }

    it("analytic anchors: complete graphs and disjoint cliques have coefficient 1 and transitivity 1; karate has 45 triangles; a star has none", async (t) => {
        const ctx = await context(t);
        const union = track(snapshotOf(cliques([3, 5, 8])));
        const r = await triangleCount(ctx, union);
        expect(Array.from(r.perNode)).toEqual([1, 1, 1, 6, 6, 6, 6, 6, 21, 21, 21, 21, 21, 21, 21, 21]);
        expect(r.total).toBe(1 + 10 + 56);
        expect(r.coefficient.every((c) => c === 1)).toBe(true);
        expect(r.transitivity).toBe(1);
        const karate = await triangleCount(ctx, track(snapshotOf(KARATE_EDGES)));
        expect(karate.total).toBe(45);
        const star = await triangleCount(ctx, track(snapshotOf(starEdges(20))));
        expect(star.total).toBe(0);
        expect(star.coefficient.every((c) => c === 0)).toBe(true);
        expect(star.transitivity).toBe(0);
    });

    it("the simple graph decides: a directed snapshot equals its undirected twin; a multigraph with self-loops equals its cleaned graph", async (t) => {
        const ctx = await context(t);
        const n = Math.max(60, Math.round(2000 * gpuScale()));
        const edges = randomEdges(n, 4 * n, 21);
        const d = await triangleCount(ctx, track(snapshotOf(edges, { directed: true, nodeCount: n })));
        const u = await triangleCount(ctx, track(snapshotOf(edges, { nodeCount: n })));
        expectBitwiseEqual(d.perNode, u.perNode, "directed vs undirected");
        const messy = messyEdges();
        const seen = new Set<string>();
        const clean: EdgeSpec[] = [];
        for (const [a, b] of messy) {
            const key = `${Math.min(a, b)}/${Math.max(a, b)}`;
            if (a !== b && !seen.has(key)) {
                seen.add(key);
                clean.push([a, b]);
            }
        }
        const dirty = await triangleCount(ctx, track(snapshotOf(messy, { directed: true, nodeCount: 60 })));
        const cleaned = await triangleCount(ctx, track(snapshotOf(clean, { nodeCount: 60 })));
        expectBitwiseEqual(dirty.perNode, cleaned.perNode, "multigraph vs cleaned");
        expectBitwiseEqual(dirty.coefficient, cleaned.coefficient, "multigraph coefficient");
    });

    it("the merge and the binary-search intersections agree bitwise with the per-arc choice", async (t) => {
        const ctx = await context(t);
        for (const name of ["karate", "hub10k", "rmat14", "random1k"] as const) {
            const { snapshot } = fixture(name, gpuScale());
            const auto = await triangleCountWithSearch(ctx, snapshot, 0);
            const merge = await triangleCountWithSearch(ctx, snapshot, 1);
            const search = await triangleCountWithSearch(ctx, snapshot, 2);
            expectBitwiseEqual(merge.perNode, auto.perNode, `${name} merge`);
            expectBitwiseEqual(search.perNode, auto.perNode, `${name} search`);
            ctx.release(snapshot);
        }
    });

    it("dest receives the per-node counts; a wrong dest and an aborted signal are refused", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(KARATE_EDGES);
        const dest = new Uint32Array(34);
        const r = await triangleCount(ctx, s, { dest });
        expect(r.perNode).toBe(dest);
        expect(dest[0]).toBe(18);
        await expect(triangleCount(ctx, s, { dest: new Uint32Array(3) })).rejects.toMatchObject({
            code: "E_INVALID_ARGUMENT",
        });
        const controller = new AbortController();
        controller.abort();
        await expect(triangleCount(ctx, s, { signal: controller.signal })).rejects.toMatchObject({ code: "E_ABORTED" });
        let progress: [number, number] | null = null;
        await triangleCount(ctx, s, {
            onProgress: (done, total) => {
                progress = [done, total];
            },
        });
        expect(progress).toEqual([1, 1]);
        // a released snapshot is uploaded again by the next call
        ctx.release(s);
        expect((await triangleCount(ctx, s)).total).toBe(45);
        ctx.release(s);
    });

    afterAll(() => {
        shared?.dispose();
    });
});
