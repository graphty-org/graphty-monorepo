/**
 * `@graphty/graph-samples/datasets/wikipathways-senescence-autophagy`: Senescence and autophagy in cancer (WikiPathways WP615).
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { fetchDataset, type FetchDatasetOptions } from "../remote.js";

export { wikipathwaysSenescenceAutophagyMeta } from "./meta.js";

/**
 * WikiPathways WP615: 161 pathway elements and 118 directed interactions, with the saved drawing.
 * Downloads it from graphty.app: the same as `fetchDataset("wikipathways-senescence-autophagy", options)`.
 * @param options - the base URL, fetch implementation and abort signal, as for `fetchDataset`
 * @returns the graph as a frozen graph-format snapshot
 */
export function wikipathwaysSenescenceAutophagy(options?: FetchDatasetOptions): Promise<GraphSnapshot> {
    return fetchDataset("wikipathways-senescence-autophagy", options);
}
