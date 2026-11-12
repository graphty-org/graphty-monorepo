# Pilot: T68 A (sending the site list and the route list on as spreadsheets), targeted re-walk

Build: ff17391bb1 (frozen, `.study-builds/tier4-r1d2-ff17391bb1`). Screenshots, step files and the
saved files are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T68A
(not in git), in the folders p1-path, p2-start, p3-detours and p4-keys.

Every walk starts from the studio's own start for this task,
`rounds/tier-4/setups/pantries-narrowed.txt` (pantries.csv joined with deliveries.csv, then a Data
source filter card that keeps what came from pantries.csv). Each walk replayed the earlier pass's
route on this build from that start; all four matched at every check point to their end (p1 13
steps, p2 4, p3 15, p4 47), and the screenshots with something on them that the task depends on
were looked at.

## Start (pantries-narrowed) -- as the answer key says (p2-start)

The header reads "12 of 13 nodes, 17 of 18 edges"; Graph > Values shows Nodes showing 12 of 13,
Edges showing 17 of 18; the Data source card has pantries.csv ticked and deliveries.csv not
(p1-path/01.png). The Edges table lists 17 routes, P13's route not among them (p2-start/03.png).
The table holds the file's own values (P01 Central Warehouse, families 0; P07 families n/a).

## 1. Success path by pointer -- reached (p1-path)

- Main menu > Export...: opens on Data, Format CSV, Table Nodes, Scope "All 13", chip "13".
  Scope list: All 13 / Shown 12 of 13 / pantries.csv 12 of 13 / deliveries.csv 13 (05.png); Escape
  closes the list only.
- Export > "Styles lost in CSV" > Save anyway wrote `pantries_nodes.csv`: 13 rows including P13,
  columns `id,lat,lon,families,site,zip,opened,volunteer_run` with the file's own values.
- Main menu > Export... > Table > Edges: Scope counts edges -- All 18 / Shown 17 of 18 /
  pantries.csv 0 of 18 / deliveries.csv 18 -- chip 18 (11.png).
- Export > Save anyway wrote `pantries_edges.csv`: 18 rows, `source,target,trips`, including
  P05,P13 (14.png, notice "Exported pantries_edges.csv").

## 2. Detours (p3-detours)

- **Control+S instead of export**: "Save ... as" dialog; Escape closes it; a name and Enter save in
  the browser and rename the project; Main menu > Save local copy... writes a `.graphty.json`.
- **Export's Image tab first**: Data is one click away in the same list.
- **Turning the left-out node back on first**: the card's box turns the filter off; 13 nodes and 18
  edges. The source row's Export... opens with Scope "pantries.csv 12 of 13" and a "12 of 13" chip,
  so the short count is on screen (11.png).
- **Shown scope**: Undo, Control+E, Scope "Shown 12 of 13"; Table > Edges turns it into "Shown 17
  of 18" with a "17 of 18" chip (13.png). Export wrote `sites-for-treasurer_edges.csv` with 17 rows,
  P13's route left out, as the screen said: the answer key's equally-right case when reported.
- **The table's own menu**: Table options > Export... opens on "All 13" (16.png).

## 3. Success path by keyboard only, screen-reader mode -- reached (p4-keys)

- Tab: Main menu; Enter opens it; arrows walk it; Enter on Export... opens the dialog with Close
  focused. Tab order: Close, gridcell "Data", combobox Format, combobox Table, button "Advanced has
  configured values", combobox Scope "All 13", button "8 of 8", Details, generic "Preview of the
  exported data", Cancel, Export, back to Close (12-27.png).
- Enter on Export: "Styles lost in CSV" appears and focus falls to the page body, nothing announced
  (28.png). Tab then walks the page behind the open dialog: Main menu, Project, Undo, Redo, Filter,
  Clear filters, Data, Collapse Sources, Add source, "pantries.csv 12 nodes", "pantries.csv menu"
  (30-35.png; 35.png shows the ring on the Sources row's menu button behind the dialog). Shift+Tab
  from Main menu wraps into the dialog and reaches Save anyway (36.png). Space saved
  `pantries_nodes.csv` (13 rows), announced, focus to Main menu (37.png).
- Control+E: Close focused; Tab reaches Data, Recent "pantries_nodes.csv", Format, Table (38.png).
  Enter, ArrowUp, Enter picks Edges (39.png). Enter then Escape closes the list only; Space reopens
  it; with the list open, Tab does nothing -- focus and the open list stay (40.png, 41.png).
  Escape, Tab, Tab: Scope "All 18"; ArrowDown in its list reads "Shown 17 of 18" (42.png, 43.png).
- Tab x5 to Export, Enter: focus to the body again (44.png, 45.png). Shift+Tab x5 reaches Save
  anyway; Enter saved `pantries_edges.csv` (18 rows), focus to Main menu (46.png, 47.png).
  Control+E then Escape closes the dialog, focus to Main menu (48.png; Escape closing a dialog is
  decided).

## Mismatches with the answer key

- None that changes grading.

## Defects (keyboard; still present on this build)

1. Enter on Export drops focus to the page body when "Styles lost in CSV" appears, and nothing is
   announced (p4-keys/28.png, 45.png).
2. With the export dialog open, Tab from the body walks the page behind it, down to the Sources
   rows (p4-keys/30-35.png); the dialog does not keep focus.
3. Tab in an open list in the export dialog (Table) does nothing; focus and the open list stay
   (p4-keys/40.png, 41.png).

No crash, block or wrong result on any walk: the full export writes 13 nodes and 18 edges with the
file's own values, and a Shown export writes 17 edges with the count on screen.

## Not walked here

The other routes in this re-test list (T60 to T67 and T68 B) are other tasks' routes, walked in
those tasks' pilots. Every T68 A route in the list was walked: the start, the success path, the
detour turning the left-out node back on first, and the Shown scope detour.
