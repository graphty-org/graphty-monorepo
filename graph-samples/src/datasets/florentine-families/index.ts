/**
 * `@graphty/graph-samples/datasets/florentine-families`: Florentine families.
 */

import { type SampleGraph } from "../../types.js";
import { buildDataset } from "../build.js";
import { DATA } from "./data.js";

export { florentineFamiliesMeta } from "./meta.js";

/**
 * The Florentine families marriage network: 15 families (node ids are the family names), 20 marriages.
 * @returns a fresh copy of the graph as typed arrays
 */
export function florentineFamilies(): SampleGraph {
    return buildDataset(DATA);
}
