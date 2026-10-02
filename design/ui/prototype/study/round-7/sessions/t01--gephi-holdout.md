# Session: t01, the Gephi holdout (Dr. Mara Lindqvist)

Task as given: "A colleague handed you this network and you are about to build on it. Before you
trust anything in it, work out what you actually have: how many characters and connections,
whether it all hangs together as one piece, and whether anything about how it came in looks
wrong."

All commands were run from `design/ui/prototype`, with
`D=tmp/round-7-sessions/t01--gephi-holdout`.

## Start screen (shots/tasks/t01/01.png)

"Somebody has already painted this. PageRank on color, degree on size, Louvain, shortest paths,
a 'Watchlist', a folder 'For the report'. That is my colleague's opinion, not my data. I ignore
all of it. In Gephi I would look at the Context panel top left for the counts, then go to the Data
Lab. I see no counts anywhere on this screen. There is a 'Data' item on the left rail. That is the
nearest thing to a Data Laboratory. There is also a 'Table' at the bottom. I'll try both."

## Step 1: Data on the left rail

    timeout 120 node app-b/study.mjs --try $D/01.png task:t01 --click "Data"

"Right. Now the right panel has a Summary: 77 nodes, 254 edges, undirected, density 0.0868,
connected components 1, average degree 6.6, highest degree 36. That is the Les Mis graph I teach
with: 77 and 254, Valjean at 36. Density checks out: 254 over 77 times 76 over 2 is 0.0868.
Average degree 508 over 77 is 6.6. One component, so it hangs together. Good, that took one click.

The left side says 'Sources: miserables.gexf, 77 nodes, 254 edges'. Attributes: label, group,
degree on nodes, 'value' on edges, plus 'Results' Louvain and PageRank, and 'betweenness' listed
under 'Other attributes', not under Results. Was betweenness in the file or computed by my
colleague? I can't tell from here. 'nodes: node . 77 nodes' and 'edges . 254 rows, 254 edges' is
odd shorthand, but 254 rows and 254 edges means nothing was merged or dropped.

Weight says 'value, stronger'. So it thinks edges are weighted by 'value'. I want to see that."

## Step 2: the Table at the bottom

    timeout 120 node app-b/study.mjs --try $D/02.png task:t01 --click "Table"

"Here is a table: 77 nodes, sorted by degree, Valjean 36, Gavroche 22, Marius 19, Javert 17,
Thenardier 16. Those are right. Columns say '(full graph)', which I like -- it tells me what the
statistic ran on. There is a sentence above the table, 'Valjean is first on all three measures',
which I didn't ask for. I'd rather have the columns. Fine, this is my Data Lab, more or less."

## Step 3: how did it come in? The source link

    timeout 120 node app-b/study.mjs --try $D/03.png task:t01 --click "Data" --click "from miserables.gexf"

"This is the import screen. GEXF, auto-detected. Nodes: id as key, label as name, group as an
attribute. 'Match report: nodes -- 77 rows; every id is unique.' Good, that is exactly the check
I'd want. 'group' is typed Abc, text. In my copy it's an integer, but it's a category, so text is
defensible. Direction 'As the file says'."

## Step 4: the "4 more readings not computed" link

    timeout 120 node app-b/study.mjs --try $D/04.png task:t01 --click "Data" --click "4 more readings not computed"

"That threw me back to the Graph tree and opened a menu: select all, invert selection, re-run
layout, reshuffle layout seed, 'Compute the overview', 'Add node...' highlighted, 'Clear graph
data'. Why is 'Add node' highlighted? If I'd pressed Enter I'd have added a node to data I'm
supposed to be checking. And 'Clear graph data' sits in the same menu. I didn't want a menu. I
wanted four numbers."

## Step 5: the weight link

    timeout 120 node app-b/study.mjs --try $D/05.png task:t01 --click "Data" --click "value, stronger"

"Same import screen as step 3, on the nodes table. Not what I clicked for. I clicked the weight,
so show me the edges."

## Step 6: edges in the import screen

    timeout 120 node app-b/study.mjs --try $D/06.png task:t01 --click "Data" --click "from miserables.gexf" --click "edges"

"Edges: source, target, value. 'Match report: edges -- 254 rows; every edge has both ends.' Good,
no dangling ids. Values 1, 8, 10, 6 -- those are the co-appearance counts.

And here is the problem. The top line says 'Weight: none (each edge counts 1)'. The Summary on
the previous screen said 'Weight: value, stronger'. Those cannot both be true. Either the graph
is weighted by 'value' or every edge counts 1. Which one did PageRank and betweenness run with?
Which one will modularity use? In Les Mis it matters: Valjean to Myriel is weight 1 but
Valjean to Cosette is 31. This is exactly the kind of thing I'd ask my colleague about before
building on it. That is the thing that looks wrong about how it came in."

## Step 7: try to click the weight setting

    timeout 120 node app-b/study.mjs --try $D/07.png task:t01 --click "Data" --click "from miserables.gexf" --click "edges" --click "Weight: none (each edge counts 1)"

"Nothing. It's just text. So I can't see where the weight is decided from here. I'm not going to
hunt for it."

## Step 8: compute the remaining readings

    timeout 120 node app-b/study.mjs --try $D/08.png task:t01 --click "Data" --click "4 more readings not computed" --click "Compute the overview"

"OK, after that detour the summary filled in: average clustering 0.573, transitivity 0.499,
diameter 5, degree assortativity -0.165. Those match what NetworkX gives me for this graph:
average_clustering 0.573, transitivity 0.499, diameter 5, assortativity -0.165. Good. But again:
clustering on the weighted or unweighted graph? NetworkX's 0.573 is unweighted. If this is
weighted it would differ, so I assume it is unweighted, which agrees with 'each edge counts 1' and
contradicts 'value, stronger'. The degree chart says '0, degree 0' on the side, which means
nothing to me -- there is no node of degree 0."

## Stopping

"I have what I came for. 77 characters, 254 links, one connected component, 254 rows into 254
edges with no dangling ends and unique ids. The numbers check against NetworkX. What looks wrong:
the app disagrees with itself about whether 'value' is the edge weight. Summary says weighted by
value, the import says no weight. I'd write that down and ask before running anything weighted.
Also 'betweenness' is in the table but I can't tell whether it came from the file or was
computed."

## Verdict

- Succeeded? Yes. Counts, one component, and one real inconsistency found (the weight).
- Single Ease Question: 5 of 7. The counts were one click away under Data, faster than Gephi's
  Context panel plus Data Lab. Lost points for the link that opened a menu with 'Add node...'
  highlighted, the weight link that landed on the nodes table, and a weight reading that
  contradicts itself.
- Would I use this instead of Gephi? Not for this. For a sanity check of a file a colleague sent,
  the Summary and the match reports are genuinely better than what Gephi gives me -- Gephi never
  tells me 'every id is unique' or 'every edge has both ends'. But a tool that tells me two
  different things about the edge weight is a tool whose statistics I'd have to recheck in
  NetworkX anyway. I'd stay on Gephi, and maybe use this to look a file over first.
