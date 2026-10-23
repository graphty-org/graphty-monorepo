# Session r1-s06b -- Ruth, the reporter

Task: open the ready-made network of college football teams; make every team orange.

## Step 1 -- start
Command: `REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <folder> empty`
Screen (01.png): a front page, "Analyze any network." Big green "Open a file", plus "Open network data" and "Samples". A demo network spins on the right. Small line: "It never leaves your computer." Good. "Ready-made network" sounds like Samples.

## Step 2 -- Samples
Command: `--step <folder> --click "Samples"` -> refused, ambiguous (a button and a top-bar link share the name). Nothing happened (02.png).
Command: `--step <folder> --click-at 455,540` -> button "Samples" (03.png).
Screen: "Sample library", 19 real networks. Third card: "Conferences fall out of who played whom -- College football -- 115 nodes, 613 edges". That's it. 115 teams; I'll write that down.

## Step 3 -- open College football
Command: `--step <folder> --click-at 712,480` -> button "Open the College football sample" (04.png).
Screen: project "College football", "Local only" -- good. Right panel: Nodes 115, Edges 613. Matches the card. All teams are blue-purple balls. Left panel: "Style layers" with Hovered, Selected, and "Everything 115". "Everything" with 115 = all teams. I'll click it to see if it lets me set a color.

## Step 4 -- select the "Everything" layer
Command: `--step <folder> --click-at 126,216` -> treeitem "Everything, node and edge layer, 115 nodes, 613 edges" (05.png).
Screen: right panel says "Everything styles all 115 nodes: it is the base layer, under every other layer." Says who? Says the screen, and 115 matches. Fill > Color shows 6366F1 with a purple swatch -- that's the current blue. I'll replace that code with orange.

## Step 5 -- set the fill color to orange
Command: `--step <folder> --click-at 1320,483 --key Control+a --type "FFA500" --key Enter` -> input "Node color, set here, indigo" (06.png).
Screen: every ball on the canvas is now orange. The swatch next to the field is orange and reads FFA500. "Everything" still says 115. Autosave says saved, and Undo has lit up. I scanned the canvas: I can't see a single blue ball left. Is that all of them? The layer says 115 of 115, and the screen agrees.

## End (in character)
- Finished: yes. College football (115 teams, 613 games) is open and every team is orange (FFA500).
- Ease: 6 of 7. Samples -> the card -> the "Everything" layer -> the color box. Four clicks and a hex code.
- What confused me:
  - Two things called "Samples" (top bar link and the button on the front page). Harmless, but I had to pick one.
  - I had to guess that "Everything" in "Style layers" is where you color all nodes. The line "Everything styles all 115 nodes" only appears after you click it; before that it's just a word and a number.
  - The color box only shows a code (6366F1). I knew to type a hex code from spreadsheets; someone who doesn't would want a picker or a color name. I didn't try clicking the swatch, so I can't confirm whether it opens one.
  - "Everything" is a node *and* edge layer; I only changed the node color. Edges stayed gray, which is what I wanted.
