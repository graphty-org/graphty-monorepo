/**
 * The `graphty.styles` block's exact values over the nearest Cytoscape values a file holds, shared by the readers
 * of Cytoscape's formats (XGMML, CX, a session).
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { STYLE_BLOCK_NAME } from "../io/block.js";
import { takeFromBlock } from "../io/round-trip.js";
import { StyleNotes } from "../notes.js";
import { plainCell } from "../plan/resolve.js";
import type { StyleColumn, StyleTarget } from "../types.js";
import { type CytoscapeDialect, cytoscapeElementProperties } from "./emit.js";
import { type CytoscapeElements, edgeEnds, resolveCytoscapeBypasses } from "./resolve.js";

/**
 * For a file graphty wrote: where an element's value is what the writer's nearest Cytoscape value of the
 * `graphty.styles` block's value reads back as (a font family list written as its first family, a shape Cytoscape
 * does not have), the block's exact value is the truth, so a re-import gives the same rules. A value that differs
 * from what graphty wrote (another program edited it) stays the truth.
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @param values - the values per property, changed in place
 * @param dialect - the Cytoscape dialect the file's values are written in
 * @param created - the order desktop creates the elements in, when the file is read with it (CX version 1)
 */
export function exactFromBlock(
    snapshot: GraphSnapshot,
    target: StyleTarget,
    values: Partial<Record<string, StyleColumn>>,
    dialect: CytoscapeDialect = "desktop",
    created?: NonNullable<CytoscapeElements["ends"]>["created"],
): void {
    const text = snapshot.graph.has(STYLE_BLOCK_NAME) ? plainCell(snapshot.graph.value(STYLE_BLOCK_NAME, 0)) : null;
    if (typeof text !== "string") {
        return;
    }
    takeFromBlock(snapshot, text, "xgmml", (t, block) => {
        if (t !== target) {
            return null;
        }
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        // What each element's exact values are written as, read back the way the file is read.
        const written = Array.from({ length: n }, (_v, i) =>
            cytoscapeElementProperties(
                target,
                (property) => block(target, property)[i] ?? null,
                dialect,
                () => undefined,
            ),
        );
        // Desktop fans the curved edges between the same two nodes by the nodes' size, as the file is read
        const ends =
            target === "edge"
                ? {
                      ends: {
                          ...edgeEnds(snapshot, {
                              width: block("node", "width"),
                              height: block("node", "height"),
                              borderWidth: block("node", "borderWidth"),
                              borderStyle: block("node", "borderStyle"),
                              fillOpacity: block("node", "fillOpacity"),
                              borderOpacity: block("node", "borderOpacity"),
                              shape: block("node", "shape"),
                          }),
                          ...(created === undefined ? {} : { created }),
                      },
                  }
                : {};
        const readBack = resolveCytoscapeBypasses(target, written, { notes: new StyleNotes(), ...ends });
        return {
            values,
            properties: Object.keys(values).filter((p) => values[p] !== undefined && readBack[p] !== undefined),
            readBack: (i) => (property) => readBack[property]?.[i] ?? null,
        };
    });
}
