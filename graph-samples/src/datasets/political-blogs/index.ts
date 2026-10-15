/**
 * `@graphty/graph-samples/datasets/political-blogs`: US political blogs, 2004.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { fetchDataset, type FetchDatasetOptions } from "../remote.js";

export { politicalBlogsMeta } from "./meta.js";

/**
 * US political blogs, 2004: 1,490 blogs, 19,022 directed links, and each blog's political lean (`lean`).
 * Downloads it from graphty.app: the same as `fetchDataset("political-blogs", options)`.
 * @param options - the base URL, fetch implementation and abort signal, as for `fetchDataset`
 * @returns the graph as a frozen graph-format snapshot
 */
export function politicalBlogs(options?: FetchDatasetOptions): Promise<GraphSnapshot> {
    return fetchDataset("political-blogs", options);
}
