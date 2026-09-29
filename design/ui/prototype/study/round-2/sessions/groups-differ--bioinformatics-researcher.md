# Session: "What groups are there, and what makes the biggest one different?" -- Dr. Chen, computational biologist

Participant: Dr. Chen, computational biologist, protein interaction networks for fifteen years (Cytoscape, R with igraph). Composite persona.
Screens used: the Results panel (start), the Communities table, the Inspector, the Styles list. Renders at 1440 x 900.
Moderator's task, given once: "What groups are there in this network, and what makes the biggest one different?"

## Transcript (think-aloud)

**1. The first screen.**
"OK. This says 'Patent citations', 124,318 nodes, and something called PageRank is running on WebGPU. That's not a protein network. Am I in the right place? ... Fine, it's a demo. I'll assume my network is loaded somewhere.
What I want is modules. Left side, there's a 'Catalog' with headings -- Centrality, Community, Path. 'Community' is the word I'd look for, good. Girvan-Newman, 'over a day' -- yes, I know. Label propagation, Leiden, Louvain. No MCL. Everybody in my field uses MCL through clusterMaker, so I notice it's missing, but fine.
Leiden or Louvain? Louvain is what people know, but Leiden fixes the badly connected communities Louvain can give you. Nothing here tells me that. I'll click Louvain because that's what a reviewer will recognise."

**2. The finished Louvain result (Human protein interactions, 300 nodes).**
"Right, now it's my kind of network. 300 nodes, 1,262 edges, 3 components. The panel says 'on: full graph, 300 nodes, 3 components. Seeded. Confidence as similarity, undirected. CPU.' Good -- it used the STRING score as a weight and it tells me so. Seed 7, resolution 1. I can write that in a methods section. That's more than cytoHubba ever told me.
I open 'Details'. Run record: Louvain, weighted modularity, resolution 1, seed 7, how the weight was used, 0.40 to 0.99, 'bigger is a closer tie'. Numbering by size. 'CPU: Louvain has no WebGPU version.' Fine, 300 nodes, I don't care. And there's a Copy button, so the parameters go into my notes. Good.
The box does sit right on top of the network, though, so I have to close it to look at the picture.
Groups: 10 communities. Modularity 0.716. 'The file's modules 0.663' -- hmm. I had to read that twice. I think it means the modularity of the module annotation that came in my file? So Louvain found a partition that's more modular than the curated pathway grouping. That's actually a useful comparison, but the label is cryptic. I'd write 'modularity of your module column'.
Largest: 62 proteins. Single proteins: 2, no interaction. So really eight modules plus two orphans. OK.
The legend on the canvas says Community 1 to 4 and '6 more'. The colours are distinct, colour-blind check I'd have to do myself. 'Community 1' doesn't mean anything to me biologically, but I expect that at this step."

**3. Communities table.**
"I click 'Communities table'. Oh, that's nice -- one row per community. Size, edges inside, edges out, density inside, log2FoldChange mean versus the rest, hub, and 'module from the file; most members'. And 'Export table as CSV'. That goes straight into R. That's the first thing today that I'd actually use.
So the groups: Community 1 is Ribosome, 56 of 62. 2 is Proteasome, 40 of 43. 3 is Complex I. 4 Spliceosome. 5 MAPK signalling, 31 of 31. 6 TGF-beta, only 21 of 31 -- that one's mixed. 7 Cell cycle. 8 DNA repair, 29 of 29. And 9 and 10 are GSK3B and NOTCH1 on their own.
Now, the biggest one. What makes it different?
- It's the biggest, 62.
- It's the loosest: density 0.123, the lowest of the eight real ones. The others are 0.17 to 0.26.
- It has the most edges out, 93. So it's leaky.
- log2FoldChange: +0.02 against +0.09 for the rest. So basically not changing. Proteasome is the one moving, +0.29.
- And the hub is ... AKT1? In a ribosome module? That's wrong-looking. AKT1 is a kinase, it touches everything. I bet Louvain swallowed a couple of big signalling hubs into the largest community and that's why it's 62 and not 56, and why it's the sparsest and leakiest. That's my actual answer, but I got there from biology, not from the tool.
Also 'hub: highest degree'. Highest degree is study bias -- AKT1 is one of the most-published proteins there is. And GSK3B is the 'hub' of a community of one with zero edges. A hub of nothing. That row should just say there isn't one."

**4. Trying to see who is in it.**
"The note says selecting a row selects that community's proteins on the canvas. I want the gene list. I look at the right-hand side -- the Inspector. For a set like 'DNA repair' it shows members by degree: TP53 32, BRCA1 13, WRN 13, and '27 more members'. So for my 62 I'd see three names and '59 more'. I'd need the six non-ribosomal ones, the ones that don't carry 'Ribosome'. I can't see how to get just those. I'd guess 'Filter to', then open the Nodes tab of the table and sort by module? Probably. That's three steps for 'show me the odd ones out'.
And I didn't see a picture of what the Inspector shows for a Louvain community specifically -- the designers' own note says a community from a run isn't drawn yet. So I'm guessing.
There's no Copy for the member list that I can find, only 'Copy as PNG'. A PNG of a gene list. No."

**5. What I'd tell a reviewer.**
"Is 'different' real? The table gives me means -- +0.02 versus +0.09 -- with no spread and no test. No p-value, no permutation. And 'Ribosome 56 of 62' is an overlap, not an enrichment. I'd take the CSV into R and run a Wilcoxon and a hypergeometric test myself. Also, what happens with seed 8? It says another seed can place proteins differently. I'd want to know if AKT1 stays there. There's no 'run ten seeds and show me how stable it is'."

**Answer she gives the moderator:** "Eight real modules -- ribosome, proteasome, complex I, spliceosome, MAPK, TGF-beta, cell cycle, DNA repair -- plus two orphan proteins. The biggest is mostly ribosome, but it's the sparsest and leakiest, it isn't differentially expressed, and it has AKT1 in it, which I think is an artefact of Louvain pulling a hub in. I'd need to check that on other seeds before I believed any of it."

## Single Ease Question

5 out of 7. "Finding the groups was easy once I was on the right screen, and the table is genuinely good. Saying what makes one different, in a way I could defend, I did in my head."

## Would she use this instead of her current tool?

"For looking, yes, over Cytoscape -- the run record with the seed and the weight is better than anything clusterMaker gives me, and the communities table with a CSV export is exactly the thing I'd otherwise write in R. For the claim itself, no: no test, no enrichment p-value, no seed stability, no gene list I can copy. I'd run it here, export the table, and do the statistics in igraph. If it could tell me 'these six proteins aren't ribosomal' and give me an enrichment p-value per module, I'd stop opening Cytoscape."

## Problems observed

1. **"Different" has no statistic.** The table compares means (log2FoldChange +0.02 vs +0.09) with no spread, no test and no p-value; module overlap ("56 of 62") is shown as a count, not an enrichment. She answered "what makes it different" from biology, not from the screen. Severity 3.
2. **No way to get a community's members out as a list, or to see its odd members.** The Inspector caps members at three plus "N more", offers "Copy as PNG" only, and has no view of a Louvain community at all; finding the six non-ribosomal proteins would take several guessed steps. Severity 3.
3. **"Hub" is raw highest degree, and it misleads.** AKT1 is named hub of the ribosome community; GSK3B is the "hub" of a one-protein community with zero edges. Degree-as-hub rediscovers the most-published proteins. Severity 2.
4. **No seed-stability check.** The tooltip admits another seed can move proteins, but there is no way to see how stable a membership is (for example, how often AKT1 lands in community 1 across seeds). Severity 2.
5. **Choosing a method has no guidance.** Louvain and Leiden sit side by side with no one-line difference; MCL, the method her field expects, is absent. Severity 2.
6. **Starting screen is another dataset.** The first frame shows a patent citation network with PageRank running, which made her ask whether she was in the right place. Severity 2.
7. **"the file's modules 0.663" is cryptic.** She had to reread it to work out it is the modularity of her own module column. Severity 1.
8. **The run record popover covers the network.** Useful content, but she had to close it to see the drawing. Severity 1.

## What she liked

- The state line and run record: weight used, seed, resolution, engine, all copyable -- "I can write that in a methods section."
- Modularity of the detected grouping shown beside the modularity of her own annotation.
- The Communities table: size, density inside, edges out, mean of a data column against the rest, and the file's module with an overlap count -- plus Export table as CSV.
- Single proteins stated plainly ("2, no interaction") and density written "not defined", not 0.
