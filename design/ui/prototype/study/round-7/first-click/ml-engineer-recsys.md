# First-click test -- Chris, ML engineer (recommendation systems)

Each answer: what I would click first, how sure I am (1 = guess, 7 = certain), and what I was thinking. I only looked at the still screen for each prompt.

## fc01 -- read a colleague's note on one circle of characters
Click: the little speech-bubble "1" next to Louvain (6 groups) in the left list. Confidence 4/7.
"Circle" is a Louvain community to me, and that row is the only group row with a comment count on it. Second guess would be the Notes row (4) or the Notes icon in the left rail, but that feels like it lists every note, not the one on the circle.

## fc02 -- how two selected characters connect through others
Click: the second icon in the small floating bar that appeared above the bottom toolbar -- the one that looks like a route (two dots joined by an S-shaped line). Confidence 5/7.
It is the same glyph as the "Shortest paths" row in the left list, so I read it as "path between these". That bar only showed up because two nodes are selected, which helps.

## fc03 -- make the drawing stop drifting
Click: the pause icon (two vertical bars) in the bottom toolbar. Confidence 6/7.
Layout simulation is running; pause stops it. Standard.

## fc04 -- go back to a saved angle from Monday
Click: Views (bookmark icon) in the left rail. Confidence 6/7.
A saved camera angle is a view/bookmark. Nothing else on screen fits.

## fc05 -- show what the colors mean
Click: the list icon (bulleted list, fourth button) in the bottom toolbar. Confidence 3/7.
There is no legend on screen. In the other screens that button was highlighted blue and a legend card sat top-left, so I am guessing it toggles the legend. If it is not that, I would go to the Style tab on the right.

## fc06 -- make the connections inside this circle dashed
Click: "Edges" next to "Nodes" in the right panel (under the Community 3 header). Confidence 5/7.
The panel is set to Nodes; dashing is an edge property, so switch to Edges and then look under Shape. Unclear whether "edges of the group" means edges between members only or any edge touching a member -- I would want the count it paints.

## fc07 -- write each character's name next to them
Click: the "+" on the "Label" row in the right panel. Confidence 4/7.
Label is right there. My doubt: the panel is showing the PageRank row, and I am not sure whether adding a label here labels everyone or only what PageRank paints (it says it paints all 77, so probably fine). I would have expected a label toggle on "Everything".

## fc08 -- per-character count of shared chapters, weighted
Pick: "Total value" (the sum of value over each node's edges). Confidence 5/7.
That is weighted degree / node strength. "Links (count)" is plain degree, which counts each neighbor once. I am assuming "value" on the edge is the number of shared chapters -- the right panel says Weight is "value", so that supports it, but the menu line itself does not say what value is.

## fc09 -- money received per account, in currency
Pick: "Total amount in". Confidence 6/7.
Directed graph, weighted by amount, incoming edges summed. "Links in (count)" is the number-of-payments trap.

## fc10 -- bring in a nested JSON export from Downloads
Click: "Open project or file..." (Ctrl+O). Confidence 4/7.
It is a file on disk, so open file. "New from data..." might be the importer, but "open file" is what I reach for first; I would expect it to detect JSON and ask me what becomes a node. Dragging the file onto the window is the other option.

## fc11 -- swap March's export for April's under everything built
Click: Data (database icon) in the left rail. Confidence 4/7.
Replacing the source is a data job, and I expect the Data section to list the source files with a replace action. Second choice: the "from 2 tables" link in the right panel.

## fc12 -- apply a colleague's saved color scheme
Click: the hamburger menu (three lines) at the top left. Confidence 2/7.
Honestly guessing. I am looking for some kind of File > Import style. No visible control on this screen says "style" or "theme" except the Style tab on the right, which edits one row. If the menu does not have it I would try the "..." next to the search box in the left panel.

## fc13 -- find the "last security check" attribute among 69
Click: the "Find attribute" search box in the left panel, then type "scan" / "vuln" / "patch". Confidence 6/7.
Not scrolling 69 columns. The risk is the column is named something I do not guess -- "cmdb_last_audited_at" is visible but audited is not quite the same as security scan.

## fc14 -- how many swipes pointed at no known person or building
Click: the "from 3 tables" link in the right panel header. Confidence 3/7.
I want the import report: rows read, rows dropped or unmatched. The summary shows 14 isolated nodes, which is not the same thing (those are people with no swipes, not swipes with no person). If the link does not show load stats I would go to the Data rail.

## Overall
The screens are dense but numbers are where I want them (nodes, edges, direction, weight on the right). The icon-only bottom toolbar is the weak spot: I could not tell legend from layer list from anything else without tooltips. Weighted versus unweighted degree is handled well by naming -- "Total amount in" vs "Links in (count)" is exactly the distinction I care about.
