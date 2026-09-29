/**
 * K-Core Decomposition Algorithm
 *
 * Finds the k-core subgraph where each node has at least k neighbors
 * within the subgraph. Used for identifying cohesive groups and
 * understanding graph structure.
 *
 * `kCoreDecomposition` (and `getKCore` through it) delegates to `indexed.kCoreDecomposition` on an
 * undirected graph; the result equals the pre-migration implementation in `k-core-legacy.ts`.
 */

import type { Graph } from "../core/graph.js";
import { kCoreDecomposition as indexedKCoreDecomposition } from "../indexed/k-core.js";
import { needsLegacyCode, toSnapshot } from "../indexed/to-snapshot.js";
import {
    graphToAdjacencySet,
    kCoreDecomposition as legacyKCoreDecomposition,
    type KCoreResult,
} from "./k-core-legacy.js";

export type { KCoreResult } from "./k-core-legacy.js";

/**
 * Extract the k-core subgraph
 * Returns nodes that belong to k-core or higher
 * @param graph - Undirected graph
 * @param k - Core number
 * @returns Set of nodes in k-core or higher
 */
export function getKCore(graph: Graph, k: number): Set<string> {
    const { coreness } = kCoreDecomposition(graph);
    const kCore = new Set<string>();

    for (const [node, core] of coreness) {
        if (core >= k) {
            kCore.add(node);
        }
    }

    return kCore;
}

/**
 * Get the induced subgraph for k-core
 * Returns the actual subgraph containing only k-core nodes
 * @param graph - Original graph
 * @param k - Core number
 * @returns K-core subgraph
 */
export function getKCoreSubgraph(graph: Graph, k: number): Map<string, Set<string>> {
    const kCoreNodes = getKCore(graph, k);
    const adjacencySet = graphToAdjacencySet(graph);
    const subgraph = new Map<string, Set<string>>();

    for (const node of kCoreNodes) {
        const neighbors = adjacencySet.get(node);
        if (neighbors) {
            const coreNeighbors = new Set<string>();
            for (const neighbor of neighbors) {
                if (kCoreNodes.has(neighbor)) {
                    coreNeighbors.add(neighbor);
                }
            }
            subgraph.set(node, coreNeighbors);
        }
    }

    return subgraph;
}

/**
 * Degeneracy ordering of the graph
 * Orders nodes by their coreness values
 * @param graph - Undirected graph
 * @returns Array of nodes ordered by degeneracy
 */
export function degeneracyOrdering(graph: Graph): string[] {
    const adjacencySet = graphToAdjacencySet(graph);
    const degree = new Map<string, number>();
    const remaining = new Map<string, Set<string>>();
    const ordering: string[] = [];

    // Initialize
    for (const [node, neighbors] of adjacencySet) {
        degree.set(node, neighbors.size);
        remaining.set(node, new Set(neighbors));
    }

    // Build ordering
    while (ordering.length < adjacencySet.size) {
        // Find minimum degree node
        let minDegree = Infinity;
        let minNode: string | undefined;

        for (const [node, deg] of degree) {
            if (!ordering.includes(node) && deg < minDegree) {
                minDegree = deg;
                minNode = node;
            }
        }

        if (minNode === undefined) {
            break;
        }

        ordering.push(minNode);

        // Update neighbors
        const neighbors = remaining.get(minNode);
        if (neighbors) {
            for (const neighbor of neighbors) {
                const neighborDegree = degree.get(neighbor);
                if (neighborDegree !== undefined) {
                    degree.set(neighbor, neighborDegree - 1);
                }

                remaining.get(neighbor)?.delete(minNode);
            }
        }
    }

    return ordering;
}

/**
 * Find k-truss subgraph (triangular k-cores)
 * Each edge must be part of at least k-2 triangles
 * @param graph - Undirected graph
 * @param k - Truss number (k >= 2)
 * @returns Edges in k-truss
 */
export function kTruss(graph: Graph, k: number): Set<string> {
    if (k < 2) {
        throw new Error("k must be at least 2 for k-truss");
    }

    const adjacencySet = graphToAdjacencySet(graph);

    // Count triangles for each edge
    const edgeTriangles = new Map<string, number>();
    const edges = new Set<string>();

    // Initialize edges
    for (const [u, neighbors] of adjacencySet) {
        for (const v of neighbors) {
            if (u < v) {
                // Avoid duplicates
                const edge = `${u},${v}`;
                edges.add(edge);
                edgeTriangles.set(edge, 0);
            }
        }
    }

    // Count triangles
    for (const [u, uNeighbors] of adjacencySet) {
        for (const v of uNeighbors) {
            if (u < v) {
                const vNeighbors = adjacencySet.get(v);
                if (vNeighbors) {
                    // Find common neighbors (triangles)
                    for (const w of uNeighbors) {
                        if (v < w && vNeighbors.has(w)) {
                            // Triangle found: u-v-w
                            const edge1 = `${u},${v}`;
                            const edge2 = `${u},${w}`;
                            const edge3 = `${v},${w}`;

                            const edge1Count = edgeTriangles.get(edge1);
                            const edge2Count = edgeTriangles.get(edge2);
                            const edge3Count = edgeTriangles.get(edge3);
                            if (edge1Count !== undefined) {
                                edgeTriangles.set(edge1, edge1Count + 1);
                            }

                            if (edge2Count !== undefined) {
                                edgeTriangles.set(edge2, edge2Count + 1);
                            }

                            if (edge3Count !== undefined) {
                                edgeTriangles.set(edge3, edge3Count + 1);
                            }
                        }
                    }
                }
            }
        }
    }

    // Remove edges with insufficient triangles
    const kTrussEdges = new Set<string>(edges);
    let changed = true;

    while (changed) {
        changed = false;
        const toRemove = new Set<string>();

        for (const edge of kTrussEdges) {
            const triangleCount = edgeTriangles.get(edge);
            if (triangleCount !== undefined && triangleCount < k - 2) {
                toRemove.add(edge);
                changed = true;
            }
        }

        // Remove edges and update triangle counts
        for (const edge of toRemove) {
            kTrussEdges.delete(edge);
            const parts = edge.split(",");
            if (parts.length < 2) {
                continue;
            }

            const [u, v] = parts;
            if (!u || !v) {
                continue;
            }

            // Update triangle counts for affected edges
            const uNeighbors = adjacencySet.get(u);
            const vNeighbors = adjacencySet.get(v);

            if (uNeighbors && vNeighbors) {
                for (const w of uNeighbors) {
                    if (vNeighbors.has(w)) {
                        const edge1 = u < w ? `${u},${w}` : `${w},${u}`;
                        const edge2 = v < w ? `${v},${w}` : `${w},${v}`;

                        if (kTrussEdges.has(edge1)) {
                            const edge1Count = edgeTriangles.get(edge1);
                            if (edge1Count !== undefined) {
                                edgeTriangles.set(edge1, edge1Count - 1);
                            }
                        }

                        if (kTrussEdges.has(edge2)) {
                            const edge2Count = edgeTriangles.get(edge2);
                            if (edge2Count !== undefined) {
                                edgeTriangles.set(edge2, edge2Count - 1);
                            }
                        }
                    }
                }
            }
        }
    }

    return kTrussEdges;
}

/**
 * Convert directed graph to undirected for k-core analysis
 * @param directedGraph - Directed graph represented as adjacency map with edge weights
 * @returns Undirected graph represented as adjacency map with neighbor sets
 */
export function toUndirected<T>(directedGraph: Map<T, Map<T, number>>): Map<T, Set<T>> {
    const undirected = new Map<T, Set<T>>();

    // Initialize all nodes
    for (const node of directedGraph.keys()) {
        undirected.set(node, new Set());
    }

    // Add edges in both directions
    for (const [u, neighbors] of directedGraph) {
        for (const v of neighbors.keys()) {
            const uNeighbors = undirected.get(u);
            if (uNeighbors) {
                uNeighbors.add(v);
            }

            if (!undirected.has(v)) {
                undirected.set(v, new Set());
            }

            const vNeighbors = undirected.get(v);
            if (vNeighbors) {
                vNeighbors.add(u);
            }
        }
    }

    return undirected;
}

/**
 * K-Core decomposition algorithm
 * Finds all k-cores in the graph and assigns coreness values to nodes
 * @param graph - Undirected graph. A directed graph is peeled over out-neighbours only, as it
 *   always was.
 * @returns K-core decomposition results, keyed by `String(id)` in node order
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 */
export function kCoreDecomposition(graph: Graph): KCoreResult<string> {
    // The port refuses a directed graph and does not count a self-loop as a neighbour, where the old
    // code counts one towards the node's degree; ids spelled alike are one key of the result.
    if (graph.isDirected || needsLegacyCode(graph)) {
        return legacyKCoreDecomposition(graph);
    }
    const s = toSnapshot(graph);
    if (s.flags.hasSelfLoops) {
        return legacyKCoreDecomposition(graph);
    }
    const { coreness, maxCore } = indexedKCoreDecomposition(s);
    const byNode = new Map<string, number>();
    const cores = new Map<number, Set<string>>();
    for (let u = 0; u < s.nodeCount; u++) {
        const id = String(s.ids.idOf(u));
        const k = coreness[u];
        byNode.set(id, k);
        let members = cores.get(k);
        if (members === undefined) {
            members = new Set();
            cores.set(k, members);
        }
        members.add(id);
    }
    return { cores, coreness: byNode, maxCore };
}
