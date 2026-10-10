# Grade: session r2-s35 -- Dana (regular analyst), running club (T21 A), the list was updated

**Grade: S** (success). The last screen (`09.png`) shows the PageRank run redone on the new file:
the header reads "Graph friends-v2.csv", the run's subtitle "Measure ran Oct 9, 8:33:50 PM", the
key 0.02872 to 0.08012 with no "out of date" mark, and the Values' Top 10 starts "Ava 0.08012",
then Farah 0.06556, Hana 0.06428, Ivan 0.06141. The name before was read from the Values before
the replacement (`02.png`, Top 10 "Farah 0.06394"). Dana reported both names right: Farah first
before, Ava first now. The file was replaced, not added beside the old one (`06.png` "Replace:
friends-v2.csv", "Was 20 nodes, 41 edges; now 20, 41"), and the run was rerun. No detour.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup friends-ranked (friends.csv, PageRank run, dots sized and colored by
it).

## The answer against the key

- **First before (right).** `02.png`: Top 10 "Farah 0.06394", read before anything was replaced.
- **First now (right).** `09.png`: Top 10 "Ava 0.08012", after Rerun, with the run's time changed
  from 8:31:36 PM (`08.png`) to 8:33:50 PM.
- **Not a trap.** Not `stale-read`: Dana saw the old Top 10 under "Data changed since this run" in
  `08.png`, called it "still last month's" and did not report it. Not `added-not-replaced`: the
  replace page and `work.json` show one source, friends-v2.csv, with friends.csv under "gone".
- **work.json.** The run and all three style layers are the same at start and end; the only change
  is the source swap the task asks for. Not `work-lost`.

## Measures

- **Steps:** 8 after the start (`02.png` to `09.png`): Values, Data, the friends.csv row (left
  click), the source inspector's "..." menu, Replace with file... with the upload, Replace,
  PageRank, Rerun. This is the round 2 inspector-menu route the key gives as 8 steps, graded as the
  success path. Against the right-click route (6) it is about 1.3x.
- **Wrong turns:** 0. Each move went forward; the left click on the Sources row is the round 2
  route.
- **First move:** the run's Values (named in her history), then the Data place (named in her
  history). Both led on to the task. No broken habit.
- **False "done":** none. "I'm done" (`09.png`) is true: the new ranking is on screen and current.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. Replace changed the header to "Graph friends-v2.csv", the
  table's Ava-Chloe weight to 1 and the key titles to "out of date" (`07.png`); Rerun changed the
  key range, the Top 10 and the run's time (`09.png`).
- **Numbers that disagree (bar 5):** none counted. Between Replace and Rerun the old range and the
  old Top 10 stayed on screen, but each carried an out-of-date mark where she read it: the key's
  titles "PageRank, out of date" (`07.png`) and the "Data changed since this run" bar above the
  Values (`08.png`). Problem 4 records that the Top 10 itself is unmarked.
- **Wrong weight reading without a sign (bar 7b):** no. The weight's meaning was left "Not set" as
  on the earlier load, and Made with says "weight (read as closer)" with the line "Its meaning was
  not set, so this run assumed a higher weight means closer" (`09.png`).
- **Quoted "closer" as a reason:** yes. At `06.png` she read the line under "Higher means" ("until
  I choose, PageRank reads higher as closer") and left it Not set to keep the two months
  comparable.
- **Positions after Replace:** the people are the same; the drawing kept its shape and was drawn
  smaller and shifted (`02.png` against `07.png`). She did not read it as lost work.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; setup.log shows the
  file chooser answered.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                  | Evidence                                                                                                                         |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The Sources row shows no control at rest that says the file can be replaced; "Replace with file..." is found only by opening the source and then its "..." menu. Dana called it "three clicks of guessing".                                                                | `03.png` (row with no "..." at rest), `04.png`, `05.png`; transcript end: "Nothing on the Sources row itself says it can be replaced" |
| 2   | 2        | user need       | Rerun overwrites the earlier run's values; nothing keeps last month's Top 10 beside the new one. Dana kept the "before" only because she wrote it down first; her quarterly comparison needs before and after side by side.                                                | `08.png` against `09.png`; transcript end: "if I hadn't I'd have lost the 'before' number"                                       |
| 3   | 2        | discoverability | After a replacement made from the source's inspector, the right panel shows the Graph overview with no Rerun on screen; the PageRank row's only sign is a history icon with no words. She found Rerun only by clicking the row.                                            | `07.png` (Graph inspector, icon on the PageRank row); transcript end: "The little clock icon ... didn't say anything by itself"    |
| 4   | 1        | trust           | Between Replace and Rerun the run's histogram, "20 of 20 have a value" with the old range and the old Top 10 stay at full contrast with no mark of their own; only the bar above them says the data changed. Dana read it correctly.                                       | `08.png`; transcript step 8: "The Top 10 underneath is still last month's"                                                       |
| 5   | 1        | comprehension   | "Higher means: Not set" on the replace page left her unsure whether leaving it would change the numbers; the one line under it settled it.                                                                                                                               | `06.png`; transcript end: "I wasn't sure whether leaving it would change the numbers"                                            |
| 6   | 0        | layout          | The left click on the Sources row also opened the table drawer along the bottom, which pushed the drawing and its toolbar up and stayed open to the end. She did not remark on it.                                                                                       | `04.png` to `09.png`                                                                                                              |

No severity 3 or 4: both names were right, the earlier work was kept, and every out-of-date value
she saw carried a mark she read correctly.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
