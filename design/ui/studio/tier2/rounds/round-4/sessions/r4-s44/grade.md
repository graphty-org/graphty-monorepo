# Grade: session r4-s44 -- Jordan (regular analyst), team (T21 B), the list was updated

**Grade: S** (success). Every part of the task is met on the last screen (`07.png`): the graph is
"Graph team-v2.csv", the PageRank row reads 14, the run was rerun (Ran Oct 11, 3:36:05 AM, where
the run before the replacement read 3:35:08 AM), the "Data changed since this run" bar is gone,
the key reads 0.02333 to 0.1339 with no "out of date" in its titles, and the Values read "14 of 14
have a value" with the Top 10 starting "Di 0.1339", then Hal 0.1305, Ed 0.1245. Jordan's answer
names 14 people now (was 12), Hal first before (0.1293, read from the Values before the
replacement, `02.png`) and Di first now (0.1339), all as the key. No detour: the right-click route
in 6 steps, the key's success path.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `team-ranked.txt` (team.csv loaded, PageRank run, sized and
colored by PageRank). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **First before (right).** `02.png`: Top 10 "Hal 0.1293", then Ida 0.1224, Di 0.1177; "12 of 12
  have a value". Read before anything was replaced.
- **Replaced, not added (right).** Transcript step 5: "Replace: team-v2.csv", "Was 12 nodes, 16
  edges; now 14, 21"; the confirm was "Replace". `work.json`: team.csv under "gone", team-v2.csv
  the only source; that is the replacement the task asks for, not lost work.
- **Rerun (right).** `06.png` shows the out-of-date state (bar "Data changed since this run" with
  Rerun, history icon on the row, row still 12, key titles "out of date", old range 0.03273 to
  0.1293, old Top 10 with Hal first, two blue dots for the new people, drawing laid out again);
  `07.png` after Rerun as above.
- **Team size now (right).** 14 (row 14, "14 of 14 have a value"); Jordan also quotes 21 ties
  from the Replace page.
- **First now (right).** Di 0.1339, Hal second 0.1305, as the key.
- **Work kept.** `work.json`: the run and all three layers (Node defaults, Edge defaults,
  Influence) are the same at start and end; no notes or steps existed.

## Measures

- **Route:** Values; Data; right-click on the team.csv source row (`--rclick-at 140,141`);
  Replace with file... plus the upload; Replace; Rerun.
- **Steps:** 6 `real.mjs` steps after the start (`02.png` to `07.png`), the key's count for this
  route.
- **Wrong turns:** 0.
- **stale-read:** none. In the out-of-date state (`06.png`) Jordan noted "Old Top 10 still shows
  Hal first" as old, not as the answer, and went straight to Rerun.
- **False "done":** none. Every end claim (14 people, Hal first before, Di first now, Hal second,
  same settings) is true on `07.png` and in `work.json`. truth-on-screen: holds.
- **Blue dots read as highlight or selection:** no. Jordan read them as "the two new people (no
  score yet)", which is right.
- **Moved drawing read as lost work:** no; not remarked on.
- **Quoted "closer" as a reason:** yes. On the Replace page Jordan left "Higher means" at "Not
  set" because "the note says PageRank reads as closer -- same as the old run assumed", to keep
  the ranking comparable. The key asks for this to be recorded; nothing there needed choosing, so
  it is not a deviation.
- **Stopped on "Weight: weight auto":** no; the pause was on the "Not set" choice.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the upload was answered
  (`setup.log`), and `leaks.json` shows no leaks over 18 calls.
- **Scripted exit:** not applicable; Jordan finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                              | Evidence                                                                                                                                                       |
| --- | -------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Replacing the data has no visible control: at rest the Data page's source row shows no button or "...", so the replace is found only by a right-click. Jordan tried the right-click on a guess and said that otherwise he would have dragged the file in and probably ended up with two sources. | `03.png` (source row with no control), `04.png` (right-click menu); transcript end: "Replace wasn't visible until I right-clicked. There's no button on the Sources row" |
| 2   | 2        | missing feature | After Rerun nothing shows what changed in the ranking: no "was #1, now #2" and no way to keep the previous run beside the new one. Jordan had to remember the old leader and compare by eye, and the before/after change is the point of the task.                                     | `07.png` (only the new Top 10); transcript end: "After Rerun nothing tells me what moved ... compare by eye"                                                     |
| 3   | 1        | wording         | The Replace page asks what a higher weight means with "Not set" chosen; Jordan had to read the line under it to be sure leaving it would not change the ranking.                                                                                                      | `05.png` ("Higher means: Not set" and the line under it); transcript end: "I had to read the fine print to be sure leaving it alone wouldn't change my ranking"   |

Also seen, not counted as a problem in this session: between Replace and Rerun the inspector keeps
the old Top 10, histogram and "12 of 12 have a value" at full contrast (`06.png`), and the two new
people are drawn as saturated blue dots the key does not explain; Jordan read both correctly, so
neither cost anything here.

All three rest on one participant and are not confirmed by this session alone.
