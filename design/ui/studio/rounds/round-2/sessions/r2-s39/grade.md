# Grade: session r2-s39 -- Ruth (data journalist), task T13: a picture and the numbers for a report

Build: commit 4a7a1a7fb (graphty 0.8.53), 1440 x 900, no screen reader. Graded from 12.png, the two
files in `downloads/` and `transcript.md`; the participant's own rating (5 of 7) is not used.

## Grade: S (success)

| Item          | Result                                            |
| ------------- | ------------------------------------------------- |
| Grade         | S                                                 |
| False "done"  | none                                              |
| Wrong turns   | 0                                                 |
| Steps         | 11 actions (02 to 12) against a success path of 9 |
| Build-decided | no                                                |
| Void          | no                                                |

## What the task asks, and what was delivered

Success needs two downloads: an image whose picture matches the screen and carries the key to the
group colors, and a CSV (or XLSX) with one row per character and the group each is in.

**Image, `les-miserables_current-view.png` (1806 x 1720).** Checked against 12.png with the picture
checklist:

- Same 77 nodes, same arrangement: the orange cluster at the top, the pink fan at the bottom left,
  the yellow cluster to the right, the blue knot in the middle -- the same drawing as the canvas.
- Names: none are drawn on screen, none in the image. Matches.
- Key: "Color: Communities, Group 1 ... Group 6" with the six swatches in the same colors as the
  screen's floating key and the left list. Color is the only channel in use, so the key is complete.
- Not sized, so the size row of the checklist does not apply.

**Data, `les-miserables_nodes.csv`.** Header `id,name,results.louvain.group,results.louvain.groupSize`,
77 data rows, group counts 20, 17, 11, 11, 10, 8 -- exactly the left list on 12.png. The file is
identical, row for row, to the reference file
`rounds/round-2/pilot/T13-v5/downloads/les-miserables_nodes.csv`. None of the F codes applies: the
key is in the image (`no-key` no), the data file is CSV (`wrong-file-type` no), the group column is
present (not "numbers without the computed column").

The final screen (12.png) shows the confirmation "Exported les-miserables_nodes.csv"; step 4 showed
"Exported les-miserables_current-view.png". Both claims of done in the transcript (steps 4 and 12,
and the closing paragraph) agree with the screen and the files, so there is no false "done".

## Steps and wrong turns

The round 2 success path (9): Ctrl+E; Export; Ctrl+E; Data; Format; CSV; Table; Nodes; Export.

The participant took 11 actions:

- Steps 2 and 3: opened the main menu and picked "Export..." instead of Ctrl+E. An equivalent route
  named in the task's path ("or Main menu > Export..."), one extra click, not a wrong turn.
- Steps 4 to 10: the success path exactly, with no detour. The Data default (Graphty JSON) and the
  CSV default table (Edges) were both noticed and changed before exporting, so no wrong file was
  ever saved.
- Step 11: a misspelled tool target ("button=Export") that matched nothing and changed nothing. A
  slip in the participant's tool syntax, not a choice made in the interface; not counted as a wrong
  turn, and not a tool fault (the tool reported the miss truthfully).

No help, tooltip or detour-then-correction was needed, so the grade is S rather than SD. The
hesitations below were real but cost no steps.

## Problems

All are from one participant, so none is confirmed yet under the two-participant rule; none is a
build defect (no crash, no control that does nothing, no wrong count), so no repro script was
needed.

| #   | Severity | Kind     | What                                                                                                                                                                                                                                                                                                                                                        | Evidence                                                                                                                                                    |
| --- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | behavior | For "numbers for each character", CSV defaults to the Edges table (one row per tie, no group column). The participant learned that the per-character columns need the Nodes table only from the last line of the yellow warning box. Someone who exports on the default gets the "numbers without the computed column" failure.                             | Step 8, 08.png: "Table: Edges", preview `source,target,shared_chapters`, last warning bullet "...are written only by a second export with table: \"nodes\"" |
| 2   | 2        | wording  | The "CSV cannot hold everything" box is written for programmers: "node column \"style.color\" (color) cannot be written", "the generic dialect has no direction column; 254 undirected edges read back as directed unless the importer is told otherwise", "table: \"nodes\"". The participant wondered whether she was about to lose something she needed. | Step 8, 08.png; transcript "What confused me"                                                                                                               |
| 3   | 2        | wording  | The Format list offers 18 formats, most named for software a journalist does not know (graphology JSON, OBO Graphs JSON, XGMML, CX2), and three CSVs (CSV, Gephi CSV, Neo4j CSV) with nothing saying which is the plain spreadsheet one or whether it holds characters or ties. The Data side opens on "Graphty JSON", which Excel cannot open.             | Steps 6 and 7, 06.png, 07.png                                                                                                                               |
| 4   | 2        | wording  | The exported column headings are `results.louvain.group` and `results.louvain.groupSize`, while the screen calls the result "Communities" and its values "Group 1" to "Group 6"; "louvain" appears nowhere on screen. The participant matched them only because the counts agree, and would rename the columns before sending the file to a fact-checker.   | Step 10, 10.png preview; `downloads/les-miserables_nodes.csv` header                                                                                        |
| 5   | 1        | behavior | The key in the Image preview is too small to read at preview size, so its contents cannot be checked before exporting.                                                                                                                                                                                                                                      | Step 3, 03.png                                                                                                                                              |
| 6   | 0        | opinion  | The key on screen is a dark box; in the exported picture it is a white box with the same contents. The participant accepted it. (Opinion, held one level down.)                                                                                                                                                                                             | Step 4, 04.png vs `downloads/les-miserables_current-view.png`                                                                                               |

## Screen-reader check

Not a screen-reader session. The visible confirmations that the screen-reader check names were on
screen: "Exported les-miserables_current-view.png" (step 4) and "Exported les-miserables_nodes.csv"
(12.png).
