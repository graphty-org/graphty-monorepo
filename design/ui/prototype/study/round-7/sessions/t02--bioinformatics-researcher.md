# Session: which five characters matter most to the whole story -- Dr. Chen (computational biologist)

Task as given: "Someone on your team already worked on this project. Work out which five characters
their work says matter most to the whole story, in order, and how the drawing shows it."

Start screen: shots/tasks/t02/01.png. Renders: tmp/round-7-sessions/t02--bioinformatics-researcher/.
Every command was run from design/ui/prototype.

## Step 0 -- the start screen

Think-aloud: "Matter most to the whole story" is a centrality question. On the left there's a
PageRank row with a brown gradient. The legend says "Color: PageRank 0.0033 to 0.0754, Size:
Degree". Valjean is the darkest and biggest node. I'm not reading a ranking off a color ramp, though.
I want a list.

## Step 1 -- click the PageRank row

    timeout 120 node app-b/study.mjs --try .../01.png task:t02 --click "PageRank"

Seen: the inspector says "PageRank, Measure from Analyze, Paints 77 nodes (every node with a
value), Fill Color Orange to brown". There's also a Betweenness row in "For the report" with a
crossed-out eye, so it is hidden.

Think-aloud: Fine. Color is PageRank and size is degree. Now where are the numbers?

## Step 2 -- try "Data"

    timeout 120 node app-b/study.mjs --try .../02.png task:t02 --click "PageRank" --click "Data"

Seen: I meant the Data tab next to Style on the PageRank panel. It took me to the left-rail Data
section and a graph summary instead: 77 nodes, 254 edges, undirected, weight "value, stronger",
one component, highest degree 36. Results listed: Louvain, PageRank.

Think-aloud: Not what I clicked for. Two controls on screen are both called "Data". The summary
is useful, though: the counts are stated and the graph is weighted.

## Step 3 -- open the table

    timeout 120 node app-b/study.mjs --try .../03.png task:t02 --click "PageRank" --click "Table"

Seen: the node table, sorted by "Degree (full graph)". Columns: PageRank (full graph), Rank by
PageRank, Betweenness (full graph). A summary line says "Valjean is first on all three measures;
Gavroche is in the top 3 on all three". Visible rows: Valjean rank 1, Gavroche 3, Marius 4,
Javert 5, Thenardier 6.

Think-aloud: Rank 2 is missing from the top rows, so someone with low degree ranks high on
PageRank. That's the classic leaf-hub effect. I'll sort by rank.

## Step 4 -- sort by PageRank rank

    timeout 120 node app-b/study.mjs --try .../04.png task:t02 --click "PageRank" --click "Table" --click "Rank by PageRank"

Seen: Valjean 1 (0.0754, degree 36), Myriel 2 (0.0428, degree 10), Gavroche 3 (0.0358),
Marius 4 (0.0309), Javert 5 (0.0303).

Think-aloud: Myriel second, as I guessed. But "their work" also includes a hidden betweenness, and
the table talks about three measures. Which one did they mean for "the whole story"? There are
four notes. I'll read them.

## Step 5 -- read the notes

    timeout 120 node app-b/study.mjs --try .../05.png task:t02 --click "Notes"

Seen, among others: "Javert follows Valjean through the whole book. Check whether PageRank ranks
them side by side." It cites PageRank and is marked "Earlier run", with "Keeps the earlier run and
its value". Another note: "Highest betweenness in the book, 0.57. Next is Myriel at 0.177", which
cites Betweenness.

Think-aloud: So their "whole book" measure is PageRank, and it's the one painted on the drawing.
Betweenness is the bottleneck reading, and they hid it. But "Earlier run" worries me. Is the
PageRank on screen the run this note was written about?

## Step 6 -- click "Earlier run"

    timeout 120 node app-b/study.mjs --try .../06.png task:t02 --click "Notes" --click "Earlier run"

Seen: the PageRank inspector, Data tab. It shows a histogram (77 of 77 have a value, median
0.0124) and a Top 10: Valjean 0.0754, Myriel 0.0428, Gavroche 0.0358, Marius 0.0309, Javert 0.0303,
Thenardier, Fantine, Enjolras, Cosette, Mme.Thenardier. "Made with: Settings Defaults, Ran Sep 28,
on the CPU, Writes pagerank". Notes: "No notes."

Think-aloud: The numbers agree with the table, so I'll accept them. Three complaints. "Earlier run"
didn't tell me whether this is the earlier run or the current one, or whether the two differ. It
just opened the measure. "Defaults" doesn't say whether the edge weight "value" was used, or what
damping factor was used, and a reviewer would ask both. And this panel says "No notes" while a note
right beside it cites PageRank. That's a count I can't reconcile.

## Answer

The teammate's measure is PageRank on the full graph, weighted or not (unstated). The top five:

1. Valjean (0.0754)
2. Myriel (0.0428)
3. Gavroche (0.0358)
4. Marius (0.0309)
5. Javert (0.0303)

How the drawing shows it: node color is PageRank, from light orange to dark brown (0.0033 to
0.0754). Node size is degree, on a square-root area scale from 1 to 36. Valjean is both darkest and
biggest. Myriel is dark but only mid-sized, because his rank comes from his many one-off neighbors,
not from a high degree.

## Debrief

- Succeeded? Yes, I think so. The table and the Top 10 agree, and a note ties PageRank to "the
  whole book".
- Single Ease Question: 5 of 7. The table with a rank column and the Top 10 are good. I lost a
  step on the two controls called "Data". The "Earlier run" link and the "No notes" both left me
  unsure.
- Would I use this instead of my current tool? Not instead of igraph. A Top 10 with "Made with"
  is better than what cytoHubba gives me. But "Defaults" isn't a method. I need weighted yes/no,
  damping and a version stated, and I haven't seen an export of the node table to TSV or a way to
  script it. As a viewer next to R, maybe.
