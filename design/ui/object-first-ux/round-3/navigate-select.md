# Round 3: finding, moving around and selecting

This document closes the fifteen "find, navigate and select" gaps in
`design/ui/object-first-ux/round-3/gaps.md`: functions the object-first design of round 2
(`design/ui/object-first-ux/round-2/revision.md`) needs for the app to work, or for a reader to
analyse and look at a graph, that no mock drew. For each one it gives the design (how the reader
gets there, what they see, the rows, the keys, what goes wrong), what graphty-element must
provide, and the screen that draws it. The screens are 49 to 58 in
`design/ui/object-first-ux/mocks/v2/`, generated from
`design/ui/object-first-ux/gen/screens/screen-49.mjs` to `screen-58.mjs`.

Written for an engineer, not a designer. Terms used throughout:

- **Tree**: the left panel's list of objects (the Dataset, Sets, Measures, Groupings, Groups).
- **Inspector**: the right panel; it shows whatever was selected last, and the Dataset when
  nothing is.
- **Element**: one node or one edge. **Element selection**: the nodes and edges currently
  selected (graphty-element's `session.selection`), shown with the gold halo.
- **Mask** (what is **showing**): graphty-element's one visibility filter
  (`session.visibility`). Elements outside it are not drawn. **Focus** sets the mask to one
  object's members.
- **Pill**: the select at the top-left of the right panel that reads "100%" in 2D or a framing
  name ("Fit", "Isometric") in 3D. **Framing**: where the camera stands and what it looks at.
- **Popover / menu**: a panel that floats over the canvas and closes when the reader clicks
  elsewhere. Menus in this design are dark, 32 px rows, key hints at the right (Figma's).
- **Secondary bar**: the dark one-line bar above the toolbar that says what is about to happen.
- **Dock**: the bottom drawer with Table, Assistant and History tabs.
- **Status bar**: the 24 px strip at the bottom of the window.
- **Size** of element work: tiny (under a day), small (days), medium (a week or two), large.
- `#NNN` is an issue in graphty-org/graphty-monorepo.

Nothing here adds a panel. Every function lands in a place round 2 already has: the tree, the
inspector, the pill's menu, the dock, the status bar, or a right-click menu that repeats the
inspector's own "..." menu. One new floating card (the minimap) is added, for a reason given in
its section.

## The key set, settled

Round 2's documents disagreed on keys: `object-model.md` section 9 gave the camera "0, F, 1, 3,
7" while F is the Filter tool, and `round-2/coverage.md` gave Invert as Ctrl+Shift+I, which is
the browser's developer tools. This is the one set; every key below is free of the toolbar's
tool keys (V, H, F, E, P, G, R, S, N, backtick, 5), the legend (L) and the minimap (M).

| Key | Does | Where else |
|---|---|---|
| Ctrl+F | Find (objects, nodes, values) | the magnifier in the Objects header |
| Ctrl+= and Ctrl+- (also + and -) | zoom in and out, about the canvas centre; the wheel zooms toward the pointer | pill menu |
| Shift+1 | zoom to fit (Figma's key) | pill menu; empty-canvas menu |
| Shift+2 | zoom to the selection (Figma's key) | pill menu; a node's Locate button |
| Ctrl+0 | zoom to 100% (2D only) | pill menu in 2D |
| 7, 1, 3, 9 | Top, Front, Side, Isometric (3D only; the numeric keypad's layout, as in Blender) | pill menu in 3D |
| Home | Reset view | pill menu; empty-canvas menu |
| 5 | 2D / 3D | the mode switch |
| Ctrl+Alt+V | Save view | Views "+"; pill menu; Views "..." |
| PgUp, PgDn | previous and next saved view (Left and Right do it in Present) | Views "..." |
| Ctrl+A | select every node that is showing | several-elements inspector; empty-canvas menu |
| Ctrl+Shift+A | add the edges between the selected nodes | several-elements inspector; selection menu |
| Ctrl+I | invert the selection, within what is showing | several-elements inspector; selection menu |
| Esc | one rung per press: cancel a pick, close the top menu, clear the element selection, clear the object selection, stop following, exit Focus | status bar Exit |
| Ctrl+Shift+H | hide the selected elements (or, when rows are selected, stop the selected objects painting, as Figma's same chord hides layers) | selection menu; node menu |
| Ctrl+Alt+Shift+H | show everything hidden by hand | the status bar's "3 hidden: Show all" |
| Ctrl+G | make a Set from the selection | several-elements inspector |
| F6, Shift+F6 | move the keyboard between the tree, the canvas, the inspector and the dock | -- |
| Shift+F10, the Menu key | the right-click menu for what has keyboard focus | -- |

Ctrl+K lists every one of these under its name, so a reader who forgets a key types the verb.

## 1. Right-click menus (screen 49)

**Rule.** A right-click opens the "..." menu of the thing under the pointer. There is one list
per kind of thing, and the inspector's "..." shows exactly that list in the same order; the
canvas menu only adds the select and route verbs at the top, because those need a pointer. This
settles the two disagreeing lists in `object-model.md` section 8 and `round-2/coverage.md`
section 13.

**What counts as a right-click.** A right press that moves less than 4 px. A right drag pans the
camera (the proposed 3D pan of #290 "no wheel zoom or pan in 3D, and 2D zoom ignores the
cursor"), so the two never collide. On touch, a long press. Shift+F10 or the Menu key opens it
for the node that has keyboard focus (section 12).

**On a node** (screen 49): Select neighbours (double-click), Select connected part; Path from
here (P), Path to here (both arm the Path tool with that end filled in); Locate (Shift+2),
Follow; Pin; Note... (N); Style its group... (when exactly one Group contains it), Style this
node...; Add to Set > (a submenu of the node Sets in the tree and "New set"); What breaks if
removed; Expand from server (only when the dataset has a fetcher); Hide (Ctrl+Shift+H); Copy id
(Ctrl+C), Copy as JSON; Remove from data... (Del; confirms). If the node is not selected, the
right-click selects it first (as Figma does); if it is selected together with others, the menu
is the selection's.

**On a selection of several nodes**: Make a set (Ctrl+G); Add to Set >; Add the edges between
(Ctrl+Shift+A); Invert (Ctrl+I); Focus on these; Locate (Shift+2); Pin these; Hide these
(Ctrl+Shift+H); Style these...; Merge into one node...; Copy ids; Remove from data....

**On a tree row**: the object's own "..." menu (Rename, Duplicate, Re-run, Focus on this, Select
members, Locate, Show in table, Export..., Delete; Combine when several rows are selected),
drawn by the history-and-recovery screens (screen 44).

**On empty canvas**: Paste (Ctrl+V, the paste-a-graph path of the getting-data-in screens); Select
all shown (Ctrl+A); Show all hidden (only while something is hidden); Note here (N); Zoom to fit
(Shift+1); Reset view (Home); Save view... (Ctrl+Alt+V).

**On an edge**: Select both ends; Path through here; Note...; Style this edge...; Hide; Copy id;
Remove from data.... It waits on edge picking (#319, "no right-click context menu on the
canvas"); until then the same list is the edge inspector's "..." (section 9).

**Errors.** A verb that cannot run is drawn disabled with the reason as its tooltip ("Expand
from server: this dataset has no server"; "Merge: select two or more nodes").

**Element work.** A pick event for a right press that says what is under the pointer (node id,
edge id, or nothing) and the screen point: part of #319, small once edge picking exists. The
verb list is not the element's: it is the app drawing commands the element already has, named
the way the command vocabulary (#337) names them.

## 2. Find (screen 50)

**Entry.** Ctrl+F anywhere, or the magnifier in the Objects header. The header turns into a
field, placeholder "Find an object or a node", and the tree below it is replaced in place by
results, the way Figma's layer search filters its layer list. Esc, or clearing the field, puts
the tree back exactly as it was.

**Results**, in three sections, each at most five rows then "N more" (a click lists up to 50 in
place; past 50, "Show all N in table" opens the Table dock narrowed to them):

1. **Objects**: tree rows whose name matches, with their kind icon and chip.
2. **Nodes (by label or id)**: one row per node: label, id in secondary text, the colour chip
   of the Group that paints it. Matches rank exact, then starts-with, then contains.
3. **Values in attributes**, with a scope select [Any attribute v] listing the columns: one row
   per attribute that matched, "label contains "state"  24 nodes" (see section 3).

A section with nothing reads "No matches". When all three are empty: "Nothing has "xyz" in its
name, label, id or attributes." On a large graph the results stream in with "Searching 42%".

**Keys.** Up and Down move one highlight through all three sections. Enter on an object selects
its row and closes Find. Enter on a node selects it and zooms to it (the Locate move, 500 ms),
and closes Find. Shift+Enter adds the node to the selection and keeps Find open, so a reader
can gather several. Ctrl+Enter on a Values row makes a Set.

**The table's search.** The Table dock's search field is the same search, narrowed to the
dock's tab (Nodes or Edges) and its Showing select; typing there narrows the rows and draws the
count in the tab ("Nodes 24 of 115").

**Element work.** A text search over names, labels, ids and attribute values:
`session.selection` already declares a `{ text, mode }` target with an `"attribute"` mode
(`graphty-element/src/session/selection/targets.ts`), but no search source is wired, so it
refuses with `E_UNSUPPORTED` (#149, "{where} queries and text search throw E_UNSUPPORTED
everywhere"). Needed: a search call that returns hits with the field that matched, capped and
ranked (medium, part of #149). A public `zoomToNodes(ids)`: the command exists for the
assistant (`graphty-element/src/ai/commands/CameraCommands.ts`), the method does not (small).
Searching object names is the app reading the objects API's list, which is allowed.

## 3. Searching inside attribute values (screen 50)

**Why a separate section.** "Nodes" answers "take me to that one node". "Values" answers
"which nodes contain this", the pathway question of workflow W22 ("every pathway that contains
TP53"). Its result is a group, so it gets group verbs.

**States.** Highlighting a Values row lights its matches on the canvas (the gold halo, the rest
at 35 percent) without changing the selection. The secondary bar reads "24 nodes have "state"
in label | Select (Enter) | Make a set (Ctrl+G) | Show in table | Esc". Select makes them the
element selection; Make a set creates a rule Set "label contains "state"" that stays live when
data changes (the Filter tool's "By rule", owned by the filters cluster); Show in table opens the
Table narrowed to them. A list-valued attribute (a pathway's genes) matches when any item
matches.

**Element work.** The same search as section 2, with the field reported per hit, and
"contains" on list-valued attributes in the query engine (small, part of #149).

## 4. The framing menu (screen 51)

**Entry.** The pill at the top of the right panel; its keys (table above); the empty-canvas
right-click. The pill reads the zoom percentage in 2D and the framing name in 3D ("Fit",
"Top", "Isometric", and "Custom" once the reader has orbited); the status bar's readout mirrors
it.

**Rows**, keys at the right: Zoom in; Zoom out; Zoom to 100% (2D); Zoom to fit; Zoom to
selection (disabled with "Nothing is selected" when so); a divider; Top, Front, Side, Isometric
(3D); a divider; Reset view; Save view.... The current framing carries a check.

**Behaviour.** Every move animates for 500 ms and can be interrupted by any input. Zoom to
selection on a Set or Group row zooms to its members. While following a node (section 8) the
pill reads "Following BrighamYoung" with an x.

**Element work.** Exists: `zoomToFit`, `resetCamera`, the built-in framings
(`graphty-element/src/camera/builtins.ts`: front, top, side, isometric), camera presets. Needed:
a public `zoomToNodes(ids)` (small, section 2); a zoom-by-step call (tiny); a camera event that
carries the framing name or "custom" and the 2D zoom percentage, so the pill is a reader of
element state and never works it out (small; `camera-state-changed` exists and lacks the name);
wheel zoom toward the pointer and 3D pan (#290, small to medium).

## 5. 3D (screen 51)

**Entry.** The mode switch's 3D segment, or 5.

**What changes.** The canvas becomes a perspective view of the same layout (a 2D-only layout is
shown as a plane, as the Layout tab already says). Selection, Focus, hidden nodes and every
object's paint carry over unchanged; only the camera changes. The pill switches from a
percentage to a framing name.

**Pointer.** With Hand (H or Space held), a drag orbits about the scene's centre, a right drag
pans, the wheel zooms toward the pointer. With Select, a plain drag orbits too, because in 3D
empty space is most of the screen; Shift+drag draws the selection box, which selects the nodes
inside the box's slab of the view (all depths), or only the nearest along each ray when "Front
only" is ticked in the Select tool's menu. A click on a node selects it as in 2D.

**Errors.** When the graph is over the 3D drawing limit, the 3D segment is disabled with the
reason and the fix ("12,400 nodes showing; 3D draws up to 10,000. Focus on a smaller set.").

**Element work.** Exists: the mode, the orbit camera. Needed: the box selection hit test in 3D
(the same one as section 9, with a slab mode; medium); #290.

## 6. Minimap (screen 52)

**Why a new surface.** The minimap has to stay visible while the reader pans: it cannot be a row
in a panel. It is a floating card like the legend, and it lives on the same switch row.

**Entry.** Dataset > Canvas: "Legend (L) | Minimap (M)", one two-column switch row; the M key;
the card's close x turns the switch off. Off by default.

**The card.** 160 x 120 px of drawing under a 32 px header ("Minimap" and the zoom), at the
bottom-left of the canvas with its bottom edge 12 px above the toolbar's top, mirroring the
legend at the bottom-right, so neither collides with the 725 px toolbar at a 1280 px window.
It draws every node as a dot in its painted colour (edges only under 5,000) and the part of the
graph the canvas shows as a blue box. Drag the box to pan; click anywhere to jump there; the
wheel over the card zooms the canvas.

**States.** 2D only: in 3D the switch is disabled with the reason ("a flat overview of an
orbiting camera would mislead; use Zoom to fit (Shift+1)"). The card updates when the layout
settles, not every frame. Under Focus it draws only what is showing.

**Element work.** #293 (minimap): the element draws it, so every consumer gets it and it reaches
captures only when asked; a config switch and a viewport event (medium). The app draws only the
switch.

## 7. Saved views (screen 53)

**Entry.** The Views list above the tree: "+" saves the current camera as "View 2" with the name
ready to type; the pill menu's Save view...; Ctrl+Alt+V; Ctrl+K "Save view".

**Rows.** Each row is a name; the last applied has the grey current fill; a grey dot after its
name when the camera has moved since. "Overview" is written by the element at the first fit
after a load. Hover shows "..." with Update to current, Rename, Duplicate, Delete, Present from
here. Click applies (500 ms move; a view that stores a Focus enters it); double-click renames;
drag reorders; PgUp and PgDn step.

**The View inspector** (no tabs): Camera "moved" with Update to current; Mode [2D | 3D | VR |
AR]; Showing [Everything v] (the Focus or time window it applies); Export image from this view;
then what a view keeps: the camera, the mode and what is showing, never colours, eyes, the
selection or node positions, so applying a view never repaints anything.

**The Views "..." menu.** Save view, Previous view, Next view, Export views..., Import views....

**Errors.** Importing views that refer to Sets this project lacks: "2 views refer to objects not
in this project; they were imported showing everything." A view whose Focus object was deleted
applies with Showing: Everything and says so once.

**Element work.** Exists: camera presets with export and import. Needed (named in
`round-2/revision.md` 6.2): a preset that carries mode and mask (small); the "Overview" default
preset (tiny); reader view names kept apart from built-in framing names (tiny).

## 8. Follow a node (screen 54)

**Entry.** A node's "..." Follow, in the inspector header or the right-click menu; Ctrl+K
"Follow".

**State.** The camera keeps the node centred every frame at the current zoom (and, in 3D, the
current orbit distance), which matters while the layout is moving it. The pill and the status
bar's readout read "Following BrighamYoung"; the pill carries an x. Orbit and zoom still work
around the node.

**Stopping.** The x; Esc (its rung is after "clear the selection"); a pan; applying a view; Zoom
to fit. If the node stops showing (a filter, a Focus, a time window) or is removed, following
stops, the pill returns to the framing name and the status bar says "Stopped following:
BrighamYoung is not showing" for a few seconds. Following one node only; with several selected,
Follow is disabled with "Follow works on one node".

**Element work.** #183 (camera follows a node): `followNode(id | null)` and an event when it
ends with the reason (small to medium).

## 9. Selecting many, and the several-elements inspector (screen 55)

**Gestures.** With Select (V): a drag on empty canvas draws a box, and the nodes inside are
haloed live while dragging; release keeps them. Shift adds, Alt removes, as clicks do. Lasso (the
Select tool's menu) draws a free shape. Shift+click adds one node, Ctrl+click toggles one. In 3D
see section 5. The status bar reads "10 selected", or "5,000 selected (capped)" when the
element's cap cut the selection short.

**The several-elements inspector** (no tabs, 14 rows at most): the header reads "Selection"
over "10 nodes", the summary "10 nodes  17 edges between them", the reading row says how it was
made ("9 by box, 1 by Shift+click"; "16 neighbours of node 1 selected" after a double-click).
Then a SELECT section: Select all shown (Ctrl+A), Select none (Esc), Invert (Ctrl+I), Add edges
between (Ctrl+Shift+A), Hide these (Ctrl+Shift+H); Make a set (Ctrl+G) as the one filled button;
Add to [set v]; Statistics (a disclosure: inside and cut edges, and per numeric attribute the
selection's mean against the graph's); Values (per Measure the range, per Grouping the one Group
or "Mixed"); Member of; Style these...; Merge into one node....

**Element work.** The box and lasso hit test: nodes inside a screen rectangle or polygon, with a
front-only mode in 3D (medium; proposed in `round-2/revision.md` 3.3). Exists:
`session.selection.apply` with add, remove, toggle; `selection.statistics()`; `promote`.

## 10. Select all, none, invert, and the edges between (screen 55)

**Rows and keys** as in section 9 and the key table. Select all selects what is showing (a Focus
or a time window limits it; hidden nodes are never selected). Invert flips within what is
showing. "Add edges between" adds every edge whose two ends are selected, so a following Make a
set gives a Set with its edges. The same four verbs are in the empty-canvas and selection
right-click menus and in Ctrl+K.

**Element work.** Exists today: the `{ invert: true }` and `{ edgesBetween: true }` selection
targets (`graphty-element/src/session/selection/targets.ts`) and a `{ scope }` target for "all
showing". None.

## 11. Hide chosen nodes and show them again (screen 55)

**Why it is not the eye.** The eye on a tree row stops an object painting and never hides
members; a reader who wants a distracting hub out of the picture needs to take those nodes off
the canvas without deleting them.

**Entry.** Hide these (Ctrl+Shift+H) in the several-elements inspector; Hide in a node's menu
and the right-click menu.

**State.** Hidden nodes and their edges are not drawn (or drawn faintly when Dataset > Canvas >
"Hidden faintly" is on). A system row "Hidden by hand  3 nodes" appears at the top of the tree
while anything is hidden (like the "Pinned" row of `object-model.md`); its inspector lists them
with a Show button per row and Show all. The status bar's mask item reads "3 hidden: Show all".
Hidden nodes are excluded from Select all, from tools' "what is showing" scope and from
exports of what is showing; they are kept in the project file and every hide is one undo step.

**Showing again.** Show all in the status bar or the row (Ctrl+Alt+Shift+H); Show on one row;
in the Table dock, Showing [Everything, including hidden] lists them with an eye-off glyph that
shows the node on click.

**Element work.** The mask composes Focus, the time window and a hide list: a filter kind naming
node ids to exclude (`{ not: { ids } }`; the filter type in
`graphty-element/src/session/visibility/filter.ts` has no ids kind today; small), stored with the
objects so it saves and undoes (settled decision 1).

## 12. The edge inspector (screen 56)

**Entry.** A row of the Table dock's Edges tab; a row of a node's Links tab; a Path's Members
rows; later a canvas click (#319).

**Header.** "Edge  id e72" over "BrighamYoung - Syracuse" ("->" when directed); Locate and "..."
(Select both ends, Path through here, Note..., Style this edge..., Hide, Copy id, Remove from
data...); the summary "Undirected, unweighted" or "weight 3.5".

**Tabs.** About | Attributes | Endpoints (20 characters, like a node's).

- About leads with the two ends as links ("from BrighamYoung >", "to Syracuse >"), then weight
  and time when present, "All N attributes >", a VALUES section (each edge Measure; and for each
  node Grouping whether the edge is inside one group or between two: "Conference 7 - 1 between
  groups"), MEMBER OF (edge Sets such as Paths), LOOK and NOTES.
- Attributes: key and value rows with a filter field past ten.
- Endpoints: the two node rows (label, neighbour count, group chip), Select both, and "Other
  edges between them: 0" (a count above 0 lists them, for multigraphs).

**Canvas.** The selected edge is drawn in the selection gold at 5 px under its own paint; its two
ends are outlined and labelled.

**Element work.** Edge picking on the canvas (#319, medium); edge attributes by id
(`session.data.edge(id)`, part of #297, small); `styles.explain` for an edge (small).

## 13. The Edges table (screen 56)

**Entry.** The Table dock, second tab "Edges 613"; "See all in table" on a Path's Members tab.

**Columns.** source and target (by label, each a link: a click selects that node and keeps the
table on Edges), id, then the file's edge attributes, then one column per object that says
something about edges (an edge Set as a check column, an edge Measure as numbers, each node
Grouping as "both 7" or "7 - 1"). Sortable; the search field narrows rows; Showing [What is
showing v] keeps an edge when both ends show.

**States.** A row click selects the edge and opens the edge inspector. No edges: "This graph has
no edges." Over 100,000 rows the table pages as the Nodes tab does.

**Element work.** `getEdges` (#297, "update attributes after load"); column to ids for object
columns (#148); both small.

## 14. Focus (screen 57)

**Entry.** A Set or Group row's Focus glyph on hover, beside its eye; the row's "..." Focus on
this; the Members tab's Focus button; Filter's Create and focus; the selection menu's Focus on
these (makes the union Set and focuses it); a View that stores a Focus.

**State.** Only the members and the edges between them are drawn (the rest faint when "Hidden
faintly" is on); the camera fits them (and returns to where it was on Exit). The status bar
reads "Focused on Group 2: 11 of 34 [Exit]". The row carries a Focus glyph and keeps its eye:
painting and showing are separate. Every tool's secondary bar reads "on Group 2 (focused), 11
nodes", so a run is scoped before it starts. The legend counts only what shows ("showing 1 of 4
groups"). The Members tab's Focus button becomes Exit focus. The Table's Showing defaults to
what is showing.

**Rules.** Focusing another object replaces the Focus (to look at an overlap, Combine then
focus the result). Focus and a time window compose. Deleting the focused object exits Focus.
Focus on an empty Set is disabled with "No members". Esc exits as its last rung.

**Element work.** `session.visibility.set` with a scope filter (settled decision 2: filters
evaluated within a scope; medium) and the objects API's Focus verb (settled decision 1);
`zoomToNodes` (section 2).

## 15. Keyboard on the canvas (screen 58)

**Why.** A reader using only the keyboard, or a screen reader, cannot walk the graph at all in
round 2.

**Entry.** F6 moves the keyboard between the four regions (tree, canvas, inspector, dock); the
canvas is one stop. Focus lands on the selected node, else the node with the most connections
that is showing. Help > Keyboard shortcuts has a "Canvas" section (drawn open on screen 58).

**Keys on the canvas.** Arrows: the neighbour nearest to that direction on screen. ] and [: the
next and previous neighbour going round clockwise. Tab and Shift+Tab: the next member of the
selected object, in its order (a path's hop order), or the next node by connections when no
object is selected. Enter selects (Shift+Enter adds). Space applies the armed tool to the
focused node (the Path tool's start or end, the Neighbours tool's centre, the Note tool's
anchor). Shift+F10 opens its right-click menu. Esc leaves the canvas for the tree.

**What the reader sees and hears.** A 2 px blue ring outside the node's own outlines, never the
gold selection halo; the edge to where ] goes next is dashed blue. A caption in the secondary
bar's place (only while the canvas has keyboard focus and no tool is armed): "Node 34: 17
neighbours, Group 1, Connections rank 1 of 34. ] goes to node 9. Enter selects. Esc leaves." The
same sentence is written to an ARIA live region (a hidden element a screen reader announces
when its text changes). The camera pans only when the focused node would leave the screen.

**Element work.** A keyboard navigation mode in graphty-element, because neighbour order,
nearest-on-screen and the node's description are graph functions every consumer needs: a
focused-node property and event, the moves above, and a description string built from the
objects that cover the node (medium; new issue).

## Element work, in one list

| Item | Size | Status | Sections |
|---|---|---|---|
| Text search returning hits with the field that matched (the `{ text }` selection target's source) | medium | #149 | 2, 3 |
| `zoomToNodes(ids)` as a public method | small | the assistant command exists | 2, 4, 14 |
| Zoom by a step | tiny | new | 4 |
| Camera event carrying the framing name or "custom" and the 2D zoom percentage | small | extends `camera-state-changed` | 4, 7 |
| Wheel zoom toward the pointer, 3D pan | small to medium | #290 | 4, 5 |
| Box and lasso hit test, with a front-only slab mode in 3D | medium | proposed in round 2 | 5, 9 |
| Minimap drawn by the element | medium | #293 | 6 |
| View presets that carry mode and mask; "Overview" default; reader names kept apart | small | round-2 revision 6.2 | 7 |
| `followNode(id \| null)` and an ended event with its reason | small to medium | #183 | 8 |
| A hide list in the mask (a filter kind naming ids to exclude), saved and undone with the objects | small | new | 11 |
| Edge picking and a right-press pick event | medium | #319 | 1, 12 |
| Edge list and edge attributes by id | small | #297 | 12, 13 |
| Column to ids for the table's object columns | small | #148 | 13 |
| Filters evaluated within a scope (Focus as a mask) | medium | settled decision 2 | 14 |
| Keyboard navigation mode with a focused node, moves and a spoken description | medium | new | 15 |

## The screens

| Screen | Shows | Spec |
|---|---|---|
| 49 | The right-click menu on BrighamYoung; the other menus listed in its caption | `design/ui/object-first-ux/gen/screens/screen-49.mjs` |
| 50 | Find with "state": Objects (none), Nodes, Values in attributes; matches lit; the find bar; the table narrowed | `screen-50.mjs` |
| 51 | 3D with the pill menu open: framings and keys; Hand orbiting | `screen-51.mjs` |
| 52 | The minimap switch on the Canvas tab and the card's place and size | `screen-52.mjs` |
| 53 | Three saved views, the current one moved away; the View inspector; the Views "..." menu | `screen-53.mjs` |
| 54 | Following BrighamYoung while the layout settles; the node menu with Follow | `screen-54.mjs` |
| 55 | A box selection adding to a Shift+click; the several-elements inspector; three nodes hidden | `screen-55.mjs` |
| 56 | The Edges tab with one edge selected; the edge inspector | `screen-56.mjs` |
| 57 | Group 2 focused, with the Rank tool armed inside it | `screen-57.mjs` |
| 58 | The keyboard focus ring, the live caption and the canvas keys | `screen-58.mjs` |

All of these are now drawn: dark menus at the pointer, the pill, the Views "..." and the node's "..." (49, 51, 53, 54), three right-click menus on screen 49, the find field in the Objects header (50), a tilted 3D camera (51), a zoomed canvas with the minimap (52), the camera following a node (54), the Focus re-fit and glyph (57), the pill's stop x (54), hidden nodes and the "Hidden by hand" system row (55), and the keyboard focus ring (58). The generator's keys are listed in `design/ui/object-first-ux/gen/README.md`.
