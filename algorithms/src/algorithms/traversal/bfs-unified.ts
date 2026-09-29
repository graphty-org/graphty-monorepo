import { type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";

import type { Graph } from "../../core/graph.js";
import { type BfsResult, breadthFirstSearch as indexedBreadthFirstSearch } from "../../indexed/bfs.js";
import { isBipartite as indexedIsBipartite } from "../../indexed/bipartite.js";
import { orderToTree } from "../../indexed/facade.js";
import { legacyArcOrder, toTopologySnapshot } from "../../indexed/to-snapshot.js";
import type { NodeId, ShortestPathResult, TraversalOptions, TraversalResult } from "../../types/index.js";
import { reconstructPath } from "../../utils/graph-utilities.js";

/**
 * Breadth-first search, run by `indexed.breadthFirstSearch` over the graph's snapshot with each
 * node's neighbours tried in the graph's insertion order, so every graph, of any size, gets the
 * visit order, tree and depths the standard queue walk gives.
 * @param graph - The input graph
 * @param startNode - The start node
 * @param targetNode - Stop once this node is taken off the queue; ignored when it is not a node
 * @returns The snapshot, the port's result and the target's index (INVALID_INDEX for none)
 */
function search(
    graph: Graph,
    startNode: NodeId,
    targetNode?: NodeId,
): { s: GraphSnapshot; result: BfsResult; target: number } {
    const s = toTopologySnapshot(graph);
    const start = s.ids.indexOf(startNode);
    const target = targetNode === undefined ? INVALID_INDEX : s.ids.indexOf(targetNode);
    const result = indexedBreadthFirstSearch(s, start, {
        arcOrder: legacyArcOrder(graph, s),
        target: target === INVALID_INDEX ? undefined : target,
    });
    return { s, result, target };
}

/**
 * Perform breadth-first search starting from a given node
 * @param graph - The input graph to traverse
 * @param startNode - The node to start the BFS from
 * @param options - Traversal options (callbacks, target node, etc.)
 * @returns Traversal result with visited nodes, order, and tree structure
 */
export function breadthFirstSearch(graph: Graph, startNode: NodeId, options: TraversalOptions = {}): TraversalResult {
    if (!graph.hasNode(startNode)) {
        throw new Error(`Start node ${String(startNode)} not found in graph`);
    }
    const { s, result, target } = search(graph, startNode, options.targetNode);
    const { order, depth } = result;
    const tree = orderToTree(s.ids, order, result.parent);
    // `order` lists every node discovered; the walk expanded them up to and including the target.
    const found = target === INVALID_INDEX ? -1 : order.indexOf(target);
    const expanded = found === -1 ? order : order.subarray(0, found + 1);
    const visitOrder: NodeId[] = [];
    for (const i of expanded) {
        const id = s.ids.idOf(i);
        visitOrder.push(id);
        options.visitCallback?.(id, depth[i]);
    }
    return { visited: new Set(tree.keys()), order: visitOrder, tree };
}

/**
 * Find shortest path between two nodes using BFS
 * @param graph - The input graph to search
 * @param source - The source node ID
 * @param target - The target node ID
 * @returns Shortest path result or null if no path exists
 */
export function shortestPathBFS(graph: Graph, source: NodeId, target: NodeId): ShortestPathResult | null {
    if (!graph.hasNode(source)) {
        throw new Error(`Source node ${String(source)} not found in graph`);
    }

    if (!graph.hasNode(target)) {
        throw new Error(`Target node ${String(target)} not found in graph`);
    }

    if (source === target) {
        return {
            distance: 0,
            path: [source],
            predecessor: new Map([[source, null]]),
        };
    }

    const { s, result, target: t } = search(graph, source, target);
    if (result.depth[t] === INVALID_INDEX) {
        return null;
    }
    const predecessor = orderToTree(s.ids, result.order, result.parent);
    return { distance: result.depth[t], path: reconstructPath(target, predecessor), predecessor };
}

/**
 * Find shortest paths from source to all reachable nodes
 * @param graph - The input graph to search
 * @param source - The source node ID to compute shortest paths from
 * @returns Map of node IDs to their shortest path results, every entry sharing one predecessor map
 */
export function singleSourceShortestPathBFS(graph: Graph, source: NodeId): Map<NodeId, ShortestPathResult> {
    if (!graph.hasNode(source)) {
        throw new Error(`Source node ${String(source)} not found in graph`);
    }
    const { s, result } = search(graph, source);
    const predecessor = orderToTree(s.ids, result.order, result.parent);
    const results = new Map<NodeId, ShortestPathResult>();
    for (const i of result.order) {
        const node = s.ids.idOf(i);
        results.set(node, { distance: result.depth[i], path: reconstructPath(node, predecessor), predecessor });
    }
    return results;
}

/**
 * Check if the graph is bipartite
 * @param graph - The undirected graph to check
 * @returns True if the graph is bipartite, false otherwise
 */
export function isBipartite(graph: Graph): boolean {
    if (graph.isDirected) {
        throw new Error("Bipartite test requires an undirected graph");
    }
    return indexedIsBipartite(toTopologySnapshot(graph)).bipartite;
}
