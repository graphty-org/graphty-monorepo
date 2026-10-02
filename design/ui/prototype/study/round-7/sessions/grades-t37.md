# Grades: show one coloring on its own, then hide three characters without changing the counts

The task: "Look at just one of the coloring results on its own for a moment. Then take three
characters out of sight while every count still includes them, and check that the numbers really
did not change. The data on screen is a sample: characters of the novel Les Miserables, linked
when they appear in the same chapter."

The intended path: Alt-click (or Alt+Space on) a row's eye in the Graph list to show that row
alone ("solo"); select the characters and choose Hide on canvas in the bar over the canvas; then
open the graph's own panel on the right, which still reports 77 nodes and 254 edges.

Grading rule: success means one row was shown alone, the characters were hidden on the canvas, and
a count was read that still includes them. Success with difficulty means the same end was reached
after a wrong turn, a long search or help from a tooltip (for example switching the other eyes off
one by one instead of the solo, or opening Filters before choosing Hide). Failure means ending
somewhere else, or filtering the characters out and believing the counts still include them.
Grades go by what was on screen and what the participant concluded about the program, not by
how they rated themselves.

## Read this first: the hide half of the task cannot be completed in the prototype

The prototype has one canned "hidden" screen, and in it the hidden character is always Valjean.
Whatever is selected -- Javert, Thenardier, Gavroche, Fantine, or the top three by PageRank -- Hide
on canvas (button or Ctrl+Shift+H) hides Valjean and only Valjean. Selecting anyone afterwards
brings him back. The intended path's own renders show the same thing: its third screen hides
Valjean alone (shots/tasks/t37/03.png), and its last screen shows Valjean drawn again with the
hidden line replaced by "1 hidden row still paints" (shots/tasks/t37/04.png). So the task asks for
three characters and the prototype can produce one, and not the one asked for.

All three participants hit this and all three graded themselves as failing because of it. That
self-verdict is accurate about the prototype, but it is not evidence about the design: what the
design proposes (Hide on canvas acting on the current selection, counts left on the full graph)
was never actually offered to them. I graded the hide half against what the prototype can show,
which is the intended path's own end state: a node hidden on the canvas and a count read that
still includes it. The findings marked "prototype" below must be fixed and this task rerun before
any conclusion about hiding is drawn from it.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Gephi user | failure | success with difficulty | Solo: looked in the row menu first (no "Show only this" there), then found Alt-click only by hovering the eye; soloed PageRank (05.png). Hide: one node hidden on the canvas, the table still read 77 nodes and Valjean 36 / 0.0754 / 0.570 under "(full graph)" headers, and the list said "1 node hidden on canvas" (16.png). Concluded correctly that hiding leaves the counts alone. Wrong turns: the row menu, three hide attempts on characters the prototype ignored, Select top N. |
| Marketing analyst | failure | success with difficulty | Solo found only through the eye's tooltip (03.png), applied to PageRank (04.png). Reached the hidden state with the table at 77 nodes and Valjean unchanged (10.png), and on the way found the Data page sentence "Filters change what is computed; the eye in the Graph tree only hides", which he called "the sentence I needed". His last screen (16.png) is elsewhere -- a shortest-path row selected, nothing hidden -- because he kept looking for a way to hide the other two characters, which the prototype does not offer. His conclusion about the counts is correct, so the wandering ending is graded as difficulty, not failure. |
| Computational biologist | failure | success with difficulty | Solo: row menu first, then the eye's tooltip; tried Louvain (clicking its name opened the Louvain table instead of selecting the row), then soloed PageRank (05.png). Wrote down a baseline before hiding, hid one node, then confirmed 77 nodes, Valjean 36 / 0.0754, Group 2 = 14, Group 8 = 13 unchanged (19.png). Concluded correctly that hiding does not move the numbers and that "(full graph)" on the headers is how she would know. |

Totals: 0 success, 3 success with difficulty, 0 failure, 0 gave up. All three self-reported
failure, for the reason above. Ease scores: 2, 2, 2 out of 7 -- the lowest of the round, and
driven almost entirely by the wrong-node hide.

Nobody filtered the characters out, so the failure the task was built to catch (filtering and
believing the counts still include them) did not occur. Nobody opened the graph's own panel to
read the count: all three checked the Node table instead, which carries the same 77 and labels
every statistic "(full graph)". The table is a valid place to check; the graph panel's count went
untested.

## Findings

1. **Hide on canvas acts on Valjean, not on the selection (3 of 3; prototype).** Every
   participant selected someone else and got "Valjean hidden on canvas". All three named it as the
   reason they would not trust the program ("the kind of silent wrong-node error I can't defend
   to a reviewer"). Severity 4 if it were the design; here it is a prototype gap -- the hide is a
   single canned screen. The prototype needs Hide to act on whatever is selected before this task
   can measure anything about hiding.
2. **No way to select more than one character from the table or canvas (3 of 3; partly
   prototype).** Each click replaced the selection. All three expected Ctrl- or Shift-click
   ("Gephi lets me ctrl-click", "in Excel I'd ctrl-click"). Nothing on screen says how to add to a
   selection. Severity 3: even with a working hide, three characters cannot be gathered. Whether
   the design intends Ctrl/Shift-click and the prototype simply lacks it, or the design has no
   multi-select from the table, should be settled in the spec; either way, show how to add to a
   selection.
3. **A hide is undone by the next selection (3 of 3; prototype).** Selecting anyone after a hide
   brought Valjean back and replaced "1 node hidden on canvas" with "1 hidden row still paints".
   The intended path's last screen shows the same. Severity 3 if real: hidden must stay hidden
   until Show or Undo.
4. **"Show only this row" exists only as Alt-click / Alt+Space in the eye's tooltip (3 of 3).** Two
   of three looked in the row menu first and did not find it there; all three found the solo only
   by hovering the eye. The marketing analyst pointed out that a plain click on the same eye hides
   the very row he wanted to see. Severity 3. A "Show only this" entry in the row menu would cover
   the people who look there first; the modifier can stay for those who know it.
5. **Soloing a row that already covers everything gives no visible confirmation (3 of 3).** All
   three soloed PageRank, which was already on top, so the canvas did not change; the only sign
   was the other rows going pale. "Is this solo? Nothing tells me in words." Severity 2. A plain
   status ("Showing only PageRank -- Show all") in the list or legend would answer it. Choosing a
   start where the soloed row is not already on top would also make the task test what it means
   to test.
6. **Opening the table silently ended the solo (2 of 2 who opened the table while soloed: Gephi
   user, marketing analyst; prototype-likely).** Severity 2. Probably the prototype resetting state
   per screen, but the spec should say whether solo survives opening the table.
7. **Select top N ignored a typed 3 and selected 5 (2 of 2 who tried it: Gephi user, biologist;
   prototype), and the selected nodes were not ringed on the canvas.** The biologist got 3 in by
   selecting the field's text first. Severity 2.
8. **A row's "More actions" opened the menu for a different row (1 of 3: marketing analyst;
   prototype-likely).** From the selected "Myriel to Javert" row, the menu that opened belonged to
   Louvain's "Community 3". Single voice; check before acting.
9. **The difference between hiding and filtering is stated only on the Data page under Filters
   (1 of 3: marketing analyst found it and called it the most useful sentence in the session).**
   Severity 1. Worth repeating near Hide on canvas (for example in its tooltip).

## What worked (3 of 3 unless noted)

- "(full graph)" on every statistic column header. All three named it as exactly the reassurance
  they wanted, and all three used it to confirm the counts held.
- The wording "Hide on canvas" (as opposed to "filter"), and "1 node hidden on canvas. Select,
  Show" in the list.
- Undo on the hide toast (2 of 3).

## What this task still needs before it can be read as evidence

- Hide on canvas must act on the current selection, keep the node hidden across later
  selections, and support hiding several at once; the selection needs a visible way to add to it.
- The intended path should end on a screen where three named characters are hidden and the graph
  panel still says 77.
- Start the solo step from a row that is not already the top color, so the solo visibly changes
  the canvas.
