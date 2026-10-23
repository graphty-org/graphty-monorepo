# Grade -- session r2-s16 (Elena, names on every dot, College football)

**Grade: SD** (success with difficulty). Build commit 4a7a1a7fb, graphty@0.8.53. Not
build-decided.

## Against the success definition

| Requirement                                                        | Met? | Evidence                                                                                                                                       |
| ------------------------------------------------------------------ | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| A label line bound to `label` on a row covering every node         | Yes  | 17.png: "Everything" row, Style, Label line "Aa Above / Abc label"                                                                             |
| Names drawn on the canvas                                          | Yes  | 09.png onward: team names across the drawing                                                                                                   |
| Reads the hidden-for-overlap count and says why some are not drawn | Yes  | Step 9 and the outcome: "it says 14 hidden", "14 to 16 of them are 'hidden to avoid overlap', and I could not find any way to make those show" |

Last screenshot (17.png): Everything selected, the label line bound to `label`, "115 labels, 16
hidden to avoid overlap", names drawn on a zoomed-in view. No files were saved (no
`downloads/`), none were needed.

**False "done": no.** Her final claim is "Partly ... not every team", which matches the screen
("16 hidden to avoid overlap"). truth_on_screen does not apply.

## Steps and wrong turns

- Success path: 4 steps. Participant: 16 steps after the start page (17 screenshots).
- Success state first reached at step 9 (09.png); steps 10-17 hunted for a control that shows the
  hidden names, which the build does not have.
- Wrong turns: 5.
    1. Steps 3-6: picked one node (Utah), opened its Style tab and added the label line there. The
       line applied to the selection only (06.png: "1 label, 0 hidden"), and a new row "23"
       appeared in the left list. She corrected by choosing Everything (step 7).
    2. Steps 10, 14, 15: zoomed in three times hoping the hidden names would get room.
    3. Step 11: clicked the "16 hidden to avoid overlap" text (it is plain text).
    4. Steps 12-13: opened "Aa" (label position) looking for a show-all option.
    5. Steps 16-17: reopened the "Abc label" attribute picker looking for the same.

SD rather than S: more than two wrong turns and a detour then a correction (the selection-only
label line).

## Problems

| #   | Severity | Kind     | Problem                                                                                                                                                                                                                                                                    | Evidence                                            |
| --- | -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | 3        | behavior | There is no way to show the names hidden to avoid overlap, and the count line gives no next step. The task asks for every team; she leaves with 14-16 unnamed and five fruitless tries.                                                                                    | Steps 10-17, 10.png-17.png; transcript outcome      |
| 2   | 2        | behavior | Adding a label line while one node is picked silently scopes it to that node, with no hint before the choice that it applies to the picked node only. She lost three steps and had to guess that "Everything" means all nodes.                                             | Steps 4-6, 04.png, 06.png ("1 label, 0 hidden")     |
| 3   | 2        | behavior | The hidden-to-avoid-overlap count does not fall as you zoom in: 14, then 16, 12, 16 over three zoom-ins. She read it as "backwards" and gave up on zooming. Reproduced identically on two scripted runs (see below); not proven a wrong count, so not marked build-defect. | Steps 9, 10, 14, 15; 09.png, 10.png, 14.png, 15.png |
| 4   | 2        | wording  | The layer created for the picked node is named by its id, "23", in the left list and the panel header; she "has no idea what it is".                                                                                                                                       | Step 6, 06.png; 17.png left list                    |
| 5   | 2        | wording  | A picked node's panel header shows its id ("23") instead of its name ("Utah") on College football, where id and label differ.                                                                                                                                              | Step 3, 03.png                                      |
| 6   | 1        | opinion  | Labels are tiny, in a serif face unlike the app, and still collide when zoomed (SanDiegoState, NevadaLasVegas, OregonState / SouthernCalifornia).                                                                                                                          | 09.png, 14.png, 15.png                              |
| 7   | 1        | behavior | The first wheel zoom barely changes the drawing's size.                                                                                                                                                                                                                    | Step 10, 10.png                                     |

## Repro

`design/ui/studio/rounds/round-2/repro/r2-s16/repro.sh [run number]` walks the session's path
through `real.mjs`: pick node 23, Style, Add label line, `label` (line shows "1 label, 0 hidden to
avoid overlap"); then Everything, Add label line, `label`; then the same three wheel zooms. Runs 1
and 2 both show "115 labels, 14 hidden", then 16, 12, 16 hidden (`run-1/`, `run-2/`,
`counts-run-2.png`), the same sequence as the session.
