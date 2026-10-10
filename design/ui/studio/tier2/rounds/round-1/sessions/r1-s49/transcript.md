# Session r1-s49 -- Jordan (marketing network analyst, returning), task T23 A (running club, friends.csv)

Build: 946256efb876 (frozen copy tier2-r1d4-946256efb). Start: setup friends-ranked.txt.

Commands are run from design/ui/studio/tier2 with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/ and S=rounds/round-1/sessions/r1-s49.

## Step 1 -- start

`node ../tool/real.mjs --start $S setup:friends-ranked.txt` -> 01.png

What I see: the running club map is open, ranked by PageRank, dots colored and sized by it, a key top left. No names on the dots. Left panel: Selection, PageRank (20), Everything, and the find box. OK, so Ava's party: the people she runs with, plus their running partners. Two steps out. I have never asked this thing for two steps out. First I'll do what I always do: type her name in the find box and read her list of connections.

## Step 2 -- type Ava in the find box

`--step $S --click "Find nodes, edges, values" --type "Ava"` -> 02.png

What I see: the find box lists Ava and six ties: Ava -> Ben, Chloe, Dev; Sana, Theo, Ivan -> Ava. Arrows, which is odd for "runs with" (running together goes both ways), so I count both directions: her own partners are Ben, Chloe, Dev, Sana, Theo, Ivan -- 6. Now I need their partners too. I'll open Ava herself and see if her page offers anything for "and their friends".

## Step 3 -- open Ava

`--step $S --click "Ava"` (tool: ambiguous, took the first, the node) -> 03.png

What I see: Ava is highlighted on the map (small dot, bottom middle, #20 of 20 on PageRank -- funny, the party planner is the least "influential"). Right panel: Summary, id Ava, Degree 6 with an arrow. That arrow is where her list of connections lives, from last time. Opening it.

## Step 4 -- open Ava's list of connections (Degree)

`--step $S --click "Degree"` -> 04.png

What I see: "Ava's 6 connections" -- Ben, Chloe, Dev, Ivan, Sana, Theo, with run counts. Same six I counted. Selection on the left says 7 (Ava plus 6), and they glow on the map. New since last time: a row "Hops 1 2 3", a "Follow Out In All" row (All is on, good, running is mutual) and a "Filter to neighbors" button. "Hops" -- I know that from the listening tool's "degrees of separation" talk; 2 hops should be friends of friends. Trying 2.

## Step 5 -- Hops 2

`--step $S --click "2"` (tool: ambiguous with "Dev 2", took the first, the Hops 2 choice) -> 05.png

What I see: heading now "Ava's 14 connections within 2 hops", Selection says 15, and most of the map glows; five dots on the top right do not. The list: Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo. So the answer is 14, not counting Ava. Quick sanity check: my six direct partners are all in there, plus eight more, fine. Small gripe: the run-count column disappeared and nothing marks who is a direct partner and who is a friend-of-a-friend -- for an invite list I'd want that. Now the second half: a map with only these people. "Filter to neighbors" sounds like it.

## Step 6 -- Filter to neighbors

`--step $S --click "Filter to neighbors"` -> 06.png

What I see: the five unlit dots at the top right are gone; the map has only the glowing ones. The top bar now says "15 of 20 nodes" with a little funnel icon, which is Ava plus her 14. That is the drawing I was asked for. One thing: the PageRank row on the left swapped its chart icon for a clock-with-arrow icon. Is it telling me my ranking is stale now? I'll hover it before I believe the colors on this smaller map.

## Step 7 -- hover the PageRank row's new icon

`--step $S --hover-at 81,156` -> 07.png. Tool printed: treeitem "PageRank, out of date"; tooltip "Ran on 20 nodes; 15 shown now".

What I see: fine, that is honest -- the colors still come from the whole club. For the party map that doesn't matter. I have the number and the drawing. Done.

`node ../tool/real.mjs --end $S`

## Wrap-up (in character)

- **Finished?** Yes. Answer: 14 people, not counting Ava (Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo). The drawing then had only Ava and those 14 ("15 of 20 nodes").
- **Ease:** 6 of 7. Four moves from the find box: Ava, her Degree, Hops 2, Filter to neighbors. It went through the same list of connections I always use, which is why I found it at all; I would never have gone looking in a menu for this.
- **What confused me or slowed me down:**
    - "Hops" is jargon. I happen to know it; a lot of my team would not. "1 / 2 / 3" with no hint of "friends of friends" took me a second.
    - At 2 hops the list drops the run counts and doesn't mark who is a direct partner and who is one step further. For an invite list, Ava's own runners vs. friends-of-friends is exactly the split I'd want to see.
    - The arrows on the ties: running together is mutual, so I worried the count would depend on direction. "Follow: All" was already on, so it worked out, but I only trusted it because I saw "All" lit.
    - The PageRank row's icon change after narrowing: I noticed it but had to hover to learn it means "ran on 20, 15 shown". Fair, just quiet.
    - Not asked, but: I didn't see how to bring the whole club back from here. The funnel in the top bar is probably it.
