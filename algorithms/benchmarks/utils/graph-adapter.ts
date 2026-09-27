import { Graph } from "../../src/core/graph";
import type { GraphImpl } from "../benchmark-graph";

/**
 * Converts our benchmark GraphImpl to the library's Graph format
 * @param benchmarkGraph
 */
export function convertToLibraryGraph(benchmarkGraph: GraphImpl): Graph {
    const graph = new Graph({ directed: benchmarkGraph.directed });

    // Add all vertices, isolated ones included
    for (const vertex of benchmarkGraph.vertices) {
        graph.addNode(vertex);
    }

    // Add all edges
    for (const [from, to, weight] of benchmarkGraph.edges) {
        graph.addEdge(from, to, weight);
    }

    return graph;
}
