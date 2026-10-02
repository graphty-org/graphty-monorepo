# Session: t37, the Gephi holdout (Dr. Mara Lindqvist, fictional)

Task as given: "Look at just one of the coloring results on its own for a moment. Then take three
characters out of sight while every count still includes them, and check that the numbers really
did not change. The data on screen is a sample: characters of the novel Les Miserables, linked
when they appear in the same chapter."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t37--gephi-holdout/. Abbreviation below: `T=.../tmp/round-7-sessions/t37--gephi-holdout`.

## Start screen (shots/tasks/t37/01.png)

"Les Miserables, 77 nodes. Left panel is a stack: Selection, Notes, PageRank, Louvain, Shortest
paths, a Watchlist, a folder 'For the report', Everything. So this is the layer list -- my
Appearance panel stacked up. PageRank is already selected and the inspector says it 'covers
Louvain for Color'. The canvas is all orange-to-brown, which is the PageRank ranking. Fine.
'Look at just one coloring result on its own' -- I want a solo. In Gephi I would just switch the
Appearance partition. Here, there must be a show-only."

## Step 1 -- hover the PageRank row

    timeout 120 node app-b/study.mjs --try $T/01.png task:t37 --hover "PageRank"

"Nothing new. An eye icon on the row, no tooltip."

## Step 2 -- hover Louvain

    timeout 120 node app-b/study.mjs --try $T/02.png task:t37 --hover "Louvain"

"That landed on a Louvain chip at the bottom: 'Louvain, resolution 1.0'. Good, at least it shows
the resolution. Not what I wanted."

## Step 3 -- try the eye, then the row menu

    timeout 120 node app-b/study.mjs --try $T/03.png task:t37 --hover "PageRank" --hover "eye"
    -> nothing on screen is called "eye"
    timeout 120 node app-b/study.mjs --try $T/03.png task:t37 --click "More"

"Menu: Rename, Select top N, Show in table, Filter to, Lock, Hide in list, Add note, Compare,
Delete. No 'show only this'. 'Hide in list' is not it either."

## Step 4 -- the eye's tooltip

    timeout 120 node app-b/study.mjs --try $T/04.png task:t37 --hover "Hide"

"'Hide PageRank. Alt-click or Alt+Space: show only this row.' There it is, buried in a tooltip.
Photoshop convention. My students would never find it; I only found it by guessing the name."

## Step 5 -- solo PageRank

    timeout 120 node app-b/study.mjs --try $T/05.png task:t37 --click "PageRank" --key Alt+Space

"The other rows went gray and the PageRank eye turned blue. The picture did not change at all --
because PageRank was already on top covering Louvain, so 'on its own' looks identical. Nothing on
the canvas or the legend says 'showing only PageRank'. I'll take the grayed rows as the answer.
Part one, done, I think."

## Step 6 -- open the table

    timeout 120 node app-b/study.mjs --try $T/06.png task:t37 --click "PageRank" --key Alt+Space --click "Table"

"Good: a node table, 77 nodes, columns say 'Degree (full graph)', 'PageRank (full graph)',
'Betweenness (full graph)'. That is exactly the label I want -- it tells me what it was computed
on. Valjean 36, 0.0754, betweenness 0.570. Javert 17, Thenardier 16, Marius 19. I'll write these
down.
But the solo is gone: the rows are no longer gray and the eye is gray again. Opening the table
silently ended my solo."

## Step 7-8 -- select characters from the table

    timeout 120 node app-b/study.mjs --try $T/07.png task:t37 ... --click "Javert"
    timeout 120 node app-b/study.mjs --try $T/08.png task:t37 ... --click "Javert" --click "Thenardier" --click "Marius"

"Clicking Javert selects him, ring on the canvas, a floating toolbar appears. Clicking two more
just replaces the selection -- Marius only. No multi-select that I can see. Fine, I'll hide them
one at a time."

## Step 9 -- what is that crossed-out eye

    timeout 120 node app-b/study.mjs --try $T/09.png task:t37 ... --click "Javert" --hover "Hide"

"'Hide on canvas, Ctrl+Shift+H'. Good wording: on canvas, not 'filter'. That is the distinction
Gephi never makes."

## Step 10 -- hide Javert

    timeout 180 node app-b/study.mjs --try $T/10.png task:t37 --click "PageRank" --key Alt+Space --click "Table" --click "Javert" --click "Hide on canvas"

"WHAT. The toast says 'Valjean hidden on canvas'. I selected Javert. The inspector now says
Valjean, and the big Valjean node is gone from the middle; Javert is still there. It hid the wrong
person. In Gephi with no undo this would be a disaster; here at least there is an Undo on the
toast.
The table still says 77 nodes and Valjean 36 / 0.0754 / 0.570, and the left panel says '1 node
hidden on canvas. Select, Show'. So the numbers did not move -- for the wrong node."

## Step 11 -- hide Thenardier too

    timeout 180 node app-b/study.mjs --try $T/11.png task:t37 ... --click "Hide on canvas" --click "Thenardier" --click "Hide on canvas"

"Nothing changed. Same toast, still one hidden. Clicking Thenardier in the table did not select
him this time."

## Step 12-13 -- try a canvas node, Fantine

    timeout 180 node app-b/study.mjs --try $T/12.png task:t37 ... --click "Hide on canvas" --click "Fantine"
    timeout 180 node app-b/study.mjs --try $T/13.png task:t37 ... --click "Fantine" --click "Hide on canvas"

"Selecting Fantine brought Valjean BACK on the canvas -- the hide just evaporated, the panel is
back to '1 hidden row still paints'. Then hiding Fantine hid... Valjean again. Fantine stays.
Whatever I select, it hides Valjean, and only him."

## Step 14-16 -- select the top three by PageRank and hide them

    timeout 180 node app-b/study.mjs --try $T/14.png task:t37 --click "PageRank" --key Alt+Space --click "More" --click "Select top N..."
    timeout 180 node app-b/study.mjs --try $T/15.png task:t37 ... --click "How many" --key Backspace --key 3 --click "Select"
    timeout 180 node app-b/study.mjs --try $T/16.png task:t37 ... --click "Select" --click "Hide on canvas" --click "Table"

"Select top N by PageRank, default 5. I typed 3; it selected 5 anyway ('5 nodes'). And I do not
see five rings on the canvas. Hide on canvas: 'Valjean hidden on canvas', one node. Again.
Table: 77 nodes, Valjean 36, 0.0754. So yes, hiding does not change the counts -- I could verify
that for one node. I cannot get three nodes hidden. Three dead ends in a row. I'm stopping."

## Debrief

**Succeeded?** Partly. I found the solo (only through a tooltip) and I hid a node and confirmed
the table and its '(full graph)' columns did not change. But I never hid three characters, and
the one that got hidden was never the one I picked. I would say I failed the task.

**Single Ease Question:** 2 of 7.

**Would I use this instead of Gephi?** No. The idea is right -- 'Hide on canvas' that leaves the
statistics on the full graph, with columns labeled '(full graph)', is exactly the thing Gephi gets
wrong and I would want. But a tool that hides Valjean when I ask it to hide Javert, forgets the
hide when I click elsewhere, ignores the number I type, and drops my solo when I open the table is
a tool I cannot trust with a figure. I'd stay on Gephi.

### Problems, in her words
- Solo exists only as Alt-click / Alt+Space in a tooltip; no menu entry "Show only this".
- Solo gives no visible confirmation on the canvas or legend when the soloed layer was already on top.
- Opening the table ended the solo silently.
- No multi-select in the table (click replaces the selection).
- Hide on canvas hid Valjean, not the selected Javert / Fantine / top-N selection.
- Selecting another node after a hide un-hid the hidden node.
- Select top N ignored the typed 3 and selected 5; the 5 selected were not ringed on the canvas.

### What she liked
- "(full graph)" on every statistic column header.
- "Hide on canvas" wording, plus "1 node hidden on canvas. Select, Show" in the panel.
- Undo on the hide toast, and undo/redo in the header.
- The Louvain chip states its resolution.
