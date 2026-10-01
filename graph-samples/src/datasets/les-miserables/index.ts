/**
 * `@graphty/graph-samples/datasets/les-miserables`: Les Miserables co-appearances.
 */

import { type SampleGraph } from "../../types.js";
import { buildDataset } from "../build.js";
import { DATA } from "./data.js";

export { lesMiserablesMeta } from "./meta.js";

/**
 * The Les Miserables co-appearance network: 77 characters (node ids are the names), 254 weighted co-appearances.
 * @returns a fresh copy of the graph as typed arrays
 */
export function lesMiserables(): SampleGraph {
    return buildDataset(DATA);
}
