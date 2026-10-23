# Grade: session r2-s01 -- Sam (keyboard only), names on every dot, College football

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Graded from the last screenshot (35.png),
the transcript and two scripted re-runs on the same build. No files were downloaded (the task
asks for none).

## Grade: SD (success with difficulty)

- **Success definition met.** The last screenshot shows a label line on the Everything row bound to
  `label` (College football's name attribute, "Abc label"), team names drawn beside the dots, and
  the line's count statement. Sam read "115 labels, 14 hidden to avoid overlap" at step 21 and
  said why the 14 were missing ("hidden to avoid overlap"). He then went further than the answer
  key expects: pressing 5 (2D) spread the drawing and the count read "115 labels, 0 hidden to
  avoid overlap" (35.png).
- **Why SD, not S:** five wrong turns, more than the two S allows (listed below), and the last part
  rested on a guess from the shortcut list.
- **Whole task from the keyboard:** yes. No step needed a pointer.
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no (the tool refused the key name `Shift+Slash` once; `?` worked,
  and nothing reached the app).

## Counts

|                  | This session                                                       | Reference                                                                                     |
| ---------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Steps (real.mjs) | 34 after the start                                                 | 4 (pointer path)                                                                              |
| Key presses      | about 64: 10 to open the sample, 33 to names drawn, 21 to 0 hidden | 56 keys (keyboard path, which includes 11+1 for the usage card; Sam's card closed on its own) |
| Wrong turns      | 5                                                                  | --                                                                                            |

Wrong turns:

1. Step 6 (06.png): Down arrow twice in the Samples list; it does not move.
2. Steps 9-12 (09.png-12.png): went to the Graph's Style tab, which has canvas and layout only.
3. Step 22 (22.png): opened "Label position" ("Aa") looking for an overlap setting.
4. Step 25 (25.png): reopened the attribute picker looking for "show all".
5. Step 29 (29.png): Enter on the "Label" heading, which is disabled once a line exists; nothing
   happened.

Tab overshoot at step 10 and the shortcut-list visit (steps 30-34) are navigation, not wrong turns;
the second found the 2D key that finished the task.

## False "done"

None recorded. Sam's closing claim, "every dot has a name next to it", is true of the drawing: all
115 labels are drawn and the panel says 0 hidden. It is a near miss, though: in 35.png one dot and
its name (Oklahoma) sit under the floating toolbar, so 114 dots can be seen, and the "0 hidden"
count does not cover names hidden by the app's own chrome (problem 5). Sam could not have known.

## Problems

Severity 0-4 (Nielsen). Build defects were reproduced by the scripts in
`rounds/round-2/repro/r2-s01/`: `repro.sh` (keys only, Sam's own path, output in `run/` and
`run.log`) and `repro-2d.sh` (pointer used only by the grader to set up and to look under the
toolbar, output in `run-2d/` and `run-2d.log`). Both behaved the same as the session.

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                                           | Evidence                                                                                                                            |
| --- | --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3   | build-defect | In 2D, Fit (key 0) zooms the camera into a single letter of one label instead of showing the whole graph; pressing 0 again does not recover. Sam did not press it, but the next keyboard user who asks to see the whole picture loses it. (3D not checked.)                                       | Repro: `run/10.png` (keys only, after 5 then 0), `run-2d/06.png`, `run-2d/07.png`.                                                  |
| 2   | 3   | behavior     | "14 hidden to avoid overlap" is plain text with no route to show them: not a control, and nothing in the label line offers it. Sam found the 2D switch only by guessing from the shortcut list; he said a reader with fewer hunches "would stop at 14 missing and think they were done or stuck". | Steps 21-35, 21.png, 24.png, 29.png, 33.png. One participant; behavior, so unconfirmed until a second.                              |
| 3   | 2   | build-defect | The disabled "Add label line" (+) beside Label stays in the Tab order and draws no focus ring; only its tooltip ("One label line per row for now") showed where focus was (WCAG 2.4.7).                                                                                                           | Step 27, 27.png. Repro: `run.log` "focus: button "Add label line" disabled", `run/07.png`.                                          |
| 4   | 2   | build-defect | Once a label line exists, the "Label" heading button is disabled but looks enabled (normal text, full focus ring) and Enter does nothing, with no sign why.                                                                                                                                       | Steps 28-29, 28.png, 29.png. Repro: `run.log` "focus: button "Label" disabled", `run/08.png`.                                       |
| 5   | 2   | build-defect | After switching to 2D (key 5), the framing puts the Oklahoma dot and its name under the floating toolbar; 114 of 115 dots can be seen while the panel says "0 hidden".                                                                                                                            | 35.png (dot count 114). Repro: `run-2d/04.png` (114), `run-2d/05.png` after panning up 150 px shows Oklahoma where the toolbar was. |
| 6   | 2   | build-defect | After Enter on a sample, focus goes to the drawing, which has no accessible name and shows no focus ring; Sam could not tell where focus was.                                                                                                                                                     | Step 8, 08.png. Repro: `run.log` "focus: Canvas (no name)", `run/02.png`.                                                           |
| 7   | 2   | behavior     | Label lives under the Everything row; the Graph row's Style tab (where focus first reaches a Style tab) has no label control and no pointer to Everything.                                                                                                                                        | Steps 9-15, 12.png, 15.png.                                                                                                         |
| 8   | 2   | behavior     | Long Tab walk: 15 Tabs from Everything (left) to Label (right), across the toolbar and every Fill and Shape control; choosing a row does not move focus to its panel, and no shortcut reaches the Style tab or Label.                                                                             | Steps 15-18, 16.png-18.png.                                                                                                         |
| 9   | 1   | build-defect | Choosing a label attribute makes two live announcements ("0 labels, 0 hidden to avoid overlap", then "115 labels, 14 hidden to avoid overlap"); the accessibility check asks for exactly one.                                                                                                     | Repro: `run.log`, step 06.                                                                                                          |
| 10  | 1   | behavior     | The Samples list looks like a list, but arrow keys do not move between samples; only Tab does.                                                                                                                                                                                                    | Step 6, 06.png.                                                                                                                     |
| 11  | 1   | opinion      | No keyboard zoom in or out in the shortcut list, so "zoom until the names fit" was not open to him.                                                                                                                                                                                               | Step 33, 33.png.                                                                                                                    |

What worked, for the record: "?" opened a clear keyboard-shortcut dialog; tooltips print
shortcuts (Analyze Shift+A); the attribute list works with arrows and Enter; Escape returned focus
to the opener after every popover and dialog; after choosing the attribute, focus moved to the new
line's "Label position" button.

## Note for the answer key

The College football success definition says "the build has no control that shows every name".
On this build the 2D switch (key 5, or the toolbar's 3D/2D menu) brings the count to "0 hidden"
for College football. A participant who ends there has met the task; grade it as such.
