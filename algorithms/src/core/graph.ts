import type { Edge, GraphConfig, Node, NodeId } from "../types/index.js";

/**
 * Core Graph data structure for the Graphty Algorithms library
 *
 * Provides efficient graph representation with support for both directed and undirected graphs.
 * Uses adjacency lists for optimal performance with sparse graphs.
 */
export class Graph {
    private nodeMap: Map<NodeId, Node>;
    private adjacencyList: Map<NodeId, Map<NodeId, Edge>>;
    private incomingEdges: Map<NodeId, Map<NodeId, Edge>>; // For directed graphs
    private config: GraphConfig;
    private edgeCount: number;

    /**
     * Creates a new Graph instance.
     * @param config - Configuration options for the graph
     */
    constructor(config: Partial<GraphConfig> = {}) {
        this.config = {
            directed: false,
            allowSelfLoops: true,
            allowParallelEdges: false,
            ...config,
        };
        this.nodeMap = new Map();
        this.adjacencyList = new Map();
        this.incomingEdges = new Map();
        this.edgeCount = 0;
    }

    /**
     * Add a node to the graph
     * @param id - The unique identifier for the node
     * @param data - Optional key-value data to attach to the node
     */
    addNode(id: NodeId, data?: Record<string, unknown>): void {
        if (!this.nodeMap.has(id)) {
            this.nodeMap.set(id, { id, data });
            this.adjacencyList.set(id, new Map());

            if (this.config.directed) {
                this.incomingEdges.set(id, new Map());
            }
        }
    }

    /**
     * Remove a node from the graph
     * @param id - The unique identifier of the node to remove
     * @returns True if the node was removed, false if it did not exist
     */
    removeNode(id: NodeId): boolean {
        if (!this.nodeMap.has(id)) {
            return false;
        }

        // Remove all edges connected to this node
        const outgoingEdges = this.adjacencyList.get(id);
        if (outgoingEdges) {
            for (const targetId of Array.from(outgoingEdges.keys())) {
                this.removeEdge(id, targetId);
            }
        }

        if (this.config.directed) {
            const incomingEdges = this.incomingEdges.get(id);
            if (incomingEdges) {
                for (const sourceId of Array.from(incomingEdges.keys())) {
                    this.removeEdge(sourceId, id);
                }
            }
        } else {
            // For undirected graphs, also remove edges where this node is the target
            for (const [nodeId, edges] of Array.from(this.adjacencyList)) {
                if (edges.has(id)) {
                    this.removeEdge(nodeId, id);
                }
            }
        }

        // Remove the node itself
        this.nodeMap.delete(id);
        this.adjacencyList.delete(id);

        if (this.config.directed) {
            this.incomingEdges.delete(id);
        }

        return true;
    }

    /**
     * Add an edge to the graph
     * @param source - The source node identifier
     * @param target - The target node identifier
     * @param weight - The weight of the edge (defaults to 1)
     * @param data - Optional key-value data to attach to the edge
     */
    addEdge(source: NodeId, target: NodeId, weight = 1, data?: Record<string, unknown>): void {
        // Ensure both nodes exist
        this.addNode(source);
        this.addNode(target);

        // Check self-loops
        if (!this.config.allowSelfLoops && source === target) {
            throw new Error("Self-loops are not allowed in this graph");
        }

        // Check parallel edges
        if (!this.config.allowParallelEdges && this.hasEdge(source, target)) {
            throw new Error("Parallel edges are not allowed in this graph");
        }

        const edge: Edge = { source, target, weight, data };

        // Add to adjacency list
        const sourceAdjacency = this.adjacencyList.get(source);

        if (sourceAdjacency) {
            sourceAdjacency.set(target, edge);
        }

        if (this.config.directed) {
            // For directed graphs, add to incoming edges list
            const targetIncoming = this.incomingEdges.get(target);

            if (targetIncoming) {
                targetIncoming.set(source, edge);
            }
        } else {
            // For undirected graphs, add the reverse edge
            if (source !== target) {
                const reverseEdge: Edge = { source: target, target: source, weight, data };
                const targetAdjacency = this.adjacencyList.get(target);

                if (targetAdjacency) {
                    targetAdjacency.set(source, reverseEdge);
                }
            }
        }

        this.edgeCount++;
    }

    /**
     * Remove an edge from the graph
     * @param source - The source node identifier
     * @param target - The target node identifier
     * @returns True if the edge was removed, false if it did not exist
     */
    removeEdge(source: NodeId, target: NodeId): boolean {
        const sourceEdges = this.adjacencyList.get(source);
        if (!sourceEdges?.has(target)) {
            return false;
        }

        sourceEdges.delete(target);

        if (this.config.directed) {
            const targetIncoming = this.incomingEdges.get(target);
            if (targetIncoming) {
                targetIncoming.delete(source);
            }
        } else {
            // For undirected graphs, remove the reverse edge
            const targetEdges = this.adjacencyList.get(target);
            if (targetEdges) {
                targetEdges.delete(source);
            }
        }

        this.edgeCount--;
        return true;
    }

    /**
     * Check if a node exists in the graph
     * @param id - The unique identifier of the node to check
     * @returns True if the node exists, false otherwise
     */
    hasNode(id: NodeId): boolean {
        return this.nodeMap.has(id);
    }

    /**
     * Check if an edge exists in the graph
     * @param source - The source node identifier
     * @param target - The target node identifier
     * @returns True if the edge exists, false otherwise
     */
    hasEdge(source: NodeId, target: NodeId): boolean {
        const sourceEdges = this.adjacencyList.get(source);
        return sourceEdges ? sourceEdges.has(target) : false;
    }

    /**
     * Get a node by ID
     * @param id - The unique identifier of the node to retrieve
     * @returns The node if found, undefined otherwise
     */
    getNode(id: NodeId): Node | undefined {
        return this.nodeMap.get(id);
    }

    /**
     * Get an edge by source and target
     * @param source - The source node identifier
     * @param target - The target node identifier
     * @returns The edge if found, undefined otherwise
     */
    getEdge(source: NodeId, target: NodeId): Edge | undefined {
        const sourceEdges = this.adjacencyList.get(source);
        return sourceEdges ? sourceEdges.get(target) : undefined;
    }

    /**
     * Get the number of nodes in the graph
     * @returns The total count of nodes
     */
    get nodeCount(): number {
        return this.nodeMap.size;
    }

    /**
     * Get the number of edges in the graph
     * @returns The total count of edges
     */
    get totalEdgeCount(): number {
        return this.edgeCount;
    }

    /**
     * Check if the graph is directed
     * @returns True if the graph is directed, false otherwise
     */
    get isDirected(): boolean {
        return this.config.directed;
    }

    /**
     * Get all nodes in the graph
     * @returns An iterator over all nodes
     */
    nodes(): IterableIterator<Node> {
        return this.nodeMap.values();
    }

    /**
     * Get all edges in the graph
     * @yields Each unique edge in the graph
     */
    *edges(): IterableIterator<Edge> {
        for (const [source, edges] of this.adjacencyList) {
            for (const edge of edges.values()) {
                // For undirected graphs, only yield each edge once
                if (!this.config.directed && source > edge.target) {
                    continue;
                }

                yield edge;
            }
        }
    }

    /**
     * Get neighbors of a node (outgoing edges)
     * @param nodeId - The node identifier to get neighbors for
     * @returns An iterator over the neighbor node identifiers
     */
    neighbors(nodeId: NodeId): IterableIterator<NodeId> {
        const edges = this.adjacencyList.get(nodeId);
        return edges ? edges.keys() : new Map().keys();
    }

    /**
     * Get incoming neighbors of a node (directed graphs only)
     * @param nodeId - The node identifier to get incoming neighbors for
     * @returns An iterator over the incoming neighbor node identifiers
     */
    inNeighbors(nodeId: NodeId): IterableIterator<NodeId> {
        if (!this.config.directed) {
            return this.neighbors(nodeId);
        }

        const edges = this.incomingEdges.get(nodeId);
        return edges ? edges.keys() : new Map().keys();
    }

    /**
     * Get outgoing neighbors of a node
     * @param nodeId - The node identifier to get outgoing neighbors for
     * @returns An iterator over the outgoing neighbor node identifiers
     */
    outNeighbors(nodeId: NodeId): IterableIterator<NodeId> {
        return this.neighbors(nodeId);
    }

    /**
     * Get the degree of a node
     * @param nodeId - The node identifier to get the degree for
     * @returns The total degree of the node
     */
    degree(nodeId: NodeId): number {
        if (this.config.directed) {
            return this.inDegree(nodeId) + this.outDegree(nodeId);
        }

        const edges = this.adjacencyList.get(nodeId);
        return edges ? edges.size : 0;
    }

    /**
     * Get the in-degree of a node
     * @param nodeId - The node identifier to get the in-degree for
     * @returns The number of incoming edges to the node
     */
    inDegree(nodeId: NodeId): number {
        if (!this.config.directed) {
            return this.degree(nodeId);
        }

        const edges = this.incomingEdges.get(nodeId);
        return edges ? edges.size : 0;
    }

    /**
     * Get the out-degree of a node
     * @param nodeId - The node identifier to get the out-degree for
     * @returns The number of outgoing edges from the node
     */
    outDegree(nodeId: NodeId): number {
        const edges = this.adjacencyList.get(nodeId);
        return edges ? edges.size : 0;
    }

    /**
     * Create a copy of the graph
     * @returns A new Graph instance with the same nodes and edges
     */
    clone(): Graph {
        const cloned = new Graph(this.config);

        // Copy nodes
        for (const node of this.nodeMap.values()) {
            cloned.addNode(node.id, node.data ? { ...node.data } : undefined);
        }

        // Copy edges
        for (const edge of this.edges()) {
            cloned.addEdge(edge.source, edge.target, edge.weight, edge.data ? { ...edge.data } : undefined);
        }

        return cloned;
    }

    /**
     * Get graph configuration
     * @returns A copy of the graph configuration object
     */
    getConfig(): GraphConfig {
        return { ...this.config };
    }

    /**
     * Clear all nodes and edges from the graph
     */
    clear(): void {
        this.nodeMap.clear();
        this.adjacencyList.clear();
        this.incomingEdges.clear();
        this.edgeCount = 0;
    }

    /**
     * Get the number of unique edges in the graph
     * For undirected graphs, each edge is counted once
     * @returns The count of unique edges
     */
    get uniqueEdgeCount(): number {
        if (this.config.directed) {
            return this.edgeCount;
        }

        // For undirected graphs, we need to count each edge only once
        let count = 0;
         
        for (const _edge of this.edges()) {
            count++;
        }
        return count;
    }
}
