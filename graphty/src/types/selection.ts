/**
 * Information about a loaded data source.
 */
export interface DataSourceInfo {
    /** Display name of the data source (e.g., filename) */
    name: string;
    /** Type of data source (e.g., "json", "csv", "graphml") */
    type: string;
}

/**
 * Graph type configuration options.
 */
export interface GraphTypeConfig {
    /** Whether the graph is directed or undirected */
    directed: boolean;
    /** Whether edges have weight values */
    weighted: boolean;
    /** Whether self-loops (edges from a node to itself) are allowed */
    selfLoops: boolean;
}

/**
 * Information about the current graph state.
 * Used by the GraphPropertiesPanel to display graph-level information.
 */
export interface GraphInfo {
    /** Number of nodes in the graph */
    nodeCount: number;
    /** Number of edges in the graph */
    edgeCount: number;
    /** Graph density (edges / possible edges) */
    density: number;
    /** List of loaded data sources */
    dataSources: DataSourceInfo[];
    /** Graph type configuration */
    graphType: GraphTypeConfig;
}
