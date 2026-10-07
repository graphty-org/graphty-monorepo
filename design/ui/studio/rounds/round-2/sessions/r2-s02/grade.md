# Grade -- session r2-s02 (Grace, nonprofit operations analyst), T15 Prompt A (Les Miserables)

Build: commit 4a7a1a7fb (graphty 0.8.53), 1440 x 900, pointer, not screen-reader mode.

## Grade: SD (success with difficulty)

All five parts of the task's success definition hold on the last screenshot (18.png) and in the
downloaded file, and no later step undid an earlier one:

1. **Drawn.** Les Miserables is on screen; Nodes 77 (02.png).
2. **Ranking run and finished.** PageRank from Analyze, Run; the outline shows "Influence 77" and
   the key "Color: Influence" (05.png).
3. **Sizes bound to the result, visibly different.** The Influence row's Style tab has a Size line
   "1 to 3"; dots differ in size (Valjean and Myriel largest); the key adds "Size: Influence"
   (11.png, still so in 18.png). The participant said correctly what the sizes and the colors stand
   for: both are Influence (PageRank), "bigger and darker = more influential".
4. **Names.** A label line bound to `name` on the Influence row, which covers all 77 nodes; names
   are drawn; the panel reads "77 labels, 6 hidden to avoid overlap", matching the reference value
   for a sized Les Miserables (13.png).
5. **Image passes the picture checklist.** `downloads/les-miserables_current-view.png` (1806 x
   1720): the same nodes and arrangement as the final screen; sizes visibly different; the names
   drawn on screen are drawn in the image (small and soft, see problems); a key naming both
   channels in use, "Size: Influence" and "Color: Influence".

Why SD and not S: the size binding needed a tooltip. At step 8 the Size line showed a fixed "1",
and the participant hovered the chain icon (step 9) to learn it meant "Size by attribute" before
using it. `answers.md` puts "a tooltip or help" under SD.

Parts reached: 5 of 5.

Activation measure: yes. The participant picked PageRank (on its "Start here" tag) and ran it with
no help, no tooltip and no detour (steps 3-5).

## Steps and wrong turns

- Steps: 18 `real.mjs` steps in all. The success state was reached at step 16 (export), against a
  success path of about 18. Steps 17 and 18 came after success: an attempt at a goal the task does
  not ask for (bigger name text).
- Wrong turns against the success path: 0. The hover at step 9 is a tooltip, not a wrong turn.
  Steps 17 ("Aa", which is Label position) and 18 (the "Abc name" box, which re-opens the
  attribute picker) are two dead ends on the extra goal. Neither changed state; 18.png still shows
  every part of the task in place, with the attribute popover open.

## Claims

No false "done". Each "Part N done" claim matches the screen at that step. At step 13 the
participant read "77 labels, 6 hidden to avoid overlap" and said correctly that not every name
shows. In the debrief she said the names in the image are tiny and mostly unreadable, which is
true. truth_on_screen does not apply.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | behavior | The names in the exported image are too small and soft to read at slide size. The most important name, Valjean, sits on top of his own large dot and can hardly be read. The task is met, but the persona's goal (a picture for a board slide) is not. | Step 16, downloads/les-miserables_current-view.png |
| 2 | 2 | behavior | The Style tab has no control for name text size. The participant looked in the two places it might be ("Aa" and the "Abc name" box), found nothing and gave up on it. | Steps 17-18, 17.png, 18.png |
| 3 | 2 | wording | The "Aa" button beside the Label line reads as a font or text-size control, but it opens Label position (a 3 x 3 grid). | Step 17, 17.png |
| 4 | 2 | behavior | Color was bound to Influence automatically, but a new Size line starts as a fixed "1". Binding it to Influence needs the unlabeled chain icon, found only through its tooltip. | Steps 8-9, 08.png, 09.png |
| 5 | 2 | behavior | The on-screen key box covers part of the drawing. It sits over a node's name (Blacheville) in the top-left corner. | Step 13, 13.png; still so in 16.png and 18.png |
| 6 | 1 | opinion | The key's ranges are raw scores (0.003299 to 0.07543), which the participant could not explain to her readers. She would want low/high or ranks. | Steps 5 and 16, 05.png, downloaded image |
| 7 | 1 | opinion | The orange-to-brown color ramp makes most dots look alike. Only the top few stand out. | Step 5, 05.png |
| 8 | 1 | wording | The ranking methods have jargon names (Degree, Betweenness, PageRank). The participant chose between Degree and PageRank only by the "Start here" tag. | Step 3, 03.png |
| 9 | 0 | opinion | The overview shows statistics she would not put on a slide (Density 0.08681, "Edges per ..."). | Step 2, 02.png |

No build defect (crash, control that does nothing, wrong count, step not doable by keyboard) was
seen, so no scripted repro was needed. Every count on screen matched the reference values.

## Failure codes

None. The session succeeded.
