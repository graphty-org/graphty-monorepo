import assert from "node:assert";

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { randomTreeGraph } from "@graphty/graph-samples/generators";
import { describe, it } from "vitest";

import * as layout from "../../src";
import { type CommonLayoutOptions, type Graph, type LayoutResult, toLayoutSnapshot } from "../../src";
import { goldenFile, matchesGolden } from "./golden";

/** An edgeless snapshot of `n` nodes with ids 0 .. n - 1. */
const nodes = (n: number): GraphSnapshot =>
    fromEdgeArrays({ directed: false, nodeCount: n, src: new Uint32Array(0), dst: new Uint32Array(0) });

/** Row `i` of a result. */
const row = (r: LayoutResult, i: number): number[] => Array.from(r.positions.subarray(r.dim * i, r.dim * i + r.dim));

/** Euclidean distance of row `i` from `c`. */
const distance = (r: LayoutResult, i: number, c: readonly number[] = [0, 0, 0]): number =>
    Math.hypot(...row(r, i).map((v, k) => v - c[k]));

const golden = goldenFile("geometric");

type Run = (s: GraphSnapshot, options: CommonLayoutOptions) => LayoutResult;

// every geometric layout, with the options that make it deterministic
const layouts: Record<string, Run> = {
    circular: (s, o) => layout.circular(s, o),
    shell: (s, o) => layout.shell(s, o),
    spiral: (s, o) => layout.spiral(s, o),
    grid: (s, o) => layout.grid(s, o),
    random: (s, o) => layout.random(s, { seed: 7, ...o }),
    radial: (s, o) => layout.radial(s, o),
    "radial sectors": (s, o) => layout.radial(s, { ...o, arrangement: "sectors" }),
};

describe("geometric layouts: common options", () => {
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

describe("geometric layouts: geometry", () => {
    it("circular puts every node at distance scale from the centre, in 2D and 3D", () => {
        for (const dim of [2, 3] as const) {
            const c = [1, 2, 3];
            const r = layout.circular(nodes(12), { dim, scale: 2, center: c });
            for (let i = 0; i < 12; i++) {
                assert.ok(Math.abs(distance(r, i, c) - 2) < 1e-5, `dim ${dim} node ${i}`);
            }
        }
    });

    it("shell steps the radius by scale / shells from the centre node, and a 3D shell layout lies in the centre's z plane", () => {
        const r = layout.shell(nodes(7), { dim: 3, scale: 2, center: [0, 0, 4], nlist: [[0], [1, 2, 3], [4, 5, 6]] });
        assert.deepEqual(row(r, 0), [0, 0, 4]);
        for (let i = 1; i < 7; i++) {
            // three shells, radius step 2 / 3: the single node of the first sits on the center
            assert.ok(Math.abs(distance(r, i, [0, 0, 4]) - (i < 4 ? 2 / 3 : 4 / 3)) < 1e-5, `node ${i}`);
            assert.equal(row(r, i)[2], 4);
        }
    });

    it("spiral's farthest node is at distance scale from the centre", () => {
        const r = layout.spiral(nodes(20), { scale: 5 });
        const far = Math.max(...Array.from({ length: 20 }, (_, i) => distance(r, i)));
        assert.ok(Math.abs(far - 5) < 1e-5);
    });

    it("spiral's 2D rows are exactly those of the flat spiral before 3D existed, whatever the height", () => {
        // recorded from layout before the 3D spiral was added
        const plain = Float32Array.of(
            -0.19974835216999054,
            -0.6974629163742065,
            0.10043998807668686,
            -0.5878856182098389,
            0.28908148407936096,
            -0.28572723269462585,
            0.27726686000823975,
            0.1341250091791153,
            0.017512181773781776,
            0.5621883869171143,
            -0.48455217480659485,
            0.8747623562812805,
        );
        const equidistant = Float32Array.of(
            -0.48406094312667847,
            0.7013354301452637,
            0.37498337030410767,
            0.8832765221595764,
            1.093117594718933,
            1.3945249319076538,
            1.5736358165740967,
            2.1366403102874756,
            1.7692697048187256,
            3.000875234603882,
            1.6730544567108154,
            3.883347511291504,
        );
        assert.deepStrictEqual(layout.spiral(nodes(6)).positions, plain);
        assert.deepStrictEqual(layout.spiral(nodes(6), { height: 5 }).positions, plain);
        assert.deepStrictEqual(
            layout.spiral(nodes(6), { equidistant: true, resolution: 0.5, scale: 2, center: [1, 2] }).positions,
            equidistant,
        );
    });

    it("spiral in 3D is a cone: the 2D angle and radius, z rising height per unit of radius", () => {
        const n = 5;
        const height = 2;
        const raw = Array.from({ length: n }, (_, i) => [Math.cos(0.35 * i) * i, Math.sin(0.35 * i) * i, height * i]);
        const mean = [0, 1, 2].map((k) => raw.reduce((t, p) => t + p[k], 0) / n);
        const far = Math.max(...raw.map((p) => Math.hypot(...p.map((v, k) => v - mean[k]))));
        const center = [1, -2, 3];
        const r = layout.spiral(nodes(n), { dim: 3, height, scale: 4, center });
        raw.forEach((p, i) =>
            row(r, i).forEach((v, k) => {
                const expected = ((p[k] - mean[k]) * 4) / far + center[k];
                assert.ok(Math.abs(v - expected) < 1e-5, `node ${i}[${k}]: ${v} vs ${expected}`);
            }),
        );
    });

    it("spiral in 3D: distinct nodes rising in node order, the farthest at distance scale, in both modes", () => {
        for (const equidistant of [false, true]) {
            const center = [2, 3, -1];
            const r = layout.spiral(nodes(30), { dim: 3, scale: 5, center, equidistant });
            const keys = new Set(Array.from({ length: 30 }, (_, i) => row(r, i).join(",")));
            assert.equal(keys.size, 30);
            for (let i = 1; i < 30; i++) {
                assert.ok(row(r, i)[2] > row(r, i - 1)[2], `equidistant ${equidistant} node ${i}`);
            }
            const far = Math.max(...Array.from({ length: 30 }, (_, i) => distance(r, i, center)));
            assert.ok(Math.abs(far - 5) < 1e-5);
        }
    });

    it("spiral in 3D equidistant mode keeps consecutive nodes evenly spaced along the 3D curve", () => {
        const r = layout.spiral(nodes(40), { dim: 3, equidistant: true, height: 3 });
        const gaps = Array.from({ length: 39 }, (_, i) => Math.hypot(...row(r, i + 1).map((v, k) => v - row(r, i)[k])));
        // one unit of arc before rescaling; the chord is a little shorter where the curve bends most, near the tip
        const mean = gaps.reduce((t, g) => t + g, 0) / gaps.length;
        gaps.forEach((g, i) => assert.ok(Math.abs(g / mean - 1) < 0.03, `gap ${i}: ${g} vs ${mean}`));
    });

    it("spiral in 3D with height 0 lies flat in the centre's z plane, and refuses a height that is not finite", () => {
        const r = layout.spiral(nodes(10), { dim: 3, height: 0, center: [0, 0, 7] });
        for (let i = 0; i < 10; i++) {
            assert.equal(row(r, i)[2], 7);
        }
        assert.throws(
            () => layout.spiral(nodes(3), { dim: 3, height: Number.NaN }),
            (e: unknown) => (e as { code?: string }).code === "E_BAD_OPTION",
        );
    });

    it("grid spans [-scale, scale] along its longer side", () => {
        const r = layout.grid(nodes(6), { columns: 2, scale: 2 });
        assert.deepEqual(row(r, 0), [-1, -2]);
        assert.deepEqual(row(r, 5), [1, 2]);
        assert.throws(() => layout.grid(nodes(3), { columns: 0 }), /columns/);
    });

    it("random stays in [centre, centre + scale) and repeats for a seed", () => {
        const a = layout.random(nodes(50), { dim: 3, scale: 2, center: [1, 1, 1], seed: 3 });
        assert.ok(a.positions.every((v) => v >= 1 && v < 3));
        assert.deepEqual(
            layout.random(nodes(50), { dim: 3, scale: 2, center: [1, 1, 1], seed: 3 }).positions,
            a.positions,
        );
    });

    it("radial puts each node on the ring of its hop distance from the root", () => {
        // path 0 - 1 - 2 - 3 - 4 plus the isolated node 5, which goes on one extra outer ring
        const s = fromEdgeArrays({
            directed: false,
            nodeCount: 6,
            src: Uint32Array.of(0, 1, 2, 3),
            dst: Uint32Array.of(1, 2, 3, 4),
        });
        const r = layout.radial(s, { root: 0, scale: 5 });
        for (let i = 0; i < 6; i++) {
            assert.ok(Math.abs(distance(r, i) - i) < 1e-5, `node ${i}`);
        }
        assert.throws(() => layout.radial(s, { root: 6 }), /root/);
    });
});

describe("shell shells from a node column", () => {
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
        assert.deepEqual(
            layout.shell(s, { nlist: "level" }).positions,
            layout.shell(s, { nlist: [[0], [1, 2, 3], [4, 5]] }).positions,
        );
    });

    it("a dict column puts equal values on one shell, in dictionary order", () => {
        assert.deepEqual(
            layout.shell(s, { nlist: "ring" }).positions,
            layout.shell(s, { nlist: [[0], [1, 2, 3], [4, 5]] }).positions,
        );
    });

    it("rejects a column of another dtype", () => {
        assert.throws(() => layout.shell(s, { nlist: "weight" }), /u32 or dict/);
    });

    it("leaves a node in no shell NaN", () => {
        const r = layout.shell(s, {
            nlist: [
                [0, 1],
                [2, 3],
            ],
        });
        assert.ok(row(r, 4).every(Number.isNaN));
        assert.ok(row(r, 5).every(Number.isNaN));
    });
});

describe("geometric layouts reproduce the positional layouts of layout 1.x", () => {
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

    it("circular", () => {
        matchesGolden(layout.circular(s, { scale: 2, center: [1, 1] }), golden("circular 2d"));
        matchesGolden(layout.circular(s, { dim: 3 }), golden("circular 3d"));
    });

    it("shell", () => {
        const nlist = [[0], [1, 2, 3], [4, 5, 6, 7]];
        matchesGolden(layout.shell(s, { nlist, scale: 3 }), golden("shell"));
        matchesGolden(layout.shell(s, { nlist, scale: 3, rotate: 0 }), golden("shell"));
    });

    it("spiral", () => {
        matchesGolden(layout.spiral(s, { scale: 2 }), golden("spiral"));
        matchesGolden(layout.spiral(s, { equidistant: true, resolution: 0.5 }), golden("spiral equidistant"));
    });

    it("grid", () => {
        matchesGolden(layout.grid(s, { columns: 3, scale: 2, center: [4, 4] }), golden("grid"));
    });

    it("random", () => {
        matchesGolden(layout.random(s, { dim: 3, seed: 11 }), golden("random"));
    });

    it("radial, including the default root and the neighbour order of the rings", () => {
        matchesGolden(layout.radial(s), golden("radial"));
        matchesGolden(layout.radial(s, { root: s.ids.indexOf("b"), scale: 4 }), golden("radial root b"));
    });

    it("radial with the default rotate and arrangement spelled out", () => {
        matchesGolden(layout.radial(s, { rotate: 0, arrangement: "rings" }), golden("radial"));
    });
});

describe("radial ring order and root choice", () => {
    /** Asserts row `i` is at `(cos(theta), sin(theta)) * radius`. */
    const at = (r: LayoutResult, i: number, radius: number, theta: number): void => {
        const [x, y] = row(r, i);
        assert.ok(
            Math.abs(x - radius * Math.cos(theta)) < 1e-6 && Math.abs(y - radius * Math.sin(theta)) < 1e-6,
            `node ${i}: ${x},${y}`,
        );
    };

    it("visits neighbours in edge order, not node-index order", () => {
        // nodes h a b c d e f x = indices 0 .. 7; the edges reach d, b, a from h in that order
        const s = fromEdgeArrays({
            directed: false,
            nodeCount: 8,
            src: Uint32Array.of(0, 0, 2, 0, 1, 4),
            dst: Uint32Array.of(4, 2, 5, 1, 6, 3),
        });
        const r = layout.radial(s, { root: 0 });
        // four rings (the isolated x is the fourth) at radii 0, 1/3, 2/3, 1
        at(r, 0, 0, 0);
        at(r, 4, 1 / 3, 0);
        at(r, 2, 1 / 3, (2 * Math.PI) / 3);
        at(r, 1, 1 / 3, (4 * Math.PI) / 3);
        at(r, 3, 2 / 3, 0);
        at(r, 5, 2 / 3, (2 * Math.PI) / 3);
        at(r, 6, 2 / 3, (4 * Math.PI) / 3);
        at(r, 7, 1, 0);
    });

    it("defaults the root to the lowest index on a degree tie", () => {
        // path 0 - 1 - 2 - 3: nodes 1 and 2 both have two neighbors
        const s = fromEdgeArrays({
            directed: false,
            nodeCount: 4,
            src: Uint32Array.of(0, 1, 2),
            dst: Uint32Array.of(1, 2, 3),
        });
        assert.deepEqual(row(layout.radial(s), 1), [0, 0]);
    });

    it("counts distinct neighbours, not parallel edges, when choosing the default root", () => {
        // node 0 has three parallel edges to 1; node 2 has two distinct neighbors
        const s = fromEdgeArrays({
            directed: false,
            nodeCount: 5,
            src: Uint32Array.of(0, 0, 0, 2, 2),
            dst: Uint32Array.of(1, 1, 1, 3, 4),
        });
        assert.deepEqual(row(layout.radial(s), 2), [0, 0]);
    });

    it("reads a directed snapshot as undirected", () => {
        // 1 -> 0 and 2 -> 1: node 0 has no out-arcs, yet 1 and 2 are one and two hops from it
        const s = fromEdgeArrays({
            directed: true,
            nodeCount: 3,
            src: Uint32Array.of(1, 2),
            dst: Uint32Array.of(0, 1),
        });
        const r = layout.radial(s, { root: 0 });
        assert.ok(Math.abs(distance(r, 1) - 0.5) < 1e-6);
        assert.ok(Math.abs(distance(r, 2) - 1) < 1e-6);
    });
});

describe("shell node checks", () => {
    it("leaves a node whose column value is unset NaN", () => {
        const s = fromEdgeArrays({
            directed: false,
            nodeCount: 3,
            src: new Uint32Array(0),
            dst: new Uint32Array(0),
            nodeColumns: { level: { data: [0, undefined, 1], decl: { dtype: "u32" } } },
        });
        const r = layout.shell(s, { nlist: "level" });
        assert.ok(row(r, 1).every(Number.isNaN));
        assert.ok(row(r, 2).every(Number.isFinite));
    });

    it("rejects the node index n and accepts n - 1", () => {
        assert.throws(() => layout.shell(nodes(3), { nlist: [[3]] }), /not a node/);
        assert.ok(row(layout.shell(nodes(3), { nlist: [[2]] }), 2).every(Number.isFinite));
    });
});

describe("edge cases of the shared rows", () => {
    it("layout.shell in 3D leaves a node in no shell all NaN, z included", () => {
        const r = layout.shell(nodes(4), { dim: 3, nlist: [[0, 1, 2]], center: [0, 0, 5] });
        assert.ok(row(r, 3).every(Number.isNaN));
        assert.equal(row(r, 0)[2], 5);
    });

    it("grid limits the columns to the node count", () => {
        const r = layout.grid(nodes(3), { columns: 10 });
        assert.deepEqual(
            [row(r, 0), row(r, 1), row(r, 2)],
            [
                [-1, 0],
                [0, 0],
                [1, 0],
            ],
        );
    });

    it("radial on an empty graph is empty whatever the centre", () => {
        assert.equal(layout.radial(nodes(0), { center: [0, 0, 0] }).n, 0);
    });
});

describe("radial sector arrangement", () => {
    /** Asserts row `i` is at `(cos(theta), sin(theta)) * radius`. */
    const at = (r: LayoutResult, i: number, radius: number, theta: number): void => {
        const [x, y] = row(r, i);
        assert.ok(
            Math.abs(x - radius * Math.cos(theta)) < 1e-6 && Math.abs(y - radius * Math.sin(theta)) < 1e-6,
            `node ${i}: ${x},${y}`,
        );
    };

    it("gives each child the middle of its share of its parent's sector, in edge order", () => {
        // nodes h a b c d e f x = indices 0 .. 7; the edges reach d, b, a from h in that order
        const s = fromEdgeArrays({
            directed: false,
            nodeCount: 8,
            src: Uint32Array.of(0, 0, 2, 0, 1, 4),
            dst: Uint32Array.of(4, 2, 5, 1, 6, 3),
        });
        const r = layout.radial(s, { root: 0, arrangement: "sectors" });
        // four rings (the isolated x is the fourth) at radii 0, 1/3, 2/3, 1; d, b, a each have one leaf under them, so
        // each gets a third of the circle, and each one's only child sits on its parent's angle
        at(r, 0, 0, 0);
        at(r, 4, 1 / 3, Math.PI / 3);
        at(r, 2, 1 / 3, Math.PI);
        at(r, 1, 1 / 3, (5 * Math.PI) / 3);
        at(r, 3, 2 / 3, Math.PI / 3);
        at(r, 5, 2 / 3, Math.PI);
        at(r, 6, 2 / 3, (5 * Math.PI) / 3);
        at(r, 7, 1, 0);
    });

    it("shares a sector by leaves and keeps a deeper node's children within its tangent wedge", () => {
        // root 0 with children 1 (two leaves: 3, 4) and 2 (one leaf: 5)
        const s = fromEdgeArrays({
            directed: false,
            nodeCount: 6,
            src: Uint32Array.of(0, 0, 1, 1, 2),
            dst: Uint32Array.of(1, 2, 3, 4, 5),
        });
        const r = layout.radial(s, { root: 0, scale: 2, arrangement: "sectors" });
        // node 1 gets 2/3 of the circle, node 2 the last third
        at(r, 1, 1, (2 * Math.PI) / 3);
        at(r, 2, 1, (5 * Math.PI) / 3);
        // node 1's share (4 pi / 3) is wider than the wedge between its tangents at ring 1 that meet ring 2
        // (2 acos(1 / 2) = 2 pi / 3), so its two children split that wedge, centered on node 1's angle
        at(r, 3, 2, (2 * Math.PI) / 3 - Math.PI / 6);
        at(r, 4, 2, (2 * Math.PI) / 3 + Math.PI / 6);
        at(r, 5, 2, (5 * Math.PI) / 3);
    });

    it("draws a seeded 2,000-node random tree with distinct angles and no crossing edges", () => {
        const t = randomTreeGraph({ n: 2000, seed: 42 });
        const r = layout.radial(fromEdgeArrays({ directed: false, nodeCount: t.nodeCount, src: t.src, dst: t.dst }), {
            arrangement: "sectors",
        });
        const p = (i: number): number[] => row(r, i);
        let onAxis = 0;
        for (let i = 0; i < t.nodeCount; i++) {
            if (Math.abs(p(i)[1]) < 1e-6) {
                onAxis++;
            }
        }
        // the root, on the center; 190 with arrangement "rings"
        assert.ok(onAxis <= 3, `${onAxis} nodes on the x axis`);
        const side = (a: number[], b: number[], c: number[]): number =>
            Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
        let crossings = 0;
        for (let e = 0; e < t.src.length; e++) {
            for (let f = e + 1; f < t.src.length; f++) {
                const [a, b, c, d] = [t.src[e], t.dst[e], t.src[f], t.dst[f]];
                if (a === c || a === d || b === c || b === d) {
                    continue;
                }
                const [pa, pb, pc, pd] = [p(a), p(b), p(c), p(d)];
                if (side(pa, pb, pc) * side(pa, pb, pd) < 0 && side(pc, pd, pa) * side(pc, pd, pb) < 0) {
                    crossings++;
                }
            }
        }
        assert.equal(crossings, 0);
    });

    it("turns a lone child of the root, and the only children below it, off both axes", () => {
        // path 0 - 1 - 2 - 3 from root 0: every node is an only child
        const s = fromEdgeArrays({
            directed: false,
            nodeCount: 4,
            src: Uint32Array.of(0, 1, 2),
            dst: Uint32Array.of(1, 2, 3),
        });
        const r = layout.radial(s, { root: 0, arrangement: "sectors" });
        at(r, 1, 1 / 3, Math.PI / 4);
        at(r, 2, 2 / 3, Math.PI / 4);
        at(r, 3, 1, Math.PI / 4);
    });

    it("rejects a rotate, which would turn the rings apart and cross the tree's edges", () => {
        const s = nodes(3);
        assert.throws(() => layout.radial(s, { arrangement: "sectors", rotate: 1 }), /rotate/);
        assert.throws(() => layout.radial(s, { arrangement: "sectors", rotate: "networkx" }), /rotate/);
        layout.radial(s, { arrangement: "sectors", rotate: 0 });
    });

    it("rejects an unknown arrangement", () => {
        // as untyped JavaScript could pass it
        const options = JSON.parse('{ "arrangement": "spokes" }') as layout.RadialLayoutOptions;
        assert.throws(() => layout.radial(nodes(3), options), /arrangement/);
    });
});
