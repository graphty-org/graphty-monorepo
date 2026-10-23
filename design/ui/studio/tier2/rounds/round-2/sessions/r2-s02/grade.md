# Grade: session r2-s02 -- Dev (returning class-project student), T20 half B (trails.csv)

**Grade: S** (success). The route and the total are right: Trailhead, Creek, Meadow, Ridge,
Summit, 7.5 km. The weight was set at load (km as Weight, Higher means "Farther"), so every later
calculation reads km as a length, and Dev pointed to the places the answer key accepts: the
Overview's "Loaded weight km (farther)", Made with's Weight row "km (farther)", and the Shortest
path box's Weight "km (farther, loaded)" before the run. No detour: no step was undone or
abandoned, and the route he took is the round 2 route (Open project or file, role, Weight,
Farther, Load, Path, From, To, Find path) with harmless additions.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named at the top of the criteria. Every screenshot matches its command;
the one command that hit nothing (step 4) left the screen unchanged (`04.png` is byte-identical to
`03.png`). No tool fault; the session is not void.

## What the last screen shows (`18.png`)

- The run's Values, Summary: "Path 5 nodes, 4 edges", "Total km 7.5".
- Nodes in order: Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5 -- the answer key's route B.
- Made with: Analysis Shortest path, Ran Oct 9, 7:34:20 PM, From Trailhead, To Summit, Weight
  "km (farther)"; Advanced run settings closed. No Follow row, since the graph was loaded
  undirected.
- The Graph tree lists Selection, Shortest path (4 hops), Everything; the canvas key reads
  "Shortest path / On the path"; the route is drawn in black and thicker. No node names are drawn.
- Earlier screens: "Loaded weight km (farther)" and "Direction Undirected, set in the project" in
  the Overview (`10.png`, `17.png`); the Shortest path box with Weight "km (farther, loaded)"
  untouched (`13.png` to `17.png`); the import page's summary "Weight: km (farther)" before Load
  (`07.png`, `09.png`), and "Weight: none (each edge counts 1)" before the role was set (`03.png`).

## Measures

- **Steps:** 17 after the start (`02.png` to `18.png`) against the round 2 route's 10, about
  1.7x. The extra steps: one command that hit nothing (step 4), opening and setting Direction
  (steps 8 and 9), reaching Shortest path through the Analyze list and its filter instead of the P
  key (steps 11 to 13, three steps for one), and clicking each suggestion row for From and To.
- **Wrong turns: 0.** Step 4 (`--click "km"`) was the driver's name matching both the km column's
  label and its role box; nothing happened on screen and the next step named the box. That is the
  driver's ambiguous target, not a move in the app, so it is not counted. Changing Direction to
  Undirected (steps 8 and 9) was a deliberate setting, kept to the end, and does not change the
  route or the total on this file (answer key: every trail points toward the Summit).
- **Recovery:** not applicable (no wrong turn).
- **First move:** "Open project or file..." from the start screen (after "No thanks"), the way his
  history says he opened the class spreadsheet. It led on: it opened the "Open as a new graph"
  page with trails.csv already chosen (`03.png`).
- **Door used for the path:** the Analyze button (the flask), filtered with "shortest"
  (`11.png`, `12.png`), the place his history names for running a ranking. Not the P key.
- **False "done": none.** He claimed done only after the run, and every claim is on screen: the
  route and 7.5 (`18.png`), "Weight km (farther)" in Made with (`18.png`), "Loaded weight km
  (farther)" (`10.png`), "km (farther, loaded)" in the Path box (`13.png`). His side arithmetic is
  right: 1.5 + 2 + 2.5 + 1.5 = 7.5; Trailhead, Pine Fork, Summit = 3 + 6 = 9. truth-on-screen: no
  wrong claim.
- **Wrong answers avoided:** he never ran with no weight (`weight-not-read`), never chose "Date or
  time", "Closer" or "Capacity", and did not give 4 (the tree's "4 hops") as the total
  (`read-wrong`).
- **Wording echo:** his reason for "Farther" ("more km is a longer walk", step 6) came while the
  helper line under Higher means still read the "Not set" text; the "longer distance" line shows
  only after Farther is chosen, so it could not have led him there. His essay sentence uses
  "shorter", not a phrase from the helper line.
- **Silent commit:** none. Choosing Weight and Farther changed the summary at once (`06.png`,
  `07.png`); Undirected changed the header to "each edge goes both ways" (`09.png`); Load showed
  the Loaded weight row (`10.png`); Find path drew the route and opened the run (`18.png`).
- **Script errors, console errors, failed requests:** none reported in the transcript;
  `session.log` is empty.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                   | Evidence                                              |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | 2        | legibility      | The result drawing names no node, and two route nodes near the bottom sit almost on top of each other (about 755,645 and 790,636). The figure cannot show which black dot is which; Dev said he would rely on the Nodes in order list, not the drawing, for his instructor. | `18.png`; transcript step 18 and "What confused me"   |
| 2   | 1        | truth-on-screen | Once Higher means appears, the preview's caption still reads "All 13 rows" while line 14 is cut off at the pane's bottom edge (a scrollbar is drawn). Dev did not notice and it cost nothing here.                                                                         | `09.png`                                              |
| 3   | 1        | defaults        | Direction starts on "As the file says", which loads trails.csv directed; nothing on the import page says each trail would then be one-way. Dev changed it only from an outside tutorial and said he knew it made no difference only because he checked.                  | `03.png`, `08.png`, `09.png`; transcript "What confused me" |
| 4   | 1        | findability     | The Analyze list opens on a long run of rankings; Dev found Shortest path only by typing "shortest" in its filter and was unsure another word ("route") would find it.                                                                                                     | `11.png`, `12.png`; transcript step 11                |
| 5   | 1        | wording         | "Capacity" under Higher means has no explanation until it is chosen; Dev did not know what it would be for.                                                                                                                                                             | `06.png`; transcript "What confused me"               |
| 6   | 0        | accessibility-name | The km column's label and its role box both answer to "km" by name (the driver's click matched both). The box's own name, "Role of km", is distinct, so a person clicking sees no problem.                                                                            | transcript step 4; `04.png` identical to `03.png`     |

## What worked

- The import page's summary "Weight: none (each edge counts 1)" told him at once that the km were
  being ignored, which he said he would otherwise have missed (`03.png`).
- The helper line under "Not set" ("until you do, a path counts every edge as one step...") made
  the Farther choice obvious to him.
- The Path box picked up the loaded weight on its own ("km (farther, loaded)"), and the total's
  label carries the column name ("Total km").
