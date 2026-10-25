# Session r1-s10 -- Dev (student), first-time user

Task: bring in yeast-galactose.graphml, color every gene whose name begins with GAL purple, leave the rest, say how many.

## Step 01 -- start

Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 REAL_TIER=3 node .../real.mjs --start <session folder> empty`

Note: the start waited for a free browser slot first.

01.png: landing page. Dev: "Okay, 'Analyze any network'. The big button says Open a file -- CSV, GraphML. My file is GraphML, so that one."

## Step 02
Command: `--step <folder> --click "Open a file" --upload yeast-galactose.graphml`
Output: file chooser opened, chose yeast-galactose.graphml -> 02.png
02.png: "Open as a new graph" preview. "yeast-galactose: 331 nodes, 361 edges" -- matches what I was told (331 genes). Columns id, name, gal1RGexp, gal4RGexp, gal80Rexp. Names column has GCN3, NAB2... the GAL genes must be in there. "Okay this is like the Gephi import screen. It read everything. Click Load."

## Step 03
Command: `--step <folder> --click "Load"` -> 03.png
03.png: the drawing, small blue dots. Right panel: Nodes 331, Edges 361. Left: search box "Find nodes, edges, values" and "Style layers" (Hovered, Selected, Everything 331). "Okay it's in. Now I need to find the GAL genes. The search box first."

## Step 04
Command: `--step <folder> --click "Find nodes, edges, values" --type "GAL"`
04.png: list "Nodes 8": YBR019C GAL10, YOL051W GAL11, YBR020W GAL1, YLR081W GAL2, YPL248C GAL4, YBR018C GAL7, YML051W GAL80, YDR009W GAL3. Then "Values: name is GAL10 (1)..." Picture unchanged (nothing highlighted). "So 8 GAL genes. Now to make them purple. 'Style layers' has a plus -- like adding a color rule?"

## Step 05
Command: `--step <folder> --click-at 276,705` (the + next to Style layers)
Output: at 276,705: button "Add a layer or a folder" -> 05.png
05.png: the search results closed, the Style layers section jumped back to the top, no menu visible. "Wait, did it do anything? The plus moved. Trying again."

## Step 06
Command: `--step <folder> --click "Add a layer or a folder"`
06.png: a menu: Layer, Folder, Select layers..., Analyze... (Shift+A). "Okay so the first click just closed the search list. Now: Layer."

## Step 07
Command: `--step <folder> --click "role=menuitem:Layer"`
07.png: "Layer 1" added between Selected and Everything, its name in an edit box. Right panel: Style tab, Node/Edge, "Which nodes 331 of 331 nodes -- All 331 nodes: add a condition to narrow", then Shape, Visibility, Text, Fill, Effects, Rendering. "Nice, this is like a filter plus color. Name it first."

## Step 08
Command: `--step <folder> --type "GAL genes" --key Enter --click "Which nodes"`
08.png: layer renamed "GAL genes" (331). Which nodes opened: "Nodes that pass every condition", "+ Add a condition", Done.

## Step 09
Command: `--step <folder> --click "Add a condition"`
09.png: attribute picker: Data: name, gal1RGexp, gal4RGexp, gal80Rexp; Structure: Node id. "name is the gene name."

## Step 10
Command: `--step <folder> --click "role=option:name"`
10.png: condition box: name / Contains (dropdown) / "Type the text to match" / Match case. "Begins with is what I need; checking the dropdown."

## Step 11
Command: `--step <folder> --click-at 1316,264` (the Contains dropdown)
Output: combobox "name: how to match" -> 11.png
11.png: options Contains, Starts with, Ends with, Is exactly, Has a value, Has no value.

## Step 12
Command: `--step <folder> --click "role=option:Starts with" --click "Type the text to match" --type "GAL"`
12.png: "name Starts with GAL", "8 nodes"; Which nodes "8 of 331 nodes"; layer row "GAL genes 8". Autocomplete list GAL1, GAL2, GAL3, GAL4, GAL7, GAL10, GAL11, GAL80 covers the panel. "8 again. Good."

## Step 13
Command: `--step <folder> --key Escape`
13.png: suggestions closed, condition kept (Starts with GAL, 8 nodes).

## Step 14
Command: `--step <folder> --click "Done" --click "Fill"`
Output: Done ran; "Fill" was ambiguous (group, heading, span) so the Fill click did nothing -> 14.png
14.png: Which nodes collapsed to a chip "name starts with GAL, 8 nodes". Fill row shows a + at the right.

## Step 15
Command: `--step <folder> --click-at 1404,381` (the + on the Fill row)
Output: button "Add to node fill" -> 15.png
15.png: Fill > Color, a hex box "6366F1" (selected text) with a swatch, link icon and minus. The swatch is the same blue-violet as all the dots. "It's a code. I'm not sure what code purple is. Swatch first."

## Step 16
Command: `--step <folder> --click-at 1268,415` (the color swatch)
Output: button "Pick node color" -> 16.png
16.png: Color popup: saturation square, hue bar, eyedropper, Hex 6366F1, swatches (the current blue-violet, gray, blue, yellow, black). No purple swatch.

## Step 17
Command: `--step <folder> --click-at 1146,692` (hue bar, between blue and magenta)
Output: slider "Hue" -> 17.png
17.png: the popup closed (one click on the hue bar closed it). Color now DC63F1 (orchid / pinkish purple). A legend appeared top-left of canvas: "Color: GAL genes -- 8 of 331 nodes". A few dots near the center look pink-purple. The list button in the bottom toolbar lit up. "Is that purple or pink? Kind of orchid. Let me zoom in."

## Step 18
Command: `--step <folder> --wheel 780,465,-600`
18.png: zoom changed almost nothing. A small cluster of pink-purple dots in the middle (the GAL genes, they sit together). "It's more orchid-pink than purple. Can I type the word purple?"

## Step 19
Command: `--step <folder> --click-at 1318,415 --key Control+a --type "purple" --key Enter`
Output: at 1318,415: input "Node color, set here, purple" (its name already called DC63F1 "purple") -> 19.png
19.png: the box now reads 800080, swatch and legend dark purple. The cluster of GAL dots in the middle is dark purple; every other dot is still the original blue. Layer row "GAL genes 8", "name starts with GAL, 8 nodes". "Oh nice, it understood the word purple. That's it."

Stopped here (did not --end; the facilitator ends the session).

## End of session, in character (Dev)

Did I finish? Yes. I loaded yeast-galactose.graphml (331 nodes, 361 edges, matched what I was told), made a layer called "GAL genes" with the rule "name starts with GAL", and set its fill to purple (800080). Every other gene kept its color.

How many: 8 genes -- GAL1, GAL2, GAL3, GAL4, GAL7, GAL10, GAL11, GAL80. Both the search box ("Nodes 8") and the layer ("8 of 331 nodes") said 8.

Essay sentence: "Eight genes of the galactose pathway (GAL1, GAL2, GAL3, GAL4, GAL7, GAL10, GAL11 and GAL80), marked in purple, sit together in the middle of the 331-gene network."

Ease: 6 out of 7 (7 = very easy).

What confused me:
- The first click on the plus next to "Style layers" did nothing visible: it only closed the search results, the whole list jumped up, and I had to click the plus again in its new place.
- I was looking for "color" or "palette" (the tutorial words); it's called "Fill" under a "Style layers" thing, which I only guessed because a layer is like a rule. Once inside, "Which nodes / Add a condition / Starts with" was really clear.
- The color is a hex code and starts as the same blue every dot already is. The picker's swatches had no purple, and one click on the rainbow bar closed the picker and gave me a pinky orchid (DC63F1) that I wasn't sure counted as purple. Typing the word "purple" worked, but I only tried it by luck.
- Searching "GAL" in the search box listed the 8 genes but didn't highlight them in the picture, so I couldn't see where they were until I colored them.
- The dots are tiny; the purple ones are hard to spot, and zooming with the wheel barely moved.
