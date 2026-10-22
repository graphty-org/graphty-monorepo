# Session r4-s25 -- transcript (Alex, returning user)

Task: friends.csv is open. Keep only pairs who ran together 4 or more times (third column), say how many people are left, then bring the whole club back.

Commands run from /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ and session folder S=tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s25.

## Step 1 -- start
`node design/ui/studio/tool/real.mjs --start $S setup:friends-ranked.txt`
01.png: friends graph open, PageRank layer on, sized and colored by PageRank. Bottom toolbar has a funnel-ish icon, which I guess is filter. I'll try it.

## Step 2
`--step $S --click-at 833,863` -> button "Filters"
02.png: left panel switched to Data (20 nodes, 41 edges; edge attribute "weight"). Right panel "New filter step": Keep = an attribute's value, Attribute = empty, Add step. Promising. I'll open Attribute.

## Step 3
`--step $S --click "Attribute"`
03.png: list shows Nodes: id, Edges: weight. Picking weight.

## Step 4
`--step $S --click "role=option:weight"`
04.png: Attribute weight, Is "at least" (already the default -- exactly what I want), empty Value, hint "Keeps edges that pass and the nodes at their ends." Good, that is the semantics I want. Typing 4 and adding the step.

## Step 5
`--step $S --click "Value" --type "4" --click "Add step"`
05.png: drawing thinned out. Top bar says "19 of 20 nodes, 12 of 41 edges". Filters list now has "weight is at least 4 -- 20 to 19 nodes, 41 to 12 edges" with a ticked checkbox. Values tab: Nodes showing 19 of 20, Edges showing 12 of 41. Counted the dots on the canvas myself (two pairs overlap a bit) and get 19, so I believe it. Answer: 19 people still in it (12 pairs). Legend now says "PageRank, full graph" -- fair, the sizes are from the whole club, worth knowing for the flyer.
Now bring everyone back: I'll untick the filter's checkbox rather than delete it, so I can switch it on again for the flyer.

## Step 6
`--step $S --click-at 274,247` -> input "Apply step: weight is at least 4"
06.png: all 20 nodes and 41 edges are back, top bar count gone, legend back to plain "PageRank", filter row reads "weight is at least 4 -- off". Whole club back, and the filter is kept for next time. Nice.

## Step 7 -- end, which answered with a further request
`--end $S` -> "Your club now asks the same for pairs who ran together 5 or more times. How many people are in the drawing then? Bring the whole club back when you are done."
I'd rather change my existing step than build a new one. I'll click the filter row to see if it opens for editing.

## Step 8
`--step $S --click "weight is at least 4"`
07.png: right panel now edits that step: weight, at least, Value 4, button "Save and turn on". Exactly what I hoped. I'll replace 4 with 5 and save.

## Step 9
`--step $S --click "Value" --key Control+a --type "5" --click "Save and turn on"`
08.png: top bar "10 of 20 nodes, 5 of 41 edges"; filter row "weight is at least 5 -- 20 to 10 nodes, 41 to 5 edges", ticked. Counted on canvas: four separate bits, two of the dots at the bottom overlap, comes to 10 with 5 links. Answer: 10 people at 5+ runs. Now untick to bring everyone back again.

## Step 10
`--step $S --click "Apply step: weight is at least 5"`
09.png: back to 20 nodes and 41 edges, filter row "weight is at least 5 -- off", legend plain "PageRank" again. Whole club is back.

## Step 11 -- end
`--end $S` -> "session ended".

## Wrap-up (in character)

- Finished: yes, both requests. Pairs with 4+ runs together: 19 people still in the drawing (12 pairs). Pairs with 5+ runs: 10 people (5 pairs). Both times I brought the whole club back (20 people, 41 pairs) by unticking the filter step, which stays in the list as "off" so I can switch it on for the flyer.
- Ease: 6 out of 7.
- What went well: the funnel button went straight to a "New filter step" form; "at least" was already picked; the line "Keeps edges that pass and the nodes at their ends" told me exactly what would happen to people with no strong pair. The count shows in three places (top bar, the filter row, Values tab) and matched what I counted on the canvas. Clicking the existing step to edit it and "Save and turn on" made the second request two clicks.
- What confused me, a little: I had to guess that the bottom-toolbar icon with three lines was "Filters" -- it has no label until you hover. When the filter is on, the legend says "PageRank, full graph", which I worked out means the sizes were not recalculated for the smaller drawing; fine, but I had to think about it. Two pairs of dots overlap at the bottom, which made checking the count by eye fiddly.
