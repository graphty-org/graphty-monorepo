# Pilot: T78 B (gauges -- every gauge with more than one walkable stretch next to it)

Build: baac78342b, served from `.study-builds/tier5-r1-baac78342b`. Every walk started from the
task's real start, `setup:gauges-clean.txt` (11 gauges, 13 stretches, station as the label, the
node table open). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1/pilot/T78B/ (below, `<walk>/NN.png`).
The data stayed the task's own on every walk: 11 nodes and 13 edges at the start and at the end;
the only filter was the one detour 1 built on purpose (10 of 13 edges).

Result: **reached** by pointer and by keyboard, 7 of 11 (G02 Mill Pond, G03 Cedar Bend, G04 Fox
Creek, G05 Old Bridge, G07 Stone Weir, G08 Heron Marsh, G11 Quarry Pool), as the answer key says.
The answer key's route works as written. Two of the three detours end on the near miss, 9, with
nothing on screen saying the long stretches were counted.

## 1. Success path by pointer (`success/`)

| Step | What happened | Screenshot |
| --- | --- | --- |
| Start | Graph place; layers Hovered, Selected, Pinned, Everything; node table open | success/01.png |
| + > Layer | Layer 1, name box focused; the node table switches to Matches only with a Group column ("Which nodes" on every row) | 03, 04 |
| Which nodes | Workspace "Which nodes -- Layer 1 11 of 11"; picker lists Node id, lat, lon, depth_cm, station, code, installed, telemetry, Data source -- no Degree until searched | 05 |
| type "degree" | Degree, In-degree, Out-degree; the picker jumps up over the workspace header and covers Done | 06 |
| Enter | Degree step, By value, Min box focused; histogram 1 to 4 | 07 |
| type 2, Enter | "Degree min 2", 9 of 11 (the near miss) | 08 |
| Advanced | Edges: All edges / Edges where ... | 09 |
| Edges where ..., Edge value... | Picker: km (1.6 to 3.6), Data source | 10, 11 |
| km | km By value, its Min box focused | 12 |
| click "km to", Ctrl+A, 2.9, Enter | 7 of 11; row "Degree min 2 Edges"; Advanced's right "Edges: km max 2.9" | 13 |
| Done | Layer 1 row 7 | 18 |
| Fill + (Add to node fill), FF8C00, Enter | Seven nodes orange; key "Color: Layer 1, 7 of 11 nodes" | 21, 22 |

Field keys:

- km to box: Enter commits (13). Tab leaves the workspace altogether: focus lands on "Local only"
  in the status bar at the bottom right (14).
- km to box: typed 2.5, Escape: Advanced closed and the 2.5 was kept ("Edges: km max 2.5", 15).
  Matches decided.md (Escape closes an open Advanced; Escape never discards work).
- A click that landed on the step pane while Advanced was opening, then Ctrl+A, selected every node
  and edge of the graph; the selection's blue edges and yellow rings drew over the preview (16, 17)
  and the inspector showed "11 nodes, 13 edges selected" after Done (18). An empty-canvas click
  cleared it (19).
- Hex box: Tab goes to the link button (24).

## 2. Detours

### Detour 1 -- the Data place's filter on the stretches (`detour-1/`)

Data > Filters + (Add filter) > Edges > Value... > km > km to 2.9: "10 of 13 edges", the top bar
"11 of 11 nodes, 10 of 13 edges" (10). Done; Graph; + > Layer; Which nodes; degree; 2: 7 of 11
(12); Fill FF8C00: seven orange (13). An equal count, but the three long stretches are gone from
every reader's picture (the answer key's "also success").

- The new filter's workspace draws the matches strip over the main table: the strip's header is
  cut at the left ("es only") and the main table's rows show above the strip (05, 06, 09).
- Switching the new card to Edges left the picker shut, as decided.md says; the strip lists edges
  but the main table above it still shows nodes (06).

### Detour 2 -- searching the picker for the person's words, then Degree on every stretch (`detour-2/`)

- "next to": Nothing found (02). "count": Nothing found (04). "neighbor": only Neighbors of
  selection (03), and the picker again jumps up over the header.
- Neighbors of selection: "Within 1 hop of Selected (0)", Passes none, 0 of 11 (05).
- Changed the step's value field to Degree: focus went to the slider "Degree range", not the Min
  box, so typing 2 typed nothing (07); a click on the Min box, 2, Enter.
- Left Advanced on All edges, Done, Fill: nine orange, key "9 of 11 nodes" (08). The near miss; a
  participant would answer 9.

### Detour 3 -- coloring the walkable stretches first, then the gauges (`detour-3/`)

- Layer 1, Edit edges, Which edges, km, km to 2.9: "km max 2.9", 10 of 13 (04); Done; Line +
  Color FF8C00: ten orange stretches (06).
- Edit nodes, Which nodes, Degree min 2: 9 of 11 (07). The same layer's own edge selection does not
  touch the node step's Degree; nothing says so. Advanced still says All edges; Edges where ...
  opened with an empty Edge value (08).
- Done with Edges where left empty, Fill FF8C00: nine orange gauges joined by ten orange stretches
  (09). The near miss; a participant would answer 9, and the picture looks like it agrees.

## 3. Keyboard only (`keyboard/`, started `--keys --sr`)

Reached the end with keys only, 7 of 11, filled orange (88.png).

- Tab x9 to "Add a layer or a folder" (Main menu, Project: gauges, Undo, Redo (disabled), Graph,
  Graph gauges.csv, Find, Add), Enter: menuitem "Layer", Enter: textbox "Layer name", Enter:
  treeitem "Layer 1, node and edge layer, 11 nodes, 13 edges".
- Tab x19 to treeitem "Which nodes, 11 of 11 nodes" (through Graph settings, the left panel's resize
  handle, Canvas "Graph drawing", Analyze, the table's resize handle, its tabs, Matches only, "With
  issues 11", Columns, Table options, Maximize, Close, columnheader Group, Select what it paints,
  Layer actions, Style, Node, Style nodes).
- Enter: combobox "Find attributes, results" focused, said "Editing Which nodes, Layer 1"; typed
  degree, Enter: textbox "Degree from, number"; 2, Enter: "9 of 11 nodes" said twice.
- Tab: "Degree to, number"; Tab: button "Advanced" collapsed; Enter: expanded; Tab: radio "All
  edges"; ArrowRight: "Edges where" taken, focus to button "Edge value: none"; Enter: combobox
  "Find edge attributes"; km, Enter: textbox "km from, number"; Tab: "km to, number"; Ctrl+A, 2.9,
  Enter: "7 of 11 nodes" said twice (47).
- Tab from "km to": button "Local only" in the status bar (48), then Main menu, Project, Undo,
  Redo, Graph, Canvas "Preview: Which nodes -- Layer 1", the main table's controls, the inspector,
  and only then the workspace header: Group colors, Table of matches, Clear, Cancel, Done -- 31
  Tabs from the last field to Done (49 to 80). The header comes after the inspector in Tab order,
  and the workspace's outline and fields come after the header.
- Enter on Done: focus back to treeitem "Which nodes, 7 of 11 nodes", said "Done, 7 of 11" (81).
- Tab x6 (Edit Which nodes, Add to node shape, visibility, text, fill), Enter: textbox "Node color,
  not set, drawn #6366F1 indigo", said "Node color added: pick a value"; FF8C00, Enter: "Node color
  now dark orange, on 7 nodes" (88).
- Edit Which nodes, Enter: the outline row "Degree min 2, Edges: km max 2.9, 7 of 11 nodes so far";
  Escape: closed as Done, focus back to Edit Which nodes (96). As decided.
- Focus never fell to the page body.

## Mismatches with the answer key

None in the result or the route. The answer key's "the row reads Degree min 3 Edges" (written for A)
reads "Degree min 2 Edges" here, and Advanced's right "Edges: km max 2.9", as expected for B.

## Defects

1. **Tab from the last field of the workspace leaves it for the status bar** ("Local only"); the
   workspace header (Done, Cancel, Clear) is about 31 Tabs away, after the inspector. Pointer
   success/14.png; keyboard/48.png to 80.png.
2. **Degree is missing from the value picker until searched.** The open list shows Data columns
   only (success/05.png); decided.md lists Degree under Data.
3. **The picker jumps up over the workspace header once a search is typed**, covering Done
   (success/06.png, detour-2/03.png); decided.md says pickers under fields never flip up over the
   header.
4. **The person's words do not find Degree**: "next to", "count" find nothing, "neighbor" finds
   only Neighbors of selection (detour-2/02.png, 03.png, 04.png).
5. **Changing an existing step's value to Degree focuses the range slider, not the Min box**, so
   typing does nothing (detour-2/07.png); a new step focuses the Min box (success/07.png).
6. **A node step's Degree ignores the same layer's edge selection with nothing said**: with Which
   edges at km max 2.9, Degree min 2 still counts every stretch, 9 (detour-3/07.png, 09.png). A
   participant who colored the walkable stretches reads a picture that seems to agree with 9.
7. **Degree on every stretch gives the near miss 9 with no cue** that the long stretches count
   (detour-2/08.png); Advanced is the only way in and is collapsed.
8. **The main table and the matches strip both draw** in the workspace: in a filter card the strip's
   header is cut ("es only") and node rows show over an edge strip (detour-1/05.png, 06.png;
   detour-3/04.png; success/05.png). Already a build note.
9. **Adding a layer switches the open node table to Matches only with a Group column** reading
   "Which nodes" on every row, before any rule is made (success/04.png).
10. **The count is announced twice** after each edit ("9 of 11 nodes", "7 of 11 nodes"; keyboard
    walk at 37.png and 47.png).
11. **Ctrl+A with focus on the workspace pane selects the whole graph**, drawing the selection over
    the preview and leaving everything selected after Done (success/16.png to 18.png).
12. **"With issues N" sits in the table header and tracks the row count** (11, then 9, then 7)
    while no column has an issue the reader made; the station column shows a warning sign
    (success/01.png, 13.png). A participant may read it as something wrong with the data.
