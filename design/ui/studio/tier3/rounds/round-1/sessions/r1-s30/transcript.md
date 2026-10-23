# Session r1-s30 -- Grace (nonprofit operations analyst)

Task: open sources.graphml, make red every source who agreed to speak on the record AND whose email is missing; everyone else unchanged; report their names.

## Step 1 (start)
Command: real.mjs --start <session> empty -> 01.png
Notes: Landing page. Big green "Open a file" button, "It never leaves your computer" -- good, that's the privacy line I look for. I'll click Open a file and give it sources.graphml.

## Step 2
Command: --click "Open a file" --upload sources.graphml -> 02.png
Notes: A preview: "24 nodes, 59 edges", columns id, name, kind, donations, on_record, email. 24 rows -- matches the description. on_record says Yes/No, some email cells blank. Already I spot Della Whitfield and Ines Moreau (Yes, blank email). I'll press Load and find a way to color them in the program.

## Step 3
Command: --click "Load" -> 03.png
Notes: Loaded: 24 nodes, 59 edges, all blue, no labels. Left has "Style layers" with a + button. That sounds like where I'd make a "color these red" rule. I'll hover the + to see what it is.

## Step 4
Command: --click-at 275,122 ("Add a layer or a folder") -> 04.png
Notes: Menu: Layer, Folder, Select layers..., Analyze... I'll pick Layer.

## Step 5
Command: --click-at 178,158 (menu item "Layer") -> 05.png
Notes: "Layer 1" added, name box ready for typing. Right panel: "Which nodes -- All 24 nodes: add a condition to narrow". That's what I need. I'll name the layer first so I can explain it, then open Which nodes.

## Step 6
Command: --type "On record, no email" --key Enter --click "Which nodes" -> 06.png
Notes: Layer renamed. "Nodes that pass every condition" -- good, AND logic, like an Excel filter on two columns. Clicking "Add a condition".

## Step 7
Command: --click "Add a condition" -> 07.png
Notes: A list of my columns: name, kind, donations, on_record (2 values), email (62% have a value). Picking on_record first.

## Step 8
Command: --click-at 1283,428 (option "on_record, 2 values") -> 08.png
Notes: on_record = Yes, 12 nodes. It picked Yes by itself -- convenient. Now add a second condition: email.

## Step 9
Command: --click "Add a condition" -> 09.png
Notes: Same list; on_record marked "(already a condition)". Clicking email.

## Step 10
Command: --click-at 1271,528 (option "email, 62% have a value") -> 10.png
Notes: email condition defaults to "Contains". I need "is empty" or similar. Opening that dropdown.

## Step 11
Command: --click-at 1316,320 (combobox "email: how to match") -> 11.png
Notes: Options include "Has no value". Plain words, exactly what I want. Picking it.

## Step 12
Command: --click-at 1281,442 (option "Has no value") -> 12.png
Notes: "4 of 24 nodes" -- on_record Yes = 12, email empty = 9, both = 4. Makes sense. Now the color: "Fill" sounds like Excel cell fill. Clicking its +.

## Step 13
Command: --click-at 1404,543 ("Add to node fill") -> 13.png
Notes: A Color box showing 6366F1 with the text highlighted, ready to type over. Conditions collapsed into chips "on_record: yes, 12 nodes" and "email: no value, 9 nodes". I'll type FF0000 (red) and press Enter.

## Step 14
Command: --type "FF0000" --key Enter -> 14.png
Notes: Four dots turned red, a legend box appeared "Color: On record, no email -- 4 of 24 nodes". Others still blue. Now I need the names -- there are no labels on the dots. The bottom bar has a grid icon that looks like a table; trying that.

## Step 15
Command: --click-at 793,864 ("Table") -> 15.png
Notes: A table of all 24 nodes, like a spreadsheet. It doesn't show which ones are red though. So far Della Whitfield (s05) is Yes with blank email. I'll scroll the table to see the rest.

## Step 16
Command: --wheel 740,750,400 -> 16.png
Notes: Rows s13-s23. Yes + blank email: Friends of the Waterfront (s17), Tomas Varga (s19). Earlier: Della Whitfield (s05), Ines Moreau (s11, from the import preview). That's 4, matching the "4 of 24". One more scroll to see the last row.

## Step 17
Command: --wheel 740,750,400 -> 17.png
Notes: Last row s24 Riverside Partners is "No". So the full list of Yes + blank email: Della Whitfield, Ines Moreau, Friends of the Waterfront, Tomas Varga. Four names, four red dots -- the counts agree. I'm done.

## Wrap-up (in character, Grace)
Did I finish? Yes. Red: Della Whitfield, Ines Moreau, Friends of the Waterfront, Tomas Varga. Everyone else stayed blue.

Ease: 6 / 7.

What went well: the import preview showed my columns and the row count straight away (24, matches), and said the file never leaves my computer. The layer conditions read like an Excel filter: "on_record: Yes" and "email: Has no value" -- plain words, and the live counts (12, 9, then 4 of 24) let me check my work.

What confused me:
- The "+" next to "Style layers" is a tiny icon; I guessed it. "Layer" is not a word I'd use -- I wanted "highlight these" or "color a group".
- After coloring, the dots have no names, and the table under the graph does not show which rows are in my red group or let me filter to them. I had to read all 24 rows by eye and cross-check against the count. I'd want a "show only these 4" or a color column in the table so I can paste the names straight into Excel.
- I had to scroll the table in two goes; row s11/s12 I only saw in the import preview, not in the table after loading.
