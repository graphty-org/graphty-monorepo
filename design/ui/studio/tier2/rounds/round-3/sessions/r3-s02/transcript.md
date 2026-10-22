# Session r3-s02 -- Grace, returning: shortest walk on trails.csv

Every command ran from the studio worktree as:
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs <command> <session folder> ...
Screenshots 01.png to 14.png are in this folder.

## 01 -- start
Command: --start <folder> empty
Sees: the start screen -- Open project or file, New from data, Recent projects (empty), samples, and a usage-data question at the bottom.
Next: say no to the data question, then open my file the way I always do.

## 02 -- decline usage data, open trails.csv
Command: --step <folder> --click "No thanks" --click "Open project or file" --upload trails.csv
Sees: "Open as a new graph". trails: 9 nodes, 13 edges; 13 rows, lines 2-14. Matches my 13 trails. The km column is set to "Attribute", and right above the table it says "Weight: none (each edge counts 1)". That is exactly what I do NOT want -- every trail counting as 1. Good that it tells me, though.
Next: open the km drop-down and see if there is a choice like weight or length.

## 03 -- click "km" (refused)
Command: --step <folder> --click "km"
Result: ambiguous -- the column header button and the role drop-down "Role of km" share the name. Nothing happened.

## 04 -- open the km role drop-down
Command: --step <folder> --click-at 728,211
Sees: From, To, Weight, Date or time, Edge id, Attribute (checked). "Weight" is the only one that could mean kilometers. Worry: in my donor map "weight" meant a strong tie, which is the opposite of a long walk. I'll pick it and read what it says.
Next: choose Weight.

## 05 -- choose Weight
Command: --step <folder> --click "role=option:Weight"
Sees: "Weight: km", "Higher means: Not set / Closer / Farther / Capacity", and a plain sentence: until I choose, a path counts every edge as one step. That answers my worry exactly. More km = farther.
Next: click Farther.

## 06 -- choose Farther
Command: --step <folder> --click "Farther"
Sees: "Weight: km (farther)" and "A higher weight means farther apart, such as a longer distance or travel time; a path takes the smallest total." Plain words, exactly what I wanted. Still 9 nodes, 13 edges.
Doubt: Direction says "As the file says". A trail can be walked either way; if it treats them one-way it might miss a route.
Next: open the Direction drop-down.

## 07 -- open Direction
Command: --step <folder> --click "Direction"
Sees: As the file says (checked), Directed, Undirected. A spreadsheet can't "say" a direction, so I don't know what "as the file says" means here. Trails go both ways: Undirected.
Next: choose Undirected, then Load.

## 08 -- Undirected, Load
Command: --step <folder> --click "role=option:Undirected" --click "Load"
Sees: the map, 9 dots, no names. Right panel Values: Nodes 9, Edges 13 (matches my 13 rows, 9 junctions), Direction "Undirected, set in the project", Loaded weight "km (farther)". So the program says up front it took the kilometers. Bottom-left: "Analyze in the toolbar (Shift+A) to add results here".
Next: the flask button in the toolbar, like last time.

## 09 -- Analyze
Command: --step <folder> --click-at 680,864
Sees: an Analyze list with a "Filter analyses" box, ranking items first (Degree, Betweenness, ... PageRank "Start here"). Nothing about a route on screen yet.
Next: type "shortest" in the filter.

## 10 -- filter "shortest"
Command: --step <folder> --type "shortest"
Sees: "Find paths and edge sets: Shortest path (Start here) -- The fewest steps, or the shortest path by weight, between two nodes." That is my job.
Next: click Shortest path.

## 11 -- Shortest path form
Command: --step <folder> --click-at 566,806
Sees: From "Where the path starts", To "Where the path ends", Weight already filled "km (farther, loaded)", Advanced, Find path. Nice -- it already picked my kilometers.
Next: click From and type Trailhead.

## 12 -- type Trailhead
Command: --step <folder> --click "Where the path starts" --type "Trailhead"
Sees: a suggestion "Trailhead" under the box.
Next: pick it, then the To box and type Summit.

## 13 -- pick Trailhead, type Summit
Command: --step <folder> --click-at 563,679 --click "Where the path ends" --type "Summit"
Sees: From = Trailhead; To shows a "Summit" suggestion.
Next: pick Summit, then Find path.

## 14 -- pick Summit, Find path
Command: --step <folder> --click-at 559,733 --click "Find path"
Sees: the path drawn in black on the map; left list gains "Shortest path  km 7.5". Right panel: Summary -- Path 5 nodes, 4 edges, Total km 7.5. Nodes in order: Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5. Made with: Analysis Shortest path, From Trailhead, To Summit, Weight km (farther).
Checked against my spreadsheet: Trailhead-Creek 1.5 + Creek-Meadow 2 + Meadow-Ridge 2.5 + Ridge-Summit 1.5 = 7.5. The other ways are longer (Pine Fork straight up is 9, via Lookout 8.5, Pine Fork-Meadow-Ridge 8). So it really used the km, not the number of trails -- by trail count, Pine Fork (2 trails) would have won.
Done.

## 15 -- end
Command: --end <folder>
Result: "session ended", copied into this folder.

## In my own words
- Did I finish? Yes. Shortest walk from Trailhead to Summit: Trailhead -> Creek -> Meadow -> Ridge -> Summit, 7.5 km in all.
- Ease: 6 out of 7.
- Where it showed the kilometers were used: the opening screen said "Weight: km (farther)" with a sentence that a path takes the smallest total; the Graph overview said "Loaded weight: km (farther)"; the Shortest path form already had "km (farther, loaded)" filled in; and the result panel said "Total km 7.5" and, under Made with, "Weight: km (farther)".
- What confused me:
  - Clicking "km" was refused because the column header and its drop-down share the name; I had to point at the drop-down.
  - "Weight" was the only sensible choice in the km drop-down, and I worried it meant a strong tie (as in my donor map). The "Higher means: Closer / Farther / Capacity" question right after cleared that up at once -- that was the best part.
  - Direction "As the file says" -- a spreadsheet doesn't say a direction, so I didn't know what it would do. I picked Undirected to be safe because trails go both ways.
  - The dots have no names, so I couldn't check the black line on the picture without the list on the right. The list was enough for this job.
