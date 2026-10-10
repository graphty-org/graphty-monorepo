# Session r1-s34 -- Tom (returning), task T4, dataset B (football: players.csv + passes.csv)

Build: 946256efb876 (frozen copy tier2-r1d4-946256efb). Start: empty.

Note before starting: the study tool's own file list (which I had to read to drive the tool)
describes players.csv and passes.csv, including that one pass names a player who is not on the
squad list. I try not to act on that; I note it here so the reader can weigh it.

## Steps

### 01 -- start
`node tool/real.mjs --start tier2/rounds/round-1/sessions/r1-s34 empty` (run through tool/with-browser.sh)

The start screen I remember: "Open project or file...", "New from data...", samples on the right,
and the usage-data box at the bottom. Recent projects is empty on this computer. I will say no
thanks to the usage box first, then try to bring in the coach's two spreadsheets.

### 02 -- No thanks
`--step $S --click "No thanks"` -> 02.png. The box is gone.

I have two spreadsheets, not one list. "Open project or file..." is what I always used, but
"New from data..." sounds like it is for building something from my own spreadsheets. I will try that.

### 03 -- New from data...
`--step $S --click "New from data..."` -> 03.png. A page "Open as a new graph". On the left
"Tables" with a plus; on the right "Drop a file here, or choose a file...". A "Direction" box
says "As the file says". Load is greyed out, "Choose a file first".

"Tables", plural, and a plus: that looks like it takes more than one. I will start with the squad
list, players.csv, through "choose a file...".

### 04 -- chose players.csv
`--step $S --click "choose a file..." --upload players.csv` -> 04.png. On the left, "Nodes:
players.csv, 10 rows" with a green tick. On the right a table of all ten players, s01 Ana Torres
(Keeper) to s10 June Kaur (Forward). It says "Each row is: a node / an edge", with "a node"
picked, and under the table "10 node rows read; the load makes 10 nodes and 0 edges." That is
plain enough: ten players, no passes yet.

"Key" and "Attribute" over the columns I would not touch -- it guessed, and the table looks right.
Now the passes. I will press the plus next to "Tables".

### 05 -- the plus ("Add a table")
`--step $S --click-at 271,107` -> 05.png. A small menu: "File...", "From a URL...", "Paste...".
File is what I have. Choosing File... and giving it passes.csv.

### 06 -- added passes.csv
`--step $S --click "File..." --upload passes.csv` -> 06.png. Now the left says "Edges: passes.csv,
18 rows, 1 left out" with a red warning triangle. The heading says "players and passes: 10 nodes,
17 edges". It picked "an edge" for this one by itself, and the columns read From, To and passes
(Attribute, whole number). There is a line "Weight: none (each edge counts 1)" -- I am not sure
what that means for the pass counts; the counts are still in the table, so I leave it.

At the bottom: "10 node rows and 18 edge rows read; the load makes 10 nodes and 17 edges. 1 edge
row names a node missing from the node rows. Show the 1 unmatched row", then "Add" and "Leave out"
(Leave out looks like the one pressed). The coach said 18 passes lines; it will only make 17. I want
to see which one before I decide. Clicking "Show the 1 unmatched row".

### 07 -- Show the 1 unmatched row
`--step $S --click "Show the 1 unmatched row"` -> 07.png. Now the table shows just one row: line
17, from s04 to "s11 (no node row)", 3 passes, with a warning sign. "1 unmatched row: s11 has no
node row", and a link "Show all rows". So Dina Moss (s04) passed three times to somebody called
s11, and s11 is not on the coach's squad list -- a sub or a guest, maybe. That is the thing that
"did not fit".

I was asked to make sure every pass arrived, so I do not want this one thrown away. "Add"
probably means put s11 in as a player. Before I press it, I hover to see if it says what it does.

### 08 -- hover Add
`--step $S --hover "Add"` -> 08.png. Tooltip: "Make a node for each missing name". Good, that is
what I guessed: s11 becomes a dot of its own, with no name or position since the squad list does
not have them. That keeps the pass. Pressing Add.

### 09 -- Add
`--step $S --click "Add"` -> 09.png. The heading now says "players and passes: 11 nodes, 18
edges", the passes table on the left has a green tick and "18 rows" (the "1 left out" is gone),
and the bottom line says "the load makes 11 nodes and 18 edges". Add is now the pressed one. All
18 passes are in, and the extra dot is s11. The unmatched row still shows a red warning beside
s11, which made me look twice -- but the counts say it is in.

"Direction: As the file says" -- I do not know what else it would be and I do not change things I
do not understand. Pressing Load.

### 10 -- Load
`--step $S --click "Load"` -> 10.png. It is drawn: blue dots with grey arrows on a light canvas.
The title at the top now reads "players and passes". On the right, "Graph, From 2 files", and the
Overview: Nodes 11, Edges 18, Direction Directed, Components 1. I count eleven dots myself. So all
ten players plus s11, and all eighteen passes.

The dots have no names on them, though, so I cannot tell which one is Ana or which is the stranger
s11. I want to check s11 really is in there. I will use the find box, which I know, and type s11.

### 11 -- find s11
`--step $S --click "Find nodes, edges, values" --type "s11"` -> 11.png. The list shows "Nodes 1:
s11" and "Edges 1: s04 -> s11". So the stranger and Dina's pass to him are both in. The picture did
not change, though -- nothing lit up. I will click s11 in the list to see which dot it is.

### 12 -- click s11 in the list
`--step $S --click-at 105,153` -> 12.png. The biggest dot near the middle gets a yellow ring. The
right side says "s11, Node", id s11, Degree 1. Odd: the stranger with one pass is the biggest dot,
right in the middle of the team. Is it big because it matters, or because it is nearer to me in
this 3D view? I cannot tell, and I would not want to show the coach a picture where the outsider
looks like the star. I note that.

Now I want to check that a real player came in with a name and position, not just an id. Clicking
the dot at the lower left.

### 13 -- click the lower-left dot
`--step $S --click-at 461,587` -> 13.png. s01: name Ana Torres, position Keeper, Degree 3. Good, the
squad list's names and positions came with the dots. Earlier the screen said "Weight: none (each
edge counts 1)" and that worried me: did the pass counts survive? I will click the line from Ana
up to the left-hand dot to see what a pass line carries.

### 14 -- click the pass line
`--step $S --click-at 528,513` -> 14.png. The line turns blue. Right side: "s01 -> s02, Edge",
From s01, To s02, passes 11. That matches the first row of the coach's file (s01 to s02, 11). So
the counts came through even though it said "Weight: none". The line panel shows only the ids, not
Ana's and Bea's names, so I had to remember who s01 and s02 were.

That is everything I was asked: both spreadsheets in as one picture, eleven dots and eighteen
lines, and I know what did not fit. I stop here.

### End
`node tool/real.mjs --end $S`

## In my own words

**Did I finish?** Yes. Both of the coach's spreadsheets went in together as one drawn network:
11 dots and 18 pass lines, with names and positions on the players and the pass counts on the
lines.

**What did not fit:** one row of passes.csv (line 17) has Dina Moss (s04) passing 3 times to
"s11", who is not on the squad list. The program told me before I loaded, showed me the row when I
asked, and let me choose. I chose "Add", so s11 is in as a dot with no name or position. If I had
left the default it would have quietly made only 17 passes.

**Ease:** 6 out of 7. Two spreadsheets on one page with a plus for the second one was easy to
find, and the counts at the bottom ("the load makes 11 nodes and 18 edges") told me exactly what I
would get. That count is what I always want.

**What confused me or slowed me down:**
- "Leave out" was already chosen for the missing player. Asked to bring in every pass, I nearly
  missed that one would be dropped; only the red triangle and "1 left out" on the left made me look.
- After I pressed Add, the shown row still had a red warning beside "s11 (no node row)". The counts
  said it was in, but the red mark made me wonder if Add had worked.
- "Weight: none (each edge counts 1)" sounded like my pass counts were being thrown away. They were
  not -- the line still says passes 11 -- but I only knew by clicking a line to check.
- "Key", "Attribute", "Direction: As the file says" -- I left them alone because I did not know
  what changing them would do. Nothing explained them.
- No names on the dots, so I could not see who was who without clicking each one. The pass line's
  panel shows "s01 -> s02", not the players' names.
- The outsider s11, with a single pass, is drawn as the biggest dot right in the middle of the
  team. I could not tell whether big means important or just nearer to me in the 3D view, and I
  would not show the coach that picture without knowing.
- The find box listed s11 but nothing lit up in the picture until I clicked the result.
