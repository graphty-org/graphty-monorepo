# Grade: session r4-s30 -- Nadia (tier 1 graduate), hiking trails (T20 B), a number that means "farther"

**Grade: S** (success). The load-time route, the right answer, and the right place pointed to.
Nadia gave the km column the Weight role and chose "Farther" on the "Open as a new graph" page
before Load (`06.png`: "Weight: km (farther)"), so the weight was set at load, not per run. The
last screen (`14.png`) shows the run's Values: Summary "Path 5 nodes, 4 edges", "Total km 7.5";
Nodes in order Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5; Made with Analysis "Shortest
path", From "Trailhead", To "Summit", Follow "All", Weight "km (farther)". The answer key's B route
is Trailhead, Creek, Meadow, Ridge, Summit, 7.5 km, and Nadia's answer matches it exactly. For
"where the program says it used km" she named Made with's Weight row "km (farther)" and the
Overview's "Loaded weight km (farther)" (`07.png`), both of which the key accepts, plus the Path
popover's Weight box "km (farther, loaded)" before the run (`10.png`), which also counts.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty (no setup), as T20 requires. Tool commit `435e878a1d4c`, no
uncommitted changes.

## The answer against the key

- **Route (right).** Trailhead, Creek, Meadow, Ridge, Summit (`14.png`, Nodes in order). Not the
  `weight-not-read` route Trailhead, Pine Fork, Summit.
- **Total (right).** "Total km 7.5" (`14.png`), also "km 7.5" beside "Shortest path" in the left
  panel's tree. Not added by hand.
- **Weight set at load (right).** Role "Weight" and Higher means "Farther" on the import page
  (`05.png`, `06.png`), then Overview "Loaded weight km (farther)", Direction "Directed" (`07.png`).
  "Closer", "Capacity" and "Date or time" were never chosen.
- **Pointed to (right).** Made with's Weight "km (farther)" and Overview "Loaded weight km
  (farther)", both on screen at the time she read them.
- **Work kept.** `work.json`: one Shortest path run, four style layers (node and edge defaults,
  the route's nodes and edges), source trails.csv; `gone` is empty.

## Measures

- **Route taken:** the round 2 route (Open project or file sends the CSV to the import page), with
  the path opened from the Analyze menu instead of the `p` key: Analyze, type "shortest" into its
  filter, click Shortest path. The key grades this route as the success path.
- **Steps:** 13 `real.mjs` steps after the start (`02.png` to `14.png`). Counted as the key counts
  (each type-then-pick of a node as one): open and choose the file 1, the refused "km" click 1,
  role 1, Weight 1, Farther 1, Load 1, Analyze 1, filter 1, Shortest path 1, From 1, To 1, Find
  path 1 = 12 against the route's 10. Under the 2x limit of bar 11. The two extra are the Analyze
  menu's search (2 steps where the `p` key is 1) and the refused click.
- **Wrong turns:** 0. Step 3 (`--click "km"`) was refused by the tool because two things carry
  that name (the column header and the "Role of km" box) and nothing changed on screen; Nadia went
  straight to the role box next. Recorded as a lost step, not a detour in the app.
- **False "done":** none. "Finished? Yes" and every claim in the end statement (route, 7.5 km,
  the four places the weight is named) are true on `07.png`, `10.png` and `14.png`.
  truth-on-screen: holds.
- **Wording echo:** none. Nadia chose "Farther" at step 6 from the task's own idea ("more km is a
  longer walk") before the helper line "...such as a longer distance or travel time..." was on
  screen; that line appears only after Farther is chosen (`06.png`).
- **Silent commit:** none. Each choice changed the summary line at once ("Weight: km", then
  "Weight: km (farther)"); Load drew the graph and the Overview; Find path drew the route and
  opened its Values.
- **Numbers that disagree:** none. 5 nodes and 4 edges match the five listed stops; 7.5 matches
  1.5 + 2 + 2.5 + 1.5 from the file (`06.png`, lines 4 to 7).
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the refused click was
  reported by the tool and left the page unchanged (`03.png`), and `leaks.json` shows no leaks
  over 32 calls.
- **Scripted exit:** not applicable; Nadia finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                         | Evidence                                                                                                                                       |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | On the import page the km column starts as "Attribute", and the only sign that the number will not count is the small line "Weight: none (each edge counts 1)". Making it count takes two separate choices (role Weight, then Higher means Farther), and Load is enabled with neither. A reader who does not already know to open the role box loads a graph whose paths count links, the `weight-not-read` answer. Nadia knew to look, because her task named it. | `02.png` ("Weight: none (each edge counts 1)", km role "Attribute", Load enabled); transcript end: "I had to know to open the role dropdown and pick Weight, then pick Farther" |
| 2   | 2        | trust           | "Direction: As the file says" loads the trails as Directed with arrowheads, though trails go both ways. Nothing in words says the path form's "Follow: All" ignores the arrows, so Nadia could not tell whether the walk honored one-way links. It did not change the answer here (the key notes the route is the same either way on this file), but she finished unsure. | `07.png` (Overview "Direction Directed"); `10.png` ("Follow Out | All", no explanation); transcript end: "nothing said so in words"                 |
| 3   | 2        | visual          | No junction names are drawn on the canvas, and Creek and Summit, both on the route, sit almost on top of each other (about 755,640 and 790,636). The route can be read only from the Nodes in order list, not from the drawing she would hand to QA.                                                    | `14.png`; transcript end: "the picture alone would not tell QA which junctions are on the path"                                                  |
| 4   | 1        | discoverability | The Analyze menu opens on a list (Degree, Betweenness, ...) with no shortest path in view; Nadia had to type into its filter to find it. Cost one extra step against the `p` key.                                                                                                            | `08.png`, `09.png`                                                                                                                             |
| 5   | 0        | tool            | The km column's header and its role box share the name "km", so a click by that name is refused as ambiguous. A tool limitation, not something a sighted reader meets; noted because it cost a step.                                                                                           | `03.png` (unchanged from `02.png`); transcript step 3                                                                                          |

Problems 1 to 4 rest on this one participant and are not confirmed by this session alone; problem
3 matches what the answer key already records for B on earlier builds.
