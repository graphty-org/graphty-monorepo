# Session r1-s18 -- Sam, keyboard only

Task: open the college football sample, run the program's own clustering (not the conferences), colored per cluster, then draw every cluster's nodes as cubes keeping colors.

## Step 1 -- start
Command: real.mjs --start <folder> empty --keys
Screen: landing page. "Open a file", "Open network data", "Samples", "New project". A demo graph on the right with a Communities chip. No focus ring visible: nothing focused yet.

## Step 2 -- Tab (1 key)
Command: --step --key Tab
Screen: focus ring on the Main menu button top-left, with a tooltip "Main menu: open, save, export, settings". Good, visible. I want "Samples" in the top bar; next Tab should reach it.

## Step 3 -- Tab (2 keys total)
Command: --step --key Tab
Screen: focus ring on "Samples" in the top bar. Pressing Enter.

## Step 4 -- Enter (3 keys)
Command: --step --key Enter
Screen: Sample library. College football card ("Conferences fall out of who played whom") is third. Samples link still shows a ring; the search box has a darker border, maybe focused. Unsure where focus is. I will type "football" and see if it lands in the search box.

## Step 5 -- type "football" (failed)
Command: --step --type "football"
Result: focus is still on the "Samples" link; nothing typed. The page changed but focus stayed in the header. Tab once more should reach the search box.

## Step 6 -- Tab (4 keys)
Command: --step --key Tab
Screen: focus moved to "Docs" in the header. So the header is walked before the page. Four more header items (For developers, GitHub, theme, settings) sit between me and the search box. Pressing Tab five times.

## Step 7 -- Tab x5 (9 keys)
Command: --step --key Tab x5
Screen: the page scrolled back to the top. A thick black frame is around the whole hero/drawing area, so focus is on that region. The sample library must be further down the same page, behind everything in the hero. That is a long walk. Tab once more to see what is next.

## Step 8 -- Tab (10 keys)
Command: --step --key Tab
Screen: focus on the demo's "Communities" chip, top right. The demo's chips come before the Open/Samples buttons. Four more chips, then (I guess) Open a file, Open network data, Samples. Pressing Tab seven times.

## Step 9 -- Tab x7 (17 keys)
Command: --step --key Tab x7
Screen: focus ring (thin dark outline) on the hero "Samples" button. Faint, but visible. Pressing Enter.

## Step 10 -- Enter (18 keys)
Command: --step --key Enter
Screen: scrolled down to the same Sample library. No focus ring anywhere I can see. Focus probably stayed on the hero button above, now off screen. Trying to type into search in case it took focus.

## Step 11 -- type "football" (failed again)
Command: --step --type "football"
Result: focus is still on the hero "Samples" button, off screen. Second time the Samples control scrolled the page but left focus behind. Tab twice (New project, then hopefully something in the library).

## Step 12 -- Tab x2 (20 keys)
Command: --step --key Tab x2
Screen: focus on "MIT licensed on GitHub" in the strip above the library. "Put it on your own site" is probably next, then the search box. Tab twice.

## Step 13 -- Tab x2 (22 keys)
Command: --step --key Tab x2
Screen: the search box at the bottom edge has a green border now; looks focused. The page did not scroll it into full view. Typing "football".

## Step 14 -- type "football" (30 keys counting 8 letters)
Command: --step --type "football"
Screen: "football" is in the search box at the bottom edge; the results are below the fold, I cannot see them. Trying Enter, hoping it opens the only match.

## Step 15 -- Enter (31 keys)
Command: --step --key Enter
Screen: nothing visible changed. Enter in the search does not open the match. Results still below the fold. Tab three times to see what follows the search.

## Step 16 -- Tab x3 (34 keys)
Command: --step --key Tab x3
Screen: page scrolled; one match, the College football card. Focus on the "Any" filter chip. If the chips are one group, one Tab should reach the card; if not, eight more. Tab once.

## Step 17 -- Tab (35 keys)
Command: --step --key Tab
Screen: focus moved to "Social". Every filter chip is its own Tab stop. Seven more Tabs to get past Generated to the card. Pressing Tab eight times.

## Step 18 -- Tab x8 (43 keys)
Command: --step --key Tab x8
Screen: green ring around the College football card. Pressing Enter.

## Step 19 -- Enter (44 keys)
Command: --step --key Enter
Screen: the College football network is open: 115 nodes, 613 edges, all one blue. Left: style layers. Right: Overview values. Bottom toolbar of icons (flask, chart, 3D, list, table, filter, search). A notice about saving a copy.
Part 1 (open the sample): 44 key presses. Too many; most of them were the header and the landing-page demo, and twice the Samples control scrolled the page but left focus behind.
No focus ring visible now. Looking for a command palette: trying Control+k, the usual one.

## Step 20 -- Control+k (1 key, part 2)
Command: --step --key Control+k
Screen: a command palette, "Search commands", with key hints (F6 next panel, / find). Good. The box looks focused. Typing "communit".

## Step 21 -- type "communit" (9 keys)
Command: --step --type "communit"
Screen: "No results". Trying "cluster" instead (Control+a, then type).

## Step 22 -- Control+a, type "cluster" (17 keys)
Command: --step --key Control+a --type "cluster"
Screen: "No results" again. The palette does not know algorithms by these words. The flask icon at the bottom is probably "analyze". Trying "analy".

## Step 23 -- Control+a, type "analy" (23 keys)
Command: --step --key Control+a --type "analy"
Screen: one result, "Analyze", hint Shift+A. Learned. Pressing Enter.

## Step 24 -- Enter (24 keys)
Command: --step --key Enter
Screen: an Analyze list opened with "Filter analyses" focused (green ring). Rank-type items first. Typing "communit" to filter.

## Step 25 -- type "communit" (32 keys)
Command: --step --type "communit"
Screen: "Find groups": Louvain (highlighted, "Which nodes form densely linked groups"), Leiden, Label propagation, ... Louvain fits. Enter.

## Step 26 -- Enter (33 keys)
Command: --step --key Enter
Screen: Louvain options (Resolution 1, Weight None), "Under a second", and focus already on the green Run button with a ring. Nice: focus went where I need it. Enter.

## Step 27 -- Enter on Run (34 keys)
Command: --step --key Enter
Screen: the nodes are colored in 10 groups; a legend "Color: Louvain" Group 1..10 top-left; a "Louvain" folder appeared in Style layers. Focus returned to the flask button in the bottom bar (ring visible) -- good, not thrown to the top.
Part 2 (clusters, colored): 34 key presses from Control+k, 10 of them wasted on palette words that found nothing ("communit", "cluster").
Now cubes. The Louvain folder in the left panel is where I would expect to change the shape. The palette listed F6 for "Next panel". Trying F6.

## Step 28 -- F6 (1 key, part 3)
Command: --step --key F6
Screen: a dark outline around the left panel's top ("Graph College football"); focus is on the panel. The layers list is below. Tab once.

## Step 29 -- Tab (2 keys)
Command: --step --key Tab
Screen: focus in the "Find nodes, edges, values" box. Tab again (expect the + button, then the layer list).

## Step 30 -- Tab (3 keys)
Command: --step --key Tab
Screen: focus on "+" with tooltip "Add a layer or a folder". I want the Louvain folder instead. Tab again into the list.

## Step 31 -- Tab (4 keys)
Command: --step --key Tab
Screen: focus ring on the "Everything" row (the list remembers it as current, I suppose). Arrow Up to the Louvain folder.

## Step 32 -- ArrowUp (5 keys)
Command: --step --key ArrowUp
Screen: focus ring on "Louvain" folder. The right panel still shows the Graph, so moving focus did not select it. Pressing Enter to select it.

## Step 33 -- Enter (6 keys)
Command: --step --key Enter
Screen: Louvain folder selected. Right panel: "Louvain, Folder", Style tab: "10 layers in Louvain. Layers added later are not changed." Sections Shape (+), Visibility, Text, Fill (Color <<Layer>>, the 10 colors), Effects, Rendering. Editing the folder should change all ten clusters at once -- that is what I want. Need the "+" next to Shape. F6 to jump to the next panel.

## Step 34 -- F6 (7 keys)
Command: --step --key F6
Screen: the ring left the Louvain row, but I cannot see focus anywhere now. No ring on the canvas, the bottom bar, or the right panel. Probably the drawing has it. F6 again.

## Step 35 -- F6 (8 keys)
Command: --step --key F6
Screen: now a black frame around the drawing area. So the previous F6 stop had no visible focus at all (unknown place). One more F6 for the right panel.

## Step 36 -- F6 (9 keys)
Command: --step --key F6
Screen: focus on the bottom bar's Analyze button (tooltip "Analyze Shift+A"). Still not the right panel. F6 again.

## Step 37 -- F6 (10 keys)
Command: --step --key F6
Screen: back on the Louvain row in the left panel. So the F6 cycle is: left panel -> (invisible stop) -> drawing -> bottom bar -> left panel. The invisible stop must be the right panel, with no ring shown. Going there (F6) and then Tab once to find a visible control.

## Step 38 -- F6, Tab (12 keys)
Command: --step --key F6 --key Tab
Screen: focus on the "Select what it paints" icon at the top of the right panel. Confirmed: the right panel's F6 stop shows no ring until Tab. Between here and Shape "+": more menu, Style/Values tabs, Node/Edge, Style nodes, Which nodes, the chip. Tab seven times.

## Step 39 -- Tab x7 (19 keys)
Command: --step --key Tab x7
Screen: focus on Visibility "+" ("Add to node visibility"). One too far. Shift+Tab back to Shape "+", then Enter.

## Step 40 -- Shift+Tab, Enter (21 keys)
Command: --step --key Shift+Tab --key Enter
Screen: a small menu: "Shape" (highlighted), "Size". Enter on Shape.

## Step 41 -- Enter (22 keys)
Command: --step --key Enter
Screen: a Shape row appeared: a dropdown showing "Icosphere", with a green border -- I think focus moved into it. Pressing Enter to open the list.

## Step 42 -- Enter (23 keys)
Command: --step --key Enter
Screen: a long shape list opened; "Box" is first -- a cube. No option looks highlighted, so I cannot tell where I am in the list. Pressing Home to jump to the top.

## Step 43 -- Home (24 keys)
Command: --step --key Home
Screen: "Box" highlighted green. Home works. Enter.

## Step 44 -- Enter on Box (25 keys)
Command: --step --key Enter
Screen: every node is now a cube, each still in its cluster color (yellow, purple, orange, light blue, red, tan, green, pink, dark blue, salmon). The Shape row says "Box" and "Shape: 10 changed" with an Undo. The legend now reads "Shape: Louvain -- Box" above "Color: Louvain -- Group 1..". Focus stayed on the Shape dropdown. Done.
Part 3 (cubes, colors kept): 25 key presses from the first F6.

## Debrief (in character, Sam)

Did I finish? Yes. College football is open, the program's own Louvain clusters color the teams in 10 groups, and all ten clusters are drawn as cubes with their colors unchanged. Not one step needed a pointer.

Key count: about 103 presses. 44 to open the sample, 34 to get the clusters, 25 to make them cubes.

Ease: 4 of 7. Everything worked from the keyboard. Getting into the app was the expensive part, and it hurt.

What confused me or cost me:
- The landing page. Both "Samples" controls (the one in the header and the hero button) scroll the page down to the library but leave focus on the button. Twice I typed "football" and nothing went in. To reach the library search I had to Tab through the header, the demo's five chips, the hero buttons and the strip of links: about 20 Tabs. Then each of the nine filter chips is its own Tab stop, so it took 8 more to get from the search box to the only result. Enter in the search box does nothing. I would expect Samples to put me in the search box, and Enter or Down Arrow to take me to the first match.
- The command palette (Control+k) is good and shows its key hints (F6, Shift+A, /). But "community" and "cluster" found nothing, and only "analy" found Analyze. Inside Analyze, "communit" found Louvain right away. The palette should find the algorithms by name or by what they do.
- Run and close were very good. After Run, focus came back to the Analyze button and was not thrown away.
- F6 cycles panels, but the right-hand panel's stop shows no focus ring at all. I lost my place there and walked the full cycle (left, nothing visible, drawing, bottom bar, back to left) before I worked out that the invisible stop was the right panel. That is four wasted presses and a moment of "where am I".
- Arrowing to a layer in the list does not select it; Enter does. That is fine once you know.
- When the shape list opened, no option was highlighted, so I could not tell where I was. Home worked and highlighted Box.
- Editing the Louvain folder changed all 10 cluster layers at once ("10 changed") and kept their colors. That was exactly right.
