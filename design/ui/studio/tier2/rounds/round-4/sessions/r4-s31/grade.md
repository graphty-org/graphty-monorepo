# Grade: session r4-s31 -- Jordan (regular analyst), bus stops (T20 A), a weight set at load

**Grade: S** (success). The last screen (`14.png`) shows the Shortest path run open on its
Values: Summary "Path 5 nodes, 4 edges" and "Total minutes 14"; Nodes in order Depot, Market,
Park, Clinic, Harbor; Made with Analysis Shortest path, From Depot, To Harbor, Follow All, Weight
"minutes (farther)". The canvas draws the key "Shortest path" with a black swatch at the top left
and the route's nodes and edges black and thicker. Every value matches the key (Depot, Market,
Park, Clinic, Harbor -- 14 minutes). Jordan answered with the same stops and total and pointed to
where the program says it used the minutes: the load page's "Weight: minutes (farther)" with its
helper line, the graph's Overview "Loaded weight minutes (farther)" (`07.png`, `10.png`), and the
run's Made with Weight row (`14.png`). The key accepts Loaded weight or Made with's Weight row;
Jordan named both. Neither wrong route (Depot, Station, Harbor or Depot, School, Harbor) appears.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900, `/?next`. Start: empty, no setup. Tool commit `435e878a1d4c`, no
uncommitted changes.

## The answer against the key

- **Weight set at load (right).** `05.png` and `06.png`: the minutes column's role set to Weight,
  Higher means "Farther", the summary "Weight: minutes (farther)" and the line "A higher weight
  means farther apart, such as a longer distance or travel time; a path takes the smallest total."
  Load pressed with Direction "As the file says".
- **Weight read by the run (right).** `10.png`: the Shortest path form's Weight starts on "minutes
  (farther, loaded)"; Jordan did not touch it. `14.png`: Made with Weight "minutes (farther)".
- **Route and total (right).** `14.png`, as above. Jordan also checked the total by hand against
  the preview table (4 + 3 + 4 + 3 = 14) and compared it with two longer routes.
- **Where the minutes were used (right).** Overview "Loaded weight minutes (farther)", Direction
  "Directed" (`07.png`) and Made with Weight "minutes (farther)" (`14.png`).
- **Work kept.** `work.json`: one source bus-stops.csv, one Shortest path run, its two route
  layers over the node and edge defaults, nothing gone.

## Measures

- **Route:** the round 2 route (Open project or file... from the start screen, the minutes role
  box, Weight, Farther, Load), then the path through the toolbar's Analyze button and its filter
  ("path") instead of the `p` key.
- **Steps:** 11 counted steps through Find path (open and upload, role box, Weight, Farther,
  Load, Analyze, type "path", Shortest path, From Depot, To Harbor, Find path; each
  type-then-pick counted once), against the round 2 route's 10. The extra step is the Analyze
  filter route to the same Shortest path form. One more call (`03.png`, a `--click "minutes"`)
  was refused by the tool as ambiguous and changed nothing; it is a tool-level miss, not an app
  action, and is not counted.
- **Wrong turns:** 0.
- **False "done":** none. "Done in one go" and the end claims (the route, "14 minutes in all",
  the three places naming the minutes) all hold on `07.png` and `14.png`. truth-on-screen: holds.
- **Silent commit:** none. Each role and Higher means choice changed the summary line at once
  (`05.png`, `06.png`); Load opened the graph with the Overview naming the weight (`07.png`).
- **Numbers that disagree:** none.
- **Possible wording echo:** Jordan quoted the Farther helper line ("travel time"). As the key
  notes, the line shows only after Farther is chosen, so it confirmed the choice and could not
  have led to it.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the one refused click
  was reported as such and changed nothing, and `leaks.json` shows no leaks over 35 calls.
- **Scripted exit:** not applicable; Jordan finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                       | Evidence                                                                                                                        |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | defaults        | The minutes column opens as "Attribute" and the summary reads "Weight: none (each edge counts 1)" in small gray text, and Load is enabled. A user not told to care about the minutes would load it and get a hop-count route (the key's `weight-not-read` answers). Jordan was steered only by the prompt. | `02.png` ("Weight: none (each edge counts 1)", minutes "Attribute"); transcript end: "If I hadn't been told to care about minutes I'd have clicked Load and got a hop-count answer" |
| 2   | 1        | discoverability | Nothing points at the column's role box as the place to make a column the weight; Jordan found it by looking for it.                                                                                                                                                         | `02.png`, `04.png`; transcript end: "nothing points at it"                                                                      |
| 3   | 1        | visual          | No stop names are drawn on the canvas, so the highlighted route cannot be read from the drawing; Jordan read it only from Nodes in order and wanted names on the route for a slide.                                                                                          | `14.png` (black route, no labels); transcript end: "No stop names on the map"                                                   |
| 4   | 1        | wording         | Follow starts on "All" on a graph the Overview calls Directed, and nothing says what All does to one-way links. Jordan left it on All without knowing whether the buses run one way. The key's answer uses All, so the result was not affected.                                | `10.png` (Follow Out / All, All chosen; Overview Direction Directed); transcript end: "the program didn't make me think about it, which is either good or a trap" |

All four rest on one participant and are not confirmed by this session alone. Problem 1 matches
the known `weight-not-read` risk recorded in the answer key for T20.
