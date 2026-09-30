/**
 * CPU references for all-pairs shortest paths, sharing no code with `src/`: Floyd-Warshall written
 * from the algorithm (textbook k-i-j order, f64), and the unweighted matrix as one breadth-first
 * search per source. Cut down from the GPU package's `test/oracle/all-pairs.ts` (no tile, no f32).
 * Every matrix is row-major `Float64Array`: `+Infinity` unreachable, `0` on the diagonal, the
 * cheapest of parallel arcs, a self-loop ignored.
 */

import type { GraphSnapshot, NumericVector } from "@graphty/graph-format";

/**
 * Floyd-Warshall in the textbook order.
 * @param s - the snapshot
 * @param weights - one weight per arc, or `null` for 1 per arc
 * @returns the row-major `n x n` distances
 */
export function floydWarshallOracle(s: GraphSnapshot, weights: NumericVector | null): Float64Array {
    const n = s.nodeCount;
    const d = new Float64Array(n * n).fill(Infinity);
    for (let u = 0; u < n; u++) {
        for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
            const v = s.colIdx[a];
            const w = weights === null ? 1 : weights[a];
            d[u * n + v] = Math.min(d[u * n + v], w);
        }
        d[u * n + u] = 0;
    }
    for (let k = 0; k < n; k++) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const via = d[i * n + k] + d[k * n + j];
                if (via < d[i * n + j]) {
                    d[i * n + j] = via;
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
    const d = new Float64Array(n * n).fill(Infinity);
    for (let i = 0; i < n; i++) {
        d[i * n + i] = 0;
        const queue = [i];
        for (let head = 0; head < queue.length; head++) {
            const u = queue[head];
            for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
                const v = s.colIdx[a];
                if (d[i * n + v] === Infinity) {
                    d[i * n + v] = d[i * n + u] + 1;
                    queue.push(v);
                }
            }
        }
    }
    return d;
}

/**
 * For every source `i` and arc `(u, v, w)` with a finite `d[i][u]`, `d[i][v] <= (d[i][u] + w) * (1 + rel)`.
 * Catches a dropped relaxation without any reference.
 * @param dist - the row-major matrix
 * @param s - the snapshot
 * @param weights - the weights the run used, or `null` for 1 per arc
 * @param rel - the relative slack; 0 on integer weights
 */
export function expectMatrixTriangleInequality(
    dist: ArrayLike<number>,
    s: GraphSnapshot,
    weights: NumericVector | null,
    rel = 0,
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
                const bound = du + (weights === null ? 1 : weights[a]);
                if (!(dist[i * n + v] <= bound * (1 + rel))) {
                    throw new Error(`from ${i}: arc ${a} (${u} -> ${v}) violates d = ${dist[i * n + v]} <= ${bound}`);
                }
            }
        }
    }
}

/**
 * On an undirected snapshot `d[i][j] === d[j][i]` bitwise.
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
