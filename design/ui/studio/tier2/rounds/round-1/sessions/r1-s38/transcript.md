# Session r1-s38 -- Ruth (returning), T4 dataset B (football: players.csv + passes.csv)

Build: frozen build named on the first line of tier2/criteria.md (946256efb876).

## Start

Command: `REAL_DIST=<frozen build> node tool/real.mjs --start tier2/rounds/round-1/sessions/r1-s38 empty` -> 01.png

01.png: The start screen I know. Open project or file..., New from data..., an empty Recent projects
(fresh browser), samples on the right, and the usage-data box at the bottom. I decline data sharing,
as always.

## Steps

### Step 2
`--click "No thanks"` -> 02.png. Declined. Nothing of mine leaves the computer, which is what I want.

### Step 3
Seen: start screen. Two spreadsheets this time, not one. "New from data..." sounds more like
building something from tables than "Open", so I try that.
`--click "New from data..."` -> 03.png. A page "Open as a new graph" with a "Tables" list and a
"+" beside it, "Drop a file here, or choose a file...", Direction "As the file says", and a greyed
Load ("Choose a file first"). "Tables", plural -- good sign. I will choose the players first.

### Step 4
`--click "choose a file..." --upload players.csv` -> 04.png. Left: "Nodes: players.csv, 10 rows" with
a green tick. Right: "players: 10 nodes", "Each row is a node / an edge", id = Key, name and position
= Attribute, and every row, s01 Ana Torres (Keeper) to s10 June Kaur (Forward). Bottom line: "10 node
rows read; the load makes 10 nodes and 0 edges." Ten players, the coach's squad is ten. That matches.
0 edges, because the passes are in the other sheet. Now the "+" beside Tables to add the passes.

### Step 5
`--click-at 271,107` (the "+"; the tool says it is "Add a table") -> 05.png. A small menu: File...,
From a URL..., Paste.... The passes sheet is a file in Downloads, so File....

### Step 6
`--click "File..." --upload passes.csv` -> 06.png. Now two tables: "Nodes: players.csv, 10 rows" (green
tick) and "Edges: passes.csv, 18 rows, 1 left out" (red warning triangle). Heading "players and
passes: 10 nodes, 17 edges". It guessed from = From, to = To, passes = Attribute (whole number).
"Weight: none (each edge counts 1)" -- noted; the pass counts are kept but not as a weight. The
bottom line says it plainly: "10 node rows and 18 edge rows read; the load makes 10 nodes and 17
edges. 1 edge row names a node missing from the node rows. Show the 1 unmatched row / Add / Leave
out". So 18 passes in the sheet, 17 would arrive. Says who? I want to see that row before I
decide anything.

### Step 7
`--click "Show the 1 unmatched row"` -> 07.png. The table narrows to the one row: "1 unmatched row: s11
has no node row". Line 17: from s04, to s11 (no node row), passes 3. So Dina Moss passed three times
to someone called s11 who is not on the coach's squad list -- a sub, a guest, or a typo for s01 or
s10. I can't confirm which from here. "Leave out" looks like the current choice (the sidebar says
"1 left out"). I don't drop data silently; I'd rather keep the pass and flag the unknown player.
I'll hover "Add" first to see what it means.

### Step 8
`--hover "Add"` -> 08.png, tooltip "Make a node for each missing name". Clear. That keeps every pass;
s11 becomes an eleventh person with no name or position. I'll take it and flag s11 in my answer.

### Step 9
`--click "Add"` -> 09.png. Heading now "players and passes: 11 nodes, 18 edges"; both tables green;
"the load makes 11 nodes and 18 edges". 18 passes in, 18 out. 10 players plus s11. Good.
Before loading, the class taught me to check direction. A pass goes from one player to another, so
it has a direction. "As the file says" -- what does a CSV say? Let me open the Direction list.

### Step 10
`--click "Direction"` -> 10.png. Three choices: As the file says (ticked), Directed, Undirected. No
word on what a CSV "says" -- a spreadsheet doesn't say anything about direction, so I can't tell what
the default would give me. The coach's columns are "from" and "to", so passes go one way. Directed.

### Step 11
`--click "Directed"` -> 11.png. Heading now ends "...; each edge goes one way". It tells me what it
did, which I like. One thing nags: "Weight: none (each edge counts 1)". The coach counted passes; 11
passes between two players should count for more than 3. Let me see what the "passes" column could
be other than "Attribute".

### Step 12
`--click-at 728,203` (the "passes" box; tool calls it "Role of passes") -> 12.png. Options: From, To,
Weight, Date or time, Edge id, Attribute (ticked). Weight is what a pass count is. I'll pick it.

### Step 13
`--click "Weight"` -> 13.png. "Weight: passes". A new row, "Higher means: Not set / Closer / Farther /
Capacity", and an explanation underneath: "Choose what a higher weight means. Until you do, a path
counts every edge as one step, and PageRank and communities read a higher weight as closer." It
explains itself -- good. More passes between two players means they play closer together. "Closer"
is the plain word that matches.

### Step 14
`--click "Closer"` -> 14.png. "Weight: passes (closer)" and "A higher weight means a closer tie, such
as more emails between two people." Emails, not passes, but I get it. Totals still 11 nodes, 18
edges, each one way. Load.

### Step 15
`--click "Load"` -> 15.png. It's drawn: the title bar says "players and passes", arrows between blue
balls. Right side, Graph, "From 2 files", Values / Overview: Nodes 11, Edges 18, Direction "Directed,
set in the project", Loaded weight "passes (closer)", Density 0.1636, Components 1, Edges per node 1
to 4, mean 3.273. I count the balls on the drawing myself: 11. Matches. 18 edges matches the 18
rows. But not one name on the drawing -- just dots. Which one is s11? I'll do what I always do and
type a name into the find box. Ana Torres, the keeper.

### Step 16
`--click "Find nodes, edges, values" --type "Ana"` -> 16.png. "Nodes 1: s01, name: Ana Torres", and a
"Select where name is Ana Torres (1)" line. So the name came across, but the program calls her by her
code, s01, not her name. That is one thing that doesn't fit: everything will read "s01" unless I
find how to make it use the name. Let me open her and see her passes.

### Step 17
`--click "s01"` -> 17.png. Ana is ringed in yellow at bottom left. Right panel: id s01, name Ana
Torres, position Keeper, Degree 3 with an arrow. Name and position from players.csv are with her.
In the sheet I saw s01 to s02 (11) and s01 to s03 (9); 3 means one more somewhere. Open Degree to
read the list.

### Step 18
`--click "Degree"` -> 18.png. "s01's 3 connections", Hops 1/2/3, Follow Out/In/All, and a table
Neighbor / passes: s02 11, s03 9, s04 5. I check one link against the sheet: line 2, s01 to s02, 11
passes. It held. Line 3, s01 to s03, 9. Held. The s04 one was further down the sheet than I read,
so I can't confirm it from here, but the counts are clearly the coach's. Annoyance: it's codes
again -- s02, s03, s04 -- I have to remember Bea, Cleo, Dina myself. Now the stray one: s11.

### Step 19
`--click "Find nodes, edges, values" --type "s11"` -> 19.png. Nodes 1: s11 (no "name:" line under it,
unlike Ana). Edges 1: s04 -> s11. So the extra player and that one pass are in. Open s11.

### Step 20
`--click "s11"` (tool: ambiguous, took the node, not the edge) -> 20.png. s11 is the BIGGEST ball,
right in the middle of the drawing, ringed yellow. Panel: id s11, Degree 1. No name, no position --
fair, the coach never gave any. But on the picture the one player nobody knows looks like the
centre of the team. Is that size telling me something, or is it just nearer in 3D? Nothing says.
I'd not hand this picture to anyone without a word on that ball. And nothing on the drawing marks
s11 as "not on the squad list"; I only know because the loader told me.
Last thing I want: names instead of codes on the drawing. Let me look at Style.

### Step 21
`--click "Style"` -> 21.png. For s11: Fill, Shape, Effects, Label, Tooltip each with a "+", and "Why
this look: Node defaults -- Color, Size, Shape". So s11 has the same default size as everyone; it
only looks big because it is nearer in the 3D view. Answers my question, though only because I went
looking. Label is what I want, but for everyone, not just s11. Click "Everything" on the left first.

### Step 22
`--click "Everything"` -> 22.png. Right panel "Everything", Style, Nodes/Edges: Color 6366F1, Size 1,
Shape Icosphere; Effects, Label, Tooltip each with "+". Size 1 for all, confirming s11 is not really
bigger. Click the "+" beside Label.

### Step 23
`--click-at 1419,360` ("Add label line") -> 23.png. A "Label" picker opens: Find an attribute; id,
name, position. "name".

### Step 24
`--click "name"` -> 24.png. Names on the drawing now: Hope Ward, June Kaur, Bea Lund, Iris Chen, Ana
Torres, Gia Russo, Dina Moss, Cleo Park. I count 8. The panel says "10 labels, 2 hidden" with a "Show
all labels" box. 10 labels for 10 named players, s11 has none (no name to show). Two hidden -- I want
all of them, Eve Grant and Fay Osei are missing. Tick it.

### Step 25
`--click "Show all labels"` -> 25.png. "10 labels", box ticked. Now Eve Grant and Fay Osei appear too,
but they collide: "Bea Lund" sits on top of "Eve Grant" so it reads "...ve Grant", and "Dina Moss"
runs into "Fay Osei" so it reads "Dina Mossy Osei". Ten names, all readable if I squint. The
stranger s11 -- the ball in the middle, still ringed yellow from earlier -- has no label at all.
That's correct (the coach gave no name) but it means the one thing that didn't fit is the one thing
the picture doesn't name. I have what the task asked. Stopping.

## End

Command: `node tool/real.mjs --end tier2/rounds/round-1/sessions/r1-s38`

## In character, at the end

**Did I finish?** Yes. Both sheets went in as one network, drawn: 11 players and 18 passes. Every
player from players.csv arrived (10, with name and position), and every one of the 18 pass rows
arrived, because I chose "Add" for the one row that didn't match. I checked the counts on the
loader, on the Overview (Nodes 11, Edges 18), by counting the balls, and against the sheet for Ana
Torres (s01 to s02, 11 passes; s01 to s03, 9 -- both held).

**What didn't fit:** line 17 of passes.csv, Dina Moss (s04) passing 3 times to "s11", who is not on
the squad list. The loader caught it and told me in plain words, showed me the exact line, and let
me choose. I kept it, so the map has an eleventh "player" with no name and no position. The coach
needs to tell me who s11 is (a sub, or a typo for s01/s10).

**Ease:** 5 out of 7.

**What confused or bothered me:**
- "Direction: As the file says." A spreadsheet doesn't say anything about direction, and nothing
  told me what that default would have done. I picked Directed myself.
- The pass counts came in as a plain attribute ("Weight: none, each edge counts 1") unless I
  noticed and changed it. The explanation under "Higher means" was good once I got there; the
  example talks about emails, not passes.
- After loading, everything is called by its code -- s01, s02 -- in the find results, the
  connections list and on the panel title, even though the names came in. On the drawing there were
  no names at all until I went into Style > Label and picked "name". A first look with dots and no
  names is not an answer for me.
- Two names were hidden until I ticked "Show all labels", and then they overlapped others.
- The unknown s11 is drawn as the biggest ball in the middle. It is only nearer in 3D (Style's "Why
  this look" says node defaults, size 1), but on a picture it looks like the centre of the team.
  Nothing on the drawing marks it as the one that wasn't on the squad list.
- Good: the loader's sentence "10 node rows and 18 edge rows read; the load makes 11 nodes and 18
  edges" is exactly the check I want, and "Show the 1 unmatched row" saved me hunting through the
  sheet.
