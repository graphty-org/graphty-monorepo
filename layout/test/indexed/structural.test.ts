import assert from "node:assert";

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { completeGraph, gridGraph, wheelGraph } from "@graphty/graph-samples/generators";
import { afterEach, describe, it, vi } from "vitest";

import {
    bfsLayout,
    bipartiteLayout,
    type CommonLayoutOptions,
    type Graph,
    indexed,
    type LayoutResult,
    multipartiteLayout,
    type Node,
    planarLayout,
    type PositionMap,
    spectralLayout,
    toLayoutSnapshot,
} from "../../src";
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

/** Every value of `actual` is within 1e-6 of the legacy map's, and the keys are the same. */
function matchesLegacy(actual: PositionMap, expected: PositionMap): void {
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort());
    for (const [node, p] of Object.entries(expected)) {
        assert.equal(actual[node].length, p.length, `node ${node} length`);
        p.forEach((v, k) => {
            assert.ok(Math.abs(actual[node][k] - v) <= 1e-6, `node ${node}[${k}]: ${actual[node][k]} vs ${v}`);
        });
    }
}

/** The legacy duck-typed graph of a snapshot's edges, listed in ascending (source, target) order. */
function duck(s: GraphSnapshot): Graph {
    const ids: Node[] = Array.from({ length: s.nodeCount }, (_, i) => s.ids.idOf(i) as Node);
    const edges: [Node, Node][] = [];
    for (let u = 0; u < s.nodeCount; u++) {
        for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
            if (s.colIdx[a] > u) {
                edges.push([ids[u], ids[s.colIdx[a]]]);
            }
        }
    }
    return { nodes: () => ids, edges: () => edges };
}

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
    bfs: (s, o) => indexed.bfs(s, o),
    bipartite: (s, o) => indexed.bipartite(s, o),
    multipartite: (s, o) => indexed.multipartite(s, { subsets: [Array.from({ length: s.nodeCount }, (_, i) => i)], ...o }),
    planar: (s, o) => indexed.planar(s, { seed: 3, ...o }),
    spectral: (s, o) => indexed.spectral(s, { seed: 3, ...o }),
};

describe("indexed structural layouts: common options", () => {
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

describe("indexed.multipartite", () => {
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
        const legacy = layers.map((layer) => layer.map((i) => s.ids.idOf(i) as Node));
        matchesGolden(
            indexed.multipartite(s, { subsets: layers, scale: 2, center: [1, -1] }),
            golden("multipartite vertical", s.ids, () => multipartiteLayout(duck(s), legacy, "vertical", 2, [1, -1])),
        );
        // the legacy layout rescaled around the centre before it swapped x and y, so it landed on the swapped centre
        matchesGolden(
            indexed.multipartite(s, { subsets: layers, align: "horizontal", center: [1, -1] }),
            golden("multipartite horizontal", s.ids, () => multipartiteLayout(duck(s), legacy, "horizontal", 1, [-1, 1])),
        );
    });

    it("a horizontal layout is centred on the centre asked for", () => {
        const r = indexed.multipartite(s, { subsets: [[0, 1, 2], [3, 4, 5]], align: "horizontal", center: [10, -5] });
        const mean = [0, 1].map((k) => [0, 1, 2, 3, 4, 5].reduce((sum, i) => sum + row(r, i)[k], 0) / 6);
        assert.ok(Math.abs(mean[0] - 10) < 1e-5 && Math.abs(mean[1] + 5) < 1e-5, mean.join(","));
        // the layers are rows: equal y within a layer
        assert.equal(row(r, 0)[1], row(r, 2)[1]);
        assert.notEqual(row(r, 0)[1], row(r, 3)[1]);
    });

    it("a u32 column puts equal values on one layer, in ascending value order", () => {
        assert.deepEqual(indexed.multipartite(s, { subsets: "level" }).positions, indexed.multipartite(s, { subsets: [[5], [0, 1, 2], [3, 4]] }).positions);
    });

    it("a dict column puts equal values on one layer, in dictionary order", () => {
        assert.deepEqual(indexed.multipartite(s, { subsets: "side" }).positions, indexed.multipartite(s, { subsets: [[0, 1, 2], [3, 4], [5]] }).positions);
    });

    it("reads the column subset by default", () => {
        assert.deepEqual(indexed.multipartite(s).positions, indexed.multipartite(s, { subsets: [[0, 1, 2], [3, 4, 5]] }).positions);
    });

    it("rejects a missing column and a column of another dtype", () => {
        assert.throws(() => indexed.multipartite(s, { subsets: "missing" }));
        assert.throws(() => indexed.multipartite(s, { subsets: "weight" }), /u32 or dict/);
    });

    it("leaves a node in no layer NaN and rejects an index outside the graph", () => {
        const r = indexed.multipartite(s, { subsets: [[0, 1], [2, 3]] });
        assert.ok(row(r, 4).every(Number.isNaN) && row(r, 5).every(Number.isNaN));
        assert.throws(() => indexed.multipartite(s, { subsets: [[0, 6]] }), /not a node/);
    });

    it("rejects an alignment other than vertical or horizontal", () => {
        assert.throws(() => indexed.multipartite(s, { subsets: [[0]], align: "diagonal" as "vertical" }), /align must be/);
    });
});

describe("indexed.bipartite", () => {
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
    const topIds: Node[] = [0, 3, 5];

    it("matches the legacy layout for a mask, vertical and horizontal", () => {
        const mask = Uint32Array.of(0b0101001);
        matchesGolden(
            indexed.bipartite(s, { top: mask, scale: 2, center: [3, 4] }),
            golden("bipartite vertical", s.ids, () => bipartiteLayout(duck(s), topIds, "vertical", 2, [3, 4])),
        );
        matchesGolden(
            indexed.bipartite(s, { top: mask, align: "horizontal", aspectRatio: 2, center: [3, 4] }),
            golden("bipartite horizontal", s.ids, () => bipartiteLayout(duck(s), topIds, "horizontal", 1, [4, 3], 2)),
        );
    });

    it("a bool column gives the same layout as the mask of its true rows", () => {
        assert.deepEqual(indexed.bipartite(s, { top: "top" }).positions, indexed.bipartite(s, { top: Uint32Array.of(0b0101001) }).positions);
    });

    it("defaults to the even node indices, as the legacy layout does", () => {
        matchesGolden(indexed.bipartite(s), golden("bipartite default", s.ids, () => bipartiteLayout(duck(s))));
    });

    it("rejects a column that is not bool and a mask too short for the graph", () => {
        assert.throws(() => indexed.bipartite(s, { top: "weight" }), /must be bool/);
        assert.throws(() => indexed.bipartite(graph(40), { top: Uint32Array.of(1) }), /words/);
    });
});

describe("indexed.bfs", () => {
    it("matches the legacy layout when the edges are listed in ascending order", () => {
        const s = graph(7, [
            [0, 1],
            [0, 2],
            [1, 3],
            [1, 4],
            [2, 5],
            [2, 6],
        ]);
        matchesGolden(
            indexed.bfs(s, { start: 0, scale: 2, center: [1, 1] }),
            golden("bfs start 0", s.ids, () => bfsLayout(duck(s), 0, "vertical", 2, [1, 1])),
        );
        matchesGolden(indexed.bfs(s, { start: 4 }), golden("bfs start 4", s.ids, () => bfsLayout(duck(s), 4)));
    });

    it("visits neighbours in ascending node index, whatever the edge order", () => {
        // 0 reaches 3, 1, 2 in edge order; the layer is 1, 2, 3 top to bottom
        const s = graph(4, [
            [0, 3],
            [0, 1],
            [0, 2],
        ]);
        const r = indexed.bfs(s);
        assert.ok(row(r, 1)[1] < row(r, 2)[1] && row(r, 2)[1] < row(r, 3)[1]);
        assert.equal(row(r, 1)[0], row(r, 3)[0]);
    });

    it("puts each node in the layer of its hop distance", () => {
        const r = indexed.bfs(path(4), { start: 1 });
        // layers [1], [0, 2], [3]: x steps by one layer
        assert.ok(row(r, 1)[0] < row(r, 0)[0]);
        assert.equal(row(r, 0)[0], row(r, 2)[0]);
        assert.ok(row(r, 2)[0] < row(r, 3)[0]);
    });

    it("reads a directed snapshot as undirected", () => {
        const s = fromEdgeArrays({ directed: true, nodeCount: 3, src: Uint32Array.of(1, 2), dst: Uint32Array.of(0, 1) });
        const r = indexed.bfs(s);
        assert.ok(row(r, 0)[0] < row(r, 1)[0] && row(r, 1)[0] < row(r, 2)[0]);
    });

    it("throws for a disconnected graph and a start outside the graph", () => {
        assert.throws(() => indexed.bfs(graph(4, [[0, 1]])), /disconnected/);
        assert.throws(() => indexed.bfs(path(3), { start: 3 }), /not in the graph/);
    });
});

describe("indexed.planar", () => {
    it("matches the legacy layout when the edges are listed in ascending order", () => {
        const graphs = { "grid 3x4": gridGraph({ rows: 3, cols: 4 }), "wheel 7": wheelGraph({ n: 7 }), "wheel 12": wheelGraph({ n: 12 }) };
        for (const [name, sample] of Object.entries(graphs)) {
            const s = fromEdgeArrays(sample);
            matchesGolden(
                indexed.planar(s, { seed: 5, scale: 2, center: [1, -1] }),
                golden(`planar ${name}`, s.ids, () => planarLayout(duck(s), 2, [1, -1], 2, 5)),
            );
        }
        // a tree has no cycle: every node on the outer circle
        const tree = graph(10, Array.from({ length: 9 }, (_, i) => [Math.floor(i / 2), i + 1] as const));
        matchesGolden(indexed.planar(tree, { seed: 1 }), golden("planar tree", tree.ids, () => planarLayout(duck(tree), 1, null, 2, 1)));
    });

    it("repeats for a seed", () => {
        const s = fromEdgeArrays(wheelGraph({ n: 12 }));
        assert.deepEqual(indexed.planar(s, { seed: 9 }).positions, indexed.planar(s, { seed: 9 }).positions);
    });

    it("rejects K5, K3,3 and a connected graph of more than 3n - 6 edges", () => {
        assert.throws(() => indexed.planar(fromEdgeArrays(completeGraph({ n: 5 }))), /G is not planar/);
        const k33: [number, number][] = [];
        for (const u of [0, 1, 2]) {
            for (const v of [3, 4, 5]) {
                k33.push([u, v]);
            }
        }
        assert.throws(() => indexed.planar(graph(6, k33)), /G is not planar/);
        assert.throws(() => indexed.planar(fromEdgeArrays(completeGraph({ n: 7 }))), /G is not planar/);
    });

    it("lays out a disconnected graph and puts an isolated interior node on the centre", () => {
        // a triangle plus isolated nodes: the triangle is the outer face
        const r = indexed.planar(graph(5, [[0, 1], [1, 2], [2, 0]]), { seed: 2 });
        assert.deepEqual(row(r, 3), row(r, 4));
    });

    it("lays out a long path without overflowing the stack", () => {
        const r = indexed.planar(path(20000), { seed: 1 });
        assert.equal(r.n, 20000);
    });
});

describe("indexed.spectral", () => {
    it("matches the legacy layout exactly in 2D and 3D, with parallel edges and a self-loop", () => {
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
        matchesGolden(
            indexed.spectral(s, { seed: 4, scale: 2, center: [1, 2] }),
            golden("spectral 2d", s.ids, () => spectralLayout(g, 2, [1, 2], 2, 4)),
        );
        matchesGolden(indexed.spectral(s, { seed: 8, dim: 3 }), golden("spectral 3d", s.ids, () => spectralLayout(g, 1, null, 3, 8)));
    });

    it("puts two nodes at the centre minus and plus scale", () => {
        const r = indexed.spectral(graph(2, [[0, 1]]), { scale: 2, center: [1, 1] });
        assert.deepEqual(row(r, 0), [-1, -1]);
        assert.deepEqual(row(r, 1), [3, 3]);
    });
});

describe("legacy wrappers over the indexed layouts", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("multipartiteLayout reads a string subsetKey as a node column of a snapshot, with no console output", () => {
        const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
            vi.spyOn(console, method).mockImplementation(() => undefined),
        );
        const s = fromEdgeArrays({
            directed: false,
            nodeCount: 5,
            src: Uint32Array.of(0, 1),
            dst: Uint32Array.of(2, 3),
            nodeColumns: { layer: Uint32Array.of(1, 1, 0, 0, 0) },
        });
        const pos = multipartiteLayout(s, "layer", "vertical", 2);
        matchesLegacy(pos, multipartiteLayout(duck(s), [[2, 3, 4], [0, 1]], "vertical", 2));
        // layer 0 (nodes 2, 3, 4) left of layer 1
        assert.ok(pos[2][0] < pos[0][0]);
        for (const spy of spies) {
            assert.equal(spy.mock.calls.length, 0);
        }
    });

    it("multipartiteLayout puts every node in one layer for a string subsetKey on a graph with no node columns", () => {
        const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
            vi.spyOn(console, method).mockImplementation(() => undefined),
        );
        const g: Graph = { nodes: () => [0, 1, 2], edges: () => [] };
        assert.deepEqual(multipartiteLayout(g), { 0: [0, -1], 1: [0, 0], 2: [0, 1] });
        for (const spy of spies) {
            assert.equal(spy.mock.calls.length, 0);
        }
    });

    /** Asserts that `pos` holds exactly `expected`'s nodes, each within 1e-9 of its pinned coordinates. */
    const closeTo = (pos: PositionMap, expected: Record<string, number[]>): void => {
        assert.deepEqual(Object.keys(pos), Object.keys(expected));
        for (const [node, coords] of Object.entries(expected)) {
            coords.forEach((c, i) => {
                assert.ok(Math.abs(pos[node][i] - c) < 1e-9, `node ${node} axis ${i}: ${pos[node][i]} != ${c}`);
            });
        }
    };

    // The coordinates below were produced by the pre-migration implementations, so these tests hold the wrappers to
    // the old output rather than to the indexed code they now run.
    const spectralGraph: Graph = {
        nodes: () => [0, 1, 2, 3, 4],
        edges: () => [[0, 1], [0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [1, 3], [2, 2]],
    };

    it("spectralLayout keeps its pre-migration output in 2D, with a parallel edge and a self-loop", () => {
        closeTo(spectralLayout(spectralGraph, 1, null, 2, 7), {
            0: [0.39279270028992536, 0.0031423426377324903],
            1: [-0.6355519396046398, -0.18854288286515103],
            2: [8.704879263260277e-12, 0.593684065965646],
            3: [0.635551939590555, -0.7720581144464991],
            4: [-0.39279270028454544, 0.36377458870827156],
        });
    });

    it("spectralLayout keeps its pre-migration output in 3D, with a parallel edge and a self-loop", () => {
        closeTo(spectralLayout(spectralGraph, 2, [1, 2, 3], 3, 7), {
            0: [1.6630117939800617, 2.005304096099559, 3.6630117939800617],
            1: [-0.07277561760632345, 1.6817503102315094, 1.9272243823936765],
            2: [1.0000000000146934, 3.0021050221725725, 3.000000000014693],
            3: [2.072775617582549, 0.6968097035963008, 4.072775617582549],
            4: [0.33698820602901913, 2.614030867900058, 2.336988206029019],
        });
    });

    // six nodes whose Hamiltonian cycle 0-2-4-1-3-5 is not in index order, so it becomes the outer face
    const planarEdges: [number, number][] = [[0, 2], [2, 4], [4, 1], [1, 3], [3, 5], [5, 0], [0, 4]];
    const planarGraph: Graph = { nodes: () => [0, 1, 2, 3, 4, 5], edges: () => planarEdges };

    it("planarLayout keeps its pre-migration output on a small graph with a Hamiltonian cycle", () => {
        closeTo(planarLayout(planarGraph, 1, null, 2, 7), {
            0: [0.9999999999999998, -5.5511151231257815e-17],
            1: [-0.9999999999999998, 6.695352868347748e-17],
            2: [0.5, 0.8660254037844384],
            3: [-0.5000000000000003, -0.8660254037844384],
            4: [-0.49999999999999967, 0.8660254037844384],
            5: [0.5, -0.8660254037844384],
        });
    });

    it("planarLayout ignores self-loops and parallel edges", () => {
        // node 6, joined to 0 and 1, has no Hamiltonian cycle through it, so it is placed inside at its neighbours' mean
        const withInterior = (extra: [number, number][]): Graph => ({
            nodes: () => [0, 1, 2, 3, 4, 5, 6],
            edges: () => [...planarEdges, [6, 0], [6, 1], ...extra],
        });
        const plain = planarLayout(withInterior([]), 1, null, 2, 7);
        assert.deepEqual(planarLayout(withInterior([[2, 2], [6, 6]]), 1, null, 2, 7), plain);
        assert.deepEqual(planarLayout(withInterior([[0, 6], [6, 0], [2, 0]]), 1, null, 2, 7), plain);
    });

    it("planarLayout accepts a planar graph whose self-loops and parallel edges pass 3n - 6", () => {
        // a five-node path has 4 edges; five self-loops and a repeated edge take the raw count to 10 > 3 * 5 - 6
        const g: Graph = {
            nodes: () => [0, 1, 2, 3, 4],
            edges: () => [[0, 1], [1, 2], [2, 3], [3, 4], [0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [0, 1]],
        };
        assert.equal(Object.keys(planarLayout(g, 1, null, 2, 7)).length, 5);
    });

    it("planarLayout rejects K3,3 with a self-loop", () => {
        const edges: [number, number][] = [[0, 0]];
        for (const u of [0, 1, 2]) {
            for (const v of [3, 4, 5]) {
                edges.push([u, v]);
            }
        }
        const g: Graph = { nodes: () => [0, 1, 2, 3, 4, 5], edges: () => edges };
        assert.throws(() => planarLayout(g, 1, null, 2, 7), /G is not planar/);
    });

    it("bfsLayout keeps its pre-migration horizontal centring on the swapped centre", () => {
        const g: Graph = { nodes: () => ["a", "b", "c"], edges: () => [["a", "b"], ["b", "c"]] };
        assert.deepEqual(bfsLayout(g, "a", "horizontal", 1, [5, 1]), { a: [1, 4], b: [1, 5], c: [1, 6] });
    });

    it("bfsLayout rejects a start node that is not in the graph", () => {
        assert.throws(() => bfsLayout(duck(fromEdgeArrays(completeGraph({ n: 3 }))), 7), /start node 7 is not in the graph/);
    });

    it("keep their key order: layer by layer for the layered layouts, node order for the others", () => {
        const g: Graph = {
            nodes: () => ["c", "b", "a"],
            edges: () => [
                ["c", "a"],
                ["a", "b"],
            ],
        };
        assert.deepEqual(Object.keys(multipartiteLayout(g, [["a"], ["c", "b"]])), ["a", "c", "b"]);
        assert.deepEqual(Object.keys(bipartiteLayout(g, ["b"])), ["b", "c", "a"]);
        assert.deepEqual(Object.keys(bfsLayout(g, "b")), ["b", "a", "c"]);
        assert.deepEqual(Object.keys(spectralLayout(g, 1, null, 2, 1)), ["c", "b", "a"]);
        assert.deepEqual(Object.keys(planarLayout(g, 1, null, 2, 1)), ["c", "b", "a"]);
    });

    it("multipartiteLayout and bipartiteLayout still place a node the lists name but the graph does not", () => {
        const g: Graph = { nodes: () => ["a", "b"], edges: () => [] };
        assert.deepEqual(Object.keys(multipartiteLayout(g, [["a"], ["z"]])), ["a", "z"]);
        assert.deepEqual(Object.keys(bipartiteLayout(g, ["z"])), ["z", "a", "b"]);
    });
});
