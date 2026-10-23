# Session r4-s45 -- Nadia, returning user

Task: friends.csv is open. Ava's party: the people she runs with and the people they run with. How many, not counting Ava? Then change the drawing to show only Ava and those people.

Session folder (screenshots): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s45

## Steps

### Start
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs --start .../r4-s45 setup:friends-ranked.txt` -> 01.png

01.png: the friends network is open, colored and sized by PageRank, no names on the dots. Left panel has a find box, Selection, PageRank, Everything. I'll do what I always do: type the name into the find box.

### Step 1
`--step ... --click "Find nodes, edges, values" --type "Ava"` -> 02.png

02.png: the find list shows Ava and 6 edges: Ava -> Ben, Chloe, Dev; Sana, Theo, Ivan -> Ava. So six people she runs with directly (arrows both ways; "runs with" I take as either direction). Next: click Ava in the list to get her connections panel on the right, like I do with an alerted account.

### Step 2
`--click "Ava"` -> 03.png: refused as ambiguous (the node and all six edges match). Nothing changed.

### Step 3
`--click-at 107,153` (the Ava row) -> 04.png

04.png: Ava is selected (small dot, glowing), right panel shows Degree 6 with an arrow. That's the six. Now I need their friends. There's a "..." menu at the top right of Ava's panel -- maybe it has something like "select connected". Trying it.

### Step 4
`--click-at 1419,73` ("Node actions") -> 05.png

05.png: a menu: Neighborhood (G), Path between..., Frame selection, Add note. "Neighborhood" sounds like exactly "her people and their people". Clicking it.

### Step 5
`--click "Neighborhood"` -> 06.png

06.png: "Ava and 6 connections", Hops 1/2/3 (1 chosen), Follow Out/In/All (All chosen), a "Filter to neighbors" button, and a list Ben, Chloe, Dev, Ivan, Sana, Theo. Selection says 7. "Hops" -- one hop from Ava, I assume. The people they run with would be 2 hops. Clicking 2.

### Step 6
`--click-at 1350,178` (Hops "2") -> 07.png

07.png: "Ava and 14 connections", list of 14 names (Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo), Selection 15 (Ava plus 14). So the answer is 14, not counting Ava. Follow is on All, which I want -- running together has no direction. Now "Filter to neighbors" should make the drawing just these people. Clicking it.

### Step 7
`--click "Filter to neighbors"` -> 08.png

08.png: the five people outside the circle are gone; the top bar now says "15 of 20 nodes" with a filter icon, and the button went gray. The key says "PageRank, full graph" and the PageRank row's icon changed to a little clock -- I read that as "these numbers are from before you filtered", which is fine for me. The bar saying "15 of 20" tells me the other five are hidden, not deleted, which is what I'd worry about in a case file. That's both parts done. Ending.

### End
`--end .../r4-s45` -> session ended, no further request.

## Debrief (in character)

- **Finished?** Yes. 14 people besides Ava (Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo), and the drawing now shows only those 15 ("15 of 20 nodes").
- **Ease:** 6 of 7. Seven clicks, under the length of one alert. I never knew the Neighborhood item was behind the "..." on a person's panel; I only opened it because I had nothing else to try. If it hadn't been there I'd have read six lists of connections and counted by hand.
- **What confused me:**
  - Clicking "Ava" in the find results was ambiguous because her name is in every edge row; I had to aim at her own row.
  - "Hops" -- I guessed it meant hops from Ava. The header "Ava and 14 connections" confirmed it, but "connections" made me pause: these aren't all her connections, eight of them are friends of friends.
  - The PageRank row's icon changed to a clock and the key says "full graph" after the filter. I think that means the scores weren't redone for the 15, but nothing told me so in words.
  - "Filter to neighbors" grayed out after I clicked it. I can't tell from that button how to undo it; the "15 of 20 nodes" up top is the only sign, and I would look there to get the others back.
