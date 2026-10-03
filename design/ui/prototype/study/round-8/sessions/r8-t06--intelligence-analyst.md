# Session: open the Les Miserables sample and size it up -- Marcus, criminal intelligence analyst

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Get it on screen and work out what you have: how many characters there are, how many
connections between them, whether every character can be reached from every other, and what facts
are recorded about each character."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t06--intelligence-analyst/.

## Step 1 -- start screen (shots/tasks/r8-t06/01.png)

Start list on the left, Samples on the right, and a box at the bottom asking to collect usage
data. "Files are read on this computer and never uploaded" and "Local only" up top -- good, that
is the first thing I look for. The usage box: no. Les Miserables is the first sample, "77
characters". So the card already answers question one, if I trust it.

## Step 2 -- decline usage data, open the sample (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t06 --click "No thanks" --click "Les Miserables"

Chart is up. Busy -- somebody already loaded PageRank, Louvain, shortest paths, a watchlist, a
report folder. It's all orange dots and gray lines, no icons. On the right: "Paints 77 nodes".
77 again. No link count anywhere I can see. There's a Table bar at the bottom with Nodes and
Edges. Edges should be the links.

## Step 3 -- edges table (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Edges"

"254 edges". Source, target, value -- Cosette/Valjean 31. Value is probably shared chapters,
like a call count. 254 links.

## Step 4 -- nodes table (04.png)

    ... --click "Edges" --click "Nodes"

"77 nodes". Columns: label, Notes, group, Degree (full graph), Rank by degree, PageRank, Rank by
PageRank... That's a mix. Name and group look like they came with the data, the rest the program
worked out. "Columns: 9 of 9" -- maybe it tells me which is which.

## Step 5 -- column chooser (05.png)

    ... --click "Nodes" --click "Columns: 9 of 9"

Two things at once: a Columns list, and the right side flipped to a summary of the whole chart:
Nodes 77, Edges 254 ("each a distinct pair"), Undirected, Density 0.0868, Connected components
1, Average degree 6.60, Highest degree 36. That is my whole task in one box. I didn't ask for it,
but I'll take it.

Columns list: label, group (in use), betweenness, degree (other attributes). Four. The table said
9 of 9. Which one's lying? The other five are the program's computed columns, I guess, but the
list doesn't say so.

## Step 6 -- try to read what "Connected components" means

    ... --click "Columns: 9 of 9" --hover "Connected components"

Nothing. The popup was in the way.

## Step 7 -- close popup, hover again (07.png)

    ... --click "Columns: 9 of 9" --key Escape --hover "Connected components"

Tooltip: "Groups of nodes joined to each other and to nothing else. Click to select the 77
nodes." One group holding all 77. So yes, everybody can reach everybody. Plain enough wording; I
could repeat that to a sergeant.

## Step 8 -- one character's record (08.png)

    ... --click "Nodes" --click "Valjean"

He's selected, chart rings him, "Valjean, 36 connections". But the right side shows "Why this
look" -- styling. I want his record, not his paint job.

## Step 9 -- Data tab (09.png)

    ... --click "Valjean" --click "Data"

Wrong Data -- it took the left rail one, and my selection of Valjean went away. But it's the page
I needed: source miserables.gexf, 77 nodes, 254 edges; "Weight: value, a higher value is a
stronger tie". Attributes: Nodes -- label, group (in use), betweenness, degree. Edges -- value.
Results -- Louvain, PageRank.

So each character carries name, group, betweenness, degree. I'm reading betweenness and degree as
from the file because they sit under Nodes, not under Results. But the table also has its own
"Degree (full graph)" column, and the same stack icon sits next to betweenness, degree, Louvain
and PageRank. Did the program compute degree, or did whoever made the file? I'd want that pinned
down before I wrote it in a product. And "group" -- group of what? A number, 2, 8, 4. No
definition.

Stopping here.

## Answers I'd give

- Characters: 77.
- Connections: 254, undirected, each pair once, weighted by "value".
- Reachable: yes -- one connected component holds all 77.
- Facts per character: label (name), group, betweenness, degree. Links carry a value.
  The program has added PageRank, Louvain groups and ranks on top.

## Did I succeed?

Yes, on all four. Least sure about which character facts came from the file and which the
program computed.

## Single Ease Question: 6 of 7

The summary box answered three of four questions in one place, and the tooltip on "components"
was plain. Lost a point for the right panel changing on me without asking, the "9 of 9" vs four
columns mismatch, two things called "Data" (I got the wrong one), and the stack icon that makes
file fields look like computed results.

## Would I use this instead of my current tool?

Not instead of i2 -- no entity icons, identical orange dots, and I can't open my .anb charts.
Alongside it, maybe: that summary box (components, density, highest degree) is what I'd otherwise
do by hand in Excel, and it says "local only" up front. If it took my phone dump as a CSV that
easily, I'd use it for the numbers and still draw the court chart in i2.
