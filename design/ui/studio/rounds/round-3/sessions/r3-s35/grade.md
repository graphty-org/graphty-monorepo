# Grade: session r3-s35 -- Mara (the Gephi holdout), untangle the drawing, Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted, mouse.
Graded from the last screenshot (15.png), the earlier screenshots it depends on (02.png, 07.png,
08.png, 11.png, 13.png, 14.png) and the transcript, plus one scripted re-run on the same build. No
files were saved, and the task asks for none. Not from the participant's rating (5 of 7).

## Grade: SD (success with difficulty)

1. **A different layout method applied.** Step 6 (07.png): Spectral, picked from the Layout list
   and applied with Apply. Force was the method in use at the start (04.png, ticked). Spectral is
   a different method, not a re-run or a seed change. Holds.
2. **Positions visibly changed.** 02.png against 07.png: the whole drawing collapsed into a clump
   with two thin arms. Holds.
3. **"Did it help" (opinion, not graded).** She says Spectral made it far worse, flat Force
   helped clearly, and more repulsion helped a little. All three match the screen (07.png, 11.png,
   15.png).

- **Why SD and not S:** the qualifying step came on the success path with no detour (the two
  hovers before it were checks of what a control is), but she undid it (step 7) and the session
  ends on the method she started with, Force, with its Shape set to 2D and Gravity changed. The
  last screenshot alone shows a different arrangement (flat against 3D, 02.png against 15.png)
  but not a different method; the success rests on step 6. Getting the second Force run applied
  also cost a step: the typed Gravity value did not reach the Apply button until she pressed
  Enter (problem 3).
- **Build-decided:** no. The success path worked. **Void:** no.
- **Failure codes:** none.
- **Usage card:** declined ("No thanks") without a detour. No wrong belief about what is sent.

## Counts

| | This session | Success path (round 2 and 3 build) |
|---|---|---|
| Steps (real.mjs, after the start) | 14 (step 1 and step 12 each held several commands) | 4 |
| Steps to the qualifying apply | 6 | 4 |
| Wrong turns | 1 | -- |

- Wrong turn 1: Spectral applied, then undone with Control+Z (steps 6-7). Undone by judgment.
- Two hovers (steps 2 and 4) were checks of what a control is; counted as steps, not wrong turns.
- The "Apply" click at step 12 found nothing (the button read "Applied"), and step 13 (Enter) was
  spent recovering. Caused by the build (problem 3), not counted as her wrong turn.
- Steps 8-14 (Force in 2D, then Gravity -4) came after the success definition was met; they are
  exploration, not detours.
- Steps against the path: 14 / 4 = 3.5x, outside the 2x measure; 6 / 4 = 1.5x to the qualifying
  apply.

## False "done"

None. Her final claims match the screens: Spectral "collapsed into one blob with the pendant chains
stretched out" (07.png); flat Force shows "three cliques and the bishop's star" as separate groups
(11.png); gravity -4 is "slightly airier, structurally the same" (15.png against 11.png: positions
moved, same shape). Her reading of 13.png ("the button still claims it's applied") was correct.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. Problems 3 and 4 were
re-run by `rounds/round-3/repro/r3-s35/repro.sh` (output in `run/` and `run.log`); problems 1 and
2 were reproduced on the same build by `rounds/round-3/repro/r3-s33/repro.sh`.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | Spectral on Les Miserables puts nearly all 77 nodes in one overlapping clump at the edge of the canvas, under the toolbar, with a few nodes flung far out on long edges, and the camera does not reframe it. Nothing on screen says the result is degenerate; the form promised "densely connected groups land near each other". An expert recognized why; she notes "a student would think the tool broke". Also met in r3-s33: confirmed. | Step 6, 07.png. Repro: `rounds/round-3/repro/r3-s33/run/06.png`. |
| 2 | 2 | build-defect | Undo restores the previous positions but does not refit the camera: the drawing sits half off screen at the bottom right. Also met in r3-s33: confirmed. | Step 7, 08.png. Repro: `rounds/round-3/repro/r3-s33/run/07.png`. |
| 3 | 2 | build-defect | In a layout form, a number typed into a field (Gravity) is not taken until Enter is pressed: the button stays greyed "Applied", so there is no Apply to press and the typed value would be lost on closing. She guessed Enter from Gephi habit; a newcomer may close the form believing the change applied. | Step 12, 13.png ("-4" in the field, "Applied" greyed; the tool printed nothing called "Apply"); step 13, 14.png (Apply enabled after Enter). Repro: `run/07.png` (typed -4, "Applied"), `run.log` step 08 (`expected on screen, not there: "role=button:Apply"`), `run/09.png` (Apply after Enter). Same every run. |
| 4 | 2 | behavior | The Force form's "Shape 3D / 2D" and the toolbar's "3D" button (accessible name "View") use the same words for two different things. After Force with Shape 2D was applied, the toolbar still read "3D"; she called it "odd" and could not tell which governs the drawing. Also met in r3-s31: confirmed. | Step 10, 11.png; 15.png. Repro: `run/05.png` (flat drawing, toolbar "3D"); `run.log` step 11 (nothing called "3D": the button's name is "View"). |
| 5 | 2 | wording | The Force description ends "in three dimensions or, with 'dim: 2', flat": a configuration key in a sentence, beside a Shape control that already says 2D. The words come from graphty-element and are shown as is; the app should write them. | Step 8, 09.png; 10.png. Repro: `run/04.png`. |
| 6 | 2 | wording | "No crossings" is greyed with graphty-element's own English: 'the layout "planar" cannot draw this graph without crossings: G is not planar.' She called it "a Python traceback leaking through". Also met in r3-s33: confirmed. | Step 3, 04.png. |
| 7 | 1 | opinion | "Force" never names its algorithm (no tooltip on hover, no name in the form). From its options she inferred a spring-electrical model, not ForceAtlas2, and said she could not cite it in a methods section. Held one level down. | Step 4, 05.png (tooltip null); step 9, 10.png. |
| 8 | 1 | wording | Option labels mix case: "Spring length", "Gravity" against "Spring Coefficient", "Drag Coefficient", "Time Step". | Step 9, 10.png. |
| 9 | 0 | opinion | No LinLog, prevent-overlap or dissuade-hubs settings, so the hub core stays knotted. An expert's wish, outside the task. Held one level down. | Step 9, 10.png; debrief. |

**What worked:** Layout was found by one hover on the toolbar. Each layout opens a form with a
description, its options, a time estimate and Apply before anything moves. Undo covered a layout
change in one key ("more than Gephi does"). The form remembered Shape 2D and her settings between
openings (12.png), and Advanced shows the seed and every parameter, which she valued for
reproducibility.
