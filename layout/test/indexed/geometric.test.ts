import assert from "node:assert";

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { describe, it } from "vitest";

import {
    circularLayout,
    type Graph,
    gridLayout,
    indexed,
    type LayoutResult,
    type PositionMap,
    radialLayout,
    randomLayout,
    shellLayout,
    spiralLayout,
    toLayoutSnapshot,
    toPositionMap,
} from "../../src";

/** An edgeless snapshot of `n` nodes with ids 0 .. n - 1. */
const nodes = (n: number): GraphSnapshot =>
    fromEdgeArrays({ directed: false, nodeCount: n, src: new Uint32Array(0), dst: new Uint32Array(0) });

/** Row `i` of a result. */
const row = (r: LayoutResult, i: number): number[] => Array.from(r.positions.subarray(r.dim * i, r.dim * i + r.dim));

/** Euclidean distance of row `i` from `c`. */
const distance = (r: LayoutResult, i: number, c: readonly number[] = [0, 0, 0]): number =>
    Math.hypot(...row(r, i).map((v, k) => v - c[k]));

/** Every value of `actual` is within 1e-6 of the legacy map's (f32 output against f64). */
function matchesLegacy(actual: PositionMap, expected: PositionMap): void {
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort());
    for (const [node, p] of Object.entries(expected)) {
        assert.equal(actual[node].length, p.length, `node ${node} length`);
        p.forEach((v, k) => {
            assert.ok(Math.abs(actual[node][k] - v) <= 1e-6, `node ${node}[${k}]: ${actual[node][k]} vs ${v}`);
        });
    }
}

type Run = (s: GraphSnapshot, options: indexed.CommonLayoutOptions) => LayoutResult;

// every indexed layout, with the options that make it deterministic
const layouts: Record<string, Run> = {
    circular: (s, o) => indexed.circular(s, o),
    shell: (s, o) => indexed.shell(s, o),
    spiral: (s, o) => indexed.spiral(s, o),
    grid: (s, o) => indexed.grid(s, o),
    random: (s, o) => indexed.random(s, { seed: 7, ...o }),
    radial: (s, o) => indexed.radial(s, o),
};

describe("indexed geometric layouts: common options", () => {
    for (const [name, run] of Object.entries(layouts)) {
        for (const dim of [2, 3] as const) {
            it(`${name}: n = 0 gives an empty ${dim}D result`, () => {
                const r = run(nodes(0), { dim });
                assert.equal(r.n, 0);
                assert.equal(r.dim, dim);
                assert.equal(r.positions.length, 0);
                assert.ok(r.positions instanceof Float32Array);
            });

            it(`${name}: n = 1 places the node ${name === "random" ? "in the unit cell at" : "on"} the ${dim}D centre`, () => {
                const center = dim === 2 ? [3, -2] : [3, -2, 5];
                const r = run(nodes(1), { dim, center });
                assert.equal(r.n, 1);
                assert.equal(r.positions.length, dim);
                if (name === "random") {
                    row(r, 0).forEach((v, k) => assert.ok(v >= center[k] && v < center[k] + 1));
                } else {
                    assert.deepEqual(row(r, 0), center);
                }
            });

            it(`${name}: ${dim}D rows, finite, and moved by the centre`, () => {
                const s = nodes(9);
                const at0 = run(s, { dim });
                const center = dim === 2 ? [10, -4] : [10, -4, 2.5];
                const moved = run(s, { dim, center });
                assert.equal(at0.positions.length, 9 * dim);
                assert.ok(at0.positions.every(Number.isFinite));
                for (let i = 0; i < 9 * dim; i++) {
                    assert.ok(Math.abs(moved.positions[i] - at0.positions[i] - center[i % dim]) < 1e-5, `[${i}]`);
                }
            });

            it(`${name}: ${dim}D scale multiplies every offset from the centre`, () => {
                const s = nodes(9);
                const one = run(s, { dim });
                const three = run(s, { dim, scale: 3 });
                for (let i = 0; i < 9 * dim; i++) {
                    assert.ok(Math.abs(three.positions[i] - 3 * one.positions[i]) < 1e-5, `[${i}]`);
                }
            });
        }

        it(`${name}: rejects a dimension other than 2 or 3`, () => {
            assert.throws(() => run(nodes(3), { dim: 4 as 3 }), /dim/);
        });
    }
});

describe("indexed geometric layouts: geometry", () => {
    it("circular puts every node at distance scale from the centre, in 2D and 3D", () => {
        for (const dim of [2, 3] as const) {
            const c = [1, 2, 3];
            const r = indexed.circular(nodes(12), { dim, scale: 2, center: c });
            for (let i = 0; i < 12; i++) {
                assert.ok(Math.abs(distance(r, i, c) - 2) < 1e-5, `dim ${dim} node ${i}`);
            }
        }
    });

    it("shell steps the radius by scale / shells from the centre node, and a 3D shell layout lies in the centre's z plane", () => {
        const r = indexed.shell(nodes(7), { dim: 3, scale: 2, center: [0, 0, 4], nlist: [[0], [1, 2, 3], [4, 5, 6]] });
        assert.deepEqual(row(r, 0), [0, 0, 4]);
        for (let i = 1; i < 7; i++) {
            // three shells, radius step 2 / 3: the single node of the first sits on the centre
            assert.ok(Math.abs(distance(r, i, [0, 0, 4]) - (i < 4 ? 2 / 3 : 4 / 3)) < 1e-5, `node ${i}`);
            assert.equal(row(r, i)[2], 4);
        }
    });

    it("spiral's farthest node is at distance scale from the centre", () => {
        const r = indexed.spiral(nodes(20), { scale: 5 });
        const far = Math.max(...Array.from({ length: 20 }, (_, i) => distance(r, i)));
        assert.ok(Math.abs(far - 5) < 1e-5);
    });

    it("grid spans [-scale, scale] along its longer side", () => {
        const r = indexed.grid(nodes(6), { columns: 2, scale: 2 });
        assert.deepEqual(row(r, 0), [-1, -2]);
        assert.deepEqual(row(r, 5), [1, 2]);
        assert.throws(() => indexed.grid(nodes(3), { columns: 0 }), /columns/);
    });

    it("random stays in [centre, centre + scale) and repeats for a seed", () => {
        const a = indexed.random(nodes(50), { dim: 3, scale: 2, center: [1, 1, 1], seed: 3 });
        assert.ok(a.positions.every((v) => v >= 1 && v < 3));
        assert.deepEqual(indexed.random(nodes(50), { dim: 3, scale: 2, center: [1, 1, 1], seed: 3 }).positions, a.positions);
    });

    it("radial puts each node on the ring of its hop distance from the root", () => {
        // path 0 - 1 - 2 - 3 - 4 plus the isolated node 5, which goes on one extra outer ring
        const s = fromEdgeArrays({
            directed: false,
            nodeCount: 6,
            src: Uint32Array.of(0, 1, 2, 3),
            dst: Uint32Array.of(1, 2, 3, 4),
        });
        const r = indexed.radial(s, { root: 0, scale: 5 });
        for (let i = 0; i < 6; i++) {
            assert.ok(Math.abs(distance(r, i) - i) < 1e-5, `node ${i}`);
        }
        assert.throws(() => indexed.radial(s, { root: 6 }), /root/);
    });
});

describe("indexed.shell shells from a node column", () => {
    const s = fromEdgeArrays({
        directed: false,
        nodeCount: 6,
        src: new Uint32Array(0),
        dst: new Uint32Array(0),
        nodeColumns: {
            level: Uint32Array.of(0, 7, 7, 7, 9, 9),
            ring: { data: ["hub", "inner", "inner", "inner", "outer", "outer"], decl: { dtype: "dict" } },
            weight: Float32Array.of(1, 2, 3, 4, 5, 6),
        },
    });

    it("a u32 column puts equal values on one shell, in ascending value order", () => {
        assert.deepEqual(indexed.shell(s, { nlist: "level" }).positions, indexed.shell(s, { nlist: [[0], [1, 2, 3], [4, 5]] }).positions);
    });

    it("a dict column puts equal values on one shell, in dictionary order", () => {
        assert.deepEqual(indexed.shell(s, { nlist: "ring" }).positions, indexed.shell(s, { nlist: [[0], [1, 2, 3], [4, 5]] }).positions);
    });

    it("rejects a column of another dtype", () => {
        assert.throws(() => indexed.shell(s, { nlist: "weight" }), /u32 or dict/);
    });

    it("leaves a node in no shell NaN", () => {
        const r = indexed.shell(s, { nlist: [[0, 1], [2, 3]] });
        assert.ok(row(r, 4).every(Number.isNaN));
        assert.ok(row(r, 5).every(Number.isNaN));
    });
});

describe("indexed geometric layouts match the legacy functions", () => {
    const g: Graph = {
        nodes: () => ["h", "a", "b", "c", "d", "e", "f", "x"],
        // the edge order differs from the node order, so ring order follows edges, not indices
        edges: () => [
            ["h", "d"],
            ["h", "b"],
            ["b", "e"],
            ["h", "a"],
            ["a", "f"],
            ["d", "c"],
        ],
    };
    const s = toLayoutSnapshot(g);
    const map = (r: LayoutResult): PositionMap => toPositionMap(r, s.ids);

    it("circular", () => {
        matchesLegacy(map(indexed.circular(s, { scale: 2, center: [1, 1] })), circularLayout(g, 2, [1, 1]));
        matchesLegacy(map(indexed.circular(s, { dim: 3 })), circularLayout(g, 1, null, 3));
    });

    it("shell", () => {
        const nlist = [[0], [1, 2, 3], [4, 5, 6, 7]];
        const legacy = nlist.map((shell) => shell.map((i) => s.ids.idOf(i)));
        matchesLegacy(map(indexed.shell(s, { nlist, scale: 3 })), shellLayout(g, legacy, 3));
    });

    it("spiral", () => {
        matchesLegacy(map(indexed.spiral(s, { scale: 2 })), spiralLayout(g, 2));
        matchesLegacy(map(indexed.spiral(s, { equidistant: true, resolution: 0.5 })), spiralLayout(g, 1, null, 2, 0.5, true));
    });

    it("grid", () => {
        matchesLegacy(map(indexed.grid(s, { columns: 3, scale: 2, center: [4, 4] })), gridLayout(g, 3, 2, [4, 4]));
    });

    it("random", () => {
        matchesLegacy(map(indexed.random(s, { dim: 3, seed: 11 })), randomLayout(g, null, 3, 11));
    });

    it("radial, including the default root and the neighbour order of the rings", () => {
        matchesLegacy(map(indexed.radial(s)), radialLayout(g));
        matchesLegacy(map(indexed.radial(s, { root: s.ids.indexOf("b"), scale: 4 })), radialLayout(g, "b", 4));
    });
});
