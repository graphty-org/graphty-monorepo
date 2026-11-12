# Grade: session r3-s33 -- Ruth (tier 1 graduate, returning), running club (T17 A), only the strong ties

**Grade: S** (success), on the prompt and on the follow-up. At 4 or more runs together Ruth
narrowed the drawing with a filter step "weight is at least 4" and gave 19 people (12 of the 41
pairs), read from the chip "19 of 20 nodes", the Filters row "20 to 19 nodes" and the Overview
"Nodes showing 19 of 20", "Edges showing 12 of 41" (`09.png`). The key's answer is 19 joined by 12
ties. She brought the whole club back by unticking the step (`12.png`). On the follow-up she
opened the same step, changed 4 to 5 and pressed "Save and turn on": chip "10 of 20 nodes", row
"20 to 10 nodes" (`15.png`). She gave 10 people (5 pairs), as the key has, and unticked once to
bring everyone back. She did not fall into the follow-up trap (ticking after "Save and turn on").
The last screen (`16.png`) shows the whole club: every tie drawn, no chip in the top bar, the row
"weight is at least 5 / off" with its box empty, and the legend titles back to plain "Size:
PageRank" and "Color: PageRank".

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt`, as the task names (friends.csv loaded,
PageRank run, size and color by PageRank). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **Prompt, 4 or more (right).** 19 people, 12 pairs: `09.png`, all three places the key names.
  Read from the screen's counts, not only from dots (she also said she counted 19 dots; the
  overlapping pair near 567,758 / 583,753 makes that count hard, but the stated number came from
  the chip and the Overview, and it is right).
- **Not a wrong reading.** She did not give 20 (the "Full graph" Nodes row in `09.png`) as "still
  in it". She read "PageRank, full graph" as "the ranking was not redone on the cut-down map",
  which is the right meaning; she did not rerun PageRank.
- **Back (right).** Unticked "Apply step: weight is at least 4" (`12.png`); the key accepts this.
- **Follow-up, 5 or more (right).** 10 people, 5 pairs (`15.png`), matching the key's "10 of 20
  nodes", "20 to 10 nodes", "Edges showing 5 of 41". Back by one untick (`16.png`).
- **work.json agrees.** End state: one run (PageRank), the three starting layers, no notes, one
  filter step `step-1 off {"kind":"range","attribute":"data.weight","min":5,"nodes":"ends"}`
  ("off" is its state), source friends.csv, nothing gone. The step is kept for later, off, as she
  intended.

## Measures

- **Steps:** 15 `real.mjs` steps after the start (`02.png` to `16.png`): 11 for the prompt and 4
  for the follow-up. The key's success path is 8 for the prompt (attribute menu door) and 5 for
  the follow-up; she used the Filters "+" door, which the key accepts. The extra steps are the two
  wrong turns, one hover check of the checkbox and one click on a tie to check its weight.
- **Wrong turns:** 2. Hovered the bottom toolbar's Layout button (`02.png`) and opened the
  "Everything" layer's style panel (`03.png`), looking for a way to narrow the drawing from the
  Graph page, before trying the Data tab.
- **False "done":** none. Both "done" claims are true on screen (`12.png`, `16.png`).
  truth-on-screen: holds.
- **Follow-up trap ("Save and turn on" then tick):** not fallen into.
- **Reran PageRank or read "full graph" as what is drawn:** no.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; leaks.json shows no
  leaks and no calls.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                        | Evidence                                                                                                     |
| --- | -------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | 2        | stale-panel     | After the 5-or-more step hid the Ravi -> Sana tie (weight 4), the right-hand panel kept showing that tie (From Ravi, To Sana, weight 4) with nothing saying it is no longer drawn. A reader can take an absent tie for a present one.                                                            | `15.png` right panel against the drawing; transcript step 14 and end                                         |
| 2   | 2        | discoverability | Nothing on the Graph page names narrowing the drawing; the Filters section is only on the Data page. Two wrong turns (Layout button, the "Everything" style layer) before she found it.                                                                                                         | `02.png`, `03.png`, `04.png`; transcript end, "Finding where to start"                                       |
| 3   | 1        | wording         | While an edited value is unsaved, the step editor's header still names the saved rule ("weight is at least 4" over a Value of 5). Known on this build; she called it minor.                                                                                                                     | `14.png`; transcript step 13                                                                                 |
| 4   | 1        | comprehension   | Under the filter, the legend reads "PageRank, full graph" with the whole graph's range; "full graph" is the only word on whose range it is. She read it correctly, but nothing says whether it means the ranking or the drawing. Known on this build.                                          | `09.png`, `15.png` legend                                                                                    |

No severity 3 or 4: both answers were right, both returns to the whole club worked, and the
problems she met cost two wrong turns and one moment of doubt.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
