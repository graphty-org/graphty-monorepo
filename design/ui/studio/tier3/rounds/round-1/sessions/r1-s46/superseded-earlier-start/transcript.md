# Session r1-s46 -- Analyst Alex

Task: open the ready-made network of Zachary's karate club, and make every member yellow.

## Step 1 -- start
Command: REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <folder> empty
Screen (01.png): landing page. "Analyze any network. Free and open source." Line under Open a file says "It never leaves your computer." -- good, that answers my data question, and it's free/MIT. There's a "Samples" button. Karate club should be a sample.

## Step 2 -- click the Samples button
Thinking: "It says nothing leaves my computer and it's free. Fine. Samples button in the card -- karate club is the classic, it'll be there."
Command: --step --click "Samples#2"  (tool refused: ambiguous by kind, nothing happened; 02.png unchanged)
Command: --step --click "role=button:Samples"
Screen (03.png): Sample library. Second card: "A club that split in two -- Zachary's karate club -- 34 nodes, 78 edges". 34 and 78, that's the right counts.

## Step 3 -- open the karate club card
Thinking: "Titles are a bit cute but the subtitle has the real name and counts. Clicking it."
Command: --step --click-at 447,480
Screen (04.png): karate club open, all nodes blue-purple. Right panel: Nodes 34, Edges 78, Components 1. Counts match. Left: "Style layers" with Hovered, Selected, Everything (34). "Local only" at the top, good.

## Step 4 -- select the "Everything" row
Thinking: "'Style layers' is a bit developer-ish, but 'Everything 34' is obviously all 34 members. Click it and hope the Style tab on the right lets me set a colour."
Command: --step --click "Everything"
Screen (05.png): Everything selected; right panel shows Style > Node, "Everything styles all 34 nodes". Fill > Color 6366F1 with a purple swatch.

## Step 5 -- click the colour swatch
Thinking: "There it is, Fill colour. I'll click the little swatch and see if I get a picker with a yellow."
Command: --step --click-at 1268,483
Screen (06.png): a Color picker popover: gradient, hue bar, Hex 6366F1, and five preset swatches at the bottom -- purple, grey, blue, yellow, black.

## Step 6 -- click the yellow preset swatch
Thinking: "Fourth swatch is yellow. Click it."
Command: --step --click-at 1055,845
