/**
 * `@graphty/graph-samples/datasets/stelzl-interactome`: Human protein interaction network (Stelzl 2005).
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { fetchDataset, type FetchDatasetOptions } from "../remote.js";

export { stelzlInteractomeMeta } from "./meta.js";

/**
 * Stelzl human interactome: 1,691 proteins and 3,128 directed interactions, with the saved Cytoscape drawing.
 * Downloads it from graphty.app: the same as `fetchDataset("stelzl-interactome", options)`.
 * @param options - the base URL, fetch implementation and abort signal, as for `fetchDataset`
 * @returns the graph as a frozen graph-format snapshot
 */
export function stelzlInteractome(options?: FetchDatasetOptions): Promise<GraphSnapshot> {
    return fetchDataset("stelzl-interactome", options);
}
