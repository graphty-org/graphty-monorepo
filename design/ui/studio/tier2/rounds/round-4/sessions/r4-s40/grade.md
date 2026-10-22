# Grade: session r4-s40 -- Alex (regular analyst), team (T21 B), the list was updated

**Grade: S** (success). Every part of the task is met on the last screen (`07.png`): the graph is
"Graph team-v2.csv", the PageRank row reads 14, the run was rerun (Ran Oct 11, 3:33:59 AM, where
the run before the replacement read 3:33:03 AM), the "Data changed since this run" bar is gone,
the key reads 0.02333 to 0.1339 with no "out of date" in its titles, and the Values read "14 of 14
have a value" with the Top 10 starting "Di 0.1339", then Hal 0.1305, Ed 0.1245. Alex's answer
names 14 people now (was 12), Hal first before (0.1293, read from the Values before the
replacement, `02.png`) and Di first now (0.1339), all as the key. No detour: the right-click route
in 6 steps, the key's success path.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `team-ranked.txt` (team.csv loaded, PageRank run, sized and
colored by PageRank). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **First before (right).** `02.png`: Top 10 "Hal 0.1293", "12 of 12 have a value". Read before
  anything was replaced.
- **Replaced, not added (right).** `05.png`: "Replace: team-v2.csv", "Was 12 nodes, 16 edges; now
  14, 21"; the confirm was "Replace". `work.json`: team.csv under "gone", team-v2.csv the only
  source; that is the replacement the task asks for, not lost work.
- **Rerun (right).** `06.png` shows the out-of-date state (bar with Rerun, history icon on the row,
  row still 12, key titles "out of date", old range 0.03273 to 0.1293, old Top 10 with Hal first,
  two blue dots for the new people); `07.png` after Rerun as above.
- **Team size now (right).** 14 (row 14, "14 of 14 have a value").
- **First now (right).** Di 0.1339, Hal second 0.1305, as the key.
- **Work kept.** `work.json`: the run and all three layers (Node defaults, Edge defaults,
  Influence) are the same at start and end; no notes or steps existed.

## Measures

- **Route:** Values; Data; right-click on the team.csv source row; Replace with file... plus the
  upload; Replace; Rerun.
- **Steps:** 6 `real.mjs` steps after the start (`02.png` to `07.png`), the key's count for this
  route.
- **Wrong turns:** 0.
- **stale-read:** none. In the out-of-date state (`06.png`) Alex did not read the old Top 10 as
  the new list; he went straight to Rerun ("it told me instead of quietly showing old numbers").
- **False "done":** none. Every end claim ("14 people", "Hal was first before", "Di is first now",
  "Same layer, same colors") is true on `07.png` and in `work.json`. truth-on-screen: holds. His
  remark that he "assume[s] it kept it" about saving is stated as an assumption, not a claim.
- **Blue dots read as highlight or selection:** no. Alex read them as the two new people with no
  PageRank value yet, which is right.
- **Moved drawing read as lost work:** no. The drawing was laid out again (`06.png` against
  `02.png`); Alex did not remark on it.
- **Quoted "closer" as a reason:** yes. On the Replace page Alex left "Higher means" at "Not set",
  citing the note that PageRank reads it as closer by default, to keep the rerun like last time.
  The key asks for this to be recorded; nothing there needed choosing, so it is not a deviation.
- **Stopped on "Weight: weight auto":** no; he paused on the "Not set" choice, not the weight line.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the upload was answered
  (`setup.log`), and `leaks.json` shows no leaks over 21 calls.
- **Scripted exit:** not applicable; Alex finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                         | Evidence                                                                                                                                                                                  |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Replacing the data has no visible control: at rest the Data page's source row shows no button or "...", so the replace is found only by a right-click (or the source inspector's "..."). Alex found it on the first try only because another tool had taught him to right-click, and named it the main difficulty. | `03.png` (source row with no control), `04.png` (right-click menu); transcript end: "Nothing on the Data panel says 'replace' until you right-click the source row"                         |
| 2   | 2        | trust           | Between Replace and Rerun the inspector keeps the old Top 10 (Hal first), histogram and "12 of 12 have a value" at full contrast with nothing on them marking them out of date; only the bar above, the row's wordless history icon and the key's titles say so. Alex went straight to Rerun, so it did not cost the task here. | `06.png`                                                                                                                                                                                  |
| 3   | 1        | visual          | After Replace the two new people are drawn as small saturated blue dots unlike every other node, and the key does not explain them. Alex guessed their meaning correctly ("I guess those are Mo and Nia, no PageRank value yet").                                                                  | `06.png`; transcript step 6                                                                                                                                                               |
| 4   | 1        | wording         | The Replace page asks what a higher weight means with "Not set" chosen; Alex paused to check it would read the weights the same way as the old run and needed the run's "read as closer" note to confirm.                                                                                       | `05.png` ("Higher means: Not set" and the line under it); transcript end: "The weight 'Not set' choice in the replace dialog made me pause a second"                                       |
| 5   | 1        | trust           | Nothing on screen says whether the replaced project was saved: the top bar reads "Local only" with no saved or unsaved mark, so Alex could only assume his work was kept.                                                                                                                        | `07.png` (top bar "Local only"); transcript end: "I did not see whether it saved on its own ... so I assume it kept it"                                                                     |

All five rest on one participant and are not confirmed by this session alone.
