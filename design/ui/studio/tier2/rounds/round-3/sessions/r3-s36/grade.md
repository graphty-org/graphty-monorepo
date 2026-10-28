# Grade: session r3-s36 -- Alex (returning analyst), Les Miserables (T17 B), only the strong ties

**Grade: S** (success). Both answers are right and every character is back on the last screen.
At 5 or more shared chapters Alex reported 26 characters (51 ties); the screen read the header
chip "26 of 77 nodes", the Filters row "shared_chapters is at least 5" over "77 to 26 nodes" with
its checkbox ticked, and the Overview "Nodes showing 26 of 77", "Edges showing 51 of 254"
(`07.png`), which is the key's answer. In the follow-up, at 8 or more, Alex reported 17
characters (19 ties); the screen read the chip "17 of 77 nodes", the row "shared_chapters is at
least 8" over "77 to 17 nodes" with the checkbox ticked, and "Nodes showing 17 of 77", "Edges
showing 19 of 254" (`11.png`), again the key's answer. The last screen (`12.png`) shows the whole
network: no chip in the header, the row "shared_chapters is at least 8" over "off" with the
checkbox clear, the Overview "Nodes 77", "Edges 254", the legend titles back to plain "Size:
PageRank" / "Color: PageRank", and the full drawing. `work.json` agrees: one step, `step-1 off`,
the range rule on `data.shared_chapters` with min 8; the PageRank run and its Influence layer are
unchanged, nothing gone.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: Les Miserables sample, PageRank run and drawn by size and color
(setup `lesmis-ranked.txt`). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **At 5 or more (right).** 26 of 77 characters, 51 of 254 ties (`07.png`). Alex read all three
  places the key names (chip, Filters row, Overview) and gave the edge count too. He did not give
  77 from the "Full graph" section below the "showing" rows.
- **Back (right).** Unticked "Apply step: shared_chapters is at least 5" (`08.png`): chip gone,
  row "off", 77 nodes and 254 edges.
- **Follow-up at 8 or more (right).** Alex opened the step's row (editor "Filter step Off", Value
  5, button "Save and turn on", `09.png`), replaced the value with 8 (`10.png`) and pressed "Save
  and turn on" (`11.png`): 17 of 77, 19 of 254.
- **The trap (not fallen into).** After "Save and turn on" Alex did not tick the checkbox to
  switch the step on. The one click on the checkbox after the save (`12.png`) was meant to bring
  everyone back, and it did. Not `read-wrong`.
- **"Full graph" legend.** Alex read "PageRank, full graph" as "the sizes are from the whole
  network" (transcript step 07), which is the right reading; he did not rerun PageRank and did
  not read the range as a count.

## Measures

- **Steps:** 11 `real.mjs` steps after the start (`02.png` to `12.png`), all effective. Main task
  7 (Data, Filters "+", Attribute, the "shared_chapters" option, Value / 5, Add step, untick);
  follow-up 3 (open the row, Value / 8, Save and turn on) plus the untick. This is the key's other
  door (Filters "+"), which graders accept, and it matches the success path's length.
- **Wrong turns:** 0. Every step went forward. The wrap-up says "I went looking under the Graph
  tab first", but no step clicked the Graph tab: the first move was Data (`02.png`). Recorded as
  a hesitation he reports, not a wrong turn.
- **False "done":** none. Both "done" claims are true on screen: the counts were on screen when
  given (`07.png`, `11.png`) and the whole network is on screen at the end (`12.png`).
  truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. "Add step" and "Save and turn on" each narrowed the drawing at once
  and put the chip and the row's count on screen.
- **Numbers that disagree:** none. Chip, row and Overview agree at 5 and at 8.
- **Broken habit:** none. Alex's history names Gephi's filter-by-weight habit; the Filters row on
  the Data tab held the same operation.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot and leaks.json shows no
  leaks.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                       | Evidence                                                                 |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | 1        | discoverability | Filtering lives only under the Data tab's Filters row; Alex says he would have looked under the Graph tab and found it only because the edge column was listed on the Data page.                               | `02.png`; transcript, wrap-up "What confused or slowed me", first item   |
| 2   | 1        | labeling        | The "+" beside Filters has no visible label; its name ("Add filter step") appears only on hover, so Alex inferred it from its position on the Filters row.                                                    | `02.png`, `03.png`; transcript wrap-up, second item                      |
| 3   | 1        | feedback        | The New filter step editor shows no count of what the step would keep before "Add step" (the key's known note); Alex had to commit to see 26 and says he would want a preview on a large graph.               | `06.png`; transcript step 06 and wrap-up, third item                     |
| 4   | 0        | efficiency      | Changing the value of a saved step means select-all and retype in the Value box; Alex called it "a little fiddly, fine".                                                                                    | `10.png`; transcript wrap-up, fourth item                                |
| 5   | 0        | trust           | After the untick the step stays listed as "off"; Alex liked that, but nothing on screen says whether an off step is kept when the project is saved, which matters to his monthly rerun.                      | `08.png`, `12.png`; transcript wrap-up, last item                        |

No severity 3 or 4: both answers were right, everyone came back both times, and no number on
screen disagreed with another.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
