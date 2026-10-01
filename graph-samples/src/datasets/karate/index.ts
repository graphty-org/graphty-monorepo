/**
 * `@graphty/graph-samples/datasets/karate`: Zachary's karate club.
 */

import { type SampleGraph } from "../../types.js";
import { buildDataset } from "../build.js";
import { DATA } from "./data.js";

export { karateMeta } from "./meta.js";

/**
 * Zachary's karate club: 34 members, 78 weighted friendships, and the faction each member joined (`club`).
 * @returns a fresh copy of the graph as typed arrays
 */
export function karate(): SampleGraph {
    return buildDataset(DATA);
}
