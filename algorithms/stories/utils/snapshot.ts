/**
 * Snapshots for the stories: a generated graph frozen with @graphty/graph-format, and a port's
 * per-node vector read back by node id.
 */

import { GraphBuilder, type GraphSnapshot, type NodeId } from "@graphty/graph-format";

import type { GeneratedGraph } from "./graph-generators.js";

interface SnapshotOptions {
    /** Default false. */
    directed?: boolean;
    /** Carry each edge's weight (default 1); default false, every edge weighs 1. */
    weighted?: boolean;
    /** Add each edge in both directions, for a directed snapshot of an undirected graph. Default false. */
    bothWays?: boolean;
}

/**
 * Freeze a generated graph. Node index i is `graph.nodes[i]`, whose id is its generated number.
 * @param graph - The generated graph
 * @param options - Direction and weights
 * @returns The snapshot
 */
export function toSnapshot(graph: GeneratedGraph, options: SnapshotOptions = {}): GraphSnapshot {
    const builder = new GraphBuilder({ directed: options.directed ?? false });
    for (const node of graph.nodes) {
        builder.addNode(node.id);
    }
    for (const edge of graph.edges) {
        const weight = options.weighted === true ? (edge.weight ?? 1) : 1;
        builder.addEdge(edge.source, edge.target, weight);
        if (options.bothWays === true) {
            builder.addEdge(edge.target, edge.source, weight);
        }
    }
    return builder.freeze();
}

/**
 * A per-node vector keyed by node id, as the story panels list it.
 * @param s - The snapshot the vector belongs to
 * @param values - One value per node index
 * @returns Value per String(node id)
 */
export function byId(s: GraphSnapshot, values: ArrayLike<number>): Record<string, number> {
    const out: Record<string, number> = {};
    for (let i = 0; i < s.nodeCount; i++) {
        out[String(s.ids.idOf(i))] = values[i];
    }
    return out;
}

/**
 * The node ids of a list of node indices.
 * @param s - The snapshot
 * @param indices - Node indices
 * @returns Their ids, as numbers (every story node id is a number)
 */
export function idsOf(s: GraphSnapshot, indices: ArrayLike<number>): number[] {
    return Array.from(indices, (i) => Number(s.ids.idOf(i) as NodeId));
}

/**
 * A per-node label vector as a Map from String(node id) to label, in node order.
 * @param s - The snapshot
 * @param labels - One label per node index
 * @returns Label per node id
 */
export function labelsById(s: GraphSnapshot, labels: ArrayLike<number>): Map<string, number> {
    return new Map(Array.from({ length: s.nodeCount }, (_, i) => [String(s.ids.idOf(i)), labels[i]]));
}

/**
 * The groups of a label vector: group k holds the ids of the nodes labelled k, in node order.
 * @param s - The snapshot
 * @param labels - One label per node index, 0 to count - 1
 * @returns The node ids of each label
 */
export function groupsOf(s: GraphSnapshot, labels: ArrayLike<number>): number[][] {
    const groups: number[][] = [];
    for (let i = 0; i < s.nodeCount; i++) {
        (groups[labels[i]] ??= []).push(Number(s.ids.idOf(i)));
    }
    return groups.filter((g) => g !== undefined);
}

/**
 * A link prediction result as a list of scored pairs of node ids, best first.
 * @param s - The snapshot
 * @param result - The port's parallel arrays
 * @param result.sources - Source node index per pair
 * @param result.targets - Target node index per pair
 * @param result.scores - Score per pair
 * @returns One entry per pair
 */
export function scoredPairs(
    s: GraphSnapshot,
    result: { sources: ArrayLike<number>; targets: ArrayLike<number>; scores: ArrayLike<number> },
): { source: number; target: number; score: number }[] {
    return Array.from({ length: result.scores.length }, (_, k) => ({
        source: Number(s.ids.idOf(result.sources[k])),
        target: Number(s.ids.idOf(result.targets[k])),
        score: result.scores[k],
    }));
}

/**
 * The end node ids of a list of edge indices.
 * @param s - The snapshot
 * @param edges - Edge indices
 * @returns Source and target id per edge
 */
export function edgeEnds(s: GraphSnapshot, edges: ArrayLike<number>): { source: number; target: number }[] {
    const { src, dst } = s.edgeList();
    return Array.from(edges, (e) => ({ source: Number(s.ids.idOf(src[e])), target: Number(s.ids.idOf(dst[e])) }));
}
