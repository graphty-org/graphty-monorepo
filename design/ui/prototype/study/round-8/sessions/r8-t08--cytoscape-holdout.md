# Session: finding the circles of characters -- Renata, the Cytoscape holdout

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program pick out the circles of characters who keep turning up together. Tell us
how many circles it came up with, how big the largest one is, and which character is at its
center."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t08--cytoscape-holdout/.

## Step 1 -- start screen (shots/tasks/r8-t08/01.png)

"Start, Recent, Samples. Fine. A usage-data box over the bottom -- no, thank you. 'Files are read
on this computer and never uploaded.' Good, that's the first thing I'd ask. Les Miserables, 77
characters, 'opens with worked examples ... groups already added.' So somebody already clustered
it. I'm going to want to run it myself anyway, I don't trust a result I didn't make."

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t08--cytoscape-holdout/02.png task:r8-t08 --click "No thanks" --click "Les Miserables"

"That's a busy left panel. PageRank, Louvain 6 groups, Shortest paths, Density, Top 9, Watchlist,
'For the report' with Group 2 and Group 8. So this list is my Control Panel and my Style list in
one? Everything is orange, the legend says 'Color: PageRank'. Louvain is already here with 6
groups -- that's clusterMaker2's GLay, more or less. But I can't see the clusters on the canvas,
they're all the same orange."

## Step 3 -- click Louvain (hit the bottom tab by accident)

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t08--cytoscape-holdout/03.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain"

"Oh, that opened a table at the bottom: '6 communities', Community 1 size 25, density 0.147,
edges inside 44, edges leaving 49. Then 17, 10, 10, 9, 6. That's a cluster table, I like that
more than clusterMaker's output, which just dumps a __glayCluster column on the Node Table. But
there's no 'center' column here."

## Step 4 -- click the Louvain row in the left list

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t08--cytoscape-holdout/04.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain, 1 note"

"Right panel: 'Louvain, Run from Louvain, Sep 28', 'Paints 77 nodes', 'Covered by PageRank for
Color on 77 of 77'. So the Louvain coloring is there, but PageRank sits on top and wins. So a
layer is a Style? Or a mapping? It's a mapping that can be buried under another mapping. In
Cytoscape one Style, one mapping per property, done. I see why you'd stack them but nobody told me
the order wins."

## Step 5 -- try to open the row's children

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t08--cytoscape-holdout/05.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain, 1 note" --click "Expand"

Result: nothing on screen is called "Expand".

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t08--cytoscape-holdout/06.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain, 1 note" --click "6 groups"

"Clicking '6 groups' did nothing. There's a little arrow at the left edge, I assume it opens, but
I'm not going to hunt for it."

## Step 6 -- look for the data side

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t08--cytoscape-holdout/07.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain, 1 note" --click "Data"

(Meant the Data tab on the right; got the Data section on the left rail.)

"Well, this is useful anyway. Source miserables.gexf, 77 nodes, 254 edges, edge weight 'value,
higher is a stronger tie'. Attributes with types: label Abc, group Abc, betweenness #, degree #,
and Results: Louvain Abc, PageRank #. That's the closest thing to an import summary I've seen in a
browser tool. Note there's a 'group' column from the file AND a Louvain result. I'll have to keep
those straight."

## Step 7 -- run it myself

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t08--cytoscape-holdout/08.png task:r8-t08 --click "No thanks" --click "Les Miserables" --hover "Analyze"
    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t08--cytoscape-holdout/09.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze"

"The flask is 'Analyze, Shift+A'. A searchable list: Recent -- Louvain 'Resolution 1.0, weight
value', PageRank, Shortest path; then Rank nodes and edges. OK, this is my Tools menu."

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t08--cytoscape-holdout/10.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Louvain Last run: Resolution 1.0, weight value"

"Parameter panel. Weight: value (loaded weight). Higher means Stronger / Farther / Capacity, with
a sentence each -- that's actually the question students always get wrong in clusterMaker, whether
the edge attribute is a similarity or a distance. 'All 254 edges have value set; none is left
out.' Good, tell me that. Resolution 1.0. Two buttons: 'Run as copy' and 'Update Louvain row'. I
never overwrite a worked example -- same rule as never editing Default. Copy."

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t08--cytoscape-holdout/11.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Louvain Last run: Resolution 1.0, weight value" --click "Run as copy"

"'Would add Louvain as a copy at the top of the list, running.' Would? It didn't actually do it.
Fine -- same settings as the existing row, so the existing row is what I'd get. Louvain isn't
deterministic, mind you; I'd want a seed before I believed two runs match. I'll read the one that's
there."

## Step 8 -- find the largest community and its center

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t08--cytoscape-holdout/12.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain" --click "Community 1"

"Now the left list opened: Community 1 25 nodes, then 17, 10, 10, 9, 6. Right panel for Community
1: Size 25 nodes, Hub 'Gavroche, 16 links inside', 'Compare with the rest'. So the center is
Gavroche -- by links inside the group, which is what I'd mean by center too, intra-cluster degree.
I half expected Valjean, he's degree 36 overall. That's worth checking. And underneath, the Node
Table has a 'group' column -- Valjean 2, Gavroche 8 -- which is the file's group, not Louvain's. Two
columns that both mean 'cluster' is going to trip every student in my workshop."

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t08--cytoscape-holdout/13.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain" --click "Community 1" --click "Show in table"

"'Louvain ranks no members. Show in table.' I clicked it and got... the whole Node Table, 77
rows, sorted by degree, and Community 1 is deselected. It didn't filter to the 25. And I can't see
a Louvain column in the visible columns. So I can't verify Gavroche from the table. I'll take the
Hub line at its word, with an asterisk. In Cytoscape I'd select the cluster, make a subnetwork,
and sort the Node Table by Degree. Here I can't get the 25 rows."

## Answer

- Circles found: 6 (Louvain, resolution 1.0, weighted by co-appearance count).
- Largest: 25 characters (Community 1).
- Center: Gavroche, with 16 links inside the group.

## Verdict

Succeeded? "Yes, I think so. The numbers are right there. But I didn't run it -- the sample came
with it, and my own run didn't happen. And I couldn't check the hub against the members' rows."

Single Ease Question: 5 of 7.

Would I use this instead of Cytoscape? "Not for client work. The Analyze panel is better than
clusterMaker's dialog -- it tells me what the weight means and whether any edges were left out --
and the community table with size, density and edges leaving is something I'd otherwise build by
hand. But the colors are buried under PageRank without telling me why until I clicked into it,
'Show in table' doesn't show me the members, and there's a file 'group' column next to the
Louvain result that means something different. For the workshop's first hour, maybe."

## Problems noted

1. The sample opens with every node one color (PageRank) while Louvain is listed as 6 groups; the
   clusters are invisible on the canvas until you learn that PageRank sits above and covers it.
2. "Run as copy" did not produce a result; no run of my own happened.
3. "Show in table" from a community did not filter the table to its members, and dropped the
   community selection; I could not verify the hub.
4. The file's "group" column sits next to the Louvain result in the Node Table and both read as
   "cluster"; nothing distinguishes them in the table header.
5. The Louvain row would not expand by clicking its name or its count; only the bottom "Louvain"
   tab opened the groups, by accident.
6. No word on Louvain's randomness (seed) when re-running with the "same" settings.
