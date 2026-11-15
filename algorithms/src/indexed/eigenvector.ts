import type { F32, F64, GraphSnapshot, NumericVector } from "@graphty/graph-format";

import { ConvergenceError, withCode } from "../errors.js";
import { readsWeights } from "./weights.js";

/** Options of the index-based eigenvector centrality, matching the legacy `eigenvectorCentrality`. @public */
export interface EigenvectorOptions {
    /** Iteration cap; default 100. */
    readonly maxIterations?: number | undefined;
    /**
     * Relative tolerance: the run stops at the first pass whose L1 change from the previous pass is below
     * `tolerance` times the L1 norm of the pass, whatever the node count; default 1e-6.
     */
    readonly tolerance?: number | undefined;
    /** Rescale the unit-length vector to [0, 1] by min-max, as the legacy function does; default true. */
    readonly normalized?: boolean | undefined;
    /**
     * On a directed snapshot, which arcs feed a node: `"in"` (default, as networkx) the nodes pointing
     * at it, `"out"` the nodes it points at, `"total"` both. Ignored on an undirected snapshot.
     */
    readonly mode?: "in" | "out" | "total" | undefined;
    /** Starting value per node index; default 1 for every node. */
    readonly startVector?: F32 | F64 | undefined;
    /**
     * Weight each feeding arc by its weight when the snapshot has weights; default true. Weighted, parallel arcs
     * between one pair add their weights; unweighted, a pair counts once however many arcs join it.
     */
    readonly weighted?: boolean | undefined;
}

/** Result of the index-based eigenvector centrality. @public */
export interface EigenvectorResult {
    /** Score per node index. */
    readonly scores: F64;
    /** Iterations actually run; 0 when the relation has no cycle and every score is 0. */
    readonly iterations: number;
    /** Always true: a run that does not converge throws `ConvergenceError` instead. */
    readonly converged: boolean;
}

interface Relation {
    readonly rowPtr: Uint32Array;
    readonly colIdx: Uint32Array;
    /** The summed weight of each entry, or null when unweighted. */
    readonly weights: F64 | null;
}

/**
 * Eigenvector centrality by power iteration on `(A + cI)`: like networkx's `A + I`, the identity shift
 * leaves the eigenvectors alone and makes the largest eigenvalue the only one of largest magnitude,
 * so a bipartite or periodic graph converges instead of oscillating. `c` is 1 on a directed relation and
 * `max(1, sqrt(d) / 2)` on a symmetric one (undirected, or `"total"`), `d` the largest neighbour count: a hub of
 * degree `d` puts eigenvalues near both `+sqrt(d)` and `-sqrt(d)`, and the larger shift keeps a star from
 * alternating slowly between them (a 50,000-node star stops in 14 passes, not 1,622).
 * The run stops when the change between passes is small relative to the vector, so the error left behind does
 * not grow with the node count. `A` holds the arc weights when the snapshot has them (the weights of parallel arcs
 * added), and otherwise a 1 for each neighbour however many parallel edges join them, as in the legacy neighbour
 * sets. When the
 * relation has no cycle (no arcs, or a directed acyclic graph) its matrix is nilpotent and every
 * score is exactly 0.
 * @param s - The snapshot
 * @param o - Algorithm options
 * @returns The scores, the iteration count and the convergence flag
 * @throws {ConvergenceError} When `maxIterations` passes do not meet the tolerance
 * @public
 */
export function eigenvectorCentrality(s: GraphSnapshot, o: EigenvectorOptions = {}): EigenvectorResult {
    const n = s.nodeCount;
    const maxIter = o.maxIterations ?? 100;
    const tol = o.tolerance ?? 1e-6;
    const start = o.startVector;
    if (start !== undefined && start.length !== n) {
        throw withCode(
            new Error(`eigenvectorCentrality: startVector has ${String(start.length)} entries for ${String(n)} nodes`),
            "E_BAD_OPTION",
        );
    }
    const x = new Float64Array(n);
    if (n === 0) {
        return { scores: x, iterations: 0, converged: true };
    }
    const mode = o.mode ?? "in";
    const rel = feeders(s, mode, readsWeights(s, o.weighted));
    if (isAcyclic(rel, n)) {
        return { scores: x, iterations: 0, converged: true };
    }
    // A node with nothing feeding it scores exactly 0 once the largest eigenvalue is positive.
    for (let v = 0; v < n; v++) {
        if (rel.rowPtr[v + 1] > rel.rowPtr[v]) {
            x[v] = start === undefined ? 1 : start[v];
        }
    }
    scaleToUnitLength(x);
    const shift = !s.directed || mode === "total" ? hubShift(rel) : 1;
    const { it, converged } = powerIterate(rel, shift, x, maxIter, tol);
    if (!converged) {
        throw new ConvergenceError("eigenvectorCentrality", maxIter, tol);
    }
    if (o.normalized !== false) {
        minMaxRescale(x);
    }
    return { scores: x, iterations: it, converged };
}

/**
 * Power iteration from the unit-length `x`, left holding the last pass scaled to unit length. The change is measured
 * on the unscaled passes `(A + shift I) x`, as webgpu-graph-algorithms keeps them, so both stop at the same pass.
 * @param rel - The feeding relation
 * @param shift - The identity shift
 * @param x - The start vector, overwritten with the result
 * @param maxIter - The pass cap
 * @param tol - The relative tolerance
 * @returns The passes run and whether the last met the tolerance
 */
function powerIterate(
    rel: Relation,
    shift: number,
    x: F64,
    maxIter: number,
    tol: number,
): { it: number; converged: boolean } {
    const n = x.length;
    let raw = new Float64Array(n);
    let previous = new Float64Array(n);
    let it = 0;
    let converged = false;
    while (it < maxIter && !converged) {
        shiftedStep(rel, shift, x, raw);
        it++;
        let change = 0;
        let size = 0;
        for (let v = 0; v < n; v++) {
            change += Math.abs(raw[v] - previous[v]);
            size += Math.abs(raw[v]);
        }
        converged = it > 1 && change < tol * size;
        x.set(raw);
        scaleToUnitLength(x);
        [raw, previous] = [previous, raw];
    }
    return { it, converged };
}

/**
 * One unscaled power-iteration step: `raw = (A + shift I) x`.
 * @param rel - The feeding relation
 * @param shift - The identity shift
 * @param x - The current unit-length vector
 * @param raw - Overwritten with the next unscaled vector
 */
function shiftedStep(rel: Relation, shift: number, x: F64, raw: F64): void {
    const { rowPtr, colIdx, weights: w } = rel;
    for (let v = 0; v < x.length; v++) {
        let sum = shift * x[v];
        const end = rowPtr[v + 1];
        for (let a = rowPtr[v]; a < end; a++) {
            sum += w === null ? x[colIdx[a]] : w[a] * x[colIdx[a]];
        }
        raw[v] = sum;
    }
}

/**
 * The identity shift of a symmetric relation: half the square root of the largest sum of squared weights over a
 * node's neighbours (its neighbour count when unweighted), not counting a self-loop, and at least 1 (networkx's
 * `A + I`). Such a node bounds the largest eigenvalue from below by that square root, so the shift never outweighs
 * it. Mirrored in webgpu-graph-algorithms' eigenvector centrality.
 * @param rel - The relation, each neighbour once per row
 * @returns The shift
 */
function hubShift(rel: Relation): number {
    const { rowPtr, colIdx, weights } = rel;
    let most = 0;
    for (let v = 0; v + 1 < rowPtr.length; v++) {
        let sum = 0;
        for (let a = rowPtr[v]; a < rowPtr[v + 1]; a++) {
            if (colIdx[a] !== v) {
                const w = weights === null ? 1 : weights[a];
                sum += w * w;
            }
        }
        most = Math.max(most, sum);
    }
    return Math.max(1, Math.sqrt(most) / 2);
}

/**
 * Rescale a score vector in place to [0, 1] by min-max, the legacy eigenvector rule: a flat vector
 * becomes all 1, or all 0 when its maximum is not positive.
 * @param x - The scores to rescale
 * @internal
 */
export function minMaxRescale(x: F64): void {
    let min = Infinity;
    let max = 0;
    for (const value of x) {
        min = Math.min(min, value);
        max = Math.max(max, value);
    }
    const range = max - min;
    const flat = max > 0 ? 1 : 0;
    for (let v = 0; v < x.length; v++) {
        x[v] = range > 0 ? (x[v] - min) / range : flat;
    }
}

/** The rows a feeding relation merges: `a`'s, and on a `"total"` relation `b`'s too (empty otherwise). */
interface FeederRows {
    readonly aRowPtr: Uint32Array;
    readonly aColIdx: Uint32Array;
    readonly aW: NumericVector | null;
    readonly bRowPtr: Uint32Array;
    readonly bColIdx: Uint32Array;
    readonly bW: NumericVector | null;
}

/**
 * Merge row `v` of the two sorted sources into `colIdx` from `k` on, each neighbour once, summing the weights of
 * the arcs that join the pair.
 * @param src - The two sources
 * @param v - The row
 * @param colIdx - Neighbour indices, written
 * @param weights - Summed weights, written, or null when unweighted
 * @param k - The first free entry
 * @returns The first free entry after the row
 */
function mergeFeederRow(src: FeederRows, v: number, colIdx: Uint32Array, weights: F64 | null, k: number): number {
    const { aRowPtr, aColIdx, aW, bRowPtr, bColIdx, bW } = src;
    let i = aRowPtr[v];
    const iEnd = aRowPtr[v + 1];
    let j = bRowPtr[v];
    const jEnd = bRowPtr[v + 1];
    const rowStart = k;
    while (i < iEnd || j < jEnd) {
        if (j >= jEnd || (i < iEnd && aColIdx[i] <= bColIdx[j])) {
            k = appendFeeder(colIdx, weights, rowStart, k, aColIdx[i], aW?.[i] ?? 1);
            i++;
        } else {
            k = appendFeeder(colIdx, weights, rowStart, k, bColIdx[j], bW?.[j] ?? 1);
            j++;
        }
    }
    return k;
}

/**
 * Append neighbour `u` to the row being merged, or add `w` to its weight when it is the previous entry repeated.
 * @param colIdx - Neighbour indices, written
 * @param weights - Summed weights, written, or null when unweighted
 * @param rowStart - The row's first entry
 * @param k - The first free entry
 * @param u - The neighbour
 * @param w - The arc's weight
 * @returns The first free entry after the append
 */
function appendFeeder(
    colIdx: Uint32Array,
    weights: F64 | null,
    rowStart: number,
    k: number,
    u: number,
    w: number,
): number {
    if (k > rowStart && colIdx[k - 1] === u) {
        if (weights !== null) {
            weights[k - 1] += w;
        }
        return k;
    }
    colIdx[k] = u;
    if (weights !== null) {
        weights[k] = w;
    }
    return k + 1;
}

/**
 * The feeding relation as a CSR with each neighbour once per row, and with `weighted` the summed weight of the arcs
 * that join the pair. Snapshot rows are sorted, so a parallel arc is the previous entry repeated, and the `"total"`
 * row is a merge of two sorted rows.
 * @param s - The snapshot
 * @param mode - Which arcs feed a node on a directed snapshot
 * @param weighted - Whether to sum the arc weights
 * @returns Row pointers, neighbour indices and weights
 */
function feeders(s: GraphSnapshot, mode: "in" | "out" | "total", weighted: boolean): Relation {
    const n = s.nodeCount;
    const a = !s.directed || mode === "out" ? s : s.reverse();
    // The second source of a "total" row; an empty row everywhere otherwise.
    const total = s.directed && mode === "total";
    const bRowPtr = total ? s.rowPtr : new Uint32Array(n + 1);
    const bColIdx = total ? s.colIdx : new Uint32Array(0);
    const src: FeederRows = {
        aRowPtr: a.rowPtr,
        aColIdx: a.colIdx,
        aW: weighted ? a.weights : null,
        bRowPtr,
        bColIdx,
        bW: weighted && total ? s.weights : null,
    };
    const rowPtr = new Uint32Array(n + 1);
    const colIdx = new Uint32Array(a.colIdx.length + bColIdx.length);
    const weights = weighted ? new Float64Array(colIdx.length) : null;
    let k = 0;
    for (let v = 0; v < n; v++) {
        k = mergeFeederRow(src, v, colIdx, weights, k);
        rowPtr[v + 1] = k;
    }
    return { rowPtr, colIdx: colIdx.subarray(0, k), weights: weights?.subarray(0, k) ?? null };
}

/**
 * Whether the relation has no cycle (Kahn's algorithm), which makes its matrix nilpotent.
 * @param rel - The relation
 * @param n - The node count
 * @returns True when every node peels off in topological order
 */
function isAcyclic(rel: Relation, n: number): boolean {
    const inDegree = new Uint32Array(n);
    for (const u of rel.colIdx) {
        inDegree[u]++;
    }
    const queue = new Uint32Array(n);
    let tail = 0;
    for (let v = 0; v < n; v++) {
        if (inDegree[v] === 0) {
            queue[tail++] = v;
        }
    }
    for (let head = 0; head < tail; head++) {
        const v = queue[head];
        for (let a = rel.rowPtr[v]; a < rel.rowPtr[v + 1]; a++) {
            if (--inDegree[rel.colIdx[a]] === 0) {
                queue[tail++] = rel.colIdx[a];
            }
        }
    }
    return tail === n;
}

/**
 * Scale a vector in place to unit Euclidean length; a zero vector is left alone.
 * @param v - The vector
 */
function scaleToUnitLength(v: NumericVector): void {
    let norm = 0;
    for (const value of v) {
        norm += value * value;
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
        for (let i = 0; i < v.length; i++) {
            v[i] /= norm;
        }
    }
}
