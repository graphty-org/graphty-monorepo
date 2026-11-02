import { type F64, type GraphSnapshot, INVALID_INDEX, renumberPartition, type U32 } from "@graphty/graph-format";

import { withCode } from "../errors.js";
import { mulberry32 } from "../utils/math-utilities.js";
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
    /** How much the split raised the whole partition's modularity; always above 0. */
    readonly improvement: number;
    /** Modularity of the whole partition once this split was made. */
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
    /**
     * Modularity of the whole partition once the split that made this cluster was made (the root: of
     * the whole graph as one cluster).
     */
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
    /**
     * The root's modularity, then the whole partition's after each accepted split, in split order;
     * the last is the modularity of the leaf partition.
     */
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

/** What scoring a partition's modularity reads, plus the `side` scratch it writes. */
interface Scorer {
    readonly degree: ArrayLike<number>;
    readonly m: number;
    readonly loopFactor: number;
    readonly halveInternal: boolean;
    readonly rowPtr: U32;
    readonly colIdx: U32;
    readonly arcWeights: Float32Array | null;
    /** The community of every node in the split being scored, -1 outside the cluster. */
    readonly side: Int32Array;
}

/**
 * Throw unless every arc weight is finite and non-negative.
 * @param arcWeights - The arc weights, or null
 */
function checkWeights(arcWeights: Float32Array | null): void {
    if (arcWeights === null) {
        return;
    }
    for (let a = 0; a < arcWeights.length; a++) {
        const w = arcWeights[a];
        if (!(w >= 0) || w === Infinity) {
            throw withCode(
                new RangeError(`arc ${String(a)} has weight ${String(w)}; grsbm needs finite, non-negative weights`),
                "E_BAD_WEIGHT",
            );
        }
    }
}

/**
 * One community's modularity term, with `side` marking the communities.
 * @param sc - The scorer
 * @param group - The community's members
 * @returns The term
 */
function communityTerm(sc: Scorer, group: ArrayLike<number>): number {
    const { degree, rowPtr, colIdx, arcWeights, side, loopFactor, m } = sc;
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
    if (sc.halveInternal) {
        internal /= 2;
    }
    return (internal - (total * total) / (4 * m)) / m;
}

/**
 * Mark (or with -1, unmark) every member of every group in `side`.
 * @param side - The scratch
 * @param groups - The communities
 * @param clear - Write -1 instead of the group index
 */
function markSides(side: Int32Array, groups: readonly ArrayLike<number>[], clear: boolean): void {
    groups.forEach((group, c) => {
        for (let p = 0; p < group.length; p++) {
            side[group[p]] = clear ? -1 : c;
        }
    });
}

/**
 * The summed modularity terms of some communities; 0 on a graph with no weight.
 * @param sc - The scorer
 * @param groups - The communities
 * @returns The modularity
 */
function modularity(sc: Scorer, groups: readonly ArrayLike<number>[]): number {
    if (sc.m === 0) {
        return 0;
    }
    let q = 0;
    markSides(sc.side, groups, false);
    for (const group of groups) {
        if (group.length > 0) {
            q += communityTerm(sc, group);
        }
    }
    markSides(sc.side, groups, true);
    return q;
}

/**
 * The cut point between 20% and 80% of the sorted members that maximises modularity.
 * @param sc - The scorer
 * @param sorted - The members sorted by Fiedler value
 * @returns The cut and its modularity
 */
function bestCut(sc: Scorer, sorted: U32): { cut: number; best: number } {
    const size = sorted.length;
    let bestSplit = Math.floor(size / 2);
    let best = -Infinity;
    for (let cut = Math.floor(size * 0.2); cut <= Math.floor(size * 0.8); cut++) {
        const q = modularity(sc, [sorted.subarray(0, cut), sorted.subarray(cut)]);
        if (q > best) {
            best = q;
            bestSplit = cut;
        }
    }
    return { cut: bestSplit, best };
}

/**
 * The key nodes and spread of a Fiedler vector.
 * @param fiedler - One value per member
 * @param members - The members
 * @returns Up to five members of largest magnitude in member order, and the spread
 */
function spectralSummary(fiedler: F64, members: U32): { keyNodes: U32; spectralScore: number } {
    const size = members.length;
    const byMagnitude = Array.from(fiedler).sort((a, b) => Math.abs(b) - Math.abs(a));
    const threshold = Math.abs(byMagnitude[Math.floor(size * 0.1)]);
    const keyNodes: number[] = [];
    for (let p = 0; p < size && keyNodes.length < 5; p++) {
        if (Math.abs(fiedler[p]) >= threshold) {
            keyNodes.push(members[p]);
        }
    }
    return { keyNodes: Uint32Array.from(keyNodes), spectralScore: Math.abs(byMagnitude[0] - byMagnitude[size - 1]) };
}

/**
 * A fresh leaf cluster.
 * @param serial - Its serial
 * @param members - Its members
 * @param depth - Its depth
 * @param partitionModularity - The whole partition's modularity once it was made
 * @param spectralScore - The spread of the split that made it
 * @returns The cluster
 */
function leafCluster(
    serial: number,
    members: U32,
    depth: number,
    partitionModularity: number,
    spectralScore: number,
): MutableCluster {
    return {
        serial,
        members,
        depth,
        modularity: partitionModularity,
        spectralScore,
        left: INVALID_INDEX,
        right: INVALID_INDEX,
        split: null,
    };
}

/**
 * One label per leaf, in depth-first left-to-right order.
 * @param clusters - The hierarchy, root first
 * @param n - Node count
 * @returns The leaf index of every node
 */
function leafLabels(clusters: readonly MutableCluster[], n: number): U32 {
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
    return leafOf;
}

/**
 * GRSBM over a snapshot: recursive spectral bisection. Each cluster's Laplacian (over the arcs
 * between its members, self-loops left out) gives an approximate Fiedler vector; members are sorted
 * by it and cut at the point between 20% and 80% that maximises modularity; the split is kept only
 * when it raises the modularity of the whole partition (every other cluster held as it is). The
 * change is the two halves' community terms minus the cluster's, so scoring a cut costs the arcs of
 * the cluster alone. Clusters are split breadth first. The cut and the modularity arithmetic are the
 * legacy `grsbm`'s; the acceptance rule is not (legacy compared the two halves' terms alone with the
 * parent split's, and kept a split that lowered that by up to 0.01, issue #960), nor is the
 * bisection vector, because legacy's iteration converged to the eigenvector of the Laplacian's
 * largest eigenvalue rather than the Fiedler vector. The port draws from its own generator instead
 * of replacing `Math.random`.
 *
 * Modularity uses `weightedDegree()` (a self-loop counts twice) against `totalWeight()`, or
 * `degree()` against the edge count when unweighted. A self-loop follows the standard convention (left out
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
        throw withCode(new Error("Cannot cluster empty graph"), "E_EMPTY_GRAPH");
    }
    const random = mulberry32(seed);
    const arcWeights = weighted ? s.weights : null;
    checkWeights(arcWeights);
    const sc: Scorer = {
        degree: weighted ? s.weightedDegree() : s.degree(),
        m: weighted ? s.totalWeight() : s.edgeCount,
        loopFactor: s.directed ? 1 : 2,
        // An undirected edge is stored as two arcs, so the internal sum counts it twice. A directed arc
        // is stored once; legacy halves it anyway (the whole graph as one community scores -0.5), and
        // the unweighted path keeps that for parity.
        halveInternal: !s.directed || !weighted,
        rowPtr: s.rowPtr,
        colIdx: s.colIdx,
        arcWeights,
        side: new Int32Array(n).fill(-1),
    };

    const everyone = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        everyone[i] = i;
    }
    const initial = modularity(sc, [everyone]);
    const clusters: MutableCluster[] = [leafCluster(0, everyone, 0, initial, 0)];
    const scores = [initial];
    // Modularity of the current leaf partition.
    let partition = initial;
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
        const { cut, best } = bestCut(sc, sorted);
        const { keyNodes, spectralScore } = spectralSummary(fiedler, members);

        const leftSerial = nextSerial++;
        const rightSerial = nextSerial++;
        // Every other cluster's term is unchanged, so the whole partition moves by the two halves'
        // terms minus the cluster's own.
        const improvement = best - modularity(sc, [members]);
        if (improvement <= 0) {
            continue;
        }
        partition += improvement;
        cluster.left = clusters.length;
        cluster.right = clusters.length + 1;
        cluster.split = { improvement, bisectionModularity: partition, keyNodes, spectralValues: fiedler };
        const depth = cluster.depth + 1;
        clusters.push(
            leafCluster(leftSerial, sorted.slice(0, cut), depth, partition, spectralScore),
            leafCluster(rightSerial, sorted.slice(cut), depth, partition, spectralScore),
        );
        scores.push(partition);
    }

    // One label per leaf, renumbered by each leaf's lowest node index.
    const { labels, count } = renumberPartition(leafLabels(clusters, n));
    return { ...withGroups(labels, count), clusters, modularityScores: Float64Array.from(scores) };
}

/**
 * Mark each member's position in `position`, or clear it back to -1.
 * @param members - The cluster's node indices
 * @param position - The scratch
 * @param clear - Write -1 instead of the position
 */
function markPositions(members: U32, position: Int32Array, clear: boolean): void {
    for (let p = 0; p < members.length; p++) {
        position[members[p]] = clear ? -1 : p;
    }
}

/** A cluster's Laplacian as sorted sparse rows, and its largest weighted degree. */
interface Laplacian {
    readonly rowStart: Uint32Array;
    readonly cols: number[];
    readonly vals: number[];
    maxDegree: number;
}

/**
 * Append member p's Laplacian row: off-diagonal -w per member neighbour, diagonal their sum.
 * @param lap - The Laplacian being built
 * @param p - The member's position
 * @param u - The member's node index
 * @param ctx - The snapshot, its arc weights, the positions and a scratch map
 * @param ctx.s - The snapshot
 * @param ctx.arcWeights - Arc weights, or null to count arcs
 * @param ctx.position - Each member's position, -1 for a non-member
 * @param ctx.row - Scratch map from position to entry
 */
function appendLaplacianRow(
    lap: Laplacian,
    p: number,
    u: number,
    ctx: {
        s: GraphSnapshot;
        arcWeights: F64 | Float32Array | null;
        position: Int32Array;
        row: Map<number, number>;
    },
): void {
    const { s, arcWeights, position, row } = ctx;
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
    lap.maxDegree = Math.max(lap.maxDegree, diagonal);
    for (const q of [...row.keys()].sort((x, y) => x - y)) {
        lap.cols.push(q);
        lap.vals.push(row.get(q) ?? 0);
    }
    lap.rowStart[p + 1] = lap.cols.length;
}

/**
 * Subtract the mean from every entry, in place.
 * @param v - The vector
 */
function recentre(v: F64): void {
    let sum = 0;
    for (const x of v) {
        sum += x;
    }
    const mean = sum / v.length;
    for (let p = 0; p < v.length; p++) {
        v[p] -= mean;
    }
}

/**
 * The L2 norm of a vector.
 * @param v - The vector
 * @returns Its length
 */
function norm(v: F64): number {
    let sum = 0;
    for (const x of v) {
        sum += x * x;
    }
    return Math.sqrt(sum);
}

/**
 * Write `(shift I - L) vector` into `next`.
 * @param lap - The Laplacian
 * @param shift - The shift c
 * @param vector - The current vector
 * @param next - Receives the product
 */
function shiftedProduct(lap: Laplacian, shift: number, vector: F64, next: F64): void {
    const { rowStart, cols, vals } = lap;
    for (let p = 0; p < next.length; p++) {
        let sum = 0;
        for (let k = rowStart[p]; k < rowStart[p + 1]; k++) {
            sum += vals[k] * vector[cols[k]];
        }
        next[p] = shift * vector[p] - sum;
    }
}

/**
 * A seeded random start vector, re-centred and normalised.
 * @param size - Its length
 * @param random - The generator
 * @returns The vector
 */
function randomStart(size: number, random: () => number): F64 {
    const vector: F64 = new Float64Array(size);
    for (let p = 0; p < size; p++) {
        vector[p] = random() - 0.5;
    }
    recentre(vector);
    const start = norm(vector);
    if (start > 0) {
        for (let p = 0; p < size; p++) {
            vector[p] /= start;
        }
    }
    return vector;
}

/**
 * The approximate Fiedler vector of a cluster's Laplacian L: a seeded random start orthogonal to
 * the all-ones vector, then repeated multiplication by (c I - L), re-centred and normalised, until
 * it stops moving. c is twice the largest weighted degree in the cluster, an upper bound on L's
 * largest eigenvalue, so every eigenvalue c - lambda of (c I - L) is non-negative and the largest
 * left after re-centring, c - lambda_2, belongs to the Fiedler vector. (Legacy multiplied by -L,
 * which converges to the eigenvector of L's LARGEST eigenvalue instead.)
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
    markPositions(members, position, false);
    const lap: Laplacian = { rowStart: new Uint32Array(size + 1), cols: [], vals: [], maxDegree: 0 };
    const ctx = { s, arcWeights, position, row: new Map<number, number>() };
    for (let p = 0; p < size; p++) {
        appendLaplacianRow(lap, p, members[p], ctx);
    }
    markPositions(members, position, true);

    let vector = randomStart(size, random);
    const shift = 2 * lap.maxDegree;
    for (let iteration = 0; iteration < maxIterations; iteration++) {
        const next = new Float64Array(size);
        shiftedProduct(lap, shift, vector, next);
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
