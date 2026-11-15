# Session r1-s17 transcript (Grace, returning)

## Step 1 (start)
Command: real.mjs --start <folder> setup:volunteers-shifts.txt
Seen: the shifts volunteer list is open. 24 nodes, 63 edges. Okay, that's the newer copy with shift counts. I narrowed things in the Data place last month, so I'll go there to drop the one-shift pairs.

## Step 2
Command: --step --click "Data"
Seen: Data place, one source with 24 people and 63 links. There is a Filters section with a plus. That's where I narrowed last time. I'll click its plus.

## Step 3
Command: --step --click-at 275,397 (Add filter)
Seen: a filter editor opened with Nodes / Edges and a list of node columns (name, role, hours...). The shifts are about pairs, so they must be on the links. I'll pick Edges.

## Step 4
Command: --step --click-at 1351,100 (Edges)
Seen: 63 of 63 links, table shows a "shifts" column (3, 1, 4, 3, 1...). Good. I'll open the Value list and pick shifts.

## Step 5
Command: --step --click-at 1279,124 (Value list)
Seen: list shows "shifts 1 to 5" under Data, plus rankings I don't need. Picking shifts.

## Step 6
Command: --step --click-at 1186,220 (shifts)
Seen: a range 1 to 5 with two boxes. More than one shift means 2 and up, so I'll put 2 in the first box.

## Step 7
Command: --step --click-at 1203,298 --key Control+a --type "2" --key Enter
Seen: "shifts min 2", 31 of 63 links kept, 32 "No match". Top bar: 24 of 24 nodes, 31 of 63 edges. 31 + 32 = 63, adds up. Clicking Done.

## Step 8
Command: --step --click "Done"
Seen: filter saved as "shifts min 2". Nodes showing 24 of 24, edges showing 31 of 63. The Degree box on the right now goes 1 to 5 (was 3 to 8), so it seems to count only the strong ties. Now I need orange on everyone with 3 or more. I've colored from the Style tab before, so I'll go to Style.

## Step 9
Command: --step --click "role=tab:Style"
Seen: this Style tab is background, lighting, labels -- the whole canvas, not the people. The Graph place had "Style layers" with a plus. I'll go back to Graph and add a layer there.

## Step 10
Command: --step --click-at 28,75 (Graph)
Seen: Style layers list (Hovered, Selected, Pinned, Everything) with a plus. I'll press the plus to add my own layer.

## Step 11
Command: --step --click-at 275,122 (Add a layer or a folder)
Seen: menu: Layer, Folder, Hover highlight, Analyze. I want to pick who gets a color, so "Layer".

## Step 12
Command: --step --click-at 178,158 (Layer)
Seen: "Layer 1" added, right panel shows "Which nodes 24 of 24 / All nodes", then Shape, Visibility, Text, Fill. I'll name it later; first click "Which nodes" to say who gets orange.

## Step 13
Command: --step --click-at 1261,206 (Which nodes)
Seen: the same picker as the filter, with node columns and "Degree" (number of connections, I remember). I'll pick Degree and check whether it counts only the strong ties.

## Step 14
Command: --step --click-at 949,340 (Degree)
Seen: Degree goes 1 to 5, same as the Values box after my filter, so it counts strong ties only. "More than two different people" = 3 or more. Typing 3 in the first box.

## Step 15
Command: --step --click-at 963,304 --key Control+a --type "3" --key Enter
Seen: "Degree min 3", 11 of 24 match, 13 no match (11 + 13 = 24). I counted the green dots on the picture: 3 + 4 + 4 = 11. Clicking Done, then I'll set the Fill to orange.

## Step 16
Command: --step --click "Done"
Seen: Layer 1 shows 11, "Degree min 3". Nothing colored yet. Clicking the plus next to Fill.

## Step 17
Command: --step --click-at 1404,401 (Add to node fill)
Seen: a Color box appeared, empty. I'll click it and type orange.

## Step 18
Command: --step --click-at 1320,435 --type "orange" --key Enter
Seen: it took the word "orange" (FFA500). A key card says "Color: Layer 1, 11 of 24 nodes". I counted the orange dots on the canvas: 3 top-left, 4 top-right, 4 bottom = 11. Counts still read 24 of 24 nodes, 31 of 63 edges. Done.

## End (in character)
Did I finish? Yes. 11 people are in orange: everyone with 3 or more partners they shared 2+ shifts with.

Ease: 6 out of 7. Filter on the links in the Data place, then a style layer with "Which nodes: Degree min 3", then Fill orange. Typing "orange" into the color box just worked, which I liked.

What confused me:
- The Style tab on the right (when nothing is picked) is about the whole canvas -- background, lighting -- not the people. I went there first because that's where I colored by a result before, and had to go back to Style layers on the Graph place.
- I had to guess that "Degree" in the layer's list counts only the links still showing after my filter. I trusted it only because its range changed from 3-8 to 1-5 after filtering. A plain line saying "counted on the 31 links showing" would let me defend the number to the board.
- "Degree" is a word I'd translate on a slide ("number of people they've worked with").
- The layer is called "Layer 1" and the key card says "Color: Layer 1" -- I'd want to rename it before a slide; nothing prompted me to.

## Follow-up
Facilitator: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen."

Grace: 2. Mostly calm -- I went to the Data place like last month, the filter told me 31 of 63 links kept, and the numbers added up every time. The moment I was least sure was right after I saved the "shifts min 2" filter and clicked the Style tab on the right to color people orange. Instead of anything about people, it showed background, lighting and labels -- settings for the whole canvas. Nothing there said who gets a color, and I had to stop and remember that the Graph place on the left had "Style layers" with a plus. A smaller wobble came after that, at "Which nodes": I picked "Degree" only because its range had dropped from 3-8 to 1-5, which made me guess it counted just the strong ties. Nothing on screen actually said so.
