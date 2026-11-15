import type { AdjacencyView, F32, F64, GraphSnapshot } from "@graphty/graph-format";

import { checkNumber, checkWeights, ConvergenceError } from "../errors.js";
import { readsWeights } from "./weights.js";

/** Options of the index-based Katz centrality, matching the legacy `katzCentrality`. @public */
export interface KatzOptions {
    /**
     * Attenuation factor applied to a neighbour's score; default 0.1. Must be at least 0 and below 1 / lambda_max, the
     * reciprocal of the graph's largest adjacency eigenvalue, or the series diverges and the call throws
     * `ConvergenceError`: a complete graph on 11 nodes, or a star with 100 leaves, already needs less than 0.1.
     */
    readonly alpha?: number | undefined;
    /** Base score every node starts with and keeps; default 1. */
    readonly beta?: number | undefined;
    /** Iteration cap; default 100. */
    readonly maxIterations?: number | undefined;
    /**
     * Convergence tolerance; default 1e-6. The run stops at the first iteration whose summed (L1) change over all
     * nodes is below `tolerance` times the summed size of the scores (or is exactly 0), a change of `tolerance`
     * relative to the whole vector at any node count, as webgpu-graph-algorithms' katzCentrality stops.
     */
    readonly tolerance?: number | undefined;
    /** Rescale the scores to [0, 1] by min-max, as the legacy function does; default true. */
    readonly normalized?: boolean | undefined;
    /** Weight a neighbour's contribution by the arc weight when the snapshot has weights; default true. */
    readonly weighted?: boolean | undefined;
}

/** Result of the index-based Katz centrality. @public */
export interface KatzResult {
    /** Score per node index. */
    readonly scores: F64;
    /** Iterations actually run. */
    readonly iterations: number;
    /** Always true: a run that does not converge throws `ConvergenceError` instead. */
    readonly converged: boolean;
}

/**
 * One power-iteration round: `next[v] = alpha * sum(cur[u] * w(u, v)) + beta` over the in-arcs.
 * @param rev - The in-arc adjacency
 * @param weights - The in-arc weights, or null for unit weights
 * @param cur - The current scores
 * @param next - Receives the new scores
 * @param alpha - Attenuation factor
 * @param beta - Base score
 * @returns The summed (L1) change and the summed size of `next`
 */
function katzStep(
    rev: AdjacencyView,
    weights: F32 | null,
    cur: Float64Array,
    next: Float64Array,
    alpha: number,
    beta: number,
): { change: number; size: number } {
    const { rowPtr, colIdx } = rev;
    let change = 0;
    let size = 0;
    for (let v = 0; v < next.length; v++) {
        let sum = 0;
        const end = rowPtr[v + 1];
        for (let a = rowPtr[v]; a < end; a++) {
            sum += cur[colIdx[a]] * (weights === null ? 1 : weights[a]);
        }
        next[v] = alpha * sum + beta;
        change += Math.abs(next[v] - cur[v]);
        size += Math.abs(next[v]);
    }
    return { change, size };
}

/**
 * Rescale a vector to [0, 1] by min-max, in place; a constant vector is left alone.
 * @param v - The vector to rescale
 */
function minMaxNormalize(v: Float64Array): void {
    let min = Infinity;
    let max = -Infinity;
    for (const x of v) {
        if (x < min) {
            min = x;
        }
        if (x > max) {
            max = x;
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
 * Refuse Katz options out of range, and NaN, infinite or negative weights when the run reads them.
 * @param s - The snapshot
 * @param o - Algorithm options
 * @internal
 */
export function checkKatzOptions(s: GraphSnapshot, o: KatzOptions | undefined): void {
    checkNumber("katzCentrality", "alpha", o?.alpha ?? 0.1, { min: 0 });
    checkNumber("katzCentrality", "beta", o?.beta ?? 1, {});
    checkNumber("katzCentrality", "maxIterations", o?.maxIterations ?? 100, { min: 1, integer: true });
    checkNumber("katzCentrality", "tolerance", o?.tolerance ?? 1e-6, { above: 0 });
    checkWeights("katzCentrality", readsWeights(s, o?.weighted) ? s.weights : null);
}

/**
 * Katz centrality by power iteration over incoming arcs: `x[v] = alpha * sum(x[u] for u -> v) + beta`.
 *
 * `reverse()` supplies the in-arcs, and is the forward adjacency itself on an undirected snapshot,
 * so one loop serves both directions exactly as the legacy function's in-neighbours / neighbours
 * split does.
 * The series converges only when alpha is below 1 / lambda_max (the reciprocal of the largest
 * eigenvalue of the adjacency); above it the scores grow without bound and the run reaches its cap.
 * @param s - The snapshot
 * @param o - Algorithm options
 * @returns The scores, the iteration count and the convergence flag
 * @throws RangeError (code `E_BAD_OPTION`) for an alpha, beta, maxIterations or tolerance out of range, or (code
 *   `E_BAD_WEIGHT`) for a NaN, infinite or negative weight when the run reads weights
 * @throws ConvergenceError when the cap is reached before the tolerance is met, as it is whenever alpha is too large
 * @public
 */
export function katzCentrality(s: GraphSnapshot, o: KatzOptions = {}): KatzResult {
    const n = s.nodeCount;
    const alpha = o.alpha ?? 0.1;
    const beta = o.beta ?? 1;
    const maxIter = o.maxIterations ?? 100;
    const tol = o.tolerance ?? 1e-6;
    checkKatzOptions(s, o);
    const rev = s.reverse();
    const weights = readsWeights(rev, o.weighted) ? rev.weights : null;
    let cur = new Float64Array(n).fill(beta);
    let next = new Float64Array(n);
    let it = 0;
    let converged = false;
    for (; it < maxIter && !converged; it++) {
        const { change, size } = katzStep(rev, weights, cur, next, alpha, beta);
        [cur, next] = [next, cur];
        converged = change < tol * size || change === 0;
    }
    if (!converged) {
        throw new ConvergenceError("katzCentrality", maxIter, tol);
    }
    if (o.normalized !== false) {
        minMaxNormalize(cur);
    }
    return { scores: cur, iterations: it, converged };
}
