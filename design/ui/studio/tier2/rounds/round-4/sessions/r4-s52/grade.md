# Grade: session r4-s52 -- Elena (tier 1 graduate), football team (T4 B), two spreadsheets as one network

**Grade: S** (success). Elena put both files in through the Data page's import screen as one
network. She read the report before loading. She opened the unmatched row: line 17, `s04 | s11 (no
node row) | 3` (`08.png`). She then chose "Add" rather than the default "Leave out". The answer key
accepts either choice when the participant says which row did not fit, and with "Add" it expects 11
nodes and 18 edges. After Load the Overview reads "From 2 files", Nodes 11, Edges 18, Directed,
Density 0.1636, Components 1, "Edges per node 1 to 4, mean 3.273" (`10.png`). The last screen
(`15.png`) shows the drawn graph "players and passes" with the edge s04 -> s11 selected: From s04,
To s11, passes 3. Her wrap-up names the row in full: "line 17 of passes.csv (Dina Moss, s04, to
's11', 3 passes), names a player who is not on the squad list". It also says what she did about it:
"I picked Add so the pass would not go missing. s11 arrives with only its code".

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty, no setup. Tool commit `435e878a1d4c`, no uncommitted
changes.

## The answer against the key

- **Both files in (right).** `09.png`: Tables list "Nodes: players.csv / 10 rows" and "Edges:
  passes.csv / 18 rows", both with green checks. Heading "players and passes: 11 nodes, 18 edges".
  Summary: "10 node rows and 18 edge rows read; the load makes 11 nodes and 18 edges."
- **Counts (right for the choice made).** Before Add: "10 nodes, 17 edges" and "18 rows, 1 left
  out" with the warning triangle (`07.png`), as the key says. After Add and Load: 11 and 18
  (`10.png`), the key's "Add" values. Elena compared the import page's promise with the Overview
  and found that they agree.
- **Unmatched row named (right).** Line 17, from s04 (Dina Moss, confirmed on screen in `14.png`),
  to s11, 3 passes. The key accepts either the id or the looked-up name.
- **Drawn (right).** `10.png` shows 11 spheres with arrowheads, one component. The grader counted
  11.
- **Attributes checked (beyond the task).** Dina's node shows name Dina Moss, position Defender,
  Degree 4 (`14.png`). The s04 -> s11 edge shows passes 3 (`15.png`).
- **Work kept.** `work.json` end: one source "players.csv and passes.csv", the two default layers,
  no runs, notes or steps. Nothing gone.

## Measures

- **Steps:** 14 `real.mjs` steps after the start (`02.png` to `15.png`). The success path is 7 to
  load. The extra steps were a hover on the "+" and checks after Load: finding s11 and Dina through
  the find box, and opening the s04 -> s11 edge.
- **Found "Add a table":** yes, by hovering the "+" (`05.png`, tooltip "Add a table"). Elena
  expected the "+" to open the file window directly. Instead it opened the File... / From a URL... /
  Paste... menu (`06.png`), and the tool reported that nothing was uploaded. The next step used
  "File...". This is the app's designed path, not a wrong turn.
- **Read which of Add and Leave out was chosen:** correctly. Step 7 reads "Leave out appears
  chosen". Elena did not misread the drawing of the two buttons, which the key asks graders to
  watch.
- **Clicked "10 node rows" / "18 edge rows":** no.
- **Wrong turns:** 0.
- **False "done":** none. "All 10 players and all 18 passes are in one drawn network: Nodes 11,
  Edges 18 (the 10 squad players plus s11)" holds for the "Add" choice on `10.png`. She said that
  s11 is a code-only node made for the missing player, so the claim does not hide the mismatch.
  truth-on-screen holds.
- **Data page Sources:** not visited. It was not needed: Elena found and named the row on the
  import page before Load.
- **Stopped to set the weight or put names on:** no. She noticed that the dots have no names and
  used the find box instead. She did not try to set a label.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot. The "Add a table" upload
  that opened a menu rather than a file chooser is what a person would see. `leaks.json` shows no
  leaks over 34 calls.

## Problems

1. **The 3D drawing's perspective made the added, one-pass node look the most important (severity
   2).** In the default 3D view, s11 is drawn as the largest sphere, near the middle of the drawing
   (`10.png`, at about x 632, y 432). It looks larger because it is nearer the camera, and nothing
   on screen says that sphere size means depth, not a value. Elena took it for "our best passer"
   until she selected it and saw Degree 1 (`12.png`). She recovered by clicking, so the task was
   not affected. A reader who does not click keeps the wrong reading. One session so far.
2. **No labels on the nodes (severity 1).** Names come in as an attribute, not as the label, so the
   drawing shows unlabeled spheres (`10.png`). Elena had to use the find box to locate anyone. This
   was already known (answer key, "Note").
3. **"Degree" is not explained (severity 1).** Elena guessed that "Degree 4" on Dina's inspector
   counts her lines, and was unsure (`14.png`). Nothing on the inspector says what it counts.
4. **The "+" beside Tables opens a menu, not a file chooser (severity 1).** A returning user expected
   one click to open the file window (`06.png`). Elena understood it at once. It is recorded because
   the key asks for it; it was not a wrong turn.
