import { type F64, type GraphSnapshot, INVALID_INDEX, renumberPartition, type U32 } from "@graphty/graph-format";

import { SeededRandom } from "../utils/math-utilities.js";
import { type LabelResult, withGroups } from "./components.js";

/** Options of the index-based GRSBM, matching the legacy `grsbm`. @public */
export interface GrsbmOptions {
    /** Clusters at this depth are not split; default 10. */
    readonly maxDepth?: number | undefined;
    /** A cluster is split only when it has at least twice this many members; default 2. */
    readonly minClusterSize?: number | undefined;
    /** Convergence tolerance of the Fiedler-vector iteration; default 1e-6. */
    readonly tolerance?: number | undefined;
    /** Iteration cap of the Fiedler-vector iteration; default 100. */
    readonly maxIterations?: number | undefined;
    /** Seed of the iteration's start vectors; default 42. */
    readonly seed?: number | undefined;
    /**
     * Use arc weights in the Laplacian and the modularity (true, the default), or count arcs
     * (false, which is what the legacy `grsbm` does). A parallel arc counts once per arc.
     */
    readonly weighted?: boolean | undefined;
}

/** Why a cluster was split: the legacy `ClusterExplanation`, over node indices. @public */
export interface GrsbmSplit {
    /** The split's modularity minus the parent's. */
    readonly improvement: number;
    /** Modularity of the chosen split point (the legacy explanation text prints it to 3 places). */
    readonly bisectionModularity: number;
    /** Up to five members with the largest-magnitude Fiedler values, in member order. */
    readonly keyNodes: U32;
    /** The Fiedler vector, one value per member in member order. */
    readonly spectralValues: F64;
}

/** One cluster of the hierarchy. @public */
export interface GrsbmCluster {
    /**
     * 0 for the root, k for the k-th cluster a bisection proposed, counting the proposals that were
     * rejected: the number in the legacy id `cluster_k`.
     */
    readonly serial: number;
    /** Member node indices, in the legacy member order. */
    readonly members: U32;
    /** Depth below the root. */
    readonly depth: number;
    /** Modularity of the split that made this cluster (the root: of the whole graph as one cluster). */
    readonly modularity: number;
    /** Spread of the Fiedler values of the split that made this cluster; 0 for the root. */
    readonly spectralScore: number;
    /** Index in `clusters` of the left child, or `INVALID_INDEX` for a leaf. */
    readonly left: number;
    /** Index in `clusters` of the right child, or `INVALID_INDEX` for a leaf. */
    readonly right: number;
    /** Why this cluster was split; null for a leaf. */
    readonly split: GrsbmSplit | null;
}

/**
 * Result of the index-based GRSBM: the leaves as a partition, plus the hierarchy. `clusters[0]` is
 * the root; the others follow in the order they were made, children in pairs.
 * @public
 */
export interface GrsbmResult extends LabelResult {
    /** Every cluster of the hierarchy. */
    readonly clusters: readonly GrsbmCluster[];
    /** The root's modularity, then each accepted split's, in split order. */
    readonly modularityScores: F64;
}

interface MutableCluster {
    serial: number;
    members: U32;
    depth: number;
    modularity: number;
    spectralScore: number;
    left: number;
    right: number;
    split: GrsbmSplit | null;
}

/**
 * GRSBM over a snapshot: recursive spectral bisection. Each cluster's Laplacian (over the arcs
 * between its members, self-loops left out) gives an approximate Fiedler vector; members are sorted
 * by it and cut at the point between 20% and 80% that maximises modularity; the split is kept when
 * modularity drops by no more than 0.01. The arithmetic and the random draws are the legacy
 * `grsbm`'s, so with `weighted: false` the result equals legacy's exactly on a graph without
 * self-loops; the port draws from its own generator instead of replacing `Math.random`.
 *
 * Modularity uses `weightedDegree()` (a self-loop counts twice) against `totalWeight()`, or
 * `degree()` against the edge count when unweighted. Like legacy's, a split's modularity sums only
 * the two halves of the cluster being split. A self-loop follows the standard convention (left out
 * of the Laplacian, twice in the degree), so on a graph with self-loops the result differs from
 * legacy's, which scores the whole graph as one community above 0. On a directed graph the
 * unweighted path keeps legacy's halving of internal arcs; the weighted path does not, so there the
 * whole graph as one community scores 0. Weights must be finite and non-negative (RangeError).
 * @param s - The snapshot
 * @param options - {@link GrsbmOptions}
 * @returns The leaf partition and the hierarchy
 */
export function grsbm(s: GraphSnapshot, options: GrsbmOptions = {}): GrsbmResult {
    const {
        maxDepth = 10,
        minClusterSize = 2,
        tolerance = 1e-6,
        maxIterations = 100,
        seed = 42,
        weighted = true,
    } = options;
    const n = s.nodeCount;
    if (n === 0) {
        throw new Error("Cannot cluster empty graph");
    }
    const random = SeededRandom.createGenerator(seed);
    const arcWeights = weighted ? s.weights : null;
    if (arcWeights !== null) {
        for (let a = 0; a < arcWeights.length; a++) {
            const w = arcWeights[a];
            if (!(w >= 0) || w === Infinity) {
                throw new RangeError(
                    `arc ${String(a)} has weight ${String(w)}; grsbm needs finite, non-negative weights`,
                );
            }
        }
    }
    const degree = weighted ? s.weightedDegree() : s.degree();
    const m = weighted ? s.totalWeight() : s.edgeCount;
    const loopFactor = s.directed ? 1 : 2;
    // An undirected edge is stored as two arcs, so the internal sum counts it twice. A directed arc is
    // stored once; legacy halves it anyway (the whole graph as one community scores -0.5), and the
    // unweighted path keeps that for parity.
    const halveInternal = !s.directed || !weighted;
    const { rowPtr, colIdx } = s;

    // side[u]: the community of u in the split being scored, -1 outside the cluster.
    const side = new Int32Array(n).fill(-1);
    const communityTerm = (group: ArrayLike<number>): number => {
        let internal = 0;
        let total = 0;
        for (let p = 0; p < group.length; p++) {
            const u = group[p];
            total += degree[u];
            for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
                const v = colIdx[a];
                if (side[v] === side[u]) {
                    const w = arcWeights === null ? 1 : arcWeights[a];
                    internal += v === u ? loopFactor * w : w;
                }
            }
        }
        if (halveInternal) {
            internal /= 2;
        }
        return (internal - (total * total) / (4 * m)) / m;
    };
    const modularity = (groups: readonly ArrayLike<number>[]): number => {
        if (m === 0) {
            return 0;
        }
        let q = 0;
        groups.forEach((group, c) => {
            for (let p = 0; p < group.length; p++) {
                side[group[p]] = c;
            }
        });
        for (const group of groups) {
            if (group.length > 0) {
                q += communityTerm(group);
            }
        }
        for (const group of groups) {
            for (let p = 0; p < group.length; p++) {
                side[group[p]] = -1;
            }
        }
        return q;
    };

    const everyone = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        everyone[i] = i;
    }
    const initial = modularity([everyone]);
    const clusters: MutableCluster[] = [
        {
            serial: 0,
            members: everyone,
            depth: 0,
            modularity: initial,
            spectralScore: 0,
            left: INVALID_INDEX,
            right: INVALID_INDEX,
            split: null,
        },
    ];
    const scores = [initial];
    const position = new Int32Array(n).fill(-1);
    let nextSerial = 1;

    // The clusters array doubles as the breadth-first work queue: children are appended as made.
    for (let head = 0; head < clusters.length; head++) {
        const cluster = clusters[head];
        const { members } = cluster;
        const size = members.length;
        if (cluster.depth >= maxDepth || size < minClusterSize * 2 || size < 4) {
            continue;
        }
        const fiedler = fiedlerVector(members, position, s, arcWeights, random, tolerance, maxIterations);
        const order = Array.from({ length: size }, (_, p) => p).sort((a, b) => fiedler[a] - fiedler[b]);
        const sorted = Uint32Array.from(order, (p) => members[p]);

        let bestSplit = Math.floor(size / 2);
        let best = -Infinity;
        for (let cut = Math.floor(size * 0.2); cut <= Math.floor(size * 0.8); cut++) {
            const q = modularity([sorted.subarray(0, cut), sorted.subarray(cut)]);
            if (q > best) {
                best = q;
                bestSplit = cut;
            }
        }
        const leftMembers = sorted.slice(0, bestSplit);
        const rightMembers = sorted.slice(bestSplit);

        const byMagnitude = Array.from(fiedler).sort((a, b) => Math.abs(b) - Math.abs(a));
        const threshold = Math.abs(byMagnitude[Math.floor(size * 0.1)]);
        const keyNodes: number[] = [];
        for (let p = 0; p < size && keyNodes.length < 5; p++) {
            if (Math.abs(fiedler[p]) >= threshold) {
                keyNodes.push(members[p]);
            }
        }
        const spectralScore = Math.abs(byMagnitude[0] - byMagnitude[size - 1]);

        const leftSerial = nextSerial++;
        const rightSerial = nextSerial++;
        const improvement = best - cluster.modularity;
        if (improvement < -0.01) {
            continue;
        }
        const child = (serial: number, childMembers: U32): MutableCluster => ({
            serial,
            members: childMembers,
            depth: cluster.depth + 1,
            modularity: best,
            spectralScore,
            left: INVALID_INDEX,
            right: INVALID_INDEX,
            split: null,
        });
        cluster.left = clusters.length;
        cluster.right = clusters.length + 1;
        cluster.split = {
            improvement,
            bisectionModularity: best,
            keyNodes: Uint32Array.from(keyNodes),
            spectralValues: fiedler,
        };
        clusters.push(child(leftSerial, leftMembers), child(rightSerial, rightMembers));
        scores.push(best);
    }

    // One label per leaf, renumbered by each leaf's lowest node index.
    const leafOf = new Uint32Array(n);
    let leaves = 0;
    const stack = [0];
    while (stack.length > 0) {
        const c = clusters[stack.pop() ?? 0];
        if (c.left === INVALID_INDEX) {
            for (const u of c.members) {
                leafOf[u] = leaves;
            }
            leaves++;
        } else {
            stack.push(c.right, c.left);
        }
    }
    const { labels, count } = renumberPartition(leafOf);
    return { ...withGroups(labels, count), clusters, modularityScores: Float64Array.from(scores) };
}

/**
 * Legacy's approximate Fiedler vector of a cluster's Laplacian: a seeded random start orthogonal to
 * the all-ones vector, then repeated multiplication by -L, re-centred and normalised, until it stops
 * moving. Each row is summed in member order, the order legacy's dense matrix product uses, so the
 * vector matches legacy's to the last bit.
 * @param members - The cluster's node indices
 * @param position - Scratch, -1 everywhere on entry and exit
 * @param s - The snapshot
 * @param arcWeights - Arc weights, or null to count arcs
 * @param random - The generator
 * @param tolerance - Convergence tolerance
 * @param maxIterations - Iteration cap
 * @returns One value per member
 */
function fiedlerVector(
    members: U32,
    position: Int32Array,
    s: GraphSnapshot,
    arcWeights: F64 | Float32Array | null,
    random: () => number,
    tolerance: number,
    maxIterations: number,
): F64 {
    const size = members.length;
    for (let p = 0; p < size; p++) {
        position[members[p]] = p;
    }
    // The Laplacian as sorted sparse rows: off-diagonal -w per member neighbour, diagonal their sum.
    const rowStart = new Uint32Array(size + 1);
    const cols: number[] = [];
    const vals: number[] = [];
    const row = new Map<number, number>();
    for (let p = 0; p < size; p++) {
        const u = members[p];
        row.clear();
        let diagonal = 0;
        for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
            const q = position[s.colIdx[a]];
            if (q >= 0 && q !== p) {
                const w = arcWeights === null ? 1 : arcWeights[a];
                row.set(q, (row.get(q) ?? 0) - w);
                diagonal += w;
            }
        }
        row.set(p, diagonal);
        for (const q of [...row.keys()].sort((a, b) => a - b)) {
            cols.push(q);
            vals.push(row.get(q) ?? 0);
        }
        rowStart[p + 1] = cols.length;
    }
    for (let p = 0; p < size; p++) {
        position[members[p]] = -1;
    }

    let vector: F64 = new Float64Array(size);
    for (let p = 0; p < size; p++) {
        vector[p] = random() - 0.5;
    }
    const recentre = (v: F64): void => {
        let sum = 0;
        for (const x of v) {
            sum += x;
        }
        const mean = sum / size;
        for (let p = 0; p < size; p++) {
            v[p] -= mean;
        }
    };
    const norm = (v: F64): number => {
        let sum = 0;
        for (const x of v) {
            sum += x * x;
        }
        return Math.sqrt(sum);
    };
    recentre(vector);
    const start = norm(vector);
    if (start > 0) {
        for (let p = 0; p < size; p++) {
            vector[p] /= start;
        }
    }
    for (let iteration = 0; iteration < maxIterations; iteration++) {
        const next = new Float64Array(size);
        for (let p = 0; p < size; p++) {
            let sum = 0;
            for (let k = rowStart[p]; k < rowStart[p + 1]; k++) {
                sum += vals[k] * vector[cols[k]];
            }
            next[p] = -sum;
        }
        recentre(next);
        const length = norm(next);
        if (length < tolerance) {
            break;
        }
        let moved = 0;
        for (let p = 0; p < size; p++) {
            next[p] /= length;
            moved += Math.abs(next[p] - vector[p]);
        }
        vector = next;
        if (moved < tolerance) {
            break;
        }
    }
    return vector;
}
