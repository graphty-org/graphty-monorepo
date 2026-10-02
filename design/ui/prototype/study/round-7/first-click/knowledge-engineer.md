# First-click transcript -- Dr. Min-ji Kim, knowledge graph engineer

Each answer is the one thing I would click first on the still render, with my confidence (1-7)
and what I was thinking, in my own words.

## fc01 -- read a colleague's note about one circle of characters
Click: the small speech-bubble "1" on the Louvain row in the left tree. Confidence 4.
"Circle" is not a word I would use, but Louvain is the only thing on screen that makes groups, and
it is the only row with a comment badge. The Notes rail and the Notes row with "4" compete with
it; if the badge does nothing I go to Notes next.

## fc02 -- how two selected characters connect through others
Click: the second icon in the floating bar above the toolbar (two circles joined by a curved
route). Confidence 5.
It looks like a path icon, and Shortest paths in the tree uses the same glyph. I would want to
know which path: shortest by hops or by weight.

## fc03 -- stop the drawing from drifting
Click: the pause icon (two vertical bars) in the bottom toolbar. Confidence 6.
Pause is pause. I would still want to know whether it freezes the layout or just the animation.

## fc04 -- go back to the angle saved on Monday
Click: Views in the left rail (bookmark icon). Confidence 6.
A saved angle is a bookmark; that is the only bookmark on screen.

## fc05 -- show what the colors mean
Click: the list icon in the bottom toolbar (the one shown highlighted blue on other screens).
Confidence 3.
There is no legend on this screen, and on the earlier screens a legend box sat top left while
that icon was blue. Guessing it toggles the legend. With no label I am not sure.

## fc06 -- make this circle's connections dashed
Click: the "Edges" tab next to "Nodes" in the right panel, under Community 3. Confidence 5.
The panel is already on the group; dashed is a line property, so the edges tab.

## fc07 -- show each character's name next to it
Click: the "+" beside Label in the right panel. Confidence 4.
Worry: the panel is showing PageRank, so I may be putting labels on a PageRank layer rather than
on every node. I might click "Everything" in the tree first if I stopped to think.

## fc08 -- count every shared chapter, not just distinct neighbors
Pick: "Total value -- the sum of value over each node's edges". Confidence 5.
That is weighted degree. "Links (count)" counts each neighbor once, which is what I am told not
to do. I am assuming "value" on an edge is the number of shared chapters; the menu does not say
so, and I would check the edge column before trusting it.

## fc09 -- money received per account, in currency
Pick: "Total amount in -- the sum of amount over the edges coming into each node". Confidence 6.
In, not out, and amount, not count. Clear.

## fc10 -- load a nested JSON export from Downloads
Click: "Open project or file..." under Start. Confidence 6.
It is a file on my disk. The Research network sample looks like the same kind of thing, which
reassures me nested JSON is supported, but I would not click a sample to load my own file.

## fc11 -- swap April's export in for March under everything built
Click: Data in the left rail (cylinder icon). Confidence 4.
Data is where the source files should be listed, and I want to replace a source, not start a new
project. The "from 2 tables" link in the right panel is my second guess. The title dropdown
"Transfers, March 2026" is a third.

## fc12 -- apply a colleague's saved color scheme file
Click: the "..." menu beside "Find rows and notes" at the top of the Graph tree. Confidence 3.
A color scheme is a set of style rows, so importing should live with the rows. The hamburger at
top left is the other candidate (a file-level import). Nothing on screen says "import style".

## fc13 -- find the attribute for last security check among 69
Click: the "Find attribute" search box in the Attributes list. Confidence 6.
I would type "scan", "vuln" or "patch". I see cmdb_last_audited_at and I would not assume an
audit is a security scan.

## fc14 -- how many swipes pointed at no person or building
Click: the "from 3 tables" link in the right panel. Confidence 4.
That is the import provenance; dropped or unmatched rows should be reported there. If not, the
Data rail. The summary shows 14 isolated nodes, which is not the same thing and I would not
accept it as the answer.

## Overall
Icon-only bottom toolbar is the weak spot: I could name pause and the beaker, the rest I guessed.
Counts are labeled nodes versus edges, which I appreciate.
