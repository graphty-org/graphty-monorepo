/**
 * `@graphty/graph-samples/datasets/dolphins`: Doubtful Sound dolphins.
 */

import { type SampleGraph } from "../../types.js";
import { buildDataset } from "../build.js";
import { DATA } from "./data.js";

export { dolphinsMeta } from "./meta.js";

/**
 * The Doubtful Sound dolphin network: 62 dolphins, 159 frequent associations, each dolphin's `label`.
 * @returns a fresh copy of the graph as typed arrays
 */
export function dolphins(): SampleGraph {
    return buildDataset(DATA);
}
