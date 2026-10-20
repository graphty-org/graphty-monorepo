/**
 * `@graphty/graph-samples/datasets/contiguous-usa`: Contiguous United States.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { fetchDataset, type FetchDatasetOptions } from "../remote.js";

export { contiguousUsaMeta } from "./meta.js";

/**
 * Contiguous United States: the 48 contiguous states and DC, joined by land borders, with their centers of population.
 * Downloads it from graphty.app: the same as `fetchDataset("contiguous-usa", options)`.
 * @param options - the base URL, fetch implementation and abort signal, as for `fetchDataset`
 * @returns the graph as a frozen graph-format snapshot
 */
export function contiguousUsa(options?: FetchDatasetOptions): Promise<GraphSnapshot> {
    return fetchDataset("contiguous-usa", options);
}
