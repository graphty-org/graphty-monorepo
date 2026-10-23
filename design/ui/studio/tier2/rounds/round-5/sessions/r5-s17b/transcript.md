# Session r5-s17b transcript

Participant: Ruth, returning (reporter). Task: the chain from Chloe to Milo in friends.csv with the fewest people in between: who, in order, and how many introductions.

Commands run from /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ and
S=tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s17b

## 01.png (start)
friends.csv is open, colored by a PageRank run I did before. No names drawn on the dots. Left panel has the find box "Find nodes, edges, values". I'll start with a name, as I always do: Chloe.

## Step 1 -> 02.png
`--step $S --click "Find nodes, edges, values" --type "Chloe"`
Found her: Nodes 1 (Chloe), Edges 4: Ava -> Chloe, Ben -> Chloe, Chloe -> Dev, Chloe -> Farah. Four ties. Arrows, so it is directional -- noted, but for introductions direction should not matter. Next: open Chloe to see her panel, and look for a way to ask how two people are linked.

## Step 2 -> 03.png (refused) and Step 3 -> 04.png
`--step $S --click "Chloe"` -- ambiguous, did nothing (the node and her four edges all say Chloe).
`--step $S --click "Chloe#1"` -- Chloe selected, highlighted at the bottom of the drawing. Right panel: id Chloe, Degree 4, PageRank 0.0555 (#4 of 20). 20 people in the sheet.
Next: there is a "..." menu by her name; maybe it offers "how is she linked to...". Try it.

## Step 4 -> 05.png
`--step $S --click-at 1419,74` (Node actions)
Menu: Neighborhood, Path between..., Frame selection, Add note. "Path between..." is my question in plain words. Clicking it.

## Step 5 -> 06.png
`--step $S --click "Path between..."`
A "Shortest path" box. From: Chloe (filled for me). To: "Where the path ends", already focused. Follow: Out / All, with All chosen -- good, an introduction works either way. Weight: None, "Each edge counts as 1" -- that is exactly "fewest people in between", said in words I can repeat. Typing Milo.

## Step 6 -> 07.png
`--step $S --type "Milo"`
One match offered: Milo. Picking it.

## Step 7 -> 08.png
`--step $S --click "role=option:Milo"`
From Chloe, To Milo, Follow All, Weight None. Focus moved to "Find path". Pressing it.

## Step 8 -> 09.png
`--step $S --click "Find path"`
Answer in names, right-hand panel, "Nodes in order": 1 Chloe, 2 Ava, 3 Ivan, 4 Kofi, 5 Milo. Summary: Path 5 nodes, 4 edges; left list says "Shortest path 4 hops". Made with: Shortest path, From Chloe, To Milo, Follow All, Weight None, "Each edge counts as 1". The drawing shows a black chain of five dots. So: three people in between (Ava, Ivan, Kofi), four introductions.
First link, Chloe-Ava, already held: "Ava -> Chloe" was in Chloe's edge list in 02.png. Now I check a middle link, Ivan to Kofi, from Ivan's own record.

## Step 9 -> 10.png
`--step $S --click "Find nodes, edges, values" --type "Ivan"`
Ivan's edges: Gus -> Ivan, Hana -> Ivan, Ivan -> Jada, Ivan -> Kofi, Ivan -> Ava. Both of Ivan's links in the chain hold: Ivan -> Ava and Ivan -> Kofi are in the sheet. Together with Ava -> Chloe from earlier, three of the four links are confirmed by what the program shows about the people. Several links run against the arrow (Ava -> Chloe, Ivan -> Ava); that is fine for an introduction, and the box said it followed All directions, so I know why. That is enough. Ending.

## --end -> further request
`--end $S` answered: "Ben now wants to be introduced to Nora the same way. Who is in that chain, in order, and how many introductions does it take?"
Same route as before: find Ben, open his actions, Path between.

## Step 10 -> 11.png
`--step $S --click "Find nodes, edges, values" --key Control+a --type "Ben"`
Ben: Ava -> Ben, Ben -> Chloe, Ben -> Eli, Theo -> Ben. Selecting the Ben node row.

## Step 11 -> 12.png
`--step $S --click "role=option:Ben"`
Ben selected (lower left, yellow ring). Degree 4, PageRank 0.04697 #14 of 20. Opening Node actions -> Path between...

## Step 12 -> 13.png
`--step $S --click "Node actions" --click "Path between..."`
Same box, From: Ben, To focused, Follow All, Weight None. Typing Nora and picking her.

## Step 13 -> 14.png
`--step $S --type "Nora"`
One match, Nora. Picking it, then Find path.

## Step 14 -> 15.png
`--step $S --click "role=option:Nora" --click "Find path"`
Nodes in order: 1 Ben, 2 Theo, 3 Ravi, 4 Pia, 5 Nora. Path 5 nodes, 4 edges; 4 hops. From Ben, To Nora, Follow All, Weight None. Three people in between (Theo, Ravi, Pia), four introductions. The black chain on the drawing runs up the left side and across the top.
Link check: Ben-Theo holds -- "Theo -> Ben" was in Ben's edge list in 11.png.
One thing I noticed: the left list still shows a single "Shortest path" row, and the Chloe-to-Milo chain is no longer drawn. The new run seems to have replaced the first one rather than sitting beside it. I had written the first chain down, so no harm here, but I would not have expected it to go without saying so. I can't confirm from the screen whether the first run is kept anywhere.
Done. Ending.

`--end $S` -- session ended.

## In character, at the end

Did I finish? Yes, both.
- Chloe to Milo: Chloe -> Ava -> Ivan -> Kofi -> Milo. Three people in between, four introductions. Links checked: Chloe-Ava (Ava -> Chloe in Chloe's list), Ava-Ivan and Ivan-Kofi (Ivan -> Ava, Ivan -> Kofi in Ivan's list). All held.
- Ben to Nora: Ben -> Theo -> Ravi -> Pia -> Nora. Three people in between, four introductions. Link checked: Ben-Theo (Theo -> Ben in Ben's list). Held.

Ease: 6 of 7. "Path between..." sat in the menu by the person's name, and the answer came as names in order with the settings it used written underneath ("Each edge counts as 1", "Follow All"). That is a result I can explain to an editor.

What confused me:
- Clicking "Chloe" in the find results was refused because her four ties also say Chloe; a person would just click the top row.
- The answer is counted as "5 nodes, 4 edges" and "4 hops". I had to turn that into "three people in between, four introductions" myself. Fine for me, but "hops" is not my word.
- Running the second chain replaced the first: only one "Shortest path" row in the list, and the Chloe-Milo chain vanished from the drawing without a word. If I had not written it down, I would have had to run it again.
- The first time, I had to find "Path between..." behind the unlabeled "..." button; I only looked there because it sat beside her name.
