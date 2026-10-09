import type { AdjacencyView, NumericVector } from "@graphty/graph-format";

import { withCode } from "../errors.js";
import { type LabelResult, withGroups } from "./components.js";
import type { WeightedOptions } from "./weights.js";

/** Options of the index-based Markov clustering, with the legacy `markovClustering` defaults. @public */
export interface MarkovOptions extends WeightedOptions {
    /** Matrix power of each expansion step, an integer of at least 1; default 2. */
    readonly expansion?: number | undefined;
    /** Element-wise power of each inflation step, above 0; default 2. */
    readonly inflation?: number | undefined;
    /** Cap on expansion-inflation rounds; default 100. */
    readonly maxIterations?: number | undefined;
    /** Stop when no matrix entry moved by more than this in a round; default 1e-6. */
    readonly tolerance?: number | undefined;
    /** Entries below this are dropped after each inflation; default 1e-5. */
    readonly pruningThreshold?: number | undefined;
    /** Give every node a self-loop of weight 1 before the first round; default true. */
    readonly selfLoops?: boolean | undefined;
    /** Per-arc weight override, arcCount long -- the facade passes `expandEdges(s, shadow.data)`. */
    readonly weights?: NumericVector | undefined;
}

/** Result of the index-based Markov clustering. @public */
export interface MarkovResult extends LabelResult {
    /** Nodes whose own flow survived (a positive diagonal entry), in index order. */
    readonly attractors: Uint32Array;
    /** Expansion-inflation rounds run. */
    readonly iterations: number;
    /** True when the last round moved no entry by more than `tolerance`. */
    readonly converged: boolean;
}

/** A column-stochastic sparse matrix: column j holds rows `row[ptr[j]] .. row[ptr[j+1] - 1]`, ascending. */
interface Csc {
    readonly ptr: Uint32Array;
    readonly row: Uint32Array;
    readonly val: Float64Array;
}

/**
 * Divide every column by its sum, summed in ascending row order as the legacy dense loop sums it.
 * @param m - The matrix, changed in place
 */
function normaliseColumns(m: Csc): void {
    for (let j = 0; j + 1 < m.ptr.length; j++) {
        let sum = 0;
        for (let p = m.ptr[j]; p < m.ptr[j + 1]; p++) {
            sum += m.val[p];
        }
        if (sum > 0) {
            for (let p = m.ptr[j]; p < m.ptr[j + 1]; p++) {
                m.val[p] /= sum;
            }
        }
    }
}

/**
 * The product `a * b`. For every entry the products are added in ascending k, the order the legacy
 * dense triple loop adds them in; the zero products it adds as well leave a sum unchanged, so the
 * result is bit-identical to the dense one.
 * @param a - Left factor
 * @param b - Right factor
 * @param acc - n-long scratch, all zero on entry and on exit
 * @param mark - n-long scratch, all zero on entry and on exit
 * @returns The product
 */
function multiply(a: Csc, b: Csc, acc: Float64Array, mark: Uint8Array): Csc {
    const n = acc.length;
    const ptr = new Uint32Array(n + 1);
    const rows: number[] = [];
    const vals: number[] = [];
    const touched: number[] = [];
    for (let j = 0; j < n; j++) {
        touched.length = 0;
        for (let q = b.ptr[j]; q < b.ptr[j + 1]; q++) {
            const k = b.row[q];
            const bkj = b.val[q];
            for (let p = a.ptr[k]; p < a.ptr[k + 1]; p++) {
                const i = a.row[p];
                if (mark[i] === 0) {
                    mark[i] = 1;
                    touched.push(i);
                }
                acc[i] += a.val[p] * bkj;
            }
        }
        touched.sort((x, y) => x - y);
        for (const i of touched) {
            rows.push(i);
            vals.push(acc[i]);
            acc[i] = 0;
            mark[i] = 0;
        }
        ptr[j + 1] = rows.length;
    }
    return { ptr, row: Uint32Array.from(rows), val: Float64Array.from(vals) };
}

/**
 * Raise every entry to `inflation`, renormalise, drop the entries below `threshold` and renormalise
 * again: the legacy inflate and prune steps.
 * @param m - The expanded matrix
 * @param inflation - The element-wise power
 * @param threshold - The pruning threshold
 * @returns The new matrix
 */
function inflateAndPrune(m: Csc, inflation: number, threshold: number): Csc {
    const powered: Csc = { ptr: m.ptr, row: m.row, val: m.val.map((v) => Math.pow(v, inflation)) };
    normaliseColumns(powered);
    const n = m.ptr.length - 1;
    const ptr = new Uint32Array(n + 1);
    const rows: number[] = [];
    const vals: number[] = [];
    for (let j = 0; j < n; j++) {
        for (let p = powered.ptr[j]; p < powered.ptr[j + 1]; p++) {
            if (powered.val[p] >= threshold) {
                rows.push(powered.row[p]);
                vals.push(powered.val[p]);
            }
        }
        ptr[j + 1] = rows.length;
    }
    const out = { ptr, row: Uint32Array.from(rows), val: Float64Array.from(vals) };
    normaliseColumns(out);
    return out;
}

/**
 * Whether no entry differs by more than `tolerance` between two matrices, an absent entry being 0.
 * @param a - The previous matrix
 * @param b - The new matrix
 * @param tolerance - The tolerance
 * @returns True when every entry is within tolerance
 */
function withinTolerance(a: Csc, b: Csc, tolerance: number): boolean {
    for (let j = 0; j + 1 < a.ptr.length; j++) {
        let p = a.ptr[j];
        let q = b.ptr[j];
        const pe = a.ptr[j + 1];
        const qe = b.ptr[j + 1];
        while (p < pe || q < qe) {
            let diff: number;
            if (q >= qe || (p < pe && a.row[p] < b.row[q])) {
                diff = a.val[p++];
            } else if (p >= pe || b.row[q] < a.row[p]) {
                diff = b.val[q++];
            } else {
                diff = a.val[p++] - b.val[q++];
            }
            if (Math.abs(diff) > tolerance) {
                return false;
            }
        }
    }
    return true;
}

/**
 * The starting matrix: entry (i, j) is the weight of the arc i -> j (parallel arcs summed), the
 * diagonal set to 1 when `selfLoops`, every column normalised.
 * @param s - The adjacency
 * @param weights - Per-arc weights, or null for all ones
 * @param selfLoops - Whether to set the diagonal to 1
 * @returns The column-stochastic matrix
 */
function transitionMatrix(s: AdjacencyView, weights: NumericVector | null, selfLoops: boolean): Csc {
    const n = s.nodeCount;
    // Column j of the matrix is the set of arcs INTO j: a counting sort of the arcs by target, which
    // keeps each column's rows ascending because the rows are visited in order.
    const ptr = new Uint32Array(n + 1);
    for (let a = 0; a < s.arcCount; a++) {
        ptr[s.colIdx[a] + 1]++;
    }
    if (selfLoops) {
        for (let j = 0; j < n; j++) {
            ptr[j + 1]++;
        }
    }
    for (let j = 0; j < n; j++) {
        ptr[j + 1] += ptr[j];
    }
    const fill = ptr.slice(0, n);
    const row = new Uint32Array(ptr[n]);
    const val = new Float64Array(ptr[n]);
    const put = (i: number, j: number, w: number, replace: boolean): void => {
        const last = fill[j] - 1;
        if (last >= ptr[j] && row[last] === i) {
            val[last] = replace ? w : val[last] + w;
        } else {
            row[fill[j]] = i;
            val[fill[j]++] = w;
        }
    };
    for (let i = 0; i < n; i++) {
        // The diagonal goes in its place in row order: the arcs i -> j with j < i were placed while
        // visiting earlier rows, so for column i this is where row i belongs.
        for (let a = s.rowPtr[i]; a < s.rowPtr[i + 1]; a++) {
            const j = s.colIdx[a];
            const w = weights === null ? 1 : weights[a];
            if (!(w >= 0) || w === Infinity) {
                throw withCode(
                    new RangeError(`arc ${a} has weight ${w}; Markov clustering needs finite, non-negative weights`),
                    "E_BAD_WEIGHT",
                );
            }
            put(i, j, w, false);
        }
        if (selfLoops) {
            put(i, i, 1, true);
        }
    }
    // Compact: merged parallel arcs and a self-loop folded into the diagonal left gaps.
    const outPtr = new Uint32Array(n + 1);
    const rows: number[] = [];
    const vals: number[] = [];
    for (let j = 0; j < n; j++) {
        for (let p = ptr[j]; p < fill[j]; p++) {
            rows.push(row[p]);
            vals.push(val[p]);
        }
        outPtr[j + 1] = rows.length;
    }
    const m = { ptr: outPtr, row: Uint32Array.from(rows), val: Float64Array.from(vals) };
    normaliseColumns(m);
    return m;
}

/**
 * Markov clustering (MCL; van Dongen, 2000), the index-based port of the legacy `markovClustering`.
 *
 * The flow matrix starts as the column-normalised adjacency: entry (i, j) is the weight of the arc
 * i -> j, so column j spreads j's flow over the nodes with an arc into it (on an undirected
 * snapshot, its neighbours). With `selfLoops` every diagonal entry is first set to 1, replacing a
 * self-loop's weight. Each round raises the matrix to the `expansion` power, raises every entry to
 * the `inflation` power, renormalises the columns, drops the entries below `pruningThreshold` and
 * renormalises again, until no entry moves by more than `tolerance` or `maxIterations` rounds ran.
 * Node j then joins the attractor with the largest entry in its column, the lowest index on a tie;
 * a node whose column emptied is a community of its own.
 *
 * The matrix is kept sparse, and every sum is taken in the order the legacy dense loops take it, so
 * the rounds are bit-identical to the legacy function's and so are the communities, their order and
 * the attractors. Communities are labelled in the legacy function's order: the flow clusters by
 * their lowest member, then the nodes whose column emptied. Two differences: parallel arcs are
 * summed (a legacy graph has none), and `iterations` counts the rounds run, where the legacy
 * function reports one more than `maxIterations` when it stops at the cap. A negative, NaN or
 * infinite weight throws.
 * @param s - Any snapshot or adjacency view
 * @param options - MCL parameters and the weight override
 * @returns The partition, the attractors, the rounds run and whether they converged
 * @public
 */
export function markovClustering(s: AdjacencyView, options: MarkovOptions = {}): MarkovResult {
    const expansion = options.expansion ?? 2;
    const inflation = options.inflation ?? 2;
    const maxIterations = options.maxIterations ?? 100;
    const tolerance = options.tolerance ?? 1e-6;
    const pruningThreshold = options.pruningThreshold ?? 1e-5;
    if (!Number.isInteger(expansion) || expansion < 1) {
        throw withCode(new RangeError(`expansion must be an integer of at least 1, got ${expansion}`), "E_BAD_OPTION");
    }
    if (!(inflation > 0) || inflation === Infinity) {
        throw withCode(new RangeError(`inflation must be finite and above 0, got ${inflation}`), "E_BAD_OPTION");
    }
    if (!Number.isInteger(maxIterations) || maxIterations < 0) {
        throw withCode(
            new RangeError(`maxIterations must be a non-negative integer, got ${maxIterations}`),
            "E_BAD_OPTION",
        );
    }
    if (!(tolerance >= 0) || !(pruningThreshold >= 0)) {
        throw withCode(new RangeError("tolerance and pruningThreshold must be non-negative"), "E_BAD_OPTION");
    }
    const weights = options.weighted === false ? null : (options.weights ?? s.weights);
    if (weights !== null && weights.length !== s.arcCount) {
        throw withCode(
            new RangeError(`weights has ${weights.length} entries; the snapshot has ${s.arcCount} arcs`),
            "E_BAD_OPTION",
        );
    }
    const n = s.nodeCount;
    let m = transitionMatrix(s, weights, options.selfLoops ?? true);
    const acc = new Float64Array(n);
    const mark = new Uint8Array(n);
    let converged = n === 0;
    let iterations = 0;
    while (!converged && iterations < maxIterations) {
        let expanded = m;
        for (let t = 1; t < expansion; t++) {
            expanded = multiply(expanded, m, acc, mark);
        }
        const next = inflateAndPrune(expanded, inflation, pruningThreshold);
        iterations++;
        converged = withinTolerance(m, next, tolerance);
        m = next;
    }

    const attractors: number[] = [];
    // Column j's attractor: the row of its largest positive entry, the first on a tie.
    const attractorOf = new Int32Array(n).fill(-1);
    for (let j = 0; j < n; j++) {
        let best = 0;
        for (let p = m.ptr[j]; p < m.ptr[j + 1]; p++) {
            if (m.row[p] === j && m.val[p] > 0) {
                attractors.push(j);
            }
            if (m.val[p] > best) {
                best = m.val[p];
                attractorOf[j] = m.row[p];
            }
        }
    }
    const labels = new Uint32Array(n);
    const labelOfAttractor = new Map<number, number>();
    for (let j = 0; j < n; j++) {
        const a = attractorOf[j];
        if (a >= 0) {
            let label = labelOfAttractor.get(a);
            if (label === undefined) {
                label = labelOfAttractor.size;
                labelOfAttractor.set(a, label);
            }
            labels[j] = label;
        }
    }
    let count = labelOfAttractor.size;
    for (let j = 0; j < n; j++) {
        if (attractorOf[j] < 0) {
            labels[j] = count++;
        }
    }
    return { ...withGroups(labels, count), attractors: Uint32Array.from(attractors), iterations, converged };
}
