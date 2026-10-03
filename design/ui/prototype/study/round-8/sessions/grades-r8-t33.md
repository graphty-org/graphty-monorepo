# Grades: see one coloring by itself, then put it back (task r8-t33)

The task opened the Les Miserables sample with several results coloring it at once (PageRank on
top, so the legend reads "Color: PageRank"). It asked the participant to look at the coloring from
"the circles of characters" by itself, without deleting or changing anything else, and then put
things back as they were. Five simulated participants ran it on the clickable skeleton. Grades are
decided by what was on screen at the end and what the participant concluded, not by what they
believed.

What success required:

1. The Louvain row shown alone: its menu > "Show only this row" (or Alt+click on its eye), so the
   canvas and the legend read "Color: Louvain" and the list says "Showing only Louvain".
2. Back again with "Show all", the same menu or Undo, ending with the legend reading
   "Color: PageRank".

Success with difficulty allowed switching the other rows' eyes off one by one and back on. Deleting
rows, or using "Remove from list view" and believing the coloring was gone, was a failure.

## Outcome

| | Count |
|---|---|
| Success | 5 |
| Success with difficulty | 0 |
| Failure | 0 |
| Gave up | 0 |

Self-ratings: 3 success, 2 success with difficulty. The two who rated themselves lower (the
Gephi holdout and Explorer Elena) took exactly the same path as the other three and ended on the
same screen; the difficulty they felt was the first click (below) and the length of the menu.

All five took the identical route: Louvain row > "..." > "Show only this row" > "Show all". The
soloed render shows six community colors, the legend "Color: Louvain" with counts 25, 17, 10, 10,
9, 6, the other rows dimmed, the Louvain row tagged "only" and the footer "Showing only Louvain.
Show all". The final render shows the orange PageRank coloring, the legend "Color: PageRank
0.00330 to 0.0754", Betweenness still hidden as at the start, and the footer back to "1 row not
listed still paints". The only differences from the start screen are the selected row (Louvain
instead of PageRank) and the Louvain tab open in the bottom table, which are selection, not state;
four of five said so unprompted.

### The first click is not counted as a wrong turn

Every participant first asked for "Louvain", and the click tool resolved the name to the bottom
table's "Louvain" tab rather than the list row; each then clicked the row. On screen the two are
far apart (bottom tab bar versus the left list), and a person aiming at the list row would not
land on the tab. This is an artifact of clicking by name, so it is logged as a finding but does
not lower any grade. Two participants (Elena, the Gephi holdout) read the community table it
opened before moving on; both liked it.

## Per participant

| Participant | Route | Ended on | Grade | Self-grade | SEQ |
|---|---|---|---|---|---|
| expert-emma | row > "..." > Show only this row > Show all | Color: PageRank, Betweenness still hidden | success | success | 6 |
| gephi-holdout | row > "..." > Show only this row > Show all | Color: PageRank, Betweenness still hidden | success | success with difficulty | 5 |
| cytoscape-holdout | row > "..." > Show only this row > Show all | Color: PageRank, Betweenness still hidden | success | success | 6 |
| explorer-elena | row > "..." > Show only this row > Show all | Color: PageRank | success | success with difficulty | 5 |
| genomics-cytoscape-user | row > hover "..." > "..." > Show only this row > Show all | Color: PageRank, Betweenness still hidden | success | success | 6 |

Paths not taken by anyone: Alt+click on the eye, Undo, "Remove from list view", Delete, and
switching other eyes off one by one. Three participants (Emma, the Gephi holdout, the Cytoscape
holdout) considered hiding PageRank with its eye and rejected it as "changing something else".
No participant deleted anything, so neither delete notice was seen.

## Findings

Severity is Nielsen's 0 to 4 scale.

| Finding | Seen by | Severity |
|---|---|---|
| While Louvain is shown alone, the inspector still reads "Covered by PageRank for Color on 77 of 77", contradicting the canvas and legend. Two said it makes them distrust the rest of that panel. | 4 of 5 (Emma, Gephi holdout, Cytoscape holdout, Elena) | 2 |
| "Show only this row" is found only inside a long "..." menu (about fifteen entries, several technical), next to Delete and Rerun; three asked for it on the row or beside the eye. Everyone found it, but by reading the whole menu. | 5 of 5 | 2 |
| "Show all" restored the previous stack, including leaving Betweenness hidden; named as the thing they would have checked first. Positive. | 4 of 5 (all but Elena) | -- |
| The "Covered by PageRank" line before soloing told participants why Louvain was invisible. Positive. | 5 of 5 | -- |
| The list row and the bottom table tab share the name "Louvain". Real on screen, but the cost observed here comes from click-by-name, so its weight for a mouse user is unproven. | 5 of 5 (tool) | 1 |
| "Row" is an odd word for a coloring ("a mapping, not a row"). Did not stop anyone. | 2 of 5 (Cytoscape holdout, Elena) | 1 |
| "Restore the suggested look" read as something that would change state; avoided. | 2 of 5 (Cytoscape holdout, genomics user) | 1 |
| The soloed legend gives community counts but no modularity or resolution. | 1 of 5 (Emma) | 1 |
| Community 1 (orange) and Community 5 (red-orange) are close in hue. | 1 of 5 (genomics user) | 1 |
| Read the largest community as "the important characters"; nothing on screen says that. | 1 of 5 (Elena) | 1 |

Inspector note (not graded): during the solo the inspector shows the Louvain row the participant
selected, not the PageRank row the project opened on, because every participant clicked the
Louvain row first. The stale "Covered by PageRank" line is therefore on the Louvain inspector.

## Reading

The solo and its exit work: five of five reached it, and the way back is labeled where people
look. The two costs are discoverability (the solo lives only in a long menu) and the stale
inspector line, which four of five noticed and which undermines trust in a panel that was
otherwise praised for honesty. Fixing the inspector to describe the screen during a solo, and
putting the solo within reach of the row's eye, are the changes this task supports.
