# Session: t28-lesmis, Gephi holdout (Dr. Mara Lindqvist)

Task as given: "A colleague emailed you a network of the characters. Bring it into graphty. The
data on screen is a sample: characters of the novel Les Miserables, linked when they appear in the
same chapter. If that is not your line of work, treat them as your own people or things."

All commands run from design/ui/prototype. Renders in
tmp/round-7-sessions/t28-lesmis--gephi-holdout/.

## 01 -- start screen (shots/tasks/t28-lesmis/01.png)

No command; the screen I was given.

"Fine. No splash, no tour, no sign-up. Start, Recent projects, Samples. There is a Les Miserables
sample on the right, but a colleague emailed me a file, so I am not clicking a sample -- I want MY
file. 'Open project or file...' with Ctrl+O. That is File > Open. Also 'or drop a file anywhere in
this window', good, that is what I would have done next. And 'Files are read on this computer and
never uploaded' -- that is the first thing I would ask about a browser tool, so, noted, I will
believe it when I see the network tab."

## 02 -- open the file

    timeout 120 node app-b/study.mjs --try .../02.png task:t28-lesmis --click "Open project or file..."

"No file picker, it just... opened. I assume that stands in for choosing the attachment. Title bar
says Les Miserables. There is a spatialized map, a legend -- Color: PageRank, Size: Degree, with a
scale note, square root of area, 1 to 36. A legend on the canvas. I have been drawing those in
Inkscape for ten years.

But wait. I opened a GEXF and it is already colored by PageRank, there is a Louvain row with 6
groups, shortest paths, a watchlist, a folder 'For the report'. Did the tool run all that on its
own, or did my colleague send a project with their work in it? If the app decided to compute
PageRank and Louvain on import without asking, I want to know with what parameters. The right
panel says 'Measure from Analyze', so somebody ran it. I will assume it is the colleague's
project. Moving on -- what matters is whether the data arrived intact. Where is the Data Lab?
There is a 'Table' at the bottom."

## 03 -- the node table

    timeout 120 node app-b/study.mjs --try .../03.png task:t28-lesmis --click "Open project or file..." --click "Table"

"77 nodes. Correct, that is Les Mis. Sorted by degree, descending: Valjean 36, Gavroche 22, Marius
19, Javert 17, Thenardier 16. Those are the numbers I know from NetworkX. Betweenness for Valjean
0.570 -- normalized, matches nx.betweenness_centrality. And the column headers say '(full graph)'.
Thank you. That is exactly the thing Gephi never tells you. There is a 'group' column with the
original group ids from the file, kept. I can sort columns. This is a Data Lab I can live with."

## 04 -- the edge table

    timeout 120 node app-b/study.mjs --try .../04.png task:t28-lesmis --click "Open project or file..." --click "Table" --click "Edges"

"254 edges. Correct. Source, target, value -- the weights came through: Cosette-Valjean 31,
Marius-Cosette 21. Those are the real co-appearance counts. There is a 'Notes' column with a
comment on Javert-Valjean; that must be the colleague's note. Fine."

## 05 -- the Data section

    timeout 120 node app-b/study.mjs --try .../05.png task:t28-lesmis --click "Open project or file..." --click "Data"

"Sources: miserables.gexf, 77 nodes, 254 edges. Good -- it names the file it read. Right panel:
undirected, weight is 'value', density 0.0868 -- 254 over 2926, correct. Average degree 6.6,
correct. One connected component. A degree distribution, log-log. And under Filters: 'Filters
change what is computed; the eye in the Graph tree only hides.' That is the single sentence I
would put in my handout. In Gephi the filter and the statistic are tangled and the column never
says which run it came from; here it says it in the panel.

Two complaints. First, Attributes splits into 'In use', 'Other attributes' and 'Results', and I
cannot tell which columns were in the GEXF and which the tool or my colleague added. Degree and
betweenness sit next to label and group as if they came from the file. If I am checking that an
import dropped nothing, I want a plain list of what was in the file. Second, '4 more readings not
computed' -- fine, but I would want average path length and modularity score there without
hunting.

It is in. Counts match, weights match, the attributes I expected are there. I am done."

## Verdict

- Succeeded? Yes. The network is open, 77 nodes and 254 edges, the weights and the group
  attribute are intact, and the source file is named.
- Single Ease Question: 6 of 7. One click to open, and the checks I always do (counts, table,
  weights) were each one click away. Not a 7 because opening a plain GEXF landed me in a screen
  full of analysis I did not run, and I had to work out whether the app had done that on its
  own.
- Would I use it instead of Gephi? Not instead. For teaching, maybe: no Java fight, and the
  "(full graph)" label and the filter sentence are things I would actually teach from. For
  research I have not seen ForceAtlas2, its parameters, or the SVG export, and my coauthors send
  .gephi files. A delight earns a second session, not a switch.
