# Session r3-s07 -- transcript

Participant: Elena, a returning user (two earlier visits). Task: bring in bus-stops.csv so that more minutes counts as a longer trip, find the quickest way from Depot to Harbor (stops in order, total minutes), and show where the program says it used the minutes.

Screenshots and logs are in this folder. All commands were run from the studio worktree with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ and S=tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s07 (copied here by --end).

## Steps

### 01 -- start
`node design/ui/studio/tool/real.mjs --start $S empty`
The start screen: "Open project or file..." and "New from data..." on the left, samples on the right, a usage-data banner at the bottom. I'll get rid of the banner first.

### 02 -- dismiss the banner
`--step $S --click "No thanks"`
The banner is gone. It says "or drop a file anywhere in this window". That's what I'd do with a file from Downloads: drag it in.

### 03 -- drop the file
`--step $S --drop bus-stops.csv` (the page took it)
A preview: "bus-stops: 10 nodes, 17 edges", my three columns, all 17 rows. Under minutes a box says "Attribute", and a line says "Weight: none (each edge counts 1)". Hmm, that sounds like it's ignoring my minutes. I'll open the box under "minutes" and see what else it can be.

### 04 -- click "minutes" (refused: two controls have that name)
`--step $S --click "minutes"` -> ambiguous (the column header button and the box "Role of minutes"). Nothing happened. I meant the box.

### 05 -- open the box under minutes
`--step $S --click "Role of minutes"`
A list: From, To, Weight, Date or time, Edge id, Attribute (ticked). "Weight" is the word from the line that said "Weight: none". I don't really know what weight means here, but it's the only one that sounds like "how much". I'll pick Weight.

### 06 -- pick Weight
`--step $S --click "role=option:Weight"`
Now it says "Weight: minutes" and asks "Higher means": Not set / Closer / Farther / Capacity. The line under it says that until I choose, a path counts every edge as one step. More minutes is a longer trip, so "Farther".

### 07 -- Farther
`--step $S --click "Farther"`
"Weight: minutes (farther)" and "a higher weight means farther apart, such as a longer distance or travel time; a path takes the smallest total." Travel time is exactly my thing. I'll leave Direction alone and press Load.

### 08 -- Load
`--step $S --click "Load"`
Ooh, ten dots with arrows. No names on them though, so I can't tell which one is Depot. On the right it says "Loaded weight: minutes (farther)", so it kept my minutes. Bottom left says "Analyze (the flask) in the toolbar to add results here". Last time I had it rank people from somewhere like that. I'll press the flask at the bottom.

### 09 -- Analyze
`--step $S --click-at 679,864` (button "Analyze")
A long list: Degree, Betweenness, Closeness, PageRank "Start here"... none of these say "quickest way". There's a "Filter analyses" box at the top. I'll type what I want.

### 10 -- type "quickest"
`--step $S --type "quickest"`
Nice, it found "Shortest path -- Start here -- The fewest steps, or the shortest path by weight, between two nodes." That's it. Clicking it.

### 11 -- Shortest path
`--step $S --click-at 600,812` (option "Shortest path")
A little form: From, To, "Follow: Out / All" (All is on; no idea what that means, so I'm leaving it), and "Weight: minutes (farther, loaded)" already filled in. I'll click the From box and type Depot.

### 12 -- From: Depot
`--step $S --click "Where the path starts" --type "Depot"`
It offers "Depot" in a list under the box. I'll pick it, then type Harbor in the To box.

### 13 -- To: Harbor
`--step $S --click "role=option:Depot" --click "Where the path ends" --type "Harbor"`
From says Depot, and Harbor is offered under To. I'll pick it and press "Find path".

### 14 -- Find path
`--step $S --click "role=option:Harbor" --click "Find path"`
The path lights up in black and the right side spells it out: "Path 5 nodes, 4 edges", "Total minutes 14", "Nodes in order: Depot 1, Market 2, Park 3, Clinic 4, Harbor 5". Under "Made with" it says "Weight: minutes (farther)". That's where it says it used my minutes. The list on the left also shows "Shortest path -- minutes 14". From the preview table I remember Depot-Market 4, Market-Park 3, Park-Clinic 4 and Clinic-Harbor 3, which makes 14. Depot-School-Harbor would be 21, so this checks out. I'm done.

### 15 -- end
`node design/ui/studio/tool/real.mjs --end $S` -> session ended.

## At the end, in my own words

- **Did I finish?** Yes. The quickest way is Depot, Market, Park, Clinic, Harbor: 14 minutes. The right-hand panel shows it under "Made with: Weight minutes (farther)", the import preview said "Weight: minutes (farther)" before I loaded, and the graph overview said "Loaded weight: minutes (farther)".
- **Ease:** 6 out of 7.
- **What confused me:**
  - When I dropped the file, my minutes column came in as "Attribute" and the line said "Weight: none (each edge counts 1)". If I hadn't read that line, I'd have loaded it without the minutes. I had to guess that "Weight" was the right choice in the box. I don't use that word.
  - "Closer / Farther / Capacity" made me stop for a second. The sentence under it about travel time is what convinced me.
  - The dots had no names, so I couldn't see Depot or Harbor on the picture. Typing the names into the From and To boxes saved me.
  - The analysis list is full of words I don't know (Betweenness, Katz, HITS). I only found "Shortest path" because I typed "quickest" into the filter.
  - I don't know what "Follow: Out / All" means. I left it alone, but I'm not sure whether it matters for buses that only go one way.
