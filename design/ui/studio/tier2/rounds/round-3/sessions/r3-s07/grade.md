# Grade: session r3-s07 -- Elena (tier 1 graduate, returning), bus stops (T20 A), a number that means "farther"

**Grade: S** (success). The last screen (`14.png`) shows the right route and total: Summary "Path
5 nodes, 4 edges", "Total minutes 14"; Nodes in order Depot 1, Market 2, Park 3, Clinic 4,
Harbor 5; Made with Analysis "Shortest path", From "Depot", To "Harbor", Follow "All", Weight
"minutes (farther)". The left panel's run row reads "Shortest path minutes 14", and the route is
drawn black and thicker with a "Shortest path" key at the top left. Elena took the load-time
route: she dropped the file on the window, gave the minutes column the Weight role and chose
Farther on the import page before Load (`07.png`), and the Overview after loading read "Loaded
weight minutes (farther)" (`08.png`), so every later calculation reads the minutes as a length, as
the task asks. She pointed to Made with's Weight row "minutes (farther)", to the import summary
"Weight: minutes (farther)" and to Loaded weight; the answer key accepts Made with's Weight row
and Loaded weight. No detour.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty, no setup. Tool commit `acf3894e2c56`, no uncommitted
changes.

## The answer against the key

- **Route and total (right).** `14.png`, as above. Elena checked the sum against the import table
  (Depot-Market 4, Market-Park 3, Park-Clinic 4, Clinic-Harbor 3 = 14) and the rival via School
  (9 + 12 = 21); both sums are correct against the rows in `03.png`.
- **Meaning set at load (right).** `07.png`: role box "Weight", Higher means "Farther", summary
  "Weight: minutes (farther)". `08.png`: Overview "Loaded weight minutes (farther)", Direction
  "Directed". `11.png`: the Path form's Weight starts on "minutes (farther, loaded)". `work.json`
  agrees: one run, `shortest_path`, one source `bus-stops.csv`, nothing gone.
- **Not a wrong answer.** Not `weight-not-read` (not Depot, Station, Harbor or Depot, School,
  Harbor); not `read-wrong` (no 4 given as the minutes; the run row shows "minutes 14").
- **The drop route.** Dropping the file on the start screen opened the same "Open as a new graph"
  page the round 2 route reaches through "Open project or file...", with the file already chosen
  (`03.png`). It is the load-time route, not the per-run route.
- **Follow "All".** Left on the default. Every edge of the found route runs in the file's own
  direction (Depot to Market, Market to Park, Park to Clinic, Clinic to Harbor, `03.png`), so the
  answer would be the same with Out. It does not change the grade.

## Measures

- **Steps:** 13 `real.mjs` steps after the start (`02.png` to `14.png`); 12 that did something,
  since step 04 (`04.png`, byte for byte the same as `03.png`) was refused by the tool and changed
  nothing. Counting From and To each as one step, as the key does: 12 against the round 2 route's
  10. The two extra are not a detour: the analysis button plus a typed filter plus a click on
  Shortest path (3 steps) in place of the `p` key (1 step). About 1.2x the round 2 route.
- **Wrong turns:** 0. Every move went forward. The step 04 refusal was an aiming slip caused by a
  duplicate accessible name (problem 6), not a wrong place.
- **False "done":** none. "I'm done" (`14.png`) is true: the route, the total and the weight
  meaning are on screen. truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **First move:** dismiss the usage banner, then drop the file on the window, the first thing her
  persona tries. It led straight on to the task.
- **Silent commit:** none. Load drew the graph and the Overview named the loaded weight; Find path
  drew the route, its key and the run's Values.
- **Numbers that disagree:** none. "Total minutes 14" matches the four edges in the table and the
  run row's "minutes 14".
- **Wrong weight reading without a sign:** no.
- **Possible wording echo:** she quoted the Farther helper line ("Travel time is exactly my
  thing"), which holds "travel time"; the line appears only after Farther is chosen, so it
  confirmed her choice rather than leading her to it. Recorded as the key asks.
- **Broken habit:** none. Her history's first moves (drop the file, the analysis button) both led
  on to the task.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot, and the tool named the
  ambiguous match it refused; leaks.json shows no leaks (0 calls).
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind               | Problem                                                                                                                                                                                                                                                                       | Evidence                                                                                                       |
| --- | -------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability    | A whole-number edge column starts with the role "Attribute" and the summary "Weight: none (each edge counts 1)", and Load is enabled. The "Higher means" choice appears only after Weight is picked. Elena found it only because she read the summary line; she does not use the word "weight" and picked it as "the only one that sounds like how much". | `03.png`, `06.png`; transcript end: "If I hadn't read that line, I'd have loaded it without the minutes"        |
| 2   | 2        | discoverability    | The analysis list names no route or "quickest" analysis by a word she uses (Degree, Betweenness, Closeness, PageRank, Katz, HITS). She found Shortest path only by typing "quickest" into the filter.                                                                        | `09.png`, `10.png`; transcript step 09 and end                                                                  |
| 3   | 2        | comprehension      | The graph loaded as Directed, and the Path form starts Follow on "All". Elena did not know what "Follow: Out / All" means and whether it matters for one-way buses, and left it unchanged. It did not change this answer, but nothing on screen tells her whether her answer respects the one-way links. | `08.png` Direction "Directed"; `11.png` Follow All; `14.png` Made with Follow All; transcript end               |
| 4   | 1        | wording            | "Not set / Closer / Farther / Capacity" made her stop; the sentence under the choices, not the word, convinced her.                                                                                                                                                           | `06.png`, `07.png`; transcript end                                                                              |
| 5   | 1        | legibility         | No stop names are drawn on the nodes, so she could not find Depot or Harbor on the drawing; the route can be read only through Nodes in order, and typing names into From and To was her only way in.                                                                         | `08.png`, `14.png`; transcript step 08 and end                                                                  |
| 6   | 1        | accessibility-name | The column header "minutes" and the role box are both matched by the name "minutes"; the tool refused the click and nothing happened. Cost one step.                                                                                                                          | `04.png` (unchanged from `03.png`); transcript step 04                                                          |

No severity 3 or 4: the answer was right, the meaning was set for every run, and every doubt she
raised was about wording or discoverability on a path she completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
