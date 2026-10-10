import assert from "node:assert";

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import {
    completeGraph,
    gridGraph,
    hexagonalLatticeGraph,
    ladderGraph,
    petersenGraph,
    randomApollonianGraph,
    randomTreeGraph,
    triangularLatticeGraph,
    wheelGraph,
} from "@graphty/graph-samples/generators";
import { describe, it } from "vitest";

import * as layout from "../../src";
import { type CommonLayoutOptions, type LayoutResult } from "../../src";
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

/**
 * Pairs of edges that cross, or a node that lies on an edge it is not an end of.
 * @param r - a 2D layout
 * @param s - its graph
 * @returns a description of each problem
 */
function crossings(r: LayoutResult, s: GraphSnapshot): string[] {
    const edges: [number, number][] = [];
    for (let u = 0; u < s.nodeCount; u++) {
        for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
            const v = s.colIdx[a];
            if (u < v && !edges.some(([x, y]) => x === u && y === v)) {
                edges.push([u, v]);
            }
        }
    }
    const p = (i: number): [number, number] => [r.positions[2 * i], r.positions[2 * i + 1]];
    const eps = 1e-9;
    const orient = (a: [number, number], b: [number, number], c: [number, number]): number => {
        const o = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        return Math.abs(o) < eps ? 0 : Math.sign(o);
    };
    const within = (a: [number, number], b: [number, number], c: [number, number]): boolean =>
        Math.min(a[0], b[0]) - eps <= c[0] &&
        c[0] <= Math.max(a[0], b[0]) + eps &&
        Math.min(a[1], b[1]) - eps <= c[1] &&
        c[1] <= Math.max(a[1], b[1]) + eps;
    const problems: string[] = [];
    for (const [u, v] of edges) {
        for (let w = 0; w < s.nodeCount; w++) {
            if (w !== u && w !== v && orient(p(u), p(v), p(w)) === 0 && within(p(u), p(v), p(w))) {
                problems.push(`node ${w} on edge ${u}-${v}`);
            }
        }
    }
    for (let i = 0; i < edges.length; i++) {
        for (let j = i + 1; j < edges.length; j++) {
            const [a, b] = edges[i];
            const [c, d] = edges[j];
            if (a === c || a === d || b === c || b === d) {
                continue;
            }
            const o1 = orient(p(a), p(b), p(c));
            const o2 = orient(p(a), p(b), p(d));
            const o3 = orient(p(c), p(d), p(a));
            const o4 = orient(p(c), p(d), p(b));
            if (o1 * o2 < 0 && o3 * o4 < 0) {
                problems.push(`edges ${a}-${b} and ${c}-${d} cross`);
            }
        }
    }
    return problems;
}

/** K5 or K3,3 with every edge split by a new node: not planar, and not caught by counting edges. */
function subdivided(n: number, edges: readonly (readonly [number, number])[]): GraphSnapshot {
    const out: [number, number][] = [];
    edges.forEach(([u, v], k) => {
        out.push([u, n + k], [n + k, v]);
    });
    return graph(n + edges.length, out);
}

const K5 = [0, 1, 2, 3, 4].flatMap((u) => [0, 1, 2, 3, 4].filter((v) => v > u).map((v) => [u, v] as const));
const K33 = [0, 1, 2].flatMap((u) => [3, 4, 5].map((v) => [u, v] as const));

describe("planar", () => {
    it("draws planar graphs without crossings and without two nodes on one point", () => {
        const cases: [string, GraphSnapshot][] = [
            ["grid 3x4", fromEdgeArrays(gridGraph({ rows: 3, cols: 4 }))],
            ["grid 6x6", fromEdgeArrays(gridGraph({ rows: 6, cols: 6 }))],
            ["wheel 7", fromEdgeArrays(wheelGraph({ n: 7 }))],
            ["wheel 12", fromEdgeArrays(wheelGraph({ n: 12 }))],
            ["triangular lattice", fromEdgeArrays(triangularLatticeGraph({ rows: 5, cols: 6 }))],
            ["hexagonal lattice", fromEdgeArrays(hexagonalLatticeGraph({ rows: 3, cols: 4 }))],
            ["ladder", fromEdgeArrays(ladderGraph({ n: 8 }))],
            ["K4", fromEdgeArrays(completeGraph({ n: 4 }))],
            [
                "K2,5",
                graph(
                    7,
                    [0, 1].flatMap((u) => [2, 3, 4, 5, 6].map((v) => [u, v] as const)),
                ),
            ],
            ["path 30", path(30)],
            [
                "triangle and isolated nodes",
                graph(8, [
                    [0, 1],
                    [1, 2],
                    [2, 0],
                ]),
            ],
            [
                "two triangles and a path",
                graph(9, [
                    [0, 1],
                    [1, 2],
                    [2, 0],
                    [3, 4],
                    [4, 5],
                    [5, 3],
                    [6, 7],
                    [7, 8],
                ]),
            ],
        ];
        for (let seed = 1; seed <= 6; seed++) {
            cases.push(
                [`random tree ${seed}`, fromEdgeArrays(randomTreeGraph({ n: 40, seed }))],
                [`random apollonian ${seed}`, fromEdgeArrays(randomApollonianGraph({ n: 40, seed }))],
            );
            // a maximal planar graph with every third edge removed: planar, with faces of every size
            const apollonian = randomApollonianGraph({ n: 50, seed: seed + 100 });
            const kept: [number, number][] = [];
            for (let e = 0; e < apollonian.src.length; e++) {
                if (e % 3 !== 0) {
                    kept.push([apollonian.src[e], apollonian.dst[e]]);
                }
            }
            cases.push([`thinned apollonian ${seed}`, graph(apollonian.nodeCount, kept)]);
        }
        for (const [name, s] of cases) {
            const r = layout.planar(s, { scale: 100 });
            assert.deepEqual(crossings(r, s), [], name);
            for (let i = 0; i < r.n; i++) {
                for (let j = i + 1; j < r.n; j++) {
                    const d = Math.hypot(row(r, i)[0] - row(r, j)[0], row(r, i)[1] - row(r, j)[1]);
                    assert.ok(d > 1e-6, `${name}: nodes ${i} and ${j} share a point`);
                }
            }
        }
    });

    it("rejects graphs that are not planar, however few edges they have", () => {
        const notPlanar: [string, GraphSnapshot][] = [
            ["K5", graph(5, K5)],
            ["K3,3", graph(6, K33)],
            ["K3,3 with a self-loop", graph(6, [[0, 0], ...K33])],
            ["K7", fromEdgeArrays(completeGraph({ n: 7 }))],
            ["Petersen", fromEdgeArrays(petersenGraph())],
            ["K5 subdivided", subdivided(5, K5)],
            ["K3,3 subdivided", subdivided(6, K33)],
            ["a grid with K5 beside it", graph(14, [...K5, ...gridEdges(3, 3, 5)])],
        ];
        for (const [name, s] of notPlanar) {
            assert.throws(() => layout.planar(s), /G is not planar/, name);
        }
    });

    it("ignores self-loops, parallel edges and the seed", () => {
        const edges: [number, number][] = [
            [0, 2],
            [2, 4],
            [4, 1],
            [1, 3],
            [3, 5],
            [5, 0],
            [0, 4],
            [6, 0],
            [6, 1],
        ];
        const plain = layout.planar(graph(7, edges)).positions;
        assert.deepEqual(layout.planar(graph(7, [...edges, [2, 2], [6, 6]]), { seed: 3 }).positions, plain);
        assert.deepEqual(layout.planar(graph(7, [...edges, [0, 6], [6, 0], [2, 0]]), { seed: 9 }).positions, plain);
        // five self-loops and a repeated edge take a path's raw edge count past 3n - 6
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
        assert.equal(layout.planar(s).n, 5);
    });

    it("lays out a long path without overflowing the stack", () => {
        const r = layout.planar(path(20000), { seed: 1 });
        assert.equal(r.n, 20000);
        assert.ok(Array.from(r.positions).every(Number.isFinite));
    });
});

/** The edges of a rows x cols grid whose nodes start at `offset`. */
function gridEdges(rows: number, cols: number, offset: number): [number, number][] {
    const edges: [number, number][] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const i = offset + r * cols + c;
            if (c + 1 < cols) {
                edges.push([i, i + 1]);
            }
            if (r + 1 < rows) {
                edges.push([i, i + cols]);
            }
        }
    }
    return edges;
}

/** The Pearson correlation of two sequences. */
function correlation(a: readonly number[], b: readonly number[]): number {
    const n = a.length;
    const ma = a.reduce((x, y) => x + y, 0) / n;
    const mb = b.reduce((x, y) => x + y, 0) / n;
    let ab = 0;
    let aa = 0;
    let bb = 0;
    for (let i = 0; i < n; i++) {
        ab += (a[i] - ma) * (b[i] - mb);
        aa += (a[i] - ma) ** 2;
        bb += (b[i] - mb) ** 2;
    }
    return ab / Math.sqrt(aa * bb);
}

describe("spectral", () => {
    it("puts a path on a line in order", () => {
        const r = layout.spectral(path(30));
        const x = Array.from({ length: 30 }, (_, i) => row(r, i)[0]);
        const steps = x.slice(1).map((v, i) => Math.sign(v - x[i]));
        // the Fiedler vector of a path is monotone along it
        assert.ok(
            steps.every((d) => d === steps[0] && d !== 0),
            x.join(","),
        );
    });

    it("puts a cycle on a circle in order", () => {
        const n = 24;
        const cycle = graph(
            n,
            Array.from({ length: n }, (_, i) => [i, (i + 1) % n] as const),
        );
        const r = layout.spectral(cycle);
        const radii = Array.from({ length: n }, (_, i) => Math.hypot(...row(r, i)));
        for (const radius of radii) {
            assert.ok(Math.abs(radius - radii[0]) < 1e-4 * radii[0], radii.join(","));
        }
        // neighbours on the cycle are neighbours on the circle: every step turns by the same angle
        const turn = (i: number): number => {
            const [ax, ay] = row(r, i);
            const [bx, by] = row(r, (i + 1) % n);
            return Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by));
        };
        for (let i = 0; i < n; i++) {
            assert.ok(Math.abs(turn(i) - (2 * Math.PI) / n) < 1e-4, `step ${i}: ${turn(i)}`);
        }
    });

    it("keeps a grid's rows and columns apart", () => {
        // the two smallest nonzero eigenvectors of a square grid span its row and column coordinates
        const side = 10;
        const r = layout.spectral(fromEdgeArrays(gridGraph({ rows: side, cols: side })));
        const xs = Array.from({ length: side * side }, (_, i) => row(r, i)[0]);
        const ys = Array.from({ length: side * side }, (_, i) => row(r, i)[1]);
        const rows = Array.from({ length: side * side }, (_, i) =>
            Math.cos((Math.PI * (Math.floor(i / side) + 0.5)) / side),
        );
        const cols = Array.from({ length: side * side }, (_, i) => Math.cos((Math.PI * ((i % side) + 0.5)) / side));
        // x and y are an orthogonal combination of the row and column modes
        const fit = correlation(xs, rows) ** 2 + correlation(xs, cols) ** 2;
        assert.ok(Math.abs(fit - 1) < 1e-6, `x: ${fit}`);
        assert.ok(Math.abs(correlation(ys, rows) ** 2 + correlation(ys, cols) ** 2 - 1) < 1e-6);
        assert.ok(Math.abs(correlation(xs, ys)) < 1e-6);
    });

    it("finds the same picture by iteration above 500 nodes", () => {
        // a 25 x 25 grid: Lanczos, where 20 x 20 is decomposed exactly
        const side = 25;
        const r = layout.spectral(fromEdgeArrays(gridGraph({ rows: side, cols: side })), { seed: 2 });
        const xs = Array.from({ length: side * side }, (_, i) => row(r, i)[0]);
        const ys = Array.from({ length: side * side }, (_, i) => row(r, i)[1]);
        const rows = Array.from({ length: side * side }, (_, i) =>
            Math.cos((Math.PI * (Math.floor(i / side) + 0.5)) / side),
        );
        const cols = Array.from({ length: side * side }, (_, i) => Math.cos((Math.PI * ((i % side) + 0.5)) / side));
        assert.ok(Math.abs(correlation(xs, rows) ** 2 + correlation(xs, cols) ** 2 - 1) < 1e-3);
        assert.ok(Math.abs(correlation(ys, rows) ** 2 + correlation(ys, cols) ** 2 - 1) < 1e-3);
        assert.ok(Math.abs(correlation(xs, ys)) < 1e-3);
        // and a 600-node path still comes out in order
        const line = layout.spectral(path(600), { seed: 2 });
        const x = Array.from({ length: 600 }, (_, i) => row(line, i)[0]);
        assert.ok(x[0] * x[599] < 0 && Math.abs(x[300]) < 0.1 * Math.abs(x[0]), `${x[0]} ${x[300]} ${x[599]}`);
    });

    it("ignores self-loops and parallel edges", () => {
        const edges: [number, number][] = [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 4],
            [4, 0],
            [1, 3],
        ];
        assert.deepEqual(
            layout.spectral(graph(5, [...edges, [0, 1], [2, 2]])).positions,
            layout.spectral(graph(5, edges)).positions,
        );
    });

    it("puts two nodes at the centre minus and plus scale", () => {
        const r = layout.spectral(graph(2, [[0, 1]]), { scale: 2, center: [1, 1] });
        assert.deepEqual(row(r, 0), [-1, -1]);
        assert.deepEqual(row(r, 1), [3, 3]);
    });
});
