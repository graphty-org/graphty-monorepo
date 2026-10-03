# A node's neighbors with tie strength (decision item 4): persona review

Item 4 of element-api-decisions.md (lines 194-236) proposes
`session.data.neighbors(id, { direction, weight, sort, offset, limit })` returning
`RecordPage<{ node, edges, tie }>`. Each persona below was given a concrete task that needs it.
Every section stands alone. Paths are relative to the worktree root.

## Findings that cut across every persona

1. The element already says this verb must not be synchronous. The doc comment on
   `SessionDataApi` reads: "The verbs that walk a part of the graph -- id listings over a scope,
   neighbour pages, search -- are asynchronous by construction and are not part of this surface
   yet" (graphty-element/src/session/types.ts:376-378). Item 4 adds exactly a "neighbour page" as a
   synchronous method and never mentions that rule. Either the rule is wrong and must be deleted
   with a reason, or item 4 must be async. Today's closest code, `edgePage({ touching })`, scans
   every edge once per node per revision (graphty-element/src/session/data.ts:560-561, the
   `ponytail:` note), so "effort low" means O(E) per click unless a CSR walk is specified.
2. The element already has a neighbor API with a different vocabulary and different rules: the
   simple extension tier's `node.neighbors()`, `node.weightTo(other, path)` and
   `node.strength(path, direction)` (graphty-element/src/simple/view.ts:332-410). There:
   - direction is `"all" | "out" | "in"` (view.ts:407), and the selection's neighborhood target uses
     the same `"all"` (catalog/types.ts:885, selection/targets.ts:47). Item 4 says `"both"`.
   - the summed weight is called `strength`/`weightTo`. Item 4 says `tie`.
   - a missing weight is "never a zero": left out of the sum, counted, and warned about
     (view.ts:17-18, 482-498). Item 4's default reads the import's resolved weight, which is 1 for
     an edge with no weight (session/project/ingest.ts:87), so the same node gets two different
     sums from two element APIs.
   - a path nothing carries "fails loudly" (view.ts:19-20). Item 4's `weight: Path` is
     `string` (catalog/types.ts:69) with no stated failure, so a typo returns edge counts silently.
   - direction "is never guessed": directed accessors throw on a view built undirected
     (view.ts:14-16). Item 4 does not say what `"out"` does when `statistics().directedness` is
     `"undirected"`, `"mixed"` or `"unknown"` (session/types.ts:233).
   - `node.neighbors()` returns `NodeView[]`; `session.data.neighbors()` would return a page of a
     different record. One word, two shapes, in one package.
3. The page cannot tell the app what the tie IS. tier1-design.md:741-745 says the tie is labeled
   with the weight attribute's name ("value 17") and, with no weight, the list "orders by name and
   shows no value". The API default is `sort: "tie"` and a silent fallback to edge counts, and the
   page carries neither the path that was read nor whether any edge had a weight. To follow its own
   design the app must read `lastImport().weightsAttribute` / `weightsResolvedFrom`
   (data/report.ts:105-107) and decide -- the app deciding over graph data, which CLAUDE.md
   forbids. The page needs `weight: { path: string | null; missing: number }` (or similar).
4. No display label. `Neighbor.node` is the raw `NodeRecord`; the docs example's `n.node.name`
   works only for Les Miserables. Every consumer rebuilds the label rule (`nodeLabelPath`, then
   id), which item 3's `FindResult` already resolves as `label: string`. Item 4 must resolve it the
   same way, and `sort: "label"` must be defined as that label.
5. "17 connections" disagrees with the list. tier1-design.md:737-739 shows the chip from Degree
   (edge count) and the list headed "Javert's 17 connections". `total` counts distinct neighbors.
   With the default `repeatedEdges: "keep"` (config/DataConfig.ts:67) any multigraph -- the owner's
   door-entries data is one -- shows a chip of 400 over a list of 3.

## Data scientist porting a metric (plugin-author-data-scientist)

Task: validate his weighted influence score by checking, for one node, that the neighbor weights
he reads in the element match NetworkX's `G[u][v]["weight"]` and `G.degree(u, weight="weight")`.

- He meets two neighbor APIs. In his plugin he writes `node.neighbors()` and
  `node.weightTo(v, "weight")`; in the dashboard check he calls `session.data.neighbors(u)` and
  gets a page of `{ node, edges, tie }`. He searches the docs for "neighbors" and finds both, plus
  pages spelled "neighbour" that a search misses (docs/guide/extending/custom-algorithms.md,
  docs/guide/data-sources.md and eight others).
- On a file where some edges lack `weight`, `weightTo` leaves them out (view.ts:482-498) and
  `tie` counts each as 1 (ingest.ts:87). NetworkX's `degree(weight=...)` also counts missing as 1,
  so the plugin disagrees with Python and the panel agrees, or the reverse, depending on which he
  checks. He cannot trust either, which defeats his goal "numerically identical".
- Directed data read as undirected: under `"both"`, A->B weight 2 plus B->A weight 3 gives tie 5.
  NetworkX `to_undirected()` keeps one edge (2 or 3), never 5. Item 4 does not say which it does.
- `tie` is not a word he has; he searches for "weight".

## Researcher with a lab file (plugin-author-domain-researcher)

Task: load the lab TSV (bait, prey, confidence, replicate) and, for bait X, list the preys it pulled
down, highest confidence first, in a single HTML file with no type checker.

- Each replicate is a parallel edge. Item 4 sums them: three replicates at confidence 0.9 give a
  tie of 2.7, which is not a confidence. He needs max or mean, and there is no `aggregate` option,
  although the element already has the policies (`sum`, `min`, `max`, `first`, `last`,
  config/DataConfig.ts:9-17) at load time. Item 4 hard-codes `sum` as a one-way door.
- He types `weight: "Confidence"` (the header is lower case). Nothing fails; he gets counts and
  publishes a figure ranked by replicate count. The element's own rule for a path nothing carries
  is to fail loudly (view.ts:19-20).
- He prints `n.node.name` from the docs example; his records have `prey`, so every line reads
  `undefined 2.7`. No label field to copy instead.
- To get the bait's id he needs the click event; `e.detail` does not exist on the published type
  (the blind author's TS2339, `dist/src/graphty-element.d.ts:2188` extends only the tag map). He
  does not type-check, so it runs; but the docs do not name the detail shape either.

## Front-end developer integrating the element (plugin-author-frontend-developer)

Task: a "Related" side panel in the product: click a node, show its ten strongest connections by
display name, keep it fresh when data changes, type-safe.

- The words are graph jargon to her: "tie" is a sociology term ("tie strength") with no meaning in
  a component API. `weight` or `strength` is what she would autocomplete for.
- The types are only on `@graphty/graphty-element/session`; the root entry exports none of
  `Neighbor`, `NodeRecord`, `RecordPage`, and no guide names the subpath.
- The node id goes first here (`neighbors(id, ...)`) but in the options for `edgePage({ touching })`
  (session/types.ts:130-133). Sort is the string `"tie" | "label"` here but `{ key, descending }`
  on `nodePage` (types.ts:101-111). There is no `scope`, though every other page takes one
  (types.ts:119). Each is a compile error she hits by following the neighboring method.
- Freshness: `revision` is inherited from `RecordPage`, whose doc says a page is stale "once
  `nodePage` answers another" (types.ts:144-147). Whether neighbors shares that revision, and which
  `session.on` event to refresh on, is not stated.
- A stale id (the node was removed by an undo) has no stated behavior: throw, empty page, or
  `undefined`. `node(id)` returns `undefined` (types.ts:406-411); `nodePage` throws on bad ranges.
- No ascending sort, so "weakest ties" (a common churn panel) is impossible.

## Graph library author (plugin-author-graph-library-author)

Task: on a 1,000,000-node graph, show the neighbor list of a 50,000-neighbor hub in her layout's
demo panel while the layout runs, and read the same adjacency in her plugin.

- `sort: "tie"` (the default) must sum every incident edge of the hub before page one, and every
  page re-reads the deep-frozen `NodeRecord` of each neighbor. Item 4 says nothing about cost, a
  cache key, or whether it walks the CSR; the only precedent scans all edges
  (data.ts:560-561). Synchronous on the main thread, against the element's own rule
  (types.ts:376-378).
- `edges: readonly EdgeId[]` for a hub with heavy parallel edges is an unbounded array inside one
  record of a "paged" result; paging bounds the neighbors, not the edges.
- She compares with graphology (`neighbors`, `forEachNeighbor`, `edges(u, v)`) and Cytoscape
  (`neighborhood()`): both separate "who" from "how strongly", and graphology's attribute reader
  takes a getter. Item 4 fixes `sum` and a path, with no getter and no aggregate.
- The extension tier and the session tier disagree on missing weights and direction names (see
  cross-cutting finding 2); a plugin and a panel over the same graph show different numbers.

## ML engineer, recommendations (ml-engineer-recsys)

Task: explain a recommendation for a cold-start user: show the items the user touched, then the
items most co-purchased with those (two hops), weighted by interaction count, on a 5M-node
bipartite graph.

- One hop only. The selection's neighborhood already walks depth 1 to 3
  (selection/targets.ts:92-97); item 4 has no `depth`, so two hops means calling `neighbors` per
  first-hop item in app code and merging -- the "computing over nodes and edges" the app may not
  do, and it is his whole task.
- An item node with 200,000 buyers: see the graph library author's cost finding.
- He wants the result as features: per-neighbor tie for every user. The only path is calling
  `neighbors` 5M times, each building frozen records. No bulk or typed-array form is in scope, and
  item 4 does not say so or point to one.
- "Interaction count" needs `weight: false` -- but then `sort` by tie still works only as count;
  a time-decayed weight needs a derived column first, which item 4 does not mention.

## Knowledge graph engineer (knowledge-engineer)

Task: for the entity "Acme Corp", list who is connected by relationship type -- employees
(incoming `worksAt`), subsidiaries (outgoing `owns`) -- the way a SPARQL `?s ?p <Acme>` reads.

- Item 4 merges every edge between two nodes into one tie. A person who both `worksAt` and
  `founded` Acme gets tie 2: a sum of unlike predicates, which is meaningless in her schema.
- No edge filter: no `scope`, no edge selector, no "only edges where type == worksAt". She must
  fetch everything and then call `data.edge(id)` on each `EdgeId` to read the predicate -- an app
  doing the grouping the element should do.
- Under `"both"`, each `Neighbor` does not say whether its edges point in or out. Direction is the
  meaning of her edges; she must re-read every edge to recover it.
- Her graphs are often `"mixed"` directedness (types.ts:233); item 4 is silent on it.

## Analyst Alex (analyst-alex, app persona)

Task: in the graphty app, open the email network, click the VP, and answer "who does she write to
most, and who writes to her most" for a report; then the same for five other people.

- The app needs `direction: "out"` then `"in"`. Item 4 does not say what the counts mean on a
  graph whose directedness is `"unknown"`, so the app either guesses or hides the control.
- Email files often carry parallel edges per message and no weight column. The chip says
  "1,240 connections" (degree, tier1-design.md:737) and the list total says 38. Alex reports the
  wrong one.
- tier1-design.md:745 promises "with no weight, the list orders by name and shows no value". The
  page cannot tell the app that no weight existed (cross-cutting finding 3), so Alex sees counts
  labeled as a weight attribute that does not exist, or the app sniffs `lastImport()`.
- He wants the neighbors ordered by PageRank to see "important contacts". `nodePage` sorts by any
  key; `neighbors` sorts only `"tie" | "label"`, and item 5's result-path sort keys are not
  extended to it.
- Reproducible: order of equal ties is unspecified; two runs of the same report can list ties in a
  different order. `nodePage` specifies graph order among equals (types.ts:121-125).

## What to change before approval

- Resolve the sync-versus-async conflict with session/types.ts:376-378 in writing, and state the
  algorithm (CSR walk, cached per revision) and its cost.
- Use the element's existing words: `direction: "all" | "out" | "in"`, `strength` (or `weight`)
  not `tie`; take the node in the options (`{ of: id }`) or move `touching` to match; take
  `sort: RecordSort` and `scope` like every other page.
- Add a resolved `label` and, per neighbor, `in`/`out` edge counts; return the weight path that
  was read and how many edges lacked it; fail on a path no edge carries; match the simple tier's
  missing-weight rule.
- Add `aggregate: "sum" | "max" | "min" | "mean" | "count"` (reuse the repeated-edge names), or do
  not publish `sum` as the only behavior.
- Specify: self-loops (never a neighbor, as view.ts:12), A->B plus B->A under "all", text weights,
  a removed id, ties in equal order, and which revision/event refreshes the page.
- Make tier1-design.md's chip and list count the same thing, or label them differently.
- Type the `graphty-node-click` detail in `HTMLElementEventMap`, or the canonical example cannot
  compile.
