# Session r1-s02 -- Grace (returning), task T20 prompt B (hiking trails, trails.csv)

Build: frozen build 946256efb876 (REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/).
Commands run from design/ui/studio with S=tier2/rounds/round-1/sessions/r1-s02.

Task as given: "You have used this program a few times. Your hiking club sent trails.csv, in your
Downloads folder: each row is a trail between two junctions and its length in kilometers. Bring it
into the program so that every calculation treats more kilometers as a longer walk, then work out
the shortest walk from the Trailhead to the Summit: which junctions, in order, and how many
kilometers in all. Show us where the program says it used the kilometers."

## Steps

### 01 -- start
`node tool/real.mjs --start $S empty` -> 01.png
Okay, the start screen I remember: Open project or file, New from data, samples on the right, and a
usage-data box at the bottom. I'll say No thanks to that first, then open my file the way I always do.

### 02 -- dismiss usage box
`node tool/real.mjs --step $S --click "No thanks"` -> 02.png
Box gone. Now Open project or file, and pick trails.csv from Downloads.

### 03 -- open the file
`node tool/real.mjs --step $S --click "Open project or file" --upload trails.csv` -> 03.png
It opened straight away, no questions. Nodes 9, edges 13 -- the club said 13 trails between 9
junctions, so that's everyone. It says "Directed" though; a trail goes both ways, I'll keep that in
mind. No names on the dots. Nothing asked me what "km" means. Last time the Data place listed my
columns, so I'll look there to tell it km is a length.

### 04 -- Data place
`node tool/real.mjs --step $S --click "Data"` -> 04.png
Data shows trails.csv, 9 nodes, 13 edges, and under Attributes, Edges: "km" with a number sign.
Good, it knows km is a number. I'll click km and see if I can tell it what the number means.

### 05 -- click km
`node tool/real.mjs --step $S --click "km"` -> 05.png
Right side now says km, Attribute: Table Edges, Kind "Amount", from the file, 100% have a value,
9 distinct, range 1 to 6. "Amount" -- that's not wrong, but nothing says longer is farther. Maybe
"Amount" is a choice I can change; I'll click it.

### 06 -- click Amount
`node tool/real.mjs --step $S --click "Amount"` -> 06.png
Nothing happened, it's just a label. There's a little three-dot menu up at the top right next to km.
I'll try that.

### 07 -- km's three-dot menu
`node tool/real.mjs --step $S --click-at 1419,74` -> 07.png (button "Attribute actions")
Only "Filter to..." and "Show in table". Not what I want. The task says "bring it in so that...",
so maybe it's about how the file was read. I'll close this and click the trails.csv source.

### 08 -- close the menu
`node tool/real.mjs --step $S --key Escape` -> 08.png
Menu closed, still on km.

### 09 -- click the trails.csv source
`node tool/real.mjs --step $S --click "trails.csv"` -> 09.png
A table opened under the picture: From, To, km -- Trailhead to Pine Fork 3, Pine Fork to Summit 6,
Trailhead to Creek 1.5, Creek to Meadow 2... That's my spreadsheet, good. The right side just says
"Added: Nodes 9, Edges 13". No settings for how the file was read. The table has a "km" header and
a three-dot menu; I'll try the km column header, like in Excel.

### 10 -- click the km column header
`node tool/real.mjs --step $S --click-at 1158,742` -> 10.png
It sorted, "highest first": Pine Fork-Summit 6, Lake-Summit 4.5... Handy, but not what I need. There
is a second little arrow right of km; I'll open that.

### 11 -- km column options
`node tool/real.mjs --step $S --click-at 1183,742` -> 11.png (button "Options for km")
Just "Move left" and "Move right", both grayed out. Okay, the data side doesn't let me say what km
means. I'll close this and go where I ran things before: the analysis button in the toolbar.
Maybe it asks which column to use.

### 12 -- close the menu
`node tool/real.mjs --step $S --key Escape` -> 12.png
Closed. Now the flask button in the toolbar.

### 13 -- Analyze list
`node tool/real.mjs --step $S --click-at 680,624` -> 13.png (button "Analyze")
The list I remember, with a search box on top: Degree, Betweenness, Closeness, PageRank... A lot of
"shortest paths" in the descriptions. I'll type "shortest" in the box to narrow it.

### 14 -- type "shortest"
`node tool/real.mjs --step $S --type "shortest"` -> 14.png
Down to four. Under "Find paths and edge sets": "Shortest path -- Start here. The fewest steps, or
the shortest route by weight, between two nodes." "By weight" -- I don't have a weight, I have km.
But it's the closest thing. I'll click it and see if it lets me pick km.

### 15 -- Shortest path form
`node tool/real.mjs --step $S --click-at 565,566` -> 15.png
A small form: From, To, Follow (Out / All -- All is picked, good, trails go both ways), Weight:
None, and "Advanced". Okay, what do I click: From first, I'll type Trailhead.

### 16 -- From: Trailhead
`node tool/real.mjs --step $S --click "Where the path starts" --type "Trailhead"` -> 16.png
It suggests "Trailhead" under the box. I'll pick it.

### 17 -- pick Trailhead
`node tool/real.mjs --step $S --click-at 563,387` -> 17.png
Now the To box: Summit.

### 18 -- To: Summit
`node tool/real.mjs --step $S --click "Where the path ends" --type "Summit"` -> 18.png
Trailhead stuck in From. Summit is suggested; pick it.

### 19 -- pick Summit
`node tool/real.mjs --step $S --click-at 559,441` -> 19.png
Both ends set. Weight says None -- if I leave that it'll just count hops, like it said "fewest
steps". I'll open Weight and look for km.

### 20 -- Weight list
`node tool/real.mjs --step $S --click "Weight"` -> 20.png
Two choices: None, and "km (farther)". Oh -- so it already treats km as farther? I never told it
that. Nice if true, but where did it decide that? I'll pick km (farther) and find the path.

### 21 -- pick km (farther)
`node tool/real.mjs --step $S --click "km (farther)"` -> 21.png
Weight: km (farther). Trailhead to Summit, Follow All. Find path.

### 22 -- Find path
`node tool/real.mjs --step $S --click "Find path"` -> 22.png
There it is. The path is drawn in black. Right side, Values: Path 5 nodes, 4 edges; Total distance
7.5. Nodes in order: Trailhead, Creek, Meadow, Ridge, Summit. Under "Made with": Analysis Shortest
path, From Trailhead, To Summit, Follow All, Weight "km (farther)". So that's where it says it used
the kilometers. Let me check against my spreadsheet: Trailhead-Creek 1.5, Creek-Meadow 2,
Meadow-Ridge 2.5, Ridge-Summit 1.5 = 7.5. Matches. The other ways: via Pine Fork and Meadow is
3+1+2.5+1.5 = 8, via Lookout 4+3+1.5 = 8.5, straight up Pine Fork 9. So 7.5 is the shortest. Good.
"Total distance" -- it doesn't say km, but it's my km.
What still bugs me: the task wanted every calculation to treat km as longer. I only chose it in this
one form; the "(farther)" was already there. Is that a setting that holds for everything else, or
just this run? There's "Advanced run settings" under Made with -- I'll open that.

### 23 -- Advanced run settings
`node tool/real.mjs --step $S --click "Advanced run settings"` -> 23.png
"Method: Dijkstra, chosen automatically." Not a word I'd use, and it doesn't answer my question.
Quick check of whether another calculation also takes km as farther on its own: open Analyze and
look at Closeness ("how near each one is to the others").

### 24 -- Analyze again
`node tool/real.mjs --step $S --click "Analyze"` -> 24.png
The list, now with "Recent: Shortest path" on top. I'll click Closeness to see its form.

### 25 -- Closeness form
`node tool/real.mjs --step $S --click-at 557,384` -> 25.png
Closeness just has a Run button and "Advanced". No Weight on the front, so I can't tell whether it
would use my km. One look under Advanced.

### 26 -- Closeness, Advanced
`node tool/real.mjs --step $S --click "Advanced"` -> 26.png
Only "Sample size: Every node". Nothing about km. So I can't tell whether Closeness would count km
or just hops, and nowhere did I find one place to say "km means farther" for everything. I have
my answer for the walk, and I've spent my lunch hour; I'll stop here.

### end
`node tool/real.mjs --end $S`

## Debrief (in character)

**Did I finish?** Partly. The walk, yes: Trailhead, Creek, Meadow, Ridge, Summit, 7.5 km, and I
checked it by hand against my spreadsheet (the other routes are 8, 8.5 and 9). Where the program
says it used the kilometers: the right-hand panel after the run, under "Made with", "Weight: km
(farther)". The first half -- bringing the file in "so that every calculation treats more km as a
longer walk" -- I could not do as a step of its own. The file came in with no questions (9 junctions,
13 trails, all there), and nothing on the Data side let me say what km means. I only met
"(farther)" inside the Shortest path form, already filled in. I don't know whether the program
decided that once for the whole map or only for that form, and Closeness, the one other
calculation I checked, shows no km setting at all.

**Ease: 5 of 7.** Finding the walk was quick once I typed "shortest" in the Analyze search. I lost
time looking for a "what does this column mean" setting.

**What confused me:**
- The km column page says "Kind: Amount" and nothing about longer or shorter. Clicking "Amount"
  does nothing, and the km menus (the panel's three dots, the table column's arrow) only offer
  filter, show in table and move left/right. I expected to set the meaning there, where the
  columns are listed.
- "km (farther)" appeared in the Weight list without my choosing "farther" anywhere. Good guess,
  but I'd want to know where it came from and whether every other calculation uses it too.
- Closeness has no Weight on its form, not even under Advanced, so I can't tell whether it counts
  km or just hops.
- "Total distance 7.5" has no unit. I know it's km, but a board slide would need "km".
- "Method: Dijkstra, chosen automatically" under Advanced run settings -- a word I'd never put on a
  slide; it didn't hurt, I just ignored it.
- The file came in as "Directed", with arrows. Trails go both ways; the path form defaulted to
  "Follow: All", which saved me, but the arrows look wrong for a trail map.
