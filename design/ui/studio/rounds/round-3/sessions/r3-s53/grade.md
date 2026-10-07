# Grade: session r3-s53 -- Elena (product manager, first time with graph tools), your own list of ties (friends.csv)

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted, 1440 x 900.
Graded from the last screenshot (05.png), the earlier screenshots and the transcript, plus one
scripted re-run on the same build. No files were saved, and the task needs none. Not graded from
her own rating (6 of 7).

## Grade: S (success)

The success definition has three parts, and all three hold.

1. **The graph from friends.csv is drawn, Overview 20 nodes, 41 edges.** Step 2 (03.png): she
   dropped the file on the start page, which offers "or drop a file anywhere in this window". It
   was drawn at once, and the Overview reads Nodes 20, Edges 41. This is the same route as the
   answer's "Open project or file..." plus upload: no import page and no Load. Holds.
2. **She states 20 people and 41 ties.** Step 2 and the debrief: "So 20 people and 41 ties", "20
   people, 41 ties". Both numbers match the file: friends.csv has 41 data rows, and 20 distinct
   names in its source and target columns. Holds.
3. **She checks that nothing was dropped against a rows count on screen.** Step 3 (04.png): she
   clicked "From friends.csv", the Data tab opened, and Sources reads "friends.csv 41 rows, 41
   edges". She said "'41 rows, 41 edges' -- so every row in the sheet became a line. Good, nothing
   got lost." The check rests on the rows count, not on the Overview alone, and no roles were
   changed. Holds.

- **Why S and not SD:** neither SD condition applies. She did not rely on the Overview alone, and
  she changed no column roles. She hesitated over "Nodes" and "Edges", and found the rows count by
  trying a link "hoping, not knowing". Those hesitations are recorded as problems below. They do
  not meet the answer's SD rule.
- **Build-decided:** no.
- **Void:** no. Each command did what a person could do.
- **Failure codes:** none.
- **Usage card:** declined ("No thanks", step 1) with no detour.

## Counts

| | This session | Reference |
|---|---|---|
| Commands (real.mjs, after the start) | 4 | 3 (plus the usage card) |
| Wrong turns | 0 | -- |

- The success path is: open the file, which draws it, then Data, then read Sources. She took the
  same three steps by another route: she dropped the file, then clicked "From friends.csv", which
  opens the same Data tab. The usage card (step 1) is outside the path.
- **Exploration (not counted as a wrong turn):** at step 4 (05.png) she clicked the "friends.csv"
  row to see whether it listed skipped rows. Nothing opened (problem 1). She was already done, so
  this cost one step and no progress.

## False "done"

None. In the debrief she said "Did I finish? Yes ... 20 people, 41 ties, and the sheet's 41 rows
all came in as 41 lines, so nothing was dropped". The last screen (05.png) shows "41 rows, 41
edges" under Sources and Nodes 20, Edges 41 in the Overview. The file confirms both: 41 rows and
20 people. The claim matches the screen and the data.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. Problem 1 was reproduced by
`rounds/round-3/repro/r3-s53/repro.sh`, which runs the session's route as a script. Its output is
in `run/` and `run.log`.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | build-defect | The single "friends.csv" row under Data > Sources is a selectable tree item. It takes a highlight on click and a focus ring by keyboard, but neither a click nor Enter does anything: no details, no table, no statement of rows read or skipped. In the app code, only the "nodes" and "edges" child rows of a source open a table, and a one-file source has no child rows. The user's natural "did anything get skipped?" click lands on a row that does nothing. | Step 4, 05.png (highlight only); transcript "Nothing else opened". Repro: `run/05.png` (click) and `run/06.png` (Enter), with the same Data place read before and after, on every run. |
| 2 | 2 | behavior | Nothing on the first screen after loading says whether rows were dropped. The Overview gives Nodes and Edges but no row count. The only route to "41 rows" is the "From friends.csv" link, which looks like a file name, not a way in. She clicked it "hoping, not knowing". There is no "all 41 rows read, 0 skipped" sentence anywhere, so she had to infer it from 41 = 41. Seen in one participant. | Step 2, 03.png; step 3, 04.png; debrief point 2. |
| 3 | 2 | wording | "Nodes" and "Edges" are not a first-time user's words. She worked out from the picture that nodes are the dots and edges are the lines. She would have said "people" and "connections". Seen in one participant. | Step 2, 03.png; debrief point 1. |
| 4 | 1 | behavior | The file was read as directed: arrows on every line and "Direction Directed" in the Overview. Nothing on screen says why, or how to change it. For a who-knows-whom list she did not know what an arrow meant, and she left it alone. It did not affect her counts. Seen in one participant. | Step 2, 03.png; debrief point 3. |
| 5 | 1 | wording | "41 rows, 41 edges" is small gray text, and in 04.png and 05.png it runs to the panel's right edge, where the focus outline touches the last letter. | 04.png, 05.png; repro `run/06.png`. |
| 6 | 0 | opinion | "Density 0.1079" means nothing to her ("no idea if that's a lot"). Held one level down as an opinion. | Step 2, 03.png; debrief point 4. |

**What worked:** dropping the file on the start page drew the graph at once, with no column
questions. The Overview counts were right and visible without a click. "From friends.csv" led
straight to the Sources row count that answers "was anything dropped?".
