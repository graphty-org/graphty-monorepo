# The groups-list structure, specified for interaction

The owner's proposed structure for graphty: running an algorithm adds rows to an ordered **groups
list** on the left, clicking a row opens an inspector on the right, dragging rows changes which
paint wins.

## The one idea that makes it work

**The groups list is the style stack, labelled by what each row paints.** Every row is one style
layer plus the thing it selects: a kept set, a path, a run's group, a rule ("Type is Protein"), or
"every node with a value" for a continuous encoding. Top wins. This keeps the owner's intent and the
model's rule that appearance is applied only through style layers.

## Regions

- **Rail**: main menu, **Groups** (default), **Algorithms**, **Notes**, **Views**, Assistant.
- **Left panel, Groups**: a graph switcher in the header, then the groups list. Overrides (hand
  edits) is pinned as the top row once used; Base style is pinned as the bottom row. Neither drags.
- **Left panel, Algorithms**: the catalog (search, families), then **Results**: every result on
  this graph, newest first. A result that paints nothing (a measure not yet encoded, a search
  with no path) is read here only.
- **Right panel, the inspector**: one kind per selection. Nothing selected shows the graph overview:
  counts, Statistics, graph-level readings (density, diameter once run), notes about the graph.
- **Toolbar**: Run algorithm (the catalog as a popover), selection tools, the **filter chip**, Hide, Create set, layout, 2D/3D.
- **Table dock**: Nodes, Edges, and one item tab per opened result ("Communities: Louvain").

## Where every result lands (weaknesses 3 and 4)

| Run output | Row in the groups list | Other values |
|---|---|---|
| Partition (Louvain, components) | one parent row named by the algorithm, its groups as children, colour palette on | modularity, group count: in the parent row's inspector |
| Found path or paths | one parent row, each path a child, highlight on | lengths: in each child's inspector |
| Measure (PageRank, degree) | **none on run** | in Algorithms > Results, and in each node's inspector |
| Graph statistic | none | graph overview inspector |

**Rule 3: one run, one home.** A run's outputs never split: the parent row's inspector shows the
result's readings (modularity), its run record and its style together. Its Algorithms > Results row
opens the same inspector.

**Rule 4: measures do not auto-paint.** A measure writes every node, so five auto-made ramps would
fight over fill. It creates no row; its inspector offers **Colour by**, **Size by** and **Label
by**, each adding one encoding row on top.

**Re-running replaces, never duplicates.** Re-running Louvain updates its existing row in place;
**Run as new result** is the only way to get a second Louvain row.

**A second partition** lands on top and wins fill. The covered row stays enabled and reads
"Covered by Leiden: fill"; a drag or its eye settles it.
A run row paints only elements carrying its result; a path row never greys the rest.

## Rows that are not groups (weakness 1)

A continuous encoding is a row whose selector is "nodes with a PageRank value", titled
"PageRank -> size". It has no children; its inspector holds the scale, range and legend. Nodes
without a value are not selected, so rows beneath show through. It drags like any row.

## Nesting and precedence (weakness 2)

A parent row is **where rows were filed**, never a claim about membership. Parents come from a run
(its groups), a hierarchical result (level 1 groups under their level 0 group), or an analyst
**folder** (select rows, Ctrl+G). An element may sit in many rows.

**Rule 2: paint order is the tree read top to bottom, depth first.** For each element and channel,
the first enabled row in that order that selects the element and writes the channel wins. A
child's own edit (Community 3 set to red) is read before its parent's palette, because the parent
row's palette counts as sitting below its last child. Higher on screen always wins.

**A child cannot leave its parent by drag**, because a run's group belongs to its run. Dragging it
outside snaps back with the hint "Keep as set to move this group on its own". **Keep as set** (the
model's Create set) makes a kept set row placed directly above the parent, freely movable.

A node's inspector names the winning row per channel (**Painted by**) and every row selecting it.

## Hundreds of groups (weakness 5)

A parent row starts collapsed. Expanded, it shows its largest groups up to the palette's
distinguishable colours (about ten), then one child row, **"327 smaller groups"**, painted one
shared colour; clicking it opens the item tab sorted by size, where Keep as set brings any group
into the list. The list stays scannable; the table holds the rest.

## Inspecting a group (weakness 6)

Clicking a group row **selects the group** (a primary object, so the canvas marks its members) and
the inspector shows, in order: header (name, run, member count), **Style** (node fill, shape, size;
edge colour, width; an edit writes the row, never the mesh), **Members** (by degree, "N more" opens
the table), **Statistics** of the group as a scope (density, internal and boundary edges),
**Notes**, and the actions **Compare with...**, **Filter to**, **Keep as set**. A parent row's
inspector shows the result: readings, the run record, options with Re-run, and the palette.

## Filtering, hiding, selecting, noting (weakness 7)

- **Filter steps stay on the filter chip**: their order is evaluation order, the list's is paint
  order, and one list with two meanings of "above" would be misread. A row's menu
  offers Filter to and Filter out, which add a step to the chip.
- **The row's eye toggles its paint**, as Figma's eye hides a layer. **Hide members on canvas** is a
  separate row-menu verb; hidden elements are counted on the canvas's not-drawn line and stay in
  every count and run.
- **Selection**: click a row selects that group; Shift-click extends a range of rows and
  Ctrl-click toggles rows, both selecting the union of members as elements. Esc clears.
- **Notes**: Add note on a row targets that group and marks the row; the Notes section lists all.

## Keyboard and drag

| Input | Effect |
|---|---|
| Up, Down | move row focus |
| Right, Left | expand, collapse; Left on a child goes to its parent |
| Enter | select the row and open its inspector |
| Space | toggle paint |
| Alt+Up, Alt+Down | move the row one place among its siblings |
| Ctrl+G, Ctrl+Shift+G | put selected rows in a folder; ungroup |
| F2 | rename |
| Delete | a kept set: delete it and its paint; a run row: remove its paint only, the result stays in Algorithms |

Drag shows an insertion line between siblings; dropping onto a folder files the row at its top.
Every drop is one undo step.

## Where this departs from the proposal

Measures add no row on run; a child stays with its run until kept; the right panel is a full
inspector with a Style section; filter steps keep their own list; the eye means paint, not hiding.
