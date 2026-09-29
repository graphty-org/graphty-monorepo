import { type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";

import type { Graph } from "../core/graph.js";
import {
    cutEdgesToLegacy,
    exactArcWeights,
    fromAdjacencyMap,
    maskToStringSet,
    resolveNode,
} from "../indexed/facade.js";
import { crossingEdges, edgeCapacities, maxFlow } from "../indexed/flow.js";
import { toSnapshot } from "../indexed/to-snapshot.js";

/**
 * Ford-Fulkerson Algorithm for Maximum Flow
 *
 * Finds the maximum flow from source to sink in a flow network
 * using the method of augmenting paths.
 *
 * `fordFulkerson` and `edmondsKarp` delegate to `indexed.maxFlow`. Where two opposite directed
 * edges (or the two directions of an undirected edge) both carried flow, the flow graph holds the
 * pair's net flow, each edge within its capacity; the flow value and the cut sides are unchanged.
 */

export interface FlowEdge {
    from: string;
    to: string;
    capacity: number;
    flow: number;
}

export interface FlowNetwork {
    nodes: Set<string>;
    edges: Map<string, Map<string, FlowEdge>>;
}

export interface MaxFlowResult {
    maxFlow: number;
    flowGraph: Map<string, Map<string, number>>;
    minCut?: { source: Set<string>; sink: Set<string>; edges: [string, string][] };
}

/**
 * Run `indexed.maxFlow` and hand its result back in the legacy shape.
 * @param s - The snapshot of the input graph
 * @param source - The source id, as the legacy string parameter takes it
 * @param sink - The sink id
 * @param algorithm - The path search
 * @returns The legacy result; no flow and no cut when either node is missing
 */
function delegate(
    s: GraphSnapshot,
    source: string,
    sink: string,
    algorithm: "edmonds-karp" | "ford-fulkerson",
): MaxFlowResult {
    const from = resolveNode(s.ids, source);
    const to = resolveNode(s.ids, sink);
    if (from === INVALID_INDEX || to === INVALID_INDEX) {
        return { maxFlow: 0, flowGraph: new Map() };
    }
    const weights = exactArcWeights(s);
    const r = maxFlow(s, from, to, { algorithm, weights });
    const { ids } = s;
    const rows: Map<string, number>[] = [];
    const flowGraph = new Map<string, Map<string, number>>();
    for (let i = 0; i < s.nodeCount; i++) {
        const row = new Map<string, number>();
        rows.push(row);
        flowGraph.set(String(ids.idOf(i)), row);
    }
    const { src, dst } = s.edgeList();
    for (let e = 0; e < s.edgeCount; e++) {
        const u = src[e];
        const v = dst[e];
        const f = r.flow[e];
        if (s.directed) {
            rows[u].set(String(ids.idOf(v)), f);
        } else {
            // A negative flow runs from the declared target to the declared source.
            rows[u].set(String(ids.idOf(v)), Math.max(f, 0));
            rows[v].set(String(ids.idOf(u)), Math.max(-f, 0));
        }
    }
    const sourceSet = maskToStringSet(ids, r.sourceSide);
    const sinkSet = new Set<string>();
    for (const id of flowGraph.keys()) {
        if (!sourceSet.has(id)) {
            sinkSet.add(id);
        }
    }
    // Every edge leaving the source side, whatever its capacity, as the legacy cut listed them.
    const capacity = edgeCapacities(s, weights);
    const crossing = crossingEdges(s, r.sourceSide, s.directed, capacity, false);
    const edges = cutEdgesToLegacy(s, r.sourceSide, crossing, capacity).map(({ from: u, to: v }): [string, string] => [
        u,
        v,
    ]);
    return { maxFlow: r.maxFlow, flowGraph, minCut: { source: sourceSet, sink: sinkSet, edges } };
}

/**
 * Utility function to create a flow network for bipartite matching
 * @param leftNodes - Array of left partition node identifiers
 * @param rightNodes - Array of right partition node identifiers
 * @param edges - Array of edges connecting left nodes to right nodes
 * @returns The flow network graph with source and sink nodes
 */
export function createBipartiteFlowNetwork(
    leftNodes: string[],
    rightNodes: string[],
    edges: [string, string][],
): { graph: Map<string, Map<string, number>>; source: string; sink: string } {
    const graph = new Map<string, Map<string, number>>();
    const source = "__source__";
    const sink = "__sink__";

    // Add source connections to left nodes
    graph.set(source, new Map());
    for (const left of leftNodes) {
        const sourceNeighbors = graph.get(source);
        if (sourceNeighbors) {
            sourceNeighbors.set(left, 1);
        }

        graph.set(left, new Map());
    }

    // Add edges between left and right
    for (const [left, right] of edges) {
        if (!graph.has(left)) {
            graph.set(left, new Map());
        }

        const leftNeighbors = graph.get(left);
        if (leftNeighbors) {
            leftNeighbors.set(right, 1);
        }
    }

    // Add right node connections to sink
    for (const right of rightNodes) {
        if (!graph.has(right)) {
            graph.set(right, new Map());
        }

        const rightNeighbors = graph.get(right);
        if (rightNeighbors) {
            rightNeighbors.set(sink, 1);
        }
    }

    graph.set(sink, new Map());

    return { graph, source, sink };
}

/**
 * Ford-Fulkerson algorithm using DFS for finding augmenting paths
 * @param graph - Adjacency list representation with capacities
 * @param source - Source node
 * @param sink - Sink node
 * @returns Maximum flow value and flow graph
 * @throws RangeError when `source` and `sink` are the same node
 *
 * Time Complexity: O(E * f) where f is the maximum flow
 * Space Complexity: O(V + E)
 */
export function fordFulkerson(graph: Graph, source: string, sink: string): MaxFlowResult {
    return delegate(toSnapshot(graph), source, sink, "ford-fulkerson");
}

/**
 * Edmonds-Karp algorithm (Ford-Fulkerson with BFS)
 * More efficient implementation with better time complexity
 * @param graph - Adjacency list representation with capacities - accepts Graph class or Map
 * @param source - Source node
 * @param sink - Sink node
 * @returns Maximum flow value and flow graph
 * @throws RangeError when `source` and `sink` are the same node
 *
 * Time Complexity: O(V * E^2)
 */
export function edmondsKarp(
    graph: Graph | Map<string, Map<string, number>>,
    source: string,
    sink: string,
): MaxFlowResult {
    const s = graph instanceof Map ? fromAdjacencyMap(graph) : toSnapshot(graph);
    return delegate(s, source, sink, "edmonds-karp");
}
