# Session r2-s04 -- Alex, task T20 (dataset B: hiking trails, trails.csv)

Participant: Alex, operations analyst, returning weekly user.
Build: frozen build named on the first line of tier2/criteria.md (8f0d5a6f7791).

## Steps

### 1. Start
Command: `REAL_DIST=<frozen build> node tool/real.mjs --start <session> empty`
Screenshot: 01.png
Notes: Start screen I know. Open project or file, New from data, samples on the right. "Files are read
on this computer and never uploaded" -- good. There is a usage-data banner at the bottom; I'll say
no thanks to get it out of the way.

### 2. Dismiss the usage banner
Command: `--step --click "No thanks"`
Screenshot: 02.png
Notes: Banner gone. Same as every week: Open project or file, then pick the CSV from Downloads.

### 3. Open trails.csv
Command: `--step --click "Open project or file..." --upload trails.csv`
Screenshot: 03.png
Notes: "Open as a new graph". trails: 9 nodes, 13 edges -- matches the file (13 trails, 9 junctions).
Columns: from -> From, to -> To, km -> "Attribute". And right under it: "Weight: none (each edge
counts 1)". That's the thing -- I want km to be the weight. I'll open the km dropdown and see what
else it can be.

### 4. Click "km" (ambiguous)
Command: `--step --click "km"`
Screenshot: 04.png
Notes: Two things are called km (the table header and the dropdown). I meant the dropdown under the km heading.

### 5. Open the km role list
Command: `--step --click "Role of km"`
Screenshot: 05.png
Notes: Options: From, To, Weight, Date or time, Edge id, Attribute. Weight -- that's the Gephi word. Picking it.

### 6. Choose Weight for km
Command: `--step --click "Weight"`
Screenshot: 06.png
Notes: Now "Weight: km" and a new row "Higher means: Not set / Closer / Farther / Capacity", with a line
saying until I choose, a path counts every edge as one step. Good that it warns me -- in NetworkX I'd
just pass weight='km' and it'd treat it as a cost. More km is a longer walk, so "Farther".

### 7. Choose Farther
Command: `--step --click "Farther"`
Screenshot: 07.png
Notes: "Weight: km (farther)" and "a path takes the smallest total". Exactly what I want. Before I hit
Load: Direction says "As the file says". A CSV doesn't say anything about direction. Trails go both
ways, so I want to see what the choices are.

### 8. Open Direction
Command: `--step --click "Direction"`
Screenshot: 08.png
Notes: As the file says / Directed / Undirected. Trails go both ways -- Undirected. (No hint what "as
the file says" turns into for a CSV, but I'll just be explicit.)

### 9. Choose Undirected
Command: `--step --click "Undirected"`
Screenshot: 09.png
Notes: Set. Now Load.

### 10. Load
Command: `--step --click "Load"`
Screenshot: 10.png
Notes: Loaded. Right panel Values -> Overview: Nodes 9, Edges 13, Direction "Undirected, set in the
project", "Loaded weight: km (farther)", 1 component. Counts match the file, and it says it has km as
the weight. No labels on the dots, which is annoying -- I can't tell which one is the Trailhead.
Now the shortest walk. The analysis button in the toolbar (the flask) is where I run things.

### 11. Hover the flask
Command: `--step --hover-at 680,864`
Screenshot: 11.png
Notes: Tooltip "Analyze (Shift+A)". Click it.

### 12. Open Analyze
Command: `--step --click-at 680,864`
Screenshot: 12.png
Notes: The list I know, with a "Filter analyses" box focused. I'll type "shortest" rather than scroll.

### 13. Type "shortest"
Command: `--step --type "shortest"`
Screenshot: 13.png
Notes: "Shortest path -- The fewest steps, or the shortest path by weight, between two nodes." That one.

### 14. Pick Shortest path
Command: `--step --click "Shortest path"`
Screenshot: 14.png
Notes: From / To boxes, and Weight already says "km (farther, loaded)". Nice, it carried over. I type
Trailhead into From.

### 15. Type Trailhead into From
Command: `--step --click "Where the path starts" --type "Trailhead"`
Screenshot: 15.png
Notes: A suggestion "Trailhead" drops down. Press Enter to take it.

### 16. Enter
Command: `--step --key Enter`
Screenshot: 16.png
Notes: From = Trailhead, and the cursor jumped to To. Typing Summit.

### 17. Type Summit
Command: `--step --type "Summit"`
Screenshot: 17.png
Notes: "Summit" suggestion shows. Enter to take it.

### 18. Enter
Command: `--step --key Enter`
Screenshot: 18.png
Notes: From Trailhead, To Summit, Weight km (farther, loaded). Focus is on Find path. Click it.

### 19. Find path
Command: `--step --click "Find path"`
Screenshot: 19.png
Notes: Path drawn in black on the graph, legend "On the path". Right panel: Summary -- Path 5 nodes,
4 edges; Total km 7.5. Nodes in order: Trailhead, Creek, Meadow, Ridge, Summit. "Made with" says
Weight: km (farther). Checked it by hand against the file: 1.5 + 2 + 2.5 + 1.5 = 7.5. The other
routes I can see are longer (Trailhead-Pine Fork-Summit 9, via Pine Fork and Meadow 8, via Lookout
8.5, via Lake 9). So it's right. That's my answer. Ending.

### 20. End
Command: `--end`

## Outcome (in character)

**Finished:** yes. Shortest walk Trailhead -> Creek -> Meadow -> Ridge -> Summit, 7.5 km. Where it
says it used the kilometers: the result panel's "Total km 7.5" and "Made with -- Weight: km
(farther)", plus the graph's Overview "Loaded weight: km (farther)" right after loading.

**Ease:** 6 out of 7.

**What confused me / what I'd grumble about:**
- When I loaded the file, km came in as "Attribute" and the line said "Weight: none (each edge counts
  1)". Good that it told me, but I had to know to go change it; in NetworkX I'd just say weight='km'.
  Then it asked again what a higher number means (Closer / Farther / Capacity). Once I picked Farther
  the line under it said exactly what a path would do with it, which I liked.
- Direction defaults to "As the file says". A CSV doesn't say anything about direction, so I didn't
  know what that would turn into. I set Undirected myself to be safe.
- No labels on the dots, so on the picture I couldn't tell which ball was the Trailhead or the
  Summit. The From/To boxes saved me by letting me type the names.
- The left list says "Shortest path 4 hops" while the answer I care about is 7.5 km. Not wrong, but
  the km total is the number I'd put in a sentence, and it's only on the right.
- Clicking "km" was ambiguous in the tool sense (table header and dropdown share the name); as a
  person I'd just have clicked the dropdown.
