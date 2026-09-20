/**
 * The f64 reference of PageRank with NetworkX's semantics over the snapshot indices (spec 8.2, 9.7): x0 = 1/n,
 * per iteration the out-weight sum per node (the out-degree when unweighted), the dangling mass over the nodes
 * whose sum is not positive, x'[v] = (1 - alpha) pv + alpha (sum over the in-arcs of w x[u] / outWeightSum[u] +
 * dangling pv), err = sum |x' - x|, converged when err < n tolerance. `iterations` is the 1-based index of the first
 * converged iteration. The reverse adjacency is walked the way graph-format materialises it, never the device.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

/** The options of the oracle: the damping, the tolerance, the iteration cap and whether the snapshot's weights are folded. */
export interface PageRankOracleOptions {
    readonly alpha: number;
    readonly tolerance: number;
    readonly maxIterations: number;
    readonly weighted: boolean;
}

/** What pageRankOracle returns: the scores, the first converged iteration (1-based), whether it converged and the dangling mass of the last iteration. */
interface PageRankOracleResult {
    readonly scores: Float64Array;
    readonly iterations: number;
    readonly converged: boolean;
    readonly danglingMass: number;
}

/** The pieces of one snapshot the iteration reads: the reverse arrays, the folded weights and the per-node out-weight sums. */
interface Prepared {
    readonly n: number;
    readonly rowPtr: Uint32Array;
    readonly colIdx: Uint32Array;
    readonly weights: Float32Array | null;
    readonly outWeightSum: Float64Array;
    readonly pv: Float64Array;
}

/**
 * The out-weight sums, the reverse arrays and the normalised personalization of one run.
 * @param s - the snapshot
 * @param weighted - whether the snapshot's weights are folded (false folds 1 per arc)
 * @param personalization - the personalization vector, normalised here to sum 1; omitted, pv is 1 / n everywhere
 * @returns the prepared pieces
 */
function prepare(s: GraphSnapshot, weighted: boolean, personalization?: ArrayLike<number>): Prepared {
    const n = s.nodeCount;
    const fold = weighted ? s.weights : null;
    const outWeightSum = new Float64Array(n);
    for (let u = 0; u < n; u++) {
        let sum = 0;
        for (let arc = s.rowPtr[u]; arc < s.rowPtr[u + 1]; arc++) {
            sum += fold === null ? 1 : fold[arc];
        }
        outWeightSum[u] = sum;
    }
    const pv = new Float64Array(n);
    if (personalization === undefined) {
        pv.fill(n === 0 ? 0 : 1 / n);
    } else {
        let total = 0;
        for (let v = 0; v < n; v++) {
            total += personalization[v];
        }
        for (let v = 0; v < n; v++) {
            pv[v] = personalization[v] / total;
        }
    }
    const rev = s.reverse();
    return { n, rowPtr: rev.rowPtr, colIdx: rev.colIdx, weights: weighted ? rev.weights : null, outWeightSum, pv };
}

/**
 * One NetworkX iteration: x -> x', returning the new iterate, the L1 error and the dangling mass of x.
 * @param p - the prepared pieces
 * @param alpha - the damping factor
 * @param x - the current iterate
 * @returns the next iterate, the error and the dangling mass folded in
 */
function step(
    p: Prepared,
    alpha: number,
    x: Float64Array,
): { next: Float64Array<ArrayBuffer>; err: number; dangling: number } {
    let dangling = 0;
    for (let u = 0; u < p.n; u++) {
        if (p.outWeightSum[u] <= 0) {
            dangling += x[u];
        }
    }
    const next = new Float64Array(p.n);
    let err = 0;
    for (let v = 0; v < p.n; v++) {
        let acc = 0;
        for (let arc = p.rowPtr[v]; arc < p.rowPtr[v + 1]; arc++) {
            const u = p.colIdx[arc];
            acc += ((p.weights === null ? 1 : p.weights[arc]) * x[u]) / p.outWeightSum[u];
        }
        next[v] = (1 - alpha) * p.pv[v] + alpha * (acc + dangling * p.pv[v]);
        err += Math.abs(next[v] - x[v]);
    }
    return { next, err, dangling };
}

/**
 * PageRank with NetworkX's semantics in f64, stopping at the first iteration whose L1 error is below n tolerance.
 * @param s - the snapshot
 * @param options - alpha, tolerance, maxIterations, weighted
 * @param personalization - the per-node personalization (normalised to sum 1); omitted, 1 / n everywhere
 * @returns the scores, the 1-based first converged iteration (maxIterations when it never converged), converged, and the dangling mass of the last iteration
 */
export function pageRankOracle(
    s: GraphSnapshot,
    options: PageRankOracleOptions,
    personalization?: ArrayLike<number>,
): PageRankOracleResult {
    const p = prepare(s, options.weighted, personalization);
    if (p.n === 0) {
        return { scores: new Float64Array(0), iterations: 0, converged: true, danglingMass: 0 };
    }
    let x = new Float64Array(p.n).fill(1 / p.n);
    let danglingMass = 0;
    for (let iteration = 1; iteration <= options.maxIterations; iteration++) {
        const { next, err, dangling } = step(p, options.alpha, x);
        x = next;
        danglingMass = dangling;
        if (err < p.n * options.tolerance) {
            return { scores: x, iterations: iteration, converged: true, danglingMass };
        }
    }
    return { scores: x, iterations: options.maxIterations, converged: false, danglingMass };
}

/**
 * The iterate after exactly k NetworkX iterations, so a parity test compares "after equal iterations" (spec 9.7).
 * @param s - the snapshot
 * @param options - alpha and weighted (tolerance and maxIterations are ignored: the run is exactly k long)
 * @param k - the iteration count
 * @param personalization - the per-node personalization (normalised to sum 1); omitted, 1 / n everywhere
 * @returns the iterate x(k)
 */
export function pageRankOracleTo(
    s: GraphSnapshot,
    options: PageRankOracleOptions,
    k: number,
    personalization?: ArrayLike<number>,
): Float64Array {
    const p = prepare(s, options.weighted, personalization);
    let x = new Float64Array(p.n).fill(p.n === 0 ? 0 : 1 / p.n);
    for (let iteration = 0; iteration < k; iteration++) {
        x = step(p, options.alpha, x).next;
    }
    return x;
}
