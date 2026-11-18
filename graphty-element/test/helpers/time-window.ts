/**
 * @file What lies inside a time window, as the timeline reads it. With the timeline on, a window
 * never narrows what is visible (`visibility.nodeMask()`, `summary`): it only puts what lies outside
 * it in the `outsideWindow` state. Tests of which elements a window keeps read these instead.
 */

import type { GraphSession } from "../../src/session/types";
import type { SessionVisibilityApi, VisibilityApi } from "../../src/session/visibility/VisibilityApi";

/**
 * The session's visibility model, with the masks a window moves.
 * @param visibility - `session.visibility`.
 * @returns The same object.
 */
function model(visibility: VisibilityApi): SessionVisibilityApi {
    return visibility as SessionVisibilityApi;
}

/**
 * One byte per node, 1 for a node every filter keeps inside the window.
 * @param visibility - `session.visibility`.
 * @returns The bytes.
 */
export function windowNodes(visibility: VisibilityApi): Uint8Array {
    return model(visibility).windowMasks().nodes;
}

/**
 * One byte per edge, 1 for an edge every filter keeps inside the window.
 * @param visibility - `session.visibility`.
 * @returns The bytes.
 */
export function windowEdges(visibility: VisibilityApi): Uint8Array {
    return model(visibility).windowMasks().edges;
}

/**
 * How many nodes and edges every filter keeps inside the window.
 * @param visibility - `session.visibility`.
 * @returns The counts.
 */
export function windowCount(visibility: VisibilityApi): { readonly nodes: number; readonly edges: number } {
    return model(visibility).windowCounts();
}

/**
 * The ids of the nodes every filter keeps inside the window, as text.
 * @param session - The session.
 * @returns The ids, in row order.
 */
export function windowNodeIds(session: GraphSession): string[] {
    const graph = session.data.snapshot();
    const bytes = windowNodes(session.visibility);
    return Array.from({ length: graph.nodeCount }, (_, row) => row)
        .filter((row) => bytes[row] === 1)
        .map((row) => String(graph.ids.idOf(row)));
}
