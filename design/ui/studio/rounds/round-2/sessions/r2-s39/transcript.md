# Session r2-s39 -- Ruth (data journalist), task T13: a picture and the numbers for a report

Dataset: Les Miserables sample, set up with Louvain already run.
Tool: design/ui/studio/tool/real.mjs (run from design/ui/studio). S=rounds/round-2/sessions/r2-s39

## Step 1 -- start

Command: `node tool/real.mjs --start $S setup:rounds/round-2/setups/T13.txt`
Screenshot: 01.png
Saw: The Les Miserables drawing, colored in six groups. A floating key on the canvas, "Color: Communities", Group 1 to Group 6. On the left a list: Communities 6, with Group 1 (20), Group 2 (17), Group 3 (11), Group 4 (11), Group 5 (10), Group 6 (8). Right panel: Nodes 77, Edges 254. 20+17+11+11+10+8 = 77, so every character is in a group. Good.
Next: I need a picture file and a table. No "Export" button in sight. The menu at top left (three lines) is where programs keep "Export" or "Save as". I'll try that.

## Step 2 -- main menu

Command: `--step $S --click-at 23,20`
Screenshot: 02.png
Saw: A menu: Back to start, New project, Open project or file, Open sample, Save, Save as, Save local copy, Export... (Ctrl+E), Rename, Settings, Keyboard shortcuts, Help. "Export..." is what I want.
Next: click "Export...".

## Step 3 -- Export dialog

Command: `--step $S --click "Export..."`
Screenshot: 03.png
Saw: An Export dialog with two sides, Image and Data. Image is chosen: "A picture of the drawing, 2x, PNG", preset "To share -- PNG, 2x", View "Current view", size 1x/2x/4x/400x300, PNG/JPEG/WebP, background canvas color or transparent. The preview shows the drawing with a small key in its top-left corner -- the key is tiny in the preview, I can't read it at that size. Footer: "Saved to this computer only; nothing is uploaded." Good, that is the first thing I wanted to know.
Next: the defaults look right for an editor. Press Export and look at what I get.

## Step 4 -- export the picture

Command: `--step $S --click "Export"` (the tool noted the name also matched the dialog; it took the button)
Screenshot: 04.png; file downloads/les-miserables_current-view.png, 1806 x 1720
Saw: The dialog closed, a note "Exported les-miserables_current-view.png". I opened the file: same drawing as the screen, same six colors, and the key "Color: Communities, Group 1 ... Group 6" in a white box top left, readable. The picture and the screen agree. It has no names on the dots, but neither does the screen, so that is "as it looks now". Picture part: done.
Hesitation: the key on screen is a dark box, in the file a white box; same contents, so fine.
Next: the numbers. Back to Export, the "Data" side this time.

## Step 5 -- reopen Export (Ctrl+E)

Command: `--step $S --key Control+e`
Screenshot: 05.png -- the Export dialog again, on Image.

## Step 6 -- Data side

Command: `--step $S --click "Data"`
Screenshot: 06.png
Saw: "Data -- The whole project: graph, styles, results and layout - Graphty JSON". Format: Graphty JSON, with a preview of raw JSON. Excel will not open that. I need a spreadsheet kind of file, CSV.
Next: open the Format list and look for CSV.

## Step 7 -- Format list

Command: `--step $S --click "Format"`
Screenshot: 07.png
Saw: A long list: Graphty JSON, Node-link JSON (NetworkX), Cytoscape.js JSON, JSON Graph Format, graphology JSON, vis.js JSON, d3 JSON, OBO Graphs JSON, CSV, Gephi CSV, Neo4j CSV, GraphML, GEXF, GML, DOT, Pajek NET, XGMML, CX2. Most of these names mean nothing to me. Three CSVs; plain "CSV" is the one Excel opens. I don't know whether it is a list of characters or a list of ties -- nothing says.
Next: pick "CSV" and read what the dialog says about it.

## Step 8 -- CSV chosen

Command: `--step $S --click "CSV"`
Screenshot: 08.png
Saw: "One row per edge, with every edge attribute and computed value - CSV". A second box, "Table: Edges". A yellow warning "CSV cannot hold everything" with a list in programmer language: "style.color cannot be written", "the generic dialect has no direction column ... unless the importer is told otherwise". Most of that is not for me. But the last line answers my question: the edge table has no room for the per-character columns ("name", "results.louvain.group", "results.louvain.groupSize"), they are written "only by a second export with table: nodes". The preview shows source,target,shared_chapters -- ties, not characters.
Hesitation: the default is the wrong table for "numbers for each character", and I only learned that by reading a warning written for programmers.
Next: set Table to Nodes.

## Step 9 -- Table list

Command: `--step $S --click "Table"`
Screenshot: 09.png
Saw: Edges (checked), Nodes, Adjacency List. "Nodes" must be the characters.
Next: click "Nodes".

## Step 10 -- Nodes table

Command: `--step $S --click "Nodes"`
Screenshot: 10.png
Saw: "One row per node, with every computed value - CSV". Preview: id,name,results.louvain.group,results.louvain.groupSize. Napoleon,Napoleon,6,8; Myriel 6,8; Mlle Baptistine 1,20; Mme Magloire 1,20; Countess de Lo 6,8. I checked: the screen says Group 6 has 8 and Group 1 has 20, so the group number and the size agree with the list on the left. The column names are programmer names ("results.louvain.group"), but I can work out what they are. Same warning box, minus the line about node columns.
Next: Export.

## Step 11 -- Export (first try missed)

Command: `--step $S --click "button=Export"` -- a tool spelling mistake on my part ("nothing on screen is called ..."); nothing happened. Screenshot 11.png, unchanged.

## Step 12 -- Export the characters table

Command: `--step $S --click "role=button:Export"`
Screenshot: 12.png; file downloads/les-miserables_nodes.csv, 1,956 bytes
Saw: Dialog closed, note "Exported les-miserables_nodes.csv". I opened the file: a header plus 77 rows -- 77 characters, same as "Nodes 77" on screen. Counting the group column: 20 in group 1, 17 in 2, 11 in 3, 11 in 4, 10 in 5, 8 in 6 -- exactly the counts in the list on the left. Nothing dropped. Numbers part: done.

## End

Command: `node tool/real.mjs --end $S`

## In character, at the end

Did I finish? Yes. I have les-miserables_current-view.png (the drawing as on screen, with the color key "Color: Communities, Group 1-6") and les-miserables_nodes.csv (one row per character, with the group number and group size), which Excel will open. I checked both against the screen: the picture matches, and the table's 77 rows and group counts match the left-hand list.

How easy: 5 of 7.

What went well: "Export..." was where I expected in the menu, with a Ctrl+E shortcut. The image side worked on its defaults and the preview showed the key. "Saved to this computer only; nothing is uploaded" answered my privacy question before I asked it.

What confused me or slowed me down:

- The Data side opens on "Graphty JSON", which I cannot use. I had to choose a format from 18 names, most of which mean nothing to me (graphology, OBO, CX2, XGMML...). Three kinds of CSV, and nothing said which is the plain spreadsheet one.
- Choosing "CSV" gave me the ties table (Edges) first. I only learned that the per-character numbers needed the "Nodes" table from the last line of a yellow warning box. "Numbers for each character" should not be the second export.
- The warning box is written for programmers: "style.color", "the generic dialect has no direction column", "unless the importer is told otherwise". It made me wonder whether I was about to lose something important. In the end, nothing I needed was missing.
- The column headings are programmer names: "results.louvain.group", "results.louvain.groupSize". I would have to rename them before a fact-checker sees the file, and "louvain" is not a word the screen used anywhere -- the screen called them "Communities" and "Group N". I can match them only because the counts agree.
- "The numbers the program worked out" turned out to be just the group and its size. If the program had worked out anything else, I would not know from this dialog whether it was included.
- Small: the key on screen is a dark box, in the picture file a white box. Same contents, so I can live with it.
