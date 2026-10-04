/**
 * `@graphty/graph-samples/datasets/go-slim-generic`: Generic GO slim (Gene Ontology).
 */

import { type SampleGraph } from "../../types.js";
import { buildDataset } from "../build.js";
import { DATA } from "./data.js";

export { goSlimGenericMeta } from "./meta.js";

/**
 * Generic GO slim: 140 GO terms and 62 arcs from term to parent, with each term's namespace.
 * @returns a fresh copy of the graph as typed arrays
 */
export function goSlimGeneric(): SampleGraph {
    return buildDataset(DATA);
}
