# First-click test -- Chris, ML engineer (recommendation systems)

Each answer is from the one still screen I was shown. Confidence is 1 (pure guess) to 7 (certain).

## r8-fc01 -- see it working on something right away
Clicked: the "Les Miserables" sample (thumbnail or title), top of the Samples column on the right. Confidence 6.
"Samples are right there, first one says it opens with worked examples. Fine. I'd still rather drop my own edge list, but that's the obvious click. Also dismissing that usage-data banner first, out of habit -- No thanks."

## r8-fc02 -- bring in the spreadsheet from Downloads
Clicked: "Open project or file..." (Ctrl+O) under Start. Confidence 5.
"Honestly I'd just drag the CSV onto the window, it says I can. If I have to click, Open file. 'New from data...' also sounds plausible for a raw table, which is what's costing me two points -- I don't know which one wants a CSV."

## r8-fc03 -- which characters the story depends on most
Clicked: the flask icon, leftmost in the bottom floating toolbar. Confidence 4.
"I want centrality. Nothing on screen says 'Analyze' except the little 'from Analyze' link on the PageRank panel, so I'm guessing the lab flask is where the algorithms live. PageRank is already computed though -- if I were less fussy I'd just click the PageRank row. I'd check the tooltip on the flask before committing."

## r8-fc04 -- pick out the circles that keep turning up together
Clicked: the flask icon in the bottom toolbar. Confidence 4.
"Community detection -- same place I'd look for any algorithm. I see a Louvain row with 6 groups already, so someone already ran it; if the flask isn't it I'd click that Louvain row. Would want to know modularity and resolution before I trust 6."

## r8-fc05 -- every character's name beside its dot
Clicked: the "+" next to "Label" in the right panel (with Everything selected). Confidence 5.
"Everything is selected and there's a Label section with a plus. That reads as 'add a label to everything'. There's also a 'Labels show... 1 node' row on the left which might be the real switch, but the plus is closer to what I'm asking."

## r8-fc06 -- higher-scoring characters get bigger dots
Clicked: the "+" next to "Shape" in the right panel (PageRank selected). Confidence 3.
"I want size mapped to the PageRank column. Fill is there, but no Size. Size is probably under Shape -- that's where it sat in other tools' node style. Could also be Effects. Annoying that size-by-column isn't a first-class row."

## r8-fc07 -- arrange the dots a different way
Clicked: the play (triangle) icon in the bottom toolbar. Confidence 2.
"No 'Layout' anywhere I can see. Play probably reruns the force simulation, which isn't the same as picking a different layout. Cube is 3D, which I won't touch. If play isn't it I'd click the 'Graph Co-appearance...' header hoping it has layout settings, or hit Cmd+K."

## r8-fc08 -- jump straight to Javert
Clicked: the search box "Find rows and notes" at top of the left panel. Confidence 5.
"First I'd try Cmd+K. On screen, the search box. 'Rows and notes' makes me wonder if it searches nodes or just these layer rows -- if typing Javert only filters the list, I'm annoyed."

## r8-fc09 -- a picture of the drawing for a slide
Clicked: the hamburger menu (three lines) at the far top-left. Confidence 3.
"Export usually lives in the main menu. Second guess is the project-name dropdown 'Les Miserables'. Worst case, OS screenshot."

## r8-fc10 -- the numbers for each character in Excel
Clicked: "Table" at the bottom left of the canvas. Confidence 4.
"Open the node table, check the PageRank/betweenness columns are there with the original ids, then look for export -- probably the '...' next to 'Columns: 9 of 9'. If this app can't hand me a CSV with my ids, it's going back in the drawer."

## r8-fc11 -- pick this up tomorrow exactly as it is
Clicked: the project name "Les Miserables" with the dropdown arrow, top-left. Confidence 4.
"Looking for Save. There's no save button, and 'Local only' plus 'kept in this browser' on the start page suggests it autosaves, but I don't trust autosave in a browser tab. Project dropdown is where Save / Save as would be."

## r8-fc12 -- check the whole file came through
Looked at: the header line "Les Miserables: 77 nodes, 254 edges", with the counts 77 and 254 beside nodes and edges in the left list. Confidence 6.
"That's the denominator I want. 'Every id is unique' at the bottom is a nice touch. What I don't see is how many rows were skipped or edges dropped -- 254 out of how many in the file?"

## r8-fc13 -- who this character is directly tied to
Clicked: the target icon (concentric circles), first button in the small toolbar that popped up above the main one with Valjean selected. Confidence 4.
"I want the 1-hop ego graph. The bullseye looks like 'focus on neighbourhood'. The line under it says 36 connections, so the number's there -- I just want them highlighted or listed. If the target is just 'center camera', I'd try the Data tab on the right."

## r8-fc14 -- swap in this month's transfers file, keep everything
Clicked: the "..." next to "transfers-2026-03.csv" in Sources. Confidence 5.
"Replace the edge source in place, so the filters and Louvain layers stay. The plus next to Sources would add a second file, which I don't want. I'd also need the accounts file swapped if new accounts showed up -- not obvious that's handled."
