# Pilot: T3, "Your own list of ties"

Build under study: commit 9d6598eea, build 9d6598eea3e9 graphty@0.8.53, opened at `/?next`, empty
start. Screenshots 01.png to 06.png in this folder.

## Verdict

The end state is reached, in the answer key's three steps. "Open project or file..." and an upload
of friends.csv draw the graph at once; Values > Overview reads 20 nodes and 41 edges; Data >
Sources reads "Edge table 41 rows, 41 edges", which is the on-screen rows count the key asks for.
The file has 41 data rows between 20 distinct names, so the counts are right. No script errors,
console errors or failed requests were printed at any step.

## The walk

| Step | Command                                                  | Screenshot | What happened                                                                                                                                               |
| ---- | -------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `--start ... empty`                                      | 01.png     | The start screen: Open project or file..., New from data..., four samples, the usage-data card.                                                             |
| 2    | `--click "Open project or file..." --upload friends.csv` | 02.png     | Drawn at once: 20 spheres with arrows, no labels. Values > Overview: Nodes 20, Edges 41, Direction Directed, Components 1, Edges per node 3 to 6, mean 4.1. |
| 3    | `--click "Data"`                                         | 03.png     | Data > Sources: `friends.csv 20 nodes, 41 edges`; `Node ... 20 rows, 20 nodes`; `Edge t... 41 rows, 41 edges`. Attributes: node `id`, edge `weight`.        |
| 4    | `--hover "Edge t"`                                       | 04.png     | Tooltip "Edge table", visible in the screenshot.                                                                                                            |
| 5    | `--hover "Node"` (ambiguous; took the "Node table" row)  | 05.png     | The tool printed `tooltip: "Edge table"`, but the screenshot shows the Node table row highlighted and no tooltip at all.                                    |
| 6    | `--hover "Node table"`                                   | 06.png     | `tooltip: null`; no tooltip on screen.                                                                                                                      |

## Remaining blockers

None stop the task. What is left:

1. **App defect (minor): the Node table row has no tooltip while the Edge table row has one.**
   Both names are cut off to "Node ..." and "Edge t..." (03.png). Hovering the edge row shows
   "Edge table" (04.png); hovering the node row shows nothing (06.png, `tooltip: null`). A
   participant checking "nothing was dropped" has to guess which line is the node list.
2. **App or element defect (minor): "Node table 20 rows" for a file that has no node table.**
   friends.csv is a links list only; the 20 people are derived from the source and target columns.
   "20 rows" claims rows that were never read, which muddies the "nothing dropped" check (the honest
   fact is 0 node rows read, 20 nodes made from 41 edge rows). Whoever fixes it should check
   whether the row count is the element's import fact or the app's wording; the element's
   session data falls back to the snapshot's node count when it has no rows
   (`graphty-element/src/session/data.ts`, around line 1021).
3. **Tool defect: a hover can print the previous hover's tooltip.** Step 5 printed
   `tooltip: "Edge table"` while 05.png shows no tooltip; the same row hovered by its exact name
   printed `tooltip: null` (step 6). The tool appears to read a tooltip still in the page from the
   last hover. A grader trusting the printout would record the wrong thing.
4. **Observation, not a blocker:** a list of who knows whom loads as Directed, with arrowheads
   (02.png). A participant may remark on it; the counts are unaffected.

The answer key matches this build: three steps, no import page, counts read from Data > Sources.
