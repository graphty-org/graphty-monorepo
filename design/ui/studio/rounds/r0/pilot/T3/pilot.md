# Pilot: T3, "Your own list of ties"

Build under study: commit 452285142, build 452285142099 graphty@0.8.53, opened at `/?next`, empty
start. Screenshots 01.png to 06.png in this folder. The walk on the earlier build (9d6598eea) is
kept in `previous-build-9d6598eea/`.

## Verdict

The end state is reached in the answer key's three steps, as on the earlier build. "Open project
or file..." and an upload of friends.csv draw the graph at once, with no import page. Values >
Overview reads Nodes 20 and Edges 41. Data > Sources reads "Edge t... 41 rows, 41 edges", the
on-screen rows count the key asks for. The file has 41 data rows naming 20 distinct people, so the
counts are right. No script errors, console errors or failed requests were printed at any step.

## The walk

| Step | Command | Screenshot | What happened |
| ---- | ------- | ---------- | ------------- |
| 1 | `--start ... empty` | 01.png | The start screen: Open project or file..., New from data..., four samples, the usage-data card. |
| 2 | `--click "Open project or file..." --upload friends.csv` | 02.png | Drawn at once: 20 spheres with arrowheads, no labels. The inspector header now reads "Graph / From friends.csv". Values > Overview: Nodes 20, Edges 41, Direction Directed, Density 0.1079, Components 1, Edges per node 3 to 6, mean 4.1. |
| 3 | `--click "Data"` | 03.png | Data > Sources: `friends.csv 20 nodes, 41 edges`; `Node ... 20 rows, 20 nodes`; `Edge t... 41 rows, 41 edges`. Attributes: node `id`, edge `weight`. |
| 4 | `--hover "Node table"` | 04.png | Row highlighted; `tooltip: null`; no tooltip on screen. |
| 5 | `--hover "Edge table"` | 05.png | Tooltip "Edge table" printed and visible under the row. |
| 6 | `--hover "Node table"` | 06.png | The tool printed `tooltip: "Edge table"`; the screenshot shows the Node table row highlighted and no tooltip. |

## Remaining blockers

None stops the task. All three findings of the earlier pilot reproduce unchanged on this build:

1. **App defect (minor): the Node table row has no tooltip while the Edge table row has one.**
   Both names are cut off ("Node ..." and "Edge t...", 03.png). Hovering the edge row shows
   "Edge table" (05.png); hovering the node row shows nothing (04.png, 06.png). A participant
   checking "nothing was dropped" has to guess which line is the node list.
2. **Element defect (minor): "Node table 20 rows" for a file that has no node table.**
   friends.csv is a links list only; the 20 people come from its source and target columns. The
   app prints `report.counts.nodeRecords` from the element's import report
   (`graphty/src/workspace/data-place/words.ts`, `sourceRows`), so the 20 is the element's fact:
   it reports node rows that were never read (the element's session data falls back to the node
   count when it has no rows, `graphty-element/src/session/data.ts`). The honest fact is 0 node
   rows read and 20 nodes made from 41 edge rows; it muddies the "nothing dropped" check.
3. **Tool defect: a hover can print the previous hover's tooltip.** Step 6 printed
   `tooltip: "Edge table"` while 06.png shows no tooltip, and the same hover before any other
   tooltip had appeared (step 4) printed `tooltip: null`. The tool reads a tooltip left in the page
   by the last hover. A grader trusting the printout would record the wrong thing.

Observation, not a blocker: a list of who knows whom loads as Directed, with arrowheads (02.png).
A participant may remark on it; the counts are unaffected.

The task wording and the answer key match this build: three steps, no import page, counts read
from Data > Sources.
