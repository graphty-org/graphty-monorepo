# Session: communities and asking for fewer, larger ones -- Dr. Chen (computational biologist)

Task as given by the moderator: "How many circles of characters does the story fall into, how big
is each one, and what is the biggest one like? Then ask for fewer, larger circles and see what that
would take. The data on screen is a sample: characters of the novel Les Miserables, linked when
they appear in the same chapter. If that is not your line of work, treat them as your own people
or things."

Start screen: shots/tasks/t03/01.png. Every command was run from design/ui/prototype; renders are in
tmp/round-7-sessions/t03--bioinformatics-researcher/.

## Step 0 -- start screen

Think-aloud: "Network colored by PageRank, sized by degree. On the left, a list with a row 'Louvain
-- 6 groups'. That's my clustering, already run. I'll treat these as genes and 'circles' as modules."

## Step 1 -- click the Louvain row (01.png)

    timeout 120 node app-b/study.mjs --try .../01.png task:t03 --click "Louvain"

Saw: a table at the bottom, "6 communities", with size, density, edges inside and edges leaving.
Sizes 25, 17, 10, 10, 9, 6.

Think-aloud: "25+17+10+10+9+6 = 77, which matches 'Paints 77 nodes' on the right, so nothing was
dropped. Good. Community 1 is the biggest at 25, density 0.147, 44 edges inside and 49 leaving. More
edges leaving than staying is a weak module, and I'd flag it. There's no modularity and no resolution
on this table, and the network is still painted by PageRank, not by community, so I can't see the
modules in the picture."

## Step 2 -- click Community 1 (02.png)

    ... --click "Louvain" --click "Community 1"

Saw: the right panel shows Community 1, "Paints 25 nodes, Covered for Color by PageRank". The bottom
table switched to "77 nodes", the whole graph, not the 25 members. Its "group" column holds 2, 8, 4,
which are not the Louvain numbers.

Think-aloud: "So the community colors exist but are buried under PageRank. That explains the all-orange
picture, but I'd have expected the community colors to show when I pick a community. Clicking a module
should give me its member list. Instead I got all 77 rows plus a 'group' column that isn't Louvain.
Two different 'groups' in one view is exactly how a student puts the wrong column in a supplementary
table."

## Step 3 -- click "Data" hoping for the member list (03.png)

    ... --click "Louvain" --click "Community 1" --click "Data"

Saw: the left rail's Data section opened instead of the panel tab. Graph summary: 77 nodes, 254 edges,
undirected, weight "value", density 0.0868, 1 connected component.

Think-aloud: "Wrong 'Data'. There are two controls with the same name. The summary is good, though.
That's the methods-section line I always have to dig for in Cytoscape."

## Step 4 -- click "from Louvain" on the Community 1 panel (04.png)

    ... --click "Louvain" --click "Community 1" --click "from Louvain"

Saw: the Louvain run panel. "6 communities and no unconnected nodes", modularity 0.565 ("Strong
grouping..."), a size bar chart (25 down to 6), and each community's hub with links inside: Community 1
hub Gavroche (16 links inside), Community 2 Valjean (15), 3 Myriel, 4 Fantine, 5 Thenardier,
6 Gillenormand. "Made with": Louvain, weight = loaded weight (value), seed 7.

Think-aloud: "This is the panel I wanted. Modularity, a seed, the weight column it used. I could
defend this to a reviewer. Answer to part one: six groups of 25, 17, 10, 10, 9 and 6; the biggest is
the Gavroche group, 25 members, loose (density 0.147, slightly more edges out than in). I still never
got its 25 names as a list I could copy."

## Step 5 -- All options... (05.png)

    ... --click "from Louvain" --click "All options..."

Saw: "Louvain options" with Method, Weight, Higher weight, Seed 7, Resolution 1.0, Level "Final, most
merged", Stop after, Scope "Full graph", Direction, Max iterations 100, Tolerance 0.000001, Optimized.

Think-aloud: "Full parameter set. Good. For fewer, larger modules you lower resolution below 1. Level
is already 'most merged', so resolution is the only knob left. Nothing on screen says which direction
gives bigger groups. I know it; my PhD student would not."

## Step 6 -- click "Resolution" (06.png)

    ... --click "All options..." --click "Resolution"

Saw: no change.

## Step 7 -- click the "1.0" box (07.png)

    ... --click "All options..." --click "1.0"

Saw: the options box closed. A banner appeared: "Settings changed since the run", with Rerun and Revert.

Think-aloud: "I didn't type anything. What did it change resolution to? It doesn't say."

## Step 8 -- Rerun (08.png)

    ... --click "1.0" --click "Rerun"

Saw: "Rerunning, cannot be stopped", progress bar. Still 6 communities, modularity 0.565.

Think-aloud: "77 nodes. Louvain on 77 nodes is instant in igraph. Why is there a progress bar, and why
can't I stop it?"

## Step 9 -- wait (09.png)

    ... --click "Rerun" --hover "Modularity" --hover "Communities"

Saw: same. Still rerunning, still the old result.

## Step 10 -- reopen options to check the value (10.png)

    ... --click "1.0" --click "All options..."

Saw: the options again, Resolution still 1.0. The "Settings changed" banner had gone.

Think-aloud: "Now I can't reconcile anything. It said settings changed, the value still reads 1.0,
and the banner disappeared. I don't know what I'd be rerunning."

## Step 11 -- click the "6" next to Communities (11.png)

    ... --click "from Louvain" --click "6"

Saw: the Louvain Style tab ("Paints 77 nodes", a color palette "Eight dis..."), table back to all
77 nodes.

Think-aloud: "Not what I wanted. I'm stopping. I'd do this in igraph: cluster_louvain(g,
resolution = 0.5), table(membership(...)). Two lines."

## Verdict

- Succeeded? Half. Part one, yes: 6 communities, sizes 25/17/10/10/9/6, modularity 0.565; the biggest
  is the Gavroche-centered group of 25, loose (density 0.147, 44 edges in vs 49 out). I never got its
  members as a list. Part two, no: I found that it would take a lower resolution and a rerun, but I
  could not set a value I could see, and I never saw a finished rerun or how many groups it would give.
- Single Ease Question: 3 / 7.
- Would I use it instead of my current tool? Not for this. The run panel (modularity, seed, weight,
  every option) is better than clusterMaker2's, and I'd take it for a figure if the export is real.
  But changing a parameter left me not knowing what value I had set, the rerun on 77 nodes never
  finished, clicking a module didn't give me its gene list, and two different "group" columns in one
  table is a supplementary-table error waiting to happen. For the analysis itself, I stay in igraph.

## Problems, in my words

1. Changing resolution: clicking the value reported "settings changed" without showing the new value.
   Reopening the options showed 1.0 again and the banner was gone. I couldn't tell what would be rerun.
2. Rerun on 77 nodes showed "Rerunning, cannot be stopped" and never produced a result I could see.
3. Nothing says that a lower resolution means fewer, larger communities. There's no preview of the
   group count before rerunning.
4. Clicking a community shows its style, not its members. The node table stays on all 77 and doesn't
   filter to the 25.
5. The node table's "group" column is the dataset's own grouping, not Louvain, next to Louvain's
   "Community N". Easy to confuse.
6. Community colors are hidden under PageRank, so the picture never shows the modules I'm asking about.
7. Two controls are called "Data" (the left rail and a panel tab).
