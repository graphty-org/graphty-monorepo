Grade: S
False done: 0
Wrong turns: 0
Steps: 9 (path steps: about 8 -- main menu, Export, Export, Save anyway, Table > Edges (2), Export, Save anyway; she came in through the table's "..." door instead of the main menu, which the key lists as an equal door)
Model: opus (claude-opus-5-5 in the transcript; no Sonnet)
Leaks: none (leaks.json lists no file outside the session folder; 20 calls checked over 1 transcript)

# r1-s25 -- T68 A, Dana (returning user), build 79ed770292

## Result

`downloads/` holds two CSV files:

- `pantries_nodes.csv`: header `id,lat,lon,families,site,zip,opened,volunteer_run` and 13 rows,
  P01 to P13. P13, the site the Data source filter leaves out of the picture, is included, and the
  `site` column is there.
- `pantries_edges.csv`: header `source,target,trips` (not the person's `from,to,trips`) and 18
  rows, including P05 -> P13, the route the picture leaves out.

`downloads.jsonl` records both saves against a network of 13 nodes and 18 edges with 12 and 17
showing. That is exactly the key's success state for A (node file of 13 rows with P13 and `site`,
edge file of 18 with `source,target,trips`). The last screenshot (08.png) shows the notice
"Exported pantries_edges.csv" with the filter still on (12 of 13, 17 of 18): the export changed
nothing in the project (`work.json` start and end agree). She reported both files and where they
went: S.

## Route against the success path

The key's path opens Export from the main menu (or Control+E); the table options' Export... opens
the same dialog on "All 13" and is listed as an equal door. She took:

1. Table options "..." (02.png: one item, Export...).
2. Export... (03.png: Data, CSV, Table Nodes, Scope All 13, preview of the file).
3. Export (04.png: the "Styles lost in CSV" box with Save anyway / Choose another format).
4. Save anyway (05.png: "Exported pantries_nodes.csv").
5-7. Edges tab, Table options, Export... (06.png: Table Edges, Scope All 18, preview
   `source,target,trips`).
8. Export (07.png: the same "Styles lost in CSV" box).
9. Save anyway (08.png: "Exported pantries_edges.csv"). Success state reached.

Switching the table to Edges before reopening the dialog stands in for the dialog's Table
dropdown; no step left the path or was taken back. She said done only after both files were
written: no false done.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | ---- | -------- |
| 1 | 2 | behavior | Every CSV export stops on an orange "Styles lost in CSV" box that needs Save anyway, although the yellow strip above the preview already said styles are not written and a spreadsheet format cannot hold them. It cost two extra steps here and reads as risky ("Save anyway"). The dialog also shows "No styles" under the format while the box says style layers are lost, which contradicts itself. | Steps 4 and 7; 04.png, 07.png; 03.png ("No styles") |
| 2 | 2 | behavior | P13 is written as a row holding only its id (every other column empty), and nothing on the export screen says a row has no values. The app knew (warning marks on the source row and the Target column), but the dialog's notice line does not carry it, so she found it only by opening the file. The row is correct data (P13 appears only as a route end), but the person sending it has to explain it. | Step 8 notes; downloads/pantries_nodes.csv last row; 06.png, 08.png (warning marks) |
| 3 | 1 | wording | The loss strip reads "Lost in CSV: positions not written, node order changes, 2 more" in small gray text; "node order changes" means nothing to her and "2 more" hides the rest behind Details. | Step 6 notes; 06.png |
| 4 | 1 | wording | After saving, the notice gives only the file name ("Exported pantries_nodes.csv"), never where the file went; she relied on knowing browsers use a Downloads folder. | Steps 5 and 8; 05.png, 08.png |
| 5 | 1 | opinion | The export door she tried first is an unlabeled "..." on the table; she would have liked a word on it or Export where she looked first. The main menu door exists but she did not reach for it. | Step 1 notes; 01.png, 02.png |
| 6 | 1 | opinion | The default file names use "nodes" and "edges" after the project name; she would rename them before sending. | Wrap-up notes; downloads/ |
| 7 | 1 | behavior | An unlabeled small green gear icon sits under "No styles" in the dialog with no name or tooltip shown; she ignored it. | Step 3 notes; 03.png, 06.png |

The leading spaces in P06's name and the "n/a" in P07's families are the source file's values,
written as they are; they are not export defects.

No build defect was found: the export wrote what the key describes on this build, so no repro was
needed.
