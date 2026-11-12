# Grade: session r5-s29b -- Nadia (tier 1 graduate), bus stops (T20 A), a number that means "farther"

**Grade: S** (success). The last screen (`16.png`) matches the answer key's A end state: the
inspector shows the Shortest path run's Values with Summary "Path 5 nodes, 4 edges" and "Total
minutes 14", Nodes in order Depot 1, Market 2, Park 3, Clinic 4, Harbor 5, and Made with From
"Depot", To "Harbor", Follow "All", Weight "minutes (farther)". The canvas key at the top left reads
"Shortest path" beside a black swatch, and the five route nodes and four route edges are drawn black
and thicker. Nadia answered "Depot -> Market -> Park -> Clinic -> Harbor, 14 minutes" and pointed to
two places that name the minutes: the graph's Overview "Loaded weight minutes (farther)" (`08.png`)
and the run's Made with "Weight minutes (farther)" (`16.png`). The key accepts either.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty. Tool commit `753bae997bc6`, no uncommitted changes.

## The answer against the key

- **Route (right).** Depot, Market, Park, Clinic, Harbor -- the key's A route, not either
  `weight-not-read` answer (Depot, Station, Harbor or Depot, School, Harbor).
- **Total (right).** 14 minutes, read from "Total minutes 14". Nadia also checked it by hand against
  the import preview (4 + 3 + 4 + 3) and against Depot, Market, Library, Harbor (15).
- **Where the minutes were used (right).** Both places the key names.
- **Weight set at load (right).** The minutes column's role was set to Weight and Higher means to
  Farther on the import page (`06.png`, `07.png`); the Overview after Load reads Direction "Directed"
  and Loaded weight "minutes (farther)" (`08.png`); the Path form's Weight started on "minutes
  (farther, loaded)" without being touched (`11.png`).
- **Work kept.** `work.json`: start empty (empty start); end one source (bus-stops.csv), one run, its
  two route layers plus the defaults. Nothing gone.

## Measures

- **Doors:** opened the file with "Open project or file..." from the start screen (the round 2
  route, which lands on the same import page with the file chosen); reached Shortest path through
  Analyze (typed "path" in its filter box), not the P key. Analyze is a listed door for Path.
- **Steps:** 15 `real.mjs` steps after the start; counting each From and To type-then-pick pair as
  one step, 13, against the round 2 route's 10. The difference is the Analyze door (Analyze, type
  "path", click Shortest path: 3 steps where P is 1) and one command that did nothing (below); without it, 12.
- **Wrong turns:** 0. Step 03's `--click "minutes"` matched both the column header and the role box
  and the tool refused it as ambiguous; nothing changed on screen (`04.png` against `03.png`) and the
  next step named the role box. That is a command wording fault, not a move into the wrong place in
  the app.
- **False "done":** none. Every claim in the step 16 note and the wrap-up holds on `16.png` and
  `08.png`. truth-on-screen holds.
- **Silent commit:** none.
- **Numbers that disagree:** none. The tree row "Shortest path minutes 14" and the Summary agree.
- **Wording echo:** Nadia's wrap-up quotes "travel time" from the line shown after Farther is
  chosen. She chose Farther at step 06 on her own reasoning ("More minutes is a longer trip"),
  before that line appeared, so the line did not lead her; recorded as a possible echo only, as the
  key asks.
- **Habit:** her history names opening the file from the start screen; that habit arrived at the
  import page with the file chosen, so no broken habit.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Sixteen screenshots, one per step; `leaks.json` shows no
  leaks over 31 calls, and the briefing names no route or control.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                                                                                                    | Evidence                                                                                                       |
| --- | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | wrong default | The minutes column arrives on the import page as "Attribute" with "Weight: none (each edge counts 1)". Load is enabled in that state, so a reader who does not read that one line loads the file unweighted and later gets a fewest-stops route (the key's `weight-not-read` answers) with no warning. Nadia caught it only by reading the line. | `04.png` (role box "Attribute", summary "Weight: none (each edge counts 1)", Load enabled); transcript step 03 and "What confused me" |
| 2   | 1        | unclear term  | "Follow: Out / All" starts on All on a file the Overview calls Directed. Nadia could not tell whether the route could take a leg against a row's direction and did not check. (On this route every leg runs the file's way -- rows 2, 7, 8, 9 -- so the answer is unaffected.)                  | `11.png` (Follow All chosen), `08.png` (Direction Directed), `04.png` (rows); transcript "What confused me"      |
| 3   | 1        | missing label | No stop names are drawn on the canvas, so the drawing alone does not show which stop is which; the route is read from Nodes in order. Already noted in the key for A and B.                                                                                                                 | `16.png`; transcript "What confused me"                                                                          |
| 4   | 0        | tool          | The tool's text match for "minutes" finds both the preview table's column header and the role box ("Role of minutes") and refuses the click. No effect on the app or the grade.                                                                                                             | transcript step 03; `03.png`, `04.png` identical                                                                 |
