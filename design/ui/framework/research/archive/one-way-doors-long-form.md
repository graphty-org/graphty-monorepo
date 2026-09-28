# One-way doors (record)

> **Record, 2026-09-27.** The full text before the framework was consolidated. It binds nothing; see `../../one-way-doors.md`, which holds the open doors, and `../../element-needs.md`, which holds the additive proposals moved out of the door list; door numbers are unchanged.

This document lists the decisions in the graphty design framework that are expensive to undo, so
that the owner can make them before anything ships. Everything else in the framework is decided
in its own document, with its reason, and changing it later costs an edit or a rerun.

A decision is a **one-way door** here when it does one of two things:

- it fixes something other people or other files will depend on: a name graphty-element publishes
  on npm, the shape of a public API, the project file's format, extension or stored fields, or a
  published default behavior; or
- it would cost a large amount of rework to reverse, such as re-keying every saved project.

Two packages are named throughout. **graphty-element** is the standalone web component that owns
every graph capability (data, style layers, algorithms, layouts, selection, the tree of analysis
results and the project file). The **graphty app** is only the window around it. Every door below
is a graphty-element decision (door 83 binds compact-mantine too); none of them is app code.

**The rule that keeps this list short.** The project file carries a version number and is read by
a *tolerant reader*: a reader that accepts files with fields it does not know, keeps them, and
fills fields an old file lacks with a stated default. Figma's file evolves this way
(`research/figma.md` 2.10). With that rule shipped, adding a field, a result kind, a state or a
note target later is a two-way door. What stays one-way is anything a tolerant reader cannot
absorb: a key that would re-attach saved references to different elements, a meaning that would
have to be guessed for every old file, and a published name that consumers' code already calls.

Each door gives the decision, why it is a door, the options, the recommendation with its reason,
and what depends on it. The framework documents are already written on every recommendation, so
accepting all of them changes nothing else; rejecting one changes the documents named under
"Depends on it".

Terms used below: a **run** is one execution of an algorithm; a **result** is the kept analysis
that holds its runs (a betweenness result may hold several runs with different parameters);
a **set** is a named collection of nodes and edges, either a fixed member list or a rule; a
**scope** is the graph a computation read. Full definitions are in `glossary.md`.

---

## Part 1. The project file

### 1. The file's container, extension and media type

**Decision.** What a downloaded project file physically is, and what it is called.

**Why it is a door.** Files in the wild, operating-system file associations, drag-and-drop
handlers and documentation all fix on the extension and container. A container change later
means every reader must sniff two formats forever.

**Options.**
1. One JSON document (for example `name.graphty.json`).
2. A zip archive holding a small JSON manifest, one JSON session part per graph, and the graph
   parts and numeric columns as binary members in graph-format's typed-column wire form, with
   extension `.graphty`.
3. A custom single binary file.

**Recommendation: option 2, extension `.graphty`, media type
`application/vnd.graphty.project+zip`.** Measured on a 100,000-node, 500,000-edge project, a
whole-document JSON save is 58 MB and about 290 ms of main-thread work before compression, while
the frozen graph as graph-format bytes is 18 MB in 6 ms and the state that changes during a session
is 3.6 MB in under 1 ms (`research/graphty-today.md`, the autosave follow-up). A zip keeps those
two parts separate and binary, stays openable by standard tools for anyone who wants to inspect or
repair a file, and lets the JSON parts stay human-readable. A custom binary buys nothing a zip does
not and cannot be inspected without graphty.

**Depends on it.** Download project file and Open in the graphty app; graphty-element's save and
open API; the tolerant reader; every consumer that stores projects.

### 2. The file's top level

**Decision.** The file holds one project: a list of graph entries keyed by a persisted graph id,
each split into a **graph part** (the current data version's frozen topology, imported columns and
declared data roles, with earlier data versions as id maps and topology deltas) and a **session
part** (results, runs with the captured members of the items live references hold, sets with
paths among them, authored and computed columns, positions, layout settings, style layers, notes,
views, kept comparisons and the operation log), plus one undo history, a metadata block, the
project-wide register of issued set ids with the tombstones of deleted sets, and the version number
(`element-contract.md` 11). The graph part carries graphty-element's reserved columns
(`graphty.edgeId`, `graphty.edgeOrdinal`, `graphty.edgeAmong`, `graphty.nodeHash`,
`graphty.edgeHash`, and the graph attribute `graphty.edgePairsOrdered`), without which a reopen
cannot rebind stored edge members. The stable edge id's column is named with door 3, because
graphty-element 2.x snapshots already carry the session counter under `graphty.edgeId`.

**Why it is a door.** One graph or a list of graphs is the root of every stored reference. Moving
from one graph to a list later means every note target, set member and item address in every old
file gains a graph id it was never written with.

**Options.** One graph per file; a list of graphs; a list of graphs with a single merged session.

**Recommendation: a list of graphs, one session part per graph.** "Condition Comparison - Disease
vs Control Networks" needs two source graphs and a combined third in one project, and a consumer
with one graph never sees the list (a bare session gets an implicit one-graph project). The split
into a graph part written once and a session part written on each change is what makes autosave
affordable at 100,000 nodes (door 1).

**Positions in the session part.** Recommended: one live position (x, y, z) per node plus a pin;
2D draws them flat, and the depth kept across a switch to 2D stays internal and unsaved. A drawing
kept per dimension was considered: a 2D layout is a different embedding from a 3D one, and
analysts who switch may expect each back. It is rejected for now because it adds a second position
column to every file and to every undo capture of the arrangement, and no workflow asks for it; a
saved view's position snapshot keeps a drawing an analyst wants to return to.

**Depends on it.** The project object (door 6), every stored reference, Version history and
Replace data.

### 3. Edge identity

**Decision.** What key identifies an edge in the file.

**Why it is a door.** Today graphty-element mints a counter for every edge, even when the file names
its edges, and the counter restarts on every load (`research/graphty-today.md` 1.4, 7.15). If that
counter were written, every saved reference to an edge (a set, a path, a note, a result value)
would re-attach to a different edge after a save and reopen, with no error. Changing the key after
files exist re-keys all of them.

**Options.** The minted counter; the file's own edge id; the edge's ends plus a key.

**Recommendation.** The edge id from the imported data when it has one; otherwise (source, target,
key), with the ends put in canonical order on an undirected graph, so A-B and B-A are one edge, where the key is the file's key field or, when
there is none, the **ordinal**: the edge's position, in ingest order, among every edge of its pair
in the load that ingested it, stored with that pair's edge count in the load. That position is the
one exception to "never store a position". Counting every edge of the pair, not only those without
ids, means configuring an id later never moves an ordinal; counting per load means replacing one
source never shifts another's; and a reference binds only when exactly one edge matches its pair,
ordinal and count, so it reads missing rather than binding a different edge. An edge added in the
session gets a minted id in the reserved namespace `graphty:e<n>`, so ordinals cover only file
edges. After Add data the source is part of the key, so two sources' edges between one pair stay
apart. The counter may stay an internal handle and is never written (`element-contract.md` 2).
Reason: every other choice silently breaks references.

Three parts of this door are due before the release that writes the first project file:

- **The import report's edge-identity field.** The report must say "N parallel edges without ids:
  references to them match by position". That is a new public field on the import report, so its
  name and shape are part of this door. Recommended: `ImportReport.edgeIdentity` counting the edges
  that carry a file id and the edges matched by position.
- **Which file ids count.** graphty-element 2.x reads a file edge id only at a configured
  `edgeIdPath`, because probing files for ids would change how existing loads merge repeated edges.
  Recommended: default `edgeIdPath` to the format's declared edge-id field (GraphML, GEXF) in the
  major version that ships the project file.
- **The stable edge id's column name.** `session.snapshot()` in graphty-element 2.x already
  publishes the session counter under `graphty.edgeId`. A file column of that name would either
  hold a different value than the same-named snapshot column or tempt a writer to store the
  counter. Recommended: the file writes the stable id (the file's id, or a minted `graphty:e<n>`)
  under a name no snapshot uses for the counter, and never writes the counter.
- **The source column's name.** Recommended: `graphty.source`, stamped at import, with what counts
  as a source (a file, a query, a re-import of the same file) decided by the Add data design. The
  name is published the moment it is stamped, so it is decided with this door and not before.

**Depends on it.** Sets, paths, notes on edges, edge-keyed results, comparison matching.

### 4. Node identity when the data declares node types

**Decision.** In a two-mode table (users and items, authors and papers, genes and pathways), whether
user "123" and item "123" are two nodes or one.

**Why it is a door.** Node identity is the key of every saved project. Treated as one node, the two
silently share edges, which makes bipartite density and bipartite projection wrong with no warning;
switching later re-keys every saved project that declared types.

**Options.** The id alone, always; the node type plus the id once node types are declared.

**Recommendation: type plus id once the endpoint columns declare different node types; the id
alone otherwise.** The import report's first line counts the ids that occur under more than one
type, so the analyst sees the case at once. A file with no declared types behaves exactly as today
(`element-contract.md` 2; `content-design.md`, import report first lines).

**Depends on it.** Import, the id map, every stored node reference, bipartite algorithms, and the
sets design's stored form: a fixed set's `nodes` list, the `r1:` revision and the
`graphty.nodeHash` column all key a node by its `NodeId`. graphty-element writes no file yet, so the
sets branch can merge first, but this door must be answered before the first project file is
written, because a member list written without a node type cannot be given one later.

### 5. Whether style layers and rule sets belong to the project or to each graph

**Decision.** Where the definitions of style layers and rule sets are stored when a project holds
more than one graph.

**Why it is a door.** It fixes where these definitions sit in the file. Moving per-graph copies up
into shared project definitions later means deciding, for every old file, which copies were "the
same" style, which cannot be known.

**Options.** Per graph, with a "Copy to graph..." command; project-owned definitions, with each
graph holding an ordered stack of references to them.

**Recommendation: style layers project-owned, as Figma's local styles belong to the file and are
used on every page (`research/figma.md` 4); sets per graph.** "Condition Comparison - Disease vs
Control Networks" needs one encoding on both conditions, and "Gene List to Interaction Network with
Expression Overlay" names rebuilding the same style for a second list as a pain point; both are
about style layers. Sets stay with their graph, because a fixed set's members and a rule's
`results.<id>` paths name one graph's nodes and runs; the set id register is project-wide, so a
set id is unique across graphs, and a project-owned style layer that names a set another graph
lacks paints nothing there and says so. "Copy to graph..." copies a rule set to another graph.
Views and notes stay with their graph. The documents are written per graph until this is decided.

**Depends on it.** The Style layers section of the graph's inspector, "Add style layer", the
comparison surface, the file's session part.

---

## Part 2. graphty-element's published API

### 6. The project object

**Decision.** A new published object in the `./session` entry point: a project holding graph
entries by graph id, one undo history, one append-only operation log, a metadata block (title,
description, authors, license) and an `author` string the consumer sets. A bare
`createGraphSession()` creates an implicit one-graph project; `<graphty-element>` exposes
`element.project` beside `element.session`; comparison is `project.compare(a, b, { match })`
(`element-contract.md` 1).

**Why it is a door.** It is new public API on a published package, and undo, the log and the file
all hang from it.

**Options.** No project (a session is the file); a project object that a single-graph consumer
never has to touch; a project the consumer must always create.

**Recommendation: the project object, implicit for one graph.** It is the smallest shape that
carries a list of graphs (door 2) and one undo history across them, while a consumer with one graph
keeps writing exactly what it writes today.

**Depends on it.** Doors 2, 7 and 9, undo, Version history, comparison.

### 7. Result ids and run ids

**Decision.** How a result is named and when a new run joins it. A result id is a name minted at the
first run and never recomputed. For a **reading** kind (a metric, a partition, a graph statistic, a
series) it is derived from the algorithm, whether the method is exact or sampled, the frozen scope
and the source nodes; each such result holds one current run. For a **query** kind (paths, flows,
matches, pairs, comparisons) it is derived from the algorithm alone, every query is kept as a run,
and each run records its own scope. Each kind publishes `accumulates: "current" | "all"`. Every run
gets a persisted run id (`element-contract.md` 3).

**Why it is a door.** Style layers, rule sets, notes and saved documents reference results by id.
Today the published rule is "same definition, same id", derived from the parameters too; no
consumer has saved a derived id yet (`research/graphty-today.md` 7.11), so this is the last cheap
moment to change it.

**Options.** Keep "same parameters, same id" (every parameter tweak makes a new result, a new style
layer and broken references); "same algorithm and scope, same id" (tuning revises one result).

**Recommendation: same algorithm and scope, same id.** Tuning a resolution or a damping factor is
the most common edit, and it must repaint the same layers and keep notes attached instead of
growing the style stack. Parameters and seeds belong to the run. A sampled run is always a sibling
result ("Betweenness (sampled)"), never the current run of an exact one, so an estimate is never
shown under an exact name.

**Depends on it.** Style layers bound to results, rule sets, notes, the Results panel, the item
address (door 8).

**It blocks the sets branch.** graphty-element 2.x derives a run id from the scope as the caller
wrote it, so an unscoped run hashes the keyword `"visible"`. While every run computed over the
full graph, that was harmless. The sets branch (`feat/element-sets`) honors run scopes, so the
same unscoped PageRank started under filter A and then under filter B keeps one id and re-executes
in place, and every style layer bound to that id silently repaints from a different graph. The
branch must not merge until this door is answered, and the scope half of the recommendation (hash
the frozen scope definition, never the keyword) is needed even if the owner keeps parameters in
the id.

### 8. The item address

**Decision.** How one member of a result (a community, a component, a found path, a match) or one
category of an attribute is addressed without copying its members: (graph id, result id, run id,
level where the result has levels, item key), or (graph id, attribute path with its scope, value).
Freshness is derived when read and never stored (`element-contract.md` 4).

**Why it is a door.** Notes, kept sets and style layers store these addresses in files.

**Recommendation: as above.** Pinning the run is what lets a note say "Earlier run" instead of
silently pointing at a different community after a re-run.

**Its published spelling.** The sets branch publishes the address as `ResultItem { run, key,
execution? }`, where `run` holds today's `RunId` (which, under door 7, names a result) and the
opaque `execution` holds the per-execution run id; graph and level are optional fields added later.
The content is the same. The field names are persisted in every kept item reference, so they are
part of this door. Recommended, if door 7 is accepted: `{ result, run?, key }`, with `ResultId`
published as an alias of `RunId`, so no file stores a field called `run` holding a result id. If
door 7 is rejected, `{ run, key, execution? }` is correct as it stands. Item keys stay `{ field,
value }` for now; keys that name content (a component by its smallest node id, a match by the
elements it binds) are additive and arrive with Merge nodes forwarding.

**Depends on it.** Notes on groups, sets created from a group, highlights of one community.

### 9. The record and the operation log

**Decision.** Which operations write a record, and one record shape for all of them. Recommended
rule: an operation writes a record when it changes data or the data's declared semantics, or
computes values: every data operation (load, Add data, Replace data, Join, Re-map, Merge nodes,
Remove, Correct), Add attribute, Declare, a run, Profile groups, a layout run, a transform, a saved
comparison and Apply recipe. The log is keyed by record id, of which a run id is one kind; undoing
an operation that has no record appends nothing. The shape:
what it read (the frozen graph reference, columns and sets with their revisions), what ran (the
operation and its version, the engine -- CPU, or WebGPU with its adapter class -- parameters, seed,
how edges were read, exact or estimated with the sample size), who and when, and freshness and
status as separate fields. Whether a run is deterministic is declared in the algorithm catalogue,
never assumed. The log is append-only; undo appends an entry rather than erasing one
(`element-contract.md` 5).

**Why it is a door.** Records are kept forever and cannot be regenerated, so a field missing from
the first records is missing from every file written before it existed.

**Recommendation: as above.** It is what the methods text, Details on a run, Restore and the chain
of custody in "Reproducible Session and Network Publication" all read.

**Depends on it.** Version history, methods export, retention, the frozen graph reference (door
10).

### 10. The frozen graph reference

**Decision.** How a record states what graph it ran on: (graph id, data version, scope definition,
membership digest). A named set used in the scope is recorded as (set id, definition revision), so
no member list is copied; the digest covers the node ids and edge identities of the scoped
subgraph, and the edge reading (induced, listed or clipped) is recorded beside it
(`element-contract.md` 6).

**Why it is a door.** It is stored in every record. It also changes behavior: today every run
executes over the full graph whatever scope it records (`research/graphty-today.md` 7.7), so
honoring the scope changes the values of existing default runs.

**Recommendation: as above, with the behavior change in the same release as the new names.** A
number that silently ran on a different graph than the one it names is the most expensive error
the framework guards against (`principles.md` 1). The digest is versioned (`d1:` on the sets
branch) and is promised to reproduce after a save and reopen of a file that embeds the graph,
since the hash, ordinal and minted-id columns are written with it; that promise needs a test.
Comparing across a re-import from source or across copies of a project is a later digest version,
and a version mismatch reads as unknown, never as a change.

**Depends on it.** Freshness, "on: <scope>" labels, comparison, retention.

### 11. One set definition and the filter pipeline

**Decision.** graphty-element publishes four separate grammars for "which elements" today: `Scope`,
`Selector`, `SelectionTarget` and `Filter` (`research/graphty-today.md` 1.7). The owner already
decided on one vocabulary for sets; this door is its exact shape. The sets branch
(`feat/element-sets`, `design/sets/sets-design.md` there) builds most of it; its section 15.3 is
the itemized list of the same decisions.

**Why it is a door.** It renames and reshapes published types, and it changes the file: a saved
scope holds nodes only today, so a fixed set gains an edge member list, and the edge reading is
stored rather than inferred. A reading not stored now would have to be guessed for every old file.

**Options.** Rename only; the one grammar plus the filter pipeline inside the element; leave the
four grammars.

**Recommendation: the one grammar plus the pipeline, added beside the old names, which are removed
in one scheduled major version (door 15).** Shipping only the renames would leave the app to build
the filter pipeline and the search graph, which the architectural principles forbid. In detail:

- **One definition, three kinds.** `SetDefinition` is `fixed | rule | path`. A path is a set kind
  that keeps its walk (repeats allowed), with each step naming the edge taken, and its kind
  (simple, trail, cycle, walk) derived by `sets.pathKind`, never stored. One id space, one
  reference type and one lifecycle serve sets and paths.
- **Three edge readings**: `induced`, `listed`, and `clipped` for rules (the node half plus the
  edges the rule keeps whose ends are both in it; what a filter shows). A rule stores its reading,
  and a rule read induced that holds a leaf about edges is refused.
- **One reference.** The published `Scope` keeps every 2.x arm; `{ set: SetId }` stays a string,
  because widening it would break every reader of `spec.set`; `{ define: SetDefinition }` is added
  for an inline definition of any kind.
- **The rule tree.** `RuleTree` is added as an alias of `Filter` (deprecated), `SelectionDirection`
  of `FilterDirection`, and `SelectionOp` of `SetOp`, in the same release that adds `SetCombine`,
  so two `Set*` names never document a selection mode and a combination at once. The neighborhood
  leaf keeps its published field `seeds`: renaming a published field means reading both spellings
  forever, and `nodes` would mean start nodes in one leaf and members in another. New leaves:
  `member` (`{ kind: "member", of: Scope }`, the Membership predicate), `item` (one item of a
  result), and `threshold` keyed on a value path (`{ kind: "threshold", path, top?, above? }`, with
  `percentile`, `z` and `population` reserved). The style `Selector` gains `{ match: "member", of:
  Scope }`. The sets branch spells the leaf and selector `scope`; `member` and `of` are recommended
  so "scope" keeps one meaning, what something reads, and so a rule's own scope can be the field
  `scope?` (the branch reserves it as `within`). An absent rule scope means the full graph
  wherever the rule is stored (`sets-design.md` 4.3); a filter step says what it reads with its
  `input`.
- **Filter steps.** `FilterStep = { id, set: Scope, outcome, input?: "previous" | "full",
  workingSet?, enabled }` at `session.visibility.steps`; what a step reads is its `input`, never
  its rule's missing scope. A step with `input: "full"` evaluates on the full graph and then
  intersects with (filter-to) or subtracts from (filter-out) the previous step's output, never
  bringing back a removed element. The search graph (`"search"`) is the steps before the first
  working set plus every later **local** step (no leaf reads topology or a structurally defined
  set), because a local step gives the same answer on any input and two commuting steps must not
  give two shortest paths; only a **structural** step after a working set is lifted with it.
  Rejected: re-evaluating later data steps on the lifted graph (one step would mean two
  things) and forcing working sets to the end of the list (it reorders "neighbours of the seeds,
  then the 3-core", which analysts run as one chain).
- **The verbs.** `session.sets` with `list`, `get`, `status`, `pathKind`, `containing`, `usedBy`,
  `offers`, `create`, `createFrom` (Create set; `follow: true` keeps a following rule over an item),
  `createPath`, `combine`, `rename`, `redefine`, `addMembers`, `removeMembers`, `remove` and
  `restore`. The removal verb is `remove`, as every published removal verb is (`runs.remove`,
  `styles.remove`, `scope.remove`); the screen word stays Delete. `combine` always writes a fixed
  set; its optional `live: true`, added in the release that builds the screen's set operations,
  writes a rule set with the same edge rule, and the screen's Union, Subtract, Intersect and
  Exclude use it. `restore` emits one `set:changed` with change `"created"`.
- **Freshness** gains `unresolvable` beside `detached`, both derived on read.
- **Old saved scopes.** `scope.save` of `"selection"` freezes into a fixed set read induced (the
  2.x keyword is node-induced); of `"visible"`, into a fixed set read listed, or induced when no
  edge was hidden, because induced would re-add every edge the filter hid.
- **The event** `set:changed`, per set, as style layers have `style:changed`.
- **The persisted form**: the record `{ id, name, order, definition, createdFrom }`, the canonical
  form, the `r1:` revision, the member hash columns and edge stable identity (door 3), with unknown
  kinds kept opaque on load.

How each of today's published arms maps onto this shape is in `glossary.md` 17, item 1.

**Depends on it.** Every surface that asks "which elements", the filter chip, Create set, run
scopes, the file.

### 12. The expression language

**Decision.** JMESPath stays for field paths and plain predicates, as every selector, saved scope and
style document already writes it. What JMESPath cannot express -- relative thresholds (top 10%,
percentile, z-score), a comparison against another element's value, arithmetic for expression
columns -- is added as structured JSON forms published in the Node-safe `./schema` entry point.
Aggregates over a node's neighbors are algorithm runs, not expressions (`element-contract.md` 9).

**Why it is a door.** Expressions are stored in files and written by consumers.

**Options.** Replace JMESPath with a new syntax; extend JMESPath with custom functions; keep
JMESPath and add structured forms.

**Recommendation: keep JMESPath, add structured forms.** Every existing saved document stays valid,
no parser is invented, and the forms are data a UI can build and read back.

**Depends on it.** Rule sets, thresholds from a histogram band, expression columns.

### 13. Reserved path roots

**Decision.** Which roots a field path may start with, and which field names under a result are
reserved. `results` is published; imported and authored attributes are read under `data.`
(`ATTRIBUTE_PREFIX`). `graph.<measure>` is wanted for always-available measures such as degree,
read live over whatever scope the reader has, and `runs` names one run under a result
(`element-contract.md` 9).

**Why it is a door.** A path root added after users have stored paths changes what those paths
mean. graphty-element 2.x reads any path that is not under `results.` as an attribute, so a stored
threshold over `graph.degree` resolves to nothing today and would silently change meaning when the
root arrives.

**Recommendation: refuse every root other than `data` and `results` at the doors now, so `graph`
is additive later; enforce that no result field is named `runs` by a catalogue check.** Degree and
the other always-available measures need a stable path that is not a run. Because attributes live
under `data.`, an imported column called "graph" is `data.graph` and cannot collide, so no column
is renamed on import. No `sets` root is reserved: membership is the `member` rule leaf (door 11),
and a second grammar for it inside JMESPath is what door 11 exists to remove.

**Depends on it.** Style layers and table columns bound to degree, rule sets over always-available
measures.

### 14. Published names that make the documentation false

**Decision.** Six renames of names graphty-element publishes today, each added beside the old name
first (`glossary.md` 17, items 2 to 7):

| Published today | New | Why |
|---|---|---|
| `Path` (a JMESPath string) | `FieldPath` | a graph library whose `Path` type is not a graph path misleads its own docs |
| `Caveats.notes` | `Caveats.remarks` | "notes" must mean analyst notes only, before notes ship |
| `WeightMeaning` `"distance" \| "strength"` | `"distance" \| "similarity" \| "capacity"`; old files map "strength" to "similarity" | max flow reads capacity, which "strength" misstates |
| result shape `community` | `partition`, with `community` read as an alias | connected components are not communities |
| catalogue `plainName` as labels; `audience: "plain"`; `category`; `OptionChoice.label` | a sentence-case `displayName`; `plainName` becomes (i) text; `audience` deprecated; `category` becomes `family` | friendly substitutes for field terms ("Bridges" for betweenness) were ruled out, and a per-audience vocabulary is a persona-specific feature |
| `Run.engine` (package versions) | `Run.versions`, plus a new `Run.accelerator` (CPU or WebGPU) | a consumer reading `engine` expects CPU or WebGPU; nothing records which accelerator ran today |

**Why it is a door.** Consumers' code calls these names; removing the old ones is a breaking
change.

**Recommendation: all six, on the schedule in door 15.** Each one either makes the published
documentation false or collides with a word the interface needs.

**Depends on it.** Every screen label drawn from the catalogue, the weight-role row, the "Engine"
line under Details.

### 15. When the old names are removed

**Decision.** The date of the one major version of graphty-element that removes every deprecated
name in doors 11 and 14.

**Why it is a door.** It is a published promise to consumers.

**Recommendation: the same major version that ships the project file (door 1), so the first
released file format is written only with the new names.** It covers `ScopeId`, `SavedScope`,
`scope.save`, `scope.list`, `scope.remove`, `selection.promote`, and, once their aliases ship, the
names `Filter`, `FilterDirection` and `SetOp`. Until then the documentation carries one two-column
table of old and new names. The owner sets the date.

**Depends on it.** Release planning; the documentation.

### 16. The opening view mode on a desktop

**Decision.** graphty-element's published default for `view-mode` changes from 3D to 2D on a flat
screen, with 3D one click away on the view-mode button.

**Why it is a door.** It changes published default behavior for every consumer, and undoing it is
another breaking change.

**Options.** Keep 3D; 2D on a flat screen and 3D in a headset.

**Recommendation: 2D on a flat screen.** On a flat monitor 2D is faster for finding clusters with
no loss of accuracy against perspective 3D, and perspective distorts sizes and labels; the gains of
3D come from stereo and motion cues that VR and AR provide and a monitor does not (Greffard et al.,
Munzner; `research/graph-analysis.md` 6.9). It is the element's default, not the app's, so every
consumer gets it.

**Depends on it.** The view-mode button's initial value, stored views that do not name a mode.

### 17. The default scope of a layout

**Decision.** Which nodes a layout moves when the caller names no scope.

**Why it is a door.** It is published default behavior. A run records the scope it used, so a new
run default changes only future runs; a layout has no record in graphty-element 2.x, and today
every layout moves every node.

**Options.** The whole graph, always; the filtered graph, always; the whole graph until static
layouts have a placement rule, then the filtered graph.

**Recommendation: the whole graph in graphty-element 2.x, and the filtered graph in the major
version that ships incremental placement and a placement rule for static layouts.** The filtered
graph is the target (`conceptual-model.md` 4.4): a force layout over the whole graph lets
filtered-out nodes pull the drawn ones, so the drawing shows structure the analyst filtered away.
But today a static layout (Circular, Shell, Spectral) has no rule for where a subset lands among
nodes that do not move, so a filtered-graph default would refuse every static layout whenever a
filter is active, and hidden nodes would reappear at stale positions when the filter is removed.
Until then only simulation layouts accept a scope, and one layout scope is carried across layout
changes, which the Layout row shows.

**Depends on it.** `setLayout`'s `scope` option, the element's `layoutScope` property, the Layout
row, first placement.

### 18. What a reference to a deleted set resolves to, and Restore

**Decision.** What a style layer, filter step, rule or run naming a deleted set does, how long the
deleted set's record is kept, and whether `sets.restore` is published.

**Why it is a door.** It is published behavior of every surface that names a set, and the
tombstones are stored in the file.

**Options.** Resolve to nothing, with records in a byte-capped store that drops the oldest first
(the sets branch today); resolve through the kept record, with records kept while anything
references them.

**Recommendation: resolve through the kept record, keep a record while any live style layer,
filter step, rule set, note, view, layout scope or run whose values are kept names it, drop it once
nothing does, and publish `sets.restore(id)` in the same release.** Deleting a set then never blanks
a style layer or changes a filter, which is Figma's rule for a deleted main component, and the
sets branch's open problem goes away: a filter naming a removed set today hides every node without
a word. A byte cap could drop the one record a visible Detached mark needs, and "Restore set" would
then fail; an unreferenced record is dropped at once, so an assistant that creates and deletes
sets in a loop still cannot grow the file. The kept record is a definition, not a cached bitmap,
so what a detached reference resolves to does not depend on when a freeze happened. The id and
name are kept forever, so a status can always name what was lost. New work (a run, an explicit
layout scope) over a deleted set is still refused; only references that existed keep resolving.

**Depends on it.** Detached, Restore set, the tombstones in the file, `visibility.set` and
`styles.add` given a removed id.

---

## Part 3. Recipes, attributes and the words for filtering

These doors come from answering the owner's notes on the conceptual model and top tasks
(`conceptual-model.md` section 10, `top-tasks.md` "Owner questions answered").

### 19. The recipe: a project file with no data, and how it binds

**Decision.** Whether recipes and style files are profiles of the one project file (door 1) or
formats of their own; what a recipe declares about the data it needs; and how an overview recipe is
chosen.

**Why it is a door.** Communities will publish recipe files, and every one of them depends on the
part manifest and the requirement shape. A binding shape shipped without measurement levels or
weight roles cannot be given them later without guessing for every published recipe.

**Options.** A separate style format and recipe format; one container whose manifest lists the
parts present; a recipe that names attributes only, bound by name.

**Recommendation: one container.** The `.graphty` manifest lists which parts a file holds, and a
recipe is the profile with no data part; a style file is a recipe with only style layers. A recipe
declares one **requirement slot** per attribute it reads: element kind, measurement level (door
20), weight role for an edge weight (door 21), node- or edge-type role, and name hints; and one per
catalogue entry, by key and version. Parts keyed by element id cannot travel, so a recipe drops
working-set steps, fixed sets, notes on elements, positions, pins, the Overrides layer and the
camera, and turns the rest into slots of these published kinds: **attribute**, **catalogue**,
**set** (a rule that referenced a fixed set), **argument** (a node-valued argument such as a
shortest path's source and target, bound by the analyst or left unbound and switched off),
**requirement** (each declared property, such as direction or the parallel-edge policy, checked
against the target and never overwritten) and **source** and **join** (an optional data-source
query, field mapping and join key with its expected columns, with the analyst's own inputs left
open). Applying is one published verb, `applyRecipe`, which binds by name, always asks for weight
roles, lists every mismatch, and keeps anything unbound switched off and listed with the steps it
blocks. Applying copies definitions in and stores their provenance, and an improved recipe is
offered, never applied by itself (the owner's question in plain words: "when a community improves
a recipe you applied, should your project be offered the update, or change by itself?"; offered).
The overview is a recipe applied at load over a fixed floor; the project file names which recipe
that is, and no separate `overviewRecipe` element property is published. There is no per-reader default:
the file alone decides what "characterize" means for a shared project. graphty-element ships one
overview, General; Flows and Groups are documentation examples, because no workflow opens on a
domain-first view (`design/designloom/workflows/W02.yaml` is the only overview-first workflow, and
its overview is generic). **Result references in a recipe**: every run specification carries an
author-assigned result id (`as:`), and the recipe's rules and style layers name results only by
those ids, because a derived result id hashes the source nodes and would change on other data; a
rule leaf holding one specific run is rewritten on export to follow the current run. Rejected: role binding with an open role vocabulary ("the similarity
role", "the group role"), a published vocabulary no workflow asks for.

**Depends on it.** "Start from a recipe", "Reuse an analysis" and "Share a recipe" in
`top-tasks.md`; `conceptual-model.md` 8; the binding step in `interaction-patterns.md`.

### 20. A measurement level on every attribute

**Decision.** Whether graphty-element publishes an attribute's measurement level, and its values.

**Why it is a door.** It is a new field on the published `AttributeDescriptor`
(`graphty-element/src/catalog/types.ts:655`), stored in files and read by recipes, style layers
and scale pickers. Today no level exists: "category" is inferred from dataset size
(`src/session/attributes.ts:124`, `unique <= max(2, sqrt(total))`), so the same column changes type
between a small and a large file, and integer-coded categories are read as quantities.

**Options.** Keep inference only; a declared field with inference as the fallback.

**Recommendation: a declared field, `measurement: "nominal" | "ordinal" | "quantitative" |
"temporal"`, inferred only when undeclared and correctable in the import report; partition results
declare `"nominal"` by construction.** The screen words are categorical, ordinal, quantitative and
time (`glossary.md` 6). The scale descriptors' existing `domainKind` (`src/catalog/scales.ts`)
then matches against it. The catalogue scale named `ordinal` (`src/catalog/scales.ts`) is d3's
categorical lookup, not the ordinal level, and will mislead anyone who reads both; recommendation:
publish `categorical` as its preferred name beside `ordinal`, deprecated, in the same release.

**Depends on it.** Door 19; the scales a style layer offers; the column header's type control.

### 21. The weight role belongs to the attribute

**Decision.** Where the meaning of an edge weight is published.

**Why it is a door.** graphty-element publishes the meaning on the run only, as
`WeightMeaning { attribute, meaning: "distance" | "strength" }`
(`src/session/runs/types.ts:169-173`). The framework declares the role once on the attribute and
records it on every run. Recipes bind to it, so its home and values are fixed once recipes exist.

**Recommendation: a role on the edge attribute, `"distance" | "similarity" | "capacity"`, absent
while unknown, with every run still recording the role it read; a similarity may be declared
`signed: true`.** Three values, because no
catalogue algorithm needs a fourth: max flow is the only capacity reader, and it treats its value as
a bound, not an affinity; graph-format already has a separate `capacity` column role, so one edge
can carry a cost and a capacity (`graph-format/src/types/columns.ts:156`). The run-level rename is
door 14; this door adds the attribute-level field. Signed similarity exists because correlation
and co-expression networks are negative by design (Hub Gene Identification, Condition Comparison);
negative distances and capacities stay errors. Taking the absolute value is allowed only as an
explicit transform the record names, because it silently merges anti-correlation into correlation
(`graph-conventions.md` 2).

**Depends on it.** Door 19; `graph-conventions.md` 1; the weight row of the import report.

### 22. `"filtered"` as the name of the filtered-graph scope

**Decision.** Whether graphty-element publishes `"filtered"` beside its scope value `"visible"`,
which is the default scope of every run (`src/session/runs/RunsApi.ts:399`) and names the filtered
graph, not what is drawn.

**Why it is a door.** A drawing word governing analysis is where the owner's "two kinds of filter"
question came from. Renaming a published default changes consumers' code.

**Recommendation: add `"filtered"` as the preferred name, deprecate `"visible"`, and ship both in
the same major version that moves the layout's default scope to the filtered graph (door 17).**
Shipped alone, "filtered" would promise something layouts do not yet do.

**Depends on it.** Door 17; `glossary.md` 7 and 17.

### 23. Detected graph properties as a scoped read

**Decision.** How graphty-element publishes facts such as acyclic, bipartite, connected and the
self-loop and parallel-edge counts.

**Why it is a door.** A published name such as `graph.isDag` reads as a fact about the full graph,
but a filter can make a cyclic graph acyclic, so every precondition checked against it would be
wrong on a filtered run. Consumers will call whatever ships.

**Recommendation: one read that takes a scope, `properties(scope)`, whose default scope is the one a
run would use, and algorithm preconditions declared in the catalogue against those facts.**

**Depends on it.** `graph-conventions.md` 1; precondition marks; the Statistics of every scope.

### 24. Edge types in the neighborhood rule

**Decision.** Whether the neighborhood rule leaf gains an optional list of edge types (or an edge
set) to traverse: "within 2 hops over transfers edges".

**Why it is a door.** It changes the published rule leaf of door 11, which is stored in files.

**Recommendation: add it as an optional field of the neighborhood leaf, together with a
`direction`, `"in" | "out" | "all"`, default `"all"`.** The default keeps what the leaf does today
(it counts hops both ways) and matches Cytoscape's first-neighbour selection; NetworkX's
`ego_graph` follows successors only, so the choice is stated in the methods text. Typed traversal is how
knowledge-graph and fraud analysts query (relationship-type patterns in Cypher, metapaths in
heterogeneous networks), and every other route to it is a filter step that also changes scope.

**Depends on it.** Door 11; Select neighbors' split button; `conceptual-model.md` 4.1.

### 25. What a working-set step stores

**Decision.** What a working-set filter step becomes after Filter to neighbors or Include found nodes
adds to it. Select neighbors changes only the selection and never adds to it.

**Why it is a door.** It is part of the published `FilterStep` shape (door 11) and of every saved
file, and the methods text is written from it.

**Recommendation: the step stores the union of its rule and each addition, each labelled with the
command that made it ("+37 by Filter to neighbors, 2 hops, from 3 nodes"), and the step's kind
follows the command that created it, with no published toggle.** A walkthrough of "Fraud Ring
Investigation" showed that without the working set the methods text states a cleaning judgement the
investigation never followed. graphty-element keeps one node mask and one edge mask for all steps
(`src/session/visibility/VisibilityApi.ts:409-445`), so "excluded by step X" and per-step
membership need either a mask per step or re-evaluating each step's predicate on request; that
element change is not yet filed.

**Depends on it.** Door 11; `conceptual-model.md` 4.4; the methods text.

### 26. Whether a finished run paints itself

**Decision.** What happens to the look of the graph when an algorithm run completes.

**Why it is a door.** graphty-element 2.x paints automatically (`RunStyle` on by default) and
suppresses the suggestion when an enabled authored layer writes the same channel
(`src/session/styles/autoApply.ts:182-197`). Turning the default off changes published 2.0
behaviour.

**Options.**
1. Automatic paint with "covered" states: three screen states, four rules, and a coverage test on
   every layer edit; not what the element does.
2. Nothing paints; a run offers "Apply style" once: flips the published default, and adds a click
   to every run in 15 of 20 figure-producing workflows.
3. Keep suppression, and when a run's paint was suppressed say so once, "Color set by <layer>",
   with Apply anyway: one state, an additive "suppressed by" field on the run.

**Recommendation: option 3.** It matches what graphty-element already does, avoids both published
changes, and always tells the analyst why a result did not repaint. It departs from Figma, where
creating a variable paints nothing, and is recorded as a departure. The defect in the suppression
check (it ignores the authored layer's selector, so one hand-coloured node suppresses every later
automatic colour) is issue https://github.com/graphty-org/graphty-monorepo/issues/551 and is
fixed whatever the answer.

**Depends on it.** `conceptual-model.md` 5.1; `interaction-patterns.md`; `content-design.md`.

**Added by the information architecture.** A Look's `template` layers count as authored
(`src/session/styles/autoApply.ts:147`), so a Look that sets node colour suppresses every later
run's colour; and withheld suggestions are recorded nowhere, so "suppressed by" should be one value
of a per-run outcome per suggested channel (`element-contract.md`, "Received from the information
architecture").

### 27. Identifier lists as rule sets, and the list file formats

**Decision.** How a list of identifiers from outside (a gene list, known fraud accounts, a
threat-intelligence indicator list) enters a project, and which file formats are read.

**Why it is a door.** Communities publish such lists and recipes will carry them, so the stored
shape and the formats read are depended on by files other people write.

**Options.** A fixed set of matched element ids; a rule set over an identifier attribute.

**Recommendation: a rule set, `categories` leaf over a declared identifier attribute, with an
import that reads plain text (one value per line) and GMT (one named list per line) and reports
matched, unmatched and duplicate values as a Join does.** A rule binds by value, so the list
travels in a recipe without the data and re-matches after Replace data; a fixed set of ids does
neither. Create set freezes it when the analyst wants the matched members kept.

**Depends on it.** `conceptual-model.md` 4.1, 8; door 19.

### 28. How a refreshing data source maps onto data versions

**Decision.** Open question, no recommendation yet: what a data source that refreshes often (a SIEM
or transaction feed) does to the data version chain and the undo history.

**Why it is a door.** Data versions and their records are stored in the file (door 2); if every
refresh is an Add data, an active incident floods both.

**Options.** One data version per refresh the analyst accepts, with automatic refreshes merged into
one step; refreshes outside the undo history, with one version per accepted batch; refreshing
sources out of scope.

**Depends on it.** `conceptual-model.md` 3.2; the cybersecurity workflows (Threat Hunting).

### 29. The source attribute that Add data writes

**Decision.** Whether Add data writes an attribute naming the source of every element it adds or
matches, its published name, and what it holds when several sources supply one element.

**Why it is a door.** A published attribute name written onto every element is stored in files and
read by rules and recipes. The sets design leaves `graphty.source` unwritten and ties the decision
to edge identity (`sets-design.md` 15.3 item 20, 19), because whether two sources' edges between
one pair stay parallel or merge decides whether the value is one source or a list.

**Options.** No source attribute; one categorical value, the latest source; a cover (a list of
sources) when more than one supplies an element.

**Recommendation: write it, as a cover when several sources supply an element, decided together
with door 3.** Intelligence and knowledge-graph analysts need to know which systems attested an
entity (Criminal Network Analysis, Knowledge Graph Construction); a single value overwritten by the
latest source loses that.

**Depends on it.** Door 3; `conceptual-model.md` 3.2.

### 30. Which algorithms are searches

**Decision.** How graphty-element knows that an algorithm reads the search graph rather than the
filtered graph.

**Why it is a door.** It is a new published field on the catalogue descriptor, which third-party
algorithms declare, and it changes which graph a flow value or a path length is computed on.

**Options.** A fixed list inside graphty-element; a descriptor field; every algorithm reads the
filtered graph.

**Recommendation: a descriptor field (for example `reads: "search"`), absent meaning the filtered
graph.** A search starts from named endpoints or seeds and walks outward; shortest paths between
endpoints declare it, and a max flow between two named nodes may. A list inside the element could
not cover third-party algorithms, and a list in the app is forbidden by the architectural
principles.

**Depends on it.** `conceptual-model.md` 4.5; `element-contract.md` 9.

### 31. The Overrides and Default look style layers

**Decision.** Whether graphty-element creates two layers of its own in every style stack --
**Overrides** (hand edits, top of the authored stack) and **Default look** (the bottom) -- whether
they are saved, and their published ids.

**Why it is a door.** A layer id written into files and read by consumers' code is a published
name, and a saved layer is file format.

**Options.** No built-in layers, hand edits becoming ordinary layers; the two layers, saved, with
reserved ids; the two layers, derived on load and never saved.

**Recommendation: the two layers, saved, with ids in the reserved `graphty:` namespace.** A hand
edit needs one place that wins over authored and algorithm layers and that a recipe can drop
(`conceptual-model.md` 8); the default look needs one place a style file can replace. Saving them
keeps a reopened project identical.

**Depends on it.** `conceptual-model.md` 5.1, 8; `element-contract.md` 13.

### 32. Style selectors that target a set as a whole

**Decision.** Whether a style layer's selector can target a set as one thing -- a collapsed set
drawn as one node, and the groups of a partition drawn as hulls with labels -- and the published
names of the channels it writes.

**Why it is a door.** The channel list is published schema (`element-contract.md` 13), and a
selector form is part of the one set grammar (door 11).

**Options.** No group styling; a closed list of group channels (hull, label, the collapsed node's
size and colour) on a set target; group marks as a separate object outside the style stack.

**Recommendation: a set target with a closed list of group channels.** "Enrichment Map - Pathway Similarity Network"
needs labels visible on themes and hidden on nodes, and "Cluster and Functionally Annotate a Molecular Network" writes
the top term as a cluster label; a separate object would sit outside the stack's order and legend.

**Depends on it.** `conceptual-model.md` 5.1; `glossary.md` "group mark".

### 33. The default overview recipe as an element option

**Decision.** How a consumer replaces the overview recipe graphty-element runs at Load, and the
option's published name.

**Why it is a door.** It is a published element option and a published default behaviour.

**Options.** Only the shipped General overview; a project setting only; three levels -- General
ships, a consumer configures the element's default, a project names its own and wins.

**Recommendation: three levels.** A project setting alone cannot serve a lab or a domain whose
every new file should start on its own overview, because a new file has no settings before Load.
The graphty app sets the consumer level from a reader preference; every level keeps the floor.

**Two halves, decided at different times.** That the element runs the General overview at load is
a published default behaviour; it is decided before the first build slice that ships it
(`implementation-mapping.md`, "Build order", slice 1a). The replaceable option and its name are
decided before slice 6, which ships them, so the first half does not wait on the second.

**Depends on it.** `conceptual-model.md` 8; `top-tasks.md`.

### 34. A shareable URL

**Decision.** Whether graphty publishes URLs that open something, and what they may carry.

**Why it is a door.** A URL that people paste into papers and chat must keep working, so its
grammar is a published contract.

**Options.** No shareable URL; a URL naming a data source and a recipe; a URL that also names a
place, a selection or a saved view.

**Recommendation: a data source and a recipe only, as `?data=<url>&recipe=<url>`**, read once at
startup and passed to the element's load. Both address files that exist today, and together they
let a community share a starting point without sharing its data. `project=` and `view=` are
reserved, not published, until projects and views have ids that survive a reload; a selection is
never in the URL (element ids are not yet stable across reloads, so the link would break silently),
nor are places, panels or modes, which are preferences or app state. Adding parameters later is additive; renaming these two is not.

Five grammars were proposed (the table groups the two hash forms), and the spread is itself the
reason to publish the least:

| Shape | Needs first | Verdict |
|---|---|---|
| `?data=<url>&recipe=<url>` | nothing; both address files that exist today | publish; read once at startup and passed to the element's load. A recipe URL shares a starting point without the data |
| `?data=&recipe=&mode=` | nothing | reject `mode`: Version history and comparison are app state, and a grammar can only grow |
| `?project=&graph=&view=&select=` | stable project and element ids across reloads, which do not exist yet | reserve `project` and `view`, unpublished; reject `select`, because a selection link must also restore focus, which a view link avoids |
| `/#/p/<id>?view=` or `#p=&v=` | a stable project id | reconsider when projects have one |

**Depends on it.** `information-architecture.md` 6; `element-contract.md`, "What a bare embed does".

### 35. Catalogue families, aliases and display labels

**Decision.** How the catalogue's families and search words are published.

**Why it is a door.** `AlgorithmDescriptor.category` is a published union
(`graphty-element/src/catalog/types.ts:508`). It is open (`(string & {})`), so adding a family is
additive; renaming or removing one breaks consumers who switch on it. New descriptor fields are
published names.

**Options.** App-side names and synonyms; the element publishes them.

**Recommendation: the element publishes them.** The families on screen are the element's
categories; the card sort (`research/study-schedule.md`) may propose new ones, added
additively. Add an optional `aliases` list to the descriptor, seeded from `glossary.md`'s rejected
synonyms, and an optional per-category display label, so a third-party picker and the app find and
show the same things. Rename or remove a category only with a deprecation cycle.

**Depends on it.** `information-architecture.md` 3 and 7; `glossary.md`.

### 36. Reading a file's profile before opening it

**Decision.** Whether graphty-element publishes a verb that says which profile a file holds
(project, recipe, style, data) before it is opened.

**Why it is a door.** It is a published verb, and it fixes how a profile is recognised on disk,
which door 19's manifest decides.

**Options.** The app sniffs files; the element reports the profile and parts.

**Recommendation: the element reports it.** One Open whose outcome depends on the profile is the
front-door model (`information-architecture.md` 6), and every consumer would otherwise reimplement
the sniffing.

The same read should carry the node and edge counts when the file states them, and the size after
a merge for Add data and Join, so a load that cannot fit is refused before it starts rather than
after it freezes. That refusal needs a designed memory figure: `graphMemoryBudgetBytes` has no
default and no reader today.

**Depends on it.** Door 19; `information-architecture.md` 6. `state-matrix.md` 5.3.

### 37. What explaining a painted value returns

**Decision.** Which fields `ChannelExplanation` and `StyleContribution` publish.

**Why it is a door.** They are exported types (`graphty-element/src/session/styles/explain.ts`).

**Options.** The layer id only; add `path: Path | null`; also `source`; a bulk read per column.

**Recommendation: add `path`, and a bulk read.** The path is already computed and is what lets a
value row and a table column show data and style together (`information-architecture.md` 8). A
`source` field is a convenience, since the layer id already reaches `Layer.source`.

**Depends on it.** `information-architecture.md` 5 and 8; `options-and-encodings.md`.

### 38. The fields the structure adds to the project file

**Decision.** The names and shapes of the session-part fields the information architecture needs
stored (the list is in `element-contract.md` 11): among them the order of the saved views, each
view's note order, item attributes, group columns, the start nodes of a neighbourhood or path
step, a filter step over items, per-run direction and weight overrides, the No value look, the
Default look and Overrides rows, the project's overview recipe and the applied recipes.

**Why it is a door.** Each field is added under the version number and tolerant reader, so adding
it later is additive. What is one-way is its name and meaning once files carry it. The view order
matters most: it is the report's page order, so a reader that dropped or reinterpreted it would
reorder every saved report.

**Options.** Store the view order as the order of the views array; store an explicit position per
view; derive it from creation time, with no hand order.

**Recommendation: the order of the views array.** It needs no second field that could disagree
with the array, it survives a tolerant reader, and a reorder is one undoable write of the array.
Creation order alone is rejected because "Findings Communication" reorders its pages. Name the
other fields with `glossary.md`'s preferred terms when the element adds them.

**Depends on it.** `element-contract.md` 11 and 13; `information-architecture.md` 3;
`interface-specification.md` (the Graph panel's Views section).

---

## Part 4. Interaction state graphty-element publishes

These doors come from `interaction-patterns.md`. Each is a name or type a consumer's code would
call, so it is fixed once published.

### 39. Selection as published element state, and a selection over the cap

**Decision.** The selection's kinds (elements, or one primary object as a whole), the cap, and how
a selection larger than the cap is represented.

**Why it is a door.** The kinds and the representation are types every consumer reads; the
`SelectionCause` values (including the undo design's `"history"`) are matched by name.

**Options.** Truncate at the cap; turn an over-cap selection into an object selection; hold every
id and draw one selection-banded hull with a count badge above the cap.

**Recommendation: hold every id; above the cap draw one selection-banded hull with a count badge (`visual-language.md` B6).** Storage is
already one byte per element (`session/selection/SelectionApi.ts`), so the cap limits only highlight
instances. Truncation makes a later Filter to analyse part of what was chosen, and an object
selection made from a box has no object behind it. Make the cap configurable, as the documented
`config.selectionCap` promises (today `GraphSession.ts` never passes it). The undo design's rule
that an over-cap step leaves the selection unchanged is revisited when the cap changes.

**Depends on it.** `interaction-patterns.md` 3.1 and 4.1; `state-matrix.md`; `conceptual-model.md` 2.

### 40. The focused node and its event

**Decision.** A published "focused node" state on the canvas, distinct from the selection, with a
change event, which the arrow keys move between neighbours.

**Why it is a door.** A published name and event that assistive layers and consumers bind to.

**Options.** No focused node (keyboard users cannot explore the drawing); a focused node in the app
(a bare embed has no keyboard access); a focused node in the element.

**Recommendation: in the element**, with neighbour order stable and not spatial. It also requires
the plain arrow keys to stop moving the camera (`cameras/OrbitInputController.ts:164-176`,
`cameras/TwoDInputController.ts`). That reassignment breaks current behaviour: today the arrows
orbit, and there is no telemetry or interview to say whether readers rely on it. So the walk never
ships on the arrows while the camera still holds them; the move ships in one release with camera
step controls and a changelog note, and a keyboard-only task test with screen-reader users
(`research/study-schedule.md`) is the evidence still owed.

**Depends on it.** `interaction-patterns.md` 9.2 and 9.4.

### 41. A `previousSelection` command

**Decision.** An element command restoring the selection held before the last change: one step,
not a history.

**Why it is a door.** A published command name.

**Recommendation: publish it with one-step semantics** (`glossary.md`). A history ring would be a
second undo stack for state declared outside undo; widening later is additive, narrowing is not.

**Depends on it.** `interaction-patterns.md` 4.4; `conceptual-model.md` 2.

### 42. The cost class as a public catalogue field

**Decision.** Whether each catalogue entry and `session.estimate` publish a cost band that the
commit rule reads, including an explicit "no cost model" answer.

**Why it is a door.** The band words and the "no model" value are read by every consumer's run
controls; renaming a band breaks them.

**Recommendation: publish the band from `glossary.md`'s list and `available: false` for no model.**
The app must never guess a cost, so the element has to say when it cannot. Widen `estimate` to
layout runs too: today it accepts only algorithm runs (`SessionCommand = AlgorithmRunCommand`,
`session/planning.ts`), so a layout parameter edit has no estimate and the cost rule has to treat
it as live by kind (`interaction-patterns.md` 3.3). Style edits, filter-step toggles and view edits
need no estimate, because they compute no values.

**Depends on it.** `interaction-patterns.md` 3.3 and 6.1; `options-and-encodings.md`;
`principles.md`.

### 43. `history.nextUndo` as a published label

**Decision.** Whether `history.nextUndo` (undo design 6.1) is public, with a label that
distinguishes cancelling pending work from undoing a step.

**Why it is a door.** Every consumer's Undo control and tooltip reads it.

**Recommendation: publish it**, with the kind (cancel or undo) as a field and the label built from
the command's name, so a bare embed can show "Cancel Betweenness" before the press.

**The label's grammar is part of this door.** `content-design.md` 3 gives imperative labels
("Change color of Hubs", shown as "Undo Change color of Hubs"); the undo design's command
definitions use the past tense ("Changed colour of Hubs", undo design 4.1 and 5). Once
consumers display the string, changing its grammar changes every consumer's Undo tooltip.
**Recommendation: imperative**, because the same name serves the palette, the menu and the undo
label, so one string is written per command, and because the undo design's British spelling
breaks the American-spelling rule in any case.

**Depends on it.** `interaction-patterns.md` 3.4 and 7.1.

### 44. An "invocable from" field on the command registry

**Decision.** Whether each registered command declares where it can be invoked (menu, palette,
context menu, keyboard), so the command catalogue is generated rather than hand-kept. "The
registry" is the undo design's command definitions (`CommandDefinition` in
`graphty-element/src/session/commands/`, undo design 4.1), not the assistant's `CommandRegistry`
in `src/ai/commands/`, which should be derived from the same definitions. The same field set
carries each object's command order for its context menu and overflow
(`interaction-patterns.md` 6.7).

**Why it is a door.** A field of a published registry type that third-party commands must fill.

**Recommendation: add it as an optional field** with a stated default (palette only), so existing
registrations stay valid.

**Depends on it.** `interaction-patterns.md` 6.7 and 11.1.

### 45. The default palette colours on a dark canvas

**Decision.** Whether graphty-element changes the colours of its two default palettes so both hold
on a dark canvas: the default group palette's black (1.26:1 on `#1E1E1E`) and the default
measurement ramp's darkest step (1.45:1).

**Why it is a door.** The palettes are exported constants (`OKABE_ITO_COLORS`, `YLORBR_COLORS`)
and every saved graph that names no palette is drawn with them, so changing a value changes how
existing files look. A palette named "okabe-ito" that is no longer Okabe-Ito as published also
misleads anyone who chose it by name.

**Options.** Keep both and accept the failures on dark; change the values under the same ids; or
ship the changed palettes under new ids and make them the defaults, leaving the old ids unchanged.

**Recommendation: new ids, made the defaults.** Replace the group palette's black with purple
`#6929C4` and trim the ramp to `#FA9828 #EE7718 #D75908 #B44103 #8B3005`, which keeps every
colour at 2:1 or more on both canvases and every pair at the element's own separation floors,
including under colour blindness (`research/colour-checks.md` section 4). A file that named the
old ids keeps its colours.

**Depends on it.** `visual-language.md` Part B (palettes), `document-architecture.md` 7.3.

### 46. The default scale of the size channel

**Decision.** Whether a number bound to node size with no scale named is read linearly (today:
`defaultScaleFor` in `session/styles/encoding.ts`) or by square root, so area rather than length
tracks the value.

**Why it is a door.** It is a published default behaviour: every saved encoding that names no
scale would draw different sizes after the change.

**Recommendation: square root for the size channels only**, stated in the channel descriptor so
the legend and explain report it, and written explicitly into newly saved encodings so old files
keep linear. A linear length makes twice the value cover four times the area, which overstates
differences (`research/colour-checks.md` section 7).

A default chosen from the attribute's measurement level as well as the channel (categorical to
"One Colour per Value") belongs in the same change, since both alter what an encoding that names
no scale draws; it depends on door 20.

**Depends on it.** `visual-language.md` Part B, `options-and-encodings.md` 5.

### 47. The canvas marks

**Decision.** Whether `GraphStyle.selection` (today `{ color, scale, opacity }`, a gold halo drawn
as a tint on nodes only) becomes a two-tone ring on nodes and a two-tone casing on edges, and
whether graphty-element publishes its other canvas marks (member of a selected set, group or path;
hover and linked hover; keyboard focus; the highlight mark and its index badge; a path's ends and
direction of travel; comparison membership; hulls and count badges, including the selection over
the cap) as one API separate from the style channels, including a way to tell it which set, group
or path is selected.

**Why it is a door.** The selection style is a published, parsed schema that consumers already set;
the mark names and the "selected object" input would be new published API a third-party object
list depends on. Publishing a node-only shape and adding edges later would change it twice.

**Options.** Keep the halo and change only its color; add ring fields beside the old ones; replace
it with one mark schema (per mark: outer color, inner color, band width, dash), nodes and edges
together.

**Recommendation: one mark schema for nodes and edges, old fields read by the tolerant reader and
mapped.** The halo measures 1.13:1 on the light canvas and recolors the node it marks; no single
color, the accent included, clears 3:1 against both canvases and the palettes, and black (or
`#1A1A1A`) outside white does, by WCAG technique C40 (`research/colour-checks.md` 3.1, 6). Marks
outside the style channels keep them from covering an analyst's encoding. Band widths stay
provisional until the 3D and XR calibration runs.

The register of forms, each with one meaning, is `visual-language.md` B6; the API should carry
the same split it draws: object marks (kept in export, listed in the legend) and state marks
(dropped from export).

**Depends on it.** `visual-language.md` B2, B6, B11, B12; `interaction-patterns.md` 4.1 and 9.2;
door 39.

### 48. Theme-following defaults and the default grays

**Decision.** How graphty-element learns the page's theme, and which grays it draws unstyled nodes
and edges with.

**Why it is a door.** Every bare embed and every file that sets no background or color would look
different; a new property or file value would be published API.

**Options.** (a) Read the host's `color-scheme` and resolve the existing defaults from it, with no
new property; (b) a `background: "auto"` value in the file; (c) a published set of surface roles
(background, node, edge, label ink, label halo, selection), each with light and dark values.

**Recommendation: (a) plus one explicit `colorScheme` property (light, dark, auto; default auto),
`#808080` for both grays, and the element roles kept internal.** It fixes the defect (a light canvas
in a dark app, a `#FFFFFF` edge at 1.09:1 on the light canvas) with one small surface; (b) and (c)
are additive later if a consumer asks. The detection contract is part of the door: on auto, the
host's computed `color-scheme`, re-read on a `prefers-color-scheme` change and on attribute changes
to `document.documentElement`, `body` and the host, repainting live. The host-only signals miss the
commonest change: an app's theme toggle sets an attribute on `<html>` (Mantine's
`data-mantine-color-scheme`, which the graphty app's `DataGrid.tsx` observes for this reason) and
changes neither the OS preference nor the host. An explicit `GraphStyle.background` wins over the
theme: it is the counterpart of Figma's page fill, a saved document property. The element roles
(canvas, grays, halo, note ink, legend surface and ink, badge fill and ink, mark bands, comparison
ink) live in one element module with light and dark values; publishing them is option (c). In AR
the roles take the dark values until the passthrough measurement runs. A Look stays style
layers only and never sets the background, so no layer channel for a background is added. `#808080` is 3:1 or more on both canvases and Delta E 16.9 from the
overflow group's `#505050` (`research/colour-checks.md` 3.2).

**Depends on it.** `visual-language.md` B1.

### 49. The highlight palettes

**Decision.** Whether the exported highlight pairs (`BLUE_HIGHLIGHT`, `GREEN_SUCCESS`,
`ORANGE_WARNING`) lose their muted member, and whether a highlight is drawn by the `node.outline`
channel, by new hues (which would need a new palette `kind`), or by a neutral highlight mark that
is not a style channel.

**Why it is a door.** The pairs are exported constants and catalogue entries with a published
`kind`; files and suggested styles name them.

**Recommendation: drop the muted member from the defaults, and draw highlights with the neutral
highlight mark** (door 47): a highlight is a style layer with `LayerKind "highlight"` whose selector
feeds a mark slot (`mark: "highlight"`), indexed in stack order and outside the channel union in
`session/styles/channels.ts`. It stacks and undoes like any layer, is never offered for data
binding and is not counted with the 34 drawable channels, so the published channel descriptor gains
a mark kind beside the channels. Algorithm suggested styles that trace a result (a Dijkstra path)
use this kind; those that encode a value (a degree colour) stay channel layers. The first three are
told apart by dash inside the casing; a node in several takes one ring each in stack order, and a
fourth and later add an index badge listing every index. The muted half paints elements outside an algorithm's
result, which the Algorithm Styles rule forbids; the strong half equals Okabe-Ito slots 0, 2 and 3;
only three narrow violets pass every hue test (`research/colour-checks.md` 3.1), too few for a
palette; and `node.outline` is a data channel analysts bind, drawn on one shared highlight layer,
so a highlight on it would silently cover their encoding.

**Depends on it.** `visual-language.md` B5 and B6.

### 50. Grouping fields on the style channel descriptor

**Decision.** Whether `ChannelDescriptor` (`graphty-element/src/session/styles/channels.ts`) gains
`group` and `advanced`, as `OptionDescriptor` already has, and the published group names.

**Why it is a door.** It is an exported type, and group names are read by every consumer's style
editor.

**Options.** No grouping, each consumer grouping channels itself; the two fields on the descriptor;
a separate published grouping table.

**Recommendation: the two fields on the descriptor**, and a `group` on each `LabelStyle` field.
The closed card sort (`research/study-schedule.md`) confirms the grouping; order within a group
comes from effectiveness and workflow frequency, which a sort cannot measure. The group names,
which consumers read, are those of `options-and-encodings.md` 3 (Fill, Shape, Stroke, Effects,
Text, Ends). One form generator then draws style channels, algorithm options
and layout options alike, and the app keeps no copy of the grouping, which would be a copied
option schema.

**Depends on it.** `interface-specification.md` 5.10, 5.11 and 8.4; `options-and-encodings.md`.

### 51. The resolved value in the explain read

**Decision.** Whether each `ChannelExplanation` also carries the resolved value, beside the
attribute path door 37 adds and the layer id it already has.

**Why it is a door.** An exported type.

**Options.** Path only, the consumer reading the value from `merged`; value and path per channel.

**Recommendation: value and path per channel.** The inspector's bound-value row needs value,
attribute and layer on one read; pairing two reads is how two surfaces come to disagree about one
colour.

**Depends on it.** Door 37; `interface-specification.md` 3.1, 5.0 and 8.4.

### 52. A windowed, sorted, scoped row read

**Decision.** A published read that returns a window of node, edge or item rows under a sort key
and a scope, with the total count.

**Why it is a door.** A public API shape every table consumer codes against.

**Options.** Consumers sort the snapshot themselves; the windowed read.

**Recommendation: the windowed read.** Sorting half a million rows in the app computes over the
graph; compact-mantine's `DataTable` is already virtualized, so this is the only missing half.

**Depends on it.** `interface-specification.md` 5.16 and 8.4; `state-matrix.md` (over the drawing
limit).

### 53. Attaching one session to more than one view

**Decision.** Whether graphty-element publishes a way to attach an existing session to an element,
and whether each view may keep its own layout.

**Why it is a door.** A new published verb, and it fixes what two views share.

**Options.** No second view; attach-session with shared positions; attach-session with a per-view
layout choice.

**Recommendation: attach-session with a per-view layout choice.** The session already holds no
camera, canvas or scene (`src/session/GraphSession.ts` 1-11); the work is moving attributes into
the shared store (`src/Graph.ts` 317-319 reads them back from the renderer), a shared coordinate
array, and a per-view renderer. Until then the comparison surface is blocked, with a one-canvas
fallback recorded as a departure.

**Depends on it.** `interface-specification.md` 5.18 and 8.4.

### 54. Per-concern scale readings

**Decision.** How graphty-element publishes what size has done to the drawing and the commands:
one reading per concern, or one size class for the whole graph.

**Why it is a door.** Consumers branch on the shape and its level names.

**Options.** One `scaleClass` enum; no reading, so each consumer compares counts with
`Capabilities.limits`; one reading per concern.

**Recommendation: one reading per concern**, shaped `{ concern, observed, boundaries, level,
scope, basis }`, where `boundaries` is ordered and each entry names its limit, its value and its
basis, and `scope` names the filter and working-set steps the reading was computed on. Two kinds
of concern: capacity (node drawing, edge drawing, layout), read from counts on each commit, and
legibility (edge detail, labels with the label budget), read from screen measures at the end of a
zoom (`interaction-patterns.md` 10.1). A level name exists only where a boundary is published, so
no consumer meets a level it cannot place. For the selection, a reading of the mark:
`{ outlineCollapsed, cap, selected }`, where `selected` is every id held (door 39). Publish now
with `basis: "defaults"`; a later render probe changes only values and basis. A single class is
wrong for a graph with 8,000 nodes and 600,000 edges, which is over the edge limit and under every
node limit. No reading leaves every consumer holding a second copy of the rule
`session/limits.ts` was written to hold once.

**The interim defaults.** The names are the door; the default values are not. Until the probe
runs, lower `renderCeiling` to 17,000 and `edgesDrawn` to 170,000 with basis "measured, one
machine" (issues #388, #405): at 200,000 a 100,000-node graph freezes the page before any refusal
applies. A consumer can raise them; the probe replaces them.

**Depends on it.** `state-matrix.md` 5 and 6; `element-contract.md` 13.

### 55. `minMeaningfulNodes` on catalogue entries

**Decision.** Whether an algorithm entry may declare the smallest input at which its value means
something.

**Why it is a door.** A published catalogue field that third-party entries would fill.

**Options.** No field (the app would keep a table of its own, which the repository forbids); a
required field; an optional field with no default.

**Recommendation: optional, no default.** Below it the value carries a caution; an entry that
declares nothing gets none. Most entries have no honest number.

**Depends on it.** `state-matrix.md` 5.4.

### 56. A readability level per style channel

**Decision.** Whether the style capability reports, per channel, whether it can be read at the
current mark size.

**Why it is a door.** A published name and a closed set of levels.

**Options.** No level (a channel set by the analyst can silently not show); a continuous pixel
size; three coarse levels.

**Recommendation: three levels, `readable`, `zoom-to-read`, `not-drawn`,** changing only at a level
boundary, so a zoom does not re-render every style row. The proposed boundary for node channels is
a mark diameter of about 8 px; in 3D the size channel's reading says that size compares only nearby
nodes, because perspective shrinks distant marks.

**Depends on it.** `state-matrix.md` 6; `options-and-encodings.md`.

---

### 57. Reader text graphty-element publishes

**Decision.** What of the element's reader-facing text is public: the error `details` field names
(including `origin` and a reader cause), the message keys of its strings module, and the list of
canvas-drawn strings a consumer can read.

**Why it is a door.** graphty-element is consumed by third parties now. A consumer that switches
on a key, reads a `details` field or counts drawn strings breaks when any of them is renamed.

**Options.** (1) Publish nothing beyond the codes; each consumer writes its own reader text. (2)
Publish the codes, the `details` field names, `details.origin` and a reader cause now; keep message
keys internal, with the element rendering its own reader text. (3) Publish the message keys and
their slots too.

**Recommendation: option 2 now, option 3 as the next door.** Option 1 hands every consumer the
work of turning developer text into reader text, which the architectural principles forbid. The
codes are already the contract and `details` is the structured part consumers need; key names are
still moving (`content-design.md` 8), so publishing them now would freeze a catalogue under review.
This follows Node.js, which treats `error.code` as stable and `error.message` as prose
(https://nodejs.org/api/errors.html). The canvas-string list is published with the legend model it
extends, or kept internal if the word counter can read the legend model alone.

**What option 2 publishes.** The element's reader text reaches every host the same way: each
published state or caveat carries its text beside its value, and each sentence arrives as an event
record with a finished `text` and `{code or kind, slots}` (`run-finished`, `run-failed`,
`import-report`, `delete-detached`, `history-undone`, `file-applied`, `export-finished`,
`save-failed`). Hosts place records and never import keys, so the graphty app has no privilege a
third party lacks. The discriminators the error classes read (`details.origin`, `details.source`,
`details.target`, `details.limitOf`) are published with `details`. If option 3 is taken, the ICU
MessageFormat template syntax of `content-design.md` 1 travels with the keys.

**Depends on it.** `content-design.md` 1, 4, 7, 8; `element-contract.md` 13.

### 58. The element's legend and not-drawn notice

**Decision.** Whether graphty-element draws a default legend and a not-drawn line in a bare embed,
publishes the legend model with drawn and filtered-total counts for a host that draws its own, lets
the host hide the element's not-drawn line when it shows its own, gives the model entries for object
marks (each highlight, a path's ends and direction, comparison membership) beside channel entries,
and publishes the figure export options (background: the view's own, transparent, white or the
light canvas; state marks off unless asked; the legend on).

**Why it is a door.** An attribute or option that shows, hides or hosts the legend, and the legend
model's shape, are published API.

**Options.** No drawn legend (every consumer builds one from `session/styles/legend.ts`); a drawn
legend only; a drawn legend plus the published model.

**Recommendation: a drawn legend plus the published model.** An encoding without its key misstates
its values (`principles.md` 1), and a third party should not have to write one. The legend uses its
own theme-following surface and the host's computed `font-family`, because a bare embed has no
compact-mantine tokens. The app hosts the element's legend rather than drawing a second one. Mark
entries are needed because highlights, paths and comparison membership carry meaning without being
channels; without them an exported figure shows marks with no key. Export follows Figma's frame
export: no background set exports transparent.

**Depends on it.** `visual-language.md` B8, B13; `interface-specification.md` 5.13; door 57.

### 59. Object-type names

**Decision.** Whether graphty-element publishes identifiers for its object types (node, edge, set
with its kind, path, group, result, filter, style layer, view, note, recipe, graph, attribute), so
a third-party object list keys its glyphs on the same names.

**Why it is a door.** Published names that consumers' code switches on.

**Options.** None published (each consumer invents names); a published string union.

**Recommendation: a published string union, in the Babylon-free `./schema` entry point**, matching
`glossary.md`'s terms. Until decided, the app keeps its glyph register keyed on its own names.

**Depends on it.** `visual-language.md` A7.

### 60. Data-bound fills drawn flat in 3D

**Decision.** Whether a node whose fill is bound to an attribute (categorical or ramp) is drawn
flat-shaded (`node.flat`) by default in 3D.

**Why it is a door.** A published default behavior: every saved 3D encoding would look different.

**Options.** Lit, as today; flat for categorical only; flat for every data-bound fill.

**Recommendation: flat for every data-bound fill, lit shading an opt-in finish the legend names.**
The renderer draws a bound fill flat while `node.flat` is unset; an explicit `false` opts into lit
shading. A binding never writes `node.flat` itself, since a layer writes only what it shows.
Shading changes luminance, the channel a ramp encodes, so a ramp suffers more than a palette; flat
fills are what let a legend swatch match a pixel.

**Depends on it.** `visual-language.md` B7.

### 61. How exports write caveats and missing values

**Decision.** How a data export (CSV, JSON, GraphML) carries a value's caveat (estimated, not
converged) and a missing value's reason ("not computed", "no value"), and how a missing value is
told apart from a stored empty string.

**Why it is a door.** A data format consumed outside graphty: an R or Python script that reads a
caveat column breaks when the column is renamed.

**Options.** (1) Caveats and reasons only in the methods text; cells hold bare values. (2) Sibling
columns per measure, `<column>__estimated` (boolean) and `<column>__missing` (the reason word),
present only when some row needs them; a missing value written as an empty CSV cell, JSON `null`,
and an absent GraphML `<data>`; a stored empty string written as `""` in CSV and JSON; the
`__missing` column is the authority where a cell could be either. (3) One long-format caveats
table beside the data, keyed by element id and column.

**Recommendation: option 2.** Option 1 loses the per-value caveat principle 1 requires; option 3
makes every consumer join two files to read one value. Every export also writes each result's
method, exact or approximated with its sampling parameters, beside its freshness in the methods
text, because a sampled value cannot be reproduced without them (`interaction-patterns.md` 10.7). The double underscore keeps the suffix from
colliding with an attribute's own name.

**Depends on it.** `content-design.md` 5; the export writers in graphty-element.

### 62. A pick-a-target command and level-filtered attribute lists

**Decision.** Whether graphty-element publishes a command that arms a pick on the canvas, resolves
the next click to node or edge ids and cancels on Esc, and lists of attributes and partitions
filtered by measurement level; and whether it also ships the form fields that use them.

**Why it is a door.** A published command, its event and its result type, which every consumer's
option form calls.

**Options.** None, each consumer rebuilding picking and filtering; the command and the lists; the
command, the lists and ready-made form fields shipped with the element.

**Recommendation: the command and the lists, without form fields.** Picking and level filtering
are graph behaviour a third party would otherwise rebuild; the field that renders them is UI, and
graphty-element's consumers bring their own component library.

**Depends on it.** `interface-specification.md` 5.11; `element-contract.md` 13; door 20.

### 63. Scoped reads for the inspector

**Decision.** The shape of the reads an inspector needs beyond the graph and the selection:
statistics of any scope, an element's memberships, dependents, histogram bins over a scope, a
column profile, attributes shared and differing across a selection, and each style layer's
painted count.

**Why it is a door.** Published read shapes every consumer's inspector codes against.

**Options.** Consumers compute them from `snapshot()`; one read per question; one scoped-statistics
read taking a scope (a set, path, item, selection, or two scopes) plus separate membership and
dependents reads.

**Recommendation: the last.** Computing them in the app is the workaround the repository forbids,
and one scope argument serves the inspector, the comparison surface and the table's column
profile alike; memberships and dependents are graph relations, not statistics.

**Depends on it.** `interface-specification.md` 3, 4.1, 5.9, 5.12, 5.16; `element-contract.md` 13.

### 64. Setting a node's position

**Decision.** Whether graphty-element publishes one undoable command that sets a node's position
and pins it.

**Why it is a door.** A published command and its undo label.

**Options.** Dragging only; a position command that pins; a position command with an optional pin.

**Recommendation: a command that pins.** It is the single-pointer alternative to dragging (WCAG
2.5.7), and an unpinned typed position would be moved by the next layout step at once.

**Depends on it.** `interface-specification.md` 4.1 and 5.10; `interaction-patterns.md` 6.3 and
11.4.

**Sequencing.** Dragging a node already ships (the app listens for `NODE_DRAG_END_EVENT` in
`AppShell.tsx`), so the missing single-pointer alternative is a current WCAG 2.5.7 failure, not a
future one. It is filed as a defect now and fixed in slice 1b (`implementation-mapping.md`, "Build order").

### 65. The element's default keymap and tools

**Decision.** Whether graphty-element owns the canvas tools (Select, Lasso, Hand, Path, Note), the
canvas walk and its Esc rungs (abort a gesture, leave the walk or tool, deselect), and ships a
default keymap for them and its commands that a host can rebind.

**Why it is a door.** Default keys are published behavior: a host page's users learn them, and a
host that rebinds names them. Changing a default later changes every embed.

**Options.** Keys only in the app (`bindings.ts` today, so a bare embed cannot deselect with Esc);
tools and keys in the element with no rebinding; tools and keys in the element with a rebindable
default keymap.

**Recommendation: in the element, rebindable**, with modifiers written as Mod (Cmd on macOS, Ctrl
elsewhere), the camera moved off the arrows and Q and E (door 40), and a setting that turns
single-key shortcuts off (WCAG 2.1.4). While the canvas focus target has focus the element sees a
key first; elsewhere the app's keymap invokes the element's command by name. **Publish the minimal
form first:** the default chords as a read-only list, which a host's shortcut sheet and its
duplicate-chord check read, and no `match(event)` function. Rebinding is added when a consumer asks
for it; adding it later is additive, while a published matching function would be one more shape
to keep.

**Depends on it.** `interaction-patterns.md` 3.6, 5, 9.2 and 9.3; door 40.

### 66. What a style layer paints, as a query

**Decision.** A published read returning the elements a style layer paints (its selector's matches
where it wins at least one channel), or their count above the selection cap.

**Why it is a door.** A published name and return type that a host's layer list binds to.

**Options.** No query (the host evaluates selectors itself, which reimplements the element); the
matched elements only; the matched elements and, per element, the channels the layer wins.

**Recommendation: matched elements with a count, and the channels won as an option.** Hover over a
layer row and Select painted need the first; "partly covered" needs the second. A layer whose
selector matches everything returns a flag, so the host draws no hover mark.

**Depends on it.** `interaction-patterns.md` 4.7 and 6.8; doors 37 and 51.

### 67. Named text styles in the style file

**Decision.** Whether a text style (the `LabelStyle` record, `graphty-element/src/catalog/label-style.ts`)
becomes a named object in the style file, referenced by name from the five text channels (node
label, node tooltip, edge label, and the two edge-end captions), as Figma's shared text styles are.

**Why it is a door.** It adds an object and a reference form to the saved style format that
recipes and style files carry between communities.

**Options.** Inline records only, as today; a named style holding typography only (font, size,
weight, line height, alignment), as Figma's text style does, with a second named "label look" for
the box (background, border, pointer, shadow, badge); one named style holding the whole
`LabelStyle` record. Inline records stay accepted under either named form.

**Recommendation: one named style holding the whole record, recorded as a departure from Figma's
typography-only text style.** Each text channel otherwise exposes all 47 `LabelStyle` fields, 235
controls across the five, and a shared recipe cannot say "use the print label style" in one word.
The commonest label edit, "bigger labels with a white background", changes type and box together,
so splitting them would make two pickers per label for one intent. The popover still groups the
fields under Figma's section words (`options-and-encodings.md` 3). If the print-labels test fails,
the split is the alternative.

**Depends on it.** `options-and-encodings.md` 3.

### 68. Author presets on catalogue entries

**Decision.** Whether an algorithm or layout catalogue entry publishes named partial option sets
(ForceAtlas2's "LinLog", "Prevent overlap").

**Why it is a door.** A published field on the extension API every plugin author fills.

**Options.** No field (saved option values are recipe data); a `presets` list on the entry.

**Recommendation: defer.** A recipe with only an analysis part already carries saved option values,
and graph-size defaults belong to the element's defaults through `catalog.optionsFor`. Reopen when a
workflow gains a step that re-tunes a layout across datasets; none of the 25 designloom workflows
has one, though Gephi saves named layout presets (`LayoutPresetPersistence`).

**Depends on it.** `options-and-encodings.md` 9.6.

### 69. A group field on style layers

**Decision.** Whether `LayerSpec` gains a group or folder field.

**Why it is a door.** It changes the saved style format.

**Options.** No field, with adjacent layers of one run or recipe collapsed for display only; user
folders stored on the layer.

**Recommendation: no field.** Style layers override each other and contain nothing, so a folder
suggests that order inside it is local when precedence is global. The display-only collapse needs
no format change. Reopen if a tree test on a stack of 40 or more layers shows people need folders.

**Depends on it.** `options-and-encodings.md` 8; `state-matrix.md` 7.

### 70. Graph-dependent option bounds before `optionsFor`

**Decision.** Whether any catalogue option may publish a bound that depends on the loaded graph
(`OptionBound`, `graphty-element/src/catalog/types.ts`) before `catalog.optionsFor` is implemented.

**Why it is a door.** Option descriptors are published; validation skips any bound that is not a
number (`src/catalog/options.ts`), so such an option would accept every value, and consumers would
build against that behaviour.

**Options.** Publish them now; publish none until `optionsFor` resolves them.

**Recommendation: publish none until `optionsFor` ships.** Katz's alpha is the first option that
needs one: its fixed range admits values that diverge on dense graphs.

**Depends on it.** `options-and-encodings.md` 9.3.

### 71. Encoding a data attribute through `encode()`

**Decision.** Whether `EncodingSpec` (`graphty-element/src/session/styles/EncodingSpec.ts`) accepts
an attribute path in place of its required `run`, or a separate attribute-encode command is added
with the same defaults (`overflow: "other"`, one layer per source and channel).

**Why it is a door.** `EncodingSpec` is an exported type; making `run` optional or adding a `path`
changes its published shape, and saved encodings are keyed by it.

**Options.** `run` or `path`, exactly one; a separate `encodeAttribute(spec)`; neither, so a data
attribute is bound only through a layer's `encode` binding, with its different defaults.

**Recommendation: `run` or `path`, exactly one.** One verb ("Color by") then reaches result fields
and data columns alike, with one set of defaults and one repeat key, and a consumer does not learn
two commands for one intent. Until it lands, each column-header or data-row verb adds a new
layer; the verbs themselves wait only on one scale default on both write paths
(`element-contract.md` 13).

**Depends on it.** `options-and-encodings.md` 4.

### 72. A load preview before commit

**Decision.** The shape of a load preview graphty-element returns before a load commits: detected
format, how rows are read as nodes or edges, key column and roles, issues with a severity, a
sample, counts, and for a join the expected match count.

**Why it is a door.** A published read every consumer's import step codes against, and its issue
severities become names matched by consumers.

**Options.** Load commits at once and a report follows; a preview read, then a commit command
taking the confirmed mapping.

**Recommendation: a preview read, then a commit.** A blocking issue found after commit costs an
undo and a second load; the import workflow asks before commit which issues block. Detection and
mapping are graph work, so a consumer must never write them.

**Depends on it.** `interface-specification.md` 5.20a; `element-contract.md` 13.

### 73. A minimap the element draws

**Decision.** Whether graphty-element draws a minimap overlay, with a published toggle property.

**Why it is a door.** A published property and a piece of furniture every embed shows or hides.

**Options.** The app keeps drawing one; the element draws it, off by default; on by default.

**Recommendation: the element draws it, off by default.** A minimap computes the drawing's
bounds, which is graph work a bare embed would otherwise reimplement; off by default keeps a small
embed uncluttered. Until it lands the app's `canvas/Minimap.tsx` is a named workaround.

**Depends on it.** `interface-specification.md` 5.13, 8.4; `implementation-mapping.md` 5 and 8.

### 74. Declared preconditions on catalogue entries

**Decision.** Which fields a catalogue algorithm entry uses to declare what it assumes of the
graph, beyond today's `requires` (`directed`, `weighted`, `accelerator`, `connected`;
`graphty-element/src/catalog/types.ts`).

**Why it is a door.** The catalogue types are exported, and every consumer's precondition notes
and warnings read these fields; a field renamed or re-meant later breaks them silently.

**Options.** Keep `requires` as it is and fill it in; add fields for the edge reading each
algorithm uses (directed, undirected, or as declared), non-negative weights, and a
may-not-converge flag, with `connected` filled in where it applies; or leave preconditions to
prose in each description.

**Recommendation: add the three fields and fill in `connected`.** Today three entries set
`requires` and none sets `connected`, so closeness on a disconnected graph (a node in a two-node
component scores 1.0 and tops the ranking), HITS on undirected data, Katz diverging on a hub and a
global min-cut of 0 on a disconnected graph run with no note. Prose cannot drive a requirement
note or a failure branch.

**Depends on it.** `options-and-encodings.md` 9.3 (requirement notes); `task-flows.md` 3;
`element-contract.md` 13.

### 75. Where a layout run starts

**Decision.** Whether Run layout starts from the current positions or from a fresh start when the
caller does not say, and whether the layout run records which.

**Why it is a door.** It is default behaviour of graphty-element's published layout call and a
field of every saved layout run; a default changed later moves every consumer's drawing.

**Options.** Current positions by default, fresh on request; fresh by default, current on request;
left to each layout engine, as today.

**Recommendation: current positions by default, a fresh start on request, and the start recorded
on the layout run.** Task 7 asks that nodes stay near their previous positions unless the analyst
asks for a fresh layout (`top-tasks.md`), because a fresh start throws away the picture the
analyst had learned (`principles.md` 6). A layout that places from nothing (Circular, Shell)
ignores the start and records that it did.

**Depends on it.** Door 17; `task-flows.md` 3.1; `element-contract.md` 13.

### 76. A gesture a host control drives, as one undo step

**Decision.** How a control outside the canvas -- scrubbing a number field, dragging in a colour
picker, dragging a slider -- tells graphty-element where one undo step begins and ends, and how Esc
during that gesture puts the value back.

**Why it is a door.** It is a published verb on the session that every host control calls, and its
cancel meaning is behaviour consumers rely on. Two cancels with different meanings are already in
the undo design: aborting a transaction rolls back, while a style verb's cancel deliberately does
not revert. A third spelling would have to be named apart from both.

**What exists.** On the undo branch (`undo-design.md` 5.1 and 5.2), gestures the element starts for
user input, such as a canvas drag, are already one step. A host has two tools, and neither fits a
pointer-down to pointer-up gesture:

- `session.transaction(label, fn)` takes a callback, and records its step when `fn` settles. A host
  bridging pointer events would hold a promise open by hand and resolve it on release.
- Coalescing merges steps with equal keys only while less than `coalesceMs` (1000 ms) passes
  between them. A reader who scrubs, pauses over a second to look at the canvas, then scrubs on,
  gets two undo steps.

compact-mantine's `PanelField` already exposes `onScrubStart` and `onScrubEnd`, and its own comment
says to open an undo transaction at the start and close it at the end (`rows/PanelField.tsx`,
near line 243, PR #409 branch). The component and the element disagree on the shape of the call.

**Options.**

1. A handle: `session.beginGesture(label)` returns `{ tx, end(), cancel() }`. `end` records one
   step; `cancel` rolls every write back and records nothing.
2. A flag on the coalesce key: a key stays open until the host dispatches the same key with
   `final: true`; cancel is a dispatch with `revert: true`.
3. Nothing new: each host bridges `transaction` with a pending promise and an abort signal.

**Recommendation: option 1, built inside the element on `transaction`.** It is one object with the
lifetime of the gesture, which is how the host's pointer events already arrive, and its `cancel`
reuses the transaction's abort-and-roll-back, so the meaning is the one that already exists.
Option 2 needs no new object, but a key held open is invisible state that a host which forgets the
final dispatch leaves open forever, and a merge that ignores time changes what coalescing means for
every existing key. Option 3 is the workaround the repository's rules forbid: every consumer writes
the same bridging code. Figma behaves as option 1: a scrub or picker drag is one undo step however
long it pauses, and Esc mid-drag restores the value from before the drag. The element documents the
difference between this cancel (reverts) and a style verb's cancel (does not).

Whichever option is chosen must state two more behaviours, so the handle cannot leak the way option
2's open key does:

- **A gesture a host never closes ends on its own**: on `pointercancel`, when the control that
  opened it unmounts or loses focus, and when another gesture begins. The element ends it, not each
  host.
- **A cancelled gesture publishes `project:changed` with cause `rollback`**, the cause the undo
  branch already has for a revert that leaves no step, not a new cause.

**Depends on it.** `interaction-patterns.md` 3.6 (the Esc rung that aborts a gesture);
`implementation-mapping.md` (writes); `element-contract.md` 13; door 65.

### 77. Read identity, change events and windowed reads as published properties

**Decision.** Whether graphty-element promises three behaviours of its session to every host:
a read returns the identical object until an event naming its slice fires; every change to project
state publishes `project:changed { slices, cause }` and moves a version per slice; and every read
whose size grows with the graph is offered as a count plus a window.

**Why it is a door.** These are behaviours, not names, but consumers code against them. A React host
using `useSyncExternalStore` loops or tears the moment one read returns a fresh object; a host that
trusts the events to be complete never polls, and misses the one change that fires none. Once
consumers rely on `===` and on completeness, relaxing either breaks them silently.

**What exists.** On master the session publishes five events and nothing when data is loaded or
replaced (`src/session/types.ts:400`), which is why the graphty app listens for DOM events on the
frame. The undo branch adds `project:changed` over the `ProjectSlice` union and
`SessionHistory.version`, and already keeps history reads identical between changes
(`types.ts:676-756`). `SelectionApi.nodes` is identity-stable on master.

**Options.**

1. Publish all three, each enforced by an element test that calls every read twice.
2. Publish the events only, and let each host memoise reads on their contents.
3. Per-collection event names (`sets:changed`, `notes:changed`, ...) and one project-wide revision.

**Recommendation: option 1.** It is what lets a host be one hook and no cache, and a cache in the
host is where graph state leaks out of the element. Stable identity alone makes the hook correct.
Option 2 moves a correctness rule into every consumer. Option 3 publishes a second vocabulary for
the fact `project:changed` already carries, and each event name is a new published name; splitting
a slice inside `ProjectSlice` adds none.

**Open within this door: a version per slice, `versionOf(slice)`.** It would let a host compare
one integer per region instead of relying on identity, and avoid one project-wide number that
moves on every step. It exists nowhere today (the undo branch has one `history.version`). It is
recommended only if the operation-count test on the Large fixture shows regions re-rendering on
slices they do not show (`implementation-mapping.md` 11); until then it is not published.

**Depends on it.** `element-contract.md` 14; `implementation-mapping.md` 2 and 11; door 52.

### 78. The interaction state event

**Decision.** Whether graphty-element publishes the tool in force, the gesture in progress (idle,
drag, marquee, scrub, playback) and the walk's focused node as one event, `interaction:changed`,
with a synchronous, identity-stable snapshot read (`session.interaction`).

**Why it is a door.** A published event name and snapshot shape that toolbars, status lines and
key handlers bind to.

**Options.** None (a host tracks the tool from its own button clicks, a shadow copy that is wrong
the moment a key or the element changes the tool); one event per axis; one event with a snapshot.

**Recommendation: one event with the snapshot `{ tool, gesture, walkFocus }`.** None of these is
undoable project state, so none belongs in `project:changed`. A host's key handler reads
`session.interaction.gesture` before anything else, which is what lets its Esc give way to the
element while a drag, scrub or playback is in progress, the first rung of the Esc ladder
(`interaction-patterns.md` 3.6); no separate "is a gesture active" query is published. Keep the
snapshot minimal; fields are additive.

**Depends on it.** Doors 40, 65 and 76; `interaction-patterns.md` 3.6 and 9.2.

### 79. Availability with a reason on the command registry

**Decision.** Whether each command definition carries a predicate that returns enabled, or disabled
with a reader-facing reason, for the current selection and state.

**Why it is a door.** A published field of the command registry (door 44) that every menu, palette
and toolbar reads.

**Options.** The host decides availability (graph logic in the app, reimplemented by every
consumer); the element publishes the predicate and its reason.

**Recommendation: the element publishes it, added to a command when a surface first shows that
command disabled** rather than to every command up front. Every disabled action shows its reason
(`state-matrix.md` 9), and the reason is graph logic.

**Depends on it.** Door 44; door 57 (reader text); `interaction-patterns.md` 11.1.

### 80. Structural inputs described in the option descriptors

**Decision.** Whether an input a layout or algorithm needs but no option schema describes today --
the partition that bipartite, multipartite and shell require -- is published as an option
descriptor, so any consumer's option form can draw it.

**Why it is a door.** A new descriptor kind in the catalogue's published option types, which every
option form renders.

**What exists.** The catalogue marks these three layouts `structuralInputs: ["partition"]`
(`catalog/layouts.ts:400,491,505`), while the input itself lives only in each engine's internal
config: `nodes` (`BipartiteLayoutEngine.ts:48`), `subsetKey` (`MultipartiteLayoutEngine.ts:38`) and
`nlist` for shell. `catalog/optionsFromZod.ts` produces no descriptor for any of them, so no form
can run these layouts with a chosen partition.

**Options.** Leave it out (the three layouts are unusable from a form); each host builds a
partition picker from `structuralInputs` (the app working around the catalogue); a `partition`
descriptor kind in the option schema, listing the categorical attributes and kept set collections a
partition may come from, filtered by measurement level as door 62 filters attribute lists.

**Recommendation: a `partition` descriptor kind.** A generic option form then draws the row from
data like any other, and the layout's public schema says what it needs.

**Depends on it.** `implementation-mapping.md`, "The inspector and the editors" and "Build order" (slice 5); door 62; `element-contract.md`
13.

### 81. Splitting the undo release

**Decision.** Whether graphty-element's undo design ships as one 3.0.0 major, as `undo-design.md`
15.3 recommends (element-undo branch, PR #553), or is split so that the one change event
`project:changed` and its slices land first.

**Why it is a door.** It sets when a major version of a published package ships and which event
names consumers bind to in the meantime. The undo design rejects a split because the event and
union widenings are themselves breaking and two ways to do each thing would be published.

**What exists.** Master publishes `run:changed`, `selection:changed`, `visibility:changed`,
`style:changed` and `style:problem` (`graphty-element/src/session/types.ts`). A completed load is
announced only as the element's `data-loaded` graph event (`src/events.ts:78`), which a headless
session never raises. PR #553 is open and conflicts with master.

**Options.** Wait: the app's rebuild starts after the 3.0.0 merge. Split: `project:changed` ships
in a 2.x minor ahead of undo, which `undo-design.md` 15.3 argues is breaking anyway. Start on
master's events: keep 3.0.0 whole, and let the app's one read hook subscribe to master's existing
events plus one filed need, a session event for a completed data load; when 3.0.0 lands, only the
inside of the hook changes.

**Recommendation: start on master's events, and keep the undo release whole.** It takes the undo
merge off the critical path of the first usable slices without publishing a second event model,
and the one-hook rule keeps the later switch to one file. The only new published name is the
data-load event, which 3.0.0 keeps.

**Depends on it.** `implementation-mapping.md`, "Reads and writes" and "Build order"; `element-contract.md` 13; door 77.

### 82. A typed element handle, with camera commands on the session

**Decision.** Whether graphty-element exports a typed handle for the element instance, and moves
the camera actions a host needs (zoom step, zoom to fit, zoom to selection, the view presets, reset
view) onto session commands.

**Why it is a door.** A published type and published command names that every host codes against.

**What exists.** The app's handle type carries an index signature, so every member reads as
`unknown`; `graphty/src/components/shell/graphCommands.ts` and `analysis/elementBridge.ts` call
`Graph` methods by string name after a runtime check, and zoom to selection reads a node mesh
(`getNodeMesh`, `graphCommands.ts:167`) and picks its own zoom step. `GraphtyElement` is exported
as a type alias (`src/graphty-element.ts:3215`) without the session and camera members a host
calls.

**Options.** Leave it (every host duck-types, and the app stays the only one that knows how);
export the element class's type as it stands (exposes Babylon.js internals such as meshes); a typed
handle whose camera actions are session commands, undoable where they change a saved view and
testable headless.

**Recommendation: the typed handle, with camera actions as session commands.** A mesh is not a
host's business ("Graph Styling" in `CLAUDE.md`), and a command runs the same from a toolbar, a
chord, the palette and a bare embed.

**Depends on it.** `implementation-mapping.md` 8 and 11; `element-contract.md` 13;
`interaction-patterns.md` 11.1; door 40 (camera step controls).

### 83. The field-descriptor shape a generic option form reads

**Decision.** Which package owns the type that describes one option field (its kind, label,
default, bounds, choices, tier), so that compact-mantine's `SchemaForm` draws graphty-element's
algorithm and layout options with no adapter.

**Why it is a door.** It is published API of two packages at once: compact-mantine exports it, and
graphty-element's option descriptors are bound to fit it. Every later descriptor kind (door 80's
`partition`) must fit it too.

**What exists.** `graphty/src/components/options/OptionsForm.tsx` imports `OptionDescriptor` from
`@graphty/graphty-element/catalog`, which works only because the form lives in the app.
compact-mantine, a published design system, has no graphty-element dependency.

**Options.** (a) compact-mantine declares a generic field-descriptor type as its own API, and
graphty-element's `OptionDescriptor` is written to satisfy it structurally, checked by a type test
in graphty-element. (b) compact-mantine takes graphty-element as an optional type-only peer through
the Babylon-free `./catalog` entry. (c) An adapter in each consumer.

**Recommendation: (a).** The design system stays independent of a graph library, the element
conforms to the component that draws it, and no consumer writes an adapter. (b) makes a general
design system import a graph library's types; (c) is the adapter that drifts.

**Depends on it.** `implementation-mapping.md`, "The inspector and the editors";
`interface-specification.md` 8.3 (`SchemaForm`); door 80.

## Decided, and not doors

These look like doors but a version number, the tolerant reader or an additive change absorbs them.

| Decision | Choice | Why undoing it is cheap |
|---|---|---|
| Retention | records forever; values while something holds them; restore only under the recorded version and engine (`element-contract.md` 8) | keeping more values later is additive; the records, which cannot be regenerated, are already kept forever |
| Stored result precision | float32 for metric attributes and stored positions | a wider type is a new file version the tolerant reader accepts |
| Freshness | current, out of date, cannot re-run, detached, unresolvable, plus fields for a different scope, data version, values kept and earlier run | derived on read and never stored |
| Default scope of a run | readings and transforms: the filtered graph, frozen at start; searches: the output of the steps before the first working set | every run records its scope, so a new default changes only future runs (a layout's is door 17) |
| What Union, Subtract, Intersect and Exclude make on screen | a rule set naming its operands; Create set freezes it | the published `combine` keeps its fixed result and the live form is an optional member |
| Weight reductions | a declared reduction per weight attribute (sum, max, min) | a new reduction is additive and the one used is recorded |
| Note targets | primary objects, groups and other items, and the graph; citations of runs and filter steps | widening the targets is additive |
| The camera in a saved view | a Node-safe type from `./session` or `./schema` | a new camera field is additive |
| Comparison | a transient element object; only a saved comparison is in the file, as a run of a comparison result on the project | nothing transient is saved |
| Where the autosave keeps the project | the browser's storage for the site, made persistent | the file's shape does not depend on where it is kept |
| "suppressed by <layer>" on a run (door 26, option 3) | an additive field | additive |
| Positions readable in rules and the table | later, as a new path root (`position`) | door 13 refuses unknown roots now, so the root is additive |

This table was section 13 of the earlier conceptual model
(`research/archive/conceptual-model-long-form.md`). Also not doors:

- additive names published beside old ones (`Result`, `Run.name`, `freshness`, `scopeDiffers`,
  new result shapes, a session pin API): `glossary.md` 17;
- edits to catalogue content (display names in sentence case, layout names): `glossary.md` 17;
- what the nav rail holds, the inspector's order, every placement and every screen word:
  `information-architecture.md` and `glossary.md`, decided from the personas and workflows;
- URLs: a shareable URL is door 34. The documentation URLs that
  graphty-element's error messages already print (`https://graphty.app/docs/graphty-element/...`)
  are an existing contract: a page that moves keeps a redirect.

## Sources

- `design/ui/framework/conceptual-model.md` (sections 1, 2, 13)
- `design/ui/framework/element-contract.md` (sections 1 to 11)
- `design/ui/framework/glossary.md` (section 17)
- `design/ui/framework/information-architecture.md`; `output-homes.md`
- `design/ui/framework/principles.md`
- `design/ui/framework/research/graphty-today.md` (1.4, 1.7, 7.7, 7.11, 7.15, the autosave
  follow-up)
- `design/ui/framework/research/figma.md` (2.10, 4)
- `design/ui/framework/research/graph-analysis.md` (6.9)
- `design/ui/framework/research/key-insights.md` (section 9)
- `design/ui/framework/research/design-method.md` (section 8)
- `graphty-element/src/graphty-element.ts` (documentation URLs in error messages)
- `design/sets/sets-design.md` and `design/sets/reconciliation.md` on branch `feat/element-sets`
  (the sets design, its public contract list in section 15.3, and how each difference from this
  framework was settled)
- `CLAUDE.md` (root), "Architectural Principles"
- For doors 19 to 26: `graphty-element/src/catalog/types.ts:655`, `src/catalog/scales.ts`,
  `src/session/attributes.ts:124`, `src/session/runs/types.ts:169-173`,
  `src/session/runs/RunsApi.ts:399`, `src/session/visibility/VisibilityApi.ts:409-445`,
  `src/session/styles/autoApply.ts:182-197`; `graph-format/src/types/columns.ts:156`;
  `design/designloom/workflows/W02.yaml` and `W06.yaml`; issue
  https://github.com/graphty-org/graphty-monorepo/issues/551

## Moved out of the list

Additive proposals, now two-way decisions in `element-needs.md` (the full earlier text of each is in
`research/archive/one-way-doors-long-form.md` under the same number): 6 (merged into 2), 23, 24,
30, 32, 35, 36, 37, 41, 43, 44, 49 (merged into 47: cite door 47), 50, 51, 52, 53, 54, 55, 56, 57,
59, 62, 63, 64, 66, 68 (deferred: no row), 69 (withdrawn: the source fold needs no field), 70
(decided: no graph-dependent bound is published before `optionsFor`), 71, 72, 73, 74, 76, 77, 78,
79, 80, 82, 83. Door 43, `history.nextUndo`, is additive (its `element-needs.md` row).
Error text and message keys are additive, not doors, except the names door 87 records: `code`
plus `details` on `GraphtyError` is already the published contract; new `details` fields (file, line and column on `E_PARSE_FAILED`, the
discriminators in `content-design.md` 4) are additive rows in `element-needs.md`; the English default
text is an unpublished value any release may change. Publishing message keys for translation would
become a door at the release that publishes them; the recommendation is not to publish keys until a
translation exists (`content-design.md` 1).

