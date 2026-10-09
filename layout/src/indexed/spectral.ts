import type { F64, GraphSnapshot } from "@graphty/graph-format";

import { type LayoutResult, rescaleInPlace } from "../positions.js";
import { toLayoutSnapshot } from "../simulation/snapshot.js";
import { RandomNumberGenerator } from "../utils/random.js";
import { type CommonLayoutOptions, resolve, result } from "./common.js";

/** Residual `|L x - theta x|` at which an eigenvector counts as found, relative to the Gershgorin bound on L. */
const TOLERANCE = 1e-9;

/** Iteration cap per component; a long path's crowded small eigenvalues are what reach it. */
const MAX_ITERATIONS = 5000;

/**
 * Spectral rows over an undirected snapshot, as NetworkX's `spectral_layout`: component k is the Laplacian's
 * eigenvector of the k-th smallest eigenvalue after the constant one (the Fiedler vector first). The Laplacian
 * counts each distinct neighbour once and ignores self-loops. Each component is found by LOBPCG (Rayleigh-Ritz over
 * the current vector, its residual and the previous step) from a seeded random start, kept orthogonal to the
 * constant vector and to the earlier components, so a repeated eigenvalue gives an orthonormal basis of its
 * eigenspace. A component the graph has no eigenvector left for (`dim >= n`) is zero. The rows are rescaled so the
 * farthest node is `scale` from `center`. One node sits on the centre; two sit at the centre minus and plus
 * `scale` in every component.
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
    const laplacian = (x: F64): F64 => {
        const out = new Float64Array(n);
        for (let u = 0; u < n; u++) {
            let sum = degree[u] * x[u];
            for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
                if (distinct(u, a)) {
                    sum -= x[colIdx[a]];
                }
            }
            out[u] = sum;
        }
        return out;
    };
    const tolerance = TOLERANCE * 2 * Math.max(1, ...degree);
    const rng = new RandomNumberGenerator(seed ?? undefined);
    // the constant vector, the eigenvector of 0, and then every component found so far
    const found: F64[] = [new Float64Array(n).fill(1 / Math.sqrt(n))];
    for (let d = 0; d < dim; d++) {
        const start = Float64Array.from({ length: n }, () => (rng.rand() as number) - 0.5);
        const component = orthonormal(start, found) ? smallest(laplacian, start, found, tolerance) : start.fill(0);
        found.push(component);
        for (let i = 0; i < n; i++) {
            rows[dim * i + d] = component[i];
        }
    }
    rescaleInPlace(rows, dim, scale);
    for (let i = 0; i < n * dim; i++) {
        rows[i] += center[i % dim];
    }
    return rows;
}

/**
 * The eigenvector of the smallest eigenvalue of L restricted to the complement of `found`, by LOBPCG without a
 * preconditioner: each step is the Rayleigh-Ritz minimum over the span of x, its residual and the previous step.
 * @param laplacian - `x => L x`
 * @param x - a unit start vector orthogonal to `found`, replaced by the result
 * @param found - orthonormal vectors to stay orthogonal to
 * @param tolerance - the residual norm at which to stop
 * @returns x
 */
function smallest(laplacian: (x: F64) => F64, x: F64, found: readonly F64[], tolerance: number): F64 {
    let lx = laplacian(x);
    let step: F64 | null = null;
    // ponytail: unpreconditioned LOBPCG converges at about sqrt(gap / lambdaMax) per step, so a graph with
    // crowded small eigenvalues (a path of thousands of nodes) can stop at MAX_ITERATIONS with an approximate
    // vector; shift-invert or a multigrid preconditioner is the upgrade if that ever matters.
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        const theta = dot(x, lx);
        const residual = lx.map((v, i) => v - theta * x[i]);
        if (norm(residual) < tolerance) {
            break;
        }
        const basis = [x];
        for (const v of step === null ? [residual] : [residual, step]) {
            if (orthonormal(v, [...found, ...basis])) {
                basis.push(v);
            }
        }
        const images = [lx, ...basis.slice(1).map(laplacian)];
        const h = basis.map((bi) => images.map((lj) => dot(bi, lj)));
        const c = lowestEigenvector(h);
        const next = new Float64Array(x.length);
        const lnext = new Float64Array(x.length);
        const nextStep = new Float64Array(x.length);
        basis.forEach((b, k) => {
            for (let i = 0; i < x.length; i++) {
                next[i] += c[k] * b[i];
                lnext[i] += c[k] * images[k][i];
                if (k > 0) {
                    nextStep[i] += c[k] * b[i];
                }
            }
        });
        x.set(next);
        lx = lnext;
        step = nextStep;
    }
    return x;
}

/**
 * The eigenvector of the smallest eigenvalue of a small symmetric matrix, by cyclic Jacobi rotations.
 * @param h - the rows of the matrix, destroyed
 * @returns the unit eigenvector
 */
function lowestEigenvector(h: number[][]): number[] {
    const p = h.length;
    const v = h.map((_, i) => h.map((__, j) => (i === j ? 1 : 0)));
    for (let sweep = 0; sweep < 50; sweep++) {
        for (let i = 0; i < p; i++) {
            for (let j = i + 1; j < p; j++) {
                if (Math.abs(h[i][j]) < 1e-300) {
                    continue;
                }
                const theta = (h[j][j] - h[i][i]) / (2 * h[i][j]);
                const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
                const c = 1 / Math.sqrt(t * t + 1);
                const s = t * c;
                // h = J^T h J and v = v J: the columns of both, then the rows of h
                for (const m of [h, v]) {
                    for (const r of m) {
                        [r[i], r[j]] = [c * r[i] - s * r[j], s * r[i] + c * r[j]];
                    }
                }
                [h[i], h[j]] = [h[i].map((a, k) => c * a - s * h[j][k]), h[i].map((a, k) => s * a + c * h[j][k])];
            }
        }
    }
    let lowest = 0;
    for (let i = 1; i < p; i++) {
        if (h[i][i] < h[lowest][lowest]) {
            lowest = i;
        }
    }
    return v.map((r) => r[lowest]);
}

/**
 * Make `v` a unit vector orthogonal to the orthonormal `against`, in place (Gram-Schmidt, twice for stability).
 * @param v - the vector
 * @param against - orthonormal vectors
 * @returns false when nothing of `v` is left outside their span
 */
function orthonormal(v: F64, against: readonly F64[]): boolean {
    const before = norm(v);
    for (let pass = 0; pass < 2; pass++) {
        for (const q of against) {
            const along = dot(v, q);
            for (let i = 0; i < v.length; i++) {
                v[i] -= along * q[i];
            }
        }
    }
    const after = norm(v);
    if (!(after > 1e-8 * before)) {
        return false;
    }
    for (let i = 0; i < v.length; i++) {
        v[i] /= after;
    }
    return true;
}

/**
 * The dot product.
 * @param a - a vector
 * @param b - a vector of the same length
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
 * Nodes placed by the Laplacian's eigenvectors of its smallest non-zero eigenvalues (see `spectralRows`), one
 * component per dimension, rescaled so the farthest node is `scale` from the centre.
 * @param s - the snapshot; a directed one is read as its undirected derived graph
 * @param options - `seed` fixes the start vectors
 * @returns the layout
 */
export function spectral(s: GraphSnapshot, options: CommonLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    return result(spectralRows(toLayoutSnapshot(s), dim, scale, center, options.seed ?? null), dim, n);
}
