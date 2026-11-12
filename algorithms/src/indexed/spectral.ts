import {
    type AdjacencyView,
    detHypot,
    type GraphSnapshot,
    type NumericVector,
    renumberPartition,
    type U32,
} from "@graphty/graph-format";

import { withCode } from "../errors.js";
import { mulberry32 } from "../utils/math-utilities.js";
import { type LabelResult, withGroups } from "./components.js";

/** Which graph Laplacian the embedding comes from. @public */
export type LaplacianType = "unnormalized" | "normalized" | "randomWalk";

/** Options of the index-based spectral clustering. @public */
export interface SpectralOptions {
    /** Number of clusters, a positive integer. */
    readonly k: number;
    /** `D - A`, `I - D^-1/2 A D^-1/2` (rows of the embedding scaled to unit length) or `I - D^-1 A`; default normalized. */
    readonly laplacianType?: LaplacianType | undefined;
    /** Cap on k-means rounds; default 100. */
    readonly maxIterations?: number | undefined;
    /** k-means stops when no centroid moves further than this; default 1e-4. */
    readonly tolerance?: number | undefined;
    /** Seed of the starting block and of the k-means seeding; default 42. */
    readonly seed?: number | undefined;
    /** Per-arc weight override, arcCount long -- the facade passes `expandEdges(s, shadow.data)`. */
    readonly weights?: NumericVector | undefined;
}

/** Result of the index-based spectral clustering. @public */
export interface SpectralResult extends LabelResult {
    /** The k smallest eigenvalues of the Laplacian, ascending; empty when k >= nodeCount. */
    readonly eigenvalues: Float64Array;
    /** One nodeCount-long eigenvector per eigenvalue; for randomWalk, of `I - D^-1 A`. */
    readonly eigenvectors: Float64Array[];
    /**
     * Whether the eigenpairs met the residual tolerance. False when the iteration stopped at its
     * round cap -- on a graph whose small eigenvalues crowd together, such as a long path -- and
     * the eigenpairs are then approximations (the labels usually still hold). True when there
     * were no eigenpairs to compute.
     */
    readonly converged: boolean;
}

/** Relative eigenvector residual at which subspace iteration stops. */
const RESIDUAL_TOLERANCE = 1e-11;

/** Subspace-iteration cap; each round costs one sparse product per block vector. */
const MAX_SUBSPACE_ROUNDS = 3000;

/** The symmetric weighted adjacency without self-loops, as rows of (neighbour, weight). */
interface SymmetricRows {
    readonly rowPtr: Uint32Array;
    readonly colIdx: Uint32Array;
    readonly w: Float64Array;
    readonly degree: Float64Array;
}

/** One adjacency read into the symmetric rows, and the forward arc each of its arcs stands for. */
interface RowSource {
    readonly view: AdjacencyView;
    readonly arcOf: (k: number) => number;
}

/**
 * The arcs of row `u` across `views` that are not self-loops.
 * @param views - The adjacencies read
 * @param u - The node
 * @returns The count
 */
function keptArcs(views: RowSource[], u: number): number {
    let kept = 0;
    for (const { view } of views) {
        for (let a = view.rowPtr[u]; a < view.rowPtr[u + 1]; a++) {
            kept += view.colIdx[a] === u ? 0 : 1;
        }
    }
    return kept;
}

/**
 * Throws unless `weight` is finite and non-negative.
 * @param weight - The weight
 */
function checkSpectralWeight(weight: number): void {
    if (!(weight >= 0) || weight === Infinity) {
        throw withCode(
            new RangeError(`an arc has weight ${weight}; spectral clustering needs finite, non-negative weights`),
            "E_BAD_WEIGHT",
        );
    }
}

/**
 * Writes the non-self-loop arcs of row `u` into `out` from slot `k`, checking every weight.
 * @returns The next free slot
 * @param views - The adjacencies read
 * @param weights - Per-arc weights, or null for all ones
 * @param u - The node
 * @param out - The rows being filled
 * @param k - The first free slot
 */
function fillSymmetricRow(
    views: RowSource[],
    weights: NumericVector | null,
    u: number,
    out: SymmetricRows,
    k: number,
): number {
    for (const { view, arcOf } of views) {
        for (let a = view.rowPtr[u]; a < view.rowPtr[u + 1]; a++) {
            const weight = weights === null ? 1 : weights[arcOf(a)];
            checkSpectralWeight(weight);
            if (view.colIdx[a] !== u) {
                out.colIdx[k] = view.colIdx[a];
                out.w[k++] = weight;
                out.degree[u] += weight;
            }
        }
    }
    return k;
}

/**
 * The snapshot's adjacency made symmetric -- a directed snapshot's out-row and in-row together, so
 * a reciprocal pair sums -- with self-loops dropped (they cancel in `D - A`) and weights checked.
 * @param s - The snapshot
 * @param weights - Per-arc weights, or null for all ones
 * @returns The rows and the weighted degrees
 */
function symmetricRows(s: GraphSnapshot, weights: NumericVector | null): SymmetricRows {
    const n = s.nodeCount;
    const views: RowSource[] = [{ view: s, arcOf: (a) => a }];
    if (s.directed) {
        const rev = s.reverse();
        views.push({ view: rev, arcOf: (k) => rev.fwdArc[k] });
    }
    const rowPtr = new Uint32Array(n + 1);
    for (let u = 0; u < n; u++) {
        rowPtr[u + 1] = rowPtr[u] + keptArcs(views, u);
    }
    const out: SymmetricRows = {
        rowPtr,
        colIdx: new Uint32Array(rowPtr[n]),
        w: new Float64Array(rowPtr[n]),
        degree: new Float64Array(n),
    };
    let k = 0;
    for (let u = 0; u < n; u++) {
        k = fillSymmetricRow(views, weights, u, out, k);
    }
    return out;
}

/**
 * Subtracts from `v` its projection on each of the first `j` columns of `block`, twice.
 * @param block - p columns of length n
 * @param j - The column index
 * @param v - The column, `block[j]`
 */
function subtractProjections(block: Float64Array[], j: number, v: Float64Array): void {
    for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < j; i++) {
            const q = block[i];
            let dot = 0;
            for (let r = 0; r < v.length; r++) {
                dot += q[r] * v[r];
            }
            for (let r = 0; r < v.length; r++) {
                v[r] -= dot * q[r];
            }
        }
    }
}

/**
 * The Euclidean length of `v`.
 * @param v - The vector
 * @returns The length
 */
function vectorNorm(v: Float64Array): number {
    let norm = 0;
    for (let r = 0; r < v.length; r++) {
        norm += v[r] * v[r];
    }
    return Math.sqrt(norm);
}

/**
 * Orthonormalises column `j` against the columns before it, redrawing it while it collapses.
 * @param block - p columns of length n
 * @param j - The column index
 * @param random - The seeded generator
 */
function orthonormaliseColumn(block: Float64Array[], j: number, random: () => number): void {
    const v = block[j];
    for (let attempt = 0; ; attempt++) {
        subtractProjections(block, j, v);
        const norm = vectorNorm(v);
        if (norm > 1e-10 || attempt === 3) {
            for (let r = 0; r < v.length; r++) {
                v[r] = norm > 0 ? v[r] / norm : 0;
            }
            return;
        }
        for (let r = 0; r < v.length; r++) {
            v[r] = random() - 0.5;
        }
    }
}

/**
 * Orthonormalise the columns of `block` in place (Gram-Schmidt, applied twice for stability). A
 * column that collapses is replaced by a fresh random one.
 * @param block - p columns of length n
 * @param random - The generator for replacements
 */
function orthonormalise(block: Float64Array[], random: () => number): void {
    for (let j = 0; j < block.length; j++) {
        orthonormaliseColumn(block, j, random);
    }
}

/**
 * The sum of squares above the diagonal of the p x p row-major `a`.
 * @param a - p x p row-major
 * @param p - The order
 * @returns The sum of squares
 */
function offDiagonal(a: Float64Array, p: number): number {
    let off = 0;
    for (let i = 0; i < p; i++) {
        for (let j = i + 1; j < p; j++) {
            off += a[i * p + j] * a[i * p + j];
        }
    }
    return off;
}

/**
 * One Jacobi rotation zeroing `a[i][j]`, applied to `a` and accumulated into `v`.
 * @param a - p x p row-major, rotated in place
 * @param v - The eigenvector accumulator, p x p row-major
 * @param p - The order
 * @param i - The row of the entry to zero
 * @param j - The column of the entry to zero
 */
function jacobiRotate(a: Float64Array, v: Float64Array, p: number, i: number, j: number): void {
    const aij = a[i * p + j];
    const theta = (a[j * p + j] - a[i * p + i]) / (2 * aij);
    const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
    const c = 1 / Math.sqrt(t * t + 1);
    const sn = t * c;
    for (let r = 0; r < p; r++) {
        const ari = a[r * p + i];
        const arj = a[r * p + j];
        a[r * p + i] = c * ari - sn * arj;
        a[r * p + j] = sn * ari + c * arj;
    }
    for (let r = 0; r < p; r++) {
        const air = a[i * p + r];
        const ajr = a[j * p + r];
        a[i * p + r] = c * air - sn * ajr;
        a[j * p + r] = sn * air + c * ajr;
    }
    for (let r = 0; r < p; r++) {
        const vri = v[r * p + i];
        const vrj = v[r * p + j];
        v[r * p + i] = c * vri - sn * vrj;
        v[r * p + j] = sn * vri + c * vrj;
    }
}

/**
 * One cyclic sweep of rotations over every nonzero entry above the diagonal.
 * @param a - p x p row-major, rotated in place
 * @param v - The eigenvector accumulator, p x p row-major
 * @param p - The order
 */
function jacobiSweep(a: Float64Array, v: Float64Array, p: number): void {
    for (let i = 0; i < p; i++) {
        for (let j = i + 1; j < p; j++) {
            if (a[i * p + j] !== 0) {
                jacobiRotate(a, v, p, i, j);
            }
        }
    }
}

/**
 * Eigen-decomposition of a small symmetric matrix by cyclic Jacobi rotations.
 * @param a - p x p row-major, destroyed
 * @param p - The order
 * @returns The eigenvalues and the eigenvectors as the columns of a p x p row-major matrix
 */
function jacobi(a: Float64Array, p: number): { values: Float64Array; vectors: Float64Array } {
    const v = new Float64Array(p * p);
    for (let i = 0; i < p; i++) {
        v[i * p + i] = 1;
    }
    for (let sweep = 0; sweep < 100; sweep++) {
        if (offDiagonal(a, p) < 1e-30) {
            break;
        }
        jacobiSweep(a, v, p);
    }
    return { values: Float64Array.from({ length: p }, (_, i) => a[i * p + i]), vectors: v };
}

/**
 * The p x p matrix of dot products `block[i] . image[j]`, filled from its upper triangle so it is
 * exactly symmetric.
 * @param block - p vectors of length n
 * @param image - The operator applied to each vector of `block`
 * @param n - Vector length
 * @returns The matrix, row-major
 */
function projection(block: Float64Array[], image: Float64Array[], n: number): Float64Array {
    const p = block.length;
    const h = new Float64Array(p * p);
    for (let i = 0; i < p; i++) {
        for (let j = i; j < p; j++) {
            let dot = 0;
            for (let r = 0; r < n; r++) {
                dot += block[i][r] * image[j][r];
            }
            h[i * p + j] = dot;
            h[j * p + i] = dot;
        }
    }
    return h;
}

/**
 * The k smallest eigenpairs of a symmetric Laplacian, by subspace iteration on `shift * I - L` (whose
 * largest eigenpairs they are) with a Rayleigh-Ritz step, over a block a few vectors wider than k.
 * @param apply - Writes `L x` into `out`
 * @param n - Order
 * @param k - Eigenpairs wanted
 * @param shift - An upper bound on the largest eigenvalue of L
 * @param random - The generator of the starting block
 * @returns Eigenvalues ascending, their eigenvectors, and whether they met the tolerance
 */
function smallestEigenpairs(
    apply: (x: Float64Array, out: Float64Array) => void,
    n: number,
    k: number,
    shift: number,
    random: () => number,
): { values: Float64Array; vectors: Float64Array[]; converged: boolean } {
    const p = Math.min(n, k + Math.max(k, 8));
    let block: Float64Array[] = Array.from({ length: p }, () => Float64Array.from({ length: n }, () => random() - 0.5));
    orthonormalise(block, random);
    const lx = new Float64Array(n);
    const shifted = (x: Float64Array): Float64Array => {
        apply(x, lx);
        return x.map((xi, r) => shift * xi - lx[r]);
    };
    let ritz: Float64Array = new Float64Array(p);
    let order: number[] = [];
    let vectors: Float64Array = new Float64Array(p * p);
    let converged = false;
    // ponytail: plain subspace iteration converges at the ratio of neighbouring shifted eigenvalues,
    // so a small spectral gap hits the cap; Chebyshev filtering would converge far faster there.
    for (let round = 0; round < MAX_SUBSPACE_ROUNDS; round++) {
        const image = block.map(shifted);
        // Rayleigh-Ritz: the block's projection of the shifted operator, diagonalised.
        const eig = jacobi(projection(block, image, n), p);
        ({ values: ritz, vectors } = eig);
        order = Array.from({ length: p }, (_, i) => i).sort((a, b) => ritz[b] - ritz[a]);
        // Converged when every wanted Ritz pair (y = X q, theta) has a residual |B y - theta y|
        // below RESIDUAL_TOLERANCE * shift; B y is the image block times q.
        converged = order.slice(0, k).every((col) => {
            let residual = 0;
            for (let r = 0; r < n; r++) {
                let diff = 0;
                for (let i = 0; i < p; i++) {
                    diff += vectors[i * p + col] * (image[i][r] - ritz[col] * block[i][r]);
                }
                residual += diff * diff;
            }
            return Math.sqrt(residual) <= RESIDUAL_TOLERANCE * shift;
        });
        if (converged || round === MAX_SUBSPACE_ROUNDS - 1) {
            break; // at the cap the Ritz pairs of this block are the best estimate there is
        }
        block = image;
        orthonormalise(block, random);
    }
    const values = new Float64Array(k);
    const out: Float64Array[] = [];
    for (let rank = 0; rank < k; rank++) {
        const col = order[rank];
        values[rank] = Math.max(0, shift - ritz[col]);
        const v = new Float64Array(n);
        for (let i = 0; i < p; i++) {
            const c = vectors[i * p + col];
            for (let r = 0; r < n; r++) {
                v[r] += c * block[i][r];
            }
        }
        out.push(v);
    }
    return { values, vectors: out, converged };
}

/** k-means runs per clustering; the one with the lowest inertia is kept. */
const K_MEANS_RUNS = 10;

/** An n x d embedding split into k clusters, as k-means reads it. */
interface KMeansProblem {
    /** n rows of length d, row-major. */
    readonly points: Float64Array;
    readonly n: number;
    readonly d: number;
    readonly k: number;
}

/**
 * The per-cluster coordinate sums and sizes of an assignment.
 * @param pr - The rows and the cluster count
 * @param assign - The cluster of every row
 * @returns The sums and sizes
 */
function clusterSums(pr: KMeansProblem, assign: Uint32Array): { sums: Float64Array; sizes: Float64Array } {
    const { points, n, d, k } = pr;
    const sums = new Float64Array(k * d);
    const sizes = new Float64Array(k);
    for (let i = 0; i < n; i++) {
        sizes[assign[i]]++;
        for (let t = 0; t < d; t++) {
            sums[assign[i] * d + t] += points[i * d + t];
        }
    }
    return { sums, sizes };
}

/**
 * The k-means objective: the summed squared distance of every row from its cluster's mean.
 * @param pr - The rows and the cluster count
 * @param assign - The cluster of every row
 * @returns The inertia
 */
function inertiaOf(pr: KMeansProblem, assign: Uint32Array): number {
    const { points, n, d } = pr;
    const { sums, sizes } = clusterSums(pr, assign);
    let total = 0;
    for (let i = 0; i < n; i++) {
        const c = assign[i];
        for (let t = 0; t < d; t++) {
            const delta = points[i * d + t] - sums[c * d + t] / sizes[c];
            total += delta * delta;
        }
    }
    return total;
}

/**
 * The squared distance from row `i` to centre `c`.
 * @param pr - The rows and the cluster count
 * @param i - The row
 * @param centres - k centres of length d, row-major
 * @param c - The centre
 * @returns The squared distance
 */
function dist2(pr: KMeansProblem, i: number, centres: Float64Array, c: number): number {
    const { points, d } = pr;
    let sum = 0;
    for (let t = 0; t < d; t++) {
        const diff = points[i * d + t] - centres[c * d + t];
        sum += diff * diff;
    }
    return sum;
}

/**
 * The k-means++ draw: a row with probability proportional to its squared distance from the
 * nearest centre so far (the first row when every row sits on a centre).
 * @param nearest - Each row's squared distance to its nearest centre
 * @param total - The sum of `nearest`
 * @param random - The seeded generator
 * @returns The drawn row
 */
function drawWeightedRow(nearest: Float64Array, total: number, random: () => number): number {
    let target = random() * total;
    for (let i = 0; i < nearest.length && total > 0; i++) {
        target -= nearest[i];
        if (target < 0) {
            return i;
        }
    }
    return 0;
}

/**
 * k-means++ seeding into `centres`.
 * @param pr - The rows and the cluster count
 * @param centres - k centres of length d, row-major
 * @param random - The seeded generator
 */
function seedCentres(pr: KMeansProblem, centres: Float64Array, random: () => number): void {
    const { points, n, d, k } = pr;
    const nearest = new Float64Array(n).fill(Infinity);
    let pick = Math.floor(random() * n);
    for (let c = 0; c < k; c++) {
        centres.set(points.subarray(pick * d, pick * d + d), c * d);
        let total = 0;
        for (let i = 0; i < n; i++) {
            nearest[i] = Math.min(nearest[i], dist2(pr, i, centres, c));
            total += nearest[i];
        }
        pick = drawWeightedRow(nearest, total, random);
    }
}

/**
 * The nearest centre of row `i`, the lowest index on a tie.
 * @param pr - The rows and the cluster count
 * @param i - The row
 * @param centres - k centres of length d, row-major
 * @returns The centre
 */
function nearestCentre(pr: KMeansProblem, i: number, centres: Float64Array): number {
    let best = 0;
    let bestDist = Infinity;
    for (let c = 0; c < pr.k; c++) {
        const dd = dist2(pr, i, centres, c);
        if (dd < bestDist) {
            bestDist = dd;
            best = c;
        }
    }
    return best;
}

/**
 * Moves every non-empty cluster's centre to its mean; an emptied cluster keeps its centre.
 * @returns The furthest any centre moved
 * @param pr - The rows and the cluster count
 * @param centres - k centres of length d, row-major
 * @param assign - The cluster of every row
 */
function moveCentres(pr: KMeansProblem, centres: Float64Array, assign: Uint32Array): number {
    const { d, k } = pr;
    const { sums, sizes } = clusterSums(pr, assign);
    let shift = 0;
    for (let c = 0; c < k; c++) {
        if (sizes[c] === 0) {
            continue;
        }
        let moved = 0;
        for (let t = 0; t < d; t++) {
            const next = sums[c * d + t] / sizes[c];
            const delta = next - centres[c * d + t];
            moved += delta * delta;
            centres[c * d + t] = next;
        }
        shift = Math.max(shift, Math.sqrt(moved));
    }
    return shift;
}

/**
 * k-means over the rows of an n x d embedding, seeded with k-means++ and refined by Lloyd rounds.
 * @param pr - The rows and the cluster count
 * @param maxIterations - Round cap
 * @param tolerance - Stop when no centroid moves further than this
 * @param random - The generator
 * @returns The cluster of every row
 */
function kMeans(pr: KMeansProblem, maxIterations: number, tolerance: number, random: () => number): U32 {
    const centres = new Float64Array(pr.k * pr.d);
    seedCentres(pr, centres, random);
    const assign = new Uint32Array(pr.n);
    for (let round = 0; round < maxIterations; round++) {
        let changed = round === 0;
        for (let i = 0; i < pr.n; i++) {
            const best = nearestCentre(pr, i, centres);
            changed ||= assign[i] !== best;
            assign[i] = best;
        }
        if (!changed || moveCentres(pr, centres, assign) < tolerance) {
            break;
        }
    }
    return assign;
}

/**
 * Throws on an option spectral clustering cannot use.
 * @param s - The snapshot
 * @param options - The caller's options
 * @param type - The Laplacian
 * @param weights - Per-arc weights, or null for all ones
 */
function checkSpectralOptions(
    s: GraphSnapshot,
    options: SpectralOptions,
    type: LaplacianType,
    weights: NumericVector | null,
): void {
    const { k } = options;
    const maxIterations = options.maxIterations ?? 100;
    const tolerance = options.tolerance ?? 1e-4;
    const seed = options.seed ?? 42;
    if (!Number.isInteger(k) || k < 1) {
        throw withCode(new RangeError(`k must be a positive integer, got ${k}`), "E_BAD_OPTION");
    }
    if (!["unnormalized", "normalized", "randomWalk"].includes(type)) {
        throw withCode(new RangeError(`unknown laplacianType "${type}"`), "E_BAD_OPTION");
    }
    if (!Number.isInteger(maxIterations) || maxIterations < 0 || !(tolerance >= 0) || !Number.isInteger(seed)) {
        throw withCode(
            new RangeError("maxIterations and seed must be integers, maxIterations and tolerance non-negative"),
            "E_BAD_OPTION",
        );
    }
    if (weights !== null && weights.length !== s.arcCount) {
        throw withCode(
            new RangeError(`weights has ${weights.length} entries; the snapshot has ${s.arcCount} arcs`),
            "E_BAD_OPTION",
        );
    }
}

/**
 * Writes `L x` into `out`, straight from the symmetric rows.
 * @param g - The symmetric rows
 * @param scale - `D^-1/2`, 0 for a degree-0 node
 * @param normalised - Whether the Laplacian is normalised
 * @returns The operator
 */
function laplacianOperator(
    g: SymmetricRows,
    scale: Float64Array,
    normalised: boolean,
): (x: Float64Array, out: Float64Array) => void {
    const n = g.degree.length;
    return (x, out) => {
        for (let u = 0; u < n; u++) {
            let ax = 0;
            for (let a = g.rowPtr[u]; a < g.rowPtr[u + 1]; a++) {
                const v = g.colIdx[a];
                ax += normalised ? g.w[a] * scale[v] * x[v] : g.w[a] * x[v];
            }
            if (normalised) {
                out[u] = g.degree[u] > 0 ? x[u] - scale[u] * ax : 0;
            } else {
                out[u] = g.degree[u] * x[u] - ax;
            }
        }
    };
}

/**
 * An upper bound on the Laplacian's largest eigenvalue: 2 for the normalised Laplacian, and the
 * largest d(u) + d(v) over the edges (at least 1) for D - A (Anderson and Morley, 1985).
 * @param g - The symmetric rows
 * @param normalised - Whether the Laplacian is normalised
 * @returns The bound
 */
function spectralShift(g: SymmetricRows, normalised: boolean): number {
    if (normalised) {
        return 2;
    }
    let shift = 1;
    for (let u = 0; u < g.degree.length; u++) {
        for (let a = g.rowPtr[u]; a < g.rowPtr[u + 1]; a++) {
            shift = Math.max(shift, g.degree[u] + g.degree[g.colIdx[a]]);
        }
    }
    return shift;
}

/**
 * Multiplies every eigenvector by `D^-1/2`, leaving entries of degree-0 nodes as they are.
 * @param vectors - The eigenvectors, n long each
 * @param g - The symmetric rows
 * @param scale - `D^-1/2`, 0 for a degree-0 node
 */
function scaleByInverseRootDegree(vectors: Float64Array[], g: SymmetricRows, scale: Float64Array): void {
    for (const v of vectors) {
        for (let i = 0; i < v.length; i++) {
            v[i] *= g.degree[i] > 0 ? scale[i] : 1;
        }
    }
}

/**
 * Scales every nonzero row of the n x k `points` to unit length.
 * @param points - n rows of length k, row-major
 * @param n - The node count
 * @param k - The embedding dimension
 */
function unitRows(points: Float64Array, n: number, k: number): void {
    for (let i = 0; i < n; i++) {
        const row = points.subarray(i * k, i * k + k);
        const norm = detHypot(...row);
        if (norm > 0) {
            row.forEach((x, c) => (row[c] = x / norm));
        }
    }
}

/**
 * The n x k embedding, one row per node: the eigenvectors (for randomWalk scaled by `D^-1/2`
 * first, which changes them in place), and for normalized every row scaled to unit length.
 * @param vectors - The eigenvectors, n long each
 * @param g - The symmetric rows
 * @param scale - `D^-1/2`, 0 for a degree-0 node
 * @param type - The Laplacian
 * @param k - Row length
 * @returns The embedding, row-major
 */
function embedding(
    vectors: Float64Array[],
    g: SymmetricRows,
    scale: Float64Array,
    type: LaplacianType,
    k: number,
): Float64Array {
    const n = g.degree.length;
    if (type === "randomWalk") {
        scaleByInverseRootDegree(vectors, g, scale);
    }
    const points = new Float64Array(n * k);
    for (let c = 0; c < k; c++) {
        for (let i = 0; i < n; i++) {
            points[i * k + c] = vectors[c][i];
        }
    }
    if (type === "normalized") {
        unitRows(points, n, k);
    }
    return points;
}

/**
 * Ten seeded k-means runs, keeping the tightest (the scikit-learn default): one run from an
 * unlucky seeding can split a clean cluster.
 * @param pr - The rows and the cluster count
 * @param maxIterations - Round cap
 * @param tolerance - Stop when no centroid moves further than this
 * @param random - The seeded generator
 * @returns The cluster of every row
 */
function tightestKMeans(pr: KMeansProblem, maxIterations: number, tolerance: number, random: () => number): U32 {
    let best: U32 = new Uint32Array(pr.n);
    let bestInertia = Infinity;
    for (let run = 0; run < K_MEANS_RUNS; run++) {
        const assign = kMeans(pr, maxIterations, tolerance, random);
        const inertia = inertiaOf(pr, assign);
        if (inertia < bestInertia) {
            bestInertia = inertia;
            best = assign;
        }
    }
    return best;
}

/**
 * Spectral clustering, the index-based port of the legacy `spectralClustering`: the k eigenvectors
 * of the graph Laplacian with the smallest eigenvalues embed every node as a point in k dimensions,
 * and k-means splits the points into at most k clusters.
 *
 * The Laplacian is applied straight from the CSR rows and never built: `D - A`
 * (`unnormalized`), `I - D^-1/2 A D^-1/2` (`normalized`, whose embedded rows are then scaled to
 * unit length, as Ng, Jordan and Weiss do) or `I - D^-1 A` (`randomWalk`, whose eigenvectors are
 * `D^-1/2` times the normalized ones). A node of degree 0 has a zero row. Self-loops are ignored
 * (they cancel in `D - A`) and a directed snapshot is read as undirected, a reciprocal pair
 * summing. A negative, NaN or infinite weight throws. With `k >= nodeCount` every node is its own
 * cluster.
 *
 * The eigenpairs come from subspace iteration with Rayleigh-Ritz, so they are the true smallest
 * ones when `converged` is true; `converged` is false when the iteration stopped at its round cap
 * (a small spectral gap, such as a path of hundreds of nodes), and the eigenpairs are then only
 * approximate. The legacy function uses fixed placeholder eigenvalues for k <= 3 and plain power
 * iteration (which finds the LARGEST eigenvectors) above that, and draws its k-means seeds from
 * `Math.random` unless given a seed. The partitions therefore differ from the legacy function's;
 * one `seed` gives one result. Labels are dense in first-seen order, so `count` is below k when
 * k-means leaves a cluster empty.
 * @param s - Any snapshot
 * @param options - k, the Laplacian, the k-means limits, the seed and the weight override
 * @returns The partition and the eigenpairs it came from
 * @public
 */
export function spectralClustering(s: GraphSnapshot, options: SpectralOptions): SpectralResult {
    const { k } = options;
    const type = options.laplacianType ?? "normalized";
    const weights = options.weights ?? s.weights;
    checkSpectralOptions(s, options, type, weights);
    const n = s.nodeCount;
    if (k >= n) {
        const labels = Uint32Array.from({ length: n }, (_, i) => i);
        return { ...withGroups(labels, n), eigenvalues: new Float64Array(0), eigenvectors: [], converged: true };
    }
    const g = symmetricRows(s, weights);
    const scale = g.degree.map((d) => (d > 0 ? 1 / Math.sqrt(d) : 0));
    const normalised = type !== "unnormalized";
    const random = mulberry32(options.seed ?? 42);
    const eig = smallestEigenpairs(laplacianOperator(g, scale, normalised), n, k, spectralShift(g, normalised), random);
    const points = embedding(eig.vectors, g, scale, type, k);
    const best = tightestKMeans(
        { points, n, d: k, k },
        options.maxIterations ?? 100,
        options.tolerance ?? 1e-4,
        random,
    );
    const { labels, count } = renumberPartition(best);
    return {
        ...withGroups(labels, count),
        eigenvalues: eig.values,
        eigenvectors: eig.vectors,
        converged: eig.converged,
    };
}
