# Session: "What groups are there, and what makes the biggest one different?" -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional composite), associate professor, Gephi user since
0.8, teaches it every year. Simulated participant.
**Task, as the moderator gave it:** "What groups are there in this network, and what makes the
biggest one different?"
**Mocks used:** the Results panel (starting from its first frame, then the finished Louvain result
and Louvain's groups in the table), the Styles list, and the Inspector. Renders at 1440 by 900.

## Transcript (thinking aloud)

**First screen: the Results panel, a PageRank run in progress on a patent citation graph.**

> "OK. Left column, something called 'In this project' with three things in it, and under it a
> 'Catalog'. That catalog is my Statistics panel, I think. Centrality, Community, Path. Good, there
> is a Community heading. Louvain, Leiden, Label propagation, Girvan-Newman. Girvan-Newman says
> 'over a day' -- honest, at least. Gephi would just sit there with the progress bar until I kill
> it."

> "Groups means modularity. I'm not going to use Leiden on a first look even though I know it's
> better, because my students and my reviewers know Louvain. I click Louvain."

> "The PageRank card in the middle says 'on: full graph, 124,318 nodes. Exact. Directed.' That's
> the first thing I'd ask of any statistic, so I'll give them that."

**The finished Louvain result.** (The prototype moves to a different dataset here -- 300 human
proteins. The moderator says to treat it as the same session.)

> "Right, a different network. Proteins. Not my field, fine, groups are groups."

> "The card: 'on: full graph, 300 nodes, 3 components. Seeded, confidence as similarity,
> undirected, CPU.' So it tells me what it ran on and that it treated the graph as undirected. That
> is exactly the thing Gephi never tells you -- in Gephi if you have a filter on, your modularity
> is on the filtered graph and the column doesn't say so. This says Full graph right up top. Good."

> "There's a Seed field. Seven. Oh, that's -- yes. That's the reviewer question. 'Why did
> community 7 change between drafts.' If I can write 'seed 7, resolution 1' in the methods, that
> is one sentence. I like that a lot."

> "Someone opened a 'Run record' box and it's sitting on top of my graph. Method, seed, damping
> does not apply, normalization, weight conversion... 'Numbering: by size, largest first.' Hm! So
> community 1 is always the biggest. That fixes the arbitrary-number problem. I'd put that on my
> handout. But I want this box off my map -- I close it with the X."

> "Groups: 10 communities. Modularity 0.716. 'The file's modules 0.663' -- I think that means the
> modularity of the grouping that came in the file? That's a nice comparison if it's what I think,
> but I'm guessing. Largest: 62 proteins. 'Single proteins: 2, no interaction.' Fine."

> "Now 'what makes the biggest one different'. Nothing on this card answers that. There's a link,
> 'Communities table'. Tables I trust. Click."

> "The legend in the corner shows Community 1 to 4 and '6 more'. Community 1 is -- orange? amber?
> And Community 8 in the table is yellow. On the projector those two will be the same colour. And
> Community 9 and 10 are both the same dark grey, and 7 is black. I'd have to hover to know which
> blob is which."

**Louvain's groups in the table.**

> "OK, now we're talking. A table at the bottom with tabs: Nodes, Edges, Communities: Louvain.
> That's the Data Laboratory, but under the map instead of instead-of the map. That's actually
> better than Gephi -- I don't lose the picture when I look at the rows."

> "'Full graph: 10 communities, 2 of them a single protein. Sorted by size.' Size, edges inside,
> edges out, density, log2FoldChange, hub, module."

> "So, the biggest one. Community 1, 62 proteins. 232 edges inside, 93 edges out -- the most edges
> out of any group. Density 0.123, which is the lowest of the real groups; the others are 0.17 to
> 0.26. So it's the biggest and the loosest and the most connected to everything else. That is my
> answer, I think: it's a big, sparse group with a lot of ties outward. If this were Twitter I'd
> say it's the bridging community. The hub is AKT1."

> "'module: Ribosome 56 of 62' -- so 56 of the 62 already had the label Ribosome in the file. OK,
> so it mostly *is* the ribosome group. That's the what-it-is. Good that it's there, I'd have had
> to do a pivot in R for that."

> "log2FoldChange, 'mean, vs the rest', +0.02 vs +0.09. I don't know what that is. Some biology
> measurement. For my Mastodon data this column would be whatever numeric attribute I have, I
> suppose? If it is 'mean of attribute X in the group versus the rest', that's actually the
> comparison I wanted -- but it only did it for one attribute and I didn't pick it. Where do I
> choose which attribute gets compared? I don't see a control for that."

> "What I actually want next is: who are the bridges out of Community 1? Betweenness inside the
> group, or the nodes with the most edges out. 'hub, highest degree' is not the same thing. AKT1
> having the most ties doesn't tell me it's the one tying the group to the rest."

> "I click the Community 1 row. [Moderator: it selects the 62 proteins on the canvas.] Fine. And
> the right side? [Moderator: that panel is not drawn for a community yet.] Hm. So I'd expect it
> to look like this" -- she is shown the Inspector's 'A set: DNA repair' frame -- "edges inside,
> edges out, neighbours out, members by degree. Yes, that's what I want for Community 1. But that's
> a saved set, not a community. Can I turn Community 1 into one of those? I don't see a 'save as
> set' anywhere on the table row."

> "Also, on this set screen, 'Ribosome' is light blue in the module legend, and in the Louvain
> colours the ribosome community is orange. Two colour schemes for the same proteins, one screen
> apart. I'd get that wrong in a lab with students every time."

**The Styles list.** (Looked at briefly when asked where the colours come from.)

> "A stack of layers, like Photoshop. 'Betweenness color', and the others. So the Louvain colour
> is a layer I can hide and bring back. That's my undo for colours, basically -- I can turn it off
> without losing the partition. That alone is worth a lot. But I didn't need this for the task."

## After the task

**Answer given:** "Ten groups, eight real ones and two isolated proteins. The biggest,
Community 1 with 62 proteins, is mostly the ribosome group; compared with the others it's the
loosest -- lowest density -- and has the most ties going out, so it's the most connected to the
rest of the network. Its best-connected member is AKT1."

**Single Ease Question:** 5 of 7.

> "Finding the groups was easy -- easier than Gephi, because it said what it ran on and it numbers
> them by size. 'What makes it different' I had to work out myself by reading the columns and
> comparing numbers by eye. It gave me one comparison column I didn't ask for and no way to pick
> another."

**Would she use it instead of Gephi?**

> "For this step, the stats, honestly, maybe. The seed, 'full graph' written on the result, the
> numbering by size and the table under the map all fix things that have bitten me for ten years.
> But I haven't seen it open my GEXF, I haven't seen ForceAtlas2 with LinLog, and I haven't seen
> an SVG. This is a 300-node graph; mine are 50,000. I'd try it on one of my own networks. I would
> not rewrite my handout for it yet."

## Observations for the studio

- Things she valued, unprompted: "Full graph" stated on the result; the Seed field; "Numbering:
  by size, largest first"; the table docked under the canvas instead of replacing it; the
  "the file's modules" modularity baseline (though she was unsure what it meant); the Louvain
  colour as a layer she can hide.
- The table gives the raw columns but not the answer to "what makes it different": she compared
  density and edges out by eye. The vs-the-rest comparison exists for one attribute only, and the
  attribute is not chosen by her or labelled as changeable.
- No way to see bridging members of a community (edges out per member, or betweenness within).
- The row selects the community, but the right-hand panel for a community is not drawn, and there
  is no visible way to keep a community as a set.
- Palette: Community 1 (amber) versus Community 8 (yellow), and Communities 9 and 10 in the same
  dark grey plus 7 in black, are hard to tell apart; the legend shows only 4 of 10.
- The same proteins are coloured differently by the module layer and by the Louvain layer
  (Ribosome light blue vs Community 1 orange).
- The Run record opens as a box on top of the canvas and covers the groups she is trying to read.
- Small grey text (the "on: ..." line, column sublabels like "mean, vs the rest") is tiring at her
  eyesight; she leaned in.
- "the file's modules 0.663" is terse enough that she guessed its meaning.
