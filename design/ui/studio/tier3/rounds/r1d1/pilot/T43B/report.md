# Pilot T43B: each source bigger the more they gave (sources.graphml)

Build: 6de5f95d12 (frozen, served from `.study-builds/tier3-r1d1-6de5f95d12`). Every session below
started on the empty start page with clean storage and reached its file through a file chooser or a
drop, never a URL. Sessions are in `6de5f95d12/`; the `rp-` folders are the re-walk of the success
path and of every route on the changed-routes list, each its own session.

Result: **reached** by pointer (`rp-pointer/`). The keyboard walk of the same success path on this
same frozen build (`keyboard/`, section 5 of the earlier walk below) reached the end. The data stayed
the sources file throughout: 24 nodes, 59 edges, `donations` 0 to 250,000; the answer read was s01
Harlan Development, 250,000.

## Re-walk: the success path by pointer (`6de5f95d12/rp-pointer/`)

| Step | Action | Screen | Shot |
| ---- | ------ | ------ | ---- |
| 1 | Open a file, sources.graphml | "Open as a new graph": "sources: 24 nodes, 59 edges"; Harlan Development 250000 on line 1 | rp-pointer/02.png |
| 2 | Load | drawing; Graph inspector on Values | rp-pointer/03.png |
| 3 | Everything | Style > Node: Shape (Icosphere), Size 1, Shape "+" dimmed, "Edges: 4 styles, Edit edges" | rp-pointer/04.png |
| 4 | the link icon beside Size ("Node size by attribute") | popover: Find an attribute, Fixed size, Data: donations "0 to 250,000", Does not fit: "5 attributes, Show why" | rp-pointer/05.png |
| 5 | donations | popover closes; Size shows "donations", "From 1 to 3"; key "Size: donations" 0 to 250,000; the drawing stays put; one dot plainly biggest | rp-pointer/06.png |
| 6 | click the biggest dot | inspector `s01`: name Harlan Development, donations 250,000; selection ring drawn | rp-pointer/07.png |

`rp-pointer/styles.json`: Everything carries `node.size` by `data.donations`. No mismatch with the
answer key.

## Re-walk: the changed routes, each its own session

| Route | Session | What happened | Shots |
| ----- | ------- | ------------- | ----- |
| T50A success path: Open a file, Poster layer, Which nodes, Why this look | `rp-t50a-pointer/` | lesmis-poster opens with its look: three orange dots, key "Color: Poster, 3 of 77 nodes", layer Poster (3). Which nodes opens the card: name, Contains, Mlle, "3 nodes". Values: Matched nodes 3, members MlleBaptistine, MlleGillenormand, MlleVaubois. An orange dot's Style > Why this look lists Poster Color; "Open layer Poster" opens the layer. `changes.changed` empty | 02-08.png |
| T50A detours: drop on the start page, Control+O, Main menu > Open project or file | `rp-t50a-detours/` | The drop is taken and opens the project with its layer; Control+O and the main menu with the project open replace it at once. After the Poster color was changed to red, Control+O asks "Discard unsaved changes?"; Discard reopens it orange | 02-10.png |
| T50A keyboard walk (`--keys --sr`) | `rp-t50a-keys/` | "Open a file" is the 14th Tab; after the open focus is on heading "Graph, lesmis-poster: 77 nodes, 254 edges". F6 x3 reaches "Graph Les Miserables"; Tab x3 to Everything, ArrowUp to "Poster, node layer, 3 nodes", Enter, F6 to heading "Poster", Tab x6 to "Which nodes, 3 of 77 nodes, name contains Mlle, 3 nodes". Enter puts focus in "name: text to match" value "Mlle"; Escape twice keeps it there, picker open; Enter closes it with focus on Which nodes; the rule is unchanged. Values tab lists the three members as buttons; Enter on MlleBaptistine selects it; Escape clears it and lands on the Graph heading (defect 4) | 15-52.png |
| T50B success path: Thank-you cards, hours and trained cards | `rp-t50b-pointer/` | volunteers-thanks opens with key "Color: Thank-you cards, 6 of 24 nodes". Which nodes: "Nodes that pass every condition", hours Between 30 to 52 (7 nodes), trained Yes (15 nodes); Values: Matched nodes 6, members v02, v05, v09, v16, v17, v21. A green dot's Why this look lists Thank-you cards Color. `changes.changed` empty | 02-08.png |
| T50B detours | `rp-t50b-detours/` | Drop on the start page, Control+O and Main menu > Open project or file all open it with its layer. Layer right-click > Select what it paints: "6 nodes selected", hours "31 to 52, mean 41.67", trained "Yes (6)" | 02-07.png |
| T50B keyboard walk (`--keys --sr`) | `rp-t50b-keys/` | Reaches "Which nodes, 6 of 24 nodes, hours 30 to 52, 7 nodes, trained: yes, 15 nodes"; Enter puts focus in "hours from, number" 30; Escape twice keeps it; Tab goes to "hours to" 52, "Remove trained", "trained: how to match" Yes, "Add a condition". Escape on the trained select closes the picker (defect 5). Enter in the from box closes the picker; rule unchanged | 16-42.png |
| A project saved before the golden merge, opened on this build | `rp-t50a-*`, `rp-t50b-*`, `rp-old-project/` | Both projects were written before the merge; each opens with its layer by every route above. After opening one and reopening the app, nothing on the start page's first screen or in its Main menu lists it (Main menu: New project, Open project or file..., Open sample, Settings, Keyboard shortcuts, Help) | rp-old-project/02-05.png |
| T46A detour: the table, Javert's group from the Nodes tab | `rp-t46a-table/` | Les Miserables, Louvain run. The Nodes tab's Louvain column reads "Group N"; Javert's row reads Group 3; his Memberships say Louvain Group 3; the tree's Group 3 holds 11 | 08-13.png |
| T46B detour: the Nodes tab after Louvain, Nebraska's row | `rp-t46b-table/` | College football, Louvain. Row 74 Nebraska reads Group 4; Memberships Group 4; tree Group 4 holds 12. Selecting Nebraska from the find box with the table open does not scroll the table to its row; it was found by scrolling | 07-09.png |
| T47 and T48 routes: the table after a community run | `rp-t46a-table/`, `rp-t46b-table/` (T47's datasets), `rp-t48-table/` (sources.graphml) | On sources: three groups of 8; Nodes tab s01 to s08 read Group 1, s09 on Group 2; the table's Louvain tab lists Group 1, 2, 3 at 8 each, the same as the tree and the key | rp-t48-table/07-08.png |
| T45A detour: hand-picked layer, then Control+O > Replace | `rp-t45a-replace/` | Find `family`, "kind is family (8)", Style, Line "+" > Color, red: layer "8 edges", "Picked by hand: 8 edges". Control+O neighbors.csv: "Add to neighbors" with "Replace neighbors.csv" first; then "Replace: neighbors.csv, Was 16 nodes, 30 edges; now 16, 30"; Replace. The "8 edges" layer still reads 8 of 30 and the same 8 ties are red | 04-12.png |
| T38, T41, T51 detours: a layer from a find-box selection, then Control+O > Replace (walked on this task's file) | `rp-find-replace/` | Find `donations`, Enter: 24 selected. Style, Shape "+" > Size: unset line at 1; Enter there does nothing (defect 2). The link icon, donations: layer "donations: has a value", 24 of 24, notice "Made layer donations: has a value for 24 nodes"; the drawing moves right and the right-hand group passes under the inspector (defect 3). Control+O > Replace > Replace keeps the layer, 24 matched, size painted on 24, key kept. Clicking the biggest dot opens s01 Harlan Development 250,000 but draws no selection ring, still none 3 seconds later (defect 1) | 05-16.png |
| T45A success path | `rp-t45a-pointer/` | "+" > Layer, Edge tab, Which edges, Add a condition, kind, family (8 edges), Done ("kind: family, 8 edges"), Line "+" > Width 24, Line "+" > Color red: key "Edge color: Layer 1, 8 of 30 edges"; `styles.json`: an edge layer on kind = family with width 24 and color FF0000, painted on 8 | 04-13.png |

## Where the answer key and the screen differ (success path)

None on the pointer route (rp-pointer/02-07.png). The keyboard differences recorded for this build
in the earlier walk below still stand: after Load, F6 goes to the canvas first and the left panel is
the third F6; Everything is three Tabs into the left panel; and F6 from the tree lands on "Select
what it paints", nine Tabs before "Node size by attribute".

## Defects (re-walk)

| # | Route | What a participant meets | Shot |
| - | ----- | ------------------------ | ---- |
| 1 | find-box layer, then Control+O > Replace | After Replace, a clicked node opens its inspector and Selected counts 1, but no selection ring is drawn, and none appears with time | rp-find-replace/15.png, rp-find-replace/16.png |
| 2 | find-box selection, Shape "+" > Size | Enter on the unset Size line ("1", "Not set yet") does nothing; `decided.md` says an unset line takes the value it shows | rp-find-replace/09.png |
| 3 | find-box selection, size bound | Binding size on a layer made from a selection moves the drawing about 135 px right and puts the right-hand group under the inspector; `decided.md` says the drawing moves only when the reader asks | rp-find-replace/11.png |
| 4 | T50A keyboard | A member opened from the Poster layer's Members list: Escape clears it and puts focus on the Graph heading with the Graph inspector; `decided.md` says clearing it returns the inspector to that layer with focus on the member's row | rp-t50a-keys/52.png |
| 5 | T50B keyboard | Escape on the trained card's value select closes the picker and moves focus to Which nodes; `decided.md` says Escape keeps the picker open | rp-t50b-keys/40.png |
| 6 | T46B table | With the table open, a node picked from the find box is highlighted in the table but the table does not scroll to it; with 115 rows the reader has to scroll to find it | rp-t46b-table/07.png, rp-t46b-table/08.png |
| 7 | every walk | The start page asks graphty.app for its sample thumbnails and the browser blocks each request (net::ERR_BLOCKED_BY_ORB) | rp-pointer/01.png |

Fixed since the last full walk, seen on this re-walk: both saved projects open with their layers;
a project opened with Control+O replaces the open one, asking only to discard unsaved changes; a
hand-picked edge layer keeps its 8 ties through Replace; the table's Nodes tab names community
groups as the tree and the key do.

Not walked again: the T43B detour set and the T43B keyboard walk, which ran on this same frozen
build in the earlier walk below (`detours/`, `detour-drop/`, `detour-picked-replace/`, `keyboard/`).

# Earlier walk on this build (6de5f95d12)

Build: 6de5f95d12 (frozen, served from `.study-builds/tier3-r1d1-6de5f95d12`). The sessions are in
`6de5f95d12/`. Walked: the success path by pointer; the changed routes this task can take (a layer
made from picked nodes or from a find-box selection, then Control+O > Replace with the same file);
the fixed detour set of the last full walk (`5bd16cda6e/detours/`, below), plus the file dropped on
the start page; and the success path by keyboard only with screen-reader names. Every walk started
on the empty start page with clean storage and reached the file through a file chooser or a drop,
never a URL. The data stayed the sources file throughout: 24 nodes, 59 edges, columns `name`,
`kind`, `donations` (0 to 250,000), `on_record`, `email`; every answer read was s01 Harlan
Development, 250,000.

Result: **reached**, by pointer and by keyboard. Both Replace routes keep their layer and its size
binding.

## 1. The success path by pointer (`6de5f95d12/pointer/`)

| Step | Action | Screen | Shot |
| ---- | ------ | ------ | ---- |
| 1 | No thanks | the new start page: "Open a file", "Open network data", "Samples", "New project" | pointer/02.png |
| 2 | Open a file, sources.graphml | "Open as a new graph": "sources: 24 nodes, 59 edges"; Harlan Development 250000 on line 1 | pointer/03.png |
| 3 | Load | drawing; Graph inspector on Values | pointer/04.png |
| 4 | Everything | Style > Node; Shape section holds Shape (Icosphere) and Size 1, each with a link icon | pointer/05.png |
| -- | hover the link icon beside Size | tooltip "Node size by attribute", cursor an arrow | pointer/06.png |
| 5 | the link icon | popover "Node size by attribute": Find an attribute, Fixed size, Data: donations "0 to 250,000", Does not fit: "5 attributes, Show why" | pointer/07.png |
| 6 | donations | popover closes; Size box shows "donations", "From 1 to 3"; key "Size: donations" with a wedge 0 to 250,000; one dot plainly biggest | pointer/08.png |
| 7 | click the biggest dot | camera glides to it; inspector `s01`: name Harlan Development, donations 250,000 | pointer/09.png |

`pointer/styles.json`: Everything carries `node.size` encoded `by: data.donations`, range 1 to 3,
linear, painted on 24 of 24.

## 2. Hand-picked layer, then Control+O > Replace (`6de5f95d12/detour-picked-replace/`)

Table, donations header ("Sorted by donations, highest first"), click Harlan Development,
Shift+click Riverside Partners: "3 nodes selected" (05-09.png). Shape "+", Size, Control+A, `3`,
Enter makes the layer "3 nodes" ("Picked by hand: 3 nodes", notice "Made a layer for the 3
selected nodes") (10-12.png). The link icon, then donations (by kind: the name is shared with the
table's header), binds it; the key adds "3 nodes: 3 of 24 nodes" (13-15.png). Control+O,
sources.graphml: "Add to sources", "sources adds 0 nodes, 59 edges", the warning and "Replace
sources.graphml" first (16.png); Replace, then Replace on "Replace: sources.graphml, Was 24 nodes,
59 edges; now 24, 59" (17-18.png). The "3 nodes" layer still reads 3 of 24 with its size bound to
donations, and the key still names it (18-19.png). The Graph Style tab now explains "Same size at
any depth" as "On while node size follows data" (21.png). `styles.json`: "3 nodes" matches ids
s01, s04, s24 and paints size on 3.

## 3. Find-box layer, then Control+O > Replace (`6de5f95d12/detour-find-replace/`)

The find box, `donations`: "Select by a value: donations, Select the 24 nodes (donations: has a
value)", now wrapped in full (05.png). Enter selects all 24 and the box keeps `donations`
(06-07.png). Shape "+", Size, the link icon, donations: layer "donations: has a value", 24 of 24
nodes, notice "Made layer donations: has a value for 24 nodes"; the drawing moves about 135 px
right and the right-hand group passes under the inspector (08-11.png). Control+O > Replace >
Replace keeps the layer at 24 with the binding (12-14.png); clicking the biggest dot gives s01
Harlan Development, 250,000 (15.png). `styles.json`: the layer matches 24 and paints size on 24.

## 4. The fixed detours (`6de5f95d12/detours/`, `6de5f95d12/detour-drop/`)

**a. Getting the file in another way.** "Open network data" opens a dialog of NDEx, Neo4j, Web API
and a web-address box, no local file; Escape closes it (02-03.png). "New project" opens an empty
graph, "No nodes to draw" with "Add data..." and "Open a sample" (04.png). "Add data..." opens "Add
to Untitled" with a drop zone; "Choose a file...", sources.graphml reads "sources adds 24 nodes, 59
edges" (05-06.png). Cancel returns to the empty graph (07.png). Dropping the file on that empty
graph is not taken: nothing there accepts a drop, so a real browser would open the file in place of
the app (08.png). A second "Add data..." and Load gives 24 nodes, 59 edges (09-10.png). In a fresh
session the file dropped on the start page is taken: "Open as a new graph", "sources: 24 nodes, 59
edges", Load (`detour-drop/02-03.png`).

**b. The Graph inspector's Style tab.** Canvas (background, lighting, "Same size at any depth" off,
outline width) and Labels; nothing sizes nodes by a column (11.png).

**c. A fixed bigger size on the biggest donors, picked by hand.** Table, donations header ("Sorted
by donations, highest first"); click Harlan Development, Shift+click Riverside Partners: "3 nodes
selected", donations mean 133,333 (12-15.png). Style: "The first style you set makes a layer for
the 3 selected nodes"; Shape "+" offers Shape and Size; Size gives a line at 1, focus in it, "Not
set yet: the first size you pick makes the layer" (16-18.png). Enter on the unset 1 does nothing
(19.png). Control+A, `3`, Enter makes layer "3 nodes" ("Picked by hand: 3 nodes", notice "Made a
layer for the 3 selected nodes"), three equal bigger dots, focus kept (20.png). `5`, Escape: "Edit
discarded; this stays 3." (21.png). `2`, Tab commits 2 and moves to the link icon, tooltip "Node
size by attribute" (22.png).

**d. The link icon on that layer, opened and closed with Escape.** Enter opens "Node size by
attribute" (Fixed size; Data: donations 0 to 250,000; Does not fit: 5 attributes, Show why);
Escape closes it, focus on the icon (23-24.png). Enter again, "Show why" lists name ("Holds text,
not groups or amounts") and kind ("Holds groups, not amounts") dimmed (25.png). `dona`, Enter binds
size to donations on the 3 nodes; key "Size: donations", 0 to 250,000, "3 nodes: 3 of 24 nodes";
the drawing jumps about 135 px right and its right-hand group runs under the inspector's edge
(26-27.png). Escape with focus on the Size chip clears the selection: "Selection cleared: 3
nodes" (28.png).

**e. The find box.** `donations` offers "Select by a value: donations, Select the 24 nodes
(donations: has a value)" in full (29.png). Enter selects all 24 and the box keeps `donations`
(30.png). Shape "+" > Size, the link icon (the popover now lists donations under "Used
elsewhere"), donations: layer "donations: has a value", 24 of 24, notice "Made layer donations:
has a value for 24 nodes"; "3 nodes" shows the painted-over icon; the key reads "3 nodes covered by
donations: has a value" (31-33.png). The success state by another route.

**f. Right-click on the biggest dot.** Neighborhood, Path between..., Frame selection, New layer
from selection, Add note; nothing about size (34.png).

**g. Control+O with the graph open.** "Add to Untitled", "Untitled: 24 nodes, 59 edges; sources
adds 0 nodes, 59 edges", the warning "59 edges in this file are already in Untitled. Load adds
them a second time", primary "Replace sources.graphml" (36.png); then "Replace: sources.graphml,
Was 24 nodes, 59 edges; now 24, 59" (37.png); Replace keeps every layer and the binding, the key
still shown; "Same size at any depth" now on with "On while node size follows data" (38.png).
Clicking the biggest dot opens s01, Harlan Development, 250,000, but draws no selection ring on it
(39.png); the ring appears one step later, when the Data place is opened (40.png).

**h. The Data place.** Attributes lists donations ("Number, all have a value"); its summary: Number,
17 distinct, 0 to 250,000; its right-click menu: Add label line, Filter to..., Show in table
(40-42.png).

## 5. The success path by keyboard only, screen-reader names (`6de5f95d12/keyboard/`, `--keys --sr`)

| Keys | Focus (screen-reader name) | Shot |
| ---- | -------------------------- | ---- |
| (start) | nothing (the page itself) | keyboard/01.png |
| Tab x14 | Main menu; Samples; Docs; For developers; GitHub; Switch to dark mode; Settings...; Canvas "A network drawn as a 3D graph..."; Communities (pressed); Key players; Shortest path; 2D; Pause the turning; "Open a file CSV, GraphML, GEXF, Cytoscape, or a saved project" (the 14th) | keyboard/02-15.png |
| Tab x2, Shift+Tab x2 | Open network data; Samples; back to Open a file | keyboard/16-19.png |
| Enter, file | Load (live: "All 24 rows") | keyboard/20.png |
| Enter | heading "Graph, sources: 24 nodes, 59 edges" (live: "sources: 24 nodes, 59 edges"); no focus ring is drawn on it | keyboard/21.png |
| F6, Tab, Tab | Canvas "Graph drawing"; Analyze; "From sources.graphml" | keyboard/22-24.png |
| F6 x5 | Canvas; Analyze; "Graph sources.graphml" (left panel); "From sources.graphml" (inspector); Canvas -- the top bar is never reached | keyboard/25-29.png |
| F6 x2, Tab x3 | Analyze; Graph sources.graphml; combobox "Find"; "Add a layer or a folder"; treeitem "Everything, node and edge layer, 24 nodes, 59 edges" | keyboard/30-34.png |
| Enter | the same treeitem, selected; focus stays in the tree | keyboard/35.png |
| F6, Tab x8 | Select what it paints; Layer actions; tab Style; tab Node; checkbox Style nodes; combobox "Node shape, Icosphere"; Node shape by attribute; Remove node shape; spinbutton "Node size" 1 | keyboard/36-44.png |
| `5`, Escape; Enter; Tab (check) | reverts to 1, live "Edit discarded; this stays 1.", focus kept; Enter changes nothing; Tab to "Node size by attribute" | keyboard/45-47.png |
| Enter, Escape, Enter, Tab, Enter (check) | combobox "Find an attribute" expanded; Escape and Tab each close it with focus back on the icon | keyboard/48-52.png |
| Enter (check) | nothing highlighted, nothing taken | keyboard/53.png |
| arrows (check) | "Fixed size"; "donations, 0 to 250,000"; "5 attributes, hidden, holds text, not groups or amounts (3), holds groups, not amounts (2), Show why"; wraps to Fixed size | keyboard/54-60.png |
| Enter on "5 attributes", ArrowDown x2, Enter (check) | "5 attributes, shown, Hide them"; "name, Holds text, not groups or amounts" disabled; "kind, Holds groups, not amounts" disabled; Enter on it does nothing | keyboard/61-64.png |
| `do`, Tab (check) | "donations" highlighted; Tab closes the popover and takes nothing ("Node size by attribute" still unbound) | keyboard/65-66.png |
| Enter, ArrowDown x2, Enter | button "Node size: donations, 1 to 3" (live: "Node size varies by donations, on 24 nodes"); key "Size: donations"; the drawing stays put | keyboard/67-70.png |
| Enter, Escape | dialog "Size by donations"; back to the chip | keyboard/71-72.png |
| F6 x2, ArrowRight x4, Enter | Canvas; Analyze; Layout; "View, 3D"; Legend (pressed); Table; button "Id" | keyboard/73-79.png |
| ArrowRight x3, Enter | button "donations, sorted descending" (live: "Sorted by donations, highest first") | keyboard/80-83.png |
| ArrowDown, --read | gridcell "250,000"; row "s01 Harlan Development company 250,000 No press@harlandev.example" first | keyboard/84-85.png |
| Escape | button "Table" pressed (as decided) | keyboard/86.png |

Focus never fell to the page body after the start. `keyboard/styles.json`: Everything carries
`node.size` encoded `by: data.donations`, range 1 to 3, linear, painted on 24 of 24.

## Where the answer key and the screen differ

Success path by pointer: none (pointer/02-09.png). By keyboard:

1. After Load, F6 goes to the canvas, not the left panel; the left panel is the third F6
   (keyboard/22.png, keyboard/27.png).
2. Everything is three Tabs into the left panel, not two: the find box and "Add a layer or a
   folder" come first (keyboard/32-34.png).
3. F6 from the tree lands on "Select what it paints", not on the Values tab, and "Node size by
   attribute" is then nine Tabs on (keyboard/36-47.png).

## Defects

| # | Route | What a participant meets | Shot |
| - | ----- | ------------------------ | ---- |
| 1 | find-box layer, then Control+O > Replace; detour g | After Replace, a clicked node gets no selection ring although the inspector opens on it and Selected counts 1; the ring appears only after a later step redraws (opening the Data place). Seen in three sessions | detours/39.png, detours/40.png, detour-find-replace/15.png |
| 2 | detour d | With picked nodes, Escape on the bound Size chip of the layer's inspector clears the selection ("Selection cleared: 3 nodes"); `decided.md` says Escape on a layer's inspector leaves the selection alone | detours/28.png |
| 3 | detour c, detour d | Binding the size on a layer that covers only some nodes (and on the find-box layer) moves the drawing about 135 px right, so the right-hand group runs under the inspector; `decided.md` says a key that arrives never re-frames the drawing. Binding on Everything leaves it put | detours/26.png, detours/27.png, detour-find-replace/11.png |
| 4 | keyboard | F6 never reaches the top bar, and cycles canvas, toolbar, left panel, inspector; `decided.md` names five regions starting at the top bar | keyboard/25-29.png |
| 5 | keyboard | After Load, focus is on the inspector's heading but no focus ring is drawn there; `decided.md` asks for a visible ring | keyboard/21.png |
| 6 | keyboard | In the size popover, `do` with donations highlighted, then Tab, closes it and takes nothing; `decided.md` says Tab takes the highlighted option once letters are typed | keyboard/65-66.png |
| 7 | detour c | Enter on the unset Size line ("1", "Not set yet") does nothing; `decided.md` says an unset line takes the value it shows on Enter | detours/19.png |
| 8 | detour a | A file dropped on an empty new project ("No nodes to draw") is not taken; a real browser would open the file in place of the app and leave it. The same drop on the start page works | detours/08.png, detour-drop/02.png |
| 9 | every walk | The start page asks graphty.app for 34 generator thumbnails and the browser blocks each (net::ERR_BLOCKED_BY_ORB) | pointer/02.png |

Fixed since the last full walk: the find result is no longer cut off; the find box keeps
`donations` instead of "=donations"; "Same size at any depth" turning on now says why; Escape in
the table moves focus to the Table button; Tab out of the popover closes it with focus back on the
icon.

## Not walked

The other changed routes on the list belong to other tasks and cannot be reached from this one:
the Poster and Thank-you projects and their layers, a project saved before the merge, the table
after a community run, the T45A data and its success path. T43B opens no saved project and runs no
community analysis. Every T43B route on the list (pointer success path, Control+O > Replace after a
hand-picked layer, Control+O > Replace after a find-box layer) was walked.

## Earlier walk on build 5bd16cda6e (history)

keyboard walk reached the end (size bound to donations on Everything, Harlan Development read
from the sorted table) and focus never fell to the page.

## 1. The success path by pointer (`5bd16cda6e/pointer/`)

| Step | Action | Screen | Shot |
| ---- | ------ | ------ | ---- |
| 1 | No thanks | consent notice closes | pointer/02.png |
| 2 | Open project or file..., sources.graphml | "Open as a new graph": "sources: 24 nodes, 59 edges"; Harlan Development 250000 on line 1 | pointer/03.png |
| 3 | Load | drawing; Graph inspector on Values: Nodes 24, Edges 59 | pointer/04.png |
| 4 | Everything | inspector on Style > Node; Size line already there at 1; Shape "+" dimmed | pointer/05.png |
| -- | hover the link icon beside Size | tooltip "Node size by attribute" | pointer/06.png |
| 5 | the link icon beside Size | popover "Node size by attribute": Find an attribute, Fixed size, Data: donations "0 to 250,000", Does not fit: "5 attributes, Show why" | pointer/07.png |
| 6 | donations | popover closes by itself; Size box shows a chip "donations" with "From 1 to 3"; key over the drawing "Size: donations" with a wedge from 0 to 250,000; Legend in the toolbar turns on; one dot plainly biggest | pointer/08.png |
| 7 | click the biggest dot | node inspector (Values): s01, name Harlan Development, donations 250,000 | pointer/10.png |

Also read from the table: Table (toolbar), then the donations header gives "Sorted by donations,
highest first", Harlan Development 250,000 on top, Northgate Capital 90,000 next
(pointer/11-12.png). Hovering the dot shows no tooltip (pointer/09.png).

Style tree at the end (`5bd16cda6e/pointer/styles.json`): Everything carries `node.size` encoded
`by: data.donations`, range 1 to 3, linear, painted on 24 of 24.

## 2. Detours (`5bd16cda6e/detours/`)

**a. Consent notice left open; file through "New from data...", Cancel, second try.** "New from
data..." opens "Open as a new graph" with a drop zone and "Choose a file..." (detours/02.png); the
file reads as on the main route (detours/03.png). Cancel returns to the start screen with the
notice still there (detours/04.png); "Open project or file..." then Load gives the same 24 and 59
(detours/05-06.png).

**b. The Graph inspector's Style tab.** Canvas (background, lighting, "Same size at any depth",
outline width) and Labels; nothing sizes nodes by a column (detours/07.png). The dash beside the
background color is a reset button, "Reset Background color to default" (detours/08.png).

**c. A fixed bigger size on the biggest donors, picked by hand.** Table, donations header, click
Harlan Development, Shift+click Riverside Partners: 3 nodes selected, "donations mean 133,300"
(detours/09-12.png). Style, Shape "+" (menu Shape, Size), Size makes a layer "3 nodes" ("Picked
by hand: 3 nodes", notice "Made layer 3 nodes for 3 nodes") with focus in its Size box and 1
selected (detours/13-15.png). `3`, Enter makes the three dots equal and bigger and keeps focus in
the box (detours/16.png); `5`, Escape puts 3 back (detours/17.png); `2`, Tab commits 2 and moves
to the link icon, whose tooltip now shows below it (detours/18.png). The drawing does not follow
the number (F by the key).

**d. The link icon on that hand-picked layer, opened and closed with Escape.** Enter opens "Node
size by attribute"; Escape closes it and returns focus to the icon (detours/19-20.png). "Show why"
lists name and email as "Holds text, not groups or amounts", kind and on_record as "Holds groups,
not amounts", and Node id as text, all disabled (detours/22-23.png). Typing `dona` leaves one
match; Enter binds the size to donations (detours/24-25.png). Only the 3 picked nodes follow it,
and the key over the drawing now says so: "3 nodes: 3 of 24 nodes" under the wedge
(detours/25.png). Escape with focus on the Size chip clears the selection ("Selection cleared:
3 nodes") and the inspector stays on the layer (detours/26.png).

**e. The find box.** `donations` offers "Select by a value: donations, Select the 24 nodes
(donations: has a value)" (cut off; the hover gives it whole) (detours/27-28.png). Enter selects
all 24 and the box text becomes "=donations" (detours/29.png). From that selection, Shape "+",
Size, the link icon, donations makes a layer "donations: has a value" (24 of 24) whose size follows
donations for every node (detours/30-33.png): the success state by another route. The "3 nodes"
layer shows an icon "Painted over by donations: has a value" (detours/34.png).

**f. Right-click on a node.** Neighborhood, Path between..., Frame selection, New layer from
selection, Add note; nothing about size (detours/35.png).

**g. Control+O with the graph open.** "Add to sources", "sources adds 0 nodes, 59 edges", warning
"59 edges in this file are already in sources. Load adds them a second time", primary "Replace
sources.graphml" (detours/37.png). Replace shows "Replace: sources.graphml, Was 24 nodes, 59
edges; now 24, 59" (detours/38.png); Replace keeps the layers and the size binding
(detours/39.png).

**h. The Data place.** Attributes lists donations; clicking it shows a summary (Number, 17
distinct, 0 to 250,000); its right-click menu offers Add label line, Filter to..., Show in table,
and no way to size or color by it (detours/40-42.png).

## 3. The success path by keyboard only, screen-reader names (`5bd16cda6e/keyboard/`, `--keys --sr`)

| Keys | Focus (screen-reader name) | Shot |
| ---- | -------------------------- | ---- |
| Tab x12 | Main menu; Local only; Settings...; Open project or file...; New from data...; Open the Les Miserables / Zachary's karate club / College football / Florentine families sample; DisclosureTriangle "What is collected" collapsed; Share usage data; No thanks | keyboard/02-13.png |
| Enter | Open project or file... (live: "Usage data stays off. Change this in Settings > Privacy") | keyboard/14.png |
| Enter, file | Load (live: "All 24 rows") | keyboard/15.png |
| Enter | treeitem "Hovered, node layer, 0 nodes" (live: "sources: 24 nodes, 59 edges") | keyboard/16.png |
| (Tab x4, Shift+Tab x4: Graph settings; separator "Resize left panel"; Canvas "Graph drawing"; button "Analyze" and back) | | keyboard/17-21.png |
| ArrowDown x2, Enter | treeitem "Everything, node and edge layer, 24 nodes, 59 edges" selected | keyboard/22-24.png |
| Tab x18 (overshoot), Shift+Tab x4 | Graph settings; Resize left panel; Graph drawing; Analyze; Select what it paints; Layer actions; tab Style; tab Node; checkbox Style nodes; combobox Node shape; Node shape by attribute; Remove node shape; spinbutton "Node size" 1; button "Node size by attribute" collapsed; Remove node size; Add to node visibility; Add to node text; Pick Node color; back to "Node size by attribute" | keyboard/25-26.png |
| Enter | combobox "Find an attribute" expanded, nothing highlighted | keyboard/26.png |
| Tab (check) | popover closes, focus back on "Node size by attribute" | keyboard/27.png |
| Enter, Escape (check) | opens, then closes with focus back on the icon | keyboard/28.png |
| Enter, ArrowDown x4, ArrowUp x2 | highlighted "Fixed size", "donations, 0 to 250,000", "5 attributes, hidden", wraps to "Fixed size", back | keyboard/29.png |
| ArrowDown, Enter, ArrowDown x2 (check) | "5 attributes, shown"; "name, Holds text, not groups or amounts" disabled; "kind, Holds groups, not amounts" disabled | keyboard/30.png |
| Enter on a disabled option (check) | nothing happens; highlight stays | keyboard/32.png |
| ArrowUp x3, Enter | button "Node size: donations, 1 to 3" (live: "Node size varies by donations, on 24 nodes") | keyboard/33.png |
| Shift+Tab x11, Tab x2 | back through the inspector to the canvas and the toolbar's "Analyze" | keyboard/34-35.png |
| ArrowRight x4 | Layout; View, 3D; Legend (pressed); Table | keyboard/35.png |
| Enter | button "Id" (table header) | keyboard/36.png |
| ArrowRight x3, Enter | button "donations, sorted descending" (live: "Sorted by donations, highest first") | keyboard/37.png |
| --read | row "s01 Harlan Development company 250,000 No press@harlandev.example" first | keyboard/38.png |
| Escape (check) | nothing happens; focus stays on the header, the table stays open | keyboard/39.png |

`--read` of the open popover: dialog "Node size by attribute", heading, button "Close panel",
combobox "Find an attribute", options "Fixed size", "donations, 0 to 250,000", "5 attributes,
shown", then name, kind, on_record, email and Node id, each disabled with its reason in its name.
The end state equals the pointer walk's (`5bd16cda6e/keyboard/styles.json`).

## Where the answer key and the screen differ

1. The popover's "Does not fit" row reads "5 attributes, Show why", not "5 values" (pointer/07.png).
2. The key over the drawing reads "Size: donations" over a wedge from 0 to 250,000, not "Size:
   donations, 0 to 250,000" as one line (pointer/08.png).
3. The find box route makes a layer named "donations: has a value", not "Rule: donations"; the
   box's text becomes "=donations" after Enter (detours/29.png, detours/33.png). The route is
   still SD by the key's definition.
4. The key says a binding on 3 hand-picked nodes leaves the key over the drawing reading as if it
   covered everything; on this build the key adds "3 nodes: 3 of 24 nodes" (detours/25.png).
5. After Load, keyboard focus starts on the layer tree (treeitem "Hovered"), so Everything is two
   ArrowDowns away with no Tab (keyboard/16.png).

## Defects

| # | Route | What a participant meets | Shot |
| - | ----- | ------------------------ | ---- |
| 1 | detour g | After Control+O > Replace, the Graph Style tab shows "Same size at any depth" switched on; it was off on the same tab after Load (detours/07.png) and nothing in the walk touched it. The step that switched it was not isolated | detours/07.png, detours/39.png |
| 2 | detour d | With picked nodes and focus on the Size chip, Escape clears the graph's selection ("Selection cleared: 3 nodes") rather than doing nothing in the field | detours/26.png |
| 3 | keyboard | Escape in the table does nothing; the table cannot be closed from the keyboard without tabbing to "Close table" | keyboard/39.png |
| 4 | keyboard | Tab from the popover's find box closes the popover; its "Close panel" button is never reached by Tab | keyboard/27.png |
| 5 | keyboard | Enter in the popover opens the find box with nothing highlighted, so a screen-reader user hears no option until an arrow key | keyboard/26.png |
| 6 | detour e | The find box rewrites the typed `donations` as "=donations" after Enter, a formula-like token the participant never typed | detours/29.png |
| 7 | detour e | The find result "Select the 24 nodes (donations: has a value)" is cut off at "has a..." in the list; only a hover shows it whole | detours/27-28.png |
| 8 | detour h | An attribute's own menu in the Data place offers no way to size or color by it (Add label line, Filter to..., Show in table only) | detours/42.png |
| 9 | pointer, keyboard | The Size chip sits in a box with an empty slot to its left, so "donations" looks offset inside an empty field | pointer/08.png, keyboard/39.png |
