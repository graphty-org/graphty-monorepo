# Grade: session r5-s40b -- Dana (regular analyst), team (T21 B), the list was updated

**Grade: S** (success). The last screen (`07.png`) matches the answer key's B end state: the graph
is titled "Graph team-v2.csv", the PageRank row reads 14, the inspector's Values read "14 of 14 have
a value, 0.02333 to 0.1339", the Top 10 starts "Di 0.1339", then Hal 0.1305 and Ed 0.1245, the key
reads 0.02333 to 0.1339 with no "out of date" in its titles, and the run's time changed from
10:36:29 AM to 10:37:29 AM. Dana answered: 14 people now (was 12), Hal first before (0.1293), Di
first now (0.1339) -- all three as the key gives them.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900, with no uncommitted changes in the tool's checkout. Start: the team setup
(team.csv loaded, PageRank run, nodes sized and colored by PageRank).

## The answer against the key

- **Team size (right).** 14, read from "Was 12 nodes, 16 edges; now 14, 21" on the Replace page
  (`05.png`) and confirmed by "14 of 14 have a value" after Rerun (`07.png`).
- **First before (right).** Hal 0.1293, read from the Values' Top 10 before anything was replaced
  (`02.png`), not from the stale screen after Replace.
- **First now (right).** Di 0.1339, read after Rerun (`07.png`). No `stale-read`: the old Top 10
  (Hal first) was on screen in `06.png`, and Dana saw it and reran before reading.
- **Replaced, not added.** `work.json`: sources went from team.csv to team-v2.csv, with team.csv
  under "gone"; that is the replacement the task asks for. The run (PageRank, label Influence) and
  all three layers are the same at start and end. No `work-lost`, no `added-not-replaced`.

## Measures

- **Route:** the key's right-click route: Values, Data, right-click the team.csv row, "Replace with
  file..." with team-v2.csv, Replace, Rerun.
- **Steps:** 6 `real.mjs` steps after the start, the same as the success path.
- **Wrong turns:** 0. Dana looked for a visible replace control on the Data page first and, finding
  none, right-clicked the row as her next action ("In Excel I'd right-click the thing"); that look
  cost no step.
- **False "done":** none. "Rerun done: 14 of 14 have a value ... Di 0.1339 first" is true on
  `07.png`; "the colors and sizes kept my old setup and updated" is true (key 0.02333 to 0.1339).
  truth-on-screen holds.
- **Watch items from the key:** she read the two blue dots in `06.png` correctly as "the new people,
  no score yet", not as a highlight or a selection. She did not read the moved drawing as lost
  work. She stopped on "Higher means: Not set" and left it alone to keep the run comparable with
  last month; she did not quote "closer" as her reason, though she noted the line mentions PageRank.
  She did not stop on "Weight: weight auto".
- **Silent commit:** none. Replace returned to the graph with the run marked out of date and a
  Rerun button (`06.png`); Rerun changed the values, the key and the time (`07.png`).
- **Numbers that disagree:** none.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Seven screenshots for seven steps; `leaks.json` shows no
  leaks over 16 calls.
- **Scripted exit:** not applicable; Dana finished.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                                                                                         | Evidence                                                                                                                                  |
| --- | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | trust         | Between Replace and Rerun the old Top 10 (Hal first), the histogram and "12 of 12 have a value" stay at full contrast; the only marks are a small "Data changed since this run" line, the row's history icon and "out of date" in the key's tiny titles. Dana "almost copied the old list". Caught, so no stale read. | `06.png` (inspector Top 10 Hal 0.1293 under the small bar); transcript "What confused me", third item                                    |
| 2   | 2        | discoverability | Replace lives only on the source row's right-click menu (and a "..." that shows only on hover); the Data page at rest shows no replace control. Dana found it only because she right-clicks everything and expects a colleague would not.                                    | `03.png` (Sources row, no visible control), `04.png` (menu); transcript step 03 and "What confused me", first item                        |
| 3   | 1        | comprehension | The Replace page's "Higher means: Not set / Closer / Farther / Capacity" choice gives no clue whether it changes this ranking; Dana left it unset to match last month but was unsure that was right.                                                                         | `05.png` (choice and its line under it); transcript step 05 and "What confused me", second item                                           |
| 4   | 1        | readability   | Labels in the right panel and the drawing's key are small and low-contrast gray; Dana said she would be leaning in on a laptop.                                                                                                                                             | `07.png` (key titles, "Measure ran ..." subtitle, Made with labels); transcript "What confused me", fourth item                            |
| 5   | 1        | missing info  | Nothing tells Dana where a loaded file goes or whether results reach Power BI; she inferred "stays on my machine" from "Local only" in the top bar. Outside this task's question.                                                                                         | `07.png` (top bar "Local only"); transcript "What confused me", fifth item                                                                 |

The open menu in `04.png` also covers the end of the source row's counts and the left end of the
key's Color bar, as the key notes; Dana did not remark on it.
