# Session r1-s06 -- Nadia, task T20 (hiking trails, trails.csv)

Participant: Nadia, returning user (four earlier sessions). Build: 946256efb876 (frozen copy
`.study-builds/tier2-r1d4-946256efb/`). Start: empty.

Commands run from the studio worktree with `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/`
and `S=design/ui/studio/tier2/rounds/round-1/sessions/r1-s06`.

## Steps

### 01 -- start
`node design/ui/studio/tool/real.mjs --start $S empty` -> 01.png

Nadia: "Start screen, same as always. There's the usage-data box at the bottom; I'll say no thanks
first, then open the file from Open project or file, like I do with an alert's file."

### 02 -- open the file
`--step $S --click "No thanks" --click "Open project or file..." --upload trails.csv` -> 02.png

Result: the file opened straight into a drawing, no questions asked. 9 nodes, 13 edges, "Directed".
No labels on the balls.

Nadia: "It just opened it. It never asked me anything about the km column. The task says the
program has to treat more km as a longer walk -- I have no idea whether it did. Also it says
'Directed'; a trail goes both ways, but fine. Let me look at the Data tab on the left, that's where
I'd expect the columns."

### 03 -- Data tab
`--step $S --click "Data"` -> 03.png

Result: Sources (trails.csv, 9 nodes, 13 edges), Filters, Attributes: Nodes / id, Edges / km.

Nadia: "There's km, under Edges. Maybe clicking it lets me say what it is."

### 04 -- click km
`--step $S --click "km"` -> 04.png

Result: right panel shows km: Table Edges, Kind Amount, Origin From the file, Has a value 100%,
Distinct values 9, Range 1 to 6.

Nadia: "Kind: Amount. Nothing here says longer or shorter. There's a three-dot menu at the top
right of this panel -- I'll try that."

### 05 -- the attribute's three-dot menu
`--step $S --click-at 1419,74` (button "Attribute actions") -> 05.png

Result: two items: "Filter to..." and "Show in table".

Nadia: "Filter, table. Not what I want. Maybe the file itself, under Sources, has settings for how
it was read in. Closing this and clicking trails.csv."

### 06 -- the source file
`--step $S --key Escape --click-at 136,141` (treeitem "trails.csv") -> 06.png

Result: right panel shows trails.csv, Source, Added: Nodes 9, Edges 13. A table opened along the
bottom: Edges, From / To / km (Trailhead -> Pine Fork 3, Pine Fork -> Summit 6, Trailhead -> Creek
1.5, Creek -> Meadow 2, ...).

Nadia: "Good, at least I can see the rows now, like my spreadsheet. But the file panel only says
what was added -- no settings. Maybe the km column heading in the table has options."

### 07 -- km column heading
`--step $S --click-at 1158,742` (button "km") -> 07.png

Result: the table sorted by km, highest first. A small arrow appeared next to the heading.

Nadia: "It just sorted. There's a little drop arrow beside km -- trying that."

### 08 -- column options
`--step $S --click-at 1183,742` (button "Options for km") -> 08.png

Result: menu with "Move left" and "Move right", both grayed out.

Nadia: "Move left, move right. No. The task says 'bring it into the program' a certain way, so
maybe I did the opening wrong -- there was a 'New from data...' on the start screen I've never
used. Let me look in the main menu, top left."

### 09 -- main menu
`--step $S --key Escape --click-at 23,20` (button "Main menu") -> 09.png

Result: Back to start, New project, Open project or file..., Open sample, Save, Save as..., Save
local copy..., Export..., Rename, Settings..., Keyboard shortcuts, Help. No "New from data...".

Nadia: "No 'New from data' in here. I'll go back to the start screen and use that one; it sounds
like the careful way of bringing a file in."

### 10 -- back to start
`--step $S --click "Back to start"` -> 10.png

Result: the start screen. It did not ask whether to keep the trails graph; Recent projects is empty.

Nadia: "OK, it dropped what I had without asking. Doesn't matter, I hadn't done anything. New from
data..."

### 11 -- New from data...
`--step $S --click "New from data..."` -> 11.png

Result: page "Open as a new graph": Tables (+), "Drop a file here, or choose a file...", Direction
"As the file says", Cancel, Load (disabled, "Choose a file first").

Nadia: "This looks like the careful way in. Choosing the file."

### 12 -- choose the file
`--step $S --click "choose a file..." --upload trails.csv` -> 12.png

Result: "trails: 9 nodes, 13 edges". Each row is: a node / an edge (selected) / CSV auto. Three
column drop-downs: from = From, to = To, km = Attribute (number). Under them: "Weight: none (each
edge counts 1)". A preview of all 13 rows. Direction: As the file says. Load is now blue.

Nadia: "There it is -- 'Weight: none, each edge counts 1'. So when I opened it the first time every
trail counted the same, which is exactly what the task says not to do. The km drop-down says
'Attribute'; let me open it."

### 13 -- km drop-down
`--step $S --click-at 728,203` (combobox "Role of km") -> 13.png

Result: choices From, To, Weight, Date or time, Edge id, Attribute (checked).

Nadia: "The line below said 'Weight: none', so I want km to be the weight. Picking Weight."

### 14 -- km as Weight
`--step $S --click "Weight"` -> 14.png

Result: "Weight: km". New row "Higher means: Not set / Closer / Farther / Capacity", Not set chosen.
Text: "Choose what a higher weight means. Until you do, a path counts every edge as one step, and
PageRank and communities read a higher weight as closer."

Nadia: "So even calling it a weight isn't enough -- it still counts every trail as one step until I
say what higher means. More km is a longer walk, so higher means farther. Farther."

### 15 -- Farther
`--step $S --click "Farther"` -> 15.png

Result: "Weight: km (farther)". Text: "A higher weight means farther apart, such as a longer distance or
travel time; a path takes the smallest total."

Nadia: "'A path takes the smallest total' -- that's what I want, the fewest km. Before I load: earlier
it said Directed, and you can walk a trail either way. Let me see what Direction offers."

### 16 -- Direction drop-down
`--step $S --click "Direction"` -> 16.png

Result: the list opened below the box at the very bottom of the window and is squeezed to a thin
blue strip with a small down-arrow; none of the choices can be read.

Nadia: "It opened but I can't see anything in it -- just a blue sliver at the bottom of the
screen. Never mind. 'As the file says' -- the file goes from the trailhead side toward the summit
anyway. I'm not fighting it. Closing it and pressing Load."

### 17 -- Load
`--step $S --key Escape --click "Load"` -> 17.png

Result: the graph again, and the Overview on the right now has a line "Loaded weight: km (farther)".
The edges table is still open at the bottom.

Nadia: "Good -- 'Loaded weight: km (farther)'. That's something I could screenshot for the file.
Now the route. When I ranked people I used the flask button in the toolbar; I'll try that."

### 18 -- Analyze
`--step $S --click-at 679,624` (button "Analyze") -> 18.png

Result: a list with a "Filter analyses" box: Degree, Betweenness, Edge betweenness, Closeness,
PageRank (Start here), Eigenvector, Katz, HITS, All-pairs distance, Depth-first order (grayed,
"Select a node first"), Most flow, ...

Nadia: "Long list, mostly ranking. I'll type in the box instead of reading all of it: 'shortest'."

### 19 -- type "shortest"
`--step $S --type "shortest"` -> 19.png

Result: Betweenness, Edge betweenness, All-pairs distance under "Rank nodes and edges"; under "Find
paths and edge sets": "Shortest path (Start here) -- The fewest steps, or the shortest route by
weight, between two nodes."

Nadia: "'Shortest route by weight, between two nodes.' That's it. Clicking Shortest path."

### 20 -- Shortest path
`--step $S --click-at 566,566` (option "Shortest path") -> 20.png

Result: a "Shortest path" form: From ("Where the path starts"), To ("Where the path ends"), Follow:
Out / All (All chosen), Weight: "km (farther, loaded)", Advanced, Find path.

Nadia: "It already picked km, the way I loaded it. 'Follow: All' -- I guess that means both ways
along a trail, which is what I wanted from Direction. Typing Trailhead in From."

### 21 -- From: Trailhead
`--step $S --click "Where the path starts" --type "Trailhead"` -> 21.png

Result: a suggestion "Trailhead" appears under the box (it covers the To box).

Nadia: "Pick the suggestion, then the To box."

### 22 -- pick Trailhead
`--step $S --click-at 563,387` (option "Trailhead") -> 22.png

Result: From = Trailhead; the To box is now outlined (has focus).

Nadia: "It jumped to the To box for me. Summit."

### 23 -- To: Summit
`--step $S --type "Summit"` -> 23.png

Result: suggestion "Summit" under the To box.

Nadia: "Pick Summit, then Find path."

### 24 -- pick Summit, Find path
`--step $S --click-at 559,441 --click "Find path"` -> 24.png

Result: the route is drawn in black on the graph with a key "Shortest path -- On the path". Left
list: "Shortest path, 4 hops". Right panel "Shortest path": Summary -- Path 5 nodes, 4 edges; Total
distance 7.5. Nodes in order: Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5. Made with --
Analysis Shortest path, Ran Oct 8, From Trailhead, To Summit, Follow All, Weight km (farther). The
edges table gained a "Shortest path" column (Yes / No).

Nadia: "There it is: Trailhead, Creek, Meadow, Ridge, Summit, total 7.5. Let me check it against the
rows I saw when loading: Trailhead-Creek 1.5, Creek-Meadow 2, Meadow-Ridge 2.5, Ridge-Summit 1.5 --
that's 7.5. And going by Pine Fork would be 3 + 1 + 2.5 + 1.5 = 8, so this one is shorter. And
'Made with ... Weight km (farther)' is where it says it used the kilometers -- that and 'Loaded
weight km (farther)' on the graph's overview. That's all I needed. Done."

`--end $S`

## Debrief (in character)

**Did you finish?** Yes. The shortest walk is Trailhead -> Creek -> Meadow -> Ridge -> Summit, 7.5 km
in all (1.5 + 2 + 2.5 + 1.5). The program says it used the kilometers in two places: "Loaded weight:
km (farther)" in the graph's overview after loading, and "Weight: km (farther)" under "Made with" in
the shortest-path result.

**Ease: 4 of 7.** The second half was quick. The first half cost me about ten clicks of looking.

**What confused me:**

- My usual way in, Open project or file, opened the file without asking anything, and nothing on
  screen told me the km column was being ignored. I only learned that each trail "counts 1" after I
  went back to the start screen and tried New from data, which I had never used. Nothing on the
  opened graph points to it. Once a file is open there's no way I could find to say what km means:
  the km entry in the Data tab shows only facts and a menu with "Filter to" and "Show in table". The
  column menu in the table only has Move left and Move right.
- Going back to the start screen threw away the opened graph without asking. I hadn't done any work
  yet, but on a real alert I would have lost it.
- Even after I made km the weight, it still said a path would count every trail as one step until I
  also chose "Higher means". "Farther" was the right word for me. Without that sentence I would have
  pressed Load too early.
- The Direction list at the bottom of the loading page opened as a thin blue strip at the bottom
  edge of the window. I couldn't read any of its choices, so I left it as it was.
- The result says "4 hops" on the left and "Total distance 7.5" on the right, with no "km". Is that
  hops of what? For the alert file I'd want the unit next to the number.
- "Follow: Out / All": I guessed "All" means a trail can be walked both ways. Nothing told me.
