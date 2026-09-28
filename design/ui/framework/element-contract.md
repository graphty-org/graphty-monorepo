# Element contract

**Job.** State how graphty-element publishes the concepts defined in `conceptual-model.md`:
the identities, addresses, record fields, retention rule, expression language and file shape that
a consumer, a saved project file and the graphty app all depend on. The conceptual model says what
exists and how it behaves; this document says what graphty-element must publish to make that true.
Every row here that fixes a published name or shape is listed in `one-way-doors.md`, either as a
door the owner decides or under "Decided, and not doors". This document owns the exact semantics
the conceptual model cites (filter composition, windows, the record, freshness); where it and the
sets or undo designs disagree on element behavior, those designs win.

**Not here:** work the element still owes (`element-needs.md`, the one list); open decisions
(`one-way-doors.md`). **Owner:** graphty-element API steward (front-end architect). **Ceiling:** the
README's table. **Validated by:** every entry names a real file and line on master, or is marked as
a need with its row in `element-needs.md`.

The current state of graphty-element is taken from master (the release status line
is at the top of `implementation-mapping.md`) and from `research/graphty-today.md`, cited by
section.

## 1. Project and sessions

- A **project** is a new published object in `./session`. It holds graph entries by an
  element-minted **graph id**, each with its data versions and one session; one undo history; one
  append-only operation log; a metadata block (title, description, authors, license); and an
  **author** string the consumer sets (`project.author = "..."`). graphty-element records the author
  as given and never authenticates it; a headless consumer that sets none records none.
- **Every session belongs to a project.** A bare `createGraphSession()` creates an implicit
  one-graph project. **Undo is project-wide and linear**: the project holds one undo history (in
  memory, never in the file). `session.history` (designed as issue #427,
  `research/graphty-today.md` 7.11) is a read-only listing of that history filtered to the
  session's graph; undo called through any session undoes the project's latest step, and when that
  step changed another graph the element switches the shown graph to it, so undo never runs out of
  order. `history.nextUndo` names the graph when it is not the one shown. `<graphty-element>` exposes
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
  ends kept in the order they were ingested whatever direction is declared, so re-declaring
  direction never re-keys an edge; an undirected reading matches A-B and B-A without storing them
  that way (door 3, Edge identity). `graphty.edgePairsOrdered` records that the stored ends are in
  ingest order, so a reader never re-sorts them. The key is the file's key field when present;
  otherwise the **ordinal**, which is the one exception to the identity rule: the edge's position,
  in ingest order, among **every** edge of its pair in the load that ingested it, stored with
  **among**, that pair's edge count in that load. Counting every edge (not only those without an
  id) means configuring an id later never moves an ordinal, and counting per load means replacing
  one source never shifts another's. An ordinal reference binds only when exactly one edge carries
  its pair, ordinal and count; otherwise it reads missing ("ambiguous parallel edge") and never
  binds a different edge. That promise holds **within one load**: when data is replaced, a
  reference keyed by position re-binds by content, the stored `graphty.edgeHash` of the edge's
  imported attributes, and only on a unique match; otherwise it reads "ambiguous parallel edge",
  and the import report's edge-identity field counts both outcomes (door 3). **An edge join** (Join,
  a table of edge attributes) keys a row by edge id, else by (source, target[, key]), matching ends
  unordered on an undirected reading; a row matching several parallel edges is refused and counted
  as ambiguous, never applied to all of them. The import report says when it applies ("N parallel edges without ids:
  references to them match by position"), which needs a published import-report field
  (`one-way-doors.md` 3). An edge added in the session gets an id minted in the reserved `graphty:`
  namespace (`graphty:e<n>`), so ordinals only ever cover file edges. graphty-element 2.x reads a
  file edge id only at a configured `edgeIdPath`; defaulting it to the format's declared edge-id
  field (GraphML, GEXF) changes how existing loads merge repeated edges, so it waits for the major
  version that ships the project file. After Add data, the source column (the reserved name
  `graphty.source`, stamped at import) is part of the key, so two sources' edges between
  one pair stay apart. Combine, a transform, is the one operation that matches edges across
  inputs: its output graph's edges are identified by (source, target, edge type, key), ordered on
  a directed graph and unordered on an undirected one, so parallel edges and edge types (multiplex
  layers) stay distinct. Two inputs' edges merge only when the declared parallel-edge policy says
  so, each attribute by its declared reduction, and the key report counts what merged
  (`conceptual-model.md` 4.7; the projection and quotient conventions are `graph-conventions.md`).
- The session counter graphty-element mints, which restarts on every load
  (`research/graphty-today.md` 1.4 and 7.15), may remain an internal handle inside one session and
  is never written to the file. Without this, every stored reference to an edge re-attaches to a
  different edge after a save and reopen, with no error.
- Ids graphty-element creates (a contracted node, the edges a merge rewires, a derived graph's
  elements) come from a reserved namespace, are written to the file and get forwarding or
  derivation entries.
- An item key that names a node (a component by its smallest node id) resolves through the
  forwarding map like any other stored id.
- **Sets** get an element-minted id with the prefix `set_`, opaque after it, never reissued within
  a project: the project keeps a high-water counter per id kind, which undo never rewinds, so a
  file grows by one id and name per deleted set, never by a register of every id issued.
  Sets imported from another project keep their ids under a namespace (`set_<ns>.<rest>`), so no
  reference or derived run id is rewritten.
- **Every other object the element mints** (style layers, views, notes, filter steps, graph
  entries, the project, and a found set or path before it is kept) gets an id of the same form: a
  kind prefix, then a rest no reader parses, stable across save and reload, never an array index.
  A found object has its id before Keep, so Keep, undo and the announcement of its loss name one
  object. The form is door 89, The form of element-minted ids; run and result ids keep their published derivation (section 3).

## 3. Results and runs

- **Result kinds publish how they accumulate**: a field `accumulates: "current" | "all"` on each
  kind. Single-run kinds (metric, partition, graph statistic, series) are `current`; multi-run
  kinds (path family, flow, pair list, comparison) are `all`. The field is a need; the id rules below
  shipped in 2.6.0 (`src/session/runs/runId.ts`).
- **The result id is a name.** When the caller gives no `as:`, graphty-element mints it at the first
  run by the published derivation (a canonical form and an FNV-1a digest,
  `research/graphty-today.md` 7.11). For a `current` kind the derivation covers the algorithm,
  whether it is exact or sampled, the frozen scope definition and the source nodes. For an `all` kind it covers the algorithm
  only: the scope is recorded on each query run, not on the result, so every shortest-path query
  lands under one result however the filter changes between queries. The id is never recomputed
  afterwards, and from then on the rules for an author-assigned id govern it (`research/graphty-today.md` 7.22). For a
  `current` kind the digest takes the frozen scope definition, never the symbol (the filtered graph,
  `"visible"`), so two unscoped runs under different filters are two results.
- **Starting a run resolves one way**, in the API as in the UI. For a `current` kind: if a result
  of that algorithm exists over the same frozen scope and the same source nodes, identical
  parameters return it without recomputing and different parameters add a run to it and make that
  run current; otherwise the run makes a new result. For an `all` kind: the run is the next query
  under the algorithm's one result, with its own frozen scope in its record. "Run as new result" makes a
  new result whose id carries a collision suffix. The id hashes the frozen scope definition, never
  the keyword. **This rule and a Catalog click's Re-run disagree** for an unnamed run under a
  different filter; door 92, An unnamed run's result recommends one element command every host issues, which re-runs this
  graph's existing result, and resolving a later unnamed call through a result's current run.
  Parameters, seed and sample size belong to the run, never to the result id; whether the method is
  exact or sampled belongs to the result id, so a sampled run is always a sibling result
  ("Betweenness (sampled)") and never the current run of an exact one.
- **The cost estimate** comes from graphty-element for any command that starts runs, including
  Replace data's replay: a band word from `glossary.md` 10 and the response class the commit rule
  reads (`interaction-patterns.md` 3.3), from its cost model, whose error band is documented beside
  the model, and a time only when a run of that algorithm on the same engine was measured. The app
  shows it and never computes it.
- **The cost gate** (`src/session/cost/estimate.ts`, `gateRun`) decides whether a run starts: a
  run whose result cannot be held is refused with its reason; an exact estimate within the exact
  budget runs exactly; over it, the run is refused and offers **Run exactly** and, where the
  algorithm has one, **the sampled method**, each with its band, and the scopes that fit. The gate
  never swaps a method: a sampled run is started only by name and is always a sibling result
  (`principles.md` 2). Graph size alone never triggers approximation; where the shipped gate
  differs is `element-needs.md`, "The cost gate never swaps a method", a changed default under
  door 42 (Cost bands and the cost gate's default). How a refusal is presented is
  `interaction-patterns.md` 3.7.
- **The run queue** belongs to graphty-element, so every consumer gets the same order. Runs start
  in start order, one at a time, except that a run whose estimate is under a minute starts at once
  beside a running run estimated at "under an hour" or more, instead of waiting behind it. A run
  that waits has status `queued`. The policy is published (`principles.md` 2) and its reason is
  workflow evidence: "Hub Gene Identification and Ranking" starts several centralities in a row,
  and one all-pairs run can take hours.
- **A run's lifecycle, stated once**, and the one chart of it: every other document draws only
  the states it displays and cites this. **A run never restarts**: a failed or canceled run stays
  in the log as it ended, and Re-run adds a new run. The published status values are `queued`,
  `running`, `succeeded`, `failed` and `canceled`; the screen words are `glossary.md` 10's (Queued,
  Running, Failed; a succeeded run shows no word, and Canceled is a log word, never a row state).
  The log only appends; no entry is edited after it is written.

  ```mermaid
  stateDiagram-v2
    [*] --> queued : Catalog click, Run, Re-run, a sweep step
    queued --> running : the run queue starts it
    queued --> canceled : Cancel; the undo chord
    running --> succeeded
    running --> failed
    running --> canceled : Cancel; the undo chord (a cancellable run)
    running --> running : the undo chord on a run that cannot be canceled waits for it to end, then its values leave the result
    succeeded --> [*]
    failed --> [*]
    canceled --> [*]
  ```

  What each event does to the result and the log:

  | Event | Run status | Result afterwards | Undo step | Log entry appended |
  |---|---|---|---|---|
  | Cancel, while queued or running | canceled | the result stays, unrun, Run its primary command, focus unmoved; a result with no other run stays as an unrun row | none | "canceled" |
  | Undo, while queued or running | canceled | removed when this was its first run, the log kept; a result with an earlier run returns to it, current | the undo step of the command that started it is consumed | "canceled by undo" |
  | Redo of that step | none yet | the result is back, unrun, Run its primary command, focus unmoved; nothing starts | the step is back | "restored unrun" |
  | Undo, after it succeeded | succeeded | the run's values leave the result, which returns to its previous current run | the step is consumed | "undone" |
  | Redo of that step | succeeded | the run is current again from its kept values | the step is back | "redone" |

  Where the undo design differs is `element-needs.md`, "Undo of a pending run, and Redo restoring
  it". The wording of the log entries is part of the file (door 9, The record and the operation
  log).
- graphty-element mints a **run id** per execution, unique and persisted, used by citations,
  comparison, item addresses and the log.
- **Reading paths.** `results.<result id>.<field>` resolves through the current run for a
  `current` kind, and over the union of the drawn queries for an `all` kind (an edge's `onPath`
  is true when it lies on any drawn path). `results.<result id>.runs.<run id>.<field>` reads one
  run.
- **Re-run** of an existing result adds a run under that result id, with its own frozen scope,
  whatever the current filter, and makes it current, so what follows the result repaints and the
  earlier run stays as the baseline. The resolution rule above governs a run started through the
  API with no result named; a Catalog click in graphty issues Re-run on this graph's existing
  result of that algorithm, when there is one (`conceptual-model.md` 4.3), so a filter change never
  multiplies results behind the analyst's back. A **sweep** adds one run per parameter value under one result, and a run over a list
  of scopes is one run whose per-scope values are item attributes.
- **Use current** is one atomic, undoable operation: make a run current under an existing result id
  and keep the earlier run (`research/graphty-today.md` 7.22). It returns the grouped list of what stays on the earlier run
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
published spelling, shipped in 2.6.0, is `ResultItem { result, run?, key }` with `ResultId` an
alias of `RunId` (`src/catalog/types.ts`). When a result is re-run, graphty-element captures the members of every item a live
reference holds and stores the capture with the new run, so a holding reference keeps its members
after a save and reopen. The attribute path includes the scope of a
bound attribute (section 9), so component membership bound over the full graph and over a filtered
graph are two attributes with two sets of items. Notes and kept sets bind the full graph's
always-available attributes. Freshness is derived when the address is read and is never stored in it.

## 5. The record and the operation log

One record shape serves every operation. Its fields:

- **From what**: the frozen graph reference, the source nodes, the columns read with their
  revisions, the sets read with their revisions, and for a pair-producing operation the
  candidate-pair definition (source nodes by target set).
- **By what**: the operation and its version, the **engine** (CPU, or WebGPU with its adapter
  class), in the additive `Run.accelerator`; the published `Run.engine` holds package versions
  and becomes `Run.versions` (door 14, Published names that mislead), the parameters, the
  random seed, the edge reading (which column filled which weight role and with which conversion,
  direction, parallel-edge and self-loop treatment), the normalization, exact or estimate with its
  sample size, a declared output cap, and "re-run of".
- **By whom and when**: the project's author string, start and finish times.
- **Is it still true**: freshness and status, as separate fields (section 7).

Whether a run is **deterministic** is declared in the algorithm catalog per (algorithm,
algorithm version, engine), never assumed. GPU reductions are not bitwise reproducible against the
CPU path or across adapters.

**Which operations write a record**: an operation that changes data or the data's declared
semantics (a data operation, Add attribute, Declare), or computes values (a run, a layout run, a
transform, Profile groups, Save comparison, Apply recipe). Selection, set, filter-step, style,
view and note edits write none. A record's key is its **record id**; a run id is one kind.

The **operation log** is append-only, keyed by record id. Undo and redo of an operation that has a
record append entries that name what they reverted, with the author and time; undoing one that
has none appends nothing. What undo, redo and cancel append for a run is the lifecycle table in
section 3. The methods text is written from the current state; the full log is read
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
  a column revision, a set revision or a weight role. It is never re-evaluated on every edit. It
  needs per-column revisions (`research/graphty-today.md` 7.27).
- **Migration.** Honoring a recorded scope changes the values of runs saved by a release that ran
  every run over the full graph (`research/graphty-today.md` 7.7).

## 7. Freshness and status

- **Freshness** (`freshness`): `current`, `out-of-date`, `cannot-rerun`, `detached`,
  `unresolvable` (screen: "Cannot evaluate"), an open union, carried by sets, rules, style layers,
  filter steps and references (`SetStatus.freshness`, master). A run's own freshness is only
  current or out of date; Cannot re-run, Detached, Earlier run and Values not kept are states of a
  reference to a run or of its values (below, and `glossary.md` 10), on the undo branch the flag `RunEntry.stale` (`design/undo/undo-design.md` 3.1 on branch feat/element-undo). Separate from
  **status**: queued, running, succeeded, failed, canceled. A set's status also lists `reasons`
  (a cycle, an unknown kind, a missing run, an ambiguous parallel edge, values not kept) whatever
  its freshness.
- **Screen states.** `glossary.md` 10 owns the screen word and the one recovery verb for each state.
  The mapping: `out-of-date` is Out of date; `cannot-rerun` is Cannot re-run; `detached` is
  Detached; `unresolvable` is Cannot evaluate; a holding reference to an earlier run or data version
  is Earlier run or Earlier data; dropped values are Values not kept.
- Published companion fields: **`scopeDiffers`** (the recorded scope differs from the current filtered graph),
  **data version** (compared with the current one), **values kept**, and, on a holding reference,
  **earlier run**; a saved view's **changed since applied** is its own field. Which one the UI shows
  is the precedence order of `glossary.md` 10, not part of the contract.
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
  stored and never inferred from an empty match (`research/graphty-today.md` 7.19 records the
  silent old-members behavior this replaces).

## 8. Retention

Records are kept forever. Values are kept for:

- each reading result's current run, and each drawn or kept query run;
- any run that is cited, compared, pinned by a reference or held by a detached dependent, marked "Always store values", or on the undo
  stack within its memory cap;
- the runs that were current on the previous data version, until the next Replace data, because
  "what changed since last week?" is the reason Replace data keeps versions.

Otherwise a run whose catalog entry declares it deterministic for its recorded algorithm
version and engine drops its values and shows "Values not kept", restorable by one action. The
catalog may instead declare an engine **reproducible within a stated tolerance** (a GPU reduction,
an unseeded Louvain given its recorded seed); such a run also drops its values, and a restore is
labeled "recomputed" with the tolerance. Any other run keeps its values.

**Under memory pressure** a new run that would not fit is refused with the kept runs named, and the
analyst may drop the values of runs that cannot be restored ("Values not kept", with no Restore),
never silently. A record counts as a reader of the columns it names, so the inputs of
a dropped run are always held and a restore is always possible; the cost is that an earlier data
version keeps the columns its records name. A restore under a different algorithm version or
engine is labeled "recomputed with version X" and is a new run, never shown as the old values.

**History is bounded.** A data version that no kept run, stored position, comparison or held
reference needs is squashed into its neighbor, keeping only its record, so a weekly Replace data
or a refreshing source (door 28, Refreshing sources and data versions) does not grow the file without limit. **Compact history** is an
explicit, undoable command that names what it drops (`element-needs.md`, "Compact
history").

A deleted set leaves a **tombstone**: its id and name, kept forever, and its full record, kept
while any live style layer, filter step, rule set, note, view, layout scope or run whose values
are kept names it, and dropped once nothing does. A byte cap that drops the oldest record first
was rejected: it could drop the one record a visible Detached mark needs, and "Restore set" would
then fail. An assistant that creates and deletes sets it never used grows the file by one id and
name per deleted set, because an unreferenced record is dropped.

An earlier data version keeps its id map, its topology as a delta against the next version, and
the columns something kept reads. Stored positions fall under the same rule. A metric run costs
280 to 390 bytes per node, so twenty kept runs at 100,000 nodes are 0.5 to 0.8 GB (`research/graphty-today.md` 7.22).

**The design target.** The element is designed to hold graphs to 1,000,000 nodes and 10,000,000
edges in memory for analysis, with at most five kept metric runs whose values cannot be restored
(about 0.3 to 0.4 GB each at that size, at the measured 280 to 390 bytes per node), and to draw
within the limits `scale-levels.md` 1 names. Past the target a load or run is refused before it
starts, with its reason, and the project stays editable. The target is a proposal the element
steward confirms with a measured memory model (`element-needs.md`, "A stated design target").

## 9. One set grammar and the expression language

**One set definition, shipped in 2.6.0.** graphty-element publishes one shape for "which
elements", the **set definition** (`src/catalog/types.ts`, `SetDefinition`): `{ kind: "fixed",
nodes, edges?, reading: "induced" | "listed" } | { kind: "rule", where: Query | RuleTree, reading:
"induced" | "listed" | "clipped" } | { kind: "path", nodes, edges?, directed? }`. A rule reads the
full graph wherever it is stored; a filter step decides what it reads through its own `input`. A
path's `edges` name, per step, the edge taken. A layer selector, a filter, a selection target and a
run scope accept the published `Scope` reference, whose `{ set: SetId }` names a kept set and whose
`{ define: SetDefinition }` carries an inline one. Members are stored by stable identity (node id;
edge id, key, or ordinal with count), never by row or session counter, in one canonical form, and a
definition's revision is a versioned digest of that form (`r1:`). The older grammars (`SavedScope`,
`scope.save`, `selection.promote`) stay until door 15, When the old names are removed's release. Run scope forms: a set, the
filtered graph (`"visible"`), the full graph (`"graph"`), the selection (`"selection"`, the
published live keyword, frozen to its member ids when the run starts; door 22, The filtered-graph scope's name renames only
`"visible"`), without a set, and a list of scopes (each
item of a result, without each item, the members of a set one at a time, a list of windows, the
graphs of the project, the two sides of a comparison, K null-model samples).

**The rule tree** (`RuleTree`) is the published `Filter` tree, and every node keeps the published `kind`
discriminant, so an exhaustive `switch (node.kind)` covers the new leaves:

- the published leaves, kept as they are: `all`, `any`, `not`, `expression`, `edges`, `range`,
  `categories`, `degree`, `component` and `neighborhood` (whose start nodes stay in the published
  field `seeds`, and which gains optional edge types and a `direction`, `"in" | "out" | "all"`,
  default `"all"` because the published leaf counts hops both ways, `src/session/visibility/filter.ts`; an
  additive need in `element-needs.md`); the always-true rule is `{ kind: "all", of: [] }`;
- membership: `{ kind: "member", of: Scope }` (shipped), the members of a set, path or inline
  definition. It speaks edges only when the referenced set is read listed or clipped;
- one item of a result: `{ kind: "item", item: ResultItem }` (shipped);
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
outcome: "filter-to" | "filter-out", input?: "previous" | "full", enabled }`, where `input` (default
`"previous"`) is what the step reads, so the rule it holds keeps one meaning. A step with `input:
"full"` evaluates its predicate on the full graph and then applies to the previous step's output:
`"filter-to"` intersects, `"filter-out"` subtracts; it never brings back an element an earlier step
removed. An edge-only step keeps the nodes it isolates; removing them is its own step. The list is
recommended as `session.filters.steps` with `add`, `move`, `remove` and `setEnabled`, not under
`session.visibility`, which door 86, Whether an element is drawn recommends deprecating so the drawn state never shares its
name; `visibility.set(filter)` stays as a one-step shorthand until then. **Growing a step**: Add selection to step, and Filter to neighbors
(the same command with the selection's neighbors as operand), edit the newest Filter to step in
place, reading the graph as it stood before that step, and store the union of its rule and each
labeled addition. **Searches** (Select neighbors, paths between named endpoints, the neighborhood leaf,
and any algorithm whose descriptor declares it a search) read the filtered graph unless the caller
states the full graph, and the run records which. Find reads the full graph and reports a hit a
step leaves out with the step that leaves it out, never selecting it. All of this is recommended
on door 25, One kind of filter step or two; the published form is one filter (`session.visibility.set`), which since 2.6.0 follows
the sets it names.

**The expression language starts from what is published.** `Path` and `Query` are JMESPath strings
(`research/graphty-today.md` 1.4), and every selector, saved scope and StyleDocument writes `results.<id>.<field> == ...` in
JMESPath. JMESPath stays for paths and plain predicates. What it cannot express is added as
structured JSON forms, not new syntax:

- thresholds, absolute and relative (the `threshold` leaf above);
- a comparison against another element's value (`device = device of account A`);
- arithmetic for expression columns: `{ expr: [op, ...args] }`.

The forms are published in `./schema`, which stays free of Babylon.js, Lit and the DOM. A set
definition embeds a JMESPath `Query` where one suffices, so existing saved documents stay valid.
Aggregates over a node's neighbors are algorithm runs, not expressions, because they read
topology and need a scope and a record.

**Reserved roots.** `results` (the published `RESULT_ROOT`, 1.6) and `data` (imported and authored
attributes, `ATTRIBUTE_PREFIX`) are the path roots in use, and every door that takes a path refuses
any other root now, so `graph` can be added later without changing what a stored path means.
`runs` is a reserved field name under a result, enforced by a catalog check. Because attributes
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
change (`Path` becoming `FieldPath`, `Caveats.notes`, `WeightMeaning`, the `community` shape, the
catalog's display labels, `Run.engine` and `GraphStatistics.weighted`) are door 14, and the date
the old names go is door 15. The set definition's names shipped in 2.6.0.

**Events.** Sets publish a per-set `set:changed` event (created, updated or removed, with the
fields touched, the record after the change and the cause), as style layers publish
`style:changed`: a sets list needs per-id changes that a project-wide change event does not carry.
It fires once per changed set when a write seals, after the repaint passes, and nothing depends on
it for correctness. Its `cause` is an open union that gains `"undo"` and `"redo"` with undo.

## 11. The file

Per graph entry, a **graph part** (the current data version's frozen topology, imported columns,
declared roles; earlier versions as id maps, topology deltas and held columns) and a **session
part** (results, runs with their held-item captures, sets (paths among them), authored, joined,
corrected and computed columns with joined source tables, positions and stored positions, layout
settings, filter steps, the hidden elements (door 86), forwarding and derivation maps). A graph
entry may instead hold its data by reference (door 2, The file's top level), with no graph part. **Project-level parts**, beside the graph
entries, hold what may span graphs (door 5, Project parts and graph parts's recommendation): style layers and the Look, notes,
saved views (the type `SavedView`), saved comparisons and the operation log. The information architecture adds
these session-part fields, each new under the version number and tolerant reader
(`one-way-doors.md` 38): item attributes; group columns from member statistics, stored as their
expression; the start nodes of a neighborhood or path step; a filter step over items; the Window
step's Nodes row as views capture it; saved comparisons over list scopes; per-scope and difference
columns; the declared direction and weight with their per-run overrides; the order of the views,
set by the analyst; each view's note order; the Base style and
Overrides rows; the project's overview recipe; and the applied recipes with their sources. At the top level, beside the
graph entries: the project id (element-minted, persisted; Duplicate mints a new one), the
project-wide high-water counters of issued ids and the tombstones of deleted sets
(set ids are unique across the project's graphs), a version number and a tolerant reader. The
**envelope** (the format version, the element version that wrote the file, sections named by
namespace, kind-prefixed ids, unknown sections kept and written back, committed state only) is
fixed before the autosave first writes, because an autosaved project is already a file on the
reader's disk (door 88, The autosave's envelope); the contents of each section stay open until the file doors below. The container, extension and media type are a one-way door in `one-way-doors.md` 1. A whole-document save is 58 MB and about 290 ms at 100,000 nodes, the changing state 3.6 MB
and under 1 ms (`research/graphty-today.md`, autosave follow-up). The graph part also carries
graphty-element's reserved columns, which a reopen needs to rebind stored edge members and
reproduce digests: the stable edge id (the file's id or a minted `graphty:e<n>`, never the session
counter, which 2.x snapshots already publish as `graphty.edgeId`, so this column's name is decided
with `one-way-doors.md` 3), `graphty.edgeOrdinal`,
`graphty.edgeAmong`, `graphty.nodeHash`, `graphty.edgeHash`, and the graph attribute
`graphty.edgePairsOrdered`. Metric columns and stored
positions are stored as float32; float64 costs as much as the positions at 1,000,000 nodes (line
2293). The camera a view holds is a Node-safe type exported from `./session` or `./schema`, so a
headless consumer can build views (`research/graphty-today.md` 7.21).

### 11.1 Recipes: what travels, and how a project becomes one

A recipe (`files-and-recipes.md` 1) names results only by author-assigned ids (`as:`), because a
derived id changes on other data; it carries an id, a version and an optional canonical source
(door 19, The recipe profile and how it binds). **A binding travels, its data-bound state does not**: a style layer carries its scale
kind, palette, transform and bins, never a pinned numeric domain, which the binding step re-derives
on the recipient's data; it carries a category-to-color map only when the author declared the
attribute categorical with a named vocabulary (node type "gene"), and otherwise the map is fixed
again at first paint (doors 19, 84). Options whose default or bound depends on the loaded graph
(Katz's alpha, ForceAtlas2's tolerance, through `catalog.optionsFor(key, scope)`) are stored as
"default" unless the author changed them, and the binding step lists any stored value outside the
recipient's bounds.

**Applying** copies definitions in with provenance and binds slots. Author-assigned ids and layer
ids are namespaced by the application, so applying two recipes, or one twice, never collides. **A
recipe never fetches a source or runs a join before the binding step names the host it will
contact and the analyst confirms**, whether it arrived as a file or a link (doors 19, 34). Until
recipes have a remote source, a recipe is copied in with provenance and listed in Version history;
it is never applied by itself.

**Export recipe...** closes over the definitions the chosen parts depend on, turns each reference
to a fixed set into a set slot, gives every referenced result an author-assigned id (a derived id
is promoted to one), and reports what it dropped. A layer, rule or scope bound to a result names
that author-level id in every file, whether written by a project or a recipe; when a graph holds
several candidate results, the binding names the one it was made on (doors 5, 19).
`element-needs.md`, "Export a project as a recipe", is the work.

## 12. Contract table

"Survives reopen" means the identity is the same after a save and reopen of the same data.

| Concept | Identity minted by | Survives reopen | Liveness | In the file | Session API |
|---|---|---|---|---|---|
| Project | element (a project id, persisted) | yes | - | the file | yes, new |
| Graph entry | element (graph id) | yes | - | top level | yes |
| Data version, with record | element, sequential | yes | frozen | graph part | yes |
| Node | imported data | yes | - | graph part | yes |
| Edge | imported id, or (source, target, key) | yes | - | graph part | yes |
| Attribute, imported | its source | yes | replaced on Replace data | graph part | yes |
| Correction of an imported value | analyst | yes | carried by id; reported when the import changes | session part | yes |
| Attribute, joined | the join | yes | replays | session part, with its table | yes |
| Attribute, authored | analyst | yes | holds | session part | yes |
| Attribute, expression | analyst | yes | follows its inputs | session part (formula) | yes |
| Always-available metrics, live | none | derived | follows | derived on load | yes (`graph.<metric>`) |
| Result (with kind and `accumulates`) | first run's derivation, or `as:` | yes | reading: follows its current run; query: union of drawn queries | session part | yes |
| Run | element | yes | holds; freshness | session part; values by retention | yes |
| Item address | derived from source and key | yes | pins its run | where referenced | yes |
| Item attribute (authored, joined, expression) | analyst or join | yes | belongs to its run | session part | yes |
| Set, fixed | element (`set_` id, never reissued) | yes | missing members only | session part | yes |
| Set, rule (a population lives in its threshold leaf) | element | yes | follows; out of date if it reads a held result | session part | yes |
| Path (a set of the path kind) | element (`set_` id) | yes | holds; its kind derived | session part | yes |
| Filter steps (supporting objects) | element (step id) | yes | follows | session part | yes |
| Hidden elements | none (a per-element state) | yes | - | session part (door 86) | yes, new |
| Object selection | none (working state) | no | - | no | yes |
| Layout settings and pins | none (one per graph, with a scope defaulting to the filtered graph for scoped layouts, which a set's Run layout sets) | yes | out of date when the filtered graph changed after the layout ran | session part | yes |
| Positions (2D, 3D) and stored positions | element (stored positions) | yes | no freshness | session part | yes |
| Style layer | element | yes | follows; suppressed (automatic paint), edited, detached | authored layers in the project part; run-made layers, Overrides and Base style in each graph's session part (door 5's recommendation) | yes |
| Note | element | yes | citations of runs and of the filter steps in force; quoted values (target, attribute, run, the value when written) and whether each live value differs; author and times | project part (door 5) | yes |
| View | element | yes | changed since applied; title, caption, note list, export settings, stored positions | project part (door 5) | yes |
| Comparison | element | while open | transient | only as a saved comparison with its record | yes (`project.compare`) |
| Forwarding map, derivation map | element, per edit or transform | yes | - | session part | yes |
| Operation log (records) | element | yes | append-only | project part | yes |
| Derived fields (rank, percentile, group size) | none | derived | follows its attribute | no | yes |

## 13. Element needs

Everything the model states that graphty-element does not yet do is one row of `element-needs.md`,
the only list. The published style channels are `src/session/styles/channels.ts`; how many there
are and how they are controlled is `options-and-encodings.md` 2.

## 14. Published properties of the session

Five properties make a host thin. With them, a React host needs only what the element ships from
`@graphty/graphty-element/react`, **the one list of it**: `useSession` and `useSessionRead` over
`useSyncExternalStore`, where every element read is published as `{ keys, get }` and the hooks take
the read, never a key, so a host never has to know which state a read depends on (its snapshot is the sum of the declared keys' revisions; an additive name, `element-needs.md` 3); `useIdGuard`, `useKeymap` (slice 1) and `useGesture` (slice 4b), which
aborts a gesture when its control unmounts, as an inspector re-rendering mid-scrub does; React is
an optional peer. Nothing else; without them, every host builds its own cache or its own
gesture bookkeeping, and that is where graph state leaks out of the element. Each property is
enforced by a test in graphty-element's `default` project, which runs in Node against a real
session. The names are additive until published (`element-needs.md` 3); the work is `element-needs.md`'s. How the app uses them is
`implementation-mapping.md` 2 and 3.

1. **A revision per key.** `session.revision(key)` is a number that increases on every change
   to that key's state, data loads included. It is the host's snapshot: a number compares equal
   when nothing changed, so no read has to return the identical object and no host keeps a read
   cache. **During an open gesture, every getter returns committed values**; a preview is readable
   only through the gesture handle (`g.value()`), which the scrubbed field reads, and in the
   element's own drawing (canvas and legend). A contract test reads the scrubbed channel by every
   other route mid-gesture and gets the value from before it; another holds that a read's value
   changes only when one of its declared keys moves. **The element memoizes its own reads**, synchronous
and asynchronous, by the read and the sum of its declared keys' revisions, and **dedupes concurrent
calls**: two inspector sections asking for the same scoped statistic at the same revision get one
computation and one promise, released when the revision moves. This is the one statement of the
rule; a contract test covers the dedupe. The keys are an open union: the undo
   branch's `ProjectSlice` names (`types.ts:692`) plus the observable state outside the project,
   `selection`, `progress` (runs still computing), `interaction`, `history` and `capabilities`. A
   key too coarse for its readers is split, which adds no event name. Before the undo release the
   element maps master's seven events onto keys (`implementation-mapping.md` 2). The test asserts
   that every command bumps the revisions of the keys it wrote and no others.
2. **Complete change events, headless too.** Every change to project state publishes
   `project:changed { slices, cause }` (undo branch, `types.ts:676`), in the order the undo design
   fixes: state, then project and history events, then derivation, then per-domain events
   (`design/undo/undo-design.md` 9.3 on branch feat/element-undo). A headless
   `createGraphSession()` raises it exactly as the DOM element does, including when data loads or
   is replaced, so a Storybook story and a Node consumer see what the app sees. No slice changes
   silently. State that is not undoable project state has its own event and its own revision key:
   `selection:changed`, `run:changed` (progress), `interaction:changed` for the tool, the gesture
   and the walk, `history:changed` and `capabilities:changed`.
3. **Declared gestures** (proposed; on the undo branch, since master has no transaction). A host control opens a gesture on pointer-down or focus and closes it on
   pointer-up or Enter (`beginGesture(label, key)` returning `preview`, `commit`, `abort`; the
   spelling is taken at release; the handle also carries `value()`). A preview is drawn live by the
   element, records nothing, changes no revision and is invisible to getters; commit records one undo step and raises one `project:changed`. **Two kinds**: a
   pointer-held gesture aborts on Esc, `pointercancel` or unmount; a focus-opened one (typing, arrow
   steps) commits on blur and aborts on Esc or unmount (`interaction-patterns.md` 3.6, "Closing an
   overlay"). Abort restores the state from before the gesture with cause `rollback`. It is built on `session.transaction`, so it locks only what a
   transaction locks (node, edge and pin ids) and never blocks a layout or catalog algorithm run.
   The element's own drag, marquee and lasso use it. The time-window merge (`coalesceMs`) applies
   only to callers that open no gesture.
4. **Synchronous availability.** Each intent command's availability, with its reader-facing
   reason, is a synchronous, cheap read, because a menu and a shortcut sheet are drawn inside one
   keydown.
5. **Windowed reads.** Any read whose size grows with the graph is offered as a count plus a
   window: table rows under a sort and scope, set members, id listings, and histogram bins rather
   than raw values; and a question about a whole selection (whether it agrees on a value, the
   "Mixed" state) is one read. A host never receives an array proportional to the graph.

**Rejected: stable read identity** (a read returns the identical object until its slice changes).
It asks every read method to memoize by object with no end point; a revision number gives a host
the same correctness by counting changes.

## 15. What a bare embed does, and semantics the structure relies on

**A bare `<graphty-element>` on a third-party page**, with no app around it, does all of this by
itself, and each item is tested on a bare embed (`interaction-patterns.md`, "Validated by"):

- draws the graph in both themes with no configuration: the canvas and element roles follow the
  host's color scheme unless `GraphStyle.background` is set (`canvas-drawing.md` 1);
- runs the General overview at load and shows its legend when a layer is bound;
- draws its legend and labels in a readable default type when the page sets none
  (`canvas-drawing.md` 8), and counts hidden elements on its not-drawn line with Show all;
- selects by click, Shift+click, Mod+click, box and Lasso, holds every selected id, and marks the selection
  (`interaction-patterns.md` 3.1, `interaction-pattern-entries.md` 4.1);
- handles, on its own focus target and never on the document, the gesture abort, the tools, the
  canvas walk, leaving the walk, deselect and undo (`interaction-patterns.md` 3.6; `interaction-pattern-entries.md` 9.3);
- announces what it changed in its own polite and assertive regions when the host provides none;
- states what it does not draw and why, and refuses what it cannot hold before loading;
- keeps undo, the record of every run, and (when the host allows it) the autosave.

**Theme and motion (recommended, door 48, How the element learns theme and motion, theme-following defaults and the default grays).**
`colorScheme` takes `light`, `dark` or `auto` (default). On `auto` the element reads the host's
computed `color-scheme` and resolves it: `dark` is dark; `light` or `normal` (an unthemed page) is
light; `light dark` follows `prefers-color-scheme`. It re-reads on a `prefers-color-scheme` change
and on attribute changes to `document.documentElement`, `body` and the host, repainting live,
because an app's theme toggle usually sets an attribute on `<html>`. Changes on other ancestors are
not observed; a consumer that themes an intermediate element sets `colorScheme` explicitly. An
explicit `GraphStyle.background` wins over all of it, and a theme change moves only the element
roles, never a data color (`canvas-drawing.md` 1). `reducedMotion` takes `auto` (default),
`reduce` or `no-preference`, CSS's own spellings; `auto` follows `prefers-reduced-motion`
(`canvas-drawing.md` 10).

**Several embeds on one page.** Registries (`LayoutRegistry`, `AlgorithmRegistry`, the catalog)
are process-wide and read-only after load, so a saved kind resolves the same in every embed; keymaps,
live regions, the interaction state and the selection are per instance; the autosave is keyed by
project id. One session shown by two embeds is a need (`element-needs.md`, "Readings and the drawing
budget per side of a comparison").

**The autosave.** graphty-element keeps the autosave through a storage adapter, the browser's
storage for the site by default and asking for persistent storage; a host may supply its own
adapter or turn it off, and one writer holds a project at a time (`element-needs.md`, "The
autosave as a storage adapter"). Clearing site data still loses it, which a downloaded project file
covers. The file's shape does not depend on where it is kept, and its envelope is door 88. It
writes **committed state only**: while a gesture is open it waits, and writes when the gesture
commits or aborts, so a tab closed mid-drag reopens on a value the reader chose, never on one they
were dragging through. **A running layout is uncommitted in the same way**: its positions become
one undo step and one write when it settles, is stopped or fails, and a tab closed mid-layout
reopens on the positions from before the run (`state-matrix.md` 8, `Cross/AutosaveDuringLayout`).
**A section is written only once the doors that fix its contents are decided** (door 88, The
autosave's envelope); until then it lives in the session only. It writes the session and
project-level parts on each committed change, coalesced to at most once a second, and a graph part
only when its data changes, so an edit at 1,000,000 nodes writes megabytes, not the whole graph, once kept runs, positions
and joined tables are content-addressed members written once (door 88), a claim measured at the
Million fixture before slice 7; a
project holding its data by reference writes no graph part (door 2).

**A refresh from a live source** is appended as a data version only when no pointer gesture, pending
field edit or playback is in progress on the element, and refreshes that arrive meanwhile are
appended together as one data version, so a dragged node or an edited value is never pulled from
under the analyst. The element exposes whether a refresh is held, so a host control that drives a
gesture can hold it too. This is a need (`element-needs.md`, "Files, notes, recipes and history").

**Key matching** (long form, section 11). Join, Add data, Combine graphs, Find's pasted list and
the comparison surface match keys the same way: whitespace trimmed, a Match case option off by
default, "via mapping table" for two namespaces, and one report of matched, unmatched and duplicate
keys with how each duplicate was resolved; edges match by section 2's edge key. Combine adds counts of nodes and edges in A only, B only
and both, and writes a categorical membership attribute.

**The aggregate list** (long form, section 5), used by group columns and the neighborhood
aggregate: count, sum, mean, median, minimum, maximum, share where a condition holds, most common
value with its share, number of distinct values, and most frequent words for text; only those
that apply to the attribute's type are offered.

**The report and methods text** (long form, section 6). The report (PDF or HTML) takes title and
authors from the project metadata; each checked view is a figure page in the views' order,
followed by the notes that view shows; its tables are each checked result's summary and top 10.
The methods text covers the loads and data versions behind the checked pages, the transforms that
made their graph, their filter steps and their runs.


## Sources

- `design/ui/framework/conceptual-model.md`
- `design/ui/framework/research/graphty-today.md`, 1.4, 1.6, 1.7, 7.5, 7.6, 7.7, 7.11, 7.15,
  7.19, 7.21, 7.22, 7.27, the autosave follow-up and the column-cost follow-up (line 2293)
- `CLAUDE.md` (root), "Architectural Principles", "WebGPU", "Module System"
- Open decisions cited (`one-way-doors.md`): 1, The file's container and media type; 34, A shareable URL; 38, Structure fields in the project file; 84, A category's color fixed at first paint
