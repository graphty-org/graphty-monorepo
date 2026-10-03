# Session: r8-t33, Gephi holdout (Dr. Mara Lindqvist, fictional)

Task as given: "The Les Miserables network is open (example data, not your own), and several
results color it at once. Look at the coloring from the circles of characters by itself for a
moment, without deleting or changing anything else, then put things back as they were."

All commands run from design/ui/prototype. D = tmp/round-8-sessions/r8-t33--gephi-holdout.

## Step 1 -- start screen (shots/tasks/r8-t33/01.png)

Think-aloud: "Les Mis. Everyone's first network. Fine. Everything is orange -- the legend says
Color: PageRank. 'Circles of characters' -- that is the modularity classes, so Louvain, the row
with '6 groups'. The PageRank row is selected and the panel on the right says 'Covers Louvain for
Color'. So PageRank is painting over the partition. In Gephi there is no stack, there's one
partition applied at a time; I would just re-apply the partition and then lose the ranking. Here
I'm told not to change anything else. Let me click Louvain."

## Step 2 -- click "Louvain"

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t33 --click "Louvain"

Tool output: "Louvain" matched two controls; it clicked the tab at the bottom first.

Think-aloud: "That opened a table of communities, not what I clicked for. Sizes 25, 17, 10, 10, 9,
6, density, edges inside and leaving. Actually that's a nice table -- Gephi only gives me a
modularity_class column and the percentages in the report. But the map is still orange. Not what
I wanted. I meant the row on the left."

## Step 3 -- click the Louvain row in the left list

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t33 --click "Louvain, 1 note"

Think-aloud: "Right panel: Louvain, run Sep 28, 'Paints 77 nodes', 'Covered by PageRank for Color
on 77 of 77'. Honest, at least -- it tells me why I can't see it. There's an eye on the row. If I
hide PageRank with its eye, that's changing something else, and then I have to remember to turn
it back on. I'd rather look for a solo, like 'Show only' in a layer list. Try the three dots."

## Step 4 -- open the row's menu

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t33 --click "Louvain, 1 note" --click "More"

Think-aloud: "Long menu. Rerun, run as copy, 'Check against a null model and other seeds' --
grayed, this version doesn't have it. Pity, that's the thing reviewers ask me about. 'Restore the
suggested look'. Lock. Remove from list view. 'Show only this row', Alt+Space. That's it. Rename
is grayed too -- I'd want to name communities eventually, but not today."

## Step 5 -- Show only this row

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t33 --click "Louvain, 1 note" --click "More" --click "Show only this row"

Think-aloud: "There. Six colors, legend switched to 'Color: Louvain', Community 1 25 nodes down to
Community 6 6 nodes. The Bossuet/Courfeyrac cluster is one community, Myriel's bishop group is
green, Fantine's group is orange. Looks like the usual Les Mis partition. Every other row is
grayed and the Louvain row says 'only'. Footer: 'Showing only Louvain. Show all'. Good -- it tells
me how to get out. One complaint: the right panel still says 'Covered by PageRank for Color on 77
of 77', while the map plainly shows Louvain. Which is it? Stale text like that makes me distrust
the panel."

## Step 6 -- Show all

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t33 --click "Louvain, 1 note" --click "More" --click "Show only this row" --click "Show all"

Think-aloud: "Back to orange, legend PageRank again. Betweenness is still hidden with its crossed
eye, as it was at the start -- it didn't just turn everything on blindly. The '1 row not listed
still paints' line is back. That looks like where I started. Done."

## Verdict

- Succeeded: yes, I believe so. Saw the community coloring alone, then restored the original
  stack without touching anything else.
- Single Ease Question: 5 of 7. One wrong click (the same name is on a tab and on a row), and the
  solo is buried in a long menu; I only found it because I went looking for a "solo" the way I
  would in Photoshop or Inkscape layers. The "Show all" exit is clear.
- Would I use this instead of Gephi? Not for this. Gephi can't do this at all -- one partition at
  a time, and if I want the ranking back I redo it -- so a solo that puts things back is a real
  improvement, and so is the community table. But toggling a view on a toy network is not why I
  stay on Gephi. Show me my 23k-node GEXF with the right counts, ForceAtlas2 with my parameters,
  and seed control on Louvain, and we'll talk. And fix the panel that says PageRank is covering
  Louvain while I'm looking at Louvain.
