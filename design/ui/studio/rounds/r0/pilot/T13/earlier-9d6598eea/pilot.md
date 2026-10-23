# Pilot: T13, a picture and the numbers for a report

Build under study: commit 9d6598eea3e9ff49c131c48e8f75595456827999, build 9d6598eea3e9
graphty@0.8.53, no uncommitted changes, opened at `/?next`, 1440 x 900 (from `session.json`).

## Verdict

**End state reached. T13 is ready for participants.**

- The image downloads with a key to the colors ("Color: Communities", Group 1 to Group 6), the
  same nodes, colors and arrangement as the screen. This passes the picture checklist, so the
  image legend preflight item is met on this path.
- The CSV downloads with one row per character (77 rows plus a header) and the computed group.
  Its group numbers are now the numbers the screen names the groups by: group 1 has 20 rows,
  2 has 17, 3 and 4 have 11, 5 has 10, 6 has 8, exactly the counts in the Communities list.
- No script error, `console.error`, failed request, `ambiguous` or "the drawing is still moving"
  was printed on any step.

## What was run

Setup file: `setup.txt` (the setup in `tasks.md`: No thanks, Les Miserables sample, Shift+A, type
Louvain, click Louvain, Run). It ran whole.

| Step  | Command                      | Screenshot         | What the screen shows                                                                                                                                                                           |
| ----- | ---------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| start | setup                        | `01.png`           | 77 characters in 6 colors; a "Color: Communities" key on the canvas (Group 1 to Group 6); the Communities list 20, 17, 11, 11, 10, 8. Edges drawn without arrowheads; Overview says Undirected. |
| 1     | `--key Control+e`            | `02.png`           | Export dialog on Image: PNG, 2x (1806 x 1720), Current view. The preview shows the key at the top left. No "legend is not in the image" notice any more.                                        |
| 2     | `--click role=tab:Image`     | `03.png`           | No change (Image already chosen).                                                                                                                                                               |
| 3     | `--click role=button:Export` | `04.png`           | Saved `downloads/les-miserables_current-view.png`, 1806 x 1720. Toast "Exported les-miserables_current-view.png".                                                                               |
| 4     | `--key Control+e`            | `05.png`           | Dialog reopens on Image.                                                                                                                                                                        |
| 5     | `--click role=tab:Data`      | `06.png`           | Data page: CSV, Nodes; preview `id,name,results.louvain.group,results.louvain.groupSize`, `Napoleon,Napoleon,6,8`, `MlleBaptistine,Mlle Baptistine,1,20`.                                       |
| 6     | `--click role=button:Export` | `07.png`           | Saved `downloads/les-miserables_nodes.csv`, 1,956 bytes. Toast "Exported les-miserables_nodes.csv".                                                                                             |
| idle  | `--wait 3000` twice          | `08.png`, `09.png` | Identical to `07.png`: the drawing did not move or turn.                                                                                                                                        |

## The downloads against the picture checklist

`downloads/les-miserables_current-view.png`:

- Same nodes and arrangement as the final screen (`09.png`): yes.
- Names drawn on screen are drawn in the image: not applicable, no names are drawn.
- A key naming every channel in use: yes, "Color: Communities" with all six groups and their
  swatches. No size channel is in use.

`downloads/les-miserables_nodes.csv`: 77 rows, columns
`id,name,results.louvain.group,results.louvain.groupSize`. Napoleon and Myriel are group 6 (8
members), the pink group the screen calls Group 6, so a reader can join the table to the
picture's key.

## Blockers

None decide the task. Remaining findings, in order of weight:

1. **App defect -- the on-screen key card covers part of the drawing.** In `01.png` to `09.png`
   the "Color: Communities" card (top left of the canvas) sits over the left edge of the orange
   group: the exported image shows an orange node and its edges at the top left (image about
   455,292, screen about 524,186) that on screen are hidden behind the card. The participant
   cannot see the whole drawing they are exporting. Not a grading problem: the image is a superset
   of the screen, never a mismatch.

2. **Answer key -- the export dialog note is out of date.** `answers.md` says to use
   `role=gridcell:Image` and `role=gridcell:Data` "until the export dialog fix". On this build the
   two kinds are tabs, and `role=tab:Image` / `role=tab:Data` (the path as written) work. The
   gridcell sentence should go; the "A bare Data can reach the left rail's Data button" warning
   was not re-checked and may also be stale.

3. **App wording (not a blocker) -- the CSV page speaks to developers.** The amber "CSV cannot
   hold everything" box (`06.png`) lists code paths ("node column style.color") and "the generic
   dialect has no direction column; 254 undirected edges read back as directed unless the
   importer is told otherwise". The CSV's column header `results.louvain.group` is also a code
   path, not a column name a reader would put in a report. Neither stops the task.

No element defect, tool defect or task-wording problem was found on this path.

## Files

- Session: `01.png` to `09.png`, `session.json`, `session.log`, `setup.log`, `setup.txt`
- Downloads: `downloads/les-miserables_current-view.png`, `downloads/les-miserables_nodes.csv`
