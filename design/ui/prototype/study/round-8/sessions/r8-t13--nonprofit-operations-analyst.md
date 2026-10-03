# Session: picture with its key, and the per-character numbers for Excel

Participant: nonprofit operations analyst ("Grace"), first time using the program.

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. You need two things for a report: a picture file of the drawing as it looks now, with its
key to the colors, and the numbers the program worked out for each character in a file Excel can
open."

All commands ran from `design/ui/prototype`. `D` below is
`/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t13--nonprofit-operations-analyst`.

## Step 1 -- start screen (shots/tasks/r8-t13/01.png)

Think-aloud: "OK, a start page. Samples on the right, Les Miserables is first, 77 characters. Good,
that's the one. There's a box at the bottom asking to collect usage data. I'm not sharing anything
from a work laptop -- No thanks. I do like 'Files are read on this computer and never uploaded'
and the 'Local only' at the top. That's the sentence I'd need for donor names."

## Step 2 -- open the sample (02.png)

```
timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t13 --click "No thanks" --click "Les Miserables"
```

Think-aloud: "There's the drawing. Orange dots, a few names. Top left of the drawing there's a little
box, 'Color: PageRank, 0.00330 to 0.0754'. That's the key, I suppose. I have no idea what PageRank
is -- Google thing? -- and those numbers mean nothing to me. I'd have to explain this to the board
somehow. The list on the left has a lot of stuff: Louvain, Shortest paths, Density, Link
prediction... I'm not going to touch any of it. The task says the drawing 'as it looks now', so I
leave it alone. Now -- where do I save a picture? Usually File. There's no File menu, but the name
'Les Miserables' at the top has a little arrow."

## Step 3 -- project menu (03.png)

```
timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Les Miserables"
```

Think-aloud: "Yes, that's basically a File menu. Open, Save, Export... Ctrl+E. Export is what I want."

## Step 4 -- Export dialog, Image (04.png)

```
timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Export..."
```

Think-aloud: "It opened right on Image, .png, and it says 'Full graph, with the legend'. Legend --
that's the key. Good. The preview is tiny but I can see the key box in the corner. Hmm, '64 labels
hidden to avoid overlap'. So most names won't be on the slide. That bothers me a bit -- the board
will ask 'who's that dot?' -- but the screen also only shows about a dozen names, and the task says
as it looks now, so I'll accept it. 'To share -- PNG, 2x' sounds fine. Export."

## Step 5 -- picture saved (05.png)

```
timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Export..." --click "Export"
```

Think-aloud: "'Exported les-miserables.png to Downloads.' One down. Now the numbers. The same Export
box had 'Data' in its list. Let me go back there."

## Step 6 -- trying Data in the Export dialog (06.png, 07.png)

```
timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Export..." --click "Data"
timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Export..." --click "Recipe" --key ArrowDown
```

(The first try clicked a "Data" behind the dialog and nothing changed; the second got me onto Data
in the dialog's list.)

Think-aloud: "OK, Data. CSV -- Excel opens CSV, fine. But wait: 'Rows: every one in the scope, with no
cap: 254 edges'. Edges? I want one row per character. 77, not 254. There's a 'Table' line: Edges,
Nodes, Adjacency. I think 'nodes' are the dots, the characters. Why would it default to the lines
between them? And the text above is heavy going: 'Run columns', 'Headed with the scope and method
they were computed with', 'betweenness rank low (full graph, sampled from 20 sources)'. I skimmed
that. Columns: 'Shown in the table' or 'Every column'. I want every number it worked out, so Every
column, I think."

## Step 7 -- trying to switch the dialog to Nodes (08.png - 11.png)

```
timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Export..." --click "Recipe" --key ArrowDown --click "Nodes" --click "Every column"
timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Export..." --click "Recipe" --key ArrowDown --click "Adjacency" --key ArrowLeft --click "Every column"
timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Export..." --click "Recipe" --key ArrowDown --click "Every column" --click "Edges" --key ArrowRight
timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Export..." --click "Recipe" --key ArrowDown --click "Neo4j" --key Shift+Tab --key ArrowRight
```

Think-aloud: "I click Nodes... still says Edges, 254. Again. Nothing. Adjacency does select, and
then a yellow warning 'CSV cannot hold everything' -- no, not that one. Arrow keys don't move it
either. Every column did take, and then a third option 'Hidden columns too' showed up, which makes
me wonder whether 'Every column' really is every column. I'm going round in circles in here. Let me
close this and look at the table of characters itself -- if I can see the list, maybe I can save
the list."

(Moderator's note on the record: the clicks on the dialog's "Nodes" and "Edges" were landing on the
same-named tabs of the table behind the dialog, so this loop is partly the study tool, not
necessarily the design. The default of Edges for a per-character export is the design.)

## Step 8 -- the table at the bottom (12.png)

```
timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table"
```

Think-aloud: "Now this I understand. 77 nodes, one row per character: label, group, Degree, Rank by
degree, PageRank, Rank by PageRank, and more off to the right. 'Rows 1 to 77 of 77' -- matches the 77
characters on the sample card. This is what goes into Excel. There's a '...' next to 'Columns: 9 of
9'. That's usually where Export lives."

## Step 9 -- table menu (13.png)

```
timeout 120 node app-b/study.mjs --try $D/13.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --click "Table options"
```

(Names "More" and "More actions" were also tried for that button and matched nothing; "Table options"
opened it.)

Think-aloud: "'Export table as CSV...'. That's exactly what I'd hope for."

## Step 10 -- export dialog again, already set right (14.png)

```
timeout 120 node app-b/study.mjs --try $D/14.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --click "Table options" --click "Export table as CSV..."
```

Think-aloud: "Oh, it's the same Export box -- but now it says Nodes, 77 nodes, 'Columns 9 of 9, as
the table's Columns shows them'. So coming from the table it was filled in for me. Why didn't the
File menu way do that? Anyway, 77 matches. I'll leave 'Shown in the table' since it says 9 of 9.
Export."

## Step 11 -- numbers saved (15.png)

```
timeout 120 node app-b/study.mjs --try $D/15.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --click "Table options" --click "Export table as CSV..." --click "Export"
```

Think-aloud: "'Exported les-miserables_nodes.csv to Downloads.' Done. Two files: the picture and the
CSV."

## Wrap-up

**Did I succeed?** I think so. I have les-miserables.png, which the dialog said includes the key,
and les-miserables_nodes.csv with 77 rows, one per character. Two doubts: whether the CSV has
every number (the 'Betweenness' row on the left has its eye crossed out, and 'Hidden columns too'
suggests some numbers might not be in my file), and whether a board can read a key that says
'PageRank 0.00330 to 0.0754'.

**Single Ease Question:** 4 of 7. The picture took three clicks and was easy (that part alone is a
6). The numbers were the hard part: the File-menu Export defaulted to 254 lines-between-characters
instead of 77 characters, I could not get it switched over, and the explanatory text was written for
a statistician. Going through the table was the easy road, but I only found it because I gave up on
the first one.

**Would I use this instead of what I use now?** For the slide picture, maybe -- it was faster than
anything I'd do in Excel, and "never uploaded" matters with donor names. For the numbers, not yet: I
need to be sure the file has everything and that the column names mean something to my director.
"PageRank" and "betweenness" need plain words ("most connected", "go-between") before this goes into
a board report. I'd try it again next quarter if the export from the File menu started on the
characters, the same way the table's export did.
