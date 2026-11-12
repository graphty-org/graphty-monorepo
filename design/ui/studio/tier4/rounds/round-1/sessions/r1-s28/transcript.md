# Session r1-s28 -- Sam, keyboard-only analyst (returning user)

Task: keep only trained volunteers with 10+ hours in the picture (no deleting), then mark the staff among them as the current working set. Report how many are in the picture and how many are marked.

## Step 0 -- start
Command: REAL_DIST=... REAL_TIER=4 node .../real.mjs --start <folder> setup:volunteers.txt --keys
Screenshot 01.png: volunteers.graphml is open, 24 nodes, 63 edges, colored by PageRank. Left panel: search box, Style layers (Hovered, Selected, Pinned, PageRank, Everything). Bottom toolbar: flask, chart, 3D, list (active), table, a funnel-looking icon, search. Nothing has focus that I can see. The funnel icon is my best guess for "narrow the drawing". I have never done this before.

## Step 1 -- F6
I see nothing focused. F6 worked for me last month to jump between regions; trying it.
Command: --step <folder> --key F6
02.png: a dark outline around the left panel header ("Graph volunteers.graphml"). Focus is in the left panel. The toolbar with the funnel is at the bottom of the canvas; F6 again should get me closer.

## Step 2 -- F6
Command: --step <folder> --key F6
03.png: no focus ring anywhere I can see. Probably on the canvas, which shows no ring. Finding: focus is invisible after the second F6. I will press Tab to see where it lands.

## Step 3 -- Tab
Command: --step <folder> --key Tab
04.png: focus ring on "From volunteers.graphml" in the right panel. So the hidden focus was on the canvas, and Tab jumped past the bottom toolbar. Shift+Tab should walk back into the toolbar.

## Step 4 -- Shift+Tab
Command: --step <folder> --key Shift+Tab
05.png: focus ring on the flask button, first in the bottom toolbar. Good: the toolbar is one Tab stop. No tooltip shows on focus, so I do not know the flask's name or a shortcut. The funnel is five to the right. Trying ArrowRight once to check the arrows move inside the toolbar.

## Step 5 -- ArrowRight
Command: --step <folder> --key ArrowRight
06.png: focus moved to the second button, tooltip "Layout". Arrows work inside the toolbar, and the tooltip appears on focus (it did not for the flask on the Shift+Tab arrival). No key hint in the tooltip. Four more ArrowRight to reach the funnel.

## Step 6 -- ArrowRight x4
Command: --step <folder> --key ArrowRight --key ArrowRight --key ArrowRight --key ArrowRight
07.png: focus on the funnel, tooltip "Filters". That is what I want. Count so far to get here: F6, F6, Tab, Shift+Tab, 5 arrows = 9 keys (two of them wasted on an invisible focus). Pressing Enter.

## Step 7 -- Enter on Filters
Command: --step <folder> --key Enter
08.png: the left panel switched to Data, and a list opened under "Filters +" with "Find an attribute" at the top and node columns: Node id, name, role (3 values), hours (2 to 52), trained (2 values), phone, PageRank... Very good, one key took me straight to adding a filter. I cannot see a caret or ring, but the field is at the top so I assume it has focus. Typing "trained".

## Step 8 -- type "trained"
Command: --step <folder> --type "trained"
09.png: the list narrowed to one row, "trained 2 values", highlighted green. Enter should pick it.

## Step 9 -- Enter on "trained"
Command: --step <folder> --key Enter
10.png: a filter card "trained" appeared under Filters with an empty dropdown, and the dropdown has a green outline, so focus landed on it. Good: focus went to the next thing I need. The drawing still shows all 24. ArrowDown to open the dropdown.

## Step 10 -- ArrowDown
Command: --step <folder> --key ArrowDown
11.png: the dropdown opened with Yes (highlighted), No, Has a value, Has no value. Yes is what I want. Enter.

## Step 11 -- Enter on Yes
Command: --step <folder> --key Enter
12.png: the drawing dropped to 15 of 24 nodes, 25 of 63 edges (shown at the top bar and in the right panel). The card says "trained  15 of 24", with Select / Hide, Hide looks chosen, and "Yes" in the dropdown. Below it "+ Add a condition". Hide is what I want: out of the picture, not deleted. Focus still seems on the Yes dropdown. Tab to get to "Add a condition" for hours.
Keys for the trained part: Enter, type, Enter, ArrowDown, Enter = 5 (plus 9 to reach Filters).

## Step 12 -- Tab
Command: --step <folder> --key Tab
13.png: focus ring on "+ Add a condition", one Tab. I want "and hours 10 or more" in the same card. Enter.

## Step 13 -- Enter on Add a condition
Command: --step <folder> --key Enter
14.png: the same attribute list opened again, "trained (already a condition)" marked. Typing "hours" then Enter.

## Step 14 -- type "hours", Enter
Command: --step <folder> --type "hours" --key Enter
15.png: the card is now "trained, hours" with two rows: trained = Yes, and hours "Between" with a slider and boxes 2 to 52. Still 15 of 24. Focus went back to "+ Add a condition", not into the new hours row -- a small cost. Shift+Tab twice should reach the "2" box.

## Step 15 -- Shift+Tab x2
Command: --step <folder> --key Shift+Tab --key Shift+Tab
16.png: focus on the low box "2", with the 2 highlighted (selected). Typing "10" replaces it; Tab to commit. Upper 52 is already the highest, so "10 to 52" means 10 or more.

## Step 16 -- type "10", Tab
Command: --step <folder> --type "10" --key Tab
17.png: hours now 10 to 52, slider moved, and the drawing is 14 of 24 nodes, 22 of 63 edges. Focus on the "52" box. I assume "Between" includes 10 itself; nothing on screen says so, so I take it on trust.
Part 1 done: 14 people in the picture. Keys for the hours part: Tab, Enter, type, Enter, Shift+Tab x2, type, Tab = 8. Part 1 total about 22 keys including getting to Filters.

Part 2: mark the staff among these 14 without hiding anyone. I think I need a second filter card set to "Select" rather than "Hide". The "Filters +" button is far up the card (about 11 Shift+Tabs). The toolbar Filters button opened the add list straight away last time, so I'll go back there: F6 first.

## Step 17 -- F6
Command: --step <folder> --key F6
18.png: focus jumped to "From volunteers.graphml" in the right panel (ring visible). Last time Shift+Tab from here went into the toolbar. Shift+Tab.

## Step 18 -- Shift+Tab
Command: --step <folder> --key Shift+Tab
19.png: focus ring on the Filters button in the toolbar -- the toolbar remembered where I was. Nice. Enter, hoping it opens the "add a filter" list again.

## Step 19 -- Enter on Filters
Command: --step <folder> --key Enter
20.png: the add-filter list opened again from the "Filters +" button, new card this time. Typing "role" and Enter.

## Step 20 -- type "role", Enter
Command: --step <folder> --type "role" --key Enter
21.png: the first card folded to one line, "trained is Yes and hours is between 10 and 52" -- that answers my doubt, 10 is included. A new "role" card: "Is any of" with checkboxes volunteer 16, staff 5, board 3. Focus ring on the volunteer box. No Select/Hide switch on this card yet. I need staff: trying ArrowDown to move to the next box.

## Step 21 -- ArrowDown
Command: --step <folder> --key ArrowDown
22.png: nothing moved; ring still on volunteer. Checkboxes are separate Tab stops then, which is the normal pattern. One wasted key. Tab.

## Step 22 -- Tab
Command: --step <folder> --key Tab
23.png: ring on the staff box. Space to tick it. I worry what this card does by default: hide or select. I'll look after ticking.

## Step 23 -- Space on staff
Command: --step <folder> --key Space
24.png: staff ticked, and the new role card defaulted to "Hide": the drawing dropped to 4 of 24 nodes, 2 edges. That is NOT what I want -- it took the non-staff away. Not a disaster, I can see the Select / Hide switch on the card ("5 of 24", Select | Hide, Hide chosen). I need to flip it to Select. It is above the dropdown; Shift+Tab back to it.

## Step 24 -- Shift+Tab x3
Command: --step <folder> --key Shift+Tab --key Shift+Tab --key Shift+Tab
25.png: ring on the small green checkbox to the right of "Hide" (I guess it turns the card on/off; no label shown). One more Shift+Tab to reach Select | Hide.

## Step 25 -- Shift+Tab
Command: --step <folder> --key Shift+Tab
26.png: ring on "Hide" in the role card. It looks like a two-way switch, so ArrowLeft should move to Select.

## Step 26 -- ArrowLeft
Command: --step <folder> --key ArrowLeft
27.png: the switch moved to "Select". The drawing is back to 14 of 24 nodes, 22 of 63 edges, and four nodes have a yellow glow. The role card reads "4 of 14". The right panel now says "4 nodes selected": role staff (4), trained Yes (4), hours 40 to 52. So the staff marking only counted people still in the picture (5 staff in all, one of them is filtered out), and nobody else was taken away. Done.
Keys for part 2: F6, Shift+Tab, Enter, type, Enter, ArrowDown (wasted), Tab, Space, Shift+Tab x4, ArrowLeft = 14 keys (about 5 of them recovering from the Hide default).

## End of session (in character)

Did I finish? Yes. 14 people are still in the picture (trained and 10 hours or more), and 4 of them are marked as the staff I am working with.

Ease: 6 out of 7.

Whole task was roughly 36 key presses, no mouse needed anywhere. The filter flow is good from the keyboard: Enter on the toolbar's Filters button drops me straight into a search list, type the column name, Enter, and focus lands on the value control. That is how it should work.

What cost me or confused me:
- Focus invisible after the second F6 (on the drawing, I think). I had to Tab and Shift+Tab to find myself; two wasted keys at the start.
- The flask button showed no tooltip when focus arrived on it by Shift+Tab; the others showed one on arrow moves. None of the tooltips show a key shortcut, so I have no faster way to Filters next time.
- After adding the "hours" condition, focus went back to "Add a condition" instead of into the new hours row; two Shift+Tabs to reach the number box.
- The biggest one: a new filter card is "Hide" by default. Ticking "staff" immediately threw 10 people out of the picture. I wanted to mark, not hide. Nothing on the card asked me first; I had to spot the small Select | Hide switch and walk back four Shift+Tabs to change it. It was undoable, so not a reason to quit, but a careless user would report 4 people in the picture.
- The small green checkbox next to Select/Hide has no visible label; I guessed it switches the card on or off.
- The value checkboxes (volunteer / staff / board) do not take arrow keys; each is its own Tab stop. Fine for three, slow for thirty.
- The first card's folded summary "trained is Yes and hours is between 10 and 52" was a welcome confirmation that 10 itself is included.

## Follow-up

Facilitator: "Would it have made any difference if you had done those the other way round? How can you tell?"

Sam (looked again, 28.png, no keys pressed): For the numbers I reported, I don't think so, but I can only half prove it from the screen.

What I can see: the cards seem to work top to bottom. The role card, which is second, says "4 of 14", not "of 24". So it only counts what the first card left in the picture. The right panel says "4 nodes selected", and all four are trained Yes with hours 40 to 52. So the one staff member who was taken out is not counted as marked.

The doubt: the checkbox list on the role card still says "staff 5", which is the whole file. If I had marked staff first, that card would have been on top and marked all 5. Then the hide card underneath would take one of them out of the picture. Would that person still count as selected while hidden? Would the panel then say 5? Nothing on screen tells me, and I would not want to report "5 marked" by accident. The only way to know is to try it: swap the cards, or switch the trained/hours card off with that small green checkbox and see whether "4 nodes selected" changes. I did not do that here, so this part is a guess.

There is one difference I am sure of. Doing it my way, the new card defaulted to Hide and threw 10 people out for a moment. If I had made the staff card first, it would also have defaulted to Hide and dropped the picture to 5. Either way I would have had to flip that switch, so the order would not have saved me those keys.
