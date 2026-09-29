import { type GraphSnapshot, INVALID_INDEX, makeMask, maskSet, type NodeMask } from "@graphty/graph-format";

import type { Graph } from "../../core/graph.js";
import {
    type BipartiteMatchingOptions as IndexedMatchingOptions,
    type BipartiteMatchingResult as IndexedMatchingResult,
    greedyBipartiteMatching as indexedGreedyBipartiteMatching,
    maximumBipartiteMatching as indexedMaximumBipartiteMatching,
} from "../../indexed/matching.js";
import { toTopologySnapshot } from "../../indexed/to-snapshot.js";
import type { NodeId } from "../../types/index.js";
import { bfsColoringWithPartitions } from "../traversal/bfs-variants.js";

/**
 * Maximum Bipartite Matching
 *
 * Finds the maximum matching in a bipartite graph. A matching is a set of edges
 * without common vertices. Maximum matching has the largest possible number of edges.
 *
 * `maximumBipartiteMatching` and `greedyBipartiteMatching` delegate to their `indexed.*` ports.
 * Left nodes are visited in node order and their neighbours in index order, so the pairs chosen
 * (and, for the greedy matching, their number) can differ from earlier releases, and an arc joins
 * its two ends whichever way it points.
 *
 * Time complexity: O(V * E)
 * Space complexity: O(V)
 */

export interface BipartiteMatchingResult {
    matching: Map<NodeId, NodeId>; // Maps left nodes to right nodes
    size: number; // Number of matched pairs
}

export interface BipartiteMatchingOptions {
    leftNodes?: Set<NodeId>; // Optional: specify left partition
    rightNodes?: Set<NodeId>; // Optional: specify right partition
}

/**
 * The legacy options to the port's: explicit sides as node masks, ids not in the graph ignored.
 * @param s - The snapshot
 * @param options - The legacy options
 * @returns The port's options
 */
function portOptions(s: GraphSnapshot, options: BipartiteMatchingOptions): IndexedMatchingOptions {
    const { leftNodes, rightNodes } = options;
    if (!leftNodes || !rightNodes) {
        return {};
    }
    const mask = (ids: Set<NodeId>): NodeMask => {
        const out = makeMask(s.nodeCount);
        for (const id of ids) {
            const i = s.ids.indexOf(id);
            if (i !== INVALID_INDEX) {
                maskSet(out, i, true);
            }
        }
        return out;
    };
    return { left: mask(leftNodes), right: mask(rightNodes) };
}

/**
 * The port's matching to the legacy Map, left nodes in node order.
 * @param s - The snapshot
 * @param result - The port's result
 * @returns The legacy result
 */
function toLegacy(s: GraphSnapshot, result: IndexedMatchingResult): BipartiteMatchingResult {
    const matching = new Map<NodeId, NodeId>();
    for (let u = 0; u < s.nodeCount; u++) {
        if (result.matching[u] !== INVALID_INDEX) {
            matching.set(s.ids.idOf(u), s.ids.idOf(result.matching[u]));
        }
    }
    return { matching, size: result.size };
}

/**
 * Find maximum matching in a bipartite graph using augmenting paths
 * @param graph - The bipartite graph to find maximum matching for
 * @param options - Optional configuration including left and right node partitions
 * @returns The maximum matching as a map from left nodes to right nodes and the matching size
 * @throws Error if the graph is not bipartite
 */
export function maximumBipartiteMatching(
    graph: Graph,
    options: BipartiteMatchingOptions = {},
): BipartiteMatchingResult {
    const s = toTopologySnapshot(graph);
    return toLegacy(s, indexedMaximumBipartiteMatching(s, portOptions(s, options)));
}

/**
 * Check if graph is bipartite and return the partition
 * @param graph - The graph to check for bipartiteness
 * @returns An object with left and right node sets if bipartite, or null if not bipartite
 */
export function bipartitePartition(graph: Graph): { left: Set<NodeId>; right: Set<NodeId> } | null {
    const result = bfsColoringWithPartitions(graph);

    if (!result.isBipartite || !result.partitions) {
        return null;
    }

    return {
        left: result.partitions[0],
        right: result.partitions[1],
    };
}

/**
 * Simple greedy bipartite matching algorithm
 * Useful for comparison or when Hopcroft-Karp is overkill
 * @param graph - The bipartite graph to find matching for
 * @param options - Optional configuration including left and right node partitions
 * @returns The matching as a map from left nodes to right nodes and the matching size
 * @throws Error if the graph is not bipartite
 */
export function greedyBipartiteMatching(graph: Graph, options: BipartiteMatchingOptions = {}): BipartiteMatchingResult {
    const s = toTopologySnapshot(graph);
    return toLegacy(s, indexedGreedyBipartiteMatching(s, portOptions(s, options)));
}
