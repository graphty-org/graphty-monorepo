# Session r4-s37 -- Dev, returning (replace friends.csv with friends-v2.csv, redo ranking)

Build: /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/
All commands run from the studio worktree with REAL_DIST set to that build; S = this session folder.

## Step 1 -- start
Command: `node design/ui/studio/tool/real.mjs --start $S setup:friends-ranked.txt`
Screenshot 01.png. Okay, my friends project is open, "friends" at the top, Graph friends.csv. There is a PageRank run in the left list with 20, and the right panel shows PageRank with Style and Values tabs. Dots are sized and colored by PageRank. Before I swap anything I need to write down who is first now. I'll open Values.

## Step 2 -- Values tab
Command: `--step $S --click "Values"` -> 02.png
Top 10: Farah 0.06394 first, then Hana 0.05941, Milo 0.05648. "Made with" says PageRank, weight read as closer, damping 0.85. Wait, so before = Farah. Writing that down. Now I need to swap in friends-v2.csv without losing the work. Last time I opened files from... the Data icon on the left looks like the place for the data source. Trying Data.

## Step 3 -- Data
Command: `--step $S --click "Data"` -> 03.png
Data panel: Sources > friends.csv, 20 nodes, 41 edges. Filters, Attributes (id, weight). Oh nice, the source is listed. I'll click friends.csv to see if it has a "replace" option.

## Step 4 -- click the friends.csv source
Command: `--step $S --click-at 143,140` (treeitem "friends.csv") -> 04.png
Right panel now shows friends.csv, Source, Loaded 20 nodes / 41 edges, and a table opened at the bottom with the edges (Ava-Ben 3, Ava-Chloe 5...). No replace button in sight, but there is a "..." at the top right of the panel. Trying that menu.

## Step 5 -- Source actions menu
Command: `--step $S --click-at 1419,74` (button "Source actions") -> 05.png
Menu: "Edit source..." and "Replace with file...". Oh nice, "Replace with file" is literally what I need. Clicking it and picking friends-v2.csv.

## Step 6 -- Replace with file... + upload friends-v2.csv
Command: `--step $S --click "Replace with file..." --upload friends-v2.csv` -> 06.png
A full "Replace: friends-v2.csv" screen: "Was 20 nodes, 41 edges; now 20, 41". Same people, and I can see the numbers changed (Ava-Chloe was 5, now 1). It asks what a higher weight means: Not set / Closer / Farther / Capacity, with a plain sentence that until I choose, PageRank reads higher as closer. Last time it was "not set (read as closer)", so to compare fairly I'll leave it the same. Bottom says 41 edge rows read, 20 nodes, 41 edges. Clicking Replace.

## Step 7 -- Replace
Command: `--step $S --click "Replace"` -> 07.png
Graph now says friends-v2.csv, table shows Ava-Chloe 1, so the new numbers are in. My PageRank run is still in the list (with a little clock-ish icon) and the key says "PageRank, out of date". Good, it kept my work and tells me it is stale. Clicking the PageRank row to rerun it.

## Step 8 -- select the stale PageRank run
Command: `--step $S --click-at 155,156` (treeitem "PageRank, out of date") -> 08.png
Banner: "Data changed since this run" with a blue Rerun button. Top 10 still shows the old numbers (Farah 0.06394) and ran 3:31:10 AM. Clicking Rerun.

## Step 9 -- Rerun
Command: `--step $S --click "Rerun"` -> 09.png
Oh nice. Ran 3:32:26 AM now, the banner is gone, the key no longer says out of date (0.02872 to 0.08012), and the dots resized. Top 10: Ava 0.08012 first, then Farah 0.06556, Hana 0.06428. "Made with" shows the same settings as before (PageRank, weight read as closer, damping 0.85), so it is a fair before/after -- that's my proof for the instructor. My sizing and coloring stayed on. I'm done; ending.

## End
Command: `--end $S` -> "session ended", no further request.

### In character, at the end
- Did I finish? Yes. Before the swap, Farah was first (PageRank 0.06394). After putting friends-v2.csv in place and rerunning, Ava is first (0.08012); Farah is now second (0.06556).
- Essay sentence: "With last month's list Farah ranked highest by PageRank (0.064); on this month's numbers Ava ranks highest (0.080), with Farah second (0.066), using the same settings (weight read as closer, damping 0.85)."
- Ease: 6 of 7.
- What confused me: I had to guess that the source lives under Data and that "Replace with file..." hides in the "..." menu on the source's panel -- I found it on the first try, but nothing on the Graph screen pointed there. The replace screen asked what a higher weight means; I left it "Not set" to match the old run, but I'm not sure what this month's numbers actually mean, and the program could not tell me either. After replacing, the run stayed out of date until I clicked it; the small icon in the list was easy to miss, though the key saying "out of date" helped. I did not save the project afterwards because the task did not ask.
