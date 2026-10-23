# Session r1-s50 -- Ruth, the reporter

Task: open volunteers-thanks.graphty.json (a colleague's project), count the green people and say what they have in common that made the project color them green.

## Step 1 -- start
Command: `REAL_DIST=... REAL_TIER=3 node design/ui/studio/tool/real.mjs --start <folder> empty`
Screenshot 01.png. Landing page: "Analyze any network". Big green "Open a file" button, says "CSV, GraphML, GEXF, Cytoscape, or a saved project". Small print: "It never leaves your computer." Good, I note that. The demo graph on the right is not mine.

## Step 2 -- open the project
Before: I click "Open a file" and give it volunteers-thanks.graphty.json.
Command: `--step <folder> --click "Open a file" --upload volunteers-thanks.graphty.json`
Screenshot 02.png. It opened: "volunteers-thanks", "Local only", "Autosave: saved". Right panel: Nodes 24, Edges 63. A box on the canvas: "Color: Thank-you cards -- 6 of 24 nodes". Left list of style layers includes "Thank-you cards 6". I count green dots on the drawing myself: six (two in the left cluster, two in the right cluster, two at the top of the bottom cluster). Six on the legend, six on the layer, six on screen. They agree. Now: says who? What rule picked those six? I will click the "Thank-you cards" layer.

## Step 3 -- the layer's rule
Before: click the "Thank-you cards" layer to see what it picks.
Command: `--step <folder> --click "Thank-you cards"`
Screenshot 03.png. Right panel now says "Thank-you cards, Node layer", Fill color 008000 (green). Under "Which nodes -- 6 of 24 nodes" there are two chips: "hours 30 to 52, 7 nodes" and "trained: yes, 15 nodes". 7 and 15 giving 6 reads like both must hold (an AND), but the screen does not say "and" or "all of". I will open "Which nodes" to check whether it is both or either.

## Step 4 -- both conditions or either?
Before: open "Which nodes" to see how the two conditions combine.
Command: `--step <folder> --click "Which nodes"`
Screenshot 04.png. It says it plainly: "Nodes that pass every condition". Condition 1: hours, Between 30 to 52 (7 nodes). The slider's right handle sits at the far end, so 52 looks like the top of the column, which makes it "30 hours or more". Condition 2: trained, Yes (15 nodes). Result: 6 of 24 nodes. That answers "says who": the layer's own rule. I would still like to see the six rows. I will open the table (the grid icon at the bottom) to check them line by line. I will not press Done or change anything; it is a colleague's project.

## Step 5 -- the table
Before: open the table to check rows.
Command: `--step <folder> --click-at 792,864` (button "Table")
Screenshot 05.png. Table of 24 nodes, columns Id, name, role, hours, trained, phone. Visible so far that pass both: v02 James Carter 48 Yes, v05 Priya Nair 31 Yes, v09 Hannah Weiss 52 Yes. Note: two of these are "staff", not volunteers, so role is not what they share. I will click the "hours" header to sort and see all the high-hours rows together.

## Step 6 -- sort by hours
Before: click the "hours" header to sort.
Command: `--step <folder> --click-at 583,533` (button "hours")
Screenshot 06.png. "Sorted by hours, highest first". Rows with 30 or more hours, read aloud: v09 Hannah Weiss 52 Yes; v02 James Carter 48 Yes; v17 Ken Ito 44 Yes; v21 Ben Adler 40 Yes; v24 Zara Ahmed 38 No; v16 Lucy Grant 35 Yes; v05 Priya Nair 31 Yes. Next is v10 at 27, below the line. That is 7 rows at 30+ (matches the chip "7 nodes"), and dropping Zara Ahmed (not trained) leaves 6 (matches "6 of 24" and the six green dots I counted). The table, the rule and the picture agree. Done; I stop here.

## Verdict (in character)
- Finished: yes.
- Answer: 6 people are green -- Hannah Weiss, James Carter, Ken Ito, Ben Adler, Lucy Grant, Priya Nair. What they share: they put in at least 30 hours (the rule says "hours between 30 and 52"; 52 is the highest in the sheet) AND they are trained ("trained: Yes"). The layer is named "Thank-you cards" and is set to "Nodes that pass every condition". Role is not it: four are staff, two are volunteers. Zara Ahmed has 38 hours but is not trained, so she is not green.
- Ease: 6 of 7. Three clicks from opening the file to the rule, and I could check it row by row in the table.
- What confused me:
  - The collapsed rule shows two chips, "hours 30 to 52, 7 nodes" and "trained: yes, 15 nodes", with no "and" between them. I had to open "Which nodes" to read "Nodes that pass every condition". Until then 7 + 15 -> 6 was arithmetic I did myself.
  - "30 to 52" reads as if there were an upper limit someone chose. Only the slider handle sitting at the end, and the sorted table, told me 52 is just the top of the column, so it really means "30 or more".
  - The canvas has no names on the dots, so from the picture alone I could not say WHO is green; I needed the table. The table does not mark which rows are green either -- I matched them by hand against the rule.
  - Opening the rule shows a green "Done" button and editable boxes; on someone else's project I was wary of changing their rule by accident.
