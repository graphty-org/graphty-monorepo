/**
 * @file Where a file's styles read their values in the element: a data column of the file at the
 * record key the element's reader put it under, and each element of the import under the id the
 * element holds it by.
 *
 * A reader may rename a column, nest it (a graphology attribute arrives under `attributes`) or
 * change its values on the way; the record path is then unknown, and the translation copies the
 * column's values into the load's style values instead of guessing a path.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { EdgeId, NodeId, Path } from "../../../catalog/types";

/** The prefix of a path that reads a record's attribute. */
const ATTRIBUTE_PREFIX = "data.";

/**
 * Where a reader put each column of its import on the records: the record key, or the keys down
 * into a nested object, or null when it left the column out or changed its values.
 */
export type ReaderColumnPath = (kind: "node" | "edge", column: string) => readonly string[] | null;

/**
 * The path a layer reads one of the file's data columns at.
 * @param path - Where the reader put each column.
 * @returns For a column, the path, or null when a layer cannot read it from the records (it was
 *     left out, changed, or nested).
 */
export function dataPaths(path: ReaderColumnPath): (kind: "node" | "edge", column: string) => Path | null {
    return (kind, column) => {
        const keys = path(kind, column);
        return keys?.length === 1 ? `${ATTRIBUTE_PREFIX}${keys[0]}` : null;
    };
}

/**
 * The edge rows of an import one per edge the file wrote: a mixed-direction edge graph-io
 * expanded into two halves is one edge, the first half.
 * @param snapshot - The import's graph.
 * @returns The rows, in order: the n-th edge record the reader produced came from row n.
 */
export function logicalEdgeRows(snapshot: GraphSnapshot): number[] {
    const pair = snapshot.edges.byRole("pair");
    const rows: number[] = [];
    for (let row = 0; row < snapshot.edgeCount; row++) {
        if (!(pair?.isSet(row) && (pair.value(row) as number) < row)) {
            rows.push(row);
        }
    }

    return rows;
}

/**
 * The element ids of an import's elements, by the import's own element index.
 * @param snapshot - The import's graph.
 * @param edgeIds - The id the element gave each edge record of the load, in record order; null
 *     for a record that made no edge of its own.
 * @param heldNode - The id the element holds a node under, for an id it may spell the other way
 *     (`34` or `"34"`), or undefined when it holds no such node.
 * @returns Per node index and per edge row, the element id, or null.
 */
export function elementIdsOf(
    snapshot: GraphSnapshot,
    edgeIds: readonly (EdgeId | null)[],
    heldNode: (id: NodeId) => NodeId | undefined,
): { readonly node: readonly (NodeId | null)[]; readonly edge: readonly (EdgeId | null)[] } {
    const node: (NodeId | null)[] = [];
    for (let i = 0; i < snapshot.nodeCount; i++) {
        node.push(heldNode(snapshot.ids.idOf(i)) ?? null);
    }

    const edge = new Array<EdgeId | null>(snapshot.edgeCount).fill(null);
    const rows = logicalEdgeRows(snapshot);
    // A load whose records do not line up with the file's edges (some were filtered before the
    // load saw them) keeps no edge values rather than putting them on the wrong edges.
    if (rows.length === edgeIds.length) {
        rows.forEach((row, at) => {
            edge[row] = edgeIds[at];
        });
    }

    return { node, edge };
}
