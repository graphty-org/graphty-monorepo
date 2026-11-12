# Grade: session r5-s34b -- Tom (tier 1 graduate), hiking trails (T20 B), a number that means "farther"

**Grade: S** (success). The last screen (`16.png`) matches the answer key's B end state. The
inspector shows the Shortest path run's Values: Summary "Path 5 nodes, 4 edges", "Total km 7.5";
Nodes in order Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5; Made with Analysis Shortest path,
From Trailhead, To Summit, Follow All, Weight "km (farther)". The canvas key at the top left reads
"Shortest path" beside a black swatch, and the route's nodes and edges are drawn black and thick.
The left tree reads "Shortest path km 7.5". The weight was set at load: the graph's Overview right
after Load read "Loaded weight km (farther)", Direction Directed (`08.png`). Tom gave the key's
route and total and pointed to "Loaded weight km (farther)", the Path form's "km (farther, loaded)"
and Made with's "Weight km (farther)", all of which the key accepts.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900, no uncommitted changes in the tool. Start: the start page, no setup.

## The answer against the key

- **Route (right).** Trailhead, Creek, Meadow, Ridge, Summit, read from Nodes in order (`16.png`).
- **Total (right).** 7.5 km, "Total km 7.5" (`16.png`). Tom also checked it by hand against the
  preview table (1.5 + 2 + 2.5 + 1.5) and compared the Pine Fork alternative (3 + 1 + 2.5 + 1.5 = 8);
  both sums are correct against the file (`07.png`). Not needed for the grade.
- **Weight read at load (right).** Role of km set to Weight (`06.png`), Higher means Farther
  (`07.png`, "Weight: km (farther)"), then Load; Overview "Loaded weight km (farther)" (`08.png`).
  The Path form's Weight box started on "km (farther, loaded)" (transcript step 11). Not the per-run
  route, so not SD.
- **Not the wrong answer.** No Trailhead, Pine Fork, Summit (2 links, 9.0 km) and no hop count
  offered as the total.
- **Work kept.** `work.json`: one Shortest path run and its two style layers added to the defaults,
  one source (trails.csv); nothing gone.

## Measures

- **Route:** the round 2 route ("Open project or file..." with the file, role box, Weight, Farther,
  Load), then the Analyze list filtered with "shortest" to Shortest path instead of the key's
  `--key p`. Same form, same end state; not a detour.
- **Steps:** 15 `real.mjs` steps after the start screen. Counting each type-then-pick of From and To
  as one, the walk is 13 against the key's 10: two extra for opening the path form through the
  Analyze list (open, type "shortest") and one for the no-op click below. Within bar 11's 2x.
- **Step 04:** `--click "km"` changed nothing (`03.png` and `04.png` are byte-identical in size and
  content): the column header and the role box share the name "km", and the click did not reach the
  role box. The next step named the box ("Role of km"). One wasted click, not a wrong turn and not a
  tool fault; it does not void the run.
- **Wrong turns:** 0.
- **False "done":** none. "Yes" with the route, 7.5 km and the weight rows is true on `16.png` and
  `08.png`. truth-on-screen holds.
- **Silent commit:** none. Find path drew the route black and thick, added the canvas key, the tree
  row and the Values (`16.png`).
- **Numbers that disagree:** none. Tree "km 7.5", Summary "Total km 7.5", 5 nodes and 4 edges in black
  on the drawing agree.
- **Wording echo:** Tom quoted the Farther helper line ("a path takes the smallest total"), which
  appears only after Farther is chosen; he chose Farther from "more kilometers is a longer walk"
  before seeing it (transcript step 06). Recorded, no effect.
- **Capacity:** not chosen. Tom said he would have to ask what it means.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Sixteen screenshots for sixteen steps; `leaks.json` shows no
  leaks over 31 calls.
- **Scripted exit:** not applicable; Tom finished.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                                                                                                                 | Evidence                                                                                                                       |
| --- | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 2        | discovery     | A numeric column on every edge loads as a plain "Attribute", and the only sign it will not be read as a weight is the gray summary line "Weight: none (each edge counts 1)". Tom said that had he pressed Load as he usually does, every walk would have counted one step per trail and he would not have known: the key's `weight-not-read` failure. | `03.png`; transcript step 03 and "What confused me": "Had I just pressed Load like I usually do ... I would not have known"      |
| 2   | 1        | interaction   | The column header and its role box are both named "km"; a click on "km" opened nothing, and Tom had to try again on the box.                                                                                                                                                                                 | `03.png` against `04.png` (no change); transcript step 04                                                                      |
| 3   | 1        | comprehension | "As the file says" loaded the graph Directed with arrows, a choice Tom never made; he would ask the club whether trails are one-way. "Follow: All" on the path form ignored direction, so the answer was unaffected.                                                                                       | `08.png` (Direction Directed); `16.png` (Follow All); transcript step 08 and "What confused me"                                |
| 4   | 1        | legibility    | No trail junction names are drawn on the canvas, and Creek and Summit overlap at the bottom of the drawing, so the black route cannot be read from the picture; Tom read it only from Nodes in order. A known trap on this half; did not affect the answer.                                                 | `16.png` (two black nodes overlapping at about 755,645 and 790,636); transcript step 16 and "What confused me"                  |
| 5   | 1        | discovery     | The Analyze list is long and full of unfamiliar names (Katz, HITS, Eigenvector); typing "shortest" in its filter found Shortest path at once. Opinion; did not slow the task.                                                                                                                              | transcript steps 09-10 and "What confused me"                                                                                  |
