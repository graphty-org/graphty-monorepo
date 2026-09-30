# The owner's structure, specified by the information architect

The owner proposes one ordered list on the left holding every group, set and path, with a style
inspector on the right. This page states that structure as a whole app: every place, where every
object and result lives, and how each task is done. Where the ontology forces a change, the
change and its reason are stated beside it.

## The places

**Rail**: Main menu, Graph, Algorithms, Notes, Assistant. It opens on Graph.

**Graph panel** (left), under a header holding the project name and the **filter chip** ("Full
graph"), which opens the filter steps:

1. **Graphs** -- the project's graphs in hand order. Unchanged.
2. **Styles** -- the owner's "graph groups" list, and the main change: the earlier separate
   "Sets and paths" list is merged into the style stack. One ordered list whose rows are sets,
   paths, a run's groups, whole-graph encodings, a Hidden row, and Base style fixed at the bottom.
   A higher row wins. The label stays "Styles", not "Groups", because many rows are not groups;
   each row is named by what it paints ("Louvain: community 4", "PageRank: size", "Watchlist").
3. **Views** -- saved views in report order, collapsed by default. Unchanged.

**Algorithms panel**: **Runs in this project** (every run, painting or not, newest first, reruns
folded beneath), then the catalog by family with a search field.

**Right panel**: one inspector chosen by the selection: nothing (the graph overview), a node, an
edge, several elements, one Styles row, several rows, or a run.

**Toolbar**: Select (Lasso, Hand), Path, **Run** (a searchable algorithm picker, then the options
bar), Quick actions, view mode.

**Table dock**: Nodes, Edges, and the item tab of the open run ("Communities: Louvain"). Canvas,
table and inspector share one selection.

## Where everything lives

| Thing | Read in | Routes to it |
|---|---|---|
| A run: options, direction and weight, modularity, top items | the run inspector | its entry under Runs; its parent row in Styles |
| A group or found path | its Styles row | the item tab; a node's Memberships |
| A kept set or path | its Styles row | Find; a node's Memberships |
| One node's value (its PageRank) | the node inspector, the table column | the run's top nodes |
| A number about the whole graph (density) | the overview's Statistics | its entry under Runs |
| A style | the Style section of its row's inspector | the canvas legend |
| Filter steps | the filter chip | Filter to on a selection or column |
| Hidden elements | the Hidden row | the canvas's not-drawn line |
| Notes | the Notes panel | a badge on the target's row and inspector |

## The weaknesses, resolved

**1. Colour or size by a value across all nodes.** An encoding is a row in the same list, drawn
with a ramp swatch ("PageRank: size"). Like every row, it wins over the rows below it on the
channel it paints and on nothing else, and paints only nodes that carry the value.

**2. Overlap versus a tree.** The tree records where a row came from, never who its members are:
a row sits under its run, a loaded set collection, a folder the analyst made, or a parent group
when the algorithm itself produced a hierarchy. Paint order has one rule: **a row wins over every
row below it and over its own parent.** A parent's own style paints beneath its children, as a
Figma frame's fill sits beneath its contents. A folder's children are always adjacent, so dragging
a folder moves its whole block, and tree position and paint order cannot disagree. A node in two
groups takes each channel from the higher row, and the lower row's inspector says so ("9 of 40
members show Watchlist's colour").

**3. One run's outputs stay together.** A run that paints gets one parent row in Styles, its
groups as children. The parent row and the run's entry under Runs open the same run inspector,
where modularity, options and Rerun are read; that inspector is the run's one home. This corrects
the proposal, where painting and non-painting results had different homes and an analyst had to
know which kind PageRank was to find it.

**4. Many measures, no clutter.** A run adds Styles rows only when it produces groups or paths
(a partition, components, a found path): those are its own results, so painting them breaks no
other style. A per-node measure (PageRank, betweenness) adds nothing; its run inspector offers
**Colour by** and **Size by**, each adding one encoding row at the top. Five centrality runs make
five Runs entries and no Styles rows. When two rows paint one channel on the same nodes, the lower
row shows "painted over by <row>".

**5. Hundreds of groups.** The parent row arrives folded. Unfolded, it lists the largest groups,
up to the number of colours the palette can tell apart, then one "N more groups" row that styles
the rest together under graphty-element's overflow policy and opens the item tab. A group gets its
own row when the analyst restyles, renames or drags it.

**6. Inspecting as well as styling.** Clicking a group row selects the group: members are marked
on the canvas and in the table, and the right panel shows sections, Style first as the owner
asked, then Statistics, Members ("Open in table"), Created from, Notes and Used by. Sections, not
Style and Data tabs, because tabs separate a value from the layer that paints it. Two selected
rows show their overlap and statistics side by side, with Compare with... for the full comparison.

**7. Filters, hiding, selection, notes.** Four operations, four places:

- **Filtering** changes what every number is computed on, so it is not a style. It stays on the
  filter chip, above the list, governing everything below it.
- **Hiding** changes only the drawing, so it is a style: Hide on canvas adds a Hidden row that
  obeys the list's order. A row's eye turns that row's paint off; it never hides the members.
- **The selection** is shared state, never a row; Create set turns it into one.
- **Notes** stay in the Notes panel.

## How the tasks run

- **Run** from the toolbar, the catalog, or Rerun. The run joins Runs; one that paints puts its
  parent row at the top of Styles, highlighted. Either way its inspector opens.
- **Style**: select a row and edit its Style section, or click a legend entry to select its row.
- **Reorder**: drag rows or folders in Styles. Runs is never reordered; it is a history.
- **Select** on the canvas, in the table, or by clicking a row. **Note** from any selection or row.

## The cost

A kept set with no style still takes a row, and sets are ordered by paint, not recency, so
finding one by name goes through Find. At 1366 x 768 the list shows about nine rows at rest.
