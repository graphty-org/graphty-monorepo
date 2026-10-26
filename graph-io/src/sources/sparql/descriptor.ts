/**
 * The SPARQL source's descriptor: catalog data, available without loading the source's code.
 */

import { type SourceDescriptor } from "../types.js";

/** A small Wikidata query: physics Nobel laureates and their doctoral advisors. */
const WIKIDATA_ADVISORS = `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
CONSTRUCT { ?person wdt:P184 ?advisor . ?person rdfs:label ?name . ?advisor rdfs:label ?advisorName . }
WHERE {
  ?person wdt:P166 wd:Q38104 ; wdt:P184 ?advisor ; rdfs:label ?name .
  ?advisor rdfs:label ?advisorName .
  FILTER(lang(?name) = "en" && lang(?advisorName) = "en")
}`;

/**
 * The descriptor of the `sparql` source. Experimental.
 * @category Network sources
 */
export const SPARQL_DESCRIPTOR: SourceDescriptor = Object.freeze({
    plainName: "SPARQL endpoint",
    kind: "sparql",
    version: 1,
    auth: ["basic", "bearer"],
    authRequired: "optional",
    features: ["expand", "probe", "validate", "page"],
    params: [
        { name: "query", plainName: "Query", type: "query", language: "sparql" },
        {
            name: "mode",
            plainName: "Mode",
            type: "enum",
            values: [
                { value: "query", label: "Query" },
                { value: "all", label: "Everything" },
                { value: "neighborhood", label: "Seed nodes" },
            ],
        },
        { name: "ids", plainName: "Seed IRIs", type: "node-id" },
        { name: "language", plainName: "Language", type: "string", advanced: true },
        { name: "predicates", plainName: "Follow predicates", type: "string", advanced: true },
        {
            name: "pageSize",
            plainName: "Page size",
            type: "integer",
            default: 1000,
            min: 1,
            max: 10000,
            advanced: true,
        },
    ],
    samples: [
        {
            id: "wikidata-physics-advisors",
            plainName: "Wikidata: physics Nobel laureates and their advisors",
            endpoint: "https://query.wikidata.org/sparql",
            params: {
                query: WIKIDATA_ADVISORS,
                pageSize: 100,
                language: "en",
                predicates: ["http://www.wikidata.org/prop/direct/"], // NOSONAR(S5332): an RDF namespace IRI, never fetched; Wikidata's IRIs are http
            },
        },
    ],
});
