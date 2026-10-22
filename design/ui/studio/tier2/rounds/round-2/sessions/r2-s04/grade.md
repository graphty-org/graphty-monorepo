# Grade: session r2-s04 -- Alex (regular analyst, weekly), hiking trails (T20 B), a number that means "farther"

**Grade: S** (success). The last screen (`19.png`) shows the right route and total: Summary "Path
5 nodes, 4 edges", "Total km 7.5"; Nodes in order Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5;
Made with Analysis "Shortest path", From "Trailhead", To "Summit", Weight "km (farther)". Alex took
the load-time route: "Open project or file..." with trails.csv, the km column's role set to Weight
and Higher means to Farther on the import page before Load (`07.png`), and the Overview after
loading read "Loaded weight km (farther)" (`10.png`), so every later calculation reads the
kilometers as a length, as the task asks. He pointed to Loaded weight, to "Total km 7.5" and to
Made with's Weight row, all of which the answer key accepts. No detour.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (`session.json`), the frozen build named in the
criteria, at 1440 x 900. Start: empty, no setup. The tool and the run worked: every step left a
screenshot, the session log is empty, and `work.json` holds one run (`shortest_path`), its two
route layers and the source `trails.csv`, with nothing gone.

## The answer against the key

- **Route and total (right).** `19.png`, as above. Alex also added the four rows by hand
  (1.5 + 2 + 2.5 + 1.5 = 7.5) and compared the rival routes he could see in the table.
- **Meaning set at load (right).** `07.png`: role box "Weight", Higher means "Farther", summary
  "Weight: km (farther)". `10.png`: Overview "Loaded weight km (farther)". `14.png`: the Path
  form's Weight starts on "km (farther, loaded)".
- **Direction.** Alex chose Undirected on the import page (`08.png`, `09.png`); the Overview reads
  "Undirected, set in the project" (`10.png`). The key's reference walk left it Directed. On this
  file the route and total are the same either way, so the answer is right; recorded as a
  difference from the reference, not a fault.
- **Not a wrong answer.** Not `weight-not-read` (not Trailhead, Pine Fork, Summit at 9 km); not
  `read-wrong` (he read "4 hops" in the tree as a count of edges, not as the kilometers).
- **Wording echo.** Alex did not quote the "Farther" helper line ("such as a longer distance or
  travel time"); he chose Farther from his own reasoning ("More km is a longer walk") before that
  line appeared. Prompt B's "shortest walk" shares "shortest" with the analysis name, which he
  typed into the analysis filter ("shortest"); report as the wording echo the task notes name, to
  be read against half A.

## Measures

- **Steps:** 18 `real.mjs` steps after the start (`02.png` to `19.png`); 17 that changed
  something, since step 4 (`--click "km"`) left the screen byte-identical (`03.png` and `04.png`
  have the same checksum). The round 2 route is 10 (success path 11). The extra 8 are not
  detours: one ambiguous click (step 4); two to open Direction and pick Undirected (steps 8, 9), a
  deliberate choice the route does not need; the analysis button hovered, clicked, filtered and
  the analysis clicked in place of the `p` key (4 steps for 1); From and To each typed then taken
  with Enter (4 steps for 2). About 1.8x.
- **Wrong turns:** 0. Every move went forward. Step 4 was an aiming slip on a duplicated name
  (problem 5), not a wrong place.
- **Recovery:** not applicable (no wrong turn).
- **False "done":** none. "That's my answer. Ending." (step 19) is true: the route, the total and
  the weight meaning are on screen in `19.png`. truth-on-screen: holds.
- **Broken habit (a first move into a place the history names that leads nowhere):** no. The first
  move was "Open project or file...", which the history names, and it led to the import page where
  the weight is set.
- **Silent commit (bar 4):** none. Load drew the graph and the Overview named the loaded weight;
  Find path drew the route, its key ("On the path") and the run's Values.
- **Numbers that disagree (bar 5):** none. "Total km 7.5" matches the four rows; "5 nodes, 4
  edges" matches "4 hops".
- **"Capacity", "Closer" or "Date or time" chosen:** no.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.

## Problems

| Severity | Problem | Evidence |
| -------- | ------- | -------- |
| 2 | Direction defaults to "As the file says", and nothing on the import page says what that becomes for a CSV, which carries no direction. Alex set Undirected himself "to be safe"; a hurried user would load a two-way trail map with whatever the default turns out to be and not know which. No wrong answer here (this file gives the same route either way). | `04.png`, `08.png`, `09.png`; transcript steps 7, 8 and outcome |
| 1 | The numeric column loads as "Attribute" with "Weight: none (each edge counts 1)" and has to be changed by hand, then Higher means asked as a second question. The summary line made the gap visible and the helper line after Farther said exactly what a path would do, so it cost one step each, not a failure; Alex compared it with NetworkX's single `weight='km'`. | `04.png`, `06.png`, `07.png`; transcript steps 3, 6 and outcome |
| 1 | No junction names are drawn and two route nodes (Creek, Summit) nearly overlap, so the route cannot be read from the drawing; Alex read it from Nodes in order and typed the names into From and To. Known on this build. | `10.png`, `19.png`; transcript step 10 and outcome |
| 1 | The tree row says "Shortest path 4 hops" while the number the task asks for, "Total km 7.5", appears only in the right panel. Not misread here. | `19.png`; transcript outcome |
| 1 | The column label above the role box and the preview's column header are both "km", so a click on "km" does not reach the role box (here it changed nothing). Alex aimed at the box on the next step. | `03.png`, `04.png`, `05.png`; transcript step 4 |
| 1 | Once Higher means appears, the preview's last row (line 14) is cut off at the bottom of the pane while the caption still reads "All 13 rows". Alex did not remark on it. Known on this build. | `07.png`, `08.png` |

## Notes for scoring

- Task T20, half B, persona Alex (`analyst-alex.md`; history in `tier2/roster.md`, Alex). Start:
  empty. Build 8f0d5a6f7791.
- First move: "Open project or file..." from the start screen, a place the history names; it
  offered the way on.
- Simulated participant: a pass is weak evidence until real people confirm it.
