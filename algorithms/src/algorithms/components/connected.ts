import type { Graph } from "../../core/graph.js";
import { weaklyConnectedComponents as indexedWeaklyConnectedComponents } from "../../indexed/components.js";
import { depthFirstSearch } from "../../indexed/dfs.js";
import { labelsToGroups } from "../../indexed/facade.js";
import { tarjan } from "../../indexed/scc.js";
import { legacyArcOrder, toTopologySnapshot } from "../../indexed/to-snapshot.js";
import type { NodeId } from "../../types/index.js";

/**
 * Connected components algorithms
 *
 * Finds connected components in undirected graphs and strongly connected
 * components in directed graphs using various efficient algorithms.
 */

/**
 * Find connected components in an undirected graph using Union-Find
 * @param graph - The input graph (must be undirected)
 * @returns Array of connected components, each containing an array of node IDs
 */
export function connectedComponents(graph: Graph): NodeId[][] {
    if (graph.isDirected) {
        throw new Error(
            "Connected components algorithm requires an undirected graph. Use stronglyConnectedComponents for directed graphs.",
        );
    }

    return componentGroups(graph);
}

/**
 * The weakly connected components as legacy lists them: one group per component in the order of its
 * first node, members in node order.
 * @param graph - The input graph
 * @returns The components
 */
function componentGroups(graph: Graph): NodeId[][] {
    const s = toTopologySnapshot(graph);
    const { labels, count } = indexedWeaklyConnectedComponents(s);
    return labelsToGroups(s.ids, labels, count);
}

/**
 * Find connected components using DFS (alternative implementation)
 * @param graph - The input graph (must be undirected)
 * @returns Array of connected components, each containing an array of node IDs
 */
export function connectedComponentsDFS(graph: Graph): NodeId[][] {
    if (graph.isDirected) {
        throw new Error("Connected components algorithm requires an undirected graph");
    }

    const visited = new Set<NodeId>();
    const components: NodeId[][] = [];

    for (const node of Array.from(graph.nodes())) {
        if (!visited.has(node.id)) {
            const component: NodeId[] = [];
            dfsComponent(graph, node.id, visited, component);
            components.push(component);
        }
    }

    return components;
}

/**
 * DFS helper for connected components
 * @param graph - The input graph
 * @param nodeId - The starting node ID
 * @param visited - Set of already visited node IDs
 * @param component - Array to accumulate component members
 */
function dfsComponent(graph: Graph, nodeId: NodeId, visited: Set<NodeId>, component: NodeId[]): void {
    visited.add(nodeId);
    component.push(nodeId);

    for (const neighbor of Array.from(graph.neighbors(nodeId))) {
        if (!visited.has(neighbor)) {
            dfsComponent(graph, neighbor, visited, component);
        }
    }
}

/**
 * Find the number of connected components
 * @param graph - The input graph (must be undirected)
 * @returns The number of connected components in the graph
 */
export function numberOfConnectedComponents(graph: Graph): number {
    return connectedComponents(graph).length;
}

/**
 * Check if the graph is connected (has exactly one connected component)
 * @param graph - The input graph (must be undirected)
 * @returns True if the graph is connected, false otherwise
 */
export function isConnected(graph: Graph): boolean {
    return numberOfConnectedComponents(graph) <= 1;
}

/**
 * Find the largest connected component
 * @param graph - The input graph (must be undirected)
 * @returns Array of node IDs in the largest connected component
 */
export function largestConnectedComponent(graph: Graph): NodeId[] {
    const components = connectedComponents(graph);

    if (components.length === 0) {
        return [];
    }

    return components.reduce((largest, current) => (current.length > largest.length ? current : largest));
}

/**
 * Get the connected component containing a specific node
 * @param graph - The input graph (must be undirected)
 * @param nodeId - The node ID to find the component for
 * @returns Array of node IDs in the same component as the specified node
 */
export function getConnectedComponent(graph: Graph, nodeId: NodeId): NodeId[] {
    if (!graph.hasNode(nodeId)) {
        throw new Error(`Node ${String(nodeId)} not found in graph`);
    }

    if (graph.isDirected) {
        throw new Error("Connected components algorithm requires an undirected graph");
    }

    // The members in depth-first discovery order, neighbours in insertion order.
    const s = toTopologySnapshot(graph);
    const { order } = depthFirstSearch(s, s.ids.indexOf(nodeId), { arcOrder: legacyArcOrder(graph, s) });
    return Array.from(order, (i) => s.ids.idOf(i));
}

/**
 * Find strongly connected components using Tarjan's algorithm
 * @param graph - The input graph (must be directed)
 * @returns Array of strongly connected components, each containing an array of node IDs
 */
export function stronglyConnectedComponents(graph: Graph): NodeId[][] {
    if (!graph.isDirected) {
        throw new Error("Strongly connected components require a directed graph");
    }

    // Tarjan's pop order lists each component as one run, in component order.
    const s = toTopologySnapshot(graph);
    const { labels, count, popped } = tarjan(s, { arcOrder: legacyArcOrder(graph, s) });
    const components: NodeId[][] = Array.from({ length: count }, () => []);
    for (const i of popped) {
        components[labels[i]].push(s.ids.idOf(i));
    }
    return components;
}

/**
 * Check if a directed graph is strongly connected
 * @param graph - The input graph (must be directed)
 * @returns True if the graph is strongly connected, false otherwise
 */
export function isStronglyConnected(graph: Graph): boolean {
    if (!graph.isDirected) {
        throw new Error("Strong connectivity check requires a directed graph");
    }

    const components = stronglyConnectedComponents(graph);
    return components.length <= 1;
}

/**
 * Find weakly connected components in a directed graph
 * (treat the graph as undirected for connectivity)
 * @param graph - The input graph (must be directed)
 * @returns Array of weakly connected components, each containing an array of node IDs
 */
export function weaklyConnectedComponents(graph: Graph): NodeId[][] {
    if (!graph.isDirected) {
        throw new Error(
            "Weakly connected components are for directed graphs. Use connectedComponents for undirected graphs.",
        );
    }

    return componentGroups(graph);
}

/**
 * Check if a directed graph is weakly connected
 * @param graph - The input graph (must be directed)
 * @returns True if the graph is weakly connected, false otherwise
 */
export function isWeaklyConnected(graph: Graph): boolean {
    if (!graph.isDirected) {
        throw new Error("Weak connectivity check requires a directed graph");
    }

    return weaklyConnectedComponents(graph).length <= 1;
}

/**
 * Find condensation graph (quotient graph of strongly connected components)
 * @param graph - The input graph (must be directed)
 * @returns Object containing the condensed graph, component map, and component arrays
 */
export function condensationGraph(graph: Graph): {
    condensedGraph: Graph;
    componentMap: Map<NodeId, number>;
    components: NodeId[][];
} {
    if (!graph.isDirected) {
        throw new Error("Condensation graph requires a directed graph");
    }

    const components = stronglyConnectedComponents(graph);
    const componentMap = new Map<NodeId, number>();
    const condensedGraph = new (graph.constructor as new (config: { directed: boolean }) => Graph)({ directed: true });

    // Map each node to its component index
    for (let i = 0; i < components.length; i++) {
        const component = components[i];
        if (component) {
            for (const nodeId of component) {
                componentMap.set(nodeId, i);
            }
            // Add component as a node in condensed graph
            condensedGraph.addNode(i);
        }
    }

    // Add edges between components
    const addedEdges = new Set<string>();

    for (const edge of Array.from(graph.edges())) {
        const sourceComponent = componentMap.get(edge.source);
        const targetComponent = componentMap.get(edge.target);

        if (sourceComponent !== undefined && targetComponent !== undefined && sourceComponent !== targetComponent) {
            const edgeKey = `${String(sourceComponent)}-${String(targetComponent)}`;

            if (!addedEdges.has(edgeKey)) {
                condensedGraph.addEdge(sourceComponent, targetComponent);
                addedEdges.add(edgeKey);
            }
        }
    }

    return {
        condensedGraph,
        componentMap,
        components,
    };
}
