# Session r1-s36 -- Alex (regular analyst), task T4 dataset B (football: players.csv + passes.csv)

Build: frozen build 946256efb876 (`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/`).
Tool: `node design/ui/studio/tool/real.mjs` run from `design/ui/studio`, session folder `tier2/rounds/round-1/sessions/r1-s36`.

## Steps

### 01 -- start

`./tool/with-browser.sh node tool/real.mjs --start tier2/rounds/round-1/sessions/r1-s36 empty` -> 01.png

Alex: Start page. "Files are read on this computer and never uploaded" -- good, that's the line I always look for. There's a usage-data banner at the bottom; I'll say no thanks first. Then "New from data..." looks like where two spreadsheets go, since "Open project or file" sounds like one file.

### 02 -- dismiss usage banner

`node tool/real.mjs --step $S --click "No thanks"` -> 02.png

Alex: Banner should be gone. Now "New from data..." -- I want to get both sheets in as one network.

### 03 -- New from data...

`node tool/real.mjs --step $S --click "New from data..."` -> 03.png

Alex: "Open as a new graph" page with a "Tables" list and a plus next to it -- so it looks like it takes more than one table. Good sign. I'll choose the players file first via "choose a file...".

### 04 -- choose players.csv

`node tool/real.mjs --step $S --click "choose a file..." --upload players.csv` -> 04.png

Alex: It read players.csv as "Nodes", 10 rows, id picked as the Key, name and position as attributes. Footer says 10 nodes, 0 edges. That matches -- 10 players. Now the plus next to "Tables" for the passes file.

### 05 -- hover the plus

`node tool/real.mjs --step $S --hover-at 271,107` -> 05.png (tooltip "Add a table"; cursor shows default, not a hand)

Alex: "Add a table" -- that's what I want. Clicking it.

### 06 -- Add a table

`node tool/real.mjs --step $S --click "Add a table"` -> 06.png

Alex: Menu with File..., From a URL..., Paste.... File... and pick passes.csv.

### 07 -- File... passes.csv

`node tool/real.mjs --step $S --click "File..." --upload passes.csv` -> 07.png

Alex: Both tables listed. passes.csv read as edges: from/to picked automatically, passes as a whole-number attribute. Header says "players and passes: 10 nodes, 17 edges" -- but 18 edge rows. Warning: "1 edge row names a node missing from the node rows", with Show / Add / Leave out. That's the kind of thing I want flagged. Let me see which row first before I decide.
Also noticed "Weight: none (each edge counts 1)" -- the pass count should really be the weight. I'll come back to that.

### 08 -- Show the 1 unmatched row

`node tool/real.mjs --step $S --click "Show the 1 unmatched row"` -> 08.png

Alex: Line 17: s04 to s11, 3 passes. s11 isn't on the squad list -- probably a sub or a guest the coach forgot to add. The task says every pass should arrive, so I'd rather keep it and add s11 as a node than silently drop 3 passes. "Leave out" looks like it's the one selected right now (it has the outline). Clicking "Add".

### 09 -- Add

`node tool/real.mjs --step $S --click "Add"` -> 09.png

Alex: Now "11 nodes, 18 edges", the passes table has a green check, 18 rows, nothing left out. All 18 pass rows in. Now the weight: it still says "Weight: none". I'll open the dropdown under "passes" to see if I can make it the weight.

### 10 -- click "passes" (meant the dropdown)

`node tool/real.mjs --step $S --click "passes"` -> 10.png (tool: ambiguous, matched the table header button and the "Role of passes" combobox, took the header)

Alex: That just sorted the table column (little arrow by "passes"). Not what I meant. Clicking the "Attribute" dropdown itself, under "passes".

### 11 -- open the passes dropdown

`node tool/real.mjs --step $S --click-at 729,203` -> 11.png

Alex: Options: From, To, Weight, Date or time, Edge id, Attribute. Picking Weight.

### 12 -- Weight

`node tool/real.mjs --step $S --click "Weight"` -> 12.png

Alex: "Weight: passes", and it asks what higher means: Not set / Closer / Farther / Capacity. More passes between two players means they link up more, so "Closer". Nice that it says what happens if I leave it.

### 13 -- Closer

`node tool/real.mjs --step $S --click "Closer"` -> 13.png

Alex: "Weight: passes (closer)". The example says "more emails between two people" -- odd for a football file, but I get it. Still 11 nodes, 18 edges. Direction "As the file says" -- passes go from one player to another, fine. Load.

### 14 -- Load

`node tool/real.mjs --step $S --click "Load"` -> 14.png

Alex: Drawn. Title "players and passes", "From 2 files". Overview on the right: Nodes 11, Edges 18, Directed, Loaded weight passes (closer), 1 component. I count 11 dots on the picture. Counts match what I chose. No names on the dots though, so I can't tell who is who from the picture. I want to check the extra s11 actually made it in -- I'll search for it.

### 15 -- search "s11"

`node tool/real.mjs --step $S --click "Find nodes, edges, values" --type "s11"` -> 15.png

Alex: Found it: Nodes 1 "s11", Edges 1 "s04 -> s11". It's in. The search list shows ids, not names. Clicking s11 to see what it knows about it -- I expect no name and no position.

### 16 -- click s11 in the search results

`node tool/real.mjs --step $S --click-at 106,153` -> 16.png

Alex: It selected s11 and ringed it in yellow on the picture. Right panel: id s11, Degree 1. No name, no position -- as expected, since he wasn't on the squad sheet. But s11 is the BIGGEST dot on the screen, right in the middle of the pack, and he only has one link. Why is the least-connected guy the biggest thing on the picture? I'd have read that as "the key player" if I hadn't checked. (Probably the 3D view putting him nearest the camera, but nothing tells me that.) Good enough -- everything is in. I'm done.

### 17 -- end

`node tool/real.mjs --end $S`

## Wrap-up (in character)

**Finished?** Yes. Both spreadsheets went in as one network and it's drawn: 11 nodes (the 10 players plus s11) and 18 edges (all 18 pass rows), directed, with the pass count as the weight. The Overview panel numbers match the files.

**What did not fit:** one row in passes.csv (line 17, s04 -> s11, 3 passes) names a player, s11, who isn't on the squad list. The app caught it before loading and let me pick Add or Leave out. I added him, so he's in the network with an id only -- no name, no position. The coach should add s11 to players.csv.

**Ease: 6 of 7.** From two CSVs to a checked network in about a dozen clicks, no glue code, and the unmatched row was flagged before anything loaded. That's better than Gephi's import, honestly.

**What confused me / what took longest:**

- The pass count came in as a plain "Attribute" and the screen said "Weight: none (each edge counts 1)". I had to notice that myself and change it to Weight; if I hadn't, every pass link would count the same. For a column of whole numbers called "passes" on an edge table I'd have expected it to at least ask.
- Clicking the word "passes" above the dropdown sorted the table column instead of opening the role dropdown -- two things named the same right next to each other. Minor.
- "Leave out" was the default for the unmatched row. Defensible, but it means a quick Load silently drops a pass unless you read the yellow line. It did say "1 left out" on the table, so it isn't hidden.
- The "Closer" explanation talks about "more emails between two people" -- fine, but it's a football file.
- No names on the dots after loading, so I can't see who is who without searching or clicking.
- The one player who isn't on the squad, with a single pass link, is the biggest dot in the middle of the picture. Nothing explains why dots differ in size here; I'd have reported him as the hub.
- The search results list players by id (s01, s11), not by name, even though the squad sheet has names.
