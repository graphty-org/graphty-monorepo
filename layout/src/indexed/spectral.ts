import type { F64, GraphSnapshot } from "@graphty/graph-format";

import { type LayoutResult, rescaleInPlace } from "../positions";
import { toLayoutSnapshot } from "../simulation/snapshot";
import { RandomNumberGenerator } from "../utils/random";
import { type CommonLayoutOptions, resolve, result } from "./common";

/**
 * Spectral rows over an undirected snapshot. The Laplacian counts each distinct neighbour once and ignores
 * self-loops; each component is 100 steps of power iteration on it from a seeded random start, kept orthogonal to
 * the constant vector and to the earlier components. The rows are rescaled so the farthest node is `scale` from
 * `center`. One node sits on the centre; two sit at the centre minus and plus `scale` in every component.
 * @param g - an undirected snapshot
 * @param dim - components per row, any positive count
 * @param scale - the distance of the farthest node from the centre
 * @param center - `dim` components
 * @param seed - the start vectors' seed, or null for a random one
 * @returns `n * dim` values
 */
function spectralRows(
    g: GraphSnapshot,
    dim: number,
    scale: number,
    center: readonly number[],
    seed: number | null,
): F64 {
    const n = g.nodeCount;
    const rows = new Float64Array(n * dim);
    if (n <= 2) {
        for (let i = 0; i < n; i++) {
            for (let k = 0; k < dim; k++) {
                rows[dim * i + k] = n === 1 ? center[k] : center[k] + (i === 0 ? -scale : scale);
            }
        }
        return rows;
    }
    const { rowPtr, colIdx } = g;
    const degree = new Float64Array(n);
    for (let u = 0; u < n; u++) {
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            if (colIdx[a] !== u && (a === rowPtr[u] || colIdx[a] !== colIdx[a - 1])) {
                degree[u]++;
            }
        }
    }
    const rng = new RandomNumberGenerator(seed ?? undefined);
    const components: F64[] = [];
    for (let d = 0; d < dim; d++) {
        let vector = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            vector[i] = (rng.rand() as number) - 0.5;
        }
        for (const ev of components) {
            let dot = 0;
            for (let i = 0; i < n; i++) {
                dot += vector[i] * ev[i];
            }
            for (let i = 0; i < n; i++) {
                vector[i] -= dot * ev[i];
            }
        }
        normalise(vector);
        for (let iter = 0; iter < 100; iter++) {
            // L v in ascending column order, the diagonal term at its own column, rows sorted so the sum's order is fixed
            const next = new Float64Array(n);
            for (let u = 0; u < n; u++) {
                let sum = 0;
                let diagonalDone = false;
                for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
                    const v = colIdx[a];
                    if (v === u || (a > rowPtr[u] && v === colIdx[a - 1])) {
                        continue;
                    }
                    if (!diagonalDone && v > u) {
                        sum += degree[u] * vector[u];
                        diagonalDone = true;
                    }
                    sum += -1 * vector[v];
                }
                if (!diagonalDone) {
                    sum += degree[u] * vector[u];
                }
                next[u] = sum;
            }
            let mean = 0;
            for (let i = 0; i < n; i++) {
                mean += next[i];
            }
            mean /= n;
            for (let i = 0; i < n; i++) {
                next[i] -= mean;
            }
            if (norm(next) < 1e-10) {
                continue;
            }
            normalise(next);
            vector = next;
        }
        components.push(vector);
    }
    for (let i = 0; i < n; i++) {
        for (let k = 0; k < dim; k++) {
            rows[dim * i + k] = components[k][i];
        }
    }
    rescaleInPlace(rows, dim, scale);
    for (let i = 0; i < n * dim; i++) {
        rows[i] += center[i % dim];
    }
    return rows;
}

/**
 * The Euclidean norm.
 * @param v - the vector
 * @returns its length
 */
function norm(v: F64): number {
    let sum = 0;
    for (const x of v) {
        sum += x * x;
    }
    return Math.sqrt(sum);
}

/**
 * Divide by the norm in place.
 * @param v - the vector
 */
function normalise(v: F64): void {
    const length = norm(v);
    for (let i = 0; i < v.length; i++) {
        v[i] /= length;
    }
}

/**
 * Nodes placed by the Laplacian's eigenvectors as power iteration finds them (see `spectralRows`), one component per
 * dimension, rescaled so the farthest node is `scale` from the centre.
 * @param s - the snapshot; a directed one is read as its undirected derived graph
 * @param options - `seed` fixes the start vectors
 * @returns the layout
 */
export function spectral(s: GraphSnapshot, options: CommonLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    return result(spectralRows(toLayoutSnapshot(s), dim, scale, center, options.seed ?? null), dim, n);
}
