import type { F64, GraphSnapshot } from "@graphty/graph-format";

import { type LayoutResult, rescaleInPlace } from "../positions.js";
import { toLayoutSnapshot } from "../simulation/snapshot.js";
import { RandomNumberGenerator } from "../utils/random.js";
import { type CommonLayoutOptions, resolve, result } from "./common.js";

/** Up to this many nodes the Laplacian is decomposed exactly (dense, O(n^3)); above it, by the Lanczos method. */
const DENSE_LIMIT = 500;

/**
 * Spectral rows over an undirected snapshot: component k of each row is the eigenvector of the Laplacian with the
 * (k + 2)-th smallest eigenvalue, the first being the constant vector, as NetworkX's `spectral_layout` does. The
 * Laplacian counts each distinct neighbour once and ignores self-loops. Up to 500 nodes the eigenvectors are exact
 * (a dense symmetric eigendecomposition, which does not draw random numbers); above that they are approximated by
 * the Lanczos method from a seeded random start (see `iteratedSmallest`). The rows are rescaled so the
 * farthest node is `scale` from `center`. One node sits on the centre; two sit at the centre minus and plus `scale`
 * in every component.
 * @param g - an undirected snapshot
 * @param dim - components per row, any positive count
 * @param scale - the distance of the farthest node from the centre
 * @param center - `dim` components
 * @param seed - the start vectors' seed above 500 nodes, or null for a random one
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
    const neighbours = distinctNeighbours(g);
    const components = n <= DENSE_LIMIT ? denseSmallest(neighbours, dim) : iteratedSmallest(neighbours, dim, seed);
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
 * The distinct neighbours of every node other than itself.
 * @param g - an undirected snapshot (rows sorted)
 * @returns one list per node
 */
function distinctNeighbours(g: GraphSnapshot): number[][] {
    const lists: number[][] = [];
    for (let u = 0; u < g.nodeCount; u++) {
        const list: number[] = [];
        let previous = -1;
        for (let a = g.rowPtr[u]; a < g.rowPtr[u + 1]; a++) {
            const v = g.colIdx[a];
            if (v !== u && v !== previous) {
                list.push(v);
                previous = v;
            }
        }
        lists.push(list);
    }
    return lists;
}

/**
 * The eigenvectors of the 2nd to (dim + 1)-th smallest eigenvalues of the Laplacian, by a dense decomposition.
 * Missing ones (dim + 1 > n) are zero.
 * @param neighbours - the distinct neighbour lists
 * @param dim - how many
 * @returns `dim` vectors of n
 */
function denseSmallest(neighbours: readonly number[][], dim: number): F64[] {
    const n = neighbours.length;
    const a = Array.from({ length: n }, () => new Float64Array(n));
    neighbours.forEach((list, u) => {
        a[u][u] = list.length;
        for (const v of list) {
            a[u][v] = -1;
        }
    });
    const values = symmetricEigen(a);
    const order = Array.from({ length: n }, (_, i) => i).sort((x, y) => values[x] - values[y]);
    return Array.from({ length: dim }, (_, k) => {
        const v = new Float64Array(n);
        const column = order[k + 1];
        if (column !== undefined) {
            for (let i = 0; i < n; i++) {
                v[i] = a[i][column];
            }
        }
        return v;
    });
}

/**
 * The same eigenvectors as `denseSmallest`, approximated by the Lanczos method with full reorthogonalisation: a Krylov
 * basis of L from a seeded random start orthogonal to the constant vector (L keeps the basis orthogonal to it), then
 * the Ritz vectors of the smallest eigenvalues of the projected tridiagonal matrix.
 * @param neighbours - the distinct neighbour lists
 * @param dim - how many
 * @param seed - the start vector's seed, or null for a random one
 * @returns `dim` vectors of n
 */
function iteratedSmallest(neighbours: readonly number[][], dim: number, seed: number | null): F64[] {
    const n = neighbours.length;
    // ponytail: the basis costs n * steps^2, so steps fall as n grows (400 to 4,000 nodes, 70 at 100,000); a graph
    // whose small eigenvalues crowd together (a long path) then gets an approximation, which LOBPCG would sharpen
    const steps = Math.min(n - 1, 400, Math.max(4 * dim, Math.round(Math.sqrt(5e8 / n))));
    const rng = new RandomNumberGenerator(seed ?? undefined);
    const basis: F64[] = [];
    const alpha: number[] = [];
    const beta: number[] = [];
    let q = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        q[i] = (rng.rand() as number) - 0.5;
    }
    const orthogonalise = (v: F64): void => {
        let mean = 0;
        for (let i = 0; i < n; i++) {
            mean += v[i];
        }
        mean /= n;
        for (let i = 0; i < n; i++) {
            v[i] -= mean;
        }
        for (const b of basis) {
            let dot = 0;
            for (let i = 0; i < n; i++) {
                dot += v[i] * b[i];
            }
            for (let i = 0; i < n; i++) {
                v[i] -= dot * b[i];
            }
        }
    };
    orthogonalise(q);
    normalise(q);
    for (let j = 0; j < steps; j++) {
        basis.push(q);
        const w = new Float64Array(n);
        for (let u = 0; u < n; u++) {
            let lv = neighbours[u].length * q[u];
            for (const v of neighbours[u]) {
                lv -= q[v];
            }
            w[u] = lv;
        }
        let a = 0;
        for (let i = 0; i < n; i++) {
            a += q[i] * w[i];
        }
        alpha.push(a);
        // twice is enough to keep the basis orthogonal in floating point
        orthogonalise(w);
        orthogonalise(w);
        const b = norm(w);
        if (b < 1e-10) {
            break;
        }
        beta.push(b);
        for (let i = 0; i < n; i++) {
            w[i] /= b;
        }
        q = w;
    }
    const k = basis.length;
    const t = Array.from({ length: k }, () => new Float64Array(k));
    for (let i = 0; i < k; i++) {
        t[i][i] = alpha[i];
        if (i + 1 < k) {
            t[i][i + 1] = beta[i];
            t[i + 1][i] = beta[i];
        }
    }
    const values = symmetricEigen(t);
    const order = Array.from({ length: k }, (_, i) => i).sort((x, y) => values[x] - values[y]);
    return Array.from({ length: dim }, (_, d) => {
        const v = new Float64Array(n);
        const column = order[d];
        if (column !== undefined) {
            for (let j = 0; j < k; j++) {
                const coefficient = t[j][column];
                for (let i = 0; i < n; i++) {
                    v[i] += coefficient * basis[j][i];
                }
            }
        }
        return v;
    });
}

/**
 * Eigendecomposition of a symmetric matrix in place: Householder reduction to tridiagonal form, then the implicit QL
 * method (tred2 and tql2, as in EISPACK and JAMA). On return the columns of `a` are the eigenvectors.
 * @param a - the matrix, as rows; overwritten with the eigenvectors as columns
 * @returns the eigenvalues, in the order of the columns
 */
function symmetricEigen(a: F64[]): F64 {
    const n = a.length;
    const d = new Float64Array(n);
    const e = new Float64Array(n);
    // tred2
    for (let j = 0; j < n; j++) {
        d[j] = a[n - 1][j];
    }
    for (let i = n - 1; i > 0; i--) {
        let scale = 0;
        let h = 0;
        for (let k = 0; k < i; k++) {
            scale += Math.abs(d[k]);
        }
        if (scale === 0) {
            e[i] = d[i - 1];
            for (let j = 0; j < i; j++) {
                d[j] = a[i - 1][j];
                a[i][j] = 0;
                a[j][i] = 0;
            }
        } else {
            for (let k = 0; k < i; k++) {
                d[k] /= scale;
                h += d[k] * d[k];
            }
            let f = d[i - 1];
            let g = Math.sqrt(h);
            if (f > 0) {
                g = -g;
            }
            e[i] = scale * g;
            h -= f * g;
            d[i - 1] = f - g;
            for (let j = 0; j < i; j++) {
                e[j] = 0;
            }
            for (let j = 0; j < i; j++) {
                f = d[j];
                a[j][i] = f;
                g = e[j] + a[j][j] * f;
                for (let k = j + 1; k <= i - 1; k++) {
                    g += a[k][j] * d[k];
                    e[k] += a[k][j] * f;
                }
                e[j] = g;
            }
            f = 0;
            for (let j = 0; j < i; j++) {
                e[j] /= h;
                f += e[j] * d[j];
            }
            const hh = f / (h + h);
            for (let j = 0; j < i; j++) {
                e[j] -= hh * d[j];
            }
            for (let j = 0; j < i; j++) {
                f = d[j];
                g = e[j];
                for (let k = j; k <= i - 1; k++) {
                    a[k][j] -= f * e[k] + g * d[k];
                }
                d[j] = a[i - 1][j];
                a[i][j] = 0;
            }
        }
        d[i] = h;
    }
    for (let i = 0; i < n - 1; i++) {
        a[n - 1][i] = a[i][i];
        a[i][i] = 1;
        const h = d[i + 1];
        if (h !== 0) {
            for (let k = 0; k <= i; k++) {
                d[k] = a[k][i + 1] / h;
            }
            for (let j = 0; j <= i; j++) {
                let g = 0;
                for (let k = 0; k <= i; k++) {
                    g += a[k][i + 1] * a[k][j];
                }
                for (let k = 0; k <= i; k++) {
                    a[k][j] -= g * d[k];
                }
            }
        }
        for (let k = 0; k <= i; k++) {
            a[k][i + 1] = 0;
        }
    }
    for (let j = 0; j < n; j++) {
        d[j] = a[n - 1][j];
        a[n - 1][j] = 0;
    }
    a[n - 1][n - 1] = 1;
    e[0] = 0;
    // tql2
    for (let i = 1; i < n; i++) {
        e[i - 1] = e[i];
    }
    e[n - 1] = 0;
    let f = 0;
    let tst1 = 0;
    const eps = 2 ** -52;
    for (let l = 0; l < n; l++) {
        tst1 = Math.max(tst1, Math.abs(d[l]) + Math.abs(e[l]));
        let m = l;
        while (m < n - 1 && Math.abs(e[m]) > eps * tst1) {
            m++;
        }
        if (m > l) {
            do {
                let g = d[l];
                let p = (d[l + 1] - g) / (2 * e[l]);
                let r = Math.hypot(p, 1);
                if (p < 0) {
                    r = -r;
                }
                d[l] = e[l] / (p + r);
                d[l + 1] = e[l] * (p + r);
                const dl1 = d[l + 1];
                let h = g - d[l];
                for (let i = l + 2; i < n; i++) {
                    d[i] -= h;
                }
                f += h;
                p = d[m];
                let c = 1;
                let c2 = c;
                let c3 = c;
                const el1 = e[l + 1];
                let s = 0;
                let s2 = 0;
                for (let i = m - 1; i >= l; i--) {
                    c3 = c2;
                    c2 = c;
                    s2 = s;
                    g = c * e[i];
                    h = c * p;
                    r = Math.hypot(p, e[i]);
                    e[i + 1] = s * r;
                    s = e[i] / r;
                    c = p / r;
                    p = c * d[i] - s * g;
                    d[i + 1] = h + s * (c * g + s * d[i]);
                    for (let k = 0; k < n; k++) {
                        h = a[k][i + 1];
                        a[k][i + 1] = s * a[k][i] + c * h;
                        a[k][i] = c * a[k][i] - s * h;
                    }
                }
                p = (-s * s2 * c3 * el1 * e[l]) / dl1;
                e[l] = s * p;
                d[l] = c * p;
            } while (Math.abs(e[l]) > eps * tst1);
        }
        d[l] += f;
        e[l] = 0;
    }
    return d;
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
 * Nodes placed by the eigenvectors of the graph Laplacian with the smallest nonzero eigenvalues (see `spectralRows`),
 * one component per dimension, rescaled so the farthest node is `scale` from the centre: nodes that are close in the
 * graph land close together, so a path becomes a line, a cycle a circle and a grid a grid.
 * @param s - the snapshot; a directed one is read as its undirected derived graph
 * @param options - `seed` fixes the start vectors above 500 nodes
 * @returns the layout
 */
export function spectral(s: GraphSnapshot, options: CommonLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    return result(spectralRows(toLayoutSnapshot(s), dim, scale, center, options.seed ?? null), dim, n);
}
