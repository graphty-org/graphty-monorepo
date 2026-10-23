# Grade: session r2-s01 -- Grace (returning), bus stops (T20 A), a number that means "farther"

**Grade: S** (success). The last screen (`16.png`) shows the right route and total: Summary "Path
5 nodes, 4 edges", "Total minutes 14"; Nodes in order Depot 1, Market 2, Park 3, Clinic 4,
Harbor 5; Made with From "Depot", To "Harbor", Follow "All", Weight "minutes (farther)". Grace took
the load-time route: she gave the minutes column the Weight role and chose Farther on the import
page before Load (`07.png`), and the Overview after loading read "Loaded weight minutes (farther)"
(`08.png`), so every later calculation reads the minutes as a length, as the task asks. She pointed
to Loaded weight, to the Path form's "minutes (farther, loaded)" before the run (`11.png`) and to
Made with's Weight row, all of which the answer key accepts. No detour.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: empty, no setup.

## The answer against the key

- **Route and total (right).** `16.png`, as above. Grace also checked the sum against the rows
  (4 + 3 + 4 + 3 = 14) and the obvious rival (Depot, Market, Library, Harbor = 15).
- **Meaning set at load (right).** `07.png`: role box "Weight", Higher means "Farther", summary
  "Weight: minutes (farther)". `08.png`: Overview "Loaded weight minutes (farther)", Direction
  "Directed". `work.json` agrees: one run, `shortest_path`, source `bus-stops.csv`.
- **Not a wrong answer.** Not `weight-not-read` (not Depot, Station, Harbor or Depot, School,
  Harbor); not `read-wrong` (she read "4 hops" as the number of rides, not as the minutes).

## Measures

- **Steps:** 15 `real.mjs` steps after the start (`02.png` to `16.png`); 14 that did something,
  since step 4 was refused by the tool and changed nothing. The round 2 route is 10. The extra 4
  are not detours: the analysis button plus a typed filter plus a click on Shortest path in place
  of the `p` key (3 steps for 1), and From and To each typed then picked from the suggestion
  (4 steps for 2). About 1.4x.
- **Wrong turns:** 0. Every move went forward. The step 4 refusal was an aiming slip caused by a
  duplicate accessible name (problem 6), not a wrong place.
- **False "done":** none. "Done" (`16.png`) is true: the route, the total and the weight meaning
  are on screen. truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. Load drew the graph and the Overview named the loaded weight;
  Find path drew the route, its key and the run's Values.
- **Numbers that disagree (bar 5):** none. "Total minutes 14" matches the four edges in the table.
- **Wrong weight reading without a sign (bar 7b):** no.
- **Broken habit:** none. Her history's first moves (Open project or file, the analysis button)
  both led on to the task.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot, and the tool named the
  ambiguous match it refused.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind               | Problem                                                                                                                                                                                                                                                                                      | Evidence                                                                                                                    |
| --- | -------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability    | A whole-number edge column starts with the role "Attribute", and the box gives no hint that "Weight" is among its choices. Grace found it only because the summary line "Weight: none (each edge counts 1)" sat below; she said "Attribute" alone would not have told her.                      | `04.png`; transcript end: "'Attribute' by itself would not have told me"                                                    |
| 2   | 2        | discoverability    | The analysis list opens on "Rank nodes and edges" (Degree, Betweenness, Closeness, PageRank...) with Shortest path below the fold. Grace found the route only by typing her own word, "quickest", into the filter; a user who scans instead of typing sees only rankings.                    | `09.png`, `10.png`; transcript: "I found the route only because I typed my own word"                                        |
| 3   | 1        | comprehension      | "As the file says" loaded undirected bus links as Directed, with arrows. Grace did not know what a CSV "says" about direction and only guessed that Follow "All" meant "either way along a line". It did not change the answer here.                                                          | `07.png` Direction; `08.png` Direction "Directed"; `11.png` Follow All                                                      |
| 4   | 1        | wording            | The run's row in the left panel reads "Shortest path 4 hops"; "hops" is not the participant's word (she said "rides"). She read it correctly.                                                                                                                                              | `16.png`                                                                                                                    |
| 5   | 1        | legibility         | No names are drawn on the nodes, so the black route on the canvas can be read only through Nodes in order.                                                                                                                                                                                  | `08.png`, `16.png`; transcript: "the picture alone told me nothing until the list on the right"                             |
| 6   | 1        | accessibility-name | The column header button "minutes" and the role box "Role of minutes" are both matched by the name "minutes"; the tool refused the click and nothing happened. Cost one step.                                                                                                               | `04.png` (unchanged screen); transcript step 4                                                                              |
| 7   | 0        | wording            | "Capacity" under Higher means was not understood; Grace did not need it.                                                                                                                                                                                                                    | `06.png`; transcript end                                                                                                    |

No severity 3 or 4: the answer was right, the meaning was set for every run, and every doubt she
raised was about wording or discoverability on a path she completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
