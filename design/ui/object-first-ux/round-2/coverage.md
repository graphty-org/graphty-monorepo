# Round 2: coverage of every graphty-element capability

This table checks the round-2 design (`revision.md`, `screens.md` and `decisions.md` in this
folder, and the mocks in `../mocks/v2/`; screens 14 and 15, the two dialogs, were drawn after this table) against every row of the capability inventory
(`../inventory/element-capabilities.md`). Every inventory row appears here under the
inventory's own name and issue number, with the place the revised design gives it, the mock
that shows it, how well it fits, and the graphty-element work it depends on.

Written for the project owner. Design words used in the columns:

- **Object**: a row of the left panel's tree: a Set, a Measure, a Grouping, a Group, or the
  Dataset (the root row). **Inspector**: the right panel, which shows tabs for the selected
  object or node. A tab is named as "Set > Style" (the kind, then the tab).
- **Toolbar**: the floating bar at the bottom of the canvas; a **flyout** is the dark menu
  behind a tool's chevron; the **secondary bar** is the one-line prompt above the toolbar
  while a tool is armed; the **parameters popover** is the 240 px panel of options opened
  from the bar's Options button or a flyout row's "...".
- **Status bar**: the 24 px strip at the bottom of the window. **Dock**: the bottom drawer
  with the Table, Assistant and History tabs. **Transport bar**: the 40 px time-playback strip
  under the canvas; its **gear** is the popover of time settings.
- **File menu**: the menu behind the dataset name's chevron (Open..., Add data..., Save
  project, Run a recipe..., Present, Settings..., Keyboard shortcuts, Help). **Settings**: the
  sheet the file menu's "Settings..." opens (screen 13 in `screens.md`, drawn in round 3). **Ctrl+K**:
  the keyboard-only command palette. **"?" menu**: the ghost button at the right end of the
  status bar (Help, Keyboard shortcuts, Open sample).
- **Deliberately not on the everyday screen**: the capability is consumed by the app
  (subscribed to, read from, or configured once) but has no control a reader operates, and
  that is the intended design.

The **Fit** column uses four words:

- **natural**: the home matches the capability's kind in the object model, and the surface
  is specified row by row.
- **awkward**: it has a home, but the home bends the model (a second home, a re-import for a
  change that should be live, a table inside a popover, two objects from one run, a verb with
  no door).
- **does not fit**: the design has no shape for it and says so.
- **unplaced**: neither `revision.md`, `screens.md` nor `decisions.md` names it.

**Mock** is the screen number in `../mocks/v2/screen-N.png`, or "none". Screen 11 is the
toolbar reference sheet, which draws every flyout row; screen 13 (Settings) was specified but
not drawn, so every Settings row read "none"; round 3 draws it (General, Performance and Assistant
open), and those rows now point at 13.

**Element gap** names what graphty-element must gain before the app can wire the home as
drawn: an open issue (`#NNN`), a decision in `decisions.md` (S1 to S3, T7 to T10, Y4 to Y6, L3,
L4, R1 to R3), or an item of `revision.md` section 8. "--" means the element already has it.

---

## 1. Data in and out

| Capability | Status | Home in the revised design | Mock | Fit | Element gap |
|---|---|---|---|---|---|
| Inline data (`el.nodeData`, `el.setData`) | shipped | screen 1's "Paste data..." row and the file menu's "Add data..." dialog (paste tab); as an API it is the consumer's, not a control | 1, 23 | natural | -- |
| Load from a URL | shipped | screen 1's "From a URL..." row; file menu Open... (URL field) | 1, 14, 22 | natural | -- |
| Load from a File | shipped | screen 1's drop zone and "Choose a file"; file menu Open... | 1, 14, 101 | natural | -- |
| Load from a named source (`addDataFromSource`, `dataSource` attribute) | shipped | the Import dialog's A source tab: the rows come from the source's descriptor (Neo4j: server, database, user, password, Cypher query, row limit; STRING: a gene list), with Test connection (round-3/import.md 2.13) | 31 | natural | none in the element; the design gap is that Open... is specified as file, URL and paste only, and a source with connection fields (Neo4j: URL, database, query) has no rows drawn. Proposed home in section 13 |
| Import formats (JSON dialects, CSV dialects, GraphML, GEXF, GML, DOT, Pajek) | shipped | Open... (format sniffed, overridable); the Dataset's summary row shows the format ("karate.gml, GML") | 2 | natural | -- |
| Import options per format (separator, variant, id column, endpoint fields) | shipped | the Import dialog's Options disclosure before the load (the format's own rows from `FormatDescriptor.options`), and Dataset "..." > Import options... after it (round-3/import.md 2.7, data-editing.md section 2) | 25, 34 | natural | none in the element; the sheet is named with four global rows (repeated edges, id coercion, endpoint spelling, position scale) and never lists the per-format rows from `FormatDescriptor.options`. Section 13 |
| Known-field mapping (node id, label, weight, time, edge source/target/id, weight, time) | shipped | Dataset > Data: the "Made by" disclosure's field mapping with "Change..."; each column's "..." has Set as weight, Set as label, Set as time, Set as type | 10, 14 | awkward | re-mapping weight, label and direction after a load without a re-import (`revision.md` section 8, last row); today "Set as weight" after a load reopens the import options and re-imports |
| Endpoint spelling detection (`lastImport().endpoints`) | shipped | the Import report disclosure on Dataset > Overview; the endpoint spelling row of Import options... | 2 | natural | -- |
| Direction (directed, undirected, auto; provenance) | shipped | Dataset > Overview: "Direction  Undirected, from file [Change...]" | 2 | natural | "Change..." is a re-import today; live re-direction is the same section 8 item as the mapping row above |
| Mixed direction per edge (#309) | proposed | Dataset > Overview: Direction reads "Mixed" | none | natural | #309 |
| Repeated-edge policy (keep, error, first, last, sum, min, max) | shipped | Dataset "..." > Import options...; the count in the Import report | 34 | natural | -- |
| Id coercion (canonical, keep) | shipped | Dataset "..." > Import options... | 34 | natural | -- |
| Position scale and seeded positions (`positionScale`, `seededNodeCount`) | shipped | Dataset > Layout: "Positions from file: 34 of 34 [Keep positions]"; the scale in Import options... | 34, 83 | natural | -- |
| Import report (`lastImport()`) | shipped | Dataset > Overview: the Import report disclosure (read, kept, rejected with "See in table", repeated, weights from) | 2, 33 | natural | -- |
| Load progress (`data-loading-progress`) | partial | the status bar's computing chip: "Loading 42% [Cancel]" | 28 | natural | percentage only when a size is passed; #296 |
| Cancel a load (#296) | proposed | the Cancel in the same chip | 28 | natural | #296 |
| Incremental add / remove / update (`addNodes`, `removeNodes`, `updateNodes`) | shipped | add: Import dialog Into > Add to current graph, with Same id [Skip / Replace / Update fields] and a dry run (screen 26); remove: Remove from data... with its confirmation (screen 40); add by hand: Add node here... and Connect to... (screen 42) | 26, 40, 42 | natural | none in the element for add and remove; the design gap is that "Add data..." names no policy for a record whose id already exists (`E_DUPLICATE_ID` today). Section 13 |
| Update attributes after load (#297) | proposed | a node's Attributes tab and a table cell edit in place; the file's value kept with Revert; one undo step (round-3/data-editing.md section 5) | 39 | natural | #297. Section 13 |
| List edges (`getEdges`; `session.data.edge(id)`) | partial | the Table dock's "Edges 613" tab | 56 | natural | `getEdges` (#297) |
| Clear (`clearData`) | shipped | Dataset "..." > Close dataset | 16, 17 | natural | -- |
| Expand a node's neighbourhood from a server (`fetchNodes`, `fetchEdges`) | shipped | double-click a node when a fetcher is configured (decision T6); the node's overflow "Expand from server" | 42 | natural | -- |
| Attribute catalogue (`data.attributes()`) | shipped | Dataset > Data: one row per column with type glyph, completeness and "..."; "See all 40 in table" | 10 | natural | -- |
| Graph statistics (`data.statistics()`) | shipped | Dataset > Overview: Nodes, Edges, Density, Mean links, Parts, Weighted, Self-loops; component sizes as the Grouping from Structure > Separate pieces | 2 | natural | `statistics().reading()` for the reading row (decision I8) |
| Status counts (`status.counts`) | shipped | the status bar's counts, never collapsed; click opens the Table dock | 2 | natural | -- |
| Topology fingerprint (`session.fingerprint()`) | shipped | deliberately not on the everyday screen: the objects API uses it to match a recipe or a project file to its data | none | natural | -- |
| Node type / edge type role (#299) | proposed | Dataset > Data: a column's "..." > Set as type; Groups > By attribute... defaults to it; Filter > By values defaults to it | 35 | natural | #299 |
| Time role (`nodeTimePath`, `edgeTimePath`; `timeAttributes()` #333) | partial | Dataset > Data: the "Time [sent v]" row; the Findings door "Time column: sent ... [Show over time]"; a column's "..." > Set as time | 10 | natural | #333; decision L4 (a pair or a spells column as the role) |
| Join an attribute table by key (#298) | proposed | Dataset > Data: ATTRIBUTES "+" > Join a table... ; the match report joins the Import report disclosure | 37 | natural | #298 |
| Computed attributes (formula) | proposed | Dataset > Data: ATTRIBUTES "+" > New from formula... makes a column with a formula glyph; its "..." > Size by or Colour by makes the Measure (round-3/data-editing.md section 9) | 38 | natural | the `data.compute` command (design 4.3.4); the design gap is that the inventory calls the result a Measure (a tree row) while the door is on the Data tab (a column); the design does not say which it makes. Section 13 |
| Node merging | proposed | the several-elements inspector: "Merge into one node..." (the second data edit; decision R6) | 41 | natural | the element has no merge; no issue yet |
| Data export (GraphML, GEXF, CSV, JSON, CX2) | proposed | Export > Export data... (format, scope Everything or What is showing, Include positions, Include object columns) | 96 | natural | every element format descriptor is `canExport: false`; graph-io has the exporters |
| SIF, CX2, STRING, BioGRID, Neo4j APOC readers (#306, #307, #308, #303, #304) | proposed | Open..., which is catalogue-driven, so a registered reader appears with no app change | 31 | natural | #303, #304, #306, #307, #308 |
| Project file (#301) | proposed | file menu: Save project (Ctrl+S), Open..., Open recent; screen 1's "Continue College football (yesterday)" | 16, 18, 19 | natural | #301; its shape is the objects API's saved form (decision S1) |
| Sample datasets | app-side | screen 1's sample list; file menu Open sample; the "?" menu's Open sample | 1 | natural | the samples and their blurbs live in the app (`graphty/src/data/sampleManifest.ts`); a third-party consumer gets none. A `data.sample` command (design 4.11) would move them into the element |
| Custom data source / format plugin | shipped | Open..., which lists the registry | none | natural | -- |
| Large-graph limits (`DEFAULT_LIMITS`, #302) | partial | Dataset > Overview: "Drawing 200,000 of 350,000" (when over the render ceiling); Settings > Performance: Render ceiling; the VR segment's tooltip ("12,400 nodes showing; VR takes up to 10,000") | 29, 30 | natural | #302 (the limits are published, not enforced) |
| Progressive / viewport-first loading | proposed | out of scope this round (decision R6) | none | does not fit | design 9.3; nothing planned in the element. Section 13 |

## 2. Selection, query and visibility

| Capability | Status | Home in the revised design | Mock | Fit | Element gap |
|---|---|---|---|---|---|
| Select by click (nodes only) | shipped | the Select tool (V): click, Shift adds, Ctrl toggles, Alt subtracts; the gold halo | 3 | natural | edges are unpickable (#319), so an edge is reached only through a Set's Members tab or the Table's Edges tab |
| Selection halo style (`selectionStyle`) | shipped | Settings > Canvas: Selection halo [chit] [width] | none | natural | -- |
| Multi-element selection (cap 5,000, `truncated`) | shipped | Shift+click, marquee (2D drag; Shift+drag in 3D); the several-elements inspector; the status bar's "11 selected" and "5,000 selected (capped)" | 55 | natural | the marquee is an element hit-test that does not exist yet (`revision.md` 3.3, Select) |
| Set operations on the selection (replace, add, remove, toggle, intersect) | shipped | replace, add, toggle and remove are the click modifiers; every object row's "Select members" replaces | none | awkward | none in the element; the design gap is that intersect has no gesture or menu row anywhere. Section 13 |
| Select by ids | shipped | Filter > By id list, then [Select] in the secondary bar | 11 | natural | -- |
| Select neighbours (depth 1 to 3, direction) | shipped | the Neighbours tool (E) with [Select] as an alternative to Create; a node's Links tab header "Select"; double-click when no fetcher is configured | 11 | natural | -- |
| Select by scope | shipped | any object row's overflow "Select members"; a Set's Members header "Select"; a Group's "Select members" | 3 | natural | a Group scope (decision S2) |
| Select the top N of a result | shipped | Measure > Values: click a ranked row; the TOP header's "+" (Top N set...); Filter > By range on a Measure then [Select] | 6 | natural | -- |
| Select above a threshold | shipped | Measure > Values: TOP "+" > Above threshold set...; Filter > By range on a Measure then [Select] | 6 | natural | -- |
| Select edges between selected nodes (`edgesBetween`) | shipped | the several-elements inspector's Select rows: Add edges between (Ctrl+Shift+A) (round-3/navigate-select.md section 10) | 55 | natural | -- (the target ships). Section 13 |
| Invert the selection (`invert`) | shipped | Ctrl+I; the several-elements inspector's Select rows; the selection and empty-canvas right-click menus; Ctrl+K (round-3/navigate-select.md section 10) | 55 | natural | --. Section 13 |
| Select by expression (`{where}`, #149) | proposed | Filter > By rule, then [Select] | 11 | natural | #149 |
| Select by text search (`{text, mode}`, #149) | proposed | Ctrl+F's second section "Nodes" (by label or id); the Table dock's search field | 50 | natural | #149 (the `find` source) |
| Clear the selection | shipped | Escape (after the Escape ladder: pause playback, cancel an armed tool, then clear); a click on empty canvas | none | natural | -- |
| Promote the selection to a saved set (`selection.promote`) | shipped | the several-elements inspector: "Make a set (Ctrl+G)"; the new row is a fixed Set | 55 | natural | -- |
| Selection statistics | shipped | the several-elements inspector: Statistics (Nodes, Edges, Inside, Cut, per-attribute mean against the graph mean) | 55 | natural | -- (#322 is the app's "Coming" stub) |
| Selection change event (`selection:changed`) | shipped | deliberately not on the everyday screen: the tree's child-of-selected tint, the status bar count and the Table's row tint all read it | 9 | natural | -- |
| Saved scopes (`scope.save`, `.list`, `.remove`) | shipped | every Set in the tree is a saved scope; the tree is the list; Delete removes | 3 | natural | decision S2 (the scope type gains edges, run-result sets, filters, top-N, groups and combinators) |
| Resolve or count a scope (`scope.resolve`, `.count`) | shipped | the secondary bar's "on what is showing, 115 nodes"; Filter's live "Matches 8 nodes"; a Set's Members tab counts | 4 | natural | `scope.statistics(spec)` for inside and cut edges (decision I9) |
| Filter: expression (#149) | proposed | Filter > By rule, then [Create] or [Create and focus] | 61 | natural | #149, #332, #335 |
| Filter: range | shipped | Filter > By range (attribute or Measure, Min, Max, the histogram above) | 60 | natural | #192 for Create on a result field |
| Filter: categories | shipped | Filter > By values (a value list with counts) | 59 | natural | -- |
| Filter: degree | shipped | Filter > By connections; the Set's Define tab says "Counts every edge, not only what is showing" | 11 | natural | filters evaluated within a scope (decision S2, `revision.md` section 8) |
| Filter: component | shipped | Filter > Largest connected part; a Separate-pieces Group's "Focus on this" | 11 | natural | -- |
| Filter: neighbourhood (ego network) | shipped | the Neighbours tool, then Focus on the Set | 64 | natural | -- (#314 is the app's unwired action) |
| Filter: edges by expression (#149) | proposed | Filter with Target [Edges], then By rule | 62 | natural | #149; edge categories and ranges are a small addition (`revision.md` 3.4) |
| Filter combinators (all, any, not) | shipped | a rule Set's "+ Rule" (an AND line); a Combination Set ([Group 1] [and v] [Path]); "Focus on these" on several objects (a union); the Invert switch (not) | 61, 65 | natural | decision S2 (combinators in the scope type) |
| Time window (`visibility.setWindow`) | shipped | the transport bar: the band with two handles, Window from / to in the gear | 10 | natural | decisions L3 (nodes follow their edges) and L6 (snap to steps) |
| Time-series playback (#300) | proposed | the transport bar: [<] [Play] [>], Speed, Mode [Sliding / Cumulative], Step, "Re-run objects while playing", "Re-run layout per step", the CHANGES disclosure, the tick marks | 10 | natural | #300 (per-step summaries and change counts); decision L1 (a window never marks stale) |
| Visibility summary and masks (`visibility.summary`, `.nodeMask()`) | shipped | the status bar's mask readout ("Focused on Group 2: 11 of 34 [Exit]"); the transport bar's counts | 10 | natural | -- |
| Visibility change event (`visibility:changed`) | shipped | deliberately not on the everyday screen: the status bar and the transport counts read it | 10 | natural | -- |
| Visible count vs render set | shipped | the status bar's "412 of 1,204"; Dataset > Overview "Drawing N of M" for the render ceiling | 10 | natural | -- |
| Hover (`node-hover`; `node.tooltip` channel) | partial | Settings > Canvas: "Highlight neighbours on hover [Off / Neighbours / 2 steps]" with "dim the rest"; Dataset > Canvas: Tooltip [Label + 3 attributes v]; a hover shows a budgeted label | 89 | natural | the hover-highlight layer (`LayerSource` reserves `reason: "hover"`, unbuilt) |
| Pick what is under the pointer (context menu) | partial | a right-click opens the "..." list of what is under the pointer (node, selection, tree row, empty canvas; edges with #319), the same rows as the inspector's "..." (round-3/navigate-select.md section 1) | 49 | natural | edges never pick (#319) |
| Pattern (motif) search (`data.match`) | proposed | Filter > Pattern (Triangle, Star of 3, Chain of 3, Square, Clique of 4): a Set of the union of matches plus a Findings row "42 matches, Open in table" | 63 | natural | the `data.match` command; no issue yet |
| Query validation and autocomplete (`catalog.validate()` #335, `.functions()` #332) | proposed | a rule Set's Define tab: the expression field's autocomplete and inline error | 61 | natural | #332, #335 |

## 3. Algorithms and their results

### 3.0 Result shapes: which kind of object each becomes

| Result shape | Object kind in the tree | Mock | Fit | Element gap |
|---|---|---|---|---|
| `node-metric` | a Measure (Values, Define, Style, Record) | 6 | natural | -- |
| `edge-metric` | an edge Measure; its Style tab's encoding block sits under EDGES | none | natural | -- |
| `community` | a Grouping with one Group child per label | 3, 7 | natural | a Group scope (decision S2) |
| `layered-grouping` | an ordered Grouping ("Level 1", "Shell 1"...) with a sequential palette | none | natural | -- |
| `category-table` | a Grouping (the bipartite or min-cut "Sides") | none | natural | -- |
| `path` | a Set, ordered; Members shows hop order | 8 | natural | decision S3 (non-exclusive highlight; the value-test selector) |
| `node-set` | a Set | 9 | natural | -- |
| `edge-set` | an edge Set | 62 | natural | decision S2 (`{edges}` in the scope type) |
| `pair-list` | a Findings row on Dataset > Overview ("25 pairs, Open in table") and the Table dock's Findings tab, one row per pair with Select both and Make a path (round-3/analysis-results.md sections 9 and 10) | 76 | natural | none in the element; the design gap is that the Table dock has Nodes and Edges tabs only, so "Open in table" has no table to open. Section 13 |
| `temporal` | the transport gear's OVER TIME section (a series chart, "Biggest movers" which promotes to a Measure) | 10 | awkward | #300; the design gap is a series chart and a movers list inside a 240 px popover. Section 13 |
| `fact` | a Findings row on Dataset > Overview (up to 3 rows, then "and N more") | 2 | natural | -- |

### 3.1 Catalogue entries (shipped)

Every row is a flyout item (screen 11 draws all of them) and runs through the one arm-read-run
rule (`revision.md` 3.2); the parameters popover carries each one's options.

| Key: plain name (technical) | Home in the revised design | Mock | Fit | Element gap |
|---|---|---|---|---|
| `degree`: Connections (Degree centrality) | Rank > Connections; in, out and total as Measure > Values > Field | 11 | natural | #161 (a direction option on the run) |
| `betweenness`: Bridges (Betweenness centrality) | Rank > Bridges; heavy, so usually the waiting state | 4, 5, 11 | natural | #313 (weights and direction) |
| `closeness`: Reach (Closeness centrality) | Rank > Reach; "unavailable" with the reason when the graph is disconnected | 11 | natural | -- |
| `pagerank`: Influence (PageRank) | Rank > Influence; damping, iterations, tolerance in the popover and Define | 6, 11 | natural | -- |
| `eigenvector`: Influence by association | Rank > Influence by association | 11 | natural | -- |
| `katz`: Influence at a distance | Rank > Influence at a distance | 11 | natural | -- |
| `hits`: Hubs and authorities (HITS) | Rank > Hubs and authorities | 11 | awkward | none in the element; the design gap is that `revision.md` 3.4 says "two Measures from one run" while 2.4 puts hub and authority under one Measure's Values > Field. Section 13 |
| `louvain`: Communities | Groups > Communities; Resolution, Seed [dice], Iterations | 3, 11 | natural | -- |
| `leiden`: Communities, refined | Groups > Communities, refined | 11 | natural | -- |
| `label-propagation`: Communities, fast | Groups > Communities, fast | 11 | natural | -- |
| `girvan-newman`: Communities by cutting bridges | Groups > Communities by cutting bridges (heavy) | 11 | natural | -- |
| `components`: Separate pieces (Connected components; `strength`) | Structure > Separate pieces; Grouping > Define: Kind [Weak / Strong] on directed data; "Show the largest [8]" keeps 3,000 parts to nine rows | 11 | natural | -- |
| `shortest-path`: Shortest route (Dijkstra, Bellman-Ford) | Path > Shortest route: pick A, pick B; Method and Weighted in Define; a negative cycle is a caveat | 8, 11 | natural | -- |
| `all-pairs-distance`: How far from everything (Floyd-Warshall) | Structure > How far from everything: a Measure with diameter and radius in its Values header | 5, 11 | natural | #310 replaces the cubic run for the facts alone |
| `bfs`: Steps away (Breadth-first search) | Groups > Steps away from a node: an ordered Grouping; Define has From [node] and Within [any] steps | 11 | natural | #160 (a depth cap) |
| `dfs`: Exploration order (Depth-first search) | Rank > Exploration order (last in the list) | 11 | natural | -- |
| `kruskal`: Cheapest connecting network | Structure > Cheapest connecting network: an edge Set | 11 | natural | -- |
| `prim`: Cheapest network from one node | Structure > Cheapest network from a node: an edge Set, one pick | 11 | natural | -- |
| `bipartite-matching`: Best pairing | Path > Best pairing: an edge Set and a two-Group Grouping "Sides" | 11 | awkward | none in the element; the design gap is two tree rows from one run, so deleting or re-running one leaves the other. Section 13 |
| `max-flow`: Most that can flow | Path > Most that can flow: an edge Measure of flow "plus the cut" | 11 | awkward | none in the element; the same two-rows-from-one-run gap (the Measure and the cut Set). Section 13 |
| `min-cut`: Weakest link | Path > Weakest link between two (source, sink) and Weakest link anywhere (global): an edge Set; the side is a Members column | 11 | natural | -- |

### 3.2 Declared but not shipped, and proposed algorithms

| Key or name | Home in the revised design | Mock | Fit | Element gap |
|---|---|---|---|---|
| `clustering-coefficient` (#330) | Rank > Clustering (drawn at 50 percent with "#330" until registered) | 11 | natural | #330 |
| `all-paths` (#329) | Path > All routes: Max steps and Max routes in the popover; hands back an edge Set | 11 | awkward | #329; the design gap is that many ordered routes become one Set, so the routes cannot be told apart, coloured separately or counted. Section 13 |
| `k-core` | Structure > Densest shells: an ordered Grouping ("Shell 1"...) with a sequential palette | 11 | natural | registration of k-core (in `KNOWN_ALGORITHMS`, unregistered; the GPU package has it) |
| `link-prediction` | Structure > Likely missing links: a Findings row "312 pairs, Open in table" | 11 | awkward | registration; and the pair-list table gap of 3.0. Section 13 |
| Markov, spectral, hierarchical clustering (#55) | Groups > "Communities, Markov / spectral / hierarchical"; hierarchical has "Groups [k]" which re-cuts live | 11 | natural | #55 |
| A* (#55) | unplaced: Path > Shortest route's Method select lists Dijkstra and Bellman-Ford; A* is named nowhere | none | unplaced | #55. Section 13 |
| Edge betweenness (#55) | Rank > Bridges (edges): an edge Measure | 11 | natural | #55 |
| Articulation points, bridge edges (#311) | Structure > Bridge edges and cut points: one Set holding both halves | 11 | natural | #311 |
| Removal impact (#180; design "Removal impact" and "Scenarios") | a node's overflow "What breaks if removed" (its one home) | 77 | natural | #311, #180; the several-elements inspector has no "what breaks if these are removed", which is the design's "Scenarios" shape; noted, not counted as a gap this round |
| Diameter, radius, eccentricity, average path length (#310) | Structure > Distances: a Findings row on the Dataset (no members); eccentricity per node through How far from everything | 11 | natural | #310 |
| Anomaly detection (#312 research) | Rank > Unusual nodes: a Measure; the per-node "why" is that node's VALUES row on its About tab | 11 | natural | #312 |
| Temporal analysis (shape `temporal`) | the transport gear's OVER TIME section ("Over time: Communities, 12 steps") | 10 | awkward | #300; see 3.0 `temporal`. Section 13 |
| Community profiling and over-represented values (#193) | a Group's Define tab: the Profile disclosure ("Mostly conference 7 (83%)", then value, count, expected, adjusted p); the Grouping's Groups tab FINDINGS | 66 | natural | #193 |
| Group names (#191) | Grouping > Groups: "Names from [none v]"; a Group's name renames on double-click; the legend shows the same names | 71 | natural | #191 (names that follow a group across re-runs; the Record tab caveat until then) |
| Parameter sweep (#194) | Groups > Sweep...: parameter, from, to, steps; "a Findings table with Make an object per row" | 11 | awkward | #194; the design gap is where a ten-row table with a button per row is drawn (Findings shows three rows). Section 13 |
| Weight and direction options everywhere (#313) | the parameters popover and every Define tab: Weights [switch], Direction [As loaded v] | 4, 5 | natural | #313 |
| Custom algorithm plugin | lands in the flyout its catalogue `category` names (centrality to Rank, community to Groups, path and flow to Path, structure and prediction to Structure) | 11 | natural | -- (`category` exists; the mapping is `revision.md` 3.6) |

### 3.3 Running and reading (the run model)

| Capability | Status | Home in the revised design | Mock | Fit | Element gap |
|---|---|---|---|---|---|
| Start a run (scope, seed, name, sample or exact, style request) | shipped | every creation tool: arm, the secondary bar, Run; the popover's Exact switch; the scope line "on what is showing" or "in Group 2" | 4 | natural | -- |
| Run on load (`algorithmsOnLoad`) | shipped | Settings > Analysis: "Run when data loads" with a checklist (all off by default) | 13 | natural | -- |
| Batch (`runs.batch`) | shipped | Groups > Several..., Rank > Several...: a checklist popover, one Create; "Computing 1 of 6 [Cancel all]" | 4, 11 | natural | decision T8 (batch members after the first are created with the eye off) |
| Watch a run (status, progress, phase, ETA, queue position) | shipped | the tree row's progress ring and "queued, 3rd"; the summary row "Computing 42% [Cancel]" with the phase; the status bar's computing chip | 5 | natural | -- |
| Cancel a run | shipped | Cancel in the summary row and the chip; a cancelled creation removes the row | 5 | natural | partial results kept on cancel for sampled runs (`revision.md` section 8) |
| Re-run (`run.rerun()`) | shipped | the summary row's [Re-run (about 3 s)] in the stale state; Dataset "..." > Re-run all stale; the status bar's "3 stale [Re-run all]" | 45, 46 | natural | decision T10 (a re-run replaces under the same object id and keeps the old result for undo) |
| Queue policy (append, replace, now) | shipped | deliberately not on the everyday screen: internal to the objects API; a Define edit uses "replace" | none | natural | -- |
| Cost estimate (`session.estimate`, `catalog.metrics()`) | shipped | the cost at the right of every flyout row ("instant", "about 2 s", "at least 4 min"); the secondary bar's sentence; the popover's cost line | 4, 11 | natural | decision T9 (a `backend` field so "on the GPU" can be drawn) |
| Plan (`session.plan`) | shipped for `algo.run` | Filter's live "Matches 8 nodes" (a dry run); the export popover's size line | 11 | natural | #337 (plan for the visibility and export command kinds; only `algo.run` is a command today) |
| Cost gate | shipped | the waiting state: a hollow circle and "Run (about 4 min)" in the row; Define's [Run] [Approximate instead]; Settings > Analysis: Cost gate [30 s v] | 5 | natural | decision T10 ("defined, not started"); #159 (a measured ceiling) |
| Caveats (`run.caveats`) | shipped | the Record tab's Caveats disclosure; the summary row's "~ sampled"; the legend's departure line "computed on 2019-01 to 2019-12" | 10 | natural | the window bounds recorded in `Caveats` (decision L1) |
| Stale note (`run.stale`) | shipped | the stale state: an amber dot, "Stale: ran on 34, now 40 [Re-run]"; the status bar's stale chip | 46 | natural | the window excluded from the staleness digest (decision L1) |
| Engine versions (`run.engine`) | shipped | the Record tab's Engine row ("algorithms 2.0.1, on the GPU (single precision)") | 73 | natural | decision T9 (the backend word) |
| Run record (`run.record`) | shipped | the Record tab's "Copy as command"; the History dock's rows | 73 | natural | #145 (the journal) |
| List, get, remove runs (`runs.list`, `.remove`, `.bindings`) | shipped | the tree is the list; Delete on a row removes the run and its layers | 3 | natural | -- |
| Read a result (`RunResult.node()`, `.column()`, `.ranking()`, `.histogram()`, `.summary()`, `.reading()`) | shipped | Measure > Values (Min, Max, Mean, Median, the histogram, the TOP list); the reading row in the header block; the "?" popover | 6 | natural | decision R2 (a `{between}` selection target for the histogram band drag) |
| Column to ids (#148) | proposed | the Table dock's object columns; a Set's Members rows | 9 | natural | #148 |
| Result path and term (`results.path`, `.term`) | shipped | deliberately not on the everyday screen: the objects API writes selectors from it; "Copy as command" shows it | none | natural | -- |
| Metric availability (`catalog.metrics()`; `applicable()` #334) | shipped | a flyout row reads "unavailable" with the reason in its tooltip ("needs a connected graph", "needs WebGPU"); "in tree" when it already ran | 11 | natural | #334 |
| Options for a form (`catalog.optionsFor()` #336) | proposed | the parameters popover and the Define tab: one row per option descriptor with resolved bounds | 4 | natural | #336 |
| Results as attributes (`origin: "result"`) | shipped | the Table dock's object columns; a node's About tab VALUES rows; Filter > By range lists every Measure | 9 | natural | -- |
| Suggested styles (auto-apply) | shipped | the first paint: the first free channel in the kind's order (decision T7); the covered object's "Covered by X on N of N members" | 3, 6 | natural | decision T7 (per-kind order; never drops itself) |
| Analysis history / undo (#145) | proposed | the History dock (a tab of the bottom dock; the closed dock's handle keeps it one click away); Ctrl+Z and Ctrl+Shift+Z | 9 | natural | #145; decision S1 (`session.objects.undo()` / `redo()`) |

## 4. Layouts

Every layout is a row of the Layout select on Dataset > Layout, which lists
`catalog.layouts()` filtered on served, with "Recommended: ..." as its first row. The tab is
in the strip on every Dataset screen but never drawn open, so the mock column reads "2" for
the strip only.

| Id: plain name (technical) | Home in the revised design | Mock | Fit | Element gap |
|---|---|---|---|---|
| `force`: Spread Out (ngraph, d3-force-3d; live) | the Layout select; the transport row (Pause, Step, Re-run, "Settling 62%"); the status bar's layout chip | 2 | natural | #144 (a public transport) |
| `force-2d`: Spread Out, Flat | the Layout select; Dimensions reads "2D, flat layout: shown in 3D as a plane" | 2 | natural | -- |
| ForceAtlas2 (CPU and WebGPU) | the engine select inside the Layout gear popover; the acceleration line "Runs on the GPU (NVIDIA T4)" | 2 | natural | decision T9 (backend field) |
| Spring (Fruchterman-Reingold) | the engine select in the gear | 2 | natural | -- |
| Kamada-Kawai | the engine select in the gear | 2 | natural | -- |
| ARF | the engine select in the gear | 2 | natural | -- |
| `circular`: Ring | the Layout select; "Order by [Load order v]" appears | 2 | natural | -- |
| `shell`: Concentric Rings | the Layout select; "Group by [Communities v]" appears (needs a partition) | 2 | natural | -- |
| `spiral`: Spiral | the Layout select; Order by | 2 | natural | -- |
| `spectral`: Natural Grouping | the Layout select (size rating 2,000 shown in the row) | 2 | natural | -- |
| `planar`: No Crossings | the Layout select; "unavailable" with the reason when the graph is not planar | 2 | natural | -- |
| `random`: Scattered | the Layout select | 2 | natural | -- |
| `hierarchical`: Tree (Layered) | the Layout select; "Root [pick a node] / Direction [Down v]"; the caveat "Contains cycles: 12 edges reversed [Make a set]" | 2 | natural | -- |
| `bipartite`: Two Columns | the Layout select; Group by | 2 | natural | -- |
| `layers`: Columns by Group (Multipartite) | the Layout select; Group by | 2 | natural | -- |
| `fixed`: Keep Positions | "Positions from file: 34 of 34 [Keep positions]" on the Layout tab; also a row of the select | 2 | natural | -- |
| `radial` (declared, unserved) | appears in the Layout select when served; Root [pick a node] | 84 | natural | the layout is unserved (`UNSERVED_LAYOUT_IDS`) |
| `grid` (declared, unserved) | appears when served | none | natural | unserved |
| Sugiyama (proposed) | appears when served | none | natural | design 9.3; no issue |

| Layout control | Status | Home in the revised design | Mock | Fit | Element gap |
|---|---|---|---|---|---|
| Choose a layout and its options (`el.layout`, `layoutConfig`, `setLayout`) | shipped | Dataset > Layout: Layout [Spread out v] with the gear (engine and options) | 2 | natural | the name is settable in three places with different defaults (design 4.7); the app writes one |
| Recommend a layout (`recommendLayout`) | shipped | the select's first row "Recommended: Spread out (small, one part)" with the reason | 83 | natural | -- |
| Pace the simulation (pre-steps, steps per frame, stop delta, re-frame interval) | shipped | the gear popover | none | natural | -- |
| Wait for settle (`waitForSettled`, `graph-settled`) | shipped | the transport row's "Settling 62%" / "Settled"; the status bar's "Spread out: settled" | 2 | natural | -- |
| Pin / unpin nodes | shipped | a node's header Pin; the Layout tab's "Pinned 2 [Unpin all]"; a "Pinned" Set in the tree; grab-and-drag in XR pins | 9 | natural | -- |
| Drag a node | shipped | the Select tool: drag a node (pins it when `pinOnDrag`) | 86 | natural | -- |
| Edge weights honoured (`honoursWeights`) | shipped | the layout engine's gear popover | none | awkward | none in the element; the design gap is that no row says whether this engine reads weights or lets the reader turn it off. Section 13 |
| Play / pause / step / stop a live layout (#144) | proposed | the Layout tab's transport row [Pause] [Step] [Re-run]; the status bar's layout chip | 2 | natural | #144 |
| Layout over a scope (#144) | proposed | the Layout tab's caveat row "Ring on 12 of 34 (Group 2)" | 85 | awkward | #144; the design gap is that no verb starts a scoped layout (a Set's or Group's overflow has Select, Focus, Locate only). Section 13 |
| Positions API (`session.positions`; typed verbs #144) | partial | a node's overflow "Copy position"; Export data... "Include positions"; the project file | 86 | natural | #144 |
| Layout change event (#144) | proposed | deliberately not on the everyday screen: the layout chip and the transport row read it | none | natural | #144 |
| Layout dimension (2D layouts in a 3D view) | shipped | the Layout tab's Dimensions row ("3D, follows the view"; "2D, flat layout: shown in 3D as a plane") | 83 | natural | -- |
| GPU layout (ForceAtlas2, Fruchterman-Reingold, spring-electrical on WebGPU) | shipped with the package | the Layout tab's acceleration line; Settings > Performance | 83 | natural | decision T9 |
| Custom layout plugin | shipped | the Layout select (catalogue-driven) | none | natural | -- |
| Animated transitions (`transitionMs`) | shipped | Settings > Canvas: "Animate layout changes" [switch] "500 ms" | none | natural | -- |

## 5. Styling: channels and layers

| Capability | Status | Home in the revised design | Mock | Fit | Element gap |
|---|---|---|---|---|---|
| List / get layers (`styles.list`, `.get`) | shipped | the tree (its order is the paint order); a node's LOOK disclosure | 3 | natural | -- |
| Add / update / remove / move layers | shipped | a Style tab's "+", its rows, the eye and the minus; dragging a tree row | 3, 8 | natural | -- (#380 is the app's empty-spec bug) |
| Validate a spec (`styles.validate`) | shipped | a rule Set's expression field shows the error inline | none | natural | -- |
| Selector: expression | partial | a rule Set (Filter > By rule) | 11 | natural | #149 (the standalone query engine) |
| Selector: has | shipped | deliberately not on the everyday screen: the objects API writes it for a Measure's encoding | none | natural | -- |
| Selector: ids | shipped | a fixed Set ("12 nodes, 3 edges, fixed [Edit members]") | none | natural | -- |
| Selector: everything | shipped | Dataset > Canvas: the DEFAULT LOOK section (the unlocked dataset-default layer) | none | natural | decision Y6 (an unlocked dataset-default layer above the locked base) |
| Encode a result (`styles.encode`) | shipped | a Measure's or Grouping's Style tab: the encoding block | 6, 7 | natural | -- |
| Encode a data attribute (`encode: {by: path}`) | shipped in the element | Dataset > Data: a column's "..." > Colour by, Size by, Shape by, Group by (creates a Measure or Grouping from the column); Groups > By attribute... | 7, 10 | natural | `encodeAttribute` (`revision.md` 5.7); #190 is the app's missing UI |
| Highlight a set result (`styles.highlight`) | shipped | a Set's Style tab: NODES and EDGES paint rows | 8 | natural | decision S3 (non-exclusive; per-Set colour from a disjoint highlight palette, Y3) |
| Scales (linear, log, neglog10, sqrt, pow, bins, quantile, ordinal, passthrough) | shipped | the encoding block's Scale [Even steps v] row, by plain name, filtered by `scalesForDomain` | 6 | natural | -- |
| Palettes (7 sequential, 5 categorical, 3 diverging, 3 highlight) | shipped | the palette picker from any Palette row; sequential first for a Measure, categorical for a Grouping | 6, 7 | natural | decision Y3 (a highlight palette disjoint from the categorical ones) |
| Custom palette plugin (`registerPalette`) | shipped | the picker's "Add palette..." (hex list or name); the project file carries it | none | natural | -- |
| More groups than colours (overflow policy) | shipped | the Grouping's Style tab: Other [chit], Overflow [Other / Shape / Extend], Show the largest [8 v] | 7 | natural | #201 (the Other swatch's colour in the legend) |
| Legend model (`styles.legend()`) | shipped as data | the legend card (L) at the bottom right of the canvas, above the toolbar's right end; one block per visible Measure, Grouping or Set | 3, 8, 10 | natural | #292 (drawn by the element so it reaches captures); decision Y4 (width and pattern on a highlight block) |
| Explain an element's look (`styles.explain`) | shipped | a node's About tab: the LOOK disclosure ("Colour from Conference, Size from Bridges, Outline from Top 10"), one row per channel when open | 9 | natural | -- |
| Resolve to static (`styles.resolveToStatic`) | shipped | the LOOK disclosure's "+" is "Style this node...", which creates a one-node Set and opens the picker | 9 | natural | -- (the design makes a Set rather than resolving a channel, so the edit is a tree row) |
| Style templates / documents (`toDocument`, `applyTemplate`) | shipped | Export > "Export styles..."; Dataset > Canvas: Look [Default v] with "Save current as look..."; any object's Style overflow "Save style..." / "Apply style [v]" | 94 | natural | decision Y6 (themes restricted to match-everything layers; `applyTemplate` replaces the whole stack today); a saved style as a layer template without a selector (`revision.md` section 8) |
| Style change event and problems (`style:changed`, `style:problem`) | shipped | deliberately not on the everyday screen for `style:changed`; `style:problem` is the failed state "Paint refused: <reason> [Reset style]" | none | natural | -- |
| Settled (`styles.settled()`) | shipped | "Restyling 38%" in the summary row while a large repaint runs | none | natural | -- |
| Layer groups (design 9.3; app #171) | proposed | the tree's nesting: a Grouping is the folder of its Groups; hiding the parent hides all; an Opacity paint row on the object fades its whole effect | 3 | natural | -- (the objects API projects the tree onto the flat stack; a per-group opacity is the object's Opacity channel) |
| Theme (light / dark canvas; #291, #331) | proposed | Dataset > Canvas: Background "Follow theme"; Look [Default v]; Settings > General: Theme [Follow system v] | 12, 13 | natural | #291, #331 |
| Style presets | proposed | the Look select (Default, Presentation, Print, Colour-blind safe, High contrast, Dark) and saved styles | 87 | natural | #331; decision Y6 |

### 5.1 Channels

| Channel | Home in the revised design | Mock | Fit | Element gap |
|---|---|---|---|---|
| `node.color`, `node.opacity` | NODES paint rows and encoding blocks on every Style tab; "Dim the rest" writes opacity | 3, 6 | natural | -- |
| `node.size` | the NODES "+" Size; a Measure's Size block ("Sizes from / to") | 6 | natural | -- |
| `node.shape` (25 meshes) | the NODES "+" Shape; a Grouping's Shape block (one mesh per group; the Overflow "Shape" policy) | 92 | natural | -- |
| `node.outline`, `node.glow`, `node.glowStrength`, `node.wireframe`, `node.flat` | Outline and Glow in the NODES "+"; Glow strength, Wireframe and Flat under "More..." | 8 | natural | -- |
| `node.label`, `node.labelStyle` | Dataset > Canvas: Labels [Top 6 by Connections v] with the label-style gear; any Style tab's NODES "+" Label (attribute, member value, fixed text) | 3 | natural | a top-N scope as a layer selector for the label budget (decision Y5) |
| `node.tooltip`, `node.tooltipStyle` | Dataset > Canvas: Tooltip [Label + 3 attributes v] with a gear; the NODES "+" Tooltip | 89 | natural | -- |
| `node.marker` (#295) | the NODES "+" Marker; Dataset > Canvas: "Note markers [switch]" (Shift+N); a note's callout | 81 | natural | #295 |
| `edge.color`, `edge.opacity`, `edge.width` | EDGES paint rows; an edge Measure's blocks | 8 | natural | -- |
| `edge.style`, `edge.patternCount` | the EDGES row Pattern [Dash v] with the repeat count in its popover | 8 | natural | -- |
| `edge.curvature` | the EDGES "+" Curve | none | natural | -- |
| `edge.arrowHead`, `edge.arrowTail` and their Size, Color, Opacity, Text, TextStyle | the EDGES "+" Arrows (head, tail; size, colour, text in a popover); Dataset > Canvas: Arrows [switch] on directed data | 8 | natural | -- |
| `edge.animationSpeed` | the EDGES "+" Animation (flow speed) | none | natural | -- |
| `edge.label`, `edge.labelStyle` | Dataset > Canvas: Edge labels [none v]; the EDGES "+" Label | 87 | natural | -- |
| edge tooltip | withdrawn in the element (edges are unpickable); not offered | none | does not fit | #319 would reopen it |

## 6. Labels

| Capability | Status | Home in the revised design | Mock | Fit | Element gap |
|---|---|---|---|---|---|
| Label text from a path (`nodeLabelPath`) | shipped | Dataset > Canvas: Labels; Dataset > Data: a column's "..." > Set as label | 3 | natural | "Set as label" after a load re-imports today (section 8 of `revision.md`, last row) |
| Rich text (font, size, weight, colour, gradient, outline, shadow, background, borders) | shipped | the label-style popover: Text and Background sections | 88 | natural | -- |
| Placement (attach position, offset) | shipped | the label-style popover: Placement | 88 | natural | -- |
| Billboarding | shipped | the label-style popover: Placement | 88 | natural | -- |
| Depth fade | shipped | the label-style popover: Placement, "fade with distance" | 88 | natural | -- |
| Badges (notification, count, icon, progress, dot...) | shipped | the label-style popover: Badge [none v] | none | awkward | none in the element; the design gap is that a badge carries a per-node value (a count, a progress) but the popover row is dataset-wide and unbound. Section 13 |
| Animation (pulse, bounce, shake, glow, fill) | shipped | the NODES "+" Animation (label pulse) on any object's Style tab | none | natural | -- |
| Text on arrow heads and tails | shipped | the Arrows popover's text fields | none | natural | -- |
| Wrap to a width (#294) | proposed | the label-style popover: "Wrap at 20 characters, 2 lines", "Cut at 15 characters" | 88 | natural | #294 |
| Label overlap avoidance (#5) | proposed | the label-style popover: "Avoid overlaps [switch]" | 88 | natural | #5 |

## 7. Camera and view modes

| Capability | Status | Home in the revised design | Mock | Fit | Element gap |
|---|---|---|---|---|---|
| View modes (2d, 3d, vr, ar) | shipped | the toolbar's mode switch [2D / 3D / VR / AR]; 5 toggles 2D and 3D; a View stores its mode | 2 | natural | -- |
| 3D orbit camera | shipped | the Hand tool and a plain drag in 3D; pinch on touch | 51 | natural | #290 (wheel zoom and right-drag pan in 3D) |
| 2D camera (wheel zooms, drag pans) | shipped | the Hand tool; wheel | 51, 52 | natural | #290 (zoom toward the cursor) |
| Camera state (`getCameraState`, `setCameraState` with easing) | shipped | the Views list: "+" saves, click applies with a 500 ms animation; a View's "Update to current" | 2 | natural | a preset that carries mode and mask (`feature-fit/6-camera.md` section 4) |
| Fit to graph (`zoomToFit`) | shipped | the framing pill ("Fit v") in the right header; the zoom menu; a key | 2, 51 | natural | -- |
| Built-in views (Fit, From above, side, front, Isometric) | shipped | the framing pill's menu, listing `catalog.cameras()` with the modes each works in | 2 | natural | -- |
| Saved views (camera presets: save, load, list, export, import) | shipped | the Views list above the tree ("Overview" written by the element; the reader's from "+"); the Views "..." Export views... / Import views... | 2, 53 | natural | decision R3 (namespaced names; the "Overview" default preset) |
| Reset camera (`resetCamera`) | shipped | the zoom menu's "Reset view (Home)" | 51 | natural | -- |
| Starting distance | shipped | Settings > Camera: Starting distance [Fit v] | none | natural | -- |
| Focus on a node / zoom to nodes | partial | a node's header Locate; a Set's Members header Locate; the zoom menu's "to selection" | 9, 51 | natural | a `zoomToNodes(ids)` / `fit(scope)` verb (design 4.8; the AI command exists, the public method does not) |
| Follow a node (#183) | proposed | a node's overflow "Follow" | 54 | natural | #183 (`followNode`) |
| Linked cameras (#186) | proposed | the "Link cameras" switch in the status bar while Compare is open | 78 | natural | #186 (`linkTo`) |
| Camera change event (`camera-state-changed`) | shipped | deliberately not on the everyday screen: the drift dot after a View's name reads it | none | natural | -- |
| Coordinate transforms (`worldToScreen`, `screenToWorld`) | shipped | deliberately not on the everyday screen: the minimap's viewport rectangle and a note's callout leader use them | none | natural | -- |
| Minimap / overview (#293) | proposed | Dataset > Canvas: "Minimap [switch]" (M); drawn at a canvas corner | 52 | natural | #293 |
| Custom camera view plugin | shipped | the framing pill's menu (catalogue-driven) | none | natural | -- |
| Background (colour or skybox) | shipped | Dataset > Canvas: Background [chit] with "Follow theme" and "Image..." | 87 | natural | -- |
| Input enable (`setInputEnabled`) | shipped | deliberately not on the everyday screen: the app turns input off under a sheet (Settings, Welcome) | none | natural | -- |
| Wheel zoom toward the cursor, right-drag pan (#290) | proposed | the Hand tool's behaviour; Settings > Camera: Orbit sensitivity, "Invert wheel" | 51 | natural | #290 |

## 8. XR (VR and AR)

| Capability | Status | Home in the revised design | Mock | Fit | Element gap |
|---|---|---|---|---|---|
| Enter VR / AR (`viewMode = "vr"`, `exitXR`) | shipped | the VR and AR segments of the mode switch: enter at once; the panels minimise; the status bar reads "VR [Exit]"; on return "Back from VR: 2 objects added" | 2 | natural | -- |
| Support check (`isVRSupported`, `isARSupported`) | shipped | the segments are drawn only when supported; a segment that cannot start is disabled with the reason and the fix in its tooltip | 2 | natural | -- |
| XR button and availability warning (`xr.ui`) | shipped | deliberately not on the everyday screen: the mode switch replaces the element's own corner button, so the app configures `xr.ui` off | 30, 100 | natural | -- |
| Reference space and optional features (`xr.vr`, `xr.ar`) | shipped | Settings > Headset: Reference space [Local floor v] | none | natural | -- |
| Hand tracking, controllers, near interaction (`xr.input`) | shipped | Settings > Headset: Hand tracking [switch], Controllers [Both v] | none | natural | -- |
| Grab and drag a node in XR | shipped | in the headset, the element's own gesture; the node is pinned and the Layout tab's Pinned row grows | none | natural | -- |
| Thumbstick camera (pivot camera in XR) | shipped | in the headset, the element's own controls | none | natural | -- |
| Z-axis amplification | shipped | Settings > Headset: Z-axis amplification [1.0] | none | natural | -- |
| Teleportation | shipped, off | Settings > Headset: Teleportation [switch] | none | natural | -- |
| Selection in XR | shipped | the same selection: a pick in the headset halos the row on return; the status bar count | none | natural | -- |
| World-space panels, forearm anchoring, grab-and-scale, ray / pinch / gaze selection, snap turn, AR passthrough framing | proposed (design 9.3, 2.1) | not this round: the only in-headset scoping is Focus-then-enter (a right-click on the VR segment lists "Everything" and every Set); the in-headset object list (eyes, Focus) is the stated target once the objects API is the element's | none | awkward | design 9.3; the element's in-headset UI must draw the tree's eyes and Focus, which the app cannot do inside a headset. Section 13 |
| AI in XR (voice in a headset) | partial | the assistant's microphone through the element's voice adapter; objects made by voice appear in the tree on return | none | natural | #337 (commands as the tool vocabulary) |

## 9. AI assistant

| Capability | Status | Home in the revised design | Mock | Fit | Element gap |
|---|---|---|---|---|---|
| Enable with a provider (OpenAI, Anthropic, Google, WebLLM, mock) | shipped | Settings > Assistant: Provider [Anthropic v] (Anthropic, In-browser (WebLLM), None), Model, API key; the Assistant tab's first state "Choose a provider" | 13 | natural | -- |
| Send a command (`aiCommand`, `cancelAiCommand`, `retryLastAiCommand`) | shipped | the Ask button (backtick) opens the dock's Assistant tab with the composer; Ctrl+K's last row "Ask: <sentence>" | 9 | natural | -- |
| Status and streaming (`ai-status-change`, `ai-stream-*`) | shipped | the transcript: a turn streams in; each tool call is a collapsed row ("Ran Rank > Bridges") | none | natural | `ai-stream-tool-result` carries the object ids (`revision.md` 6.5) |
| Voice input (`getVoiceAdapter`, `ai-voice-*`) | shipped | the microphone at the right of the composer | 82 | natural | -- |
| Key persistence (encrypted, local or session) | shipped | Settings > Assistant: "Keep the key [This session / On this device / Never]" | 13 | natural | -- |
| Built-in tools (captureScreenshot, captureVideo, clearStyles, describeProperty, findAndStyleEdges, findAndStyleNodes, findNodes, getSchema, listAlgorithms, queryGraph, runAlgorithm, sampleData, setCameraPosition, setDimension, setImmersiveMode, setLayout, zoomToNodes) | shipped | each lands where the reader's own action would: runAlgorithm makes a tree row ("Made: Bridges"), findAndStyleNodes makes a Set with a Style, setLayout writes the Layout tab, captureScreenshot is an Export; clearStyles is "hide all" as one undo step | none | natural | #337 (the tools rewritten as session commands so the row the assistant makes is the row the tool makes) |
| Schema extraction | shipped | deliberately not on the everyday screen; disclosed by the privacy line "Questions send a sample of up to 50 nodes and their attributes to Anthropic" | none | natural | -- |
| Multi-turn tool use | partial | the transcript: a follow-up turn is one request | none | natural | `design/ai/ai-multi-turn.md` |
| Session commands as the tool vocabulary (#337) | proposed | the History dock's rows and every Record tab's "Copy as command" show the same JSON the assistant calls | none | natural | #337 |
| Say what data leaves the browser (app #326) | app issue | the one line above the composer, always; Settings > Assistant's privacy line | 82 | natural | -- (the element's schema extractor decides the sample; the words come from it) |

## 10. Events, session model, performance and acceleration

### 10.1 Events (for the app and for third-party consumers)

Every event is consumed, never operated, so each is "deliberately not on the everyday screen"
and the home column names the surface that mirrors it. The last two rows are the two things a
third-party consumer needs that the inventory lists as proposed.

| Event | Home in the revised design (the surface that mirrors it) | Mock | Fit | Element gap |
|---|---|---|---|---|
| `run:changed` | the tree row's state glyph and ring; the computing chip | 5 | natural | -- |
| `selection:changed` (DOM `selection-changed`) | the tree's child-of-selected tint; the status bar count; the Table row tint | 9 | natural | -- |
| `visibility:changed` | the status bar's mask readout; the transport counts | 10 | natural | -- |
| `style:changed`, `style:problem` (DOM `style-changed`) | the legend; "Restyling 38%"; the failed state "Paint refused" | 45 | natural | -- |
| `data-loaded`, `data-loading-*`, `data-added`, `elements-removed`, `snapshot-replaced`, `node-add-before`, `edge-add-before`, `node-update-after`, `edge-update-after` | the Loading chip; the stale chip after Add data ("Stale: ran on 50,000 nodes, now 56,000"); the Overview counts | none | natural | -- |
| `node-click`, `node-hover`, `node-drag-start`, `node-drag-end` | the Select tool | 3 | natural | no edge events (#319) |
| `layout-initialized`, `graph-settled`, `zoom-to-fit-complete`, `camera-state-changed` | the layout chip; the View's drift dot | 2 | natural | -- |
| `operation-queue-active/idle`, `operation-start/complete/progress/obsoleted`, `operation-batch-complete` | the computing chip "Computing 1 of 6 [Cancel all]" | 5 | natural | -- |
| `animation-progress`, `animation-cancelled`, `screenshot-enhancing`, `screenshot-ready` | the computing chip during an export ("Exporting video 30%") | none | natural | -- |
| `graph-frame-stable`, `render-initialized`, `manager-initialized`, `lifecycle-initialized/disposed`, `skybox-loaded` | internal to the app's lifecycle (Export waits for a stable frame) | none | natural | -- |
| `error` (DOM) | the status bar's red error chip with Details; a lost graphics context is the blocking card with Reload view (round-3/history-errors.md section 5) | 47 | natural | --. Section 13 |
| `ai-*` (eleven) | the Assistant transcript | none | natural | -- |
| `data:loading`, `data:changed`, `layout:changed`, `journal:appended` (session, proposed) | the same surfaces as their DOM cousins; the History dock for `journal:appended` | none | natural | #147, #144, #145 |
| `objects:changed` (the objects API's event; new) | the tree itself; a third-party consumer's tree would read the same event | 3 | natural | decision S1 (the objects API and its event) |
| A published command vocabulary a consumer or agent can call (#337) | the History dock's "Copy as command"; every Record tab | none | natural | #337 |

### 10.2 Session model

| Capability | Status | Home in the revised design | Mock | Fit | Element gap |
|---|---|---|---|---|---|
| Headless session (`createGraphSession()`) | shipped | deliberately not on the everyday screen (a test's or a worker's door) | none | natural | #147 (attribute columns and an executor for a standalone session) |
| Two views of one dataset | designed | Compare: a second canvas beside the first on the same tree and selection | 78 | natural | #186 (a per-canvas layer visibility; large) |
| Commands (`session.run(cmd)`, `.estimate`, `.plan`) | partial | the History dock's rows; "Copy as command" on every Record tab; Ctrl+K lists every flyout row under both names | none | natural | #337 |
| Journal (#145) | proposed | the History dock; hovering a row outlines the object it touched | 9 | natural | #145 |
| Recipes (design 4.11) | proposed | file menu "Run a recipe..."; Export > Recipe ("Styles only" ticked to carry a look); a Record tab's "Recipe: <name>, step 3" | 16, 20 | natural | design 4.11; no issue |
| Notes and annotations (#145; markers #295) | proposed | the Note tool (N): click a node, an edge, a point or a tree row; the Notes section on every Record tab and a node's About tab; the Dataset's Overview NOTES disclosure (every note by anchor; Orphaned with Reattach and Delete); Canvas > Note markers (Shift+N); Settings > General: Author name | 2 | natural | #145 (`NotesApi`), #295 (the marker channel), #319 (a note on an edge needs edge picking) |
| Undo / redo | not the element's today | Ctrl+Z / Ctrl+Shift+Z; the History dock; every creation, re-run, style edit and tree move is one step | 9 | natural | decision S1 (the objects API keeps the history and exposes `undo()` / `redo()`); this reverses design 9.2's "the stack is the consumer's" |
| Batch operations (`batchOperations`) | shipped | deliberately not on the everyday screen: an assistant request and a Several... run are one visual batch | 74 | natural | -- |
| Configuration document (`StyleTemplate`) | shipped | Export > Export styles...; the project file | none | natural | -- |
| Logging (`catalog.logSinks()`) | shipped | Settings > Advanced: Logging [Warnings v], "Send logs to [none v]", "Copy diagnostics" | none | natural | -- |
| Errors (`GraphtyError` codes) | shipped | per object: the failed state's message; inline on a field (`E_OPTION_RANGE`, a bad expression); a flyout row's "unavailable" tooltip | 5 | natural | -- (element-level errors are the unplaced `error` row of 10.1) |
| Extension points (six registries plus accelerators) | shipped | every list a panel draws is the catalogue: a plugin appears in its flyout, select or picker with no app change | 11 | natural | -- |
| Framework wrappers (#40) | proposed | not a reader capability; the app is itself the React consumer | none | natural | #40 |

### 10.3 Performance and acceleration

| Capability | Status | Home in the revised design | Mock | Fit | Element gap |
|---|---|---|---|---|---|
| WebGPU acceleration (`acceleration.policy`, `.minNodes`; `capabilities.acceleration`) | shipped with the package | Settings > Performance: Acceleration [Auto v] (Auto, Off, Required), "Use the GPU above [5,000] nodes", the state line ("Active: NVIDIA T4, WebGPU" / "Unavailable: needs a secure context"); the Layout tab's acceleration line; a GPU glyph in the computing chip; "on the GPU" in every Record tab | 13 | natural | decision T9 (a `backend` field on `RunRecord` and `CostEstimate`; until it lands the words are not drawn) |
| Never fall back silently | shipped by rule | the failed state with [Retry] and an explicit [Retry on the CPU] | 45 | natural | a per-start backend override (`revision.md` section 8) |
| Cost model and calibration (`calibrate()` #146, #159) | partial | Settings > Performance: [Measure this machine (about 10 s)]; the confidence word in every cost ("about" measured or calibrated, "at least" modelled) | 11, 13 | natural | #146, #159 |
| Exact vs approximate (`exact`, `sample`, `approximable`) | shipped | the popover's Exact [switch] and Sample [2,000]; Settings > Analysis "Exact above [2,000] nodes: sample instead"; "~" before an approximate count; [Approximate instead] on a waiting object | 4 | natural | -- |
| Render settings (`setRenderSettings`) | shipped | Settings > Performance: Rendering [WebGL v] | 13 | natural | -- |
| WebGPU rendering (#36) | proposed | Settings > Performance: Rendering [WebGPU] when #36 lands | none | natural | #36 |
| Profiling and stats (`enableDetailedProfiling`, `getStatsManager`) | shipped | Settings > Performance: "Show frame stats [switch]" (an overlay at a canvas corner) | 13 | natural | -- |
| Frame stability (`waitForStableFrame`) | shipped | deliberately not on the everyday screen: Export waits for it | none | natural | -- |
| Large graphs (instancing; the render ceiling #302) | partial | Dataset > Overview "Drawing N of M"; Settings > Performance: Render ceiling [200,000] | 13 | natural | #302 |
| Worker-hosted session (design 9.3) | proposed | deliberately not on the everyday screen | none | natural | design 9.3; no issue |

## 11. Screenshots, video, export

| Capability | Status | Home in the revised design | Mock | Fit | Element gap |
|---|---|---|---|---|---|
| Screenshot (format, size, transparent, quality, presets, camera, wait for settle) | shipped | Export > Export image...: Preset [Web v] first (print, web-share, thumbnail, documentation), Format, Scale, Framing [Current v], Transparent, Legend in picture, Notes in picture, Quality (a disclosure: supersample, MSAA, FXAA); a View's "Export image from this view" | 95 | natural | -- |
| Destinations (blob, download, clipboard with a status) | shipped | Export downloads; "Copy image (Ctrl+Shift+C)"; the clipboard status (permission denied, not a secure context) as the computing chip's text for a few seconds | 95 | natural | -- |
| Video (WebM, MP4, fps, bitrate, camera path with waypoints and easing) | shipped | Export > Export video...: Camera [Hold / Orbit / Along views v] (the Views list in order is the storyboard, seconds per waypoint), Duration, Format, Frames per second, "While the layout settles", "While the time window plays", Transparent, the estimate line; progress in the computing chip with Cancel | 98 | natural | #144 and #300 for the two "while" rows |
| Legend in the picture (#292) | proposed | Export image...: "Legend in picture" (on by default) | 95 | natural | #292 |
| SVG and PDF capture | proposed | the Format select lists only what `capabilities.capture` writes | none | natural | design 4.9 (`CaptureCapability.svg/pdf` declared, unbuilt) |
| Capture plan (size, nodes in frame, bytes) | proposed | the popover's secondary line "2400 x 1600, 34 nodes in frame, about 1.2 MB" | 95 | natural | design 4.9 (`view.capture` plan; `PlanEffect.image` exists) |
| Report (HTML, Markdown, PDF; #187) | proposed | Export > Export report...: a checklist of tree rows in tree order plus Statistics, Image, Legend, Methods, Notes; "Copy methods text" on every Record | 97 | natural | #187; design 4.9 |
| Evidence bundle (ZIP) | proposed | Export > Export bundle... | 97 | natural | design 4.9 |
| Export a result (ranked list, groups as CSV; app #178) | proposed | the one Export row on every Record tab (Members CSV, Ranked list CSV, Membership CSV, Subgraph GraphML, Framed image) | 73 | natural | #178; `RunResult.ranking()` reads it today, no CSV writer |
| Export data | proposed | Export > Export data... | 96 | natural | data exporters in the element (graph-io has them) |
| Export camera presets | shipped | the Views header's "..." > Export views... | 53 | natural | -- |
| Export styles (`toDocument`) | shipped | Export > Export styles... | 94 | natural | -- |

## 12. Cross-cutting capabilities the owner asked to see named

These are not inventory rows of their own but were asked for explicitly; each is placed so it
can be checked.

| Capability | Home in the revised design | Mock | Fit | Element gap |
|---|---|---|---|---|
| Temporal attributes (a time-typed column) | Dataset > Data: the time glyph on the column; the Findings door while it has no role | 10 | natural | #333 |
| Time window filter | the transport bar's band and the gear's Window from / to; the status bar's readout; a View saves it as part of its mask | 10 | natural | decisions L1, L3, L6 |
| Time playback (#300) | the transport bar's Play, step, Speed, Mode, Step, the two re-run switches, CHANGES | 10 | natural | #300 |
| GEXF spells and intervals | the gear reads "From [start v] To [end v]" when `timeAttributes()` reports intervals; the reader never chooses the form | none | natural | decision L4 (an interval window and a time role naming a pair or a spells column; medium) |
| Saved views and camera presets | the Views list; the framing pill; Export / Import views | 2 | natural | decision R3 |
| Follow a node (#183), linked cameras (#186), minimap (#293) | a node's overflow "Follow"; Compare's "Link cameras"; Canvas > Minimap (M) | 52, 54 | natural | #183, #186, #293 |
| Video export and camera paths | Export > Export video... with "Along views" as the storyboard | 98 | natural | -- |
| Screenshots with presets | Export > Export image... with Preset first | 95 | natural | -- |
| XR / VR / AR and hand tracking | the mode switch; Settings > Headset | 2 | natural | -- |
| The AI assistant and voice | the Ask button, the Assistant dock tab, the microphone, Ctrl+K's "Ask:" row; Settings > Assistant | 9 | natural | #337 |
| Notes, annotations and markers (#295) | the Note tool; Notes sections; the Overview NOTES disclosure; Canvas > Note markers | 2 | natural | #145, #295 |
| Comparison (#186) | two tree rows plus Compare, or "Compare with [object v]" in an overflow; a Findings row with the agreement or a Difference Measure | 78 | natural | #186 (per-canvas layer visibility; large); an agreement statistic and a Difference (small) |
| Legends (#292) | the legend card (L), drawn from `styles.legend()` now and by the element once #292 lands | 3 | natural | #292, decision Y4 |
| Label styles | Canvas > Labels with the label-style gear; a Label row on any Style tab | 3 | natural | #294, #5 |
| Declutter (label budget, hover highlight, "Show hidden faintly") | Canvas > Labels [Top 6 by Connections v]; Settings > Canvas hover highlight; Canvas > "Show hidden faintly" (`visibility.showContext`) | 3 | natural | decision Y5 (a top-N selector) |
| Palettes and style templates | the palette picker; the Look select; saved styles; Export styles... | 6, 7 | natural | decision Y6 |
| Acceleration status and policy | Settings > Performance; the Layout tab's line; the GPU glyph; Record's Engine row | 13 | natural | decision T9 |
| Load replace / merge | Open... replaces the dataset; Add data... (file menu, the Dataset "+") merges into it | 2 | awkward | none in the element; the design gap is the missing collision policy on Add data... (section 1, "Incremental add"). Section 13 |
| Import column roles (id, label, weight, time, type, source, target) | Dataset > Data: a column's "..."; the Made by disclosure's mapping | 10 | awkward | live re-mapping after a load (section 1, "Known-field mapping") |
| Export formats | Export > Export data... (format select from the catalogue's exporters); Export image's Format from `capabilities.capture` | 96 | natural | data exporters; SVG and PDF |
| Undo / history | Ctrl+Z; the History dock; the dock handle keeps it one click away | 9 | natural | decision S1, #145 |
| Keyboard shortcuts | file menu "Keyboard shortcuts" and the "?" menu (a sheet); every tool's tooltip carries its key chip; the suggestion rows carry keys ("Find groups (G)") | 2 | 2, 58 | -- |
| Ctrl+K command palette | every flyout row under both names; every menu row; "Ask: <sentence>" as the last row | none | natural | #337 (so the palette's rows are the element's command list, not a copy) |
| Events for third-party consumers | section 10.1: every session and DOM event is shipped; `objects:changed` and the command vocabulary are the two additions a consumer of the tree needs | none | natural | decision S1, #337 |

---

## 13. Every unplaced or awkward capability, with a proposed home

Round 3 gave a drawn home to these rows, which now read natural in the sections above: a named
source with connection fields (screen 31), per-format import options (25, 34), incremental add
with a same-id rule (26, 40, 42), updating an attribute after load (39), computed attributes
(38), selecting the edges between selected nodes (55), the pair list (76) and element-level
errors (47). The rows below are kept as they were written.

Twenty-two awkward rows (sixteen distinct capabilities, since the cross-cutting section
repeats some and three share one table gap), five unplaced rows and two that do not fit. Each
proposal is an edit to `revision.md` (and to `screens.md` where a screen changes); none needs
a new panel, and none asks the app to compute over the graph.

### Unplaced

| Capability | Proposed home | Element gap |
|---|---|---|
| Update attributes after load (#297) | a node's Attributes tab: double-click a value to edit it in place (Enter commits, Escape reverts); the Table dock's cells the same way; both are the third data edit beside "Remove from data..." and "Merge into one node...", and one undo step. An edited value repaints every object whose rule or encoding reads it under the cost rule (cheap: at once; expensive: stale) | #297 |
| Select edges between selected nodes (`edgesBetween`) | the several-elements inspector gains a row "Include the edges between (Ctrl+Shift+E)"; the same verb in Ctrl+K. A Set's Define tab already has "Edges [All among members]", so a promoted selection keeps them | -- |
| Invert the selection (`invert`) | Ctrl+I (Ctrl+Shift+I is the browser's developer tools), listed in Ctrl+K and in the several-elements inspector as "Invert"; drawn on screen 55; the Select flyout gets no row (it lists modes, not verbs) | -- |
| A* (#55) | Path > Shortest route's Method select lists every registered method: Dijkstra, Bellman-Ford, A* (with a Heuristic [Euclidean v] row in the popover, since A* needs positions) | #55 |
| The element's `error` event (an element-level failure: a lost WebGL context, a skybox that failed, a disposed session) | the status bar's computing-chip slot at priority 3: "Error: <message> [Details]" for as long as it is true; Details opens the "?" menu's diagnostics with "Copy diagnostics" (Settings > Advanced already has the button). A lost renderer additionally greys the canvas with "The graphics context was lost [Reload]" | -- |

### Awkward

| Capability | Why it is awkward | Proposed home | Element gap |
|---|---|---|---|
| Load from a named source (Neo4j and future connection-backed sources) | Open... is specified as file, URL and paste; a source with connection fields has no rows | Open... gains a fourth tab, "From a source", listing every `catalog.formats()` entry whose descriptor declares connection options (URL, database, credentials, query) and drawing one row per option, exactly as Import options... draws format options | a `FormatDescriptor.options` group for connection fields (small); #303, #304 |
| Import options per format (separator, variant, id column, endpoint fields) | Import options... names four global rows and never the per-format ones | Import options... draws, after the four global rows, one row per `FormatDescriptor.options` entry of the format in use; Open... shows the same rows in a disclosure before the first load, so a CSV with a semicolon separator is fixed once | -- |
| Known-field mapping; Direction "Change..."; "Set as weight" and "Set as label" after a load (and the cross-cutting "Import column roles" row) | every one of these re-imports today, so a one-word change reloads the file and loses nothing but takes seconds and turns every object stale | keep the rows where they are (Dataset > Data column "...", the Made by mapping, the Overview Direction row); make them live once the element re-maps in place; until then the row says "Reloads the file" in secondary text | re-mapping weight, label and direction after a load without a re-import (`revision.md` section 8, medium) |
| Incremental add (Add data...) and the cross-cutting "Load replace / merge" | the Add data... dialog has no rule for a record whose id already exists | Add data... gets one row "Same id: [Skip / Replace / Update fields v]" with the match count from a dry run ("42 of 6,000 ids already exist"); Skip is the default because it is the only one the element supports today | Replace and Update need #297; the dry run needs the plan for `data.add` (#337) |
| Computed attributes (formula) | the door is on the Data tab (a column) while the inventory calls the result a Measure (a tree row); the design never says which it makes | always a column: "New from formula..." adds a row to ATTRIBUTES with origin "computed" and a formula glyph; its "..." carries the same Colour by / Size by / Group by rows as any column, which make the Measure or Grouping when the reader wants one. One thing, one home; the tree stays for things made from the data, not for the data | the `data.compute` command |
| Set operations on the selection: intersect | replace, add, remove and toggle have click modifiers; intersect has nothing | Ctrl+Shift+click on an object row's "Select members" (and on a legend swatch) intersects the current selection with that object's members; the tooltip says so; Ctrl+K lists "Intersect selection with..." | -- |
| Pick what is under the pointer (a context menu) | the context actions live in the inspector's overflow, one panel away from the pointer | right-click on a node opens a dark menu with the same rows as the node's inspector overflow (Locate, Pin, Style its group..., Add to, Copy id, Follow, What breaks if removed, Expand from server, Remove from data...); right-click on empty canvas opens the framing pill's menu. One list, two doors, both reading the same rows | #319 for edges |
| `pair-list` results (Likely missing links, Pattern's match list) and the parameter sweep's table (#194) | "Open in table" and "a Findings table with Make an object per row" have no table to open: the Table dock has Nodes and Edges tabs only | the Table dock gains a third tab, "Findings", whose select lists every Finding that carries a table (pairs, sweep values, per-step change counts); a pairs row has "Select both" and "Make a path"; a sweep row has "Make an object"; the Overview's Findings row is the door and reads "312 pairs [Open in table]" | #148 (column to ids) so a row maps to nodes; registration of link prediction; #194 |
| `temporal` results and Temporal analysis (OVER TIME in the transport gear) | a series chart and a "Biggest movers" list inside a 240 px popover | keep the OVER TIME "+" in the gear as the door (it is where the reader is), but the result is a Finding: its series chart draws in the Findings tab of the Table dock (the row above), and "Biggest movers" is the Finding's "Make a Measure" button. The gear's CHANGES disclosure keeps only the per-step counts as a 200 px sparkline with "Go to this time" | #300 |
| HITS (two Measures from one run, or one Measure with two fields) | `revision.md` 3.4 and 2.4 disagree | one Measure per run, always; HITS is one Measure "Hubs and authorities" whose Values tab has Field [authority v] (authority, hub), exactly as Connections has Field [total v] (total, in, out); the Style follows the field; a second Measure for the other field is "Duplicate" then change the field | -- |
| Best pairing (an edge Set plus a "Sides" Grouping) and Most that can flow (an edge Measure plus the cut) | two tree rows from one run: delete or re-run one and the other is orphaned | one object per run, with the second shape reachable from it: Best pairing is an edge Set whose Members tab carries the side as a column and whose Define tab has "Make a grouping from sides" (a linked Grouping, frozen if the Set is deleted, exactly as a Top N cut is linked to its Measure); Most that can flow is an edge Measure whose Values tab has "Make the cut a set" (a linked edge Set). The linked-object rule already exists for Top N cuts, so no new state | -- |
| All routes (#329): many ordered routes as one Set | the routes cannot be told apart, coloured separately or counted | the run hands back one Set per route up to Max routes (default 5), created as a batch under the same rule as Several... (the first paints, the rest have the eye off), each named "Route 2 of 5: 1 -> 34"; the Findings row on the Dataset says "14 routes found, 5 shown [Show all]" | #329; decision T8 |
| Edge weights honoured by a layout (`honoursWeights`) | no row says whether the engine reads weights or lets the reader turn it off | the layout gear popover's first row: "Uses edge weights [switch]" when the descriptor says `honoursWeights`, with "(weight)" naming the column; read-only "Ignores weights" otherwise | a per-layout "use weights" option where the engine has one (small) |
| Layout over a scope (#144) | the caveat row exists ("Ring on 12 of 34 (Group 2)") but no verb starts one | any Set's or Group's overflow and the several-objects inspector gain "Arrange only these...", which opens the Layout select scoped to the object (the secondary bar reads "Arrange Group 2, 11 nodes, by [Ring v] [Run] Cancel"); the rest keep their positions; the Layout tab's caveat row then says which object | #144 |
| Badges (a per-node count, progress, icon, dot) | a badge carries a per-node value but the label-style popover's Badge row is dataset-wide and unbound | Badge becomes a channel in the NODES "+" of any Style tab ("Badge [count v] from [Connections v]" on a Measure; "Badge [dot]" on a Set), so a badge is bound like size or colour and shows in the legend; the label-style popover keeps only the badge's look (position, size) | the badge as a channel (`node.badge`, `node.badgeStyle`) rather than a label-style property (small) |
| In-headset UI (world-space panels, ray / pinch / gaze selection, snap turn, grab-and-scale; design 9.3) | the only in-headset scoping is Focus-then-enter; a reader in a headset cannot toggle an eye or Focus without taking the headset off | not this round, as `revision.md` 6.4 says; the proposed home when built is the element's own in-headset panel drawing the objects API's tree (name, eye, Focus, count) on the non-dominant forearm, because only the element can draw inside the session; the app draws nothing there | design 9.3; the objects API (decision S1) is the precondition |

### Does not fit

| Capability | Why | What to do |
|---|---|---|
| Progressive / viewport-first loading | nothing in the element plans it, and the design's Loading chip plus "Drawing N of M" is the honest surface for a partial load | say so (decision R6). When it is built, the Loading chip reads "Loading: 12,000 of 350,000 shown [Cancel]" and the Overview's Drawing row carries the rest; no new home |
| Edge tooltip | withdrawn in the element because edges never pick | nothing until #319 (edge picking); then it is the EDGES "+" Tooltip row with no other change |

---

## 14. Counts

Counted by script over the 341 table rows of sections 1 to 12 (the inventory's rows, its
eleven result shapes, its fourteen channel rows, its fifteen event rows, and the twenty-five
cross-cutting rows the owner asked to see named; a few inventory rows that list several
capabilities in one cell are split where their homes differ, and the cross-cutting rows repeat
some inventory rows on purpose).

After round 3 (the key-function screens 16 to 102 and the rows they resolved):

| Fit | Rows |
|---|---|
| natural | 321 |
| awkward | 16 |
| does not fit | 2 |
| unplaced | 1 |

Of the rows, 270 now point at a mock screen and 70 read "none". The rest are mostly Settings
rows that screen 13 draws folded, element events and session internals that are deliberately not
on the everyday screen, and XR rows that only a headset shows. Round 3's design is
`../round-3/revision-round-3.md`; its gap register is `../round-3/gaps.md`.

Before round 3 the counts were natural 312, awkward 22 (16 distinct capabilities), does not fit
2, unplaced 5, with 179 rows pointing at a mock and 162 reading "none".
