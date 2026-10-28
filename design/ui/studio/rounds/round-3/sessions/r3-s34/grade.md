# Grade: session r3-s34 -- Dana (supply chain risk analyst), task T11, Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mouse
mode, 1440 x 900. Graded from the last screenshot (14.png), the layout screenshots (05.png to
14.png) and the transcript. The session saved no files (there is no `downloads/` folder). Not
graded from the participant's rating (3 of 7).

## Grade: S (success)

The success definition is "a different layout method applied (not a re-run of the same one) and
node positions visibly changed". It holds twice:

1. **Circle, 2D** (steps 4-6): Layout, Circle, 2D, Apply. The Force drawing (02.png) is replaced
   by every node on one ring (06.png). A different method, positions changed. The success state
   is first reached here, at step 6, on the first method she tried.
2. **Spectral** (steps 7-8): the drawing collapses into one ball with a few outliers (08.png).
   A different method, positions changed.

The last screenshot (14.png) shows Force again, with the form's Shape set to 2D and the default
spring length. That is the starting method with a different option, not a new method, but the
positions differ visibly from 02.png (flat, groups spread apart), and the success state had
already been reached twice with other methods. It is the arrangement she chose to keep.

"Did it help" is an opinion and not graded. Her answer ("yes, somewhat" for Force flat; Circle
and Spectral worse) matches the screens: 06.png is a ring with edges through the middle, 08.png
a collapsed ball, 14.png shows separate clumps (top right, left, bottom, a fan on the far left).

Why S and not SD: the method changed on the first method she picked, with no detour before it.
The hover that found the "Layout" tooltip (step 3) and choosing 2D in the form are not detours.
Spectral and the spring length guess came after the success state, while she looked for a better
answer.

- **Community run made:** no.
- **Group layout tried:** no. "Rings by group" and "Columns by group" were greyed with "Needs a
  node attribute to group by" (04.png). That is correct before any community run on Les
  Miserables, so it is not a build defect here. She named exactly these two as the ones that fit
  her goal and could not tell how to enable them (problem 2).
- **No crossings refusal:** read correctly as "this one cannot be used"; she found the wording
  program-like. Not a wrong turn.
- **Usage card:** declined ("No thanks", step 2). No detour.
- **Failure codes:** none.
- **Build-decided:** no.
- **Void:** no. Every click reached a real, visible control; the "x" at step 13 was the real
  "Reset Spring length to default" button.

## Counts

|                                                               | This session                                                            | Reference (answer key)                 |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------- |
| Actions to the success state (first different layout applied) | 7 (No thanks, Les Miserables, hover, Layout, Circle, 2D, Apply), step 6 | 4 (open sample, Layout, method, Apply) |
| Step commands in the whole session                            | 13 step commands (22 actions)                                           | --                                     |
| Wrong turns                                                   | 2                                                                       | --                                     |

- **Wrong turn 1:** steps 7-9, Spectral applied (08.png, collapsed) and a wheel zoom on the ball
  (09.png) before abandoning it.
- **Wrong turn 2:** steps 10-11, Force 2D with spring length 80 (11.png, an even scatter she
  judged worse than the start), undone by resetting the field (steps 12-14).
- **Not counted as wrong turns:** the hover (step 3); Circle (step 6), which is the success
  state even though it did not help.

## False "done"

None. "Did I finish? Yes, mostly." The screen agrees: three different arrangements were applied,
and 14.png shows the flat Force drawing she describes. Her other claims check out: the toolbar
still reads "3D" after each 2D choice (06.png, 11.png, 14.png); the spring length "x" reset the
field (13.png, 14.png).

## Bars touched

- **Bar 4 (silent commit):** none. Each Apply changed the canvas (05.png to 06.png, 07.png to
  08.png, 10.png to 11.png, 13.png to 14.png). Picking a method only opened its form (05.png),
  which she noticed and read correctly.
- **Bar 5 (counts against the drawing):** 77 nodes, 254 edges throughout; no mismatch.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. One build defect is
reproduced by a scripted path; problem 2 is also seen in session r3-s32.

| #   | Sev | Kind          | Problem                                                                                                                                                                                                                                                                                                                                                                                                | Evidence                                                                                                                                                              |
| --- | --- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3   | build-defect  | Spectral piles almost all 77 nodes into one small ball against an edge of the canvas, with a chain of 3 outliers and 2 far-off nodes, so no group can be told apart; nothing says anything went wrong. Its form promises "densely connected groups land near each other". She said the mismatch made her trust the other descriptions less. Same on every run (the corner varies, the shape does not). | Session: steps 7-8, 07.png, 08.png. Repro: `rounds/round-3/repro/r3-s34/repro.sh`, run/06.png; also `rounds/round-3/repro/r3-s32/` run/05.png and run/08.png.         |
| 2   | 3   | wording       | The two layouts that match "clusters easier to tell apart" (Rings by group, Columns by group) are greyed with "Needs a node attribute to group by" and do not say how to get one (run a community analysis). She did not know what a node attribute is and left without the group route or colored groups. Also in r3-s32.                                                                             | Step 4, 04.png; debrief "it did not point me anywhere".                                                                                                               |
| 3   | 2   | behavior      | Two unrelated 2D / 3D controls use the same words: the layout form's Shape (flat positions) and the toolbar's View button (camera), which keeps reading "3D" after a 2D layout. She believed her 2D choice had not taken, three times.                                                                                                                                                                 | Steps 6, 11, 14: 06.png, 11.png, 14.png. Repro: run/09.png (Force 2D applied, toolbar "3D"), run/10.png (the button is "View": 2D / 3D camera, Fit, Front, Side ...). |
| 4   | 2   | wording       | Force's options are bare physics terms and numbers with no hint of a sensible range: "Spring length 30", "Gravity -1.2" (a negative gravity puzzled her). Her guess of 80 made the drawing worse.                                                                                                                                                                                                      | Steps 10-11, 10.png, 11.png.                                                                                                                                          |
| 5   | 2   | wording       | Force's description ends "in three dimensions or, with 'dim: 2', flat": an option name in code form, beside a Shape control that says 2D.                                                                                                                                                                                                                                                              | Step 10, 10.png.                                                                                                                                                      |
| 6   | 2   | accessibility | Helper text (method hints under greyed rows, form descriptions, "Under a second") is small, low-contrast grey; she had to lean in for every hint.                                                                                                                                                                                                                                                      | 04.png, 05.png, 07.png, 10.png; transcript steps 1, 4, 7.                                                                                                             |
| 7   | 1   | wording       | The No crossings refusal is graphty-element's own English with internal names: 'the layout "planar" cannot draw this graph without crossings: G is not planar.' She read it as a program error.                                                                                                                                                                                                        | Step 4, 04.png.                                                                                                                                                       |
| 8   | 1   | behavior      | After the Spectral Apply the fitted view put the ball at the bottom edge, partly under the floating toolbar (in the repro it landed at the top edge instead), so part of the result is hidden.                                                                                                                                                                                                         | Step 8, 08.png; repro run/06.png.                                                                                                                                     |
| 9   | 1   | behavior      | A mouse-wheel scroll over the collapsed ball zoomed only slightly and the ball drifted further under the toolbar; she gave up on inspecting it.                                                                                                                                                                                                                                                        | Step 9, 09.png.                                                                                                                                                       |
| 10  | 1   | wording       | The toolbar icon is labelled only by a "Layout" tooltip; she read "Layout" as page layout and clicked only because the icon showed dots.                                                                                                                                                                                                                                                               | Steps 2-3, 03.png.                                                                                                                                                    |
| 11  | 1   | behavior      | Circle and Force both default the Shape to 3D; she wanted flat every time.                                                                                                                                                                                                                                                                                                                             | Steps 5, 10: 05.png, 10.png.                                                                                                                                          |
| 12  | 0   | opinion       | No names on the dots, so even the improved drawing could not be checked ("is that Valjean's lot?"); held one level down.                                                                                                                                                                                                                                                                               | 14.png; debrief.                                                                                                                                                      |

**What worked:** the "Layout" tooltip on hover; picking a method opens a form instead of
committing, which she used to preview Spectral's description before running it; Spectral's
sentence was the first thing that matched her goal; the "Reset Spring length to default" x did
what she guessed; Apply turned to a greyed "Applied" when nothing had changed (12.png); every
layout drew in under a second.

## Repro

`rounds/round-3/repro/r3-s34/repro.sh` (output in `run/` and `run.log` beside it): opens Les
Miserables; Circle 2D (run/04.png, toolbar still "3D"); Spectral (run/06.png, collapsed ball at
the canvas edge); a wheel zoom (run/07.png); Force 2D (run/09.png, identical to the session's
14.png, toolbar "3D"); opens the toolbar button (run/10.png: it is the "View" menu, camera 2D /
3D, unrelated to the layout's Shape).
