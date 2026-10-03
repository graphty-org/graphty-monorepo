# Session: Les Miserables first look -- Expert Emma

Participant: Expert Emma (network scientist; networkx/igraph in notebooks, Gephi for figures).
Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Get it on screen and work out what you have: how many characters there are, how many
connections between them, whether every character can be reached from every other, and what facts
are recorded about each character."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t06--expert-emma/.

## 01 -- start screen (shots/tasks/r8-t06/01.png)

"First thing I look for: where does my data go. Top right says 'Local only', and under Start it
says files are read on this computer and never uploaded. Good, that is the sentence I wanted. But
there is also a banner at the bottom asking me to share usage data. 'Your data is yours, but please
help us.' Let me see what they want before I say no."

"Samples on the right. Les Miserables, 77 characters -- that already answers one of the questions,
if I trust the card. It says it opens with 'worked examples: measures, groups, paths and notes
already added'. I would rather it opened clean, but fine."

## 02 -- expand what is collected

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t06 --click "What is collected"

"A replay of each session, masked. Task events with timings. Errors. A feedback widget. 'No file
contents ever leave your computer.' A session replay is a recording of my screen, masked or not; on
a client laptop that is a conversation with IT I am not having. Also 'the author of the application
and his Claude Code sessions' -- that is an odd thing to read in a privacy notice. No thanks."

## 03 -- decline and open the sample

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t06 --click "What is collected" --click "No thanks" --click "Les Miserables"

"OK, it is on screen. Node-link, 2D, thank you for not making it 3D. Colored by PageRank, legend top
left with a range, 0.00330 to 0.0754. The left list is busy: PageRank, Louvain with 6 groups,
shortest paths, Density, Link prediction, a Watchlist, a folder 'For the report'... Somebody has
done an afternoon of work in here already. I came to see the data, not their analysis. And
'Louvain 6 groups' with no resolution and no Q next to it -- noted."

"No node or edge count anywhere obvious on this screen. 'Density' is in the list; density needs n
and m, so maybe that is where the summary lives."

## 04 -- Density row

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Density"

"Density 0.0868, connected components 1, isolated nodes 0, average degree 6.60. So yes, one
component, everyone reachable from everyone. 77 times 6.6 over 2 is 254 edges -- I can back it
out, but I should not have to. 'Every option at its default' -- which defaults? Show me."

"Wait, the left list changed. Now there is 'Clique communi...', 'Transitivity', 'Local clustering'
rows that were not there before, and the order moved. Did clicking Density add things? I did not
ask for any of that. That makes me nervous."

## 05 -- open the table

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Density" --click "Table"

"A data table next to the picture, good. But it opened on the Louvain communities table, not the
nodes. Six communities, sizes, density, edges inside, edges leaving. Useful later. Not what I
opened a table for."

## 06 -- Nodes tab

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Density" --click "Table" --click "Nodes"

"'77 nodes', 'Rows 1 to 77 of 77'. Confirmed. Columns: label, Notes, group, Degree (full graph),
Rank by degree, PageRank (full graph), Rank by PageRank... 'Columns: 9 of 9'. Valjean degree 36,
which is right for this dataset. But which of these came with the file and which did the program
compute? The task is what is recorded about each character. I cannot tell from the headers."

## 07 -- Edges tab

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Density" --click "Table" --click "Edges"

"254 edges. Matches my back-of-envelope. Source, target, value -- value is the co-occurrence count,
Cosette-Valjean 31. Fine."

## 08 -- Columns chooser

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Density" --click "Table" --click "Nodes" --click "Columns: 9 of 9"

"Columns popover: In use -- label, group. Other attributes -- betweenness, degree. So there is a
'degree' attribute AND a 'Degree (full graph)' column. Two degrees. Which one is the file's? Also
-- the panel on the right flipped to Louvain and the left tree expanded Louvain's six communities.
I clicked a column chooser. Why did the whole app move?"

## 09 -- Data section in the left rail

    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data"

"There it is. This is the screen I wanted first. Source miserables.gexf, 77 nodes, 254 edges.
Summary on the right: undirected, weight 'value, stronger', density 0.0868, 1 connected component,
average degree 6.60, highest degree 36, and a degree distribution on log-log. A CCDF, labeled as
'the share of nodes with degree k or more'. Fine, that is good. Someone here has read a networks
paper."

"Attributes: nodes have label and group 'in use', betweenness and degree 'other'. Edges have value.
Then a separate 'Results' heading with Louvain and PageRank. So the split between recorded and
computed is here. But there is the same little stack icon next to betweenness, degree, Louvain and
PageRank, and I have no idea what it means."

## 10 -- betweenness attribute

    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --click "betweenness"

"'From miserables.gexf (imported, not computed)'. Good, that is the answer. 77 of 77 have a value,
range 0 to 0.57, median 0. Normalized by whatever whoever made the GEXF used, presumably -- the tool
cannot know, and at least it says it did not compute it."

"So: 77 characters, 254 co-appearance links, undirected, weighted by 'value', one connected
component, no isolates. Recorded per character: label, group, degree, betweenness -- all from the
file. Louvain and PageRank are the program's own results. Done."

## Verdict

- Succeeded: yes. 77 nodes, 254 edges, one connected component, node attributes label, group,
  degree and betweenness (imported), edge attribute value (weight).
- Single Ease Question: 5 of 7. The Data summary is exactly right once found; getting there went
  through a busy pre-built project, a table that opened on the wrong tab, and a tree that kept
  rearranging itself.
- Would I use it instead of my current tool: not instead of the notebook, no -- I did not see an
  API. But for handing a view to a client, maybe, because it is local and the Data summary is
  honest about what is imported versus computed. I would want the sample to open clean, and I would
  want the counts and component summary on the first screen, not behind 'Data'.

## Problems noted

1. No node/edge count or component summary on the first graph screen; found only via the Data rail
   item. The Density result showed components but not n or m.
2. Opening the sample loads a busy prepared project (PageRank coloring, Louvain, paths, watchlist,
   report folder) -- noise for a first look; Louvain shown with no resolution or Q.
3. The left tree changed contents between clicks (Clique communities, Transitivity, Local
   clustering appeared after clicking Density; Louvain expanded and the inspector switched to
   Louvain after opening the Columns chooser).
4. Table opened on the Louvain tab rather than Nodes.
5. Two degree columns (imported 'degree' and computed 'Degree (full graph)') with nothing in the
   table header saying which is which.
6. Unexplained stack icon beside attributes and results.
7. 'Every option at its default' without listing the options.
8. Usage-data banner offers session replay and names 'his Claude Code sessions' -- reads oddly in a
   privacy notice; declined.
