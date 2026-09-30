/**
 * The CPU references of all-pairs shortest paths (design 8.7, 11.3 "Algorithm differential"): Floyd-Warshall written
 * from the algorithm, and the unweighted matrix as one breadth-first search per source, which shares nothing with
 * Floyd-Warshall. Index-based over the snapshot's `rowPtr` / `colIdx` / `weights`; imports nothing from `src/`.
 *
 * Floyd-Warshall takes a `tile`. With `tile >= n` it is the textbook triple loop. With `tile` 32 it is the BLOCKED
 * order of Venkataraman et al. -- per round the pivot block, then the pivot row and column, then the rest, each
 * block looping its 32 pivots in order -- which reaches the same shortest distances by a different order of f32
 * additions. Under `precision: "f32"` every candidate `d[i][k] + d[k][j]` is one `Math.fround`, exactly one f32 add
 * in a kernel, so the blocked f32 run is the one the device must match BITWISE and the textbook f64 run is the one
 * that says how far f32 has drifted. Every result is a `Float64Array`; `+Infinity` = unreachable, `0` on the
 * diagonal, the cheapest of parallel arcs, a self-loop ignored.
 */

import { type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";

import { bfsOracle } from "./traversal.js";

/** The options of `floydWarshallOracle`. */
interface FloydWarshallOptions {
    /** Use the snapshot's weight column (1 per arc when false or when the snapshot has none). */
    readonly weighted: boolean;
    /** `"f32"` rounds every candidate through `Math.fround`; `"f64"` keeps JavaScript numbers. */
    readonly precision: "f32" | "f64";
    /** The block side of the sweep order; omitted (or `>= n`) is the textbook order. */
    readonly tile?: number | undefined;
}

/**
 * The `n x n` matrix before any relaxation: `+Infinity`, the cheapest arc per pair, `0` on the diagonal.
 * @param s - the snapshot
 * @param weighted - use the weight column
 * @param round - the rounding of a stored weight
 * @returns the row-major matrix
 */
function initialMatrix(s: GraphSnapshot, weighted: boolean, round: (x: number) => number): Float64Array {
    const n = s.nodeCount;
    const d = new Float64Array(n * n).fill(Infinity);
    for (let u = 0; u < n; u++) {
        for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
            const v = s.colIdx[a];
            const w = weighted && s.weights !== null ? round(s.weights[a]) : 1;
            d[u * n + v] = Math.min(d[u * n + v], w);
        }
        d[u * n + u] = 0;
    }
    return d;
}

/**
 * Floyd-Warshall in the textbook order (`tile >= n`) or the blocked order of the given tile side.
 * @param s - the snapshot
 * @param options - weighting, precision and the sweep's block side
 * @returns the row-major `n x n` distances
 */
export function floydWarshallOracle(s: GraphSnapshot, options: FloydWarshallOptions): Float64Array {
    const n = s.nodeCount;
    const round = options.precision === "f32" ? Math.fround : (x: number): number => x;
    const d = initialMatrix(s, options.weighted, round);
    const t = Math.max(1, Math.min(options.tile ?? n, n));
    const blocks = Math.ceil(n / t);
    // relax block (bi, bj) through the pivots of block r, in pivot order
    const relax = (bi: number, bj: number, r: number): void => {
        for (let k = r * t; k < Math.min((r + 1) * t, n); k++) {
            for (let i = bi * t; i < Math.min((bi + 1) * t, n); i++) {
                const dik = d[i * n + k];
                for (let j = bj * t; j < Math.min((bj + 1) * t, n); j++) {
                    const via = round(dik + d[k * n + j]);
                    if (via < d[i * n + j]) {
                        d[i * n + j] = via;
                    }
                }
            }
        }
    };
    for (let r = 0; r < blocks; r++) {
        relax(r, r, r);
        for (let o = 0; o < blocks; o++) {
            if (o !== r) {
                relax(r, o, r);
                relax(o, r, r);
            }
        }
        for (let i = 0; i < blocks; i++) {
            for (let j = 0; j < blocks; j++) {
                if (i !== r && j !== r) {
                    relax(i, j, r);
                }
            }
        }
    }
    return d;
}

/**
 * The unweighted matrix as one breadth-first search per source: row `i` is the hop count from `i`.
 * @param s - the snapshot
 * @returns the row-major `n x n` hop counts (`+Infinity` = unreachable)
 */
export function apspRowsOracle(s: GraphSnapshot): Float64Array {
    const n = s.nodeCount;
    const d = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
        const { depth } = bfsOracle(s, i);
        for (let j = 0; j < n; j++) {
            d[i * n + j] = depth[j] === INVALID_INDEX ? Infinity : depth[j];
        }
    }
    return d;
}

/**
 * Design 11.3's invariant over a whole matrix: for every source `i` and arc `(u, v, w)` with a finite `d[i][u]`,
 * `d[i][v] <= fround(d[i][u] + w) x (1 + rel)`. Catches a dropped relaxation without any reference. `rel` is 0 for hop
 * counts; f32 Floyd-Warshall adds two partial sums where a relaxation adds one weight, so its `d[i][v]` may stand a
 * few ulps above the one-arc bound and a weighted matrix is checked within the parity tolerance.
 * @param dist - the row-major matrix
 * @param s - the snapshot
 * @param weighted - whether the run used the weight column
 * @param rel - the relative slack
 */
export function expectMatrixTriangleInequality(
    dist: ArrayLike<number>,
    s: GraphSnapshot,
    weighted: boolean,
    rel: number,
): void {
    const n = s.nodeCount;
    for (let i = 0; i < n; i++) {
        for (let u = 0; u < n; u++) {
            const du = dist[i * n + u];
            if (du === Infinity) {
                continue;
            }
            for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
                const v = s.colIdx[a];
                const w = weighted && s.weights !== null ? Math.fround(s.weights[a]) : 1;
                const bound = Math.fround(du + w);
                if (!(dist[i * n + v] <= bound * (1 + rel))) {
                    throw new Error(`from ${i}: arc ${a} (${u} -> ${v}) violates d = ${dist[i * n + v]} <= ${bound}`);
                }
            }
        }
    }
}

/**
 * On an undirected snapshot `d[i][j] === d[j][i]` bitwise: the blocked sweep writes the two halves in different
 * tile phases, so an asymmetry is a real defect that an end-to-end tolerance would average away.
 * @param dist - the row-major matrix
 * @param n - the side
 */
export function expectSymmetric(dist: ArrayLike<number>, n: number): void {
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (!Object.is(dist[i * n + j], dist[j * n + i])) {
                throw new Error(`d[${i}][${j}] = ${dist[i * n + j]} but d[${j}][${i}] = ${dist[j * n + i]}`);
            }
        }
    }
}
