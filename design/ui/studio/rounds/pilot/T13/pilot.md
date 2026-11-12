# Pilot: T13, a picture and the numbers for a report

Build under study: commit a1e6b91ff281e587adf315fda732d0f29f6be152, build 0196d46212aa
graphty@0.8.53, opened at `/?next`, 1440 x 900 (from `session.json`).

## Verdict

**End state NOT reached. T13 is not ready for participants.**

- The image downloads, but it has **no key to the colors**. The export dialog says so itself:
  "The legend is not in the image -- The legend card on the canvas is not drawn into exported
  images yet." The image legend fix (graphty-element issue #133) is not in this build, and
  `criteria.md` (preflight item 8) holds T13 until that fix passes this path.
- The CSV downloads with one row per character and the computed group, but **its group numbers
  do not match the group names on screen** (details below), so a reader cannot join the table to
  the picture's colors.

No script error, `console.error` or failed request was printed on any step.

## What was run

Setup file: `setup.txt` (the corrected one; the task's own setup failed, see blocker 3).

| Step  | Command                                                                             | Screenshot         | What the screen shows                                                                                                                                                                              |
| ----- | ----------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| start | setup (No thanks, Les Miserables sample, Shift+A, type Louvain, click Louvain, Run) | `01.png`           | 77 characters colored in 6 groups; a "Color: Communities" key on the canvas (Group 1 to Group 6) and the Communities list (20, 17, 11, 11, 10, 8). No names drawn on the canvas.                   |
| 1     | `--key Control+e`                                                                   | `02.png`           | Export dialog opens on Image: PNG, 2x (1806 x 1720), "Current view". Notice: "The legend is not in the image".                                                                                     |
| 2     | `--click "Image"`                                                                   | `03.png`           | Prints `ambiguous` (a gridcell and the dialog); no change, Image already selected.                                                                                                                 |
| 3     | `--click "Export"`                                                                  | `04.png`           | Prints `ambiguous` (button and dialog), took the button. Saved `downloads/les-miserables_current-view.png`, 1806 x 1720. Toast "Exported les-miserables_current-view.png".                         |
| 4     | `--key Control+e`                                                                   | `05.png`           | Dialog reopens on Image.                                                                                                                                                                           |
| 5     | `--click "Data"`                                                                    | `06.png`           | Prints `ambiguous` (button "Data", gridcell "Data"), took the first: **the left rail's Data button behind the open dialog**. The left panel switched to the Data view; the dialog stayed on Image. |
| 6     | `--click "role=gridcell:Data"`                                                      | `07.png`           | Dialog's Data page: CSV, Nodes table, a "CSV cannot hold everything" warning, a preview with `id,name,results.louvain.group,results.louvain.groupSize`.                                            |
| 7     | `--click "role=button:Export"`                                                      | `08.png`           | Saved `downloads/les-miserables_nodes.csv`, 1,956 bytes. Toast "Exported les-miserables_nodes.csv".                                                                                                |
| 8, 9  | `--wait 3000` twice                                                                 | `09.png`, `10.png` | No input; the drawing's orientation differs between the two (blocker 5).                                                                                                                           |

## The downloads against the picture checklist

`downloads/les-miserables_current-view.png`:

- Same nodes and colors as the screen at the moment of export: yes (it matches `01.png` and the
  dialog preview in `02.png`).
- Same arrangement as the final screen: **no**. By `04.png`, taken right after the export, the
  drawing on screen is turned differently from the saved image (blocker 5).
- Names drawn on screen are drawn in the image: not applicable, no names were drawn.
- A key naming every channel in use: **no key at all** (`no-key`).
- Framing: the bottom node is cut by the image edge and the top third is empty, as on the screen
  in `01.png`, where the toolbar also covers the lowest nodes.

`downloads/les-miserables_nodes.csv`: 77 rows plus a header, columns
`id,name,results.louvain.group,results.louvain.groupSize`. Opens in Excel. Group counts by
number: 0 = 8, 1 = 20, 2 = 10, 3 = 11, 4 = 11, 5 = 17.

## Blockers

1. **graphty-element defect -- the exported image has no key** (issue #133, already known).
   Step 3; `02.png` shows the dialog's own notice; `downloads/les-miserables_current-view.png`
   has no legend. This alone fails the task's success line and the preflight gate.

2. **graphty-element defect (likely) -- the CSV's group numbers are not the group names on
   screen.** The legend and the Communities list name groups 1 to 6 ranked by size (Group 1 = 20
   members, Group 6 = 8). The CSV writes the algorithm's raw 0-based ids in another order:
   Napoleon and Myriel are in the 8-member group, which the screen calls Group 6 and the CSV calls
   0; the 20-member group is Group 1 on screen and 1 in the CSV; the 17-member group is Group 2
   on screen and 5 in the CSV. Evidence: `07.png` preview (`Napoleon,Napoleon,0,8`,
   `MlleBaptistine,Mlle Baptistine,1,20`) against `01.png`. A reader who writes "Group 2" in a
   report cannot find it in the table. Where the "Group N" numbering is made decides the fix: if
   the app renumbers for display, the element should expose the display rank (or the export
   should carry it) so the two agree.

3. **Task wording (setup) -- the setup in `tasks.md` cannot run.** `--key Enter` after typing
   "Louvain" in the Analyze search does nothing; the following `--click Run` fails with `SETUP
FAILED ... nothing on screen is called "Run"` (`first-attempt/setup.log`,
   `first-attempt/01.png`). `--key ArrowDown --key Enter` does nothing either
   (`setup-probe/03.png`). `--click Louvain` opens the Louvain page with Run (`setup-probe/04.png`).
   Change the setup to: `--click No thanks`; `--click Open the Les Miserables sample`;
   `--key Shift+A`; `--type Louvain`; `--click Louvain`; `--click Run`.

4. **App defect -- the Analyze list has no keyboard way to pick a result.** Same evidence as 3:
   with the search field focused and one match listed, neither Enter nor ArrowDown then Enter
   opens it. A keyboard-only or screen-reader participant cannot run Louvain from the search.

5. **Unexplained -- the drawing changes orientation with no input.** Between two idle
   `--wait 3000` steps the whole drawing is turned differently (`09.png` against `10.png`); the
   same flip happens across the export steps (`01.png`, `04.png`, `08.png`). The tool never
   printed "the drawing is still moving". Consequence for T13: the exported image does not match
   the screen a participant sees a moment later, which fails "same arrangement as the final
   screen" through no fault of theirs. Cause not determined: the element's camera or layout
   moving on its own (an element defect), or the tool's screenshot catching a camera reset (a
   tool defect). Needs a look before any round grades the picture checklist.

6. **Wrong answer key -- the success path's control names.**
    - `--click "Data"` hits the left rail's Data button behind the modal export dialog (`06.png`);
      the path needs `--click "role=gridcell:Data"`.
    - `--click "Image"` and `--click "Export"` are ambiguous (they also match the dialog itself);
      they happen to take the right control, but `role=gridcell:Image` and `role=button:Export`
      are the safe names.
    - Path count: the path is listed as 7 steps but has 6 commands.

7. **App defect -- the export dialog does not block the page behind it.** Step 5 clicked the
   left rail's Data button while the export dialog was open, and the left panel changed
   (`06.png`). A modal dialog should not let the page behind it be operated. The dialog's
   Image/Data choices are also exposed as grid cells rather than tabs, so a screen reader does not
   hear them as the two kinds of export.

## Smaller observations (not blockers)

- The CSV warning on the Data page (`07.png`) is written for developers: "the generic dialect
  has no direction column; 254 undirected edges read back as directed unless the importer is told
  otherwise". A report writer cannot act on it. It also lists colors and sizes "cannot be
  written", which is expected for CSV but alarming in amber.
- The CSV column header `results.louvain.group` is a code path, not a column name a reader would
  put in a report.
- Edges are drawn with arrowheads although Overview says "Undirected" (`01.png`).
- Export notices: the toasts name the saved file ("Exported les-miserables_current-view.png",
  "Exported les-miserables_nodes.csv"), which answers the screen-reader check's "notice naming
  the file saved" visually; whether it is announced was not checked.

## Files

- Session: `01.png` to `10.png`, `session.json`, `session.log`, `setup.txt`
- Downloads: `downloads/les-miserables_current-view.png`, `downloads/les-miserables_nodes.csv`
- Failed first start with the task's setup: `first-attempt/`
- Setup probe (keyboard in the Analyze list): `setup-probe/`, `setup-probe.txt`
