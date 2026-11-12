# Pilot: T8, circles of characters

Build under study: commit 452285142099, graphty@0.8.53, no uncommitted changes, opened at `/?next`,
clean storage, 1440 x 900. The walk on the earlier build (commit 9d6598eea3e9) is kept in
`earlier-9d6598e/`.

**Result: end state reached in the answer key's 7 steps, with no blocker.** Every command in the
success path in `answers.md` works as written, and every fact the answer needs is on screen
before it is stated.

## The walk

| Step | Command                    | Screenshot | What the screen shows                                                                                                                                                                 |
| ---- | -------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | `--start empty`            | 01.png     | Start page; Samples lists Les Miserables (77 characters). Usage-data banner at the bottom.                                                                                            |
| 0    | `--click "No thanks"`      | 02.png     | Banner gone; "Usage data stays off. Change this in Settings > Privacy" in its place.                                                                                                  |
| 1    | `--click "Les Miserables"` | 03.png     | Graph drawn, one color. Overview: 77 nodes, 254 edges, density 0.08681, 1 component. Left panel bottom: "Analyze (Shift+A) to add results here".                                      |
| 2    | `--key Shift+A`            | 04.png     | Analyze list with its filter focused; ranking analyses first ("Rank nodes and edges"), PageRank marked "Start here".                                                                  |
| 3    | `--type Louvain`           | 05.png     | One match under "Find groups": Louvain, "Start here", "Which nodes form densely linked groups."                                                                                       |
| 4    | `--click "Louvain"`        | 06.png     | Louvain form: Resolution 1, "Under a second", Run.                                                                                                                                    |
| 5    | `--click "Run"`            | 07.png     | Nodes recolored by group; legend "Color: Communities", Group 1 to 6; left tree gains "Communities 6" with sizes 20, 17, 11, 11, 10, 8.                                                |
| 6    | `--click "Communities"`    | 08.png     | Inspector: Summary "Groups 6", "Modularity 0.5556"; Sizes bar chart and list, Group 1 = 20; Made with "Analysis: Communities", Resolution 1.                                          |
| 7    | `--click "Group 1"`        | 09.png     | Inspector "Group 1": Size 20, Made by Communities; Members "First 10": MlleBaptistine, MmeMagloire, Valjean, Labarre, Marguerite, MmeDeR, Isabeau, Gervais, Fauchelevent, Bamatabois. |

The answer as the screen gives it: 6 circles; the largest has 20 characters; three of them are
Valjean, MlleBaptistine and Fauchelevent (09.png, Members list).

## What the tool printed

- Step 7: `ambiguous: "Group 1" matches 4 controls (treeitem "Group 1", span "Group 1", span
"Group 1", button "Group 1 20"); took the first`. The answer key expects this; the first match
  is the tree row, the intended target.
- No "the drawing is still moving" this time (the earlier build printed it once after the Louvain
  click).
- No script errors, console errors or failed requests at any step; every command exited 0, and
  the session log is empty.

## Blockers

None.

## Observations that do not block the task

All but the legend one were also seen on the earlier build, unchanged; the legend one is in its
screenshots too but was not written down then.

- **The method's name is gone after the run.** The Analyze list and form say "Louvain"; after Run,
  the tree, the legend, the inspector's subtitle ("from Communities") and "Made with: Analysis"
  all say "Communities". The answer key accepts "Communities" as naming the method, but a
  participant asked which method they used has to remember it.
- **Members shows only the first 10 of 20**, under a heading "First 10" styled like a member row,
  with no control to see the rest. Not a problem for this task (three names are asked for); a
  task asking for every member of a group would stall here.
- **Selecting a group does not change the drawing** (08.png, 09.png): Group 1's 20 nodes are not
  emphasized on the canvas, so pointing at them there means matching the legend color by eye.
- **The legend covers part of the drawing.** From 07.png on, the "Color: Communities" legend sits
  over the canvas's top-left corner (about x 310 to 548, y 52 to 267); the node drawn near 525,185
  in 03.png is hidden behind it, and the legend has no visible control to collapse or move it.
- **Overview line overflows**: "Undirected, from the file: directed 0" runs to the panel's right
  edge and reads oddly ("directed 0"); "Edges per ..." is cut off. Present from 03.png on.
