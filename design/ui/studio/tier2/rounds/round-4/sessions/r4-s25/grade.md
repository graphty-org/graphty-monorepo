# Grade: session r4-s25 -- Alex (regular analyst), running club (T17 A), only the strong ties

**Grade: S** (success), task and follow-up both. At 4 or more runs together Alex answered "19
people still in it (12 pairs)", the key's value; at 5 or more (the follow-up) "10 people (5
pairs)", the key's value. Both times the whole club was brought back. The last screen (`09.png`)
shows all 20 nodes and 41 edges drawn, no count chip in the top bar, the Filters row "weight is at
least 5" over "off" with its checkbox clear, the legend titles plain "Size: PageRank" and "Color:
PageRank", and the Overview reading Nodes 20, Edges 41. `work.json` agrees: the run and the three
layers are unchanged from the start, and the one step is kept, switched off (`step-1 off`, weight
at least 5).

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (friends.csv loaded, PageRank run, nodes
sized and colored by PageRank). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **At 4 or more (right).** `05.png`: top bar "19 of 20 nodes, 12 of 41 edges"; the Filters row
  "weight is at least 4" over "20 to 19 nodes, 41 to 12 edges", ticked; the Overview "Nodes
  showing 19 of 20", "Edges showing 12 of 41". Alex reported nodes as people and edges as pairs,
  so the `read-wrong` case (12 reported as people, or 41 as the club) did not occur.
- **Back (right).** `06.png`: the step unticked ("Apply step: weight is at least 4"), 20 nodes and
  41 edges drawn, the row's second line "off", the chip gone.
- **At 5 or more (right).** Alex clicked the existing row to edit it (`07.png`: header "weight is
  at least 4", "Filter step Off", button "Save and turn on"), replaced 4 with 5 and pressed "Save
  and turn on". `08.png`: chip "10 of 20 nodes, 5 of 41 edges", row "20 to 10 nodes, 41 to 5
  edges", ticked, Overview "Nodes showing 10 of 20", "Edges showing 5 of 41".
- **The "tick after save" trap (avoided).** After saving, Alex read the screen, saw the step was
  already on and ticked it only once, to bring everyone back (`09.png`). This is the key's
  follow-up success path exactly.
- **Work kept.** `work.json`: runs and layers identical at start and end; notes none; one step
  added and left off; source friends.csv. Nothing gone.

## Measures

- **Door used:** the canvas toolbar's Filters tool (`--click-at 833,863`, reported as button
  "Filters"), which opened "New filter step" on the right and the Data panel on the left
  (`02.png`). The key lists the Filters door as valid; the attribute-row route was not used.
- **Steps:** 5 `real.mjs` steps for the task (`02.png` to `06.png`) and 3 for the follow-up
  (`07.png` to `09.png`). The key's success path is about the same length (Data, weight, actions,
  Filter to, value, Add step, untick; then row, value, save, untick).
- **Wrong turns:** 0.
- **False "done":** none. Every claim ("19 people, 12 pairs", "whole club back", "10 people, 5
  pairs", "whole club is back") is true on the screen it was made from. truth-on-screen: holds.
- **Silent commit:** none. Add step, untick, Save and turn on, and the second untick each changed
  the drawing, the chip and the row's second line.
- **Numbers that disagree:** none. Chip, row and Overview agree at both thresholds, and Alex's own
  count of dots matched.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the tool reported what
  each pointer action hit, and `leaks.json` shows no leaks over 23 calls.
- **Scripted exit:** not applicable; Alex finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                         | Evidence                                                                                                       |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 1        | discoverability | The canvas toolbar's Filters tool is an unlabeled three-line icon; its name appears only on hover. Alex guessed it was a filter and guessed right, at no cost here.                                                               | `01.png` (toolbar, icon at 833,863, no label); transcript step 1: "a funnel-ish icon, which I guess is filter" |
| 2   | 1        | wording         | While the step is on, the legend titles read "PageRank, full graph" and keep the whole graph's range. Alex had to work out that the sizes were not recalculated for the smaller drawing; nothing on screen says it directly.        | `05.png`, `08.png` (legend "Size: PageRank, full graph", 0.03779 to 0.06394); transcript wrap-up               |
| 3   | 1        | visual          | Two pairs of nodes overlap at the bottom of the drawing, which made checking the count by eye fiddly. Alex relied on the chip and the Overview, so the answer was not affected.                                                    | `05.png`, `08.png`, `09.png` (overlapping spheres near 570,755 and 730,745); transcript wrap-up                |

All three rest on one participant and are not confirmed by this session alone.
