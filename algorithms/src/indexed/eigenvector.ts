import type { F32, F64, GraphSnapshot, NumericVector } from "@graphty/graph-format";

import { ConvergenceError, withCode } from "../errors.js";
import { readsWeights } from "./weights.js";

/** Options of the index-based eigenvector centrality, matching the legacy `eigenvectorCentrality`. @public */
export interface EigenvectorOptions {
    /** Iteration cap; default 100. */
    readonly maxIterations?: number | undefined;
    /** Per-node tolerance: the run stops when the L1 change is below `n * tolerance`; default 1e-6. */
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
 * Eigenvector centrality by power iteration on `(A + I)`, as networkx does: the identity shift
 * leaves the eigenvectors alone and makes the largest eigenvalue the only one of largest magnitude,
 * so a bipartite or periodic graph converges instead of oscillating. `A` holds the arc weights when
 * the snapshot has them (the weights of parallel arcs added), and otherwise a 1 for each neighbour
 * however many parallel edges join them, as in the legacy neighbour sets. When the
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
    let x = new Float64Array(n);
    if (n === 0) {
        return { scores: x, iterations: 0, converged: true };
    }
    const rel = feeders(s, o.mode ?? "in", readsWeights(s, o.weighted));
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
    let next = new Float64Array(n);
    let it = 0;
    let converged = false;
    for (; it < maxIter && !converged; it++) {
        for (let v = 0; v < n; v++) {
            let sum = x[v];
            const end = rel.rowPtr[v + 1];
            const w = rel.weights;
            for (let a = rel.rowPtr[v]; a < end; a++) {
                sum += w === null ? x[rel.colIdx[a]] : w[a] * x[rel.colIdx[a]];
            }
            next[v] = sum;
        }
        scaleToUnitLength(next);
        let change = 0;
        for (let v = 0; v < n; v++) {
            change += Math.abs(next[v] - x[v]);
        }
        [x, next] = [next, x];
        converged = change < n * tol;
    }
    if (!converged) {
        throw new ConvergenceError("eigenvectorCentrality", maxIter, tol);
    }
    if (o.normalized !== false) {
        minMaxRescale(x);
    }
    return { scores: x, iterations: it, converged };
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
    const aW = weighted ? a.weights : null;
    const bW = weighted && total ? s.weights : null;
    const rowPtr = new Uint32Array(n + 1);
    const colIdx = new Uint32Array(a.colIdx.length + bColIdx.length);
    const weights = weighted ? new Float64Array(colIdx.length) : null;
    let k = 0;
    for (let v = 0; v < n; v++) {
        let i = a.rowPtr[v];
        const iEnd = a.rowPtr[v + 1];
        let j = bRowPtr[v];
        const jEnd = bRowPtr[v + 1];
        const rowStart = k;
        while (i < iEnd || j < jEnd) {
            const fromA = j >= jEnd || (i < iEnd && a.colIdx[i] <= bColIdx[j]);
            const u = fromA ? a.colIdx[i] : bColIdx[j];
            const w = fromA ? (aW?.[i] ?? 1) : (bW?.[j] ?? 1);
            if (fromA) {
                i++;
            } else {
                j++;
            }
            if (k === rowStart || colIdx[k - 1] !== u) {
                colIdx[k++] = u;
            } else if (weights !== null) {
                weights[k - 1] += w;
                continue;
            }
            if (weights !== null) {
                weights[k - 1] = w;
            }
        }
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
