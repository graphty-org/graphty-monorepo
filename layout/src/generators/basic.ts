/**
 * Basic graph generation functions
 */

import { Edge,Graph, Node } from "../types";

/**
 * Create a complete graph with n nodes
 * @param n - Number of nodes
 * @returns Graph object with all nodes connected to all other nodes
 */
export function completeGraph(n: number): Graph {
    const nodes: Node[] = Array.from({ length: n }, (_, i) => i);
    const edges: Edge[] = [];

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            edges.push([i, j]);
        }
    }

    return {
        nodes: () => nodes,
        edges: () => edges,
    };
}

/**
 * Create a cycle graph with n nodes
 * @param n - Number of nodes
 * @returns Graph object with nodes connected in a cycle
 */
export function cycleGraph(n: number): Graph {
    const nodes: Node[] = Array.from({ length: n }, (_, i) => i);
    const edges: Edge[] = [];

    for (let i = 0; i < n; i++) {
        edges.push([i, (i + 1) % n]);
    }

    return {
        nodes: () => nodes,
        edges: () => edges,
    };
}

/**
 * Create a star graph with n nodes (1 center + n-1 leaves)
 * @param n - Total number of nodes
 * @returns Graph object with star topology
 */
export function starGraph(n: number): Graph {
    const nodes: Node[] = Array.from({ length: n }, (_, i) => i);
    const edges: Edge[] = [];

    // Connect all nodes to node 0 (center)
    for (let i = 1; i < n; i++) {
        edges.push([0, i]);
    }

    return {
        nodes: () => nodes,
        edges: () => edges,
    };
}

/**
 * Create a wheel graph with n nodes (1 center + n-1 rim nodes)
 * @param n - Total number of nodes
 * @returns Graph object with wheel topology
 */
export function wheelGraph(n: number): Graph {
    const nodes: Node[] = Array.from({ length: n }, (_, i) => i);
    const edges: Edge[] = [];

    // Connect all rim nodes to center (node 0)
    for (let i = 1; i < n; i++) {
        edges.push([0, i]);
    }

    // Connect rim nodes in a cycle
    for (let i = 1; i < n - 1; i++) {
        edges.push([i, i + 1]);
    }
    if (n > 2) {
        edges.push([n - 1, 1]);
    }

    return {
        nodes: () => nodes,
        edges: () => edges,
    };
}
