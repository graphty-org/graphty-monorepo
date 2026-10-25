# Session r4-s38 -- Grace, returning: swap team.csv for team-v2.csv and redo the ranking

Session folder (screenshots, logs): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s38
All commands run from the studio worktree with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/
and S=tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s38

## Start
`node design/ui/studio/tool/real.mjs --start $S setup:team-ranked.txt` -> 01.png

01: My team map is open, "team", Graph says team.csv. Left list has PageRank with 12 next to it -- twelve people, matches the old sheet. Right panel shows PageRank with Style and Values tabs. Before I swap anything I want to write down who is first right now. I'll try the Values tab.

## Step 2
`--step $S --click "Values"` -> 02.png
Good, the Top 10: Hal is first at 0.1293, then Ida, Di, Jo, Ed. "12 of 12 have a value." So before: 12 people, Hal first. Written down. Now to put the new list in. Last time Data listed my file's columns, so that seems the place where the file lives. Trying Data on the left.

## Step 3
`--step $S --click "Data"` -> 03.png
Data shows "Sources: team.csv, 12 nodes, 16 edges". That matches the old sheet: 12 people, 16 rows. No button next to the file that says replace. I'll right-click the file row to see if it has a menu.

## Step 4
`--step $S --rclick-at 140,141` -> 04.png (treeitem "team.csv")
A small menu: "Edit source..." and "Replace with file...". That's exactly the words I want. I'd never have found this without right-clicking, though. Clicking "Replace with file..." and giving it team-v2.csv from Downloads.

## Step 5
`--step $S --click "Replace with file..." --upload team-v2.csv` -> 05.png
A full page "Replace: team-v2.csv -- Was 12 nodes, 16 edges; now 14, 21". Love that line, it's my before-and-after in one sentence. 14 people (12 + Mo and Nia) and 21 rows, which is what my manager said. Bottom says "21 edge rows read; the load makes 14 nodes and 21 edges" -- nothing dropped. The weight "Higher means: Not set" -- last quarter's run said it assumed higher means closer, so I leave it alone so the ranking is done the same way. Pressing Replace.

## Step 6
`--step $S --click "Replace"` -> 06.png
Graph now says team-v2.csv. My colors and sizes stayed; two blue dots appeared, which I guess are Mo and Nia with no ranking yet. The key says "PageRank, out of date" and the right panel says "Data changed since this run" with a blue Rerun button. Very clear -- I wasn't left guessing. PageRank still shows 12 in the list. Pressing Rerun.

## Step 7
`--step $S --click "Rerun"` -> 07.png
Reran: list says PageRank 14, "14 of 14 have a value", new time 3:32:39 AM. The blue dots are orange now, colors and sizes redone on the new numbers, same settings as before ("weight read as closer"). Top 10: Di 0.1339 first, then Hal 0.1305, Ed, Ida, Jo. Mo and Nia aren't in the top 10, which makes sense for new people. Counts check: 14 people, 21 ties, same as the sheet. I'm done; ending.

## End
`--end $S` -> session ended (no further request).

## In my own words (Grace)
- Did I finish? Yes. The team has 14 people now (21 ties). Hal was first before (0.1293); Di is first now (0.1339), with Hal second.
- Ease: 6 of 7.
- What confused me: the only hard part was finding where to swap the file. Nothing on the Data page said "replace" until I right-clicked the team.csv row; a person who doesn't think to right-click would have looked for it under the menu or tried opening the file fresh and maybe lost the work. After that it was smooth: "Was 12 nodes, 16 edges; now 14, 21" told me the counts before I committed, "out of date" plus the Rerun button told me the ranking needed redoing, and my colors and sizes carried over. Small thing: right after the swap the list still said PageRank 12 and the top 10 was the old one, which is fine because it was marked out of date, but I'd want that "out of date" on the list row too.
