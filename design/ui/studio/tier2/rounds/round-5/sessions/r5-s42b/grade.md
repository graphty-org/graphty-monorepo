# Grade: session r5-s42b -- Ruth (tier 1 graduate), team (T21 B), the list was updated

**Grade: S** (success). The last screen (`12.png`) matches the answer key's B end state: the left
panel's title reads "Graph team-v2.csv", the PageRank row reads 14, and the run's inspector shows
"ran Oct 11, 10:38:17 AM", "14 of 14 have a value, 0.02333 to 0.1339, median 0.04819", and a Top 10
that starts Di 0.1339, Hal 0.1305, Ed 0.1245. The drawing's key reads 0.02333 to 0.1339 with no
"out of date" in either title. Ruth answered 14 people (was 12), first before Hal (0.1293), first
now Di (0.1339) -- all three key values, each read from the screen.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900. Start: the team setup (team.csv loaded, PageRank run, nodes sized and
colored by PageRank). Tool commit `753bae997bc6`, no uncommitted changes.

## The answer against the key

- **Replaced (right).** `06.png`: "Replace: team-v2.csv", "Was 12 nodes, 16 edges; now 14, 21",
  "21 edge rows read; the load makes 14 nodes and 21 edges". `07.png`: Overview Nodes 14, Edges 21.
  `work.json`: team.csv under "gone", team-v2.csv the only source; the run and all three layers
  kept. That is the replacement the task asks for, not lost work.
- **Rerun (right).** `09.png`: the run's time changed from 10:37:01 to 10:38:17, the row reads 14,
  the two new people are colored, and the key and Values show the new range.
- **First before: Hal (right).** Read at `02.png` from the Values' Top 10 before the replacement
  ("Hal 0.1293", "12 of 12 have a value").
- **First now: Di (right), 14 people (right).** Read at `09.png` after Rerun, not from the stale
  state at `07.png`/`08.png`. No `stale-read`.
- **Route:** the source inspector's "..." ("Source actions") route the key records for round 2:
  Values, Data, the Sources row (left click), Source actions, Replace with file... with
  team-v2.csv, Replace, PageRank, Rerun -- 8 steps, the key's count for this route (two more than
  the right-click route). Then three more to save the project (Main menu, Save, the dialog's Save),
  which the task did not ask for and which changed nothing about the answer.

## Measures

- **Steps:** 11 `real.mjs` steps after the start: 8 for the task, the key's count for the route
  taken, plus 3 to save.
- **Wrong turns:** 0. Every step moved forward; the save was an extra, deliberate step to keep the
  result, not a detour.
- **False "done":** none. "14 people", "Hal first before", "Di first now, Hal second at 0.1305",
  "same settings (PageRank, weight read as closer, damping 0.85)" and "Saved in the browser" are all
  true on `09.png` and `12.png` ("Saved team in this browser."). truth-on-screen holds.
- **Silent commit:** none. Replace showed the before and after counts first; Rerun changed the time
  and the values visibly.
- **Numbers that disagree:** none on the final screen. Between Replace and Rerun the row read 12
  while the Overview read 14 (`07.png`), the key's expected stale state; Ruth read it correctly as
  out of date.
- **Key watch items:** Ruth quoted the "Higher means" line ("PageRank reads higher as closer until I
  choose") as her reason to leave the weight meaning unset (`06.png`, transcript step 06). She read
  the two blue dots as "the two newcomers, with no rank yet" -- right, and not as a selection or
  highlight -- but noted nothing on screen said so. She did not read the re-laid-out drawing as lost
  work. She did not stop on "Weight: weight auto".
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Twelve screenshots for twelve steps; `leaks.json` shows no
  leaks over 26 calls; the setup log shows a clean load.
- **Scripted exit:** not applicable; Ruth finished.

## Problems

| #   | Severity | Kind         | Problem | Evidence |
| --- | -------- | ------------ | ------- | -------- |
| 1   | 2        | findability  | Replacing a file is reached only from the source's own panel (an unlabeled "..." after clicking the Sources row) or the row's right-click menu. Nothing on the Graph page, the out-of-date run, or the Data page at rest points to it; Ruth found it by guessing that "..." was "the likeliest place". | `03.png` (Sources row, no visible action at rest), `04.png`-`05.png` ("..." top right, menu with "Replace with file..."); transcript "What confused me", first item |
| 2   | 2        | trust        | Between Replace and Rerun the old histogram, "12 of 12 have a value" and the old Top 10 (Hal first) stay at full contrast with no mark on them; only the "Data changed since this run" bar above the tabs says they are old. A reader who scrolls past the bar could copy stale numbers. Ruth caught it only because she read the bar. | `08.png`; transcript step 08 and "What confused me", second item; matches the key's note for both halves |
| 3   | 2        | feedback     | After Replace the two new people are drawn as saturated blue dots that the key does not explain; Ruth guessed "not ranked yet". | `07.png` (two blue dots, key titles "out of date" with no entry for blue); transcript step 07 and "What confused me", third item |
| 4   | 1        | feedback     | After a replacement made from the source panel the app shows the Graph inspector, not the run, so Rerun is not on screen; the PageRank row's only sign is a history icon with no words, and the left panel's "Graph team-v2.csv" sits beside the unchanged project name "team" with nothing relating the two. Ruth found Rerun by clicking the row, one step. | `07.png` (Graph inspector, row icon, "team" in the top bar); `08.png` |
| 5   | 1        | study setup  | Ruth's history says she saved the project and reopened it from Recent projects, but the setup builds this project fresh from team.csv and never saves it, so plain Save correctly asked "Save team as" -- which Ruth read as the program forgetting an earlier save and was unsure whether it would overwrite or duplicate. The app behaved right for an unsaved project; the mismatch is between the history and the setup. | `11.png` ("Save team as", name "team"); `session.json` setup (no save step); transcript "What confused me", fourth item |

Problems 2 and 3 are the key's own documented watch items for this task on both halves; problem 1
repeats the route cost the key records for the "..." route. Whether each counts as confirmed depends
on the other T21 sessions of this round.
