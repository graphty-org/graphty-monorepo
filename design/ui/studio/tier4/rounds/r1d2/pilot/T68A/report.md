# Pilot: T68 A (sending the site list and the route list on as spreadsheets), targeted re-walk

Build: ff17391bb1 (frozen, `.study-builds/tier4-r1d2-ff17391bb1`). Screenshots, step files and the
saved files are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68A
(not in git). This task's walks are in y1-path, y2-start, y3-detours and y4-keys; the other tasks'
routes from the same fix list are in other/<route>.

Every T68 A walk starts from the studio's own start for this task, `pantries-narrowed.txt`
(pantries.csv joined with deliveries.csv, then a Data source card that keeps what came from
pantries.csv). The data stayed the task's own on every walk: 13 nodes, 18 edges, the file's own
values.

## Result

Reached by pointer and by keyboard. The full export writes 13 node rows (P13 included, with the
`site` column) and 18 edge rows (`source,target,trips`), as the answer key says. Nothing crashed,
blocked the task or gave a wrong result on any walk. The keyboard focus defects of the earlier pass
are still there.

## Start: the narrowed card, no select card, selection unchanged (y2-start)

- The header reads "12 of 13 nodes, 17 of 18 edges"; Graph > Values shows Nodes showing 12 of 13,
  Edges showing 17 of 18; Full graph 13 nodes, 18 edges (01.png).
- Filters holds one Data source card (pantries.csv ticked, deliveries.csv not) set to Hide. No
  Select card; nothing selected (`selected=0` held).
- The Edges tab reads "17 of 18 edges", Shown (03.png). A click on a node selects it and opens its
  inspector (P11, Union Hall; 04.png).
- The Edges table and the edge CSV keep deliveries.csv's own row order.

## 1. Success path by pointer: reached (y1-path, replay of the earlier walk, all 13 steps matched)

- Main menu > Export...: opens on Data, Format CSV, Table Nodes, Scope "All 13". Scope list: All
  13 / Shown 12 of 13 / pantries.csv 12 of 13 / deliveries.csv 13 (05.png).
- Export > "Styles lost in CSV" > Save anyway wrote `pantries_nodes.csv`: 13 rows including P13
  (blank values), every column of pantries.csv with its own values.
- Main menu > Export... > Table > Edges: Scope list All 18 / Shown 17 of 18 / pantries.csv 0 of 18
  / deliveries.csv 18 (11.png).
- Export > Save anyway wrote `pantries_edges.csv`: 18 rows, `source,target,trips`, P05,P13
  included; notice "Exported pantries_edges.csv" (14.png).

## 2. Detours (y3-detours, replay, all 15 steps matched)

The same detours as the earlier passes:

- **Control+S instead of export**: the "Save ... as" dialog; Escape closes it; a name and Enter
  save in the browser and rename the project; Main menu > Save local copy... writes a
  `.graphty.json` (02-05.png). No spreadsheet is written on this route.
- **Export's Image tab first**: Data is one click away in the same list (06.png).
- **Turning the left-out node back on first**: the card's on box off gives 13 nodes, 18 edges
  (08.png); the source row's Export... opens on "pantries.csv 12 of 13" with the short count on
  screen (11.png); Undo puts the filter back.
- **Shown scope**: Control+E, Scope "Shown 12 of 13", Table > Edges turns it into "Shown 17 of 18"
  with a "17 of 18" chip (13.png). Export wrote `sites-for-treasurer_edges.csv` with 17 rows, P13's
  route left out, as the screen said: the answer key's equally-right case when reported.
- **The table's own menu**: Table options > Export... opens on "All 13" (16.png).

## 3. Success path by keyboard only, screen-reader mode: reached (y4-keys, replay, all 47 steps matched)

- Tab: Main menu; Enter opens it; arrows walk it; Enter on Export... opens the dialog with Close
  focused. Tab order: Close, gridcell "Data", combobox "Format", combobox "Table", button "Advanced
  has configured values", combobox "Scope" "All 13", button "8 of 8", "Details", generic "Preview
  of the exported data", Cancel, Export, back to Close. Every control has a name.
- Enter on Export: "Styles lost in CSV" appears and focus falls to the page body, nothing announced
  (28.png). Tab then walks the page behind the open dialog (Main menu, Project: pantries, Undo,
  Redo, the filter chip, Clear filters, Data, Collapse Sources, Add source, pantries.csv row and
  menu; 30-35.png). Shift+Tab back reaches Save anyway; Space saved `pantries_nodes.csv` (13 rows),
  announced "Exported pantries_nodes.csv", focus to Main menu (37.png).
- Control+E: Close focused; Tab reaches Data, Recent "pantries_nodes.csv", Format, Table. Enter,
  ArrowUp, Enter picks Edges. Enter then Escape closes the list only; with the list open, Tab does
  nothing (40.png, 41.png). Escape, Tab, Tab: Scope "All 18"; ArrowDown reads "Shown 17 of 18";
  Escape closes the list only (42.png, 43.png).
- Tab x5 to Export, Enter: focus to the body again (45.png). Shift+Tab x5 reaches Save anyway;
  Enter saved `pantries_edges.csv` (18 rows), focus to Main menu (47.png). Control+E then Escape
  closes the dialog (decided).

## Other routes on the same fix list (walked from their own tasks' starts)

Each was replayed from its own task's real start into its own session under other/ and ended:

- **T65 A success path** (other/t65a-path, 24 steps matched): "14 of 24 nodes, 22 of 63 edges",
  "4 nodes selected"; Summary only, no node list (17.png, 25.png).
- **T65 A, the other card order** (other/t65a-order, 11 steps matched): role on Select first, then
  trained and hours: the same 14 and 4; 12 typed in "from" and Escape keeps 12 (08.png, 12.png).
- **T65 B success path** (other/t65b-path, 13 steps matched): "5 of 12 nodes, 2 of 14 edges",
  "3 nodes selected", Summary only (09.png).
- **T65 B, a style layer's Which nodes** (other/t65b-which-nodes, 7 steps matched): "installed
  before 2005, 5 nodes", every gauge still drawn (08.png).
- **T64 B, table header Role > Weight, then Shortest path again** (other/t64b-table-role and
  other/t64b-table-role-rerun, matched): first run Weight None with "Each edge counts as 1; km has
  no meaning set" (09.png); after Higher means > farther the form opens on "km (farther, loaded)"
  (14.png) and the run is new: Weight km (farther), Total km 5.3, Old Bridge, Heron Marsh, Lake
  Inlet (15.png; rerun/08.png).
- **T64 B, Analyze list for a weight** (other/t64b-analyze-weight, matched): "km (farther)" for
  that run; nodes by code because no label is set on that route (08.png).
- **T64 B success path, then Shortest path; inspector names G05** (other/t64b-path-sp, 20 steps
  matched): inspector "Old Bridge" (15.png); path by name, Total km 5.3 (21.png).
- **T64 A, table header Role > Weight, then Shortest path again** (other/t64a-table-role, 31 steps
  matched; continued by hand in other/t64a-table-role-sp): before Higher means is set, Shortest path
  lists "trips (loaded, not read)" on None (27.png); after closer, "trips (closer, loaded, not
  read)" on None with "Each edge counts as 1. A path needs a distance, and "trips" means closer."
  (32.png, 34.png). Harbor Market to Union Hall: Harbor Market, Central Warehouse, Eastside Pantry,
  Union Hall (33.png). Asked again with the same ends and unchanged data it hands back the stored
  run (41.png), as decided.
- **T64 A, Analyze list for a weight** (other/t64a-analyze-weight, 32 steps matched): with no
  weight set, Shortest path's Weight list offers "trips (farther)" (12.png).
- **T64 A success path (Data > Fields), inspector and find name P05** (other/t64a-path, 21 steps,
  other/t64a-find, 14 steps, matched): Label site, Weight trips, closer, Overview "Loaded weight
  trips (closer)" (10.png); find "P05" gives "Harbor Market, Node id: P05" (13.png); inspector
  Harbor Market (14.png).
- **T64 A, Analyze > Shortest path after the label is set** (other/t64a-path-sp, the success path
  replayed then continued by hand): From pre-filled with the selected Harbor Market, path listed by
  name (25.png).

## Mismatches with the answer key

- T68 A: none that changes grading. Each CSV export passes "Styles lost in CSV" with Save anyway,
  as the key's "Other doors" line says.
- T64 (not this task, seen on the routes above): the key says "The path result lists nodes by code
  (G05, G08, G09) even with the label set" and that a re-run with the same ends keeps the first
  run's result. On this build the path is listed by name once the label is set (t64b-path-sp/21.png,
  t64a-path-sp/25.png), and a re-run after the weight's reading changed computes a new result
  (t64b-table-role/15.png). The key also says Shortest path opens on "trips (closer, loaded)" with
  the weight set in Data; for A it opens on None and lists the weight as "not read", with a reason
  (t64a-path-sp/23.png). Grading on Data > Fields is unaffected.

## Defects

1. Enter on Export drops focus to the page body when "Styles lost in CSV" appears, and nothing is
   announced (y4-keys/28.png, 45.png). Route: T68 A keyboard.
2. With the export dialog open, Tab from the body walks the page behind it, down to the Sources
   rows (y4-keys/30-35.png); the dialog does not keep focus. Route: T68 A keyboard.
3. Tab in an open list in the export dialog (Table) does nothing; focus and the open list stay
   (y4-keys/40.png, 41.png). Route: T68 A keyboard.
4. In the Shortest path form, typing "Har" in From with "Harbor Market" highlighted in the list and
   pressing Tab keeps the letters and takes nothing; Find path then says "No node named Har"
   (other/t64a-table-role-sp/39.png, 40.png, 38.png). The decided rule is that Tab with letters
   typed and an option highlighted takes it. Route: T64 A table-role detour. Not this task.
5. Minor: opening the Shortest path Weight list adds a horizontal scroll bar to the form and clips
   the "Weight" label (other/t64a-table-role/27.png, other/t64a-analyze-weight/12.png).

No crash, block or wrong graded result on any walk.

## Skipped

None.
