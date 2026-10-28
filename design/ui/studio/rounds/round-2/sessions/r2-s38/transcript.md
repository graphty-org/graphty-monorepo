# Session r2-s38 -- Dana Okafor (supply chain risk analyst), task T13

Task: picture file of the drawing as it looks now, with its color key, plus the per-character numbers in a file Excel can open.

## Step 1 -- start

Command: `node design/ui/studio/tool/real.mjs --start design/ui/studio/rounds/round-2/sessions/r2-s38 setup:design/ui/studio/rounds/round-2/setups/T13.txt`
Saw (01.png): Les Miserables drawing, colored by six "Groups". A small key box "Color: Communities, Group 1..6" sits over the top-left of the drawing. Left list repeats Communities with counts (20, 17, 11, 11, 10, 8). Right panel: Overview, 77 nodes, 254 edges. Bottom toolbar of icons. No obvious "Export" button.
Dana: "OK, the key is there, good. Now where's export? Nothing says Export. I'll try the menu at the top left -- that's usually File."

## Step 2 -- open main menu

Command: `--step --click-at 23,20` (button "Main menu")
Saw (02.png): a File-style menu: New project, Open, Save, Save as, Save local copy, Export... (Ctrl+E), Rename, Settings, Help.
Dana: "Export. There it is. Clicking it."

## Step 3 -- Export dialog

Command: `--step --click "Export..."`
Saw (03.png): Export dialog with two tabs on the left, Image and Data. Image is selected: PNG 2x, "Current view", size and background buttons, and a preview. The preview has a tiny box in its top-left corner that looks like the color key, but it is very small -- I can't read it at this size. Footer line: "Saved to this computer only; nothing is uploaded." -- that's the sentence IT will want to hear.
Dana: "Defaults look fine for a slide. Export the image first, then I'll do the Data tab."

## Step 4 -- export the image

Command: `--step --click "Export"` (tool noted the name was ambiguous with the dialog itself; it took the button)
Saw (04.png): toast "Exported les-miserables_current-view.png". The file (downloads/les-miserables_current-view.png, 1806 x 1720) shows the whole drawing with a white key box top-left: "Color: Communities", Group 1 to 6 with color squares. Readable, good size for a slide. Colors match the screen.
Dana: "Picture part is done. 'Group 1' to 'Group 6' means nothing to a VP, but it matches what's on screen. Now the numbers -- back into Export, Data tab."
PART 1 (picture with key) DONE.

## Step 5 -- Data tab

Command: `--step --key Control+e --click "Data"`
Saw (05.png): Data tab, Format "Graphty JSON", a preview of code-looking text. "The whole project ... Graphty JSON". Not something Excel opens.
Dana: "That's code, not a spreadsheet. Let me open the Format list and look for CSV or Excel."

## Step 6 -- Format list

Command: `--step --click "Format"`
Saw (06.png): a long list -- lots of JSON flavors I've never heard of, then CSV, Gephi CSV, Neo4j CSV, GraphML, GEXF, GML, DOT, Pajek, XGMML, CX2. No "Excel".
Dana: "Too many choices, but plain 'CSV' is what Excel opens. Picking CSV."

## Step 7 -- CSV chosen

Command: `--step --click "CSV"`
Saw (07.png): a second dropdown "Table: Edges", a big mustard warning box "CSV cannot hold everything" with nine bullets full of "style.color", "dialect", "importer". Preview: source,target,shared_chapters -- pairs of characters, not one row per character.
Hesitated: the warning box is alarming. I read the heading and skipped the bullets ("I don't care about style.size, I want the numbers"). The preview is pairs, not characters, so it's the wrong table.
Dana: "I want one row per character. 'Table: Edges' -- whatever an edge is, that's not it. Let me open Table."

## Step 8 -- Table list

Command: `--step --click "Table"`
Saw (08.png): Edges, Nodes, Adjacency List.
Dana: "None of these say 'characters'. The overview panel says 77 nodes and there are 77 characters, so 'Nodes' must be the characters. Trying Nodes."

## Step 9 -- Nodes table

Command: `--step --click "Nodes"`
Saw (09.png): "One row per node, with every computed value - CSV". Preview: id, name, results.louvain.group, results.louvain.groupSize; Napoleon 6, 8; Myriel 6, 8; Mlle Baptistine 1, 20 ... The warning box is still there, shorter.
Dana: "That's my table: one row per character, their group and the group size. Group 1 = 20 matches the 20 in the left list, so the numbers agree with the picture. The headers are ugly ('results.louvain.group' -- what's louvain?) but I can rename columns in Excel. The warning still sits there yellow -- it's about colors and positions, not my numbers, I think. Export."

## Step 10 -- export the character table

Command: `--step --click "role=button:Export"`
Saw (10.png): toast "Exported les-miserables_nodes.csv". File: 77 rows plus a header, columns id, name, results.louvain.group, results.louvain.groupSize. Counts per group are 20, 17, 11, 11, 10, 8 -- the same as the list on the left of the screen.
PART 2 (numbers in a file Excel can open) DONE.

## End

Command: `node design/ui/studio/tool/real.mjs --end design/ui/studio/rounds/round-2/sessions/r2-s38`

## Wrap-up, in character (Dana)

- Did I finish? Yes. A PNG of the drawing with the color key in the corner, and a CSV with one row per character and its group.
- Ease: 5 out of 7.
- What went well: Export was in the menu where File > Export would be, and the picture came out with a readable key, bigger and clearer than the one on screen. "Saved to this computer only; nothing is uploaded" is exactly what I need to tell IT.
- What confused me or slowed me down:
    - The Data tab opens on "Graphty JSON", which is code. I had to know that CSV is what Excel wants; nothing says "Excel" or "spreadsheet" in a list of about twenty formats, most of them names I've never heard of.
    - After picking CSV it defaults to "Edges" -- pairs of characters. I wanted one row per character. I only guessed "Nodes" because the overview said 77 nodes and I knew there were 77 characters. "Characters" or "one row per item" would have saved the guess.
    - The big yellow "CSV cannot hold everything" box with nine technical bullets made me nervous that my numbers would be lost. It's about colors and positions, which I don't need in Excel, but I had to read it to find that out. The one useful bullet (that the group numbers only come with the Nodes table) was buried at the bottom of the Edges version.
    - Column headers "results.louvain.group" -- I don't know what "louvain" is. I'll rename it "Group" in Excel. The picture calls them "Communities" and "Group 1..6", the file calls them "results.louvain.group" -- different words for the same thing.
    - On screen the key box covers the top-left of the drawing; in the exported picture it doesn't, which is fine, but the picture is framed a little differently from the screen.
- Would I use it? For a one-off slide, yes. For my own supplier data it would come down to whether IT signs off and whether the CSV goes into Power BI cleanly -- the CSV looks like it would.
