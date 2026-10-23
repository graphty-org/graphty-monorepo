# Session r3-s23 transcript

Participant: Tom, returning user. Screenshots 01.png to 09.png are in this folder.
Build: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/
`<session>` below is this session's folder.

## Start

Command: `node design/ui/studio/tool/real.mjs --start <session> setup:friends-ranked.txt` -> 01.png

01.png: My friends project is open. On the left: "Graph friends.csv", a PageRank row with 20, and "Everything". On the right: PageRank with Style and Values tabs. The orange balls are sized by PageRank. Before I swap anything I want to write down who is first now, so I will open the "Values" tab.

## Step 1

Command: `--step <session> --click "Values"` -> 02.png

02.png: A "Top 10" list. Farah is first at 0.06394, then Hana at 0.05941 and Milo at 0.05648. I wrote "Farah" on my notepad. "Made with" says PageRank, with weight read as closer. Now I need to put the new file in. I have never done that. The "Data" button on the far left sounds like where the files live, so I will try that.

## Step 2

Command: `--step <session> --click "Data"` -> 03.png

03.png: A "Sources" list with "friends.csv, 20 nodes, 41 edges". That is the old file. I cannot see a button next to it. Maybe clicking the file itself gives me choices, so I will click "friends.csv".

## Step 3

Command: `--step <session> --click-at 143,134` (the friends.csv source row) -> 04.png

04.png: The right side now says "friends.csv, Source", 20 nodes, 41 edges, and a table of the links opened at the bottom (Ava-Ben 3, Ava-Chloe 5, and so on). There are three little dots at the top right next to the file name. Menus hide behind those dots, so I will click them.

## Step 4

Command: `--step <session> --click-at 1419,74` ("Source actions") -> 05.png

05.png: A small menu with "Edit source..." and "Replace with file...". "Replace with file" is exactly what my friend asked for. I will click it and give it friends-v2.csv from Downloads.

## Step 5

Command: `--step <session> --click "Replace with file..." --upload friends-v2.csv` -> 06.png

06.png: A full page titled "Replace: friends-v2.csv", with "Was 20 nodes, 41 edges; now 20, 41". Same people and same links; the weights are different (Ava-Chloe was 5, now 1). That is what my friend said. There is a "Higher means: Not set / Closer / Farther / Capacity" choice. I do not change settings I do not understand. The old run also had it unset and read higher as closer, so leaving it alone keeps things the same as last time. Direction is "As the file says". I read it all, and I will press "Replace".

## Step 6

Command: `--step <session> --click "Replace"` -> 07.png

07.png: The top left now says "Graph friends-v2.csv", and the table shows the new weights (Ava-Chloe 1). My PageRank row is still there with a little clock-like icon, and the legend says "PageRank, out of date". So my work was kept but needs redoing. I will click the PageRank row to see how to redo it.

## Step 7

Command: `--step <session> --click-at 155,156` (the "PageRank, out of date" row) -> 08.png

08.png: A bar says "Data changed since this run", with a blue "Rerun" button. The Top 10 still shows the old list (Farah first at 0.06394). That is clear: press "Rerun".

## Step 8

Command: `--step <session> --click "Rerun"` -> 09.png

09.png: The bar is gone, the run now says "ran Oct 10, 5:36:33 PM", the legend no longer says out of date, and the Top 10 changed: Ava first at 0.08012, then Farah at 0.06556 and Hana at 0.06428. My colors and sizes are still on the picture, so nothing was lost. That answers the question, so I am done.

## End

Command: `--end <session>` -> session ended.

## In my own words

- Did I finish? Yes. Before the new list, Farah was first (0.06394). With the new list, Ava is first (0.08012) and Farah is second (0.06556).
- Ease: 6 out of 7.
- What confused me:
  - Finding "Replace" took a guess. The Data page lists the file, but the only way to replace it was the three dots on the far right after I clicked the file. I tried the file first only because nothing else looked right.
  - The "Higher means: Not set" choice on the replace page worried me for a moment. It says PageRank reads a higher weight as closer until I choose, which matched last time, so I left it. I would not know what to pick if it mattered.
  - After Replace I was not told in words that my ranking was now old. I only noticed the small clock icon and "out of date" in the legend. The "Data changed since this run" bar with Rerun appeared only after I clicked the PageRank row.
