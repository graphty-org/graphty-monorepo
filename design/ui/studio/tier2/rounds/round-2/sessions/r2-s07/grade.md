# Grade: session r2-s07 -- Tom, bus stops (T20 A), a number that means "farther"

**Grade: S** (success). The route and the total are right: Depot, Market, Park, Clinic, Harbor,
14 minutes. The minutes were given their meaning at load ("Weight: minutes (farther)" before
Load), so every calculation reads them, and Tom pointed to the run's Made with row "Weight
minutes (farther)" and to the Overview's "Loaded weight minutes (farther)", both of which the key
accepts. He took the round 2 route ("Open project or file..." from the start screen, through the
Data page) and reached Shortest path through the analysis button, a place his history names. No
detour, no wrong turn.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900, no uncommitted changes.

## The answer against the key

- **Route and total (right).** `15.png`, the last screenshot: Summary "Path 5 nodes, 4 edges",
  "Total minutes 14"; Nodes in order Depot 1, Market 2, Park 3, Clinic 4, Harbor 5; Made with
  Analysis Shortest path, From Depot, To Harbor, Follow All, Weight "minutes (farther)". The route
  is drawn black and thicker with the key "Shortest path / On the path" at the top left of the
  canvas. Tom checked the sum against the preview rows (4 + 3 + 4 + 3 = 14, rows 2, 7, 8, 9 in
  `06.png`) and against Depot, Market, Library, Harbor (15).
- **Set at load, for every calculation.** `06.png`: the minutes column's role is Weight, Higher
  means is Farther, the summary reads "Weight: minutes (farther)". `07.png`: the Overview reads
  "Loaded weight minutes (farther)", Direction Directed. Transcript step 10: the Shortest path
  form's Weight started on "minutes (farther, loaded)".
- **Where the program says it used the minutes.** Tom named Made with's "Weight: minutes
  (farther)", "Total minutes 14" and, before the run, "Loaded weight: minutes (farther)". The key
  accepts Loaded weight or Made with's Weight.
- **Not a wrong answer.** Not `weight-not-read` (neither Depot, Station, Harbor nor Depot, School,
  Harbor); the 14 is the total in minutes, not the 4 hops, and Tom read "4 hops" correctly as not
  the minutes.
- **Work kept.** `work.json`: start null (the task starts empty), end holds the path run, its two
  style layers, the default layers and the source bus-stops.csv; nothing gone.

## Measures

- **Steps:** 14 `real.mjs` steps after the start (`02.png` to `15.png`). The round 2 route was
  walked in 10 and bar 11 keeps the success path's 11: about 1.4x and 1.3x, inside the 2x limit.
  The extra steps are the analysis button door (flask, type "quickest", click Shortest path: three
  steps where the walked route uses the P key once) and picking each end's suggestion with its own
  click.
- **Door used (Path):** Analyze (the toolbar's analysis button), found by typing "quickest" in its
  filter box, which matched Shortest path (`09.png`). Not P and not a node's menu.
- **First move:** the start screen's "Open project or file...", a place the history names; it led
  on to the task (the Data page with the file chosen, `03.png`). Not a broken habit.
- **Wrong turns:** 0.
- **False "done":** none. "Yes. Depot -> Market -> Park -> Clinic -> Harbor, 14 minutes in all"
  matches `15.png`. truth_on_screen: not applicable.
- **Ease (from the transcript):** 6 of 7 (recorded, not used for the grade).
- **Silent commit (bar 4):** none. Load drew the graph and the Overview; Find path drew the route,
  the key and the run's Values.
- **Numbers that disagree (bar 5):** none. "Total minutes 14" matches the four edges in the
  preview; "4 hops" in the left panel is the edge count of the same path.
- **Weight reading:** read as loaded, farther, and said so on the run.
- **Wording echo:** none. Tom paraphrased the Farther line ("That is what I wanted"); he did not
  quote "distance", "time" or "longer" as his own reasoning ("More minutes is a longer trip" at
  step 5 came before Farther was chosen and its line shown).
- **Capacity:** not chosen.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot, every click landed, and
  no script error, console error or failed request is recorded (`session.log` is empty).

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                                |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The minutes column starts as "Attribute", the only sign it will not count is the line "Weight: none (each edge counts 1)", and Load is enabled with no role chosen. Tom says that pressing Load at once, as he usually does, would have ignored the minutes; he caught it only by reading every line. Opinion, not an observed failure; r2-s03 named the same place. | `03.png`; transcript step 3 and wrap-up first bullet                                                                     |
| 2   | 2        | wording         | The left panel names the run "Shortest path 4 hops" while the Values lead with "Total minutes 14"; "hops" made Tom wonder for a moment whether the run counted stops. The Values settled it. Same doubt as r2-s03.                                                                                                | `15.png` left panel against right panel; transcript wrap-up last bullet                                                 |
| 3   | 2        | legibility      | No names are drawn on the nodes, so the black route cannot be read as stops on the drawing; Depot and Harbor are found only through Nodes in order. Same as r2-s03.                                                                                                                                             | `07.png`, `15.png`; transcript wrap-up fourth bullet                                                                    |
| 4   | 1        | wording         | Weight takes two choices: picking "Weight" brings a second row "Higher means" starting on "Not set". The helper line under it explained why it matters and Tom chose right. "Two choices for one idea."                                                                                                         | `05.png`, `06.png`; transcript wrap-up second bullet                                                                    |
| 5   | 1        | wording         | "Direction: As the file says" on the import page and "Follow: Out / All" in the path form give no hint which a two-way bus map needs; Tom left both and says he is trusting the answer. The key's answer is with All.                                                                                           | `06.png` Direction; `15.png` Made with Follow All; transcript steps 6, 14 and wrap-up third bullet                      |
| 6   | 1        | legibility      | The preview caption reads "All 17 rows" while lines 15 to 17 are below the pane (a scrollbar is drawn). Tom did not need them. Known on this build.                                                                                                                                                             | `06.png` (caption "All 17 rows", last visible line 14)                                                                  |

No severity 3 or 4: the answer is right, reached with no wrong turn, and every doubt the
participant had was answered on the screen.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence. The history names "Open
project or file..." and the analysis button, which is why both were his first moves.
