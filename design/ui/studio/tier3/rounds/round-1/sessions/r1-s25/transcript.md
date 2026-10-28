# Session r1-s25 -- Analyst Alex

Task: open volunteers.graphml, report people and ties counts, make board and staff members blue, leave volunteers as they are.

## Step 1 -- start
Command: real.mjs --start <folder> empty
Screenshot 01.png. Landing page: "Analyze any network. Free and open source." Big "Open a file" button (CSV, GraphML...). Under it: "Or drop a file anywhere. It never leaves your computer." Good -- that answers my first question, and MIT licensed means no purchase request. Next: click "Open a file" and give it volunteers.graphml.

## Step 2 -- open the file
Command: --step <folder> --click "Open a file" --upload volunteers.graphml
Screenshot 02.png. A preview: "volunteers: 24 nodes, 63 edges", and at the bottom "24 node rows and 63 edge rows read; the load makes 24 nodes and 63 edges." Counts up front -- that's what I want. There's a "role" column (board / staff / volunteer), which is what I'll color by. Header says "Local only". Next: click Load.

## Step 3 -- Load
Command: --step <folder> --click "Load"
Screenshot 03.png. Graph drawn, three clumps. Right panel: Nodes 24, Edges 63, 1 component. Counts match the preview -- answer part 1: 24 people, 63 ties. Odd thing: every node is already a blue-purple. So "make board and staff blue" has to be a blue you can tell apart from this default. Left panel has "Style layers" with a "+" -- "layers" is a bit developer-speak but it's the only styling thing I see besides the "Style" tab on the right. Next: try the "+" next to Style layers.

## Step 4 -- the "+" menu
Command: --step <folder> --click-at 276,122
Screenshot 04.png. Menu: Layer, Folder, Select layers..., Analyze... "Layer" with a paintbrush icon looks like the styling one. Next: click "Layer".

## Step 5 -- Layer added
Command: --step <folder> --click-at 178,158
Screenshot 05.png. "Layer 1" appeared with its name highlighted for editing. Right panel shows "Which nodes -- 24 of 24 nodes. All 24 nodes: add a condition to narrow", then Shape, Visibility, Text, Fill... So: narrow to board+staff, then Fill = blue. Next: name it "Board and staff" and press Enter.

## Step 6 -- rename, open Which nodes
Command: --step <folder> --type "Board and staff" --key Enter --click "Which nodes"
Screenshot 06.png. Renamed fine. "Which nodes: Nodes that pass EVERY condition" + "Add a condition". Worry: I want board OR staff, and "every" sounds like AND. Hopefully there's an "is one of". Next: Add a condition.

## Step 7 -- attribute list
Command: --step <folder> --click "Add a condition"
Screenshot 07.png. A list of my columns: name, role (3 values), hours (2 to 52), trained, phone, Node id. Nice that it tells me role has 3 values. Next: click role.

## Step 8 -- role condition
Command: --step <folder> --click-at 1267,372
Screenshot 08.png. "role -- Is any of" with checkboxes: volunteer 16, staff 5, board 3. That settles my AND/OR worry. 16+5+3 = 24, adds up. Next: tick staff and board.

## Step 9 -- ticked staff and board
Command: --step <folder> --click-at 1229,315 --click-at 1229,341
Screenshot 09.png. "8 of 24 nodes" and the layer row says 8. 5 + 3 = 8, correct. Picture unchanged so far, as expected. Next: Done, then the "+" on Fill.

## Step 10 -- Done
Command: --step <folder> --click "Done" --click "Fill"   (Done worked; "Fill" was ambiguous to the tool, nothing else happened)
Screenshot 10.png. Condition collapsed to a chip "role: staff, board, 8 nodes". Next: the "+" at the right of the Fill row.

## Step 11 -- Fill added
Command: --step <folder> --click-at 1404,381
Screenshot 11.png. Fill -> Color appeared, prefilled with 6366F1 (the same violet-blue everything already is) and selected. So "blue" by default, but nobody could tell my 8 apart from the rest. I'll type a proper blue, 0066FF, and press Enter.

## Step 12 -- set the blue
Command: --step <folder> --type "0066FF" --key Enter
Screenshot 12.png. Eight nodes are now a bright blue; the other 16 stay the violet they were. A legend popped up top-left: "Color: Board and staff -- 8 of 24 nodes". Matches 5 staff + 3 board. Done.

## Wrap-up (in character)
Did I finish? Yes. The file holds 24 people and 63 ties (shown in the import preview, again after Load in the Overview panel: Nodes 24, Edges 63, 1 component). Board and staff (8 people: 5 staff, 3 board) are blue via a layer I named "Board and staff"; the 16 volunteers are untouched.

Ease: 6 out of 7. About ten clicks, no dead ends.

What went well: "It never leaves your computer" right on the open box, plus "Local only" and MIT licence -- that answered my data and cost questions before I had to ask. Counts shown before I even pressed Load, and the role checkboxes showed per-value counts (16/5/3) so I could sanity-check that 8 was right. "Is any of" answered my AND/OR worry.

What confused me / slowed me down:
- Every node already starts out a blue-violet (6366F1). The task says "make them blue", and the color box pre-filled with that same violet, so if I'd just accepted the default nothing would have visibly changed. I had to know to type a hex code. A few named swatches would be quicker than hex; I don't think in hex.
- Even after my change, my bright blue vs. the default violet is a closer call than I'd like -- in a slide it would be "blue vs slightly-purple blue". I'd probably recolor the volunteers grey too, but the task said leave them alone.
- "Style layers", "Layer", "Folder", "Rendering" -- a bit developer-ish. I only went to "Layer" because it had a paintbrush icon. In Gephi this is just Appearance > Nodes > Partition > role.
- "Nodes that pass every condition" made me think it would be AND only, until I saw the "Is any of" list.
- Coloring by role in one go (one color per role, like Gephi's partition) would be what I'd actually want for a deck; here I built a filter-plus-color by hand. Fine for one group, tedious for five.
