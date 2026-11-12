# Session r1-s29b -- Nadia (L1 alert reviewer), volunteers task

## Step 1 -- start
Command: `REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <session> empty`
Screenshot 01.png: landing page. Big green "Open a file" button. Clear enough -- that's where my file goes.

## Step 2 -- open the file
Said: "Open a file, pick volunteers.graphml."
Command: `--step <session> --click "Open a file" --upload volunteers.graphml`
Screenshot 02.png: a preview table, "Open as a new graph", 24 nodes 63 edges. Columns name, role, hours, trained, phone. Like a case system grid -- I can already see Aisha Bello, Diego Ruiz, Nora Lindqvist trained=Yes with blank phone. Clicking Load.

## Step 3 -- Load
Command: `--step <session> --click "Load"`
Screenshot 03.png: the graph, all blue balls, no names drawn. Left side "Style layers" with Hovered / Selected / Everything and a "+". I need "trained AND no phone" painted red. A "layer" with a rule sounds like it. Trying the + next to Style layers.

## Step 4 -- + menu
Command: `--step <session> --click-at 276,122`
Screenshot 04.png: a small menu: Layer, Folder, Select layers..., Analyze... Picking "Layer".

## Step 5 -- new layer
Command: `--step <session> --click "role=menuitem:Layer"`
Screenshot 05.png: "Layer 1" added, name box is selected for typing. Right side: "Which nodes -- All 24 nodes: add a condition to narrow", plus Fill. Good: name it so QA knows what it is, then narrow it.

## Step 6 -- name + Which nodes
Command: `--step <session> --type "Trained, no phone" --key Enter --click "Which nodes"`
Screenshot 06.png: layer renamed. "Which nodes -- Nodes that pass every condition", "+ Add a condition". "Every condition" = AND, which is what I want. Adding a condition.

## Step 7 -- Add a condition
Command: `--step <session> --click "Add a condition"`
Screenshot 07.png: list of columns: name, role, hours, trained (2 values), phone (70% have a value). Nice -- it tells me 30% have no phone. Picking "trained" first.

## Step 8 -- trained
Command: `--step <session> --click-at 1275,428`
Screenshot 08.png: condition "trained = Yes", 15 nodes. Defaulted to Yes, which is what I want. Now add phone.

## Step 9 -- second condition
Command: `--step <session> --click "Add a condition"`
Screenshot 09.png: same list, trained marked "already a condition". Picking phone.

## Step 10 -- phone
Command: `--step <session> --click-at 1274,528`
Screenshot 10.png: phone condition with "Contains" and a text box. I need "is blank". Opening the Contains dropdown to look for something like "is empty".

## Step 11 -- operator list
Command: `--step <session> --click-at 1316,320`
Screenshot 11.png: options include "Has no value". That's it.

## Step 12 -- Has no value
Command: `--step <session> --click "role=option:Has no value"`
Screenshot 12.png: "4 of 24 nodes" match both. Counts per condition (15 trained, 7 no phone) -- that's the kind of thing I'd write in a file. Clicking Done, then the + on Fill to make them red.

## Step 13 -- Done
Command: `--step <session> --click "Done"`
Screenshot 13.png: conditions collapsed into two chips, 4 of 24. Now Fill +.

## Step 14 -- Fill +
Command: `--step <session> --click-at 1404,403`
Screenshot 14.png: Fill > Color with "6366F1" highlighted. A hex code. I know FF0000 is red from spreadsheets. Typing it.

## Step 15 -- red
Command: `--step <session> --type "FF0000" --key Enter`
Screenshot 15.png: 4 balls are red, a key in the corner "Color: Trained, no phone, 4 of 24 nodes". But no names on the balls. I need the names for my list. Trying the "Values" tab on the right in case it lists the 4.

## Step 16 -- Values tab
Command: `--step <session> --click "role=tab:Values"`
Screenshot 16.png: "Members: v03, v10, v14, v20". IDs, not names -- like getting account numbers when I want customer names. From the import preview I remember v03 Aisha Bello, v10 Diego Ruiz, v14 Nora Lindqvist; I never saw v20. Trying the table button at the bottom bar to look it up.

## Step 17 -- Table
Command: `--step <session> --click-at 793,864`
Screenshot 17.png: table of all 24 nodes. v03 Aisha Bello (Yes, blank), v10 Diego Ruiz (Yes, blank). Scrolling down to v14 and v20.

## Step 18 -- scroll table
Command: `--step <session> --wheel 740,750,600`
Screenshot 18.png: v14 Nora Lindqvist (Yes, blank), v20 Julia Rossi (Yes, blank). That matches the four ids in the layer's Members list. Done. Stopping here (not ending the session -- the facilitator does that).

## Wrap-up (in character)

**Did I finish?** Yes. Four people are red: Aisha Bello (v03), Diego Ruiz (v10), Nora Lindqvist (v14), Julia Rossi (v20). Everyone else is left as they were. The layer is named "Trained, no phone" and says 4 of 24 nodes, with the two conditions as chips (trained: yes, 15 nodes; phone: no value, 7 nodes) -- that's a rationale QA could read.

**Ease: 6 / 7.** About the length of one alert. The import preview, the "+ Add a condition" list (which even told me phone is only 70% filled) and the "Has no value" option all did what I expected.

**What confused me / cost time:**
- The layer's "Members" list gives ids (v03, v10...) not names. I had to open the table and scroll to match v20 to Julia Rossi. That's exactly the copy-an-account-number-between-screens busy work I hate. Show the name column there, or let me click a member to jump to its row.
- The balls have no names on them, so the red picture alone doesn't tell me who to phone; for the alert file I'd want one picture with the four names visible.
- The condition defaulted to "Contains" with a text box for phone; I had to know to open it to find "Has no value". Fine once, but I wasn't sure at first whether a blank text box meant "blank" or "anything".
- Colour is a hex code box. I know FF0000, a newer volunteer coordinator might not; there was no obvious red swatch to click.
- The table didn't show me which rows were the red ones, so I matched by eye.
