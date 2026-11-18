import type { GraphSession } from "@graphty/graphty-element/session";

/**
 * Why the canvas tools cannot run: nothing is drawn until the element holds a node.
 * @param session - the element's session, or null.
 * @returns "Nothing is drawn", or null when there is a graph.
 */
export function nothingDrawn(session: GraphSession | null): string | null {
    return session === null || session.data.statistics().nodeCount === 0 ? "Nothing is drawn" : null;
}

/**
 * Why Filters cannot open: there is no graph at all. A filter that hides every node leaves the
 * graph, and Filters is the way back to it.
 * @param session - the element's session, or null.
 * @returns "No data yet", or null when the graph holds a node.
 */
export function noGraph(session: GraphSession | null): string | null {
    return session === null || session.data.statistics({ scope: "all" }).nodeCount === 0 ? "No data yet" : null;
}
