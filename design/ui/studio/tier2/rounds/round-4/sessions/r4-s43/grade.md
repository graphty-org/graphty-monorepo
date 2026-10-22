# Grade: session r4-s43 -- Nadia (tier 1 graduate), running club (T21 A), the list was updated

**Grade: S** (success). Every part of the task is met. The file was replaced, not added: the left
panel's title reads "Graph friends-v2.csv" and `work.json` lists friends.csv under "gone" with
friends-v2.csv as the only source, while the PageRank run and all three style layers are kept
(start and end lists identical). The Replace page read "Was 20 nodes, 41 edges; now 20, 41"
(`06.png`). The run was redone: "Ran" moved from Oct 11, 3:34:19 AM (`02.png`, `08.png`) to
3:35:29 AM (`09.png`), the key reads 0.02872 to 0.08012 with no "out of date" in its titles, and
the Top 10 starts "Ava 0.08012". Nadia's answer -- first before Farah (0.06394), first now Ava
(0.08012), Farah second at 0.06556 -- matches the key on both names and every value she quoted.
The last screen (`09.png`) is the rerun's Values with exactly that Top 10: the end state agrees
with the answer.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (PageRank run, sized and colored by
PageRank, run inspector open on Style). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **First before (right).** Read from the run's Values before anything changed: Top 10 "Farah
  0.06394", "20 of 20 have a value, 0.03779 to 0.06394" (`02.png`).
- **Replaced, not added (right).** Left click on the Sources row, the source inspector's "..."
  ("Source actions"), "Replace with file...", friends-v2.csv, Replace (`04.png`, `05.png`,
  `06.png`). Counts 20 nodes, 41 edges, as the key.
- **Stale-read trap (avoided).** After Replace the app opened the Graph inspector (Overview, no
  Rerun, `07.png`), as the key describes for this route. Nadia read "Size: PageRank, out of date"
  on the key, opened the run (`08.png`, old Top 10 with Farah first still on screen under the
  "Data changed since this run" bar) and pressed Rerun before reading a name.
- **First now (right).** `09.png`: Top 10 Ava 0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141,
  all four as the key.
- **Work kept.** `work.json`: runs and layers unchanged; the "gone" friends.csv is the replacement
  the task asks for, not lost work (answer key, "For graders reading work.json").

## Measures

- **Route:** the source-inspector "..." route, which the key grades as the success path: Values,
  Data, the Sources row, Source actions, Replace with file... with the upload, Replace, PageRank,
  Rerun -- 8 steps (`02.png` to `09.png`), equal to the key's walked 8 for this route (two more
  than the right-click route's 6). No detour.
- **Wrong turns:** 0. Each step went where she aimed it.
- **False "done":** none. "Finished: yes" and every value claimed are on screen in `09.png`.
  truth-on-screen: holds.
- **"Closer" quoted from the weight line as a reason:** no. She stopped on "Higher means: Not set"
  (`06.png`) and left it, but her stated reason was the old run's Made with ("last month's run said
  the same (read as closer)"), not the line under the choice. The reasoning is correct; it cost a
  pause, not a step.
- **Silent commit:** none. Replace changed the panel title, the row icon and the key titles
  (`07.png`); Rerun changed the time, the range and the Top 10 (`09.png`).
- **Numbers that disagree:** none on the final screen. Between Replace and Rerun the histogram,
  "20 of 20 have a value" with the old range and the old Top 10 stay at full contrast with no mark
  on them (`08.png`); Nadia was not misled, but named it as a risk.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the upload was accepted
  (`setup.log`, `06.png`), and `leaks.json` shows no leaks over 23 calls.
- **Scripted exit:** not applicable; Nadia finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                   | Evidence                                                                                                                          |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Replacing a source is reachable only from the Data page, behind the source inspector's "..." (or the row's right-click menu); the Data page at rest and the Graph page show no way to replace a file. Nadia had to guess it lived there.                                                       | `03.png` (Sources row, no visible action); `05.png` (the menu); transcript "What confused me", first point                          |
| 2   | 2        | trust           | Between Replace and Rerun the run's histogram, its "20 of 20 have a value, 0.03779 to 0.06394" line and the old Top 10 (Farah first) stay at full contrast with nothing on them saying they are out of date; only the bar above the tabs, the row icon and the key titles say so. Nadia said she could have copied stale numbers. | `08.png`; transcript "What confused me", third point                                                                              |
| 3   | 1        | flow            | After a replacement made from the source inspector the app opens the Graph inspector, with no Rerun on screen; the run must be found again in the left list, where its only sign is a history icon with no words.                                                                          | `07.png`; transcript step 7 ("a little clock-like icon")                                                                          |
| 4   | 1        | wording         | The Replace page's "Higher means" sits on "Not set" for a file that was already ranked with a weight, with nothing saying it matches the current run's reading, so a returning user stops to decide whether to change it.                                                                   | `06.png` ("Weight: weight auto", "Not set"); transcript step 6 and "What confused me", second point ("same as your current run")   |
| 5   | 1        | flow            | A left click on the Sources row also opens a table drawer along the bottom of the canvas that pushes the drawing and its toolbar up and stays open through Replace and Rerun.                                                                                                              | `04.png` to `09.png`                                                                                                              |
| 6   | 1        | discoverability | No names are drawn on the nodes, so the drawing alone cannot say who is first; a screenshot for a report needs the Top 10 beside it.                                                                                                                                                      | `09.png`; transcript "What confused me", fourth point                                                                             |

Problems 1, 4 and 6 rest on this one participant's remarks; problems 2, 3 and 5 are seen on the
screenshots and are already described in the answer key as present on this build. None is
confirmed by this session alone.
