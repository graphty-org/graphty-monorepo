/**
 * `@graphty/graph-samples/datasets/yeast-perturbation`: Yeast galactose perturbation network (galFiltered).
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { fetchDataset, type FetchDatasetOptions } from "../remote.js";

export { yeastPerturbationMeta } from "./meta.js";

/**
 * Yeast galactose perturbation: 331 genes and 361 directed interactions, with the saved Cytoscape drawing and expression ratios.
 * Downloads it from graphty.app: the same as `fetchDataset("yeast-perturbation", options)`.
 * @param options - the base URL, fetch implementation and abort signal, as for `fetchDataset`
 * @returns the graph as a frozen graph-format snapshot
 */
export function yeastPerturbation(options?: FetchDatasetOptions): Promise<GraphSnapshot> {
    return fetchDataset("yeast-perturbation", options);
}
