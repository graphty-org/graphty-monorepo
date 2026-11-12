# Session r3-s31 -- Explorer Elena, returning user

Task as given: friends.csv (running club) is already open. Find the chain from Chloe to Milo with
the fewest people in between: who is in it, in order, and how many introductions it takes.

All commands ran from the studio worktree with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/` and the
session folder `tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s31` (written `.../r3-s31` below).

## Step 01 -- start

    node design/ui/studio/tool/real.mjs --start .../r3-s31 setup:friends-ranked.txt

The start waited several minutes for a free browser slot (the machine's four slots were held by test
and capture runs), then wrote 01.png.

01.png: graph "friends", about 20 orange dots of different sizes with arrows, no names on them. The
legend says Size: PageRank and Color: PageRank, 0.03779 to 0.06394. The left list has Selection,
PageRank 20 and Everything. The right panel shows PageRank's Style tab.
- "My running club. Orange dots, no names. Last time I used the find box, so I'll type Chloe."

## Step 02

    real.mjs --step .../r3-s31 --click "Find nodes, edges, values" --type "Chloe"

02.png: the box lists Nodes 1 (Chloe) and Edges 4: Ava -> Chloe, Ben -> Chloe, Chloe -> Dev, Chloe -> Farah.
- "OK, she knows Ava, Ben, Dev and Farah. Milo isn't one of them. I'll click Chloe and see if there's
  something on her about getting to someone."

## Step 03

    real.mjs --step .../r3-s31 --click "role=option:Chloe"

03.png: Chloe is highlighted at the bottom of the picture (yellow ring). The right panel shows Chloe,
Node; Summary: id Chloe, Degree 4; Results: PageRank 0.0555, #4 of 20.
- "There she is, bottom middle. Nothing here about getting to Milo. Maybe the three-dots menu next to
  her name has something."

## Step 04

    real.mjs --step .../r3-s31 --click-at 1419,73      (button "Node actions")

04.png: a menu with Neighborhood, Path between..., Frame selection and Add note.
- "Path between! That's exactly it. Clicking that."

## Step 05

    real.mjs --step .../r3-s31 --click "Path between..."

05.png: a "Shortest path" box: From Chloe, To "Where the path ends", Follow Out / All (All picked),
Weight None ("Each edge counts as 1"), Advanced, and a Find path button.
- "From Chloe is filled in. I'll type Milo in To. I want the fewest people, so 'each counts as 1'
  sounds right; I'll leave the rest."

## Step 06

    real.mjs --step .../r3-s31 --click "Where the path ends" --type "Milo"

06.png: a suggestion list under To shows "Milo".
- "It found Milo. Picking him."

## Step 07

    real.mjs --step .../r3-s31 --click "role=option:Milo"

07.png: From Chloe, To Milo, Follow All, Weight None. The Find path button has focus.
- "Chloe to Milo. Find path."

## Step 08

    real.mjs --step .../r3-s31 --click "Find path"

08.png: the path is drawn in black, from the bottom middle up to the right. The legend gains
"Shortest path", and the left list gains "Shortest path  4 hops". The right panel shows Summary: Path
5 nodes, 4 edges; Nodes in order: Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5; Made with: From Chloe, To
Milo, Follow All, Weight None.
- "There it is, in order: Chloe, Ava, Ivan, Kofi, Milo. Three people in between, four introductions --
  the side list even says 4 hops. That's my answer."
- (She does not think about direction: the arrow between Ava and Chloe points toward Chloe, but All was
  already picked.)

## End, first try

    real.mjs --end .../r3-s31

--end did not end the session. It gave a further request, which is part of this session:
"Ben now wants to be introduced to Nora the same way. Who is in that chain, in order, and how many
introductions does it take?"

## Step 09

    real.mjs --step .../r3-s31 --click "Find nodes, edges, values" --type "Ben"

- "Same thing again, Ben to Nora. I'll find Ben the way I found Chloe and use the same menu."

09.png: Nodes 1 (Ben), Edges 4: Ava -> Ben, Ben -> Chloe, Ben -> Eli, Theo -> Ben. The Chloe-Milo
path is still drawn in black.
- "Ben. Click him, then the dots menu again."

## Step 10

    real.mjs --step .../r3-s31 --click "role=option:Ben"

10.png: Ben is ringed at the lower left. The right panel shows Ben, Degree 4, PageRank #14 of 20. The
Chloe-Milo path is still black.
- "Got Ben. Dots menu, Path between."

## Step 11

    real.mjs --step .../r3-s31 --click "Node actions" --click "Path between..."

11.png: the Shortest path box again: From Ben, To empty, Follow All, Weight None.
- "Same box, Ben already in. Nora in To."

## Step 12

    real.mjs --step .../r3-s31 --click "Where the path ends" --type "Nora" --click "role=option:Nora"

12.png: From Ben, To Nora, Follow All, Weight None.
- "Ben to Nora. Find path."

## Step 13

    real.mjs --step .../r3-s31 --click "Find path"

13.png: a new black path runs from Ben (lower left) up the left side and over to the top. The right
panel shows Path 5 nodes, 4 edges; Nodes in order: Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5; From Ben, To
Nora, Follow All, Weight None. The left list still has a single "Shortest path  4 hops" row, and the
Chloe-Milo line is no longer drawn.
- "Ben, Theo, Ravi, Pia, Nora. Also three people in between, four introductions."
- "Huh, Chloe's line is gone -- it swapped the old one for this one. Fine, I already wrote that one down."

## Step 14 -- end

    real.mjs --end .../r3-s31

The session ended, and its folder was copied to design/ui/studio/tier2/rounds/round-3/sessions/r3-s31.

## In her own words, at the end

- Did I finish? Yes, both.
  - Chloe to Milo: Chloe -> Ava -> Ivan -> Kofi -> Milo. Three people in between, four introductions.
  - Ben to Nora: Ben -> Theo -> Ravi -> Pia -> Nora. Three people in between, four introductions.
- Ease: 6 out of 7.
- What confused me: nothing on the screen said "path" until I opened the little three-dots menu next to
  Chloe's name, and I only tried it because I had run out of other ideas. Once I found "Path between",
  the box already had her name in it, and the numbered list on the right was exactly what I wanted. The
  dots still have no names on them, so I had to trust the list on the right rather than the picture.
  And the second path quietly replaced the first one -- if I hadn't written Chloe's down, I'd have lost it.
