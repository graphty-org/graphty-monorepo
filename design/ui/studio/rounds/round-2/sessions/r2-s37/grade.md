# Grade: session r2-s37 -- Morgan (screen reader, keyboard only), stop for the day and come back, Les Miserables

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json), screen-reader mode. Graded from the last
screenshot (87.png), the screenshots before it, the focus and live-region lines in the transcript
and a scripted keyboard-only re-run on the same build. No files were downloaded (the task needs
none: the project is kept in the browser). The participant's own rating (4 of 7) was not used.

Screenshot numbering: the first `--step` (`--key Shift+Slash`) was refused by the tool before it
reached the app and kept no screenshot, so step N of the transcript is N.png (the start is 01.png,
the "?" key is 02.png, Control+S is 10.png, the reopen is 47.png, the last step is 87.png).

## Grade: SD (success with difficulty)

- **Saved under a name Morgan chose.** Control+S put focus in the "Name" field (10.png); Morgan
  typed "Les Mis PageRank Morgan" and pressed Save. The live region said "Saved Les Mis PageRank
  Morgan in this browser." and the header took the name (15.png).
- **Put away.** Main menu > "Back to start" (44.png) left the start screen; Morgan then closed the
  tab (`--reopen`, step 47), which the answer key accepts because the tool reopens the same
  browser storage.
- **Reopened from Recent projects.** Five Tabs reached the grid cell "Les Mis PageRank Morgan In
  this browser - 77 nodes - Oct 7, 2026, 12:11 AM" (52.png); Enter opened it, "Opened Les Mis
  PageRank Morgan" (53.png).
- **Everything came back, and the reading matches the screen.** 87.png shows the header name, the
  orange Influence ramp (0.003299 to 0.07543), names drawn on the nodes, the Influence run's Values
  (Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577, all 77 of 77 with a value) and "Made with
  PageRank, damping factor 0.85". Morgan checked the labels by ear: "77 labels, 7 hidden to avoid
  overlap" (step 59) and "Label, Above: name" (step 77). The one difference Morgan named, which row
  was selected, the answer key does not count as lost work.
- **Why SD, not S:** three wrong turns (more than the two S allows) and a detour through the
  keyboard-shortcut dialog before starting.
- **Whole task from the keyboard:** yes.
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no (the tool refused the key name `Shift+Slash` once; nothing
  reached the app, and `?` worked).

## Counts

|                | This session                                                                      | Reference (round 2's keyboard path) |
| -------------- | --------------------------------------------------------------------------------- | ----------------------------------- |
| real.mjs steps | 86 after the start (one more refused by the tool)                                 | 6 steps on the pointer path         |
| Key presses    | about 116; about 73 to the reopened project (step 53), the rest checking the work | 103 keys including the setup's work |
| Wrong turns    | 3                                                                                 | --                                  |

Wrong turns (steps off the success path, later abandoned):

1. Steps 2-9 (02.png-09.png): opened the keyboard-shortcut dialog to look for Save; could not read
   a shortcut from it and left with Escape.
2. Step 26 (26.png): Enter on the header button "Project: Les Mis PageRank Morgan", expecting a
   project menu; it opened the inline rename field, abandoned with Escape (step 27).
3. Step 78 (78.png): F6 to jump between panels; nothing happened.

Not counted as wrong turns: the backward Tab walk to the Main menu (steps 16-29), reading every
Main menu item before choosing (steps 31-43), and the checking walk after the reopen (steps
54-87), which is verification of the work.

## False "done"

None. "Saving part done" (step 15) matched the alert and the header. "Putting-away part done"
(step 46) was an inference from the missing project button, and the screen agreed (the start
screen, 46.png). The final "all three parts of yesterday are back" matches 87.png. Morgan never
heard the Influence row's count "77" before the save (no focus line reads it), so not mentioning
its absence after the reopen is not a false claim; the answer key counts the missing count as a
known defect, not lost state.

## Problems

Severity 0-4 (Nielsen). Build defects were reproduced on every run by
`rounds/round-2/repro/r2-s37/repro.sh`, keys only in screen-reader mode, Morgan's own keys; output
in `run/` and `run.log`.

| #   | Sev | Kind          | Problem                                                                                                                                                                                                                                                                                                                                                  | Evidence                                                                                          |
| --- | --- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | 3   | build-defect  | Opening a saved project from Recent projects makes two announcements, "No nodes to draw" (polite) and then "Opened <name>" (assertive), where one is asked for. The first is false for a 77-node project and made Morgan doubt the nodes came back; only a long check settled it. The same "No nodes to draw" is spoken when a sample loads (setup.log). | Step 53, 53.png. Repro: `run.log` step 10, `run/10.png`.                                          |
| 2   | 2   | build-defect  | Main menu > "Back to start" moves focus to the page body and announces nothing; Morgan learned the project had closed only by tabbing and noticing the project button was gone.                                                                                                                                                                          | Steps 44-46, 44.png. Repro: `run.log` step 07 "focus: nothing (the page itself)".                 |
| 3   | 2   | build-defect  | Escape from the header's inline rename field drops focus to the page body instead of returning it to the "Project: <name>" button.                                                                                                                                                                                                                       | Step 27, 27.png. Repro: `run.log` step 04.                                                        |
| 4   | 2   | build-defect  | After the reopen the Influence row no longer shows its count "77" (it did before the save). Known graphty-element defect: a restored run has no summary. Same as sessions r2-s35 and r2-s36.                                                                                                                                                             | 03.png (row "Influence 77") vs 53.png and 87.png (no count). Repro: `run/01.png` vs `run/10.png`. |
| 5   | 2   | build-defect  | The drawing takes focus with no accessible name ("Canvas (no name)") every time Tab passes it, including right after the reopen, where focus lands on it.                                                                                                                                                                                                | Steps 16, 53, 61, 81. Repro: `run.log` step 10 "focus: Canvas (no name)".                         |
| 6   | 2   | accessibility | The keyboard-shortcut dialog ("?") opens with focus on Close and nothing that names the dialog in the focus line; its categories are grid cells, Enter on "Project" and ArrowRight change nothing Morgan could hear, and Tab skips the shortcut rows to Done. Morgan heard no shortcut from it.                                                          | Steps 2-9, 02.png-09.png. One participant; not scripted.                                          |
| 7   | 2   | behavior      | The header button reads "Project: <name>" like a project menu but only renames; the Main menu (the first control on the page) has no "Close project", so Morgan had to hear the whole menu to settle on "Back to start".                                                                                                                                 | Steps 26, 31-44. One participant.                                                                 |
| 8   | 2   | behavior      | Long keyboard walks with no way to jump between areas: 10 Shift+Tabs from Analyze to the header after saving, 18 Shift+Tabs from the label line back to the layer list; F6 does nothing. Choosing a row in the list does not move focus to its panel.                                                                                                    | Steps 16-25, 78, 79.                                                                              |
| 9   | 1   | behavior      | The Save dialog does not say where the project will be kept; only the alert after Save says "in this browser". Also seen in r2-s36, so confirmed.                                                                                                                                                                                                        | Steps 10-15, 10.png, 15.png.                                                                      |
| 10  | 1   | behavior      | The Main menu offers Save, Save as... and Save local copy... with no hint how they differ when Save already says "in this browser". Also seen in r2-s36.                                                                                                                                                                                                 | Step 37-38, 37.png.                                                                               |
| 11  | 1   | opinion       | The run is named "Influence" with no word PageRank in anything Morgan heard until Values > Made with; on the Style tab it is only "Influence, Color", which a blind user cannot use. Also raised in r2-s36.                                                                                                                                              | Steps 19, 82, 87.png.                                                                             |
| 12  | 1   | build-defect  | After the reopen the page loads with focus on the page body and nothing announced; the Recent projects row is five Tabs in.                                                                                                                                                                                                                              | Step 47, 47.png. Repro: `run.log` step 08.                                                        |
| 13  | 1   | accessibility | Unclear names on the Style tab: "Color swatch" does not say which color; "Label" and "Add label line" are announced disabled with no reason (also in r2-s01); "Nodes, set" means nothing to Morgan.                                                                                                                                                      | Steps 62, 64, 72, 73.                                                                             |
| 14  | 1   | behavior      | After the reopen the selected row is the Graph overview, not Everything as before; not lost work, but Morgan had to re-select Everything to hear the label count.                                                                                                                                                                                        | Steps 56-59, 53.png.                                                                              |

Opinion findings are held one level down. Behavior and opinion findings seen only here (6, 7, 8,
13 in part, 14) are unconfirmed until a second participant meets them.

What worked, for the record: Control+S put focus straight in a named "Name" field holding the
current name; the save alert names the project and the place; the Recent projects cell reads name,
place, node count and time in one line; "77 labels, 7 hidden to avoid overlap" is announced when
Everything is chosen; the Top 10 buttons read name then value.
