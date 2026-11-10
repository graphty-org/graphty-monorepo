# Session r1-s27 -- Analyst Alex (returning user)

Task: make the Grants department people orange in the 50,000-person staff network, and say how many are orange.

## Step 0 -- start
Command: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-1e123d7d33 REAL_TIER=5 node .../design/ui/studio/tool/real.mjs --start <session folder> setup:staff-50k.txt
Screen 01.png: my staff-50k project is open. 50,000 nodes, 100,000 edges, all blue, a random square. Left panel has "Style layers" with a "+". Status bar says "Local only" -- good.
Plan: add a style layer with the "+" next to Style layers, pick the Grants department, color it orange.

## Step 1
Command: --step <folder> --hover-icon 1
Wanted to check what the little icons are; that was just "Main menu". Not useful. Screenshot 02.png.

## Step 2
I'll just click the "+" next to Style layers.
Command: --step <folder> --click-at 276,122
Result 03.png: a menu with Layer, Folder, Hover highlight, Analyze... "Layer" is what I want.

## Step 3
Click "Layer".
Command: --step <folder> --click Layer
Result 04.png: "Layer 1" added, name box is selected for typing. Right panel: "Which nodes 50k of 50k / All nodes", Shape, Visibility, Text, Fill...
Plan: name it "Grants", then set Which nodes.

## Step 4
Command: --step <folder> --type "Grants" --key Enter --click "Which nodes"
Result 05.png: a big "Which nodes -- Grants" editor opened with a Value... list already open: Node id, name, dept (40 values), Degree, plus algorithms. Table below shows dept column, n4 is "Grants". 
Plan: pick dept.

## Step 5
Command: --step <folder> --click "dept"
Result 06.png: tool said the name was ambiguous, nothing happened. I'll just point at "dept" in the list.

## Step 6
Command: --step <folder> --click-at 943,244
Result 07.png: dept picked; checkboxes with counts per department (Facilities 11,575 ...), "32 more", and a "Search 40" box with focus. Grants is not in the top 8.

## Step 7
Command: --step <folder> --type "Grants"
Result 08.png: one match: Grants, 1,076. Tick it.

## Step 8
Command: --step <folder> --click-at 903,217
Result 09.png: "Which nodes -- Grants 1,076 of 50,000", "No match 48,924", table now lists only Grants people. Counts add up (1,076 + 48,924 = 50,000). Good.
Plan: Done, then add a Fill.

## Step 9
Command: --step <folder> --click Done --click-at 1404,369
(Only ran --click Done.) Result 10.png: back to the graph, layer "Grants 1,076" in the list. Nothing colored yet. Now Fill "+".

## Step 10
Command: --step <folder> --click-at 1404,401
Result 11.png: Fill now has a Color box, empty, looks highlighted. I'll type orange into it.

## Step 11
Command: --step <folder> --type "orange" --key Enter
Result 12.png: "orange" turned into FFA500 and the Grants people are orange on the canvas. A legend popped up top-left: "Color: Grants -- 1,076 of 50,000 nodes". Layer list also says Grants 1,076. Stopping here.

## Wrap-up (in character)
- Finished: yes. 1,076 people are in orange (the Grants department), out of 50,000.
- Ease: 6 out of 7. About six real clicks: + > Layer > Which nodes > dept > search "Grants" and tick > Done > Fill + > type orange. That is right at my "too many clicks for a weekly thing" limit, but I would only do this once per client.
- What I liked: the count is shown in three places (the filter header "1,076 of 50,000", the layer row, and the legend), and 1,076 + 48,924 "No match" adds up to 50,000, so I trust it. Typing the word "orange" just worked. "Local only" in the corner is reassuring.
- What confused or bothered me:
  - The "Which nodes" editor jumps into a whole new full-screen view with a green preview and buttons like "Group colors", "Styled", "Clear" that I did not need; a bit much for picking one department.
  - Grants was not in the first 8 departments shown ("32 more"); I had to search. Fine, but I would not have found it by scrolling quickly.
  - On the drawing, a lot of the orange dots are buried under blue ones in this random square, so "stand out" is only half true at this size. For the meeting I would want the orange ones on top or the others faded, and I am not sure where that is.
  - The new layer opened with its name already in edit mode; nice, but I nearly missed that I was typing a name.

## Follow-up
Q (facilitator): On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen.

A: 3. Mostly calm -- I had a plan from the first screen (+ next to Style layers, pick Grants, make it orange) and the program let me follow it. The moment I was least sure was right after I clicked "Which nodes" (05.png). The whole middle of the screen changed into a different view: a big green preview of all 50,000 nodes, a "Which nodes -- Grants 50,000 of 50,000" header, buttons across the top I had not asked for ("Group colors", "Styled", "Table", "Clear", "Cancel", "Done"), a left column with a "Value..." box, a table at the bottom, and a dropdown open on the right listing Node id, name, dept (40 values), Degree, then Betweenness, Closeness, PageRank. My eyes went back and forth between the left "Value..." box and the right dropdown, because they looked like two places to do the same thing, and I was not sure if I had left my layer or if the green meant something had already been applied. I worked out that "dept" in the dropdown was the thing to pick, but for a few seconds I was reading the screen instead of doing the task. After I picked dept and searched for Grants, it was calm again.
