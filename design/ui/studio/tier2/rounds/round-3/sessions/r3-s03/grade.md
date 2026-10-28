# Grade: session r3-s03 -- Dev (returning), bus stops (T20 A), a number that means "farther"

**Grade: S** (success). Dev took the load-time route: on the "Open as a new graph" page he gave the
minutes column the Weight role and chose "Farther" before Load, so the graph carries the meaning
for every run. The Shortest path run gives the right stops in order and the right total, Depot,
Market, Park, Clinic, Harbor, 14 minutes, and Dev pointed to both places the answer key accepts:
the Overview's "Loaded weight minutes (farther)" and Made with's "Weight minutes (farther)". No
detour and no wrong turn.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900, no screen-reader mode.

## The answer against the key

- **Route and total (right).** `14.png`: Summary "Path 5 nodes, 4 edges", "Total minutes 14";
  Nodes in order Depot 1, Market 2, Park 3, Clinic 4, Harbor 5; the Graph tree row "Shortest path
  minutes 14"; the key "Shortest path" with a black swatch at the top left; the route drawn black
  and thicker. Dev's own sum from the sheet (4 + 3 + 4 + 3 = 14, rows 2, 7, 8 and 9 in `07.png`)
  agrees.
- **Load-time meaning (right).** `04.png` the role list (From, To, Weight, Date or time, Edge id,
  Attribute); `06.png` minutes set to Weight, Higher means "Farther", summary "Weight: minutes
  (farther)"; `08.png` after Load, Overview "Direction Directed" and "Loaded weight minutes
  (farther)"; `11.png` the Path popover's Weight starts on "minutes (farther, loaded)".
- **Where it says it used the minutes (right).** Dev named the import summary, the Overview's
  Loaded weight row, Made with's Weight row and the popover's "minutes (farther, loaded)"; every
  one is on screen as he describes it (`06.png`, `08.png`, `13.png`, `14.png`). Made with: From
  Depot, To Harbor, Follow All, Weight minutes (farther), as the key gives.
- **Not a wrong answer.** Not `weight-not-read` (not Depot, Station, Harbor or Depot, School,
  Harbor), not `read-wrong` (no 4 given as the total), "Closer" and "Date or time" not chosen.

## Measures

- **Steps:** 13 `real.mjs` steps after the start screen (`02.png` to `14.png`) against 10 for the
  walked route (No thanks, open the file, role box, Weight, Farther, Load, p, From, To, Find path;
  each type-then-pick counted once). The extra three: one step that changed nothing (`02.png` and
  `03.png` are byte-identical), one scroll of the preview to read every row (`07.png`, Dev checking
  the minutes against his own sum), and reaching Shortest path through the Analyze button and its
  filter ("path", `09.png`, `10.png`) in place of the `p` key -- two steps for one.
- **Wrong turns:** 0. The Analyze-menu route is a correct route, not a detour; the scroll is
  reading. The no-change step at `03.png` cannot be named: this session's `session.log` is empty
  and `transcript.md` holds only the end section, so the per-step commands are not on disk.
- **False "done":** none. "Yes ... 14 minutes, and it matches my own sum" is true on screen
  (`14.png`); the three places he names all read as he says. truth_on_screen: not applicable.
- **Ease (from the transcript, not used for the grade):** 6 of 7.
- **Silent commit (bar 4):** none. Load drew the graph (`07.png` to `08.png`); Find path drew the
  route, the key and the run's Values (`13.png` to `14.png`).
- **Numbers that disagree (bar 5):** none. "Total minutes 14", "minutes 14" in the tree and
  "Path 5 nodes, 4 edges" agree with the drawing and the table.
- **Wording echo:** Dev typed "path" into the Analyze filter, a word both prompts avoid. He brought
  it himself (a returning user's word for a route); record it, but it did not lead him to a choice
  the prompt withheld, since the weight meaning was already set at load.
- **Build-decided:** no. **Void:** no. Every step produced a screenshot and the end state is
  complete; the missing step log is a gap in the record, not a fault in what the tool did.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                            | Evidence                                                                                      |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 1   | 2        | defaults        | A numeric edge column starts as "Attribute" with "Weight: none (each edge counts 1)", and Load is enabled. A user who does not read that line loads the file with no weight and gets a link-count route (the `weight-not-read` failure) with nothing on screen to stop them. Dev said he would have loaded it wrong had he not read the line. | `03.png`; transcript: "If I hadn't read that line I'd have loaded it the wrong way"           |
| 2   | 2        | discoverability | Nothing in the Analyze list's first screen says route, path or way between two places: Shortest path sits under "Find paths and edge sets", below the fold of a long "Rank nodes and edges" list. Dev found it only by typing "path" in the filter.                                                            | `09.png` (no path entry visible), `10.png`; transcript: "doesn't say 'route' anywhere"         |
| 3   | 2        | legibility      | No stop names are drawn on the nodes, so the black route can be read only through Nodes in order; Dev could not tell which dot is Depot.                                                                                                                                                                         | `14.png`; transcript: "couldn't tell which black dot is Depot"                                |
| 4   | 1        | wording         | "Direction: As the file says" on the import page and "Follow: Out / All" in the Path popover carry no explanation; Dev did not know whether bus links run both ways or what either choice changes, and left both as they were (here it did not change the answer).                                              | `03.png`, `11.png`; transcript                                                                |
| 5   | 1        | wording         | "Guided route" sits beside Shortest path in the filtered list with only "Select 2 nodes first" under it; Dev could not tell how it differs from Shortest path.                                                                                                                                                    | `10.png`; transcript                                                                          |
| 6   | 1        | legibility      | The route's Park-to-Clinic edge shows no arrowhead: it ends under the large Clinic node, so the direction of travel on that leg is not visible (grader's reading of the screenshot, as the answer key records; Dev did not mention it).                                                                         | `14.png`, about 935,545 to 862,661                                                            |

None is severity 3 or 4: the answer is right, reached on the intended route, and Dev reported no
wrong belief. Problem 1 is the one that would turn this task into a failure for a less careful
reader.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
