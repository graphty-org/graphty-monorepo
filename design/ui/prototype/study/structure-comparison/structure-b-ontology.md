# Structure B: groups and styles on the left, one ordered list

The owner's structure (run from the toolbar or an Algorithms rail section; groups and paths land
atop an ordered list on the left; click a row to style it on the right; drag to reorder paint),
checked against graphty's object model, with a rule for each known weak point.

## The core idea, and the one correction it needs

The owner's "graph groups" list is the **style stack**: every row is one style layer (a selector
plus encodings), and list order is paint order, top winning. The correction: rows are not all
groups. A row is headed by **what it paints**:

| Row kind | Heads the row | Example |
|---|---|---|
| Set or path row | a kept set or path, or an offered group or found path | "Suspects", "Path A to B" |
| Partition row | a run's grouping, painted by one colour-by-category layer; its groups are children | "Louvain: 14 groups" |
| Encoding row | a measure bound to a channel over the elements that have it | "PageRank: colour, 1,204 nodes" |
| Rule row | an inline rule | "type is Person" |

So the list is titled **Groups and styles**: a PageRank ramp is not a group. **Overrides** (hand edits) is pinned at the top and
**Base style** at the bottom; neither drags.

## The places

- **Rail**: Groups and styles (default), Algorithms, Graph (graphs, data sources, saved views),
  Notes, Assistant.
- **Left panel**: the open rail section.
- **Right panel**: the inspector, a function of the last thing clicked. A row, a node, an edge or
  a set each has its own kind. Nothing selected shows the **graph overview**: counts, Statistics,
  and graph-wide results (diameter, transitivity) each linking to its result.
- **Toolbar**: Run algorithm (the same catalog as the rail section), selection tools, Find, the
  filter chip, Layout, Compare with..., Add note.
- **Table dock**, bottom: rows of nodes, edges or a run's items; opened by "Show in table" from any
  row or inspector, pre-narrowed to that row's elements.
- **Canvas**: the drawing, one legend, the "not drawn" line with the hidden count.

## Where every result lives: one home per object

The owner put results that add no group on the Algorithms tab. The ontology needs **every result
on the Algorithms tab**, Louvain's included: a result and the style it paints are two objects, each
with one home, linked both ways. Otherwise finding a result requires knowing its kind first.

## The seven rules

**1. Continuous encodings get rows in the same list.** "Colour by PageRank" adds an encoding row
whose selector is "has a PageRank value", so it paints only that result's elements and anything
without a value shows the layers beneath.

**2. The tree means provenance, never membership.** Only three things nest: a partition row's
groups (disjoint by construction, one paint slot); a hierarchical partition's levels (one level
painted at a time, chosen on the row); and analyst folders. Nesting a row never claims its members
are a subset of the parent's. Paint order is the tree flattened depth first: a folder occupies one
slot, its children paint in their own order inside it. So tree and paint order cannot
disagree, and any overlap is settled as always: the higher row wins each channel both write. A cover (overlapping communities) paints hulls, not fills, so its groups
never fight each other.

**3. A run's outputs stay together.** Louvain's groups are the partition row's children; its
modularity and group count are on that row's inspector, under a "From Louvain" header that opens
the result. No output of a
run appears anywhere that does not link back to its result.

**4. Measures never paint by themselves.** A run that produces groups or paths adds its row on top
(directly below Overrides), because its groups are its result and it paints only them. A run that
produces a measure (PageRank, betweenness) adds **no row**: its values appear in the table, the
node inspector and the Algorithms tab, and the finish notice offers "Colour by" and "Size by". When a new partition covers an older one's fill, the older
row stays enabled and reads "Covered by Leiden: fill"; nothing is switched off as a side effect.

**5. Hundreds of groups are one row.** A partition is one layer, so 300 groups are one row, not
300. Expanded, it lists groups by size, virtualized; the palette's distinct colours go to the
largest groups and the rest share one "Other groups (288)" swatch, which is still this run's own
result. A group becomes a row of its own only by **Style separately** or **Keep as set**, and then
moves above its partition row so its paint wins.

**6. Inspecting a group, not only styling it.** Clicking any set, group or path row opens, in this
order: a header (name, member count, where it came from, Keep as set for an offered group);
**Style** (fill, shape, size, edge colour and width, the owner's controls); **About** (Statistics
over the group, item attributes such as a group's name, Show in table, Select members, Use as
scope, Compare with...). Encoding rows show the scale and a histogram instead of About.

**7. Filtering, hiding, selecting and notes stay out of the paint list.** Among paint rows, their
order would read as paint order:

- **Filter steps** change what is computed, so they live in the toolbar's filter chip and its
  popover, their own ordered list. A row's menu offers "Filter to these".
- **Hiding** is per-element drawing state, not paint: "Hide on canvas" in a row's menu or the
  canvas menu, counted on the "not drawn" line. A row's toggle is a **Paint** checkbox, never an
  eye, because an eye would promise that switching it off hides the members; it only removes the
  row's colours.
- **Selection**: clicking a row selects the row, not its members, and outlines its members while
  hovered; "Select members" is explicit. Canvas selection opens the node or edge inspector.
- **Notes** live in the Notes section; a note about a group attaches to that group, and the row
  shows a note count that opens it.

## How each task runs

- **Running**: the option form, then the result tops the Algorithms list and, for groups or paths,
  Groups and styles. **Reading**: Algorithms, the table, the node inspector.
- **Reordering**: drag rows or folders; a partition's children do not drag (they share one slot)
  and are sorted from a menu.
- **Keeping**: groups and found paths from a run are offered until Keep as set; replacing the run
  replaces offered rows and says so. Kept sets without a style still appear, unpainted, so every
  kept set is on this one list.

## Where this departs from the owner

The list holds encodings and rules, so it is Groups and styles; nesting is never membership; every
result is on Algorithms; measures add no row until asked; a partition is one row; the toggle is
Paint, not an eye. Each reason is in its rule above.
