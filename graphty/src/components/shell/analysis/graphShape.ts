/**
 * The graph's shape, as the shell READS IT OFF graphty-element.
 *
 * Nothing here walks a node or an edge any more. The element publishes the whole of it --
 * `session.data.statistics()` returns node and edge counts, density, directedness,
 * whether the weights carry information, self loops, repeated edges, the degree range and
 * the connected-component shape -- computed once while it walks its own snapshot and
 * cached against that snapshot, so the first reader after a change pays for the walk and
 * every later reader in the same revision reads a field.
 *
 * WHAT LEFT, and why none of it should have been here. This module used to hold a
 * disjoint-set forest, a pass that unioned every edge record, and a per-edge vote on
 * direction, all of it over the records `handle.getData()` hands back -- a second copy of
 * a graph the element was already holding, measured a second time by code that could not
 * see the graph that was actually frozen, drawn and run over. Two of its answers were
 * wrong because of that, and both are recorded below under "where the element disagreed".
 *
 * WHAT STAYS, and why it is not element work. {@link edgeEndpointId} and
 * {@link edgeEndpoints} read an ENDPOINT OFF AN APP RECORD: the `{...edge.data, id,
 * source, target}` bag `Graphty.tsx` builds for the data table and the node inspector.
 * That is a fact about the app's own record shape rather than about the graph, and the
 * inspector's neighbour list is its only remaining caller -- it is here rather than in
 * the element because the element's data surface still publishes no neighbour verb.
 *
 * WHERE THE ELEMENT DISAGREED WITH THE PASS THIS REPLACES, and which answer won:
 *
 * - DIRECTEDNESS. The pass read a per-edge `directed` key and answered "unknown" unless
 *   every edge record agreed, which on every format but Pajek and yEd GraphML meant
 *   always: its own comment said so. The element answers from the flag the snapshot is
 *   frozen with, which is the direction every run, every layout and every degree actually
 *   uses. The element wins, and it is not close -- the pass was answering "did the file
 *   state a direction?" while every surface reading it was asking "is this graph
 *   directed?". The cost of the old answer was silent: rule 3 of the Insights table fires
 *   on a measured "directed", so the Influence card was never once offered.
 *
 *   What is lost with the per-edge vote is PROVENANCE. The element says what the graph is,
 *   not whether the format said so or the element's own default settled it, so the shell
 *   can no longer write "Directed (from file)" -- and does not.
 *
 * - PARALLEL EDGES. The pass counted repeats of an ORDERED endpoint pair unless the
 *   records said undirected, so on an undirected graph loaded from a format that does not
 *   write the key -- which is nearly all of them -- A-B and B-A counted as two distinct
 *   edges rather than one repeated one. The element counts a repeat against the direction
 *   the graph is frozen with, which is the only reading that can be right. The element
 *   wins.
 *
 * - COMPONENTS AND COUNTS. The pass unioned only edges whose BOTH endpoints appeared in
 *   the node records, so an edge naming a node no record declared unioned nothing and the
 *   two ends stayed in separate parts. The element counts the graph it actually froze.
 *   The element wins; the numbers agree wherever the records were complete, which is every
 *   fixture the shell ships.
 *
 * App shell progressive disclosure design, section 7 "Novice path" (7.3 Insights strip,
 * 7.5 Plain-language readings).
 */

import type { ComponentStatistics, GraphSession, GraphStatistics, NodeId } from "@graphty/graphty-element/session";

/**
 * The component shape of a graph that is not there: no parts, nothing in them, and no
 * node to answer for.
 */
const NO_COMPONENTS: ComponentStatistics = {
    count: 0,
    sizes: [],
    largestSize: 0,
    isolatedCount: 0,
    truncatedSizes: false,
    componentOf: (_id: NodeId) => undefined,
};

/**
 * What the shell reports before the element has come up, and after it has gone.
 *
 * Every count zero and nothing claimed about direction, which is the same answer the
 * element itself gives for a graph it has been told nothing about. It is a value rather
 * than a null so that every surface downstream draws its empty form from the same fields
 * it draws a loaded graph from, instead of each one branching on absence.
 * @public
 */
export const EMPTY_GRAPH_STATISTICS: GraphStatistics = {
    nodeCount: 0,
    edgeCount: 0,
    density: 0,
    directedness: "unknown",
    directednessSource: { by: "unsettled", statedBy: null },
    weighted: false,
    selfLoopCount: 0,
    repeatedEdgeCount: 0,
    degreeRange: [0, 0],
    meanDegree: 0,
    components: NO_COMPONENTS,
};

/**
 * The graph's shape, from the element.
 *
 * The read is synchronous and cached against the snapshot, so a caller may ask on every
 * data event without measuring anything twice.
 *
 * A disposed session is the one case that throws rather than answering: the element has
 * been torn down, so there is no graph to describe and {@link EMPTY_GRAPH_STATISTICS} is
 * the honest report. It is logged rather than swallowed, because a live shell asking a
 * disposed session is a lifecycle bug somewhere above this line.
 * @param session - the element's session, or null while the element is still coming up.
 * @returns the statistics, or the empty shape when there is no session to ask.
 * @public
 */
export function readGraphStatistics(session: GraphSession | null): GraphStatistics {
    if (session === null) {
        return EMPTY_GRAPH_STATISTICS;
    }

    try {
        return session.data.statistics();
    } catch (error: unknown) {
        console.error("[shell] the element could not report the graph's shape:", error);

        return EMPTY_GRAPH_STATISTICS;
    }
}

/**
 * Whether every component but the largest holds exactly one node.
 *
 * The graph-summary reading branches on it: "one large part and N loose nodes" is a
 * different sentence from "N parts", and only the first is true when the small parts are
 * all single nodes. The element publishes no such flag, so it is derived here from three
 * numbers it does publish rather than from a second walk -- a component that is not the
 * largest is a single node exactly when the count of single-node components covers all of
 * them but one.
 *
 * With fewer than two components there are no small parts, so the answer is vacuously
 * true; the reading only consults it in the several-parts branch.
 * @param components - the component shape the element reported.
 * @returns true when no component except the largest holds more than one node.
 * @public
 */
export function smallPartsAreSingleNodes(components: ComponentStatistics): boolean {
    return components.isolatedCount >= components.count - 1;
}

/**
 * The id an endpoint field carries, whether it is a string, a number or a node object.
 *
 * An empty string is not an id, so it reads as absent: a record that cannot name its
 * endpoint names no node at all.
 * @param value - whatever the endpoint field holds.
 * @returns the id as a string, or null when the field names no node.
 */
export function edgeEndpointId(value: unknown): string | null {
    if (typeof value === "string") {
        return value.length > 0 ? value : null;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }

    if (typeof value === "object" && value !== null) {
        const record = value as Record<string, unknown>;
        if ("id" in record) {
            return edgeEndpointId(record.id);
        }
    }

    return null;
}

/**
 * The two ends of an edge record, as the app's own data table and inspector hold it.
 *
 * `source` and `target`, and nothing else. Those are the only two names the element ever
 * writes: every importer publishes that pair, the element resolves whatever an input file
 * spelled its endpoints before the record is built, and `GraphtyHandle.getData` copies the
 * resolved pair onto the record after the attribute spread, so a source file that happens
 * to carry a key called `src` cannot displace it.
 *
 * There used to be a `src`/`dst` fallback here, and it is gone rather than merely unused.
 * Two names for one fact is what let the two disagree, and a reader that accepts both
 * cannot tell the difference between an endpoint the element resolved and an attribute
 * that happens to share the name. A record naming neither now reads as naming no node,
 * which is the honest answer and the one the element itself gives.
 *
 * WHY THIS IS STILL THE APP'S. It reads the app's own record bag, not the graph: the ids
 * it returns are printed forms for a table row and an inspector line. The one thing built
 * on top of it that IS a graph question -- who a node's neighbours are -- is here only
 * because the element's data surface has no neighbour verb yet; its own documentation
 * says neighbour pages are asynchronous by construction and not part of that surface.
 * When they arrive, the inspector's neighbour list is the element's and this file keeps
 * only the record reader.
 * @param edge - one edge record.
 * @returns both endpoint ids, either of which may be null.
 * @public
 */
export function edgeEndpoints(edge: Readonly<Record<string, unknown>>): {
    readonly source: string | null;
    readonly target: string | null;
} {
    return { source: edgeEndpointId(edge.source), target: edgeEndpointId(edge.target) };
}
