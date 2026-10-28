# Session r4-s33 transcript (Tom, returning user)

Session folder (screenshots, logs): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s33
Build: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/

Task: bring bus-stops.csv in so every calculation treats more minutes as a longer trip, find the quickest way from Depot to Harbor (stops in order, total minutes), and show where the program says it used the minutes.

## Step 1 -- start
`node design/ui/studio/tool/real.mjs --start tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s33 empty`
01.png: start screen. "Files are read on this computer and never uploaded." Good -- that answers my first question. Usage-data box at the bottom; I'll say no thanks.

## Step 2 -- decline usage data, open the file
`--step ... --click "No thanks" --click "Open project or file" --upload bus-stops.csv`
02.png: "Open as a new graph", 10 nodes, 17 edges, the rows match. But it says "Weight: none (each edge counts 1)" and the minutes column is set to "Attribute". The colleague wants minutes to count as longer trips, so I'll open the minutes dropdown and see what else it can be.

## Step 3 -- try the minutes dropdown
`--step ... --click "minutes"` -> refused as ambiguous (a column header button and the "Role of minutes" box); nothing happened (03.png).

## Step 4 -- open "Role of minutes"
`--step ... --click "Role of minutes"`
04.png: list shows From, To, Weight, Date or time, Edge id, Attribute (ticked). "Weight" sounds like the one that makes the minutes count. I'll pick Weight.

## Step 5 -- pick Weight
`--step ... --click "role=option:Weight"`
05.png: now "Weight: minutes", and a new row "Higher means: Not set / Closer / Farther / Capacity", with a line saying until I choose, a path counts every edge as one step. More minutes is a longer trip, so "Farther" is the plain-English one. I'll click Farther.

## Step 6 -- Farther
`--step ... --click "Farther"`
06.png: "Weight: minutes (farther)" and "A higher weight means farther apart, such as a longer distance or travel time; a path takes the smallest total." That's exactly what I was told. Direction says "As the file says" -- I won't touch it. Click Load.

## Step 7 -- Load
`--step ... --click "Load"`
07.png: the network is drawn, 10 nodes, 17 edges, and on the right "Loaded weight: minutes (farther)". Good. The dots have no names on them though, so I can't see which is Depot. Last time I used the analysis button (the flask) in the toolbar; I'll try that for "quickest way".

## Step 8 -- Analyze
`--step ... --click-at 615,863` (button "Analyze")
08.png: a long list of names I don't know (Degree, Betweenness, Katz, HITS...). Not reading all of them at this hour. There's a "Filter analyses" box at the top; I'll type "path".

## Step 9 -- type "path"
`--step ... --type "path"`
09.png: "Shortest path -- Start here. The fewest steps, or the shortest path by weight, between two nodes." That's my question. Click it.

## Step 10 -- Shortest path form
`--step ... --click-at 500,630` (option "Shortest path")
10.png: From / To boxes, "Follow: Out / All" (All is picked -- I don't know what that means, leaving it), and Weight already says "minutes (farther, loaded)". Good, it picked up what I set. The From box has the cursor; type Depot.

## Step 11 -- type Depot
`--step ... --type "Depot"`
11.png: a suggestion "Depot" drops down. Click it.

## Step 12 -- pick Depot
`--step ... --click-at 490,627` (option "Depot")
12.png: From says Depot, and the cursor moved to To on its own. Type Harbor.

## Step 13 -- type Harbor
`--step ... --type "Harbor"`
13.png: suggestion "Harbor". Pick it, then press Find path.

## Step 14 -- pick Harbor, Find path
`--step ... --click-at 492,681 --click "Find path"`
14.png: the path is drawn in thick black. On the right: "Path: 5 nodes, 4 edges", "Total minutes: 14", and "Nodes in order: Depot 1, Market 2, Park 3, Clinic 4, Harbor 5". Under "Made with": Analysis Shortest path, From Depot, To Harbor, Follow All, "Weight: minutes (farther)". The left list also says "Shortest path -- minutes 14".
I checked it against the spreadsheet rows I saw at import: Depot-Market 4, Market-Park 3, Park-Clinic 4, Clinic-Harbor 3 = 14. The obvious alternatives (Depot-School-Harbor 21, Depot-Market-Library-Harbor 15) are longer. It adds up. That's my answer; I'm done.

## End
`--end` -- session ended, no further request.

## Debrief (in character)
- Finished: yes. Quickest way Depot -> Market -> Park -> Clinic -> Harbor, 14 minutes in all. Where it says it used the minutes: the Shortest path result's "Made with" section, "Weight: minutes (farther)", plus "Total minutes 14" in the Summary; also "Loaded weight: minutes (farther)" on the Graph overview after loading.
- Ease: 6 of 7.
- What confused me:
  - When the file opened it said "Weight: none (each edge counts 1)" with the minutes column set to "Attribute". If I hadn't read that line I'd have loaded it and every hop would count the same. Nothing stopped me pressing Load without choosing.
  - "Higher means: Closer / Farther / Capacity" -- Farther was clear once the sentence under it said "travel time". I don't know what Capacity is and didn't want to find out.
  - The dots on the picture have no names, so until the result came up I couldn't tell which one was Depot. I had to trust the typed boxes.
  - "Follow: Out / All" on the path form -- no idea what it means, left it on All. The file has arrows, so I'm not sure whether "All" let it ride a bus the wrong way. My hand check says the answer matches the rows as listed, but I'd ask her about that bit.
  - The analysis list is long with names I don't know; typing "path" in the filter is what saved me.
- Compared with "she could have just sent me a table": this was quicker than adding it up myself, and it told me the total and the order without me counting.
