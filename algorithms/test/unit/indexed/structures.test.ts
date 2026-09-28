import { GraphBuilder, maskToIndices } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { arcSourceIn } from "../../../src/indexed/structures/arc-source.js";
import { BitSet } from "../../../src/indexed/structures/bit-set.js";
import { IndexedMaxHeap } from "../../../src/indexed/structures/max-heap.js";
import { IndexedMinHeap } from "../../../src/indexed/structures/min-heap.js";
import { RingQueue } from "../../../src/indexed/structures/ring-queue.js";
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
    it("refuses a node index outside its capacity", () => {
        const heap = new IndexedMinHeap(4);
        expect(() => heap.push(4, 0)).toThrow(RangeError);
        expect(() => heap.push(-1, 0)).toThrow(RangeError);
    });

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

    it("peekKey reports the smallest key without popping, and Infinity when empty", () => {
        const heap = new IndexedMinHeap(4);
        expect(heap.peekKey()).toBe(Infinity);
        heap.push(0, 3);
        heap.push(1, 2);
        expect(heap.peekKey()).toBe(2);
        heap.pushOrDecrease(0, 1);
        expect(heap.peekKey()).toBe(1);
        expect(heap.pop()).toBe(0);
        expect(heap.peekKey()).toBe(2);
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

describe("IndexedMinHeap has / keyOf", () => {
    it("reports membership and the current key, and forgets a popped node", () => {
        const heap = new IndexedMinHeap(3);
        expect(heap.has(1)).toBe(false);
        heap.push(1, 4);
        heap.pushOrDecrease(1, 2);
        expect(heap.has(1)).toBe(true);
        expect(heap.keyOf(1)).toBe(2);
        heap.pop();
        expect(heap.has(1)).toBe(false);
    });
});

describe("IndexedMaxHeap", () => {
    it("pops in descending key order", () => {
        const heap = new IndexedMaxHeap(5);
        [3, 1, 4, 0, 2].forEach((key, node) => {
            heap.push(node, key);
        });
        const popped: number[] = [];
        while (!heap.isEmpty()) {
            popped.push(heap.pop());
        }
        expect(popped).toEqual([2, 0, 4, 1, 3]);
    });

    it("pushOrIncrease inserts, raises, and ignores a smaller key", () => {
        const heap = new IndexedMaxHeap(3);
        heap.pushOrIncrease(0, 1);
        heap.pushOrIncrease(1, 2);
        heap.pushOrIncrease(0, 5); // raise: node 0 now leads
        heap.pushOrIncrease(1, 0); // smaller: ignored
        expect(heap.keyOf(0)).toBe(5);
        expect(heap.keyOf(1)).toBe(2);
        expect(heap.pop()).toBe(0);
        expect(heap.has(0)).toBe(false);
        expect(heap.pop()).toBe(1);
        expect(heap.isEmpty()).toBe(true);
    });

    it("accumulates the way a maximum-adjacency ordering does", () => {
        // Stoer-Wagner's phase: every node starts at 0 and gains the weight of each edge to the
        // growing set; the most tightly connected node leaves next.
        const heap = new IndexedMaxHeap(3);
        for (let v = 0; v < 3; v++) {
            heap.push(v, 0);
        }
        heap.pushOrIncrease(2, heap.keyOf(2) + 0.1);
        heap.pushOrIncrease(2, heap.keyOf(2) + 0.2);
        heap.pushOrIncrease(1, heap.keyOf(1) + 0.3);
        expect(heap.keyOf(2)).toBe(0.1 + 0.2); // exact f64, no rounding through f32
        expect(heap.pop()).toBe(2);
    });

    it("is usable at capacity zero", () => {
        expect(new IndexedMaxHeap(0).isEmpty()).toBe(true);
    });

    it("pops equal keys lowest index first, whatever the push order", () => {
        const heap = new IndexedMaxHeap(6);
        for (const node of [5, 3, 0, 4, 1, 2]) {
            heap.push(node, node % 2 === 0 ? 7 : 1);
        }
        heap.pushOrIncrease(5, 7); // now ties with 0, 2 and 4
        const popped: number[] = [];
        while (!heap.isEmpty()) {
            popped.push(heap.pop());
        }
        expect(popped).toEqual([0, 2, 4, 5, 1, 3]);
    });
});

describe("RingQueue", () => {
    it("is first in, first out", () => {
        const q = new RingQueue(4);
        q.push(3);
        q.push(1);
        q.push(2);
        expect(q.size).toBe(3);
        expect(q.shift()).toBe(3);
        expect(q.shift()).toBe(1);
        expect(q.shift()).toBe(2);
        expect(q.isEmpty()).toBe(true);
    });

    it("wraps around its buffer without losing order", () => {
        const q = new RingQueue(3);
        const out: number[] = [];
        for (let i = 0; i < 10; i++) {
            q.push(i);
            if (q.size === 3) {
                out.push(q.shift(), q.shift());
            }
        }
        while (!q.isEmpty()) {
            out.push(q.shift());
        }
        expect(out).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it("throws on overflow and on underflow instead of corrupting the order", () => {
        const q = new RingQueue(1);
        q.push(0);
        expect(() => {
            q.push(1);
        }).toThrow(RangeError);
        q.shift();
        expect(() => q.shift()).toThrow(RangeError);
    });

    it("clear empties it for reuse", () => {
        const q = new RingQueue(2);
        q.push(5);
        q.clear();
        expect(q.isEmpty()).toBe(true);
        q.push(6);
        q.push(7);
        expect(q.shift()).toBe(6);
    });

    it("is usable at capacity zero", () => {
        const q = new RingQueue(0);
        expect(q.isEmpty()).toBe(true);
        expect(() => {
            q.push(0);
        }).toThrow(RangeError);
    });
});

describe("BitSet", () => {
    it("adds, tests and deletes bits across word boundaries", () => {
        const bits = new BitSet(70);
        for (const i of [0, 31, 32, 69]) {
            bits.add(i);
        }
        expect(bits.has(31)).toBe(true);
        expect(bits.has(33)).toBe(false);
        expect(bits.count()).toBe(4);
        bits.delete(32);
        expect(bits.has(32)).toBe(false);
        expect([...bits.toIndices()]).toEqual([0, 31, 69]);
    });

    it("exposes its words as a graph-format mask", () => {
        const bits = new BitSet(40);
        bits.add(3);
        bits.add(35);
        expect(bits.words).toHaveLength(2);
        expect([...maskToIndices(bits.words, 40)]).toEqual([3, 35]);
    });

    it("clear drops every bit", () => {
        const bits = new BitSet(10);
        bits.add(9);
        bits.clear();
        expect(bits.count()).toBe(0);
        expect(bits.has(9)).toBe(false);
    });

    it("is usable at length zero", () => {
        const bits = new BitSet(0);
        expect(bits.count()).toBe(0);
        expect(bits.toIndices()).toHaveLength(0);
    });
});
