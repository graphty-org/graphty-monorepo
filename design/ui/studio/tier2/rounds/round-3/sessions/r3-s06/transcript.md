# Session r3-s06 transcript

Participant: Tom, lab manager, returning user. Task: bring in trails.csv so kilometers count as a longer walk, find the shortest walk from Trailhead to Summit (junctions in order, total km), and show where the program says it used the kilometers.

Screenshots: the numbered PNGs in this folder.

Every command below runs with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/, with `node design/ui/studio/tool/real.mjs` in front, and S=the session folder.

## Step 1 -- start

`--start $S empty` -> 01.png

Start screen as I remember it. "Open project or file..." on the left, and a line saying files are read on this computer and never uploaded. That's good, though this is a hiking file, not lab data. There's a "help us" box about usage data at the bottom. I'll say no thanks first.

## Step 2 -- decline usage data

`--step $S --click "No thanks"` -> 02.png

## Step 3 -- open the file

The box is gone. Same as before: "Open project or file...", pick trails.csv from Downloads.

`--step $S --click "Open project or file" --upload trails.csv` -> 03.png

"Open as a new graph". It says 9 nodes, 13 edges, and I can count 13 rows in the table, so it matches. But there's a line: "Weight: none (each edge counts 1)". That's exactly what I don't want; the km column is set to "Attribute". I'll open the box under "km" and see what else it can be.

## Step 4 -- the km column's box

`--step $S --click "km"` -> ambiguous (the column heading and the box are both called "km"); nothing happened. 04.png

I meant the box that says "Attribute".

`--step $S --click "Role of km"` -> 05.png

The list: From, To, Weight, Date or time, Edge id, Attribute. "Weight" goes with that "Weight: none" line, so that's the one.

## Step 5 -- pick Weight

`--step $S --click "role=option:Weight"` -> 06.png

Now it says "Weight: km" and asks "Higher means": Not set, Closer, Farther, Capacity. The line under it says that until I choose, a path counts every edge as one step. That's the trap. More kilometers is a longer walk, so "Farther". I don't know what "Capacity" or PageRank are and I'm leaving those alone.

## Step 6 -- Higher means Farther

`--step $S --click "Farther"` -> 07.png

"Weight: km (farther)" and "A higher weight means farther apart, such as a longer distance or travel time; a path takes the smallest total." That's plain English, good. There's a "Direction: As the file says" box at the bottom; I don't know what else it would be, so I leave it. Load.

## Step 7 -- Load

`--step $S --click "Load"` -> 08.png

The picture is up: blue balls with arrows, no names on them, so I can't tell which is the Trailhead. On the right: 9 nodes, 13 edges (matches my rows), and "Loaded weight: km (farther)", so it kept the kilometers. Bottom left says "Analyze in the toolbar to add results here". That's the analysis button my colleague showed me. Clicking the flask.

## Step 8 -- Analyze

`--step $S --click "Analyze"` -> 09.png

A long list of names I don't know: Degree, Betweenness, PageRank "Start here", Katz, HITS... Nothing says "shortest walk" on this part of the list. There's a "Filter analyses" box at the top with the cursor in it, so I'll type "shortest".

## Step 9 -- filter for shortest

`--step $S --type "shortest"` -> 10.png

Four left. Under "Find paths and edge sets": "Shortest path -- Start here. The fewest steps, or the shortest path by weight, between two nodes." That's the one.

## Step 10 -- Shortest path

`--step $S --click "Shortest path"` -> 11.png

A small form: From "Where the path starts", To "Where the path ends", Follow Out/All (All is picked; trails go both ways, so I leave it), and Weight already says "km (farther, loaded)". Good, I don't have to set it again. I'll click the From box and type Trailhead.

## Step 11 -- From: Trailhead

`--step $S --click "Where the path starts" --type "Trailhead"` -> 12.png

A suggestion "Trailhead" dropped down under the box. I'll pick it.

## Step 12 -- pick Trailhead

`--step $S --click "role=option:Trailhead"` -> 13.png

From says Trailhead, and the To box looks ready for me. Typing Summit.

## Step 13 -- To: Summit

`--step $S --type "Summit"` -> 14.png

Summit is suggested. Picking it.

## Step 14 -- pick Summit

`--step $S --click "role=option:Summit"` -> 15.png

Trailhead to Summit, weight km. I'm not opening "Advanced". Find path.

## Step 15 -- Find path

`--step $S --click "Find path"` -> 16.png

There it is. The path is drawn in thick black on the picture, and the right side lists it:

- Summary: Path 5 nodes, 4 edges; Total km 7.5
- Nodes in order: Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5
- Made with: Analysis Shortest path, From Trailhead, To Summit, Follow All, Weight km (farther)

I checked it against the table I saw when I opened the file: Trailhead-Creek 1.5, Creek-Meadow 2, Meadow-Ridge 2.5, Ridge-Summit 1.5 = 7.5. The Pine Fork way would be 3 + 1 + 2.5 + 1.5 = 8, and Creek-Lake-Summit 9, so 7.5 is right. The left panel also lists "Shortest path km 7.5".

Where it says it used the kilometers: "Weight: km (farther)" under "Made with" on the right, and "Total km 7.5" in the summary. Before the run, the form showed "km (farther, loaded)", and the overview after loading said "Loaded weight: km (farther)".

That's what I was asked. Ending.

## Step 16 -- end

`--end $S` -> session ended.

## At the end, in my words

**Did I finish?** Yes. Shortest walk from the Trailhead to the Summit: Trailhead, Creek, Meadow, Ridge, Summit -- 7.5 km in all. The program says it used the kilometers under "Made with": "Weight: km (farther)", next to "Total km 7.5"; the overview after loading also said "Loaded weight: km (farther)".

**Ease: 6 out of 7.**

**What confused me or slowed me down:**

- When the file opened, the km column was set to "Attribute" and a line said "Weight: none (each edge counts 1)". If I hadn't read that line I'd have loaded it as is and every trail would have counted the same. Nothing stopped me; I only caught it because I read the line.
- After I picked Weight, it asked what a higher weight means: Not set, Closer, Farther, Capacity. "Farther" was easy for kilometers, and the sentence under it said so in plain words. "Capacity" I don't know and didn't touch.
- The analysis list is long and full of names I don't know (Katz, HITS, PageRank). I only found "Shortest path" by typing in the filter box; it isn't on the first screen of the list.
- The balls on the picture have no names, so I couldn't tell which one was the Trailhead from the picture. The list of junctions in order on the right is what told me the answer.
- I left "Direction: As the file says" and "Follow: All" alone because I don't know what the other choices would do. The overview calls the graph "Directed", which I don't really understand for trails you can walk both ways, but the answer checked out against the table, so I let it go.
