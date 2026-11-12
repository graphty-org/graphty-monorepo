# Session r4-s47 -- Ruth, returning (reporter)

Task: friends.csv (running club) is open. Ava wants to invite the people she runs with, and the people they run with. How many is that, not counting Ava? Then change the drawing to only Ava and those people.

Session folder: tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s47 (all commands use REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/)

## Steps

0. `real.mjs --start <folder> setup:friends-ranked.txt` -> 01.png. I see friends.csv open, 20 dots, a PageRank measure run, colored and sized. No names on the dots. Search box top left. I start with a name: Ava.
1. `--step --click "Find nodes, edges, values" --type "Ava"`
   -> 02.png. Search lists 1 node, Ava, and 6 ties: Ava->Ben, Ava->Chloe, Ava->Dev, Sana->Ava, Theo->Ava, Ivan->Ava. So 6 people she runs with (arrows go both ways; for running together I count them all). Next: open Ava to see her panel.
2. `--step --click "Ava"`
   -> ambiguous name, nothing happened. Retry with the first one.
3. `--step --click "Ava#1"`
   -> 04.png. Ava selected (glow on the small dot), right panel: id Ava, Degree 6, PageRank #20 of 20. Selection count 1. I need her runners and theirs. Try the panel menu "..." for something like "select neighbors".
4. `--step --click-at 1419,74` (the ... menu by Ava)
   -> 05.png. Menu: Neighborhood (G), Path between... (P), Frame selection (F), Add note (N). "Neighborhood" is the word for my question. Click it.
5. `--step --click "Neighborhood"`
   -> 06.png. "Ava and 6 connections", Hops 1/2/3, Follow Out/In/All (All on), "Filter to neighbors" button, list Ben 3, Chloe 5, Dev 2, Ivan 1, Sana 1, Theo 1 (weight). Selection now 7. Her runners plus theirs = 2 hops. Click Hops 2.
6. `--step --click "2"` (Hops)
   -> ambiguous, nothing happened. Use the radio.
7. `--step --click "2#1"`
   -> tool asked for the kind. Use role=radio:2.
8. `--step --click "role=radio:2"`
   -> 09.png. "Ava and 14 connections". Names listed: Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo -- I count 14 names myself. Selection reads 15 (Ava plus 14). Answer: 14, not counting Ava. The weights column is gone at 2 hops, fine. Now press "Filter to neighbors" to make the drawing just these.
9. `--step --click "Filter to neighbors"`
   -> 10.png. Top bar now says "15 of 20 nodes" with a filter icon; 5 dots gone from the top right. Legend says "PageRank, full graph" -- good, it tells me the sizes still count the whole club. Filter button greyed (already applied). Before I trust it I check one link: Eli is on the list but not one of her six. Search Eli to see who ties him in.
10. `--step --click "Find nodes, edges, values" --type "Eli"`
   -> 11.png. Eli: Ben -> Eli, Dev -> Eli, Eli -> Farah. Ben and Dev are two of Ava's six, so Eli is in by two links. The link held. Drawing still shows 15 of 20. I am done; ending.
11. `--end`
   -> session ended, no further request.

## In character, at the end

**Finished?** Yes. 14 people, not counting Ava: Ben, Chloe, Dev, Ivan, Sana and Theo run with her, and Eli, Farah, Gus, Hana, Jada, Kofi, Quinn and Ravi run with them. The drawing shows only those 15 ("15 of 20 nodes" at the top).

**Ease: 6 of 7.** The "..." menu next to her name had "Neighborhood", which is exactly the word I would use. "Hops" took me a second, but 1 hop listed her six by name, so 2 was obviously "and theirs". "Ava and 14 connections" gave me the count without making Ava part of it, and I counted the 14 names myself. "Filter to neighbors" did the second half in one click, and the legend changed to "PageRank, full graph", which told me the sizes still measure the whole club rather than the filtered map. Checking a link was easy: searching Eli showed Ben -> Eli and Dev -> Eli.

**What confused me:**
- "Connections" in "Ava and 14 connections" means people, but on the left "Edges" also lists ties. At 2 hops those 14 are not all directly connected to her. I would call them "people within 2 steps".
- At 1 hop the list had a "weight" column. At 2 hops the column disappeared and nothing said why.
- The arrows point one way (Ava -> Ben, Sana -> Ava), but for running together direction does not matter. I left Follow on "All", which was already selected. I can't confirm what "Out" or "In" would have counted.
- The menu that has Neighborhood is hidden behind "..." with no label. I found it only because I tried it.
- The dots still have no names on the drawing. To read who is who I had to use the list on the right.
