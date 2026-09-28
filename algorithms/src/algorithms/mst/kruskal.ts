import { Graph } from "../../core/graph.js";
import { UnionFind } from "../../data-structures/union-find.js";
import { exactArcWeights } from "../../indexed/facade.js";
import { kruskalMST as indexedKruskalMST } from "../../indexed/mst.js";
import { toSnapshotOrNull } from "../../indexed/to-snapshot.js";
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

    // A NaN weight makes the legacy sort order depend on the sort's own internals, and legacy drops
    // an edge whose key string another edge already spells (1-2 and "1"-"2"): keep that walk for both.
    const s = legacyDropsAnEdge(graph) ? null : toSnapshotOrNull(graph);
    if (s === null) {
        return kruskalMSTLegacy(graph);
    }

    const { edges: accepted, totalWeight } = indexedKruskalMST(s, { weights: exactArcWeights(s) });
    const { src, dst } = s.edgeList();
    const edges: Edge[] = [];
    for (const e of accepted) {
        // The graph's own edge object, as legacy returned it.
        const edge = graph.getEdge(s.ids.idOf(src[e]), s.ids.idOf(dst[e]));
        if (edge !== undefined) {
            edges.push(edge);
        }
    }

    if (edges.length !== graph.nodeCount - 1) {
        throw new Error("Graph is not connected");
    }

    return { edges, totalWeight };
}

/**
 * The key legacy Kruskal dedups edges by: both ids as strings, lesser first.
 * @param edge - The edge
 * @returns Its key
 */
function legacyEdgeKey(edge: Edge): string {
    return edge.source < edge.target
        ? `${String(edge.source)}-${String(edge.target)}`
        : `${String(edge.target)}-${String(edge.source)}`;
}

/**
 * Whether legacy Kruskal would ignore one of the graph's edges.
 * @param graph - The undirected graph
 * @returns True if two of its edges share a legacy key, so legacy Kruskal ignores one of them
 */
function legacyDropsAnEdge(graph: Graph): boolean {
    const keys = new Set<string>();
    for (const edge of graph.edges()) {
        const key = legacyEdgeKey(edge);
        if (keys.has(key)) {
            return true;
        }
        keys.add(key);
    }
    return false;
}

/**
 * The legacy Kruskal behind {@link kruskalMST}, for a graph with a NaN weight or two edges whose
 * keys collide.
 * @param graph - The undirected graph to compute the MST for
 * @returns The minimum spanning tree as a set of edges and the total weight
 * @throws Error if the graph is not connected
 */
function kruskalMSTLegacy(graph: Graph): MSTResult {
    const edges: Edge[] = [];
    const visitedEdges = new Set<string>();

    for (const edge of Array.from(graph.edges())) {
        const edgeKey = legacyEdgeKey(edge);

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
