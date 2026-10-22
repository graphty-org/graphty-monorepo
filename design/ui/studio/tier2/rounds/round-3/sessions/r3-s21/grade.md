# Grade: session r3-s21 -- Jordan (returning), running club list updated (T21 A)

**Grade: S** (success). The last screen (`07.png`) shows the replaced data and the rerun: left
panel "Graph friends-v2.csv", PageRank row 20; inspector subtitle "ran Oct 10, 5:31:26 PM" (was
5:30:25 PM in `02.png`), no "Data changed since this run" bar; key titles "Size: PageRank" and
"Color: PageRank" with no "out of date", range 0.02872 to 0.08012; Values "20 of 20 have a value";
Top 10 starts Ava 0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141. Jordan reported "before:
Farah (0.06394), now: Ava (0.08012)", both right against the key. The run and its layers survived
the swap (`work.json`: the same run and three layers at start and end; source friends.csv gone,
friends-v2.csv present). No detour.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Setup: friends.csv loaded, PageRank run and sized by PageRank. Tool
commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **First before (right).** `02.png`: Values' Top 10 starts "Farah 0.06394", read before any
  change, key 0.03779 to 0.06394.
- **Replaced, not added (right).** `05.png`: "Replace: friends-v2.csv", "Was 20 nodes, 41 edges;
  now 20, 41", confirm button "Replace" beside Cancel. `07.png` and `work.json`: one source,
  friends-v2.csv; still 20 people.
- **First now (right).** `07.png`: Ava 0.08012, then Farah 0.06556, Hana 0.06428, Ivan 0.06141, as
  the key gives.
- **Not a stale read.** At `06.png` the old Top 10 (Farah first) was on screen under the
  out-of-date bar; Jordan named the bar and the "out of date" key titles and pressed Rerun before
  reading a new name. Not `stale-read`, not `added-not-replaced`, not `work-lost`.
- **Weight meaning.** Jordan left "Higher means" on "Not set" to match the earlier run, reasoning
  from the run's Made with ("weight read as closer"), not from the Replace page's line about
  "closer". Nothing there needed choosing for this task.

## Measures

- **Steps:** 6 `real.mjs` steps after the start (`02.png` to `07.png`), the same as the success
  path (Values, Data, right-click the source row, Replace with file plus upload, Replace, Rerun).
- **Wrong turns:** 0.
- **False "done":** none. "I have both answers" (`07.png`) is true: both names are on screen or
  were read from `02.png`. truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. Replace returned to the Graph page with the run marked out of date;
  Rerun redated the run and redrew the key.
- **Numbers that disagree:** none.
- **Broken habit:** none. The Data place, named in the history, led on to the task.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; leaks.json shows no
  leaks; setup.log shows the setup file chosen.
- **Scripted exit:** not applicable; Jordan finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                | Evidence                                                                                                   |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The Sources row shows no menu button at rest; "Replace with file..." is reached only by a right-click (or a "..." that appears only on hover). Jordan found it "on a hunch" and expected a less stubborn user to start a new project and lose the work. | `03.png` (row with no "..."), `04.png` (right-click menu); transcript steps 3-4 and debrief                 |
| 2   | 1        | comprehension   | The Replace page's "Higher means" starts on "Not set" and does not say what the replaced source had; Jordan had to work it out from the run's Made with to keep the two rankings comparable.                                                           | `05.png`; transcript step 5 and debrief                                                                    |
| 3   | 1        | stale display   | Between Replace and Rerun the old histogram and Top 10 (Farah first) stay at full contrast with no mark on them; only the bar above and the key's titles say "out of date". Jordan was not misled, but a quick reader could take Farah as the new top.  | `06.png`                                                                                                   |

No severity 3 or 4: the task succeeded on the shortest route with no wrong turn, and the
out-of-date bar with its Rerun button was read correctly.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
