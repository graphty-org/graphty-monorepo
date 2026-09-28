# Key insights for the graphty design framework

The graphty design framework is four documents: the **ontology** (what things exist, what can
be done to them, how they relate), the **vocabulary** (the one name each thing goes by), the
**design principles** (the ranked rules that settle arguments) and the **information
architecture** (where every capability lives in the app). This note collects the insights from
the research that should shape those four documents. Each insight states what was found, the
evidence behind it, and which document it bears on. Section 6 lists what Figma has already
solved and graphty should copy as it is.

Two packages are named throughout. **graphty-element** is the standalone web component that
owns every graph capability: data, style layers, algorithms, layout, selection, the tree of
analysis results and the project file. The **graphty app** is only presentation around it. A
recommendation that puts graph logic in the app is wrong by the repository's architectural
principles (`CLAUDE.md`, "Architectural Principles").

The evidence comes from five research notes in this folder:

- `figma.md` -- Figma's principles, object model, vocabulary and surfaces, measured and read
  from Figma's own documentation.
- `graph-analysis.md` -- the task taxonomies and analysis-process literature (Lee et al., Saket
  et al., Brehmer and Munzner, Shneiderman, van Ham and Perer, Heer and Shneiderman, Pirolli and
  Card, Ragan et al., Ahn et al.) and what the workflows ask of sets, measures, notes and runs.
- `graph-tools.md` -- how Cytoscape, Gephi, Gephi Lite, Neo4j Bloom, yEd, Kumu, Linkurious,
  KeyLines, NetworkX, igraph and others model the same concepts.
- `design-method.md` -- the methods for building each document (Johnson and Henderson's
  conceptual model, Jackson's concept design, ANSI/NISO Z39.19, Cooper, McGovern's top tasks,
  Dan Brown's IA principles) and a ranking of top tasks coded from the 25 workflows.
- `graphty-today.md` -- what graphty-element 2.3.1 publishes and actually does, what the app
  adds, and the state of the personas, workflows and capabilities.

Workflows are cited by their titles from `design/designloom/workflows/`.

`../conceptual-model.md` settles the ontology. Where it disagrees with this note it wins, and it
supersedes 1.5 (earlier runs reachable by undo), 1.7 (a path as a set), 1.9 (filters combined
by AND), 1.12 (note targets), 1.16 (the whole loaded graph as default scope), 1.17 (degree at rest
over the loaded graph only), 1.19 (positions as two slots a view points at), 1.21 (cost or
strength), 4.5 (measures in the catalogue panel), 4.11 (notes and views in the tree of analysis
results) and section 7 (departures from Figma, now in the model's own departure table).

---

## 1. Ontology

### 1.1 A primary object is a graph object whose body on the canvas is its members

Figma's test for a primary object is "can you draw a selection box around it on the canvas?":
a primary object has a body, a row in the layer tree, a selection box and an inspector;
everything else is secondary (`figma.md` 2.4). Adapted to graphs, the body of a set is its
members. Under that test node, edge, and any named collection of nodes and edges (a kept set,
a path, one community of a partition, a connected component) are primary. A measure such as
PageRank fails: it has no body, only a value on every node. A partition as a whole fails; each
of its groups passes. A note, a view and a style layer fail.

A second test from the design-method literature, "the analyst's question is about it"
(`design-method.md` 1, item 3), would admit measures and the degree distribution as primary.
The selection-box test is the one to adopt, because it agrees with the unanimous tool practice
that a per-element result is a column (`graph-tools.md` 17, item 3) and with Lee et al.'s object
list of element, path, set and whole graph (`graph-analysis.md` 7, item 1). The question test
still has a job: it decides which secondary objects have a record worth inspecting (1.4).

- Bears on: ontology.

### 1.2 The primary set is four kinds: graph, node, edge, set

Once measures become attributes, every question family in the analysis literature is about one
of four things: the whole graph, one element (node or edge), a path, or a set
(`graph-analysis.md` 2.1 to 2.9 and 7, item 1). A path, a connected component, a community and a
hand-picked collection are all sets with different definitions. The whole graph is the set that
contains everything. This is the smallest object set that covers the questions, and it matches
the owner's decision that sets share one vocabulary across the published session contract.

The practical payoff is one inspector template. The inspector for the whole graph, a kept set,
a community, a component and the currently visible graph are the same sections in the same
order; a proper subset adds a Boundary section (cut edges, conductance, outside neighbours) and a
comparison with its parent (`graph-analysis.md` 6.1 and 7, item 8). Saket et al.'s group-level
tasks (size, internal density, extremes, neighbours) are that template's content.

- Bears on: ontology, information architecture.

### 1.3 Secondary objects fall into two families that must not be filed together

The tools treat everything that is not node, edge or network as secondary (`graph-tools.md` 17,
item 1). But "secondary" hides two different families:

- **Derived results**: the record of a measure or a partition (its algorithm, parameters, scope,
  caveats, graph-level score such as modularity, its history of tuning). It is derived from the
  graph and has no body, yet analysts name it, compare it, cite it, cut sets from it and write
  notes about it (`graph-analysis.md` 6.25).
- **Commentary and presentation**: notes, saved views, style layers. They annotate, present or
  paint graph objects and are never compared as analysis.

Filing a measure as a note-like annotation hides the record analysts cite; filing it as a
primary object puts a column beside nodes. The closest Figma shape for a derived result is a
Variable: a named definition with its own list, applied from property rows ("Colour: PageRank"),
never a layer (`figma.md` 2.4 rule 2, 2.5).

- Bears on: ontology, information architecture.

### 1.4 A result is both a column and a small object; the run is its provenance

The research first appeared to split on whether a result is an object. It is both, at different
levels, and graphty-element already sorts it that way. Its published result shapes group
results as measures (`node-metric`, `edge-metric`), partitions (`community`,
`layered-grouping`, `category-table`), subsets (`path`, `node-set`, `edge-set`) and tables or
facts (`pair-list`, `temporal`, `fact`) (`graphty-today.md` 6, item 2). igraph's
`VertexClustering` is the precedent: a membership column plus an object holding the quality score
and parameters (`graph-tools.md` 15 and 18, item 6).

So the ontology states: the values live on the elements as attributes, read by the table,
filters and style layers like everyone's columns; the **measure** (or **partition**) is one
object per result the reader keeps, holding the graph-level numbers and provenance; the **run**
is one execution of it, a version inside the measure. Adopting these four result kinds costs no
rename.

- Bears on: ontology, vocabulary.

### 1.5 The measure needs an identity above the run

A run's id in graphty-element is derived from its definition: changing a parameter, the seed or
the scope makes a different run with a different id, and the old run stays (`graphty-today.md`
6, item 11). Every tool with live parameters revises the result in place, and everything that
reads it follows; every tool that overwrites a column also tells users to rename it first to
keep the old values, which shows users build named measures by hand (`graph-tools.md` 20.2,
20.28; `graph-analysis.md` 6.13, 6.25). Seven verbs the workflows apply to a measure (paint with
it, cut a set by rule, table column, export column, note, cite, compare with a previous version)
must keep pointing at the same measure through a tuning re-run.

The rule the research converges on: tuning revises the measure in place (the earlier run is a
step in the history, reachable by undo); "Run as new" with a name keeps both; a partition whose
groups the reader has labelled, noted or kept is not revised in place -- a re-run lands beside
it (`graph-analysis.md` 6.28). Style layers, rules and notes reference the measure, not the run
(`graph-analysis.md` 6.29). This needs an element operation that rebinds a stable id to a new
definition atomically; today an author-assigned id can be rebound only by remove-then-start,
which destroys the old result (`graphty-today.md` 7.22).

- Bears on: ontology, vocabulary (the measure id is a published name).

### 1.6 A set has one attribute that carries two behaviours: fixed or rule

Every tool that handles subsets well separates a set picked by hand from a set defined by a rule
(KeyLines `combine()` against `parentId`, Linkurious selection against rule; `graph-tools.md`
18, item 3). Figma has the same split: a frame's bounds are set explicitly, a group's bounds
follow its children (`figma.md` 5.2). Lee et al. separate a user-defined group from a
topological cluster (`graph-analysis.md` 1.1).

So a set has a **definition**: a member list (fixed) or a rule (a query, which follows the
data). Where a set came from (a hand selection, a run's group, a path search, an intersection of
two top-10 lists) is its **origin**, a reference, and a set can have several origins
(`design-method.md` 3.7). One word covering two behaviours without naming them is Jackson's
overloading flaw (`design-method.md` 1, item 2), so the ontology must name both.

What Keep stores follows from this:

- Keep on a hand selection stores the members by id.
- Keep on a query stores the rule.
- Keep on a community or a path stores a **fixed** member list plus its origin, because group
  numbers are not identities across re-runs and "community 3 is the ring" is evidence
  (`graph-analysis.md` 6.2, 6.28; `graph-tools.md` 20.17; `graphty-today.md` 7.19). The rule
  form proposed in `figma.md` 5.5 (Keep row) would silently change which members a note means
  after a re-run, and Figma's own evidence -- nothing Figma keeps stores a rule -- points the
  other way.

- Bears on: ontology.

### 1.7 A path is a set whose definition is an ordered sequence of edges

No end-user graph tool has a saved, named path object (`graph-tools.md` 18, item 7); graphty is
inventing it, because the owner has decided that path highlights stack as edge style layers.
The research first split on whether a path is a set or its own kind. The resolution is a set
whose definition is an ordered edge sequence, with the node order derived from it: only the
edge taken tells parallel edges apart, and a walk can repeat elements (`graph-tools.md` 20.16 and
21, item 17). The element's present per-node `order` field cannot express either
(`graph-tools.md` 20.16). A family of paths (k shortest, all shortest) is one result holding a
list of paths, each addressable (`graph-analysis.md` 7, item 18).

This keeps one set inspector (members, length, cost, Boundary) with one extra section, the
ordered steps. Two element facts make it urgent: today's shortest-path run marks every parallel
edge between two route nodes and always treats the graph as undirected (`graph-tools.md`
20.16), and no built-in algorithm returns more than one path (`graphty-today.md` 7.19).

- Bears on: ontology, vocabulary.

### 1.8 A community is addressable without Keep; Keep is for what must outlive its partition

At the design target, one Louvain run returns hundreds of communities (`graphty-today.md` 7.18),
so a community cannot be an automatic row or an id of its own. Every tool models the partition
as one result with a column, and a community as a value of that column (`graph-tools.md` 17,
item 11). But the community workflows inspect many groups before keeping a few, label about 15
of them, and run measures within every group at once ("Community Analysis"; "Cluster and
Functionally Annotate a Molecular Network"); forcing Keep for each would fill the left panel
with 15 sets per clustering (`graph-analysis.md` 6.26).

The general pattern, stated once for every result that produces many members: the result is one
record; its groups (communities, paths of a family) are rows of a sortable table reached from
its inspector; each group is addressable by "result plus group value" as a selection target,
note target, style-selector arm, inspector and "within each group" scope; group labels belong to
the partition; Keep promotes one group into a set when it must outlive the partition
(`graph-analysis.md` 6.8, 6.26; `design-method.md` 3.7). The address and the labels map are
project-file format.

- Bears on: ontology, information architecture.

### 1.9 Filter is not an object; it is a verb on a set plus one visibility state

Every tool treats a query and what it does with its matches as separate choices: select, hide,
dim or style (`graph-tools.md` 17, item 8; Gephi's Filter and Select buttons on one query). A
saved filter is a rule set whose outcome is "hide" (`graph-analysis.md` 6.18). So the four
grammars graphty-element publishes for "which elements" (`Scope`, `Selector`,
`SelectionTarget`, `Filter`; `graphty-today.md` 1.7), which differ mainly in outcome, collapse
into one set specification plus outcome verbs: select, hide others, dim others, style, scope a
run, export, keep. That is the concrete shape of the owner's one set vocabulary.

The live visibility state is one working state of the session: named rules combined by AND, each
switchable, not an ordered stack (`graph-tools.md` 20.13). "Dim others" is a style layer the
reader adds, not a filter outcome, because dimming what an algorithm did not select is the
reader's choice (`CLAUDE.md`, "Algorithm Styles") and the element's visibility mask only hides
(`graphty-today.md` 7.13).

- Bears on: ontology, vocabulary, information architecture.

### 1.10 Selection is transient state; a set selected as an object is not truncated

Selection is transient in every tool (`graph-tools.md` 17, item 7). The element caps the
selection at 5,000 elements and truncates silently; `selection.promote(name)` saves the truncated
ids and drops edges (`graphty-today.md` 7.18). Rule-made sets routinely exceed the cap at the
design target (`graph-analysis.md` 6.3).

Figma's container mechanics solve this (`figma.md` 4.6): clicking a set's row selects the set
as an object; every command (colour, hide, run within, export, keep) targets the set itself and
is never truncated; only Enter ("Select members") produces an element selection and is subject to
the cap, saying so when it truncates. The catch is that the element's selection holds only nodes
and edges (`graphty-today.md` 7.20). Whether an object selection is presentation state the app
may hold, or shared state the element must publish (because a headset or an assistant must see
it), is open.

- Bears on: ontology, information architecture.

### 1.11 A collapsed group is a display of a set, not an object

The one workflow that asks for collapse ("Enrichment Map - Pathway Similarity Network") collapses
named communities for a summary figure and needs them expandable. Cytoscape's model-level
collapse changes every degree and path while collapsed; the tool built for that workflow
(AutoAnnotate) treats collapse as transient display state that cannot be saved
(`graph-tools.md` 20.25). So a set or community can be shown collapsed (a count badge and
meta-edges, expandable in place); the state is working display state captured by a view;
analysis never sees it.

- Bears on: ontology, vocabulary.

### 1.12 Notes are anchored to objects, store their own copy, and have no canvas position

The tools split notes into notes about an element and marks on the picture (`graph-tools.md` 18,
item 8), and the industry's canvas annotations sit on a view layer (`graph-tools.md` 17, item
13). Heer and Shneiderman require data-aware annotation that survives a change of view
(`graph-analysis.md` 1.7). graphty's positions are computed by force layouts and a 3D camera, so
a note pinned to a screen or graph coordinate drifts at the next relayout. Figma's Dev Mode
annotation, stored on the node, is the paved-path precedent (`figma.md` 2.1, 5.2).

The ontology rule: a note is free text plus one or more targets of any kind (node, edge, set,
community address, measure, view, the project); it stores the ids and labels of its targets as
they were when written, so it outlives them and can be re-anchored (`graph-analysis.md` 6.7;
`figma.md` 5.5). Text placed on an exported picture is part of a view or an export, not a note.
Classifications ("error, threat or discovery") and group names are attribute edits on the
elements or the group, not notes (`design-method.md` 6.6). Note content is element state and a
member of the project file (`graphty-today.md` 7.28).

- Bears on: ontology, information architecture.

### 1.13 Only three relationships are containment; everything else is a reference

Tested against the workflows, a relationship is containment only when the child has one parent,
cannot exist without it, and loses nothing when the parent goes. Three pass: a history step
follows a step, a measure holds its runs, a partition holds its groups. "Computed within a set",
"kept from a run", "a note about", "a view showing" and "a layer painting from" all fail,
because each is many-to-many or must survive deletion (`design-method.md` 3.7).

Consequences: the list of kept objects is grouped by kind, not a tree nested by scope, which is
also what every tool does (`graph-tools.md` 20.14); references appear as property rows on the
referring object ("Computed within: Largest component") with a "Used by" section on the target
(Figma's forward and reverse relationships, `figma.md` 2.6); deleting a referenced object never
deletes what refers to it -- the dependent keeps its last values and says what it lost
(`figma.md` 2.7, 5.5). Gephi removed hierarchical graphs in 0.9, so analysts should not be
assumed to expect nesting (`graph-tools.md` 18, item 3).

- Bears on: ontology, information architecture.

### 1.14 Liveness is decided by the kind of derived object, not by runtime cost

Every reactive tool (Excel, marimo, Observable, Pluto) follows the data by default and offers a
hold for expensive work; Jupyter, which does neither, is the standard example of results that
look current and are not. For graphs, following also does harm when a result is unstable under
small edits (modularity has exponentially many disagreeing near-optimal partitions) or is a
layout (`design-method.md` 3.6). Deciding by runtime cost would make the same betweenness run
follow on a small graph and hold on a large one, which no reader can predict.

The rule: counts, density, degree, component membership, rule sets and style layers follow;
all-pairs and iterative centrality, community detection, paths and layouts hold and are marked
out of date where their values are read. Fixed sets and notes never go out of date; they can only
have missing members.

Two element facts make the rule untrue today: staleness is a digest of node and edge ids only,
so a weight or attribute edit leaves a weighted betweenness run looking current; and a filter
change flags runs stale that never read the filter (`graphty-today.md` 7.1, 7.27). A result is
out of date exactly when something it read changed: membership, a column it read, the declared
weight meaning, direction treatment (`graph-analysis.md` 6.15).

- Bears on: ontology, principles, vocabulary (the state names).

### 1.15 Run status and freshness are two fields, not one list of states

A run has a lifecycle (queued, running, succeeded, failed, canceled: the published
`RUN_STATUSES`) and, separately, a freshness relative to its inputs (current, out of date, cannot
update). A single list of five states (`design-method.md` 3.6) cannot express a failed run that
is also out of date, or a recomputing run whose previous value is stale. Keeping them as two
fields is additive to the published contract.

- Bears on: ontology, vocabulary.

### 1.16 An unscoped run computes over the whole loaded graph; the visible graph is a named scope

Gephi scopes silently to the filtered graph and its own issue tracker documents the harm: a
column mixing values from two different filtered graphs (issue 636), and a colour scale that
moved with the filter until Gephi switched the default to global (issue 541) (`graph-tools.md`
20.31; `graph-analysis.md` 6.14). Code-first libraries and Cytoscape never scope implicitly.
graphty-element already computes every run over the whole loaded graph -- it only records the
word "visible" (`graphty-today.md` 6, item 10). So choosing "whole loaded graph" corrects a label,
while choosing "visible" would change every algorithm's behaviour.

The rule: unqualified, "the graph" means the whole loaded graph for statistics, runs and
encoding scales; "the visible graph", a set, "within each group" of a partition and a time window
are named scopes; the scope a value was computed on is shown wherever the value is read; while a
filter is active, the graph's counts read "1,204 of 50,000". A time window is visibility like a
filter, and measures over time are a result kind of their own, a **series** with a value per
window (`graph-analysis.md` 6.31; `graph-tools.md` 20.30).

- Bears on: ontology, principles, information architecture.

### 1.17 Degree, component membership and the degree distribution are graph attributes, not runs

The owner names understanding the whole graph (counts, degree distribution, density,
components) as a key task. Today the element's `data.statistics()` has counts, density, degree
range and components, but a degree histogram needs a `degree` run (`graphty-today.md` 6, item
7). Showing it at rest would start a run nobody asked for, add a row to the run list and break
Figma's rule that the app never acts unasked (`figma.md` 1.2, 5.1).

NetworkX treats degree as an always-current view of the graph, and Gephi's own appearance and
filter code reads degree and the giant component from the graph store without a run
(`graph-tools.md` 20.29). So plain degree, in- and out-degree, weighted degree over the declared
weight, and component membership with its size are attributes at rest in graphty-element, with
no run record; the histogram is drawn from them. Weighted degree over another attribute, and
degree within a scope, stay runs because they carry a choice.

- Bears on: ontology, principles, information architecture.

### 1.18 A project holds a list of graphs; a working network made from one graph is a set

Every subset-derived "working network" in the workflows (the largest component, a disease
module, a sub-map, a removal scenario) is read, measured, laid out and exported, never edited
apart from its source, so a kept set used as scope and filter covers it. Only "Condition
Comparison - Disease vs Control Networks" needs more than one graph: two independently loaded
conditions and a merged third (`graph-analysis.md` 6.33). Turning one graph into a list after the
file ships is a breaking change, so the file's top level is a list of graphs from the start, with
a separate comparison object (`graph-tools.md` 20.24). A graph switcher appears only when the
list holds more than one.

- Bears on: ontology, information architecture.

### 1.19 Positions are a graph property with a 2D and a 3D slot; layout is not a measure

No workflow asks to keep several named arrangements of one graph; the one real second
arrangement is the element's own 2D and 3D drawings. Every end-user tool gives layout a home
separate from statistics, and none shows which layout produced the positions on screen
(`graph-tools.md` 20.27). So positions are a property of the graph with two slots, each
recording what produced it ("ForceAtlas2, 3D, 12 nodes moved by hand"), and a saved view records
which slot it uses.

- Bears on: ontology, information architecture.

### 1.20 A saved view is a named snapshot of one working state

Filters, the visibility of style layers, collapse, camera and view mode are one working state of
the session (`graph-tools.md` 20.26), and the element design already refuses per-view filters or
layers: two pictures that must differ are two sessions over shared data (`graphty-today.md`
7.21). A saved view is a named snapshot of that state; applying it replaces the working state as
an undoable step; later edits mark it "changed since applied" with Update and Revert (Kumu's
safety without Linkurious's draft copies). An export references a view. "View" is overloaded four
ways in the published API (renderer, view mode, camera view, camera preset;
`graphty-today.md` 6, item 6), so the other three need other words.

- Bears on: ontology, vocabulary.

### 1.21 Node type, edge type, weight meaning and direction are declared data roles

Ten of the 25 workflows need node or edge type (filter by type, typed traversal, per-type style,
bipartite projection), and formats that carry type declare it once (`graph-analysis.md` 6.30).
Whether a weight is a cost or a strength is a fact about the data, and the correct reduction of
parallel edges depends on it: summed for strength, minimum for cost (`graph-analysis.md` 6.6,
6.32; `graph-tools.md` 20.18). graphty-element has no type role, sums parallel costs, loses
PageRank multiplicity, and disagrees with itself on degree (`graphty-today.md` 7.3;
`graph-analysis.md` 6.32). These roles are declared once on the graph, overridable per run, and
recorded in each run's caveats.

- Bears on: ontology, information architecture (property rows of the graph inspector).

---

## 2. Vocabulary

### 2.1 Keep the trade's terms; friendly substitutes are sometimes wrong, not only unfriendly

The owner has ruled out friendly substitutes. The research adds that some of graphty-element's
published plain names teach the wrong concept. "Bridges" for betweenness is wrong: a bridge is a
cut edge, and a high-betweenness node is neither a bridge nor an edge. "Weakest link" for minimum
cut and "Separate pieces" for components have the same problem (`graphty-today.md` 1.9;
`graph-analysis.md` 3.2). The element's reading sentences interpret through the same names ("has
the highest bridging") and the app goes further ("Main bridge") (`graph-analysis.md` 6.23). The
fix is in the element's catalogue data, a content change rather than a breaking rename
(`graphty-today.md` 6, item 4): a reading uses the technical term and gives the number its scale;
the (i) text defines what is computed.

Use unchanged: node, edge, attribute, degree, in-degree, out-degree, weighted degree,
betweenness, closeness, PageRank, eigenvector, connected component, community, partition,
modularity, density, clustering coefficient, diameter, average path length, assortativity,
k-core, neighbourhood, filter, statistics, view, project (`graph-analysis.md` 7, item 3;
`graph-tools.md` 19). Where two standard names exist, prefer the one Gephi and Cytoscape show.

- Bears on: vocabulary, principles.

### 2.2 Community, component, cluster and group are four different things

Connected component: a unique, deterministic topological fact. Community: one of many
near-optimal outputs of community detection. Cluster: the output of a clustering method, a
term that will ship because the algorithms package has MCL, spectral and hierarchical
clustering. Group: taken (2.3). **Partition** names the whole result; **cover** the overlapping
case (`graph-analysis.md` 7, item 2; `graph-tools.md` 19).

graphty-element publishes the same `community` result shape, with a per-node field named
`group`, for connected components as for Louvain and Leiden (`graphty-today.md` 7.4, 7.24), so
its contract already merges a structural fact with a heuristic output. A shape named for the
structure (partition) rather than one algorithm family would fix that; renaming a published shape
value is a one-way door. The community shape also gives each node exactly one group, so an
overlapping result cannot be expressed; a cover must be added beside the `group` field, never by
changing it (`graph-tools.md` 21, item 6).

On a directed graph, `components` and `statistics().components` are weakly connected by default
and nothing in the field names says so; an at-rest count must name its kind ("3 weakly connected
components") (`graphty-today.md` 7.24).

- Bears on: vocabulary, ontology.

### 2.3 The word for a kept subset is "set"; "group" is not a graphty object word

"Group" already has three meanings in this product: graphty-element's published per-node
community field, Cytoscape's collapsible metanode (and yEd's, Linkurious's), and Figma's layer
container (`graph-tools.md` 20.15, 20.25). Lee et al.'s "group" was the literature's
candidate, and it is withdrawn for that reason (`graph-analysis.md` 7, item 16). "Subgraph" is
the analysts' word for a computed, induced subset and stays reserved for that meaning.
"Collection" is taken by Cytoscape twice. So the kept, user-defined subset is a **set** in the
UI, the config and the project file, and the exported TypeScript type must not be named `Set`
(`graph-tools.md` 21, item 16).

graphty-element today publishes `Scope`, `ScopeId`, `SavedScope` and `{ set: ScopeId }`. Adopting
"set" is either a breaking rename of Scope or an additive type beside it that leaves two
published words for one concept (`design-method.md` 4.4). Only the element's major-version plan
can settle that.

- Bears on: vocabulary.

### 2.4 The biggest collision risk is Figma's own words

Figma is the paved path for the chrome, and several of its core words mean something else in
graph analysis (`design-method.md` 1, item 5):

| Figma word | Figma meaning | Graph meaning or conflict | Consequence |
|---|---|---|---|
| Layers | the left tree of drawn objects | graphty's style layers (paint rules) | the left panel cannot be called Layers; the style-layer list borrows Figma's stacked Fill list, not its layer tree |
| Components | reusable design elements (the Assets panel) | connected components | no rail button or panel may be called Components or Assets |
| Group | a layer container | community field, collapsible node | not a graphty object word |
| Frame | explicit-bounds container | none | an analogy only (fixed set), never a label |
| Instance, Variable, Mode | reuse and theming | none, or view mode | avoid |
| Selection | the current selection | same | keep |
| Union, Subtract, Intersect, Exclude | boolean shape operations | set operations | adopt for combining sets (2.6) |

Where a Figma word collides with a standard graph term, the graph meaning wins. The vocabulary
document needs this collision table, plus the graph-internal collisions: "bridge" (2.1),
"group" (2.3), "view" (1.20), and "neighbourhood", which is both a set definition (k-hop of X)
and a verb ("Select neighbors").

- Bears on: vocabulary, information architecture (place names).

### 2.5 One spelling, taken from the published names

The research notes write "neighbour", while graphty-element publishes `neighborsOf`, the filter
kind `neighborhood` and American capability ids, and its source splits 43 British to 49 American
(`graphty-today.md` 5.1). Published names cannot change spelling without a break, so the UI and
documentation should follow the published American spelling ("neighbor", "neighborhood"), with
the British form as a search alias. This is a two-way door for UI text and is decided by the
existing contract.

- Bears on: vocabulary.

### 2.6 Selection editing and set combination are two vocabularies

graphty-element's published `SetOp` (replace, add, remove, toggle, intersect) is a
selection-editing vocabulary: what Shift+click and a marquee do. It has no union, difference or
symmetric difference, which "Condition Comparison" needs ("A only, B only, both"). Figma's
boolean operations are the set-theory terms and transfer unchanged as the commands that combine
sets: Union, Subtract, Intersect, Exclude (`figma.md` 5.3). Both vocabularies are needed and must
not be merged.

- Bears on: vocabulary, ontology.

### 2.7 The published "parallel edges" contract disagrees with the standard term

The standard term is "parallel edges" (`graph-analysis.md` 3.1), which the app shows; the element
publishes `repeatedEdges` and `repeatedEdgeCount` as config keys and statistics fields
(`graphty-today.md` 5.1). The UI should use the standard term; the published key is a candidate
for the element's next major version, with a scope note until then.

- Bears on: vocabulary.

### 2.8 Every non-preferred synonym becomes a search alias, and every scope note an (i) text

ANSI/NISO Z39.19's preferred term, non-preferred synonyms and scope notes map directly onto
graphty's novice aids: the synonyms ("link", "relationship", "vertex") become command-palette
aliases that find edge and node, and the scope notes become the text behind the (i) icons
(`design-method.md` 1, item 4). The vocabulary document therefore feeds two shipped surfaces,
not only a glossary.

- Bears on: vocabulary, information architecture.

---

## 3. Principles

### 3.1 Follow the paved path, except where the tools themselves mislead analysts

"If Figma or the graph tools solved it, solve it the same way" is the owner's rule. The research
finds two places where the paved path is a documented trust hazard: Gephi's silent scoping of
statistics to the filtered graph (1.16), and canvas annotations anchored to positions (1.12).
The principles need an explicit ranking between "follow the paved path" and "a number never
misstates what it describes", and the evidence says the second wins when they conflict. Each
departure is written down with its evidence, not taken on taste (`design-method.md` 10, item 9).

- Bears on: principles.

### 3.2 A caveat is data, not help text

Some values the analyst reads will be estimates or one draw from a random process: sampled
betweenness above a few thousand nodes, seeded Leiden, a component count that is weak rather
than strong. graphty-element already records `Caveats` (exact, sampleSize, seed, converged,
direction, weight). The owner's "(i) icons, not verbose help" rule and Figma's minimal chrome
could push that record behind an icon. It must not be hidden there: an estimate needs a compact,
always-visible mark at the value (for example a "~" prefix and a short word), with detail behind
the (i) icon. The same concept, qualification, serves the analyst's own judgement ("confidence
and limitations", "Iterative Analysis Cycle"), so no separate "confidence" feature is needed.

- Bears on: principles, vocabulary, information architecture.

### 3.3 Status is shown on the value where it is read, never only in a distant indicator

Excel's manual-calculation mode marks staleness only in the status bar, and readers cannot tell
from a number whether it is current; NN/g observed a distant status message missed and acted on
twice; GOV.UK pairs every summary with a mark at each item (`design-method.md` 3.6). So
"out of date", "computing", "failed", "estimated" and "computed on the visible graph" are marks on
the value itself: the result's row, the inspector field, the legend. One aggregate line in the
whole-graph summary links to each mark. In graphty the canvas colour usually IS the data, so the
mark is a symbol plus words, and the canvas is never desaturated to signal staleness.

- Bears on: principles, information architecture.

### 3.4 Undo is the safety net, and it must be cheap

Undo replaces wizards for novices (the owner's rule; Heer and Shneiderman; Ragan et al.,
`graph-analysis.md` 7, item 15). It is only a cheap safety net if undoing and redoing a run
restores stored values rather than recomputing: exact betweenness takes 91 s at 10,000 nodes in
the element today (`graphty-today.md` 7.23). So the rule "undo never recomputes" and the rule
"store the values of held results" are one decision. Figma's undo rules transfer: undo covers
the document, restores the selection a step was taken with, treats a long operation as one step,
and excludes camera, panels and modes (`figma.md` 2.8, 5.5). Undo belongs to graphty-element,
which owns the document and the runs (`figma.md` 5.6 item 2; `graphty-today.md` 6, item 5).
Applying a saved view is an undo step because it can discard unsaved filter work
(`graph-tools.md` 20.26).

Memory bounds it: one metric result is about 38 MB of heap at 100,000 nodes, so undo that keeps
replaced runs must be capped by memory, as issue #427 says (`graphty-today.md` 7.22).

- Bears on: principles, ontology.

### 3.5 The app never acts unasked -- which forces some work into the element

Figma never switches panels, runs something or shows suggestions after a load (`figma.md` 1.2).
graphty currently publishes `run-algorithms-on-load`, applies a top-N-by-degree label budget at
load, and needs a degree run to draw the owner's key overview (`graphty-today.md` 2, 7.8). The
principle does not forbid the overview; it forces the element to provide it as graph attributes
(1.17). Stated as a principle, it keeps producing element requirements rather than app
workarounds.

- Bears on: principles.

### 3.6 One reserved colour means "selected", and no data palette may use it

Figma's "one accent means selected" rule does not hold in graphty today in any of its parts: the
canvas selection gold is 2.8 to 3.8 OKLab units (times 100) from the top of viridis and inferno
and from Okabe-Ito yellow, against the element's own "measurably apart" threshold of about 15; the
default highlight IS Okabe-Ito vermilion; and the app's chrome accent is a third colour
(`graphty-today.md` 7.17). On a node coloured by a measure, a selected low-value node can read as
an unselected top-value node. Because selection is drawn over data colour, this is a principle
with an element test (every shipped palette measured against the reserved colour), not a
visual-language detail.

- Bears on: principles.

### 3.7 Colour follows the category, never its position in a sorted list

graphty-element colours categories by size rank, so an edit that swaps two groups' sizes swaps
their colours, and a named imported category changes colour whenever its rank changes. Gephi Lite
stores a value-to-colour map; Qu and Hullman find inconsistent encodings make reading "slow and
error-prone" (`design-method.md` 3.8). Named categories keep a stored colour per value; algorithm
partitions get canonical labels from the element (numbered by size on a first run).

- Bears on: principles, ontology.

### 3.8 Design for the intermediate, and open analysis in 2D on a desktop

Six of the 12 personas are intermediate, five expert, one novice, and Cooper's perpetual
intermediate is the target (`design-method.md` 1, item 8). The perception studies find the
accuracy gains of 3D come from stereo and motion cues that VR and AR provide and a flat monitor
does not; automatic rotation helps only path tracing (`graph-analysis.md` 6.9, 6.24).
graphty-element publishes a 3D default (`DEFAULT_VIEW_MODE`). The single 2D/3D/VR/AR button the
owner decided on does not settle the default; the evidence says 2D on a desktop.

- Bears on: principles, information architecture.

---

## 4. Information architecture

### 4.1 The long neck is Run, the whole-graph summary and reading results

Coding all 139 task phases of the 25 workflows: Run leads (17 of 25 workflows, 16 to 18 percent
of phases), then the whole-graph summary, then reading results; the three take about 40 percent
of persona-weighted phases. Next come load, inspect, export, navigate and note plus label. Keep
and Find are small by share but are hand-over points: Find is the first phase of "Path
Investigation", "Fraud Ring Investigation", "Criminal Network Analysis" and "Threat Hunting";
time, history and layout are the tail (`design-method.md` 6.6). This matches the owner's
corrections: notes are common, the overview is key, time is not an average-user task.

Of 28 run steps, about 62 percent run on the whole graph and 25 percent once per part of
something (each community, time window or condition); only two start from one kept set. So a
run's scope is a field, not a place, and "within each group" is a first-class scope
(`design-method.md` 6.6).

- Bears on: information architecture.

### 4.2 The left panel lists named graph objects; individual elements live in the table and canvas

Figma's left panel answers "what exists?" by listing the primary objects. At the design target of
about 100,000 nodes (`graphty-today.md` 7.18) nodes and edges cannot be rows, and membership is
many-to-many, so a single-parent tree cannot show it (`figma.md` 5.2). The answer splits by kind:
individual elements are reached through the canvas, Find and the attribute table; the left panel
lists the named objects built from elements (sets, paths, kept communities). The canvas and the
list are "one thing seen twice" only at set level: hovering a set's row outlines its members.

A project keeps 10 to 50 objects, a few hundred in long investigations, and notes are the kind
that grows (`graph-analysis.md` 6.17). So the panel is grouped by kind with a filter field, and
notes do not share it with graph objects (1.3, 4.6).

- Bears on: information architecture.

### 4.3 The nothing-selected inspector is the whole graph, and it has a ceiling

Every analysis tool gives whole-graph statistics a home of its own (`graph-tools.md` 17, item
4), and Figma's "nothing selected" state is the page (`figma.md` 4.8). Together: the inspector
with nothing selected is the set inspector applied to the whole graph, and a separate
"Statistics" place would be a second home for the same capability.

Figma's nothing-selected inspector holds at most three sections with at most two fixed rows under
any header (`figma.md` 4.8). The proposals together exceed that: counts, density, components,
directedness, the degree histogram, loaded-versus-visible pairs, weight and direction
declarations, costly measures, style layers, saved views, Export, an out-of-date line and filter
status. The research packs rather than adds (`figma.md` 5.5): a **Graph** section leading with six
headline readings in a compact two-column figure plus the histogram, the rest behind one "N more"
row; **Style layers**; **Views**; **Export**. Filter status moves out of the inspector to a
persistent header chip ("Filtered: 412 of 5,000 nodes") because it must stay visible when
something is selected. Measure commands are not rows here. Depth zero for the Graph section is
counts, density with mean degree, components (count, largest share, isolates) and a small degree
histogram; reciprocity, completeness, self-loops and parallel edges go one disclosure down.

A typical project holds 3 to 6 style layers, about 10 at worst, bounded by the channels read at
once, which fits the section if tuning, batch runs and per-element overrides do not add layers
(`graph-analysis.md` 6.27).

- Bears on: information architecture.

### 4.4 Every capability has one home and several doors

Object-based IA puts each operation on the object it operates on; Dan Brown allows several doors
but one home, one organizing principle per place, and structure that holds ten times today's
content (`design-method.md` 1, item 11). The algorithms package already has 98 or more
algorithms. Applied to the contested homes:

- **Running an algorithm.** Candidate homes were the toolbar (`figma.md` 5.4), a catalogue rail
  panel (`figma.md` 5.5, on Figma's Tools precedent), and one run dialog with a scope field
  (`design-method.md` 6.6; `graph-tools.md` 20.23). No graph tool runs measures from a toolbar
  (`graph-tools.md` 20.8). The coherent reading: the catalogue is the home (search, categories,
  one row per algorithm with a cost hint); running opens one parameters popover whose scope field
  is always visible; the toolbar carries one Run entry because Run is the top task, the palette
  a second door, and a set's inspector a third that pre-fills the scope. Layouts are a separate
  section of that catalogue with their own verb (`graph-tools.md` 20.27).
- **The attribute table.** A full-width dock below the canvas, linked to the canvas selection,
  opened from the view menu, a shortcut, the palette and every "N more" or "Show in table" row
  (`graph-analysis.md` 6.10; `figma.md` 5.4). Until edges can be picked it is also the only
  practical route to an edge (4.9). Data cleaning happens there with the canvas visible
  (`graph-tools.md` 20.22).
- **Filtering.** Find and query in the left panel; select, hide, dim, style and keep are verbs on
  the result (1.9). Filter, search and saved filters collapse into one place.
- **Time.** No rail slot: a dock that appears only when the data has a time attribute, like
  Figma's Motion timeline (`figma.md` 5.4).
- **Neighbourhood expansion.** A visible command on the selection (node inspector, context menu,
  with depth and direction), with double-click and a shortcut (`graph-tools.md` 20.21). It is
  the one top task in the search-first path that had no home.
- **Export.** The last section of whatever is selected (the whole graph when nothing is), plus
  the one filled header button; present and export are the same thing (`figma.md` 5.4;
  `graph-analysis.md` 7, item 13).
- **Import.** The one guided dialog, because mapping columns to source, target and id is a
  decision Figma never faces (`figma.md` 5.4); reviewing and cleaning after load is in the table
  dock.

- Bears on: information architecture.

### 4.5 Rail buttons are collections of nouns, earned by Figma's three tests

Figma gives a secondary collection a rail button only if its items are inserted onto the canvas
(Assets), it is a large runnable catalogue (Tools), or it is a table too wide for a panel
(Variables) (`figma.md` 2.5, 5.5). Activities ("Analyze", "Style", "Present", "Explore") fail by
construction, so the app's current activity list fails entirely. Applying the tests: the
graph's objects (sets, paths) are the left panel's primary list; the algorithm and layout
catalogue earns a button; notes, style layers and views do not.

The measures a project holds (1.3, 1.4) sit between these. The research placed them as a group
of the left panel (`graph-analysis.md` 6.25) and as popover-only definitions with no row
(`figma.md` 5.5). Figma's Assets panel offers a precedent neither note used: it lists "created in
this file" above the library. The catalogue panel can list the project's measures above the
catalogue, giving measures a list of their own that is not interleaved with sets, and keeping
"what I have run" next to "what I can run". This is a hypothesis for the IA document to test
against the workflows.

- Bears on: information architecture.

### 4.6 Notes: written from the target, read on the target, reviewed in a mode

Notes are a common task by the owner's correction. Figma splits commentary into a stored
annotation on the node and a comment mode with its own tool, panel and pins, never as tree rows
(`figma.md` 2.4, 4.11). Six of eleven note-writing steps in the workflows cite several targets,
and five of those cite kept objects rather than canvas elements (`design-method.md` 6.6).

The resulting IA: Add note is a toolbar tool (Figma's Comment tool, key C) that starts from the
current selection and adds further targets by reference; each target's inspector has a Notes
section, empty as one row with "+"; a marker beside each target on the canvas, hideable from the
view menu; the full list of notes is a mode whose panel replaces the inspector, entered only to
review. The Notes section in an inspector is a documented departure from Figma, justified because
graphty notes are findings read beside values (`figma.md` 5.5).

- Bears on: information architecture.

### 4.7 A partition's groups and a path family's paths are tables, not inspector lists

Figma cuts an object's lists to three or four items and "N more"; multi-column sortable tables
leave the side panels (`figma.md` 4.14). A partition's community table, a path family's list and
a set's member list have several value columns and a select action, so the inspector shows the
count and the first few rows, and "N more" opens the table dock scoped to that object. Figma's
reverse relationships produce a selection, never an inline member list, so a set's inspector has
"Select members", not a member list (`figma.md` 2.6).

A node's memberships follow Figma's Selection colors shape: one row per set it belongs to, a
swatch, and an icon that selects that set's members. A node's place in "community 7 of this
Louvain run" is an attribute value with an address, not a membership row, or a node in four
partitions would list four memberships and a multi-level run thirty (`figma.md` 5.5;
`graph-analysis.md` 6.8).

- Bears on: information architecture, ontology.

### 4.8 Style layers look like Figma's stacked Fill list, and editing a colour writes one override layer

No Figma surface draws an ordered list of rules across many objects; graphty's rules overlap, so
precedence exists and must be drawn (`figma.md` 5.5). The stack borrows the Fill list's row shape:
the top wins, an eye per row, newest added at the top, drag to reorder. The element's stack is
bottom-first internally; the display simply inverts it (`graph-tools.md` 18, item 2). Interaction
state (selection, hover) is drawn above data styling in every tool.

Editing a selected node's Colour row cannot write to the node (the style-layer rule in
`CLAUDE.md`). The row shows the layer that paints it, as a Figma row shows its style; clicking
opens that layer's editor; "Override" records the value in one collected override layer per graph
(a map from element id to channel values), with a count, "Select overridden" and "Clear all" on
its row. Cytoscape's hidden per-element bypass is the documented cause of "my mapping does not
work" (`graph-tools.md` 20.4; `figma.md` 5.5). The element's `styles.explain` ("covered by X on N
of M") is what makes stacked highlights trustworthy: a later layer can cover an earlier one on
shared edges, and the reader must be able to see it.

- Bears on: information architecture, principles.

### 4.9 No IA route may assume an edge can be pointed at

Edges cannot be picked on the canvas, a selected edge is not drawn, the app has no route that
selects an edge, and nothing schedules edge picking (`graphty-today.md` 7.12, 7.29). Every route
built on "select an edge on the canvas" is dead today: the edge inspector, notes on edges,
per-edge overrides, pointing at a path's edge. The table's Edges tab is the buildable route, over
an element API that already selects edges by id. The ontology can name the edge primary; the IA
must give it a non-canvas route until picking lands.

- Bears on: information architecture, ontology.

### 4.10 Progress lives on the result's row; the toast only announces completion

Figma runs one long operation at a time and reports it in one global toast (`figma.md` 4.9).
graphty's runs queue and run side by side, so progress (queued, running, done, failed, cancelled,
with Cancel) is on the result's own row and inspector; a toast keeps only Figma's completion role
with one action ("Show result"). There is no "jobs" or "history" place, which keeps an activity
button off the rail.

- Bears on: information architecture.

### 4.11 History is linear; the analysis tree is the grouped list of kept outputs

Branching history (VisTrails) was proposed so that data edits and analysis share one coherent
history (`design-method.md` 3.5). The later evidence narrows the need: no workflow asks to return
to a pre-edit state and keep analysis made after it; comparing results is served by measures that
coexist ("Run as new"), not by branches; the workflows that edit data want either several working
graphs (sets, 1.18) or recovery from a bad edit, where analysis on the wrong merge is not wanted
(`graph-analysis.md` 6.16). Issues #427, #301 and #145 describe a linear history of commands and
never a branching tree (`graphty-today.md` 7.11, 7.16). Figma restores versions by appending and
branches only on an explicit command (`figma.md` 2.10).

The coherent reading: undo is linear and has no visible list (Figma); saved versions of the
project file are Figma's versions; the owner's "tree of analysis results" is the list of kept
outputs (measures with their runs, sets, notes, views) grouped by kind with reference links,
each stamped with the data revision it was made on. One history still covers both cleaning and
analysis. The record also warns that the IA cannot promise a history surface until every
mutation passes through the session: data edits, layout, camera and view mode bypass it today
(`graphty-today.md` 7.14).

- Bears on: ontology, information architecture.

---

## 5. What graphty-element must change before the framework holds

The framework can be written now, but several of its statements are only true once
graphty-element changes. Stated as ordering constraints, not app concerns:

1. **Stable edge identity.** Minted edge ids are a load-order counter, so anything keyed by edge
   (a path, an edge set, a note on an edge, an override, an edge-metric result) rebinds to a
   different edge after an edit that inserts an edge earlier (`graphty-today.md` 7.15). The key
   is the file's edge id when it has one, else a direction-aware endpoint pair plus ordinal
   (`graph-tools.md` 20.19). This precedes every edge-holding part of the ontology.
2. **Edge sets in the one set vocabulary.** A saved scope cannot hold edges, so a path cannot be
   kept as a set (`graphty-today.md` 1.7).
3. **Keep without the selection.** Keep must accept a query or a result group directly; today
   `promote` truncates at 5,000 and drops edges (`graphty-today.md` 7.18; `figma.md` 5.6 item 6).
4. **Record the scope actually computed.** Runs record "visible" and compute over everything
   (`graphty-today.md` 6, item 10).
5. **Degree and component membership at rest**, with the degree distribution in the statistics
   (1.17).
6. **Staleness from declared inputs.** Algorithms declare what they read; the attribute store
   keeps per-column revisions; a run records the counters it read (`graphty-today.md` 7.27).
7. **A measure identity above the run**, with an atomic revise operation (1.5).
8. **Stacking highlights.** `styles.highlight()` removes every highlight layer first today; the
   owner has decided highlights stack (`graphty-today.md` 6, item 3). Exclusivity applies within
   one result at most (`graph-analysis.md` 6.27).
9. **One mutation path.** Data edits, layout, camera, view mode and pins bypass the session, so
   neither undo nor the project file can see them (`graphty-today.md` 7.14).
10. **Attribute writes through the session**, before notes ship, so the note schema need not
    carry judgement fields (`graphty-today.md` 7.26).
11. **The seed and version defects.** The published `seed` option reaches no algorithm, and every
    run record states the 1.x package versions (`graphty-today.md` 7.9, 7.22). Provenance the
    file shows must be true before it is published.
12. **A sampler and an "estimated" value state.** Exact closeness and betweenness freeze the page
    near 10,000 nodes; clustering coefficient, diameter and average path length do not exist
    (`graphty-today.md` 7.23). The "Compute (about N s)" rows proposed for the graph inspector
    describe a capability that does not exist, and today the wait is dominated by the default
    paint of a result, not its computation.
13. **Reserved selection colour and palette test** (3.6); **canonical partition labels and stored
    category colours** (3.7); **the catalogue's plain names and readings** (2.1).

---

## 6. What Figma already solved: copy these

These transfer unchanged or with only their content changed (`figma.md` 5.1 to 5.7):

**The frame**
- Nav rail on the left choosing what the left panel lists; left panel answers "what exists?";
  canvas at the centre with nothing floating at rest except the toolbar and Help; right inspector
  answers "what is this?"; floating bottom-centre toolbar that does not change with the
  selection; command palette (Ctrl+K) as a route to everything and the home of nothing.
- Panels hold their width (240 px) and the canvas shrinks; the toolbar stays centred on the
  window; Minimize UI gives the canvas the whole window, which is also the natural VR and AR
  state.
- A secondary bar above the toolbar for an armed tool's options (for example picking a path's
  two endpoints), gone when the tool finishes.
- Popovers opening to the left of the inspector for one property's detail (colour pickers,
  algorithm parameters, export settings).
- Context menus with only what applies to the clicked thing, plus a keyboard route.
- A view menu for display toggles (labels, arrows, legend, minimap), not the canvas.
- A File menu for save, open, versions and whole-project export; Help bottom right for help,
  shortcuts, samples and docs.
- Modal dialogs only for decisions that leave the canvas (for graphty: import).
- A bottom dock that pushes the canvas up and appears only when needed (the time slider).

**Selection**
- One selection; click, Shift+click, marquee, Escape; two-way hover link between list and
  canvas; "N selected" as the inspector title; "Mixed" for differing values; a kind-specific
  section appears when at least one member has it.
- A selected container is the target of every command; Enter selects its members, Shift+Enter
  returns to the container.
- Reverse relationships produce a selection, never an inline list of users; forward
  relationships are a named row with a go-to action.

**Editing**
- Add first with defaults, configure afterwards in a popover, commit on Enter, no confirmations,
  undo reverses.
- The most specific controls come first in an inspector; Export is the last section.
- A property bound to a definition shows the definition's name, opens the definition's editor,
  and offers a separate "detach" route for a local value (graphty's Override).
- Overrides are a field list reset per property and per object from the thing they change.
- Empty sections are one header row with "+"; optional labels; tooltips are a name plus a
  shortcut; longer explanations behind the (i) icon.

**Undo and the file**
- Undo covers the document, restores the selection with each step, bundles a long operation into
  one step, has no visible list, and excludes camera, zoom, panels and modes.
- Versions append, never branch implicitly; a branch comes only from an explicit command.
- The file evolves additively: a version number and a reader that tolerates and preserves unknown
  optional fields. With that rule shipped, most later fields are two-way doors (`figma.md` 2.10).
- A reference outlives its target: a dependent keeps its last value, says what it lost on its own
  row, and offers restore; opening a file produces a report of what could not be reconnected.

**Secondary objects**
- The tree holds only things with a body; shared definitions live in their own place and are
  applied from a property row; commentary is a mode with pins; history is off the working screen;
  output is a property (`figma.md` 2.4).
- A secondary collection earns a rail button only if it is inserted, a large runnable catalogue,
  or table-shaped.
- A large catalogue has a browsable rail panel with search and category filters plus the palette
  as a second route; nothing runnable is palette-only.
- Inspector tabs, if used, hold whole domains, stick across selections and never give one
  property two homes.

**Vocabulary conventions**
- Use the trade's own nouns; teach jargon on hover, never by renaming it.
- Inspector sections are nouns naming what they edit, never activities.
- Commands are verb plus object; "+" tooltips read "Add X".
- Every object is named at birth (kind plus counter, or for a result the algorithm and its
  target) and renamed in place.
- Modes are single nouns (the 2D, 3D, VR, AR button).
- One word, one meaning -- with Figma's own overloads ("Layout", "Actions") as the warning.

**Shortcuts and gestures**
- V, Ctrl+K, Ctrl+F, C (note), Enter and Shift+Enter, Shift+click, marquee, Escape: a Figma user
  already knows graphty.

---

## 7. Where graphty departs from Figma, and why

Each departure is justified by the graph domain, not by taste (`figma.md` 5.5, 5.7):

| Departure | Reason |
|---|---|
| The left panel lists named sets, not every object with a body | nodes come in tens of thousands and belong to many sets at once |
| A set's body is its members; hovering a set's row outlines them | graph objects have no bounding box of their own |
| Find is a visible field, not an icon, and searches attribute values and queries | starting from a known entity is a top task in the investigation workflows; NN/g found a visible search field raised search use by 91 percent (`design-method.md` 6.5) |
| Keep on a query stores a rule; Keep on a result group stores members plus origin | Figma only keeps what is selected; graphty's sets come mostly from rules and results and exceed the selection cap |
| The nothing-selected inspector carries whole-graph statistics | understanding the whole graph is a key task; Figma's page section holds only colour and export |
| A global, ordered style-layer stack is drawn | graphty's rules overlap on the same nodes; Figma's styles never do |
| Hovering a style-layer or measure row outlines what it paints | "which nodes does this touch?" is a constant question |
| A Notes section in each target's inspector | notes are findings read beside values, not a conversation about a region |
| Progress on the result's row, not only a toast | runs queue and run side by side |
| Analysis results carry provenance, freshness and caveats | Figma's properties are authored, never computed |
| One override layer with a count, "Select overridden" and "Clear all" | a graph has thousands of override targets where Figma has a handful of instances |
| Every definition gets "select what uses it" | Figma's own users ask for it, and graph users ask constantly |

Graphty's own ground, where Figma has no answer and Cytoscape and Gephi are the first places to
look: the graph ontology and many-to-many membership; derived results with provenance, freshness,
cost and caveats; appearance as a mapping from data; whole-graph reading; finding by data; a
layout as a running process with pinning; time as a data dimension; 3D, VR and AR camera
controls; the import flow (`figma.md` 5.7).

---

## 8. Tensions the framework documents must still settle

These are not settled by the research and each has evidence on both sides:

1. **Where the list of measures lives**: a group of the left panel (`graph-analysis.md` 6.25),
   popover-only definitions (`figma.md` 5.5), or the catalogue panel's "in this project" list
   (4.5 above).
2. **Automatic label and colour matching across re-runs.** `design-method.md` 3.8 matches each new
   group to the previous version's group by member overlap and carries its label, name and
   colour. `graph-tools.md` 20.17 and `graph-analysis.md` 6.28 say the element must never promise
   that a new community is an old one, and should offer a carry-over table instead. A reading that
   satisfies both: overlap matching may carry canonical numbers and colours while a partition is
   being tuned and is unlabelled, and for following partitions such as components; the reader's
   names are never carried automatically, because a labelled partition is re-run beside, not
   revised.
3. **What a deleted run's dependents keep after a reload.** Restore run needs the removed run's
   values; the undo journal is session-scoped, so after a reload Restore is impossible unless the
   file keeps removed runs' values, which works against file size (`figma.md` 5.5;
   `graph-analysis.md` 6.16).
4. **Object selection**: app presentation state or a published element member (1.10).
5. **Whether a saved view's camera is carried opaquely by the session or moves into a Node-safe
   type** (`graphty-today.md` 7.21).
6. **What liveness rule applies to a rule set that reads a held result** after that result is
   revised: re-evaluate at once (`graph-analysis.md` 6.29) or wait for an explicit update.
7. **The file's container**: JSON is workable for a few stored node columns at 100,000 nodes;
   edge columns at 500,000 edges and positions argue for a binary columnar member such as
   graph-format's wire form, which carries no attributes today (`graphty-today.md` 7.15, 7.18).
8. **The requirements base needs repair before it validates anything**: 37 of the 61 capabilities
   have broken workflow back-references, every capability status is still "planned", and one
   persona has no goals (`graphty-today.md` 4.4). The workflows' task phases, not their capability
   lists, are the validation material (`design-method.md` 7.1).

---

## 9. One-way doors the research surfaces for the owner

Everything in sections 3 and 4 is a two-way door. These reach a published contract of
graphty-element or the project file:

1. **The analysis tree's row kind**: kept outputs grouped by kind with references (the research's
   recommendation, 4.11), a list of runs, or graph states in a branching history.
2. **The measure identity above `RunId`** and the revise-in-place default, which changes the
   element's derived-id behaviour (1.5); selectors and rules referencing the measure, not the run.
3. **The set's published name**: rename `Scope` to set in a major version, or add beside it (2.3).
4. **The set definition arms**: fixed, rule, and ordered edge sequence for a path; the group
   address "result plus value"; the labels map on a partition (1.6 to 1.8).
5. **Renaming the `community` result shape** so connected components are not published as
   communities, and how a cover is added (2.2).
6. **The default scope**: whole loaded graph for statistics, runs and encoding scales (1.16).
7. **Liveness by kind and the freshness field** beside run status (1.14, 1.15).
8. **Stored values versus recipe**: values for every held result (anything not linear, seeded,
   order-dependent or GPU-variable), recipe only for following ones (3.4; `graph-analysis.md`
   6.11).
9. **The edge key in the file** (5, item 1).
10. **The file's top level as a list of graphs** (1.18).
11. **The note schema's target arms**, including sets, community addresses, measures and views,
    and whether notes store member snapshots (1.12).
12. **Declared data roles**: node type, edge type, weight meaning (1.21).
13. **Series as a result kind** for measures over time windows (1.16).
14. **The tolerant-reader rule and version number for the project file**, which turns most later
    additions into two-way doors (`figma.md` 5.5).

---

## Sources

Research notes in this folder, each of which lists its own external sources:

- `design/ui/framework/research/figma.md`
- `design/ui/framework/research/graph-analysis.md`
- `design/ui/framework/research/graph-tools.md`
- `design/ui/framework/research/design-method.md`
- `design/ui/framework/research/graphty-today.md`

Repository sources cited directly:

- `CLAUDE.md` (root), "Architectural Principles", "Graph Styling", "Algorithm Styles"
- `design/designloom/workflows/*.yaml` (cited by title)
