/**
 * The CPU reference of the spmv-pull kernel (spec 6 row 9, 8.2): for every row v of the REVERSE adjacency, in f64,
 * y[v] = beta * pv + alpha * (sum over the in-arcs of weight * xNorm[u] + dangling * pv), where pv is
 * personalization[v] when a personalization vector is given and the uniform mass otherwise. The fold is sequential
 * in arc order; an unweighted snapshot folds weight 1. Index-based and independent of the kernel: it walks
 * s.reverse() the way graph-format materialises it, never the device bindings.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

/** The scalar coefficients of one pull: alpha, beta, the uniform personalization mass and the dangling mass folded in. */
export interface SpmvOracleCoefficients {
    readonly alpha: number;
    readonly beta: number;
    readonly uniformP: number;
    readonly dangling: number;
}

/**
 * The f64 reference of the pull kernel (spec 8.2): y[v] = beta * pv + alpha * (sum_{u in in(v)} w * xNorm[u] + dangling * pv).
 * @param s - the snapshot whose reverse adjacency is walked
 * @param xNorm - the pre-scaled input vector, one value per node
 * @param coefficients - alpha, beta, uniformP, dangling
 * @param personalization - the per-node personalization; omitted, every row uses coefficients.uniformP
 * @param weights - the per-arc weights of the REVERSE view to fold; undefined takes the snapshot's, null folds 1
 * @returns one f64 per row
 */
export function spmvPullOracle(
    s: GraphSnapshot,
    xNorm: Float64Array,
    coefficients: SpmvOracleCoefficients,
    personalization?: Float64Array,
    weights?: Float64Array | null,
): Float64Array {
    const rev = s.reverse();
    const folded = weights === undefined ? rev.weights : weights;
    const out = new Float64Array(s.nodeCount);
    for (let v = 0; v < s.nodeCount; v++) {
        let acc = 0;
        for (let arc = rev.rowPtr[v]; arc < rev.rowPtr[v + 1]; arc++) {
            acc += (folded === null ? 1 : folded[arc]) * xNorm[rev.colIdx[arc]];
        }
        const pv = personalization === undefined ? coefficients.uniformP : personalization[v];
        out[v] = coefficients.beta * pv + coefficients.alpha * (acc + coefficients.dangling * pv);
    }
    return out;
}
