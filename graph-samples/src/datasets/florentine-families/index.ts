/**
 * `@graphty/graph-samples/datasets/florentine-families`: Florentine families.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { fetchDataset, type FetchDatasetOptions } from "../remote.js";

export { florentineFamiliesMeta } from "./meta.js";

/**
 * The Florentine families marriage network: 15 families (node ids are the family names), 20 marriages.
 * Downloads it from graphty.app: the same as `fetchDataset("florentine-families", options)`.
 * @param options - the base URL, fetch implementation and abort signal, as for `fetchDataset`
 * @returns the graph as a frozen graph-format snapshot
 */
export function florentineFamilies(options?: FetchDatasetOptions): Promise<GraphSnapshot> {
    return fetchDataset("florentine-families", options);
}
