# Grade: session r3-s04 -- Jordan (regular analyst, marketing), hiking trails (T20 B), a number that means "farther"

**Grade: S** (success). The last screen (`14.png`) shows the right route and total: Summary "Path
5 nodes, 4 edges", "Total km 7.5"; Nodes in order Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5;
Made with Analysis "Shortest path", From "Trailhead", To "Summit", Weight "km (farther)". The tree
row reads "Shortest path km 7.5" and the route is drawn black and thicker under a "Shortest path"
key. Jordan took the load-time route: "Open project or file..." with trails.csv, the km column's
role set to Weight and Higher means to Farther on the import page before Load (`06.png`), and the
Overview after loading read "Loaded weight km (farther)" (`08.png`), so every later calculation
reads the kilometers as a length, as the task asks. He pointed to Made with's Weight row, "Total km
7.5" and the Overview's Loaded weight, all of which the answer key accepts.

Build seen: `26f3bb968e43 graphty@0.8.61` (`session.json`), the frozen build named in the
criteria, at 1440 x 900, with no uncommitted changes. Start: empty, no setup. The tool and the run
worked: every step left a screenshot, the session log is empty, `leaks.json` lists no leaks, and
`work.json` holds one run (`shortest_path`), its two route layers and the source `trails.csv`, with
nothing gone.

## The answer against the key

- **Route and total (right).** `14.png`, as above. Jordan also added the four rows from the import
  table (1.5 + 2 + 2.5 + 1.5 = 7.5) and checked the two-link rival, Trailhead, Pine Fork, Summit,
  at 9 km.
- **Meaning set at load (right).** `06.png`/`07.png`: role box "Weight", Higher means "Farther",
  summary "Weight: km (farther)". `08.png`: Overview "Loaded weight km (farther)". `11.png`: the
  Path form's Weight starts on "km (farther, loaded)".
- **Direction.** Jordan chose Undirected on the import page (`07.png`); the Overview reads
  "Undirected, set in the project" (`08.png`). The key's reference walk left it Directed. On this
  file the route and total are the same either way, so the answer is right; recorded as a
  difference from the reference, not a fault.
- **Not a wrong answer.** Not `weight-not-read` (not Trailhead, Pine Fork, Summit at 9 km).
- **Wording echo.** Jordan chose Farther from his own reasoning ("More km is a longer walk", step 5)
  before the helper line appeared, and did not quote it afterward beyond calling it "plain
  English". Prompt B's "shortest walk" shares "shortest" with the analysis name, which he typed
  into the analysis filter (step 10); report as the wording echo the task notes name, to be read
  against half A.

## Measures

- **Steps:** 13 `real.mjs` steps after the start (`02.png` to `14.png`); 12 that changed something,
  since step 3 (`--click "km"`) was refused as ambiguous and left the screen byte-identical
  (`02.png` and `03.png` have the same checksum). The round 2 route is 10 (success path 11). The
  extra 3: the ambiguous click (step 3); opening Direction to look at its choices (step 7), a
  deliberate choice the route does not need; and the analysis button, a filter and a click in
  place of the `p` key (3 steps for 1, steps 9 to 11), offset by From, To and Find path sharing
  steps. About 1.3x the route.
- **Wrong turns:** 0. Every move went forward. Step 3 was an aiming slip on a duplicated name
  (problem 4), not a wrong place.
- **Recovery:** not applicable (no wrong turn).
- **False "done":** none. "Done in one go" (step 14) and the debrief's answer are true: the route,
  the total and the weight meaning are on screen in `14.png`. truth-on-screen: holds.
- **Broken habit (a first move into a place the history names that leads nowhere):** no. The first
  move was "Open project or file...", which led to the import page where the weight is set; the
  analysis button "like I always do" led to Shortest path.
- **Silent commit (bar 4):** none. Load drew the graph and the Overview named the loaded weight;
  Find path drew the route, its key and the run's Values.
- **Numbers that disagree (bar 5):** none. "Total km 7.5" matches the four rows; "5 nodes, 4
  edges" matches the five names in order.
- **"Capacity", "Closer" or "Date or time" chosen:** no. Jordan remarked that "Capacity" meant
  nothing to him here.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.

## Problems

| Severity | Problem | Evidence |
| -------- | ------- | -------- |
| 2 | Direction defaults to "As the file says", and nothing on the import page says what that becomes for a CSV, which carries no direction. Jordan "couldn't tell what that would do" and set Undirected himself; a user who leaves the default loads a two-way trail map as whatever it turns out to be and is not told which. No wrong answer here (this file gives the same route either way). | `06.png`, `07.png`, `08.png`; transcript steps 6, 7 and debrief |
| 1 | The numeric km column loads as "Attribute" with "Weight: none (each edge counts 1)" and has to be changed by hand, then Higher means asked as a second question. The summary line and the "Until you do, a path counts every edge as one step" line made the gap visible ("I'd have missed that"), so it cost a step each, not a failure. | `02.png`, `05.png`, `06.png`; transcript steps 2, 5 |
| 1 | No junction names are drawn and two route nodes (Creek, Summit) nearly overlap near the bottom of the drawing, so the route cannot be read from the drawing; Jordan read it from Nodes in order and said he would need labels for a slide. Known on this build. | `08.png`, `14.png`; transcript step 8 and debrief |
| 1 | The column label above the role box and the preview's column header are both "km", so `--click "km"` was refused as ambiguous and did nothing; Jordan aimed at "Role of km" on the next step. | `02.png`, `03.png` (identical), `04.png`; transcript step 3 and debrief |
| 1 | "Capacity" beside Closer and Farther "means nothing to me here; it took a second read". It did not mislead him. | `05.png`; transcript debrief |
| 1 | With Higher means open, the preview's last row (line 14) is cut off at the bottom of the pane while the caption still reads "All 13 rows". Jordan did not remark on it. Known on this build. | `06.png`, `07.png` |

## Notes for scoring

- Task T20, half B, persona Jordan (`roster.md`, Jordan -- marketing network analyst). Start:
  empty. Build 26f3bb968e43. `session.json` records the task as `T20B`.
- First move: "Open project or file..." from the start screen; it offered the way on.
- Simulated participant: a pass is weak evidence until real people confirm it.
