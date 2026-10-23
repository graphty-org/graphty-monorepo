# Pilot: T8, circles of characters

Build under study: commit 9d6598eea3e9, graphty@0.8.53, opened at `/?next`, clean storage, 1440 x 900.

**Result: end state reached in the answer key's 7 steps, with no blocker.** The success path in
`answers.md` works command for command, and every fact the answer needs is on screen before it is
stated.

## The walk

| Step | Command                    | Screenshot | What the screen shows                                                                                                                                                                 |
| ---- | -------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | `--start empty`            | 01.png     | Start page; Samples lists Les Miserables (77 characters). Usage-data banner at the bottom.                                                                                            |
| 0    | `--click "No thanks"`      | 02.png     | Banner gone.                                                                                                                                                                          |
| 1    | `--click "Les Miserables"` | 03.png     | The graph drawn; Overview: 77 nodes, 254 edges, 1 component. Bottom of the left panel: "Analyze (Shift+A) to add results here".                                                       |
| 2    | `--key Shift+A`            | 04.png     | Analyze list opens, focused filter, ranking analyses first.                                                                                                                           |
| 3    | `--type Louvain`           | 05.png     | One match under "Find groups": Louvain, "Start here", "Which nodes form densely linked groups."                                                                                       |
| 4    | `--click "Louvain"`        | 06.png     | Louvain form: Resolution 1, "Under a second", Run.                                                                                                                                    |
| 5    | `--click "Run"`            | 07.png     | Nodes recolored by group; legend "Color: Communities" with Group 1 to 6; left tree gains "Communities 6" with sizes 20, 17, 11, 11, 10, 8.                                            |
| 6    | `--click "Communities"`    | 08.png     | Inspector: Summary "Groups 6", "Modularity 0.5556"; Sizes bar chart and list, Group 1 = 20; Made with "Analysis: Communities", Resolution 1.                                          |
| 7    | `--click "Group 1"`        | 09.png     | Inspector "Group 1": Size 20, Made by Communities; Members "First 10": MlleBaptistine, MmeMagloire, Valjean, Labarre, Marguerite, MmeDeR, Isabeau, Gervais, Fauchelevent, Bamatabois. |

The answer as the screen gives it: 6 circles; the largest has 20 characters; three of them are
Valjean, MlleBaptistine and Fauchelevent (09.png, Members list).

## What the tool printed

- Step 4: `the drawing is still moving (the canvas kept changing for a second with no input)`.
  06.png and 05.png show the same drawing with no visible movement, and no later step reported it.
  Not a blocker; worth one look if it recurs in the study (it may be the layout's last small
  adjustments, or the text caret in the Resolution field being counted).
- Step 7: `ambiguous: "Group 1" matches 4 controls (treeitem, two legend spans, button "Group 1 20");
took the first`. The answer key expects this; the first match was the tree row, which is the
  intended target.
- No script errors, console errors or failed requests at any step.

## Blockers

None.

## Observations that do not block the task

- **The method's name is gone after the run.** The Analyze list and form say "Louvain"; after Run,
  the tree, the legend, the inspector's subtitle ("from Communities") and "Made with: Analysis"
  all say "Communities". The answer key already accepts "Communities" as naming the method, but a
  participant asked "which method did you use" has to remember it.
- **Members shows only the first 10 of 20**, under a heading "First 10" styled like a member row,
  with no control to see the rest. It does not block this task (three names are asked for), but a
  task asking for all members of a group would stall here.
- **Overview line overflows**: "Undirected, from the file: directed 0" runs to the panel's right
  edge and reads oddly ("directed 0"); "Edges per ..." is cut off with no tooltip seen. Present
  from 03.png on.
- **Selecting a group does not change the drawing** (08.png, 09.png): Group 1's 20 nodes are not
  emphasized on the canvas, so a participant cannot point at them there without matching the
  legend color by eye.
