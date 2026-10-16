# Session r5-s35b -- returning user, bus stops quickest route

Task: bring bus-stops.csv in so that every calculation treats more minutes as a longer trip, find the
quickest way from Depot to Harbor (stops in order, total minutes), and show where the program says it
used the minutes.

Build: /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/
Session folder: tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s35b

All commands below use:
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs ... $S`
with S = the session folder.

## Steps

### 01 (start, already open)
Start screen. Open project or file, New from data, samples on the right, a "help us" box at the
bottom. I'll get rid of the box first.

Command: `--step $S --click "No thanks"` -> 02.png (box gone).

### 02
OK, clean start screen. My colleague's file is in Downloads. "Open project or file..." is the
first thing, I'll use that and pick bus-stops.csv.

Command: `--step $S --click "Open project or file..." --upload bus-stops.csv` -> 03.png.

### 03
A preview of my file, "Open as a new graph". from, to, minutes. It says "Weight: none (each edge
counts 1)" -- that sounds like it is ignoring my minutes. The minutes box says "Attribute". Let me
open that one and see if I can make minutes the weight.

Command: `--step $S --click "minutes"` -> 04.png (ambiguous: a column header button and the
"Role of minutes" box; nothing happened). I meant the box under "minutes".

Command: `--step $S --click "Role of minutes"` -> 05.png.

### 05
A list: From, To, Weight, Date or time, Edge id, Attribute. "Weight" -- that is what the line above
said was "none". Picking Weight.

Command: `--step $S --click "role=option:Weight"` -> 06.png.

### 06
Now it says "Weight: minutes" and asks "Higher means": Not set, Closer, Farther, Capacity. The
line under it says until I pick, a path counts every edge as one step. More minutes is a longer
trip, so "Farther".

Command: `--step $S --click "Farther"` -> 07.png.

### 07
"Weight: minutes (farther)" and "a path takes the smallest total". That is what I want. Direction
says "As the file says" -- buses go both ways I guess, I'll leave it. Load.

Command: `--step $S --click "Load"` -> 08.png.

### 08
Ooh, my stops as dots with arrows. No names on the dots though. On the right it says "Loaded
weight: minutes (farther)" -- good, it kept it. Now the quickest way from Depot to Harbor. Last
time the program "ranked who matters" from somewhere... bottom left says Analyze is the flask in
the toolbar. Trying that.

Command: `--step $S --click "Analyze"` -> 09.png.

### 09
A long list: Degree, Betweenness, Closeness, PageRank... words I don't know. There is a "Filter
analyses" box with the cursor in it. I'll type "quickest".

Command: `--step $S --type "quickest"` -> 10.png.

### 10
Nice, it found "Shortest path -- the fewest steps, or the shortest path by weight, between two
nodes". That's it. Clicking it.

Command: `--step $S --click "Shortest path"` -> 11.png.

### 11
A small form: From, To, Follow (Out / All), Weight already says "minutes (farther, loaded)". Good.
The From box has the cursor. Typing Depot.

Command: `--step $S --type "Depot"` -> 12.png.

### 12
A suggestion "Depot" dropped down. Picking it.

Command: `--step $S --click "role=option:Depot"` -> 13.png.

### 13
From = Depot, and the cursor jumped to To. Typing Harbor.

Command: `--step $S --type "Harbor"` -> 14.png. Same kind of suggestion, picking Harbor.

Command: `--step $S --click "role=option:Harbor"` -> 15.png.

### 15
Depot to Harbor, weight minutes. "Follow: Out / All" -- not sure what that means, All is picked,
I'll leave it. Find path.

Command: `--step $S --click "Find path"` -> 16.png.

### 16
There it is. Black dots and thick lines on the picture, and on the right: Path 5 nodes, 4 edges,
"Total minutes 14". "Nodes in order": Depot 1, Market 2, Park 3, Clinic 4, Harbor 5. Under "Made
with" it says "Weight: minutes (farther)" -- that's where it says it used the minutes. The left list
also has "Shortest path -- minutes 14". Quick check against the file: Depot-Market 4, Market-Park 3,
Park-Clinic 4, Clinic-Harbor 3 = 14. Matches. Done.

Command: `--end $S`

Session ended normally (no further request).

## In my words, at the end

- **Did I finish?** Yes. Quickest way from Depot to Harbor: Depot -> Market -> Park -> Clinic ->
  Harbor, 14 minutes in all. The program says it used the minutes in the result panel under "Made
  with": "Weight: minutes (farther)" (and "Total minutes 14" in the Summary); the graph's Overview
  also says "Loaded weight: minutes (farther)".
- **Ease:** 6 out of 7.
- **What confused me:**
  - On the open screen, clicking "minutes" hit the column header instead of the box under it; I
    had to aim for the box itself.
  - "Weight: none (each edge counts 1)" told me something was off, but I only knew to fix it
    because it sat right above my minutes column. Once I picked Weight, "Higher means: Closer /
    Farther / Capacity" with the sentence under it was clear.
  - The Analyze list is full of words I don't know (Betweenness, Katz, HITS); typing "quickest"
    in the filter box is what found "Shortest path".
  - "Follow: Out / All" -- no idea what it means; I left the default and hoped.
  - The dots have no names on the picture, so I could only read the route from the list on the
    right, not from the drawing.
