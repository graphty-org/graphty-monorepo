# Session r3-s55 -- Ruth, returning

Task: the Les Miserables network is open. Go to Javert, read what the program knows about him, and see which characters he shares chapters with. Report who and how many.

Every command ran from the studio worktree with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/`
and `$S` set to this session's working folder, as the briefing gave it.

## Step 0 -- start

    node design/ui/studio/tool/real.mjs --start $S setup:lesmis-ranked.txt

Output: build 26f3bb968 (graphty 0.8.61), 01.png. Saw: the map, a PageRank run selected in the left list, its legend on the canvas, the find box at top left.

## Step 1 -- type Javert in the find box

Ruth: "Find box, top left. Same as last time."

    node design/ui/studio/tool/real.mjs --step $S --click "Find nodes, edges, values" --type "Javert"

Result (02.png): "Nodes 1: Javert" and "Edges 17", listing Javert -- Valjean, Fantine, Thenardier, MmeThenardier, Cosette, Fauchelevent -- Javert and more below. Seventeen ties already, but this is a search list, not his record.

## Step 2 -- click "Javert"

    node design/ui/studio/tool/real.mjs --step $S --click "Javert"

Result: refused as ambiguous (18 matches: the node row plus the 17 edge rows, which all contain "Javert"), nothing happened (03.png). A person would just click the top row; the tool needed me to pick one.

## Step 3 -- press Enter on the highlighted Javert row

Ruth: "The top row is highlighted. Enter."

    node design/ui/studio/tool/real.mjs --step $S --key Enter

Result (04.png): Javert selected with a halo on the map. Right panel: Node. Summary: id Javert, name Javert, Degree 17 (with an arrow). Results: PageRank 0.0303, #5 of 77. That is what the program knows about him.

## Step 4 -- click "Degree"

Ruth: "Degree 17 has an arrow. Last time that opened who they're tied to."

    node design/ui/studio/tool/real.mjs --step $S --click "Degree"

Result (05.png): Neighborhood panel, "Javert and 17 connections", Hops 1 / 2 / 3 (1 chosen), a "Filter to neighbors" button, and 17 names in alphabetical order: Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint, Valjean, Woman1, Woman2. Counted aloud: 17. That matches "Edges 17" in the search and Degree 17. The left list's Selection says 18 (him plus 17). The map haloes them.

Ruth: "Says who? Nothing here says a tie means sharing a chapter."

## Step 5 -- open the Javert -- Valjean tie

    node design/ui/studio/tool/real.mjs --step $S --click "Find nodes, edges, values" --type "Javert" --click "Javert -- Valjean"

Result (06.png): Edge record: From Javert, To Valjean, shared_chapters 17; the tie is drawn in blue on the map. So a tie here means the two share chapters, and the tie carries how many. That answers my question from the data itself.

## Step 6 -- end

    node design/ui/studio/tool/real.mjs --end $S

Output: session ended.

## In character, at the end

Did I finish? Yes. Javert shares chapters with 17 characters: Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint, Valjean, Woman1, Woman2. What the program knows about him: id and name Javert, degree 17, PageRank 0.0303, fifth of 77. I checked one tie: Javert -- Valjean is recorded as 17 shared chapters, so the ties are shared chapters.

Ease: 6 of 7.

What confused me:
- The degree count and the connection list never say what a connection is. I had to open a tie to learn it means "shared chapters". A line such as "17 characters he shares a chapter with" would have saved that check.
- His 17 connections and his 17 shared chapters with Valjean are two different 17s. Easy to mix up when reading a number to an editor.
- The search list puts the node and its 17 ties together; picking the person meant pressing Enter on the highlighted top row.
- The connection list gives names only. To see how many chapters each one shares with him, I would have to open each tie one at a time.
