# Pilot: T68 B (a GraphML file of the whole river network), targeted re-walk

Build: ff17391bb1 (frozen, `.study-builds/tier4-r1d2-ff17391bb1`). Screenshots, step files and the
saved files are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B
(not in git), in the folders r4-start, r4-success, r4-detours and r4-keyboard.

Every walk starts from the task's own start, `gauges-narrowed.txt` (gauges.csv joined with
flows.csv, then a Data source filter card that keeps what came from gauges.csv, so G12 is out of
the picture).

Of the routes the fixes touched, one belongs to this task: the T68 start (the narrowed card, no
select card, selection unchanged). It was walked in a session of its own (r4-start) and is also
the first screen of every other walk. The T64 and T65 routes in the same list start from those
tasks' own setups and are walked in those tasks' pilots.

r4-success and r4-keyboard replayed the earlier walks of the same routes on this build and matched
at every check point to their end (16 and 94 steps). r4-detours replayed the detour route, which
differed at step 9 (a "Details" link that is correctly absent once nothing is left out), and was
carried on by hand to its end (48 steps). Every saved file was read and counted.

## Start (the narrowed card) -- as the answer key says (r4-start)

- The header reads "11 of 12 nodes, 13 of 14 edges"; Graph > Values shows Nodes showing 11 of 12,
  Edges showing 13 of 14; Full graph 12 nodes, 14 edges (01.png).
- Filters holds one Data source card (gauges.csv ticked, flows.csv not), set to Hide. No select
  card, and nothing is selected (`selected=0` held). The Edges tab reads "13 of 14 edges", Shown
  (02.png). The data is the task's own gauges (G01 to G11 with lat, lon, depth_cm, station, code,
  installed).

## 1. Success path by pointer -- reached (r4-success)

- Main menu > Export... opens on Data, Format CSV, Table Nodes, Scope "All 12" (03.png).
- Format lists Tables and Network files; GraphML picked (05.png): "Include styles" ticked, Scope
  "All 12 nodes, 14 edges", chips 12 nodes and 14 edges, line "Lost in GraphML: node visible not
  written" with Details.
- Scope list: All 12 nodes, 14 edges / Shown 11 of 12 nodes, 13 of 14 edges / gauges.csv 11 of 12
  nodes, 0 of 14 edges / flows.csv 12 nodes, 14 edges (06.png). Every option now counts edges too.
- Export shows "Styles lost in GraphML" with Save anyway and Choose another format (09.png); Save
  anyway saved gauges_graph.graphml and showed "Exported gauges_graph.graphml" (10.png).
- File: 12 nodes (G12 included) and 14 edges, as the key asks
  (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r4-success/downloads/gauges_graph.graphml).
- Control+E again: the dialog keeps a Recent list; clicking gauges_graph.graphml brings back
  GraphML and its scope (16.png). The filter card stayed as it was the whole way.

## 2. Detours -- the same set as the earlier passes (r4-detours)

- **Control+S instead of export** (02.png, 03.png): "Save gauges as", typing gauges.graphml and
  Enter renames the project and shows "Saved gauges.graphml in this browser." No file; nothing
  points to Export. Not success per the key.
- **Main menu > Save local copy...** (04.png): writes gauges.graphml.graphty.json; no notice of its
  own (the earlier save's notice is still up).
- **Export dialog's Image tab, then Project, then Data** (05.png to 07.png); Escape closes.
- **Turning the left-out gauge back on first** (09.png to 11.png): ticking flows.csv gives 12 of
  12; Control+E > GraphML shows no loss line and Export saves at once: 12 nodes, 14 edges. T66's
  work is undone, as before.
- **The source row's Export...** with everything on (12.png to 14.png): scope "gauges.csv 11 of 12
  nodes, 0 of 14 edges", chips "11 of 12" and "0 of 14"; Export saves at once a file of 11 nodes
  and 0 edges. The screen now says what is left out.
- **Graph actions menu** (15.png): no Export item. **Quick actions** (20.png to 24.png): "graphml"
  finds nothing; "export" finds Export... (Ctrl+E) and Save local copy....
- **Table options > Export...** with the card back on gauges.csv (28.png to 32.png): GraphML,
  scope All 12 nodes, 14 edges, Save anyway: 12 nodes, 14 edges.
- **Control+E after a source row's export** (33.png, 34.png): opens on the whole graph, "All 12
  nodes, 14 edges". The scope no longer sticks.
- **gauges.csv row Export... while narrowed** (37.png to 39.png): scope "gauges.csv 11 of 12
  nodes, 0 of 14 edges"; Export saves at once, with no Save anyway step: 11 nodes, 0 edges.
- **flows.csv row Export...** (46.png to 49.png): scope "flows.csv 12 nodes, 14 edges", Save
  anyway: 12 nodes, 14 edges.
- **Main menu > Save as...** (43.png to 45.png): the save dialog; Tab moves to Cancel; Escape
  closes it.

Files: three of 12 nodes and 14 edges, two of 11 nodes and 0 edges (both from the gauges.csv row),
one from the gauge turned back on, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r4-detours/downloads/.

## 3. Keyboard only -- reached (r4-keyboard, --keys --sr)

- Tab: button "Main menu"; Enter opens the menu on "Back to start"; arrows walk the menu items by
  name; Enter on "Export..." opens the dialog with focus on "Close" (02.png to 12.png).
- Dialog order: Close, gridcell "Data", combobox "Format" CSV, combobox "Table" Nodes, button
  "Advanced has configured values", combobox "Scope" "All 12", button "8 of 8", button "Details",
  generic "Preview of the exported data", Cancel, Export, then Close again.
- Format: Enter opens the list; eleven ArrowDowns and Enter pick GraphML; typing "graphm" with the
  list open also highlights GraphML (82.png). Escape closes only the list.
- Scope: Enter opens, Escape closes the list only; Tab and Shift+Tab with the list open do nothing
  (43.png, 44.png); Space picks.
- Export (Enter): the "Styles lost in GraphML" warning appears and focus falls to the page body
  (53.png). The next Tab goes to "Main menu" behind the open dialog, then Project, Undo, Redo,
  Filter, Clear filters, Data, Sources (55.png to 63.png); the Export dialog stays on screen
  (57.png shows the focus ring on Undo beside the open dialog).
- Shift+Tab from Main menu wraps into the dialog's end: Export, Cancel, preview, Choose another
  format, Save anyway. Enter saves gauges_graph.graphml (12 nodes, 14 edges); focus returns to Main
  menu and a polite status reads "Exported gauges_graph.graphml" (70.png).
- Control+E: Tab reaches the Recent item (gridcell "gauges_graph.graphml"); Enter brings back
  GraphML. Escape closes the dialog with focus on Main menu.
- In every field opened: Enter opens or picks, Escape closes only the open list or the dialog, Tab
  in an open list does nothing (see above).

## Mismatches between the answer key and the screen

1. The key's start for B says 11 of 12 nodes and 13 of 14 edges; the screen agrees. The key's path
   names no scope; the screen's default "All 12 nodes, 14 edges" is right (r4-success/05.png).
2. The key's "other doors" describe the source row's Export for A only. For B, the gauges.csv row's
   Export... writes 11 nodes and 0 edges with no Save anyway step; the scope line says "0 of 14
   edges", so it is not silent, but it is neither the whole network nor what is in the picture (13
   edges), so the key's equally-right case does not cover it (r4-detours/38.png).

## Defects

Ordered most severe first. Nothing crashed, no script errors were printed, and the task's data
stayed the task's own throughout.

1. **Keyboard: Export's warning drops focus to the page, and Tab leaves the open dialog.** After
   Enter on Export, focus is on nothing; Tab walks the page behind the modal (Undo, Clear filters
   reachable, so Enter there would change the data behind the dialog). Save anyway is reached only
   by Shift+Tab out of the top of the page. Keyboard route.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r4-keyboard/53.png,
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r4-keyboard/57.png
2. **A source row's Export writes a network file with no edges and no Save anyway step.** gauges.csv
   row > Export... > GraphML saves 11 nodes and 0 edges at once; the whole-graph export asks Save
   anyway for one hidden node. The scope line does say "0 of 14 edges". Detours route.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r4-detours/38.png
3. **Saving with a .graphml name looks like making a GraphML file.** Control+S, "gauges.graphml",
   Enter: "Saved gauges.graphml in this browser." No file, no pointer to Export. Detours route.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r4-detours/03.png
4. **Keyboard: Tab and Shift+Tab do nothing in an open Scope or Format list.** Keyboard route.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r4-keyboard/44.png
5. **The export dialog's left list is announced as gridcell/row, not as tabs**; ArrowDown moves to
   Styles without switching. Keyboard route.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r4-keyboard/25.png
6. **Icon button named "Advanced has configured values"** on a fresh export; its tooltip is
   "Advanced". Success and keyboard routes.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r4-success/08.png
7. **"Include styles" is ticked while the same panel says "Styles lost in GraphML"**, and
   "Reopened: layers as layers" is unexplained. Success route.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r4-success/09.png
8. **Save local copy... shows no notice of its own.** Detours route.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r4-detours/04.png
9. **Quick actions finds nothing for "graphml"**, the word this task's person would type. Detours
   route. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r4-detours/21.png
10. **The canvas behind the Export dialog shows only one gauge** while the dialog is open. Success
    route. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r4-success/03.png
11. **depth_cm is written as a string column in the GraphML** (attr.type="string"; the column holds
    one "-"). Keyboard route, screen-reader read of the preview (r4-keyboard step 54).
12. **The Data source card's effect reads "Select | Hide"**, not the decided "Filter to | Filter
    out" wording. Start route.
    /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r4-start/01.png

## Skipped

None of this task's routes. The T64 and T65 routes in the fix list (their success paths, the table
header Role > Weight detours, the Analyze routes, the find-name check and the selection inspector)
start from those tasks' own setups and data, which this task's start does not hold; they are walked
in the T64 and T65 pilots, not here.
