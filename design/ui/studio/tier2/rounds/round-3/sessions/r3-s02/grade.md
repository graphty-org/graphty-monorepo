# Grade: session r3-s02 -- Grace (returning), hiking trails (T20 B), a number that means "farther"

**Grade: S** (success). The last screen (`14.png`) shows the right route and total: Summary "Path
5 nodes, 4 edges", "Total km 7.5"; Nodes in order Trailhead 1, Creek 2, Meadow 3, Ridge 4,
Summit 5; Made with Analysis "Shortest path", From "Trailhead", To "Summit", Weight "km
(farther)". The left panel's run row reads "Shortest path km 7.5", and the route is drawn black
and thicker with a "Shortest path" key at the top left. Grace took the load-time route: she gave
the km column the Weight role and chose Farther on the import page before Load (`06.png`, summary
"Weight: km (farther)"), and the Overview after loading read "Loaded weight km (farther)"
(`08.png`), so every later calculation reads the kilometers as a length, as the task asks. She
pointed to Loaded weight, to the Path form's "km (farther, loaded)" before the run (`11.png`) and
to Made with's Weight row, all of which the answer key accepts. No detour.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty, no setup. Tool commit `acf3894e2c56`, no uncommitted
changes.

## The answer against the key

- **Route and total (right).** `14.png`, as above. Her hand check is right against the import
  table (`07.png`): 1.5 + 2 + 2.5 + 1.5 = 7.5; Trailhead, Pine Fork, Summit = 9; via Lookout =
  4 + 3 + 1.5 = 8.5; Trailhead, Pine Fork, Meadow, Ridge, Summit = 3 + 1 + 2.5 + 1.5 = 8.
- **Meaning set at load (right).** `06.png`: role box "Weight", Higher means "Farther".
  `08.png`: Overview "Loaded weight km (farther)". `work.json` agrees: one run, `shortest_path`,
  one source `trails.csv`, nothing gone.
- **Not a wrong answer.** Not `weight-not-read` (not Trailhead, Pine Fork, Summit); not
  `read-wrong`; Farther chosen, not Closer, Capacity or "Date or time".
- **Direction set to Undirected.** She changed Direction from "As the file says" to "Undirected"
  before Load (`07.png`, `08.png` "Undirected, set in the project"), so the Path form has no Follow
  row and Made with lists none. The key says B's route and total are the same with the graph set
  undirected; the change does not affect the grade, and it was a deliberate choice for trails that
  go both ways, not a detour.

## Measures

- **Steps:** 13 `real.mjs` steps after the start (`02.png` to `14.png`); 12 that did something,
  since step 3 (`03.png`, byte for byte the same as `02.png`) was refused by the tool as ambiguous
  and changed nothing. With From and To each counted once (type then pick), that is 11 against
  the round 2 route's 10 and the success path's 11. The extra is the Direction list (one step) and
  the analysis button plus a typed filter plus a click on Shortest path (3 steps) in place of the
  `p` key (1 step). About 1.1x the round 2 route; well inside bar 11's 2x.
- **First move:** "Open project or file..." (her habit), which led to the import page and on to
  the task.
- **Wrong turns:** 0. Every move went forward. The step 3 refusal was an aiming slip caused by a
  shared accessible name (problem 4), not a wrong place; opening Direction was a deliberate check.
- **False "done":** none. "Done" (`14.png`) is true: the route, the total and the weight meaning
  are on screen. truth-on-screen: holds; every claim in her debrief (the import summary, Loaded
  weight, the Path form's Weight, Total km and Made with) is on a screenshot.
- **Silent commit:** none. Choosing Weight and Farther changed the summary at once (`05.png`,
  `06.png`); Load drew the graph and the Overview named the loaded weight (`08.png`); Find path
  drew the route, its key and the run's Values (`14.png`).
- **Numbers that disagree:** none. "Total km 7.5" matches the four edges in the table and the run
  row's "km 7.5".
- **Wrong weight reading without a sign:** no.
- **Broken habit:** none. Her history's moves (Open project or file, the analysis button) both led
  on to the task.
- **Wording echo:** she quoted the Farther line ("a longer distance or travel time; a path takes
  the smallest total") after choosing Farther, which the key says to record as a possible echo. It
  appeared only after the choice and did not lead her to it: she chose Farther from the "Higher
  means" question and the "Not set" helper line (`05.png`).
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot, the tool named the
  ambiguous match it refused, and leaks.json shows no leaks. **Scripted exit:** not applicable;
  she finished.

## Problems

| #   | Severity | Kind               | Problem                                                                                                                                                                                                                                                                                                  | Evidence                                                                                          |
| --- | -------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | 2        | comprehension      | Direction's default "As the file says" means nothing for a CSV: a spreadsheet does not state a direction, and nothing on the import page says it will load directed. Grace changed it to Undirected to be safe. It did not change this answer, but a user who leaves it gets a directed graph without knowing. | `07.png` (list open, "As the file says" checked); transcript step 6, debrief                        |
| 2   | 1        | wording            | "Weight" was the only plausible role for km, and Grace feared it meant a strong tie (as in her earlier donor map), the opposite of a long walk. The "Higher means" question right after resolved it at once.                                                                                               | `04.png`, `05.png`; transcript steps 4, 5                                                          |
| 3   | 1        | legibility         | No junction names are drawn, and Creek and Summit, both on the route, sit almost on top of each other (about 755,645 and 790,636), so the black route can be read only through Nodes in order. Known on this build (answer key T20 B).                                                                     | `14.png`; transcript debrief                                                                       |
| 4   | 1        | accessibility-name | The column header "km" and the role box "Role of km" are both matched by the name "km"; the tool refused the click and nothing happened. Cost one step. Same finding as r3-s01 on the minutes column.                                                                                                     | `03.png` (identical to `02.png`); transcript step 3                                                 |

No severity 3 or 4: the answer was right, the meaning was set for every run, and every doubt she
raised was about wording, legibility or a default she checked on a path she completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
