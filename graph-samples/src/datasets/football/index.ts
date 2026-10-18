/**
 * `@graphty/graph-samples/datasets/football`: American college football, 2000.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { fetchDataset, type FetchDatasetOptions } from "../remote.js";

export { footballMeta } from "./meta.js";

/**
 * The college football network of fall 2000 (Evans' corrected version): 115 teams, 613 games, each team's `label` and `conference`.
 * Downloads it from graphty.app: the same as `fetchDataset("football", options)`.
 * @param options - the base URL, fetch implementation and abort signal, as for `fetchDataset`
 * @returns the graph as a frozen graph-format snapshot
 */
export function football(options?: FetchDatasetOptions): Promise<GraphSnapshot> {
    return fetchDataset("football", options);
}
