# Session r1-s05b (Sam, keyboard only)

Task: open Les Miserables sample, make every character dark green.

## Step 1
Command: --start empty --keys
Saw: landing page. Big "Open a file", "Open network data", "Samples", "New project". No focus ring visible anywhere. Samples is what I want. I will press Tab to find where focus starts.

## Step 2
Command: --step --key Tab
Saw: focus ring on the Main menu button (top left), with a tooltip "Main menu: open, save, export, settings". Good, visible. "Samples" is in the top bar to the right; one more Tab should reach it.

## Step 3
Command: --step --key Tab
Saw: focus ring on "Samples" in the top bar. Two tabs. Pressing Enter.

## Step 4
Command: --step --key Enter
Saw: Sample library page. Les Miserables is the first card ("Who holds the novel together"). Focus ring still seems to be on top-bar "Samples"; the search box also has a darker border, so I am not sure which has focus. Pressing Tab to find out.

## Step 5
Command: --step --key Tab
Saw: focus moved to "Docs" in the top bar. So opening Samples left focus in the header, not on the new page content. I have to walk past For developers, GitHub, theme and settings. Pressing Tab four times to get toward the search box.

## Step 6
Command: --step --key Tab --key Tab --key Tab --key Tab
Saw: focus on the Settings gear, tooltip shows shortcut "Ctrl+," - noted. Next Tab should reach the search box; I will type "Les" there.

## Step 7
Command: --step --key Tab --type "Les"
Result: the Tab from Settings did NOT reach the search box. The Sample library disappeared and I am back on the landing page, with focus on the 3D drawing (black ring around the whole right side). Nothing was typed. So the library page was not in the Tab order after the header at all - focus jumped behind it, and the library vanished. Lost my place once. Count so far for "open sample": 8 keys, nothing to show.
Next: Shift+Tab to see where I am in the landing page order; I want the big "Samples" button on the left card.

## Step 8
Command: --step --key Shift+Tab
Saw: Shift+Tab put focus back on Settings. So the order is header -> drawing, and the sample library was skipped entirely. The library seems to have been tied to the header link and closed when focus left the header. I will go forward instead to the "Samples" button on the left card: Tab twice to learn the order after the drawing.

## Step 9
Command: --step --key Tab --key Tab
Saw: focus on "Communities" in the demo toolbar. The card buttons come after this toolbar. Tab twice more.

## Step 10
Command: --step --key Tab --key Tab
Saw: focus on "Shortest path". Each demo button is its own Tab stop. Two more (2D, pause), then hopefully "Open a file", "Open network data", "Samples". Pressing Tab five times.

## Step 11
Command: --step --key Tab x5
Saw: focus on the card's "Samples" button (darker green ring - faint against the green fill, but visible). That was 9 Tabs from Settings, through the drawing and five demo buttons. Pressing Enter.

## Step 12
Command: --step --key Enter
Saw: Sample library again. No clear focus ring this time; the search box has a dark border which may mean it has focus. I will just try typing "Les".

## Step 13
Command: --step --type "Les"
Result: nothing typed. Focus is still on the "Samples" button I pressed - which is now hidden behind the library. Focus did not move into the library. Pressing Tab once to see where it goes.

## Step 14
Command: --step --key Tab
Saw: now I understand. The Sample library is further down the SAME page; "Samples" only scrolled to it and left focus behind. Tab moved focus to "New project" and the page scrolled back up. The library is below the footer strip. Tabbing on: probably "Put it on your own site", then the search box. Pressing Tab twice.

## Step 15
Command: --step --key Tab --key Tab
Saw: focus on "Put it on your own site" (two Tabs: one went somewhere I cannot see, maybe "MIT licensed"). Next Tab should be the search box. Tab, then type "Les".

## Step 16
Command: --step --key Tab --type "Les"
Saw: "Les" is in the search box, which has a green focus border. The results are below the fold, the page did not scroll to show them. I will try Enter in the box - in most search boxes that opens the top hit or moves to results.

## Step 17
Command: --step --key Enter
Result: Enter did nothing visible. Still cannot see results. Tabbing forward: grid/list toggle, then the category chips, then the cards. Tab three times.

## Step 18
Command: --step --key Tab x3
Saw: filter works - two cards, Les Miserables first. Focus is on the "Any" chip. One Tab; I hope the chips are one group and the next stop is the Les Miserables card.

## Step 19
Command: --step --key Tab
Saw: focus on "Social" chip - every chip is its own Tab stop, nine of them. Seven more chips (Sports..Generated) then the card: 8 Tabs. Annoying for a filter row.

## Step 20
Command: --step --key Tab x8
Saw: focus ring (green) on the Les Miserables card. Pressing Enter.

## Step 21
Command: --step --key Enter
Saw: Les Miserables is open - 77 nodes, 254 edges, all purple-blue. Part 1 (open the sample) done. Count: about 38 key presses plus typing "Les", and I lost my place once (the header "Samples" link and the card "Samples" button both only scroll the page and leave focus behind).
Now the colour. Left panel has "Style layers" with Hovered, Selected and "Everything 77" - that last one sounds like the layer for all nodes. Right panel has Style / Values tabs. I cannot see a focus ring anywhere. Pressing Tab to find focus.

## Step 22
Command: --step --key Tab
Saw: focus on "From Les Miserables" in the right panel (small ring). So focus was somewhere in the right panel. The Style tab is right below. Tab twice (past the "..." button) to reach the tab list.

## Step 23
Command: --step --key Tab --key Tab
Saw: focus on the "Values" tab. ArrowLeft to move to "Style", the standard tab-list key.

## Step 24
Command: --step --key ArrowLeft
Saw: Style tab is open, but it is only Canvas (background, lighting, outline) and Labels. No node colour here. The node colour must live in the "Everything" style layer on the left. Getting there: Shift+Tab back through the panel. Trying Shift+Tab three times.

## Step 25
Command: --step --key Shift+Tab x3
Saw: focus on the bottom toolbar's first button, "Analyze  Shift+A" (shortcut noted). Left panel is still before this. Shift+Tab three more.

## Step 26
Command: --step --key Shift+Tab x3
Saw: focus on "Graph settings" at the bottom of the left panel. The layer rows are above it. One more Shift+Tab, hoping for the Everything row (or its eye button).

## Step 27
Command: --step --key Shift+Tab
Saw: focus ring on the whole "Everything 77" row (a lock icon appeared on it). Pressing Enter to open the layer.

## Step 28
Command: --step --key Enter
Saw: the right panel now shows the "Everything" layer: Node tab, "Style nodes" checked, Fill > Color = 6366F1 (the purple). That hex box is what I need to change. But it is in the right panel and focus is on the left row. Pressing Tab once to see how far the walk is.

## Step 29
Command: --step --key Tab
Saw: Tab went to "Graph settings" (it skipped the lock and eye on the row). Next comes the bottom toolbar (seven buttons) and then the right panel. No skip key that I can see. Tab eight times and look.

## Step 30
Command: --step --key Tab x8
Saw: focus on the "Style nodes" checkbox in the right panel (so the walk skipped the canvas and panel header faster than feared). Between here and Color: Shape list, link, minus, Size, link, minus, Visibility +, Text +, maybe Fill +. Tab nine times and check.

## Step 31
Command: --step --key Tab x9
Saw: green focus border on the Fill Color box (6366F1). Selecting the text and typing dark green, 006400 (the standard "darkgreen"), then Enter.

## Step 32
Command: --step --key Control+a --type "006400" --key Enter
Result: that went wrong. The colour box was not a text field. Ctrl+A was taken by the app as "select everything in the graph": 77 nodes and 254 edges are now selected (yellow rings, blue edges), the right panel changed to "77 nodes, 254 edges selected", and focus jumped to the "Values" tab. Nothing typed. I lost my place in the right panel - second time focus was thrown somewhere I did not ask for. The box looked exactly like the Size text box above it and had a focus border like a text field.
Next: Escape, expecting it to clear the selection.

## Step 33
Command: --step --key Escape
Saw: "Selection cleared: 77 nodes, 254 edges" notice - good, Escape undid it. But the right panel went back to the Graph view, the Everything layer is no longer open, and focus is on the Graph "Style" tab. I have to walk back: last time it was 7 Shift+Tabs from here to the Everything row. Doing that plus Enter.

## Step 34
Command: --step --key Shift+Tab x7 --key Enter
Saw: Everything layer open again, row focused. Same walk as before: 18 Tabs to the Colour box. This time I will press Enter on it instead of Ctrl+A, to see what kind of control it is.

## Step 35
Command: --step --key Tab x18 --key Enter
Saw: Enter opened a "Color" picker popup. Focus went straight into its Hex box with 6366F1 already selected (highlighted). Good. Typing 006400 over it and pressing Enter.

## Step 36
Command: --step --type "006400" --key Enter
Saw: every one of the 77 nodes is now dark green. The popup closed by itself on Enter, and focus came back to the Colour box, which now reads 006400 with a dark green swatch. Edges are still light grey, which suits a printed handout. Task done. I stop here.

## Wrap-up (Sam, in character)

Did I finish? Yes. Les Miserables is open and every character is dark green (006400), all from the keyboard.

Ease: 3 out of 7 (somewhat difficult). Every step could be done from the keyboard, which counts for a lot, but it took about 108 key presses plus typing, and I lost my place twice.

Key counts:
- Opening the sample: about 38 keys plus typing "Les". Should have been about 6.
- Making nodes dark green: about 70 keys plus typing. Without the Ctrl+A accident it would have been about 40 - still a lot for changing one colour.

What confused me or cost me:
1. "Samples" (header link and the big card button) only scrolls down to a library on the same page. Focus stays behind on the button. Typing went nowhere, and the next Tab from the header went to the 3D demo drawing, past the library, and the page scrolled back up to the top. I thought the library had closed. Focus should move to the library's search box.
2. Long Tab walks: five demo buttons in the landing toolbar, nine separate category chips (Any..Generated) before the first sample card, the whole bottom toolbar between the left and right panels, and 9 stops inside the layer panel before Fill > Color (each property has its own link and minus buttons). There is no key to jump between panels that I could find. From choosing the "Everything" layer to its Colour box was 18 Tabs.
3. Choosing a layer on the left opens its settings on the right, but focus stays on the left. I expected focus to go to the panel that just opened.
4. The Fill Colour box looks and focuses exactly like the Size text box above it, but it is a button that opens a picker. I pressed Ctrl+A to select its text; the app took Ctrl+A as "select all 77 nodes and 254 edges", changed the right panel and threw focus to the Values tab. Escape undid the selection (good, and the notice said so), but it also closed the layer I had open, so I had to walk back: 8 more keys plus 18 Tabs. That is the kind of shortcut that makes me wary.
5. The Graph's own Style tab only has Canvas and Labels - no node colour - so I went there first and had to back out. It was not obvious that node colour lives in a layer called "Everything".

What worked well:
- Focus rings are visible on almost everything (green ring), and tooltips show the shortcuts (Settings Ctrl+, ; Analyze Shift+A).
- Enter on the Colour box opened the picker with the hex text already selected, so I could type straight over it; Enter applied it, closed the popup and put focus back on the box. That part was right.
- Search in the sample library filtered as I typed.
- Escape clearing the selection, with a notice saying what it did.
