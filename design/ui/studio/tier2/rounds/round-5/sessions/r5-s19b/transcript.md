# Session r5-s19b -- Dana Okafor (returning user)

Task: friends.csv is open. Find the chain from Chloe to Milo with the fewest people in between: who, in order, and how many introductions.

Commands run from /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ and
S=tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s19b

## Step 1 (01.png, given)
The network from last time is up, colored by PageRank. No names on the dots, so I cannot just eyeball Chloe and Milo. I will go to the analysis button in the toolbar, which I know.

## Step 2
`--step $S --click-at 615,863` -> button "Analyze". A list opens: Recent PageRank, then "Rank nodes and edges" (Degree, Betweenness...). A filter box at the top. I want "shortest chain between two people" -- I will type "path".

## Step 3
`--step $S --type "path"` -> list narrows: "Shortest path -- The fewest steps ... between two nodes." That reads like exactly my question. Clicking it.

## Step 4
`--step $S --click-at 501,630` -> a Shortest path form: From, To, Follow (Out / All, All picked), Weight None ("each edge counts as 1"), Find path. Fewest people is what I want, so no weight is right; "All" directions is fine since introductions go both ways. The From box looks focused -- typing Chloe.

## Step 5
`--step $S --type "Chloe"` -> a suggestion "Chloe" drops down. Picking it.

## Step 6
`--step $S --click-at 490,609` -> From says Chloe, focus jumped to To. Nice. Typing Milo.

## Step 7
`--step $S --type "Milo"` -> suggestion "Milo". Picking it.

## Step 8
`--step $S --click-at 486,663` -> From Chloe, To Milo, focus now on Find path. Clicking Find path.

## Step 9
`--step $S --click "Find path"` -> the path is drawn in black on the picture, and the right panel shows a table: Summary "Path 5 nodes, 4 edges"; "Nodes in order": Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5; "Made with" repeats From Chloe, To Milo, Follow All, Weight None. The left list has a new row "Shortest path 4 hops". That is my answer. Ending.

## Step 10
`--end $S`

--end answered with a new request: "Ben now wants to be introduced to Nora the same way. Who is in that chain, in order, and how many introductions does it take?" Same thing again; back to the analysis button.

## Step 11
`--step $S --click "Analyze"` -> list opens with "Shortest path" at the top under Recent. Clicking it.

## Step 12
`--step $S --click-at 501,448` -> same empty form, From focused. Typing Ben.

## Step 13
`--step $S --type "Ben"` -> suggestion "Ben". Picking it; focus should jump to To like last time, so I type Nora straight after.

## Step 14
`--step $S --click-at 484,609 --type "Nora"` -> From Ben, To shows Nora with a suggestion. Picking Nora, then Find path.

## Step 15
`--step $S --click-at 486,663 --click "Find path"` -> new path in black. Nodes in order: Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5; Path 5 nodes, 4 edges; left list "Shortest path 4 hops". The Chloe-to-Milo answer is no longer on screen -- the one "Shortest path" row now holds Ben to Nora. I wrote the first one down already, so fine, but if I had wanted both side by side I would not know where the first went.

## Step 16
`--end $S`

Session ended.

## Wrap-up (Dana, in character)

**Finished?** Yes, both.
- Chloe to Milo: Chloe -> Ava -> Ivan -> Kofi -> Milo. Three people in between, 4 introductions.
- Ben to Nora: Ben -> Theo -> Ravi -> Pia -> Nora. Three people in between, 4 introductions.

**Ease: 6 / 7.** I typed "path" into the analysis list and the first thing was "Shortest path -- the fewest steps between two nodes". Two name boxes with suggestions, one button, and the answer came as a numbered list in a table. That is the format I want. The second run was faster because "Shortest path" was at the top under Recent.

**What confused me or slowed me down:**
- The dots on the picture have no names. Without the "Nodes in order" table I could not have told who the black dots were. In front of a VP I would need the names on the picture.
- "Follow: Out / All" -- I left it on All because introductions go both ways, but I did not know what "Out" would change. One line saying "All = either direction" would settle it.
- The result says "5 nodes, 4 edges" and "4 hops". I had to translate: 4 hops = 4 introductions, 3 people in between. A plain "3 people between them" would have saved a second look.
- The second run replaced the first. The left list still shows one "Shortest path" row, now Ben to Nora; Chloe to Milo is gone from the screen. If I needed both on one slide I would not know where the first one went.
- Labels in the right panel and the "Made with" notes are small grey text; fine on the big monitor, hard on the laptop.

**So what:** For my supply data the same thing would answer "how does this part reach that plant", but only where I have the links -- which past Tier 1 I mostly do not.
