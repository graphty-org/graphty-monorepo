import type { GraphSnapshot } from "@graphty/graph-format";

import type { Graph } from "../../core/graph.js";
import {
    closenessCentrality as indexedCloseness,
    type ClosenessOptions,
    nodeClosenessCentrality as indexedNodeCloseness,
} from "../../indexed/closeness.js";
import { exactArcWeights, scoresToRecord } from "../../indexed/facade.js";
import { needsLegacyCode, toSnapshot } from "../../indexed/to-snapshot.js";
import type { NodeId } from "../../types/index.js";
import { bfsDistancesOnly, bfsWeightedDistances } from "../traversal/bfs-variants.js";

/**
 * Closeness centrality implementation
 *
 * Measures how close a node is to all other nodes in the graph.
 * Uses BFS to compute shortest path distances efficiently.
 */

/**
 * Closeness centrality options
 */
export interface ClosenessCentralityOptions {
    /**
     * Whether to normalize the centrality values (default: false)
     */
    normalized?: boolean;
    /**
     * Use harmonic mean instead of reciprocal of sum (default: false)
     * Better for disconnected graphs
     */
    harmonic?: boolean;
    /**
     * Consider only nodes within this distance (default: undefined = all nodes)
     */
    cutoff?: number;
    /**
     * Whether to use optimized BFS implementation for large graphs
     */
    optimized?: boolean;
}

/**
 * Calculate closeness centrality from distances
 * @param distances - Map of node IDs to their distances from source
 * @param sourceNode - The source node for distance calculations
 * @param totalNodes - Total number of nodes in the graph
 * @param options - Algorithm configuration options
 * @returns The closeness centrality score for the source node
 */
function calculateClosenessFromDistances(
    distances: Map<NodeId, number>,
    sourceNode: NodeId,
    totalNodes: number,
    options: ClosenessCentralityOptions,
): number {
    if (distances.size <= 1) {
        return 0; // No other nodes reachable
    }

    let centrality = 0;

    if (options.harmonic) {
        // Harmonic centrality: sum of reciprocals of distances
        for (const [targetNode, distance] of distances) {
            if (targetNode !== sourceNode && distance > 0 && distance < Infinity) {
                centrality += 1 / distance;
            }
        }

        // Normalization for harmonic centrality
        if (options.normalized && totalNodes > 1) {
            centrality = centrality / (totalNodes - 1);
        }
    } else {
        // Standard closeness: reciprocal of sum of distances
        let totalDistance = 0;
        let reachableNodes = 0;

        for (const [targetNode, distance] of distances) {
            if (targetNode !== sourceNode && distance < Infinity) {
                totalDistance += distance;
                reachableNodes++;
            }
        }

        if (totalDistance > 0) {
            centrality = 1 / totalDistance;

            // Wasserman and Faust normalization for disconnected graphs
            if (options.normalized && totalNodes > 1) {
                centrality = (centrality * reachableNodes) / (totalNodes - 1);
            }
        }
    }

    return centrality;
}

/**
 * Calculate closeness centrality for all nodes in the graph
 *
 * Closeness centrality measures how close a node is to all other nodes
 * in the graph. It is the reciprocal of the sum of the shortest path
 * distances to all other reachable nodes.
 * @param graph - The input graph
 * @param options - Algorithm options
 * @returns Centrality scores for each node
 * @example
 * ```typescript
 * const graph = new Graph();
 * graph.addEdge("A", "B");
 * graph.addEdge("B", "C");
 *
 * const centrality = closenessCentrality(graph);
 * // { A: 0.5, B: 1.0, C: 0.5 }
 * ```
 *
 * Time Complexity: O(V * (V + E)) for unweighted graphs
 * Space Complexity: O(V)
 */
export function closenessCentrality(graph: Graph, options: ClosenessCentralityOptions = {}): Record<string, number> {
    if (needsLegacyCode(graph)) {
        return perNodeRecord(graph, (id) => legacyNodeClosenessCentrality(graph, id, options));
    }
    const s = toSnapshot(graph);
    return scoresToRecord(s.ids, indexedCloseness(s, portOptions(options)).scores);
}

/**
 * The port's options for a legacy call; `optimized` picked a legacy search engine and has no
 * counterpart.
 * @param options - The legacy options
 * @param s - Given only for a weighted call, which then reads this snapshot's exact f64 weights
 * @returns The port's options
 */
function portOptions(options: ClosenessCentralityOptions, s?: GraphSnapshot): ClosenessOptions {
    return {
        normalized: options.normalized,
        harmonic: options.harmonic,
        cutoff: options.cutoff,
        weighted: s !== undefined,
        weights: s === undefined ? undefined : exactArcWeights(s),
    };
}

/**
 * The legacy whole-graph loop: one per-node score per node, keyed by `String(id)` in node order.
 * @param graph - The input graph
 * @param score - The per-node score
 * @returns The keyed scores
 */
function perNodeRecord(graph: Graph, score: (id: NodeId) => number): Record<string, number> {
    const centrality: Record<string, number> = {};
    for (const node of graph.nodes()) {
        centrality[String(node.id)] = score(node.id);
    }
    return centrality;
}

/**
 * Whether a weighted search must stay on the legacy code: with a negative weight the distance a
 * node keeps depends on the order equal keys leave the priority queue, which the port does not
 * reproduce.
 * @param s - The snapshot
 * @returns True when some weight is negative
 */
function hasNegativeWeight(s: GraphSnapshot): boolean {
    const weights = exactArcWeights(s) ?? s.weights;
    return weights?.some((w) => w < 0) ?? false;
}

/**
 * Calculate closeness centrality for a specific node
 * @param graph - The input graph to analyze
 * @param node - The node to calculate centrality for
 * @param options - Algorithm configuration options
 * @returns The closeness centrality score for the node
 */
export function nodeClosenessCentrality(graph: Graph, node: NodeId, options: ClosenessCentralityOptions = {}): number {
    if (!graph.hasNode(node)) {
        throw new Error(`Node ${String(node)} not found in graph`);
    }
    if (needsLegacyCode(graph)) {
        return legacyNodeClosenessCentrality(graph, node, options);
    }
    const s = toSnapshot(graph);
    return indexedNodeCloseness(s, s.ids.indexOf(node), portOptions(options));
}

/**
 * The implementation {@link nodeClosenessCentrality} delegates away from, kept as its
 * differential-test oracle. Deleted at the removal release.
 * @param graph - The input graph to analyze
 * @param node - The node to calculate centrality for
 * @param options - Algorithm configuration options
 * @returns The closeness centrality score for the node
 * @internal
 */
export function legacyNodeClosenessCentrality(
    graph: Graph,
    node: NodeId,
    options: ClosenessCentralityOptions = {},
): number {
    if (!graph.hasNode(node)) {
        throw new Error(`Node ${String(node)} not found in graph`);
    }

    // Use optimized BFS variant for unweighted graphs
    const distances = bfsDistancesOnly(
        graph,
        node,
        options.cutoff,
        options.optimized !== undefined ? { optimized: options.optimized } : {},
    );
    const totalNodes = graph.nodeCount;

    return calculateClosenessFromDistances(distances, node, totalNodes, options);
}

/**
 * Calculate weighted closeness centrality using Dijkstra's algorithm
 * @param graph - The input graph to analyze
 * @param options - Algorithm configuration options
 * @returns Centrality scores for each node keyed by node ID
 */
export function weightedClosenessCentrality(
    graph: Graph,
    options: ClosenessCentralityOptions = {},
): Record<string, number> {
    if (needsLegacyCode(graph)) {
        return perNodeRecord(graph, (id) => legacyNodeWeightedClosenessCentrality(graph, id, options));
    }
    const s = toSnapshot(graph);
    if (hasNegativeWeight(s)) {
        return perNodeRecord(graph, (id) => legacyNodeWeightedClosenessCentrality(graph, id, options));
    }
    return scoresToRecord(s.ids, indexedCloseness(s, portOptions(options, s)).scores);
}

/**
 * Calculate weighted closeness centrality for a specific node using Dijkstra
 * @param graph - The input graph to analyze
 * @param node - The node to calculate centrality for
 * @param options - Algorithm configuration options
 * @returns The weighted closeness centrality score for the node
 */
export function nodeWeightedClosenessCentrality(
    graph: Graph,
    node: NodeId,
    options: ClosenessCentralityOptions = {},
): number {
    if (!graph.hasNode(node)) {
        throw new Error(`Node ${String(node)} not found in graph`);
    }
    if (needsLegacyCode(graph)) {
        return legacyNodeWeightedClosenessCentrality(graph, node, options);
    }
    const s = toSnapshot(graph);
    if (hasNegativeWeight(s)) {
        return legacyNodeWeightedClosenessCentrality(graph, node, options);
    }
    return indexedNodeCloseness(s, s.ids.indexOf(node), portOptions(options, s));
}

/**
 * The implementation {@link nodeWeightedClosenessCentrality} delegates away from, kept as its
 * differential-test oracle and for a graph with a negative weight. Deleted at the removal release.
 * @param graph - The input graph to analyze
 * @param node - The node to calculate centrality for
 * @param options - Algorithm configuration options
 * @returns The weighted closeness centrality score for the node
 * @internal
 */
export function legacyNodeWeightedClosenessCentrality(
    graph: Graph,
    node: NodeId,
    options: ClosenessCentralityOptions = {},
): number {
    if (!graph.hasNode(node)) {
        throw new Error(`Node ${String(node)} not found in graph`);
    }

    // Use optimized weighted BFS variant (simplified Dijkstra)
    const distances = bfsWeightedDistances(
        graph,
        node,
        options.cutoff,
        options.optimized !== undefined ? { optimized: options.optimized } : {},
    );
    const totalNodes = graph.nodeCount;

    return calculateClosenessFromDistances(distances, node, totalNodes, options);
}
