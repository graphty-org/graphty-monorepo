# Session r1-s23 transcript (Ruth, reporter)

Task: open volunteers.graphml, color the shift circles (communities), keep color only for people with food-safety training, report how many still have a circle's color.

## Step 1 -- start
Command: real.mjs --start <folder> empty -> 01.png
Notes: Landing page. "Open a file" button, and a line "It never leaves your computer." Good -- I note that. A demo graph on the right already shows "Communities". I'll open my file.

## Step 2 -- open the file
Command: --step --click "Open a file" --upload volunteers.graphml -> 02.png
Notes: A preview: "volunteers: 24 nodes, 63 edges", and at the bottom "24 node rows and 63 edge rows read; the load makes 24 nodes and 63 edges." Nothing dropped -- that is the check I want. Columns: name, role, hours, trained (yes/no), phone. The "trained" column is my food-safety training, I assume. I press Load.

## Step 3 -- Load
Command: --step --click "Load" -> 03.png
Notes: Graph shows. Right panel: Nodes 24, Edges 63, Components 1. Matches the preview. All dots are the same blue-purple -- that's how they look "when the file first opened"; I write that down. I see three clumps by eye. Bottom toolbar has a flask icon -- maybe analysis. I'll hover it first.

## Step 4 -- hover flask
Command: --step --hover-at 615,864 -> 04.png
Notes: Tooltip "Analyze". I click it.

## Step 5 -- Analyze
Command: --step --click "Analyze" -> 05.png
Notes: A list of analyses with one-line descriptions: Degree, Betweenness, Closeness... all "Rank nodes and edges". I want circles of people, i.e. groups. There's a "Filter analyses" box with focus; I type "group".

## Step 6 -- type "group"
Command: --step --type "group" -> 06.png
Notes: "Find groups": Louvain "Which nodes form densely linked groups." That's the words that match "circles of people who do shifts together" -- they're linked because they share shifts. Leiden sounds similar. I pick the first, Louvain.

## Step 7 -- Louvain
Command: --step --click "Louvain" -> 07.png
Notes: Settings: Resolution 1, Weight None, "Under a second", Run. Defaults are fine for me; I don't know what resolution means. Run.

## Step 8 -- Run
Command: --step --click "Run" -> 08.png
Notes: Three groups, each its own color (orange, blue, green), a legend "Color: Louvain" Group 1-3. A new style layer "Louvain" appeared in the left list. Now: only trained people keep the color. I'd guess the Louvain layer can be limited to certain nodes. I click the Louvain layer.

## Step 9 -- click Louvain layer
Command: --step --click-at 118,216 -> 09.png
Notes: Right panel for the Louvain folder: "Which nodes ... 24 of 24 nodes", Fill Color <<Layer>>. "Which nodes" is exactly where I'd limit it to trained people. I open "Which nodes".

## Step 10 -- Which nodes
Command: --step --click "Which nodes" -> 10.png
Notes: "Nodes that pass every condition", one condition (Louvain, Group 1-3), and "Add a condition". I add one for trained = yes.

## Step 11 -- Add a condition
Command: --step --click "Add a condition" -> 11.png
Notes: A list of attributes: name, role, hours, trained (2 values), phone. I pick "trained".

## Step 12 -- pick "trained"
Command: --step --click-at 1275,539 -> 12.png
Notes: The condition "trained = Yes" was added straight away ("15 nodes"). "Which nodes: 15 of 24 nodes", and the legend now says "15 of 24 nodes". The untrained ones went back to the same blue-purple as when the file opened. I press Done.

## Step 13 -- Done
Command: --step --click "Done" -> 13.png
Notes: The layer now reads "Louvain: <<Layer>>" and "trained: yes, 15 nodes", "15 of 24 nodes". The legend says "15 of 24 nodes". I count by eye on the picture: orange 5, blue 5, green 5 (one green partly hidden behind the legend box at top left, so I counted 4 clearly and one partly). That agrees with 15. The other 9 are the same blue-purple as at load time. In the preview table at load I saw "No" for v04, v06, v08, v12, v13 among the first 14 rows -- consistent with 9 untrained out of 24, though I didn't see all 24 rows so I can't fully confirm from the table.

## End (in character)
- Finished: yes. 15 people still have a circle's color (the screen says "15 of 24 nodes"; my eye count of the picture agrees).
- Ease: 6 out of 7.
- What confused me / notes:
  - "Louvain" means nothing to me; the one-line description "Which nodes form densely linked groups" is what made me pick it. I don't know what "Resolution" does; I left it.
  - Choosing "trained" applied "Yes" straight away without me choosing a value. Convenient, but I'd have liked to confirm Yes was the value it picked before it changed the picture -- I only saw it after.
  - The legend box covers a node at the top left, which made my eye count harder.
  - I assumed "trained" is the food-safety training; the file doesn't say so on screen. I can't confirm that from the program.
  - Good: the import told me 24 node rows read and 24 made, nothing dropped, and "never leaves your computer" was stated up front.
