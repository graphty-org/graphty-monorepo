# Grade: session r2-s17 -- Grace (returning), running club (T17 A), only the strong ties

**Grade: S** (success). Grace narrowed the drawing to pairs with weight at least 4 and read the
count from the screen: header chip "19 of 20 nodes", Filters row "weight is at least 4 / 20 to 19
nodes", Overview "Nodes showing 19 of 20", "Edges showing 12 of 41" (`09.png`). She answered "19
people" (12 pairs), which is the key's answer. She then unticked the step and the whole club came
back: chip gone, Overview Nodes 20, Edges 41, the row reading "off", ranking colors and sizes
unchanged (`10.png`). The last screen (`14.png`) also shows the whole club back after the
follow-up: Overview Nodes 20, Edges 41, Filters row "weight is at least 5 / off", no chip.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `friends-ranked.txt` (friends.csv loaded, PageRank run, sized and
colored by it), as the task names.

## The answer against the key

- **Count (right).** 19 of 20 people, 12 ties (`09.png`). She read it from the chip and the
  Filters row and also counted dots; her dot count matched because she noticed the two overlapping
  pairs at the bottom of the drawing, the overlap the key warns about.
- **Brought back (right).** Unticked "Apply step: weight is at least 4" (`10.png`), the key's
  success path. `work.json` end state: one step, `step-1 off`, rule `data.weight min 5`; runs and
  layers the same as at the start.
- **Follow-up (right).** 5 or more: chip "10 of 20 nodes", row "20 to 10 nodes", "Edges showing 5
  of 41" (`13.png`); she said 10 people, 5 pairs. Then one untick brought everyone back
  (`14.png`). She edited the existing step from its row, pressed "Save and turn on" and did not
  tick the checkbox afterwards, so she did not fall into the switch-it-off trap the key describes.
- **Not a wrong answer.** Not `wrong-attribute`, not a count stated before the drawing changed,
  not selection in place of narrowing, not `read-wrong`. She read the legend's "PageRank on 20
  nodes" as "ranked on the whole club", not as the number drawn, and did not rerun PageRank.

## Measures

- **Steps (main task):** 9 `real.mjs` steps after the start (`02.png` to `10.png`). The key's
  success path is 8 (Data, the attribute row or the Filters "+", Attribute, weight, Value, Add
  step, untick); the extra steps are the one wrong turn and its redo.
- **Wrong turns:** 1. Step 5 (`05.png`): with the Attribute list open, Grace aimed at the list's
  "weight" option but clicked the left panel's "weight" attribute row (both carry the name
  "weight"; she addressed it as "weight#2"). The click replaced the half-made "New filter step"
  editor with the attribute's summary and discarded it without a word. She saw at once what had
  happened, pressed "+" again and finished. Recovered.
- **Follow-up (the second time):** 4 steps (`11.png` to `14.png`): click the step's row, change
  Value to 5, Save and turn on, untick. Equal to the follow-up success path (4), within the
  target of path + 1. 0 wrong turns.
- **Protocol note on the follow-up:** the facilitator's follow-up was recorded by the tool at
  03:05:58 UTC (`session.json` "followUp"), 13 seconds after the last screenshot (`14.png`,
  03:05:45 UTC), and the transcript says the follow-up "had already been done in steps 10-14 from
  the task text". So the follow-up wording reached the participant before she declared the first
  part done and before the tool delivered it. The steps and answers are valid on screen, but this
  session's follow-up is not a clean measure of "the second time unprompted"; count it with that
  caveat. Not a tool failure, so not VOID.
- **False "done":** none. Both "done" claims (`10.png`, `14.png`) are true: the narrowed counts
  were right on screen and the whole club is back. truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** one. The half-made filter vanished with no warning when another item
  was selected (problem 1).
- **Numbers that disagree (bar 5):** none read wrong. Under the filter the Overview still lists
  Nodes 20 and Edges 41 below "The counts below are for the whole graph." (`09.png`); she read it
  correctly.
- **Broken habit:** none. Her first move, Data, led on to the Filters "+".
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; the run completed.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind               | Problem                                                                                                                                                                                                                                                       | Evidence                                                                                          |
| --- | -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | 2        | silent-discard     | An unsaved "New filter step" editor is thrown away, with no warning or way back, when the reader selects another item (here the left panel's attribute row). Grace had to start the step again.                                                               | `04.png` (editor open, list open) against `05.png` (attribute summary, editor gone); transcript step 5 |
| 2   | 1        | accessibility-name | Two controls on screen at once share the accessible name "weight": the Attribute list's option and the left panel's attribute row. The participant addressed the wrong one, which led to problem 1. A person with a mouse would likely click the open list. | `04.png`; transcript step 5 facilitator note                                                      |
| 3   | 2        | feedback           | The filter editor shows no preview of how many people or ties the step would keep before "Add step"; the count appears only after committing. Grace asked for it.                                                                                            | `08.png`; transcript, "Before pressing 'Add step' there was no hint how many people would be left" |
| 4   | 1        | missing-detail     | With 19 of 20 left, nothing names the one person who dropped out (Theo). Grace wanted to know; the task did not ask, so it did not cost the answer.                                                                                                          | `09.png`; transcript end                                                                          |
| 5   | 1        | wording            | The legend reads "PageRank on 20 nodes" while 19 are drawn. Grace read it correctly as "ranked on the whole club", but the phrase invites reading it as a count, and "PageRank" is not her word.                                                            | `09.png`, `13.png`; transcript step 9                                                             |
| 6   | 1        | legibility         | Two pairs of dots at the bottom of the drawing overlap, so a dot count comes out short unless the reader looks closely. She caught it; the chip gave the right number regardless.                                                                           | `09.png`, `13.png` near 567,758 and 717,745                                                       |
| 7   | 0        | wording            | The column is still called "weight", the file's header, so Grace had to remember it means runs. Expected from her data; no cost.                                                                                                                            | `04.png`; transcript end                                                                          |

No severity 3 or 4: both answers were right, everyone came back, and no claim was false. Every
problem is about feedback, wording or a lost half-made step on a path she completed. None is an
implementation fault of the build: no crash, no script error, no number on screen that was wrong.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
