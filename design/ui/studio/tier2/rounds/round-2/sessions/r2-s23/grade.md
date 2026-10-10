# Grade: session r2-s23 -- Tom (returning lab manager), running club (T17 A), only the strong ties

**Grade: S** (success), prompt and follow-up both. The last screen (`13.png`) shows the whole club
back: no "of 20" chip in the header, the Filters row "weight is at least 5" over "off" with its
checkbox clear, Overview "Nodes 20", "Edges 41", legend titles back to plain "Size: PageRank" /
"Color: PageRank". Both counts were read from the screen and are right: 19 people at 4 or more runs
(`08.png`: chip "19 of 20 nodes", row "20 to 19 nodes", Overview "Nodes showing 19 of 20", "Edges
showing 12 of 41") and 10 at 5 or more (`12.png`: chip "10 of 20 nodes", row "20 to 10 nodes",
"Nodes showing 10 of 20", "Edges showing 5 of 41"). Both match the answer key.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900, no uncommitted changes. Start: setup `friends-ranked.txt`; `01.png` is the expected
start (friends.csv, PageRank run, nodes sized and colored by it).

**Run deviation (does not change the grade, does limit the follow-up's evidence).** The follow-up
work (`10.png` to `13.png`, 03:14:17 to 03:14:43 UTC by file time) was done before the tool gave
the follow-up (`session.json`: "followUp": "given 2026-10-10T03:14:48"), and the transcript says
the first `--end` "repeated the follow-up, which I had already done". The folder has no
`briefing.md`. So the participant had the follow-up before it was asked, the same deviation as
r2-s18, r2-s19 and r2-s22 in this round. The main task is graded as normal. The follow-up is not a
clean measure of "the second time, unprompted", and its outcome is not evidence about the "Save and
turn on" trap, since the edit was planned before it was asked.

## The answer against the key

- **Prompt (right).** 19 of 20 people, 12 of 41 ties (`08.png`). Tom read the chip, the row and
  the Overview, and also counted 19 dots; the count agreed (the overlapping pair near 567,758 /
  583,753 shows two circles here).
- **Back (right).** Unticked "Apply step: weight is at least 4" (`09.png`: row "off", chip gone,
  Overview 20 / 41), one of the key's accepted ways back.
- **Follow-up (right, see the deviation above).** Clicked the step's row (`10.png`, editor filled
  with 4 and "Save and turn on"), changed 4 to 5 (`11.png`), pressed "Save and turn on" (`12.png`),
  then one untick (`13.png`). This is the key's follow-up success path exactly; he did not tick
  after saving, so did not fall into the trap.
- **Saved state agrees.** `work.json` end: one step `step-1 off`, rule
  `range data.weight min 5 nodes ends`; the PageRank run and its three layers as at the start;
  nothing gone. No rerun of PageRank.
- **Not a wrong answer.** Not `wrong-attribute`, not a count before the drawing changed, not
  selection in place of narrowing, not `read-wrong`. He read "PageRank on 20 nodes" as where the
  ranking came from, not as the number drawn, and gave 19, not the Overview's whole-graph 20.

## Measures

- **Steps:** 12 `real.mjs` steps after the start (`02.png` to `13.png`): 8 for the prompt (Data,
  the "weight" row, the Filters "+", Attribute, weight, Value 4, Add step, untick) and 4 for the
  follow-up (row, Value 5, Save and turn on, untick). The prompt is one step over the key's "+" door
  path (the look at the "weight" row first, to check the column), within path + 1; the follow-up
  equals its path.
- **Wrong turns:** 0. The click on the "weight" attribute row was a deliberate check of the column
  and led on to the "+"; every click landed on what he aimed at.
- **Door:** the Filters "+" ("Add filter step"), which the key accepts.
- **False "done":** none. Both "done" claims (`09.png`, `13.png`) are true on screen, and both
  counts were stated while the screen showed them. truth_on_screen: holds.
- **Silent commit (bar 4):** none. Add step and Save and turn on each narrowed the drawing and
  changed chip, row and Overview at once; each untick restored them and wrote "off".
- **Numbers that disagree (bar 5):** none misread. Chip, row and Overview agree each time.
- **Stale ranking:** legend titles "Size: PageRank on 20 nodes" / "Color: PageRank on 20 nodes"
  while 19, then 10, are drawn (`08.png`, `12.png`). Tom took it to mean the ranking was done on
  the whole club and said he would ask whether the sizes are still right; no rerun (problem 1).
- **Broken habit:** none. His history never filtered; his first move (Data, "the column is data")
  led straight to Filters.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Implementation faults met:** none. No crash, no script error, no control that did nothing, no
  wrong number on screen, no refused click. Every problem below is wording, legibility or an open
  question.
- **Build-decided:** no. **Void:** no; every step printed its screenshot and the run completed.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                                                       | Evidence                                                         |
| --- | -------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | 2        | comprehension | While a step is on, the legend reads "PageRank on 20 nodes" with the whole graph's range, and nothing says whether sizes and colors describe the people drawn or all 20. Tom guessed right but would ask a colleague. Also in r2-s20, so confirmed. | `08.png`, `12.png` legend titles; wrap-up                        |
| 2   | 1        | legibility    | The line under Value that explains why a person stays ("keeps edges that pass and the nodes at their ends") is small and gray; 19 of 20 surprised him and he counted dots to be sure, having only half read it.                                  | `06.png`, `07.png`; transcript step 7 and wrap-up                |
| 3   | 1        | drawing       | Two pairs of dots sit almost on top of each other at the bottom, so a count by eye nearly came out short. His count was right. The key's known overlap.                                                                                        | `08.png` near 567,758 / 583,753; `12.png` near 717,745 / 735,744 |
| 4   | 1        | feedback      | While a new value is typed but not saved, the editor's title still names the saved rule ("at least 4" with 5 in the box). Known on this build; no cost once he pressed Save.                                                                   | `11.png`; transcript step 10                                     |
| 5   | 1        | open question | Nothing tells him whether a step left "off" is kept in the saved project or changes what a colleague sees on opening it. Opinion only (he did not save), held one level down.                                                                   | wrap-up                                                          |
| 6   | 0        | wording       | The column shows as the file's name "weight", not "runs"; he knew it from the task and the range 1 to 5 the attribute row shows. Expected from the data; no cost.                                                                              | `03.png`; wrap-up                                                |
| 7   | 0        | study-method  | The follow-up was in the participant's hands before the tool gave it (no `briefing.md`; follow-up screenshots time-stamped before "followUp: given"). Not a product problem; participants should be briefed with `real.mjs --brief` only.        | file times of `10.png` to `13.png` against `session.json`        |

No severity 3 or 4: both answers were right, the club came back both times, and no claim was false.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
