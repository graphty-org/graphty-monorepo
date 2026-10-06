/**
 * Boruvka's minimum spanning forest (design 8.5, 9.7; the P11 plan's P11-T4) against `@graphty/algorithms`'
 * `kruskalMST`: the edge SET exactly on every fixture -- tied weights included, because both break a tie by the edge
 * index -- and `totalWeight` to the f64 rounding of a different summation order. The fixtures are design 11.3's list
 * (unweighted, so every weight ties and the index alone decides) plus the weighted ones the list lacks: distinct
 * weights of both signs, a few repeated values, zero and negative zero, parallel edges with different weights,
 * self-loops, a forest, a directed multigraph, a path that needs more rounds than one submit holds, and the order key
 * itself over a sample of f32 values spanning both signs, the zeros, the subnormals and both infinities. Plus the run
 * twice (bitwise, unsorted), the snapshot's checksums intact, and the run options.
 */

import { kruskalMST } from "@graphty/algorithms";
import { type GraphSnapshot } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import { compressPasses, minimumSpanningTree } from "../../src/algorithms/mst.js";
import { BORUVKA_ROUNDS_PER_SUBMIT } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { type EdgeSpec, fixture, KARATE_EDGES, snapshotOf, xorshift } from "../helpers/graphs.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { deepPathEdges, distinctWeightEdges, drawnWeightEdges, mstAgreement, mstReport } from "../helpers/mst.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
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
 * The number of connected components of a snapshot, arcs read both ways.
 * @param s - the snapshot
 * @returns the component count
 */
function componentCount(s: GraphSnapshot): number {
    const parent = Array.from({ length: s.nodeCount }, (_, v) => v);
    const find = (v: number): number => {
        while (parent[v] !== v) {
            parent[v] = parent[parent[v]];
            v = parent[v];
        }
        return v;
    };
    const { src, dst } = s.edgeList();
    let count = s.nodeCount;
    for (let e = 0; e < s.edgeCount; e++) {
        const a = find(src[e]);
        const b = find(dst[e]);
        if (a !== b) {
            parent[a] = b;
            count--;
        }
    }
    return count;
}

/**
 * f32 values spanning both signs, both zeros, subnormals, the extremes and both infinities.
 * @param count - how many
 * @param seed - the generator seed
 * @returns the values (each exactly representable in f32)
 */
function f32Sample(count: number, seed: number): number[] {
    const random = xorshift(seed);
    const special = [0, -0, Infinity, -Infinity, 1e-45, -1e-45, 3.4e38, -3.4e38, 1, -1];
    const bits = new Uint32Array(1);
    const view = new Float32Array(bits.buffer);
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
        if (i < special.length) {
            out.push(Math.fround(special[i]));
            continue;
        }
        do {
            bits[0] = Math.floor(random() * 0x100000000);
        } while (Number.isNaN(view[0]));
        out.push(view[0]);
    }
    return out;
}

describe("minimumSpanningTree (GPU, design 8.5)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "mst" }));
        shared = ctx;
        return ctx;
    }

    /** Run twice, compare bitwise, check against Kruskal and the checksums, release. */
    async function agree(ctx: GpuContext, label: string, s: GraphSnapshot): Promise<GraphSnapshot> {
        const a = await minimumSpanningTree(ctx, s);
        const b = await minimumSpanningTree(ctx, s);
        expectBitwiseEqual(a.edges, b.edges, `${label} run-twice`);
        expect(a.totalWeight).toBe(b.totalWeight);
        assertCheckPasses(mstAgreement(label, s, a));
        expect(a.edges.length).toBe(s.nodeCount - componentCount(s));
        ctx.release(s);
        return s;
    }

    for (const name of FIXTURES) {
        it(`${name}: the edge set of kruskalMST (every weight ties), twice bitwise`, async (t) => {
            const ctx = await context(t);
            await agree(ctx, name, fixture(name, gpuScale()).snapshot);
        });
    }

    const weighted: readonly [string, () => GraphSnapshot][] = [
        ["distinct weights of both signs", () => snapshotOf(distinctWeightEdges(500, 3000, 11))],
        [
            "four repeated values, zero and negatives among them",
            () => snapshotOf(drawnWeightEdges(500, 3000, 12, [-1, 0, 2, 5])),
        ],
        [
            "zero and negative zero tie, broken by the index",
            () => snapshotOf(drawnWeightEdges(300, 1500, 13, [0, -0, 1])),
        ],
        [
            "parallel edges of different weights and self-loops",
            () =>
                snapshotOf([
                    [0, 1, 3],
                    [0, 1, -2],
                    [1, 1, -9],
                    [1, 2, 4],
                    [2, 1, 4],
                    [2, 2, -1],
                    [2, 3, 0],
                    [3, 0, 0],
                ]),
        ],
        [
            "a forest: three triangles, two isolated nodes",
            () =>
                snapshotOf(
                    [
                        [0, 1, 1],
                        [1, 2, 2],
                        [0, 2, 3],
                        [3, 4, 5],
                        [4, 5, 5],
                        [3, 5, 5],
                        [6, 7, -1],
                        [7, 8, -1],
                        [6, 8, -2],
                    ],
                    { nodeCount: 11 },
                ),
        ],
        [
            "a directed multigraph spans its underlying undirected graph",
            () => snapshotOf(drawnWeightEdges(400, 2000, 14, [0.5, 1, 1.5]), { directed: true, nodeCount: 400 }),
        ],
        [
            "infinite weights",
            () =>
                snapshotOf([
                    [0, 1, Infinity],
                    [1, 2, -Infinity],
                    [0, 2, 7],
                    [2, 3, Infinity],
                ]),
        ],
        [
            "karate with distinct weights",
            () => snapshotOf(KARATE_EDGES.map(([u, v], e) => [u, v, (e * 37) % 101] as const)),
        ],
    ];
    for (const [label, build] of weighted) {
        it(`${label}: the edge set of kruskalMST, twice bitwise`, async (t) => {
            const ctx = await context(t);
            await agree(ctx, label, build());
        });
    }

    it("a path that needs more rounds than one submit holds: n - 1 edges, total exact", async (t) => {
        const ctx = await context(t);
        const levels = 10;
        expect(levels).toBeGreaterThan(2 * BORUVKA_ROUNDS_PER_SUBMIT);
        const s = snapshotOf(deepPathEdges(levels));
        const r = await minimumSpanningTree(ctx, s);
        expect(r.edges.length).toBe(2 ** levels - 1);
        expect(r.totalWeight).toBe(kruskalMST(s).totalWeight);
        await agree(ctx, "deep", s);
    });

    it("the order key is monotone: of two parallel edges the lower f32 is taken, the lower index on a tie", async (t) => {
        const ctx = await context(t);
        const values = f32Sample(4000, 21);
        const edges: EdgeSpec[] = [];
        for (let i = 0; i + 1 < values.length; i += 2) {
            const u = i;
            edges.push([u, u + 1, values[i]], [u, u + 1, values[i + 1]]);
        }
        // also every special value against every other
        const specials = values.slice(0, 10);
        let base = values.length;
        for (const a of specials) {
            for (const b of specials) {
                edges.push([base, base + 1, a], [base, base + 1, b]);
                base += 2;
            }
        }
        await agree(ctx, "order-key", snapshotOf(edges, { nodeCount: base }));
    });

    it("a seeded G(n, m) at scale, weights with ties", async (t) => {
        const ctx = await context(t);
        const n = Math.max(500, Math.round(100_000 * gpuScale()));
        await agree(ctx, "scale", snapshotOf(drawnWeightEdges(n, 10 * n, 15, [1, 2, 3, 4, 5, 6, 7, 8])));
    });

    it("the snapshot is not written: its checksums hold after a run", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(drawnWeightEdges(300, 1200, 16, [1, 2]), { checksum: true });
        await minimumSpanningTree(ctx, s);
        s.validate({ checksum: true });
        ctx.release(s);
    });

    it("dest is refused, an aborted signal is refused, onProgress ends at (1, 1), a released snapshot uploads again", async (t) => {
        const ctx = await context(t);
        const s = snapshotOf(KARATE_EDGES);
        await expect(minimumSpanningTree(ctx, s, { dest: new Uint32Array(33) })).rejects.toMatchObject({
            code: "E_UNSUPPORTED",
        });
        const controller = new AbortController();
        controller.abort();
        await expect(minimumSpanningTree(ctx, s, { signal: controller.signal })).rejects.toMatchObject({
            code: "E_ABORTED",
        });
        let progress: [number, number] | null = null;
        await minimumSpanningTree(ctx, s, {
            onProgress: (done, total) => {
                progress = [done, total];
            },
        });
        expect(progress).toEqual([1, 1]);
        ctx.release(s);
        expect((await minimumSpanningTree(ctx, s)).edges.length).toBe(33);
        ctx.release(s);
    });

    it("the sabotage check passes on the real kernels", async (t) => {
        const ctx = await context(t);
        const report = await mstReport(ctx);
        expect(report.worst, report.worstLabel).toBe(0);
    });

    it("compressPasses: enough 1024-step walks to flatten any forest of n vertices", () => {
        expect(compressPasses(1)).toBe(1);
        expect(compressPasses(1024)).toBe(1);
        expect(compressPasses(1025)).toBe(2);
        expect(compressPasses(1024 * 1024)).toBe(2);
        expect(compressPasses(1024 * 1024 + 1)).toBe(3);
    });

    afterAll(() => {
        shared?.dispose();
    });
});
