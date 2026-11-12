# Session r4-s06 -- Dana Okafor (returning user)

Session folder (screenshots, logs): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s06

## Start

    REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs --start <session> setup:bus-stops-ranked-names.txt

01.png: bus-stops.csv is open. Ten stops, all named on the drawing, sized and colored by PageRank. Station at the top, Stadium just under it, a short line between them. Right panel shows Style for "Everything".

Dana: "OK, a colleague's bus file. Station and Stadium are right there at the top with a line between them. I want the minutes on that line. I'll hover over the line first -- in Power BI hovering gives you the number."

## Step 2

    --hover-at 752,165

02.png: no change. Tool says I was over the Stadium node, pointer cursor, no tooltip. Nothing popped up.

Dana: "Nothing. The line is tiny, it's mostly hidden behind the Stadium ball. Let me click right on the little bit of line between the two balls."

## Step 3

    --click-at 763,148

03.png: the link turned blue (selected). Right panel title "Station -> Stadium", Edge, Values tab: From Station, To Stadium, minutes 4. Left list shows "Selection 1".

Dana: "There it is: 4 minutes, Station to Stadium. Good, that's a table I can read. Now I need just the two stops picked, not the line. I'll click Station, then shift-click Stadium -- that's how Excel adds to a selection."

## Step 4

    --click "Station"

04.png: Station has a yellow ring. The line is no longer blue. Right panel: Station, Node, id Station, Degree 3, PageRank 0.05495, #7 of 10. Left list "Selection 1".

Dana: "Station's picked, and the line dropped out on its own -- fine. Now shift-click Stadium to add it."

## Step 5

    --shift-click "Stadium"

05.png: Station and Stadium both have yellow rings, nothing else does. Right panel "2 nodes selected", Selection: Nodes 2, Edges joining these nodes 1. Left list "Selection 2".

Dana: "Two stops picked, Station and Stadium, nothing else. That's what I wanted. Done."

## End

    --end

Session ended normally; the browser was freed.

## In character, afterwards

- **Finished?** Yes. The Station-Stadium link takes **4 minutes**. Station and Stadium are the only two stops picked: the panel says "2 nodes selected".
- **Ease:** 6 of 7.
- **What confused me:** That link is very short and mostly hidden behind the Stadium ball. Hovering over it showed nothing, and the pointer only told me I was on Stadium. I had to aim at the sliver of line between the two balls to get it. After that the panel was clear: From, To, minutes 4, like a little table. Shift-click to add a second stop worked the way it does in Excel. I would have liked hovering over a line to show its minutes.
