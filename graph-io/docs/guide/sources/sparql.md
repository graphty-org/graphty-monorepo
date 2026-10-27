# SPARQL

::: warning Experimental
Network sources are experimental: the source id `sparql`, its parameters and the facts it writes may
still change.
:::

The `sparql` source reads any SPARQL 1.1 endpoint: Wikidata, DBpedia, UniProt, a Fuseki, GraphDB or
Virtuoso server. You write a `CONSTRUCT` (or `DESCRIBE`) query; the triples it returns become the
graph. It works in Node and in browsers (a query is a plain form POST, so an endpoint that allows
other origins needs no extra headers).

<!-- generated:begin example:sources/sparql-wikidata -->

```ts
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
    predicates: ["http://www.wikidata.org/prop/direct/"],
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
```

<!-- generated:end -->

<!-- generated:begin output:sources/sparql-wikidata -->

```text
281 nodes, 200 edges
http://www.wikidata.org/entity/Q127944: Arthur Holly Compton
then 20 more nodes; complete: true
40 edges around http://www.wikidata.org/entity/Q127944
```

<!-- generated:end -->

## How triples become a graph

| Triple                                | Becomes                                                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| subject, predicate, IRI object        | an edge from subject to object; `type` is the predicate's local name (`P184`), `predicate` the full IRI         |
| subject, predicate, blank node object | the same, to a node whose id is the blank node's label (`_:b0`)                                                 |
| subject, predicate, literal           | an attribute of the subject named by the predicate's local name (`label`); numbers and booleans keep their type |

Node ids are the IRIs. The graph is directed. When a subject has several literals for one
predicate (a label in many languages), the first one kept wins; set `language` to keep the ones you
want.

## Parameters

| Parameter    | What it is                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `query`      | a `CONSTRUCT` or `DESCRIBE` query                                                                                              |
| `mode`       | `"query"` (the default when there is a query), `"all"` (every triple, paged) or `"neighborhood"` (the triples of `ids`)        |
| `ids`        | the seed IRIs of `"neighborhood"`                                                                                              |
| `language`   | keep literals in this language (`"en"`) or with no language; default every literal                                             |
| `predicates` | IRI prefixes that generated queries and expansions follow (`"http://www.wikidata.org/prop/direct/"`); literals are always kept |
| `pageSize`   | solutions per page, 1 to 10000, default 1000                                                                                   |

Pass the endpoint as `endpoint`; there is no default. A credential (`credentials.basic` or
`credentials.bearer`) is sent to the endpoint's origin only.

## Pages, Load more and expanding

- Paging: the source adds `ORDER BY` (the variables of your template), `LIMIT` and `OFFSET` to your
  query and reads page after page until a page comes back empty. With a cap (`maxNodes`), it stops
  after the page that reaches it and `report.source.next` is `{ offset }`: pass it as `cursor` to
  load the next pages. A query with its own `LIMIT` or `OFFSET` is sent as you wrote it, once.
- Expanding (`expandFromSource`): the triples whose subject is a seed (`VALUES ?s { ... }`, direction
  `"out"`) and whose object is a seed (`VALUES ?o { ... }`, `"in"`), both by default; `limit`
  (default 500) caps the solutions, and a capped one-hop expansion hands back a cursor for the rest.
  `depth` repeats it from the nodes found. `relationshipTypes` keeps edges whose `type` or
  `predicate` is listed.
- Checking for changes (`validateSource`): a hash of the first page, compared with the one the load
  recorded.

## Errors

| Code                | When                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `E_SOURCE_PARAM`    | a `SELECT` or `ASK` query (`reason: "form"`), a seed that is not an IRI (`"iri"`), a malformed `language` |
| `E_SOURCE_QUERY`    | the endpoint refused the query; `serverMessage` holds the start of its answer                             |
| `E_SOURCE_RESPONSE` | the endpoint did not answer N-Triples                                                                     |
