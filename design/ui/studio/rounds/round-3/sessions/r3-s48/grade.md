# Grade: session r3-s48 -- Dev (class-project student), a picture and the numbers for a report (Les Miserables)

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), 1440 x 900, sighted
mode. Started from the setup for this task: the usage card declined, the Les Miserables sample
opened and a Louvain run made, so the drawing is colored by group with a "Color: Louvain" key.
Graded from the last screenshot (10.png), the two saved files in `downloads/` and the transcript.
Not graded from the participant's rating (5 of 7).

## Grade: S (success)

Both downloads the success definition asks for exist and are right:

1. **The image, `les-miserables_current-view.png` (1806 x 1720), saved at step 3.** Checked
   against the picture checklist and the final screen (10.png):
   - same nodes, same arrangement: the orange group at the top left, the green and blue groups in
     the middle, the yellow group to the right, the pink fan at the bottom; the node count and
     placement match the canvas;
   - sizes: not sized on screen, not sized in the image (no size channel to key);
   - names: none drawn on screen, none in the image;
   - key: a box in the top left reads "Color: Louvain", Group 1 to Group 6, with the same six
     swatch colors as the on-screen key and the outline's group rows.
2. **The data file, `les-miserables_nodes.csv`, saved at step 9.** Header
   `id,name,results.louvain.group,results.louvain.groupSize`, 77 data rows (one per character,
   matching "Nodes 77"), each with its group number. Group sizes match the outline (Group 1 = 20,
   Group 2 = 17, Group 6 = 8). CSV, so Excel opens it. Not the Graphty JSON default and not the
   Edges table, so none of the failure codes (`no-key`, `wrong-file-type`, numbers without the
   computed column) applies.

**Why S and not SD:** no detour, no wrong turn, no help or tooltip. The participant hesitated twice
(the JSON code box on the Data tab, the yellow "CSV cannot hold everything" box) but each time
changed the setting the success path changes next, and never left the path.

- **Build-decided:** no.
- **Void:** no. At step 3 the tool noted that "Export" also matched the dialog's title and took the
  button; a person clicks the same button. Step 4 sent Control+E and the "Data" click in one
  command; that is two of the path's steps and the click landed on the dialog's Data row (05.png),
  as the path says it does.
- **Failure codes:** none.

## Counts

| | This session | Success path (round 3) |
|---|---|---|
| Steps | 9 (steps 1-9; step 4 is two path steps, step 1-2 replace Control+E by Main menu > Export...) | 9 |
| Wrong turns | 0 | -- |

- Opening the dialog through Main menu > "Export..." instead of Control+E is the path's own
  alternative ("or Main menu > Export...") and costs one extra click, not a wrong turn.
- Opening the Format list and the Table list and picking an option are the path's own steps.
- Steps against the path: 9 commands for 9 path steps (10 path actions counting the menu click),
  1.0x.

## False "done"

None. "Picture and spreadsheet both in my downloads. Done." (step 9) and "Did I finish? Yes" match
the screen and the files: 10.png shows the toast "Exported les-miserables_nodes.csv", 04.png showed
"Exported les-miserables_current-view.png", and both files are in `downloads/` with the content he
described. The participant opened the PNG and read the CSV's first rows before claiming done.

**Screen-reader check (not a screen-reader session, recorded for the bar):** the text the task needs
exists on the build: the toasts "Exported les-miserables_current-view.png" (04.png) and "Exported
les-miserables_nodes.csv" (10.png).

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. Each is seen in this one
participant; none is a build defect (no crash, dead control, wrong count or keyboard block), so
each needs a second participant to be confirmed.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | The Data tab opens on "Graphty JSON" and shows a box of code. Nothing on it says which format a spreadsheet program opens. A student who did not know "CSV" from class would stop here or save the JSON (`wrong-file-type`). | Step 4, 05.png; debrief. |
| 2 | 2 | behavior | Choosing CSV defaults the Table to "Edges" (one row per pair of characters, no group column). The only pointer to the per-character table is the last bullet of the yellow box, written as `table: "nodes"`. Saving the default would have failed the task (numbers without the computed column). | Step 6, 07.png; debrief. |
| 3 | 2 | wording | The yellow "CSV cannot hold everything" box reads like an error ("Did I break something?") and its nine bullets are program terms: "node column "style.color"", "generic dialect", "the importer is told otherwise", `table: "nodes"`. It took him a while to find the one line that mattered. | Steps 6 and 8, 07.png, 09.png; transcript "Whoa, a warning". |
| 4 | 1 | behavior | The Format list has 18 entries, most named by library or standard (NetworkX, Cytoscape.js, OBO Graphs, XGMML, CX2), and three CSVs (CSV, Gephi CSV, Neo4j CSV) with no hint which is the plain spreadsheet one. He guessed right. | Step 5, 06.png; debrief. |
| 5 | 1 | opinion | The CSV's column names are program paths (`results.louvain.group`, `results.louvain.groupSize`), not words for a report table; he expects to rename them by hand. Held one level down as an opinion. | Steps 8-9, 09.png, `downloads/les-miserables_nodes.csv`. |
| 6 | 0 | opinion | "Louvain" is not explained anywhere he looked, and the groups are numbers only. Did not slow the task. Held one level down as an opinion. | Debrief; 01.png, 10.png. |
| 7 | 0 | opinion | The image preview in the dialog is small; he confirmed the key was in the picture only after opening the saved file. | Step 2, 03.png; debrief. |

**What worked:** the Main menu names "Export..." with its shortcut; the Image row is chosen when the
dialog opens, so the picture took one click and already carried the key; the toast names each saved
file; the Nodes table preview shows the group column before saving, which let him check it against
the outline ("group 6 = 8 people").
