# Grade: session r2-s20 -- Jordan (regular analyst), Les Miserables (T17 B), only the strong ties

**Grade: S** (success), prompt and follow-up both. The last screen (`15.png`) shows every
character back: Overview "Nodes 77", "Edges 254", no "of 77" chip in the header, and the Filters
row "shared_chapters is at least 8" with its checkbox clear and the second line "off". Both counts
were read from the screen and are right: 26 characters at 5 or more shared chapters (`08.png`:
chip "26 of 77 nodes", row "77 to 26 nodes", Overview "Nodes showing 26 of 77", "Edges showing 51
of 254"), and 17 at 8 or more (`14.png`: chip "17 of 77 nodes", row "77 to 17 nodes", "Nodes
showing 17 of 77", "Edges showing 19 of 254"). Both match the answer key. No detour.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `lesmis-ranked.txt` (Les Miserables, PageRank run, nodes sized and
colored by it).

## The answer against the key

- **Prompt (right).** 26 of 77 characters, 51 of 254 ties (`08.png`). Brought back by unticking
  "Apply step: shared_chapters is at least 5" (`09.png`: row "off", Overview 77 / 254).
- **Follow-up (right).** Jordan opened the existing step by its row, changed Value 5 to 8 and
  pressed "Save and turn on" (`10.png` to `14.png`), then unticked it once (`15.png`). This is the
  key's follow-up success path exactly. He did not fall into the known trap (ticking after Save,
  which turns the step off): the one tick after Save was meant to bring everyone back, and did.
- **Saved state agrees.** `work.json` end: one filter step, `step-1 off`, rule
  `range data.shared_chapters min 8 nodes ends`; the PageRank run and its layers unchanged from the
  start. No rerun of PageRank.
- **Not a wrong answer.** Not `read-wrong`: he read the "showing" count, not the legend's
  "PageRank on 77 nodes", and did not count dots (so the overlapping pair near 640,372 played no
  part).

## Measures

- **Steps:** 14 `real.mjs` steps after the start (`02.png` to `15.png`): 8 for the prompt
  (Data, "Add filter step", Attribute, shared_chapters, Value, type 5, Add step, untick) and 6 for
  the follow-up (row, Value, Ctrl+A, type 8, Save and turn on, untick). This equals the key's path
  through the Filters "+" door, which the key accepts. About 1.0x.
- **Wrong turns:** 0.
- **False "done":** none. Both "done" claims (`09.png`, `15.png`) are true on screen.
  truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. Add step and Save and turn on both narrowed the drawing and
  changed the chip, row and Overview at once; each untick restored them and wrote "off".
- **Numbers that disagree (bar 5):** none. The chip, the row's second line and the Overview agree
  each time.
- **Stale ranking:** the legend titles read "Size: PageRank on 77 nodes" and "Color: PageRank on 77
  nodes" while 26 (then 17) are drawn (`08.png`, `14.png`). Jordan noticed and asked whether the
  colors were worked out on the whole cast or on who is left; he did not rerun PageRank and did not
  read 77 as the count. Recorded as problem 2.
- **Broken habit:** none. His history has never filtered ties by a number; his first move (Data, to
  look up the column name) led straight to the Filters "+".
- **Build-decided:** no. **Void:** no. Every step printed its screenshot and target; no refusals.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                 | Evidence                                                                                                       |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Narrowing the drawing lives only on the Data place (Filters row). On the Graph place, where the session starts, nothing hints that it exists; Jordan found it only because he went to Data to look up the column's name.                                                    | `01.png` (no filter control on Graph), `02.png`; debrief: "With the Graph tab open there was no sign that filtering existed" |
| 2   | 2        | comprehension   | While the step is on, the legend says "PageRank on 77 nodes" with the whole graph's range, and nothing says whether sizes and colors describe the 26 drawn or all 77. Jordan could not tell and said it matters for an essay figure. He did not misread the count.        | `08.png`, `14.png` legend titles; debrief: "I'd want to know whether the colors and sizes were worked out on the whole cast" |
| 3   | 1        | affordance      | The step's checkbox is small and carries no visible label; Jordan was unsure whether unticking would delete the step until he read "off" under the row afterward.                                                                                                       | `08.png`, `09.png`; debrief: "I wasn't sure it wouldn't delete the step"                                       |
| 4   | 1        | navigation      | After "Add step" and after "Save and turn on", the right panel leaves the step editor for the Graph Overview, so the step's settings vanish from view (known on this build). It helped him read the count here; to adjust again he had to click the row.                   | `08.png`, `14.png`; debrief: "the step's settings disappeared from view"                                       |

No severity 3 or 4: both counts were right, everyone was brought back both times, and every doubt
he raised was about finding the control or reading the legend on a path he completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
