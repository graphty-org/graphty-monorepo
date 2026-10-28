import { expandFromSource, loadFromSource } from "@graphty/graph-io";

// physics Nobel laureates and their doctoral advisors, from Wikidata
const query = `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
CONSTRUCT { ?person wdt:P184 ?advisor . ?person rdfs:label ?name . ?advisor rdfs:label ?advisorName . }
WHERE {
  ?person wdt:P166 wd:Q38104 ; wdt:P184 ?advisor ; rdfs:label ?name .
  ?advisor rdfs:label ?advisorName .
  FILTER(lang(?name) = "en" && lang(?advisorName) = "en")
}`;
const params = {
    query,
    pageSize: 100,
    language: "en",
    predicates: ["http://www.wikidata.org/prop/direct/"], // NOSONAR(S5332): an RDF namespace IRI, not a URL that is fetched
};
const endpoint = "https://query.wikidata.org/sparql";

// stop after about 150 nodes; report.source.next says where the next page starts
const first = await loadFromSource("sparql", params, { endpoint, limits: { maxNodes: 150 } });
console.log(`${first.snapshot.nodeCount} nodes, ${first.snapshot.edgeCount} edges`);
const id = first.snapshot.ids.idOf(0);
const i = first.snapshot.ids.requireIndex(id);
console.log(`${String(id)}: ${String(first.snapshot.nodes.value("label", i))}`);

// load more: the next pages, from the cursor
const cursor = first.report.source?.next;
const more = await loadFromSource("sparql", params, { endpoint, limits: { maxNodes: 150 }, cursor });
console.log(`then ${more.snapshot.nodeCount} more nodes; complete: ${String(more.report.source?.next === null)}`);

// expand the first node: its direct claims, and the triples that point at it
const around = await expandFromSource("sparql", { params, ids: [id], limit: 40 }, { endpoint });
console.log(`${around.snapshot.edgeCount} edges around ${String(id)}`);
