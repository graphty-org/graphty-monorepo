/**
 * Types of the algorithms 2.x API, kept only to type `./legacy-graph.ts` and the results recorded in
 * `test/golden/`. TEST-ONLY.
 */

// Node identifier type
export type NodeId = string | number;

// Edge representation
export interface Edge {
    source: NodeId;
    target: NodeId;
    weight?: number;
    id?: string;
    data?: Record<string, unknown> | undefined;
}

// Node representation
export interface Node {
    id: NodeId;
    data?: Record<string, unknown> | undefined;
}

// Graph configuration
export interface GraphConfig {
    directed: boolean;
    allowSelfLoops: boolean;
    /**
     * When true, adding an edge between a pair that already has one REPLACES that edge (its
     * weight and data) instead of throwing. The graph never holds two edges for one pair.
     */
    allowParallelEdges: boolean;
}

// Result and option types of removed 2.x functions, kept only to type their recorded results.

export interface LegacyMaxFlowResult {
    maxFlow: number;
    flowGraph: Map<string, Map<string, number>>;
    minCut?: { source: Set<string>; sink: Set<string>; edges: [string, string][] };
}

/**
 * Represents a cluster in the hierarchical structure
 */
export interface GRSBMCluster {
    /** Unique identifier for this cluster */
    id: string;
    /** Node IDs in this cluster */
    members: Set<NodeId>;
    /** Left child cluster (if split) */
    left?: GRSBMCluster;
    /** Right child cluster (if split) */
    right?: GRSBMCluster;
    /** Modularity score of this cluster */
    modularity: number;
    /** Depth in the hierarchy */
    depth: number;
    /** Spectral embedding quality score */
    spectralScore: number;
}

/**
 * Result of the GRSBM clustering algorithm
 */
export interface GRSBMResult {
    /** Root of the cluster hierarchy */
    root: GRSBMCluster;
    /** Flat clustering at leaf level */
    clusters: Map<NodeId, number>;
    /** Number of final clusters */
    numClusters: number;
    /** Modularity scores for each level */
    modularityScores: number[];
    /** Explanation of the clustering structure */
    explanation: ClusterExplanation[];
}

export interface ClusterNode<T> {
    id: string;
    members: Set<T>;
    left?: ClusterNode<T> | undefined;
    right?: ClusterNode<T> | undefined;
    distance: number;
    height: number;
    // For forest roots, store the individual trees
    trees?: ClusterNode<T>[] | undefined;
}

export type LinkageMethod = "single" | "complete" | "average" | "ward";

export interface LinkPredictionScore {
    source: NodeId;
    target: NodeId;
    score: number;
}

export interface MCLOptions {
    expansion?: number; // Expansion parameter (default: 2)
    inflation?: number; // Inflation parameter (default: 2)
    maxIterations?: number; // Maximum iterations (default: 100)
    tolerance?: number; // Convergence tolerance (default: 1e-6)
    pruningThreshold?: number; // Pruning threshold (default: 1e-5)
    selfLoops?: boolean; // Add self-loops (default: true)
}

/**
 * Configuration options for the SynC (Synergistic Deep Graph Clustering) algorithm
 */
export interface SynCConfig {
    /** Number of clusters to find */
    numClusters: number;
    /** Maximum number of iterations for convergence */
    maxIterations?: number;
    /** Convergence tolerance */
    tolerance?: number;
    /** Random seed for reproducibility */
    seed?: number;
    /** Learning rate for optimization */
    learningRate?: number;
    /** Regularization parameter */
    lambda?: number;
}

/**
 * Represents a node in the dendrogram/cluster hierarchy
 */
export interface TeraHACClusterNode {
    /** Unique identifier for this cluster */
    id: string;
    /** Node IDs in this cluster */
    members: Set<NodeId>;
    /** Left child cluster (if internal node) */
    left?: TeraHACClusterNode;
    /** Right child cluster (if internal node) */
    right?: TeraHACClusterNode;
    /** Distance at which this cluster was formed */
    distance: number;
    /** Size of the cluster */
    size: number;
}

/**
 * Configuration options for the TeraHAC (Hierarchical Agglomerative Clustering) algorithm
 */
export interface TeraHACConfig {
    /** Linkage criterion: 'single', 'complete', 'average', 'ward' */
    linkage?: "single" | "complete" | "average" | "ward";
    /** Number of clusters to stop at (optional) */
    numClusters?: number;
    /** Distance threshold to stop clustering */
    distanceThreshold?: number;
    /** Maximum number of nodes to process efficiently */
    maxNodes?: number;
    /** Use graph structure for distance calculation */
    useGraphDistance?: boolean;
    /** Custom warning handler (default: console.warn) */
    onWarning?: (message: string) => void;
}
