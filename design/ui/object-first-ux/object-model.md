# The object model for an object-first graphty app

This is the one model the mocks are drawn from. It merges three proposals
(`models/tree-first.md`, `models/task-walkthrough-first.md`, `models/element-api-first.md`) and
the three reviews of them. Where the proposals disagreed, section 12 lists the decision and the
reason, so each one can be pushed back on.

It is written for an engineer, not a designer: every design word is defined the first time it
is used. Measurements come from the Figma study in `design/ui/figma/` (`components.md`,
`flows.md`, `tokens/tokens.json`). Element API names written `session.xxx` are members of the
graphty-element session API in `graphty-element/src/session/`. Issue numbers are open issues in
graphty-org/graphty-monorepo. Nothing in this file changes the app; it is a design exploration.

The premise, from `tmp/ux-review/graphty-vs-figma-ux.md`: nodes and edges are the material,
like pixels. The objects are what a reader makes from them by running algorithms and writing
rules: groups, paths, rankings, filtered sets. The left panel is a tree of those objects, the
toolbar holds the verbs that make them, the right panel shows the selected one, and the tree
order is the paint order.

## 0. Terms

- **Object**: a row in the left-hand tree. Something the reader made from the data, or the
  data itself. Objects are the only things the inspector edits.
- **Element**: one node or one edge. Elements are the material. They can be clicked and read,
  but their appearance is never edited directly; it is edited on an object that contains them.
- **Member**: an element that belongs to an object. A set's members are its nodes and edges; a
  measure's members are every element it has a value for.
- **Tree**: the left panel's list of objects, nested and ordered. Figma's Layers panel.
- **Inspector**: the right panel. It shows the properties of the current selection and nothing
  else; with nothing selected it shows the Dataset.
- **Fill**: Figma's word for a shape's paint, used here for an object's whole appearance: the
  style layer (or layers) that paints its members. Colour, size, shape, outline, label, edge
  width and so on are all "Fill".
- **Channel**: one visual property a Fill can write (node colour, node size, edge width...).
  The element's `Channel` list in `graphty-element/src/catalog/types.ts` has 40.
- **Precedence**: when two objects paint the same channel of the same element, which wins.
- **Scope**: the elements a tool is allowed to look at when it creates an object.
- **Showing** (or the **mask**): the one visibility filter the element holds
  (`session.visibility`). Elements outside it are not drawn.
- **Focus**: the verb that sets the mask to one object's members ("show only this").
- **State**: whether an object's members and values are up to date (section 5).
- **Reading**: a one- or two-sentence plain-language explanation of what an object means
  (`RunResult.reading()`), shown on request, never permanently.
- **Row**: a 32 px line in a panel. A row has one job.
- **Section**: a titled group of rows in the inspector with a 40 px header row (11 px, weight
  550). An empty section is its header with a "+", Figma's rule.
- **Paint row**: Figma's 32 px row for one fill: a 14 x 14 colour chit, a value field, an
  opacity field, an eye and a minus.
- **Tool**: a toolbar verb that creates an object. Picking a tool changes what a canvas click
  does until the object exists; then the tool snaps back to Select, as Figma's drawing tools do.
- **Flyout**: the dark menu behind a tool button's chevron that lists the tool's variants.
- **Popover**: a 240 px light panel that opens beside a panel or above the toolbar for a control
  that does not fit in a row (a colour picker, a rule form).
- **Dock**: a surface that takes space from the canvas (the data table). An **overlay** floats
  over the canvas (the toolbar, the legend).
- **Two-way hover link**: hovering a tree row outlines its members on the canvas; hovering a
  node highlights the rows of the objects it belongs to.

## 1. The frame

Figma's UI3 layout, with Figma's measurements: two 240 px side panels, a floating toolbar at
the bottom centre of the canvas, no top bar and no activity rail.

```
+------------------+--------------------------------------------------+------------------+
| [=] Karate Club  |                                                  | [100% v] [Share] |
|------------------|                                                  |------------------|
| VIEWS         [+]|                                                  | INSPECTOR        |
|   Overview     * |                                                  |                  |
|------------------|                    CANVAS                        | the selected     |
| OBJECTS    [search]                                                  | object, or the   |
| v Karate Club    |                                                  | Dataset when     |
|   > Communities  |                                                  | nothing is       |
|   Path: 1 -> 34  |   [V][H] | [F][E][P][G][R] | [N]   [2D|3D|VR|AR] | selected         |
|   Connections    |--------------------------------------------------|                  |
|                  | Table dock (Shift+T), Assistant dock             |                  |
+------------------+--------------------------------------------------+------------------+
| 34 nodes 78 edges   Spread out: settled [||]   Bridges 42% [x]   showing 34 of 34   1 selected |
+---------------------------------------------------------------------------------------+
```

- **Left panel header**: the dataset name with a chevron that opens the file menu (Open, Open
  sample, Add data, Save project, Run a recipe, Settings, Keyboard shortcuts, Help). Figma puts
  its file name and main menu here; there is no separate top bar.
- **Views** (the Pages slot): saved views only, one current. Section 8.
- **Objects** (the Layers slot): the tree. A search icon in its header turns the header into a
  search field (Ctrl+F) that filters objects by name and finds nodes by label.
- **Right panel header**: the zoom menu ("100%": zoom in, out, to fit, to selection; the
  framing presets Top, Front, Side, Isometric; Save view) and **Share**, the one filled blue
  button on the screen. Everything else blue means "selected" or "active tool".
- **Toolbar**: 48 px tall, radius 13, bottom centre; tool buttons 32 x 32; the mode switch
  (2D / 3D / VR / AR) at its right end in Figma's mode-switch slot. Section 3.
- **Status bar**: counts and the mask ("showing 12 of 34"), the layout chip with a transport,
  a computing chip while anything computes, the selection count, the zoom readout. It exists
  because live objects need to be visible while the reader looks at something else.
- **Docks** (bottom, over the canvas, resizable): Table (Shift+T) and Assistant (backtick or
  from the palette). One dock open at a time; tabs switch.
- **Nothing floats on the canvas** but the toolbar, note markers (when shown), and on request
  the legend (L) and the minimap (M). No suggestion cards.

Visual language, all from the Figma study and not repeated below: 11 px text at weight 450
(values, rows, buttons) and 550 (section titles, the selected row, headings at 13/22); one ink
at three strengths (text, secondary at 50 percent, tertiary at 30 percent); fields are
borderless grey fills (#f5f5f5 light, #383838 dark) with a 1 px #0d99ff (dark #0c8ce9) ring on
focus; panels white (#fff) or #2c2c2c in dark; dividers #e6e6e6 / #444; menus and tooltips are
always dark (#1e1e1e, radius 13, 32 px items) in both themes; tooltips after 1000 ms cold;
overlays open instantly; radii 2 (chits) / 5 (controls) / 13 (floating surfaces).

## 2. The object taxonomy

### 2.1 Two families and a root

The owner's split is the taxonomy: **sets** (a collection of elements, painted with one look)
and **measures** (one value per element, painted with a scale). Two kinds in each family, plus
the Dataset at the root and Views off to the side.

| Family | Kind | What it is | Members | Default Fill | Made by |
|---|---|---|---|---|---|
| root | **Dataset** | the loaded data: nodes, edges, attributes, positions, the layout in force, what is showing | everything | the element's own default look (locked) | a load |
| set | **Set** | a named collection of elements: a rule (filter), a path, a neighbourhood, a promoted selection, a spanning tree, a cut, a combination of other objects, a Top N or Above cut of a measure | a list of node ids and edge ids | one colour (a highlight layer) | Filter, Neighbours, Path tools; Ctrl+G; Combine; a Measure's "+" |
| set | **Group** | one label of a Grouping | that label's members | inherited from its Grouping; may be overridden | its Grouping, never on its own |
| measure | **Measure** | one value per element: a centrality, a score, an imported numeric column, a formula | every element it has a value for | a colour ramp or a size scale (an encoding layer) | Rank tool; Attributes > Colour by / Size by |
| measure | **Grouping** | one label per element, which is also a family of sets: communities, components, BFS levels, an imported category column | every labelled element | one colour per group (a categorical encoding) | Groups tool; Attributes > Group by |
| aside | **View** | a camera, a view mode (2D, 3D, VR, AR) and the mask in force | none | none | Views "+" |

The element already types results this way (`graphty-element/src/catalog/types.ts`): result
shapes `node-set`, `edge-set` and `path` are Sets; `node-metric` and `edge-metric` are Measures;
`community`, `layered-grouping` and `category-table` are Groupings. The shapes `fact`,
`pair-list` and `temporal` produce no members and make no row: they appear as a **Findings**
section in the inspector of the object they were computed on (section 4.10).

"Grouping" is the word a reader sees; the element's word is partition. A Group is a Set in
every respect except that it cannot be deleted or re-scoped on its own.

### 2.2 What is deliberately not an object

- **Nodes and edges.** Material. A node has an inspector (section 4.8) but no Fill rows of its
  own; painting one creates a one-node Set.
- **Style layers.** A layer is an object's Fill. A reader never sees a layer that is not on an
  object. The element's style stack IS the tree, linearised (section 6).
- **Notes.** A note is text anchored to an element, an object or a point. It lives in the
  Notes section of what it annotates, as a marker on the canvas, and in the Dataset's Notes
  section (which lists every note). It is not a tree row: a heavily annotated case would bury
  the objects, and a note has no members to paint. Element support is issue #145.
- **Tables** (pair lists, per-step series, parameter sweeps). A Findings section on the object
  they were computed on, with "Open in table" and "Export". No Fill, no eye, no row.
- **Layouts.** One arrangement is in force for the dataset; it has no members and two cannot
  both be true. It is the Arrangement section of the Dataset.
- **Attributes.** An imported column is material. It becomes a Measure or a Grouping only when
  the reader uses it (Attributes > Colour by, Size by, Group by), so a wide table does not put
  a thousand rows in the tree.
- **Runs.** The element keeps every run (`session.runs.list()`); the tree shows one object per
  run that produced members. A run that produced a fact or a pair list is a Findings row.
- **The selection.** Transient, no row. Ctrl+G promotes it to a Set (`session.selection.promote`).
- **The legend.** A picture of the visible Fills (`session.styles.legend()`).
- **Exports.** Something you do to a thing: an Export section on each object, and the Share
  menu for the whole picture.
- **Camera presets** (Top, Front, Side, Isometric). Commands in the zoom menu, not rows in the
  Views list, which holds only what the reader saved.

### 2.3 Properties every object has

| Property | Where it shows | Edited by |
|---|---|---|
| Name | tree row, inspector header | double-click or Ctrl+R renames in place |
| Kind | tree icon, inspector header word ("Set", "Measure", "Grouping", "Group") | never; decided by what created it |
| Members and count | tree row count, Members / Values / Groups section | never directly; by editing the Definition and re-running |
| Definition | Definition section: the tool that made it, its inputs, parameters and scope | fields commit on Enter, Tab or blur |
| State | tree glyph, inspector header badge | by re-running (section 5) |
| Fill | tree chip, Fill section | paint rows |
| Visible (the eye) | tree row, on hover and when off | click; the eye means exactly one thing: this object stops painting (section 7) |
| Locked (the lock) | tree row | click. A locked object cannot be renamed, re-run, moved, deleted or have its Fill edited; its members are skipped by canvas selection; it still paints |
| Made by | Made by section (collapsed) | never; it is the record |
| Notes | Notes section | the Note tool or the section "+" |
| Position in the tree | the tree | drag within its parent; Ctrl+] and Ctrl+[ move up and down |

### 2.4 The tree at a glance

```
OBJECTS                                                          [search]
  v Karate Club                     34 nodes  78 edges              the DATASET, always the root
      Path: 1 -> 34                  5 nodes  4 edges  [chip]        a SET made by the Path tool
      Top 10 by Bridges             10 nodes         [chip]        a SET cut from the measure below it (linked)
      Bridges (Betweenness)         34 values        [ramp]        a MEASURE
      v Communities (Louvain)        6 groups         [strip]       a GROUPING, expanded
          Group 1                   12               [chip]        a GROUP
          Group 2                    9               [chip]
          ...
      v Degree > 10                  6 nodes  (focus) [chip]        a SET made by the Filter tool; it is the mask
          Communities within it      3 groups         [strip]       a GROUPING computed within the set (nested = scoped)
      Group 1 and Path               3 nodes          [chip]        a COMBINATION of two objects (linked)
      Pinned                         2 nodes          [chip]        a SYSTEM SET; exists while something is pinned
```

Row anatomy, on Figma's 32 px layer row: a 16 px caret, a 16 px kind icon, the name (11 px;
weight 550 on the root and the selected row, 450 elsewhere), the count in secondary text, a
state glyph when the state is not current, a 14 x 14 Fill chip (a swatch for a set, a small
ramp for a measure, a four-colour strip for a grouping), then lock and eye that appear on hover
and stay visible when set. A row whose eye is off dims to tertiary text. The row that is the
mask carries a small "focus" glyph after its count.

New objects are inserted at the top of their scope (Figma adds new layers at the top), with one
exception: an object derived from another (Top N, Above, a Combination) is inserted
immediately above its first input, so it is found next to what it came from and already wins
precedence over it.

## 3. The creation tools

The toolbar, left to right, with the key that selects each tool:

```
[ Select v ] [ Hand ]  |  [ Filter v ] [ Neighbours ] [ Path v ] [ Groups v ] [ Rank v ]  |  [ Note ]  |  [ 2D | 3D | VR | AR ]
      V         H             F              E            P           G           R             N
```

Every tool has the same contract: what it needs from the canvas, what the secondary bar (a
second, contextual bar that appears above the toolbar while a tool is active, Figma's pattern)
says while it needs it, and what it hands back. A tool that hands back an object adds the row,
selects it, shows it in the inspector, and returns to Select.

| Tool | Flyout (the face is the last used variant) | Needs from the canvas | Secondary bar | Hands back |
|---|---|---|---|---|
| Select (V) | Select, Marquee (Lasso later) | click, Shift+click, drag | nothing | an element selection; Ctrl+G makes it a Set |
| Hand (H) | none | drag pans (2D) or orbits (3D); holding Space is the same | nothing | nothing |
| Filter (F) | By rule (an expression), By values (an attribute and a list), By range (an attribute, min, max), By connections (a degree band), Largest connected part, Pattern (later, issue #149 first) | nothing | a 240 px light popover above the toolbar with the rule fields, a live count ("Matches 6 nodes", from `session.scope.count`), and two buttons: Select and Create | a Set (rule); Select instead makes a transient element selection |
| Neighbours (E) | none | one click on a node, or the current selection as seeds | "Within [1 v] steps, [All directions v], of node 1" and Create; Enter creates | a Set (relational): seeds plus the neighbourhood |
| Path (P) | Shortest route, All routes (later, issue #329), Cheapest connecting network (Kruskal), Cheapest network from a node (Prim), Best pairing (matching), Most that can flow (max flow), Weakest link (min cut), Bridge edges and cut points (later, issue #311) | Shortest route, All routes, flow and cut: two clicks, A then B, with a rubber-band line from A to the pointer; Prim: one click; the rest: nothing | "Pick the start node", then "Pick the end node", with [Shortest v] and Cancel | a Set (ordered for a path; edges for the network tools; Best pairing also makes a Grouping of the two sides) |
| Groups (G) | Communities (Louvain), Communities refined (Leiden), Communities fast (Label propagation), Communities by cutting bridges (Girvan-Newman), Separate pieces (Components), Steps away from a node (BFS; one click), Densest shells (k-core, when registered), By attribute (a category column) | nothing, or one click for Steps away | "Find groups in what is showing (34 nodes)" and, over the gate, "About 4 min" | a Grouping with Group children |
| Rank (R) | Connections (Degree), Bridges (Betweenness), Reach (Closeness), Influence (PageRank), Influence by association (Eigenvector), Influence at a distance (Katz), Hubs and authorities (HITS), How far from everything (Eccentricity), Clustering (when registered), Several... | nothing | "Rank what is showing (34 nodes)" and the cost | a Measure (HITS: two; Several: one per tick) |
| Note (N) | none | one click on a node, an edge, a point, or a tree row | "Click what the note is about" | a note in that anchor's Notes section, its text field focused |

Rules that hold for every tool:

- **Scope is what is showing.** A tool looks at the elements inside the mask and nothing else,
  and its result goes at the top of the tree, or under the focused Set when Focus is on. The
  secondary bar prints the scope and its count before the click ("Find groups in Degree > 10
  (6 nodes)"). To compute within an object, Focus on it first (section 7). Scope never follows
  the tree selection silently.
- **Every flyout row shows three things**: the plain name, the technical name in secondary text
  ("Bridges  Betweenness centrality"), and at the right the cost from `session.estimate`
  ("instant", "about 4 min") or "unavailable" with the reason in its tooltip (from
  `session.catalog.metrics()`: for example, needs weights, needs a directed graph).
- **Every algorithm has exactly one flyout.** The flyouts are populated from the algorithm
  catalogue (`session.catalog.algorithms()`) by result shape: community, layered-grouping and
  category-table under Groups; node-metric and edge-metric under Rank; path, node-set and
  edge-set under Path. One override: an algorithm that needs a pair of picked nodes (max flow,
  min cut) goes under Path whatever its shape, because the gesture is the Path gesture. A plugin
  algorithm registered in the catalogue appears in the right flyout with no app change.
- **Options come after creation.** Rank runs Influence with defaults; damping is a row in the
  new object's Definition. A parameter that must exist before running (a start node, a source
  and a target) is asked for on the canvas as a pick, never in a dialog.
- **No tool opens a modal.** The Filter popover and the Several... checklist are popovers with
  one Create button; the Run Algorithm and Run Layout dialogs of today's app are gone.
- **The row appears instantly, always.** In the computing state with progress and Cancel in
  the row, or, over the cost gate, in the waiting state with the estimate in the row. The gate
  never shows a dialog (section 5).
- **Undo removes the object** (Ctrl+Z after a creation deletes the row and cancels its run).
  Delete asks no confirmation for the same reason, except when children go with it.
- **Every flyout item is also a palette command** (Ctrl+K) under both its names, so a keyboard
  reader never touches the toolbar.

Combine is not a tool: it is the set of boolean buttons (Union, Intersect, Subtract, Exclude)
that appear in the inspector when two or more tree rows are selected, with Figma's shortcuts
(Ctrl+Alt+U / I / S / X). It creates a linked Set placed immediately above the first input.

## 4. The inspector, object by object

The inspector is the 240 px right panel on Figma's grid (16 px padding, two 88 px columns with
an 8 px gap, a 24 px icon column). Row types are Figma's: a field row (a 9 px caption above a
24 px control), a single 32 px row with a control centred, a paint row, a checkbox row, a list
row. Section headers are 40 px, 11 px at weight 550. An empty section is its header with a "+".
Sections appear in the order below; a section with nothing in it and nothing to add is omitted.

The sections every object shares, and what Figma calls them:

| Here | Figma | Answers |
|---|---|---|
| Header | selection type row | what is this: kind word, editable name, state badge, eye, lock, overflow ("...") |
| Definition | Position / Layout | how it is made: inputs (clickable rows for linked objects), parameters, "Within" (the scope), Re-run when stale |
| Members / Values / Groups | (none) | what it contains |
| Fill | Fill / Stroke / Effects | how it looks: paint rows, one per channel written; "+" adds a channel |
| Findings | (none) | results with no members computed on this object (facts, pair lists) |
| Made by | (none) | collapsed: the record (method, parameters, scope size, engine, time), caveats, a "?" that reveals the reading, "Copy as methods text" |
| Export | Export | export rows |
| Notes | Comments | note rows, "+" |

Below, a value in [square brackets] is a control; "|" separates the two columns of a two-column
row. Rows are exact.

### 4.1 The Dataset (also what "nothing selected" shows)

Header: "Karate Club" (13/22, weight 550, rename in place); secondary line "karate.gml, GML";
actions: "Add data" (+), overflow (Close dataset, Reload, Re-run all stale, Import options...).

| Section | Rows |
|---|---|
| Summary | the one-line reading in secondary text ("34 nodes joined by 78 edges in one connected part"); Nodes 34 \| Edges 78; Direction [Undirected v] "(from file)"; Density 0.139 \| Mean links 4.6; Parts 1 \| Self-loops 0 (only when non-zero); Weighted No; "Import report" (a row that expands: kept, rejected, repeated) |
| Arrangement | Layout [Spread out v] with a gear (the engine options as a popover); Dimensions [2D \| 3D] segmented; a transport row [Pause] [Step] [Re-run] with "Settling 62%" or "Settled"; Group by [Communities v] (only for layouts that need a grouping); Root [pick a node] (only for tree layouts); Pinned 2 with "Unpin all" (only when non-zero) |
| Showing | Show [Everything v] where the list is Everything plus every Set in the tree, then "34 of 34" (`session.status.counts.visibleNodes`); Time window [from] \| [to] with a Play that opens the time transport in the status bar (only when a time role exists, issues #299, #333) |
| Canvas | Background [chit]; Labels [Top 6 by Connections v] (the label budget: none, all, top N by a Measure in the tree); Legend [switch] (L); Minimap [switch] (M); Notes [switch] (show markers); Default look: a locked mini paint row each for node colour, node size and edge colour, the element's own base layers |
| Attributes | collapsed by default; one 32 px row per column: type glyph, name, completeness in secondary text ("94%"), and a "..." on hover with Colour by, Size by, Filter by, Group by, Label by, Set as time, Set as type; the first four create a tree object; header "+" is "Join a table..." (issue #298) and "New from formula..." (computed attributes, proposed) |
| Findings | facts computed on the whole graph (density, diameter, link-prediction pair lists), each a row with its value or "Open in table" |
| Made by | the load record: source, format, field mapping, direction, time |
| Export | Image: [PNG v] [2x v] [Export] with a gear (transparent, legend in picture, issue #292); Data: [GraphML v] [Export] (needs the element's exporters); Report: [Export] (issue #187); Methods text: [Copy]; Recipe: [Export] |
| Notes | every note in the session, grouped by anchor; "+" |

### 4.2 A Set

Header: "Set" (secondary), the name, the state badge; actions: eye, lock, overflow (Select
members, Focus on this, Duplicate, Delete).

| Section | Rows |
|---|---|
| Definition | one of: **Rule**: an expression field with autocompletion (issues #332, #335), or Attribute [value v] \| Values [7, 8], or [degree v] Min [10] \| Max [any]; "+ Rule" adds an AND. **Neighbours**: Of [node 1] (a clickable element row) \| Within [2 v] steps; Direction [All v]. **Path**: From [node 1] \| To [node 34]; Method [Shortest v]; Weighted [switch]. **Network**: Method [Kruskal v]; Start [node] for Prim. **Flow**: Source \| Sink. **Fixed**: "12 nodes, 3 edges, fixed" and [Edit members] (add or remove by selecting on the canvas and pressing + or -). **Cut**: Of [Bridges] (clickable) \| Top [10] or Above [0.05]. **Combination**: [Group 1] [and v] [Path], each input a clickable row; operation and / or / not / either. **Group**: "Group 3 of Communities" as a clickable row. Always last: Within [Everything v] (the scope; editable only while the object has no nested children, section 6.2) and, when stale, [Re-run (about 2 s)] |
| Members | Nodes 12 \| Edges 18; Inside edges 18 \| Cut edges 7 (`session.selection.statistics` over the set); up to 8 member rows (label, then one value in secondary text: a path's hop order, a neighbourhood's depth), then "See all 12 in table"; header actions: Select, Focus |
| Fill | one paint row per channel written: [chit] [#E69F00] [100%] [eye] [minus]; "+" opens the channel list (Colour, Opacity, Size, Shape, Outline, Glow, Label, Edge colour, Edge width, Edge style, Arrows, Animation) and adds a row with a sensible default; when a visible object above covers this one, a secondary line "Covered by Influence on 12 of 12 members" |
| Findings | facts computed on this set (its density, its diameter) |
| Made by | "Shortest route (Dijkstra), 34 nodes in scope, 2 ms, exact"; caveats; "?" reveals "The shortest route from node 1 to node 34 has 4 hops."; [Copy as methods text] |
| Export | Members [CSV v] [Export]; Image framed on members [PNG v] [Export] |
| Notes | rows and "+" |

### 4.3 A Measure

Header: "Measure", the name, the state badge; actions: eye, lock, overflow (Duplicate, Delete).

| Section | Rows |
|---|---|
| Definition | Method "Influence (PageRank)" with an info circle whose tooltip is the description; one row per option from the catalogue's option descriptors: Damping [0.85] \| Iterations [100]; Tolerance [1e-6]; Weights [switch] \| Direction [As loaded v] (issue #313 where missing); Exact [switch] (off = approximate above 2,000 nodes; the caveat says which); Within [Everything]; [Re-run (about 3 s)] when stale |
| Values | Field [value v] (only when the run has several fields: HITS hub and authority, degree in and out); Min 0.01 \| Max 0.10; Mean 0.03 \| Median 0.02; a 208 x 40 histogram (`RunResult.histogram`) with a linear / log toggle; Top [10 v] as rows: rank, label, value; click selects the node; header "+" offers "Top N set..." and "Above threshold set...", each creating a linked Set immediately above this row; "See all in table" |
| Fill | Channel [Colour v] (Colour, Size, Opacity, Label, Edge width, Edge colour); Scale [Even steps v] (the element's scales by plain name); Palette [viridis] as a 156 px ramp swatch that opens the palette picker (sequential, diverging, categorical; colour-blind-safe marked); Domain [0.01] \| [0.10] with Reset and Reverse; Missing [chit]; a legend strip preview; "+" adds a second channel (colour and size) |
| Made by | "PageRank, 34 nodes, 1.2 s, exact, converged in 41 iterations, algorithms 2.0.1"; caveats ("Did not converge in 100 iterations"); "?"; [Copy as methods text] |
| Export | Ranked list [CSV v] [Export] |
| Notes | |

A measure has no Members section: its members are its scope.

### 4.4 A Grouping

Header: "Grouping", the name, the state badge; actions: eye, lock, overflow (Sort groups by
size, Name groups from an attribute..., Delete).

| Section | Rows |
|---|---|
| Definition | Method "Communities (Louvain)"; Resolution [1.0] \| Seed [42]; Iterations [100]; Within [scope]; [Re-run] when stale. For an attribute grouping: Attribute [value] (read-only) |
| Groups | Groups 6 \| Modularity 0.36 (or Parts, Levels, Shells); Sizes "12, 9, 6, 4, 2, 1" in secondary text; Show the largest [8 v] and paint the rest as Other (the element's overflow policy); Names from [none v] (issue #191). The groups themselves are the tree children, not repeated here |
| Fill | Channel [Colour v]; Palette [Okabe-Ito] shown as chips, one per group, in group order; Other [chit]; "+" for a second channel |
| Made by | "Louvain, 34 nodes, 80 ms, seed 42"; on a re-run, "6 of 6 groups matched to their predecessors"; "?" reveals "6 groups. The groups are clearly separated (modularity 0.36)." |
| Export | Membership [CSV v] [Export] |
| Notes | |

### 4.5 A Group

Header: "Group", the name (rename; survives a re-run by overlap matching), state; actions:
eye, lock, overflow (Select members, Focus on this). No delete: hide it instead.

| Section | Rows |
|---|---|
| Definition | Of [Communities] (clickable); Label 3; "12 nodes, 35% of the scope" |
| Members | as a Set's Members |
| Fill | one row "Inherited [chit] from Communities" with an Override (+) that adds the Group's own paint row above it; the override is the child layer that beats the parent |
| Made by | the group profile when the element has it (issue #193): "Mostly conference 7 (83%)" |
| Export, Notes | as a Set |

### 4.6 Several objects (tree multi-select)

Header: "3 objects".

| Section | Rows |
|---|---|
| Combine | four joined 24 px icon buttons in Figma's boolean-operation slot: Union, Intersect, Subtract (the top row minus the rest), Exclude; each creates a linked Set; disabled with a reason when a Measure or Grouping is in the selection ("Combine needs sets") |
| Fill | shared paint rows, or "Mixed" (Figma's word), editable for all at once |
| Actions | Hide all, Lock all, Delete (with the count) |

### 4.7 A View

Selecting a View row applies it and shows: Camera "Update to current"; Mode [2D | 3D | VR |
AR]; Showing [Everything v]; Compare with [View v] (opens a second canvas beside the first on
the same tree and selection, each with its own camera and mask; the element's second view of one
session, issue #186).

### 4.8 One node (a canvas or table click)

A node is not an object, so its inspector is a report plus the doors to the objects that own
it. It has no paint rows of its own.

Header: "Node", the label (13/22 550); actions: Locate (frame the camera on it), Pin toggle,
overflow (Copy id, Copy as JSON, Expand from server when a fetch source is configured).

| Section | Rows |
|---|---|
| Attributes | key: value rows, up to 10 then "Show all 23"; a filter field appears above 10 |
| Values | one row per Measure and Grouping in the tree that covers this node: "Influence 0.09 (rank 3)", "Communities: Group 3"; the name is a clickable row to the object |
| Member of | one chip per Set containing this node, in tree order, each clickable; empty reads "In no set" |
| Neighbours | Neighbours 17 (In 9 \| Out 8 on directed data); up to 8 rows "label, edge label"; "See all in table"; header actions: Select (puts them in the selection), Neighbours tool (E) prefilled with this node |
| Look | one row per channel that something painted, from `session.styles.explain`: "Colour [chit] from Communities", "Size from Influence"; each clickable to the object. Then one action row: "Colour this node..." which creates a fixed one-node Set named after the node with one Colour paint row and opens the picker. That is the three-click colour change (click node, click Colour this node, pick), and the colour is still a style layer on an object |
| Notes | notes anchored here, "+" |

An edge inspector has the same shape with Endpoints in place of Neighbours; it waits on edge
picking (issue #319).

### 4.9 Several elements (marquee, Shift+click, Select members)

Header: "12 nodes, 3 edges"; overflow (Copy ids).

| Section | Rows |
|---|---|
| Make a set | the first row: "Make a set (Ctrl+G)"; a second row "Add to [set v]" listing the fixed Sets in the tree |
| Statistics | Nodes 12 \| Edges 3; Inside edges 3 \| Cut edges 21; per numeric attribute, mean against the whole graph (`session.selection.statistics`) |
| Values | per Measure: min to max; per Grouping: "Mixed" or the one group |
| Member of | objects containing all of them, then in secondary text "and 3 more contain some" |
| Look | "Colour these..." creates a fixed Set as in 4.8 |

### 4.10 Findings

A result with no members (a fact such as density or diameter, a pair list such as link
prediction, a series per time step, a parameter sweep) is a row in the Findings section of the
object it was computed on: the value for a fact; "312 pairs, Open in table" for a list. The row
has its own state glyph, a "..." with Re-run, Export and Delete, and a "?" for the reading. It
never has a Fill or an eye, which is why it is not a tree row.

## 5. States

An object is live: it can be re-run, and its inputs can change under it. Figma has nothing like
this, so it is the first place the model departs. Six states, one glyph each in the tree row and
one word in the inspector header:

| State | Meaning | Tree row | Inspector header |
|---|---|---|---|
| current | members and values reflect the data and the definition | nothing extra | nothing extra |
| computing | a run is in progress | a 12 px progress ring replaces the count; the count fills in as progress ("42%") | "Computing 42% [Cancel]" (the run's `cancel()`) |
| waiting | created but not run, because the cost gate said it would take too long to start unasked | a hollow circle; the count reads "not run, about 4 min" | a "Run (about 4 min)" button and an "Approximate instead" button, both secondary-styled, first in the Definition section |
| stale | the data, the scope or a parameter changed since the last run; members are the old ones | a small amber dot after the name; the name dims to 50 percent; the count keeps the old number; the old paint stays | "Stale: ran on 34 nodes, now 40 [Re-run (about 3 s)]" (`run.stale`) |
| failed | the run threw | a red dot | the error message and a Retry |
| frozen | an input this object referenced was deleted; members are kept as a fixed list | a grey snowflake; name in secondary text | "Frozen: 'Degree > 10' was deleted. Members kept as a fixed list. [Unfreeze as fixed set]" |

Rules:

- **Stale propagates down only.** A stale Grouping makes its Groups stale; a stale scope makes
  everything nested in it stale; a stale input makes the objects linked to it stale. Nothing
  propagates up.
- **A stale object keeps painting its old values.** The picture is never blank while a re-run
  is pending; the dimmed name and the amber dot say the picture may be out of date.
- **Re-run now or mark stale is decided by cost, not by kind.** When the element's estimate
  (`session.estimate`) for the re-run is under one second, committing an edit re-runs at once
  (Figma's "nothing applies until Enter, then it applies" feel). Otherwise the object turns stale
  and shows Re-run with the estimate. Rule sets, neighbourhoods and combinations are under a
  second on the graphs the app renders, so they behave as live filters. A data change (Add data)
  applies the same rule to every object, so cheap objects refresh and expensive ones turn stale.
- **Re-runs keep the seed by default** (`StartOptions.seed`), so a Grouping re-run reproduces
  the same groups and their numbers. When the seed or the data changes, the groups are
  re-matched to their predecessors by largest overlap so names, notes and Fill overrides
  follow the group; Made by reports "5 of 6 groups matched". A group with no successor is
  shown frozen until a later re-run drops it. This matching is graph logic and lives in the
  element (with group names, issue #191); until it exists, groups are matched by label.
- **Caveats are not states.** Approximate, sampled, not converged and every other
  qualification is a caveat (`run.caveats`): one line in Made by and a "~" before the count
  in the tree row when the run was approximate.
- **"Re-run all stale"** is on the Dataset's overflow and in the palette; it re-runs in tree
  order, bottom up.

## 6. Nesting, links and precedence

### 6.1 Nesting means exactly one thing

**A child was computed within its parent's members.** The parent is the child's scope. There are
two ways a child gets there: the tool ran while the parent was the Focus (section 7), or the
parent produced it (a Grouping produces its Groups). Nothing else nests.

Two things nesting does not mean:

- **Not containment of members.** "Top 10 by Bridges" contains ten of the measure's members but
  is not under it, because it was cut from the measure's values, not computed within a scope.
  It is a **linked** object: its Definition points at the measure, and it sits immediately
  above it. Combinations are linked the same way.
- **Not tidiness.** There is no folder object. Collapse a parent or hide rows to reduce clutter.

Consequences, so the rules are never ambiguous:

| Rule | Why |
|---|---|
| A child can be dragged only within its parent, never out of it or into another parent | moving would change its scope, which means re-computing it; a mis-drag must never silently change what an object means |
| The Within field in the Definition can change an object's scope, but only while the object has no nested children; the row then moves under its new scope and the cost rule decides re-run or stale | re-scoping is a real need ("now run the same communities on the whole graph"); making it an explicit field rather than a drag keeps it deliberate and undoable |
| Deleting a parent deletes its children; the dialog says the count ("Delete 'Degree > 10' and the 2 objects inside it?") | they cannot exist without their scope; this is the one delete that confirms |
| Deleting an object that others link to freezes them (section 5); it does not delete them | a linked object is the reader's own creation; a reference is not ownership |
| A Group cannot be deleted on its own; hiding it is the way to drop one group from the picture | the Grouping owns its groups, and a re-run would bring the group back anyway |
| The Dataset cannot be deleted; "Close dataset" clears the whole tree | it is the root |

### 6.2 Precedence: which Fill wins where objects overlap

Elements belong to many objects at once. Figma never has this problem, because a pixel belongs
to the one shape in front. The rule here is Figma's paint order applied per channel:

**For each channel of each element, the visible object nearest the top of the tree whose Fill
writes that channel and whose members include the element wins. Children paint above their
parent. Hidden objects (eye off) do not paint. Below every object is the Dataset's default look.**

"Nearest the top" is read in the tree as displayed, fully expanded, except that a parent's own
Fill sits below all its children (as a Figma frame's fill sits behind its contents). In practice:

- Drag "Path: 1 -> 34" above "Communities" and the path's colour wins on the path's nodes; the
  community colours still show everywhere else, because the path does not include those nodes.
- A Group with its own colour beats the Grouping's palette on that group.
- A Measure whose Fill writes node colour, placed at the top, colours every node and makes
  every set's colour invisible. This is correct and visible: the sets keep their chips, and each
  covered set's Fill section says "Covered by Influence on 12 of 12 members" (from
  `session.styles.explain` counted over the set's members). The fix is Figma's: move the
  measure down, or change its Fill to a channel nobody else uses.
- Two objects that write different channels never conflict: Communities colours, Influence sizes.
  The default Fill of a new Measure avoids a channel that a visible object above it already
  writes: the element's suggested encoding takes the visible stack as input and prefers Size
  when Colour is taken (new element behaviour; today it always suggests colour).

The element's style stack (`session.styles.list()`) is exactly this order linearised: bottom =
the element's locked defaults, then the tree from bottom to top with each parent's layer
immediately below its children's. Every drag in the tree is a `session.styles.move`. The layer
list is the tree; no reader ever sees a layer list.

## 7. The eye, Focus and the mask

The eye and "show only this" are different things, and conflating them would make the eye on a
filter mean the opposite of the eye on a path. So:

- **The eye means exactly one thing: this object stops painting.** Its members stay on the
  canvas, painted by whatever is below. This is Figma's fill-row eye applied to the whole object.
  The eye fires on mouse down, so a drag down the column toggles many rows (Figma's behaviour).
- **Focus** is a separate verb on any Set or Group ("Focus on this" in its overflow, the Focus
  action in its Members header, and the Show select in the Dataset's Showing section). It sets
  the element's one mask (`session.visibility.set`) to that object's members. While Focus is on:
  everything else is hidden; every tool scopes to the focused object and nests its result under
  it; the status bar reads "Focused on Degree > 10: 6 of 34 [Exit]"; the row carries a focus
  glyph; the Dataset's Showing row names it. Exit focus (the status bar, Escape when nothing
  else is pending, or Show [Everything]) restores the mask.
- **One mask at a time**, because the element has one. To show the union of two sets, Combine
  them and Focus on the result.
- **The time window** is part of the same mask (Dataset > Showing), with a transport in the
  status bar while it is active. Playback that re-runs objects per step (issue #300) makes them
  stale each step and shows it; it never runs unasked.
- The eye's tooltip says: "Hide this object's paint. To hide everything else, use Focus."

## 8. Selection

There are two selections, and the inspector shows whichever changed last:

- **Object selection**: tree rows, one or more.
- **Element selection**: nodes and edges, the element's own `session.selection`, shared with
  the canvas, the table, a headset and the assistant.

One rule ties them: **picking a Set or Group row selects its members** (a gold halo on the
canvas, `session.selection.apply({scope}, "replace")`, capped at 5,000 with a "showing 5,000 of
12,000" note from `selection.truncated`). Picking a Measure, Grouping, View or Dataset row clears
the element selection, because those have no members to halo (a measure's ramp is its picture).

| Action | Result |
|---|---|
| Click a node | element selection = that node; the inspector shows the node; every tree row containing it takes the secondary highlight (Figma's child-of-selected fill), the first scrolled into view |
| Shift+click a node | toggles it in the element selection; the inspector shows 4.9 |
| Drag on empty canvas (Select) | marquee: nodes inside preview as selected live, release keeps them; Shift extends, Alt subtracts (a 3D marquee selects the frustum slab). Needs the element to hit-test (medium gap) |
| Click an edge | selects the edge once edges are pickable (issue #319); until then edges are reached from a node's Neighbours rows and the table |
| Click a row | object selection = that object; element selection = its members (or cleared); the inspector shows the object; focus returns to the canvas as in Figma |
| Shift+click rows / Ctrl+click rows | range / toggle; the inspector shows 4.6 |
| Hover a row | its members get the hover outline on the canvas (the element-owned hover layer, `LayerSource.reason` "hover"); hover a node and its rows get the hover fill |
| Double-click a node | selects its neighbours at depth 1 (the graph's "enter the group"); Shift+Enter selects the smallest Set containing the selection; Enter again returns to the node |
| Tab / Shift+Tab on the canvas | next / previous member of the selected object's members in its order; with no object selected, next node by degree |
| Escape | one rung per press: cancel a pick in progress, close the top overlay, clear the element selection, clear the object selection (the inspector returns to the Dataset), exit Focus |
| Ctrl+A | select every shown node; Ctrl+Shift+A adds the edges between them |
| Ctrl+I | invert the element selection |
| Ctrl+G | make a Set from the element selection (`session.selection.promote`), at the top of the current scope, named "Selection 3", renaming focused |
| Ctrl+Shift+H, Ctrl+Shift+L | hide / lock the selected objects (Figma's chords) |
| Ctrl+F | the tree header becomes a search field: typing filters objects by name and lists nodes by label; ArrowDown highlights, Enter selects and locates, Escape restores the tree (needs text search, issue #149) |
| Ctrl+K | the palette: every command and flyout item under both names; a sentence that matches nothing becomes "Ask: <sentence>" (section 9) |
| Right-click a node | a dark context menu of verbs only: Select neighbours, Select connected part, Path from here, Path to here, Note, Pin, Colour this node..., Copy id, Expand from server |
| Right-click a row | Rename, Duplicate, Re-run, Focus on this, Select members, Show in table, Export..., Delete; Combine when two or more rows are selected |

Rule-based and relational selection are not separate modes: the Filter popover has Select
beside Create (a transient selection instead of a Set); a node's Neighbours header and the
context menu select by relation; a Measure's Values rows select by rank. Every one of them can
be promoted with Ctrl+G.

Modifier grammar, identical everywhere: plain replaces, Shift adds, Alt subtracts, Ctrl toggles
(the element's replace, add, remove, toggle). Intersect lives only in Combine, where its inputs
are named.

Locked objects: their members are skipped by canvas clicks and marquee, as a locked Figma layer
is, so a reader can lock a big background set and click through it (small element gap: picking
honours a lock mask).

## 9. Where every non-object capability lives

| Thing | Home | Why there |
|---|---|---|
| Import | the Welcome sheet before a load; after, "Add data" (+) on the Dataset header and the file menu; one dialog with File / URL / Paste tabs, a format select, and the field mapping (id, source, target, label, weight, time, type) shown only when detection is unsure, with Replace or Add to current | the one guided flow that earns a dialog: the decisions must be made before anything exists |
| Join a table by key | Dataset > Attributes header "+" | it adds columns, and columns live in Attributes |
| Data table | a bottom dock (Shift+T): Nodes / Edges tabs; one column per attribute plus one per Measure and Grouping in the tree, in tree order; row selection is the element selection; a "Showing [object v]" select at the left of its header (default: what is showing); column header menu: Sort, Hide, and the same verbs as the Attributes section | the material at full resolution; Figma's Dev Mode and Variables table are the precedent for a secondary tabular view |
| Layout process | Dataset > Arrangement (the transport row) and the status-bar chip that mirrors it ("Spread out, settling 62%" with pause) | one layout in force; a property of the data's arrangement; the chip keeps it reachable while any object is selected (transport is issue #144) |
| Pinning | the node inspector's Pin toggle and drag-to-pin; the "Pinned" system Set appears in the tree while non-empty so pins can be seen, selected and unpinned together | pins are a set of nodes with a state; one row, only when it matters |
| Camera, 2D / 3D | the mode switch at the toolbar's right end; the zoom menu in the right panel header (zoom in / out / fit / to selection, Top, Front, Side, Isometric, Save view); keys 0, F, 1, 3, 7; the zoom readout in the status bar | Figma keeps view controls off the panels; 3D is a view mode, not an object |
| Saved views | the Views list above the tree; "+" saves the camera, mode and mask; click applies | "where I stand and what I look at"; Figma's Pages are the same kind of list |
| XR | VR and AR are the last two segments of the mode switch, present only when the browser reports support; entering hides the panels (Figma's Minimize UI); the element's in-headset UI takes over | a mode, not a panel |
| Compare | a View's "Compare with [View v]": two canvases on one tree and one selection | comparison is two views of the same objects, not a second copy (issue #186) |
| AI assistant | the palette (Ctrl+K): a sentence that matches no command is sent as "Ask: ..."; the transcript is the Assistant dock beside the Table tab; provider setup in Settings; every action the assistant takes creates or edits tree objects through the same commands the tools use (issue #337), with Made by reading "Assistant: <the request>", so its work is visible and undoable | Figma's Actions box is where "type what you want" lives; a panel would make the assistant a mode |
| Export | Share (the one primary button): Export image..., Export data..., Export report..., Copy image, Copy methods text, Export recipe; per-object exports in that object's Export section | Share is the whole picture; an object's section is that object. Two homes by scope, no duplicates |
| Recipes and methods text | "Copy as methods text" in every Made by; Share > Copy methods text concatenates them in tree order; Share > Export recipe writes the creation steps of every object as a replayable list; file menu > Run a recipe replays one onto the current dataset | the persona's reproducibility need, answered by the tree itself |
| Notes | the Note tool (N); the Notes section of every object and node; markers on the canvas (Canvas > Notes switch; the element's marker channel, issue #295); the Dataset's Notes section lists every note | a note is about a thing, so it lives with the thing |
| Legend | a canvas overlay (L), drawn from `session.styles.legend()`: one block per visible Measure or Grouping in precedence order; clicking a swatch selects that Group's row | a picture of the tree's Fills; no home of its own |
| Minimap | a canvas overlay (M) once the element publishes positions and a settle event (issue #293) | a navigation aid |
| Settings, help, shortcuts | the file menu: Settings..., Keyboard shortcuts (docks at the bottom like Figma's), Documentation, Send feedback, Show suggestions | not everyday surfaces; no rail icon |
| Undo | Ctrl+Z / Ctrl+Shift+Z with no popover; every object edit, Fill edit, reorder, delete and creation is one step; the journal (issue #145) later feeds a History dock | Figma gives undo no UI |
| Time | Dataset > Showing > Time window; a transport in the status bar while active | time is a mask on what is showing |
| Sample datasets | the Welcome sheet and file menu > Open sample | data in, not an object |
| Progress and cancel of loads | the Dataset row in the computing state, like any object (cancel is issue #296) | the dataset has a state too |
| Guidance | the empty Objects group shows three suggestion rows ("Find groups", "Rank by connections", "Search a name") that are literally the tools; they vanish once the first object exists; file menu > Show suggestions brings them back; tool tooltips carry one sentence each | guidance in one place, on the empty state only, no wizard and no cards |
| The activity rail | gone | every activity became an object kind or a section of one |

After a load the app does nothing unasked: it draws the graph with the element's recommended
layout, fits the camera, shows one tree row and the Dataset inspector. No degree run, no
suggestion cards, no panel switch.

## 10. Acceptance test

The walkthrough method from `models/task-walkthrough-first.md` section 2 is the acceptance
test for this model: every phase of the 25 workflows in `design/designloom/workflows/` is
walked under this model and graded good / ok / awkward / no. That document's section 10 already
lists what no object model expresses well, and those remain the rough edges here: data edits
(merge duplicates, collapse a group into a node), a group graph and community evolution
(a derived graph, not a set), external enrichment services, pattern search (a Set whose rule is a
small template graph, waiting on the query engine), computed attributes (a formula Measure,
proposed), set-level labels on the canvas (a label at the members' centroid, new element work),
very large graphs (render limits published but not enforced, issue #302), two networks and
what-if scenarios (Focus covers the working-subnetwork cases; a second root is next-phase), and
metrics per time step (one Findings table of series rather than N stale Measures).

## 11. What the element must grow

The app must not own the tree. Today the element has runs, saved scopes, layers and the
selection, each with its own list and no order across them. If the app kept nesting, order,
names, states, overrides and links in its own state, a third-party consumer of graphty-element
would get none of it and a project file (issue #301) could not save it, which breaks the root
architectural rule. So the model depends on two element changes before anything else, then a
list of sized gaps.

**First: one set vocabulary** (medium). `Scope` accepts `{filter: Filter}`; `Filter` gains
`{kind: "set", id}`, `{kind: "top", run, field, n}` and `{kind: "above", run, field, threshold}`;
a layer selector accepts `{match: "scope", scope}`. Every resolver already exists; this is a
type unification with one dispatcher. It makes filter sets, scoped runs, derived sets, boolean
combinations and set Fills one mechanism instead of three, and the objects API is built on it.

**Second: an objects API on the session** (medium to large). `session.objects.list()` returns
the tree (id, kind, name, parent, order, definition, state, member count, layer ids, links);
`create` from a tool spec, `move`, `rename`, `setVisible`, `setLocked`, `setScope`, `rerun`,
`remove`, `focus`, and an `objects:changed` event, built over the existing runs, scopes and
layers so nothing is duplicated: a Set is a saved scope plus a highlight layer; a Measure is a
run plus an encoding layer; a Group is a scope referencing its run's field. The tree order is
the layer order, kept by the element. The shape of this tree in a saved file is the one true
one-way door in the proposal.

| Gap | Needed by | Size | Issue |
|---|---|---|---|
| Layer selector by scope | every set's Fill without expanding ids | small | new |
| One set vocabulary | filter sets, nested sets, derived sets, Combine, Focus by object | medium | new |
| Objects API and tree order on the session | the tree; membership lookup for a node; Focus | medium to large | new; builds on #337 and #301 |
| Expression engine and text search | Filter > By rule; Ctrl+F by node label | large | #149 |
| Hover highlight as an element-owned layer | the two-way hover link | medium | designloom `hover-highlight` |
| Marquee: screen rectangle (2D) or frustum slab (3D) to ids | Select tool | medium | new |
| Canvas picking honours a lock mask | locked rows | small | new |
| Edge listing per node; edge picking and a context-menu pick event | Neighbours section; edge inspector; right-click | small; medium | #297; #319 |
| Fit the camera to a scope | Locate on every set | small | design 4.8 |
| Layout transport; layout over a scope | Arrangement; "Arrange only this" | medium | #144 |
| Stable group identity across re-runs; group names | Groupings that survive Re-run | medium | #191 |
| Result-field filters (group size, top, above) | falls out of the set vocabulary | small | #192 |
| Suggested encoding that avoids channels already written above | default Fill of a new Measure | small | new |
| Coverage counts from `explain` over a set | "Covered by X on N of M" | small | new |
| Legend drawn in captures; minimap positions and settle | overlays | medium each | #292; #293 |
| Result and data exporters | Export sections | small | inventory section 1 |
| Node marker channel | note markers | small | #295 |
| Notes and the journal | Notes sections; recipes; history | large | #145 |
| Time role and time attributes | Showing > Time window | medium | #299, #333 |
| Cancellable loads with progress | the Dataset's computing state | small | #296 |
| Option bounds for a form; weights and direction everywhere | Definition sections | small; medium | #336; #313 |
| Cost estimate exposed per catalogue entry | the cost on every flyout row | small | exists as `session.estimate` |

Nothing in this model requires the app to compute over nodes and edges, sniff a format, walk
neighbours, count components, estimate a cost, or copy a catalogue. Every list a panel draws is
a catalogue or a session call, and every Fill is a layer.

## 12. Decisions taken, with the reason for each

Each row is a choice between the three proposals or a new call. Push back on any of them.

| # | Decision | Alternative rejected | Reason |
|---|---|---|---|
| 1 | Two families, sets and measures, with Grouping as the word for a measure of labels that is also a folder of Groups | "Partition" (tree-first) | it is the owner's own split, and "Grouping" is the word a novice reads; the element keeps "partition" internally |
| 2 | Five tree kinds (Dataset, Set, Group, Measure, Grouping) plus View; Notes and Tables are sections, not rows | seven kinds with Note and Table rows (tree-first, task-walkthrough) | every row must be something you can paint and hide; a note or a table has no members, and note rows would bury the objects on an annotated case |
| 3 | The eye means only "stop painting"; Focus is a separate verb that sets the one mask | the row eye hides members (element-api-first); "Hide the rest" as a per-set property (task-walkthrough) | one toggle, one meaning, on every row; hiding members from every other object is the trap all three reviews flagged; the element has exactly one mask |
| 4 | The verb is called Focus, with "Focused on X: 6 of 34 [Exit]" in the status bar | "Show only this" | one short word that also names the mode; Gephi readers expect a filter to hide the rest, and "Focus on this" is the first thing they will try |
| 5 | Tools scope to what is showing; to compute within an object, Focus on it first; scope never follows the tree selection | scope follows the selected row (tree-first); a Within select before running (element-api) | a novice with Group 2 selected who presses Rank should not get six nodes ranked by surprise; one visible mask is one visible scope, printed in the secondary bar before the click |
| 6 | Nesting means only "computed within the parent"; children cannot be dragged out; a Within field re-scopes explicitly and only childless objects | nesting also means containment, and drag re-scopes (task-walkthrough) | a mis-drag must never silently re-run a four-minute job or change what an object means; the field is deliberate and undoable |
| 7 | Derived objects (Top N, Above, Combinations) are linked, not nested, and are inserted immediately above their first input | Top N as a child of the Measure (task-walkthrough, element-api) | keeps "nested = scoped" pure while putting the derived set where the analyst looks for it, already above its source in precedence |
| 8 | Six states including waiting and frozen; the cost gate creates a waiting row instead of asking | four states and a confirmation prompt (element-api) | the row appears instantly like a drawn shape, no tool ever opens a dialog, and deleting an input never silently destroys a reader's work; frozen may be implemented as conversion to a fixed set |
| 9 | Re-run now versus mark stale is decided by the cost estimate, not by object kind | live kinds and run kinds (task-walkthrough); rule sets always stale (element-api) | one rule; a filter feels live because it is cheap, not because it is a filter |
| 10 | Stale rows keep painting old values with the name dimmed | blank until re-run | the picture is never lost while a re-run is pending |
| 11 | Precedence is per channel, children above their parent, made visible by "Covered by X on N of M", the node's Look section and a default Fill that avoids taken channels | top row wins everything | overlapping membership is what makes graphty different; the reader must be able to see why the picture disagrees with the chips |
| 12 | Every algorithm has exactly one flyout, decided by result shape, with a pair-input override to Path; no Structure tool | Structure as an eighth tool; Bridges and Weakest link in two flyouts | duplicates are the thing the comparison document counted against the current app; a plugin lands in the right place with no app change |
| 13 | Toolbar keys: V H F E P G R N | three different key sets in the three proposals | F for Filter, R for Rank and N for Note read as their words; E for Neighbours is Figma's convention of a letter from the word when the initial is taken |
| 14 | Share is the one filled primary button; a waiting object's Run is secondary-styled | Run as the only filled button in the inspector (tree-first) | one primary button per screen, the rule the comparison document set; Run is first in its section, which is emphasis enough |
| 15 | No top bar: the file name and menu in the left panel header, Share and the zoom menu in the right panel header | today's top bar with undo, search, export, share | Figma's UI3 layout; undo needs no UI; search is Ctrl+F in the tree and Ctrl+K in the palette; export is Share |
| 16 | Ctrl+F is a search field in the tree slot that finds objects by name and nodes by label; Ctrl+K is the palette for commands and the assistant | "@" prefix in the palette (tree-first, element-api) | the universal shortcut; a novice will never discover a prefix |
| 17 | The empty Objects group shows three suggestion rows, gone after the first object, back from the file menu | an "Ideas" line in the Dataset Summary (tree-first); a "Nothing made yet" line (element-api) | guidance in one place, on the empty state only, no wizard and no cards |
| 18 | The Attributes section has per-column verbs (Colour by, Size by, Filter by, Group by, Label by, Set as time, Set as type) and a column becomes an object only when used | a "Use" verb (tree-first); every column a row (none) | the shortest path from data to picture, Tableau's shelf drop, without flooding the tree |
| 19 | "Colour this node..." creates a one-node fixed Set named after the node; there is no automatic Overrides group; "Add to [set v]" on a multi-selection is the clutter policy | an auto-created Overrides group on the third one-node set (element-api) | the app must not decide graph structure; ten rows for ten decisions is what Figma does, and a reader who wants one set selects the nodes first |
| 20 | Rank > Several... is a checklist popover that creates one Measure per tick | no batch (tree-first, element-api) | the analyst persona compares centralities every week; a popover with one Create is not a dialog |
| 21 | Recipes and methods text ship as Share items and a file-menu item | absent (tree-first, element-api) | two of the analyst persona's four stated frustrations, answered by the tree itself |
| 22 | Notes are not tree rows; they live in the anchor's Notes section, as canvas markers, and in the Dataset's Notes list | Note rows at root (tree-first); a Notes list replacing the left panel (task-walkthrough, element-api) | a mode that changes what the left panel means is the thing the comparison criticised; the Dataset's list is the one place to find them all |
| 23 | Views hold only saved views; camera presets are zoom-menu commands | built-in preset rows in the Views list (element-api) | a list of places the reader saved should not start with five rows they did not make |
| 24 | Export has two homes by scope: Share for the whole picture, an Export section per object | three homes (task-walkthrough) | "one home per capability, other places are shortcuts"; here the two are different capabilities |
| 25 | The set-vocabulary unification lands first, then the objects API; the app does not ship an app-owned tree even as a tracked workaround | app-side join in layer userData (element-api); the app builds the tree over scopes and layers (task-walkthrough) | the root CLAUDE.md rule: a workaround in the app fixes one consumer and hides the defect; the tree in a saved file is a one-way door and must be the element's |
| 26 | Combine is inspector buttons on a multi-row selection, not a tool | a Combine tool | Figma's boolean operations appear only for two selected shapes; a tool would need inputs it cannot ask for on the canvas |
| 27 | The Path tool's flyout also holds the network tools (spanning tree, matching) | a Structure tool | they hand back a Set of edges, which is what the Path tool hands back; two tools for one result shape is a duplicate home |
| 28 | The Table dock's "Showing" select defaults to what is showing, not the selected object | the selected object's members (task-walkthrough) | the table is the material at full resolution; the selection is a highlight in it, not a filter of it |

## 13. A worked minute

Elena opens the Karate Club sample. The tree shows one row, "Karate Club"; the inspector shows
the Dataset: 34 nodes, 78 edges, undirected (from file); under the row, three faint suggestion
rows: Find groups, Rank by connections, Search a name. She clicks Find groups. A row
"Communities (Louvain)" appears at the top of the tree, computing, finishes in 80 ms, expands to
six Group rows with swatches, and is selected; the inspector shows six groups and modularity
0.36; the canvas is coloured; the suggestion rows are gone. She clicks Group 2: its nine members
take the gold halo. She clicks the Override "+" in its Fill and picks orange: only those nine
nodes change, and the tree chip changes with them. She presses P, clicks node 1, clicks node 34:
a row "Path: 1 -> 34" appears above Communities, its four edges thick and blue, and it wins where
it overlaps because it is higher. She drags it below Communities; the group colours win on the
path's nodes and the blue stays on its edges, because the two objects write different channels.
She hovers Group 2 and the nine nodes outline. She presses R: "Connections (Degree)" appears
with a size scale, not a colour ramp, because colour was already taken above it. She clicks the
eye on Connections to compare with and without, presses Ctrl+K, types "who bridges the two
halves", and the assistant runs Rank > Bridges; a Measure row appears with Made by reading
"Assistant: who bridges the two halves". Nothing on screen was computed that she did not ask for.
