/**
 * The styles of CX2 files: the `visualProperties` aspect (defaults, `nodeMapping`, `edgeMapping`), the dependencies
 * in `visualEditorProperties`, and the `nodeBypasses` / `edgeBypasses` columns, resolved the way Cytoscape draws
 * them with Cytoscape desktop's default style beneath. The reading and writing CX version 1 shares are in
 * `../cx/styles.ts`.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { cytoscapeStyleFromCx2 } from "../../styles/cytoscape/mappings.js";
import { StyleNotes } from "../../styles/notes.js";
import type { ImporterStyles, StyleReadContext, StyleWriteCapabilities } from "../../styles/types.js";
import { type Cx2StyleSource, cytoscapeWriteCapabilities, readDeclaredStyles } from "../cx/styles.js";

/** What the CX2 writer holds of a graph's styles. */
export const CX2_STYLE_CAPABILITIES: StyleWriteCapabilities = cytoscapeWriteCapabilities("cx2");

/**
 * The styles of an imported CX2 network.
 * @param snapshot - the network
 * @param context - what the import kept, the budget and the cancel signal
 * @returns the styles
 */
export function readCx2Styles(snapshot: GraphSnapshot, context: StyleReadContext): ImporterStyles {
    const notes = new StyleNotes();
    const kept = context.kept as Cx2StyleSource | undefined;
    const style = cytoscapeStyleFromCx2(kept?.visualProperties, kept?.visualEditorProperties, notes);
    return readDeclaredStyles(snapshot, context, style, "cx2.bypass", notes, "cx2");
}
