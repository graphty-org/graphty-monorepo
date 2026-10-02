/**
 * The Cytoscape.js adapter (package "@graphty/cytoscape"): graphty layouts and algorithms as Cytoscape.js extensions.
 *
 * ```ts
 * import cytoscape from "cytoscape";
 * import graphtyCytoscape from "@graphty/cytoscape";
 * cytoscape.use(graphtyCytoscape);
 * cy.layout({ name: "graphty-forceatlas2" }).run();
 * cy.elements().graphtyPageRank().rank("#a");
 * ```
 */

import { registerAlgorithms } from "./algorithms.js";
import { registerLayouts } from "./layouts.js";

export {
    ALGORITHM_NAMES,
    type AlgorithmOptions,
    type CutResult,
    type ElementRef,
    type GraphtyAlgorithms,
    type NodePair,
    type Partition,
    type PathsResult,
    type PointPathResult,
    type PredictedLink,
    type ScoreResult,
    type SearchResult,
} from "./algorithms.js";
export { type GraphtyLayoutOptions, LAYOUT_NAMES } from "./layouts.js";
export { type CytoscapeSnapshot, type NodeSelection, type SnapshotOptions, toSnapshot, writeData } from "./snapshot.js";

/**
 * The Cytoscape extension: `cytoscape.use(graphtyCytoscape)` registers every layout in LAYOUT_NAMES as
 * "graphty-<name>", and every algorithm in ALGORITHM_NAMES as a collection and core method.
 * @param cytoscape - the cytoscape function `use()` passes in
 */
export default function graphtyCytoscape(cytoscape: (type: string, name: string, registrant: unknown) => void): void {
    registerLayouts(cytoscape);
    registerAlgorithms(cytoscape);
}
