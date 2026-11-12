# Session r3-s08 -- Dana Okafor, returning user

Task: bring trails.csv in so every calculation treats more kilometers as a longer walk, then find
the shortest walk from Trailhead to Summit (junctions in order, total km), and show where the
program says it used the kilometers.

All commands run from the studio worktree with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/
and T=design/ui/studio/tool, S=tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s08
(the screenshots are copied into this folder at the end).

## Steps

### Start
`node $T/real.mjs --start $S empty` -> 01.png
Saw: the start screen I know from earlier visits, with the usage-data box at the bottom.

### Step 1
Said: "Same start screen. Get rid of the usage box, then open the file."
`node $T/real.mjs --step $S --click "No thanks"` -> 02.png

### Step 2
Said: "Open project or file, pick trails.csv, same as I do with my supplier export."
`node $T/real.mjs --step $S --click "Open project or file..." --upload trails.csv` -> 03.png
Saw: an "Open as a new graph" preview. It guessed from and to correctly: 9 nodes, 13 edges. The km
column is set to "Attribute" (number), and a line says "Weight: none (each edge counts 1)". That
is what I have to fix: it isn't using the km yet. I've never set this before.

### Step 3
Said: "Click the km box to see what else it can be."
`node $T/real.mjs --step $S --click "km"` -> 04.png
The tool said the name matched two controls (the column header button and the "Role of km" box),
so nothing happened.

### Step 4
`node $T/real.mjs --step $S --click "Role of km"` -> 05.png
Saw: a list with From, To, Weight, Date or time, Edge id and Attribute (checked).

### Step 5
Said: "Weight -- that's what km is."
`node $T/real.mjs --step $S --click "role=option:Weight"` -> 06.png
Saw: "Weight: km", then "Higher means: Not set / Closer / Farther / Capacity" and one line:
"Until you do, a path counts every edge as one step". Good: it tells me plainly that I'm not done
yet. More km means a longer walk, so "Farther".

### Step 6
`node $T/real.mjs --step $S --click "Farther"` -> 07.png
Saw: "Weight: km (farther)" and "A higher weight means farther apart ... a path takes the smallest
total." That's exactly what I want.
Said: "Trails go both ways, though. Let me look at Direction before loading."

### Step 7
`node $T/real.mjs --step $S --click "Direction"` -> 08.png
Saw: As the file says (checked), Directed, Undirected.

### Step 8
Said: "Undirected -- you can walk a trail either way."
`node $T/real.mjs --step $S --click "role=option:Undirected"` -> 09.png
Saw: the heading now says "each edge goes both ways". Ready to load.

### Step 9
`node $T/real.mjs --step $S --click "Load"` -> 10.png
Saw: 9 blue balls with no names on them. The right panel's Overview shows Nodes 9, Edges 13,
Direction "Undirected, set in the project" and "Loaded weight: km (farther)". Good, it kept the
kilometers.
Said: "Now the analysis button in the toolbar, like I use for my rankings."

### Step 10
`node $T/real.mjs --step $S --click-at 679,864` (the flask, "Analyze") -> 11.png
Saw: a long list of analyses, each with a one-line description, and a filter box on top.

### Step 11
Said: "Not scrolling through Katz and HITS. I'll type 'shortest'."
`node $T/real.mjs --step $S --type "shortest"` -> 12.png
Saw: under "Find paths and edge sets", "Shortest path -- Start here -- The fewest steps, or the
shortest path by weight, between two nodes." That's the one.

### Step 12
`node $T/real.mjs --step $S --click "Shortest path"` -> 13.png
Saw: From and To boxes, Weight already set to "km (farther, loaded)", and a Find path button.

### Step 13
Said: "Type Trailhead in From."
`node $T/real.mjs --step $S --click "Where the path starts" --type "Trailhead"` -> 14.png
Saw: a "Trailhead" suggestion under the box.

### Step 14
`node $T/real.mjs --step $S --click "role=option:Trailhead"` -> 15.png
From now holds Trailhead.

### Step 15
Said: "Now Summit in To."
`node $T/real.mjs --step $S --click "Where the path ends" --type "Summit"` -> 16.png
Saw: a "Summit" suggestion.

### Step 16
`node $T/real.mjs --step $S --click "role=option:Summit"` -> 17.png
To now holds Summit.

### Step 17
Said: "Find path."
`node $T/real.mjs --step $S --click "Find path"` -> 18.png
Saw: the path drawn in thick black on the canvas, and "Shortest path  km 7.5" in the left list.
The right panel shows:
- Summary: Path 5 nodes, 4 edges; Total km 7.5
- Nodes in order: 1 Trailhead, 2 Creek, 3 Meadow, 4 Ridge, 5 Summit
- Made with: Analysis Shortest path, From Trailhead, To Summit, Weight "km (farther)"
I checked it against the preview table: Trailhead-Creek 1.5, Creek-Meadow 2, Meadow-Ridge 2.5,
Ridge-Summit 1.5, which makes 7.5. It adds up.

### End
`node $T/real.mjs --end $S` -- the session ended with no further request.

## Debrief (in character)

**Did I finish?** Yes. The shortest walk is Trailhead -> Creek -> Meadow -> Ridge -> Summit, 7.5 km.
The program says it used the kilometers in three places: "Weight: km (farther)" under "Made with"
on the result, "Total km 7.5" in the result's summary, and "Loaded weight: km (farther)" in the
graph's Overview right after loading (10.png). I set the weight once at import, so every
calculation picks it up; the path tool had it filled in already ("km (farther, loaded)").

**Ease: 6 of 7.**

**What helped:** the import preview told me in one line that it was treating every trail as one
step, before I had loaded anything. Choosing "Weight" opened a plain question with a plain answer,
"Higher means ... Farther", and its one-line explanation ("a path takes the smallest total") is
written in my words, not math words. Typing "shortest" in the analysis filter found the right tool
straight away. The result is a table, junctions in order with numbers, which is where I live.

**What confused me or slowed me down:**
- The km column's role box is labelled "Attribute". I only knew to open it because the line under
  it said "Weight: none". If that line were missing, I'd have loaded and gotten the wrong answer.
- "Weight" is a strange word for distance. I got there because it was the only sensible choice in
  the list, but "length" or "cost" would be my word.
- There are no names on the dots, so the picture alone tells me nothing. I had to trust the table
  on the right.
- Direction defaults to "As the file says". For trails, that would have made them one-way. I
  happened to check. Someone in a hurry wouldn't, and here the answer would have come out the same
  only by luck.
- The small grey labels ("Higher means", "Each row is") are hard to read without my glasses.
