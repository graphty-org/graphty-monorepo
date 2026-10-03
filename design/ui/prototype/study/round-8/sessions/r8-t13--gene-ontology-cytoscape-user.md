# Session: export a picture with its legend, and the per-character numbers for Excel

Participant: Joaquin (Gene Ontology curator turned computational biologist; Cytoscape, GOATOOLS, R).
Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. You need two things for a report: a picture file of the drawing as it looks now, with its
key to the colors, and the numbers the program worked out for each character in a file Excel can
open."

All commands were run from design/ui/prototype. D below stands for
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t13--gene-ontology-cytoscape-user

## 01 -- start screen (shots/tasks/r8-t13/01.png)

A start page with Open, New from data, and a Samples column. Les Miserables is the first sample,
"77 characters". There is a usage-data banner over the bottom. I skim it, I do not want to
share anything, so "No thanks". Then the sample.

## 02 -- the sample opens

    timeout 120 node app-b/study.mjs --try D/02.png task:r8-t13 --click "No thanks" --click "Les Miserables"

The network is drawn, all nodes orange to brown. Top left of the canvas a small key: "Color:
PageRank, 0.00330 to 0.0754". Good, there is a legend, and it gives the range. On the left a long
list: PageRank, Louvain 6 groups, Shortest paths, Top 9 by degree, Watchlist, Group 2, Group 8,
Betweenness... Many of them have colored swatches, but the drawing is only orange. I assume only
PageRank is actually painting, since that is what the key says, but the list makes me wonder
whether the key is the whole story. Louvain has a swatch and I see no groups on the canvas.
Not my problem today; the task says "as it looks now".

In Cytoscape I would go File > Export > Network to Image. I look for a menu. Top left there is a
three-line button.

## 03, 04 -- the main menu

    timeout 120 node app-b/study.mjs --try D/03.png task:r8-t13 --click "No thanks" --click "Les Miserables" --hover "Menu"
    timeout 120 node app-b/study.mjs --try D/04.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Menu"

Tooltip "Main menu". It has "Export... Ctrl+E". That is where I expected it.

## 05 -- Export, Image

    timeout 120 node app-b/study.mjs --try D/05.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..."

A dialog with Image, Video, Report, Recipe, Data on the left. Image is selected: "Image .png,
Full graph, with the legend". It says it in so many words: with the legend. That is what I want.
The preview is small, the legend box in the corner of it is unreadable at this size, I have to
trust it. "64 labels hidden to avoid overlap: show list" -- fine, the canvas only shows a dozen
names anyway, so that matches "as it looks now". Preset "To share -- PNG, 2x", 1,802 x 1,638.
For a paper I would want a vector file or at least a print setting; there is a "Print" look, I
leave it, this is practice.

## 06 -- export the image

    timeout 120 node app-b/study.mjs --try D/06.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "Export"

Toast: "Exported les-miserables.png to Downloads". One thing done, I believe. I did not get to
see the final file, only the thumbnail, so I cannot swear the key is legible in it.

## 07, 08 -- Export, Data

Same dialog, Data on the left.

    timeout 120 node app-b/study.mjs --try D/07.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "Data"

My click on "Data" in the dialog did nothing; the dialog stayed on Image. (The word Data is also
the left rail button and a tab behind the dialog.) I used the keyboard to move down the list
instead.

    timeout 120 node app-b/study.mjs --try D/08.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "Image" --key ArrowDown --key ArrowDown --key ArrowDown --key ArrowDown

Data page: "What is written": rows, ids "as loaded, never renumbered: '0' stays Myriel's id" --
that I like very much; my GO ids losing their zeros in a spreadsheet is a real problem. Run
columns headed with scope and method. Rank as a whole number with a separate tie column.
Format CSV, Scope Full graph.

But: Table is set to "Edges". "Every one in the scope, with no cap: 254 edges". I asked for each
character, not each pair. If I had pressed Export straight away I would have got an edge list
and only noticed in Excel. The Data page talks about betweenness in its examples, and betweenness
is the one row in the left list with a crossed-out eye; I cannot tell from here whether it is in
the file.

## 09, 10 -- trying to switch the table to Nodes

    timeout 120 node app-b/study.mjs --try D/09.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "Image" --key ArrowDown --key ArrowDown --key ArrowDown --key ArrowDown --click "Nodes" --click "Every column"

Clicking "Nodes" did not take (there is also a Nodes tab under the canvas). Tried again with the
keyboard:

    timeout 120 node app-b/study.mjs --try D/09.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "Image" --key ArrowDown --key ArrowDown --key ArrowDown --key ArrowDown --click "Every column" --click "Generic" --key Shift+Tab --key ArrowRight

"Every column" took, and a third choice "Hidden columns too" appeared. Table still Edges.

    timeout 120 node app-b/study.mjs --try D/10.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "Image" --key ArrowDown --key ArrowDown --key ArrowDown --key ArrowDown --click "Every column" --click "Adjacency" --key ArrowLeft

Now Adjacency is selected and the arrow key did not move it. A yellow box "CSV cannot hold
everything: an adjacency table holds who links to whom and the edge value only". Also my
"Every column" choice vanished. I am now fighting the dialog. I give up on this road and go the
way I would in Cytoscape: the Node Table.

## 11 -- the table under the canvas

    timeout 120 node app-b/study.mjs --try D/11.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table"

A node table: label, notes, group, Degree (full graph), Rank by degree, PageRank (full graph),
Rank by PageRank... 77 nodes, "Columns: 9 of 9". That is the Node Table I know. "(full graph)"
in the header tells me what it was computed on. Good.

## 12, 13 -- table options

    timeout 120 node app-b/study.mjs --try D/12.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --hover "table"
    timeout 120 node app-b/study.mjs --try D/13.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --click "Table options"

The "..." is "Table options": Time slider (disabled, no time attribute) and "Export table as
CSV...". Exactly what I wanted.

## 14 -- same dialog, now on Nodes

    timeout 120 node app-b/study.mjs --try D/14.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --click "Table options" --click "Export table as CSV..."

It opens the same Export dialog, on Data, and this time Table is Nodes, 77 nodes, columns "Shown
in the table, 9 of 9". So the dialog does know which table I came from. From the main menu it
had guessed Edges.

## 15, 16 -- every column, export

    timeout 120 node app-b/study.mjs --try D/15.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --click "Table options" --click "Export table as CSV..." --click "Every column"
    timeout 120 node app-b/study.mjs --try D/16.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --click "Table options" --click "Export table as CSV..." --click "Every column" --click "Export"

I pick "Every column" so whatever the program computed goes in, not just what happens to be
visible -- header now says "every attribute and run result". Export. Toast: "Exported
les-miserables_nodes.csv to Downloads". I stop here.

## After the task

Did I succeed? I think so: les-miserables.png "with the legend" and les-miserables_nodes.csv with
every column, 77 rows. Two doubts: I never saw the PNG at full size, so I do not know whether the
key is legible; and I am not certain betweenness, which is switched off in the list, is in the
CSV, though "every attribute and run result" suggests it is.

Single Ease Question: 5 of 7. The picture was easy and said plainly that the legend was
included. The numbers were not: Export > Data opened on the edge table, and I could not get it
to the node table from inside the dialog. The table's own "Export table as CSV" did it right.

Would I use this instead of my current tool? For this job, exporting a figure and a node table,
it is at least as easy as Cytoscape, and the export page that says ids stay strings and every
column is labeled with its method and scope is better than anything Cytoscape tells me. But this
network has no edge types and no hierarchy, so it told me nothing about what I actually need: a
DAG drawn top-down with is_a and part_of told apart. I would not switch on the strength of this.
