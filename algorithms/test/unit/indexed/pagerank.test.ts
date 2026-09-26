import { describe, expect, it } from "vitest";

import { pageRank as legacyPageRank } from "../../../src/algorithms/centrality/pagerank.js";
import { Graph } from "../../../src/core/graph.js";
import { pageRank } from "../../../src/indexed/pagerank.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";

function directedFrom(edges: readonly (readonly [string, string, number?])[]): Graph {
    const g = new Graph({ directed: true });
    for (const [u, v, w] of edges) {
        g.addEdge(u, v, w);
    }
    return g;
}

function sum(scores: ArrayLike<number>): number {
    let total = 0;
    for (let i = 0; i < scores.length; i++) {
        total += scores[i];
    }
    return total;
}

describe("indexed.pageRank", () => {
    it("throws on an undirected snapshot", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        const s = checksummedSnapshot(g);
        expect(() => pageRank(s)).toThrow("PageRank requires a directed graph");
        s.validate({ checksum: true });
    });

    it("gives a directed 4-cycle four equal scores summing to 1", () => {
        const s = checksummedSnapshot(
            directedFrom([
                ["a", "b"],
                ["b", "c"],
                ["c", "d"],
                ["d", "a"],
            ]),
        );
        const r = pageRank(s);
        expect(r.converged).toBe(true);
        for (let u = 0; u < 4; u++) {
            expect(r.scores[u]).toBeCloseTo(0.25, 12);
        }
        expect(Math.abs(sum(r.scores) - 1)).toBeLessThan(1e-12);
        s.validate({ checksum: true });
    });

    it("puts more mass on the target of a two-node chain", () => {
        const s = checksummedSnapshot(directedFrom([["a", "b"]]));
        const r = pageRank(s);
        expect(r.scores[1]).toBeGreaterThan(r.scores[0]);
        s.validate({ checksum: true });
    });

    it("does not leak mass through a dangling node", () => {
        // c has out-degree 0.
        const s = checksummedSnapshot(
            directedFrom([
                ["a", "b"],
                ["b", "a"],
                ["a", "c"],
            ]),
        );
        const r = pageRank(s);
        expect(s.outDegree()[2]).toBe(0);
        expect(Math.abs(sum(r.scores) - 1)).toBeLessThan(1e-9);
        s.validate({ checksum: true });
    });

    it("reports iterations === 1 and converged === false under maxIterations: 1", () => {
        const s = checksummedSnapshot(
            directedFrom([
                ["a", "b"],
                ["b", "c"],
                ["c", "a"],
                ["a", "c"],
            ]),
        );
        const r = pageRank(s, { maxIterations: 1 });
        expect(r.iterations).toBe(1);
        expect(r.converged).toBe(false);
        s.validate({ checksum: true });
    });

    it("weighted: true splits one node's contribution 3:1 across arcs of weight 3 and 1", () => {
        // u = 0 pushes into x = 1 over weight 3 and into y = 2 over weight 1; x and y are dangling
        // and u has no in-arcs, so after one iteration u's score is exactly the shared base term
        // and (x - u) : (y - u) is the weight ratio.
        const s = checksummedSnapshot(
            directedFrom([
                ["u", "x", 3],
                ["u", "y", 1],
            ]),
        );
        const r = pageRank(s, { weighted: true, maxIterations: 1 });
        expect((r.scores[1] - r.scores[0]) / (r.scores[2] - r.scores[0])).toBeCloseTo(3, 12);
        const unweighted = pageRank(s, { maxIterations: 1 });
        expect(unweighted.scores[1]).toBeCloseTo(unweighted.scores[2], 12);
        s.validate({ checksum: true });
    });

    it("agrees with the legacy pageRank to 1e-9 when both are pinned", () => {
        const g = directedFrom([
            ["a", "b"],
            ["a", "c"],
            ["b", "c"],
            ["c", "a"],
            ["c", "d"],
            ["d", "e"],
            ["e", "c"],
            ["e", "f"],
            ["f", "g"],
            ["g", "e"],
            ["h", "a"],
            ["h", "g"],
        ]);
        g.addEdge("g", "i"); // i is dangling
        const s = checksummedSnapshot(g);
        // Both sides are run to a tolerance neither can reach before maxIterations, so neither stopping
        // rule decides the answer. They differ: the port's `converged` is an L1 delta over all nodes
        // (`delta += Math.abs(next[v] - rank[v])`), the legacy one is L-infinity
        // (`maxDiff = Math.max(maxDiff, ...)`, pagerank.ts:257-267), both against 1e-6 by default -- so at
        // the default tolerance the legacy loop stops up to n iterations earlier and the two answers differ
        // by about its residual, which on scores near 0.25 is several times 1e-6 relative.
        // `useDelta: false` is MANDATORY, not tidiness: `options.useDelta !== false && n > 100`
        // (pagerank.ts) switches the legacy call to SimpleDeltaPageRank, a separate implementation.
        const legacy = legacyPageRank(g, { dampingFactor: 0.85, maxIterations: 200, tolerance: 1e-12, useDelta: false });
        const ported = pageRank(s, { dampingFactor: 0.85, maxIterations: 200, tolerance: 1e-12 });
        for (let u = 0; u < s.nodeCount; u++) {
            expect(ported.scores[u]).toBeCloseTo(legacy.ranks[String(s.ids.idOf(u))], 9); // 1e-9 absolute
        }
        s.validate({ checksum: true });
    });
});
