# Grade: session r3-s01 -- Nadia (returning), bus stops (T20 A), a number that means "farther"

**Grade: S** (success). The last screen (`13.png`) shows the right route and total: Summary "Path
5 nodes, 4 edges", "Total minutes 14"; Nodes in order Depot 1, Market 2, Park 3, Clinic 4,
Harbor 5; Made with Analysis "Shortest path", From "Depot", To "Harbor", Follow "All", Weight
"minutes (farther)". The left panel's run row reads "Shortest path minutes 14", and the route is
drawn black and thicker with a "Shortest path" key at the top left. Nadia took the load-time
route: she gave the minutes column the Weight role and chose Farther on the import page before
Load (`06.png`), and the Overview after loading read "Loaded weight minutes (farther)" (`07.png`),
so every later calculation reads the minutes as a length, as the task asks. She pointed to Loaded
weight, to the Path form's "minutes (farther, loaded)" before the run (`10.png`) and to Made
with's Weight row, all of which the answer key accepts. No detour.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty, no setup. Tool commit `acf3894e2c56`, no uncommitted
changes.

## The answer against the key

- **Route and total (right).** `13.png`, as above. Nadia also checked the sum against the import
  table (4 + 3 + 4 + 3 = 14) and the rivals she could see (via Library 15, via School 21); both
  rival sums are correct against the rows in `02.png`.
- **Meaning set at load (right).** `06.png`: role box "Weight", Higher means "Farther", summary
  "Weight: minutes (farther)". `07.png`: Overview "Loaded weight minutes (farther)", Direction
  "Directed". `work.json` agrees: one run, `shortest_path`, one source `bus-stops.csv`, nothing
  gone.
- **Not a wrong answer.** Not `weight-not-read` (not Depot, Station, Harbor or Depot, School,
  Harbor); not `read-wrong` (no 4 given as the minutes; the run row shows "minutes 14").
- **Follow "All".** Left on the default. Every edge of the found route runs in the file's own
  direction (Depot to Market, Market to Park, Park to Clinic, Clinic to Harbor, `02.png`), so the
  answer would be the same with Out. It does not change the grade.

## Measures

- **Steps:** 12 `real.mjs` steps after the start (`02.png` to `13.png`); 11 that did something,
  since step 3 (`03.png`, byte for byte the same as `02.png`) was refused by the tool and changed
  nothing. The round 2 route is 10 and the success path 11. The extra step is not a detour: the
  analysis button plus a typed filter plus a click on Shortest path (3 steps) in place of the `p`
  key (1 step), with From and To each counted once. About 1.1x the round 2 route.
- **Wrong turns:** 0. Every move went forward. The step 3 refusal was an aiming slip caused by a
  duplicate accessible name (problem 6), not a wrong place.
- **False "done":** none. "Done" (`13.png`) is true: the route, the total and the weight meaning
  are on screen. truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. Load drew the graph and the Overview named the loaded weight; Find path
  drew the route, its key and the run's Values.
- **Numbers that disagree:** none. "Total minutes 14" matches the four edges in the table and the
  run row's "minutes 14".
- **Wrong weight reading without a sign:** no.
- **Broken habit:** none. Her history's first moves (Open project or file, the analysis button)
  both led on to the task.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot, and the tool named the
  ambiguous match it refused; leaks.json shows no leaks.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind               | Problem                                                                                                                                                                                                                                                         | Evidence                                                                                       |
| --- | -------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability    | A whole-number edge column starts with the role "Attribute" and the summary "Weight: none (each edge counts 1)", and Load is enabled. The "Higher means" choice appears only after Weight is picked, and starts on "Not set". A user who presses Load at once gets paths that count stops. | `02.png`, `05.png`; transcript end: "If I'd hit Load straight away every path would have counted stops" |
| 2   | 2        | discoverability    | The analysis list names no route or "quickest" analysis on its first screen. Nadia found Shortest path only by typing "path" into the filter, and even then Betweenness was listed and highlighted first, with Shortest path under "Find paths and edge sets". | `08.png`, `09.png`; transcript step 7: "Nothing says 'route' on screen"                         |
| 3   | 2        | comprehension      | The graph loaded as Directed, and the Path form starts Follow on "All". Nadia did not know whether All lets the bus run a link backwards and left it unchanged. It did not change this answer (the route follows every edge's direction), but nothing on screen tells her whether her answer respects the one-way links. | `07.png` Direction "Directed"; `10.png` Follow All; `13.png` Made with Follow All; transcript end |
| 4   | 1        | wording            | "Closer / Farther / Capacity": she chose Farther from the sentence under the choices, not from the word.                                                                                                                                                        | `05.png`, `06.png`; transcript end                                                             |
| 5   | 1        | legibility         | No stop names are drawn on the nodes, so the black route on the canvas can be read only through Nodes in order; the drawing alone could not go into her file.                                                                                                     | `07.png`, `13.png`; transcript end                                                             |
| 6   | 1        | accessibility-name | The column header "minutes" and the role box are both matched by the name "minutes"; the tool refused the click and nothing happened. Cost one step.                                                                                                              | `03.png` (unchanged from `02.png`); transcript step 3                                          |

No severity 3 or 4: the answer was right, the meaning was set for every run, and every doubt she
raised was about wording or discoverability on a path she completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
