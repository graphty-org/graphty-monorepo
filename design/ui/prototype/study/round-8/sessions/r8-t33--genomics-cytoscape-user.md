# Session: look at one coloring by itself, then put it back -- Maren (genomics Cytoscape user)

Task as given: "The Les Miserables network is open (example data, not your own), and several results color it at once. Look at the coloring from the circles of characters by itself for a moment, without deleting or changing anything else, then put things back as they were."

All commands were run from design/ui/prototype. Renders are in tmp/round-8-sessions/r8-t33--genomics-cytoscape-user/.

## Start (01.png, shots/tasks/r8-t33/01.png)

"OK, everything is orange-to-brown. The little box on the canvas says 'Color: PageRank'. On the left there's a list -- PageRank, Louvain with '6 groups', shortest paths, some groups, Betweenness with a crossed-out eye. 'Circles of characters' -- that has to be the clustering. Louvain, 6 groups. In my world I'd call that MCODE, whatever. It's there but I can't see it because PageRank is painting over it, I guess."

## Step 1 -- click Louvain

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t33 --click "Louvain"

"It said two things are called Louvain and clicked the first one -- a tab at the bottom. Not what I meant. I'll click the row in the list."

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t33 --click "Louvain, 1 note"

03.png: "The right side now says Louvain, 'Paints 77 nodes', and 'Covered by PageRank for Color on 77 of 77'. Good -- that tells me straight out why I can't see it. In Cytoscape I'd just have had one style and I'd have to swap it. There's a '...' on the row. Let me see what's in there."

## Step 2 -- the row menu

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t33 --click "Louvain, 1 note" --hover "More"
    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t33 --click "Louvain, 1 note" --click "More actions"

05.png: "Long menu. Rerun, Run as copy, some grayed-out null-model thing I'm skipping, 'Restore the suggested look', Lock, 'Remove from list view', 'Show only this row'. That last one sounds like exactly 'by itself'. I'm not touching Delete, and I'm wary of 'Restore the suggested look' -- sounds like it might change something."

## Step 3 -- show only this row

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t33 --click "Louvain, 1 note" --click "More actions" --click "Show only this row"

06.png: "There it is. Six colors, and the legend box changed to 'Color: Louvain' with Community 1 to 6 and a node count for each -- 25, 17, 10, 10, 9, 6. That adds up to 77. I like that it gives counts. The other rows went gray, and at the bottom of the list it says 'Showing only Louvain. Show all'. So it hasn't deleted them, it's just hiding. The row says 'only' in italics. Fine. Colors: orange, light blue, green, dark blue, red-orange, pink. Orange next to red-orange is close; my PI would squint at those. But no red-green pair, at least."

## Step 4 -- put it back

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t33 --click "Louvain, 1 note" --click "More actions" --click "Show only this row" --click "Show all"

07.png: "Back to PageRank, orange-brown. Legend says PageRank again. Betweenness still has its crossed-out eye, like at the start, so it didn't turn on things that were off. The list looks the same as the first screen. The only thing different is Louvain is still selected and there's a Louvain tab in the table at the bottom instead of Nodes -- that's just where I clicked, I don't think that counts as changing anything."

## Wrap-up

- Succeeded? Yes, I think so. I saw the communities on their own and got back to exactly the starting coloring.
- Single Ease Question: 6 of 7. The "Covered by PageRank" line told me why I couldn't see it, and "Show all" was right there afterwards. I only lost a step because the name matched a tab first, and the option is buried in a long "..." menu next to things like Delete and Rerun -- I'd have liked it right on the row.
- Would I use this instead of my current tool? For poking around, maybe -- in Cytoscape this is swapping visual styles back and forth and hoping I didn't overwrite one, so this is nicer. But this was a novel about Valjean, not my genes. It doesn't tell me if my clustering would come through or where the enrichment is. The paper figure stays in Cytoscape until I see that.
