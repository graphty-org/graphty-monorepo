/**
 * `@graphty/graph-samples/datasets/political-books`: Books about US politics.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { fetchDataset, type FetchDatasetOptions } from "../remote.js";

export { politicalBooksMeta } from "./meta.js";

/**
 * The political books co-purchase network: 105 books, 441 co-purchases, each book's `label` and political `lean`.
 * Downloads it from graphty.app: the same as `fetchDataset("political-books", options)`.
 * @param options - the base URL, fetch implementation and abort signal, as for `fetchDataset`
 * @returns the graph as a frozen graph-format snapshot
 */
export function politicalBooks(options?: FetchDatasetOptions): Promise<GraphSnapshot> {
    return fetchDataset("political-books", options);
}
