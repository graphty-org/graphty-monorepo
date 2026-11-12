# Session r1-s02 transcript (Maren)

## Step 1
Note: Starting the app fresh. I need to put two spreadsheets together: gauges.csv (nodes) and flows.csv (edges).
Command: --start /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier4/tmp/studio-sessions/tier4/rounds/round-1/sessions/r1-s02 empty
Saw: start screen with "Open a file", "Open network data", "Samples", "New project". Spinning 3D demo on the right.

## Step 2
Note: Familiar start screen. Last time I opened the gauge list via Open a file. I'll start the same way with gauges.csv and look for a way to add the stretches.
Command: --step --click "Open a file" --upload gauges.csv
Saw: gauges loaded: 11 nodes, 0 edges, table with id, lat, lon, depth_cm, station, code, installed. Warning icons on depth_cm and station. Good that it tells me counts.

## Step 3
Note: 11 gauges, no edges yet, as expected. In Cytoscape I'd do File > Import > Table. Here there's a "Data" tab on the left rail -- I'll try that to bring in flows.csv.
Command: --step --click "Data"
Saw: Data panel with "Sources" (gauges.csv, 11, warning 3), "Rows are: nodes", Id = id, Latitude/Longitude mapped. A + next to Sources.

## Step 4
Note: "Sources" with a plus -- that looks like where I add the second file. Clicking the + next to Sources.
Command: --step --click-at 276,100
Saw: menu: File..., Samples..., Server..., Network data..., Paste.

## Step 5
Note: "File..." it is. Adding flows.csv.
Command: --step --click "File..." --upload flows.csv
Saw: a "Join flows.csv -> gauges.csv" preview. Edges, Source from = Id, Target to = Id, Ignore case / Ignore spaces. Chips: "14 edges added", "1 new node", "1 not in graph", warning "1 repeated key". flows.csv 15 rows; row G09 -> G12 has no edge chip; G03 - G04 appears twice.
This is actually what I wanted from Cytoscape: counts of what matched before I commit. But "1 new node" and "1 not in graph" -- are those the same thing (G12)? Not sure.

## Step 6
Note: I want to know what "1 not in graph" means before I click Join. Hovering it.
Command: --step --hover "1 not in graph"
Saw: no tooltip on "1 not in graph".

## Step 7
Note: No explanation on hover. Clicking the chip to see if it filters to the row.
Command: --step --click "1 not in graph"
Saw: the chip filtered flows.csv to one row: G09 -> G12, 4 km, no edge chip. G12 is not in the gauge list. Oh -- it actually shows me the row that didn't match. Good.

## Step 8
Note: Now what is "1 new node"? Is it going to make up a G12 gauge, or is that the same row? Clicking that chip.
Command: --step --click "1 new node"
Saw: nothing changed; "1 new node" chip does nothing when clicked.

## Step 9
Note: So I still don't know if Join will invent a G12 gauge ("1 new node") or skip that row ("not in graph"). The two chips contradict each other. There's a little arrow next to Join -- maybe the choice is there.
Command: --step --click-at 1119,60
Saw: Join choices: Join, Add as rows, Replace gauges.csv, Open as a separate graph. Nothing about what to do with the unmatched G12 row.

## Step 10
Note: Plain "Join" is what I want -- stretches onto the gauges. I'll just do it and check the counts afterwards against what the preview promised.
Command: --step --click "role=menuitem:Join"
Saw: menu closed, nothing else changed. The menu item probably only picks the mode.

## Step 11
Note: Still the preview. Pressing the green Join button itself.
Command: --step --click-at 1083,60
Saw: joined. Graph overview: Nodes 12, Edges 14, Components 1. Sources: gauges.csv 11; flows source 12 nodes, 14 edges, warning 1. The network looks like a river chain.
Hm. 12 nodes, but the gauge list has 11. So it made up a G12 gauge from the stretch list. That's the "1 new node". I need to confirm.

## Step 12
Note: Scrolling the node table to the bottom to see whether a G12 row exists with empty values.
Command: --step --wheel 740,700,600
Saw: last row G12, all columns empty. Confirmed: it created a gauge G12 that isn't in the gauge list.

## Step 13
Note: So 15 stretch rows became 14 edges -- presumably the duplicate G03-G04. The flows source has a warning "1". Clicking it to see what the app says the issue is.
Command: --step --click-at 235,162
Saw: "Issues in flows.csv": edges, "1 unknown end", buttons Add nodes (green, seems to be what was applied), Leave out, Ignore.
OK, there it is. It defaulted to adding a node for the unknown end. I don't want an invented gauge with no data in a network I hand back to the river team -- G12 isn't on their gauge list. I'd rather leave that stretch out and report it.

## Step 14
Note: Clicking "Leave out" so the network only has gauges from the gauge list.
Command: --step --click "Leave out"
Saw: "Resolved 1". Now Nodes 11, Edges 13, Components 1. G12 gone. flows source shows 11 nodes, 13 edges, 0 issues.
15 stretch rows -> 13 edges: one left out (G09 -> G12), and the preview said "1 repeated key" (G03 - G04 listed twice). The issues list doesn't mention the repeat any more, so I want to see what happened to it.

## Step 15
Note: Closing the issues box and opening the Edges table to check G03 - G04.
Command: --step --click-at 596,170 --click "Edges"
Saw: Edges table, 13 edges, Source/Target/km. G03 -> G04 appears only once now (the second copy, which sat before G09 -> G12 in the preview, is gone). Source row now reads "flows.c... 1 | 11 | 13" -- I assume the "1" is the row I left out.
Nobody told me after the join that the duplicate row was folded in -- I only know because the preview said "1 repeated key" and I counted. That would have been an "it dropped data without telling me" moment if I hadn't looked at the preview.

## Done (in character, Maren)

Did I finish? Yes.
Answer for the river team:
- Gauges: 11 (G01-G11, all from gauges.csv).
- Stretches: 13 in the network.
- Not fitting: flows.csv has 15 rows. One stretch, G09 -> G12 (4 km), points to a gauge G12 that is not in the gauge list -- I left it out of the network. One stretch, G03 -> G04 (2.1 km), is listed twice, and the network keeps it once. So 15 rows -> 13 stretches.

Ease: 5 of 7.

What went well: adding the second file from Data > Sources > + was easy to find, and the join preview finally does what Cytoscape never does -- it told me up front how many edges matched, that one end was unknown, and that one key repeated, and clicking "1 not in graph" showed me the exact row. That is the count I always wanted.

What confused me:
- The preview showed "1 new node" AND "1 not in graph" for what turned out to be the same row, with no tooltip. I couldn't tell whether Join would invent a gauge or skip the stretch. It invented one (G12, all columns empty) by default; I only found out because the gauge count went from 11 to 12. Making up a node by default is exactly the kind of quiet thing I don't trust -- I'd want it to ask, or default to leaving it out.
- The choice to "Leave out" was only in the warning popover after the join, not in the join preview where I was already looking at the problem row.
- The Join split button: picking "Join" from its menu did nothing visible; I had to press the button itself.
- After the join, the repeated G03 - G04 row is no longer mentioned anywhere in the issues ("Resolved 1" only covered the unknown end). If I hadn't read the preview I'd not know 15 rows became 13.
- The "Rows are" / column-kind settings I'd look for from Cytoscape's import dialog were there for gauges.csv, but for flows.csv I only saw Direction "Auto" -- fine here, but I didn't go looking further.
- Still opens the network in 3D; for a river I'd expect it flat, and on the map since the gauges have lat/lon.

## Follow-up

Question: "How many of the stretches came from the second spreadsheet, and where did you read that?"

Answer (Maren): All 13 stretches in the network came from the second spreadsheet, flows.csv -- the gauge list has no stretches at all (it loaded as 11 nodes, 0 edges). I read the 13 in three places that agree: the Data panel's Sources list, where the flows.c... row shows "1 | 11 | 13" (the orange 13 is its edges) and the flows.csv section under Fields shows the edge chip "13"; the Graph panel's Overview on the right, Edges 13 ("From 2 files"); and the Edges table header, "13 edges". flows.csv itself had 15 rows: one (G09 -> G12) I left out because G12 is not a gauge, and the repeated G03 -> G04 is kept once. The "1" next to flows.c... I take to be the left-out row, but nothing on screen says so in words -- I'm inferring it from my own count.
