/**
 * `@graphty/graph-samples/datasets/karate`: Zachary's karate club.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { fetchDataset, type FetchDatasetOptions } from "../remote.js";

export { karateMeta } from "./meta.js";

/**
 * Zachary's karate club: 34 members, 78 weighted friendships, and the faction each member joined (`club`).
 * Downloads it from graphty.app: the same as `fetchDataset("karate", options)`.
 * @param options - the base URL, fetch implementation and abort signal, as for `fetchDataset`
 * @returns the graph as a frozen graph-format snapshot
 */
export function karate(options?: FetchDatasetOptions): Promise<GraphSnapshot> {
    return fetchDataset("karate", options);
}
