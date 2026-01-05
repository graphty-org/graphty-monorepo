/**
 * Algorithm categories for grouping in the UI.
 */
export type AlgorithmCategory =
    | "centrality"
    | "community"
    | "shortest-path"
    | "traversal"
    | "components"
    | "mst"
    | "flow";

/**
 * Display names for algorithm categories.
 */
export const CATEGORY_DISPLAY_NAMES: Record<AlgorithmCategory, string> = {
    centrality: "Centrality",
    community: "Community Detection",
    "shortest-path": "Shortest Path",
    traversal: "Traversal",
    components: "Components",
    mst: "Minimum Spanning Tree",
    flow: "Flow",
};

/**
 * Metadata for a single algorithm.
 */
export interface AlgorithmInfo {
    namespace: string;
    type: string;
    displayName: string;
    category: AlgorithmCategory;
    description: string;
    requiresSourceNode: boolean;
    requiresTargetNode?: boolean;
    /** For Prim algorithm, which uses "startNode" instead of "source" */
    sourceOptionKey?: "source" | "startNode";
    /** For Max Flow/Min Cut, which use "sink" instead of "target" */
    targetOptionKey?: "target" | "sink";
}

/**
 * Complete catalog of all 23 algorithms available in graphty-element.
 * Ordered by category and then by typical usage/importance within category.
 */
export const ALGORITHM_CATALOG: AlgorithmInfo[] = [
    // Centrality (7 algorithms)
    {
        namespace: "graphty",
        type: "degree",
        displayName: "Degree",
        category: "centrality",
        description: "Counts the number of connections for each node (in-degree, out-degree, and total)",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "pagerank",
        displayName: "PageRank",
        category: "centrality",
        description: "Measures node importance based on incoming connections from other important nodes",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "betweenness",
        displayName: "Betweenness Centrality",
        category: "centrality",
        description: "Measures how often a node lies on the shortest path between other nodes",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "closeness",
        displayName: "Closeness Centrality",
        category: "centrality",
        description: "Measures how close a node is to all other nodes in the graph",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "eigenvector",
        displayName: "Eigenvector Centrality",
        category: "centrality",
        description: "Measures influence based on the importance of connected neighbors",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "katz",
        displayName: "Katz Centrality",
        category: "centrality",
        description: "Measures centrality with attenuation for distant connections",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "hits",
        displayName: "HITS",
        category: "centrality",
        description: "Computes hub and authority scores for each node",
        requiresSourceNode: false,
    },

    // Community Detection (4 algorithms)
    {
        namespace: "graphty",
        type: "louvain",
        displayName: "Louvain",
        category: "community",
        description: "Detects communities by optimizing modularity using a hierarchical approach",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "girvan-newman",
        displayName: "Girvan-Newman",
        category: "community",
        description: "Detects communities by progressively removing high-betweenness edges",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "leiden",
        displayName: "Leiden",
        category: "community",
        description: "Improved community detection with guaranteed connected communities",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "label-propagation",
        displayName: "Label Propagation",
        category: "community",
        description: "Fast community detection by spreading labels through the network",
        requiresSourceNode: false,
    },

    // Shortest Path (3 algorithms)
    {
        namespace: "graphty",
        type: "dijkstra",
        displayName: "Dijkstra",
        category: "shortest-path",
        description: "Finds the shortest path between two nodes using positive edge weights",
        requiresSourceNode: true,
        requiresTargetNode: true,
    },
    {
        namespace: "graphty",
        type: "bellman-ford",
        displayName: "Bellman-Ford",
        category: "shortest-path",
        description: "Finds shortest paths even with negative edge weights",
        requiresSourceNode: true,
        requiresTargetNode: true,
    },
    {
        namespace: "graphty",
        type: "floyd-warshall",
        displayName: "Floyd-Warshall",
        category: "shortest-path",
        description: "Computes shortest paths between all pairs of nodes",
        requiresSourceNode: false,
    },

    // Traversal (2 algorithms)
    {
        namespace: "graphty",
        type: "bfs",
        displayName: "Breadth-First Search",
        category: "traversal",
        description: "Explores the graph level by level from a starting node",
        requiresSourceNode: true,
    },
    {
        namespace: "graphty",
        type: "dfs",
        displayName: "Depth-First Search",
        category: "traversal",
        description: "Explores the graph by going as deep as possible before backtracking",
        requiresSourceNode: true,
    },

    // Components (2 algorithms)
    {
        namespace: "graphty",
        type: "connected-components",
        displayName: "Connected Components",
        category: "components",
        description: "Identifies groups of nodes that are connected to each other",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "scc",
        displayName: "Strongly Connected Components",
        category: "components",
        description: "Finds groups where every node is reachable from every other node",
        requiresSourceNode: false,
    },

    // Minimum Spanning Tree (2 algorithms)
    {
        namespace: "graphty",
        type: "kruskal",
        displayName: "Kruskal",
        category: "mst",
        description: "Finds a minimum spanning tree by adding edges in weight order",
        requiresSourceNode: false,
    },
    {
        namespace: "graphty",
        type: "prim",
        displayName: "Prim",
        category: "mst",
        description: "Builds a minimum spanning tree by growing from a starting node",
        requiresSourceNode: true,
        sourceOptionKey: "startNode",
    },

    // Flow (3 algorithms)
    {
        namespace: "graphty",
        type: "max-flow",
        displayName: "Max Flow",
        category: "flow",
        description: "Computes the maximum flow from source to sink in a network",
        requiresSourceNode: true,
        requiresTargetNode: true,
        targetOptionKey: "sink",
    },
    {
        namespace: "graphty",
        type: "min-cut",
        displayName: "Min Cut",
        category: "flow",
        description: "Finds the minimum set of edges to remove to disconnect source from sink",
        requiresSourceNode: true,
        requiresTargetNode: true,
        targetOptionKey: "sink",
    },
    {
        namespace: "graphty",
        type: "bipartite-matching",
        displayName: "Bipartite Matching",
        category: "flow",
        description: "Finds maximum matching in a bipartite graph",
        requiresSourceNode: false,
    },
];

/**
 * Get all unique categories in their display order.
 * @returns Array of algorithm categories in display order
 */
export function getCategories(): AlgorithmCategory[] {
    const seen = new Set<AlgorithmCategory>();
    const result: AlgorithmCategory[] = [];

    for (const algo of ALGORITHM_CATALOG) {
        if (!seen.has(algo.category)) {
            seen.add(algo.category);
            result.push(algo.category);
        }
    }

    return result;
}

/**
 * Get all algorithms for a given category.
 * @param category - The algorithm category to filter by
 * @returns Array of algorithms in the specified category
 */
export function getAlgorithmsByCategory(category: AlgorithmCategory): AlgorithmInfo[] {
    return ALGORITHM_CATALOG.filter((algo) => algo.category === category);
}
