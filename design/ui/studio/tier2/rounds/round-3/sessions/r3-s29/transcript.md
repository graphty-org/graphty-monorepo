# Session r3-s29 -- Grace, returning (running club: shortest chain from Chloe to Milo)

Session folder: design/ui/studio/tier2/rounds/round-3/sessions/r3-s29 (screenshots 01-13, logs)
Build: tier2-r3d2-26f3bb968 (commit 26f3bb968, graphty@0.8.61)
Every command below ran as `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs <args> <session folder>`.

## Start

`--start <folder> setup:friends-ranked.txt` (it waited for a free browser slot first).

01.png: friends.csv is open with my PageRank ranking from before -- dots colored and sized by it, key at top left. No names on the dots. Left panel: Selection, PageRank (20), Everything. Toolbar at the bottom: a flask, a chart icon, 3D, search.

Grace: "Okay, my club map, still ranked. No names though. I need the shortest chain Chloe to Milo. Last time the analysis was the flask button in the toolbar, so let me try there first."

## Step 1

`--step <folder> --click-at 679,864` -> button "Analyze". 02.png: a popover with a "Filter analyses" box, Recent (PageRank), then "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank "Start here", Eigenvector, Katz, HITS, All-pairs distance..., each with a plain one-line description.

Grace: "Lots of rankings. I don't want a ranking, I want a route. Let me type 'path' in the filter."

## Step 2

`--step <folder> --type "path"`. 03.png: Betweenness, Edge betweenness, All-pairs distance, and under "Find paths and edge sets": "Shortest path" (Start here) -- "The fewest steps, or the shortest path by weight, between two nodes." -- and "Guided route" (greyed, "Select 2 nodes first").

Grace: "Shortest path, fewest steps. Exactly what I want."

## Step 3

`--step <folder> --click "Shortest path"`. 04.png: a "Shortest path" form: From ("Where the path starts", with a pick-on-map button), To ("Where the path ends"), Follow Out / All (All on), Weight None -- 'Each edge counts as 1; "weight" has no meaning set.' -- Advanced, and "Find path".

Grace: "Weight None means every tie counts the same, so it's fewest people. Follow All, fine -- introductions go both ways. Typing Chloe."

## Step 4

`--step <folder> --click "Where the path starts" --type "Chloe"`. 05.png: a suggestion "Chloe" drops down under From.

Grace: "There she is. Pick her."

## Step 5

`--step <folder> --click-at 555,609` -> option "Chloe". 06.png: From reads Chloe; focus moved to To on its own.

Grace: "Handy, it moved me to To. Typing Milo."

## Step 6

`--step <folder> --type "Milo"`. 07.png: suggestion "Milo" under To.

Grace: "Pick Milo, then Find path."

## Step 7

`--step <folder> --click-at 550,663 --click "Find path"` -> option "Milo", then Find path. 08.png: the path is drawn in black on the map. Left list now has "Shortest path  4 hops" above my PageRank (still there, still 20). Right panel, Values tab: Summary "Path: 5 nodes, 4 edges"; "Nodes in order": Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5; "Made with": Shortest path, From Chloe, To Milo, Follow All, Weight None. The key gained a "Shortest path" entry; my PageRank colors and sizes are kept.

Grace: "In order, in plain names: Chloe, Ava, Ivan, Kofi, Milo. Five people counting both ends, so three in between: Ava, Ivan, Kofi. Four ties, so four introductions -- Chloe to Ava, Ava to Ivan, Ivan to Kofi, Kofi to Milo. I count four black lines on the map. Matches. And my ranking is still on the list, good."

## End (1)

`--end <folder>` -> not ended; next request: "Ben now wants to be introduced to Nora the same way. Who is in that chain, in order, and how many introductions does it take?"

## Step 8

Grace: "Same again for Ben and Nora. Back to the flask button."

`--step <folder> --click "Analyze"`. 09.png: the Analyze popover, now with "Shortest path" at the top under Recent.

Grace: "Shortest path is right at the top under Recent. Click it."

## Step 9

`--step <folder> --click-at 565,448` -> option "Shortest path ...". 10.png: the same blank form (From, To empty; Follow All; Weight None).

Grace: "Blank form, same settings. Ben in From."

## Step 10

`--step <folder> --click "Where the path starts" --type "Ben"`. 11.png: suggestion "Ben".

Grace: "Pick Ben, then type Nora."

## Step 11

`--step <folder> --click-at 549,609 --type "Nora"` -> option "Ben". 12.png: From = Ben, To = "Nora" with suggestion "Nora".

Grace: "Pick Nora, Find path."

## Step 12

`--step <folder> --click-at 551,663 --click "Find path"` -> option "Nora", then Find path. 13.png: a new black path on the map. Right panel: "Path: 5 nodes, 4 edges"; Nodes in order: Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5; From Ben, To Nora, ran 5:52:44 PM. The left list still shows only one "Shortest path  4 hops" row -- the Chloe-to-Milo run is no longer listed anywhere; the new one took its place.

Grace: "Ben, Theo, Ravi, Pia, Nora. Again three in the middle and four introductions -- Ben to Theo, Theo to Ravi, Ravi to Pia, Pia to Nora. I count four black lines. Hm, but my Chloe one is gone from the list. It just replaced it without asking. Good thing I wrote Chloe's chain down already. I'm done."

## End (2)

`--end <folder>` -> "session ended".

## In my own words, at the end

- **Did I finish?** Yes, both. Chloe to Milo: Chloe -> Ava -> Ivan -> Kofi -> Milo, three people in between, four introductions. Ben to Nora: Ben -> Theo -> Ravi -> Pia -> Nora, three people in between, four introductions.
- **Ease: 6 of 7.** Analyze, type "path", Shortest path, two names with suggestions, Find path. The "Nodes in order" list with plain names is exactly what I'd paste into an email. The second time, Shortest path was waiting under Recent.
- **What confused me:**
  - The answer comes as counts that never say "introductions": "4 hops" on the left, "5 nodes, 4 edges" on the right. I had to work out that 4 edges means 4 introductions and that 5 nodes includes Chloe and Milo. "Hops" and "edges" are not words I'd put on a slide.
  - Running it for Ben and Nora quietly replaced the Chloe-to-Milo result -- the list still shows one "Shortest path" row and Chloe's chain is gone. Nothing told me. If I'd wanted both chains side by side I'd have had to redo the first one.
  - Minor: the weight note '"weight" has no meaning set' reads like an error message, though I understood None meant every tie counts the same.
  - Names aren't on the dots in this saved map, so on the map alone I couldn't tell who the black dots were; the list on the right saved me.
