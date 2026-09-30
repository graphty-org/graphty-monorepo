import { type F64, type GraphSnapshot, renumberPartition, type U32 } from "@graphty/graph-format";

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
 * @returns The matrix
 */
function pairwiseDistances(s: GraphSnapshot, useGraphDistance: boolean): Float64Array {
    const n = s.nodeCount;
    const d = new Float64Array(n * n);
    if (!useGraphDistance) {
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                d[i * n + j] = d[j * n + i] = s.hasArc(i, j) ? 1 : 2;
            }
        }
        return d;
    }
    d.fill(Infinity);
    const queue = new Uint32Array(n);
    for (let source = 0; source < n; source++) {
        const row = source * n;
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
    return d;
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
        throw new Error("numClusters must be a positive integer");
    }
    const n = s.nodeCount;
    if (n === 0) {
        throw new Error("Cannot cluster empty graph");
    }

    // ponytail: dense n x n aggregate matrix, the same memory as legacy's distance matrix; a sparse
    // candidate structure is the upgrade if graphs past ~10k nodes need this.
    const agg = pairwiseDistances(s, useGraphDistance);
    if (linkage === "ward") {
        for (let i = 0; i < agg.length; i++) {
            agg[i] *= agg[i];
        }
    }
    const extremes = { single: Math.min, complete: Math.max, average: null, ward: null };
    const extreme = extremes[linkage];

    const joins = Math.max(0, n - 1);
    const left = new Uint32Array(joins);
    const right = new Uint32Array(joins);
    const distance = new Float64Array(joins);
    const size = new Uint32Array(joins);

    // Slot i holds one active cluster: its dendrogram id, its size, and its closest partner.
    const clusterId = new Uint32Array(n);
    const members = new Uint32Array(n).fill(1);
    const active = new Uint8Array(n).fill(1);
    for (let i = 0; i < n; i++) {
        clusterId[i] = i;
    }
    const orient = (x: number, y: number): boolean => {
        // true when x is the pair's first cluster: the lower id of two originals, else the newer one
        const a = clusterId[x];
        const b = clusterId[y];
        return a < n && b < n ? a < b : a > b;
    };
    const pairDistance = (x: number, y: number): number => {
        const [p, q] = orient(x, y) ? [x, y] : [y, x];
        let value = agg[p * n + q];
        if (clusterId[p] < n && clusterId[q] < n) {
            // Legacy reads two original nodes' distance straight from the matrix, unsquared even for ward.
            value = linkage === "ward" ? Math.sqrt(value) : value;
        } else if (!extreme) {
            value /= members[p] * members[q];
        }
        return value === Infinity ? UNREACHABLE : value;
    };
    const pairOrder = (x: number, y: number): number => {
        const a = clusterId[x];
        const b = clusterId[y];
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        return hi < n ? lo * n + hi : n * n + hi * 2 * n + lo;
    };
    const best = new Int32Array(n).fill(-1);
    const bestDistance = new Float64Array(n);
    const bestOrder = new Float64Array(n);
    const offer = (x: number, y: number): void => {
        const d = pairDistance(x, y);
        const o = pairOrder(x, y);
        if (best[x] === -1 || d < bestDistance[x] || (d === bestDistance[x] && o < bestOrder[x])) {
            best[x] = y;
            bestDistance[x] = d;
            bestOrder[x] = o;
        }
    };
    const rescan = (x: number): void => {
        best[x] = -1;
        for (let y = 0; y < n; y++) {
            if (active[y] && y !== x) {
                offer(x, y);
            }
        }
    };
    for (let x = 0; x < n; x++) {
        rescan(x);
    }

    let remaining = n;
    let merges = 0;
    while (remaining > 1 && (numClusters === undefined || remaining > numClusters)) {
        let x = -1;
        for (let i = 0; i < n; i++) {
            if (
                active[i] &&
                (x === -1 ||
                    bestDistance[i] < bestDistance[x] ||
                    (bestDistance[i] === bestDistance[x] && bestOrder[i] < bestOrder[x]))
            ) {
                x = i;
            }
        }
        const d = bestDistance[x];
        if (distanceThreshold !== undefined && d > distanceThreshold) {
            break;
        }
        const [keep, drop] = orient(x, best[x]) ? [x, best[x]] : [best[x], x];
        left[merges] = clusterId[keep];
        right[merges] = clusterId[drop];
        distance[merges] = d;
        size[merges] = members[keep] + members[drop];
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
        clusterId[keep] = n + merges;
        members[keep] = size[merges];
        active[drop] = 0;
        merges++;
        remaining--;
        rescan(keep);
        for (let c = 0; c < n; c++) {
            if (active[c] && c !== keep) {
                if (best[c] === keep || best[c] === drop) {
                    rescan(c);
                } else {
                    offer(c, keep);
                }
            }
        }
    }

    // Tie what is left under one root, in ascending cluster id, as legacy does.
    const rest = Array.from(clusterId.filter((_, i) => active[i] === 1)).sort((a, b) => a - b);
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

    const cut = cutDendrogram(n, left, right, root, numClusters ?? remaining);
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
