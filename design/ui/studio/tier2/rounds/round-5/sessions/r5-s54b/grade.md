# Grade: session r5-s54b -- Dev (tier 1 graduate), football team (T4 B), two spreadsheets as one network

**Grade: S** (success). The last screen (`15.png`) shows the graph "players and passes" drawn
with arrows (header and inspector title), the inspector subtitle "From 2 files", and Overview
Nodes 11, Edges 18, Directed, Density 0.1636, Components 1, "Edges per node 1 to 4, mean 3.273".
The table under the drawing is on Edges, "18 edges", with From, To and passes. These are the key's
"Add" counts (11 and 18): Dev chose Add on the import page, which the key accepts when the
participant names the row that did not fit. Dev named it exactly: line 17 of passes.csv, s04 (Dina
Moss) passing 3 times to s11, who is not in players.csv, and said that s11 is therefore an extra
node with no name or position. Both files' rows are in, the counts are stated, and the unmatched
row is named.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty, as the task requires. Tool commit `753bae997bc6`, no
uncommitted changes.

## The answer against the key

- **Both files in (right).** `07.png`: the Tables list holds "Nodes: players.csv, 10 rows" and
  "Edges: passes.csv, 18 rows, 1 left out" with the warning triangle; the heading reads "players
  and passes: 10 nodes, 17 edges" and the summary "10 node rows and 18 edge rows read; the load
  makes 10 nodes and 17 edges. 1 edge row names a node missing from the node rows." -- the key's
  values before a choice.
- **Unmatched row (right).** `08.png`: "1 unmatched row: s11 has no node row", line 17, s04 to s11
  (no node row), 3. Found before Load, from the report, with no detour.
- **Add chosen (accepted).** `10.png` after Add: heading "players and passes: 11 nodes, 18 edges",
  passes.csv with a green check and "18 rows", summary "the load makes 11 nodes and 18 edges".
  Matches the key's "With Add: 11 and 18".
- **Counts (right).** `12.png` and `15.png`: Nodes 11, Edges 18, Components 1, "From 2 files".
  Dev also checked by name in the table (`13.png`, `14.png`): s01 Ana Torres to s10 June Kaur plus
  s11 with an empty name and position; and the edges with their pass counts (`15.png`).
- **Not in the key.** The key records B's after-Load values only for "Leave out" (Density 0.1889,
  "Edges per node 2 to 4, mean 3.4"). With Add this build shows Density 0.1636 and "Edges per node
  1 to 4, mean 3.273" (`12.png`, `15.png`); these agree with 11 nodes and 18 directed edges
  (18 / 110 = 0.1636) and should be added to the key for the Add branch.
- **Route note for the key.** Dev opened players.csv from "Open project or file..." on the start
  screen, not "New from data...". On this build that route opened the same "Open as a new graph"
  import page, with the "+" Add a table control (`03.png`), so it joined the success path at once.
  The key's "Other routes" entry, which says this route loads the first file straight in with no
  ties, does not describe this build and should be corrected.
- **Work kept.** `work.json`: one source, "players.csv and passes.csv", two default style layers,
  no runs, notes or steps; nothing gone.

## Measures

- **Route:** "Open project or file..." with players.csv, the "+" beside Tables, "File..." with
  passes.csv, "Show the 1 unmatched row", Add, "Show all rows", Load; then the Table view under the
  drawing to check names and passes. The Data page's Sources list and the left-out inspectors were
  never visited (not needed: the row had been added, not left out).
- **Steps:** 14 `real.mjs` steps after the start. The key's success path is about 8 to Load; the
  extra steps are checks (two hovers, "Show all rows", the table, its scroll and Edges tab) plus one
  wrong turn.
- **Wrong turns:** 2. Step 3, a hover on the first header icon looking for an add control ("Main
  menu", not wanted). Step 5, `--click "Add a table" --upload passes.csv` expected a file box and
  got a menu (File..., From a URL..., Paste...); recovered at once with "File...". Both cost one
  step each.
- **"Add a table" found:** yes, by its "+" and a hover tooltip (`05.png`); not a `never-found`.
- **Add / Leave out:** Dev hovered Add first (`09.png`, "Make a node for each missing name") and
  chose it knowingly; did not misread which was chosen.
- **False "done":** none. "Both sheets are in as one network ... 11 nodes and 18 edges, one piece.
  All 10 players arrived with their names and positions, and all 18 passes rows arrived" is true on
  `12.png` to `15.png`, and the s11 row is reported. truth-on-screen holds.
- **Silent commit:** none.
- **Numbers that disagree:** none.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Fifteen screenshots for fourteen steps plus the start;
  `leaks.json` shows no leaks over 31 calls.
- **Scripted exit:** not applicable; Dev finished.

## Problems

| #   | Severity | Kind         | Problem                                                                                                                                                                                                                                                                                   | Evidence                                                                                                         |
| --- | -------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | feedback     | After Add, the unmatched-row view still reads "1 unmatched row: s11 has no node row" with the red-orange warning triangle on s11, while the Tables list turns green and the counts change; the page contradicts itself about whether the row is still a problem. Dev doubted Add had worked. | `10.png` (caption and warning on line 17 beside a green check and "11 nodes, 18 edges"); transcript step 9 and "What confused me" |
| 2   | 1        | labeling     | Add and Leave out sit beside the summary sentence with no words on what each does to the row; the meaning shows only on hover.                                                                                                                                                            | `07.png`, `09.png` (tooltip "Make a node for each missing name"); transcript "What confused me"                 |
| 3   | 1        | affordance   | The bare "+" beside Tables opens a three-item menu, not a file box; Dev's first try expected the file box.                                                                                                                                                                                | `06.png` (menu File..., From a URL..., Paste...); transcript step 5                                               |
| 4   | 1        | visibility   | After Load the drawing shows no player names, so arrival by name can be checked only in the table under the drawing. Known on this build; did not affect the task.                                                                                                                        | `12.png` (11 unlabeled dots); `13.png`, `14.png` (names in the table); transcript step 11                       |
| 5   | 0        | understanding | The passes column is loaded as an attribute with "Weight: none (each edge counts 1)"; Dev was unsure whether it should be the weight but correctly left it, as the task does not need it.                                                                                                | `11.png`; transcript step 10 and "What confused me"                                                              |
