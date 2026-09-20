import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { arcSourceIn } from "../../../src/indexed/structures/arc-source.js";
import { IndexedMinHeap } from "../../../src/indexed/structures/min-heap.js";
import { IntUnionFind } from "../../../src/indexed/structures/union-find.js";

describe("IntUnionFind", () => {
    it("starts as singletons", () => {
        const { labels, count } = new IntUnionFind(5).toLabels();
        expect(count).toBe(5);
        expect([...labels]).toEqual([0, 1, 2, 3, 4]);
    });

    it("collapses a chain to one set", () => {
        const uf = new IntUnionFind(4);
        expect(uf.union(0, 1)).toBe(true);
        expect(uf.union(1, 2)).toBe(true);
        expect(uf.union(2, 3)).toBe(true);
        expect(uf.find(0)).toBe(uf.find(3));
        const { labels, count } = uf.toLabels();
        expect(count).toBe(1);
        expect([...labels]).toEqual([0, 0, 0, 0]);
    });

    it("returns false for a union inside one set", () => {
        const uf = new IntUnionFind(3);
        expect(uf.union(0, 1)).toBe(true);
        expect(uf.union(1, 0)).toBe(false);
        expect(uf.union(0, 0)).toBe(false);
    });

    it("renumbers to dense first-seen labels whatever the representatives are", () => {
        // Deliberately NOT asserted through the representatives: union by rank chooses those, so a
        // test that pinned them would be testing the rank heuristic rather than the renumbering.
        // What is pinned is the property renumberPartition guarantees: labels 0..count-1 in the
        // order each set is first seen while scanning i = 0, 1, 2, ...
        const uf = new IntUnionFind(5);
        uf.union(0, 1);
        uf.union(2, 3);
        const { labels, count } = uf.toLabels();
        expect(count).toBe(3);
        expect([...labels]).toEqual([0, 0, 1, 1, 2]);
    });
});

describe("IndexedMinHeap", () => {
    it("pops in ascending key order", () => {
        const heap = new IndexedMinHeap(100);
        for (let i = 0; i < 100; i++) {
            heap.push(i, 99 - i); // node i has key 99 - i, so node 99 is the minimum
        }
        const popped: number[] = [];
        while (!heap.isEmpty()) {
            popped.push(heap.pop());
        }
        expect(popped).toHaveLength(100);
        for (let i = 0; i < 100; i++) {
            expect(popped[i]).toBe(99 - i);
        }
    });

    it("pushOrDecrease inserts an absent node", () => {
        const heap = new IndexedMinHeap(4);
        heap.pushOrDecrease(2, 5);
        expect(heap.isEmpty()).toBe(false);
        expect(heap.pop()).toBe(2);
        expect(heap.isEmpty()).toBe(true);
    });

    it("pushOrDecrease with a larger key is a no-op and the node keeps its place", () => {
        const heap = new IndexedMinHeap(4);
        heap.push(0, 1);
        heap.push(1, 2);
        heap.pushOrDecrease(1, 9);
        expect(heap.pop()).toBe(0);
        expect(heap.pop()).toBe(1);
    });

    it("a decrease to the new minimum makes that node pop first", () => {
        const heap = new IndexedMinHeap(4);
        heap.push(0, 1);
        heap.push(1, 2);
        heap.push(2, 3);
        heap.pushOrDecrease(2, 0);
        expect(heap.pop()).toBe(2);
        expect(heap.pop()).toBe(0);
        expect(heap.pop()).toBe(1);
    });
});

describe("arcSourceIn", () => {
    // Three nodes: node 0 owns arcs 0 and 1, node 1's row is EMPTY, node 2 owns arcs 2, 3 and 4.
    const rowPtr = Uint32Array.of(0, 2, 2, 5);

    it("maps every arc to the node whose row contains it", () => {
        expect(arcSourceIn(rowPtr, 0)).toBe(0);
        expect(arcSourceIn(rowPtr, 1)).toBe(0);
        expect(arcSourceIn(rowPtr, 2)).toBe(2);
        expect(arcSourceIn(rowPtr, 3)).toBe(2);
        expect(arcSourceIn(rowPtr, 4)).toBe(2);
    });

    it("never returns a node whose row is empty", () => {
        // This is the case that separates the correct search from the off-by-one one. With
        // `rowPtr[mid] <= arc` instead of `rowPtr[mid + 1] <= arc`, arc 2 walks lo 0 -> 2 -> 3 and
        // returns 3: past the last node here, and a node with an empty row in general. Asserting
        // the PROPERTY rather than the wrong answer keeps the test meaningful on any rowPtr.
        for (let arc = 0; arc < 5; arc++) {
            const u = arcSourceIn(rowPtr, arc);
            expect(u).toBeLessThan(rowPtr.length - 1);
            expect(rowPtr[u]).toBeLessThanOrEqual(arc);
            expect(rowPtr[u + 1]).toBeGreaterThan(arc);
        }
    });

    it("agrees with GraphSnapshot.arcSource on every arc of a fixture", () => {
        const builder = new GraphBuilder({ directed: true });
        for (const id of ["a", "b", "c", "d"]) {
            builder.addNode(id);
        }
        builder.addEdge("a", "b");
        builder.addEdge("a", "c");
        builder.addEdge("c", "d");
        builder.addEdge("d", "a"); // node "b" keeps an empty out-row
        const s = builder.freeze({ label: "arc-source", checksum: true });
        for (let arc = 0; arc < s.arcCount; arc++) {
            expect(arcSourceIn(s.rowPtr, arc)).toBe(s.arcSource(arc));
        }
        s.validate({ checksum: true });
    });
});
