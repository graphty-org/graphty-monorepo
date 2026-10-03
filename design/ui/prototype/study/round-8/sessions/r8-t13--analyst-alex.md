# Session: export a picture with its key and the per-character numbers (Analyst Alex)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. You need two things for a report: a picture file of the drawing as it looks now, with its
key to the colors, and the numbers the program worked out for each character in a file Excel can
open."

All commands run from `design/ui/prototype`. Renders are in
`tmp/round-8-sessions/r8-t13--analyst-alex/`. Every run replays from the start screen.

## Step 1 -- start screen (shots/tasks/r8-t13/01.png)

Think-aloud: "OK, first thing -- 'Files are read on this computer and never uploaded.' And 'Local
only' up top. Good, that's the line I look for. Usage data box at the bottom: no thanks, I'm not
reading that. Les Miserables is right there under Samples, 77 characters. That's the classic one,
77 nodes, 254 edges if I remember the NetworkX version."

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t13 --click "No thanks" --click "Les Miserables"

Saw: the graph, colored orange to brown, a key box top left "Color: PageRank 0.00330 to 0.0754".
A long list on the left: PageRank, Louvain 6 groups, Shortest paths, Density, Top 9 by degree,
Watchlist, a folder "For the report" with Group 2, Group 8, Betweenness (crossed-out eye).

Think-aloud: "That's a lot already on it. Somebody's been in here. Fine -- the task says 'as it
looks now', so I don't touch any of that. The picture is PageRank colors and that's the key. Orange
to brown, at least it's not red and green. Now -- where's export? Usually File, Export."

## Step 3 -- look for Export directly

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Export"

Result: nothing on screen is called "Export".

Think-aloud: "No Export button anywhere. No File menu either. The three lines top left, I guess."

## Step 4 -- hover and open the three-line icon

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t13 --click "No thanks" --click "Les Miserables" --hover "Menu"
    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu"

Saw: tooltip "Main menu". The menu has New project, Open recent, Open project or file, Save,
Export... Ctrl+E, Apply recipe or style file, Version history, Settings, Help.

Think-aloud: "There it is. Export, Ctrl+E. That's basically a File menu without the word File.
Fine. Took me one wrong guess."

## Step 5 -- the Export dialog

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..."

Saw: Export dialog, left side Image / Video / Report (grayed) / Recipe / Data / Recent exports.
Image .png selected, "Full graph, with the legend", a small preview with the key box in the
corner, "64 labels hidden to avoid overlap", Look: Screen / Print, Preset "To share -- PNG, 2x",
size 1,802 x 1,638. Bottom: "Saved to this computer only; nothing is uploaded." Copy, Export.

Think-aloud: "'With the legend.' That's literally what I need. The preview is tiny, I can just
about see the key box in the corner. 1,800 pixels is fine for a slide. I'd like the preview bigger
so I can actually check the key text before I paste it in a deck, but OK. Export."

## Step 6 -- export the picture

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "Export"

Saw: toast "Exported les-miserables.png to Downloads".

Think-aloud: "Done, it tells me the file name and where. Half one done."

## Step 7 -- try the Data side of the same dialog

    timeout 120 node app-b/study.mjs --try .../08.png task:r8-t13 ... --click "Main menu" --click "Export..." --click "Data"
    timeout 120 node app-b/study.mjs --try .../09.png task:r8-t13 ... --click "Main menu" --click "Export..." --click "option Data"

Result: my click on "Data" landed on the "Data" button in the left rail behind the dialog, not on
the Data entry inside the dialog, and nothing changed; the second try found nothing by that name.

Think-aloud: "There's 'Data' in the dialog and 'Data' on the left edge of the app too. I clicked
Data and nothing happened. Whatever. I saw a table at the bottom earlier -- I'll export the table,
that's what I actually want anyway."

(Facilitator-visible note: a human would most likely have hit the dialog entry; this miss is
partly the click tool matching the app's rail button first. But there ARE two controls called
"Data" on screen at once.)

## Step 8 -- open the table

    timeout 120 node app-b/study.mjs --try .../10.png task:r8-t13 ... --click "Export" --click "Table"

Saw: table of 77 nodes sorted by degree: label, Notes, group, Degree (full graph), Rank by degree,
PageRank (full graph), Rank by PageRank... "Columns: 9 of 9". A line "Valjean is first on all
three measures; Gavroche is in the top 3 on all three."

Think-aloud: "Now we're talking. Valjean 36, that's the degree I'd expect from NetworkX. PageRank
0.0754 for Valjean matches the top of the key. Rank as '#1 of 77' -- I hope that's not text in the
file. 'All three measures' -- I only see two in view, the third is off to the right I guess."

## Step 9 -- the table's menu

    timeout 120 node app-b/study.mjs --try .../11.png task:r8-t13 ... --click "Table" --hover "Table options"
    timeout 120 node app-b/study.mjs --try .../12.png task:r8-t13 ... --click "Table" --click "Table options"

Saw: tooltip "Table options"; menu with Time slider (grayed, "This data has no time attribute")
and "Export table as CSV...".

Think-aloud: "Export table as CSV. Good, CSV opens in Excel. Odd thing: when I opened this menu
the PageRank row on the left un-highlighted and the right panel switched to the graph summary.
Doesn't matter for me, just noticed it."

## Step 10 -- the CSV options

    timeout 120 node app-b/study.mjs --try .../13.png task:r8-t13 ... --click "Table options" --click "Export table as CSV..."

Saw: the same Export dialog, now on Data. "Full graph, 77 nodes, 254 edges -- the columns the
table shows -- CSV". What is written: every row, ids as loaded, run columns headed with scope and
method, rank as a whole number with a separate tie column so it stays numeric in a spreadsheet.
Table: Nodes (selected). Columns: Shown in the table / Every column.

Think-aloud: "'Rank stays numeric in a spreadsheet.' Somebody's been burned like me, good. It says
Nodes, not Edges -- I check that every time since Gephi gave me the edges once. 77 nodes, 254
edges, matches. Columns 'shown in the table' -- I want everything it worked out, so Every column."

## Step 11 -- every column, then export

    timeout 120 node app-b/study.mjs --try .../14.png task:r8-t13 ... --click "Export table as CSV..." --click "Every column"
    timeout 120 node app-b/study.mjs --try .../15.png task:r8-t13 ... --click "Every column" --click "Export"

Saw: subtitle changed to "every attribute and run result"; a third choice "Hidden columns too"
appeared. After Export: toast "Exported les-miserables_nodes.csv to Downloads".

Think-aloud: "Hm. 'Every column' and then 'Hidden columns too'? So every column isn't every
column? Betweenness had a crossed-out eye on the left, so is betweenness in my file or not? I
went with Every column because it said 'every attribute and run result'. I'd open the CSV in
Excel and check the headers before it goes anywhere near the report. If betweenness is missing
I'd come back and click Hidden columns too."

## Outcome

- Succeeded? I think so. I have les-miserables.png ("full graph, with the legend") and
  les-miserables_nodes.csv. Not 100% sure the CSV has betweenness in it until I open it.
- Single Ease Question: 5 of 7. The picture was quick once I found Export under the three-line
  menu. The numbers took a detour: two things called "Data" on screen, and the column choices
  ("Shown in the table" / "Every column" / "Hidden columns too") made me doubt what I'd get.
- Would I use this instead of my current tool? For this job -- picture plus a table -- maybe,
  yes. In Gephi it's Preview, export SVG, then Data Laboratory, export, and pray it's the nodes
  table. Here it said Nodes, the counts matched, and it says the rank stays numeric. What would
  stop me: I want a bigger preview of the PNG to check the key reads, and I want "every column" to
  mean every column. I'd still check the numbers against NetworkX the first time.
