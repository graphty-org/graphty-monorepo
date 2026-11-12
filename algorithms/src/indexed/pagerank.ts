import type { F32, F64, GraphSnapshot, NumericVector, ReverseView, U32 } from "@graphty/graph-format";

import { withCode } from "../errors.js";
import { readsWeights } from "./weights.js";

/** Options of the index-based PageRank (graph-format design 14.2 Port 3). @public */
export interface PageRankOptions {
    /** Probability of following a link; default 0.85. */
    readonly dampingFactor?: number | undefined;
    /** Iteration cap; default 100. */
    readonly maxIterations?: number | undefined;
    /**
     * Convergence tolerance; default 1e-6. The run stops at the first iteration whose summed (L1) change over all
     * nodes is below `tolerance`. The scores sum to 1, so that is a change of `tolerance` relative to the whole
     * vector, the rule HITS and `@graphty/webgpu-graph-algorithms` follow too.
     */
    readonly tolerance?: number | undefined;
    /** Weight each link by its arc weight when the snapshot has weights; default true. `false` ignores them. */
    readonly weighted?: boolean | undefined;
    /** Starting rank per node index, normalised to sum 1 (when the sum is positive); default uniform. */
    readonly initialRanks?: F32 | F64 | undefined;
    /**
     * How the per-iteration change is measured: `"l1"` (default) sums it over all nodes; `"max"` takes the largest
     * single-node change. Either is compared with `tolerance`.
     */
    readonly convergenceNorm?: "l1" | "max" | undefined;
}

/** Result of the index-based PageRank. @public */
export interface PageRankResult {
    /** Score per node index. */
    readonly scores: F64;
    /** Iterations actually run. */
    readonly iterations: number;
    /** Whether the change fell below the tolerance. */
    readonly converged: boolean;
}

/**
 * PageRank by pull over `reverse()`, with the dangling mass redistributed uniformly. On an
 * undirected snapshot every edge carries rank both ways (a self-loop once), which is PageRank on
 * the directed graph holding both arcs of every edge.
 * @param s - The snapshot
 * @param o - Algorithm options
 * @returns The scores, the iteration count and the convergence flag
 * @public
 */
export function pageRank(s: GraphSnapshot, o: PageRankOptions = {}): PageRankResult {
    return run(s, null, o);
}

/**
 * Personalized PageRank, as the legacy function computes it: the personalization vector,
 * normalised to sum 1, replaces the uniform `1 / n` in the teleport, and each node receives
 * `d * dangling / n` of the dangling mass scaled by its personalization. That keeps only a
 * `1 / n` share of the dangling mass, so on a graph with a dangling node the scores sum to less
 * than 1 (networkx spreads all of it). An all-zero vector gives plain PageRank, as the legacy
 * function does for an empty list of personal nodes.
 * @param s - The snapshot
 * @param personalization - One finite, non-negative mass per node index
 * @param o - Algorithm options
 * @returns The scores, the iteration count and the convergence flag
 * @public
 */
export function personalizedPageRank(
    s: GraphSnapshot,
    personalization: F32 | F64,
    o: PageRankOptions = {},
): PageRankResult {
    return run(s, distribution(personalization, s.nodeCount, "personalization"), o);
}

/**
 * The arrays one power-iteration step reads, gathered once per call. Only always-present arrays go in here: with
 * the scalars and the nullable `p` and `revW` bundled too, PageRank measured 1.14x slower (issue #5821), so those
 * are `powerStep` parameters instead.
 */
interface PowerArrays {
    /** The reverse view's row offsets. */
    readonly revPtr: U32;
    /** The reverse view's arc sources. */
    readonly revIdx: U32;
    /** The out-weight of every node. */
    readonly outW: NumericVector;
}

/**
 * The f64 shadow of the edge weights that toSnapshot keeps when a weight is not f32-exact, or null.
 * @param s - The snapshot
 * @returns One f64 weight per logical edge, or null to read the f32 arc weights
 */
function exactWeights(s: GraphSnapshot): F64 | null {
    const shadow = s.edges.byRole("weight");
    return shadow?.dtype === "f64" ? shadow.data : null;
}

/*
 * The walk's weights come from two functions returning one array each, not one returning an object holding both:
 * reading them back out of a returned object slowed every power-iteration step 1.15x (issue #5821).
 */

/**
 * The weights of the reverse arcs the walk follows.
 * @param rev - The reverse view
 * @param weighted - Whether the walk is weighted
 * @param exact - The f64 edge weights, or null
 * @returns One weight per reverse arc, or null when unweighted
 */
function reverseWeights(rev: ReverseView, weighted: boolean, exact: F64 | null): NumericVector | null {
    if (exact !== null) {
        return gather(exact, rev.arcToEdge);
    }
    return weighted ? rev.weights : null;
}

/**
 * Each node's out-weight: its out-degree when unweighted.
 * @param s - The snapshot
 * @param weighted - Whether the walk is weighted
 * @param exact - The f64 edge weights, or null
 * @returns One out-weight per node
 */
function outWeights(s: GraphSnapshot, weighted: boolean, exact: F64 | null): NumericVector {
    if (exact !== null) {
        return rowSums(s, gather(exact, s.arcToEdge));
    }
    return weighted ? s.weightedOutDegree() : s.outDegree();
}

/**
 * The total rank held by nodes with no out-weight.
 * @param rank - The current ranks
 * @param outW - The out-weight of every node
 * @param n - The node count
 * @returns The dangling mass
 */
function danglingMass(rank: F64, outW: NumericVector, n: number): number {
    let dangling = 0;
    for (let u = 0; u < n; u++) {
        if (outW[u] === 0) {
            dangling += rank[u];
        }
    }
    return dangling;
}

/**
 * The rank flowing into `v` along its in-arcs, before damping.
 * @param rowPtr - The reverse view's row offsets
 * @param colIdx - The reverse view's arc sources
 * @param revW - The reverse-arc weights, or null when unweighted
 * @param outW - The out-weight of every node
 * @param rank - The current ranks
 * @param v - The node
 * @returns The undamped inflow
 */
function inflow(
    rowPtr: U32,
    colIdx: U32,
    revW: NumericVector | null,
    outW: NumericVector,
    rank: F64,
    v: number,
): number {
    let acc = 0;
    const end = rowPtr[v + 1];
    for (let a = rowPtr[v]; a < end; a++) {
        const u = colIdx[a];
        const ow = outW[u];
        if (ow > 0) {
            acc += (rank[u] * (revW === null ? 1 : revW[a])) / ow;
        }
    }
    return acc;
}

/**
 * One power-iteration step from `rank` into `next`.
 * @returns The change, by the chosen norm
 * @param arrays - The adjacency and out-weights
 * @param revW - The reverse-arc weights, or null when unweighted
 * @param p - The normalised personalization, or null for the uniform teleport
 * @param d - The damping factor
 * @param useMax - Measure the change by the max norm rather than L1
 * @param rank - The current ranks
 * @param next - Where the new ranks go
 */
function powerStep(
    arrays: PowerArrays,
    revW: NumericVector | null,
    p: F64 | null,
    d: number,
    useMax: boolean,
    rank: F64,
    next: F64,
): number {
    const { revPtr, revIdx, outW } = arrays;
    const n = rank.length;
    const dangling = danglingMass(rank, outW, n);
    // Teleport (1 - d) spread by p or uniformly; the dangling mass d * dangling spread uniformly,
    // and with p scaled by p[v] on top of the uniform 1 / n, as the legacy function does.
    const spread = 1 - d + d * dangling * (p === null ? 1 : 1 / n);
    let delta = 0;
    for (let v = 0; v < n; v++) {
        next[v] = spread * (p === null ? 1 / n : p[v]) + d * inflow(revPtr, revIdx, revW, outW, rank, v);
        const change = Math.abs(next[v] - rank[v]);
        delta = useMax ? Math.max(delta, change) : delta + change;
    }
    return delta;
}

/**
 * The shared power iteration.
 * @param s - The snapshot
 * @param p - The normalised personalization, or null for the uniform teleport
 * @param o - Algorithm options
 * @returns The scores, the iteration count and the convergence flag
 */
function run(s: GraphSnapshot, p: F64 | null, o: PageRankOptions): PageRankResult {
    const n = s.nodeCount;
    const maxIter = o.maxIterations ?? 100;
    const tol = o.tolerance ?? 1e-6;
    if (n === 0) {
        return { scores: new Float64Array(0), iterations: 0, converged: true };
    }
    const rev = s.reverse();
    const weighted = readsWeights(rev, o.weighted);
    const exact = weighted ? exactWeights(s) : null;
    const revW = reverseWeights(rev, weighted, exact);
    const outW = outWeights(s, weighted, exact);
    const arrays: PowerArrays = { revPtr: rev.rowPtr, revIdx: rev.colIdx, outW };
    const d = o.dampingFactor ?? 0.85;
    const useMax = o.convergenceNorm === "max";
    let rank =
        (o.initialRanks === undefined ? null : distribution(o.initialRanks, n, "initialRanks")) ??
        new Float64Array(n).fill(o.initialRanks === undefined ? 1 / n : 0);
    let next = new Float64Array(n);
    let it = 0;
    let converged = false;
    for (; it < maxIter && !converged; it++) {
        const delta = powerStep(arrays, revW, p, d, useMax, rank, next);
        [rank, next] = [next, rank];
        converged = delta < tol;
    }
    return { scores: rank, iterations: it, converged };
}

/**
 * One value per arc, read through the arc's logical edge.
 * @param perEdge - One value per logical edge
 * @param arcToEdge - The logical edge of every arc
 * @returns One value per arc
 */
function gather(perEdge: F64, arcToEdge: Uint32Array): F64 {
    const out = new Float64Array(arcToEdge.length);
    for (let a = 0; a < out.length; a++) {
        out[a] = perEdge[arcToEdge[a]];
    }
    return out;
}

/**
 * The sum of each node's out-arc values.
 * @param s - The snapshot
 * @param perArc - One value per forward arc
 * @returns One sum per node
 */
function rowSums(s: GraphSnapshot, perArc: F64): F64 {
    const out = new Float64Array(s.nodeCount);
    for (let u = 0; u < s.nodeCount; u++) {
        for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
            out[u] += perArc[a];
        }
    }
    return out;
}

/**
 * Check a per-node mass vector and normalise it to sum 1.
 * @param v - The caller's vector
 * @param n - The node count
 * @param name - The option's name, for the message
 * @returns A normalised copy, or null when every entry is 0
 */
function distribution(v: F32 | F64, n: number, name: string): F64 | null {
    if (v.length !== n) {
        throw withCode(
            new Error(`PageRank: ${name} has ${String(v.length)} entries for ${String(n)} nodes`),
            "E_BAD_OPTION",
        );
    }
    let total = 0;
    for (const mass of v) {
        if (!Number.isFinite(mass) || mass < 0) {
            throw withCode(
                new Error(`PageRank: ${name} must be finite and non-negative, got ${String(mass)}`),
                "E_BAD_OPTION",
            );
        }
        total += mass;
    }
    if (total === 0) {
        return null;
    }
    const out = new Float64Array(n);
    for (let u = 0; u < n; u++) {
        out[u] = v[u] / total;
    }
    return out;
}
