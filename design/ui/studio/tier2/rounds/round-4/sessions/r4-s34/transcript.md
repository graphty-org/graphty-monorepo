# Session r4-s34 -- Analyst Alex, returning user

Task: load trails.csv (from,to,km) so calculations treat more km as a longer walk; find the shortest
walk from Trailhead to Summit (junctions in order, total km); show where the program says it used km.

Session folder: tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s34
Every command below runs from the studio worktree with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ and T=design/ui/studio/tool, S=<session folder>.

## Step 1 -- start
`node $T/real.mjs --start $S empty` -> 01.png
Empty start page. "Files are read on this computer and never uploaded" -- good, I know that line by now.
Usage-data banner at the bottom; I'll say No thanks, then open the file the way I always do.

## Step 2 -- open the file
`--step $S --click "No thanks" --click "Open project or file" --upload trails.csv` -> 02.png
"Open as a new graph" preview: 9 nodes, 13 edges, each row an edge, from/to mapped. Counts match the
club's file (13 trails, 9 junctions). But it says "Weight: none (each edge counts 1)" and km is set to
"Attribute". That's exactly the thing I need to change -- the km column dropdown should have a weight option.

## Step 3 -- km role
`--step $S --click "km"` -> 03.png: refused as ambiguous (the column header button and the "Role of km" box). Fine.
`--step $S --click "Role of km"` -> 04.png
List: From, To, Weight, Date or time, Edge id, Attribute (checked). Weight is right there. Picking it.

## Step 4 -- Weight
`--step $S --click "role=option:Weight"` -> 05.png
Now "Weight: km", and a new row "Higher means: Not set / Closer / Farther / Capacity" with a line saying
until I choose, a path counts every edge as one step. Good that it warns me. More km = longer walk = Farther.

## Step 5 -- Farther
`--step $S --click "Farther"` -> 06.png
"Weight: km (farther)" and "a path takes the smallest total". That's what I want. Before Load, the
Direction box says "As the file says" -- a CSV doesn't say anything, and trails go both ways. Checking it.

## Step 6 -- Direction
`--step $S --click "Direction"` -> 07.png
Options: As the file says / Directed / Undirected. "As the file says" doesn't tell me which one a CSV ends up as.
Trails go both ways, so Undirected to be safe, then Load.

## Step 7 -- Load
`--step $S --click "role=option:Undirected" --click "Load"` -> 08.png
Graph loaded. Values panel: Nodes 9, Edges 13, Direction "Undirected, set in the project",
"Loaded weight: km (farther)". That's one place it says it took the km. No labels on the dots though,
so I can't tell which is the Trailhead. Going to the analysis button (flask) like every week, looking for shortest path.

## Step 8 -- Analyze
`--step $S --click-at 615,864` -> 09.png (button "Analyze")
List of analyses with a filter box focused. Typing "shortest" rather than scrolling.

## Step 9 -- filter
`--step $S --type "shortest"` -> 10.png
"Shortest path -- The fewest steps, or the shortest path by weight, between two nodes." Clicking it.

## Step 10 -- Shortest path form
`--step $S --click-at 500,668` -> 11.png
Form: From, To, Weight already "km (farther, loaded)", Advanced, Find path. Good -- the weight carried over
from the load. From box has focus; typing Trailhead.

## Step 11 -- From
`--step $S --type "Trailhead"` -> 12.png
One suggestion, "Trailhead". Picking it, then the To box.

## Step 12 -- To
`--step $S --click-at 498,679 --click "Where the path ends" --type "Summit"` -> 13.png
From = Trailhead. To shows suggestion "Summit". Pick it, then Find path.

## Step 13 -- Find path
`--step $S --click-at 494,733 --click "Find path"` -> 14.png
Result panel "Shortest path": Path 5 nodes, 4 edges; Total km 7.5. Nodes in order: Trailhead 1, Creek 2,
Meadow 3, Ridge 4, Summit 5. "Made with" block: Analysis Shortest path, From Trailhead, To Summit,
Weight km (farther). The left list also has "Shortest path  km 7.5". Path drawn in black on the canvas.
I checked it against the file by hand: 1.5 + 2 + 2.5 + 1.5 = 7.5. The fewest-hops route
(Trailhead - Pine Fork - Summit) would be 9 km, so it really did use the km. That's my answer.

## End
`node $T/real.mjs --end $S`
-> "session ended", no further request.

## Debrief (in character)
- Finished: yes. Shortest walk Trailhead -> Creek -> Meadow -> Ridge -> Summit, 7.5 km. The program says it
  used the km in three places: the load dialog ("Weight: km (farther)", "a path takes the smallest total"),
  the graph's Values panel ("Loaded weight: km (farther)"), and the result's "Made with -- Weight: km (farther)"
  plus the "Total km 7.5" row.
- Ease: 6 of 7. About ten clicks, under two minutes, and the number matched my own sum.
- What slowed me down or confused me:
  - The km column comes in as "Attribute" with "Weight: none" -- I had to know to change it. The warning
    line under "Higher means" was what made "Not set" vs "Farther" clear; without it I'd have loaded with Not set.
  - "Direction: As the file says" -- a CSV says nothing about direction, so I couldn't tell what I'd get.
    I picked Undirected to be safe.
  - The dots have no names on the canvas, so the black path in the picture means nothing on its own; the
    "Nodes in order" list is what I'd actually paste into the reply.
  - The "km" name was shared by the column header and its role box, minor.
