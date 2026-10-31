# Pilot T68 B: a GraphML file of the whole river network (targeted re-pilot)

Build: ff17391bb1 (frozen, /home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d2-ff17391bb1).
Start: setup `gauges-narrowed.txt` (gauges.csv joined with flows.csv, then a Data source filter
card that keeps only what came from gauges.csv, so G12 is out of the picture).

Result: **reached** by pointer and by keyboard. Every whole-graph GraphML file holds 12 nodes (G12
included) and 14 edges, as the answer key asks. Nothing crashed, no script error was printed, and
the data stayed the task's own gauges (G01 Upper Falls ... G12) the whole way.

Screenshots, step files and saved files are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/ in the folders
p4-start, p4-success, p4-detours and p4-keyboard (not in git). Each walk was replayed from the
newest walk of the same route on this build
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r4-*). The start,
the success path (16 steps) and the keyboard walk (94 steps) matched at every check point to their
end. The detour walk differed at step 9 only because the "Details" link is correctly absent once
nothing is left out of the picture (p4-detours/10.png); it was carried on by hand through the same
remaining 39 steps.

## Routes the fixes touched that belong to this task

- **T68 B start (gauges-narrowed)**: header "11 of 12 nodes, 13 of 14 edges", Data source card on
  gauges.csv only, set to Hide, nothing selected; the Edges tab reads "13 of 14 edges"
  (p4-start/01.png to 03.png). As the key says.
- **T68 B success path**: walk 1 below.
- **T68 B detour: source row Export... then Control+E**: in walk 2 below.

The other routes in the fix list (T60 to T67, and every T68 A route) start from other tasks'
setups and data, which this task's start does not hold; they are walked in those tasks' pilots.

## Walk 1: the success path, by pointer (p4-success)

1. Main menu > Export... opens on Data, Format CSV, Table Nodes, Scope "All 12" (03.png).
2. Format > GraphML: "Include styles" ticked, Scope "All 12 nodes, 14 edges", chips 12 nodes and
   14 edges, line "Lost in GraphML: node visible not written" with Details (05.png). The Scope list
   offers All 12 nodes, 14 edges / Shown 11 of 12 nodes, 13 of 14 edges / gauges.csv 11 of 12
   nodes, 0 of 14 edges / flows.csv 12 nodes, 14 edges (06.png).
3. Export: "Styles lost in GraphML" with Save anyway and Choose another format (09.png).
4. Save anyway: gauges_graph.graphml, 12 nodes and 14 edges; notice "Exported gauges_graph.graphml"
   (10.png). Control+E again keeps a Recent list; clicking the file brings back GraphML (16.png).

File: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p4-success/downloads/gauges_graph.graphml

## Walk 2: detours (p4-detours), the same set as the earlier passes

- **Control+S instead of export** (02.png, 03.png): typing "gauges.graphml" and Enter renames the
  project, "Saved gauges.graphml in this browser."; no file. Not success per the key.
- **Main menu > Save local copy...** (04.png): writes gauges.graphml.graphty.json; no notice of its own.
- **Export's Image tab, then Project, then Data** (05.png to 07.png); Escape closes (08.png).
- **Turning the left-out gauge back on first** (09.png to 11.png): flows.csv ticked gives 12 of 12;
  Control+E > GraphML shows no loss line and Export saves at once: 12 nodes, 14 edges. T66's work
  is undone.
- **Source row Export... then Control+E** (12.png to 14.png, 37.png to 42.png): gauges.csv row >
  Export... opens on "gauges.csv 11 of 12 nodes, 0 of 14 edg...", chips "11 of 12" and "0 of 14"
  (38.png); Export saves at once, with no Save anyway step: 11 nodes, 0 edges. Control+E afterwards
  opens on the whole graph, "All 12 nodes, 14 edges", and Save anyway writes 12 nodes, 14 edges.
- **Graph actions menu** (15.png): no Export item.
- **Quick actions** (20.png to 24.png): "graphml" gives no results (21.png); "export" finds
  Export... Ctrl+E and Save local copy....
- **Table options > Export...** (29.png to 32.png): GraphML, Save anyway: 12 nodes, 14 edges.
  "Choose another format" keeps GraphML; Escape on the warning closes the dialog (35.png, 36.png).
- **Main menu > Save as...** (43.png to 45.png): Tab moves to Cancel; Escape closes.
- **flows.csv row Export...** (46.png to 49.png): scope "flows.csv 12 nodes, 14 edges", Save
  anyway: 12 nodes, 14 edges.

Files: four of 12 nodes and 14 edges, two of 11 nodes and 0 edges (both from the gauges.csv row),
under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p4-detours/downloads/.

## Walk 3: keyboard only (p4-keyboard, --keys --sr)

- Tab: button "Main menu"; Enter opens the menu; arrows reach "Export..."; Enter opens the dialog
  with focus on "Close".
- Dialog order: Close, gridcell "Data", combobox "Format" CSV, combobox "Table" Nodes, button
  "Advanced has configured values", combobox "Scope" "All 12", button "8 of 8", button "Details",
  generic "Preview of the exported data", Cancel, Export, then Close.
- Format: Enter opens, ArrowDown to GraphML, Enter picks; typing "graphm" in the open list also
  finds it. Scope: Enter opens, Escape closes only the list, Tab and Shift+Tab in the open list do
  nothing, Space picks.
- Export (Enter): the warning appears and focus falls to the page body (53.png). Tab then walks
  the page behind the open dialog: Main menu, Project, Undo (focus ring on Undo beside the dialog,
  57.png), Redo, Filter, Clear filters, Data, Sources. Shift+Tab from Main menu wraps into the
  dialog's end: Export, Cancel, preview, Choose another format, Save anyway. Enter saves
  gauges_graph.graphml (12 nodes, 14 edges); focus returns to Main menu; polite status
  "Exported gauges_graph.graphml".

Reached by keyboard: yes, but only by Shift+Tab back into the dialog from the page behind it.

## Mismatches between the answer key and the screen

None. Start (11 of 12 nodes, 13 of 14 edges), path (Export opens on Data with CSV; Format > GraphML,
Scope "All 12 nodes, 14 edges" > Export > "Styles lost in GraphML" > Save anyway) and file (12 nodes,
14 edges) all match. The gauges.csv row's export (11 nodes, 0 edges at once) matches the key's
"other doors" for B, which grade it as not success.

## Defects

Most severe first.

1. **Keyboard: Export's warning drops focus to the page, and Tab leaves the open dialog.** Undo and
   Clear filters behind the modal are reachable, so Enter there would change the data behind it.
   Save anyway is reached only by Shift+Tab. Keyboard walk.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p4-keyboard/53.png,
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p4-keyboard/57.png
2. **A source row's GraphML export writes no edges with no Save anyway step**, while the
   whole-graph export stops on the warning for one hidden node. The scope says "0 of 14 edges".
   Detours. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p4-detours/38.png
3. **Control+S with a .graphml name looks like making a GraphML file**: "Saved gauges.graphml in
   this browser.", no file, nothing pointing at Export. Detours.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p4-detours/03.png
4. **Keyboard: Tab and Shift+Tab do nothing in an open Scope or Format list.** Keyboard walk.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p4-keyboard/44.png
5. **The Export dialog's left list is announced as gridcell, not as tabs.** Keyboard walk.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p4-keyboard/25.png
6. **Icon button named "Advanced has configured values"** on a fresh export (tooltip "Advanced").
   Success and keyboard. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p4-success/08.png
7. **"Include styles" ticked beside "Styles lost in GraphML"**, and "Reopened: layers as layers"
   says nothing a person can use. Success path.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p4-success/09.png
8. **Quick actions finds nothing for "graphml".** Detours.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p4-detours/21.png
9. **Save local copy... shows no notice of its own.** Detours.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p4-detours/04.png
10. **The canvas behind the open Export dialog shows a single gauge.** Success path.
    /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68B/p4-success/03.png

## Skipped

None of this task's routes. The T60 to T67 and T68 A routes in the fix list start from other
tasks' setups and are walked in those tasks' pilots.
