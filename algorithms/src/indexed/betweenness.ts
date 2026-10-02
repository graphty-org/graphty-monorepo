import {
    type EdgeMask,
    type F64,
    type GraphSnapshot,
    maskTest,
    type NodeResolvable,
    type NodeSet,
    resolveNodeSet,
} from "@graphty/graph-format";

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
    /** Sampled betweenness: the source nodes to run from (indices, `{ mask }` or `{ ids }`). Duplicates run twice. */
    readonly sources?: NodeSet | undefined;
    /**
     * Sampled betweenness: how many distinct sources to draw when `sources` is not given. The draw is
     * deterministic -- the same `(n, k)` draws the same sources every time, and the dispatcher hands an
     * accelerator the drawn sources, so both paths run the same ones. With `sources` it must equal `sources.length`.
     */
    readonly k?: number | undefined;
}

/** Options of the index-based edge betweenness. @public */
export interface EdgeBetweennessOptions {
    /** Divide by `(n - 1)(n - 2)` directed, half that undirected, as the node scores are. Default false. */
    readonly normalized?: boolean | undefined;
    /** Sampled edge betweenness: the source nodes to run from (indices, `{ mask }` or `{ ids }`). */
    readonly sources?: NodeSet | undefined;
    /** Sampled edge betweenness: how many sources to draw; see {@link BetweennessOptions.k}. */
    readonly k?: number | undefined;
    /**
     * Logical edges to keep, as a packed mask over `edgeCount`; a cleared edge is treated as deleted and scores
     * 0. Girvan-Newman removes edges this way without building a new snapshot.
     */
    readonly alive?: EdgeMask | undefined;
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

/** Scores per logical edge index. @public */
export interface EdgeScoresResult {
    /** One score per logical edge. */
    readonly scores: F64;
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
 * @param s - The graph (its node count, and its id map for `{ ids }`)
 * @param sourceSet - The caller's sources
 * @param k - The caller's count
 * @param label - The algorithm named in an error
 * @returns The sources
 * @throws RangeError for a source outside `[0, n)`, a `k` outside `[0, n]`, or a `k` that disagrees with the list
 */
export function resolveSources(
    s: NodeResolvable,
    sourceSet: NodeSet | undefined,
    k: number | undefined,
    label = "betweenness",
): readonly number[] {
    const n = s.nodeCount;
    const sources = sourceSet === undefined ? undefined : Array.from(resolveNodeSet(s, sourceSet));
    if (k !== undefined && (!Number.isInteger(k) || k < 0 || k > n)) {
        throw new RangeError(`${label}: k must be an integer in [0, ${n}], got ${k}`);
    }
    if (sources !== undefined) {
        for (const v of sources) {
            if (!Number.isInteger(v) || v < 0 || v >= n) {
                throw new RangeError(`${label}: sources must be node indices in [0, ${n}), got ${v}`);
            }
        }
        if (k !== undefined && k !== sources.length) {
            throw new RangeError(`${label}: k (${k}) must be absent or equal sources.length (${sources.length})`);
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
 * Halve on an undirected snapshot (each unordered pair was counted from both ends) and divide by `factor` when
 * normalising and it is positive.
 * @param s - The snapshot
 * @param scores - The raw sums, scaled in place
 * @param normalized - Whether to normalise
 * @param factor - The directed pair count to normalise by
 */
function scale(s: GraphSnapshot, scores: F64, normalized: boolean | undefined, factor: number): void {
    // Undirected: halving and then dividing by half the directed pair count is dividing by the whole count.
    const halve = s.directed ? 1 : 2;
    const divisor = normalized === true && factor > 0 ? factor : halve;
    for (let i = 0; i < scores.length; i++) {
        scores[i] /= divisor;
    }
}

/**
 * Node betweenness centrality by Brandes' algorithm: breadth-first, so weights are ignored, as in the legacy
 * `betweennessCentrality`, whose scores this equals on every graph it can hold. A sampled run (`sources` or `k`)
 * is the UNSCALED sum over the sources run, as the WebGPU accelerator reports it.
 * @param s - The snapshot
 * @param options - Normalisation, endpoints and sampling
 * @returns One score per node index; `iterations` is the number of sources run
 * @throws RangeError for a bad `sources` or `k`
 * @public
 */
export function betweennessCentrality(s: GraphSnapshot, options: BetweennessOptions = {}): ScoresResult {
    const n = s.nodeCount;
    const sources = resolveSources(s, options.sources, options.k);
    const scores = new Float64Array(n);
    const endpoints = options.endpoints === true;
    accumulate(s, sources, scores, null, null, endpoints);
    scale(s, scores, options.normalized, endpoints ? n * (n - 1) : (n - 1) * (n - 2));
    return { scores, iterations: sources.length, converged: true };
}

/**
 * Edge betweenness centrality by Brandes' algorithm, one score per logical edge.
 *
 * On a directed snapshot an edge's score equals the legacy `edgeBetweennessCentrality` value keyed
 * `"source-target"`. On an undirected one it is the number of pairs whose shortest paths cross the edge in
 * either direction, which is the SUM of the two values the legacy function reports under `"u-v"` and `"v-u"`
 * (each of those holds half), and is the score the WebGPU accelerator returns.
 * @param s - The snapshot
 * @param options - Normalisation, sampling and the alive-edge mask
 * @returns One score per logical edge
 * @throws RangeError for a bad `sources` or `k`, or an `alive` mask shorter than the edge count
 * @public
 */
export function edgeBetweennessCentrality(s: GraphSnapshot, options: EdgeBetweennessOptions = {}): EdgeScoresResult {
    const n = s.nodeCount;
    const alive = options.alive ?? null;
    if (alive !== null && alive.length < Math.ceil(s.edgeCount / 32)) {
        throw new RangeError(`edgeBetweennessCentrality: alive covers fewer than ${s.edgeCount} edges`);
    }
    const scores = new Float64Array(s.edgeCount);
    accumulate(s, resolveSources(s, options.sources, options.k), null, scores, alive, false);
    scale(s, scores, options.normalized, (n - 1) * (n - 2));
    return { scores };
}
