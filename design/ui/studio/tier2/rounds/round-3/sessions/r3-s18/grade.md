# Grade: session r3-s18 -- Dev (tier 1 graduate), team (T21 B), the list was updated

**Grade: S** (success). The last screen (`10.png`) shows the file replaced and the ranking redone:
the left panel reads "Graph team-v2.csv", the PageRank row reads 14 with no out-of-date icon, the
run's subtitle reads "ran Oct 10, 5:29:34 PM" (5:27:52 PM before, `02.png`), there is no "Data
changed since this run" bar, the drawing key reads 0.02333 to 0.1339 with no "out of date" in its
titles, the Values read "14 of 14 have a value", and the Top 10 starts "Di 0.1339", "Hal 0.1305",
"Ed 0.1245". Dev reported 14 people now, Hal first before (0.1293, read from the Values before the
replacement, `02.png`) and Di first now (0.1339), with Hal second (0.1305). All three match the
key.

He looked in two wrong places first (the file name in the Graph panel's title, `03.png`, and the
Graph inspector's "..." menu, `04.png`), but neither changed anything: he closed the menu with
Escape and went on. No load, addition or project was made and undone, so this is not the kind of
detour the key grades SD.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: team.csv loaded, PageRank run and applied to Size and Color (the
setup in session.json). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **First before (right).** `02.png`: Top 10 starts "Hal 0.1293", "Ida 0.1224", "Di 0.1177";
  "12 of 12 have a value"; key 0.03273 to 0.1293.
- **Replaced, not added (right).** `07.png`: "Replace: team-v2.csv", "Was 12 nodes, 16 edges; now
  14, 21", confirm button "Replace" beside Cancel. `08.png`: Graph inspector Nodes 14, Edges 21.
  `work.json` lists team.csv under "gone" and team-v2.csv as the only source; the run and all three
  layers are kept, which the key says is the replacement asked for, not `work-lost`.
- **People now (right).** 14 (`08.png` Nodes 14; `10.png` "14 of 14 have a value", row 14).
- **First now (right).** `10.png`, as above, matching the key's Di 0.1339 / Hal 0.1305 / Ed 0.1245.
- **Not a stale read.** At `09.png` (after Replace, before Rerun) the old Top 10 with Hal first is
  on screen at full contrast; Dev named it as his "before" and pressed Rerun before reading any
  new name.
- **Recorded as the key asks:**
  - Dev quoted "closer" from the Replace page's "Higher means" line as his reason to leave "Not
    set" alone (transcript step 6). Nothing there needed choosing, so it does not change the grade.
  - The two blue dots between Replace and Rerun (`08.png`): Dev read them as "the new people with
    no rank yet", which is right. He did not read them as a highlight or a selection.
  - The drawing was laid out again by the replacement (`08.png` against `06.png`); Dev did not read
    the moved drawing as lost work ("Good, nothing lost").

## Measures

- **Steps:** 9 `real.mjs` steps after the start (`02.png` to `10.png`): Values, the Graph title's
  file name, the Graph inspector's "...", Escape plus Data, right-click the Sources row, Replace
  with file plus upload, Replace, PageRank, Rerun. The key's success path is 6 (with PageRank
  before Rerun allowed and not a deviation). 1.5x (9/6).
- **Wrong turns:** 2. Step 2 clicked "team.csv" in the Graph panel's title, expecting a way to
  change the file (it opened the Graph inspector, `03.png`). Step 3 opened the Graph inspector's
  "..." menu, which held only Re-run layout, Reshuffle layout seed and Add note (`04.png`).
- **False "done":** none. "Done" at `10.png` is true: the new file is in place, the run is redone
  (new time, no out-of-date marks) and the count and names read are on screen. truth-on-screen:
  holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. Replace showed the out-of-date marks; Rerun changed the run time, the
  row count and the key.
- **Numbers that disagree:** none.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; leaks.json shows no
  leaks.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                                       | Evidence                                                                 |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | 2        | discoverability | Replacing a file has no visible control: the file name in the Graph panel's title and the Graph inspector's "..." offer nothing about the file, and on the Data page the Sources row shows no button at rest. Dev found "Replace with file..." only by a habitual right-click and said that without the habit he "would have been stuck". The same two wrong places were tried first in round 2 session r2-s39 (T21 A), so this is seen in 2 participants. | `03.png`, `04.png`, `05.png` (no button on the row), `06.png`; transcript steps 2-5 and wrap-up |
| 2   | 1        | stale display   | Between Replace and Rerun the old Top 10 (Hal first), the old histogram and the row's "12" stay at full contrast with nothing on them marking them out of date; only the bar above, the row's history icon and the key's titles say so. Dev was not misled.                                                                                                     | `08.png`, `09.png`                                                       |
| 3   | 1        | unexplained mark | The two new people are drawn as saturated blue dots that the key does not explain. Dev guessed their meaning correctly.                                                                                                                                                                                                                                      | `08.png`; transcript step 7                                              |
| 4   | 1        | comprehension   | "Higher means: Not set" on the Replace page made him pause before he read the line under it.                                                                                                                                                                                                                                                                  | `07.png`; transcript step 6 and wrap-up                                  |
| 5   | 1        | layout          | The open right-click menu covers the end of the Sources row's own counts ("12 no...").                                                                                                                                                                                                                                                                        | `06.png`                                                                 |
| 6   | 0        | naming          | The left panel's title changes to "Graph team-v2.csv" while the top bar keeps the project name "team", with nothing saying how the two relate. Dev did not remark on it.                                                                                                                                                                                       | `08.png`, `10.png`                                                       |

No severity 3 or 4: the count and both names were right, the replacement kept the work, and the
out-of-date state was noticed and resolved before any new name was read. Dev's history does not
name the Graph panel's title or its "..." as a place he used before, so the two wrong turns are not
a broken habit under the criteria.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
