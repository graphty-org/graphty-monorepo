/**
 * `@graphty/graph-samples/datasets/football`: American college football, 2000.
 */

import { type SampleGraph } from "../../types.js";
import { buildDataset } from "../build.js";
import { DATA } from "./data.js";

export { footballMeta } from "./meta.js";

/**
 * The college football network of fall 2000 (Evans' corrected version): 115 teams, 613 games, each team's `label` and `conference`.
 * @returns a fresh copy of the graph as typed arrays
 */
export function football(): SampleGraph {
    return buildDataset(DATA);
}
