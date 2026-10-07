# Grade: session r2-s18 -- Dev (class-project student), T10 on College football

**Grade: SD** (success with difficulty). Build 4a7a1a7fb (graphty@0.8.53). No downloads were
expected and none were saved (the session has no downloads folder).

- **Success state reached:** yes, at step 6. A label line bound to `label` (the team name, not
  `id`) on Everything (06.png, "Aa Above | Abc label"), names drawn next to the dots, and the count
  read: "115 labels, 14 hidden to avoid overlap". At step 8 he gave the reason in his own words
  ("so if the dots were further apart they wouldn't overlap"), and his closing sentence repeats
  it ("in the crowded middle a few names are hidden so they don't overlap").
- **Why SD, not S:** one wrong turn before the success state (the Graph row's Style tab) and three
  more afterwards while looking for a way to show the hidden names, which this build does not
  offer from the label line. He hesitated between `id` and `label` and picked right on a guess.
- **Last screenshot (11.png):** 3D view, the whole graph in view, names above most dots, the
  panel reads "115 labels, 16 hidden to avoid overlap" (16 after his zoom).
- **False "done":** none. His wrap-up says "Mostly, not fully" and quotes the hidden count; his
  essay sentence says some names are hidden. Both match 11.png.
- **Steps:** 10 steps after the start page (02 to 11) against a success path of 4.
- **Wrong turns (4):** Style tab on the Graph row (step 3); the "Aa" position picker (step 7);
  hovering the count note for help (step 8); "Abc label" looking for a show-all or size option
  (step 10). The zoom (step 9) tested a hypothesis and is not counted.

## Problems

| # | Sev | Kind | Problem | Evidence |
|---|-----|------|---------|----------|
| 1 | 3 | behavior | The label line says names are hidden but offers no way to show them or to say which ones: the note is plain text with no tooltip, "Aa" is position only, "Abc label" is the attribute only. He stopped without every name. Also seen in sessions r2-s13 and r2-s14 (confirmed). | Steps 6-10; 06.png, 07.png, 08.png ("tooltip: null" in the repro), 10.png |
| 2 | 2 | behavior | Zooming in raised the hidden count from 14 to 16, the opposite of what he expected ("I thought more room meant fewer hidden"). The count follows zoom in no order a reader can predict. Reproduced: the same wheel step gives 14 then 16 on two runs. Also seen in r2-s13 and r2-s14 (confirmed). | Step 9; 06.png, 09.png; repro `run1/03.png`, `run1/05.png`, `run2/03.png`, `run2/05.png` |
| 3 | 2 | behavior | With the sample open, the Style tab shows the Graph's settings (background, layout); the label setting appears only after picking "Everything", which he clicked only because the task said "every". Also seen in r2-s13 and r2-s14 (confirmed). | Steps 3-4; 03.png, 04.png |
| 4 | 2 | behavior | The attribute list offers `id`, `label`, `value` with no sample values; he could not tell which held the team names and picked `label` from a tutorial tip. A wrong guess (`id`) would have been an F. | Step 5; 05.png |
| 5 | 1 | opinion | Names are very small at the full-drawing size and blur together in the dense middle; no text-size setting in the label line. Held one level down as opinion. | Steps 6, 11; 06.png, 11.png |
| 6 | 1 | behavior | The "Aa" icon did not suggest "label position" to him. | Step 7; 07.png |

## Repro

`rounds/round-2/repro/r2-s18/repro.sh` (logs `run1.log`, `run2.log`, screenshots in `run1/` and
`run2/`) walks his path twice on the build with real.mjs: open College football, Everything, Add
label line, `label` ("115 labels, 14 hidden to avoid overlap"), hover the note (tooltip: null), one
wheel step in at the middle ("16 hidden"). Same counts on both runs.
