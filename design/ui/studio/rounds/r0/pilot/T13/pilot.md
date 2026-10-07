# Pilot: T13, a picture and the numbers for a report

Build under study: commit 4522851420998602a015e60ae2cbf339049a2c97, build 452285142099
graphty@0.8.53, no uncommitted changes, opened at `/?next`, 1440 x 900 (from `session.json`).
The walk on the earlier build (commit 9d6598eea) is kept in `earlier-9d6598eea/`.

## Verdict

**End state reached. T13 is ready for participants.**

- The image downloads with a key to the colors ("Color: Communities", Group 1 to Group 6) and the
  same nodes, colors and arrangement as the screen. It passes the picture checklist.
- The CSV downloads with one row per character (77 rows plus a header) and the computed group.
  The group counts in the file (20, 17, 11, 11, 10, 8 for groups 1 to 6) are exactly the counts
  the Communities list shows, so a reader can join the table to the picture's key. The file is
  byte-identical to the one the earlier build wrote.
- No script error, `console.error`, failed request, `ambiguous` or "the drawing is still moving"
  was printed on any step; every command exited 0.

## What was run

Setup file: `setup.txt` (the setup in `tasks.md`: No thanks, Les Miserables sample, Shift+A, type
Louvain, click Louvain, Run). It ran whole.

| Step | Command | Screenshot | What the screen shows |
|---|---|---|---|
| start | setup | `01.png` | 77 characters in 6 colors; the "Color: Communities" key card at the top left of the canvas; the Communities list 20, 17, 11, 11, 10, 8. |
| 1 | `--key Control+e` | `02.png` | Export dialog on Image: "A picture of the drawing, 2x (1806 x 1720), PNG", preset "To share -- PNG, 2x", Current view. The preview shows the key at the top left. |
| 2 | `--click role=tab:Image` | `03.png` | Identical to `02.png` (Image already chosen). |
| 3 | `--click role=button:Export` | `04.png` | Saved `downloads/les-miserables_current-view.png`, 1806 x 1720. Toast "Exported les-miserables_current-view.png". |
| 4 | `--key Control+e` | `05.png` | The dialog reopens on Image. |
| 5 | `--click role=tab:Data` | `06.png` | Data page: "One row per node, with every computed value - CSV", Table Nodes; the amber "CSV cannot hold everything" box; preview `id,name,results.louvain.group,results.louvain.groupSize`, `Napoleon,Napoleon,6,8`. |
| 6 | `--click role=button:Export` | `07.png` | Saved `downloads/les-miserables_nodes.csv`, 1,956 bytes. Toast "Exported les-miserables_nodes.csv". |
| idle | `--wait 3000` twice | `08.png`, `09.png` | Identical to each other and, but for the toast, to `07.png`: the drawing did not move or turn. |

## The downloads against the picture checklist

`downloads/les-miserables_current-view.png`:

- Same nodes and arrangement as the final screen (`09.png`): yes.
- Names drawn on screen are drawn in the image: not applicable, no names are drawn.
- A key naming every channel in use: yes, "Color: Communities" with all six groups and their
  swatches. No size channel is in use.

`downloads/les-miserables_nodes.csv`: 77 rows, columns
`id,name,results.louvain.group,results.louvain.groupSize`.

## Blockers

None decide the task. Remaining findings, in order of weight:

1. **App defect -- the on-screen key card hides part of the drawing.** In every screenshot the
   "Color: Communities" card (screen x 310 to 548, y 52 to 267) covers the left of the orange
   group. The exported image shows an orange node and its edges at about 455,292 (screen about
   524,186) that on screen are behind the card. The participant cannot see the whole drawing
   they export. Not a grading problem: the image holds everything the screen shows, and more.

2. **Answer key -- the export dialog note is out of date.** `answers.md` (T13, Path) still says
   "Until the export dialog fix, its two kinds are grid cells: use `role=gridcell:Image` and
   `role=gridcell:Data`. A bare "Data" can reach the left rail's Data button behind the dialog."
   On this build the two kinds are tabs and `role=tab:Image` / `role=tab:Data` work. The
   grid cell sentence should be deleted; the bare "Data" warning was not re-checked.

3. **App wording (not a blocker) -- the CSV page and file speak to developers.** The amber box
   (`06.png`) lists code paths ("node column "style.color" (color) cannot be written") and "the
   generic dialect has no direction column; 254 undirected edges read back as directed unless the
   importer is told otherwise". The CSV header `results.louvain.group` is a code path, not a
   column name a reader would put in a report.

4. **App wording (not a blocker) -- an Overview row has no label.** The inspector's Overview
   shows a row reading only "Undirected, from the file: directed 0", right-aligned with no label
   on its left, and "Edges per ..." is cut off (`01.png` to `09.png`). Unrelated to this task's
   steps.

No element defect, tool defect or task-wording problem was found on this path.

## Files

- Session: `01.png` to `09.png`, `session.json`, `session.log`, `setup.log`, `setup.txt`
- Downloads: `downloads/les-miserables_current-view.png`, `downloads/les-miserables_nodes.csv`
