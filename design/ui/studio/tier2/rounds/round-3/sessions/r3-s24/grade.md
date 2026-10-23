# Grade: session r3-s24 -- Nadia (returning), team (T21 B), the list was updated

**Grade: S** (success). The last screen (`07.png`) shows the rerun on the new file: the left
panel reads "Graph team-v2.csv" and the PageRank row "14"; the run's inspector reads "ran Oct 10,
5:37:31 PM", "14 of 14 have a value, 0.02333 to 0.1339", and its Top 10 starts "Di 0.1339", "Hal
0.1305", "Ed 0.1245"; the drawing's key reads 0.02333 to 0.1339 with no "out of date" mark. Nadia
reported 14 people now (12 before), Hal first before (0.1293, read from `02.png` before the swap)
and Di first now (0.1339). All three match the key. She replaced the file in place (right-click on
the Sources row, "Replace with file...", Replace) and reran from the "Data changed since this run"
bar, the answer key's success path step for step. No detour.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `team-ranked` (team.csv loaded, PageRank run, PageRank on
Size). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **People now (right).** 14 (`05.png` "Was 12 nodes, 16 edges; now 14, 21"; `07.png` row 14,
  "14 of 14 have a value").
- **First before (right).** Hal 0.1293 (`02.png`, Top 10 read before the replacement, "12 of 12
  have a value").
- **First now (right).** Di 0.1339, then Hal 0.1305 (`07.png`), read after Rerun, with the Ran time
  changed from 5:36:09 PM (`06.png`) to 5:37:31 PM (`07.png`). Not `stale-read`: she did not read
  the top name in the out-of-date state (`06.png`, where the Top 10 still starts Hal).
- **Replaced, not added; work kept.** `work.json`: start and end both hold the PageRank run and
  all three layers (Node defaults, Edge defaults, Influence); sources went from team.csv to
  team-v2.csv, with team.csv under "gone". As the key says, that is the replacement the task asks
  for, not `work-lost`. Not `added-not-replaced`.

## Measures

- **Steps:** 6 `real.mjs` steps after the start (`02.png` to `07.png`), the same as the success
  path (6). 1.0x.
- **Wrong turns:** 0.
- **False "done":** none. Her "done" at `07.png` is true; every number she gave is on that screen
  or was on screen when she read it. truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Quoted "closer" from the Replace page's line as a reason** (the key asks to record it): yes.
  At step 5 she left "Higher means" on "Not set" because the line under it says PageRank reads a
  higher weight as closer, which matches the old run's "read as closer" (`05.png`, `02.png`). Right
  reasoning; it cost a pause, not a step.
- **Read the blue new nodes as a highlight or selection** (the key asks to record it): no. She
  read them as "the new people, with no score yet" (`06.png`), which is right.
- **Read the moved drawing as lost work:** no; she checked the PageRank layer was still there.
- **Silent commit:** none. Replace showed the new name, the out-of-date marks and the Rerun bar.
- **Numbers that disagree:** none.
- **Broken habit:** none. Her history names no way to replace a file; she found it by a right-click
  habit.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot, the upload was answered,
  and `leaks.json` shows no leaks.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                     | Evidence                                                                                                      |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The only ways to replace a file are a right-click menu on the Sources row and a "..." that shows only on hover or in the source's inspector. At rest the row shows no control. Nadia found it only because she right-clicks by habit. | `03.png` (row with no button); `04.png` (menu); transcript step 3 and end: "A plain button by the source would have saved the guess" |
| 2   | 2        | comprehension   | After Replace nothing says whether the saved project now refers to the new file. The left panel says "Graph team-v2.csv" while the top bar still says "team" and "Local only"; Nadia was unsure whether the project on disk still points at the old file until she saves, and did not save. | `06.png`, `07.png` (two names, no link between them); transcript end                                            |
| 3   | 1        | wording         | "Higher means: Not set" on the Replace page made her stop and read the line under it to be sure that leaving it unset ranks the same way as the earlier run. Nothing on the page names the earlier run's setting.           | `05.png`; transcript step 5 and end                                                                           |
| 4   | 1        | legibility      | Between Replace and Rerun the Top 10 and the histogram still show the old values (Hal first, "12 of 12") at full contrast; only the bar, the row's icon and the key's titles say "out of date". She did not misread it, because she reran at once. | `06.png`                                                                                                      |
| 5   | 1        | legibility      | The two new nodes are drawn in a saturated blue the key does not explain. She read them right, but only by inference.                                                                                                       | `06.png`; transcript step 6                                                                                   |

No severity 3 or 4: the answer was right, the work was kept, and every doubt she raised was about
finding the command or about what is saved, on a path she completed without a wrong turn.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
