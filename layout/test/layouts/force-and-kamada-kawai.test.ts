import { fromEdgeArrays, GraphBuilder, type GraphSnapshot, makeMask, maskSet } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import * as layout from "../../src";
import { idealDistances } from "../../src/indexed/kamada-kawai";
import { goldenFile, matchesGolden } from "./golden";

const golden = goldenFile("force-and-kamada-kawai");

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

describe("kamadaKawai", () => {
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
        const computed = layout.kamadaKawai(s);
        const d = allPairs(6, edges);
        assert.deepEqual(Array.from(layout.kamadaKawai(s, { dist: d }).positions), Array.from(computed.positions));
        // the same matrix as f32, whose Infinity entries (4 and 5 are unreachable from 0..3) take the 1e6 fill
        const d32 = Float32Array.from(d);
        assert.deepEqual(Array.from(layout.kamadaKawai(s, { dist: d32 }).positions), Array.from(computed.positions));
        // in 3D too
        const in3d = layout.kamadaKawai(s, { dim: 3 });
        assert.equal(in3d.dim, 3);
        assert.deepEqual(
            Array.from(layout.kamadaKawai(s, { dim: 3, dist: d32 }).positions),
            Array.from(in3d.positions),
        );
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
            Array.from(layout.kamadaKawai(s).positions),
            Array.from(layout.kamadaKawai(s, { dist: allPairs(4, zero) }).positions),
        );
        assert.notDeepEqual(
            Array.from(layout.kamadaKawai(s).positions),
            Array.from(
                layout.kamadaKawai(
                    weighted(
                        4,
                        zero.map(([u, v, w]) => [u, v, w || 1]),
                    ),
                ).positions,
            ),
            "a zero weight is a zero distance, not 1",
        );
        const parallel = weighted(4, [...zero.slice(1), [0, 1, 5], [0, 1, 2], [1, 0, 7]]);
        const single = weighted(4, [...zero.slice(1), [0, 1, 2]]);
        assert.deepEqual(
            Array.from(layout.kamadaKawai(parallel).positions),
            Array.from(layout.kamadaKawai(single).positions),
        );
    });

    it("reads weights from the snapshot, a named edge column or not at all", () => {
        const s = fromEdgeArrays({
            directed: false,
            nodeCount: 4,
            src: Uint32Array.from([0, 1, 2, 3]),
            dst: Uint32Array.from([1, 2, 3, 0]),
            edgeColumns: { length: Float64Array.from([1, 3, 1, 3]) },
        });
        const byColumn = layout.kamadaKawai(s, { weight: "length" });
        const rect: [number, number, number][] = [
            [0, 1, 1],
            [1, 2, 3],
            [2, 3, 1],
            [3, 0, 3],
        ];
        assert.deepEqual(
            Array.from(byColumn.positions),
            Array.from(layout.kamadaKawai(s, { dist: allPairs(4, rect) }).positions),
        );
        assert.deepEqual(
            Array.from(layout.kamadaKawai(weighted(4, rect), { weight: false }).positions),
            Array.from(layout.kamadaKawai(s).positions),
            "weight: false and an unweighted snapshot both read every edge as 1",
        );
    });

    it("rejects a negative weight and a dist of the wrong size, and handles n = 0 and n = 1", () => {
        assert.throws(() => layout.kamadaKawai(weighted(2, [[0, 1, -1]])), /distances/);
        assert.throws(() => layout.kamadaKawai(grid(2, 2), { dist: new Float32Array(3) }), /16/);
        assert.equal(layout.kamadaKawai(grid(0, 0)).positions.length, 0);
        assert.deepEqual(Array.from(layout.kamadaKawai(grid(1, 1), { center: [2, 3] }).positions), [2, 3]);
    });

    it("gives an unreachable pair, computed or a non-finite dist entry, the ideal distance 1e6", () => {
        // 0-1 an edge, 2 isolated: an ideal distance other than 1e6 changes how far 2 sits from the pair
        const s = weighted(3, [[0, 1, 1]]);
        const far = 1e6;
        const explicit = Float64Array.from([0, 1, far, 1, 0, far, far, far, 0]);
        const expected = Array.from(layout.kamadaKawai(s, { dist: explicit }).positions);
        assert.deepEqual(Array.from(layout.kamadaKawai(s).positions), expected, "computed");
        const infinite = explicit.map((v) => (v === far ? Number.POSITIVE_INFINITY : v));
        assert.deepEqual(Array.from(layout.kamadaKawai(s, { dist: infinite }).positions), expected, "Infinity");
        const nan = explicit.map((v) => (v === far ? Number.NaN : v));
        assert.deepEqual(Array.from(layout.kamadaKawai(s, { dist: nan }).positions), expected, "NaN");
        const near = explicit.map((v) => (v === far ? 10 : v));
        assert.notDeepEqual(Array.from(layout.kamadaKawai(s, { dist: near }).positions), expected, "the fill matters");
    });

    it("reads f64 weights as exact f64 distances", () => {
        const b = new GraphBuilder({ directed: false, weighted: true, weightDtype: "f64" });
        b.addNodes([0, 1]);
        b.addEdge(0, 1, 0.1);
        assert.equal(idealDistances(b.freeze(), {})[0][1], 0.1);
    });

    it("reads a NaN component of pos as 0", () => {
        const s = grid(3, 1);
        const withNaN = Float32Array.from([1, Number.NaN, 0, 1, Number.NaN, 0.5]);
        const withZero = Float32Array.from([1, 0, 0, 1, 0, 0.5]);
        assert.deepEqual(
            Array.from(layout.kamadaKawai(s, { pos: withNaN }).positions),
            Array.from(layout.kamadaKawai(s, { pos: withZero }).positions),
        );
    });

    it("starts a 3D layout from seed 42 by default", () => {
        // recorded output on a 4-node path; a change to the default 3D start moves it
        const s = fromEdgeArrays({
            directed: false,
            nodeCount: 4,
            src: Uint32Array.of(0, 1, 2),
            dst: Uint32Array.of(1, 2, 3),
        });
        const expected = [
            -0.7830331325531006, -0.6201992034912109, -0.047009311616420746, -0.2615945339202881, -0.20616191625595093,
            -0.013450900092720985, 0.26123684644699097, 0.20655201375484467, 0.014248745515942574, 0.7833908200263977,
            0.6198091506958008, 0.04621146619319916,
        ];
        const actual = Array.from(layout.kamadaKawai(s, { dim: 3 }).positions);
        assert.equal(actual.length, expected.length);
        expected.forEach((v, k) => assert.closeTo(actual[k], v, 1e-6, `component ${k}`));
        assert.deepEqual(Array.from(layout.kamadaKawai(s, { dim: 3, seed: 42 }).positions), actual);
    });
});

describe("forceAtlas2", () => {
    it("gives the same positions for a mass column as for the equivalent record and vector", () => {
        const heft = Float32Array.from({ length: 12 }, (_, i) => 1 + (i % 4));
        const s = grid(4, 3, { heft });
        const record: Record<number, number> = {};
        heft.forEach((m, i) => {
            record[i] = m;
        });
        const byRecord = layout.forceAtlas2(s, { nodeMass: record, seed: 7, maxIter: 30 });
        const byColumn = layout.forceAtlas2(s, { nodeMass: "heft", seed: 7, maxIter: 30 });
        const byVector = layout.forceAtlas2(s, { nodeMass: heft, seed: 7, maxIter: 30 });
        assert.deepEqual(Array.from(byColumn.positions), Array.from(byRecord.positions));
        assert.deepEqual(Array.from(byVector.positions), Array.from(byRecord.positions));
        assert.notDeepEqual(
            Array.from(layout.forceAtlas2(s, { seed: 7, maxIter: 30 }).positions),
            Array.from(byColumn.positions),
            "the mass reaches the layout",
        );
    });

    it("gives exactly the positions forceatlas2Layout gave in layout 1.x", () => {
        const s = grid(4, 3);
        matchesGolden(layout.forceAtlas2(s, { seed: 3, maxIter: 40, dim: 3 }), golden("forceAtlas2 grid 4x3 3d"), 0);
    });

    it("keeps the given rows of pos and seeds the NaN ones, and runs no iteration for maxIter 0", () => {
        const s = grid(3, 1);
        const pos = Float32Array.from([0, 0, Number.NaN, Number.NaN, 1, 1]);
        const r = layout.forceAtlas2(s, { pos, maxIter: 0, seed: 1 });
        assert.equal(r.n, 3);
        for (const v of r.positions) {
            assert.isTrue(Number.isFinite(v));
        }
        assert.throws(() => layout.forceAtlas2(s, { pos: new Float32Array(5) }), /6/);
    });
});

describe("fruchtermanReingold", () => {
    it("does not move a fixed node", () => {
        const s = grid(4, 4);
        const pos = Float32Array.from({ length: 32 }, (_, i) => Math.cos(i) * 0.7);
        const fixed = makeMask(16);
        maskSet(fixed, 5, true);
        maskSet(fixed, 10, true);
        const r = layout.fruchtermanReingold(s, { pos, fixed, iterations: 60, seed: 1 });
        for (const i of [5, 10]) {
            assert.equal(r.positions[2 * i], pos[2 * i]);
            assert.equal(r.positions[2 * i + 1], pos[2 * i + 1]);
        }
        assert.notEqual(r.positions[0], pos[0], "a free node moved");
    });

    it("pins the role-fixed bool column and then skips the rescale", () => {
        const pinned = makeMask(9);
        maskSet(pinned, 4, true);
        const s = grid(3, 3, { pinned: { data: pinned, decl: { dtype: "bool", role: "fixed" } } });
        const pos = Float32Array.from({ length: 18 }, (_, i) => 5 + Math.cos(i));
        const r = layout.fruchtermanReingold(s, { pos, iterations: 30, seed: 1 });
        assert.equal(r.positions[8], pos[8]);
        assert.equal(r.positions[9], pos[9]);
    });

    it("spreads the nodes missing from pos, even when pos names one node or a line", () => {
        const s = fromEdgeArrays({
            directed: false,
            nodeCount: 5,
            src: Uint32Array.of(0, 1, 2, 3, 4),
            dst: Uint32Array.of(1, 2, 3, 4, 0),
        });
        const distinct = (r: layout.LayoutResult, axis: number): number =>
            new Set([0, 1, 2, 3, 4].map((i) => r.positions[r.dim * i + axis].toFixed(6))).size;
        const start = (dim: 2 | 3, given: Readonly<Record<number, readonly number[]>>) => {
            const pos = new Float32Array(5 * dim).fill(Number.NaN);
            for (const [i, p] of Object.entries(given)) {
                pos.set(p, dim * Number(i));
            }
            return pos;
        };
        const pinned = (...nodes: number[]) => {
            const mask = makeMask(5);
            nodes.forEach((i) => maskSet(mask, i, true));
            return mask;
        };
        for (const [given, fixed] of [
            [{ 0: [0.5, 0.5] }, null],
            [{ 0: [0.5, 0.5] }, pinned(0)],
            [{ 0: [0.5, 0.2], 1: [0.5, 0.9] }, null],
        ] as const) {
            const r = layout.fruchtermanReingold(s, { pos: start(2, given), fixed, iterations: 50, seed: 3 });
            assert.equal(distinct(r, 0), 5, `x of ${JSON.stringify(given)} fixed ${String(fixed !== null)}`);
            assert.equal(distinct(r, 1), 5, `y of ${JSON.stringify(given)} fixed ${String(fixed !== null)}`);
        }
        const r3 = layout.fruchtermanReingold(s, {
            pos: start(3, { 0: [1, 1, 0] }),
            fixed: pinned(0),
            iterations: 50,
            dim: 3,
            seed: 3,
        });
        // node 0 keeps its row; the others spread in z too
        assert.equal(new Set([1, 2, 3, 4].map((i) => r3.positions[3 * i + 2].toFixed(6))).size, 4, "z in 3D");
    });

    it("gives the positions fruchtermanReingoldLayout gave in layout 1.x for a seed", () => {
        const s = grid(5, 4);
        for (const dim of [2, 3] as const) {
            matchesGolden(
                layout.fruchtermanReingold(s, { iterations: 50, dim, seed: 42 }),
                golden(`fruchtermanReingold loop ${dim}d`),
            );
        }
    });

    it("runs the ceiling of a fractional iteration count and none for a negative or non-finite one", () => {
        const s = grid(3, 3);
        const run = (iterations: number): number[] =>
            Array.from(layout.fruchtermanReingold(s, { iterations, seed: 1 }).positions);
        assert.deepEqual(run(2.5), run(3));
        assert.notDeepEqual(run(3), run(0));
        for (const none of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
            assert.deepEqual(run(none), run(0), String(none));
        }
    });

    it("reads a NaN k as the default", () => {
        const s = grid(2, 2);
        assert.deepEqual(
            layout.fruchtermanReingold(s, { k: Number.NaN, seed: 3 }).positions,
            layout.fruchtermanReingold(s, { seed: 3 }).positions,
        );
    });
});

describe("arf", () => {
    it("gives the positions arfLayout gave from the same start", () => {
        const s = grid(4, 3);
        const pos = Float32Array.from({ length: 24 }, (_, i) => ((i * 37) % 11) / 11);
        const r = layout.arf(s, { pos, a: 1.5, maxIter: 300 });
        matchesGolden(r, golden("arf from a start"), 1e-5);
    });

    it("seeds from the seed as arfLayout did, rejects a <= 1 and handles n = 0", () => {
        const s = grid(3, 3);
        const r = layout.arf(s, { seed: 9, maxIter: 50 });
        matchesGolden(r, golden("arf seeded"), 1e-4);
        assert.throws(() => layout.arf(s, { a: 1 }), /larger than 1/);
        assert.equal(layout.arf(grid(0, 0)).n, 0);
    });
});
