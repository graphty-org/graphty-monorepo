# Grade: session r2-s03 -- Jordan, bus stops (T20 A), a number that means "farther"

**Grade: S** (success). The route and the total are right: Depot, Market, Park, Clinic, Harbor,
14 minutes. The minutes were given their meaning at load ("Weight: minutes (farther)" before
Load), so every calculation reads them, and the run says so in two places Jordan named: the graph's
Overview "Loaded weight minutes (farther)" and the run's Made with "Weight minutes (farther)".
Jordan took the round 2 route ("Open project or file..." from the start screen, through the Data
page) and reached Shortest path through the analysis button, one of the doors the path has. No
detour, no wrong turn.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900, no uncommitted changes.

## The answer against the key

- **Route and total (right).** `15.png`, the last screenshot: Summary "Path 5 nodes, 4 edges",
  "Total minutes 14"; Nodes in order Depot 1, Market 2, Park 3, Clinic 4, Harbor 5; Made with From
  Depot, To Harbor, Follow All, Weight "minutes (farther)". The route is drawn black and thicker
  with the key "Shortest path / On the path" at the top left of the canvas. Jordan checked the sum
  against the preview rows (4 + 3 + 4 + 3 = 14) and against two other routes (15 and 21).
- **Set at load, for every calculation.** `06.png`: the minutes column's role is Weight, Higher
  means is Farther, the summary reads "Weight: minutes (farther)". `08.png` and `10.png`: the
  Overview reads "Loaded weight minutes (farther)", Direction Directed. `10.png`: the Shortest path
  box's Weight starts on "minutes (farther, loaded)".
- **Where the program says it used the minutes.** Jordan named the load preview, Loaded weight,
  the preselected "(farther, loaded)" Weight, "Total minutes 14" and Made with's Weight row. The
  key accepts Loaded weight or Made with's Weight.
- **Not a wrong answer.** Not `weight-not-read` (neither Depot, Station, Harbor nor Depot, School,
  Harbor); the 14 is the total in minutes, not the 4 hops.
- **Work kept.** `work.json`: start empty (null, the task starts empty), end holds the path run,
  its two style layers, the default layers and the source bus-stops.csv; nothing gone.

## Measures

- **Steps:** 14 `real.mjs` steps after the start (`02.png` to `15.png`). The round 2 route was
  walked in 10 and bar 11 keeps the success path's 11: about 1.4x and 1.3x, inside the 2x limit.
  The extra steps are the analysis button door (flask, type "route", click Shortest path: three
  steps where the walked route uses the P key once) and picking each end's suggestion with its own
  click.
- **Door used (Path):** Analyze (the toolbar's analysis button), found by typing "route" in its
  filter box (`09.png`). Not P and not a node's menu.
- **First move:** the start screen's "Open project or file...", a place the history names; it led
  on to the task (the Data page with the file chosen, `03.png`).
- **Wrong turns:** 0. The analysis button is a place the history names and it offered Shortest
  path; the filter was used rather than abandoned.
- **False "done":** none. "Yes. Quickest way from Depot to Harbor: Depot, Market, Park, Clinic, Harbor -- 14 minutes in all"
  matches `15.png`. truth_on_screen: not applicable.
- **Ease (from the transcript):** 6 of 7.
- **Silent commit (bar 4):** none. Load drew the graph and the Overview; Find path drew the route,
  the key and the run's Values.
- **Numbers that disagree (bar 5):** none. "Total minutes 14" matches the four edges of the
  preview (`06.png`, rows 2, 7, 8, 9). "4 hops" in the left panel is the edge count of the same
  path, also right.
- **Weight reading:** read as loaded, farther, and said so on the run.
- **Wording echo:** none recorded. Jordan said of the "Farther" line only "That reads right"; he
  did not quote "distance", "time" or "longer".
- **Build-decided:** no. **Void:** no. Every step printed its screenshot, every click landed, and
  no script error, console error or failed request is recorded in the session folder
  (`session.log` is empty).

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                                       | Evidence                                                                                                                                  |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | wording         | The left panel names the finished run "Shortest path 4 hops" while the run's Values lead with "Total minutes 14". On a weighted run the tree row gives the step count, in a word ("hops") the participant does not use, and for a moment he suspected the run had counted stops instead of minutes. The Values cleared it up.                                 | `15.png` left panel against right panel; transcript step 15: "'Hops' is not my word, and for a second I wondered if it had counted stops" |
| 2   | 2        | legibility      | No names are drawn on the nodes, so the black route on the canvas cannot be read as stops; Depot and Harbor are found only through Nodes in order. The participant names a deck as the use, where the picture is what is shown.                                                                                                                               | `07.png`, `15.png`; transcript step 7 "which one is Depot?", step 15 "for a slide I'd have to fix that"                                   |
| 3   | 1        | discoverability | The analysis list opens on "Rank nodes and edges" (Degree, Betweenness, ... HITS, All-pairs distance, Depth-first order) with Shortest path below the fold; the participant found it only by typing a word in the filter box and says scrolling might have lost him. Held one level down: he did not get lost.                                                | `08.png` (Shortest path not visible); `09.png` after typing "route"; transcript wrap-up                                                   |
| 4   | 1        | discoverability | Before a role is chosen, the only sign that the minutes will not count is the small line "Weight: none (each edge counts 1)", and "Higher means" appears only after Weight is picked; Load is enabled with no role. The participant got it right but names this as the place another user would load a fewest-stops graph. Opinion only, held one level down. | `03.png`, `05.png`; transcript wrap-up first bullet                                                                                       |
| 5   | 1        | wording         | "Follow: Out / All" starts on All on a file the Overview calls Directed, with nothing saying whether a one-way link can be taken backwards. The participant left it and was unsure what it did. The answer is the key's answer with All.                                                                                                                      | `10.png`, `15.png` Made with Follow All; transcript step 6 and wrap-up                                                                    |

No severity 3 or 4: the answer is right, reached with no wrong turn, and every doubt the
participant had was answered on the screen.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence, and the history names the
analysis button, which is why it was the first place he went.
