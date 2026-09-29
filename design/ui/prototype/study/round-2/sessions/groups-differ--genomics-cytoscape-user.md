# Session: what groups are there, and what makes the biggest one different

Participant: Maren, a cancer genomics postdoc who builds her network figures in Cytoscape (STRING, MCODE, cytoHubba, per-cluster enrichment). Played on a 14-inch laptop, about 1440 x 900.

Task, as the moderator gave it: "What groups are there in this network, and what makes the biggest one different?"

Screens used: the Results panel (starting at the finished Betweenness state, then the Louvain result and the communities table), the Styles list, and the Inspector. Renders of the two Louvain states were taken for this session: `shots/r2-gcu-louvain.png` and `shots/r2-gcu-louvain-table.png`.

## Transcript (thinking aloud)

**1. Landing on Results, Betweenness already painted.**

"OK. 'Human protein interactions', 300 nodes, 1,262 edges, 3 components. So that's a PPI, fine, same size as one of my DEG networks. Everything's orange-brown -- that's the betweenness colouring, the legend says so. That's not groups. Groups would be clusters. In Cytoscape I'd go Apps, clusterMaker, MCL, or MCODE. Where's clustering here?"

She scans the left panel. "Catalog... Centrality, Community. Community -- that's clustering, I guess. Girvan-Newman, Label propagation, Leiden, Louvain. No MCODE. No MCL. Hm." Pause. "Louvain I've heard of, a lab mate used it in Seurat for the single-cell stuff. Fine, Louvain. It says 'under a minute' next to some of them, 'over a day' next to Girvan-Newman. Nice that it warns me. I'm not clicking the over-a-day one."

**2. Clicking Louvain, running it.**

(Prototype: the finished Louvain state.)

"Right, it ran. Now it's coloured -- black, orange, green, blue blobs. OK, that looks like clusters. Legend at the bottom right: Community 1, 62; Community 2, 43; Community 3, 36; Community 4, 36; '6 more'. So ten groups? The panel says 'Groups: 10 communities'. OK, good, that's a number. Largest, 62 proteins. 'Single proteins: 2, no interaction.' Fine, those are the orphans. I'd drop those anyway."

"'Modularity 0.716.' I don't know what's a good modularity. Is that high? It doesn't say. And then 'the file's modules 0.663' right under it -- what file? Which modules? I didn't give it modules. Oh, maybe this dataset came with a module column. So... its clustering scores better than the file's? I think that's what it's saying. I'd skip that line honestly."

"Weight: 'confidence as similarity'. OK -- that's the STRING score, I think. It used the confidence as edge weight. Good, I'd want that. 'Seeded', seed 7. So the groups can change if I run it again with a different seed? That's a bit worrying. But at least it tells me the seed, I can put that in the methods."

She notices the open Run record. "'Run record: Louvain, weighted modularity, resolution 1, seed 7, CPU.' And a Copy button. Oh -- that I'd actually use. That's my methods sentence. I'd rewrite it, but at least the numbers are there and I don't have to go find them in a menu."

**3. What makes the biggest one different?**

"Now, the biggest one. Community 1, 62 proteins, it's the orange... wait, which orange? There's an orange-ish yellow in the legend and a darker orange on the canvas. On the screen the right-hand orange blob is RPL23, RPS8 -- ribosomal proteins. Is that Community 1? The swatch for Community 1 is the amber one. I think so. I'm squinting. Two oranges and a yellow is a lot of orange."

"'Communities table' -- that's what I want. A table I can read."

(Prototype: the communities table state.)

"OK, this is good. One row per community. Size, edges inside, edges out, density, log2FoldChange mean versus the rest, hub, module. Sorted by size."

"Community 1: 62 proteins, 232 edges inside, 93 out, density 0.123. log2FC plus 0.02 versus plus 0.09. Hub AKT1. Module: Ribosome, 56 of 62."

"So what makes it different... it's the ribosome. Great. It's always the ribosome." (Laughs.) "Every DEG network I've ever built has a ribosome cluster. That's the housekeeping blob, the reviewer will ask why it's in the figure."

"Looking down the density column -- it's actually the loosest real cluster. 0.123, everything else is 0.16 to 0.26. And 93 edges out, the most. So it's big and it's leaky, it's connected to everything. That I wouldn't have seen from the picture, actually. The picture just shows a blob."

"Fold change: plus 0.02 versus plus 0.09. So... basically not changed? Is that a difference? There's no p-value, no nothing. In my world 'different' means enriched for something, with an FDR. This is a mean. I can't write 'the ribosome cluster had a mean log2FC of 0.02, p equals...' -- there is no p. So I'd say it's not different on fold change, it's different on biology."

"And the hub is AKT1? AKT1 is not a ribosomal protein. Why is AKT1 the hub of the ribosome cluster? 'Hub: highest degree.' OK, so it's the most-connected one that Louvain happened to put in there. That makes me suspicious of the clustering, or of 'hub'. Everything connects to AKT1. The biggest cluster's hub is a kinase that talks to everyone -- that's the hairball problem again."

"'Module: from the file, most members.' So the module name comes from an annotation column that was already in the data -- it's not an enrichment. With my own data I wouldn't have that column. I'd have gene symbols and fold changes. So on my network this column would be empty, and I'd be back to copying 62 gene symbols into g:Profiler. Where's the enrichment?"

**4. Getting the gene list for Community 1.**

"Fine, I'll do the enrichment myself. I need the 62 genes. Click on Community 1 in the table."

(Prototype: the row is not wired to anything. There is a table search icon and "Export table as CSV...". The inspector pages show a selected protein, a set, a path; the Inspector page itself says a community from a run is "not drawn yet".)

"Nothing. I click the row, nothing happens. I'd expect it to select those 62 on the network, or give me a list. The Inspector shows a set -- 'DNA repair, 30 nodes, rule' with members by degree -- that's exactly what I want for Community 1, but I can't get from the table row to that. The 'Export table as CSV' exports this summary table, I think, not the members. I'd export the Nodes tab and filter by community in Excel, and then Excel eats SEPT2 again."

She tries the legend. "The legend says Community 1, 62. If I click that, does it select them? It doesn't look clickable. No."

**5. Styles list -- can I make a subnetwork?**

"In Cytoscape I'd select the cluster and do 'New network from selection' so I have the cluster as its own subnetwork. Here there's 'Sets and paths' on the Graph tab, with things like 'DNA repair rule 30' and 'Hubs, degree 17 to 34'. So there are sets. But I don't see how Community 1 becomes one of those. There's a plus. Maybe the plus lets me write a rule like 'community = 1'? I'd try that. I'd guess. The DNA repair set says 'Rule: module = DNA repair' so maybe I could type 'Louvain = Community 1'. I'm not sure the Louvain result is a column I can put in a rule."

"The styles list is fine -- Betweenness color, Module color, Degree size. It says which one's on top. I don't need that for this task. I just don't want two different colour schemes for 'groups' -- the Louvain colours and the module colours use different colours for the ribosome, blue in one and amber in the other. That'll confuse me when I switch."

**6. Wrapping up the answer.**

"So my answer: ten groups, two of them single proteins, so eight real ones. The biggest, 62 proteins, is basically the ribosome. It's the loosest and the most connected to the rest, and its fold change isn't different from the others. Its 'hub' is AKT1, which I don't believe biologically. If this were my data I'd want the enrichment for each cluster, and I'd want to pull the cluster out as its own network. Neither of those I could do here."

## Single Ease Question

5 of 7. "Finding the groups was easy -- Louvain, one click, and the table is really clear. The 'what makes it different' half I had to work out myself from density and edges-out, and the obvious next step, getting the gene list, went nowhere."

## Would she use this instead of Cytoscape?

"For looking? Maybe. That communities table is better than what I get from clusterMaker -- I'd have to build that in R. The run record with Copy is nice for methods. But there's no MCODE, no enrichment, and I can't pull a cluster out as a subnetwork or even get its gene list. So I'd leave for half the work. And for the figure, reviewers know Cytoscape. I'd use this to poke at a network, maybe, and the paper figure stays in Cytoscape."

## Problems observed

1. **A community cannot be selected, listed or saved as a set** (Results panel, communities table and legend; Inspector). Clicking a row or legend entry does nothing; the Inspector's set view is exactly what she wanted but no path leads there from a community. Severity 3.
2. **No per-community enrichment; "module" comes from a pre-existing annotation column** (communities table). With her own data (symbols and fold changes only) the column that told her "Ribosome" would be empty, and "what makes it different" loses its only biological answer. Severity 3.
3. **"Different" has no statistics** (communities table, log2FoldChange column). A mean versus the rest with no test or spread; she cannot tell whether +0.02 vs +0.09 means anything. Severity 2.
4. **"Hub" as highest degree put AKT1 as the ribosome community's hub** (communities table). Reads as biologically wrong and deepens her hub-gene scepticism; "highest degree" is stated but nothing flags that the hub may be a promiscuous connector. Severity 2.
5. **Modularity and "the file's modules" are unexplained numbers** (Results panel, Groups section). No sense of what a good value is, and "the file's modules" names a comparison she never set up. Severity 2.
6. **Similar colours for groups; Louvain and module palettes disagree** (canvas and legend). Community 1 amber vs Community 5 orange vs Community 8 yellow; Ribosome is amber under Louvain but light blue under module color. Communities 9 and 10 share one grey swatch. Severity 2.
7. **No MCODE/MCL in the Community list** (Catalog). She maps "clustering" to MCODE; Louvain was accepted only because of Seurat. Severity 1.
