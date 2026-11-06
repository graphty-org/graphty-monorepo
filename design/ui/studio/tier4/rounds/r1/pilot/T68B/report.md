# Pilot T68 B: a GraphML file of the whole river network

Build: 0ffeae2ef5 (/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1-0ffeae2ef5).
Start: gauges.csv with flows.csv joined, then a Data source filter card that keeps only what came
from gauges.csv, so G12 is out of the picture. The setup file is /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/gauges-narrowed.txt
(the answer key names `gauges-narrowed.txt`, but no such file exists in the setups folder, so
the pilot wrote one with the same steps as the T68 A pilot's).

Result: **reached** by pointer and by keyboard. The saved file holds 12 nodes (G12 included) and
14 edges, as the answer key asks.

## Start state

The start screen reads "11 of 12 nodes, 0 of 14 edges": the Data source card hides every edge,
because every edge came from flows.csv. The T66 B pilot ended in the same state. The answer key's
"equally right" counts for a file of only what is in the picture (11 nodes and 13 edges) do not
match this start, which shows 0 edges.
Screenshot: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/success/01.png

## Walk 1: the success path, by pointer

Screenshots under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/success/.

1. Main menu (02.png) > Export... (03.png). The dialog opens on Data with Format **CSV**, Table
   Nodes and Scope "All 12".
2. Format > GraphML (04.png, 05.png). The Format list is grouped Tables and Network files.
   With GraphML chosen, the screen shows "Include styles" ticked, "Columns 9 of 9", a node chip
   "12" and the line "Lost in GraphML: 2 style settings". Nothing in the Data panel shows how many
   edges the file will hold.
3. Scope (06.png) offers "All 12", "Shown 11 of 12", "gauges.csv 11" and "flows.csv 12". The
   counts are all nodes. The default "All 12" is right.
4. Details (07.png) expands to "Node visible not written 1" and "Edge visible not written 13".
5. Export (09.png) does not save. It turns the loss line into a warning, "Styles lost in
   GraphML", with "Save anyway" and "Choose another format".
6. Save anyway (10.png) saves gauges_graph.graphml (14,794 bytes) and shows "Exported
   gauges_graph.graphml".

File check (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/success/downloads/gauges_graph.graphml): 12 nodes (G01 to G12) and 14 edges. G12
and all 14 edges are written with graphty.style.node.hidden / graphty.style.edge.hidden = true.
depth_cm is written as a string column, not a number.

Path steps: 5 (Main menu, Export..., Format, GraphML, Export, then Save anyway: 6 clicks).

## Walk 2: detours

Screenshots under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/detours/.

- **Control+S instead of export** (02.png, 03.png). The "Save gauges as" dialog opens with the
  name selected. Typing "gauges.graphml" and Enter renames the project to "gauges.graphml" and
  shows "Saved gauges.graphml in this browser." No file is written, and nothing says that a
  GraphML file needs Export. A participant could stop here thinking the file exists.
- **Main menu > Save local copy...** (04.png). Saves gauges.graphml.graphty.json, a project file,
  with no notice on screen at all.
- **The Export dialog's Image tab first** (05.png), then Project (06.png), then Data (07.png).
  Image has no network formats. Project shows "Nodes 12, Edges 14, Layers 8" but does not name
  the kind of file it writes. Data opens on CSV again. Escape closed the dialog and put focus on
  Main menu (08.png).
- **Turning the left-out gauge back on first** (09.png to 11.png). Ticking flows.csv in the Data
  source card shows 12 of 12 nodes and 14 of 14 edges. Control+E, Format GraphML: no loss line
  this time (10.png). Export saves at once with no "Save anyway" step. The file
  (gauges-graphml_graph.graphml) has 12 nodes and 14 edges. The task is done, but T66's work
  (the gauge left out) is undone.
- **The source row's right-click menu** (12.png to 14.png). Right-clicking gauges.csv offers
  "Export... Ctrl+E". It opens the dialog with Scope "gauges.csv 11" and a chip "11 of 12".
  GraphML > Export saves at once with no warning. The file has **11 nodes and 0 edges**.
- **The Graph panel's actions menu** (15.png): Re-run layout, Reshuffle layout seed and Add note.
  There is no Export item.

## Walk 3: keyboard only

Screenshots under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/keyboard/. The session started with --keys and --sr (keyboardOnlyMode true).

- The first Tab goes to button "Main menu". Enter opens the menu with focus on "Back to start".
  Arrow keys walk the items (each read as a menuitem by name). Enter on "Export..." opens the
  dialog with focus on button "Close".
- Tab order in the dialog: "Close", the left list item "Data" (read as **gridcell**, and as
  **row** in browse mode, not as a tab), combobox "Format" value "CSV", combobox "Table",
  button "Advanced has configured values", combobox "Scope" value "All 12", button "8 of 8",
  button "Details", generic "Preview of the exported data", "Cancel", "Export", then back to
  "Close". Focus stays in the dialog. ArrowDown on "Data" moves focus to "Styles" without
  switching the panel (25.png).
- Format: Enter opens the list with "CSV" highlighted. ArrowDown eleven times reaches "GraphML"
  and Enter picks it. The next Tab goes to checkbox "Include styles" checked.
- Scope: Enter opens the list, Escape closes only the list (focus stays on Scope, the dialog stays
  open). **Tab with the list open does nothing**: focus stays on Scope and the list stays open
  (43.png). Shift+Tab does the same. Space chose the option and closed it.
- Details: Enter expands it; the lines under it are plain text.
- Export (Enter): the "Styles lost in GraphML" warning appears and **focus falls to the page
  body** (54.png). Nothing is announced. The next Tab goes to "Main menu" **behind the open
  dialog**, then on through the page (55.png to 63.png), while the Export dialog stays on screen
  (56.png).
- Shift+Tab from "Main menu" wraps into the dialog's end: "Export", "Cancel", the preview,
  "Choose another format", then "Save anyway". Enter saves gauges_graph.graphml (12 nodes,
  14 edges). Focus returns to "Main menu" and a polite status reads "Exported gauges_graph.graphml".

Reached by keyboard: yes, but only by Shift+Tab out of the top of the page.

## Mismatches with the answer key

1. The answer key says Export opens on GraphML for B. It opens on Data with Format CSV, and the
   participant has to pick GraphML (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/success/03.png).
2. The path has one more step than the key: Export shows "Styles lost in GraphML" with
   "Save anyway" when something is out of the picture, and only Save anyway writes the file
   (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/success/09.png).
3. The start file `gauges-narrowed.txt` the key names does not exist in the setups folder.
4. The start shows 0 of 14 edges in the picture, not 13 of 14, so the key's "equally right"
   in-the-picture counts (11 and 13) are not what this build shows (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/success/01.png).

## Defects

Ordered most severe first.

1. **Keyboard: Export's warning drops focus to the page, and Tab leaves the open dialog.** After
   Enter on Export, focus is on nothing. Tab then walks the page behind the open modal dialog.
   The warning is not announced. Keyboard path. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/keyboard/54.png, /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/keyboard/56.png
2. **The source row's Export writes a network file with no edges, without saying so.** From
   right-click gauges.csv > Export..., GraphML saves 11 nodes and 0 edges, with no line about the
   left-out gauge or the missing edges. Detours path.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/detours/13.png, /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/detours/14.png
3. **Saving with a .graphml name looks like making a GraphML file.** Control+S, type
   "gauges.graphml", Enter: the project is renamed and "Saved gauges.graphml in this browser."
   No file, and no pointer to Export. Detours path. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/detours/03.png
4. **The loss list says the hidden state is not written, but the file writes it.** "Node visible
   not written 1, Edge visible not written 13" and "Styles lost in GraphML: 2 style settings",
   but the file holds graphty.style.node.hidden and graphty.style.edge.hidden = true for G12 and
   all 14 edges. The edge count 13 also differs from the 14 hidden edges. The words "Node visible
   not written" read as "a visible node is missing from the file". Success path.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/success/07.png, /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/success/09.png
5. **No edge count anywhere on the Data panel for a network file.** Scope options and the chip
   count nodes only ("All 12", "12"), so a person sending "the whole network" cannot see that the
   14 edges are in it. Only the Project tab shows "Edges 14". Success path.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/success/05.png, /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/success/06.png, /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/detours/06.png
6. **"Include styles" is ticked while the same panel says "Styles lost in GraphML".** The two
   contradict each other. Success path. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/success/09.png
7. **Keyboard: Tab does nothing in an open Scope or Format list.** Focus and the open list stay
   put; Shift+Tab too. Keyboard path. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/keyboard/43.png
8. **Save local copy... saves with no notice.** gauges.graphml.graphty.json is downloaded and
   nothing on screen says so. Detours path. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/detours/04.png
9. **The export dialog's left list is announced as gridcell/row, not as tabs.** Keyboard path.
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/keyboard/13.png
10. **Unlabeled icon button "Advanced has configured values".** Its tooltip is "Advanced" and it
    shows no text. The name claims configured values on a fresh export. Success and keyboard
    paths. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/success/08.png
11. **"Reopened: layers as layers" in the warning.** It does not say what it means. Success
    path. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/success/09.png
12. **The source row's "Export..." shows Ctrl+E**, but Ctrl+E opens the export of the whole
    graph, not of that source. Detours path. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/detours/12.png
13. **The canvas behind the Export dialog shows only one gauge** while the dialog is open; the
    others come back when it closes. Success path. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/success/03.png
14. **depth_cm is written as a string in the GraphML** (the column holds one "-" value), so the
    colleague's program reads depths as text. Success path.
    /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68B/success/downloads/gauges_graph.graphml
