/**
 * `@graphty/graph-samples/datasets/knuth-miles`: Knuth's miles.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { fetchDataset, type FetchDatasetOptions } from "../remote.js";

export { knuthMilesMeta } from "./meta.js";

/**
 * Knuth's miles: 128 North American cities and the 1949 road mileage between every pair.
 * Downloads it from graphty.app: the same as `fetchDataset("knuth-miles", options)`.
 * @param options - the base URL, fetch implementation and abort signal, as for `fetchDataset`
 * @returns the graph as a frozen graph-format snapshot
 */
export function knuthMiles(options?: FetchDatasetOptions): Promise<GraphSnapshot> {
    return fetchDataset("knuth-miles", options);
}
