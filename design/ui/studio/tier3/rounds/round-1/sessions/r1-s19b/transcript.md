# Session r1-s19b -- Sam, keyboard only

Task: open volunteers.graphml, find the circles (communities) each in its own color, keep color only on people who finished food-safety training, everyone else as originally; report how many still have a circle's color.

## Step 1 -- start
Command: real.mjs --start <folder> empty --keys -> 01.png
Sam: Landing page. Big green "Open a file" button. No focus ring anywhere yet -- nothing has focus. I'll press Tab once to see where focus lands. Key presses so far: 0.

## Step 2 -- Tab
Command: --step --key Tab -> 02.png
Sam: Focus ring is on the Main menu button top left, with a tooltip "Main menu: open, save, export, settings". Good, visible. The menu says "open", so I'll press Enter on it rather than walk Tab through the header links to "Open a file". 1 key so far.

## Step 3 -- Enter on Main menu
Command: --step --key Enter -> 03.png
Sam: Menu opened, first item "New project" highlighted. Second item "Open project or file... Ctrl+O" -- noted the shortcut, and "Keyboard shortcuts ?" too. I'll press ArrowDown then Enter, and pick the file in the file chooser. 2 keys so far.

## Step 4 -- ArrowDown, Enter, pick volunteers.graphml
Command: --step --key ArrowDown --key Enter --upload volunteers.graphml -> 04.png
Sam: A preview "Open as a new graph": 24 nodes, 63 edges, columns id, name, role, hours, trained (yes/no), phone. "trained" is the food-safety column I need. The Load button bottom right appears to carry the focus ring (double outline). I'll press Enter. Opening the file: 4 keys plus the OS file chooser.

## Step 5 -- Enter on Load
Command: --step --key Enter -> 05.png
Sam: Graph is loaded: 24 nodes, three clusters, all nodes one blue-violet -- that is the "as the file first opened" look I must return the untrained people to. I cannot see a focus ring anywhere now; focus went somewhere invisible after the load. There is a flask icon in the bottom toolbar that is probably analysis. Before Tab-walking, I'll press "?" which the menu listed as Keyboard shortcuts. Total so far: 5 keys.

## Step 6 -- "?"
Command: --step --key "?" -> 06.png
Sam: A Keyboard shortcuts dialog, focus ring on its close X. Useful list: F6 next panel, Ctrl+K "Quick actions". A command palette is exactly what I want. Escape to close, then Ctrl+K. 6 keys.

## Step 7 -- Escape, Ctrl+K
Command: --step --key Escape --key Control+k -> 07.png
Sam: Quick actions palette opened with a "Search commands" box (I assume focus is in it; the box border is darker but there is no strong ring). I'll type "communit". 8 keys.

## Step 8 -- type "communit"
Command: --step --type "communit" -> 08.png
Sam: "No results." The landing page had a "Communities" button, so I expected the palette to know the word. I'll clear it (Ctrl+A) and try "analy" -- the shortcuts list had an Analyze category. 16 keys.

## Step 9 -- Ctrl+A, type "analy"
Command: --step --key Control+a --type "analy" -> 09.png
Sam: One result: "Analyze  Shift+A". Learned: Shift+A. Enter to run it. 22 keys.

## Step 10 -- Enter on Analyze
Command: --step --key Enter -> 10.png
Sam: An analyses list with "Filter analyses" box, focus ring visible on it (green outline). Good. I'll type "commun" to filter. 23 keys.

## Step 11 -- type "commun"
Command: --step --type "commun" -> 11.png
Sam: "Find groups": Louvain is highlighted first, "Which nodes form densely linked groups." That is the circles. Enter. 29 keys.

## Step 12 -- Enter on Louvain
Command: --step --key Enter -> 12.png
Sam: Louvain settings (Resolution 1, Weight None). Focus ring sits on the Run button already -- nice, Enter will run it. 30 keys.

## Step 13 -- Enter on Run
Command: --step --key Enter -> 13.png
Sam: Done: three circles, Group 1 orange, Group 2 light blue, Group 3 green, with a legend. A "Louvain" layer appeared in Style layers on the left. Focus came back to the flask button in the bottom toolbar (ring visible) -- good, not lost. Part 2 (circles colored): 31 keys from file loaded, of which 14 were letters typed into search boxes.
Now I need to narrow the Louvain layer to trained people. I'll press F6 (Next panel) to get to the left panel. 32 keys.

## Step 14 -- F6
Command: --step --key F6 -> 14.png
Sam: A thin dark outline now frames the left panel's header "Graph volunteers.graphml" -- faint, but I can see it. I'll Tab into the panel, aiming for the Louvain row. 33 keys.

## Step 15 -- Tab
Command: --step --key Tab -> 15.png
Sam: Focus (green ring) on the "Find nodes, edges, values" box. Tab again toward the layers. 34 keys.

## Step 16 -- Tab
Command: --step --key Tab -> 16.png
Sam: Focus on "+" with tooltip "Add a layer or a folder". Not what I want yet. Tab again to reach the layer list. 35 keys.

## Step 17 -- Tab
Command: --step --key Tab -> 17.png
Sam: Focus ring on the "Everything" row. It looks like a tree, so arrows should move inside it. ArrowUp to Louvain. 36 keys.

## Step 18 -- ArrowUp
Command: --step --key ArrowUp -> 18.png
Sam: Focus on the Louvain row; it is a folder with a small arrow. The right panel still shows the Graph, so focus is not selection. ArrowRight to open the folder. 37 keys.

## Step 19 -- ArrowRight
Command: --step --key ArrowRight -> 19.png
Sam: Folder opened: Group 1, Group 2, Group 3, 8 nodes each. Three layers -- I hope I can narrow the whole folder at once rather than each group. Enter on the folder to see what the right panel offers for it. 38 keys.

## Step 20 -- Enter on Louvain folder
Command: --step --key Enter -> 20.png
Sam: Right panel now shows the Louvain folder: "3 layers in Louvain", Node tab, "Which nodes 24 of 24 nodes" with a chip "Louvain: <<Layer>>", and Fill Color by layer. "Which nodes" is where I narrow it. F6 to move to the right panel. 39 keys.

## Step 21 -- F6
Command: --step --key F6 -> 21.png
Sam: The ring left the Louvain row, but I cannot see it anywhere else. No visible focus. Last time F6 showed a thin outline on the panel header; this time nothing on the right panel. I'll press Tab and look. 40 keys.

## Step 22 -- Tab
Command: --step --key Tab -> 22.png
Sam: Found it: focus on a small icon in the right panel header, tooltip "Select what it paints". So the F6 before had put focus on the right panel without a visible ring. I need "Which nodes", which is further down: menu, tabs, Node, checkbox... I'll press Tab three times and look. 41 keys.

## Step 23 -- Tab x3
Command: --step --key Tab --key Tab --key Tab -> 23.png
Sam: Focus ring on the "Node" toggle. Two more Tabs should be the "Style nodes" checkbox then "Which nodes". Tab, Tab. 44 keys.

## Step 24 -- Tab x2
Command: --step --key Tab --key Tab -> 24.png
Sam: Ring around the whole "Which nodes" block. Enter to open it. 46 keys.

## Step 25 -- Enter on Which nodes
Command: --step --key Enter -> 25.png
Sam: Opened: "Nodes that pass every condition", one condition card "Louvain <<Layer>> 3 layers" (ring on it), then "+ Add a condition" and Done. Pass every condition = AND, which is what I want. Tab toward "Add a condition" -- likely the X first. Tab once and look. 47 keys.

## Step 26 -- Tab
Command: --step --key Tab -> 26.png
Sam: Ring on "+ Add a condition" (it skipped the X -- fine). Enter. 48 keys.

## Step 27 -- Enter on Add a condition
Command: --step --key Enter -> 27.png
Sam: An attribute picker: "Find an attribute" box (presumably focused, faint), list name, role, hours, trained (2 values), phone. I'll type "trained" and press Enter. 49 keys.

## Step 28 -- type "trained"
Command: --step --type "trained" -> 28.png
Sam: Filtered to "trained 2 values", highlighted. Enter. 56 keys.

## Step 29 -- Enter on trained
Command: --step --key Enter -> 29.png
Sam: A second condition "trained = Yes, 15 nodes" was added with Yes already chosen (ring on the Yes select). "Which nodes 15 of 24 nodes"; Group 1, 2, 3 now 5 each; the legend says "15 of 24 nodes". On the canvas the untrained people went back to the original blue-violet; the others keep orange, light blue, green. That is the job. I'll Tab to Done to close the editor tidily. 57 keys.

## Step 30 -- Tab
Command: --step --key Tab -> 30.png
Sam: Ring on "Add a condition". One more Tab to Done, then Enter. 58 keys.

## Step 31 -- Tab, Enter on Done
Command: --step --key Tab --key Enter -> 31.png
Sam: Editor closed; focus came back to the "Which nodes" block (ring visible) -- not thrown to the top. Summary chips: "Louvain: <<Layer>>" and "trained: yes, 15 nodes", "15 of 24 nodes". Groups 1-3 show 5 each, legend "15 of 24 nodes". I count on the canvas 5 orange, 5 light blue, 5 green; the remaining 9 are the original blue-violet. Done. 60 keys total.

## Wrap-up (in character)

**Did I finish?** Yes. 15 people still have a circle's color (5 in each of the three circles); the 9 who have not finished food-safety training look as they did when the file opened.

**Ease: 5 of 7.** Every step was possible from the keyboard; I never needed the trackball. About 60 key presses in all, roughly 25 of them letters typed into search boxes, which I do not mind.

Key counts per part:
- Open the file: 4 keys (Tab, Enter, ArrowDown, Enter) plus the file chooser, plus Enter on Load.
- Find the circles: ~26 keys (?, Escape, Ctrl+K, a wrong search, Ctrl+A, "analy", Enter, "commun", Enter, Enter on Run). Without my detour it would be Shift+A, "commun", Enter, Enter -- about 10.
- Narrow to trained: ~28 keys, mostly Tab walking (F6, 3 Tabs, ArrowUp, ArrowRight, Enter, F6, 6 Tabs, Enter, Tab, Enter, "trained", Enter, Tab, Tab, Enter).

What confused me or cost me:
- After the file loaded, focus was nowhere visible. I had to find my way with "?" and Ctrl+K.
- Quick actions (Ctrl+K) does not know the word "community" or "communit" -- "No results" -- although the front page has a "Communities" button and the analysis list finds Louvain under "commun". I had to guess "analy" first.
- F6 to the right panel showed no focus ring at all; the first time F6 went to the left panel it showed only a faint outline. I had to press Tab to discover where I was.
- In the right panel, getting from the header to "Which nodes" was 6 Tabs (select-what-it-paints, menu, tabs, Node, checkbox...). No shortcut to jump to the condition editor.
- Focus on a layer row does not select it; I needed Enter to make the right panel follow. Fine once known, but the panel did not change on arrowing, which surprised me.
- Good: tooltips on focus with names; Run button already focused in the Louvain form; the attribute picker filters as I type; focus returned to a sensible place after Run and after Done.
