# Session r8-t13 -- Morgan Reyes (screen-reader analyst)

Task as given by the moderator: "You have never used this program before. You will practice on
the ready-made network of characters from the novel Les Miserables that comes with the program,
not on your own data. You need two things for a report: a picture file of the drawing as it looks
now, with its key to the colors, and the numbers the program worked out for each character in a
file Excel can open."

All commands were run from `design/ui/prototype`. `$D` is
`tmp/round-8-sessions/r8-t13--screen-reader-analyst` (absolute paths were passed to --try).
Renders are in that folder.

## Step 1 -- start screen (shots/tasks/r8-t13/01.png)

Think-aloud: "Title says graphty. Three groups: Start, Recent projects, Samples. Good, they are
named. 'Files are read on this computer and never uploaded' -- that is the first thing I ask, and
it answered before I asked. I will hold it to that. There is a usage-data box at the bottom; I say
no thanks before anything else. Les Miserables, 77 characters, is in Samples."

## Step 2 -- decline usage data, open the sample (02.png)

    timeout 120 node app-b/study.mjs --try $PWD/$D/02.png task:r8-t13 --click "No thanks" --click "Les Miserables"

"It opened straight into a drawing with a list on the left: PageRank, Louvain six groups, Shortest
paths, Density, Top 9 by degree, Watchlist... a lot of things somebody already ran. 'As it looks
now' -- so the colors right now are PageRank, orange to brown, 0.00330 to 0.0754. There is a key
called 'Color: PageRank'. Fine, that is the key I need in the picture. I am not touching any of
these rows; the task says as it looks now."

## Step 3 -- find export (03.png, 04.png)

    timeout 120 node app-b/study.mjs --try $PWD/$D/03.png task:r8-t13 --click "No thanks" --click "Les Miserables" --hover "Menu"
    timeout 120 node app-b/study.mjs --try $PWD/$D/04.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Menu"

"Two things answer to 'menu': 'Main menu' and 'Les Miserables, project menu'. Both are named, at
least. Main menu has Export..., Ctrl+E. Good, a shortcut I can write in my keystroke file. Also
'Keyboard shortcuts ?'. Noted for later."

## Step 4 -- export the picture (05.png, 06.png)

    timeout 120 node app-b/study.mjs --try $PWD/$D/05.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..."
    timeout 120 node app-b/study.mjs --try $PWD/$D/06.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "Export"

"Export dialog. Image is first. 'Image .png -- Full graph, with the legend'. That is the sentence I
wanted, and it is near the top. Then a preview, which tells me nothing, and '64 labels hidden to
avoid overlap: show list'. So the picture leaves names off 64 of the 77 characters. For my report
the numbers carry the names, so I let that go, but I would not have known it without the line.
Footer says 'Saved to this computer only; nothing is uploaded.' Said twice now; consistent.
I press Export."

Result: "Exported les-miserables.png to Downloads." Heard once. Good.

"I cannot check the legend is actually in the file. I am trusting the words 'with the legend'. I
will ask a colleague to glance at it -- which is the thing I am trying to stop doing."

## Step 5 -- export the numbers, first attempt (07.png to 12.png)

    timeout 120 node app-b/study.mjs --try $PWD/$D/07.png task:r8-t13 ... --click "Export" --click "Main menu" --click "Export..." --click "Data"

"I reopen Export and ask for Data. Four things on the page are called Data: a button in the left
rail, a tab in the right panel, the item in this dialog, and a panel. The click went to the one
behind the dialog and nothing happened. I cannot tell them apart by name."

    timeout 120 node app-b/study.mjs --try $PWD/$D/08.png task:r8-t13 ... --click "Export..." --click "Image" --key ArrowDown --key ArrowDown --key ArrowDown --key ArrowDown

"Arrow keys down the list of kinds. That works. Data: 'Full graph, 77 nodes, 254 edges -- the
columns the table shows -- CSV'. Then 'Rows: every one in the scope, with no cap: 254 edges'.
Edges. I want characters, not pairs of characters. Table is set to Edges. I need Nodes. It also
tells me columns are headed with the scope and the method, 'betweenness (full graph, exact)', and
that ranks are whole numbers with a separate Tie column. That is exactly the kind of thing I check
first. Credit for that."

    timeout 120 node app-b/study.mjs --try $PWD/$D/09.png task:r8-t13 ... --click "Nodes" --click "Every column"

"'Nodes' -- three things are called Nodes again: a tab in the table at the bottom, some text, and
the choice in the dialog. It went to the one behind the dialog. Second time the same name problem."

    timeout 120 node app-b/study.mjs --try $PWD/$D/10.png task:r8-t13 ... --click "Adjacency" --key ArrowLeft --click "Every column"

"I went to the end of that row, Adjacency, and pressed left arrow to step back to Nodes, the way a
radio group works. It did not move. Adjacency stayed picked, and 'Every column' vanished. The top
line now said 'every attribute and run result' while a warning below said 'CSV cannot hold
everything ... every node attribute and run result is not written'. Those two contradict each
other."

    timeout 120 node app-b/study.mjs --try $PWD/$D/11.png task:r8-t13 ... --click "Adjacency" --key Shift+Tab --key Space

"Shift+Tab to the previous choice and Space. The dialog closed and said 'Exported
les-miserables_adjacency.csv to Downloads'. I did not mean to export. I have a file I did not
want in my Downloads, and focus is back on the main menu button. That is a dead end and a surprise
in one key press."

    timeout 120 node app-b/study.mjs --try $PWD/$D/12.png task:r8-t13 ... --click "Generic" --key Shift+Tab --key ArrowRight

"Tried once more, from the file-shape row backward. Nothing changed, still Edges. I cannot hear
where my focus is. That is two dead ends in a row in this dialog. My rule: go to the table and
look for its own export."

## Step 6 -- the table's own export (13.png to 18.png)

    timeout 120 node app-b/study.mjs --try $PWD/$D/13.png task:r8-t13 ... --click "Table"

"A table opened at the bottom. 'Nodes, 77 nodes, sorted by degree'. 'Valjean is first on all three
measures; Gavroche is in the top 3 on all three.' A summary sentence before the rows -- I like
that. Columns: label, notes, group, Degree (full graph), Rank by degree (full graph), PageRank
(full graph), Rank by PageRank... 'Columns: 9 of 9'."

    timeout 120 node app-b/study.mjs --try $PWD/$D/14.png task:r8-t13 ... --click "Table" --hover "Table options"
    timeout 120 node app-b/study.mjs --try $PWD/$D/15.png task:r8-t13 ... --click "Table" --click "Table options"

"'Table options': 'Time slider -- this data has no time attribute', and 'Export table as CSV...'."

    timeout 120 node app-b/study.mjs --try $PWD/$D/16.png task:r8-t13 ... --click "Table options" --click "Export table as CSV..."

"It is the same Export dialog, but now Table says Nodes and Rows says 77 nodes. So the table menu
is just the way into that dialog with the right table already picked. Fine -- I would have
preferred to pick it myself in the dialog."

    timeout 120 node app-b/study.mjs --try $PWD/$D/17.png task:r8-t13 ... --click "Export table as CSV..." --click "Every column"
    timeout 120 node app-b/study.mjs --try $PWD/$D/18.png task:r8-t13 ... --click "Export table as CSV..." --click "Every column" --click "Export"

"'Every column' instead of 'Shown in the table', because the moderator said every number the
program worked out, and the sidebar mentions a hidden Betweenness row. A third choice, 'Hidden
columns too', appeared when I picked it. I do not know if 'every column' already includes hidden
ones or not. I leave it. Export."

Result: "Exported les-miserables_nodes.csv to Downloads."

## Step 7 -- can I find the files again? (19.png)

    timeout 120 node app-b/study.mjs --try $PWD/$D/19.png task:r8-t13 ... --click "Export" --click "Main menu" --click "Export..." --click "Recent exports"

"Recent exports: four files. les-miserables_whole-cast.png 'Today 10:14', les-miserables_nodes.csv
'Today 9:52', a recipe from yesterday, a video from September. The picture I made just now was
called les-miserables.png. It is not in this list. Neither is the adjacency file I made by
accident. The nodes CSV is listed at 9:52, which is not when I made it. So either this list is
someone else's history or it is not mine at all. I cannot use it to confirm what I just did."

## Outcome

- Picture: I believe I have les-miserables.png in Downloads, "full graph, with the legend", colored
  by PageRank. I could not verify the legend is in it, and 64 of 77 names are left off the drawing.
- Numbers: I believe I have les-miserables_nodes.csv in Downloads, 77 rows, every column, with the
  method in each column header. I also have an adjacency CSV I did not want.
- Do I think I succeeded? Mostly yes, with doubt about the legend and about which columns
  "Every column" left out.

Single Ease Question: 3 of 7.

Would I use this instead of my current tool? Not instead of my scripts. The export dialog says
what it writes -- scope, method, ranks with a separate tie column, nothing uploaded -- which is
better than most tools I have tried, and the table's summary sentence is good. But inside that
dialog I could not pick Nodes by keyboard, one key press exported a file I did not ask for, four
different things are called Data and three are called Nodes, and the recent-exports list does not
show what I just made. For handing a sighted colleague a picture with a key, maybe. For the
numbers, NetworkX to CSV already works and does not surprise me.

## Problems noted

1. Inside the Export dialog, the Table choice (Edges / Nodes / Adjacency) could not be changed by
   keyboard; arrow keys did nothing and focus was not audible. Severity high.
2. Shift+Tab then Space from the Table choice ran Export and saved an adjacency CSV I did not
   intend; dialog closed, focus moved to the main menu button. Severity high.
3. Data export opens on Edges even when the Nodes table is the one open at the bottom; only the
   table's own "Export table as CSV..." brings Nodes in. Severity medium.
4. Duplicate names: "Data" names four controls at once, "Nodes" three, "Export" three, "Table" two.
   With a dialog open, the ones behind it are still reachable by name. Severity medium.
5. Adjacency header says "every attribute and run result" while its warning says attributes and
   run results are not written. Severity medium.
6. Recent exports lists files with different names and times from the ones the confirmations
   announced; the files from this session are missing. Severity medium.
7. The picture's legend cannot be verified without sight; only the line "with the legend" says so.
   "64 labels hidden" means most names are not on the picture. Severity low.
8. "Every column" vs "Hidden columns too": unclear whether the first includes hidden columns.
   Severity low.
