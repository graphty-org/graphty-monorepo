import type { Graph } from "../../core/graph.js";
import { allPairsShortestPath } from "../../indexed/all-pairs.js";
import { exactArcWeights } from "../../indexed/facade.js";
import { toSnapshot } from "../../indexed/to-snapshot.js";
import type { Edge, NodeId } from "../../types/index.js";

export interface FloydWarshallResult {
    distances: Map<NodeId, Map<NodeId, number>>;
    predecessors: Map<NodeId, Map<NodeId, NodeId | null>>;
    hasNegativeCycle: boolean;
}

/**
 * The graph without its NaN and infinite edges, which the port refuses, and those edges. Before the
 * port, such an edge never shortened a path: `x + NaN < d` and `x + Infinity < d` are both false.
 * @param graph - The legacy graph
 * @returns The graph to run on (the input itself when every weight is finite) and the removed edges,
 * each in both orientations on an undirected graph
 */
function withoutNonFinite(graph: Graph): { finite: Graph; removed: Edge[] } {
    const removed = Array.from(graph.edges()).filter((e) => !Number.isFinite(e.weight ?? 1));
    if (removed.length === 0) {
        return { finite: graph, removed };
    }
    const finite = graph.clone();
    for (const e of removed) {
        finite.removeEdge(e.source, e.target);
    }
    const reversed = graph.isDirected ? [] : removed.map((e) => ({ ...e, source: e.target, target: e.source }));
    return { finite, removed: [...removed, ...reversed] };
}

/**
 * Computes all-pairs shortest paths using the Floyd-Warshall algorithm: the port's sweep in node order
 * over the exact f64 weights, with no node bound. A self-loop never changes a node's distance to itself
 * (0); its predecessor on the diagonal is the node. Under a negative cycle (a negative undirected edge is
 * one) every distance is NaN and every predecessor null. An infinite edge weight counts as no edge
 * (its predecessor entry is its source while nothing reaches the target); a NaN weight leaves its own
 * entry NaN and shortens nothing.
 * @param graph - The graph to compute shortest paths for
 * @returns The distances, predecessors, and negative cycle detection result
 */
export function floydWarshall(graph: Graph): FloydWarshallResult {
    const { finite, removed } = withoutNonFinite(graph);
    const s = toSnapshot(finite);
    const { dist, n, predArc, hasNegativeCycle } = allPairsShortestPath(s, {
        weights: exactArcWeights(s),
        method: "floyd-warshall",
        paths: true,
        maxNodes: Infinity,
    });
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
    if (!hasNegativeCycle) {
        for (const e of graph.edges()) {
            if (e.source === e.target) {
                predecessors.get(e.source)?.set(e.source, e.source);
            }
        }
        for (const { source, target, weight } of removed) {
            if (Number.isNaN(weight)) {
                distances.get(source)?.set(target, NaN);
                predecessors.get(source)?.set(target, source);
            } else if (distances.get(source)?.get(target) === Infinity) {
                predecessors.get(source)?.set(target, source);
            }
        }
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
 */
export function floydWarshallPath(
    graph: Graph,
    source: NodeId,
    target: NodeId,
): { path: NodeId[]; distance: number } | null {
    const { distances, predecessors, hasNegativeCycle } = floydWarshall(graph);
    const distance = distances.get(source)?.get(target);
    const row = predecessors.get(source);
    if (hasNegativeCycle || distance === undefined || distance === Infinity || row === undefined) {
        return null;
    }
    const path: NodeId[] = [target];
    for (let v = target; v !== source; ) {
        const p = row.get(v);
        if (p === null || p === undefined || path.length > row.size) {
            return null;
        }
        path.unshift(p);
        v = p;
    }
    return { path, distance };
}

/**
 * Computes the transitive closure of a graph: one breadth-first search per node, edge weights
 * ignored except that a NaN or infinite edge counts as no edge, and a NaN edge's target is not
 * reached from its source.
 * @param graph - The graph to compute transitive closure for
 * @returns A map of each node to the set of nodes reachable from it, itself included, in node order
 */
export function transitiveClosure(graph: Graph): Map<NodeId, Set<NodeId>> {
    const { finite, removed } = withoutNonFinite(graph);
    const s = toSnapshot(finite);
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
    for (const { source, target, weight } of removed) {
        if (Number.isNaN(weight)) {
            closure.get(source)?.delete(target);
        }
    }
    return closure;
}
