# Session r1-s20 -- Maren (genomics Cytoscape user), returning

Task: color orange every gauge with more than one neighbor (up or down river) reachable over a stretch shorter than 3 km; report the count.

## Step 1 -- start
Command: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-1e123d7d33 REAL_TIER=5 node .../design/ui/studio/tool/real.mjs --start .../r1-s20 setup:gauges-clean.txt
Screenshot 01.png: the gauges project is open. 11 nodes, 13 edges, directed. Node table at the bottom. In Cytoscape I'd filter edges by length, then select nodes by degree. First I need to see the stretch lengths -- Edges tab.

## Step 2 -- --click "Edges"
02.png: edge table with Source, Target, km. 13 edges, 11 visible. Willow Run-Upper Falls 3.2 is too long. Scrolling to see the rest.

## Step 3 -- --wheel 740,750,400
03.png: all 13 edges visible. Long ones (>=3 km): Willow Run-Upper Falls 3.2, Fox Creek-Heron Marsh 3.6, Old Bridge-Heron Marsh 3.1. By hand count the rest I'd guess 7 gauges, but I want the program to do it, like a Cytoscape filter chain. Trying the funnel icon.

## Step 4 -- --click-at 832,391 (funnel icon)
04.png: it went to the Data place with a "New filter" editor; Nodes/Edges switch, attribute list. In Data sources, flows.csv shows "13/15" -- did two of my stretches get dropped? That's the silent-drop thing I hate. Will check. First: switch to Edges.

## Step 5 -- --click "Edges"
05.png: Edges mode, 13 of 13. Opening the Value... picker to choose km.

## Step 6 -- --click-at 1280,124
06.png: list shows km (1.6 to 3.6). Picking it.

## Step 7 -- --click "km"
Ambiguous (a km button behind too). Clicking the list option.

## Step 8 -- --click "role=option:km"
08.png: km condition, "By value" range 1.6 to 3.6 with a histogram. Setting the upper box to 2.9 (values have one decimal, so <3).

## Step 9 -- --click-at 1356,298 --key Control+a --type "2.9" --key Enter
09.png: "km max 2.9 -- 10 of 13", "No match 3". Top bar: 11 of 11 nodes, 10 of 13 edges. Good. Now the neighbor count. Clicking Done.

## Step 10 -- --click "Done"
10.png: filter applied; edge table shows 10 of 13 shown. Right panel: "Edges showing 10 of 13", Degree now 1 to 3, mean 1.8. Good, it recomputes on what's showing. Now a style layer for degree >= 2. Going to Graph place.

## Step 11 -- --click "Graph"
11.png: Graph place, style layers list. Clicking the + next to Style layers.

## Step 12 -- --click-at 276,122
12.png: menu Layer / Folder / Hover highlight / Analyze... Picking Layer.

## Step 13 -- --click "Layer"
13.png: Layer 1 created, Style tab: "Which nodes 11 of 11 -- All nodes", Fill +. Opening Which nodes.

## Step 14 -- --click "Which nodes"
14.png: Which nodes editor; the Value list only has data columns (lat, lon, depth_cm, station...). No degree, no neighbor count. Typing "degree" in its search.

## Step 15 -- --type "degree"
15.png: searching shows Degree, In-degree, Out-degree -- hidden until I typed it. Picking Degree (all directions = up or down river).

## Step 16 -- --key Enter
16.png: Degree, By value, range 1 to 3 (full network max was 4, so this counts on the filtered network -- good). Setting the lower to 2.

## Step 17 -- --click-at 963,304 --key Control+a --type "2" --key Enter
17.png: "Degree min 2 -- 7 of 11", No match 4. Matches my hand count from the edge table (Mill Pond, Cedar Bend, Quarry Pool, Fox Creek, Old Bridge, Stone Weir, Heron Marsh); no duplicate pairs in the 10 short stretches, so degree = distinct neighbors. Done, then add Fill.

## Step 18 -- --click "Done"
18.png: Layer 1 shows 7, "Degree min 2". Adding Fill with the + next to Fill.

## Step 19 -- --click-at 1404,401
19.png: Fill section opened with an empty Color box (seems focused). Typing orange hex.

## Step 20 -- --click-at 1312,435 --type "#FFA500" --key Enter
20.png: 7 nodes orange on the canvas, and a legend card "Color: Layer 1 -- 7 of 11 nodes". Nice that the legend came for free. But flows.csv said 13/15 -- checking whether two stretches were dropped before I trust 7.

## Step 21 -- --click "Data" --click "flows.csv"
Ambiguous; its name says "13 of 15 rows joined". Clicking the data source row.

## Step 22 -- --click "flows.csv#1"
22.png: flows.csv source panel: "Loaded -- Nodes 1, Edges 14". Row says 13/15 joined, the network has 13 edges. Three numbers that don't agree and nothing says which rows didn't join. Trying the ... menu on flows.csv.

## Step 23 -- --click-at 271,169
23.png: menu: Edit join, Replace with file, Select nodes, Export, Rename, Remove. Opening Edit join to see unmatched rows (will not change anything).

## Step 24 -- --click "Edit join"
24.png: the join view finally explains it: 15 rows; one "Repeat, not added" (G03-G04 2.1, same as Cedar Bend-Fox Creek), one G09-G12 with an unknown end (4 km -- too long anyway). Chips at the top: "14 edges added, 1 new node, 1 not in graph, 1 repeated key, 1 unknown end". So nothing the crew could walk was lost. Cancelling.

## Step 25 -- --click "Cancel"
25.png: back where I was, nothing changed. 7 gauges orange, legend "7 of 11 nodes", filter "km max 2.9 -- 10 of 13" still on. Stopping here.

## End (in character, Maren)

Did I finish? Yes. 7 gauges are in orange: Mill Pond, Cedar Bend, Quarry Pool, Fox Creek, Old Bridge, Stone Weir, Heron Marsh. I got there with an edge filter (km 1.6 to 2.9, so the three stretches of 3 km or more are out: 10 of 13 edges), then a style layer whose "Which nodes" is Degree min 2, filled #FFA500. The layer says 7, the legend says 7 of 11, and my own count from the edge table says 7.

Ease: 5 of 7.

What worked: the edge filter was like a Cytoscape filter, and it showed counts right away (10 of 13, "No match 3"). The Degree panel and the Degree in "Which nodes" both counted on the filtered network: the range went to 3, not 4, and that is the step I was most worried about. The legend appeared on its own. Praise where it's due: "Oh -- the degree followed the filter. Good."

What confused me:
- Degree is not in the "Which nodes" list until you type it. The list showed only my data columns, so I thought at first I couldn't pick by neighbors at all. If I hadn't tried typing, I'd have given up on this route.
- flows.csv says "13/15", the source panel says "Loaded: Nodes 1, Edges 14", and the network has 13 edges. Three numbers that don't agree. Only "Edit join" told me why: one repeated row and one row going to a G12 that isn't in the gauge list. That should be one click from the 13/15, not hidden behind "Edit join", which sounds like it will change my data. For me a silent drop is where I stop trusting the tool. Here it wasn't silent, but it was hard to find.
- The orange depends on the km filter staying on. If someone turns it off, I suspect degree is recounted and more gauges go orange, and nothing on the layer says "counted with the km filter on". For a figure I'd want that written down.
- Small: the canvas is a bit cramped above the table on this laptop, and the lower nodes sit behind the toolbar.

Would I use it? For a quick question like this, yes, it was faster than building a filter chain in Cytoscape. For a paper figure I'd still want the parameters (the km cutoff, the degree rule) printed in the legend, not just "Layer 1".

## Follow-up

Facilitator: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen."

Maren: 3. Mostly I knew the next step -- filter the edges, then pick nodes by how many neighbors they have, then color them -- because it is the same chain I would build in Cytoscape. The moment I was least sure was when I opened "Which nodes" on the new layer (screenshot 14). The editor was open on the right with its Value list, and that list showed only my own columns: lat, lon, depth_cm, station and so on. No Degree, no neighbor count, nothing about connections. For a few seconds I thought this program simply could not pick nodes by their neighbors, and I did not know whether to look in another tab, go back to the Data place, or give up on the layer. I only found Degree because I typed "degree" into the search on a hunch. A close second was the "13/15" on flows.csv next to "Loaded: Nodes 1, Edges 14" and a network with 13 edges -- three numbers that did not agree and nothing on that screen saying which rows were dropped, until I risked "Edit join".
