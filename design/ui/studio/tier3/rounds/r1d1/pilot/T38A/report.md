# Pilot: T38A, your own file (volunteers.graphml), then board and staff blue

## Full re-walk on build 6de5f95d12 (graphty 0.8.91)

Frozen build `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d1-6de5f95d12`. Every
session started from the empty start screen with clean storage and was driven only by clicks,
keys and typing. Sessions, all under this folder: `w7-pointer/` (success path by pointer),
`w7-find-replace/` and `w7-find-replace-2/` (a layer made from a find-box selection, then
Control+O > Replace; the second session reproduces a defect found in the first),
`w7-detour-newdata/` ("Open network data", "New project" then "Add data...", Cancel and a second
try, Control+O with the graph open, Load, Undo), `w7-detour-drop/` (the file dropped on the start
page), `w7-detour-data/` (the Data place's role values and "Filter to..."), `w7-keyboard/`
(success path by keyboard only, screen-reader mode). Folders `v6-*`, `6de-*` and `3ef-*` are
earlier passes, kept below for comparison.

The data stayed the file's own on every walk: "volunteers: 24 nodes, 63 edges" on the
read-the-file page, Nodes 24 and Edges 63 in Values, role counts volunteer 16, staff 5, board 3.
The counts changed only on the deliberate second Load (126 edges), and Undo restored them.

**Reached:** yes, on every walk. Nothing crashed, nothing blocked the task, and no walk gave a
result that would spoil its grading.

### 1. Success path by pointer (`w7-pointer/`), 12 steps as the key says

| Step | What was done | What the screen showed | Screenshot |
| ---- | ------------- | ---------------------- | ---------- |
| 1 | Start screen | "Open a file", "Open network data", Samples, New project | `w7-pointer/01.png` |
| 2 | Open a file, volunteers.graphml | "Open as a new graph", "volunteers: 24 nodes, 63 edges"; "24 node rows and 63 edge rows read; the load makes 24 nodes and 63 edges." | `w7-pointer/02.png` |
| 3 | Load | Graph drawn; Values: Nodes 24, Edges 63 | `w7-pointer/03.png` |
| 4 | "+" (Add a layer or a folder) | Layer, Folder, Select layers..., Analyze... Shift+A | `w7-pointer/04.png` |
| 5 | Layer | "Layer 1" above Everything, name open for renaming; Which nodes collapsed, "All 24 nodes: add a condition to narrow" | `w7-pointer/05.png` |
| 6 | Which nodes | Expands only: "Nodes that pass every condition", Add a condition, Done | `w7-pointer/06.png` |
| 7 | Add a condition | Find an attribute: name, role (3 values), hours (2 to 52), trained (2 values), phone (70% have a value), Node id | `w7-pointer/07.png` |
| 8 | role | Card "Is any of": volunteer, 16 nodes; staff, 5 nodes; board, 3 nodes | `w7-pointer/08.png` |
| 9 | Tick board | Subtitle "Node layer", "3 of 24 nodes"; drawing unchanged | `w7-pointer/09.png` |
| 10 | Tick staff | "8 of 24 nodes"; drawing unchanged | `w7-pointer/10.png` |
| 11 | Done | "role: board, staff, 8 nodes" | `w7-pointer/11.png` |
| 12 | Fill "+" | Color `6366F1` selected, focus in the box | `w7-pointer/12.png` |
| 13 | `blue`, Enter | `0000FF`, focus kept; key "Color: Layer 1, 8 of 24 nodes"; exactly 8 dots blue; the drawing did not move | `w7-pointer/13.png` |
| 14 | `red`, Escape | Back to `0000FF`, "Edit discarded; this stays 0000FF.", focus kept | `w7-pointer/14.png` |
| 15 | Tab | "Node color by attribute" | `w7-pointer/15.png` |

Answer key against the screen: everything matches (12 steps, the counts, "Node layer" after the
first tick, "8 of 24" with the drawing unchanged, the picker text "role: board, staff, 8 nodes"
in the order ticked, the key naming the layer, the drawing staying put).

### 2. Detours

#### 2a. Find-box selection, a layer from it, then Control+O > Replace (`w7-find-replace/`, repeated in `w7-find-replace-2/`)

| Step | What was done | What happened | Screenshot |
| ---- | ------------- | ------------- | ---------- |
| 1 | Find box, `board` | Nodes 3 (v01, v13, v23), Values "role is board (3)" | `w7-find-replace/03.png` |
| 2 | Click "role is board (3)" | "3 nodes selected", role board (3); box empties; camera glides | `w7-find-replace/04.png` |
| 3 | Find box, `staff`, Shift+click "role is staff (5)" | 8 nodes selected; role "staff (5), board (3)" | `w7-find-replace/05.png`, `06.png` |
| 4 | Style tab, Fill "+" | "The first style you set makes a layer for the 8 selected nodes."; "Not set yet: the first color you pick makes the layer" | `w7-find-replace/07.png`, `08.png` |
| 5 | `blue`, Enter | Layer "8 nodes", "Picked by hand: 8 nodes"; notice "Made a layer for the 8 selected nodes"; key "Color: 8 nodes"; the drawing jumps about 150 px right and a cluster ends under the inspector (as the key describes) | `w7-find-replace/09.png` |
| 6 | Control+O, volunteers.graphml | "Add to volunteers", warning "63 edges in this file are already in volunteers. Load adds them a second time.", Cancel, "Replace volunteers.graphml" (primary), Load | `w7-find-replace/10.png` |
| 7 | Replace volunteers.graphml | "Replace: volunteers.graphml", "Was 24 nodes, 63 edges; now 24, 63" | `w7-find-replace/11.png` |
| 8 | Replace | 24 / 63; layer "8 nodes" still paints 8, key "Color: 8 nodes, 8 of 24 nodes", 8 dots blue | `w7-find-replace/12.png` |
| 9 | The layer, Values | Members v01, v02, v09, v13, v17, v21, v23, v24 (the 3 board and 5 staff) | `w7-find-replace/14.png` |
| 10 | Find box: `staff`, Escape, Escape | Text cleared, list closed; second Escape leaves the box | `w7-find-replace/15.png`, `16.png` |
| 11 | Find box: `board`, Enter | v01 selected (inspector v01, Selected 1), camera glides close in; **no selection ring is drawn on v01** | `w7-find-replace/17.png`, `18.png` |
| 12 | Click v05, then pick v01 again from Find | Both get the ring | `w7-find-replace/23.png`, `25.png` |

The fix for the hand-picked layer holds: Replace with the same file keeps it painting the same 8
nodes. Repeated in `w7-find-replace-2/`: after Replace, the first pick (Find, `board`, Enter on
v01) again drew no ring (`w7-find-replace-2/08.png`); the next clicks on v05 and v02 drew it
(`09.png`, `10.png`). With a condition layer instead of a hand-picked one, the first pick after
Replace drew its ring (`w7-detour-newdata/18.png`).

#### 2b. "Open network data", "New project" then "Add data...", Cancel and a second try, Control+O with the graph open (`w7-detour-newdata/`)

| Step | What was done | What happened | Screenshot |
| ---- | ------------- | ------------- | ---------- |
| 1 | Open network data | Dialog: NDEx, Neo4j, Web API, "Or paste a web address", Open | `w7-detour-newdata/02.png` |
| 2 | `volunteers.graphml` typed in the address box, Enter | "Please enter a URL." | `w7-detour-newdata/03.png` |
| 3 | Tab, Escape | Tab to Open; Escape closes the dialog, focus back on "Open network data" | `w7-detour-newdata/04.png`, `05.png` |
| 4 | New project | Empty graph, "No nodes to draw", "Add data...", "Open a sample" | `w7-detour-newdata/06.png` |
| 5 | Add data..., Choose a file..., the file | "Add to Untitled": "Untitled: 0 nodes, 0 edges; volunteers adds 24 nodes, 63 edges" | `w7-detour-newdata/07.png`, `08.png` |
| 6 | Cancel | Back to the empty project | `w7-detour-newdata/09.png` |
| 7 | Add data..., the file, Load | 24 / 63 (project stays "Untitled") | `w7-detour-newdata/10.png`, `11.png` |
| 8 | Control+O, the same file | "Add to Untitled", warning, Cancel, "Replace volunteers.graphml" (primary), Load | `w7-detour-newdata/12.png` |
| 9 | Load (the warned choice) | Edges 126, "63 repeated edges", "From 2 files" | `w7-detour-newdata/13.png` |
| 10 | Control+Z | 24 / 63; notice "Undid changing settings and importing data." | `w7-detour-newdata/14.png` |
| 11 | The success path from "+" | 8 blue dots, "role: board, staff, 8 nodes", key "Color: Layer 1, 8 of 24 nodes" | `w7-detour-newdata/15.png` |
| 12 | Control+O, Replace, Replace; Find `Maria`, Enter | Layer 1 still 8; v01 ringed | `w7-detour-newdata/17.png`, `18.png` |

#### 2c. The file dropped on the start page (`w7-detour-drop/`)

The drop opened "Open as a new graph" with "volunteers: 24 nodes, 63 edges" and focus on Load
(`w7-detour-drop/02.png`); Enter loaded it, 24 / 63 (`03.png`). Same as the success path.

#### 2d. The Data place: role, its values, "Filter to..." (`w7-detour-data/`)

| Step | What was done | What happened | Screenshot |
| ---- | ------------- | ------------- | ---------- |
| 1 | Data (rail) | Sources, Filters, Attributes: hours, id, name, phone, role ("Category, all have a value"), trained | `w7-detour-data/03.png` |
| 2 | role | "role, Attribute": Category, 100%, 3 distinct values; volunteer 16, staff 5, board 3 | `w7-detour-data/04.png` |
| 3 | Click, then right-click, "staff 5" | Nothing happens | `w7-detour-data/05.png`, `06.png` |
| 4 | Right-click role | Add label line, Filter to..., Show in table (no color) | `w7-detour-data/08.png` |
| 5 | Filter to..., tick staff and board | "24 to 8 nodes", Add step enabled | `w7-detour-data/09.png`, `10.png` |
| 6 | Graph rail without Add step | 'Filter step not added: "role is staff or board". Press Add step to use a step.'; nothing hidden | `w7-detour-data/11.png` |
| 7 | Again, Add step | Top bar "8 of 24 nodes"; "Nodes showing 8 of 24, Edges showing 9 of 63" | `w7-detour-data/12.png` |
| 8 | Control+Z | All 24 back; 'Undid adding the filter step "role is staff or board".' | `w7-detour-data/13.png` |

As the key says: the filter hides instead of coloring, and nothing in the Data place colors.

### 3. Success path by keyboard (`w7-keyboard/`, keyboard-only and screen-reader mode)

Reached the end: 8 blue dots, "role: staff, board, 8 nodes", key "Color: Layer 1, 8 of 24
nodes" (`w7-keyboard/55.png`). Focus never fell to the page body after the first key.

| Keys | Focus (screen-reader name) |
| ---- | -------------------------- |
| Tab x14 | Main menu; links Samples, Docs, For developers, GitHub; Switch to dark mode; Settings...; Canvas "A network drawn as a 3D graph..."; Communities (pressed); Key players; Shortest path; 2D; Pause the turning; button "Open a file CSV, GraphML, GEXF, Cytoscape, or a saved project" (14th, as the key says) |
| Enter, the file | button "Load"; live "All 24 rows" |
| Enter | heading "Graph, volunteers: 24 nodes, 63 edges"; live "volunteers: 24 nodes, 63 edges" (no ring drawn, `w7-keyboard/17.png`) |
| F6 x5 | Canvas "Graph drawing"; Analyze; "Graph volunteers.graphml" (left panel); the inspector heading; Canvas |
| F6 x2, Tab x2 | Analyze; left panel; combobox "Find"; button "Add a layer or a folder" |
| Enter, Enter | menuitem "Layer"; textbox "Layer name" value "Layer 1" |
| type `Leaders`, Escape | Escape drops the typed name; treeitem "Layer 1, node and edge layer, 24 nodes, 63 edges" selected (`w7-keyboard/30.png`) |
| F6, Tab x5 | "Select what it paints"; Layer actions; tab Style; tab Node; checkbox Style nodes; "Which nodes, 24 of 24 nodes, All 24 nodes: add a condition to narrow" |
| Enter, Enter | "Add a condition"; combobox "Find an attribute" expanded |
| type `ro`, Tab | highlighted "role, 3 values"; Tab takes it (settled): "role: how to match" value "Is any of" |
| Tab, Tab, Space, Tab, Space | staff checked (live "5 of 24 nodes"), board checked (live "8 of 24 nodes") |
| Shift+Tab x2, Enter | Enter on "volunteer, 16 nodes" closes the picker, nothing ticked; focus "Which nodes, 8 of 24 nodes, role: staff, board, 8 nodes" (`w7-keyboard/48.png`) |
| Tab x4, Enter | Add to node shape, visibility, text, fill; textbox "Node color, not set, drawn #6366F1 indigo"; live "Node color added: pick a value" |
| `blue`, Enter | "Node color, set here, blue" value "0000FF"; live "Node color now blue, on 8 nodes" |
| `red`, Escape, Tab | back to 0000FF, live "Edit discarded; this stays 0000FF."; "Node color by attribute" |

### Defects

None crashes, blocks the task or spoils grading.

1. **After Control+O > Replace, the first node picked draws no selection ring when a hand-picked
   layer is open** (find-box route, reproduced in two sessions). The inspector shows v01 and
   Selected counts 1, but v01 has no ring (`w7-find-replace/18.png`,
   `w7-find-replace-2/08.png`). The next pick draws the ring (`w7-find-replace-2/09.png`). With a
   condition layer the first pick after Replace is ringed (`w7-detour-newdata/18.png`), so it
   follows the hand-picked layer that Replace re-binds. A participant checking a node after the
   reload sees no mark on it.
2. **A pick from the find box glides the camera close in and leaves most of the graph off
   screen** (`w7-find-replace/17.png`, `w7-find-replace-2/08.png`). The picked node ends about
   130 px right of the canvas's center, with two clusters cut off at the top and right. The
   settled rule lets the camera glide to center a pick. It does not let the rest of the drawing go
   out of view. The same was found on the earlier pass.
3. **No visible focus ring on the inspector heading after Load** (keyboard,
   `w7-keyboard/17.png`). The settled rule requires one. Found on the earlier passes too.
4. **F6 never reaches the top bar** (keyboard). The cycle is canvas, toolbar, left panel,
   inspector. The settled rule lists five regions starting with the top bar. Found on the
   earlier passes too.
5. **Enter on a condition's checkbox closes the picker without ticking** (keyboard,
   `w7-keyboard/48.png`). Space ticks. Found on the earlier passes too.
6. **The drawing jumps about 150 px right when a hand-picked layer takes its first color**
   (`w7-find-replace/08.png` to `09.png`). The answer key describes it; it goes against the
   settled rule "a key that arrives never re-frames the drawing", but does not change what is
   painted.
7. **Undo of a second load says "Undid changing settings and importing data."**
   (`w7-detour-newdata/14.png`). The participant changed no settings. Found on the earlier pass.

### Not walked

- The routes in the fix list that belong to other tasks: T50A and T50B success paths and detours
  (they use the Les Miserables poster and the volunteers thank-you saved projects), a project
  saved before the golden merge, T46A, T46B, T47 and T48 table routes after a community run, and
  the T45A success path. Each needs its own task's data and start, and T38A has none of them.
  The T45A detour (Control+O with a graph open after a hand-picked layer, Replace first) is the
  same mechanism as detour 2a and was walked here on volunteers.graphml.

---

## Targeted re-walk on build 6de5f95d12 (earlier pass, kept for comparison)



Frozen build `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d1-6de5f95d12`. Every
session started from the empty start screen with clean storage. Of the routes the last fixes
touched, one belongs to this task: a layer made from a find-box selection, then Control+O >
Replace with the same file. It was walked with the success path by pointer, plus the success path
by keyboard (keyboard-only, screen-reader mode). Sessions, all under this folder: `v6-pointer/`,
`v6-find-replace/`, `v6-keyboard/`. The folders `6de-pointer/` and `6de-detour-find-replace/` are
an earlier unreported attempt on the same build and are not part of this report.

The data stayed the file's own on every walk: "volunteers: 24 nodes, 63 edges" on the
read-the-file page, Nodes 24 and Edges 63 in Values, role counts volunteer 16, staff 5, board 3.

**Reached:** yes, on all three walks. Nothing crashed, nothing blocked the task, and no walk gave a
result that would spoil grading.

### 1. Success path by pointer (`v6-pointer/`), 12 steps as the key says

| Step | What was done | What the screen showed | Screenshot |
| ---- | ------------- | ---------------------- | ---------- |
| 1 | Start screen | "Open a file", "Open network data", Samples, New project | `v6-pointer/01.png` |
| 2 | Open a file, volunteers.graphml | "Open as a new graph", "volunteers: 24 nodes, 63 edges"; "24 node rows and 63 edge rows read; the load makes 24 nodes and 63 edges." | `v6-pointer/02.png` |
| 3 | Load | Graph drawn; Values: Nodes 24, Edges 63; notice "This looks like a private window..." | `v6-pointer/03.png` |
| 4 | "+" (Add a layer or a folder) | Layer, Folder, Select layers..., Analyze... Shift+A | `v6-pointer/04.png` |
| 5 | Layer | "Layer 1" above Everything, name open for renaming; Which nodes collapsed, "All 24 nodes: add a condition to narrow" | `v6-pointer/05.png` |
| 6 | Which nodes | Expands only: "Nodes that pass every condition", Add a condition, Done | `v6-pointer/06.png` |
| 7 | Add a condition | Find an attribute: name, role (3 values), hours (2 to 52), trained (2 values), phone (70% have a value), Node id | `v6-pointer/07.png` |
| 8 | role | Card "Is any of": volunteer, 16 nodes; staff, 5 nodes; board, 3 nodes | `v6-pointer/08.png` |
| 9 | Tick board | Subtitle "Node layer", "3 of 24 nodes"; drawing unchanged | `v6-pointer/09.png` |
| 10 | Tick staff | "8 of 24 nodes"; drawing unchanged | `v6-pointer/10.png` |
| 11 | Done | "role: board, staff, 8 nodes" | `v6-pointer/11.png` |
| 12 | Fill "+" | Color `6366F1` selected, focus in the box | `v6-pointer/12.png` |
| 13 | `blue`, Enter | `0000FF`, focus kept; key "Color: Layer 1, 8 of 24 nodes"; exactly 8 dots blue; drawing did not move | `v6-pointer/13.png` |
| 14 | `red`, Escape | Back to `0000FF`, "Edit discarded; this stays 0000FF.", focus kept | `v6-pointer/14.png` |
| 15 | Tab | "Node color by attribute" | `v6-pointer/15.png` |

Answer key against the screen: everything matches (12 steps, the counts, the picker text "role:
board, staff, 8 nodes" in the order ticked, the key naming the layer, the drawing staying put).

### 2. Find-box selection, then Control+O > Replace (`v6-find-replace/`)

| Step | What was done | What happened | Screenshot |
| ---- | ------------- | ------------- | ---------- |
| 1 | Open a file, Load | 24 / 63 | `v6-find-replace/02.png` |
| 2 | Find box, `board` | Nodes 3 (v01, v13, v23), Values "role is board (3)" | `v6-find-replace/03.png` |
| 3 | Click "role is board (3)" | "3 nodes selected", role board (3); box empties; camera glides (settled) | `v6-find-replace/04.png` |
| 4 | Find box, `staff`, Shift+click "role is staff (5)" | 8 nodes selected | `v6-find-replace/05.png`, `06.png` |
| 5 | Style tab | "The first style you set makes a layer for the 8 selected nodes." | `v6-find-replace/07.png` |
| 6 | Fill "+", `blue`, Enter | Layer "8 nodes", "Picked by hand: 8 nodes"; notice "Made a layer for the 8 selected nodes"; key "Color: 8 nodes"; the drawing jumps about 148 px right as the color lands (the key describes this) | `v6-find-replace/08.png`, `09.png` |
| 7 | Control+O, volunteers.graphml | "Add to volunteers", warning "63 edges in this file are already in volunteers. Load adds them a second time.", Cancel, "Replace volunteers.graphml" (primary), Load | `v6-find-replace/10.png` |
| 8 | Replace volunteers.graphml | "Replace: volunteers.graphml", "Was 24 nodes, 63 edges; now 24, 63", Cancel, Replace | `v6-find-replace/11.png` |
| 9 | Replace | 24 / 63; layer "8 nodes" still 8, key "Color: 8 nodes, 8 of 24 nodes", 8 dots blue; selection cleared | `v6-find-replace/12.png` |
| 10 | The layer, Values | Members v01, v02, v09, v13, v17, v21, v23, v24: the 3 board and 5 staff, as before | `v6-find-replace/13.png`, `14.png` |

The fix holds: Replace with the same file keeps the hand-picked layer painting the same 8 nodes.

### 3. Success path by keyboard (`v6-keyboard/`, keyboard-only and screen-reader mode)

Reached the end: 8 blue dots, "role: staff, board, 8 nodes", key "Color: Layer 1"
(`v6-keyboard/63.png`). Focus never fell to the page body after the first key.

| Keys | Focus (screen-reader name) |
| ---- | -------------------------- |
| Tab x14 | Main menu; links Samples, Docs, For developers, GitHub; Switch to dark mode; Settings...; Canvas "A network drawn as a 3D graph..."; Communities (pressed); Key players; Shortest path; 2D; Pause the turning; button "Open a file CSV, GraphML, GEXF, Cytoscape, or a saved project" (14th, as the key says) |
| Enter, the file | button "Load"; live "All 24 rows" |
| Enter | heading "Graph, volunteers: 24 nodes, 63 edges"; live "volunteers: 24 nodes, 63 edges" |
| F6 x4 | Canvas "Graph drawing"; Analyze; "Graph volunteers.graphml" (left panel); the inspector heading |
| F6 x3, Tab x2 | left panel; combobox "Find"; button "Add a layer or a folder" |
| Enter, Enter | menuitem "Layer"; textbox "Layer name" value "Layer 1" |
| Escape | treeitem "Layer 1, node and edge layer, 24 nodes, 63 edges" selected (name kept) |
| F6, Tab x5 | "Select what it paints"; Layer actions; tab Style; tab Node; checkbox Style nodes; "Which nodes, 24 of 24 nodes, All 24 nodes: add a condition to narrow" |
| Enter, Enter | "Add a condition"; combobox "Find an attribute" expanded |
| type `ro`, Tab | highlighted "role, 3 values"; Tab takes it (settled): "role: how to match" value "Is any of" |
| Tab, Tab, Space, Tab, Space | staff checked (live "5 of 24 nodes"), board checked (live "8 of 24 nodes") |
| Shift+Tab x2, Enter | Enter on "volunteer, 16 nodes" closes the picker, nothing ticked; focus "Which nodes, 8 of 24 nodes, role: staff, board, 8 nodes" |
| Tab x4, Enter | Add to node shape, visibility, text, fill; textbox "Node color, not set, drawn #6366F1 indigo"; live "Node color added: pick a value" |
| `blue`, Enter | "Node color, set here, blue" value "0000FF"; live "Node color now blue, on 8 nodes" |
| `red`, Escape, Tab | back to 0000FF, live "Edit discarded; this stays 0000FF."; "Node color by attribute" |
| Find box: `board`, Enter | heading "v01", live "v01 selected" (`70.png`) |
| Escape | inspector heading Graph; live "Selection cleared: 1 node" |
| Find box: `staff`, Escape, Escape | text cleared and list closed; second Escape leaves to the canvas (settled) |
| Find box: `staff`, Tab | button "Clear search"; the list stays open, nothing taken (`87.png`) |

### Defects

None crashes, blocks the task or spoils grading.

1. **A pick from the find box by Enter zooms the camera in and leaves most of the graph off
   screen** (keyboard walk). Enter on "v01" glided the camera close in: two of the three clusters
   are cut off at the top and right and v01 sits about 130 px right of the canvas's center
   (`v6-keyboard/70.png`). Clearing the selection with Escape leaves the view there
   (`80.png`, `87.png`). The settled rule lets the camera glide to center a pick. It does not let
   the camera end off center with the rest of the drawing out of view. A participant who checks the
   blue dots after this sees only some of them.
2. **No visible focus ring on the inspector heading after Load** (keyboard). The screen reader says
   focus is on "Graph, volunteers: 24 nodes, 63 edges", but no ring is drawn
   (`v6-keyboard/21.png`). The settled rule requires a visible ring. This was also found on the
   earlier build.
3. **F6 never reaches the top bar** (keyboard). The cycle is canvas, toolbar, left panel,
   inspector (`v6-keyboard/22.png` to `27.png`). The settled rule lists five regions, starting with
   the top bar. This was also found on the earlier build. The inspector is now entered at its
   heading, which fixes the earlier entry at a middle control.
4. **Enter on a condition's checkbox closes the picker without ticking** (keyboard,
   `v6-keyboard/53.png`). Space ticks. This was also found on the earlier build.
5. **The drawing jumps about 148 px right when a hand-picked layer takes its first color**
   (find-box route, `v6-find-replace/07.png` to `09.png`). One cluster ends under the inspector.
   The answer key describes this. It goes against the settled rule "a key that arrives never
   re-frames the drawing", but it does not change what is painted.
6. **Tab in the find box, with letters typed and a row highlighted, takes nothing and moves to
   "Clear search"** (`v6-keyboard/87.png`). The settled rule that Tab takes the highlighted option
   is written for lists. Whether it also covers the find box, where taking a row selects a node, is
   not settled. This is low severity.

### Not walked on this build

- The earlier detours (a second Open with "Open network data", the Data place's Filter to...) and
  the routes the fixes touched that belong to other tasks (T50A and T50B paths and detours, older
  saved projects, T46A, T46B, T47 and T48 table routes after a community run, T45A Control+O after
  a hand-picked layer, T45A success path). This run was told to walk only the routes this task owns.

---

## Earlier pass on build 3ef9e6c1ec (kept for comparison)


Build: 3ef9e6c1ec (frozen, `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d1-3ef9e6c1ec`,
graphty 0.8.68). Every session started from the empty start screen with clean storage. Sessions,
all under this folder: `3ef-pointer/` (success path by pointer), `3ef-detour-newdata/`,
`3ef-detour-find/`, `3ef-detour-data/` (detours), `3ef-keyboard/` (success path by keyboard, in
keyboard-only and screen-reader mode). The folders `success/`, `detours/` and `keyboard/` beside
them are an older walk on build 5bd16cda6e and are not part of this pass.

The data stayed the file's own the whole way: 24 nodes and 63 edges on the read-the-file page and
in the graph's Values tab on every walk; role counts volunteer 16, staff 5, board 3 everywhere they
show. The counts changed only on a deliberate detour (the same file loaded a second time into the
open graph made 126 edges), and Undo restored them.

**Reached:** yes. By pointer in 13 steps, as the answer key says; on every detour that leads to a
colored result; and by keyboard (section 3).

The round 1 pilot folder holds no earlier report for this task, so the detours walked are the
commonest ones the task list names for a file task (the usage-data card left open, "New from
data..." instead of "Open project or file", Cancel and a second try, Control+O with a graph open)
plus the two side routes the answer key describes for T38 (the find box and the Data place).

### 1. Success path by pointer (`3ef-pointer/`)

| Step | What was done | What the screen showed | Screenshot |
| ---- | ------------- | ---------------------- | ---------- |
| 1 | Start screen | Open project or file..., New from data..., Samples; usage-data card at the bottom | `3ef-pointer/01.png` |
| 2 | No thanks | Card gone | `3ef-pointer/02.png` |
| 3 | Open project or file..., volunteers.graphml | "Open as a new graph"; "volunteers: 24 nodes, 63 edges"; the node rows (id, name, role, hours, trained, phone); "24 node rows and 63 edge rows read; the load makes 24 nodes and 63 edges." | `3ef-pointer/03.png` |
| 4 | Load | Graph drawn; inspector Graph, Values: Nodes 24, Edges 63 | `3ef-pointer/04.png` |
| 5 | "+" beside Style layers (Add a layer or a folder) | Menu: Layer, Folder, Select layers..., Analyze... Shift+A | `3ef-pointer/05.png` |
| 6 | Layer | "Layer 1" added above Everything with its name open for renaming, text selected; inspector Layer 1, "Node and edge layer", Style > Node; Which nodes collapsed: "All 24 nodes: add a condition to narrow" | `3ef-pointer/06.png` |
| 7 | Which nodes | Expands to "Nodes that pass every condition", "Add a condition", Done; no list opens | `3ef-pointer/07.png` |
| 8 | Add a condition | List with "Find an attribute": name, role (3 values), hours (2 to 52), trained (2 values), phone (70% have a value), Node id. The open list covers Done | `3ef-pointer/08.png` |
| 9 | role | Card "role", "Is any of": volunteer, 16 nodes; staff, 5 nodes; board, 3 nodes | `3ef-pointer/09.png` |
| 10 | Tick board | Subtitle becomes "Node layer"; card "3 nodes"; "3 of 24 nodes"; drawing unchanged | `3ef-pointer/10.png` |
| 11 | Tick staff | "8 nodes", "8 of 24 nodes"; drawing unchanged | `3ef-pointer/11.png` |
| 12 | Done | Picker collapses to "role: board, staff, 8 nodes" | `3ef-pointer/12.png` |
| 13 | Fill "+" (hover: tooltip and name "Add to node fill") | Color line, `6366F1` in italics, selected, focus in the box | `3ef-pointer/13.png`, `14.png` |
| 14 | Type `blue`, Enter | `0000FF`, focus stays in the box; key "Color: Layer 1, 8 of 24 nodes" top left; exactly the 8 board and staff dots blue; the drawing did not move | `3ef-pointer/15.png` |
| 15 | Field keys: type `red`, Escape | Box back to `0000FF`, "Edit discarded; this stays 0000FF." under it, focus kept | `3ef-pointer/16.png` |
| 16 | Escape again, then Tab | Focus moves to the next control, "Node color by attribute" (tooltip shown) | `3ef-pointer/17.png`, `18.png` |

### Answer key against the screen

- Matches: "volunteers: 24 nodes, 63 edges" and Nodes 24, Edges 63; the "+" menu; the collapsed
  Which nodes line that only expands; the role card's values and counts; "Node layer" after the
  first tick; "8 of 24" after the second with the drawing unchanged; Fill "+" opens the Color line
  with focus in its box; `blue` gives `0000FF` and focus stays; the final picker text "role: board,
  staff, 8 nodes" in the order ticked; the key names the layer, not the values; 13 steps.
- Mismatch: the key says the key appears "and the drawing jumps right" at step 13. On this build
  the drawing stays put (`3ef-pointer/14.png` against `15.png`), which is what the settled rule
  "the drawing moves only when the reader asks" (2026-10-19) requires. The key is out of date.
- Mismatch with the settled behaviors (not the key): the settled entry of 2026-10-19 says that
  with no condition yet, opening Which nodes opens the attribute list with focus in its search.
  On this build Which nodes only expands and "Add a condition" is a second click or key
  (`3ef-pointer/07.png`; by keyboard `3ef-keyboard/53.png`), as the key describes. The key and
  the build agree with each other and disagree with that settled entry.
- Mismatch (keyboard): the key says "after Layer focus stays in the tree, and Which nodes is 10
  Tabs on". On this build Enter on Layer puts focus in the new layer's name box ("Layer name",
  value "Layer 1", `3ef-keyboard/42.png`); a second Enter keeps the name and returns focus to the
  tree row (`43.png`). From the tree, Tab goes to Graph settings, not the inspector; F6 then 5
  Tabs reach Which nodes (`45.png` to `50.png`).
- Not in the key: by pointer too, Layer opens the new layer's name for renaming
  (`3ef-pointer/06.png`); a click elsewhere keeps "Layer 1".

### 2. Detours

### 2a. Usage-data card left open, "New from data...", Cancel, a second try, then Control+O with the graph open (`3ef-detour-newdata/`)

| Step | What was done | What happened | Screenshot |
| ---- | ------------- | ------------- | ---------- |
| 1 | New from data..., the usage-data card unanswered | "Open as a new graph", empty drop area, "Choose a file...", Load dimmed with "Choose a file first" | `3ef-detour-newdata/02.png` |
| 2 | Choose a file..., volunteers.graphml | The same read-the-file page as the success path, 24 / 63 | `3ef-detour-newdata/03.png` |
| 3 | Cancel | Back to the start screen; the usage-data card still waiting | `3ef-detour-newdata/04.png` |
| 4 | New from data... again, the file, Load | Same graph as the success path, 24 / 63 | `3ef-detour-newdata/05.png` to `07.png` |
| 5 | Control+O with the graph open, the same file | "Add to volunteers": "volunteers adds 0 nodes, 63 edges"; "63 edges in this file are already in volunteers. Load adds them a second time."; Cancel, "Replace volunteers.graphml" (primary), Load, as settled | `3ef-detour-newdata/08.png`, `09.png` |
| 6 | Load (the warned choice) | Edges 126, "63 repeated edges", "From 2 files", the layout redrawn | `3ef-detour-newdata/10.png` |
| 7 | Control+Z | 24 / 63 again; notice "Undid changing settings and importing data."; the nodes are in new places, not where they were before the second load | `3ef-detour-newdata/11.png` |
| 8 | The success path from "+" | Same result as section 1: 8 blue dots, "role: board, staff, 8 nodes", key "Color: Layer 1" | `3ef-detour-newdata/12.png` to `15.png` |

The detour costs a few steps and loses nothing. A participant who presses Load on the Control+O
page and does not undo would report 126 ties; the warning above the buttons says why.

### 2b. Find box: board, Shift+click staff, color the selection (`3ef-detour-find/`)

| Step | What was done | What happened | Screenshot |
| ---- | ------------- | ------------- | ---------- |
| 1 | Click the find box, type `role` | Only "Select by a value: role, Select the 24 nodes (role: has a value)" | `3ef-detour-find/05.png`, `06.png` |
| 2 | Replace with `board` | "Nodes 3": v01, v13, v23 ("role: board"); Values: "role is board (3)" | `3ef-detour-find/07.png` |
| 3 | Click "role is board (3)" | 3 selected; inspector "3 nodes selected", role board (3); the find box empties | `3ef-detour-find/08.png` |
| 4 | Find box, `staff`, Shift+click "role is staff (5)" | "8 nodes selected"; role "staff (5), board (3)" | `3ef-detour-find/09.png`, `10.png` |
| 5 | Style tab | "The first style you set makes a layer for the 8 selected nodes." | `3ef-detour-find/11.png` |
| 6 | Fill "+" | Color line, "Not set yet: the first color you pick makes the layer" | `3ef-detour-find/13.png` |
| 7 | `blue`, Enter | Layer "8 nodes", "Picked by hand: 8 nodes"; notice "Made a layer for the 8 selected nodes"; key "Color: 8 nodes"; 8 dots blue under their selection rings | `3ef-detour-find/14.png` |

This is the answer key's hand-picked route (SD), exactly as described. Find rows name nodes by id
(v01, v13); which column is the label stays open for the sessions.

### 2c. Data place: the role attribute, its values, "Filter to..." (`3ef-detour-data/`)

| Step | What was done | What happened | Screenshot |
| ---- | ------------- | ------------- | ---------- |
| 1 | Data (rail) | Sources, Filters, Attributes: hours, id, name, phone, role ("Category, all have a value"), trained | `3ef-detour-data/05.png` |
| 2 | Click role | "role, Attribute": Category, 100% have a value, 3 distinct values; volunteer 16, staff 5, board 3 | `3ef-detour-data/06.png` |
| 3 | Click, then right-click, the value row "staff 5" | Nothing happens either way | `3ef-detour-data/07.png`, `08.png` |
| 4 | Right-click role | Add label line, Filter to..., Show in table (no color) | `3ef-detour-data/10.png` |
| 5 | Filter to... | "New filter step": an attribute's value, role, Is any of, three checkboxes, Add step dimmed | `3ef-detour-data/11.png` |
| 6 | Tick staff and board | "24 to 8 nodes", Add step enabled | `3ef-detour-data/12.png` |
| 7 | Leave by the Graph rail without Add step | 'Filter step not added: "role is staff or board". Press Add step to use a step.'; nothing hidden | `3ef-detour-data/13.png` |
| 8 | Again, then Add step | The other 16 hidden; top bar "8 of 24 nodes"; "Nodes showing 8 of 24, Edges showing 9 of 63" | `3ef-detour-data/15.png` |
| 9 | Control+Z | All 24 back; 'Undid adding the filter step "role is staff or board".' | `3ef-detour-data/16.png` |

As the key says: the filter hides instead of coloring, and nothing in the Data place colors.

### 3. Success path by keyboard (`3ef-keyboard/`, keyboard-only and screen-reader mode)

Reached the end: 8 blue dots, picker "role: staff, board, 8 nodes", key "Color: Layer 1"
(`3ef-keyboard/78.png`). Focus never fell to the page body after the first key.

| Keys | Focus (screen-reader name) | Screenshot |
| ---- | -------------------------- | ---------- |
| Start | nothing (the page itself), as for any fresh page | `01.png` |
| Tab x13 | Main menu; Local only; Settings...; Open project or file...; New from data...; Open the Les Miserables / Zachary's karate club / College football / Florentine families sample; DisclosureTriangle "What is collected" collapsed (settled); Share usage data; No thanks; Main menu (wraps) | `02.png` to `14.png` |
| Shift+Tab, Enter | No thanks, then button "Open project or file..."; live "Usage data stays off. Change this in Settings > Privacy" | `15.png`, `16.png` |
| (Tab, Shift+Tab), Enter, the file | file chooser; then button "Load"; live "All 24 rows" | `17.png` to `21.png` |
| Enter | heading "Graph, volunteers: 24 nodes, 63 edges"; live "volunteers: 24 nodes, 63 edges" | `22.png` |
| Tab x3 | From volunteers.graphml; Graph actions; tab "Values" selected | `23.png` to `25.png` |
| F6 (x9 in all, to find the left panel) | Canvas "Graph drawing"; Analyze; then the left panel at "Graph volunteers.graphml"; then the inspector at "Graph actions"; then Canvas again | `26.png` to `36.png` |
| Tab x2 | combobox "Find" collapsed; button "Add a layer or a folder" (a third Tab: treeitem "Everything, node and edge layer, 24 nodes, 63 edges") | `37.png` to `39.png` |
| Shift+Tab, Enter, Enter | menuitem "Layer"; then textbox "Layer name" value "Layer 1" | `40.png` to `42.png` |
| Enter | treeitem "Layer 1, node and edge layer, 24 nodes, 63 edges" selected | `43.png` |
| Tab | button "Graph settings" | `44.png` |
| F6 | button "Select what it paints" (inspector) | `45.png` |
| Tab x5 | Layer actions; tab "Style" selected; tab "Node" selected; checkbox "Style nodes" checked; button "Which nodes, 24 of 24 nodes, All 24 nodes: add a condition to narrow" collapsed | `46.png` to `50.png` |
| Enter | button "Add a condition" collapsed (the list does not open) | `53.png` |
| Enter, type `ro` | combobox "Find an attribute" expanded; highlighted option "role, 3 values" | `56.png`, `57.png` |
| Enter | combobox "role: how to match" value "Is any of" | `58.png` |
| Tab, Tab, Space, Tab, Space | checkbox "volunteer, 16 nodes"; "staff, 5 nodes" checked (live "5 of 24 nodes"); "board, 3 nodes" checked (live "8 of 24 nodes") | `59.png` to `63.png` |
| Shift+Tab x5 | board; staff; volunteer; match box; button "Remove role" (the remove button is in the card's header, before the values, as settled) | `65.png` to `69.png` |
| Tab, Escape | match box; Escape closes the picker, edits kept, focus on "Which nodes, 8 of 24 nodes, role: staff, board, 8 nodes" | `70.png`, `71.png` |
| Tab x4 | Add to node shape; Add to node visibility; Add to node text; Add to node fill | `72.png` to `75.png` |
| Enter | textbox "Node color, not set, drawn #6366F1 indigo" value "6366F1"; live "Node color added: pick a value" | `76.png` |
| type `blue`, Enter | textbox "Node color, set here, blue" value "0000FF"; live "Node color now blue, on 8 nodes" | `77.png`, `78.png` |
| type `red`, Escape, Tab | value back to "0000FF", live "Edit discarded; this stays 0000FF."; Tab to "Node color by attribute" | `79.png` to `81.png` |
| Shift+Tab x6 | color box; "Pick node color"; Add to node text; visibility; shape; Which nodes (the disabled Fill "+" is skipped, as settled) | `82.png` to `87.png` |
| Enter, Tab, Enter | picker reopens at the match box; Tab to "volunteer, 16 nodes"; Enter on that checkbox closes the picker without ticking it (focus to Which nodes) | `88.png` to `90.png` |
| Escape | nothing (focus stays on Which nodes) | `91.png` |
| Enter, Tab x4, Enter, Escape | Add a condition; the list opens; Escape closes it, focus back on "Add a condition" | `92.png` to `98.png` |
| Enter, Tab | with nothing typed, Tab closes the list and takes nothing (settled); focus to Done | `99.png`, `100.png` |

### Defects

1. **F6 never reaches the top bar** (keyboard). The settled rule: F6 cycles five regions, the top
   bar, the left panel, the canvas, the canvas toolbar, the inspector. On this build the cycle is
   canvas, toolbar, left panel, inspector, canvas again; the top bar (Main menu, Undo, Redo, the
   file name) is never a stop (`3ef-keyboard/26.png` to `36.png`). F6 from the inspector goes to
   the canvas, not to the top bar.
2. **F6 enters the inspector at a middle control, not its first** (keyboard). Graph: at "Graph
   actions", after "From volunteers.graphml" (`3ef-keyboard/34.png`); Layer 1: at "Select what it
   paints" (`45.png`). Shift+Tab is needed to reach the heading's controls.
3. **No visible focus ring on the inspector heading after the file loads** (keyboard). Focus is on
   heading "Graph, volunteers: 24 nodes, 63 edges" (the screen reader says so) but the screenshot
   shows no ring around "Graph" (`3ef-keyboard/22.png`). The settled rule requires a visible ring
   (WCAG 2.4.7).
4. **Which nodes does not open the attribute list** (pointer and keyboard). The settled rule of
   2026-10-19: with no condition yet, opening Which nodes opens the attribute list with focus in
   its search. Here it only expands; a second click or Enter on "Add a condition" opens the list
   (`3ef-pointer/07.png`, `3ef-keyboard/53.png`). The answer key describes the build's behavior,
   so either the build or the settled entry is wrong.
5. **Escape on the card's match box closes the picker** (keyboard). The settled rule: in the
   picker and its cards Escape keeps edits and keeps the picker open; only Done, a click on the
   canvas, or focus leaving closes it. Escape on "role: how to match" closed the picker, edits
   kept, focus on Which nodes (`3ef-keyboard/71.png`). Nothing is lost, but it is not the
   settled behavior (the settled sentence names text and number boxes; this is a select).
6. **Enter on a condition's checkbox closes the picker instead of toggling it** (keyboard). Enter
   on "volunteer, 16 nodes" closed the picker and left volunteer unticked (`3ef-keyboard/89.png`,
   `90.png`). A keyboard user who presses Enter to tick a value gets no tick and loses the picker;
   Space ticks.
7. **Undo of a second load says "Undid changing settings and importing data."** (detour 2a). The
   participant changed no settings; the notice names an act they did not do
   (`3ef-detour-newdata/11.png`). After the Undo the nodes also sit in new places rather than
   where they were before the second load (compare `07.png` and `11.png`), so the drawing a
   participant had studied is gone even though the data is back.
8. **After Layer, focus lands in the name box** (keyboard; also pointer). Enter on Layer puts focus
   in "Layer name" with "Layer 1" selected (`3ef-keyboard/42.png`, `3ef-pointer/06.png`); a
   keyboard user who goes on typing renames the layer by accident, and one who presses Tab leaves
   the tree. The answer key says focus stays in the tree.
9. **From the layer tree, Tab goes to Graph settings, not to the new layer's inspector**
   (keyboard, `3ef-keyboard/44.png`). The settled rule makes F6 the way to the inspector, so this
   is noted, not counted; a participant who does not know F6 must Tab through the rest of the
   left panel.

### Not walked

- Tab with letters typed in the attribute search (the settled rule says it takes the highlighted
  option; it would have added a second condition to the finished layer).
- Escape and Tab inside the layer name box (only Enter was pressed there).
- Enter, Tab and Escape in the find box on the keyboard walk (it was used by pointer in detour 2b
  only).
