# Grade: session r3-s28 -- Dev (student with a class project), task T9 B, Florentine families

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mouse
session at 1440 x 900. Graded from the last screenshot (11.png), the end-of-task screenshot
(09.png) and the transcript. No files were downloaded, and the task asks for none. Not graded from
the participant's rating (6 of 7).

## Grade: S (success)

Every part of the success definition holds on screen:

1. **A ranking run.** Steps 3-5 (03.png-05.png): Analyze, Betweenness, Run, defaults kept. The
   legend reads "Color: Betweenness 0 ... 47.5" and the outline gains "Betweenness 15".
   Betweenness sits under "Rank nodes and edges", so it is a ranking. For "the more the network
   depends on a family", its own line ("Which nodes sit on the most shortest paths between others")
   fits better than the "Start here" PageRank. Holds.
2. **Node sizes bound to the result.** Steps 6-9 (06.png-09.png): the Betweenness row, "Add to
   Shape", Size (the from-data list opened at once), option "Betweenness". The Size line reads
   "1 to 3". The legend gains "Size: Betweenness 0 ... 47.5". The dots differ visibly in 09.png and
   11.png: the Medici dot is far larger than the rest. The list was used, not closed, and "Fixed
   size" was not chosen. Dev said the sizes changed only after the binding, which is true. Run
   alone left them equal (05.png), and Dev said so at step 5. Holds.
3. **Meaning stated from the screen.** In the debrief Dev said that size and color both stand for
   Betweenness on the same scale, 0 to 47.5: "bigger dot = higher betweenness; darker dot = higher
   betweenness", and he cited the key. This matches the legend in 11.png. Holds.

- **Build-decided:** no.
- **Void:** no. The tool did nothing a person could not. The hover at step 10 reached the node (the
  tool reports "Medici"), and the app drew nothing because no tooltip line was set.
- **Failure codes:** none.
- **Sizing record:** the list was used. It was not closed and "Fixed size" was not chosen. The
  participant mentioned that the sizes had not changed after Run (step 5), before binding them.
- **Activation (picked and ran a ranking measure with no help, no tooltip, no detour):** yes. He
  passed over the "Start here" tag on PageRank by his own reasoning.

## Counts

| | This session | Reference |
|---|---|---|
| Steps to the end state | 9 (01.png-09.png) | 8 (round 3 path) |
| Commands after the start, to the end state | 8 (No thanks and the sample as one command) | 10 |
| Wrong turns | 0 | -- |

- The extra step is the usage card's "No thanks", which the reference path does not count.
  Analyze was opened with the toolbar flask instead of Shift+A, which the hint on screen offers.
  That is the same step.
- **After success (not counted against the path):** the hover at step 10 (nothing shown) and the
  click at step 11 (the inspector names Medici, "47.5, #1 of 15"). These were exploration beyond the
  task, to learn which family the big dot is.

## False "done"

None. "Done" (step 11) and "Did I finish? Yes" both match the screen: the sizes are bound, the key
reads "Size: Betweenness" and "Color: Betweenness", and the Medici facts he quoted are shown in the
inspector of 11.png.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. No build defect was found,
so no repro script was needed.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | Hovering a dot shows nothing, not even its name. Dev could not say which family the biggest dot is until he clicked it. Naming who the network depends on is the point of sizing them. Confirmed: the same happened in r3-s02. | Step 10: 09.png and 10.png are identical; the tool reports the node "Medici" under the pointer. Debrief: "No names on the dots, and hovering a dot shows nothing." |
| 2 | 2 | behavior | After Run, only color changes. Nothing on the result offers sizing, and Size is hidden behind the "+" on the Shape heading. Dev had to guess that size lives under Shape. | Steps 5-7, 05.png-07.png; debrief second confusion point. |
| 3 | 1 | opinion | The "Start here" tag on PageRank pulls toward a measure that fits "depends on most" less well than Betweenness. Dev resisted it only because of his class tutorial. He said that a student without that tutorial might just take "Start here". | Step 3, 03.png; debrief first confusion point. |
| 4 | 1 | wording | The Size line's "1 to 3" has no unit or meaning that Dev could explain. | 09.png, Size "1 to 3"; debrief third confusion point. |
| 5 | 1 | wording | The size list offers Betweenness, "Betweenness rank" and "Betweenness percentile" with nothing saying how the picture would differ. Dev skipped the question by taking the plain one. | Step 8, 08.png. |
| 6 | 1 | opinion | On the shaded 3D balls the middle oranges look alike, so the color key reads less well than the sizes. | 09.png, 11.png; debrief last point. |

**What worked:** the flask hint on the empty outline led straight to Analyze. Betweenness has a
plain one-line definition. Run colors the drawing and adds a key by itself. Size "+" opens its
from-data list at once, with the run's measure first, so "Fixed size" was never met. The key gains
"Size: Betweenness" the moment the size binds. Clicking a dot gives its name and its "#1 of 15"
rank in the inspector.
