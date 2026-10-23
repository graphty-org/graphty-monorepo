# Session r1-s12 -- Grace (nonprofit operations analyst)

Task: bring in yeast-galactose.graphml (331 genes), mark every gene whose name starts with GAL in purple, leave the rest alone, say how many.

## Step 0 -- start

Command:
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 REAL_TIER=3 node .../real.mjs --start <session folder> empty

Note: the start waited a long time for a free browser slot ("waiting for a free browser slot ...").

01.png: landing page. "Open a file" big green button, says the file never leaves the computer. Good for me.

## Step 1
Thought: Big green "Open a file". Click it, pick the yeast file.
Command: --step <folder> --click "Open a file" --upload yeast-galactose.graphml
Result 02.png: "Open as a new graph" preview. 331 nodes, 361 edges -- matches the 331 I was told. Columns id, name, gal1RGexp, gal4RGexp, gal80Rexp. Gene names like GCN3, NAB2 in the "name" column. A green Load button bottom right.

## Step 2
Thought: 331 nodes, that's everyone. Load.
Command: --step <folder> --click "Load"
Result 03.png: the graph shows, all blue-ish dots. Right panel says Nodes 331, Edges 361. Left has "Style layers" with Hovered, Selected, Everything (331) and a + button.

## Step 3
Thought: "Style layers" with a plus looks like conditional formatting. I'll add one.
Command: --step <folder> --hover-icon / click the + next to Style layers
(actual command: --click-at 276,122 -> button "Add a layer or a folder")
Result 04.png: a small menu: Layer, Folder, Select layers..., Analyze...

## Step 4
Thought: "Layer" it is.
Command: --step <folder> --click "Layer"
Result 05.png: new "Layer 1" (331), its name selected for editing. Right panel: "Which nodes 331 of 331 nodes -- All 331 nodes: add a condition to narrow", then Shape, Visibility, Text, Fill, Effects, Rendering.

## Step 5
Thought: Name it so I know what it is.
Command: --step <folder> --type "GAL genes" --key Enter
Result 06.png: (checked below with next step)

## Step 6
Thought: "Which nodes" is where I narrow it down.
Command: --step <folder> --click "Which nodes"
Result 07.png: layer renamed "GAL genes" (331). "Which nodes -- Nodes that pass every condition", "+ Add a condition", Done.

## Step 7
Thought: Like an Excel filter. Add a condition.
Command: --step <folder> --click "Add a condition"
Result 08.png: a list of columns: name, gal1RGexp, gal4RGexp, gal80Rexp, Node id.

## Step 8
Thought: Gene names are in "name".
Command: --step <folder> --click "role=option:name" (or click name)
(actual command: --click-at 1271,344 -> option "name")
Result 09.png: condition box: name / Contains (dropdown) / "Type the text to match" / Match case.

## Step 9
Thought: I want "begins with", not "contains". Open the dropdown.
Command: --step <folder> --click-at 1316,264
Result 10.png: options Contains, Starts with, Ends with, Is exactly, Has a value, Has no value.

## Step 10
Thought: "Starts with" -- plain words, perfect. Then type GAL into the box.
Command: --step <folder> --click "Starts with" --click "Type the text to match" --type "GAL"
Result 11.png: "Which nodes 8 of 331 nodes"; layer count now 8. A suggestion list shows GAL1, GAL2, GAL3, GAL4, GAL7, GAL10, GAL11, GAL80 -- I count eight. Layer header now says "Node layer", Edge "not styled".

## Step 11
Thought: Eight. Close the suggestions and click Done.
Command: --step <folder> --key Escape --click "Done"
Result 12.png: summary chip "name starts with GAL, 8 nodes". Sections Shape, Visibility, Text, Fill, Effects, Rendering, each with +.

## Step 12
Thought: Color is probably "Fill". Click its +.
Command: --step <folder> --click-at 1404,381
(actual: button "Add to node fill")
Result 13.png: Fill -> Color box with a bluish swatch and code "6366F1" highlighted.

## Step 13
Thought: A hex code. I'll try typing the plain word "purple" and Enter.
Command: --step <folder> --type "purple" --key Enter
Result 14.png: "purple" accepted, shown as 800080 with a purple swatch. A key appeared top left of the picture: "Color: GAL genes -- 8 of 331 nodes". A few dark dots in the middle of the picture. The other dots are already a blue-violet, so the purple ones are hard to tell apart at this size.

## Step 14
Thought: Zoom in on the middle to check they really changed.
Command: --step <folder> --wheel 780,470,-600
Result 15.png: picture barely changed size.

## Step 15
Thought: Barely zoomed. Turn the wheel harder.
Command: --step <folder> --wheel 780,470,-3000
Result 16.png: the picture still did not get noticeably bigger -- turning the wheel hardly zooms. I can see a little cluster of dark purple dots in the middle (around the center of the picture), different from the blue-violet of everything else, and the key still says "Color: GAL genes, 8 of 331 nodes". Every other dot looks as before.

Stopping here: the GAL genes are purple, the rest untouched, and the program told me the count.

## Wrap-up (in character, Grace)

Did I finish? Yes. Answer: 8 genes start with GAL -- GAL1, GAL2, GAL3, GAL4, GAL7, GAL10, GAL11, GAL80 -- and they are purple; the other 323 are left as they were.

Ease: 6 out of 7.

What went well:
- "Open a file" was the obvious door, and it said the file never leaves my computer -- that matters to me.
- The preview said 331 nodes, 361 edges before I loaded, so I could check the count right away.
- "Add a condition" -> name -> "Starts with" -> GAL read like an Excel filter, plain words. It counted "8 of 331 nodes" live and listed the eight names, so I could count them myself.
- Typing the word "purple" worked; I did not need a color code.
- The little key "Color: GAL genes, 8 of 331 nodes" is exactly what I would put on a slide.

What confused or slowed me:
- "Style layers" is not a word I use; I guessed it was like conditional formatting. "Layer" vs "Folder" in the + menu was a guess too.
- The plus for Fill is far from the word "Fill"; I had to know that color lives under "Fill".
- The color box showed "800080" after I typed "purple" -- fine, but a board person would not know that code.
- The normal dots are already blue-violet, so dark purple does not stand out much at this size; the marked dots are tiny. For a slide I would want them bigger or a brighter purple.
- Zooming with the mouse wheel barely changed anything, so I could not get a closer look at the eight dots.
