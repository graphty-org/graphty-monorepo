/**
 * `@graphty/graph-samples/datasets/yeast-perturbation`: Yeast galactose perturbation network (galFiltered).
 */

import { type SampleGraph } from "../../types.js";
import { buildDataset } from "../build.js";
import { DATA } from "./data.js";

export { yeastPerturbationMeta } from "./meta.js";

/**
 * Yeast galactose perturbation: 331 genes and 361 directed interactions, with the saved Cytoscape drawing and expression ratios.
 * @returns a fresh copy of the graph as typed arrays
 */
export function yeastPerturbation(): SampleGraph {
    return buildDataset(DATA);
}
