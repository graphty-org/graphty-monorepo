# Session r3-s01 -- Nadia, level-1 alert reviewer (returning user)

Task: load bus-stops.csv so calculations treat more minutes as a longer trip, find the quickest
way from Depot to Harbor (stops in order, total minutes), and show where the program says it used
the minutes.

All commands ran from the worktree root with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ and
S=tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s01 (written out in full when run).
Screenshots are beside this file.

## Steps

### 1. Start
`node design/ui/studio/tool/real.mjs --start $S empty` -> 01.png
Start screen, usage-data banner at the bottom. Same as before. I'll dismiss the banner and open the
file.

### 2. Open the file
`--step $S --click "No thanks" --click "Open project or file" --upload bus-stops.csv` -> 02.png
An import screen: 10 nodes, 17 edges, from/to/minutes columns. It says "Weight: none (each edge
counts 1)" and the minutes column is set to "Attribute". That is exactly what the colleague said
not to do. Next: open the minutes dropdown and see if I can make it the weight.

### 3. Pick the minutes dropdown
`--step $S --click "minutes"` -> 03.png: refused, two controls named "minutes" (the column header
and the dropdown). Retried with the dropdown's name.
`--step $S --click "Role of minutes"` -> 04.png
List: From, To, Weight, Date or time, Edge id, Attribute (ticked). Weight is what I want.

### 4. Choose Weight
`--step $S --click "role=option:Weight"` -> 05.png
Now "Weight: minutes" and a new row "Higher means: Not set / Closer / Farther / Capacity", with a
line saying until I choose, a path counts every edge as one step. More minutes is a longer trip,
so "Farther". Clicking it.

### 5. Farther
`--step $S --click "Farther"` -> 06.png
"Weight: minutes (farther)" and "a higher weight means farther apart, such as a longer distance or
travel time; a path takes the smallest total." That's the sentence I'd paste into the file. Left
Direction at "As the file says". Load.

### 6. Load
`--step $S --click "Load"` -> 07.png
The network: 10 dots with arrows, no names on them. The right panel says "Loaded weight: minutes
(farther)" and "Direction: Directed". Good, that's one place it says it has the minutes. Now I
need a route. I've only ever used the analysis button (flask) for ranking; trying it for a path.

### 7. Analyze
`--step $S --click-at 680,864` (button "Analyze") -> 08.png
A list of analyses with a "Filter analyses" box focused: Degree, Betweenness, ... All-pairs
distance, Depth-first order, Most flow. Nothing says "route" on screen. Typing "path".

### 8. Filter "path"
`--step $S --type "path"` -> 09.png
Under "Find paths and edge sets": "Shortest path (Start here) -- the fewest steps, or the shortest
path by weight, between two nodes" and "Guided route -- Select 2 nodes first" (grayed). Picking
Shortest path.

### 9. Shortest path form
`--step $S --click "Shortest path"` -> 10.png
A small form: From, To, Follow (Out / All -- All is on), Weight already "minutes (farther,
loaded)", Advanced, Find path. Weight is already filled in, nice. Typing Depot in From.

### 10. From = Depot
`--step $S --click "Where the path starts" --type "Depot"` -> 11.png
A suggestion "Depot" drops down. Picking it, then the same for Harbor in To.

### 11. To = Harbor
`--step $S --click-at 556,627 --click "Where the path ends" --type "Harbor"` -> 12.png
(the click-at picked option "Depot".) From shows Depot. Harbor suggestion showing. Pick it, then
Find path.

### 12. Find path
`--step $S --click-at 556,681 --click "Find path"` -> 13.png
(the click-at picked option "Harbor".) The route is drawn in black on the canvas. Right panel:
Summary "Path 5 nodes, 4 edges", "Total minutes 14". Nodes in order: Depot 1, Market 2, Park 3,
Clinic 4, Harbor 5. "Made with" lists Analysis Shortest path, From Depot, To Harbor, Follow All,
Weight "minutes (farther)". The left list also has a row "Shortest path -- minutes 14". Checked
against the table I saw at import: Depot-Market 4, Market-Park 3, Park-Clinic 4, Clinic-Harbor 3
= 14. The other ways I can see (via Library 15, via School 21) are longer. Done.

### 13. End
`node design/ui/studio/tool/real.mjs --end $S` -> "session ended", no further request.

## At the end (in character)

**Did I finish?** Yes. Quickest way Depot -> Market -> Park -> Clinic -> Harbor, 14 minutes in all.
Where it says it used the minutes: at import ("Weight: minutes (farther)" with "a path takes the
smallest total"), in the graph's Overview ("Loaded weight: minutes (farther)"), in the path form
(Weight "minutes (farther, loaded)") and in the result's "Made with" (Weight "minutes (farther)"),
plus the "Total minutes 14" line.

**Ease: 6 of 7.** About as long as one alert. The result panel is what I'd want in a file: what I
asked, what it used, the stops in order and the total.

**What confused me or slowed me down:**
- At import the minutes column comes in as a plain "Attribute" with "Weight: none". If I'd hit Load
  straight away every path would have counted stops, not minutes. The "Higher means" choice only
  appears after I pick Weight, and it starts at "Not set".
- "Closer / Farther / Capacity" -- I got Farther from the sentence under it, not from the word.
- The analysis list doesn't say "route" or "quickest"; I only found Shortest path by typing "path"
  in the filter.
- Two things on the import screen are both called "minutes" (the column header and its dropdown).
- The stops have no names on the picture, so the drawing alone would not go into a file; I'd need
  the panel with it.
- "Follow: Out / All" -- I left All on. The overview says the network is Directed; I'm not sure
  whether All means the bus can run a link backwards. I didn't change it.
