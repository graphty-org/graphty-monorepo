# Structure B, specified by the Figma product designer

Structure B is the owner's counter-proposal: algorithms run from the toolbar or an Algorithms rail
section; their styled outputs form an ordered, nestable "graph groups" list on the left; a row
opens a style inspector on the right; dragging reorders paint. In Figma terms the list is the
Layers panel and the right panel the Design panel; the objects come from graphty's conceptual
model, not from Figma.

## 1. The frame

**Rail (left edge), top to bottom.** Graph (the default), Algorithms, Data, Views, Notes,
Assistant. Above every panel sits the project name, its menu and the **filter chip** ("Full graph").

**Toolbar (top centre).** Select (with Lasso and Hand), Path, **Run** (a dropdown of the catalog
families, as Figma's shape tool holds its shapes), Note, Quick actions, the 2D/3D control.

**Right panel.** The inspector of the selection; with nothing selected, the **graph overview**.

**Bottom dock.** The table: Nodes, Edges, one Groups tab per partition result.

## 2. The Graph panel: the graph groups list

One ordered list, top wins. It is the project's style stack, made browsable. Row kinds:

- **Overrides**, pinned first once any hand edit exists.
- **Group row**: a kept set, or a group a run offers. Solid swatch.
- **Path row**: a kept path or a found path. Line swatch.
- **Encoding row**: "Color by PageRank", "Size by degree". Gradient or size-ramp swatch.
  **Weakness 1:** a continuous encoding is a row in the same list because to the stack it is the
  same thing, a selector plus an encoding. Its selector is "carries a PageRank value", so it paints
  only its own result. It expands to its legend bands, not to members.
- **Folder row**: a partition run (its groups are its children), a hierarchical level, a set
  collection, or a folder the analyst makes by grouping rows (Ctrl+G, as in Figma).
- **Base style**, pinned last.

A kept set with no paint is a row with an empty swatch. Graphs sit above the list as a
Pages-style section.

**Weakness 2, precedence.** The tree is a **paint tree, not a membership tree.** Nesting means "is
part of this layer" (a palette entry of a partition, a row inside an authored folder), never "its
members are a subset". Paint order is the rows read top to bottom with folders expanded; for each
channel a node takes the value of the highest row that writes it. Because order is defined on the
flattened list, tree position and paint order cannot disagree. Membership overlap (Alice in both
Hubs and Community 3) is read in the inspector's Memberships section, not in the tree.
Hierarchical communities nest safely because groups within one level are disjoint.

**Reordering.** Drag a row or a folder; a folder moves as a block. Dragging a group out of its
partition folder is "Create set", then the kept set gets its own row above the folder: one undo step.

**Eye.** A row's eye turns that row's paint on or off. It never hides nodes: an encoding row has
no members to hide, and one eye must mean one thing on every row.

## 3. Running

Run from the toolbar, the Algorithms catalog or Quick actions. What a run adds depends on its
output:

- **Items (groups, found paths)**: one folder or path row lands at the top, below Overrides, and
  paints its own members. Its groups are **offered**, shown in italic with the run's name, and
  become kept with Keep (Create set) or by dragging one out.
- **A value per node (PageRank, degree)**: no row. The result appears in the Algorithms panel with
  its headline reading and **Color by** and **Size by** buttons; either button adds an encoding row.
- **Graph statistics (modularity alone, diameter)**: no row; the reading appears in the overview's
  Statistics and in the Algorithms panel.

**Weakness 4** is why I change the owner's "running creates a new style" for measures: five
centralities would stack five gradient rows, each painting every node, the top erasing the rest.
Re-running an algorithm replaces the run inside the same row (conceptual model 4.3); only Run as
new result adds a second row. When two rows write the same channel, the lower row's swatch shows a
"covered" hatch and its tooltip names the row above. Nothing is dimmed or greyed automatically:
fading what a run did not select is a layer the analyst adds.

**Weakness 3, one run stays together.** A run has exactly one inspector, the **result inspector**.
Louvain's folder row and its Algorithms entry both open it: parameters and Run, Readings
(modularity, group count), Appearance (the palette), Notes. The groups are the folder's children.

**Weakness 5, hundreds of groups.** A partition folder shows its largest 10 groups, each with its
own palette colour, then one **Other** child ("132 groups, 410 nodes") painted with a single
swatch. Other opens the table's Groups tab, where any group can be kept or recoloured.
Recolouring writes a palette slot in the one partition layer, never a new layer.

## 4. The right panel

Two tabs on any group, path or set, as Figma's Design and Inspect:

- **Style**: node fill, shape, size, label; edge colour, width, arrow. Each property row has its own
  eye and its minus button, as Figma's fills do. Edits write to that row's layer.
- **Inspect** (**weakness 6**): Created from, Statistics, Memberships, Members (a count that opens
  the table filtered to them), Layout (Run layout on this group), Notes, Used by, Export, and
  **Compare with...**. Shift-click two rows and the inspector compares them side by side.

A result inspector has Readings in place of Inspect. Node and edge inspectors are unchanged.

## 5. Algorithms, Data, Views, Notes

**Algorithms panel.** Search, the catalog by family, then **In this project**: every result,
newest first, with its state and headline reading ("PageRank: Alice highest, 0.041"). Each row opens
its result inspector; out-of-date runs offer Re-run.

**Data panel.** Data sources, data versions and their import reports, joins, and Export (project,
figure, table, recipe, style file). Export leaves the top-right corner.

**Views panel.** Saved views and the findings report's pages, in page order.

**Notes panel.** Every note; Add note from the toolbar, any inspector or the context menu.

## 6. Filtering, hiding, selecting (weakness 7)

- **Filter steps** change what is computed, so they sit above every list, in the filter chip;
  Filter to and Filter out start from the selection, a column header or a legend band.
- **Hiding** changes only what is drawn. Hide on canvas starts from the selection. A **Hidden on
  canvas (n)** line sits at the foot of the graph groups list, outside paint order, with Show all.
- **Selecting** a row selects the group (its members show the selection mark); **Select members**
  makes it a node selection. Selection never writes paint.

## 7. Where Structure B departs from today's framework

Styles and Sets and paths merge into one list; Results move to the Algorithms rail panel; the
inspector gains Style and Inspect tabs; measures never paint until asked. Each needs an entry in
information-architecture.md 4.1, output-homes.md and figma-crosswalk.md 4 before a study tests it.
