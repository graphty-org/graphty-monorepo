# Grade: session r2-s13 -- Grace (nonprofit operations analyst), T10 on Les Miserables

**Grade: SD** (success with difficulty). Build 4a7a1a7fb (graphty@0.8.53). No downloads were
expected and none were saved.

- **Success state reached:** yes. A label line bound to `name` on Everything (06.png, "Abc name"),
  names drawn on the canvas, the count read ("77 labels, 7 hidden to avoid overlap", 06.png), and
  the reason stated in her own words at step 10: "it's hiding names on purpose when they'd
  overlap".
- **Why SD, not S:** six wrong turns before and around the success state, and a long detour
  (steps 7 to 15) looking for a way to show the hidden names.
- **Last screenshot (17.png):** 2D view, every dot labeled, the panel reads "77 labels, 0 hidden
  to avoid overlap".
- **False "done":** none. Her closing claim ("All 77 characters have their names next to their
  dots ... 0 hidden") matches the screen at 16.png and 17.png. At 17.png two names at the canvas
  edge (Napoleon, Jondrette) are cut by the edge after her zoom, but they are drawn, not hidden.
- **Steps:** 16 steps after the start page (02 to 17) against a success path of 4.
- **Wrong turns (6):** Style tab on the Graph row (step 3); clicking the "Above" text (step 7);
  the "Aa" position picker (step 8); hovering the count note for help (step 11); "Abc name"
  looking for size or overlap settings (step 12); `--click "3D"` on a button whose name is
  "View" (step 14). The zooms (steps 9, 10, 13) were a test of a hypothesis, not counted.

## Note for the researcher: the success definition's premise does not hold

answers.md T10 says "the build has no control that shows every name". On this build the View
menu's 2D choice brings the Les Miserables count to "77 labels, 0 hidden to avoid overlap"
(16.png, and the repro's 09.png). Grace reached every name this way. The grade above does not
depend on it (she met the success definition at step 10), but the expected answer for T10 should
say that 2D clears the hidden names on Les Miserables, and nothing in the app points there.

## Problems

| #   | Sev | Kind          | Problem                                                                                                                                                                                                                                                                            | Evidence                                                                     |
| --- | --- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | 3   | behavior      | The label line tells the reader that 7 names are hidden but offers no way to show them: no tooltip on the note, nothing in "Aa" (position only) or "Abc name" (attribute only). The only route to every name was a guess that switching the View menu to 2D would spread the dots. | Steps 6-16; 06.png, 08.png, 11.png ("tooltip: null"), 12.png, 16.png         |
| 2   | 2   | behavior      | In 3D the hidden count moves with zoom in no order a reader can follow: 7, then 5, then 7 again as she zoomed further in. She said "I don't know what makes it decide." Deterministic: the repro gives 7, 7, 5, 7 for the same wheel steps.                                        | Steps 9, 10, 13; 09.png, 10.png, 13.png; repro 05.png-07.png                 |
| 3   | 2   | behavior      | With the sample open, the Style tab shows the Graph's settings (background, layout method); the label setting appears only after picking "Everything", a word she did not read as "settings for the dots".                                                                         | Step 3-4; 03.png, 04.png                                                     |
| 4   | 2   | accessibility | The toolbar button shows "3D" (or "2D") but its accessible name is "View", so the visible text is not in its name (WCAG 2.5.3 Label in Name); a voice-control or by-name click on "3D" fails. Reproduced.                                                                          | Step 14-15; 14.png ("nothing on screen is called 3D"), 15.png; repro step 08 |
| 5   | 2   | opinion       | Names are tiny next to the dots even zoomed in, and the Label row has no text-size setting; she would need bigger text for a slide. Held one level down as opinion.                                                                                                                | Step 17; 17.png                                                              |
| 6   | 1   | behavior      | "Above" beside the "Aa" button reads like the position setting but is plain text: clicking it does nothing (the repro's before and after screenshots differ by 0 pixels). The button is only the "Aa".                                                                             | Step 7; 07.png; repro 03.png vs 04.png                                       |

## Repro

`rounds/round-2/repro/r2-s13/repro.sh` (run log `run.log`, screenshots in `run/`) walks her path
on the build with real.mjs: open Les Miserables, Everything, Add label line, `name` (7 hidden),
click "Above" (no change), three wheel zooms (7, 5, 7 hidden), `--click "3D"` (refused: nothing
is called "3D"), View then 2D (0 hidden). Same result on every run.
