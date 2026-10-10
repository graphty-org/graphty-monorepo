# Session r2-s39 -- Nadia, task T21 (running club, friends.csv to friends-v2.csv)

Start: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/ node ../tool/real.mjs --start <session> setup:friends-ranked.txt` -> 01.png

## Step 1
01.png: friends is open, friends.csv on the left, a PageRank ranking already run (20) with colors and sizes. Right side shows PageRank with Style and Values tabs. Before I swap anything I need to write down who is first now. I will click Values.
`--step --click "Values"`
-> 02.png: Top 10 list. Farah is first at 0.06394, then Hana 0.05941, Milo 0.05648. Written down: first before = Farah. Run made with weight "read as closer".

## Step 2
Now I need to swap in the new list. The left panel says "Graph friends.csv" at the top -- the file name looks like the place to change it. I will click it.
`--step --click "friends.csv"`
-> 03.png: right side now says Graph, "From friends.csv" in blue, 20 nodes, 41 edges. No obvious swap button. There is a three-dot menu top right of that panel.

## Step 3
I will open the three-dot menu next to Graph to look for a way to use another file.
`--step --click-at 1419,73`
-> 04.png: menu has Re-run layout, Reshuffle layout seed, Add note. Nothing about a new file. ("Re-run layout" is the drawing, not my ranking.)

## Step 4
The "From friends.csv" text is blue, like a link. I will close the menu and click it.
`--step --key Escape --click "From friends.csv"`
-> 05.png: it took me to the Data side. Under "Sources" there is friends.csv, 20 nodes, 41 edges. That is the file. Good.

## Step 5
I will click the friends.csv row under Sources to see what I can do with it.
`--step --click-at 160,141`
-> 06.png: right side now shows "friends.csv, Source", 20 nodes, 41 edges, and a table at the bottom with the rows (Ava-Ben 3, Ava-Chloe 5...). There is a three-dot menu next to the file name on the right.

## Step 6
That three-dot menu belongs to the file itself. I will open it.
`--step --click-at 1419,73`
-> 07.png: menu says "Edit source..." and "Replace with file...". Replace with file is exactly what I want.

## Step 7
Click "Replace with file..." and give it friends-v2.csv from Downloads.
`--step --click "Replace with file..." --upload friends-v2.csv`
-> 08.png: a full-page "Replace: friends-v2.csv", "Was 20 nodes, 41 edges; now 20, 41". Weights are different (Ava-Chloe was 5, now 1). There is a "Higher means: Not set / Closer / Farther / Capacity" choice; it says until I choose, PageRank reads higher as closer. Last time my run also said "read as closer" because it was not set, so I leave it as it was -- same rules as last month, only new numbers. Button bottom right: Replace.

## Step 8
Click Replace.
`--step --click "Replace"`
-> 09.png: it worked. Left panel now says Graph friends-v2.csv; the table shows Ava-Chloe 1. My PageRank row is still there with a little clock icon, and the legend says "PageRank, out of date". So my work survived but the numbers are last month's.

## Step 9
I will click my PageRank row to find how to redo it.
`--step --click "PageRank"`
-> 10.png: right side: "Data changed since this run" with a blue Rerun button. The Top 10 is still the old one (Farah 0.06394). Clear enough.

## Step 10
Click Rerun.
`--step --click "Rerun"`
-> 11.png: new run "ran Oct 9, 8:42:21 PM", no more out-of-date warning, legend 0.02872 to 0.08012. Top 10 now: Ava 0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141, Ravi 0.05308. Same weight reading as before (read as closer), same damping 0.85. Colors and sizes kept, they just moved to the new numbers. Done.

`--end` -> session ended.

## Wrap-up (in character)

- **Finished:** yes. First before: Farah (0.06394). First now: Ava (0.08012). Farah dropped to second.
- **Ease:** 6 of 7. About ten clicks, a couple of minutes.
- **What went well:** once I found the file's own menu, "Replace with file..." said exactly what I wanted. The preview told me "was 20 nodes, 41 edges; now 20, 41", so I knew nobody was lost. After the swap, "out of date" on the key and "Data changed since this run" with a Rerun button made it obvious the ranking was last month's and how to fix it. My colors and sizes stayed.
- **What confused me:**
  - Finding the swap. I clicked the file name in the Graph list first (step 2), then the Graph three-dot menu (step 3), which only had layout things -- "Re-run layout" made me wonder for a second if that was the redo. The swap lives under Data, the file's own three-dot menu, two clicks deeper than I expected. I only got there because "From friends.csv" was blue.
  - The "Higher means: Not set / Closer / Farther / Capacity" row in the replace screen. I did not know if I had to answer it. I left it alone because my old run said "read as closer" because it was not set, so leaving it gave the same rules as last month. If I had picked something, would the two rankings still be comparable? Nothing told me.
  - Did the swap change the data or only the view? Here it clearly changed the data (the table had the new weights), which is what I wanted, but I would have liked one line saying the old file is gone from the project, for QA.
