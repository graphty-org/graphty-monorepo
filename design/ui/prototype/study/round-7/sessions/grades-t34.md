# Grades: why Valjean looks the way he does, and a ranking that changes nothing

The task: "Valjean is drawn dark brown and large. Work out what makes him dark and large. Then a
ranking you made earlier seems to change nothing when you switch it on -- work out what is going
on." The data is the Les Miserables co-appearance sample. Valjean is colored by a PageRank row and
sized by a Degree row that has been hidden from the list but still paints. A Betweenness row lower
in the list also paints Color, so PageRank covers it on every node.

The intended path: click Valjean and read "Why this look" on the right (PageRank gives Color,
Degree gives Size); use "Show hidden rows" under the list so the hidden Degree row appears dimmed;
then open the Betweenness row, whose Style tab reads "Paints 77 nodes, none visible: PageRank
covers their Color" and "Covered for Color by PageRank".

Grading rule: success means "Why this look" named the rows behind his color and size, the hidden
row was revealed, and the Betweenness Style tab's covered line was on screen. Success with
difficulty means the first half came from the legend alone, or the covered line was reached only
after reordering rows or another wrong turn. Failure means the participant ended somewhere else or
concluded that the second ranking is broken. Gave up means they stopped short of the end screen
without a wrong conclusion. Grades go by what was on screen at the end and what they concluded,
not by how they rated themselves.

## The end screen cannot be reached by clicking

Before the grades, one fact that decides how to read them. Clicking the Betweenness row in the
list highlights the row but leaves PageRank's panel on the right. This happens from the start
screen, after switching Betweenness on, and after "Show hidden rows" (checked again for this
grading: tmp/grade-t34/a.png). The covered Betweenness panel exists as a page of its own, but no
click in the list leads to it. All three participants tried exactly that click, two or three times
each, which is the move the task intends. So nobody could have finished the second half, and the
three non-finishes below are evidence about the prototype's wiring, not about the design of the
covered line, which no participant ever saw.

Two more things participants met are also prototype limits rather than design: the canvas and the
legend never change when an eye is toggled (hiding PageRank left everything orange and the legend
still said "Color: PageRank"), and the Betweenness eye showed crossed out again after a later click
on a node, because each click-through step reloads a fixed page that does not carry the earlier
switch. All three read these as the product misbehaving, and two said that is where they would
stop trusting it.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Gephi holdout | failure | gave up | First half done properly: clicked Valjean, read "Why this look" (PageRank for Color, Degree for Size), then clicked Degree there, which brought the hidden Degree row into the list dimmed (03.png) -- the same screen "Show hidden rows" gives. Second half: clicked Betweenness twice and got PageRank's panel both times (04, 07), switched it on, then ran her own control test with PageRank hidden (09) and saw no change. Ended on the table (10.png). Concluded "my best guess is that PageRank covers it ... a guess, not a finding" -- the right answer, unconfirmed. She did conclude the eye toggles do not touch the canvas, but not that the Betweenness ranking is broken, so this is not a failure. |
| Genomics Cytoscape user | success with difficulty | gave up | Same first half, same Degree click (03.png). Clicked Betweenness twice with no panel change (04, 07), looked for a way to reorder in the row menu and found none (12), and a menu item, "Compare with another row", dropped her into an unrelated transfers dataset (13). Ended on the table (14.png). Concluded the right theory but "could not confirm it" and said "I'd give up here." She never saw the covered line, so the second half was not reached. |
| Marketing analyst | success with difficulty | gave up | Same first half, same Degree click (02.png). Clicked Betweenness and got PageRank's panel (03, 06), hid PageRank to test and saw no change (08), hovered the row for any hint and got none (09). Ended there. Reasoned the right answer from the "Covers Louvain for Color" line on PageRank's panel, "That's me reasoning it out, the screen never says it", and stopped. |

Totals: 0 success, 0 success with difficulty, 0 failure, 3 gave up. All three gave-ups are caused
by the unreachable Betweenness panel, not counted as evidence against the covered-line design.
Ease scores: 3, 3 and 4 out of 7; all three rated the first half about 6 and the second about 2.

First half on its own: 3 of 3 answered it through "Why this look", not the legend, and 3 of 3
found the hidden Degree row by clicking it in that list rather than through "Show hidden rows",
which none of them used. Second half: 3 of 3 arrived at the correct theory (PageRank sits higher
and also paints Color, so it covers Betweenness) by analogy with "Covers Louvain for Color" on
PageRank's panel, and 0 of 3 had it confirmed by the screen.

## Findings

1. **The Betweenness row does not open its own panel (3 of 3).** Clicking a row in the list must
   open that row in the right panel; here it leaves PageRank there. This blocked every participant
   from the one screen that answers the second half. Severity 4 (catastrophe) for the round,
   because it makes the task impossible; it is a wiring gap in the skeleton and needs fixing before
   this task is run again, or its result means nothing.
2. **"Why this look" lists only the rows that won (3 of 3 asked for the loser).** After switching
   Betweenness on, all three went back to Valjean expecting to see "Betweenness -- Color (covered by
   PageRank)" and found it absent. Two said that one line would have ended the task "in two
   seconds". This is a design finding the prototype fidelity does not explain: the node's own
   explanation is where people look for covering, before they look at the row. Severity 3 (major).
3. **PageRank's panel names the row it covers, but not Betweenness (3 of 3 noticed).** It reads
   "Covers Louvain for Color" while Betweenness, also switched on and also painting Color, is
   below it. Participants took the missing name as evidence their theory was wrong. If the line
   lists only some covered rows it must say why, or list them all. Severity 3.
4. **"Hidden" means two things (3 of 3).** "1 hidden row still paints" was read as a contradiction
   or a bug at first sight by all three; each settled on "hidden from the list, not switched off"
   only after clicking Degree. The Gephi user and the genomics user both said a mapping that
   paints while out of sight is the kind of silent default they distrust in a figure. Severity 3:
   the same word covers the eye (switched off) and the list (out of sight), and the task depends
   on telling them apart.
5. **No way to change row order from a row (1 of 3 looked).** Once she believed order
   decides who wins, the genomics user looked for "move up" or "move down" in the row menu; there is none and
   nothing says rows can be dragged. Severity 2 (minor) for this task, since reordering is not on
   the intended path, but it is the obvious test of the theory.
6. **"Compare with another row" leaves the dataset (1 of 3).** It opened a different sample
   (account transfers, March vs April) with no warning; the genomics user named it as one of three
   reasons she would close the tool. Single voice, but the jump is real on screen. Severity 2.
7. **"Why this look" itself was praised (3 of 3).** All three called it better than anything in
   Gephi or Cytoscape, and it answered the first half on the first click for everyone.

## What to do before running this task again

Wire the Betweenness row (and any row) so a click opens its own panel, and let an eye toggle and a
hide carry into the next page, then rerun all three participants. Until then this task has no
valid measure of whether the covered line is found or understood.
