# Grade: session r4-s35 -- Dana (regular analyst), bus stops (T20 A), a number that means "farther"

**Grade: S** (success). The last screen (`13.png`) shows the run "Shortest path" open on its
Values: Summary "Path 5 nodes, 4 edges", "Total minutes 14"; Nodes in order Depot 1, Market 2,
Park 3, Clinic 4, Harbor 5; Made with Analysis Shortest path, From Depot, To Harbor, Follow All,
Weight "minutes (farther)". The canvas key reads "Shortest path" beside a black swatch, and the
route's nodes and edges are drawn black and thicker. The left list reads "Shortest path
minutes 14". Every value matches the key's answer (Depot, Market, Park, Clinic, Harbor -- 14
minutes), and Dana named the same stops and total. The minutes were set as the weight at load,
with "Farther" chosen (`06.png`), so the "every calculation" half of the task holds: the graph's
Overview reads "Loaded weight minutes (farther)" (`07.png`) and the path's Weight list started on
"minutes (farther, loaded)" (`10.png`). Dana pointed to the Overview's Loaded weight and to Made
with's Weight row; the key accepts either. Neither wrong answer (`weight-not-read`: Depot,
Station, Harbor or Depot, School, Harbor) appears.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty, no setup. Tool commit `435e878a1d4c`, no uncommitted
changes.

## The answer against the key

- **Stops in order (right).** `13.png`, Nodes in order: Depot, Market, Park, Clinic, Harbor.
- **Total (right).** `13.png`: "Total minutes 14". Dana also added the four legs from the import
  preview (4 + 3 + 4 + 3 = 14, rows 2, 7, 8 and 9 of `03.png`) and compared the Library route
  (4 + 6 + 5 = 15); both sums match the table.
- **Where the minutes were used (right).** "Loaded weight minutes (farther)" in the graph's
  Overview (`07.png`, `10.png`) and "Weight minutes (farther)" under Made with (`13.png`). The load
  screen's "Weight: minutes (farther)" (`06.png`), which Dana also named, is a true third place.
- **Weight set at load, not per run (right).** Role of minutes set to Weight, Higher means set to
  Farther before Load (`05.png`, `06.png`). The path did not need a weight chosen again.
- **Work kept.** `work.json`: start empty, end one shortest-path run, its two style layers plus the
  default node and edge layers, one source bus-stops.csv; nothing gone.

## Measures

- **Route:** the round 2 route ("Open project or file..." from the start screen sends the file to
  the "Open as a new graph" page), the role box, Weight, Farther, Load, then the Analyze button,
  a filter for "path", Shortest path, From Depot, To Harbor, Find path. Opening the Path form
  through Analyze instead of the `p` key cost two extra steps; that is a different entrance, not a
  detour.
- **Steps:** 12 `real.mjs` steps after the start (`02.png` to `13.png`). The round 2 route walks
  in 10. With the type-then-pick pairs for From and To counted as one each (as the key says),
  Dana's count is 11, about 1.1x the success path.
- **Wrong turns:** 1. The click on "minutes" in step 2 matched two things (the column header and
  the "Role of minutes" box) and opened nothing (`03.png` is identical to `02.png`). Dana re-aimed
  at the role box at once. This is a target ambiguity in the tool's text matcher on a name the
  screen uses twice, not a wrong path through the app; counted, because it cost a step.
- **False "done":** none. "Done" in step 12 and every end claim (the stops, 14 minutes, the
  places that name the minutes) are true on `13.png` and `07.png`. truth-on-screen: holds.
- **Silent commit:** none. Each choice on the load page changed the summary line at once
  ("Weight: none (each edge counts 1)" to "Weight: minutes" to "Weight: minutes (farther)",
  `03.png`, `05.png`, `06.png`); Load drew the graph and opened the Overview; Find path drew the
  route and opened its Values.
- **Numbers that disagree:** none. 5 nodes and 4 edges match the five black nodes and four thick
  black edges on the canvas; 14 matches the preview table.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot and `leaks.json` shows no
  leaks over 29 calls. The one ambiguous click is the tool reporting a match on two elements, which
  it did correctly; it did not fail.
- **Scripted exit:** not applicable; Dana finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                       | Evidence                                                                                                         |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | defaults        | A numeric column named "minutes" comes in as "Attribute", and the load page offers Load at once with "Weight: none (each edge counts 1)". A reader who does not read that one line loads the file unweighted and later gets a fewest-stops route (Depot, Station, Harbor or Depot, School, Harbor) with nothing on the result screen that looks wrong at a glance. Dana caught it only by reading the line. | `02.png`, `03.png` ("Attribute", "Weight: none (each edge counts 1)", Load enabled); transcript end, first bullet |
| 2   | 2        | wording         | Under Higher means, "Capacity" meant nothing to Dana; she chose Farther only from the sentence that appears after the choice. The meaning of the other options is not shown before choosing.                                                                                                                                 | `05.png`, `06.png`; transcript end: "'Capacity' means nothing to me here"                                        |
| 3   | 2        | visual          | No stop names are drawn on the canvas and hovering was not tried, so the drawn route cannot be read as stops; Dana read the route only from Nodes in order. The answer key records this for both halves.                                                                                                                       | `07.png`, `13.png`; transcript step 6 and end                                                                    |
| 4   | 1        | wording         | "Follow: Out / All" is not explained; Dana left All without knowing what Out would change. On a Directed graph the choice decides whether one-way links are honored, and here she guessed. It did not change this answer.                                                                                                     | `10.png`, `13.png` (Follow All, Direction Directed in `07.png`); transcript step 10 and end                       |
| 5   | 1        | visual          | The type captions under the role boxes ("whole number", "text") and the "Higher means" label are small, low-contrast text that Dana called hard to read on a laptop.                                                                                                                                                           | `03.png`, `06.png`; transcript end, last bullet                                                                  |
| 6   | 1        | labeling        | The column header and the role box under it share the name "minutes", so a pointer aimed by name hits both. A sighted user clicking the visible box would not meet this; it shows mainly that the two controls carry the same accessible name.                                                                                | `02.png`, `03.png` (unchanged after the click); transcript step 2                                                |

All six rest on one participant and are not confirmed by this session alone. Problem 1 matches the
answer key's `weight-not-read` trap; Dana avoided it.
