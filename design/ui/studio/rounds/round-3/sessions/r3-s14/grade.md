# Grade: session r3-s14 -- Morgan (screen-reader analyst), names on every dot, Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), screen-reader mode
(keys, typing and the accessibility tree only). Graded from the last screenshot (32.png), the
transcript and one scripted re-run on the same build. No files were saved in this task, and none
were needed. Not graded from the participant's rating (4 of 7).

## Grade: SD (success with difficulty)

Every part of the success definition holds on screen:

1. **Label line bound to the name attribute on a row covering every node.** Step 29 (30.png): on
   the "Everything" row, "Add label line", then `name` (not `id`) from the list that offered both.
   The line reads "Label, Above: name" and the Style tab shows "Abc name".
2. **Names drawn.** 28.png shows no names. 30.png shows names on most dots, with the statement
   "77 labels, 7 hidden".
3. **Count read correctly; every name reached.** Step 31: she Tabbed to "Show all labels" and
   pressed Space. The live region read "77 labels". 32.png shows the box checked, the statement
   "77 labels" with no hidden part, and names on dots that had none in 30.png (for example Mother
   Innocent, Mme Pontmercy, Mlle Gillenormand). Her claim "that's every character" matches the
   screen.

- **Every name reached:** yes.
- **Why SD, not S:** three wrong turns (below), more than the two SD allows for an S. She also
  could not say why seven names were hidden. The switch made that question moot for the grade,
  since round 3 scoring with the switch on asks only that she says every name is now written.
- **Build-decided:** no. **Void:** no. The tool did nothing a person could not.
- **Failure codes:** none.
- **Bar 7 (keyboard only):** met for this session (SD).
- **Ease:** 4 of 7, from the debrief.
- **Usage card:** skipped by opening a sample. It was read in browse mode (step 1) and left
  unanswered; no wrong belief about what is sent.

## Screen-reader check

The task's check passes on this build. "77 labels, 7 hidden" was announced once after `name` was
chosen (step 29), the line's text "Label, Above: name" was read (step 30), and after Space on
"Show all labels" the focus stayed on `checkbox "Show all labels" checked` and the live region read
"77 labels" (step 31). Before the real count, the region arrived already holding "0 labels, 0
hidden", which many screen readers do not speak (problem 9). No undo was used.

## Counts

|                                      | This session                       | Reference                               |
| ------------------------------------ | ---------------------------------- | --------------------------------------- |
| Commands (real.mjs, after the start) | 31 (9 of them reads)               | 5 on the success path                   |
| Keys pressed                         | 66, plus "names" and "label" typed | 53 keys on Les Miserables, round 3 walk |
| Wrong turns                          | 3                                  | --                                      |

- **Wrong turn 1, View menu (steps 8-11, 09.png-11.png):** looked for names under View. It holds
  cameras, Legend and Table only. Escape returned focus to View.
- **Wrong turn 2, Quick actions (steps 12-17, 13.png-17.png):** "names" found nothing, and nothing
  announced that. "label" found "Add label line", listed disabled with no reason.
- **Wrong turn 3, Style tab with nothing chosen (steps 18-21, 19.png-21.png):** the Style tab
  showed only canvas settings (background and layout). She guessed she had to choose "Everything"
  in the outline, and that guess was right.
- **One-key overshoots (not counted):** Tab past Les Miserables (step 3) and Shift+Tab past the
  outline to Find (step 21). Each was corrected on the next command.
- Keys against the reference: 66 / 53, about 1.25x, inside the 2x measure. Commands against the
  5-step success path: 31 / 5, about 6x; most of the excess is reads, which a sighted user does by
  looking.

## False "done"

None. Her only "done" ("'77 labels'. No 'hidden' any more. That's every character. I'm done.")
was made with 32.png showing "77 labels", "Show all labels" checked and every name drawn. Names
overlap where dots are close; the answer key counts that as the switch working.

## Silent commits

None. Choosing `name` (28.png to 30.png) draws names; "Show all labels" (30.png to 32.png) draws
the seven that were hidden.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. The build defects below
were reproduced by `rounds/round-3/repro/r3-s14/repro.sh`, which replays the session's keys in
screen-reader mode; its output is in `run/` and `run.log` beside it. The re-run gave the same
result as the session at every point listed.

| #   | Sev | Kind          | Problem                                                                                                                                                                                                                                  | Evidence                                                                                          |
| --- | --- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | 3   | build-defect  | Opening a sample with Enter drops focus to the page body. She had to Tab again from the top of the page to find the graph. Also met in r3-s01, so confirmed.                                                                             | Step 4, 04.png, "focus: nothing (the page itself)". Repro step 03, `run/03.png`, same focus line. |
| 2   | 2   | build-defect  | Quick actions announces nothing when a search has no match. "No results" exists only as page text, found by reading the dialog.                                                                                                          | Steps 13-14, 13.png, 14.png. Repro steps 05-06.                                                   |
| 3   | 2   | build-defect  | Quick actions lists "Add label line" as disabled with no reason, while the View menu gives one for its disabled "Frame selection" ("Select a node first"). Nothing tells the user to choose a row first.                                 | Step 16, 16.png. Repro step 08.                                                                   |
| 4   | 2   | behavior      | With nothing chosen, the Style tab shows only canvas settings (background, layout), and nothing points to choosing "Everything" to style the dots. Cost one wrong turn. Seen in one participant.                                         | Steps 19-21, 20.png, 21.png.                                                                      |
| 5   | 2   | build-defect  | Choosing "Everything" in the outline is silent: no announcement that the inspector now styles all nodes. She found out only by Tabbing to the inspector. A silent row choice was also met in r3-s01 (the Betweenness row), so confirmed. | Steps 22-24, 22.png-24.png. Repro steps 11-12, no live text.                                      |
| 6   | 2   | accessibility | The inspector's sections (Fill, Shape, Effects, Label, Tooltip) are plain text, not headings, so a screen-reader user cannot jump to Label and Tabs through ten controls.                                                                | Steps 25-26, 25.png, 26.png; the read shows no heading roles.                                     |
| 7   | 2   | wording       | The statement "77 labels, 7 hidden" does not say why seven are hidden or which ones. She could not explain it and turned the switch on only because the task said "every name". Also raised in r3-s01, so confirmed.                     | Steps 29-30, 30.png; debrief.                                                                     |
| 8   | 1   | build-defect  | The canvas Style tab reads Gravity as "-1.2000000476837158", a float32 value shown unrounded.                                                                                                                                            | Step 20, 20.png. Repro step 10.                                                                   |
| 9   | 1   | build-defect  | The label-count live region appears already holding "0 labels, 0 hidden" before the real count, so many screen readers would not speak the first value.                                                                                  | Step 29, transcript marks it "unconfirmed". Repro step 14.                                        |
| 10  | 1   | accessibility | Disabled controls stay in the Tab order: "Redo" on the toolbar, and "Label" and "Add label line" once a label line exists. Each costs a Tab and reads as a dead control.                                                                 | Steps 6, 30, 06.png, 30.png. Repro steps 03 and 16.                                               |
| 11  | 1   | wording       | Quick actions has no match for "names", the user's word for labels. Held one level down as one participant's word choice.                                                                                                                | Steps 13-14, 14.png.                                                                              |

**What worked:** the start page has real headings and says files stay on this computer. Opening the
sample announced "Les Miserables: 77 nodes, 254 edges" once, and the Overview gives counts,
components and direction as text. Menus return focus to the button that opened them; the toolbar
and tabs use arrow keys. The attribute list offered `id` and `name` clearly, and she picked
`name`. "Show all labels" is a reachable checkbox beside the count, and its effect is announced
("77 labels") with focus staying on it.
