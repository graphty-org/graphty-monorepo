# Session r1-s16 -- Ruth (reporter), first time

Task: open the ready-made college football network; have the program find its own clusters (not the conferences in the file), each cluster in its own color; then draw every cluster's teams as cubes, keeping every cluster's color.

## Step 1 -- start
Command: `REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <folder> empty`
Screenshot 01.png: a landing page. "Open a file", "Open network data", "Samples", "New project". A demo graph on the right with buttons "Communities", "Key players", "Shortest path". Note under the box: "It never leaves your computer." Good -- that's the first thing I check.
Next: "ready-made network" sounds like Samples. Clicking Samples.

## Step 2 -- Samples
Command: `--step --click "Samples#2"` -> refused, ambiguous (a button and a link both say Samples). Then `--click "role=button:Samples"` -> 03.png.
03.png: "Sample library". Card "Conferences fall out of who played whom -- College football -- 115 nodes, 613 edges". Writing down: 115 teams, 613 games.
Next: click that card.

## Step 3 -- open the sample
Command: `--step --click-at 712,480` (button "Open the College football sample") -> 04.png.
04.png: the graph is open. Right panel "Values": Nodes 115, Edges 613, Undirected, Components 1. Matches the card: nothing dropped. "Local only" next to the title. All balls are one purple-blue. Left: "Style layers" with Hovered, Selected, Everything. Bottom toolbar of icons; first is a flask.
Next: hover the flask to learn what it is.

## Step 4 -- hover flask
Command: `--step --hover-at 615,864` -> tooltip "Analyze Shift+A" (05.png).
Next: click Analyze.

## Step 5 -- Analyze
Command: `--step --click "Analyze"` -> 06.png.
06.png: a list "Filter analyses", heading "Rank nodes and edges": Degree, Betweenness, Closeness, PageRank... each with a one-line description. These rank; I want groups.
Next: type "cluster" in the filter.

## Step 6 -- filter "cluster"
Command: `--step --type "cluster"` -> 07.png.
07.png: a "Find groups" section appears: Louvain ("Which nodes form densely linked groups."), Leiden, Label propagation, Markov, Spectral ("a chosen number of groups"), Hierarchical. I don't want to choose a number -- the program should find them. "Densely linked groups" = teams that often play one another. Words decided it: Louvain.
Next: click Louvain.

## Step 7 -- Louvain options
Command: `--step --click-at 485,510` (option "Louvain") -> 08.png.
08.png: Louvain card: Resolution 1, Weight None, "Under a second", Run. No explanation of what Resolution means here -- I leave the default. A small gear icon with no label.
Next: Run.

## Step 8 -- Run
Command: `--step --click "Run"` -> 09.png.
09.png: balls now in 10 colors. A legend "Color: Louvain" lists Group 1 .. Group 10. No count per group in the legend -- "is that all of them?" I can't confirm each group's size from this screen. Left list now has a "Louvain" folder (with a little arrow) above "Everything 115". Clusters part looks done.
Next: open the Louvain folder in the left list to see what it holds.

## Step 9 -- open Louvain folder
Command: `--step --click-at 64,216` (treeitem "Louvain, folder, 10 layers") -> 10.png.
10.png: folder opens: Group 1 16, Group 2 15, Group 3 14, Group 4 12, Group 5 11, Group 6 10, Group 7 10, Group 8 9, Group 9 9, Group 10 9. I add them: 115. Matches Nodes 115 -- nobody left out. That's the check I wanted.
Next: click the Louvain folder row to see if I can set a shape for all groups at once.

## Step 10 -- select the Louvain folder
Command: `--step --click-at 118,216` -> 11.png.
11.png: right panel for the folder: "10 layers in Louvain. Layers added later are not changed." Node tab, "Which nodes 115 of 115", Shape +, Visibility +, Text +, Fill: Color "«Layer»" with the group swatches (+5). So editing here seems to edit all ten groups, and the color stays per group. "«Layer»" is jargon-ish but the swatches explain it.
Next: click "Shape +".

## Step 11 -- Shape +
Command: `--step --click-at 1404,298` (button "Add to node shape") -> 12.png.
12.png: menu with "Shape" and "Size".
Next: click "Shape".

## Step 12 -- Shape added
Command: `--step --click-at 1340,334` (menuitem "Shape") -> 13.png.
13.png: Shape row: dropdown "Icosphere". Never heard the word, but it must be the ball. Colors untouched.
Next: open the dropdown.

## Step 13 -- shape list
Command: `--step --click-at 1312,332` (combobox) -> 14.png.
14.png: a long list of shapes (Box, Sphere, Cylinder, ... Rhombicuboctahedron ... Star). The word "Cube" isn't there; "Box" has a cube drawing. I'll take Box.
Next: click Box.

## Step 14 -- Box
Command: `--step --click "role=option:Box"` -> 15.png.
15.png: all nodes are now cubes, each still in its group color (yellow, purple, orange, light blue, red, tan, green, pink, dark blue, salmon). Under the Shape row: "Shape: 10 changed  Undo" -- one per group. Legend now "Shape: Louvain -- Box" above "Color: Louvain". Colors in the Fill row are still "«Layer»" with the same swatches.
Next: spot-check one group's own panel (Group 10) to confirm it says Box and kept its color.

## Step 15 -- spot-check Group 10
Command: `--step --click-at 160,536` (treeitem "Group 10, node layer, 9 nodes") -> 16.png.
16.png: Group 10's own panel: "Which nodes 9 of 115 nodes", "Louvain: Group 10, 9 nodes", Shape Box, Fill Color F99379 (the salmon it had). Confirmed for this group; the canvas shows cubes in all ten colors. I stop here -- the facilitator ends the session.

## Wrap-up (Ruth, in character)

**Did I finish?** Yes. College football is open (115 nodes, 613 edges, same as the card). The program's own Louvain grouping colored it in 10 groups (16+15+14+12+11+10+10+9+9+9 = 115, nobody left out). Then all ten groups are cubes ("Box"), each still its own color -- the panel said "Shape: 10 changed" and Group 10 still reads F99379.

**Ease: 6 of 7.** Fifteen-odd clicks, no dead ends. The only stumble was the tool's: two things called "Samples".

**What confused me or slowed me:**
- The Analyze list opens on "Rank nodes and edges"; the "Find groups" section only showed once I typed "cluster". Fine, but I had to know to search.
- Louvain's "Resolution 1" has no plain-words description. I left it alone; I couldn't tell an editor what it does.
- The floating legend ("Color: Louvain") lists groups with no counts. The counts are in the left list once you open the folder -- that saved me a check, but you have to find it.
- "Icosphere" as the name of the default ball, and no "Cube" in the shape list -- "Box" with a cube picture. I guessed right from the picture.
- "«Layer»" in the color field is jargon; the swatches next to it are what told me the colors stay per group.
- I was not sure at first whether the shape set on the folder would override colors; the line "Shape: 10 changed" and the unchanged swatches are what convinced me.
- Good: "Local only" in the title bar and "It never leaves your computer" on the first page. I didn't see anything leaving.
