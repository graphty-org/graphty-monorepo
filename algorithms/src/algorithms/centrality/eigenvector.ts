import type { Graph } from "../../core/graph.js";
import { ConvergenceError } from "../../errors.js";
import type { CentralityOptions, CentralityResult } from "../../types/index.js";

/**
 * Eigenvector centrality implementation
 *
 * Measures the influence of a node based on the influence of its neighbors.
 * A node has high eigenvector centrality if it is connected to nodes
 * that themselves have high eigenvector centrality.
 *
 * Time complexity: O(V + E) per iteration
 * Space complexity: O(V + E)
 */

export interface EigenvectorCentralityOptions extends CentralityOptions {
    maxIterations?: number; // Maximum iterations (default: 100)
    tolerance?: number; // Convergence tolerance per node (default: 1e-6)
    startVector?: Map<string, number>; // Initial vector (optional)
}

/**
 * Calculate eigenvector centrality for all nodes in the graph.
 *
 * Iterates x <- (A + I) x, as networkx does. Shifting by the identity raises every eigenvalue by
 * one and leaves the eigenvectors alone, so the largest eigenvalue becomes the only one of largest
 * magnitude -- even on a bipartite graph, whose spectrum holds both +lambda and -lambda and makes
 * unshifted power iteration oscillate forever. The run stops when the L1 change summed over all
 * nodes falls below `n * tolerance`, networkx's test.
 *
 * On a directed graph `mode` picks the edges that feed a node: `"in"` (the default, as networkx)
 * scores a node by the nodes pointing AT it, `"out"` by the nodes it points at (networkx on
 * `G.reverse()`), and `"total"` by both (networkx on `G.to_undirected()`). An undirected graph
 * ignores `mode`. When the graph has no cycle along that relation (no edges, or a directed
 * acyclic graph) the adjacency matrix is nilpotent, its only eigenvalue is 0, and every score is
 * exactly 0.
 * @param graph - The graph to compute eigenvector centrality on
 * @param options - Configuration options for the computation
 * @returns Object mapping node IDs to their eigenvector centrality scores
 * @throws {ConvergenceError} When `maxIterations` passes do not meet `tolerance`, as networkx
 *   raises `PowerIterationFailedConvergence`. Raise `maxIterations` or `tolerance` and call again.
 */
export function eigenvectorCentrality(graph: Graph, options: EigenvectorCentralityOptions = {}): CentralityResult {
    const { maxIterations = 100, tolerance = 1e-6, normalized = true, startVector, mode = "in" } = options;

    const nodeIds = Array.from(graph.nodes(), (node) => node.id);
    const keys = nodeIds.map((id) => id.toString());
    const n = keys.length;
    const centrality: CentralityResult = {};

    if (n === 0) {
        return centrality;
    }

    const index = new Map(keys.map((key, i) => [key, i]));
    const feeders = (id: (typeof nodeIds)[number]): Iterable<(typeof nodeIds)[number]> => {
        if (!graph.isDirected || mode === "out") {
            return graph.neighbors(id);
        }
        return mode === "in" ? graph.inNeighbors(id) : new Set([...graph.inNeighbors(id), ...graph.neighbors(id)]);
    };
    const adjacency = nodeIds.map((id) => Array.from(feeders(id), (m) => index.get(m.toString()) ?? 0));

    if (isNilpotent(adjacency)) {
        for (const key of keys) {
            centrality[key] = 0;
        }
        return centrality;
    }

    // A node with nothing feeding it scores exactly 0 once the largest eigenvalue is positive,
    // so it starts there and (A + I) keeps it there.
    let x = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        x[i] = adjacency[i]?.length ? (startVector?.get(keys[i] ?? "") ?? 1) : 0;
    }
    scaleToUnitLength(x);

    let next = new Float64Array(n);
    let converged = false;
    for (let iteration = 0; iteration < maxIterations && !converged; iteration++) {
        for (let i = 0; i < n; i++) {
            let sum = x[i] ?? 0;
            for (const j of adjacency[i] ?? []) {
                sum += x[j] ?? 0;
            }
            next[i] = sum;
        }
        scaleToUnitLength(next);

        let change = 0;
        for (let i = 0; i < n; i++) {
            change += Math.abs((next[i] ?? 0) - (x[i] ?? 0));
        }
        [x, next] = [next, x];
        converged = change < n * tolerance;
    }
    if (!converged) {
        throw new ConvergenceError("eigenvectorCentrality", maxIterations, tolerance);
    }

    for (let i = 0; i < n; i++) {
        centrality[keys[i] ?? ""] = x[i] ?? 0;
    }

    // Additional normalization if requested (normalize to [0,1] range)
    if (normalized) {
        let maxValue = 0;
        let minValue = Number.POSITIVE_INFINITY;
        for (const value of x) {
            maxValue = Math.max(maxValue, value);
            minValue = Math.min(minValue, value);
        }
        const range = maxValue - minValue;
        // All scores equal: 1 each, or 0 each when there is nothing to score.
        const flat = maxValue > 0 ? 1 : 0;
        for (const key of keys) {
            centrality[key] = range > 0 ? ((centrality[key] ?? 0) - minValue) / range : flat;
        }
    }

    return centrality;
}

/**
 * Whether the relation has no cycle (Kahn's algorithm), which makes its adjacency matrix nilpotent.
 * @param adjacency - Each node's neighbour indices
 * @returns True when every node can be peeled off in topological order
 */
function isNilpotent(adjacency: number[][]): boolean {
    const inDegree = new Int32Array(adjacency.length);
    for (const targets of adjacency) {
        for (const j of targets) {
            inDegree[j] = (inDegree[j] ?? 0) + 1;
        }
    }
    const queue: number[] = [];
    inDegree.forEach((degree, i) => {
        if (degree === 0) {
            queue.push(i);
        }
    });
    for (let head = 0; head < queue.length; head++) {
        for (const j of adjacency[queue[head] ?? 0] ?? []) {
            inDegree[j] = (inDegree[j] ?? 0) - 1;
            if (inDegree[j] === 0) {
                queue.push(j);
            }
        }
    }
    return queue.length === adjacency.length;
}

/**
 * Scale a vector in place to unit Euclidean length (a zero vector is left alone).
 * @param v - The vector to scale
 */
function scaleToUnitLength(v: Float64Array): void {
    let norm = 0;
    for (const value of v) {
        norm += value * value;
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
        for (let i = 0; i < v.length; i++) {
            v[i] = (v[i] ?? 0) / norm;
        }
    }
}

/**
 * Calculate eigenvector centrality for a specific node.
 * @param graph - The graph to compute eigenvector centrality on
 * @param nodeId - The ID of the node to calculate centrality for
 * @param options - Configuration options for the computation
 * @returns The eigenvector centrality score for the specified node
 */
export function nodeEigenvectorCentrality(
    graph: Graph,
    nodeId: string | number,
    options: EigenvectorCentralityOptions = {},
): number {
    if (!graph.hasNode(nodeId)) {
        throw new Error(`Node ${String(nodeId)} not found in graph`);
    }

    const centrality = eigenvectorCentrality(graph, options);
    return centrality[nodeId.toString()] ?? 0;
}
