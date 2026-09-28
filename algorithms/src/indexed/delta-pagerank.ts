import type { F64, GraphSnapshot, NumericVector, U32 } from "@graphty/graph-format";

import type { PageRankResult } from "./pagerank.js";

/**
 * The delta PageRank engines over snapshots: the `useDelta` path of the legacy `pageRank`
 * ({@link deltaPageRank}), and the {@link DeltaPageRank} and {@link PriorityDeltaPageRank} engines.
 * Each reproduces its legacy counterpart's arithmetic, including its quirks, so a facade over it
 * gives the legacy answer: neighbours are visited in logical edge order (the legacy adjacency's
 * insertion order), and every weight comes from the per-arc `weights` override when one is given.
 * @module
 */

/** Options of {@link deltaPageRank}. @internal */
export interface DeltaPageRankOptions {
    /** Probability of following a link; default 0.85. */
    readonly dampingFactor?: number | undefined;
    /** Iteration cap; default 100. */
    readonly maxIterations?: number | undefined;
    /** Stop when no score moved by this much or more in one iteration (L-infinity); default 1e-6. */
    readonly tolerance?: number | undefined;
    /** Use arc weights; default false. */
    readonly weighted?: boolean | undefined;
    /** Per-arc weight override, arcCount long -- a facade passes `expandEdges(s, shadow.data)`. */
    readonly weights?: NumericVector | undefined;
    /** Starting score per node index, nodeCount long; normalised to sum 1. Default 1 / n each. */
    readonly initialRanks?: NumericVector | undefined;
    /** Teleport distribution per node index, nodeCount long; normalised to sum 1. Default uniform. */
    readonly personalization?: NumericVector | undefined;
}

/** Options of {@link DeltaPageRank}'s and {@link PriorityDeltaPageRank}'s constructors. @public */
export interface DeltaPageRankEngineOptions {
    /** Per-arc weight override, arcCount long; default the snapshot's own arc weights. */
    readonly weights?: NumericVector | undefined;
}

/** Options of {@link DeltaPageRank.compute} and {@link PriorityDeltaPageRank.computeWithPriority}. @public */
export interface DeltaPageRankComputeOptions {
    /** Probability of following a link; default 0.85. */
    readonly dampingFactor?: number | undefined;
    /** Stop when every pending delta is below this; default 1e-6. */
    readonly tolerance?: number | undefined;
    /** Rounds (DeltaPageRank) or processed nodes (PriorityDeltaPageRank); default 100. */
    readonly maxIterations?: number | undefined;
    /** A delta below this is dropped rather than propagated; default tolerance / 10. */
    readonly deltaThreshold?: number | undefined;
    /** Split a node's delta by arc weight instead of evenly; default false. */
    readonly weighted?: boolean | undefined;
    /**
     * Teleport distribution per node index, nodeCount long; normalised to sum 1.
     * {@link DeltaPageRank} only: the priority engine ignores it, as its legacy counterpart does.
     */
    readonly personalization?: NumericVector | undefined;
}

/**
 * The arcs of each row reordered into logical edge order: the legacy adjacency's neighbour order.
 * @param s - A directed snapshot
 * @returns Arc indices, grouped by row as `rowPtr` groups them
 */
function arcsInEdgeOrder(s: GraphSnapshot): U32 {
    const order = new Uint32Array(s.arcCount);
    const next = s.rowPtr.slice(0, s.nodeCount);
    const { src } = s.edgeList();
    for (let e = 0; e < s.edgeCount; e++) {
        order[next[src[e]]++] = s.edgeToArc[e];
    }
    return order;
}

/**
 * Sum of the arc weights (1 where there are none) per node, added in `order`.
 * @param s - The snapshot
 * @param order - Its arcs in the order to add them
 * @param weights - Per-arc weights, or null for 1 each
 * @returns The out-weight per node index
 */
function outWeights(s: GraphSnapshot, order: U32, weights: NumericVector | null): F64 {
    const out = new Float64Array(s.nodeCount);
    for (let u = 0; u < s.nodeCount; u++) {
        let total = 0;
        for (let k = s.rowPtr[u]; k < s.rowPtr[u + 1]; k++) {
            total += weights === null ? 1 : weights[order[k]];
        }
        out[u] = total;
    }
    return out;
}

/**
 * Divide by the sum in place, when the sum is positive.
 * @param v - The vector to normalise
 */
function normalize(v: F64): void {
    let sum = 0;
    for (let i = 0; i < v.length; i++) {
        sum += v[i];
    }
    if (sum > 0) {
        for (let i = 0; i < v.length; i++) {
            v[i] /= sum;
        }
    }
}

/**
 * A normalised copy of a per-node vector, or null when absent.
 * @param v - The caller's vector
 * @param n - The node count it must match
 * @param name - The option name, for the error message
 * @returns The normalised copy, or null
 */
function nodeVector(v: NumericVector | undefined, n: number, name: string): F64 | null {
    if (v === undefined) {
        return null;
    }
    if (v.length !== n) {
        throw new RangeError(`${name} has ${String(v.length)} entries; the graph has ${String(n)} nodes`);
    }
    const out = Float64Array.from(v);
    normalize(out);
    return out;
}

/**
 * The per-arc weight override, checked against the arc count, or the snapshot's own weights.
 * @param s - The snapshot
 * @param w - The caller's override
 * @returns The weights to use, or null when the snapshot has none and no override is given
 */
function arcWeights(s: GraphSnapshot, w: NumericVector | undefined): NumericVector | null {
    if (w === undefined) {
        return s.weights;
    }
    if (w.length !== s.arcCount) {
        throw new RangeError(`weights has ${String(w.length)} entries; the graph has ${String(s.arcCount)} arcs`);
    }
    return w;
}

function checkDamping(d: number): void {
    if (d < 0 || d > 1) {
        throw new Error("Damping factor must be between 0 and 1");
    }
}

/**
 * PageRank by power iteration with an L-infinity stopping rule: the `useDelta` path of the legacy
 * `pageRank`, which it takes when `useDelta !== false` and the graph has more than 100 nodes. Its
 * other path runs the same iteration, so this answers both. A node with no out-arcs is dangling
 * and its rank is spread over every node (by the personalization when one is given); a node whose
 * out-weights sum to 0 but has arcs is not dangling and passes nothing on, as in legacy.
 *
 * Not in the `indexed` namespace: it propagates no deltas, and it exists only so the legacy
 * `pageRank` facade can reproduce legacy arithmetic exactly. Snapshot callers use
 * `indexed.pageRank`.
 * @param s - A DIRECTED snapshot
 * @param o - Algorithm options
 * @returns The scores, the iteration count and the convergence flag
 * @internal
 */
export function deltaPageRank(s: GraphSnapshot, o: DeltaPageRankOptions = {}): PageRankResult {
    if (!s.directed) {
        throw new Error("PageRank requires a directed graph");
    }
    const d = o.dampingFactor ?? 0.85;
    checkDamping(d);
    const n = s.nodeCount;
    const maxIter = o.maxIterations ?? 100;
    const tol = o.tolerance ?? 1e-6;
    if (n === 0) {
        return { scores: new Float64Array(0), iterations: 0, converged: true };
    }
    const personal = nodeVector(o.personalization, n, "personalization");
    let rank = nodeVector(o.initialRanks, n, "initialRanks") ?? new Float64Array(n).fill(1 / n);
    const order = arcsInEdgeOrder(s);
    const weights = o.weighted === true ? arcWeights(s, o.weights) : null;
    const outW = outWeights(s, order, weights);
    let next = new Float64Array(n);
    let iterations = 0;
    let converged = false;
    while (iterations < maxIter && !converged) {
        iterations++;
        let dangling = 0;
        for (let u = 0; u < n; u++) {
            if (s.rowPtr[u] === s.rowPtr[u + 1]) {
                dangling += rank[u];
            }
        }
        const spread = dangling > 0 ? (d * dangling) / n : 0;
        for (let v = 0; v < n; v++) {
            next[v] = personal === null ? (1 - d) / n + spread : (1 - d) * personal[v] + spread * personal[v];
        }
        for (let u = 0; u < n; u++) {
            const ow = outW[u];
            if (ow > 0) {
                for (let k = s.rowPtr[u]; k < s.rowPtr[u + 1]; k++) {
                    const a = order[k];
                    next[s.colIdx[a]] += d * rank[u] * ((weights === null ? 1 : weights[a]) / ow);
                }
            }
        }
        let maxDiff = 0;
        for (let v = 0; v < n; v++) {
            maxDiff = Math.max(maxDiff, Math.abs(next[v] - rank[v]));
        }
        [rank, next] = [next, rank];
        converged = maxDiff < tol;
    }
    return { scores: rank, iterations, converged };
}

/**
 * Delta-propagating PageRank that keeps its state between calls, as the legacy `DeltaPageRank`
 * does: each round, every active node with a delta of at least `deltaThreshold` adds it to its
 * score and pushes `dampingFactor * delta` along its out-arcs; the teleport share is added to
 * every node's next delta each round, and the scores are normalised at the end. The out-weights
 * that split a delta are the WEIGHTED out-degrees even when `weighted` is false -- legacy's
 * arithmetic, kept so the two agree.
 * @public
 */
export class DeltaPageRank {
    private readonly s: GraphSnapshot;
    private readonly order: U32;
    private readonly weights: NumericVector | null;
    private readonly outW: F64;
    private readonly scores: F64;
    private deltas: F64;
    private active: Uint8Array;

    /**
     * Start every node at score 0 with a pending delta of 1 / n, all active.
     * @param s - A DIRECTED snapshot
     * @param o - The per-arc weight override
     */
    constructor(s: GraphSnapshot, o: DeltaPageRankEngineOptions = {}) {
        if (!s.directed) {
            throw new Error("DeltaPageRank requires a directed graph");
        }
        this.s = s;
        this.order = arcsInEdgeOrder(s);
        this.weights = arcWeights(s, o.weights);
        this.outW = outWeights(s, this.order, this.weights);
        this.scores = new Float64Array(s.nodeCount);
        this.deltas = new Float64Array(s.nodeCount).fill(1 / s.nodeCount);
        this.active = new Uint8Array(s.nodeCount).fill(1);
    }

    /**
     * Propagate deltas until none is active, every pending delta is below `tolerance`, or
     * `maxIterations` rounds have run; then normalise the scores.
     * @param o - Algorithm options
     * @returns A copy of the scores per node index
     */
    compute(o: DeltaPageRankComputeOptions = {}): F64 {
        return this.run(o, false);
    }

    /**
     * Make only the given nodes and their in- and out-neighbours active, then {@link compute}.
     * An index outside the graph names nothing and is skipped, but a non-empty `modified` still
     * starts a round, as legacy does for an id the graph lacks. The snapshot is frozen, so this
     * re-runs over the same graph; a changed graph is a new snapshot and a new engine.
     * @param modified - Node indices to reactivate
     * @param o - Algorithm options
     * @returns A copy of the scores per node index
     */
    update(modified: ArrayLike<number>, o: DeltaPageRankComputeOptions = {}): F64 {
        const { s } = this;
        const rev = s.reverse();
        const active = new Uint8Array(s.nodeCount);
        for (let i = 0; i < modified.length; i++) {
            const u = modified[i];
            if (!Number.isInteger(u) || u < 0 || u >= s.nodeCount) {
                continue;
            }
            active[u] = 1;
            for (let a = rev.rowPtr[u]; a < rev.rowPtr[u + 1]; a++) {
                active[rev.colIdx[a]] = 1;
            }
            for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
                active[s.colIdx[a]] = 1;
            }
        }
        this.active = active;
        return this.run(o, modified.length > 0);
    }

    /**
     * The propagation rounds behind {@link compute} and {@link update}.
     * @param o - Algorithm options
     * @param startRound - Run the first round even when no node is active
     * @returns A copy of the scores per node index
     */
    private run(o: DeltaPageRankComputeOptions, startRound: boolean): F64 {
        const d = o.dampingFactor ?? 0.85;
        const tol = o.tolerance ?? 1e-6;
        const maxIter = o.maxIterations ?? 100;
        const threshold = o.deltaThreshold ?? tol / 10;
        checkDamping(d);
        const { s, order, scores } = this;
        const n = s.nodeCount;
        if (n === 0) {
            return new Float64Array(0);
        }
        const personal = nodeVector(o.personalization, n, "personalization");
        const weights = o.weighted === true ? this.weights : null;
        const randomJump = (1 - d) / n;
        let activeCount = this.active.reduce((sum, x) => sum + x, 0);
        for (let it = 0; (activeCount > 0 || (it === 0 && startRound)) && it < maxIter; it++) {
            const next = new Float64Array(n);
            let dangling = 0;
            for (let u = 0; u < n; u++) {
                if (s.rowPtr[u] === s.rowPtr[u + 1]) {
                    dangling += scores[u] + this.deltas[u];
                }
            }
            if (dangling > 0) {
                const spread = (d * dangling) / n;
                for (let v = 0; v < n; v++) {
                    next[v] += personal === null ? spread : spread * personal[v];
                }
            }
            for (let u = 0; u < n; u++) {
                const delta = this.deltas[u];
                if (this.active[u] === 0 || Math.abs(delta) < threshold) {
                    continue;
                }
                scores[u] += delta;
                const ow = this.outW[u];
                if (ow > 0) {
                    for (let k = s.rowPtr[u]; k < s.rowPtr[u + 1]; k++) {
                        const a = order[k];
                        next[s.colIdx[a]] += d * delta * ((weights === null ? 1 : weights[a]) / ow);
                    }
                }
            }
            let maxDelta = 0;
            activeCount = 0;
            for (let v = 0; v < n; v++) {
                next[v] += personal === null ? randomJump : (1 - d) * personal[v];
                const size = Math.abs(next[v]);
                maxDelta = Math.max(maxDelta, size);
                this.active[v] = size >= threshold ? 1 : 0;
                activeCount += this.active[v];
            }
            this.deltas = next;
            if (maxDelta < tol) {
                break;
            }
        }
        normalize(scores);
        return scores.slice();
    }
}

/**
 * A binary max-heap of node indices that allows duplicates and breaks ties exactly as the legacy
 * `PriorityQueue` with comparator `(a, b) => b - a` does, so both dequeue in the same order.
 */
class DuplicateMaxHeap {
    private readonly node: number[] = [];
    private readonly key: number[] = [];

    isEmpty(): boolean {
        return this.node.length === 0;
    }

    push(node: number, key: number): void {
        this.node.push(node);
        this.key.push(key);
        let i = this.node.length - 1;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (!(this.key[p] - this.key[i] < 0)) {
                break;
            }
            this.swap(i, p);
            i = p;
        }
    }

    pop(): number {
        const top = this.node[0];
        const lastNode = this.node.pop() as number;
        const lastKey = this.key.pop() as number;
        if (this.node.length === 0) {
            return top;
        }
        this.node[0] = lastNode;
        this.key[0] = lastKey;
        let i = 0;
        for (;;) {
            const l = 2 * i + 1;
            const r = l + 1;
            let t = i;
            if (l < this.node.length && this.key[t] - this.key[l] < 0) {
                t = l;
            }
            if (r < this.node.length && this.key[t] - this.key[r] < 0) {
                t = r;
            }
            if (t === i) {
                return top;
            }
            this.swap(i, t);
            i = t;
        }
    }

    private swap(i: number, j: number): void {
        [this.node[i], this.node[j]] = [this.node[j], this.node[i]];
        [this.key[i], this.key[j]] = [this.key[j], this.key[i]];
    }
}

/**
 * Delta PageRank processed one node at a time, largest pending delta first, keeping its state
 * between calls as the legacy `PriorityDeltaPageRank` does. `maxIterations` counts processed
 * nodes; every 1000 of them the run stops if no pending delta reaches `tolerance`. At the end
 * each pending delta of at least `deltaThreshold` is added to its score (and stays pending), the
 * teleport share is added, and the scores are normalised. The out-weights are the WEIGHTED
 * out-degrees even when `weighted` is false, as in legacy.
 * @public
 */
export class PriorityDeltaPageRank {
    private readonly s: GraphSnapshot;
    private readonly order: U32;
    private readonly weights: NumericVector | null;
    private readonly outW: F64;
    private readonly scores: F64;
    private readonly deltas: F64;
    private readonly heap = new DuplicateMaxHeap();

    /**
     * Start every node at score 0 with a pending delta of 1 / n, queued in index order.
     * @param s - A DIRECTED snapshot
     * @param o - The per-arc weight override
     */
    constructor(s: GraphSnapshot, o: DeltaPageRankEngineOptions = {}) {
        if (!s.directed) {
            throw new Error("PriorityDeltaPageRank requires a directed graph");
        }
        this.s = s;
        this.order = arcsInEdgeOrder(s);
        this.weights = arcWeights(s, o.weights);
        this.outW = outWeights(s, this.order, this.weights);
        this.scores = new Float64Array(s.nodeCount);
        this.deltas = new Float64Array(s.nodeCount).fill(1 / s.nodeCount);
        for (let u = 0; u < s.nodeCount; u++) {
            this.heap.push(u, 1 / s.nodeCount);
        }
    }

    /**
     * Process queued nodes, largest pending delta first.
     * @param o - Algorithm options; `personalization` is ignored
     * @returns A copy of the scores per node index
     */
    computeWithPriority(o: DeltaPageRankComputeOptions = {}): F64 {
        const d = o.dampingFactor ?? 0.85;
        const tol = o.tolerance ?? 1e-6;
        const maxIter = o.maxIterations ?? 100;
        const threshold = o.deltaThreshold ?? tol / 10;
        const { s, order, scores, deltas, heap } = this;
        const n = s.nodeCount;
        const weights = o.weighted === true ? this.weights : null;
        let iteration = 0;
        let processed = 0;
        while (!heap.isEmpty() && iteration < maxIter) {
            const u = heap.pop();
            const delta = deltas[u];
            if (Math.abs(delta) < threshold) {
                continue;
            }
            scores[u] += delta;
            deltas[u] = 0;
            const ow = this.outW[u];
            if (ow > 0) {
                for (let k = s.rowPtr[u]; k < s.rowPtr[u + 1]; k++) {
                    const a = order[k];
                    const v = s.colIdx[a];
                    const pending = deltas[v] + d * delta * ((weights === null ? 1 : weights[a]) / ow);
                    deltas[v] = pending;
                    if (Math.abs(pending) >= threshold) {
                        heap.push(v, Math.abs(pending));
                    }
                }
            }
            processed++;
            if (processed % 1000 === 0) {
                let maxDelta = 0;
                for (let v = 0; v < n; v++) {
                    maxDelta = Math.max(maxDelta, Math.abs(deltas[v]));
                }
                if (maxDelta < tol) {
                    break;
                }
            }
            iteration++;
        }
        const teleport = (1 - d) / n;
        for (let v = 0; v < n; v++) {
            if (Math.abs(deltas[v]) >= threshold) {
                scores[v] += deltas[v];
            }
            scores[v] += teleport;
        }
        normalize(scores);
        return scores.slice();
    }
}
