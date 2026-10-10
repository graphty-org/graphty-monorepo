# Session r1-s28 -- Dana, task T21 (team.csv to team-v2.csv)

Commands run from `design/ui/studio/tier2` with `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/`.

## Start

`node ../tool/real.mjs --start $S setup:team-ranked.txt` -> 01.png

My team map from two months ago is open: "Graph team.csv", 12 dots, sized and colored by PageRank, the key says so. Before I swap anything I want to write down who was first. The PageRank panel on the right has a "Values" tab -- that sounds like the table I want.

## Step 2

`--step --click "Values"` -> 02.png

Good, a table. Top 10: Hal 0.1293 first, Ida 0.1224 second, Di 0.1177. Written down: **Hal was first before**. 12 of 12 have a value. Now I need to swap in the new file. Last time I opened files from the Data place, so I'll go there and look for a way to bring in the new list.

## Step 3

`--step --click "Data"` -> 03.png

Data place shows "Sources: team.csv, 12 nodes, 16 edges". No obvious "swap file" button. I'll click on team.csv itself and see what it offers.

## Step 4

`--step --click "team.csv"` -> 04.png

It shows the file's table (From, To, weight) and on the right "team.csv, Source, Added: Nodes 12, Edges 16". Nothing says "new version" or "swap". Excel habit: right-click the thing. I'll right-click team.csv in the Sources list.

## Step 5

`--step --rclick "team.csv"` -> 05.png (tool note: name matched two controls, took the list item)

A small menu: "Edit source..." and "Replace with file...". "Replace with file" is exactly what I mean. Clicking it and giving it team-v2.csv from Downloads.

## Step 6

`--step --click "Replace with file..." --upload team-v2.csv` -> 06.png

A "Replace: team-v2.csv" screen. First line: "Was 12 nodes, 16 edges; now 14, 21". That is the kind of before/after line I like -- 14 people now, two more, matches what my manager said. It guessed source/target/weight right. There's a "Higher means: Not set / Closer / Farther / Capacity" question. I've never set that before, and the line under it says PageRank reads higher as closer anyway, which is what last time's run said too. I'll leave it alone so the numbers are comparable, and press Load.

## Step 7

`--step --click "Load"` -> 07.png

Loaded. "Graph team-v2.csv", the overview says Nodes 14, Edges 21. **The team has 14 people now.** My orange sizing is still on, but two dots are small and blue -- I'd guess those are the two new people, with no ranking. The PageRank row in the left list now has a little clock-like icon and still says 12, and the key still shows the old 0.1293 top. So it knows the ranking is from before. I'll click the PageRank row to see whether it offers to redo it.

## Step 8

`--step --click "PageRank"` -> 08.png

There it is: a strip at the top of the panel, "Data changed since this run" with a blue "Rerun" button. The table underneath is still the old one (Hal 0.1293, 12 of 12). Pressing Rerun.

## Step 9

`--step --click "Rerun"` -> 09.png

The strip is gone, the time now says ran 11:36:26, the layer row says 14, the key went to 0.02333 to 0.1339, and the two blue dots turned orange like everyone else. Table: "14 of 14 have a value". Top 10: **Di 0.1339 first**, Hal 0.1305 second, Ed 0.1245, Ida 0.1217, Jo 0.1141. That's my answer. Ending.

`--end $S`

## Wrap-up (Dana)

- **Finished:** yes. The team has **14 people** now (was 12). **Hal was first before** (0.1293); **Di is first now** (0.1339), Hal dropped to second.
- **Ease:** 6 out of 7.
- **What worked:** "Replace with file..." said exactly what I wanted, and the screen after it told me "Was 12 nodes, 16 edges; now 14, 21" before I committed -- that's my sanity check done for me. My sizing and colors stayed. "Data changed since this run" with a Rerun button next to it was obvious once I opened the ranking.
- **What confused me:**
  - Finding "Replace" took a right-click. Nothing on the Data place or on the file's own panel (team.csv, Source, Added 12/16) showed a replace button; I only found it because I right-click things out of Excel habit. Someone who doesn't would be stuck.
  - Right after loading, the drawing kept the old sizes and the key kept the old 0.1293 top, and the two new people showed up as small blue dots with no explanation on the map or key. The only sign the ranking was old was a tiny clock icon on the PageRank row; the "Data changed" warning only appeared after I clicked that row. If I'd taken a screenshot for my VP at that point it would have been wrong without my knowing.
  - The "Higher means: Not set / Closer / Farther / Capacity" question on the replace screen -- I left it alone because the sentence said the ranking already reads higher as closer. I don't really know what "Capacity" would change. Fine to ignore, but it's one more thing to wonder about every month.
- Would I do this monthly? For the swap-and-rerun itself, yes -- quicker than redoing it by hand. I'd still want the table out to Excel for the meeting.
