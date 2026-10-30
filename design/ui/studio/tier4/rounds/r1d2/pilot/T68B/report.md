# Pilot: T68 B (a GraphML file of the whole river network), targeted re-walk

Build: bccf8fe47f (frozen, `.study-builds/tier4-r1d2-bccf8fe47f`). Screenshots, step files and the
saved files are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B
(not in git), in the folders r5-start, r5-success, r5-detours and r5-keyboard.

Every walk starts from the task's own start, `gauges-narrowed.txt` (gauges.csv joined with
flows.csv, then a Data source filter card that keeps what came from gauges.csv, so G12 is out of
the picture).

Of the routes the fixes touched, one belongs to this task: the T68 start (the narrowed Hide card's
count). It was walked in a session of its own (r5-start) and is also the first screen of every
other walk. The T61, T65, T66 and T67 routes in the same list start from those tasks' own setups
and data, which this task's start does not hold; they are walked in those tasks' pilots.

Each walk replayed the newest earlier walk of the same route (r4-*, on the build before this one):

- r5-success: all 16 steps matched; ended.
- r5-keyboard (--keys --sr): all 94 steps matched; ended.
- r5-start: step 1 matched (counts, the card, nothing selected); step 2, a click on what was empty
  canvas, now lands on node G03 because the unseeded layout drew the graph in other places (02.png,
  03.png). Not a defect. Escape cleared the selection again (selected=0, 04.png); ended.
- r5-detours: stopped at step 9 ("Details" not on screen once nothing is left out, as on the
  earlier build: 10.png shows no loss line), and was carried on by hand with the earlier route's
  remaining steps to its end (49 screenshots); ended.

Every saved file was read and counted.

## Start (the narrowed card) -- as the answer key says (r5-start)

- The header reads "11 of 12 nodes, 13 of 14 edges"; Graph > Values shows Nodes showing 11 of 12,
  Edges showing 13 of 14; Full graph 12 nodes, 14 edges (01.png, 02.png).
- Filters holds one Data source card (gauges.csv ticked, flows.csv not), set to Hide, its chip
  "11 of 12". No select card, nothing selected. The Edges tab reads "13 of 14 edges", Shown
  (02.png). The data is the task's own gauges (G01 to G11 with lat, lon, depth_cm, station, code,
  installed).

## 1. Success path by pointer -- reached (r5-success)

- Main menu > Export... opens on Data, Format CSV, Table Nodes (03.png).
- GraphML picked (05.png): "Include styles" ticked, Scope "All 12 nodes, 14 edges", chips 12 and
  14, line "Lost in GraphML: node visible not written" with Details.
- Scope list: All 12 nodes, 14 edges / Shown 11 of 12 nodes, 13 of 14 edges / gauges.csv 11 of 12
  nodes, 0 of 14 edges / flows.csv 12 nodes, 14 edges (06.png).
- Export shows "Styles lost in GraphML" with Save anyway and Choose another format (09.png); Save
  anyway saved gauges_graph.graphml and showed "Exported gauges_graph.graphml" (10.png).
- File: 12 nodes (G12 included) and 14 edges, as the key asks
  (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r5-success/downloads/gauges_graph.graphml).
- Control+E again: the Recent list brings back GraphML and its scope (16.png). The filter card
  stayed as it was the whole way.

## 2. Detours -- the same set as the earlier passes (r5-detours)

- **Control+S instead of export** (02.png, 03.png): "Save gauges as", gauges.graphml, Enter renames
  the project and shows "Saved gauges.graphml in this browser." No file. Not success per the key.
- **Main menu > Save local copy...** (04.png): writes a .graphty.json; no notice of its own.
- **Export dialog's Image, Project, Data** (05.png to 07.png); Escape closes.
- **Turning the left-out gauge back on first** (09.png to 11.png): 12 of 12; GraphML shows no loss
  line and Export saves at once: 12 nodes, 14 edges. T66's work is undone.
- **The gauges.csv row's Export...** with everything on (12.png to 14.png): scope "gauges.csv 11 of
  12 nodes, 0 of 14 edges", chips "11 of 12" and "0 of 14"; Export saves at once: 11 nodes, 0 edges.
- **Graph actions menu** (15.png): no Export item. **Quick actions**: "graphml" finds nothing;
  "export" finds Export... (Ctrl+E) and Save local copy....
- **Table options > Export...** with the card back on gauges.csv: GraphML, All 12 nodes, 14 edges,
  Save anyway: 12 nodes, 14 edges.
- **Control+E after a source row's export**: opens on the whole graph, "All 12 nodes, 14 edges".
- **gauges.csv row Export... while narrowed** (37.png to 39.png): scope "gauges.csv 11 of 12 nodes,
  0 of 14 edges"; Export saves at once with no Save anyway step: 11 nodes, 0 edges.
- **Main menu > Save as...**: the save dialog; Tab moves to Cancel; Escape closes it.
- **flows.csv row Export...**: scope "flows.csv 12 nodes, 14 edges", Save anyway: 12 nodes, 14 edges.

Files: four of 12 nodes and 14 edges, two of 11 nodes and 0 edges (both from the gauges.csv row),
under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r5-detours/downloads/. Same counts as the earlier pass.

## 3. Keyboard only -- reached (r5-keyboard, --keys --sr)

All 94 steps matched the earlier walk, so its readings stand on this build:

- Tab: "Main menu"; Enter opens it; arrows walk the items; Enter on "Export..." opens the dialog
  with focus on "Close".
- Dialog order: Close, gridcell "Data", combobox "Format", combobox "Table", button "Advanced has
  configured values", combobox "Scope", button "8 of 8", button "Details", the preview, Cancel,
  Export, then Close again.
- Format: Enter opens; ArrowDown and Enter pick GraphML; typing "graphm" highlights it. Escape
  closes only the list. Scope: Enter opens, Escape closes the list only, Space picks; Tab and
  Shift+Tab with the list open do nothing.
- Export (Enter): the "Styles lost in GraphML" warning appears and focus falls to the page body
  (52.png, 53.png). The next Tab goes to "Main menu" behind the open dialog, then Project, Undo,
  Redo, Filter, Clear filters, Data, Sources. Shift+Tab back up wraps into the dialog's end: Export,
  Cancel, preview, Choose another format, Save anyway. Enter saves gauges_graph.graphml (12 nodes,
  14 edges); focus returns to Main menu and a polite status reads "Exported gauges_graph.graphml".
- Control+E: Tab reaches the Recent item; Enter brings back GraphML. Escape closes with focus on
  Main menu.

## Mismatches between the answer key and the screen

1. None on the success path: start counts, scope default "All 12 nodes, 14 edges" and the saved
   file (12 nodes, 14 edges) all agree with the key (r5-success/05.png, 10.png).
2. The key's "other doors" cover the source row's Export for A only. For B, the gauges.csv row's
   Export... writes 11 nodes and 0 edges with no Save anyway step; the scope says "0 of 14 edges",
   so it is not silent, but it is neither the whole network nor what is in the picture
   (r5-detours/38.png).

## Defects

Ordered most severe first. Nothing crashed, no script errors were printed, and the task's data
stayed the task's own throughout. All were present on the earlier build; none is new.

1. **Keyboard: Export's warning drops focus to the page, and Tab leaves the open dialog** into the
   page behind it (Undo, Clear filters reachable). Save anyway is reached only by Shift+Tab out of
   the top of the page. Keyboard route.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r5-keyboard/53.png
2. **A source row's Export writes a network file with no edges and no Save anyway step** (11
   nodes, 0 edges). Detours route. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r5-detours/38.png
3. **Saving with a .graphml name looks like making a GraphML file**; no file, no pointer to
   Export. Detours route. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r5-detours/03.png
4. **Keyboard: Tab and Shift+Tab do nothing in an open Scope or Format list.** Keyboard route.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r5-keyboard/44.png
5. **The export dialog's left list is announced as gridcell/row, not as tabs.** Keyboard route.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r5-keyboard/25.png
6. **Icon button named "Advanced has configured values"** on a fresh export. Success and keyboard
   routes. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r5-success/08.png
7. **"Include styles" ticked while the panel says "Styles lost in GraphML"**; "Reopened: layers as
   layers" unexplained. Success route. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r5-success/09.png
8. **Save local copy... shows no notice of its own.** Detours route. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r5-detours/04.png
9. **Quick actions finds nothing for "graphml".** Detours route. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r5-detours/21.png
10. **The canvas behind the Export dialog shows only one gauge** while the dialog is open. Success
    route. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r5-success/03.png
11. **depth_cm is written as a string column in the GraphML** (the column holds one "-"). Keyboard
    route, screen-reader read of the preview.
12. **The Data source card's effect reads "Select | Hide"**, not the decided "Filter to | Filter
    out" wording. Start route. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r5-start/01.png

## Skipped

None of this task's routes. The T61, T65, T66 and T67 routes in the fix list start from those
tasks' own setups and data and are walked in their own pilots.
