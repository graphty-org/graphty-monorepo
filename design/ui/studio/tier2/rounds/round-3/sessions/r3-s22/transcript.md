# Session r3-s22 -- Ruth, returning: swap team.csv for team-v2.csv and redo the ranking

Screenshots 01.png to 14.png are in this folder. Every command ran from the studio worktree with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/`; `$S` is the
session folder.

## Step 1 -- start
`node design/ui/studio/tool/real.mjs --start $S setup:team-ranked.txt` -> 01.png

The project "team" is open, graph from team.csv. Left: "PageRank 12" run. Right panel: PageRank, a
Measure that "ran Oct 10, 5:31:56 PM", Style and Values tabs. Nodes sized and colored by PageRank, no
names drawn. 12 matches the 12 colleagues in the old sheet. Before I touch anything I want the old top
name written down: Values tab.

## Step 2 -- read the old ranking
`--step $S --click "Values"` -> 02.png

Values: "12 of 12 have a value, 0.03273 to 0.1293, median 0.06565". Top 10: Hal 0.1293, Ida 0.1224,
Di 0.1177, Jo 0.1166, Ed 0.1126, ... Writing it down: **before, first is Hal (0.1293), 12 people.**
Made with: PageRank, ran Oct 10 5:31:56 PM, weight read as closer, damping 0.85. Good -- it tells me
what it counted. Now to swap the sheet. The left rail has "Data"; that is where I expect the file.

## Step 3 -- the Data rail
`--step $S --click "Data"` -> 03.png

Sources: "team.csv, 12 nodes, 16 edges". Matches the old sheet. No "replace" button in sight. I'll
click the source row and see what it offers.

## Step 4 -- the source row
`--step $S --click "team.csv"` -> 04.png

Right panel: "team.csv, Source, Loaded: Nodes 12, Edges 16", and a table of edges opened below the
drawing. There is a "..." at the top right of the panel; a replace would hide there.

## Step 5 -- Source actions
`--step $S --click-at 1419,73` (button "Source actions") -> 05.png

Menu: "Edit source..." and "Replace with file...". The second is my words exactly. Picking it and
giving it team-v2.csv from Downloads.

## Step 6 -- Replace with file
`--step $S --click "Replace with file..." --upload team-v2.csv` -> 06.png

A full page: "Replace: team-v2.csv. Was 12 nodes, 16 edges; now 14, 21". That is exactly the check I
wanted before committing: 12 -> 14 people, 16 -> 21 ties, two new people and five new ties, as the
manager said. Footer: "21 edge rows read; the load makes 14 nodes and 21 edges." Nothing dropped.
Weight "Higher means" is "Not set", and the note says PageRank reads a higher weight as closer until
I choose -- the same assumption the old run used, so I leave it so before and after are counted the
same way. Replace.

## Step 7 -- after Replace
`--step $S --click "Replace"` -> 07.png

Back on the graph. Header: "Graph team-v2.csv". Overview: Nodes 14, Edges 21, Directed, 1 component.
My PageRank run is still in the list (nothing lost), but the legend says "PageRank, out of date", the
row shows a different icon and still "12", and two new dots are plain blue -- Mo and Nia, I assume,
but I can't confirm names from dots. I'll open the PageRank row and look for a re-run.

## Step 8 -- the stale run
`--step $S --click "PageRank"` -> 08.png

"Data changed since this run" with a blue "Rerun" button. Values still show the old answer (12 of
12, Hal 0.1293), clearly labeled stale -- and I already wrote it down as "before". Rerun.

## Step 9 -- Rerun
`--step $S --click "Rerun"` -> 09.png

New run: "ran Oct 10, 5:33:18 PM". "14 of 14 have a value, 0.02333 to 0.1339, median 0.04819." Top
10: **Di 0.1339**, Hal 0.1305, Ed 0.1245, Ida 0.1217, Jo 0.1141, Gil, Flo, Kit, Abe, Cy. Same settings
as before (weight read as closer, damping 0.85), so the comparison is fair. The row now reads 14 and
the blue dots are painted. Mo and Nia are not in the top 10, so I haven't seen their names yet. "Is
that all of them?" Checking the Nodes tab of the table.

## Step 10 -- Nodes table
`--step $S --click "role=tab:Nodes"` -> 10.png

"14 nodes", Id and PageRank, in the order loaded: Abe 0.04, Bo 0.023, Cy 0.038, Di 0.134 ... Gripe:
the table rounds (Abe 0.04) where the panel says 0.03959 -- same number, different precision; a
fact-checker will ask which one I quote. Rather than scroll, I'll type a name in the find box: "Mo".

## Step 11 -- find "Mo"
`--step $S --click "Find nodes, edges, values" --type "Mo"` -> 11.png

"Nodes 1: Mo". "Edges 3: Mo -> Abe, Mo -> Di, Nia -> Mo". Mo and Nia are both in, by name, and 14 of
14 have a value. Now I want this kept: in earlier sessions I saved from the menu.

## Step 12 -- main menu
`--step $S --click "Main menu"` -> 12.png

Save Ctrl+S, Save as..., Save local copy..., Export... Plain Save.

## Step 13 -- Save
`--step $S --click "Save"` -> 13.png

Plain Save opened "Save team as" with Name "team" prefilled. A little odd -- I thought this project
was already saved -- but the name is right. Save in the dialog.

## Step 14 -- saved
`--step $S --click "Save"` (inside the dialog) -> 14.png

Notice: "Saved team in this browser." Run reads 14, Di on top. Job done.

## End
`--end $S` -> "session ended".

## In character, at the end

- **Did I finish?** Yes. The team has **14 people** now (21 ties). **Before: Hal** was first (PageRank
  0.1293 of 12). **Now: Di** is first (0.1339 of 14); Hal is second at 0.1305. The old run was kept
  and rerun, not lost, and the project is saved.
- **Ease: 6 of 7.** "Replace with file..." said what I meant, and the "Was 12 nodes, 16 edges; now
  14, 21" line was the arrival check I'd have done by hand. "Data changed since this run" plus Rerun
  made it impossible to read the old number as the new one.
- **What confused me:**
  - Replace lived behind a "..." on the source panel, two clicks deep from a Data rail I had never
    opened; I found it by guessing.
  - After Replace, the run row kept saying "12" with a changed icon; only the legend's "out of date"
    told me in words until I opened the run.
  - The two new people were drawn plain blue until the rerun, with no names; I had to search to see
    "Mo" and "Nia" in writing.
  - The table shows Abe as 0.04 while the panel shows 0.03959: same value, two precisions.
  - Plain "Save" asked me for a name as if the project had never been saved.
