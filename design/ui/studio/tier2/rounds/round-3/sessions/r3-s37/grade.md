# Grade: session r3-s37 -- Elena (tier 1 graduate), running club (T17 A), only the strong ties

**Grade: S** (success). Both answers are right and the whole club is back on the last screen. At
4 or more runs together Elena reported 19 people (12 pairs); the screen read the header chip "19
of 20 nodes", the Filters row "weight is at least 4" over "20 to 19 nodes" with its checkbox
ticked, and the Overview "Nodes showing 19 of 20", "Edges showing 12 of 41" (`07.png`), which is
the key's answer. In the follow-up, at 5 or more, she reported 10 people (5 pairs); the screen
read the chip "10 of 20 nodes", the row "weight is at least 5" over "20 to 10 nodes" with the
checkbox ticked, and "Nodes showing 10 of 20", "Edges showing 5 of 41" (`11.png`), again the
key's answer. The last screen (`12.png`) shows the whole club: no chip in the header, the row
"weight is at least 5" over "off" with the checkbox clear, the Overview "Nodes 20", "Edges 41",
the legend titles back to plain "Size: PageRank" / "Color: PageRank", and the full drawing.
`work.json` agrees: one step, `step-1 off`, the range rule on `data.weight` with min 5 and nodes
"ends"; the PageRank run and its Influence layer are unchanged, nothing gone.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: friends.csv, PageRank run and drawn by size and color (setup
`friends-ranked.txt`). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **At 4 or more (right).** 19 of 20 people, 12 of 41 ties (`07.png`). Elena read the chip and
  the Overview and gave the tie count too. She did not name Theo as the one left out; the task
  does not ask for it.
- **Back (right).** Unticked the step's checkbox (`08.png`): chip gone, row "off", Nodes 20,
  Edges 41, full drawing.
- **Follow-up at 5 or more (right).** Elena opened the step's row (editor "Filter step Off",
  Value 4, button "Save and turn on", `09.png`), replaced the value with 5 (`10.png`) and pressed
  "Save and turn on" (`11.png`): 10 of 20, 5 of 41.
- **The trap (not fallen into).** After "Save and turn on" she did not tick the checkbox to
  switch the step on. The one click on the checkbox after the save (`12.png`) was meant to bring
  everyone back, and it did. Not `read-wrong`.
- **Overlapping dots.** Elena noticed the near-overlapping pair at the bottom left (about
  567,758 / 583,753) at 4 or more and the pair at about 717,745 / 735,744 at 5 or more, and said
  she trusted the number over a dot count. Her stated counts came from the chip and the Overview,
  so the overlap did not change an answer.

## Measures

- **Steps:** 11 `real.mjs` steps after the start (`02.png` to `12.png`), all effective. Main task
  7 (Data, Filters "+", Attribute, the "weight" option, Value / 4, Add step, untick); follow-up 3
  (open the row, Value / 5, Save and turn on) plus the untick. This is the key's other door
  (Filters "+"), which graders accept, and it matches the success path's length.
- **Wrong turns:** 0. Every step went forward.
- **False "done":** none. Both "done" claims are true on screen: the counts were on screen when
  given (`07.png`, `11.png`) and the whole club is on screen after each untick (`08.png`,
  `12.png`). truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. "Add step" and "Save and turn on" each narrowed the drawing at once
  and put the chip and the row's count on screen.
- **Numbers that disagree:** none. Chip, row and Overview agree at 4 and at 5.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot and leaks.json shows no
  leaks.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind        | Problem                                                                                                                                                                                       | Evidence                                                   |
| --- | -------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | 1        | labeling    | The column holding "runs together" is listed only as "weight"; Elena had to guess it was her count and says it worked only because it was the only number column.                              | `02.png`, `04.png`; transcript step 1 and wrap-up, first item |
| 2   | 1        | drawing     | Two pairs of dots sit almost on top of each other, so a count of dots on the drawing comes out short; Elena noticed and trusted the chip instead.                                               | `07.png`, `11.png`; transcript steps 6 and 10, wrap-up third item |
| 3   | 1        | trust       | Before unticking, Elena was unsure whether the checkbox would only switch the step off or delete it; the row's "off" after the click reassured her.                                             | `08.png`; transcript step 7 and wrap-up, last item         |
| 4   | 0        | wording     | Counts are in "nodes", not people; Elena translated without trouble but says it is not her word.                                                                                              | `07.png`; transcript wrap-up, second item                  |

No severity 3 or 4: both answers were right, everyone came back both times, and no number on
screen disagreed with another.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
