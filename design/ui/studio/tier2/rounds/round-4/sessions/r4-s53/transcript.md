# Session r4-s53 -- Jordan, marketing network analyst (returning user)

Task: Les Miserables is open. Go to the police inspector Javert, read what the program knows about him, and see which characters he shares chapters with. Say who they are and how many.

Session folder (screenshots): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s53/

## Start

```
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs --start <session> setup:lesmis-ranked.txt
```

01.png: Les Miserables network open, a PageRank run already on it (77 nodes), size and color by PageRank, legend top-left. Find box top-left: "Find nodes, edges, values". No labels on the canvas, so I cannot spot Javert by eye.

## Step 1 -- find Javert

Thinking: no labels on the dots, so I do what I always do -- the find box.

```
node real.mjs --step <session> --click "Find nodes, edges, values" --type "Javert"
```

02.png: list shows "Nodes 1: Javert" and "Edges 17" (Javert -- Valjean, Fantine, Thenardier, MmeThenardier, Cosette, Fauchelevent -- Javert, more below a scrollbar). 17 edges already looks like my answer, but I want his own panel first.

## Step 2 -- open Javert

Thinking: click the Javert row to get his own panel.

```
node real.mjs --step <session> --click-at 115,153     # option "Javert"
```

03.png: right panel now "Javert -- Node", Values tab. Summary: id Javert, name Javert, Degree 17 (with a ">" arrow). Results: PageRank 0.0303, #5 of 77. He is selected and glows on the canvas. So the program knows: his name, 17 connections, and he ranks fifth of 77 on PageRank. Fine. The Degree row has an arrow -- probably the list of who.

## Step 3 -- his connections

Thinking: the arrow on Degree 17 should give me the names.

```
node real.mjs --step <session> --click-at 1320,242     # button "Degree 17"
```

04.png: panel now "Javert -- Neighborhood", "Back to Javert", heading "Javert and 17 connections", Hops 1 / 2 / 3 (1 selected), "Filter to neighbors" button, then an alphabetical list: Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint, Valjean, Woman1, Woman2. I counted them: 17, matching the heading and the 17 edges from the find box. The 17 neighbors glow on the canvas and the left panel's Selection says 18 (him plus 17). That is my answer. I did not need the Hops 2 / 3 buttons.

Off-topic, in character: this is exactly the "one customer's circle" view I use for accounts, and it would be faster still if my listening suite's export kept the mention counts instead of just yes/no ties -- since the X API went paid I lose half the context in every export anyway.

## End

```
node real.mjs --end <session>
```

Session ended normally ("session ended"), no further request.

## Debrief (in character)

- **Finished?** Yes. Javert is the police inspector node; the program knows his id and name (Javert), his Degree (17 connections) and his PageRank, 0.0303, fifth of 77. He shares chapters with 17 characters: Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint, Valjean, Woman1 and Woman2.
- **Ease: 6 of 7.** Three clicks, same path I use for a customer's circle: find box, his row, the Degree arrow. The heading "Javert and 17 connections" agreed with my own count, which is what I check before I trust a number.
- **What confused me / what I would change.** Nothing blocked me. Small things: the Degree row is only a link because of a tiny ">" at the right edge -- if I had not used it before I would not have guessed that is where the names live. The find box already showed "Edges 17" under the search, which was a second place to read the same answer, and I briefly wondered whether 17 edges and 17 people are always the same (two ties to one person would break that); the neighborhood list settled it. The list has no PageRank next to each name, so I cannot rank his circle without going to another view -- for an influencer shortlist I would want that column right there.
