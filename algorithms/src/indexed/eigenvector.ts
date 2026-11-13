import type { F32, F64, GraphSnapshot, NumericVector } from "@graphty/graph-format";

import { ConvergenceError, withCode } from "../errors.js";

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
}

/**
 * Eigenvector centrality by power iteration on `(A + cI)`: like networkx's `A + I`, the identity shift
 * leaves the eigenvectors alone and makes the largest eigenvalue the only one of largest magnitude,
 * so a bipartite or periodic graph converges instead of oscillating. `c` is 1 on a directed relation and
 * `max(1, sqrt(d) / 2)` on a symmetric one (undirected, or `"total"`), `d` the largest neighbour count: a hub of
 * degree `d` puts eigenvalues near both `+sqrt(d)` and `-sqrt(d)`, and the larger shift keeps a star from
 * alternating slowly between them (a 50,000-node star stops in 14 passes, not 1,622).
 * The run stops when the change between passes is small relative to the vector, so the error left behind does
 * not grow with the node count. Each node's neighbours are
 * counted once however many parallel edges join them, as in the legacy neighbour sets. When the
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
    const rel = feeders(s, mode);
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
    const shift = !s.directed || mode === "total" ? hubShift(rel.rowPtr, rel.colIdx) : 1;
    // The unscaled passes `(A + shift I) x`, as webgpu-graph-algorithms keeps them, so both stop at the same pass.
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
    if (!converged) {
        throw new ConvergenceError("eigenvectorCentrality", maxIter, tol);
    }
    if (o.normalized !== false) {
        minMaxRescale(x);
    }
    return { scores: x, iterations: it, converged };
}

/**
 * One unscaled power-iteration step: `raw = (A + shift I) x`.
 * @param rel - The feeding relation
 * @param shift - The identity shift
 * @param x - The current unit-length vector
 * @param raw - Overwritten with the next unscaled vector
 */
function shiftedStep(rel: Relation, shift: number, x: F64, raw: F64): void {
    const { rowPtr, colIdx } = rel;
    for (let v = 0; v < x.length; v++) {
        let sum = shift * x[v];
        const end = rowPtr[v + 1];
        for (let a = rowPtr[v]; a < end; a++) {
            sum += x[colIdx[a]];
        }
        raw[v] = sum;
    }
}

/**
 * The identity shift of a symmetric relation: half the square root of the largest neighbour count, not counting a
 * self-loop, and at least 1 (networkx's `A + I`). A hub of `d` neighbours bounds the largest eigenvalue from below
 * by `sqrt(d)`, so the shift never outweighs it. Mirrored in webgpu-graph-algorithms' eigenvector centrality.
 * @param rowPtr - Row pointers
 * @param colIdx - Neighbour indices, each neighbour once per row
 * @returns The shift
 */
function hubShift(rowPtr: Uint32Array, colIdx: Uint32Array): number {
    let most = 0;
    for (let v = 0; v + 1 < rowPtr.length; v++) {
        let d = rowPtr[v + 1] - rowPtr[v];
        if (colIdx.subarray(rowPtr[v], rowPtr[v + 1]).includes(v)) {
            d--;
        }
        most = Math.max(most, d);
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

/**
 * The feeding relation as a CSR with each neighbour once per row. Snapshot rows are sorted, so a
 * parallel arc is the previous entry repeated, and the `"total"` row is a merge of two sorted rows.
 * @param s - The snapshot
 * @param mode - Which arcs feed a node on a directed snapshot
 * @returns Row pointers and neighbour indices
 */
function feeders(s: GraphSnapshot, mode: "in" | "out" | "total"): Relation {
    const n = s.nodeCount;
    const a = !s.directed || mode === "out" ? s : s.reverse();
    // The second source of a "total" row; an empty row everywhere otherwise.
    const total = s.directed && mode === "total";
    const bRowPtr = total ? s.rowPtr : new Uint32Array(n + 1);
    const bColIdx = total ? s.colIdx : new Uint32Array(0);
    const rowPtr = new Uint32Array(n + 1);
    const colIdx = new Uint32Array(a.colIdx.length + bColIdx.length);
    let k = 0;
    for (let v = 0; v < n; v++) {
        let i = a.rowPtr[v];
        const iEnd = a.rowPtr[v + 1];
        let j = bRowPtr[v];
        const jEnd = bRowPtr[v + 1];
        const rowStart = k;
        while (i < iEnd || j < jEnd) {
            const u = j >= jEnd || (i < iEnd && a.colIdx[i] <= bColIdx[j]) ? a.colIdx[i++] : bColIdx[j++];
            if (k === rowStart || colIdx[k - 1] !== u) {
                colIdx[k++] = u;
            }
        }
        rowPtr[v + 1] = k;
    }
    return { rowPtr, colIdx: colIdx.subarray(0, k) };
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
