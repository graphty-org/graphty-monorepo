# Session: what groups are there, and what makes the biggest one different

Participant: Dr. Chen, computational biologist (drug target discovery). Composite persona, see
`../../personas/bioinformatics-researcher.md`.

Task as read by the moderator: "What groups are there in this network, and what makes the biggest one
different?"

Screens, in the order she saw them (renders in `shots/tasks/groups-differ/`):

1. The Results panel with a finished Louvain run and its run record open
2. The same run with the Communities tab of the table open
3. The styles list (a different project, coloured by betweenness)
4. The inspector with a set selected (the file's "DNA repair" module)
5. The Nodes table, ranked by three measures
6. The inspector's "Compared with the rest" view of Community 1 (reached by the moderator; she did
   not find the way there herself)

## Transcript

### Screen 1 -- the Louvain run

> OK. Human protein interactions, 300 nodes, 1,262 edges, three components. That's a small core
> network, fine. Somebody has already run Louvain -- there it is on the left, "Louvain, 10". Ten
> what? Ten groups, presumably.

She reads the options card top to bottom, slowly.

> "On full graph, 300 nodes, 3 components. Seeded. Undirected. CPU." Good. "Weight: confidence,
> higher = stronger link (your answer)." So it treated the STRING score as a similarity, not a
> distance. That's the right way round, and it says so. Resolution 1, seed 7. I can put that in a
> methods section as is.

She reads the run record popover.

> "Weighted modularity, resolution 1. Seed 7. Normalization: modularity divided by twice the total
> confidence of all edges." Fine. "Confidence used as given, 0.40 to 0.99" -- so my cut-off was 0.4,
> it tells me the range it actually saw. "Numbering: by size, largest first; a protein with no
> interaction is a community of its own." OK, that's honest. And "Copy" -- I'd paste that straight
> into the supplementary methods. This is the first time a tool has told me the seed without me
> asking.

She moves to the Groups block.

> "Groups, 10 communities. Modularity 0.716. The file's modules 0.663." Oh, that's nice -- it scored
> the annotation I brought in against the same measure. So Louvain's split is a bit more modular than
> the pathway labels. That's actually the first thing a reviewer asks. "Largest 62 proteins. Single
> proteins 2, no interaction." So really eight groups plus two orphans. I'd rather it just said
> eight, but at least it doesn't hide them.

> The legend down on the canvas: Community 1, 62; Community 2, 43; 3 and 4, 36 each; "6 more". Colours
> look like Okabe-Ito, good.

What she expects next: a table of the groups. She clicks "Communities table".

### Screen 2 -- the Communities table

> There. One row per community. Size, edges inside, edges out, density, log2FoldChange "mean, vs the
> rest", hub "highest degree", and module "from the file; most members". That's more or less the table
> I'd build in R with igraph and dplyr.

She checks the numbers.

> Community 1: 62 proteins, 232 inside, 93 out, density 0.123. 62 times 61 over 2 is 1,891; 232 over
> that is 0.123. Right. Ribosome, 56 of 62. So the biggest one is basically the ribosome, which is
> what you'd expect -- ribosomal proteins are wall-to-wall in STRING.

> What makes it different? It's the biggest and it's the sparsest -- 0.123, everything else is 0.16
> to 0.26. That makes sense, it's the biggest and probably swallowed some hangers-on. And it's not
> differentially expressed: plus 0.02 against plus 0.09 for the rest. Community 2, the proteasome, is
> the one that moved -- plus 0.29.

She stops on the hub column.

> Hub for Community 1 is AKT1. AKT1 is not a ribosomal protein. That's exactly the thing I complain
> about -- the most-studied kinase in the building ends up as "the hub" of the ribosome module
> because it touches everything. And "highest degree" -- highest degree in the whole network, or
> inside the community? If it's whole-network degree, that column is going to get quoted in some
> student's thesis as "AKT1 is the hub of the ribosome module". Same with UBB as hub of the
> spliceosome.

> And "mean, vs the rest". A mean of fold changes with no spread and no n next to it. Plus 0.02
> versus plus 0.09 -- is that anything? I'd guess nothing. It doesn't say.

She tries to click Community 1 in the table, expecting it to select the 62 proteins.

> Can I click the row? Nothing tells me it does anything -- no hover text, no arrow. In Cytoscape I'd
> select the cluster and look at the node table. I'd expect clicking the row selects those 62 and
> shows them on the right. The right-hand panel still just says "Interactions, Graph".

(In the prototype the row click is not described; she assumes it selects and moves on.)

> "Compare with..." on the left, under Groups. Compare with what? I want Community 1 compared with the
> other 238. I suspect this is "compare Louvain with another run", which is also useful, but it's not
> what I'm after right now. I won't click it.

> "Export table as CSV" -- good. That's the one I'd actually use.

### Screen 3 -- the styles list

> Wait, this is a different project. "Stress response study", graph "ppi-core-300", and now
> everything's orange-brown by betweenness. Where did my Louvain colouring go? Is this the same 300
> proteins? Same counts, 300 and 1,262, so I think so, but the name changed under me.

She reads the betweenness layer.

> "Betweenness as color, log scale, each value divided by 0.000077, the smallest above 0, before the
> log." Fine, I'd have done the same. "Paints 300 of 300, no value 0." That's the kind of line I like.
> But it's not my question. Nothing here about groups.

### Screen 4 -- the inspector with a set

> "DNA repair, 30 nodes, rule set, module = DNA re..." -- so this is the pathway label from my file,
> not a Louvain community. Edges inside 105, edges out 42, members by degree, TP53 first, then BRCA1
> and WRN. The rank "#2 of 300" next to TP53 is useful. But I asked about Louvain's groups, and this
> is the file's module. The table said Community 8 is DNA repair, 29 of 29 -- 104 inside. So they're
> nearly the same but not the same group. I'd want to see Community 8 like this, not the annotation.

> "Enrichment" isn't here at all. OK.

### Screen 5 -- the Nodes table

> This one I'd live in. id, module, community, degree with rank, betweenness with rank, pagerank with
> rank, and each column says what it was computed on: "Louvain weighted, seed 7, full graph",
> "Betweenness exact, unweighted, full graph". Good -- although betweenness unweighted while Louvain
> was weighted; I'd note that in the legend.

> "MAPK1 and TP53 are the top 2 on all three measures." Yes, because they're the most studied. The
> usual suspects. AKT1 is in Community 1 here, module "Unassigned". So AKT1 has no pathway label at
> all and Louvain dumped it in with the ribosome. That settles my hub complaint: the "hub" of the
> ribosome community is a protein that isn't in the ribosome.

At this point the moderator asked whether she had an answer. She gave it (below), then said she
could not see how to compare Community 1 with the rest of the network side by side. The moderator
showed her the "Compared with the rest" inspector view.

### Screen 6 -- Community 1 compared with the rest (shown by the moderator)

> Oh, this is what I wanted. "Community 1, created from Louvain run, seed 7. 62 proteins, 232
> inside, 93 out, density 0.123." Then "Compared with the rest. Descriptive only; no statistical
> test. 62 proteins in Community 1, 238 in the rest." Honest, I'll take it.

> log2FoldChange: box plots, median minus 0.02 versus 0.05 for the rest, IQR -0.61 to 0.75 versus
> -0.69 to 0.85. Rank-biserial r of minus 0.02, "effect size, not a significance test." So: no
> difference. That's the answer I guessed from the table, and now I can defend it.

> Degree: median 9 versus 8, r 0.14. The ribosome proteins are a bit better connected than the
> rest, not much.

> Note it's median here and mean in the table. Pick one, or show both. A reviewer will catch "+0.02"
> in one figure and "-0.02" in another.

> "Enrichment analysis isn't part of graphty. Copy members." Fine -- I'd paste it into g:Profiler.
> But copy the background too. Enrichment against the whole genome is wrong for a 300-protein
> network; the background has to be these 300. Give me a "copy all proteins" next to it.

> How would I have got here on my own? From the table I'd click the row, I suppose. Nothing on the
> screen told me a row click leads here.

## Her answer to the task

> Ten groups by Louvain -- really eight, plus two single proteins with no interactions --
> modularity 0.716 at resolution 1, seed 7, weighted by STRING confidence. They line up closely with
> the pathway modules in the file (ribosome, proteasome, complex I, spliceosome, MAPK signalling,
> TGF-beta, cell cycle, DNA repair). The biggest, Community 1, is 62 proteins, 56 of them ribosomal.
> It differs by being the largest and the least dense (0.123, the others are 0.16 to 0.26), and it
> has picked up AKT1, which is not a ribosomal protein, as its best-connected member. Its expression
> is not different from the rest: median log2 fold change -0.02 against 0.05, effect size about
> zero. If anything moves in this dataset it's the proteasome group, not the ribosome.

## Single Ease Question

5 of 7.

> The numbers were there and they were right, which is most of it. I lost points on getting from
> the table to the comparison -- I needed you to show me -- and on the project switching name
> halfway through.

## Would she use it instead of her current tool?

> For looking at a partition and writing it up, yes, over Cytoscape plus clusterMaker -- the run
> record with the seed and the weight direction, and the modularity of my own annotation next to
> Louvain's, is more than Cytoscape gives me without a script. Not instead of igraph. I still don't
> know if I can drive this from R or get the community assignment back as a TSV into my pipeline;
> the Nodes table has a CSV export, which is a start. Until I know that, this is where I'd look and
> make the figure, and igraph is where I'd do the analysis.

## Problems she hit

1. **No way from a Communities table row to "compared with the rest".** Rows show no hover text or
   affordance; she guessed a click selects, and could not find the comparison view without the
   moderator. (Severity 3)
2. **"Hub, highest degree" names AKT1 for a ribosome community.** It does not say whether degree is
   inside the community or in the whole network, and it invites naming a module after a
   well-studied outsider. (Severity 2)
3. **Mean in the table, median in the comparison.** log2FoldChange is "+0.02 vs +0.09" (mean, no
   spread, no n) in the table and "-0.02 vs 0.05" (median, IQR) in the inspector. (Severity 2)
4. **"Compare with..." does not say compare with what.** She wanted this group against the rest and
   assumed the verb meant another run, so she left it alone. (Severity 2)
5. **Project and graph name changed between screens.** "Human protein interactions / Interactions"
   became "Stress response study / ppi-core-300", and Louvain colouring became betweenness; she
   briefly doubted it was the same network. (Severity 2)
6. **The set inspector showed the file's DNA repair module, not a Louvain community.** Close but not
   the same group (30 vs 29 proteins, 105 vs 104 edges inside). (Severity 2)
7. **Copy members, but no background set.** Enrichment for a 300-protein network needs those 300
   as the background. (Severity 2)
8. **Two single unconnected proteins counted as communities 9 and 10.** Stated plainly, but she
   would rather read "8 communities and 2 unconnected proteins". (Severity 1)

## What she liked

- The run record: method, seed, weight direction, normalization, engine, with a Copy button.
- Modularity of the file's own modules shown next to Louvain's.
- Every column in the Nodes table saying what it was computed on.
- "Descriptive only; no statistical test" and "effect size, not a significance test" -- the tool
  does not overclaim.
- "Enrichment analysis isn't part of graphty" instead of a half-built enrichment.
