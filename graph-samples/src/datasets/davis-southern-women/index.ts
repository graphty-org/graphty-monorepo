/**
 * `@graphty/graph-samples/datasets/davis-southern-women`: Davis Southern Women.
 */

import { type SampleGraph } from "../../types.js";
import { buildDataset } from "../build.js";
import { DATA } from "./data.js";

export { davisSouthernWomenMeta } from "./meta.js";

/**
 * The Davis Southern Women network: 18 women and 14 events (node ids are the names), 89 attendances, and each node's `side`.
 * @returns a fresh copy of the graph as typed arrays
 */
export function davisSouthernWomen(): SampleGraph {
    return buildDataset(DATA);
}
