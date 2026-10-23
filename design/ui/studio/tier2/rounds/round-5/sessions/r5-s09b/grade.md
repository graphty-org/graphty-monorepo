# Grade: session r5-s09b -- Ruth (tier 1 graduate), running club (T17 A), only the strong ties

**Grade: S** (success), on both the task and its follow-up. The last screen (`11.png`) is the
whole club back: no chip in the top bar, the Overview reads Nodes 20, Edges 41 with no "showing"
rows, the drawing holds all 20 dots and their ties, and the Filters row reads "weight is at least
5" over "off" with its box unticked. Ruth's two answers match the key: 19 people at 4 or more runs
together (12 ties), 10 people at 5 or more (5 ties).

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of
the criteria, at 1440 x 900, no uncommitted changes. Start: friends.csv loaded, PageRank run,
nodes sized and colored by PageRank (`01.png`). This session re-runs r5-s09, which was void
because the round's gate had not passed.

## The answers against the key

- **Narrowed at 4 or more (right).** `06.png`: chip "19 of 20 nodes, 12 of 41 edges"; Filters row
  "weight is at least 4" over "20 to 19 nodes, 41 to 12 edges", ticked; Overview "Nodes showing 19
  of 20", "Edges showing 12 of 41". Ruth said "19 people still in it (12 pairs at 4+ runs)", read
  from those three places, and checked them against a dot count. Not `read-wrong`: she did not give
  12 or 20 as the people left.
- **Back (right).** `07.png`: the step unticked, row "off", Overview 20 / 41, chip gone.
- **Follow-up at 5 or more (right).** `10.png`: chip "10 of 20 nodes, 5 of 41 edges", row "20 to
  10 nodes, 41 to 5 edges", ticked; Overview "Nodes showing 10 of 20", "Edges showing 5 of 41".
  Ruth answered 10. She edited the existing step (click the row, Control+a, 5, "Save and turn
  on") and read the counts with the box already ticked; she did not fall into the key's trap of
  ticking the box again after "Save and turn on".
- **Back again (right).** `11.png`, as above.
- **Work kept.** `work.json`: the run, the three style layers and the source are unchanged; the
  only difference is the filter step she made, kept and left off (`step-1 off
  {"kind":"range","attribute":"data.weight","min":5,"nodes":"ends"}`). Nothing gone.

## Measures

- **Route:** the bottom toolbar's Filters button (not the Data page's attribute row the key's
  success path starts from), Attribute -> Edges -> weight, "at least" already chosen, Value 4, Add
  step; back by unticking. Follow-up by reopening the step from its row. The key grades routes by
  end state; this one is direct.
- **Steps:** 6 to the first answer and back (filter button, Attribute, weight, Value, Add step,
  untick), 4 for the follow-up and back (row, Value, Save and turn on, untick). The key's success
  path is the same length.
- **Wrong turns:** 0.
- **False "done":** none. "19 of the 20 people ... 10 of 20 ... both times I brought the whole club
  back (20 people, 41 pairs)" is true on `06.png`, `10.png`, `07.png` and `11.png`.
  truth-on-screen holds.
- **Silent commit:** none. Each action showed its effect at once (chip, row, Overview, drawing).
- **Numbers that disagree:** none. Chip, row and Overview agree on every screen.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Eleven screenshots for eleven steps; `leaks.json` shows no
  leaks over 26 calls.
- **Scripted exit:** not applicable; Ruth finished both requests.

## Problems

| #   | Severity | Kind     | Problem | Evidence |
| --- | -------- | -------- | ------- | -------- |
| 1   | 2        | trust    | Overlapping dots make the counts impossible to check against the drawing: at 4 or more two pairs sit almost on top of each other (around 567/583 and 715/735), and at 5 or more one of the five ties is hidden between the overlapping pair at the bottom. Ruth's own count only matched by assuming two dots each, and she could not see the fifth tie. The key already records this overlap on this file. | `06.png`, `10.png` (pair near 715-735, 740); transcript steps 06 and 10, "What confused me" first item |
| 2   | 1        | language | The task asks "how many people"; every count on screen says "nodes" and "edges". Ruth translated without trouble, but named it as the program's word, not hers. | `06.png`, `10.png` chip and Overview; transcript "What confused me" second item |
| 3   | 1        | missing feature | Nothing on screen names who dropped out (at 4 or more, the one person left out, Theo per the key). For a story she would want the name; the counts alone do not give it. Did not affect the task. | `06.png` (counts only); transcript "What confused me" third item |
| 4   | 1        | clarity  | Under the filter the drawing's key titles change to "Size: PageRank, full graph" and "Color: PageRank, full graph". Ruth read it correctly (the sizes still describe all 20), but nothing tells her whether that is what she wants or how to rank only those left. Did not affect the task. | `06.png`, `10.png` key titles; transcript step 06 and "What confused me" fourth item |

Problem 1 is a build fact the key records for this file (overlapping pairs on T17 A), so with this
participant it counts as confirmed. The others are single reports at severity 1.

Simulated participant: Ruth's history names no filter use, so this was her first filter; a real
returning user may be slower. Keyboard and screen-reader access are untested by sessions in tier 2.
