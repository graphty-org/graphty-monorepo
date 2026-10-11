# Grade: session r5-s43b -- Jordan (regular analyst), running club (T21 A), the list was updated

**Grade: SD** (success with difficulty). The last screen (`11.png`) matches the answer key's A end
state after Rerun: the left panel reads "Graph friends-v2.csv" with the PageRank row at 20, the
inspector's subtitle reads "Measure ran Oct 11, 10:40:15 AM" with no "Data changed since this run"
bar, the Distribution line reads "20 of 20 have a value, 0.02872 to 0.08012", and the Top 10 starts
Ava 0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141. The drawing's key reads 0.02872 to 0.08012
for both Size and Color with no "out of date" in its titles. Jordan named Farah (0.06394) as first
before and Ava (0.08012) as first now -- both right. The grade is SD rather than S because the key
gives S on the source-inspector route only "when it ends right with no detour", and Jordan reached
it after two abandoned steps (below).

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of
the criteria, at 1440 x 900, with no uncommitted changes in the tool's checkout. The setup (load
friends.csv, run PageRank, size by PageRank) produced the expected start: one run, three layers,
one source (`work-start.json`, `01.png`).

## The answer against the key

- **First before (right).** Farah 0.06394, read from the Values tab's Top 10 before any change
  (`02.png`).
- **First now (right).** Ava 0.08012, read after Rerun (`11.png`). The rest of the new top five
  in the wrap-up also matches the screen (Farah 0.06556, Hana 0.06428, Ivan 0.06141, Ravi 0.05308).
- **Replaced, not added (right).** The Replace page reads "Replace: friends-v2.csv", "Was 20 nodes,
  41 edges; now 20, 41", confirm button "Replace" (`08.png`); afterwards the graph is titled
  friends-v2.csv. `work.json` lists friends.csv under "gone" in sources, which the key says is the
  replacement itself, not lost work: the PageRank run and all three layers (Node defaults, Edge
  defaults, Influence) are kept from start to end.
- **Stale-read trap (avoided).** Between Replace and Rerun the old Top 10 (Farah 0.06394 first) and
  the old range stay on screen at full contrast (`10.png`). Jordan read them as old ("the Top 10
  still shows the old numbers ... consistent with 'out of date'") and pressed Rerun before naming
  anyone.
- **"Closer" (recorded as the key asks).** On the Replace page Jordan left Higher means at "Not
  set" because "the old run said the same (read as closer)"; the reason is quoted from the old
  run's Made with ("weight (read as closer)", `02.png`), and the Replace page's own line under
  Higher means says the same (`08.png`). Nothing there needs choosing for this task.
- **Moved drawing (watch item).** The drawing keeps its shape and the camera zooms out slightly
  (`02.png` against `10.png`), as the key expects on A. Jordan did not read it as lost work.

## Measures

- **Route:** the source-inspector route of the key's round 2 note: Values, Data, left click on the
  friends.csv Sources row, the inspector's "..." (Source actions), "Replace with file..." with
  friends-v2.csv, Replace, PageRank, Rerun -- preceded by a detour through the Graph inspector.
- **Steps:** 10 `real.mjs` steps (plus `--end`; step 05 sent Escape and the Data click in one
  call), against the route's walked 8 and the right-click route's 6.
- **Wrong turns: 2.**
  1. Step 03: clicked "friends.csv" beside "Graph" at the top of the left panel, expecting the
     file's actions; it opened the Graph inspector ("From friends.csv", Nodes 20, Edges 41,
     `03.png`), which offers no replace.
  2. Step 04: opened that inspector's "..." (Graph actions): Re-run layout, Reshuffle layout seed,
     Add note (`04.png`); abandoned with Escape.
  Neither was a first move into a place Jordan's history names (the history names the start
  screen, the find box, the analysis button, a run's Values, the Style tab of Everything and the
  Export dialog), so neither counts as a broken habit.
- **First move:** `--click "Values"` to note the first name before changing anything.
- **Recovery:** yes; the session succeeded after both wrong turns.
- **False "done":** none. Every claim in the wrap-up (Farah 0.06394 before; Ava 0.08012 now, Farah
  second 0.06556; run and its color and size styling kept) is on screen in `02.png` and `11.png`,
  and `work.json` shows the run and all three layers kept. truth-on-screen holds.
- **Silent commit:** none. The Replace page showed the counts before the commit; Rerun changed the
  key's range and the node sizes (`10.png` against `11.png`).
- **Numbers that disagree with the drawing:** none after Rerun. Between Replace and Rerun the key
  shows the old range under titles marked "out of date" (`10.png`), as the key describes.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. 11 screenshots for the 11 steps; `leaks.json` shows no
  leaks over 24 calls; `setup.log` shows the setup's file chooser answered with friends.csv.
- **Scripted exit:** not applicable; Jordan finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                                                     | Evidence                                                                                              |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The file name beside "Graph" at the top of the left panel is the most visible place the source is named, and Jordan expected it to offer the file's actions; it opens the Graph inspector, whose "..." holds only layout actions and Add note. Replace is reachable only from the Data place (the Sources row's right-click, its hover "...", or its inspector's "..."). Two wrong turns. | `03.png`, `04.png`; transcript steps 02-04 and "What confused me" ("I'd expect the file name at the top to offer 'replace' directly") |
| 2   | 2        | discoverability | On the Data place the Sources row shows no button at rest, and its inspector hides Replace behind a "..." whose first item is "Edit source..."; Jordan counted "five clicks to find" it.                                                                                                                                                                                  | `05.png` (row with no button), `06.png`, `07.png` (menu); transcript step 07                          |
| 3   | 1        | feedback        | A left click on the Sources row also opens the table drawer along the bottom of the canvas, which pushes the drawing and its toolbar up and stays open through Replace and Rerun; Jordan did not ask for it.                                                                                                                                                                | `06.png` to `11.png`; transcript step 06 and "What confused me"                                       |
| 4   | 1        | comprehension   | The Replace page asks "Higher means: Not set" again with no sign of what the earlier run used; Jordan hesitated and kept it only because she remembered the old run's "read as closer".                                                                                                                                                                                     | `08.png`; transcript step 08 and "What confused me", last sentence                                    |
| 5   | 1        | feedback        | Between Replace and Rerun the old Top 10 and old Distribution stay at full contrast with nothing on them marking them out of date; only the bar above the tabs, the row's history icon and the key titles say so. Jordan was not misled.                                                                                                                                   | `10.png` (Top 10 Farah first under "Data changed since this run")                                    |
| 6   | 1        | navigation      | After a replacement made from the source's inspector the app returns to the Graph place with no run inspector open and no Rerun on screen; the PageRank row's only sign is a history icon with no words, so the participant must know to open the run. Jordan did, from the key's "out of date" title.                                                                    | `09.png`; transcript step 09                                                                          |
