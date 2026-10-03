# Session: Expert Emma -- look at the Louvain coloring alone, then put it back

Task as given: "The Les Miserables network is open (example data, not your own), and several
results color it at once. Look at the coloring from the circles of characters by itself for a
moment, without deleting or changing anything else, then put things back as they were."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t33--expert-emma/.

## 01 -- start screen (shots/tasks/r8-t33/01.png)

Think-aloud: "Les Mis, the co-appearance network. Fine, I know this one. Everything is orange,
legend says 'Color: PageRank 0.00330 to 0.0754'. 'Circles of characters' -- you mean the
communities. There is a Louvain row, 6 groups. Which Louvain, which resolution? Later. PageRank
is on top and paints every node, so Louvain is buried under it. In Gephi I would just... rerun
the partition coloring. Here I assume there is a visibility toggle. There is an eye on the
PageRank row. I could hide PageRank, but that is 'changing something else', and if anything
else paints color I would have to hunt it down. I want 'show me only this'. Let me click
Louvain first and see what it tells me."

## 02 -- click "Louvain"

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t33--expert-emma/02.png task:r8-t33 --click "Louvain"

Tool said: ambiguous, "Louvain" matches the table tab "Louvain" and the list row; it clicked the
tab. "Two things with the same name, and I hit the table tab at the bottom. Not what I meant.
The row it is."

## 03 -- click the Louvain row

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t33--expert-emma/03.png task:r8-t33 --click "Louvain, 1 note"

"Right panel: 'Louvain, Run from Louvain, Sep 28. Paints 77 nodes. Covered by PageRank for Color
on 77 of 77.' Good, that is honest -- it tells me exactly why I cannot see it. Now how do I get
it on its own? There is a '...' on the row. Right-click would be my instinct; the dots are the
same thing."

## 04 -- open the row's "..." menu

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t33--expert-emma/04.png task:r8-t33 --click "Louvain, 1 note" --click "More"

"Long menu. Rerun, Run as copy, a grayed 'Check against a null model and other seeds' with a note
that this version cannot. Fine, at least it admits it. 'Restore the suggested look', 'Lay out by
these groups'... and 'Show only this row', Alt+Space. That is solo. That is exactly the word I
wanted. Keyboard shortcut too, which I would actually use."

## 05 -- "Show only this row"

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t33--expert-emma/05.png task:r8-t33 --click "Louvain, 1 note" --click "More" --click "Show only this row"

"There we go. Six communities, legend with node counts per community: 25, 17, 10, 10, 9, 6 --
that adds to 77. Good, the denominator checks out. Myriel's group is its own community, the
students around Enjolras are together, the Thenardier side is blue. Plausible for Les Mis. The
other rows are dimmed, the row says 'only', and at the bottom of the list: 'Showing only
Louvain. Show all'. That is the way back, clearly labeled.

Two complaints. One: the right panel still says 'Covered by PageRank for Color on 77 of 77' while
I am looking at Louvain uncovered. That is now false, or at least stale. Two: the legend says
'Color: Louvain' -- no modularity Q, no resolution. If I am going to put this in front of a
client I need Q in the legend or one click away. Not this task, but I noticed."

## 06 -- "Show all"

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t33--expert-emma/06.png task:r8-t33 --click "Louvain, 1 note" --click "More" --click "Show only this row" --click "Show all"

"Back to orange PageRank, legend back to PageRank. Betweenness is still hidden, as it was at the
start -- good, 'Show all' did not blindly unhide everything, it put back what was there. That was
the thing I was worried about. The only difference from the start is that Louvain is now the
selected row instead of PageRank and the bottom table switched to the Louvain tab. That is
selection, not state; I do not count it."

Done.

## Verdict

- Succeeded: yes. Saw the Louvain coloring alone, then restored the previous view; the hidden
  Betweenness row stayed hidden.
- Single Ease Question: 6 of 7. The menu item was found on the first try and the way back was
  labeled right where I was looking. One point off for the name collision between the row and the
  table tab, and the menu being long enough that I had to read it.
- Would I use this instead of my current tool: for this, yes. In Gephi I would have to re-apply
  the partition coloring and then re-apply the ranking, and get the ranking settings back by
  memory. Here it is one menu item and one link and nothing is lost. But the inspector saying
  "Covered by PageRank" while PageRank is visibly not showing is the kind of stale statement that
  makes me distrust the other statements in that panel, and a community coloring without Q and
  resolution in the legend is not something I would hand to a client.
