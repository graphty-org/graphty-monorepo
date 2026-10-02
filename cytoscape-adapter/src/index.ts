/**
 * The Cytoscape.js adapter (package "@graphty/cytoscape"): graphty layouts as Cytoscape.js extensions.
 *
 * ```ts
 * import cytoscape from "cytoscape";
 * import graphtyCytoscape from "@graphty/cytoscape";
 * cytoscape.use(graphtyCytoscape);
 * cy.layout({ name: "graphty-forceatlas2" }).run();
 * ```
 */

import { registerLayouts } from "./layouts.js";

export { type GraphtyLayoutOptions, LAYOUT_NAMES, type NodeSelection } from "./layouts.js";
export { type CytoscapeSnapshot, type SnapshotOptions, toSnapshot, writeData } from "./snapshot.js";

/**
 * The Cytoscape extension: `cytoscape.use(graphtyCytoscape)` registers every layout in LAYOUT_NAMES as
 * "graphty-<name>".
 * @param cytoscape - the cytoscape function `use()` passes in
 */
export default function graphtyCytoscape(cytoscape: (type: string, name: string, registrant: unknown) => void): void {
    registerLayouts(cytoscape);
}
