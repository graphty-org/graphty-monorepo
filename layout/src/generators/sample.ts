/**
 * Adapters between @graphty/graph-samples and the layout Graph shape the deprecated generators
 * return. Internal: not re-exported from the package.
 */

import { type SampleGraph } from "@graphty/graph-samples/generators";

import { type Edge, type Graph, type Node } from "../types";

/**
 * The seed handed to graph-samples, which accepts only integers in [0, 2^53). An omitted seed
 * draws a fresh one from Math.random, so an unseeded call gives a different graph each time, as the
 * old generators did. Any other number maps deterministically: |trunc(seed)| mod 2^53, and a
 * non-finite seed (NaN, Infinity) maps to 0.
 * @param seed - the caller's seed, or undefined
 * @returns a valid graph-samples seed
 */
export function sampleSeed(seed: number | undefined): number {
    if (seed === undefined) {
        return Math.floor(Math.random() * 2 ** 53);
    }
    return Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) % 2 ** 53 : 0;
}

/**
 * A count as the old generators read it through Array.from({ length }): truncated, negative or NaN
 * as 0.
 * @param n - the caller's count
 * @returns a non-negative integer
 */
export function sampleCount(n: number): number {
    return Math.max(0, Math.trunc(n)) || 0;
}

/**
 * A probability as the old generators used it (random() < p): below 0 or NaN never, above 1 always.
 * @param p - the caller's probability
 * @returns p clamped to [0, 1]
 */
export function sampleProbability(p: number): number {
    return Math.min(1, Math.max(0, p)) || 0;
}

/**
 * A layout Graph over explicit node and edge lists.
 * @param nodes - the nodes
 * @param edges - the edges
 * @returns the graph
 */
export function listGraph(nodes: Node[], edges: Edge[]): Graph {
    return {
        nodes: () => nodes,
        edges: () => edges,
    };
}

/**
 * The layout Graph of a SampleGraph, node i named id(i) (the index itself by default).
 * @param graph - the graph-samples graph
 * @param id - the name of node i
 * @returns the layout graph, nodes in index order and edges in the SampleGraph's order
 */
export function toLayoutGraph(graph: SampleGraph, id: (i: number) => Node = (i) => i): Graph {
    const nodes = Array.from({ length: graph.nodeCount }, (_, i) => id(i));
    const edges = Array.from(graph.src, (u, e): Edge => [nodes[u], nodes[graph.dst[e]]]);
    return listGraph(nodes, edges);
}
