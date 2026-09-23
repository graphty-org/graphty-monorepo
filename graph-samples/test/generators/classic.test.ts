import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    balancedTreeGraph,
    barbellGraph,
    cavemanGraph,
    completeBipartiteGraph,
    completeGraph,
    connectedCavemanGraph,
    cycleGraph,
    grid3dGraph,
    gridGraph,
    hypercubeGraph,
    ladderGraph,
    lollipopGraph,
    pathGraph,
    petersenGraph,
    starGraph,
    wheelGraph,
} from "../../src/generators/index.js";
import { componentCount, degrees, expectSimple, pairs } from "../helpers/graph.js";

describe("path, cycle, star, wheel", () => {
    it("pathGraph links consecutive indices", () => {
        const g = pathGraph({ n: 4 });
        expect(g.directed).toBe(false);
        expect(g.nodeCount).toBe(4);
        expect(pairs(g)).toEqual([
            [0, 1],
            [1, 2],
            [2, 3],
        ]);
        expect(pathGraph({ n: 0 }).src.length).toBe(0);
        expect(pathGraph({ n: 1 }).src.length).toBe(0);
    });

    it("cycleGraph closes the path", () => {
        const g = cycleGraph({ n: 5 });
        expectSimple(g);
        expect(pairs(g).at(-1)).toEqual([4, 0]);
        expect(degrees(g).every((d) => d === 2)).toBe(true);
        expect(() => cycleGraph({ n: 2 })).toThrow(RangeError);
    });

    it("starGraph joins node 0 to every other node", () => {
        const g = starGraph({ n: 6 });
        expectSimple(g);
        expect(degrees(g)).toEqual([5, 1, 1, 1, 1, 1]);
        expect(starGraph({ n: 1 }).src.length).toBe(0);
    });

    it("wheelGraph is a hub plus a rim cycle", () => {
        const g = wheelGraph({ n: 6 });
        expectSimple(g);
        expect(g.src.length).toBe(10);
        expect(degrees(g)).toEqual([5, 3, 3, 3, 3, 3]);
        expect(() => wheelGraph({ n: 3 })).toThrow(RangeError);
    });
});

describe("complete and complete bipartite", () => {
    it("completeGraph has every pair once, row-major", () => {
        const g = completeGraph({ n: 5 });
        expectSimple(g);
        expect(g.src.length).toBe(10);
        expect(pairs(g).slice(0, 4)).toEqual([
            [0, 1],
            [0, 2],
            [0, 3],
            [0, 4],
        ]);
        expect(completeGraph({ n: 0 }).nodeCount).toBe(0);
    });

    it("completeBipartiteGraph joins every left node to every right node and labels the sides", () => {
        const g = completeBipartiteGraph({ a: 2, b: 3 });
        expectSimple(g);
        expect(g.nodeCount).toBe(5);
        expect(g.src.length).toBe(6);
        expect(Array.from(g.nodeColumns?.side as Uint8Array)).toEqual([0, 0, 1, 1, 1]);
        for (const [u, v] of pairs(g)) {
            expect(u).toBeLessThan(2);
            expect(v).toBeGreaterThanOrEqual(2);
        }
    });

    it("refuses a complete graph whose edges overflow a snapshot", () => {
        expect(() => completeGraph({ n: 200_000 })).toThrow(RangeError);
    });
});

describe("lattices", () => {
    it("gridGraph is rows x cols with 4-neighbour edges", () => {
        const g = gridGraph({ rows: 3, cols: 4 });
        expectSimple(g);
        expect(g.nodeCount).toBe(12);
        expect(g.src.length).toBe(3 * 3 + 4 * 2);
        expect(degrees(g)[0]).toBe(2);
        expect(degrees(g)[5]).toBe(4);
        expect(pairs(g).slice(0, 2)).toEqual([
            [0, 1],
            [0, 4],
        ]);
    });

    it("grid3dGraph is rows x cols x layers with 6-neighbour edges", () => {
        const g = grid3dGraph({ rows: 2, cols: 3, layers: 4 });
        expectSimple(g);
        expect(g.nodeCount).toBe(24);
        expect(g.src.length).toBe(2 * 2 * 4 + 1 * 3 * 4 + 2 * 3 * 3);
        expect(Math.max(...degrees(grid3dGraph({ rows: 3, cols: 3, layers: 3 })))).toBe(6);
    });

    it("hypercubeGraph Q_d is d-regular with d 2^(d-1) edges", () => {
        const g = hypercubeGraph({ dimension: 4 });
        expectSimple(g);
        expect(g.nodeCount).toBe(16);
        expect(g.src.length).toBe(32);
        expect(degrees(g).every((d) => d === 4)).toBe(true);
        for (const [u, v] of pairs(g)) {
            const x = u ^ v;
            expect(x & (x - 1)).toBe(0);
        }
        expect(hypercubeGraph({ dimension: 0 }).nodeCount).toBe(1);
    });

    it("ladderGraph is two paths joined by rungs", () => {
        const g = ladderGraph({ n: 4 });
        expectSimple(g);
        expect(g.nodeCount).toBe(8);
        expect(g.src.length).toBe(3 * 4 - 2);
        expect(pairs(g).at(-1)).toEqual([3, 7]);
    });

    it("builds 100k-node lattices", () => {
        const g = gridGraph({ rows: 316, cols: 317 });
        expect(g.nodeCount).toBe(100_172);
        expect(componentCount(g)).toBe(1);
        expect(hypercubeGraph({ dimension: 17 }).src.length).toBe(17 * 2 ** 16);
    });
});

describe("barbell, lollipop, caveman", () => {
    it("barbellGraph is two cliques joined by a path", () => {
        const g = barbellGraph({ cliqueSize: 4, pathLength: 2 });
        expectSimple(g);
        expect(g.nodeCount).toBe(10);
        expect(g.src.length).toBe(6 + 6 + 3);
        expect(componentCount(g)).toBe(1);
        expect(barbellGraph({ cliqueSize: 3, pathLength: 0 }).src.length).toBe(7);
    });

    it("lollipopGraph is a clique with a tail", () => {
        const g = lollipopGraph({ cliqueSize: 4, pathLength: 3 });
        expectSimple(g);
        expect(g.nodeCount).toBe(7);
        expect(g.src.length).toBe(6 + 3);
        expect(degrees(g)[6]).toBe(1);
    });

    it("cavemanGraph is disjoint cliques labelled by community", () => {
        const g = cavemanGraph({ cliques: 3, size: 4 });
        expectSimple(g);
        expect(g.src.length).toBe(18);
        expect(componentCount(g)).toBe(3);
        expect(Array.from(g.nodeColumns?.community as Uint32Array)).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2]);
    });

    it("connectedCavemanGraph rewires one edge per clique into a ring of cliques", () => {
        const g = connectedCavemanGraph({ cliques: 4, size: 5 });
        expectSimple(g);
        expect(g.src.length).toBe(40);
        expect(componentCount(g)).toBe(1);
        const community = g.nodeColumns?.community as Uint32Array;
        const crossing = pairs(g).filter(([u, v]) => community[u] !== community[v]);
        expect(crossing).toEqual([
            [0, 19],
            [5, 4],
            [10, 9],
            [15, 14],
        ]);
        expect(() => connectedCavemanGraph({ cliques: 1, size: 5 })).toThrow(RangeError);
    });
});

describe("trees and named graphs", () => {
    it("balancedTreeGraph numbers nodes breadth first", () => {
        const g = balancedTreeGraph({ branching: 2, height: 3 });
        expectSimple(g);
        expect(g.nodeCount).toBe(15);
        expect(componentCount(g)).toBe(1);
        expect(pairs(g).slice(0, 3)).toEqual([
            [0, 1],
            [0, 2],
            [1, 3],
        ]);
        expect(balancedTreeGraph({ branching: 1, height: 4 }).nodeCount).toBe(5);
        expect(balancedTreeGraph({ branching: 3, height: 0 }).nodeCount).toBe(1);
    });

    it("petersenGraph is 3-regular on 10 nodes with girth 5", () => {
        const g = petersenGraph();
        expectSimple(g);
        expect(g.nodeCount).toBe(10);
        expect(g.src.length).toBe(15);
        expect(degrees(g).every((d) => d === 3)).toBe(true);
        // no triangles or 4-cycles: any two adjacent nodes share no neighbour
        const adj = Array.from({ length: 10 }, () => new Set<number>());
        for (const [u, v] of pairs(g)) {
            adj[u].add(v);
            adj[v].add(u);
        }
        for (let u = 0; u < 10; u++) {
            for (let v = u + 1; v < 10; v++) {
                const common = [...adj[u]].filter((x) => adj[v].has(x)).length;
                expect(common).toBeLessThanOrEqual(adj[u].has(v) ? 0 : 1);
            }
        }
    });
});

describe("argument checks and snapshot loading", () => {
    it("rejects non-integer and out-of-range sizes", () => {
        expect(() => pathGraph({ n: -1 })).toThrow(RangeError);
        expect(() => pathGraph({ n: 1.5 })).toThrow(RangeError);
        expect(() => gridGraph({ rows: 2, cols: Number.NaN })).toThrow(RangeError);
        expect(() => hypercubeGraph({ dimension: 40 })).toThrow(RangeError);
        expect(() => barbellGraph({ cliqueSize: 1, pathLength: 0 })).toThrow(RangeError);
    });

    it("every classic graph loads into a graph-format snapshot as is", () => {
        for (const g of [
            pathGraph({ n: 5 }),
            completeBipartiteGraph({ a: 3, b: 4 }),
            connectedCavemanGraph({ cliques: 3, size: 3 }),
            petersenGraph(),
        ]) {
            const snapshot = fromEdgeArrays(g);
            expect(snapshot.nodeCount).toBe(g.nodeCount);
            expect(snapshot.edgeCount).toBe(g.src.length);
        }
    });
});
