# Grade: session r5-s33b -- Dev (tier 1 graduate), bus stops (T20 A), a number that means "farther"

**Grade: S** (success). The last screen (`16.png`) matches the answer key's A end state. The
inspector shows the Shortest path run's Values: Summary "Path 5 nodes, 4 edges", "Total minutes
14"; Nodes in order Depot 1, Market 2, Park 3, Clinic 4, Harbor 5; Made with Analysis Shortest
path, From Depot, To Harbor, Follow All, Weight "minutes (farther)". The canvas key at the top left
reads "Shortest path" beside a black swatch, and the five route nodes and four route edges are drawn
black and thick. The left tree reads "Shortest path minutes 14". The weight was set at load: the
graph's Overview right after Load read "Loaded weight minutes (farther)", Direction Directed
(`08.png`). Dev gave the key's route and total and pointed to "Loaded weight minutes (farther)" and
Made with's "Weight minutes (farther)", both of which the key accepts.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900, no uncommitted changes in the tool. Start: the start page, no setup.

## The answer against the key

- **Route (right).** Depot, Market, Park, Clinic, Harbor, read from Nodes in order (`16.png`).
- **Total (right).** 14 minutes, "Total minutes 14" (`16.png`). Dev also checked it by hand against
  the file (4+3+4+3) and compared the next route, 15; not needed for the grade, and correct.
- **Weight read at load (right).** Role of minutes set to Weight (`06.png`), Higher means Farther
  (`07.png`, "Weight: minutes (farther)"), then Load; Overview "Loaded weight minutes (farther)"
  (`08.png`). The Path form's Weight box started on "minutes (farther, loaded)" (`11.png`). Not the
  per-run route, so not SD.
- **Neither wrong answer.** No 2-link route (Depot, Station, Harbor or Depot, School, Harbor) and no
  "4" offered as the total.
- **Work kept.** `work.json`: one Shortest path run and its two style layers added to the defaults,
  one source; nothing gone.

## Measures

- **Route:** the round 2 route ("Open project or file..." with the file, role box, Weight, Farther,
  Load), then the Analyze list filtered with "route" to Shortest path instead of the key's
  `--key p`. Same form, same end state; not a detour.
- **Steps:** 15 `real.mjs` steps after the start screen. Counting each type-then-pick of From and To
  as one, and the Analyze-then-filter-then-pick as the key's one `--key p` plus two, the walk is 13
  against the key's 10. The extra two are opening the path form through the Analyze list (open,
  type "route") and one refused command (below).
- **Step 04:** `--click "minutes"` was refused by the tool as ambiguous (the column header and the
  role box share the name); the screen did not change and the next step named the box. A tool
  refusal of an ambiguous command, not an app action and not a wrong turn; it does not void the run.
- **Wrong turns:** 0.
- **False "done":** none. "I'm done", with the route, the 14 minutes and "Weight: minutes (farther)",
  is true on `16.png`. truth-on-screen holds.
- **Silent commit:** none. Find path drew the route black and thick, added the canvas key, the tree
  row and the Values (`15.png` against `16.png`).
- **Numbers that disagree:** none. Tree "minutes 14", Summary "Total minutes 14", 5 nodes and 4 edges
  in black on the drawing agree.
- **Wording echo:** Dev said "travel time, smallest total" after choosing Farther, quoting the helper
  line that appears only once Farther is chosen ("such as a longer distance or travel time; a path
  takes the smallest total"). The key notes this line cannot lead to Farther; recorded, no effect.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Sixteen screenshots for sixteen steps; `leaks.json` shows no
  leaks over 32 calls.
- **Scripted exit:** not applicable; Dev finished.

## Problems

| #   | Severity | Kind         | Problem                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                       |
| --- | -------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discovery    | A numeric column on every edge loads as a plain "Attribute", and the only sign that it will not be read as a weight is the gray summary line "Weight: none (each edge counts 1)". Dev caught it only because the task primed him to look; pressing Load there leads straight to the key's `weight-not-read` failure. | `03.png`; transcript step 03 and "What confused me": "if I hadn't read that grey line I'd have loaded it as plain counts" |
| 2   | 1        | discovery    | The role box over a column did not read as a "what is this column" control until opened. Opinion, held one level down; did not slow the task (one click).                                                                                                                                                     | transcript "What confused me"; `05.png`                                                                        |
| 3   | 1        | comprehension | "As the file says" loaded the graph Directed with arrows, a choice Dev never made; he was left unsure whether a bus link can be ridden back. "Follow: All" on the path form ignored direction, so the answer was unaffected.                                                                                  | `08.png` (Direction Directed); `15.png`, `16.png` (Follow All); transcript step 08 and "What confused me"        |
| 4   | 1        | legibility   | No stop names are drawn on the canvas, so the route can be read only from the side panel's Nodes in order, not from the picture. A known trap on this half; did not affect the answer.                                                                                                                         | `16.png`; transcript "What confused me"                                                                        |
