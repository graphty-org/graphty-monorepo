# Session r5-s15b -- Nadia, returning user

Task: friends.csv is open. Keep only pairs who ran together 4 or more times, say how many people are left, then bring the whole club back.

All commands use REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ and session folder tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s15b (shown below as $S).

## Step 1 (01.png, already started)
I see the running club network, 20 people colored by PageRank (left list says PageRank 20). Bottom toolbar has an icon that looks like a filter (three narrowing lines). I have never shown only part of a network, so I'll try that icon.
Command: `node $T/real.mjs --step $S --click-at 833,864` -> button "Filters", 02.png

## Step 2 (02.png)
A "New filter step" panel opened on the right: Keep "an attribute's value", Attribute (empty). Left side says friends.csv has 20 nodes, 41 edges; edges have a "weight" column -- that must be the run count. I'll open the Attribute list.
Command: `--step $S --click "Attribute"` -> 03.png

## Step 3 (03.png)
List shows Nodes: id, Edges: weight. Weight is the runs column. Picking weight.
Command: `--step $S --click "role=option:weight"` -> 04.png

## Step 4 (04.png)
Now: Attribute weight, Is "at least", Value empty. Note says "Keeps edges that pass and the nodes at their ends." Good -- that's exactly pairs and their people. Typing 4 in Value.
Command: `--step $S --click "Value" --type "4"` -> 05.png

## Step 5 (05.png)
Value reads 4, "Add step" turned blue. No preview of how many would remain -- I'll just click Add step.
Command: `--step $S --click "Add step"` -> 06.png

## Step 6 (06.png)
The drawing thinned out right away. Top bar reads "19 of 20 nodes, 12 of 41 edges"; the right panel says Nodes showing 19 of 20, Edges showing 12 of 41; the left Filters list has "weight is at least 4 -- 20 to 19 nodes, 41 to 12 edges" with a ticked box. So 19 people are still in it (I counted 19 balls on the canvas too; the one on the left middle is gone). Surprised it's almost everybody -- only one person had no pair at 4+. The legend now says "PageRank, full graph", which tells me the colors weren't recomputed; fine. Also the "Full graph" block still says 20 / 41, so I believe the data itself wasn't changed, only what's shown.
Now to bring the whole club back I'll untick the checkbox next to the filter rather than deleting it.
Command: `--step $S --click-at 274,247` -> input "Apply step: weight is at least 4", 07.png

## Step 7 (07.png)
All 20 back, 41 edges, the top-bar count is gone, and the filter is still listed as "weight is at least 4 -- off". Whole club is back and I can switch it on again later.
Command: `--end $S` -> the session asked for more: "Your club now asks the same for pairs who ran together 5 or more times. How many people are in the drawing then? Bring the whole club back when you are done."

## Step 8 (07.png still)
Rather than making a second filter, I'd like to change the 4 to a 5 on the one I have. I'll click the filter's name to see if it opens for editing.
Command: `--step $S --click-at 163,231` -> treeitem "weight is at least 4", 08.png

## Step 9 (08.png)
The right panel shows that filter with Value 4 and a button "Save and turn on". I'll replace the 4 with 5 (click the box, select all, type 5).
Command: `--step $S --click "Value" --key Control+a --type "5"` -> 09.png

## Step 10 (09.png)
Value now 5 (list still says "at least 4" until I save). Clicking "Save and turn on".
Command: `--step $S --click "Save and turn on"` -> 10.png

## Step 11 (10.png)
Top bar: "10 of 20 nodes, 5 of 41 edges"; the filter now reads "weight is at least 5 -- 20 to 10 nodes, 41 to 5 edges", ticked. So 10 people at 5+ runs. On the canvas I count 10 balls (two overlap at the bottom, which made me count twice). Now unticking the box again to bring the whole club back.
Command: `--step $S --click-at 274,247` -> input "Apply step: weight is at least 5", 11.png

## Step 12 (11.png)
All 20 people and 41 edges back; filter listed as "weight is at least 5 -- off". Done.
Command: `--end $S` -> session ended.

## Wrap-up (in character)
- Finished: yes. 4 or more runs together: 19 of the 20 people stay (12 of 41 pairs). 5 or more: 10 people (5 pairs). Whole club brought back both times by unticking the filter.
- Ease: 6 of 7. Under two minutes each time, which is inside my one-alert patience.
- What confused me / what I noticed:
  - The filter button sits in the bottom toolbar with an icon only; I guessed it from the shape. A word on it would have saved the guess.
  - No count before "Add step" -- I had to commit the filter to find out how many would be left. It was easy to undo, so not a real problem.
  - 19 of 20 surprised me at first; I checked by counting the balls, and two overlapping balls at the bottom nearly made me miscount. The top-bar "19 of 20 nodes" line is what I would actually trust and write down.
  - Changing 4 to 5 worked by clicking the filter in the list and editing it; the list kept saying "at least 4" until I pressed "Save and turn on", which was fine.
  - I liked that the right panel kept "Full graph 20 / 41" next to "showing", so I could tell the data was not changed, only the view. The legend's "PageRank, full graph" said the same about the colors.
  - For the flyer/case file I would still want to export this filtered picture with the count; I did not test that today.
