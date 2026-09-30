# What groups are there, and what makes the biggest one different -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist, an associate professor who has taught Gephi for a decade
(simulated; see `study/personas/gephi-holdout.md`). Skeptical of new tools, reads every number
on screen, slightly presbyopic.

**Task as read by the moderator:** "What groups are there in this network, and what makes the
biggest one different?"

**Screens, in order:** the results panel (the moderator stepped from "running" to a finished
Louvain result and then its communities table, as if the app had moved on), the styles list with
a community selected and compared with the rest, then the inspector with one community and then
one protein selected. The pink state bar on each mock was covered and is not part of the product.

**Shots of what she saw:** `shots/record/r3-mara-groups-rp-start.png`, `shots/record/r3-mara-groups-rp-louvain.png`,
`shots/record/r3-mara-groups-rp-louvain-table.png`, `shots/record/r3-mara-groups-styles-compare.png`,
`shots/record/r3-mara-groups-styles-columns.png`, `shots/record/r3-mara-groups-inspector-group.png`,
`shots/record/r3-mara-groups-inspector-grouprow.png`.

**Outcome:** finished, with difficulty. Her answer: ten Louvain communities, eight real ones and
two single proteins, modularity 0.716. The biggest (Community 1, 62 proteins) is mostly the
file's Ribosome module, is the sparsest of the eight inside, has the most edges leaving it, and
is NOT different on expression. The difficulty was getting from the table to the comparison: the
comparison lives in a different panel and nothing on the table points there.

## Transcript

### 1. The results panel, something else running (patent network)

> Patent citations, 124,000 nodes, and the canvas is empty. That is either a bug or you have
> decided not to draw it. I would like to know which before I do anything.

She reads the bottom-right card on a later look: "124,318 nodes not drawn".

> Fine. At least it says so. Gephi would just have hung.

She scans the Catalog.

> Community: Girvan-Newman "over a day" -- yes, correct, nobody should run that -- label
> propagation, Leiden, Louvain. Good, Leiden is there. I'd use Louvain because that is what
> Gephi calls Modularity and what my reviewers expect. I click Louvain.

Nothing happens (the mock outlines the row). The moderator moves on to a project where Louvain
has already run.

### 2. A finished Louvain result (protein network)

> Human protein interactions. Not my kind of data, but groups are groups. OK -- 300 nodes, 1,262
> edges, three components. Louvain, 10.

She reads the popout line by line, slowly, leaning in.

> "on: full graph, 300 nodes, 3 components." Thank you. That is the sentence Gephi never gives
> you -- in Gephi whatever is filtered is what it ran on and the column does not tell you.
> "Seeded." "Undirected." "CPU." Weight is confidence, higher is stronger. Resolution 1, seed 7.
> That is a methods paragraph already.

> Groups: 10 communities. Modularity 0.716. "The file's modules" 0.663 -- so the detected
> partition beats the annotated modules. That is a nice touch; I would not have thought to
> compute that. Largest 62 proteins, two single proteins with no interaction. So really eight
> groups and two isolates. I'd say eight.

She opens "Details" (the run record).

> "Numbering: by size, largest first." Oh, that is good. That is exactly the reviewer question I
> got: why did community 7 change between drafts. If one is always the biggest, at least the
> big ones keep their name. The small ones will still shuffle between seeds, I assume.

> "Louvain has no WebGPU version." Don't care, 300 nodes.

She looks at the canvas legend.

> "Louvain color community." That header reads like three words someone forgot to punctuate.
> Community 1, 62. Gold. "6 more." I want to see all ten, but fine.

> "Compare with..." -- compare with what? Another run? Another community? I would expect this
> is where I compare the big group with the rest. I'll try it.

Nothing happens. She clicks "Communities table" instead. The moderator moves on.

### 3. The communities table

> Now we are talking. A table. If I cannot see rows I don't trust the picture, and here are the
> rows.

She reads across the Community 1 row.

> Size 62, edges inside 232, edges out 93, density 0.123. Hub AKT1. Module: Ribosome, 56 of 62.
> log2FoldChange "+0.02 vs +0.09", mean against the rest.

> So what makes it different. It is the biggest, and it is the loosest of the real groups --
> 0.123, everybody else is 0.16 to 0.26. And it has the most edges out, 93. So it is a big,
> leaky group. That makes sense for ribosomal proteins, everything touches them. And it is not
> different on expression, 0.02 against 0.09 is nothing.

> The hub is AKT1. AKT1 is not a ribosomal protein, even I know that. So the hub of the
> ribosome group is a signalling kinase that Louvain pulled in. That is interesting, or it is an
> artefact. I would want to click AKT1.

> I would like one more column: share of its edges that leave. I can do 93 over 232 plus 93 in
> my head, about 29 percent, but my students cannot.

> "Export table as CSV" -- good, that goes into R. Is this the full ten rows or only what is
> visible? I assume full.

> The text is small. I am squinting at "mean, vs the rest" under the column header. On the
> projector at 1280 this will be unreadable.

### 4. The styles list, a community compared with the rest

The moderator explains she has selected Community 1 on the canvas.

> Oh, so the comparison is over here, on the right. I would never have found this from the
> table. I clicked "Compare with" in the other panel and nothing, and this lives in a third
> place. Different project name too -- "Stress response study", "ppi-core-300" -- is this the
> same graph? The numbers match, 62, 232, 93, so I'll assume yes.

> "Descriptive only; no statistical test." Honest. I respect that. But then I will export and
> run Mann-Whitney myself, which is fine.

> Box plots over dots, group against the rest. log2FoldChange median -0.02 against 0.05.
> "rank-biserial r -0.02". That is an effect size, yes, and it says so. -0.02 is nothing.
> Degree 9 against 8, r 0.14. Small. So: not different on expression, very slightly more
> connected.

She opens the column chooser.

> "Compare on": ticks, and betweenness is added, log scale. 0.0047 against 0.0037, r 0.08.
> Nothing again. So the honest answer is: what makes it different is structure and membership,
> not these attributes. The table said that more quickly than these plots did.

> "Enrichment analysis isn't part of graphty." Fine by me, I'm not a biologist.

### 5. The inspector, one community, then one protein

> Community 4 now, not 1. "4 of 10" with arrows -- so I can step through the groups. That is
> nice for teaching. Size 36, edges inside 104, out 44. "log2FoldCha" -- cut off. "3 more
> attributes" -- where the density went, presumably.

> Members by degree: UBB 21, "#7 to #10 of 300". A range for a rank because of ties. I actually
> like that; Gephi would just sort and pretend.

> "Create set to style." I don't know why I need a set to style a group that is already coloured.

She looks at the canvas legend and the style list.

> Earlier Community 1 was gold. On the previous inspector screen the legend said Ribosome was
> light blue -- and here Community 2 is light blue. If I have both the module colours and the
> Louvain colours in one session I will confuse them. Gephi has the same problem, to be fair.

With one protein selected and the node table open:

> Table with the community column, module column, degree, betweenness, pagerank. Sorted by
> degree. "Show filtered graph." Yes. This is the Data Laboratory, more or less. UBB is in
> Community 4 but its module is "Unassigned". So the file did not know where UBB goes. Fine.

## After the task

**Answer as she gave it:** "Eight real communities plus two isolated proteins; modularity 0.716,
better than the file's own modules at 0.663. The biggest is 62 proteins, almost all ribosome,
and what sets it apart is structural: it is the sparsest inside and has the most ties going out,
with a signalling hub, AKT1, at its centre. On expression it is no different from the rest."

**Single Ease Question:** 5 of 7.

> The numbers were all there, and they said what they were computed on, which is more than I
> can say for Gephi. What cost me time was finding where to compare: the table, the "Compare
> with" button and the right-hand panel are three places that should be one.

**Would she use it instead of Gephi?**

> Not instead, not yet. For this question -- what groups, how do they differ -- it is better
> than Gephi: the run record, the size numbering and that communities table would save me the
> Data Laboratory plus an R script. But I did not see ForceAtlas2, I did not open my GEXF, and I
> did not see a vector export. Show me those on my 40,000-node retweet network and I will put
> it in the course next year. Until then it is the thing I open before I open Gephi.
