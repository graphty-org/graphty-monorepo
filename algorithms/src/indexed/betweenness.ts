import {
    type EdgeMask,
    type F64,
    type GraphSnapshot,
    maskTest,
    type NumericVector,
    type U32,
} from "@graphty/graph-format";

import { withCode } from "../errors.js";
import { IndexedMinHeap } from "./structures/min-heap.js";
import { readsWeights } from "./weights.js";

/** Options of the index-based node betweenness. @public */
export interface BetweennessOptions {
    /**
     * Divide by the number of ordered pairs a node can sit between: `(n - 1)(n - 2)` directed, half that
     * undirected; with `endpoints`, `n (n - 1)` and half that. Default false.
     */
    readonly normalized?: boolean | undefined;
    /**
     * Count a path's two ends as lying on it, as NetworkX's `endpoints=True` does. Default false. The legacy
     * `betweennessCentrality` accepts this option and ignores it.
     */
    readonly endpoints?: boolean | undefined;
    /** Sampled betweenness: the source node indices to run from. Duplicates run twice. */
    readonly sources?: readonly number[] | undefined;
    /**
     * Sampled betweenness: how many distinct sources to draw when `sources` is not given. The draw is
     * deterministic -- the same `(n, k)` draws the same sources every time, and the dispatcher hands an
     * accelerator the drawn sources, so both paths run the same ones. With `sources` it must equal `sources.length`.
     */
    readonly k?: number | undefined;
    /**
     * Measure path length by edge weight when the snapshot has weights; default true. `false` counts hops. A weight
     * must be finite and not negative.
     */
    readonly weighted?: boolean | undefined;
}

/** Options of the index-based edge betweenness. @public */
export interface EdgeBetweennessOptions {
    /** Divide by `(n - 1)(n - 2)` directed, half that undirected, as the node scores are. Default false. */
    readonly normalized?: boolean | undefined;
    /** Sampled edge betweenness: the source node indices to run from. */
    readonly sources?: readonly number[] | undefined;
    /** Sampled edge betweenness: how many sources to draw; see {@link BetweennessOptions.k}. */
    readonly k?: number | undefined;
    /**
     * Logical edges to keep, as a packed mask over `edgeCount`; a cleared edge is treated as deleted and scores
     * 0. Girvan-Newman removes edges this way without building a new snapshot.
     */
    readonly alive?: EdgeMask | undefined;
    /** Measure path length by edge weight when the snapshot has weights; default true. See {@link BetweennessOptions.weighted}. */
    readonly weighted?: boolean | undefined;
}

/** Scores per node index from an exact, non-iterative computation. @public */
export interface ScoresResult {
    /** One score per node index. */
    readonly scores: F64;
    /** The number of breadth-first searches or shortest-path searches run: one per source. */
    readonly iterations: number;
    /** Always true: nothing here iterates to a tolerance. */
    readonly converged: true;
}

/**
 * Node betweenness scores and the scale they are in. @public
 */
export interface BetweennessResult extends ScoresResult {
    /**
     * What the summed ordered-pair counts were divided by: 2 on an undirected snapshot and 1 on a directed one
     * (NetworkX's convention), or the `normalized` pair count. `scores[v] * divisor` is the number of ordered
     * (source, target) pairs whose shortest paths pass through `v`, each split by its share of those paths -- the
     * scale Cytoscape.js's `betweennessCentrality` reports.
     */
    readonly divisor: number;
}

/** Scores per logical edge index. @public */
export interface EdgeScoresResult {
    /** One score per logical edge. */
    readonly scores: F64;
    /** What the summed ordered-pair counts were divided by, as {@link BetweennessResult.divisor}. */
    readonly divisor: number;
}

/** The seed of the `k` draw. Any fixed value works: the draw only has to repeat. */
const SAMPLE_SEED = 0x9e3779b9;

/**
 * `k` distinct node indices by a partial Fisher-Yates shuffle over a fixed-seed mulberry32 stream, so the same
 * `(n, k)` draws the same sources every time.
 * @param n - The node count
 * @param k - How many to draw, at most n
 * @returns The sources
 */
function drawSources(n: number, k: number): number[] {
    const pool = Array.from({ length: n }, (_, i) => i);
    let state = SAMPLE_SEED;
    for (let i = 0; i < k; i++) {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = Math.imul(state ^ (state >>> 15), state | 1);
        t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
        const unit = ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
        const j = i + Math.floor(unit * (n - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, k);
}

/**
 * The sources a call runs: `sources` as given, else `k` drawn, else every node.
 * @param n - The node count
 * @param sources - The caller's list
 * @param k - The caller's count
 * @param label - The algorithm named in an error
 * @returns The sources
 * @throws RangeError for a source outside `[0, n)`, a `k` outside `[0, n]`, or a `k` that disagrees with the list
 */
export function resolveSources(
    n: number,
    sources: readonly number[] | undefined,
    k: number | undefined,
    label = "betweenness",
): readonly number[] {
    if (k !== undefined && (!Number.isInteger(k) || k < 0 || k > n)) {
        throw withCode(new RangeError(`${label}: k must be an integer in [0, ${n}], got ${k}`), "E_BAD_OPTION");
    }
    if (sources !== undefined) {
        for (const v of sources) {
            if (!Number.isInteger(v) || v < 0 || v >= n) {
                throw withCode(
                    new RangeError(`${label}: sources must be node indices in [0, ${n}), got ${v}`),
                    "E_BAD_NODE",
                );
            }
        }
        if (k !== undefined && k !== sources.length) {
            throw withCode(
                new RangeError(`${label}: k (${k}) must be absent or equal sources.length (${sources.length})`),
                "E_BAD_OPTION",
            );
        }
        return sources;
    }
    return k === undefined ? Array.from({ length: n }, (_, i) => i) : drawSources(n, k);
}

/**
 * Brandes' accumulation from every source, into `node` and/or `edge` (raw sums, before halving or
 * normalising).
 *
 * A pair joined by parallel edges is ONE neighbour relation (graph-format design 3.5, the adjacent-skip idiom),
 * so path counts are the simple graph's and equal the legacy function's. The pair's share of an edge score goes
 * to the first alive parallel edge in row order; the others score 0. Removing that edge hands the whole share to
 * the next parallel, so the scores of a pair's parallels always sum to the simple graph's edge score.
 * Dependencies are pulled over OUT-arcs from the deepest level up, so no reverse adjacency is built.
 * @param s - The snapshot
 * @param sources - Source node indices
 * @param node - Node sums, or null
 * @param edge - Edge sums, or null
 * @param alive - Kept edges, or null for all
 * @param endpoints - Count path ends on the path (node sums only)
 */
function accumulate(
    s: GraphSnapshot,
    sources: readonly number[],
    node: F64 | null,
    edge: F64 | null,
    alive: EdgeMask | null,
    endpoints: boolean,
): void {
    const { nodeCount: n, rowPtr, colIdx, arcToEdge } = s;
    const depth = new Int32Array(n).fill(-1);
    const sigma = new Float64Array(n);
    const delta = new Float64Array(n);
    const order = new Uint32Array(n);
    for (const source of sources) {
        let head = 0;
        let tail = 0;
        depth[source] = 0;
        sigma[source] = 1;
        order[tail++] = source;
        while (head < tail) {
            const v = order[head++];
            const next = depth[v] + 1;
            let prev = -1;
            for (let a = rowPtr[v], end = rowPtr[v + 1]; a < end; a++) {
                const w = colIdx[a];
                if (w === prev || (alive !== null && !maskTest(alive, arcToEdge[a]))) {
                    continue;
                }
                prev = w;
                if (depth[w] < 0) {
                    depth[w] = next;
                    order[tail++] = w;
                }
                if (depth[w] === next) {
                    sigma[w] += sigma[v];
                }
            }
        }
        for (let i = tail - 1; i >= 0; i--) {
            const v = order[i];
            const next = depth[v] + 1;
            let prev = -1;
            for (let a = rowPtr[v], end = rowPtr[v + 1]; a < end; a++) {
                const w = colIdx[a];
                if (w === prev || (alive !== null && !maskTest(alive, arcToEdge[a]))) {
                    continue;
                }
                prev = w;
                if (depth[w] === next) {
                    const c = (sigma[v] / sigma[w]) * (1 + delta[w]);
                    delta[v] += c;
                    if (edge !== null) {
                        edge[arcToEdge[a]] += c;
                    }
                }
            }
            if (node !== null && v !== source) {
                node[v] += endpoints ? delta[v] + 1 : delta[v];
            }
        }
        if (node !== null && endpoints) {
            node[source] += tail - 1;
        }
        for (let i = 0; i < tail; i++) {
            const v = order[i];
            depth[v] = -1;
            sigma[v] = 0;
            delta[v] = 0;
        }
    }
}

/**
 * The arcs a weighted search follows: for each neighbour of a row, the lightest alive arc to it, the first in row
 * order on a tie. Parallel edges are one neighbour relation at the weight of the lightest, as they are one relation
 * in the breadth-first search.
 * @param s - The snapshot
 * @param weights - Its per-arc weights
 * @param alive - Kept edges, or null for all
 * @returns Row pointers into `arcs`, and the arc indices
 */
function lightestArcs(
    s: GraphSnapshot,
    weights: NumericVector,
    alive: EdgeMask | null,
): { readonly rowPtr: U32; readonly arcs: U32 } {
    const { nodeCount: n, colIdx, arcToEdge } = s;
    const rowPtr = new Uint32Array(n + 1);
    const arcs = new Uint32Array(s.arcCount);
    let k = 0;
    for (let u = 0; u < n; u++) {
        const rowStart = k;
        for (let a = s.rowPtr[u], end = s.rowPtr[u + 1]; a < end; a++) {
            if (colIdx[a] === u || (alive !== null && !maskTest(alive, arcToEdge[a]))) {
                continue;
            }
            if (k > rowStart && colIdx[arcs[k - 1]] === colIdx[a]) {
                if (weights[a] < weights[arcs[k - 1]]) {
                    arcs[k - 1] = a;
                }
            } else {
                arcs[k++] = a;
            }
        }
        rowPtr[u + 1] = k;
    }
    return { rowPtr, arcs: arcs.subarray(0, k) };
}

/**
 * Brandes' accumulation with Dijkstra in place of the breadth-first search: the same sums as {@link accumulate},
 * with path length measured by weight. A node lies on a path when the path's weights add up exactly, as NetworkX
 * tests it.
 * @param s - The snapshot
 * @param weights - Its per-arc weights, finite and not negative
 * @param sources - Source node indices
 * @param node - Node sums, or null
 * @param edge - Edge sums, or null
 * @param alive - Kept edges, or null for all
 * @param endpoints - Count path ends on the path (node sums only)
 */
function accumulateWeighted(
    s: GraphSnapshot,
    weights: NumericVector,
    sources: readonly number[],
    node: F64 | null,
    edge: F64 | null,
    alive: EdgeMask | null,
    endpoints: boolean,
): void {
    const { nodeCount: n, colIdx, arcToEdge } = s;
    const { rowPtr, arcs } = lightestArcs(s, weights, alive);
    const dist = new Float64Array(n).fill(Infinity);
    const sigma = new Float64Array(n);
    const delta = new Float64Array(n);
    const order = new Uint32Array(n);
    const heap = new IndexedMinHeap(n, true);
    for (const source of sources) {
        let tail = 0;
        dist[source] = 0;
        sigma[source] = 1;
        heap.push(source, 0);
        while (!heap.isEmpty()) {
            const v = heap.pop();
            order[tail++] = v;
            for (let k = rowPtr[v], end = rowPtr[v + 1]; k < end; k++) {
                const a = arcs[k];
                const w = colIdx[a];
                const d = dist[v] + weights[a];
                if (d < dist[w]) {
                    dist[w] = d;
                    sigma[w] = sigma[v];
                    heap.pushOrDecrease(w, d);
                } else if (d === dist[w]) {
                    sigma[w] += sigma[v];
                }
            }
        }
        for (let i = tail - 1; i >= 0; i--) {
            const v = order[i];
            for (let k = rowPtr[v], end = rowPtr[v + 1]; k < end; k++) {
                const a = arcs[k];
                const w = colIdx[a];
                if (dist[v] + weights[a] === dist[w]) {
                    const c = (sigma[v] / sigma[w]) * (1 + delta[w]);
                    delta[v] += c;
                    if (edge !== null) {
                        edge[arcToEdge[a]] += c;
                    }
                }
            }
            if (node !== null && v !== source) {
                node[v] += endpoints ? delta[v] + 1 : delta[v];
            }
        }
        if (node !== null && endpoints) {
            node[source] += tail - 1;
        }
        for (let i = 0; i < tail; i++) {
            const v = order[i];
            dist[v] = Infinity;
            sigma[v] = 0;
            delta[v] = 0;
        }
    }
}

/**
 * The weights a betweenness call measures paths by, or null to count hops: none when the snapshot has no weights,
 * under `weighted: false`, or when every weight is 1 (hops give the same paths).
 * @param s - The snapshot
 * @param weighted - The caller's `weighted` option
 * @param label - The function name, for the message
 * @returns The per-arc weights, or null
 * @throws RangeError with code `E_BAD_WEIGHT` for a negative, infinite or NaN weight
 */
function pathWeights(s: GraphSnapshot, weighted: boolean | undefined, label: string): NumericVector | null {
    if (!readsWeights(s, weighted) || s.flags.allWeightsOne || s.weights === null) {
        return null;
    }
    if (!s.flags.nonNegativeWeights || !s.flags.finiteWeights) {
        throw withCode(
            new RangeError(`${label}: weights must be finite and not negative; pass weighted: false to count hops`),
            "E_BAD_WEIGHT",
        );
    }
    return s.weights;
}

/**
 * Halve on an undirected snapshot (each unordered pair was counted from both ends) and divide by `factor` when
 * normalising and it is positive.
 * @param s - The snapshot
 * @param scores - The raw sums, scaled in place
 * @param normalized - Whether to normalise
 * @param factor - The directed pair count to normalise by
 * @returns The divisor applied
 */
function scale(s: GraphSnapshot, scores: F64, normalized: boolean | undefined, factor: number): number {
    // Undirected: halving and then dividing by half the directed pair count is dividing by the whole count.
    const halve = s.directed ? 1 : 2;
    const divisor = normalized === true && factor > 0 ? factor : halve;
    for (let i = 0; i < scores.length; i++) {
        scores[i] /= divisor;
    }
    return divisor;
}

/**
 * Node betweenness centrality by Brandes' algorithm: shortest paths by edge weight (Dijkstra) when the snapshot has
 * weights, by hops (breadth-first) otherwise or under `weighted: false`. A sampled run (`sources` or `k`) is the
 * UNSCALED sum over the sources run, as the WebGPU accelerator reports it.
 * @param s - The snapshot
 * @param options - Normalisation, endpoints, sampling and weights
 * @returns One score per node index; `iterations` is the number of sources run
 * @throws RangeError for a bad `sources` or `k`, or a negative or non-finite weight
 * @public
 */
export function betweennessCentrality(s: GraphSnapshot, options: BetweennessOptions = {}): BetweennessResult {
    const n = s.nodeCount;
    const sources = resolveSources(n, options.sources, options.k);
    const scores = new Float64Array(n);
    const endpoints = options.endpoints === true;
    const weights = pathWeights(s, options.weighted, "betweennessCentrality");
    if (weights === null) {
        accumulate(s, sources, scores, null, null, endpoints);
    } else {
        accumulateWeighted(s, weights, sources, scores, null, null, endpoints);
    }
    const divisor = scale(s, scores, options.normalized, endpoints ? n * (n - 1) : (n - 1) * (n - 2));
    return { scores, iterations: sources.length, converged: true, divisor };
}

/**
 * Edge betweenness centrality by Brandes' algorithm, one score per logical edge, with paths measured as
 * {@link betweennessCentrality} measures them. Weighted, a pair joined by parallel edges is credited through its
 * lightest alive edge.
 *
 * On a directed snapshot an edge's score equals the legacy `edgeBetweennessCentrality` value keyed
 * `"source-target"`. On an undirected one it is the number of pairs whose shortest paths cross the edge in
 * either direction, which is the SUM of the two values the legacy function reports under `"u-v"` and `"v-u"`
 * (each of those holds half), and is the score the WebGPU accelerator returns.
 * @param s - The snapshot
 * @param options - Normalisation, sampling and the alive-edge mask
 * @returns One score per logical edge
 * @throws RangeError for a bad `sources` or `k`, an `alive` mask shorter than the edge count, or a negative or
 * non-finite weight
 * @public
 */
export function edgeBetweennessCentrality(s: GraphSnapshot, options: EdgeBetweennessOptions = {}): EdgeScoresResult {
    const n = s.nodeCount;
    const alive = options.alive ?? null;
    if (alive !== null && alive.length < Math.ceil(s.edgeCount / 32)) {
        throw withCode(
            new RangeError(`edgeBetweennessCentrality: alive covers fewer than ${s.edgeCount} edges`),
            "E_BAD_OPTION",
        );
    }
    const scores = new Float64Array(s.edgeCount);
    const sources = resolveSources(n, options.sources, options.k);
    const weights = pathWeights(s, options.weighted, "edgeBetweennessCentrality");
    if (weights === null) {
        accumulate(s, sources, null, scores, alive, false);
    } else {
        accumulateWeighted(s, weights, sources, null, scores, alive, false);
    }
    const divisor = scale(s, scores, options.normalized, (n - 1) * (n - 2));
    return { scores, divisor };
}
