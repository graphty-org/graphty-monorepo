# Session r3-s42 transcript

Participant: Alex, returning analyst. Task: on the open bus-stops drawing, find how many minutes the Station -- Stadium link takes, then point out Station and Stadium (and no other stop) on the drawing.

Every command ran with `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/` and `node design/ui/studio/tool/real.mjs`. `<session>` is the session folder, which the end step copied here.

## Start (01.png)

```
real.mjs --start <session> setup:bus-stops-ranked-names.txt
```

Waited several minutes for a free browser slot because all four browsers on the machine were in use. Build 26f3bb968e43, graphty@0.8.61.

Saw: the bus map, ten stops, all labeled, sized and colored by PageRank. A legend at top left (Size: PageRank, Color: PageRank, 0.04282 to 0.3273). A short line runs from Station down to Stadium.

## Step 1 (02.png)

Tried clicking that short line to see its minutes.

```
real.mjs --step <session> --click-at 752,172
```

Result: "at 752,172: node Stadium". The line is so short, and the Stadium label sits so close to it, that my click landed on the Stadium ball. The right panel shows Stadium: id, Degree 3 (with a little arrow), PageRank 0.08953 #4 of 10. Stadium has a yellow ring. No minutes anywhere.

## Step 2 (03.png)

The Degree row has an arrow. I hoped it would list Stadium's links with their minutes.

```
real.mjs --step <session> --click-at 1410,204
```

Result: a "Neighborhood" view: "Stadium and 3 connections", Hops 1/2/3, Follow Out/In/All, "Filter to neighbors", then Harbor, School, Station. It also lit up Harbor, School and Station on the drawing and the Selection count went to 4. So it lists who Stadium connects to, but not the minutes on any link. And now four stops were highlighted, which is the opposite of what the second part needs.

## Step 3 (04.png)

I use the tables every week, so I went to Data expecting a table of links.

```
real.mjs --step <session> --click "Data"
```

Result: the source (bus-stops.csv, 10 nodes, 17 edges -- matches what my colleague said), Filters, and Attributes: Nodes > id, Edges > minutes. So the minutes column exists, but there is no table of rows and no way from here to see one link's minutes.

## Step 4 (05.png)

The Stadium label sits right on top of the line, so I aimed at the small piece of line just under Station. Hovered first.

```
real.mjs --step <session> --hover-at 763,147
```

Result: "edge with id 15", pointer cursor, no tooltip. Hovering a link tells me nothing.

## Step 5 (06.png)

Clicked the same spot.

```
real.mjs --step <session> --click-at 763,147
```

Result: the link turns blue, the right panel says "Station -> Stadium, Edge", From Station, To Stadium, minutes 4. **Answer: the link takes 4 minutes.** The neighborhood highlight from step 2 also cleared.

## Step 6 (07.png, 08.png)

To point out Station and Stadium only, I clicked Station, then shift-clicked Stadium, the way multi-select works everywhere else. (My first try used a step name the tool does not have, "--shift-click-at"; the tool refused it and nothing happened.)

```
real.mjs --step <session> --click-at 777,112       # node "Station"
real.mjs --step <session> --shift-click "Stadium"  # clicked node Stadium at 726,221
```

Result: only Stadium is ringed, and the panel shows just Stadium. Shift did not add to the selection. It replaced Station.

## Step 7 (09.png)

Tried Ctrl-click on Station to add it to Stadium.

```
real.mjs --step <session> --ctrl-click "Station"   # clicked node Station at 777,118
```

Result: only Station is ringed now. Ctrl also replaces. Neither Shift nor Ctrl adds a second stop on the drawing, and nothing says how to pick two.

## Step 8 (10.png)

Went back to the Graph section to use its find box.

```
real.mjs --step <session> --click "Graph"
```

Result: Selection 1 (Station), PageRank 10, Everything, and a find box at the top.

## Step 9 (11.png)

Typed "Sta" because both names start with it.

```
real.mjs --step <session> --click "Find nodes, edges, values" --type "Sta"
```

Result: "Nodes 2": Stadium, Station; "Edges 5", including "Station -> Stadium". That edge row is a much easier way to reach the minutes than clicking a tiny line under a label. I wish I had tried it first. Now I needed both nodes picked, and wondered whether the "Nodes 2" header picks both.

## Step 10 (12.png)

```
real.mjs --step <session> --hover-at 93,123
```

Result: just a group label, plain cursor, no tooltip.

## Step 11 (13.png)

With Station selected, shift-clicked Stadium in the search results.

```
real.mjs --step <session> --shift-click "Stadium"
```

Result: the search closed and only Stadium is selected (Selection 1). Shift replaced the selection in the list too.

## Step 12 (14.png)

Right-clicked Station, looking for an "add to selection" option.

```
real.mjs --step <session> --rclick-at 777,117
```

Result: a menu with Neighborhood (G), Path between... (P), Frame selection (F), Add note (N). No "add to selection". Station and Stadium are linked directly, so "Path between" them should mark just those two.

## Step 13 (15.png)

```
real.mjs --step <session> --click "Path between..."
```

Result: a "Shortest path" box: From = Station, To = "Where the path ends", Follow Out/All, Weight None, Advanced, Find path.

## Step 14 (16.png, 17.png)

```
real.mjs --step <session> --click "Where the path ends" --type "Stadium"
real.mjs --step <session> --click "role=option:Stadium"
```

Result: a "Stadium" suggestion dropped down, and picking it set To = Stadium.

## Step 15 (18.png)

```
real.mjs --step <session> --click "Find path"
```

Result: Station and Stadium both turn black on the drawing, with the link between them drawn thick and black; no other stop changes. The legend gains "Shortest path", the left list gains "Shortest path -- 1 hop", and the right panel says Path: 2 nodes, 1 edge; Nodes in order: Station 1, Stadium 2; Weight None, "Each edge counts as 1." Station still has its yellow selection ring as well. Only the two stops are pointed out. Done.

Side effect: this left a "Shortest path" run in the project. I did not want a new analysis, only to mark two stops, so I would delete it before saving the weekly file.

## End

```
real.mjs --end <session>
```

Ended with no further request.

## In character, at the end

**Did I finish?** Yes. The Station -- Stadium link is 4 minutes, and Station and Stadium (only) are marked on the drawing, in black, as a shortest path.

**Ease: 4 out of 7.** The minutes took about four tries; the marking took about seven.

**What confused me:**

- Clicking the link was fiddly. It is short, and the Stadium label sits right on it, so my first click took the stop instead. Hovering a link shows nothing, not even the minutes. Once I clicked the right spot the panel was clear: From, To, minutes 4.
- The Data section lists "minutes" as an edge column, but there is no table of the links to read it from. That is where I looked first.
- I could not pick two stops. Shift-click and Ctrl-click both replace the selection, on the drawing and in the search list, and right-click has no "add". Every other tool I use, Gephi included, adds with Shift or Ctrl. I only got both marked by running a shortest path, which is a detour and leaves an extra run in my project that I have to clean up.
- The Degree arrow opened a neighborhood view that selected four stops without asking, which was the opposite of what I needed.
- What went well: the find box. Typing "Sta" listed both stops and the "Station -> Stadium" link directly, which would have been the fast way to get the minutes. The path result was clear too: 2 nodes, 1 edge, in order.
