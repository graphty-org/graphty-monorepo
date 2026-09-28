import { INVALID_INDEX } from "@graphty/graph-format";

import type { Graph } from "../../core/graph.js";
import { allPairsShortestPath, type ApspResult } from "../../indexed/all-pairs.js";
import { exactArcWeights } from "../../indexed/facade.js";
import { toSnapshot } from "../../indexed/to-snapshot.js";
import type { NodeId } from "../../types/index.js";

export interface FloydWarshallResult {
    distances: Map<NodeId, Map<NodeId, number>>;
    predecessors: Map<NodeId, Map<NodeId, NodeId | null>>;
    hasNegativeCycle: boolean;
}

/**
 * The port's Floyd-Warshall sweep over the graph's exact f64 weights, with no node bound (this
 * function never had one). Always the sweep, never per-source rows, so distances and tie-breaking
 * stay those of the k-i-j order in node order.
 * @param graph - The legacy graph
 * @returns The port's result
 */
function sweep(graph: Graph): ApspResult {
    const s = toSnapshot(graph);
    return allPairsShortestPath(s, {
        weights: exactArcWeights(s),
        method: "floyd-warshall",
        paths: true,
        maxNodes: Infinity,
    });
}

/**
 * Computes all-pairs shortest paths using the Floyd-Warshall algorithm. Parallel edges count at
 * their cheapest weight and a self-loop never changes a node's distance to itself (0). Under a
 * negative cycle (a negative undirected edge is one) every distance is NaN and every predecessor
 * null.
 * @param graph - The graph to compute shortest paths for
 * @returns The distances, predecessors, and negative cycle detection result
 * @throws RangeError when an edge weight is NaN or infinite
 */
export function floydWarshall(graph: Graph): FloydWarshallResult {
    const s = toSnapshot(graph);
    const { dist, n, predArc, hasNegativeCycle } = sweep(graph);
    const distances = new Map<NodeId, Map<NodeId, number>>();
    const predecessors = new Map<NodeId, Map<NodeId, NodeId | null>>();
    for (let i = 0; i < n; i++) {
        const row = new Map<NodeId, number>();
        const predRow = new Map<NodeId, NodeId | null>();
        for (let j = 0; j < n; j++) {
            const id = s.ids.idOf(j);
            row.set(id, dist[i * n + j]);
            const arc = predArc?.[i * n + j];
            predRow.set(
                id,
                hasNegativeCycle || arc === undefined || i === j || dist[i * n + j] === Infinity
                    ? null
                    : s.ids.idOf(s.arcSource(arc)),
            );
        }
        distances.set(s.ids.idOf(i), row);
        predecessors.set(s.ids.idOf(i), predRow);
    }
    return { distances, predecessors, hasNegativeCycle };
}

/**
 * Finds the shortest path between two nodes using Floyd-Warshall
 * @param graph - The graph to search
 * @param source - The starting node for the path
 * @param target - The destination node for the path
 * @returns The path and distance, or null if either node is missing, no path exists, or the graph
 * has a negative cycle
 * @throws RangeError when an edge weight is NaN or infinite
 */
export function floydWarshallPath(
    graph: Graph,
    source: NodeId,
    target: NodeId,
): { path: NodeId[]; distance: number } | null {
    const s = toSnapshot(graph);
    const result = sweep(graph);
    const i = s.ids.indexOf(source);
    const j = s.ids.indexOf(target);
    if (i === INVALID_INDEX || j === INVALID_INDEX || result.hasNegativeCycle) {
        return null;
    }
    const distance = result.dist[i * result.n + j];
    if (distance === Infinity) {
        return null;
    }
    return { path: Array.from(result.pathTo(i, j), (v) => s.ids.idOf(v)), distance };
}

/**
 * Computes the transitive closure of a graph: one breadth-first search per node, edge weights
 * ignored.
 * @param graph - The graph to compute transitive closure for
 * @returns A map of each node to the set of nodes reachable from it, itself included, in node order
 */
export function transitiveClosure(graph: Graph): Map<NodeId, Set<NodeId>> {
    const s = toSnapshot(graph);
    const { dist, n } = allPairsShortestPath(s, { weighted: false, maxNodes: Infinity });
    const closure = new Map<NodeId, Set<NodeId>>();
    for (let i = 0; i < n; i++) {
        const reachable = new Set<NodeId>();
        for (let j = 0; j < n; j++) {
            if (dist[i * n + j] < Infinity) {
                reachable.add(s.ids.idOf(j));
            }
        }
        closure.set(s.ids.idOf(i), reachable);
    }
    return closure;
}
