# Session r3-s38 -- Dev, returning student

Task: keep only Les Miserables pairs that share 5 or more chapters, say how many characters remain, then bring every character back. Follow-up from --end: the same with 8 or more chapters.

Build: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/
Every command is `REAL_DIST=... node design/ui/studio/tool/real.mjs <cmd> $S ...`, with $S the session folder. Screenshots are in this folder.

## Steps

1. `--start $S setup:lesmis-ranked.txt` -> 01.png. Les Mis is open, colored and sized by PageRank. I need a filter. Toolbar: flask, a chart icon, 3D, magnifier.
2. `--step $S --hover-at 728,864` -> 02.png. Tooltip "Layout". Not a filter. Okay, filters are probably with the data.
3. `--step $S --click "Data"` -> 03.png. Data tab: Sources (77 nodes, 254 edges), a "Filters" section with a plus, and Attributes; edges have "shared_chapters". That is my chapter count.
4. `--step $S --click-at 276,285` -> 04.png. "Add filter step". Right panel: "New filter step", Keep: "an attribute's value", Attribute: empty dropdown, "Add step" grayed out.
5. `--step $S --click-at 1320,170` -> 05.png. The Attribute list: Nodes id, name; Edges shared_chapters. Picking shared_chapters.
6. `--step $S --click "shared_chapters"` -> 06.png. The tool said the name matched two controls (the list option and the attribute in the left tree); nothing happened. (The tool's naming, not the app.)
7. `--step $S --click "shared_chapters#1"` -> 07.png. The tool asked for the kind of control; nothing happened.
8. `--step $S --click "role=option:shared_chapters"` -> 08.png. Picked. Now "Is: at least", an empty "Value" box, and under it "Keeps edges that pass and the nodes at their ends." Oh nice, at least 5 is exactly what I want, and it says what happens to the characters.
9. `--step $S --click-at 1320,266 --type "5"` -> 09.png. Value 5, "Add step" turned blue.
10. `--step $S --click "Add step"` -> 10.png. The drawing thinned out right away. Top bar "26 of 77 nodes"; in the left list the step reads "shared_chapters is at least 5 / 77 to 26 nodes" with a checkbox; right panel Values: "Nodes showing 26 of 77", "Edges showing 51 of 254". The key now says "PageRank, full graph", so the sizes still come from the whole book. It says what it used, in words matching what I meant.
11. `--step $S --click "Edge table"` -> 11.png. A table at the bottom, "254 edges, in the order loaded". Rows: Napoleon-Myriel 1, MlleBaptistine-Myriel 8, MmeMagloire-Myriel 10, ... Wait -- Napoleon-Myriel is 1, which should be filtered out, and the table still lists all 254 with nothing marking which rows are hidden. So the table is the whole file, not what is showing. Myriel's ties of 8 and 10 pass and the 1 fails, so the rule reads the number the right way round. The count I trust is "26 of 77 nodes" at the top.
    Essay answer: 26 of the 77 characters remain when only pairs sharing 5 or more chapters are kept (51 of 254 ties).
    To bring everyone back I'll untick the step rather than delete it, so I can show my instructor the step later.
12. `--step $S --click-at 274,327` -> 12.png. "Apply step: shared_chapters is at least 5" unticked. Every character is back, "26 of 77" is gone from the top bar, the step row says "off", and the key no longer says "full graph". Oh nice, that's it.
13. `--end $S` -> not ended; the next request: "Now the same for pairs who share 8 or more chapters: how many characters are in the drawing then? Bring every character back when you are done." I kept my old step, so I'll open it and change 5 to 8.
14. `--step $S --click-at 180,320` -> 13.png. The step opened on the right: "shared_chapters is at least 5, Filter step, Off", Value 5, and a button "Save and turn on".
15. `--step $S --click-at 1320,266 --key Control+a --type "8"` -> 14.png. Value now 8.
16. `--step $S --click "Save and turn on"` -> 15.png. Top bar "17 of 77 nodes"; step row "shared_chapters is at least 8 / 77 to 17 nodes", ticked; Values: "Nodes showing 17 of 77", "Edges showing 19 of 254".
    Essay answer: with only pairs sharing 8 or more chapters, 17 of the 77 characters remain (19 ties).
17. `--step $S --click-at 274,327` -> 16.png. Step "off"; Values back to Nodes 77, Edges 254; the "17 of 77" is gone from the top bar.
18. `--end $S` -> session ended.

## In my own words

Did I finish? Yes, both parts. At least 5 shared chapters: 26 of 77 characters (51 ties). At least 8: 17 of 77 (19 ties). Both times I brought everyone back by unticking the step, which is kept and says "off".

Ease: 6 of 7.

What confused me:
- The filter was not in the toolbar, where I ran the ranking last time; I hovered one toolbar button before thinking of the Data tab. Once there, "Filters" with a plus was obvious.
- The edge table still lists all 254 ties while the filter is on, with nothing marking which are hidden. For a second I thought the filter had not worked on the table. A "showing 51 of 254" or a dimmed row would have made it my proof.
- "Save and turn on" when I edited the step was a good surprise: I did not have to tick it separately.
- What I liked: the line "Keeps edges that pass and the nodes at their ends" under the value, the step written out in plain words in the list ("shared_chapters is at least 5, 77 to 26 nodes") that I can screenshot for my instructor, and "26 of 77 nodes" in the top bar.
