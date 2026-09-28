# Round 2: the fifteen screens to mock

Fifteen stills of the object-first graphty app as revised in `revision.md` (this folder). Each
entry gives the purpose, the exact state (data, objects, selection, tool, mask, mode), every
panel's contents row by row, and the interaction the screen shows. A mock is one static HTML
file per screen built from the round-1 kit (`../mocks/kit.css`, the icon sprite in
`../mocks/kit.html`), at a 1440 x 900 frame (the PNG adds a 60 px caption strip), light theme unless the entry says dark. Screen
11 is also drawn at 1280 x 800.

Conventions shared by every screen (the frame of `revision.md` section 1):

- **Layout.** Left panel 240 px, right panel 240 px, canvas between, status bar 24 px at the
  bottom. No rail, no top bar, no hamburger glyph. The floating toolbar sits bottom centre of the
  canvas, 56 px tall, radius 13, 12 px above whatever is under the canvas (the dock's handle,
  the open dock, or the time transport bar).
- **Left panel header** (48 px): the dataset name at 13/22 weight 550 with a chevron; the two
  halves are one split button (the name renames, the chevron opens the file menu: Open...,
  Open recent, Open sample, Add data..., Save project (Ctrl+S), Run a recipe..., Present,
  Settings..., Keyboard shortcuts, Help). Before a load the name reads "graphty" in secondary
  text.
- **Views** (40 px header, collapsible): "+" saves; a "..." with Export views..., Import
  views...; rows 32 px; the current view has the grey current-page fill and weight 550; a drift
  dot after its name when the camera has moved.
- **Objects** (40 px header with a find glyph, Ctrl+F, and a "..." holding "Suggestions"): tree
  rows 32 px: caret, kind icon, name, count in secondary text, state glyph if any, a 14 x 14
  Style chip, lock and eye on hover and when set. The selected row has the brand-tinted fill and
  weight 550; rows containing a selected node have the paler child-of-selected fill. **The count
  grammar**, one spelling everywhere: a pair is "N nodes  M edges" (two spaces, never a comma;
  the status bar, the welcome list, a summary row, the transport bar's "412 of 1,204 nodes
  1,910 of 5,830 edges" where "of" marks a subset); a tree row carries one count: none on the
  root (the status bar and the Overview tab have it), "5 nodes" on a node Set, "4 edges" on an
  edge Set such as a Path, "34 values" on a Measure, "4 groups" on a Grouping, "12" on a Group
  (its unit is the parent's). A count is never abbreviated to fit; a long name takes the
  ellipsis. The technical name ("Louvain", "Betweenness") is never in the tree: it is the
  row's tooltip and the inspector's kind line ("Measure  Betweenness" over "Bridges").
- **Right panel header** (48 px): the framing pill ("Fit v", "100% v" in 2D; its menu has the
  framings, zoom in and out, Reset view (Home), Save view) and **Export**, the one filled
  #0d99ff button. Disabled before a load.
- **Inspector header block** (144 px, never scrolls): the kind word in secondary text above the
  name (13/22 550); eye, lock, "..." at the right (Locate, Pin on a node); a summary row (chip,
  count, state); a reading row in secondary text ending in "?"; then the pill tabs (24 px tall
  in a 32 px row, 11 px weight 550 for every tab, 4 px of padding each side, 4 px apart, the
  selected one on a grey pill). Four tab names total at most 27 characters. Rows below are 32
  px on the 16 / 88 / 8 / 88 / 8 / 24 / 8 grid; section headers 40 px; a disclosure header
  carries its summary after the title. No tab exceeds 14 rows; at 1440 x 900 there are 18
  rows of room, so white space under a tab is intended.
- **Toolbar**, left to right: Select (V, 32 px, chevron, no label), Hand (H, 32 px, no label),
  divider, then 40 px buttons with a 16 px icon over an 8 px label: Filter (F, chevron),
  Neighbours (E), Path (P, chevron), Groups (G, chevron), Rank (R, chevron), Structure (S,
  chevron), divider, Note (N), Ask (backtick), divider, the mode switch [2D | 3D | VR | AR] as
  the sliding-thumb segmented control. 725 px wide. The armed tool has the brand fill. VR and
  AR are present because the mock browser reports support.
- **Secondary bar** (40 px, dark, radius 13, 8 px above the toolbar): drawn only while a tool
  is armed; its sentence per tool is in `revision.md` section 3.5.
- **Legend** (160 px card, panel surface, 200-level shadow): bottom right of the canvas, its
  bottom edge 12 px above the toolbar's top, 12 px from the right panel.
- **Status bar** at 11 px, in the priority order of `revision.md` section 1.6: counts and the
  mask at the left ("34 nodes  78 edges", "Focused on X: 6 of 34 [Exit]"), the computing chip,
  the stale chip, the layout chip ("Spread out: settled" with a pause glyph), the armed tool,
  the selection count, the XR state, and at the right the framing or zoom readout and the "?"
  ghost button (Help, Keyboard shortcuts, Open sample).
- **Bottom dock**: one dock with three pill tabs (Table, Assistant, History). Closed unless the
  entry says otherwise; closed, its tab strip stays as a 24 px handle above the status bar. The
  time transport bar (40 px) sits above the handle while a time window is on.
- **Style tabs** share one grammar: NODES and EDGES section headers, each with a "+"; every
  paint row and encoding block starts with its channel name.
- **Values are plausible, not computed.** Karate Club (`karate.gml`) has node ids 1 to 34 and
  no labels. College football (`football.gml`) has `label` (the team) and `value` (the
  conference, 0 to 11). The temporal dataset of screen 10 is invented: "Email network" with
  1,204 nodes, 5,830 edges, and a `sent` time column on edges from 2019-01 to 2019-12.

## Screen 1: first run, nothing loaded

**Purpose.** The empty state with the round-2 frame: no rail, no hamburger, one primary button,
two panels that hold nothing, the labelled toolbar with only Select and Hand live, the dock
handle and the "?".

**State.** No dataset. No objects, no selection. Select is the face, nothing armed. Mode 2D.
No overlays.

**Left panel.** Header "graphty" (secondary) with the chevron. VIEWS header with a disabled
"+", no rows. OBJECTS header with a disabled find glyph; three 32 px rows in secondary text:
"Open a file...", "Paste data...", "From a URL...".

**Canvas.** The Welcome sheet centred: a 15/25 heading "Open a graph", a dashed drop zone (400
x 120, "Drop a file here"), a "Choose a file" button (the only filled button on the screen), and
the sample list: "Karate Club  34 nodes  78 edges", "Cat social network  20 nodes  29 edges",
"College football  115 nodes  613 edges", "Email network  1,204 nodes  5,830 edges  over time";
each row has a chevron-right at its end and its blurb as a tooltip. Under the list, in secondary
text, "Recent" with one row "Continue College football (yesterday)". The toolbar is present
with every tool but Select and Hand at 30 percent, labels included. The dock handle (Table |
Assistant | History) at the bottom of the canvas, disabled.

**Right panel.** Header: framing pill and Export disabled. One row in secondary text: "Nothing
loaded".

**Status bar.** Empty except "100%" and the "?" at the right.

**Interaction.** The empty state announces nothing it cannot do; the sample rows look
clickable; the toolbar teaches its names by its labels before anything is loaded; the "?" is
visible before the reader is stuck.

## Screen 2: loaded, nothing selected, the Dataset inspector with its tabs

**Purpose.** The resting identity of both panels after a load: one tree row, three suggestion
rows, and the Dataset inspector on its Overview tab with the Layout, Canvas and Data tabs
visible in the strip. Nothing computed unasked.

**State.** Karate Club from the sample. No objects. Nothing selected. Select tool. Layout
"Spread out", settled. Mask: everything. Legend off. Mode 2D.

**Left panel.** Header "Karate Club" with the chevron. VIEWS: "+"; one row "Overview"
(current). OBJECTS: find glyph, "..."; rows: 1. "v Karate Club" (the root row carries no count) (root, 550,
a locked grey chip); 2. three indented suggestion rows in secondary text with a 16 px tool icon
each: "Find groups (G)", "Rank by connections (R)", "Find a path (P)"; tooltip "Same as
pressing G".

**Canvas.** 34 grey nodes (#b3b3b3), 1 px edges, no labels. Toolbar with Select active. The
dock handle under the canvas.

**Right panel.** Header: "Fit v" and Export. Header block: "Dataset" above "Karate Club";
actions "+" (Add data) and "..." (Close dataset, Reload, Re-run all stale, Import options...);
summary row: locked grey chip, "karate.gml, GML"; reading row: "34 nodes joined by 78 edges in
one connected part  ?" (the "?" popover also defines Density and Parts); tabs: **Overview**
(selected) | Layout | Canvas | Data.

Overview rows: "Nodes 34 | Edges 78"; "Direction  Undirected (file)  [Change...]";
"Density 0.139 | Mean links 4.6"; "Parts 1 | Weighted No"; "Import report  read 80, kept 78"
(disclosure, collapsed); FINDINGS header with "+", no rows; NOTES header with "+", no rows.
Seven rows; the panel ends with white space.

**Status bar.** "34 nodes  78 edges" | "Spread out: settled" (pause glyph) | "100%" | "?".

**Interaction.** The tab strip promises Layout, Canvas and Data without drawing them; the
reading is on the surface; the suggestion rows carry their keys so the toolbar's labels and the
rows say the same thing, and the Objects "..." brings them back later.

## Screen 3: the tree after two runs and a filter, Group 2 selected, its Style tab

**Purpose.** The heart of the model in the round-2 inspector: a Group selected, its members
haloed, and its Style tab showing the override above the inherited row, in the shared Style
grammar. The three-click recolour.

**State.** Karate Club. Objects in tree order (top is newest and highest in precedence):
1. "Degree > 8" - Set (rule: degree min 9), 5 nodes (1, 2, 3, 33, 34), Style: NODES > Outline
   2 px #1e1e1e; current.
2. "Connections (Degree)" - Measure, 34 values, Style: NODES > Size 0.8 to 2.0 (Colour was
   taken by Communities below it when it was created, so the Measure took Size, the second in
   its order); current.
3. "Communities (Louvain)" - Grouping, 4 groups, Style: NODES > Colour, Okabe-Ito, expanded:
   "Group 1" 12 (#e69f00), "Group 2" 11 (inherited #56b4e9, overridden to #d55e00; selected),
   "Group 3" 6 (#009e73), "Group 4" 5 (#cc79a7).
Selection: the Group 2 row; the element selection is its 11 members (a Group scope, assumed
present in this mock). Tool: Select. Mask: everything. Legend on. Mode 2D.

**Left panel.** Header "Karate Club". VIEWS: "Overview" current. OBJECTS rows: 1. "v Karate
Club  34 nodes  78 edges" (root, locked chip); 2. "Degree > 8  5 nodes" (set icon, a white chip
with a 2 px dark ring); 3. "Connections (Degree)  34 values" (measure icon, a small-to-large
dots chip); 4. "v Communities (Louvain)  4 groups" (grouping icon, a four-colour strip); 5.
"Group 1  12" (chip #e69f00); 6. "Group 2  11" (chip #d55e00 with a small override dot;
selected, brand-tinted, 550, eye and lock visible); 7. "Group 3  6"; 8. "Group 4  5".

**Canvas.** Nodes coloured by community; Group 2's eleven nodes are #d55e00 with the gold
selection halo; sizes vary with degree; nodes 1, 2, 3, 33, 34 outlined; six labels ("34", "1",
"33", "3", "2", "9") from the label budget "Top 6 by Connections". Legend at the bottom right,
above the toolbar's right end: a 160 px card with "Communities" (four swatch rows, Group 2's
swatch orange, counts at the right) and "Connections" (a size glyph, "1 to 17"). Toolbar:
Select active.

**Right panel.** Header block: "Group" above "Group 2"; eye (on), lock (off), "..." (Select
members, Focus on this, Locate); summary row: chip #d55e00, "11 nodes, 32% of the scope";
reading row: "Group 2 of 4 in Communities.  ?" (written from the run's group fields); tabs:
Define | Members | **Style** (selected) | Record.

Style rows: NODES header with "+"; "Colour [chit #d55e00] D55E00  100 %  [eye] [-]" (the
override, editable); "Colour [chit #56b4e9] From Communities  [lock]" in secondary
text, no fields; EDGES header with "+" and one row in secondary text "Inside edges 20" (the
group's edges are paintable because the induced-edge selector is assumed present in this mock;
the row is the empty-section header otherwise). Under the sections, in secondary text:
"Covered by nothing". Six rows.

**Status bar.** "34 nodes  78 edges" | "Spread out: settled" | "11 selected" | "100%" | "?".

**Interaction.** Select a row, click the chip, pick: three clicks, and the colour is a style
layer on an object in the tree. The inherited row's chit is clickable and creates the override.
The tab strip shows Define, Members and Record without scrolling to them.

## Screen 4: the Rank tool armed, its secondary bar, the flyout and the parameters popover

**Purpose.** The moment before a run under the one rule for every creation tool: Rank is armed,
the secondary bar says what will run, on what, and at what cost, with Run and Cancel; the
flyout is open with kind icons, plain and technical names and costs; and the parameters popover
is open from a row's "...". No dialog.

**State.** College football loaded. Objects: "Conference" - Grouping by the `value` attribute,
12 groups, NODES > Colour (a 12-colour categorical palette), collapsed; current. Nothing
selected. Tool: Rank, armed (brand fill). The secondary bar reads "Rank by [Bridges v] on what
is showing, 115 nodes, about 2 s  [Options]  [Run]  Cancel" (the reader has already chosen
Bridges in the select, so the flyout's bold face row is Bridges). The flyout is open above the
toolbar; the row "Bridges" has its "..." pressed and the parameters popover is open to the
right of the flyout, 240 px, light. Mask: everything. Legend on. Mode 2D.

**Left panel.** Header "College football". VIEWS: "Overview". OBJECTS: "v College football" (the root row carries no count); "> Conference  12 groups" (strip chip).

**Canvas.** 115 nodes coloured by conference, uniform size, no labels (no Measure yet). Above
the toolbar the secondary bar, full sentence as above, Run as its one light button. Above it,
aligned to Rank's chevron, the dark flyout (radius 13, 32 px rows), each row led by the
Measure kind icon at 16 px, the plain name (the face row bold), the technical name in secondary
white, the cost at the right: "Connections  Degree centrality  instant"; "Bridges  Betweenness
centrality  about 2 s" (bold; its "..." pressed); "Reach  Closeness centrality  about 2 s";
"Influence  PageRank  instant"; "Influence by association  Eigenvector centrality  instant";
"Influence at a distance  Katz centrality  instant"; "Hubs and authorities  HITS  instant";
"Exploration order  Depth-first search  instant"; a divider; "Several...". Rows for Clustering,
Bridges (edges) and Unusual nodes are absent (unregistered; a row appears when the capability
does). To the right of the flyout, the light popover with a caret at the Bridges row: header
"Bridges" with a close "x"; "On what is showing  115 nodes" in secondary text; "Weights [switch
off] | Direction [As loaded v]"; "Exact [switch on]"; "Sample [2,000]" disabled (exact is on);
"About 2 s" in secondary text (the backend word waits on the element's `backend` field and is
not drawn); a 32 px row with one secondary button "Run" (not filled; Export stays the only
primary). Toolbar: Rank armed.

**Right panel.** The Dataset inspector on Overview as screen 2 for College football: "Nodes 115
| Edges 613"; "Direction  Undirected (file)  [Change...]"; "Density 0.094 | Mean links
10.7"; "Parts 1 | Weighted No"; "Import report  read 613, kept 613"; FINDINGS "+"; NOTES "+".

**Status bar.** "115 nodes  613 edges" | "Spread out: settled" | "Rank: Bridges" (the armed
tool) | "100%" | "?".

**Interaction.** Pressing R armed the tool and opened the bar; nothing ran. Run or Enter in the
bar runs the sentence; a click on a flyout row runs that row at once; the "..." asks first.
Every row prints its cost before the click. Pressing Run creates the row at the top of the tree
and the tool snaps back to Select.

## Screen 5: the same run computing, beside a waiting object

**Purpose.** The live states side by side: one object computing with a progress ring and
Cancel, one waiting over the cost gate with a "Run (about 4 min)" button in its row, the
computing chip in the status bar, and the tool already back on Select.

**State.** College football. Objects in tree order: 1. "How far from everything (Eccentricity)"
- Measure, **waiting** (created from Structure > How far from everything; the estimate, 4 min
on this mock's machine, is over the gate); 2. "Bridges (Betweenness)" - Measure, **computing**
at 42%, selected (the run started from screen 4); 3. "Conference" - Grouping, 12 groups,
collapsed, current. No element selection (a Measure row clears it). Tool: Select. Mask:
everything. Legend on. Mode 2D.

**Left panel.** Header "College football". VIEWS: "Overview". OBJECTS rows: 1. "v College
football  115 nodes  613 edges"; 2. "How far from everything  (o) [Run (about 4 min)]" (measure
icon, a hollow-circle glyph, the count slot is a small secondary button, no chip yet); 3.
"Bridges (Betweenness)  [ring 42%]" (measure icon, a 12 px progress ring at 42% in the count
slot, no chip yet; selected, brand-tinted, 550); 4. "> Conference  12 groups" (strip chip).

**Canvas.** As screen 4 without the bar, flyout and popover (nothing has painted yet; the ring
is honest). Toolbar: Select active.

**Right panel.** Header block: "Measure" above "Bridges (Betweenness)"; eye, lock, "...";
summary row: no chip, "Computing 42%  [Cancel]" with "sampling" in secondary text after it
(the "on the CPU" word waits on the element's `backend` field); reading row empty (nothing to
read yet); tabs: Values | **Define** (selected; a computing or waiting object opens on Define)
| Style | Record.

Define rows: "Method  Bridges (Betweenness)  (i)"; "Weights [switch off] | Direction [As
loaded v]"; "Exact [switch on]"; "Within  Everything" (read-only, secondary); ADVANCED
disclosure "1 option" collapsed. Five rows.

**Status bar.** "115 nodes  613 edges" | "Computing 1 of 1 [Cancel]" (the computing chip) |
"Spread out: settled" | "100%" | "?".

**Interaction.** The row appears instantly, always: computing with a ring, or waiting with the
verb in the row so the second click lands where the first did. Cancel in the summary row and in
the chip. When Bridges finishes: the ring becomes "115 values", the chip a ramp, the inspector
switches to Values, and the legend gains a block. The waiting row is an object with no run
("defined, not started"), which is element work named in `revision.md` section 8.

## Screen 6: a Measure selected, continuous encoding (colour scale plus size)

**Purpose.** The other family's Style tab in the shared grammar: NODES with two encoding blocks
(Colour open: scale, palette, values from and to, clamp, missing, legend preview; Size
collapsed), EDGES empty with its "+", on one screen without scrolling, and the Values tab one
click away.

**State.** Karate Club. Objects: 1. "Influence (PageRank)" - Measure, 34 values, Style: NODES >
Colour (viridis, Even steps, values 0.010 to 0.101) and NODES > Size (0.8 to 2.2); selected;
current. 2. "Communities (Louvain)" - Grouping, 4 groups, NODES > Colour Okabe-Ito, collapsed;
fully covered on Colour by Influence above it (its chip drawn at 50 percent). No element
selection. Tool: Select. Mask: everything. Legend on. Mode 2D.

**Left panel.** Header "Karate Club". VIEWS: "Overview". OBJECTS: "v Karate Club" (the root row carries no count); "Influence (PageRank)  34 values" (viridis ramp chip; selected); "> Communities
(Louvain)  4 groups" (strip chip at 50 percent).

**Canvas.** Every node on the viridis ramp and sized by the same value; nodes 34 and 1 largest
and yellowest; labels "Top 6 by Influence". Legend at the bottom right: "Influence" with a 120
x 12 ramp, "0.010" and "0.101", then a size glyph "0.8x to 2.2x"; no Communities block (it
paints nothing visible). Toolbar: Select active.

**Right panel.** Header block: "Measure" above "Influence (PageRank)"; eye, lock, "...";
summary row: ramp chip, "34 values"; reading row: "Node 34 has the most influence; the top
three hold a third of it.  ?"; tabs: Values | Define | **Style** (selected) | Record.

Style rows: NODES header with "+" (Colour, Size, Opacity, Outline width, Glow, Label, "Colour
and size"); block 1 open: "Colour [ramp chip]  [eye] [-]  v" (the block header); "Scale [Even
steps v]"; "Palette [a 156 x 14 viridis ramp v]"; "Values from [0.010] | to [0.101]" (a 50 px
captioned two-column row); "[ ] Clamp outliers   [ ] Reverse   Reset" (one 32 px row of two
checkboxes and a text button); "Missing [chit #b3b3b3]"; "Legend" with a 208 x 14 preview strip
and end labels; block 2, collapsed to its header: "Size  0.8x to 2.2x  [eye] [-]  >"; EDGES
header with "+" (Width, Colour, Opacity), no rows. Eleven rows.

**Status bar.** "34 nodes  78 edges" | "Spread out: settled" | "100%" | "?".

**Interaction.** Changing the palette, scale or values repaints at once; opening the Size block
collapses Colour, so two channels always fit; the covered Grouping beneath says so on its own
Style tab ("Covered by Influence on 34 of 34 members") and its legend block is gone.

## Screen 7: a Grouping selected, the group palette with one override

**Purpose.** Group values: the Grouping's Style tab with the Colour block, the palette select,
five swatch rows (one carrying an override dot) then "and 7 more", the Other colour, the
overflow policy and "Show the largest"; and the Groups tab's rows one click away.

**State.** College football. Objects: 1. "Conference" - Grouping by `value`, 12 groups, Style:
NODES > Colour, palette "Nine Soft Colours" (the element's tol-muted, capacity 9), overflow
Other, Largest 8; conference "4" (Conference USA, 10 teams) overridden to #d55e00; selected;
expanded to its 8 largest Group rows plus one collapsed "Other" row. No element selection.
Tool: Select. Mask: everything. Legend on. Mode 2D. The sizes are the real conference sizes of
football.gml (13, 12, 12, 11, 10, 10, 10, 9, 8, 8, 7, 5).

**Left panel.** Header "College football". VIEWS: "Overview". OBJECTS: "v College football"
(the root row carries no count); "v Conference  12 groups" (strip chip; selected); then "6
13", "3  12", "9  12", "2  11", "4  10" (chip #d55e00 with the override dot), "8  10", "11
10", "0  9", "Other  28" (a collapsed row with a grey chip and a chevron; its tooltip "Other (4
more)"). Names are the raw values because "Names from" is none.

**Canvas.** 115 nodes coloured by conference; conference 4's ten nodes orange; the four
smallest conferences (1, 7, 10 and 5: 28 teams) grey (Other); no labels. Legend: "Conference"
with 8 rows, then "Other (4 more)  28" with the grey swatch. Toolbar: Select active.

**Right panel.** Header block: "Grouping" above "Conference"; eye, lock, "..." (Sort groups by
size, Name groups from an attribute..., Delete); summary row: strip chip, "12 groups"; reading
row: "12 conferences; the largest has 13 teams.  ?"; tabs: Groups | Define | **Style**
(selected) | Record.

Style rows: NODES header with "+" (Shape, Outline, Label); "Colour [strip chip]  [eye] [-]  v"
(the block header); "Palette [the nine-colour strip v]  9 colours" (the select's face is the
palette itself, its name in the tooltip); five swatch rows "[chit] 6  13", "[chit] 3  12",
"[chit] 9  12", "[chit] 2  11", "[chit #d55e00, dot] 4  10" (the chit is a 14 x 14 button; the
list is in group order by size); "and 3 more" in secondary text (expands in place to the eight
named groups); "Other [chit #b3b3b3]"; "Overflow [Other v]"; "Largest [8 v]  rest as Other"
(every label on the one 68 px label grid); EDGES header with "+" (Colour), no rows. Twelve rows.

**Status bar.** "115 nodes  613 edges" | "Spread out: settled" | "100%" | "?".

**Interaction.** Click a chit: the picker opens and the pick becomes that Group's override (a
layer directly above the palette's); the dot marks it; the Group's own Style tab shows the
override row above "Colour  From Conference". "Largest" bounds both the tree
and the legend.

## Screen 8: two Paths layered as edge styles, with the legend

**Purpose.** Highlights are not exclusive: two routes in the tree at once, each an edge style
layer with its own colour, width and pattern; path nodes outlined rather than filled so the
community colours stay visible; a shared edge showing the per-channel rule; the legend listing
both with width and pattern; the selected Path's Style tab with its NODES and EDGES sections.

**State.** Karate Club. Objects in tree order: 1. "Path: 12 -> 30" - Set, 6 nodes 5 edges,
Style: EDGES > Colour #7b3294 (the highlight palette's second colour, a purple no shipped
categorical palette uses), Width 3, Pattern Dash; NODES > Outline 2 px in the same colour;
selected. 2. "Path: 1 -> 34" - Set, 5 nodes 4 edges, Style: EDGES > Colour #c51b7d (the
highlight palette's first colour, a magenta), Width 5, Pattern Solid, Arrows head Normal;
NODES > Outline 2 px in the same colour. 3. "Communities (Louvain)" - Grouping, 4 groups,
collapsed, current (its colours show on every node, path nodes included). The two routes share
the edge 3 -> 33. Element selection: the six members of the selected path (gold halo). Tool:
Select. Mask: everything. Legend on. Mode 2D. (The two highlight colours are placeholders for
the element's disjoint highlight palette; the mock's job is to show them differing from every
Okabe-Ito colour on the canvas.)

**Left panel.** Header "Karate Club". VIEWS: "Overview". OBJECTS: "v Karate Club" (the root row carries no count); "Path: 12 -> 30  5 edges" (an edge Set counts its edges; a path icon with a line glyph, chip:
a purple dashed line; selected); "Path: 1 -> 34  4 edges" (chip: a magenta solid line); ">
Communities (Louvain)  4 groups".

**Canvas.** Community colours on every node; route 1 -> 34 drawn 5 px solid magenta with
arrowheads, its five nodes ringed magenta; route 12 -> 30 drawn 3 px dashed purple, its six
nodes ringed purple with the gold halo outside the ring; the shared edge 3 -> 33 is purple
(the higher row's Colour wins), 3 px (the higher row writes Width) and dashed, with no
arrowhead (the higher row writes no Arrows, so the lower row's Arrows would show; the mock
draws the arrowhead in purple to make the per-channel rule visible, and the caption says so).
Node 3 and node 33 carry both rings, purple outside. Labels on the path endpoints. Legend at
the bottom right: "Communities" (four rows), then "Path: 12 -> 30" with a purple dashed 3 px
line swatch and "Path: 1 -> 34" with a magenta solid 5 px line swatch, no counts (the tree and
the summary row carry them). Toolbar: Select active.

**Right panel.** Header block: "Set" above "Path: 12 -> 30"; eye, lock, "..." (Select members,
Focus on this, Locate, Dim the rest, Duplicate, Delete); summary row: purple dashed chip, "6
nodes  5 edges"; reading row: "The shortest route from 12 to 30 has 5 hops.  ?"; tabs:
Define | Members | **Style** (selected) | Record.

Style rows: NODES header with "+"; "Outline [chit #7b3294] 2 px  [eye] [-]"; EDGES header with
"+"; "Colour [chit #7b3294] 7B3294  100 %  [eye] [-]"; "Width [3]  [eye] [-]"; "Pattern [Dash
v]  [eye] [-]"; under the sections, in secondary text: "Shares 1 edge with Path: 1 -> 34; this
path wins Colour, Width and Pattern on it". Seven rows.

**Status bar.** "34 nodes  78 edges" | "Spread out: settled" | "6 selected" | "100%" | "?".

**Interaction.** A second path did not delete the first. Dragging "Path: 1 -> 34" above the
other flips the shared edge to magenta, 5 px, solid with an arrowhead. The EDGES "+" offers
Arrows, Animation, Opacity, Curve and Label (hop order); the NODES "+" offers Colour for a
reader who wants a fill after all. "Dim the rest" in the overflow adds a linked Set below this
one. In the element one Path is two layers (nodes and edges), so "Covered by" counts are per
section.

## Screen 9: a node selected, with the data table drawer open

**Purpose.** The material: a node's inspector on its About tab, which leads with the node (its
attributes and its links) before the sections about objects, with the tabs Attributes and Links
in the strip; the bottom dock on Table with the same node's row selected, object columns after
attribute columns.

**State.** College football with the objects of screen 5 finished: 1. "Top 10 by Bridges" -
Set, 10 nodes, linked to the Measure below, NODES > Outline 2 px; 2. "Bridges (Betweenness)" -
Measure, 115 values, NODES > Size 0.8 to 2.4 (Colour was taken by Conference); 3.
"Conference" - Grouping, 12 groups, NODES > Colour, collapsed. Element selection: the node
"BrighamYoung", clicked in the table (by the real betweenness of football.gml it ranks 2nd;
FloridaState, round 1's node, ranks 25th and is not in the top ten). No object selection. Tool: Select. Mask: everything.
Legend off (to keep the canvas clear). Mode 2D. The dock is open on Table, 320 px tall, Nodes
tab, showing what is showing, sorted by label.

**Left panel.** Header "College football". VIEWS: "Overview". OBJECTS: "v College football" (the root row carries no count); "Top 10 by Bridges  10 nodes" (ring chip; child-of-selected fill because
BrighamYoung is a member); "Bridges (Betweenness)  115 values" (size chip); "> Conference  12
groups" (strip chip; child-of-selected fill).

**Canvas** (the upper 560 px). Nodes coloured by conference, sized by betweenness, the top ten
outlined; BrighamYoung haloed with its label. Toolbar: Select active.

**Dock** (below the canvas, above the status bar): a 32 px header row: pill tabs "Table"
(selected) | "Assistant" | "History"; then "Nodes 115" (selected) | "Edges 613"; "Showing
[Everything v]"; a search field at the right; a close "x". Column headers (32 px, 550, sortable,
"..." on hover): "label" (sorted, caret), "value", "id", then the object columns with the
object's chip in the header: "Bridges", "Conference", "Top 10 by Bridges" (a check column).
Eight visible 32 px rows: "Baylor  3  10  0.007  3  -"; "BoiseState  11  28  0.018  11  -";
"BostonCollege  1  29  0.009  1  -"; "BowlingGreenState  6  31  0.008  6  -"; "BrighamYoung  7
0  0.033  7  yes" with the brand-tinted selected fill (scrolled into view); "Buffalo  6  34
0.008  6  -"; "California  8  111  0.007  8  -"; "CentralFlorida  5  36  0.013  5  -". A 16 px row handle at
the left of each row. (The Edges tab needs the element's `getEdges`, #297 "update attributes
after load"; the object columns need column-to-ids, #148. Both are named in `revision.md`
section 6.12.)

**Right panel.** Header block: "Node  id 0" above "BrighamYoung"; actions Locate, Pin (off),
"..." (Style its group (Conference 7)..., Add to [set], Copy id, Copy as JSON, Copy position,
Follow, What breaks if removed, Remove from data...); summary row: no chip, "12 neighbours";
no reading row; tabs: **About** (selected) | Attributes | Links.

About rows: "label  BrighamYoung"; "value  7"; "id  0"; "All 3 attributes >" (this sample has
three; a richer file would show "All 23 attributes >"); "Connected to 12 nodes >"; VALUES
header; "Bridges  0.033  rank 2 of 115  >"; "Conference  7  >"; MEMBER OF header with one chip
inline "[ring chip] Top 10 by Bridges"; LOOK disclosure, collapsed, "Colour from Conference,
Size from Bridges, Outline from Top 10 by Bridges"; NOTES header with "+". Eleven rows.

**Status bar.** "115 nodes  613 edges" | "Spread out: settled" | "1 selected" | "100%" | "?".

**Interaction.** A row click in the table is the same selection as a canvas click; the
inspector reads the node first (what it is, who it connects to) and its object sections second;
opening LOOK shows one row per painted channel and its "+" is "Style this node..."; the tree
tints every row containing it; Attributes and Links are tabs, not a scroll.

## Screen 10: the timeline, a temporal dataset with a time window, the transport and its gear

**Purpose.** Time as a mask: the transport bar under the canvas with the window band and tick
marks, its gear popover open (the settings that used to be a fifth Dataset tab), the Dataset
inspector on its Data tab with the "Time [sent v]" row, a cheap Measure and its cut Set ticking
because "Re-run objects while playing" is on, and a Grouping keeping its whole-year values with
a caveat, not a stale dot.

**State.** "Email network" loaded (1,204 nodes, 5,830 edges; the edge column `sent`, 2019-01
to 2019-12, has the time role; no node time column). Objects in tree order: 1. "Active senders"
- Set (cut: Of [Connections >] Above [20]), 58 nodes, NODES > Outline 2 px; current at this
window. 2. "Connections (Degree)" - Measure, scope what is showing, 412 values, NODES > Size;
current at this window (re-run per step, 40 ms). 3. "Communities (Louvain)" - Grouping, 9
groups, NODES > Colour Okabe-Ito, collapsed, **current**, computed on the whole year; its
summary row and legend block carry "computed on 2019-01 to 2019-12". Nothing selected (the
Dataset inspector shows, on its Data tab). Tool: Select. Mask: the time window 2019-03 to
2019-05 (sliding, 3 months); Focus off. Legend on. Mode 2D. Playback paused at 2019-05. The
transport bar's gear popover is open.

**Left panel.** Header "Email network". VIEWS: "Overview". OBJECTS: "v Email network" (the root row carries no count); "Active senders  58 nodes" (ring chip); "Connections (Degree)  412
values" (size chip); "> Communities (Louvain)  9 groups" (strip chip; no state glyph).

**Canvas** (above the transport bar). 412 nodes and 1,910 edges drawn: the edges whose `sent`
is inside the window and the nodes that have at least one of them (nodes follow their edges;
the rest are absent, because "Show hidden faintly" is off); community colours as computed on
the whole year; nodes sized by their in-window connections; 58 outlined nodes; no labels.
Legend: "Communities" (8 rows, "and 1 more"), and under its title a secondary line "computed on
2019-01 to 2019-12"; "Connections" with a size glyph. Toolbar: Select active, 12 px above the
transport bar.

**Transport bar** (40 px, full canvas width, above the dock handle): "2019-03 to 2019-05" (11
px, 550); [<] [Play] [>] as 24 px ghost buttons; "Speed [1x v]"; a slider across the rest of the
width with month ticks, the end labels "2019-01" and "2019-12", the window drawn as a brand-
tinted band with two handles snapped to month ticks, and small dark tick marks at 2019-04 and
2019-09 (high change counts); at the right "412 of 1,204 nodes, 1,910 of 5,830 edges", a gear
(pressed) and a close "x".

**Gear popover** (240 px, light, caret at the gear, opening upward): "Time attribute [sent v]"
(edges; the row reads "From [start v] To [end v]" for interval data such as a GEXF file);
"Nodes by [none v]" (no node time column in this sample; nodes follow their edges); "Unit
[Month v]"; "Window from [2019-03] | to [2019-05]" (a 50 px captioned row); "Mode [Sliding |
Cumulative]" (segmented); "Step [1 month v]"; "Re-run objects while playing [switch on]" with
the caption "cheap objects only; Communities (about 4 s) keeps its values"; "Re-run layout per
step [switch off]"; CHANGES disclosure "12 steps, peaks in Apr and Sep" collapsed; OVER TIME
header with "+" (Structure > Over time lives here), no rows. Ten rows.

**Right panel.** Header block: "Dataset" above "Email network"; "+", "..."; summary row: locked
chip, "email.csv, CSV"; reading row: "1,204 people joined by 5,830 emails over 12 months, in 3
parts.  ?"; tabs: Overview | Layout | Canvas | **Data** (selected).

Data rows: ATTRIBUTES header with "+"; "[text] from  100%  ..."; "[text] to  100%  ...";
"[time] sent  100%  ..." (the time glyph filled, because it carries the role); "[text] subject
94%  ..."; "[number] size  100%  ..."; "Time [sent v]"; "Made by  email.csv, CSV, 3 fetches"
(disclosure, collapsed). Eight rows.

**Status bar.** "1,204 nodes  5,830 edges  2019-03 to 2019-05: 412 of 1,204" | "Spread out:
settled" | "100%" | "?". No stale chip: nothing is stale.

**Interaction.** Dragging the band or pressing Play moves the mask; because the switch is on,
"Connections" re-runs each step (40 ms) and "Active senders" ticks with it (61, 58, 64);
Communities keeps its paint and its caveat until the reader presses its own Re-run, which runs
at the current window; Escape pauses first. With the switch off (the default) nothing re-runs
and nothing turns amber; the counts in the bar still move. The bar is the surface, the gear
its property, and neither is a tree row. Before the reader took a door, the Overview's Findings
section carried "Time column: sent, 2019-01 to 2019-12 [Show over time]"; that row is gone now
the role is set.

## Screen 11: the toolbar reference sheet, at 1600 and at 1280

**Purpose.** Every toolbar button and every flyout, expanded and labelled on one page, as the
kit sheet documents the kit: the specification of `revision.md` section 3 as a picture, drawn
twice so the bar's 725 px is seen against both canvas widths.

**State.** Not an app screen: a white page in the kit's type, 1600 x 1000 (scrolling if
needed), with the toolbar drawn at the top at 1:1 and each flyout drawn open beneath its tool
in a column, plus the secondary bars and the parameters popover as examples. A second render at
1280 x 800 draws only its first band (the toolbar between two 240 px panel outlines and the
legend card) to show the fit.

**Content, top to bottom.**
1. The toolbar at 1:1 with a callout line from each button to a caption: "Select  V", "Hand
   H", "Filter  F", "Neighbours  E", "Path  P", "Groups  G", "Rank  R", "Structure  S", "Note
   N", "Ask  backtick", "2D / 3D / VR / AR  (5 toggles 2D and 3D)"; a dimension line "725 px";
   and, at 1280, the two panel outlines with "800 px canvas" and the 160 px legend card drawn
   above the bar's right end.
2. Six columns, one per flyout, each the dark menu drawn open with every row from
   `revision.md` section 3.4, the kind icon at the left of every row (Set, Measure, Grouping,
   Finding), the technical name in secondary white and the cost at the right; the face row
   bold; rows that are proposed carry their issue number in secondary text at the far right
   ("#329", "#311", "#194", "#330", "#55", "#149") and are drawn at 50 percent to say "not
   yet". The Select column shows "Select", "Lasso" and the "Front only" checkbox. The Filter
   column shows "Target [Nodes | Edges]" above its rows. A caption under the Path column reads
   "flow rows land here"; under Structure, "prediction rows land here".
3. Three example strips under the columns: the Rank secondary bar ("Rank by [Connections v] on
   what is showing, 115 nodes, instant  [Options]  [Run]  Cancel"), the Path secondary bar
   ("Pick the end node  [Shortest route v]  Cancel"), and the parameters popover for Groups >
   Communities (the scope line, "Resolution [1.0] | Seed [42] [dice]", "Iterations [100]",
   "Weights [switch] | Direction [As loaded v]", "About 80 ms", [Run]).
4. A footnote row in secondary text: "Every flyout row is also a Ctrl+K command under both
   names. A plugin algorithm appears in the flyout its catalogue entry names. On a fresh
   session the faces are Select, By values, Shortest route, Communities, Connections, Separate
   pieces."

**Interaction.** None; it is the reference. A reviewer should be able to count the buttons
(nine plus the mode switch) and the flyout rows (Select 3, Filter 7 plus the target row, Path
6, Groups 9, Rank 12, Structure 8) against section 3.

## Screen 12: screen 3 in the dark theme

**Purpose.** Prove the visual language holds in dark with the round-2 frame: the same
structure, the same one accent, the tab strip, the labelled toolbar and the canvas colours
unchanged.

**State.** Identical to screen 3 (Group 2 selected on its Style tab, its override, the halo),
with `data-theme="dark"` on the root.

**What changes**, from the Figma tokens (light / dark): panel and popover surface #ffffff /
#2c2c2c; canvas #f5f5f5 / #1e1e1e; field fill, track and row hover #f5f5f5 / #383838; pressed
and the selected pill tab #e6e6e6 / #383838; text #000000 / #ffffff; secondary #00000080 /
#ffffffb2; tertiary #0000004d / #ffffff66; dividers #e6e6e6 / #444; brand fill (Export, the
armed tool, the selected row's tint) #0d99ff / #0c8ce9; the mode switch track #f5f5f5 / #444
with its white thumb becoming #2c2c2c; dark menus, tooltips and the secondary bar stay #1e1e1e.
On the canvas the default node grey #b3b3b3 / #757575 and edge grey #b3b3b3 / #5a5a5a; the
Okabe-Ito colours, the #d55e00 override and the gold halo unchanged; the outline style and the
labels turn from #1e1e1e to #ffffff so they stay visible. The legend card is #2c2c2c with white
text; the dock handle's strip follows the panel surface.

**What does not change.** Every measurement, every row, every word, every tab. Screen 3 and
screen 12 side by side should show nothing moved.

**Interaction.** None new; the theme check. Only the element can turn the outline and the base
greys (#291 "canvas background does not follow light and dark theme", #331 "implement
session.catalog.themes()").

## Screen 13: the Settings sheet

**Purpose.** The one place for everything that is a preference of the reader or the machine
rather than a property of the data: the eleven inventory capabilities that had no home, laid
out once so the file-menu row "Settings..." is not a promise.

**State.** College football loaded as screen 2. File menu > Settings... (Ctrl+,) opened the
sheet: the kit's 480 px dialog centred over a scrim, with a close "x" and a Done button. Round 3
replaced the specified 640 x 480 sheet with a left section list by this dialog, its eight
sections as disclosures in one list (each closed one shows its current values as a one-line
summary; several may be open), because the inspector already uses that grammar and it needs no
new component (`design/ui/object-first-ux/round-3/file-project.md` section 8). Drawn open:
General, Performance, Assistant. Behind it the app as screen 2 for College football.

**Sections**, in order: General, Canvas, Camera, Analysis, Performance, Headset, Assistant,
Advanced.

**Rows per section:**
- General: Theme [Follow system v]; Autosave [switch, on] with Keep closed sessions [7 days v];
  Author name for notes [field]; Language [English v]; "Show the welcome sheet at start"
  [switch].
- Canvas: Selection halo [chit] [width]; "Animate layout changes" [switch] "500 ms";
  "Highlight neighbours on hover [Off | Neighbours | 2 steps]" with "dim the rest" [switch];
  Tooltip delay [1000 ms].
- Camera: Starting distance [Fit v]; "Reset view" key hint "Home"; Orbit sensitivity [slider];
  "Invert wheel" [switch].
- Analysis: "Run when data loads" with a checklist (Connections, Communities, Separate pieces;
  all off by default); Cost gate [30 s v] ("ask before a run longer than"); "Exact above
  [2,000] nodes: sample instead" [switch].
- Performance (drawn): Acceleration [Auto v] (Auto, Off, Required); "Use the GPU above [5,000]
  nodes"; the state line in secondary text "Active: NVIDIA T4, WebGPU" (or "Unavailable: needs
  a secure context"); [Measure this machine (about 10 s)]; Rendering [WebGL v] (WebGPU when
  #36 lands); "Show frame stats" [switch]; Render ceiling [200,000] nodes (#302).
- Headset: Teleportation [switch]; Hand tracking [switch]; Controllers [Both v]; Reference
  space [Local floor v]; Z-axis amplification [1.0].
- Assistant: Provider [Anthropic v] (Anthropic, In-browser (WebLLM), None); Model [v]; API key
  [field] with "Keep the key [This session | On this device | Never]"; the privacy line
  "Questions send a sample of up to 50 nodes and their attributes to the provider".
- Advanced: Logging [Warnings v]; "Send logs to [none v]" (the log sinks); "Copy diagnostics"
  button; "Reset all settings".

**Status bar.** As screen 2 for College football.

**Interaction.** Every row writes a setting the element reads (`session.capabilities`, the
acceleration policy, the AI provider) or a preference of the app (theme, author name); nothing
here is graph state, so nothing here is in the tree or the project file except the author name
on notes. Import options (repeated edges, id coercion, endpoint spelling, position scale) are
not here: they are a property of the Dataset (its "..." > Import options...).

## Screen 14: the Import dialog, a preview and column roles as selects

**Purpose.** The one dialog of the session, drawn: the analyst's first minute and the novice's
first file. The mapping fields are selects listing the file's columns, never typed text, and
a five-row preview shows the file before anything loads.

**State.** Nothing loaded. The reader dropped `email.csv` on the Welcome sheet; the sheet is
replaced by the dialog over the empty stage (scrim, the kit's 480 px dialog, centred). The
left panel, the toolbar and the inspector are screen 1's.

**Dialog.** Header "Import email.csv" with a close "x". Rows: "Format [CSV, detected v]  5,831
rows, 5 columns" (the select lists what `catalog.formats()` lists; the counts come from the
peek); a preview table, the header row in secondary text ("from", "to", "sent", "subject",
"size") and five data rows exactly as the file has them; a "Columns" section header; "Source
[from v]", "Target [to v]", "Weight [none v]", "Time [sent v]  2019-01 to 2019-12", "Direction
[Directed v]" (each select lists the file's columns, "none" first where the role is optional;
the time select's note is the column's range, from the peek); one line of secondary text "Will
load 1,204 nodes and 5,830 edges. Roles can be changed later from the Data tab." Footer:
[Cancel] [Load] (Load is the screen's one filled button; Enter presses it).

**Interaction.** The dialog opens for any file the detector cannot map on its own, and for every
file when the reader opened it through Open... rather than a drop (a drop with a confident
detection loads at once and the same rows appear afterwards as the Data tab's "Made by"
mapping). Before the load the element reads the header and a sample (`session.data.peek(file)`,
new: the column names, the detected types, five rows, the row count; `revision.md` section 8),
which is what fills the selects and the preview. A format's own options (separator, variant)
sit in a disclosure "Options" under the Format row when the descriptor declares any.

## Screen 15: reload keeping the objects, a column role changed after the first runs

**Purpose.** The route that used to destroy the tree. Until graphty-element can re-map weight,
label and direction in place, "Change..." on the Overview's Direction row, "Set as weight" and
"Set as label" on the Data tab all reload the file; this dialog keeps the objects and re-runs
them, and says what it costs.

**State.** Karate Club with the tree of screen 3 (Degree > 8, Connections, Communities with
its four Groups), nothing selected, the Dataset's Overview tab open; the reader pressed
"Change..." on the Direction row. The canvas keeps screen 3's paint under the scrim.

**Dialog.** Header "Change direction". Rows: "Direction [Directed v]  was Undirected (file)";
a wrapping line "Reloads karate.gml with the new direction. The three objects made from it
keep their rows, names and styles, and re-run under the new direction."; "Objects [Keep and
re-run | Remove]" (a segmented control, Keep chosen by default); "Re-runs  Degree > 8,
Connections, Communities  about 2 s" (the objects in tree order and the summed estimate);
"A re-run over the gate lands waiting, with its Run button in the row." Footer: [Cancel]
[Reload].

**Interaction.** Reload with Keep is one undo step: the objects API records the tree, reloads
the data with the new role, and replays every object's definition as a recipe under the stale
rule (cheap objects re-run at once; one over the cost gate lands waiting; one whose rule no
longer resolves lands failed with the reason). Group overrides, names and notes follow by
label, as after any re-run. Remove is the old behaviour, made explicit. "Set as weight" on a
column opens the same dialog with "Weight [msgs v]  was none" as its first row; "Set as label"
likewise. When the element gains in-place re-mapping (`revision.md` section 8, last row), the
dialog loses its first sentence and the reload, and the objects re-run under the same rule.

## Kit additions

Five things the round-1 kit sheet (`../mocks/kit.html`) does not show and every screen above
relies on. They are drawn once on the kit sheet, light and dark:

1. **The busiest status bar**, 1280 px wide, with every item present: "1,204 nodes  5,830
   edges  Focused on Group 2: 61 of 1,204 [Exit]" | "Computing 2 of 6 [Cancel all]" with the
   GPU glyph | "3 stale [Re-run all]" | the layout chip collapsed to its pause glyph | "Rank:
   Bridges" | "11 selected" | "VR [Exit]" | "Fit" | "?". The layout chip is the first to
   collapse (a glyph with the tooltip "Spread out: settled"), then the armed tool to its icon.
2. **The dock handle**: the 32 px strip with three 24 px pill tabs (the one pill tab of the kit: padding 4, weight 550) (Table | Assistant | History)
   above the status bar, none selected, and the same strip as the header of the open dock with
   Table selected.
3. **The "?" ghost button** and its menu (Help, Keyboard shortcuts, Open sample).
4. **The secondary bar** for Rank, Path (both states) and Filter, with the Options, Run,
   Create and Cancel controls.
5. **The transport bar** with its gear popover, and the tab strip at its width limit ("Define
   | Members | Style | Record" at 24 characters, and the 27-character maximum drawn as a ruler).

## Round 3: screens 16 to 102

Round 3 draws the key functions round 2 left undrawn. Screens 1, 13 and 14 are redrawn (four
ways in and a Recent list; Settings; the Import dialog's tabs, Options, Node id and Label). The
design is `../round-3/revision-round-3.md`; each screen's exact state is in its area document
under `../round-3/` and in its spec, `tmp/object-first/gen/screens/screen-N.mjs`. A dark tag
above a card or a menu marks a second moment drawn on the same screen.

| Screens | Area | Document |
|---|---|---|
| 16-21 | the file menu, unsaved work, save and reopen, autosave, recipes, two graphs | `file-project.md` |
| 22-32, 101 | the Import dialog's sources, paste, two files, options, drop, failure, progress, large files, databases, reload | `import.md` |
| 33-42 | import report, load rules, column menu and operations, join, formula, edit, remove, merge, expand, add by hand | `data-editing.md` |
| 43-48, 102 | History, the object menu, rename and reorder, a failed run, stale results, a lost view, empty results | `history-errors.md` |
| 49-58 | right-click, Find, 3D framing, minimap, saved Views, follow, box selection, edges, Focus, keyboard | `navigate-select.md` |
| 59-68 | filters by values, range, rule and on edges; patterns; neighbours; combining; members; all routes; editing a Set | `filters-sets.md` |
| 69-82 | values, scatter plot, groups, summary graph, record, batches, scope, findings, removal, compare, time, notes, Assistant | `analysis-results.md` |
| 83-100 | layout, pinning, canvas look, labels, hover, palettes, edge width, shapes, one node, saved styles, export, Present, VR | `visualization-export.md` |

The per-screen list is section 8 of `../round-3/revision-round-3.md`.
