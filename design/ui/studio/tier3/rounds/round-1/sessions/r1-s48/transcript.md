# Session r1-s48 -- Ruth, the reporter

Task: open the ready-made network of Zachary's karate club, and make every member yellow.

## Step 1 -- start
Command: `REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <folder> empty` -> 01.png
Seen: a landing page, "Analyze any network." A big "Open a file" button, "Open network data", "Samples", "New project". A demo graph on the right, colored by community. The small print says a file never leaves my computer -- good.
Next: "Samples" is where a ready-made network should be. Clicking it.

## Step 2 -- Samples (ambiguous)
Command: `--step <folder> --click "Samples"` -> 02.png
Result: refused as ambiguous: the top-bar "Samples" link and the green "Samples" button share a name. Nothing happened.

## Step 3 -- Samples button
Command: `--step <folder> --click "role=button:Samples"` -> 03.png
Seen: "Sample library", 19 real networks. Second card: "A club that split in two -- Zachary's karate club -- 34 nodes, 78 edges". 34 members, 78 ties: I write that down.
Next: click that card.

## Step 4 -- open the karate club
Command: `--step <folder> --click-at 447,410` (the card, "Open the Zachary's karate club sample") -> 04.png
Seen: the network is open, all nodes blue-purple. Right panel says Nodes 34, Edges 78 -- matches the card. "Local only" at the top, good. Left panel: "Style layers" with Hovered 0, Selected 0, Everything 34. "Everything 34" -- 34 is all the members.
Next: click "Everything" to see if I can set its color there.

## Step 5 -- the Everything layer
Command: `--step <folder> --click "Everything"` -> 05.png
Seen: right panel now shows "Everything", Style tab, Node. It says in plain words: "Everything styles all 34 nodes: it is the base layer, under every other layer." That answers "is that all of them?" -- 34, yes. Under Fill, Color 6366F1 (the current blue).
Next: click the color code box, replace it with yellow, FFFF00.

## Step 6 -- set the color to yellow
Command: `--step <folder> --click-at 1320,483 --key Control+a --type "FFFF00" --key Enter` (the box is "Node color, set here, indigo") -> 06.png
Seen: every ball on the canvas is yellow. The box reads FFFF00 with a yellow swatch. Autosave says saved. The layer still says "Everything 34". No node left blue that I can see. I did not count each ball on screen one by one, so "all 34" rests on the layer's own count, which says it styles all 34 nodes -- and the overview said 34 nodes.
Stopping here: the task is done.

## Wrap-up (Ruth)
- Finished: yes. The karate club sample is open (34 nodes, 78 edges, matching the card) and every member is yellow.
- Ease: 6 of 7.
- What went well: the sample card said up front how many nodes and edges, and the network panel repeated the same numbers, so I could check arrival. The "Everything" layer told me in plain words that it styles all 34 nodes -- that saved me a count. "Local only" up top is reassuring.
- What confused me:
  - Two things called "Samples" on the first page (a top link and a green button). Not a real problem, but I had to pick one.
  - "Style layers" with "Hovered / Selected / Everything" is jargon: I only guessed "Everything" meant all nodes because of the 34 beside it. Nothing on the main screen says "click here to change colors".
  - The color is set by typing a hex code (6366F1). I know FFFF00 is yellow, but a colleague would not; I did not try the swatch, so I can't say whether a picker opens from it.
  - The box's spoken name "Node color, set here, indigo" calls the color "indigo"; the screen only shows the code.

## Follow-up

Facilitator: "The coach liked the picture better the way it was when you opened it. Put it back exactly as it was."

Steps:
- `--step <folder> --wait 300` -> 07.png: still as I left it, every ball yellow, Fill Color FFFF00.
- `--step <folder> --click-at 237,20` (the curved-arrow button by the title; it says "Undo changing node color on Everything") -> 08.png

Ruth: "Fine. I wrote the old code down when I started: 6366F1. I didn't have to retype it -- the back arrow next to the title named exactly what it would undo, 'changing node color on Everything', and that was my only change. One click. Now every ball is the blue-purple again, the Color box reads 6366F1 -- the same code I noted at the start -- and a notice said 'Undid changing node color on Everything.' The arrow now says 'Nothing to undo', which tells me there was nothing else I changed. The layer still says Everything 34. So yes, it's back as it was when I opened it: same color, same count. What I can't confirm is the camera angle or the node positions to the pixel -- I never moved them, and the picture looks the same to me as 04.png, but I didn't measure it. Credit where due: an undo that says what it undoes saved me a check."
