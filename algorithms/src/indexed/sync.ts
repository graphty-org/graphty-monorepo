import type { F64, GraphSnapshot, U32 } from "@graphty/graph-format";

import { withCode } from "../errors.js";
import { mulberry32 } from "../utils/math-utilities.js";
import { withGroups } from "./components.js";

/** Options of the index-based SynC clustering, matching the legacy `syncClustering`. @public */
export interface SyncClusteringOptions {
    /** Number of cluster centres: an integer in `[1, nodeCount]` (legacy rounds a fraction up; the port throws). */
    readonly numClusters: number;
    /** Iteration cap; default 1000. */
    readonly maxIterations?: number | undefined;
    /**
     * Stop when the loss changes by less than this between iterations; default 1e-6. A run also stops once the
     * cluster assignment has stayed the same for 10 iterations in a row.
     */
    readonly tolerance?: number | undefined;
    /** Seed of the embedding initialisation and the centre draws; default 42. */
    readonly seed?: number | undefined;
    /**
     * Fraction of the full step each node takes; default 0.5. The full step (1) moves a node to the mean of its
     * out-neighbors' embeddings. Below 1 every part settles; at 1 a bipartite part swaps sides at every step.
     */
    readonly learningRate?: number | undefined;
    /**
     * Weight of the neighbor and regularization terms in the reported loss (and its convergence test); default 0.1.
     * The step divides it out, so it does not change the embeddings, except that 0 stops every node where it starts.
     */
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
    /**
     * Whether the run stopped before the cap: the cluster assignment stayed the same for 10 iterations in a row, or
     * the loss settled within the tolerance.
     */
    readonly converged: boolean;
}

/** Iterations the cluster assignment must stay the same for the run to stop. */
const STABLE_ITERATIONS = 10;

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

/** Row-major matrices and sizes every step of a run shares. */
interface SyncState {
    readonly n: number;
    readonly dim: number;
    readonly rowPtr: U32;
    readonly colIdx: U32;
    readonly emb: F64;
    readonly centres: F64;
    centreCount: number;
    readonly labels: U32;
}

/**
 * Seeds the embeddings from degree and the generator: legacy's degree, so an undirected self-loop counts once
 * (its single stored arc), not twice.
 * @param s - The snapshot
 * @param random - The seeded generator
 * @param dim - Embedding length
 * @returns Row-major embeddings
 */
function initialEmbeddings(s: GraphSnapshot, random: () => number, dim: number): F64 {
    const n = s.nodeCount;
    const emb = new Float64Array(n * dim);
    const degree = s.directed ? s.degree() : s.outDegree();
    for (let u = 0; u < n; u++) {
        const normalized = degree[u] / Math.max(1, n - 1);
        for (let k = 0; k < dim; k++) {
            emb[u * dim + k] = (random() - 0.5) * 0.1 + normalized * 0.1;
        }
    }
    return emb;
}

/**
 * Distance from a node to the nearest of the centres chosen so far.
 * @param st - Run state
 * @param u - Node
 * @returns The distance
 */
function nearestCentreDistance(st: SyncState, u: number): number {
    let nearest = Infinity;
    for (let c = 0; c < st.centreCount; c++) {
        nearest = Math.min(nearest, distance(st.emb, u, st.centres, c, st.dim));
    }
    return nearest;
}

/**
 * Adds the node a weighted draw lands on as the next centre; a draw that rounding carries past the last node
 * adds none.
 * @param st - Run state
 * @param weight - Each node's squared distance to its nearest centre
 * @param draw - Draw in `[0, total weight)`
 */
function addDrawnCentre(st: SyncState, weight: F64, draw: number): void {
    const { n, dim, emb, centres } = st;
    for (let u = 0; u < n; u++) {
        draw -= weight[u];
        if (draw <= 0) {
            centres.set(emb.subarray(u * dim, (u + 1) * dim), st.centreCount * dim);
            st.centreCount++;
            return;
        }
    }
}

/**
 * k-means++: the first centre uniformly, each next one with probability proportional to the squared distance
 * to the nearest centre so far. A draw that rounding carries past the last node adds no centre, as in legacy,
 * so there may be fewer than numClusters.
 * @param st - Run state, centreCount 0 on entry
 * @param numClusters - Centres to draw
 * @param random - The seeded generator
 */
function seedCentres(st: SyncState, numClusters: number, random: () => number): void {
    const { n, dim, emb, centres } = st;
    const pick = Math.floor(random() * n);
    centres.set(emb.subarray(pick * dim, (pick + 1) * dim), 0);
    st.centreCount = 1;
    const weight = new Float64Array(n);
    for (let k = 1; k < numClusters; k++) {
        let total = 0;
        for (let u = 0; u < n; u++) {
            const nearest = nearestCentreDistance(st, u);
            weight[u] = nearest * nearest;
            total += nearest * nearest;
        }
        addDrawnCentre(st, weight, random() * total);
    }
}

/**
 * Labels every node with its closest centre (the first on a tie).
 * @param st - Run state
 */
function assignLabels(st: SyncState): void {
    const { n, dim, emb, centres, centreCount, labels } = st;
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
}

/**
 * Every gradient of the neighbor term from the embeddings before this step, then one step for all. Each
 * node's step is its gradient divided by the gradient's own slope, lambda * out-degree (a Jacobi step), so
 * a node moves the same fraction of the way to its neighbors' mean whatever its degree. A fixed step for
 * every node (before issue #1600) barely moved low-degree nodes and overshot high-degree ones. The pull
 * toward the origin is left out of the step (issue #1698): scaled by degree it shrank low-degree nodes
 * faster than high-degree ones, so after a few dozen steps k-means split on degree, not on community.
 * @param st - Run state
 * @param gradient - Scratch, n * dim
 * @param lambda - Neighbor-term weight
 * @param learningRate - Fraction of the full step
 */
function smoothStep(st: SyncState, gradient: F64, lambda: number, learningRate: number): void {
    const { n, dim, rowPtr, colIdx, emb } = st;
    gradient.fill(0);
    for (let u = 0; u < n; u++) {
        const row = u * dim;
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            const other = colIdx[a] * dim;
            for (let k = 0; k < dim; k++) {
                gradient[row + k] += lambda * (emb[row + k] - emb[other + k]);
            }
        }
    }
    for (let u = 0; u < n; u++) {
        // lambda 0 has no gradient to follow and a node with no out-neighbor none to move to: they stay put.
        const outDegree = rowPtr[u + 1] - rowPtr[u];
        const step = lambda === 0 || outDegree === 0 ? 0 : learningRate / (lambda * outDegree);
        for (let k = u * dim; k < (u + 1) * dim; k++) {
            emb[k] -= step * gradient[k];
        }
    }
}

/**
 * Moves each centre that has a node to the mean of its nodes' embeddings; an empty centre stays put.
 * @param st - Run state
 * @param sums - Scratch, numClusters * dim
 * @param sizes - Scratch, numClusters
 */
function updateCentres(st: SyncState, sums: F64, sizes: U32): void {
    const { n, dim, emb, centres, centreCount, labels } = st;
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
}

/**
 * The loss: clustering distance, plus lambda times the neighbor (reconstruction) and regularization terms.
 * @param st - Run state
 * @param lambda - Weight of the neighbor and regularization terms
 * @returns The loss
 */
function computeLoss(st: SyncState, lambda: number): number {
    const { n, dim, rowPtr, colIdx, emb, centres, labels } = st;
    let clustering = 0;
    let reconstruction = 0;
    let regularization = 0;
    for (let u = 0; u < n; u++) {
        const d = distance(emb, u, centres, labels[u], dim);
        clustering += d * d;
    }
    for (let u = 0; u < n; u++) {
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            const d = distance(emb, u, emb, colIdx[a], dim);
            reconstruction += d * d;
        }
    }
    for (const value of emb) {
        regularization += value * value;
    }
    return clustering + lambda * reconstruction + lambda * regularization;
}

/**
 * Whether the labels equal the previous iteration's.
 * @param labels - This iteration's labels
 * @param previousLabels - The previous iteration's labels
 * @returns True when every label is the same
 */
function sameLabels(labels: U32, previousLabels: U32): boolean {
    return labels.every((label, u) => label === previousLabels[u]);
}

/**
 * SynC over a snapshot: node embeddings seeded from degree and a seeded generator, each moved part of
 * the way to the mean of its out-neighbors' embeddings at every step, and clustered by k-means with
 * k-means++ centers. Smoothing gathers a connected community within a few steps, and run long enough it would
 * gather each whole connected part into one point, so the run stops once the cluster assignment has
 * held for 10 iterations (or the loss settles). Unconnected cliques of any size come back as separate
 * clusters, and planted communities as their own clusters. The order of every random draw is the
 * legacy `syncClustering`'s, but legacy took a fixed gradient step that also pulled every node toward
 * the origin, so its results differ (see issues #1600 and #1698). The port draws from its own
 * generator instead of replacing `Math.random` for the duration of the call.
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
        maxIterations = 1000,
        tolerance = 1e-6,
        seed = 42,
        learningRate = 0.5,
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
    const st: SyncState = {
        n,
        dim,
        rowPtr: s.rowPtr,
        colIdx: s.colIdx,
        emb: initialEmbeddings(s, random, dim),
        centres: new Float64Array(numClusters * dim),
        centreCount: 0,
        labels: new Uint32Array(n),
    };
    seedCentres(st, numClusters, random);

    const gradient = new Float64Array(n * dim);
    const sums = new Float64Array(numClusters * dim);
    const sizes = new Uint32Array(numClusters);
    let previousLoss = Infinity;
    let loss = Infinity;
    let iterations = 0;
    let converged = false;
    const previousLabels = new Uint32Array(n);
    let unchanged = 0;
    while (iterations < maxIterations) {
        iterations++;
        assignLabels(st);
        unchanged = iterations > 1 && sameLabels(st.labels, previousLabels) ? unchanged + 1 : 0;
        previousLabels.set(st.labels);
        smoothStep(st, gradient, lambda, learningRate);
        updateCentres(st, sums, sizes);
        if (iterations > 1) {
            previousLoss = loss;
        }
        loss = computeLoss(st, lambda);
        // Smoothing longer only blurs connected communities together, so a settled assignment ends the run.
        if (Math.abs(previousLoss - loss) < tolerance || unchanged >= STABLE_ITERATIONS) {
            converged = true;
            break;
        }
    }
    assignLabels(st);

    return {
        ...withGroups(st.labels, numClusters),
        embeddings: st.emb,
        dimensions: dim,
        loss,
        previousLoss,
        iterations,
        converged,
    };
}
