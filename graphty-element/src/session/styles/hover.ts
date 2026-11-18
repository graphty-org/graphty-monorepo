/**
 * The hovered node's neighborhood, as a `{ match: "hover" }` style layer reads it: the node, its
 * neighbors and the edges that touch it, by dense index over the snapshot the session holds now.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { AdjacencyView, GraphSnapshot } from "@graphty/graph-format";

import type { LiveHover } from "./predicate";

/**
 * Marks one node's row of an adjacency: the far end and the edge of each of its arcs.
 * @param adjacency - The forward or reverse adjacency.
 * @param node - The node's dense index.
 * @param hover - The neighborhood being filled.
 */
function markRow(adjacency: AdjacencyView, node: number, hover: LiveHover): void {
    const { rowPtr, colIdx, arcToEdge } = adjacency;
    for (let arc = rowPtr[node]; arc < rowPtr[node + 1]; arc++) {
        hover.neighbors[colIdx[arc]] = 1;
        hover.edges[arcToEdge[arc]] = 1;
    }
}

/**
 * The neighborhood of one node: its own row, plus its row in the reverse adjacency when the graph
 * is directed so in-neighbors count as well as out-neighbors. O(degree), not a whole-graph pass.
 * @param graph - The snapshot.
 * @param node - The node's dense index.
 * @returns The node, its neighbors and the edges that touch it.
 */
function hoverNeighborhood(graph: GraphSnapshot, node: number): LiveHover {
    const hover: LiveHover = {
        node,
        neighbors: new Uint8Array(graph.nodeCount),
        edges: new Uint8Array(graph.edgeCount),
    };
    hover.neighbors[node] = 1;
    markRow(graph, node, hover);
    if (graph.directed) {
        markRow(graph.reverse(), node, hover);
    }

    return hover;
}

/**
 * The hover state a session's style layers read: the neighborhood of the hovered node, computed
 * once per node and snapshot.
 * @param snapshot - The snapshot the session holds now.
 * @param hoveredIndex - The hovered node's dense index now, or undefined.
 * @returns The reader.
 */
export function createHoverSource(
    snapshot: () => GraphSnapshot,
    hoveredIndex: () => number | undefined,
): () => LiveHover | null {
    let cached: { graph: GraphSnapshot; hover: LiveHover } | null = null;

    return () => {
        const index = hoveredIndex();
        if (index === undefined) {
            return null;
        }

        const graph = snapshot();
        if (cached?.graph !== graph || cached.hover.node !== index) {
            cached = { graph, hover: hoverNeighborhood(graph, index) };
        }

        return cached.hover;
    };
}
