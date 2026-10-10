# Grade: session r2-s21 -- Dev (returning student), running club (T17 A), only the strong ties

**Grade: S** (success), prompt and follow-up both. Dev narrowed the drawing with a filter step
"weight is at least 4", read the count from the screen (`09.png`: header chip "19 of 20 nodes",
Filters row "20 to 19 nodes", Overview "Nodes showing 19 of 20", "Edges showing 12 of 41"),
answered 19 people (12 pairs), and brought the whole club back by unticking the step (`10.png`).
On the follow-up he edited the same step to 5 and pressed "Save and turn on" (`12.png`, `13.png`:
chip "10 of 20 nodes", row "20 to 10 nodes", "Edges showing 5 of 41"), answered 10 people (5
pairs), and unticked once to bring everyone back. The last screen (`14.png`) shows the whole club:
all 20 dots and their ties drawn, no chip, the row "weight is at least 5 / off" with its checkbox
empty, Overview Nodes 20, Edges 41.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `friends-ranked.txt`, as the task names.

## The answer against the key

- **Prompt (right).** 19 of 20 people, 12 ties: the key's value exactly, read from the chip and
  the Overview's "showing" rows, not from the whole-graph rows below them (not `read-wrong`).
- **Follow-up (right).** 10 of 20 people, 5 ties: the key's value exactly.
- **Brought back (right).** `10.png` after the prompt and `14.png` after the follow-up: the step
  is off, not deleted, and the drawing is whole. `work.json` agrees: the run, the three layers and
  the source are all still there at the end, and the one step is `step-1 off` with rule
  `min 5` on `data.weight`. Nothing in `gone`.
- **The known trap (not hit).** After "Save and turn on" he did not tick the checkbox expecting
  it to switch the step on; he read the step as on (`13.png`, ticked, chip back) and his one later
  click unticked it to bring the club back, as the key's path says.
- **Rerun (not done).** He saw "PageRank on 20 nodes" in the key and wondered whether to rerun
  the ranking on the strong pairs only, then left it. The key asks graders to record this: he
  asked, he did not rerun, and he did not read "on 20 nodes" as the number still drawn.

## Measures

- **Steps:** 13 `real.mjs` steps after the start (`02.png` to `14.png`). Prompt: 9 (`02` to
  `10`), against the success path's 7 actions (the Filters "+" door, which the key accepts, is
  the same length): one hover on the Layout button while searching the toolbar, and one click the
  tool refused (`05.png` and `06.png` are byte for byte the same). Follow-up: 4, the same as the
  success path's 4. Total 13 against 11, about 1.2x.
- **Wrong turns:** 1. He looked in the bottom toolbar first, where his history says he ran the
  ranking, and hovered the chart icon ("Layout", `02.png`) before turning to the Data tab. The
  refused click at step 6 is not a wrong turn: the name "weight" matched two controls (problem 2).
- **False "done":** none. Both "done" claims are true on screen (`10.png`, `14.png`).
  truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. "Add step" and "Save and turn on" both changed the drawing,
  the chip and the row at once.
- **Numbers that disagree (bar 5):** none that he acted on. The key titles' "on 20 nodes" beside
  the chip's "19 of 20" / "10 of 20" is the known note; he read the chip.
- **Earlier work kept (bar 2):** yes; nothing gone (`work.json`).
- **Broken habit:** his history's analysis button holds no filter, but he never opened it; he
  moved on from the toolbar after one hover.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot, and the tool named the
  ambiguous match it refused.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind               | Problem                                                                                                                                                                                                                                                       | Evidence                                                                                              |
| --- | -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability    | Nothing in the bottom toolbar, where a returning user ran the ranking before, leads to filtering. Dev found "Filters" only because he opened the Data tab looking for his columns, and said he might otherwise have asked a classmate.                          | `01.png`, `02.png` (toolbar, "Layout" tooltip); `03.png`; transcript end: "I only found it because..." |
| 2   | 1        | accessibility-name | The edge attribute "weight" in the left Attributes tree and the "weight" option in the step editor's Attribute list share a name; the tool refused the click and nothing happened. Dev also said he was unsure which "weight" to pick. Cost one step.            | `05.png` identical to `06.png`; transcript steps 6-7 and end                                           |
| 3   | 1        | feedback           | While an edited value is unsaved, the editor header and the Filters row still read "weight is at least 4" with 5 in the Value box; for a moment Dev thought his 5 had not taken.                                                                               | `12.png`; transcript end: "For a second I thought it had not taken my 5"                               |
| 4   | 1        | comprehension      | Under a step the key reads "Size: PageRank on 20 nodes" with the whole graph's range, and nothing says whether the ranking should be redone for the narrowed drawing. Dev wondered whether to rerun for his flyer and left it; it did not change the answer.  | `09.png`, `13.png` key titles; transcript step 9 and end                                              |
| 5   | 1        | legibility         | Two pairs of dots near the bottom sit almost on top of each other, so counting dots by eye was hard; Dev counted 10 correctly at 5 only on a second look and otherwise trusted "Nodes showing".                                                                | `09.png`, `13.png` (about 567,758 / 583,753 and 717,745 / 735,744); transcript steps 9 and 13          |
| 6   | 0        | comprehension      | Left-out people leave gaps where they were drawn (the layout does not close up). Dev remarked on it for the flyer; he did not need it for the task.                                                                                                            | `09.png`, `13.png`; transcript end                                                                    |

No severity 3 or 4: both answers were right, the club came back both times, and every doubt he
raised was about where the control lives or wording on a path he completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
