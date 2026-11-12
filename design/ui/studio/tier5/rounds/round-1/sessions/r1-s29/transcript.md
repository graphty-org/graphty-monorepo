# Session r1-s29 -- Sam, keyboard only

Task: staff in orange; people who never finished food-safety training out of the picture (not deleted); report how many remain and how many of them are orange.

## Step 0 -- start
Command: real.mjs --start ... setup:volunteers.txt --keys -> 01.png
Sam: The volunteers graph is open. 24 nodes, 63 edges. Everything is already colored in shades of orange to brown by a PageRank layer, which is going to make "staff in orange" hard to see. No focus ring anywhere -- nothing has focus. Left panel has Style layers with a + button; bottom toolbar has a funnel icon, probably a filter. I will press Tab to find where focus starts.

## Step 1 -- Tab -> 02.png
Sam: One Tab put a clear ring on the Main menu button, top left. Good, focus is visible. I remember F6 jumps between regions from my earlier sessions; I will press F6 to head toward the panels and the bottom toolbar.

## Step 2 -- F6 -> 03.png
Sam: F6 moved focus to the Graph button in the left rail (ring around it). Two presses so far. Another F6 should take me to the next region; I want the bottom toolbar with the funnel.

## Step 3 -- F6 -> 04.png
Sam: Focus is now on the left panel as a whole (a dark outline around "Graph volunteers.graphml"). Three presses. F6 again, hoping for the canvas or the toolbar.

## Step 4 -- F6 -> 05.png
Sam: F6 skipped the canvas and the toolbar and went to the right panel's "Graph" heading (thin ring). Four presses. One more F6 to see if the toolbar is in the cycle at all.

## Step 5 -- F6 -> 06.png
Sam: Now the whole canvas has a dark outline -- focus is on the drawing. Five presses. The toolbar sits inside the canvas area, so Tab from here should reach it.

## Step 6 -- Tab -> 07.png
Sam: Tab put a ring on the first toolbar button (the flask). Six presses to reach the toolbar. I want the table first, to see which columns say "staff" and "food-safety training". Toolbars usually move with the arrows; ArrowRight once to test.

## Step 7 -- ArrowRight -> 08.png
Sam: Arrow works in the toolbar: ring on the second button, tooltip "Layout" (no key hint printed). Seven presses. The table button is three further: 3D, list, table. ArrowRight three times.

## Step 8 -- ArrowRight x3 -> 09.png
Sam: Ring on the table button, tooltip "Table  Shift+T". Noted the shortcut. Ten presses. Enter to open the table.

## Step 9 -- Enter -> 10.png
Sam: The table opened below the drawing and focus went straight to the "id" column header (green ring). Good. Columns: id, name, role, hours, trained, phone, PageRank. "role" has staff/volunteer/board, "trained" has Yes/No. That is what I need. Eleven presses to learn the columns. Now the funnel button in the toolbar. Shift+Tab to get back up there.

## Step 10 -- Shift+Tab -> 11.png
Sam: Shift+Tab went to the table's Close (X) button. The toolbar is above the table header: expand, "...", Columns, Edges, Nodes are in between. Shift+Tab four more times and look.

## Step 11 -- Shift+Tab x4 -> 12.png
Sam: Focus on the "Nodes" tab of the table (ring). Sixteen presses total. One more Shift+Tab should land in the toolbar.

## Step 12 -- Shift+Tab -> 13.png
Sam: Focus is on a green bar between the drawing and the table -- a resize handle, I think. Seventeen presses. Shift+Tab again.

## Step 13 -- Shift+Tab -> 14.png
Sam: Back on the Table button in the toolbar (ring). Eighteen presses -- that Shift+Tab walk back up from the table cost me seven. ArrowRight to the funnel to read its tooltip.

## Step 14 -- ArrowRight -> 15.png
Sam: Ring on the funnel, tooltip "Filters" (no shortcut printed). Nineteen presses. Enter to open it.

## Step 15 -- Enter -> 16.png
Sam: Enter switched me into the Data place with a "New filter" in editing, and a list of attributes already dropped open on the right: Node id, name, role, hours, trained (2 values), phone, Degree. Twenty presses. I cannot see a ring, but there is a "Find attributes, results" box at the top of the list; I will type "trained" and see if it lands there.

## Step 16 -- type "trained" -> 17.png
Sam: Typing went into the search. The list narrowed to one row, "trained  2 values", highlighted. Oddly the list jumped up and now sits on top of the Done button. Twenty-seven key presses counting the seven letters. Enter to pick it.

## Step 17 -- Enter -> 18.png
Sam: The filter is now "trained pick yes or no", and focus moved on to the "Value..." box (green outline). Good -- it carried me forward. Twenty-eight presses. ArrowDown to open the values.

## Step 18 -- ArrowDown -> 19.png
Sam: The list opened with Yes highlighted, No below. A filter keeps what matches, I assume, so I want "Yes" -- keep the ones who finished. Twenty-nine presses. Enter.

## Step 19 -- Enter -> 20.png
Sam: The filter reads "trained Yes", 15 of 24, with "No match 9" below it. The top bar now says "15 of 24 nodes, 25 of 63 edges". The 9 untrained are faded in the preview. Thirty presses for the filter. Focus is still on the Yes box. Now Done, top right. Tab forward to find it.

## Step 20 -- Tab -> 21.png
Sam: Tab jumped past everything to "Local only" in the bottom right corner. Thirty-one. Done is behind me. Shift+Tab back up: Yes, trained, Except, the dots, Or, Condition... I will press Shift+Tab six times and look.

## Step 21 -- Shift+Tab x6 -> 22.png
Sam: Focus is on "Condition..." at the top of the editor. Thirty-seven. One more Shift+Tab, hoping for Done.

## Step 22 -- Shift+Tab -> 23.png
Sam: Not Done -- focus went into the preview table's "id" header. Thirty-eight. I will not risk Escape, it might cancel the filter. Done must be further back: search box, Fit, the filter rows on the left. Shift+Tab four more.

## Step 23 -- Shift+Tab x4 -> 24.png
Sam: Ring on Done, top right. Forty-two presses. Getting from the Yes box to Done took twelve: Tab jumped to the footer, then eleven Shift+Tabs back through the editor and the preview table. That is the expensive part so far. Enter on Done.

## Step 24 -- Enter on Done -> 25.png
Sam: Done. Back to the drawing with the table: "15 of 24 nodes, 25 of 63 edges" in the top bar, "Nodes showing 15 of 24" on the right, the table lists only trained = Yes. Focus stayed on the filter card ("trained Yes  Edit") -- nice, not thrown to the top. Filter part: 43 presses. Now the orange for staff. Style layers live in the Graph place. Shift+F6 to go back one region to the left rail.

## Step 25 -- Shift+F6 -> 26.png
Sam: Shift+F6 put the ring on the Graph button in the rail. One press. Enter to go to the Graph place.

## Step 26 -- Enter -> 27.png
Sam: Graph place is back: Style layers Hovered, Selected, Pinned, PageRank (15), Everything (15). Ring still on the Graph rail button. Forty-five presses. Tab twice should get me past the search box to the + beside "Style layers".

## Step 27 -- Tab x2 -> 28.png
Sam: Ring on the search box ("Find nodes, edges, values"), not yet on the +. Forty-seven. One more Tab.

## Step 28 -- Tab -> 29.png
Sam: Ring on the + beside "Style layers". Forty-eight. Enter to add a layer.

## Step 29 -- Enter -> 30.png
Sam: A menu: Layer (highlighted), Folder, Hover highlight, Analyze... Shift+A. Forty-nine. Enter on Layer.

## Step 30 -- Enter -> 31.png
Sam: "Layer 1" appeared above PageRank with its name selected in an edit box. The right panel shows its Style: Which nodes (All nodes, 15 of 15), Shape, Visibility, Text, Fill, Shaders. Fifty. I will type "Staff" and Enter to name it.

## Step 31 -- type "Staff", Enter -> 32.png
Sam: Layer renamed "Staff", row has the ring and is selected. Fifty-six (five letters and Enter). Now "Which nodes" in the right panel. F6 should jump there, as it did earlier.

## Step 32 -- F6 -> 33.png
Sam: F6 put focus on the "Staff" heading at the top of the right panel. Fifty-seven. Between here and "All nodes": the select icon, the dots, the Style tab, Node, the "Style nodes" box. Tab four times and look.

## Step 33 -- Tab x4 -> 34.png
Sam: Ring on the "Node" tab. Sixty-one. Tab twice: the Style nodes box, then hopefully "All nodes".

## Step 34 -- Tab x2 -> 35.png
Sam: Ring around "Which nodes  Edit". Sixty-three. Enter to edit which nodes.

## Step 35 -- Enter -> 36.png
Sam: The same editor as the filter, now "Which nodes -- Staff 15 of 15", with the attribute list open. I know this one now. Sixty-four. Type "role".

## Step 36 -- type "role" -> 37.png
Sam: Narrowed to "role 3 values", highlighted. The list jumped up again and covers Done. Sixty-eight. Enter, then ArrowDown to open values.

## Step 37 -- Enter, ArrowDown -> 38.png
Sam: For role it shows checkboxes, not a list: volunteer 9, staff 4, board 2 (counts within the 15 showing, it seems). Ring on the volunteer box. Seventy. ArrowDown to staff, then Space to tick it.

## Step 38 -- ArrowDown, Space -> 39.png
Sam: Wrong box. ArrowDown did not move between the checkboxes, so Space ticked "volunteer" (9 of 15). I expected arrows to move in a group of checkboxes; they did not. Seventy-two. Space again to untick it, Tab to staff, Space.

## Step 39 -- Space, Tab, Space -> 40.png
Sam: Now "role staff", 4 of 15: James Carter, Hannah Weiss, Ken Ito, Ben Adler, all trained Yes. Seventy-five. Done again lives at the top; last time it was eleven Shift+Tabs from the value boxes. I counted the same path: Shift+Tab eleven times.

## Step 40 -- Shift+Tab x11 -> 41.png
Sam: Ring on Done, as counted. Eighty-six. Eleven presses just to reach a Done button is the worst stretch of the session. Enter.

## Step 41 -- Enter on Done -> 42.png
Sam: Back. The Staff layer now covers 4 nodes and "Which nodes: role staff". Focus returned to the Which nodes row -- good. Eighty-seven. Now color: the "Fill" + below. Tab four times (Shape, Visibility, Text, Fill) and look.

## Step 42 -- Tab x4 -> 43.png
Sam: Ring on the Text +. One short. Ninety-one. Tab once more to Fill +, then Enter.

## Step 43 -- Tab, Enter -> 44.png
Sam: Fill opened a "Color" row with an empty text box, outlined green, so focus is in it. Ninety-three. I will type a hex orange, #ff8000, and Enter.

## Step 44 -- type "#ff8000", Enter -> 45.png
Sam: The color took: box shows FF8000 with an orange swatch, and the key card says "Color: Staff, 4 of 15 nodes" and "4 nodes covered by Staff". Orange part: 101 presses since the start, about 58 of them for the layer. Problem: the other 11 people are still painted by PageRank in orange-to-brown, so the staff do not really stand out -- four bright oranges among orange-browns. I will switch off the PageRank layer's eye (not delete it). Shift+F6 back to the left panel.

## Step 45 -- Shift+F6 -> 46.png
Sam: Shift+F6 landed right on the Staff row in the layer list (ring) -- it remembered where I was. 102. ArrowDown to the PageRank row.

## Step 46 -- ArrowDown -> 47.png
Sam: Ring on the PageRank row (arrows work in this list). 103. The eye is at the row's right end, after a lock icon. Tab once to see where it goes.

## Step 47 -- Tab -> 48.png
Sam: Tab left the list altogether and went to "Graph settings" at the bottom. The row's lock and eye are not in the Tab order. 104. Shift+Tab back to the row, then ArrowRight to see if it walks into the row's buttons.

## Step 48 -- Shift+Tab, ArrowRight -> 49.png
Sam: ArrowRight moved into the row: ring on the lock button. 106. ArrowRight once more to the eye.

## Step 49 -- ArrowRight -> 50.png
Sam: Ring on the eye, tooltip "Hide PageRank". Clear. 107. Enter.

## Step 50 -- Enter -> 51.png
Sam: PageRank is hidden (eye struck through, row greyed; the layer is still there). Now the drawing shows four orange nodes and eleven blue ones; the key card reads "Color: Staff, 4 of 15 nodes". Top bar still "15 of 24 nodes, 25 of 63 edges". I count the drawing myself: 4 orange + 11 blue = 15. That is the job. 108 key presses in all.

## End of session (in character)

**Did I finish?** Yes. 15 people are still in the picture (the 9 who never finished food-safety training are filtered out, not deleted -- the full graph still says 24). 4 of those 15 are in orange: James Carter, Hannah Weiss, Ken Ito and Ben Adler, all staff.

**Ease: 5 of 7.** Every step worked from the keyboard. No pointer needed, no trap, focus was visible almost everywhere, and after both Done buttons focus came back to the thing I had been editing instead of the top of the page. 108 presses is more than I want for a weekly job, though.

**Key-press tally:** finding the toolbar and reading the table, 11. Filter, 32 more (43). Staff layer and color, 58 (101). Hiding PageRank so the orange actually stands out, 7 (108).

**What cost me or confused me:**
- The filter / which-nodes editor puts Done at the top right, but focus is down in the value boxes. Tab from there jumps to "Local only" in the page footer; reaching Done took eleven Shift+Tabs, twice, walking back through the editor and the preview table. A key for Done (Ctrl+Enter), or Done after the conditions in Tab order, would save 20+ presses.
- In the role checkbox group, ArrowDown did not move between the boxes, so Space ticked "volunteer" instead of "staff". I expected arrows to move inside a group. Cost me three presses to fix.
- The attribute list, once I type in its search, jumps up and covers the Done/Cancel buttons.
- The layer row's lock and eye buttons are not in the Tab order; I only found them by trying ArrowRight on the row. It worked, but nothing told me.
- F6 skips the canvas toolbar; I had to F6 to the canvas and then Tab. Toolbar tooltips print Shift+T for Table but no key for Filters.
- The colleague's PageRank colors were orange to brown already, so "staff in orange" did not stand out until I hid that layer. Nothing warned me that my orange was competing with another orange layer.
- Good: arrows in the toolbar and the layer list, typing to narrow the attribute list, focus returned to the edited card after Done, Shift+F6 returning to the row I had left.

## Follow-up

**Facilitator:** On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen. Then: what did you notice the drawing do while you were choosing who goes in orange, and what did you take it to mean? Would you rather it had shown something else?

**Sam:** 3. Mostly calm -- every time I pressed something, the ring told me where I was, and nothing trapped me. It was long, not frightening.

The least sure moment was after I picked "Yes" in the filter, with focus sitting in the "Yes" value box. On screen: the filter editor, "trained Yes, 15 of 24" and "No match 9" in the left column, the preview drawing with the untrained faded, the preview table below it, and Done, Cancel, Clear, Table up in the top right. I knew I wanted Done, but I did not know which direction it was in the Tab order. I pressed Tab and landed on "Local only" in the bottom corner of the page, which told me I had gone the wrong way, and then I was counting Shift+Tabs through "Condition...", the preview table's headers and the search box with no idea how many were left. The second time, in the Staff layer's "Which nodes", I was not unsure any more, just annoyed -- I counted eleven and hit it.

While I was choosing who goes in orange, the small preview drawing above the table lit up the people I had ticked in dark green and faded everyone else to pale lilac. When I ticked "volunteer" by mistake, nine dots went green; when I fixed it to "staff", only four went green -- spread out, two in the middle and two below. I took it to mean "these are the nodes this layer will paint", a selection highlight, not the colour they will end up. That was useful: it was how I caught my wrong tick, along with the 9-of-15 count. It only showed the 15 trained people, which I took as the filter already working.

Would I rather it had shown something else? A little. The green made me pause for a second -- I was making an orange layer and the picture said green. Since at that point I had not chosen a colour yet, green as "selected" is fair, but once the layer has a colour I would like the preview to show that colour, against what the other layers paint. If it had shown my picks next to the PageRank orange-browns, I would have seen right there that my orange was going to drown, instead of finding out after Done and hunting for the PageRank eye. And I would like the drawing to say in words how many are lit -- the "4 of 15" at the top did that, but it is far from the picture.
