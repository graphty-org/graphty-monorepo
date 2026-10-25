# Session r5-s01b -- Grace, returning: point out the slow bus links

Task: on bus-stops.csv (already open), without taking any stop or link off the drawing, point out every link that takes 10 minutes or more, and say how many there are.

All commands run from /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ and
S=tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s01b

## Step 1 (01.png, setup already done)

What I see: the bus map is open, 10 stops (PageRank row says 10), sized and colored by PageRank. Left: Selection, PageRank, Everything. Search box "Find nodes, edges, values". Toolbar at the bottom. I don't see the minutes anywhere yet.

Command: `node design/ui/studio/tool/real.mjs --step $S --click "Find nodes, edges, values" --type "10"`

## Step 2 (02.png)

What I see: oh nice, under "Values" it offers "minutes is 10 or more (3)" -- exactly my question, in plain words. So 3 links? But the little icon next to it looks like the filter funnel, and I must not take anything off the drawing. I'll hover it first to see what it would do.

Command: `node design/ui/studio/tool/real.mjs --step $S --hover "minutes is 10 or more (3)"`

## Step 3 (03.png)

What I see: no tooltip, nothing changed. The row doesn't say whether it will hide the rest or just pick them out. I'll click it and watch; if stops or links disappear I'll use undo (the arrow at the top).

Command: `node design/ui/studio/tool/real.mjs --step $S --click "minutes is 10 or more (3)"`

## Step 4 (04.png)

What I see: three links are now thick and blue on the map, and the right panel says "3 edges selected" with a list: School -> Harbor 12, Depot -> Station 15, Station -> Harbor 14. Nothing disappeared: I still count 10 stops and all the gray links are there. The Selection row on the left says 3. That answers it -- 3 slow links, all up in the top half of the map around Station and Harbor. Done, ending.

Command: `node design/ui/studio/tool/real.mjs --end $S` -- session ended.

## In my own words (Grace)

- Did I finish? Yes. Three links take 10 minutes or more: School -> Harbor (12), Depot -> Station (15) and Station -> Harbor (14). They are picked out in thick blue on the map, and every stop and link is still drawn.
- Ease: 6 out of 7.
- What went well: I typed "10" in the search box and it offered "minutes is 10 or more (3)" -- plain words, and the count right there. Clicking it selected the three links and listed them with their minutes, which I could copy straight to a note.
- What confused me: the row has a funnel icon, the same as the filter button in the toolbar, so I was afraid clicking it would hide the other links. Hovering gave no tooltip to say. It turned out to select, not filter, but I clicked on faith. A word like "select" or a tooltip would have saved the worry. Also I am not sure the blue survives if I click somewhere else on the map -- for the board slide I would want it to stay.
