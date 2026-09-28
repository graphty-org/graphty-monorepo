import { fromEdgeArrays, GraphBuilder, type GraphSnapshot, makeMask, maskSet } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import {
    arfLayout,
    forceatlas2Layout,
    fruchtermanReingoldLayout,
    indexed,
    kamadaKawaiLayout,
    springLayout,
} from "../../src";
import { fruchtermanReingoldLayoutLegacy } from "../../src/layouts/force-directed/fruchterman-reingold-legacy";
import { RandomNumberGenerator } from "../../src/utils/random";

type NodeColumns = NonNullable<Parameters<typeof fromEdgeArrays>[0]["nodeColumns"]>;

/** A w x h grid, node i = y * w + x. */
function grid(w: number, h: number, nodeColumns?: NodeColumns): GraphSnapshot {
    const src: number[] = [];
    const dst: number[] = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (x + 1 < w) {
                src.push(i);
                dst.push(i + 1);
            }
            if (y + 1 < h) {
                src.push(i);
                dst.push(i + w);
            }
        }
    }
    return fromEdgeArrays({
        directed: false,
        nodeCount: w * h,
        src: Uint32Array.from(src),
        dst: Uint32Array.from(dst),
        nodeColumns,
    });
}

/** An undirected weighted snapshot from [u, v, w] triples over nodes 0..n-1. */
function weighted(n: number, edges: [number, number, number][]): GraphSnapshot {
    const b = new GraphBuilder({ directed: false, weighted: true });
    b.addNodes(Array.from({ length: n }, (_, i) => i));
    for (const [u, v, w] of edges) {
        b.addEdge(u, v, w);
    }
    return b.freeze();
}

/** All-pairs distances by Floyd-Warshall over [u, v, w] triples; Infinity when unreachable. */
function allPairs(n: number, edges: [number, number, number][]): Float64Array {
    const d = new Float64Array(n * n).fill(Number.POSITIVE_INFINITY);
    for (let i = 0; i < n; i++) {
        d[i * n + i] = 0;
    }
    for (const [u, v, w] of edges) {
        d[u * n + v] = Math.min(d[u * n + v], w);
        d[v * n + u] = Math.min(d[v * n + u], w);
    }
    for (let k = 0; k < n; k++) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                d[i * n + j] = Math.min(d[i * n + j], d[i * n + k] + d[k * n + j]);
            }
        }
    }
    return d;
}

function assertClose(actual: ArrayLike<number>, expected: ArrayLike<number>, tol: number, what: string): void {
    assert.equal(actual.length, expected.length, `${what}: length`);
    for (let i = 0; i < actual.length; i++) {
        assert.approximately(actual[i], expected[i], tol, `${what}[${i}]`);
    }
}

describe("indexed.kamadaKawai", () => {
    const edges: [number, number, number][] = [
        [0, 1, 1],
        [1, 2, 2],
        [2, 3, 1],
        [3, 0, 3],
        [1, 3, 2],
        [4, 5, 1],
    ];

    it("gives identical positions for an injected dist equal to the computed one", () => {
        const s = weighted(6, edges);
        const computed = indexed.kamadaKawai(s);
        const d = allPairs(6, edges);
        assert.deepEqual(Array.from(indexed.kamadaKawai(s, { dist: d }).positions), Array.from(computed.positions));
        // the same matrix as f32, whose Infinity entries (4 and 5 are unreachable from 0..3) take the 1e6 fill
        const d32 = Float32Array.from(d);
        assert.deepEqual(Array.from(indexed.kamadaKawai(s, { dist: d32 }).positions), Array.from(computed.positions));
        // in 3D too
        const in3d = indexed.kamadaKawai(s, { dim: 3 });
        assert.equal(in3d.dim, 3);
        assert.deepEqual(Array.from(indexed.kamadaKawai(s, { dim: 3, dist: d32 }).positions), Array.from(in3d.positions));
    });

    it("honours a zero weight and takes the minimum over parallel arcs", () => {
        const zero: [number, number, number][] = [
            [0, 1, 0],
            [1, 2, 1],
            [2, 3, 1],
            [3, 0, 1],
        ];
        const s = weighted(4, zero);
        assert.deepEqual(
            Array.from(indexed.kamadaKawai(s).positions),
            Array.from(indexed.kamadaKawai(s, { dist: allPairs(4, zero) }).positions),
        );
        assert.notDeepEqual(
            Array.from(indexed.kamadaKawai(s).positions),
            Array.from(indexed.kamadaKawai(weighted(4, zero.map(([u, v, w]) => [u, v, w || 1]))).positions),
            "a zero weight is a zero distance, not 1",
        );
        const parallel = weighted(4, [...zero.slice(1), [0, 1, 5], [0, 1, 2], [1, 0, 7]]);
        const single = weighted(4, [...zero.slice(1), [0, 1, 2]]);
        assert.deepEqual(Array.from(indexed.kamadaKawai(parallel).positions), Array.from(indexed.kamadaKawai(single).positions));
    });

    it("reads weights from the snapshot, a named edge column or not at all", () => {
        const s = fromEdgeArrays({
            directed: false,
            nodeCount: 4,
            src: Uint32Array.from([0, 1, 2, 3]),
            dst: Uint32Array.from([1, 2, 3, 0]),
            edgeColumns: { length: Float64Array.from([1, 3, 1, 3]) },
        });
        const byColumn = indexed.kamadaKawai(s, { weight: "length" });
        const rect: [number, number, number][] = [
            [0, 1, 1],
            [1, 2, 3],
            [2, 3, 1],
            [3, 0, 3],
        ];
        assert.deepEqual(Array.from(byColumn.positions), Array.from(indexed.kamadaKawai(s, { dist: allPairs(4, rect) }).positions));
        assert.deepEqual(
            Array.from(indexed.kamadaKawai(weighted(4, rect), { weight: false }).positions),
            Array.from(indexed.kamadaKawai(s).positions),
            "weight: false and an unweighted snapshot both read every edge as 1",
        );
    });

    it("rejects a negative weight and a dist of the wrong size, and handles n = 0 and n = 1", () => {
        assert.throws(() => indexed.kamadaKawai(weighted(2, [[0, 1, -1]])), /distances/);
        assert.throws(() => indexed.kamadaKawai(grid(2, 2), { dist: new Float32Array(3) }), /16/);
        assert.equal(indexed.kamadaKawai(grid(0, 0)).positions.length, 0);
        assert.deepEqual(Array.from(indexed.kamadaKawai(grid(1, 1), { center: [2, 3] }).positions), [2, 3]);
    });

    it("equals kamadaKawaiLayout, which runs on it", () => {
        const s = weighted(6, edges);
        const r = indexed.kamadaKawai(s, { scale: 2, center: [1, -1] });
        const graph = {
            nodes: () => [0, 1, 2, 3, 4, 5],
            edges: () => edges.map(([u, v]) => [u, v] as [number, number]),
            getEdgeData: (u: number, v: number) => edges.find(([a, b]) => (a === u && b === v) || (a === v && b === u))?.[2],
        };
        const legacy = kamadaKawaiLayout(graph as never, null, null, "weight", 2, [1, -1]);
        for (let i = 0; i < 6; i++) {
            assert.deepEqual(legacy[i], [r.positions[2 * i], r.positions[2 * i + 1]]);
        }
    });

    it("lays kamadaKawaiLayout out in the dim it is given, 1 and 4 included, about the centre", () => {
        const cycle = { nodes: () => [0, 1, 2, 3], edges: (): [number, number][] => [[0, 1], [1, 2], [2, 3], [3, 0]] };
        for (const center of [[7], [7, 8, 9, 10]]) {
            const out = kamadaKawaiLayout(cycle, null, null, "weight", 1, center, center.length);
            for (let k = 0; k < center.length; k++) {
                const mean = [0, 1, 2, 3].reduce((sum, i) => sum + out[i][k], 0) / 4;
                assert.approximately(mean, center[k], 1e-9, `dim ${center.length} component ${k}`);
            }
            for (const i of [0, 1, 2, 3]) {
                assert.equal(out[i].length, center.length);
                assert.isTrue(out[i].every(Number.isFinite));
            }
            // opposite corners of the cycle end further apart than neighbours
            const d = (a: number, b: number): number => Math.hypot(...out[a].map((v, k) => v - out[b][k]));
            assert.isAbove(d(0, 2), d(0, 1));
        }
    });
});

describe("indexed.forceAtlas2", () => {
    it("gives the same positions for a mass column as for the equivalent record and vector", () => {
        const heft = Float32Array.from({ length: 12 }, (_, i) => 1 + (i % 4));
        const s = grid(4, 3, { heft });
        const record: Record<number, number> = {};
        heft.forEach((m, i) => {
            record[i] = m;
        });
        const byRecord = indexed.forceAtlas2(s, { nodeMass: record, seed: 7, maxIter: 30 });
        const byColumn = indexed.forceAtlas2(s, { nodeMass: "heft", seed: 7, maxIter: 30 });
        const byVector = indexed.forceAtlas2(s, { nodeMass: heft, seed: 7, maxIter: 30 });
        assert.deepEqual(Array.from(byColumn.positions), Array.from(byRecord.positions));
        assert.deepEqual(Array.from(byVector.positions), Array.from(byRecord.positions));
        assert.notDeepEqual(
            Array.from(indexed.forceAtlas2(s, { seed: 7, maxIter: 30 }).positions),
            Array.from(byColumn.positions),
            "the mass reaches the layout",
        );
    });

    it("equals forceatlas2Layout, which runs on it", () => {
        const s = grid(4, 3);
        const r = indexed.forceAtlas2(s, { seed: 3, maxIter: 40, dim: 3 });
        const graph = { nodes: () => s.ids.toArray(), edges: () => Array.from(s.edgeList().src, (u, e) => [u, s.edgeList().dst[e]] as [number, number]) };
        const legacy = forceatlas2Layout(graph as never, null, 40, 1, 2, 1, false, false, null, null, null, false, false, 3, 3);
        for (let i = 0; i < s.nodeCount; i++) {
            assert.deepEqual(legacy[i], Array.from(r.positions.subarray(3 * i, 3 * i + 3)));
        }
    });

    it("keeps the given rows of pos and seeds the NaN ones, and runs no iteration for maxIter 0", () => {
        const s = grid(3, 1);
        const pos = Float32Array.from([0, 0, Number.NaN, Number.NaN, 1, 1]);
        const r = indexed.forceAtlas2(s, { pos, maxIter: 0, seed: 1 });
        assert.equal(r.n, 3);
        for (const v of r.positions) {
            assert.isTrue(Number.isFinite(v));
        }
        assert.throws(() => indexed.forceAtlas2(s, { pos: new Float32Array(5) }), /6/);
    });
});

describe("indexed.fruchtermanReingold", () => {
    it("does not move a fixed node", () => {
        const s = grid(4, 4);
        const pos = Float32Array.from({ length: 32 }, (_, i) => Math.cos(i) * 0.7);
        const fixed = makeMask(16);
        maskSet(fixed, 5, true);
        maskSet(fixed, 10, true);
        const r = indexed.fruchtermanReingold(s, { pos, fixed, iterations: 60, seed: 1 });
        for (const i of [5, 10]) {
            assert.equal(r.positions[2 * i], pos[2 * i]);
            assert.equal(r.positions[2 * i + 1], pos[2 * i + 1]);
        }
        assert.notEqual(r.positions[0], pos[0], "a free node moved");
    });

    it("does not move a fixed node through fruchtermanReingoldLayout either, to the caller's own coordinates", () => {
        const nodes = ["a", "b", "c", "d", "e"];
        const graph = { nodes: () => nodes, edges: (): [string, string][] => [["a", "b"], ["b", "c"], ["c", "d"], ["d", "e"], ["e", "a"]] };
        const initial: Record<string, number[]> = {};
        nodes.forEach((id, i) => {
            initial[id] = [Math.cos((2 * Math.PI * i) / 5), Math.sin((2 * Math.PI * i) / 5)];
        });
        const out = fruchtermanReingoldLayout(graph, null, initial, ["a", "c"], 50);
        assert.deepEqual(out.a, initial.a);
        assert.deepEqual(out.c, initial.c);
        assert.notDeepEqual(out.b, initial.b);
    });

    it("matches the legacy loop from the same seeded start", () => {
        const w = 5;
        const h = 4;
        const s = grid(w, h);
        const graph = { nodes: () => s.ids.toArray(), edges: () => Array.from(s.edgeList().src, (u, e) => [u, s.edgeList().dst[e]] as [number, number]) };
        for (const dim of [2, 3] as const) {
            // the wrapper draws the legacy generator's values in the same order, stored as f32; the loop amplifies a
            // 3e-8 difference in the start to 3e-4 over 50 iterations, so the oracle starts from the f32 values too
            const rng = new RandomNumberGenerator(42);
            const start: Record<number, number[]> = {};
            for (let i = 0; i < s.nodeCount; i++) {
                start[i] = (rng.rand(dim) as number[]).map(Math.fround);
            }
            const expected = fruchtermanReingoldLayoutLegacy(graph, null, start, null, 50, 1, null, dim, 42);
            const actual = fruchtermanReingoldLayout(graph, null, null, null, 50, 1, null, dim, 42);
            for (let i = 0; i < s.nodeCount; i++) {
                assertClose(actual[i], expected[i], 1e-6, `dim ${dim} node ${i}`);
            }
        }
    });

    it("runs the ceiling of a fractional iteration count and none for a negative or non-finite one", () => {
        const s = grid(3, 3);
        const run = (iterations: number): number[] => Array.from(indexed.fruchtermanReingold(s, { iterations, seed: 1 }).positions);
        assert.deepEqual(run(2.5), run(3));
        assert.notDeepEqual(run(3), run(0));
        for (const none of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
            assert.deepEqual(run(none), run(0), String(none));
        }
    });

    it("keeps the legacy fruchtermanReingoldLayout and springLayout for a dim other than 2 or 3 and an unusual k", () => {
        const graph = { nodes: () => [0, 1, 2, 3], edges: (): [number, number][] => [[0, 1], [1, 2], [2, 3], [3, 0]] };
        for (const dim of [1, 4]) {
            const center = Array.from({ length: dim }, (_, k) => k + 7);
            const expected = fruchtermanReingoldLayoutLegacy(graph, null, null, null, 50, 1, center, dim, 3);
            assert.deepEqual(fruchtermanReingoldLayout(graph, null, null, null, 50, 1, center, dim, 3), expected);
            assert.deepEqual(springLayout(graph, null, null, null, 50, 1, center, dim, 3), expected);
            assert.equal(expected[0].length, dim);
        }
        for (const k of [-1, Number.POSITIVE_INFINITY]) {
            const expected = fruchtermanReingoldLayoutLegacy(graph, k, null, null, 50, 1, null, 2, 3);
            assert.deepEqual(fruchtermanReingoldLayout(graph, k, null, null, 50, 1, null, 2, 3), expected, String(k));
        }
        assert.deepEqual(
            fruchtermanReingoldLayout(graph, Number.NaN, null, null, 50, 1, null, 2, 3),
            fruchtermanReingoldLayout(graph, null, null, null, 50, 1, null, 2, 3),
        );
    });
});

describe("indexed.arf", () => {
    it("matches arfLayout from the same start", () => {
        const s = grid(4, 3);
        const pos = Float32Array.from({ length: 24 }, (_, i) => ((i * 37) % 11) / 11);
        const r = indexed.arf(s, { pos, a: 1.5, maxIter: 300 });
        const start: Record<number, number[]> = {};
        for (let i = 0; i < 12; i++) {
            start[i] = [pos[2 * i], pos[2 * i + 1]];
        }
        const graph = { nodes: () => s.ids.toArray(), edges: () => Array.from(s.edgeList().src, (u, e) => [u, s.edgeList().dst[e]] as [number, number]) };
        const legacy = arfLayout(graph as never, start, 1, 1.5, 300);
        for (let i = 0; i < 12; i++) {
            assertClose([r.positions[2 * i], r.positions[2 * i + 1]], legacy[i], 1e-5, `node ${i}`);
        }
    });

    it("seeds from the seed as arfLayout does, rejects a <= 1 and handles n = 0", () => {
        const s = grid(3, 3);
        const graph = { nodes: () => s.ids.toArray(), edges: () => Array.from(s.edgeList().src, (u, e) => [u, s.edgeList().dst[e]] as [number, number]) };
        const r = indexed.arf(s, { seed: 9, maxIter: 50 });
        const legacy = arfLayout(graph as never, null, 1, 1.1, 50, 9);
        for (let i = 0; i < 9; i++) {
            assertClose([r.positions[2 * i], r.positions[2 * i + 1]], legacy[i], 1e-4, `node ${i}`);
        }
        assert.throws(() => indexed.arf(s, { a: 1 }), /larger than 1/);
        assert.equal(indexed.arf(grid(0, 0)).n, 0);
    });
});
