# Grade: session r4-s34 -- Alex (regular analyst), hiking trails (T20 B), a number that means "farther"

**Grade: S** (success). The load-time route, the right answer, and the right places pointed to.
Alex gave the km column the Weight role and chose "Farther" on the "Open as a new graph" page
before Load (`06.png`: "Weight: km (farther)", "a path takes the smallest total"), so the weight
was set at load, not per run. The last screen (`14.png`) shows the run's Values: Summary "Path
5 nodes, 4 edges", "Total km 7.5"; Nodes in order Trailhead 1, Creek 2, Meadow 3, Ridge 4,
Summit 5; Made with Analysis "Shortest path", From "Trailhead", To "Summit", Weight "km
(farther)". The answer key's B route is Trailhead, Creek, Meadow, Ridge, Summit, 7.5 km, and
Alex's answer matches it exactly. For "where the program says it used the kilometers" Alex named
the import page's summary, the Overview's "Loaded weight km (farther)" (`08.png`) and Made with's
Weight row "km (farther)" with "Total km 7.5" (`14.png`); the key accepts Loaded weight and Made
with's Weight row, and the import page's summary is true on `06.png`.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty (no setup), as T20 requires. Tool commit `435e878a1d4c`, no
uncommitted changes.

## The answer against the key

- **Route (right).** Trailhead, Creek, Meadow, Ridge, Summit (`14.png`, Nodes in order). Not the
  `weight-not-read` route Trailhead, Pine Fork, Summit (9 km).
- **Total (right).** "Total km 7.5" (`14.png`), also "km 7.5" beside "Shortest path" in the left
  panel's tree. Alex's hand check (1.5 + 2 + 2.5 + 1.5) agrees with lines 4 to 7 of the preview
  (`07.png`).
- **Weight set at load (right).** Role "Weight" and Higher means "Farther" on the import page
  (`05.png`, `06.png`), then Overview "Loaded weight km (farther)" (`08.png`). "Closer",
  "Capacity" and "Date or time" were never chosen.
- **Direction.** Alex changed Direction from "As the file says" to "Undirected" before Load
  (`07.png`; Overview "Direction Undirected, set in the project", `08.png`). The key notes that on
  B the route and total are the same with the graph undirected, so this does not change the
  answer. The path form then has no Follow row (`11.png`) and Made with lists no Follow
  (`14.png`), as expected for an undirected graph.
- **Pointed to (right).** Loaded weight and Made with's Weight, both on screen when read.
- **Work kept.** `work.json`: one Shortest path run, four style layers (node and edge defaults,
  the route's nodes and edges), source trails.csv; `gone` is empty.

## Measures

- **Route taken:** the round 2 route (Open project or file sends the CSV to the import page), with
  the path opened from the Analyze menu (filter "shortest") instead of the `p` key, and a
  Direction change the key's route does not have.
- **Steps:** 13 `real.mjs` steps after the start (`02.png` to `14.png`). Counted as the key counts
  (each type-then-pick of a node as one): open and choose the file 1, the refused "km" click 1,
  role 1, Weight 1, Farther 1, open Direction 1, Undirected 1, Load 1, Analyze 1, filter 1,
  Shortest path 1, From 1, To 1, Find path 1 = 14 against the route's 10. Under the 2x limit.
  The four extra are the Direction choice (2), the Analyze menu's search (2 steps where the `p`
  key is 1) and the refused click.
- **Wrong turns:** 0. Step 3 (`--click "km"`) was refused by the tool because two things carry
  that name (the column header and the "Role of km" box), and nothing changed on screen
  (`03.png` is byte-identical in size to `02.png`, 55785 bytes). Recorded as a lost step, not a
  detour in the app. The Direction change was a deliberate choice that left the answer right, not
  a wrong turn; it is recorded as problem 2 because unclear wording caused it.
- **False "done":** none. "Finished: yes" and every claim in the debrief (route, 7.5 km, the
  import summary, Loaded weight, Made with's Weight row, Total km) are true on `06.png`, `08.png`
  and `14.png`. truth-on-screen: holds.
- **Wording echo:** none that led the choice. Alex chose Farther at step 5 from the task's idea
  ("more km = longer walk = Farther") on `05.png`, where the helper line still read the "Not set"
  text; the "longer distance" line appears only after Farther (`06.png`). Prompt B's "shortest
  walk" shares "shortest" with the analysis name, and Alex typed "shortest" into the Analyze
  filter (step 9): a possible echo in finding the analysis, which the key accepts on B and which
  A measures without it.
- **Silent commit:** none. Each choice changed the summary line at once ("Weight: km", then
  "Weight: km (farther)"); Load drew the graph and the Overview; Find path drew the route and
  opened its Values.
- **Numbers that disagree:** none. 5 nodes and 4 edges match the five listed junctions; 7.5
  matches the file's km on the route's four rows.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the refused click was
  reported by the tool and left the page unchanged, and `leaks.json` shows no leaks over 34 calls.
- **Scripted exit:** not applicable; Alex finished.

## Problems

| #   | Severity | Kind            | Problem | Evidence |
| --- | -------- | --------------- | ------- | -------- |
| 1   | 2        | discoverability | On the import page the km column starts as "Attribute", and the only sign that the number will not count is the small line "Weight: none (each edge counts 1)". Making it count takes two separate choices (role Weight, then Higher means Farther), and Load is enabled with neither. A reader who skips that line loads a graph whose paths count links, the `weight-not-read` answer. | `02.png` ("Weight: none (each edge counts 1)", km role "Attribute"); debrief: "I had to know to change it ... without it I'd have loaded with Not set." |
| 2   | 2        | wording         | "Direction: As the file says" does not say what a CSV, which carries no direction, will load as (it loads Directed). Alex could not tell and switched to Undirected "to be safe", two extra steps. It did not change the answer on this file, but on a file with one-way links the guess would. | `07.png` (options As the file says / Directed / Undirected, nothing naming the result); transcript step 6: "'As the file says' doesn't tell me which one a CSV ends up as." |
| 3   | 2        | visual          | No junction names are drawn on the canvas, so the black route on the drawing cannot be read on its own; the route is read only from Nodes in order. Two route nodes (Creek and Summit) sit almost on top of each other at the bottom of the drawing. | `08.png`, `14.png` (unnamed dots, overlapping pair near 755,645 and 790,636); debrief: "the black path in the picture means nothing on its own" |
| 4   | 1        | discoverability | The Analyze menu opens on a list with no shortest path in view; Alex typed "shortest" into its filter to find it. Cost one extra step against the `p` key. | `09.png`, `10.png`; transcript step 8: "Typing 'shortest' rather than scrolling." |
| 5   | 0        | tool            | The km column's header and its role box share the name "km", so a click by that name is refused as ambiguous. A tool limitation, not something a sighted reader meets; noted because it cost a step. | `03.png` (unchanged from `02.png`); transcript step 3 |

Problems 1 to 5 rest on this one participant and are not confirmed by this session alone.
Problems 1, 3 and 4 match problems recorded in sessions r4-s30 and r4-s33 (T20); problem 2 is
close to r4-s33's direction problem, which was about the Follow row on a directed load rather
than the Direction box on the import page.
