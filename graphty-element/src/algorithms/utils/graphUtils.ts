/**
 * @file Utility functions for building graph data structures from graphty-element Graph
 */

/**
 * The key an `@graphty/algorithms` result is matched back onto the element's edges by: the two
 * endpoint ids, in the orientation the record declared.
 *
 * THIS IS A LOOKUP KEY AND NOT AN IDENTITY, which is the whole reason it has a name of its own
 * and is not published from `./extend`. The algorithms package answers by endpoint pair, because
 * that is all it can represent; the element identifies an edge by its own counter. A key that
 * names a pair cannot name one of two parallel edges, so nothing may publish it as an edge id --
 * an algorithm looks a result up with this and then publishes `edge.id`.
 * @param source - the id of the node the edge leaves
 * @param target - the id of the node the edge enters
 * @returns the lookup key
 */
export function edgePairKey(source: string | number, target: string | number): string {
    return `${String(source)}:${String(target)}`;
}

/**
 * Minimal edge data interface required by graph utilities
 */
export interface MinimalEdge {
    srcId: string | number;
    dstId: string | number;
    data?: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * Minimal interface for graph-like objects
 * This allows the utilities to work with both real Graph instances and mock graphs in tests
 */
export interface GraphLike {
    getDataManager: () => {
        nodes: Map<string | number, unknown>;
        edges: Map<string | number, MinimalEdge>;
    };
}

/**
 * Options for building adjacency lists
 */
interface AdjacencyOptions {
    /** Whether to treat the graph as directed (default: false for undirected) */
    directed?: boolean;
    /** Weight attribute name on edges (default: "value") */
    weightAttribute?: string;
}

/**
 * Build an unweighted adjacency list from graph edges.
 *
 * Returns a Map where keys are node IDs (as strings) and values are Sets of neighbor node IDs.
 * For undirected graphs, both directions are added automatically.
 * @param graph - The graphty-element Graph instance
 * @param options - Configuration options
 * @returns Map of node ID to Set of neighbor IDs
 * @example
 * ```typescript
 * // Undirected graph
 * const adj = buildAdjacencyList(graph);
 * adj.get("A")?.has("B"); // true if A-B edge exists
 *
 * // Directed graph
 * const directedAdj = buildAdjacencyList(graph, { directed: true });
 * ```
 */
export function buildAdjacencyList(graph: GraphLike, options: AdjacencyOptions = {}): Map<string, Set<string>> {
    const { directed = false } = options;
    const adjacency = new Map<string, Set<string>>();
    const { nodes, edges } = graph.getDataManager();

    // Initialize all nodes with empty sets
    for (const nodeId of nodes.keys()) {
        adjacency.set(String(nodeId), new Set());
    }

    // Add edges
    for (const edge of edges.values()) {
        const src = String(edge.srcId);
        const dst = String(edge.dstId);

        adjacency.get(src)?.add(dst);

        if (!directed) {
            adjacency.get(dst)?.add(src);
        }
    }

    return adjacency;
}

/**
 * Build a weighted adjacency list from graph edges.
 *
 * Returns a Map where keys are node IDs (as strings) and values are Maps of neighbor ID to edge weight.
 * For undirected graphs, both directions are added automatically with the same weight.
 * @param graph - The graphty-element Graph instance
 * @param options - Configuration options
 * @returns Map of node ID to Map of neighbor ID to weight
 * @example
 * ```typescript
 * // Get weighted adjacency (weights from 'value' attribute)
 * const adj = buildWeightedAdjacencyList(graph);
 * const weight = adj.get("A")?.get("B"); // edge weight from A to B
 *
 * // Use custom weight attribute
 * const adj = buildWeightedAdjacencyList(graph, { weightAttribute: "weight" });
 * ```
 */
export function buildWeightedAdjacencyList(
    graph: GraphLike,
    options: AdjacencyOptions = {},
): Map<string, Map<string, number>> {
    const { directed = false, weightAttribute = "value" } = options;
    const adjacency = new Map<string, Map<string, number>>();
    const { nodes, edges } = graph.getDataManager();

    // Initialize all nodes with empty maps
    for (const nodeId of nodes.keys()) {
        adjacency.set(String(nodeId), new Map());
    }

    // Add edges with weights
    for (const edge of edges.values()) {
        const src = String(edge.srcId);
        const dst = String(edge.dstId);

        // Get weight from edge data or edge object directly
        const edgeData = edge.data;
        let rawWeight = edgeData?.[weightAttribute];

        if (rawWeight === undefined) {
            rawWeight = edge[weightAttribute];
        }

        const weight: number = typeof rawWeight === "number" ? rawWeight : 1;

        adjacency.get(src)?.set(dst, weight);

        if (!directed) {
            adjacency.get(dst)?.set(src, weight);
        }
    }

    return adjacency;
}
