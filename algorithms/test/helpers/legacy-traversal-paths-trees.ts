/**
 * Verbatim copies of the legacy traversal, path, component and tree functions that now delegate to
 * their `indexed.*` ports, kept as the oracle their facade differential tests compare against. Only
 * the names changed. The BFS functions are the implementation legacy ran on graphs of up to 10,000
 * nodes; the direction-optimised route it took above that size is gone on purpose. At the removal
 * release these become golden fixtures.
 */

import type { MSTResult } from "../../src/algorithms/mst/kruskal.js";
import type { BellmanFordOptions, BellmanFordResult } from "../../src/algorithms/shortest-path/bellman-ford.js";
import type { DFSOptions } from "../../src/algorithms/traversal/dfs.js";
import { Graph } from "../../src/core/graph.js";
import { PriorityQueue } from "../../src/data-structures/priority-queue.js";
import { UnionFind } from "../../src/data-structures/union-find.js";
import type { Edge, NodeId, ShortestPathResult, TraversalOptions, TraversalResult } from "../../src/types/index.js";
import { reconstructPath } from "../../src/utils/graph-utilities.js";

/**
 * Standard BFS implementation for smaller graphs
 * @param graph - The input graph to traverse
 * @param startNode - The node to start the BFS from
 * @param options - Traversal options (callbacks, target node, etc.)
 * @returns Traversal result with visited nodes, order, and tree structure
 */
export function legacyBreadthFirstSearch(
    graph: Graph,
    startNode: NodeId,
    options: TraversalOptions = {},
): TraversalResult {
    const visited = new Set<NodeId>();
    const queue: { node: NodeId; level: number }[] = [];
    const order: NodeId[] = [];
    const tree = new Map<NodeId, NodeId | null>();

    // Initialize with start node
    queue.push({ node: startNode, level: 0 });
    visited.add(startNode);
    tree.set(startNode, null);

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            break;
        }

        order.push(current.node);

        // Call visitor callback if provided
        if (options.visitCallback) {
            options.visitCallback(current.node, current.level);
        }

        // Early termination if target found
        if (options.targetNode !== undefined && current.node === options.targetNode) {
            break;
        }

        // Explore neighbors
        for (const neighbor of graph.neighbors(current.node)) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                tree.set(neighbor, current.node);
                queue.push({ node: neighbor, level: current.level + 1 });
            }
        }
    }

    return { visited, order, tree };
}

/**
 * Standard shortest path BFS
 * @param graph - The input graph to search
 * @param source - The source node ID
 * @param target - The target node ID
 * @returns Shortest path result or null if no path exists
 */
export function legacyShortestPathBFS(graph: Graph, source: NodeId, target: NodeId): ShortestPathResult | null {
    const visited = new Set<NodeId>();
    const queue: { node: NodeId; distance: number }[] = [];
    const predecessor = new Map<NodeId, NodeId | null>();

    // Initialize BFS
    queue.push({ node: source, distance: 0 });
    visited.add(source);
    predecessor.set(source, null);

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            break;
        }

        // Target found
        if (current.node === target) {
            const path = reconstructPath(target, predecessor);
            return {
                distance: current.distance,
                path,
                predecessor,
            };
        }

        // Explore neighbors
        for (const neighbor of graph.neighbors(current.node)) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                predecessor.set(neighbor, current.node);
                queue.push({ node: neighbor, distance: current.distance + 1 });
            }
        }
    }

    // No path found
    return null;
}

/**
 * Standard single-source shortest paths
 * @param graph - The input graph to search
 * @param source - The source node ID to compute shortest paths from
 * @returns Map of node IDs to their shortest path results
 */
export function legacySingleSourceShortestPathBFS(graph: Graph, source: NodeId): Map<NodeId, ShortestPathResult> {
    const results = new Map<NodeId, ShortestPathResult>();
    const visited = new Set<NodeId>();
    const queue: { node: NodeId; distance: number }[] = [];
    const predecessor = new Map<NodeId, NodeId | null>();
    const distances = new Map<NodeId, number>();

    // Initialize BFS
    queue.push({ node: source, distance: 0 });
    visited.add(source);
    predecessor.set(source, null);
    distances.set(source, 0);

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            break;
        }

        // Explore neighbors
        for (const neighbor of graph.neighbors(current.node)) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                predecessor.set(neighbor, current.node);
                distances.set(neighbor, current.distance + 1);
                queue.push({ node: neighbor, distance: current.distance + 1 });
            }
        }
    }

    // Build results after BFS completes
    // This avoids copying the predecessor map for each node
    for (const [node, distance] of distances) {
        const path = reconstructPath(node, predecessor);
        results.set(node, {
            distance,
            path,
            predecessor, // Share the same predecessor map
        });
    }

    return results;
}

/**
 * Check if the graph is bipartite using BFS coloring
 *
 * Note: This function does not use Direction-Optimized BFS as the
 * coloring logic is specific and doesn't benefit from the optimization.
 * @param graph - The undirected graph to check
 * @returns True if the graph is bipartite, false otherwise
 */
export function legacyIsBipartite(graph: Graph): boolean {
    if (graph.isDirected) {
        throw new Error("Bipartite test requires an undirected graph");
    }

    const color = new Map<NodeId, 0 | 1>();
    const visited = new Set<NodeId>();

    // Check each connected component
    for (const node of Array.from(graph.nodes())) {
        if (!visited.has(node.id)) {
            const queue: NodeId[] = [node.id];
            color.set(node.id, 0);
            visited.add(node.id);

            while (queue.length > 0) {
                const current = queue.shift();
                if (current === undefined) {
                    break;
                }

                const currentColor = color.get(current);
                if (currentColor === undefined) {
                    continue;
                }

                for (const neighbor of Array.from(graph.neighbors(current))) {
                    if (!visited.has(neighbor)) {
                        // Color with opposite color
                        color.set(neighbor, currentColor === 0 ? 1 : 0);
                        visited.add(neighbor);
                        queue.push(neighbor);
                    } else if (color.get(neighbor) === currentColor) {
                        // Same color as current node - not bipartite
                        return false;
                    }
                }
            }
        }
    }

    return true;
}

/**
 * Perform depth-first search starting from a given node
 * @param graph - The input graph to traverse
 * @param startNode - The node to start the DFS from
 * @param options - DFS options (recursive mode, pre/post order, etc.)
 * @returns Traversal result with visited nodes, order, and tree structure
 */
export function legacyDepthFirstSearch(graph: Graph, startNode: NodeId, options: DFSOptions = {}): TraversalResult {
    if (!graph.hasNode(startNode)) {
        throw new Error(`Start node ${String(startNode)} not found in graph`);
    }

    const visited = new Set<NodeId>();
    const order: NodeId[] = [];
    const tree = new Map<NodeId, NodeId | null>();

    if (options.recursive) {
        dfsRecursive(graph, startNode, visited, order, tree, options, 0);
    } else {
        dfsIterative(graph, startNode, visited, order, tree, options);
    }

    return { visited, order, tree };
}

/**
 * Iterative DFS implementation (safer for browsers)
 * @param graph - The input graph to traverse
 * @param startNode - The node to start the DFS from
 * @param visited - Set to track visited nodes
 * @param order - Array to store traversal order
 * @param tree - Map to store parent relationships
 * @param options - DFS options (recursive mode, pre/post order, etc.)
 */
function dfsIterative(
    graph: Graph,
    startNode: NodeId,
    visited: Set<NodeId>,
    order: NodeId[],
    tree: Map<NodeId, NodeId | null>,
    options: DFSOptions,
): void {
    if (options.preOrder === false) {
        // For post-order, use a simpler recursive approach to ensure correctness
        dfsRecursive(graph, startNode, visited, order, tree, options, 0, null);
        return;
    }

    const stack: { node: NodeId; parent: NodeId | null; depth: number }[] = [];
    stack.push({ node: startNode, parent: null, depth: 0 });

    while (stack.length > 0) {
        const current = stack.pop();
        if (!current) {
            break;
        }

        if (!visited.has(current.node)) {
            visited.add(current.node);
            tree.set(current.node, current.parent);

            // Pre-order processing
            order.push(current.node);

            // Call visitor callback if provided
            if (options.visitCallback) {
                options.visitCallback(current.node, current.depth);
            }

            // Early termination if target found
            if (options.targetNode !== undefined && current.node === options.targetNode) {
                break;
            }

            // Add neighbors to stack in reverse order to maintain left-to-right traversal
            const neighbors = Array.from(graph.neighbors(current.node));
            for (let i = neighbors.length - 1; i >= 0; i--) {
                const neighbor = neighbors[i];
                if (neighbor !== undefined && !visited.has(neighbor)) {
                    stack.push({ node: neighbor, parent: current.node, depth: current.depth + 1 });
                }
            }
        }
    }
}

/**
 * Recursive DFS implementation
 * @param graph - The input graph to traverse
 * @param node - Current node being visited
 * @param visited - Set to track visited nodes
 * @param order - Array to store traversal order
 * @param tree - Map to store parent relationships
 * @param options - DFS options (recursive mode, pre/post order, etc.)
 * @param depth - Current depth in the traversal tree
 * @param parent - Parent node of the current node
 */
function dfsRecursive(
    graph: Graph,
    node: NodeId,
    visited: Set<NodeId>,
    order: NodeId[],
    tree: Map<NodeId, NodeId | null>,
    options: DFSOptions,
    depth: number,
    parent: NodeId | null = null,
): void {
    visited.add(node);
    tree.set(node, parent);

    // Pre-order processing
    if (options.preOrder !== false) {
        order.push(node);

        if (options.visitCallback) {
            options.visitCallback(node, depth);
        }

        // Early termination if target found
        if (options.targetNode !== undefined && node === options.targetNode) {
            return;
        }
    }

    // Recursively visit neighbors
    for (const neighbor of Array.from(graph.neighbors(node))) {
        if (!visited.has(neighbor)) {
            dfsRecursive(graph, neighbor, visited, order, tree, options, depth + 1, node);
        }
    }

    // Post-order processing
    if (options.preOrder === false) {
        order.push(node);

        if (options.visitCallback) {
            options.visitCallback(node, depth);
        }
    }
}

/**
 * Detect cycles in a graph using DFS
 * @param graph - The input graph to check for cycles
 * @returns True if the graph contains a cycle, false otherwise
 */
export function legacyHasCycleDFS(graph: Graph): boolean {
    const visited = new Set<NodeId>();

    // Check each unvisited node for cycles
    for (const node of Array.from(graph.nodes())) {
        if (!visited.has(node.id)) {
            if (graph.isDirected) {
                const recursionStack = new Set<NodeId>();
                if (hasCycleUtilDirected(graph, node.id, visited, recursionStack)) {
                    return true;
                }
            } else {
                if (hasCycleUtilUndirected(graph, node.id, visited, null)) {
                    return true;
                }
            }
        }
    }

    return false;
}

/**
 * Utility function for cycle detection in directed graphs
 * @param graph - The directed graph to check
 * @param node - Current node being visited
 * @param visited - Set of all visited nodes
 * @param recursionStack - Set of nodes in the current recursion path
 * @returns True if a cycle is found, false otherwise
 */
function hasCycleUtilDirected(graph: Graph, node: NodeId, visited: Set<NodeId>, recursionStack: Set<NodeId>): boolean {
    visited.add(node);
    recursionStack.add(node);

    // Check all neighbors
    for (const neighbor of Array.from(graph.neighbors(node))) {
        if (!visited.has(neighbor)) {
            if (hasCycleUtilDirected(graph, neighbor, visited, recursionStack)) {
                return true;
            }
        } else if (recursionStack.has(neighbor)) {
            // Back edge found - cycle detected
            return true;
        }
    }

    recursionStack.delete(node);
    return false;
}

/**
 * Utility function for cycle detection in undirected graphs
 * @param graph - The undirected graph to check
 * @param node - Current node being visited
 * @param visited - Set of all visited nodes
 * @param parent - Parent node of the current node
 * @returns True if a cycle is found, false otherwise
 */
function hasCycleUtilUndirected(graph: Graph, node: NodeId, visited: Set<NodeId>, parent: NodeId | null): boolean {
    visited.add(node);

    // Check all neighbors
    for (const neighbor of Array.from(graph.neighbors(node))) {
        if (!visited.has(neighbor)) {
            if (hasCycleUtilUndirected(graph, neighbor, visited, node)) {
                return true;
            }
        } else if (neighbor !== parent) {
            // Found a visited node that's not the parent - cycle detected
            return true;
        }
    }

    return false;
}

/**
 * Topological sorting using DFS (for directed acyclic graphs)
 * @param graph - The directed acyclic graph to sort
 * @returns Array of node IDs in topological order, or null if graph has cycles
 */
export function legacyTopologicalSort(graph: Graph): NodeId[] | null {
    if (!graph.isDirected) {
        throw new Error("Topological sort requires a directed graph");
    }

    // First check if graph has cycles
    if (legacyHasCycleDFS(graph)) {
        return null; // Cannot topologically sort a graph with cycles
    }

    const visited = new Set<NodeId>();
    const stack: NodeId[] = [];

    // Perform DFS from each unvisited node
    for (const node of Array.from(graph.nodes())) {
        if (!visited.has(node.id)) {
            topologicalSortUtil(graph, node.id, visited, stack);
        }
    }

    // Return nodes in reverse order of finishing times
    return stack.reverse();
}

/**
 * Utility function for topological sorting
 * @param graph - The directed graph being sorted
 * @param node - Current node being visited
 * @param visited - Set of visited nodes
 * @param stack - Stack to store nodes in reverse topological order
 */
function topologicalSortUtil(graph: Graph, node: NodeId, visited: Set<NodeId>, stack: NodeId[]): void {
    visited.add(node);

    // Visit all neighbors first
    for (const neighbor of Array.from(graph.neighbors(node))) {
        if (!visited.has(neighbor)) {
            topologicalSortUtil(graph, neighbor, visited, stack);
        }
    }

    // Add current node to stack after visiting all neighbors
    stack.push(node);
}

/**
 * Find connected components in an undirected graph using Union-Find
 * @param graph - The input graph (must be undirected)
 * @returns Array of connected components, each containing an array of node IDs
 */
export function legacyConnectedComponents(graph: Graph): NodeId[][] {
    if (graph.isDirected) {
        throw new Error(
            "Connected components algorithm requires an undirected graph. Use stronglyConnectedComponents for directed graphs.",
        );
    }

    const nodes = Array.from(graph.nodes()).map((node) => node.id);

    if (nodes.length === 0) {
        return [];
    }

    const unionFind = new UnionFind(nodes);

    // Union connected nodes
    for (const edge of Array.from(graph.edges())) {
        unionFind.union(edge.source, edge.target);
    }

    return unionFind.getAllComponents();
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
 * Get the connected component containing a specific node
 * @param graph - The input graph (must be undirected)
 * @param nodeId - The node ID to find the component for
 * @returns Array of node IDs in the same component as the specified node
 */
export function legacyGetConnectedComponent(graph: Graph, nodeId: NodeId): NodeId[] {
    if (!graph.hasNode(nodeId)) {
        throw new Error(`Node ${String(nodeId)} not found in graph`);
    }

    if (graph.isDirected) {
        throw new Error("Connected components algorithm requires an undirected graph");
    }

    const visited = new Set<NodeId>();
    const component: NodeId[] = [];

    dfsComponent(graph, nodeId, visited, component);

    return component;
}

/**
 * Find strongly connected components using Tarjan's algorithm
 * @param graph - The input graph (must be directed)
 * @returns Array of strongly connected components, each containing an array of node IDs
 */
export function legacyStronglyConnectedComponents(graph: Graph): NodeId[][] {
    if (!graph.isDirected) {
        throw new Error("Strongly connected components require a directed graph");
    }

    const nodes = Array.from(graph.nodes()).map((node) => node.id);
    const components: NodeId[][] = [];
    const indices = new Map<NodeId, number>();
    const lowLinks = new Map<NodeId, number>();
    const onStack = new Set<NodeId>();
    const stack: NodeId[] = [];
    let index = 0;

    function tarjanSCC(nodeId: NodeId): void {
        // Set the depth index for this node
        indices.set(nodeId, index);
        lowLinks.set(nodeId, index);
        index++;
        stack.push(nodeId);
        onStack.add(nodeId);

        // Consider successors
        for (const neighbor of Array.from(graph.neighbors(nodeId))) {
            if (!indices.has(neighbor)) {
                // Successor has not yet been visited; recurse on it
                tarjanSCC(neighbor);
                const nodeLL = lowLinks.get(nodeId) ?? 0;
                const neighborLL = lowLinks.get(neighbor) ?? 0;
                lowLinks.set(nodeId, Math.min(nodeLL, neighborLL));
            } else if (onStack.has(neighbor)) {
                // Successor is in stack and hence in the current SCC
                const nodeLL = lowLinks.get(nodeId) ?? 0;
                const neighborIndex = indices.get(neighbor) ?? 0;
                lowLinks.set(nodeId, Math.min(nodeLL, neighborIndex));
            }
        }

        // If nodeId is a root node, pop the stack and create an SCC
        const nodeIndex = indices.get(nodeId) ?? 0;
        const nodeLowLink = lowLinks.get(nodeId) ?? 0;

        if (nodeLowLink === nodeIndex) {
            const component: NodeId[] = [];
            let w: NodeId;

            do {
                const popped = stack.pop();
                if (popped === undefined) {
                    break;
                }

                w = popped;

                onStack.delete(w);
                component.push(w);
            } while (w !== nodeId);

            components.push(component);
        }
    }

    for (const nodeId of nodes) {
        if (!indices.has(nodeId)) {
            tarjanSCC(nodeId);
        }
    }

    return components;
}

/**
 * Find weakly connected components in a directed graph
 * (treat the graph as undirected for connectivity)
 * @param graph - The input graph (must be directed)
 * @returns Array of weakly connected components, each containing an array of node IDs
 */
export function legacyWeaklyConnectedComponents(graph: Graph): NodeId[][] {
    if (!graph.isDirected) {
        throw new Error(
            "Weakly connected components are for directed graphs. Use connectedComponents for undirected graphs.",
        );
    }

    const nodes = Array.from(graph.nodes()).map((node) => node.id);

    if (nodes.length === 0) {
        return [];
    }

    const unionFind = new UnionFind(nodes);

    // Union nodes connected by edges (ignore direction)
    for (const edge of Array.from(graph.edges())) {
        unionFind.union(edge.source, edge.target);
    }

    return unionFind.getAllComponents();
}

/**
 * Find condensation graph (quotient graph of strongly connected components)
 * @param graph - The input graph (must be directed)
 * @returns Object containing the condensed graph, component map, and component arrays
 */
export function legacyCondensationGraph(graph: Graph): {
    condensedGraph: Graph;
    componentMap: Map<NodeId, number>;
    components: NodeId[][];
} {
    if (!graph.isDirected) {
        throw new Error("Condensation graph requires a directed graph");
    }

    const components = legacyStronglyConnectedComponents(graph);
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

/**
 * Single-source shortest paths with early termination optimization
 * @param graph - The graph to search
 * @param source - The starting node for the search
 * @param cutoff - Optional maximum distance to search
 * @returns A map of node IDs to their distances from the source
 */
export function legacySingleSourceShortestPath(graph: Graph, source: NodeId, cutoff?: number): Map<NodeId, number> {
    if (!graph.hasNode(source)) {
        throw new Error(`Source node ${String(source)} not found in graph`);
    }

    const distances = new Map<NodeId, number>();
    const visited = new Set<NodeId>();
    const pq = new PriorityQueue<NodeId>();

    // Initialize distances
    for (const node of Array.from(graph.nodes())) {
        const distance = node.id === source ? 0 : Infinity;
        distances.set(node.id, distance);
        pq.enqueue(node.id, distance);
    }

    while (!pq.isEmpty()) {
        const currentNode = pq.dequeue();
        if (currentNode === undefined) {
            break;
        }

        const currentDistance = distances.get(currentNode);
        if (currentDistance === undefined) {
            continue;
        }

        // Skip if already visited
        if (visited.has(currentNode)) {
            continue;
        }

        visited.add(currentNode);

        // Skip if unreachable or beyond cutoff
        if (currentDistance === Infinity || (cutoff !== undefined && currentDistance > cutoff)) {
            break;
        }

        // Check all neighbors
        for (const neighbor of Array.from(graph.neighbors(currentNode))) {
            if (visited.has(neighbor)) {
                continue;
            }

            const edge = graph.getEdge(currentNode, neighbor);
            if (!edge) {
                continue;
            }

            const edgeWeight = edge.weight ?? 1;
            const tentativeDistance = currentDistance + edgeWeight;
            const neighborDistance = distances.get(neighbor);
            if (neighborDistance === undefined) {
                continue;
            }

            // Found a shorter path
            if (tentativeDistance < neighborDistance) {
                distances.set(neighbor, tentativeDistance);
                pq.enqueue(neighbor, tentativeDistance);
            }
        }
    }

    // Filter out unreachable nodes and apply cutoff
    const result = new Map<NodeId, number>();

    for (const [nodeId, distance] of distances) {
        if (distance < Infinity && (cutoff === undefined || distance <= cutoff)) {
            result.set(nodeId, distance);
        }
    }

    return result;
}

/**
 * One relaxable arc: a direction an edge can actually be traversed in.
 */
interface Arc {
    from: NodeId;
    to: NodeId;
    weight: number;
}

/**
 * Expand the graph's edges into the arcs Bellman-Ford may relax.
 *
 * A directed graph yields one arc per edge. An UNDIRECTED graph yields two, because
 * `graph.edges()` reports each undirected edge once, arbitrarily oriented from one of its
 * endpoints. Relaxing only that orientation makes every edge one-way and leaves most of an
 * undirected graph unreachable from the source -- the distances come back as Infinity for
 * nodes that are plainly connected.
 *
 * Note that expanding is not merely a convenience: on an undirected graph a single
 * negative-weight edge IS a negative cycle, since it can be traversed back and forth forever.
 * Producing both arcs is what lets the cycle check below report that correctly.
 * @param graph - The graph whose edges are being expanded.
 * @returns Every arc that may be relaxed, in edge order.
 */
function relaxableArcs(graph: Graph): Arc[] {
    const arcs: Arc[] = [];
    for (const edge of graph.edges()) {
        const weight = edge.weight ?? 1;
        arcs.push({ from: edge.source, to: edge.target, weight });
        if (!graph.isDirected) {
            arcs.push({ from: edge.target, to: edge.source, weight });
        }
    }

    return arcs;
}

/**
 * Find shortest paths from source using Bellman-Ford algorithm
 * @param graph - The graph to search
 * @param source - The starting node for the search
 * @param options - Algorithm options including optional target for early termination
 * @returns The distances, predecessors, and negative cycle information
 */
function bellmanFord(graph: Graph, source: NodeId, options: BellmanFordOptions = {}): BellmanFordResult {
    if (!graph.hasNode(source)) {
        throw new Error(`Source node ${String(source)} not found in graph`);
    }

    const distances = new Map<NodeId, number>();
    const predecessors = new Map<NodeId, NodeId | null>();
    const nodes = Array.from(graph.nodes()).map((node) => node.id);
    const arcs = relaxableArcs(graph);

    // Initialize distances
    for (const nodeId of nodes) {
        distances.set(nodeId, nodeId === source ? 0 : Infinity);
        predecessors.set(nodeId, null);
    }

    // Relax edges |V| - 1 times
    for (let i = 0; i < nodes.length - 1; i++) {
        let updated = false;

        for (const arc of arcs) {
            const u = arc.from;
            const v = arc.to;
            const { weight } = arc;

            const distanceU = distances.get(u);
            const distanceV = distances.get(v);

            if (distanceU !== undefined && distanceV !== undefined && distanceU !== Infinity) {
                const newDistance = distanceU + weight;

                if (newDistance < distanceV) {
                    distances.set(v, newDistance);
                    predecessors.set(v, u);
                    updated = true;

                    // Early termination if target reached
                    if (options.target !== undefined && v === options.target) {
                        break;
                    }
                }
            }
        }

        // If no update in this iteration, we can stop early
        if (!updated) {
            break;
        }
    }

    // Check for negative cycles
    const negativeCycleNodes: NodeId[] = [];
    let hasNegativeCycle = false;

    for (const arc of arcs) {
        const u = arc.from;
        const v = arc.to;
        const { weight } = arc;

        const distanceU = distances.get(u);
        const distanceV = distances.get(v);

        if (distanceU !== undefined && distanceV !== undefined && distanceU !== Infinity) {
            const newDistance = distanceU + weight;

            if (newDistance < distanceV) {
                hasNegativeCycle = true;
                negativeCycleNodes.push(v);
            }
        }
    }

    return {
        distances,
        predecessors,
        hasNegativeCycle,
        negativeCycleNodes,
    };
}

/**
 * Check if graph has negative cycles using Bellman-Ford
 * @param graph - The graph to check for negative cycles
 * @returns True if the graph contains a negative cycle
 */
export function legacyHasNegativeCycle(graph: Graph): boolean {
    const nodes = Array.from(graph.nodes());

    if (nodes.length === 0) {
        return false;
    }

    // Need to check from multiple sources in case of disconnected components
    const checked = new Set<NodeId>();

    for (const node of nodes) {
        if (!checked.has(node.id)) {
            const result = bellmanFord(graph, node.id);

            if (result.hasNegativeCycle) {
                return true;
            }

            // Mark all reachable nodes as checked
            for (const [nodeId, distance] of Array.from(result.distances)) {
                if (distance !== Infinity) {
                    checked.add(nodeId);
                }
            }
        }
    }

    return false;
}

/**
 * Computes the minimum spanning tree of an undirected graph using Kruskal's algorithm.
 * The algorithm sorts edges by weight and greedily adds edges that don't create cycles,
 * using a union-find data structure to efficiently detect cycles.
 * @param graph - The undirected graph to compute the MST for
 * @returns The minimum spanning tree as a set of edges and the total weight
 * @throws Error if the graph is directed or not connected
 */
export function legacyKruskalMST(graph: Graph): MSTResult {
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
