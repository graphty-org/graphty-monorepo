/**
 * An example mapping: one work and the works it cites, from Crossref's REST API
 * (https://api.crossref.org). The work's record lists its references; each one with a DOI is an
 * embedded node and a `cites` edge from the work, and a reference without a DOI is left out.
 * Catalog data for the `rest` source's examples.
 */

import { type RestMapping } from "../params.js";

/** The Crossref references mapping: `doi`, the work's DOI ("10.1038/30918"). */
export const CROSSREF_MAPPING: RestMapping = Object.freeze<RestMapping>({
    version: 1,
    endpoint: "https://api.crossref.org",
    load: "work",
    directed: true,
    requests: {
        work: { path: "/works/{doi}", records: "message", entity: "work" },
    },
    entities: {
        work: {
            id: "DOI",
            fields: { title: "title", publisher: "publisher" },
            edges: [{ each: "reference[]", to: "DOI", type: "cites", entity: "reference" }],
            embedded: [{ at: "reference[]", entity: "reference" }],
        },
        reference: {
            id: "DOI",
            label: "work",
            fields: { title: "article-title", book: "volume-title", author: "author", year: "year" },
        },
    },
});
