import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { commonNeighborsScore } from "../../../src/indexed/common-neighbors.js";

/** The undirected star c-a, c-b, c-d. */
function star(): GraphSnapshot {
    const b = new GraphBuilder({ directed: false });
    for (const id of ["a", "b", "c", "d"]) {
        b.addNode(id);
    }
    b.addEdge("c", "a");
    b.addEdge("c", "b");
    b.addEdge("c", "d");
    return b.freeze({ label: "star", checksum: true });
}

function directedOn(edges: readonly (readonly [string, string])[]): GraphSnapshot {
    const b = new GraphBuilder({ directed: true });
    for (const id of ["a", "b", "c"]) {
        b.addNode(id);
    }
    for (const [u, v] of edges) {
        b.addEdge(u, v);
    }
    return b.freeze({ label: "directed", checksum: true });
}

describe("commonNeighborsScore", () => {
    it("counts the one neighbour two leaves of a star share", () => {
        const s = star();
        expect(commonNeighborsScore(s, s.ids.requireIndex("a"), s.ids.requireIndex("b"))).toBe(1);
        s.validate({ checksum: true });
    });

    it("scores zero when the two rows are disjoint", () => {
        // row(a) = [c] and row(c) = [a, b, d]: c is not its own neighbour and a is not its own,
        // so the merge finds nothing.
        const s = star();
        expect(commonNeighborsScore(s, s.ids.requireIndex("a"), s.ids.requireIndex("c"))).toBe(0);
        s.validate({ checksum: true });
    });

    it("a node against itself counts its own neighbours", () => {
        // The function is a row intersection and makes no special case for u === v: row(a) merged
        // with row(a) matches on every entry, so the answer is the node's own degree. It is 1 for a
        // leaf and 3 for the hub -- NOT zero.
        const s = star();
        expect(commonNeighborsScore(s, s.ids.requireIndex("a"), s.ids.requireIndex("a"))).toBe(1);
        expect(commonNeighborsScore(s, s.ids.requireIndex("c"), s.ids.requireIndex("c"))).toBe(3);
        s.validate({ checksum: true });
    });

    it("directed: out(u) against in(v)", () => {
        const fanIn = directedOn([
            ["a", "c"],
            ["b", "c"],
        ]);
        const fa = fanIn.ids.requireIndex("a");
        const fb = fanIn.ids.requireIndex("b");
        // out(a) = [c], in(b) = [] -- nothing points at b.
        expect(commonNeighborsScore(fanIn, fa, fb, { directed: true })).toBe(0);
        fanIn.validate({ checksum: true });

        const chain = directedOn([
            ["a", "c"],
            ["c", "b"],
        ]);
        const ca = chain.ids.requireIndex("a");
        const cb = chain.ids.requireIndex("b");
        // out(a) = [c], in(b) = [c].
        expect(commonNeighborsScore(chain, ca, cb, { directed: true })).toBe(1);
        chain.validate({ checksum: true });
    });

    it("without { directed: true } a directed snapshot merges the two OUT rows", () => {
        // s.rowPtr / s.colIdx of a directed snapshot are the out rows, and the default sets
        // bwd = s, so this is out(a) against out(b) -- both [c].
        const fanIn = directedOn([
            ["a", "c"],
            ["b", "c"],
        ]);
        const a = fanIn.ids.requireIndex("a");
        const b = fanIn.ids.requireIndex("b");
        expect(commonNeighborsScore(fanIn, a, b)).toBe(1);
        fanIn.validate({ checksum: true });
    });

    it("counts a repeated neighbour once (the adjacent-skip idiom)", () => {
        // GraphBuilder's duplicateEdges default is "keep" (graph-format/src/builder/graph-builder.ts:117),
        // so this really is a multigraph: row(a) is [c, c]. The skip loops after a match are what
        // give simple-graph semantics without calling simplified().
        const b = new GraphBuilder({ directed: false });
        for (const id of ["a", "b", "c"]) {
            b.addNode(id);
        }
        b.addEdge("a", "c");
        b.addEdge("a", "c");
        b.addEdge("b", "c");
        const s = b.freeze({ label: "multi", checksum: true });
        expect(commonNeighborsScore(s, s.ids.requireIndex("a"), s.ids.requireIndex("b"))).toBe(1);
        s.validate({ checksum: true });
    });
});
