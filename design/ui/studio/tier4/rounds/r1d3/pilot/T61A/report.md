# T61 A pilot: targeted re-walk after the fix pass

Build: 79ed770292 (served from .study-builds/tier4-r1d3-79ed770292). Every walk starts from the
task's real start (the empty app), drives the app only by clicks, typing and keys, and was replayed
step by step from the newest earlier walk of the same route; each step's screen was compared with
the earlier one, every step matched, and every session was ended.

Screenshots are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T61A/
(walk folders n1-success, n2-d1-main-menu, n2-d2-start-screen, n3-keyboard).

## Routes in scope

The fix pass touched the filter cards' counts (keep, depth), the depth card's Undo and Redo, a style
layer's Which nodes, the Data source card's count, the narrowed Hide card, and the table role re-run
with Analyze's weight. Those are routes of the filter, hide, remove-source and weight tasks; none of
them is on this task's route (open one spreadsheet, add the second as a source, join), so none was
walked here. This task's own three walks were all walked: the success path by pointer, the two
detours the first pilot of this task walked (d1 and d2), and the success path by keyboard with the
screen-reader log. The data stayed the task's own the whole way (P01 to P12 with their sites, then
P13 from the join).

## Route 1: success path by pointer (n1-success): reached

All 18 steps matched.

- n1-success/02.png: Open a file > pantries.csv opens 12 nodes.
- n1-success/04.png: Data > Add source > File... > deliveries.csv opens "Join deliveries.csv ->
  pantries.csv", Edges, from = Id, to = Id, with "18 edges added", "1 new node", "1 not in graph"
  and "1 repeated key" (a warning glyph and a menu), as the answer key says.
- n1-success/05.png to 09.png: each chip opens and closes; Escape closes the repeated-key menu.
- n1-success/11.png: Join. Overview reads Nodes 13, Edges 18, "From 2 files"; Sources lists
  pantries.csv (12) and the second file's row with 13 nodes, 18 edges and an issue chip "1".
- n1-success/12.png to 17.png: the second row's tooltips read "deliveries.csv" and "13 nodes, 18
  edges". The follow-up's answer (18 routes) reads whole on the row.
- n1-success/18.png: the issue chip opens "Issues in deliveries.csv" with "1 unknown end" and Add
  nodes, Leave out, Ignore. The repeat is not listed after Join, as decided.md settles.
- n1-success/19.png: the Edges table shows 18 edges, "With issues 1", the warning on Target.

## Route 2: detours

### d1: the second file from the main menu, Cancel, Replace, separate graph (n2-d1-main-menu)

All 15 steps matched.

- n2-d1-main-menu/04.png: Main menu > "Open project or file..." > deliveries.csv opens the same
  join screen as the success path.
- n2-d1-main-menu/07.png to 10.png: Cancel shows "Join canceled" with Undo; the notice's Undo
  brings the draft back; Cancel again and Control+Z leave pantries.csv alone (12 nodes, 0 edges).
- n2-d1-main-menu/11.png: with "Replace pantries.csv" chosen, the header still reads "Join
  deliveries.csv -> pantries.csv".
- n2-d1-main-menu/12.png, 13.png: Replace gives 13 nodes and 18 edges and keeps every pantries
  column; Sources lists only deliveries.csv, with issue chip 2. The notice reads "Replaced
  pantries.csv with deliveries.csv +1 +18".
- n2-d1-main-menu/16.png: "Open as a separate graph" makes a project "deliveries" with 13 nodes,
  19 edges, "Loaded weight trips" and "1 repeated edge", under the old project's notice "Undid
  replacing deliveries.csv.".

The answer key already grades Replace and the separate graph "not success" by the Sources list and
the project.

### d2: deliveries.csv first from the start screen, then pantries.csv (n2-d2-start-screen)

All 8 steps matched.

- n2-d2-start-screen/07.png: Back to start shows the start screen, which lists no earlier project.
- n2-d2-start-screen/08.png: deliveries.csv first, then Data > Add source > File... > pantries.csv
  opens "Join pantries.csv -> deliveries.csv", Node values.
- n2-d2-start-screen/09.png: Join gives 13 nodes and 19 edges, "1 repeated edge", "From 2 files",
  both sources listed. The answer key counts this order's 13 / 19 as right.

## Route 3: success path by keyboard (n3-keyboard, keys only, screen-reader log): reached

All 96 steps matched. Focus fell to the page body only before the first key on the start screen;
never after.

- Start screen: Tabs reach "Open a file CSV, GraphML, GEXF, Cytoscape, or a saved project"; after
  the file loads, focus is on Canvas "Graph drawing", live "pantries: 12 nodes, 0 edges".
- Rail to Data; Tab reaches "Add source" collapsed; Enter opens menuitem "File..."; Enter opens the
  chooser. Focus lands on the join screen's "Join"; live "19 of 19 rows".
- Join screen: Space on checkbox "1 not in graph" narrows to "1 of 1 rows" and back to "19 of 19
  rows"; Enter on "1 repeated key" opens Keep first, Keep both, Ignore; Escape returns to the
  button. A column combobox's list closes on Escape and keeps its value.
- Escape with no list open cancels the whole join ("Join canceled" with Undo).
- F6 cycles canvas, "Analyze", "Resize table", "Add source", "From pantries.csv".
- Second opening of deliveries.csv, then Enter on Join: focus on button "deliveries.csv 17 of 19
  rows joined 13 nodes, 18 edges"; live "pantries: 13 nodes, 18 edges"; Overview 13 / 18
  (n3-keyboard/88.png).
- Tab reaches "1 issue in deliveries.csv"; Enter opens dialog "Issues in deliveries.csv" (Close
  panel, Collapse Issues, Ignore in all columns); Escape returns focus to the chip
  (n3-keyboard/92.png to 97.png).

## Second re-walk on the same build (79ed770292)

The success path by pointer was replayed again from the task's real start (walk folder
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T61A/m/m01-success): all 18 steps
matched, and the end screen again reads Nodes 13, Edges 18, "From 2 files", with the second file's
Sources row showing 13 nodes, 18 edges and issue chip 1
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T61A/m/m01-success/11.png).

The detours d1 and d2 and the keyboard walk were walked on this build in n2-d1-main-menu,
n2-d2-start-screen and n3-keyboard (above); a second replay of each was started in the m folder but
did not finish before this report was written.

The routes the fix pass touched (the keep and depth filter cards, the depth card's Undo and Redo, a
style layer's Which nodes, the Data source card's count, the narrowed Hide card, the table role
re-run and Analyze's weight) start from other tasks' setups (T65A, T65B, T66A, T66B, T68A, T68B,
T64A, T64B), not from this task's start, and were not walked from this task's folder. Each was
replayed on this same build in
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T66B/z01-T65A-path through
z15-T64B-rerun, and every one matched to the end.

## Mismatches with the answer key

None. Every screen on the three walks matches what the answer key says for this build.

## Defects

Nothing crashes, blocks the task or gives a wrong count on any walk. Still present and unchanged
from the earlier passes (none spoils grading):

1. Keyboard: the join screen's "Join" button has no description; the chips row that says what Join
   will do is not read with it (n3-keyboard/41.png).
2. Keyboard: Escape on the join screen with no list open cancels the whole join, and after the
   notice goes nothing (Control+Z included) brings the draft back (n3-keyboard/75.png, 77.png).
3. Keyboard: the second file's row is named "17 of 19 rows joined" while it shows 18 edges, two
   answers to "how many routes" (n3-keyboard/88.png).
4. Pointer: the second file's name on its Sources row is cut to "d.."; the name is readable only in
   the tooltip (n1-success/11.png, 13.png).
5. Detour d1: Replace keeps every pantries column and gives the same counts as a join, with
   pantries' two issues attributed to deliveries.csv (n2-d1-main-menu/13.png); with Replace chosen
   the header still says "Join" (n2-d1-main-menu/11.png).
6. Detour d1: the new project from "Open as a separate graph" shows the old project's notice
   "Undid replacing deliveries.csv." (n2-d1-main-menu/16.png).
7. Detour d2: the start screen lists no earlier project, so the first of two separate projects has
   no visible way back (n2-d2-start-screen/07.png).
