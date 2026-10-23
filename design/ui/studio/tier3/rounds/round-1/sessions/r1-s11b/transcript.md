# Session r1-s11b -- Sam, keyboard only

Task: open the ready-made Les Miserables network, color every character with "Mme" in the name purple, leave the rest, say how many.

## Step 1 -- start
Command: `real.mjs --start <folder> empty --keys`
01.png: a landing page. Big green "Open a file", "Open network data", "Samples", "New project". A spinning demo network on the right. No focus ring anywhere -- nothing has focus yet, which is fine for a fresh page. Samples sounds like where a ready-made network lives. I will Tab and see where focus lands first.

## Step 2 -- Tab (1)
02.png: focus ring on the Main menu (hamburger) top left, with a tooltip "Main menu: open, save, export, settings". Good, visible. "Samples" is the next link in the top bar; one more Tab should reach it.

## Step 3 -- Tab (2)
03.png: focus ring on "Samples" in the top bar. Two Tabs. Pressing Enter.

## Step 4 -- Enter on Samples (3 keys so far)
04.png: "Sample library". First card is "Who holds the novel together -- Les Miserables, 77 nodes, 254 edges". Where is focus? "Samples" in the top bar still has an outline (maybe it is just the current-page marker), and the search box has a darker border. Not sure which. I will Tab once and watch.

## Step 5 -- Tab (4 keys)
05.png: focus moved to "Docs". So after Enter on Samples focus stayed in the top bar, it did not move into the new page. Minor: I now walk past For developers, GitHub, theme and settings to get to the search box. Pressing Tab five more times.

## Step 6 -- Tab x5 (9 keys)
06.png: the Sample library is gone. I am back on the landing page, and focus is a black outline around the whole demo picture area. I only pressed Tab; Tab should never close a page. It looks like the library closed when focus walked out of the top bar, or it was never a page of its own. That cost me the place I had. Finding: focus moved and the view changed under me.
Now I will try the "Samples" button inside the landing card instead. Shift+Tab to see where it sits in the order.

## Step 7 -- Shift+Tab (10 keys)
07.png: focus on Settings, tooltip "Settings... Ctrl+," -- a printed shortcut, noted. So the picture area comes right after the top bar, and the card with Samples is somewhere after it. Tab twice: past the picture, hoping to land in the card or the picture's buttons.

## Step 8 -- Tab x2 (12 keys)
08.png: focus ring on "Communities" in the demo's button strip. Four more buttons in that strip (Key players, Shortest path, 2D, pause), then hopefully the card. Tab five times.

## Step 9 -- Tab x5 (17 keys)
09.png: focus on "Open a file" -- a thin darker outline, faint against the green, but I can see it. Samples should be two more Tabs (Open network data, then Samples).

## Step 10 -- Tab x2 (19 keys)
10.png: focus on the card's "Samples" button. Nineteen key presses to get here from a cold page, nine of them wasted by the vanishing library. Enter.

## Step 11 -- Enter (20 keys)
11.png: the Sample library again. The search box has a dark border -- maybe it has focus, no caret visible to be sure. I will just type "les" and see if it takes it.

## Step 12 -- type "les" (failed)
Typed nothing: the tool says focus is still on the "Samples" button -- the one I pressed, which is now hidden under the library. So the library opened but focus stayed behind it, with no ring visible anywhere on screen. That is the "focus that falls to nowhere" problem, and it explains step 6: Tab walked out of the library and it closed. I will press Tab once, carefully, and look.

## Step 13 -- Tab (21 keys)
13.png: now I understand. The library is not a separate page; it is further down the same page, and "Samples" only scrolled down to it without moving focus. Tab moved focus to "New project" and scrolled back up. Focus ring on New project is visible. The library is below the footer strip, so I have to Tab through "MIT licensed", "Put it on your own site" and whatever else is in that strip to reach the search box. Tab twice.

## Step 14 -- Tab x2 (23 keys)
14.png: focus on "Put it on your own site" in the strip. Next Tab should be the search box. Tab, then type "les" in the same step.

## Step 15 -- Tab + type "les" (27 keys)
15.png: "les" is in the search box, which has a green ring. The page did not scroll to show me the results -- the box is at the very bottom edge and the cards are below the fold. I cannot see whether it filtered. Many search boxes open the first result on Enter; trying Enter.

## Step 16 -- Enter (28 keys)
16.png: nothing visible changed. Enter in the search did not open anything and the page did not scroll to the results. I have to Tab onward: grid/list toggle, then the category chips, then the cards. Tab three times and see where the page scrolls.

## Step 17 -- Tab x3 (31 keys)
17.png: the page scrolled; focus ring on the "Any" chip. The search did filter: two cards, Les Miserables first. If the chips are one group, one Tab should take me past them to the first card. Tab once.

## Step 18 -- Tab (32 keys)
18.png: focus moved to "Social" -- every chip is its own Tab stop, so seven more chips before the card. Expected arrow keys inside a chip group. Eight Tabs to reach the Les Miserables card.

## Step 19 -- Tab x8 (40 keys)
19.png: green ring on the Les Miserables card. Forty key presses to reach a sample, and that is with the search. Enter.

## Step 20 -- Enter on card (41 keys for opening the network)
20.png: the network opened: "Les Miserables", 77 nodes, 254 edges. Left panel: "Find nodes, edges, values" search, "Style layers" with a "+" and three layers (Hovered, Selected, Everything). Right panel: Overview numbers. A notice at the bottom about saving a copy. I cannot see a focus ring anywhere. Plan: search "Mme" in the find box, then hopefully turn the matches into a style layer and set purple. First, Tab once to find focus.

## Step 21 -- Tab (1 key in workspace)
21.png: focus ring on "From Les Miserables" in the right panel. So after opening, focus was left near the right panel, not on the find box I need on the left. The notice went away. Shift+Tab to walk backwards and see what order the left side is in.

## Step 22 -- Shift+Tab x2 (3 keys)
22.png: black outline around the whole drawing area -- the canvas has focus. Keep going backwards toward the left panel. Shift+Tab twice.

## Step 23 -- Shift+Tab x2 (5 keys)
23.png: focus on "Graph settings" at the bottom of the left panel (green outline). Above it are the three layer rows, the "+", and the find box. Shift+Tab four more times.

## Step 24 -- Shift+Tab x4 (9 keys)
24.png: overshot by one; focus is on the "Graph Les Miserables" row at the top of the left panel. The find box is the next stop. Tab once, then type "Mme".

## Step 25 -- Tab + type "Mme" (13 keys in workspace)
25.png: good. "Nodes 6": MmeMagloire, MmeDeR, MmeThenardier, MmeBurgon, MmePontmercy, MmeHucheloup, plus 26 edges. First result is highlighted (pale green). So six married women. Now to make them purple. No hint printed about how to act on all matches. I will try Enter to see what it does with the highlighted result.

## Step 26 -- Enter (14 keys)
26.png: Enter selected just the first match, MmeMagloire (ringed in yellow on the canvas; right panel shows it; "Selected 1"). It also emptied the search, so the other five are gone from the list. Not what I wanted -- I wanted all six. Different route: the "+" beside "Style layers" probably makes a layer that I can point at some nodes. I cannot see focus now; Tab once to find it.

## Step 27 -- Tab (15 keys)
27.png: focus on "Node actions" (the ... in the right panel), tooltip shown. Focus had jumped to the right panel after Enter. Since I am here, I will open Node actions and read what it offers -- maybe a "style matches" kind of item.

## Step 28 -- Enter on Node actions (16 keys)
28.png: menu with key hints printed: Neighborhood G, Path between... P, Frame selection F, New layer from selection (no key), Add note N. "New layer from selection" is what I want, but only after all six are selected, and I have only one. Escape out and try the "+" beside Style layers instead; maybe a layer can be pointed at "name contains Mme".

## Step 29 -- Escape (17 keys)
29.png: menu closed and focus went back to the ... button. Good. Now back across the canvas to the left panel's "+". From my earlier walk, Graph settings is about four Shift+Tabs away. Shift+Tab x5.

## Step 30 -- Shift+Tab x5 (22 keys)
30.png: focus ring on the "Everything" layer row, which now shows a lock icon too. The "+" is just above. Shift+Tab once.

## Step 31 -- Shift+Tab (23 keys)
31.png: focus on "+", tooltip "Add a layer or a folder". Enter.

## Step 32 -- Enter (24 keys)
32.png: a menu: Layer (highlighted), Folder, Select layers..., Analyze... Shift+A. "Layer" is highlighted; Enter.

## Step 33 -- Enter on Layer (25 keys)
33.png: "Layer 1" added above Everything, with its name selected for editing -- nice, focus is right where I need it. Right panel: Style tab, "Style nodes" checked, "Which nodes: All 77 nodes: add a condition to narrow", then Shape, Visibility, Text, Fill, Effects, Rendering. Plan: rename, then narrow to Mme, then Fill purple. Typing a name and Enter.

## Step 34 -- type "Married women" + Enter (27 keys)
34.png: layer renamed "Married women", focus ring on its row. It still covers 77 of 77 nodes. Now I need the right panel's "Which nodes". I have to Tab across: probably the row's lock and eye, the Everything row, Graph settings, the canvas, then the right panel. Tab four and look.

## Step 35 -- Tab x4 (31 keys)
35.png: focus on "Analyze Shift+A" in the bottom toolbar. Seven buttons in that toolbar to cross, then probably the canvas, then the right panel. Tab x8.

## Step 36 -- Tab x8 (39 keys)
36.png: overshot, focus on Visibility "+" ("Add to node visibility"). "Which nodes" is two stops back (past Shape +). Shift+Tab x2.

## Step 37 -- Shift+Tab x2 (41 keys)
37.png: focus ring around the "Which nodes" block. Enter to expand it.

## Step 38 -- Enter (42 keys)
38.png: expanded. "Nodes that pass every condition", focus already on "+ Add a condition", and a "Done" button. Good focus handling. Enter.

## Step 39 -- Enter (43 keys)
39.png: an attribute picker: "Find an attribute" box, Data: name; Structure: Node id. No highlighted option yet and no visible caret, so I assume focus is in the find box. ArrowDown to "name", Enter.

## Step 40 -- ArrowDown (44 keys)
40.png: "name" highlighted. Enter.

## Step 41 -- Enter (45 keys)
41.png: condition "name Contains [Type the text to match]", Match case off. Focus ring is on the text box already. Typing "Mme".

## Step 42 -- type "Mme" (48 keys)
42.png: "6 nodes" beside the condition, layer row now says 6, "6 of 77 nodes". A suggestion list dropped open (Mme Burgon, Mme de R, Mme Hucheloup, Mme Magloire, Mme Pontmercy, Mme Thenardier) and covers the Done button. I do not want Enter to pick one suggestion and replace my text, so Escape to close only the list.

## Step 43 -- Escape (49 keys)
43.png: list closed, condition kept: name Contains "Mme", 6 nodes. Focus still in the text box. Now to Fill "+": Match case, Add a condition, Done, Shape, Visibility, Text, Fill -- seven Tabs.

## Step 44 -- Tab x7 (56 keys)
44.png: focus on Fill "+", tooltip "Add to node fill". The Which nodes block folded itself up to a summary "name contains Mme, 6 nodes" when focus left it -- fine, and my count landed right anyway. Enter.

## Step 45 -- Enter (57 keys)
45.png: Fill opened with "Color" and a hex box, 6366F1 already selected and focused. The default is the same blue-violet as every other node, so nothing changed on screen yet. I will type a plain purple hex, 800080, and Enter.

## Step 46 -- type "800080" + Enter (64 keys)
46.png: done. The color box reads 800080 with a purple swatch, and dark purple dots now show in the picture; the rest stay the blue-violet they were. A legend appeared top left of the drawing: "Color: Married women -- 6 of 77 nodes". The layer row says 6. MmeMagloire is still selected (yellow ring) from my earlier Enter in the search; that is a selection, not a style, so I leave it. The list button in the bottom toolbar lit up green at the same time (it looks like the legend toggle came on by itself); I did not press it.

Key count: about 20 to reach the sample library, 21 more to open Les Miserables (41), then 64 inside the workspace to find the six and paint them -- roughly 105 key presses in all, around 30 of them lost to wrong turns.

## End of session (in character)

**Did I finish?** Yes. Les Miserables is open, a layer "Married women" (name contains "Mme") paints 6 nodes purple (#800080), everyone else unchanged. There are **6**: Mme Burgon, Mme de R, Mme Hucheloup, Mme Magloire, Mme Pontmercy, Mme Thenardier.

**Ease: 4 of 7.** Every step could be done from the keyboard -- no pointer needed anywhere, which I count in its favour. Focus rings were visible nearly everywhere, menus showed their shortcuts, the new layer put me straight into its name, "Add a condition" and the condition's text box received focus on their own, and Escape closed menus and returned focus to where I was. The cost was in getting there.

**What confused me / cost me:**
- "Samples" (top bar and the landing card) scrolls to a library further down the same page but leaves focus on the button. Nothing visible had focus; my first attempt Tabbed straight back up into the hero and I thought the library had closed. Typing into what looked like the search box typed nothing. Focus should move into the library (its search box).
- Typing in the library search and pressing Enter does nothing, and the results sit below the fold; I had to Tab past the grid/list toggle and nine category chips, each its own Tab stop, to reach the first card. Arrow keys inside the chip row, or Enter in the search opening the top match, would have saved ten presses.
- After the network opened, focus sat in the right panel. To reach the find box on the left I walked back through the canvas and the left panel; to reach "Which nodes" on the right I walked forward through the bottom toolbar's seven buttons. Moving between the left panel and the right panel is a long trip every time, and I saw no shortcut to jump to either.
- Enter in the find results selects only the first match and clears the search. There was no visible way to act on all six matches at once (select all, or "make a layer from these"), so I had to build the rule by hand in a new layer. It worked, but I only knew to try because the layer panel was there.
- The value suggestions under the condition box opened over the Done button; I closed them with Escape to be safe.
