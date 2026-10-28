/**
 * `@graphty/graph-samples/datasets/les-miserables`: Les Miserables co-appearances.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { fetchDataset, type FetchDatasetOptions } from "../remote.js";

export { lesMiserablesMeta } from "./meta.js";

/**
 * The Les Miserables co-appearance network: 77 characters (node ids are the names), 254 weighted co-appearances.
 * Downloads it from graphty.app: the same as `fetchDataset("les-miserables", options)`.
 * @param options - the base URL, fetch implementation and abort signal, as for `fetchDataset`
 * @returns the graph as a frozen graph-format snapshot
 */
export function lesMiserables(options?: FetchDatasetOptions): Promise<GraphSnapshot> {
    return fetchDataset("les-miserables", options);
}
