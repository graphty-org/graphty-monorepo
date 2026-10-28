# Grade: session r2-s40 -- Tom (returning), team (T21 B), the list was updated

**Grade: S** (success). The last screen (`12.png`) shows the PageRank run redone on the new file
and the project saved: the left panel reads "Graph team-v2.csv", the PageRank row says 14, the
run's subtitle reads "ran Oct 9, 8:46:43 PM" (it was 8:44:54 PM before, `02.png`), there is no
"Data changed since this run" bar, the key titles have no "out of date" and show the range 0.02333
to 0.1339, the Values read "14 of 14 have a value", and the Top 10 starts Di 0.1339, Hal 0.1305,
Ed 0.1245. The toast reads "Saved team in this browser." Tom reported 14 people now (12 before),
Hal first before (0.1293) and Di first now (0.1339). All three match the key. He took the
source-inspector menu route, reaching the Data page through the Graph inspector's "From team.csv"
link instead of the left rail: one step more than the walked route, no detour.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `team-ranked.txt` (team.csv, one PageRank run, its Influence layer).

## The answer against the key

- **People now: 14 (right).** `08.png` Graph overview Nodes 14, Edges 21; `10.png` PageRank row 14
  and "14 of 14 have a value". The Replace page said "Was 12 nodes, 16 edges; now 14, 21"
  (`07.png`).
- **First before: Hal (right).** `02.png`, Top 10 "Hal 0.1293", "12 of 12 have a value", read
  before anything was replaced.
- **First now: Di (right).** `10.png` and `12.png`, Top 10 "Di 0.1339", then Hal 0.1305 and Ed
  0.1245, as the key gives.
- **Replaced, not added (right).** `07.png` "Replace: team-v2.csv"; `work.json` keeps the run and
  all three layers from start to end, with team.csv under "gone" and team-v2.csv in its place --
  the replacement the task asks for, not `work-lost`.
- **Not a trap.** Not `stale-read`: at `09.png` he saw the old Top 10 (Hal first, "12 of 12")
  under "Data changed since this run" and called them "still the old ones" before pressing Rerun.
  Not `added-not-replaced`: he chose "Replace with file...", not "Edit source...".

## Measures

- **Steps:** 9 `real.mjs` steps from the start to the rerun (`02.png` to `10.png`): Values, the
  "team.csv" title in the left panel (opened the Graph inspector), the inspector's "From team.csv"
  link (opened the Data page), the team.csv Sources row (left click, by position), the source
  inspector's "..." (by position, `--click-at 1419,73`), Replace with file... with the upload,
  Replace, PageRank, Rerun. The key's walked inspector-menu route is 8 steps; the extra step is
  the way to the Data page (two clicks instead of the rail's Data). Two more steps after the task
  (Control+S, Save) saved the project; not counted against the task.
- **Wrong turns:** 0. The first click on the "team.csv" title did not offer a swap, but it put
  the "From team.csv" link on screen, which led on to the Data page. Every move went forward.
- **First move:** the run's Values, the place his history names for reading the top people.
  Worked. No broken habit.
- **False "done":** none. "The ranking is redone and kept. I'm done." (`12.png`) is true: replaced,
  rerun, saved, and all three answers on screen and current. truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. Replace returned to the map with the key titles "PageRank, out
  of date", the run row's history icon and Nodes 14 / Edges 21 (`08.png`); Rerun changed the key
  range, the Top 10, the row count and the time (`10.png`).
- **Numbers that disagree (bar 5):** none on the final screen. Between Replace and Rerun the
  histogram, "12 of 12 have a value, 0.03273 to 0.1293", the old Top 10 and the row's "12" stayed
  at full contrast while the graph had 14 nodes (`08.png`, `09.png`); the bar and the key's
  "out of date" titles marked them, and he read them as old.
- **Wrong weight reading without a sign (bar 7b):** no. Both runs' Made with say "weight (read as
  closer)" and "Its meaning was not set, so this run assumed a higher weight means closer"
  (`02.png`, `10.png`).
- **Quoted "closer" as a reason:** yes. At `07.png` he left "Higher means: Not set" because "the
  text under 'Higher means' says PageRank reads higher as closer anyway, which is what the old run
  said too."
- **Blue dots read as a highlight or selection:** no. He read the two blue dots (`08.png`) as "the
  two new people, with no ranking yet" -- a correct guess, but he said "for a moment I wondered if
  blue meant something"; nothing on screen explained them.
- **Moved drawing:** the replacement laid the drawing out again (`02.png` against `08.png`). He
  did not remark on it and did not read it as lost work ("nothing lost").
- **"Added" heading:** not seen. He did not return to the source's inspector after the
  replacement.
- **Positions after Replace:** every one of the 12 people in both files moved (`02.png` against
  `08.png`); reported, not counted.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; setup.log shows the file
  chooser answered.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                       | Evidence                                                                                                                                  |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Nothing on the main screen offers a newer version of the file. The swap sits under an unlabeled "..." in the source's inspector, reached only after finding the Data page and the file. Tom called it "four clicks of guessing" (the left panel title, the "From team.csv" link, the Sources row, the "...").   | `03.png`, `04.png` (Sources row with no "..." at rest), `05.png`, `06.png`; transcript end: "Nothing on the main screen says 'new version of this file'" |
| 2   | 2        | comprehension   | Between Replace and Rerun the two new people are drawn as small saturated blue dots unlike every other node, and the key does not explain them. Tom guessed "no ranking yet" and was right, but said he "wondered if blue meant something".                                                                   | `08.png`, `09.png`; transcript step 8 and end                                                                                              |
| 3   | 1        | comprehension   | The Replace page shows "Each row is", "Higher means: Not set / Closer / Farther / Capacity" and "Direction: As the file says" with no sign that they match the earlier load. Tom, who does not change settings he does not understand, left them alone on a reasoned guess and asked for "a line saying these are the same settings as last time". | `07.png`; transcript end                                                                                                                  |
| 4   | 1        | navigation      | After a replacement made from the source's inspector, the app returns to the Graph overview with no Rerun on screen; the PageRank row's only sign is a history icon with no words, and it still says 12. He clicked PageRank on his own to find Rerun. One extra step, no confusion.                          | `08.png`; transcript step 8: "with a little clock-like icon now"                                                                          |
| 5   | 1        | consistency     | Between Replace and Rerun the run's histogram, "12 of 12 have a value" and the old Top 10 stay at full contrast with no mark of their own while the graph has 14 nodes; only the bar above and the key's titles say "out of date". He read them correctly as old.                                              | `09.png`                                                                                                                                  |
| 6   | 1        | consistency     | Control+S on a project that already has a name opened "Save team as" with the name filled in, instead of saving in place. He confirmed the same name and saved; one extra step.                                                                                                                                | `11.png`, `12.png`                                                                                                                        |
| 7   | 0        | layout          | The left click on the Sources row also opened the table drawer along the bottom, which pushed the drawing and its toolbar up and stayed open to the end. He did not remark on it.                                                                                                                             | `05.png` to `12.png`                                                                                                                      |

No severity 3 or 4: all three answers were right, the earlier work was kept, and every stale
value he saw carried a mark somewhere he looked. No implementation fault was met: no error, no
dead control, no tool failure, no wrong value. The problems are about how the swap is found and
how the in-between state is explained.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
