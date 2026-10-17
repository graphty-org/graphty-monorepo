/**
 * A sample mapping: STRING's functional partners of a protein (https://string-db.org). Each
 * interaction record names both proteins, so both are embedded nodes and the record itself is only
 * the edge. Catalog data for the `rest` source's samples.
 */

import { type RestMapping } from "../params.js";

/** The STRING network mapping: `identifiers`, `species` (NCBI taxon) and `add_nodes`. */
export const STRING_MAPPING: RestMapping = Object.freeze<RestMapping>({
    version: 1,
    endpoint: "https://string-db.org",
    load: "network",
    directed: false,
    requests: {
        network: {
            path: "/api/json/network",
            query: { identifiers: "{identifiers}", species: "{species}", add_nodes: "{add_nodes}" },
            records: ".",
            entity: "interaction",
        },
    },
    entities: {
        interaction: {
            id: "stringId_A",
            node: false,
            edges: [
                {
                    from: "stringId_A",
                    to: "stringId_B",
                    type: "interacts_with",
                    entity: "protein-b",
                    fields: { score: "score" },
                },
            ],
            embedded: [
                { at: ".", entity: "protein-a" },
                { at: ".", entity: "protein-b" },
            ],
        },
        "protein-a": { id: "stringId_A", label: "protein", fields: { name: "preferredName_A" } },
        "protein-b": { id: "stringId_B", label: "protein", fields: { name: "preferredName_B" } },
    },
});
