# Grade: session r5-s41b -- Tom (tier 1 graduate), running club (T21 A), the list was updated

**Grade: S** (success). The last screen (`12.png`) matches the answer key's A end state: the left
panel reads "Graph friends-v2.csv" with the PageRank row (20) and no out-of-date mark; the
inspector's PageRank Values show "ran Oct 11, 10:38:26 AM", "20 of 20 have a value, 0.02872 to
0.08012", and a Top 10 starting Ava 0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141 -- the key's
new top four; the drawing's key reads 0.02872 to 0.08012 with no "out of date" in its titles; the
edges table reads "41 edges". Tom answered "before, Farah was first, 0.06394; now Ava is first,
0.08012, and Farah is second, 0.06556". Both names are right, and the "before" name was read from
the Values before the replacement (`02.png`), so it is not a stale read.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900, no uncommitted tool changes. Start: the friends-ranked setup (friends.csv
loaded, PageRank run, nodes sized and colored by PageRank).

## The answer against the key

- **First before (right).** Farah 0.06394, read from the Values' Top 10 at the start (`02.png`).
- **First now (right).** Ava 0.08012, read after Rerun, with the run time changed from 10:36:49 AM
  to 10:38:26 AM (`10.png`, `12.png`).
- **Replaced, not added (right).** The Replace page read "Replace: friends-v2.csv", "Was 20 nodes,
  41 edges; now 20, 41" (`07.png`); after Replace the left panel names friends-v2.csv and the
  edges table shows the new weights (Ava -> Chloe 1). `work.json` lists friends.csv under "gone" in
  sources, which the key says is the replacement itself, not `work-lost`.
- **Work kept (right).** `work.json`: the PageRank run (label Influence) and all three layers
  (Node defaults, Edge defaults, Influence) are the same at start and end; no notes or steps at
  either end.
- **Route.** The source inspector's "..." route the key calls the success path: Values, Data, a
  left click on the friends.csv Sources row, "Source actions", "Replace with file..." with
  friends-v2.csv, Replace, the PageRank row, Rerun. He then saved the project (not asked for).

## Measures

- **Steps:** 9 `real.mjs` steps to the rerun (the key's walked count for this route is 8), plus 2
  for the save. The extra step is the main-menu look in step 2.
- **Wrong turns:** 1. He opened the main menu looking for a way to bring in a newer list, found
  only "Open project or file...", judged correctly that it would start over, and closed it with
  Escape without acting (`03.png`). No work was undone; this is not a detour in the key's sense
  (no addition undone, no new project), so it does not lower the grade.
- **False "done":** none. Every claim in his end summary is true on `10.png` and `12.png`
  (truth-on-screen holds), and he checked the time had changed before reading the new top name.
- **Stale read:** none. Between Replace and Rerun (`09.png`) the old Top 10 (Farah first) stayed on
  screen at full contrast; Tom said "the top ten below is still the old one" and reran first.
- **Read a moved drawing as lost work:** no. Read the blue or the out-of-date legend wrongly: no;
  he read "out of date" as "the ranking is still there".
- **"Higher means":** left at "Not set" (the key: nothing there needs choosing). He did not use
  "closer" as a reason; at the end he quoted the run's "assumed a higher weight means closer" as
  "fine", which the key asks graders to record.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Twelve screenshots for the start and eleven steps;
  `leaks.json` shows no leaks over 27 calls; the setup log shows the file chooser answered.
- **Scripted exit:** not applicable; Tom finished.

## Problems

| #   | Severity | Kind             | Problem                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                                                                     |
| --- | -------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 2        | discoverability  | Bringing in a newer version of an open file has no entry in the main menu; its only homes are the Sources row's right-click menu and the source inspector's "..." (two levels into the Data place). Tom looked in the main menu first and said he would not have found it in a hurry.                    | `03.png` (main menu: New project, Open project or file..., Open sample, Save, Save as..., Export..., Rename, Settings, Help); `05.png`, `06.png`; transcript "What confused me" |
| 2   | 2        | trust            | The Replace page says nothing about what happens to the work on the old file (the run, its styling). Tom, who "never" presses Replace, pressed it on the strength of the task alone and learned only afterward that the ranking survived.                                                                   | `07.png` (title, counts, table, Higher means, Cancel / Replace; no line about runs or layers); transcript steps 5-6 and "What confused me"                   |
| 3   | 1        | stale-display    | Between Replace and Rerun the inspector's Distribution, "20 of 20 have a value" with the old range, and the old Top 10 stay at full contrast with no out-of-date mark on them; only the bar above and the legend's titles say so. Tom was not misled, but a reader who reads the list first would be.     | `09.png` (bar "Data changed since this run", Top 10 Farah 0.06394 unmarked)                                                                                  |
| 4   | 1        | comprehension    | "Higher means: Not set / Closer / Farther / Capacity" is a question Tom cannot answer; he left it alone. No effect on the result, since PageRank assumes "closer" and the run says so.                                                                                                                     | `07.png`; `12.png` Made with "Its meaning was not set, so this run assumed a higher weight means closer"; transcript step 6                                   |
| 5   | 0        | study setup      | Save opened "Save friends as" with a name field, which surprised Tom because his briefing says the work was saved last month. The setup builds the project fresh with "New from data..." and never saves it, so the dialog is right for this state; the mismatch is the study's, not the app's.            | `11.png`; `session.json` setup (no save); transcript step 10                                                                                                 |

Problem 3 is the trap the answer key already describes for both halves of T21.
