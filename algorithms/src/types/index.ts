/**
 * Core types for the Graphty Algorithms library
 */

// Node identifier type
export type NodeId = string | number;

// Edge representation
/**
 * @deprecated Removed in algorithms 3.0.0. Build a `GraphSnapshot` with `GraphBuilder` from `@graphty/graph-format`
 *   and call the `indexed` functions on it.
 */
export interface Edge {
    source: NodeId;
    target: NodeId;
    weight?: number;
    id?: string;
    data?: Record<string, unknown> | undefined;
}

// Node representation
/**
 * @deprecated Removed in algorithms 3.0.0. Build a `GraphSnapshot` with `GraphBuilder` from `@graphty/graph-format`
 *   and call the `indexed` functions on it.
 */
export interface Node {
    id: NodeId;
    data?: Record<string, unknown> | undefined;
}

// Graph configuration
/**
 * @deprecated Removed in algorithms 3.0.0. Build a `GraphSnapshot` with `GraphBuilder` from `@graphty/graph-format`
 *   and call the `indexed` functions on it.
 */
export interface GraphConfig {
    directed: boolean;
    allowSelfLoops: boolean;
    /**
     * When true, adding an edge between a pair that already has one REPLACES that edge (its
     * weight and data) instead of throwing. The graph never holds two edges for one pair.
     */
    allowParallelEdges: boolean;
}

// Algorithm result interfaces
/**
 * @deprecated Use `PathResult`, which `indexed.bidirectionalDijkstra` returns. Removed in algorithms 3.0.0.
 */
export interface ShortestPathResult {
    distance: number;
    path: NodeId[];
    predecessor: Map<NodeId, NodeId | null>;
}

/**
 * @deprecated Use `ScoresResult`, which `indexed.betweennessCentrality` returns. Removed in algorithms 3.0.0.
 */
export type CentralityResult = Record<string, number>;

/**
 * @deprecated Use `BfsResult`, which `indexed.breadthFirstSearch` returns. Removed in algorithms 3.0.0.
 */
export interface TraversalResult {
    visited: Set<NodeId>;
    order: NodeId[];
    tree?: Map<NodeId, NodeId | null>;
}

/**
 * @deprecated Use `IndexedLouvainResult`, which `indexed.louvain` returns. Removed in algorithms 3.0.0.
 */
export interface CommunityResult {
    communities: NodeId[][];
    modularity: number;
    iterations?: number;
}

/**
 * @deprecated Use `LabelResult`, which `indexed.connectedComponents` returns. Removed in algorithms 3.0.0.
 */
export interface ComponentResult {
    components: NodeId[][];
    componentMap: Map<NodeId, number>;
}

/**
 * @deprecated Use `MstResult`, which `indexed.kruskalMST` returns. Removed in algorithms 3.0.0.
 */
export interface MSTResult {
    edges: Edge[];
    totalWeight: number;
}

/**
 * @deprecated Use `IndexedApspResult`, which `indexed.allPairsShortestPath` returns. Removed in algorithms 3.0.0.
 */
export interface FloydWarshallResult {
    distances: Map<NodeId, Map<NodeId, number>>;
    predecessors: Map<NodeId, Map<NodeId, NodeId | null>>;
    hasNegativeCycle: boolean;
}

// Algorithm options interfaces
/**
 * @deprecated Use `BfsOptions`, which `indexed.breadthFirstSearch` takes. Removed in algorithms 3.0.0.
 */
export interface TraversalOptions {
    targetNode?: NodeId;
    visitCallback?: (node: NodeId, level: number) => void;
}

/**
 * @deprecated Use `SsspOptions`, which `indexed.dijkstra` takes. Removed in algorithms 3.0.0.
 */
export interface DijkstraOptions {
    target?: NodeId;
    /**
     * Use bidirectional search optimization for point-to-point queries.
     * Defaults to true for graphs with >10 nodes, false for smaller graphs.
     * Set explicitly to override automatic heuristic.
     */
    bidirectional?: boolean;
}

/**
 * @deprecated Use `IndexedBellmanFordResult`, which `indexed.bellmanFord` returns. Removed in algorithms 3.0.0.
 */
export interface BellmanFordResult {
    distances: Map<NodeId, number>;
    previous: Map<NodeId, NodeId | null>;
    hasNegativeCycle: boolean;
    negativeCycleNodes?: NodeId[];
}

/**
 * @deprecated Removed in algorithms 3.0.0. Each `indexed` centrality function takes its own options, such as
 *   `BetweennessOptions` for `indexed.betweennessCentrality`.
 */
export interface CentralityOptions {
    normalized?: boolean;
    endpoints?: boolean;
    mode?: "in" | "out" | "total"; // For directed graphs
}

/**
 * Options no function reads: `pageRank` takes the `PageRankOptions` of its own module, which spells the damping
 * factor `dampingFactor`.
 * @deprecated Use `indexed.PageRankOptions` with `indexed.pageRank`. Removed in algorithms 3.0.0.
 */
export interface PageRankOptions {
    alpha?: number; // Damping factor (default: 0.85)
    maxIterations?: number; // Maximum iterations (default: 100)
    tolerance?: number; // Convergence tolerance (default: 1e-6)
    personalization?: Map<NodeId, number>; // Personalized PageRank
}

/**
 * @deprecated Use `IndexedLouvainOptions`, which `indexed.louvain` takes. Removed in algorithms 3.0.0.
 */
export interface LouvainOptions {
    resolution?: number; // Resolution parameter (default: 1.0)
    maxIterations?: number; // Maximum iterations (default: 100)
    tolerance?: number; // Improvement tolerance (default: 1e-6)
    useOptimized?: boolean; // Use optimized implementation for large graphs (default: true for graphs > 50 nodes)
}

/**
 * @deprecated Use `IndexedGirvanNewmanOptions`, which `indexed.girvanNewman` takes. Removed in algorithms 3.0.0.
 */
export interface GirvanNewmanOptions {
    maxCommunities?: number; // Stop when this many communities reached
    minCommunitySize?: number; // Minimum size for valid community
    maxIterations?: number; // Maximum iterations to prevent infinite loops
}
