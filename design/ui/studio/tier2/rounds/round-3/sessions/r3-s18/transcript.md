# Session r3-s18 -- Dev, returning: swap team.csv for team-v2.csv and redo the ranking

Screenshots 01.png to 10.png are in this folder. Every command ran from the studio worktree as
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs ... $S`,
with $S the session folder the briefing named (the tool copied it here at --end).

## Start

`--start $S setup:team-ranked.txt` -> 01.png (waited for a free browser slot first)

01.png: okay, my old project "team" is open. Left panel: Graph team.csv, Selection, PageRank (12), Everything. Right panel shows the PageRank run, "ran Oct 10", Style tab with Color PageRank and Size 1 to 3. Big brown dots, no names on them. Before I swap anything I need to write down who was first. I'll try the Values tab next to Style.

## Step 1

`--step $S --click "Values"` -> 02.png

02.png: oh nice, the Values tab has a Top 10. Hal is first with 0.1293, then Ida 0.1224, Di 0.1177. "12 of 12 have a value", so the old team is 12 people. "Made with: PageRank, Weight: weight (read as closer)". Writing down: before = 12 people, Hal first. Now I need to put team-v2.csv in place of team.csv. Next to "Graph" at the top left it says team.csv, so I'll click that and see if it lets me swap the file.

## Step 2

`--step $S --click "team.csv"` -> 03.png

03.png: the right panel now says "Graph, From team.csv" with an Overview: Nodes 12, Edges 16, Directed, Loaded weight: weight. Good, that confirms 12 people before. There's no "replace" button here, but there's a "..." menu at the top right of the panel. I'll try that, it's where I'd expect file things.

## Step 3

`--step $S --click-at 1420,73` (button "Graph actions") -> 04.png

04.png: the menu only has Re-run layout, Reshuffle layout seed, Add note. Nothing about the file. Wait, so where do I swap it? The blue "From team.csv" under the Graph title looks like a link, and on the far left there's a "Data" button with a database icon. Data sounds like where files live. I'll close this menu and go to Data.

## Step 4

`--step $S --key Escape --click "Data"` -> 05.png

05.png: Data shows "Sources: team.csv, 12 nodes, 16 edges", Filters, Attributes (id, weight). That's my file. No button next to it though. I'm used to right-clicking things, so I'll right-click team.csv and see if "replace" is there.

## Step 5

`--step $S --rclick-at 140,140` (treeitem "team.csv") -> 06.png

06.png: oh nice, "Replace with file..." -- exactly the word I wanted. (Also "Edit source...".) Clicking Replace and picking team-v2.csv from Downloads.

## Step 6

`--step $S --click "Replace with file..." --upload team-v2.csv` -> 07.png

07.png: a full "Replace: team-v2.csv" screen. Top says "Was 12 nodes, 16 edges; now 14, 21" -- that's the two new people and five new ties, matches what my manager said. Each row is "an edge", source/target/weight already picked. There's a "Higher means: Not set / Closer / Farther / Capacity" question about the weight; it says until I choose, PageRank reads higher as closer. That's what the old run did too ("read as closer"), and this is a team ties sheet, not distances, so I'll leave it alone so the before and after are comparable. Clicking the blue Replace.

## Step 7

`--step $S --click "Replace"` -> 08.png

08.png: back to the Graph view. "Graph team-v2.csv", Nodes 14, Edges 21. My PageRank row is still there (still says 12) with a little history icon, and the key says "Size: PageRank, out of date" -- so it kept my styling and tells me the ranking is stale. Two new blue dots, those must be the new people with no rank yet. Good, nothing lost. Now redo the ranking: I'll click the PageRank row and look for a re-run.

## Step 8

`--step $S --click "PageRank"` -> 09.png

09.png: "Data changed since this run" with a blue Rerun button. The Top 10 still shows the old list (Hal 0.1293 first), which is my "before". Clicking Rerun.

## Step 9

`--step $S --click "Rerun"` -> 10.png

10.png: oh nice, that's it. "ran Oct 10, 5:29:34 PM", PageRank row now says 14, "14 of 14 have a value", the blue dots are orange now and the key range is 0.02333 to 0.1339. New Top 10: Di 0.1339, Hal 0.1305, Ed 0.1245, Ida 0.1217, Jo 0.1141... "Made with: PageRank, weight (read as closer), damping 0.85" -- same settings as the old run, so it's a fair before/after. Hal dropped to second. My colors and sizes stayed on, nothing to redo. Done.

## End

`--end $S` -> session ended.

## Wrap-up, in character

- Did I finish? Yes. The team now has 14 people. Hal was first before (PageRank 0.1293). Di is first now (0.1339), with Hal second (0.1305).
- Essay sentence: "With the updated list the team has 14 people; Hal ranked first by PageRank before (0.1293), and Di ranks first now (0.1339), with Hal second (0.1305)."
- Ease: 6 out of 7.
- What confused me: finding where to swap the file. I first clicked the "team.csv" name next to "Graph" and the panel's "..." menu (it only had layout and note items), then went to Data. "Replace with file..." is only on a right-click of the source row in Data; there was no visible button for it, so if I didn't habitually right-click I'd have been stuck. Once found, the replace screen was great: "Was 12 nodes, 16 edges; now 14, 21" told me the import worked, and "out of date" plus the Rerun button made redoing the ranking obvious. The "Higher means: Not set" weight question made me pause a second, but its explanation said what would happen if I left it.
