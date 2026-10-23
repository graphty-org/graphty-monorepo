# Grade: session r2-s39 -- Nadia (tier 1 graduate), running club (T21 A), the list was updated

**Grade: S** (success). The last screen (`11.png`) shows the PageRank run redone on the new file:
the left panel reads "Graph friends-v2.csv", the run's subtitle "Measure ran Oct 9, 8:42:21 PM"
(it was 8:40:06 PM before, `02.png`), no "Data changed since this run" bar, the key titles without
"out of date" and the range 0.02872 to 0.08012, "20 of 20 have a value", and the Top 10 starting
Ava 0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141. Made with reads "weight (read as closer)"
and Damping factor 0.85, as before. Nadia reported first before Farah (0.06394, read from the
Values before she touched the file, `02.png`) and first now Ava (0.08012). Both names match the
key. The file was replaced, not added beside the old one (`08.png` "Replace: friends-v2.csv",
"Was 20 nodes, 41 edges; now 20, 41"), and the run was rerun.

She looked in two wrong places first (the Graph panel's file name and the Graph inspector's "..."
menu, `03.png`, `04.png`), but neither changed anything: she closed the menu with Escape and went
on. No load, addition or project was made and undone, so this is not the kind of detour the key
grades SD (`answers.md`, T21: "an addition undone, a new project"). The two looks are recorded as
wrong turns below.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup friends-ranked (friends.csv, PageRank run, dots sized and colored by
PageRank).

## The answer against the key

- **First before (right).** Farah 0.06394 (`02.png`, Top 10), read before the replacement.
- **First now (right).** Ava 0.08012 (`11.png`), with Farah second at 0.06556, as the key gives.
- **Replaced, not added (right).** `08.png` names the page "Replace: friends-v2.csv"; after
  Replace the left panel reads "Graph friends-v2.csv" and the edge table shows Ava-Chloe 1, the
  new weight (`09.png`). `work.json` lists friends.csv under "gone" in sources and keeps the one
  run and all three layers: the replacement the task asks for, not `work-lost`.
- **Rerun (right).** The "Ran" time changed, the out-of-date marks are gone, and the range is
  the new one (`11.png`).
- **Not a wrong answer.** Not `stale-read`: she saw the old Top 10 still on screen after Replace
  (`10.png`, Farah 0.06394), named it "still the old one", and pressed Rerun before reading a
  name. Not `added-not-replaced`. Not `work-lost`.

## Measures

- **Steps:** 10 `real.mjs` steps after the start (`02.png` to `11.png`). The walked route through
  the source's inspector menu is 8. The 2 extra are the two wrong turns. She reached the Data
  page by the blue "From friends.csv" link in the Graph inspector instead of the Data tab; that
  costs no extra step.
- **Wrong turns:** 2. Step 2 clicked the file name in the Graph panel's title, expecting a way to
  change the file (it opened the Graph inspector, `03.png`). Step 3 opened the Graph inspector's
  "..." menu, which held only Re-run layout, Reshuffle layout seed and Add note (`04.png`).
- **False "done":** none. "Done" (`11.png`) is true: both names and the rerun are on screen.
  truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. Replace showed its preview with the counts before committing,
  and after it the run row, the key and the run's bar all said the run was out of date.
- **Numbers that disagree (bar 5):** none on the final screen. Between Replace and Rerun the old
  Top 10 and range stayed on screen beside the new table (as the key expects); she read it as old.
- **Wrong weight reading without a sign (bar 7b):** no. The weight was read as closer before and
  after, and Made with says so.
- **Broken habit:** none from her history.
- **Build-decided:** no. No script error, failed click or app defect was met; every step printed
  its screenshot and did what the key says it does on this build. Every problem below is about
  where things are and what the words say, not about something broken.
- **Void:** no.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                  | Evidence                                                                                                         |
| --- | -------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Changing the file is offered only on the Data side, in the source's own menu. The two places Nadia looked first -- the file name in the Graph panel's title and the Graph inspector's "..." menu -- offer nothing about the file. She found the way only because "From friends.csv" was drawn as a link; she called it "two clicks deeper than I expected".                  | `03.png`, `04.png`; transcript steps 2-4 and wrap-up "Finding the swap"                                          |
| 2   | 1        | wording         | The Graph inspector's "..." menu has "Re-run layout" at the top; for a moment she wondered whether it redid her ranking. She worked out that it was the drawing.                                                                                                                                                                         | `04.png`; transcript step 3 and wrap-up                                                                          |
| 3   | 1        | comprehension   | The Replace page's "Higher means: Not set / Closer / Farther / Capacity" row: she did not know whether she had to answer it, nor whether picking a value would make the two rankings incomparable. She left it at Not set, quoting "closer" from her old run's Made with (and the line under the row) as her reason -- the case the key asks graders to record. | `08.png`; transcript step 7 and wrap-up                                                                          |
| 4   | 1        | feedback        | After a replacement made from the source's inspector, the app returns to the Graph inspector, not to the run; the run row's only sign is its history icon with no words, so the Rerun is one click further than the change needs. She found it from the key's "out of date" titles.                                                       | `09.png` (Graph inspector, row's history icon, key "PageRank, out of date"); `10.png`                            |
| 5   | 1        | feedback        | Between Replace and Rerun the run's histogram, range and Top 10 (Farah 0.06394) stay at full contrast with nothing on them saying they are old; only the bar above says "Data changed since this run". She read it correctly.                                                                                                             | `10.png`                                                                                                         |
| 6   | 1        | feedback        | Nothing after Replace says the old file is no longer in the project. She inferred it from the new weights in the table but wanted one line saying so, for QA.                                                                                                                                                                             | `09.png`; transcript wrap-up, last point                                                                         |

No severity 3 or 4: the answer was right, the work (run, colors, sizes) was kept, and nothing
on the path was broken.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
