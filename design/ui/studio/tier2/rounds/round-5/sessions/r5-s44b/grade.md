# Grade: session r5-s44b -- Nadia (tier 1 graduate), team (T21 B), the list was updated

**Grade: S** (success). The last screen (`07.png`) matches the answer key's B end state: the left
panel reads "Graph team-v2.csv" with the PageRank row at 14 and no out-of-date mark; the
inspector's PageRank Values show "ran Oct 11, 10:39:36 AM", "14 of 14 have a value, 0.02333 to
0.1339", and a Top 10 starting Di 0.1339, Hal 0.1305, Ed 0.1245; the drawing's key reads 0.02333 to
0.1339 with no "out of date" in its titles. Nadia answered "14 people now. Before, Hal was first
(0.1293). Now Di is first (0.1339), and Hal is second (0.1305)". The count and both names are
right, and the "before" name was read from the Values before the replacement (`02.png`), so it is
not a stale read.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900, no uncommitted tool changes. Start: the team-ranked setup (team.csv
loaded, PageRank run, nodes sized and colored by PageRank).

## The answer against the key

- **First before (right).** Hal 0.1293, with "12 of 12 have a value", read from the Values' Top 10
  at the start (`02.png`).
- **First now (right).** Di 0.1339, then Hal 0.1305, Ed 0.1245, read after Rerun, with the run time
  changed from 10:38:39 AM to 10:39:36 AM (`06.png`, `07.png`).
- **People now (right).** 14, read on the Replace page ("Was 12 nodes, 16 edges; now 14, 21",
  `05.png`) and confirmed after Rerun (row 14, "14 of 14 have a value", `07.png`).
- **Replaced, not added (right).** The Replace page was titled "Replace: team-v2.csv" (`05.png`);
  after Replace the left panel names team-v2.csv. `work.json` lists team.csv under "gone" in
  sources, which the key says is the replacement itself, not `work-lost`.
- **Work kept (right).** `work.json`: the PageRank run (label Influence) and all three layers
  (Node defaults, Edge defaults, Influence) are the same at start and end; no notes or steps at
  either end.
- **Route.** The key's success path, step for step: Values, Data, a right click on the team.csv
  Sources row, "Replace with file..." with team-v2.csv, Replace, Rerun.

## Measures

- **Steps:** 6 `real.mjs` steps, the key's walked count for this route.
- **Wrong turns:** 0. She went to Data because the file "should live" there and right-clicked the
  source when no button showed. That is the success path, not a detour.
- **False "done":** none. Every claim in her end summary is true on `07.png` (truth-on-screen
  holds).
- **Stale read:** none. Between Replace and Rerun (`06.png`) the old Top 10 (Hal first) stayed on
  screen; she read the out-of-date marks and reran before reading the new list. In her wrap-up she
  said she noticed the list was stale only from "the small 'out of date' text and the banner".
- **Blue dots:** she read the two blue dots as "the joiners, no value yet", which is right. She did
  not read them as a highlight or a selection.
- **Read a moved drawing as lost work:** no.
- **"Higher means":** left at "Not set" (the key: nothing there needs choosing). She stopped on it
  and gave "closer" as her reason, citing the old run's Made with ("the old run said the same
  thing (assumed higher means closer)") rather than the Replace page's own line. Recorded as the
  key asks.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Seven screenshots for the start and six steps;
  `leaks.json` shows no leaks over 16 calls; the setup log shows the file chooser answered;
  `session.log` is empty (no tool errors).
- **Scripted exit:** not applicable; Nadia finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                  | Evidence                                                                                                                                       |
| --- | -------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | stale-display   | Between Replace and Rerun the inspector's Distribution, "12 of 12 have a value" with the old range, and the old Top 10 (Hal first) stay at full contrast with no out-of-date mark on them, while the drawing already shows 14 people. Only the bar above, the row's icon and the key's small titles say so. Nadia caught it, and said that had she copied the numbers then, they would have been wrong. | `06.png` (bar "Data changed since this run", Top 10 Hal 0.1293 unmarked, row still 12); transcript "What confused me"                           |
| 2   | 2        | discoverability | Replacing the file has no visible control on the Data page's Sources row at rest; it lives only in the right-click menu (and the row's hover "..." or the source inspector's "..."). Nadia found it by trying a right click, and said a plain click or a visible button would be faster.                                                        | `03.png` (Sources row, no button); `04.png` (right-click menu: "Edit source...", "Replace with file..."); transcript step 3 and "What confused me" |
| 3   | 1        | comprehension   | The Replace page's "Higher means: Not set / Closer / Farther / Capacity" does not say what the existing run used, so a returning user has to remember or infer it to keep the ranking comparable. Nadia stopped on it and reasoned from the old run's Made with. No effect on the result.                                             | `05.png`; `07.png` Made with "Its meaning was not set, so this run assumed a higher weight means closer"; transcript step 5 and "What confused me" |
| 4   | 1        | comprehension   | The two people added by the new file are drawn as saturated blue dots that the drawing's key does not explain. Nadia read them correctly as "no value yet", but nothing on screen says so.                                                                                                                                                | `06.png` (two blue nodes; key shows only the PageRank size and color bars)                                                                       |

Problems 1 and 4 are the out-of-date state the answer key already describes for T21 B.
