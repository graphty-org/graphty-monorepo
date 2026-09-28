import type { F32, F64, GraphSnapshot, NumericVector } from "@graphty/graph-format";

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
 * Personalized PageRank: the personalization vector, normalised to sum 1, replaces the uniform
 * `1 / n` both in the teleport and in the redistribution of the dangling mass, as networkx does.
 * @param s - The snapshot
 * @param personalization - One finite, non-negative mass per node index, not all zero
 * @param o - Algorithm options
 * @returns The scores, the iteration count and the convergence flag
 * @public
 */
export function personalizedPageRank(
    s: GraphSnapshot,
    personalization: F32 | F64,
    o: PageRankOptions = {},
): PageRankResult {
    const p = distribution(personalization, s.nodeCount, "personalization");
    if (p === null) {
        throw new Error("personalizedPageRank: personalization must not be all zero");
    }
    return run(s, p, o);
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
    const rev = s.reverse();
    const weighted = o.weighted === true && rev.weights !== null;
    const outW: NumericVector = weighted ? s.weightedOutDegree() : s.outDegree();
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
        // Teleport plus dangling mass: (1 - d) + d * dangling in total, spread by p or uniformly.
        const spread = 1 - d + d * dangling;
        let delta = 0;
        for (let v = 0; v < n; v++) {
            let acc = 0;
            const end = rev.rowPtr[v + 1];
            for (let a = rev.rowPtr[v]; a < end; a++) {
                const u = rev.colIdx[a];
                const ow = outW[u];
                if (ow > 0) {
                    acc += (rank[u] * (weighted && rev.weights !== null ? rev.weights[a] : 1)) / ow;
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
 * Check a per-node mass vector and normalise it to sum 1.
 * @param v - The caller's vector
 * @param n - The node count
 * @param name - The option's name, for the message
 * @returns A normalised copy, or null when every entry is 0
 */
function distribution(v: F32 | F64, n: number, name: string): F64 | null {
    if (v.length !== n) {
        throw new Error(`PageRank: ${name} has ${String(v.length)} entries for ${String(n)} nodes`);
    }
    let total = 0;
    for (const mass of v) {
        if (!Number.isFinite(mass) || mass < 0) {
            throw new Error(`PageRank: ${name} must be finite and non-negative, got ${String(mass)}`);
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
