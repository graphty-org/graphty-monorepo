# Session r4-s30 -- Nadia, returning user

Task: bring trails.csv in so kilometers count as a longer walk, then find the shortest walk Trailhead to Summit (junctions in order, total km), and show where the program says it used km.

Session folder (screenshots): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s30

## Step 1 (start)
`REAL_DIST=.../tier2-r4d1-5277e2cbe/ node real.mjs --start <session> empty` -> 01.png: start screen, usage-data banner at the bottom.

## Step 2
In character: "Start screen. I'll say no to the data thing and open the file like always."
`--step --click "No thanks" --click "Open project or file" --upload trails.csv` -> 02.png: "Open as a new graph" table preview. 9 nodes, 13 edges. Columns: from=From, to=To, km=Attribute (number). A line says "Weight: none (each edge counts 1)". That is exactly what I must not leave like that.

## Step 3
In character: "I want the km column to count. Click its dropdown."
`--step --click "km"` -> 03.png: refused as ambiguous (a "km" header button and the "Role of km" combobox). Nothing happened.

## Step 4
`--step --click "Role of km"` -> 04.png: list From / To / Weight / Date or time / Edge id / Attribute (checked). "Weight" is the one.

## Step 5
`--step --click "role=option:Weight"` -> 05.png: km is now Weight. New line "Weight: km", "Higher means: Not set / Closer / Farther / Capacity", and a sentence: until I choose, a path counts every edge as one step. More km is a longer walk, so "Farther".

## Step 6
`--step --click "Farther"` -> 06.png: "Weight: km (farther)" and "A higher weight means farther apart, such as a longer distance or travel time; a path takes the smallest total." Clear. Direction says "As the file says"; trails go both ways but I leave it, I don't know what else it would do. Load.

## Step 7
`--step --click "Load"` -> 07.png: graph drawn, no labels on the nodes. Right panel Overview: Nodes 9, Edges 13, Direction Directed, "Loaded weight: km (farther)". Good, that is one place it says it has the km. Now the walk. I've used the analysis button (flask) before for ranking; try it.

## Step 8
`--step --click-at 615,864` (Analyze) -> 08.png: a list with "Filter analyses" box focused; Degree, Betweenness, ... nothing named "shortest walk" in view. Type into the filter.

## Step 9
`--step --type "shortest"` -> 09.png: "Shortest path -- The fewest steps, or the shortest path by weight, between two nodes." Click it.

## Step 10
`--step --click-at 500,668` (Shortest path) -> 10.png: From / To boxes, Follow Out | All (All is on), Weight already "km (farther, loaded)". Nice, it remembered. Type Trailhead into From.

## Step 11
`--step --type "Trailhead"` -> 11.png: one suggestion "Trailhead" under the box. Pick it.

## Step 12
`--step --click-at 498,627` -> 12.png: From = Trailhead, cursor jumped to To. Type Summit.

## Step 13
`--step --type "Summit"` -> 13.png: suggestion "Summit". Pick it, then Find path.

## Step 14
`--step --click-at 494,681 --click "Find path"` -> 14.png: path drawn in black on the canvas; left list has "Shortest path  km 7.5". Right panel: Summary -- Path 5 nodes, 4 edges; Total km 7.5. Nodes in order: Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5. "Made with": Analysis Shortest path, From Trailhead, To Summit, Follow All, Weight km (farther).

## Step 15
`--end` -> session ended.

## At the end (in character)

- **Finished?** Yes. Shortest walk: Trailhead -> Creek -> Meadow -> Ridge -> Summit, 7.5 km in all.
- **Where it says it used the km:** the result panel's "Made with" block says "Weight: km (farther)" and the summary row is labeled "Total km 7.5"; the left list shows "km 7.5" next to the run. Before that, the graph Overview said "Loaded weight: km (farther)", and the path form had Weight preset to "km (farther, loaded)".
- **Ease:** 6 of 7. About two minutes, quicker than writing the chain down from connection lists like I've been doing.
- **What confused me:**
  - In the import screen, the km column was set to "Attribute" with only a small "Weight: none (each edge counts 1)" line telling me that was wrong. I had to know to open the role dropdown and pick Weight, then pick "Farther" -- two choices before anything counts. The sentence under "Higher means" did explain it well once I got there.
  - "Direction: As the file says" -- the graph loaded as Directed with arrows, but trails go both ways. I didn't know if that would break the walk. The path form's "Follow: All" was already on, which I think means it ignores the arrows, but nothing said so in words.
  - Nodes have no names drawn on the canvas, so the picture alone would not tell QA which junctions are on the path; I'd need the right panel's list next to it for the file.
