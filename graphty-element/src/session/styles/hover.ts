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

/**
 * Collect the rows a `{ match: "hover" }` layer can paint differently when one node gains or loses
 * the pointer: the node, its neighbors and the edges that touch it, as {@link hoverNeighborhood}
 * marks them. O(degree).
 * @param graph - The snapshot.
 * @param node - The node's dense index.
 * @param rows - The node and edge rows collected so far, added to.
 * @param rows.node - Node rows.
 * @param rows.edge - Edge rows.
 */
function collectHoverRows(
    graph: GraphSnapshot,
    node: number,
    rows: { readonly node: Set<number>; readonly edge: Set<number> },
): void {
    rows.node.add(node);
    const adjacencies: AdjacencyView[] = graph.directed ? [graph, graph.reverse()] : [graph];
    for (const { rowPtr, colIdx, arcToEdge } of adjacencies) {
        for (let arc = rowPtr[node]; arc < rowPtr[node + 1]; arc++) {
            rows.node.add(colIdx[arc]);
            rows.edge.add(arcToEdge[arc]);
        }
    }
}

/** The nodes the hover layers follow, by row: the hovered one, and the hovered else a lone selected one. */
export interface HoverFollowed {
    readonly hovered?: number;
    readonly focus?: number;
}

/**
 * The rows the `{ match: "hover" }` layers can paint differently after the followed nodes moved:
 * the old and new node's neighborhoods, for each layer whose followed node moved.
 * @param graph - The snapshot both readings are by.
 * @param selectors - The hover layers' selectors.
 * @param before - What they were last repainted from.
 * @param now - What they follow now.
 * @returns The rows, or null when every element must be repainted (an inverted layer turned on or off).
 */
export function hoverRowsToRepaint(
    graph: GraphSnapshot,
    selectors: readonly { readonly invert?: boolean; readonly orSelected?: boolean }[],
    before: HoverFollowed,
    now: HoverFollowed,
): { node: number[]; edge: number[] } | null {
    const rows = { node: new Set<number>(), edge: new Set<number>() };
    for (const selector of selectors) {
        const followed = selector.orSelected === true ? "focus" : "hovered";
        const was = before[followed];
        const is = now[followed];
        if (was === is) {
            continue;
        }

        if (selector.invert === true && (was === undefined || is === undefined)) {
            return null;
        }

        for (const at of [was, is]) {
            if (at !== undefined) {
                collectHoverRows(graph, at, rows);
            }
        }
    }

    return { node: [...rows.node], edge: [...rows.edge] };
}
