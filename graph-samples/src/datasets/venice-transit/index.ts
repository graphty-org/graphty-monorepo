/**
 * `@graphty/graph-samples/datasets/venice-transit`: Venice public transport.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { fetchDataset, type FetchDatasetOptions } from "../remote.js";

export { veniceTransitMeta } from "./meta.js";

/**
 * Venice public transport: the bus, tram and waterbus stops of Venice and the links between them, with their coordinates.
 * Downloads it from graphty.app: the same as `fetchDataset("venice-transit", options)`.
 * @param options - the base URL, fetch implementation and abort signal, as for `fetchDataset`
 * @returns the graph as a frozen graph-format snapshot
 */
export function veniceTransit(options?: FetchDatasetOptions): Promise<GraphSnapshot> {
    return fetchDataset("venice-transit", options);
}
