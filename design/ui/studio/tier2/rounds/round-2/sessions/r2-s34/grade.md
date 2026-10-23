# Grade: session r2-s34 -- Grace (returning), team (T21 B), the list was updated

**Grade: S** (success). The last screen (`09.png`) shows the PageRank run redone on the new file:
the left panel reads "Graph team-v2.csv", the PageRank row says 14, the run's subtitle "ran Oct 9,
8:39:04 PM" (it was 8:37:33 PM before, `02.png`), no "Data changed since this run" bar, the key
titles without "out of date" and the range 0.02333 to 0.1339, "14 of 14 have a value", and the
Top 10 starting Di 0.1339, Hal 0.1305, Ed 0.1245. Grace reported 14 people now, Hal first before
(0.1293, read from the Values before the replacement, `02.png`) and Di first now (0.1339). All
three match the key. She took the round 2 route through the source's inspector menu with no
detour.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `team-ranked.txt` (team.csv, one PageRank run, its Influence layer).

## The answer against the key

- **People now: 14 (right).** `07.png` Graph overview Nodes 14, Edges 21; `09.png` PageRank row 14
  and "14 of 14 have a value". The replace page said "Was 12 nodes, 16 edges; now 14, 21"
  (`06.png`).
- **First before: Hal (right).** `02.png`, Top 10 "Hal 0.1293", "12 of 12 have a value", read
  before anything was replaced.
- **First now: Di (right).** `09.png`, Top 10 "Di 0.1339", then Hal 0.1305 and Ed 0.1245, as the
  key gives.
- **Replaced, not added (right).** `06.png` "Replace: team-v2.csv"; `work.json` keeps the run and
  all three layers from start to end, with team.csv under "gone" and team-v2.csv in its place --
  the replacement the task asks for, not `work-lost`.
- **Not a trap.** Not `stale-read`: at `08.png` she saw the old Top 10 (Hal first) under "Data
  changed since this run" and took it as the "before", not the answer. Not `added-not-replaced`:
  she chose "Replace with file...", not "Edit source...".

## Measures

- **Steps:** 8 `real.mjs` steps after the start (`02.png` to `09.png`): Values, Data, the
  team.csv row (left click), the source inspector's "..." (by position, `--click-at 1419,73`),
  Replace with file... with the upload, Replace, PageRank, Rerun. This is the round 2
  inspector-menu route the key walks as 8 steps; graded as the success path.
- **Wrong turns:** 0. Every move went forward.
- **First move:** the run's Values, the place her history names for reading the top people.
  Worked. No broken habit.
- **False "done":** none. "That's everything I was asked for" (`09.png`) is true: replaced,
  rerun, and all three answers on screen and current. truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. Replace returned to the map with the key titles "PageRank, out
  of date", the run row's history icon and Nodes 14 / Edges 21 (`07.png`); Rerun changed the key
  range, the Top 10, the row count and the time (`09.png`).
- **Numbers that disagree (bar 5):** none on the final screen. Between Replace and Rerun the
  histogram, "12 of 12 have a value, 0.03273 to 0.1293" and the old Top 10 stayed at full contrast
  beside a row that still said 12 while the graph had 14 nodes (`07.png`, `08.png`); the "Data
  changed since this run" bar and the key's "out of date" titles marked them, and she read them
  as old.
- **Wrong weight reading without a sign (bar 7b):** no. Both runs' Made with say "weight (read as
  closer)" and "Its meaning was not set, so this run assumed a higher weight means closer"
  (`02.png`, `09.png`).
- **Quoted "closer" as a reason:** yes. At `06.png` she read the line under "Higher means"
  ("PageRank reads it as closer until I choose") and left "Not set" to keep before and after
  comparable.
- **Blue dots read as a highlight or selection:** no. She read the two blue dots (`07.png`) as
  "because they have no number yet" -- a correct guess, but a guess; nothing on screen said so.
- **Moved drawing:** the replacement laid the drawing out again (`02.png` against `07.png`). She
  did not remark on it and did not read it as lost work.
- **"Added" heading:** not seen. She did not return to the source's inspector after the
  replacement.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; setup.log shows the file
  chooser answered.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                       | Evidence                                                                                                                                       |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The only way to swap the file is under an unlabeled "..." in the source's inspector (or the Sources row's hover or right-click menu), reached only after opening Data and the file. Nothing on the main screen offers a newer version of the file. Grace said it "took a guess" and that she might otherwise have tried "Open project or file". | `03.png` (Sources row with no "..." at rest), `04.png`, `05.png`; transcript end: "Getting to 'Replace' took a guess"                           |
| 2   | 2        | comprehension   | Between Replace and Rerun the two new people are drawn as small saturated blue dots unlike every other node, and the key does not explain them. Grace guessed they had "no number yet"; she was right, but nothing said so, and she never saw the new people by name.                     | `07.png`, `08.png`; transcript step 7: "the two new people are the blue dots, I guess"; end: "nothing said so"                                 |
| 3   | 1        | navigation      | After a replacement made from the source's inspector, the app returns to the Graph overview with no Rerun on screen; the PageRank row's only sign is a history icon with no words, and it still says 12. She clicked PageRank on her own to find Rerun. One extra step, no confusion.            | `07.png`; transcript end: "The clock-arrow icon on the PageRank row didn't say anything by itself"                                             |
| 4   | 1        | comprehension   | "Higher means: Not set" on the Replace page made her stop and check two places (the line under it and the run's Made with) before leaving it, to be sure the numbers would stay comparable.                                                                                                | `06.png`; transcript end: "I had to read two places to be sure"                                                                                |
| 5   | 1        | consistency     | Between Replace and Rerun the run's histogram, "12 of 12 have a value" and the old Top 10 stay at full contrast with no mark of their own, while the graph has 14 nodes; only the bar above and the key's titles say "out of date". She read them correctly as the "before".                  | `08.png`                                                                                                                                       |
| 6   | 0        | layout          | The left click on the Sources row also opened the table drawer along the bottom, which pushed the drawing and its toolbar up and stayed open to the end. She did not remark on it.                                                                                                         | `04.png` to `09.png`                                                                                                                           |

No severity 3 or 4: all three answers were right, the earlier work was kept, and every stale
value she saw carried a mark somewhere she looked. No implementation fault was met: no error, no
dead control, no tool failure. The problems are about how the swap is found and how the
in-between state is explained.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
