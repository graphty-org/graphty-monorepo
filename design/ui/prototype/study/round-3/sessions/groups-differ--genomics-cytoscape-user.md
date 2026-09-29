# Session: what groups are there, and what makes the biggest one different

Participant: Maren, cancer-genomics postdoc, Cytoscape user (persona: `study/personas/genomics-cytoscape-user.md`).
Task as given by the moderator: "What groups are there in this network, and what makes the biggest one different?"
Screens, in the order she met them: the Results panel (the finished Louvain result, then its groups in the table), the group inspector with the comparison against the rest (from the styles-list page), and the group and member views in the inspector.

What she saw (study view, design notes hidden), rendered at 1440 x 900:

- `shots/study/round-3/sessions/shots-maren-groups/rp-louvain.png` -- the Louvain result in the Results panel, with its run record open
- `shots/study/round-3/sessions/shots-maren-groups/rp-louvain-table.png` -- the communities table under the canvas
- `shots/screens__styles-list-group-compare.png` -- Community 1 compared with the rest
- `shots/study/round-3/sessions/shots-maren-groups/insp-group.png` -- Community 4 in the inspector
- `shots/study/round-3/sessions/shots-maren-groups/insp-group-row.png` -- one member of Community 4 selected in the table

## Transcript (think-aloud)

**1. The Results panel, Louvain already finished.**

"OK, 'Human protein interactions', 300 nodes, 1,262 edges. That's about the size of my STRING networks. Groups... in Cytoscape I'd go to Apps, clusterMaker, MCODE or MCL. Here on the left there's 'In this project': Connected components, 3; Louvain, 10; Betweenness. So somebody already ran Louvain. Ten. Ten groups.

I'm looking at the Catalog under Community for MCODE or MCL -- Girvan-Newman, Label propagation, Leiden, Louvain. No MCODE. No MCL. I've heard of Louvain, I think it's what the single-cell people use. Fine, I'll take it, but I'd have to explain it in methods because the lab protocol says MCODE.

There's a box over the network -- 'Run record, Louvain' -- method, seed 7, 'weight conversion: confidence used as given, 0.40 to 0.99'. Oh, that's the STRING confidence score. And there's a Copy button. That's the methods paragraph. That is honestly the thing I always end up typing in by hand. Good. But it's sitting on top of my network, I'll close it."

(Clicks the X on the run record.)

"Under 'Groups': 10 communities, modularity 0.716, 'the file's modules' 0.663, largest 62 proteins, single proteins 2, no interaction. I don't know what modularity is in numbers -- higher is better, I assume? And what's 'the file's modules'? Which file? My STRING export doesn't have modules. I'll skip that. 'Largest 62 proteins' -- that's the biggest one, good, that's half my question. 'Communities table' -- that's a link, I'll click it."

**2. The communities table.**

"OK. This is actually what I wanted. One row per community, sorted by size. Community 1, 62, then 43, 36, 36... down to Community 9 and 10 which are one protein each -- GSK3B and NOTCH1, on their own. Hm, NOTCH1 with no interactions is a bit surprising but OK, maybe it just didn't pass the cutoff.

The 'module' column -- 'from the file; most members'. Community 1: Ribosome, 56 of 62. Community 2 Proteasome, 3 Complex I, 4 Spliceosome, 7 Cell cycle, 8 DNA repair. So the groups line up with complexes. That's what I'd say in the paper: 'cluster 1 is ribosomal'. Though a reviewer would ask me for an enrichment FDR, not 'most members'. Is this a GO term? A KEGG pathway? It says 'from the file', so whoever made the file put it in. I can't cite that.

Then 'hub, highest degree' -- Community 1, AKT1. Wait. AKT1 in the ribosome group? AKT1 is a kinase, it's not a ribosomal protein. Maybe Louvain just threw it in there because it touches everything. But if I put 'AKT1 is the hub of the ribosome cluster' on a slide my PI will stop me. Looking at the picture, AKT1 is labelled up in the middle next to HSP90AA1, not down in the orange ribosome blob with RPS8 and RPL23. So is it in the group or not? I'd have to click it to check.

log2FoldChange, 'mean, vs the rest': Community 1 +0.02 vs +0.09. So the ribosome group is basically not changed. Community 9, GSK3B, +0.54, but that's one gene.

Colours: Community 1 is orange, Community 5 is a darker orange, Community 8 is yellow. On the network the orange and the yellow are close; I had to look twice to find which blob is 8. And 9 and 10 are both the same dark grey. The legend only shows four and then '6 more'. For my PI -- he's colour-blind -- orange next to yellow is not great, but at least it's not red-green."

**3. Getting to 'what makes it different'.**

"So what makes Community 1 different. The table gives me a mean fold change and a density. I want to compare it with everything else. In Cytoscape I'd select the cluster, make a subnetwork, and look at the node table. Here... there's 'Compare with...' in the Louvain panel. Compare with what? Another clustering? I'm not going to click something that might start a run.

I'll click Community 1 in the legend."

(She clicks 'Community 1' in the legend; the inspector on the right shows the group. She lands on the comparison view.)

"OK, 'Community 1, Community'. Created from Louvain run, seed 7. Size 62 proteins, edges inside 232, edges out 93, density 0.123. 'Compared with the rest. Descriptive only; no statistical test. 62 proteins in Community 1, 238 in the rest.' Fine -- at least it tells me the counts, 62 plus 238 is 300, nothing dropped.

log2FoldChange: little dot plot with two boxes, group and rest. Median -0.02 for the group, 0.05 for the rest. Wait -- the table said +0.02 for this group. Here it's -0.02. Oh, the table was the mean and this is the median. OK, but that's two numbers for the same question, and one is positive and one is negative. If I copy the wrong one into the results section it flips direction. Either way it's basically zero, and the boxes overlap completely.

'rank-biserial r -0.02, effect size, not a significance test.' I have no idea what rank-biserial is. It's underlined, so I'd hover -- 'how far this group's values sit above or below the rest's, near 0 they overlap'. OK, so near zero, same thing. Reviewers are going to want a p-value, and it's telling me there isn't one on purpose. I get why. I'd still get asked.

Degree: median 9 vs 8. So the ribosome proteins have slightly more partners. That's not a finding, ribosomal proteins always cluster in STRING because they're all in one complex.

'Enrichment analysis isn't part of graphty.' Copy members. So for the actual answer -- what is this group, biologically, with an FDR -- I copy the 62 genes and paste them into g:Profiler. Same as what I do now. At least it says so instead of hiding it."

**4. Checking one member.**

"Let me check that AKT1 thing. I'll open the group's members."

(She uses the inspector's member list on a group; on the Community 4 view she sees 'Members, by degree: UBB 21, PRPF8 12, SF3A3 11, 33 more members'. She opens a member row; the table shows the group's members.)

"This is Community 4, the spliceosome one. The top member by degree is UBB -- ubiquitin -- and the module column for UBB says 'Unassigned'. Then PRPF8, SF3A3, U2AF2, SNRPA, those are spliceosome, that's right. So same thing as AKT1: the 'hub' of each group is the promiscuous protein that interacts with everything, not something from the complex. Ubiquitin and AKT1 bind half the proteome in STRING. If I took 'hub' at face value I'd pick exactly the genes every reviewer rolls their eyes at.

I like that the table filters to the group -- 'Community 4: 36 nodes, 1 selected. Sorted by degree.' -- and 'Show filtered graph'. That's my subnetwork. Does it keep the full network too? It says Full graph at the top, so I think yes."

**5. Her answer to the moderator.**

"There are ten groups, eight real ones and two single proteins. They match complexes: ribosome, proteasome, complex I, spliceosome, MAPK signalling, TGF-beta, cell cycle, DNA repair. The biggest is the ribosome group, 62 proteins. What makes it different? Honestly, from this: not much. Its fold change is about zero, same as everything else, it's a bit denser and a bit more connected. It's different because it's the ribosome -- which I got from a column somebody put in the file, not from an enrichment. And its 'hub' is AKT1, which I don't believe belongs there."

## After the task

**Single Ease Question: 5 of 7.** "Finding the groups was easy -- the table with sizes and the module column was the quickest I've ever seen that. Answering 'what makes it different' was harder: I had to guess where the comparison was, the table and the side panel gave me different fold-change numbers, and the real answer needs an enrichment I have to go and do somewhere else."

**Would she use it instead of Cytoscape?** "For looking around, maybe. The communities table and the run record with the Copy button, I'd actually use -- I type that stuff in by hand every time. But my clustering is MCODE and it's not here, the enrichment isn't here, and the 'hub' column just gives me the most connected protein, which in STRING is always ubiquitin or AKT1. So I'd explore here, copy the member lists out to g:Profiler, and the figure would still get made in Cytoscape because that's what the protocol says and what reviewers recognise. And what does it prove? That ribosomal proteins bind each other. I knew that."

## Problems observed

1. **The group comparison says a different fold change from the table.** The communities table shows Community 1 as "+0.02 vs +0.09" (mean); the group's comparison shows "-0.02" vs "0.05" (median). Same group, same column, opposite signs. She worked out the reason only by reading the small print, and would risk quoting the wrong one. Severity 3.
2. **Enrichment is missing, and the module column is not a substitute.** "Ribosome 56 of 62" comes from the file, with no FDR and no source term, so she cannot cite it. The comparison ends with "Enrichment analysis isn't part of graphty. Copy members", which is honest but sends her back to her old tool for the step that answers the question. Severity 3.
3. **The "hub" column names promiscuous proteins that are outside the group's biology.** AKT1 is the hub of the ribosome group and UBB of the spliceosome group (UBB's module is "Unassigned"). On the canvas AKT1's label sits in the middle of the network, not in the ribosome cluster, so she could not tell whether it really belongs to the group. It undermined her trust in the column. Severity 2.
4. **No obvious way from the table or the Louvain panel to "compare this group with the rest".** "Compare with..." in the Louvain panel reads as "compare with another result", and she avoided it for fear of starting a run. She reached the comparison by clicking a legend row, a guess. Clicking a table row does not visibly offer it. Severity 2.
5. **MCODE and MCL are not in the catalog.** Her lab protocol names MCODE; she took Louvain but would have to justify the switch in methods. Severity 2.
6. **The community colours are hard to tell apart.** Community 1 (orange), Community 5 (darker orange) and Community 8 (yellow) look alike on the canvas; Communities 9 and 10 share one dark grey; the legend shows four and hides six behind "6 more". Severity 2.
7. **"Rank-biserial r" and "no statistical test" leave her exposed to reviewers.** The one-line meaning on hover helped, but she expects a reviewer to ask for a p-value. Severity 2.
8. **"Modularity" and "the file's modules" are unexplained on first sight.** She did not know which file was meant, and skipped the numbers. Severity 1.
9. **The run record opens on top of the network in the finished-result view**, so she had to close it before she could see the groups. Severity 1.

## What worked

- The communities table: sizes, the two single-protein groups named, sorted by size, a module column. "The quickest I've ever seen that."
- The run record with Copy: method, seed, how confidence was used, the engine. "That's the methods paragraph."
- "62 proteins in Community 1, 238 in the rest" -- the counts add up, so nothing was silently dropped.
- Filtering the table to one group with "Show filtered graph" read to her as a subnetwork that keeps the full network.
- It says plainly that enrichment is not included, instead of pretending.
