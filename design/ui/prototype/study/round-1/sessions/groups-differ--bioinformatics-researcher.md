# Session: what groups are there, and what makes the biggest one different

Participant: Dr. Chen, computational biologist (drug target discovery). Cytoscape 3.10 for figures,
R with igraph for anything she has to reproduce.

Task as the moderator read it: "What groups are there in this network, and what makes the biggest
one different?"

Screens used, in order: the Results panel, the Styles list, the Inspector (static mocks; the
participant pointed at a control and the moderator showed the state it leads to, where one exists).

## Transcript

**Results panel, first frame.**

> OK, it says "Patent citations" at the top. 124,000 nodes. That's not my network. Am I in the wrong
> project? ... [moderator: the frames switch examples; go to the protein one] Fine. I'll ignore the
> patent thing.

**Results panel, "A new project" frame (Human protein interactions, 300 nodes).**

> 300 nodes, 1,262 edges, undirected, no weight. Hm -- no weight. If this came from STRING I want the
> combined score as the weight. I'll come back to that.
>
> "In this project: Connected components, 3." So the tool already found three groups? No -- that's
> components. Two of those are going to be a couple of stragglers. [points at the two lone dots on the
> canvas] Yes, those. That's not what anyone means by "groups" in a PPI network. Components is a
> data-cleaning number, not a module.
>
> Catalog. Centrality, Community, Path. Community: Girvan-Newman, Label propagation, Leiden, Louvain.
> Good, those are real names, I know what they are. No MCL, which is what I'd normally use through
> clusterMaker2, but Leiden is fine. I'd take Leiden over Louvain -- Louvain can give you
> badly-connected communities. I'll click Leiden.

**Moderator shows the queued frame (the only frame with a community method's options open; it is
Louvain on the patent graph).**

> Options: scope, direction, weight "None declared", resolution 1.0. Resolution is there, good,
> that's the parameter I'd have to quote. Weight "None declared" -- can I pick the confidence column
> there? It's greyed. If I can't weight by confidence, the modules are built on edges I'd have thrown
> out at 0.7 anyway.
>
> Where's the seed? Louvain and Leiden are stochastic. If I run this twice and get a different number
> of modules, I need to know it's the seed and not me. There's no seed field and no "iterations".
>
> "Its color layer is added when it runs." Fine. So I press Run... and then what? What do I get?

**Moderator: there is no frame for a finished community run yet.**

> So I can't see the answer. I don't know how many modules it found, what the modularity is, how big
> each one is. That's the whole question. In igraph I'd do `cluster_leiden`, `sizes()`, `modularity()`
> -- three lines, and I'd have the table.

**Styles list and Inspector (the same protein network, already painted by a "module" column).**

> Oh, here it's already coloured. "Module color", legend: Ribosome 56, Proteasome 40, Complex I 35,
> Spliceosome 32, DNA repair 30, "4 more". So nine modules, and the biggest is Ribosome with 56.
> That answers the first half -- if I believe it.
>
> Where did "module" come from, though? The Styles list attributes say "module, 9 values". It's a
> column in the file. Somebody labelled these. Is it from a community run, is it GO annotation, is it
> a CORUM complex list? Nothing here tells me. If it's a column I loaded, then the tool didn't find
> the groups, I did. And the names -- Ribosome, Proteasome -- that's already the enrichment answer.
> In my data I'd get "module 1 ... module 9" and have to name them myself.
>
> And "4 more" in the legend. For nine groups? Just show me nine rows. I have to click to see the
> smallest four, and those are the ones I'd actually worry about -- the tiny modules are where a
> method is splitting noise.
>
> The layout also bothers me a bit: the colour blobs are sitting in neat separate clumps. Is that the
> force layout making them look separate, or are they really that separate? I can't tell from the
> picture. I need a number.

**Inspector, "A set: DNA repair" frame.** (She wanted Ribosome, the biggest. The only group drawn
selected is DNA repair; she assumed Ribosome would look the same.)

> How do I get to Ribosome's page? I'd click Ribosome in the legend. Does that select it? Nothing tells
> me it's clickable. [moderator: in this mock a module becomes a "set" from the Sets and paths list or
> "Same value as" on a protein] So I'd click a ribosomal protein, then make a set of "same value"...
> OK, so there's a set called DNA repair here that someone made from TP53. I'd have to do that dance
> for Ribosome. Cytoscape I'd just select by column value in the table.
>
> The set panel. "Edges inside 105, edges out 42, neighbors out 40, average degree 8.4." Now that's
> actually useful. 105 in, 42 out -- that's a proper module, conductance about 0.17 if I do it in my
> head. I like that it gives me in and out rather than a vague "density". That's the first thing on
> these screens I could put in a methods section.
>
> But "what makes it different" -- different from what? I want the same four numbers for all nine
> modules side by side, or this module against the rest of the network. Is 8.4 average degree high?
> The whole network is 8.41. So... no, it isn't. You have to go to another panel and remember the
> number to find that out.
>
> "Members by degree": TP53 32, BRCA1 13, WRN 13, "27 more". Ranked by degree. Of course TP53 is on
> top, it's the most-studied protein on the planet. That's not what makes the module different,
> that's what makes it published. I'd want the logFC distribution of the members versus the rest --
> is this module up in disease? -- and I'd want the enrichment. Neither is here. log2FoldChange is in
> the data, the attributes list on the Styles list shows it, -2.52 to 3.15, but nothing summarises it
> per group.
>
> "27 more members" opens the table -- fine, if I can copy the gene symbols out as a list. I'd paste
> them straight into g:Profiler. That's what I'd actually do next.
>
> Back on the Results panel: Closeness says "WF-corrected". What's WF? [moderator doesn't answer]
> I'll guess some correction for disconnected pieces. I'd need to click through to know what I'm
> quoting. Eigenvector with a yellow "3 components" warning -- fine, at least it's honest that
> eigenvector is ill-defined on a disconnected graph. That I appreciate.

**Her answer to the task.**

> Nine groups, if the "module" column is to be trusted -- I don't know who made it. The biggest is
> Ribosome, 56 proteins. What makes it different: I can't say from here. For the one group I could
> open, I get edges in versus out, and that's it. No comparison with the other groups, no expression,
> no enrichment. I'd export the membership and do the rest in R.

## Single Ease Question

**3 of 7.** Finding the groups was easy only because someone had already coloured them by a column.
Finding them with a method has no finished screen. "What makes it different" I could not answer.

## Would she use it instead of her current tool?

> Not for this. For modules I'd stay in R: `cluster_leiden` with the confidence as weight and a fixed
> seed, then clusterProfiler per module. What I'd take from this is the set panel -- edges in, edges
> out, the ranks with ties written as "#16 to #23" instead of pretending they're ordered. That's more
> honest than cytoHubba. If a community run ended in a table of modules with sizes, modularity, the
> parameters and the seed, and I could pull that table out as a TSV, I'd look at it again. Right now
> it's a nice viewer for groups somebody else already made.

## Problems observed

1. **No finished community result.** A Leiden or Louvain run has options and a queued state, but no
   screen shows what it produced: how many groups, their sizes, the modularity. The core of the task
   has nothing to land on. (Severity 4)
2. **The groups on screen have no provenance.** The protein network is coloured by a "module" column
   whose origin (a run, an annotation, the loaded file) is never stated, and the groups already carry
   biological names. She cannot tell whether the tool found them. (Severity 3)
3. **Nothing compares one group with the others.** The set panel gives edges inside, edges out,
   neighbours out and average degree for one group only; no side-by-side across groups, no "versus
   the rest of the network", no summary of the members' log2FoldChange. (Severity 3)
4. **No seed and no weight for community methods.** Resolution is shown, but a stochastic method has
   no seed field, and the Weight menu reads "None declared" with no path to use the confidence score.
   (Severity 3)
5. **Members ranked by degree only.** The group's members are listed by degree, which surfaces the
   most-studied proteins (TP53 first), not what characterises the group. (Severity 2)
6. **Getting from a legend entry to a group's panel is not obvious.** Nothing suggests the legend
   rows are clickable; the only drawn route is making a "same value" set from a member protein.
   (Severity 2)
7. **Legend truncates nine groups to five plus "4 more".** The smallest groups are the ones she wants
   to check, and they are hidden. (Severity 2)
8. **"Connected components 3" reads like the network's groups.** It sits alone under "In this
   project" with a count, and she had to reason out that it means pieces, not modules. (Severity 2)
9. **"WF-corrected" is unexplained jargon** next to Closeness. (Severity 2)
10. **Mixed example data across frames.** The first Results-panel frames show a patent-citation
    graph; she thought she was in the wrong project. (Severity 1, a prototype artefact)

## What worked for her

- Real method names in the catalog (Leiden, Louvain, Girvan-Newman), with a cost estimate beside each.
- Resolution shown as a named parameter before the run.
- Edges inside versus edges out for a group -- a number she can quote.
- Rank ties written as a range ("#16 to #23 of 300").
- Eigenvector honestly flagged on a graph in three pieces.
