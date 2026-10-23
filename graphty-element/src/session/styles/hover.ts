/**
 * The hovered node's neighborhood, as a `{ match: "hover" }` style layer reads it: the node, its
 * neighbors and the edges that touch it, by dense index over the snapshot the session holds now.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { LiveHover } from "./predicate";

/**
 * The neighborhood of one node: one pass over the arcs, so a directed graph's in-neighbors count
 * as well as its out-neighbors.
 * @param graph - The snapshot.
 * @param node - The node's dense index.
 * @returns The node, its neighbors and the edges that touch it.
 */
export function hoverNeighborhood(graph: GraphSnapshot, node: number): LiveHover {
    const neighbors = new Uint8Array(graph.nodeCount);
    const edges = new Uint8Array(graph.edgeCount);
    const { rowPtr, colIdx, arcToEdge } = graph;
    neighbors[node] = 1;
    for (let from = 0; from < graph.nodeCount; from++) {
        for (let arc = rowPtr[from]; arc < rowPtr[from + 1]; arc++) {
            const to = colIdx[arc];
            if (from === node || to === node) {
                neighbors[from] = 1;
                neighbors[to] = 1;
                edges[arcToEdge[arc]] = 1;
            }
        }
    }

    return { node, neighbors, edges };
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
