import { expandEdges, GraphBuilder, type GraphSnapshot, type NumericVector } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import { allPairsShortestPath } from "../../../src/indexed/all-pairs.js";
import { expectMatrixTriangleInequality, expectSymmetric, floydWarshallOracle } from "../../helpers/all-pairs-oracle.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

/** The exact f64 weights `toSnapshot` keeps beside the f32 arc column, expanded to one per arc. */
function f64Weights(s: GraphSnapshot): NumericVector {
    const shadow = s.edges.byRole("weight");
    if (shadow === null || shadow.dtype !== "f64") {
        throw new Error("expected an f64 shadow weight column");
    }
    return expandEdges(s, shadow.data);
}

function allFixtures(): { name: string; graph: Graph }[] {
    return [...undirectedFixtures(), ...directedFixtures()];
}

function threePath(): Graph {
    const g = new Graph({ directed: false });
    g.addEdge("a", "b", 1);
    g.addEdge("b", "c", 1);
    return g;
}

describe("indexed.allPairsShortestPath -- input checks", () => {
    it("returns an empty matrix for an empty graph", () => {
        const s = checksummedSnapshot(new Graph());
        const r = allPairsShortestPath(s);
        expect(r.n).toBe(0);
        expect(r.dist.length).toBe(0);
        expect(r.hasNegativeCycle).toBe(false);
        s.validate({ checksum: true });
    });

    it("refuses more than maxNodes nodes, naming the size, the bound and the bytes", () => {
        const s = checksummedSnapshot(threePath());
        expect(() => allPairsShortestPath(s, { maxNodes: 2 })).toThrow(RangeError);
        expect(() => allPairsShortestPath(s, { maxNodes: 2 })).toThrow(/3 nodes.*maxNodes 2.*\b72 bytes/);
        expect(() => allPairsShortestPath(s, { maxNodes: 2, paths: true })).toThrow(/\b108 bytes/);
        s.validate({ checksum: true });
    });

    it("refuses a NaN or infinite weight and an override of the wrong length", () => {
        const s = checksummedSnapshot(threePath());
        const bad = (x: number): Float64Array => new Float64Array(s.arcCount).fill(1).fill(x, 0, 1);
        expect(() => allPairsShortestPath(s, { weights: bad(NaN) })).toThrow(RangeError);
        expect(() => allPairsShortestPath(s, { weights: bad(Infinity) })).toThrow(RangeError);
        expect(() => allPairsShortestPath(s, { weights: new Float64Array(s.arcCount + 1) })).toThrow(RangeError);
        s.validate({ checksum: true });
    });

    it("has an oracle that gets a weighted square right", () => {
        // a-b 1, b-c 2, c-d 3, d-a 10, undirected: a->d is 6 the long way round
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", 1);
        g.addEdge("b", "c", 2);
        g.addEdge("c", "d", 3);
        g.addEdge("d", "a", 10);
        const s = checksummedSnapshot(g);
        expect([...floydWarshallOracle(s, s.weights)]).toEqual([0, 1, 3, 6, 1, 0, 2, 5, 3, 2, 0, 3, 6, 5, 3, 0]);
        s.validate({ checksum: true });
    });
});

describe("indexed.allPairsShortestPath -- Floyd-Warshall", () => {
    const fw = { method: "floyd-warshall" } as const;

    it("equals the reference on every fixture", () => {
        for (const { name, graph } of allFixtures()) {
            const s = checksummedSnapshot(graph);
            const r = allPairsShortestPath(s, fw);
            expect(r.method, name).toBe("floyd-warshall");
            expect(r.hasNegativeCycle, name).toBe(false);
            expect(r.dist, name).toEqual(floydWarshallOracle(s, s.weights));
            expectMatrixTriangleInequality(r.dist, s, s.weights);
            if (!s.directed) {
                expectSymmetric(r.dist, r.n);
            }
            s.validate({ checksum: true });
        }
    });

    it("gives [0] for one node, with or without a positive self-loop", () => {
        const lone = new Graph();
        lone.addNode("a");
        const looped = new Graph({ allowSelfLoops: true });
        looped.addEdge("a", "a", 3);
        for (const g of [lone, looped]) {
            const s = checksummedSnapshot(g);
            expect([...allPairsShortestPath(s, fw).dist]).toEqual([0]);
            s.validate({ checksum: true });
        }
    });

    it("keeps the diagonal 0 under a positive self-loop", () => {
        const g = new Graph({ directed: true, allowSelfLoops: true });
        g.addEdge("a", "b", 2);
        g.addEdge("b", "b", 5);
        const s = checksummedSnapshot(g);
        expect([...allPairsShortestPath(s, fw).dist]).toEqual([0, 2, Infinity, 0]);
        s.validate({ checksum: true });
    });

    it("takes the cheapest of parallel edges", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b", 5);
        b.addEdge("a", "b", 2);
        const s = b.freeze({ checksum: true });
        expect([...allPairsShortestPath(s, fw).dist]).toEqual([0, 2, 2, 0]);
        s.validate({ checksum: true });
    });

    it("leaves +Infinity across components and against a one-way chain", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", 1);
        g.addEdge("c", "d", 1);
        g.addNode("z");
        const s = checksummedSnapshot(g);
        const r = allPairsShortestPath(s, fw);
        expect(r.dist[0 * 5 + 1]).toBe(1);
        expect(r.dist[0 * 5 + 2]).toBe(Infinity);
        expect(r.dist[4 * 5 + 0]).toBe(Infinity);
        expect(r.dist[4 * 5 + 4]).toBe(0);
        s.validate({ checksum: true });

        const chain = new Graph({ directed: true });
        chain.addEdge("a", "b", 1);
        chain.addEdge("b", "c", 1);
        const sc = checksummedSnapshot(chain);
        const rc = allPairsShortestPath(sc, fw);
        expect(rc.dist[0 * 3 + 2]).toBe(2);
        expect(rc.dist[2 * 3 + 0]).toBe(Infinity);
        sc.validate({ checksum: true });
    });

    it("reproduces f64 sums exactly through the weights override", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 0.1);
        g.addEdge("b", "c", 0.2);
        const s = checksummedSnapshot(g);
        const w = f64Weights(s);
        const r = allPairsShortestPath(s, { ...fw, weights: w });
        expect(r.dist).toEqual(floydWarshallOracle(s, w));
        expect(r.dist[2]).toBe(0.1 + 0.2);
        s.validate({ checksum: true });
    });
});

function directed(edges: [string, string, number][], allowSelfLoops = false): Graph {
    const g = new Graph({ directed: true, allowSelfLoops });
    for (const [u, v, w] of edges) {
        g.addEdge(u, v, w);
    }
    return g;
}

function everyCellNaN(dist: ArrayLike<number>): boolean {
    return Array.from(dist).every((x) => Number.isNaN(x));
}

describe("indexed.allPairsShortestPath -- negative weights", () => {
    it("sweeps a directed negative weight with no cycle", () => {
        const s = checksummedSnapshot(
            directed([
                ["a", "b", 4],
                ["a", "c", 2],
                ["c", "b", -1],
            ]),
        );
        const r = allPairsShortestPath(s);
        expect(r.hasNegativeCycle).toBe(false);
        expect(r.dist[0 * 3 + 1]).toBe(1);
        s.validate({ checksum: true });
    });

    it("flags a directed negative cycle and fills the matrix with NaN", () => {
        const s = checksummedSnapshot(
            directed([
                ["a", "b", 1],
                ["b", "c", 1],
                ["c", "a", -10],
            ]),
        );
        const r = allPairsShortestPath(s);
        expect(r.hasNegativeCycle).toBe(true);
        expect(r.dist.length).toBe(9);
        expect(everyCellNaN(r.dist)).toBe(true);
        s.validate({ checksum: true });
    });

    it("flags a negative self-loop, on one node and on four", () => {
        const one = checksummedSnapshot(directed([["a", "a", -1]], true));
        const r1 = allPairsShortestPath(one);
        expect(r1.hasNegativeCycle).toBe(true);
        expect(r1.dist.length).toBe(1);
        expect(Number.isNaN(r1.dist[0])).toBe(true);
        one.validate({ checksum: true });

        const four = checksummedSnapshot(
            directed(
                [
                    ["a", "b", 1],
                    ["b", "c", 1],
                    ["c", "d", 1],
                    ["c", "c", -1],
                ],
                true,
            ),
        );
        const r4 = allPairsShortestPath(four);
        expect(r4.hasNegativeCycle).toBe(true);
        expect(everyCellNaN(r4.dist)).toBe(true);
        four.validate({ checksum: true });
    });

    it("flags any negative edge on an undirected graph", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", 3);
        g.addEdge("b", "c", -1);
        const s = checksummedSnapshot(g);
        const r = allPairsShortestPath(s);
        expect(r.hasNegativeCycle).toBe(true);
        expect(everyCellNaN(r.dist)).toBe(true);
        s.validate({ checksum: true });
    });

    it("stops on Hougardy's graph before any value runs away", () => {
        for (const isDirected of [true, false]) {
            const g = new Graph({ directed: isDirected });
            for (let i = 0; i < 12; i++) {
                for (let j = 0; j < 12; j++) {
                    if (i !== j && (isDirected || i < j)) {
                        g.addEdge(`v${i}`, `v${j}`, -1);
                    }
                }
            }
            const s = checksummedSnapshot(g);
            const r = allPairsShortestPath(s);
            expect(r.hasNegativeCycle).toBe(true);
            expect(r.dist.includes(-Infinity)).toBe(false);
            expect(everyCellNaN(r.dist)).toBe(true);
            s.validate({ checksum: true });
        }
    });

    it("reports no negative cycle when no weight is negative", () => {
        for (const { name, graph } of allFixtures()) {
            const s = checksummedSnapshot(graph);
            expect(allPairsShortestPath(s).hasNegativeCycle, name).toBe(false);
        }
    });
});
