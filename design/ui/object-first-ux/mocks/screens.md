# The key screens to mock

Seven screens plus one dark variant, each a still of the object-first graphty app defined in
`design/ui/object-first-ux/object-model.md`. Each entry gives the purpose, the exact state
(data, objects, selection, tool, mask), every panel's contents row by row, and the interaction
the screen illustrates. A mock is one static HTML file per screen in this folder, built from
`kit.css` and the icon sprite in `kit.html`, at a 1600 x 1000 viewport (the Figma study's
viewport), light theme unless the entry says dark.

Conventions shared by every screen:

- **Layout**: left panel 240 px, right panel 240 px, canvas between, status bar 24 px at the
  bottom. No top bar, no activity rail. The floating toolbar sits bottom centre of the canvas,
  48 px tall, radius 13, 16 px above the status bar.
- **Left panel header** (48 px): a 16 px menu glyph, the dataset name at 13/22 weight 550 with a
  chevron (the file menu), nothing else.
- **Right panel header** (48 px): the zoom menu ("100%" with a chevron, a 24 px pill) and
  **Share**, the one filled #0d99ff button (24 px tall, 11 px white text). When nothing is
  loaded both are disabled.
- **Toolbar**, left to right: Select (V), Hand (H), a divider, Filter (F, chevron), Neighbours
  (E), Path (P, chevron), Groups (G, chevron), Rank (R, chevron), a divider, Note (N), a divider,
  the mode switch [2D | 3D | VR | AR] as a sliding-thumb segmented control. The active tool has
  the brand fill. VR and AR are present because the mock browser reports support.
- **Tree row** (32 px): caret, kind icon, name, count in secondary text, state glyph if any, a
  14 x 14 Fill chip, lock and eye on hover. The selected row has the brand-tinted fill and
  weight 550; rows containing a selected node have the lighter child-of-selected fill.
- **Inspector row** (32 px) on the 16 / 88 / 8 / 88 / 8 / 24 / 8 grid; section headers 40 px at
  11 px weight 550; a two-column row is written "A | B" below; [square brackets] are controls.
- **Status bar** text at 11 px: counts and the mask at the left, the layout chip, the computing
  chip when any object computes, the selection count and the zoom readout at the right.
- **Values in the mocks are plausible, not computed.** The Karate Club file (`karate.gml`)
  carries node ids 1 to 34 and no labels, so a node's label is its id. College football
  (`football.gml`) carries a `label` (the team) and a `value` (the conference, 0 to 11).

## Screen 1: first run, nothing loaded

**Purpose.** The screen the comparison praised, kept: one task, one primary button, and two
quiet panels that do not talk. It also shows what the frame looks like before there is any
content, so the reader can see that the panels exist but hold nothing.

**State.** No dataset. No objects, no selection, no tool active (Select is the face but nothing
is pressed). Mode 2D. No docks, no overlays.

**Left panel.**
- Header: the menu glyph and "graphty" in secondary text (no dataset name yet) with the chevron.
- VIEWS section header with a disabled "+". No rows.
- OBJECTS section header with a disabled search glyph. Three 32 px rows in secondary text, each
  a verb the file menu also has: "Open a file...", "Paste data...", "From a URL...". Nothing else.

**Canvas.** The Welcome sheet centred over the empty canvas (the canvas is the neutral
background, #f5f5f5 at 60 percent under the sheet): a 15/25 heading "Open a graph", one drop
zone (a dashed 1 px #e6e6e6 rectangle, 400 x 120, "Drop a file here" in secondary text), a
"Choose a file" button (the only filled button on the screen while nothing is loaded; Share is
disabled), and below it the sample list: three 32 px rows "Karate Club  34 nodes, 78 edges",
"Cat social network  20 nodes, 29 edges", "College football  115 nodes, 613 edges", each with
its one-line blurb in secondary text on hover. The toolbar is present and every tool but Select
and Hand is disabled (text at 30 percent).

**Right panel.**
- Header: zoom menu disabled, Share disabled.
- One row in secondary text: "Nothing loaded". No sections.

**Status bar.** Empty except the zoom readout "100%" at the right.

**Interaction illustrated.** The empty state: panels do not pre-announce sections, and the one
action is the one filled button.

## Screen 2: loaded, nothing selected

**Purpose.** The resting identity of both panels: the tree with one row, the Dataset inspector
answering "what is loaded and how is it arranged", and the three suggestion rows that are the
only guidance on screen. Nothing was computed unasked.

**State.** Karate Club loaded from the sample. No objects. Nothing selected. Select tool.
Layout "Spread out", settled. Mask: everything. Legend off, minimap off. Mode 2D.

**Left panel.**
- Header: "Karate Club" with the chevron.
- VIEWS: header with "+"; one row "Overview" with the current-page style (grey fill, weight
  550), created automatically as the view of the first fit.
- OBJECTS: header with the search glyph; rows:
  1. "Karate Club  34 nodes  78 edges" with the dataset icon, caret down, weight 550, a locked
     chip (the default look, a grey swatch with a small lock).
  2. Three indented suggestion rows in secondary text with a 16 px tool icon each: "Find
     groups", "Rank by connections", "Search a name". No chips, no eyes. A tooltip on hover:
     "Same as pressing G" and so on.

**Canvas.** 34 grey nodes (#b3b3b3) on the light canvas, edges 1 px, laid out by the spread
layout; no labels (the label budget is "Top 6 by ..." but no Measure exists, so none). Toolbar
with Select active. No secondary bar.

**Right panel.** The Dataset inspector.
- Header: "Karate Club" (13/22 550, rename on double-click); secondary line "karate.gml, GML";
  actions: "+" (Add data), "..." (overflow).
- SUMMARY: "34 nodes joined by 78 edges in one connected part" (secondary, wraps to two lines);
  "Nodes 34 | Edges 78"; "Direction [Undirected v]" with "(from file)" in secondary text;
  "Density 0.139 | Mean links 4.6"; "Parts 1 | Weighted No"; "Import report >" (collapsed row).
- ARRANGEMENT: "Layout [Spread out v] [gear]"; "Dimensions [2D | 3D]"; transport row
  "[pause] [step] [re-run]  Settled" (the three as 24 px ghost icon buttons, the word in
  secondary text).
- SHOWING: "Show [Everything v]  34 of 34".
- CANVAS: "Background [chit #ffffff]"; "Labels [None v]"; "Legend [switch off]";
  "Minimap [switch off]"; "Notes [switch off]"; "Default look" as three locked mini paint rows:
  "Node [chit #b3b3b3] 1.0", "Edge [chit #b3b3b3] 1.0", each with a 12 px lock glyph.
- ATTRIBUTES (collapsed): header "Attributes  1" with a caret and a "+".
- MADE BY (collapsed): header only.
- EXPORT: "Image [PNG v] [2x v] [Export]"; "Data [GraphML v] [Export]"; "+".
- NOTES: header with "+", no rows.

**Status bar.** "34 nodes  78 edges" | "Spread out: settled" chip with a pause glyph | (no
computing chip) | "100%".

**Interaction illustrated.** Nothing selected shows the Dataset; the app switched no panel and
ran nothing; guidance is three rows that will vanish after the first object exists.

## Screen 3: the tree after two runs and a filter, a Group selected, its inspector with Fill

**Purpose.** The heart of the model: a real tree with nesting, chips, a linked-versus-nested
distinction visible at a glance, a Group selected with its members haloed, and the Fill section
showing an inherited paint row with an override above it. This is the three-click recolour.

**State.** Karate Club. Objects in tree order (top is newest and highest in precedence):
1. "Degree > 8" -- Set (rule: degree min 9), 5 nodes (1, 2, 3, 33, 34), Fill: Outline 2 px
   #1e1e1e, state current.
2. "Connections (Degree)" -- Measure, 34 values, Fill: Size 0.8 to 2.0 (no colour, because
   colour was already written by Communities below it when it was created), state current.
3. "Communities (Louvain)" -- Grouping, 4 groups, Fill: Colour, Okabe-Ito palette, expanded:
   - "Group 1" 12 nodes, inherited colour #e69f00
   - "Group 2" 11 nodes, inherited #56b4e9 with an override to #d55e00 (this is the selected row)
   - "Group 3" 6 nodes, inherited #009e73
   - "Group 4" 5 nodes, inherited #cc79a7
Selection: the Group 2 row (object selection); the element selection is its 11 members.
Tool: Select. Mask: everything. Legend on (L). Mode 2D.

**Left panel.**
- Header: "Karate Club" with the chevron.
- VIEWS: "Overview" current.
- OBJECTS rows, exactly:
  1. "v Karate Club  34 nodes 78 edges" (root, 550, locked grey chip)
  2. "    Degree > 8  5 nodes" set icon, chip: a white swatch with a 2 px dark ring (an outline
     Fill draws as a ring)
  3. "    Connections (Degree)  34 values" measure icon, chip: a small size-scale glyph (two
     dots, small and large)
  4. "  v Communities (Louvain)  4 groups" grouping icon, chip: a four-colour strip
  5. "        Group 1  12" group icon, chip #e69f00
  6. "        Group 2  11" group icon, chip #d55e00, the selected row (brand-tinted fill,
     weight 550, eye and lock visible)
  7. "        Group 3  6" chip #009e73
  8. "        Group 4  5" chip #cc79a7
  The suggestion rows are gone.

**Canvas.** Nodes coloured by community; Group 2's eleven nodes are #d55e00 (the override) and
carry the gold selection halo (a 2 px ring, #ffb800, from the element's selection layer); node
sizes vary with degree; nodes 1, 2, 3, 33 and 34 have a 2 px dark outline. Six labels ("34",
"1", "33", "3", "2", "9") because the label budget is Top 6 by Connections. The legend overlay
at the bottom right: a 160 px light card, radius 5, one block titled "Communities" with four
swatch rows (Group 2's swatch is the override colour), then a block "Connections" with a
small-to-large size glyph and "1 to 17". Toolbar: Select active.

**Right panel.** The Group inspector.
- Header: "Group" in secondary text above "Group 2" (13/22 550, rename); a state badge slot
  empty (current); actions: eye (on), lock (off), "...".
- DEFINITION: "Of [Communities (Louvain)]" as a clickable row with a chevron-right;
  "Label 2"; "11 nodes, 32% of the scope" in secondary text; "Within  Everything" (read-only,
  secondary).
- MEMBERS: "Nodes 11 | Edges 20"; "Inside edges 20 | Cut edges 9"; eight member rows "1", "2",
  "3", "4", "8", "12", "13", "14" (label at the left, nothing at the right); "See all 11 in
  table" as a link row; header actions: "Select", "Focus".
- FILL: two paint rows. Top: "[chit #d55e00] D55E00  100%  [eye] [-]" (the override, editable).
  Below: "[chit #56b4e9] Inherited from Communities" in secondary text with no opacity field and
  no minus (read-only), and a 12 px lock glyph. Header "+" (adds another channel). The rows are
  in precedence order, override above inherited, so the reader sees why orange wins.
- MADE BY (collapsed): header only.
- EXPORT: "Members [CSV v] [Export]"; "Image framed on members [PNG v] [Export]".
- NOTES: header with "+", no rows.

**Status bar.** "34 nodes  78 edges" | "Spread out: settled" | "11 selected" | "100%".

**Interaction illustrated.** Select a row, change its Fill, done: three clicks, and the colour
is still a style layer, on an object, in the tree. Also: nesting (Groups under their Grouping),
the size-versus-colour default (Connections got Size because Colour was taken), and the halo
that follows an object selection.

## Screen 4: a node selected (what the inspector shows for raw material)

**Purpose.** A node is not an object. Its inspector is a report plus doors: which objects own
it, which object won each channel, and one action row that starts the recolour through a set.
No paint rows of its own.

**State.** College football loaded. Objects in tree order:
1. "Top 10 by Bridges" -- Set, 10 nodes, linked to the measure below it (cut: Top 10), Fill:
   Outline 2 px #1e1e1e.
2. "Bridges (Betweenness)" -- Measure, 115 values, Fill: Size 0.8 to 2.4.
3. "Conference" -- Grouping by the `value` attribute, 12 groups, Fill: Colour (a 12-colour
   categorical palette), collapsed.
4. "Communities (Louvain)" -- Grouping, 10 groups, Fill: Colour Okabe-Ito, collapsed. Every
   group is covered by Conference above it (it stays for its Values rows).
Selection: the node "FloridaState" (element selection), clicked on the canvas. No object
selection. Tool: Select. Mask: everything. Legend on. Mode 2D.

**Left panel.**
- Header: "College football".
- VIEWS: "Overview" current.
- OBJECTS rows:
  1. "v College football  115 nodes 613 edges"
  2. "    Top 10 by Bridges  10 nodes" set icon, ring chip; this row has the child-of-selected
     fill because FloridaState is a member
  3. "    Bridges (Betweenness)  115 values" size-glyph chip
  4. "  > Conference  12 groups" strip chip, collapsed; child-of-selected fill
  5. "  > Communities (Louvain)  10 groups" strip chip, collapsed; child-of-selected fill; its
     chip is drawn at 50 percent because every group is fully covered

**Canvas.** 115 nodes coloured by conference, sized by betweenness, the top ten outlined;
FloridaState has the gold halo and its label; its 12 neighbours have the hover-style outline
only if the pointer is over the Neighbours header (it is not in this still). Toolbar: Select
active. Legend at the bottom right: "Conference" (12 rows, scrolls after 8), "Bridges" size
glyph.

**Right panel.** The node inspector.
- Header: "Node" in secondary text above "FloridaState" (13/22 550); secondary line "id 1";
  actions: Locate (a 24 px ghost icon), Pin (a toggle icon, off), "...".
- ATTRIBUTES: "label  FloridaState"; "value  0". (Two rows; no filter field because there are
  fewer than ten.)
- VALUES: "Bridges  0.031  rank 12 of 115" (name as a clickable row); "Conference  0";
  "Communities  Group 3".
- MEMBER OF: one chip row: "[ring chip] Top 10 by Bridges" as a clickable 24 px chip.
- NEIGHBOURS: header "Neighbours  12" with actions "Select" and a Neighbours-tool glyph; eight
  rows "Clemson", "Duke", "GeorgiaTech", "Maryland", "NorthCarolina", "NCState", "Virginia",
  "WakeForest", each with "played" in secondary text at the right; "See all 12 in table".
- LOOK: "Colour [chit] from Conference" (clickable); "Size 2.1 from Bridges" (clickable);
  "Outline 2 px from Top 10 by Bridges" (clickable); then the action row "Colour this node..."
  drawn as a secondary text button spanning the width.
- NOTES: header with "+", no rows.

**Status bar.** "115 nodes  613 edges" | "Spread out: settled" | "1 selected" | "100%".

**Interaction illustrated.** Click a node: the inspector reads it, the tree highlights every row
that contains it, Look says which object won each channel, and "Colour this node..." is the
door to painting it through a one-node Set. Also the linked-object placement: Top 10 sits
directly above the measure it was cut from.

## Screen 5: creating a path with the Path tool, mid-flow

**Purpose.** A tool that behaves like a drawing tool: the first pick is done, a rubber-band line
follows the pointer, the secondary bar says what to do next, and no dialog is open. The tree
has not changed yet; the row will appear the instant the second pick lands.

**State.** Karate Club with the objects of screen 3 (Degree > 8, Connections, Communities with
its four groups; Group 2 still overridden to #d55e00, but no row is selected now). Tool: Path,
variant Shortest route, active. The first pick was node 1. The pointer is over node 27 (not a
pick; the line simply follows it). No object selection, no element selection (a pick does not
select). Mask: everything. Legend on. Mode 2D.

**Left panel.**
- Header: "Karate Club".
- VIEWS: "Overview" current.
- OBJECTS rows exactly as screen 3, none selected, Communities expanded.

**Canvas.** Nodes as in screen 3 without the halo. Node 1 carries a 2 px brand-blue (#0d99ff)
ring, the "picked" mark. A 1 px brand-blue dashed line runs from node 1's centre to the pointer,
which is drawn as the crosshair cursor over node 27; node 27 has the hover outline. Above the
toolbar, the secondary bar (32 px tall, dark #1e1e1e, radius 13, centred): "Pick the end node"
in white, then "[Shortest route v]" as a dark select, then "Cancel" in secondary white
(#ffffffb2). Toolbar: Path is the active tool with the brand fill; its chevron is visible.

**Right panel.** The Dataset inspector, exactly as in screen 2 except SHOWING reads "Show
[Everything v]  34 of 34" and the CANVAS Labels row reads "Labels [Top 6 by Connections v]",
ATTRIBUTES header "Attributes  1", and the legend switch is on.

**Status bar.** "34 nodes  78 edges" | "Spread out: settled" | "Path: pick the end node" in
place of the selection count | "100%".

**Interaction illustrated.** Options come after creation and a pick is not a dialog: the tool
asks for exactly what it needs on the canvas. What happens next (not shown): the second click
on node 34 adds "Path: 1 -> 34  3 nodes 2 edges" at the top of the tree, selected, with a
Colour Fill (#0d99ff on nodes and edges, edge width 3), and the tool snaps back to Select.

## Screen 6: a Measure (PageRank) selected, with its gradient and size mapping

**Purpose.** The other family: a Measure's Fill is a scale, not a colour. The inspector shows
the encoding controls (palette ramp, scale, domain, missing, a second channel), the values
(histogram, top 10), and the parameters that can be edited after the run. The canvas shows a
ramp, and the covered Grouping beneath says so.

**State.** Karate Club. Objects in tree order:
1. "Influence (PageRank)" -- Measure, 34 values, Fill: Colour (viridis, even steps, domain
   0.010 to 0.101) and Size (0.8 to 2.2), state current. This is the selected row.
2. "Communities (Louvain)" -- Grouping, 4 groups, Fill: Colour Okabe-Ito, collapsed. Fully
   covered on colour by Influence above it.
No element selection (a Measure row clears it). Tool: Select. Mask: everything. Legend on.
Mode 2D.

**Left panel.**
- Header: "Karate Club".
- VIEWS: "Overview" current.
- OBJECTS rows:
  1. "v Karate Club  34 nodes 78 edges"
  2. "    Influence (PageRank)  34 values" measure icon, chip: a 14 x 14 viridis ramp; the
     selected row (brand-tinted fill, 550, eye and lock visible)
  3. "  > Communities (Louvain)  4 groups" strip chip drawn at 50 percent (fully covered on
     colour), collapsed

**Canvas.** Every node coloured on the viridis ramp (dark purple for low, yellow for high) and
sized by the same value; nodes 34 and 1 are the largest and yellowest. No halo. Labels: "Top 6
by Influence". Legend at the bottom right: one block "Influence" with a 120 x 12 horizontal
ramp and the end labels "0.010" and "0.101", then a size glyph row "0.8x to 2.2x". No
Communities block, because it paints nothing visible. Toolbar: Select active.

**Right panel.** The Measure inspector.
- Header: "Measure" in secondary text above "Influence (PageRank)" (13/22 550, rename);
  actions: eye (on), lock (off), "...".
- DEFINITION: "Method  Influence (PageRank)" with a 16 px info circle at the right; "Damping
  [0.85] | Iterations [100]" (two scrubbable number fields under 9 px captions); "Tolerance
  [1e-6] | Weights [switch off]"; "Direction [As loaded v]"; "Exact [switch on]"; "Within
  Everything" (read-only, secondary). No Re-run button, because the state is current.
- VALUES: "Min 0.010 | Max 0.101"; "Mean 0.029 | Median 0.022"; a 208 x 40 histogram of 24
  bars in #b3b3b3 with the bar under the hovered value in brand blue (no hover in this still);
  "[linear | log]" as a small segmented control under the histogram; "Top [10 v]" header row,
  then five visible ranked rows "1  34  0.101", "2  1  0.097", "3  33  0.072", "4  3  0.057",
  "5  2  0.053" and a "See all in table" link row; the section header carries a "+" whose
  tooltip reads "Top N set... / Above threshold set...".
- FILL: "Channel [Colour v]"; "Scale [Even steps v]"; "Palette" with a 156 x 14 viridis ramp
  swatch and a chevron; "Domain [0.010] | [0.101]" with a small "Reset" text button and a
  "Reverse" checkbox row below; "Missing [chit #b3b3b3]"; a 1 px divider; a second block
  "Channel [Size v]", "Range [0.8] | [2.2]", with its own eye and minus at the right; header "+"
  (the legend preview is the canvas legend itself).
- MADE BY (collapsed): header only; when opened it would read "PageRank, 34 nodes, 1.2 s,
  exact, converged in 41 iterations, algorithms 2.0.1" and a "?" and "Copy as methods text".
- EXPORT: "Ranked list [CSV v] [Export]".
- NOTES: header with "+".

Not on this screen but one click away: selecting the Communities row shows its FILL section
with the secondary line "Covered by Influence on 34 of 34 members" under its palette row.

**Status bar.** "34 nodes  78 edges" | "Spread out: settled" | "100%".

**Interaction illustrated.** A measure's Fill: changing the palette, the scale or the domain
repaints at once; adding a second channel with "+"; the "+" in Values that cuts a Top N Set,
which will appear immediately above this row. Also precedence made visible: the covered
Grouping's chip dims and its legend block disappears.

## Screen 7: the data table dock open, a rule-based selection being built

**Purpose.** The material at full resolution, and a rule being composed as a form with a live
count and a live preview in both the table and the canvas, before the reader decides whether
it becomes a Set (Create) or only a selection (Select).

**State.** College football with the objects of screen 4 (Top 10 by Bridges, Bridges,
Conference, Communities). The Table dock is open (Shift+T), Nodes tab, 320 px tall, showing
what is showing (all 115), sorted by label. Tool: Filter, variant By values, active; its popover
is open above the toolbar with "Attribute [value v]" and "Values [7]" filled in; the live count
reads "Matches 10 nodes". Nothing is selected yet; the ten matching nodes are shown as a
preview (a dashed brand-blue ring on the canvas, a brand-tinted row fill in the table). Mask:
everything. Legend off (to leave the canvas clear). Mode 2D.

**Left panel.**
- Header: "College football".
- VIEWS: "Overview" current.
- OBJECTS rows as screen 4, none selected, no child-of-selected fills.

**Canvas.** The canvas is the upper 600 px (the dock takes the rest). Nodes coloured by
conference and sized by betweenness. The ten nodes with value 7 (BrighamYoung, NewMexico,
ColoradoState, Utah, AirForce, SanDiegoState, Wyoming, UNLV, and two more) carry a 2 px dashed
brand-blue ring, the preview mark. Above the toolbar, the Filter popover: a 240 px light panel
(#fff, radius 5, the light-popover shadow), rows: a 40 px header "Filter by values" with a
close "x"; "Attribute [value v]"; "Values [7 x]" as a token field with one token and a
placeholder "add a value"; a secondary-text row "Matches 10 nodes"; a 32 px row with two 88 px
buttons "Select" (secondary) and "Create" (secondary; neither is filled, Share stays the only
primary); the popover's caret points at the Filter tool. Toolbar: Filter active with the brand
fill.

**Table dock** (below the canvas, above the status bar): a 32 px header row with two pill tabs
"Nodes 115" (active) and "Edges 613", then "Showing [Everything v]" at the left, a search field
at the right, and a close "x". Column headers (32 px, 11 px 550, sortable, each with a "..." on
hover): "id", "label", "value", "Bridges", "Conference", "Communities", "Top 10 by Bridges" (a
checkmark column: object membership columns come last, in tree order). Twelve visible rows of 32
px (the dock scrolls), sorted by label: "8  AirForce  7  0.004  7  Group 6  -", "0  BrighamYoung
7  0.012  7  Group 6  -", "1  FloridaState  0  0.031  0  Group 3  yes", ... The rows whose value
is 7 have the brand-tinted preview fill. The first column has a 16 px row handle; clicking a row
selects the node (not in this still).

**Right panel.** The Dataset inspector for College football: header "College football",
secondary "football.gml, GML"; SUMMARY "115 nodes joined by 613 edges in one connected part",
"Nodes 115 | Edges 613", "Direction [Undirected v] (from file)", "Density 0.094 | Mean links
10.7", "Parts 1 | Weighted No", "Import report >"; ARRANGEMENT as screen 2; SHOWING "Show
[Everything v]  115 of 115"; CANVAS as screen 2 with "Labels [Top 6 by Bridges v]" and Legend
off; ATTRIBUTES expanded: header "Attributes  2" and two rows "label  text  115/115" and
"value  category  115/115", the second with its "..." visible because the pointer is not on it
but the mock shows it to document the verbs (a tooltip-style dark menu beside it lists "Colour
by, Size by, Filter by, Group by, Label by, Set as time, Set as type" with "Group by" checked,
because Conference was made from it); MADE BY collapsed; EXPORT; NOTES.

**Status bar.** "115 nodes  613 edges" | "Spread out: settled" | "Filter: 10 match" in place of
the selection count | "100%".

**Interaction illustrated.** Rule-based selection is a form, not a query language, and it
previews live in three places (count, table, canvas) before it exists. Create makes the Set
"value = 7" at the top of the tree; Select makes a transient selection the reader can Ctrl+G
later. Also the table as a secondary view: every Measure and Grouping is a column, membership
columns come last, and its rows are the same selection as the canvas.

## Screen 8: dark variant of screen 3

**Purpose.** Prove the visual language holds in dark: the same structure, the same one accent,
menus that were already dark, and the canvas colours unchanged.

**State.** Identical to screen 3 (Group 2 selected, its override, the halo), with
`data-theme="dark"` on the root and the mock's theme switch set to Dark.

**What changes**, from the Figma tokens (light / dark):
- Panel and popover surface #ffffff / #2c2c2c; canvas background #f5f5f5 / #1e1e1e (the
  element's dark canvas).
- Field fill, track and row hover #f5f5f5 / #383838; pressed and strong fill #e6e6e6 / #444.
- Text #000000 / #ffffff; secondary #00000080 / #ffffffb2; tertiary #0000004d / #ffffff66.
- Divider and field border #e6e6e6 / #444; translucent outline #0000001a / #ffffff1a.
- Brand fill (Share, the active tool, the selected row's tint) #0d99ff / #0c8ce9; focus ring
  the same.
- The dark menu, tooltip and secondary bar stay #1e1e1e in both themes.
- Node default grey #b3b3b3 / #757575 and edge grey #b3b3b3 / #5a5a5a on the canvas; the
  Okabe-Ito community colours, the #d55e00 override, the gold halo and the outline (which turns
  from #1e1e1e to #ffffff so it stays visible) are otherwise unchanged.
- The legend card is #2c2c2c with white text; the chips keep their colours.

**What does not change.** Every measurement, every row, every word. The screen must be
readable as the same screen.

**Interaction illustrated.** None new; it is the theme check. A reviewer should be able to lay
screen 3 and screen 8 side by side and find nothing moved.

## Revisions after the consistency audit (2026-09-25)

The audit in `../critique/consistency-audit.md` found four blockers. What changed, and where
this spec now differs from the text above:

- **Typeface.** `kit.css` declares the `@font-face` for `inter-roman-latin.woff2`, so every
  screen renders Inter at the 450 / 550 weights. All eight PNGs and the two kit sheets were
  re-shot.
- **One Dataset inspector.** Screens 2, 5 and 7 draw the same right panel from one generator
  (`tmp/object-first/fix-blockers.mjs`) on one row grid: `| 16 | label 68 | 8 | control 140 |
  8 |`. Two rows differ from the entries above: the Showing section's count moved into its
  header ("Showing  34 of 34") so the Show select is full width, and the Image export row is
  `Image [PNG v] [Export] [gear]` with the scale, transparency and legend options behind the
  gear (the "2x" select is gone). The left file header, the right zoom-and-Share bar and the
  inspector title block are the kit's `k-panel-file`, `k-panel-top` and `k-title2`, also on
  screen 3 and screen 8.
- **Screen 8 is generated from screen 3** by the same script: the theme attribute plus the
  canvas greys the theme implies (edges #5a5a5a, default node #757575, the outline Fill and
  the labels turn white). Edit screen 3, then re-run the script.
- **Screen 7** no longer draws the attribute verb menu open with no pointer on it; the verbs
  (Colour by, Size by, Filter by, Group by, Label by, Set as time, Set as type) are listed in
  `../object-model.md` section 4.1.
- **Screen 5's tree** is screen 3's tree with no row selected, at the kit's 24 px indent.

Still open from the audit (majors, not blockers): the tree count formats and placement on
screens 2, 4, 6 and 7; the legend card, mode switch, status chip and title block on screens
1, 4 and 6, which keep their local copies; the dark 32 px secondary bar on screen 5 against
the kit's light 40 px one; the toolbar 16 px above the status bar where the kit says 12.
