# Session r1-s30 transcript (Sam, keyboard only)

Task: keep only board members and anyone with 30 or more hours this quarter in the picture, without deleting anyone; report how many are still in the picture.

## Step 1 -- start
Command: REAL_DIST=... REAL_TIER=5 node .../real.mjs --start <folder> setup:volunteers.txt --keys
Screenshot 01.png: volunteers graph, 24 nodes, 63 edges, colored by PageRank. Left panel: search box, style layers (Hovered, Selected, Pinned, PageRank, Everything). Bottom toolbar: flask, chart, 3D, list (active), table, a filter-looking icon (three lines narrowing), search. No focus ring anywhere -- nothing has focus. The filter icon at the bottom looks like what I want. I know F6 moves between regions from earlier sessions; I will try F6 to get to the toolbar.

## Step 2 -- F6
Command: --step <folder> --key F6
02.png: focus ring on the Main menu button top-left (header region). Clear ring, good. I want the bottom toolbar; F6 again should move to the next region.

## Step 3 -- F6
Command: --step <folder> --key F6
03.png: focus moved to the Graph button on the left rail (ring visible). F6 cycles regions. Pressing F6 again to get to the drawing/toolbar.

## Step 4 -- F6
Command: --step <folder> --key F6
04.png: focus ring now around the left panel's top ("Graph volunteers.graphml"). Three F6 so far. F6 again for the canvas/toolbar.

## Step 5 -- F6
Command: --step <folder> --key F6
05.png: F6 jumped past the drawing to the right panel heading "Graph" (small ring). The toolbar at the bottom was skipped. Four F6 so far. One more F6 to see whether the canvas/toolbar is next in the cycle.

## Step 6 -- F6
Command: --step <folder> --key F6
06.png: ring around the whole drawing. Five F6 to get here (header, rail, left panel, right panel, drawing -- odd order, the drawing comes last). Tab should take me into the toolbar.

## Step 7 -- Tab
Command: --step <folder> --key Tab
07.png: focus on the first toolbar button (flask), clear ring. No tooltip shows on keyboard focus, so I do not know its name or shortcut. The filter-like icon is five to the right. It is a toolbar, so I try ArrowRight first.

## Step 8 -- ArrowRight
Command: --step <folder> --key ArrowRight
08.png: arrows move along the toolbar; focus on "Layout" with a tooltip (no key hint in it). Four more ArrowRight to the filter icon. Doing them in one batch.

## Step 9 -- ArrowRight x4
Command: --step <folder> --key ArrowRight --key ArrowRight --key ArrowRight --key ArrowRight
09.png: focus on "Filters" (tooltip says Filters, no shortcut shown). Count to reach it: 5 F6 + 1 Tab + 5 arrows = 11 keys. Pressing Enter.

## Step 10 -- Enter on Filters
Command: --step <folder> --key Enter
10.png: a whole filter editor opened ("New filter -- Filters 24 of 24"), with a Value... list already open on the right: Data -> Node id, name, role (3 values), hours (2 to 52), trained, phone, Degree; Results below. Table at the bottom shows role (board/staff/volunteer) and hours. Good, both columns I need are here. I cannot see a clear focus ring; the list's "Find attributes, results" box is probably focused. I will type "role" to narrow it.

## Step 11 -- type "role"
Command: --step <folder> --type "role"
11.png: typing went into the list's search; it narrowed to "role 3 values", highlighted. (The list moved up and now covers the Done button, oddly.) Enter to pick it.

## Step 12 -- Enter on role
Command: --step <folder> --key Enter
12.png: the filter is now "role" with checkboxes volunteer 16, staff 5, board 3. Focus landed on the volunteer checkbox (ring visible) -- good, focus went somewhere sensible. Header shows "24 of 24 nodes". Next to "Condition..." there is "Or...", which looks like where I add the hours part. First tick board: two Tabs down to board.

## Step 13 -- Tab x2
Command: --step <folder> --key Tab --key Tab
13.png: focus on the board checkbox. Space to tick it.

## Step 14 -- Space on board
Command: --step <folder> --key Space
14.png: board ticked; "3 of 24 nodes, 1 of 63 edges" in the header; table shows Maria Lopez, Seun Okoro, Paul Dubois (all board, hours 12, 8, 5). Board part took 3 keys after the role pick. Now the hours part: "Or..." sits above. Shift+Tab back up -- I count staff, volunteer, role select, Except, Or: five Shift+Tabs.

## Step 15 -- Shift+Tab x5
Command: --step <folder> --key Shift+Tab x5
15.png: focus on the "..." button at the right of the Condition/Or row. One more Shift+Tab should be "Or...".

## Step 16 -- Shift+Tab
Command: --step <folder> --key Shift+Tab
16.png: focus on "Or..." (six Shift+Tabs from board; I miscounted by one -- the "..." button sits between). Enter.

## Step 17 -- Enter on Or...
Command: --step <folder> --key Enter
17.png: a second group "B" appeared under "or", and the Value... list opened with a caret in its search box (I can see the focus this time). Typing "hours" then Enter.

## Step 18 -- type "hours", Enter
Command: --step <folder> --type "hours" --key Enter
18.png: group B is now "hours", By value, a range slider 2 to 52 and two boxes "2 to 52". Focus is in the first box (caret before the 2). B says "0 so far". I will select what is there and type 30.

## Step 19 -- Control+a, type 30
Command: --step <folder> --key Control+a --type "30"
19.png: the box reads 30, but nothing else changed: B still 0, slider handle still at 2. Probably applies on Enter. Pressing Enter.

## Step 20 -- Enter in the "from" box
Command: --step <folder> --key Enter
20.png: applied. "hours min 30", B = 7, A = 3, header "10 of 24 nodes, 14 of 63 edges". Table rows: Maria Lopez board 12 (A), James Carter staff 48 (B), Priya Nair 31 (B), Hannah Weiss 52 (B), Seun Okoro board 8 (A)... "min 30" reads as 30 counts. The drawing still shows the others faded, so it is still the editor's preview. I need Done (top right). No shortcut shown for it. Hours part: 2 (type+Enter) + Ctrl+a + 2 chars + Enter. Now walking back to Done with Shift+Tab; trying six.

## Step 21 -- Shift+Tab x6
Command: --step <folder> --key Shift+Tab x6
21.png: focus on the "..." button of the right panel again. Done is still further. Three more Shift+Tabs (Or, Condition, then whatever comes before).

## Step 22 -- Shift+Tab x3
Command: --step <folder> --key Shift+Tab x3
22.png: focus jumped into the table's "Group" header, not up to Done. The Done bar is not before the right panel in the Tab order. That is 9 Shift+Tabs spent looking for Done. Instead of walking the whole table, I try F6 to jump to a region.

## Step 23 -- F6
Command: --step <folder> --key F6
23.png: ring around the preview drawing. F6 again, hoping the next region is the bar with Done.

## Step 24 -- F6
Command: --step <folder> --key F6
24.png: focus went to "Local only" in the bottom status bar. The bar with Done is still not a stop. F6 again.

## Step 25 -- F6
Command: --step <folder> --key F6
25.png: focus on Main menu (tooltip "Main menu"). F6 cycled header -> ... -> drawing -> status -> header, and never stopped on the filter editor's bar with Done/Cancel. That bar is a missing F6 stop. Now I walk with Tab from the header: undo, redo, filter chip, x, rail... Trying 4 Tabs to see where I am.

## Step 26 -- Tab x4
Command: --step <folder> --key Tab x4
26.png: focus on the filter chip in the header; its tooltip reads: Filter: 10 of 24 nodes, 14 of 63 edges, showing only "role board or hours 30 or more". That is exactly my task, and it says 30 or more, so 30 counts. Good. I still want to close the editor with Done and see the plain picture. Continuing with Tab; six more.

## Step 27 -- Tab x6
Command: --step <folder> --key Tab x6
27.png: focus on the "..." beside volunteers.graphml in the left Data panel. Still in the left panel; Done is further on. Eight more Tabs (Attributes, the file group, its +, Filters, +, the filter card ...).

## Step 28 -- Tab x8
Command: --step <folder> --key Tab x8
28.png: focus on "Group colors" in the editor bar at last. Done is four controls to the right (Styled, Table, Clear, Cancel, Done -- Group colors/Styled may be one stop). Tab x4 and look before pressing anything, since Clear and Cancel are right beside Done.

## Step 29 -- Tab x4
Command: --step <folder> --key Tab x4
29.png: focus ring on Done (green button, ring around it). Getting from the hours box to Done took 9 Shift+Tab + 3 F6 + 22 Tab = about 34 key presses. That is the most painful part of this task. Enter on Done.

## Step 30 -- Enter on Done
Command: --step <folder> --key Enter
30.png: the editor closed. The drawing now shows only 10 people; the right panel says "Nodes showing 10 of 24, Edges showing 14 of 63", and "Full graph: Nodes 24" -- nobody deleted. The left panel keeps the filter "role board" with A (role board) 3, or B (hours min 30) 7. Focus landed on the filter card row ("role board / Edit"), with a ring -- not thrown to the top. Good. I am done.

## End of session (in character, Sam)

Did I finish? Yes. 10 people are still in the picture: 3 board members and 7 people with 30 hours or more (the header's tooltip says "role board or hours 30 or more"; 10 of 24 nodes, the other 14 hidden, not deleted).

Ease: 4 of 7.

Key counts:
- Reaching Filters: 11 keys (5 F6, 1 Tab, 5 arrows). The F6 cycle puts the drawing last, after the right panel. No shortcut shown for Filters.
- Setting board: 5 keys (type "role", Enter, Tab, Tab, Space). Pleasant -- the list opened with its search focused, and focus went to the first checkbox.
- Adding the hours part: 6 Shift+Tab to "Or...", Enter, type "hours", Enter, Ctrl+a, "30", Enter. About 12 keys. Fine.
- Getting to Done: about 34 keys (9 Shift+Tab, 3 F6, 22 Tab). That is the step I would avoid next time.

What confused or hurt:
- The editor bar with Done / Cancel / Clear is not an F6 stop and comes before the left panel in Tab order, so from the right panel where I was working I had to go all the way around the page. Done needs a key (Ctrl+Enter, or Enter from the condition panel) or an F6 stop.
- Typing 30 in the "from" box did nothing until I pressed Enter; nothing told me that.
- No keyboard shortcuts are printed in the toolbar tooltips (Layout, Filters), so there was nothing to learn.
- When the role list opened after typing, it slid up over the Done button.
- "min 30" in the group label left me unsure whether 30 itself counts; the header tooltip's "30 or more" settled it.
- The first screen after Enter on Filters had no visible focus ring; I guessed the list search had focus (it did).
- Focus was kept in sensible places every time something closed. No traps, no mouse needed.

## Follow-up

Facilitator: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen. Then: while you were deciding who stays in the picture, what on the screen besides the drawing did you look at, and did it help or get in the way?"

Sam: 3. Most of the time I knew the next key. The filter editor itself was calm: the list opened with its search box ready, focus landed on the first checkbox, and Or... gave me the second group without hunting.

Least sure: right after I set hours to 30 and pressed Enter, when I went looking for Done. On the screen was the filter editor with groups A (role board, 3) and B (hours min 30, 7), the header saying 10 of 24 nodes, the faded preview drawing, the table underneath, and the green Done button at the top right. I could see Done but could not reach it. Nine Shift+Tabs dropped me into the table's Group header instead of going up to it, and three F6 presses went drawing, status bar, Main menu, and never stopped on the bar that holds Done. For about a dozen keys I did not know whether Done was reachable at all. It was, after 22 Tabs from the header, about 34 keys in all.

Besides the drawing, I looked at four things. The group counts in the editor (A 3, B 7) helped most: they told me each part was doing what I meant before I trusted the picture. The table at the bottom helped too -- I could read names, roles and hours and check that Maria, Seun and Paul were board and that James, Priya and Hannah were over 30. The header line "10 of 24 nodes" helped, and its tooltip, "role board or hours 30 or more", settled my doubt that "min 30" includes 30 itself. What got in the way: the Value list sliding up over the Done button when I typed "role", and the table sitting in the Tab order between me and Done, so it cost me keys on the way out. The drawing I barely used; with things faded rather than gone, the counts were more trustworthy than the picture.
