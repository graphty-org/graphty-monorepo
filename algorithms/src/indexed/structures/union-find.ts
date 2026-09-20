import { renumberPartition, type U32 } from "@graphty/graph-format";

/**
 * Index-keyed union-find over `[0, size)` with union by rank and path halving. The legacy
 * `UnionFind` (`src/data-structures/union-find.ts`) is NodeId-keyed and stays where it is.
 * @public
 */
export class IntUnionFind {
    private readonly parent: U32;
    private readonly rank: U32;

    /**
     * Create a union-find whose every element is a singleton set.
     * @param size - The number of elements, each initially its own singleton set
     */
    constructor(size: number) {
        this.parent = new Uint32Array(size);
        this.rank = new Uint32Array(size);
        for (let i = 0; i < size; i++) {
            this.parent[i] = i;
        }
    }

    /**
     * Find the representative of an element's set, halving the path on the way up.
     * @param x - An element index
     * @returns The representative of x's set
     */
    find(x: number): number {
        let node = x;
        while (this.parent[node] !== node) {
            this.parent[node] = this.parent[this.parent[node]]; // path halving
            node = this.parent[node];
        }
        return node;
    }

    /**
     * Merge the sets of two elements, attaching the shallower tree under the deeper one.
     * @param a - An element index
     * @param b - An element index
     * @returns True when the two sets were distinct and have now been merged
     */
    union(a: number, b: number): boolean {
        const ra = this.find(a);
        const rb = this.find(b);
        if (ra === rb) {
            return false;
        }
        if (this.rank[ra] < this.rank[rb]) {
            this.parent[ra] = rb;
        } else if (this.rank[ra] > this.rank[rb]) {
            this.parent[rb] = ra;
        } else {
            this.parent[rb] = ra;
            this.rank[ra]++;
        }
        return true;
    }

    /**
     * Dense labels in FIRST-SEEN order, which is what makes `groups()` identical to the legacy
     * iteration order and identical to the GPU's after its own `renumberPartition` readback
     * (design 9.7's connectedComponents row).
     * @returns The labels and the number of distinct sets
     */
    toLabels(): { readonly labels: U32; readonly count: number } {
        const roots = new Uint32Array(this.parent.length);
        for (let i = 0; i < roots.length; i++) {
            roots[i] = this.find(i);
        }
        return renumberPartition(roots);
    }
}
