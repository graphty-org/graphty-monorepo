import { INVALID_INDEX } from "@graphty/graph-format";

import { Graph } from "../../core/graph.js";
import {
    depthFirstSearch as indexedDepthFirstSearch,
    hasCycle,
    topologicalSort as indexedTopologicalSort,
} from "../../indexed/dfs.js";
import { orderToTree } from "../../indexed/facade.js";
import { legacyArcOrder, toTopologySnapshot } from "../../indexed/to-snapshot.js";
import type { NodeId, TraversalOptions, TraversalResult } from "../../types/index.js";

/**
 * Depth-First Search (DFS) implementation
 *
 * Explores graph by going as deep as possible before backtracking.
 * Useful for cycle detection, topological sorting, and connectivity analysis.
 */

/**
 * DFS traversal options
 */
export interface DFSOptions extends TraversalOptions {
    recursive?: boolean; // Use recursive implementation (default: false for browser safety)
    preOrder?: boolean; // Visit nodes in pre-order (default: true)
}

/**
 * Perform depth-first search starting from a given node
 * @param graph - The input graph to traverse
 * @param startNode - The node to start the DFS from
 * @param options - DFS options (recursive mode, pre/post order, etc.)
 * @returns Traversal result with visited nodes, order, and tree structure
 */
export function depthFirstSearch(graph: Graph, startNode: NodeId, options: DFSOptions = {}): TraversalResult {
    if (!graph.hasNode(startNode)) {
        throw new Error(`Start node ${String(startNode)} not found in graph`);
    }

    const postOrder = options.preOrder === false;
    if (options.recursive && !postOrder && options.targetNode !== undefined) {
        // The recursive walk skips only the target's subtree and goes on; the port stops at the target.
        const visited = new Set<NodeId>();
        const order: NodeId[] = [];
        const tree = new Map<NodeId, NodeId | null>();
        dfsRecursive(graph, startNode, visited, order, tree, options, 0);
        return { visited, order, tree };
    }

    const s = toTopologySnapshot(graph);
    const start = s.ids.indexOf(startNode);
    const arcOrder = legacyArcOrder(graph, s);
    const target = options.targetNode === undefined ? INVALID_INDEX : s.ids.indexOf(options.targetNode);
    // Legacy honours the target in pre-order only, and sets the tree in discovery (pre-)order.
    const pre = indexedDepthFirstSearch(s, start, {
        arcOrder,
        target: postOrder || target === INVALID_INDEX ? undefined : target,
    });
    const tree = orderToTree(s.ids, pre.order, pre.parent);
    const visitOrder = postOrder ? indexedDepthFirstSearch(s, start, { arcOrder, order: "post" }).order : pre.order;
    const order: NodeId[] = [];
    for (const i of visitOrder) {
        const id = s.ids.idOf(i);
        order.push(id);
        options.visitCallback?.(id, pre.depth[i]);
    }
    return { visited: new Set(tree.keys()), order, tree };
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
export function hasCycleDFS(graph: Graph): boolean {
    return hasCycle(toTopologySnapshot(graph));
}

/**
 * Topological sorting using DFS (for directed acyclic graphs)
 * @param graph - The directed acyclic graph to sort
 * @returns Array of node IDs in topological order, or null if graph has cycles
 */
export function topologicalSort(graph: Graph): NodeId[] | null {
    if (!graph.isDirected) {
        throw new Error("Topological sort requires a directed graph");
    }
    const s = toTopologySnapshot(graph);
    const order = indexedTopologicalSort(s, { arcOrder: legacyArcOrder(graph, s) });
    return order === null ? null : Array.from(order, (i) => s.ids.idOf(i));
}

/**
 * Find strongly connected components using DFS (for directed graphs)
 * @param graph - The directed graph to analyze
 * @returns Array of strongly connected components (each is an array of node IDs)
 */
export function findStronglyConnectedComponents(graph: Graph): NodeId[][] {
    if (!graph.isDirected) {
        throw new Error("Strongly connected components require a directed graph");
    }

    const visited = new Set<NodeId>();
    const finishOrder: NodeId[] = [];

    // Step 1: Get nodes in order of finishing times
    for (const node of Array.from(graph.nodes())) {
        if (!visited.has(node.id)) {
            dfsFinishOrder(graph, node.id, visited, finishOrder);
        }
    }

    // Step 2: Create transpose graph (reverse all edges)
    const transposeGraph = createTransposeGraph(graph);

    // Step 3: DFS on transpose graph in reverse finish order
    const visited2 = new Set<NodeId>();
    const components: NodeId[][] = [];

    for (let i = finishOrder.length - 1; i >= 0; i--) {
        const node = finishOrder[i];
        if (node !== undefined && !visited2.has(node)) {
            const component: NodeId[] = [];
            dfsCollectComponent(transposeGraph, node, visited2, component);
            components.push(component);
        }
    }

    return components;
}

/**
 * DFS to record finish order
 * @param graph - The graph being traversed
 * @param node - Current node being visited
 * @param visited - Set of visited nodes
 * @param finishOrder - Array to store nodes in order of completion
 */
function dfsFinishOrder(graph: Graph, node: NodeId, visited: Set<NodeId>, finishOrder: NodeId[]): void {
    visited.add(node);

    for (const neighbor of Array.from(graph.neighbors(node))) {
        if (!visited.has(neighbor)) {
            dfsFinishOrder(graph, neighbor, visited, finishOrder);
        }
    }

    finishOrder.push(node);
}

/**
 * DFS to collect nodes in a component
 * @param graph - The graph being traversed
 * @param node - Current node being visited
 * @param visited - Set of visited nodes
 * @param component - Array to collect nodes in the current component
 */
function dfsCollectComponent(graph: Graph, node: NodeId, visited: Set<NodeId>, component: NodeId[]): void {
    visited.add(node);
    component.push(node);

    for (const neighbor of Array.from(graph.neighbors(node))) {
        if (!visited.has(neighbor)) {
            dfsCollectComponent(graph, neighbor, visited, component);
        }
    }
}

/**
 * Create transpose (reverse) of a directed graph
 * @param graph - The directed graph to transpose
 * @returns A new graph with all edges reversed
 */
function createTransposeGraph(graph: Graph): Graph {
    const transpose = new Graph({ directed: true });

    // Add all nodes
    for (const node of Array.from(graph.nodes())) {
        transpose.addNode(node.id, node.data);
    }

    // Add reverse edges
    for (const edge of Array.from(graph.edges())) {
        transpose.addEdge(edge.target, edge.source, edge.weight, edge.data);
    }

    return transpose;
}
