# Session r3-s49 -- Alex (analyst), task T13: a picture and the numbers for a report

Dataset: Les Miserables sample, Louvain already run (setup:rounds/round-3/setups/T13.txt).

## Start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s49 setup:rounds/round-3/setups/T13.txt`

Screen 01.png: the Les Miserables drawing, colored in six groups. A color key "Color: Louvain"
floats over the top left of the canvas (Group 1 to Group 6). Left panel lists Louvain with group
counts (20, 17, 11, 11, 10, 8). Right panel shows 77 nodes, 254 edges. Top bar: a menu icon,
"Les Miserables", undo/redo, a lock, "Local only".

Alex: "OK, the colors are there and there's a key. 77 and 254 -- fine. Now I need to get this out.
No 'Export' button anywhere I can see. The hamburger at top left is where File usually lives.
Trying that."

## Step 1 -- open the main menu

Command: `--click-at 23,20` (button "Main menu") -> 02.png

Saw: a File-style menu: Back to start, New project, Open project or file, Open sample, Save,
Save as, Save local copy, Export... (Ctrl+E), Rename, Settings, Keyboard shortcuts, Help.

Alex: "Export, Ctrl+E. Good, that's where it should be. Clicking it."

## Step 2 -- Export...

Command: `--click "Export..."` -> 03.png

Saw: an Export dialog with two sections on the left, Image and Data. Image is selected: "A picture
of the drawing, 2x, PNG", Preset "To share -- PNG, 2x", View "Current view", Size 1x/2x/4x/400x300,
Format PNG/JPEG/WebP, Background Canvas color/Transparent. A small preview; in its top left corner
there is a tiny box that looks like the color key. Footer: "Saved to this computer only; nothing
is uploaded." Buttons Cancel, Copy, Export.

Alex: "'Nothing is uploaded' -- good, that's the line I look for. The preview seems to have the
key in the corner, though it's so small I can't read it. No SVG, which is what I'd normally paste
into slides, but PNG at 2x will do. Exporting as-is, then I'll check the file."
Hesitation: brief -- wanted to confirm the key is in the picture before trusting it.

## Step 3 -- Export the image

Command: `--click "Export"` -> 04.png (tool note: "Export" matched the button and the dialog; it
took the button). Download: les-miserables_current-view.png, 1806 x 1720.

Saw: the dialog closed and a toast "Exported les-miserables_current-view.png". Opened the file:
the drawing as it looked on screen, with a white key box in the top left, "Color: Louvain",
Group 1 to Group 6 with color swatches, readable at full size.

Alex: "That's the picture, key included. Fine for a slide. The groups are just 'Group 1..6' --
I'll have to rename them in the deck myself, but that's what I expected. Orange and the
gold-ish yellow are close-ish but I can tell them apart. Now the numbers. Back into Export, the
dialog had a 'Data' section."

## Step 4 -- Ctrl+E, Data

Command: `--key Control+e --click "Data"` -> 05.png

Saw: Data section. "The whole project: graph, styles, results and layout - Graphty JSON". Format
dropdown says "Graphty JSON". The preview is raw JSON text.

Alex: "JSON. Nobody on my team opens JSON. I need a CSV. Let me see what else is in that Format
dropdown."
Hesitation: the default is a project file, not a table; not what I asked for.

## Step 5 -- Format dropdown

Command: `--click "Format"` -> 06.png

Saw: a long list: Graphty JSON, Node-link JSON (NetworkX), Cytoscape.js JSON, JSON Graph Format,
graphology JSON, vis.js JSON, d3 JSON, OBO Graphs JSON, CSV, Gephi CSV, Neo4j CSV, GraphML, GEXF,
GML, DOT, Pajek NET, XGMML, CX2.

Alex: "That's a lot of formats. Three CSVs: plain CSV, Gephi CSV, Neo4j CSV. None of them says
'nodes table' or 'the numbers'. Gephi CSV in my experience is an edge list, which is exactly the
wrong table. I'll try plain CSV and look at the preview before I export."
Hesitation: unsure which CSV holds per-character values versus the links.

## Step 6 -- choose CSV

Command: `--click "CSV"` -> 07.png

Saw: "One row per edge, with every edge attribute and computed value - CSV". A new "Table"
dropdown set to "Edges". An "Advanced" label. A big yellow box "CSV cannot hold everything" with
nine bullets about positions, style.color, style.size, style.shape, edge thickness, graph
attributes, direction, and the last one: node columns "name", "results.louvain.group",
"results.louvain.groupSize" "are written only by a second export with table: "nodes"". Preview:
source,target,shared_chapters.

Alex: "There it is -- the edges table again, the exact Gephi thing that bit me. At least it says
so, and the preview shows source,target. The warning box is a wall of developer-speak --
'style.color', 'generic dialect' -- I skimmed it; the only line that mattered was the last one
telling me the group numbers are in the nodes table. Switching Table to Nodes."
Hesitation: default table is the wrong one for 'numbers for each character'; had to read the
warning box to be sure.

## Step 7 -- Table dropdown

Command: `--click "Table"` -> 08.png

Saw: Edges (checked), Nodes, Adjacency List.

Alex: "Nodes."

## Step 8 -- Nodes table

Command: `--click "Nodes"` -> 09.png

Saw: "One row per node, with every computed value - CSV". Preview:
id,name,results.louvain.group,results.louvain.groupSize -- Napoleon,Napoleon,6,8; Myriel,Myriel,6,8;
MlleBaptistine,Mlle Baptistine,1,20; ... The yellow warning box is still there (positions and
colors cannot be written, etc.).

Alex: "Right, one row per character, the group number and how big that group is. Column names
like 'results.louvain.group' are ugly but I'll rename them in Excel. Group sizes 8 and 20 match
the counts in the left panel, so 'group 6' here is the same 'Group 6' in the key -- I think.
The warning box still says colors can't be written; I don't need colors in the CSV, fine.
Exporting."

## Step 9 -- Export the nodes CSV

Commands:
- `--click "button=Export"` -> miss: `nothing on screen is called "button=Export"` (my own wrong
  name syntax in the tool, not the app).
- `--click "role=button:Export"` -> 10.png; no file was saved and the screen did not change
  (dialog still open). Unclear why; tool-side, not something Alex would see.
- `--click-at 1057,746` (button "Export") -> 11.png. Download: les-miserables_nodes.csv, 1,956 bytes.

Saw: the dialog closed, back to the drawing (no toast visible in this screenshot). Checked the
file: 77 rows plus a header, columns id, name, results.louvain.group, results.louvain.groupSize.
Group counts in the file are 20, 17, 11, 11, 10, 8 -- the same as the left panel and the key.

Alex: "77 rows, same as the node count. Group sizes match the panel. That opens straight in
Excel. Done."

Command: `--end rounds/round-3/sessions/r3-s49`

## Wrap-up (in character)

**Did you finish?** Yes. I have les-miserables_current-view.png (the drawing with its color key in
the corner) and les-miserables_nodes.csv (one row per character with the community group and group
size).

**Ease: 5 out of 7.** The picture was easy: menu, Export, Export, and the key came along without
my asking -- that's better than Gephi, where I screenshot and paste a legend separately. The data
half is where I slowed down.

**What confused me or slowed me down:**
- The Data section opens on "Graphty JSON", a project file. When I ask for "the numbers" I want a
  table, and a table is not the default.
- Three CSV choices (CSV, Gephi CSV, Neo4j CSV) and none says which one is the per-character
  table. I guessed plain CSV.
- Plain CSV then defaulted to the Edges table -- source, target, shared chapters. That is the exact
  trap I've been burned by before (asked for nodes, got edges). It did say so in the description
  and the preview, which is the only reason I caught it.
- The yellow "CSV cannot hold everything" box is a wall of nine bullets in developer-speak
  ("style.color", "generic dialect", "table: "nodes""). The one line I needed -- the group numbers
  are in the nodes table -- was the last bullet, buried. On the Nodes table the box stays up,
  warning me about colors and positions I never wanted in a spreadsheet; it made me wonder whether
  something was missing.
- Column headers in the CSV are "results.louvain.group" and "results.louvain.groupSize". I'll
  rename them for the report.
- The groups are only "Group 1..6" in both the key and the file; I have to name them myself
  (expected). I matched "6" in the file to "Group 6" in the key by the group sizes, not because
  anything told me they are the same numbering.
- No SVG option for the picture; PNG at 2x is fine for slides.
- Good: "Saved to this computer only; nothing is uploaded" right on the export dialog.
