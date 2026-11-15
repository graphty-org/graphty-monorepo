/**
 * The SPARQL source's descriptor: catalog data, available without loading the source's code.
 */

import { type SourceDescriptor } from "../types.js";

/** UniProt: the interactions of the human protein TP53 (P04637) and their participants. */
const UNIPROT_TP53 = `PREFIX up: <http://purl.uniprot.org/core/>
PREFIX uniprotkb: <http://purl.uniprot.org/uniprot/>
CONSTRUCT { ?p up:interaction ?i . ?i up:participant ?q . }
WHERE { BIND(uniprotkb:P04637 AS ?p) ?p up:interaction ?i . ?i up:participant ?q . }`;

/** DBpedia: which philosophers influenced which, with their English names; its own LIMIT. */
const DBPEDIA_PHILOSOPHERS = `PREFIX dbo: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
CONSTRUCT { ?a dbo:influencedBy ?b . ?a rdfs:label ?la . }
WHERE { ?a a dbo:Philosopher ; dbo:influencedBy ?b ; rdfs:label ?la . FILTER(lang(?la) = "en") }
LIMIT 2000`;

/**
 * Wikidata: what Albert Einstein (Q937) links to, with English names; its own LIMIT keeps it one
 * fast request, well inside the query service's 60 s limit and its per-client budget.
 */
const WIKIDATA_EINSTEIN = `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
CONSTRUCT { ?s ?p ?o . ?s rdfs:label ?sl . ?o rdfs:label ?ol . }
WHERE {
  VALUES ?s { wd:Q937 }
  ?s rdfs:label ?sl . FILTER(lang(?sl) = "en")
  ?s ?p ?o .
  FILTER(STRSTARTS(STR(?p), "http://www.wikidata.org/prop/direct/") && isIRI(?o))
  OPTIONAL { ?o rdfs:label ?ol . FILTER(lang(?ol) = "en") }
}
LIMIT 500`;

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
    // No login. Each sets its own LIMIT or is small, so it is one request (scripts/live-examples.ts).
    examples: [
        {
            id: "uniprot-tp53",
            plainName: "UniProt: TP53's protein interactions",
            endpoint: "https://sparql.uniprot.org/sparql",
            params: { query: UNIPROT_TP53 },
            counts: { nodes: 375, edges: 746 },
        },
        {
            id: "dbpedia-philosophers",
            plainName: "DBpedia: philosophers and who influenced them",
            endpoint: "https://dbpedia.org/sparql",
            params: { query: DBPEDIA_PHILOSOPHERS, pageSize: 2000 },
            counts: { nodes: 575, edges: 669 },
        },
        {
            id: "wikidata-einstein",
            plainName: "Wikidata: what Albert Einstein links to",
            endpoint: "https://query.wikidata.org/sparql",
            params: { query: WIKIDATA_EINSTEIN, language: "en" },
            counts: { nodes: 232, edges: 246 },
        },
    ],
});
