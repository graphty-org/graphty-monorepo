# Session r5-s28b -- Jordan (returning user)

Task: bus-stops.csv is open. Find how many minutes the Station--Stadium link takes, then select Station and Stadium (and no other stop).

Commands run from /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ and
S=tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s28b

## 01.png (start)
The bus map is up with PageRank sizing; Harbor is the big one. There is a short line between Station and Stadium near the top. Fine. I'll click that line and hope it tells me the minutes.

## Step 1
`node design/ui/studio/tool/real.mjs --step $S --click-at 763,150` -> "edge with id 15", 02.png
The line turned blue and the right panel says "Station -> Stadium", Edge, minutes 4. Good, that was quick: 4 minutes. Now I need just the two stops picked. Selection says 1 (the edge). I'll click Station, then shift-click Stadium -- that's what every tool I've used does for multi-select.

## Step 2
`node design/ui/studio/tool/real.mjs --step $S --click "Station"` -> 03.png
Station has a yellow ring, panel shows Station, Selection still 1 -- so the edge got swapped out, good. Now shift-click Stadium to add it.

## Step 3
`node design/ui/studio/tool/real.mjs --step $S --shift-click "Stadium"` -> "clicked node Stadium on the canvas, at 726,221", 04.png
Both Station and Stadium have yellow rings, nothing else does. Panel header says "2 nodes selected", Nodes 2, Edges joining these nodes 1. Left panel Selection count is 2. That's exactly what I wanted. Done.

## End
`node design/ui/studio/tool/real.mjs --end $S`
Session ended normally (no further request).

## Debrief (Jordan, in character)
- Finished: yes. The Station--Stadium link takes 4 minutes; Station and Stadium are the only two stops selected.
- Ease: 6 of 7.
- What confused me: almost nothing. Clicking a thin line is fiddly -- I had to aim at the short gap between the two balls, and if the stops were closer I'd probably hit a node instead. Nothing on the map tells you lines are clickable. The column is called "minutes" in lowercase straight from the file, fine. Shift-click worked the way it does everywhere, and "2 nodes selected" in the header confirmed it, so I didn't have to squint at the yellow rings. Honestly this is the kind of five-second lookup Brandwatch makes me open three menus for.
