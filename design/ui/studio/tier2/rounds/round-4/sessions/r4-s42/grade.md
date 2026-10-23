# Grade: session r4-s42 -- Tom (tier 1 graduate), team (T21 B), the list was updated

**Grade: S** (success). Every part of the task is met on the last screen (`09.png`): the graph is
"Graph team-v2.csv", the PageRank row reads 14, the run was rerun ("ran Oct 11, 3:35:07 AM",
where the run before the replacement read 3:33:47 AM), the "Data changed since this run" bar is
gone, the key reads 0.02333 to 0.1339 with no "out of date" in its titles, and the Values read "14
of 14 have a value" with the Top 10 starting "Di 0.1339", then Hal 0.1305, Ed 0.1245. Tom's answer
names 14 people now (was 12), Hal first before (0.1293, read from the Values before the
replacement, `03.png`) and Di first now (0.1339), all as the key. The route is the source
inspector's "..." route that the key walked in 8 steps and grades as the success path ("S when it
ends right with no detour"); Tom took it in exactly 8 steps.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `team-ranked.txt` (team.csv loaded, PageRank run, sized and
colored by PageRank). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **First before (right).** `03.png`: Top 10 "Hal 0.1293", "12 of 12 have a value". Read before
  anything was replaced.
- **Replaced, not added (right).** `06.png`: "Replace: team-v2.csv", "Was 12 nodes, 16 edges; now
  14, 21"; the confirm was "Replace". `work.json`: team.csv under "gone", team-v2.csv the only
  source; that is the replacement the task asks for, not lost work.
- **Rerun (right).** `08.png` shows the out-of-date state (bar with Rerun, history icon on the row,
  row still 12, key titles "out of date", old range 0.03273 to 0.1293, old Top 10 with Hal first,
  two blue dots); `09.png` after Rerun as above.
- **Team size now (right).** 14 (row 14, "14 of 14 have a value").
- **First now (right).** Di 0.1339, Hal second 0.1305, as the key.
- **Work kept.** `work.json`: the run and all three layers (Node defaults, Edge defaults,
  Influence) are the same at start and end; no notes or steps existed.

## Measures

- **Route:** Values; Data; left click on the team.csv source row (source inspector and the table
  drawer open); the inspector's "..." ("Source actions"); Replace with file... plus the upload;
  Replace; PageRank (the app had opened the Graph inspector, `07.png`); Rerun.
- **Steps:** 8 `real.mjs` steps after the start (`02.png` to `09.png`), the key's count for this
  route.
- **Wrong turns:** 0. Every click moved toward the task. The left click on the source row is the
  key's route, not a detour, though Tom found no replace control on it at first sight (`04.png`).
- **Broken habit:** none. The Data place, named in his history, offered the way on (through the
  source row and its "...").
- **stale-read:** none. In the out-of-date state (`08.png`) Tom said "The list underneath is still
  the old one (Hal first, 12 of 12)" and pressed Rerun; he did not read the old Top 10 as new.
- **False "done":** none. Every end claim ("The team has 14 people now", "Hal was first (0.1293)",
  "Di is first (0.1339) and Hal is second (0.1305)", "The 'out of date' is gone from the legend",
  "The two blue balls are brown now") is true on `09.png` and in `work.json`. truth-on-screen:
  holds. "I didn't lose my work" (step 7) is also true: the run and layers are kept.
- **Blue dots read as highlight or selection:** no. Tom read them as the two new people, not ranked
  yet ("I'd guess those are Mo and Nia"), which is right.
- **Moved drawing read as lost work:** no. The drawing was laid out again (`07.png` against
  `03.png`); Tom did not remark on it.
- **Quoted "closer" as a reason:** partly. On the Replace page (step 6) he left "Higher means" at
  "Not set" because "nobody set it last time"; in the debrief he added that "the old ranking said
  it 'assumed a higher weight means closer'", quoting the run's Made with note, not the Replace
  page's line. Nothing there needed choosing, so it is not a deviation.
- **"Added" heading on the source inspector read as the new file beside the old:** not seen. Tom
  did not return to the source inspector after Replace.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the upload was answered
  (`setup.log`: "chose the file team.csv" at setup; the team-v2.csv upload produced `06.png`), and
  `leaks.json` shows no leaks over 22 calls.
- **Scripted exit:** not applicable; Tom finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                                                                                                                  |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Replacing the data has no visible control on the Data page: the source row shows no button or "...". Tom needed three clicks (Data, the file name, then the inspector's "...") and found the "..." only because "it was the last thing left"; he said a right-click-only menu would have made him give up.                      | `03.png` (source row with no control, as in `02.png`), `04.png`, `05.png` (menu with "Edit source..." and "Replace with file..."); debrief: "Finding the replace took three clicks"                           |
| 2   | 2        | trust           | The confirm button reads only "Replace" and nothing on the Replace page says the ranking and styles will be kept; Tom pressed it only because "replace" was his manager's word, and learned afterwards that the work survived.                                                                                              | `06.png` (page with "Cancel" and "Replace", no word on kept work); debrief: "Nothing before I pressed it told me the ranking would survive"                                                               |
| 3   | 2        | trust           | Between Replace and Rerun the inspector keeps the old Top 10 (Hal first), histogram and "12 of 12 have a value" at full contrast with nothing on them marking them out of date; only the bar above, the row's wordless history icon and the key's titles say so. Tom noticed and went to Rerun, so it did not cost the task. | `08.png`                                                                                                                                                                                                  |
| 4   | 1        | visual          | After Replace the two new people are drawn as small saturated blue dots unlike every other node, and the key does not explain them. Tom guessed their meaning correctly and said so in the debrief.                                                                                                                         | `07.png`, `08.png`; debrief: "with nothing on the legend saying what blue means. I guessed 'not ranked yet'"                                                                                               |
| 5   | 1        | wording         | The Replace page asks "Higher means: Not set / Closer / Farther / Capacity"; Tom did not know what it meant for his data and could not tell for sure that leaving it matched the earlier run.                                                                                                                                 | `06.png`; debrief: "I don't know what that means for us and left it ... I couldn't tell for sure"                                                                                                        |
| 6   | 1        | navigation      | After Replace the app opened the Graph inspector (Overview, Nodes 14, Edges 21), not the run, so Rerun was not on screen; Tom had to click the PageRank row to find it. This route costs one step more than the right-click route, as the key records.                                                                       | `07.png` (Graph inspector, no Rerun), `08.png`                                                                                                                                                            |
| 7   | 1        | memory          | Nothing keeps the previous run's results after a rerun; to answer "who was first before", Tom had to think of writing it down before replacing. A user who did not would have lost that answer.                                                                                                                                | `09.png` (only the new Top 10); debrief: "After the rerun the old top list is gone; if I hadn't looked first I couldn't have answered that part"                                                          |

All seven rest on one participant and are not confirmed by this session alone. Problems 1, 3, 4 and
5 match ones recorded in session r4-s40 on the same task half.
