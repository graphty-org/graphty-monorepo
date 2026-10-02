# First-click test -- Morgan Reyes (screen-reader analyst)

Morgan works by screen reader and keyboard. For a still picture they answer as if a sighted
colleague read them the screen top to bottom, and they pick the thing whose name they would hear
first that sounds right. Confidence is 1 (pure guess) to 7 (certain).

## fc01 -- read a colleague's note about one circle of characters
Click: the "Notes" row (count 4) near the top of the left list, under "Selection". Confidence 4.
"The word I'm listening for is 'notes', and that row says it with a count. There's a little
speech-bubble '1' on the Louvain row too, but if that's an unlabeled badge it'll read as '1' and
nothing else. I go for the thing that says its name."

## fc02 -- how two selected characters connect through others
Click: the second icon in the small toolbar that appeared over the drawing (the one that looks
like a winding route with two ends, same icon as the "Shortest paths" rows). Confidence 4.
"The 2-nodes panel on the right only tells me why they look the way they look. The route icon
matches the shortest-paths rows, so that's my guess. If its name is just 'button' I'm done."

## fc03 -- stop the drawing drifting
Click: the pause icon (two vertical bars) in the bottom toolbar. Confidence 6.
"Two bars is pause everywhere. I'd want it to say 'pause layout', not just 'pause'."

## fc04 -- go back to Monday's saved angle
Click: "Views" in the left rail (bookmark icon). Confidence 5.
"A saved angle is a view. That's the only word on screen that fits."

## fc05 -- show what the colors mean
Click: the list icon in the bottom toolbar (the one that is blue/pressed in the other screens,
not pressed here). Confidence 3.
"I don't use colors, so I don't know where a legend lives. The other screens had a box in the
corner listing 'Color: PageRank' and that icon was lit. Here it's off and the box is gone. Guess.
And whatever the colors mean, I'd rather the same thing were in the Summary as text."

## fc06 -- dashed connections for this circle
Click: "Edges" next to "Nodes" in the Community 3 panel on the right. Confidence 5.
"Connections are edges. The panel is about this community, and it has a Nodes / Edges switch.
Dashed would be under Shape after that, I assume."

## fc07 -- show each character's name next to them
Click: the "+" beside "Label" in the right panel. Confidence 3.
"Label is the obvious word. But the panel is about PageRank, which is selected. Am I adding labels
to PageRank? That's odd. I'd want to put it on 'Everything', and I'm not sure this is where that
goes. Clicking it anyway."

## fc08 -- count every shared chapter, weighted
Pick: "Total value -- The sum of value over each node's edges." Confidence 5.
"'Links (count)' is plain degree, one per neighbor. Weight on this graph is 'value', so the sum
of value is weighted degree -- strength, in NetworkX terms. I'd still want it to say whether a
self-loop counts twice."

## fc09 -- money received, in currency
Pick: "Total amount in -- The sum of amount over the edges coming into each node." Confidence 6.
"Directed graph, weight is amount, 'in' means received. The description ends in '...' though; I
hope the full sentence is readable, not just in a tooltip."

## fc10 -- bring in the nested JSON export from Downloads
Click: "Open project or file..." (Ctrl+O). Confidence 4.
"It's a file, so 'open file'. 'New from data...' might be the right one, I can't tell those two
apart from the names. I'm reassured by 'Files are read on this computer and never uploaded' --
that's the first thing I'd ask."

## fc11 -- swap March for April under everything built
Click: "Data" in the left rail. Confidence 4.
"Nothing on the Graph view says where the data came from except 'from 2 tables' on the right.
Data is where I'd expect the source files. Could also be that link. Data first."

## fc12 -- apply a colleague's saved color scheme
Click: the menu icon (three horizontal lines) at the very top left. Confidence 2.
"A file from someone else -- import is usually in the main menu. Nothing on screen says 'theme' or
'scheme' or 'import'. This is a guess, and the second dead end ends it for me."

## fc13 -- find the last-security-check attribute among 69
Click: the "Find attribute" search box under Attributes. Confidence 6.
"I'm not reading 69 names. Type 'audit' or 'scan' and see what's left. I can see
cmdb_last_audited_at in the list already, but 'audited' isn't 'security' -- I'd check its values
before believing it."

## fc14 -- how many door swipes matched no person or building
Click: the "from 3 tables" link at the top of the right panel. Confidence 3.
"That's the only thing that talks about where the data came in from. 'Isolated nodes 14' is
something else -- those are things with no swipes, not swipes with no thing. If the import
dropped rows, I want a number in words, and I'd expect it on that link. Otherwise Data on the
left."
