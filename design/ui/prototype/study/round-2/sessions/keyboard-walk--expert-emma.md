# Keyboard walk -- Expert Emma

**Participant:** Emma, network scientist, notebook-first (networkx and igraph), Gephi for the final figure.
**Task, as the moderator gave it:** "Without the mouse, start at TP53, find its best-connected neighbour, tell me that neighbour's score, and select two of its neighbours."
**Pages:** the keyboard walk screen, driven by keys from its starting state (canvas focused, nothing selected), 1440 x 900. The inspector and table screens were not needed; the same inspector and Nodes table sit on this page.
**Outcome:** finished, with one wrong-footed step and one answer given with a caveat.

## Transcript (think-aloud)

**1. Landing.** Canvas has a blue focus ring, good, so I am already on the drawing. There is a card at the bottom: "Start: TP53, the walk starts here, nothing selected. Degree 32, rank 2 of 300." Fine, it has put me on TP53 without my asking. Also on the left rail, "Assistant: Off. Nothing is sent." I will take that. That is the first thing I look for and it is right there, not buried in a privacy page.

Table under the picture says "Filtered graph: 33 of 300 nodes. Sorted by degree." TP53 32, UBC 21, RPS8 17. So I could just read the answer off the table -- UBC -- but that assumes UBC is a neighbour. The moderator said use the keyboard, so let us see if the walk agrees.

**2. Keys.** My reflex is "?". A Keys dialog opens. Shift+Down starts the walk, Shift+Right next neighbour, Space selects, O is "Order: weight, degree, name". OK, that is exactly the knob I need. Short, read-only, fits on a screen. Esc closes it and I am back on the canvas. Good -- Gephi never had this.

**3. Start the walk.** Shift+Down. Focus jumps to PALB2: "1 of 32 from TP53. Weight 0.98. Degree 5, rank 247 of 300." So the default order is by edge weight. Hm. The graph panel on the right says "edge weight: confidence", so this is STRING-style confidence, fine, but the card says "Weight", not "confidence". I had to go and look at the other panel to know what 0.98 is. For a moment I thought PALB2 was being offered as "best", and it has degree 5. If I had been in a hurry I would have written down PALB2.

**4. Reorder by degree.** Card has "Neighbors by Weight / Degree / Name" with an O next to it. Press O. Now "UBC, 1 of 32 from TP53. Weight 0.80. Degree 21, rank 7 of 300." Matches the table. So the best-connected neighbour is UBC, degree 21. Nice that the order change kept me on TP53's neighbour list instead of throwing me back to the start.

**5. "Score."** What score? Nothing on this screen is called a score. There is no centrality computed -- no PageRank, no betweenness -- just degree and a degree rank. I pressed Enter to see if the inspector had more: "UBC, not selected. module Unassigned, degree 21, #7 of 300." Nothing else. So my answer is: UBC, degree 21, seventh of 300 by degree. If you meant something else by score, it has not been computed here. And "rank 7" -- with ties how? PALB2 at degree 5 is rank 247, which looks like a minimum rank for ties, but it does not say. I would want that on the column header.

Esc from the inspector put me back on UBC in the walk, 1 of 32. Good, it did not lose my place.

**6. Into UBC's neighbours.** Shift+Down. "TP53, 1 of 3 from UBC, in filtered graph ... where you came from." Wait. UBC has degree 21 and three neighbours. So the 21 is the full 300-node graph and I am looking at a 33-node slice. It does say "in filtered graph", I will give it that, it is honest. But the table header says "Filtered graph" and then shows 21 for UBC, so the degree column is not the filtered degree. Which one is "best-connected" then? In the full graph, UBC. In this slice, UBC has 3 and plenty of TP53's neighbours have more. I answered with the full-graph number because that is what everything on screen shows. I would want both, labelled -- "degree (all 300)" and "degree (shown)" -- or I will get this wrong in a report.

**7. Select two.** TP53 is first in the list. It is technically a neighbour of UBC, so Space: "TP53 added. 1 selected on canvas." Shift+Right: NDUFS7, degree 9, weight 0.73. Space: "NDUFS7 added. 2 selected on canvas." Inspector flips to "2 selected ... Selection 2: TP53 32, NDUFS7 9". 32 and 9 of what? I know it is degree because I just saw it, but the list has no column name. The table highlighted the TP53 row but NDUFS7 is somewhere below the fold and it did not scroll there, so I cannot confirm both from the table without leaving the canvas.

Done. Two selected, both neighbours of UBC. Took me maybe two minutes including the detour through PALB2.

## After the task

**Single Ease Question: 5 of 7.** The keys are sane and the key sheet saved me. What cost me was that the default order is by an unlabelled "weight", that "score" has no referent, and that degree silently means the full graph while the view is a slice.

**Would I use this instead of my current tool?** Not instead of the notebook -- I would get the neighbour list in one line of networkx. But this is the thing Gephi never let me do: walk a hub's neighbourhood with the keyboard and read the numbers as I go. For handing a view to a biologist who does not code, and who needs to poke at TP53's partners without me on the call, yes, I would use this, provided the degree column says which graph it counts.

> "Fine, UBC, degree 21 -- in the full graph. You showed me 33 nodes and counted 300. Put both numbers on the screen or somebody is going to cite the wrong one."

## Problems seen

1. **Degree counts the full graph while the view is a filtered slice** (severity 3). The walk card, the inspector and the Nodes table all show UBC at degree 21, but UBC has 3 neighbours in the 33-node view ("1 of 3 from UBC, in filtered graph"). The table caption says "Filtered graph" above a column that is not the filtered degree. "Best-connected" has two answers and the screen gives only one without saying which.
2. **The default neighbour order is by "Weight", not named as the confidence column** (severity 2). The walk first lands on PALB2 (0.98, degree 5), which reads as "the first/best neighbour". The card says "Weight"; only the graph panel on the right says the edge weight is "confidence".
3. **Nothing is called a score** (severity 2). The task word has no match; only degree and degree rank exist. Rank tie handling (247 of 300 for degree 5) is not stated.
4. **The selection list in the inspector has unlabelled numbers** (severity 1). "TP53 32, NDUFS7 9" with no column name.
5. **The table does not bring the newest selected row into view** (severity 1). After selecting NDUFS7 from the canvas, only TP53's row is visible and highlighted; NDUFS7's row stays below the fold.

## What worked

- "?" opens a short key sheet at once; O for the neighbour order is both in the sheet and on the walk card.
- The walk card shows position ("1 of 32 from TP53"), weight, degree, rank and module on every step.
- Changing the order keeps you inside the same neighbour list; Esc from the inspector returns to the same place in the walk.
- "Assistant: Off. Nothing is sent." visible on the rail without looking for it.

## Moderator note

The saved renders of this screen in the shots folder are older than the page: they show a one-line walk card that says "by confidence" and has no order switch. The live page, which this session used, has the three-line card with "Neighbors by Weight / Degree / Name" and O. Anyone reviewing from the PNGs alone will see a different design from the one tested.
