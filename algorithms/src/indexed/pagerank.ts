import type { F64, GraphSnapshot, NumericVector } from "@graphty/graph-format";

/** Options of the index-based PageRank (graph-format design 14.2 Port 3, line 3892). @public */
export interface PageRankOptions {
    /** Probability of following a link; default 0.85. */
    readonly dampingFactor?: number | undefined;
    /** Iteration cap; default 100. */
    readonly maxIterations?: number | undefined;
    /** L1 convergence tolerance; default 1e-6. */
    readonly tolerance?: number | undefined;
    /** Use the snapshot's arc weights; default false. */
    readonly weighted?: boolean | undefined;
}

/** Result of the index-based PageRank. @public */
export interface PageRankResult {
    /** Score per node index. */
    readonly scores: F64;
    /** Iterations actually run. */
    readonly iterations: number;
    /** Whether the L1 delta fell below the tolerance. */
    readonly converged: boolean;
}

/**
 * PageRank by pull over `reverse()`, with the dangling mass redistributed uniformly.
 * @param s - A DIRECTED snapshot
 * @param o - Algorithm options
 * @returns The scores, the iteration count and the convergence flag
 * @public
 */
export function pageRank(s: GraphSnapshot, o: PageRankOptions = {}): PageRankResult {
    if (!s.directed) {
        throw new Error("PageRank requires a directed graph");
    }
    const n = s.nodeCount;
    const d = o.dampingFactor ?? 0.85;
    const maxIter = o.maxIterations ?? 100;
    const tol = o.tolerance ?? 1e-6;
    const rev = s.reverse();
    const weighted = o.weighted === true && rev.weights !== null;
    const outW: NumericVector = weighted ? s.weightedOutDegree() : s.outDegree();
    let rank = new Float64Array(n).fill(1 / n);
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
        const base = (1 - d) / n + (d * dangling) / n;
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
            next[v] = base + d * acc;
            delta += Math.abs(next[v] - rank[v]);
        }
        [rank, next] = [next, rank];
        converged = delta < tol;
    }
    return { scores: rank, iterations: it, converged };
}
