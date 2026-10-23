# Grade: session r5-s31b -- Alex (regular analyst), bus stops (T20 A), a number that means "farther"

**Grade: S** (success). The last screen (`13.png`) matches the answer key's A end state: the
right-hand inspector shows the Shortest path run on its Values tab, Summary "Path 5 nodes, 4 edges"
and "Total minutes 14", Nodes in order Depot, Market, Park, Clinic, Harbor, and Made with From
"Depot", To "Harbor", Follow "All", Weight "minutes (farther)". The canvas key at the top left reads
"Shortest path" beside a black swatch, and the route's five nodes and four edges are drawn black and
thicker. The left panel's run row reads "Shortest path -- minutes 14". Alex answered "Depot ->
Market -> Park -> Clinic -> Harbor, 14 minutes", and pointed to the import summary "Weight: minutes
(farther)", the Overview's "Loaded weight: minutes (farther)" (`07.png`) and Made with's Weight row
(`13.png`); the key accepts Loaded weight or Made with's Weight.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900, tool commit `753bae997bc6` with no uncommitted changes. Start: empty, as
the task sets. `leaks.json` shows no leaks over 28 calls.

## The answer against the key

- **Route (right).** Depot, Market, Park, Clinic, Harbor, read from Nodes in order on `13.png`.
- **Total (right).** 14 minutes, read from "Total minutes 14". Alex also added the four legs by hand
  from the preview table (4 + 3 + 4 + 3) and compared two longer routes.
- **Weight set at load (right).** `06.png`: the minutes column's role is Weight, Higher means is
  Farther, the summary reads "Weight: minutes (farther)". `07.png`: Overview "Loaded weight minutes
  (farther)", Direction Directed. The path form's Weight started on "minutes (farther, loaded)"
  (`10.png`) and Alex did not touch it, so the run read the load-time setting.
- **Not the trap.** Neither `weight-not-read` answer (Depot, Station, Harbor or Depot, School,
  Harbor) appears anywhere.
- **Work kept.** `work.json`: the end holds the one source, the run and its two style layers; start
  was empty; nothing gone.

## Measures

- **Route through the app:** the round 2 route ("Open project or file..." from the start screen
  opens the Data page with the file chosen), then the Analyze door for the path (Shift+A, filter
  "shortest", click "Shortest path"), not the P key. Analyze is a listed door for Path.
- **Steps:** 12 after the start: No thanks; Open project or file with the upload; open the minutes
  role list; Weight; Farther; Load; Shift+A; type "shortest"; click Shortest path; From Depot (type,
  Enter); To Harbor (type, Enter); Find path. The round 2 route with P is 10; the Analyze door costs
  the two extra steps (filter and pick), which is the door's own length, not a detour. The refused
  click on "minutes" changed nothing on screen (`02.png` and `03.png` are identical) and is a tool
  refusal, not a step.
- **Wrong turns:** 0.
- **False "done":** none. Every claim in the wrap-up (route, 14 minutes, the three places that name
  the minutes, the "Total minutes" label) is true on `06.png`, `07.png` and `13.png`. truth-on-screen
  holds.
- **Wording echo:** Alex quoted the line under Farther ("a path takes the smallest total") only
  after choosing Farther; it cannot have led there. Alex chose Farther from "more minutes = longer
  trip", the prompt's own words.
- **Numbers that disagree:** none. Preview, Overview and run agree on 10 nodes and 17 edges.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Thirteen screenshots for the steps taken; no script errors in
  the transcript.
- **Scripted exit:** not applicable; Alex finished.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                                                                                                                                       | Evidence                                                                                                       |
| --- | -------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | wrong default | A whole-number column named "minutes" arrives on the import page as "Attribute" with "Weight: none (each edge counts 1)", and Load is enabled in that state. A reader who skips that one line loads the file unweighted and later gets a fewest-stops route (the key's `weight-not-read` answers) with no warning. Alex caught it only by reading the line. | `02.png` (role "Attribute", summary "Weight: none (each edge counts 1)", Load enabled); transcript step 2 and "What confused me" |
| 2   | 1        | unclear term  | "Follow: Out / All" starts on All on a file the Overview calls Directed. Alex could not tell whether All ignores the arrows and did not check. Every leg of this route runs the file's way (rows 2, 7, 8, 9), so the answer is unaffected.                                                                                       | `10.png` (Follow All chosen), `07.png` (Direction Directed), `06.png` (rows); transcript "What confused me"      |
| 3   | 1        | missing label | No stop names are drawn on the canvas, so the black route on the drawing does not say which stop is which; Alex read the route from Nodes in order and would need names for a slide. Already noted in the key for A and B.                                                                                                       | `13.png`; transcript step 6 and "What confused me"                                                              |
| 4   | 1        | extra step    | Choosing Weight brings a second required choice, "Higher means" (Not set / Closer / Farther / Capacity). Its helper line is clear, but Alex named it as one more thing to remember on every load of travel-time data. No error resulted.                                                                                          | `05.png`, `06.png`; transcript "What confused me"                                                               |
| 5   | 0        | tool          | The tool's text match for "minutes" finds both the preview table's column header and the role box ("Role of minutes") and refuses the click. No effect on the app or the grade.                                                                                                                                                  | transcript step 2; `02.png`, `03.png` identical                                                                 |

Problems 1, 2, 3 and 5 were also reported in round 5's other T20 A session (r5-s29b) in the same
terms, so with this session each has two participants and counts as confirmed. Problem 4 has one
participant.
