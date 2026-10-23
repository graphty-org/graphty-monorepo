# Grade: session r3-s50 -- Dev (returning), football team (T4 B), two spreadsheets as one network

**Grade: S** (success). Both files are in one network and the row that did not fit is named. The
last screen (`13.png`) shows the graph "players and passes", subtitle "From 2 files", and the
Overview reads Nodes 11, Edges 18, Directed, Density 0.1636, Components 1, "Edges per node 1 to
4, mean 3.273". The canvas holds 11 dots with arrows. Before loading, Dev opened the unmatched row
(`08.png`: line 17, `s04`, `s11 (no node row)`, `3`, under "1 unmatched row: s11 has no node row")
and chose "Add" (`09.png`: "the load makes 11 nodes and 18 edges", both tables with green checks).
The answer key accepts either choice when the participant names the row: "Choosing 'Add' instead
loads ... 11 and 18 ... either choice is correct if the participant says which row did not fit."
Dev named it in the session and the debrief: "line 17, s04 to s11 with 3 passes, and s11 is not
in players.csv". No detour.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty, no setup. Tool commit `acf3894e2c56`, no uncommitted
changes.

## The answer against the key

- **Counts (right for Add).** 10 players plus s11 = 11 nodes; all 18 pass rows = 18 edges.
  Density 18 / (11 x 10) = 0.1636 and mean 36 / 11 = 3.273 agree. I counted 11 dots in `13.png`,
  as Dev did.
- **Unmatched row (named).** Line 17, from s04 to s11, 3 passes; s11 has no row in players.csv
  (`07.png`, `08.png`). Dev did not look up s04's name (Dina Moss), and the key accepts the id.
- **End state checked.** The search for s11 (`11.png`) lists node s11 and edge "s04 -> s11". The
  search for June (`13.png`) lists s10 with "name: June Kaur", so the names arrived as an
  attribute. `work.json` agrees: one source, "players.csv and passes.csv", no runs, nothing gone.
- **Not a wrong answer.** Not `false-done` (with Add every row arrived, and Dev says why);
  not `never-found` (the "+" was found and both files went in); the counts are right.
- **Data page after Load.** Not visited. The key needs it only for a participant who loaded
  without reading the report. Dev read the report before Load, so this does not change the grade.

## Measures

- **Steps:** 12 `real.mjs` steps after the start (`02.png` to `13.png`), 11 that did something.
  The tool refused step 12 as "ambiguous". The success path for B is about 9 steps, including the
  Data page check. The extra steps were the stray hover (step 5), the Add choice (step 9), and
  the two searches that checked the result (steps 11 and 13). About 1.3x the success path. None
  of them was a detour away from the task.
- **Wrong turns:** 1, minor. In step 5 Dev hovered the first toolbar icon ("Main menu: open,
  save, export, settings", `05.png`) while looking for the "+" beside Tables. Dev saw the tooltip
  and went straight to the "+" in the next step. The refused step 12 was an aiming slip (Dev
  clicked by the text "s11", which several controls share) and does not count as a wrong turn.
- **False "done":** none. "That's everything: 11 dots (10 players plus s11), 18 passes, one
  connected group" matches `13.png`. truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **"+" found:** yes, on the first click aimed at it (`06.png`). Dev expected a file chooser
  and got a menu (File..., From a URL..., Paste...). The menu also covered the "Each row is"
  control.
- **Report links clicked:** "Show the 1 unmatched row" only. Dev did not click "10 node rows" or
  "18 edge rows", so the unmatched row view was never lost.
- **Stopped for names or weight:** no. Dev noticed "Weight: none (each edge counts 1)" and that
  names are not drawn on the dots, but set neither.
- **Silent commit:** none. Load drew the graph and the Overview gave the counts.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot, and leaks.json shows no
  leaks and no calls.
- **Scripted exit:** not applicable. Dev finished.
- **Tool note (not an app finding):** `12.png` and `13.png` are byte-identical (md5 `d90896b2...`).
  Both show the June search. The tool printed "ambiguous ... so the step did nothing" for step 12
  (`--click "s11" --key Control+a --type "June"`). The likely mechanism: only the click was
  refused, and the key and type parts still ran into the search box, which still had focus from
  step 11. So step 12 did change the screen, even though the tool said it did nothing. Step 13
  repeated the same input, so the end state is unaffected.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                               | Evidence                                                                                                                                       |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | default-choice  | When an edge row names a missing node, the choice starts on "Leave out", and Load is enabled. The only signs are a small "1 left out" in the Tables list, a warning triangle, and one line in the summary strip. A participant who has been told every row must arrive could press Load and lose a row before looking. Dev caught it only by reading the summary. | `07.png` (white fill on "Leave out", "the load makes 10 nodes and 17 edges"); debrief: "If I had clicked Load straight away, I would have lost a pass without noticing" |
| 2   | 1        | discoverability | The "Add a table" control is a bare "+" with no words, and it opens a menu rather than a file chooser. That cost one stray hover and one extra click. The open menu covers the "Each row is" control.                                                                                                                                      | `05.png` (stray hover on the main menu), `06.png` (menu over "Each row is"); transcript step 6: "Oh, it's a menu, not straight to the file"   |
| 3   | 1        | verification    | After Load, nothing on the canvas shows which dot is s11. Finding s11 in the search lists the node and its edge, but no dot is marked, and the dots have no labels, so Dev could check the players only by count and search, not on the drawing.                                                                                          | `11.png` (s11 selected in the list, nothing marked on the canvas); debrief: "nothing on the picture showed me which one it was"                    |
| 4   | 1        | comprehension   | "Weight: none (each edge counts 1)" sits right above the passes column, which comes in as an Attribute. Nothing on the page says whether the passes should be the weight, so Dev wondered whether the import was finished. It is not part of this task, and Dev did not change it.                                                          | `07.png`, `09.png`; debrief: "it made me wonder if I should have made passes the weight"                                                    |
| 5   | 0        | tool            | The tool reported step 12 as "ambiguous ... the step did nothing", but its screenshot shows the June search, byte-identical to step 13's. This is a fault in the study tool, not in the app. It did not affect the session's outcome.                                                                                                    | `12.png` = `13.png` (same md5); transcript step 12                                                                                             |
