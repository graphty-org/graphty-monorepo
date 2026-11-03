import { type F64, type GraphSnapshot, renumberPartition, type U32 } from "@graphty/graph-format";

import { allocDense, withCode } from "../errors.js";
import { type LabelResult, withGroups } from "./components.js";

/** Options of the index-based TeraHAC, matching the legacy `teraHAC`. @public */
export interface TeraHacOptions {
    /**
     * How the distance between two clusters is read from their members' pairwise distances: the
     * minimum, the maximum, the mean, or (`"ward"`) the mean of the squares; default `"average"`.
     */
    readonly linkage?: "single" | "complete" | "average" | "ward" | undefined;
    /** Stop merging at this many clusters; a positive integer. Default: merge until one is left. */
    readonly numClusters?: number | undefined;
    /** Stop at the first merge whose linkage distance is above this. Default: no threshold. */
    readonly distanceThreshold?: number | undefined;
    /**
     * Pairwise distance: hop count along out-arcs (true, the default), or 1 for an arc from the
     * lower to the higher node index and 2 for none (false).
     */
    readonly useGraphDistance?: boolean | undefined;
    /**
     * Refuse a graph of more nodes than this before allocating the n x n distance matrix (8 n^2 bytes), with a
     * RangeError of code `E_TOO_LARGE` and `params` `{ nodeCount, maxNodes, bytes }`. Default: no bound.
     */
    readonly maxNodes?: number | undefined;
}

/**
 * Result of the index-based TeraHAC: the flat clustering plus the dendrogram. Dendrogram node
 * `i < n` is node index i; node `n + k` is the k-th join, with children `left[k]` and `right[k]`.
 * @public
 */
export interface TeraHacResult extends LabelResult {
    /** Left child of each join (the legacy `ClusterNode.left`). */
    readonly left: U32;
    /** Right child of each join. */
    readonly right: U32;
    /** Linkage distance of each join; Infinity for the joins that tie the remaining clusters under one root. */
    readonly distance: F64;
    /** Node count under each join. */
    readonly size: U32;
    /** Joins made by distance: `distance.subarray(0, merges)` is the legacy `distances` list. */
    readonly merges: number;
    /** The dendrogram root: `2n - 2`, or 0 for a single node. */
    readonly root: number;
}

/** The distance legacy gives an unreachable pair, so that disconnected clusters still merge last. */
const UNREACHABLE = 100;

/**
 * All-pairs distances into a row-major n x n matrix: BFS hop counts along out-arcs (Infinity when
 * unreachable) or the 1 / 2 adjacency distance.
 * @param s - The snapshot
 * @param useGraphDistance - Which distance
 * @param d - The zeroed n x n matrix to fill
 */
function pairwiseDistances(s: GraphSnapshot, useGraphDistance: boolean, d: Float64Array): void {
    const n = s.nodeCount;
    if (!useGraphDistance) {
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                d[i * n + j] = d[j * n + i] = s.hasArc(i, j) ? 1 : 2;
            }
        }
        return;
    }
    d.fill(Infinity);
    const queue = new Uint32Array(n);
    for (let source = 0; source < n; source++) {
        hopCountsFrom(s, source, d, queue);
    }
}

/**
 * BFS hop counts along out-arcs from `source` into row `source` of the distance matrix, whose
 * unreached entries must be Infinity.
 * @param s - The snapshot
 * @param source - The node to count from
 * @param d - The n x n matrix, row-major
 * @param queue - Scratch, n long
 */
function hopCountsFrom(s: GraphSnapshot, source: number, d: Float64Array, queue: Uint32Array): void {
    const row = source * s.nodeCount;
    d[row + source] = 0;
    queue[0] = source;
    let head = 0;
    let tail = 1;
    while (head < tail) {
        const u = queue[head++];
        const next = d[row + u] + 1;
        for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
            const v = s.colIdx[a];
            if (d[row + v] === Infinity) {
                d[row + v] = next;
                queue[tail++] = v;
            }
        }
    }
}

/** The state of one TeraHAC run, built once per call. Slot i holds one active cluster. */
interface TeraHacState {
    readonly n: number;
    readonly ward: boolean;
    /** Per ordered slot pair: the min, max, or sum of (squared) member distances. */
    readonly agg: Float64Array;
    readonly extreme: ((a: number, b: number) => number) | null;
    /** Each slot's dendrogram id. */
    readonly clusterId: Uint32Array;
    readonly members: Uint32Array;
    readonly active: Uint8Array;
    /** Each slot's closest partner (-1 for none), its distance and its tie-break order. */
    readonly best: Int32Array;
    readonly bestDistance: Float64Array;
    readonly bestOrder: Float64Array;
    readonly left: U32;
    readonly right: U32;
    readonly distance: F64;
    readonly size: U32;
    merges: number;
    remaining: number;
}

/**
 * true when x is the pair's first cluster: the lower id of two originals, else the newer one.
 * @param st - The run state, updated in place
 * @param x - The first slot
 * @param y - The second slot
 * @returns Whether x comes first
 */
function orient(st: TeraHacState, x: number, y: number): boolean {
    const a = st.clusterId[x];
    const b = st.clusterId[y];
    return a < st.n && b < st.n ? a < b : a > b;
}

/**
 * The linkage distance of slots x and y, read in the orientation legacy reads it.
 * @param st - The run state, updated in place
 * @param x - The first slot
 * @param y - The second slot
 * @returns The distance
 */
function pairDistance(st: TeraHacState, x: number, y: number): number {
    const { n, clusterId, members } = st;
    const first = orient(st, x, y);
    const p = first ? x : y;
    const q = first ? y : x;
    let value = st.agg[p * n + q];
    if (clusterId[p] < n && clusterId[q] < n) {
        // Legacy reads two original nodes' distance straight from the matrix, unsquared even for ward.
        value = st.ward ? Math.sqrt(value) : value;
    } else if (!st.extreme) {
        value /= members[p] * members[q];
    }
    return value === Infinity ? UNREACHABLE : value;
}

/**
 * The tie-break rank of a pair: two originals first, then by the newer cluster's id.
 * @param st - The run state, updated in place
 * @param x - The first slot
 * @param y - The second slot
 * @returns The rank
 */
function pairOrder(st: TeraHacState, x: number, y: number): number {
    const { n } = st;
    const a = st.clusterId[x];
    const b = st.clusterId[y];
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return hi < n ? lo * n + hi : n * n + hi * 2 * n + lo;
}

/**
 * Makes y x's closest partner if it beats the current one.
 * @param st - The run state, updated in place
 * @param x - The first slot
 * @param y - The second slot
 */
function offer(st: TeraHacState, x: number, y: number): void {
    const { best, bestDistance, bestOrder } = st;
    const d = pairDistance(st, x, y);
    const o = pairOrder(st, x, y);
    if (best[x] === -1 || d < bestDistance[x] || (d === bestDistance[x] && o < bestOrder[x])) {
        best[x] = y;
        bestDistance[x] = d;
        bestOrder[x] = o;
    }
}

/**
 * Finds x's closest partner among all active slots.
 * @param st - The run state, updated in place
 * @param x - The first slot
 */
function rescan(st: TeraHacState, x: number): void {
    st.best[x] = -1;
    for (let y = 0; y < st.n; y++) {
        if (st.active[y] && y !== x) {
            offer(st, x, y);
        }
    }
}

/**
 * The active slot whose closest pair is the closest, the lowest tie-break order on a tie.
 * @param st - The run state, updated in place
 * @returns The slot
 */
function closestSlot(st: TeraHacState): number {
    const { active, bestDistance, bestOrder } = st;
    let x = -1;
    for (let i = 0; i < st.n; i++) {
        if (!active[i]) {
            continue;
        }
        if (
            x === -1 ||
            bestDistance[i] < bestDistance[x] ||
            (bestDistance[i] === bestDistance[x] && bestOrder[i] < bestOrder[x])
        ) {
            x = i;
        }
    }
    return x;
}

/**
 * Folds `drop`'s aggregates into `keep`'s, in both orientations, for every other active slot.
 * @param st - The run state, updated in place
 * @param keep - The slot that stays
 * @param drop - The slot merged away
 */
function foldAggregates(st: TeraHacState, keep: number, drop: number): void {
    const { n, agg, extreme, active } = st;
    for (let c = 0; c < n; c++) {
        if (active[c] && c !== keep && c !== drop) {
            const kc = keep * n + c;
            const dc = drop * n + c;
            const ck = c * n + keep;
            const cd = c * n + drop;
            agg[kc] = extreme ? extreme(agg[kc], agg[dc]) : agg[kc] + agg[dc];
            agg[ck] = extreme ? extreme(agg[ck], agg[cd]) : agg[ck] + agg[cd];
        }
    }
}

/**
 * Updates every closest partner after `drop` merged into `keep`.
 * @param st - The run state, updated in place
 * @param keep - The slot that stays
 * @param drop - The slot merged away
 */
function refreshPartners(st: TeraHacState, keep: number, drop: number): void {
    rescan(st, keep);
    for (let c = 0; c < st.n; c++) {
        if (!st.active[c] || c === keep) {
            continue;
        }
        if (st.best[c] === keep || st.best[c] === drop) {
            rescan(st, c);
        } else {
            offer(st, c, keep);
        }
    }
}

/**
 * Merges slot x with its closest partner at distance d, recording the join.
 * @param st - The run state, updated in place
 * @param x - The first slot
 * @param d - The pair's linkage distance
 */
function mergeClosest(st: TeraHacState, x: number, d: number): void {
    const { n, clusterId, members, size } = st;
    const partner = st.best[x];
    const first = orient(st, x, partner);
    const keep = first ? x : partner;
    const drop = first ? partner : x;
    const j = st.merges;
    st.left[j] = clusterId[keep];
    st.right[j] = clusterId[drop];
    st.distance[j] = d;
    size[j] = members[keep] + members[drop];
    foldAggregates(st, keep, drop);
    clusterId[keep] = n + j;
    members[keep] = size[j];
    st.active[drop] = 0;
    st.merges++;
    st.remaining--;
    refreshPartners(st, keep, drop);
}

/**
 * Ties what is left under one root, in ascending cluster id, as legacy does.
 * @returns The root
 * @param st - The run state, updated in place
 */
function tieRemaining(st: TeraHacState): number {
    const { n, left, right, distance, size, merges } = st;
    const rest = Array.from(st.clusterId.filter((_, i) => st.active[i] === 1)).sort((a, b) => a - b);
    let root = rest[0];
    const sizeOf = (c: number): number => (c < n ? 1 : size[c - n]);
    for (let k = 1; k < rest.length; k++) {
        const j = merges + k - 1;
        left[j] = root;
        right[j] = rest[k];
        distance[j] = Infinity;
        size[j] = sizeOf(root) + sizeOf(rest[k]);
        root = n + j;
    }
    return root;
}

/**
 * Whether another merge is wanted: more than one cluster, and more than `numClusters`.
 * @param st - The run state, updated in place
 * @param numClusters - The cluster count asked for, if any
 * @returns Whether to merge again
 */
function wantsMerge(st: TeraHacState, numClusters: number | undefined): boolean {
    return st.remaining > 1 && (numClusters === undefined || st.remaining > numClusters);
}

/**
 * TeraHAC over a snapshot: agglomerative clustering that repeatedly merges the closest pair of
 * clusters, with the same distances, merge order and tie-breaks as the legacy `teraHAC` -- but
 * over node indices, so the result no longer depends on what the node ids are.
 *
 * The linkage is kept per ordered cluster pair as an aggregate (minimum, maximum, sum of distances
 * or sum of squared distances) and updated on each merge, instead of rescanning every member pair;
 * the pairwise distances are integers, so the sums, and the means divided out of them, are exact.
 * A pair's distance reads the aggregate in the orientation legacy reads it, which matters on a
 * directed snapshot, and ties go to the pair legacy's stable sort puts first: two original nodes
 * before any pair with a merged cluster, and among those the most recent merge last.
 *
 * Weights are ignored (legacy counts hops). O(n^2) memory and O(n (n + m)) for the distances; the
 * merging keeps each cluster's closest partner and rescans a row only when that partner merges.
 * @param s - The snapshot
 * @param options - {@link TeraHacOptions}
 * @returns The flat clustering and the dendrogram
 */
export function teraHAC(s: GraphSnapshot, options: TeraHacOptions = {}): TeraHacResult {
    const { linkage = "average", numClusters, distanceThreshold, useGraphDistance = true } = options;
    if (numClusters !== undefined && (numClusters < 1 || !Number.isInteger(numClusters))) {
        throw withCode(new Error("numClusters must be a positive integer"), "E_BAD_OPTION");
    }
    const n = s.nodeCount;
    if (n === 0) {
        throw withCode(new Error("Cannot cluster empty graph"), "E_EMPTY_GRAPH");
    }

    // ponytail: dense n x n aggregate matrix, the same memory as legacy's distance matrix; a sparse
    // candidate structure is the upgrade if graphs past ~10k nodes need this.
    const agg = allocDense("teraHAC", n, options.maxNodes, 8 * n * n, () => new Float64Array(n * n));
    pairwiseDistances(s, useGraphDistance, agg);
    if (linkage === "ward") {
        for (let i = 0; i < agg.length; i++) {
            agg[i] *= agg[i];
        }
    }
    const extremes = { single: Math.min, complete: Math.max, average: null, ward: null };
    const joins = Math.max(0, n - 1);
    const st: TeraHacState = {
        n,
        ward: linkage === "ward",
        agg,
        extreme: extremes[linkage],
        clusterId: Uint32Array.from({ length: n }, (_, i) => i),
        members: new Uint32Array(n).fill(1),
        active: new Uint8Array(n).fill(1),
        best: new Int32Array(n).fill(-1),
        bestDistance: new Float64Array(n),
        bestOrder: new Float64Array(n),
        left: new Uint32Array(joins),
        right: new Uint32Array(joins),
        distance: new Float64Array(joins),
        size: new Uint32Array(joins),
        merges: 0,
        remaining: n,
    };
    for (let x = 0; x < n; x++) {
        rescan(st, x);
    }
    while (wantsMerge(st, numClusters)) {
        const x = closestSlot(st);
        const d = st.bestDistance[x];
        if (distanceThreshold !== undefined && d > distanceThreshold) {
            break;
        }
        mergeClosest(st, x, d);
    }
    const root = tieRemaining(st);
    const { left, right, distance, size, merges } = st;
    const cut = cutDendrogram(n, left, right, root, numClusters ?? st.remaining);
    const { labels, count } = renumberPartition(cut);
    return { ...withGroups(labels, count), left, right, distance, size, merges, root };
}

/**
 * Legacy's flat clustering: split dendrogram nodes breadth-first from the root until splitting the
 * next one would exceed `k` clusters, then label every node by the cluster above it.
 * @param n - Node count
 * @param left - Left child of each join
 * @param right - Right child of each join
 * @param root - The root
 * @param k - The cluster count asked for
 * @returns A cluster number per node index
 */
function cutDendrogram(n: number, left: U32, right: U32, root: number, k: number): U32 {
    const kept: number[] = [];
    const queue = [root];
    let head = 0;
    while (head < queue.length && kept.length < k) {
        const c = queue[head++];
        if (c < n || k === 1 || kept.length + (queue.length - head) + 1 >= k) {
            kept.push(c);
        } else {
            queue.push(left[c - n], right[c - n]);
        }
    }
    const labels = new Uint32Array(n);
    kept.forEach((top, label) => {
        const stack = [top];
        while (stack.length > 0) {
            const c = stack.pop() ?? 0;
            if (c < n) {
                labels[c] = label;
            } else {
                stack.push(left[c - n], right[c - n]);
            }
        }
    });
    return labels;
}
