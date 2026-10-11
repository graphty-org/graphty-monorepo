# Session r5-s55b -- Ruth, returning

Task: go to Javert, read what the program knows about him, and list the characters he shares chapters with, and how many.

All commands run from the studio worktree with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/`, `T=design/ui/studio/tool`, `S=tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s55b`.

## 01 (start)
Les Miserables is open, colored by a PageRank run. Find box at top left. I start with a name.

## Step 1
`node $T/real.mjs --step $S --click "Find nodes, edges, values" --type "Javert"` -> 02.png
Nodes 1 (Javert), Edges 17: Javert -- Valjean, Fantine, Thenardier, MmeThenardier, Cosette, Fauchelevent -- Javert, more below. Seventeen ties. I'll open Javert himself to read the right-hand side.

## Step 2
`node $T/real.mjs --step $S --click "Javert"` -> 03.png. Refused as ambiguous: 18 things are called Javert (the node and 17 ties). No change.

## Step 3
`node $T/real.mjs --step $S --click "role=option:Javert"` -> 04.png
Javert selected, highlighted on the drawing. Right panel, Values: id Javert, name Javert, Degree 17 (with an arrow), Results: PageRank 0.0303, #5 of 77. Degree is a count of connections -- 17, matches the 17 edges in the find list. I'll open Degree to get the names.

## Step 4
`node $T/real.mjs --step $S --click "Degree"` -> 05.png
The panel turns into "Javert and 17 connections", Hops 1 / 2 / 3, a "Filter to neighbors" button, and the names, alphabetical: Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint, Valjean, Woman1, Woman2. I count them aloud: 17. Selection on the left says 18 -- Javert plus 17, fine. The drawing rings the same nodes.
Check one link: Valjean. The find list in step 1 showed a tie "Javert -- Valjean". Held.

## End
`node $T/real.mjs --end $S` -- session ended.

## In character, at the end
- Finished: yes. Javert shares chapters with 17 characters: Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint, Valjean, Woman1, Woman2. What else the program knows about him: id and name Javert, Degree 17, PageRank 0.0303, ranked #5 of 77.
- Ease: 6 of 7. Three moves: type the name, pick him, open Degree. Three counts agreed (17 edges in the find list, Degree 17, "Javert and 17 connections"), so I could check the number without counting dots.
- What confused me:
  - Nothing on screen says a tie means "shares a chapter". I took that from the task. Says who? I can't confirm it from the program.
  - "Degree" is a number with a small arrow; I only knew to click it because it is the one row with an arrow. "Connections" would have told me sooner.
  - Typing his name gave 18 lines starting with "Javert" -- him and every tie. The person row is at the top under "Nodes 1", which helped, but the list of ties is long.
  - PageRank "#5 of 77" -- 77 is everyone, I assume. The panel doesn't say what PageRank counted.
