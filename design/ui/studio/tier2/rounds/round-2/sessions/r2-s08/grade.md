# Grade: session r2-s08 -- Dana (returning), hiking trails (T20 B), a number that means "farther"

**Grade: S** (success). The last screen (`15.png`) shows the right route and total: Summary "Path
5 nodes, 4 edges", "Total km 7.5"; Nodes in order Trailhead 1, Creek 2, Meadow 3, Ridge 4,
Summit 5; Made with From "Trailhead", To "Summit", Follow "All", Weight "km (farther)". Dana took
the load-time route: she gave the km column the Weight role and chose Farther on the import page
before Load (`05.png`, `06.png`), and the Overview after loading read "Loaded weight km (farther)",
Direction "Directed" (`07.png`), so every later calculation reads the kilometers as a length, as
the task asks. She pointed to the import summary, Loaded weight, the Path form's "km (farther,
loaded)" and Made with's Weight row; the answer key accepts Loaded weight and Made with's Weight.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: empty, no setup.

Assignment note: the roster lists Dana under T20 A (bus stops) and T20 B under Grace, Nadia, Tom
and Jordan, but this session ran T20 B (session.json `"task": "T20B"`). The session itself is
valid; the half-by-persona count in the roster's table is off by one for T20 and should be
reconciled when the round is tallied.

## The answer against the key

- **Route and total (right).** `15.png`, as above. Dana also checked it against the preview table
  (`03.png`): 1.5 + 2 + 2.5 + 1.5 = 7.5, against Trailhead, Pine Fork, Summit = 9 and Trailhead,
  Pine Fork, Meadow, Ridge, Summit = 8. Both of her sums are correct.
- **Meaning set at load (right).** `06.png`: role box "Weight", Higher means "Farther", summary
  "Weight: km (farther)". `07.png`: Overview "Loaded weight km (farther)". `work.json` agrees: one
  run, `shortest_path`, source `trails.csv`, nothing gone.
- **Not a wrong answer.** Not `weight-not-read` (not Trailhead, Pine Fork, Summit); not
  `read-wrong` (she doubted "4 hops" but took the total from "Total km 7.5").
- **Wording echo:** none. She quoted "a path takes the smallest total" from the Farther line, not
  its "longer distance" example, and only after choosing Farther.

## Measures

- **Steps:** 14 `real.mjs` steps after the start (`02.png` to `15.png`), all of which did
  something. The round 2 route is 10. The extra 4 are not detours: the analysis button plus a
  typed filter plus a click on Shortest path in place of the `p` key (3 steps for 1), and the km
  role box opened then Weight picked as separate steps; From and To each typed then picked. About
  1.4x, inside bar 11's 2x.
- **Wrong turns:** 0. Every move went forward; no click was refused or missed.
- **False "done":** none. "Done" (`15.png`) is true: the route, the total and the weight meaning
  are on screen. truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. Load drew the graph and the Overview named the loaded weight;
  Find path drew the route, its key and the run's Values.
- **Numbers that disagree (bar 5):** one label disagrees in kind, not in value: the left panel's
  run row says "4 hops" beside a result totalled in km (problem 2). The hop count is true (4
  edges), so this is not a wrong number.
- **Wrong weight reading without a sign (bar 7b):** no.
- **Broken habit:** none. Her history's first moves (Open project or file, the analysis button)
  both led on to the task.
- **Implementation defects met:** none. No tool error, no console error reported, no refused
  click, no control that failed to respond. Every problem below is about wording, defaults or
  legibility, not a broken build.
- **Build-decided:** no. **Void:** no.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                      | Evidence                                                                                                         |
| --- | -------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The km column starts with the role "Attribute", and Load is enabled while no column is the weight. The only sign that the kilometers will be ignored is the small line "Weight: none (each edge counts 1)". Dana caught it because the task told her the kilometers mattered, and said that otherwise she "would have hit Load". Predicted, not observed here; observed as the same gap in r2-s01. | `03.png` (role "Attribute", "Weight: none (each edge counts 1)", Load enabled); transcript debrief                |
| 2   | 2        | comprehension   | The run's row in the left panel reads "Shortest path 4 hops" while the answer is a weighted total in km. Dana said it "reads like it counted trails" and briefly doubted that the kilometers were used; she resolved it only from "Total km 7.5" on the right.                                                                                | `15.png` left panel; transcript step 15 and debrief                                                              |
| 3   | 1        | legibility      | No names are drawn on the nodes, so the black route on the canvas cannot be read without Nodes in order; Creek and Summit nearly overlap at the bottom of the drawing.                                                                                                                                                                       | `07.png`, `15.png` (overlapping black nodes near 755,645 and 790,636); transcript: "the picture alone tells me nothing" |
| 4   | 1        | comprehension   | "As the file says" loaded two-way trails as Directed, with arrows. Dana left it alone and guessed that Follow "All" meant both directions; she was not sure what would have happened otherwise. It did not change the answer here.                                                                                                             | `06.png` Direction; `07.png` Direction "Directed"; `10.png` Follow All; transcript debrief                       |
| 5   | 1        | wording         | "Weight" is not the participant's word for a length or cost; "Higher means: Closer / Farther / Capacity" made sense only on reading the line under it.                                                                                                                                                                                       | `04.png`, `05.png`; transcript steps 04-05 and debrief                                                           |
| 6   | 0        | wording         | "Capacity" under Higher means was read as "a truck lane" and ignored; she did not need it.                                                                                                                                                                                                                                                  | `05.png`; transcript step 05                                                                                     |

No severity 3 or 4: the answer was right, the meaning was set for every run, and every doubt she
raised was about wording, a default or legibility on a path she completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
