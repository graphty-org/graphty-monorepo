# Grade: session r4-s39 -- Dana (regular analyst), running club (T21 A), the list was updated

**Grade: S** (success). Every part of the task is met on the last screen (`07.png`): the graph is
"Graph friends-v2.csv", the PageRank run was rerun (Ran Oct 11, 3:33:10 AM, where the run before
the replacement read 3:32:16 AM), the "Data changed since this run" bar is gone, the key reads
0.02872 to 0.08012 with no "out of date" in its titles, and the Values' Top 10 starts "Ava
0.08012", then Farah 0.06556, Hana 0.06428, Ivan 0.06141, the key's values. Dana's answer names
Farah first before (0.06394, read from the Values before the replacement, `02.png`) and Ava first
now (0.08012), both right. No detour: Dana took the Sources row's right-click menu, the answer
key's success path, in its 6 steps.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (friends.csv loaded, PageRank run,
sized and colored by PageRank). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **First before (right).** `02.png`: Top 10 "Farah 0.06394", Hana 0.05941, Milo 0.05648. Read
  before anything was replaced.
- **Replaced, not added (right).** `05.png`: "Replace: friends-v2.csv", "Was 20 nodes, 41 edges;
  now 20, 41"; the confirm was "Replace". `work.json`: friends.csv under "gone", friends-v2.csv the
  only source; that is the replacement the task asks for, not lost work.
- **Rerun (right).** `06.png` shows the out-of-date state (bar "Data changed since this run" with
  Rerun, history icon on the row, key titles "out of date", old range 0.03779 to 0.06394, old Top
  10 with Farah first); `07.png` after Rerun as above. Still 20 people and 41 ties.
- **First now (right).** Ava 0.08012, Farah second 0.06556, as the key.
- **Work kept.** `work.json`: the run and all three layers (Node defaults, Edge defaults,
  Influence) are the same at start and end; no notes or steps existed.

## Measures

- **Route:** Values; Data; right-click on the friends.csv source row; Replace with file... plus the
  upload; Replace; Rerun.
- **Steps:** 6 `real.mjs` steps after the start (`02.png` to `07.png`), the key's count for this
  route.
- **Wrong turns:** 0.
- **stale-read:** none. Dana went straight from the out-of-date state (`06.png`) to Rerun and read
  the top name only after it.
- **False "done":** none. Every claim at the end is true on `07.png`. truth-on-screen: holds.
- **Silent commit:** none. Replace switched the graph title, the key's titles and raised the bar
  (`06.png`); Rerun changed the time, the key and the Top 10 (`07.png`).
- **Numbers that disagree:** none.
- **Quoted "closer" as a reason:** yes. On the Replace page Dana left "Higher means" at "Not set"
  because "last month's run just assumed closer", so the two rankings are made the same way
  (transcript step 5). The key asks for this to be recorded; nothing there needed choosing, so it
  is not a deviation.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the upload was answered
  (`setup.log`), and `leaks.json` shows no leaks over 18 calls.
- **Scripted exit:** not applicable; Dana finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                          | Evidence                                                                                                                                                  |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Replacing the data has no visible control: the Sources row shows no button at rest, and the action lives only in its right-click menu (or a "..." that appears on hover or in the source's inspector). Dana found it only from a habit carried over from Excel. | `03.png` (row with no button); transcript end: "nothing on screen told me to right-click the source ... there is no visible button on the source row"     |
| 2   | 1        | wording         | The Replace page asks what a higher weight means and leaves it "Not set"; Dana kept it to match last month's run but could not tell whether "Not set" was right for her numbers. The meaning is the user's to supply; the question costs doubt.     | `05.png` ("Higher means: Not set", the line under it); transcript end: "I don't know if 'Not set' is the right answer for my numbers"                       |
| 3   | 1        | visual          | The Replace page's small gray labels ("Each row is", "text", "whole number") are hard to read for this participant.                                                                                                                             | `05.png`; transcript end: "The grey labels in that screen ... are small for my eyes"                                                                       |
| 4   | 1        | missing feature | There is no way on screen to put the before and after Top 10 side by side or take them out for a slide; Dana noted she would have to copy them by hand.                                                                                        | transcript end: "can I get the before/after Top 10 side by side into Excel for the slide?"                                                                 |

Also seen, not counted as a problem in this session: between Replace and Rerun the inspector keeps
the old Top 10, histogram and range at full contrast (`06.png`); Dana did not read from it, so it
cost nothing here. The "Local only" label left Dana unsure where the file goes (transcript end), a
question outside the task.

All four rest on one participant and are not confirmed by this session alone.
