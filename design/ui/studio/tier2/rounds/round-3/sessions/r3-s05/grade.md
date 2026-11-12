# Grade: session r3-s05 -- Alex (returning analyst), bus stops (T20 A), a weight that means "farther"

**Grade: S** (success). The last screenshot, `13.png`, shows the Shortest path run open on its
Values: Summary "Path 5 nodes, 4 edges" and "Total minutes 14"; Nodes in order Depot 1, Market 2,
Park 3, Clinic 4, Harbor 5; Made with Analysis "Shortest path", From "Depot", To "Harbor", Follow
"All", Weight "minutes (farther)". The canvas key at the top left reads "Shortest path" beside a
black swatch, and the route's five nodes and four edges are drawn black and thicker. Every value
matches the key. Alex answered "Depot -> Market -> Park -> Clinic -> Harbor, 14 minutes in all" and
pointed to three places that say the minutes were used: the import screen's "Weight: minutes
(farther)" (`06.png`), the graph Overview's "Loaded weight minutes (farther)" (`07.png`), and the
result's Made with Weight "minutes (farther)" plus "Total minutes 14" (`13.png`). The key accepts
Loaded weight or Made with's Weight; both were shown.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900, no uncommitted changes. Start: empty, as the task specifies. `session.log` is empty:
no script, console or request errors. `leaks.json`: no leaks. Not void.

## The answer against the key

- **Minutes read at load, as farther (right).** `05.png`: role set to Weight, Higher means shown on
  "Not set" with the warning line; `06.png`: Farther chosen, summary "Weight: minutes (farther)",
  line "...a path takes the smallest total."
- **Loaded graph (right).** `07.png`: Nodes 10, Edges 17, Direction Directed, Loaded weight
  "minutes (farther)".
- **The run used the loaded weight (right).** `10.png`: the Shortest path form's Weight starts on
  "minutes (farther, loaded)", as the key says.
- **Route and total (right).** `13.png`: Depot, Market, Park, Clinic, Harbor; Total minutes 14.
  Not the `weight-not-read` answers (Depot, Station, Harbor or Depot, School, Harbor). Alex also
  checked the sum against the import preview rows (4 + 3 + 4 + 3), which the preview in `06.png`
  bears out.
- `work.json`: start null (empty start), end holds one Shortest path run, its two route layers, the
  two default layers and the source bus-stops.csv. Nothing gone.

## Measures

- **Steps:** 12 `real.mjs` steps after the start (counting each type-then-pick pair for From and To
  as one, as the key does), against the round 2 route's 10. Ratio 1.2x, within the 2x target of
  bar 11. The two extra steps: one no-op click (below) and opening the analysis through the Analyze
  button, its filter box and the list row (3 steps) instead of the key's single `p`.
- **Wrong turns:** 0. Step 3 (`--click "minutes"`, `03.png` identical to `02.png` byte for byte)
  did nothing because the tool's text match found two targets, the column caption above the role
  box and the table header. The participant's intended target was right and a person would simply
  have clicked one of them, so it is recorded as a tool addressing cost, not an app wrong turn.
- **Tool fault:** no. The tool refused an ambiguous target and changed nothing; it neither did
  something a person could not nor misrouted a click. The session is not void.
- **False "done":** none. "Finished: yes" with the route, the total and the three places is true on
  `13.png`, `07.png` and `06.png`. truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Broken habit:** none. Alex's history names the analysis button; it led straight to Shortest
  path through the filter box (`08.png`, `09.png`, `10.png`).
- **Route recorded:** "Open project or file..." from the start screen (the round 2 route), role box,
  Weight, Farther, Load, Analyze button, filter "shortest path", From, To, Find path.
- **Implementation defects hit:** none. Every screen matches the key's description of this build.
- **Earlier work kept:** yes (empty start; nothing removed).
- **Build-decided:** no. **Void:** no. **Scripted exit:** not applicable; Alex finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                       | Evidence                                    |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | 2        | defaults        | A numeric column named "minutes" in a from/to edge file loads with the role "Attribute" and the summary "Weight: none (each edge counts 1)". Load is enabled in that state, so a user who does not read the summary line gets the fewest-links route (`weight-not-read`) without knowing it. Alex caught it only by reading that line and said so. | `02.png`; transcript step 2 and wrap-up     |
| 2   | 2        | visibility      | No stop names are drawn on the nodes and the route cannot be read from the drawing; the answer comes only from the Nodes in order list. Alex: "the picture alone can't tell me the route." Matches the key's note for both halves.                                                                                                              | `07.png`, `13.png`; wrap-up                 |
| 3   | 1        | comprehension   | "Follow: Out / All" on a graph the Overview calls Directed gives no hint which one respects one-way links; Alex left All without knowing whether one-way links were walked backwards, and leaned on "Follow All" being shown on the result. Opinion-level, held one down.                                                                       | `10.png`, `13.png`; wrap-up                 |
| 4   | 1        | labeling        | The column name "minutes" appears twice on the import page (caption above its role box and the preview table's header), so the first attempt to open the role went to an ambiguous target. Mostly a cost of text addressing in the tool; for a sighted person the caption is not a control, which is also why the click did nothing useful.   | `02.png`, `03.png` (identical); step 3      |
| 5   | 1        | visibility      | The highlighted route's Park-to-Clinic edge ends under the large Clinic node with no visible arrowhead, so the route's direction is not readable on that edge. Grader observation from the screenshot; Alex did not mention it. Matches the key's note.                                                                                         | `13.png` (edge from 935,546 to 863,661)     |

No severity 3 or 4: the answer was right and complete, the load-time trap was announced on screen
and avoided, and every step landed where the key says it does.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
