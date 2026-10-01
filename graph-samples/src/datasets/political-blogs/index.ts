/**
 * `@graphty/graph-samples/datasets/political-blogs`: US political blogs, 2004.
 */

import { type SampleGraph } from "../../types.js";
import { buildDataset } from "../build.js";
import { DATA } from "./data.js";

export { politicalBlogsMeta } from "./meta.js";

/**
 * US political blogs, 2004: 1,490 blogs, 19,022 directed links, and each blog's political lean (`lean`).
 * @returns a fresh copy of the graph as typed arrays
 */
export function politicalBlogs(): SampleGraph {
    return buildDataset(DATA);
}
