# Grade: session r3-s38 -- Dev (tier 1 graduate, returning student), Les Miserables (T17 B), only the strong ties

**Grade: S** (success), on the prompt and on the follow-up. At 5 or more shared chapters Dev
narrowed the drawing with a filter step "shared_chapters is at least 5" and gave 26 of the 77
characters (51 of the 254 ties), read from the chip "26 of 77 nodes"; the same screen shows the
Filters row "77 to 26 nodes" with its checkbox ticked and the Overview "Nodes showing 26 of 77",
"Edges showing 51 of 254" (`10.png`). He brought everyone back by unticking the step (`12.png`:
row "off", no chip, key titles back to plain "Size: PageRank" / "Color: PageRank"). For the
follow-up he opened the step's row, changed 5 to 8, pressed "Save and turn on" and gave 17 of 77
(19 ties), matching the chip "17 of 77 nodes", the row "77 to 17 nodes" and the Overview
"Nodes showing 17 of 77", "Edges showing 19 of 254" (`15.png`). He then unticked once. The last
screen (`16.png`) shows every character back: no chip, the row "shared_chapters is at least 8"
over "off" with its checkbox empty, the Overview "Nodes 77", "Edges 254", and the full drawing.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `lesmis-ranked.txt` (Les Miserables ranked by PageRank,
sized and colored by it). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **Prompt, 5 or more (right).** 26 characters, 51 ties, the key's values (`10.png`).
- **Follow-up, 8 or more (right).** 17 characters, 19 ties, the key's values (`15.png`).
- **Everyone back (right, both times).** One untick each time (`12.png`, `16.png`). `work.json`
  agrees at the end: one step, `step-1 off`, rule `shared_chapters` min 8 on edges' ends; the run
  and the three style layers unchanged from the start; nothing gone.
- **The follow-up trap (avoided).** After "Save and turn on" Dev did not tick the box to switch
  the step on; he read the chip and ticked only to bring everyone back, the success path.
- **Not a wrong answer.** No 77 given as "still in it" (`read-wrong`); not `wrong-attribute`;
  no selection used in place of a filter; no count stated before the drawing changed.
- **The key's range.** Dev read "PageRank, full graph" as "the sizes still come from the whole
  book" (transcript step 10) -- the run's ranking, not what is drawn. He did not rerun PageRank
  and did not read the range as a count. Recorded per the key; no problem.

## Measures

- **Steps:** 15 `real.mjs` steps after the start (`02.png` to `16.png`), plus two `--end` calls.
  Two steps (`06.png`, `07.png`, byte for byte the same as `05.png`) were refused by the tool for
  an ambiguous name and changed nothing, so 13 did something. Of those, the hover on the toolbar
  (`02.png`) and the Edge table (`11.png`) were off the path; the rest is the key's "Add filter
  step" door (Filters "+", Attribute, `shared_chapters`, at least, 5, Add step) and its follow-up
  path.
- **Wrong turns:** 1. Step 2 hovered the toolbar's Layout button looking for a filter (`02.png`),
  then went to the Data tab. Opening the Edge table (step 11) was a check of his result, not a
  wrong place; it did cost a moment of doubt (problem 1).
- **False "done":** none. Every "done" (steps 12, 16, 17 and the wrap-up) matches the screen.
  truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. "Add step" and "Save and turn on" both narrowed the drawing at once
  and updated the chip, the row and the Overview.
- **Numbers that disagree:** one surface does not follow the filter: the Edge table still says
  "254 edges" and lists filtered-out rows (Napoleon-Myriel 1) with no mark while the chip says 26
  of 77 (problem 1). The chip, the row and the Overview all agree with each other and the key.
- **Re-ran PageRank:** no.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; the two refusals were
  the tool naming an ambiguous match, which changed nothing on screen, not a tool fault;
  leaks.json shows no leaks.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind               | Problem                                                                                                                                                                                                                                                                                       | Evidence                                                                                       |
| --- | -------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | 2        | feedback           | While a filter step is on, the Edge table still reads "254 edges, In the order loaded" and lists every row, including ties the step hides (Napoleon-Myriel 1), with nothing marking which rows are left out. Dev briefly thought the filter had not worked and fell back on the chip. A reader who trusts the table could report 254. | `11.png` (chip "26 of 77 nodes" beside a table of 254 with the row of 1 first); transcript step 11 and wrap-up, second item |
| 2   | 1        | discoverability    | Filtering is not reachable from the canvas toolbar, where Dev ran the ranking before; he hovered a toolbar button (Layout) before thinking of the Data tab.                                                                                                                                    | `02.png`; transcript step 2 and wrap-up, first item                                            |
| 3   | 1        | accessibility-name | In the step editor's Attribute list, the option "shared_chapters" shares its accessible name with the attribute row in the left Attributes tree; the tool refused the click twice. Cost two steps.                                                                                            | `06.png`, `07.png` (both unchanged from `05.png`); transcript steps 6 and 7                    |
| 4   | 1        | feedback           | The New filter step editor shows no count of what the step would keep before "Add step" (the key's known note); Dev had to commit the step to learn 26.                                                                                                                                         | `09.png`; transcript steps 9 and 10                                                            |

No severity 3 or 4: both answers were right, every character came back both times, and Dev did
not act on the table's 254. Problem 1 stays at 2 because the participant noticed and recovered on
his own; a participant who read the table instead of the chip would make it a wrong result.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
