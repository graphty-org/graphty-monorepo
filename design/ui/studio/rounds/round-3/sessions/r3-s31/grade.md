# Grade: session r3-s31 -- Nadia (level-1 alert reviewer), untangle the drawing, Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mouse
mode. Graded from the last screenshot (11.png), the earlier screenshots and the transcript, plus a
scripted re-run on the same build. No files were saved, and none were needed. Not graded from the
participant's rating (4 of 7).

## Grade: S (success)

The task's success definition: a different layout method applied (not a re-run of the same one),
and node positions visibly changed between screenshots. Whether it "helped" is an opinion and is
not graded.

- **Different method applied, positions changed: yes, at step 6.** Layout (step 4), Circle (step 5),
  Apply (step 6). 02.png (Force, 3D) against 06.png (Circle, 3D): every node moved, into a round
  ball. This is the success path with one extra hover to learn the icon's name.
- **Applied again twice.** Spectral at step 9 (09.png: most nodes in one lump, two arms), then
  Force with Shape 2D at step 11 (11.png: a flat force drawing that fills the canvas). The final
  screen differs from the opening one (02.png against 11.png). On its own, the last apply would
  count as the same method with a changed setting, but Circle and Spectral had already met the
  definition.
- **Did it help (opinion, recorded):** Circle and Spectral "worse"; flat Force "better, four or five
  groups". 11.png does show separate knots (top right, left, bottom) and the fan on the left.
- **Community run made:** no. **Group layout tried:** no. Rings by group, Two columns and Columns by
  group were greyed with "Needs a node attribute to group by" (04.png, 07.png). That is correct
  before any community run on Les Miserables, not a defect. She wanted exactly these ("the ones
  with group in the name sound like what I want") and skipped them because nothing told her how to
  get an attribute (problem 3).
- **No crossings:** she read the refusal and did not pick it. Not a wrong turn; the wording is
  problem 4.
- **Build-decided:** no. **Void:** no; the tool did nothing a person could not.
- **Failure codes:** none.

## Counts

|                                              | This session                                  | Success path                                           |
| -------------------------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| Commands after the start (real.mjs `--step`) | 10 (steps 2-11; four of them held two clicks) | 3 (open the sample, Layout, a method, Apply; 4 clicks) |
| Commands to the first success                | 5 (steps 2-6)                                 | 3                                                      |
| Wrong turns                                  | 0                                             | --                                                     |

- **No wrong turns.** Each later apply was another valid layout, not a step off the success path;
  she tried others because the first "did not help", which the answers expect on this build.
- **Exploration (not counted):** the hover on the Layout icon (step 3), Spectral (steps 7-9) and
  Force 2D (steps 10-11).
- Commands against the reference: 5 to the first success (about 1.7x); 10 in all (about 3.3x),
  driven by the search for a drawing that helped, not by a missing control.

## False "done"

None. Her claim at step 11 ("Flat, I can see four or five groups ... I'm done") matches 11.png: a
flat force drawing with several visible knots and the fan on the left. Her debrief says that the
flat Force made the clusters easier to tell apart, and that is an opinion, not a claim about state.
Her remark that the toolbar still says "3D" is also true of the screen (problem 2).

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. The re-run is
`rounds/round-3/repro/r3-s31/repro.sh` (output in `run/` and `run.log`): the session's route as a
script (Circle, Spectral, Force 2D). It was run twice.

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Evidence                                                                                                |
| --- | --- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | 2   | build-defect | Spectral gives a different drawing on every apply of the same graph. The shape is the same (about 72 nodes in one small lump, a two-node arm and a three-node arm), but it is mirrored or rotated each time: lump bottom-left in the session, top-left in the first re-run, top-right in the second. In the session's orientation the lump sits half under the floating toolbar. The owner's rule is that the app passes a layout seed so the same drawing comes back every load; Spectral does not come back the same. | Step 9, 09.png (lump under the toolbar). Repro: `run/06.png` on two runs, each a different orientation. |
| 2   | 2   | behavior     | The Force and Circle forms have a "Shape 3D / 2D" choice, and the toolbar has a "3D" button (accessible name and tooltip "View"). After Force with Shape 2D was applied, the toolbar still read "3D". She could not tell whether she had changed the drawing or only the view. Two controls use the same words for two different things. Seen in one participant.                                                                                                                                                       | Step 11, 11.png; debrief. Repro: `run/08.png` reads "3D"; step 9 of the repro prints `button "View"`.   |
| 3   | 2   | behavior     | The group layouts that match the task (clusters) are greyed with "Needs a node attribute to group by", and nothing says how to get one (for example, a community run in Analyze). She skipped them, and so missed the route the answers call the right one for this task. Seen in one participant.                                                                                                                                                                                                                      | Step 4, 04.png; step 7, 07.png; debrief.                                                                |
| 4   | 2   | wording      | The No crossings refusal reads 'the layout "planar" cannot draw this graph without crossings: G is not planar.' She called it "programmer talk". This is graphty-element's English shown as is.                                                                                                                                                                                                                                                                                                                         | Step 4, 04.png; debrief.                                                                                |
| 5   | 2   | behavior     | Spectral's description promises "densely connected groups land near each other", and the result put almost every node in one lump with no groups visible. The promise and the drawing disagree on this graph.                                                                                                                                                                                                                                                                                                           | Step 8, 08.png against step 9, 09.png. Repro: `run/05.png` against `run/06.png`.                        |
| 6   | 1   | wording      | The Force description says "with 'dim: 2', flat", which reads like code; she guessed it meant the 2D button.                                                                                                                                                                                                                                                                                                                                                                                                            | Step 10, 10.png.                                                                                        |
| 7   | 1   | behavior     | Circle with its default Shape 3D draws a ball, not a ring. The description says "on one circle", so the default does not match the name.                                                                                                                                                                                                                                                                                                                                                                                | Step 6, 06.png. Repro: `run/04.png`.                                                                    |
| 8   | 1   | opinion      | The Layout menu does not say what each method is good for until it is opened. She found the method that best matched her task (Spectral) only by clicking into it.                                                                                                                                                                                                                                                                                                                                                      | Step 8; debrief.                                                                                        |
| 9   | 1   | opinion      | The toolbar icons have no words; she had to hover to learn "Layout".                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Steps 2-3, 02.png.                                                                                      |
| 10  | 0   | opinion      | Nothing is announced after Apply, though the change is visible. Not a silent commit: the canvas changed every time.                                                                                                                                                                                                                                                                                                                                                                                                     | Steps 6, 9 and 11.                                                                                      |

**What worked:** one hover named the Layout icon. The menu lists every method, ticks the current
one, and greys the ones that cannot run, each with a reason. Every method form has a one-line
description, an estimate ("Under a second") and one Apply. Each Apply changed the drawing at once,
and Force with Shape 2D gave a flat drawing that fills the canvas.
