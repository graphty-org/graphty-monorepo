# Grade: session r3-s33 -- Ruth (reporter), untangle the drawing, Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted, mouse.
Graded from the last screenshot (20.png), the earlier screenshots it depends on (09.png, 11.png,
18.png) and the transcript, plus one scripted re-run on the same build. No files were saved, and
the task asks for none. Not from the participant's rating (4 of 7).

## Grade: SD (success with difficulty)

1. **A different layout method applied.** Step 20 (20.png): "Columns by group", grouped by the
   Louvain result, applied with Apply. Force was the method in use at the start (05.png, ticked).
   Columns by group is a different method, not a re-run or a seed change. Holds.
2. **Positions visibly changed.** 15.png (Force, colored by Louvain) against 20.png: the six
   groups now stand in six vertical columns. Holds.
3. **"Did it help" (opinion, not graded).** She says Columns by group helped, Rings by group and
   Spectral did not. Both readings match the screen.

- **Why SD and not S:** she reached the end state after a detour. Circle was opened and left
  (steps 6-7), and Spectral was applied and undone (steps 8-11). Spectral at step 9 already met
  the success definition (a different method, positions changed), but she judged it a failure and
  undid it, and the session's end state comes from the group-layout route that answers.md lists
  for "clusters easier to tell apart" (Louvain, then a group layout), reached through her own
  guess that Analyze is where "a node attribute to group by" comes from.
- **Route to the end state:** the "group layouts after a community run" path, with Rings by group
  tried before Columns by group.
- **Build-decided:** no. The success path worked. **Void:** no.
- **Failure codes:** none.
- **Usage card:** declined ("No thanks") without a detour. No wrong belief about what is sent.

## Counts

| | This session | Success path (round 3, group layouts) |
|---|---|---|
| Steps (real.mjs, after the start) | 19 (step 19 held 2 commands) | about 8 |
| Wrong turns | 2 | -- |

- Wrong turn 1: Circle opened, read, then Back to layouts (steps 6-7). Abandoned.
- Wrong turn 2: Spectral applied, then undone (steps 8-11, including the hover on Undo). Undone.
- Two hovers (steps 4 and 10) were checks of what an icon is, not mistakes; they are counted as
  steps but not as wrong turns.
- Rings by group (steps 17-18) is on the success path ("Rings by group (or Columns by group)") and
  itself met the end state; she moved on by judgment, so it is not counted as a wrong turn.
- Steps against the path: 19 / 8, about 2.4x, outside the 2x measure.

## False "done"

None. Her final claim ("I found an arrangement that separates the clusters", step 20) matches
20.png: six columns, one per Louvain group. Her report on Spectral ("this is much worse") and on
Rings by group ("did not help") also match 09.png and 18.png.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. The two build defects were
reproduced by `rounds/round-3/repro/r3-s33/repro.sh`, which opens the sample, applies Spectral and
presses Undo. Its output is in `run/` and `run.log`.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | Spectral on Les Miserables puts about 70 of the 77 nodes in one overlapping clump in a corner of the canvas and flings the rest far away on long edges. Nothing on screen says the result is degenerate. The form's own line promised "densely connected groups land near each other". A reader cannot count, hover or read anything in the clump. She undid it. | Step 9, 09.png (clump top left, five outliers). Repro: `run/06.png`, clump at the bottom right with outliers; the corner changes between runs (the sign of the result flips), the clump does not. |
| 2 | 2 | build-defect | Undo restores the previous positions but does not refit the camera: the drawing sits off center with part of it cut off at the canvas edge and empty canvas beside it. It stayed unframed through the Louvain run (15.png). | Step 11, 11.png (top cut off); 15.png. Repro: `run/07.png`, drawing pushed to the bottom right and cut off at the bottom edge. |
| 3 | 2 | behavior | "Rings by group" and "Columns by group" are greyed with "Needs a node attribute to group by", but nothing says how to get one. She found the way (run a community analysis first) by a guess from the sample's blurb and the empty outline's hint. A newcomer who does not guess stops at Force, Circle, Spectral. | Step 5, 05.png; step 11 reasoning; step 16, 16.png (unlocked after Louvain). |
| 4 | 2 | wording | Greyed layouts show graphty-element's own English as is: 'the layout "planar" cannot draw this graph without crossings: G is not planar.' and 'the layout "bipartite" needs exactly two groups, and "results.louvain.group" names 6'. She did not know what G, planar, bipartite or the dotted path mean. The app should write these words from the element's code and parameters. | Step 5, 05.png; step 16, 16.png. |
| 5 | 2 | build-defect | The color key ("Color: Louvain") is drawn over the top-left corner of the drawing and the camera does not refit around it; in the Force and Rings drawings it covers part of the graph. Already reproduced for round 3 in `rounds/round-3/repro/r3-s30/`. | Step 15, 15.png; step 18, 18.png (outer ring under the key). |
| 6 | 1 | wording | The same groups are named "Louvain" in the outline and the key, and "Communities" in the layout form's "Group by" box. She assumed they were the same; it cost no steps. | Step 17, 17.png. |
| 7 | 1 | opinion | Rings by group nests the groups as concentric rings, so they are told apart only by color, which the drawing already had, and the edges become a web across the whole canvas. Held one level down. | Step 18, 18.png; debrief. |
| 8 | 1 | opinion | Group 2 (light blue) and Group 4 (dark blue) are hard to tell apart as small dots. Held one level down. | Step 15, 15.png; debrief. |
| 9 | 1 | opinion | Circle's description ("in the order the nodes were loaded") told her up front it would not separate clusters, which saved a wasted Apply. Recorded as a positive. | Step 6, 06.png. |
| 10 | 0 | opinion | No names on the dots, so she cannot say who is in which column without hovering each one. Outside the task. | Step 20, 20.png; debrief. |

**What worked:** each layout opens a form with a one-line description, its options and a time
estimate before anything moves, so picking a method commits nothing. Undo brought the old
arrangement back in one click. Running Louvain unlocked the group layouts at once, and the group
layout forms picked the Louvain result without being asked. "Start here" on Louvain and the
"group" filter in Analyze found the right method in two steps.
