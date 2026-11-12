# Grade: session r2-s22 -- Elena (returning), Les Miserables (T17 B), only the pairs who share 5 or more chapters

**Grade: S** (success). Elena narrowed the drawing to the pairs sharing 5 or more chapters, read
the count from the screen and gave the right answer, 26, then brought every character back.
`07.png`: header chip "26 of 77 nodes", Filters row "shared_chapters is at least 5" over "77 to
26 nodes" with its checkbox ticked, Overview "Nodes showing 26 of 77", "Edges showing 51 of 254"
-- the key's values. `08.png`: the step unticked, row "off", chip gone, Overview Nodes 77. The
last screen (`12.png`) has everyone back after the follow-up too: no chip, row "shared_chapters
is at least 8" over "off" with its checkbox clear, Overview Nodes 77, Edges 254, legend titles
back to plain "Size: PageRank" / "Color: PageRank". `work.json` agrees: the PageRank run and its
three layers kept, one step `step-1 off` (range on `data.shared_chapters`, min 8), nothing gone.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the
criteria, at 1440 x 900, no uncommitted changes. Start: setup `lesmis-ranked.txt`; `01.png` is
the expected start (Les Miserables, PageRank run, sized and colored by it).

**Run deviation (does not change the grade, does limit the follow-up's evidence).** The
follow-up work (`09.png` to `12.png`, 03:11:18 to 03:11:48 UTC by file time) was done before the
tool gave the follow-up (`session.json`: "followUp": "given 2026-10-10T03:11:58"). The transcript
says the follow-up's wording was taken "from the task's follow-up line" and that the first
`--end` then printed it. The folder has no `briefing.md`. So the participant was handed the task
entry with its follow-up rather than only the prompt, the same deviation as r2-s18 and r2-s19 in
this round. The main task is graded as normal: its prompt is the one the participant should have
had, and nothing suggests it saw the answer key. The follow-up is not a clean measure of "the
second time unprompted", and its outcome is not evidence about the "Save and turn on" trap,
since the edit was planned before it was asked.

## The answer against the key

- **Count (right).** 26 of 77 characters, 51 ties (`07.png`); Elena named the chip, the Overview
  and the Filters row.
- **Back (right).** Unticked the step's checkbox (`08.png`), one of the key's accepted ways back.
- **Follow-up (right, see the deviation above).** Clicked the step's row (`09.png`, editor with
  Value 5 and "Save and turn on"), changed 5 to 8 (`10.png`), pressed "Save and turn on"
  (`11.png`): chip "17 of 77 nodes", row "77 to 17 nodes", "Nodes showing 17 of 77", "Edges
  showing 19 of 254" -- the key's values. She said 17. Then one untick brought everyone back
  (`12.png`). She did not tick the checkbox after saving, so did not fall into the trap the key
  describes.
- **Not a wrong answer.** Not `wrong-attribute`, not a count stated before the drawing changed,
  not selection in place of narrowing, not `read-wrong`. She read "Components 1" and "Nodes 77"
  under the "showing" rows as the whole graph's, from the line "The counts below are for the
  whole graph." She did not rerun PageRank and did not read "PageRank on 77 nodes" as a count.

## Measures

- **Steps (main task):** 7 `real.mjs` steps after the start (`02.png` to `08.png`): Data, the
  Filters "+", Attribute, shared_chapters, Value 5, Add step, untick. Equal to the key's "+" door
  path (7), 1.0x.
- **Follow-up:** 4 steps (`09.png` to `12.png`): the step's row, Value 8, Save and turn on,
  untick. Equal to the follow-up success path (4), within the target of path + 1. 0 wrong turns.
- **Wrong turns:** 0. Every click landed on what she aimed at; no detour, no undo.
- **Door:** the Filters "+" ("Add filter step"), then Attribute, Edges / shared_chapters, "at
  least", 5 -- the other door the key accepts.
- **False "done":** none. Both "done" claims (`08.png`, `12.png`) match the screen, and both
  counts were stated while the screen showed them. truth_on_screen: holds.
- **Silent commit (bar 4):** none seen.
- **Numbers that disagree (bar 5):** "Components 1" over a drawing in two pieces while 17 are
  showing (`11.png`); read correctly, but only after reading twice (problem 1).
- **Broken habit:** none. Her first move, Data, led straight to Filters.
- **First move:** the Data place, because "chapters is data".
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Implementation faults met:** none. No crash, no script error, no control that did nothing,
  no wrong number on screen. Every problem below is about wording, discoverability or feedback.
- **Build-decided:** no. **Void:** no; every step printed its screenshot and the run completed.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                  | Evidence                                    |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| 1   | 2        | numbers-disagree | While a step is on, the Overview lists "Components 1" (with Nodes 77, Edges 254, Density) for the whole graph just under "Nodes showing 17 of 77", over a drawing visibly in two pieces. Only the line "The counts below are for the whole graph" stops a misreading; Elena "had to read twice". Also in r2-s18 and r2-s19, so confirmed. | `11.png`; transcript step 11 and wrap-up    |
| 2   | 1        | discoverability | Nothing on the Graph place where she started points to narrowing the drawing; she went to Data only because "chapters felt like data". Cost here: none counted. Also raised in r2-s18 and r2-s19.                                                                          | `01.png`, `02.png`; wrap-up                 |
| 3   | 1        | discoverability | The "+" beside "Filters" is small and gray; she tried it only because it was the only control near the word.                                                                                                                                                             | `02.png` near 276,285; wrap-up              |
| 4   | 1        | feedback        | Before unticking, it was not clear whether the checkbox would switch the step off or delete it; she learned only after, from the word "off" on the row.                                                                                                                  | `07.png` against `08.png`; transcript step 7, wrap-up |
| 5   | 0        | wording         | The attribute shows as the file's column name "shared_chapters", not plain words. Expected from the data; no cost.                                                                                                                                                       | `04.png`; wrap-up                           |
| 6   | 0        | study-method    | The follow-up was in the participant's hands before the tool gave it (no `briefing.md`; follow-up screenshots time-stamped before "followUp: given"). A study-method problem, not a product one; whoever briefs participants should use `real.mjs --brief` only.           | file times of `09.png` to `12.png` against `session.json` |

No severity 3 or 4: both answers were right, everyone came back, and no claim was false.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
