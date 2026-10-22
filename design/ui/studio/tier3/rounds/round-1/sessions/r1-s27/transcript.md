# Transcript r1-s27 (Dev, the student)

## Step 1 -- start
Command: `REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <session> empty`
Notes: Okay, a landing page. "Analyze any network. Free and open source." Big green button "Open a file -- CSV, GraphML, GEXF, Cytoscape, or a saved project". GraphML is listed, nice, that's my file type. I'll click the big button and give it volunteers.graphml.

## Step 2 -- open the file
Command: `--step <session> --click "Open a file" --upload volunteers.graphml`
Notes: Wait, it didn't draw yet, it shows me a table first, "Open as a new graph". Top says "volunteers: 24 nodes, 63 edges" and the bottom says "24 node rows and 63 edge rows read; the load makes 24 nodes and 63 edges." Okay so 24 people and 63 ties -- that's the import-worked check the tutorial warned about. There's a "role" column with board, staff, volunteer -- that's what I'll need for blue. Now clicking "Load" (bottom right).

## Step 3 -- Load
Command: `--step <session> --click "Load"`
Notes: Oh nice, a drawing. Three clumps. Right panel "Overview": Nodes 24, Edges 63, Undirected. So the answer to part one: 24 people, 63 ties. Essay sentence: "The roster holds 24 people and 63 ties between them."
Wait -- all the dots are already kind of blue-purple. Is that already "blue"? I don't think so, it's just the default color, everyone is it. I need board and staff blue and volunteers different... well, "leave the volunteers as they are". Hmm, if everyone is already blue-ish, making board blue won't show. I'll just do it properly: find where to color by a column. Left side has "Style layers" with a "+". In Gephi this would be "Appearance > Partition". I'll try the "+" next to Style layers.

## Step 4 -- the "+" next to Style layers
Command: `--step <session> --click-at 276,122` (button "Add a layer or a folder")
Notes: A little menu: Layer, Folder, Select layers..., Analyze... I want a layer, I think a layer is where I say "these people get this color". Clicking "Layer".

## Step 5 -- Layer
Command: `--step <session> --click "role=menuitem:Layer"`
Notes: A "Layer 1" appeared, and the right side now has Shape, Visibility, Text, Fill... and "Which nodes: All 24 nodes: add a condition to narrow". Okay so first I narrow it to board and staff, then Fill = blue. Opening "Which nodes".

## Step 6 -- Which nodes
Command: `--step <session> --click "Which nodes"`
Notes: "Nodes that pass every condition" and "+ Add a condition". Hmm, "every condition" -- I need board OR staff. We'll see. Clicking "Add a condition".

## Step 7 -- Add a condition
Command: `--step <session> --click "Add a condition"`
Notes: A list of my columns: name, role (3 values), hours, trained, phone. Role it is.

## Step 8 -- role
Command: `--step <session> --click-at 1267,372` (option "role, 3 values")
Notes: Oh nice: "role -- Is any of" with checkboxes: volunteer 16, staff 5, board 3. So "any of" is my OR. Ticking staff and board in one step.

## Step 9 -- tick staff and board
Command: `--step <session> --click-at 1229,315 --click-at 1229,341`
Notes: Both ticked, "8 of 24 nodes", Layer 1 shows 8. 5 staff + 3 board = 8, right. Now the color: that's "Fill" with a +. Clicking Done first? No -- I'll click the Fill "+" directly.

## Step 10 -- Fill +
Command: `--step <session> --click-at 1404,567` (button "Add to node fill")
Notes: Fill now has "Color 6366F1" with a little purple-blue square. Wait -- that IS the color everybody already is. So the default is this purple-blue. Is that "blue"? It looks indigo to me. If I leave it, board/staff look exactly like volunteers and nobody could tell. I'll pick a proper blue. Clicking the little color square to get a picker.

## Step 11 -- color picker
Command: `--step <session> --click-at 1268,415` (button "Pick node color")
Notes: A color picker opened, with five little swatches at the bottom: purple (current), gray, a clear blue, yellow, black. The third one is a real blue. Clicking it.

## Step 12 -- blue swatch
Command: `--step <session> --click-at 1031,777` (button "blue 0077BB")
Notes: Oh nice, that's it. Eight dots turned a deeper, real blue (0077BB) and the rest stayed the purple-blue they were. A little legend popped up top-left: "Color: Layer 1 -- 8 of 24 nodes". The left list says Layer 1 = 8, "Autosave: saved". Volunteers untouched. I'm done.
Essay sentences: "The roster holds 24 people and 63 ties. I colored the 8 board and staff members (3 board, 5 staff) blue; the 16 volunteers keep the default color."

## End of session (in character)
- Did I finish? Yes. 24 people, 63 ties, and the 3 board + 5 staff members are blue; volunteers unchanged.
- Ease: 6 out of 7.
- What went well: the import screen told me straight away "24 nodes, 63 edges" before I even loaded, and the Overview panel repeated it -- no doubt the import worked. The "role -- Is any of" checkboxes with counts (staff 5, board 3) made the board-OR-staff part easy, and the blue swatch was right there.
- What confused me:
  - The default color of every dot is already a purple-blue (6366F1). When the task said "make them blue" I wasn't sure if they already were. The new blue (0077BB) is different but close to the default; in a printed figure the two might be hard to tell apart. I'd have liked the default to be something clearly not blue, or a gray.
  - The word "Layer" -- I was looking for "Appearance" / "Partition" like in the Gephi tutorial. I only found it because "Style layers" had a "+". Nothing on screen said "color by a column".
  - "Nodes that pass every condition" made me worry I couldn't do board OR staff, until I saw "Is any of".
  - The menu after "+" had "Layer" and "Folder"; I guessed Layer.
  - I never pressed "Done" in the Which nodes box; it closed on its own when I went to Fill, which was fine but I wasn't sure it kept my choice (it did: "role: staff, board, 8 nodes").
