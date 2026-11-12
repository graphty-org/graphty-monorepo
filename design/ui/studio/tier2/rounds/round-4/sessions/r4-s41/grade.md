# Grade: session r4-s41 -- Ruth (tier 1 graduate), running club (T21 A), the list was updated

**Grade: S** (success). Every part of the task is met. The file was replaced, not added: the left
panel's title reads "Graph friends-v2.csv" and `work.json` lists friends.csv under "gone" with
friends-v2.csv as the only source, while the PageRank run and all three style layers are kept
(start and end lists identical). The Replace page read "Was 20 nodes, 41 edges; now 20, 41"
(`05.png`). The run was redone: "Ran" moved from Oct 11, 3:33:39 AM (`02.png`) to 3:34:35 AM
(`07.png`), the key reads 0.02872 to 0.08012, and the Top 10 starts "Ava 0.08012". Ruth's answer
-- first before Farah (0.06394), first now Ava (0.08012), Farah second at 0.06556 -- matches the
key on both names and every value she quoted. The last screen (`09.png`) shows Ava selected, her
inspector reading "PageRank 0.08012, #1 of 20", with the key 0.02872 to 0.08012 and no out-of-date
mark anywhere: the end state agrees with the answer.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (PageRank run, sized and colored by
PageRank, run inspector open on Style). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **First before (right).** Read from the run's Values before anything changed: Top 10 "Farah
  0.06394", "20 of 20 have a value, 0.03779 to 0.06394" (`02.png`).
- **Replaced, not added (right).** Right-click on the Sources row, "Replace with file...",
  friends-v2.csv, Replace (`04.png`, `05.png`, `06.png`). Counts 20 nodes, 41 edges, as the key.
- **Stale-read trap (avoided).** After Replace, `06.png` still shows the old Top 10 (Farah first)
  and the key 0.03779 to 0.06394 under "Size: PageRank, out of date". Ruth read the "Data changed
  since this run" bar and the "out of date" titles, said the old numbers were "honestly marked",
  and pressed Rerun before reading a name.
- **First now (right).** `07.png`: Top 10 Ava 0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141,
  all four as the key. Confirmed again on the drawing by clicking the largest node (`09.png`).
- **Work kept.** `work.json`: runs and layers unchanged; the "gone" friends.csv is the replacement
  the task asks for, not lost work (answer key, "For graders reading work.json").

## Measures

- **Route:** the right-click route, the success path exactly: Values, Data, right-click the
  source, Replace with file... with the upload, Replace, Rerun -- 6 steps (`02.png` to `07.png`),
  equal to the key's 6. Two more steps (`08.png` hover, `09.png` click on the largest node) were a
  deliberate check that the drawing agrees with the table, taken after the answer was already on
  screen; not a detour.
- **Wrong turns:** 0. The right-click was a guess ("I'll right-click the source row to see if it
  offers one") that landed first time.
- **False "done":** none. "Finished: yes" and every value claimed are on screen in `07.png` and
  `09.png`. truth-on-screen: holds.
- **"Closer" quoted from the weight line as a reason:** yes, as the key asks graders to record.
  At step 5 Ruth stopped on "Higher means: Not set", read the line under it, and left it because
  "PageRank then reads higher as closer -- the same as the old run said, so the comparison is like
  for like." The reasoning is correct; it cost a pause, not a step.
- **Silent commit:** none. Replace changed the panel title, the row icon, the key titles and the
  inspector bar (`06.png`); Rerun changed the time, the range and the Top 10 (`07.png`).
- **Numbers that disagree:** none on the final screens. Between Replace and Rerun the histogram,
  "20 of 20 have a value" with the old range and the old Top 10 stay at full contrast with no mark
  on them (`06.png`); the participant was not misled.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the upload was accepted
  (`setup.log`, `05.png`), and `leaks.json` shows no leaks over 21 calls.
- **Scripted exit:** not applicable; Ruth finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                               | Evidence                                                                                                                       |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 2        | discoverability | Replacing a source is offered only in the source row's right-click menu (or a "..." that shows only on hover); the Data page at rest shows no way to replace a file. Ruth found it only because she tried a right-click on a guess.                                                    | `03.png` (Sources row, no visible action); `04.png` (the menu); transcript step 3: "No visible 'replace' button"                |
| 2   | 1        | wording         | The Replace page's "Higher means" sits on "Not set" for a file that was already ranked with a weight, so a returning user has to stop and read the line under it to learn the rerun will read weight the same way as before. Ruth stopped on it; nothing needed choosing.          | `05.png` ("Weight: weight auto", "Not set", the line under it); transcript step 5 and "What confused me"                       |
| 3   | 1        | discoverability | Hovering a node shows a hand pointer but no name or tooltip, so checking who the largest node is takes a click that also selects it.                                                                                                                                                   | `08.png` (no tooltip at 648,575); `09.png`; transcript step 8: "Pointer becomes a hand but no tooltip, no name"                 |
| 4   | 1        | trust           | Between Replace and Rerun the inspector's histogram, its "20 of 20 have a value, 0.03779 to 0.06394" line and the old Top 10 (Farah first) stay at full contrast with nothing on them saying they are out of date; only the bar above the tabs, the row icon and the key titles say so. Ruth was not misled. | `06.png`                                                                                                                       |
| 5   | 1        | visual          | The right-click menu covers the end of the source row's own counts ("20 nodes" is cut off) and the left end of the drawing key.                                                                                                                                                      | `04.png`                                                                                                                       |

Problems 1 to 3 rest on this one participant's remarks; problems 4 and 5 are seen on the
screenshots and are already described in the answer key as present on this build. None is
confirmed by this session alone.
