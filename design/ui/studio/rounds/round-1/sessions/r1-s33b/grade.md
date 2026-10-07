# Grade: session r1-s33b -- Dana, task T3 "Your own list of ties"

**Grade: S** (success). No false "done".

## Evidence for the grade

The task's success definition: the graph from friends.csv drawn (20 nodes, 41 edges), the
participant states 20 people and 41 ties, and checks that nothing was dropped against a rows count
on screen (Data > Sources: "41 rows, 41 edges").

- 03.png: opening friends.csv drew the graph at once; Overview shows Nodes 20, Edges 41.
- 04.png: Data > Sources shows "friends.csv 20 nodes, 41 edges", "Node ... 20 rows, 20 nodes" and
  "Edge t... 41 rows, 41 edges".
- Transcript verdict: "20 people, 41 ties, and the Data screen says 41 rows became 41 ties, so
  nothing was dropped." That is the rows-count check the task asks for, read correctly.
- Last screenshot (08.png): the same graph still drawn, nothing changed or lost. No files were
  saved (the task asks for none).

The participant called the result "mostly" done because she never saw the rows themselves; the
grade does not rest on her rating. Her claim matches the screen, so it is not a false "done".

## Steps and wrong turns

- Success path: 3 steps (Open project or file..., upload friends.csv, Data).
- Participant: 9 actions after the start (No thanks on the usage card; Open project or file...
  with the upload; Data; a click on the Edge table row; Cancel; a click on a node; Graph;
  Everything). The answer was on screen after the 3rd path step (04.png); the rest was looking for
  a table of rows.
- Wrong turns: 2.
  - Step 5 (05.png): selected the Edge table row in Sources, expecting its rows; it opened an
    "Add to friends" page. Undone by Cancel at step 6 (06.png).
  - Step 8 (08.png): opened Everything hoping for a list of people; found style controls.
    Abandoned.
- Step 7 (07.png, clicking a node to learn its name) was a check, not a wrong turn.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | Selecting a loaded table under Data > Sources (the "Edit source" door) opens "Add to friends" with an empty Tables list and a disabled Load ("Choose a file first"). The source the reader picked is not on the page, so there is nothing to edit and no rows to look at. The participant thought she had broken something. | Step 5, 05.png. Repro: `rounds/round-1/repro/r1-s33b/run.sh` |
| 2 | 2 | behavior | There is no way to see the rows that were loaded. The participant looked in Sources (step 5) and in Everything (step 8) and found no table; "nothing dropped" had to be inferred from two numbers. | Steps 5 and 8, 05.png, 08.png; verdict point 3 |
| 3 | 2 | wording | Table names in Sources are cut to "Node ..." and "Edge t..." at 1440 px wide, in small low-contrast grey; the row that answers the task is the hardest text to read. | Step 4, 04.png |
| 4 | 2 | behavior | The file was drawn with no word about which column was taken as "from" and which as "to", or why the ties are Directed; for a "who knows whom" list the participant reads Directed as wrong. | Step 3, 03.png ("Direction Directed") |
| 5 | 1 | opinion | No names on the dots after loading; the participant had to click a node to learn names came through. | Step 7, 07.png |
| 6 | 1 | wording | Words outside a newcomer's vocabulary: nodes, edges, degree, density, components, Icosphere. | 03.png, 07.png, 08.png |
| 7 | 1 | opinion | "Nothing dropped" is left to the reader to compute ("41 rows, 41 edges"); she asked for one line such as "41 of 41 rows loaded". | Step 4, 04.png |
| 8 | 2 | accessibility | Two controls share the accessible name "Graph" at that moment; the tool had to take the first match. Bears on the duplicate-names part of the automated accessibility check. | Step 8, tool note in transcript |

## Notes

- Usage card: declined ("No thanks") at step 2 without a detour; the participant read "Files are
  read on this computer and never uploaded" correctly. No wrong belief about what is sent.
- Ease (participant, 1-7 with 7 = very hard): 3, i.e. 5 on the studio's 7 = very easy scale.

## Repro of problem 1

`rounds/round-1/repro/r1-s33b/run.sh` (build 452285142099, graphty@0.8.53) loads friends.csv,
opens Data (04.png, "41 rows, 41 edges"), and selects the Edge table row. Its 05.png is the same
as the session's 05.png: "Add to friends", Tables empty, Load disabled with "Choose a file
first". In the app, selecting a source row calls the Data place's "Edit source" handler, which
only switches to the data page and passes it no source, so the page opens in its empty "add"
state.
