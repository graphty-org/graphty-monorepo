# Session r1-s14 (Maren)

Task: put the three gauges the most journeys go through in orange, and name them.

## Step 0 -- start
Command: real.mjs --start <folder> setup:gauges-clean.txt
01.png: Colleague's gauges network, 11 gauges, 13 edges, table open. "Most journeys go through" -- in Cytoscape I'd run a centrality, the one that's about sitting between things. The flask button in the toolbar looks like the analysis tools; trying it.

## Step 1
Command: --step --click-at 615,391 (flask icon)
02.png: A list of analyses. "Betweenness -- which nodes sit on the most shortest paths between others." That's journeys going through a gauge. Clicking it.

## Step 2
Command: --step --click "Betweenness"
03.png: Betweenness card with a Run button and a little gear with no label (not touching it). "Under a second" -- fine. Run.

## Step 3
Command: --step --click "Run"
04.png: It ran and coloured EVERY node on a 0-25 orange-brown gradient, and added a Betweenness layer. Colours I didn't choose, and the council wants only three orange. First I need the numbers: the table says 9 columns now, so the score must be off to the right. Dragging the table's scrollbar right.

## Step 4
Command: --step --drag 760,868 1100,868
05.png: Betweenness column: Cedar Bend 25, Fox Creek 24, Mill Pond 21, Upper Falls 16... but only 10 of 11 rows show. Clicking the Betweenness header to sort, like I'd sort in Cytoscape's node table.

## Step 5
Command: --step --click-at 1114,509 (Betweenness header)
06.png: Sorted, highest first: Cedar Bend 25, Fox Creek 24, Mill Pond 21, then Upper Falls 16. Clear gap, so the top three are Cedar Bend, Fox Creek, Mill Pond. (The header says the network is Directed -- I'd want to know whether betweenness used direction; there's no word on that on the card. Noting it.) Now I need only those three orange. I'll select the three rows like in Cytoscape's table: click the first, shift-click the third.

## Step 6
Command: --step --click-at 480,542 --shift-click-at 480,608
(no shift-click by point in the tool; retried by name)
Command: --step --click "Cedar Bend" --shift-click "Mill Pond"
07.png: Three rows selected, "3 nodes selected" on the right, ringed on the network. The right panel has a Style tab for the selection -- that's where I coloured clusters before. Opening it.

## Step 7
Command: --step --click "role=tab:Style"
08.png: "The first style you set makes a layer for the 3 selected nodes." Good, that's explicit. Fill has a plus; clicking it.

## Step 8
Command: --step --click-at 1404,301 (Fill +)
09.png: A Color box, empty, "Not set yet: the first color you pick makes the layer". Clicking the colour box.

## Step 9
Command: --step --click-at 1312,335 (Color box)
10.png: No colour swatches appeared, just a text cursor in the box. I'll type a hex for orange like I would in Cytoscape and press Enter.

## Step 10
Command: --step --type "#FFA500" --key Enter
11.png: "Made a layer for the 3 selected nodes", a "3 nodes" layer, FFA500, "Picked by hand: 3 nodes". Good. But the Betweenness layer is still painting every other gauge in orange-to-brown, so the picture says "everything is orange". In Cytoscape I'd remove that mapping. I'll hide the Betweenness layer with its eye, then click empty canvas to drop the selection so I can see the real colours.

## Step 11
Command: --step --click-at 276,280 (Betweenness eye) --click-at 760,200 (empty canvas)
12.png: Now only three gauges are orange, the other eight are back to blue, and the legend says "Color: 3 nodes, 3 of 11 nodes". The Betweenness column is still in the table, so the numbers are kept. Done -- stopping here.

## Wrap-up (in character, Maren)

Did I finish? Yes. The three gauges the most journeys go through (highest betweenness) are Cedar Bend (25), Fox Creek (24) and Mill Pond (21); the next one, Upper Falls, is at 16. Those three are now orange on the network.

Ease: 6 out of 7.

What went well: the Analyze list said in one line what Betweenness means ("which nodes sit on the most shortest paths between others"), which is exactly "journeys go through". Sorting the column put the answer at the top, and selecting three rows then setting Fill made a layer "for the 3 selected nodes" and told me so. That's quicker than Cytoscape's bypass.

What confused or bothered me:
- Running Betweenness painted ALL eleven gauges on an orange-to-brown gradient I didn't ask for. With my three set to orange the picture still read as "everything is orange" until I hid the Betweenness layer. I had to know to do that.
- The colour box gave me no swatches or picker when I clicked it, only a text cursor; I typed a hex because I know hex. Someone who doesn't would be stuck.
- The network says Directed. The Betweenness card doesn't say whether it followed the arrows (river flow) or ignored them. For "journeys along the river" that matters, and the only control on the card was an unlabelled gear I wasn't going to click.
- Only 10 of 11 rows fit in the table without scrolling; I had to sort to be sure I wasn't missing the top one.
- The score has no unit or scale explained (is 25 a count of journeys? of pairs?). Fine for ranking, but I couldn't put it in a methods sentence.

## Follow-up

Facilitator: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen."

Maren: 3. Most of it was calm -- the Analyze list told me what Betweenness meant, sorting the column gave me the top three, and the Style tab said what it would do before I did it. The moment I was least sure was right after I typed FFA500 and pressed Enter (11.png). The toast said "Made a layer for the 3 selected nodes" and the right panel showed my orange, but the network itself still looked all orange and brown, because the Betweenness gradient was painting every gauge. The legend box at the top left said "Color: 3 nodes" and underneath it "Color: Betweenness" with a 0-25 bar, and the layer list on the left had "3 nodes" sitting above "Betweenness" with eye icons on both. I couldn't tell at first whether my colour had worked or been swallowed, and nothing on screen said "the Betweenness layer is also colouring nodes -- hide it if you only want your three". I worked out from the layer list that I had to switch the Betweenness eye off; in Cytoscape I'd have deleted the mapping, so I guessed. A smaller wobble just before that: clicking the colour box gave me only a text cursor, no swatches, so I typed a hex.
