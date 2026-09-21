/**
 * The f64 references of HITS, eigenvector centrality and Katz centrality (spec 8.2, 9.7; M8b-T6), each running the
 * SAME recurrence the device runs: x(i) = A * (x(i-1) / ||x(i-1)||) for the two normalised ones (sum for HITS, L2
 * for eigenvector) and x(i) = alpha * A * x(i-1) + beta for Katz, from x(0) = 1 / n. `A * y` over the FORWARD
 * arrays is y pulled along the out-arcs of each row (hubs, eigenvector); over the REVERSE arrays it is y pulled
 * along the in-arcs (authorities, Katz). HITS is `a(i) = A^T norm(h(i-1))`, `h(i) = A norm(a(i-1))`, run as the
 * device runs it: two chains that alternate the reverse and the forward pull, one seeded as hubs and one as
 * authorities. The oracle runs exactly `maxIterations` iterations, as the device runs a whole batch, and records
 * the first iteration i whose L1 delta sum |x(i) - x(i-p)| (p = 1, or 2 for an alternating chain, whose previous
 * iterate of the same kind is two back) fell below n * tolerance -- but only when a later iteration ran, because
 * the device records that delta one iteration late (PD-9: `pr-scale` at iteration i + 1 compares x(i) with the
 * iterate it is about to overwrite) and so never observes convergence at iteration maxIterations itself. The final
 * vector is normalised ONCE at the end (sum for HITS, L2 for eigenvector and Katz). The reverse adjacency is walked
 * the way graph-format materialises it, never the device.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

/** The options every spectral oracle takes: the iteration cap, the tolerance and whether the snapshot's weights are folded. */
export interface SpectralOracleOptions {
    readonly maxIterations: number;
    readonly tolerance: number;
    readonly weighted: boolean;
}

/**
 * One vector result: the scores (normalised once at the end), the 1-based first converged iteration (maxIterations
 * when it never converged) and whether it converged. Exported for the signatures, not imported by name.
 * @public
 */
export interface SpectralOracleResult {
    readonly scores: Float64Array;
    readonly iterations: number;
    readonly converged: boolean;
}

/**
 * The HITS result: the hubs (the forward pull) and the authorities (the reverse pull), the larger iteration count
 * and the conjunction of the two convergences. Exported for hitsOracle's signature, not imported by name.
 * @public
 */
export interface HitsOracleResult {
    readonly hubs: Float64Array;
    readonly authorities: Float64Array;
    readonly iterations: number;
    readonly converged: boolean;
}

/** The CSR arrays one recurrence walks. */
interface Adjacency {
    readonly n: number;
    readonly rowPtr: Uint32Array;
    readonly colIdx: Uint32Array;
    readonly weights: Float32Array | null;
}

/** The recurrence's coefficients: the per-iteration normaliser (null for Katz), alpha and beta. */
interface Recurrence {
    readonly norm: "sum" | "l2" | null;
    readonly alpha: number;
    readonly beta: number;
}

/**
 * The forward arrays of a snapshot.
 * @param s - the snapshot
 * @param weighted - whether the weights are folded (false folds 1 per arc)
 * @returns the adjacency
 */
function forwardOf(s: GraphSnapshot, weighted: boolean): Adjacency {
    return { n: s.nodeCount, rowPtr: s.rowPtr, colIdx: s.colIdx, weights: weighted ? s.weights : null };
}

/**
 * The reverse arrays of a snapshot (the forward ones when undirected, graph-format invariant I7).
 * @param s - the snapshot
 * @param weighted - whether the weights are folded (false folds 1 per arc)
 * @returns the adjacency
 */
function reverseOf(s: GraphSnapshot, weighted: boolean): Adjacency {
    const rev = s.reverse();
    return { n: s.nodeCount, rowPtr: rev.rowPtr, colIdx: rev.colIdx, weights: weighted ? rev.weights : null };
}

/**
 * The norm of a vector under a normaliser.
 * @param x - the vector
 * @param norm - "sum" (L1) or "l2"
 * @returns the norm
 */
function normOf(x: Float64Array, norm: "sum" | "l2"): number {
    let acc = 0;
    for (const v of x) {
        acc += norm === "sum" ? Math.abs(v) : v * v;
    }
    return norm === "sum" ? acc : Math.sqrt(acc);
}

/**
 * Divides a vector by its norm in place; a non-positive norm leaves it unchanged (the device's `scale <= 0 -> 1`).
 * @param x - the vector
 * @param norm - the normaliser
 * @returns the same vector
 */
function normalise(x: Float64Array, norm: "sum" | "l2"): Float64Array {
    const scale = normOf(x, norm);
    if (scale > 0) {
        for (let v = 0; v < x.length; v++) {
            x[v] /= scale;
        }
    }
    return x;
}

/**
 * Exactly `maxIterations` iterations of x(i) = beta + alpha * A * norm(x(i-1)), the adjacencies taken in turn,
 * recording the first converged one that a later iteration observed (see the file comment).
 * @param adjacencies - the arrays the pulls walk, one per iteration in turn (one, or the alternating pair)
 * @param recurrence - the normaliser and the coefficients
 * @param options - the iteration cap and the tolerance
 * @returns the raw final iterate (NOT normalised), the first converged iteration and whether one was found
 */
function iterate(
    adjacencies: readonly Adjacency[],
    recurrence: Recurrence,
    options: SpectralOracleOptions,
): SpectralOracleResult {
    const { n } = adjacencies[0];
    const period = adjacencies.length;
    // the last `period` iterates x(i-p) .. x(i-1), oldest first; absent ones are the device's zero-filled ring slots
    const recent: Float64Array[] = Array.from({ length: period - 1 }, () => new Float64Array(n));
    recent.push(new Float64Array(n).fill(1 / n));
    let first = 0;
    for (let iteration = 1; iteration <= options.maxIterations; iteration++) {
        const adj = adjacencies[(iteration - 1) % period];
        const x = recent[period - 1];
        const prev = recent[0];
        const y = recurrence.norm === null ? x : normalise(Float64Array.from(x), recurrence.norm);
        const next = new Float64Array(n);
        let err = 0;
        for (let v = 0; v < n; v++) {
            let acc = 0;
            for (let arc = adj.rowPtr[v]; arc < adj.rowPtr[v + 1]; arc++) {
                acc += (adj.weights === null ? 1 : adj.weights[arc]) * y[adj.colIdx[arc]];
            }
            next[v] = recurrence.beta + recurrence.alpha * acc;
            err += Math.abs(next[v] - prev[v]);
        }
        recent.shift();
        recent.push(next);
        if (first === 0 && err < n * options.tolerance && iteration < options.maxIterations) {
            first = iteration;
        }
    }
    return {
        scores: recent[period - 1],
        iterations: first === 0 ? options.maxIterations : first,
        converged: first !== 0,
    };
}

/**
 * One normalised run: the raw iterate normalised once at the end.
 * @param adjacencies - the arrays, one per iteration in turn
 * @param recurrence - the normaliser and the coefficients
 * @param finalNorm - the normaliser applied once to the final iterate
 * @param options - the iteration cap and the tolerance
 * @returns the result
 */
function run(
    adjacencies: readonly Adjacency[],
    recurrence: Recurrence,
    finalNorm: "sum" | "l2",
    options: SpectralOracleOptions,
): SpectralOracleResult {
    if (adjacencies[0].n === 0) {
        return { scores: new Float64Array(0), iterations: 0, converged: true };
    }
    const raw = iterate(adjacencies, recurrence, options);
    return { ...raw, scores: normalise(raw.scores, finalNorm) };
}

/**
 * HITS in f64: a(i) = A^T norm(h(i-1)) over the in-arcs and h(i) = A norm(a(i-1)) over the out-arcs, sum-normalised,
 * as two chains alternating the two pulls: the hub-seeded chain pulls the in-arcs first and holds h(m) after an even
 * m and a(m) after an odd one; the authority-seeded chain is its mirror image. Both chains run exactly
 * maxIterations, so `hubs` is h(maxIterations) and `authorities` a(maxIterations) whichever chain holds them; the
 * device's chains may stop at different counts, and its result is the latest of each kind, which a test pins by
 * calling this oracle at each chain's count.
 * @param s - the snapshot
 * @param options - maxIterations, tolerance, weighted
 * @returns hubs, authorities, the larger iteration count and the conjunction of the two convergences
 */
export function hitsOracle(s: GraphSnapshot, options: SpectralOracleOptions): HitsOracleResult {
    const recurrence: Recurrence = { norm: "sum", alpha: 1, beta: 0 };
    const forward = forwardOf(s, options.weighted);
    const reverse = reverseOf(s, options.weighted);
    const hubSeeded = run([reverse, forward], recurrence, "sum", options);
    const authoritySeeded = run([forward, reverse], recurrence, "sum", options);
    const even = options.maxIterations % 2 === 0;
    return {
        hubs: (even ? hubSeeded : authoritySeeded).scores,
        authorities: (even ? authoritySeeded : hubSeeded).scores,
        iterations: Math.max(hubSeeded.iterations, authoritySeeded.iterations),
        converged: hubSeeded.converged && authoritySeeded.converged,
    };
}

/**
 * Eigenvector centrality in f64: the L2-normalised power iteration over the out-arcs.
 * @param s - the snapshot
 * @param options - maxIterations, tolerance, weighted
 * @returns the L2-normalised scores, the first converged iteration and whether it converged
 */
export function eigenvectorOracle(s: GraphSnapshot, options: SpectralOracleOptions): SpectralOracleResult {
    return run([forwardOf(s, options.weighted)], { norm: "l2", alpha: 1, beta: 0 }, "l2", options);
}

/**
 * Katz centrality in f64: x(i) = alpha * A^T x(i-1) + beta over the in-arcs, L2-normalised once at the end.
 * @param s - the snapshot
 * @param options - maxIterations, tolerance, weighted, plus alpha (the attenuation) and beta (the constant term)
 * @returns the L2-normalised scores, the first converged iteration and whether it converged
 */
export function katzOracle(
    s: GraphSnapshot,
    options: SpectralOracleOptions & { readonly alpha: number; readonly beta: number },
): SpectralOracleResult {
    return run([reverseOf(s, options.weighted)], { norm: null, alpha: options.alpha, beta: options.beta }, "l2", options);
}
