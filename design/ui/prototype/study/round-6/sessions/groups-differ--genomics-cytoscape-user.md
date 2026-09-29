# Session: what groups are there, and how is the biggest one different?

Participant: Maren, cancer-genomics postdoc who builds STRING networks in Cytoscape two or three times a month (persona: study/personas/genomics-cytoscape-user.md).
Dataset: Human protein interactions, 300 proteins, 1,262 interactions.
Task as read by the moderator: "On the protein network, what groups are there, and how is the biggest one different from the rest?"
Screens seen, in order, as the participant sees them (design notes hidden): the Results panel with a finished Louvain run and its run record open; the same run with the communities table open; the style list; the inspector on a saved set; the node table ranked by three measures; the comparison view.

Renders: shots/tasks/groups-differ/01-results-panel-louvain.png, 02-results-panel-louvain-table.png, 03-styles-list.png, 04-inspector-set.png, 05-table-dock-ranked.png; shots/groups-maren-r6-comparison.png.

## Think-aloud

### 1. Results panel, Louvain run finished

"OK, so somebody already clustered it. 'Louvain, Sep 28 09:31.' It's not MCODE, it's not MCL. Fine, I've heard of Louvain, the single-cell people use it. Groups: 10 communities. Largest 62 proteins. Two 'single proteins, no interaction'. So really eight clusters and two orphans. That's the first half of the question, basically."

"Modularity 0.716, and 'the file's modules 0.663'. I don't really know what a good modularity is. I'm guessing higher is better, so the clustering fits the network better than whatever modules came in the file? I would not put that in a paper without looking it up."

"This box in the middle, 'Run record' -- method, seed 7, resolution 1, weight is the confidence 'used as given, 0.40 to 0.99'. OK, so it used the STRING score and the cutoff was 0.4. That's the thing I always have to dig out for the methods. There's a Copy button. Good. I'd paste that straight into a methods draft. 'Numbering by size, largest first' -- good, so Community 1 IS the biggest, I don't have to go hunting."

"The legend on the canvas shows Community 1 to 4 and then '6 more'. The colours are orange, light blue, green, dark blue -- not red-green, my PI would be fine. But I can only see four of ten in the legend."

"It says 'Seeded' with a little info mark. I skip that. And '3 components' up top -- so there are bits not connected to the main thing. Two of those are presumably the orphans."

"Now how is the biggest one different? The panel doesn't say. It says 62 proteins and that's it. There's a link, 'Communities table'. That's the only thing that sounds like it has more. Clicking that."

### 2. Communities table

"Oh, OK. One row per community. This is what I'd want to paste into a supplementary table. Size, edges inside, edges out, density, log2FoldChange mean vs the rest, a hub, and 'module from the file; most members'."

"Community 1: 62 proteins, 232 edges inside, 93 edges out. 'Ribosome 56 of 62.' So the big one is the ribosome. That doesn't surprise me at all. Ribosomal proteins always come out as one enormous tight ball in STRING, they're all co-expressed and all in the same complexes. Every hairball I've ever made has a ribosome blob."

"Density 0.123. Let me compare... Community 2 is 0.173, 3 is 0.225, 8 is 0.256. So the biggest one is actually the loosest of the real clusters. And it has the most edges going out, 93. Hm. I'd have expected ribosome to be the densest. Maybe because it's big -- a bigger cluster has more possible pairs, so the density drops. I'm not sure that's a real difference or just size."

"The fold change column. 'mean, vs the rest'. Community 1 is +0.02 vs +0.09. So basically zero. Community 2, proteasome, is +0.29 vs +0.04, that's the one actually moving. So how is the biggest different? It's the one that's NOT changing. The ribosome is just sitting there. Honestly that's a fine answer biologically -- it's the housekeeping cluster -- but I don't trust a mean of log fold change. If half the genes go up 2 and half go down 2 the mean is zero and it looks boring. I'd want to see how many in the cluster are significant, padj under 0.05, up and down separately. There's no padj here at all. I can't tell from this if the ribosome is really unchanged or just cancels out."

"The hub for Community 1 is AKT1. AKT1 in the ribosome cluster? AKT1 isn't a ribosomal protein. That's the classic hub gene problem -- AKT1 talks to everything in STRING, so it gets pulled into whatever cluster it touches the most. I'd call that out. If I put 'hub: AKT1' next to 'Ribosome' in a figure, reviewer 2 would ask what AKT1 is doing there. And 'highest degree' -- OK, it's degree, that's what I'd call a hub anyway."

"The 'module' column says 'from the file'. Which file? Is that KEGG? GO? Which version? In Cytoscape I'd run enrichment per cluster, g:Profiler, and get an FDR. This is just counting a label that came in with the data. '56 of 62' is convincing, but it's not an enrichment p-value and I can't write 'enriched for ribosome, FDR ...' from it."

"The two single ones, GSK3B and NOTCH1, 'Unassigned', no interactions. GSK3B with no partners? At 0.4 confidence? That's weird, GSK3B is a hub in every STRING network I've seen. Maybe it's the subset. I'd check that, but it doesn't matter for the question."

"Row click -- I'd expect clicking Community 1 to highlight it on the network. Nothing on the screen says it does. I'd try it anyway."

### 3. Style list screen

"This is a different project. 'Stress response study', ppi-core-300, and everything is orange to brown by betweenness. Log scale, 0 to 0.138. That's... not what I'm asking about. There's no Louvain colour in this stack. I don't see how this helps me with the groups. Skipping. The histogram with 'on a straight scale 289 of 300 proteins would share the lightest colour' is actually nice, but not for this question."

### 4. Inspector on a set

"OK, here's a set called 'DNA repair', 30 nodes, rule 'module = DNA re...'. And a button 'Compare with the rest'. That's exactly what the question is. But it's for DNA repair, not Community 1. How do I get Community 1 as a set? The table didn't have a button for that. Maybe I'd go through 'Sets and paths', the plus, and write a rule like community = Community 1. I'm guessing."

"Wait, the colours changed. Here the ribosome cluster on the right, with RPL28 and RPS8, is light blue. On the Louvain screen that same blob was orange and Community 2, the proteasome, was light blue. And here orange is Proteasome. So light blue means ribosome on one screen and proteasome on the other. If I'd flipped between these without reading the legend I'd have mixed them up. This colour-by-module is a different style, OK, but same palette, different meanings."

"Statistics for this set: 105 edges inside, 42 edges out. 'Members by degree': TP53 32, #2 of 300. Fine. If I could get this panel for Community 1 and hit 'Compare with the rest', that'd probably be the answer. I can't tell from the picture what the comparison shows."

### 5. Node table, ranked

"This is the node list sorted by PageRank. Community column is here, so I could sort or filter by community. AKT1 is 'Unassigned' for module and 'Community 1' -- so yes, confirmed, AKT1 is in the ribosome community but isn't a ribosome gene. MAPK1 and TP53 top on all three measures. That's a hub-gene question, not my question. It does show there's no log2FC column in this view though -- my fold change is only in the communities table as a mean."

### 6. Comparison view

"Payments network review? Accounts? That's a completely different dataset. PageRank vs betweenness scatter. Not relevant to proteins. I'd close it."

## Answer given

"Eight real clusters plus two single proteins that don't connect to anything (GSK3B and NOTCH1). The clusters line up with the module labels in the file: ribosome, proteasome, complex I, spliceosome, MAPK signalling, TGF-beta, cell cycle, DNA repair. The biggest, Community 1, is 62 proteins and almost all ribosome (56 of 62). It's the one that isn't changing: mean log2FC +0.02 against +0.09 for everything else, where the proteasome cluster is up about 0.3. It's also the loosest of the eight clusters and has the most connections going out, and its top-degree node is AKT1, which isn't ribosomal. But I wouldn't say 'unchanged' in a paper from a mean. I'd want counts of significant genes up and down."

(Moderator's fixture for the biggest community: 62 proteins, 232 edges inside, 93 out, mean log2FC +0.02 vs +0.09, 56 of 62 from the Ribosome module. The answer matches.)

## Single Ease Question

5 out of 7.

"Finding the groups was easy, the panel says ten communities right away and the run record has what I need for methods. Getting 'how is it different' took the table, and the table does answer it. I lose points because the fold change is only a mean with no padj, the module isn't an enrichment, AKT1 as a ribosome hub looks wrong, two of the screens were other datasets, and the colours swap meaning between the Louvain view and the module view."

## Would she use this instead of her current tool?

"For looking, maybe. That communities table is better than what I get in Cytoscape -- there I'd have MCODE clusters and then go to g:Profiler cluster by cluster and build this table myself in Excel. Here it's one table with the fold change on it. And the run record with seed and cutoff I'd genuinely use."

"But it's Louvain, not MCODE or MCL, and my lab protocol says MCODE. There's no enrichment with an FDR, so I'd still leave to do the part a reviewer actually asks about. And the 'module' column comes from somewhere I can't see. So: I'd use it to look at the clusters quickly, and the paper figure and the enrichment stay in Cytoscape and g:Profiler. How would I even cite it?"

## Observations for the studio

- Both halves of the task are answered by one table (communities: size, inside/out edges, density, fold change vs the rest, hub, dominant module). The participant reached it through the only link that sounded like "more", and reached the correct answer.
- Fold change as a single mean read as untrustworthy to a biologist: it can hide equal up and down regulation, and there is no significance count. She asked for "how many significant, up and down".
- "Hub: highest degree" named a non-member protein (AKT1) as the ribosome community's hub; she read that as the classic hub-gene artefact and would expect a reviewer to question it.
- "Module, from the file" was read as an annotation of unknown source, not as enrichment; she could not cite it.
- The two views reuse one palette with swapped meanings: orange is Community 1 (the ribosome cluster) under Louvain colour but Proteasome under module colour, and light blue is Community 2 (proteasome) under Louvain colour but Ribosome under module colour. She caught it only by reading the legend.
- No visible way to turn a community row into a set, so the inspector's "Compare with the rest" -- which she recognised as exactly the task -- stayed out of reach for Community 1.
- The canvas legend shows 4 of 10 communities ("6 more").
- The style list and comparison screens showed other projects (stress response, payments) and were dismissed as irrelevant.
