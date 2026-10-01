/**
 * `@graphty/graph-samples/datasets/knuth-miles`: Knuth's miles.
 */

import { type SampleGraph } from "../../types.js";
import { buildDataset } from "../build.js";
import { DATA } from "./data.js";

export { knuthMilesMeta } from "./meta.js";

/**
 * Knuth's miles: 128 North American cities and the 1949 road mileage between every pair.
 * @returns a fresh copy of the graph as typed arrays
 */
export function knuthMiles(): SampleGraph {
    return buildDataset(DATA);
}
