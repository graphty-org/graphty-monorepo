import type { F64, GraphSnapshot, U32 } from "@graphty/graph-format";

import { withCode } from "../errors.js";
import { mulberry32 } from "../utils/math-utilities.js";
import { withGroups } from "./components.js";

/** Options of the index-based SynC clustering, matching the legacy `syncClustering`. @public */
export interface SyncClusteringOptions {
    /** Number of cluster centres: an integer in `[1, nodeCount]` (legacy rounds a fraction up; the port throws). */
    readonly numClusters: number;
    /** Iteration cap; default 100. */
    readonly maxIterations?: number | undefined;
    /** Stop when the loss changes by less than this between iterations; default 1e-6. */
    readonly tolerance?: number | undefined;
    /** Seed of the embedding initialisation and the centre draws; default 42. */
    readonly seed?: number | undefined;
    /** Gradient step; default 0.01. */
    readonly learningRate?: number | undefined;
    /** Weight of the neighbour-reconstruction and regularisation terms; default 0.1. */
    readonly lambda?: number | undefined;
}

/** Result of the index-based SynC clustering. @public */
export interface SyncClusteringResult {
    /** The centre each node is closest to, in `[0, count)`. A centre may end up with no node. */
    readonly labels: U32;
    /** Number of cluster centres: `numClusters`. */
    readonly count: number;
    /**
     * Node indices grouped by centre, `count` arrays (an empty one for a centre no node is closest to), computed
     * once and cached.
     * @returns One array per centre
     */
    groups(): U32[];
    /** Node embeddings, row-major: node i is `embeddings.subarray(i * dimensions, (i + 1) * dimensions)`. */
    readonly embeddings: F64;
    /** Embedding length: `min(64, nodeCount)`. */
    readonly dimensions: number;
    /** Loss of the last iteration run (Infinity when none ran). */
    readonly loss: number;
    /** Loss of the iteration before the last (Infinity when fewer than two ran). */
    readonly previousLoss: number;
    /** Iterations run. */
    readonly iterations: number;
    /** Whether the loss settled within the tolerance before the cap. */
    readonly converged: boolean;
}

/**
 * Euclidean distance between two rows of a row-major matrix.
 * @param a - First matrix
 * @param i - Row of a
 * @param b - Second matrix
 * @param j - Row of b
 * @param dim - Row length
 * @returns The distance
 */
function distance(a: F64, i: number, b: F64, j: number, dim: number): number {
    let sum = 0;
    for (let k = 0; k < dim; k++) {
        const diff = a[i * dim + k] - b[j * dim + k];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

/**
 * SynC over a snapshot: node embeddings seeded from degree and a seeded generator, pulled toward
 * their out-neighbours by gradient steps, and clustered by k-means with k-means++ centres. The
 * arithmetic, and the order of every random draw, are the legacy `syncClustering`'s, so for the same
 * seed the labels and embeddings agree with it to rounding; the port draws from its own generator
 * instead of replacing `Math.random` for the duration of the call.
 *
 * Weights are ignored and a parallel arc pulls once per arc. The seeding degree is legacy's: in plus
 * out when directed, the stored arc count when undirected, so an undirected self-loop counts once.
 * @param s - The snapshot
 * @param options - {@link SyncClusteringOptions}
 * @returns Assignments, embeddings and convergence
 */
export function syncClustering(s: GraphSnapshot, options: SyncClusteringOptions): SyncClusteringResult {
    const {
        numClusters,
        maxIterations = 100,
        tolerance = 1e-6,
        seed = 42,
        learningRate = 0.01,
        lambda = 0.1,
    } = options;
    const n = s.nodeCount;
    if (n === 0) {
        return {
            ...withGroups(new Uint32Array(0), numClusters),
            embeddings: new Float64Array(0),
            dimensions: 0,
            loss: 0,
            previousLoss: Infinity,
            iterations: 0,
            converged: true,
        };
    }
    if (!Number.isInteger(numClusters) || numClusters <= 0 || numClusters > n) {
        throw withCode(
            new Error(`Invalid number of clusters: ${String(numClusters)}. Must be between 1 and ${String(n)}`),
            "E_BAD_OPTION",
        );
    }
    const random = mulberry32(seed);
    const dim = Math.min(64, n);
    const { rowPtr, colIdx } = s;

    const emb = new Float64Array(n * dim);
    // Legacy's degree: an undirected self-loop counts once (its single stored arc), not twice.
    const degree = s.directed ? s.degree() : s.outDegree();
    for (let u = 0; u < n; u++) {
        const normalized = degree[u] / Math.max(1, n - 1);
        for (let k = 0; k < dim; k++) {
            emb[u * dim + k] = (random() - 0.5) * 0.1 + normalized * 0.1;
        }
    }

    // k-means++: the first centre uniformly, each next one with probability proportional to the
    // squared distance to the nearest centre so far. A draw that rounding carries past the last
    // node adds no centre, as in legacy, so there may be fewer than numClusters.
    const centres = new Float64Array(numClusters * dim);
    const pick = Math.floor(random() * n);
    centres.set(emb.subarray(pick * dim, (pick + 1) * dim), 0);
    let centreCount = 1;
    const weight = new Float64Array(n);
    for (let k = 1; k < numClusters; k++) {
        let total = 0;
        for (let u = 0; u < n; u++) {
            let nearest = Infinity;
            for (let c = 0; c < centreCount; c++) {
                nearest = Math.min(nearest, distance(emb, u, centres, c, dim));
            }
            weight[u] = nearest * nearest;
            total += nearest * nearest;
        }
        let draw = random() * total;
        for (let u = 0; u < n; u++) {
            draw -= weight[u];
            if (draw <= 0) {
                centres.set(emb.subarray(u * dim, (u + 1) * dim), centreCount * dim);
                centreCount++;
                break;
            }
        }
    }

    const labels = new Uint32Array(n);
    const assign = (): void => {
        for (let u = 0; u < n; u++) {
            let bestCentre = 0;
            let bestDistance = Infinity;
            for (let c = 0; c < centreCount; c++) {
                const d = distance(emb, u, centres, c, dim);
                if (d < bestDistance) {
                    bestDistance = d;
                    bestCentre = c;
                }
            }
            labels[u] = bestCentre;
        }
    };

    const gradient = new Float64Array(n * dim);
    const sums = new Float64Array(numClusters * dim);
    const sizes = new Uint32Array(numClusters);
    let previousLoss = Infinity;
    let loss = Infinity;
    let iterations = 0;
    let converged = false;
    while (iterations < maxIterations) {
        iterations++;
        assign();

        // Every gradient from the embeddings before this step, then one step for all.
        gradient.fill(0);
        for (let u = 0; u < n; u++) {
            const row = u * dim;
            for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
                const other = colIdx[a] * dim;
                for (let k = 0; k < dim; k++) {
                    gradient[row + k] += lambda * (emb[row + k] - emb[other + k]);
                }
            }
            for (let k = 0; k < dim; k++) {
                gradient[row + k] += lambda * emb[row + k];
            }
        }
        for (let i = 0; i < emb.length; i++) {
            emb[i] -= learningRate * gradient[i];
        }

        sums.fill(0);
        sizes.fill(0);
        for (let u = 0; u < n; u++) {
            const c = labels[u];
            for (let k = 0; k < dim; k++) {
                sums[c * dim + k] += emb[u * dim + k];
            }
            sizes[c]++;
        }
        for (let c = 0; c < centreCount; c++) {
            if (sizes[c] > 0) {
                for (let k = 0; k < dim; k++) {
                    centres[c * dim + k] = sums[c * dim + k] / sizes[c];
                }
            }
        }

        let clustering = 0;
        let reconstruction = 0;
        let regularization = 0;
        for (let u = 0; u < n; u++) {
            clustering += distance(emb, u, centres, labels[u], dim) ** 2;
        }
        for (let u = 0; u < n; u++) {
            for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
                reconstruction += distance(emb, u, emb, colIdx[a], dim) ** 2;
            }
        }
        for (const value of emb) {
            regularization += value ** 2;
        }
        const current = clustering + lambda * reconstruction + lambda * regularization;
        if (iterations > 1) {
            previousLoss = loss;
        }
        loss = current;
        if (Math.abs(previousLoss - loss) < tolerance) {
            converged = true;
            break;
        }
    }
    assign();

    return {
        ...withGroups(labels, numClusters),
        embeddings: emb,
        dimensions: dim,
        loss,
        previousLoss,
        iterations,
        converged,
    };
}
