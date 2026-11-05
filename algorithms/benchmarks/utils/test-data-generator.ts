import { erdosRenyiGnmGraph } from "@graphty/graph-samples/generators";

import type { GraphImpl as BenchmarkGraphImpl, GraphMetadata as BenchmarkGraphMetadata } from "../benchmark-graph";

/**
 * The seed of every random benchmark graph: a fixed seed builds the same graph on every run, so a change in a
 * benchmark's time means the code changed, not the graph.
 */
export const BENCHMARK_SEED = 1;

/**
 * Erdos-Renyi G(n, m): `edges` distinct undirected edges (at most every pair) among `vertices` vertices, drawn by
 * graph-samples' seeded generator.
 * @param vertices - The number of vertices
 * @param edges - The number of edges
 * @returns The graph
 */
function generateRandomGraphFixed(vertices: number, edges: number): BenchmarkGraphImpl {
    // a graph with fewer vertex pairs than `edges` is the complete graph
    const m = Math.min(edges, (vertices * (vertices - 1)) / 2);
    const sample = erdosRenyiGnmGraph({ n: vertices, m, seed: BENCHMARK_SEED });
    const adjacencyList: Map<number, Set<number>> = new Map();
    for (let i = 0; i < vertices; i++) {
        adjacencyList.set(i, new Set());
    }
    const edgeList: Array<[number, number]> = [];
    for (let e = 0; e < sample.src.length; e++) {
        const from = sample.src[e];
        const to = sample.dst[e];
        adjacencyList.get(from)?.add(to);
        adjacencyList.get(to)?.add(from);
        edgeList.push([from, to]);
    }

    const metadata: BenchmarkGraphMetadata = {
        generationAlgorithm: "Erdős–Rényi Random Graph (Fixed Edges)",
        parameters: {
            vertices,
            edges: edgeList.length,
            targetEdges: edges,
            actualEdges: edgeList.length,
            seed: BENCHMARK_SEED,
        },
    };

    return {
        vertices: Array.from({ length: vertices }, (_, i) => i),
        edges: edgeList,
        adjacencyList,
        metadata,
        directed: false,
        weighted: false,
    };
}

export const generateTestGraphs = {
    // Sparse graph: ~4-8 edges per vertex
    sparse(vertices: number): BenchmarkGraphImpl {
        const avgDegree = 6;
        const edges = Math.floor((vertices * avgDegree) / 2);
        const graph = generateRandomGraphFixed(vertices, edges);
        // Add additional metadata about the sparseness
        if (graph.metadata) {
            graph.metadata.parameters = {
                ...graph.metadata.parameters,
                type: "sparse",
                averageDegree: avgDegree,
            };
        }
        return graph;
    },

    // Dense graph: ~20-40% of all possible edges
    dense(vertices: number): BenchmarkGraphImpl {
        const maxEdges = (vertices * (vertices - 1)) / 2;
        const edges = Math.floor(maxEdges * 0.3); // 30% density
        const graph = generateRandomGraphFixed(vertices, edges);
        if (graph.metadata) {
            graph.metadata.parameters = {
                ...graph.metadata.parameters,
                type: "dense",
                density: edges / maxEdges,
            };
        }
        return graph;
    },

    // Grid graph: vertices arranged in a square grid
    grid(size: number): BenchmarkGraphImpl {
        const vertices = size * size;
        const adjacencyList: Map<number, Set<number>> = new Map();
        const edges: Array<[number, number]> = [];

        // Initialize vertices
        for (let i = 0; i < vertices; i++) {
            adjacencyList.set(i, new Set());
        }

        // Create grid connections
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const current = row * size + col;

                // Connect to right neighbor
                if (col < size - 1) {
                    const right = current + 1;
                    adjacencyList.get(current)?.add(right);
                    adjacencyList.get(right)?.add(current);
                    edges.push([current, right]);
                }

                // Connect to bottom neighbor
                if (row < size - 1) {
                    const bottom = current + size;
                    adjacencyList.get(current)?.add(bottom);
                    adjacencyList.get(bottom)?.add(current);
                    edges.push([current, bottom]);
                }
            }
        }

        const metadata: BenchmarkGraphMetadata = {
            generationAlgorithm: "Grid Graph",
            parameters: {
                gridSize: size,
                vertices,
                edges: edges.length,
            },
        };

        return {
            vertices: Array.from({ length: vertices }, (_, i) => i),
            edges,
            adjacencyList,
            metadata,
            directed: false,
            weighted: false,
        };
    },

    // Complete graph: All vertices connected (for small tests)
    complete(vertices: number): BenchmarkGraphImpl {
        if (vertices > 1000) {
            throw new Error("Complete graphs limited to 1000 vertices for memory reasons");
        }

        const adjacencyList: Map<number, Set<number>> = new Map();
        const edges: Array<[number, number]> = [];

        // Initialize vertices
        for (let i = 0; i < vertices; i++) {
            adjacencyList.set(i, new Set());
        }

        // Connect all pairs
        for (let i = 0; i < vertices; i++) {
            for (let j = i + 1; j < vertices; j++) {
                adjacencyList.get(i)?.add(j);
                adjacencyList.get(j)?.add(i);
                edges.push([i, j]);
            }
        }

        const metadata: BenchmarkGraphMetadata = {
            generationAlgorithm: "Complete Graph (K_n)",
            parameters: {
                vertices,
                edges: edges.length,
                description: `K_${vertices} - all vertices connected`,
            },
        };

        return {
            vertices: Array.from({ length: vertices }, (_, i) => i),
            edges,
            adjacencyList,
            metadata,
            directed: false,
            weighted: false,
        };
    },
};
