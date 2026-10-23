# Session r2-s02 -- Dev (returning student), task T20, dataset B (trails.csv)

Build: the frozen study build named on the first line of `tier2/criteria.md`
(`.study-builds/tier2-r2d4-8f0d5a6f7/`, build 8f0d5a6f7791).

Commands run from `design/ui/studio`, with `S=tier2/rounds/round-2/sessions/r2-s02` and
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/`.

## Steps

### 01 -- start
`node tool/real.mjs --start $S empty`

Okay, the start screen, same as last time. "Open project or file..." is right there, that's how I
opened the class spreadsheet before. First the usage-data box at the bottom -- I'll say no thanks
like I did before.

### 02 -- dismiss the data box
`node tool/real.mjs --step $S --click "No thanks"`

Box gone. Now I open the hiking club's trails.csv the way I opened the class sheet: "Open project
or file...".

### 03 -- open trails.csv
`node tool/real.mjs --step $S --click "Open project or file" --upload trails.csv`

Wait, this is a page I don't really remember -- "Open as a new graph", with my rows in a table.
It got from, to and km right: 9 junctions, 13 trails. But there's a line "Weight: none (each edge
counts 1)". That's exactly my worry -- it's ignoring the km. Under km there's a dropdown that says
"Attribute". I'll open it and see if I can tell it km is the length.

### 04 -- (missed click)
`node tool/real.mjs --step $S --click "km"` -- ambiguous (the column header and the dropdown); nothing happened.

I meant the dropdown under "km", the one saying "Attribute".

### 05 -- the km dropdown
`node tool/real.mjs --step $S --click "Role of km"`

The list: From, To, Weight, Date or time, Edge id, Attribute. "Weight" -- that's the word from the
Gephi tutorial, the weight column. And the line above the table says "Weight: none", so picking
Weight should change that. Trying it.

### 06 -- km set as Weight
`node tool/real.mjs --step $S --click "Weight"`

Now it says "Weight: km", and under it "Higher means": Not set, Closer, Farther, Capacity. The line
under that says until I choose, a path counts every edge as one step and PageRank reads a higher
weight as closer. Oh -- so if I stopped here it would think a long trail is a close one. For trails
more km is a longer walk, so "Farther". Clicking Farther.

### 07 -- Farther chosen
`node tool/real.mjs --step $S --click "Farther"`

"Weight: km (farther)", and the note says a higher weight means farther apart and a path takes the
smallest total. That's what I meant. One more thing from the tutorial: "Undirected as Graph Type".
Trails go both ways, and down at the bottom there's "Direction: As the file says". Let me look at
what's in there.

### 08 -- Direction list
`node tool/real.mjs --step $S --click "Direction"`

As the file says, Directed, Undirected. Trails go both ways, so Undirected, like the tutorial.

### 09 -- Undirected
`node tool/real.mjs --step $S --click "Undirected"`

Top line now says "each edge goes both ways". Weight: km (farther). Good. Load.

### 10 -- loaded
`node tool/real.mjs --step $S --click "Load"`

Oh nice, the drawing, and on the right the overview says "Loaded weight: km (farther)" and
"Undirected, set in the project". That's one place that shows it read the km -- I could screenshot
that for my instructor. No names on the dots yet, though. Now the quickest walk from Trailhead to
Summit. Last time the ranking was in the analysis button in the toolbar (the flask), so I'll look
there first.

### 11 -- the Analyze list
`node tool/real.mjs --step $S --click-at 679,864` (the Analyze button)

A long list of rankings: Degree, Betweenness, Closeness, PageRank... "All-pairs distance" sounds
close but it's "from all the others", not from one place to another. There's a filter box at the
top. I want the shortest walk, so I'll type "shortest".

### 12 -- filtered to "shortest"
`node tool/real.mjs --step $S --type "shortest"`

Under "Find paths and edge sets" there's "Shortest path -- Start here: the fewest steps, or the
shortest path by weight, between two nodes." That's it. "By weight" -- and my weight is km.
Clicking it.

### 13 -- the Shortest path box
`node tool/real.mjs --step $S --click-at 565,806`

From, To, and Weight already says "km (farther, loaded)" -- so it's using what I set when I
opened the file. Good. I'll click "Where the path starts" and type Trailhead.

### 14 -- typed Trailhead
`node tool/real.mjs --step $S --click "Where the path starts" --type "Trailhead"`

It suggests "Trailhead" in a list under the box. Clicking the suggestion.

### 15 -- From is Trailhead
`node tool/real.mjs --step $S --click-at 563,679`

From says Trailhead and the To box looks highlighted, like it's ready for me. Typing Summit.

### 16 -- typed Summit
`node tool/real.mjs --step $S --type "Summit"`

Summit suggested. Clicking it.

### 17 -- From Trailhead, To Summit, Weight km (farther, loaded)
`node tool/real.mjs --step $S --click-at 559,733`

All three filled in. Find path.

### 18 -- the result
`node tool/real.mjs --step $S --click "Find path"`

Oh nice. The path is drawn in black, and the right side says: Path 5 nodes, 4 edges; Total km 7.5;
Nodes in order: Trailhead, Creek, Meadow, Ridge, Summit. Under "Made with" it says From Trailhead,
To Summit, Weight km (farther) -- that's where it says it used the kilometers, and it matches what
I meant. Let me check against the sheet: Trailhead-Creek 1.5, Creek-Meadow 2, Meadow-Ridge 2.5,
Ridge-Summit 1.5 = 7.5. Agrees. And the obvious one, Trailhead-Pine Fork-Summit, is 3 + 6 = 9, so
it really did pick by km and not by fewest trails (that one is only 2 trails). Done.

The one thing: there are no names on the drawing, so I can't tell from the picture which black dot
is which, and two of the dots near the bottom sit almost on top of each other. The list on the right
is what I'd screenshot for my instructor, not the drawing.

`node tool/real.mjs --end $S`

## End of session (in character)

**Did I finish?** Yes. The shortest walk from Trailhead to Summit is Trailhead, Creek, Meadow,
Ridge, Summit -- 7.5 km. The program shows that it used the kilometers in two places: the graph
overview right after loading ("Loaded weight: km (farther)") and the path's own "Made with"
section ("Weight: km (farther)"). The Shortest path box also showed "km (farther, loaded)" before
I ran it.

Essay sentence: "Treating trail length in km as distance, the shortest route from the Trailhead to
the Summit runs Trailhead - Creek - Meadow - Ridge - Summit, a total of 7.5 km, shorter than the
two-trail route via Pine Fork (9 km)."

**Ease: 6 of 7.**

**What confused me / what I noticed:**
- The "Open as a new graph" page was new to me -- last time I don't remember choosing anything.
  But the line "Weight: none (each edge counts 1)" told me straight away that it was ignoring km,
  which is exactly what I'd have missed otherwise.
- Picking "Weight" for km was easy because that's the tutorial word. "Higher means: Not set /
  Closer / Farther / Capacity" made me stop and think, but the sentence under it ("until you do,
  a path counts every edge as one step, and PageRank ... reads a higher weight as closer") made the
  choice obvious. I'm not sure what "Capacity" would be for.
- I had to know to change Direction to Undirected from the tutorial; nothing on the page told me
  trails would be treated as one-way otherwise. Here it would not have changed the answer, but I
  only know that because I checked.
- Finding the path: the Analyze list is long and all rankings at the top; I only found "Shortest
  path" by typing "shortest" in the filter. If I'd typed "route" I don't know if it would show up.
- The drawing has no names and the path is just black dots and lines, two of them overlapping, so
  the figure alone doesn't prove anything; I'd rely on the list on the right.
