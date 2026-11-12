# Session r3-s04 -- Jordan, returning user

Task: load trails.csv so calculations treat km as a longer walk, find the shortest walk from Trailhead to Summit (junctions in order, total km), and show where the program says it used the km.

Session folder: S = tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s04 (copied here at the end).
Every command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs <cmd> $S ...`

## Step 1 -- start
`--start $S empty` -> 01.png
Start screen. "Files are read on this computer and never uploaded" -- good, that answers my laptop question up front. Usage-data banner at the bottom; I'll say no thanks and open the file.

## Step 2 -- open the file
`--step $S --click "No thanks" --click "Open project or file" --upload trails.csv` -> 02.png
An import preview: "trails: 9 nodes, 13 edges", each row an edge, from/to picked right. But it says "Weight: none (each edge counts 1)" and the km column is set to "Attribute". That's exactly the thing I need to change. I'll open the km dropdown.

## Step 3 -- click "km"
`--step $S --click "km"` -> 03.png
The tool said ambiguous: a "km" column-header button and a "Role of km" combobox. Fine, I meant the dropdown.

## Step 4 -- open the role dropdown
`--step $S --click "Role of km"` -> 04.png
Options: From, To, Weight, Date or time, Edge id, Attribute. "Weight" is what I want.

## Step 5 -- pick Weight
`--step $S --click "role=option:Weight"` -> 05.png
Now "Weight: km" and a new question: "Higher means: Not set / Closer / Farther / Capacity", with a line saying until I choose, a path counts every edge as one step. Good that it warns me -- I'd have missed that. More km is a longer walk, so "Farther".

## Step 6 -- Farther
`--step $S --click "Farther"` -> 06.png
"Weight: km (farther). A higher weight means farther apart, such as a longer distance or travel time; a path takes the smallest total." Plain English, I like it. At the bottom, Direction says "As the file says" -- trails go both ways, so let me see what else it offers.

## Step 7 -- Direction menu
`--step $S --click "Direction"` -> 07.png
As the file says / Directed / Undirected. A CSV doesn't "say" a direction, so I don't know what the first option would do. Trails are two-way: Undirected.

## Step 8 -- Undirected, Load
`--step $S --click "role=option:Undirected" --click "Load"` -> 08.png
Graph loaded: 9 nodes, 13 edges. The Values panel on the right says "Direction: Undirected, set in the project" and "Loaded weight: km (farther)". That's one place it admits it has my km. No names on the dots though -- can't tell which one is the Summit. I'll go to the analysis button (the flask) like I always do.

## Step 9 -- Analyze
`--step $S --click-at 679,864` (button "Analyze") -> 09.png
The analysis list with a filter box, ranking stuff on top. I want a route, so I'll type "shortest".

## Step 10 -- filter "shortest"
`--step $S --type "shortest"` -> 10.png
"Shortest path -- The fewest steps, or the shortest path by weight, between two nodes." That's the one.

## Step 11 -- Shortest path form
`--step $S --click-at 565,806` (option "Shortest path") -> 11.png
From / To boxes, and Weight already filled in as "km (farther, loaded)". Nice -- it carried my choice from the import. Type Trailhead in From.

## Step 12 -- type Trailhead
`--step $S --click "Where the path starts" --type "Trailhead"` -> 12.png
A suggestion "Trailhead" drops down. Pick it, then Summit in To.

## Step 13 -- Trailhead picked, typing Summit
`--step $S --click "role=option:Trailhead" --click "Where the path ends" --type "Summit"` -> 13.png
From says Trailhead; a Summit suggestion is showing. Pick it and press Find path.

## Step 14 -- pick Summit, Find path
`--step $S --click "role=option:Summit" --click "Find path"` -> 14.png
Done in one go. The right panel:
- Summary: Path 5 nodes, 4 edges; Total km 7.5
- Nodes in order: Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5
- Made with: Analysis Shortest path, From Trailhead, To Summit, Weight km (farther)
The left list shows "Shortest path  km 7.5", and the path is drawn in black on the map.
I checked it against the import table: Trailhead-Creek 1.5, Creek-Meadow 2, Meadow-Ridge 2.5, Ridge-Summit 1.5 = 7.5. The obvious alternative, Trailhead-Pine Fork-Summit, is only 2 hops but 9 km, so it really used the km and not the hop count. I believe it.

## End
`--end $S` -- session ended, no further request.

## Debrief (in character, Jordan)
- Finished: yes. Trailhead -> Creek -> Meadow -> Ridge -> Summit, 7.5 km in all. The program says it used kilometers in the run's "Made with" section ("Weight: km (farther)") and its "Total km 7.5" line, and the graph overview says "Loaded weight: km (farther)".
- Ease: 6 of 7.
- What worked: the import screen flagged "Weight: none (each edge counts 1)" right where I'd look, and once I made km the weight it asked what higher means and explained in normal words that until I chose, a path counts every edge as one step. The shortest-path form already had my km filled in. The answer came with the order and the total, no Excel. "Files are read on this computer and never uploaded" on the first screen -- legal stays out of it.
- What confused me: "Direction: As the file says" -- a CSV doesn't say anything about direction, so I couldn't tell what that would do and picked Undirected because trails go both ways. The map has no names on the dots, so without the side panel I couldn't tell which black dot is the Summit -- for a slide I'd need labels. "Capacity" next to Closer/Farther means nothing to me here; it took a second read. Two things called "km" on the import screen (the header and the role dropdown) -- minor.
- Off-topic: this hiking club's CSV was cleaner than anything Brandwatch has exported for me since they lost Instagram.
