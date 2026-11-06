# T77B pilot (targeted re-walk), build d3fda9f2b6

Task: in the river project a colleague set up, bring gauges 140 cm deep or deeper back into the
picture (an Or group on the existing filter card "telemetry yes") and move the Oldest layer's bound
to the end of 2004, then report how many gauges are in the picture and how many are orange. Start:
`gauges-telemetry.txt` (7 of 11 gauges in the picture, Oldest orange on 2 of them, the node table
open). Every walk began from that setup and was driven by the pointer and keys only, never by URL.
Screenshots are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T77B/
(not in git). An earlier walk on build 47c95a09fc that used the folder name `success` now sits
beside it as `success-47c95a09fc`; the older `touched-1`, `touched-4`, `touched-6` and `touched-7`
folders there are from that build too.

Result: **reached**. The walk ends with the card "telemetry yes" holding A "telemetry yes" (7) or B
"depth_cm min 140" (3), the top bar "9 of 11 nodes, 8 of 13 edges", Oldest "installed before 2005",
Which nodes 5 of 9, key "Color: Oldest, 5 of 9 nodes", fill E4572E. The answer key's values (9 of 11,
5 orange) match. The data stayed the task's own 11 gauges and 13 stretches the whole way.

Nothing on these walks crashes, blocks the task or gives a wrong count.

## Walks

### success -- the success path by pointer

Data; the card row "telemetry yes"; Edit telemetry yes; Or...; depth_cm; type 140; Enter; Done;
Graph; "installed before 2000"; the date box, Ctrl+A, type 2005; Enter; Done; then the previous
passes' extra checks (2010 and Tab, Escape, back to 2005 and Escape, Escape). Replayed from the
previous pass's success walk: all 16 steps matched their screens, and the session ended.

- 01.png: the setup start; Undo and Redo drawn disabled.
- 07.png: workspace "telemetry yes -- Filters 9 of 11", A 7, or B 3, No match 2; top bar 9 of 11.
- 08.png: after Done the card reads A 7 / or B 3; the node table reads "9 of 11 nodes" (Shown) and
  lists G01 to G07, G09, G11.
- 13.png: Oldest 5, Which nodes 5 of 9, "installed before 2005", key "Color: Oldest, 5 of 9 nodes".
- 17.png: the same at the end.
- Known and unchanged: Tab out of the date box leaves the workspace for the status bar's "Local
  only" (15.png), as the answer key's keyboard notes already say.

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T77B/success

### touched-2 -- new card, Cancel, Ctrl+Z

Data; Add filter; depth_cm; type 140; Enter (02.png: "depth_cm min 140 -- Filters 3 of 11", top bar
1 of 11); Cancel. Replayed from the previous pass; it diverged at Cancel only because the fix
worked: Undo is no longer "Undo changing node color on Oldest" but plain "Undo".

- 03.png: the card is gone, top bar 7 of 11, and the node table now reads "7 of 11 nodes" with the 7
  telemetry rows (the previous build kept the cancelled card's "Shown 1 of 11", G09 only). Undo is
  disabled.
- 04.png: hovering Undo: tooltip "Nothing to undo".
- 05.png (Ctrl+Z) and 06.png (Ctrl+Shift+Z): nothing changes; the card does not come back, Oldest
  keeps its orange (E4572E, key "2 of 7 nodes").
- 07.png, 08.png: the table's All (11 rows) and back to Shown (7 of 11).
- 09.png, 10.png: the success path from there: 9 of 11, Oldest 5 of 9, table 9 of 11.
- 11.png: Undo is now "Undo changing the conditions on Oldest": the person's own steps still undo.

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T77B/touched-2

### touched-8 -- the task's setup start

Started `gauges-telemetry.txt` and looked at the history before any step (the tool-wide `--prove`
run covers every setup; this walk checks this task's own).

- 01.png: the colleague's project as set up: 7 of 11, Oldest 2 of 7, orange.
- 02.png: Undo's tooltip "Nothing to undo"; 04.png: Redo's tooltip "Nothing to redo".
- 03.png: Ctrl+Z changes nothing; Oldest keeps its orange and the filter its 7 of 11.

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T77B/touched-8

### touched-9 -- new card ticking one value, Cancel, node table open

Data; Add filter; telemetry; tick "no" (02.png: "telemetry no -- Filters 4 of 11", top bar 0 of 11,
"Passes none"); Cancel. Replayed from the previous pass; it diverged at Cancel only because the fix
worked.

- 03.png: the card is gone, top bar 7 of 11, and the open node table reads "7 of 11 nodes" with the
  7 telemetry rows (the previous build kept "0 of 11, No rows"). Undo disabled.
- 04.png: Ctrl+Z changes nothing.
- 05.png, 06.png: All then Shown: "7 of 11 nodes" again.

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T77B/touched-9

### touched-11 -- success path, table and top bar 9 of 11

The success path replayed (all 16 steps matched), then the table's All and Shown.

- 17.png: top bar 9 of 11, table "9 of 11 nodes".
- 20.png: All lists all 11 (G08 and G10 among them).
- 21.png: Shown lists the 9 again (G01 to G07, G09, G11), matching the top bar.

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T77B/touched-11

## Not walked here

The other routes in this pass's list belong to other tasks (T71, T72, T75, T76, T77 A, T79) and are
walked in their own pilots. This targeted pass asks for no keyboard walk of T77 B.

## For the answer key

The c3100058ab build note "after Cancel on a new filter card that had a result, the node table keeps
that cancelled card's rows" no longer holds on d3fda9f2b6: the table follows the top bar after Cancel
(touched-2 03.png, touched-9 03.png). The table's Shown and All are not buttons by name on this build
("All" also names the installed column's buttons), which only matters to scripted routes.
