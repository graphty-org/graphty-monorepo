# Session r4-s32 -- Dev, returning (trails.csv, shortest walk by km)

Session folder: tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s32
Build: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/

## Step 1 -- start
`node design/ui/studio/tool/real.mjs --start $S empty` -> 01.png
Okay, the start screen, same as last time. There's the usage-data box at the bottom; I'll say no thanks, then open my trails file the way I opened the class spreadsheet.

## Step 2
`--step $S --click "No thanks"` -> 02.png
Usage box gone. Now "Open project or file..." like I did with the class spreadsheet, and pick trails.csv from Downloads.

## Step 3
`--step $S --click "Open project or file" --upload trails.csv` -> 03.png
Oh, this is the import page. 9 nodes, 13 edges, good. But wait -- it says "Weight: none (each edge counts 1)", and the km column is set to "Attribute". That's exactly what I need to change: kilometers should be the weight. I'll open the km dropdown.

## Step 4
`--step $S --click "km"` -> 04.png (ambiguous: a "km" button and the "Role of km" box; nothing happened)
I meant the dropdown under km that says Attribute.

## Step 5
`--step $S --click "Role of km"` -> 05.png
List: From, To, Weight, Date or time, Edge id, Attribute. "Weight" is the one. Picking it.

## Step 6
`--step $S --click "role=option:Weight"` -> 06.png
Oh nice, now it says "Weight: km" and asks "Higher means: Not set / Closer / Farther / Capacity", and the sentence underneath says until I choose, a path counts every edge as one step. That's literally my assignment. More km = farther. Clicking Farther.

## Step 7
`--step $S --click "Farther"` -> 07.png
"Weight: km (farther)" and "a higher weight means farther apart... a path takes the smallest total." Matches what I mean. The tutorial said to set the graph to Undirected -- trails go both ways. There's a "Direction: As the file says" box at the bottom; let me see what it offers.

## Step 8
`--step $S --click "Direction"` -> 08.png
Options: As the file says, Directed, Undirected. Trails you can walk either way, so Undirected. Then Load.

## Step 9
`--step $S --click "role=option:Undirected" --click "Load"` -> 09.png
The drawing is up. On the right, Values says "Direction: Undirected, set in the project" and "Loaded weight: km (farther)". Good, that's one proof already. No names on the dots though. Now the route: last time the rankings were under the flask button (Analyze) in the toolbar, so I'll try there.

## Step 10
`--step $S --click-at 615,863` -> 10.png (the Analyze button)
The list of analyses, with a filter box at the top. I want "shortest path" -- I'll type "shortest" in the filter.

## Step 11
`--step $S --type "shortest"` -> 11.png
"Shortest path -- The fewest steps, or the shortest path by weight, between two nodes." That's it. Clicking it.

## Step 12
`--step $S --click-at 501,668` -> 12.png
A Shortest path form: From, To, and Weight already says "km (farther, loaded)". Good, it's using my setting. The From box has the cursor; typing Trailhead.

## Step 13
`--step $S --type "Trailhead"` -> 13.png
Suggestion "Trailhead" shows. Picking it, then clicking into To and typing Summit.

## Step 14
`--step $S --click-at 498,679 --click "Where the path ends" --type "Summit"` -> 14.png
From: Trailhead. To shows the Summit suggestion. Pick it, then Find path.

## Step 15
`--step $S --click-at 494,733 --click "Find path"` -> 15.png
Oh nice, that's it. The path is drawn in black, and the right panel says:
- Summary: Path 5 nodes, 4 edges; Total km 7.5
- Nodes in order: Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5
- Made with: Analysis Shortest path, From Trailhead, To Summit, Weight km (farther)
The left list also shows a "Shortest path km 7.5" row.

Checking against the sheet by hand: Trailhead-Creek 1.5 + Creek-Meadow 2 + Meadow-Ridge 2.5 + Ridge-Summit 1.5 = 7.5. Agrees. The two-trail route Trailhead-Pine Fork-Summit is 3 + 6 = 9, longer, so the program really did go by kilometers and not by fewest trails. And "Weight: km (farther)" under "Made with" is the place that says it used the kilometers -- I'd screenshot that for the instructor, along with "Loaded weight: km (farther)" on the graph overview.

Essay sentence: "Measured by trail length, the shortest walk from the Trailhead to the Summit goes Trailhead, Creek, Meadow, Ridge, Summit, 7.5 km in all; the program's run record lists the weight as km (farther)."

## End
`--end $S`
Session ended (no further request).

## In character, at the end
- Did I finish? Yes. Shortest walk Trailhead -> Creek -> Meadow -> Ridge -> Summit, 7.5 km, and I found two places that say the kilometers were used: "Loaded weight: km (farther)" in the graph overview and "Weight: km (farther)" under "Made with" on the result.
- Ease: 6 of 7.
- What confused me: almost nothing. The import page told me straight out "Weight: none (each edge counts 1)", which is what made me look at the km column at all -- if it had been quieter I might have missed it, like last assignment. Clicking "km" was ambiguous at first because the column header and the dropdown share the name; I meant the dropdown. I set Direction to Undirected on my own because the tutorial said to; nothing on the page told me whether trails would be treated as one-way, so I'm not sure it mattered. The dots have no names drawn on the map, so I could only tell which black dots were which from the list on the right, not from the picture.
