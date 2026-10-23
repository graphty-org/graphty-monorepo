# Session r1-s39 -- Grace (nonprofit operations analyst)

Task: bring neighbors.csv in; make the family ties thick and red; leave people and other ties as they are.

## Step 1 (01.png)
Command: `REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <folder> empty`
Notes: Landing page. Big green "Open a file" button, and "It never leaves your computer" -- good, that's what I need for donor names. I'll click Open a file and pick neighbors.csv.

## Step 2 (02.png)
Command: `--step <folder> --click "Open a file" --upload neighbors.csv`
Notes: A preview. "30 edge rows read; the load makes 16 nodes and 30 edges." 30 rows matches my spreadsheet. It picked From/To on its own and kept kind, years_known, close as attributes -- kind has "family", "neighbors", "coworkers". Good, no reshaping needed. Clicking Load.

## Step 3 (03.png)
Command: `--step <folder> --click "Load"`
Notes: Loaded. Right side says Nodes 16, Edges 30 -- that's everyone. Left has "Style layers" with Hovered, Selected, Everything, and a + button. I want a rule just for family ties, so I'll press the + next to Style layers.

## Step 4 (04.png)
Command: `--step <folder> --click-at 276,122` (the + "Add a layer or a folder")
Notes: Small menu: Layer, Folder, Select layers..., Analyze... I'll pick "Layer".

## Step 5 (05.png)
Command: `--step <folder> --click-at 210,158` (menu item "Layer")
Notes: "Layer 1" appeared with its name selected for renaming. The right panel has Node / Edge tabs. I'll name it "Family ties" so I know what it is next quarter.

## Step 6 (06.png)
Command: `--step <folder> --type "Family ties" --key Enter`
Notes: Renamed. It's on the "Node" tab with "Style nodes" ticked for all 16 -- I don't want to touch the people. Nothing is set yet so it should be harmless. I want ties, so I'll click the "Edge" tab.

## Step 7 (07.png)
Command: `--step <folder> --click-at 1292,142` (tab "Edge")
Notes: "Which edges: All 30 edges: add a condition to narrow". That's what I need -- only the family ones. I'll open "Which edges".

## Step 8 (08.png)
Command: `--step <folder> --click-at 1260,201` (button "Which edges")
Notes: "Edges that pass every condition" and "+ Add a condition". Clicking Add a condition.

## Step 9 (09.png)
Command: `--step <folder> --click "Add a condition"`
Notes: A list of my columns: years_known, close, kind (3 values). "kind" is the one with family in it. Clicking kind.

## Step 10 (10.png)
Command: `--step <folder> --click-at 1268,400` (option "kind, 3 values")
Notes: "kind Is any of" with checkboxes: neighbors 16, family 8, coworkers 6. 16+8+6 = 30, that adds up. Ticking family.

## Step 11 (11.png)
Command: `--step <folder> --click-at 1229,315` (family checkbox)
Notes: family ticked: "8 of 30 edges". And it now says "Edge layer" and "Node not styled" -- good, the people won't be touched. Clicking Done.

## Step 12 (12.png)
Command: `--step <folder> --click "Done"`
Notes: Shows "kind: family, 8 edges". Now color and thickness -- probably under "Line". Clicking the + next to Line.

## Step 13 (13.png)
Command: `--step <folder> --click-at 1404,340` (button "Add to edge line")
Notes: Menu: Color, Width, Pattern, Pattern count, Curved. Color first.

## Step 14 (14.png)
Command: `--step <folder> --click-at 1340,376` (menuitem "Color")
Notes: A Color box with "A9A9A9" already highlighted -- a hex code, like in Excel's custom color. I'll type FF0000 for red and press Enter.

## Step 15 (15.png)
Command: `--step <folder> --type "FF0000" --key Enter`
Notes: The family lines are red now, and a key popped up: "Edge color: Family ties, 8 of 30 edges" -- handy for the slide. The others stayed grey. Now thick: + next to Line again, then Width.

## Step 16 (16.png)
Command: `--step <folder> --click-at 1404,340` (button "Add to edge line")
Notes: Color is gone from the menu since I set it; Width is first. Clicking Width.

## Step 17 (17.png)
Command: `--step <folder> --click-at 1340,376` (menuitem "Width")
Notes: Width box shows "8" selected, but the red lines look just as thin as before. 8 of what? No unit. Maybe 8 is just today's width. I'll type a bigger number, 20, and press Enter to see if they fatten up.

## Step 18 (18.png)
Command: `--step <folder> --type "20" --key Enter`
Notes: Now the red family lines are clearly thicker than the grey ones. The people still look the same blue balls, the other ties still thin grey, and the panel says "Nodes: not styled". The layer count says 8, matching the 8 family rows. Autosave says saved. I'm done.

## Wrap-up (in character)
- Did I finish? Yes. neighbors.csv came in with 16 people and 30 ties (matched my 30 rows), and the 8 family ties are now thick and red; people and the other ties are unchanged.
- Ease: 6 out of 7. Open a file -> preview -> Load was smooth, and "Add a condition -> kind -> family, 8 edges" read like a filter in Excel, with counts I could check (16 + 8 + 6 = 30).
- What confused me:
  - The Width box offered "8" with no unit, and the lines did not visibly change at 8; I could not tell whether 8 was already the current width or whether it had not applied. I had to guess a bigger number (20). A unit or a hint of what the other ties use would help.
  - When I first added the layer it said "Node and edge layer" with "Style nodes" ticked for all 16 people -- for a moment I worried it would change the people. It only switched to "Node not styled" after I narrowed the edges.
  - Adding a layer happens behind a small "+" next to "Style layers"; "Layer" in the menu is not a word I'd have guessed for "a rule for some lines", but the panel made sense once open.
  - Nice: the red key in the corner ("Edge color: Family ties, 8 of 30 edges") is something I could explain to a board.
