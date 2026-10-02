import {
    type GraphSnapshot,
    type NodeRef,
    type NodeSet,
    type NumericVector,
    resolveNode,
    type U32,
} from "@graphty/graph-format";

import { resolveSources, type ScoresResult } from "./betweenness.js";
import { IndexedMinHeap } from "./structures/min-heap.js";

/** Options of the index-based closeness centrality, matching the legacy `closenessCentrality`. @public */
export interface ClosenessOptions {
    /**
     * Scale by the fraction of other nodes reached (Wasserman and Faust), or with `harmonic` divide by
     * `n - 1`. Default false.
     */
    readonly normalized?: boolean | undefined;
    /** Sum `1 / distance` instead of taking `1 / sum(distance)`; better on disconnected graphs. Default false. */
    readonly harmonic?: boolean | undefined;
    /**
     * Stop searching from nodes this far away or farther. A node past the cutoff is still counted when an edge
     * reaches it from a node closer than the cutoff, as in the legacy functions. Default: every reachable node.
     */
    readonly cutoff?: number | undefined;
    /**
     * Measure distance by edge weight (Dijkstra) rather than by hops, as the legacy
     * `weightedClosenessCentrality` does. Default false: weights are ignored, as the legacy
     * `closenessCentrality` ignores them.
     */
    readonly weighted?: boolean | undefined;
    /** Per-arc weight override, arcCount long, read when `weighted`; a facade passes the exact f64 weights. */
    readonly weights?: NumericVector | undefined;
    /**
     * Sampled closeness: the source nodes to run from (indices, `{ mask }` or `{ ids }`). Duplicates run twice. Each node's score is then
     * computed from its distances TO these sources only (see {@link closenessCentrality}).
     */
    readonly sources?: NodeSet | undefined;
    /**
     * Sampled closeness: how many distinct sources to draw when `sources` is not given, by the same deterministic
     * draw betweenness uses -- the same `(n, k)` draws the same sources every time, and the dispatcher hands an
     * accelerator the drawn sources, so both paths run the same ones. With `sources` it must equal `sources.length`.
     */
    readonly k?: number | undefined;
}

/** Closeness scores with the number of sources they were computed from. @public */
export interface ClosenessResult extends ScoresResult {
    /** How many sources were run: `nodeCount` for the exact score, else the sample's length (duplicates counted). */
    readonly sourcesUsed: number;
}

/** An out-adjacency to search, with the weight of each of its arcs, or null to count hops. */
interface Adjacency {
    readonly rowPtr: U32;
    readonly colIdx: U32;
    readonly weights: NumericVector | null;
}

/** One search from a source over an adjacency, reusing its scratch arrays across sources. */
interface Search {
    /** Distance of each node from the last source; Infinity when unreached. */
    readonly dist: Float64Array;
    /** The nodes the last search reached, the source first. */
    readonly reached: Uint32Array;
    /**
     * Search from `source`, filling `dist` and `reached`.
     * @returns How many nodes were reached, the source included
     */
    run(source: number): number;
    /** Reset what the last search wrote. */
    clear(count: number): void;
}

/**
 * Build the search: a breadth-first search, or Dijkstra when the adjacency carries weights.
 * @param n - The node count
 * @param adj - The adjacency to search
 * @param cutoff - Stop expanding nodes this far away or farther
 * @returns The search
 */
function searcher(n: number, adj: Adjacency, cutoff: number): Search {
    const { rowPtr, colIdx, weights } = adj;
    const dist = new Float64Array(n).fill(Infinity);
    const reached = new Uint32Array(n);
    const heap = weights === null ? null : new IndexedMinHeap(n);
    // A popped node is final, as in the legacy search: without this a negative cycle never ends.
    const settled = new Uint8Array(n);

    return {
        dist,
        reached,
        run(source: number): number {
            let tail = 0;
            dist[source] = 0;
            reached[tail++] = source;
            if (heap === null || weights === null) {
                for (let head = 0; head < tail; head++) {
                    const v = reached[head];
                    if (dist[v] >= cutoff) {
                        continue;
                    }
                    for (let a = rowPtr[v], end = rowPtr[v + 1]; a < end; a++) {
                        const w = colIdx[a];
                        if (dist[w] === Infinity) {
                            dist[w] = dist[v] + 1;
                            reached[tail++] = w;
                        }
                    }
                }
                return tail;
            }
            heap.push(source, 0);
            while (!heap.isEmpty()) {
                const v = heap.pop();
                settled[v] = 1;
                if (dist[v] >= cutoff) {
                    continue;
                }
                for (let a = rowPtr[v], end = rowPtr[v + 1]; a < end; a++) {
                    const w = colIdx[a];
                    if (settled[w] === 1) {
                        continue;
                    }
                    const d = dist[v] + weights[a];
                    if (d < dist[w]) {
                        if (dist[w] === Infinity) {
                            reached[tail++] = w;
                        }
                        dist[w] = d;
                        heap.pushOrDecrease(w, d);
                    }
                }
            }
            return tail;
        },
        clear(count: number): void {
            for (let i = 0; i < count; i++) {
                dist[reached[i]] = Infinity;
                settled[reached[i]] = 0;
            }
        },
    };
}

/**
 * The legacy formula over one node's sums.
 * @param o - The options
 * @param n - The node count
 * @param others - How many other nodes the sums cover
 * @param total - The summed distance
 * @param inverse - The summed `1 / distance`
 * @returns The score
 */
function finish(o: ClosenessOptions, n: number, others: number, total: number, inverse: number): number {
    if (o.harmonic === true) {
        return o.normalized === true && n > 1 ? inverse / (n - 1) : inverse;
    }
    if (total <= 0) {
        return 0;
    }
    return o.normalized === true && n > 1 ? others / total / (n - 1) : 1 / total;
}

/**
 * One node's exact score: one search from it over the out-arcs.
 * @param search - The forward search
 * @param o - The options
 * @param n - The node count
 * @param v - The node
 * @returns The score
 */
function exactScore(search: Search, o: ClosenessOptions, n: number, v: number): number {
    const count = search.run(v);
    let total = 0;
    let inverse = 0;
    for (let i = 1; i < count; i++) {
        const d = search.dist[search.reached[i]];
        total += d;
        inverse += d > 0 ? 1 / d : 0;
    }
    search.clear(count);
    return finish(o, n, count - 1, total, inverse);
}

/**
 * The out-adjacency the searches run over, forward or reversed, with the weights `o` asks for.
 * @param s - The snapshot
 * @param o - The options
 * @param reverse - Search the in-arcs, so a search from a source measures distances TO it
 * @returns The adjacency
 */
function adjacency(s: GraphSnapshot, o: ClosenessOptions, reverse: boolean): Adjacency {
    const weighted = o.weighted === true;
    if (!reverse || !s.directed) {
        return { rowPtr: s.rowPtr, colIdx: s.colIdx, weights: weighted ? (o.weights ?? s.weights) : null };
    }
    const r = s.reverse();
    const forward = o.weights;
    let weights: NumericVector | null = null;
    if (weighted) {
        weights = forward === undefined ? r.weights : Float64Array.from(r.fwdArc, (a) => forward[a]);
    }
    return { rowPtr: r.rowPtr, colIdx: r.colIdx, weights };
}

/**
 * Closeness centrality of every node: `1 / sum(distance to each reached node)` by default, the legacy
 * `closenessCentrality` (hops) and `weightedClosenessCentrality` (`weighted: true`) numbers. The weighted
 * route reads the snapshot's f32 arc weights, so it matches legacy to f32 rounding; pass the f64 weights as
 * `weights` for the exact legacy sums. As in legacy, a node's distance is final once it is searched from, so a
 * negative weight gives the legacy (not the true shortest) distance and never loops. An unreached node adds
 * nothing, and a node that reaches nothing scores 0.
 *
 * SAMPLED (`sources` or `k`): the searches run from the sampled sources over the IN-arcs, so each search measures
 * every node's distance TO that source, and each node's sums run over the sources it reaches (itself excluded)
 * instead of over every node it reaches. Everything else is unchanged: the same formula is applied to those sums,
 * with the same `n - 1` under `normalized` and no extrapolation to the whole graph -- the UNSCALED rule sampled
 * betweenness follows. So a sample of every node gives exactly the exact scores (up to the order floating-point
 * sums are added in), and on a sample of `k` sources `1 / score` is the summed distance to those `k` sources:
 * multiply the plain score by `k / n` for the Eppstein-Wang estimate of the exact one. A `harmonic` score (normalized
 * or not) sums reciprocal distances, so it needs the inverse, `n / k`; a `normalized` plain score divides by the
 * number of sources reached, which already rescales it, so it needs no factor. On an undirected snapshot
 * the in-arcs are the out-arcs. Two corners are measured from the source's side and so differ from an exact run
 * even over a full sample: a weighted `cutoff` (the node just past it is admitted from the source's end of the
 * path) and a negative weight (the legacy settle rule is not symmetric).
 * @param s - The snapshot
 * @param options - Normalisation, harmonic form, cutoff, weights and sampling
 * @returns One score per node index; `iterations` and `sourcesUsed` are the number of searches run
 * @throws RangeError for a bad `sources` or `k`
 * @public
 */
export function closenessCentrality(s: GraphSnapshot, options: ClosenessOptions = {}): ClosenessResult {
    const n = s.nodeCount;
    const cutoff = options.cutoff ?? Infinity;
    const scores = new Float64Array(n);
    if (options.sources === undefined && options.k === undefined) {
        const search = searcher(n, adjacency(s, options, false), cutoff);
        for (let v = 0; v < n; v++) {
            scores[v] = exactScore(search, options, n, v);
        }
        return { scores, iterations: n, converged: true, sourcesUsed: n };
    }
    const sources = resolveSources(s, options.sources, options.k, "closenessCentrality");
    const search = searcher(n, adjacency(s, options, true), cutoff);
    const total = new Float64Array(n);
    const inverse = new Float64Array(n);
    const others = new Uint32Array(n);
    for (const source of sources) {
        const count = search.run(source);
        for (let i = 1; i < count; i++) {
            const v = search.reached[i];
            const d = search.dist[v];
            total[v] += d;
            inverse[v] += d > 0 ? 1 / d : 0;
            others[v] += 1;
        }
        search.clear(count);
    }
    for (let v = 0; v < n; v++) {
        scores[v] = finish(options, n, others[v], total[v], inverse[v]);
    }
    return { scores, iterations: sources.length, converged: true, sourcesUsed: sources.length };
}

/**
 * Closeness centrality of one node, with one search rather than n.
 * @param s - The snapshot
 * @param nodeRef - The node: its index, or `{ id }`
 * @param options - As {@link closenessCentrality}, without sampling: one node's exact score is one search
 * @returns The node's score
 * @throws RangeError for a node index outside `[0, nodeCount)`
 * @public
 */
export function nodeClosenessCentrality(
    s: GraphSnapshot,
    nodeRef: NodeRef,
    options: Omit<ClosenessOptions, "sources" | "k"> = {},
): number {
    const node = resolveNode(s, nodeRef);
    if (!Number.isInteger(node) || node < 0 || node >= s.nodeCount) {
        throw new RangeError(`nodeClosenessCentrality: node must be an index in [0, ${s.nodeCount}), got ${node}`);
    }
    const search = searcher(s.nodeCount, adjacency(s, options, false), options.cutoff ?? Infinity);
    return exactScore(search, options, s.nodeCount, node);
}
