import { Graph } from "../../core/graph.js";
import { UnionFind } from "../../data-structures/union-find.js";
import type { Edge } from "../../types/index.js";

export interface MSTResult {
    edges: Edge[];
    totalWeight: number;
}

/**
 * Computes the minimum spanning tree of an undirected graph using Kruskal's algorithm.
 * The algorithm sorts edges by weight and greedily adds edges that don't create cycles,
 * using a union-find data structure to efficiently detect cycles.
 * @param graph - The undirected graph to compute the MST for
 * @returns The minimum spanning tree as a set of edges and the total weight
 * @throws Error if the graph is directed or not connected
 */
export function kruskalMST(graph: Graph): MSTResult {
    if (graph.isDirected) {
        throw new Error("Kruskal's algorithm requires an undirected graph");
    }

    const edges: Edge[] = [];
    const visitedEdges = new Set<string>();

    for (const edge of Array.from(graph.edges())) {
        const edgeKey =
            edge.source < edge.target
                ? `${String(edge.source)}-${String(edge.target)}`
                : `${String(edge.target)}-${String(edge.source)}`;

        if (!visitedEdges.has(edgeKey)) {
            visitedEdges.add(edgeKey);
            edges.push(edge);
        }
    }

    edges.sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0));

    const nodes = Array.from(graph.nodes()).map((n) => n.id);
    const uf = new UnionFind(nodes);

    const mstEdges: Edge[] = [];
    let totalWeight = 0;

    for (const edge of edges) {
        if (!uf.connected(edge.source, edge.target)) {
            uf.union(edge.source, edge.target);
            mstEdges.push(edge);
            totalWeight += edge.weight ?? 0;

            if (mstEdges.length === graph.nodeCount - 1) {
                break;
            }
        }
    }

    if (mstEdges.length !== graph.nodeCount - 1) {
        throw new Error("Graph is not connected");
    }

    return {
        edges: mstEdges,
        totalWeight,
    };
}

/**
 * Alias for kruskalMST. Computes the minimum spanning tree of an undirected graph.
 * @param graph - The undirected graph to compute the MST for
 * @returns The minimum spanning tree as a set of edges and the total weight
 * @throws Error if the graph is directed or not connected
 */
export function minimumSpanningTree(graph: Graph): MSTResult {
    return kruskalMST(graph);
}
