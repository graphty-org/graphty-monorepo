/**
 * The Wikidata query the paging recording (recordings/wikidata-advisors.json) was made with:
 * physics Nobel laureates and their doctoral advisors, in pages of 100. scripts/record-sparql.ts
 * records it and sparql.test.ts replays it; the request body must match, so both read it here.
 */

/** The query. */
const QUERY = `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
CONSTRUCT { ?person wdt:P184 ?advisor . ?person rdfs:label ?name . ?advisor rdfs:label ?advisorName . }
WHERE {
  ?person wdt:P166 wd:Q38104 ; wdt:P184 ?advisor ; rdfs:label ?name .
  ?advisor rdfs:label ?advisorName .
  FILTER(lang(?name) = "en" && lang(?advisorName) = "en")
}`;

/** The endpoint. */
export const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";

/** The params. */
export const WIKIDATA_ADVISORS = Object.freeze({
    query: QUERY,
    pageSize: 100,
    language: "en",
    predicates: ["http://www.wikidata.org/prop/direct/"], // NOSONAR(S5332): an RDF namespace IRI, never fetched; Wikidata's IRIs are http
});
