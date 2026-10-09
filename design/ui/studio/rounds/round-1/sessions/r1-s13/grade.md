# Grade: session r1-s13 -- Nadia, a bank transaction monitoring analyst, names on every dot (College football)

**Grade: S** (success). Every part of the task's success definition holds on the last screenshot
and in the transcript:

- **A label line bound to the name attribute on a row that covers every node.** `10.png`: the
  Everything row is selected, its Style tab (Nodes) shows the line "Aa Above Abc label", bound to
  `label`, the attribute that holds the team names in College football.
- **Names drawn on the canvas.** `10.png`: team names sit above the dots (GeorgiaTech, Maryland,
  Florida, Arkansas, Arizona, California, Stanford, WashingtonState and others).
- **The hidden count read and explained.** Under the line the panel reads "115 labels, 14 hidden
  to avoid overlap". At step 6 Nadia read it ("it says 14 are hidden ... I'd have to say fourteen
  are missing"). She tied it to crowding ("Maybe if I zoom in there's room for them"; "many in the
  middle are tiny and pile on each other") and ended with "the panel itself says 14 of the 115 are
  hidden ... I could not find how to show those 14". That is the expected answer on this build,
  which has no control that shows every name.

Neither partial (SD) condition applies: she noticed the hidden names, and she used `label`, not
`id`. The detour through the graph's own Style tab (step 3) cost one step and she recovered on her
own. The path is the same as session r1-s15b on the same task and dataset, graded S.

## Measures

- **Steps:** 10 screenshots from 9 `real.mjs` steps (`01.png` to `10.png`). Success was reached at
  `06.png`: 6 steps against a path of 4 plus the usage card. Everything after that was a search
  for a way to show the 14 hidden names, which the build does not offer.
- **Wrong turns:** 4. Step 3, the graph-level Style tab (only Background, Method and Seed).
  Step 7, "Label position", looking for a way to show hidden names (`07.png`, a 3 x 3 placement
  grid). Step 7 again, hovering the "14 hidden" note, which has no tooltip and is not clickable
  (`08.png`). Step 8, the mouse wheel to zoom in, which did nothing (`09.png`, `10.png`; counted
  once).
- **False "done":** none. She did not claim every name was on. In character: "Mostly ... strictly
  not every team's name is written." That matches the screen.
- **Ease (from the transcript):** 3 on a 1 = very easy, 7 = very hard scale.
- **Usage card:** declined ("No thanks", step 2) with no detour. Stated reason: compliance on a bank
  laptop; no wrong belief about what is sent.
- **Silent commits:** none. Picking `label` drew names at once (`05.png` to `06.png`).
- **Build-decided:** no. The wheel defect cost her a step but did not decide the grade.
- **Void:** no. `real.mjs` did nothing a person could not do; the session log is empty (no
  ambiguous matches, script errors or failed requests).

## Problems

| #   | Severity | Kind         | Problem                                                                                                                                                                                                                                  | Evidence                                                                                                                                                                                                                                                                                                       |
| --- | -------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3        | build-defect | Turning the mouse wheel over the drawing does not zoom. Nadia tried it to make room for the hidden names; the drawing did not change.                                                                                                    | Step 8: `08.png`, `09.png` and `10.png` are byte-identical (same MD5) across two wheel steps. Already reproduced as a scripted path in `rounds/round-1/repro/r1-s15b/` and `rounds/round-1/repro/r1-s11b/` on the same app version (graphty@0.8.53). Also seen in r1-s10b, r1-s11b, r1-s12b, r1-s15b, r1-s19b. |
| 2   | 3        | behavior     | "115 labels, 14 hidden to avoid overlap" says names are missing but not which teams, offers no way to show them, and has no tooltip. For an analyst who screenshots a picture into an alert file, 14 teams are missing with no recourse. | Step 6 `06.png` (note appears); step 7 `07.png` (Label position offers only placement); `08.png` (hover on the note: nothing). Also met in r1-s10b, r1-s11b, r1-s12b, r1-s15b.                                                                                                                                 |
| 3   | 2        | behavior     | The graph's own Style tab, the first Style a user sees, holds only background and layout. Nothing says the dots' style lives on the "Everything" row, and "Everything" does not read as a place to style things.                         | Step 3 `03.png`; step 4 `04.png`. Also met in r1-s11b and r1-s15b.                                                                                                                                                                                                                                             |
| 4   | 2        | opinion      | Names in the crowded middle are tiny and stacked on each other; Nadia would not trust a reviewer to read them in a screenshot.                                                                                                           | `06.png`, `10.png`. Also said in r1-s11b.                                                                                                                                                                                                                                                                      |
| 5   | 1        | wording      | The attribute list offers "id", "label" and "value" with no sample values; she guessed `label` held the team name, and choosing "label" under a heading "Label" read oddly.                                                              | Step 5 `05.png`. Also met in r1-s15b.                                                                                                                                                                                                                                                                          |

No new build defect was found, so there is no new repro directory for this session.
