# Session r2-s11 -- Sam (keyboard-only analyst), task T15 Prompt B (friends.csv)

Keyboard only: --key, --type, --upload. Key presses counted per part.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s11 empty` -> 01.png
Saw: a start page. Left column "Open project or file..." with a printed Ctrl+O hint, "New from data...", "or drop a file". Middle: Recent projects (empty). Right: four samples. Bottom: a usage-data consent box with "Share usage data" and "No thanks". No focus ring anywhere; focus is on the page itself.
Next: the Ctrl+O hint is printed, so I use it. Shortcut first.

## Step 2 -- Ctrl+O

Command: `--step --key Control+o` -> 02.png
Saw: the tool reports a file chooser opened. Good -- the printed shortcut works with one chord. (1 key so far.)
Next: pick friends.csv from Downloads in the file chooser.

## Step 3 -- upload friends.csv

Command: `--step --upload friends.csv` -> 03.png
Saw: the graph is on screen straight away: 20 dots, 41 arrows, all the same blue, no names. Right panel "Graph, From friends.csv" with an Overview: Nodes 20, Edges 41, Directed, Density 0.1079. Left panel has a "Find nodes, edges, values" box (with a light outline -- I cannot tell if that is focus or just its border), Selection, Everything. Bottom left a printed hint: "Analyze in the toolbar (Shift+A) to add results here". Floating toolbar at the bottom.
Part 1 (get it on screen) DONE in 1 chord + the file pick. Two key actions. Very good.
Next: the hint says Shift+A for Analyze. I am wary it types an "A" if the find box has focus, but I try the printed shortcut.

## Step 4 -- Shift+A

Command: `--step --key Shift+A` -> 04.png
Saw: an analysis menu opened over the drawing, with a "Filter analyses" box that has a clear blue focus ring. Under "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank (tagged "Start here"), Eigenvector, Katz, HITS... Each has a one-line explanation. Good: focus went right into the filter.
Next: "which people matter most" -- PageRank is the one marked Start here. I type its name in the filter, then Enter.

## Step 5 -- type "pagerank"

Command: `--step --type "pagerank"` -> 05.png
Saw: the list filtered to one row, PageRank (Start here), shown highlighted. Focus ring still on the filter box.
Next: Enter, expecting it to run the highlighted row.

## Step 6 -- Enter on PageRank

Command: `--step --key Enter` -> 06.png
Saw: the menu turned into a PageRank settings card: Damping factor 0.85, Weight "None", Advanced, "Under a second", and a blue Run button. The Run button seems to have a faint outer ring -- I think that is focus, but it is subtle; I had to look twice. The friends file has a weight column; I leave Weight at None for a first try.
Next: Enter again, expecting Run.

## Step 7 -- Enter on Run

Command: `--step --key Enter` -> 07.png (tool: the drawing kept moving for a second)
Saw: the dots are now colored orange to dark brown. A legend at top left of the drawing: "Color: Influence 0.04382 to 0.06608". Left panel gained a row "Influence 20" with a small color ramp. Focus came back to the Analyze button in the bottom toolbar, with a visible blue ring and tooltip "Analyze Shift+A". Good focus return.
Part 2 (work out who matters most) DONE: Shift+A, typed filter, Enter, Enter -- 3 keys plus typing. The color stands for "Influence" (PageRank); darker = more influence, I read from the ramp.
Next: make the dots bigger for higher Influence. I expect a size option on the Influence row in the left panel or under Style on the right. Focus is on the toolbar, so I try Shift+Tab to walk back toward the left panel and count.

## Step 8 -- Shift+Tab (1)

Command: `--step --key Shift+Tab` -> 08.png
Saw: the ring left the Analyze button and I cannot see focus anywhere now. Maybe it is on the drawing itself (no ring around the canvas). Lost focus once.
Next: Shift+Tab again to find it.

## Step 9 -- Shift+Tab (2)

Command: `--step --key Shift+Tab` -> 09.png
Saw: a blue vertical bar on the edge between the left panel and the drawing -- looks like a panel resize handle has focus. So the previous stop (no visible ring) was probably the drawing. Visible again, fine.
Next: Shift+Tab once more, hoping to land on the Influence row.

## Step 10 -- Shift+Tab (3)

Command: `--step --key Shift+Tab` -> 10.png
Saw: an eye button on the Influence row has a ring and tooltip "Hide Influence". Not what I want. The row itself must be one stop before.
Next: Shift+Tab once more to the Influence row.

## Step 11 -- Shift+Tab (4)

Command: `--step --key Shift+Tab` -> 11.png
Saw: focus jumped past the Influence row to "Selection" (clear blue ring). So the left panel is probably a list with one Tab stop and arrows inside.
Next: ArrowDown to move to Influence.

## Step 12 -- ArrowDown

Command: `--step --key ArrowDown` -> 12.png
Saw: Influence row now has the ring. Arrows work in the list as I expected. Right panel did not change yet.
Next: Enter to open the Influence item, hoping it shows its style options (size).

## Step 13 -- Enter on Influence

Command: `--step --key Enter` -> 13.png
Saw: right panel switched to "Influence -- Measure from Influence, Oct 6", Style tab, Nodes/Edges toggle, and rows: Fill, Color = Influence (with a minus), Shape +, Effects +, Label +, Tooltip +. No "Size" row is visible; I guess size lives under Shape. Focus stayed on the Influence row on the left (fine).
Next: I need to get to the right panel. Tab forward and count. I expect the eye button, resize handle, drawing, toolbar... this might be a long walk.

## Step 14 -- Tab (1)

Command: `--step --key Tab` -> 14.png
Saw: eye button "Hide Influence", as expected. The order I learned walking backwards: eye, resize handle, drawing, then the toolbar. I do not yet know where the right panel sits in the order.
Next: Tab again (I know the next two are the resize handle and the drawing, so I press Tab twice and look).

## Step 15 -- Tab (2, 3)

Command: `--step --key Tab --key Tab` -> 15.png
Saw: no focus ring anywhere. I assume focus is on the drawing, which shows no ring at all. That is the second time focus has gone invisible on the drawing.
Next: Tab once more; I expect the toolbar or the right panel.

## Step 16 -- Tab (4)

Command: `--step --key Tab` -> 16.png
Saw: Analyze button in the bottom toolbar has the ring again. Four Tabs from the left list to here. The right panel is still ahead.
Next: Tab again; if the toolbar is one stop (arrows inside), the next Tab should leave it.

## Step 17 -- Tab (5)

Command: `--step --key Tab` -> 17.png
Saw: one Tab took me from the toolbar into the right panel: the link "from Influence, Oct 6" has a ring. Good, the toolbar is a single stop.
Next: keep tabbing down the right panel toward Shape +. I expect "...", Style tab, Nodes/Edges, Fill +, Color, minus, then Shape +. I press Tab twice and look.

## Step 18 -- Tab (6, 7)

Command: `--step --key Tab --key Tab` -> 18.png
Saw: Style tab has the ring (past "..."). Seven Tabs since leaving the left list.
Next: Tab twice more -- Nodes/Edges, then probably Fill +.

## Step 19 -- Tab (8, 9)

Command: `--step --key Tab --key Tab` -> 19.png
Saw: the Fill "+" has the ring, tooltip "Add Opacity". Not size. Nine Tabs.
Next: Tab three more -- Color, its minus, then Shape + (where I hope "size" is).

## Step 20 -- Tab (10-12)

Command: `--step --key Tab --key Tab --key Tab` -> 20.png
Saw: the minus beside Color has the ring, tooltip "Remove Color". Three Tabs got me only to here, so there was an extra stop I did not see between. Twelve Tabs so far for this part.
Next: one more Tab to Shape +.

## Step 21 -- Tab (13)

Command: `--step --key Tab` -> 21.png
Saw: Shape "+" has the ring, tooltip "Add to Shape". Thirteen Tabs from the left list to here.
Next: Enter, hoping for a menu with Size.

## Step 22 -- Enter on Add to Shape

Command: `--step --key Enter` -> 22.png
Saw: a small menu: "Size" (highlighted) and "Shape". There it is.
Next: Enter to take Size.

## Step 23 -- Enter on Size

Command: `--step --key Enter` -> 23.png
Saw: a new "Size" row with a number box "1" (focused, ring visible), a chain-link icon, and a minus. The dots did not change. A fixed number makes every dot the same size; I want size to follow Influence. The chain-link icon looks like "link to a value".
Next: Tab to the link icon and read its tooltip.

## Step 24 -- Tab to link icon

Command: `--step --key Tab` -> 24.png
Saw: link icon focused, tooltip "Size by attribute". That is what I want.
Next: Enter.

## Step 25 -- Enter on Size by attribute

Command: `--step --key Enter` -> 25.png
Saw: a "Size by attribute" popup: "Find an attribute" box, then Influence / Influence rank / Influence percentile, and a greyed "id" under "Cannot be used: Holds groups, not amounts". "Influence" row is highlighted (grey), though I see no blue focus ring on the find box or the row -- I am not sure where focus is.
Next: Enter, hoping the highlighted Influence is taken.

## Step 26 -- Enter on Influence (size)

Command: `--step --key Enter` -> 26.png
Saw: the dots now differ in size -- two big dark ones near the bottom middle, small light ones around the edge. The Size row reads "Influence 1 to 3" with a ring around it, so focus came back to the Size field. The key at top left now has two lines: "Size: Influence 0.04382 to 0.06608" and "Color: Influence 0.04382 to 0.06608".
Part 3 (bigger dots for people who matter more) DONE. Count: 5 Shift+Tabs + 1 arrow + Enter to open the Influence item, 13 Tabs to reach Shape +, then Enter, Enter, Tab, Enter, Enter -- about 24 key presses. The 13-Tab walk across the drawing and toolbar to the right panel was the expensive bit.
Next: names on the drawing. There is a "Label +" two rows down in the same panel. Tab toward it and watch the tooltips.

## Step 27 -- Tab (1)

Command: `--step --key Tab` -> 27.png
Saw: a small gear inside the Size field now has a ring (no tooltip shown). Next stops should be the minus, Effects +, Label +.
Next: Tab three times and look.

## Step 28 -- Tab (2-4)

Command: `--step --key Tab --key Tab --key Tab` -> 28.png
Saw: the "Label" heading itself has a ring (it is a focusable thing, unlike Shape and Effects, odd). The Effects + was skipped or counted somewhere. The gear in the Size field lost its ring.
Next: Tab once to the "+" beside Label.

## Step 29 -- Tab (5)

Command: `--step --key Tab` -> 29.png
Saw: Label "+" focused, tooltip "Add label line".
Next: Enter.

## Step 30 -- Enter on Add label line

Command: `--step --key Enter` -> 30.png
Saw: a "Label" popup with "Find an attribute", under Attributes "id" (highlighted), under Influence: Influence, Influence rank, Influence percentile. A new label line "Pick an attribute" appeared in the panel behind. The file only had source and target names, so "id" must be the person's name.
Next: Enter to take "id".

## Step 31 -- Enter on id

Command: `--step --key Enter` -> 31.png
Saw: names are on the drawing: Omar, Pia, Quinn, Ravi, Nora, Milo, Lena, Sam, Kofi, Jada, Theo, Ava, Ivan, Hana, Gus, Ben, Farah, Chloe, Dev, Eli. Some crowd each other at the bottom (Chloe sits on top of a dot under Farah; Eli and Dev overlap). The panel shows a label line "Aa Above | Abc id" and a note "... hidden to avoid overlap" partly covered by the "Label position" tooltip -- focus went to the Label position button. Ava and the dot under Farah are the biggest and darkest.
Part 4 (names on the drawing) DONE: 4 Tabs + Enter + Enter = 6 presses. Cheap, because I was already in the right panel.
Next: the picture file with its key. I see no export button on screen. The likely homes are the menu at top left (three lines) or the "..." at top right of the panel. The "..." is closer in the Tab order, so I Shift+Tab back up the panel toward it and count.

## Step 32 -- Shift+Tab (1-3)

Command: `--step --key Shift+Tab x3` -> 32.png
Saw: "Add to Effects" + focused. The note now reads "20 labels, 0 hidden to avoid overlap" -- all 20 names are drawn.
Next: about ten more Shift+Tabs to the "..." at the top of the panel. I press six and look.

## Step 33 -- Shift+Tab (4-9)

Command: `--step --key Shift+Tab x6` -> 33.png
Saw: the Color field shows a small gear with a faint ring -- that is the hidden extra stop I tripped over earlier; it only appears on focus. The ring is thin and hard to see.
Next: four more Shift+Tabs toward "...".

## Step 34 -- Shift+Tab (10-13)

Command: `--step --key Shift+Tab x4` -> 34.png
Saw: Style tab focused. "..." is one stop back.
Next: Shift+Tab once more, then Enter to open the "..." menu.

## Step 35 -- Shift+Tab, Enter on "..."

Command: `--step --key Shift+Tab --key Enter` -> 35.png
Saw: the "..." menu for this item: Move up (Alt+ArrowUp, already at the top), Move down (Alt+ArrowDown), Delete. Nice key hints, but no export. Dead end #1 for the picture. 15 presses spent looking so far.
Next: Escape to close it, and check where focus lands.

## Step 36 -- Escape

Command: `--step --key Escape` -> 36.png
Saw: menu closed, focus back on "..." with a clear ring. Good.
Next: the three-line menu at the top left is the other candidate. That is a long walk back across the whole window. I Shift+Tab five times and look.

## Step 37 -- Shift+Tab (1-5)

Command: `--step --key Shift+Tab x5` -> 37.png
Saw: back on the "Hide Influence" eye in the left list. Still the find box, the side rail, undo/redo between me and the menu.
Next: four more Shift+Tabs.

## Step 38 -- Shift+Tab (6-9)

Command: `--step --key Shift+Tab x4` -> 38.png
Saw: "Local only" in the top bar is focused (tooltip "Nothing is sent. Opens Settings > Privacy"). The side rail must be one stop. Almost there.
Next: Shift+Tab twice (undo, then maybe the title or the menu).

## Step 39 -- Shift+Tab (10, 11)

Command: `--step --key Shift+Tab x2` -> 39.png
Saw: Undo focused, tooltip "Undo Ctrl+Z". Good hint. The menu is next, maybe after the title.
Next: Shift+Tab, then Enter if the menu has the ring -- I will look first: Shift+Tab only.

## Step 40 -- Shift+Tab (12)

Command: `--step --key Shift+Tab` -> 40.png
Saw: the project name "friends" focused, tooltip "Rename F2". One more back is the menu.
Next: Shift+Tab, Enter.

## Step 41 -- Shift+Tab, Enter on the menu

Command: `--step --key Shift+Tab --key Enter` -> 41.png
Saw: the main menu: Back to start, New project, Open project or file (Ctrl+O), Open sample, Save (Ctrl+S), Save as (Shift+Ctrl+S), Save local copy, Export... (Ctrl+E), Rename (F2), Settings (Ctrl+,), Keyboard shortcuts (?), Help. There it is: Export, Ctrl+E. Had I known Ctrl+E (or "?" for the shortcut list) I would have saved about 30 key presses; nothing on the main screen told me. The walk here from the right panel was 14 Shift+Tabs + Enter, plus 15 wasted on the "..." menu.
Next: I learn the shortcut: Escape to close the menu, then Ctrl+E.

## Step 42 -- Escape

Command: `--step --key Escape` -> 42.png
Saw: menu closed, focus back on the menu button with a ring. Good.
Next: Ctrl+E.

## Step 43 -- Ctrl+E

Command: `--step --key Control+e` -> 43.png
Saw: an Export dialog. Image tab: "A picture of the drawing, 2x, PNG". Preset "To share -- PNG, 2x", View "Current view", Size 1x/2x/4x/400x300, Format PNG/JPEG/WebP, Background Canvas color/Transparent. A preview shows the drawing, and in its top-left corner the small key (Size and Color by Influence) is included. Footer: Cancel, Copy, Export (blue). Focus is on the close X at top right (ring visible). There is no "include key" switch, but the preview has it, so the defaults look right.
Next: the Export button is the last control; from the close X, Shift+Tab should wrap to it if the dialog keeps focus inside. One press, then look.

## Step 44 -- Shift+Tab in the dialog

Command: `--step --key Shift+Tab` -> 44.png
Saw: focus wrapped to the Export button (ring visible). The dialog keeps focus inside. Good.
Next: Enter.

## Step 45 -- Enter on Export

Command: `--step --key Enter` -> 45.png
Saw: tool reports a file saved: friends_current-view.png, 1806 x 1720 (downloads/friends_current-view.png). The dialog closed, a toast "Exported friends_current-view.png" with a close X appeared, and focus went back to the main menu button (tooltip "Main menu: open, save, export, settings"). Focus return is right.
I opened the picture: the whole drawing with all 20 names and, in the top-left corner, the key: "Size: Influence 0.04382 to 0.06608" (a grey wedge) and "Color: Influence 0.04382 to 0.06608" (light orange to dark brown). That is pasteable.
Part 5 (picture file with its key) DONE: Ctrl+E, Shift+Tab, Enter = 3 presses once I knew the shortcut; about 32 presses including the hunt (15 on the wrong "..." menu, 17 walking back to the main menu and opening it).

## End

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s11`

## What the sizes and colors stand for (said out loud)

Both the size and the color of each dot stand for "Influence", the PageRank score the program worked out: bigger and darker brown means more influence in the club, smaller and lighter orange means less. Scores run from about 0.044 to 0.066. Ava is the biggest and darkest, then the dot next to Farah/Chloe at the bottom, then Hana and Ivan. The key does not say what an Influence of 0.066 means in plain words; I only know "higher is more" because the analysis menu said PageRank finds "nodes connected to other well-connected nodes".

## Debrief (in character)

- Did I finish? Yes. All five parts done, keyboard only, never needed the trackball.
- Ease: 5 out of 7.
- Key presses per part: load 2 (Ctrl+O + file); analysis 4 plus typing (Shift+A, type, Enter, Enter); size about 24; names 6; picture about 32 including the hunt, 3 if I had known Ctrl+E. Roughly 70 in all.
- What worked: the printed Ctrl+O on the start page and the "Shift+A" hint under the left list got me two parts in a handful of keys. The Analyze filter took focus at once and Enter ran the highlighted row. Focus came back to a sensible place after every popup and dialog (Analyze button, Size field, "...", menu button). The export dialog keeps Tab inside and wraps to Export. Tooltips on focus ("Add to Shape", "Size by attribute", "Add label line", "Undo Ctrl+Z", "Rename F2") told me what Enter would do.
- What cost me:
    1. Getting from the left list to the right panel: 13 Tabs, walking through the eye button, a panel resize handle, the drawing, and the toolbar. There is no jump-to-panel key that I could find on screen.
    2. Twice focus went invisible: on the drawing itself there is no focus ring at all, so I could not tell where I was until the next Tab.
    3. Hidden stops: the Color and Size fields have a small gear that only appears when it has focus, with a thin ring and no tooltip; I miscounted Tabs because of it.
    4. Export: nothing on the main screen says Ctrl+E or that export lives in the three-line menu. I tried the "..." on the panel first (wrong menu, only Move up/down/Delete). The "Keyboard shortcuts ?" entry is only discoverable inside that menu too.
    5. Size is under "Shape +", not a top-level "Size" row; I guessed right, but only after reading tooltips on Fill + ("Add Opacity").
- Smaller notes: in the picture, the names at the bottom collide (Chloe's name sits on Farah's dot; Eli and Dev overlap), so a reader cannot tell which big dark dot is Farah and which name goes with it. The key shows raw scores with five decimals and no words like "more influential".
