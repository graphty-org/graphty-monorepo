# Pilot: T60 B (yeast gene network from a web address), targeted re-walk

Build: a53beb7179 (frozen, .study-builds/tier4-r1d3-a53beb7179). Start: empty. Every session was
ended. Screenshots stay out of git, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T60B.

Result: reached on every walk. The loaded network is the task's own file the whole way: 331 nodes
and 361 edges (Overview, the Sources row, the source's Loaded section and the Edges table agree).

## What was walked

The earlier walks were replayed on this build. detours-3, detours-5 and detours-6 matched every
check point to the end, so their earlier findings stand. The other nine all diverged at the same
step, the Enter in the web address box, because the table no longer opens by itself after the load
and the false issue chip is gone. Each was replayed into its own folder and carried on by hand from
that step.

The success path was walked once more by pointer into success-recheck: all 10 steps matched the
first walk on this build and the session ended (success-recheck/06.png Overview 331 / 361,
07.png the Sources row with the link glyph and 331 / 361, 11.png "361 edges").

The success path was walked by pointer a third time, as its own session, into success-final: all
10 steps matched and the session ended (success-final/06.png Overview Nodes 331, Edges 361;
success-final/11.png the Sources row 331 / 361, the inspector's Loaded Nodes 331, Edges 361, and
"361 edges" in the Edges table). These are the answer key's counts (331 genes, 361 interactions).

Not walked here: the routes the fix pass touched (the keep card and its chip's spoken count, the
depth card and its undo and redo, a style layer's Which nodes, the Data source card's count, the
narrowed Hide card's count, the table role re-run and Analyze's weight). Each belongs to another
task (T64, T65, T66, T68), starts from that task's own data and setup, and is walked in that
task's own pilot folder; none is on this task's path from the start screen to a network opened
from a web address, so none can be walked from this task's start.

## Success path, by pointer (success, success-2, success-3)

1. Open network data > typed the address into "Web address of a graph file"; the one button beside
   the box is still "Choose file" (success/05.png). Steps 1 to 4 matched the earlier walk.
2. Enter: the project "yeast-galactose" opens; Overview shows Nodes 331, Edges 361; the table stays
   closed (success/06.png).
3. Data: the Sources row shows the link glyph, "yeast-...", 331 and 361 drawn whole, and no issue
   chip (success/07.png). Its tooltip is "yeast-galactose.graphml" (success/08.png).
4. Clicking the row opens the source's inspector: file glyph, "Source", Loaded Nodes 331, Edges 361
   (success/09.png).
5. Table > Edges: "361 edges", no warning marks (success/11.png; also success-3/08.png).

Answer key against the screen: the path matches. The source's inspector still shows a file glyph
and "Source", not the address, as the key says.

## Detours (detours, detours-2, detours-4)

Steps 1 to 21 matched the earlier walk: Open a file and cancel; the Web API card's Server form with
the address in Endpoint (Test and Load disabled); Sources "+" > Server...; Sources "+" > Network
data... and the Choose file button. Then:

- Enter in the address box inside the Untitled project loads 331 / 361; focus goes to the Sources
  row; no issue chip (detours-2/23.png).
- Main menu > Open project or file... opens the file chooser; Escape closes it and focus returns
  to Main menu, so the next Enter reopens the menu (detours-2/24.png to 28.png).
- The address pasted into Find and Enter: "No match for ..." with a hint about rules; the data is
  unchanged (detours-2/30.png).
- Right-click on empty canvas: Fit, Select all, Motion off; nothing about a web address
  (detours-2/32.png). Escape closes it.

## Keyboard only (keyboard, keyboard-2, keyboard-3; started --keys --sr)

Steps 1 to 29 matched the earlier walk (the start screen, Open network data, the dialog's tab
order, Escape with text typed, and typing the address again). At Enter:

- keyboard: focus on heading "Graph, yeast-galactose: 331 nodes, 361 edges"; the next Tab goes to
  "From yeast-galactose.graphml" (keyboard/31.png, 32.png).
- keyboard-2 and keyboard-3: focus on nothing (the page itself); the next Tab starts again at Main
  menu (keyboard-2/31.png, 32.png; keyboard-3/31.png, 32.png).
- On all three, the live status speaks "yeast-galactose: 331 nodes, 361 edges", then "331 nodes,
  361 edges"; keyboard-2 and keyboard-3 speak the second line twice.
- keyboard-3 went on to Data by arrow key: the Sources row's name reads "yeast-galactose.graphml 331
  nodes, 361 edges" with no repeat; --read lists it (keyboard-3, last screenshot).
- keyboard-2 reached the inspector: --read gives Overview Nodes 331, Edges 361.

## Defects

1. After Enter in the address box, focus falls to the page body on two of three keyboard walks and
   lands on the Graph heading on the third; from the page body the next Tab starts again at Main
   menu (keyboard-2/31.png, keyboard-3/31.png; keyboard/31.png for the other outcome). Already in
   the backlog.
2. The load's live status is spoken three times on two of three keyboard walks: the project's line,
   then "331 nodes, 361 edges" twice (keyboard-2/31.png, keyboard-3/31.png).
3. The only button beside the web address box is still "Choose file"; Enter is the only way to open
   the address (success/05.png). Already in the backlog.
4. The Edges table's "Columns: 2 of 2" still reads grayed as if disabled (success/11.png).

No defect blocks the task or changes the counts. The earlier pass's issue chip drawn over the edge
count and its false "6 rows refused" issue are gone (success/07.png, success/11.png).
