/**
 * `@graphty/graph-samples/datasets/wikipathways-senescence-autophagy`: Senescence and autophagy in cancer (WikiPathways WP615).
 */

import { type SampleGraph } from "../../types.js";
import { buildDataset } from "../build.js";
import { DATA } from "./data.js";

export { wikipathwaysSenescenceAutophagyMeta } from "./meta.js";

/**
 * WikiPathways WP615: 161 pathway elements and 118 directed interactions, with the saved drawing.
 * @returns a fresh copy of the graph as typed arrays
 */
export function wikipathwaysSenescenceAutophagy(): SampleGraph {
    return buildDataset(DATA);
}
