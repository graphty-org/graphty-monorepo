import type { GraphSnapshot, NodeSet, NumericVector, U32 } from "@graphty/graph-format";

import { resolveSources } from "./betweenness.js";
import { adjacency, type Search, searcher } from "./closeness.js";
import { connectedComponents, weaklyConnectedComponents } from "./components.js";

/** Options of {@link distanceMeasures}. @public */
export interface DistanceMeasuresOptions {
    /** Measure distance by edge weight (Dijkstra) rather than by hops (breadth-first search). Default false. */
    readonly weighted?: boolean | undefined;
    /** Per-arc weight override, arcCount long, read when `weighted`. Default: the snapshot's weights. */
    readonly weights?: NumericVector | undefined;
    /**
     * Sampled run: search from these nodes only (indices, `{ mask }` or `{ ids }`) instead of from every node.
     * See {@link distanceMeasures} for what a sampled result means.
     */
    readonly sources?: NodeSet | undefined;
    /**
     * Sampled run: how many distinct sources to draw when `sources` is not given, by the same deterministic draw
     * betweenness and closeness use, so the same `(n, k)` always draws the same sources. Bounds the work at `k`
     * searches, `O(k * m)`. Default: every node, the exact `O(n * m)` answer.
     */
    readonly k?: number | undefined;
}

/** Eccentricity of every node and diameter, radius and average shortest path length of every component. @public */
export interface DistanceMeasuresResult {
    /**
     * Per node: the distance to the furthest node it reaches. NaN for a node a sampled run did not search from.
     */
    readonly eccentricity: Float64Array;
    /** Per node: its component (weakly connected on a directed snapshot), `0 .. componentCount - 1`. */
    readonly component: U32;
    readonly componentCount: number;
    /** Per component: its node count. */
    readonly componentSize: Uint32Array;
    /** Per component: the largest eccentricity in it. NaN for a component a sampled run never searched from. */
    readonly componentDiameter: Float64Array;
    /** Per component: the smallest eccentricity in it. NaN for a component a sampled run never searched from. */
    readonly componentRadius: Float64Array;
    /**
     * Per component: the mean distance over every ordered pair `(u, v)`, `u != v`, where `v` is reachable from `u`.
     * 0 for a single node. NaN for a component a sampled run never searched from.
     */
    readonly componentAverageShortestPathLength: Float64Array;
    /** The component the graph-wide figures below describe: the one with the most nodes (the lowest on a tie). -1 when empty. */
    readonly largestComponent: number;
    /** Diameter of the largest component. NaN on an empty graph. */
    readonly diameter: number;
    /** Radius of the largest component. NaN on an empty graph. */
    readonly radius: number;
    /** Average shortest path length of the largest component. NaN on an empty graph. */
    readonly averageShortestPathLength: number;
    /** How many searches ran: `nodeCount` when exact, else the sample's length. */
    readonly sourcesUsed: number;
    /** True when every node was searched from, so every figure is exact. */
    readonly exact: boolean;
}

/**
 * One search from `source`: the furthest distance it reaches, the summed distance and how many other nodes it reaches.
 * @param search - The reusable search
 * @param source - The node to search from
 * @returns The furthest distance, the sum and the count
 */
function searchFrom(search: Search, source: number): { furthest: number; sum: number; others: number } {
    const reached = search.run(source);
    let furthest = 0;
    let sum = 0;
    for (let i = 1; i < reached; i++) {
        const d = search.dist[search.reached[i]];
        sum += d;
        furthest = Math.max(furthest, d);
    }
    search.clear(reached);
    return { furthest, sum, others: reached - 1 };
}

/**
 * Distance measures: each node's eccentricity, and each component's diameter, radius and average shortest path
 * length -- one breadth-first search (or, with `weighted`, one Dijkstra) from every node, `O(n * m)`.
 *
 * DISCONNECTED GRAPHS are measured per component: a node's eccentricity counts only the nodes it reaches, and
 * `componentDiameter`, `componentRadius` and `componentAverageShortestPathLength` hold one figure per component.
 * The graph-wide `diameter`, `radius` and `averageShortestPathLength` are those of the LARGEST component, so they
 * match networkx's on a connected graph and stay finite on a disconnected one. On a directed snapshot distances
 * follow arc direction and components are weakly connected; a component that is not strongly connected then
 * averages over the pairs that are reachable only.
 *
 * SAMPLED (`k` or `sources`): only the sampled nodes are searched from. Their eccentricities are exact, every
 * other node's is NaN; a component's diameter is then a lower bound, its radius an upper bound, and its average
 * shortest path length an unbiased estimate (the mean over the sampled sources' reachable pairs).
 * @param s - The snapshot
 * @param options - Weights and sampling
 * @returns The per-node and per-component figures
 * @throws RangeError for a bad `sources` or `k`
 * @public
 */
export function distanceMeasures(s: GraphSnapshot, options: DistanceMeasuresOptions = {}): DistanceMeasuresResult {
    const n = s.nodeCount;
    const exact = options.sources === undefined && options.k === undefined;
    const sources = exact
        ? Array.from({ length: n }, (_, i) => i)
        : resolveSources(s, options.sources, options.k, "distanceMeasures");
    const { labels, count } = s.directed ? weaklyConnectedComponents(s) : connectedComponents(s);

    const componentSize = new Uint32Array(count);
    for (let v = 0; v < n; v++) {
        componentSize[labels[v]]++;
    }

    const eccentricity = new Float64Array(n).fill(Number.NaN);
    const diameter = new Float64Array(count).fill(-Infinity);
    const radius = new Float64Array(count).fill(Infinity);
    const total = new Float64Array(count);
    const pairs = new Float64Array(count);
    const searched = new Uint8Array(count);

    const search = searcher(n, adjacency(s, options, false), Infinity);
    for (const source of sources) {
        const { furthest, sum, others } = searchFrom(search, source);
        const c = labels[source];
        eccentricity[source] = furthest;
        total[c] += sum;
        pairs[c] += others;
        diameter[c] = Math.max(diameter[c], furthest);
        radius[c] = Math.min(radius[c], furthest);
        searched[c] = 1;
    }

    const average = new Float64Array(count);
    let largest = -1;
    for (let c = 0; c < count; c++) {
        // A component no search started in has no figures.
        if (searched[c] === 0) {
            diameter[c] = radius[c] = average[c] = Number.NaN;
        } else {
            average[c] = total[c] / Math.max(1, pairs[c]);
        }
        if (largest === -1 || componentSize[c] > componentSize[largest]) {
            largest = c;
        }
    }

    return {
        eccentricity,
        component: labels,
        componentCount: count,
        componentSize,
        componentDiameter: diameter,
        componentRadius: radius,
        componentAverageShortestPathLength: average,
        largestComponent: largest,
        diameter: largest === -1 ? Number.NaN : diameter[largest],
        radius: largest === -1 ? Number.NaN : radius[largest],
        averageShortestPathLength: largest === -1 ? Number.NaN : average[largest],
        sourcesUsed: sources.length,
        exact,
    };
}
