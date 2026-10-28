/**
 * `@graphty/graph-samples/datasets/openflights`: OpenFlights.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { fetchDataset, type FetchDatasetOptions } from "../remote.js";

export { openflightsMeta } from "./meta.js";

/**
 * OpenFlights: 3,214 airports and the 36,906 directed airline routes between them, weighted by the number of airlines.
 * Downloads it from graphty.app: the same as `fetchDataset("openflights", options)`.
 * @param options - the base URL, fetch implementation and abort signal, as for `fetchDataset`
 * @returns the graph as a frozen graph-format snapshot
 */
export function openflights(options?: FetchDatasetOptions): Promise<GraphSnapshot> {
    return fetchDataset("openflights", options);
}
