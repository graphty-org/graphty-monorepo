# Session r4-s02 -- Ruth, returning (bus-stops.csv)

Session folder (screenshots, logs): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s02

Task: how many minutes does the Station-Stadium link take; then point out Station and Stadium only, so the next action applies to just those two.

## Start

Command: `REAL_DIST=.../tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs --start <session> setup:bus-stops-ranked-names.txt`

01.png: bus-stops open, ten stops with names drawn. Left panel: "Selection", "PageRank 10", "Everything". A legend top left for size and color by PageRank. Station at the top, Stadium just below it, a line between them with an arrowhead. Right side shows the style of "Everything". Nothing tells me minutes yet.

Ruth: "There's the Station-Stadium line. I'll click on the line itself and see what it says about it."

## Step 1 -- click the line between Station and Stadium

Command: `--step <session> --click-at 755,163` -> "edge with id 15"

02.png: the line turned blue. Right panel heading "Station -> Stadium", "Edge", Values tab: From Station, To Stadium, minutes 4. Left panel "Selection 1".

Ruth: "Four minutes. From Station, to Stadium, minutes 4 -- that's the column from the sheet, so I can check it against the row. Now the two stops: I'll click Station, then shift-click Stadium, the way you add to a selection everywhere else."

## Step 2 -- click Station

Command: `--step <session> --click "Station"`

03.png: Station has a yellow ring. Right panel: "Station", Node; id Station, Degree 3, PageRank 0.05495, #7 of 10. Selection 1. The edge is no longer selected.

Ruth: "Station alone is picked. Now shift-click Stadium to add it."

## Step 3 -- shift-click Stadium

Command: `--step <session> --shift-click "Stadium"` -> "clicked node Stadium on the canvas, at 726,221"

04.png: Station and Stadium both have yellow rings; no other stop does. Right panel: "2 nodes selected", Selection; Nodes 2, Edges joining these nodes 1. Left panel: Selection 2.

Ruth: "Two picked, and the one edge between them is the 4-minute one. That's what I was asked. I'm done."

## End

Command: `--end <session>`

Output: "session ended", the folder was copied here, and no further request was made.

## In my own words (Ruth)

- **Did I finish?** Yes. The Station-Stadium link takes 4 minutes: the right-hand panel said From Station, To Stadium, minutes 4 when I clicked the line. Station and Stadium are the only two stops picked: both have a ring, and the panel says 2 nodes selected, with 1 edge joining them.
- **Ease:** 6 of 7.
- **What confused me:**
  - When two stops are picked, the panel gives only counts ("Nodes 2", "Edges joining these nodes 1") and not their names. I had to trust the rings on the drawing to know which two they were. I want names, not dots, and I'd like the two names listed there.
  - Clicking a line on purpose is fiddly: the line is thin and runs close to the Depot-Station line. I hit the right one, but nothing on screen told me a line could be clicked before I tried.
  - The panel heading says "Station -> Stadium", but on the drawing the arrowhead near Station seemed to point at Station. I can't confirm which way the arrow on that line points; the panel's From and To is what I'd quote.
