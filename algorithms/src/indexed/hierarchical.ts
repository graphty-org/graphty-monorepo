import { type AdjacencyView, INVALID_INDEX } from "@graphty/graph-format";

import { allocDense, withCode } from "../errors.js";
import { type LabelResult, withGroups } from "./components.js";
import { IntUnionFind } from "./structures/union-find.js";

/** How the distance between two clusters is taken from their members' hop distances. @public */
export type Linkage = "single" | "complete" | "average" | "ward";

/** Options of the index-based hierarchical clustering. @public */
export interface HierarchicalOptions {
    /** Cluster distance: the minimum, maximum or mean member distance, or Ward's scaled mean; default single. */
    readonly linkage?: Linkage | undefined;
    /**
     * Refuse a graph of more nodes than this before allocating its n x n matrices (28 n^2 bytes), with a RangeError
     * of code `E_TOO_LARGE` and `params` `{ nodeCount, maxNodes, bytes }`. Default: no bound.
     */
    readonly maxNodes?: number | undefined;
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
    /**
     * The flat partition after the first merges: with `clusters: k`, the first `nodeCount - k` merges, so exactly
     * `k` clusters remain; with `distance: d`, the merges in order up to the first whose distance exceeds `d`.
     * @param by - The cluster count, from `roots.length` to `nodeCount`, or the largest merge distance to apply
     * @throws RangeError (code `E_BAD_OPTION`) for a cluster count outside that range or a NaN distance
     */
    cutAt(by: { readonly clusters: number } | { readonly distance: number }): LabelResult;
}

/**
 * Hop distances from every node, over out-arcs: `nodeCount * nodeCount` entries, `INVALID_INDEX`
 * where no path exists.
 * @param s - The adjacency
 * @param hops - The n x n matrix to fill, row-major
 */
function hopMatrix(s: AdjacencyView, hops: Uint32Array): void {
    const n = s.nodeCount;
    hops.fill(INVALID_INDEX);
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
 * Per ordered pair of cluster SLOTS, the min, max, sum and count of the member hop distances from
 * the first to the second, and per cluster its slot, size and legacy id rank. A merge reuses its
 * first child's slot.
 */
interface Aggregates {
    readonly n: number;
    readonly linkage: Linkage;
    readonly min: Uint32Array;
    readonly max: Uint32Array;
    readonly sum: Float64Array;
    readonly count: Float64Array;
    readonly slot: Uint32Array;
    readonly size: Float64Array;
    readonly rank: Uint32Array;
}

/**
 * The linkage distance from one cluster to another, as the legacy clusterDistance(x, y).
 * @param g - The aggregates
 * @param x - The cluster the member distances start from
 * @param y - The cluster they end at
 * @returns The distance, Infinity when no member of y is reachable from x
 */
function link(g: Aggregates, x: number, y: number): number {
    const at = g.slot[x] * g.n + g.slot[y];
    const c = g.count[at];
    if (c === 0) {
        return Infinity;
    }
    switch (g.linkage) {
        case "single":
            return g.min[at];
        case "complete":
            return g.max[at];
        case "average":
            return g.sum[at] / c;
        default:
            return (g.sum[at] / c) * ((g.size[x] * g.size[y]) / (g.size[x] + g.size[y]));
    }
}

/**
 * The distance the legacy function stores for a pair: a leaf pair's from the lower node to the
 * higher, a pair involving a merge from the later-created cluster to the earlier one.
 * @param g - The aggregates
 * @param x - One cluster
 * @param y - The other
 * @returns The stored distance
 */
function pairDistance(g: Aggregates, x: number, y: number): number {
    const early = Math.min(x, y);
    const late = Math.max(x, y);
    return late < g.n ? link(g, early, late) : link(g, late, early);
}

/**
 * The closest linked pair of active clusters, ties broken by the legacy id ranks.
 * @param g - The aggregates
 * @param active - The active clusters in the legacy Set's order
 * @returns The pair and its distance; `a` is -1 when no pair is linked
 */
function closestPair(g: Aggregates, active: readonly number[]): { best: number; a: number; b: number } {
    let best = Infinity;
    let a = -1;
    let b = -1;
    for (const x of active) {
        for (const y of active) {
            if (g.rank[x] >= g.rank[y]) {
                continue;
            }
            const d = pairDistance(g, x, y);
            if (d < best) {
                best = d;
                a = x;
                b = y;
            }
        }
    }
    return { best, a, b };
}

/**
 * Combine two pair aggregates into a third.
 * @param g - The aggregates
 * @param to - The entry to write
 * @param from1 - One source entry
 * @param from2 - The other source entry
 */
function combine(g: Aggregates, to: number, from1: number, from2: number): void {
    const { min, max, sum, count } = g;
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

/**
 * Fold cluster b's aggregates against every other active cluster into a's slot, both directions.
 * @param g - The aggregates
 * @param active - The active clusters
 * @param a - The first merged cluster, whose slot the merge keeps
 * @param b - The second merged cluster
 */
function mergeAggregates(g: Aggregates, active: readonly number[], a: number, b: number): void {
    const { n } = g;
    const sa = g.slot[a];
    const sb = g.slot[b];
    for (const x of active) {
        if (x === a || x === b) {
            continue;
        }
        const sx = g.slot[x];
        combine(g, sa * n + sx, sa * n + sx, sb * n + sx);
        combine(g, sx * n + sa, sx * n + sa, sx * n + sb);
    }
}

/**
 * The node indices of a cluster, left subtree first.
 * @param n - Node count
 * @param left - First cluster of every merge
 * @param right - Second cluster of every merge
 * @param cluster - A cluster index
 * @returns The members
 */
function clusterMembers(n: number, left: Uint32Array, right: Uint32Array, cluster: number): Uint32Array {
    if (!(cluster >= 0 && cluster < n + left.length)) {
        throw withCode(new RangeError(`cluster ${cluster} is not in [0, ${n + left.length})`), "E_BAD_OPTION");
    }
    const out: number[] = [];
    const stack = [cluster];
    while (stack.length > 0) {
        const c = stack.pop() as number;
        if (c < n) {
            out.push(c);
        } else {
            stack.push(right[c - n], left[c - n]);
        }
    }
    return Uint32Array.from(out);
}

/**
 * How many merges `cutAt` applies.
 * @param by - The cluster count or the largest merge distance
 * @param n - Node count
 * @param rootCount - Number of roots
 * @param distances - Distance of every merge
 * @returns The merge count
 */
function mergesToTake(
    by: { readonly clusters: number } | { readonly distance: number },
    n: number,
    rootCount: number,
    distances: Float64Array,
): number {
    if ("clusters" in by) {
        const k = by.clusters;
        if (!Number.isInteger(k) || k < rootCount || k > n) {
            throw withCode(
                new RangeError(`clusters must be an integer in [${rootCount}, ${n}], got ${k}`),
                "E_BAD_OPTION",
            );
        }
        return n - k;
    }
    if (Number.isNaN(by.distance)) {
        throw withCode(new RangeError("distance must not be NaN"), "E_BAD_OPTION");
    }
    let take = 0;
    while (take < distances.length && distances[take] <= by.distance) {
        take++;
    }
    return take;
}

/**
 * Wrap the merges in the result object with its member, cut and flat-partition queries.
 * @param n - Node count
 * @param leftArr - First cluster of every merge
 * @param rightArr - Second cluster of every merge
 * @param distances - Distance of every merge
 * @param height - Height of every possible cluster
 * @param roots - The clusters left unmerged
 * @returns The dendrogram
 */
function dendrogram(
    n: number,
    leftArr: Uint32Array,
    rightArr: Uint32Array,
    distances: Float64Array,
    height: Uint32Array,
    roots: Uint32Array,
): HierarchicalResult {
    const merges = leftArr.length;
    const members = (cluster: number): Uint32Array => clusterMembers(n, leftArr, rightArr, cluster);
    // a node of every merged cluster, to union the merges over nodes
    const leaf = new Uint32Array(merges);
    for (let k = 0; k < merges; k++) {
        leaf[k] = leftArr[k] < n ? leftArr[k] : leaf[leftArr[k] - n];
    }
    const leafOf = (c: number): number => (c < n ? c : leaf[c - n]);
    return {
        nodeCount: n,
        left: leftArr,
        right: rightArr,
        distance: distances,
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
        cutAt(by): LabelResult {
            const take = mergesToTake(by, n, roots.length, distances);
            const uf = new IntUnionFind(n);
            for (let k = 0; k < take; k++) {
                uf.union(leafOf(leftArr[k]), leafOf(rightArr[k]));
            }
            const { labels, count } = uf.toLabels();
            return withGroups(labels, count);
        },
    };
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
        throw withCode(new RangeError(`unknown linkage "${linkage}"`), "E_BAD_OPTION");
    }
    const n = s.nodeCount;
    const { hops, min, max, sum, count } = allocDense(
        "hierarchicalClustering",
        n,
        options.maxNodes,
        28 * n * n,
        () => ({
            hops: new Uint32Array(n * n),
            min: new Uint32Array(n * n),
            max: new Uint32Array(n * n),
            sum: new Float64Array(n * n),
            count: new Float64Array(n * n),
        }),
    );
    hopMatrix(s, hops);
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
    const g: Aggregates = {
        n,
        linkage,
        min,
        max,
        sum,
        count,
        slot: new Uint32Array(total),
        size: new Float64Array(total),
        rank: legacyIdRanks(n),
    };
    const height = new Uint32Array(total);
    for (let i = 0; i < n; i++) {
        g.slot[i] = i;
        g.size[i] = 1;
    }
    const left: number[] = [];
    const right: number[] = [];
    const distance: number[] = [];

    // Active clusters in the legacy Set's insertion order: the nodes, then each merge appended.
    let active: number[] = Array.from({ length: n }, (_, i) => i);
    while (active.length > 1) {
        const { best, a, b } = closestPair(g, active);
        if (a < 0) {
            break; // no linked pair left: the rest stay separate roots
        }
        const created = n + left.length;
        left.push(a);
        right.push(b);
        distance.push(best);
        height[created] = Math.max(height[a], height[b]) + 1;
        g.size[created] = g.size[a] + g.size[b];
        mergeAggregates(g, active, a, b);
        g.slot[created] = g.slot[a];
        active = active.filter((x) => x !== a && x !== b);
        active.push(created);
    }
    return dendrogram(
        n,
        Uint32Array.from(left),
        Uint32Array.from(right),
        Float64Array.from(distance),
        height,
        Uint32Array.from(active),
    );
}
