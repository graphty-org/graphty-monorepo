import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import { allPairsShortestPath } from "../../../src/indexed/all-pairs.js";
import { floydWarshallOracle } from "../../helpers/all-pairs-oracle.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";

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
