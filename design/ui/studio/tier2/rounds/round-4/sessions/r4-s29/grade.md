# Grade: session r4-s29 -- Grace (tier 1 graduate), bus stops (T20 A), a number that means "farther"

**Grade: S** (success). The last screen (`17.png`) holds every value in the key. Values: Summary
"Path 5 nodes, 4 edges", "Total minutes 14"; Nodes in order Depot 1, Market 2, Park 3, Clinic 4,
Harbor 5; Made with Analysis Shortest path, From Depot, To Harbor, Follow All, Weight "minutes
(farther)". The canvas key at the top left reads "Shortest path" beside a black swatch, and the
route's nodes and edges are drawn black and thicker. The left tree's row reads "Shortest path
minutes 14". Grace answered "Depot -> Market -> Park -> Clinic -> Harbor, 14 minutes", and pointed
to "Weight: minutes (farther)" under Made with and to "Loaded weight: minutes (farther)" in the
Overview right after Load (`08.png`); the key accepts either. The weight was set at load
(role Weight, Higher means Farther, `06.png`, `07.png`), not in the path form, so the task's
"every calculation" condition is met. Neither wrong answer (Depot, Station, Harbor or Depot,
School, Harbor) appeared at any point.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty, no setup. Tool commit `435e878a1d4c`, no uncommitted
changes.

## The answer against the key

- **Route (right).** `17.png` Nodes in order: Depot, Market, Park, Clinic, Harbor.
- **Total (right).** `17.png` "Total minutes 14". Grace also checked it against the file's rows
  (4 + 3 + 4 + 3) and compared two longer routes (15 and 21 minutes).
- **Where the minutes were used (right).** `17.png` Made with Weight "minutes (farther)";
  `08.png` Overview "Loaded weight: minutes (farther)", Nodes 10, Edges 17, Direction Directed.
- **Work kept.** `work.json` starts empty (empty start) and ends with one Shortest path run, its
  two style layers over the two default layers, one source bus-stops.csv; nothing gone.

## Measures

- **Route:** the round 2 route (start screen "Open project or file..." with the file chosen in the
  same step), the role box opened by its accessible name "Role of minutes" rather than a click
  point, and Shortest path reached through the Analyze button and its filter ("quickest") rather
  than the `p` key.
- **Steps:** 14 `real.mjs` steps through Find path, counting each type-then-pick of From and To as
  one (`02.png` to `17.png`). Of these, one was a click the tool refused as ambiguous
  ("minutes" matched both the column header and the role box; nothing changed, `04.png` equals
  `03.png`) and one was a hover over "Out" that showed nothing (`16.png`). Without those two, 12
  steps against the round 2 route's 10; the two extra are the Analyze-and-filter way in (3 steps)
  in place of one `p` key press. Within bar 11's 2x.
- **Wrong turns:** 0. The refused click is a tool refusal on a shared name, not a move in the app;
  the Analyze list was searched, not abandoned.
- **False "done":** none. "Done" at step 17 and the end claims (route, 14 minutes, both places that
  name the minutes) all hold on `17.png` and `08.png`. truth-on-screen: holds.
- **Silent commit:** none. Each role, Higher means and Load step changed the summary line or the
  screen (`06.png`, `07.png`, `08.png`); Find path drew the route and opened its Values.
- **Numbers that disagree:** none. Nodes 10 and Edges 17 match the import page's counts and the
  file; Path 5 nodes, 4 edges matches the five ordered stops.
- **Weight read wrong way round (bar 7b):** no. The run read "minutes (farther)" and returned the
  smallest total.
- **Wording echo:** Grace called the Farther line "exactly my sentence" ("such as a longer distance
  or travel time"). That line shows only after Farther is chosen (`07.png` against `06.png`), and
  Grace chose Farther from "Not set / Closer / Farther / Capacity" before seeing it, so it did not
  lead there. Recorded as the possible echo the key asks for, with no effect on the grade.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the refused click was
  reported by the tool with nothing changed, and `leaks.json` shows no leaks over 36 calls.
- **Scripted exit:** not applicable; Grace finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                       | Evidence                                                                                                                         |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | defaults        | The minutes column starts as "Attribute" and the page reads "Weight: none (each edge counts 1)", with Load enabled. A reader who presses Load at once gets every later path counted in hops, the wrong route the key names. Grace caught it only because the prompt said the minutes had to count. | `03.png` (minutes role "Attribute", "Weight: none (each edge counts 1)"); transcript end: "a hurried person would press Load and get a path counted in hops" |
| 2   | 2        | wording         | "Follow: Out / All" on the path form has no explanation and no tooltip on hover. Grace guessed All means both directions; on a directed bus file the choice can change the route, and nothing says which one is in force or why.                       | `15.png`, `16.png` (hover over "Out" shows nothing); transcript step 16                                                          |
| 3   | 1        | visual          | No stop names are drawn on the canvas, so the black route can be read only through the right panel's Nodes in order. The Park-to-Clinic route edge also ends under the large Clinic node with no visible arrowhead (about 862,661), as the key records. | `17.png`; transcript end: "For a slide I would have to put names on"                                                             |
| 4   | 1        | discoverability | The Analyze list shows no route or path item in its first screen (Degree, Betweenness, Closeness, PageRank, Eigenvector...); Shortest path was found only by typing in its filter. It cost two extra steps here.                                           | `09.png`, `10.png`                                                                                                               |
| 5   | 1        | naming          | The "minutes" column header button and the "Role of minutes" box share the word "minutes", so a reader (or assistive tech) going by the visible word meets two targets. Here it made the tool refuse one click; nothing changed in the app.            | `04.png` (same as `03.png`); transcript step 4                                                                                   |

Problems 1 to 5 rest on one participant and are not confirmed by this session alone. Problem 3's
missing arrowhead and problem 1's start state are already recorded in the answer key.
