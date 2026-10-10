# Session r1-s30 -- Ruth (returning reporter), task T21 prompt B (team.csv to team-v2.csv)

Build: 946256efb876 (frozen copy tier2-r1d4-946256efb). Setup: team-ranked.txt.

Command prefix for every step below: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb node design/ui/studio/tool/real.mjs` with the session folder `design/ui/studio/tier2/rounds/round-1/sessions/r1-s30` (written S).

## Start

`--start S setup:team-ranked.txt` -> 01.png

01.png: My "team" project is open. Left: Graph team.csv, a find box, Selection, a PageRank row with "12", Everything. Right: the PageRank panel, "Measure ran Oct 8", Style and Values tabs. The drawing is sized and colored by PageRank. No names on the dots. Twelve -- that matches the twelve colleagues in my sheet. First I want to write down who was first BEFORE I touch anything. That is on Values.

## Step 1

`--step S --click "Values"` -> 02.png

02.png: Top 10 by PageRank: Hal 0.1293 first, then Ida 0.1224, Di 0.1177, Jo, Ed, Gil, Flo, Abe, Lu, Kit. "12 of 12 have a value." Writing it down: BEFORE, first is Hal (0.1293), 12 people. "Made with" says weight read as closer, damping 0.85. Now the new file. The left side says "Graph team.csv" -- the file lives somewhere under Data, I think. I will try the Data button on the left rail.

## Step 2

`--step S --click "Data"` -> 03.png

03.png: Data shows "Sources: team.csv, 12 nodes, 16 edges", then Filters, then Attributes (id; weight). 12 people, 16 ties -- that is my old sheet. There is no button that says what to do with the source. I will click the team.csv row and see what it offers.

## Step 3

`--step S --click "team.csv"` -> 04.png

04.png: The right panel now says "team.csv, Source; Added: Nodes 12, Edges 16", and a table of the ties opened at the bottom. Nice to see the rows, but nothing here says "use a newer file". No button on the right. I will try right-clicking the team.csv row, the way I would in a spreadsheet.

## Step 4

`--step S --rclick "team.csv"` -> 05.png (tool note: the name matched the row and the right panel's heading; it took the row)

05.png: A small menu: "Edit source..." and "Replace with file...". That second one is what I want -- but I only found it by right-clicking, which I would not have tried first in a web page. Nothing on the row or the right panel hinted it was there. I will choose "Replace with file..." and give it team-v2.csv from Downloads.

## Step 5

`--step S --click "Replace with file..." --upload team-v2.csv` -> 06.png

06.png: A full page "Replace: team-v2.csv. Was 12 nodes, 16 edges; now 14, 21." That is the check I wanted, said before anything happens: 14 people, two more than 12, and 21 ties. It shows the rows with line numbers. "Higher means: Not set" with a sentence: until I choose, PageRank reads a higher weight as closer. Last time's run said the same ("read as closer"), so leaving it alone keeps the comparison fair. Direction "As the file says". I will press Load.

## Step 6

`--step S --click "Load"` -> 07.png

07.png: Back on Graph. The left now says "Graph team-v2.csv"; the right says Nodes 14, Edges 21, Components 1. So the team has 14 people now. My PageRank row is still there with its colors -- my work was not thrown away -- but it still says "12", and its icon changed to a little clock-with-arrow. Two dots are blue, I guess the two new people, who have no ranking. The key still shows the old range. The old ranking is stale and the screen half says so. I will click the PageRank row to see whether it offers to run again.

## Step 7

`--step S --click "PageRank"` -> 08.png

08.png: A plain grey band: "Data changed since this run" with a blue "Rerun" button. Good -- it tells me the old numbers are old, and the top 10 still shows the old order (Hal first) with the old date. I will press Rerun.

## Step 8

`--step S --click "Rerun"` -> 09.png

09.png: New run, "ran Oct 8, 11:38:09 PM". Row says 14; "14 of 14 have a value". Top 10 now: Di 0.1339 first, Hal 0.1305 second, then Ed, Ida, Jo, Gil, Flo, Kit, Abe, Cy. The key moved to 0.02333 to 0.1339, and the blue dots are orange now. Same settings as before (weight read as closer, damping 0.85), so the comparison is like for like. Says who are the two new people? I want to see Mo and Nia by name before I believe "14". I will open the Nodes tab of the table at the bottom.

## Step 9

`--step S --click "Nodes"` -> 10.png

10.png: Nodes table, "14 nodes", Id and PageRank columns, in the order loaded: Abe 0.04, Bo 0.023, Cy 0.038, Di 0.134 ... only four rows fit. The new people would be at the end of the order loaded. I will scroll the table down.

## Step 10

`--step S --wheel 700,820,1500` -> 11.png

11.png: The bottom of the Nodes table: Kit 0.048, Lu 0.027, Mo 0.024, Nia 0.035. There they are -- Mo and Nia, the two who joined, each with a value. 14 names, 14 values. That squares with "Was 12 nodes, 16 edges; now 14, 21" from the replace page. I am done.

`--end S`

## End of session (in character)

**Did I finish?** Yes.

- The team has **14 people** now (21 ties), up from 12 people and 16 ties. The two new ones are Mo and Nia; I read both names in the table.
- **First before: Hal** (PageRank 0.1293).
- **First now: Di** (PageRank 0.1339). Hal is second at 0.1305.
- My project, its colors and sizes and the ranking row all stayed; only the numbers were redone, with the same settings (weight read as closer, damping 0.85).

**Ease: 5 of 7.**

**What confused me:**

- Finding where to put the new file. Data showed "Sources: team.csv", but nothing on that row or in the right panel said I could swap it. I only found "Replace with file..." by right-clicking the row. In a web page I do not right-click first; another day I might have given up and opened the new file as a new project, and lost my styling.
- After the load, the ranking row still said "12" and only its little icon changed. Nothing on the drawing or the key said "these numbers are from the old list" until I clicked the row and saw "Data changed since this run". The key kept showing the old range, and two dots were a different blue with no explanation.
- What I liked: the replace page told me "Was 12 nodes, 16 edges; now 14, 21" before I committed, and the rerun said "14 of 14 have a value" with the new run time. Those saved me a check.
