# An object-first graphty, built from the element API outward

This is a proposal for the object model and the interaction model of an object-first graphty
app. It starts from what graphty-element already exposes through its session API and maps each
API onto an object, a tool or a property, so that the app stays a thin consumer. Where the model
needs something the element does not have, the gap is named and sized.

It is written for an engineer who is not a UX designer. Every design term is defined the first
time it is used. File paths are relative to `/home/apowers/Projects/graphty-monorepo/`.

What it builds on:

- the comparison that produced the direction: `tmp/ux-review/graphty-vs-figma-ux.md`, whose
  last section ("the objects are what you make from the data") is the brief;
- the measured Figma study: `design/ui/figma/components.md` (the row and panel measurements)
  and `design/ui/figma/flows.md` (the interaction rules);
- the two inventories: `design/ui/object-first-ux/inventory/element-capabilities.md` (every
  element capability with its API and status) and
  `design/ui/object-first-ux/inventory/app-today-and-personas.md` (every control in the app
  today, and the twelve personas and twenty-five workflows that are the requirements base);
- the element's session API: `graphty-element/src/session/` (`types.ts`, `runs/`, `results/`,
  `scope/`, `selection/`, `visibility/`, `styles/`) and the catalogue types in
  `graphty-element/src/catalog/types.ts`.

## 0. The idea in one paragraph, and the vocabulary

In Figma the left panel lists the things you made, the right panel shows the properties of the
one you picked, and the toolbar holds the few verbs that make new things. graphty can have the
same shape once we agree on what "the things you made" are: not the nodes and edges (those are
the material, like pixels in a photo) but the **objects you derive from them**: a group, a path,
a ranking, a filtered set. Creating one is running an algorithm or writing a rule, not drawing.
Each object has members or values, a definition you can edit, a state (it may be computing, or
out of date), and an **appearance** that is stored as a graphty-element style layer. The order of
objects in the left panel is the order the style layers paint in. Everything else is the same
Figma grammar: hover a row to highlight it on the canvas, eye and lock toggles, an inspector that
always answers "what is this and how do I change it", and a tool that hands you a selected object
when it finishes.

Terms used throughout:

- **Object**: a named thing derived from the graph data that appears as a row in the left panel.
  Nodes and edges are NOT objects; they are the material objects are made of.
- **Set**: an object whose content is a collection of node ids and/or edge ids (a group, a path,
  a filter result, a saved selection). Sets may overlap.
- **Measure**: an object whose content is one value per node (or per edge): a degree, a PageRank
  score, an imported numeric column.
- **Grouping**: a measure whose values are labels (community 3, BFS level 2), which is also a
  family of sets, one per label. In the tree a grouping is a parent row with one child set per
  group.
- **Fill**: the object's appearance, in Figma's word. A set's fill is a flat colour, size, shape,
  outline or label rule applied to its members. A measure's fill is a colour ramp or a size
  scale. Every fill is one graphty-element style layer.
- **Tree**: the left panel's list of objects, nested and ordered. Figma calls its equivalent the
  Layers panel.
- **Inspector**: the right panel. It shows the properties of whatever is selected; with nothing
  selected it shows the graph.
- **Tool**: a toolbar verb that creates an object (Groups, Path, Rank ...) or selects (Select).
  A **flyout** is the menu behind a tool button's chevron that lists the tool's variants.
- **Marquee**: dragging a rectangle on empty canvas to select what it encloses.
- **Scope**: the element's word for "which elements a piece of work may look at": the whole
  graph, what is visible, the selection, a saved set, an expression. `Scope` is a union type in
  `graphty-element/src/catalog/types.ts`.
- **Run**: one execution of an algorithm inside the element, with an id, parameters, status,
  progress, result and caveats (`graphty-element/src/session/runs/types.ts`).
- **Style layer** (or **layer**): the element's unit of appearance: a selector (which elements),
  a target (node or edge), static values or bound values, in a stack read bottom first where a
  later layer wins per channel (`graphty-element/src/session/styles/`).
- **Channel**: one visual property a layer can write: `node.color`, `node.size`, `edge.width`
  (`Channel` in `graphty-element/src/catalog/types.ts`).
- **Chit**: Figma's 14 x 14 colour swatch inside a field; clicking it opens the colour picker.
- **Scrub**: dragging the label of a number field to change the value.

The Figma measurements the visual language inherits, from `design/ui/figma/components.md`:
240 px side panels, 32 px rows, 24 px controls, 11 px text at weights 450 and 550, radii 2 / 5
/ 13, one accent (#0d99ff) that means "selected" or "the one primary button", dark menus,
tooltips after 1000 ms, and a 16 / 88 / 8 / 88 / 8 / 24 / 8 property grid. Nothing in this
document contradicts those; where a row is named below, it is a 32 px row on that grid.

## 1. The object types

### 1.1 The map from element API to object

| Element API (what exists today)                                                                                           | Becomes                                                                          | Kind          |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------- |
| `session.data`, `session.status`, `session.data.statistics()`                                                             | the Graph (the root of the tree; the "page")                                     | root          |
| `session.selection` (one shared set, capped)                                                                              | the Selection (transient; not a tree row until saved)                            | transient set |
| `session.selection.promote(name)` -> `session.scope.save(name, spec)`                                                     | a Set row                                                                        | set           |
| `session.visibility.set(filter)` (eight filter kinds)                                                                     | a Filter set row; the Graph's "Showing" line                                     | live set      |
| a run with shape `path`, `node-set`, `edge-set` (shortest path, MST, matching, min-cut)                                   | a Set row (a path is ordered)                                                    | live set      |
| a run with shape `node-metric` / `edge-metric` (the centralities, eccentricity, max flow)                                 | a Measure row                                                                    | live measure  |
| a run with shape `community`, `layered-grouping`, `category-table` (communities, components, BFS levels, bipartite sides) | a Grouping row with one Group child per label                                    | live grouping |
| an imported numeric or categorical attribute (`session.data.attributes()`)                                                | a Measure or Grouping row, created when the reader asks to colour or size by it  | measure       |
| a run with shape `fact`, `pair-list`, `temporal`                                                                          | not a tree row; shown in the Graph inspector (facts) or the data table (tables)  | --            |
| a style layer with `source.by == "user"`                                                                                  | the Fill of the object it belongs to (never a row of its own)                    | property      |
| a style layer with `source.by == "run"`                                                                                   | the Fill of the run's object                                                     | property      |
| a style layer with `source.by == "element"`, `locked`                                                                     | the Graph's Default appearance section                                           | property      |
| `el.saveCameraPreset(name)`                                                                                               | a View (a short list above the tree, in the slot Figma gives Pages)              | view          |
| positions, `el.layout`, `el.layoutConfig`                                                                                 | the Graph's Arrangement section (not an object)                                  | property      |
| notes (proposed, issue #145)                                                                                              | a Note pin, in a comment mode, attached to a node, an edge, an object or a point | annotation    |

The rule that decides whether something is a tree row: **it has members or values that a fill
can paint**. A fact ("modularity 0.36") has neither; it is a reading in an inspector. A camera
has neither; it is a view. A layout has neither; it is where the material sits.

### 1.2 Each type, in one table

The columns: what it is; what creates it; its properties (including appearance); its state; how
it nests; how it is re-run, edited and deleted. The element member behind each cell is named.

**Set**

|                   |                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What it is        | A named collection of node ids and/or edge ids. A set is either **static** (a list of ids, from a saved selection or a manual override) or **live** (a rule, re-evaluated when the data changes).                                                                                                                                                                                                                                              |
| Created by        | Select tool then "Save as set" (`session.selection.promote(name)`); the Filter tool (a `Filter` from `graphty-element/src/session/visibility/filter.ts`, kept as a scope); the Neighbours tool (selection target `{neighborsOf, depth, direction}`); the Path and Structure tools (a run whose shape is `path`, `node-set` or `edge-set`); a boolean operation on two selected sets; "Fill" on a raw node (a one-node set, see section 7.5).   |
| Definition        | For a static set: the id list. For a rule set: the rule (attribute, operator, value; degree band; component; neighbourhood seeds and depth; or an expression). For a run set: the algorithm, its parameters (`run.params`: source, target, method) and its scope (`run.scope`).                                                                                                                                                                |
| Members           | `session.scope.resolve(spec)` gives the ids; `session.scope.count(spec)` gives counts without resolving. A path also has an order (`results.<run>.order`) and a length.                                                                                                                                                                                                                                                                        |
| Appearance (Fill) | One style layer per set, `source: {by: "user"}` or `{by: "run"}`, selector = the set. Channels a set can write: `node.color`, `node.opacity`, `node.size`, `node.shape`, `node.outline`, `node.glow`, `node.label`; for edge members `edge.color`, `edge.width`, `edge.style`, `edge.opacity`, `edge.arrowHead`. Added through `session.styles.add(spec)`; edited through `session.styles.update(id, patch)`. A set with no fill has no layer. |
| State             | `current` when the members reflect the data now; `computing` while a run or a filter pass is in flight (`run.status` `queued` / `running`, `run.progress`); `stale` when `run.stale` is set (ran on N, now M) or the snapshot fingerprint changed since a rule set was resolved; `failed` (`run.status` `failed`, with the `GraphtyError`). A static set is never stale; members that left the graph are reported as `unmatched`.              |
| Nests             | Under a Grouping (as one of its groups); under another set (a rule applied within a parent: the child's scope is the parent's scope AND the child's rule); under a Measure (the derived sets Top N and Above threshold).                                                                                                                                                                                                                       |
| Re-run            | A run set: `run.rerun()`. A rule set: resolved again (`session.scope.resolve`). A static set: nothing to re-run.                                                                                                                                                                                                                                                                                                                               |
| Edit              | Rename (inline, double-click or Ctrl+R). Change the rule or a parameter in the inspector, which re-runs. Add, change or remove the fill. Reorder by dragging (`session.styles.move(layerId, before)`).                                                                                                                                                                                                                                         |
| Delete            | Removes the row, its layer(s) and, for a run set, the run: `session.runs.remove(id)` removes the run and the layers it created; `session.scope.remove(id)` for a saved scope. A parent's deletion deletes its children. Undo restores all of it (the app's undo stack replays the inverse; the element returns the records needed).                                                                                                            |

**Measure**

|                      |                                                                                                                                                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| What it is           | One value per node (or per edge).                                                                                                                                                                                                                                                                                  |
| Created by           | The Rank tool (a run with shape `node-metric` or `edge-metric`: `session.runs.start("pagerank", params, {scope})`); "Colour by" or "Size by" on an attribute in the Graph inspector (a measure over `data.<attribute>`); a computed attribute (proposed, design 4.3.4).                                            |
| Definition           | The algorithm and its parameters, scope, and caveats (`run.caveats`: exact or sampled, converged, iterations, direction, weight meaning); or the attribute path.                                                                                                                                                   |
| Values               | `session.results.get(run).column(field)` (min, max, mean, median), `.ranking(field, n)`, `.histogram(field)`, `.summary()`, `.reading({audience})`. A measure may have several fields (HITS has `hub` and `authority`; degree has `value`, `inDegree`, `outDegree`); the inspector picks which one the fill reads. |
| Appearance (Fill)    | An encoding layer: `session.styles.encode({run, field, channel, scale, palette, domain, clamp, range, missing, reverse})`. Colour ramp on `node.color`, size scale on `node.size`, or both (two channels, one layer). The legend blocks for it come from `session.styles.legend()`.                                |
| State                | As a set: current / computing / stale / failed.                                                                                                                                                                                                                                                                    |
| Nests                | Two derived sets appear as children when the reader asks for them: **Top N** (selection target `{top: {run, field, n}}`) and **Above** a threshold (`{above: {run, field, threshold}}`), each a live set that can carry its own fill.                                                                              |
| Re-run, edit, delete | As a set. Deleting a measure deletes its derived sets.                                                                                                                                                                                                                                                             |

**Grouping**

|                   |                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What it is        | A label per node, and therefore a family of sets, one per label.                                                                                                                                                                                                                                                                                                                                                            |
| Created by        | The Groups tool (a run with shape `community`: `louvain`, `leiden`, `label-propagation`, `girvan-newman`, `components`; shape `layered-grouping`: `bfs` levels; shape `category-table`); "Group by" on a categorical attribute in the Graph inspector (a grouping over `data.<attribute>`, for instance node type).                                                                                                         |
| Definition        | Algorithm, parameters (resolution, seed, iterations), scope.                                                                                                                                                                                                                                                                                                                                                                |
| Values            | `result.summary().groups` (group label and size), `result.graph` (groupCount, modularity).                                                                                                                                                                                                                                                                                                                                  |
| Appearance (Fill) | One categorical encoding layer over the whole grouping: `session.styles.encode({run, field: "group", channel: "node.color", palette, overflow})`. The overflow policy (`other`, `shape`, `extend`) decides what happens past the palette's capacity. A group child may ALSO carry its own fill (a set layer), which paints above the parent's ramp for that group only: that is how a reader makes one community stand out. |
| State             | As a set.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Nests             | Children: one Group set per label, in size order, named "Group 1 (12 nodes)" until issue #191 gives them names. A group child nests further like any set.                                                                                                                                                                                                                                                                   |
| Re-run            | `run.rerun()` with the same seed keeps the same partition; a re-run with a new seed may renumber the groups (section 7.3).                                                                                                                                                                                                                                                                                                  |
| Edit, delete      | As a set. Deleting the grouping deletes its groups. Deleting one group child is refused: a group is a fact of the partition, not a thing on its own. Its fill and its children can be removed.                                                                                                                                                                                                                              |

**The Graph** (the root)

|            |                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What it is | The loaded data. The first row of the tree, always present once data is loaded, cannot be reordered or deleted (only replaced by another load).                                                                                                                                                                                                                                                                                         |
| Properties | Name (the file's), counts and shape (`session.data.statistics()`), the attribute schema (`session.data.attributes()`), the import report (`session.data.lastImport()`), the arrangement (layout id, options, dimension, transport), the default appearance (the element's own locked base layers, overridden by one user layer with selector `{match: "everything"}`), what is showing (`session.visibility.summary`, the time window). |
| State      | loading (`data-loading-progress`), loaded, or empty.                                                                                                                                                                                                                                                                                                                                                                                    |
| Nests      | Every object is a descendant of the Graph.                                                                                                                                                                                                                                                                                                                                                                                              |

**View**

|            |                                                                                                                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What it is | A saved camera: position, target, up, and for 2D the orthographic bounds. `el.saveCameraPreset(name)`, `loadCameraPreset`, `getCameraPresets`.                                                     |
| Where      | A short list above the tree, in the slot Figma gives its Pages list, because it is the same gesture (a list of named places to go, one current). Unlike pages, views do not partition the content. |
| Properties | Name; the camera state; which mode it applies to (2D or 3D, `CameraDescriptor`).                                                                                                                   |
| Created by | "Save view" in the Views header (a "+" like Figma's Add new page). The built-in views (Fit, Top, Front, Side, Isometric) are the fixed first rows.                                                 |

**Note** (proposed; the element has no notes API yet, issue #145)

|            |                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| What it is | Text pinned to a node, an edge, an object or a point, with an author and a time.                                                     |
| Where      | A comment mode (key C), as in Figma: pins on the canvas, a Notes list replacing the left panel while the mode is on. Not a tree row. |

### 1.3 Precedence between overlapping objects

A node can be in Group 2, on a path and in "Degree > 10" at once. Which fill wins is the tree
order: **the row nearer the top paints last and wins**, exactly as the top layer in Figma is in
front. In element terms the tree, read top to bottom, is the style stack read from its END to its
start (`session.styles.list()` is read bottom first; a later layer wins). Dragging a row up calls
`session.styles.move(layerId, before)` for its layer, and for each descendant's layer, keeping
descendants contiguous above their parent.

Precedence is **per channel**. A path that writes `edge.color` and `edge.width` does not fight a
grouping that writes `node.color`; both show. Two rows that write `node.color` for the same node
resolve by order. The reader's tool for "why does this node look like this" is the Appearance
section of the node inspector, backed by `session.styles.explain({node})`, which lists each
channel, the layer that won it and whether that layer is editable.

An object's fill applies only to its members. This is the root rule in `CLAUDE.md` ("an
algorithm's suggested style layers MUST write ONLY to the nodes and edges that are part of that
algorithm's own result"): a set's layer selector is the set, a measure's encoding visits only the
elements the run measured, a grouping's ramp only the labelled ones. Dimming everything else is
the reader's own object: a filter set "Not in Group 2" with a fill of opacity 0.2.

### 1.4 Where the objects are stored

The tree is a join of three element registries: saved scopes (`session.scope.list()`: name and
spec), runs (`session.runs.list()`: label, params, status, result) and layers
(`session.styles.list()`: name, source, selector, enabled). The app should not own that join; a
third-party consumer would need the same tree. Proposed element gap, **medium**: the saved-scope
registry becomes the object registry, with `parent`, `hidden`, `locked` and an explicit
`runId`/`layerIds` binding, and it round-trips in the style document (`session.styles.toDocument`)
or the project file (issue #301). Until then the app keeps the join in `userData` on layers and
in its own store, and says so with a comment naming the gap.

## 2. The creation tools

Figma's toolbar holds Move, Frame, Shape, Pen, Text, Comment and Actions: seven groups, each with
a flyout of variants, a single key, and the rule that a finished tool snaps back to Move. The
graphty toolbar has the same shape. Every tool that computes shows the new row in the tree at
once in the `computing` state with a progress bar and a cancel (x) in the row (`run.progress`,
`run.cancel()`), and when it finishes the new object is selected and the inspector shows it. The
tooltip on every computing tool carries the estimate from `session.estimate({op: "algo.run",
algorithm})` ("Groups G about 4 s"); above the cost gate the click asks first, with the
estimate's sentence.

| Tool (key)       | Group face and flyout                                                                                                                                                                                                                                                                            | What it does on the canvas                                                                                                                                                | Hands back                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Select (V)       | Select; flyout: Select all visible (Ctrl+A), Invert (I), Select neighbours (Shift+E), Select connected part                                                                                                                                                                                      | Click, Shift+click, marquee. Not a creator; its result is the transient Selection. "Save as set" (Ctrl+S in the inspector) promotes it.                                   | the Selection; a Set on save                                   |
| Filter (F)       | Filter; flyout: By attribute, By degree, By type (needs issue #299), Connected part, Neighbourhood, Expression (advanced)                                                                                                                                                                        | Opens the rule form as a light popover beside the tree (Figma's "+" pattern). Each rule kind is one form; the expression tab is the advanced door. Enter creates the set. | a live Set                                                     |
| Groups (G)       | Communities (Louvain) as the face; flyout: Communities refined (Leiden), Communities fast (Label propagation), Communities by cutting bridges (Girvan-Newman), Separate pieces (Components), Steps away from a node (BFS levels; then click the start node)                                      | Runs at once with defaults over the visible scope; the row appears computing.                                                                                             | a Grouping with Group children, filled with a categorical ramp |
| Path (P)         | Shortest route as the face; flyout: Shortest route, All routes (issue #329), Most that can flow (max flow), Weakest link (min cut)                                                                                                                                                               | Like a line tool: click A, click B (the canvas shows "Click the start node", then "Click the end node"; a ghost line follows the pointer). Escape cancels.                | a Set (ordered), filled with a highlight                       |
| Rank (R)         | Connections (degree) as the face; flyout: Bridges (betweenness), Reach (closeness), Influence (PageRank), Influence by association (eigenvector), Influence at a distance (Katz), Hubs and authorities (HITS), Distance from everything (eccentricity), Exploration order (DFS; click the start) | Runs at once over the visible scope.                                                                                                                                      | a Measure, filled with a colour ramp                           |
| Neighbours (E)   | Neighbours; flyout: 1 step, 2 steps, 3 steps; In, Out, All                                                                                                                                                                                                                                       | Click a node (or use the selection as seeds).                                                                                                                             | a live Set (an ego network)                                    |
| Structure (S)    | Cheapest connecting network (Kruskal) as the face; flyout: Cheapest network from a node (Prim; click the start), Best pairing (matching), Bridges and cut points (issue #311), Weakest link (min cut)                                                                                            | Runs at once.                                                                                                                                                             | a Set of edges (or nodes), filled with a highlight             |
| Note (C)         | Note                                                                                                                                                                                                                                                                                             | Click a node, an edge or empty canvas to drop a pin and open the composer.                                                                                                | a Note                                                         |
| Actions (Ctrl+K) | the palette                                                                                                                                                                                                                                                                                      | Type a command, an object name, a node name (`@`), or a plain-language request (the AI door, section 6).                                                                  | whatever the command makes                                     |

The toolbar's right end is Figma's mode switch: **2D / 3D / VR / AR** as the sliding-thumb
segmented control (`el.viewMode`; VR and AR appear only when `el.isVRSupported()` /
`isARSupported()`).

What is deliberately not a tool: layout (it is a property of the Graph), export (a menu), search
(the tree's Find, Ctrl+F, and the palette), and anything that runs without being asked. After a
load the app draws the graph and nothing else: no degree pass, no suggestion cards, no panel
switch. The Rank tool's face is Connections; that is where "most connected" lives now.

Every tool's variant list is the algorithm catalogue (`session.catalog.algorithms()`) filtered by
result shape: `community` and `layered-grouping` under Groups, `path` and edge-metric flows
under Path, `node-metric` under Rank, `edge-set` under Structure. A registered plugin algorithm
appears in the right flyout by its shape with no app change, which is what the catalogue is for.
`session.catalog.metrics()` says whether each variant can run on this graph; a variant that
cannot is dimmed with the reason in its tooltip.

## 3. The inspector, per object type

Figma's inspector for a frame is: a selection-type row, then Position, Layout, Appearance, Fill,
Stroke, Effects, Export. The sections map like this:

| Figma section                        | graphty section                                         | Answers                                        |
| ------------------------------------ | ------------------------------------------------------- | ---------------------------------------------- |
| selection type row                   | header: kind, name (inline rename), state chip, actions | what is this                                   |
| Position                             | Members (sets) / Values (measures)                      | what does it contain                           |
| Layout (auto layout)                 | Definition                                              | how was it made; change it and it re-runs      |
| Appearance + Fill + Stroke + Effects | Appearance                                              | how does it look                               |
| Typography                           | Label (inside Appearance)                               | what it says                                   |
| Export                               | Export                                                  | get it out                                     |
| (none)                               | About (collapsed)                                       | provenance and caveats, explanation on request |

Rows are named below. A row is 32 px on the 16 / 88 / 8 / 88 / 8 / 24 / 8 grid; a "two-column"
row is Figma's labelled two-column row (9 px captions above two 88 px fields); a "paint row" is
Figma's Fill row (chit, hex, opacity, eye, minus). Sections end with a 1 px divider. An empty
section is only its header with a "+", and clicking the header of an empty section adds the
first item, as in Figma.

### 3.1 Set

```
header   [set icon] Degree > 10                       [stale dot] [rerun] [...]
         "Filter  .  6 nodes  .  current"                       (11px secondary)

Members
  Nodes            6         Edges            4        (two-column, read-only)
  Showing          6 of 6                              (hidden members, if any)
  [Select members]  [Zoom to]                          (two 88px secondary buttons)

Definition                                     (varies by how the set was made)
  filter:   Attribute [degree v]   Operator [> v]     (two-column)
            Value     [10       ]  Direction [all v]
            Within    [Graph v]                        (the parent scope; "Group 2" when nested)
  path:     From      [Mr. Hi   ]  To        [John A.]  (node pickers; click the canvas to fill)
            Method    [Dijkstra v] Weights   [distance v]
  neighbours: Seeds   [3 nodes  ]  Steps     [2   v]
            Direction [all v]
  static:   "Saved from a selection on 2026-09-25"     (one secondary line, no fields)
  + Add a rule                                         (AND another rule; the "+" of the section)

Appearance
  Fill        [chit] #0D99FF   100%   [eye] [-]        (paint row; "+" adds when absent)
  Size        [ 1.4 x        ]  Shape  [sphere v]      (two-column)
  Outline     [chit] #FFFFFF  [eye] [-]                (paint row)
  Glow        [ 0.6          ]                          (scrubbable)
  Label       [name v]          [Aa style]             (source path select + style popover)
  edge members add:
  Stroke      [chit] #0D99FF   100%   [eye] [-]
  Width       [ 3            ]  Pattern [solid v]
  Arrows      [normal v]        [none v]

Export
  [Copy ids]  [Members as CSV]
  [Image of members...]

About                                                  (collapsed by default)
  Shortest path (Dijkstra) . 34 nodes in scope . 12 ms . exact
  Caveats: "Edge weights read as distance"
  [Explain]  -> the plain-language reading, `result.reading({audience: "plain"})`
```

Element members behind the rows: Members from `session.scope.count(spec)` and
`session.visibility`; Select members = `session.selection.apply({scope: {set: id}})`; Zoom to =
`el.setCameraState` framed on the members (design 4.8 `fit(scope)`, gap small); Definition
fields are the `Filter` union or `run.params`, and an edit calls `session.scope.save` again or
`session.runs.start` with the new params (`queue: "replace"` so the old run is aborted);
Appearance rows are the layer's `set` channels through `session.styles.update(layerId, patch)`;
the fill's eye is `enabled`; the minus is `session.styles.remove`. Label style opens a light
popover with the `LabelStyle` fields. Export rows are gaps (small) except Copy ids.

### 3.2 Measure

```
header   [measure icon] Influence (PageRank)           [computing 42%] [x]
         "Rank  .  34 nodes  .  running"

Values
  Field       [value v]                                 (only when the run has several fields)
  Min  0.012   Max  0.097                               (two-column, read-only)
  Mean 0.029   Median 0.024
  [histogram: 24 bars, 88 px tall, from result.histogram(field)]
  Scale       [linear | log]                            (segmented; suggestedScale preselects)
  Top          1  John A.      0.097                    (5 ranked rows, click selects the node)
               2  Mr. Hi       0.089
               ...
  [See all in table]                                    (opens the data table on this column)
  + Top N set     + Above threshold set                 (create the two derived child sets)

Definition
  Damping     [ 0.85         ]  Iterations [100   ]    (two-column, from OptionDescriptor)
  Tolerance   [ 1e-6         ]  Weights    [strength v]
  Scope       [Visible v]                               (visible / graph / selection / a set)
  Direction   [as loaded v]                             (issue #313)
  [Run again]                                           (secondary; primary while stale)

Appearance
  Colour      [palette strip: viridis v]  [reverse]     (the ramp; palette select shows swatches)
  Scale       [Even steps v]                             (session.catalog.scales(), plain names)
  Domain      [ 0.012  ] to [ 0.097 ]   [auto]          (two-column + a toggle)
  Missing     [skip v]                                   (skip / a fixed value)
  Size        [ 0.6 ] to [ 2.0 ]   [eye] [-]            (the size scale; "+" adds when absent)
  Legend      [eye]                                      (show this measure in the legend)

Export
  [Ranked list as CSV]  [Top 20 as CSV]

About
  PageRank . 34 nodes . 1.2 s . exact . converged in 41 iterations
  Engine: algorithms 2.0.1
  [Explain]
```

Element members: Values from `session.results.get(run)`; the Definition fields come from the
catalogue's `OptionDescriptor` list for the algorithm, with bounds from
`session.catalog.optionsFor()` when issue #336 lands; Appearance is the encoding layer's
`Binding` (`palette`, `scale`, `domain`, `clamp`, `range`, `missing`, `reverse`) through
`session.styles.update`; the derived sets are selection targets `{top}` and `{above}` promoted
to scopes (gap, section 8).

### 3.3 Grouping and Group

Grouping:

```
header   [grouping icon] Communities (Louvain)          [rerun] [...]
         "Groups  .  6 groups  .  modularity 0.36  .  current"

Groups
  [swatch] Group 1        12 nodes                       (one row per group; click selects the row)
  [swatch] Group 2         9 nodes
  ...
  [swatch] Other           3 groups, 5 nodes             (when overflow == "other")

Definition
  Resolution  [ 1.0          ]  Seed       [ 42   ]
  Iterations  [ 100          ]  Scope      [Visible v]
  [Run again]

Appearance
  Colours     [palette strip: okabe-ito v]
  More groups than colours   [Grey the rest v]           (other / shape / extend, in plain words)
  Legend      [eye]

Export
  [Groups as CSV]  [Membership as CSV]

About
  Louvain . 34 nodes . 80 ms . seed 42
  [Explain]  -> "6 groups found. The groups are clearly separated (modularity 0.36)."
```

A Group child is a Set whose Definition section reads "Group 2 of Communities (Louvain)" with no
fields, and whose Members and Appearance sections are the set's. Adding a fill to a group makes
that group's own layer, painted above the parent ramp.

### 3.4 The Graph (nothing selected)

```
header   [graph icon] Karate Club                        [...]
         "34 nodes  .  78 edges  .  undirected (from file)"

Summary
  Nodes         34        Edges         78
  Connected     1 part    Density       0.14
  Links/node    4.6 mean  Range         1 to 17
  Directed      No        "GML default for an absent directed key"   (the provenance)
  Weighted      No        Self-loops    0

Showing                                                  (only while something is hidden)
  30 of 34 nodes . 60 of 78 edges
  Hidden by:  [Degree < 2 x]  [Time: 1990-1995 x]        (chips; x un-hides)
  Time        [1990 ]---o-------[1995]  [< play >]        (only when a Time role exists, #299)

Arrangement
  Layout      [Spread out v]        [2D | 3D]
  [pause] [step] [re-run]           settled              (the transport; issue #144)
  Pinned      3 nodes  [Unpin all]
  [Layout options...]                                     (popover of the engine's options)

Default appearance
  Nodes  [chit] #B3B3B3   Size [1.0]   Shape [sphere v]
  Edges  [chit] #B3B3B3   Width [1.0]  Pattern [solid v]
  Labels [none v]  [Aa]
  Background [chit]

Attributes                                               (the schema)
  name      text     34/34   [Label by] [Colour by]       (one row per attribute; the verbs create objects)
  club      category 34/34   [Group by] [Filter by]
  weight    number   78/78   [Size by]  [Colour by]

Export
  [Image...]  [Data...]  [Report...] (issue #187)
```

The Attributes section is where a data column becomes a Measure or a Grouping: "Colour by
weight" creates a measure object over `data.weight` with an encoding layer (`encode: {by:
"data.weight"}`, which exists in the element today; only the UI is missing, issue #190). "Group
by club" creates a grouping object over the attribute with one child per value. "Label by name"
writes the Default appearance's label source.

No section computes anything unasked. "Most connected" is gone from here; it is the Rank tool.

### 3.5 A node (the material)

Selecting a node on the canvas or in the data table shows the node, because a reader still needs
to read one. It is an inspector for material, and it is shorter than today's:

```
header   [node icon] John A.                              [Locate] [...]
         "node 34  .  pinned"

Attributes
  club      Officer                                     (one row per attribute, filter box above ten)
  age       31
  [Show all 12]

In                                                       (which objects contain it)
  [swatch] Group 2 (Communities)   [swatch] Path: Mr. Hi to John A.   [swatch] Degree > 10
                                                         (clicking a chip selects that object)
Values                                                   (one row per measure)
  Influence      0.097   rank 1 of 34
  Connections    17      rank 1 of 34

Neighbours    17  [In | Out | All]
  Mr. Hi        edge   weight 4                           (click selects; 20 rows then "See all")
  ...
  [Select these]  [Show in table]

Appearance                                               (why it looks like this)
  Colour   #E69F00   from Group 2 (Communities)          (each channel names its winning layer)
  Size     2.0       from Influence
  [Fill this node...]                                    (creates a one-node set; section 7.5)

Actions
  [Neighbours]  [Path from here]  [Pin]  [Hide]
```

Element members: `session.data.node(id)`; `session.styles.explain({node})` for Appearance;
`results.get(run).node(id)` for Values; membership from the registry (gap, section 8); neighbour
rows need an edge listing (issue #297, gap small); Locate = `setCameraTarget`; Pin = `el.pin`.

With several nodes selected the header reads "12 nodes selected", the Attributes section shows
`session.selection.statistics()` (mean, median, against the graph; categorical distributions),
and the only verbs are "Save as set", "Fill..." (which first saves the set) and "Hide".

An edge inspector has the same shape (endpoints, attributes, In, Values, Appearance) but is
unreachable until edges can be picked (section 7).

### 3.6 Several objects selected in the tree

Header "3 objects". Shared rows show "Mixed" where values differ, as Figma does. The header
carries Figma's boolean buttons: **Union, Intersect, Subtract, Exclude**, each of which creates
a new live set whose scope is the combination (gap, section 8: scope composition). Fill edits
apply to every selected object's layer.

## 4. Selection semantics

There is ONE element selection (`session.selection`: nodes and edges, five set operations,
capped at 5,000, `truncated` reported). The tree adds a second, app-side notion: which object row
is picked. The two are kept in step by one rule: **picking an object row selects its members**
(`session.selection.apply({scope: {set: id}}, "replace")`), so the canvas halo always shows what
the inspector is about. Picking a measure row (no members) clears the element selection.

| Gesture                                            | Where      | Effect                                                                               | Element call                                                                      |
| -------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Click a node                                       | canvas     | select that node; inspector shows the node                                           | `selection.apply({nodes: [id]}, "replace")` (cause `user`)                        |
| Shift+click a node                                 | canvas     | toggle it in the selection                                                           | `apply(..., "toggle")`                                                            |
| Ctrl+click a node                                  | canvas     | select the smallest object containing it (Figma: the deepest layer)                  | registry lookup, then `apply({scope})`                                            |
| Double-click a node                                | canvas     | select its neighbours (Figma: enter the group)                                       | `apply({neighborsOf: [id], depth: 1}, "replace")`                                 |
| Shift+Enter                                        | keyboard   | select the smallest object containing the selection (Figma: select parent)           | registry lookup                                                                   |
| Tab / Shift+Tab                                    | keyboard   | next / previous node in the current object, by rank or id                            | app over `scope.resolve`                                                          |
| Drag on empty canvas                               | canvas     | marquee: nodes inside the rectangle (2D), inside the frustum slab (3D); live preview | gap (medium): the element must hit-test, it owns the projection                   |
| Click empty canvas / Escape                        | canvas     | clear                                                                                | `selection.clear()`                                                               |
| Click a row                                        | tree       | pick the object; select its members                                                  | `apply({scope: {set}})`                                                           |
| Shift+click rows                                   | tree       | range of rows; boolean buttons appear                                                | app                                                                               |
| Ctrl+click a row                                   | tree       | toggle a row                                                                         | app                                                                               |
| Hover a row                                        | tree       | outline its members on the canvas (the two-way hover link)                           | gap (medium): a hover layer, `LayerSource.reason: "hover"` is reserved for it     |
| Hover a node                                       | canvas     | outline it; highlight its row's chips in the inspector                               | `node-hover` event; hover layer                                                   |
| Filter tool, "Select matching" on any row          | rule-based | select by rule                                                                       | `apply({where})` (issue #149) or `apply({scope})`                                 |
| "Neighbours" / "Connected part" / "Path from here" | relational | from the node's Actions or the Select flyout                                         | targets `{neighborsOf}`, `{scope: "largest-component"}`, the Path tool pre-seeded |
| Find (Ctrl+F)                                      | tree       | filters the tree by object name; with `@` searches node labels                       | `apply({text, mode})` (issue #149)                                                |
| Escape ladder                                      | keyboard   | cancel a tool or marquee; close the topmost overlay; clear the selection             | as today, plus tool cancel                                                        |

Locked objects: a locked row's members cannot be selected by a canvas click or a marquee (the
click falls through to the next unlocked element, as in Figma), and its fill cannot be edited.
Gap (small): canvas picking honours a lock mask; today the `locked` flag exists only on the
element's own base layers.

## 5. What "nothing selected" shows

Left: the Views list (five built-in rows, then saved views) and the tree. An empty tree shows one
line in secondary text: "Nothing made yet. Use the tools below." Right: the Graph inspector
(section 3.4). Canvas: the graph, the toolbar, the legend (`session.styles.legend()`, drawn by the
app until issue #292 gives the element one), and nothing else. Status bar: "34 nodes 78 edges"
(showing N of M when filtered), the layout chip with its running or settled dot, the zoom
percentage, and "1 selected" when something is.

Nothing loaded: the Welcome sheet as today (one heading, one drop zone, the sample list), which is
the one screen the comparison praised.

## 6. Where everything else lives

| Capability     | Home                                                                                                                                                                                                                        | Reached by                                                          | Element API                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Import         | the Welcome sheet; File menu > Open, Open URL, Paste, Add to graph; the Import options dialog (the one guided flow: format, column roles, preview, parse errors; issue #185)                                                | Ctrl+O, drop anywhere                                               | `el.loadFromFile`, `loadFromUrl`, `session.data.lastImport()`                                                                   |
| Data table     | a bottom drawer (Figma's Dev Mode and Variables table are the precedent for a secondary, tabular view)                                                                                                                      | Shift+T; "See all in table" from any measure; the status-bar counts | `el.getNodes()`, edges (issue #297); one column per measure from `results.get(run).column`                                      |
| Layout process | Graph inspector > Arrangement; the status-bar chip (name, state dot, pause)                                                                                                                                                 | click the chip                                                      | `el.layout`, `layoutConfig`, `waitForSettled`; transport (issue #144)                                                           |
| Camera, 2D/3D  | toolbar mode switch (2D / 3D / VR / AR); zoom menu at the top right of the canvas (Figma's zoom %: Zoom in, out, to fit, to selection, 100%); Views list                                                                    | 0, =, -, F, 1/3/7, 5                                                | `el.viewMode`, `zoomToFit`, `setCameraState`, `applyCameraView`                                                                 |
| XR             | the mode switch; a status-bar chip "VR" with Exit while inside                                                                                                                                                              |                                                                     | `el.setViewMode("vr")`, `exitXR`                                                                                                |
| AI assistant   | the Actions palette (Ctrl+K): a typed line that does not match a command is sent to the assistant; the reply and its tool calls stream into a transcript sheet docked under the palette; a microphone button in the palette | Ctrl+K, backtick focuses the line                                   | `el.aiCommand`, `el.getVoiceAdapter`, the `ai-stream-*` events                                                                  |
| Export         | File menu > Export (image, data, report, style, views); the Export section of every inspector (scoped to that object)                                                                                                       | Ctrl+Shift+E                                                        | `el.captureScreenshot`, `captureAnimation`, `session.styles.toDocument`, `exportCameraPresets`; data and result export are gaps |
| Notes          | comment mode (C): pins, a Notes list in the left panel while in the mode, a note count chip in the status bar                                                                                                               | C                                                                   | issue #145                                                                                                                      |
| Undo / redo    | top left, as today; every object edit and every fill edit is an entry                                                                                                                                                       | Ctrl+Z                                                              | the app's stack over the element's returned records                                                                             |
| Settings, Help | the File menu (the main menu at the top left) and the floating help button at the bottom right                                                                                                                              |                                                                     | --                                                                                                                              |
| Legend         | an overlay at the bottom right of the canvas, one block per measure or grouping whose Legend eye is on                                                                                                                      | L                                                                   | `session.styles.legend()`                                                                                                       |
| Minimap        | an overlay at the bottom left when the element provides one (issue #293)                                                                                                                                                    | M                                                                   | --                                                                                                                              |
| Time           | the Graph inspector's Showing section, and a transport under the canvas when the window is active                                                                                                                           | T                                                                   | `visibility.setWindow`; playback is issue #300                                                                                  |

The activity rail is gone. Its six activities dissolve: Data into the File menu and the Graph
inspector, Explore into the Select and Filter tools and the tree, Analyze into the Groups, Path,
Rank and Structure tools, Style into the Appearance section of every object, Present into the
Export menu and sections, AI into the palette.

## 7. The five hardest fits

### 7.1 Two selections and the cap

Figma has one selection. graphty has the element's selection (elements, capped at 5,000) and the
tree's picked object. The rule in section 4 (picking a row selects its members) keeps one truth,
but three cases bite: a set larger than the cap (the halo shows a prefix; the inspector must say
"showing 5,000 of 12,400 selected"), a measure row (no members; the canvas shows nothing selected
while the inspector shows the measure, which is fine because the ramp IS the picture), and a
click on the canvas while an object row is picked (the row loses its pick; the inspector goes to
the node). Resolution: the tree pick is app state; the element selection is truth for the
canvas; `truncated` is shown in the header; and Shift+Enter from a node returns to the smallest
object containing it. No element change.

### 7.2 What the eye means

Figma's eye hides the layer: the object leaves the picture. For a set the honest equivalent is
hiding its MEMBERS (a visibility filter), which is useful ("hide Degree < 2") and dangerous (a
hidden Group 2 also hides those nodes from every other object). The fill row has its own eye in
Figma, which is what "stop painting this" means. Resolution: two eyes, as in Figma. The row's
eye hides the members: `session.visibility.set({kind: "all", of: [ {kind: "not", of: A}, {kind:
"not", of: B} ]})` composed from every hidden row. The fill row's eye toggles the layer's
`enabled`. A measure row's eye is the same as its fill eye, because a measure has no membership
to hide; its tooltip says so. Gap (small once the registry exists): the element composes the
visibility from hidden objects, because the composition is graph logic, and the `Filter` union
needs a `{kind: "set", id}` member so a hidden set can be named rather than expanded to ids.

### 7.3 Objects that are live, take time and change identity

A run set can be stale (`run.stale`), a rule set can be stale after a data change, a grouping's
groups can renumber after a re-run with a new seed (Louvain is not deterministic), and a child
object defined "within Group 2" then points at a group that may have become Group 4. Resolution:
the state chip in every row (computing with progress and cancel; stale as a dot with "ran on 34,
now 40" in the tooltip; failed with the error) and a "Run again" that is the primary button while
stale; re-runs keep the seed by default (`StartOptions.seed`), so the partition is reproducible
and the groups keep their numbers; and a re-run with a new seed re-matches groups to their
predecessors by largest overlap so children and fills follow the group, not the number. That
matching is graph logic: gap (medium), together with names for groups (issue #191). A rule set
never re-runs by itself when data changes; it turns stale and says so (never acting unasked).

### 7.4 Rules without a query engine

Figma never asks for a query language; every property is a form. The Filter tool's forms are
the element's `Filter` kinds (range, categories, degree, component, neighbourhood, and all / any
/ not), which exist and run today. But three things that the object model treats as one --
selection targets (`{top}`, `{above}`, `{neighborsOf}`), filters, and scopes (`"visible"`,
`{set}`, `{where}`, `{nodes}`) -- are three unions in the element, and a scope is the only one a
run, a layer or a saved set can be built from. A filter set therefore cannot be a scope today
without the expression engine (issue #149), which is the largest open gap. Resolution: one
set-specification vocabulary: `Scope` accepts `{filter: Filter}`; `Filter` gains `{kind: "set",
id}`, `{kind: "top", run, field, n}` and `{kind: "above", run, field, threshold}`; a layer
selector accepts `{match: "scope", scope}`. Every resolver already exists; this is a type
unification with one resolver dispatching to them (gap, medium). The expression engine remains
the advanced tab and stays issue #149 (large). Until the unification lands, the app builds an
ids selector for a rule set's fill and marks it as a temporary workaround naming the gap.

### 7.5 The material still needs a face

Nodes are pixels, but a reader still clicks one to read it and sometimes wants to paint one.
"Fill this node" must go through a layer (the styling rule) and must be visible in the tree
(the whole point of the model), so it creates a one-node static set named after the node with
the fill on it. Ten such edits make ten rows, which is what Figma does with ten rectangles, and
which is honest: those are ten decisions the reader made. Two things keep it from becoming
clutter: consecutive one-node sets are created as siblings inside an "Overrides" group the app
creates on the third one (a plain set whose scope is the union), and
`session.styles.resolveToStatic(layerId, channel, at)` is the door for "keep this node's
computed colour but freeze it". Neighbour listing, the other thing a node inspector needs, is a
small element gap (issue #297). Edges remain unpickable by the element's choice; an edge set can
still be selected through a row, and an edge inspector waits on picking (issue #319, medium).

Other fits that are awkward but resolved by a sentence: a data attribute is a measure only once
the reader colours or sizes by it (before that it is a row in the Graph's Attributes section);
layout over a scope ("arrange these members radially") is an Arrangement section on a set,
waiting on issue #144; a 3D marquee selects the frustum slab between the near plane and the
farthest node; the legend belongs to measures and groupings only, and each has an eye for it.

## 8. The element gaps, sized

Small is a day or two inside an existing API; medium is a new API member or a resolver with
tests; large is a subsystem. Existing issue numbers are given where one is open.

| Gap                                                                                                                                                              | Needed by                                                                              | Size          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------- |
| Layer selector by scope: `{match: "scope", scope: Scope}`                                                                                                        | every set's fill without expanding ids                                                 | small         |
| One set vocabulary: `Scope` accepts `{filter}`; `Filter` gains `set`, `top`, `above`                                                                             | filter sets, nested sets, derived sets, boolean operations, hiding by object           | medium        |
| Object registry on the session (saved scopes with `parent`, `hidden`, `locked`, `runId`, `layerIds`, order), round-tripped in the style document or project file | the tree itself; membership lookup for a node; visibility composed from hidden objects | medium        |
| Expression engine and text search (issue #149)                                                                                                                   | the Filter tool's advanced tab; Find by node name; `{where}` scopes                    | large         |
| Hover highlight layer (`LayerSource.reason: "hover"`)                                                                                                            | the two-way hover link                                                                 | medium        |
| Marquee: screen rectangle (2D) or frustum slab (3D) to ids                                                                                                       | Select tool                                                                            | medium        |
| Canvas picking honours a lock mask                                                                                                                               | locked rows                                                                            | small         |
| Edge listing per node (`getEdges`, issue #297)                                                                                                                   | Neighbours section                                                                     | small         |
| Fit the camera to a scope (`fit(scope)`, design 4.8)                                                                                                             | Zoom to on every set                                                                   | small         |
| Layout transport and layout over a scope (issue #144)                                                                                                            | Arrangement section; per-set arrangement                                               | medium        |
| Stable group identity across re-runs; group names (issue #191)                                                                                                   | groupings that survive Run again                                                       | medium        |
| Group-size filters and result-field filters (issue #192)                                                                                                         | falls out of the set vocabulary                                                        | small         |
| Legend drawn by the element (issue #292); minimap (issue #293)                                                                                                   | canvas overlays every consumer needs                                                   | medium each   |
| Result export: ranked list, groups, membership as CSV; screenshot scoped to a set                                                                                | Export sections                                                                        | small         |
| Edge picking and a context-menu pick event (issue #319)                                                                                                          | edge inspector; right-click                                                            | medium        |
| Notes (issue #145)                                                                                                                                               | comment mode                                                                           | large         |
| Cancellable loads (issue #296)                                                                                                                                   | the Graph's loading state                                                              | small         |
| Option bounds for a form (`optionsFor`, issue #336); weight and direction options everywhere (issue #313)                                                        | Definition sections                                                                    | small, medium |

Nothing in this model requires the app to compute over nodes and edges, sniff a format, walk
neighbours, count components, estimate a cost, or copy a catalogue. Every list a panel draws is
a catalogue or a session call, and every fill is a layer.

## 9. A worked minute

Elena loads the Karate Club sample. The tree shows "Karate Club"; the inspector shows the Graph:
34 nodes, 78 edges, undirected (from file). She presses G. A row "Communities (Louvain)" appears
computing, finishes in 80 ms, expands to six Group children with swatches, and is selected; the
inspector shows six groups and modularity 0.36; the canvas is coloured; the legend appears. She
clicks Group 2's row: its nine members get the halo. She clicks the Fill chit in the inspector
and picks orange: Group 2's own layer is added above the parent ramp and only those nine nodes
change. She presses P, clicks Mr. Hi, clicks John A.: a row "Path: Mr. Hi to John A." appears
above Communities, its four edges thick and blue, and it wins where it overlaps because it is
higher. She drags it below Communities; the group colours win on the path's nodes and the blue
stays on its edges, because the two objects write different channels. She hovers "Group 2" and
the nine nodes outline. She presses Ctrl+K, types "who is most connected", and the assistant
runs Rank > Connections; a measure row appears with a viridis ramp. She turns the ramp's eye off
to keep the group colours and keeps the measure for its ranking. She saves a view, exports an
image, and nothing on screen was computed that she did not ask for.
