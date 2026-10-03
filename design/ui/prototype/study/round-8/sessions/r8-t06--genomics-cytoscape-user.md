# Session: Les Miserables first look -- genomics Cytoscape user (Maren)

Task given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Get it on screen and work out what you have: how many characters there are, how
many connections between them, whether every character can be reached from every other, and what
facts are recorded about each character."

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-8-sessions/r8-t06--genomics-cytoscape-user/`.

## Step 1 -- start screen (shots/tasks/r8-t06/01.png)

Think-aloud: "OK. Open project, New from data, and a list of samples on the right. Les Miserables,
77 characters -- well, that's one answer already, if I believe it. There's a usage-data box at the
bottom. 'Files are read on this computer and never uploaded' -- good, my PI would want that line.
I'll say No thanks, I don't share usage data from lab machines. Then click Les Miserables."

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t06 --click "No thanks" --click "Les Miserables"

What I saw: the network, flat and 2D (good, not spinning), nodes all orange-brown colored by
"PageRank", a long list on the left: Selection, Notes 4 items, Labels, PageRank, Louvain 6 groups,
Shortest paths, Density, Link prediction, Top 9 by degree, Watchlist, For the report, Group 2,
Group 8, Betweenness, Everything. Right panel says "Paints 77 nodes".

Think-aloud: "Whoa, that's a lot. Somebody has already done a whole analysis on this. I didn't ask
for PageRank coloring. It says 'worked examples' on the sample card, fine, but on my own data I'd
want to know what was mine and what the program did. And orange to brown -- at least it isn't red
green. 77 nodes again. Where's the edge count? In Cytoscape the network panel just tells you nodes
and edges. Let me try Table at the bottom -- that's where Cytoscape keeps the node table."

## Step 3 -- the table

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Table"

What I saw: a Nodes tab, "77 nodes sorted by degree", columns label, Notes, group, Degree (full
graph), Rank by degree (full graph), PageRank (full graph), Rank by PageRank... "Columns: 9 of 9".

Think-aloud: "77 nodes, confirmed. Valjean has degree 36. That's the node table I know. There's an
Edges tab next to it."

## Step 4 -- edges table

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Table" --click "Edges"

What I saw: "254 edges sorted by value", columns source, target, Notes, value. Cosette-Valjean 31.

Think-aloud: "254 edges. Value is presumably the weight -- how many chapters they share? Doesn't say
here. Now, is it all one piece? In Cytoscape I'd run Analyze Network and read 'connected
components'. There's a Density row in that left list, that sounds like the network statistics."

## Step 5 -- Density row

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Density"

What I saw: right panel "Density -- Summary: Density 0.0868, Connected components 1, Isolated nodes
0, Average degree 6.60". "Made with: Density, every option at its default, data version
miserables.gexf, ran Sep 28."

Think-aloud: "Connected components 1, isolated nodes 0. So yes, everyone can reach everyone. Average
degree 6.6 -- 254 times 2 over 77 is about 6.6, so the numbers agree with each other, good. I like
that it tells me which file and when it ran -- that's methods-section stuff. But hang on, the list on
the left just changed: now there are 'Clique communities', 'Transitivity', 'Local clustering' rows
that weren't there before, and the bottom bar jumped to a Louvain tab. Did clicking Density run more
things? I don't like a list that rearranges itself under me. Anyway -- now, what facts are stored
per character. Left rail has 'Data'."

## Step 6 -- Data section

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data"

What I saw: Sources: miserables.gexf, 77 nodes, 254 edges; edges "Weight: value, a higher value is a
stronger tie". Attributes: Nodes -- In use (2): label, group; Other attributes: betweenness, degree;
Edges: value; Results: Louvain, PageRank. Right panel Summary: 77 nodes, 254 edges each a distinct
pair, Undirected, Density 0.0868, Connected components 1, Average degree 6.60, Highest degree 36,
and a degree distribution plot.

Think-aloud: "This is the page I actually wanted first. Everything on one panel: 77, 254,
undirected, one component. And the attributes split into what came in the file and 'Results' --
Louvain and PageRank are the program's. But are betweenness and degree from the file or did it
compute them? They have the same little stack icon as the Results. Let me click degree."

## Step 7 -- degree attribute

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --click "degree"

What I saw: "degree -- Node attribute, From miserables.gexf (imported, not computed), On 77 nodes,
Fill 100%: 77 of 77 nodes have a value, Range 1 to 36, Median 6."

Think-aloud: "'Imported, not computed.' Good, that's exactly the sentence I wanted. And 77 of 77
have a value -- that's the count I never get in Cytoscape after a table import. So the file gives
each character a label, a group, a degree and a betweenness; each connection has a value. Though
it's odd that the file already carries a degree column AND the table shows 'Degree (full graph)'
as a separate column -- two degrees. I'd have to check they're the same before I trusted either."

## Answers I came away with

- 77 characters (nodes).
- 254 connections (edges), undirected, each a distinct pair, weighted by "value".
- Yes, everyone can reach everyone: 1 connected component, 0 isolated nodes.
- Facts recorded per character in the file: label, group, degree, betweenness. Per connection:
  value. The program added Louvain groups and PageRank on top.

## Verdict

Succeeded? Yes, I think so. The Data page had all four answers once I found it; I found the
component count first by luck through the Density row.

Single Ease Question: 5 of 7. Not hard, but the opening screen is crowded with somebody else's
analysis (PageRank coloring, Louvain, shortest paths, a watchlist) and none of it was what I asked.
The summary I wanted -- nodes, edges, components -- was two clicks away under "Data" in the left
rail, not on the main view. And the left list rearranging itself when I clicked Density made me
wonder what I'd triggered.

Would I use it instead of Cytoscape? For a first look at a network, maybe -- "77 of 77 have a
value" and "imported, not computed" are things Cytoscape never tells me, and the file-and-date line
is the start of a methods paragraph. But this was a ready-made file. My real start is a list of gene
symbols and a DESeq2 table, and nothing here showed me a STRING query, a confidence cutoff or
clustering I can cite. So: possibly for exploring, but the paper figure and the protocol stay in
Cytoscape until I see it handle my genes and someone tells me how to cite it.
