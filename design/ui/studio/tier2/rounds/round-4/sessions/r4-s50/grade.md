# Grade: session r4-s50 -- Dana (regular analyst), football team (T4 B), two spreadsheets as one network

**Grade: S** (success). Both files went in as one network, the counts are stated, and the
unmatched row is named. Dana added players.csv, then passes.csv through the "+" beside Tables,
read the summary ("1 edge row names a node missing from the node rows"), opened the unmatched row
(line 17, `s04`, `s11 (no node row)`, 3; `05.png`), chose "Add" and loaded. The last screenshot
(`10.png`) shows the graph "players and passes", Overview Nodes 11, Edges 18, Components 1,
"From 2 files", and the edge table "18 edges" under the drawing. The key: "With 'Add': 11 and 18"
and "either choice is correct if the participant says which row did not fit". Dana said it in the
debrief: "passes.csv has a pass to s11, who isn't in players.csv. I chose Add, so s11 is in the
network with no name and no position", and the transcript names line 17, s04 -> s11, 3 passes.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty, no setup. Tool commit `435e878a1d4c`, no uncommitted
changes.

## The answer against the key

- **Counts (right for Add).** Import page after Add (`06.png`): "players and passes: 11 nodes, 18
  edges", "10 node rows and 18 edge rows read; the load makes 11 nodes and 18 edges", Add drawn as
  the chosen side. After Load (`07.png`, `10.png`): Nodes 11, Edges 18, Density 0.1636, "Edges per
  node 1 to 4, mean 3.273". Eleven spheres on the canvas (`07.png`), as Dana counted.
- **Unmatched row (named).** Line 17, from s04 to s11, 3 passes (`05.png`); the node table ends
  with s11 with a blank name and position (step 09, per the transcript), which Dana identified as
  the added node.
- **Edges (checked).** The Edges tab (`10.png`) reads "18 edges", the first rows s01 -> s02 11,
  s01 -> s03 9, s02 -> s03 6, s02 -> s05 14, as in the file.
- **Data page not visited.** Dana never opened the Sources list or the "1 row left out" row. With
  Add chosen nothing was left out, and the key does not require the Data page for S.
- **Work kept.** `work.json`: start empty (null); end holds one source "players.csv and
  passes.csv" and the two default style layers. Nothing gone.

## Measures

- **Route:** "Open project or file..." with players.csv (not the success path's "New from
  data..."). On this build that route also opened "Open as a new graph" with the file as the node
  table (`02.png`), not a straight load as the key's "Other routes" note says; from there the
  steps were the success path's. Grader note for the key, not a participant problem.
- **Found the "+" (Add a table):** yes, at once (step 03, `--click-at 271,107`). Dana said she
  found it "because I was looking for it".
- **Read Add as chosen:** yes, and correctly: the counts changed to 11 and 18 when Add was
  clicked (`06.png`), so the chosen-state drawing did not mislead here.
- **Clicked "10 node rows" / "18 edge rows":** no.
- **Steps:** 10 `real.mjs` steps after the start (`02.png` to `10.png` plus the end). The success
  path is about 8 to Load and the Data page; Dana's last three (Table, scroll, Edges tab) were
  checks after Load, not detours.
- **Wrong turns:** 0. Step 03 carried an `--upload` flag that did nothing because the click opened
  a menu, not a file picker; the click itself did what Dana meant.
- **False "done":** none. "Everything arrived" is true with Add: 11 nodes and 18 of 18 edge rows
  on `06.png`, `07.png` and `10.png`. truth-on-screen: holds.
- **Silent commit:** none. Add changed the heading, the summary line and the Tables list
  (`05.png` to `06.png`); Load drew the graph and filled the Overview (`07.png`).
- **Numbers that disagree:** none. Import page, Overview, node table and edge table agree (11,
  18).
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot and `leaks.json` shows
  no leaks over 25 calls.
- **Scripted exit:** not applicable; Dana finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                       | Evidence                                                                                                                                 |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | feedback        | After "Add" is chosen, the unmatched row still shows the red-orange warning triangle and "s11 (no node row)", and the caption still reads "1 unmatched row: s11 has no node row", so the row looks unresolved while the counts say it is added. Dana "wasn't sure for a second that Add had taken". | `06.png` (row 17 still red with the triangle; heading 11 nodes, 18 edges; passes.csv green check); transcript step 06 and debrief           |
| 2   | 1        | legibility      | The drawing shows no names, so the participant could not tell which sphere is which player or which one is s11, and the edge table lists ids (s01, s02) rather than names; Dana had to cross-reference the node table. Outside the task.         | `07.png`, `10.png`; transcript step 07 ("no names drawn on the dots") and step 10 ("back to cross-referencing like a VLOOKUP")             |
| 3   | 1        | wording         | "Weight: none (each edge counts 1)" with the passes column kept as an Attribute, and nothing on the import page saying how to make it the weight. Dana noticed and would want to know for a later ranking. Opinion, held one level down; outside the task. | `04.png`, `06.png` ("Weight: none (each edge counts 1)", passes = Attribute); transcript step 06 and debrief                              |
| 4   | 1        | discoverability | The "Add a table" control is a small gray "+" beside "Tables" with no words; Dana found it only because her history told her to look for it. Opinion from a participant briefed to expect it, held one level down.                                    | `02.png` ("+" at about x 271, y 107); debrief: "I found it because I was looking for it"                                                 |

Problems 1 to 4 rest on one participant and are not confirmed by this session alone.
