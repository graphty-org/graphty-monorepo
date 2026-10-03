# Session: first look at the Les Miserables sample -- Grace, nonprofit operations analyst

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Get it on screen and work out what you have: how many characters there are, how many
connections between them, whether every character can be reached from every other, and what facts
are recorded about each character."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t06--nonprofit-operations-analyst/ (D below).

## Step 1 -- the start screen (shots/tasks/r8-t06/01.png)

Think-aloud: "OK, a welcome page. On the left 'Open project or file' and 'New from data'. On the
right, Samples, and the first one is Les Miserables, '77 characters'. So that already answers my
first question, if I trust it. I like the line 'Files are read on this computer and never
uploaded' -- that is the first thing I would check before I put donor names in here. There is a
big box at the bottom asking to collect usage data. I don't want to deal with that, so No thanks."

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t06 --click "No thanks" --click "Les Miserables"

Think-aloud: "Whoa. That is a lot. A picture of dots and lines, fine, that's what I expected. But
the left side already has a list: PageRank, Louvain, Shortest paths, Density, Link prediction,
Top 9 by degree, Watchlist, For the report, Group 2, Group 8, Betweenness... I didn't do any of
that. Somebody already did a bunch of analysis. Box at the top says 'Color: PageRank 0.00330 to
0.0754' -- I don't know what PageRank is. The right panel says 'Paints 77 nodes (every node with a
value)'. 77 again -- 'nodes' I guess means characters. Nothing here tells me the number of
connections. There's a 'Table' at the bottom; I'm an Excel person, I'll open the table."

## Step 3 -- the table

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Table"

(The tool reported "Table" matched two controls and clicked the first.)

Think-aloud: "'77 nodes', 'Rows 1 to 77 of 77'. Good, that's my row count, it matches the 77
characters on the sample card. Columns: label, Notes, group, Degree (full graph), Rank by degree,
PageRank, Rank by PageRank... Which of these came with the book data and which did the program
make up? I can't tell. 'Degree' I sort of know -- number of connections? There's also a line
'Valjean is first on all three measures' -- which three? I want the plain facts first. Let me try
the 'Data' button on the left side, that sounds like where the raw stuff is."

## Step 4 -- the Data side

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data"

(The tool reported "Data" matched two controls -- the left button and a tab -- and clicked the first.)

Think-aloud: "This is the page I wanted. Left: the file, 'miserables.gexf, 77 nodes, 254 edges'.
Right, a Summary: Nodes 77, Edges '254 edges, each a distinct pair', Undirected, Weight 'value,
stronger'. And under edges: 'Weight: value, a higher value is a stronger tie' -- plain English,
thank you. So 77 characters and 254 connections, and no pair counted twice, which is the first
thing I'd worry about in a spreadsheet.

Reached from every other... there's 'Connected components 1'. That's a stats word. Density
0.0868, Average degree 6.60, Highest degree 36. And a little curve chart I won't read. I'm going
to guess 'connected components 1' means it's all one piece, but I'm not sure.

Facts about each character: under Attributes, Nodes: 'In use (2)' -- label (Name, Label) and group
(Color (gro...). Then 'Other attributes': betweenness, degree. Edges: value. Then 'Results':
Louvain, PageRank. So I think the recorded facts are label and group, and maybe betweenness and
degree? Those two have the same little stacked icon as Louvain and PageRank, which are 'Results',
so did the program compute them? Confusing."

## Step 5 -- click the "1" next to Connected components

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --click "1"

Think-aloud: "It's blue, so I clicked it. It threw me back to the Graph view and the table popped
up with the rows highlighted blue. Nothing told me what just happened or what the 1 means. I'll
assume all 77 got highlighted, but I can only see four rows. Not helpful."

## Step 6 -- click betweenness to see where it came from

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --click "betweenness"

Think-aloud: "OK, the right side says 'From: miserables.gexf (imported, not computed)', '100%: 77
of 77 nodes have a value', range 0 to 0.57. So betweenness came in the file. That answers it, but
only because I clicked it. So the file gives each character: a name (label), a group, a degree and
a betweenness. Results like PageRank and Louvain were added afterward. I still don't know what
'group' is -- a number 2, 8, 4 -- chapter? family? Nothing says."

## Step 7 -- rest the pointer on "Connected components"

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --hover "Connected components"

Tooltip: "Groups of nodes joined to each other and to nothing else. Click to select the 77 nodes;
the table marks them as selected rows"

Think-aloud: "There it is. One group, and it holds all 77. So yes, everybody can be reached from
everybody, through somebody. I wish it just said that next to the number -- 'all 77 nodes are
connected' -- instead of making me hover over a stats word."

## Step 8 -- check the connection count in the table, Excel habit

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Table" --click "Edges"

Think-aloud: "'254 edges, Rows 1 to 20 of 254'. Source, target, value. Cosette-Valjean 31, the
highest. That looks like the two-column list the Excel how-tos talk about. Matches the 254. Done."

## Answers I came away with

- Characters: 77.
- Connections: 254, each a distinct pair, no direction; each has a 'value' where higher means a
  stronger tie.
- Everyone reachable from everyone: yes -- one connected group holding all 77 (I only became sure
  after reading the tooltip).
- Facts recorded per character: name (label), group, degree and betweenness, all from the file.
  PageRank and Louvain were added by the program, not recorded.

## Wrap-up

Succeeded? Yes, I think so. I'm confident on the counts, fairly confident on reachability, and
less sure on the facts list -- I had to click into betweenness to learn it came from the file, and
I never found out what 'group' means.

Single Ease Question: 5 of 7. The Data page summary was quick and plain once I found it. What cost
me: the sample opens with a dozen pre-made analyses I didn't ask for, so the first screen is
crowded with words like PageRank, Louvain, link prediction; 'connected components' is jargon with
the plain meaning hidden in a tooltip; and in the attribute list, imported facts and computed
results look alike.

Would I use this instead of what I use now (Excel)? Maybe, for this kind of job. Counting rows and
checking no pair is doubled is exactly what I do in Excel by hand, and this did it for me, and it
says the file never leaves my computer. But if my own file opens looking as busy as this sample,
I'd be lost; and I'd need words like 'most connected' rather than 'PageRank' before I'd show it to
my director.
