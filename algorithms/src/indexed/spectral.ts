import {
    type AdjacencyView,
    type GraphSnapshot,
    type NumericVector,
    renumberPartition,
    type U32,
} from "@graphty/graph-format";

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
}

/** Relative eigenvector residual at which subspace iteration stops. */
const RESIDUAL_TOLERANCE = 1e-11;

/** Subspace-iteration cap; each round costs one sparse product per block vector. */
const MAX_SUBSPACE_ROUNDS = 3000;

/**
 * mulberry32, the generator the label propagation port uses.
 * @param seed - Generator seed; only its low 32 bits are used
 * @returns The generator, output in [0, 1)
 */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** The symmetric weighted adjacency without self-loops, as rows of (neighbour, weight). */
interface SymmetricRows {
    readonly rowPtr: Uint32Array;
    readonly colIdx: Uint32Array;
    readonly w: Float64Array;
    readonly degree: Float64Array;
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
    const views: { view: AdjacencyView; arcOf: (k: number) => number }[] = [{ view: s, arcOf: (a) => a }];
    if (s.directed) {
        const rev = s.reverse();
        views.push({ view: rev, arcOf: (k) => rev.fwdArc[k] });
    }
    const rowPtr = new Uint32Array(n + 1);
    for (let u = 0; u < n; u++) {
        let kept = 0;
        for (const { view } of views) {
            for (let a = view.rowPtr[u]; a < view.rowPtr[u + 1]; a++) {
                kept += view.colIdx[a] === u ? 0 : 1;
            }
        }
        rowPtr[u + 1] = rowPtr[u] + kept;
    }
    const colIdx = new Uint32Array(rowPtr[n]);
    const w = new Float64Array(rowPtr[n]);
    const degree = new Float64Array(n);
    let k = 0;
    for (let u = 0; u < n; u++) {
        for (const { view, arcOf } of views) {
            for (let a = view.rowPtr[u]; a < view.rowPtr[u + 1]; a++) {
                const weight = weights === null ? 1 : weights[arcOf(a)];
                if (!(weight >= 0) || weight === Infinity) {
                    throw new RangeError(`an arc has weight ${weight}; spectral clustering needs finite, non-negative weights`);
                }
                if (view.colIdx[a] !== u) {
                    colIdx[k] = view.colIdx[a];
                    w[k++] = weight;
                    degree[u] += weight;
                }
            }
        }
    }
    return { rowPtr, colIdx, w, degree };
}

/**
 * Orthonormalise the columns of `block` in place (Gram-Schmidt, applied twice for stability). A
 * column that collapses is replaced by a fresh random one.
 * @param block - p columns of length n
 * @param random - The generator for replacements
 */
function orthonormalise(block: Float64Array[], random: () => number): void {
    for (let j = 0; j < block.length; j++) {
        const v = block[j];
        for (let attempt = 0; ; attempt++) {
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
            let norm = 0;
            for (let r = 0; r < v.length; r++) {
                norm += v[r] * v[r];
            }
            norm = Math.sqrt(norm);
            if (norm > 1e-10 || attempt === 3) {
                for (let r = 0; r < v.length; r++) {
                    v[r] = norm > 0 ? v[r] / norm : 0;
                }
                break;
            }
            for (let r = 0; r < v.length; r++) {
                v[r] = random() - 0.5;
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
        let off = 0;
        for (let i = 0; i < p; i++) {
            for (let j = i + 1; j < p; j++) {
                off += a[i * p + j] * a[i * p + j];
            }
        }
        if (off < 1e-30) {
            break;
        }
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
        }
    }
    return { values: Float64Array.from({ length: p }, (_, i) => a[i * p + i]), vectors: v };
}

/**
 * The k smallest eigenpairs of a symmetric Laplacian, by subspace iteration on `shift * I - L` (whose
 * largest eigenpairs they are) with a Rayleigh-Ritz step, over a block a few vectors wider than k.
 * @param apply - Writes `L x` into `out`
 * @param n - Order
 * @param k - Eigenpairs wanted
 * @param shift - An upper bound on the largest eigenvalue of L
 * @param random - The generator of the starting block
 * @returns Eigenvalues ascending and their eigenvectors
 */
function smallestEigenpairs(
    apply: (x: Float64Array, out: Float64Array) => void,
    n: number,
    k: number,
    shift: number,
    random: () => number,
): { values: Float64Array; vectors: Float64Array[] } {
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
    for (let round = 0; round < MAX_SUBSPACE_ROUNDS; round++) {
        const image = block.map(shifted);
        // Rayleigh-Ritz: the block's projection of the shifted operator, diagonalised.
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
        const eig = jacobi(h, p);
        ({ values: ritz, vectors } = eig);
        order = Array.from({ length: p }, (_, i) => i).sort((a, b) => ritz[b] - ritz[a]);
        // Converged when every wanted Ritz pair (y = X q, theta) has a residual |B y - theta y|
        // below RESIDUAL_TOLERANCE * shift; B y is the image block times q.
        const settled = order.slice(0, k).every((col) => {
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
        if (settled || round === MAX_SUBSPACE_ROUNDS - 1) {
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
    return { values, vectors: out };
}

/** k-means runs per clustering; the one with the lowest inertia is kept. */
const K_MEANS_RUNS = 10;

/**
 * The k-means objective: the summed squared distance of every row from its cluster's mean.
 * @param points - n rows of length d, row-major
 * @param assign - The cluster of every row
 * @param n - Row count
 * @param d - Row length
 * @param k - Cluster count
 * @returns The inertia
 */
function inertiaOf(points: Float64Array, assign: Uint32Array, n: number, d: number, k: number): number {
    const sums = new Float64Array(k * d);
    const sizes = new Float64Array(k);
    for (let i = 0; i < n; i++) {
        sizes[assign[i]]++;
        for (let t = 0; t < d; t++) {
            sums[assign[i] * d + t] += points[i * d + t];
        }
    }
    let total = 0;
    for (let i = 0; i < n; i++) {
        const c = assign[i];
        for (let t = 0; t < d; t++) {
            total += (points[i * d + t] - sums[c * d + t] / sizes[c]) ** 2;
        }
    }
    return total;
}

/**
 * k-means over the rows of an n x d embedding, seeded with k-means++ and refined by Lloyd rounds.
 * @param points - n rows of length d, row-major
 * @param n - Row count
 * @param d - Row length
 * @param k - Cluster count
 * @param maxIterations - Round cap
 * @param tolerance - Stop when no centroid moves further than this
 * @param random - The generator
 * @returns The cluster of every row
 */
function kMeans(
    points: Float64Array,
    n: number,
    d: number,
    k: number,
    maxIterations: number,
    tolerance: number,
    random: () => number,
): U32 {
    const dist2 = (i: number, centres: Float64Array, c: number): number => {
        let sum = 0;
        for (let t = 0; t < d; t++) {
            const diff = points[i * d + t] - centres[c * d + t];
            sum += diff * diff;
        }
        return sum;
    };
    const centres = new Float64Array(k * d);
    const nearest = new Float64Array(n).fill(Infinity);
    let pick = Math.floor(random() * n);
    for (let c = 0; c < k; c++) {
        centres.set(points.subarray(pick * d, pick * d + d), c * d);
        let total = 0;
        for (let i = 0; i < n; i++) {
            nearest[i] = Math.min(nearest[i], dist2(i, centres, c));
            total += nearest[i];
        }
        // k-means++: the next centre is a row drawn with probability proportional to its squared
        // distance from the nearest centre so far (the first row when every row sits on a centre).
        let target = random() * total;
        pick = 0;
        for (let i = 0; i < n && total > 0; i++) {
            target -= nearest[i];
            if (target < 0) {
                pick = i;
                break;
            }
        }
    }
    const assign = new Uint32Array(n);
    for (let round = 0; round < maxIterations; round++) {
        let changed = round === 0;
        for (let i = 0; i < n; i++) {
            let best = 0;
            let bestDist = Infinity;
            for (let c = 0; c < k; c++) {
                const dd = dist2(i, centres, c);
                if (dd < bestDist) {
                    bestDist = dd;
                    best = c;
                }
            }
            changed ||= assign[i] !== best;
            assign[i] = best;
        }
        if (!changed) {
            break;
        }
        const sums = new Float64Array(k * d);
        const sizes = new Float64Array(k);
        for (let i = 0; i < n; i++) {
            sizes[assign[i]]++;
            for (let t = 0; t < d; t++) {
                sums[assign[i] * d + t] += points[i * d + t];
            }
        }
        let shift = 0;
        for (let c = 0; c < k; c++) {
            if (sizes[c] === 0) {
                continue; // an emptied cluster keeps its centre
            }
            let moved = 0;
            for (let t = 0; t < d; t++) {
                const next = sums[c * d + t] / sizes[c];
                moved += (next - centres[c * d + t]) ** 2;
                centres[c * d + t] = next;
            }
            shift = Math.max(shift, Math.sqrt(moved));
        }
        if (shift < tolerance) {
            break;
        }
    }
    return assign;
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
 * ones; the legacy function uses fixed placeholder eigenvalues for k <= 3 and plain power iteration
 * (which finds the LARGEST eigenvectors) above that, and draws its k-means seeds from
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
    const maxIterations = options.maxIterations ?? 100;
    const tolerance = options.tolerance ?? 1e-4;
    const seed = options.seed ?? 42;
    if (!Number.isInteger(k) || k < 1) {
        throw new RangeError(`k must be a positive integer, got ${k}`);
    }
    if (!["unnormalized", "normalized", "randomWalk"].includes(type)) {
        throw new RangeError(`unknown laplacianType "${type}"`);
    }
    if (!Number.isInteger(maxIterations) || maxIterations < 0 || !(tolerance >= 0) || !Number.isInteger(seed)) {
        throw new RangeError("maxIterations and seed must be integers, maxIterations and tolerance non-negative");
    }
    const weights = options.weights ?? s.weights;
    if (weights !== null && weights.length !== s.arcCount) {
        throw new RangeError(`weights has ${weights.length} entries; the snapshot has ${s.arcCount} arcs`);
    }
    const n = s.nodeCount;
    if (k >= n) {
        const labels = Uint32Array.from({ length: n }, (_, i) => i);
        return { ...withGroups(labels, n), eigenvalues: new Float64Array(0), eigenvectors: [] };
    }
    const g = symmetricRows(s, weights);
    const scale = g.degree.map((d) => (d > 0 ? 1 / Math.sqrt(d) : 0));
    const normalised = type !== "unnormalized";
    const apply = (x: Float64Array, out: Float64Array): void => {
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
    // The largest eigenvalue is at most 2 for the normalised Laplacian, and at most the largest
    // d(u) + d(v) over the edges for D - A (Anderson and Morley, 1985).
    let shift = 2;
    if (!normalised) {
        shift = 1;
        for (let u = 0; u < n; u++) {
            for (let a = g.rowPtr[u]; a < g.rowPtr[u + 1]; a++) {
                shift = Math.max(shift, g.degree[u] + g.degree[g.colIdx[a]]);
            }
        }
    }
    const random = mulberry32(seed);
    const eig = smallestEigenpairs(apply, n, k, shift, random);
    if (type === "randomWalk") {
        for (const v of eig.vectors) {
            for (let i = 0; i < n; i++) {
                v[i] *= g.degree[i] > 0 ? scale[i] : 1;
            }
        }
    }
    const points = new Float64Array(n * k);
    for (let c = 0; c < k; c++) {
        for (let i = 0; i < n; i++) {
            points[i * k + c] = eig.vectors[c][i];
        }
    }
    if (type === "normalized") {
        for (let i = 0; i < n; i++) {
            const row = points.subarray(i * k, i * k + k);
            const norm = Math.hypot(...row);
            if (norm > 0) {
                row.forEach((x, c) => (row[c] = x / norm));
            }
        }
    }
    // Ten seeded k-means runs, keeping the tightest (the scikit-learn default): one run from an
    // unlucky seeding can split a clean cluster.
    let best: U32 = new Uint32Array(n);
    let bestInertia = Infinity;
    for (let run = 0; run < K_MEANS_RUNS; run++) {
        const assign = kMeans(points, n, k, k, maxIterations, tolerance, random);
        const inertia = inertiaOf(points, assign, n, k, k);
        if (inertia < bestInertia) {
            bestInertia = inertia;
            best = assign;
        }
    }
    const { labels, count } = renumberPartition(best);
    return { ...withGroups(labels, count), eigenvalues: eig.values, eigenvectors: eig.vectors };
}
