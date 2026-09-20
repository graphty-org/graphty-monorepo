/**
 * The CPU reference of `connectedComponents` (spec 8.3, 9.7, 11.3): union-find (union by size, full path
 * compression) over `edgeList()`, which yields every logical edge once in declared orientation, so directed and
 * undirected input are both treated weakly -- exactly what the GPU's each-edge-once link round sees. The roots are
 * then renumbered in first-seen index order, the same first-seen order `renumberPartition` uses, so the GPU labels
 * must be IDENTICAL, not merely partition-equal. `partitionEquals` is the weaker check a test uses to tell "wrong
 * partition" from "right partition, wrong names" (the `renumber: false` leg).
 */

import { type GraphSnapshot, type U32 } from "@graphty/graph-format";

/**
 * Weakly connected components by union-find over the edge list, labels dense in first-seen index order.
 * @param s - the snapshot
 * @returns the labels (index-aligned) and the component count
 */
export function componentsOracle(s: GraphSnapshot): { readonly labels: U32; readonly count: number } {
    const n = s.nodeCount;
    const parent = new Uint32Array(n);
    const size = new Uint32Array(n).fill(1);
    for (let v = 0; v < n; v++) {
        parent[v] = v;
    }
    const find = (v: number): number => {
        let root = v;
        while (parent[root] !== root) {
            root = parent[root];
        }
        while (parent[v] !== root) {
            const next = parent[v];
            parent[v] = root;
            v = next;
        }
        return root;
    };
    if (s.arcCount > 0) {
        const { src, dst } = s.edgeList();
        for (let e = 0; e < src.length; e++) {
            let a = find(src[e]);
            let b = find(dst[e]);
            if (a === b) {
                continue;
            }
            if (size[a] < size[b]) {
                [a, b] = [b, a];
            }
            parent[b] = a;
            size[a] += size[b];
        }
    }
    const labels = new Uint32Array(n);
    const dense = new Uint32Array(n).fill(0xffffffff);
    let count = 0;
    for (let v = 0; v < n; v++) {
        const root = find(v);
        if (dense[root] === 0xffffffff) {
            dense[root] = count++;
        }
        labels[v] = dense[root];
    }
    return { labels, count };
}

/**
 * Whether two label arrays describe the same partition (the same blocks, whatever the block names).
 * @param a - one labelling
 * @param b - the other labelling
 * @returns true when the labels are a bijection of each other
 */
export function partitionEquals(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
    if (a.length !== b.length) {
        return false;
    }
    const ab = new Map<number, number>();
    const ba = new Map<number, number>();
    for (let i = 0; i < a.length; i++) {
        const x = a[i];
        const y = b[i];
        const seenY = ab.get(x);
        const seenX = ba.get(y);
        if ((seenY !== undefined && seenY !== y) || (seenX !== undefined && seenX !== x)) {
            return false;
        }
        ab.set(x, y);
        ba.set(y, x);
    }
    return true;
}
