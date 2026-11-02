import type { GraphImpl as BenchmarkGraphImpl, GraphMetadata } from "../../benchmark-graph";

/**
 * Generate Small-World Networks using the Watts-Strogatz model
 *
 * Creates graphs with high clustering and short average path lengths,
 * characteristic of many real-world networks like social networks.
 * @param vertices - Number of vertices
 * @param k - Initial nearest neighbors (must be even)
 * @param p - Rewiring probability (0 = regular lattice, 1 = random graph)
 */
export function generateSmallWorld(
    vertices: number,
    k: number, // Initial nearest neighbors (must be even)
    p: number, // Rewiring probability
): BenchmarkGraphImpl {
    validateSmallWorldParameters(vertices, k, p);

    const metadata: GraphMetadata = {
        generationAlgorithm: "Watts-Strogatz Small-World",
        parameters: {
            vertices,
            k,
            p,
            edges: (vertices * k) / 2, // Initial edge count
            description: `Small-world network with k=${k}, p=${p}`,
        },
    };

    const adjacencyList = emptyAdjacency(vertices);
    const edges = ringLattice(vertices, k, adjacencyList);

    // Rewire edges with probability p
    const rewiredEdges: Array<[number, number]> = [];
    // Process each edge for potential rewiring
    for (const [from, to] of edges) {
        rewiredEdges.push(Math.random() < p ? rewireEdge(from, to, vertices, adjacencyList) : [from, to]);
    }

    // Update metadata with actual edge count
    metadata.parameters.edges = rewiredEdges.length;
    metadata.parameters.rewiredCount = edges.length - edges.filter((e) => rewiredEdges.includes(e)).length;

    return {
        vertices: Array.from({ length: vertices }, (_, i) => i),
        edges: rewiredEdges,
        adjacencyList,
        metadata,
        directed: false,
        weighted: false,
    };
}

function validateSmallWorldParameters(vertices: number, k: number, p: number): void {
    if (k % 2 !== 0) {
        throw new Error("k must be even");
    }
    if (k >= vertices) {
        throw new Error(`k (${k}) must be less than vertices (${vertices})`);
    }
    if (p < 0 || p > 1) {
        throw new Error(`Rewiring probability must be between 0 and 1, got ${p}`);
    }
}

function emptyAdjacency(vertices: number): Record<number, number[]> {
    const adjacencyList: Record<number, number[]> = {};
    for (let i = 0; i < vertices; i++) {
        adjacencyList[i] = [];
    }
    return adjacencyList;
}

/**
 * Create the initial ring lattice: each vertex connects to k/2 neighbors on each side.
 * @param vertices - Number of vertices
 * @param k - Initial nearest neighbors
 * @param adjacencyList - Filled with both directions of every edge
 * @returns The lattice edges, each added once
 */
function ringLattice(vertices: number, k: number, adjacencyList: Record<number, number[]>): Array<[number, number]> {
    const edges: Array<[number, number]> = [];
    for (let i = 0; i < vertices; i++) {
        for (let j = 1; j <= k / 2; j++) {
            const neighbor = (i + j) % vertices;
            // Only add edge once (from smaller to larger index)
            if (i < neighbor || (neighbor < i && neighbor < k / 2)) {
                edges.push([i, neighbor]);
                adjacencyList[i].push(neighbor);
                adjacencyList[neighbor].push(i);
            }
        }
    }
    return edges;
}

/**
 * Rewire one edge to a new target not already connected to `from`, or keep it when none is found.
 * @param from - Edge source
 * @param to - Edge target
 * @param vertices - Number of vertices
 * @param adjacencyList - Updated when the edge is rewired
 * @returns The edge after rewiring
 */
function rewireEdge(
    from: number,
    to: number,
    vertices: number,
    adjacencyList: Record<number, number[]>,
): [number, number] {
    let newTarget: number;
    let attempts = 0;
    const maxAttempts = vertices;

    do {
        newTarget = Math.floor(Math.random() * vertices);
        attempts++;
    } while (
        (newTarget === from || adjacencyList[from].includes(newTarget) || newTarget === to) &&
        attempts < maxAttempts
    );

    if (attempts >= maxAttempts) {
        // Keep original edge if we couldn't find a valid rewiring
        return [from, to];
    }

    // Remove old edge from adjacency list
    adjacencyList[from] = adjacencyList[from].filter((v) => v !== to);
    adjacencyList[to] = adjacencyList[to].filter((v) => v !== from);

    // Add new edge
    adjacencyList[from].push(newTarget);
    adjacencyList[newTarget].push(from);
    return [from, newTarget];
}

/**
 * Generate Small-World graph suitable for benchmarking
 * Uses parameters that create good small-world properties
 * @param vertices
 */
export function generateSmallWorldBenchmark(vertices: number): BenchmarkGraphImpl {
    // Choose k based on graph size
    // For smaller graphs, use smaller k to avoid overly dense graphs
    let k: number;
    if (vertices < 100) {
        k = Math.min(4, Math.floor(vertices / 10) * 2); // Ensure even
    } else if (vertices < 1000) {
        k = 6;
    } else if (vertices < 10000) {
        k = 10;
    } else {
        k = 20;
    }

    // Ensure k is even and reasonable
    k = Math.max(2, Math.min(k, Math.floor(vertices / 10)));
    if (k % 2 !== 0) {
        k--;
    }

    // Use rewiring probability of 0.1 (good small-world properties)
    const p = 0.1;

    return generateSmallWorld(vertices, k, p);
}

/**
 * Generate Newman-Watts Small-World variant
 * Instead of rewiring, adds shortcuts (preserves connectivity)
 * @param vertices
 * @param k
 * @param p
 */
export function generateNewmanWatts(vertices: number, k: number, p: number): BenchmarkGraphImpl {
    if (k % 2 !== 0) {
        throw new Error("k must be even");
    }

    const metadata: GraphMetadata = {
        generationAlgorithm: "Newman-Watts Small-World",
        parameters: {
            vertices,
            k,
            p,
            edges: 0, // Will be updated
            description: `Newman-Watts variant with k=${k}, p=${p}`,
        },
    };

    const adjacencyList = emptyAdjacency(vertices);
    const edgeSet = new Set<string>();
    const edges = uniqueRingLattice(vertices, k, adjacencyList, edgeSet);
    const shortcuts = randomShortcuts(vertices, p, adjacencyList, edgeSet);

    // Combine all edges
    const allEdges = [...edges, ...shortcuts];

    metadata.parameters.edges = allEdges.length;
    metadata.parameters.shortcuts = shortcuts.length;

    return {
        vertices: Array.from({ length: vertices }, (_, i) => i),
        edges: allEdges,
        adjacencyList,
        metadata,
        directed: false,
        weighted: false,
    };
}

function uniqueRingLattice(
    vertices: number,
    k: number,
    adjacencyList: Record<number, number[]>,
    edgeSet: Set<string>,
): Array<[number, number]> {
    const edges: Array<[number, number]> = [];
    for (let i = 0; i < vertices; i++) {
        for (let j = 1; j <= k / 2; j++) {
            const neighbor = (i + j) % vertices;
            const key = i < neighbor ? `${i}-${neighbor}` : `${neighbor}-${i}`;

            if (!edgeSet.has(key)) {
                edgeSet.add(key);
                edges.push([i, neighbor]);
                adjacencyList[i].push(neighbor);
                adjacencyList[neighbor].push(i);
            }
        }
    }
    return edges;
}

/**
 * Add a shortcut for each vertex pair with probability p, skipping pairs already joined.
 * @param vertices - Number of vertices
 * @param p - Shortcut probability per pair
 * @param adjacencyList - Filled with both directions of every shortcut
 * @param edgeSet - Keys of the edges already present
 * @returns The shortcuts added
 */
function randomShortcuts(
    vertices: number,
    p: number,
    adjacencyList: Record<number, number[]>,
    edgeSet: Set<string>,
): Array<[number, number]> {
    const shortcuts: Array<[number, number]> = [];
    for (let i = 0; i < vertices; i++) {
        for (let j = i + 1; j < vertices; j++) {
            if (Math.random() < p) {
                // Check if edge already exists
                const key = `${i}-${j}`;
                if (!edgeSet.has(key)) {
                    edgeSet.add(key);
                    shortcuts.push([i, j]);
                    adjacencyList[i].push(j);
                    adjacencyList[j].push(i);
                }
            }
        }
    }
    return shortcuts;
}
