/**
 * `@graphty/graph-samples/datasets/openflights`: OpenFlights.
 */

import { type SampleGraph } from "../../types.js";
import { buildDataset } from "../build.js";
import { DATA } from "./data.js";

export { openflightsMeta } from "./meta.js";

/**
 * OpenFlights: 3,214 airports and the 36,906 directed airline routes between them, weighted by the number of airlines.
 * @returns a fresh copy of the graph as typed arrays
 */
export function openflights(): SampleGraph {
    return buildDataset(DATA);
}
