# T61 A pilot: targeted re-walk after the fix pass

Build: a53beb7179 (served from .study-builds/tier4-r1d3-a53beb7179). Every walk starts from the
task's real start (the empty app) and was replayed step by step from the earlier walk of the same
route on this build; each step's screen was compared with the earlier one, every step matched, and
every session was ended.

Screenshots are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T61A/.

## Routes in scope

The fix pass touched the filter cards' counts, the depth card's Undo and Redo, the Data source
card's count, the narrowed Hide card, and the table role re-run with Analyze's weight. Those are
routes of the filter, hide, remove-source and weight tasks; none of them is on this task's route
(open one spreadsheet, add the second as a source, join), so none was walked here. This task's own
three walks were all walked: the success path by pointer, the two detours the first pilot of this
task walked (d1 and d2), and the success path by keyboard with the screen-reader log.

## Route 1: success path by pointer (y1-success): reached

All 18 steps matched.

- y1-success/02.png: Open a file > pantries.csv opens 12 nodes.
- y1-success/04.png: Data > Add source > File... > deliveries.csv opens "Join deliveries.csv ->
  pantries.csv", Edges, from = Id, to = Id, with "18 edges added", "1 new node", "1 not in graph"
  and "1 repeated key" (a warning glyph and a menu), as the answer key says.
- y1-success/05.png to 09.png: each chip opens and closes; Escape closes the repeated-key menu.
- y1-success/11.png: Join. Overview reads Nodes 13, Edges 18, "From 2 files"; Sources lists
  pantries.csv (12) and the second file's row with 13 nodes, 18 edges and an issue chip "1". The
  data is the task's own the whole way (P01 to P12 with their sites, then P13 from the join).
- y1-success/12.png to 17.png: the second row's tooltips read "deliveries.csv" and "13 nodes, 18
  edges". The follow-up's answer (18 routes) reads whole on the row.
- y1-success/18.png: the issue chip opens "Issues in deliveries.csv" with "1 unknown end" and Add
  nodes, Leave out, Ignore. The repeat is not listed after Join, as decided.md settles.
- y1-success/19.png: the Edges table shows 18 edges, "With issues 1".

## Route 2: detours

### d1: the second file from the main menu, Cancel, Replace, separate graph (y2-d1-main-menu)

All 15 steps matched.

- y2-d1-main-menu/04.png: Main menu > "Open project or file..." > deliveries.csv opens the same
  join screen as the success path.
- y2-d1-main-menu/07.png to 10.png: Cancel shows "Join canceled" with Undo; the notice's Undo brings
  the draft back; Cancel again and Control+Z leave pantries.csv alone (12 nodes, 0 edges).
- y2-d1-main-menu/11.png: with "Replace pantries.csv" chosen, the header still reads "Join
  deliveries.csv -> pantries.csv".
- y2-d1-main-menu/12.png, 13.png: Replace gives 13 nodes and 18 edges and keeps every pantries
  column; Sources lists only deliveries.csv, with issue chip 2. The notice reads "Replaced
  pantries.csv with deliveries.csv +1 +18".
- y2-d1-main-menu/16.png: "Open as a separate graph" makes a project "deliveries" with 13 nodes,
  19 edges, "Loaded weight trips" and "1 repeated edge", under the old project's notice "Undid
  replacing deliveries.csv.".

All of this is already in the answer key, which grades Replace and the separate graph "not
success" by the Sources list and the project.

### d2: deliveries.csv first from the start screen, then pantries.csv (y2-d2-start-screen)

All 8 steps matched.

- y2-d2-start-screen/07.png: Back to start shows the start screen, which lists no earlier project.
- y2-d2-start-screen/08.png: deliveries.csv first, then Data > "+" > File... > pantries.csv opens
  "Join pantries.csv -> deliveries.csv", Node values, id = Id, "12 matched", "1 no value".
- y2-d2-start-screen/09.png: Join gives 13 nodes and 19 edges, "1 repeated edge", "From 2 files",
  both sources listed. The answer key counts this order's 13 / 19 as right.

## Route 3: success path by keyboard (y3-keyboard, keys only, screen-reader log): reached

All 96 steps matched. Focus never fell to the page body after the file loaded.

- Start screen: 13 Tabs reach "Open a file CSV, GraphML, GEXF, Cytoscape, or a saved project"
  (y3-keyboard/14.png). After the file loads, focus is on Canvas "Graph drawing".
- Rail: Graph, then ArrowDown to Data, Enter. Tab Tab reaches "Add source" collapsed; Enter opens
  menuitem "File..."; Enter opens the chooser. Focus lands on the join screen's "Join"; live region
  "19 of 19 rows" (y3-keyboard/40.png).
- Join screen Tab order: Join choices, Cancel, "Rows are" (Edges), "Source column", "Source graph
  value", "Target column", "Target graph value", Ignore case, Ignore spaces, checkbox "1 not in
  graph", button "1 repeated key", "Key id", columnheader "Edge", then out to the inspector's
  "From pantries.csv". Tab into a column combobox opens its list (y3-keyboard/46.png); Escape closes
  it and keeps the value; Enter on a closed one does nothing.
- Space on "1 not in graph" narrows the table to P05 -> P13 (live "1 of 1 rows",
  y3-keyboard/64.png); Space again restores "19 of 19 rows". Enter on "1 repeated key" opens Keep
  first, Keep both, Ignore (y3-keyboard/67.png); Escape returns to the button.
- Escape with no list open cancels the whole join: "Join canceled" with Undo, focus on "From
  pantries.csv"; Control+Z does not bring the draft back (y3-keyboard/75.png to 77.png).
- F6 cycles canvas, "Analyze", "Resize table", "Add source", "From pantries.csv".
- Second opening of deliveries.csv, then Enter on Join: focus on button "deliveries.csv 17 of 19
  rows joined 13 nodes, 18 edges"; live "pantries: 13 nodes, 18 edges"; Overview 13 / 18
  (y3-keyboard/88.png).
- Tab reaches "1 issue in deliveries.csv"; Enter opens dialog "Issues in deliveries.csv" (Close
  panel, Collapse Issues, Ignore in all columns); Escape returns focus to the chip
  (y3-keyboard/92.png to 97.png).

## Mismatches with the answer key

None. Every screen on the three walks matches what the answer key says for this build.

## Defects

Nothing crashes, blocks the task or gives a wrong count on any walk. Still present and unchanged
from the earlier passes (none spoils grading):

1. Keyboard: the join screen's "Join" button has no description; the chips row that says what Join
   will do is not read with it (y3-keyboard/41.png).
2. Keyboard: Escape on the join screen with no list open cancels the whole join, and after the
   notice goes nothing (Control+Z included) brings the draft back (y3-keyboard/75.png, 77.png).
3. Keyboard: the second file's row is named "17 of 19 rows joined" while it shows 18 edges, two
   answers to "how many routes" (y3-keyboard/88.png).
4. Pointer: the second file's name on its Sources row is cut to "d.."; the name is readable only in
   the tooltip (y1-success/11.png, 13.png).
5. Detour d1: Replace keeps every pantries column and gives the same counts as a join, with
   pantries' two issues attributed to deliveries.csv (y2-d1-main-menu/13.png); with Replace chosen
   the header still says "Join" (y2-d1-main-menu/11.png).
6. Detour d1: the new project from "Open as a separate graph" shows the old project's notice
   "Undid replacing deliveries.csv." (y2-d1-main-menu/16.png).
7. Detour d2: the start screen lists no earlier project, so the first of two separate projects has
   no visible way back (y2-d2-start-screen/07.png).
