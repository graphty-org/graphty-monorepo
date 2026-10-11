import assert from "node:assert";

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { completeGraph, gridGraph, wheelGraph } from "@graphty/graph-samples/generators";
import { describe, it } from "vitest";

import * as layout from "../../src";
import { type CommonLayoutOptions, type Graph, type LayoutResult, toLayoutSnapshot } from "../../src";
import { goldenFile, matchesGolden } from "./golden";

/** An undirected snapshot of `n` nodes (ids 0 .. n - 1) and the given edges. */
const graph = (n: number, edges: readonly (readonly [number, number])[] = []): GraphSnapshot =>
    fromEdgeArrays({
        directed: false,
        nodeCount: n,
        src: Uint32Array.from(edges.map(([u]) => u)),
        dst: Uint32Array.from(edges.map(([, v]) => v)),
    });

/** Row `i` of a result. */
const row = (r: LayoutResult, i: number): number[] => Array.from(r.positions.subarray(r.dim * i, r.dim * i + r.dim));

/** A path of `n` nodes. */
const path = (n: number): GraphSnapshot =>
    graph(
        n,
        Array.from({ length: n - 1 }, (_, i) => [i, i + 1] as const),
    );

const golden = goldenFile("structural");

type Run = (s: GraphSnapshot, options: CommonLayoutOptions) => LayoutResult;

// every structural layout, deterministic and on a graph each accepts
const layouts: Record<string, Run> = {
    bfs: (s, o) => layout.bfs(s, o),
    bipartite: (s, o) => layout.bipartite(s, o),
    multipartite: (s, o) =>
        layout.multipartite(s, { subsets: [Array.from({ length: s.nodeCount }, (_, i) => i)], ...o }),
    planar: (s, o) => layout.planar(s, { seed: 3, ...o }),
    spectral: (s, o) => layout.spectral(s, { seed: 3, ...o }),
};

describe("structural layouts: common options", () => {
    for (const [name, run] of Object.entries(layouts)) {
        for (const dim of [2, 3] as const) {
            it(`${name}: n = 0 gives an empty ${dim}D result`, () => {
                const r = run(graph(0), { dim });
                assert.equal(r.n, 0);
                assert.equal(r.dim, dim);
                assert.equal(r.positions.length, 0);
            });

            it(`${name}: n = 1 places the node on the ${dim}D centre`, () => {
                const center = dim === 2 ? [3, -2] : [3, -2, 5];
                assert.deepEqual(row(run(graph(1), { dim, center }), 0), center);
            });

            it(`${name}: ${dim}D scale is the distance of the farthest node from the centre`, () => {
                const center = dim === 2 ? [1, 2] : [1, 2, 3];
                const r = run(path(7), { dim, scale: 3, center });
                let farthest = 0;
                for (let i = 0; i < 7; i++) {
                    const p = row(r, i);
                    assert.ok(p.every(Number.isFinite), `${name} node ${i}: ${p.join(",")}`);
                    farthest = Math.max(farthest, Math.hypot(...p.map((v, k) => v - center[k])));
                }
                assert.ok(Math.abs(farthest - 3) < 1e-5, `${name}: ${farthest}`);
                if (dim === 3 && name !== "spectral") {
                    for (let i = 0; i < 7; i++) {
                        assert.equal(row(r, i)[2], 3);
                    }
                }
            });
        }

        it(`${name}: rejects a dimension other than 2 or 3`, () => {
            assert.throws(() => run(path(4), { dim: 4 as 2 }), /dim must be 2 or 3/);
        });
    }
});

describe("multipartite", () => {
    const s = fromEdgeArrays({
        directed: false,
        nodeCount: 6,
        src: Uint32Array.of(0, 1, 2),
        dst: Uint32Array.of(3, 4, 5),
        nodeColumns: {
            level: Uint32Array.of(4, 4, 4, 9, 9, 2),
            side: { data: ["l", "l", "l", "r", "r", "m"], decl: { dtype: "dict" } },
            subset: Uint32Array.of(0, 0, 0, 1, 1, 1),
            weight: Float32Array.of(1, 2, 3, 4, 5, 6),
        },
    });

    it("matches the legacy layout for the same layers, vertical and horizontal", () => {
        const layers = [[5], [0, 1, 2], [3, 4]];
        matchesGolden(
            layout.multipartite(s, { subsets: layers, scale: 2, center: [1, -1] }),
            golden("multipartite vertical"),
        );
        // the legacy layout rescaled around the centre before it swapped x and y, so it landed on the swapped centre
        matchesGolden(
            layout.multipartite(s, { subsets: layers, align: "horizontal", center: [1, -1] }),
            golden("multipartite horizontal"),
        );
    });

    it("a horizontal layout is centred on the centre asked for", () => {
        const r = layout.multipartite(s, {
            subsets: [
                [0, 1, 2],
                [3, 4, 5],
            ],
            align: "horizontal",
            center: [10, -5],
        });
        const mean = [0, 1].map((k) => [0, 1, 2, 3, 4, 5].reduce((sum, i) => sum + row(r, i)[k], 0) / 6);
        assert.ok(Math.abs(mean[0] - 10) < 1e-5 && Math.abs(mean[1] + 5) < 1e-5, mean.join(","));
        // the layers are rows: equal y within a layer
        assert.equal(row(r, 0)[1], row(r, 2)[1]);
        assert.notEqual(row(r, 0)[1], row(r, 3)[1]);
    });

    it("a u32 column puts equal values on one layer, in ascending value order", () => {
        assert.deepEqual(
            layout.multipartite(s, { subsets: "level" }).positions,
            layout.multipartite(s, { subsets: [[5], [0, 1, 2], [3, 4]] }).positions,
        );
    });

    it("a dict column puts equal values on one layer, in dictionary order", () => {
        assert.deepEqual(
            layout.multipartite(s, { subsets: "side" }).positions,
            layout.multipartite(s, { subsets: [[0, 1, 2], [3, 4], [5]] }).positions,
        );
    });

    it("reads the column subset by default", () => {
        assert.deepEqual(
            layout.multipartite(s).positions,
            layout.multipartite(s, {
                subsets: [
                    [0, 1, 2],
                    [3, 4, 5],
                ],
            }).positions,
        );
    });

    it("throws without subsets when the snapshot has no subset column", () => {
        assert.throws(() => layout.multipartite(graph(3)), /no node column named "subset"/);
    });

    it("rejects a missing column and a column of another dtype", () => {
        assert.throws(() => layout.multipartite(s, { subsets: "missing" }));
        assert.throws(() => layout.multipartite(s, { subsets: "weight" }), /u32 or dict/);
    });

    it("leaves a node in no layer NaN and rejects an index outside the graph", () => {
        const r = layout.multipartite(s, {
            subsets: [
                [0, 1],
                [2, 3],
            ],
        });
        assert.ok(row(r, 4).every(Number.isNaN) && row(r, 5).every(Number.isNaN));
        assert.throws(() => layout.multipartite(s, { subsets: [[0, 6]] }), /not a node/);
    });

    it("rejects an alignment other than vertical or horizontal", () => {
        assert.throws(
            () => layout.multipartite(s, { subsets: [[0]], align: "diagonal" as "vertical" }),
            /align must be/,
        );
    });
});

describe("bipartite", () => {
    const s = fromEdgeArrays({
        directed: false,
        nodeCount: 7,
        src: Uint32Array.of(0, 0, 3, 5),
        dst: Uint32Array.of(1, 2, 4, 6),
        nodeColumns: {
            top: { data: Uint32Array.of(0b0101001), decl: { dtype: "bool" } },
            weight: Float32Array.of(1, 2, 3, 4, 5, 6, 7),
        },
    });

    it("matches the legacy layout for a mask, vertical and horizontal", () => {
        const mask = Uint32Array.of(0b0101001);
        matchesGolden(layout.bipartite(s, { top: mask, scale: 2, center: [3, 4] }), golden("bipartite vertical"));
        matchesGolden(
            layout.bipartite(s, { top: mask, align: "horizontal", aspectRatio: 2, center: [3, 4] }),
            golden("bipartite horizontal"),
        );
    });

    it("a bool column gives the same layout as the mask of its true rows", () => {
        assert.deepEqual(
            layout.bipartite(s, { top: "top" }).positions,
            layout.bipartite(s, { top: Uint32Array.of(0b0101001) }).positions,
        );
    });

    it("defaults to the even node indices, as the legacy layout does", () => {
        matchesGolden(layout.bipartite(s), golden("bipartite default"));
    });

    it("rejects a column that is not bool and a mask too short for the graph", () => {
        assert.throws(() => layout.bipartite(s, { top: "weight" }), /must be bool/);
        assert.throws(() => layout.bipartite(graph(40), { top: Uint32Array.of(1) }), /words/);
    });
});

describe("bfs", () => {
    it("matches the legacy layout when the edges are listed in ascending order", () => {
        const s = graph(7, [
            [0, 1],
            [0, 2],
            [1, 3],
            [1, 4],
            [2, 5],
            [2, 6],
        ]);
        matchesGolden(layout.bfs(s, { start: 0, scale: 2, center: [1, 1] }), golden("bfs start 0"));
        matchesGolden(layout.bfs(s, { start: 4 }), golden("bfs start 4"));
    });

    it("visits neighbours in ascending node index, whatever the edge order", () => {
        // 0 reaches 3, 1, 2 in edge order; the layer is 1, 2, 3 top to bottom
        const s = graph(4, [
            [0, 3],
            [0, 1],
            [0, 2],
        ]);
        const r = layout.bfs(s);
        assert.ok(row(r, 1)[1] < row(r, 2)[1] && row(r, 2)[1] < row(r, 3)[1]);
        assert.equal(row(r, 1)[0], row(r, 3)[0]);
    });

    it("puts each node in the layer of its hop distance", () => {
        const r = layout.bfs(path(4), { start: 1 });
        // layers [1], [0, 2], [3]: x steps by one layer
        assert.ok(row(r, 1)[0] < row(r, 0)[0]);
        assert.equal(row(r, 0)[0], row(r, 2)[0]);
        assert.ok(row(r, 2)[0] < row(r, 3)[0]);
    });

    it("reads a directed snapshot as undirected", () => {
        const s = fromEdgeArrays({
            directed: true,
            nodeCount: 3,
            src: Uint32Array.of(1, 2),
            dst: Uint32Array.of(0, 1),
        });
        const r = layout.bfs(s);
        assert.ok(row(r, 0)[0] < row(r, 1)[0] && row(r, 1)[0] < row(r, 2)[0]);
    });

    it("centres a horizontal layout on the centre asked for", () => {
        // 1.x bfsLayout centred a horizontal layout on the swapped centre [center[1], center[0]]
        const r = layout.bfs(path(4), { align: "horizontal", center: [10, -5] });
        const mean = [0, 1].map((k) => [0, 1, 2, 3].reduce((sum, i) => sum + row(r, i)[k], 0) / 4);
        assert.ok(Math.abs(mean[0] - 10) < 1e-5 && Math.abs(mean[1] + 5) < 1e-5, mean.join(","));
        // the layers are rows: y steps by one layer
        assert.ok(row(r, 0)[1] !== row(r, 1)[1]);
    });

    it("throws for a disconnected graph and a start outside the graph", () => {
        assert.throws(() => layout.bfs(graph(4, [[0, 1]])), /disconnected/);
        assert.throws(() => layout.bfs(path(3), { start: 3 }), /not in the graph/);
    });
});

describe("planar", () => {
    it("keeps its recorded layout when the edges are listed in ascending order", () => {
        // wheel 7 and the tree are the output of layout 1.x; grid 3x4 and wheel 12 were re-recorded when interior nodes
        // started keeping a minimum distance apart, because layout 1.x put two of their nodes about 1% of the scale apart
        const graphs = {
            "grid 3x4": gridGraph({ rows: 3, cols: 4 }),
            "wheel 7": wheelGraph({ n: 7 }),
            "wheel 12": wheelGraph({ n: 12 }),
        };
        for (const [name, sample] of Object.entries(graphs)) {
            const s = fromEdgeArrays(sample);
            matchesGolden(layout.planar(s, { seed: 5, scale: 2, center: [1, -1] }), golden(`planar ${name}`));
        }
        // a tree has no cycle: every node on the outer circle
        const tree = graph(
            10,
            Array.from({ length: 9 }, (_, i) => [Math.floor(i / 2), i + 1] as const),
        );
        matchesGolden(layout.planar(tree, { seed: 1 }), golden("planar tree"));
    });

    it("repeats for a seed", () => {
        const s = fromEdgeArrays(wheelGraph({ n: 12 }));
        assert.deepEqual(layout.planar(s, { seed: 9 }).positions, layout.planar(s, { seed: 9 }).positions);
    });

    it("rejects K5, K3,3 and a connected graph of more than 3n - 6 edges", () => {
        assert.throws(() => layout.planar(fromEdgeArrays(completeGraph({ n: 5 }))), /G is not planar/);
        const k33: [number, number][] = [];
        for (const u of [0, 1, 2]) {
            for (const v of [3, 4, 5]) {
                k33.push([u, v]);
            }
        }
        assert.throws(() => layout.planar(graph(6, k33)), /G is not planar/);
        assert.throws(() => layout.planar(fromEdgeArrays(completeGraph({ n: 7 }))), /G is not planar/);
    });

    it("never puts two nodes on the same point", () => {
        // the 3x3 grid with seed 1 once put nodes 0 and 1 at the same point: the first draw of seed 1 is about 5e-6,
        // so the jitter that was meant to move node 0 off its only placed neighbour moved it by 5e-7
        const cases: [string, GraphSnapshot][] = [
            ["grid 3x3", fromEdgeArrays(gridGraph({ rows: 3, cols: 3 }))],
            ["grid 4x5", fromEdgeArrays(gridGraph({ rows: 4, cols: 5 }))],
            ["wheel 9", fromEdgeArrays(wheelGraph({ n: 9 }))],
            // K2,5: five nodes share the same two placed neighbours, so they share one mean
            [
                "K2,5",
                graph(
                    7,
                    [0, 1].flatMap((u) => [2, 3, 4, 5, 6].map((v) => [u, v] as const)),
                ),
            ],
            [
                "triangle and isolated nodes",
                graph(8, [
                    [0, 1],
                    [1, 2],
                    [2, 0],
                ]),
            ],
        ];
        for (const [name, s] of cases) {
            for (let seed = 1; seed <= 25; seed++) {
                const r = layout.planar(s, { seed, scale: 100 });
                for (let i = 0; i < r.n; i++) {
                    for (let j = i + 1; j < r.n; j++) {
                        const d = Math.hypot(row(r, i)[0] - row(r, j)[0], row(r, i)[1] - row(r, j)[1]);
                        assert.ok(d >= 0.5, `${name}, seed ${seed}: nodes ${i} and ${j} are ${d} apart at scale 100`);
                    }
                }
            }
        }
    });

    it("lays out a long path without overflowing the stack", () => {
        const r = layout.planar(path(20000), { seed: 1 });
        assert.equal(r.n, 20000);
    });
});

/**
 * Asserts a spectral layout is NetworkX's `spectral_layout` up to the sign of each axis (an eigenvector's sign is
 * arbitrary) and the rescaling: networkx puts the largest coordinate at `scale`, this package the farthest node.
 * Only for graphs whose wanted eigenvalues are distinct, where the eigenvectors are unique up to sign.
 */
function matchesNetworkX(r: LayoutResult, expected: number[][], scale = 1, center: number[] = [0, 0, 0]): void {
    const farthest = Math.max(...expected.map((p) => Math.hypot(...p)));
    for (let k = 0; k < r.dim; k++) {
        const axis = expected.map((p, i) => [r.positions[r.dim * i + k] - center[k], (p[k] * scale) / farthest]);
        const sign = Math.sign(axis.reduce((sum, [a, e]) => sum + a * e, 0));
        axis.forEach(([a, e], i) => assert.ok(Math.abs(a - sign * e) < 1e-5, `node ${i}[${k}]: ${a} vs ${sign * e}`));
    }
}

/** Per axis, the Rayleigh quotient x^T L x / x^T x of the layout's centred coordinates over the given edges. */
function rayleighQuotients(r: LayoutResult, src: ArrayLike<number>, dst: ArrayLike<number>): number[] {
    return Array.from({ length: r.dim }, (_, k) => {
        const x = (i: number): number => r.positions[r.dim * i + k];
        let energy = 0;
        for (let e = 0; e < src.length; e++) {
            energy += (x(src[e]) - x(dst[e])) ** 2;
        }
        let norm = 0;
        for (let i = 0; i < r.n; i++) {
            norm += x(i) ** 2;
        }
        return energy / norm;
    });
}

describe("spectral", () => {
    // NetworkX 2.8.8 `spectral_layout` of the same graphs (self-loops and parallel edges dropped, which do not change
    // the Laplacian), node order as here
    const sevenNodes = [
        [0, 0, 0.7578307943726018],
        [-0.3090169943749475, -0.8660254037844396, 0.3572448624619029],
        [-0.5, -0.5352331346596343, -0.6098551272527702],
        [-0.3090169943749473, 0.8660254037844383, 0.3572448624619029],
        [-0.5, 0.5352331346596348, -0.6098551272527701],
        [1, 0, -0.6098551272527701],
        [0.6180339887498948, 0, 0.3572448624619029],
    ];
    const fiveNodes = [
        [0.8090169943749467, 0.951056516295153, 0.3090169943749481],
        [-0.3090169943749471, 0.5877852522924735, -0.8090169943749481],
        [-1, 0, 1],
        [-0.3090169943749472, -0.587785252292474, -0.8090169943749466],
        [0.8090169943749476, -0.9510565162951526, 0.3090169943749469],
    ];
    const pathOfTen = [
        [1, 0.9629115554022719, 0.9021130325903055],
        [0.9021130325903065, 0.5951120693986313, 0.1583844403245355],
        [0.7159209561595872, 0, -0.7159209561595875],
        [0.4596495484253581, -0.595112069398632, -1],
        [0.15838444032453658, -0.9629115554022722, -0.4596495484253573],
        [-0.15838444032453497, -0.9629115554022717, 0.45964954842535877],
        [-0.459649548425358, -0.595112069398631, 1],
        [-0.7159209561595876, 0, 0.7159209561595875],
        [-0.902113032590307, 0.595112069398632, -0.15838444032453705],
        [-1, 0.962911555402272, -0.9021130325903063],
    ];
    const first = (rows: number[][], dim: number): number[][] => rows.map((p) => p.slice(0, dim));

    it("matches NetworkX in 2D and 3D, with parallel edges and a self-loop", () => {
        // edges out of index order, a parallel pair (2, 4) and a self-loop on 5
        const g: Graph = {
            nodes: () => ["a", "b", "c", "d", "e", "f", "g"],
            edges: () => [
                ["c", "e"],
                ["a", "b"],
                ["e", "c"],
                ["f", "f"],
                ["b", "c"],
                ["d", "e"],
                ["f", "g"],
                ["a", "g"],
                ["d", "a"],
            ],
        };
        const s = toLayoutSnapshot(g);
        matchesNetworkX(layout.spectral(s, { seed: 4, scale: 2, center: [1, 2] }), first(sevenNodes, 2), 2, [1, 2]);
        matchesNetworkX(layout.spectral(s, { seed: 8, dim: 3 }), sevenNodes);
        const five = toLayoutSnapshot({
            nodes: () => [0, 1, 2, 3, 4],
            edges: () => [
                [0, 1],
                [0, 1],
                [1, 2],
                [2, 3],
                [3, 4],
                [4, 0],
                [1, 3],
                [2, 2],
            ],
        });
        matchesNetworkX(layout.spectral(five, { seed: 7 }), first(fiveNodes, 2));
        matchesNetworkX(
            layout.spectral(five, { seed: 7, scale: 2, center: [1, 2, 3], dim: 3 }),
            fiveNodes,
            2,
            [1, 2, 3],
        );
    });

    it("draws a path with the smoothest eigenvectors: NetworkX's layout, the first axis monotonic", () => {
        matchesNetworkX(layout.spectral(path(10), { seed: 1, dim: 3 }), pathOfTen);
        const r = layout.spectral(path(300), { seed: 5 });
        const x = Array.from({ length: 300 }, (_, i) => r.positions[2 * i]);
        const direction = Math.sign(x[299] - x[0]);
        for (let i = 1; i < 300; i++) {
            assert.ok(direction * (x[i] - x[i - 1]) > 0, `node ${i} breaks the order`);
        }
    });

    for (const side of [4, 30]) {
        it(`draws a ${side} x ${side} grid with the eigenvectors of the smallest non-zero eigenvalue`, () => {
            // the grid's two smallest non-zero eigenvalues are both 2 - 2 cos(pi / side): any orthonormal basis of
            // that eigenspace is a valid layout, so check what every basis shares
            const g = gridGraph({ rows: side, cols: side });
            const r = layout.spectral(
                fromEdgeArrays({ nodeCount: g.nodeCount, src: g.src, dst: g.dst, directed: false }),
                { seed: 42 },
            );
            const lambda = 2 - 2 * Math.cos(Math.PI / side);
            for (const q of rayleighQuotients(r, g.src, g.dst)) {
                assert.ok(Math.abs(q - lambda) < 1e-5 * lambda, `Rayleigh quotient ${q}, expected ${lambda}`);
            }
            let cross = 0;
            for (let i = 0; i < r.n; i++) {
                cross += r.positions[2 * i] * r.positions[2 * i + 1];
            }
            assert.ok(Math.abs(cross) < 1e-5, `the axes are not orthogonal: ${cross}`);
            // the four corners are the farthest nodes, at `scale`
            for (const corner of [0, side - 1, side * (side - 1), side * side - 1]) {
                assert.ok(Math.abs(Math.hypot(...row(r, corner)) - 1) < 1e-5, `corner ${corner} is not at the rim`);
            }
        });
    }

    it("gives zero to a component the graph has no eigenvector left for", () => {
        // a triangle has only two non-constant eigenvectors
        const r = layout.spectral(
            graph(3, [
                [0, 1],
                [1, 2],
                [2, 0],
            ]),
            { seed: 1, dim: 3 },
        );
        for (let i = 0; i < 3; i++) {
            assert.equal(r.positions[3 * i + 2], 0);
        }
    });

    it("puts two nodes at the centre minus and plus scale", () => {
        const r = layout.spectral(graph(2, [[0, 1]]), { scale: 2, center: [1, 1] });
        assert.deepEqual(row(r, 0), [-1, -1]);
        assert.deepEqual(row(r, 1), [3, 3]);
    });
});

describe("planar keeps the output of layout 1.x", () => {
    // The coordinates below were produced by the implementation before the migration to snapshots.
    // six nodes whose Hamiltonian cycle 0-2-4-1-3-5 is not in index order, so it becomes the outer face
    const planarEdges: [number, number][] = [
        [0, 2],
        [2, 4],
        [4, 1],
        [1, 3],
        [3, 5],
        [5, 0],
        [0, 4],
    ];

    it("planar on a small graph with a Hamiltonian cycle", () => {
        matchesGolden(layout.planar(graph(6, planarEdges), { seed: 7 }), [
            [0.9999999999999998, -5.5511151231257815e-17],
            [-0.9999999999999998, 6.695352868347748e-17],
            [0.5, 0.8660254037844384],
            [-0.5000000000000003, -0.8660254037844384],
            [-0.49999999999999967, 0.8660254037844384],
            [0.5, -0.8660254037844384],
        ]);
    });

    it("planar ignores self-loops and parallel edges", () => {
        // node 6, joined to 0 and 1, has no Hamiltonian cycle through it, so it is placed inside at its neighbours' mean
        const withInterior = (extra: [number, number][]): GraphSnapshot =>
            graph(7, [...planarEdges, [6, 0], [6, 1], ...extra]);
        const plain = layout.planar(withInterior([]), { seed: 7 }).positions;
        assert.deepEqual(
            layout.planar(
                withInterior([
                    [2, 2],
                    [6, 6],
                ]),
                { seed: 7 },
            ).positions,
            plain,
        );
        assert.deepEqual(
            layout.planar(
                withInterior([
                    [0, 6],
                    [6, 0],
                    [2, 0],
                ]),
                { seed: 7 },
            ).positions,
            plain,
        );
    });

    it("planar accepts a planar graph whose self-loops and parallel edges pass 3n - 6", () => {
        // a five-node path has 4 edges; five self-loops and a repeated edge take the raw count to 10 > 3 * 5 - 6
        const s = graph(5, [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 4],
            [0, 0],
            [1, 1],
            [2, 2],
            [3, 3],
            [4, 4],
            [0, 1],
        ]);
        assert.equal(layout.planar(s, { seed: 7 }).n, 5);
    });

    it("planar rejects K3,3 with a self-loop", () => {
        const edges: [number, number][] = [[0, 0]];
        for (const u of [0, 1, 2]) {
            for (const v of [3, 4, 5]) {
                edges.push([u, v]);
            }
        }
        assert.throws(() => layout.planar(graph(6, edges), { seed: 7 }), /G is not planar/);
    });
});
