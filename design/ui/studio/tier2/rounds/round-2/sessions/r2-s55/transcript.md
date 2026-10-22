# Session r2-s55 -- Jordan (returning marketing analyst), task T12R, dataset A (Les Miserables)

Build: tier2-r2d4-8f0d5a6f7 (commit 8f0d5a6f7791). Tool run from design/ui/studio/tool, S=../tier2/rounds/round-2/sessions/r2-s55.

## Start

`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/ ./with-browser.sh node real.mjs --start $S setup:lesmis-ranked.txt` -> 01.png

01.png: Les Miserables is open, colored and sized by PageRank, with the PageRank run selected on the left and its Style on the right. No names drawn on the dots. Like last time, I'll type the name into the find box at the top left.

## Step 2

`node real.mjs --step $S --click "Find nodes, edges, values" --type "Javert"` -> 02.png

02.png: The find box lists "Nodes 1: Javert" and "Edges 17" (Javert -- Valjean, Fantine, Thenardier...). 17 ties already, nice. I'll click Javert himself to open what the program knows about him, like I used to.

## Step 3

`node real.mjs --step $S --click "Javert"` -> 03.png (tool refused: the name matched the node row and all 17 edge rows; nothing happened. Tool-side only -- a person would just click the top row.)

Clicking the first row, the one that is just "Javert".

## Step 4

`node real.mjs --step $S --click "Javert#1"` -> 04.png

04.png: Javert is selected (glowing dot near the middle), and the right panel shows his Values: id and name Javert, Degree 17, and under Results PageRank 0.0303, #5 of 77. The Degree row has a little arrow -- that's where his list of connections lives, as I remember. Clicking it.

## Step 5

`node real.mjs --step $S --click "Degree"` -> 05.png

05.png: The panel now reads "Javert and 17 connections" with a "Back to Javert" link, and the list of names: Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint, Valjean, Woman1, Woman2. I counted 17, matching the header and the Degree. The whole list fits without scrolling, and his circle glows on the drawing. There's a new "Hops 1 / 2 / 3" switch and a "Filter to neighbors" button above the list -- I didn't need them; Hops was already on 1, so the list was just his direct ties. I also noticed the Selection count on the left went from 1 to 18, so opening the list selected his whole circle; harmless here, but I didn't ask for it. That's my answer, so I'm done.

## End

`node real.mjs --end $S`

## Debrief (in character)

- **Finished?** Yes. Javert: Degree 17, PageRank 0.0303 (#5 of 77). He shares chapters with 17 characters: Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint, Valjean, Woman1, Woman2.
- **Ease:** 7 of 7. Same route as last time: find box, click the name, click Degree, read the list. Four clicks.
- **What confused me, a little:**
  - The find box dropdown lists 17 "Javert -- X" edge rows under the one node row. Fine, and it even told me the count early, but the actual person row is easy to miss among them.
  - "Hops 1 2 3" and "Filter to neighbors" are new on the connections list. I didn't need them and they didn't get in the way, but I'm not sure what Filter to neighbors would do to my drawing, so I left it alone.
  - Opening the list quietly changed my Selection from 1 to 18. I only noticed because the number on the left jumped.
