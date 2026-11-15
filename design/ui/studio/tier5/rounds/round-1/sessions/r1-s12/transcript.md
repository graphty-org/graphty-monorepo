# Session r1-s12 -- Analyst Alex (returning user)

Task: put Cedar Bend and every gauge within two stretches of river (up or down) in orange; report how many are orange.

## Step 1 -- start
Command: `REAL_DIST=... REAL_TIER=5 node design/ui/studio/tool/real.mjs --start <folder> setup:gauges-clean.txt`
Screenshot 01.png. The river project is open: 11 nodes, 13 edges, directed, one component. Counts match what I'd expect for the gauge sheet. Node table at the bottom lists Cedar Bend (0057). Style layers on the left: Hovered, Selected, Pinned, Everything.
Plan: find Cedar Bend, then look for a "within N steps" / neighbors selection. In Gephi I'd use an Ego Network filter with depth 2.

## Step 2 -- right-click Cedar Bend row
Command: `--step <folder> --rclick-at 644,608`
02.png: nothing happened, no context menu. Gephi would give me a menu here. Next: just left-click the row to select Cedar Bend.

## Step 3 -- click Cedar Bend row
Command: `--step <folder> --click-at 644,608`
03.png: Cedar Bend is selected, ringed in yellow on the canvas, Selected layer says 1. Right panel shows its values, degree 3. Next: the "..." menu next to Cedar Bend, hoping for "select neighbors" or similar.

## Step 4 -- Node actions menu
Command: `--step <folder> --click-at 1404,74`
04.png: menu with Neighborhood (G), Path between..., Frame selection, New layer from selection, Add note. "Neighborhood" sounds like Gephi's ego network. Clicking it.

## Step 5 -- Neighborhood
Command: `--step <folder> --click "Neighborhood"`
05.png: panel "Cedar Bend and 3 connections", Hops 1/2/3, Follow Out/In/All (All on). Selected = 4 (Cedar Bend, Fox Creek, Mill Pond, Quarry Pool). Header says "G03" which is odd -- I thought it was Cedar Bend. Follow All covers upriver and down. Next: Hops 2.

## Step 6 -- Hops 2
Command: `--step <folder> --click-at 1342,178`
06.png: "Cedar Bend and 6 connections": Fox Creek, Heron Marsh, Mill Pond, Old Bridge, Quarry Pool, Upper Falls. Selected layer = 7. Follow is All, so up and down river. Now color them: "..." menu -> "New layer from selection".

## Step 7 -- Neighborhood actions menu
Command: `--step <folder> --click-at 1404,74`
07.png: menu shows Frame selection and New layer from selection. Clicking New layer from selection.

## Step 8 -- New layer from selection
Command: `--step <folder> --click "New layer from selection"`
08.png: toast "Made a layer for the 7 selected nodes". A layer "7 nodes" appears in the left list, picked by hand, 7 of 11. Style panel has Shape, Visibility, Text, Fill, Shaders with + buttons. Next: + on Fill.

## Step 9 -- Add to node fill
Command: `--step <folder> --click-at 1404,381`
09.png: Fill now has a Color box, empty. Next: click the box and type #FF8C00.

## Step 10 -- type the color
Command: `--step <folder> --click-at 1318,415 --type "#FF8C00" --key Enter`
10.png: Color shows FF8C00 with an orange swatch. On the canvas 7 nodes are orange, 4 stay blue. A legend card top-left: "Color: 7 nodes -- 7 of 11 nodes". Next: click empty canvas to drop the selection and make sure the orange isn't just the selection highlight.

## Step 11 -- clear selection
Command: `--step <folder> --click-at 950,200`
11.png: Selected is back to 0, the 7 orange nodes stay orange, 4 blue. The "7 nodes" layer stays in the list and the legend card still says 7 of 11. Autosave: saved. Done.

## Wrap-up (in character)

Did I finish? Yes. 7 gauges are in orange: Cedar Bend plus Fox Creek, Heron Marsh, Mill Pond, Old Bridge, Quarry Pool and Upper Falls. That is everything up to two stretches away, upriver or down (Follow: All, Hops: 2).

Ease: 6 out of 7. About ten clicks, and nothing hung.

What took longest or confused me:
- Right-clicking the row in the table did nothing. I expected a menu there, like Gephi. The neighborhood option was hidden behind the small "..." in the side panel, and I only found it by poking around.
- After I clicked Neighborhood, the panel header changed to "G03" instead of "Cedar Bend". I had to check the "Back to Cedar Bend" link to be sure it was the same gauge. Seeing a raw id there makes me nervous.
- "Out / In / All" for Follow: I guessed that All means both up and down river. On a directed river it would help if it said which way is upstream. I went with All because the task says "upriver or down".
- The new layer is called "7 nodes". That's fine today, but next week I won't know what it was for. I'd want to name it "Cedar Bend spill".
- The layer is "picked by hand", so if the river data changes next month it won't redo the two-hop pick for me. I'd have to click through it again.
- Good: the count is right there in the legend card ("7 of 11 nodes") and in the layer row, so I can give the crew a number without counting dots.

## Follow-up

Facilitator: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen."

Alex: 3. Mostly calm -- once I found Neighborhood it was obvious: hops, follow, make a layer, set the fill. The moment I was least sure was right after I right-clicked the Cedar Bend row in the node table and nothing happened (screenshot 02). The screen was the plain river graph: 11 blue nodes on the canvas, the node table at the bottom with Cedar Bend's row, the style layer list on the left (Hovered, Selected, Pinned, Everything) and the right panel. No menu, no hint of where a "neighbors within N steps" option might live. I fell back to left-clicking the row, and even then the option was behind the small "..." at the top of the right panel, which I only opened because I was poking around. A smaller wobble came right after Neighborhood, when the panel header said "G03" instead of "Cedar Bend" and I had to check the "Back to Cedar Bend" link to be sure it was still my gauge.
