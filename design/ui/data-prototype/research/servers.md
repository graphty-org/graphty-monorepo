# Server sources: how they should load

Research notes for the data prototype. Covers how a graph loads from a server (Cypher, SPARQL, REST),
what comparable tools do for "initial query, then expand", Load more and Refresh, what graphty-element
and graph-io already do, and what is missing.

## 1. What other tools do

| Tool                     | Initial load                                                                                       | Expand                                                                                                              | More / paging                                         | Refresh                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| Neo4j Browser            | A Cypher query; the drawing is capped by "initial node display" (300 by default)                   | Double-click a node adds its neighbors, capped by "max neighbors" (100 by default)                                  | None: you edit the query and run it again             | Run the query again                                    |
| Neo4j Bloom              | A search phrase or saved query ("Search phrase"); capped by the "node query limit" setting         | Right-click a node or selection: Expand, with a submenu of relationship types and directions; Dismiss removes nodes | None; the limit is a setting                          | A "refresh data" command re-reads what is on the scene |
| Linkurious Enterprise    | Search, or a saved query/template, adds nodes to a visualization                                   | Double-click expands; the expand menu filters by edge type; a per-expand limit is configured on the server          | No paging; expand again                               | Reload a saved visualization from the database         |
| Graphistry               | A whole dataset uploaded from a connector, notebook or query (graph-app-kit, GFQL `hop()` in code) | No interactive expand from the server; filtering and hops run on what was uploaded                                  | Re-query in the notebook                              | Upload again                                           |
| Cytoscape + NDEx         | Import a whole network by UUID or search; "Query" a network for a neighborhood of chosen nodes     | NDEx neighborhood query (depth 1 or 2) as a new network                                                             | None: networks download whole                         | Re-import                                              |
| Cytoscape STRING app     | Protein query: identifiers + species + confidence cutoff + "max additional interactors"            | "Expand network": add N more interactors (optionally of a chosen type) to the current network                       | That expand IS its "more": raise the interactor count | "Change confidence" refetches the edges                |
| KeyLines / ReGraph demos | A query that returns a seed set                                                                    | Double-click expands, is the common default                                                                         | Rare                                                  | Rare                                                   |

Patterns that hold across them:

- The initial load is always a query (or search) with a cap. Nobody loads a big database whole.
- Double-click to expand is the dominant gesture (Neo4j Browser, Linkurious, KeyLines); Bloom uses a
  context menu instead. Both should exist: double-click for speed, the node context menu for the
  options (depth, direction, edge types, limit) and for Collapse.
- "Load more" in these tools is almost always "expand again" or "raise the cap", not "next page of
  the same query". Paging the initial query is unusual but cheap to offer where the protocol allows it.
- Refresh means "run the same thing again". Only Bloom-style tools apply the difference in place.

## 2. Paging and expansion per kind of server

| Source                                               | Paging ("Load more")                                                                                                                                                                                                                                                                                                                                                                                                                                  | Expansion (double-click)                                                                                                                                                                             | Freshness (Refresh)                                                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Cypher, mode "everything" (Neo4j, Memgraph, Neptune) | Keyset paging on the id expression (`WHERE key > $after ORDER BY key LIMIT n`, never SKIP), nodes then edges. Built (graph-io `cypher/query-builder.ts`).                                                                                                                                                                                                                                                                                             | Neighborhood statement over `$ids` with depth, direction, relationship types and limit; a capped expansion pages by neighbor key. Built.                                                             | Content hash of the canonical rows: Refresh-check re-reads everything (costly on a big graph). Built.                |
| Cypher, mode "query" (the reader's own query)        | NOT paged: the query runs once, `next` is always null, so Load more cannot work. Options: (a) wrap it, `CALL { <query> } WITH * SKIP $skip LIMIT $n RETURN *` (Neo4j 4.1+, Memgraph supports CALL subqueries; unstable without ORDER BY, so say so); (b) only page modes "everything" and "neighborhood", and make "more" mean expand. Recommend (b) for the prototype plus a cap on the query (`limits.maxNodes`), with (a) as an element follow-up. | Same as above: expansion does not depend on how the nodes were first loaded.                                                                                                                         | Content hash of the query's rows.                                                                                    |
| Cypher, mode "neighborhood" (seed ids)               | Not paged (one capped statement).                                                                                                                                                                                                                                                                                                                                                                                                                     | Built.                                                                                                                                                                                               | Hash.                                                                                                                |
| SPARQL (Wikidata, DBpedia, UniProt)                  | NO SOURCE YET (requirements: "no SPARQL source yet"). The protocol pages with `ORDER BY ... LIMIT n OFFSET k`; without ORDER BY offsets are not stable. Endpoints cap rows (DBpedia 10,000) and time (Wikidata 60 s), so pages must be small. Use CONSTRUCT (triples): an IRI object is an edge, a literal object is an attribute.                                                                                                                    | `CONSTRUCT { ?s ?p ?o . ?x ?q ?s } WHERE { VALUES ?s { <ids> } { ?s ?p ?o } UNION { ?x ?q ?s } } LIMIT n`, i.e. outgoing and incoming triples of the seeds; predicates are the "relationship types". | No validator in the protocol; a content hash, or the dataset's modified date where the endpoint publishes VoID/DCAT. |
| OpenAlex (REST preset)                               | Cursor paging (`cursor=*`, `meta.next_cursor`, per-page up to 200). Built.                                                                                                                                                                                                                                                                                                                                                                            | Built: citing works (in) and referenced works (out, hydrated by id); authors expand through their works.                                                                                             | Newest `updated_date`. Built.                                                                                        |
| STRING (REST mapping sample)                         | No paging: one call returns the network. "More" is STRING's own `add_nodes` (more interactors), i.e. a new load with a bigger number, as the Cytoscape STRING app does.                                                                                                                                                                                                                                                                               | `network?identifiers=<ids>&add_nodes=N` would expand, but the shipped mapping declares no expand. Add one.                                                                                           | Content hash.                                                                                                        |
| NDEx                                                 | No paging: a network downloads whole (CX2). Load more does not apply.                                                                                                                                                                                                                                                                                                                                                                                 | NDEx neighborhood query (`POST /v2/search/network/{uuid}/query`, depth 1 to 10, edge limit). Built.                                                                                                  | Summary `modificationTime`. Built.                                                                                   |
| Generic REST mapping (any JSON API)                  | Whatever the mapping declares: `cursor`, `offset`, `link-header`, `next-url`. Built (`rest/paging.ts`). In a browser a `Link` header must be exposed by CORS, else it fails loudly rather than loading one page silently.                                                                                                                                                                                                                             | Only when the mapping declares `expand` templates (`{ids}` batched, breadth-first). Otherwise the source has no expand, and the app must not offer double-click.                                     | ETag / Last-Modified / a modified field, else a content hash.                                                        |

So the answer to "Cypher and SPARQL can page and expand automatically; what about REST?":
Cypher and SPARQL can, because the server runs a query language whose LIMIT/ORDER BY and pattern
matching graph-io writes for the reader. REST can only do what the API offers: a mapping (or a
preset like OpenAlex) declares how its API pages and expands, and a source without those
declarations has no Load more and no expand. NDEx and STRING never page; their "more" is a
neighborhood query or a bigger interactor count.

Memgraph: speaks Bolt (no HTTP Query API), so it loads through graph-io's Bolt transport over a
WebSocket; `profileFromAgent()` gives a non-Neo4j agent `id(n)` ids. Not tested against Memgraph:
verify with a small bounded query only (the local Memgraph has no memory limit; never run a big one).

## 3. What graphty-element and graph-io already do

graph-io (`graph-io/src/sources/`), experimental contract in `types.ts`:

- A source has one read method (`records`, `file` or `import`) plus optional `expand`, `probe`,
  `list`, `validate`. Caps (`limits.maxNodes/maxEdges/maxBytes/maxRequests/timeoutMs`,
  `onLimit: "stop"`) stop a load and record `report.source.next`, a versioned cursor.
- Built-in sources: `ndex`, `cypher`, `neo4j`, `neptune` (Node only: no CORS), `rest`, `openalex`.
  Samples: Neo4j movies demo, Hetionet (neighborhood of Metformin, `whole: false`), STRING TP53,
  deps.dev webpack, OpenAlex Watts-Strogatz.
- Cypher `probe` returns only server facts (product, version, read-only). NDEx `probe` returns the
  summary (counts). REST `probe` makes one request.
- Error codes are neutral (`E_SOURCE_AUTH`, `E_SOURCE_BLOCKED` (CORS), `E_SOURCE_QUERY`,
  `W_SOURCE_LIMIT`, ...).

graphty-element (`session/data.ts`, `session/sources/`):

- `data.import({ source, config, name }, options)`: one undoable load; every node carries
  `_source.loads` (the keys of the loads and expansions that brought it).
- `data.testSource(input, options)` -> `SourceProbe` (probe only; no rows).
- `data.listSource(input, query)` -> a page of what the source holds (NDEx search).
- `data.expand(ids, options)` / `data.collapse(id)`: one undo step each; a capped expansion marks the
  node `_source.expansion = "partial"` with `_source.next`, and expanding it again continues from
  that cursor. `_source.degree` and `_source.hidden` (neighbors not yet loaded) where the source
  gives the degree free (Cypher).
- `behavior.expand` config: `trigger: "none" | "click" | "double-click"` (default none), depth,
  direction, limit, relationshipTypes, layout continue/none. `NodeBehavior.ts` already routes a
  double-click to `session.data.expand([id])` when the trigger is "double-click". Events
  `source:expand-start`, `source:expanded`, `source:expand-failed` (DOM: `graphty-source-*`).
- `data.more(options)`: the next page of the NEWEST load that has a cursor.
- `data.loadSample(id)`, `data.loads()` (load records: source, config, endpoint, pages, next,
  validators, credential identity, expansions), `pendingSourceLoads()` / `runPendingSourceLoad(id)`
  (an opened project never queries by itself), `sourceMember()` for the project file.
- The graphty app uses none of this yet (no calls to `testSource`, `expand`, `more`, `loads`).

## 4. What is missing, per owner request

All additive, non-breaking; they belong in graphty-element (and graph-io where the protocol work is).

### Test returns live sample rows

- Missing: `testSource` returns server facts only. The reader cannot see data before loading.
- Add `data.previewSource(input, { maxNodes?: number /* e.g. 25 */ }) -> SourcePreview` in
  graphty-element: runs the read with `limits: { maxNodes, maxRequests: 2, onLimit: "stop" }` into a
  throwaway builder (graph-io `loadFromSource` already does this), changes nothing in the graph, and
  returns neutral facts: `{ nodes: NodeRecord[], edges: EdgeRecord[], columns: { name, dtype, role? }[],
more: boolean, server, issues: { code, params }[] }`. The app shows it as the table preview in the
  source form (node and edge chips, same table component as the data dock).
- graph-io gap for Cypher mode "query": the reader's query runs whole; a cap stops only after the
  result arrives. Preview needs the cap sent to the server: wrap the query
  (`CALL { <query> } WITH * LIMIT $n RETURN *`) when previewing. Without that, preview of a big
  query is as expensive as the load.
- SPARQL has no source to test at all.

### Expand nodes on double-click

- Mostly built: `behavior.expand.trigger = "double-click"` plus `data.expand` / `data.collapse`.
- Missing: (1) the trigger is global, so "expand on double-click" cannot be a per-source option in
  the source form. Either the app sets the global config when any expandable source is loaded (fine
  for the prototype: the element already expands each node from the source that loaded it and
  ignores file nodes), or add an optional per-load `expand?: ExpandBehavior` to `SourceLoadOptions`
  recorded in the load record. Prefer the per-load option (two server sources may want different
  depths and limits).
  (2) The app cannot tell whether a source can expand: built-in descriptors declare no `features`,
  and `features` is only computed from methods once the source code is loaded. Add `features` to the
  built-in descriptors (ndex, cypher, neo4j, neptune, openalex: expand/probe/validate; rest: depends
  on the mapping) or expose `canExpand(nodeId)` on the session.
  (3) Node context menu items Expand... (depth, direction, edge types, limit) and Collapse, and a
  "has more" mark from `_source.expansion`/`_source.hidden`: app work, data already exists.
  (4) STRING mapping declares no expand; SPARQL has none.

### Load more

- Partly built: `data.more()` continues the newest load with a cursor.
- Missing: (1) no way to say WHICH load: add `data.more({ load: key })` (default stays "newest").
  (2) Cypher mode "query" never has a cursor, so the most common server load (a query) cannot load
  more. Either page the wrapped query (SKIP/LIMIT, unstable without ORDER BY) or define Load more on
  a query load as "run again with a larger cap and merge" (what Neo4j Browser users do by hand).
  Recommend the second: simple, correct, and the merge keeps nodes already placed.
  (3) A capped expansion's continuation lives on the node (`_source.next`); "more" for an
  expansion is double-clicking the partial node again. Fine; document it.
  (4) A neutral count for the source row ("5,000 of 40,000"): `countFirst` exists on Cypher
  (`progress` total) but the load record does not keep the total. Add `total?: { nodes?, edges? }`
  to `SourceLoadRecord`.
  (5) An "auto" option (keep paging until a cap) needs nothing new: `limits.maxNodes` with no
  per-page stop already pages until the cap.

### Refresh

- Missing in the element entirely (requirement 48: "no").
- Building blocks exist: every built-in source has `validate` (NDEx modified time, OpenAlex
  `updated_date`, REST ETag/modified/hash, Cypher content hash), each load record keeps its
  `validators`, `pages` and `expansions`, and `runPendingSourceLoad` re-runs a recorded load as a
  merge with `existing: "update"`.
- Add `data.checkSource(key) -> SourceFreshness` (wraps graph-io `validate`; the app shows a
  "changed" dot on the source row) and `data.refresh(key) -> { added, removed, updated }` that
  re-runs the load for as many pages as it read (`record.pages`; `runPendingSourceLoad` reads only
  the first page today) and replays its expansions, then applies only the difference, removing
  rows the source no longer has and that no other load brought (`_source.loads`), as ONE undo step.
- Note: Cypher's validate re-reads all rows to hash them, so "check" costs as much as a refresh on a
  big graph; the app should offer Refresh directly and treat the check as optional.

## 5. Recommendation for the prototype UI

- Server source form (left sidebar, + Source > Server): kind (Neo4j / Memgraph / SPARQL / NDEx /
  OpenAlex / REST mapping), endpoint, credential, then property rows: Start (Query | Seed nodes |
  Everything), the query editor or seed ids, Limit (default 500), and a chip toggle "Expand on
  double-click" with depth / direction / edge types / limit in its pop-over. Test runs
  `previewSource` and shows 25 rows in a small node/edge table under the form, plus server facts.
  Load runs `data.import`.
- Source row: name, node and edge counts as chips ("500 of 40,000" when the total is known), a
  "changed" dot, and buttons Load more and Refresh; the row menu holds Edit query, Remove, Check for
  changes.
- Node context menu (canvas): Expand..., Collapse; a "has more" badge in the inspector from
  `_source.hidden`.
- Hide what the source cannot do: no Load more on NDEx and STRING (no paging), no expand on a REST
  mapping without `expand`, nothing server-related for file sources.
