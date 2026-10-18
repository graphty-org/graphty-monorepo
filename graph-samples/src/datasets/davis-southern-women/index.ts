/**
 * `@graphty/graph-samples/datasets/davis-southern-women`: Davis Southern Women.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { fetchDataset, type FetchDatasetOptions } from "../remote.js";

export { davisSouthernWomenMeta } from "./meta.js";

/**
 * The Davis Southern Women network: 18 women and 14 events (node ids are the names), 89 attendances, and each node's `side`.
 * Downloads it from graphty.app: the same as `fetchDataset("davis-southern-women", options)`.
 * @param options - the base URL, fetch implementation and abort signal, as for `fetchDataset`
 * @returns the graph as a frozen graph-format snapshot
 */
export function davisSouthernWomen(options?: FetchDatasetOptions): Promise<GraphSnapshot> {
    return fetchDataset("davis-southern-women", options);
}
