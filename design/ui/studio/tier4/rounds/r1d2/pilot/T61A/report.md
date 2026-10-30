# T61 A pilot, targeted re-walk: two spreadsheets as one network (pantries.csv + deliveries.csv)

Build: ff17391bb1 (`.study-builds/tier4-r1d2-ff17391bb1`), 1440 x 900, start `empty`. Screenshots
are under `/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T61A/` (not
in git). The data stayed the task's own on every walk: pantries.csv (12 sites P01-P12) and
deliveries.csv (19 rows).

This pass reports only what crashes, blocks the task, or gives a result that would spoil its
grading.

## What was walked

The earlier walks were replayed on this build first. These matched every check point to the end,
so the earlier report's findings for them stand: d2-start-screen, d3-main-menu, d4-start-screen,
d5-main-menu, d6-start-screen, d7-row-menus, k1-keyboard, k2-keyboard.

These went another way on this build and were replayed to that point and finished by hand:

| Walk | Where it differed | Why | Verdict |
| ---- | ----------------- | --- | ------- |
| w1-success, w2-success, w3-success (pointer) | Hovering the deliveries.csv row at 125,162 shows no tooltip | The row's file name is now cut to "d.." so the counts get the room; 125,162 is now the gap between the name and the node chip. Hovering the name (106,162) still shows "deliveries.csv" | Reached |
| d1-main-menu (detour) | Clicking the second "Undo" now works | The top bar's Undo and the "Join canceled" notice's Undo are both named "Undo"; the second one is the notice's, which reopens the draft as before | Detour behaves as before |
| k3-keyboard | After choosing deliveries.csv the second time, focus lands on "Join" instead of returning to "Add source" | Focus now goes to the join screen's main button, the same as on the first opening | Reached |

None of the routes the fixes touched belongs to T61: they are routes of T64, T65 and T68.

## Success path by pointer (w1-success, w2-success, w3-success): reached

- Open a file > pantries.csv, Data > Sources "+", File... > deliveries.csv: the join screen reads
  "Join deliveries.csv -> pantries.csv", Edges, from = Id, to = Id, with "18 edges added",
  "1 new node", "1 not in graph" and "1 repeated key" (w1-success/04.png).
- Join: Overview reads Nodes 13, Edges 18, "From 2 files"; Sources lists pantries.csv and
  deliveries.csv (w1-success/12.png).
- The deliveries.csv row now draws its counts whole: 13 nodes, 18 edges, and the issue chip "1" in
  its own slot after them. The follow-up's answer (18) can be read on the row. The tooltip over the
  counts reads "13 nodes, 18 edges" (w1-success/14.png).
- The issue chip opens "Issues in deliveries.csv": edges, 1 unknown end, with Add nodes, Leave out
  and Ignore (w1-success/18.png). The Edges table holds 18 edges; "With issues 1" narrows it to
  P05 -> P13, 4 trips (w2-success/15.png). The Nodes table's "With issues 2" shows P06 and P07
  (w2-success/16.png).

## Detour: main menu, Cancel, Replace, separate graph (d1-main-menu)

- Main menu > Open project or file... > deliveries.csv opens the same join screen (04.png). Cancel
  shows "Join canceled" with Undo; the notice's Undo reopens the draft (07.png, 08.png).
- Control+Z after a second Cancel does nothing to the join; the canvas takes a focus ring (10.png).
- With "Replace pantries.csv" chosen, the header still reads "Join deliveries.csv -> pantries.csv"
  (11.png). After Replace, Sources lists only deliveries.csv, while Overview reads 13 nodes and
  18 edges and the Nodes table keeps every pantries column; the row's issue chip reads 2, which are
  pantries' issues (13.png).
- Control+Z restores pantries.csv alone; the notice reads "Undid replacing deliveries.csv.", which
  names the file that replaced, not the one replaced (14.png).
- "Open as a separate graph" makes a project "deliveries": 13 nodes, 19 edges, "Loaded weight
  trips", "1 repeated edge". The old project's notice "Undid replacing deliveries.csv." is still
  showing over the new project (16.png).

## Success path by keyboard (k3-keyboard, keys only, screen-reader mode): reached

The first 85 steps matched the earlier walk (start screen, file load, Data, Add source, the join
screen's Tab order, Escape cancelling the join, F6 cycling). From the second opening of
deliveries.csv:

- Enter > Enter > deliveries.csv: focus on button "Join"; live region "19 of 19 rows".
- Enter: focus on "deliveries.csv 17 of 19 rows joined 13 nodes, 18 edges" (pressed); live region
  "13 of 13 rows" twice, "pantries: 13 nodes, 18 edges", "13 nodes, 18 edges".
- Tab, Tab, Shift+Tab, Enter: dialog "Issues in deliveries.csv". Tab goes Close panel, Collapse
  Issues, Ignore in all columns, "Add nodes: 1 unknown end" (pressed), "Leave out: 1 unknown end",
  "Ignore 1 unknown end", then out of the dialog to "deliveries.csv menu", which closes it, and on
  to "Collapse Fields" (k3-keyboard/90.png). Escape there leaves focus on Collapse Fields
  (k3-keyboard/91.png). No focus fell to the page body.

## Mismatches between the answer key and the screen

1. The key's follow-up note describes the issue chip covering the edge count and the name cut to
   "d.."; on this build the counts read whole (13, 18, issue 1), and the name is cut to "d.."
   (w1-success/12.png). The key's numbers hold.
2. Still as the key says for earlier builds: after Join, nothing says one route was listed twice.
   Overview has no repeated-edge line and the issue list names only "1 unknown end"
   (w1-success/12.png, 18.png). The repeat can be read only on the join screen.
3. Still: deliveries.csv opened alone or first gives 19 edges and "1 repeated edge"; the forward
   join gives 18 (d1-main-menu/16.png; d2-start-screen as replayed).
4. Still: Replace, which the key grades "not success", gives the same counts and columns as a join;
   only Sources (deliveries.csv alone) shows the difference (d1-main-menu/13.png).

## Defects (crash, block, or a result that would spoil grading)

No crash and no block on any walk. Results that can spoil grading:

1. Replace looks like a join: 13 nodes, 18 edges, every pantries column, with pantries' 2 issues
   counted on the deliveries.csv row. A participant who chose Replace would report the right
   numbers (d1-main-menu/13.png).
2. The join screen's header reads "Join deliveries.csv -> pantries.csv" with Replace chosen, so
   nothing before the click says the first file will go (d1-main-menu/11.png).
3. The repeated route disappears after Join: the second half of the answer cannot be read after
   the join (w1-success/12.png, 18.png).
4. The two orders give different edge counts, 18 and 19 (d1-main-menu/16.png).

Smaller, seen on this pass:

5. The new project from "Open as a separate graph" shows the old project's notice "Undid replacing
   deliveries.csv." (d1-main-menu/16.png).
6. The Undo notice after Replace names the wrong file: "Undid replacing deliveries.csv." for
   undoing pantries.csv's replacement (d1-main-menu/14.png).
7. The deliveries.csv row's file name is cut to "d..", two letters; only its tooltip names it
   (w1-success/12.png, 13.png).

## Re-walk after the latest fix pass (same build ff17391bb1)

None of the routes the latest fixes touched belongs to T61 (they are routes of T64, T65 and T68),
so this pass replayed T61's own routes again, from the empty start, into
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T61A/r3/.

- Success path by pointer (r3/w1-success): all 18 steps matched. After Join the
  screen reads Overview Nodes 13, Edges 18, "From 2 files"; Sources lists pantries.csv (12) and
  deliveries.csv (13, 18, issue chip 1); the Nodes table holds the task's own pantries data
  (P01-P10 visible, "With issues 2") (r3/w1-success/11.png). Reached, as the answer key says.
- Detour d1-main-menu (Cancel, Undo, Replace, separate graph): all 15 steps matched; the earlier
  findings above stand (r3/d1-main-menu/16.png).
- Detour d2-start-screen (second file from the start screen): all 8 steps matched
  (r3/d2-start-screen/09.png).
- Detour d7-row-menus (the Sources row menus): all 9 steps matched.
- The keyboard walk k3-keyboard was still replaying when this pass closed; its result is not
  recorded here.

No new crash, block or grading-spoiling result. The defects listed above are unchanged.
