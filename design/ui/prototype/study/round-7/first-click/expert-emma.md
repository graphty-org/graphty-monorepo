# First-click test -- Expert Emma

Participant: Emma, network scientist, notebook user, skeptical of GUIs. One still picture per prompt; first click and confidence (1-7).

## fc01 -- read a colleague's note about one circle of characters
Click: the little speech-bubble "1" on the Louvain row in the left tree.
Confidence: 4
"A 'circle' is a community, so Louvain. That row has a comment bubble with a 1 on it -- that is probably the note. There is also a 'Notes 4' row and a Notes rail icon, which is two other places it could be. Three ways in to one thing makes me wonder which is canonical."

## fc02 -- how the two selected characters connect through the others
Click: the second icon in the floating toolbar above the bottom bar (the squiggly route icon, two dots joined by a winding line).
Confidence: 5
"That looks like a path icon, and 'Shortest paths' in the tree uses the same glyph. Shortest path between two selected nodes is the obvious reading. I would want to know weighted or unweighted before I trust it."

## fc03 -- make the drawing stop drifting
Click: the pause icon (two vertical bars) in the bottom toolbar.
Confidence: 6
"Layout is running, pause it. Fine."

## fc04 -- go back to Monday's saved angle
Click: Views in the left rail (the bookmark icon).
Confidence: 6
"A saved view is a bookmark. Obvious."

## fc05 -- show what the colors mean
Click: the bulleted-list icon in the bottom toolbar (fourth button, not highlighted here).
Confidence: 4
"In the other screens that list button was blue and the legend box was up in the corner. Now it is off and the legend is gone, so I assume that toggles the legend. Guess, but an informed one."

## fc06 -- make the connections in this circle dashed
Click: the "Edges" tab next to "Nodes" in the right-hand Style panel for Community 3.
Confidence: 5
"Community 3 is selected, the panel has Nodes and Edges. Dashed is an edge style, so Edges, then probably Shape. I am not certain 'connections between the characters of this circle' means edges inside the group only, rather than any edge touching it -- the panel does not say."

## fc07 -- show each character's name next to them
Click: the "+" on the Label row in the right-hand panel.
Confidence: 4
"Label, plus. It is on the PageRank row though, which paints every node, so I suppose it works -- but putting names on a PageRank layer is odd. I would rather put it on 'Everything', and would maybe click that first if I thought about it longer."

## fc08 -- count every shared chapter, a five-chapter pair counting five times
Pick: "Total value -- The sum of value over each node's edges."
Confidence: 5
"That is weighted degree, strength. 'Links (count)' is plain degree, which is the wrong one. I am assuming 'value' is the number of shared chapters; the Les Mis GEXF stores co-appearance counts as the weight, so likely. 'Total value' is a vague name for it -- call it weighted degree or strength."

## fc09 -- money received per account, in currency
Pick: "Total amount in -- The sum of amount over the edges coming into each node."
Confidence: 6
"Weighted in-strength on amount. Clear enough."

## fc10 -- import a nested JSON export from Downloads
Click: "Open project or file..." under Start.
Confidence: 5
"It is a file on disk, Ctrl+O. 'New from data...' might be the one that walks you through mapping nested records, but I would try opening the file first. Good that it says files are never uploaded -- that is the first thing I look for."

## fc11 -- swap March's export for April's under everything built here
Click: Data in the left rail (the database cylinder icon).
Confidence: 4
"Replacing a source is a data job. Could also be that 'from 2 tables' link at the top right. I would go to Data and expect a replace option on each source."

## fc12 -- apply a colleague's saved color scheme
Click: the hamburger menu, top left.
Confidence: 3
"Importing a style file feels like a File menu thing. Might also be the '...' next to the search box on the left. Nothing on this screen says 'import style', so I am guessing."

## fc13 -- find the attribute for when a host was last checked for security problems
Click: the "Find attribute" search box under Attributes.
Confidence: 6
"Type 'audit' or 'scan' or 'vuln'. I can already see cmdb_last_audited_at, but I would not assume that is it -- audited could mean anything -- so I search."

## fc14 -- how many door swipes pointed at no known person or building
Click: the "from 3 tables" link at the top of the right-hand panel.
Confidence: 3
"Dangling edges are an import question. That link says where the graph came from, so I expect an import report there. Or the Data rail. The summary shows nodes and edges but no 'dropped' count, which is what I actually want next to the edge count."
