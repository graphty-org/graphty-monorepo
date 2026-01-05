/**
 * Main planarity checking function
 */

import { Edge, Embedding,Graph, Node } from "../../types";
import { createTriangulationEmbedding } from "./embedding";
import { lrPlanarityTest } from "./lr-test";
import { isK5, isK33 } from "./special-graphs";

/**
 * Check if graph is planar using a simplified version of Boyer-Myrvold algorithm.
 * Returns planarity and embedding information.
 * @param _G - Graph (reserved for future use)
 * @param nodes - List of nodes
 * @param edges - List of edges
 * @param seed - Random seed for deterministic embedding generation
 * @returns Object containing isPlanar flag and embedding
 */
export function checkPlanarity(
    _G: Graph,
    nodes: Node[],
    edges: Edge[],
    seed: number | null = null,
): { isPlanar: boolean; embedding: Embedding | null } {
    // For small graphs (n <= 4), all are planar
    if (nodes.length <= 4) {
        return { isPlanar: true, embedding: createTriangulationEmbedding(nodes, edges, seed) };
    }

    // For K5 (complete graph with 5 nodes) and K3,3 (complete bipartite with 3,3 nodes)
    // these are not planar by Kuratowski's theorem
    if (isK5(nodes, edges) || isK33(nodes, edges)) {
        return { isPlanar: false, embedding: null };
    }

    // For other graphs, use LR algorithm (Left-Right Planarity Test)
    const result = lrPlanarityTest(nodes, edges, seed);
    return result;
}
