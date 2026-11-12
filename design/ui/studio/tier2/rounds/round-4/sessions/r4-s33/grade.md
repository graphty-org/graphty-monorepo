# Grade: session r4-s33 -- Tom (tier 1 graduate), bus stops (T20 A), a number that means "farther"

**Grade: S** (success). The load-time route, the right answer, and the right place pointed to.
Tom gave the minutes column the Weight role and chose "Farther" on the "Open as a new graph" page
before Load (`06.png`: "Weight: minutes (farther)"), so the weight was set at load, not per run.
The last screen (`14.png`) shows the run's Values: Summary "Path 5 nodes, 4 edges", "Total minutes
14"; Nodes in order Depot 1, Market 2, Park 3, Clinic 4, Harbor 5; Made with Analysis "Shortest
path", From "Depot", To "Harbor", Follow "All", Weight "minutes (farther)". The answer key's A
route is Depot, Market, Park, Clinic, Harbor, 14 minutes, and Tom's answer matches it exactly. For
"where the program says it used the minutes" he named Made with's Weight row "minutes (farther)"
and the Overview's "Loaded weight minutes (farther)" (`07.png`), both of which the key accepts.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty (no setup), as T20 requires. Tool commit `435e878a1d4c`, no
uncommitted changes.

## The answer against the key

- **Route (right).** Depot, Market, Park, Clinic, Harbor (`14.png`, Nodes in order). Not the
  `weight-not-read` routes Depot, Station, Harbor or Depot, School, Harbor.
- **Total (right).** "Total minutes 14" (`14.png`), also "minutes 14" beside "Shortest path" in the
  left panel's tree. Read from the screen; his hand check (4 + 3 + 4 + 3) agrees with lines 2, 7, 8
  and 9 of the preview (`06.png`).
- **Weight set at load (right).** Role "Weight" and Higher means "Farther" on the import page
  (`05.png`, `06.png`), then Overview "Loaded weight minutes (farther)", Direction "Directed"
  (`07.png`). "Closer", "Capacity" and "Date or time" were never chosen.
- **Pointed to (right).** Made with's Weight "minutes (farther)" and Overview "Loaded weight
  minutes (farther)", both on screen when he read them.
- **Work kept.** `work.json`: one Shortest path run, four style layers (node and edge defaults,
  the route's nodes and edges), source bus-stops.csv; `gone` is empty.

## Measures

- **Route taken:** the round 2 route (Open project or file sends the CSV to the import page), with
  the path opened from the Analyze menu instead of the `p` key: Analyze, type "path" into its
  filter, click Shortest path. The key grades this route as the success path.
- **Steps:** 13 `real.mjs` steps after the start (`02.png` to `14.png`). Counted as the key counts
  (each type-then-pick of a node as one): open and choose the file 1, the refused "minutes" click
  1, role 1, Weight 1, Farther 1, Load 1, Analyze 1, filter 1, Shortest path 1, From 1, To 1, Find
  path 1 = 12 against the route's 10. Under the 2x limit. The two extra are the Analyze menu's
  search (2 steps where the `p` key is 1) and the refused click.
- **Wrong turns:** 0. Step 3 (`--click "minutes"`) was refused by the tool because two things carry
  that name (the column header and the "Role of minutes" box), and nothing changed on screen
  (`03.png` is byte-identical in size to `02.png`); Tom went straight to the role box next.
  Recorded as a lost step, not a detour in the app.
- **False "done":** none. "Finished: yes" and every claim in the end statement (route, 14
  minutes, Made with's Weight row, Total minutes, Loaded weight) are true on `07.png` and
  `14.png`. truth-on-screen: holds.
- **Wording echo:** possible, after the fact only. Tom chose "Farther" at step 5 from the task's
  own idea ("more minutes is a longer trip") before the helper line was on screen; in the debrief
  he quotes that line's "travel time" ("Farther was clear once the sentence under it said 'travel
  time'"), which appears only after Farther is chosen (`06.png`). It did not lead the choice.
- **Silent commit:** none. Each choice changed the summary line at once ("Weight: minutes", then
  "Weight: minutes (farther)"); Load drew the graph and the Overview; Find path drew the route and
  opened its Values.
- **Numbers that disagree:** none. 5 nodes and 4 edges match the five listed stops; 14 matches the
  file's minutes on the route's four rows.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the refused click was
  reported by the tool and left the page unchanged, and `leaks.json` shows no leaks over 33 calls.
- **Scripted exit:** not applicable; Tom finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                                                                  |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | On the import page the minutes column starts as "Attribute", and the only sign that the number will not count is the small line "Weight: none (each edge counts 1)". Making it count takes two separate choices (role Weight, then Higher means Farther), and Load is enabled with neither. A reader who skips that line loads a graph whose paths count links, the `weight-not-read` answer. | `02.png` ("Weight: none (each edge counts 1)", minutes role "Attribute", Load enabled); debrief: "If I hadn't read that line I'd have loaded it and every hop would count the same. Nothing stopped me pressing Load without choosing." |
| 2   | 2        | trust           | "Direction: As the file says" loads the stops as Directed with arrowheads, and the path form's "Follow: Out / All" (starting on All) has no words saying what All does. Tom could not tell whether the route might ride a bus the wrong way; with All, direction is ignored. It did not change his answer, but he finished unsure and would ask a colleague.             | `07.png` (Overview "Direction Directed"); `10.png` ("Follow Out | All", no explanation); debrief: "I'm not sure whether 'All' let it ride a bus the wrong way" |
| 3   | 2        | visual          | No stop names are drawn on the canvas, so before the result Tom could not find Depot or Harbor on the drawing and had to trust the typed boxes; the route is read only from Nodes in order. Picking From or To does not mark the node on the drawing.                                                                              | `07.png`, `12.png`, `14.png`; debrief: "The dots on the picture have no names ... I had to trust the typed boxes."                                       |
| 4   | 1        | discoverability | The Analyze menu opens on a long list of unfamiliar names (Degree, Betweenness, Katz, HITS) with no shortest path in view; Tom had to type into its filter to find it. Cost one extra step against the `p` key.                                                                                                                  | `08.png`, `09.png`; debrief: "typing 'path' in the filter is what saved me"                                                                               |
| 5   | 1        | wording         | "Capacity" under Higher means has no explanation until it is chosen; Tom did not know what it was and avoided it. Harmless here because Farther was right.                                                                                                                                                                       | `05.png`; debrief: "I don't know what Capacity is and didn't want to find out."                                                                          |
| 6   | 0        | tool            | The minutes column's header and its role box share the name "minutes", so a click by that name is refused as ambiguous. A tool limitation, not something a sighted reader meets; noted because it cost a step.                                                                                                                  | `03.png` (unchanged from `02.png`); transcript step 3                                                                                                    |

Problems 1 to 5 rest on this one participant and are not confirmed by this session alone. Problems
1 to 4 match those recorded in session r4-s30 (T20 B), so 1 to 4 now have two participants each.
