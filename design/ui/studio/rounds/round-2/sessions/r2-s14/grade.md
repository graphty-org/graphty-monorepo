# Grade: session r2-s14 -- Ruth (data journalist), T10 on Les Miserables

**Grade: SD** (success with difficulty). Build 4a7a1a7fb (graphty@0.8.53). No downloads were
expected and none were saved.

- **Success state reached:** yes. A label line bound to `name` on Everything (07.png, "Aa Above |
  Abc name"), names drawn on the canvas, the count read ("77 labels, 7 hidden to avoid overlap",
  07.png), and the reason given in her own words at step 9: the names are hidden "only because
  the dots are crowded".
- **Why SD, not S:** five wrong turns, a long search for a way to show the hidden names (steps 8
  to 15), and a four-step detour (18 to 21) to recover a lost drawing after Fit.
- **Last screenshot (21.png):** 2D view, the whole graph in view, every dot with a name above it,
  the panel reads "77 labels, 0 hidden to avoid overlap".
- **False "done":** none. Her closing claim ("every one of the 77 characters has its name next to
  its dot ... 77 labels, 0 hidden") matches 21.png. She did not claim done at 18.png-20.png, when
  the canvas showed one gray band.
- **Steps:** 20 steps after the start page (02 to 21) against a success path of 4.
- **Wrong turns (5):** Style tab on the Graph row (step 4); the "Aa" position picker (step 8);
  clicking the count note (step 9); "Abc name" looking for size or "show all" (step 13); hovering
  the note for help (step 14). The zooms (steps 10 to 12, 17) tested a hypothesis and are not
  counted. Steps 18 to 21 were forced by a build defect (problem 1), not her choice.

## Note for the researcher

As in session r2-s13, answers.md T10 says "the build has no control that shows every name", but
View -> 2D brings Les Miserables to "0 hidden" (16.png). Ruth found it by reasoning that flat dots
cannot sit behind each other; nothing in the label line points there.

## Problems

| # | Sev | Kind | Problem | Evidence |
|---|-----|------|---------|----------|
| 1 | 3 | build-defect | In 2D, Fit (key 0 and View -> Fit alike) fills the canvas with one edge drawn as a wide gray band instead of fitting the graph; the wheel does not zoom back out. Only View -> 3D then View -> 2D brings the drawing back. She said "I have lost the picture I had." Same defect as session r2-s01 found on College football by key; confirmed here on Les Miserables, by menu as well, with the wheel failing too. | Steps 18-21; 18.png, 19.png, 20.png, 21.png; repro `run/06.png` (key 0), `run/07.png` (menu Fit), `run/08.png` (wheel out), `run/09.png` (recovered) |
| 2 | 3 | behavior | The label line says names are hidden but offers no way to show them or say which: the note is plain text, no tooltip ("tooltip: null"), "Aa" is position only, "Abc name" is the attribute only. The only route to every name was guessing that View -> 2D would help. Also seen in r2-s13 (confirmed). | Steps 7-16; 07.png, 08.png, 09.png, 13.png, 16.png |
| 3 | 2 | behavior | In 3D the hidden count moves with zoom in no order a reader can follow: 7, 5, then 7 again. "A count that moves when I zoom is a count I cannot rely on." Also seen in r2-s13 (confirmed). | Steps 10-12; 10.png, 11.png, 12.png |
| 4 | 2 | behavior | With the sample open, the Style tab shows the Graph's settings (background, layout); the label setting appears only after picking "Everything", which nothing on screen points to. Also seen in r2-s13 (confirmed). | Steps 4-5; 04.png, 05.png |
| 5 | 2 | opinion | Names are tiny at the full-drawing size and zooming barely enlarges them; no text-size setting in the label line. "An editor could not read this picture without a magnifier." Held one level down as opinion. | Steps 16-17; 16.png, 17.png, 21.png |
| 6 | 1 | behavior | The 2D/3D switch sits under a toolbar button labeled "3D" in a menu about camera views; she found it by luck, not by a path from the label note. | Step 15; 15.png |

## Repro

`rounds/round-2/repro/r2-s14/repro.sh` (log `run.log`, screenshots in `run/`) walks her path on
the build with real.mjs: open Les Miserables, Everything, Add label line, `name`, View -> 2D
(0 hidden), a wheel zoom, click the canvas and press 0 (one gray band, `run/06.png`), View -> Fit
(same, `run/07.png`), wheel out (same, `run/08.png`), View -> 3D then View -> 2D (whole graph
back, `run/09.png`). Matches her 18.png-21.png.
