# Grade: session r4-s36 -- Elena (tier 1 graduate), hiking trails (T20 B), a number that means "farther"

**Grade: S** (success). The load-time route, the right answer, and the right places pointed to.
Elena gave the km column the Weight role and chose "Farther" on the "Open as a new graph" page
before Load (`07.png`: "Weight: km (farther)", the km role box reading "Weight", Farther chosen),
so the weight was set at load, not per run. The last screen (`15.png`) shows the run's Values:
Summary "Path 5 nodes, 4 edges", "Total km 7.5"; Nodes in order Trailhead 1, Creek 2, Meadow 3,
Ridge 4, Summit 5; Made with Analysis "Shortest path", From "Trailhead", To "Summit", Follow
"All", Weight "km (farther)". The answer key's B route is Trailhead, Creek, Meadow, Ridge,
Summit, 7.5 km, and Elena's answer matches it exactly. For "where the program says it used the
km" she named the import page's summary, the Overview's "Loaded weight km (farther)" (`08.png`),
the Path form's Weight box "km (farther, loaded)" (`11.png`, per the transcript) and Made with's
Weight row "km (farther)" with "Total km 7.5" (`15.png`); the key accepts Loaded weight, Made
with's Weight row and the pre-run Weight box.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty (no setup), as T20 requires. Tool commit `435e878a1d4c`, no
uncommitted changes.

## The answer against the key

- **Route (right).** Trailhead, Creek, Meadow, Ridge, Summit (`15.png`, Nodes in order). Not the
  `weight-not-read` route Trailhead, Pine Fork, Summit (9 km).
- **Total (right).** "Total km 7.5" (`15.png`), also "km 7.5" beside "Shortest path" in the left
  panel's tree. It matches lines 4 to 7 of the preview (1.5 + 2 + 2.5 + 1.5, `07.png`).
- **Weight set at load (right).** Role "Weight" and Higher means "Farther" on the import page
  (`06.png`, `07.png`), then Overview "Loaded weight km (farther)" (`08.png`). "Closer",
  "Capacity" and "Date or time" were never chosen.
- **Direction.** Left at "As the file says"; the graph loaded Directed (`08.png`) and the Path
  form's Follow stayed on All (Made with "Follow All", `15.png`). The key notes the route and
  total are the same either way on B.
- **Pointed to (right).** Loaded weight, the pre-run Weight box and Made with's Weight, each on
  screen when read.
- **Work kept.** `work.json`: one Shortest path run, four style layers (node and edge defaults,
  the route's nodes and edges), source trails.csv; `gone` is empty.

## Measures

- **Route taken:** the success path (New from data, choose the file, role, Weight, Farther,
  Load), with the path opened from the Analyze menu (filter "shortest") instead of the `p` key.
- **Steps:** 14 `real.mjs` steps after the start (`02.png` to `15.png`). Counted as the key counts
  (each type-then-pick of a node as one): No thanks 1, New from data 1, choose the file 1, the
  refused "km" click 1, role 1, Weight 1, Farther 1, Load 1, Analyze 1, filter 1, Shortest path 1,
  From 1, To 1, Find path 1 = 14 against the success path's 11. Under the 2x limit. The three
  extra are the Analyze menu's search (2 steps where the `p` key is 1) and the refused click.
- **Wrong turns:** 0. Step 4 (`--click "km"`) was refused by the tool because two things carry
  that name (the column header and the "Role of km" box), and nothing changed on screen
  (`04.png` is byte-identical in size to `03.png`, 55785 bytes). Recorded as a lost step, not a
  detour in the app.
- **False "done":** none. "Finished: yes" and every claim in the debrief (route, 7.5 km, the
  import summary and helper line, Loaded weight, the Path form's "km (farther, loaded)", Made
  with's Weight row, Total km) are true on `07.png`, `08.png`, `11.png` and `15.png`.
  truth-on-screen: holds.
- **Wrong belief on the way (not a claim of done):** on `08.png` Elena guessed the large central
  node was the Summit; nothing on screen says so, and she corrected herself on `15.png`. It did
  not enter the answer.
- **Wording echo:** none that led the choice. Elena chose Farther at step 7 from the task's idea
  ("more km is a longer walk") on `06.png`, where the helper line still read the "Not set" text;
  the "longer distance" line appears only after Farther (`07.png`), and her debrief quotes it
  afterwards. Prompt B's "shortest walk" shares "shortest" with the analysis name, and she typed
  "shortest" into the Analyze filter (step 10): a possible echo in finding the analysis, which the
  key accepts on B.
- **Silent commit:** none. Each choice changed the summary line at once ("Weight: km", then
  "Weight: km (farther)"); Load drew the graph and the Overview; Find path drew the route and
  opened its Values.
- **Numbers that disagree:** none. 5 nodes and 4 edges match the five listed junctions; 7.5
  matches the file's km on the route's four rows.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the refused click was
  reported by the tool and left the page unchanged, and `leaks.json` shows no leaks over 34 calls.
- **Scripted exit:** not applicable; Elena finished.

## Problems

| #   | Severity | Kind            | Problem | Evidence |
| --- | -------- | --------------- | ------- | -------- |
| 1   | 2        | discoverability | On the import page the km column starts as "Attribute", and the only sign that the number will not count is the small line "Weight: none (each edge counts 1)". Making it count takes two separate choices (role Weight, then Higher means Farther), and Load is enabled with neither. A reader who skips that line loads a graph whose paths count links, the `weight-not-read` answer. | `03.png` ("Weight: none (each edge counts 1)", km role "Attribute"); debrief: "If I had just pressed Load, I think the path would have counted trails, not km, and I would not have known." |
| 2   | 2        | visual          | No junction names are drawn on the canvas and hovering shows none, so the drawing cannot be read on its own; Elena took the large central node for the Summit. Two route nodes (Creek and Summit) sit almost on top of each other at the bottom of the drawing. The route is read only from Nodes in order. | `08.png`, `15.png` (unnamed dots, overlapping pair near 755,645 and 790,636); transcript step 8 ("That big one in the middle must be the Summit") and step 15 ("the big ball in the middle wasn't the Summit at all") |
| 3   | 1        | wording         | "Higher means: Not set / Closer / Farther / Capacity" -- "Capacity" carries no example until chosen, so a reader cannot tell what it would do; it gave Elena pause though she chose right. | `06.png`; debrief: "'Capacity' meant nothing to me." |
| 4   | 1        | wording         | "Direction: As the file says" does not say what a CSV, which carries no direction, will load as (it loads Directed, with arrows on the drawing). Elena did not notice the box before Load and, after seeing arrows and "Directed" on trails that go both ways, could not tell whether it mattered. No effect on this answer (Follow All was preselected). | `07.png` (Direction "As the file says"), `08.png` ("Direction Directed", arrowheads); debrief: "I never noticed the 'Direction' box on the load page and do not know if it mattered." |
| 5   | 1        | discoverability | The Analyze menu opens on a ranking list with no shortest path in view; Elena typed "shortest" into its filter to find it. Cost one extra step against the `p` key. | `09.png`, `10.png`; transcript step 9 |
| 6   | 0        | tool            | The km column's header and its role box share the name "km", so a click by that name is refused as ambiguous. A tool limitation, not something a sighted reader meets; noted because it cost a step. | `04.png` (unchanged from `03.png`); transcript step 4 |

Problems 1 to 6 rest on this one participant and are not confirmed by this session alone.
Problems 1, 2, 5 and 6 match problems recorded in session r4-s34 (T20 B); problem 4 is close to
r4-s34's Direction problem, where the participant switched to Undirected because the same
wording did not say what a CSV loads as.
