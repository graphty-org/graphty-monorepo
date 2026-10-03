# Session: find the circles of characters in Les Miserables

Participant: Joaquin, a computational biologist who works on the Gene Ontology in Cytoscape
(EnrichmentMap, ClueGO, BiNGO), GOATOOLS and R. Advanced with ontologies, intermediate with graph
tools. First time in this program.

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program pick out the circles of characters who keep turning up together. Tell us
how many circles it came up with, how big the largest one is, and which character is at its
center."

All commands were run from `design/ui/prototype`. `$D` stands for
`/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t08--gene-ontology-cytoscape-user`.

## Step 1 -- start screen (shots/tasks/r8-t08/01.png)

> A start page. Open project, new from data, and a list of samples on the right. Les Miserables
> is the first one, 77 characters, "Good for a first look at communities". Fine, that is the one.
> There is a usage-data banner at the bottom; I say no to those by reflex.

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t08 --click "No thanks" --click "Les Miserables"

> Okay, it did not open empty. The left list already has PageRank, Louvain "6 groups", shortest
> paths, a folder "For the report"... The description did say "opens with worked examples". So
> somebody already ran Louvain. Louvain I know -- it is what clusterMaker gives you in Cytoscape
> for community detection. That is exactly "circles who turn up together".
>
> But the picture is all orange, colored by PageRank, not by the groups. The right panel even says
> PageRank "Covers Louvain for Color". So the clusters exist but I cannot see them on the graph.
> In Cytoscape I would expect the cluster column to drive the fill. Not a dealbreaker; let me
> look at the Louvain row.

## Step 3 -- click Louvain

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain"

(The tool noted that "Louvain" matched both a tab at the bottom and the row in the left list, and
clicked the tab.)

> A table opened at the bottom: "6 communities", sorted by size. Community 1: 25, Community 2: 17,
> then 10, 10, 9, 6. That adds up to 77, good, every character is in one. Density, edges inside,
> edges leaving -- that is a sensible cluster table, nicer than what clusterMaker leaves me with.
> So: six circles, the largest has 25. Now who is at its center.

## Step 4 -- click Community 1

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain" --click "Community 1"

> The right panel switched to Community 1: Size 25 nodes, Hub "Gavroche, 16 links inside". So the
> program calls the center the hub, by links inside the group. That is a reasonable definition --
> intra-cluster degree. I would have liked to be told it is degree and not, say, closeness, but
> "16 links inside" tells me enough.
>
> Two things bother me. The left list expanded the six communities, good. But the node table
> underneath still shows the whole graph, and it has a column called "group" with values 2, 8, 4
> and colored dots -- orange for 2, blue for 8. Community 1 is also orange. Is Valjean's "group
> 2" the same as Community 1? I do not think so; "group" must be a column that came with the
> file. Two different groupings with the same color dots is the kind of thing that makes a figure
> wrong. And the graph is still all PageRank orange, so I cannot check by eye that Gavroche sits
> in the middle of the orange cluster.
>
> Also the members panel says "Louvain ranks no members. Show in table". Let me see the members.

## Step 5 -- Show in table

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain" --click "Community 1" --click "Show in table"

> Hm. That did not give me the 25 members. The right panel went back to the whole graph summary
> (77 nodes, 254 edges) and the table is still all 77 nodes sorted by degree. Maybe it put them
> in the table somewhere and I am not seeing it, but as far as I can tell the click lost my
> selection. I will trust the Hub line.

## Step 6 -- did the program actually do it, or the sample author?

The task says to have the program pick out the circles. These were already there when I opened
it, so I want to see that I can run it myself.

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t08 --click "No thanks" --click "Les Miserables" --hover "Analyze"

> The flask in the bottom toolbar is "Analyze", Shift+A.

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze"

> A search box "Search, or say what to find" and a Recent list: Louvain, "Last run: Resolution
> 1.0, weight value". Good -- it tells me the parameters of the run that made the six groups. That
> is the provenance I always want and rarely get.

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Last run: Resolution 1.0, weight value"

> Louvain settings: weight is the loaded "value" column, higher means stronger, all 254 edges
> have a weight, resolution 1.0, "Under a second". Two buttons: "Run as copy" and "Update Louvain
> row". I do not want to overwrite the existing result, so Run as copy.

    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Last run: Resolution 1.0, weight value" --click "Run as copy"

> It says it "Would add Louvain as a copy at the top of the list, running". Nothing new appeared
> on screen yet. Same settings, so it should give the same six; Louvain has a random element, so
> it could differ a little, but I will go with the existing run.

## Answer

- Number of circles: 6 (Louvain, resolution 1.0, weighted by the co-appearance value).
- Largest circle: 25 characters (Community 1).
- At its center: Gavroche, with 16 links inside that circle.

## Debrief

**Did I succeed?** I think so, about 80 percent sure. The numbers came straight from the
program's own table. What keeps me from full confidence: I never saw the groups on the graph,
since everything stayed colored by PageRank, and "Show in table" did not show me the 25 members,
so I could not check that Gavroche is really in the big group rather than taking the panel's word.
I also did not get to see my own rerun finish.

**Single Ease Question (1-7):** 5. Finding the numbers was quick once I clicked Louvain. Points
off for the picture not showing the clusters, the file's own "group" column using the same colored
dots as the communities, and the members link that went nowhere useful.

**Would I use this instead of my current tool?** Not instead of Cytoscape, not yet. For this kind
of job -- run a clustering, read sizes, find the hub -- it is smoother than clusterMaker: the
community table with density and edges leaving is right there, and the Analyze list tells me the
exact settings of the last run, which I value. But my work is the GO DAG with typed relations
laid out top-down, and nothing here tells me it can do that. I might use it for a quick look at a
small network.

## Problems noticed

1. The graph stays colored by PageRank after Louvain is the thing being looked at; the communities
   cannot be seen on the network. ("Covers Louvain for Color")
2. The node table's "group" column (from the file) uses the same colored dots as Louvain's
   communities, and orange means "group 2" in one and "Community 1" in the other. Easy to confuse
   two groupings.
3. "Show in table" under a community's Members did not show that community's members; it seemed to
   drop the selection back to the whole graph.
4. Clicking "Louvain" is ambiguous: the bottom tab and the left-list row have the same name.
5. "Hub" is not defined beyond "16 links inside"; fine for me, but it does not say it is degree
   within the group.
