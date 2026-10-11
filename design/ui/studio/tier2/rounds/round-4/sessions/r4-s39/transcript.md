# Session r4-s39 -- Dana Okafor (returning user)

Task: replace friends.csv with friends-v2.csv without losing the work, redo the ranking, say who was first before and who is first now.

All commands run from the studio worktree with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ and T=design/ui/studio/tool, S=tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s39.

## Step 1 -- start
`node $T/real.mjs --start $S setup:friends-ranked.txt` -> 01.png
Notes: last month's friends.csv is open with a PageRank ranking (colors and sizes). Before I swap anything I want the old number one written down. There's a "Values" tab on the right; that sounds like my table.

## Step 2
`--step $S --click "Values"` -> 02.png
Notes: there's my table. Top 10: Farah first at 0.06394, then Hana 0.05941, Milo 0.05648. Writing that down: before = Farah. Now I go to the Data place, where I usually see what loaded, and look for a way to swap the file.

## Step 3
`--step $S --click "Data"` -> 03.png
Notes: Sources shows friends.csv, 20 nodes, 41 edges. No visible "replace" button. In Excel I'd right-click the item, so I'll right-click the source row.

## Step 4
`--step $S --rclick "friends.csv"` -> 04.png
Notes: a little menu: "Edit source..." and "Replace with file...". Replace with file is exactly what I want. Clicking it and picking friends-v2.csv from Downloads.

## Step 5
`--step $S --click "Replace with file..." --upload friends-v2.csv` -> 05.png
Notes: a "Replace: friends-v2.csv" screen. "Was 20 nodes, 41 edges; now 20, 41" -- good, same people, same links, like my friend said. Columns are guessed right (source From, target To, weight Weight) and the table shows the new weights. There's a "Higher means: Not set" row -- I've never set that before and last month's run just assumed closer, so I'll leave it alone so the two rankings are made the same way. Clicking Replace.

## Step 6
`--step $S --click "Replace"` -> 06.png
Notes: back on the graph, header now says friends-v2.csv, my PageRank layer is still there and the legend says "out of date". The right panel says "Data changed since this run" with a blue Rerun button. That's nice -- it told me instead of quietly showing old numbers. Clicking Rerun.

## Step 7
`--step $S --click "Rerun"` -> 07.png
Notes: new run time 3:33:10, same "weight (read as closer)" as last month, the "Data changed" bar is gone, legend now 0.02872 to 0.08012. Top 10: Ava 0.08012 first, then Farah 0.06556, Hana 0.06428. Same layer, same colors, just new numbers. That's what I needed. Ending.

## End
`node $T/real.mjs --end $S` -> session ended, copied to design/ui/studio/tier2/rounds/round-4/sessions/r4-s39.

## In my own words (Dana)
- Finished: yes. Before: Farah was first (PageRank 0.06394). Now, on friends-v2.csv: Ava is first (0.08012); Farah dropped to second (0.06556).
- Ease: 6 of 7.
- What worked: right-clicking the source gave "Replace with file...", the preview said "was 20 nodes, 41 edges; now 20, 41" so I knew nothing got lost, and the ranking stayed in place with a clear "Data changed since this run -- Rerun" bar. No rebuilding by hand, which is what I do every month today.
- What confused me: nothing on screen told me to right-click the source -- I only found "Replace" because right-click is my habit; there is no visible button on the source row. The "Higher means: Not set / Closer / Farther / Capacity" row in the replace screen made me hesitate: I left it alone so the run matched last month's, but I don't know if "Not set" is the right answer for my numbers. The grey labels in that screen ("Each row is", "text", "whole number") are small for my eyes.
- Still my questions: where does this file go when I load it (header says "Local only", which I'd want IT to confirm), and can I get the before/after Top 10 side by side into Excel for the slide?
