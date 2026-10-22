# Session r4-s04 -- Grace, returning

Session folder (screenshots, logs): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s04/
Build: tier2-r4d1-5277e2cbe

Command used for every step (REAL_DIST set to the frozen build):

    REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs <args> tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s04

## Start

`--start ... setup:bus-stops-ranked-names.txt` -> 01.png

Grace: Okay, the bus map is open, every stop has its name. Ten stops, a PageRank key in the corner,
big dark Harbor in the middle. I see Station at the top and Stadium just under it, with a short line
between them. I want the minutes on that line. Last time clicking a thing showed it on the right, so
I'll click the line itself.

## Step 1

`--click-at 754,168` -> 02.png. Tool: "node Stadium".

Grace: Missed the line and got Stadium instead -- it's glowing and the right side says Stadium, degree 3,
PageRank #4 of 10. No minutes. That's fine, last time I read someone's list of connections; the
Degree row has an arrow. I'll open that and look for Station in it.

## Step 2

`--click-at 1410,210` (the arrow on Degree) -> 03.png.

Grace: It turned into "Stadium and 3 connections": Harbor, School, Station. Station is in there, good,
but just the names -- no minutes. And the Selection count went from 1 to 4, so it picked the
neighbors too, which I didn't ask for. I still want the line. I'll try clicking exactly on the short
line between Stadium and Station, above Stadium's name tag this time.

## Step 3

`--hover-at 762,150` -> 04.png. Tool: an edge, pointer cursor, no tooltip.

Grace: The pointer turns to a hand on the line, so it's clickable. No little pop-up with the minutes,
though. Clicking it.

## Step 4

`--click-at 762,150` -> 05.png. Tool: edge.

Grace: There it is. The line turned blue and the right side says "Station -> Stadium, Edge", From Station,
To Stadium, minutes 4. So that link takes 4 minutes. Nice and plain.

Now I need just the two stops picked, Station and Stadium, nothing else. Selection says 1 right now
(the line). I'll click Station, then hold Shift and click Stadium -- that's how you add to a pick in
most programs.

## Step 5

`--click-at 777,118` -> 06.png. Tool: node Station.

Grace: Station is glowing, the right side says Station, and Selection says 1. The line isn't picked any
more, good. Now Shift and click Stadium's dot.

## Step 6

`--shift-click "Stadium"` -> 07.png. Tool: clicked node Stadium at 726,221.

Grace: "2 nodes selected". Station and Stadium both glow, Selection says 2, Nodes 2, "Edges joining
these nodes 1". Nothing else is lit. That's exactly the two stops. Done.

## End

`--end` -> session ended, no further request.

## In character, at the end

- **Did you finish?** Yes. The Station -> Stadium link takes **4 minutes** (right-hand panel: From
  Station, To Stadium, minutes 4). Then Station and Stadium alone were picked: "2 nodes selected",
  Selection 2, one edge joining them.
- **Ease: 5 of 7.**
- **What confused me:**
  - My first click on the line landed on Stadium instead: Stadium's name tag sits right on top of the
    short line, so there's very little line left to hit. I only found the line by aiming above the tag.
  - Hovering the line showed a hand pointer but no pop-up; I had to click to see the minutes.
  - Opening Stadium's list of connections (the arrow next to Degree) quietly picked all four stops --
    Selection jumped from 1 to 4 -- and the list shows only names, not the minutes on each link. I
    expected reading a list not to change what's picked.
  - Shift-click to add a second stop worked the way I expected, and "Edges joining these nodes 1" told
    me plainly the two were linked.
