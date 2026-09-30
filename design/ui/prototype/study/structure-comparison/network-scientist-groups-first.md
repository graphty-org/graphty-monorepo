# Groups first: the owner's structure, specified from what analyses produce

The owner's structure (run from the toolbar or an Algorithms rail section; runs add rows at the
top of a groups list on the left; a row opens a style inspector on the right; dragging reorders
paint), specified from what real runs return. Departures from the owner's text are marked
**Change**, with the reason.

## What analyses actually return

| Output kind | Examples | Typical count on a 5k-50k node graph |
|---|---|---|
| Partition (disjoint groups) | Louvain, Leiden, connected components, k-core shells | 20-300 communities; thousands of components on sparse data, most of them size 1-2 |
| Hierarchy | Leiden levels, Girvan-Newman dendrogram | 2-5 levels, each a partition |
| Cover (overlapping groups) | clique percolation, label propagation with overlap | tens to thousands; one node in several |
| Found paths | shortest paths, k shortest paths | 1 to k (usually under 20) |
| Score per node or edge | PageRank, betweenness, degree, clustering | one value on every element |
| Scalar | modularity, diameter, transitivity | one number |
| Pairs | link prediction, similarity | hundreds to millions |

Only the first four are groups; treating the last three as groups breaks the list.

## The places

**Rail** (top to bottom): **Groups** (default), **Algorithms**, **Data** (graphs, versions,
import, export), **Views**, **Notes**.

**Left panel, Groups.** One ordered list. **Change: every row is a style layer**, and row order is
paint order: the higher row wins each channel it writes (colour, size, shape, width, label). That
is the owner's "dragging reorders their styles", made exact. Three row kinds share the list:

- **Run rows**: a run of a partition, hierarchy, cover or path algorithm. Its children are its
  groups or found paths.
- **Set rows**: a kept set or path, authored or kept from a run.
- **Encoding rows**: "All nodes: colour by PageRank", "All nodes: size by degree". **Change:** these
  are not groups, but they are paint and they compete with groups for the same channels, so they
  sit in the same order (weakness 1). They have no children; their row shows the ramp.

Pinned outside the drag order: **Overrides** at the top (hand edits), **Base style** at the bottom.

**Right panel.** The inspector of what is selected; with nothing selected, the **graph overview**
(counts, statistics, last import, direction and weight role, graph-wide scalars).

**Left panel, Algorithms.** The catalog by family (search, run button) above **Results not in
Groups**: scores, graph scalars and pair lists, newest first, runs folded beneath.

**Toolbar.** Run (opens the catalog as a menu; Quick actions reaches the same list), the filter
chip, Hide and Show, Layout, view mode (2D, 3D), Add note.

**Bottom dock, the table.** Tabs Nodes, Edges, and one item tab ("Communities: Louvain", "Pairs:
Adamic-Adar"). Every "N more" in the app opens here.

## The rules that resolve the known weaknesses

**1. Continuous encodings.** Encoding rows (above) live in the Groups list at their paint position.
"Colour by PageRank" below "Louvain" means Louvain's colours win fill; drag it above and PageRank's
ramp wins.

**2. Overlap versus tree.** **Change: the tree means "made by" or "is a subgroup of", never "is
the only home of".** A node may sit in many rows; the tree only nests a run's own outputs under it
(and a hierarchy's finer level under the coarser group that contains it, which is true
containment). Paint order is the tree read top to bottom, depth first, so tree position and
precedence cannot disagree. Drags move a row or a whole subtree among its siblings, and a run's
children never interleave with other rows. A partition's children are disjoint, so their order
cannot matter and they do not drag; a cover's children do drag, because there the order decides
which colour an overlapping node gets.

**3. One run, one row.** A run's outputs never scatter. Louvain adds one run row: its children are
its communities, and its inspector holds modularity, the group count, the options, the other runs
and Re-run. The scalar is read on the run's row, not in the overview. A graph-wide scalar with no
groups (diameter) goes to Algorithms > Results, and the overview shows it with a link.

**4. No automatic clutter.** **Change: only item-producing runs add a Groups row.** A score
(PageRank, betweenness) adds columns and an Algorithms result whose inspector offers **Colour by**
and **Size by**; the encoding row appears only when the analyst picks one. Five centralities run
back to back therefore add zero rows and zero colour fights. A new run row lands at the top and
paints only its own members (the project rule). If a higher enabled row already writes that
channel on the same elements, the new row is added switched off and says "Not painting: Leiden
paints colour here", with **Paint on top** on the row.

**5. Hundreds of groups.** A run row shows its largest groups first, as many as its palette can
tell apart (about 10), then one folded row: "274 smaller groups (3,112 nodes)". The folded groups
still paint, all in one tail colour, because they are still this run's results. Groups of one or
two nodes fold into "1,840 isolates and pairs". The full list is the item tab, sortable by size
or any profiled column; Find reaches any group by name.

**6. Inspecting as well as styling.** Clicking a group row selects the group (members ringed on the
canvas) and opens **its** inspector, not a style-only panel. **Change:** Appearance comes first,
because that is why the row was clicked, then **Members** (top by degree, "N more" to the
table), **Statistics** (size, internal and boundary edges, density, conductance), and **Compare
with...**. Editing one community's colour edits that slot in the run's palette; no new row is
made. **Keep as set** (or dragging a group out of its run) makes a kept set row with its own
style, placed where it is dropped, so it survives a re-run.

**7. Filters, hiding, selection and notes.**
- **Filter steps** change what every number is computed on, so they are not paint and not rows.
  They live on the toolbar filter chip and its popover, in pipeline order. A row's menu offers
  **Filter to**.
- **Hiding** is whether an element is drawn, not paint. **Hide on canvas** is a toolbar and
  context command. One **Hidden: 212 nodes** row sits above Base style when anything is hidden,
  with Show all. A row's toggle is **Paint on/off**, never visibility, so switching a style off
  never makes nodes vanish.
- **Selection** is a canvas mark, never a row. It drives the right panel and the table. **Create
  set** turns it into a set row.
- **Notes** live in the Notes rail section; a row or object with a note shows a marker, and the
  note opens from the object's inspector.

## Walkthroughs

- **Run Louvain** (toolbar Run): one run row at the top, 12 largest communities, one folded row,
  colours on only those nodes. Click community 4: members ringed, inspector with Appearance,
  Members, Statistics.
- **Run PageRank, betweenness, closeness**: nothing new in Groups; three results under Algorithms.
  Open PageRank, **Size by**: an encoding row appears on top.
- **Find paths A to B, k = 5**: one run row, five paths as children in rank order, highlighted
  only on path elements. Drag path 2 out: it is a kept path.
