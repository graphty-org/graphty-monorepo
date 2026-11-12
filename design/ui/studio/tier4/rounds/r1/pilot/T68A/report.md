# Pilot: T68 A (sending the site list and the route list on as spreadsheets)

Build: 0ffeae2ef5 (frozen, `.study-builds/tier4-r1-0ffeae2ef5`). Screenshots and step files are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68A (not in git).

## Start

The answer key names a start `pantries-narrowed.txt`; no such setup exists in
`rounds/tier-4/setups/`. The walks used a setup written beside them
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T68A/pantries-narrowed.txt):
`pantries-joined.txt` plus T66 A's success path (Filters "+" > Data source > pantries.csv). It leaves
the header at "12 of 13 nodes, 0 of 18 edges": P13 out of the picture and every edge out too, since
every edge came from deliveries.csv (01.png of each walk). The setup file still has to be added to
the studio's setups before a round.

## 1. Success path by pointer -- reached

Folder: .../T68A/w1-path

- Main menu > Export... (02.png): opens on Data, Format CSV, Table Nodes, Scope "All 13", one
  counted loss line "Lost in CSV: positions not written, 2 style settings" (03.png).
- Scope list: All 13 / Shown 12 of 13 / pantries.csv 12 / deliveries.csv 13 (05.png). Escape closed
  the list only (06.png).
- Export showed a second step, "Styles lost in CSV ... Save anyway / Choose another format"
  (07.png); Save anyway wrote `pantries_nodes.csv`, 13 rows with P13 and the `site` column (08.png,
  notice "Exported pantries_nodes.csv").
- Main menu > Export... again, Table > Edges (09.png, 10.png), Export, Save anyway (13.png): wrote
  `pantries_edges.csv`, 18 rows including P05,P13 (14.png).
- Files: .../w1-path/downloads/pantries_nodes.csv, .../w1-path/downloads/pantries_edges.csv.

## 2. Detours -- folder .../T68A/w2-detours

- **Control+S instead of export**: "Save pantries as" dialog (02.png); Escape closed it (03.png);
  typing a name and Enter saved it "in this browser" and renamed the project (04.png). No file and
  no pointer to Export. Main menu > Save local copy... wrote a `.graphty.json` with no notice on
  screen at all (05.png).
- **Export's Image tab first**: Image / Video / Data ... list on the left; Data is one click away
  (06.png).
- **Turning the left-out node back on first**: the card's on box "Apply from pantries.csv"
  (07.png) turns the filter off; 13 nodes and 18 edges drawn (08.png). The source row's right-click
  menu has Export... (10.png), which opens with Scope "pantries.csv 12" and a "12 of 13" chip
  (11.png).
- **Exporting only what is in the picture**: Undo put the filter back; Control+E, Scope "Shown 12
  of 13" shows a "12 of 13" chip on Nodes (12.png). Switching Table to Edges keeps "Shown 12 of 13"
  and the node chip; the preview is only `source,target` (13.png). Export wrote an edge file with
  no rows and announced "Exported sites-for-treasurer_edges.csv" (14.png).
- **The table's own menu**: "..." > Export... (15.png) opens the same dialog, here on the last
  scope chosen, "Shown 12 of 13" (16.png).

## 3. Success path by keyboard (screen-reader mode) -- reached

Folder: .../T68A/w3-keys

- Tab: Main menu. Enter: menu at "Back to start"; arrows walk the items, names without their
  shortcuts ("Export..." not "Export... Control+E"). Enter on Export...: dialog, Close focused
  (12.png).
- Tab order in the dialog: Close, gridcell "Data" (the Image/Video/Data list is a grid of
  gridcells, read as rows), [gridcell for a Recent file once one exists], combobox Format, combobox
  Table, button "Advanced has configured values", combobox Scope, button "8 of 8", button Details,
  generic "Preview of the exported data", Cancel, Export, and back to Close.
- Enter on Export: the "Styles lost in CSV" step appears and **focus falls to the page body**
  (28.png, nothing announced). The next Tab goes to the page behind the open dialog: Main menu,
  Project, Undo, Redo, Filter, Clear filters, Data, Collapse Sources, Add source, pantries.csv
  (30-39.png; 39.png shows the dialog still open with the ring on a Sources row). Shift+Tab from
  Main menu wraps back into the dialog; Save anyway is reached by Shift+Tab. Space on it saved
  `pantries_nodes.csv`, announced "Exported pantries_nodes.csv", focus to Main menu.
- Control+E: dialog, Close focused. Table combobox: Enter opens, ArrowUp, Enter picks Edges;
  Escape closes the list only; Space opens it. **Tab with the list open does nothing**: focus and
  the open list stay (56.png, 57.png). Escape, then Tab to Export, Enter: focus to the body again;
  Shift+Tab reaches Export, then Save anyway; Enter saved `pantries_edges.csv` (18 rows).
- Control+E then Escape closes the dialog, focus to Main menu (decided: Escape closes a dialog).

## Mismatches with the answer key

- The start file `pantries-narrowed.txt` does not exist.
- The key's "only what is in the picture" case is 12 nodes and 17 edges; on this build the T66
  state shows 0 of 18 edges, so a Shown export writes 12 nodes and an empty edge file.
- Export does not end at "Export / Save": a CSV export always stops on "Styles lost in CSV" and
  needs Save anyway.
- The edge file's headers are `source,target,trips`, not the file's own `from,to,trips`; the
  duplicate P03,P10 row is gone (18 rows, as the key expects).

## Defects

1. Keyboard: Enter on Export drops focus to the page body when "Styles lost in CSV" appears, and
   nothing is announced (w3-keys 28.png).
2. Keyboard: with the export dialog open, Tab from the body walks the page behind it (w3-keys
   30-39.png); the dialog does not keep focus.
3. Keyboard: Tab in the open Table (and other) list in the export dialog does nothing; focus and
   the list stay (w3-keys 56.png, 57.png).
4. Edges with Scope "Shown 12 of 13" writes a file with no rows; the scope and the chip count
   nodes, not edges, and the success notice gives no count (w2-detours 13.png, 14.png).
5. On Table Edges the Scope list and chip keep node counts ("All 13", "13") instead of 18 edges
   (w1-path 10.png, 11.png).
6. A second "Styles lost in CSV" step with Save anyway after the loss line already said it, on
   data that has no style a person set; "Reopened: no styles" is unclear (w1-path 07.png).
7. Details lists internal names (`style.color`, `style.size`, "Node order changes 9", "Style
   layers not written 6") while the line above says "2 style settings" (w1-path 12.png).
8. Save local copy... gives no notice on screen (w2-detours 05.png); Control+S's notice says "in
   this browser" with no pointer to making a file (w2-detours 04.png).
9. Names: "Advanced has configured values" for the gear button nobody set (tooltip "Advanced");
   "8 of 8" / "1 of 1" with no "Columns"; the export kinds read as grid rows/gridcells; the
   source row is named "pantries.csv Node 12 12 nodes" (w1-path 04.png, w3-keys).
10. Menu item names leave out their shortcuts (Export... Control+E) for a screen reader; the
    table's "..." > Export... shows no Control+E (w2-detours 15.png).
11. "Adjacency List" in title case beside sentence-case options (w1-path 09.png).
12. The edge file renames the person's `from,to` headers to `source,target` (w1-path downloads).

## Skipped

Nothing.
