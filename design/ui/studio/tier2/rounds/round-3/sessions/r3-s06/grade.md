# Grade: session r3-s06 -- Tom (tier 1 graduate), hiking trails (T20 B), a number that means "farther"

**Grade: S** (success). The last screen (`16.png`) shows the right route and total: Summary "Path
5 nodes, 4 edges", "Total km 7.5"; Nodes in order Trailhead 1, Creek 2, Meadow 3, Ridge 4,
Summit 5; Made with Analysis "Shortest path", From "Trailhead", To "Summit", Follow "All", Weight
"km (farther)". The left panel's run row reads "Shortest path km 7.5", and the route is drawn black
and thicker with a "Shortest path" key at the top left. Tom took the load-time route: he gave the
km column the Weight role and chose Farther on the import page before Load (`07.png`), and the
Overview after loading read "Loaded weight km (farther)" (`08.png`), so every later calculation
reads the kilometers as a length, as the task asks. He pointed to Made with's Weight row, to
"Total km 7.5", to the Path form's "km (farther, loaded)" before the run (`11.png`) and to Loaded
weight; the answer key accepts Loaded weight and Made with's Weight row. No detour.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty, no setup. Tool commit `acf3894e2c56`, no uncommitted
changes.

## The answer against the key

- **Route and total (right).** `16.png`, as above. Tom also checked the sum against the import
  table (1.5 + 2 + 2.5 + 1.5 = 7.5) and two rivals (via Pine Fork and Meadow 8; Creek, Lake,
  Summit 9). Both rival sums are correct against the rows in `07.png`.
- **Meaning set at load (right).** `07.png`: role box "Weight", Higher means "Farther", summary
  "Weight: km (farther)". `08.png`: Overview "Loaded weight km (farther)", Direction "Directed".
  `work.json` agrees: one run, `shortest_path`, one source `trails.csv`, nothing gone.
- **Not a wrong answer.** Not `weight-not-read` (not Trailhead, Pine Fork, Summit, 9.0 km); not
  `read-wrong` (no 4 given as the kilometers; the run row shows "km 7.5").
- **Follow "All".** Left on the default. Every edge of the found route runs in the file's own
  direction (Trailhead to Creek, Creek to Meadow, Meadow to Ridge, Ridge to Summit, `07.png`), so
  the answer would be the same with Out. It does not change the grade.

## Measures

- **Steps:** 15 `real.mjs` steps after the start (`02.png` to `16.png`). Step 3's click on "km"
  (`04.png`, byte for byte the same as `03.png`) was refused by the tool and changed nothing. With
  the From and To type-then-pick pairs each counted once, as the key counts them, that is 13
  steps, 12 that did something. The round 2 route is 10 and the success path 11. The extra steps
  are not a detour: the analysis button plus a typed filter plus a click on Shortest path (3 steps)
  in place of the `p` key (1 step). About 1.2x the round 2 route.
- **Wrong turns:** 0. Every move went forward. The step 3 refusal was an aiming slip caused by a
  duplicate accessible name (problem 6), not a wrong place.
- **False "done":** none. "Done" (`16.png`) is true: the route, the total and the weight meaning
  are on screen. truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. Load drew the graph and the Overview named the loaded weight; Find path
  drew the route, its key and the run's Values.
- **Numbers that disagree:** none. "Total km 7.5" matches the four edges in the table and the run
  row's "km 7.5".
- **Wrong weight reading without a sign:** no.
- **Broken habit:** none. His history's first moves (Open project or file, the analysis button)
  both led on to the task.
- **Wording echo:** Tom chose Farther at step 6, before the line "A higher weight means farther
  apart, such as a longer distance ..." appeared, so it could not lead him there. His reason
  ("more kilometers is a longer walk") came from the task.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot, and the tool named the
  ambiguous match it refused; leaks.json shows no leaks.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind               | Problem                                                                                                                                                                                                                                                                     | Evidence                                                                                                         |
| --- | -------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability    | A number column starts with the role "Attribute" and the summary "Weight: none (each edge counts 1)", and Load is enabled. The "Higher means" choice appears only after Weight is picked, and starts on "Not set". A user who presses Load at once gets paths that count links. | `03.png`, `06.png`; transcript end: "If I hadn't read that line I'd have loaded it as is"                         |
| 2   | 2        | discoverability    | The analysis list shows no path analysis on its first screen. Tom found Shortest path only by typing "shortest" into the filter, and even then Betweenness was listed and highlighted first, with Shortest path last under "Find paths and edge sets".                    | `09.png`, `10.png`; transcript step 8: "Nothing says 'shortest walk' on this part of the list"                   |
| 3   | 2        | comprehension      | The graph loaded as Directed, and the Path form starts Follow on "All". Tom did not understand "Directed" for trails walked both ways and left Direction and Follow unchanged. It did not change this answer, but nothing on screen tells him whether the route respects or ignores the file's directions. | `08.png` Direction "Directed"; `11.png` Follow All; `16.png` Made with Follow All; transcript end                |
| 4   | 1        | legibility         | No junction names are drawn on the nodes, and Creek and Summit overlap at the bottom of the drawing, so Tom could not find the Trailhead or read the route from the picture; only Nodes in order told him.                                                                  | `08.png`, `16.png` (two black nodes overlapping at about 755,645 and 790,636); transcript end                      |
| 5   | 1        | wording            | "Capacity" under Higher means is a word Tom did not know; he left it alone.                                                                                                                                                                                                 | `06.png`; transcript step 5 and end                                                                              |
| 6   | 1        | accessibility-name | The column header "km" and the role box are both matched by the name "km"; the tool refused the click and nothing happened. Cost one step.                                                                                                                                 | `04.png` (unchanged from `03.png`); transcript step 4                                                            |

No severity 3 or 4: the answer was right, the meaning was set for every run, and every doubt he
raised was about wording or discoverability on a path he completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
