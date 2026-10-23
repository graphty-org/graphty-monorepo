# Session r2-s08 -- Dana (supply-chain risk analyst), task T20 prompt B (hiking trails, trails.csv)

Build: 8f0d5a6f7791, served from /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/

Task as given: "You have used this program a few times. Your hiking club sent trails.csv, in your
Downloads folder: each row is a trail between two junctions and its length in kilometers. Bring it
into the program so that every calculation treats more kilometers as a longer walk, then work out
the shortest walk from the Trailhead to the Summit: which junctions, in order, and how many
kilometers in all. Show us where the program says it used the kilometers."

Tool: T=design/ui/studio/tool; S=this folder.

## Steps

### 01 -- start
Command: `REAL_DIST=<build> with-browser.sh node $T/real.mjs --start $S empty`

Dana: Same start screen as always. There's the data-collection box at the bottom; I'll say no
thanks first, then open the file. Last time I didn't have to tell it anything about my numbers --
this time the kilometers matter, so I'll watch whether it asks.

### 02 -- dismiss the data-collection box
Command: `node $T/real.mjs --step $S --click "No thanks"`

Dana: Gone. Now "Open project or file..." like every month, and pick trails.csv from Downloads.

### 03 -- open trails.csv
Command: `node $T/real.mjs --step $S --click "Open project or file" --upload trails.csv`
Output: a file chooser is open; chose the file trails.csv.

Dana: This is the preview table I remember -- a table, good, I can check it. 13 rows, from, to,
km. It guessed from and to right. But one line says "Weight: none (each edge counts 1)" and the km
column is set to "Attribute". So right now it would treat every trail as the same length. That is
exactly what I don't want. I'll open the km dropdown and see what else it can be.

### 04 -- the km column's list
Command: `node $T/real.mjs --step $S --click-at 728,211`
Output: at 728,211: combobox "Role of km".

Dana: Choices are From, To, Weight, Date or time, Edge id, Attribute. "Weight" is the one that
matches that "Weight: none" line. I'd have called it "cost" or "length", but fine -- pick Weight.

### 05 -- km set to Weight
Command: `node $T/real.mjs --step $S --click-at 690,139`
Output: at 690,139: option "Weight".

Dana: Now it says "Weight: km" and asks "Higher means": Not set, Closer, Farther, Capacity. The
line under it is actually useful -- until I choose, a path counts every trail as one step. That
would have bitten me. More kilometers is farther apart, so "Farther". Capacity sounds like a truck
lane, not a trail.

### 06 -- Farther chosen
Command: `node $T/real.mjs --step $S --click "Farther"`

Dana: "Weight: km (farther)" and a line: a higher weight means farther apart, a path takes the
smallest total. That is what I want. Direction says "As the file says" -- trails go both ways in
real life, but I'm not going to fiddle with something I don't need yet. Load.

### 07 -- loaded
Command: `node $T/real.mjs --step $S --click "Load"`

Dana: Nine dots, arrows, no names on them -- typical. On the right, the summary says "Loaded
weight: km (farther)". Good, that's one place it admits it has my kilometers. Now the shortest
walk. I always go to the analysis button in the toolbar (the flask), so I'll open it and look for
something about the shortest route.

### 08 -- the analysis list
Command: `node $T/real.mjs --step $S --click-at 679,864`
Output: button "Analyze".

Dana: The long list again -- Degree, Betweenness, Closeness, PageRank... words I skip. There's a
filter box at the top with the cursor in it. I'll type "shortest".

### 09 -- typed "shortest"
Command: `node $T/real.mjs --step $S --type "shortest"`

Dana: Four things. Down at the bottom: "Shortest path -- Start here -- The fewest steps, or the
shortest path by weight, between two nodes." "By weight" -- that's my km. Clicking it.

### 10 -- Shortest path form
Command: `node $T/real.mjs --step $S --click-at 566,806`

Dana: A small form: From, To, Follow (Out / All -- All is on), Weight already says "km (farther,
loaded)". So it carried my choice over without me asking -- that's what I wanted. Follow All
probably means both directions along a trail; fine for hiking. I'll click into From and type
Trailhead.

### 11 -- typed Trailhead
Command: `node $T/real.mjs --step $S --click "Where the path starts" --type "Trailhead"`

Dana: It offers "Trailhead" as a suggestion. Pick it.

### 12 -- From = Trailhead
Command: `node $T/real.mjs --step $S --click-at 563,627`
Output: option "Trailhead".

Dana: From is Trailhead and the cursor jumped to To on its own. Nice. Typing Summit.

### 13 -- typed Summit
Command: `node $T/real.mjs --step $S --type "Summit"`

Dana: "Summit" suggested. Pick it.

### 14 -- To = Summit
Command: `node $T/real.mjs --step $S --click-at 559,681`
Output: option "Summit".

Dana: Both ends set, km still selected, "Find path" is highlighted. Go.

### 15 -- the result
Command: `node $T/real.mjs --step $S --click "Find path"`

Dana: There it is, on the right, as a table, which is how I like it. Summary: Path 5 nodes, 4
edges; "Total km 7.5". Nodes in order: Trailhead, Creek, Meadow, Ridge, Summit. Down in "Made
with" it says Weight: km (farther). I'll check it against the preview I saw: Trailhead-Creek 1.5,
Creek-Meadow 2, Meadow-Ridge 2.5, Ridge-Summit 1.5 = 7.5. The obvious alternative,
Trailhead-Pine Fork-Summit, is 3 + 6 = 9, and Trailhead-Pine Fork-Meadow-Ridge-Summit is 8. So
7.5 is right, and it really did use the kilometers and not just count trails -- by count, Pine
Fork's two-trail route would have won. The path is drawn in black on the picture with a little key
"On the path". One thing that made me squint: the list on the left says "Shortest path 4 hops".
Hops? The answer is in km. That label reads like it counted trails. I'd want it to say 7.5 km.
The black lines are thick but the dots still have no names on them, so the picture alone tells me
nothing; the table does. That's all I need. Done.

Command: `node $T/real.mjs --end $S`

## Debrief (in character)

- **Finished?** Yes. Shortest walk: Trailhead -> Creek -> Meadow -> Ridge -> Summit, 7.5 km in
  all. Where it says it used the kilometers: on the open-file screen ("Weight: km (farther)" and
  the line "a path takes the smallest total"), in the graph summary ("Loaded weight: km
  (farther)"), in the path form ("Weight: km (farther, loaded)"), and in the result ("Total km 7.5"
  and, under "Made with", "Weight: km (farther)").
- **Ease: 6 of 7.** Fifteen clicks and no dead ends. The open-file screen is the part that earned
  it: it told me straight out "Weight: none (each edge counts 1)" before I loaded, so I knew to
  change it, and once I did, the path tool picked it up without me telling it again. That is what
  I want every month: tell it once.
- **What confused me or slowed me down:**
  - Nothing on the open screen said the km column would be ignored unless I changed its role from
    "Attribute" to "Weight" -- only the small "Weight: none" line hinted at it. I caught it because
    I was looking for it. If I hadn't been told the kilometers mattered I would have hit Load.
  - "Weight" is a math word for what I'd call cost, length or km. "Higher means: Closer / Farther
    / Capacity" made sense once I read it; "Capacity" I ignored.
  - The left list's "Shortest path 4 hops" next to an answer in km made me doubt for a second
    whether it had counted trails instead. The right side says 7.5 km, so I trusted that.
  - The drawing still has no names on the dots, so the black route on the picture is meaningless
    without the table.
  - "Direction: As the file says" -- trails go both ways; I left it alone and "Follow: All" in the
    path form seemed to cover it, but I wasn't sure what it would have done otherwise.
- **Would I use it for work?** For "what's the cheapest route through my network", yes, the table
  is what I'd export. Still the same questions as always: does this go into Power BI, and does IT
  sign off on it. At least it says "Local only" and that files are never uploaded.
