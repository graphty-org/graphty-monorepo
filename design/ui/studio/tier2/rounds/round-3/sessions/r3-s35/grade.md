# Grade: session r3-s35 -- Jordan (returning), running club (T17 A), only the strong ties

**Grade: S** (success). Both answers are right and the whole club is back on the last screen.
At 4 or more runs together Jordan reported 19 people (12 pairs); the screen read the header chip
"19 of 20 nodes", the Filters row "weight is at least 4" over "20 to 19 nodes" with its checkbox
ticked, and the Overview "Nodes showing 19 of 20", "Edges showing 12 of 41" (`08.png`), which is
the key's answer. In the follow-up, at 5 or more, Jordan reported 10 people (5 pairs); the screen
read the chip "10 of 20 nodes", the row "weight is at least 5" over "20 to 10 nodes" with the
checkbox ticked, and "Nodes showing 10 of 20", "Edges showing 5 of 41" (`11.png`), again the
key's answer. The last screen (`12.png`) shows the whole club: no chip in the header, the row
"weight is at least 5" over "off" with the checkbox clear, the Overview "Nodes 20", "Edges 41",
and the full ring drawn. `work.json` agrees: one step, `step-1 off`, the range rule on
`data.weight` with min 5; the PageRank run and its Influence layer are unchanged, nothing gone.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: friends.csv loaded, PageRank run and drawn by size and color
(setup `friends-ranked.txt`). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **At 4 or more (right).** 19 of 20 people, 12 of 41 ties (`08.png`). Jordan read all three
  places the key names (chip, Filters row, Overview) and gave the edge count as well.
- **Back (right).** Unticked "Apply step: weight is at least 4" (`09.png`): chip gone, row "off",
  20 nodes and 41 edges.
- **Follow-up at 5 or more (right).** Jordan opened the step's row (editor header "weight is at
  least 4", "Filter step Off", button "Save and turn on", `10.png`), replaced the value with 5 and
  pressed "Save and turn on" (`11.png`): 10 of 20, 5 of 41.
- **The trap (not fallen into).** After "Save and turn on" Jordan did not tick the checkbox to
  switch the step on. The one click on the checkbox after the save (`12.png`) was meant to bring
  the club back, and it did. Not `read-wrong`.
- **Dot count.** Jordan said "I can count 10 people by eye" at 5 or more. In `11.png` the pair at
  about 717,745 / 735,744 overlaps heavily (the key's known overlap), so an honest dot count would
  likely come out 9; the stated answer came from the chip, the row and the Overview, which agree,
  and the number stated is right. Grade unchanged.

## Measures

- **Steps:** 11 `real.mjs` steps after the start (`02.png` to `12.png`); 9 that did something,
  since steps producing `05.png` and `06.png` (byte for byte the same as `04.png`) were refused by
  the tool as ambiguous and changed nothing. Main task 6 effective steps (Data, Filters "+",
  Attribute, the "weight" option, Value / 4 / Add step, untick); follow-up 3 (open the row, Value
  / 5 / Save and turn on, untick). This is the key's other door (Filters "+"), which graders accept,
  and it matches the success path's length.
- **Wrong turns:** 0. Every move went forward; the two refused clicks were the tool asking which
  "weight" was meant (problem 1), not a wrong place.
- **False "done":** none. Both "done" claims are true on screen: the counts were on screen when
  given (`08.png`, `11.png`) and the whole club is on screen at the end (`12.png`).
  truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. "Add step" and "Save and turn on" each narrowed the drawing at once
  and put the chip and the row's count on screen.
- **Numbers that disagree:** none. Chip, row and Overview agree at 4 and at 5.
- **Broken habit:** none. Jordan's history does not name filtering; the first place he looked
  (the Data tab) held it.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot, the tool named the
  ambiguous match it refused, and leaks.json shows no leaks.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind               | Problem                                                                                                                                                                                                                                    | Evidence                                                                                                         |
| --- | -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 1   | 1        | accessibility-name | With the Attribute list open, the list's "weight" option and the left tree's "weight" row share one accessible name; a click by name was refused twice and nothing happened until the option was named by role. Cost two steps.            | `05.png`, `06.png` identical to `04.png`; transcript step 4                                                     |
| 2   | 2        | comprehension      | At 4 or more only one person drops out while 29 of 41 ties go; nothing on screen names who left (Theo), so Jordan had to cross-check three counts before trusting it and still wanted to know which person it was.                         | `08.png`; transcript, "In my own words": "I would still have liked to know which person dropped out"             |
| 3   | 1        | discoverability    | Filtering lives only under the Data tab's Filters row; Jordan guessed it there because "Filters" was the only word that fit, not from anything in the Graph tab or the toolbar.                                                             | `02.png`; transcript, "In my own words"                                                                          |
| 4   | 1        | capability         | Under a filter, node sizes and colors stay the whole graph's PageRank ("PageRank, full graph" in the key). The label explained it, but Jordan saw no way to rank just the filtered club for his flyer.                                       | `08.png`, `11.png` key titles; transcript, "In my own words"                                                     |
| 5   | 1        | legibility         | At 5 or more two of the 10 people overlap almost completely (about 717,745 / 735,744), so a count by eye comes out one short; Jordan's "I can count 10 by eye" leaned on the chip.                                                          | `11.png`                                                                                                         |
| 6   | 0        | visual-state       | After the untick the Filters row keeps its gray background though its editor is closed (the key's known note); turning a step off keeps it as an "off" step and removing it means looking for another control. Jordan did not need either. | `09.png`, `12.png`; transcript, "In my own words"                                                                |

No severity 3 or 4: both answers were right, the club came back both times, and no number on
screen disagreed with another.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
