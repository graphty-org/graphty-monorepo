# Session r4-s52 -- Explorer Elena, returning user

Task: get players.csv (the squad) and passes.csv (passes between players) in as one network, drawn, and check every player and pass arrived.

## Steps

### 1. Start
Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs --start <session> empty`
Screenshot 01.png: start screen. Start: "Open project or file...", "New from data...", "or drop a file anywhere in this window". Samples on the right. A "Your data is yours, but please help us" box at the bottom.
Elena: "OK, I remember this page. First get rid of the data-sharing box."

### 2. --click "No thanks"
02.png. Box gone.
Elena: "Two spreadsheets this time. 'New from data...' sounds like where I build something from my own sheets."

### 3. --click "New from data..."
03.png: page "Open as a new graph". Left: "Tables" with a +. Right: "Drop a file here, or choose a file...". Bottom: Direction "As the file says", Cancel, Load (greyed, "Choose a file first").
Elena: "Tables, with a plus -- so more than one sheet. Start with the players."

### 4. --click "choose a file..." --upload players.csv
04.png: "Nodes: players.csv, 10 rows" with a green tick. "players: 10 nodes", "Each row is [a node] an edge". All 10 rows shown, s01 Ana Torres ... s10 June Kaur. Footer: "10 node rows read; the load makes 10 nodes and 0 edges."
Elena: "All ten players. 0 edges -- that must be the lines. Now the passes, with the plus by Tables."

### 5. --hover-at 271,107
Tooltip "Add a table". Elena: "Yes, that one."

### 6. --click "Add a table" --upload passes.csv
06.png: no file chooser; a small menu opened instead: "File...", "From a URL...", "Paste...". Nothing uploaded.
Elena: "Oh, a menu first. File..."

### 7. --click "File..." --upload passes.csv
07.png: "Edges: passes.csv, 18 rows, 1 left out" with a warning triangle. Heading "players and passes: 10 nodes, 17 edges". from/to/passes columns, "Weight: none (each edge counts 1)". Footer: "10 node rows and 18 edge rows read; the load makes 10 nodes and 17 edges. 1 edge row names a node missing from the node rows. [Add] [Leave out] Show the 1 unmatched row". Leave out appears chosen.
Elena: "18 passes in, 17 out. One row names somebody not on the squad list -- probably a typo in the coach's sheet. Which row?"

### 8. --click "Show the 1 unmatched row"
08.png: "1 unmatched row: s11 has no node row  Show all rows". Line 17: from s04, to "s11 (no node row)" with a warning icon, passes 3.
Elena: "Dina passed to s11 three times, and s11 isn't on the squad sheet -- a sub maybe. I want every pass, so Add, not Leave out."

### 9. --click "Add"
09.png: heading now "players and passes: 11 nodes, 18 edges"; passes.csv "18 rows" with a green tick. Footer "...the load makes 11 nodes and 18 edges." Add is selected.
Elena: "11 and 18, both green. Load."

### 10. --click "Load"
10.png: graph drawn: 11 blue dots with arrows, no names on them. Title bar "players and passes". Right panel Graph, "From 2 files", Values > Overview: Nodes 11, Edges 18, Direction Directed, Density 0.1636, Components 1, Edges per node 1 to 4, mean 3.273.
Elena: "Ooh. 11 and 18, matches what it promised. The big one in the middle must be our best passer. (Misreading: the size is not explained anywhere I read.) No names on the dots. Let me find s11."

### 11. --click "Find nodes, edges, values" --type "s11"
11.png: results "Nodes 1: s11", "Edges 1: s04 -> s11". Canvas unchanged.
Elena: "There it is, with Dina's pass. Click it."

### 12. --click-at 106,153 (the s11 result)
12.png: the big dot in the middle of the drawing gets a yellow ring. Right panel: Node s11, Summary: id s11, Degree 1. Selection 1.
Elena: "Wait -- the big middle one IS s11, the one I added, with one pass. So the big one isn't the star after all. Why is it the biggest and in the middle? (Finding: the extra, unlisted player is drawn as the largest dot, dead center, which reads as the most important.) Check a real player kept her name: Dina."

### 13. --click "Find nodes, edges, values" --type "Dina"
13.png: "Nodes 1: s04, name: Dina Moss"; "Values: name is Dina Moss (1)".
Elena: "Names came across. Click Dina."

### 14. --click-at 108,153 (Dina's result)
14.png: lower-middle dot ringed. Panel: s04, name Dina Moss, position Defender, Degree 4.
Elena: "Name and position came over. 'Degree 4' -- no idea, maybe her four lines. Does the number of passes come along? Check the s04 -> s11 line."

### 15. --click "Find nodes, edges, values" --type "s11" --click "s04 -> s11"
15.png: the line from Dina's dot to the big middle dot is highlighted blue. Panel: Edge s04 -> s11, From s04, To s11, passes 3.
Elena: "passes 3, matches the sheet. That's all of it. Done."

### 16. --end
Session ended; no further request.

## At the end (in character)

- **Finished?** Yes. All 10 players and all 18 passes are in one drawn network: Nodes 11, Edges 18 (the 10 squad players plus s11). Names, positions and pass counts came across.
- **Ease:** 6 of 7.
- **What did not fit:** one pass, line 17 of passes.csv (Dina Moss, s04, to "s11", 3 passes), names a player who is not on the squad list. The app caught it before loading, showed me the row, and let me choose Add or Leave out; Leave out was picked for me at first, so the first count said 17 passes, not 18. I picked Add so the pass would not go missing. s11 arrives with only its code -- no name or position -- since the coach never listed them.
- **What confused me:**
  - Adding the second sheet: the plus opened a small menu (File..., From a URL..., Paste...) rather than the file picker. Fine once I saw it.
  - In the drawing, s11 -- the player nobody listed, with one pass -- is the biggest dot, right in the middle. I took it for our best passer until I clicked it. Nothing on screen says what dot size means.
  - No names on the dots; I had to search to find anyone.
  - "Degree 4" on Dina -- I guess that is how many lines she has, not sure.
