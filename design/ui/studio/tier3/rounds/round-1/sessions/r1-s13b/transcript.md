# Session r1-s13b -- Grace (nonprofit operations analyst)

Task: open the ready-made Les Miserables network, have the program find the circles of characters who appear together (each circle its own color), then draw every circle's characters as cubes, keeping each circle's color.

## Step 1 -- start
Command: `REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <folder> empty`
Screenshot 01.png: a landing page. "Open a file", "Open network data", "Samples", "New project". A demo graph on the right already colored by community. "It never leaves your computer" -- good.
Next: the task says "ready-made network", so I'll click Samples.

## Step 2 -- Samples
Command: `--step <folder> --click "Samples"` -> refused as ambiguous (a button and a top link share the name), nothing happened (02.png).
## Step 3
Command: `--step <folder> --click-at 455,540` -> button "Samples". 03.png: Sample library. First card: "Who holds the novel together -- Les Miserables -- 77 nodes, 254 edges". Easy to find.
Next: click that card.

## Step 4 -- open Les Miserables
Command: `--step <folder> --click-at 180,470` -> "Open the Les Miserables sample". 04.png: the graph opened, 77 nodes, 254 edges, all one purple. Left: Style layers (Hovered, Selected, Everything). Right: Values. Bottom toolbar with icons, first is a flask. A notice says the browser may clear things; save a copy.
Next: the flask icon looks like "analyze" -- click it.

## Step 5 -- Analyze
Command: `--step <folder> --click-at 615,864` -> button "Analyze". 05.png: a popup list with a filter box, "Rank nodes and edges": Degree, Betweenness, Closeness, PageRank... each with a one-line plain description. Good.
Next: type "group" in the filter to find circles.

## Step 6 -- filter "group"
Command: `--step <folder> --type "group"`. 06.png: "Find groups": Louvain ("Which nodes form densely linked groups."), Leiden, Label propagation, ... Names are jargon but the descriptions help. Louvain is first and its description fits "circles who appear together".
Next: click Louvain.

## Step 7 -- Louvain
Command: `--step <folder> --click-at 600,455` -> option "Louvain". 07.png: a small form: Resolution 1, Weight None, "Under a second", Run button. I don't know what Resolution means; leave defaults.
Next: click Run.

## Step 8 -- Run
Command: `--step <folder> --click "Run"`. 08.png: nodes now colored in 6 groups; a key "Color: Louvain" Group 1..6 with colors. A "Louvain" folder appeared in Style layers. Circles done.
Next: cubes. Click the Louvain layer to see what I can change.

## Step 9 -- Louvain folder
Command: `--step <folder> --click-at 118,216` -> treeitem "Louvain, folder, 6 layers". 09.png: right panel Style for the folder: "6 layers in Louvain. Layers added later are not changed." Node tab, 77 of 77 nodes. Sections Shape (+), Visibility, Text, Fill (Color "<Layer>" with the six swatches), Effects, Rendering.
Next: click the + next to Shape.

## Step 10 -- Add to node shape
Command: `--step <folder> --click-at 1404,298` -> button "Add to node shape". 10.png: menu with "Shape" and "Size".
Next: pick Shape.

## Step 11 -- Shape added
Command: `--step <folder> --click-at 1340,334` -> menuitem "Shape". 11.png: a "Shape" row with a dropdown showing "Icosphere" (an odd word for a ball). Colors unchanged.
Next: open the dropdown and look for Cube.

## Step 12 -- shape list
Command: `--step <folder> --click-at 1312,332` -> combobox. 12.png: a very long list (Box, Sphere, Cylinder, ... Rhombicuboctahedron, Goldberg polyhedron, ...). No item called "Cube". "Box" at the top has a cube-looking icon.
Next: click Box.

## Step 13 -- Box
Command: `--step <folder> --click-at 1237,26` -> option "Box". 13.png: every node is now a cube, and each group kept its color (orange, light blue, green, dark blue, red-orange, pink). Panel says "Shape: 6 changed  Undo". The key now reads "Shape: Louvain -- Box" above "Color: Louvain -- Group 1..6". Task done.

## Wrap-up (in character, Grace)
- Did I finish? Yes. Les Miserables opened (77 nodes, 254 edges -- matches the card), six circles found and colored, and all of them turned into cubes with their colors kept.
- Ease: 6 out of 7. About ten clicks, no errors, nothing uploaded ("Local only" and "It never leaves your computer" both reassured me).
- What confused me:
  - On the first page "Samples" is both a big button and a top link; fine for me, but two with the same name.
  - The analysis names are jargon (Louvain, Leiden, Girvan-Newman). I only found the right one because I typed "group" and read the one-line description. I could not put "Louvain" on a slide; the key says "Color: Louvain" and "Group 1..6" -- I'd want to rename it "Circles".
  - "Resolution" on the Louvain form meant nothing to me; I left it alone.
  - The shape list is huge and has no "Cube" -- I had to guess that "Box" is a cube from its tiny icon. The default ball is called "Icosphere", another word I'd never use.
  - It was not obvious at first that clicking the Louvain folder, not a single group, would change all six at once; the line "6 layers in Louvain. Layers added later are not changed." helped once I saw it.
