# Element contract

This document states how graphty-element publishes the concepts defined in `conceptual-model.md`:
the identities, addresses, record fields, retention rule, expression language and file shape that
a consumer, a saved project file and the graphty app all depend on. The conceptual model says what
exists and how it behaves; this document says what graphty-element must publish to make that true.
Every row here that fixes a published name or shape is listed in `one-way-doors.md`, either as a
door the owner decides or under "Decided, and not doors". This document owns the exact semantics
the conceptual model cites (filter composition, windows, the record, freshness); where it and the
sets or undo designs disagree on element behaviour, those designs win.

The current state of graphty-element is taken from `research/graphty-today.md`, cited by section.

## 1. Project and sessions

- A **project** is a new published object in `./session`. It holds graph entries by an
  element-minted **graph id**, each with its data versions and one session; one undo history; one
  append-only operation log; a metadata block (title, description, authors, license); and an
  **author** string the consumer sets (`project.author = "..."`). graphty-element records the author
  as given and never authenticates it; a headless consumer that sets none records none.
- **Every session belongs to a project.** A bare `createGraphSession()` creates an implicit
  one-graph project, and `session.history` (designed as issue #427, `research/graphty-today.md`
  7.11) is a view onto the project's history filtered to that graph. `<graphty-element>` exposes
  `element.project` beside `element.session`, the session it shows. A single-graph consumer never
  has to touch the project.
- **Comparison** is an element object: `project.compare(a, b, { match })` over two graph entries,
  two data versions or two windows. It publishes the list of differences, the match report
  (matched, only in A, only in B) and aligned positions, and graphty-element renders both panes with
  linked selection. It reads two sessions and owns neither. This is the designed
  `createComparison({ a, b, match })` with `copyPositions` and `onlyIn`, which does not exist in
  the source yet (`research/graphty-today.md` 7.5). A comparison is transient; Save comparison adds
  a run, with a record, to a comparison result that belongs to the **project**, never to one graph
  entry, because its operands may span two. Only saved comparisons are in the file. The other
  operands the conceptual model gives Compare with... are element needs (section 13).

## 2. Identities

**The identity rule.** Every stored key is either minted and persisted, or canonical in content
(a key from the file, the smallest member, the elements a match binds). No stored key is an
ordinal, with the one exception below.

- **Node**: the node id from the imported data. Ids of different types stay apart, as
  graph-format's mixed id map keeps them. **Open for the owner:** whether a declared node type is
  part of the identity. Recommended: once endpoint columns declare different node types (a
  user-item log, author-paper data), the identity is (node type, id), and the import report counts
  the ids that occur under more than one type; with no declared types, the id alone. This is a
  one-way door because changing it later re-keys every saved project. Wherever an order is needed ("smallest node id",
  the ends of an undirected edge), ids are ordered by (id type, id value). A set's member list, its
  revision and the per-node hash column all key a node by its `NodeId`, so the answer must be given
  before the first project file is written: a member list written without a node type cannot be
  given one later.
- **Edge**: the edge id from the file when it has one; otherwise (source, target, key), with the
  ends ordered when the graph is undirected. The key is the file's key field when present;
  otherwise the **ordinal**, which is the one exception to the identity rule: the edge's position,
  in ingest order, among **every** edge of its pair in the load that ingested it, stored with
  **among**, that pair's edge count in that load. Counting every edge (not only those without an
  id) means configuring an id later never moves an ordinal, and counting per load means replacing
  one source never shifts another's. An ordinal reference binds only when exactly one edge carries
  its pair, ordinal and count; otherwise it reads missing ("ambiguous parallel edge") and never
  binds a different edge. The import report says when it applies ("N parallel edges without ids:
  references to them match by position"), which needs a published import-report field
  (`one-way-doors.md` 3). An edge added in the session gets an id minted in the reserved `graphty:`
  namespace (`graphty:e<n>`), so ordinals only ever cover file edges. graphty-element 2.x reads a
  file edge id only at a configured `edgeIdPath`; defaulting it to the format's declared edge-id
  field (GraphML, GEXF) changes how existing loads merge repeated edges, so it waits for the major
  version that ships the project file. After Add data, the source column (the reserved name
  `graphty.source`, stamped at import) is part of the key, so two sources' edges between
  one pair stay apart. Combine, a transform, is the one operation that matches edges across
  inputs by their ends: its output graph's edges are identified by (source, target), ordered on a
  directed graph and unordered on an undirected one (`conceptual-model.md` 4.7).
- The counter graphty-element mints today, which restarts on every load
  (`research/graphty-today.md` 1.4 and 7.15), may remain an internal handle inside one session and
  is never written to the file. Without this, every stored reference to an edge re-attaches to a
  different edge after a save and reopen, with no error.
- Ids graphty-element creates (a contracted node, the edges a merge rewires, a derived graph's
  elements) come from a reserved namespace, are written to the file and get forwarding or
  derivation entries.
- An item key that names a node (a component by its smallest node id) resolves through the
  forwarding map like any other stored id.
- **Sets** get an element-minted id with the prefix `set_`, opaque after it, never reissued within
  a project: the project keeps one register of every id it has issued, which undo never rewinds.
  Sets imported from another project keep their ids under a namespace (`set_<ns>.<rest>`), so no
  reference or derived run id is rewritten.

## 3. Results and runs

- **Result kinds publish how they accumulate**: a field `accumulates: "current" | "all"` on each
  kind. Reading kinds (metric, partition, graph statistic, series) are `current`; query kinds
  (path family, flow, pair list, comparison) are `all`.
- **The result id is a name.** When the caller gives no `as:`, graphty-element mints it at the first
  run by the published derivation (a canonical form and an FNV-1a digest,
  `research/graphty-today.md` 7.11). For a `current` kind the derivation covers the algorithm,
  whether it is exact or sampled, the frozen scope definition and the source nodes. For an `all` kind it covers the algorithm
  only: the scope is recorded on each query run, not on the result, so every shortest-path query
  lands under one result however the filter changes between queries. The id is never recomputed
  afterwards, and from then on the rules for an author-assigned id govern it (7.22). For a
  `current` kind the digest takes the frozen scope definition, never the symbol (the filtered graph,
  `"visible"`), so two unscoped runs under different filters are two results.
- **Starting a run resolves one way**, in the API as in the UI. For a `current` kind: if a result
  of that algorithm exists over the same frozen scope and the same source nodes, identical
  parameters return it without recomputing and different parameters add a run to it and make that
  run current; otherwise the run makes a new result. For an `all` kind: the run is the next query
  under the algorithm's one result, with its own frozen scope in its record. "Run as new result" makes a
  new result whose id carries a collision suffix. **Honoring run scopes depends on this rule.**
  Today's derivation hashes the scope as the caller wrote it, so an unscoped run hashes the keyword
  `"visible"`; while every run computed over the full graph that did not matter. Once scopes are
  honored, the same unscoped call under a different filter re-executes the existing run in place,
  and every style layer bound to its id silently repaints from a different graph. So scoped
  computation must not ship without hashing the frozen scope definition. Parameters, seed and sample size belong to the run,
  never to the result id; whether the method is exact or sampled belongs to the result id, so a
  sampled run is always a sibling result ("Betweenness (sampled)") and never the current run of an
  exact one. This changes the meaning of "same definition, same id" to "same
  algorithm and scope, same id" (or "same algorithm" for an `all` kind); no consumer has saved a
  derived id yet (7.11), so this is the moment to change it.
- **The cost estimate** comes from graphty-element for any command that starts runs, including
  Replace data's replay: a band ("under a minute", "a few minutes", "under an hour", "hours", "over a day") from its cost
  model,
  whose error band is documented beside the model, and a time only when a run of that algorithm
  on the same engine was measured. The app shows it and never computes it.
- **The run queue** belongs to graphty-element, so every consumer gets the same order. Runs start
  in start order, one at a time, except that a run whose estimate is under a minute starts at once
  beside a running run estimated at "under an hour" or more, instead of waiting behind it. A run
  that waits has status `queued`. Cancelling a queued or running analysis run sets `canceled`,
  leaves no result and no undo step, and keeps its record in the log marked canceled. The policy is
  published (`principles.md` 2) and its reason is workflow evidence: "Hub Gene Identification and
  Ranking" starts several centralities in a row, and one all-pairs run can take hours.
- graphty-element mints a **run id** per execution, unique and persisted, used by citations,
  comparison, item addresses and the log.
- **Reading paths.** `results.<result id>.<field>` resolves through the current run for a
  `current` kind, and over the union of the drawn queries for an `all` kind (an edge's `onPath`
  is true when it lies on any drawn path). `results.<result id>.runs.<run id>.<field>` reads one
  run.
- **Re-run** of an existing result adds a run under that result id, with its own frozen scope,
  whatever the current filter, and makes it current, so what follows the result repaints and the
  earlier run stays as the baseline. The resolution rule above governs only a run started from the
  catalogue. A **sweep** adds one run per parameter value under one result, and a run over a list
  of scopes is one run whose per-scope values are item attributes.
- **Rebind** is one atomic, undoable operation: make a run current under an existing result id
  and keep the earlier run (7.22). It returns the grouped list of what stays on the earlier run
  and what "Carry over to new run" would move, split or leave, which is the same list the UI
  shows.

## 4. The item address

The item address: (graph id, result id, run id, level where the result has levels, item key), or
(graph id, attribute path, value) for a category. Its published form is `ResultItem`: a result
reference, an optional run reference (present: it holds that run; absent: it follows the result's
current run, allowed only for items whose key means the same in every run, never for a partition
group), and an `ItemKey` (`{ field, value }`, matching by equality or array containment; keys that
name content, such as a component by its smallest node id or a match by the elements it binds, are
added later). Graph and level are optional fields added when a second graph or levels arrive. The
field names are an owner decision tied to `one-way-doors.md` 7 and 8: `{ result, run?, key }` if
results and runs split, since a field named `run` holding a result id would invert the vocabulary
in every file. When a result is re-run, graphty-element captures the members of every item a live
reference holds and stores the capture with the new run, so a holding reference keeps its members
after a save and reopen. The attribute path includes the scope of a
bound attribute (section 9), so component membership bound over the full graph and over a working
set are two attributes with two sets of items. Notes and kept sets bind the full graph's
always-available attributes. Freshness is derived when the address is read and is never stored in it.

## 5. The record and the operation log

One record shape serves every operation. Its fields:

- **From what**: the frozen graph reference, the source nodes, the columns read with their
  revisions, the sets read with their revisions, and for a pair-producing operation the
  candidate-pair definition (source nodes by target set).
- **By what**: the operation and its version, the **engine** (CPU, or WebGPU with its adapter
  class), in the additive `Run.accelerator`; the published `Run.engine` holds package versions
  and becomes `Run.versions` (`glossary.md` 17, item 7), the parameters, the
  random seed, the edge reading (which column filled which weight role and with which conversion,
  direction, parallel-edge and self-loop treatment), the normalization, exact or estimate with its
  sample size, a declared output cap, and "re-run of".
- **By whom and when**: the project's author string, start and finish times.
- **Is it still true**: freshness and status, as separate fields (section 7).

Whether a run is **deterministic** is declared in the algorithm catalogue per (algorithm,
algorithm version, engine), never assumed. GPU reductions are not bitwise reproducible against the
CPU path or across adapters.

**Which operations write a record**: an operation that changes data or the data's declared
semantics (a data operation, Add attribute, Declare), or computes values (a run, a layout run, a
transform, Profile groups, Save comparison, Apply recipe). Selection, set, filter-step, style,
view and note edits write none. A record's key is its **record id**; a run id is one kind.

The **operation log** is append-only, keyed by record id. Undo and redo of an operation that has a
record append entries that name what they reverted, with the author and time; undoing one that
has none appends nothing. An undone run leaves its result and the canvas; its record stays in the
log, marked undone. The methods text is written from the current state; the full log is read
under Details.

## 6. The frozen graph reference

(graph id, data version, scope definition, membership digest).

- The scope definition copies each data step inline, as it stood when the operation started. A
  named set used as a step is recorded as (set id, definition revision), so no member list is ever
  copied. Editing the set bumps its revision.
- The digest is over the node ids and edge identities of the scoped subgraph (an order-free sum
  of per-element hashes kept as columns, so it costs one pass and builds no strings); the reading
  (induced, listed or clipped) is recorded beside it. It is promised to reproduce after a save and
  reopen of a file that embeds the graph, because the hash, ordinal and minted-id columns are
  written with it; comparing across a re-import from source or across copies of a project is a
  later digest version, and a version mismatch reads as unknown, never as a change.
- A recorded scope is re-evaluated only when an input it declares changes: the topology revision,
  a column revision, a set revision or a weight role. It is never re-evaluated on every edit. This
  needs the per-column revisions graphty-element does not keep today; today freshness is a digest of
  node and edge ids only, so a weight edit leaves a weighted run looking current
  (`research/graphty-today.md` 7.27).
- **Migration.** Today every run executes over the full graph whatever scope it records
  (7.7), so honoring the scope changes the values of existing default runs.

## 7. Freshness and status

- **Freshness** (`freshness`): `current`, `out-of-date`, `cannot-rerun`, `detached`,
  `unresolvable` (screen: "Cannot evaluate"), an open union, carried by sets, rules, style layers,
  filter steps and references (`SetStatus.freshness` on the sets branch). A run carries only
  current or out of date, today the flag `RunEntry.stale` (`undo-design.md` 3.1). Separate from
  **status**: queued, running, succeeded, failed, canceled. A set's status also lists `reasons`
  (a cycle, an unknown kind, a missing run, an ambiguous parallel edge, values not kept) whatever
  its freshness.
- Published companion fields: **`scopeDiffers`** (the recorded scope differs from the current filtered graph),
  **data version** (compared with the current one), **values kept**, and, on a holding reference,
  **earlier run**. Which one the UI shows is a display rule (`conceptual-model.md` 7.2), not part
  of the contract.
- **A detached reference resolves through the deleted object's tombstone**: its id and name are
  kept forever, and its full record is kept while anything references it (section 8). A style
  layer naming a deleted set keeps painting what it painted and a filter keeps filtering, so
  deleting a set never blanks a layer or empties the screen. It resolves to nothing only for a
  reference to an object that was never issued, which the doors refuse.
- **Restore of a detached dependent** reinstates the deleted result or set from its record
  (`sets.restore(id)` for a set), with the values the dependent still holds, and recomputes nothing;
  the dependent then reads current again. Its screen verb is "Restore run" or "Restore set"
  (`glossary.md` 9, 10). A detached dependent counts as a holder of the deleted run's values for
  retention.
- Detached is derived when read, from the tombstone of what the dependent names, and is never
  stored and never inferred from an empty match. Today a saved scope whose run was removed keeps
  answering with its old members and says nothing (`research/graphty-today.md` 7.19).

## 8. Retention

Records are kept forever. Values are kept for:

- each reading result's current run, and each drawn or kept query run;
- any run that is cited, compared, pinned by a reference or held by a detached dependent, marked "Always store values", or on the undo
  stack within its memory cap;
- the runs that were current on the previous data version, until the next Replace data, because
  "what changed since last week?" is the reason Replace data keeps versions.

Otherwise a run whose catalogue entry declares it deterministic for its recorded algorithm
version and engine drops its values and shows "Values not kept", restorable by one action. Any
other run keeps its values. A record counts as a reader of the columns it names, so the inputs of
a dropped run are always held and a restore is always possible; the cost is that an earlier data
version keeps the columns its records name. A restore under a different algorithm version or
engine is labelled "recomputed with version X" and is a new run, never shown as the old values.

A deleted set leaves a **tombstone**: its id and name, kept forever, and its full record, kept
while any live style layer, filter step, rule set, note, view, layout scope or run whose values
are kept names it, and dropped once nothing does. A byte cap that drops the oldest record first
was rejected: it could drop the one record a visible Detached mark needs, and "Restore set" would
then fail. An assistant that creates and deletes sets it never used still cannot grow the file,
because an unreferenced record is dropped.

An earlier data version keeps its id map, its topology as a delta against the next version, and
the columns something kept reads. Stored positions fall under the same rule. A metric run costs
280 to 390 bytes per node, so twenty kept runs at 100,000 nodes are 0.5 to 0.8 GB (7.22).

## 9. One set grammar and the expression language

**One set definition.** graphty-element publishes four grammars for "which elements" today:
`Scope`, `Selector`, `SelectionTarget` and `Filter` (`research/graphty-today.md` 1.7). The
contract has one shape, the **set definition**, spelled `{ kind: "fixed", nodes, edges?, reading:
"induced" | "listed" } | { kind: "rule", where: Query | RuleTree, reading: "induced" | "listed" |
"clipped", scope? } | { kind: "path", nodes, edges?, directed? }`, where the rule scope is the graph
the rule reads (absent: the full graph, wherever the rule is stored, `sets-design.md` 4.3; a
filter step decides what it reads through its own `input`, never through its rule; the sets branch
reserves the field as `within`, and `scope` is recommended in `one-way-doors.md` 11) and a path's `edges` name, per step, the
edge taken (or a group only where the algorithm used a group). A layer selector, a filter step, a
selection target and a run scope accept the published `Scope` reference, whose `{ set: SetId }`
names a kept set and whose `{ define: SetDefinition }` carries an inline one. Members are stored
by stable identity (node id; edge id, key, or ordinal with count), never by row or session
counter, in one canonical form, and a definition's revision is a versioned digest of that form. Run scope forms: a set, the filtered graph (`"visible"`), the full graph (`"graph"`), the search
graph (`"search"`), without a set, and a list of scopes (each item of a result, without each
item, the members of a set one at a time, with or without each, a list of windows, the graphs of
the project, the two sides of a comparison, K null-model samples). The published names, and how today's four grammars
map onto the set definition, are in `glossary.md` 17, item 1.

**The rule tree** (`RuleTree`) is today's `Filter` tree, and every node keeps the published `kind`
discriminant, so an exhaustive `switch (node.kind)` covers the new leaves:

- the published leaves, kept as they are: `all`, `any`, `not`, `expression`, `edges`, `range`,
  `categories`, `degree`, `component` and `neighborhood` (whose start nodes stay in the published
  field `seeds`, and which gains optional edge types and a `direction`, `"in" | "out" | "all"`,
  default `"all"` because it counts hops both ways today, `src/session/visibility/filter.ts`;
  `one-way-doors.md` 24); the always-true rule is `{ kind: "all", of: [] }`;
- membership: `{ kind: "member", of: Scope }`, the members of a set, path or inline definition. It
  speaks edges only when the referenced set is read listed or clipped, so swapping an inline rule
  for a reference to a set holding it changes nothing another leaf sees. The sets branch spells it
  `{ kind: "scope", scope }`; the rename is recommended so "scope" keeps one meaning, what
  something reads (`glossary.md` 14);
- one item of a result: `{ kind: "item", item: ResultItem }`;
- presence: `{ kind: "has", path: FieldPath }`;
- a threshold, absolute or relative: `{ kind: "threshold", path, top?, above?, percentile?, z?,
population? }`, keyed on a value path (`results.<id>.<field>` or `data.<field>`), so "top 10 by
  revenue" and a threshold over an imported score column need no run; exactly one cut value set;
  `percentile`, `z` and `population` are reserved until built;
- a text search: `{ kind: "text", text }`, replacing `SelectionTarget { text }`;
- a time window: `{ kind: "window", attribute, from, to, nodes: "endpoints" | "own-times" }`,
  half-open as `TimeWindow` is. When times sit on edges the window keeps the edges active in it,
  and `nodes` states whether its nodes are the ends of those edges or carry their own times,
  because density across a series of windows means nothing unless that is fixed. With
  `"own-times"`, an edge is in the window only if it and both its ends are, so a window is always a
  graph.

**The filter steps.** Filters are an ordered list of steps, each `FilterStep = { id, set: Scope,
outcome: "filter-to" | "filter-out", input?: "previous" | "full", workingSet?: boolean, enabled }`,
where `input` (default `"previous"`) is what the step reads, so the rule it holds keeps one meaning.
A step with `input: "full"` evaluates its predicate on the full graph and then applies to the
previous step's output: `"filter-to"` intersects, `"filter-out"` subtracts; it never brings back an
element an earlier step removed. An edge-only step keeps the nodes it isolates; removing them is
its own step;
`workingSet` exists only when `outcome` is `"filter-to"`, and the type enforces it. The list is
`session.visibility.steps` with `add`, `move`, `remove` and `setEnabled`. `visibility.set(filter)`
stays as a deprecated shorthand for a one-step list, and `setWindow(window)` as a shorthand for one
window step. graphty-element computes the search graph: the steps before the first working set, plus
every later **local** step, and publishes it as the scope keyword `"search"`. A step is local when
none of its leaves reads topology (component, degree, core number, neighbourhood) or the members of
a set defined by one; a local step gives the same answer on any input, so it binds searches wherever
it sits, and two commuting steps never give two different shortest paths. A structural step after
a working set belongs to that investigation and is lifted with it, so a k-core taken inside a
neighbourhood keeps its meaning (`one-way-doors.md` 11). What searches may reach is enforced here,
never in a client: Select neighbors, paths between named endpoints (each a node or a set), the
neighbourhood leaf, and any algorithm whose catalogue descriptor declares it a search (recommended
field, `one-way-doors.md` 30). Find reads the full graph and reports a hit outside the search graph
with the step that excludes it, never selecting it.

**The expression language starts from what is published.** `Path` and `Query` are JMESPath strings
(1.4), and every selector, saved scope and StyleDocument writes `results.<id>.<field> == ...` in
JMESPath. JMESPath stays for paths and plain predicates. What it cannot express is added as
structured JSON forms, not new syntax:

- thresholds, absolute and relative (the `threshold` leaf above);
- a comparison against another element's value (`device = device of account A`);
- arithmetic for expression columns: `{ expr: [op, ...args] }`.

The forms are published in `./schema`, which stays free of Babylon.js, Lit and the DOM. A set
definition embeds a JMESPath `Query` where one suffices, so existing saved documents stay valid.
Aggregates over a node's neighbors are algorithm runs, not expressions, because they read
topology and need a scope and a record.

**Reserved roots.** `results` (today's `RESULT_ROOT`, 1.6) and `data` (imported and authored
attributes, `ATTRIBUTE_PREFIX`) are the path roots in use, and every door that takes a path refuses
any other root now, so `graph` can be added later without changing what a stored path means.
`runs` is a reserved field name under a result, enforced by a catalogue check. Because attributes
live under `data.`, an imported column called "graph" is `data.graph` and cannot collide, so no
column is renamed on import. Membership is never a path root: it is the `member` leaf, not a
second grammar inside JMESPath. When added, `graph.<measure>` reads an always-available
measure live, over whatever scope the reader has (a rule's scope, the previous pipeline step's
output), and the `threshold` leaf accepts it, so "top 10 by degree" needs no run. A binding of one
of these measures (a style layer, a table column, an export) binds a run instead
(`conceptual-model.md` 3.4).

## 10. Published names

Every published name in this document is spelled as `glossary.md` spells it; the glossary is the one
authority for names, and this document for shapes and behavior. The published names that must
change (the set definition and the four grammars it replaces, `SetOp` becoming `SelectionOp`,
`Path` becoming `FieldPath`, `Caveats.notes`, `WeightMeaning`, the `community` shape, the
catalogue's display labels and `Run.engine`) are the one-way doors in `glossary.md` 17.

**Events.** Sets publish a per-set `set:changed` event (created, updated or removed, with the
fields touched, the record after the change and the cause), as style layers publish
`style:changed`: a sets list needs per-id changes that a project-wide change event does not carry.
It fires once per changed set when a write seals, after the repaint passes, and nothing depends on
it for correctness. Its `cause` is an open union that gains `"undo"` and `"redo"` with undo.

## 11. The file

Per graph entry, a **graph part** (the current data version's frozen topology, imported columns,
declared roles; earlier versions as id maps, topology deltas and held columns) and a **session
part** (results, runs with their held-item captures, sets (paths among them), authored, joined,
corrected and computed columns with joined source tables, positions and stored positions, layout settings, style layers, notes, views (the type `SavedView`), kept
comparisons, forwarding and derivation maps, the operation log). At the top level, beside the
graph entries: the project-wide register of issued set ids and the tombstones of deleted sets
(set ids are unique across the project's graphs), a version number and a tolerant reader. The container, extension and media type are a one-way door in `one-way-doors.md` 1. A whole-document save is 58 MB and about 290 ms at 100,000 nodes, the changing state 3.6 MB
and under 1 ms (`research/graphty-today.md`, autosave follow-up). The graph part also carries
graphty-element's reserved columns, which a reopen needs to rebind stored edge members and
reproduce digests: the stable edge id (the file's id or a minted `graphty:e<n>`, never the session
counter, which 2.x snapshots already publish as `graphty.edgeId`, so this column's name is decided
with `one-way-doors.md` 3), `graphty.edgeOrdinal`,
`graphty.edgeAmong`, `graphty.nodeHash`, `graphty.edgeHash`, and the graph attribute
`graphty.edgePairsOrdered`. Metric columns and stored
positions are stored as float32; float64 costs as much as the positions at 1,000,000 nodes (line
2293). The camera a view holds is a Node-safe type exported from `./session` or `./schema`, so a
headless consumer can build views (7.21).

## 12. Contract table

"Survives reopen" means the identity is the same after a save and reopen of the same data.

| Concept                                       | Identity minted by                                                | Survives reopen | Liveness                                                                                                                                                                 | In the file                                                | Session API             |
| --------------------------------------------- | ----------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ----------------------- |
| Project                                       | element                                                           | yes             | -                                                                                                                                                                        | the file                                                   | yes, new                |
| Graph entry                                   | element (graph id)                                                | yes             | -                                                                                                                                                                        | top level                                                  | yes                     |
| Data version, with record                     | element, sequential                                               | yes             | frozen                                                                                                                                                                   | graph part                                                 | yes                     |
| Node                                          | imported data                                                     | yes             | -                                                                                                                                                                        | graph part                                                 | yes                     |
| Edge                                          | imported id, or (source, target, key)                             | yes             | -                                                                                                                                                                        | graph part                                                 | yes                     |
| Attribute, imported                           | its source                                                        | yes             | replaced on Replace data                                                                                                                                                 | graph part                                                 | yes                     |
| Correction of an imported value               | analyst                                                           | yes             | carried by id; reported when the import changes                                                                                                                          | session part                                               | yes                     |
| Attribute, joined                             | the join                                                          | yes             | replays                                                                                                                                                                  | session part, with its table                               | yes                     |
| Attribute, authored                           | analyst                                                           | yes             | holds                                                                                                                                                                    | session part                                               | yes                     |
| Attribute, expression                         | analyst                                                           | yes             | follows its inputs                                                                                                                                                       | session part (formula)                                     | yes                     |
| Always-available metrics, live                | none                                                              | derived         | follows                                                                                                                                                                  | derived on load                                            | yes (`graph.<metric>`)  |
| Result (with kind and `accumulates`)          | first run's derivation, or `as:`                                  | yes             | reading: follows its current run; query: union of drawn queries                                                                                                          | session part                                               | yes                     |
| Run                                           | element                                                           | yes             | holds; freshness                                                                                                                                                         | session part; values by retention                          | yes                     |
| Item address                                  | derived from source and key                                       | yes             | pins its run                                                                                                                                                             | where referenced                                           | yes                     |
| Item attribute (authored, joined, expression) | analyst or join                                                   | yes             | belongs to its run                                                                                                                                                       | session part                                               | yes                     |
| Set, fixed                                    | element (`set_` id, never reissued)                               | yes             | missing members only                                                                                                                                                     | session part                                               | yes                     |
| Set, rule (with scope and population)         | element                                                           | yes             | follows; out of date if it reads a held result                                                                                                                           | session part                                               | yes                     |
| Path (a set of the path kind)                 | element (`set_` id)                                               | yes             | holds; its kind derived                                                                                                                                                  | session part                                               | yes                     |
| Filter pipeline                               | none (working state)                                              | yes             | follows                                                                                                                                                                  | session part                                               | yes                     |
| Object selection                              | none (working state)                                              | no              | -                                                                                                                                                                        | no                                                         | yes                     |
| Layout settings and pins                      | none (one per graph, with a scope; per set is a need, section 13) | yes             | -                                                                                                                                                                        | session part                                               | yes                     |
| Positions (2D, 3D) and stored positions       | element (stored positions)                                        | yes             | no freshness                                                                                                                                                             | session part                                               | yes                     |
| Style layer                                   | element                                                           | yes             | follows; suppressed (automatic paint), edited, detached                                                                                                                  | session part (per graph until `one-way-doors.md` 5 closes) | yes                     |
| Note                                          | element                                                           | yes             | citations of runs and of the filter steps in force; quoted values (target, attribute, run, the value when written) and whether each live value differs; author and times | session part                                               | yes                     |
| View                                          | element                                                           | yes             | changed since applied; title, caption, note list, export settings, stored positions                                                                                      | session part                                               | yes                     |
| Comparison                                    | element                                                           | while open      | transient                                                                                                                                                                | only as a saved comparison with its record                 | yes (`project.compare`) |
| Forwarding map, derivation map                | element, per edit or transform                                    | yes             | -                                                                                                                                                                        | session part                                               | yes                     |
| Operation log (records)                       | element                                                           | yes             | append-only                                                                                                                                                              | session part                                               | yes                     |
| Derived fields (rank, percentile, group size) | none                                                              | derived         | follows its attribute                                                                                                                                                    | no                                                         | yes                     |

## 13. Element needs

What the conceptual model states as the model and graphty-element 2.x does not yet do. Each entry
is element work, never an app workaround. An entry that is also a published decision names its
door.

| Need                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | graphty-element today                                                                                                                                                                 | Door                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Layouts honour the filtered graph                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | lays out the whole graph unless given a scope                                                                                                                                         | `one-way-doors.md` 17 |
| The filtered graph named `"filtered"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | named `"visible"` (`src/session/runs/RunsApi.ts:399`)                                                                                                                                 | 22                    |
| A run records which filter steps it read                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | only a boolean, `RunRecord.filterScope` (`src/session/runs/types.ts:202`)                                                                                                             | --                    |
| Per-step filter membership, for working sets and "excluded by step"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | one node mask and one edge mask for all steps (`src/session/visibility/VisibilityApi.ts:409-445`)                                                                                     | 25                    |
| Automatic paint suppressed only for elements a higher authored layer paints                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | the check ignores the authored layer's selector, so one hand-coloured node suppresses every later automatic colour (https://github.com/graphty-org/graphty-monorepo/issues/551)       | 26                    |
| A declared measurement level                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | "category" inferred from dataset size, `unique <= max(2, sqrt(total))` (`src/session/attributes.ts:124`), so a 40-value column is text in a small file and categorical in a large one | 20                    |
| The weight role on the attribute                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | recorded on the run only, `WeightMeaning` (`src/session/runs/types.ts:169-173`)                                                                                                       | 21                    |
| Undo slices for graph entries and data versions, each filter step, notes, and a saved view applied as a composite                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | none of these is a slice; applying a saved view is exempt (`undo-design.md` 3.1, 3.2, element-undo branch)                                                                            | --                    |
| A layout scope carried in the one layout settings per graph: a new Run layout replaces it, a parameter change keeps it, and every layout run records the scope it used                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | master: `setLayout` takes a transient `options.scope`; the sets branch adds the durable `layoutScope` and moves it into the undo `layout` slice (`sets-design.md` 11)                 | 17                    |
| The **Overrides** layer (hand edits, top of the authored stack) and the **Default look** layer (bottom)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | neither exists; the element's own locked layers are selection and highlight (`src/session/styles/Layer.ts:18`)                                                                        | 31                    |
| Sets, paths, rule sets and offers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | on the unmerged sets branch (PR #540); master has `SavedScope` only                                                                                                                   | 11                    |
| Per-attribute revisions and per-run read lists, so freshness follows what a run read (an edit to a weight makes a weighted run out of date)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | freshness is a digest of node and edge ids (`research/graphty-today.md` 7.27)                                                                                                         | --                    |
| A position snapshot that covers only a scope's nodes, displayed beside the live drawing without writing it (a subnetwork beside its parent) and written back only for those nodes by Apply                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | one live position column; no snapshots                                                                                                                                                | --                    |
| Compare with... over sets or groups, runs of one result, results of one kind, a result and its randomized baseline, two attributes over one scope, and a partition or set collection against a partition, set collection or categorical attribute                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `project.compare` is designed for graph entries, data versions and windows only (section 1)                                                                                           | --                    |
| A style selector that targets a set as a whole: a collapsed set styled as one node, and a hull and label per group                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | none                                                                                                                                                                                  | 32                    |
| A consumer-configured default overview recipe, overridden by a project's own                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | none                                                                                                                                                                                  | 33                    |
| Previous selection: restore the selection before the last change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | none                                                                                                                                                                                  | --                    |
| Encoded axes with a named projection in the layout settings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | "Positions from columns" sets x and y from numeric columns; no projection                                                                                                             | --                    |
| An identifier-list or named set collection import (text, GMT, an indicator list) that makes rule sets with no data version and a count of unmatched identifiers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | none                                                                                                                                                                                  | 27                    |
| The search graph and ordered filter steps with a kind per step                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | one filter; `"search"` is a later keyword in the sets design (8.1)                                                                                                                    | 11                    |
| A catalogue descriptor field declaring an algorithm a search                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | none                                                                                                                                                                                  | 30                    |
| A direction on the neighbourhood leaf                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | hops counted both ways (`src/session/visibility/filter.ts`)                                                                                                                           | 24                    |
| A source attribute written by Add data                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | not written (`sets-design.md` 19)                                                                                                                                                     | 29                    |
| A signed similarity role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | no role on attributes at all                                                                                                                                                          | 21                    |
| Selection of one primary object as a whole (a set, a path, an item)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | selection holds node and edge ids                                                                                                                                                     | --                    |
| Saved project parts beyond the style stack and saved views                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | the element exports only those two                                                                                                                                                    | 1, 2                  |
| Not yet in the element at all: projects with several graph entries; data versions and forwarding maps; Merge nodes with pair lists and its conflict report; item attributes and Carry over to new run; notes and the findings report; the overview recipe, General, recipe apply and binding; a composite saved view (title, caption, filters, layers, collapsed sets, position snapshot, toggles; today a camera preset only, `Graph.ts` `userCameraPresets`); collapse; derived-graph transforms; the two-mode declaration; authored item attributes, Profile groups, runs over a list of scopes as one result with a threshold `population` per group, sweeps, the self-loop policy, measurement levels and roles other than `knownFields`, a layout scope and encoded axes as undoable state | none of these exists, so none has an undo slice (`undo-design.md` 3.1, non-goals)                                                                                                     | 1, 2, 19              |

**The channel list.** `src/session/styles/channels.ts` lists 14 node and 21 edge channels.
`node.marker` is typed `never` and draws nothing (line 264), so there are 13 node channels; the
edge channels fold to 15 rows when arrow pairs are grouped (`document-architecture.md` 7.4). The
list is closed to third parties; graphty-element adds a channel in a minor release.

## Received from the information architecture

`information-architecture.md` names, in its collection table and its relationship table, what each
place reads from graphty-element. These are the entries it depends on that are not yet in the
table in section 13. Each is element work, never an app workaround; a published name names its
door.

| Need                                                                                                                                                                                                                                       | graphty-element today                                                                                                                            | Door   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Paged id listings over a scope, neighbour pages, and search over graph content (names, attribute values, queries, pasted id lists) with hits grouped by kind, ranked, and, for a hit outside the filtered graph, the step that excludes it | "not part of this surface yet" (`src/session/types.ts:290-297`)                                                                                  | --     |
| A notes collection with targets, citations and quoted values marked when the live value differs                                                                                                                                            | none                                                                                                                                             | --     |
| A per-run outcome for each suggested channel: applied, withheld because an authored layer holds the channel (naming it), merged away in a batch (naming the run), opted out, or refused                                                    | withheld suggestions are dropped silently in `flush()` (`src/session/styles/autoApply.ts`); only a refused paint is reported, as `style:problem` | 26     |
| `template` layers (a Look) not suppressing later runs' suggestions, or suppressing only for the elements they select                                                                                                                       | `AUTHORED = ["user", "template", "plugin"]` (`src/session/styles/autoApply.ts:147`)                                                              | 26     |
| The attribute path on `ChannelExplanation`, and optionally the layer's `source`                                                                                                                                                            | the path is computed but only appears inside `reason`; the source needs a second lookup (`src/session/styles/explain.ts:51-91`)                  | 37     |
| A bulk read of encoded values for a column of the table                                                                                                                                                                                    | none                                                                                                                                             | 37     |
| Reading a file's profile (project, recipe, style, data) before opening it                                                                                                                                                                  | none                                                                                                                                             | 19, 36 |
| Aliases and a per-category display label on the catalogue descriptor                                                                                                                                                                       | neither exists (`src/catalog/types.ts`)                                                                                                          | 35     |
| A dependency graph between results, sets, style layers, views and notes, for Used by and what a Delete detaches                                                                                                                            | none                                                                                                                                             | --     |
| `memberships(id)` and a selection's memberships summarised per result or set                                                                                                                                                               | none                                                                                                                                             | --     |
| Derived-graph lineage: a stored derivation map naming the source graph                                                                                                                                                                     | none; the sets branch records only the scope a run read (`RunScopeRecord`, `sets-design.md` 10.1)                                                | --     |
| Version history: data versions with import reports and the operation log, tagged by graph                                                                                                                                                  | none                                                                                                                                             | 9      |

A command to reorder kept sets by hand is **not** a need: `ElementSet.order` already stores a
creation order on the sets branch (`sets-design.md` 4.6), and no workflow reorders sets or views.

**The earlier list "What graphty-element must publish"** (26 items, with the fields they add to the
project file) is kept in `research/archive/information-architecture-long-form.md` section 12. Most
of its items are already rows of section 13; the owner of this document folds the remainder in:
catalogue metadata (cost band, required arguments, precondition marks); rank with its denominator
and deviation over the run's scope; statistics of any scope, including boundaries, overlaps and
"in all N" counts; histogram bins and bands as set definitions; authored attribute writes as one
undo step; the import and restore reports and Re-map; series; transforms; comparisons over list
scopes; bounded path queries and cycles; merging many pairs; the neighbourhood aggregate; the No
value count and look; graph-file export through graph-io; and the participation coefficient and
Burt's constraint.

**Key matching** (long form, section 11). Join, Add data, Combine graphs, Find's pasted list and
the comparison surface match keys the same way: whitespace trimmed, a Match case option off by
default, "via mapping table" for two namespaces, and one report of matched, unmatched and duplicate
keys with how each duplicate was resolved. Combine adds counts of nodes and edges in A only, B only
and both, and writes a categorical membership attribute.

**The aggregate list** (long form, section 5), used by group columns and the neighbourhood
aggregate: count, sum, mean, median, minimum, maximum, share where a condition holds, most common
value with its share, number of distinct values, and most frequent words for text; only those
that apply to the attribute's type are offered.

**The report and methods text** (long form, section 6). The report (PDF or HTML) takes title and
authors from the project metadata; each checked view is a figure page in the views' order,
followed by the notes that view shows; its tables are each checked result's summary and top 10.
The methods text covers the loads and data versions behind the checked pages, the transforms that
made their graph, their filter steps and their runs.

**Autosave storage** (long form, section 2). graphty-element keeps the autosave in the browser's
storage for the site and asks for persistent storage; clearing site data still loses it, which a
downloaded project file covers. The file's shape does not depend on where it is kept.

## Sources

- `design/ui/framework/conceptual-model.md`
- `design/ui/framework/research/graphty-today.md`, 1.4, 1.6, 1.7, 7.5, 7.6, 7.7, 7.11, 7.15,
  7.19, 7.21, 7.22, 7.27, the autosave follow-up and the column-cost follow-up (line 2293)
- `CLAUDE.md` (root), "Architectural Principles", "WebGPU", "Module System"
