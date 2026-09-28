import { IndexedMinHeap } from "./min-heap.js";

/**
 * A binary max-heap over node indices with O(log n) increase-key: an {@link IndexedMinHeap} over
 * negated keys. Negation is exact in f64, so keys come back bit-for-bit. Stoer-Wagner's
 * maximum-adjacency ordering is the caller it exists for: every node starts at 0 and gains the
 * weight of each edge to the growing set, `pushOrIncrease(v, keyOf(v) + w)`.
 * @public
 */
export class IndexedMaxHeap {
    private readonly min: IndexedMinHeap;

    /**
     * Create an empty heap over node indices in `[0, capacity)`.
     * @param capacity - The number of distinct node indices the heap may hold
     */
    constructor(capacity: number) {
        this.min = new IndexedMinHeap(capacity);
    }

    /**
     * Whether the heap holds no entries.
     * @returns True when the heap holds no entries
     */
    isEmpty(): boolean {
        return this.min.isEmpty();
    }

    /**
     * Whether a node is currently in the heap.
     * @param node - The node index
     * @returns True when the node was pushed and has not been popped since
     */
    has(node: number): boolean {
        return this.min.has(node);
    }

    /**
     * The key a node was last given. Meaningful only while `has(node)` is true.
     * @param node - The node index
     * @returns Its key
     */
    keyOf(node: number): number {
        return -this.min.keyOf(node);
    }

    /**
     * Insert a node that is not in the heap.
     * @param node - The node index
     * @param key - Its key
     */
    push(node: number, key: number): void {
        this.min.push(node, -key);
    }

    /**
     * Insert the node, or raise its key if it is already present and the new key is larger.
     * @param node - The node index
     * @param key - Its candidate key
     */
    pushOrIncrease(node: number, key: number): void {
        this.min.pushOrDecrease(node, -key);
    }

    /**
     * Remove and return the node with the largest key. Undefined behaviour on an empty heap;
     * callers guard with `isEmpty()`.
     * @returns The node index
     */
    pop(): number {
        return this.min.pop();
    }
}
