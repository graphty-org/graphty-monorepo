/**
 * The k-core decomposition as it was before `kCoreDecomposition` delegated to
 * `indexed.kCoreDecomposition`, unchanged. The facade in `k-core.ts` still calls it for the graphs
 * the port cannot answer the same way (a directed graph, a self-loop, a NaN weight, ids spelled alike), its facade
 * test uses it as the oracle, and the other k-core functions read the graph through
 * `graphToAdjacencySet`.
 */

import type { Graph } from "../core/graph.js";

/**
 * Convert Graph to adjacency set representation
 * @param graph - The input graph to convert
 * @returns Map of node IDs to sets of neighbor node IDs
 */
export function graphToAdjacencySet(graph: Graph): Map<string, Set<string>> {
    const adjacency = new Map<string, Set<string>>();

    // Initialize all nodes
    for (const node of graph.nodes()) {
        adjacency.set(String(node.id), new Set());
    }

    // Add edges
    for (const edge of graph.edges()) {
        const source = String(edge.source);
        const target = String(edge.target);

        const sourceSet = adjacency.get(source);
        if (sourceSet) {
            sourceSet.add(target);
        }

        // For undirected graphs, add reverse edge
        if (!graph.isDirected) {
            const targetSet = adjacency.get(target);
            if (targetSet) {
                targetSet.add(source);
            }
        }
    }

    return adjacency;
}

export interface KCoreResult<T> {
    cores: Map<number, Set<T>>;
    coreness: Map<T, number>;
    maxCore: number;
}

/**
 * Internal implementation of K-Core decomposition algorithm
 * @param graph - Adjacency map representation of the graph
 * @returns K-core decomposition result with cores, coreness values, and maximum core number
 */
function kCoreDecompositionImpl<T>(graph: Map<T, Set<T>>): KCoreResult<T> {
    if (graph.size === 0) {
        return { cores: new Map(), coreness: new Map(), maxCore: 0 };
    }

    const n = graph.size;
    const nodes = Array.from(graph.keys());
    const nodeToIndex = new Map<T, number>();
    nodes.forEach((node, i) => nodeToIndex.set(node, i));

    // Initialize data structures
    const degree = new Array<number>(n).fill(0);
    const pos = new Array<number>(n).fill(0);
    const vert = new Array<number>(n).fill(0);
    const coreness = new Map<T, number>();

    // Initialize coreness for all nodes to 0
    for (let i = 0; i < n; i++) {
        const node = nodes[i];
        if (node !== undefined) {
            coreness.set(node, 0);
        }
    }

    // Compute initial degrees
    let maxDegree = 0;
    for (let i = 0; i < n; i++) {
        const node = nodes[i];
        if (!node) {
            continue;
        }

        const neighbors = graph.get(node);
        const nodeSize = neighbors ? neighbors.size : 0;

        degree[i] = nodeSize;
        maxDegree = Math.max(maxDegree, nodeSize);
    }

    // Count nodes of each degree
    const bin = new Array<number>(maxDegree + 1).fill(0);
    for (let i = 0; i < n; i++) {
        const deg = degree[i];
        if (deg !== undefined && deg >= 0 && deg < bin.length) {
            const currentCount = bin[deg];
            if (currentCount !== undefined) {
                bin[deg] = currentCount + 1;
            }
        }
    }

    // Starting position of each degree in sorted array
    let start = 0;
    for (let d = 0; d <= maxDegree; d++) {
        const temp = bin[d] ?? 0;
        bin[d] = start;
        start += temp;
    }

    // Sort nodes by degree
    for (let i = 0; i < n; i++) {
        const deg = degree[i];
        if (deg !== undefined && deg >= 0 && deg < bin.length) {
            const posIndex = bin[deg] ?? 0;
            pos[i] = posIndex;
            vert[posIndex] = i;
            const currentBin = bin[deg];
            if (currentBin !== undefined) {
                bin[deg] = currentBin + 1;
            }
        } else {
            // If we can't properly place the node in vert, set its position to -1
            // This shouldn't happen with our fixes, but just in case
            pos[i] = -1;
        }
    }

    // Recover starting positions
    for (let d = maxDegree; d > 0; d--) {
        bin[d] = bin[d - 1] ?? 0;
    }
    bin[0] = 0;

    // Main algorithm
    for (let i = 0; i < n; i++) {
        const v = vert[i];
        if (v === undefined) {
            continue;
        }

        const node = nodes[v];
        if (node === undefined) {
            continue;
        }

        const degreeV = degree[v];
        if (degreeV !== undefined) {
            coreness.set(node, degreeV);
        }

        // Process neighbors
        const neighbors = graph.get(node);
        if (!neighbors) {
            // Node has no neighbors, skip neighbor processing but coreness is already set
            continue;
        }

        for (const neighbor of neighbors) {
            const u = nodeToIndex.get(neighbor);
            if (u === undefined) {
                continue;
            }

            const degreeU = degree[u];
            const degreeV = degree[v];
            if (degreeU !== undefined && degreeV !== undefined && degreeU > degreeV) {
                const du = degreeU;
                const pu = pos[u];
                const pw = bin[du] ?? 0;
                const w = vert[pw];

                if (u !== w && w !== undefined && pw < n && pu !== undefined) {
                    // Swap u and w in the sorted order
                    vert[pu] = w;
                    vert[pw] = u;
                    pos[u] = pw;
                    pos[w] = pu;
                }

                const currentBin = bin[du];
                if (currentBin !== undefined) {
                    bin[du] = currentBin + 1;
                }

                degree[u] = degreeU - 1;
            }
        }
    }

    // Build cores map
    const cores = new Map<number, Set<T>>();
    let maxCore = 0;

    for (const [node, core] of coreness) {
        if (!cores.has(core)) {
            cores.set(core, new Set());
        }

        const coreSet = cores.get(core);
        if (coreSet) {
            coreSet.add(node);
        }

        maxCore = Math.max(maxCore, core);
    }

    return { cores, coreness, maxCore };
}

/**
 * K-Core decomposition algorithm
 * Finds all k-cores in the graph and assigns coreness values to nodes
 * @param graph - Undirected graph - accepts Graph class or Map<T, Set<T>>
 * @returns K-core decomposition results
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 */
export function kCoreDecomposition(graph: Graph): KCoreResult<string> {
    // Convert Graph to adjacency set representation
    const adjacencySet = graphToAdjacencySet(graph);
    return kCoreDecompositionImpl(adjacencySet);
}
