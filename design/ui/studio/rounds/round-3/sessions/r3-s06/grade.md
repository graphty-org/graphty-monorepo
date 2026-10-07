# Grade: session r3-s06 -- Alex (intermediate analyst), a whole first session, Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json). Graded from the last
screenshot (16.png), the saved image `downloads/les-miserables_current-view.png` (1806 x 1720) and
the transcript, plus one scripted re-run on the same build. Not from the participant's rating (6 of
7).

## Grade: S (success)

All five parts hold in one sitting, and no later step undid an earlier one:

1. **Sample drawn.** Step 3 (03.png): Les Miserables, 77 nodes, 254 edges.
2. **Ranking run from Analyze, finished.** Steps 4-6 (04.png-06.png): Analyze, typed
   "betweenness", Enter (opens the form, as documented), Run. The outline gained "Betweenness 77"
   and the key "Color: Betweenness 0 to 1624". Betweenness is a ranking measure; the top value
   1624 is Valjean's reference value.
3. **Sizes bound to the result, visibly different, meaning stated.** Steps 7-10 (10.png):
   Betweenness row, "+" beside Shape, Size, Betweenness. The Size line reads "1 to 3" and the key
   gained "Size: Betweenness 0 to 1624". In the wrap-up he said both size and color are
   betweenness, "how often a character sits on the shortest route between two other characters",
   bigger and darker meaning more. Correct.
4. **Label line bound to `name` on a row that covers every node, names drawn.** Steps 11-13
   (12.png, 13.png): the line is on the Betweenness row, which holds all 77 nodes. Names are drawn.
   "Show all labels" was used (step 13); the panel reads "77 labels".
5. **Image downloaded that passes the picture checklist.** Steps 14-16: Main menu, Export...,
   Export. Checklist against 16.png:
   - same nodes and arrangement as the final screen: yes;
   - sizes visibly different: yes;
   - the names drawn on screen are drawn in the image (every name, since "Show all labels" was
     on): yes, all drawn; small and soft, and Valjean's is drawn over his own dot (problems 1, 2);
   - a key naming every channel in use: yes, "Size: Betweenness" and "Color: Betweenness", each
     with its range.

- **Activation measure:** yes. He picked a ranking measure (Betweenness, by his own reasoning,
  passing over the "Start here" tag on PageRank) and ran it with no help, no tooltip and no detour.
- **Failure codes:** none on the task.
- **Build-decided:** no. **Void:** no (the `ambiguous` print at step 16 is the known one for
  "Export" and took the intended button).
- **Partial:** 5 of 5 parts reached.

## Counts

| | This session | Reference |
|---|---|---|
| Steps (real.mjs, after the start) | 15 | 15 on the round 3 route with "Show all labels" and the usage card |
| Wrong turns | 0 | -- |

- Step 5's Enter opened the Betweenness form instead of running it. That is the documented
  behavior (Enter picks, Run runs), so it is not a wrong turn; he noted it cost one more click.
- The image was reached by Main menu > Export... (one click more than Control+E), a documented
  route; using it instead of Control+E offset the step saved elsewhere.
- "Size" was found under "Shape" on the first guess (step 8).

## False "done"

None. Each "part done" claim matches its screenshot. At step 13 he said every name was written but
the middle is not readable, which is what the screen shows. At step 16 he said the image has the
key and that Valjean's name cannot be read, which is what the file shows.

One wrong statement that is not a "done" claim: in the wrap-up he ranked the top three as
"Valjean ... then Myriel (bottom) and Fantine (top)", read from dot sizes. The run's values (re-run,
Values tab, `repro/r3-s06/run/16.png`) put Gavroche third (470.6) and Fantine fifth (369.5), after
Marius (376.3). The task did not ask for a top three, so it does not change the grade; it is
problem 3.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. The build defects below
were reproduced by `rounds/round-3/repro/r3-s06/repro.sh`, which runs his route as a script. The
output is in `run/` and `run.log`. The re-run's exported image is byte-identical to the session's
(same checksum).

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | With sizes bound to the ranking, the top node's name (Valjean) is drawn on top of his own enlarged dot, dark text on the darkest fill, and cannot be read, on screen and in the exported image. The name sits at the same height above the dot center whatever the dot's size, so the biggest dot swallows it. The one name a reader of the picture most needs is the one that is illegible; he said he would have to type "Valjean" onto the slide himself. | Steps 10, 13, 16 (10.png, 13.png, 16.png) and `downloads/les-miserables_current-view.png`. Repro: `run/13.png`, `run/16.png`, `run/downloads/les-miserables_current-view.png`, every run. |
| 2 | 2 | build-defect | In the 2x export, node names are soft and blurred while the key's text is sharp; names in the middle run together. Seen also in session r3-s02 and its repro. | Step 16, `downloads/les-miserables_current-view.png`. Repro: `run/downloads/les-miserables_current-view.png`. |
| 3 | 2 | behavior | Ranking read from dot size in the default 3D view comes out wrong: he named Fantine third, and she is fifth (369.5) behind Gavroche (470.6) and Marius (376.3). With sizes from 1 to 3 the gap between those values is a small size difference, and perspective makes nearer dots look bigger. The Values tab holds the true order, but nothing on the drawing points to it. Same mechanism as the T15 B "watch" note. | Debrief; 16.png; re-run `run/16.png` (Values, Top 10). One participant. |
| 4 | 2 | behavior | "Size" has no line of its own; it sits under "Shape". He found it on the first guess, only because Gephi trained him to look near shape. Now seen in two participants (r3-s02, r3-s06). | Steps 7-8, 07.png, 08.png. |
| 5 | 1 | opinion | After Run, the orange-to-brown scale separates only the top two or three nodes; the rest look the same. Color and size both bound to the same measure, so the color adds nothing once sizes are set. | Steps 6 and 10, 06.png, 10.png. |
| 6 | 1 | wording | The key's raw betweenness range (0 to 1624) has no unit or explanation; "a director will ask '1624 what?'". | Steps 6 and 10, 06.png, 10.png. |
| 7 | 1 | behavior | Enter in the Analyze filter opens the method's form rather than running it. He expected a run; the "Under a second" estimate on the form made the extra stop worthwhile to him. | Step 5, 05.png. |
| 8 | 0 | wording | The menu item, the dialog title and the button are all "Export". | Steps 14-16, 14.png, 15.png. |

What worked: "never uploaded" and "Local only" at the load point earned trust at once. Typing in
the Analyze filter found Betweenness directly. The run painted the drawing and added a key. Size
"+" opened the attribute list at once, with grayed-out `id` and `name` explained ("Holds groups,
not amounts"). "77 labels, 7 hidden" plus "Show all labels" told him what was hidden and let him
turn it off. Main menu > Export... was where he expected it, the preview showed the key, and the
exported key carries both channels with their ranges.
