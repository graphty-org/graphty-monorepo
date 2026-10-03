# Session: find the communities in Les Miserables -- Dr. Min-ji Kim, knowledge graph engineer

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program pick out the circles of characters who keep turning up together. Tell us
how many circles it came up with, how big the largest one is, and which character is at its
center."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t08--knowledge-engineer/.

## Step 1 -- start screen (shots/tasks/r8-t08/01.png)

"Start, recent projects, samples. Les Miserables, 77 characters -- fine, I know that one, it is
the Knuth co-appearance set. 77 nodes, 254 edges if I remember right. There is a consent banner
across the bottom. 'Only ever used by the author and his Claude Code sessions' -- odd thing to
put in a product, but at least nothing is collected until I answer. No thanks. And 'Local only'
in the header -- good, that is the first thing I would check with real data."

## Step 2 -- decline the banner, open the sample

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t08 --click "No thanks" --click "Les Miserables"

"It opens with a lot already done. PageRank coloring the nodes, a Louvain row that says 6 groups,
shortest paths, a 'For the report' folder with Group 2 and Group 8. So the answer is already
sitting there. That is fine for a demo, but the task says have the program pick them out, so I
want to see it ran Louvain and with what parameters. At least the method is named -- 'Louvain',
not 'clusters'. That is more than most tools give me."

"Canvas is colored by PageRank, orange to brown. Not by community. So the picture tells me
nothing about the circles yet."

## Step 3 -- open the Louvain row

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain"

"A table at the bottom: 6 communities. Size, density, edges inside, edges leaving. That is the
right table. Sizes 25, 17, 10, 10, 9, 6 -- sums to 77, so every character is in exactly one. Good,
known-answer check passes on node count. Largest is Community 1 with 25. Edges inside plus edges
leaving -- I would want to check those add up against 254 but the leaving edges are counted from
both sides, so I will not try to do that by eye."

## Step 4 -- open Community 1

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain" --click "Community 1"

"Right panel: Size 25 nodes. Hub: Gavroche, 16 links inside. So 'center' here means most links
inside the group -- internal degree. It says which measure, which I appreciate; I would have
asked. 'Made with: all at their defaults.'

"But now the node table below has a column called 'group' with colored swatches. Valjean is
group 2 in orange, Gavroche group 8 in blue, Javert group 4 in green. And Community 1 in the
Louvain list is also orange, Community 2 light blue, Community 3 green. So which is it? Is
'group' the Louvain result, or the group attribute that came in the GEXF file? If Gavroche is
the hub of the orange community, why is his swatch blue? And in the left list there is 'Group 2,
14 nodes' and 'Group 8, 13 nodes' under 'For the report' -- 14 and 13, not 25. Two groupings, the
same palette, similar names. I cannot tell from the screen which is which. That is exactly the
kind of thing that makes me stop trusting the numbers."

## Step 5 -- try to run it myself

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t08 --click "No thanks" --click "Les Miserables" --hover "Analyze"
    (tooltip: "Analyze Shift+A")
    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze"

"The flask is Analyze. A palette: Recent shows 'Louvain -- last run: Resolution 1.0, weight
value'. Good: so the existing row is resolution 1.0, weighted by the co-appearance count. That
answers my 'with what parameters'. The right panel also shows the graph summary: 77 nodes, 254
edges, one connected component, undirected. That matches what I know. Good."

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Louvain"
    (ambiguous, it clicked the bottom tab instead and timed out)
    timeout 120 node app-b/study.mjs --try .../08.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Louvain Which nodes form densely connect"

"The Louvain form. Weight: value (loaded weight). Higher means: Stronger / Farther / Capacity,
each explained in one line. 'All 254 edges have value set; none is left out.' That sentence is
the best thing on the screen -- it tells me nothing was silently dropped. Resolution 1.0. 'Under
a second.' Two buttons: Run as copy, Update Louvain row. I do not want to overwrite the example,
so copy."

    timeout 120 node app-b/study.mjs --try .../09.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Louvain Which nodes form densely connect" --click "Run as copy"

"'Would add Louvain as a copy at the top of the list, running' -- and nothing else happened. It
did not run. Fine, the settings are the same as the existing row's last run, so the existing
6 groups is what I would have got. Louvain is not deterministic across node orders in general,
so I would have liked to see a second run agree, but I will take the stored result."

## Step 6 -- try to list the members of the largest group

    timeout 120 node app-b/study.mjs --try .../10.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain" --click "Community 1" --click "Show in table"

"'Louvain ranks no members. Show in table.' I clicked it expecting the 25 members. I got the
whole 77-node table, sorted by degree, nothing filtered, and the Community 1 selection is gone
from the side panel. So I still cannot see the 25 names, and I still do not know whether the
'group' column is Louvain. I stop here."

## Answer given to the moderator

- Number of circles: 6 (Louvain, resolution 1.0, weighted by co-appearance count).
- Largest: Community 1, 25 characters.
- At its center: Gavroche, with 16 links inside the group (the panel calls him the hub; that is
  internal degree, not PageRank or betweenness).

## Did I succeed?

"Probably. The numbers are consistent: 6 groups, sizes sum to 77, the graph summary matches the
published data set. But I would not sign off on 'Gavroche' without seeing the member list,
because the table shows Gavroche in a blue group 8 while Community 1 is orange, and the report
folder has a 'Group 2' and 'Group 8' with 14 and 13 members. Either that 'group' column is the
original GEXF attribute wearing the Louvain palette, or the hub is wrong. The screen does not
tell me which, and that is the screen's fault, not mine."

## Single Ease Question

5 of 7. Finding the result was quick because it was already there; confirming it was not.

## Would I use this instead of my current tool?

"Not for my work today: there is no Turtle, JSON-LD or SPARQL input anywhere I looked, so for me
this is a CSV tool. For community detection on a property graph, though, this is better than
Gephi's modularity report: it names the algorithm, the resolution, the weight and what the
weight means, and it tells me no edge was left out. If it stopped reusing the community colors
for an unrelated attribute and 'Show in table' actually filtered to the members, I would trust
its numbers."

## Problems noted

1. The node table's "group" column (Valjean 2 orange, Gavroche 8 blue, Javert 4 green) uses the
   same swatch colors as Louvain Community 1, 2, 3, and the left list holds "Group 2, 14 nodes"
   and "Group 8, 13 nodes" next to "Community 1, 25 nodes". Two groupings look like one. The hub
   of the orange community appears with a blue swatch. (Severity: high, it undermines the
   answer.)
2. "Show in table" on Community 1 did not filter the table to its 25 members; it showed all 77
   and dropped the community selection. (Severity: high for this task.)
3. "Run as copy" only showed a "would add" message; nothing ran. (Prototype limit, but in the
   real thing I would want proof the rerun matches.)
4. The canvas stays colored by PageRank after opening Louvain; I never saw the circles on the
   picture itself.
5. The word "Louvain" names a list row, a bottom tab, a recent item and a menu item at once.
