# Grade: session r2-s17 -- Tom (recipe recipient), T10 on College football

**Grade: SD** (success with difficulty). Build 4a7a1a7fb (graphty@0.8.53). No downloads were
expected and none were saved (the session has no downloads folder).

- **Success state reached:** yes, at step 6. A label line bound to `label` on Everything (06.png,
  "Abc label"), team names drawn on the canvas, and the count read and explained in his own words:
  "it says 14 hidden ... maybe the hidden ones come back when there's room" (06.png, "115 labels,
  14 hidden to avoid overlap"). `label` is the right attribute for College football, so no
  `wrong-attribute` partial.
- **Why SD, not S:** a detour then a correction before the success state (the Graph row's Style
  tab, step 3, then "Everything" picked on a hunch), a guessed attribute ("I'd have to guess"), and
  two dead ends after it (zoom, "Aa") looking for the hidden names, after which he stopped.
- **Last screenshot (08.png):** names drawn, the "Label position" popover open, the panel reads
  "115 labels, 16 hidden to avoid overlap".
- **False "done":** none. His closing words ("The names are on, most of them anyway ... strictly,
  no") match the screen's 16 hidden. Not `truth-on-screen`.
- **Steps:** 7 steps after the start page (02 to 08) against a success path of 4; the success
  state took 5 (02 to 06).
- **Wrong turns (2):** the Style tab on the Graph row (step 3); the "Aa" button, expected to be
  text size, which is label position (step 8). The zoom at step 7 was a test of his own hypothesis
  ("maybe they come back when there's room") and is not counted, as in the sibling grade.

## Note for the researcher: 2D shows every name on College football too

answers.md T10 says "the build has no control that shows every name". The repro below switches the
View menu to 2D and the count reads "115 labels, 0 hidden to avoid overlap" on both runs, as
already found for Les Miserables. Nothing on the label line points there; Tom never found it. The
grade does not depend on it.

## Problems

| # | Sev | Kind | Problem | Evidence |
|---|-----|------|---------|----------|
| 1 | 3 | behavior | The label line says names are hidden but offers no way to show them, and says nothing of how; the task asked for every team and he stopped with 16 hidden. The only route (View, 2D) is not linked from anywhere near the count. Also seen in r2-s13, so confirmed. | Steps 6-8; 06.png, 07.png, 08.png; repro 06.png (0 hidden in 2D) |
| 2 | 3 | build-defect | Zooming the canvas in hides MORE names: the count goes from 14 to 16 hidden after one wheel step in, and the names stay the same small size. A reader making room gets the opposite. Same on both scripted runs. | Step 7; 06.png vs 07.png; repro run/03.png (14) vs run/04.png (16), run2 the same |
| 3 | 2 | behavior | With the sample open the Style tab shows the Graph's settings (background, layout method); the Label setting appears only after picking "Everything", which he chose on a hunch. Also seen in r2-s13, so confirmed. | Steps 3-4; 03.png, 04.png |
| 4 | 2 | behavior | The attribute list offers "id, label, value" with nothing saying which holds the team names; he guessed "label". | Step 5; 05.png |
| 5 | 2 | opinion | Names are very small; in the crowded middle he could not read most of them, and the Label line has no text-size setting. Held one level down as opinion. | Steps 6-7; 06.png, 07.png |
| 6 | 1 | behavior | The "Aa" button reads as text size (a common convention) but opens "Label position" only. Also seen in r2-s13. | Step 8; 08.png; repro 05.png |
| 7 | 1 | behavior | The hidden count is small grey type under the line; he noticed it only because it held a number. | Step 6; 06.png |

## Repro

`rounds/round-2/repro/r2-s17/repro.sh` walks his path on the build with real.mjs: open College
football, Everything, Add label line, `label` (14 hidden), one wheel step in at 740,460 (16
hidden), "Label position" (a 3 x 3 position grid, count unchanged), View then 2D (0 hidden). Run
twice (`run/`, `run2/`, logs `run.log`, `run2.log`), same counts both times; the count crops are in
`crop/all.png`.
