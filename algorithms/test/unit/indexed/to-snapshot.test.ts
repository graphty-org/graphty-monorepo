import { equalsTopology, INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import { toSnapshot } from "../../../src/indexed/to-snapshot.js";

function triangle(directed: boolean): Graph {
    const g = new Graph({ directed });
    g.addEdge("a", "b", 1);
    g.addEdge("b", "c", 2.5);
    g.addEdge("c", "a", 0.1);
    return g;
}

describe("Graph.mutationCount", () => {
    it("starts at zero and bumps on every topology change", () => {
        const g = new Graph();
        expect(g.mutationCount).toBe(0);
        g.addNode("a");
        const afterAdd = g.mutationCount;
        expect(afterAdd).toBeGreaterThan(0);
        g.addNode("a"); // an existing id is not a change
        expect(g.mutationCount).toBe(afterAdd);
        g.addEdge("a", "b");
        expect(g.mutationCount).toBeGreaterThan(afterAdd);
        const afterEdge = g.mutationCount;
        g.removeEdge("a", "b");
        expect(g.mutationCount).toBeGreaterThan(afterEdge);
        const afterRemove = g.mutationCount;
        g.removeEdge("a", "b"); // already gone
        expect(g.mutationCount).toBe(afterRemove);
    });

    it("is not bumped by a read", () => {
        const g = triangle(false);
        const before = g.mutationCount;
        expect(g.degree("a")).toBe(2);
        expect([...g.edges()]).toHaveLength(3);
        expect(g.mutationCount).toBe(before);
    });
});

describe("toSnapshot", () => {
    it("carries the direction, the counts and the ids", () => {
        const s = toSnapshot(triangle(true));
        expect(s.directed).toBe(true);
        expect(s.nodeCount).toBe(3);
        expect(s.edgeCount).toBe(3);
        expect(s.arcCount).toBe(3);
        expect(s.ids.indexOf("a")).not.toBe(INVALID_INDEX);
        expect(s.ids.idOf(s.ids.requireIndex("b"))).toBe("b");
    });

    it("doubles the arcs of an undirected graph (invariant I7)", () => {
        const s = toSnapshot(triangle(false));
        expect(s.directed).toBe(false);
        expect(s.edgeCount).toBe(3);
        expect(s.arcCount).toBe(6);
    });

    it("memoises on mutationCount and invalidates on a mutation", () => {
        const g = triangle(true);
        const first = toSnapshot(g);
        expect(toSnapshot(g)).toBe(first);
        g.addEdge("a", "c", 7);
        const second = toSnapshot(g);
        expect(second).not.toBe(first);
        expect(second.edgeCount).toBe(4);
    });

    it("keeps f64 weights exactly through the shadow column", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 0.1 + 0.2); // 0.30000000000000004, not f32-exact
        const s = toSnapshot(g);
        const shadow = s.edges.byRole("weight");
        expect(shadow).not.toBeNull();
        expect(shadow?.dtype).toBe("f64");
        expect((shadow?.data as Float64Array)[0]).toBe(0.1 + 0.2);
    });

    it("is deterministic: the same graph freezes to the same topology twice", () => {
        const g = triangle(false);
        expect(equalsTopology(toSnapshot(g), toSnapshot(g.clone()))).toBe(true);
    });

    it("yields each undirected edge once when ids mix strings and numbers", () => {
        const g = new Graph();
        g.addEdge("string", 123);
        g.addEdge(123, "another");
        expect([...g.edges()]).toHaveLength(2);
        expect(g.uniqueEdgeCount).toBe(2);
        const s = toSnapshot(g);
        expect(s.edgeCount).toBe(g.totalEdgeCount);
        expect(s.arcCount).toBe(4);
        expect(equalsTopology(s, toSnapshot(g.clone()))).toBe(true);
    });

    it("records checksums on request, and never serves a plain snapshot to a checksum request", () => {
        const g = triangle(true);
        const plain = toSnapshot(g);
        // A plain snapshot has no checksums to compare, and graph-format says so rather than
        // passing vacuously (E_INVALID_SNAPSHOT, details.reason "no-checksum").
        expect(() => {
            plain.validate({ checksum: true });
        }).toThrow();
        const checked = toSnapshot(g, { checksum: true });
        expect(checked).not.toBe(plain); // the plain cache entry cannot answer this request
        expect(() => {
            checked.validate({ checksum: true });
        }).not.toThrow();
        // The reverse direction IS a hit: a checksummed snapshot answers a plain request.
        expect(toSnapshot(g)).toBe(checked);
        expect(toSnapshot(g, { checksum: true })).toBe(checked);
    });
});
