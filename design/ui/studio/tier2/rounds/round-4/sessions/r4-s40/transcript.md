# Session r4-s40 -- Analyst Alex, returning user

Task: replace team.csv with team-v2.csv without losing work, redo the ranking, report team size now, who was first before, who is first now.

Session folder: tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s40 (REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/)

## Step 1 -- start

`node design/ui/studio/tool/real.mjs --start <session> setup:team-ranked.txt` -> 01.png

Alex: OK, there is my team project from two months ago. Graph says team.csv, a PageRank run with 12 next to it, the size and color legend top left. Before I swap anything I want to write down who was first. The right panel has a Values tab -- that should be the ranking table.

## Step 2 -- read the old ranking

`--step <session> --click "Values"` -> 02.png

Alex: Top 10 list: Hal 0.1293 first, then Ida 0.1224, Di 0.1177. 12 of 12 have a value. Weight read as closer, damping 0.85 -- good, I can repeat those. Noted: Hal was first, 12 people. Now I need to swap the file. "Data" on the left rail sounds like where the source lives.

## Step 3 -- Data panel

`--step <session> --click "Data"` -> 03.png

Alex: Sources: team.csv, 12 nodes, 16 edges. Matches what I remember. No visible "replace" button. In Gephi I'd right-click; let me try right-clicking the source row.

## Step 4 -- right-click the source

`--step <session> --rclick "team.csv"` -> 04.png

Alex: A menu: "Edit source..." and "Replace with file...". That is exactly what I want. Clicking Replace and giving it team-v2.csv from Downloads.

## Step 5 -- replace dialog

`--step <session> --click "Replace with file..." --upload team-v2.csv` -> 05.png

Alex: "Replace: team-v2.csv. Was 12 nodes, 16 edges; now 14, 21." That is the count check I want, right at the top -- two new people, five new ties, matches the manager's note. Weight is "Not set" again; the old run said it assumed higher means closer, and the note here says PageRank reads it as closer by default, so leaving it keeps it like last time. Pressing Replace.

## Step 6 -- after replace

`--step <session> --click "Replace"` -> 06.png

Alex: Graph now says team-v2.csv. My PageRank run is still there, colors and sizes kept, and the legend says "out of date". The right panel says "Data changed since this run" with a Rerun button. Two blue dots -- I guess those are Mo and Nia, no PageRank value yet. Good: it told me instead of quietly showing old numbers. Rerun.

## Step 7 -- rerun

`--step <session> --click "Rerun"` -> 07.png

Alex: Run now says 14, "14 of 14 have a value", ran 3:33:59, same weight reading and damping 0.85. Top 10: Di 0.1339 first, Hal 0.1305 second, Ed 0.1245 third. Legend updated, the two blue dots are colored like everyone else now. Same layer, same colors -- I did not lose anything. That is my answer. Ending.

`--end <session>`

## Outcome (in character)

- Finished: yes.
- Answer: the team has 14 people now (was 12). Hal was first before (PageRank 0.1293). Di is first now (0.1339); Hal dropped to second (0.1305).
- Ease: 6 of 7.
- What took longest / confused me: finding the replace. Nothing on the Data panel says "replace" until you right-click the source row; I only tried that because Gephi trained me to. A visible button or the "..." menu on the source would save the guess. Everything after that was good: the dialog showed old and new counts side by side, my PageRank layer, colors and sizes survived, and it flagged the old numbers "out of date" with a Rerun button instead of quietly showing them. The weight "Not set" choice in the replace dialog made me pause a second to check it would read the weights the same way as last time -- the run's "read as closer" note confirmed it did. I did not see whether it saved on its own; the title bar just says "Local only", no "unsaved" mark, so I assume it kept it.
