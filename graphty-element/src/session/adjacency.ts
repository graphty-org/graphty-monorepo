/**
 * @file The one walk of a node's adjacency that the Neighborhood selection and
 * `session.data.neighbors` both read, so the two cannot disagree on what a neighbor is.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { SelectionDirection } from "../catalog/types";

/**
 * Visit every arc at one node along a direction.
 *
 * An undirected snapshot holds both orientations of every edge in its forward adjacency, so it is
 * walked forwards whichever direction was asked for: walking its reverse as well would visit each
 * edge twice. On a directed snapshot an edge appears once in its source's forward row and once in
 * its target's reverse row, so `"all"` visits each edge at the node once (a self-loop twice).
 * @param graph - The snapshot.
 * @param node - The node's row.
 * @param direction - Which way to follow an edge.
 * @param visit - Called with the row at the other end and the edge's row.
 */
export function eachAdjacentArc(
    graph: GraphSnapshot,
    node: number,
    direction: SelectionDirection,
    visit: (other: number, edge: number) => void,
): void {
    if (direction !== "in" || !graph.directed) {
        for (let arc = graph.rowPtr[node]; arc < graph.rowPtr[node + 1]; arc++) {
            visit(graph.colIdx[arc], graph.arcToEdge[arc]);
        }
    }

    if (graph.directed && direction !== "out") {
        const reverse = graph.reverse();
        for (let arc = reverse.rowPtr[node]; arc < reverse.rowPtr[node + 1]; arc++) {
            visit(reverse.colIdx[arc], reverse.arcToEdge[arc]);
        }
    }
}
