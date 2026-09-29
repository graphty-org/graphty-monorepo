# Session: "What groups are there, and what makes the biggest one different?" -- Maren, genomics postdoc (Cytoscape user)

Participant: Maren, cancer-genomics postdoc who builds STRING networks in Cytoscape two or three times a month (persona: study/personas/genomics-cytoscape-user.md). Simulated participant.
Screens used: the Results panel, the Styles list, the Inspector (renders in shots/, clickable behaviour read from screens/*.html).
Screen size: 14-inch laptop, 1440 by 900.
Task as given by the moderator: "What groups are there in this network, and what makes the biggest one different?"

## Transcript (think-aloud)

**1. Landing on the Results panel (protein project, betweenness finished).**

> OK, "Human protein interactions", 300 nodes, 1,262 edges. That's a normal STRING-sized network, fine. It's all orange-brown, coloured by betweenness apparently. I don't care about betweenness right now. Groups. In Cytoscape I'd run MCODE -- or clusterMaker, MCL -- and it gives me a cluster table.

> Left side, "In this project": "Connected components 3". That's not what I mean. Three components is just the big one plus two strays -- I can see the two dots floating off on the right. I want modules.

> Scrolling the catalog... "Community": Girvan-Newman, Label propagation, Leiden, Louvain. No MCODE, no MCL. I've heard of Louvain, a lab mate used it in Seurat for single-cell clusters. Leiden too, that's the Seurat default now. I don't know Girvan-Newman. None of these say what they do. In the patent project they had times next to them, "under a minute", here they have nothing. Is that because they haven't been run or because they can't?

**2. Trying to run Louvain.**

> I'll click Louvain because it's the one I recognise. (Queued/not-run frames: the card shows Scope, Direction, Weight, Resolution 1.0, and "Its color layer is added when it runs.") Resolution 1.0 -- I'd leave it. Seurat people argue about resolution forever, I'm not going to. It says it'll add a colour layer. Good, that's what I want. Run.

> ...and I don't get to see what happens. (No finished community run exists in the prototype. The only Louvain frame in this project is "Out of date" with a Re-run link.) So I can't actually tell you what the result looks like. If I got this in real life -- a yellow exclamation mark saying my Louvain is "out of date" because "confidence is now read as a similarity" -- I'd honestly be worried. I didn't change anything. Out of date relative to what?

> Moderator note: participant was pointed to the Graph tab where the network's own module colouring already exists.

**3. The Graph tab / Inspector: module colours.**

> Oh, OK, this is more like it. It's coloured by "module" -- nine colours, and there's a little legend bottom-left: Ribosome 56, Proteasome 40, Complex I 35, Spliceosome 32, DNA repair 30, "4 more". Counts. I like the counts. So the answer to "what groups" is: nine modules, the biggest is Ribosome with 56.

> But wait -- where did "module" come from? Those are named. Ribosome, Proteasome -- someone already annotated these. Is that from a clustering, or did it come in with the file? Nothing says. If a clustering named them "Ribosome" I want to know how, because that's an enrichment call, not a cluster. If it came in with my table, fine, but then the tool didn't find the groups, I did.

> Colours: blue, orange, green, dark blue, red-orange, yellow, pink, black. Blue and orange next to each other, that's OK for my PI. There's a light-blue and a dark-blue though -- Ribosome and Spliceosome -- in a figure at print size those will be hard to tell apart.

> "4 more" -- I have to click to see four of nine groups. In a legend. For a figure I'd need all nine.

**4. What makes the biggest one different?**

> Now the second half. Ribosome is the biggest. What makes it different. In Cytoscape I'd select the cluster, make a subnetwork, then send it to g:Profiler or run enrichment from stringApp and see "translation, rRNA processing", and I'd look at the fold changes.

> On the left, under "Sets and paths", there's "DNA repair -- rule -- 30". No Ribosome set. So somebody made a set for DNA repair but not for the biggest one. If I click DNA repair (Inspector, set frame) I get this really nice right panel: edges inside 105, edges out 42, neighbors out 40, average degree 8.4, members by degree TP53 32, BRCA1 13, WRN 13. That's genuinely useful -- inside versus out is exactly "how tight is this module". I'd want that for every module in one table, side by side, so I can say "Ribosome is the densest".

> But for Ribosome I'd have to make the set myself. The rule says "module = DNA repair" and "From: Same value as TP53". So I guess I'd click a ribosomal protein -- RPS8? -- and do "same value as" to get the Ribosome set. I'm guessing. I don't see a button on the TP53 inspector that says that; there's Select neighbors, a funnel, a pin.

> And even if I get it: edges inside, edges out, average degree. That tells me it's dense. It doesn't tell me what's different biologically. Where's the fold change? The Attributes list on the graph says log2FoldChange -2.52 to 3.15 for the whole network. I want: is Ribosome mostly up or mostly down? Mean log2FC per module. That's the sentence in my paper -- "the ribosomal module was coordinately downregulated". I can't see that anywhere without clicking through 56 proteins.

> The Styles list: I could turn the module colour off and colour by log2FoldChange, then eyeball the ribosome blob. That's what I'd do in Cytoscape too, honestly. But that's eyeballing, not a number.

> And enrichment -- there's none. No GO, no KEGG. For me "what makes it different" IS the enrichment. If I have to export the Ribosome gene list to g:Profiler, I'm leaving the tool for half of the question.

**5. Wrap-up.**

> So: groups -- yes, nine modules, Ribosome biggest at 56, I got that from the legend in about a minute once I was on the right tab. What makes it different -- I got "it's big" and, for the one module that happened to have a set, "tight inside, 105 edges in versus 42 out". I did not get fold change per module or any enrichment. I'd call it half-answered.

## Single Ease Question

3 out of 7.

> The first half was easy once I found the colours. The second half I basically had to invent a route for, and the tool I'd actually click -- Louvain -- never showed me a result.

## Would she use this instead of Cytoscape?

> For looking around, maybe. The inside/outside edge counts on a set are nicer than anything I get in Cytoscape without a plugin, and the legend with counts is good. But the question "what makes this cluster different" is an enrichment question, and it isn't here. So I'd do clustering in Cytoscape with MCODE and stringApp's enrichment because that's what the protocol says and what I can cite. I'd maybe open this to poke at it. The paper figure stays in Cytoscape.

## Problems observed

1. No finished community-detection result anywhere: Louvain can be queued or be "out of date", but the participant never sees what a run produces (groups, counts, a colour layer). Severity 3.
2. Community algorithm names (Girvan-Newman, Label propagation, Leiden, Louvain) carry no one-line meaning and, in the protein project, no time estimate; "Connected components 3" sits first and reads like the answer but is not what a biologist means by groups. Severity 2.
3. The "module" attribute is already named (Ribosome, Proteasome) with no provenance: she cannot tell whether it was computed, imported, or enrichment-derived, so she cannot write it into methods. Severity 3.
4. Per-group comparison is missing: inside/outside edges exist only for a set someone already made (DNA repair); the biggest group has no set and there is no table of all groups side by side. Severity 3.
5. No per-group summary of a data column (mean or share up/down of log2FoldChange) -- the biological "what's different" she actually needs. Severity 3.
6. No enrichment per group; answering the question requires leaving the tool. Severity 3 (persona-level objection, outside the current design's scope).
7. The legend truncates to "4 more" of nine groups; light blue vs dark blue (Ribosome vs Spliceosome) hard to tell apart. Severity 2.
8. "Out of date" on Louvain after "confidence is now read as a similarity" alarms her: she did not knowingly change anything. Severity 2.
9. How to make a set from one group ("Same value as TP53") is not discoverable from a node's inspector. Severity 2.

## Quote

> "Nine modules, Ribosome's the biggest -- fine, I got that from the legend. But 'what makes it different' is fold change and enrichment, and neither is here. The 105 edges in versus 42 out is nice, but only for the one module somebody already made a set for."
