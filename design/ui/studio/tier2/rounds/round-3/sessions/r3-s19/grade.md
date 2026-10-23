# Grade: session r3-s19 -- Alex (returning analyst), running club (T21 A), the list was updated

**Grade: S** (success). The last screen (`10.png`) shows the graph replaced and the ranking redone:
the left panel reads "Graph friends-v2.csv", the PageRank row is still there with 20 and no
out-of-date icon, and the run's inspector has no "Data changed since this run" bar. Its Values'
Top 10 starts "Ava 0.08012", then Farah 0.06556, Hana 0.06428, Ivan 0.06141, and the key at the top
left reads 0.02872 to 0.08012 with no "out of date" in its titles. The Ran time moved from 5:25:31
PM (`02.png`) to 5:26:36 PM (`07.png`, `10.png`). Alex reported Farah (0.06394) as first before,
read from the Values before the replacement (`02.png`), and Ava (0.08012) as first now, read after
Rerun (`07.png`). Both names and values match the key. The run, its Size and Color styling and the
"Influence" layer were kept. He took the right-click route with no detour, then saved the project.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked` (friends.csv loaded, PageRank run, Size and
Color by PageRank). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **First before (right).** `02.png`: Top 10 starts "Farah 0.06394"; key 0.03779 to 0.06394;
  Ran Oct 10, 5:25:31 PM.
- **Replaced, not added (right).** `05.png`: page titled "Replace: friends-v2.csv", "Was 20 nodes,
  41 edges; now 20, 41", confirm button "Replace". `06.png` and later: left panel "Graph
  friends-v2.csv". `work.json`: sources at the end are only friends-v2.csv, friends.csv under
  "gone"; runs and all three layers the same as at the start. That is the replacement the task asks
  for, not `work-lost` and not `added-not-replaced`.
- **Rerun (right).** `06.png` shows the stale state (bar "Data changed since this run" with
  Rerun, history icon on the row, key titles "Size: PageRank, out of date" and "Color: PageRank,
  out of date", old Top 10 still Farah first). Alex named the stale state and did not report from
  it. `07.png`: after Rerun, Top 10 "Ava 0.08012", key 0.02872 to 0.08012.
- **First now (right).** Ava 0.08012. Not `stale-read` (he did not report Farah as the new first).
- **Weight.** Left on "Not set" on the Replace page (`05.png`), on the grounds that the earlier run
  assumed closer, so the comparison is like for like. He quoted "closer" as his reason, from the
  run's Made with ("read as closer by assumption", transcript step 1) and the Replace page
  ("same as last month's run (which assumed closer)", step 4), as the key asks graders to record.
  Nothing needed choosing; it does not change the grade.

## Measures

- **Steps:** 9 `real.mjs` steps after the start (`02.png` to `10.png`). The task itself took 6
  (`02.png` to `07.png`), exactly the success path (Values, Data, right-click the source row,
  Replace with file plus upload, Replace, Rerun). The last 3 (Main menu, Save, Save in the dialog)
  saved the project, which his history says he does after every rerun; not a detour.
- **Wrong turns:** 0.
- **False "done":** none. "Done" (`10.png`) is true: the new ranking is on screen, the run is no
  longer marked out of date, and the notice "Saved friends in this browser." confirms the save.
  truth-on-screen: holds. His claim that the run and styling were kept is borne out by `work.json`.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. Replace showed the out-of-date marks; Rerun cleared them and changed
  the Ran time.
- **Numbers that disagree:** none. Top 10, histogram caption and key agree after Rerun
  (0.02872 to 0.08012, `07.png`).
- **Stale read:** no; caught and named at `06.png` ("The Top 10 still shows the old values").
- **Moved drawing read as lost work:** no (A keeps the drawing's shape).
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; leaks.json shows no
  leaks.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind            | Problem | Evidence |
| --- | -------- | --------------- | ------- | -------- |
| 1   | 2        | discoverability | The Data page's source row shows no replace control at rest: "Replace with file..." is only on the row's right-click menu (or a "..." that appears on hover). Alex found it by right-clicking "on a hunch". A user who does not right-click sees no way to swap the file. | `03.png` (no visible action on the row); transcript step 2 and wrap-up |
| 2   | 2        | stale-display   | Between Replace and Rerun the Values' histogram, "20 of 20 have a value" with the old range, and the old Top 10 (Farah first) stay at full contrast with no mark of their own; the only marks are the bar at the top, the row's wordless history icon and the key's titles. Alex noticed, but a reader who scrolls the Top 10 can take the old order for the new file's. | `06.png`; transcript step 5 |
| 3   | 1        | missing-feature | After Rerun the earlier ranking is gone from the screen; there is no previous run or before/after view. Alex knew the old first only because he read it before swapping, and would have to copy numbers by hand every week. | `07.png` against `02.png`; transcript wrap-up |
| 4   | 1        | comprehension   | The weight's meaning is still "Not set" on the Replace page and the run says it "assumed" closer; Alex wants to settle it once rather than see it every time. Nothing on the replace screen offers to carry the previous run's reading as a setting. | `05.png` ("Higher means" Not set), `07.png` Made with; transcript wrap-up |
| 5   | 1        | expectation     | Plain Save (Ctrl+S) opened a "Save friends as" naming dialog on a project Alex believed was already saved. The setup loaded the file without saving it, so a name prompt is right for this state; the top bar's "Local only" did not tell him the project had never been saved. | `08.png`, `09.png`; transcript step 8 and wrap-up |

No severity 3 or 4: both names were right, the stale state was marked well enough that Alex
caught it, and the replacement kept every run and layer.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
