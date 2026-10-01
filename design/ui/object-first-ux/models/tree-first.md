# Tree-first: an object model and interaction model for an object-first graphty app

This is one candidate model for the object-first graphty app, built by starting from the object
tree and deriving everything else (the toolbar, the inspector, selection) from it. It is a design
exploration, not an implementation plan: nothing in the app changes because of this file.

The premise, from `/home/apowers/Projects/graphty-monorepo/tmp/ux-review/graphty-vs-figma-ux.md`:
nodes and edges are the material, like pixels. The objects are what a reader MAKES from them by
running algorithms and filters: groups, paths, rankings, filtered sets. The left panel is a tree
of those objects; the toolbar holds the verbs that create them; the right panel inspects the
selected one; the tree order is the style precedence.

Inputs this model was checked against: the capability inventory
(`/home/apowers/Projects/graphty-monorepo/design/ui/object-first-ux/inventory/element-capabilities.md`),
the inventory of the app today and the personas
(`/home/apowers/Projects/graphty-monorepo/design/ui/object-first-ux/inventory/app-today-and-personas.md`),
and the measured Figma study (`/home/apowers/Projects/graphty-monorepo/design/ui/figma/`). Element
API names written `session.xxx` are real members of the graphty-element session API
(`/home/apowers/Projects/graphty-monorepo/graphty-element/src/session/`); issue numbers are open
issues in `graphty-org/graphty-monorepo`.

## 0. Terms

Each design term is defined here once and then used without ceremony.

- **Object**: a row in the left-hand tree. Something the reader made from the data, or the data
  itself. Objects are the only things the inspector edits.
- **Element**: one node or one edge. Elements are the material. They are not objects, they are
  what objects contain. An element can be clicked and inspected, but its appearance is never
  edited directly; it is edited on an object that contains it.
- **Member**: an element that belongs to an object. A set's members are its nodes and edges; a
  measure's members are every element it has a value for.
- **Inspector**: the right-hand panel. It always shows the properties of the current selection,
  and nothing else.
- **Fill**: Figma's word for a shape's paint. Here it is an object's appearance: the style layer
  (or layers) that paints its members. "Fill" is used for the whole appearance, not just colour,
  because it is one word and readers of Figma already know that it lives on the selected thing.
- **Channel**: one visual property a Fill can write: node colour, node size, edge width, and so
  on (the element's `Channel` list, 40 of them).
- **Precedence**: when two objects both paint the same channel of the same element, which one
  wins. In Figma the layer nearer the top of the list is painted on top. Same here.
- **Scope**: the elements a tool is allowed to look at when it creates an object. "Find groups
  within Degree > 10" has the filter as its scope. Scope is what nesting means in the tree.
- **State**: whether an object's members and values are up to date: current, stale, computing,
  waiting, failed, frozen. Defined in section 1.4.
- **Reading**: a one- or two-sentence plain-language explanation of what an object means (the
  element's `RunResult.reading()`), shown on request, never permanently.
- **Row**: a 32 px line in a panel (the Figma measurement). A row has one job.
- **Section**: a titled group of rows in the inspector with a 40 px header row; empty sections
  are a header with a "+" (Figma's rule).
- **Tool**: a toolbar verb that creates an object. Picking a tool changes what a canvas click
  does until the object exists; then the tool snaps back to Select, as Figma's drawing tools do.
- **Dock**: a surface that takes space from the canvas (the data table). An **overlay** floats
  over it (the toolbar, the legend).

## 1. The object tree

### 1.1 The tree at a glance

The left panel has two lists, in the slots Figma uses for Pages and Layers:

```
VIEWS                                 (the Pages slot: one per camera + mode + what is showing)
  Overview                            <- current
  Zoomed on finance
  Compare: before / after

OBJECTS                               (the Layers slot)
  v Karate Club                       34 nodes  78 edges       the DATASET, always the root
      v Communities (Louvain)         6 groups  [partition]    a PARTITION: a measure that is also a folder of sets
          Group 1                     12        [set]          a GROUP: a set owned by its partition
          Group 2                      9        [set]
          ...
      Path: Mr Hi -> John A            5 nodes 4 edges [set]   a SET made by the Path tool
      Bridges (Betweenness)           34 values [measure]      a MEASURE: one number per node
      v Degree > 10                    6 nodes  [set]          a SET made by the Filter tool
          Communities within it        3 groups [partition]    a partition SCOPED to the filter (nested = scoped)
      Top 10 by Bridges                10 nodes [set]          a set cut from a measure (linked, not nested)
      Group 1 and Path                  3 nodes [set]          a COMBINATION of two objects (linked)
      Note: "the broker"                on Mr Hi [note]        a NOTE
      Pinned                            2 nodes  [set]         a SYSTEM SET: exists while something is pinned
```

Row anatomy, left to right, on Figma's 32 px layer row: caret (16), kind icon (16), name (11 px,
weight 600 on the root, 400 below), the member count in secondary text, a state glyph when the
state is not current, a 14 x 14 Fill chip (a swatch for a set, a small ramp for a measure, a
four-colour strip for a partition), then lock and eye toggles that appear on hover and stay
visible when set. Hidden objects dim to tertiary text, exactly as a hidden Figma layer does.

### 1.2 The kinds of object

Seven kinds. The first five live in the Objects tree; Views live in the Views list; exports
are not objects at all (section 1.7 says why).

| Kind | What it is | Members | Fill by default | Lives |
|---|---|---|---|---|
| Dataset | The loaded data: nodes, edges, attributes, positions, the layout in force, what is showing | everything | the element's own default look (locked) | root of the tree; exactly one today |
| Set | A named collection of elements: a filter, a path, a neighbourhood, a promoted selection, a spanning tree, a cut, a combination of other objects, a pattern match | a list of node ids and edge ids | one colour (a highlight layer) | tree |
| Measure | One value per element: a centrality, a score, an imported numeric column, a formula | every element it has a value for | a colour ramp or a size scale (an encoding layer) | tree |
| Partition | One label per element which is also a family of sets: communities, components, BFS levels, k-core shells, an imported category column, a node-type role | every labelled element; each Group child holds one label's members | one colour per group (an encoding layer with an ordinal scale) | tree, always with Group children |
| Group | One label of a partition | that label's members | inherited from the parent partition; may be overridden | tree, only under a partition |
| Note | Text anchored to an element, a point, or another object | its anchor | a marker (the `node.marker` channel, #295) | tree, under the object it annotates or at root |
| View | A camera, a view mode (2D, 3D, VR, AR) and what is showing | none | none | the Views list |

The element already types results this way: its result shapes `node-set`, `edge-set` and `path`
are sets; `node-metric` and `edge-metric` are measures; `community`, `layered-grouping` and
`category-table` are partitions (`/home/apowers/Projects/graphty-monorepo/graphty-element/src/catalog/types.ts`).
The `fact`, `pair-list` and `temporal` shapes produce no members and so make no tree row; they
show as rows inside the inspector of the object that produced them (section 3).

### 1.3 Properties every object has

| Property | Where it shows | Edited by |
|---|---|---|
| Name | tree row, inspector header | double-click or Ctrl+R renames in place (Figma's rule) |
| Kind | tree icon, inspector header word ("Set", "Measure") | never; it is decided by what created the object |
| Members and count | tree row count, inspector Members section | never directly; by editing the Definition and re-running |
| Definition | inspector Definition section: the tool that made it, its inputs and parameters, its scope | fields commit on Enter, Tab or blur |
| State | tree glyph, inspector header badge | by re-running |
| Fill | tree chip, inspector Fill section | paint rows |
| Visible (the eye) | tree row | click; fires on mouse down so a drag down the column toggles many |
| Locked (the lock) | tree row | click. A locked object cannot be renamed, re-run, moved, deleted or have its Fill edited, and its members are skipped by canvas selection; it still paints |
| Notes | inspector Notes section, Note children in the tree | the Note tool or the section "+" |
| Position in the tree | the tree | drag; Ctrl+] and Ctrl+[ move up and down (Figma's bring forward / send backward) |

### 1.4 States

An object is live: it can be re-run, and its inputs can change under it. Figma has no such
thing, so this is the first place the model departs. Six states, one glyph each in the tree row
and one word in the inspector header:

| State | Meaning | Tree row | Inspector header |
|---|---|---|---|
| current | members and values reflect the data and the definition | nothing extra | nothing extra |
| computing | a run is in progress | a 12 px spinner replaces the count; the count fills in as progress ("42%") | "Computing 42% [Cancel]"; the row's own "Cancel" is the run's `cancel()` |
| waiting | created but not run, because the cost gate said it would take too long to start unasked | a hollow circle; the count reads "not run" | a primary "Run (about 4 min)" button with an "Approximate instead" secondary; the only filled blue button that can appear in the inspector |
| stale | the data, the scope or a parameter changed since the last run; members are the OLD ones | a small amber dot after the name; the count keeps the old number | "Stale: ran on 34 nodes, now 40 [Re-run]" (`run.stale`) |
| failed | the run threw | a red dot | the `GraphtyError` message and a "Retry" |
| frozen | an input this object referenced was deleted; members are kept as a fixed list | a grey snowflake; name in secondary text | "Frozen: 'Degree > 10' was deleted. Members kept as a fixed list. [Unfreeze as fixed set]" |

Stale propagates DOWN the tree: when a partition goes stale, every Group under it goes stale;
when a scope goes stale, everything nested in it goes stale. It never propagates up.

Which edits re-run immediately and which only mark stale is decided by cost, not by kind: if the
element's estimate for the re-run (`session.estimate`) is under one second, committing the edit
re-runs at once (Figma's "nothing applies until Enter, then it applies" feel); otherwise the
object turns stale and shows Re-run with the estimate. Rule sets (a filter by expression, range,
category or degree) are always under a second on the graphs the app renders, so they behave as
live filters.

Approximate, sampled, not-converged and every other qualification is a caveat (`run.caveats`),
not a state. Caveats are one line in the Reading section and a small "~" before the count in the
tree row when the run was approximate.

### 1.5 Nesting: what it means for one object to be under another

Nesting means exactly one thing: **the child was computed within the parent's members**. The
parent is the child's scope. Two ways a child gets there:

1. **The tool was used while the parent was selected.** Select "Degree > 10" in the tree, pick
   Find groups: the partition is created inside the filter, over its six nodes only. The
   secondary bar says so before the click: "Find groups within Degree > 10 (6 nodes)".
2. **The parent produced it.** A partition produces its Groups. Nothing else produces children.

Two things nesting does NOT mean:

- **Not containment of members.** "Top 10 by Bridges" contains ten of the measure's members but
  is not nested under it, because it was cut from the measure's values, not computed within a
  scope. It is a linked object: its Definition points at the measure. The same goes for
  combinations ("Group 1 and Path" references two objects). Linked objects sit at the level where
  they were created and show their inputs as clickable rows in the Definition section.
- **Not grouping for tidiness.** There is no folder object. Readers who want to hide clutter
  collapse the parent or hide rows with the eye.

Consequences, so the rules are never ambiguous:

| Rule | Why |
|---|---|
| A child can only be moved within its parent, never out of it, and never into a different parent | moving it would change its scope, which means re-computing it; a re-computation is a new object. To get the same object at root, use the same tool with nothing selected |
| Deleting a parent deletes its children | they cannot exist without their scope. The delete dialog says the count: "Delete 'Degree > 10' and the 2 objects inside it?" |
| Deleting an object that others LINK to freezes them (section 1.4), it does not delete them | a linked object was the reader's own creation; a reference is not ownership. Figma's equivalent: deleting a main component detaches its instances |
| A Group cannot be deleted on its own; hiding it (the eye) is the way to drop one group from the picture | the partition owns its groups. Re-running the partition would bring the group back anyway |
| The Dataset cannot be deleted; "Close dataset" clears the whole tree | it is the root |
| A Note nests under the object it annotates, or at root when its anchor is an element or a point | a note is about something; showing it under that something is the one exception to "nested means scoped", and it is harmless because a Note has no members to scope |

### 1.6 Precedence: which object's Fill wins where objects overlap

Elements belong to many objects at once (a node can be in Group 3, on the path, above the degree
threshold, and have an Influence value). Figma never has this problem, because a pixel belongs
to one shape at the front. The rule here is Figma's paint order applied per channel:

**For each channel of each element, the object nearest the top of the tree whose Fill writes
that channel and whose members include the element wins. Children paint above their parent.
Hidden objects (eye off) do not paint at all. Below every object is the Dataset's default look.**

"Nearest the top" is read in the tree as displayed, fully expanded, except that a parent's own
Fill sits BELOW all its children (as a Figma frame's fill sits behind the frame's contents).
In practice:

- Drag "Path" above "Communities" and the path's colour wins on the path's nodes; the community
  colours still show everywhere else, because the path does not include those elements.
- A Group with its own colour beats the partition's palette on that group, because a child
  paints above its parent.
- A measure whose Fill writes node colour, placed at the top, colours every node and makes every
  set's colour invisible. This is correct and visible: the sets' rows keep their chips, and each
  set's Fill section says "Covered by Influence on 12 of 12 members" (from
  `session.styles.explain`). The fix is the same as in Figma: move the measure down, or change
  its Fill to a channel nobody else uses (Size).
- Two objects that write different channels never conflict: Communities colours, Influence sizes.
  The default Fill of a new measure is therefore chosen to avoid a channel a visible object
  above it already writes (the element decides this when it suggests an encoding; today it
  always suggests colour, which this model asks it to change).

The style stack the element holds (`session.styles.list()`) is exactly this linearised order:
bottom = the element's locked defaults, then the tree from bottom to top with each parent's
layer immediately below its children's. Every drag in the tree is a `session.styles.move`. Style
layers are no longer a separate concept a reader sees; the layer list IS the tree.

### 1.7 What is deliberately not an object

- **Style layers.** A layer is an object's Fill; a reader never sees a layer that is not on an
  object. A Fill can hold several layers (colour and size) and they move together.
- **Exports.** An export is a section on an object ("Export" on the Dataset for the whole
  picture and the data; on a set for its members as CSV and a picture framed on them; on a
  measure for the ranked list). Figma keeps export settings on the selected layer and on the
  page for the same reason: an export is something you do TO a thing, not a thing.
- **Layouts.** There is one arrangement in force for the dataset, it has no members, and two
  layouts cannot both be true. It is the Arrangement section of the Dataset (section 3.1). A
  layout that needs a structural input (Concentric rings, Columns by group, Two columns) points
  at a partition in the tree by a "Group by" row. Frozen positions ("keep these positions") are
  a possible future object kind; not needed for the first version.
- **Attributes.** An imported column is material, not an object, and a wide table would put
  thousands of rows in the tree. A column becomes an object when a reader USES it: the
  Attributes section of the Dataset has a "Use" verb per column that creates a Measure (numeric)
  or a Partition (category, boolean, type) wrapping that column. That gives "colour by
  conference" a tree row, a Fill and a precedence position like everything else.
- **Runs.** The element keeps every run (`session.runs.list()`); the tree shows an object per run
  that produced members. A run whose result is a `fact` (density) or a `pair-list` (link
  prediction) is shown inside the inspector of what it was computed on, not as a row.
- **The selection.** The current selection is a transient set with no row. Ctrl+G promotes it to
  a Set object (`session.selection.promote`), mirroring Figma's Ctrl+G "group selection".
- **The legend.** It is a picture of the visible Fills, drawn from `session.styles.legend()`;
  its rows are the tree's visible measures and partitions in precedence order.

### 1.8 How each kind is created, re-run, edited and deleted

| Kind | Created by | Re-run means | Editing the Definition changes | Delete |
|---|---|---|---|---|
| Dataset | Open file, URL, paste, sample, "Add data" | reload the file; "Re-run all" re-runs every stale object in tree order | the field mapping (which columns are id, source, target, label, weight, time, type), direction, repeated-edge policy; every object goes stale | Close dataset |
| Set (rule) | Filter tool | re-evaluate the rule (always immediate) | the expression, the attribute and range, the value list, the degree band; the scope | Delete; linked dependents freeze |
| Set (relational) | Neighbours tool, Path tool | re-walk from the anchor node(s) | the anchor(s), the depth, the direction, the path method | same |
| Set (result) | Path flyout: spanning tree, matching, max flow, min cut; Filter flyout: pattern | re-run the algorithm | its options (source, sink, k) | same |
| Set (fixed) | Ctrl+G on a selection; paste a list of ids | nothing to re-run; membership survives a re-load only for ids that still exist | "Edit members": add or remove by selecting on the canvas and pressing + or - | same |
| Set (combination) | Combine on two or more selected tree rows | re-evaluate from its inputs (immediate) | the operation (union, intersect, subtract) and the inputs, which are clickable rows | same |
| Measure | Rank tool (an algorithm) or Attributes > Use | re-run the algorithm | options (damping, iterations, weight, direction), exactness, scope | Delete; sets cut from it ("Top 10 by ...") freeze |
| Partition | Groups tool or Attributes > Use | re-run; Groups are re-matched to the old Groups by greatest overlap so their names, notes and Fill overrides survive; a Group with no match is shown frozen until removed by the next re-run that does not need it | resolution, seed, method, scope | Delete, with its Groups |
| Group | its Partition | never on its own | nothing; a Group's Definition is read-only ("Group 3 of Communities") | cannot; hide it |
| Note | Note tool or a Notes section "+" | never | the text, tags, the anchor (re-anchor by dragging the marker) | Delete |
| View | Views "+" ("Save current view") | never | camera, mode, showing: "Update to current" | Delete |

Every one of these edits is one undo step in the app's undo stack (the element returns inverse-
able records; the stack itself is the consumer's, per `design/element-api/element-api-design.md`
section 9.3).

## 2. The creation tools: the toolbar

The toolbar is Figma's floating toolbar: bottom centre, 48 px tall, radius 13, tool buttons 32 x
32 with a 16 px chevron opening a flyout, the last-used flyout item becoming the group's face.
One tool is active at a time (`aria-pressed`, the brand-blue fill). Keyboard letters select
tools. Left to right:

```
[ Select v ] [ Filter v ] [ Neighbours ] [ Path v ] [ Groups v ] [ Rank v ] [ Note ]  |  [ Hand ]  |  [ 2D | 3D | VR | AR ]
     V           R              E            P           G           K          N           H              (the mode switch slot)
```

The verbs are the ones the comparison named (Select/filter, Find groups, Path, Rank, Bridges),
with "Bridges" folded into Rank because betweenness is a measure. Each tool's contract is the
same shape: what it needs from the canvas, what it shows while it needs it, and what it hands
back when it finishes. A tool that hands back an object adds the row at the top of the current
scope (Figma adds new items at the top), selects it, and returns to Select.

| Tool | Flyout (the face is the last used) | Needs from the canvas | Secondary bar while active | Hands back |
|---|---|---|---|---|
| Select (V) | Select, Marquee, Lasso (later) | click, Shift+click, drag | nothing (Figma shows nothing for plain selection) | an element selection (not an object); Ctrl+G makes it a Set |
| Filter (R) | By rule (an expression), By values (an attribute and a list), By range (an attribute, min, max), By connections (degree band), Largest connected part, Pattern (later, #149 first) | nothing | a 240 px light popover above the toolbar: the rule fields and a live count "Matches 6 nodes" from `session.scope.count`, then Create | a Set (rule) |
| Neighbours (E) | none | one click on a node (or the current selection) | "Within [1 v] steps, [All directions v], of Mr Hi" then Create; Enter creates | a Set (relational), members = seeds plus the neighbourhood (`{neighborsOf, depth, direction}`) |
| Path (P) | Shortest route, All routes (later, #329), Cheapest connecting network (Kruskal, Prim), Most that can flow, Weakest link | Shortest route and the flow pair: two clicks, A then B, with a rubber-band line from A to the pointer; the network tools: nothing, or a start node for Prim | "Pick the start node" then "Pick the end node" with [Shortest v] and Cancel | a Set (ordered for a path; edges for the network tools) |
| Groups (G) | Communities (Louvain), Communities refined (Leiden), Communities fast (Label propagation), Communities by cutting bridges (Girvan-Newman), Separate pieces (Components), Steps away from a node (BFS; one click), Densest shells (k-core, when registered) | nothing, or one click for Steps away | "Find groups within <scope> (N nodes)" and, when the estimate exceeds the gate, "About 4 min. [Run] [Approximate]" | a Partition with Group children |
| Rank (K) | Connections (Degree), Bridges (Betweenness), Reach (Closeness), Influence (PageRank), Influence by association (Eigenvector), Influence at a distance (Katz), Hubs and authorities (HITS), How far from everything (Eccentricity), Clustering (when registered) | nothing | "Rank within <scope> (N nodes)" and the cost line as above | a Measure (HITS: two Measures) |
| Note (N) | none | one click on a node, an edge, a point, or a tree row | "Click what the note is about" | a Note, with its text field focused |
| Hand (H) | none | drag pans (2D) or orbits (3D); Space held is the same | nothing | nothing |

Rules the toolbar keeps:

- **Scope is decided by the selection, and stated before the click.** With a tree row selected,
  the tool works within that object's members and nests the result under it. With nothing
  selected, it works on what is showing (the Dataset's Showing mask), and the result goes at
  root. The secondary bar always prints the scope and the count.
- **Options come after creation, not before.** Figma draws the rectangle first and adjusts it in
  the inspector; Rank runs PageRank with defaults and the damping factor is a row in the new
  object's Definition. A parameter that must be chosen before running (a root node, a source and
  target) is asked for on the canvas as a pick, never in a dialog. The one exception is the cost
  gate (section 7.2).
- **A tool never opens a modal.** The old Run Algorithm dialog and the Run Layout dialog go away.
- **Creation is instant to the tree.** The row appears the moment the tool finishes its picks, in
  the computing state if the run is not done, with progress and Cancel in the row. The reader
  never waits on a spinner in a dialog.
- **Undo removes the object.** Ctrl+Z after a creation deletes the row and cancels the run if it
  is still computing. There is no confirmation on delete for the same reason.
- **The command palette (Ctrl+K) offers every flyout item by both names** ("Bridges",
  "Betweenness centrality") and runs it with the same scope rule, so the keyboard reader never
  touches the toolbar. This is the one place the assistant's natural-language box also lives
  (section 6.5).

Combine is not a tool: it is an action that appears when two or more tree rows are selected
(section 3.9), like Figma's boolean operations appearing for two selected shapes.

## 3. The inspector, object by object

The inspector is the 240 px right panel on Figma's grid (16 pad, 88 + 8 + 88 columns, 24 icon,
8 pad). Row types are Figma's: a field row (label above, 24 px control), a single 32 px row with
a control centred, a paint row (chit, value, opacity, eye, minus), a checkbox row, a list row.
Section headers are 40 px, 11 px weight 550; an empty section is its header with a "+".

Figma's inspector sections translate like this:

| Figma section | Here | What it holds |
|---|---|---|
| Selection type row ("Frame", "Rectangle") | Header: kind word, editable name, state badge, header actions | who this is and what state it is in |
| Position / Layout (where it is, how it is arranged) | **Definition** | how the object is made: the tool, its inputs (clickable rows for linked objects), its parameters, its scope; Re-run |
| (none) | **Members** or **Values** or **Groups** | what the object contains: counts, statistics, a short list with "See all in table" |
| Fill / Stroke / Effects (appearance) | **Fill** | paint rows, one per channel the object writes, "+" to add a channel; each row is a `LayerSpec` channel |
| (none) | **Reading** | collapsed by default: the plain-language sentence, caveats, the run record (method, parameters, engine, time). Opened on request; never on screen unasked |
| Export | **Export** | export rows: format combo, scale or scope, Export button |
| Comments (a mode in Figma) | **Notes** | note rows, "+" |

The rows below are exact. A value in [square brackets] is a control; "|" separates the two
columns of a two-column row.

### 3.1 The Dataset (also what "nothing selected" shows)

Header: "Karate Club" (13/22 550, rename in place); actions: "Add data" (+), overflow (Close
dataset, Re-run all, Import options...).

| Section | Rows |
|---|---|
| Summary | the one-line reading in secondary text ("34 nodes joined by 78 edges in one connected part"); Nodes 34 \| Edges 78; Direction [Undirected v] "(from file)"; Density 0.139 \| Mean links 4.6; Parts 1 \| Self-loops 0 (drawn only when non-zero); Weighted No |
| Arrangement | Layout [Spread out v] with a gear (the engine options as a popover); Dimensions [2D \| 3D] segmented; a transport row: [Pause] [Step] [Re-run] and the text "Settling 62%" or "Settled"; Group by [Communities v] (only for layouts whose descriptor needs a partition); Root [pick a node] (only for tree layouts); Pinned 2 with "Unpin all" (only when non-zero) |
| Showing | Show [Everything v] where the list is every visible Set in the tree, then "34 of 34" (`session.status.counts.visibleNodes`); Time window [from] \| [to] with a "Play" that opens the time slider dock (only when a time role exists, #299, #333) |
| Canvas | Background [chit]; Labels [Top 6 by Connections v] (the label budget: none, all, top N by a measure in the tree); Legend [switch] (L); Default look: a locked mini paint row for node colour, node size and edge colour, the element's own base layers |
| Attributes | collapsed by default; one 32 px row per column: type glyph, name, completeness in secondary ("94%"), and on hover a "Use" (+) that creates a Measure or Partition from it; header "+" is "Join a table..." (#298) |
| Export | Image: [PNG v] [2x v] [Export] with a gear (transparent, legend in picture #292, size); Data: [GraphML v] [Whole graph v] [Export] (needs exporters in the element); "+" adds another export row, as Figma does |
| Notes | notes anchored to the dataset |

The Dataset inspector is the right panel's resting identity: it answers "what is loaded and how
is it arranged". In Figma the equivalent is the page: background colour, local styles, export.

### 3.2 A Set

Header: "Set" (secondary), name (rename), the state badge; actions: eye, lock, overflow (Select
members, Show only this, Duplicate, Delete).

| Section | Rows |
|---|---|
| Definition | one of: Rule: an expression field with autocompletion (#332, #335), or Attribute [conference v] \| Values [A, B]; or [degree v] Min [10] \| Max [any]. Neighbours: Of [Mr Hi] (a clickable element row) \| Within [2 v] steps, Direction [All v]. Path: From [Mr Hi] \| To [John A], Method [Shortest v], Weighted [switch]. Network: Method [Kruskal v]; Start [node] for Prim. Flow: Source \| Sink. Fixed: "12 nodes, 3 edges, fixed" and [Edit members]. Combination: [Group 1] [and v] [Path], each input a clickable row, the operation a select of and / or / not. Group: "Group 3 of Communities" as a clickable row (read-only). Always last: Within [Degree > 10] (the scope, read-only; a clickable row) and, when stale, [Re-run (about 2 s)] |
| Members | Nodes 12 \| Edges 18; Inside edges 18 \| Cut edges 7 (`session.selection.statistics` over the set); a list of up to 8 member rows (label, then one value in secondary: for a path its order, for a neighbourhood its depth), then "See all 12 in table"; header actions: Select (puts the members in the canvas selection), Show only (sets the Showing mask) |
| Fill | one paint row per channel written: [chit] [#E69F00] [100%] [eye] [minus]; "+" opens the channel list (Colour, Opacity, Size, Shape, Outline, Glow, Label, Edge colour, Edge width, Edge style, Arrows, Animation) and adds a row with a sensible default; when a visible object above covers this one, a secondary line "Covered by Influence on 12 of 12" |
| Reading | collapsed: the sentence ("The shortest route from Mr Hi to John A has 4 hops and costs 4.0."), caveats, the run record line ("Dijkstra, 34 nodes, 2 ms") |
| Export | Members [CSV v] [Export]; Image framed on members [PNG v] [Export] |
| Notes | rows and "+" |

### 3.3 A Measure

Header: "Measure", name, state badge; actions: eye, lock, overflow (Make a set from top N...,
Duplicate, Delete).

| Section | Rows |
|---|---|
| Definition | Method "Influence (PageRank)" with an info circle that opens the description as a tooltip; one row per option: Damping [0.85] \| Iterations [100], Tolerance [1e-6]; Weights [switch] \| Direction [As loaded v] (#313 for the ones that lack it); Exact [switch] (off = approximate above 2,000 nodes, the caveat says which); Within [Everything]; [Re-run (about 3 s)] when stale |
| Values | Min 0.01 \| Max 0.10; Mean 0.03 \| Median 0.02; a 208 x 40 histogram (`RunResult.histogram`), linear or log via a small toggle; Top [10 v] as rows: rank, label, value, click selects the node; a "+" on the section header "Make a set from these" creates a linked Set (`{top}` target); "See all in table" |
| Fill | Channel [Colour v] (Colour, Size, Opacity, Label, Edge width, Edge colour...); Scale [Even steps v] (the element's nine scales by their plain names); Palette [viridis] as a 156 px ramp swatch that opens the palette picker (sequential, diverging, categorical, colour-blind flags shown as a check); Domain [0.01] \| [0.10] with a "Reset" and a Reverse toggle; Missing [chit]; a legend strip preview; "+" adds a second channel (colour AND size) |
| Reading | collapsed: the sentence, caveats ("Did not converge in 100 iterations"), the run record |
| Export | Ranked list [CSV v] [Export] |
| Notes | |

A measure has no Members section: its members are the scope. HITS creates two Measures (Hubs,
Authorities); degree on a directed graph creates one with In and Out as extra fields selectable
in the Fill's channel source.

### 3.4 A Partition

Header: "Partition", name, state badge; actions: eye, lock, overflow (Sort groups by size, Name
groups from an attribute..., Delete).

| Section | Rows |
|---|---|
| Definition | Method "Communities (Louvain)"; Resolution [1.0] \| Seed [42]; Iterations [100]; Within [scope]; [Re-run] when stale. For an attribute partition: Attribute [conference] (read-only) |
| Groups | Groups 6 \| Modularity 0.36 (or Parts, Levels, Shells); Sizes "12, 9, 6, 4, 2, 1" in secondary text; Show the largest [8 v] and paint the rest as Other (the element's overflow policy); Names from [none v] (#191: an attribute whose dominant value names each group). The groups themselves are the tree children, not repeated here |
| Fill | Channel [Colour v]; Palette [Okabe-Ito] shown as chips, one per group, in group order; Other [chit]; "+" for a second channel |
| Reading | the sentence ("6 groups. The groups are clearly separated (modularity 0.36).") and caveats |
| Export | Membership [CSV v] [Export] |
| Notes | |

### 3.5 A Group

Header: "Group", name (rename; the name survives a re-run by overlap matching), state; actions:
eye, lock (no delete).

| Section | Rows |
|---|---|
| Definition | Of [Communities] (clickable), Label 3, "12 nodes, 24% of the scope" |
| Members | as a Set's Members |
| Fill | one row "Inherited [chit] from Communities" with an "Override" (+) that adds the Group's own paint row above it; the override is the child layer that beats the parent |
| Reading | collapsed: the group profile when the element has it (#193): "Mostly conference A (83%)" |
| Export, Notes | as a Set |

### 3.6 A Note

Header: "Note"; actions: delete.

| Section | Rows |
|---|---|
| Anchor | On [Mr Hi] (a clickable row: an element, a point, or an object); [Re-anchor] |
| Text | a 56 px textarea, Ctrl+Enter saves (Figma's comment composer); author and date in secondary text |
| Tags | a token field |
| Fill | Marker [icon v] \| [chit] |

### 3.7 An element: one node (canvas click)

An element is not an object, so its inspector is a report about it plus the doors to the objects
that own it. It has no paint rows of its own.

Header: "Node", the label (13/22 550), actions: Locate (frame the camera on it), Pin toggle,
overflow (Copy id, Copy as JSON, Expand from server when `fetchNodes` is configured).

| Section | Rows |
|---|---|
| Attributes | key: value rows, up to 10 then "Show all 23"; a filter field appears above 10 |
| Values | one row per Measure and Partition in the tree that covers this node: "Influence 0.09 (rank 3)", "Communities Group 3"; the name is a clickable row to the object |
| Member of | one row per Set containing this node, in tree order, each clickable; empty reads "In no set" |
| Neighbours | Neighbours 17 (In 9 \| Out 8 on directed data); up to 8 rows "label, edge label"; "See all in table"; header actions: Select (puts them in the selection), Neighbours tool (E) prefilled with this node |
| Look | "Explain" rows from `session.styles.explain`: Colour from Communities [chit]; Size from Influence; each clickable to the object. Then one action row: "Colour this node..." which creates a fixed Set named after the node with one colour paint row and opens the picker. That is the three-click colour change (click node, click Colour, pick), and the colour is still a style layer on an object |
| Notes | notes anchored here, "+" |

### 3.8 Several elements (marquee, Shift+click, Select members)

Header: "12 nodes, 3 edges"; actions: overflow (Copy ids).

| Section | Rows |
|---|---|
| Make a set | one primary-looking but secondary-styled row "Make a set (Ctrl+G)"; this is the main verb of a multi-selection, so it is first |
| Statistics | Nodes 12 \| Edges 3; Inside edges 3 \| Cut edges 21; per numeric attribute: mean against the whole graph (from `session.selection.statistics`) |
| Values | per Measure: min to max, and Mixed for partitions |
| Member of | objects containing ALL of them, then in secondary text "and 3 more contain some" |
| Look | "Colour these..." creates a fixed Set as in 3.7 |

### 3.9 Several objects (tree multi-select with Shift or Ctrl)

Header: "3 objects".

| Section | Rows |
|---|---|
| Combine | four joined 24 px icon buttons in Figma's boolean-operation slot: Union, Intersect, Subtract (top minus the rest), Exclude; each creates a linked combination Set at the top of the common scope; disabled with a reason when a Measure is in the selection ("Combine needs sets") |
| Fill | shared paint rows or "Mixed" (Figma's word), editable for all at once |
| Actions | Hide all, Lock all, Delete (with the count) |

### 3.10 A View

Selecting a View row applies it (camera, mode, showing) and shows a small inspector: Camera
"Update to current"; Mode [2D \| 3D \| VR \| AR]; Showing [Everything v]; Compare with [View v]
(opens the second canvas, section 6.4).

## 4. Selection

There are two selections, and the inspector shows whichever changed last:

- **Object selection**: tree rows. One or more objects.
- **Element selection**: nodes and edges, the element's own `session.selection`, shared with the
  canvas, the data table, a headset and the assistant.

They are linked the way Figma links a layer row and its shape: clicking a Set row puts its
members in the element selection (gold halo on the canvas), and clicking a node that belongs to
one Set highlights that Set's row (the "child of a selected parent" fill) without selecting it.

| Action | Result |
|---|---|
| Click a node on the canvas | element selection = that node; the inspector shows the node (3.7); every tree row containing it takes the secondary highlight |
| Shift+click a node | toggles it in the element selection (Figma's Shift+click); the inspector shows the multi-selection (3.8) |
| Drag on empty canvas (Select tool) | marquee: nodes inside the rectangle preview as selected live, release keeps them; Shift extends, Alt subtracts |
| Click an edge | selects the edge when edges become pickable (#319); until then edges are reached from a node's Neighbours rows and from the table |
| Click a Set or Group row | object selection = that object; element selection = its members (capped at 5,000 with a "showing 5,000 of 12,000" note from `selection.truncated`); the inspector shows the object |
| Click a Measure, Partition, Note, Dataset row | object selection only; the element selection is cleared; the inspector shows the object |
| Shift+click rows | range; Ctrl+click toggles one; the inspector shows 3.9 |
| Hover a row | its members get the hover outline on the canvas (`LayerSource` reason "hover", the element-owned hover layer); hover a node and its rows get the hover fill: the two-way hover link |
| Double-click a node | drills: selects its neighbours at depth 1 (the graph's version of "enter the group"); Shift+Enter selects the top-most Set containing it, Enter again selects only the node |
| Tab / Shift+Tab on the canvas | next / previous member of the current object's members in rank or order (Figma walks siblings); with no object selected, next node by degree |
| Escape | one rung per press: cancel a pick in progress, close the top overlay, clear the element selection, clear the object selection (the inspector returns to the Dataset) |
| Ctrl+A | select every shown node; Ctrl+Shift+A selects the induced edges too (`{edgesBetween}`) |
| Ctrl+I | invert the element selection (`{invert}`) |
| Ctrl+G | make a Set from the element selection (`session.selection.promote`), at the top of the current scope, named "Selection 3", renaming focused |
| Ctrl+Shift+H, Ctrl+Shift+L | hide / lock the selected objects (Figma's chords) |
| Right-click a node | a dark context menu of the element's verbs only: Select neighbours, Path from here / to here, Note, Pin, Colour this node..., Copy id, Expand from server |

Rule-based and relational selection are not separate modes; they are the tools' flyouts used
with a modifier, or verbs on the inspector, and every one of them can be promoted to a Set:

- **By rule**: the Filter tool's popover has "Select" beside "Create": Select makes it a
  transient element selection instead of a Set (`{where}`, `{above}`, `{scope}` targets).
- **By relation**: from a node, "Select neighbours" (E with Shift), "Connected part", "Same
  group" (the Group row's Select); from a Measure, "Select top N" (`{top}`).
- **By text**: the palette's "@" prefix searches nodes by label (Figma's Find: type, ArrowDown
  highlights, Enter selects and zooms). Needs the element's text search (#149).

Modifier grammar, kept identical everywhere: plain replaces, Shift adds, Alt subtracts, Ctrl
toggles, which are the element's `replace`, `add`, `remove`, `toggle` operations. Intersect
lives only in Combine, where its inputs are named.

Locked objects: their members are skipped by canvas clicks and marquee, as a locked Figma layer
is, so a reader can lock a big background set and click through it.

## 5. Nothing selected

The inspector shows the Dataset (section 3.1). The tree shows the Dataset row in the "current
page" style (grey fill, weight 550, no blue). Nothing floats on the canvas but the toolbar, the
legend when switched on, and the minimap when switched on. No suggestion cards, no automatic
degree run, no automatic panel switch: after a load, the tree holds one row and the inspector
says what was loaded and how it is arranged. The help that the current app puts in four cards
moves to two places: an "Ideas" row at the bottom of the Dataset Summary ("Try: Find groups,
Rank by connections"), one line, dismissable; and the palette, which lists the same tools.

The empty state (no dataset) is the current Welcome sheet, unchanged in intent: one heading, one
drop zone, the samples. The tree and inspector are empty panels with the file verbs in the tree
header ("Open file", "Paste", "From URL").

## 6. Where the rest lives

| Thing | Where | Why there |
|---|---|---|
| Data table | a bottom dock (Shift+T), Figma's keyboard-shortcuts-panel slot: Nodes / Edges tabs; one column per attribute plus one per Measure and Partition in the tree, in tree order; row selection is the element selection; a "Showing [object v]" filter at the left of its header; a column header menu with Sort, Hide, and "Use as measure / partition" (creates the tree object) | the table is the raw material at full resolution: Figma's Dev Mode / Variables table is the same idea, a secondary view of the same objects |
| Import | the Welcome sheet before a load; after, "Add data" (+) on the Dataset header and the File menu; one dialog with File / URL / Paste tabs, a format select, and the field mapping (id, source, target, label, weight, time, type) shown ONLY when detection is unsure, with "Replace" or "Add to current" | the one guided flow that earns a dialog, because the decisions (which column is what) must be made before anything exists |
| Join a table by key | Dataset > Attributes header "+" | it adds columns, and columns live in Attributes |
| Layout process controls | Dataset > Arrangement (the transport row) and a status-bar chip that mirrors it ("Spread out, settling 62%" with pause) | there is one layout in force; it is a property of the data's arrangement, not an object; the chip keeps it reachable while any object is selected. Needs the element's transport (#144) |
| Pinning | the node inspector's Pin toggle and drag-to-pin; the "Pinned" system Set appears in the tree while non-empty so pins can be seen, selected, and unpinned together | pins are a set of nodes with a state; showing them as a set costs one row only when it matters |
| Camera, 2D / 3D | the toolbar's right end: the [2D \| 3D \| VR \| AR] segmented control in Figma's mode-switch slot; zoom in / out / fit / to selection and the framing presets (Fit, Top, Front, Side, Isometric) in a Views menu on the toolbar and as bindings (0, F, 7, 1, 3); the zoom readout in the status bar | Figma keeps view controls off the panels; 3D is a view mode, not an object |
| Saved views | the Views list above the tree (Figma's Pages slot); "+" saves the current camera, mode and Showing; click applies | a view is "where I stand and what I look at"; Pages are the same kind of thing for a file |
| XR | VR and AR are the last two segments of the mode switch, present only when the browser reports support; entering hides the panels (Figma's Minimize UI); the element's own in-headset UI takes over | a mode, not a panel |
| Compare | a View's "Compare with [View v]": two canvases side by side on one tree and one selection, each with its own camera and Showing mask; the second canvas is the element's second view of one session (`session/types.ts` header; #186) | comparison is two views of the same objects, not a second copy of the objects |
| AI assistant | the command palette (Ctrl+K) accepts a sentence when the query does not match a command; the transcript opens as a bottom dock beside the table's tab ("Assistant"); provider setup in Settings; every action the assistant takes creates or edits tree objects through the same commands the tools use (#337), so its work is visible and undoable like the reader's own | Figma's Actions box is where "type what you want" lives; a rail panel would make the assistant a mode |
| Export | the Export section of the Dataset (image, data), a Set (members, framed image), a Measure (ranked list), a Partition (membership); the File menu's "Export..." focuses the Dataset's section; the report (#187) is a File menu item that assembles the tree's Readings | Figma's model: export settings sit on the thing being exported |
| Notes | the Note tool (N), the Notes section on every object, Note rows in the tree; markers on the canvas via `node.marker` (#295); "Show notes" is an eye on the notes as a class in the Views menu | a note is about a thing, so it lives with the thing; the tree row makes it findable |
| Legend | a canvas overlay (L), drawn from `session.styles.legend()`; one block per visible Measure or Partition in precedence order; clicking a swatch selects that Group's row | the legend is a picture of the tree's Fills; it needs no home of its own |
| Minimap | a canvas overlay (M) once the element publishes positions and a settle event (#293) | navigation aid, not an object |
| Settings, Help, shortcuts | the File menu (Figma's main menu under the logo): Settings..., Keyboard shortcuts (docks at the bottom like Figma's), Documentation, Send feedback | not everyday surfaces; no rail icon |
| Undo history | Ctrl+Z / Ctrl+Shift+Z with no popover; the journal (#145) later feeds a History dock | Figma gives undo no UI |
| Time | Dataset > Showing > Time window, and a slider dock (T) when a time role exists; playback re-runs stale objects per step only when asked (#300) | time is a mask on what is showing, so it lives with Showing |
| Sample datasets | the Welcome sheet and File > Open sample | data in, not an object |
| Progress and cancel of loads | the Dataset row in the computing state, like any object (#296 for cancel) | the dataset is an object with a state too |
| The activity rail | gone. Two panels, one toolbar, one status bar, one menu | every activity became either an object kind (a tree row) or a section of one |

The status bar stays, slim, because live objects need somewhere to be seen while the reader
looks at something else: counts and Showing ("34 nodes, 78 edges, showing 12"), the arrangement
chip with its transport, a "Computing Bridges 42% [Cancel]" chip while anything computes, the
selection count, and the zoom readout.

## 7. The five hardest fits

### 7.1 Overlap: one element in many objects, one channel per element

The problem: Figma's precedence is spatial (the front shape hides the back one); ours is per
channel per element, and a measure covers everything, so one measure at the top erases every
set's colour. The reader sees a picture that disagrees with the chips in the tree.

Resolution: the per-channel rule of section 1.6, made visible in three places. The Fill section
of a covered object says "Covered by X on N of M members" (from `session.styles.explain`, run
over the object's members by the element; a count, not a per-node list). The node inspector's
Look section names which object won each channel. And the default Fill for a new object avoids
channels already written above it in the tree (the element's `suggestEncodings` gets the
visible stack as an input and prefers Size when Colour is taken). What stays awkward: readers
who expect "top wins everywhere" will be surprised that Communities still shows under Path
except on the path. The Fill section's "Paints 5 of 34 nodes" line is the honest answer.

### 7.2 Creation takes time, and sometimes should not start

The problem: drawing a rectangle is instant; betweenness on 50,000 nodes is four minutes, and
starting it because a reader clicked a flyout item is hostile. Figma has no gate.

Resolution: the row is created immediately, always, so the tool feels like drawing. Its state is
what varies: under the gate it is computing with progress and Cancel in the row; over the gate
it is waiting, with the estimate in the row ("not run, about 4 min") and Run and Approximate in
the inspector. The secondary bar prints the estimate before the click for the same reason a
Figma tooltip prints the shortcut: no surprises. A waiting row is harmless to leave, and delete
is one key. The cost gate is the element's (`session.estimate`, `gateRun`); the app only reads
the verdict. What stays awkward: a waiting object has no members, so its Fill and Members
sections are empty headers until it runs.

### 7.3 Objects are live: staleness, re-runs and group identity

The problem: a Figma layer never changes under you. Here a filter re-evaluates when data is
added, a partition re-run with a new resolution produces different groups, and a reader's
renamed, coloured, annotated "Group 3" may no longer exist.

Resolution: the state model (1.4) with downward propagation, the cost-based rule for
immediate re-run versus stale, and overlap matching of Groups on re-run so a group keeps its
name, notes and Fill override when most of its members are still together (the element's job,
alongside group names #191; until it exists, Groups are matched by label and a vanished label
freezes). Fixed sets survive a reload only for ids that still exist and say so ("12 of 14
members present"). What stays awkward: a reader who re-runs a partition after annotating its
groups may still lose an annotation when a group splits in half; the frozen row keeps the note
visible so nothing is silently lost.

### 7.4 Two meanings of hiding: an object's Fill versus what is showing

The problem: the eye on a Figma layer hides the layer. Here a reader also wants "show me ONLY
Degree > 10" (a visibility filter over the graph), which is not hiding an object but hiding
everything outside one. Conflating them in the eye toggle would make the eye on a filter mean
the opposite of the eye on a path.

Resolution: the eye always means "this object stops painting" and nothing else. "Show only
this" is a separate verb on any Set (its header overflow, and the Showing select in the Dataset
inspector), and it sets the one Showing mask the element has (`visibility.set`). The mask is
visible in three places: the Dataset's Showing row, the status bar ("showing 12 of 34"), and the
Set row that is the mask carries a small "showing" glyph. One mask at a time, because the element
has one; to show the union of two sets, Combine them first. What stays awkward: a reader may
expect hiding a filter set to restore the graph; the tooltip on the eye ("Hide this set's
colour; to show everything again, set Showing to Everything") is the mitigation.

### 7.5 The tree must be a thing the element owns

The problem: the tree is nesting, order, names, states, Fill overrides and links between
objects. Today the element has runs, saved scopes, layers and the selection, each with its own
list and no order across them. If the app keeps the tree in its own state, a third-party consumer
of graphty-element gets none of it, and the project file (#301) cannot save it, which breaks the
root architectural rule (the app is only HTML around the element).

Resolution: an objects API on the session: `session.objects.list()` returning the tree (id,
kind, name, parent, order, definition, state, members count, layer ids, links), `create` from
a tool spec, `move`, `rename`, `setVisible`, `setLocked`, `rerun`, `remove`, and an
`objects:changed` event, built over the existing runs, scopes and layers so nothing is
duplicated: a Set is a saved scope plus a highlight layer; a Measure is a run plus an encoding
layer; a Group is a scope referencing its run's field. The tree order is the layer order, kept
by the element. Until that exists, the app cannot build this model without owning graph state,
which is the thing it must never do. This is the one true one-way door in the proposal: the
shape of the tree in a saved file.

## 8. Where every capability lands

A check that nothing the element does, or is proposed to do, is left without a home. Grouped by
the inventory's sections.

| Capability (inventory section) | Home in this model |
|---|---|
| Inline, URL, file, named-source, sample loads; formats; field mapping; direction; repeated edges; id coercion (1) | Dataset: Add data, the import dialog, Import options |
| Import report, statistics, attribute catalogue, fingerprint (1) | Dataset: Summary, Attributes |
| Incremental add / remove / update; update attributes (1, #297) | Dataset: Add data; the table's cell editing later; every object goes stale |
| Neighbourhood expansion from a server (1) | node inspector overflow "Expand from server" and the context menu |
| Node type role, time role (1, #299, #333) | Dataset: Attributes (role badges), Showing (time window) |
| Join a table (1, #298), computed attributes (1), node merging (1) | Attributes "+"; Attributes "New from formula" creating a Measure; merging is a multi-element action "Merge" (3.8) when the element has it |
| Data export, project file (1, #301) | Dataset: Export; File > Save |
| Large-graph limits, progressive loading (1) | Dataset computing state; the gate |
| Click, multi, set operations, by ids, neighbours, scope, top, above, edges between, invert, expression, text (2) | section 4 |
| Promote a selection (2) | Ctrl+G |
| Selection statistics (2) | Members / Statistics sections |
| Saved scopes (2) | they ARE Sets |
| Filters of every kind, combinators, time window (2) | Filter tool; Combine; Showing |
| Visibility summary, hover, pick, pattern search (2) | status bar; the hover layer; the context menu; Filter > Pattern |
| Every shipped algorithm (3.1) | Groups, Rank and Path flyouts, by result shape: partitions to Groups, measures to Rank, sets and paths to Path (matching, max flow and min cut under Path because they take a pair) |
| Proposed algorithms (3.2): clustering, all paths, k-core, link prediction, articulation points, removal impact, anomaly, temporal, profiling, group names, parameter sweep | Rank / Path / Groups flyouts as they ship; link prediction and removal impact are pair-list and fact results, shown in the inspector of the object they were run on (the Dataset or a Set) under a "Findings" section; a parameter sweep is several Measures created at once |
| Runs: start, batch, watch, cancel, re-run, queue, estimate, plan, gate, caveats, stale, engine, record, list, results, readings, path and term, availability, options for a form, results as attributes, suggested styles (3.3) | the object's Definition, state, Reading; the table's columns; the Fill |
| Layouts and their control, pinning, dragging, transport, layout over a scope, positions, GPU (4) | Dataset > Arrangement; the status chip; Pinned set; "Arrange only this" on a Set's overflow when #144 lands |
| Styles: layers, selectors, encode, highlight, scales, palettes, overflow, legend, explain, resolve to static, templates, layer groups, theme, presets (5) | Fill sections; the legend overlay; Look section; a Fill can be copied and pasted between objects (Figma's copy properties); templates become File > Apply look... |
| Channels (5.1) and labels (6) | Fill channel list; the Dataset's Labels row for the budget |
| View modes, cameras, presets, fit, focus, follow, linked cameras, minimap, background (7) | the mode switch; Views menu; Views list; Compare; overlays; Dataset > Canvas |
| XR (8) | the mode switch; the element's in-headset UI |
| AI assistant (9) | the palette and the Assistant dock |
| Events, session, commands, journal, recipes, notes, undo, batch, config document, logging, errors, extensions (10) | the app's undo stack; History dock later; a recipe is "Save the tree as a recipe" in the File menu; notes are Notes |
| Screenshot, video, legend in picture, SVG and PDF, report, evidence bundle, result export, data export (11) | Export sections; File > Report...; video is an Export row of a View |

## 9. What the element must grow for this model

Only the gaps this model depends on; each exists as an issue unless marked new.

| Need | Issue |
|---|---|
| An objects API and tree order owned by the session (7.5) | new; builds on #337 (commands) and #301 (project file) |
| Query engine for expressions and text search | #149 |
| Layout transport, layout over a scope, positions verbs | #144 |
| Notes and the journal | #145 |
| Group names and overlap matching on re-run | #191 |
| Filters over result fields (group size) | #192 |
| Suggested encodings that avoid channels already written above (7.1) | new |
| Coverage counts from `explain` over a set (7.1) | new |
| Hover highlight of an object's members as an element-owned layer | designloom `hover-highlight`; `LayerSource` reason "hover" is reserved |
| Edge picking and a context-menu event | #319 |
| Legend drawn in captures; minimap positions and settle | #292, #293 |
| Data exporters | section 1 of the inventory (every descriptor `canExport: false`) |
| Node marker channel for notes | #295 |
| Time role and time attributes | #299, #333 |
| Cancellable loads with progress | #296 |
