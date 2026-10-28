# Session r1-s08 (Maren)

## Step 1
Command: --start empty
Saw (01.png): a landing page, "Analyze any network", a spinning 3D demo network on the right. Big green "Open a file" button that lists GraphML. Fine -- I do have a GraphML file today. "It never leaves your computer" -- good, my PI would ask.

## Step 2
Maren: "Open a file, says GraphML. Let's give it the yeast file."
Command: --step --click "Open a file" --upload yeast-galactose.graphml
Saw (02.png): an import preview, "Open as a new graph". It says 331 nodes, 361 edges, and the footer says "331 node rows and 361 edge rows read; the load makes 331 nodes and 361 edges". Columns id (ORF names), name (gene symbols like GCN3), gal1RGexp, gal4RGexp, gal80Rexp as numbers. Nothing dropped. That is exactly the count I always want and never get in Cytoscape.

## Step 3
Maren: "Counts match, nothing lost. Load."
Command: --step --click "Load"
Saw (03.png): the network is drawn, flat-looking, blue dots, no labels. Right panel says 331 nodes, 361 edges, 26 components, largest 249 nodes -- nice, I'd have to run Network Analyzer for that. Left: "Style layers" with Hovered, Selected, Everything and a + button, plus a "Find nodes, edges, values" box. In Cytoscape I'd do a column filter "name contains GAL" then a bypass colour. I'll try the find box first to see how many GAL genes there are.

## Step 4
Maren: "Let's search GAL and see what it finds."
Command: --step --click "Find nodes, edges, values" --type "GAL"
Saw (04.png): "Nodes 8": GAL10, GAL11, GAL1, GAL2, GAL4, GAL7, GAL80, GAL3, each with its ORF. All eight begin with GAL. Good, a count. Below are "Values" suggestions like "name is GAL10 (1)". Now I need to colour them. The Style layers list has a + button; I'll guess that makes a new style, like a new mapping in Cytoscape.

## Step 5
Maren: "Eight. Now the + by Style layers to make a purple style."
Command: --step --click-at 276,705
Saw (05.png): my click only closed the search list; the Style layers panel jumped back up to the top and the + moved. Nothing added. Mild annoyance -- the button moved under my pointer.

## Step 6
Maren: "It jumped. Click the + again, it's called 'Add a layer or a folder'."
Command: --step --click "Add a layer or a folder"
Saw (06.png): a small menu: Layer, Folder, Select layers..., Analyze... "Layer" is the obvious one.

## Step 7
Maren: "Layer."
Command: --step --click "Layer"
Saw (07.png): a new "Layer 1" with its name selected for editing, applying to 331 nodes. Right panel: "Which nodes -- All 331 nodes: add a condition to narrow", then Shape, Visibility, Text, Fill... So: name it, narrow it to GAL, then Fill purple. That's like a Cytoscape filter plus bypass, in one place.

## Step 8
Maren: "Name it GAL pathway."
Command: --step --type "GAL pathway" --key Enter
Saw (08.png): layer renamed "GAL pathway", still 331 nodes. Now narrow it: "Which nodes" has a little arrow.

## Step 9
Maren: "Open 'Which nodes' to add the condition."
Command: --step --click "Which nodes"
Saw (09.png): "Which nodes -- Nodes that pass every condition", "+ Add a condition", a Done button.

## Step 10
Command: --step --click "Add a condition"
Saw (10.png): a list of attributes: name, gal1RGexp, gal4RGexp, gal80Rexp (with their ranges -- nice), and Node id. The gene symbol is "name".

## Step 11
Command: --step --click "name"
Saw (11.png): condition "name / Contains / Type the text to match / Match case". The task says begins with GAL -- "contains" could catch something like a gene with GAL in the middle. I want "starts with" if it exists.

## Step 12
Command: --step --click "Contains"
(Missed: nothing is called "Contains" -- it's a dropdown showing that value.)

## Step 13
Maren: "Click the dropdown itself."
Command: --step --click-at 1316,264
Saw (13.png): options Contains, Starts with, Ends with, Is exactly, Has a value, Has no value. "Starts with" is what I need.

## Step 14
Command: --step --click "Starts with" --click "Type the text to match" --type "GAL"
Saw (14.png): "name Starts with GAL -- 8 nodes", "8 of 331 nodes", and a suggestion list GAL1, GAL2, GAL3, GAL4, GAL7, GAL10, GAL11, GAL80. Same 8 as the search. The layer row now says 8. Close the suggestions and press Done.

## Step 15
Command: --step --key Escape --click "Done"
Saw (15.png): condition collapsed to a chip "name starts with GAL, 8 nodes". Now Fill + to set the colour.

## Step 16
Command: --step --click-at 1404,381
Saw (16.png): Fill > Color, a hex box with 6366F1 already selected -- that's the same bluish-violet everything already is, so nothing visibly changed. I'll type a proper purple hex.

## Step 17
Maren: "Purple. 800080, like in Cytoscape's colour box."
Command: --step --type "800080" --key Enter
Saw (17.png): a few dark purple dots in the middle of the network, and a legend box appeared top-left: "Color: GAL pathway -- 8 of 331 nodes". A legend I didn't have to build -- good. But the dots are tiny and purple-on-blue-violet is not much contrast; I want to zoom in and check all 8 are purple.

## Step 18
Command: --step --wheel 780,465,-600
Saw (18.png): barely zoomed. I can count about six or seven purple dots clustered in the centre; the rest still blue. Wheel harder.

## Step 19
Command: --step --wheel 780,470,-3000
Saw (19.png): the mouse wheel hardly zooms at all -- two tries and the picture is about the same size. The purple GAL nodes sit together in the middle; everything else is still the default blue-violet. The layer, the condition chip and the legend all say 8 of 331. I'm stopping here: the task is done.

## End of session (Maren, in character)

Did I finish? Yes. 8 genes begin with GAL: GAL1, GAL2, GAL3, GAL4, GAL7, GAL10, GAL11, GAL80. They are purple (#800080) through a style layer called "GAL pathway" (name starts with GAL). All the other genes are left as they were.

Ease: 6 out of 7.

What went well: the GraphML import showed me "331 node rows and 361 edge rows read; the load makes 331 nodes and 361 edges" before I loaded. That is the count Cytoscape never gives me. The search box counted "Nodes 8" right away. The layer condition had "Starts with", showed the live count (8 of 331 nodes) and listed which names matched. A legend ("Color: GAL pathway, 8 of 331 nodes") appeared without my asking, which is better than Cytoscape.

What confused or annoyed me:
- After I searched, the + next to "Style layers" moved: my first click only closed the search list, and the panel jumped back up under my pointer.
- The match dropdown showed "Contains" but I could not pick it by that word. I had to click on the box itself.
- When I added Fill, the colour started as 6366F1, the same blue-violet every node already has, so nothing seemed to change until I typed a hex code. I had no colour name or swatch to pick "purple" from; I typed 800080 myself.
- Dark purple next to blue-violet nodes is not much contrast, and the nodes are tiny dots with no labels. I could not zoom in to check: the mouse wheel barely changed the view. For a figure I'd want labels on these 8 nodes and bigger nodes.
- It opened as "3D" (the button at the bottom says 3D), though the picture looks flat. Is 3D telling me anything here?
- Scepticism: fine for exploring. I would still want to know how to cite it before a paper figure came from it.
