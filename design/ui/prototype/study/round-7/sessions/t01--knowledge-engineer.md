# Session: inventory a handed-over network -- knowledge engineer (Dr. Min-ji Kim)

Task as given by the moderator: "A colleague handed you this network and you are about to build on
it. Before you trust anything in it, work out what you actually have: how many characters and
connections, whether it all hangs together as one piece, and whether anything about how it came in
looks wrong."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t01--knowledge-engineer/.

## Step 0 -- start screen (shots/tasks/t01/01.png)

Think-aloud: "Someone else's graph, colored by PageRank, with a stack of layers I did not ask for.
The only count on screen is 'Paints 77 nodes (every node with a value)', which is a statement about
a style, not an inventory. Nothing says edges. Where is the import report? 'Data' in the left rail
is my best guess."

## Step 1 -- Data

    timeout 120 node app-b/study.mjs --try .../01.png task:t01 --click "Data"

Seen: the left panel lists Sources (miserables.gexf, "77 nodes, 254 edges"; nodes table 77 nodes;
edges table "254 rows, 254 edges"), Filters (none), Attributes. The right panel's Data tab shows a
Summary: Nodes 77, Edges 254, Direction Undirected, Weight "value, stronger", Density 0.0868,
Connected components 1, Average degree 6.6, Highest degree 36, "4 more readings not computed", and
a degree distribution.

Think-aloud: "Now we are talking. The counts are labeled as nodes and edges, not 'items'. 77 and
254 is the published count for this dataset, so the known-answer check passes. 254 edge rows in,
254 edges out, so nothing was silently de-duplicated. That '254 rows, 254 edges' line is exactly
the kind of sentence I want from an importer. One component, so it does hang together. Now I want
to know how it came in."

## Step 2 -- the source link

    timeout 120 node app-b/study.mjs --try .../02.png task:t01 --click "Data" --click "from miserables.gexf"

Seen: "Edit: miserables.gexf", the import mapping reopened. Format GEXF (auto). id is the key,
label is the Name (auto), group is an attribute typed as text. "Match report: nodes -- 77 rows;
every id is unique." Direction "As the file says". Apply is off, "Nothing has changed yet".

Think-aloud: "Good: it tells me which column is the key, that the format was sniffed, and that
nothing changes unless I press Apply. 'group' is typed as text although the values are integers;
for a community id that is defensible. Edges next, because that is where imports break."

## Step 3 -- edges table

    timeout 120 node app-b/study.mjs --try .../03.png task:t01 --click "Data" --click "from miserables.gexf" --click "edges"

Seen: source "From -> node", target "To -> node", value numeric attribute (1, 8, 10, 6, ...).
"Match report: edges -- 254 rows; every edge has both ends." Header: "Weight: none (each edge
counts 1)".

Think-aloud: "No dangling endpoints, good. But the header says Weight: none. The summary I just
read said Weight: value, stronger. Those cannot both be true. 'value' is the co-appearance count,
and whether it is a weight changes every weighted measure on this graph. That is exactly the kind
of thing I was asked to look for, and I cannot tell which screen is right."

## Step 4 -- the summary's weight link

    timeout 120 node app-b/study.mjs --try .../04.png task:t01 --click "Data" --click "value, stronger"

Seen: the same import editor, opened on the nodes table, not on the weight setting.

Think-aloud: "The link says 'value' and takes me to a nodes table. The edges table it should have
opened says there is no weight. So the summary's claim and the import screen disagree, and the
link between them does not explain it. That is one unexplained mismatch. Another one and I would
stop trusting the numbers."

## Step 5 -- "4 more readings not computed"

    timeout 120 node app-b/study.mjs --try .../05.png task:t01 --click "Data" --click "4 more readings not computed"

Seen: the left side jumped back to Graph, and the graph's "..." menu opened with "Add node..."
highlighted. The menu also has "Compute the overview".

Think-aloud: "That is not what the link said it would do. I clicked a reading, the side panel
changed section on me, and an editing command is pre-selected. One Enter and I have added a node to
a colleague's graph. I'll take 'Compute the overview', since that seems to be what was meant."

## Step 6 -- Compute the overview

    timeout 120 node app-b/study.mjs --try .../06.png task:t01 --click "Data" --click "4 more readings not computed" --click "Compute the overview"

Seen: the Summary now also shows Average clustering 0.573, Transitivity 0.499, Diameter 5, Degree
assortativity -0.165, and the degree distribution with "0 / degree 0" beside it.

Think-aloud: "Those agree with what I remember for this graph, and density 0.0868 equals
254 / (77*76/2), so density is unweighted. I can check that by hand, which I like. The '0 / degree
0' probably means no isolated nodes, and that fits one component and a minimum degree of 1, but it
should say 'isolated nodes: 0' in words. There is no explicit line for self-loops or parallel
edges; '254 rows, 254 edges' implies none were merged, but I am inferring it. I am done."

## Verdict

- Succeeded? Mostly. What I have: 77 characters, 254 co-appearance links, undirected, one
  connected component, no dangling endpoints, unique ids, nothing merged on import. What looks
  wrong: the summary says the edges are weighted by 'value', and the import mapping says there is
  no weight, and I could not find out which is true. I would raise that with my colleague before
  building anything on it.
- Single Ease Question: 5 of 7. The counts and the match reports were easy to find and worded the
  way I want. Losing a point for the weight contradiction and another for the overview link that
  switched panels and pre-selected "Add node...".
- Would I use it instead of my current tool? Not for my knowledge graph: it reads GEXF, not
  Turtle or a SPARQL result, so it is not for RDF. For a quick sanity check on a property-graph
  file a colleague sends me, yes, I would use the Data summary and match reports instead of
  loading it into a notebook -- if it stopped contradicting itself about the weight. One
  unexplained mismatch is tolerable once. Two and I go back to pandas.

## Problems seen

1. The weight is reported two ways. The Data summary says "Weight: value, stronger"; the import
   editor's edges table says "Weight: none (each edge counts 1)". Nothing explains the difference.
2. The summary's "value, stronger" link opens the import editor on the nodes table, not on the
   edges table or the weight setting.
3. "4 more readings not computed" switches the left panel from Data to Graph and opens a menu
   with "Add node..." pre-highlighted, instead of computing the readings.
4. Isolated nodes, self-loops and parallel edges have no labeled line in the summary. "0 / degree
   0" beside the chart is ambiguous.
5. On the start screen the only count is a style statement ("Paints 77 nodes"), and edges are not
   counted anywhere until you open Data.

## What worked

- Labeled node and edge counts, plus "254 rows, 254 edges" on the source, which proves no silent
  de-duplication.
- Match reports in plain sentences: "every id is unique", "every edge has both ends".
- The import editor shows the detected format, the key column and "Apply is off: Nothing has
  changed yet", so looking cannot change the data.
- The overview's readings are checkable by hand (density matched exactly).
