# Session r1-s05 transcript (Grace, returning)

Task: for the board's evening reception, keep only board members and anyone who gave 30 hours or longer this quarter in the picture, without deleting anyone. Report how many people are still in the picture.

## Start
Command: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-1e123d7d33 REAL_TIER=5 node .../design/ui/studio/tool/real.mjs --start .../r1-s05 setup:volunteers.txt
Screenshot 01.png: the volunteers project is open. 24 nodes, 63 edges, colored by PageRank. Left rail: Graph, Data, Notes.
Grace: "Okay, volunteer list, 24 people, 63 ties. Last time I narrowed it to the trained people from the Data place, so I'll go there first."

## Step 1
Command: --step --click "Data"
Screenshot 02.png: Data place. Data sources: volunteers.graphml 24 nodes, 63 edges. Attributes (collapsed), Filters with a + button.
Grace: "There's Filters, that's what I used for the trained people. Click the plus."

## Step 2
Command: --step --click-at 276,333 (button "Add filter")
Screenshot 03.png: a "New filter" editor, 24 of 24. A list of columns: Node id, name, role (3 values), hours (2 to 52), trained, phone, Degree. Table below shows role and hours.
Grace: "Good, role and hours are both columns. Board is a role. I'll pick role first."

## Step 3
Command: --step --click-at 1181,268 (option "role, 3 values")
Screenshot 04.png: role values with checkboxes: volunteer 16, staff 5, board 3. Above: "Condition...", "Or...", an "Except" switch.
Grace: "16 plus 5 plus 3 is 24, good. Tick board."

## Step 4
Command: --step --click "board"
Screenshot 05.png: "3 of 24 nodes, 1 of 63 edges". Table shows Maria Lopez, Seun Okoro, Paul Dubois, all board. Left list: "role board", "No match 21".
Grace: "Three board members, right. Now I need 'or anyone with 30 hours'. There's an 'Or...' at the top, that sounds exactly like it."

## Step 5
Command: --step --click "Or..."
Screenshot 06.png: left list now shows group A (role board, 3), "or" group B (Value..., 0), No match 21. The column list is open again.
Grace: "Group A and group B, joined by 'or'. Fine. B is the hours one. Pick hours."

## Step 6
Command: --step --click-at 1186,268 (option "hours, 2 to 52")
Screenshot 07.png: hours, "By value", a slider 2 to 52, two boxes "2" to "52". B shows 0 so far.
Grace: "From 2 to 52. I want 30 and up, so change the 2 to 30 and leave 52."

## Step 7
Command: --step --click-at 1203,274 --key Control+a --type "30" --key Tab
Screenshot 08.png: "hours min 30", B 7, A 3, No match 14. Top bar: "10 of 24 nodes, 14 of 63 edges". Table lists group A board members and group B people with 48, 31, 52 hours.
Grace: "3 board plus 7 with 30 hours or more is 10, and 14 left out; 10 plus 14 is 24, so nobody fell through. None of the board has 30 hours, so nobody is counted twice. 'min 30' I read as 30 or more. Click Done."

## Step 8
Command: --step --click "Done"
Screenshot 09.png: the picture shows only 10 people. Right panel: "Nodes showing 10 of 24", "Edges showing 14 of 63"; "Full graph: Nodes 24, Edges 63", so nobody was deleted. Filter card in the left panel: "role board" A 3, or B 7 "hours min 30". Colors are still PageRank ("Color: PageRank, full graph").
Grace: "Ten people in the picture, the full graph still says 24, so nobody's deleted. And the X up top should bring everyone back after the reception. Done."

## End (in character)
- Finished: yes. 10 people are still in the picture (3 board members and 7 people with 30 hours or more); the other 14 are out of the picture but still in the data (full graph 24 nodes, 63 edges).
- Ease: 6 of 7. Filters in the Data place were where I remembered, the columns were plain (role, hours), the counts added up (3 + 7 + 14 = 24) at every step.
- What confused me:
  - The filter is named after its first condition only ("role board") in the Filters list and the top title, even after I added the hours part; I had to open it to see both halves.
  - "min 30": I assumed it means 30 or more, but nothing said so, and nobody in the visible rows had exactly 30 hours, so I could not check.
  - "A" and "B" groups and "Group colors" appeared when I pressed "Or..."; I did not ask for colors, and it took a second to see the dots were recolored only inside the editor. After Done the PageRank colors were back, which is what I wanted.
  - The "Condition..." and "Or..." buttons read like menu headings, not buttons, at first glance.

## Follow-up
Facilitator: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen. Then: while you were deciding who stays in the picture, what on the screen besides the drawing did you look at, and did it help or get in the way?"

Grace: "2. I mostly knew where I was going because I'd done the trained-people filter before.

The least sure moment was right after I clicked 'Or...'. The left list suddenly had a group A with 'role board, 3', a group B that said 'Value...' and 0, 'No match 21', and the column list popped open again on the right, plus colored dots for the groups. For a second I wasn't sure if I'd started a second filter or added to the same one, and whether B had to be set up before anything counted. Picking 'hours' and seeing the slider settled it.

Besides the drawing, I looked at the counts mostly: the '3 of 24 nodes' and then '10 of 24 nodes, 14 of 63 edges' at the top, the A 3 / B 7 / No match 14 numbers on the left, and the table under the editor with names, roles and hours. Those helped the most -- I could add 3 + 7 + 14 and get 24, and check that none of the board had 30 hours so nobody was counted twice. The table let me see real people, which I trust more than dots. After Done, the right panel's 'showing 10 of 24' and 'Full graph: 24' told me nobody was deleted. What got in the way a little: the group colors in the editor made me wonder if I'd changed the picture's colors, and the filter is still called just 'role board' in the list, so it doesn't tell me the hours half is in there."
