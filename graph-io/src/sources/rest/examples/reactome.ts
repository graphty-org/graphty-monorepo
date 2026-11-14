/**
 * An example mapping: the molecules that interact with one protein, from the Reactome content
 * service's static interactors (https://reactome.org/dev/content-service), which come from IntAct.
 * The body holds the queried protein with its interactors nested in it, so each interactor is an
 * embedded node and an edge from the protein. Catalog data for the `rest` source's examples.
 */

import { type RestMapping } from "../params.js";

/** The Reactome interactors mapping: `accession`, a UniProt accession ("P04637"). */
export const REACTOME_MAPPING: RestMapping = Object.freeze<RestMapping>({
    version: 1,
    endpoint: "https://reactome.org",
    load: "interactors",
    directed: false,
    requests: {
        interactors: {
            path: "/ContentService/interactors/static/molecule/{accession}/details",
            records: "entities",
            entity: "molecule",
        },
    },
    entities: {
        molecule: {
            id: "acc",
            fields: { interactors: "count" },
            edges: [
                {
                    each: "interactors[]",
                    to: "acc",
                    type: "interacts_with",
                    entity: "interactor",
                    fields: { score: "score", evidences: "evidences" },
                },
            ],
            embedded: [{ at: "interactors[]", entity: "interactor" }],
        },
        interactor: { id: "acc", label: "molecule", fields: { name: "alias" } },
    },
});
