# T37 B pilot: a first look at Zachary's karate club

Build 6de5f95d12 (graphty@0.8.91), frozen copy `.study-builds/tier3-r1d1-6de5f95d12`. This is a
targeted re-pilot: only the success path by pointer was walked (`success-6de5/`), from the empty
app. None of the routes the latest fixes touched belongs to this task (they are opening files,
saved projects, the poster and thank-you layers, community runs and the table after them,
Control+O > Replace and find-box layers), so the detours and the keyboard walk were not repeated;
the previous report for build 3ef9e6c1ec is kept as `report-3ef9e6c1ec.md`, and the one before it
as `report-ed4351b258.md`.

The data stayed the karate club's own the whole way: 34 nodes, 78 edges, ids 1 to 34, `id` the
only column before the run. No earlier work was lost (`work.json` "gone" is empty).

Result: reached. Counts read from the Values tab (Nodes 34, Edges 78); member 34 has the most
ties: Degree 17, matching "Highest 17", and after a run "17, #1 of 34" and the top row of the
table sorted on Degree.

## Success path by pointer (`success-6de5/`)

| Step | Action | Screen | Shot |
| --- | --- | --- | --- |
| 1 | No thanks | The start page: "Analyze any network", Open a file, Open network data, Samples, New project, a turning demo graph | 02 |
| 2 | Zachary's karate club (the card "A club that split in two, Zachary's karate club -- 34 nodes, 78 edges", lower on the page) | Graph opens; Values: Nodes 34, Edges 78, Degree Lowest 1, Highest 17 (no name) | 03 |
| 3 | Click the central hub (871,312) | Inspector: 34, id 34, Degree 17 | 04 |
| 4 | Analyze | Analysis list, "Rank nodes and edges", Degree first | 05 |
| 5 | Degree | Card: "How many edges each node has: the most connected rank highest.", Under a second, Run | 06 |
| 6 | Run | Every node colored 1 to 17, a Degree layer (34) added, Legend on ("Color: Degree 1 - 17"); the inspector adds "Results Degree 17, #1 of 34" | 07 |
| 7 | Table | Nodes tab, "34 nodes", "In the order loaded", Id and Degree, "Columns: 2 of 2" | 08 |
| 8 | Degree header | "Sorted by Degree, highest first"; 34 / 17 on top and highlighted, then 1 / 16, 33 / 12 | 09 |

After the end: Main menu > Back to start (10) asks "Discard unsaved changes?" (11) while the top
bar reads "Autosave: saved"; Discard returns to the start page (13). Scrolling it (14, 15) shows
every sample and generator card with a broken thumbnail image.

## Answer key against the screen

- The start screen is now a landing page; the karate sample is a card lower on the page whose
  text already gives "34 nodes, 78 edges", so the counts can be read before opening it
  (`success-6de5/02.png`, `15.png`).
- Everything else on the success path matched: the counts, Highest 17, Degree 17 on node 34, the
  Degree card's text, "17, #1 of 34" and the sorted table.

## Defects

Nothing crashed, blocked the task or gave a wrong count or a wrong member.

1. Every sample and generator card on the start page shows a broken image: its thumbnail
   (`https://graphty.app/data/graph-samples/v1/<name>.webp`) answers 404 with an HTML page, which
   the browser blocks (ERR_BLOCKED_BY_ORB) (success, `success-6de5/14.png`, `15.png`).
2. "Back to start" warns "Zachary's karate club has changes that are not saved" while the top
   bar says "Autosave: saved" (success, `success-6de5/11.png`).

## Not walked

- The detours by pointer and the success path by keyboard: not repeated in this targeted pass,
  since no fix touched this task's routes.
- The listed fix routes (T50A, T50B, T46A, T46B, T47, T48, T45A, T38, T41, T51, projects saved
  before the merge): they belong to other tasks.
