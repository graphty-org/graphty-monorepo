# T67 B pilot -- targeted re-walk on build a53beb7179

Task: "Before you pass this gauge list on, check whether the program thinks anything in it looks
wrong. Where the program can put something right for you, do it. Tell us what it found and what you
changed." Start: setup `gauges.txt` (gauges.csv, 11 gauges G01-G11, Data place open, table open).
Build: a53beb7179, served from `.study-builds/tier4-r1d3-a53beb7179`.

Result: **reached** by pointer and by keyboard. Every route in the fix list was walked (below). No crash, no block, no wrong result that would
spoil grading. No mismatch with the answer key. The data stayed gauges.csv's own 11 gauges on every
walk.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T67B/<walk>/NN.png

## Routes in the fix list

The routes the fix pass touched start from T64, T65, T66 and T68's files, not this task's. Each was
still walked on this build, from its own task's real start, in its own session, by replaying the
newest walk of the same route; every replay matched every check point and ended its session. The
data stayed each route's own file the whole way.

| Route | Walk (under r1d3/pilot/T67B/) | Steps | What the screens show |
| ----- | ---- | ----- | --------------------- |
| T67B success path by pointer | n1-pointer | 10 of 10 | 03.png: "Issues in gauges.csv", the three issues; 07.png: "Resolved 3", Stone Weir's depth blank; 11.png: Undo brings back one issue (chip 1) and selects all 11 nodes |
| T65A success path | n2-T65A-path | 24 of 24 | 17.png: "14 of 24 nodes, 22 of 63 edges", "4 nodes selected"; the role card on Select reads "5 of 24" |
| T65A, the other card order | n3-T65A-order | 11 of 11 | same end state as the success path |
| T65A keyboard walk (the chip's spoken count) | n4-T65A-keys, carried on by hand in n4b-T65A-keys-chip | 92 of 92, then 97 steps | "Filter on: 14 of 24 nodes, 22 edges", "4 nodes selected"; read of the cards: "Node 14 of 24", "Node 5 of 24" (n4b/96.png, 97.png) |
| T65A redo route (undo and redo of the keep card) | n5-T65A-redo | 28 of 28 | 29.png: the redo restores 14 of 24 and 4 selected |
| T65B success path | n6-T65B-path | 16 of 16 | 17.png: "5 of 12 nodes, 2 of 14 edges", "3 nodes selected", "Redid turning on the filter ..." |
| T65B, the other card order (Undo and Redo of the depth edit) | n7-T65B-order | 7 of 7 | same counts, 5 and 3 |
| T65B keyboard and screen-reader walk (the card's spoken count) | n8-T65B-keys | 12 of 12 | "Filter on: 5 of 12 nodes, 2 edges", "3 nodes selected"; the card reads its name, Remove and Apply |
| T65B detour: a style layer's Which nodes | n9-T65B-which-nodes | 7 of 7 | unchanged; Escape returns to the Style tab |
| T66B / T66A: the Data source card's count | n10-T66B-source-card, n10a-T66A-source-card | 11 of 11, 13 of 13 | n10/12.png: Data source card "11 of 12" with gauges.csv ticked, top bar "11 of 12 nodes" |
| T68A / T68B starts: the narrowed Hide card's count | n11-T68A-start, n11b-T68B-start | 4 of 4, 3 of 3 | n11/05.png: Data source card "12 of 13", top bar "12 of 13 nodes, 17 of 18 edges" |
| T64A success path | n12-T64A-path | 21 of 21 | unchanged |
| T64A / T64B detours: the table role re-run and Analyze's weight | n12a-T64A-detours, n12b-T64B-path, n12c-T64B-table-role | 31 of 31, 37 of 37, 25 of 25 | n12a/32.png: Shortest path's Weight lists "trips (closer, loaded, not read)" and starts on None, as answers.md says |

Carried over from the other tasks' own reports, not this task's: the Select card's chip counts over
the whole graph ("5 of 24" while 4 are selected, n2-T65A-path/17.png; "5 of 12" on T65B's installed
card while 3 are selected, n6-T65B-path/17.png).

## Walks replayed whole on this build

Every earlier walk of this task was replayed on this build from the task's real start, each its own
session. These matched every check point to the end, so their earlier findings stand: the success
path by pointer (s1-pointer, w1-pointer, x1-pointer), the three detours (the table's warning marks
first, the main menu / Quick actions / column header menu, the inspector of a source: s2-detours,
w2a/w2b/w2c, x2a/x2b/x2c) and the earlier keyboard walks (s3-keyboard, w3-keyboard).

Checked again on this build's x1-pointer: 07.png shows "Issues in gauges.csv" with depth_cm "1 not a
number", station "1 value with padded spaces", telemetry "11 values could be yes/no", all three
fixed ("Resolved 3"); Stone Weir's depth is blank -- the answer key's success state.

## Success path by keyboard (x3-keyboard; keyboard-only, screen-reader mode)

Replayed from the earlier walk; steps 1-39 matched (the issues chip, the issue list read, Make
blank, Trim, Read as yes/no with their announcements, Control+Z, reopening the list, Escape back to
the chip, Control+Y, Escape clearing the selection).

Step 40 (30 Tabs from the source menu) differed in one stop: after "Analyze" focus now reaches a
"Dismiss" button, the close button of the notice "Selection cleared: 11 nodes" that the Escape
before it raised (41.png). Its name comes from the notice, it is reachable and announced; nothing
else in the order changed. Not a defect.

Carried on by hand from there:

- Control+Z: "11 nodes selected", "Undid fixing a data issue." (the telemetry fix comes back;
  source chip reads a warning mark and 1; table "With issues 11"). Focus had been on the Degree
  "All" radio, which the undo removed; focus went to the "Values" tab, not to the page body.
  Escape: "Selection cleared: 11 nodes". 42.png.
- Shift+Tab back through Graph actions, From gauges.csv, Key id, the table buttons, the new "With
  issues 11" checkbox, Nodes, Resize table: every stop named.
- Tab to the "Key id" header and ArrowRight across: "number lat", "number lon", "number depth_cm",
  "text station", "text code", "text installed", "category telemetry"; the last ArrowRight stays
  on telemetry. Tab Tab goes on to "From gauges.csv", "Graph actions". 43.png, 44.png.

Focus never fell to the page body.

## Defects (all carried over from the earlier passes; none blocks the task or changes what the participant ends with)

1. Undo of a data fix selects every node (rings, every row highlighted, "11 nodes selected").
   r1d3/pilot/T67B/x3-keyboard/42.png (selection then cleared with Escape); earlier
   r1d2/pilot/T67B/h1-pointer/11.png.
2. "With issues 0" while issues remain, after Show rows from one column's mark and fixing that
   column. r1d3/pilot/T67B/x2a-detour-table-marks (matched the earlier walk).
3. Quick actions knows nothing about issues: "issues" gives "No results".
   r1d3/pilot/T67B/x2b-detour-menus (matched).
4. The source inspector does not show the source's issues; "Edit source..." opens "Replace:
   gauges.csv", and Enter with a non-address in the URL box does nothing and says nothing.
   r1d3/pilot/T67B/x2c-detour-source-inspector (matched).
5. The source chip reads a warning mark and "0" while the issue list is still open after the last
   fix. r1d3/pilot/T67B/x1-pointer/07.png.
6. After Make blank or Trim by keyboard, focus jumps back up to "Ignore in all columns", above the
   row just fixed. r1d3/pilot/T67B/x3-keyboard/19.png.
7. Arrowing to the "category telemetry" header by keyboard does not scroll it into view: focus
   sits on a column off the right edge of the table, so a sighted keyboard user sees no focus.
   Same on the earlier build. r1d3/pilot/T67B/x3-keyboard/43.png.

## Not walked

Nothing. The success path by pointer, the three detours, the keyboard walk and every route in the
fix list were walked on this build.
