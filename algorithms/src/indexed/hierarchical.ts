import { type AdjacencyView, INVALID_INDEX } from "@graphty/graph-format";

/** How the distance between two clusters is taken from their members' hop distances. @public */
export type Linkage = "single" | "complete" | "average" | "ward";

/** Options of the index-based hierarchical clustering. @public */
export interface HierarchicalOptions {
    /** Cluster distance: the minimum, maximum or mean member distance, or Ward's scaled mean; default single. */
    readonly linkage?: Linkage | undefined;
}

/**
 * The dendrogram of an agglomerative clustering. Clusters `0 .. nodeCount - 1` are the nodes
 * themselves; merge `k` creates cluster `nodeCount + k` from `left[k]` and `right[k]`.
 * @public
 */
export interface HierarchicalResult {
    /** The node count the clustering ran over. */
    readonly nodeCount: number;
    /** First cluster of every merge. */
    readonly left: Uint32Array;
    /** Second cluster of every merge. */
    readonly right: Uint32Array;
    /** Linkage distance of every merge. */
    readonly distance: Float64Array;
    /** Height of every cluster: 0 for a node, one more than its taller child for a merge. */
    readonly height: Uint32Array;
    /**
     * The clusters left unmerged, in the order the legacy function lists its forest's trees: one
     * entry (the last merge) when every pair of nodes could be linked, one per disconnected part
     * otherwise, and none for an empty snapshot.
     */
    readonly roots: Uint32Array;
    /**
     * The node indices of a cluster, left subtree first -- the order the legacy function's member
     * Sets iterate in.
     * @param cluster - A cluster index
     */
    members(cluster: number): Uint32Array;
    /**
     * Cut every root at `height`: a cluster no taller than `height` is kept whole, a taller one is
     * replaced by its two children. The clusters come in left-to-right order, root by root.
     * @param height - The cut height
     */
    cut(height: number): Uint32Array[];
}

/**
 * Hop distances from every node, over out-arcs: `nodeCount * nodeCount` entries, `INVALID_INDEX`
 * where no path exists.
 * @param s - The adjacency
 * @returns The row-major hop matrix
 */
function hopMatrix(s: AdjacencyView): Uint32Array {
    const n = s.nodeCount;
    const hops = new Uint32Array(n * n).fill(INVALID_INDEX);
    const queue = new Uint32Array(n);
    for (let start = 0; start < n; start++) {
        const row = start * n;
        hops[row + start] = 0;
        queue[0] = start;
        let head = 0;
        let tail = 1;
        while (head < tail) {
            const u = queue[head++];
            const next = hops[row + u] + 1;
            const end = s.rowPtr[u + 1];
            for (let a = s.rowPtr[u]; a < end; a++) {
                const v = s.colIdx[a];
                if (hops[row + v] === INVALID_INDEX) {
                    hops[row + v] = next;
                    queue[tail++] = v;
                }
            }
        }
    }
    return hops;
}

/**
 * The rank of every cluster's legacy id string (`leaf-<i>` for a node, `cluster-<k>` for a merge),
 * in string order. The legacy function breaks distance ties by comparing those strings, so the port
 * compares these ranks to make the same merges.
 * @param n - Node count
 * @returns One rank per possible cluster, `2n - 1` of them
 */
function legacyIdRanks(n: number): Uint32Array {
    const total = Math.max(0, 2 * n - 1);
    const names = Array.from({ length: total }, (_, c) => (c < n ? `leaf-${c}` : `cluster-${c}`));
    // Code-unit order, as the legacy `>=` on strings compares; localeCompare would not.
    const order = Array.from({ length: total }, (_, c) => c).sort(
        (a, b) => Number(names[a] > names[b]) - Number(names[a] < names[b]),
    );
    const rank = new Uint32Array(total);
    order.forEach((c, r) => (rank[c] = r));
    return rank;
}

/**
 * Agglomerative hierarchical clustering over hop distances, the index-based port of the legacy
 * `hierarchicalClustering`: every node starts as its own cluster and the closest pair is merged
 * until one cluster remains or no remaining pair is linked by a path.
 *
 * The distance between two nodes is the BFS hop count over out-arcs (weights are ignored, as the
 * legacy function ignores them); an unreachable pair has none and is left out of every linkage.
 * The distance between two clusters over the member pairs that have one is their minimum
 * (`single`), maximum (`complete`), mean (`average`), or mean times `|A| |B| / (|A| + |B|)`
 * (`ward`). A pair with no connected member pair is never merged. On a directed snapshot the
 * distance is taken in one direction, and which one follows the legacy function exactly, as do the
 * tie-breaks: the merges, their order and their distances equal the legacy function's.
 *
 * One difference in what the result offers: `cut` descends into every root of a disconnected
 * snapshot, where the legacy `clusters` map lists all nodes as one cluster at every height (its
 * forest node has no children, so its cut never splits it).
 *
 * O(n^2) memory for the distance aggregates and O(n^3) time for the pair search; the legacy
 * function is the same order with Map and Set per step.
 * @param s - Any snapshot or adjacency view
 * @param options - The linkage
 * @returns The dendrogram
 * @public
 */
export function hierarchicalClustering(s: AdjacencyView, options: HierarchicalOptions = {}): HierarchicalResult {
    const linkage = options.linkage ?? "single";
    if (!["single", "complete", "average", "ward"].includes(linkage)) {
        throw new RangeError(`unknown linkage "${linkage}"`);
    }
    const n = s.nodeCount;
    const hops = hopMatrix(s);
    // Per ordered pair of cluster SLOTS: the min, max, sum and count of the member hop distances
    // from the first to the second. A merge reuses its first child's slot.
    const min = new Uint32Array(n * n);
    const max = new Uint32Array(n * n);
    const sum = new Float64Array(n * n);
    const count = new Float64Array(n * n);
    for (let i = 0; i < n * n; i++) {
        const h = hops[i];
        if (h !== INVALID_INDEX) {
            min[i] = h;
            max[i] = h;
            sum[i] = h;
            count[i] = 1;
        }
    }

    const total = Math.max(0, 2 * n - 1);
    const rank = legacyIdRanks(n);
    const slot = new Uint32Array(total);
    const size = new Float64Array(total);
    const height = new Uint32Array(total);
    for (let i = 0; i < n; i++) {
        slot[i] = i;
        size[i] = 1;
    }
    const left: number[] = [];
    const right: number[] = [];
    const distance: number[] = [];

    /**
     * The linkage distance from one cluster to another, as the legacy clusterDistance(x, y).
     * @param x - The cluster the member distances start from
     * @param y - The cluster they end at
     * @returns The distance, Infinity when no member of y is reachable from x
     */
    const link = (x: number, y: number): number => {
        const at = slot[x] * n + slot[y];
        const c = count[at];
        if (c === 0) {
            return Infinity;
        }
        switch (linkage) {
            case "single":
                return min[at];
            case "complete":
                return max[at];
            case "average":
                return sum[at] / c;
            default:
                return (sum[at] / c) * ((size[x] * size[y]) / (size[x] + size[y]));
        }
    };
    /**
     * The distance the legacy function stores for a pair: a leaf pair's from the lower node to the
     * higher, a pair involving a merge from the later-created cluster to the earlier one.
     * @param x - One cluster
     * @param y - The other
     * @returns The stored distance
     */
    const pairDistance = (x: number, y: number): number => {
        const [early, late] = x < y ? [x, y] : [y, x];
        return late < n ? link(early, late) : link(late, early);
    };

    // Active clusters in the legacy Set's insertion order: the nodes, then each merge appended.
    let active: number[] = Array.from({ length: n }, (_, i) => i);
    while (active.length > 1) {
        let best = Infinity;
        let a = -1;
        let b = -1;
        for (const x of active) {
            for (const y of active) {
                if (rank[x] >= rank[y]) {
                    continue;
                }
                const d = pairDistance(x, y);
                if (d < best) {
                    best = d;
                    a = x;
                    b = y;
                }
            }
        }
        if (a < 0) {
            break; // no linked pair left: the rest stay separate roots
        }
        const created = n + left.length;
        left.push(a);
        right.push(b);
        distance.push(best);
        height[created] = Math.max(height[a], height[b]) + 1;
        size[created] = size[a] + size[b];
        const sa = slot[a];
        const sb = slot[b];
        for (const x of active) {
            if (x === a || x === b) {
                continue;
            }
            const sx = slot[x];
            for (const [to, from1, from2] of [
                [sa * n + sx, sa * n + sx, sb * n + sx],
                [sx * n + sa, sx * n + sa, sx * n + sb],
            ]) {
                const c1 = count[from1];
                const c2 = count[from2];
                // An empty aggregate's min and max are meaningless: take the other side's.
                if (c1 === 0 || c2 === 0) {
                    const from = c1 === 0 ? from2 : from1;
                    min[to] = min[from];
                    max[to] = max[from];
                } else {
                    min[to] = Math.min(min[from1], min[from2]);
                    max[to] = Math.max(max[from1], max[from2]);
                }
                sum[to] = sum[from1] + sum[from2];
                count[to] = c1 + c2;
            }
        }
        slot[created] = sa;
        active = active.filter((x) => x !== a && x !== b);
        active.push(created);
    }

    const merges = left.length;
    const leftArr = Uint32Array.from(left);
    const rightArr = Uint32Array.from(right);
    const members = (cluster: number): Uint32Array => {
        if (!(cluster >= 0 && cluster < n + merges)) {
            throw new RangeError(`cluster ${cluster} is not in [0, ${n + merges})`);
        }
        const out: number[] = [];
        const stack = [cluster];
        while (stack.length > 0) {
            const c = stack.pop() as number;
            if (c < n) {
                out.push(c);
            } else {
                stack.push(rightArr[c - n], leftArr[c - n]);
            }
        }
        return Uint32Array.from(out);
    };
    const roots = Uint32Array.from(active);
    return {
        nodeCount: n,
        left: leftArr,
        right: rightArr,
        distance: Float64Array.from(distance),
        height: height.slice(0, n + merges),
        roots,
        members,
        cut(h: number): Uint32Array[] {
            const out: Uint32Array[] = [];
            const visit = (c: number): void => {
                if (c < n || height[c] <= h) {
                    out.push(members(c));
                } else {
                    visit(leftArr[c - n]);
                    visit(rightArr[c - n]);
                }
            };
            roots.forEach(visit);
            return out;
        },
    };
}
