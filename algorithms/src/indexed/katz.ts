import type { AdjacencyView, F32, F64, GraphSnapshot } from "@graphty/graph-format";

import { checkNumber, checkWeights, ConvergenceError } from "../errors.js";

/** Options of the index-based Katz centrality, matching the legacy `katzCentrality`. @public */
export interface KatzOptions {
    /**
     * Attenuation factor applied to a neighbour's score. Must be at least 0 and below 1 / lambda_max, the reciprocal
     * of the graph's largest adjacency eigenvalue, or the series diverges and the call throws `ConvergenceError`.
     * Omitted, it is derived from the graph so the series always converges: 0.1 where that is safe, else
     * 1 / (2 * an upper bound on lambda_max) -- Les Miserables, whose lambda_max is about 12, gets about 0.018.
     */
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
 * @returns The largest single-node change
 */
function katzStep(
    rev: AdjacencyView,
    weights: F32 | null,
    cur: Float64Array,
    next: Float64Array,
    alpha: number,
    beta: number,
): number {
    const { rowPtr, colIdx } = rev;
    let maxDiff = 0;
    for (let v = 0; v < next.length; v++) {
        let sum = 0;
        const end = rowPtr[v + 1];
        for (let a = rowPtr[v]; a < end; a++) {
            sum += cur[colIdx[a]] * (weights === null ? 1 : weights[a]);
        }
        next[v] = alpha * sum + beta;
        const diff = Math.abs(next[v] - cur[v]);
        if (diff > maxDiff) {
            maxDiff = diff;
        }
    }
    return maxDiff;
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

/** The conventional Katz alpha, the default wherever it is certain to converge quickly. */
const CONVENTIONAL_ALPHA = 0.1;

/**
 * An upper bound on the spectral radius of the in-arc adjacency: the largest `sqrt(r_u * r_v)` over its arcs u -> v,
 * where `r` is a node's in-arc total (absolute weights when `weighted`). Scale the matrix by `diag(sqrt(r))` and each
 * row sum is at most that, by Cauchy-Schwarz. It is tight on a star: a hub of degree d has radius sqrt(d).
 * @param s - The snapshot
 * @param weighted - Whether arcs count by their weight
 * @returns The bound; 0 on a graph with no arcs
 * @internal
 */
export function katzRadiusBound(s: GraphSnapshot, weighted: boolean): number {
    const { rowPtr, colIdx, weights } = s.reverse();
    const w = weighted ? weights : null;
    const totals = new Float64Array(s.nodeCount);
    for (let v = 0; v < s.nodeCount; v++) {
        for (let a = rowPtr[v]; a < rowPtr[v + 1]; a++) {
            totals[v] += w === null ? 1 : Math.abs(w[a]);
        }
    }
    let largest = 0;
    for (let v = 0; v < s.nodeCount; v++) {
        for (let a = rowPtr[v]; a < rowPtr[v + 1]; a++) {
            largest = Math.max(largest, totals[v] * totals[colIdx[a]]);
        }
    }
    return Math.sqrt(largest);
}

/**
 * The alpha a run uses: the caller's, or else 0.1, unless the graph's spectral radius could pass 1 / (2 * 0.1), and
 * then 1 / (2 * the radius's upper bound). Either way alpha times the radius stays at or below 1/2, so the series
 * converges, and in a few dozen iterations, on every graph.
 * @param s - The snapshot
 * @param o - Algorithm options
 * @returns The caller's alpha, or the derived one
 * @public
 */
export function katzAlpha(s: GraphSnapshot, o: KatzOptions | undefined): number {
    if (o?.alpha !== undefined) {
        return o.alpha;
    }
    const bound = katzRadiusBound(s, o?.weighted === true);
    return bound * CONVENTIONAL_ALPHA <= 0.5 ? CONVENTIONAL_ALPHA : 0.5 / bound;
}

/**
 * Refuse Katz options out of range, and NaN, infinite or negative weights when `weighted` is set.
 * @param s - The snapshot
 * @param o - Algorithm options
 * @internal
 */
export function checkKatzOptions(s: GraphSnapshot, o: KatzOptions | undefined): void {
    checkNumber("katzCentrality", "alpha", o?.alpha ?? 0.1, { min: 0 });
    checkNumber("katzCentrality", "beta", o?.beta ?? 1, {});
    checkNumber("katzCentrality", "maxIterations", o?.maxIterations ?? 100, { min: 1, integer: true });
    checkNumber("katzCentrality", "tolerance", o?.tolerance ?? 1e-6, { above: 0 });
    checkWeights("katzCentrality", o?.weighted === true ? s.weights : null);
}

/**
 * Katz centrality by power iteration over incoming arcs: `x[v] = alpha * sum(x[u] for u -> v) + beta`.
 *
 * `reverse()` supplies the in-arcs, and is the forward adjacency itself on an undirected snapshot,
 * so one loop serves both directions exactly as the legacy function's in-neighbours / neighbours
 * split does.
 * The series converges only when alpha is below 1 / lambda_max (the reciprocal of the largest
 * eigenvalue of the adjacency); above it the scores grow without bound and the run reaches its cap. An omitted
 * alpha is derived from the graph so that it converges (see `KatzOptions.alpha`).
 * @param s - The snapshot
 * @param o - Algorithm options
 * @returns The scores, the iteration count and the convergence flag
 * @throws RangeError (code `E_BAD_OPTION`) for an alpha, beta, maxIterations or tolerance out of range, or (code
 *   `E_BAD_WEIGHT`) for a NaN, infinite or negative weight when `weighted` is set
 * @throws ConvergenceError when the cap is reached before the tolerance is met, as it is whenever alpha is too large
 * @public
 */
export function katzCentrality(s: GraphSnapshot, o: KatzOptions = {}): KatzResult {
    const n = s.nodeCount;
    const beta = o.beta ?? 1;
    const maxIter = o.maxIterations ?? 100;
    const tol = o.tolerance ?? 1e-6;
    checkKatzOptions(s, o);
    const alpha = katzAlpha(s, o);
    const rev = s.reverse();
    const weights = o.weighted === true ? rev.weights : null;
    let cur = new Float64Array(n).fill(beta);
    let next = new Float64Array(n);
    let it = 0;
    let converged = false;
    for (; it < maxIter && !converged; it++) {
        const maxDiff = katzStep(rev, weights, cur, next, alpha, beta);
        [cur, next] = [next, cur];
        converged = maxDiff < tol;
    }
    if (!converged) {
        throw new ConvergenceError("katzCentrality", maxIter, tol);
    }
    if (o.normalized !== false) {
        minMaxNormalize(cur);
    }
    return { scores: cur, iterations: it, converged };
}
