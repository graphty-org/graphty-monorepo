# Grade: session r3-s17 -- Grace (tier 1 graduate), running club (T21 A), replace the list and redo the ranking

**Grade: S** (success). The last screen (`07.png`) shows the replaced file and the redone run: the
left panel reads "Graph friends-v2.csv", the PageRank row 20, the inspector's subtitle "ran Oct
10, 5:27:10 PM" (5:26:00 PM before, `02.png`), the drawing key 0.02872 to 0.08012 with no "out of
date" in its titles, "20 of 20 have a value", and Top 10 "Ava 0.08012", "Farah 0.06556", "Hana
0.06428", "Ivan 0.06141". Grace reported first before Farah (0.06394, read from the Values before
the replacement, `02.png`) and first now Ava (0.08012), both as the answer key gives. She took
the right-click route on the Data page's Sources row, the key's success path, with no detour.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: friends.csv loaded, PageRank run and applied to Size and Color
(the setup in session.json). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **First before (right).** `02.png`: Top 10 starts "Farah 0.06394", "Hana 0.05941", "Milo
  0.05648"; key 0.03779 to 0.06394.
- **Replaced, not added (right).** `05.png`: "Replace: friends-v2.csv", "Was 20 nodes, 41 edges;
  now 20, 41", confirm button "Replace" beside Cancel. `work.json` lists friends.csv under "gone"
  and friends-v2.csv as the only source; the run and all three layers are kept, which the key
  says is the replacement asked for, not `work-lost`.
- **First now (right).** `07.png`, as above, matching the key's 0.0801 / 0.0656 / 0.0643 / 0.0614.
  Still 20 people and 41 ties.
- **Not a stale read.** At `06.png` (after Replace, before Rerun) the old Top 10 with Farah first
  is on screen at full contrast; Grace did not read it as the answer. She named the "Data changed
  since this run" bar and the key's "PageRank, out of date" and pressed Rerun before reading any
  name.
- **Recorded as the key asks:** Grace quoted "closer" from the Replace page's "Higher means"
  line as her reason to leave "Not set" alone (transcript step 5). Nothing there needed choosing
  for this task, so it does not change the grade.

## Measures

- **Steps:** 6 `real.mjs` steps after the start (`02.png` to `07.png`): Values, Data, right-click
  the Sources row, Replace with file plus upload, Replace, Rerun. The key's success path is 6. 1.0x.
- **Wrong turns:** 0.
- **False "done":** none. "Done" at `07.png` is true: the new file is in place, the run is redone
  (new time, no out-of-date marks) and the names read are on screen. truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. Replace showed the out-of-date bar and key titles; Rerun changed the
  run time and the key.
- **Numbers that disagree:** none.
- **Moved drawing read as lost work:** no (on A the drawing keeps its shape).
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; leaks.json shows no
  leaks. The start waited several minutes for a browser slot (all four in use), which is the cap
  working, not a fault.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                         | Evidence                                                                                                       |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Replacing a file has no visible control on the Data page at rest: the Sources row shows no "..." until hovered, and Grace found "Replace with file..." only by guessing a right-click. She judged a colleague who does not right-click would not find it. | `03.png` (no button on the row); `04.png` (the menu); transcript step 3 and end                               |
| 2   | 1        | comprehension   | "Higher means: Not set" on the Replace page made her stop and read the line under it twice to be sure the new ranking would be comparable with the old one.                                                                                      | `05.png`; transcript step 5 and end: "I had to read it twice"                                                  |
| 3   | 1        | stale display   | Between Replace and Rerun the old histogram, "20 of 20 have a value" with the old range and the old Top 10 (Farah first) stay at full contrast with nothing on them marking them out of date; only the bar above, the row's icon and the key's titles say so. Grace was not misled. | `06.png`                                                                                                       |
| 4   | 1        | layout          | The open right-click menu covers the end of the row's own counts ("20 nodes, ...") and sits against the left end of the drawing key.                                                                                                            | `04.png`                                                                                                       |
| 5   | 0        | naming          | The left panel's title changes to "Graph friends-v2.csv" while the top bar keeps the project name "friends", with nothing saying how the two relate. Grace did not remark on it beyond noting the header changed.                                | `06.png`, `07.png`; transcript step 6                                                                          |

No severity 3 or 4: both names were right, the replacement kept the work, and the out-of-date
state was noticed and resolved before any name was read.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
