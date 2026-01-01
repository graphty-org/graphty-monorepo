import type { Edge, Graph, Node, PositionMap } from "../../types";
import { getNeighbors,getNodesFromGraph } from "../../utils/graph";
import { _processParams } from "../../utils/params";
import { multipartiteLayout } from "./multipartite";

/**
 * Position nodes according to breadth-first search algorithm.
 * @param G - Graph
 * @param start - Starting node for bfs
 * @param align - The alignment of layers: 'vertical' or 'horizontal'
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @returns Positions dictionary keyed by node
 */
export function bfsLayout(
    G: Graph,
    start: Node,
    align: "vertical" | "horizontal" = "vertical",
    scale: number = 1,
    center: number[] | null = null,
): PositionMap {
    const processed = _processParams(G, center || [0, 0], 2);

    // BFS layout requires a proper Graph, not just a list of nodes
    if (Array.isArray(processed.G)) {
        throw new Error("BFS layout requires a Graph with edges, not just a list of nodes");
    }

    const graph = processed.G;
    center = processed.center;

    const allNodes = getNodesFromGraph(graph);

    if (allNodes.length === 0) {
        return {};
    }

    // Compute BFS layers
    const layers: Record<number, Node[]> = {};
    const visited = new Set<Node>();
    let currentLayer = 0;

    // Starting layer
    layers[currentLayer] = [start];
    visited.add(start);

    // BFS traversal
    while (Object.values(layers).flat().length < allNodes.length) {
        const nextLayer: Node[] = [];
        const currentNodes = layers[currentLayer];

        for (const node of currentNodes) {
            // Get neighbors - this is a simplified approach
            // In a real implementation, we would get neighbors from the graph
            const neighbors = getNeighbors(graph, node);

            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    nextLayer.push(neighbor);
                    visited.add(neighbor);
                }
            }
        }

        if (nextLayer.length === 0) {
            // No more connected nodes
            const unvisited: Node[] = allNodes.filter((node: Node) => !visited.has(node));
            if (unvisited.length > 0) {
                throw new Error("bfs_layout didn't include all nodes. Graph may be disconnected.");
            }
            break;
        }

        currentLayer++;
        layers[currentLayer] = nextLayer;
    }

    // Use multipartite_layout to position the layers
    return multipartiteLayout(graph, layers, align, scale, center);
}
