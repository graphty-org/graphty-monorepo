# Pilot: every tier 1 task on the rebuilt app

Build under study: commit e82708488, build e82708488eea graphty@0.8.53, opened at `/?next`.
Each task's success path from `answers.md` was walked with `tool/real.mjs`, one session folder per
task and dataset in this folder (`T2/` ... `T15-B/`; `T11-flat/` is an extra check). The script
that ran them is `design/ui/studio/tmp/pilot-all/walk.sh`, and its transcripts are the `.out` files
beside it. No session printed a script error, a `console.error` line or a failed request. Every
screenshot was looked at. The drawings are deterministic: the same steps gave byte-identical
screenshots across sessions.

T1 and T4 are not run in tier 1 rounds, and T16 has no success path, so none of the three was
walked.

## Result

Every walked task reaches its end state on this build by the answer key's path. No defect stops
any of them. The reference values in `answers.md` still hold where the screen shows them.

| Task | End state | Evidence |
|---|---|---|
| T2 | Les Miserables drawn (77 nodes, 254 edges); the "Local only" tooltip reads "Nothing is sent. Opens Settings > Privacy" | T2/02, T2/03 |
| T3 | friends.csv drawn, 20 nodes, 41 edges, Directed; Data > Sources: "Edge t... 41 rows, 41 edges", "Node ... 20 rows, 20 nodes" | T3/03, T3/04 |
| T5 | The refusal: "club-members could not be opened: the file is incomplete or damaged near line 9, so nothing was read. Ask for the file again." | T5/03 |
| T6 | Nodes 77, Edges 254, Components 1; Attributes: id, name (nodes), shared_chapters (edges) | T6/03 |
| T7 A | Influence Top 10: Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577 | T7-A/06 |
| T7 B | Influence Top 10 on friends.csv: Farah 0.06608, Ava 0.06423, Hana 0.05883 | T7-B/05 |
| T8 | Communities: 6 groups, sizes 20, 17, 11, 11, 10, 8, modularity 0.5556; Group 1 members listed (first 10: MlleBaptistine, MmeMagloire, Valjean, ...) | T8/06, T8/07 |
| T9 A | Size "1 to 3", legend "Size: Influence" above "Color: Influence", 0.003299 to 0.07543 | T9-A/11, T9-A/12 |
| T9 B | The same on Florentine families, 0.03066 to 0.1458; Top 10 Medici, Guadagni, Strozzi | T9-B/11, T9-B/12 |
| T10 A | Label line "Abc name" on Everything; "77 labels, 7 hidden to avoid overlap" | T10-A/05 |
| T10 B | Label line "Abc label" on Everything; "115 labels, 14 hidden to avoid overlap" | T10-B/05 |
| T11 | Spectral and then "Force, flat" each moved every node (T11/07, T11/09); "No crossings" refused and left the drawing as it was (T11/05) | T11/05 to T11/09 |
| T12 A | Javert: Degree 17; "Javert's 17 connections", the 17 names in the answer key | T12-A/06, T12-A/07 |
| T12 B | Medici: Degree 6; "Medici's 6 connections": Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni | T12-B/06, T12-B/07 |
| T13 | `les-miserables_current-view.png` (same drawing, key "Color: Communities", six groups) and `les-miserables_nodes.csv` (77 rows, a group column with counts 20, 17, 11, 11, 10, 8) | T13/04, T13/07, `T13/downloads/` |
| T14 | Saved as "Les Mis work" (`T14/saved/`), closed, reopened from Recent projects: Influence colors and names back, "77 labels, 7 hidden to avoid overlap" | T14/06 to T14/08 |
| T15 A | Influence run, Size "1 to 3", names ("77 labels, 6 hidden to avoid overlap"), image with "Size: Influence" and "Color: Influence" keys | T15-A/14, T15-A/17, `T15-A/downloads/` |
| T15 B | The same on friends.csv with names from `id` ("20 labels, 0 hidden to avoid overlap") | T15-B/15, T15-B/18, `T15-B/downloads/` |

Runs are still named by their result on this build ("Influence", "Communities"), so the paths'
round 1 words apply: `--click "Influence"`, `role=option:Influence`.

## Remaining blockers and findings

None of these stops an end state. They are listed by kind, the ones most likely to change a
participant's answer first.

### Answer key

1. **The "No crossings" refusal has new words.** The build writes "No crossings could not lay out
   this graph, so the drawing is unchanged" under Method, and Method still shows "Force -
   Recommended" (T11/05). The key's T11 section expects "Could not draw with No crossings";
   re-record it with the build's words.
2. **T13's Export dialog steps.** The dialog's kinds are tabs now: `role=tab:Image` and
   `role=tab:Data` work (T13/03, T13/06). The key's note to use `role=gridcell:...` until the fix
   is out of date.
3. **Expected `ambiguous` prints.** T8's `--click "Group 1"` matches 4 controls (a row, two
   legend spans and a "Group 1 20" button), not 2; the first, the row, is the right one. T11's
   `--click "Method"` prints ambiguous (the combobox and its own label) and takes the combobox,
   which is right.

### graphty-element

4. **"Force, flat" does not lay the graph out.** On Les Miserables it puts all 77 nodes in an even
   disc with no clusters, and they are in exactly the same places 10 seconds later (T11-flat/05
   against T11-flat/07; the tool never printed "still moving"). It looks like the starting
   positions with no layout iterations run. A T11 participant who picks it sees a worse
   drawing and will say it did not help. Confirm in graphty-element before filing.
5. **A reopened run has no count.** After the reopen, the Influence row shows its color ramp but
   no "77" (T14/07, T14/08). This is a known issue, and the key already accepts it.
6. **Names in the exported image are soft, and the names that matter most are covered.** In both
   T15 images the names are blurry at 2x. "Valjean", on the largest dot, is overdrawn by
   neighboring labels, and on friends.csv Farah's dot, ranked first, sits behind Chloe's. On
   screen the names are a small serif face that is hard to read at 1440 x 900 (T10-A/05,
   T10-B/05). The image still passes the picture checklist.
7. **Data export column names are internal.** The CSV header is
   `id,name,results.louvain.group,results.louvain.groupSize` (`T13/downloads/`). A reader in Excel
   sees "results.louvain.group", not "Communities".

### graphty app

8. **Overlays cover the drawing.** The legend card hides the Florentine family at about 531,83
   from the run on (T9-B/05 to T9-B/12), and the six-group key hides the Les Miserables node at
   525,186 (T8/05, T13/01; the image shows it). The Layout popover and the bottom toolbar
   cover the bottom of the canvas. After Spectral, about 70 of 77 nodes sit in one clump under
   them (T11/07). After a node is selected by search, the camera centers on it and the lower
   part of the graph runs under the toolbar and off the canvas (T12-A/06, T12-B/06).
9. **The Overview's direction line shows raw file text.** On a sample it reads "Undirected, from
   the file: directed 0" and runs into the label column (T6/03). After a saved project is
   reopened it reads `Undirected, from the file: "directed": f`, cut off (T14/07).
10. **The CSV warning is written for developers.** "CSV cannot hold everything" lists columns as
    `"style.color"` and says "the generic dialect has no direction column; 254 undirected edges
    read back as directed unless the importer is told otherwise" (T13/06).
11. **The project name and the outline differ after a save.** The header reads "Les Mis work",
    and the outline still reads "Graph Les Miserables" (T14/04, T14/07).

### Tool

12. **A possible false "still moving".** The save step printed "the drawing is still moving",
    but the canvas in T14/03 and T14/04 looks the same. The only change is a tooltip
    ("Analyze Shift+A") at the toolbar, where focus landed. This is not confirmed as a tool
    fault.

### Task wording

None found on this walk.
