/**
 * Per-edge direction (design section 3.6): a snapshot's `directed` flag is the DEFAULT direction of
 * its edges, and an optional bool edge column with role `"directed"` overrides it per edge. A row
 * that is unset, or a snapshot without the column, takes the default, so every snapshot and wire
 * form written before the column existed means exactly what it meant.
 *
 * The cell records the direction the edge has in the data; the arcs follow `directed`. An importer
 * that reads a file with both kinds into a directed snapshot stores each undirected edge as two
 * halves, one each way, both with the cell false and linked by the `"pair"` role column, so an
 * algorithm walking the arcs sees an undirected edge as two arcs and an exporter writes the pair
 * back as one edge.
 */

import { type GraphSnapshot } from "../types/index.js";

/**
 * How the edges of a graph are directed: all directed, all undirected, or some of each.
 */
export type Directedness = "directed" | "undirected" | "mixed";

/**
 * Whether one logical edge is directed: its role-`"directed"` cell when that row is set, the
 * snapshot's `directed` flag otherwise.
 * @param snapshot - the snapshot
 * @param edge - the logical edge index
 * @returns true when the edge is directed
 */
export function edgeIsDirected(snapshot: GraphSnapshot, edge: number): boolean {
    const column = snapshot.edges.byRole("directed");
    return column?.dtype === "bool" && column.isSet(edge) ? column.value(edge) === true : snapshot.directed;
}

/**
 * Whether the graph's edges are all directed, all undirected, or some of each (`"mixed"`), read
 * through {@link edgeIsDirected}. A graph without edges, or without a role-`"directed"` column,
 * answers with its `directed` flag.
 * @param snapshot - the snapshot
 * @returns the graph's directedness
 */
export function directedness(snapshot: GraphSnapshot): Directedness {
    const fallback = snapshot.directed ? "directed" : "undirected";
    const column = snapshot.edges.byRole("directed");
    if (column?.dtype !== "bool" || snapshot.edgeCount === 0) {
        return fallback;
    }

    let directed = 0;
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (column.isSet(e) ? column.value(e) === true : snapshot.directed) {
            directed++;
        }
    }

    if (directed === 0) {
        return "undirected";
    }

    return directed === snapshot.edgeCount ? "directed" : "mixed";
}
