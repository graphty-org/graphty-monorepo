# Session r3-s48 -- Dev (class-project student), task T13 (Les Miserables)

Task as given: "Earlier today you opened the ready-made network of Les Miserables characters that
comes with this program and had it color the characters by the circles they keep turning up in.
You now need two things for a report: a picture file of the drawing as it looks now, with its key
to the colors, and the numbers the program worked out for each character in a file Excel can open."

Tool: `node design/ui/studio/tool/real.mjs` (run from design/ui/studio), session `S=rounds/round-3/sessions/r3-s48`.

## Start

Command: `--start $S setup:rounds/round-3/setups/T13.txt`

01.png: the Les Miserables network, colored in groups, a color key ("Louvain community" with
numbered swatches) in the lower left of the canvas. A toolbar at the top. Dev: "OK, there's my
colored drawing from earlier and a key. My tutorial says the last step is Preview and Export --
I'll look for Export."

## Step 1

Dev: "Tutorial says export comes last. The three lines in the corner are usually the menu."
Command: `--step $S --click-at 23,20` -> button "Main menu". 02.png: a menu with New project,
Open, Save, Export... (Ctrl+E), Rename, Settings, Help. "Export... -- that's the word I want."

## Step 2

Command: `--step $S --click "Export..."`. 03.png: an Export dialog with two tabs on the left,
Image and Data. Image is open: "A picture of the drawing, 2x, PNG", preset "To share -- PNG, 2x",
View "Current view", sizes, format PNG, background. A small preview shows the drawing with a tiny
box in its top-left corner that looks like the color key. Dev: "Great, PNG is what my teacher
wants, and the preview seems to have the key in the corner. I'll just press Export."

## Step 3

Command: `--step $S --click "Export"` (the tool noted "Export" also matched the dialog's own name
and took the button). A file was saved: `downloads/les-miserables_current-view.png`, 1806 x 1720.
04.png: the dialog closed; a toast "Exported les-miserables_current-view.png".
I opened the PNG: the whole drawing with a white key box in the top-left, "Color: Louvain",
Group 1 to Group 6 with their swatches. Dev: "That's my figure with the key. Half done. Now the
numbers -- the dialog had a Data tab, so I'll go back there."

## Step 4

Command: `--step $S --key Control+e --click "Data"` (Ctrl+E was shown next to Export... in the menu).
05.png: the Data tab: "The whole project: graph, styles, results and layout - Graphty JSON",
Format "Graphty JSON", and a box of code text. Dev hesitates: "That's code, not a spreadsheet.
Excel won't open that. Maybe the Format list has CSV."

## Step 5

Command: `--step $S --click "Format"`. 06.png: a long list of formats -- Graphty JSON, Node-link JSON
(NetworkX), Cytoscape.js JSON, JSON Graph Format, graphology JSON, vis.js JSON, d3 JSON, OBO Graphs
JSON, CSV, Gephi CSV, Neo4j CSV, GraphML, GEXF, GML, DOT, Pajek NET, XGMML, CX2. Dev: "Most of these
mean nothing to me. CSV I know -- Excel opens CSV. There are three CSVs though; I'll take the plain one."

## Step 6

Command: `--step $S --click "CSV"`. 07.png: "One row per edge, with every edge attribute and computed
value - CSV", a Table select set to "Edges", an "Advanced" heading, and a big yellow box "CSV cannot
hold everything" with nine bullets ("node column "style.color" (color) cannot be written", "the generic
dialect has no direction column...", and last: "the edge table has no room for node attributes: 3 node
columns ("name", "results.louvain.group", "results.louvain.groupSize") are written only by a second
export with table: "nodes""). The preview below shows source,target,shared_chapters rows.
Dev, worried: "Whoa, a warning. Did I break something? ... Reading it slowly: most of it is about
colors and positions, which I don't need in Excel. The last line says the group numbers are in a
'nodes' table. The preview is pairs of names, not one row per character. I want characters, so
Table -> Nodes." Hesitation: the warning box is long and in jargon ("dialect", "importer",
"style.thickness"); it took a while to find the one line that matters to me.

## Step 7

Command: `--step $S --click "Table"`. 08.png: options Edges (checked), Nodes, Adjacency List.
Dev: "Nodes = the characters. Picking that."

## Step 8

Command: `--step $S --click "Nodes"`. 09.png: "One row per node, with every computed value - CSV".
The yellow box is still there (eight bullets now). Preview: `id,name,results.louvain.group,
results.louvain.groupSize`, then Napoleon,Napoleon,6,8 / Myriel,Myriel,6,8 / MlleBaptistine,Mlle
Baptistine,1,20 ... Dev: "One row per character, with the group number. The group 6 = 8 people matches
'Group 6 8' in the left list, so this is it. Column names are ugly ('results.louvain.groupSize') -- I'll
rename them in Excel. Still a bit nervous about the yellow 'cannot hold everything' box, but it's
about colors and positions. Export."

## Step 9

Command: `--step $S --click "role=button:Export"`. A file was saved: `downloads/les-miserables_nodes.csv`,
1,956 bytes, 78 lines (a header plus 77 characters, matching "Nodes 77" in the right panel).
10.png: the dialog closed; toast "Exported les-miserables_nodes.csv". First rows of the file:
`id,name,results.louvain.group,results.louvain.groupSize` / `Napoleon,Napoleon,6,8` /
`MlleBaptistine,Mlle Baptistine,1,20`. Dev: "Picture and spreadsheet both in my downloads. Done."

Command: `--end $S`.

## Wrap-up (in character, Dev)

- **Did I finish?** Yes. I have `les-miserables_current-view.png` (the drawing with the "Color: Louvain"
  key in the corner) and `les-miserables_nodes.csv` (one row per character with their group number and
  group size), which Excel opens.
- **How easy?** 5 out of 7. The picture was very easy: menu, Export..., Export, and the key was already
  in the file. The numbers took more thought.
- **What confused me:**
    - The Data tab starts on "Graphty JSON" and shows a wall of code. Nothing on that screen says "for
      Excel, pick CSV"; I knew CSV from class, a classmate might not.
    - The Format list is 18 names long and mostly jargon (NetworkX, Cytoscape.js, OBO Graphs, XGMML,
      CX2). Three different CSVs (CSV, Gephi CSV, Neo4j CSV) and no hint which one is the plain
      spreadsheet one; I guessed the plain "CSV".
    - Picking CSV defaults to "Edges", one row per pair of characters -- not what "numbers for each
      character" means. The only clue that the group numbers live in the Nodes table was the last bullet
      of the yellow warning box, phrased as `table: "nodes"`.
    - The yellow "CSV cannot hold everything" box looked like an error and made me wonder if my export
      was broken. Its bullets use words like "dialect", "importer", "style.thickness"; most of it is
      about things I would never expect in a spreadsheet anyway (colors, positions).
    - Column names in the CSV are program names (`results.louvain.group`, `results.louvain.groupSize`),
      not words I can put in a report table; I would rename them by hand. "Louvain" is never explained,
      and the groups are numbers only.
    - The image dialog was fine; the preview was small, so I only confirmed the key was in the file after
      opening it.
