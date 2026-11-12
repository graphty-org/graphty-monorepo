# Session r2-s27 -- Ruth (data journalist), T9 Prompt A (Les Miserables)

Task: use the ready-made Les Miserables network; make the drawing show which characters the network depends on most, bigger dot = more depended on. Then say what the sizes and colors stand for.

## Step 1

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s27 empty` -> 01.png
Saw: a start page. Start (Open project or file, New from data), Recent projects (empty), Samples: Les Miserables (77 characters), Zachary's karate club, College football, Florentine families. A usage-data box at the bottom: "Share usage data" / "No thanks". "Local only" top right, "Files are read on this computer and never uploaded."
Ruth: "Local only. Good. I'm not sharing anything -- No thanks. Then the Les Miserables sample."

## Step 2

Command: `--step --click "No thanks" --click "Les Miserables"` -> 02.png
Saw: the network drawn, all dots the same size and the same blue-purple. Right panel "Graph / From Les Miserables", Values tab: Nodes 77, Edges 254, "Undirected, from the file: directed 0", Density 0.08681, Components 1, "Edges per ..." 1 to 36, mean 6.597. Left: a search box "Find nodes, edges, values", Selection, Everything. Bottom left hint: "Analyze (flask) in the toolbar (Shift+A) to add results here". Toolbar at bottom: flask, a chart icon, 3D, magnifier.
Ruth: "77 characters, matches the label on the sample. 254 ties. All dots same size, no labels. I start with a name: Valjean."

## Step 3

Command: `--step --click "Find nodes, edges, values" --type "Valjean"` -> 03.png (miss: no control by that name; typed nothing)
Ruth: "The placeholder isn't its name, apparently. I'll just click into the box."

## Step 4

Command: `--step --click-at 180,90 --type "Valjean"` -> 04.png ("combobox Find")
Saw: results list: Elements -> Valjean; Values -> "Select where name is Valjean (1)". Drawing unchanged.
Ruth: "He's in there, one of him. Fine. Now the actual job: 'depends on most'. The hint said Analyze is the flask in the toolbar. Trying that."

## Step 5

Command: `--step --click-at 680,864` (button "Analyze") -> 05.png
Saw: a popup "Filter analyses", heading "Rank nodes and edges": Degree "How many edges each node has."; Betweenness "Which nodes sit on the most shortest paths between others."; Edge betweenness; Closeness "Which nodes are, on average, nearest to all the others."; PageRank with a "Start here" badge "Which nodes are connected to other well-connected nodes."; Eigenvector "Which nodes are tied to other central nodes."; Katz; HITS; All-pairs distance; Depth-first order (grayed, "Select a node first"); Most flow...
Ruth (reading each one): "'Depends on' -- who the others go through. Degree counts ties, that's popularity. PageRank says 'Start here', but 'connected to well-connected nodes' is influence, not dependence. Betweenness: 'sit on the most shortest paths between others' -- that's the bridge, the one you'd lose the connections without. My class said the same thing. The words 'between others' decide it. Betweenness."
Hesitation: the "Start here" badge on PageRank pulled at me; I did not take it because its sentence doesn't answer my question.

## Step 6

Command: `--step --click "Betweenness"` -> 06.png
Saw: the popup now shows Betweenness, same sentence, a collapsed "Advanced", "Under a second", and a blue Run button.
Ruth: "Takes under a second. I won't touch Advanced yet -- one thing at a time. Run."

## Step 7

Command: `--step --click "Run"` -> 07.png
Saw: every dot turned orange, a few darker (the one in the middle is nearly black-brown). A legend top left: "Color: Bridges", a bar from 0 to 1624. Left list gained a row "Bridges 77" with an orange swatch. Sizes are all still the same.
Ruth: "So it colored them, not sized them. 'Bridges', 0 to 1624 -- 1624 what? Shortest paths? Counted over what? The legend doesn't say. And the dots are still all one size, which is the half of the job it didn't do. I'll click the 'Bridges' row and see what it lets me change."
Part 1 (have the program work it out): done. Part 2 (size by it): not yet.

## Step 8

Command: `--step --click "Bridges"` -> 08.png
Saw: the row is highlighted with an eye icon. Right panel now titled "Bridges", "Measure from Bridges, Oct 6", Style tab selected, Nodes/Edges toggle (Nodes). Fill: Color = Bridges (with a minus). Below, Shape +, Effects +, Label +, Tooltip +.
Ruth: "It's dated -- Oct 6. Good, I like a date on a number. Color is set to Bridges. No 'Size' row. Size of a dot is probably under Shape. I'll press the plus by Shape."

## Step 9

Command: `--step --click-at 1419,234` (button "Add to Shape") -> 09.png
Saw: a small menu: Size, Shape.
Ruth: "There it is. Size."

## Step 10

Command: `--step --click "Size"` -> 10.png
Saw: a "Size" row with a number box "1", a chain-link icon, and a minus. Drawing unchanged.
Ruth: "A flat number, 1 for everybody -- that's not what I want. The Color row says 'Bridges', so there must be a way to tie size to it too. The chain link next to the box looks like 'link to data'. Hover it first."

## Step 11

Command: `--step --hover-at 1381,264` -> 11.png; tooltip "Size by attribute"
Ruth: "'Size by attribute.' That's it. Click."

## Step 12

Command: `--step --click "Size by attribute"` -> 12.png
Saw: a "Size by attribute" popover: search "Find an attribute"; group "Bridges": Bridges, Bridges rank, Bridges percentile; then "Cannot be used: Holds groups, not amounts": id, name (grayed).
Ruth: "Good -- it tells me why it won't size by name. Bridges, rank, percentile. The raw number is the honest one; same as the color. Bridges."

## Step 13

Command: `--step --click-at 1189,372` (option "Bridges") -> 13.png
Saw: the dots now differ in size. One very large dark-brown dot in the middle, a few medium ones (one at the hub lower left, one near the top center), most small. The legend now has two rows: "Size: Bridges 0 to 1624" (a gray wedge) and "Color: Bridges 0 to 1624". The Size box reads "1 to 3".
Ruth: "That's the picture asked for: bigger dot, more of the network runs through them. Size and color say the same thing twice. Part 2 done. But I want to know who the big one is, and what 1624 counts. Hover the big dot."

## Step 14

Command: `--step --hover-at 768,447` -> 14.png; tool: node "Valjean", tooltip null
Saw: nothing on screen changed -- no tooltip, no name on the dot. (The tool reports the node id is Valjean; a real person would not see that.)
Ruth: "Hovering tells me nothing. I'll click it."

## Step 15

Command: `--step --click-at 768,447` -> 15.png
Saw: the big dot highlighted with a yellow ring. Right panel: "Valjean, Node". Summary: id Valjean, name Valjean; Results: Bridges "1,624, #1 of 77"; Degree 36. Selection count 1.
Ruth: "Valjean, number one of 77, 1,624. Degree 36 -- that matches the top of the 'Edges per node 1 to 36' I saw at the start, so the two agree. Still: 1,624 of what? I'll look at the Bridges result's own Values tab for what it counted."

## Step 16

Command: `--step --click "Bridges" --click "Values"` -> 16.png (tool: both names were ambiguous, took the first: the "Bridges" row on the left and the "Values" tab)
Saw: right panel "Bridges, Measure from Bridges, Oct 6", Values tab: a histogram 0 to 1,624, "77 of 77 have a value, 0 to 1,624, median 0". Top 10: Valjean 1,624; Myriel 504; Gavroche 470.6; Marius 376.3; Fantine 369.5; Thenardier 213.5; Javert 154.8; MlleGillenormand 135.7; Enjolras 121.3; Tholomyes 115.8. "Made with: Analysis Betweenness, Ran Oct 6", a collapsed Advanced.
Ruth: "77 of 77 -- nobody dropped. 'Made with Betweenness' -- so 'Bridges' is the friendly name for the betweenness I picked; I only know that because this box says so. The top 10 matches the picture: Valjean the giant in the middle, Myriel the hub at the bottom left with the spray of single-tie characters, Gavroche the one near the top. Median zero -- most characters sit on nobody's shortest path, which is why most dots are the smallest size. What I still can't confirm: what the unit of 1,624 is. Shortest paths passing through him, I assume from the description, but the fractions (470.6) tell me it's split somehow, and nothing on screen says how. I'd need that before printing a number. For the drawing, though, I'm done."

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s27`

## Ending, in character

**Did I finish?** Yes. The drawing now shows bigger dots for the characters the network depends on most.

**What the sizes and colors stand for:** both stand for the same thing, "Bridges", which the result panel says was made with the Betweenness analysis: how many of the shortest paths between other characters run through that character. Bigger dot = more of the network's shortest routes go through that person. Color says it again: light orange at 0, dark brown at the top (1,624, Valjean). The legend in the top left says "Size: Bridges 0 to 1624" and "Color: Bridges 0 to 1624". Valjean first by far, then Myriel (504), Gavroche (470.6), Marius, Fantine.

**Ease:** 6 of 7. Picking the measure took reading, which is how it should be; every analysis has a one-line description, and "sit on the most shortest paths between others" matched "depends on". Running it colored the drawing by itself. Sizing took three small finds: click the result row, press the plus by "Shape", then a chain-link icon to tie size to "Bridges".

**What confused me or slowed me:**

- Running the analysis colored the dots but left the sizes alone. The task said bigger dots; I had to find size myself.
- The analysis I chose is called "Betweenness" in the list but "Bridges" everywhere afterward (legend, layer row, size picker). I only learned they were the same thing from "Made with: Betweenness" at the bottom of the Values tab. A reader of the legend alone sees "Bridges" and nothing else.
- The legend gives 0 to 1624 with no unit. "1,624 what?" is not answered anywhere I looked. Fractional values (470.6) suggest the count is split between equal paths; the screen does not say so.
- Size, once tied to data, shows "1 to 3" in the box -- 1 to 3 of what (times bigger)? Not explained, but it doesn't matter for the job.
- Size lives under "Shape", behind a plus; I guessed it. The chain-link icon only made sense after hovering ("Size by attribute").
- Hovering a dot shows nothing; I had to click it to learn who it was. No names on the drawing.
- The search box placeholder "Find nodes, edges, values" is not something I can click by name -- I had to point at it.
- "PageRank -- Start here" pulled at me; its words didn't fit "depends on", so I didn't take it, but a less careful person might.

**Good things that saved me a check:** "77 of 77 have a value"; the date on the result ("Oct 6"); the grayed-out "id, name -- Cannot be used: Holds groups, not amounts" telling me why; Valjean's own panel showing "1,624, #1 of 77" and Degree 36, which agreed with the overview's maximum of 36.
