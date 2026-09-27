# conceptual-model, long form (superseded 2026-09-27)

This is the long form of `conceptual-model.md` as it stood before it was split by the document architecture. It is kept read-only as the record of the reasoning, and its section numbers are the ones older citations use. Where it disagrees with the current `conceptual-model.md` or with the documents that received its sections, those documents win. Where each section below now lives:

| Section here                              | Now                                                                                                                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 spine; its Figma column                 | `conceptual-model.md` 1; `figma-crosswalk.md`                                                                                                                                                      |
| 2.1, 2.2, 2.3                             | `conceptual-model.md` 2.1, 2.2, 2.3                                                                                                                                                                |
| 2.4 set; 2.5 path                         | `conceptual-model.md` 3.1; 3.2                                                                                                                                                                     |
| 3.1 attribute                             | `conceptual-model.md` 2.4                                                                                                                                                                          |
| 3.2 result and run; 3.3 items             | `conceptual-model.md` 3.3                                                                                                                                                                          |
| 4 operations and records                  | `conceptual-model.md` 6.1; the record's fields in `element-contract.md` 5                                                                                                                          |
| 5.1 selection and object selection        | `interaction-patterns.md`                                                                                                                                                                          |
| 5.2 filters                               | `conceptual-model.md` 3.4; screen strings to `content-design.md`; the drawing budget to `state-matrix.md`                                                                                          |
| 5.3 scope; 5.4 Statistics                 | `conceptual-model.md` 3.5; 3.6                                                                                                                                                                     |
| 5.5 layout and positions                  | `conceptual-model.md` 2.5 and 4.2; first and incremental placement to `interaction-patterns.md`                                                                                                    |
| 6.1 style layers and automatic paint      | `conceptual-model.md` 4.1. The covered and partly covered states are withdrawn: graphty-element suppresses a suggested layer instead of covering it. Row placement to `interface-specification.md` |
| 6.2 notes                                 | `conceptual-model.md` 5; note markers and Shift+C to `interaction-patterns.md`                                                                                                                     |
| 6.3 views and export                      | `conceptual-model.md` 4.3; export settings' placement to `interface-specification.md`                                                                                                              |
| 7.1 follow, hold and freshness            | `conceptual-model.md` 6.2; the state line's wording and order to `content-design.md`                                                                                                               |
| 7.2, 7.3, 7.4                             | `conceptual-model.md` 6.3                                                                                                                                                                          |
| 7.5 comparison                            | `conceptual-model.md` 3.7; the comparison statistics and null model to `graph-conventions.md`                                                                                                      |
| 7.6 derived graphs                        | `conceptual-model.md` 3.8                                                                                                                                                                          |
| 8 what each verb does                     | `interaction-patterns.md`, the command catalogue                                                                                                                                                   |
| 9 graph conventions                       | `graph-conventions.md`, unchanged                                                                                                                                                                  |
| 10 tail concepts                          | time to `conceptual-model.md` 3.9; covers to 2.4; group marks to 4.1; the library became the recipe, 7; collapse to `visual-language.md`                                                           |
| 11 out of scope                           | `conceptual-model.md` 1.3                                                                                                                                                                          |
| 12 departures from Figma                  | `principles.md`, the departures table, until `figma-crosswalk.md` takes it                                                                                                                         |
| 13 one-way doors and reversible decisions | `one-way-doors.md`                                                                                                                                                                                 |
| 14 superseded passages                    | this archive                                                                                                                                                                                       |

Text a destination has not yet rewritten is read here, under its old number.

---

# Conceptual model

This document defines what exists in graphty, what each thing is for and how the things relate. It
is the ontology. `glossary.md` names these concepts and gives each word's rejected synonyms and
the name graphty-element publishes; this document uses its terms. The principles rank the rules
that settle arguments between them, and the information architecture (IA) decides where each one
lives on screen. Words the glossary marks Design or Docs tier (object selection, data step, search graph, item,
source nodes) are used here to reason and never appear on screen. How
graphty-element publishes these concepts (identities, addresses, the record's fields,
retention, the expression language, the file) is in `element-contract.md`; section 13 below lists
the published shapes the owner must decide.

Every concept here belongs to **graphty-element**, the standalone web component. The **graphty
app** is presentation around it and owns none of these concepts (`CLAUDE.md`, "Architectural
Principles"). Every concept is defined against graphty-element's session, which also runs headless,
not against the renderer: the renderer's size ceiling and the selection cap of 5,000 elements are
limits of one client, never of a concept (`research/graphty-today.md` 7.18).

Workflows are cited by their titles in `design/designloom/workflows/`, personas by their file
names in `design/designloom/personas/`.

## 1. The spine

| Family                                 | Concept                                                                          | What it is                                                                                                                                                | Figma counterpart                                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| The document                           | **Project**                                                                      | the file: a list of graphs, their session state, one undo history, one operation log                                                                      | the file                                                                                                 |
| Primary graph objects                  | **Graph**                                                                        | the nodes and edges of one entry in the project, at one data version                                                                                      | the page: with nothing selected, the inspector is the graph's                                            |
|                                        | **Node**, **Edge**                                                               | one element of the graph                                                                                                                                  | a layer                                                                                                  |
|                                        | **Set**                                                                          | a named collection of nodes and edges, defined by a member list or a rule                                                                                 | closest is a component: a named, lasting definition made by a Create command; it has members, not bounds |
|                                        | **Path**                                                                         | a start node and an ordered sequence of edges                                                                                                             | none; graphty's own                                                                                      |
|                                        | **Item** (nested)                                                                | one member of a result or of a categorical attribute, named by its kind: a group (a community, a component, a k-shell, a category), a found path, a match | a child of a container, reached through it                                                               |
| Definitions applied from property rows | **Attribute**                                                                    | one value per node or per edge, with a stated origin                                                                                                      | a property                                                                                               |
|                                        | **Result**                                                                       | a kept analysis of one kind, holding its runs and their items                                                                                             | a variable                                                                                               |
|                                        | **Style layer**                                                                  | a rule that paints nodes, edges or groups from data                                                                                                       | a style applied to a fill                                                                                |
|                                        | **Layout settings**                                                              | an algorithm and parameters stored on the graph, a set or a partition, applied by running                                                                 | Tidy up, a one-shot arrange command                                                                      |
| Commentary                             | **Note**                                                                         | the analyst's prose about primary objects                                                                                                                 | a Dev Mode annotation                                                                                    |
| Captured state and output              | **View**                                                                         | a named, titled capture of the working state, applied by replacing it; its title, caption and list of shown notes are properties, not objects             | closest is a prototype flow                                                                              |
| Working state                          | **Selection**, **filters**, positions, camera, **view mode**, an open comparison | what the analyst is doing now; not an object                                                                                                              | the selection; the canvas state                                                                          |

Three rules sit beneath the table.

**Every change to persistent state is an operation, and every operation writes a record**
(section 4). A load, an algorithm run, a layout, a transform and a kept comparison differ only in
what they output: a data version, attributes and items, positions, a graph, or a saved comparison. New
needs are met by a new operation, not a new kind of object.

**Reading leaves nothing behind; keeping is a separate act.** Figma answers every "which objects"
question with a selection and every comparison with a transient surface, and stores nothing until
a separate command makes it lasting (`research/figma.md` 4.3, 4.4 and the practitioner's rule 3).
Pirolli and Card's sensemaking loop draws the same line between foraging and synthesis
(`research/graph-analysis.md` 1.8). So a find, "Select same value", Select neighbors and a comparison produce a
selection, a drawing or an inspector reading; a path search is a query recorded under its result
(section 3.2) and adds no object. Create set, Create path and the
set operations are what promote something into a kept object; Save comparison, Save view and Add
note keep secondary things. The operation log records every act; the tree of analysis
results and the list of sets hold what the analyst kept, what something kept reads, and one
listed entry per algorithm used.

**Every number states the graph it was computed on.** A value is computed over a scope frozen when
it was computed or bound, carries that scope as a visible label, and is missing, never 0, outside
it (section 3.1). Following something newer is always an explicit verb (section 7.1).

**The test for a primary object**: it is a node, an edge, or a named object whose body is an
**existing subgraph**, nodes of the current data plus a stated edge reading, so it can serve as a
scope without losing what it is about. The graph, a set and a path pass, and so do the result items
a group, a found path and a match. A metric such as PageRank fails: it has no body, only a value on
every node. A flow fails the same way: its body is a value per edge, and its support becomes a set
only through Create set. Items that are not existing subgraphs (a candidate pair, which is about an
edge that does not exist, a per-window value, a saved comparison) fail too; they are table data,
reached through the table. Figma's test, "can you draw a selection box around it?"
(`research/figma.md` 2.4), agrees with this one everywhere and is a useful check, but it is not the
definition; graphty-element applies the same definition to decide what the set API accepts. A drawn candidate edge is not an object either: clicking it selects its two nodes, as the pair's
table row does. Primary objects are what the
analyst selects, inspects, notes and exports; secondary objects are applied to them, written about
them or captured from them, and are never listed among them.

**The secondary families stay apart**, following Figma's own split (`research/figma.md` 2.4, rules
2, 4 and 6). Results, style layers and layout settings are definitions applied from property rows,
but only a result is compared, cited and cut into sets. Notes are commentary and never chain onto
definitions. Views capture state and carry output settings. Every departure from Figma is
listed once, with its reason, in the departures table of `principles.md`.

## 2. The project and the primary objects

### 2.1 Project and graph

A **project** is the file. It holds a list of graph entries, one in the common case, each with a
persisted **graph id**, its data versions and its session state; one undo history; one append-only
operation log; and a metadata block (title, description, authors, license) that GraphML and CX
exports carry. Opening a file or a sample always starts a new project, as importing does in Figma.
Replace data, Add data and "Add as another graph" are explicit commands on an open project; none
is ever what Open does. The Graphs section is always shown, collapsed to the graph's name when there is one. Once there are
two, every stored reference (a note target, a set member, an item address) is scoped by graph id.
Every session belongs to a project, so a consumer that uses one graph never meets the project
(`element-contract.md` 1).

The **graph** is one entry's nodes and edges with their imported attributes and declared data roles
(section 9). **The graph is graphty's page.** As in Figma, the page is not selected: with nothing
selected, the inspector is the graph's, and commands with no selection (export, Add note, a run)
target the graph. Opening a project selects nothing, so the overview comes first, and Esc clears
the selection in one press. The graph's inspector leads with its **Statistics** (section 5.4) over
the filtered graph; that density at rest is a departure from Figma's thin page panel. What else it
holds (export settings, the local definitions) is decided by the IA.

### 2.2 Data version

A **data version** is one frozen state of a graph. Each is made by an operation with a record
(section 4):

| Operation    | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Load         | the first version, from a file, a URL, pasted text, a sample, or a registered data source queried with parameters (an id list, a species, a confidence cutoff); the query is in the record, and the import report lists the query ids found and not found                                                                                                                                                                                                                                                                                                                    |
| Add data     | appends nodes and edges from another source; nodes match by node id or by a chosen key attribute, as a join does, with matched, new and ambiguous reported; writes a categorical source attribute on every element ("comms", "travel"). An edge from one source never matches an edge from another unless the analyst maps an edge id or type column across them, so two sources' edges between one pair are parallel edges told apart by source. Add data enriches one graph; comparing two graphs edge by edge is Combine (section 7.6), which matches edges by their ends |
| Replace data | the next export of the same graph, or a re-query of the same data source with the same parameters (section 7.3)                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Join         | adds attributes from a table matched by a key column; with a graph open, a pasted list of ids is a one-column join whose membership attribute's "true" group makes the set                                                                                                                                                                                                                                                                                                                                                                                                   |
| Re-map       | reloads the same source with an edited field mapping                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Merge nodes  | replaces a selection or set of nodes with one node, keeping a chosen survivor's id or minting a new one, with a forwarding map (section 7.2); "contract" is an alias                                                                                                                                                                                                                                                                                                                                                                                                         |
| Remove       | deletes the elements a set names, whether a rule ("name = unknown") or fixed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Correct      | overrides imported values, stored by id                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

**Cleaning is not filtering.** Remove and Correct change what the full graph is, so a catch-all
"unknown" node with 10,000 edges stops distorting every full-graph number, including the degree
distribution. A filter step only changes what is in the filtered graph. On Replace data a rule removal
re-evaluates, and corrections carry over by id and are reported when the new import changed or
dropped the value. Declaring a role (direction, a weight role and its conversion, node or edge
type) is an edit with a record, not a data version. Loading commits at once, and correcting any of
this afterwards is one undoable step, so no preview gate stands before a load.

A data version's record holds the source, the field mapping and declared roles, parse options,
load-time cutoffs, the matching rule, and an **import report**: rows dropped, edge endpoints not
found, parallel edges, self-loops, completeness and type conflicts per attribute; for Add data and
Join, what matched, what was new and what was ambiguous or unmatched; for a merge, how each
conflicting attribute was resolved. The report is read in its data version's entry in Version history, reached from the graph's
Statistics (a Last import row under "N more", and each import-count mark row) and from the load
toast's Details; its counts appear by exception in Statistics: the Attributes row and the import-count rows carry marks when the import departs. This serves "Data Import and Validation" and "First
Exploration - Quick Data Assessment" with no import wizard.

**Three operations fork runs: Replace data, a re-query and a derived graph's new version.** Each
puts earlier runs on "an earlier data version"; Replace data also replays the analysis (section
7.3), and section 7.6 covers the derived graph. Every other data operation advances the lineage without forking: a run
stays current unless it read something that changed (the topology, an attribute, a set, a role), and
then it is out of date (section 7.1).

### 2.3 Node and edge

A node's identity is the node id from the imported data; whether it also includes a declared node
type is open for the owner (section 13). An edge's identity is the edge id from
the file when it has one; otherwise its ends and a key, which after Add data includes the source.
Every stored key is either minted and persisted or canonical in content, never a position in a
list, with one reported exception for parallel edges that the file gives no ids
(`element-contract.md` 2). Without this, every stored reference to an edge re-attaches to a
different edge after a plain save and reopen, with no error. Wherever an order is needed ("the
smallest node id"), ids are ordered by type, then value.

### 2.4 Set

A **set** is a named collection of nodes and edges. It has one of two definitions, and the model
names both, because one word covering two behaviors without saying so is the overloading flaw
concept design warns about (`research/design-method.md` 1, item 2):

- **Fixed**: a member list stored by id. It never goes out of date; it can only have missing
  members, which it counts and shows.
- **Rule**: a predicate evaluated against the data, so its members follow the data.

A rule is a predicate over elements, never a search that must run as an algorithm. There are three
predicate kinds:

- **Attribute**: a comparison on any attribute ("betweenness > 0.1", "type = supplier", "GO terms
  contains GO:0006915"), including a relative threshold ("top 10%", "rank <= 50", "z > 3"). The
  comparison value may be a live reference to another element's value ("device = device of account
  A").
- **Neighborhood**: the elements within k hops of a source set, k unbounded meaning reachability,
  with a direction (in, out or all). "Everything upstream of this component" is the unbounded,
  inward case.
- **Membership**: the members of another set, path or item, and the set operations Union, Subtract,
  Intersect and Exclude over those.

**Union, Subtract, Intersect and Exclude make a rule set.** The combined set's Rule row reads
"Intersect of A, B", so nothing it does depends on something the analyst cannot see, and Replace
data replays it over the operands' new members, which is what "a project is its own template"
(section 7.3) needs: "top 10% by betweenness" Intersect "type = supplier", frozen, would keep last
week's members while both operands moved. Create set on the combined set freezes it into a fixed
set, as Figma's Flatten turns a live boolean group into one shape. graphty-element publishes the
materializing form (`sets.combine`, which always writes a fixed set) and a live form of the same
operation (`combine` with `live: true`), and both apply one edge rule: when every operand is
induced the result is induced; otherwise the operation runs on the edges first and the nodes are
the operation on the nodes plus the ends of the kept edges, so "edges in the Kruskal tree but not
the Prim tree" keeps the differing edges although the two trees share every node.

**A rule reads a stated graph.** A rule's **scope** is the graph it reads, stored in its definition and shown on its Rule row in the inspector. An absent scope always means the full graph, wherever
the definition is stored (a kept set, an inline scope, a filter step), so one definition never
changes meaning with where it sits. A filter step that reads the steps before it says so on the
step, not in its rule (section 5.2), and Save as rule set on an inline filter step copies the
steps before it into the saved rule's scope, so the saved rule
means what the step meant ("degree > 5, on: confidence >= 0.7"). The same field answers
reachability under removal: "cut off by S" is (reachable from the sources) Subtract (reachable from
the sources within the graph without S), the element-level form of attack-tolerance analysis.

A rule set's **population** is what a relative threshold or a rank is measured against, and is shown on
its Rule row. It defaults to the elements that carry the value within the rule's scope, so a threshold on a
result attribute is measured over that attribute's own scope and never counts elements it was not
computed on ("top 10% of 1,204 computed; 4,106 not computed"). It may be "each group of" a partition
or categorical attribute, which gives grouped thresholds ("top 3 by degree within each Louvain community").
A named set has one membership wherever it is used. "The largest connected component" is a rule
(rank 1 by component size), so it follows the data; a step naming one component is the fixed
alternative.

**Which edges come with a set is stated, never inferred.** Every set has an edge reading. An
**induced** set means its nodes and every edge between them, as NetworkX's `subgraph` gives; every
node rule is induced. A **listed** set means exactly its listed elements plus their endpoints, the
**edge subgraph**, as `edge_subgraph` gives; a path, a flow's edges and an edge list result are
listed. A rule set may also be **clipped**: the nodes its rule keeps, plus the edges its rule keeps
whose two ends are both among those nodes. That is exactly what a filter shows (an edge step keeps
the nodes it isolates, section 5.2), so Save as rule set on an edge step stores a clipped rule and
the saved rule means what the step meant; induced would re-add the cut edges and listed would drop
the isolated nodes. The weighted-network threshold "keep every node, only the strong edges" is a
clipped rule. Clipped is a reading of rules only: a fixed set's nodes already hold its edges' ends,
so clipping one changes nothing. Create set on a selection that holds nodes stores what was selected and
reads it as induced, and the set's Rule row says so ("Edges: induced"), where changing it is one
undoable edit. Inferring the reading from whether any
edge happens to be listed would let one stray edge change every density and scoped run. "The graph without S" removes S's nodes,
every edge touching them and S's own edges. The neighborhood rule over one node is the ego
network. Internal density, edges leaving the set and conductance are read on the induced subgraph.
A run's record says which reading its scope used, and the (i) on "Filter to" says the same.

Structural pattern search (subgraph matching) is not a rule: it is an algorithm whose result has
one item per match (section 3.3), because an NP-hard search cannot be re-evaluated on every change.

Where a set came from is its **created from** reference, stored beside the definition and shown
as a "Created from" row with a link, as Figma's "Go to main component" row is. The command that
makes a set is **Create set**, named as Figma names the command that makes a lasting definition
("Create component", Ctrl+Alt+K), and bound to Ctrl+G, where a Figma user's hand goes to turn a
selection into one thing. Ctrl+Alt+G is unbound (`principles.md` 4). The new set is selected and put into rename at
once (`research/figma.md` line 830; `design/ui/figma/flows.md`). What it stores depends on its
input (section 8). Create set always gives a fixed set ("Set, fixed, 20 nodes"). A rule is kept
where it is still on screen: **Save as rule set** sits beside Create set on a histogram band ("rank
<= 20 by betweenness"), on a value's menu ("device = device of account A"), on Find's query and on a
filter step, so a replay on new data does what the analyst meant. The selection carries no memory
of how it was made, so no outcome depends on history the analyst cannot see.

A set is addressed by reference and never passes through graphty-element's selection, so a set of
200,000 nodes is styled, noted, exported or used as a scope without truncation. Only "Select
members" produces an element selection, and it says so when the cap truncates it.

**A subnetwork is a set.** It is shown through a "filter to" step, laid out with its own layout
settings (section 5.5), saved as a view and analysed with the set as scope; exporting it writes it
as a graph file. Nothing copies it into a graph of its own, which would sever it from its parent's
notes, labels and edits. Parent and subnetwork are seen together on the
comparison surface.

### 2.5 Path

A **path** is an ordered walk: its node sequence, first node first, with each step naming the edge
it took. On screen it is its own object type, with its own row, its own type-row kinds and its own
verb, Create path. In graphty-element it is the third kind of set definition, beside fixed and
rule, so it shares one id space, one reference type, one Delete and one "Used by" with sets. The
definition keeps the walk, so a path may repeat nodes and edges and loses nothing a separate
object would keep. The first node fixes the direction on an undirected graph, and one node alone
is the zero-length path (start equals target).

- **Each step names the edge taken.** Where parallel edges join a pair, the step names the one edge
  the algorithm or the analyst used, which is what "which transaction" asks in "Path
  Investigation". A step names a group of edges only where the algorithm genuinely used a group
  (a reciprocal pair read on the undirected view), and an unnamed step means every edge between
  its pair.
- **Its kind is derived, never stored**: **Path** (no repeated node), **Trail** (no repeated
  edge), **Cycle** (a closed trail whose only repeated node is its first, equal to its last) or
  **Walk** (anything else), read from the walk, so it can never disagree with it. The type row
  shows it; it is a fact, not a control.
- Wherever a set is accepted (a scope, a filter step, a membership rule, a note target) a path is
  accepted as the set of its elements, read listed: its distinct nodes and the edges its steps
  name.

A path found by an algorithm is an item of that algorithm's result until the analyst runs Create
path on it, which gives a path object. A path can also be made by hand from a selection of edges that forms a
walk (refused, with the reason, when the order is ambiguous) and extended one hop at a time from
its last node, which is how the fraud-analyst persona traces money "A->B->C->D". A shortest-path
result reports ties ("one of 4 shortest paths") and records which weight attribute it read and in
what role. An empty result is still a result: "no path: components 3 and 17" has a record and can
be noted and exported, which "Path Investigation" names as success ("confirmed not connected").

## 3. Derived concepts

### 3.1 Attribute

Every per-element value is an **attribute**: shown as a sortable column in the table, and readable
by rules, style layers, comparisons and export. This document says "column" only for the table's
column that shows an attribute. An attribute's **origin** (the field graphty-element publishes on
`AttributeDescriptor`, `research/graphty-today.md` 1.5) is one of five; the first four are
published and **authored** is an additive value:

| Origin   | What it records                                                                                        | On Replace data                                         |
| -------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Imported | the file and field it came from, its detected type, and any corrections                                | replaced by the new data; corrections carry over by id  |
| Joined   | the table (stored in the project), its key column, and the match report                                | the join replays against the new data and reports again |
| Result   | the algorithm run that wrote it (section 3.2)                                                          | the run replays                                         |
| Computed | the expression that wrote it                                                                           | the expression re-evaluates                             |
| Authored | written by the analyst, for one element or for every member of a set or selection in one undoable step | carried over by node or edge id                         |

**Missing is not zero.** An element outside a run's scope, or absent from a window, has a missing
value, shown as "not computed". Missing values are left out of every population, rank, percentile,
legend scale and comparison, and the exclusion is counted where the number is shown. A categorical
attribute's missing values form an explicit "(none)" group, which partition statistics such as
modularity and assortativity leave out and say so. An export header always carries the attribute's
scope ("betweenness, largest connected component"), because an export travels without its
screen; on screen a column header, legend or rule row names the scope when it differs from the
filtered graph the chip names, and an active filter is named once, by the header's filter chip (`principles.md` 1).

An **expression attribute** (origin computed) is a formula over one element's own attributes, including standardizations
such as a z-score or a percentile over a stated population ("mean rank across methods",
"betweenness divided by degree", "logFC in A minus logFC in B"). It needs no runs, because it has
no seed and nothing to tune: it follows its inputs like a rule set, is out of date exactly when a
held attribute it reads is, and editing the formula is one undoable edit. Its formula is its record.
Expressions and attribute predicates share one expression language (`element-contract.md` 9).

A **neighborhood aggregate** is not an expression, because it reads the edges: an aggregate of an
attribute (one list for every aggregate in graphty: count, sum, mean, median, minimum, maximum,
share where a condition holds, most common value with its share, number of distinct values, and
most frequent words for text; `information-architecture.md` 5) over each node's incident edges or
k-hop neighbors, with a direction and an optional edge predicate, as NetworkX's
`average_neighbor_degree` generalizes. It is an ordinary algorithm run that writes a result
attribute, so it has a scope and a record. Weighted degree is its built-in case. An expression can
read its output ("logFC minus the mean logFC of neighbors"). One primitive serves audience
profiles, the share of a customer's contacts who churned, supplier concentration by region and an
account's exposure to flagged neighbors.

A triage attribute ("error", "threat", "discovery"), a determination ("confirm", "clear",
"escalate") or a role classification is an **authored categorical attribute**. It is exclusive by
construction, gets a legend, exports as one CSV column and carries over by id. It is not set
membership and not a note.

A categorical attribute may hold a **list of values** per element (GO terms per gene, aliases, tags,
the genes of a pathway). The attribute predicate reads it with "contains", and it reads as a
**cover**: one group per value, where an element may sit in several groups. Numeric vectors stay out
(section 11).

**Always-available metrics.** Degree (counting parallel edges, as a multigraph degree does),
in-degree, out-degree, weighted degree, neighbor count (distinct neighbors), component membership
with its size (weak by default on a directed graph, strong as a second attribute), and core number
are free to compute. The inspector, Statistics and inline filter steps read them live: an
inline step reads them on the previous step's output, because a k-core taken after an edge cutoff
is a different graph from the reverse order. **A binding freezes.** A style layer, table column or
export that binds one of them binds a run of it over the filtered graph at that moment, a frozen
scope like any other run, made without a prompt because it costs one pass over the edges. So
degree and betweenness bound at the same moment measure the same graph, and a later filter never
resizes nodes or moves a legend; the binding then shows its scope on its state line ("on: 1,204 nodes"). The inspector shows the
live value only; the bound value is read where it is bound, in the layer, column or export. With no filter the filtered graph is
the full graph, so the common case is unchanged. Asked for over a named scope, one of these
metrics is likewise an ordinary run, which is how "Condition Comparison" holds degree in A beside
degree in B.

A result that is one subset (articulation points, bridges, a minimum cut) writes a boolean
result attribute, which is categorical, so its "true" group is what is kept, styled or used as a step,
the selector pattern `CLAUDE.md` already uses (`isInPath == true`).

### 3.2 Result and run

A **result** is the named, kept container for one analysis. It has an id, a **kind** and its runs,
and it is either a reading or a collection of queries:

| Kind                 | Examples                                                                                                                       | Items                          | Runs                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ----------------------- |
| metric               | PageRank, betweenness, neighborhood aggregates                                                                                 | none; values on every element  | one current             |
| partition            | Louvain, Leiden, MCL                                                                                                           | groups (communities, clusters) | one current             |
| graph statistic      | transitivity, average clustering, diameter, assortativity; read in Statistics, never listed in the Results panel (section 5.4) | none; numbers over the scope   | one current             |
| series               | a metric, partition or graph statistic over a list of windows (section 10)                                                     | per-window values              | one current             |
| path family          | shortest path, k shortest, cycle search                                                                                        | paths                          | a collection of queries |
| flow                 | max flow, min cut                                                                                                              | the flow's edges and value     | a collection of queries |
| match list           | pattern search; temporal motifs if shipped                                                                                     | matches                        | a collection of queries |
| pair list            | link prediction, duplicate detection                                                                                           | candidate pairs with a score   | a collection of queries |
| node list, edge list | articulation points, bridges, a min cut's edges                                                                                | the listed nodes or edges      | one current             |
| comparison           | a saved "Compare with..." against one baseline (section 7.5)                                                                   | one item per saved comparison  | a collection            |

Connected components and k-core shells are always available (section 3.1); run over a named scope
they are ordinary partition runs.

**Metric** means a value on every element (graphty-element publishes the shapes `node-metric` and
`edge-metric`); a shortest path is not a metric.
A **run** is one execution of a result and owns the record (section 4). A result's values live on
the elements as result attributes, where tables, rules and style layers read them like any attribute;
the result holds the graph-level numbers (modularity, a path's length), its runs and their items.
igraph's `VertexClustering` is the precedent: a membership attribute plus an object with the quality
score and parameters (`research/graph-tools.md` 15).

**A reading has one current run.** Every reader of the whole result (its automatic style layer, a
rule, a table column) follows the current run. Changing a parameter (resolution, damping, seed)
adds a run and makes it current; that is **tuning**. Earlier runs stay under the result for
"Compare with..." and for citing. They are not undo steps: undo removes the act of running
(section 7.4), and history is reached by looking.

**A query kind is a collection.** A path, a flow or a pattern search is asked many times in one
session with different endpoints. The endpoints are the query: each query is a run with its own
items and record, listed under one result per algorithm, the way Figma lists autosaved versions
unnamed. The scope is a property of each query, recorded on its run and shown on its row in the list, not of
the result, so editing a filter between two path queries does not scatter them across results. The latest query and every kept path are drawn; each query has its own visibility, as
each Figma layer does, so an earlier query is one click from being drawn again and the canvas does
not fill with every question asked. Refining a pattern is a new query; a match it finds again is
the same item, because a match is keyed by the elements it binds, so its label carries over.

**Run resolves one way, in the UI and the API alike.** For a reading, running an algorithm that
already has a result over the same frozen scope and the same source nodes reuses that result:
identical parameters select it without recomputing, and different parameters tune it. Anything
else makes a **sibling result** named by its scope ("Betweenness, without Supplier X"), and the
earlier result stays current for everything that reads it, so a what-if never destroys its own
baseline. Different source nodes (personalized PageRank from another seed set) are a different
analysis and make a sibling. For a query kind, every run is the next query under the algorithm's
one result, whatever its scope or endpoints. Re-run is Run
over the recorded scope. "Run as new result" is the only override, in the run control's overflow
menu. Replacing a run is not a verb: the earlier run stays under the result, and its values are
dropped once nothing holds them (section 13, Retention). The result id is a name fixed at the first run and never recomputed
(`element-contract.md` 3). **Exact and sampled are two results.** Whether a method is exact or
sampled is part of the result id, so "Betweenness (sampled)" is always a sibling of "Betweenness"
and never its current run; a reader bound to one never silently switches to the other.

**A retune never branches on hidden state.** A reference to one item holds its run (section 7.1).
Retuning a result whose groups carry group names, notes, kept sets, group attributes or group-targeted
layers leaves those on the earlier run, marked "earlier run". The run control says so before it runs ("3
group names and 2 notes stay on the earlier run"), and **Carry over to new run** moves, in one undoable
step, every one whose group matched one-to-one, listing only the splits, joins and groups with no counterpart for the analyst to decide. graphty-element's rebind operation returns the same list, so a script gets
the same answer as the UI.

**Within each group** is one run whose scope is a list of group scopes (section 5.3). It writes one
attribute in which each value is tagged with its group, and the record keeps n per group. A value
normalized within its group is marked so, with an (i) saying that ranks across groups are not
comparable, and a within-group percentile is offered as the comparable reading. Tuning adds one run,
as for any reading.

A stochastic method's run is one sample. A partition shows that it came from one seed. "Compare
with..." across two seeds (section 7.5) is the quick stability check "Community Analysis" asks for;
consensus over many seeds is a tail task in `top-tasks.md`.

### 3.3 Items, groups and the item address

A result with many members is one record, and its members are **items**. One part of a partition,
a cover or a categorical attribute is a **group**, the word graphty-element already publishes
(`group`, `groupSize`, `groupCount`); a found path, a match and a candidate pair are items that are
not groups. On screen an item is always named by its kind (community 4, weakly connected
component 1, k-shell 3, region: EU, path 3, match 12), never by a generic word; "Groups" appears
only as the listing under a partition result; a node's membership list is headed "Memberships"
(`glossary.md` 5, 8).
"Row" means a table row or a list row only. Groups carry attributes with the same origins
elements have: authored (a group name such as "the ring"), joined (a table keyed by group key, with a
match report) and expressions over group statistics (the most common value of a categorical
attribute, the mean of a numeric one, the most frequent words of a text attribute). Group
attributes belong to the run and hold it, as group names do. This is how an enrichment table produced elsewhere
comes back onto clusters, and how 15 clusters get names from their most common annotation without
typing 15 names.

**Any categorical attribute reads as a partition with no run.** Node type, customer segment, region
and a triage attribute get the same parts as a community partition: one group per value with its size,
"within each group" as a scope and as a population, group statistics, and the table of edges
between groups. **Group statistics** are the Statistics (section 5.4) of the group's induced
subgraph. The schema summary of "Knowledge Graph Construction", comparing a hub to "similar entity types" in "Hub
Investigation", and PageRank within each segment need no feature of their own.

An **item address** names the graph, the result, the run, the level where the result has levels,
and the item key; or the graph, the attribute and the value for a categorical attribute
(`element-contract.md` 4). Freshness is derived when the address is read and never stored in it.
The item key follows the identity rule: a community number within its run; a component by its
smallest node id; a core shell by its core value; a match by the elements it binds; a path by its
edge sequence. The item address is graphty-element's one address for "one of many": a selection
target, a note target, a style layer's selector, a scope, the source nodes of a run, and the input
to Create set and Create path. Its published name is decided in `element-contract.md` 4.

Items are listed in the result's table ("N more" opens the table), and the analyst inspects
many before keeping a few. A node's membership list reads "kept sets plus groups": "Louvain
(resolution 1.0): community 4 of 212". Every result kind may be empty and still has a record.

**Output that can outgrow its input is capped.** Any operation whose output can grow faster than
its input (link prediction, simple cycles, pattern search, a bipartite projection, including one from a
list-valued attribute) runs with a declared cap (top k per source node, or a threshold), shown in its record.

**Pair lists.** A pair-producing run records its candidate pairs: source nodes by a target set,
by default every unconnected pair. When node types are declared and the pairs cross two types, a
violated-precondition mark says that neighbor-overlap scores (common neighbors, Jaccard,
Adamic-Adar) are zero across the types, and its one verb is a path-based score (`principles.md` 1). Predicted pairs are drawn as candidate edges by the
result's automatic layer, which can be switched off like any layer; no layer can make a candidate
edge look like an observed one. By default the layer draws only the candidates that touch the
selection or the object selection, and a style layer can widen that. Clicking a drawn candidate selects its two nodes, and its context menu carries the pair row's
commands ("Paths between its ends", Add edge, Merge nodes); a pair is a table row, never a
selected object (`information-architecture.md` 4). Pairs are never added to the
data.

## 4. Operations and their records

Every operation that writes persistent state writes a **record** of one shape, answering five
questions about what it produced:

- **From what?** The graph reference (below), the **source nodes** (any node, set or item the
  operation reads as an argument: the personalization set of personalized PageRank, the seeds of
  network propagation), and the attributes and sets read, with their revisions.
- **Over what?** The scope, as a frozen graph reference.
- **By what?** The operation, its version and the engine that ran it (CPU, or WebGPU with its
  adapter class), the parameters, the **random seed** (reserved for the random number generator),
  the edge reading (which attribute filled which weight role with which conversion, direction,
  parallel-edge and self-loop treatment; section 9), the normalization, any cap, and whether the
  output is exact or an estimate with its sample size. "Re-run of" names the run it tunes.
- **By whom and when?** The project's author, start and finish times.
- **Is it still true?** Its freshness (section 7.1) and its status (queued, running, succeeded,
  failed, canceled), which are separate fields.

| Operation                                                                | Output                                                           |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Load, Add data, Replace data, Join, Re-map, Merge nodes, Remove, Correct | a data version (section 2.2)                                     |
| Transform                                                                | a new graph entry, or a data version of one (section 7.6)        |
| Algorithm run                                                            | result attributes and items                                      |
| Expression                                                               | a computed attribute                                             |
| Layout                                                                   | positions (section 5.5)                                          |
| Save comparison                                                          | a saved comparison, an item of a comparison result (section 7.5) |

A **frozen graph reference** is the graph, its data version, the scope definition as it stood when
the operation started, and a digest of the members that stands in for the member list, which does
not scale to a million nodes (`element-contract.md` 6). It is graphty-element's equivalent of the fixed
`G` a NetworkX call receives, and runs, layouts, transforms and comparisons all use it.

**The operation log is append-only.** The records form the project's operation log, which is also
its chain of custody. Undo and redo append entries that name what they reverted, with the author
and time; an undone run leaves its result and the canvas, but its record stays in the log, marked
undone. The **methods text** of an export is written from the current state: the data versions,
the filter steps of each scope and every run behind what is exported, word for word, as copyable
prose. This is Ragan et al.'s data and visualization provenance stored once
(`research/graph-analysis.md` 1.9).

The record is shown by exception, and never on a second line: the state line carries freshness
and a scope that differs from the filter chip's, the result's name carries its variant (a sample,
a weight read other than as its declared role), an estimate carries "~" at the value, and the
engine, seed, sampler and weight attribute are under Details (`principles.md` 1).

**A family of tests is counted.** When one act produces many p-values (a comparison over a list of
scopes, a sweep, a null-model test per group), the record counts the tests, the p-values shown are
Benjamini-Hochberg adjusted, and the raw values are under Details.

**Retention.** Records are kept forever. Values are kept while something holds them: a reading's
current run, a drawn or kept query, a run that is cited, compared, held by a reference, marked "Always store values" or
undoable, and the runs that were current on the previous data version until the next Replace data.
Otherwise a run the catalogue declares deterministic for its recorded version and engine drops its
values and offers "values not kept; restore". Its inputs are always held, because a record counts
as a reader of the attributes it names. A restore under a different algorithm version or engine is
labelled a new computation, never shown as the old values. The full rule and its cost are in
`element-contract.md` 8.

The one word is **record**; on screen a run's record is read from the **Details** link on its state
line.
"Created from" is the reference a set keeps; "data version" is the frozen graph state, met on screen
as "Earlier data" and the data versions in Version history. "Lineage", "provenance", "history" and "data revision" are command palette
aliases; no panel is called History, because Figma's history lists file versions a user can restore
and a record restores nothing.

## 5. Working state

### 5.1 Selection and object selection

**Selection** is what the analyst is pointing at now, and it is transient. Selecting a set, a path,
or an item as one thing (clicking its row in a list) is an **object selection**
(design-only; on screen the object is simply selected): every command
targets the object itself, untruncated. Enter selects its members. Shift+Enter returns to the
object the members were entered from, and otherwise does nothing, because membership is
many-to-many. Esc clears the selection, leaving the graph's inspector. A canvas click always selects the element, never a set it
belongs to (`research/figma.md` line 1052). Object selection is published session state owned by
the element, because a headset, an assistant, the command palette and a third-party consumer must
all see the same thing. Anything the UI can select, the API and the command palette address by the
same id.

**Queries end as selections.** Find and "Select same value" (Figma's "Select all with same", on a
node's context menu) produce an element selection, or an object selection when the cap would
truncate it. The selection does not remember the operation that made it: Create set on it gives
a fixed set, and a rule is kept with Save as rule set where the rule is still on screen (section
2.4); nothing is saved until then.

**Select neighbors** grows the selection, or the object selection by reference, by k hops in the search
graph (section 5.3), as one undoable step, following the selection model Figma and Cytoscape share.
When the filters include a working set, Select neighbors also adds the new nodes to it, and places them
near their neighbors (section 5.5). Keeping, filtering to or highlighting the grown selection are
the analyst's next ordinary commands.

### 5.2 Filters

A filter is not an object. **Filters** are one working state of the session: an ordered list of
steps (in design documents, the filter pipeline), each a **filter**: a set with an outcome,
**Filter to** or **Filter out**. Order matters, because a k-core
after an edge cutoff differs from an edge cutoff after a k-core; steps that read only imported or
authored attributes commute and may be reordered freely. A step written inline reads the previous
step's output; that is a field of the step (what it reads), never the missing scope of the rule it
holds, so the same rule saved as a set means the same thing everywhere (section 2.4). A named set
used as a step keeps its own scope and membership. An edge step keeps
the nodes it isolates unless a "drop isolates" step follows, and Statistics counts them.

Steps are of two kinds, and **the command that creates a step decides its kind**, never the
definition of the set inside it. A **working set** is the boundary of what the investigator is
looking at; "Filter to selection" and "Filter to neighbors" create one, and Select neighbors and "Include found nodes" add to
it. A **data step** encodes a judgement about the data ("confidence >= 0.7", "filter out transactions
under $10", "filter to the largest connected component"); every other way of adding a step creates one,
whether the set it names is fixed or a rule. The two kinds look different in the list: a
working-set step reads "Working set: 40 nodes" with its own icon, and a data step shows its
predicate. "Working set" is a screen word and "data step" a design-only one; one (i) on the
working-set step says that runs count only what is in it and searches can reach beyond it. A
Filter to step's menu has one checkable item, "Working set", that switches its kind as one
undoable edit; a Filter out step is never a working set, because an exclusion that searches
ignore is no boundary at all. The kind is
visible because it changes what searches cross (section 5.3). The investigator's pattern needs no
mode: start from a few source nodes, "Filter to selection", and Select neighbors grows the working set. It is
the expand-from-seeds pattern of Linkurious and Neo4j Bloom, whose Expand grows a small starting set (`research/graph-tools.md` 20.21), which the
investigation personas come from. Dimming is
not filtering; dimming what was not selected is a style layer the reader adds (`CLAUDE.md`,
"Algorithm Styles").

**Filters have two jobs, and the model separates them.** They decide the **filtered graph**, the
**full graph** (the graph after data edits, before any filter) after the filters, which is what analysis sees; and they supply
the default scope for runs. The scope is copied into the record when a run starts (section 4), so
later filter edits never change what a finished run means. What a client draws is its rendering of
the filtered graph, and the word **drawn** is kept for that. A client whose drawing budget the
filtered graph exceeds says so and draws nothing until the analyst narrows it (a search, a working
set or a filter step); it never samples the drawing silently. Statistics, the table and every run
still work, because the session is headless. The filtered count is on the filter chip ("Filtered: 1,204 of 5,310 nodes"); the status line
carries only what is not drawn ("300,000 not drawn", with "over the drawing limit" in its (i)). The phrase "filtered graph" appears on screen
only while at least one filter exists, so it is true in every state, including the workflows that
start above the drawing limit (Threat Hunting, Fraud Ring Investigation, Influencer Identification,
Knowledge Graph Construction, Graph-Based Recommendation). graphty-element publishes this concept
as the scope value `"visible"`, documented as the data scope and not the render set; the screen
never says "visible" (`glossary.md` 7).

### 5.3 Scope, source nodes and population

One word used for three things is the source of most scope errors, so the model keeps three:

- **Scope** is the graph an operation runs on, recorded as a frozen graph reference.
- **Source nodes** are what an algorithm reads as an argument (section 4).
- **Population** is what a relative threshold or a rank is measured against (section 2.4).

**Which graph each family reads by default:**

- Metrics, partitions, graph statistics, layouts and transforms read the **filtered graph**. This
  is what NetworkX, igraph and Gephi users expect, and it makes the drawing and the next number
  agree. Layouts reach this default in steps (section 5.5): graphty-element 2.x lays out the whole
  graph unless a scope is given, and changing that published default is `one-way-doors.md` 17. When the filtered graph is a working set, the run goes ahead and carries no mark, because the
  filter chip already reads "Working set: 40 of 5,310 nodes"; "Run on full graph" makes a sibling
  in one click.
- Operations that find what is not shown (Select neighbors, a neighborhood rule with no scope of its own,
  find, a path between named endpoints) read the **search graph** (design-only): the full
  graph with the data steps applied and the working sets lifted. They cross the
  working-set boundary but never walk through what the analyst's rules leave out. When the result
  reaches elements outside the working set it says how many and offers "Include found nodes", which adds
  them to the last working set. When a data step would exclude more, the result names it ("12 more
  beyond filter 'amount < 10'") and offers to include them, which edits that step: a "filter to"
  data step becomes Union(its rule, those members) and a filter-out step becomes Subtract(its set, those
  members), one undoable edit that the step's row shows.
- Either default can be overridden per run, and the record states which was used.

Other named scopes are a set (read as section 2.4 says), "the graph without S", a time window, and
a **list of scopes**: one run over several scopes, writing values tagged by scope and keeping
n per scope. "Within each group" of a partition, the windows of a series, a run on each graph of
the project or on both sides of an open comparison, "without each group" and "without each member"
of a set (the leave-one-out sweep: every tier-1 supplier removed in turn, composed from "without"
and "each of") and the samples of a null model (section 7.5) are all this one form, and each reads
as one result. On screen the form is the Scope row's "Each of..." and "Without each of...".

**A different scope is not out of date.** Gephi's real defect was never that filtering changes
computation; it was that the scope a value used was not recorded, so one column mixed values from
two graphs (`research/graph-tools.md` 20.31). A result whose recorded scope differs from the current
filtered graph is normal: its state line states the scope as a fact ("on: largest connected component, 812
nodes"), with no status word, and "scope differs" is only the design documents' name for that
condition. It is **out of date** only when an input it declared changed (section 7.1). A style
layer's scale comes from its attribute's values over that attribute's scope, never from the current
filtered graph, so a filter never moves the legend (Gephi issue 541).

**No cycles.** References must form an acyclic graph. A scope may read an earlier run of the result
being computed, never its current value, so a step "top 10% by PageRank" cannot scope the PageRank
it reads. graphty-element refuses with a typed error, and the UI offers "Create set from current members".

**One set grammar.** The owner decided one vocabulary for sets across the published session
contract. The model has one shape, the **set definition** (fixed, or a rule of the three predicate
kinds with an optional scope), and a style layer's selector, a filter step, a selection target and a run
scope all accept a set definition or a set reference (`element-contract.md` 9).

### 5.4 Statistics of a scope

The whole-graph overview is not a special object: it is the **Statistics** of a scope, an inspector
section every scope has in the same form (the name matches Gephi's panel and graphty-element's
published `data.statistics()`; "summary" is not used, because `RunResult.summary()` already means
one run's digest). Its first level, the **overview** (a design word; the rows carry their own names), follows the data at no cost: node and edge counts, directed or
undirected, weighted or not, density (section 9) with parallel edges and self-loops counted beside
it when non-zero, connected components (count, largest share, isolates; weak and strong on a directed graph), the
degree distribution, and the attributes, each read at its column header in the table with its type,
role, completeness and the same histogram as degree. One level down, on request, are graph
statistics (transitivity, average clustering, diameter, average path length, assortativity,
reciprocity): each is a graph-statistic result with a record, exact at every size, with its cost
word before it runs and a sampled method as its variant (`principles.md` 2). The full list is in `top-tasks.md` task
1; which readings sit at rest is fixed by `principles.md` (worked conflict: the graph's inspector at rest). A proper subset adds a boundary section (edges leaving it, conductance) and its counts against
its parent. The graph's inspector (section 2.1) shows the Statistics of the filtered graph; the full graph's
node count is on the filter chip, and the edges row carries "of" its full count.

**The two levels follow different rules, and each row says which.** The first level follows the
filtered graph. The graph statistics hold, like every run, because what follows and what holds is
decided by kind, never by cost (section 7.1); rerunning them automatically below a size threshold
would make the same statistic follow on a small graph and hold on a large one. After a filter
change each held statistic carries its own state line stating its scope ("on: 5,310 nodes"), with
its one verb, "Run on filtered graph". The section therefore never presents two scopes as one reading.

**Which component shows what.** A selected set, path or group (an object selection) shows its
Statistics with the boundary section. Several elements selected by hand show the attributes whose
values are shared, then one row counting those that differ, followed by the Statistics of the selection as a
scope. There is one Statistics component and one word for it. A set's audience is the Statistics of
the neighborhood rule over it.

"The graph without S" is a scope, so a what-if removal in "Supply Chain Risk Assessment" is the
Statistics of that scope compared with the baseline (section 7.5), and which customers it cuts off is
a rule (section 2.4): the standard attack-tolerance analysis. A "without each group" sweep sorts the
removals by their effect, which is the robustness curve analysts plot; the saved scenarios form one
comparison result, the scenario table. No impact dialog is needed.

### 5.5 Layout and positions

Figma's counterpart is Tidy up, a one-shot arrange command on the selection
(`design/ui/figma/right-sidebar-selection/README.md` line 274), not auto layout: auto layout reflows
live whenever a child changes and one frame owns each child, and neither holds for a force layout
over sets that overlap (`principles.md`, departures).

- **Layout settings** (algorithm, parameters, random seed) are a definition stored on the graph, a
  set or a partition, shown as property rows in that object's inspector. They store what the next run over
  that scope uses; they never govern positions continuously. A layout may read attributes as
  parameters: x and y from longitude and latitude, y from a tier attribute, a split by a categorical
  attribute. An axis set from an attribute is an **encoding**, not an arrangement: it follows that
  attribute as a style layer follows its data, recomputed at O(n) on any change to it, as Figma's
  auto layout follows its property (section 7.1). Only the arranged axes hold.
- **Running a layout** is an operation with a record over a frozen scope, the filtered graph by
  default. Until that default ships (`one-way-doors.md` 17) the default is the whole graph, only
  simulation layouts (force-directed and its methods) accept a scope, and a static layout (Circular,
  Shell, Spectral and the rest) refuses one, because where a subset lands among nodes that do not
  move needs a placement rule first; the simplest is to lay out the subset alone and fit it into
  its members' current bounding box. graphty-element keeps one layout scope for the graph and
  carries it across a change of layout or parameters; because an outcome must never depend on
  state the analyst cannot see, the Layout row always shows the scope in force ("on: Suspects, 40
  nodes"). Layout settings stored on a set or a partition remain the target. A layout starts from
  the current positions unless **Fresh layout** is chosen, so the mental
  map survives a re-layout. It writes **positions** only for elements in its scope, and the last run wins for the
  nodes it wrote, so a node in two sets takes the position of whichever layout ran last. A
  per-group layout lays out each group and then packs the groups' bounding boxes without overlap. A run
  is one undoable step, and Stop keeps the positions reached.
- **First placement.** Nodes that have never been placed (a file opened without stored positions,
  or the first entry to 3D) are placed by a layout run that Open or the view-mode command implies:
  the graph's layout settings, which default to graphty-element's default layout, with the seed
  recorded like any layout run. It is not a move (`principles.md` 6).
- **Incremental placement.** An element that enters the filtered graph through a command (Select neighbors,
  "Include found nodes", removing a step, Replace data) with no position from the current layout is placed
  near its placed neighbors, as part of that command's undoable step and record. Existing
  positions and pins hold, so the analyst's mental map survives.
- A **pinned** node ignores layouts. A pin is stored per node with the positions and is undoable;
  a hand move is an ordinary undoable edit.
- The graph holds current positions for 2D and for 3D. Arranged positions have no freshness,
  because they are never read as a number, and value axes need none because they follow: a layout is not a result, is never compared, and takes no place in
  the tree of analysis results.
- A view references **stored positions**, not the current positions, so re-laying out never
  changes a saved picture. When the analyst re-lays out while a view references the current
  positions, the stored positions are kept (float32, drawn nodes only), and the view reads "Changed since
  applied" with Update view and Revert.

## 6. Presentation and commentary

### 6.1 Style layers and automatic paint

Node and edge appearance is applied only through style layers handed to graphty-element (`CLAUDE.md`,
"Graph Styling"). Layers stack; the top wins each channel it writes; highlights (paths) stack as
edge and node style layers and are not exclusive. An algorithm's suggested layers write only to
elements carrying its result (`CLAUDE.md`, "Algorithm Styles"). A layer whose selector targets groups
may also write a group mark (a hull and a group name placed at the group) from group attributes; that is a
channel, not a new layer type (section 10).

A result paints itself when it first runs, through one automatic layer per result, which follows
the current run of a reading or the drawn queries of a collection. **Automatic layers always sit
below the layers the analyst made or edited**, so a deliberate encoding ("color by log fold
change") is never overdrawn by a result run only to read its ranking. When a layer above covers
every element on a channel (fill color, size) that an automatic layer writes, the automatic layer
is switched off, not removed: it stays in the list marked "covered by Color by logFC", one click
from coming back. Coverage is evaluated once, when the covering layer is created or edited, and
never on a filter change, because no layer switches itself on or off without a paint command, as
in Figma. When a later filter change brings in elements the covering layer has no value for, the
covering layer's row says "partly covered: 1,204 of 5,310" and the automatic layer stays off, so
a legend never silently mixes and never reappears on its own. A layer the analyst has edited is
never switched off. Covered automatic layers collapse into one "N covered" row in the list, so several results run in
a row add one row, not several. Automatic paint and keeping the covered layer are both departures
from Figma, where creating a variable paints nothing (`principles.md`, departures).

Editing one node's color writes to one collected override layer, never to the node. It is the
**Overrides** row at the top of the stack, present once something is overridden. The graph's
default look is itself a style layer, the **Default look** row kept at the bottom of the stack,
which cannot be deleted; a built-in look (Print, Colorblind safe) adds its own style layers to the
stack. Nothing paints a node or edge from outside the stack.

A layer that takes elements' opacity to 0 hides them because the reader chose to; there is no
floor, and the layer's row counts what it took to opacity 0 ("412 at opacity 0"), so nothing counted is
silently undrawn (`principles.md`, rules).

### 6.2 Notes

A **note** is prose written by the analyst, with an author and created and edited times, as a Figma
comment has. Its **targets** are primary objects only: nodes, edges, sets, paths, groups and other items whose members
are elements, and the graph. A note never targets a result, a view, a style layer or another note; commentary never
chains onto commentary or onto definitions, which is Figma's rule (`research/figma.md` 2.4, rule
4). A note about a finding **cites** the runs it rests on and the filter steps in force when it was
written, because the cutoffs a methods section must report (confidence, FDR, similarity) are filter
steps, not algorithm parameters. Written from a result's context (Add note in the result editor's menu, which targets the
selection, or the graph when nothing is selected), it cites that result's current run
automatically.

A note may **quote** attribute values of its targets. Each quoted value stores its target, the
attribute, the run and the value when written, and is marked when the live value differs, so a
determination read later shows what has changed since it was made. "Pin" is never used for this;
it means only a node fixed in place.

A note stores the ids and labels of its targets as they were when written, so it outlives them. Its
text never goes out of date; its citations do. When a cited run is no longer current, or belongs to
an earlier data version, the citation says so, so old reasoning is never read as true of new data.

A note stores no coordinates, because positions move at every relayout. It may be drawn anchored to
its targets, following them through a relayout as a Dev Mode annotation follows its node. Note
markers are drawn by default, as Figma draws comment pins in Design mode, and Shift+C hides them
all, as it does in Figma; the toggle is working state and no view captures it.

### 6.3 Views and export

A **view** is a named capture of the working state: the filters, which style layers are on,
collapsed sets, the camera, the view mode, stored positions, the display toggles (labels, arrows,
the legend, the minimap; never the note markers, because the view's own note list decides which
notes it draws), and **the list of notes it shows**, by note id. The list is empty by default, and a note written while the view is applied
joins it, so working notes ("probably a data error") never leak into a figure. A view has a title
and a caption. Its notes are drawn as callouts anchored to their targets, each showing the note's
first line with the rest behind it, as a Figma comment shows the start of its thread. There is no
free-floating callout object. A panel label ("Figure 2A") is the view's title. A label on a region
of the drawing is about the nodes in that region, so it is either a group mark reading a group
attribute (section 10) or a note about the set or group that forms the region. Views keep a user order in the
project. Applying a view replaces the working state as one undoable step; later edits mark it
"changed since applied", and Replace data marks it "data changed since applied", each with Update
and Revert. A view is not a place where filters or layers live, and it never references a
comparison.

**Export** and presenting are one task, and **output is a property** of what is exported
(`research/figma.md` 2.4, rule 6). Export takes the selection, the object selection, the graph, a
saved comparison, or several views, as they look now; no view is needed. Export settings (format,
scale, legend and its placement) are the last section of the exported object's inspector, so a
view's are in the view's editor and a saved comparison's in its own. Several views export
as pages in their order, the way Figma exports several frames. A saved comparison exports its two
panes on aligned positions with the difference legend. A **table export** writes the table
as it looks now (its columns, sort and filter) over the exported object, with each column's scope
and edge reading in its header. Exports can also write one table per result with one row per item (item key,
members, score, record header), the methods text (section 4) and the project file.

## 7. General rules

### 7.1 Follow, hold and freshness

**One rule decides whether a reference moves.** A reference to a definition follows it: a result
(read through its current run), a rule set, an attribute path, an automatic layer. A reference to an
instance holds it: a run, an item of a run, stored positions, a data version. A holding
reference whose target is no longer current says "Earlier run" (or "Earlier data") and offers
"Use current"; it never moves silently. This is Figma's instance rule: an instance follows its main
component. "Pin" is never used for this; it means only a node fixed in place.

What follows the data and what holds is decided by the kind of object, never by runtime cost, so
the same betweenness never follows on a small graph and holds on a large one. Following: counts,
density, components and the degree distribution in Statistics, the always-available metrics read
live, rule sets, expression attributes, style layers, layout axes set from an attribute, and the
filters. Holding, and marked out
of date where their values are read: runs of every kind, including bound always-available metrics
and graph statistics. Fixed sets and note text are never out of date; they can only have missing
members, which they count.

Every dependent carries a **freshness**, kept separate from a run's status:

| Value           | Meaning                                                                                                                                                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Current         | nothing it declared as an input has changed                                                                                                                                                                                                                                          |
| Out of date     | a declared input changed: the recorded scope's membership (for a named set in it, its revision), its source nodes, an attribute or set it read, a weight role or the edge reading                                                                                                    |
| Cannot re-run   | its inputs changed but it cannot be recomputed (its source data is gone)                                                                                                                                                                                                             |
| Detached        | what it refers to was deleted; it keeps resolving through the deleted object's kept record, so a style layer keeps painting and a filter keeps filtering what they did, and it says what it lost                                                                                     |
| Cannot evaluate | nothing was deleted, but its definition cannot be evaluated: a cycle made by an undo, a load or a redefine, a rule that no longer compiles, or a kind or field this version of graphty-element does not know (from a newer version or a plugin). It resolves to nothing and says why |

Freshness is derived when it is read and never stored. Detached is derived from the deleted
object's tombstone (its id and name are kept forever), never from an empty match, which is how a
saved scope today goes on answering with old members after its run is removed
(`research/graphty-today.md` 7.19).

Belonging to an earlier data version is not out of date, and neither is having a different scope. A rule that
reads a held result is out of date when that result is, says so on its row instead of filtering
silently on old values, and offers "Create set from current members". The published status
fields that complete this are in `element-contract.md` 7.

**One state line, at most two tokens.** Beside a value the UI shows one state line. Its first token
is the first state that applies in this fixed order, and its second is the scope when that differs
from the filtered graph the filter chip names (for example "Out of date - on: 5,310 nodes"); the line offers the verb of its
first token only. The order:
Running or Failed; Detached (Restore run, or Restore set); Cannot evaluate (Edit rule for a cycle
or a rule that no longer compiles; Update graphty-element for an unknown kind); Cannot re-run; Out
of date (Re-run); Earlier run (Use current for an item whose key means the same in every run:
`in`, on path, a category, a level; Carry over to new run for a partition group, because community
numbers are arbitrary) or Earlier data (Use current); Values not kept (Restore); and, when no state
applies, a different scope alone, shown as
the scope itself ("on: largest connected component, 812 nodes"; Run on filtered graph); otherwise
nothing. The screen never says "stale" or
"scoped".
Each state offers exactly the one verb that resolves it, and everything else is under Details. The
estimate mark sits at the value and is not a state line.

### 7.2 References and identity forwarding

Only four relationships are containment: a project holds its graphs, a result holds its runs, a run
holds its items, and a data version follows the one before it. Everything else ("computed within",
"created from", "a note about", "a layer painting from", "a view showing") is a reference, shown as a
property row on the referring object ("Scope: Largest connected component") with a "Used by" section on the
target. Deleting a referenced object never deletes what refers to it; the dependent becomes
detached.

An edit that replaces elements (Merge nodes, Add data by key, Replace data matching by id)
records a **forwarding map** from each old id to its surviving id. Every reference (a fixed set's
members, a note's targets, an override, an authored value, an item key) follows the map, and the
referring row shows "merged into John Smith". Undo reverts the edit and the map together. This is
one mechanism for entity resolution ("Criminal Network Analysis", "Knowledge Graph Construction"),
Replace data carry-over and matching across data versions. Edges a merge makes parallel are reduced
by each attribute's declared reduction (section 9).

### 7.3 Data versions and Replace data

Replace data adds a data version; it does not discard the earlier one. Rules, joins, removals,
corrections, the field mapping, filter steps, style layers and runs replay
on the new version, and each replayed run is current. Replace data is an explicit command and
counts as starting those runs, so it shows their combined cost word before it starts
(`principles.md` 2). Authored attributes, fixed sets, notes,
positions and pins carry over by id through the forwarding map; new nodes are placed incrementally
(section 5.5), and removed ones are listed in the import report. Runs on the earlier version stay
under their results, marked as belonging to it, keep their values until the next Replace data, and
"Compare with..." accepts them. Other data edits do not replay anything; a run that read what they
changed becomes out of date (section 2.2).

**Matching** across data versions, time windows and graphs is one mechanism: nodes and edges match
by id; partition groups match by overlap, with a one-to-many overlap reported as a split and
many-to-one as a merge, because community numbers are arbitrary; unmatched elements are reported on
both sides and nothing is dropped silently. The analyst's group names are never carried
automatically: Replace data's report and the result's row offer "Carry over to new run"
(section 3.2), one step for the whole result.

Data versions are version history in Figma's sense: off the working screen until asked for. Undo
reverts the act that created the latest data version, but never steps through older versions,
which are reached from the version list; restoring an older version appends a new version, as
Figma's does (`research/figma.md` line 497).

A project is its own template: reopening it and running Replace data replays the whole analysis,
pattern searches included, which answers Analyst Alex's "no way to save analysis patterns" for data
of the same shape. Reuse across a different schema is a known limit (section 11).

### 7.4 Undo

Undo is one linear history of the project, owned by graphty-element, because only graphty-element can see
every change: data edits, Replace data, Add data, the filters, sets, runs, layouts, pins,
style layers, authored values, notes and applying a view. The camera, zoom, panels and the view
mode are not in it, as in Figma. Undoing a run removes it from its result and the canvas; redoing
restores its stored values without recomputing; the log keeps both acts (section 4). A long
operation is one step. Undo restores the selection each step was taken with. There is no
exception; anything that bypasses the session today (layout, camera, pins) must move onto it before
undo can be promised (`research/graphty-today.md` 7.14). Undo is how a novice explores safely; it
is never how an earlier run is reached (section 3.2).

### 7.5 Comparison

"Compare with..." has two forms, following Figma's two (`research/figma.md` 4.4 and line 1046):

- **Two things selected** (two sets, or the Statistics of two scopes) are compared in the
  selection's inspector, as Dev Mode compares two selected components. A result is never
  selected (it is a definition, like a Figma variable), so two runs or two attributes are
  compared with "Compare with..." from one result's editor or one column's header, which asks
  for the other and shows the comparison there. Comparing two runs is comparing the attributes
  they wrote, each read at its own run.
- **Two whole states** (two graphs, two data versions, two time windows, or two scopes of one
  graph: two sets or groups, or one beside its graph) open a temporary
  **comparison surface**, as Figma's branch review does: a list of differences (elements added,
  removed, changed) first, then the two states side by side or overlaid on aligned positions, with
  selection linked across them. The explicit difference leads because small differences are hard
  to see between two drawings. The comparison is an element object that reads two sessions and
  owns neither (`element-contract.md` 1). It serves "Condition Comparison - Disease vs Control
  Networks" and the "what changed since last week?" question.

**A comparison is transient.** Like both of Figma's compare surfaces, it stores nothing and is gone
when the selection changes or the surface closes. **Save comparison** lands it as an item, with its record,
under one comparison result per baseline; only a saved comparison can be cited or exported. Saved
scenarios against one baseline read as one table, which is the scenario table of "Supply Chain Risk
Assessment".

The statistic follows the attribute types, each with an (i): Spearman rank correlation or Kendall's tau and top-k overlap for
two numeric attributes; adjusted mutual information (AMI) and the adjusted Rand index (ARI) for two
categorical ones, with plain NMI available by name to match published figures, because plain NMI
rises with the number of clusters; for numeric against categorical, the distribution within each
group with a Kruskal-Wallis test, or AUC when the categorical attribute is binary; Jaccard overlap of
node and edge sets for two graphs, with a per-element "A only", "B only", "both" attribute. A
per-element difference is written as a result attribute. Missing values are left out and counted;
when the two sides cover different elements, the comparison covers the shared ones and says how
many are unmatched on each side; when two normalized attributes come from scopes of different sizes,
it warns.

**A null model is a baseline, not a graph.** "Compare with randomized baseline..." takes a result or
graph statistic, a null model, a sample count and a seed. It is one run over a list of samples
regenerated from the seed and never stored, so nothing enters the list of graphs. It keeps the null
distribution (mean, standard deviation) and reports a z-score and an empirical p-value, never a
single random difference, because one random graph says nothing about whether a modularity of 0.4
is meaningful. The default null model is the configuration model (every node's degree kept, in and out
separately on a directed graph), sampled by double-edge swap; stub matching is available by name
and is never the unnamed default, because it creates parallel edges and self-loops that skew clustering.

### 7.6 Derived graphs

Some operations make edges that exist in no data: bipartite projection (including the
similarity network "Enrichment Map - Pathway Similarity Network" builds from shared genes, a
projection of the bipartite graph of pathways and the genes in their list-valued attribute), combining two graphs, a quotient graph (each group of a partition
replaced with one node, the community graph), and extracting one sample of a null model to inspect it. Each is a **transform**: an operation whose
output is a new entry in the project's list of graphs, with a record (the source graph and data
version, the operation, its parameters, the edge-weight rule such as a shared-neighbor count,
Jaccard, overlap coefficient or Newman's collaboration weighting, its cap) and a **derivation map** from each new element to the source
elements it came from, the same kind of map as a forwarding map. Its edges are identified by
(source, target), and its weight is a result attribute with the similarity role. Runs on a derived
graph can never be confused with runs on its source, because they are on a different graph id.

**A derived graph keeps its identity.** Changing a transform's parameters, or a new data version of
its source, adds a data version to the same derived entry, exactly as Replace data does
(section 7.3): the derivation map acts as the forwarding map, partition groups match by overlap, and
rules, style layers and runs replay. A cutoff that only removes edges is a filter step on the derived
graph, not a transform parameter, so thinning a projection live costs nothing.

**Combine** is its own transform, not Add data. Add data enriches one graph and keeps two
sources' edges apart (section 2.2); Combine exists to count what two graphs share, so it matches
differently. Nodes match by node id or a chosen key attribute. Edges match by their ends: (source,
target) ordered on a directed graph and unordered on an undirected one. Within each input,
parallel edges between one pair are first merged with each attribute's declared reduction
(section 9), and the record counts them. Two inputs with different declared directions are
refused with a typed error unless the run chooses a direction. The output is a graph with a
membership attribute ("A only", "B only", "both") on nodes and on edges, and the edge "both" count
is the number of pairs present in both inputs under this rule. Union, intersection and
difference are that attribute's groups kept or filtered. An attribute name found in both inputs is kept
twice, suffixed by graph name, and reported. Transforms are tail operations (`top-tasks.md`), homed at the new graph they make, launched from the main menu's Data submenu under
"New graph from", reached from the object they start from and the command palette, and add no
interface until used.

## 8. What each verb does

One default outcome per verb, so no verb's meaning depends on context the analyst cannot see. This
table is the budget of user-visible verbs: an entry is added only by removing one or by naming the
top task or the requirement in `top-tasks.md` it serves. An object's inspector shows at most three
of its verbs; the rest are in its overflow menu and the command palette. Editing a parameter, a
role or a value is an edit in a property row, not a verb, so changing Louvain's resolution and
pressing Run is Run. A verb preset by its context is the same verb: "Run on filtered graph" on a
scope line is Run with its Scope field set, "Create set from current members" is Create set on a rule set, a pair's "Paths between its
ends" is Run of a path search with both ends filled in, "Find path from..." arms the same search
with its start filled in, "Re-run all out of date" is Re-run over every out-of-date result,
"Collapse all" is Collapse over every group of a partition, "Unpin all" is Unpin over every pinned
node, "Copy as PNG" is Export to the clipboard and "Open sample" is Open. "Follow selection", like
"Show labels", is a display toggle, not a verb.
Each verb's screen label and rejected alternatives are in `glossary.md` 9.

| Verb                                                                                                                          | Applies to                                                                                                                             | Default outcome                                                                                                                                                                                                | Serves                                                      |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Open, Add data, Add as another graph, Replace data, Join, Re-map, Correct, Add node, Add edge                                 | a file, a table or the graph                                                                                                           | a data version (section 2.2)                                                                                                                                                                                   | bookend: bring data in; Replace data is task 12             |
| Select same value (Figma's "Select all with same")                                                                            | an element and one of its attributes                                                                                                   | an element selection                                                                                                                                                                                           | task 9                                                      |
| Select members (Enter)                                                                                                        | a set, a path, an item, the graph                                                                                                      | an element selection, which says so when the cap truncates it                                                                                                                                                  | task 9                                                      |
| Select neighbors                                                                                                              | a selection or object selection                                                                                                        | grows it by k hops in the search graph, one undoable step; new nodes join the working set, placed near their neighbors                                                                                         | task 4                                                      |
| Include found nodes                                                                                                           | nodes a search found beyond a working set                                                                                              | adds them to the working set                                                                                                                                                                                   | task 4                                                      |
| Select all, Select none, Invert selection, Select edges between                                                               | the graph; a node selection                                                                                                            | an element selection                                                                                                                                                                                           | Figma's standard selection commands, every task             |
| Select painted, Select overridden                                                                                             | a style layer; the Overrides row                                                                                                       | an element selection of what it paints or overrides                                                                                                                                                            | task 8 ("which nodes does this touch?")                     |
| Filter to neighbors                                                                                                           | a selection                                                                                                                            | a neighborhood filter step with the selection as its start nodes; a working set                                                                                                                                | task 4; the per-alert investigation of task 12              |
| Use selection as start                                                                                                        | a neighborhood or path filter step                                                                                                     | replaces the step's start nodes with the selection; runs that read the step go out of date                                                                                                                     | task 12                                                     |
| Filter to selection, Filter out selection                                                                                     | a selection                                                                                                                            | a filter step; Filter to selection makes a working set                                                                                                                                                         | task 6                                                      |
| Create set (Ctrl+G, Figma's Create grammar)                                                                                   | a selection, a rule set, a path, a group                                                                                               | always a fixed set: of the selection, of a rule set's current members, of a path's elements, or of a group's members with its created-from reference                                                           | task 9                                                      |
| Save as rule set                                                                                                              | a filter step, a histogram band, a value (attribute = value), or a Find query                                                          | a rule set whose predicate is that rule and, for a step, whose scope is the steps before it                                                                                                                    | task 9; saved filters                                       |
| Union, Subtract, Intersect, Exclude                                                                                           | two or more sets                                                                                                                       | a new set                                                                                                                                                                                                      | task 9                                                      |
| Add selection, Take out of set                                                                                                | a fixed set and the selection                                                                                                          | adds or takes out members, one undoable step                                                                                                                                                                   | task 9                                                      |
| Add attribute                                                                                                                 | the selection, or a selected item                                                                                                      | an authored value on each, one undoable step                                                                                                                                                                   | task 9 (a triage status), task 5 (a determination)          |
| Collapse, Expand                                                                                                              | a set or a group                                                                                                                       | draws its members as one counted node, or back; filters nothing                                                                                                                                                | task 3                                                      |
| Group by, Use as group names                                                                                                  | a categorical column; a Groups-tab column                                                                                              | a partition with no run; the column's values as its groups' names                                                                                                                                              | task 3                                                      |
| New column (From expression..., Rank, Aggregate over neighbors...)                                                            | a column header                                                                                                                        | a derived column; the neighborhood aggregate as a run                                                                                                                                                          | tasks 2 and 3; the neighborhood questions of task 4         |
| Create path                                                                                                                   | a found path, or a selection of edges that forms a walk                                                                                | a path object                                                                                                                                                                                                  | task 11                                                     |
| Run                                                                                                                           | an algorithm or layout, with a scope and parameters                                                                                    | reuses the result over the same scope and adds a run when parameters changed, otherwise a sibling result; for a query kind, the next query (section 3.2); "Run as new result" in its overflow forces a sibling | tasks 1, 2, 3, 7, 11                                        |
| Carry over to new run                                                                                                         | a result, after a run with changed parameters or Replace data                                                                          | moves every one-to-one matched group name, note, group attribute and style layer in one undoable step; lists the rest                                                                                          | tasks 3 and 12                                              |
| Re-run, Restore, Use current, Cancel                                                                                          | the one state a run or reference is in (section 7.1)                                                                                   | resolves that state: Out of date, Values not kept, Earlier run or Earlier data, a queued or running analysis run                                                                                               | the requirement that every number states its graph; task 12 |
| Stop                                                                                                                          | a running layout                                                                                                                       | ends it and keeps the positions reached, as one undo step                                                                                                                                                      | task 7                                                      |
| Pin, Unpin                                                                                                                    | a node, or every pinned node                                                                                                           | fixes or frees its position, one undoable step                                                                                                                                                                 | task 7                                                      |
| Sweep parameter..., Over time...                                                                                              | a result; Statistics or a numeric histogram, when the data has a time attribute                                                        | one run per parameter value; a series result                                                                                                                                                                   | task 2; tail: watching a graph over time                    |
| Fit power law                                                                                                                 | a numeric histogram                                                                                                                    | the fit written into its caption                                                                                                                                                                               | task 1                                                      |
| Reset, Reset all changes, Clear all                                                                                           | one overridden channel of the selection; all of the selection's overrides; the Overrides row                                           | removes those overrides, one undoable step                                                                                                                                                                     | task 8                                                      |
| Add note                                                                                                                      | a primary object or the graph                                                                                                          | a note about it, citing the current run when written from a result                                                                                                                                             | task 5                                                      |
| Compare with...                                                                                                               | an attribute, run, set, the Statistics of a scope, graph, data version or window                                                       | a transient comparison (section 7.5)                                                                                                                                                                           | task 10                                                     |
| Save comparison                                                                                                               | an open comparison                                                                                                                     | an item of the comparison result for its baseline                                                                                                                                                              | task 10                                                     |
| Save view, Update view, Revert view                                                                                           | the working state, or a view                                                                                                           | a view, or the working state or view brought into agreement                                                                                                                                                    | bookend: export                                             |
| Export                                                                                                                        | the selection, object selection, the graph, a saved comparison, or views as pages; "Export..." opens the dialog over the whole project | section 6.3                                                                                                                                                                                                    | bookend: export                                             |
| Export table, Download project file                                                                                           | a table tab or a Statistics section; the project                                                                                       | a CSV or TSV; a copy of the project file                                                                                                                                                                       | bookend: export                                             |
| Restart viewer                                                                                                                | graphty-element after it fails as a whole                                                                                              | restarts it on the saved project, opening no data                                                                                                                                                              | bookend: load (recovering the work)                         |
| Merge nodes                                                                                                                   | a selection or set of nodes (into a chosen survivor or a new node); a pair-list result or a rule over its pairs ("score > 0.9")        | one undoable data edit; per-attribute conflict resolution is chosen once and written to the record                                                                                                             | tail: merge duplicate nodes                                 |
| Remove                                                                                                                        | a set                                                                                                                                  | one undoable data edit (section 2.2)                                                                                                                                                                           | tail: bulk cleaning                                         |
| Combine graphs..., Bipartite projection..., Quotient graph..., Sample from null model..., Compare with randomized baseline... | graphs, a partition, a result                                                                                                          | a derived graph (section 7.6) or a null-model comparison (section 7.5)                                                                                                                                         | tail                                                        |
| Delete, Undo, Redo                                                                                                            | anything; the history                                                                                                                  | Delete detaches dependents and cascades nothing                                                                                                                                                                | Figma's standard commands, every task                       |

A layout's start from new positions ("Fresh layout", section 5.5) is a parameter of Run, and a
camera is kept by saving a view, which captures it, so neither is a verb.

Duplicate detection is an ordinary pair-list result, so entity resolution reuses pairs, rules, Merge
and the forwarding map and adds nothing.

## 9. Graph conventions

These are fixed once, stated in the (i) text, and recorded in every run's record. None adds a
control unless a run would otherwise be silently wrong. Where NetworkX is the reference, graphty
matches its default.

| Convention                        | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weight roles                      | An edge attribute can be declared a **distance** (a cost; shortest paths, betweenness, closeness), a **similarity** (a similarity score, a co-occurrence count or a tie strength; PageRank, Louvain, Leiden) or a **capacity** (max flow, min cut). Each algorithm states the role it reads. A run may map any attribute to its role, as NetworkX takes `weight=` per call. "Strength" is not a role name, because it means weighted degree and graphty-element's components run already uses it for weak and strong connectivity; the published `WeightMeaning.meaning: "strength"` must become "similarity" (`glossary.md` 11) |
| Which attribute is read           | By default only the **weight attribute** is read: the one the analyst declared, or an attribute named "weight" on import. No other numeric attribute (a `distance_km`, a timestamp) is read unless it is mapped to a role                                                                                                                                                                                                                                                                                                                                                                                                        |
| Unknown role                      | A weight attribute of unknown role is read unweighted by distance algorithms and as a similarity by similarity algorithms, and a variant mark at the result's name says so                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Similarity as distance            | The conversion is part of the similarity's declared role, set once: 1/w, 1 - w for scores in [0, 1], or -log w for probabilities in (0, 1]. It is chosen in the import report, or inline the first time a distance algorithm meets the attribute; every later run uses it and shows it by exception. A zero similarity becomes an infinite distance (no edge), and the record counts those edges. A similarity is never fed to a distance algorithm silently                                                                                                                                                                     |
| Negative weights                  | A distance attribute with negative values is refused by Dijkstra-based algorithms with a typed error, as NetworkX refuses it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Reductions                        | Each weight attribute has a declared reduction for combining edges, overridable per run: sum for counts and capacities, max for bounded similarities (two correlations of 0.8 do not make 1.6), minimum for distances. Merged nodes, merged parallel edges and reciprocal pairs all use it                                                                                                                                                                                                                                                                                                                                       |
| Direction                         | Declared on the graph, overridable per run. An imported per-edge "directed" attribute is kept: read as directed, its undirected edges become reciprocal pairs; read as undirected, directed edges merge with the attribute's reduction; the record counts both                                                                                                                                                                                                                                                                                                                                                                   |
| Parallel edges                    | Kept, or merged into one with the reduction; each algorithm states which it needs, and the record says which was used                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Self-loops                        | Kept or ignored, recorded. Degree counts a self-loop twice. Core number ignores self-loops, as NetworkX refuses graphs that have them                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Degree                            | In-, out- and total degree are separate, and all count parallel edges, as a multigraph degree does; **neighbor count** counts distinct neighbors. **Weighted degree** is the sum of a chosen edge weight over incident edges, split into in and out on a directed graph. By default it reads the similarity-role attribute, else a weight attribute of unknown role read as a similarity; capacity may be chosen, and distance is allowed with a caveat. Details names the attribute and its role                                                                                                                                |
| Density                           | Simple-graph density, m / n(n-1) directed or 2m / n(n-1) undirected, after merging parallel edges and ignoring self-loops, with each count beside it when non-zero. When node types are declared and every edge crosses between two types, Statistics reports **bipartite density**, m / (n1 \* n2), and names it                                                                                                                                                                                                                                                                                                                |
| Clustering                        | **Transitivity** (the global ratio of triangles to connected triples) and **average clustering** (the mean of local coefficients) are reported separately by name, never as "clustering coefficient" alone, because they can differ several-fold on heavy-tailed graphs                                                                                                                                                                                                                                                                                                                                                          |
| Diameter and average path length  | Computed on the largest connected component (weak or strong, as the graph's direction says), and Statistics says so; global efficiency is offered for the whole graph                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Assortativity                     | On a directed graph, states which degrees it pairs, defaulting to NetworkX's (out-degree of the source against in-degree of the target)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Closeness and harmonic centrality | Direction as NetworkX (distances to the node). On a disconnected graph closeness uses NetworkX's default Wasserman-Faust correction, and the record says so; the precondition mark shows on the run control before the run, and its one verb is harmonic centrality (`principles.md` 1). No prompt before the run                                                                                                                                                                                                                                                                                                                |
| Core number on a directed graph   | Total degree, unless the run chooses in or out                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Components on a directed graph    | Weak by default, strong as a second always-available attribute; the kind is always named ("3 weakly connected components")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Normalization                     | Stated on every result; n is the size of the run's scope, or of each item for a list of scopes. "Compare with..." warns when normalized attributes come from scopes of different sizes                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Missing values                    | Excluded from every statistic and counted; a categorical attribute's "(none)" group is excluded from partition statistics, which say so                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Partition levels                  | A hierarchical method such as Louvain exposes its levels; the level read is part of the item address                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Node type and edge type           | Declared roles on categorical attributes, so they read as partitions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## 10. Tail concepts

Each extends a core concept, is reached through the command palette and the object, and adds no
interface until the data or the analyst invokes it.

- **Time.** Time is a declared role on an attribute, with edge time an instant or an interval. A
  time window is a scope: working state, like a filter, never an object. Its published form is a
  rule leaf, so a window can be a filter step or a run's scope; it becomes a set only through Save as
  rule set, which makes an ordinary rule set, exactly as for any other rule. A **series** is a reading whose run's scope is a list of windows; its
  record holds the windowing (window size, step, cumulative or not). Over a metric it writes a
  sequence-valued attribute whose sorting and filtering read a named reduction (last, maximum, trend),
  and each window's values are addressable by run, window and element. Over a graph statistic or
  the counts in Statistics it writes one number per window, read as a line chart: the "time-series of
  key network metrics" that "Network Evolution Analysis" asks for, where spikes and drops are read
  and adjacent windows are matched for new and disappeared elements. Partition groups are matched
  across windows by overlap, with splits and joins reported (section 7.3). While the time slider is open, the
  window in view is a live filter step, edited without undo entries (`information-architecture.md` 8.2). Time-respecting paths are ordinary algorithms whose items are time-ordered paths.
  Nothing about time appears unless the data has a time attribute. This is the owner's key use
  case and a tail task for the average analyst.
- **Collapse.** A set or a group can be shown collapsed (a count badge and meta-edges), and Expand
  shows its members again. It is display state captured by a view; analysis never sees it.
- **Group marks.** A hull and a group name drawn per group, from a style layer that targets groups
  (section 6.1), reading group attributes. It serves "Cluster and Functionally Annotate a Molecular Network" and
  the "Enrichment Map" need for labels on themes rather than nodes.
- **Covers.** Overlapping communities and list-valued categorical attributes share one shape: one
  group per value, an element in several groups (section 3.1).
- **A library across projects.** Definition ids (sets, rules, style layers, layout settings) are
  local to their project; a later library copies definitions in with a link back to their source,
  as Figma's team libraries do. Adding it later breaks no file.

## 11. Out of scope and known limits

- **Ontology authoring, extraction and loading pipelines, serving queries, RDF and OWL
  semantics.** The knowledge-engineer persona is served by the general mechanisms: typed attributes
  read as partitions, Add data by key, merge with forwarding, duplicate detection as a pair list,
  Statistics, export.
- **Numeric vector attributes (embeddings).** No rule, style layer or view can read a vector. Export of
  scalar features (degree, centralities, common neighbors, Jaccard, Adamic-Adar) and of candidate pairs
  covers the ml-engineer-recsys persona's pipeline. The file's tolerant reader lets a vector type be
  added later without a break.
- **Recommender evaluation and deployment** (precision, recall, NDCG, A/B results) belong to the
  analyst's ML pipeline, which graphty feeds through export.
- **Functional enrichment services and gene-set files.** Reachable only as an ordinary registered
  algorithm. The general mechanism is export membership by group, then join the external per-group
  table back onto the groups by group key (section 3.3). Group statistics over attributes already on
  the nodes are the built-in profile.
- **Publishing to external network repositories** (NDEx, a DOI). Served by exporting the file
  formats with the project metadata.
- **A node-by-node matrix display.** It is not a view mode. The edge table and the table of
  edges between groups (a block matrix over any partition) cover reading it, and export writes the
  edge list for tools that draw matrices.
- **Map basemaps.** A layout may read longitude and latitude (section 5.5); drawing a map beneath
  the graph is not in the core.
- **Reuse of an analysis across a different schema.** Same-schema reuse is Replace data (section
  7.3); cross-schema reuse waits for the library.
- **Branching history.** Undo is linear; comparing alternatives is served by results and runs that
  coexist.

## 12. Departures from Figma

Everything not listed there follows Figma, and each "follows Figma" sentence above cites where. The
departures themselves are listed once, each with the principle or rule that forces it and its
evidence, in the departures table of `principles.md`.

## 13. One-way doors for the owner

This is the model's summary of the owner's open decisions; `one-way-doors.md` gives each one with
its options, reason and dependents, and adds the file's container and extension. A one-way door here fixes a published name or shape that consumers or
saved files will depend on and that the file's version number and tolerant reader cannot absorb. Everything else in this
document is decided. None of these adds interface; each has a recommendation, and the model above
is written on it. The detail behind each row is in `element-contract.md`.

| Decision                                    | Recommendation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The project's shape                         | a project object in `./session` holding graph entries by graph id, one undo history, an append-only operation log, a metadata block and a consumer-set author; a bare session gets an implicit one-graph project, and `<graphty-element>` exposes `element.project` beside `element.session` (contract 1)                                                                                                                                                                                                                                                                                                   |
| The file's container and extension          | a zip archive, `.graphty`, holding a JSON manifest, JSON session parts and binary graph parts in graph-format's typed-column form (`one-way-doors.md` 1)                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| The file's top level                        | per graph entry, a graph part and a session part, a version number and a tolerant reader (contract 11)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Edge identity                               | the imported edge id; else ends and key, where the key is the file's key field or else the edge's position among every edge of its pair in the load that ingested it, with that pair's count in the load; ids minted in a reserved namespace for edges added in the session; the source in the key after Add data; the session counter never written; Combine's output identified by ends (contract 2)                                                                                                                                                                                                      |
| Node identity across node types             | **Open for the owner.** Recommended: once endpoint columns declare different node types, a node's identity is its type plus its id, so user "123" and item "123" stay two nodes, and the import report counts the ids that occur under more than one type; with no declared types, the id alone. Changing it later re-keys saved projects (contract 2; `information-architecture.md` 14)                                                                                                                                                                                                                    |
| Result id and run id                        | a result id is a name minted at the first run and never recomputed: from the algorithm, whether it is exact or sampled, the frozen scope and the source nodes for a reading kind, from the algorithm alone for a query kind, whose scope is recorded per query; each kind publishes whether it accumulates one current run or all runs; a run id per execution. This changes "same definition, same id" to "same algorithm and scope, same id", and no consumer has saved a derived id yet (contract 3)                                                                                                     |
| The item address                            | graph, result, run, level and item key, or graph, attribute path (with its scope) and value; freshness never stored (contract 4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| The record                                  | one shape for every operation, including the engine and adapter class; determinism declared in the catalogue; an append-only log in the file (contract 5)                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| The frozen graph reference                  | graph, data version, scope definition (named sets by id and revision) and a digest over nodes and edges with the reading (contract 6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| The set grammar                             | one set definition of three kinds (fixed, rule, path) with a stored edge reading (induced, listed, or clipped for rules) and an optional rule scope, reached everywhere through the published `Scope` reference, which keeps `{ set: SetId }` and gains `{ define }`; scope forms include the search graph and a list of scopes; what a reference to a deleted set resolves to (contract 7, 9; `one-way-doors.md` 11, 18)                                                                                                                                                                                   |
| The expression language                     | JMESPath kept for paths and plain predicates; relative thresholds, element references and arithmetic as structured JSON forms in `./schema`; neighborhood aggregates are runs (contract 9)                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Always-available metrics as published paths | one live root, `graph.<metric>`; a binding binds a run; a path root other than `data` and `results` refused now, so `graph` arrives later without breaking anything, and `runs` reserved as a field (contract 9)                                                                                                                                                                                                                                                                                                                                                                                            |
| The default scope of a layout               | the whole graph in graphty-element 2.x; the filtered graph in the major version that ships a placement rule for static layouts and incremental placement (`one-way-doors.md` 17)                                                                                                                                                                                                                                                                                                                                                                                                                            |
| The opening view mode on a desktop          | graphty-element's published default changes from 3D to 2D on a flat screen, keeping 3D a click away on the view-mode button; on a flat screen 2D is faster for cluster finding with no accuracy loss against perspective 3D, and perspective damages reading sizes and labels (Greffard et al.; Munzner; `research/graph-analysis.md` 6.9). A default of the element, not of the app, so every consumer gets it; changing it changes published behavior                                                                                                                                                     |
| Who owns style layers and rule sets         | **Open for the owner.** Recommended: the project owns the style layer definitions, as Figma's local styles belong to the file, and each graph entry holds an ordered stack of references to them, so one encoding serves several graphs and both sides of a comparison; sets, rule sets among them, stay with their graph, because a fixed set's members and a rule's result paths name one graph ("Copy to graph..." copies one). The model above is written per graph until this is decided; the fallback for style layers is "Copy to graph..." (`one-way-doors.md` 5; `information-architecture.md` 14) |
| Published-name changes                      | listed item by item only in `glossary.md` 17, the one authority for published names, including the date of the major version that removes the old names                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

**Decided, and reversible by a file version or an additive change.** These are written into the
model and need no decision from the owner; each line says why undoing it is cheap.

| Decision                                                   | Choice                                                                                                                                                                                                                     | Why it is reversible                                                                                                                                                                              |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Retention                                                  | records forever; values while something holds them; restore only under the recorded version and engine (contract 8)                                                                                                        | keeping more values later is additive; the records, which cannot be regenerated, are already kept forever                                                                                         |
| Stored result precision                                    | float32 for metric attributes and stored positions (contract 11)                                                                                                                                                           | a wider type is a new file version the tolerant reader accepts                                                                                                                                    |
| Freshness                                                  | the five values (current, out of date, cannot re-run, detached, cannot evaluate) plus the fields for a different scope, data version, values kept and earlier run (contract 7)                                             | freshness is derived on read and never stored, so changing it rewrites no file                                                                                                                    |
| Default scope of a run                                     | readings and transforms: the filtered graph, frozen at start; Select neighbors, find, unscoped neighborhood rules and paths between named endpoints: the search graph                                                      | every run records the scope it used, so a new default changes only future runs. A layout has no record in graphty-element 2.x, so its default is a door (`one-way-doors.md` 17)                   |
| What Union, Subtract, Intersect and Exclude make on screen | a rule set naming its operands; Create set on it freezes it (section 2.4)                                                                                                                                                  | the published `combine` keeps its fixed result, and the live form is an optional member, so the screen can switch either way                                                                      |
| The screen word for the third edge reading                 | "Edges: clipped" (`glossary.md` 4)                                                                                                                                                                                         | a screen word is an edit                                                                                                                                                                          |
| Weight roles and reductions                                | distance, similarity, capacity per attribute, with a declared conversion and a per-attribute reduction; only the weight attribute read by default                                                                          | a new role or reduction is additive, and the role in force is recorded on every run                                                                                                               |
| Note targets                                               | primary objects, groups and other items of elements, and the graph; citations of runs and of the filter steps in force; author and times                                                                                   | widening the targets later is additive                                                                                                                                                            |
| The camera in a view                                       | a Node-safe type exported from `./session` or `./schema` (contract 11)                                                                                                                                                     | a new camera field is additive under the tolerant reader                                                                                                                                          |
| Comparison                                                 | an element object, `project.compare(a, b, { match })`, transient; only a saved comparison is in the file (contract 1)                                                                                                      | nothing transient is saved, and the saved comparison uses the one record shape already listed above                                                                                               |
| Where the autosave keeps the project                       | graphty-element keeps it in the browser's storage for the site and asks the browser to make that storage persistent; the chevron menu and Ctrl+S say when a copy was last downloaded (`information-architecture.md` 2, 14) | the file's shape does not depend on where it is kept, so a file-system or server location is additive; the interim cost, work lost when site data is cleared, is covered by Download project file |

## 14. Passages this model supersedes

Where these disagree with the model, the model wins:

- `research/key-insights.md` 1.5 (earlier runs reachable by undo), 1.7 (a path as an unordered
  set; a path is an ordered set, section 2.5), 1.9
  (filters combined by AND, not ordered), 1.12 (notes may target metrics, views and the project),
  1.16 (the whole full graph as the default scope), 1.17 (degree at rest only over the loaded
  graph), 1.19 (positions as two slots a view points at), 1.21 (cost or strength), 4.5 (the
  project's metrics listed in the catalogue panel), 4.11 (notes and views inside the tree of
  analysis results), and section 7, whose departures from Figma are replaced by the departures table in `principles.md`.

Where the list of results lives is left to the IA. Figma's precedent for a definition applied from
property rows is either the nothing-selected inspector (local styles) or a table reached from the
rail (the Variables view) (`research/figma.md` lines 195 and 305); the catalogue lists what can be
run, not what has been run. The graph's Statistics do not compete for that place, because it lives
under the selected graph.

## Sources

- `design/ui/framework/glossary.md`, `design/ui/framework/top-tasks.md`,
  `design/ui/framework/element-contract.md`
- `design/ui/framework/research/key-insights.md`, sections 1 to 9
- `design/ui/framework/research/figma.md`, 2.4, 4.3, 4.4, the practitioner's rules (follow-up on
  reading existing objects), and the tables at lines 195, 305, 497, 830, 1046 and 1052
- `design/ui/figma/right-sidebar-selection/README.md`, line 274 (Tidy up); `design/ui/figma/flows.md`
  (Control+G group, Control+Alt+K create component)
- `design/ui/framework/research/graphty-today.md`, 1.5, 7.14, 7.18
- `design/ui/framework/research/graph-tools.md`, 15, 20.31
- `design/ui/framework/research/graph-analysis.md`, 1.8, 1.9
- `design/ui/framework/research/design-method.md`, 1
- `design/designloom/personas/*.yaml` and `design/designloom/workflows/*.yaml`
- `CLAUDE.md` (root), "Architectural Principles", "Graph Styling", "Algorithm Styles"
