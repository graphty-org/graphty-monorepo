# Session r5-s29b -- Nadia, returning user

Task: bring bus-stops.csv in so every calculation treats more minutes as a longer trip, find the quickest way from Depot to Harbor (stops in order, total minutes), and show where the program says it used the minutes.

All commands run from the studio worktree with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/` and session folder `S=tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s29b`.

## Step 01 (already started)
Start screen. Usage-data box at the bottom. I'll say No thanks first, then open the file like I always do.

Command: `--step $S --click "No thanks"` -> 02.png

## Step 02
Box gone. Opening bus-stops.csv with "Open project or file...", the way I did before.

Command: `--step $S --click "Open project or file" --upload bus-stops.csv` -> 03.png

## Step 03
"Open as a new graph" preview: 10 nodes, 17 edges. Columns from / to / minutes; minutes is set to "Attribute", and a line says "Weight: none (each edge counts 1)". That's exactly what I don't want. Opening the minutes dropdown.

Command: `--step $S --click "minutes"` -> ambiguous (column header button vs "Role of minutes" dropdown), nothing happened, 04.png

## Step 04
I meant the dropdown, the one that says Attribute.

Command: `--step $S --click "Role of minutes"` -> 05.png

## Step 05
List: From, To, Weight, Date or time, Edge id, Attribute. "Weight" is the only thing that sounds like it. Picking it.

Command: `--step $S --click "role=option:Weight"` -> 06.png

## Step 06
Now "Weight: minutes" and a new row "Higher means: Not set / Closer / Farther / Capacity", with a line saying until I choose, a path counts every edge as one step. More minutes is a longer trip, so "Farther".

Command: `--step $S --click "Farther"` -> 07.png

## Step 07
"Weight: minutes (farther)" and "a higher weight means farther apart, such as a longer distance or travel time; a path takes the smallest total." That's the sentence I'd want. Leaving Direction as the file says. Load.

Command: `--step $S --click "Load"` -> 08.png

## Step 08
Graph loaded, 10 dots, no names on them. Right panel Overview says "Loaded weight: minutes (farther)" -- good, that's one place it says it. I've never had it work out a chain. The left bottom says "Analyze in the toolbar (Shift+A)". Clicking Analyze.

Command: `--step $S --click "Analyze"` -> 09.png

## Step 09
A long list of analyses (Degree, Betweenness, PageRank...). Filter box is focused. Typing "path".

Command: `--step $S --type "path"` -> 10.png

## Step 10
"Shortest path (Start here): the fewest steps, or the shortest path by weight, between two nodes." Also "Guided route: select 2 nodes first". Shortest path it is.

Command: `--step $S --click "Shortest path"` -> 11.png

## Step 11
Shortest path form: From, To, Follow Out/All (All is on), Weight already says "minutes (farther, loaded)". Nice, I don't have to pick it again. Typing Depot in From.

Command: `--step $S --type "Depot"` -> 12.png

## Step 12
A suggestion "Depot" dropped down. Clicking it.

Command: `--step $S --click "role=option:Depot"` -> 13.png

## Step 13
From = Depot, cursor jumped to To. Typing Harbor.

Command: `--step $S --type "Harbor"` -> 14.png

## Step 14
Expecting a Harbor suggestion like before; picking it.

Command: `--step $S --click "role=option:Harbor"` -> 15.png

## Step 15
From Depot, To Harbor, weight minutes. Find path.

Command: `--step $S --click "Find path"` -> 16.png

## Step 16
Result panel on the right. Summary: "Path 5 nodes, 4 edges", "Total minutes 14". Nodes in order: Depot 1, Market 2, Park 3, Clinic 4, Harbor 5. Under "Made with": Analysis Shortest path, From Depot, To Harbor, Follow All, "Weight: minutes (farther)". That's where it says it used the minutes. Left list also shows "Shortest path  minutes 14". The path is drawn in black on the canvas.
Checked against the rows I saw on import: Depot-Market 4, Market-Park 3, Park-Clinic 4, Clinic-Harbor 3 = 14. The obvious alternative Depot-Market-Library-Harbor is 4+6+5 = 15, so 14 holds up. That's my answer. Ending.

Command: `--end $S`

Session ended.

## Wrap-up (in character)

- **Finished?** Yes. Quickest way Depot -> Market -> Park -> Clinic -> Harbor, 14 minutes. The program says it used the minutes in two places: the graph Overview right after loading ("Loaded weight: minutes (farther)") and the path result's "Made with" section ("Weight: minutes (farther)"); the left list also labels the run "minutes 14".
- **Ease:** 6 of 7. About sixteen clicks, under the length of one alert. Every step was in front of me.
- **What confused me:**
  - On import, the minutes column came in as plain "Attribute" with "Weight: none (each edge counts 1)". If I hadn't read that line I'd have loaded it wrong and got a fewest-stops answer. I had to know to change the column to Weight and then pick what "higher means".
  - "Closer / Farther / Capacity" -- Farther was right for travel minutes, and the line under it said so, but I'd have hesitated if it hadn't spelled out "travel time".
  - "Follow: Out / All" -- I left it on All. Not sure whether a bus only runs one way along each row; the file had arrows ("Directed") and the path used All. QA might ask whether a leg was taken against the arrow. I didn't check.
  - The dots on the map have no names, so the picture alone wouldn't tell QA which stop is which; the ordered list on the right does.
