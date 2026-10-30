# Pilot T68 B: a GraphML file of the whole river network (re-pilot after the fix pass)

Build: 037e96e9bb (/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d1-037e96e9bb).
Start: setup `gauges-narrowed.txt` (gauges.csv with flows.csv joined, then a Data source card that
keeps only what came from gauges.csv, so G12 is out of the picture).

Result: **reached** by pointer and by keyboard. Every full-graph GraphML file holds 12 nodes
(G12 included) and 14 edges, as the answer key asks.

Screenshots and step files are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/
(p3-success, p3-detours, p3-keyboard). Each walk was replayed from the earlier walk of the same
route and carried on by hand where the screen differed.

## Start state

"11 of 12 nodes, 13 of 14 edges" with the routes drawn; the Data source card reads 11 of 12. This
is the start the answer key gives for builds after 009087a540. The data is the task's own
(G01 Upper Falls ... G10 Birch Hollow) the whole way.
Screenshot: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p3-success/01.png

## Walk 1: the success path, by pointer (p3-success)

1. Main menu > Export... opens on Data, Format CSV, Table Nodes, Scope "All 12" (02.png).
2. Format > GraphML. Scope now reads "All 12 nodes, 14 edges"; the chips read 12 nodes and 14 edges
   (04.png). The Scope list offers "All 12 nodes, 14 edges", "Shown 11 of 12 nodes, 13 of 14 edges",
   "gauges.csv 11 of 12 nodes, 0 of 14 edges" and "flows.csv 12 nodes, 14 edges" (05.png).
3. Details: "Node visible not written 1" (06.png).
4. Export: "Styles lost in GraphML" with Save anyway / Choose another format (07.png).
5. Save anyway: gauges_graph.graphml, 12 nodes and 14 edges; notice "Exported gauges_graph.graphml"
   (08.png). Control+E afterwards opens on CSV and All 12 again (09.png, 10.png).

File: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p3-success/downloads/gauges_graph.graphml

## Walk 2: detours (p3-detours)

The same detour set as the earlier passes, in one session.

- **Control+S instead of export** (02.png, 03.png): typing "gauges.graphml" and Enter renames the
  project and shows "Saved gauges.graphml in this browser." No file is written.
- **Main menu > Save local copy...** (04.png): writes gauges.graphml.graphty.json, a project file;
  no new notice appears (the earlier "Saved ..." notice is still up).
- **Export's Image tab first, then Project, then Data** (05.png to 07.png); Escape closes (08.png).
- **Turning the left-out node back on first** (09.png to 11.png): ticking flows.csv gives 12 of 12;
  Control+E > GraphML exports at once, 12 nodes and 14 edges. T66's work is undone.
- **Source row Export... then Control+E** (12.png to 14.png, 36.png to 41.png): right-click
  gauges.csv > Export... opens with Scope "gauges.csv 11 of 12 nodes, 0 of 14 edg..." and chips
  "11 of 12" and "0 of 14" (13.png, 37.png). Export saves at once, with no warning step: 11 nodes,
  0 edges. Control+E afterwards opens on the whole graph again: GraphML shows "All 12 nodes, 14
  edges" (40.png), and Save anyway writes 12 nodes and 14 edges. The scope no longer sticks.
- **Graph actions menu** (15.png): no Export item.
- **Quick actions** (20.png to 25.png): typing "graphml" gives "No results" (21.png); typing
  "export" lists Export... Ctrl+E and Save local copy... (24.png).
- **Table options > Export...** with G12 out (28.png to 32.png): opens on the whole graph;
  GraphML > Export now shows "Styles lost in GraphML" and Save anyway writes 12 nodes and 14 edges
  (31.png, 32.png). "Choose another format" closes the warning and keeps GraphML (34.png); Escape on
  the warning closes the whole dialog and focus lands on Table options (35.png).
- **Main menu > Save as...** (42.png to 44.png): the "Save gauges.graphml as" dialog; Tab moves to
  Cancel, Escape closes it.
- **flows.csv source row > Export...** (45.png to 48.png): Scope "flows.csv 12 nodes, 14 edges",
  warning, Save anyway: 12 nodes, 14 edges.

## Walk 3: keyboard only (p3-keyboard, started --keys --sr)

- Tab: button "Main menu"; Enter: menuitem "Back to start"; ArrowDown walks the items to
  "Export..."; Enter opens the dialog with focus on "Close".
- Dialog order: "Close", gridcell "Data", combobox "Format" "CSV", combobox "Table" "Nodes",
  button "Advanced has configured values", combobox "Scope" "All 12", button "8 of 8", button
  "Details", generic "Preview of the exported data", "Cancel", "Export", back to "Close".
- Format: Enter opens, ArrowDown eleven times to "GraphML", Enter picks it. Tab: checkbox
  "Include styles" checked, "Advanced has configured values", Scope "All 12 nodes, 14 edges".
- Scope: Enter opens the list; Tab with the list open does nothing (43.png); Escape closes only the
  list (44.png).
- Export (Enter): focus falls to the page (50.png). Tab goes to "Main menu" and "Project: gauges"
  behind the open dialog (51.png, 52.png). Shift+Tab back from Main menu wraps into the dialog:
  "Export", "Cancel", preview, "Choose another format", "Save anyway". Enter on Save anyway saves
  gauges_graph.graphml (12 nodes, 14 edges); focus returns to "Main menu" and a polite status reads
  "Exported gauges_graph.graphml" (61.png).

Reached by keyboard: yes, but only by Shift+Tab back into the dialog from the page behind it.

## Mismatches with the answer key

None. The start (11 of 12 nodes, 13 of 14 edges), the path (Export opens on Data with CSV;
Format > GraphML > Export > "Styles lost in GraphML" > Save anyway) and the file (12 nodes,
14 edges) match.

## Defects

Most severe first.

1. **Keyboard: Export's warning drops focus to the page, and Tab leaves the open dialog.** After
   Enter on Export, focus is on nothing; the next Tab reaches "Main menu" behind the modal Export
   dialog. Save anyway is reached only by Shift+Tab. Keyboard walk.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p3-keyboard/50.png,
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p3-keyboard/51.png
2. **A source row's GraphML export leaves out a node and every edge with no warning step.** The
   scope and chips now say "11 of 12 nodes, 0 of 14 edges", but Export writes the file at once,
   while the whole-graph export always stops on "Styles lost in GraphML". Detours.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p3-detours/13.png,
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p3-detours/14.png
3. **Control+S with a .graphml name looks like making a GraphML file.** "Saved gauges.graphml in
   this browser." and no file, nothing pointing at Export. Detours.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p3-detours/03.png
4. **"Node visible not written 1" while the file writes G12 as hidden.** The GraphML holds
   graphty.style.node.hidden = true for G12; the line also reads as "a visible node is missing".
   Success path. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p3-success/06.png
5. **Quick actions finds nothing for "graphml".** A person who types the format they want gets
   "No results"; only "export" finds Export.... Detours.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p3-detours/21.png
6. **"Include styles" ticked beside "Styles lost in GraphML".** Success path.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p3-success/07.png
7. **Keyboard: Tab does nothing in an open Scope or Format list.** Keyboard walk.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p3-keyboard/43.png
8. **Save local copy... shows no notice of its own.** Detours.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p3-detours/04.png
9. **The Export dialog's left list is announced as gridcell, not as tabs.** Keyboard walk.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p3-keyboard/14.png
10. **Icon button named "Advanced has configured values" on a fresh export** (tooltip "Advanced").
    Success and keyboard. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p3-success/10.png
11. **"Reopened: layers as layers"** in the warning says nothing a person can use. Success path.
    /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p3-success/07.png
12. **The canvas behind the open Export dialog shows a single gauge**; the rest return when it
    closes. Success path. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p3-success/02.png
13. **depth_cm and installed are written as string columns** in the GraphML. Success path.
    /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p3-success/downloads/gauges_graph.graphml

Fixed since the last pass: the scope after a source row's Export... no longer carries over to
Control+E, the scope and chips count edges for a network format, and Table options > Export...
with a node out of the picture now asks before saving.

## Not walked

The routes of other tasks in this re-pilot's list (T60 to T67, and T68 A) belong to those tasks'
pilots, not to T68 B.
