/**
 * Structural variants for testing consumers: random multigraphs, a helper that adds self-loops,
 * parallel and anti-parallel edges to any graph, and a pack of small (and a few huge) edge-case
 * graphs that parsers, loaders and algorithms must survive.
 */

import { RandomStream, resolveSeed } from "../random/stream.js";
import { type SampleGraph } from "../types.js";
import { checkEdgeCount, checkInt } from "./util.js";
import { applyWeights, type WeightOptions } from "./weights.js";

/** Options of {@link randomMultigraph}. */
export interface RandomMultigraphOptions extends WeightOptions {
    /** The node count, >= 1 (>= 2 without self-loops). */
    n: number;
    /** The edge count, >= 0. */
    m: number;
    /** Whether the edges are directed; default false. */
    directed?: boolean | undefined;
    /** Whether an edge may join a node to itself; default true. */
    selfLoops?: boolean | undefined;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * A random multigraph: m edges, each an independent uniform ordered pair (u, v) -- drawn with
 * replacement, so parallel edges and (when allowed) self-loops are kept. Undirected, this is the
 * "each endpoint uniform" model: a given self-loop is half as likely as a given pair u != v. Edge e
 * draws u = nextBelow(n) and then v = nextBelow(n), or v = nextBelow(n - 1) shifted past u when
 * self-loops are off, from the stream (seed, "multigraph", 0); one sequential stream, since two
 * draws per edge are cheaper than a per-edge stream derivation. O(m).
 * @param options - n, m, directed, selfLoops and seed
 * @returns the multigraph
 */
export function randomMultigraph(options: RandomMultigraphOptions): SampleGraph {
    const { n, m } = options;
    const loops = options.selfLoops ?? true;
    checkInt("n", n, 1);
    checkInt("m", m, 0);
    if (!loops && n < 2) {
        throw new RangeError(`selfLoops: false needs n >= 2, got ${n}`);
    }
    const stream = new RandomStream(resolveSeed(options.seed), "multigraph", 0);
    const src = new Uint32Array(m);
    const dst = new Uint32Array(m);
    for (let e = 0; e < m; e++) {
        const u = stream.nextBelow(n);
        let v: number;
        if (loops) {
            v = stream.nextBelow(n);
        } else {
            v = stream.nextBelow(n - 1);
            if (v >= u) {
                v++;
            }
        }
        src[e] = u;
        dst[e] = v;
    }
    return applyWeights({ directed: options.directed ?? false, nodeCount: n, src, dst }, options);
}

/** Options of {@link addPathologicalEdges}. */
export interface PathologicalEdgeOptions {
    /** How many self-loops to add at uniform nodes; default 0. */
    selfLoops?: number | undefined;
    /** How many copies of uniform existing edges to add; default 0. */
    parallelEdges?: number | undefined;
    /** How many reversed copies of uniform existing arcs to add (directed graphs only); default 0. */
    antiParallelEdges?: number | undefined;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * A copy of `graph` with pathological edges appended after its own, in this order: `selfLoops`
 * self-loops (v, v) at v = nextBelow(nodeCount); `parallelEdges` copies of edge e =
 * nextBelow(original edge count); `antiParallelEdges` reversed copies (dst[e], src[e]) of
 * e = nextBelow(original edge count). Copies are only ever of the original edges. Draws come from
 * the stream (seed, "pathological", 0) in that order. A weighted graph's copies keep the copied
 * edge's weight and a self-loop gets weight 1. `ids` and `nodeColumns` are shared, not copied.
 * O(m + added).
 * @param graph - the graph
 * @param options - the counts and the seed
 * @returns the new graph
 */
export function addPathologicalEdges(graph: SampleGraph, options: PathologicalEdgeOptions): SampleGraph {
    const loops = options.selfLoops ?? 0;
    const parallel = options.parallelEdges ?? 0;
    const anti = options.antiParallelEdges ?? 0;
    checkInt("selfLoops", loops, 0);
    checkInt("parallelEdges", parallel, 0);
    checkInt("antiParallelEdges", anti, 0);
    if (anti > 0 && !graph.directed) {
        throw new RangeError("antiParallelEdges needs a directed graph");
    }
    const m = graph.src.length;
    if (loops > 0 && graph.nodeCount === 0) {
        throw new RangeError("selfLoops needs a graph with at least one node");
    }
    if (parallel + anti > 0 && m === 0) {
        throw new RangeError("parallelEdges and antiParallelEdges need a graph with at least one edge");
    }
    const total = m + loops + parallel + anti;
    checkEdgeCount(total);
    const stream = new RandomStream(resolveSeed(options.seed), "pathological", 0);
    const src = new Uint32Array(total);
    const dst = new Uint32Array(total);
    src.set(graph.src);
    dst.set(graph.dst);
    const weights = graph.weights === undefined ? undefined : new Float32Array(total);
    weights?.set(graph.weights ?? []);
    let e = m;
    for (let i = 0; i < loops; i++, e++) {
        const v = stream.nextBelow(graph.nodeCount);
        src[e] = v;
        dst[e] = v;
        if (weights !== undefined) {
            weights[e] = 1;
        }
    }
    for (let i = 0; i < parallel + anti; i++, e++) {
        const f = stream.nextBelow(m);
        const reversed = i >= parallel;
        src[e] = reversed ? graph.dst[f] : graph.src[f];
        dst[e] = reversed ? graph.src[f] : graph.dst[f];
        if (weights !== undefined) {
            weights[e] = weights[f];
        }
    }
    return { ...graph, src, dst, weights };
}

/** The names of the {@link edgeCaseGraph} cases. */
export const EDGE_CASE_NAMES = [
    "empty",
    "single-node",
    "single-self-loop",
    "isolated-nodes",
    "disconnected",
    "pathological-undirected",
    "pathological-directed",
    "zero-weights",
    "negative-weights",
    "negative-cycle",
    "duplicate-heavy",
    "max-node-index",
    "star-100k",
    "path-100k",
] as const;

/** One of {@link EDGE_CASE_NAMES}. */
export type EdgeCaseName = (typeof EDGE_CASE_NAMES)[number];

/**
 * A small graph from a flat edge list.
 * @param directed - whether the edges are directed
 * @param nodeCount - the node count
 * @param edges - [u, v, u, v, ...], or [u, v, w, u, v, w, ...] when weighted
 * @param weighted - whether every edge carries a weight
 * @returns the graph
 */
function build(directed: boolean, nodeCount: number, edges: readonly number[], weighted = false): SampleGraph {
    const stride = weighted ? 3 : 2;
    const m = edges.length / stride;
    const src = new Uint32Array(m);
    const dst = new Uint32Array(m);
    const weights = new Float32Array(weighted ? m : 0);
    for (let e = 0; e < m; e++) {
        src[e] = edges[e * stride];
        dst[e] = edges[e * stride + 1];
        weights[e] = weighted ? edges[e * stride + 2] : 0;
    }
    return weighted ? { directed, nodeCount, src, dst, weights } : { directed, nodeCount, src, dst };
}

/**
 * A graph whose edge e is end(e) for e < m.
 * @param nodeCount - the node count
 * @param m - the edge count
 * @param end - maps e to [source, target]
 * @returns the undirected graph
 */
function generated(nodeCount: number, m: number, end: (e: number) => [number, number]): SampleGraph {
    const src = new Uint32Array(m);
    const dst = new Uint32Array(m);
    for (let e = 0; e < m; e++) {
        [src[e], dst[e]] = end(e);
    }
    return { directed: false, nodeCount, src, dst };
}

const CASES: Record<EdgeCaseName, () => SampleGraph> = {
    empty: () => build(false, 0, []),
    "single-node": () => build(false, 1, []),
    "single-self-loop": () => build(false, 1, [0, 0]),
    "isolated-nodes": () => build(false, 10, []),
    // triangle 0-1-2, path 3-4-5, edge 6-7, isolated 8 and 9
    disconnected: () => build(false, 10, [0, 1, 1, 2, 2, 0, 3, 4, 4, 5, 6, 7]),
    // self-loop at 0; (1, 2) three times, once written (2, 1); weights 0, negative and fractional
    "pathological-undirected": () =>
        build(false, 4, [0, 0, 1, 1, 2, 0, 1, 2, -2, 2, 1, 0.5, 2, 3, 2.5, 3, 0, -1], true),
    // self-loop at 0; parallel arcs 0 -> 1; the 2-cycle 1 <-> 2 (an anti-parallel pair, one arc
    // of weight 0); the negative cycle 2 -> 3 -> 4 -> 2 of total weight -2, reachable from 0
    "pathological-directed": () =>
        build(true, 5, [0, 0, 1, 0, 1, 2, 0, 1, 3, 1, 2, 1, 2, 1, 0, 2, 3, -1, 3, 4, -2, 4, 2, 1, 1, 3, 0.5], true),
    // a 4-cycle with the chord 0-2, every weight 0: ties everywhere for Dijkstra and MST
    "zero-weights": () => build(false, 4, [0, 1, 0, 1, 2, 0, 2, 3, 0, 3, 0, 0, 0, 2, 0], true),
    // a DAG with negative arcs and no negative cycle; distances from 0 are [0, 4, 1, 4, 3]
    "negative-weights": () => build(true, 5, [0, 1, 4, 0, 2, 2, 1, 2, -3, 1, 3, 2, 2, 3, 3, 3, 4, -1, 2, 4, 5], true),
    // 0 -> 1, then the cycle 1 -> 2 -> 3 -> 1 of total weight -1
    "negative-cycle": () => build(true, 4, [0, 1, 1, 1, 2, -1, 2, 3, -1, 3, 1, 1], true),
    // 1,000 copies of the edge (0, 1)
    "duplicate-heavy": () => generated(2, 1000, () => [0, 1]),
    // 2^20 nodes, edges only at the ends: sparse index handling and large-id output
    "max-node-index": () => build(false, 2 ** 20, [0, 1, 2 ** 20 - 2, 2 ** 20 - 1, 0, 2 ** 20 - 1]),
    // hub 0 with 100,000 leaves
    "star-100k": () => generated(100_001, 100_000, (e) => [0, e + 1]),
    // the path 0 - 1 - ... - 99,999
    "path-100k": () => generated(100_000, 99_999, (e) => [e, e + 1]),
};

/**
 * An edge-case graph for testing parsers, loaders and algorithms. Every case loads with
 * graph-format's `fromEdgeArrays` default options, and each call returns fresh arrays.
 *
 * - `empty`: 0 nodes, 0 edges.
 * - `single-node`: 1 node, no edges.
 * - `single-self-loop`: 1 node with a self-loop.
 * - `isolated-nodes`: 10 nodes, no edges.
 * - `disconnected`: a triangle, a 3-node path, one edge and 2 isolated nodes (5 components).
 * - `pathological-undirected`: a self-loop, a triple parallel edge (one written reversed), weights
 *   0, negative and fractional.
 * - `pathological-directed`: a self-loop, parallel arcs, an anti-parallel pair (a 2-cycle), a
 *   negative-weight cycle reachable from 0, zero and negative weights.
 * - `zero-weights`: a 4-cycle plus a chord, all weights 0.
 * - `negative-weights`: a DAG with negative weights and no negative cycle (Bellman-Ford, DAG
 *   shortest paths); distances from 0 are [0, 4, 1, 4, 3].
 * - `negative-cycle`: a directed cycle of total weight -1 reachable from node 0.
 * - `duplicate-heavy`: 1,000 copies of the edge (0, 1).
 * - `max-node-index`: 2^20 nodes, 3 edges touching nodes 0, 1, 2^20 - 2 and 2^20 - 1.
 * - `star-100k`: a hub with 100,000 leaves (degree extremes).
 * - `path-100k`: a 100,000-node path (deep recursion, long diameters).
 * @param name - the case
 * @returns the graph
 */
export function edgeCaseGraph(name: EdgeCaseName): SampleGraph {
    if (!(EDGE_CASE_NAMES as readonly string[]).includes(name)) {
        throw new RangeError(`unknown edge case "${name}"; expected one of ${EDGE_CASE_NAMES.join(", ")}`);
    }
    return CASES[name]();
}
