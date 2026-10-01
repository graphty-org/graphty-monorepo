/**
 * `@graphty/graph-samples/datasets/political-books`: Books about US politics.
 */

import { type SampleGraph } from "../../types.js";
import { buildDataset } from "../build.js";
import { DATA } from "./data.js";

export { politicalBooksMeta } from "./meta.js";

/**
 * The political books co-purchase network: 105 books, 441 co-purchases, each book's `label` and political `lean`.
 * @returns a fresh copy of the graph as typed arrays
 */
export function politicalBooks(): SampleGraph {
    return buildDataset(DATA);
}
