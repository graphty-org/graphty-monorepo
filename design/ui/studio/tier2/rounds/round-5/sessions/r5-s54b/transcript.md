# Session r5-s54b -- Dev, returning (players.csv + passes.csv)

Commands run from the studio worktree with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs --step tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s54b ...`
(shown below as `--step ...`).

## 01.png (session started for me)
Start screen: Open project or file, New from data, samples, and a "please help us" usage-data box.
I know this screen. First I get rid of the usage box.

## Step 1 -- `--step --click "No thanks"` -> 02.png
Box gone.

## Step 2 -- `--step --click "Open project or file..." --upload players.csv` -> 03.png
"Okay, same as last time, open the file." I start with players.csv since it is the squad.
I get "Open as a new graph" with a Tables list: "Nodes: players.csv, 10 rows", each row is
"a node", columns id (Key), name, position (Attribute). Bottom line: "10 node rows read; the load
makes 10 nodes and 0 edges." 10 players, s01 Ana Torres to s10 June Kaur. Wait -- 0 edges, so I
need the passes too. There is a "+" next to "Tables", so I will try adding the second sheet there.

## Step 3 -- `--step --hover-icon 1` -> 04.png
I meant to check the little icons; the first one is just "Main menu: open, save, export, settings". Not what I wanted.

## Step 4 -- `--step --hover-at 271,106` -> 05.png
The "+" next to Tables says "Add a table". That sounds right for the second sheet.

## Step 5 -- `--step --click "Add a table" --upload passes.csv` -> 06.png
It did not open a file box; it opened a little menu: File..., From a URL..., Paste...

## Step 6 -- `--step --click "File..." --upload passes.csv` -> 07.png
"oh nice." Now the list shows "Edges: passes.csv, 18 rows, 1 left out" with a red warning triangle.
The heading says "players and passes: 10 nodes, 17 edges". Columns from (From), to (To), passes
(Attribute, whole number). "Weight: none (each edge counts 1)". The bottom says "10 node rows and
18 edge rows read; the load makes 10 nodes and 17 edges. 1 edge row names a node missing from the
node rows." with Add / Leave out buttons and "Show the 1 unmatched row". Wait -- so one pass
did not fit. The task says make sure every pass arrived and tell them what did not fit, so I
want to see that row first.

## Step 7 -- `--step --click "Show the 1 unmatched row"` -> 08.png
"1 unmatched row: s11 has no node row". Line 17: from s04 to s11 (no node row), 3 passes.
So Dina Moss passed 3 times to an "s11" who is not on the squad list -- maybe a sub the coach
forgot to write down? The task says every pass should arrive, so I will press "Add", which I
guess makes s11 a dot even though it has no name. I will mention s11 to the coach.

## Step 8 -- `--step --hover "Add"` -> 09.png
Tooltip: "Make a node for each missing name". Yes, that is what I want.

## Step 9 -- `--step --click "Add"` -> 10.png
Now "players and passes: 11 nodes, 18 edges", passes.csv has a green check, "18 rows", and the
bottom reads "the load makes 11 nodes and 18 edges". So all 18 passes rows are in, plus one extra
dot for s11. Before loading I want to see the rest of the passes rows -- I only saw down to line 15.

## Step 10 -- `--step --click "Show all rows" --wheel 860,600,800` -> 11.png
"All 18 rows", lines 2 to 19, every from/to is s01-s10 except line 17 (s04 -> s11, 3). Passes
column is read as a whole number, kept as an attribute; "Weight: none (each edge counts 1)". For
this job I only need everything in and drawn, so I leave the weight alone. Direction says "As the
file says" -- passes go from one player to another, fine. Pressing Load.

## Step 11 -- `--step --click "Load"` -> 12.png
A drawing! Title is now "players and passes". Right panel, Values, Overview: Nodes 11, Edges 18,
Direction Directed, Components 1, "From 2 files". I count 11 dots with arrows. Numbers match what
the loader promised (10 players + s11, 18 passes rows). But the dots have no names, so I cannot
see which dot is which player. I want to check the players arrived by name -- the toolbar has a
grid icon that looks like a table.

## Step 12 -- `--step --click-at 793,863` (the "Table" button) -> 13.png
A table opened under the drawing: Nodes / Edges tabs, "11 nodes", columns id, name, position,
"In the order loaded". s01 Ana Torres Keeper ... the names came in. I scroll down to see the
bottom, where s11 should be.

## Step 13 -- `--step --wheel 740,820,800` -> 14.png
Bottom of the list: s08 Hope Ward, s09 Iris Chen, s10 June Kaur, and s11 with an empty name and
position. All ten players are in, plus the mystery s11. Now the Edges tab, to see the passes.

## Step 14 -- `--step --click "Edges"` -> 15.png
"18 edges", From / To / passes: s01->s02 11, s01->s03 9, s02->s03 6, s02->s05 14 ... same numbers
as the sheet preview. The passes count came along with every pass. That is everything: the network
is drawn, 11 nodes and 18 edges, and I know what did not fit. Ending.

## `--end` -- session ended

## In my own words (Dev)

**Did I finish?** Yes. Both sheets are in as one network, "players and passes", drawn with arrows:
11 nodes and 18 edges, one piece. All 10 players arrived with their names and positions, and all
18 passes rows arrived with their pass counts.

**What did not fit:** one row of passes.csv (line 17) says s04 Dina Moss passed 3 times to "s11",
and there is no s11 in players.csv. The program caught it before loading ("1 edge row names a node
missing from the node rows") and showed me the row. I pressed Add, so that pass is kept and s11 is
an eleventh dot with no name or position. Coach: who is s11? Either add them to the squad sheet or
that row is a typo.

Essay-style sentence: "The coach's sheets load as 10 players and 18 passing links; one link
points to a player, s11, who is not on the squad list, so the network shows 11 people."

**Ease: 6 out of 7.**

**What confused me:**
- The "+" by Tables opens a small menu (File / From a URL / Paste) rather than the file box, so my
  first try did nothing I expected. Easy once I saw it.
- "Add" and "Leave out" sit next to each other with no word on what happens to the row until I
  hovered ("Make a node for each missing name"). After clicking Add, the "1 unmatched row: s11 has
  no node row" line and the red warning icon on the row stayed, which made me wonder for a second
  whether it had worked -- the counts (11 nodes, 18 edges) and the green check told me it had.
- After loading, the dots have no names on them, so I could only check players in the table, not
  on the picture.
- "Weight: none (each edge counts 1)" -- I left it, since this job was only to get everything in,
  but I am not sure whether the passes number should be the weight.
