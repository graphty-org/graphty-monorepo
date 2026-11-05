# Pilot: T65 B (gauges + flows, tidied), targeted re-pilot

Build: ff17391bb1 (frozen, served from .study-builds/tier4-r1d2-ff17391bb1). Start: the setup
`rounds/tier-4/setups/gauges-tidy.txt` (gauges.csv joined with flows.csv, Stone Weir's bad depth
made blank, `installed` read as dates). Screenshots under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T65B/ (git ignores them).
The data stayed the task's own on every walk: 12 gauges, 14 edges, the table's dates and depths as
in the file.

## Result

Reached, and the screen gives the answer key's counts: **5 of 12** gauges in the picture (G01, G02,
G04, G09, G11) and **"3 nodes selected"** (G01, G02, G09), with 3 rings and 3 highlighted table
rows. A screen reader hears "5 of 5 rows, 3 selected" and "3 nodes selected". Turning the keep card
off selects all five gauges put in before 2005 (G01, G02, G03, G05, G09); turning it back on gives 3
again. Nothing crashed, blocked the task or gave a wrong count on any walk.

## Route 1: success path by pointer (z1-path)

- 02-06: Add filter > telemetry > yes; Add a condition > depth_cm; "from" 70, Enter: the top bar
  reads "5 of 12 nodes, 2 of 14 edges" (06.png).
- 07-08: Add filter > installed: the card opens on Before with the box focused; 2005, Enter: 3 of
  12 while the card hides (08.png), as the key says.
- 09: Select on the installed card: "5 of 12 nodes", inspector "3 nodes selected", G01, G02, G09
  ringed and highlighted (09.png).
- 10-11: in the date box, Tab moves to Add a condition; Escape keeps the card and puts focus on its
  on box (decided behavior) (10.png, 11.png).
- 12: collapsed, the card reads "installed is at most 1104537599999" (the key records this wording
  as the build's) (12.png).
- 13-14: keep card off: 5 selected, all 12 drawn (13.png); back on: 3 selected (14.png).

## Selection inspector (z1-path/12.png, z3-keys-sr/11.png)

"3 nodes selected" with a Summary (Nodes 3, edges joining 1, value ranges, telemetry yes (3)); no
node list, unchanged as expected.

## Route 2: detour, a style layer's Which nodes (z2-detour-which-nodes)

Graph > Add a layer > Layer > Which nodes > installed, 2005, Enter: "installed before 2005, 5
nodes", "5 of 12 nodes", the layer row counts 5, every gauge stays drawn (06.png, 08.png). Matches
the key; not success for the task, as the key says. Escape keeps the condition.

## Earlier detour set (replayed on this build)

The detours the first round walked (toolbar magnifier, Filters picker search, toolbar Filters
button, Graph find box rules, node right-click menu, style layer, table header menu) were replayed
on ff17391bb1 into r1d2/pilot/T65B/p2-detours, p3-detours and w2-detours; every step matched the
earlier screens, so the earlier report stands for them.

## Route 3: keyboard only, screen-reader mode (z3-keys-sr)

Reached the same end state. Focus never fell to the page body.

- 18 Tabs from the top to "Add filter" (Main menu, Project: gauges, Undo changing a column's
  type, Redo disabled, Data, Collapse Sources, Add source, gauges.csv 11 nodes, gauges.csv menu,
  flows.csv 13 of 15 rows joined 12 nodes, 14 edges, 1 issue in flows.csv, flows.csv menu,
  Collapse Fields, Collapse flows.csv, Add to edge fields, Direction, Expand gauges.csv, Add filter).
- Enter, "tel", Enter: focus on checkbox "yes, 7 nodes"; Space: "Filter on: 7 of 12 nodes, 3 edges".
- Add a condition, "dep", Enter: focus returns to "Add a condition"; two Shift+Tabs reach
  "depth_cm from, number". 70, Enter: "Filter on: 5 of 12 nodes, 2 edges"; Tab to "to"; Escape to
  "Apply telemetry is yes and depth_cm is between 70 and 210".
- Add filter, "inst", Enter: focus on "installed before, a date or a year". "installed: how to
  match" opens with Enter and lists Before / After; Escape closes it. 2005, Enter: "Filter on: 3 of
  12 nodes, 1 edges".
- Shift+Tab to radio "Hide nodes that do not match", ArrowLeft to radio "Select": "Filter on: 5 of
  12 nodes, 2 edges", "5 of 5 rows, 3 selected", "3 nodes selected". F6 to the Inspector; --read
  gives "3 nodes selected" and the Summary (11.png).

## Mismatches with the answer key

None. The key's path, the 3-of-12 while the card hides, the Which nodes reading and the final 5 and
3 all match the screen.

## Defects

None that crash, block the task or spoil its grading. Carried from earlier passes, unchanged and
not grading-relevant: picking a number field in Add a condition returns focus to "Add a condition"
(z3-keys-sr/04.png); the live status says "1 edges" (z3-keys-sr/08.png); the collapsed date card
reads a raw number; the effect control still reads "Select | Hide", not the decided "Filter to |
Filter out" (z1-path/09.png).

## Skipped

None for this task. The other routes in the fix list (T64 A/B, T65 A, T68 A/B) belong to other
tasks' pilots.
