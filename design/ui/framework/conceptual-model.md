# Conceptual model

**Job.** Say what exists in graphty, what each thing holds, how the things relate, which
operations change them and which state is kept, in words that stay true with no screen at all.

**Not here.** Screens, keys, strings and step sequences (`information-architecture.md`,
`interaction-patterns.md`, `content-design.md`, `task-flows.md`); definitions (`glossary.md`, the
only place a term is defined); published shapes, exact filter and window semantics, and element
gaps (`element-contract.md` 5, 9, 13); algorithm conventions (`graph-conventions.md`); open
expensive decisions (`one-way-doors.md`). On element behaviour `sets-design.md` and
`undo-design.md` win: a disagreement is a defect here. **Owner:** information architect, with the
graphty-element API steward. **Ceiling:** 5,000 words, excluding sources, table rules and
diagram leaders. **To be validated by:** a read-back with analysts (Appendix B, not yet run).

Every concept belongs to **graphty-element**, never to the **graphty app** around it (`CLAUDE.md`,
"Architectural Principles"). Every statement is the target model. **A door citation ("door N" in
`one-way-doors.md`) marks a recommendation not yet decided**; where the target differs from
graphty-element 2.x, both are stated.

## 1. What belongs in the model

### 1.1 The placement test

Two tests from `document-architecture.md` 7.2 place all state: the **consumer test** (would a
third-party consumer of graphty-element need it to rebuild graphty's behaviour?) and the
**two-readers test** (does it differ between two analysts opening the same file?).

| Outcome               | Tests                                                               | Owner, undo, file                | Examples                                                |
| --------------------- | ------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------- |
| **Model**             | consumer yes, two-readers no                                        | element; undoable; saved         | graph, sets, results, style layers, notes, labels shown |
| **Element transient** | consumer yes, only because operations read it or a view captures it | element; not undoable; not saved | selection, camera, hover, a run in flight               |
| **App state**         | two-readers yes, or chrome only                                     | app; never in the project        | theme, an open panel, list focus, the minimap           |

The **operations** (section 7) are model: they are the element's commands. The **controller** is
only how a command is invoked (`interaction-patterns.md`).

### 1.2 Type and containment

Kinds, with counterparts:

```
Graph ............ NetworkX Graph family; Cytoscape network
  derived graph .. NetworkX projected_graph, quotient_graph; Cytoscape "new network from selection"
Set .............. NetworkX node set; Neo4j label
  fixed | rule ... a member list | NetworkX subgraph_view(filter_node=...), a Gephi attribute filter
  path ........... NetworkX path (a node list)
Item ............. one block of a NetworkX partition; a Gephi modularity class
Filter step ...... one filter of a Gephi filter chain
  data step | working set (the Gephi ego-network filter)
Result ........... Gephi statistic; a column a Cytoscape app writes
  reading: metric, partition, graph statistic, series
  query: path family, flow, pair list, comparison
Recipe ........... a Cytoscape session with its styles, minus the data
```

Only three containments pass the test of `research/design-method.md` 3.7 (deleting the container
deletes its contents): **graph entry > data versions**, **result > runs**, **partition run >
groups**. Everything else is a reference that survives its target. Notes, views and comparisons
may span graph entries, so they sit on the project; storage is door 2.

### 1.3 Object map

Three groups, one table each, as in object-oriented UX. The **primary** test is `glossary.md` 4's:
a node, an edge, or a named object whose body is an existing subgraph. Purposes are the glossary's.
**Rename** and **Delete** apply to sets, paths, results, style layers, notes, saved views and graph
entries. Nodes and edges leave by **Remove**, a data operation. Data versions, runs and records are
never deleted singly: deleting a result removes its values, keeps its records, and citations to it
read detached. An item's name is its authored name attribute (4.3).

**Primary**

| Object    | Holds                                                                        | Related to                                             |
| --------- | ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Graph** | nodes, edges, declared properties, default attribute per role                | n data versions; a derived graph adds a derivation map |
| **Node**  | id, attributes, live position, pin                                           | n edges, n sets                                        |
| **Edge**  | id or ends plus key, direction, attributes                                   | 2 ends, n sets                                         |
| **Set**   | name, definition (fixed, rule, path), edge reading, created from             | n elements; n operand sets                             |
| **Path**  | nodes in order, each step's edge, derived kind                               | is a set                                               |
| **Item**  | a group or found path (a pair is an item, not primary): key, item attributes | 1 run                                                  |

**Supporting**

| Object              | Holds                                                    | Related to                    |
| ------------------- | -------------------------------------------------------- | ----------------------------- |
| **Attribute**       | name, element kind, origin, level, role                  | 0..1 producing run            |
| **Data version**    | record, source, query, import report                     | the one before it             |
| **Result**          | kind, accumulation                                       | n runs, 1 catalogue entry     |
| **Run**             | record, status, freshness, values                        | n items, 1 frozen scope       |
| **Filter step**     | set, outcome, kind, input, enabled                       | ordered, one list per graph   |
| **Style layer**     | selector, encodings, enabled, source                     | 1 selector (a set definition) |
| **Layout settings** | layout, parameters, seed, dimension, encoded axes, scope | 1 per graph                   |
| **Saved view**      | title, caption, capture (5.3)                            | n graphs                      |
| **Note**            | prose, author, times, targets, citations, quotes         | n targets, n cited runs       |

**Infrastructure**

| Object              | Holds                                                                | Related to                   |
| ------------------- | -------------------------------------------------------------------- | ---------------------------- |
| **Project**         | graph entries, comparisons, operation log, metadata, overview recipe | n graphs                     |
| **Recipe**          | definitions and slots (8)                                            | n projects                   |
| **Catalogue entry** | kind, key, version, descriptor, option descriptors                   | n results or layout settings |

A run's **status** is queued, running, succeeded, failed or canceled; an undone run leaves the
canvas and its record stays in the log, marked undone (`element-contract.md` 5).

### 1.4 Rules beneath the map

- **Every change is an operation**, undoable. A new need gets a new operation, not a new object.
- **Looking leaves nothing behind**: Find, Select and Compare with... write only transient state.
- **Every number names the graph it was computed on** (4.5), and is missing, never 0, outside it.
  **Find never reports absent for what a filter hides.**
- **No algorithm reads a style layer.**

### 1.5 Not in the model

- **Time-respecting paths**: a window is an aggregated static graph, so a path in it may run
  backwards in time.
- **Pattern search**: no catalogue algorithm exists. "Matching" keeps its textbook sense.
- **Hyperedges**: a node of a second type (two-mode, 4.6); Bipartite projection gives the pairwise
  graph.
- **Multilayer measures and interlayer edges**: edge types give per-layer runs only (3.3).
- **Numeric vectors** (embeddings, expression profiles): kept and exported, never analysed or
  encoded. A series (4.7) is not a vector.
- **Schema authoring**: type roles and the quotient graph by type show a schema.
- **Map basemaps**: not planned. Encoded longitude and latitude axes give geographic placement
  (5.2); a future underlay would be presentation a saved view captures.
- **Branching history**: undo is linear.

## 2. What state exists, who owns it, what undo and the file keep

**One live copy.** Each graph has one live copy of each piece of state: positions, filter list,
layout settings, style stack. Anything plural is a named capture (a snapshot, view, run or
comparison), which can be displayed without touching live state and changes it only through an
explicit, undoable Apply.

A part keyed by element id needs its data (8). Every "yes" under Saved is file format (doors 1, 2).
**+** marks rows needing element work (`element-contract.md` 13); sets exist only on the unmerged
sets branch.

| State                                                      | Keyed by                      | Undoable                    | Saved                       |
| ---------------------------------------------------------- | ----------------------------- | --------------------------- | --------------------------- |
| Graph, attributes, declared properties, import report +    | element id                    | yes                         | yes                         |
| Graph entries, data versions +                             | graph id                      | yes                         | yes                         |
| Runs, results, item attributes +                           | run id; result id             | yes                         | yes, values by retention    |
| Sets and paths +                                           | set id; members by element id | yes                         | yes                         |
| Filter steps, time window, show-context +                  | step id                       | yes, per step               | yes                         |
| Collapsed sets, display toggles (labels, arrows, legend) + | set id; toggle                | yes                         | yes                         |
| Style stack                                                | attribute, set                | yes                         | yes (door 5)                |
| Layout settings with scope, view mode, encoded axes +      | catalogue entry               | yes                         | yes                         |
| Live positions, pins                                       | element id                    | yes                         | yes                         |
| Saved views, notes, comparisons, overview recipe choice +  | object id; target ids         | yes                         | yes                         |
| Operation log                                              | record id (a run id for runs) | undo appends, never removes | yes                         |
| Undo history                                               | --                            | --                          | no                          |
| **Selection**                                              | element id or object id       | no                          | no                          |
| Hover, camera, VR and AR                                   | --                            | no                          | camera only in a saved view |
| A comparison on screen; a run in flight                    | --                            | no                          | only by Save comparison     |
| Panel, dock width, theme, list focus, minimap              | app                           | no                          | never                       |

**The selection** holds elements, or one primary object as a whole, one kind at a time.
Supporting objects are named as operands instead, because publishing list focus would put the
app's lists into the contract. Runs scoped to `"selection"` read it
(`sets-design.md` 2.2); Create set freezes it; after undo or redo the element selects what changed.

**Known risk.** Selection stays out of undo, which it would flood. So undo right after Select
neighbors reverses the previous model edit, often the Filter to selection that made the working
set. The mitigation is **Previous selection**, an element command (`interaction-patterns.md`).

## 3. Data tier

### 3.1 Project, graph and declared properties

A **project** is the file: graph entries with persisted ids. A **graph** is one entry at its
current data version. Its **declared properties** are direction, the parallel-edge and self-loop
policies, two-mode (4.6) and the default attribute per role. Every run records them and may
override direction and the weight attribute.

### 3.2 Data version

A **data version** is one frozen state of a graph, made by a data operation (7.1). Its record
holds the source and its **query** (an id list, a cutoff), which bounds a partly loaded graph, the
field mapping, the declared properties and an **import report**. Expanding is Add data with a
neighbourhood query. A refreshing source: door 28. Add data writes a **source** attribute, a cover
when several sources supply one element; two sources' parallel edges stay distinct (doors 29, 3).

**Cleaning is not filtering**: Remove and Correct change the full graph. An edit makes a run out
of date only if it changed what the run read. **Merge nodes** takes a pair list result, filtered
by score or by an authored verdict on each pair; its record names that run, each attribute's
reduction and the conflicting values, which the report counts.

### 3.3 Node and edge

**Edges are full peers of nodes**: identity, attributes of every origin, results, set membership,
style layers and notes. An edge's identity is its id, else its ends plus a key, so **parallel
edges** are distinct; on an undirected graph the ends are unordered (door 3); a **self-loop** has
equal ends. The
**edge type** is the attribute in the edge-type role; categorical, it reads as a partition, so
edges are filtered, styled, counted and traversed by type. A multiplex layer is an edge type.

### 3.4 Attribute

Every per-element value is an **attribute**, with:

- an **origin**: imported, joined, result, computed, authored;
- a **measurement level**: **categorical**, **ordinal**, **quantitative** or **time**, which decides
  its encodings (5.1); declared, inferred only as a fallback (door 20);
- a **role**, declared or absent: **weight** (distance, similarity or capacity), node type, edge
  type, time or position. A similarity may be declared **signed**;
  a negative distance or capacity is an error (door 21). Time sits on nodes, edges or both, as
  instants or intervals.

**Missing is not zero**: outside its scope a value is missing, left out of every population, rank
and scale, and counted. An **expression attribute** follows its inputs. A list of categorical
values reads as a **cover**, groups that may overlap. **Live metrics** (degree family, components,
core number) are read on the filtered graph and labelled so; binding one to a style freezes it, so
a later filter never moves a legend.

## 4. Analysis tier

### 4.1 Set

A **set** is a named collection of nodes and edges; an element is in it or not.

- **Fixed**: a member list by id; never out of date, only missing members.
- **Rule**: a predicate, so members follow the data. Leaves (`element-contract.md` 9): attribute,
  threshold, presence, text, time window, topology (within k hops: over named edge types, out, in
  or all), membership (the set operations) and result item.
- **Path** (4.2).

Every set states its **edge reading**: **induced** (every edge between its nodes), **listed**
(exactly its edges) or, for a rule, **clipped** (the edges it keeps whose ends it also keeps). **A
rule with no scope reads the full graph wherever it is stored**; a filter step's own input decides
what the step reads (`sets-design.md` 4.3).

A kept set records what it was **created from**. A result **offers** its items as sets; Create set
freezes an offer or any set. An identifier list is a rule set ("symbol is in {...}"); a **named
set collection** (a GMT file, an indicator list, a watchlist) loads as rule sets with no data
version, counts unmatched identifiers and travels in a recipe (door 27).

**A subnetwork is a set**, never a copy. Beside its parent it is a comparison state whose position
source is a snapshot of its nodes only. **Extract as graph** (4.7) is the only copy, and leaves the
parent's definitions behind.

### 4.2 Path

A **path** is a **sequence**: nodes in order, each step naming its edge. As a set it is its
distinct nodes and its steps' edges, accepted wherever a set is (`sets-design.md` 4.4). Its kind is
derived, first match: **Cycle** (closed, no repeated node but its ends, no repeated edge: a
self-loop or two parallel edges count, A-B-A over one edge does not), **Simple path** (no repeated
node; element value `simple`), **Trail** (no repeated edge), **Walk** (door 11). On a directed
graph it records whether every step follows its edge.

**No other set carries an order**: a ranking is an attribute sorted on read, because a stored order
drifts from its values; only a walk's order cannot be recovered.

### 4.3 Result, run and items

A **result** is the kept container for one analysis of one **kind** (1.2); a **run** is one
execution and owns the record (`element-contract.md` 3). A **reading** keeps one current run. A
new parameter adds a run; so does **Re-run** after the default scope changed, so what follows the
result repaints and the earlier run stays as the baseline. Only an explicit what-if (Without this,
Each of...) makes a **sibling result**, which nothing follows. A **sweep** adds a run per parameter
value. A **query** keeps every run, each with its scope; one that finds nothing is a finding.
Exact and sampled methods are two results.

**A run over a list of scopes is one result** (Within each group): per-element values are tagged
with their scope, per-scope values are item attributes.

Values live on elements as result attributes. **Items** are groups, found paths or candidate pairs.
A partition may be **hierarchical** (an item key is level plus group; `graph-conventions.md` 2) or
a **cover** (a list-valued result attribute). **Item attributes** belong to one run, computed by
Profile groups (size, density) or authored (a group's name); they move only by **Carry over to new
run**, which matches groups (7.3). **Any categorical attribute reads as a partition with no run**,
so an authored verdict and a set of the same elements are two views of one fact.

### 4.4 Filter steps and the filtered graph

**Filters** are an ordered list of steps, each a set with an outcome, **Filter to** or **Filter
out**, deciding the **filtered graph**, the default scope of every run except a search. Each step
reads the previous step's output, or the full graph where its input says so, and never brings back
what an earlier step removed (`element-contract.md` 9).

The command that made a step fixes its kind. **Filter to selection** and **Filter to neighbors**
make a **working set**, the boundary of an investigation, which Filter to neighbors and Include
found nodes grow, each addition labelled (door 25). **Select neighbors** only grows the selection.
Every other step is a **data step**, a judgement about the data ("confidence >= 0.7").
**Parallel investigations are saved views**: applying one replaces the filter steps, working set
included, as one undoable step; one needing its own positions and runs is a derived graph.

Not filters: **style by set** changes paint; **show-context** draws filtered-out elements without
analysing them; **Collapse** (a Cytoscape group) draws a set as one node, whose analysable form is
the quotient graph; **Remove** edits data; a **derived graph** creates elements.

### 4.5 Scope and population

**Scope** is the graph an operation reads, frozen into its record. **Population** is what a
threshold is measured against: the evaluated scope, or each group of a named partition ("top k per
group"). Every value names one of four graphs (element keyword in brackets):

- the **full graph** (`"graph"`);
- the **filtered graph** (`"visible"`; `"filtered"` is door 22);
- the **search graph** (`"search"`): what the data steps decide. A structural step (topology,
  membership of a structurally defined set) after a working set is lifted with it, so a k-core
  inside a neighbourhood keeps its meaning; a local step binds wherever it sits (door 11);
- a **named scope**: a set, `"largest-component"`, "the graph without S", a time window, the
  selection, or a list of scopes.

A **search** starts from endpoints or seeds, each a node or a set, and walks outward: Select
neighbors, paths between endpoints, the within-k-hops leaf. Set to set, it returns the nearest
pairs as one query run. Another algorithm is a search only if its catalogue descriptor says so
(door 30). A found path leaving the working set is marked. **A different scope is not out of
date.**

### 4.6 Statistics and detected properties

Every scope has **Statistics**, a read; graph statistics are results. **Detected properties** are
facts about a scope, never stored: self-loops, parallel edges, connected, acyclic, tree or forest,
two-colourable. A filter can make a cyclic graph acyclic, so algorithms declare **preconditions**
against the scope a run will use (door 23). **Two-mode** is declared as a pair of node-type values,
because a disconnected graph has no unique two-colouring (`graph-conventions.md` 1).

### 4.7 Comparison, derived graphs and time

**Compare with...** takes two operands: sets or groups; runs of one result; results of one kind; a
result and its randomized baseline; two attributes over one scope (rank correlation, or NMI);
a partition or set collection against a partition, set collection or categorical attribute
(overlap, as in enrichment, its test from a catalogue entry); or two **states**, each a scope plus
a position source (5.2). It never changes the filtered graph;
selection links across the two by matching (7.3). **Save comparison** adds a run to a comparison
result on the project (`graph-conventions.md` 3).

A **derived graph** holds nodes or edges in no data: a projection, quotient or line graph,
Combine, Extract as graph, a null-model sample. It is a **transform**: a new graph entry with a
derivation map and its own positions.

A declared time attribute enables **time windows**, which are scopes and filter steps, and a
**series**: one result whose runs are its windows, values keyed by element and window, the current
run painting. A change or slope across it is an expression attribute; the table exports it long
(element, window, value). Window membership is `element-contract.md` 9's.

## 5. Presentation tier

### 5.1 Style layers and encodings

Appearance is applied only through **style layers**: a **selector** (a set definition) plus
**encodings**. The top layer wins each channel it writes; the channels are a closed list
(`element-contract.md` 13). The level decides the encoding (legends: `options-and-encodings.md`):
a constant over a set ("Suspects are red"); a palette for categorical (community); an ordered
palette or ramp for ordinal (supplier tier); a sequential scale for quantitative, diverging when
signed, with bins making ordinal groups (log fold change); a scale over dates, or windows, for time.

**An encoding never paints an element with no value**: the layer beneath shows through, and a
no-value look is a constant layer over the presence rule, which the legend counts. An algorithm's
layers write only to elements carrying its result; a completed run paints except where a higher
enabled authored layer paints that channel, and says so (door 26). The stack, top to bottom: the
element's locked selection and highlight layers, **Overrides** (hand edits), authored and algorithm
layers, **Default look** (door 31). A collapsed set is drawn as its set, labelled with its name and
styled by layers selecting it; a partition's groups take a hull and a label (door 32).

### 5.2 Layout settings, positions and space

**Layout settings** are one per graph: layout, parameters, seed, **dimension** (2D or 3D, the view
mode), **encoded axes** and a **scope** (`sets-design.md` 11), which a new Run layout replaces and
a parameter change keeps. **Run layout** moves only the scope's nodes; pinned nodes stay. Each
layout run records its scope. A layout is not a result: no freshness.

**Live positions** are one xyz per node plus a pin, keyed by element id; 2D draws them flat, and
the depth it keeps is internal (door 2). Layouts write them, Replace data and exporters keep them,
a recipe cannot. A saved view holds a **position snapshot**, which may cover only a scope's nodes;
applying it writes back only those. A position source is either, or another state through
matching. An **encoded axis** binds x, y or z to an attribute: longitude and latitude through a
named projection, a tier on y. **The coordinate system is a property of the layout settings.** VR
and AR are device modes.

### 5.3 Saved view

A **saved view** has a title and caption and captures filter steps, layers on, collapsed sets, the
camera, the view mode, a position snapshot, the display toggles (labels, arrows, legend) and the
notes it shows: the one list, which `glossary.md` cites.

## 6. Commentary: notes

A **note** is prose, with author and times, about primary objects, items and the graph, never
about presentation or another note. It **cites** runs and filter steps, may **quote** values, and
stores target ids, never coordinates. A **findings report** exports notes with their quotes and citations.

## 7. Operations, records and references

### 7.1 Operations

**Reads** is the default graph; direction follows `graph-conventions.md` 2; time enters only as
a window scope.
**An operation writes a record when it changes data or declared semantics, or computes values.**

| Operation                                                                                                                                                                    | Reads                                                                              | Writes                                                | Undoable               | Record        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------- | ------------- |
| Load, Add data, Replace data, Join, Re-map, Merge nodes, Remove, Correct                                                                                                     | source; full graph                                                                 | a data version                                        | yes                    | yes           |
| Load set collection                                                                                                                                                          | a list file                                                                        | rule sets                                             | yes                    | no            |
| Add attribute +                                                                                                                                                              | named elements or an item                                                          | an authored attribute; runs reading it go out of date | yes                    | yes           |
| Declare a level, role or property                                                                                                                                            | --                                                                                 | the attribute or graph                                | yes                    | yes           |
| Find                                                                                                                                                                         | full graph; a hit outside the search graph names the step excluding it, unselected | the selection                                         | no                     | no            |
| Select, Select neighbors, Previous selection                                                                                                                                 | search graph                                                                       | the selection                                         | no                     | no            |
| Compare with...; Statistics                                                                                                                                                  | operands; a scope                                                                  | nothing kept                                          | no                     | no            |
| Run a reading, an expression, Profile groups                                                                                                                                 | filtered graph; inputs; items                                                      | result attributes, items, item attributes             | yes                    | yes           |
| Run a search                                                                                                                                                                 | search graph                                                                       | a query run                                           | yes                    | yes           |
| Run layout                                                                                                                                                                   | its scope; unscoped: target filtered graph, 2.x whole graph (door 17)              | that scope's positions                                | yes                    | yes           |
| Transform, Extract as graph                                                                                                                                                  | filtered graph                                                                     | a derived graph                                       | yes                    | yes           |
| Create set or path, set operations, filter steps (Filter to neighbors, Include found nodes), Collapse, Expand, toggles, Pin, style, layout-setting and note edits, Save view | operands, selection                                                                | the object                                            | yes                    | no            |
| Apply view                                                                                                                                                                   | the view                                                                           | its capture; the camera                               | yes, except the camera | no            |
| Save comparison                                                                                                                                                              | a comparison                                                                       | a comparison run                                      | yes                    | yes           |
| Re-run, Use current, Carry over to new run                                                                                                                                   | a run                                                                              | a run; item attributes                                | yes                    | yes           |
| Apply recipe                                                                                                                                                                 | recipe, bindings                                                                   | definitions, then runs                                | yes                    | yes           |
| Export                                                                                                                                                                       | a scope (8)                                                                        | an output only                                        | --                     | cites records |

A **record** says from what, over what scope, by what (catalogue entry, version, engine, resolved
parameters, seed, direction, weight and role, edge reading), by whom, when. Records form the
append-only **operation log**, keyed by record id; undo and redo append an entry only for an
operation that has a record. The log is saved, the undo history is not (`element-contract.md` 5;
door 9).

### 7.2 Follow, hold and freshness

A reference to a **definition follows** it (a result, a rule set); a reference to an **instance
holds** it (a run, a position snapshot, a data version). An item reference follows the current run
unless it names one. **Freshness** is derived on read (`element-contract.md` 7). A run is
**current** or **out of date**, judged by per-attribute revisions (`element-contract.md` 13).
Sets, rules, style layers, filter steps and references take five values: current, out of date,
cannot re-run, detached (target deleted; door 18), unresolvable (missing capability, among other
reasons).

### 7.3 Forwarding and matching

Edits that replace elements record a
**forwarding map**. **Replace data** replays the definitions, and ids carry fixed sets, authored
values, notes and positions across. **Matching** across versions, windows and graphs is one
mechanism: elements by id, groups by overlap, splits and joins reported.

## 8. Files, recipes and outputs

One file format has optional parts; a kind of file is a choice of parts (doors 1, 19):

| Profile     | Parts                                                                                                                                                                                                                                     | Without the data?                |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **Project** | everything                                                                                                                                                                                                                                | carries it                       |
| **Recipe**  | rule sets, data steps, run specifications, style layers, layout settings, views without positions or camera, notes on definitions, overview steps, declared properties as requirements; optionally a data-source query, mapping and joins | yes, through slots               |
| **Style**   | style layers and palettes                                                                                                                                                                                                                 | yes, by attribute name and level |
| **Data**    | graph, attributes, data versions                                                                                                                                                                                                          | is the data                      |

A recipe drops what only its data can mean: working-set steps, fixed sets, notes on elements,
positions, pins, Overrides, the camera. It names results only by author-assigned ids (`as:`),
because a derived id changes on other data. Applying copies definitions in with provenance, binds
**slots** (attribute, catalogue entry, set, argument, requirement, source, join), always confirms a
weight slot, and keeps anything unbound switched off and listed (door 19). A newer version is
offered, never applied by itself.

**The overview recipe** characterizes the whole graph at Load, at three levels (door 33):
graphty-element ships **General**; a consumer configures the element's default, which the graphty
app sets from a reader preference; a project may name its own, which travels with the file and
wins. **Flows** and **Groups** are documented examples. Every level keeps the **floor**, rows
exposing a broken import (counts, direction, weight role, negative weights read against the role,
dropped rows, components, isolates, self-loops, parallel edges).

**Outputs** change nothing and carry a **methods text** written from their records. Each takes a
scope (full graph, filtered graph, a set or a path), and a set exports by its edge reading:

- a **figure**: a view with a legend derived from the enabled style layers, never authored;
- a **table**: chosen element attributes, items and item attributes, each column with its scope;
- an **interchange graph** through graph-io;
- a **findings report** (6).

## 9. Catalogue entries: the extension points

An extension adds a **kind** to an existing concept, never a new concept. Each is a **catalogue
entry**: kind, key, version, descriptor and option descriptors, the only source of its controls.
graphty-element publishes six (`graphty-element/extend.ts`):

| Extension       | Adds a kind of                                     |
| --------------- | -------------------------------------------------- |
| algorithm       | result and run                                     |
| layout          | layout settings                                    |
| file format     | load source (readers only; exporters are graph-io) |
| palette         | a style layer's values                             |
| camera view     | camera framing (transient)                         |
| log destination | nothing in the model                               |

**Internal**: scale, node mesh shape, natural-language command, accelerator. **Reserved for a
plugin registry**, built-in only today: rule leaves, set kinds and scope keywords, spelled
`package:kind` (`sets-design.md` 12.5, 15.3). **Element only**: result kinds, style channels. A
file naming a kind this installation lacks keeps it opaque and reads unresolvable (missing
capability), naming the package to install.

## 10. The owner's questions

- **Load style or recipe, not only data?** Yes: four profiles of one file; slots bind a recipe (8).
- **A replaceable default overview?** Yes, at three levels (8).
- **An ordered index turning sets into paths?** A path is that extension, as a sequence, because
  walks repeat nodes; no other set is ordered (4.2).
- **Self-loops, multi-edges, direction, tree, DAG?** Properties, declared or detected per scope,
  gating algorithms (3.1, 4.6).
- **Location and coordinates?** Presentation, with the coordinate system in the layout settings
  (5.2).
- **Two kinds of filter; a derived graph?** The real split is a data step, which searches respect,
  and a working set, which they may cross; styling, Remove and derived graphs are not filters (4.4).
- **Which imports and exports?** Four file profiles, named set collections, four outputs (4.1, 8).
- **All extension points?** Six published, three reserved for plugins (9).
- **Continuous versus group values?** A set picks elements; the level picks the encoding (5.1).
- **MVC?** The model includes the operations; the controller is how they are invoked (1.1).
- **Edge types and attributes?** Yes, edges are full peers of nodes (3.3).

## Appendix A. The top tasks written in the model

Each step is an operation of 7.1.

- **Load**: Load -> data version, import report -> overview recipe and floor.
- **Start from a recipe**: Apply recipe -> bind slots, weight confirmed -> unbound steps off -> runs.

1. Characterize: overview -> Statistics of the filtered graph.
2. Rank: run a reading -> result attribute -> style layer. Then Filter out a component: the run
   shows a different scope, not out of date (4.5); Re-run adds a run, the layer repaints, the
   earlier run is the baseline.
3. Communities: partition run -> items -> Profile groups -> offer -> Create set.
4. Explore: Find -> selection -> Filter to selection (working set) -> Select neighbors (selection
   grows, not undoable) -> Include found nodes (working set grows, undoable).
5. Note: Add note on a primary object, citing runs.
6. Layout: Run layout -> live positions; Pin. After a filter, door 17.
7. Compare: two states -> Save comparison -> a comparison run.
8. Shortest path: search run -> found path -> Create path.

- **Export**: a figure from a saved view, a ranked table, the project file.

## Appendix B. Read-back with analysts

Not yet run. Five analysts (two weekly, two daily investigators, one occasional) hear sections 1,
4, 7 and 8 and predict four outcomes. It passes when four of five predict each; a miss changes the
model or its names. Expected answers:

1. **"Filter to a component, then lay it out."** Only the component moves (target; in 2.x only
   when the layout is given that scope, door 17).
2. **"Apply a colleague's recipe to my data."** Their definitions bind to my attributes, the
   weight is confirmed, anything unbound is off and listed; no data, positions or fixed sets.
3. **"Select neighbors, then undo."** Undo reverses the last project change, not the selection;
   Previous selection restores it (section 2).
4. **"Filter to this node's neighbours, then find a path to a node outside them: does it leave the
   boundary?"** Yes: a working set does not bound a search, and the path is marked where it leaves.

## Sources

- `document-architecture.md` 3.1, 4, 7.2; `research/design-method.md` 3.1 to 3.4, 3.7 (Johnson
  and Henderson's structure; type and containment hierarchies; primary and secondary objects; the
  containment test); `glossary.md` 4
- `.worktrees/element-undo/design/undo/undo-design.md` 3.1, 3.2 and its rule that the session
  selects what changed after undo; `.worktrees/element-sets/design/sets/sets-design.md` 2.2, 4.3
  (the rule scope), 4.4, 5.2, 5.3, 8, 11 (`layoutScope`), 12.5, 15.3, 19
- graphty-element: `extend.ts`, `src/catalog/pluginRegistry.ts:61`, `src/catalog/scales.ts`,
  `src/catalog/cameraRegistry.ts`, `src/session/styles/Layer.ts:18`,
  `src/session/visibility/filter.ts` (the neighbourhood leaf counts hops both ways),
  `src/data/positions.ts:3-4`, `src/data/GraphStore.ts:97-98`; the element-sets worktree's
  `src/catalog/types.ts:1068` (`PathKind`); graph-io `src/formats/{dot,gexf,gml,pajek}/exporter.ts`
- `element-contract.md` 1, 3, 5, 7, 9, 13; `graph-conventions.md`; `one-way-doors.md`;
  `top-tasks.md`
- NetworkX `ego_graph`, `projected_graph`, `quotient_graph`, `subgraph_view`, `simple_cycles`;
  Cytoscape groups and "new network from selection"; Gephi filter chains, partition and ego-network
  filters
- `design/designloom/workflows/` W05, W06, W07, W17, W20, W21, W22, W23, W24, W25
