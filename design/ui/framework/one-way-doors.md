# One-way doors

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
is a graphty-element decision; none of them is app code.

**The rule that keeps this list short.** The project file carries a version number and is read by
a _tolerant reader_: a reader that accepts files with fields it does not know, keeps them, and
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
(`element-contract.md` 2; `information-architecture.md` 14).

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

| Published today                                                                        | New                                                                                                             | Why                                                                                                                                          |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Path` (a JMESPath string)                                                             | `FieldPath`                                                                                                     | a graph library whose `Path` type is not a graph path misleads its own docs                                                                  |
| `Caveats.notes`                                                                        | `Caveats.remarks`                                                                                               | "notes" must mean analyst notes only, before notes ship                                                                                      |
| `WeightMeaning` `"distance" \| "strength"`                                             | `"distance" \| "similarity" \| "capacity"`; old files map "strength" to "similarity"                            | max flow reads capacity, which "strength" misstates                                                                                          |
| result shape `community`                                                               | `partition`, with `community` read as an alias                                                                  | connected components are not communities                                                                                                     |
| catalogue `plainName` as labels; `audience: "plain"`; `category`; `OptionChoice.label` | a sentence-case `displayName`; `plainName` becomes (i) text; `audience` deprecated; `category` becomes `family` | friendly substitutes for field terms ("Bridges" for betweenness) were ruled out, and a per-audience vocabulary is a persona-specific feature |
| `Run.engine` (package versions)                                                        | `Run.versions`, plus a new `Run.accelerator` (CPU or WebGPU)                                                    | a consumer reading `engine` expects CPU or WebGPU; nothing records which accelerator ran today                                               |

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
3. Keep suppression, and when a run's paint was suppressed say so once, "Colour is set by <layer>.
   Apply anyway": one state, an additive "suppressed by" field on the run.

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

**Depends on it.** `conceptual-model.md` 8; `top-tasks.md`.

### 34. A shareable URL

**Decision.** Whether graphty publishes URLs that open something, and what they may carry.

**Why it is a door.** A URL that people paste into papers and chat must keep working, so its
grammar is a published contract.

**Options.** No shareable URL; a URL naming a data source and a recipe; a URL that also names a
place, a selection or a saved view.

**Recommendation: a data source and a recipe only.** Places and selections stay internal until a
study shows analysts share them; adding them later is additive.

**Depends on it.** `information-architecture.md` 6; `element-contract.md`, "What a bare embed does".

### 35. Catalogue families, aliases and display labels

**Decision.** How the catalogue's families and search words are published.

**Why it is a door.** `AlgorithmDescriptor.category` is a published union
(`graphty-element/src/catalog/types.ts:508`). It is open (`(string & {})`), so adding a family is
additive; renaming or removing one breaks consumers who switch on it. New descriptor fields are
published names.

**Options.** App-side names and synonyms; the element publishes them.

**Recommendation: the element publishes them.** The families on screen are the element's
categories; the card sort (`information-architecture.md` 12) may propose new ones, added
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

**Depends on it.** Door 19; `information-architecture.md` 6.

### 37. What explaining a painted value returns

**Decision.** Which fields `ChannelExplanation` and `StyleContribution` publish.

**Why it is a door.** They are exported types (`graphty-element/src/session/styles/explain.ts`).

**Options.** The layer id only; add `path: Path | null`; also `source`; a bulk read per column.

**Recommendation: add `path`, and a bulk read.** The path is already computed and is what lets a
value row and a table column show data and style together (`information-architecture.md` 8). A
`source` field is a convenience, since the layer id already reaches `Layer.source`.

**Depends on it.** `information-architecture.md` 5 and 8; `options-and-encodings.md`.

---

## Decided, and not doors

These look like doors but a version number, the tolerant reader or an additive change absorbs them.

| Decision                                                   | Choice                                                                                                                                    | Why undoing it is cheap                                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Retention                                                  | records forever; values while something holds them; restore only under the recorded version and engine (`element-contract.md` 8)          | keeping more values later is additive; the records, which cannot be regenerated, are already kept forever |
| Stored result precision                                    | float32 for metric attributes and stored positions                                                                                        | a wider type is a new file version the tolerant reader accepts                                            |
| Freshness                                                  | current, out of date, cannot re-run, detached, unresolvable, plus fields for a different scope, data version, values kept and earlier run | derived on read and never stored                                                                          |
| Default scope of a run                                     | readings and transforms: the filtered graph, frozen at start; searches: the output of the steps before the first working set              | every run records its scope, so a new default changes only future runs (a layout's is door 17)            |
| What Union, Subtract, Intersect and Exclude make on screen | a rule set naming its operands; Create set freezes it                                                                                     | the published `combine` keeps its fixed result and the live form is an optional member                    |
| Weight reductions                                          | a declared reduction per weight attribute (sum, max, min)                                                                                 | a new reduction is additive and the one used is recorded                                                  |
| Note targets                                               | primary objects, groups and other items, and the graph; citations of runs and filter steps                                                | widening the targets is additive                                                                          |
| The camera in a saved view                                 | a Node-safe type from `./session` or `./schema`                                                                                           | a new camera field is additive                                                                            |
| Comparison                                                 | a transient element object; only a saved comparison is in the file, as a run of a comparison result on the project                        | nothing transient is saved                                                                                |
| Where the autosave keeps the project                       | the browser's storage for the site, made persistent                                                                                       | the file's shape does not depend on where it is kept                                                      |
| "suppressed by <layer>" on a run (door 26, option 3)       | an additive field                                                                                                                         | additive                                                                                                  |
| Positions readable in rules and the table                  | later, as a new path root (`position`)                                                                                                    | door 13 refuses unknown roots now, so the root is additive                                                |

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
- `design/ui/framework/information-architecture.md` (section 14)
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
