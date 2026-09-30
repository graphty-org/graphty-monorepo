# Structure B: one ordered list of groups and styles

The owner proposed a structure in which running an algorithm makes groups, sets and paths that
appear in one list on the left; clicking one opens a style inspector on the right; dragging rows
reorders their styles; and results that make no group are read on the Algorithms tab or in the
graph's overview. This page specifies that structure as a whole app: every place, the ordered
list and its one precedence rule, where each kind of result lands, the inspectors, the toolbar
and the rail. Where graphty's ontology forces a change to the owner's text, the change and its
reason sit next to it.

Two project rules shape every choice here. graphty-element owns all graph logic; the app only
draws what the element publishes. And an algorithm's style may paint only the nodes and edges
that carry its own result.

## The central rule

**The list on the left is the style stack.** Each row is one style layer plus what it selects.
The list's order is paint order, and a higher row wins, property by property. Everything else in
this page follows from that sentence and from the precedence rule below.

## The places

**Rail**, top to bottom: Main menu, Graph (the default), Algorithms, Data, Notes, Assistant.

**Header** (above every panel): project name, privacy line, and the **filter chip** ("Full
graph"). Unchanged from today.

**Graph panel** (left):
1. **Graphs** -- the project's graphs.
2. **Groups and styles** -- the owner's "graph groups" list. Named for both, because an encoding
   such as "Size by degree" is a style but not a group. Overrides (hand edits) is pinned at the
   top; Base style is pinned at the bottom. Between them are five kinds of row:
   - **Set or path row**: a kept set or kept path, or a single group the analyst has styled.
   - **Run row**: one run that produced groups or paths (Louvain, components, a shortest path).
     Its groups or paths are its children.
   - **Encoding row**: a value mapped to colour or size ("PageRank: colour"). It selects only
     elements that carry the value.
   - **Rule row**: a style rule ("kind is merchant").
   - **Folder**: a set collection loaded from a file, a hierarchy level, or the analyst's own.
   Each row shows a swatch (a ramp for encodings, empty for a set with no paint), its name, its
   member count, a **Paint** checkbox, and a note badge when it has notes.
3. **Views** -- saved views, collapsed by default.

**Algorithms panel** (left): a search field, then **Runs in this project**, every run whether it
paints or not, newest first, reruns folded beneath the run they replaced; then the **catalog**
by family, with each entry's marks (needs direction, needs a weight, variant). Runs is a history
and is never reordered.

**Data panel**, **Notes panel**, **Assistant**: unchanged from today.

**Right panel (the inspector)**: one inspector, chosen by what is selected -- nothing, a node, an
edge, several elements, one row, several rows, or a run.

**Toolbar** (floating): Select (Lasso and Hand in its flyout), Path, **Run** (a searchable
picker over the same catalog, then the run's options), Note, Quick actions, and the view mode.

**Bottom dock**: the table (Nodes, Edges, and the item tab of an open run, "Communities:
Louvain") and the time slider. Canvas, table and inspector share one selection.

**Canvas**: the drawing, one legend (clicking an entry selects the row that paints it), note
markers, and the "not drawn" line.

## The precedence rule

**Paint order is the tree read top to bottom, depth first, and a parent's own style sits just
below its last child. Nesting says where a row came from, never that its members belong only
there.**

Consequences:
- Whatever is higher on screen always wins, so tree position and paint order cannot disagree.
- Groups overlap freely. A node in two rows takes each property from the higher row. The lower
  row's inspector says so: "9 of 40 members show Watchlist's colour".
- A folder's children are always adjacent, so dragging a folder moves the whole block.
- A run's groups cannot be dragged out of their run; the groups of one partition do not
  overlap, so their order among themselves changes nothing. **Keep as set** makes an
  independent set row that can go anywhere and survives a rerun.
- A lower row that loses a property on every member reads "Covered by Leiden: fill" and offers
  Move above.

## Where each kind of result lands

**Every run has one home: its run inspector.** Both its entry under Algorithms > Runs and its run
row in Groups and styles open that same inspector. This changes the owner's text, where results
that paint and results that do not had different homes; an analyst would have to know which kind
PageRank is before knowing where to look.

| Result | Where it is read | What it adds to the list |
|---|---|---|
| Groups (Louvain, components, k-core shells) | the run row's children; the item tab | one run row, on top |
| A found path | the run row's child, or the selection before it runs | one run row, on top |
| A value on every node (PageRank, betweenness) | the node inspector; a table column; the run inspector's top nodes | nothing, until Colour by or Size by |
| A number about the whole graph (density, modularity) | the run inspector; the graph overview's Statistics, linked to its run | nothing |
| Pairs (link prediction, all-pairs distance) | the run's item tab | nothing |

**Many measures, no clutter.** Only a run that produces groups or paths adds a row, and that row
paints only its own members. A measure adds no row when it runs. Its run inspector and its
finish notice offer **Colour by** and **Size by**, and each adds one encoding row on top. Five
centrality runs make five entries under Runs and no rows. Rerun replaces the run inside its
existing row. Nothing is dimmed automatically; dimming what a run did not select is the reader's
own rule row.

**Hundreds of groups.** A run row arrives folded. Unfolded, it lists its largest groups, as many
as the palette can tell apart (about ten), then one "274 more groups" row with a single shared
swatch, which opens the item tab. Recolouring or renaming a group edits a slot in the run's own
layer and lifts the group into the listed children; it never adds a layer.

## The inspectors

**Nothing selected**: Overview (nodes, edges, density, components, edges and weight, attributes,
layout) and **Statistics**, the graph-wide readings of every run, each linked to its run
inspector. No style stack: it is on the left.

**A node or edge**: Attributes (the file's own columns), Results (every computed value, with
rank), Memberships (every row it belongs to), and **Appearance**, which lists only the rows that
paint it and which property each one wins, each linked to its row.

**One row** (a set, path, group, run child or encoding). Clicking a row selects the row, marks
its members on the canvas and in the table, and opens, in one scrolling inspector:
- a header: name, count, "Created from Louvain, Sep 28" (a link to the run), Keep as set;
- **Style**, first, as the owner asked: node and edge colour, size, shape, label, edge width,
  opacity, with the colour picker's Custom and Libraries tabs;
- **Statistics**, **Members** (Show in table, Select members), **Overlap** (who paints over it),
  **Notes**, **Used by**, and Compare with....
These are sections, not Style and Data tabs, because a tab would separate a value from the layer
that paints it.

**Several rows** (Shift- or Ctrl-click): their overlap and their statistics side by side, with
Compare with... for the full comparison.

**A run** (a run row, or its entry under Runs): options, direction and weight, readings such as
modularity, top items, Rerun, Compare with another run..., and the layer's palette.

## Filters, hiding, selection and notes

None of these is a row, because a row's position would read as paint order, and none of their
effects depends on it.
- **Filter steps** stay on the filter chip. They change what every number is computed on, and
  their order is evaluation order.
- **Hiding** is a verb (Hide on canvas, from a selection or a row's menu). Hidden elements live
  on the canvas's not-drawn line, with Show all. The Paint checkbox on a row only switches that
  row's paint off; it never hides members, since an encoding has none to hide.
- **The selection** is shared state. Create set turns it into a set row on top of the list.
- **Notes** live in the Notes panel; a noted row or element shows a badge and a Notes section.

## The costs

- A kept set with no paint still takes a row, and rows are ordered by paint, not by name or
  date. Finding a set by name goes through Find.
- At 1366 x 768 the list shows about nine rows before scrolling.
- The list mixes objects (sets) and styles (encodings, rules); "Groups and styles" says so, but
  it is one more idea to learn than a list of sets.

## What changes from the current structure (A)

- **The style stack moves from the right panel to the left** and merges with Sets and paths into
  one list, Groups and styles. A kept set and the layer that colours it become one row.
- **Results is renamed Algorithms** and holds the catalog as well as Runs. Runs keeps every run,
  as today.
- **Run joins the toolbar.** The catalog is also reachable from the rail, the main menu and
  Quick actions, as today.
- **A measure no longer paints when it runs.** Today Betweenness adds a layer that colours every
  protein; in B it adds a row only on Colour by or Size by.
- **A run's groups become rows** under their run, instead of a legend nested under a layer.
- **Rows get a full inspector** (Style first, then statistics and members) instead of the
  style-layer editor popover plus a separate set inspector.
- **Nothing selected** shows Overview and Statistics instead of Overview and Style stack; a
  node's Appearance lists only the rows that paint it, not the whole stack.
- Unchanged: the filter chip, the not-drawn line, the table dock, Data, Notes, Views, and one
  home for every run.
