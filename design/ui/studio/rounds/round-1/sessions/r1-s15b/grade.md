# Grade: session r1-s15b -- Ruth, a reporter, names on every dot (College football)

**Grade: S** (success). Every part of the task's success definition holds on the last screenshot
and in the transcript:

- **A label line bound to the name attribute on a row that covers every node.** `10.png`: the
  Everything row's Style tab shows the line "Aa Above Abc label", bound to `label`, the attribute
  that holds the team names in College football.
- **Names drawn on the canvas.** `10.png`: team names sit above the dots (GeorgiaTech, Maryland,
  Florida, Arizona, Stanford, WashingtonState and others).
- **The hidden count read and explained.** Under the line the panel reads "115 labels, 14 hidden
  to avoid overlap". At step 6 Ruth read it ("it tells me 14 are hidden") and at the end she
  said why: the app hides 14 "to avoid overlap" and she "found no way to show them". That is the
  expected answer on this build, which has no control that shows every name.

None of the partial (SD) conditions apply: she noticed the hidden names, and she used `label`, not
`id`. The detour through the graph's own Style tab (step 3) cost one step and she recovered
without help.

## Measures

- **Steps:** 10 `real.mjs` steps (`01.png` to `10.png`). The success path is 4 steps plus the
  usage card; Ruth reached success at step 6, so 6 steps against 5. Steps 7 to 10 were spent
  looking for a way to show the 14 hidden names, which the build does not offer.
- **Wrong turns:** 4. Step 3, the graph-level Style tab (only background and layout there).
  Step 7, "Label position", looking for a way to show hidden names. Step 8, hovering the "14
  hidden" note, which has no tooltip. Steps 9 and 10, the mouse wheel to zoom in and make room,
  which did nothing (counted as one wrong turn).
- **False "done":** none. Her closing words were "I've got names on nearly every dot", and in
  character "Mostly ... strictly I did not get every team's name". Both match the screen.
- **Build-decided:** no. The wheel defect below cost her two steps but did not decide the grade.
- **Void:** no. `real.mjs` did nothing a person could not do. The start waited about 35 minutes
  for a free browser slot; that delayed the session but did not change what was on screen.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | Turning the mouse wheel over the drawing does not zoom. Ruth tried it to spread the dots apart so the hidden names could appear; the drawing did not change. | Steps 9 and 10: `08.png` and `09.png` are byte-identical; `10.png` differs only in the focus ring of the label line. Reproduced by `rounds/round-1/repro/r1-s15b/run.sh` on the same build (commit 4522851, graphty@0.8.53): start empty; `--click "No thanks" --click "College football"`; `--click-at 1100,800` (03.png); `--wheel 750,450,-400` (04.png); `--wheel 750,450,-1500` (05.png). 03.png, 04.png and 05.png are byte-identical. Also seen in sessions r1-s10b, r1-s12b and r1-s19b. |
| 2 | 3 | behavior | "115 labels, 14 hidden to avoid overlap" says names are missing but not which teams, offers no way to show them, and has no tooltip. For a reporter who must check a picture, the 14 missing teams cannot be named or recovered. | Step 6 `06.png` (note appears); step 7 `07.png` (Label position offers only placement); step 8 `08.png` (hover on the note: no tooltip). Also met in sessions r1-s10b and r1-s12b. |
| 3 | 2 | behavior | The graph's own Style tab, the first Style a user sees, holds only background and layout. Nothing says the dots' style lives on the "Everything" row; Ruth had to guess it. | Step 3 `03.png`; step 4 `04.png`. |
| 4 | 1 | wording | The attribute list offers "id", "label" and "value" with no hint of what each holds. Ruth guessed "label" correctly. | Step 5 `05.png`. |
