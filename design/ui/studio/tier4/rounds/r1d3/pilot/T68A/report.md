# Pilot: T68 A (sending the site list and the route list on as spreadsheets), targeted re-walk

Build: a53beb7179 (frozen, `.study-builds/tier4-r1d3-a53beb7179`). Screenshots, step files and the
saved files are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68A
(not in git): z1-path, z4-start, z2-detours and z3-keys, each a replay of the same folder's w-walk
(w1-path, w4-start, w2-detours, w3-keys) on this build.

Every walk starts from the studio's own start for this task, `pantries-narrowed.txt` (pantries.csv
joined with deliveries.csv, then a Data source card that keeps what came from pantries.csv, set to
Hide). The data stayed the task's own on every walk: 13 nodes, 18 edges, the file's own values.

Of the routes on this fix pass, only the starts' narrowed Hide card count belongs to this task; the
other routes on the list (T65 A and B, T66 A and B, T64 A and B) start from other tasks' setups and
are walked by those tasks' pilots.

## Result

Reached by pointer and by keyboard. The full export writes 13 node rows (P13 included, with the
`site` column) and 18 edge rows (`source,target,trips`, P05,P13 included), as the answer key says.
All four replays matched every check point. Nothing crashed, blocked the task or gave a wrong
result. The keyboard focus defects of the earlier passes are still there.

## Start: the narrowed Hide card's count (z4-start, all 4 steps matched)

- Header "12 of 13 nodes, 17 of 18 edges"; Graph > Values: Nodes showing 12 of 13, Edges showing
  17 of 18; Full graph 13 nodes, 18 edges (z4-start/03.png).
- Filters: one Data source card, pantries.csv ticked, deliveries.csv not, Hide, chip "12 of 13". No
  Select card, nothing selected.
- Edges tab "17 of 18 edges", Shown (z4-start/03.png). A click on a node opens its inspector
  (z4-start/04.png).

## 1. Success path by pointer: reached (z1-path, all 13 steps matched)

- Main menu > Export...: Data, Format CSV, Table Nodes, Scope list All 13 / Shown 12 of 13 /
  pantries.csv 12 of 13 / deliveries.csv 13 (z1-path/05.png).
- Export > "Styles lost in CSV" > Save anyway wrote `pantries_nodes.csv`: 13 rows, P13 included.
- Main menu > Export... > Table > Edges: Scope list All 18 / Shown 17 of 18 / pantries.csv 0 of 18 /
  deliveries.csv 18 (z1-path/11.png).
- Export > Save anyway wrote `pantries_edges.csv`: 18 rows; notice "Exported pantries_edges.csv"
  (z1-path/14.png). Files: z1-path/downloads/.

## 2. Detours (z2-detours, all 15 steps matched)

The detour set held fixed across passes, each as the earlier pass found it: Control+S instead of
export (no spreadsheet on that route); Export's Image tab first (Data one click away); turning the
left-out node back on first (13 nodes, 18 edges; Undo puts the filter back); Shown scope (Edges
"Shown 17 of 18", 17 rows, P13's route left out as the screen said: the key's equally-right case
when reported); the table's own menu (Export... opens on "All 13").

## 3. Success path by keyboard only, screen-reader mode: reached (z3-keys, all 47 steps matched)

Every dialog control has a name. Focus behavior unchanged; see Defects.

## Mismatches with the answer key

None. Each CSV export passes "Styles lost in CSV" with Save anyway, as the key's "Other doors" line
says.

## Defects (unchanged from the earlier pass)

1. Enter on Export drops focus to the page body when "Styles lost in CSV" appears, and nothing is
   announced (z3-keys/28.png, 45.png). Route: keyboard.
2. With the export dialog open, Tab from the body walks the page behind it, down to the Sources
   rows (z3-keys/30-35.png); the dialog does not keep focus. Route: keyboard.
3. Tab in an open list in the export dialog (Table) does nothing; focus and the open list stay
   (z3-keys/40.png, 41.png). Route: keyboard.

No crash, block or wrong graded result on any walk.

## Skipped

The T65 A/B, T66 A/B and T64 A/B routes on the fix list: they start from other tasks' setups, not
this task's start, and are walked by those tasks' pilots.
