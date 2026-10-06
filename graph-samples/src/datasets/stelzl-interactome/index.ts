/**
 * `@graphty/graph-samples/datasets/stelzl-interactome`: Human protein interaction network (Stelzl 2005).
 */

import { type SampleGraph } from "../../types.js";
import { buildDataset } from "../build.js";
import { DATA } from "./data.js";

export { stelzlInteractomeMeta } from "./meta.js";

/**
 * Stelzl human interactome: 1,691 proteins and 3,128 directed interactions, with the saved Cytoscape drawing.
 * @returns a fresh copy of the graph as typed arrays
 */
export function stelzlInteractome(): SampleGraph {
    return buildDataset(DATA);
}
