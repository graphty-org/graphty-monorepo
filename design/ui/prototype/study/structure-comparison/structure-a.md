# Structure A: the current structure, as the gallery draws it

This is the structure drawn in the prototype gallery today (`screens/navigation.html`,
`results-panel.html`, `styles-list.html`, `inspector.html`, `data-panel.html`,
`sets-and-paths.html`). It is written at the same level as `structure-b.md`, so the two can be
compared place by place.

## The places

**Rail**, top to bottom: Main menu, Graph, Data, Results, Notes, Assistant. The app opens on
Graph.

**Header** (above every panel): the project name, the privacy line ("Nothing has been sent from
this project", which links to Data), and the **filter chip** ("Full graph"), which opens the
filter steps.

**Graph panel** (left): three lists, and nothing else.
- **Graphs** -- the project's graphs.
- **Sets and paths** -- kept sets (a rule set such as "High risk", or a frozen copy) and kept
  paths, each with its member count. Clicking a row selects the set and opens its inspector.
- **Views** -- saved views.

There is no Styles list in the left panel. It moved to the right panel after the third study.

**Results panel** (left, from the rail): "Run a measure..." at the top, then **Runs**, every run
in the project with its settings and date, newest first. The standing "Connected components"
partition the element computes on load is the first entry. Opening a run shows its options, its
readings (modularity, sampled error bounds), its Top nodes list, Compare with another run..., and
Show in table.

**Data panel**: sources, joins, Update with new data, Versions, Applied recipes, Export..., and
"Sent and saved from this project".

**Notes panel**: every note, newest first.

**Right panel (the inspector)**: one inspector, chosen by the selection.
- **Nothing selected**: Overview (nodes, edges, density, components, what the edges carry,
  attributes, layout) and the **Style stack** -- the whole ordered list of style layers, "top
  wins", drag handles, each layer's legend nested under it, "+" to add a layer (empty, from a
  recipe or file, or a suggested layer), the Look (Screen, Print, High contrast), and Base style
  at the bottom. No Results section, because runs have one home.
- **A node or edge**: Attributes (the file's own columns only), Results (every value graphty
  computed, with its rank), Memberships, and Appearance -- the same style stack in the same
  order, with the layers that paint this element highlighted and a covered layer naming what
  covers it.
- **A set, path or group**: its members, statistics, Compare with the rest.
- **A run** opened from a value: an inspector of its own.

**Toolbar** (floating): Select (Lasso and Hand in its flyout), Path, Note, Quick actions
(Ctrl+K), and the view mode.

**Bottom dock**: the table (Nodes, Edges, and a run's item tab such as a community list) and the
time slider. Canvas, table and inspector share one selection.

**Canvas**: the drawing, one legend (a label selects its group), note markers, and the
"not drawn" line, which is the home of hidden elements and their count.

## Where each kind of result lands

| Result | Home | Other routes |
|---|---|---|
| A run, its options and readings (modularity) | its entry in Results | "From run:" link on a layer it made |
| One node's value (its PageRank and rank) | the node inspector's Results section; a table column | the run's Top nodes |
| Groups from a partition (Louvain communities) | the run's item tab in the table | the run's style layer lists the largest under it, then "N more" |
| A found path | a path row once kept; the selection before | Sets and paths |
| A style | its layer in the Style stack (right panel) | the canvas legend; a node's Appearance |

## How a run paints

A run starts from the main menu's Algorithms, from Quick actions, or from Results' "Run a
measure...". All three open the same catalog, read from graphty-element. The run lands in
Results. A run with a suggested style adds its layer on top of the Style stack (Betweenness's
layer colours every protein, because every protein has a betweenness value). "Show as style
layer" on a result adds a layer that keeps its name and gains a "From run:" link back to the run.

## Filters, hiding, selection, notes

- **Filter steps**: the filter chip's popover, an ordered list deciding what every number is
  computed on.
- **Hidden elements**: the canvas's not-drawn line.
- **Selection**: shared state owned by the element; never listed as an object.
- **Notes**: the Notes panel, with markers on the canvas.

## What A gets right and where it strains

It gives every kind of thing one home: objects on the left, runs in Results, styles on the
right. It strains where they meet. A group from a run lives in three places (the run, its item
tab, and a layer's legend), a kept set and the layer that colours it are in opposite panels, and
the style stack only appears on the right when nothing, or one element, is selected.
