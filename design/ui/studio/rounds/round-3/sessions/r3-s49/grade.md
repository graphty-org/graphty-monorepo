# Grade: session r3-s49 -- Alex (analyst), a picture and the numbers for a report (Les Miserables)

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), 1440 x 900, sighted
mode. Started from the setup for this task: the usage card declined, the Les Miserables sample
opened and a Louvain run made, so the drawing is colored by group with a "Color: Louvain" key.
Graded from the last screenshot (11.png), the two saved files in `downloads/` and the transcript.
Not graded from the participant's rating (5 of 7).

## Grade: S (success)

Both downloads the success definition asks for exist and are right:

1. **The image, `les-miserables_current-view.png` (1806 x 1720), saved at step 3.** Checked
   against the picture checklist and the final screen (11.png):
   - same nodes, same arrangement: the orange group at the top left, green and blue in the
     middle, yellow to the right with the long arm to the far right, the pink fan at the bottom;
   - sizes: not sized on screen, not sized in the image (no size channel to key);
   - names: none drawn on screen, none in the image;
   - key: a box in the top left reads "Color: Louvain", Group 1 to Group 6, with the same six
     swatch colors as the on-screen key and the outline's group rows.
2. **The data file, `les-miserables_nodes.csv`, saved at step 9.** Header
   `id,name,results.louvain.group,results.louvain.groupSize`, 77 data rows (one per character,
   matching "Nodes 77"), each with its group number. Group sizes match the outline (20, 17, 11,
   11, 10, 8). CSV, so Excel opens it. Not the Graphty JSON default and not the Edges table, so
   none of the failure codes (`no-key`, `wrong-file-type`, numbers without the computed column)
   applies.

**Why S and not SD:** no detour, no wrong turn, no help or tooltip. Alex hesitated at the JSON
default, at the three CSV choices and at the yellow "CSV cannot hold everything" box, but each
time made the change the success path makes next.

- **Build-decided:** no.
- **Failure codes:** none.
- **Tool fault (recorded, not voiding):** at step 9 `--click "role=button:Export"` left the screen
  unchanged and saved nothing (10.png is byte-identical to 09.png). The same click on the same
  build saved `les-miserables_nodes.csv` at once in the scripted repro
  (`rounds/round-3/repro/r3-s49/repro.sh`, output `run/`), so this was the tool failing to do
  what was asked, not the app. A person would have pressed the button once and got the file, which
  is exactly the state the session reached with `--click-at` on the button. The fault changed no
  graded outcome, so the grade stands; it is counted toward the tool-fault total. The earlier miss,
  `--click "button=Export"`, is the participant's own wrong name syntax for the tool and is not
  an app event.

## Counts

| | This session | Success path (round 3) |
|---|---|---|
| Steps | 10 app actions (path's 9, plus the Main menu click) | 9 |
| Wrong turns | 0 | -- |

- Opening the dialog through Main menu > "Export..." instead of Control+E is the path's own
  alternative and costs one extra click, not a wrong turn.
- Opening the Format and Table lists and picking CSV and Nodes are the path's own steps.
- The two failed tool commands at step 9 are not app actions and not wrong turns.
- Steps against the path: 10 for 9, about 1.1x.

## False "done"

None. "77 rows, same as the node count ... Done." (step 9) and "Did you finish? Yes" match the
files: both are in `downloads/` with the content Alex described, and Alex opened the PNG and read
the CSV before claiming done. 11.png shows the drawing with the dialog closed and no toast; the
toast "Exported les-miserables_current-view.png" was on screen at step 3 (04.png).

**Screen-reader check (not a screen-reader session, recorded for the bar):** the text exists on
the build: the toast "Exported les-miserables_current-view.png" (04.png), and the repro's CSV save
reported `les-miserables_nodes.csv`. The final screenshot here (11.png) caught no CSV toast; the
toast had likely already gone by the time of the click-at capture, which is not a defect on its own.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. None is a build defect
(the one dead-looking click was reproduced as working); each is seen in this participant, and
problems 1-5 match what the other participant on this task met, so those are confirmed.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | The Data section opens on "Graphty JSON", a project file shown as raw JSON. Asked for "the numbers", Alex wanted a table and had to go looking for one; saving the default fails the task (`wrong-file-type`). Confirmed (also r3-s48). | Step 4, 05.png; debrief. |
| 2 | 2 | behavior | Choosing CSV defaults Table to "Edges" (source, target, shared_chapters, no group column). Alex named this as the exact trap he had been burned by in other tools; only the description line and preview caught it. Saving it fails the task (numbers without the computed column). Confirmed (also r3-s48). | Step 6, 07.png; debrief. |
| 3 | 2 | wording | The yellow "CSV cannot hold everything" box is nine bullets of program terms ("node column "style.color"", "generic dialect", `table: "nodes"`). The one line that mattered -- the group values are only in the nodes table -- is the last bullet. It stays up on the Nodes table, warning about colors and positions he never wanted, which made him wonder whether something was missing. Confirmed (also r3-s48). | Steps 6 and 8, 07.png, 09.png; debrief. |
| 4 | 1 | behavior | The Format list has 18 entries and three CSVs (CSV, Gephi CSV, Neo4j CSV) with no hint which holds one row per character; Alex guessed plain CSV, expecting Gephi CSV to be an edge list. Confirmed (also r3-s48). | Step 5, 06.png; debrief. |
| 5 | 1 | opinion | CSV column names are program paths (`results.louvain.group`, `results.louvain.groupSize`), not report words; he will rename them by hand. Held one level down. Confirmed (also r3-s48). | Step 8, 09.png; `downloads/les-miserables_nodes.csv`. |
| 6 | 1 | behavior | Nothing ties the CSV's group number to the key's "Group N": Alex matched "6" in the file to "Group 6" in the key only by group sizes ("I think"). Here they do match, but a reader has no stated assurance. | Step 8, 09.png; debrief. |
| 7 | 0 | opinion | No SVG option for the picture; PNG at 2x was acceptable for slides. Held one level down. | Step 2, 03.png; debrief. |
| 8 | 0 | opinion | The dialog's image preview is too small to read the key; he confirmed it only by opening the saved file. Held one level down. | Step 2, 03.png. |
| 9 | 0 | opinion | Group 1 (gold-yellow) and Group 5 (orange) read as close, though distinguishable. Held one level down. | Step 3, `downloads/les-miserables_current-view.png`. |

**What worked:** the Main menu names "Export..." with its shortcut; the Image row is chosen when
the dialog opens, so the picture took one click and carried the key without asking ("better than
Gephi"); "Saved to this computer only; nothing is uploaded" sits on the dialog; the Nodes table
preview shows the group column before saving, which let him check it against the outline.
