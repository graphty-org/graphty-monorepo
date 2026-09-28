import type { F64, GraphSnapshot } from "@graphty/graph-format";

/** Options of the index-based Katz centrality, matching the legacy `katzCentrality`. @public */
export interface KatzOptions {
    /** Attenuation factor applied to a neighbour's score; default 0.1. */
    readonly alpha?: number | undefined;
    /** Base score every node starts with and keeps; default 1. */
    readonly beta?: number | undefined;
    /** Iteration cap; default 100. */
    readonly maxIterations?: number | undefined;
    /** Convergence tolerance on the largest single-node change; default 1e-6. */
    readonly tolerance?: number | undefined;
    /** Rescale the scores to [0, 1] by min-max, as the legacy function does; default true. */
    readonly normalized?: boolean | undefined;
    /** Weight a neighbour's contribution by the arc weight; default false. */
    readonly weighted?: boolean | undefined;
}

/** Result of the index-based Katz centrality. @public */
export interface KatzResult {
    /** Score per node index. */
    readonly scores: F64;
    /** Iterations actually run. */
    readonly iterations: number;
    /** Whether the largest single-node change fell below the tolerance. */
    readonly converged: boolean;
}

/**
 * Rescale a vector in place so its smallest entry is 0 and its largest 1, as the legacy function
 * does; left alone when every entry is equal.
 * @param v - The vector to scale
 */
export function minMaxNormalize(v: Float64Array): void {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < v.length; i++) {
        if (v[i] < min) {
            min = v[i];
        }
        if (v[i] > max) {
            max = v[i];
        }
    }
    const range = max - min;
    if (range > 0) {
        for (let i = 0; i < v.length; i++) {
            v[i] = (v[i] - min) / range;
        }
    }
}

/**
 * Katz centrality by power iteration over incoming arcs: `x[v] = alpha * sum(x[u] for u -> v) + beta`.
 *
 * `reverse()` supplies the in-arcs, and is the forward adjacency itself on an undirected snapshot,
 * so one loop serves both directions exactly as the legacy function's in-neighbours / neighbours
 * split does.
 * @param s - The snapshot
 * @param o - Algorithm options
 * @returns The scores, the iteration count and the convergence flag
 * @public
 */
export function katzCentrality(s: GraphSnapshot, o: KatzOptions = {}): KatzResult {
    const n = s.nodeCount;
    const alpha = o.alpha ?? 0.1;
    const beta = o.beta ?? 1;
    const maxIter = o.maxIterations ?? 100;
    const tol = o.tolerance ?? 1e-6;
    const rev = s.reverse();
    const weights = o.weighted === true ? rev.weights : null;
    let cur = new Float64Array(n).fill(beta);
    let next = new Float64Array(n);
    let it = 0;
    let converged = false;
    for (; it < maxIter && !converged; it++) {
        let maxDiff = 0;
        for (let v = 0; v < n; v++) {
            let sum = 0;
            const end = rev.rowPtr[v + 1];
            for (let a = rev.rowPtr[v]; a < end; a++) {
                sum += cur[rev.colIdx[a]] * (weights === null ? 1 : weights[a]);
            }
            next[v] = alpha * sum + beta;
            const diff = Math.abs(next[v] - cur[v]);
            if (diff > maxDiff) {
                maxDiff = diff;
            }
        }
        [cur, next] = [next, cur];
        converged = maxDiff < tol;
    }
    if (o.normalized !== false) {
        minMaxNormalize(cur);
    }
    return { scores: cur, iterations: it, converged };
}
