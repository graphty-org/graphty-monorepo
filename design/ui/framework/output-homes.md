# Homes of objects and outputs

**Job.** The register of `information-architecture.md`: every object in the object map and every
output the capability files name, each with its one home and its routes; every command with the
places it starts; and every relationship with its routes each way. It is the information
architecture's acceptance test: an empty cell is a hole in the structure, and the outline in
`information-architecture.md` 4.1 must reach every home listed here. **Not here:** the rules that
produce these homes (`information-architecture.md` 2), behavior (`interaction-patterns.md`),
section order and row anatomy (`interface-specification.md`). **Owner:** information architect.
**Ceiling:** the README's table. **Validated by:** every home is a place in `information-architecture.md` 4, and
every route is a place, a device or a verb that exists there; every home and starting place is a
node of the outline in `information-architecture.md` 4.1 or a first-click task.

A **home** is a place, or a row's detail opened in place (`information-architecture.md` 2, rule
2). Routes are named by place, never by key.

## 1. Objects

One row per object in `conceptual-model.md` 1.3, the one list of object types; the pins row is a
count, not an object, and is here because it has a home. "Verbs" says where the object's commands appear;
every command is also in Quick actions, and in the main menu where its scheme puts it
(`information-architecture.md` 10).

| Object | Home | Its detail | Routes to it | Verbs |
|---|---|---|---|---|
| project | the left panel header (its name), above every rail panel | the chevron menu | -- | the chevron menu |
| graph | its row under Graphs; read in the inspector with nothing selected | the graph's inspector | Find; a view's graphs; Version history's graph tag | the row's context menu, which holds Version history; the inspector's type row |
| node, edge | one: the inspector when selected; many: the table's Nodes and Edges tabs | -- | the canvas; Find; a count; Members; a pair row | the type row, its overflow and the context menu |
| set, path | its row in Sets and paths | its inspector when selected | Find; Memberships; Created from; Used by | the type row; the row's context menu |
| set collection | its folded row in Sets and paths | its sets, beneath it | Find; Compare with... | the row's context menu, including New graph from's Bipartite projection... (a graph of overlaps) |
| set or path in its offered state (a group, a found path) | its row in the result's item tab | its inspector when selected | the result editor's top items; Find | the type row |
| item that is not (pair) | its row in the result's item tab | -- | the result editor | the row's context menu |
| result, run | its row in In this project | the result editor popover, which holds its parameters, its Appearance and its readings (headline readings; top and bottom items, or for a metric result its Top nodes, whose "N more" opens the Nodes tab sorted by its column; Used by) | a computed column's header; a layer's origin; the finish notice; Find | the editor's menu; the row's context menu |
| catalog entry | its row in the Catalog | its (i) description | Quick actions; a result editor's name | a click runs it (`interaction-patterns.md` 3.3) |
| style layer, Base style, Overrides | its row in the Styles list of the Graph panel (`information-architecture.md` 11) | the style-layer editor | an Appearance row's picker; a value row; a column's Color by and Size by; a result editor's Appearance; Find | the row and its editor |
| hidden elements (a state, not an object) | the count on the canvas legend's not-drawn line, drawn by the element and keyboard reachable (`canvas-drawing.md` 8), outside the style stack | -- | Selection's Show on canvas; the not-drawn line's Select hidden and Show all; Quick actions | Select hidden, Show all (section 3.9) |
| Look | the Look icon on the header of the graph's property section (Figma's Apply variable mode) | its menu of Looks | Quick actions | the icon |
| comparison | while open, the comparison surface; once saved, a run folded under its comparison result's row in In this project | its two operands | Compare with...; Find | Save comparison |
| filter step | its row in the filter chip's steps | the rule editor | Filter to and Filter out wherever they appear; a column header; a histogram band; a legend entry | the step's menu |
| note | its row in the Notes panel | the Note editor | an object's Notes section; canvas markers; Find | the Note tool; Add note |
| saved view | its row in Views | the view editor | the view menu's Views submenu; Find; the Export dialog | the row's context menu |
| attribute | its column in the table (header with histogram and completeness) | the column header menu | Find; the Attributes row; a value row in the inspector | the column header menu |
| layout settings | the graph's Layout row | the layout editor | Run layout on a set, a group or a partition (presets the scope); Run layout on the empty canvas; Quick actions | the row's Run |
| pins (the pinned count) | the pinned count on the graph's Layout row, which acts as every count does (`interaction-pattern-entries.md` 4.3) | Unpin all | a pinned node's inspector | Pin and Unpin on a node; Unpin all |
| data version | its entry in Version history | its import report | the Last import row (the latest version); the load notice | the entry's menu |
| recipe | none: a file is a command's output; before it is applied, a row of the recipe picker, which lists the recipes available (`information-architecture.md` 3); once applied, its read-only entry in Version history, and the Source facet of the Results panel and the Styles list, which narrows each to what it brought | what it added and from where | the Overview row's Details | Apply recipe; Export recipe |
| derived graph | its row under Graphs | the graph's inspector | its source's Used by | as a graph |

## 2. Outputs

Every output named by `design/designloom/capabilities/*.yaml`, split where a file bundles several.

| Output | Home | Routes |
|---|---|---|
| algorithm progress | the result's row | the finish notice |
| shortest path, all paths | its Results row (path family editor) | the Path tool; Shortest path from a node; the catalog's and the Algorithms menu's Path |
| analysis history, chain of custody | Version history, with the operation log | a run's Details; the log's Export |
| methods text: one sentence per run naming the algorithm, every option as resolved, the scope with its counts, the weight and its role, the seed, the engine, the graphty-element version and the conventions it follows (`graph-conventions.md`); wording `content-design.md` 3, key `record.methods` | Version history, the project's record | each result editor's record |
| the findings report's pages | the Views section, in page order, with the notes each view shows (`files-and-recipes.md` 3) | the Export dialog writes the report |
| rendering, hover, tooltips, zoom and pan, animated transitions | the canvas | the view menu; reduced motion in Preferences, which sets the element's `reducedMotion` property |
| notes | the Notes panel | the Note tool; Add note; each object's Notes section; canvas markers; Find |
| findings report, and the evidence file (the findings report scoped to the current filter step) | a command's output: the Export dialog's Findings report profile | Export...; the chevron menu. Notes travel by what they are about: notes on definitions in a recipe, notes on elements in a project, and read-only in a findings report; no notes-only file is offered (`files-and-recipes.md` 1) |
| the graph's own notes | the Notes panel, filtered to the graph | the Notes section of the graph's inspector, present once one exists |
| free text, shapes, canvas-anchored labels | rejected (`information-architecture.md` 11); figure text is a group name drawn by a label layer, a note shown in a view, or a view caption | -- |
| anomaly detection ("what does not fit") | a reading, not a catalog family, until the element publishes one: the outlier band of any attribute histogram (`information-architecture.md` 3) | column headers; Statistics; Filter to and Create set on the band |
| headline statistics and counts | the graph's Statistics | returning to nothing selected |
| type summary (counts per node and edge type, which types connect) | the types row of the graph's Statistics, present when a type role is declared | the Between groups view grouped by node type |
| degree, average, minimum and maximum degree | the attribute histogram on degree | the degree distribution in Statistics; a node's degree |
| centralities, local clustering | its Results row (metric editor) | the catalog; Quick actions |
| transitivity, average clustering, diameter and other graph statistics | once requested, its Results row, as any result | its Statistics row, which shows the value with its scope and opens the result; Find |
| community detection | its Results row (partition editor) | the catalog; Quick actions |
| community profiling | the partition's item tab, named by its kind and result ("Communities: Louvain"), with its Between groups view and group columns | a partition's editor; a group's inspector |
| comparison of two elements | the several-elements inspector | selecting both |
| comparison of two kept objects | the comparison surface or the editor where it was asked | Compare with... on either |
| comparison of two readings, a what-if | the editor where it was asked | Compare with... on a result, reading or set |
| comparison of two columns | the table's Scatter view | Compare with... on a column |
| comparison of two drawings | the comparison surface | Compare with... on a graph, version, window, set or group |
| saved comparison | its run under the comparison result's row in In this project | Find; the Export dialog |
| removal impact, every scenario | the comparison result's scenario table | the "without each of" scope |
| connected components | the permanent components result, a Results row because it offers items (the component groups), which need an item tab; degree offers none, so its home is the histogram | the component counts in Statistics |
| computed columns | the Nodes tab or Groups tab column | New column on a column header |
| neighbor aggregates | its Results row (metric editor), a run (`element-contract.md`) | New column's Aggregate over neighbors...; the catalog once the element publishes it |
| overview recipe in force | the Overview row, first in the graph's Statistics, with Replace, Compute the overview and Apply recipe... | Recipes' Use as this project's overview...; Preferences (the reader's default) |
| applied recipes | their Version history entries | the overview recipe row's Details |
| the recipes available: the element's registered recipes (General overview, then the examples), then recent recipe files | the recipe picker, a device (`information-architecture.md` 3) | the Overview row's Replace; Recipes > Apply recipe...; Quick actions |
| recipe updates | deferred until recipes have a remote source | -- |
| a failed open or load: the error, file, line and column, and the parser's text under Details | the load step, which stays open on the failure (`message-catalog.md`, `open.failed`); no graph exists yet to hold it | the retry from the same step |
| preview, format detection and field mapping before a load | the load step, a dialog, on every data door | Open, Add data, Add as another graph, Join and Replace data in the File menu; the start screen; drop; paste |
| where an element or value came from | the element's source row, naming the data version and its file (waits: the source attribute, `element-needs.md`) | the version entry's element count |
| join match count before a join | the load step | Join... on a column |
| the latest import's headline and mark rows | the Last import row and mark rows in the graph's Statistics, at rest | the load notice |
| the latest import's report in full | the Last import row's detail | its data version's Version history entry; Re-map columns |
| an earlier import's report | its data version's entry in Version history | -- |
| completeness per attribute | the column header | the incomplete-attributes mark in Statistics |
| a graph's direction and weight | the Edges row of the graph's Statistics (its editor holds Direction and Weight) | the weight mark; Re-map columns; each run's Direction and Weight rows |
| how a run read the edges | the result's Direction and Weight rows | its state line, when they differ from the graph's declaration |
| details on demand, node selection | the selection's inspector | the canvas; Find; the table; list rows |
| ego network, neighborhood expansion | the several-elements Statistics after Select neighbors | Select neighbors; Filter to neighbors |
| filtering, saved filters | the filter chip's steps; kept as rule sets in Sets and paths | Filter to and Filter out wherever they appear; column headers; histogram bands; legend entries |
| a Find kept | its rule set in Sets and paths, which re-applies to new data (top task 12); how its hits changed across data versions is Compare with... on it | Find, then Create rule set |
| pattern search | withdrawn: outside the model (`conceptual-model.md` 1.5) | -- |
| guided onboarding | no surface of its own | samples; the (i) marks; Quick actions; documentation; Additional labels |
| keyboard shortcuts | the shortcuts panel, a place of the device kind | the main menu's Help; the Help button |
| large-graph rendering | the canvas, with its "not drawn" line | a filter step, which narrows what is drawn |
| an overview past the drawing limit | the graph's Statistics, with the component-size list; the component quotient drawing once the element draws it (`element-needs.md`, "An aggregate view past the drawing limit") | Find; the table |
| a node's rank on a metric | the metric's row in the node's Attributes, as a second line with its denominator and scope | the table's rank column |
| layouts and their options | the graph's Layout row | Run layout on a set, a group or a partition; Run layout on the empty canvas; Quick actions |
| legend, minimap | the canvas | the view menu |
| link prediction | its Results row (pair-list editor); the element ships `link-prediction` in its Prediction family | the catalog |
| metric histograms | the attribute histogram | column headers; attribute values; the metric editor |
| node merging | the merged node's inspector | the several-elements overflow; a pair row; the pair-list editor |
| path highlighting | the path's layer in Styles | the path's Appearance |
| progressive loading | the load notice | -- |
| sample datasets | the start screen | Help's Open sample |
| text search (capability "search") | Find | Quick actions' hand-off row |
| selection statistics | the several-elements inspector | Export table |
| style presets (Looks) | the Look icon on the graph's property section header | Quick actions |
| temporal analysis | its Results row (series editor) | Each of the windows in a result's Scope; Over time in Statistics and the histogram |
| arrival, departure, creation and dissolution per window; who arrived when | headline readings of the Over time series in Statistics; a count point lists its elements (waits: `element-needs.md`, Series) | the series editor |
| community evolution | a partition series' Results row: splits and joins between windows | Each of the windows on a partition |
| one element's values across windows | the series editor filtered to that element | the element's value row for a series attribute; the table's long form filtered to it |
| temporal navigation | the time slider in the dock | the view menu |
| saved views | Views, in the Graph panel | the view menu's Views submenu; Find |
| visual encoding of nodes and edges | the Styles list | Appearance rows; column headers; the result editor |
| data operations (add, join, replace, re-map) | the import report | the File menu; the drop point; Quick actions |
| new graph from (combine, projection, quotient, sample) | the new graph, whose Created from reopens its inputs and states any cutoff | the graph's, a column's, a partition's and a set collection's context menus |
| add node, add edge | the new element's inspector | the empty canvas; a pair row |
| remove | its Version history entry | the several-elements and set overflows |
| preferences | the Preferences dialog, a place of the device kind (contents: `interface-templates.md` 20) | the main menu; Quick actions |
| the assistant | the Assistant panel | Quick actions |

## 3. Commands: the one vocabulary

A command has no home; it has **starting places**, all equally correct
(`information-architecture.md` 2). **This table is the one list of command labels until graphty-element publishes its own.** The glossary
defines the words a label is built from (`glossary.md` 9); the interaction patterns say how each
behaves; the outline in `information-architecture.md` 4.1 is checked against it. Every command is
also in Quick actions, which lists its chord, so a Quick actions column is not repeated. It is kept by
hand as the design seed of graphty-element's intent commands (`element-needs.md`, "Intent commands in
graphty-element"); once they ship, the element's list is the only source of labels, ids and
availability, and this table is replaced by a listing generated from it, not kept as a copy. A file written out
of graphty is a command's output and is listed here, not in section 2.

Columns: **Id**, a proposed stable identifier (an additive element name, decided at release);
**Starting places**; **Operation**, the model operation of `conceptual-model.md` 7.1, or View or
Chrome where nothing in the project changes (`interaction-patterns.md` 1.1); **Undo label**, an
example in the imperative (`element-needs.md`, the `history.nextUndo` row), or "not a step"; **Key**, the chord's role, E in the element
keymap and A in the app's (`interaction-pattern-entries.md` 9.3); **Owner**, E element, A app, E>A the
element publishes it and the app draws it.

### 3.1 Files, the project and recipes

| Command | Id | Starting places | Operation | Undo label | Key | Owner |
|---|---|---|---|---|---|---|
| New project, Open..., Open sample, Recent projects | `open` | File; the start screen; Help (Open sample) | Load, as a new project | not a step | open (A) | E>A |
| Add data..., Add as another graph..., Join..., Replace data... | `add-data`, `add-graph`, `join`, `replace-data` | File; a file dropped on a loaded graph (its choice step); Join... also on a column header | the data operations | "Add data flights.csv" | -- | E>A |
| Connect to data source... | `connect` | File; the start screen | Load | "Load from STRING" | -- | E>A |
| Load set collection... | `load-sets` | File; the Sets and paths "+"; a list file's choice step | Load set collection | "Load 186 gene sets from hallmark.gmt" | -- | E>A |
| Load, Filter at import, Read as..., Choose another file | `load` | the load step | Load, with a query for Filter at import | the load's label | -- | E>A |
| Re-map columns | `remap` | the Last import row's report | Re-map | "Re-map columns of flights.csv" | -- | E>A |
| Add as nodes | `add-as-nodes` | the ids-not-found notice after a paste | Add data | "Add 14 nodes" | -- | E>A |
| Export... | `export` | the header; File; the chevron menu | Export | not a step | export (A) | E>A |
| Export <object>, Copy as PNG | `export-object` | an object's Export section | Export | not a step | copy image (A) | E>A |
| Export as <format> | `export-as` | the Export dialog's format field; a notice that offers another format | Export | not a step | -- | E>A |
| Export table | `export-table` | a table tab; a Statistics section's menu | Export | not a step | -- | E>A |
| Download project file, Version history, Project info... | `download`, `history`, `project-info` | the chevron menu; File | Export; View; metadata edit | "Change project info" | -- | E>A |
| Rename, Duplicate, Close (the project) | `project-rename` | the chevron menu | rename | "Rename project" | -- | E>A |
| Restore version | `restore-version` | a data version's entry in Version history | Restore, appending a data version | "Restore version of 2026-05-12" | -- | E>A |
| Apply recipe..., Use as this project's overview... | `apply-recipe`, `use-overview` | Recipes, through the recipe picker; a recipe dropped or opened with a project open (its choice step); the Overview row (Apply recipe..., when its recipe carries layers) and its Replace (Use as...) | Apply recipe | "Apply recipe Community overview"; "Use Community overview as this project's overview" | -- | E>A |
| Use as default overview, Reset to default | `default-overview` | the Overview row's Replace menu; Preferences' Default overview row (Reset to default) | Chrome: a reader preference that covers every project naming no overview of its own, never in the project (`files-and-recipes.md` 2) | not a step | -- | E>A |
| Compute the overview | `compute-overview` | the Overview row, when a row reads Not computed | Run, every Not computed reading under the cost gate | "Compute the overview" | -- | E |
| Apply style file on top..., Replace style stack with style file... | `apply-style` | a style file's choice step; Recipes | style edit | "Apply style file Lab colors on top"; "Replace style stack with Lab colors" | -- | E>A |
| Export recipe..., Export style... | `export-recipe`, `export-style` | Recipes; the Export dialog; Export style also in the Styles list's menu | Export | not a step | -- | E>A |
| Undo, Redo | `undo`, `redo` | Edit, whose Undo item names the next step; the undo notice | -- | the label of the step undone | undo, redo (E) | E |
| Undo history (interim, removed when `element-needs.md`, "Undo of a pending run, and Redo restoring it", lands) | `undo-history` | Edit | -- | not a step | -- | E>A |

**An exported result carries its method**, exact or approximated with its sampling parameters,
beside its freshness (`one-way-doors.md` 61), because a sampled value cannot be reproduced without
it. What an export states about scale is `state-matrix.md` 4.7.

### 3.2 Selection

| Command | Id | Starting places | Operation | Undo label | Key | Owner |
|---|---|---|---|---|---|---|
| Select all, Select none, Invert selection, Select edges between | `select-all` | Edit (Select all); Selection; the canvas context menu | Select | not a step | select all (E) | E |
| Previous selection | `previous-selection` | Edit; Quick actions | Select | not a step | previous selection (E) | E |
| Select neighbors | `select-neighbors` | a node's, edge's or several elements' type row; Selection; the context menu | Select neighbors | not a step | select neighbors (E) | E |
| Select same value | `select-same` | an Attributes row's menu; a table cell's menu; Selection | Select | not a step | -- | E |
| Select members | `select-members` | a set's, path's, group's or found path's type row; the shared menu of several focused set, path or item rows | Select | not a step | -- | E |
| Enter to members, Back to object | `enter-members` | the keyboard, with one set, path or item selected | Select | not a step | Enter, Shift+Enter | E |
| Select painted, Select overridden | `select-painted` | a style layer's row icon; the Overrides row | Select | not a step | -- | E |
| Next finding, Previous finding | `next-finding` | a result's item tab, Members, a sorted column, Find's hits | Select | not a step | next finding (E) | E |
| Find | `find` | the Graph panel's Find | Select | not a step | find (A) | E>A |
| Zoom to selection | `zoom-selection` | View; the selection's context menu | View (camera) | not a step | zoom to selection (E) | E |
| Show in table | `show-in-table` | a selection's context menu | Chrome: opens the table on its Selected scope | not a step | -- | A |
| Switch to graph | `switch-graph` | a graph row | View | not a step | -- | E>A |
| Show filtered graph | `show-filtered` | the table's scope line, whenever the scope is not the filtered graph | Chrome: the table's scope | not a step | -- | E>A |

### 3.3 Sets, paths and the data

| Command | Id | Starting places | Operation | Undo label | Key | Owner |
|---|---|---|---|---|---|---|
| Create set | `create-set` | Selection; the selection's type row and context menu; a path's, group's or found path's type row; an item row's menu; Sets and paths' "+" | Create set | "Create set Hubs" | group (E) | E |
| Freeze as fixed set | `freeze-set` | a rule set's type row and overflow | Create set (fixed, from the rule's current members) | "Freeze Degree > 10 as fixed set" | -- | E |
| Create path | `create-path` | a found path's type row and, while it cannot be selected, its row's menu; Selection; the several-elements type row | Create path | "Create path Alice to Bob" | -- | E |
| Extend path | `extend-path` | a path's overflow, which arms the Path tool; the Path tool, armed with a path selected | Extend path | "Extend Layering route" | path tool key (E) | E |
| Create set to style, Create path to style | `keep-to-style` | an offered group's or found path's Appearance row | Create set or Create path, one command | "Create set Community 3" | -- | E |
| Create rule set | `create-rule-set` | a filter step's menu; the Filter steps header; a histogram band's menu; a value's menu; Find | Create set (rule) | "Create rule set Degree > 10" | -- | E |
| Union, Subtract, Intersect, Exclude | `combine` | the shared menu of focused set, path or item rows | set operation | "Intersect Watchlist and Hubs" | -- | E |
| Add to set, Take out of set | `set-members` | a fixed set's type row (Add to set) and overflow (Take out of set) | set edit | "Add 3 nodes to Hubs" | -- | E |
| Collapse, Expand, Collapse all | `collapse` | a set's or group's overflow; a partition editor's menu | toggle | "Collapse Hubs" | -- | E |
| Rename, Duplicate | `rename`, `duplicate` | a row's context menu; double-click (Rename) | rename, duplicate | "Rename Set 1 to Hubs" | rename, duplicate (E) | E |
| Delete | `delete` | Delete or Backspace on a focused row or a selected object; the context menu; the ungroup chord on a selected set, which also selects its members | delete | "Delete Hubs" | delete, ungroup (E) | E |
| Remove | `remove` | Delete or Backspace with elements selected and the canvas or a table row focused; the one-node, one-edge and several-elements overflow | Remove, a data version | "Remove 12 nodes" | delete (E) | E |
| Copy ids | `copy-ids` | Edit; the canvas and the table with elements selected | Copy ids (an output only) | not a step | copy (E) | E |
| Merge nodes | `merge-nodes` | Selection; the several-elements overflow; a pair row; the pair-list editor | Merge nodes | "Merge 3 nodes" | -- | E |
| Add attribute..., Correct values | `add-attribute`, `correct` | the "+" on any Attributes section; Selection; an Attributes row; a table cell | Add attribute; Correct | "Set status on 3 nodes" | -- | E |
| Add node, Add edge | `add-node` | the empty canvas's context menu; a pair row (Add edge) | data edit | "Add node" | -- | E |
| Partition by, Use as group names | `group-by` | a categorical column header | Declare | "Partition by region" | -- | E |

### 3.4 Filtering and hiding

| Command | Id | Starting places | Operation | Undo label | Key | Owner |
|---|---|---|---|---|---|---|
| Filter to, Filter out | `filter-to`, `filter-out` | Selection; the selection's type row, overflow and context menu; a set's, path's, group's or found path's type row (Filter to); a legend entry's menu; a histogram band's menu; a column header's menu on Nodes and Edges; Filter steps' "+" (with Largest component and k-core as presets; on a directed graph the preset reads Largest weakly connected component, with the strong variant in its split button) | filter step | "Filter to Type = X"; "Filter out 12 nodes" | -- | E |
| Filter to neighbors | `filter-neighbors` | Select neighbors' split button; Selection | filter step edit | "Filter to neighbors, 2 hops" | -- | E |
| Add selection to step | `add-to-step` | Selection; the several-elements overflow; a Find hit a step leaves out; a found path that leaves the filtered graph | filter step edit | "Add 3 nodes to step" | -- | E |
| Turn off step, Turn on step | `toggle-step` | a filter step's checkbox and menu | toggle | "Turn off Degree > 10" | -- | E |
| Search full graph | `search-full` | a search's result that found nothing in the filtered graph; a search's Scope field | Run a search | "Shortest path Alice to Bob in full graph" | -- | E |
| Fade others | `fade-others` | Selection; the selection's context menu | style edit: one ordinary layer over the complement of the selection, frozen as a fixed set, writing opacity only (`glossary.md` 9) | "Fade 990 others" | -- | E |
| Hide on canvas, Show on canvas | `hide-on-canvas`, `show-on-canvas` | Selection; the selection's overflow; a set's, path's, group's or found path's overflow; a legend entry's menu | visibility edit (door 86, Whether an element is drawn) | "Hide 40 nodes on canvas" | hide (E): with elements selected it runs Hide on canvas, or Show on canvas when every selected element is hidden | E |
| Hide others | `hide-others` | Selection; the selection's context menu | visibility edit, one step however many it hides | "Hide 990,000 others on canvas" | -- | E |
| Play, Pause | `play` | the time slider | View while playing; Pause commits the window | "Set window 2019 to 2020" | -- | E |

### 3.5 Runs and results

| Command | Id | Starting places | Operation | Undo label | Key | Owner |
|---|---|---|---|---|---|---|
| Run | `run` | a Catalog row, which opens and re-runs this graph's existing result of that algorithm when there is one (`conceptual-model.md` 4.3); Algorithms; a result editor's Run | Run | "Run PageRank"; while pending, "Cancel PageRank" | -- | E |
| Run as new result | `run-new` | a result's overflow | Run | "Run PageRank as new result" | -- | E |
| Re-run, Re-run all, Review out of date | `rerun` | a result's Out of date or Failed state; its menu; an out-of-date mark; the Results panel header. After WebGPU is lost the label reads Re-run on CPU, the same command naming its path (`glossary.md` 9) | Re-run, as a new run | "Re-run PageRank"; "Re-run PageRank on CPU"; "Re-run 12 results" | -- | E |
| Use current, Carry over to new run, Restore | `use-current`, `carry-over`, `restore` | the state line of the reference, partition or detached object | Use current; Carry over; Restore | "Restore set Hubs" | -- | E |
| Cancel | `cancel` | a run's row; the running notice; Undo while the run is pending | cancel | not a step | -- | E |
| Apply anyway | `apply-anyway` | a run's state line when its paint was suppressed | style edit | "Apply PageRank colors anyway" | -- | E |
| Shortest path from... | `shortest-path` | the toolbar's Path tool; a node's type row; Algorithms' Path; the Catalog's Path | Run a search | "Shortest path Alice to Bob" | path tool key (E) | E |
| Sweep parameter..., Profile groups | `sweep`, `profile-groups` | a result editor's menu | Run | "Sweep resolution of Louvain" | -- | E |
| New column: From expression..., Rank, Aggregate over neighbors... | `new-column` | a column header's New column submenu | Run, or an expression | "Add rank of PageRank" | -- | E |
| Over time... | `over-time` | the Statistics menu; a histogram's menu | Run (a series) | "Run degree over time" | -- | E |
| Compare with... | `compare` | a result's, set's, path's, group's, graph's or data version's type row, row actions, overflow or context menu; two focused runs' context menu; a result editor's menu; the time slider's menu | View (the comparison surface) | not a step | -- | E |
| Without this, Without each of... | `without` | Compare with...'s presets; a result editor's Scope | Run | "Run PageRank without Supplier X" | -- | E |
| Compare with randomized baseline... | `baseline` | a result's menu; a set's Statistics header menu, valid only for a statistic the set was not chosen by (`graph-conventions.md` 3) | Run | "Compare modularity with baseline" | -- | E |
| Save comparison | `save-comparison` | the comparison surface | Save comparison | "Save comparison" | -- | E |
| Combine graphs..., Bipartite projection..., Quotient graph..., Sample from null model..., Extract as graph | `transform`, `extract` | New graph from, in the context menus of a graph row, a column, a partition and a set collection; Extract as graph also on a set's and a path's overflow | Transform | "Extract Hubs as graph" | -- | E |

### 3.6 Style

| Command | Id | Starting places | Operation | Undo label | Key | Owner |
|---|---|---|---|---|---|---|
| Add style layer | `add-layer` | the Styles list's "+" | style edit | "Add style layer" | -- | E |
| Color by, Size by, Width by, Label with | `encode` | a result editor's Appearance; a column header's menu on Nodes and Edges; an Attributes row's menu | style edit | "Color by log fold change"; "Size by degree" | -- | E |
| Highlight | `highlight` | a result editor's Appearance, when its shape names a subset (a found path) | style edit | "Highlight shortest path" | -- | E |
| Look | `look` | the Look icon on the graph's property section header | style edit | "Use Look Print" | -- | E |
| Override | `override` | an Appearance row; the type row's overflow | style edit (the Overrides layer) | "Override color of 3 nodes" | -- | E |
| Clear all overrides | `clear-overrides` | the Overrides row; the graph's type-row overflow | style edit | "Clear all overrides" | -- | E |
| Fix at <value>, Edit a copy | `fix-at`, `edit-copy` | the encoding popover's header; an automatic layer's editor | style edit | "Fix size of Degree at 12" | -- | E |
| Reset, Reset to default, Clear | `reset` | a style or option row's menu; its minus button | style edit | "Reset color of Hubs" | -- | E |
| Fit domain to current scope, Treat as categories, Treat as numbers | `fit-domain`, `treat-as` | the encoding popover; a bound pill's menu | style edit; Declare | "Treat region as categories" | -- | E |
| Hide, Show | `toggle-eye` | the eye on a row that draws; the style-layer editor's header | toggle | "Hide Degree colors" | hide (A, issuing the element command) with a row focused | E |
| Move up, Move down | `move` | the context menu and overflow of a style layer, filter step, saved view or graph; the style-layer editor's header; a drag | reorder | "Move Hubs up" | -- | E |

### 3.7 Layout, notes and views

| Command | Id | Starting places | Operation | Undo label | Key | Owner |
|---|---|---|---|---|---|---|
| Run layout | `run-layout` | the graph's Layout row; the empty canvas's context menu | Run layout | "Run ForceAtlas2" | -- | E |
| Run layout | `lay-out` | a set's, path's, group's or partition's Layout row or overflow | Run layout, with that scope | "Run layout on Hubs" | -- | E |
| Stop | `stop` | the Layout row; the running notice | keeps the positions reached, inside the Run layout step (`interaction-patterns.md` 3.8) | not a step of its own | -- | E |
| Pin, Unpin, Unpin all | `pin` | a node's type row and context menu; the Position editor; the Layout row's pinned count (Unpin all) | Pin | "Pin Alice"; "Unpin all" | -- | E |
| Switch to 2D, Switch to 3D, Enter VR, Enter AR | `view-mode` | the view-mode control | layout-setting edit; View for VR and AR | "Switch to 3D" | -- | E |
| Add note | `add-note` | the toolbar's Note tool; an object's overflow; the graph's type-row menu; Selection | note edit | "Add note" | note tool key (E) | E |
| Save view | `save-view` | the Views section's "+"; View's Views submenu | Save view | "Save view Overview" | -- | E |
| Apply view | `apply-view` | a view row's context menu, first item; View's Views submenu | Apply view | "Apply view Overview" | -- | E |
| Update view, Revert view | `update-view` | a view's state line; its menu | view edit | "Update view Overview" | -- | E |

### 3.8 The view menu and the app

| Command | Id | Starting places | Operation | Undo label | Key | Owner |
|---|---|---|---|---|---|---|
| Labels on canvas, Show arrows, Legend | `toggle-captured` | View; the zoom and view menu | toggle, captured by a saved view | "Turn on labels on canvas" | -- | E |
| Note markers, Minimap | `toggle-reader` | View; the zoom and view menu | element transient state the app sets from a reader preference (`conceptual-model.md` 1.1) | not a step | -- | E>A |
| Additional labels, Follow selection, Table, Time slider | `toggle-chrome` | View; the zoom and view menu | Chrome | not a step | -- | A |
| Minimize UI, Quick actions..., Preferences, Shortcuts, Documentation | `app` | the main menu (Shortcuts and Documentation under its Help); the toolbar (Quick actions); the Help button | Chrome | not a step | minimize UI, quick actions (A) | A |
| AI provider... | `ai-provider` | Preferences; the reason line of the disabled Assistant button; Quick actions | Chrome: the reader's provider settings, written through the element's API | not a step | -- | E>A |
| Restart viewer | `restart-viewer` | the rendering-lost card | none: a renderer restart | not a step | -- | E |
| Done | `done` | Version history; the comparison surface; a read-only project's line | Chrome: leaves the mode | not a step | -- | E>A |
| Memory usage | `memory` | the main menu's Help | Chrome: a reading of the element's memory budget | not a step | -- | E>A |

### 3.9 Commands a state or a notice offers

The verbs `state-matrix.md` 3, `message-catalog.md` and `glossary.md` 10 attach to a state; each
is registered here once, and a state that names a verb not in this table is wrong.

| Command | Id | Starting places | Operation | Undo label | Key | Owner |
|---|---|---|---|---|---|---|
| Narrow the graph... | `narrow-graph` | the not-drawn line past the drawing limit; the load step's size notice | opens the filter chip's popover of offered steps; the label says every number changes | not a step | -- | E>A |
| Select hidden, Show all | `select-hidden`, `show-all` | the not-drawn line, when elements are hidden | Select; Show on canvas on every hidden element | not a step; "Show 40 nodes on canvas" | -- | E |
| Filter to drawn | `filter-drawn` | the Layout row, when hidden nodes would be read past what a layout can handle (`state-matrix.md` 4.2) | filter step, keeping what is drawn | "Filter to 1,200 drawn nodes" | -- | E |
| Edit current version, Take over editing | `edit-current`, `take-lease` | the read-only line beside the project name | Chrome: leaves read-only; takes the autosave lease | not a step | -- | E>A |
| Reconnect | `reconnect` | a disconnected graph's row and type row | Load, re-querying its source | "Reconnect STRING" | -- | E>A |
| Run exactly | `run-exact` | an over-budget refusal; a sampled result's state line | Run, the exact method | "Run Betweenness exactly" | -- | E |
| Run for all windows | `run-windows` | the time slider's not-current track | Run over the list of windows | "Run PageRank for 12 windows" | -- | E |
| Compare with previous window | `compare-window` | the time slider's overflow | Compare with... | not a step | -- | E |
| Change parameters | `change-parameters` | a created-unrun or failed result's row | opens its editor | not a step | -- | E>A |
| New seed | `new-seed` | a seed field's trailing slot | parameter edit | "New seed for Louvain" | -- | E |
| Show import, Show references, Show result, Show results | `show-source` | the notice that reports it | Chrome: opens the source | not a step | -- | A |
| Ignore direction | `ignore-direction` | a path search that found nothing along directions | Run a search, undirected | "Shortest path Alice to Bob, ignoring direction" | -- | E |
| Show all columns | `show-columns` | the load step | Chrome | not a step | -- | E>A |
| Send again, Report problem | `resend`, `report` | the Assistant's error; an internal fault's notice | Chrome | not a step | -- | A |

## 4. Relationships and their routes

Every relationship in the object map that an analyst walks, with the route each way
(`information-architecture.md` 5). A relationship with no route is a hole; a route marked "waits"
leaves the first-click tally until graphty-element supplies it.

| Relationship | Forward route | Back route |
|---|---|---|
| a count and what it counts | the number acts as `interaction-pattern-entries.md` 4.3 says (provisional: it selects what it counts) | the table's scope line names the count |
| result to run | disclosure in the Results panel | a run's Created from names its result |
| run to its values and items | the result editor, then the table | an item's Created from names its run |
| attribute to the run that wrote it | the column header and value row name the run | the run lists the columns it wrote |
| result to its catalog entry | the editor's name opens the entry's description | the entry lists this project's results of it |
| style layer to the run that made it | the layer's origin names the run | the result's Appearance lists its layer |
| painted value to its layer | a value row names the layer that paints it | a layer's Select painted selects what it paints |
| style layer to its selector | the selector row opens its inline rule in the editor, or the kept set it references (`conceptual-model.md` 4.1) | a kept set's Used by lists the layers that reference it |
| run to a suggestion it did not paint | the run names the layer that holds the channel | the layer lists the runs it suppressed |
| filter step to its rule | the step's rule row opens its inline rule, or the kept set it references | a kept set's Used by lists the steps that reference it |
| set to what made it | a set's Created from | the source's Used by |
| object to what depends on it | Used by, one counted row | each dependent's Created from |
| element to its memberships | the element's Memberships | a set's or group's Members |
| node to its neighbors | the Connections neighbor count; Select neighbors | each neighbor's own Connections count |
| node to its incident edges | the Connections edge count, which selects them; the Edges tab shows them under Selected | an edge's Endpoints |
| note to its targets, when they are elements or kept objects | selecting a note selects its targets | a target's Notes section |
| note to a definition it is about (a result, filter step, style layer, rule set) | choosing the note opens that definition's editor | the editor's Notes row |
| note to the graph | choosing the note switches to the graph with nothing selected | the nothing-selected inspector's Notes section |
| recipe to what it brought | its Version history entry lists what it added | the Source facet of the Results panel and the Styles list, set to the recipe |
| view to its graphs | the view's editor names its graphs | a graph's row counts the views that show it |
| derived graph to its source | its Created from | its source's Used by |
| graph to its data versions | the graph row's Version history | a version's entry names its graph |
| run to the scope it read | the run's state line names its scope | the chip marks results computed on another scope |
| a what-if to its baseline run | Without this or Without each of... in a result editor's Scope, which keeps the baseline and shows the difference | the what-if names its baseline run |
| element or value to the data that brought it in | the element's source row names the data version and its file (waits: the source attribute, `element-needs.md`) | a version entry's element count opens the table on what it added |
| legend entry to its elements | choosing an entry selects what it encodes; Filter to and Filter out are verbs on the entry | an element's value row names its layer |
| data version to its import report | its Version history entry | the graph's Last import row |
| element to its values across windows | its value row opens the series editor filtered to it | a mover row in the series editor selects the element |
| pinned node to the layout that left it | the Layout row's pinned count, as every count (`interaction-pattern-entries.md` 4.3) | a pinned node's inspector names the pin |

## 5. Rejected and deferred

Single features and outputs refused or postponed, each with its reason. Structural rejections are
in `information-architecture.md` 11. Carried from the earlier long form's gap register; a row not
here is not held.

| Feature | Decision and reason |
|---|---|
| Present mode | rejected: presenting is Export (`figma-crosswalk.md` 4.1, "Share is the filled header button") |
| An in-app script console | rejected: graphty-element's session API is the scripting surface, documented under Help |
| An executable script export of the history, or restoring by double-clicking the log | rejected: a recipe replays the analysis on new data |
| Split a merged node after later work | rejected: undo, or Replace data from a corrected source; the forwarding map keeps the option open |
| A selection that remembers how it was made, Convert to rule | rejected: one visible selection would behave two ways; Create rule set sits wherever the rule is on screen |
| Attributes on a set itself | rejected: a set's name and rule are its properties; members are written by Select members, then "+" |
| A heat map of member values | rejected as a view: the table scoped to the selection is the reading; Export table feeds heat-map tools |
| Pie or donut charts on nodes for membership | rejected: Memberships reads several memberships; a pie is not legible at drawn node sizes |
| Animate along a path | deferred: the video format's camera path runs through saved views |
| A CSV of the degree distribution's bins | rejected: Export table writes the degree column; binning is a drawing choice |
| A p-value on a selection chosen by the statistic being tested | rejected: a set picked because it looked dense always beats a baseline on density; a baseline is valid only for a statistic the set was not chosen by, and its record says how the set was chosen (`graph-conventions.md` 3) |
| Fit power law | deferred until `graph-conventions.md` specifies the fit: the exponent with x_min, the tail size, a goodness-of-fit p-value and the likelihood ratio against a log-normal, refused below a stated tail size; a bare exponent is the field's commonest misreading |
| A Findings row on the dataset | rejected as a list of suggestions; the mark rows in Statistics carry what must be seen |
| Moving or collapsing the legend | rejected: no workflow step needs it; its toggle and fixed corner cover the need |
| Save Find as result | rejected: it added a result kind the model does not have; Create rule set keeps a Find, and Compare with... on the rule set reads how its hits changed |
| Drawing filtered-out elements faintly | rejected: a filtered-out element is not in the graph being read; fading what is not of interest is a style layer, and hiding it while it still counts is Hide on canvas |
| A notes-only file | rejected: notes on elements are keyed by element ids and travel in a project; notes on definitions travel in a recipe (`files-and-recipes.md` 1) |
| Performance mode | rejected: the per-concern scale readings already reduce detail, and a second switch would be a mode that changes the drawing without a reason on screen |
| An undo history list | kept until graphty-element restores a canceled run on Redo; then removed (`glossary.md` 13, Undo history) |
| A file above the drawing limit: choose a subset first | rejected: the load commits and analysis sees every node; the canvas says what is not drawn |
| A report in Markdown | rejected: HTML carries the same text with its figures; PDF covers print |
| Upload to a public repository (NDEx) | deferred until graph-io writes CX |
| Node embeddings; recommendation evaluation | rejected (`conceptual-model.md` 1.5): scalar features and pair lists export through Export table |
| Pattern search, match lists | withdrawn: no element algorithm (`information-architecture.md` 11) |
| A preview gate before import (rejected in the long form) | withdrawn: reversed by the load step |
| Saving a style for use elsewhere (deferred in the long form) | withdrawn: answered by Export style and recipes |

## Sources

- `design/ui/framework/information-architecture.md`; `conceptual-model.md` 1.3, 1.5; `files-and-recipes.md` 1
- `design/designloom/capabilities/*.yaml`
- `design/ui/framework/research/archive/information-architecture-long-form.md` 7 and 11, the
  record these rows were first placed in
- `interaction-patterns.md` 1.1 and the undo design's command labels (`design/undo/undo-design.md` 4.1 on branch feat/element-undo), for
  the Operation and Undo label columns
- Open decisions cited (`one-way-doors.md`): 61, Caveats and missing values in exports
