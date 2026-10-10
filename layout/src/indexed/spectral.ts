import type { F64, GraphSnapshot } from "@graphty/graph-format";

import { type LayoutResult, rescaleInPlace } from "../positions.js";
import { toLayoutSnapshot } from "../simulation/snapshot.js";
import { RandomNumberGenerator } from "../utils/random.js";
import { type CommonLayoutOptions, resolve, result } from "./common.js";

/** Relative residual at which the eigenvector iteration stops; far below what a drawing can show. */
const TOLERANCE = 1e-6;

/** The iteration cap; each round costs `FILTER_DEGREE` sparse products per block vector. */
const MAX_ROUNDS = 150;

/** The degree of the Chebyshev filter applied to the block between Rayleigh-Ritz steps. */
const FILTER_DEGREE = 8;

/**
 * Spectral rows over an undirected snapshot. The Laplacian counts each distinct neighbour once and ignores
 * self-loops. Component k of a row is the node's entry in the eigenvector of the (k + 2)th smallest eigenvalue: the
 * constant vector (eigenvalue 0) is skipped, so the first component is the Fiedler vector, as networkx's
 * `spectral_layout` places it. The eigenvectors come from Chebyshev-filtered subspace iteration with a Rayleigh-Ritz
 * step (Zhou and Saad, 2007), the filter damping the eigenvalues above the block's largest Ritz value, with the
 * constant vector projected out every step, from a seeded random start. The rows are rescaled so the farthest node is `scale` from
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
    const distinct = (u: number, a: number): boolean =>
        colIdx[a] !== u && (a === rowPtr[u] || colIdx[a] !== colIdx[a - 1]);
    const degree = new Float64Array(n);
    for (let u = 0; u < n; u++) {
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            degree[u] += distinct(u, a) ? 1 : 0;
        }
    }
    // The largest Laplacian eigenvalue is at most the largest d(u) + d(v) over the edges (Anderson and Morley, 1985).
    let shift = 1;
    for (let u = 0; u < n; u++) {
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            shift = Math.max(shift, degree[u] + degree[colIdx[a]]);
        }
    }
    // (L - c I) x / e, with its mean removed so the constant vector never re-enters
    const laplacian = (x: F64, c = 0, e = 1): F64 => {
        const out = new Float64Array(n);
        let mean = 0;
        for (let u = 0; u < n; u++) {
            let sum = (degree[u] - c) * x[u];
            for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
                if (distinct(u, a)) {
                    sum -= x[colIdx[a]];
                }
            }
            out[u] = sum / e;
            mean += out[u] / n;
        }
        return out.map((v) => v - mean);
    };
    const rng = new RandomNumberGenerator(seed ?? undefined);
    const random = (): number => (rng.rand() as number) - 0.5;
    // the space orthogonal to the constant vector has n - 1 dimensions; components past it stay 0
    const wanted = Math.min(dim, n - 1);
    const p = Math.min(n - 1, wanted + Math.max(wanted, 8));
    let block = Array.from({ length: p }, () => Float64Array.from({ length: n }, random));
    orthonormalise(block, random);
    let ritz = new Float64Array(p);
    let q = new Float64Array(p * p);
    let order: number[] = [];
    // ponytail: a long path or a large tree has eigenvalues packed near 0 and reaches the cap (about a second at 2000
    // nodes) with an approximation that still draws its order; a Lanczos solver would converge there.
    for (let round = 0; round < MAX_ROUNDS; round++) {
        const image = block.map((x) => laplacian(x));
        const h = new Float64Array(p * p);
        for (let i = 0; i < p; i++) {
            for (let j = i; j < p; j++) {
                h[i * p + j] = h[j * p + i] = dot(block[i], image[j]);
            }
        }
        ({ values: ritz, vectors: q } = jacobi(h, p));
        order = Array.from({ length: p }, (_, i) => i).sort((a, b) => ritz[a] - ritz[b]);
        const converged = order.slice(0, wanted).every((col) => {
            let residual = 0;
            for (let r = 0; r < n; r++) {
                let diff = 0;
                for (let i = 0; i < p; i++) {
                    diff += q[i * p + col] * (image[i][r] - ritz[col] * block[i][r]);
                }
                residual += diff * diff;
            }
            return Math.sqrt(residual) <= TOLERANCE * shift;
        });
        if (converged || round === MAX_ROUNDS - 1) {
            break;
        }
        // T_d((L - c) / e) over [alpha, shift], the part of the spectrum the block is not after, keeps that part
        // within [-1, 1] and grows everything below alpha, the smallest eigenvalues fastest
        const alpha = ritz[order[p - 1]];
        const c = (alpha + shift) / 2;
        const e = (shift - alpha) / 2;
        if (e <= 1e-9 * shift) {
            break; // the block already spans the spectrum's whole top end, so its Ritz pairs are exact
        }
        block = block.map((x) => {
            let previous = x;
            let current = laplacian(x, c, e);
            for (let j = 1; j < FILTER_DEGREE; j++) {
                const next = laplacian(current, c, e);
                for (let r = 0; r < n; r++) {
                    next[r] = 2 * next[r] - previous[r];
                }
                previous = current;
                current = next;
            }
            return current;
        });
        orthonormalise(block, random);
    }
    for (let k = 0; k < wanted; k++) {
        const col = order[k];
        for (let i = 0; i < p; i++) {
            const c = q[i * p + col];
            for (let r = 0; r < n; r++) {
                rows[dim * r + k] += c * block[i][r];
            }
        }
    }
    rescaleInPlace(rows, dim, scale);
    for (let i = 0; i < n * dim; i++) {
        rows[i] += center[i % dim];
    }
    return rows;
}

/**
 * The dot product.
 * @param a - one vector
 * @param b - another of the same length
 * @returns their dot product
 */
function dot(a: F64, b: F64): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}

/**
 * Make the block orthonormal and orthogonal to the constant vector, in place (Gram-Schmidt, applied twice). A vector
 * that collapses is replaced by a fresh random one.
 * @param block - vectors of one length
 * @param random - the generator of replacements
 */
function orthonormalise(block: F64[], random: () => number): void {
    for (let j = 0; j < block.length; j++) {
        const v = block[j];
        for (let attempt = 0; ; attempt++) {
            projectOut(block, j);
            projectOut(block, j);
            if (normalise(v, attempt === 3)) {
                break;
            }
            for (let r = 0; r < v.length; r++) {
                v[r] = random();
            }
        }
    }
}

/**
 * Scale a vector to unit length, in place, unless it has collapsed (and this is not the last try).
 * @param v - the vector
 * @param last - true on the last try, when a collapsed vector is kept as it is (zero, if it is)
 * @returns true when the vector was scaled, false when it collapsed and should be replaced
 */
function normalise(v: F64, last: boolean): boolean {
    const length = Math.sqrt(dot(v, v));
    if ((Number.isNaN(length) || length <= 1e-10) && !last) {
        return false;
    }
    for (let r = 0; r < v.length; r++) {
        v[r] = length > 0 ? v[r] / length : 0;
    }
    return true;
}

/**
 * One Gram-Schmidt pass, in place: remove from vector j its mean (the constant vector) and its
 * component along each earlier vector of the block.
 * @param block - vectors of one length, the first j already orthonormal
 * @param j - the vector to project
 */
function projectOut(block: F64[], j: number): void {
    const v = block[j];
    const mean = v.reduce((sum, x) => sum + x, 0) / v.length;
    for (let r = 0; r < v.length; r++) {
        v[r] -= mean;
    }
    for (let i = 0; i < j; i++) {
        const d = dot(block[i], v);
        for (let r = 0; r < v.length; r++) {
            v[r] -= d * block[i][r];
        }
    }
}

/**
 * Eigen-decomposition of a small symmetric matrix by cyclic Jacobi rotations.
 * @param a - p x p row-major, destroyed
 * @param p - the order
 * @returns the eigenvalues, and the eigenvectors as the columns of a p x p row-major matrix
 */
function jacobi(a: F64, p: number): { values: F64; vectors: F64 } {
    const v = new Float64Array(p * p);
    for (let i = 0; i < p; i++) {
        v[i * p + i] = 1;
    }
    for (let sweep = 0; sweep < 100 && offDiagonal(a, p) >= 1e-30; sweep++) {
        jacobiSweep(a, v, p);
    }
    return { values: Float64Array.from({ length: p }, (_, i) => a[i * p + i]), vectors: v };
}

/**
 * The sum of squares above the diagonal of a p x p row-major matrix.
 * @param a - the matrix
 * @param p - its order
 * @returns the sum
 */
function offDiagonal(a: F64, p: number): number {
    let off = 0;
    for (let i = 0; i < p; i++) {
        for (let j = i + 1; j < p; j++) {
            off += a[i * p + j] * a[i * p + j];
        }
    }
    return off;
}

/**
 * One cyclic sweep of Jacobi rotations over every pair above the diagonal, in place.
 * @param a - the matrix being diagonalised, p x p row-major
 * @param v - the accumulated eigenvectors, p x p row-major
 * @param p - the order
 */
function jacobiSweep(a: F64, v: F64, p: number): void {
    for (let i = 0; i < p; i++) {
        for (let j = i + 1; j < p; j++) {
            const aij = a[i * p + j];
            if (aij === 0) {
                continue;
            }
            const theta = (a[j * p + j] - a[i * p + i]) / (2 * aij);
            const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
            const c = 1 / Math.sqrt(t * t + 1);
            const sn = t * c;
            rotate(a, p, i, j, c, sn, true);
            rotate(a, p, i, j, c, sn, false);
            rotate(v, p, i, j, c, sn, true);
        }
    }
}

/**
 * One Givens rotation of columns (or rows) i and j of a p x p row-major matrix, in place.
 * @param m - the matrix
 * @param p - its order
 * @param i - the first column or row
 * @param j - the second
 * @param c - the cosine
 * @param sn - the sine
 * @param columns - true to rotate columns, false rows
 */
function rotate(m: F64, p: number, i: number, j: number, c: number, sn: number, columns: boolean): void {
    for (let r = 0; r < p; r++) {
        const at = columns ? r * p + i : i * p + r;
        const bt = columns ? r * p + j : j * p + r;
        const x = m[at];
        const y = m[bt];
        m[at] = c * x - sn * y;
        m[bt] = sn * x + c * y;
    }
}

/**
 * Nodes placed by the Laplacian's eigenvectors of the smallest non-zero eigenvalues (see `spectralRows`), one
 * component per dimension, rescaled so the farthest node is `scale` from the centre.
 * @param s - the snapshot; a directed one is read as its undirected derived graph
 * @param options - `seed` fixes the start vectors
 * @returns the layout
 */
export function spectral(s: GraphSnapshot, options: CommonLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    return result(spectralRows(toLayoutSnapshot(s), dim, scale, center, options.seed ?? null), dim, n);
}
