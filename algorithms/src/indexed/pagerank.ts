import type { F32, F64, GraphSnapshot, NumericVector } from "@graphty/graph-format";

import { withCode } from "../errors.js";

/** Options of the index-based PageRank (graph-format design 14.2 Port 3). @public */
export interface PageRankOptions {
    /** Probability of following a link; default 0.85. */
    readonly dampingFactor?: number | undefined;
    /** Iteration cap; default 100. */
    readonly maxIterations?: number | undefined;
    /** Convergence tolerance on the per-iteration change; default 1e-6. */
    readonly tolerance?: number | undefined;
    /** Use the snapshot's arc weights; default false. */
    readonly weighted?: boolean | undefined;
    /** Starting rank per node index, normalised to sum 1 (when the sum is positive); default uniform. */
    readonly initialRanks?: F32 | F64 | undefined;
    /**
     * How the per-iteration change is measured against `tolerance`: `"l1"` (default) sums it over
     * all nodes, `"max"` takes the largest single-node change, the legacy `pageRank` rule.
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
 * The shared power iteration.
 * @param s - The snapshot
 * @param p - The normalised personalization, or null for the uniform teleport
 * @param o - Algorithm options
 * @returns The scores, the iteration count and the convergence flag
 */
function run(s: GraphSnapshot, p: F64 | null, o: PageRankOptions): PageRankResult {
    const n = s.nodeCount;
    const d = o.dampingFactor ?? 0.85;
    const maxIter = o.maxIterations ?? 100;
    const tol = o.tolerance ?? 1e-6;
    const useMax = o.convergenceNorm === "max";
    if (n === 0) {
        return { scores: new Float64Array(0), iterations: 0, converged: true };
    }
    const rev = s.reverse();
    const weighted = o.weighted === true && rev.weights !== null;
    // The f64 shadow toSnapshot keeps when a weight is not f32-exact, else the f32 arc weights.
    const shadow = weighted ? s.edges.byRole("weight") : null;
    const exact = shadow?.dtype === "f64" ? shadow.data : null;
    let revW: NumericVector | null = weighted ? rev.weights : null;
    let outW: NumericVector = weighted ? s.weightedOutDegree() : s.outDegree();
    if (exact !== null) {
        revW = gather(exact, rev.arcToEdge);
        outW = rowSums(s, gather(exact, s.arcToEdge));
    }
    let rank =
        (o.initialRanks === undefined ? null : distribution(o.initialRanks, n, "initialRanks")) ??
        new Float64Array(n).fill(o.initialRanks === undefined ? 1 / n : 0);
    let next = new Float64Array(n);
    let it = 0;
    let converged = false;
    for (; it < maxIter && !converged; it++) {
        let dangling = 0;
        for (let u = 0; u < n; u++) {
            if (outW[u] === 0) {
                dangling += rank[u];
            }
        }
        // Teleport (1 - d) spread by p or uniformly; the dangling mass d * dangling spread uniformly,
        // and with p scaled by p[v] on top of the uniform 1 / n, as the legacy function does.
        const spread = 1 - d + d * dangling * (p === null ? 1 : 1 / n);
        let delta = 0;
        for (let v = 0; v < n; v++) {
            let acc = 0;
            const end = rev.rowPtr[v + 1];
            for (let a = rev.rowPtr[v]; a < end; a++) {
                const u = rev.colIdx[a];
                const ow = outW[u];
                if (ow > 0) {
                    acc += (rank[u] * (revW === null ? 1 : revW[a])) / ow;
                }
            }
            next[v] = spread * (p === null ? 1 / n : p[v]) + d * acc;
            const change = Math.abs(next[v] - rank[v]);
            delta = useMax ? Math.max(delta, change) : delta + change;
        }
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
