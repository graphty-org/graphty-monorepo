# Session r2-s42 -- Dana (returning supply-chain analyst), task T4, dataset B (football: players.csv + passes.csv)

Build: 8f0d5a6f7791 (frozen copy tier2-r2d4-8f0d5a6f7). Start: empty.

Commands run from `design/ui/studio/tier2` with `T=../tool`, `S=rounds/round-2/sessions/r2-s42`,
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/`.

## Steps

### Start
`node $T/real.mjs --start $S empty` -> 01.png

01.png: the start screen I know. Open project or file..., New from data..., samples on the right,
and a "please help us" box about usage data at the bottom. I am not sharing usage data from a
work laptop -- "No thanks" first.

### Step 1
`--click "No thanks"` -> 02.png

02.png: box gone, "Usage data stays off" at the bottom. Good. Normally I'd merge my two sheets in
Excel first, but I have two separate files here. "New from data..." sounds like it builds something
from more than one sheet; "Open project or file" is what I used for a single export. Trying "New
from data...".

### Step 2
`--click "New from data..."` -> 03.png

03.png: "Open as a new graph", a "Tables" list on the left with a +, and a tiny grey line "Drop a
file here, or choose a file..." -- I had to lean in to read it. "Tables" plural is promising: maybe
I can put both sheets in. I'll start with the squad list, players.csv, via "choose a file...".

### Step 3
`--click "choose a file..." --upload players.csv` -> 04.png

04.png: it read players.csv as "Nodes: players.csv, 10 rows", green tick. The table is right there,
10 players, s01 Ana Torres to s10 June Kaur, Keeper/Defender/Midfield/Forward. "Each row is: a
node | an edge" -- it picked "a node"; I'd call it a player, fine. id is the "Key", name and
position "Attribute". Bottom line: "10 node rows read; the load makes 10 nodes and 0 edges." Clear.
Now I need the passes sheet in too. The + next to "Tables" is the obvious place.

### Step 4
`--hover-at 271,107` -> 05.png (tooltip "Add a table")

The + says "Add a table". That's what I want. Clicking it.

### Step 5
`--click "Add a table"` -> 06.png

06.png: a small menu -- File..., From a URL..., Paste... . File it is, passes.csv.

### Step 6
`--click "File..." --upload passes.csv` -> 07.png

07.png: now "players and passes: 10 nodes, 17 edges". It set passes.csv as edges, from/to picked
up right, "passes" is an Attribute, "whole number". Left side: "Edges: passes.csv, 18 rows, 1 left
out" with a red warning triangle. Bottom: "1 edge row names a node missing from the node rows.
Add | Leave out | Show the 1 unmatched row" -- "Leave out" is the one highlighted. So 18 passes in
the sheet, 17 will load. That is exactly the kind of thing I want told to me, and it told me.
Before I decide, I want to see that row -- "Show the 1 unmatched row".
(Also noticed "Weight: none (each edge counts 1)" -- park that for now.)

### Step 7
`--click "Show the 1 unmatched row"` -> 08.png

08.png: "1 unmatched row: s11 has no node row". Line 17: s04 -> s11 (no node row), 3 passes. So
Dina Moss passed 3 times to someone called s11 who is not on the coach's squad list -- a sub, or a
typo. Same as a supplier code that isn't in my master list. I was asked to make sure every pass
arrived, so I don't want it silently dropped: I'll pick "Add" (I read that as: add s11 as a player
so the 3 passes stay). I'll flag s11 to the coach.

### Step 8
`--click "Add"` -> 09.png

09.png: header now "11 nodes, 18 edges"; both tables have green ticks, passes.csv "18 rows" (the
"1 left out" is gone). Bottom: "the load makes 11 nodes and 18 edges." 10 players + s11, all 18
passes. The pass counts stay as a column ("passes", Attribute). "Weight: none" -- I'm not ranking
anything today, so I'll leave it. Direction "As the file says" -- fine, from/to. Load.

### Step 9
`--click "Load"` -> 10.png

10.png: it's drawn. Title "players and passes", panel says "From 2 files", Nodes 11, Edges 18,
Directed, Components 1. Numbers match what it promised. But the balls have no names on them -- I
can't tell Ana from June. I want the list, the way I always check: the Data place on the left.

### Step 10
`--click "Data"` -> 11.png

11.png: Sources: "players.csv and passes.csv, 11 nodes, 18 edges", with both files under it.
Attributes: Nodes -- id, name 90%, position 90%; Edges -- passes. The 90% makes sense: 10 of 11
have a name; s11 has none. Consistent. I still want to see the rows, player by player. Clicking
"name" to see who is missing one.

### Step 11
`--click "name"` -> 12.png

12.png: right panel "name, Attribute": Table Nodes, Kind "Groups" (?? a name is not a group --
odd, but I skim past), Has a value 90.91%, Distinct values 10. Still no row list. Fine -- I'll
find s11 on the drawing instead. Back to Graph and type s11 in the find box.

### Step 12
`--click "Graph" --click "Find nodes, edges, values" --type "s11"` -> 13.png

13.png: the find box lists "Nodes 1: s11" and "Edges 1: s04 -> s11". So the extra one and its
pass are in. Clicking s11 to see which ball it is and what it carries.

### Step 13
`--click "s11"` -> 14.png (tool: ambiguous, nothing clicked)

Click didn't land (two results contain s11). Clicking the node row itself.

### Step 14
`--click "s11#1"` -> 15.png

15.png: s11 lights up yellow -- it's the biggest ball in the middle of the cluster. Panel: id s11,
Degree 1 (I don't know "degree"; I guess it's its one pass). No name, no position, as expected.
Odd that the outsider with one pass is drawn as the biggest ball -- is size telling me something,
or is it just nearer to me in 3D? I won't trust it. Last check: do the players' names really ride
along? Searching "Dina" (s04, the one who passed to s11).

### Step 15
`--click "Find nodes, edges, values" --type "Dina"` -> 16.png

16.png: "Nodes 1: s04, name: Dina Moss". Names came across with the players. That's enough
checking: 11 nodes (10 players + s11), 18 passes, names and positions on the 10 players, pass
counts kept as a column. Stopping here.

### End
`node $T/real.mjs --end $S`

## Wrap-up (in character, Dana)

**Did I finish?** Yes. Both sheets went in as one network and it drew: 10 players plus one
extra, and all 18 passes. I checked the counts on the load screen, on the Graph panel (Nodes 11,
Edges 18, "From 2 files"), in the Data place's Sources line, and by finding s11 and Dina Moss in
the find box.

**What did not fit (for the coach):** passes.csv line 17 has Dina Moss (s04) passing 3 times to
"s11", who is not in players.csv. The program flagged it before loading ("1 edge row names a node
missing from the node rows") and offered Add or Leave out, with Leave out picked by default. I
chose Add so the 3 passes are kept; s11 is now on the drawing with no name and no position. Either
it is a sub who is missing from the squad list, or it is a typo for one of the s01-s10 codes.

**Ease: 6 of 7.** This is the first time I didn't have to merge two exports in Excel first. "New
from data..." took both files, guessed the node file and the edge file right, picked up from/to
by itself, and the line at the bottom ("the load makes 11 nodes and 18 edges") told me exactly
what I'd get before I pressed Load. Being told about the stray row up front, with the row itself
one click away, is what earns my trust.

**What confused me / what I'd fix:**
- "Leave out" was preselected for the stray row. If I had skimmed and hit Load, a pass would have
  quietly dropped -- the warning is there, but the default throws data away.
- "Add" vs "Leave out": I guessed "Add" meant "add s11 as a player". It did, but the button
  doesn't say what it adds.
- The balls have no names on them. I had to use the find box to tell who is who; for a VP slide
  that's a non-starter.
- The extra player, with one pass, was drawn as the biggest ball in the middle. I can't tell if
  size means something or it's just closer in 3D.
- Clicking "name" in Attributes says Kind "Groups" -- a person's name isn't a group.
- "Weight: none (each edge counts 1)" while my sheet has a pass count: I left it, but I'm not sure
  if that matters later when I rank players.
- I wanted to see the loaded rows as a table after Load (who has which name) -- the Data place
  shows columns and percentages, not the rows.
- Small grey text ("Drop a file here, or choose a file...", "Each row is") is hard to read.
