/**
 * `@graphty/graph-samples/datasets/dolphins`: Doubtful Sound dolphins.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { fetchDataset, type FetchDatasetOptions } from "../remote.js";

export { dolphinsMeta } from "./meta.js";

/**
 * The Doubtful Sound dolphin network: 62 dolphins, 159 frequent associations, each dolphin's `label`.
 * Downloads it from graphty.app: the same as `fetchDataset("dolphins", options)`.
 * @param options - the base URL, fetch implementation and abort signal, as for `fetchDataset`
 * @returns the graph as a frozen graph-format snapshot
 */
export function dolphins(options?: FetchDatasetOptions): Promise<GraphSnapshot> {
    return fetchDataset("dolphins", options);
}
