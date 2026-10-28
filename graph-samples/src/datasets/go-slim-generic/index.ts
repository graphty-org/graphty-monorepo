/**
 * `@graphty/graph-samples/datasets/go-slim-generic`: Generic GO slim (Gene Ontology).
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { fetchDataset, type FetchDatasetOptions } from "../remote.js";

export { goSlimGenericMeta } from "./meta.js";

/**
 * Generic GO slim: 140 GO terms and 62 arcs from term to parent, with each term's namespace.
 * Downloads it from graphty.app: the same as `fetchDataset("go-slim-generic", options)`.
 * @param options - the base URL, fetch implementation and abort signal, as for `fetchDataset`
 * @returns the graph as a frozen graph-format snapshot
 */
export function goSlimGeneric(options?: FetchDatasetOptions): Promise<GraphSnapshot> {
    return fetchDataset("go-slim-generic", options);
}
