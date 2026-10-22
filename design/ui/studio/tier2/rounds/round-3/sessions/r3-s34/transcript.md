# Session r3-s34 transcript

Participant: Grace, returning (nonprofit operations analyst, fourth session).
Task: in the Les Miserables network (each tie counts the chapters two characters share), keep only pairs who share 5 or more chapters, say how many characters remain, then bring every character back. Follow-up asked at the end: the same for 8 or more.

Build: `.study-builds/tier2-r3d2-26f3bb968` (graphty 0.8.61, commit 26f3bb968). Screenshots 01.png to 11.png are in this folder.

Every command below ran as `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs <mode> $S <action>`, where `$S` is this session's working folder.

## Start

`--start $S setup:lesmis-ranked.txt` (waited for a browser slot, then 01.png).

## Steps

1. (01.png) Les Mis map open: "PageRank 77" in the left list, PageRank size and color key on the canvas. Nothing on the Graph place says "filter". Toolbar: a flask, a chart-like icon, 3D, search. I start where I ran my ranking last time, the toolbar.
2. `--step $S --hover-at 728,864` -> tooltip "Layout". Not what I want. (02.png)
3. `--step $S --click "Data"` -> Data place: Sources (Les Miserables 77 nodes, 254 edges; node table 77 rows; edge table 254 rows), a "Filters" row with a plus, Attributes with edges carrying shared_chapters. Counts before: 77 characters, 254 ties. (03.png)
4. `--step $S --click-at 276,285` -> button "Add filter step". Right panel became "New filter step": Keep "an attribute's value", Attribute (empty), Add step greyed out. (04.png)
5. `--step $S --click "Attribute"` -> a list grouped Nodes (id, name) and Edges (shared_chapters). (05.png)
6. `--step $S --click "role=option:shared_chapters"` -> new rows "Is: at least" and "Value", and the line "Keeps edges that pass and the nodes at their ends." Plain words, exactly what I want. (06.png)
7. `--step $S --click "Value" --type "5" --click "Add step"` -> map shrank. Top bar now "26 of 77 nodes" with a filter icon. Filters list: "shared_chapters is at least 5 / 77 to 26 nodes" with a ticked box. Right panel Values: Nodes showing 26 of 77, Edges showing 51 of 254; Full graph still 77 / 254. The key now says "PageRank, full graph", so my ranking colors were kept and it tells me where they come from. Answer: 26 characters (51 ties). (07.png)
8. `--step $S --click-at 274,327` -> input "Apply step: shared_chapters is at least 5" unticked. Whole map back; Values: Nodes 77, Edges 254, same as at the start. The step stays in the list marked "off", so I can switch it on again next time. (08.png)
9. `--end $S` -> the session answered with a further request: "Now the same for pairs who share 8 or more chapters: how many characters are in the drawing then? Bring every character back when you are done." Carrying on in the same session.
10. `--step $S --click-at 180,320` -> treeitem "shared_chapters is at least 5". The right panel opened my step for editing, marked "Off", Value 5, button "Save and turn on". (09.png)
11. `--step $S --click "Value" --key Control+a --type "8" --click "Save and turn on"` -> the step now reads "shared_chapters is at least 8 / 77 to 17 nodes", ticked. Top bar "17 of 77 nodes"; Values: Nodes showing 17 of 77, Edges showing 19 of 254. Answer: 17 characters (19 ties). The 5 step was changed into the 8 step rather than kept beside it. (10.png)
12. `--step $S --click-at 274,327` -> input "Apply step: shared_chapters is at least 8" unticked. Back to Nodes 77, Edges 254; the step is kept as "off". (11.png)
13. `--end $S` -> session ended.

## In my own words (Grace)

Did I finish? Yes, both parts. Pairs sharing 5 or more chapters: 26 of the 77 characters are still in the drawing (51 of 254 ties). Pairs sharing 8 or more: 17 characters (19 ties). Both times I brought everyone back by unticking the filter, and the counts went back to 77 and 254, which is what I started with.

Ease: 6 out of 7.

What helped: once I was in Data, "Filters" with a plus was right there, the step reads like a sentence ("shared_chapters is at least 5"), and the line "Keeps edges that pass and the nodes at their ends" told me what would happen to the people. The count showed in three places (top bar, the step itself "77 to 26 nodes", and the right panel) and they agreed, so I trusted it. Switching the step off instead of deleting it, and seeing it stay as "off", is what I want for next quarter. My ranking colors stayed, and the key said "full graph", so I knew they were not recalculated on the smaller picture.

What confused me: I went to the toolbar first, because that is where I ran my ranking, and the only candidate was "Layout" -- nothing on the Graph side says "filter", so I had to guess it lived under Data. Editing the step turned my 5 step into an 8 step; that was what I wanted, but nothing told me the 5 version was gone, and to compare the two I would have had to build it again. Small thing: the step's tick box is tiny and sits at the very edge of the row.
