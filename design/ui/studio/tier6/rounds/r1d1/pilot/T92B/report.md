# Pilot: T92 B, two facts about the yeast genes (targeted re-pilot)

Build 3549e11129, served from .study-builds/tier6-r1d1-3549e11129, start `setup:connected-yeast.txt`.
Screenshots stay out of git, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T92B/ (each path below is
relative to that folder).

Result: the task can be finished. Fact 1 came back as YMR043W on every walk and fact 2 as 7 with the
right seven genes. Every session held 331 nodes and 361 edges at its end, its key check was clean, and
no step printed a script error or a failed request. One problem remains on the routes the fixes
touched: when fact 1's reply leaves a selection on, the first answer to fact 2 is not a count, and it
carries no chip. The reader gets the 7 only by asking again.

## Routes walked

| Folder     | Route                                                                            | Outcome                                                     |
| ---------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| success    | Pointer: Assistant, fact 1, steps, Open run, Values, fact 2, chip, table, sort   | Reached; YMR043W and 7, with chip and Show in table         |
| touched-31 | Success path, fact 2, with the selection fact 1 left on                          | No count on first asking; 7 and the chip on asking again    |
| touched-32 | Starter, "Select those five.", fact 2 with Selection 5 on, then the scope x      | "None of the 5 selected", honest; 7 with the x and a retry  |
| touched-6  | No Assistant: Find with a rule, right-click, Analyze, Quick actions, a question  | Find selects the 7; every step up to the question unchanged |

## Pointer success path

1. Assistant, then fact 1. "Most of the connections between other genes pass through YMR043W", with
   "Computed Bridges for 331 nodes", Open run and Undo. This run did not repaint and selected nothing,
   so the scope stayed Whole graph (success/03.png).
2. 2 steps opens Bridges and Query data (success/04.png). Open run lands on an empty Style tab
   (success/05.png); Values shows Top 10, YMR043W 16,124 then YGL035C 12,500 (success/06.png).
3. Fact 2: "There are 7 genes with a gal80Rexp value above 1." with the chip 7 and Show in table
   (success/07.png). The chip's hover peeks the seven on the canvas and selects nothing
   (success/08.png).
4. Show in table selects the seven, the inspector reads gal80Rexp 1.101 to 3.126, and the scope turns
   to Selection 7. The table stays in load order (success/09.png). One click on the gal80Rexp heading
   brings the seven to the top, shaded: GAL7, GAL1, GAL10, YNL164C, ADE4, ICL1, BAS1, and the next row
   is 0.991 (success/11.png). success/10.png is a name the tool refused as shared, not an app fault.

## Touched routes

**Fact 2 with fact 1's selection on (touched-31).** This time fact 1 repainted the network, selected
YMR043W and left Selection 1 on (02.png). Fact 2 with that scope gave eight steps, four of them "No
matches.", and the reply "Within your previous selection, no genes have gal80Rexp above 1. Across the
entire network, values reach up to 3.126; I have cleared the selection, so please let me know if you
would like the count across the full dataset." The turn ends "Selected 0 nodes", with no chip and no
Show in table, and the scope turns to Whole graph (03.png, 04.png). "Across the full dataset, please."
then gave 7, the seven names, the chip and Show in table (05.png).

**Fact 2 with a selection on (touched-32).** The starter did not select anything this time (03.png),
so the selection came from "Select those five." (04.png). Fact 2 under Selection 5 read "None of the 5
selected genes have gal80Rexp above 1; the highest among them is MCM1 at 0.457." with the chip 5 and
Show in table (05.png, 06.png). The earlier "at least 6 genes strictly above 1.1" did not come back.
The scope x and the same question for the whole network gave 7 with the names and the chip; the x
lasted for that message and the line went back to Selection 5, as settled (07.png).

**Find with a rule (touched-6).** Replayed, matching the earlier walk through nine steps. "gal80Rexp
above 1" has no match and a hint with a rule (02.png). "gal80Rexp > 1" offers "Select the 7 nodes
(gal80Rexp above 1)" (03.png) and Enter selects them: 7 nodes, gal80Rexp 1.101 to 3.126 (04.png). The
numeric rule still works. A question from the panel gave YMR043W, 16,124, with a "Selected 0 nodes"
line (12.png). Quick actions finds Assistant Ctrl+I by that word (13.png).

Gemini calls: success 5, touched-31 16, touched-32 18, touched-6 7.

## The answer key against the screen

No mismatch. Every reply matched the key's values, and the key already allows each of these: fact 1
named by id, betweenness before dividing by the pairs, a repaint on some runs and not others, and fact
2 with a chip or with neither. Whether fact 1 selects a node varied between two walks with the same
words, so the state fact 2 starts from is the model's choice.

## Defects

Severity 0 to 4. Items already on the backlog are not repeated: the empty Style tab, Bridges beside
Betweenness, the table's load order, the bare "No matches." wording.

1. Severity 3. The fix for a selection hiding a turn's chip is not in this build. It was reverted
   (baeb532d60) and nothing has replaced it, while `decided.md` still says "a selection of nothing
   draws no line". The acceptance for this route fails: on touched-31 the turn shows "Selected 0 nodes",
   no 7 chip and no Show in table. It does not block the task, because the reply gives no count and
   the reader asks again. The screens fit the cause in `rejected-fixes.md`: a turn bound to a selection
   stays bound after the model clears it, so the later reads come back empty, in the element, not the
   panel. touched-31/03.png, touched-31/04.png.
2. Severity 2. "Selected 0 nodes" also ends a turn about something else, right under an answer, when a
   stray selection was on as the message went. Same line as the first defect, on the route with no
   count at stake. touched-6/12.png.
3. Severity 2. The chip beside "None of the 5 selected genes" reads 5, the five read, not the zero the
   sentence states. The key says a chip follows the last query, so this is a truthful count, but a
   reader who asked "how many" sees a 5 next to the answer. touched-32/05.png.
