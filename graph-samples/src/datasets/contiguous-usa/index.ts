/**
 * `@graphty/graph-samples/datasets/contiguous-usa`: Contiguous United States.
 */

import { type SampleGraph } from "../../types.js";
import { buildDataset } from "../build.js";
import { DATA } from "./data.js";

export { contiguousUsaMeta } from "./meta.js";

/**
 * Contiguous United States: the 48 contiguous states and DC, joined by land borders, with their centres of population.
 * @returns a fresh copy of the graph as typed arrays
 */
export function contiguousUsa(): SampleGraph {
    return buildDataset(DATA);
}
