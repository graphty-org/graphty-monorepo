# Session r1-s22 -- Maren (returning user)

Task: gauges named by station name everywhere; path length measured by river kilometers, not stretches; report what G05 is now called.

Env for every command: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292 REAL_TIER=4, tool: design/ui/studio/tool/real.mjs, folder r1-s22.

## Step 0 -- start
Command: `real.mjs --start <folder> setup:gauges-joined.txt`
Saw: the gauges project, 12 nodes / 14 edges, node table with id (G01...), station names, and a "code" column (0041...). Hmm -- the task says "code G05", but the code column holds 0068 for the row whose id is G05. I'll treat the id as the gauge's code for now and note it.

## Step 1
Command: `--step --click-at 65,366` (expand gauges.csv under Fields). Result: shows Rows are nodes, Id=id, Latitude=lat, Longitude=lon, and a + to add another field role.

## Step 2
Thinking: "In Cytoscape I'd set the label mapping in Style. Here, the + next to the node count might let me add a Label field."
Command: `--step --click-at 276,436`
Result: a menu of roles: Label, Kind, Weight, Time, Coordinates, Country, Region, City. "Label -- that's what I want."

## Step 3
Command: `--step --click "Label"`
Result: a Label row appeared with an open column list (lat, lon, depth_cm, id, station, code, installed, telemetry). "Station, obviously."

## Step 4
Command: `--step --click "role=option:station"`
Result: Label = station; the station column header now carries a "Label" tag. "Good, it marks it right in the table." Now for the river kilometers -- that's an edge thing, so the flows.csv fields.

## Step 5
Command: `--step --click-at 276,287` (the + under flows.csv)
Result: menu with Weight and Time. "Weight -- like edge weight for shortest paths in Cytoscape."

## Step 6
Command: `--step --click "Weight"`
Result: Weight row with a list holding only "km". "Only one numeric column. Fine."

## Step 7
Command: `--step --click "role=option:km"`
Result: Weight = km, and a new empty "Higher means" box. The Overview now says "Loaded weight: km". "Higher means... farther, I'd guess. Let's see the choices."

## Step 8
Command: `--step --click "Higher means"`
Result: nothing visibly opened. "Hm. Click the box itself."

## Step 9
Command: `--step --click-at 212,381`
Result: options closer / farther / capacity. "More km = farther. Obviously." (Clicking it by its label in step 8 did nothing; clicking the box did.)

## Step 10
Command: `--step --click "role=option:farther"`
Result: Higher means = farther; Overview says "Loaded weight: km (farther)". Both settings are in. But the canvas still shows no names, and the station column has a warning triangle. 12 nodes but gauges.csv has 11 rows -- one gauge has no station? "That's the silent-mismatch thing again. What's the warning?"

## Step 11
Command: `--step --hover-at 924,509`
Result: "Issues in station", no tooltip. "Tells me nothing. Try the 'With issues 11' chip."

## Step 12
Command: `--step --click-at 509,448`
Result: chip turned on; "Willow Run" (G06) and the "-" depth for G07 are tinted as issues. G05 / Old Bridge looks clean. "Fine, not my problem today. Does the drawing actually use the names now? No labels on the canvas. Click a node."

## Step 13
Command: `--step --click-at 661,274`
Result: the side panel heading says "Cedar Bend" for G03 -- so the program now names the gauge by station. "Good. Now G05 -- click its row and see what the panel calls it."

## Step 14
Command: `--step --click-at 325,674`
Result: the side panel heading now reads "Old Bridge" for the row with id G05 (code column 0068). The view moved to center that node.

## Wrap-up (in character, Maren)

Did I finish? Yes. Gauges are named by station (Data > Fields > gauges.csv > + > Label = station), and the river stretches are weighted by km with "Higher means: farther" (Data > Fields > flows.csv > + > Weight = km). The program now calls the gauge G05 "Old Bridge".

Ease: 5 out of 7.

What confused me:
- The word "code". The table has a column literally called "code" (0041, 0068...), and no row has code G05 there. G05 is in the id column. I went with the id, since that's what the program draws on, but a colleague asking "code G05" could mean either. Someone looking up "0068" would get the same gauge anyway.
- "Higher means" did not open when I clicked its label, only when I clicked the box itself. Minor, but I clicked twice.
- The options for Weight were a bit hidden: you have to know that the small + next to the edge count adds roles. In Cytoscape I'd set this in the import dialog or the style, so I'd never have guessed "+" without trying it.
- The station column has a warning triangle, and hovering it just said "Issues in station" with no reason. The "With issues" chip tinted Willow Run but never said why. That's exactly the kind of silent "something is wrong with your data" message I don't trust.
- 12 nodes but gauges.csv has only 11 rows -- one gauge has no station name, and nothing told me which one or what it will be called now.
- The canvas still draws no names on the nodes; I only saw the new name in the side panel heading. "Everywhere it names a gauge" -- I'd want to see labels on the drawing too.
