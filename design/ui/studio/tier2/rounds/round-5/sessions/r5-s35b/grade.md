# Grade: session r5-s35b -- Elena (tier 1 graduate), bus stops (T20 A), a number that means "farther"

**Grade: S** (success). The last screen (`16.png`) matches the answer key's A end state. The
inspector shows the Shortest path run's Values: Summary "Path 5 nodes, 4 edges", "Total minutes
14"; Nodes in order Depot 1, Market 2, Park 3, Clinic 4, Harbor 5; Made with Analysis Shortest
path, From Depot, To Harbor, Follow All, Weight "minutes (farther)". The canvas key at the top left
reads "Shortest path" beside a black swatch, and the five route nodes and four route edges are drawn
black and thick. The left tree reads "Shortest path minutes 14". The weight was set at load: the
graph's Overview right after Load read "Loaded weight minutes (farther)", Direction Directed
(`08.png`). Elena gave the key's route and total and pointed to Made with's "Weight: minutes
(farther)" and the Overview's "Loaded weight: minutes (farther)", both of which the key accepts.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900, no uncommitted changes in the tool. Start: the start page, no setup.

## The answer against the key

- **Route (right).** Depot, Market, Park, Clinic, Harbor, read from Nodes in order (`16.png`).
- **Total (right).** 14 minutes, "Total minutes 14" (`16.png`). Elena also added it by hand from the
  file (4+3+4+3 = 14), which is correct.
- **Weight read at load (right).** Role of minutes set to Weight (`05.png`, `06.png`), Higher means
  Farther (`07.png`, "Weight: minutes (farther)"), then Load; Overview "Loaded weight minutes
  (farther)" (`08.png`). The Path form's Weight box started on "minutes (farther, loaded)"
  (`11.png`, per the transcript). Not a per-run weight, so not SD.
- **Neither wrong answer.** No 2-link route (Depot, Station, Harbor or Depot, School, Harbor) and no
  link count offered as the total.
- **Work kept.** `work.json`: one Shortest path run and its two style layers added to the defaults,
  one source; nothing gone.

## Measures

- **Route:** the round 2 route ("Open project or file..." with the file, role box, Weight, Farther,
  Load), then the Analyze list filtered with "quickest" to Shortest path instead of the key's
  `--key p`. Analyze, "Shortest path" is a listed way to open the same form (`answers.md`, T18
  success path); same end state, not a detour.
- **Steps:** 15 `real.mjs` steps after the start screen. Counting each type-then-pick of From and To
  as one, the walk is 13 against the key's 10: two extra for opening the path form through the
  Analyze list (open, type "quickest") instead of one key, and one refused command (below).
- **Step 03 to 04:** `--click "minutes"` was refused by the tool as ambiguous (the column header and
  the role box share the name); `03.png` and `04.png` are byte-identical, so nothing reached the
  app, and the next step named the box ("Role of minutes"). A tool refusal of an ambiguous command,
  not an app action and not a wrong turn; it does not void the run.
- **Wrong turns:** 0.
- **False "done":** none. "Done", with the route, the 14 minutes and "Weight: minutes (farther)", is
  true on `16.png`. truth-on-screen holds.
- **Silent commit:** none. Find path drew the route black and thick, added the canvas key, the tree
  row and the Values (`15.png` against `16.png`).
- **Numbers that disagree:** none. Tree "minutes 14", Summary "Total minutes 14", and 5 nodes and 4
  edges in black on the drawing agree.
- **Wording echo:** Elena quoted "a path takes the smallest total" from the helper line that appears
  only after Farther is chosen; she had already chosen Farther from "More minutes is a longer trip".
  Recorded, no effect.
- **Broken habit:** none. Her first move after Load was the analysis button her history names, and
  it led on to the task.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Sixteen screenshots for the start plus fifteen steps;
  `leaks.json` shows no leaks over 32 calls.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                                                                                                       | Evidence                                                                                                         |
| --- | -------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discovery     | A numeric column on every edge loads as a plain "Attribute", and the only sign it will not be read as a weight is the gray line "Weight: none (each edge counts 1)". Elena caught it only because it sat above her minutes column and the task primed her; Load there leads to `weight-not-read`. The same was reported in r5-s33b. | `04.png` (Attribute, "Weight: none (each edge counts 1)", Load enabled); transcript step 03 and "What confused me" |
| 2   | 1        | discovery     | The column's role box does not name its column: the column label "minutes" sits above a box reading "Attribute", and the table header below also reads "minutes", so "minutes" names two things and neither is the control. Cost one refused command.                                           | `03.png`, `04.png`; transcript step 03                                                                           |
| 3   | 1        | comprehension | The Analyze list is full of unfamiliar names (Betweenness, Katz, HITS); Elena found Shortest path only by typing "quickest" in the filter box. The filter worked, so opinion, held one level down.                                                                                              | `09.png`, `10.png`; transcript steps 09-10                                                                       |
| 4   | 1        | comprehension | "Follow: Out / All" on the path form meant nothing to her; she left the default "All" and "hoped". Direction "As the file says" loaded the graph Directed, which she also did not choose knowingly ("buses go both ways I guess"). The answer was unaffected because All ignores direction.        | `08.png` (Direction Directed); `15.png`, `16.png` (Follow All); transcript steps 07, 15                          |
| 5   | 1        | legibility    | No stop names are drawn on the canvas, so the route can be read only from Nodes in order, not from the picture; the Park-to-Clinic route edge also ends under the large Clinic node with no visible arrowhead. Known on this half; did not affect the answer.                                     | `16.png`; transcript "What confused me"                                                                          |
