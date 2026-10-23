# Session r1-s14 -- Nadia (L1 alert reviewer), first time

Task: open the ready-made college football network, have the program find its own clusters (each a color, not the file's conferences), then draw every cluster's teams as cubes while keeping the colors.

## Step 1 -- start
Command: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 REAL_TIER=3 node .../real.mjs --start <session> empty
Note: waiting for a browser slot.
Result: 01.png -- landing page with a spinning colored sample graph ("Colored by community: 6 groups"), Open a file, Open network data, Samples, New project.

## Step 2
Thinking: "Ready-made network" -- that's the Samples button.
Command: --step --click "role=button:Samples"
Result: 02.png -- Sample library. Third card: "Conferences fall out of who played whom -- College football, 115 nodes, 613 edges". That's it.

## Step 3
Thinking: Click the college football card.
Command: --step --click-at 712,410
Result: 03.png -- College football open: 115 blue balls, all one color. Left: style layers (Hovered, Selected, Everything). Right: Graph Values (115 nodes, 613 edges). Bottom toolbar with icons (flask, chart, 3D, list, table, filter, search).

## Step 4
Thinking: "All one color, fine. Figuring out clusters sounds like analysis. The flask icon at the bottom looks like 'analyze' -- I'll try that."
Command: --step --click-at 615,864
Result: 04.png -- "Analyze" list opened with a "Filter analyses" box: Degree, Betweenness, Closeness, PageRank... long list, ranking stuff.

## Step 5
Thinking: "Lots of ranking. I want clusters -- I'll type it in the filter box like I paste into any search."
Command: --step --type "cluster"
Result: 05.png -- "Clustering coefficient" (rank) highlighted, then a "Find groups" section: Louvain "Which nodes form densely linked groups", Leiden, Label propagation, Markov, Spectral, Hierarchical.

## Step 6
Thinking: "Clustering coefficient is a ranking, not groups. 'Find groups' is what I want. Louvain says 'which nodes form densely linked groups' -- teams that play each other a lot. I'll take the first one."
Command: --step --click-at 485,516
Result: 06.png -- Louvain panel: Resolution 1, Weight None, a small gear icon, "Under a second", Run button.

## Step 7
Thinking: "Resolution, weight -- no idea, leave the defaults. Run."
Command: --step --click "Run"
Result: 07.png -- Balls now colored, a legend "Color: Louvain" with Group 1 to Group 10. A new "Louvain" folder row appeared in Style layers, between Selected and Everything. Layout did not move, so groups are scattered colors, but the colors are there.

## Step 8
Thinking: "Ten groups, each a color. Good -- that took under a minute. Now cubes. Nothing here says 'shape'. The new 'Louvain' row on the left is what made the colors, so I'll open it."
Command: --step --click "Louvain"
Result: 08.png -- Right panel switched to "Louvain, Folder", Style tab: "10 layers in Louvain. Layers added later are not changed." Node: Style nodes checked, 115 of 115 nodes. Sections Shape +, Visibility +, Text +, Fill (Color <<Layer>> with ten swatches), Effects, Rendering.

## Step 9
Thinking: "Shape is right there with a plus. This folder holds all ten groups, so setting the shape here should hit every group. Fill says <<Layer>>, so hopefully each group keeps its own color. I'll press the plus next to Shape."
Command: --step --click-at 1404,298
Result: 09.png -- small menu: Shape / Size.

## Step 10
Thinking: "Shape."
Command: --step --click-at 1340,334
Result: 10.png -- a Shape row appeared: "Shape [Icosphere v]". Balls unchanged.

## Step 11
Thinking: "Icosphere -- a ball, I guess. Open the dropdown and look for a cube."
Command: --step --click-at 1312,332
Result: 11.png -- long shape list: Box, Sphere, Cylinder, Cone, ... no word "Cube". (Pentagonal prism highlighted under the pointer.)

## Step 12
Thinking: "No 'cube'. 'Box' at the top has a cube icon -- that's a cube to me. Picking Box."
Command: --step --click "role=option:Box"
Result: 12.png -- every node is now a cube, and each still has its group color (yellow, purple, orange, light blue, red, tan, green, pink, dark blue, salmon). Under the Shape row: "Shape: 10 changed  Undo". The legend now shows "Shape: Louvain -- Box" above "Color: Louvain -- Group 1..." with "3 more below".

Stopping here: task done. Not running --end; the facilitator ends the session.

## Wrap-up (in character, Nadia)

Did I finish? Yes. Opened College football from Samples, ran Louvain under Analyze ("Find groups") which colored 10 groups, then on the Louvain folder in the left panel added Shape and picked Box. All 115 teams are cubes and the ten colors stayed put.

Ease: 6 of 7. About eleven clicks, well under the five-to-ten minutes I give anything.

What confused me or slowed me down:
- The analysis list is long and starts with ranking stuff (Degree, Betweenness...). I only found the grouping ones because I typed "cluster" -- and the first hit was "Clustering coefficient", which is a ranking, not clusters. The "Find groups" heading saved me.
- Louvain, Leiden, Label propagation, Markov... I picked Louvain because it was first and its line said "densely linked groups". I have no idea whether another one would give a different answer, and nothing told me which to use. QA would ask "why this method?" and I couldn't say.
- Resolution and Weight on the Louvain panel meant nothing to me; I left the defaults.
- After the run the balls only changed color -- they didn't move together, so the "clusters" are scattered colors across the picture. I can't actually see a cluster as a lump. For a screenshot in a file that's weak.
- Nowhere says "cube". I had to guess that "Box" is a cube from its little icon. Fine once I saw it, but I searched for the word first.
- It wasn't obvious that clicking the "Louvain" row on the left would let me change shape for all groups at once. The line "10 layers in Louvain. Layers added later are not changed" and then "Shape: 10 changed" reassured me it hit all ten.
- I'm not sure whether choosing Box changed the data or only the picture. "Undo" next to it suggests just the look, but it doesn't say.
- The legend box in the top-left covers part of the drawing.
