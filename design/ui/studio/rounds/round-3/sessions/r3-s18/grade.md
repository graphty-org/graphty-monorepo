# Grade: session r3-s18 -- Sam (sighted, keyboard only), names on every dot, College football

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mode,
1440 x 900. Graded from the last screenshot (23.png) and the transcript. Nothing was downloaded,
and the task needs no file. Not from the participant's rating (4 of 7).

Every action in the session was `--key`; no click, hover or wheel was used, so the session plays
Sam as the persona says and counts for the keyboard bar.

## Grade: S (success)

Every part of the success definition holds on 23.png:

1. **Label line bound to the name attribute on a row covering every node.** The Everything row is
   selected; its Style tab (Nodes) shows the label line "Aa Above / Abc label". On College football
   the name attribute is `label`, and that is the one picked (step 21).
2. **Names drawn on the canvas.** Team names are drawn beside the dots (GeorgiaTech, Maryland,
   Arizona, California, WashingtonState, SanDiegoState and the rest).
3. **Count read correctly.** At step 21 (21.png) the statement read "115 labels, 14 hidden". Sam
   read it, said "14 hidden is not done", tabbed to "Show all labels" and pressed Space (steps
   22-23). On 23.png the box is checked and the statement reads "115 labels" with no hidden part:
   the round 3 "switch on" success state.

- **Every name reached:** yes.
- **Keyboard bar (Sam on this task):** S.
- **Build-decided:** no. **Void:** no.
- **Failure codes:** none.

## False "done"

None. Sam's "I am done" (step 23) and "Every one of the 115 teams has its name next to its dot
('115 labels', nothing hidden)" match 23.png: the statement shows no hidden part, and 115 matches
the node count on the Values tab (06.png). Sam also said overlapping names are hard to read; the
answer key counts overlap after the switch as the switch working, and Sam did not claim every name
was legible.

## Steps and wrong turns

- **Keys: 53** against the rehearsed round 3 keyboard path of 55 on College football. **real.mjs
  steps: 22** after the start (the pointer success path is 5 steps; key steps are not comparable
  one to one).
- Keys by part (from the transcript, checked against the screenshots): open the sample 8; reach
  the Everything row 23 (including the detour); reach and fill the label line 18; show the hidden
  names 4.
- **Wrong turns: 1.** At step 12 Sam opened the graph's Style tab (12.png: Canvas background,
  layout Method, Shape, Spring length, Gravity) looking for names, found none, and walked back
  with Shift+Tab to "Everything" (steps 13-16). This is the same wrong turn r3-s17 recorded.
- No wrong turns hunting for the hidden names: Sam saw "14 hidden" and reached "Show all labels"
  in 3 Tabs on the first try.
- Hesitations, not wrong turns: Tab presses counted ahead from 08.png (focus on Redo shown only by
  its tooltip) and 14.png (the unlabeled blue bar).

## Problems

| #   | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Sev | Kind         | Evidence                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------ | ----------------------------------------------- |
| 1   | After Enter on the College football sample card, focus falls to the page body; the next Tab starts over at "Main menu", so a keyboard user walks the header and left panel again (Sam: "first strike"). The answer key's rehearsed path says focus lands on the drawing; on this build it does not. **Build defect, reproduced** (`rounds/round-3/repro/r3-s18/repro-sr.sh`: after Enter, `focus: nothing (the page itself)`, next Tab `focus: button "Main menu"`; `repro.sh` 03.png-04.png). Bar 8. | 2   | build-defect | step 6-7, 06.png, 07.png                        |
| 2   | The disabled Redo button takes Tab focus but draws no focus ring; only the "Nothing to redo" tooltip shows where focus is (WCAG 2.4.7). **Build defect, reproduced** (`repro.sh` 05.png: tooltip shown, no ring; `repro-sr.sh`: `focus: button "Redo" disabled`).                                                                                                                                                                                                                                     | 2   | build-defect | step 8, 08.png                                  |
| 3   | With nothing selected the right panel's Style tab is the graph's (canvas and layout), and it shares the name "Style" with the row's Style tab where Label lives; nothing points from one to the other. Sam took it first and walked back. **Confirmed**: same wrong turn in r3-s11, r3-s12 and r3-s17 on this task.                                                                                                                                                                                   | 2   | behavior     | step 12-15, 12.png, 15.png                      |
| 4   | Distance by keyboard: 53 keys, about 30 of them Tab walks across the screen, for two decisions. No shortcut moves focus to the right panel, the Style tab or the label line; the toolbar prints "Analyze Shift+A" and Sam looked for the same for Style or Labels and found none.                                                                                                                                                                                                                     | 2   | behavior     | steps 7-11, 16-19; 07.png-11.png, 16.png-19.png |
| 5   | The attribute list offers id, label, value with no sample value; Sam guessed "label" for the team names, and "id" was highlighted first. **Confirmed** with r3-s17 (same finding).                                                                                                                                                                                                                                                                                                                    | 2   | wording      | step 20, 20.png                                 |
| 6   | Turning labels on first hides 14 of 115 names; Sam knew only because of the small gray "115 labels, 14 hidden" line. No false "done" here.                                                                                                                                                                                                                                                                                                                                                            | 1   | opinion      | step 21, 21.png                                 |
| 7   | "Selection" and "Everything" are one Tab stop (a tree with arrow keys); nothing says so, so Tabs skipped Everything and Sam only understood on the way back. Standard tree behavior, so held as an opinion.                                                                                                                                                                                                                                                                                           | 1   | opinion      | steps 9, 15-16; 09.png, 15.png, 16.png          |
| 8   | The left panel's resize bar takes a Tab stop and shows only a blue line, with no tooltip; Sam could not tell what it was. Its accessible name is fine ("Resize left panel", `repro-sr.sh`), so this is a sighted-keyboard finding, not a defect.                                                                                                                                                                                                                                                      | 1   | behavior     | step 14, 14.png                                 |
| 9   | With every name on, names in crowded spots print over each other (OregonState over SouthernCalifornia, near SanDiegoState) and are small. The answer key says overlap after the switch is not a defect against this task.                                                                                                                                                                                                                                                                             | 1   | opinion      | step 23, 23.png                                 |

## Repro

`rounds/round-3/repro/r3-s18/repro.sh` (screenshots, `run/`) and `repro-sr.sh` (focused element
by role and name, `run-sr.log`) replay Sam's keys on the build: Tab x7 and Enter on the College
football card, then the Tabs to Redo, Selection and the resize bar. Both reproduce problems 1 and
2 on every run of this build.
