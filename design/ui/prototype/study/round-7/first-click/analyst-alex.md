# First-click test -- Analyst Alex

Participant: Alex, data analyst, knows Gephi and NetworkX, reads button names and numbers, skips paragraphs.
Each answer: what I would click first, how sure I am (1 = guessing, 7 = certain), and what I was thinking.

## fc01 -- read a colleague's note about one circle of characters
Click: "Notes" in the far-left icon strip (speech-bubble icon). Sureness: 4.
"Somebody wrote something down -- that's a note, and there's a big button called Notes. There's also a 'Notes 4' row in the list. I did see a tiny bubble with a 1 next to Louvain, which might be the note on a group, but it's small and I wouldn't bet on it. I'd go to Notes and look for the one about a group."

## fc02 -- how two selected characters are connected through others
Click: the second icon in the little floating bar above the main toolbar -- the one that looks like a route, two dots joined by a winding line. Sureness: 5.
"That looks like a path icon, and there's already a 'Shortest paths' section on the left with the same icon. Two people selected, how are they connected -- that's shortest path. The target icon next to it could be 'neighbors' but I'd try the route first."

## fc03 -- make the drifting drawing hold still
Click: the pause button (two vertical bars) in the bottom toolbar. Sureness: 6.
"It's moving, there's a pause button. That's the layout still running. Same as stopping ForceAtlas in Gephi."

## fc04 -- go back to the angle saved on Monday for a meeting
Click: "Views" in the far-left strip (bookmark icon). Sureness: 5.
"A saved angle is a bookmark, and the bookmark is labelled Views. Only thing on screen that sounds like saved camera positions."

## fc05 -- show what the colors mean
Click: the bulleted-list icon in the bottom toolbar (fourth button). Sureness: 4.
"There's no legend on screen, which bugs me. That list icon is the closest thing to 'legend'. Could also be some list of layers, but I'd try it. If not that, I'd click PageRank on the left since that's what it's colored by."

## fc06 -- make this circle's connections dashed
Click: the "Edges" tab in the right panel, next to "Nodes", under "Community 3". Sureness: 5.
"Community 3 is already picked on the right. Its connections are edges, and there's an Edges tab right there next to Nodes. Dashed would be under Shape probably, once I'm on Edges."

## fc07 -- write each character's name next to them
Click: "Label" with the plus, in the right panel. Sureness: 5.
"Label, plus. That's literally what it says. Though this panel is about PageRank, so I'm not totally sure it labels every node and not just something PageRank-y. Some names already show; I want all of them."

## fc08 -- count every shared chapter, a character met in five chapters counts five times
Pick: "Total value -- The sum of value over each node's edges." Sureness: 4.
"That's weighted degree. 'Links (count)' would count each pair once, that's the trap. I'm assuming 'value' on an edge is the number of chapters -- the summary on the right says weight is 'value', so probably. I'd want to check one number in the table before I trusted it."

## fc09 -- money each account received, in currency not number of payments
Pick: "Total amount in -- The sum of amount over the edges coming into each node." Sureness: 6.
"Received is in, money is amount, not 'Links in (count)'. Easy one. The hash mark on the right I don't know, doesn't matter."

## fc10 -- bring in a nested export from Downloads
Click: "Open project or file..." Sureness: 5.
"It's a file in Downloads, so Open file. 'New from data' could also be it, honestly I can't tell the difference from here. Good that it says files are never uploaded, that's the first thing I'd look for. The 'Research network (nested JSON)' sample looks like the same shape, but it's a sample, not my file."

## fc11 -- swap March's export for April's, keep everything built on it
Click: "Data" in the far-left strip (cylinder icon). Sureness: 3.
"I want to replace the data underneath, so Data. I'm nervous about this one -- this is exactly where Gephi lost my colors. I half-expected a 'replace' or 'update data' button somewhere obvious. Second guess would be the 'from 2 tables' link up on the right, or the menu up top."

## fc12 -- use a colleague's saved color scheme
Click: the menu icon (three horizontal lines) at the top-left. Sureness: 3.
"It's a file somebody sent, so I'd look for Import in the main menu. Nothing on screen says 'theme' or 'scheme' or 'import style'. Could be under the dots next to the search box on the left. Pure guess."

## fc13 -- find the column for when a host was last security-checked
Click: the "Find attribute" search box on the left, then type "scan" or "vuln". Sureness: 5.
"69 columns, I'm not scrolling. I see cmdb_last_audited_at, but audited isn't necessarily security -- could be an asset audit. I'd search first and see what comes up."

## fc14 -- how many door swipes pointed at nobody on the lists at import
Click: the "from 3 tables" link at the top of the right panel. Sureness: 3.
"It's about what happened when the data came in, and that link is the only thing that points back at the import. I'd hope for an import report with dropped or unmatched rows. Isolated nodes 14 is there but that's not the same thing. If the link doesn't help, Data on the left."

## Overall
- Most confident: pause (fc03), money in (fc09).
- Least confident: replacing last month's data (fc11), the colleague's color scheme (fc12), unmatched swipes (fc14). None of those had a word on screen that matched what I wanted to do.
- No legend visible on fc05 annoyed me; I want it on by default.
