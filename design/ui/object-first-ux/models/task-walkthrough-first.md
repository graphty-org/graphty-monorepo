# An object-first graphty, derived from the workflows

This document proposes an object model and an interaction model for a graphty app built the
way Figma is built: a tree of things on the left, the properties of the selected thing on the
right, and creation verbs in one small toolbar. It was written by walking every one of the 25
workflows in `design/designloom/workflows/` step by step under that model and letting the
object types, the tools and the inspector sections fall out of what each step needed. The
walkthroughs are section 2; everything after it is what they produced.

It is written for an engineer who is not a UX designer. Every design term is defined the first
time it is used. Measurements and control names come from the measured Figma study in
`design/ui/figma/` (`components.md`, `flows.md`); element capabilities come from
`design/ui/object-first-ux/inventory/element-capabilities.md`; the app as it is today and the
persona summaries come from `design/ui/object-first-ux/inventory/app-today-and-personas.md`.
Issue numbers (`#149`) are graphty-org/graphty-monorepo issues.

## 0. Terms

- **Object.** A thing the reader made from the data and can select, name, colour, hide, lock,
  reorder and delete: a group, a path, a filter, a ranking. Nodes and edges are NOT objects
  in this sense; they are the **material** the objects are made of, as pixels are the material
  of a Figma layer.
- **Tree.** The list on the left, one row per object, with nesting. Figma calls it Layers.
- **Inspector.** The panel on the right. It always shows the properties of the selected object,
  or of the dataset when nothing is selected. Figma calls it the properties panel.
- **Toolbar.** The floating bar at the bottom of the canvas holding the creation verbs.
- **Fill.** An object's appearance: which colours, sizes, shapes and labels its members get. It
  is stored as a graphty-element style layer; the reader never sees the layer, only the Fill
  rows of the object.
- **Precedence.** When one node belongs to two objects that both set colour, which colour wins.
  In this model the answer is always the tree order: the object nearer the top wins, exactly as
  a Figma layer nearer the top of the Layers list paints on top.
- **Set.** An object that is a collection of nodes and/or edges (a group, a path, a filter
  result, a neighbourhood, a picked list).
- **Measure.** An object that is one value per node or per edge (degree, PageRank, log fold
  change, a custom score). Its Fill is a scale (a colour ramp or a size range), not one colour.
- **Partition.** An object that is one label per node (community 3, component 2, type "person")
  and therefore also a family of Sets, one per label. It shows in the tree as a parent row with
  one child row per group.
- **State.** Every object is current, stale, computing or failed. Stale means the data or an
  object it depends on changed after it was computed.
- **Scope.** Which elements a tool looks at: the whole graph, what is visible, the selection,
  or the members of an object. "Within Group 2" means scope = the members of Group 2.
- **Selection.** The transient set of nodes and edges currently picked on the canvas or in the
  table. It is not an object until the reader saves it as one.
- **Paint row.** Figma's 32 px row for one fill: a colour chit, a hex field, an opacity field,
  an eye, and a minus. Reused here for every appearance channel.
- **Section.** A titled block of inspector rows with a 40 px header (title at 11 px weight 550)
  and optional action icons at the right ("+", settings).
- **Popover.** A 240 px light panel that opens to the left of the inspector, flush with it,
  for a control that does not fit in a row (a colour picker, a rule composer).
- **Flyout.** The dark menu that opens above a toolbar group to pick which tool in the group.
- **Two-way hover link.** Hovering a tree row highlights its members on the canvas, and
  hovering a node on the canvas highlights the rows of the objects it belongs to.

## 1. The frame

```
+------------------------------------------------------------------------------------+
| [=] Karate Club                    [Search and commands  Ctrl+K]    [100% v] [Share]|
+------------------+---------------------------------------------------+-------------+
| Views            |                                                   | INSPECTOR   |
|  Overview     *  |                                                   |             |
|  Bridges close-up|                     CANVAS                        | properties  |
| Objects       [+]|                                                   | of the      |
|  Karate Club     |                                                   | selected    |
|   Path: Mr. Hi ->|                                                   | object, or  |
|   Communities  * |                                                   | of the      |
|     Group 1      |                                                   | dataset     |
|     Group 2      |                                                   |             |
|   Degree > 10    |       [V][H] | [F][G][P][R][N] | [C]   [2D 3D]    |             |
|   Connections    +---------------------------------------------------+             |
|      240         |  Table dock (Shift+T): members / values of the    |    240      |
|                  |  selected object, or all nodes                    |             |
+------------------+---------------------------------------------------+-------------+
| 34 nodes 78 edges   Spread Out: settled [pause]   Bridges 42% [cancel]   1 selected |
+------------------------------------------------------------------------------------+
```

- Left, 240 px: two groups, **Views** (saved camera and visibility states; Figma's Pages slot)
  and **Objects** (the tree). The dataset is the root row; every object nests under it.
- Right, 240 px: the inspector. It has exactly two identities: the selected object (or node,
  or "N selected"), or the dataset.
- Bottom centre: the toolbar. Two tool groups plus the comment tool and the 2D/3D switch. Tools
  are the only task-first surface, and, as in Figma, the tool snaps back to Move when its
  object exists.
- Top bar: the dataset name (the file menu behind it), the palette (Ctrl+K), the zoom menu
  (Figma's "100%" menu: fit, presets, 2D/3D, VR/AR), and the one filled primary button, Share.
- Status bar: counts, the layout state with a transport, the computing queue, the selection.
- Nothing floats on the canvas but the toolbar, note pins, and (on request) the legend and
  minimap. No suggestion cards.

## 2. The walkthroughs

Every workflow's phases, one row each: what the reader does, what the model gives them, and
how well it fits. "good" means the step is one selection and one or two rows; "ok" means it
works with an extra step; "awkward" and "no" are flags collected in section 10. Persona
abbreviations: Elena (novice), Alex (weekly analyst), Emma (expert), Sarah (fraud), Marcus
(intelligence), Priya S (threat hunter), Dr Chen (bioinformatics), Priya R (genomics),
Jordan (marketing), David (supply chain), Chris (recommender), Dr Kim (knowledge graphs).

### W01 First exploration, quick data assessment (Elena, Alex, Emma, Sarah, Marcus, Dr Chen)

| Step                 | Under the object model                                                                                                                                              | Fit                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Size assessment      | Nothing selected: the dataset inspector's **Data** section reads "34 nodes, 78 edges, 1 connected part"; the status bar repeats the counts                          | good                                                                   |
| Structure check      | Same section: Direction "Undirected (from file)", Weighted "yes (weight)", Self-loops, Parallel edges                                                               | good                                                                   |
| Distribution scan    | **Rank** tool > Connections creates the Measure "Connections"; its inspector **Values** section shows the histogram and "top 5"                                     | good; degree is instant, so this is the first object most readers make |
| Sample inspection    | Table dock (Shift+T) shows all nodes with every column; click a row to select the node                                                                              | good                                                                   |
| Attribute assessment | Dataset inspector **Columns** section: one row per attribute with type, completeness bar, unique count; each row's "..." offers "Colour by", "Filter by", "Size by" | good                                                                   |

### W02 Visual exploration, overview to detail (Elena, Alex, Emma)

| Step                          | Under the object model                                                                                                                                                       | Fit                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Overview                      | Fit to graph (0); Views > Overview is the default view                                                                                                                       | good                                                             |
| Zoom                          | Wheel and drag; zoom menu presets                                                                                                                                            | good, once the element zooms toward the cursor (#290)            |
| Filter                        | **Filter** tool opens the rule composer; the resulting Filter set appears in the tree; its eye hides non-members ("Hide the rest" is a property of a Filter, off by default) | good                                                             |
| Details on demand             | Click a node: the node inspector shows Attributes, Belongs to, Values, Connections                                                                                           | good                                                             |
| Orientation, return to a view | Views > "+ Save view" remembers camera and which objects are visible                                                                                                         | good                                                             |
| Hover highlight               | Two-way hover link; hovering a node also outlines its neighbours                                                                                                             | ok; the element has no hover highlight yet (inventory section 2) |

### W03 Iterative analysis cycle (Alex, Emma, Dr Chen)

| Step                 | Under the object model                                                                                                                                | Fit                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Question             | Nothing to build; a Note on the dataset ("Question: ...") records it                                                                                  | ok                                                                 |
| Explore encodings    | Make Measures with Rank; switch which one paints by reordering or by toggling eyes; drag "Influence" above "Connections" and colour follows Influence | good; the tree IS the encoding switch                              |
| Hypothesise          | Note on an object                                                                                                                                     | ok                                                                 |
| Test with algorithms | Rank, Find groups; each run is an object with parameters and caveats in **Made by**                                                                   | good                                                               |
| Refine and document  | **Made by** > "Copy as methods text"; the object tree is the analysis record                                                                          | good for the record; the replayable journal is element work (#145) |
| Compare results      | Two Measures side by side: the Table dock with both value columns; the node inspector's **Values** lists every Measure's value for the node           | ok; a true comparison view is section 9, fit 5                     |

### W04 Community analysis (Alex, Emma, Sarah, Jordan)

| Step                      | Under the object model                                                                                                                                                                      | Fit                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Detect                    | **Find groups** tool (Louvain default; flyout for Leiden, Label propagation, Girvan-Newman, Separate pieces) creates the Partition "Communities" with child Groups                          | good                                                                              |
| Validate modularity       | Partition inspector **Summary**: "6 groups, modularity 0.36"; the "?" reveals the plain reading                                                                                             | good                                                                              |
| Characterise each group   | Select "Group 2": **Members** (12 nodes, density), **Profile** (dominant values per column)                                                                                                 | good for size and density; the per-group attribute profile is element work (#193) |
| Bridge nodes              | Rank > Bridges (betweenness) over the whole graph, then "Top 10" child set; nodes in the top 10 that sit in two groups' neighbourhoods are visible because the path and group fills overlap | ok                                                                                |
| Inter-community structure | Not expressible as an object today: needs a "group graph" (one node per community)                                                                                                          | no; flag                                                                          |

### W05 Path investigation (Sarah, Marcus, Alex)

| Step                      | Under the object model                                                                                                                            | Fit                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Pick source and target    | **Path** tool: click A, click B (or Ctrl+F to find A by name, then P from its inspector "Path from here")                                         | good; a drawing tool with two clicks |
| Path finding              | The Path object appears, selected; **Steps** section lists each hop with the edge type                                                            | good                                 |
| Compare alternative paths | Path inspector **Rule**: "Shortest" or "All paths up to N hops" (element #329); the latter creates a Path per route, nested under "Paths: A -> B" | ok                                   |
| Show in context           | Neighbourhood tool on the path's members ("+ Neighbourhood" in the Path inspector) creates a child set; its eye hides the rest                    | good                                 |
| Interpret intermediates   | Click each hop in **Steps** to select the node                                                                                                    | good                                 |
| Not connected             | Path object with state failed and reason "No route"                                                                                               | good                                 |

### W06 Fraud ring investigation (Sarah)

| Step                    | Under the object model                                                                                                 | Fit                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Contextualise the alert | Ctrl+F the account id; **Neighbourhood** tool with depth 2 makes "Around acct-4471"; "Hide the rest" on                | good                                      |
| Pattern recognition     | Filter by rule within that set (shared device, same address); a **Pattern** tool (motif search) is proposed, not built | ok for rule filters; pattern search is no |
| Ring identification     | Increase the Neighbourhood depth in its inspector (live object, re-evaluates)                                          | good                                      |
| Risk scoring            | A Measure of kind formula ("computed attribute") combining degree, velocity, shared ids                                | awkward: computed attributes are proposed |
| Evidence documentation  | Notes on nodes, on the Path, on the set; **Export** > "Members as CSV", image of the object                            | good                                      |
| Timeline                | A **Time window** set (section 3.9) with the transport in the status bar                                               | ok                                        |

### W07 Threat hunting (Priya S)

| Step                            | Under the object model                                                                               | Fit                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Hypothesis, pattern translation | A Filter rule in the expression language; a saved Filter is the reusable query                       | good once the query engine exists (#149) |
| Query execution                 | Filter object; count in the row ("312 nodes")                                                        | good                                     |
| Triage                          | Table dock of the Filter's members, sorted; click through                                            | good                                     |
| Iterate                         | Edit the rule in the Filter inspector; the object re-evaluates                                       | good                                     |
| Save and reuse                  | Filters persist in the project; "Recipes" (section 8.8) replay across datasets                       | ok; project files are #301               |
| 100,000+ nodes                  | Render limits are published but not enforced (#302); "Hide the rest" is what keeps the canvas usable | awkward                                  |

### W08 Drug target discovery (Dr Chen)

| Step                      | Under the object model                                                     | Fit                                |
| ------------------------- | -------------------------------------------------------------------------- | ---------------------------------- |
| Build the disease network | Import; join drug-target and expression tables (**Data** > "Join a table") | ok; join is #298                   |
| Module definition         | Neighbourhood of the disease gene set ("within N steps of Set X")          | good                               |
| Prioritise                | Several Measures; a formula Measure combines them; "Top 20" child set      | awkward: formula measures proposed |
| Validate                  | Notes and joined columns in the table                                      | ok                                 |
| Candidate selection       | Save the selection as a Picked set "Candidates"; Export members CSV        | good                               |

### W09 Criminal network analysis (Marcus)

| Step                     | Under the object model                                                                              | Fit                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Case initialisation      | New dataset; Notes on the dataset                                                                   | ok                                                                                  |
| Data integration         | Import several files with "Add to current"; join tables                                             | ok; merge-capable load is element work                                              |
| Resolve duplicates       | Select two nodes > "Merge"                                                                          | no: node merging is a data edit, not an object; proposed, needs an inverse for undo |
| Structural analysis      | Rank (degree, betweenness, eigenvector), Find groups                                                | good                                                                                |
| Vulnerability assessment | A **Without X** scenario: Filter "hide these" plus Measures re-run within it, compared in the table | awkward; section 9 fit 5                                                            |
| Briefings                | Views for each figure; Export image with legend                                                     | good                                                                                |

### W10 Influencer identification (Jordan)

| Step             | Under the object model                                                        | Fit                        |
| ---------------- | ----------------------------------------------------------------------------- | -------------------------- |
| Define influence | Nothing to build                                                              | -                          |
| Compute metrics  | Rank tool four times, or Rank > "Several..." runs a batch; four Measures      | good                       |
| Segment by type  | Filter rules over Measures ("Bridges rank <= 100 and Connections rank > 500") | good with #149             |
| Validate         | Table with all Measure columns plus data columns                              | good                       |
| Rank and select  | Top N sets; Export CSV                                                        | good                       |
| 1,000,000 nodes  | Above the render ceiling                                                      | awkward; not a UX question |

### W11 Supply chain risk (David)

| Step                | Under the object model                                             | Fit                      |
| ------------------- | ------------------------------------------------------------------ | ------------------------ |
| Network mapping     | Import; Partition by the "tier" column (Find groups > "By column") | good                     |
| Dependency analysis | Filter by region; Partition by region                              | good                     |
| Bottlenecks         | Rank > Bridges                                                     | good                     |
| Scenario modelling  | "Without X" scenario                                               | awkward; section 9 fit 5 |
| Hierarchical layout | Dataset > **Arrangement** > Tree, root = a picked node             | good                     |

### W12 Anomaly detection (Sarah, Priya S, Alex)

| Step                 | Under the object model                                                                            | Fit            |
| -------------------- | ------------------------------------------------------------------------------------------------- | -------------- |
| Baseline             | Measures; histograms in each Measure's **Values** section                                         | good           |
| Statistical outliers | Filter "Connections value > mean + 3 sd" (the rule composer offers "above N standard deviations") | good with #149 |
| Structural outliers  | Clustering coefficient Measure (#330)                                                             | ok when built  |
| Triage               | Table of the Filter's members                                                                     | good           |
| Investigate          | Neighbourhood per anomaly                                                                         | good           |
| Classify             | A Picked set per label ("Errors", "Threats") built by adding selected nodes to a set              | good           |

### W13 Knowledge graph construction (Dr Kim)

| Step                | Under the object model                                                              | Fit           |
| ------------------- | ----------------------------------------------------------------------------------- | ------------- |
| Schema design       | Dataset **Columns** with the type role (#299); a schema view is a Partition by type | ok            |
| Extraction, mapping | Outside the app                                                                     | -             |
| Entity resolution   | Merge duplicates                                                                    | no, as W09    |
| Quality validation  | Filters for orphans, missing values; Separate pieces Partition                      | good          |
| Deployment, export  | Export data (element has no exporters wired yet)                                    | ok when built |

### W14 First-time onboarding (Elena)

| Step                | Under the object model                                                                                                                                                  | Fit                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Arrival             | Welcome sheet over the empty canvas: one primary button, a drop zone, samples                                                                                           | good (kept from today)                               |
| Load                | Import dialog with a preview                                                                                                                                            | good                                                 |
| First visualisation | Graph drawn; dataset inspector reads "34 nodes, 78 edges"; the tree shows only the root                                                                                 | good                                                 |
| Guided tries        | The empty Objects group shows three suggestion rows in place of "no objects yet": "Find groups", "Rank by connections", "Search"; each is the same as pressing the tool | good: guidance in one place, on the empty state only |
| First analysis      | Click "Find groups": the Partition appears, coloured, selected; the inspector's "?" gives the plain reading                                                             | good                                                 |
| Next steps          | Help menu > "Show suggestions" restores the rows; the tool tooltips carry one sentence each                                                                             | good                                                 |

### W15 Findings communication (Alex, Emma, Sarah, Marcus)

| Step                        | Under the object model                                                                          | Fit                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Audience, message           | -                                                                                               | -                                                     |
| Filter, highlight, annotate | Eyes on the tree decide what shows; reorder decides what paints on top; Note pins on the canvas | good; this is what the tree is for                    |
| Narrative                   | Notes ordered as a list in the Notes panel                                                      | ok                                                    |
| Production                  | Share > Export image (with legend), Export report                                               | good; legend in the image is #292, report is proposed |
| Validation                  | Views to switch between figure states                                                           | good                                                  |

### W16 Graph-based recommendation (Chris)

| Step                     | Under the object model                                                         | Fit                                               |
| ------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| Bipartite graph          | Import; Partition "Sides" from Best pairing                                    | ok                                                |
| Graph features           | Measures; clustering coefficient                                               | ok                                                |
| Similarity, pair scoring | Link prediction produces a pair list, a **Table** object (no canvas footprint) | ok; the Table object type exists for exactly this |
| Evaluation, deployment   | Outside the app                                                                | -                                                 |

### W17 Hub investigation (Alex, Sarah, Marcus)

| Step                         | Under the object model                                                                           | Fit                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Identify hubs                | Rank > Connections; Top 10 child set                                                             | good                                 |
| Ego network                  | Select a hub; Neighbourhood tool depth 1; "Hide the rest"                                        | good                                 |
| Attribute analysis           | Neighbourhood inspector **Profile** (selection statistics: mean, median against the whole graph) | good; `selection.statistics()` ships |
| Temporal growth              | Time window                                                                                      | ok                                   |
| Role classification          | Note or a Picked set per role                                                                    | ok                                   |
| Radial layout around the hub | Arrangement > Rings by distance, root = the hub (layout declared, unserved)                      | ok when built                        |

### W18 Data import and validation (Elena, Alex, Emma)

| Step                                         | Under the object model                                                                                           | Fit                |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ |
| Source, format, field mapping, preview, load | The import dialog: the one guided flow, unchanged in spirit                                                      | good               |
| Validation, quality report                   | Dataset inspector **Data** > "Import report" row (records kept, rejected, repeated) and **Columns** completeness | good               |
| Progress, cancel                             | Status bar computing slot                                                                                        | ok; cancel is #296 |

### W19 Network evolution (Alex, Emma, Dr Chen)

| Step                     | Under the object model                                                                    | Fit                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Time segmentation        | Time window set with a step                                                               | ok                                                                                      |
| Metrics per window       | Measures re-run per step (#300 playback with re-run) produce a **Table** object of series | awkward: a run per step is a batch of objects or one table; the model prefers one Table |
| Change detection, trends | Table dock chart                                                                          | ok when built                                                                           |
| Community evolution      | No object for "how groups changed between windows"                                        | no; flag                                                                                |

### W20 Gene list to interaction network (Priya R, Dr Chen)

| Step                       | Under the object model                                                                                                                                  | Fit                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Get the network            | Import edge list (STRING fetch is outside scope)                                                                                                        | ok                                        |
| Trim to the connected part | Find groups > Separate pieces; select "Part 1 (largest)"; **Focus** on it (section 4.6) so it is the working network                                    | good                                      |
| Join the data table        | Dataset > **Data** > "Join a table": key column picker, then "412 matched, 38 unmatched (list)"                                                         | ok; #298                                  |
| Encode measurements        | Columns > logFC "..." > "Colour by": creates the Measure "logFC" whose Fill is a diverging ramp centred on 0, Missing = grey; "Size by" a second column | good; this is the direct-manipulation win |
| Driver genes thicker       | Picked set "Drivers" with Fill: Outline 2 px; placed above the Measure in the tree                                                                      | good                                      |
| Lay out and read           | Arrangement; click nodes                                                                                                                                | good                                      |
| Save the figure            | Share > Export image with legend; Export node table                                                                                                     | good when #292 lands                      |

### W21 Cluster and annotate (Priya R, Dr Chen)

| Step                        | Under the object model                                                                                                             | Fit                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Cluster                     | Find groups (MCL not available; Louvain or Leiden)                                                                                 | ok                                                                                 |
| Inspect clusters as a table | Partition inspector **Groups** table sorted by size; click selects the group; "Hide groups smaller than 4" is a Partition property | good                                                                               |
| Annotate each cluster       | Rename the Group row (Ctrl+R); a Note per group; enrichment needs an external service                                              | rename good; enrichment no                                                         |
| Show terms on the map       | Group label channel in the Group's Fill ("Label: Ribosome biogenesis")                                                             | ok; a per-group label is a set label, which the element does not have as a channel |
| Export                      | Partition **Export** > "Membership as CSV"                                                                                         | good                                                                               |

### W22 Enrichment map (Priya R, Dr Chen)

| Step            | Under the object model                                                                              | Fit                                  |
| --------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Build the map   | Import as edge list; Measures from columns (size by set size, colour by NES, edge width by overlap) | good                                 |
| Explore         | Ctrl+F a gene finds every pathway node whose gene list contains it (text search over a column)      | good with #149                       |
| Tune thresholds | Filter set with two range rules; live count in the row                                              | good                                 |
| Name themes     | Find groups; rename groups; collapse a group into one node                                          | rename good; collapse no (data edit) |
| Publish         | Export image with legend; Made by parameters                                                        | good                                 |

### W23 Hub gene ranking (Priya R, Dr Chen)

| Step             | Under the object model                                                                                    | Fit                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Several rankings | Rank > "Several..." batch: five Measures                                                                  | good                                               |
| Distributions    | Each Measure's histogram                                                                                  | good                                               |
| Combine          | Each Measure gets a "Top 10" child set; a **Combination** object "In all of..." (intersect) of those sets | good; the combination is Figma's boolean operation |
| In context       | Select the Combination; Neighbourhood depth 1                                                             | good                                               |
| Report           | Combination Fill: Label on; Export the table with every Measure as a column                               | good                                               |

### W24 Condition comparison (Priya R, Dr Chen)

| Step               | Under the object model                                 | Fit                                              |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------ |
| Load both          | A second dataset root in the tree                      | awkward: the element holds one graph per session |
| Merge              | Union, intersection, difference between two datasets   | no today (network collections)                   |
| Compare statistics | Two dataset inspectors                                 | awkward                                          |
| Rewired genes      | A Measure in each, a formula Measure of the difference | awkward                                          |
| Side by side       | Compare mode: two canvases, linked cameras             | proposed (#186)                                  |

### W25 Reproducible session (Priya R, Dr Chen)

| Step                | Under the object model                                                                    | Fit                                  |
| ------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------ |
| Tidy                | Rename rows, delete dead objects, name Views                                              | good; the tree makes tidying visible |
| Record parameters   | Every object's **Made by** section; dataset **Export** > "Methods text" concatenates them | good                                 |
| Save the session    | Project file                                                                              | ok; #301                             |
| Export deliverables | Share menu                                                                                | good                                 |
| Share with metadata | Outside scope (NDEx)                                                                      | -                                    |

## 3. The object types

Every object has the same skeleton, so the tree and the inspector can treat them alike:

| Property          | Meaning                                                                                             | Where it shows                                               |
| ----------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Name              | Editable (double-click or Ctrl+R in the row)                                                        | Tree row, inspector title                                    |
| Kind              | Set, Measure, Partition, Group, Combination, Table, View, Note                                      | Type icon in the row                                         |
| Definition        | What makes it: a rule, seeds and depth, an algorithm and its options, a column                      | Inspector **Rule** or **Parameters** section                 |
| Scope             | Which elements the definition looked at (whole graph, visible, within an object)                    | Inspector, one row under the definition; nesting in the tree |
| Members or values | The result                                                                                          | Inspector **Members** / **Values**; the Table dock           |
| Fill              | Appearance of the members                                                                           | Inspector **Fill** section; a swatch in the tree row         |
| Visible           | The eye. Off hides the object's Fill and, for a Filter with "Hide the rest", shows everything again | Tree row toggle                                              |
| Locked            | The lock. Members cannot be selected or dragged on the canvas through this object                   | Tree row toggle                                              |
| State             | current, stale, computing (with progress), failed (with reason)                                     | A dot at the right of the row; the first line of **Made by** |
| Made by           | Provenance: algorithm, parameters, scope size, time, engine, caveats                                | Inspector **Made by** section                                |
| Notes             | Attached notes                                                                                      | Inspector **Notes** section                                  |

### 3.1 Dataset (the root)

What it is: the loaded graph. One per tree today; a second root is how comparison would appear.
Created by: the import dialog, a sample, a URL, paste, or drag-and-drop.
Properties: name, source, format, import options and report, direction, the column list with
roles (id, label, weight, time, type), joined tables, the arrangement (layout), the default
look (the element's base layers), canvas settings.
State: loading (with progress), loaded. It never goes stale; it is what everything else is
stale against.
Deleted by: File > Close, which asks because it removes every object under it.

### 3.2 Set

What it is: nodes and/or edges. Five sub-kinds, differing only in their **Rule** section:

| Sub-kind      | Definition                                                                                                                      | Created by                                                 | Live?                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| Filter        | A rule: range, categories, degree band, expression, "above N standard deviations" of a Measure, top N of a Measure, combinators | Filter tool; a column's "Filter by"; a Measure's "+ Top N" | yes, re-evaluates on data change               |
| Neighbourhood | Seeds plus depth plus direction                                                                                                 | Neighbourhood tool; a node's "Neighbourhood" action        | yes                                            |
| Path          | Source, target, method (shortest, all up to N hops), weighted or not                                                            | Path tool                                                  | no: a run; goes stale                          |
| Result set    | An algorithm whose answer is a set: cheapest network (MST), weakest link (min cut), best pairing, bridges (#311)                | Path tool flyout ("connecting" tools)                      | no: a run                                      |
| Picked        | An explicit list of ids                                                                                                         | "Save as set" on a selection (Ctrl+G); "Add to set"        | not live; stale only if members leave the data |

Extra properties: "Hide the rest" (a Filter, Neighbourhood or Path can hide non-members: it
writes the element's visibility filter, so the status bar reads "showing 12 of 34"); member
counts; for a Path, the ordered **Steps**.

### 3.3 Measure

What it is: one value per node or per edge. Created by the Rank tool (an algorithm), a column's
"Colour by" or "Size by" (an imported attribute promoted to an object), or "New score" (a
formula over other Measures and columns; proposed as computed attributes).
Properties: field (value, rank, percentile), min, max, mean, median, histogram, top 5, missing
count; **Fill** is a scale: colour by value (palette, scale type, domain, centre, missing colour),
size by value (range), label the top N. Child rows: "Top N" Filter sets made with the "+" on the
Measure row.
State: a run; stale when the visible scope changes ("ran on 34, now 12").

### 3.4 Partition and Group

What it is: a label per node and a Group per label. Created by Find groups (Louvain, Leiden,
Label propagation, Girvan-Newman, Separate pieces, Steps away from a node, and "By column" for
a categorical attribute such as type or tier). Also produced as a side result by Best pairing
and Weakest link (the two sides).
Properties: group count, modularity or level count, sizes, "hide groups smaller than N",
**Fill** "one colour per group" (categorical palette, overflow "Other" for the rest).
A Group is a real Set: selectable, renamable (#191), with its own **Members**, **Profile** and
**Fill**. Its Fill reads "From Communities" until the reader overrides a channel, which then
shows in the row as its own swatch. A Group's Fill row sits above its Partition's in
precedence by definition (a child paints over its parent's default), so no drag is needed to
recolour one group.
State: the Partition is the run; its Groups share its state.

### 3.5 Combination

What it is: Figma's boolean operation for sets: "In all of" (intersect), "In any of" (union),
"In A but not B" (subtract), "In exactly one" (exclusive). Created by selecting two or more Set
rows and choosing Combine in the row menu or Ctrl+Shift+U / I / S as in Figma.
Properties: the operands (rows it references, listed in **Rule** with a caret to jump to them);
members; Fill. Live: it re-evaluates when an operand changes.
Deleting an operand marks the Combination failed with reason "Missing: Top 10 by Bridges".

### 3.6 Table

What it is: a result with no canvas footprint: a pair list (link prediction), a series
(metrics per time step), a run-per-parameter sweep (#194), a group profile (#193).
Created by the tool that produces it. It has no Fill and no eye; its row opens the Table dock.
Properties: columns, row count, **Made by**, **Export**.

### 3.7 View

What it is: a saved camera plus the eye state of every row (which objects were showing).
Created by "+ Save view" in the Views group or the zoom menu. Selecting a View applies it; the
active one is marked. The inspector for a View: name, camera (position, target, 2D/3D), "Also
restore visibility" checkbox, "Update from current" button.

### 3.8 Note

What it is: a text note anchored to a node, an edge, an object or a point on the canvas.
Created by the Note tool (C) and by "+ Note" in any inspector. Notes show as pins on the canvas
and in a Notes list that replaces the left panel while the Note tool is active (Figma's comment
mode). Deleting the anchor orphans the note, which the list shows. Element support is #145; the
app holds notes itself until then, and says so in a tracked workaround.

### 3.9 Time window (a special Filter)

A Filter whose rule is "time between A and B, stepping by D". At most one is active; while it
exists the status bar shows the transport (step back, play, step forward, "Viewing: 2024-03").
It sits in the tree like any Filter, always with "Hide the rest" on, and every run made while it
is active records the window in its caveats. Playback with re-run per step (#300) makes the
Measures under it stale each step; the model accepts that and shows the dot.

### 3.10 Nesting, precedence, state and editing

**Nesting** carries exactly two meanings: (a) containment: a Partition contains its Groups, a
"Paths: A -> B" contains one Path per route, a Measure contains its Top N sets; (b) scope: an
object made "within" another (Filter tool while an object is selected, or Rank with scope set
to an object) nests under it, and its **Rule** section shows "Within: Group 2". Drag a row into
another to re-scope it (the row's state goes stale and it re-runs if cheap); drag it out to
re-scope to the whole graph. Drop zones are Figma's: top quarter before, middle into, bottom
quarter as first child.

**Precedence** is the tree order, top wins, per channel. If "Path: A -> B" (Fill: colour gold,
size 2x) sits above "Communities" (Fill: colour per group) then path nodes are gold and 2x and
everything else keeps its group colour. Drag Communities above the Path and the path nodes
take their group colour but stay 2x, because Communities never sets size. Objects with no Fill
row for a channel do not compete for it. The dataset's **Default look** is the bottom of the
stack and cannot be moved. The mapping to the element is direct: the tree order is
`session.styles.move()` order, one layer per Fill channel group, `source.by` = the object id.

**State** is shown as a 6 px dot at the right of the row (Figma's badge slot): no dot when
current; grey ring when stale; a 12 px progress ring when computing; red when failed. Hovering
the dot gives the reason ("Data changed: ran on 34 nodes, now 46"). Live objects (Filters,
Neighbourhoods, Combinations, column Measures) re-evaluate without asking. Runs (algorithm
Measures, Partitions, Paths, Result sets) go stale and wait; the inspector's **Made by** section
then starts with a "Re-run" button, and the row menu offers "Re-run" and "Re-run all stale".
A stale object keeps painting its old values, dimmed 50 percent in the tree row name so the
reader knows the picture may be out of date.

**Editing** is editing the inspector. Changing a rule or a parameter of a live object applies
at once; of a run, it marks the object stale and the Re-run button appears (with the cost
estimate on it, "Re-run (about 4 min)"), so an expensive change is never triggered by a
keystroke. Undo (Ctrl+Z) reverses any inspector edit, any reorder, any delete; runs are undone
by restoring the previous result object from the app's undo stack, since the element returns
inverse-able records.

**Deleting** (Delete or Backspace on a row, or "-" in the row's hover actions) removes the
object, its Fill layers, and its children. Objects elsewhere that reference it (a Combination)
fail with a reason rather than vanish. Deleting a Group of a Partition is not allowed (it is
the run's result); hiding it is.

## 4. The creation tools

The toolbar holds seven tools in three groups, each with a one-key shortcut and a flyout where
the group has variants. Figma's rules apply: mouse-down activates, the group face shows the
last-used variant, Escape leaves the tool, and the tool returns to Move when its object exists.

| Tool          | Key | Flyout                                                                                                                                                                                       | What the reader does                                                                                                                  | What it hands back                                                                  |
| ------------- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Move          | V   | -                                                                                                                                                                                            | Click, shift-click, marquee, drag a node (pins it)                                                                                    | the selection                                                                       |
| Hand          | H   | -                                                                                                                                                                                            | Pan                                                                                                                                   | -                                                                                   |
| Filter        | F   | By rule, By column, Top N of a Measure, Time window                                                                                                                                          | A rule composer popover opens beside the tree; the row appears at the top of the tree as soon as one rule is valid, with a live count | a Filter set (a Time window when that variant)                                      |
| Neighbourhood | N   | depth 1, 2, 3; in / out / all                                                                                                                                                                | Click a node (or use the selection as seeds); scroll or the popover changes depth live                                                | a Neighbourhood set                                                                 |
| Find groups   | G   | Communities (Louvain), Communities refined (Leiden), Communities fast (Label propagation), By cutting bridges (Girvan-Newman), Separate pieces, Steps away from a node, By column            | One click; Steps away and By column ask for a node or a column first                                                                  | a Partition with Groups                                                             |
| Path          | P   | Shortest route, All routes up to N hops, Cheapest connecting network, Cheapest network from a node, Best pairing, Most that can flow, Weakest link                                           | Click A, click B (sources and sinks); network tools need no clicks                                                                    | a Path, a "Paths" parent, or a Result set (plus a Partition for the two-sided ones) |
| Rank          | R   | Connections, Bridges, Reach, Influence, Influence by association, Influence at a distance, Hubs and authorities, How far from everything, Exploration order, New score (formula), Several... | One click; "Several..." opens a checklist and runs a batch                                                                            | a Measure (a batch: several)                                                        |
| Note          | C   | -                                                                                                                                                                                            | Click a node, edge or point, type                                                                                                     | a Note                                                                              |

Rules that hold for every tool:

- The flyout row shows the plain name, the technical name in secondary text, and, at the
  right, the cost from `session.estimate()` ("instant", "about 4 min") or "unavailable" with
  the reason. Above the confirmation threshold, the click asks first with one sentence.
- The tool's scope is the selected object if one is selected, otherwise the visible graph; the
  flyout's first line says so ("Within: Group 2" / "Visible: 12 nodes" / "Whole graph").
- The new row appears at the top of its parent's children, selected, in the computing state;
  the inspector switches to it and shows progress and Cancel in **Made by**. The status bar
  shows the same progress. Cancel leaves a failed row the reader can re-run or delete.
- The run's suggested style becomes the object's Fill, so the picture changes when the run
  completes, exactly as drawing a rectangle gives it a default grey fill.
- Every tool is also a palette command (Ctrl+K) and a right-click menu row where a node is
  under the pointer ("Path from here", "Neighbourhood").

Bridges, one of the owner's five verbs, is Rank > Bridges today (a Measure) and becomes a
Path-group Result set ("Bridge edges", "Cut points") when #311 lands; the flyout will hold both.

## 5. The inspector for each object type

The inspector uses Figma's panel grid (16 | 88 | 8 | 88 | 8 | 24 | 8) and row heights (32 for a
single row, 48 for a field row, 40 for a section header). Its top row (48 px) is the selection
type row: type icon, name (rename in place), then the eye, lock and "..." at the right.
Sections appear only when they have content; an empty section that can gain content is its
header with a "+". Below, sections are listed top to bottom, with their rows.

### 5.1 Set (Filter, Neighbourhood, Path, Result set, Picked, Combination)

- **Members**: "12 nodes, 30 edges" with "of 34 visible"; row actions Select members, Show in
  table. A Path shows **Steps** instead: one row per hop ("Mr. Hi -> John A. (friend)"), click
  selects.
- **Rule** (Filter): one row per rule ("degree > 10", "type is person") each with a "-",
  and a "+ Rule" header action; "Hide the rest" checkbox row; "Within" row when scoped.
  **Seeds** (Neighbourhood): the seed list, Depth (24 px scrubbable number), Direction
  segmented control. **Route** (Path): From, To (node pickers), Method select, "Use weights"
  checkbox. **Operands** (Combination): Operation select, the operand rows. A Picked set has
  no rule; its Members section has "+ Add selected" and per-row "-".
- **Fill**: paint rows, one per channel the set writes. Default for a new set: one Colour row
  (a highlight palette colour) and nothing else. "+" adds Size, Shape, Outline, Glow, Opacity,
  Label, or for edge members Width, Style, Arrows, Animation. Each row is Figma's paint row:
  chit, value, opacity, eye, minus. A set's Label row can be "node label" (each member's own)
  or "set name" (proposed; see section 10).
- **Profile** (on request, header "+"): the selection statistics: means and medians of numeric
  columns against the whole graph, top categories.
- **Made by**: state line with Re-run / Cancel; algorithm and parameters as one line of text
  ("Shortest route, Dijkstra, unweighted"); "Ran on 34 nodes, 2 s"; caveats as rows; a "?"
  toggle that reveals the plain-language reading. "Copy as methods text".
- **Notes**: notes with "+ Note".
- **Export**: "Members as CSV", "Image of this object" (fit to members, other objects dimmed).

### 5.2 Measure

- **Values**: the histogram (linear / log toggle), min, max, mean, median as a labelled
  two-column row, missing count; "Top 5" rows (name and value, click selects); "Show in table";
  header "+" adds a "Top N" child set (opens a 24 px number field, default 10).
- **Parameters**: the algorithm's options (damping 0.85, iterations, tolerance...), "Use
  weights", "Treat as undirected" (per-run weight and direction are #313), "Within" row.
  For a column Measure: the column name and "Field: value / rank / percentile".
- **Fill**: a Colour-by-value row (palette chit and select, scale select: Even steps, By order
  of magnitude, Equal counts...), a Domain row (min, max, centre for a diverging palette, with
  "from data" reset), a Missing row (chit, default grey), a Size-by-value row (min px, max px),
  a Label row ("Label the top N"). Rows are added with "+" like paints.
- **Made by**, **Notes**, **Export** ("Values as CSV").

### 5.3 Partition

- **Summary**: "6 groups, modularity 0.36"; the "?" reading.
- **Groups**: a table (name, size, swatch), sorted by size, click selects the Group row; "Hide
  groups smaller than" number row.
- **Parameters**: resolution, seed, iterations; "Within".
- **Fill**: one row "One colour per group" (categorical palette select, Overflow: "largest N,
  rest Other"), plus optional Size, Label rows applying to all groups.
- **Made by**, **Notes**, **Export** ("Membership as CSV").

A Group's inspector is a Set's (5.1), with **Rule** replaced by a row "Group 2 of Communities"
(click jumps to the parent) and **Fill** rows reading "From Communities" until overridden.

### 5.4 Table

- **Rows**: count and the column list; "Open in table" (the dock).
- **Parameters**, **Made by**, **Notes**, **Export** ("As CSV").

### 5.5 View

- **Camera**: position and target as two field rows, Mode (2D / 3D) segmented control.
- **Restores**: "Visibility of objects" checkbox, "Time window" checkbox.
- Actions: "Update from current", "Go to".

### 5.6 A node (the material)

Title row: "Node" and its label; "Copy id"; "Locate" (camera to it); Pin toggle.

- **Attributes**: every column and value, filter field when more than ten.
- **Belongs to**: one row per object the node is a member of, with the object's swatch and,
  per channel, which object's Fill won ("Colour: Path", "Size: Connections"), from
  `session.styles.explain()`. Click a row to select that object. This is the answer to "why is
  this node gold".
- **Values**: one row per Measure: "Connections 17 (rank 1)".
- **Connections**: neighbour rows (label, edge type, weight), In / Out / All tabs on directed
  graphs; "Select these", "Show in table"; header "+" makes a Neighbourhood object.
- **Fill**: one paint-row group headed "This node only". Editing it creates a Picked set of one
  named after the node at the top of the tree and edits that set's Fill. So "make this one red"
  is three clicks and still lives in a layer.
- **Notes**.
- Actions row (Figma's secondary bar under the title): "Path from here", "Neighbourhood",
  "Merge with..." (proposed), "Remove" (proposed data edits).

An edge's inspector is the same with **Endpoints** in place of **Connections**. It needs the
element to pick edges (#319).

### 5.7 N selected

Title "N selected" (nodes and edges counted). **Attributes** shows shared columns with "Mixed"
where values differ. **Belongs to** lists objects that cover all of them. **Fill** edits create
a Picked set of the selection. The primary row action is "Save as set" (Ctrl+G). **Profile**
gives the selection statistics.

## 6. Selection semantics

Two different things can be selected, and the inspector always says which:

1. **Elements** (nodes, edges): the material. Selecting them shows the node / edge / "N
   selected" inspector.
2. **Objects** (rows): selecting an object shows the object's inspector and OUTLINES its
   members on the canvas without selecting them, as selecting a Figma group outlines its
   children.

| Action                                           | Result                                                                                                                                                                                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Click a node on the canvas                       | Selects that node (gold halo). Any object selection is dropped. The tree highlights, with the secondary selected fill, the rows the node belongs to (child-of-selected colour), scrolling the first into view                                 |
| Shift+click a node                               | Toggles it in the element selection                                                                                                                                                                                                           |
| Drag on empty canvas                             | Marquee; nodes inside preview as selected live; release keeps them. The element has no marquee today; it is new element work (the app must not compute hits itself)                                                                           |
| Click empty canvas, or Escape                    | Clears the element selection; a second Escape clears the object selection; the inspector returns to the dataset                                                                                                                               |
| Click a row                                      | Selects the object; members outlined on the canvas; inspector shows the object. Focus returns to the canvas, as in Figma                                                                                                                      |
| Shift+click rows / Ctrl+click rows               | Range / toggle multi-select of rows; the inspector shows "N objects" with Combine and Delete actions and a Fill section that edits all (with "Mixed")                                                                                         |
| Double-click a row, or Enter with a row selected | Drills in: selects the object's MEMBERS as the element selection (Figma's Enter selects a container's children). Shift+Enter goes back to the object                                                                                          |
| Hover a row                                      | Members highlighted on the canvas (the two-way hover link, instant)                                                                                                                                                                           |
| Hover a node                                     | Its rows get the hover fill; its neighbours outline on the canvas                                                                                                                                                                             |
| Table row click                                  | Selects the node or edge (the table and the canvas share `session.selection`)                                                                                                                                                                 |
| Ctrl+F (Find)                                    | Replaces the tree with a search field, as Figma's Find does: typing filters objects by name AND nodes by label or attribute (`{text}` selection targets, #149); Enter selects the highlighted result and locates it; Escape restores the tree |
| Ctrl+A                                           | Selects every visible node                                                                                                                                                                                                                    |
| Ctrl+G (with elements selected)                  | "Save as set": a Picked set at the top of the tree, selected, named "Set 1", rename field open                                                                                                                                                |
| Right-click a node                               | Context menu: Path from here, Neighbourhood, Select neighbours, Select connected part, Pin, Note, Copy id                                                                                                                                     |
| Right-click a row                                | Rename, Duplicate, Re-run, Combine (when 2+ rows), Show in table, Export, Delete                                                                                                                                                              |

Rule-based selection is never a separate mode: a rule makes a Filter object, and "Select
members" (or double-click) turns its members into the element selection. Relational selection
(neighbours, connected part, the top N of a Measure) works the same way through the
right-click rows, which apply `session.selection.apply()` targets directly without making an
object when the reader only wants a quick selection; Ctrl+G promotes it if they want to keep
it.

Locked rows exclude their members from canvas clicks and drags through that object, which
needs a small element addition (a per-node "unpickable" flag); until then the lock only
prevents edits to the object.

## 7. Nothing selected

The tree shows the dataset root and its objects. The inspector shows the dataset:

- Title row: the dataset name (rename), the source file and format in secondary text, "..."
  (Close, Reload, Import options).
- **Data**: Nodes, Edges, Direction ("Undirected, from file"), Weighted, Connected parts,
  Density, Average connections; "Import report" row (kept, rejected, repeated); header actions
  "+ Add data", "Join a table".
- **Columns**: one row per attribute: icon for type, name, completeness bar, unique count;
  each row's "..." offers Colour by, Size by, Filter by, Group by, Set as label, Set as time,
  Set as type. This is where "put my data on the map" starts.
- **Arrangement**: Layout select (Spread Out, Ring, Tree, ...), the layout's options behind a
  settings icon (a popover), Dimensions 2D / 3D, a transport row (play, pause, step, stop; the
  element's transport is #144), "Pinned: 3 nodes" with Unpin all. The status bar chip is a
  shortcut to this section.
- **Default look**: the element's base fills as read-only paint rows (node colour, size, edge
  colour, width) with "Edit" that opens them as an ordinary Fill; Labels row ("label the N most
  connected", the label budget); Background chit.
- **Canvas**: Legend (on / off, placement), Minimap (on / off), Tooltips.
- **Notes**: notes anchored to the dataset (the case notes).
- **Export**: Image, Data, Report, Methods text, Recipe.

There is no "Most connected" block computed unasked and no suggestion cards. The novice's
guidance lives in one place: the empty Objects group shows three rows ("Find groups", "Rank by
connections", "Search a name") until the first object exists, and the Help menu can bring
them back. After a load the app does not switch panels, run degree, or add layers by itself;
it picks a layout (the element's recommendation) and fits the camera, and that is all.

## 8. Where everything else lives

| Capability              | Home                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Shortcuts to it                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 8.1 Data table          | The bottom dock (Shift+T). Tabs Nodes / Edges. Its rows are the members or values of the selected object, or everything when nothing is selected; columns include every Measure. Row selection is the element selection. Column headers sort; a column's "..." has the same Colour by / Filter by verbs as the Columns section                                                                                                                                                 | "Show in table" on every object; the status bar counts                     |
| 8.2 Import              | The import dialog (file, URL, paste; format; mapping; preview) opened from the Welcome sheet, File > Open, or **Data** > "+ Add data". Join a table is the same dialog's Join tab. This is the one guided flow, and it stays modal                                                                                                                                                                                                                                             | Drag-and-drop anywhere; Ctrl+O                                             |
| 8.3 Layout process      | Dataset inspector **Arrangement** (section 7)                                                                                                                                                                                                                                                                                                                                                                                                                                  | The status bar chip ("Spread Out: settled") with play / pause; the palette |
| 8.4 Camera, 3D, XR      | The zoom menu in the top bar (Figma's "100%" menu): Zoom in / out / to fit / to selection, Reset, From above / side / front / Isometric, 2D / 3D, Enter VR / AR, Save view. Saved views are the Views group in the left panel                                                                                                                                                                                                                                                  | Keys 0, F, 1, 3, 7, 5; the toolbar's 2D / 3D switch                        |
| 8.5 AI assistant        | The palette (Ctrl+K). Typed text that matches no command shows "Ask: <text>" as its last row; Enter sends it. The assistant's actions create ordinary objects (a Filter, a Measure) in the tree with **Made by** reading "Assistant: <the request>", so its work is visible, inspectable and undoable, and there is no AI mode. A transcript drawer opens from the status bar's AI chip for follow-ups and for saying what data was sent (#326). Provider setup is in Settings | The backtick key focuses the palette in Ask mode                           |
| 8.6 Export              | Share (the one primary button, top right) opens a menu: Export image..., Export data..., Export report..., Copy image, Copy methods text. Per-object exports are that object's **Export** section                                                                                                                                                                                                                                                                              | The palette                                                                |
| 8.7 Notes               | The Note tool (C); the Notes list that replaces the left panel while the tool is active, listing every note by anchor; the **Notes** section of every inspector                                                                                                                                                                                                                                                                                                                | Right-click > Note                                                         |
| 8.8 Recipes and history | Undo / Redo in the file menu and Ctrl+Z. History is the tree itself plus the undo stack; "Export > Recipe" writes the creation steps of every object as a replayable list, and "Run a recipe" in the file menu replays one onto the current dataset, producing the objects                                                                                                                                                                                                     | -                                                                          |
| 8.9 Legend              | Derived from the tree: every visible Fill row of every visible object, in precedence order. Drawn on the canvas when Canvas > Legend is on and into exports (#292). The tree row swatch is the legend's first glance                                                                                                                                                                                                                                                           | Key L                                                                      |
| 8.10 Minimap            | Canvas > Minimap (#293)                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Key M                                                                      |
| 8.11 Settings           | The file menu > Settings: appearance, keyboard, performance, AI providers                                                                                                                                                                                                                                                                                                                                                                                                      | -                                                                          |

## 9. The five hardest fits

**Fit 1: overlapping membership and who wins.** A node can be in a Group, on a Path, in a
Filter and have three Measures at once; Figma layers never overlap in membership. Resolution:
precedence is only ever the tree order, per channel (section 3.10), so there is one rule to
learn and one gesture (drag) to change it; the node inspector's **Belongs to** section says
which object won each channel, so the picture is always explainable; and objects that do not
set a channel do not compete for it, so a Path that only sets colour never disturbs a
Measure's sizes. What stays awkward: two Measures that both colour cannot blend; the lower one
is simply hidden, and the tree shows this only through the state of its swatch (dimmed when
fully overridden). Accept it; blending two colour scales is not readable anyway.

**Fit 2: a Partition is one run but many things.** The reader wants to rename one group,
recolour one group, hide the small ones, yet the groups are one result. Resolution: the
Partition row expands to Group rows that are real Sets with their own inspector; a Group's Fill
reads "From Communities" until overridden and then shows its own swatch; rename is per group
(#191); "Hide groups smaller than N" is a Partition property; groups cannot be deleted, only
hidden. Re-running the Partition keeps names and overrides by matching groups to their old
members (largest overlap), and says in **Made by** how many were matched.

**Fit 3: objects are live, cost time, and go stale.** Figma layers are never out of date.
Resolution: one state dot per row with a hover reason; live objects refresh silently, runs go
stale and wait for a Re-run that carries its cost estimate; stale rows keep painting their old
values but their name dims; "Re-run all stale" is one row action; progress and Cancel live in
the row, in **Made by** and in the status bar; every tool flyout shows the cost before the
click, so a four-minute run is never a surprise. Dependent objects (a Top N set under a stale
Measure, a Combination of it) inherit the stale state, so the tree shows what is out of date
at a glance.

**Fit 4: a Measure is both a picture and a source of sets.** "Colour by PageRank" is a Fill,
but "the top 10 by PageRank" is a set the reader wants to intersect with other top 10s (W23).
Resolution: a Measure's Fill is a scale (colour ramp, size range, top-N labels); its "+" makes
"Top N" child Filter sets; sets combine through the Combination object, which is Figma's
boolean operation with the same shortcuts. A custom score is a Measure of kind formula, made
with Rank > New score, which needs the element's computed attributes (proposed). The ranked
table with every Measure as a column is the Table dock with nothing selected.

**Fit 5: more than one network, and what-if scenarios.** Comparison (W24), removal impact
(W09, W11) and "make the largest component the working network" (W20, W21) all want a second
graph. Resolution in two parts. (a) **Focus**: any Set's row menu offers "Focus": everything
else is hidden, the status bar reads "Focused on Part 1: 412 of 450", every tool scopes to it,
and every object made while focused nests under it; "Exit focus" in the status bar returns.
This covers the working-subnetwork cases without a second graph. (b) **A second root**: a
second dataset in the tree, with linked cameras (Compare mode, #186) and per-root inspectors;
union / intersection / difference of two roots are Combinations whose operands are roots and
whose result is a third root. Scenarios ("Without supplier X") are a Filter with "Hide the
rest" plus Measures re-run within it; the comparison against the unfiltered Measures is a
Table ("Biggest changes"). (b) is next-phase element work (the session holds one graph); (a)
can ship on today's visibility filter and scopes. Flagged as awkward in section 10.

## 10. Steps the model cannot express well

Collected from the "no" and "awkward" cells of section 2, with what it would take:

1. **Data edits** (merge duplicates W09 / W13, collapse a group into a node W22, remove a node,
   edit an attribute): not objects but changes to the material. The model treats them as
   commands on a selection with an undo inverse, shown in the node inspector's action row and
   in the History. They need element mutations with inverses (#297, node merging proposed).
2. **Inter-community structure** (W04) and **community evolution** (W19): need a derived graph
   (one node per group, or per time step) that is not a Set of the current graph. Would be a
   second root produced from a Partition ("Group graph"); next-phase.
3. **Enrichment** (W21) and **STRING retrieval** (W20): external services. Out of scope; the
   model's join-a-table and Notes are the seams they would plug into.
4. **Pattern search** (W06, W07): a Set whose rule is a small template graph. Fits the Filter
   tool as a "By pattern" variant once the element has motif search (proposed).
5. **Computed attributes** (W06, W08, W10, W23, W24): the formula Measure. The object fits
   perfectly; the element capability is proposed.
6. **Set labels on the canvas** (W21, W22: the top term as a cluster label): the element labels
   nodes and edges, not sets. A set-level label channel (a label drawn at the members' centroid)
   is new element work.
7. **Very large graphs** (W07, W10, W16): render limits are published but not enforced (#302);
   the model's Focus and "Hide the rest" are the mitigation, not a solution.
8. **Two networks** (W24) and **scenarios** (W09, W11): section 9, fit 5.
9. **Temporal metrics per step** (W19): playback with re-run (#300) makes a run per step; the
   model prefers one Table object of series over N stale Measures, which is an element shape
   decision.

## 11. What the element needs for this model

In order of how much of the model each unlocks, all recorded as issues or listed in the
capabilities inventory:

1. The query engine for expressions and text search (#149): the Filter tool's "By rule" and
   Ctrl+F over node labels both depend on it. Range, categories, degree, component and
   neighbourhood filters ship today, so the Filter tool can start without it.
2. Result-field filters (#192) and group names (#191): Top N sets and renamable Groups.
3. A marquee and an edge pick (#319): canvas selection parity with the tree.
4. The layout transport (#144): the Arrangement section's play / pause / stop.
5. The legend in exports (#292) and a minimap (#293).
6. Notes and the journal (#145): Notes as element objects, Recipes as replayable commands
   (#337).
7. Table join (#298), computed attributes, bridges and cut points (#311), all-paths (#329),
   per-run weights and direction (#313): the proposed variants named in the flyouts.
8. A per-node unpickable flag for the lock, a set-level label channel, a data mutation API
   with inverses, and a second graph per session (#186, #301): the next-phase items.

None of these is an app workaround: the app builds the tree, the inspector sections and the
toolbar over the session API's existing scopes, selection targets, runs and style layers, and
the tree order is `session.styles.move()` order.
