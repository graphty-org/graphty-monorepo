# Grade: session r3-s20 -- Dana (regular analyst, returning), team (T21 B), the list was updated

**Grade: S** (success). The last screen (`09.png`) shows the replaced graph with PageRank rerun:
the left panel's run row reads "PageRank 14" with no out-of-date mark, the inspector reads "Measure
ran Oct 10, 5:31:08 PM", "14 of 14 have a value, 0.02333 to 0.1339", Top 10 "Di 0.1339, Hal
0.1305, Ed 0.1245", and the drawing's key reads "Size: PageRank" and "Color: PageRank", 0.02333 to
0.1339, with no "out of date". Dana's answer: 14 people now; first before Hal (0.1293), first now
Di (0.1339), Hal second (0.1305). Every value matches the answer key for T21 B. She replaced the
file in place through the source inspector's "..." menu and kept the earlier run and its layers.
No detour.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `team-ranked.txt` (team.csv loaded, PageRank run, Size by
PageRank). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **First before (right).** `02.png`: Values' Top 10 starts "Hal 0.1293", "12 of 12 have a
  value". Read before the replacement, as the key asks.
- **Replaced, not added (right).** `06.png`: page titled "Replace: team-v2.csv", "Was 12 nodes, 16
  edges; now 14, 21", confirm button "Replace". `07.png`: Overview Nodes 14, Edges 21.
  `work.json`: sources end as team-v2.csv only, team.csv under "gone"; the run
  (`pagerank`, label Influence) and all three layers kept. That is the replacement the task asks
  for, not `work-lost` and not `added-not-replaced`.
- **Rerun (right).** `08.png` shows the "Data changed since this run" bar with Rerun; `09.png`
  shows the run's time moved from 5:29:50 PM to 5:31:08 PM and the new values.
- **First now and count (right).** `09.png`: "Di 0.1339", "14 of 14 have a value", row "PageRank
  14". Dana reported 14 people and Di first.
- **Not a stale read.** Dana read the old Top 10 at `08.png` and named it as the old table ("my
  old table (Hal first, 12 of 12)") before pressing Rerun; she reported only the rerun values as
  the new list.

## Measures

- **Steps:** 8 `real.mjs` steps after the start (`02.png` to `09.png`): Values, Data, team.csv,
  Source actions, Replace with file + upload, Replace, PageRank, Rerun. That is exactly the walked
  inspector-menu route in the key (8 steps); the right-click route is 6.
- **Wrong turns:** 0.
- **False "done":** none. "I have my answer" (`09.png`) is true; truth-on-screen holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. Replace showed the before/after counts on its page and the out-of-date
  marks afterward.
- **Numbers that disagree:** none on the final screen. Between Replace and Rerun the run row said
  12 while the Overview said 14 (`07.png`), as the key records; Dana did not report the 12.
- **Recorded per the key:**
  - Dana quoted "closer" from the "Higher means" line ("until you do ... PageRank reads a higher
    weight as closer") while deciding to leave "Not set" alone; her stated reason was that she had
    never set it before and wanted the same method. Nothing there needed choosing.
  - She read the two blue dots as "the new people with no score yet" -- a correct reading, not a
    highlight or a selection.
  - She did not read the moved or unchanged drawing as lost work, did not stop on "Weight: weight
    auto", and did not read any "Added" heading as an addition.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; leaks.json shows no
  leaks; setup.log shows the setup file chooser answered normally.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                       | Evidence                                                                                                              |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Replace is reached only through an unlabeled "..." icon on the source's inspector (or a right-click on the row, whose "..." appears only on hover). Dana found it only because she went looking.                                                 | `04.png`, `05.png`; transcript debrief: "Replace is hidden behind an unlabeled three-dot icon"                           |
| 2   | 2        | comprehension   | The Replace page's "Higher means: Not set / Closer / Farther / Capacity" and its long sentence left Dana unsure whether a choice there would change her ranking compared with last time. She left it alone on habit, not understanding.         | `06.png`; transcript step 6 and debrief: "I do not know whether choosing something there would have changed my ranking" |
| 3   | 1        | flow            | After a Replace made from the source's menu, the app returns to the Graph inspector (Overview) with no Rerun on screen; the run's only marks are a wordless history icon on its row and "out of date" in the key. It cost one click to reopen PageRank. | `07.png`; transcript step 7-8                                                                                          |
| 4   | 1        | wording         | The history icon on the out-of-date run row does not explain itself; only the key's text says "out of date".                                                                                                                                   | `07.png`, `08.png`; transcript debrief: "The small clock-like icon ... does not explain itself"                         |
| 5   | 1        | comprehension   | Between Replace and Rerun the old histogram, "12 of 12 have a value" and the old Top 10 (Hal first) stay at full contrast with nothing on them marking them stale; only the bar above says the data changed. Dana caught it from the bar.          | `08.png`                                                                                                              |
| 6   | 1        | legibility      | Small gray labels ("Measure ran Oct 10 ...", "Data changed since this run") are hard to read for this persona.                                                                                                                                 | `08.png`, `09.png`; transcript debrief                                                                                 |

No severity 3 or 4: the answer was right, the replacement kept the work, and the stale state was
marked well enough that she did not report it as the new list. Dana's standing question about
exporting the table to another tool is outside this task and is not graded.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
