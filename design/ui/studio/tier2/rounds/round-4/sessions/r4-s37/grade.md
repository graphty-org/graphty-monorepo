# Grade: session r4-s37 -- Dev (tier 1 graduate), running club (T21 A), the list was updated

**Grade: S** (success). Every part of the task is met on the last screen (`09.png`): the graph is
"Graph friends-v2.csv", the PageRank run was rerun (Ran Oct 11, 3:32:26 AM, where the run before
the replacement read 3:31:10 AM), the "Data changed since this run" bar is gone, the key reads
0.02872 to 0.08012 with no "out of date" in its titles, and the Values' Top 10 starts "Ava
0.08012", then Farah 0.06556, Hana 0.06428, Ivan 0.06141, the key's values. Dev's answer names
Farah first before (0.06394, read from the Values before the replacement, `02.png`) and Ava first
now (0.08012), both right. No detour: Dev took the source inspector's "..." route, which the answer
key grades as the success path.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (friends.csv loaded, PageRank run,
sized and colored by PageRank, the run's inspector open on Style). Tool commit `435e878a1d4c`, no
uncommitted changes.

## The answer against the key

- **First before (right).** `02.png`: Top 10 "Farah 0.06394". Read before anything was replaced.
- **Replaced, not added (right).** `06.png`: "Replace: friends-v2.csv", "Was 20 nodes, 41 edges;
  now 20, 41"; the confirm was "Replace". `work.json`: friends.csv under "gone", friends-v2.csv the
  only source; that is the replacement the task asks for, not lost work.
- **Rerun (right).** `08.png` shows the out-of-date state (bar with Rerun, history icon on the
  row, key titles "out of date", old range 0.03779 to 0.06394, old Top 10 with Farah first);
  `09.png` after Rerun as above. Still 20 people and 41 ties.
- **First now (right).** Ava 0.08012, Farah second 0.06556, as the key.
- **Work kept.** `work.json`: the run and all three layers (Node defaults, Edge defaults,
  Influence) are the same at start and end; no notes or steps existed.

## Measures

- **Route:** Values; Data; left click on the friends.csv source; "Source actions" ("..."); Replace
  with file... plus the upload; Replace; click the PageRank row; Rerun.
- **Steps:** 8 `real.mjs` steps after the start (`02.png` to `09.png`). The key's walked count for
  this route is 8 (two more than the right-click route's 6).
- **Wrong turns:** 0.
- **stale-read:** none. In the out-of-date state (`08.png`) Dev saw the old Top 10 ("Top 10 still
  shows the old numbers (Farah 0.06394)") and did not report it as the new list.
- **False "done":** none. "I'm done" (step 9) and the end claims are all true on `09.png`.
  truth-on-screen: holds.
- **Silent commit:** none. Replace switched the graph title, the table and the key's titles
  (`07.png`); Rerun changed the time, the key and the Top 10 (`09.png`).
- **Numbers that disagree:** none.
- **Quoted "closer" as a reason:** yes. On the Replace page Dev left "Higher means" at "Not set",
  citing the line that "until I choose, PageRank reads higher as closer", to keep the rerun
  comparable with the old one. The key asks for this to be recorded; nothing there needed
  choosing, so it is not a deviation.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the upload was answered
  (`setup.log`), and `leaks.json` shows no leaks over 23 calls.
- **Scripted exit:** not applicable; Dev finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                           | Evidence                                                                                                                                                                       |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 2        | discoverability | Replacing the data is reached only through the Data page and a "..." menu on the source's inspector (or the row's right-click); nothing on the Graph page points there. Dev guessed right on the first try, but said so and named it as the main confusion.                                         | `03.png` to `05.png`; transcript end: "I had to guess that the source lives under Data and that 'Replace with file...' hides in the '...' menu"                                 |
| 2   | 2        | trust           | Between Replace and Rerun the inspector keeps the old Top 10, histogram and range at full contrast with nothing on them marking them out of date; only the bar above, the row's wordless history icon and the key's titles say so. Dev caught it, so it did not cost the task here.                 | `08.png` (Farah 0.06394 first under "Top 10", bar "Data changed since this run" above); transcript step 8                                                                     |
| 3   | 1        | visual          | After Replace the run stays out of date until opened, and the row's only sign is a small history icon with no words; Dev called it "easy to miss" and relied on the key's "out of date" title instead.                                                                                             | `07.png`, `08.png` (row icon); transcript end: "the small icon in the list was easy to miss, though the key saying 'out of date' helped"                                     |
| 4   | 1        | wording         | The Replace page asks what a higher weight means and leaves it "Not set" with a line saying PageRank reads it as closer; Dev kept it to match the old run but said neither he nor the app could tell what this month's numbers mean. The meaning is the user's to supply; the question costs doubt. | `06.png` ("Higher means: Not set", the line under it); transcript end: "I'm not sure what this month's numbers actually mean, and the program could not tell me either"      |

All four rest on one participant and are not confirmed by this session alone.
