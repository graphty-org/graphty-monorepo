/**
 * `@graphty/graph-samples/datasets/celegans-neural`: The C. elegans neural network.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { fetchDataset, type FetchDatasetOptions } from "../remote.js";

export { celegansNeuralMeta } from "./meta.js";

/**
 * The C. elegans neural network: 297 neurons and 2,345 weighted, directed connections.
 * Downloads it from graphty.app: the same as `fetchDataset("celegans-neural", options)`.
 * @param options - the base URL, fetch implementation and abort signal, as for `fetchDataset`
 * @returns the graph as a frozen graph-format snapshot
 */
export function celegansNeural(options?: FetchDatasetOptions): Promise<GraphSnapshot> {
    return fetchDataset("celegans-neural", options);
}
