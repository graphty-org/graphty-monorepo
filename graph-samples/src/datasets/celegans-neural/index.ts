/**
 * `@graphty/graph-samples/datasets/celegans-neural`: The C. elegans neural network.
 */

import { type SampleGraph } from "../../types.js";
import { buildDataset } from "../build.js";
import { DATA } from "./data.js";

export { celegansNeuralMeta } from "./meta.js";

/**
 * The C. elegans neural network: 297 neurons and 2,345 weighted, directed connections.
 * @returns a fresh copy of the graph as typed arrays
 */
export function celegansNeural(): SampleGraph {
    return buildDataset(DATA);
}
