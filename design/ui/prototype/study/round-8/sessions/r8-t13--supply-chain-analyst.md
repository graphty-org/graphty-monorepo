# Session r8-t13 -- supply chain analyst (Dana Okafor)

Task as given by the moderator: "You have never used this program before. You will practice on
the ready-made network of characters from the novel Les Miserables that comes with the program,
not on your own data. You need two things for a report: a picture file of the drawing as it
looks now, with its key to the colors, and the numbers the program worked out for each
character in a file Excel can open."

Renders are in `tmp/round-8-sessions/r8-t13--supply-chain-analyst/` (paths below are relative
to `design/ui/prototype/`). Every command was run from `design/ui/prototype` and replays from
the start screen.

## Think-aloud

**01 (start screen, `shots/tasks/r8-t13/01.png`).** "OK, a start page. 'Files are read on this
computer and never uploaded' -- good, that's the first thing IT will ask me. There's a box at the
bottom asking to share usage data. No thanks; I don't sign up for anything on a work laptop.
Les Miserables is right there under Samples, 77 characters."

**02** -- `node app-b/study.mjs --try tmp/round-8-sessions/r8-t13--supply-chain-analyst/02.png task:r8-t13 --click "No thanks" --click "Les Miserables"`

"Lots going on. A long list on the left with words I don't know -- Louvain, Link prediction,
Density. I'll ignore those. The drawing is all orange-to-brown, and up in the corner there's a
little box: 'Color: PageRank 0.00330 to 0.0754'. That's the key, fine. I don't know what
PageRank is but I don't need to for this. Now I want 'Export'. Top left has the three-lines
icon, that's usually File."

**03** -- `... --click "No thanks" --click "Les Miserables" --hover "Menu"`
Tooltip: "Main menu".

**04** -- `... --click "No thanks" --click "Les Miserables" --click "Main menu"`

"New project, Open, Save, Export... Ctrl+E. There it is."

**05** -- `... --click "Main menu" --click "Export..."`

"Image, Video, Report, Recipe, Data down the side. It's on Image already: 'Full graph, with the
legend'. Good -- legend is the color key. The preview shows the little key box in the corner.
'64 labels hidden to avoid overlap' -- fine, nobody reads 77 names on a slide anyway. PNG, 2x.
Export."

**06** -- `... --click "Export..." --click "Export"`

"'Exported les-miserables.png to Downloads.' One down. That took me about a minute. Now the
numbers. That box had 'Data' on the left, I'll go back there."

**07** -- `... --click "Export" --click "Main menu" --click "Export..." --click "Data"`

"I clicked Data and... nothing. Still on Image." (The click went to a different control called
Data behind the box. A person with a mouse would have hit the item they were looking at; I
noted it as a tool limit, not held it against the app.)

**08** -- `... --click "Export..." --click 'option "Data"'` -- "nothing on screen is called ...".

**09** -- `... --click "Main menu" --click "Export..." --click "Recipe" --key ArrowDown`

"OK, Data page. CSV -- Excel opens that. But 'Rows: every one in the scope: 254 edges'. I want
one row per character. There are 77 characters; the screen keeps calling them '77 nodes'. So I
want 'Nodes' on the Table line, not 'Edges'. I'd have exported 254 rows of who-links-to-whom if
I hadn't read that line. The default is the wrong thing for what I asked. 'Columns: Shown in the
table' -- what table? I haven't opened a table. I'd pick 'Every column' to be safe."

The rest of this page is a wall of text: "Ids: as loaded, never renumbered", "Run columns: headed
with the scope and method", a paragraph about ranks with "sampled from 20 sources". "I don't
know what any of that is. I skip it."

**10** -- `... --click "Recipe" --key ArrowDown --click "Nodes" --click "Every column"`
The click on Nodes hit a control behind the box (tool limit again).

**11** -- `... --click "Recipe" --key ArrowDown --click "Adjacency" --key ArrowLeft --click "Every column"`

"Now it says Adjacency and a yellow warning: 'CSV cannot hold everything -- an adjacency table
holds who links to whom and the edge value only; every node attribute and run result is not
written.' So not that. And the 'Every column' choice disappeared and became an 'Advanced'
dropdown. The options change under me depending on what I pick. Arrow key didn't move me back."

**12** -- `... --click "Adjacency" --key Shift+Tab --key Space`

"Oops. It exported. 'Exported les-miserables_adjacency.csv to Downloads.' That's the file the
warning just told me has none of the numbers. Space on whatever had focus pressed Export. Now I
have a wrong file in Downloads I have to remember to delete. That's exactly how a wrong file ends
up attached to an email."

"Forget that box. There's a 'Table' button at the bottom of the screen with Nodes and Edges next
to it. In my world, if you want a table in Excel, you go to the table."

**13** -- `... --click "No thanks" --click "Les Miserables" --click "Table"`

"Now THIS I understand. 77 nodes, one row per character: label, group, Degree, Rank by degree
'#1 of 77', PageRank. Sorted by degree. 'Valjean is first on all three measures' -- nice, a
sentence I could paste on a slide. These are the numbers the program worked out. There's a
'...' next to 'Columns: 9 of 9'."

**14** -- `... --click "Table" --hover "More"` -- nothing called "More".
**15 (probing)** -- hovered "Table actions", "Table options", "Table menu", "Options" in turn;
the dots icon's tooltip is "Table options".

**15** -- `... --click "Table" --click "Table options"`

"Two things: 'Time slider -- this data has no time attribute' (grayed out) and 'Export table as
CSV...'. Yes."

**16** -- `... --click "Table options" --click "Export table as CSV..."`

"It opens the same Export box as before, but now it's already set right: Nodes, 77 nodes,
Columns 'Shown in the table, 9 of 9'. So the box CAN be right, it just wasn't when I came in
through the menu. Export."

**17** -- `... --click "Export table as CSV..." --click "Export"`

"'Exported les-miserables_nodes.csv to Downloads.' Done. Picture with key, and a CSV with one
row per character."

## Outcome

- Succeeded? Yes, I believe so: `les-miserables.png` (full graph with the PageRank color key) and
  `les-miserables_nodes.csv` (77 rows, the 9 columns of the Nodes table). Plus one wrong file,
  `les-miserables_adjacency.csv`, exported by accident, which I'd delete.
- Single Ease Question: **4 / 7.** The picture was a 7: menu, Export, it said "with the legend",
  done. The numbers were a 2 through the main Export menu -- it defaulted to the link rows, not the
  characters, the options rearranged themselves, and I fired off a wrong file. Through the table it
  was easy. I only found that path because I gave up on the first one.
- Would I use this instead of my current tool? Not instead -- maybe beside Excel. The good: it
  says up front nothing is uploaded and everything stays on my machine, which is the first IT
  question; the picture comes with its own key, which Power BI's network visual never gave me; and
  the table is a real table I can sort and export. The bad: the export defaults to "edges" when the
  word "character" in my head means a node, and the data export page reads like a spec sheet. And
  nothing here goes into Power BI directly; a CSV I can load myself, so it is a side tool at best
  until that changes.

## Problems noticed

1. The Data page of the main Export dialog defaults to the Edges table (254 rows). For "the
   numbers for each character" the right answer is Nodes. Nothing tells you that the rows you
   want are the nodes; I only caught it because the Rows line said "254 edges" and I knew there
   were 77 characters.
2. Picking Adjacency hides the Columns choice and replaces it with an "Advanced" dropdown; the
   form changes shape as you pick, so I lost my place.
3. I triggered Export by accident with the keyboard and got a file the warning had just said was
   useless. No "are you sure" when the chosen table is the one flagged "CSV cannot hold
   everything".
4. "Columns: Shown in the table" means nothing when you came from the main menu and never opened
   a table.
5. The Data page's "What is written" block (Ids, Run columns, Rank with "sampled from 20 sources",
   "betweenness" examples while the screen is colored by PageRank) is unreadable for me; I skipped
   it.
6. The table's export lives behind an unlabeled "..." whose name is "Table options"; I found it
   by guessing. In Excel I'd expect an Export button on the table itself.
7. (Tool limit, not the app) The click-through tool kept hitting controls named "Data" and
   "Nodes" behind the Export box, so I had to use the keyboard; a mouse user would not have hit
   that.
