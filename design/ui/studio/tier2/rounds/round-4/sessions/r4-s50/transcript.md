# Session r4-s50 -- Dana Okafor (returning user), two-file import

Session folder (screenshots, session.json): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s50
Commands run from the worktree root with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ and S=<session folder>.

## Step 01 -- start
`node design/ui/studio/tool/real.mjs --start $S empty`
Start screen as I remember it: Open project or file, New from data, recent projects empty, samples. Usage-data box at the bottom. "Files are read on this computer and never uploaded" -- good, that is the IT question answered.

## Step 02 -- open players.csv
`--step $S --click "No thanks" --click "Open project or file..." --upload players.csv`
An "Open as a new graph" screen with a Tables list on the left: "Nodes: players.csv, 10 rows", each row is "a node", id is Key, name and position are Attributes. Table shows all 10 players s01-s10. Bottom line: "10 node rows read; the load makes 10 nodes and 0 edges." There's a "+" next to Tables -- that looks like where the second sheet goes. Nice, I won't have to merge in Excel this time.

## Step 03 -- the "+" next to Tables
`--step $S --click-at 271,107 --upload passes.csv` (the upload part did nothing: no file picker yet)
The "+" ("Add a table") opens a small menu: File..., From a URL..., Paste... Going with File.

## Step 04 -- add passes.csv
`--step $S --click "File..." --upload passes.csv`
Second table "Edges: passes.csv, 18 rows, 1 left out" with a red warning triangle. Each row is "an edge", from = From, to = To, passes = Attribute (whole number). "Weight: none (each edge counts 1)". Heading: "players and passes: 10 nodes, 17 edges". Bottom: "10 node rows and 18 edge rows read; the load makes 10 nodes and 17 edges. 1 edge row names a node missing from the node rows. [Add] [Leave out] Show the 1 unmatched row". It told me, it didn't hide it. Good. Let me see the row.

## Step 05 -- show the unmatched row
`--step $S --click "Show the 1 unmatched row"`
"1 unmatched row: s11 has no node row". Line 17: s04 -> s11 (no node row), 3 passes. So someone not on the squad sheet -- probably a sub or a guest. Leave out loses a pass; the job is every pass in, so Add.

## Step 06 -- Add
`--step $S --click "Add"`
Heading now "players and passes: 11 nodes, 18 edges"; passes.csv shows a green check and "18 rows"; bottom line "the load makes 11 nodes and 18 edges", Add is the selected choice. The row itself still shows the red "s11 (no node row)" warning, which made me look twice -- it's been handled, but it still looks like an error. Note: "Weight: none (each edge counts 1)" -- it did not use the passes count as weight on its own; fine for now, it's kept as an attribute. Load.

## Step 07 -- Load
`--step $S --click "Load"`
A drawing appears, titled "players and passes". Right panel, Values: Nodes 11, Edges 18, Direction Directed, Components 1, "From 2 files". I count 11 dots on the canvas. Numbers match the import screen. But no names drawn on the dots -- I can't tell which dot is which player, or which one is s11. Going to the table icon in the toolbar to check names.

## Step 08 -- Table
`--step $S --click-at 793,864` (button "Table")
A table opens under the drawing: Nodes / Edges tabs, "11 nodes", "In the order loaded", columns id, name, position. s01 Ana Torres Keeper ... Only four rows fit; scrolling to the end to see s11.

## Step 09 -- scroll node table
`--step $S --wheel 740,820,800`
End of the list: s08 Hope Ward, s09 Iris Chen, s10 June Kaur, then s11 with blank name and position. That's the extra one I added. All 10 squad players plus s11 = 11.

## Step 10 -- Edges tab
`--step $S --click "Edges"`
"18 edges", columns From, To, passes: s01->s02 11, s01->s03 9, s02->s03 6, s02->s05 14 -- same as the file. Matches the Overview (18). Everything arrived. The edge table shows ids (s01), not player names, so to read it I'd have to cross-reference the node tab -- the kind of lookup I do in Excel. Done.

## Step 11 -- end
`--end $S` -- session ended.

## Debrief (in character, Dana Okafor)

**Did I finish?** Yes. Both sheets went in as one network: 11 nodes (the 10 players plus s11) and 18 passes, drawn, and the counts on the import screen, the Overview panel and both tables agree.

**Ease: 6 / 7.** This is the first time I didn't have to merge the two sheets in Excel first. The "+" next to Tables took the second file, it guessed the from/to columns right, and it told me up front that one pass pointed at someone not on the squad, with the line number and the choice to add or leave it out. That's exactly the thing my last tool hid.

**What did not fit / what confused me:**
- passes.csv has a pass to **s11**, who isn't in players.csv. I chose Add, so s11 is in the network with no name and no position. The coach should tell us who s11 is (a sub?), or fix the squad sheet.
- After I clicked Add, that row still shows the red warning "s11 (no node row)". The counts went green, but the row still looks like an error. I wasn't sure for a second that Add had taken.
- "Weight: none (each edge counts 1)" -- it kept the passes number as a column but didn't treat it as how strong the link is. Fine for this job, but if I ranked who matters most, I'd want to know whether 17 passes counts more than 3. It didn't ask.
- No names on the dots in the drawing; I had to open the table to know who is who. And the edge table shows s01/s02 rather than player names, so I'm back to cross-referencing like a VLOOKUP.
- The "+" is small and grey next to "Tables"; I found it because I was looking for it.
