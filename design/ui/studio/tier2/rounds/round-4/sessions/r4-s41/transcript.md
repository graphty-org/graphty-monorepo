# Session r4-s41 -- Ruth, returning

Task: replace friends.csv with friends-v2.csv without losing work, redo the ranking, say who was first before and who is first now.

All commands: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs <cmd> $S ...` (run from the studio worktree; $S is this session folder).

## Step 1 -- start
`--start $S setup:friends-ranked.txt` -> 01.png
The friends map is open, a "PageRank" run in the left list with 20 next to it, its Style tab on the right. Before I touch anything I want the old top name written down: Values tab.

## Step 2 -- read the old ranking
`--step $S --click "Values"` -> 02.png
Top 10, written down: Farah 0.06394 first, then Hana 0.05941, Milo 0.05648. "20 of 20 have a value." Made with PageRank, weight read as closer. So: first BEFORE is Farah.
Now the new file. The left rail has "Data"; that is where I would expect to swap the source.

## Step 3 -- Data panel
`--step $S --click "Data"` -> 03.png
Sources: friends.csv, 20 nodes, 41 edges. No visible "replace" button. I'll right-click the source row to see if it offers one.

## Step 4 -- right-click the source
`--step $S --rclick-at 160,141` -> 04.png
A small menu: "Edit source..." and "Replace with file...". The second is exactly what I want. Picking it and handing it friends-v2.csv.

## Step 5 -- replace preview
`--step $S --click "Replace with file..." --upload friends-v2.csv` -> 05.png
"Replace: friends-v2.csv. Was 20 nodes, 41 edges; now 20, 41." Good -- same count, nothing dropped. Rows show new weights (Ava-Ben 3, Ava-Chloe 1). "Higher means: Not set" with a note that PageRank then reads higher as closer -- the same as the old run said, so the comparison is like for like. I leave it and press Replace.

## Step 6 -- after Replace
`--step $S --click "Replace"` -> 06.png
Graph header now says friends-v2.csv. My PageRank run is still in the list (kept), legend says "PageRank, out of date", and the run panel says "Data changed since this run" with a Rerun button. The old numbers are still shown, honestly marked. Pressing Rerun.

## Step 7 -- rerun
`--step $S --click "Rerun"` -> 07.png
Ran 3:34:35 AM (was 3:33:39). Range now 0.02872 to 0.08012, 20 of 20 have a value. Top 10: Ava 0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141, Ravi 0.05308... Same weight reading as before (read as closer). So first NOW is Ava; Farah dropped to second.
The biggest, darkest ball moved to the middle-left. Does the picture agree with the table? Hovering it.

## Step 8 -- hover the big ball
`--step $S --hover-at 648,575` -> 08.png
Pointer becomes a hand but no tooltip, no name. I'll click it to have the right panel tell me who it is.

## Step 9 -- click the big ball
`--step $S --click-at 648,575` -> 09.png
Right panel: Ava, Node, Degree 6, PageRank 0.08012, "#1 of 20". Picture and table agree. That's my check done. Ending.

## End
`--end $S` -- session ended.

## In my own words
- Finished: yes. First before: Farah (PageRank 0.06394). First now, on friends-v2.csv: Ava (0.08012); Farah is second at 0.06556.
- Ease: 6 of 7.
- What helped: the replace screen said "Was 20 nodes, 41 edges; now 20, 41" -- that is the arrival check I would have done by hand. The run stayed, was marked "out of date" in the legend and "Data changed since this run" in the panel, so I never mistook the old numbers for new ones. The Ran time changed on rerun, and the node panel said "#1 of 20".
- What confused me: "Replace with file..." is only on a right-click of the source row; nothing on the Data panel shows it, I found it because I tried right-clicking. Hovering the biggest ball gave me a hand pointer but no name, so I had to click to learn who it was. The weight choice "Not set" on the replace screen made me stop and read; the note under it told me PageRank would read higher as closer, the same as last time, which is what I needed to compare like for like.
