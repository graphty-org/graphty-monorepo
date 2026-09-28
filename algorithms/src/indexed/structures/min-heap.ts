import { type F64, INVALID_INDEX, type U32 } from "@graphty/graph-format";

/**
 * A binary min-heap over node indices with O(log n) decrease-key, keyed by `Float64Array` values
 * (graph-format design 14.2, `graph-format-design.md:3771`). `pushOrDecrease` is the only operation
 * Dijkstra's inner loop needs: it inserts an absent node and decreases a present one, so the heap
 * never holds a stale duplicate and `pop()` needs no "is this entry current" check.
 * @public
 */
export class IndexedMinHeap {
    private readonly heap: U32; // slot -> node
    private readonly slot: U32; // node -> slot, INVALID_INDEX when absent
    private readonly key: F64; // node -> key
    private readonly tieBreakByIndex: boolean;
    private size = 0;

    /**
     * Create an empty heap over node indices in `[0, capacity)`.
     * @param capacity - The number of distinct node indices the heap may hold
     * @param tieBreakByIndex - When true, of two equal keys the lower node index pops first, so
     * the pop order is fully determined by the keys; when false (the default) equal keys pop in
     * an order that depends on the push history
     */
    constructor(capacity: number, tieBreakByIndex = false) {
        this.tieBreakByIndex = tieBreakByIndex;
        this.heap = new Uint32Array(capacity);
        this.slot = new Uint32Array(capacity).fill(INVALID_INDEX);
        this.key = new Float64Array(capacity);
    }

    /**
     * Whether the heap holds no entries.
     * @returns True when the heap holds no entries
     */
    isEmpty(): boolean {
        return this.size === 0;
    }

    /**
     * Whether a node is currently in the heap.
     * @param node - The node index
     * @returns True when the node was pushed and has not been popped since
     */
    has(node: number): boolean {
        return this.slot[node] !== INVALID_INDEX;
    }

    /**
     * The key a node was last given. Meaningful only while `has(node)` is true.
     * @param node - The node index
     * @returns Its key
     */
    keyOf(node: number): number {
        return this.key[node];
    }

    /**
     * Insert a node that is not in the heap.
     * @param node - The node index
     * @param key - Its key
     */
    push(node: number, key: number): void {
        this.key[node] = key;
        this.heap[this.size] = node;
        this.slot[node] = this.size;
        this.size++;
        this.siftUp(this.size - 1);
    }

    /**
     * Insert the node, or lower its key if it is already present and the new key is smaller.
     * @param node - The node index
     * @param key - Its candidate key
     */
    pushOrDecrease(node: number, key: number): void {
        const at = this.slot[node];
        if (at === INVALID_INDEX) {
            this.push(node, key);
            return;
        }
        if (key < this.key[node]) {
            this.key[node] = key;
            this.siftUp(at);
        }
    }

    /**
     * Remove and return the node with the smallest key. Undefined behaviour on an empty heap;
     * callers guard with `isEmpty()`.
     * @returns The node index
     */
    pop(): number {
        const top = this.heap[0];
        this.slot[top] = INVALID_INDEX;
        this.size--;
        if (this.size > 0) {
            const moved = this.heap[this.size];
            this.heap[0] = moved;
            this.slot[moved] = 0;
            this.siftDown(0);
        }
        return top;
    }

    /**
     * Whether node `a` pops before node `b`.
     * @param a - A node index in the heap
     * @param b - A node index in the heap
     * @returns True when a's key is smaller, or equal with the tie-break on and a lower index
     */
    private before(a: number, b: number): boolean {
        const ka = this.key[a];
        const kb = this.key[b];
        return ka < kb || (this.tieBreakByIndex && ka === kb && a < b);
    }

    private siftUp(from: number): void {
        let at = from;
        const node = this.heap[at];
        while (at > 0) {
            const parent = (at - 1) >> 1;
            const parentNode = this.heap[parent];
            if (!this.before(node, parentNode)) {
                break;
            }
            this.heap[at] = parentNode;
            this.slot[parentNode] = at;
            at = parent;
        }
        this.heap[at] = node;
        this.slot[node] = at;
    }

    private siftDown(from: number): void {
        let at = from;
        const node = this.heap[at];
        for (;;) {
            const left = 2 * at + 1;
            if (left >= this.size) {
                break;
            }
            const right = left + 1;
            const child = right < this.size && this.before(this.heap[right], this.heap[left]) ? right : left;
            const childNode = this.heap[child];
            if (!this.before(childNode, node)) {
                break;
            }
            this.heap[at] = childNode;
            this.slot[childNode] = at;
            at = child;
        }
        this.heap[at] = node;
        this.slot[node] = at;
    }
}
