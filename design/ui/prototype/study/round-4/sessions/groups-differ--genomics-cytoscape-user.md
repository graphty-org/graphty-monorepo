# What groups are there, and how is the biggest one different -- Maren

**Participant:** Maren, cancer-genomics postdoc and her lab's de facto bioinformatician. Uses
Cytoscape with stringApp, MCODE and cytoHubba two or three times a month; DESeq2 in R. Playing on a
14-inch laptop (1440 x 900).

**Task as given by the moderator:** "On the protein network, what groups are there, and how is the
biggest one different from the rest?"

**Screens seen:** the protein network with a finished Louvain result and its run record open; the
same result with its "Communities table" open in the bottom table; a different project ("Stress
response study") coloured by betweenness; the "DNA repair" set open in the right panel; the node
table with TP53 selected. She also stepped through a community with the right panel's arrows
(Community 4), looked at a "Compared with the rest" panel for Community 1, and opened one page that
turned out to be about payments.

Renders the participant looked at:
- `../../../shots/tasks/groups-differ/01-results-panel-louvain.png`
- `../../../shots/tasks/groups-differ/02-results-panel-louvain-table.png`
- `../../../shots/tasks/groups-differ/03-styles-list.png`
- `../../../shots/tasks/groups-differ/04-inspector-set.png`
- `../../../shots/tasks/groups-differ/05-table-dock-ranked.png`
- `../../../shots/r4-maren-groups-inspector-html-group.png` (Community 4, reached with the arrows)
- `../../../shots/r4-maren-groups-styles-list-html-group-compare.png` (Community 1 compared with the rest)
- `../../../shots/r4-maren-groups-comparison-html.png` (opened, left)

## Think-aloud

**The network with the Louvain result.** "OK, it's already clustered. Coloured blobs. Louvain --
I've heard of it, it's not what we use, we use MCODE. Or MCL. Reviewers know MCODE. I'd have to
explain why Louvain in the methods, and I don't know what I'd write."

"Right side. 'on: full graph, 300 nodes, 3 components.' Three components? Then 'single proteins: 2,
no interaction.' OK so that's the two dots floating on their own down there and up top. Fine, it
told me. In Cytoscape I'd drop those first -- largest component. I don't see a button for that here,
but it's two proteins, I'm not going to fight about it."

"'Groups: 10 communities.' Ten. But two of them are single proteins, so really eight. Why call a
protein with no partners a community? That's going to confuse anyone I show this to."

"'modularity 0.716.' Is that good? I don't know what good is. 'the file's modules 0.663' -- I
guess the file came with module labels and this is the same score for those? So the clustering
beat the labels that came with it? Maybe. I'm guessing."

"'Weight: confidence, used as similarity.' 0.40 to 0.99 -- that's the STRING score. Good, it used
it, and it says it used it. In Cytoscape I'd have to remember whether I ticked that."

*Reads the Run record popup.* "Method, seed 7, resolution 1, confidence 0.40 to 0.99... 'Copy'.
That's basically my methods sentence. I'd rewrite it, I always rewrite it, but at least every
number is in one place. Seed is nice -- when reviewer 2 asks, I get the same clusters back."

"This box is sitting on top of the blue cluster, though. I can't see it. I'll close it."

"The legend: Community 1, 62. Community 2, 43... 'Community 1' means nothing to me. If this goes in
a figure it has to say what the cluster IS. And '6 more' -- I can't see all of them. So I don't
know yet what any group is. I need a table."

**Communities table.** "There. That's the thing I wanted. One row per cluster. Size, edges inside,
edges out, density, log2FoldChange, hub, module. OK."

"Module column -- 'from the file; most members'. Community 1, Ribosome, 56 of 62. Community 2,
Proteasome 40 of 43. Complex I, Spliceosome, MAPK signaling, TGF-beta, Cell cycle, DNA repair 29 of
29. OK -- so these are real biology. That's my answer to the first half: eight clusters, and they're
ribosome, proteasome, complex I, spliceosome, MAPK, TGF-beta, cell cycle, DNA repair, plus the two
loners, GSK3B and NOTCH1."

"Wait, GSK3B has no interaction? In STRING? GSK3B talks to everything. That's the file, not the
tool, I guess -- but I'd want to know which of my genes didn't connect, and here at least it names
them. Good."

"Now the biggest. Community 1, 62 proteins, Ribosome. How is it different. Edges inside 232, edges
out 93 -- the most edges out of anything. Density 0.123. That's the lowest of all of them. So it's
the biggest and the loosest. Everything else is 0.17 to 0.25."

"log2FoldChange, 'mean, vs the rest': +0.02 vs +0.09. So the ribosome cluster basically isn't
changing. Honestly -- that's the answer I'd expect. Ribosomal proteins always cluster in STRING,
they're all co-expressed with each other, a reviewer would say it's a housekeeping blob."

"But mean fold change of 62 genes? One outlier moves that. And is that all 62 or just the
significant ones? There's no padj here. In my data half the ribosome would be non-significant and
I'd want 'how many up, how many down', not an average."

"Hub column. 'highest degree'. Community 1 -- AKT1. AKT1 is not a ribosomal protein. Community 2,
proteasome -- UBC. Community 3, complex I -- MYC. Community 4, spliceosome -- UBB. Those are the
sticky ones, the ones that connect to everything in STRING. So the 'hub' of the ribosome cluster is
AKT1? If I put that in a paper someone will laugh. Those hubs are sitting in the middle of the
picture, between the clusters -- I can see it in the network. They're not really IN any cluster,
Louvain just had to put them somewhere."

"Hm. Actually that is kind of interesting. Maybe that's why the ribosome cluster is the loose one:
it swallowed AKT1 and HSP90AA1 and they bring all those outside edges with them. I'm guessing. I'd
want to see the cluster without them. I don't see how."

*Tries to click the Community 1 row.* "Nothing happens. I want to open this cluster -- which 6
aren't ribosomal? Where are they?" *Looks at the legend.* "Maybe the legend."

**Stepping through a community (right panel, Community 4).** "OK, clicking a colour in the legend
gives me the cluster on the right. 'Community 4, 4 of 10', and arrows. So I can step to Community 1.
Members by degree, UBB first, then '33 more members'. log2FC -0.10 mean, rest of graph +0.10. Same
numbers as the table, good, it's not making up a second answer."

"'Keep as set' -- that's like making a subnetwork? I'd want the cluster as its own network, side by
side with the full one, like in Cytoscape 'new network from selection'. This isn't quite that. I'm
not sure what a 'set' is here."

**Compared with the rest (Community 1).** "Oh. Now there's a 'Compared with the rest' section. But
-- the project name changed. 'Stress response study', 'ppi-core-300'. Before it was 'Human protein
interactions', 'Interactions'. Is this the same network? Same picture, same 62, same 232, same 93...
I think it's the same. But if I were working with my own data and the name changed under me, I'd
stop and check. That's how I get burned."

"'Descriptive only; no statistical test.' OK, honest. Two box plots, group and rest. log2FC median
-0.02 for the group, 0.05 for the rest. The table said mean +0.02 vs +0.09. So now it's a median
and a different number. Both fine I guess, but a reviewer is going to ask me which one I reported.
'rank-biserial r -0.02' -- no idea what that is. 'effect size, not a significance test.' So, near
zero means no difference? I'll assume that."

"Degree -- median 9 vs 8. So the ribosome cluster isn't more connected per protein. It's just
bigger."

"'Enrichment analysis isn't part of graphty.' 'Copy members.' OK, at least it says so instead of
pretending. So I copy the 62 into g:Profiler. Which is what I do now anyway -- per-cluster
enrichment. So I leave. Again."

**The brown network (betweenness, same "Stress response study").** "Now everything's brown. Colour:
betweenness. I don't know what that is. 'Orange to brown', log scale... I don't know what this has
to do with my clusters. The clusters are gone -- I can't see the groups at all. Skipping."

**DNA repair set.** "'DNA repair, rule, 30'. But the table said community 8 is DNA repair 29 of 29.
So there's a 30th DNA repair gene somewhere else. Which one? It doesn't say, and I can't compare
this to the community from here."

"And now the colours are different. The legend says Ribosome is light blue, Proteasome orange. Two
screens ago orange was Community 1 -- which was the ribosome. Now orange is the proteasome. Same
colours, different meaning. If I'm flipping back and forth between these, I will absolutely mix them
up. I'd notice eventually. Maybe."

"'Statistics: edges inside 105, edges out 42.' Different from the community. Fine, it's a different
group. Not what I asked."

**Node table, TP53 selected.** "This is the node table. id, module, community, degree, rank,
betweenness, pagerank. TP53 -- DNA repair, Community 8, degree 32, number 2 of 300. MAPK1 number 1.
The 'Communities: Louvain' tab is here too, so I could get back to my cluster table. OK."

"So the top ones by degree -- MAPK1, TP53, YWHAZ, CDK1, AKT1, UBB, MYC -- and look, module
'Unassigned' for most of them. There it is: the file doesn't put AKT1 or UBB in any module, but
Louvain stuck them in Community 1 and 4. That's what I saw on the table. So the hub column in the
Communities table is really showing me the unassigned connector proteins. I'd not put that column
in a figure."

**Comparison page.** *Opens it.* "Payments network review? Accounts? This is a bank thing. Not mine.
Back."

## Her answer

"There are eight real clusters plus two proteins with no interactions. By their annotation they're
ribosome, proteasome, complex I, spliceosome, MAPK signaling, TGF-beta, cell cycle and DNA repair.
The biggest one is the ribosome cluster, 62 proteins, 56 of them ribosomal. It's different in that
it's the loosest -- lowest density, most connections to other clusters -- and it isn't changing:
fold change is about zero, same as the rest, and its proteins aren't more connected one for one. My
guess is it looks loose because AKT1 and HSP90AA1 got dumped into it, and those connect to
everything. I'd check that by taking them out, and I didn't see how."

"And I'd still need enrichment per cluster, which means leaving."

## Single Ease Question

**5 out of 7.** "The first half was quick. The Communities table with the module column answered
'what groups are there' in one click, and I didn't have to run MCODE and then go look each one up.
That's genuinely faster than what I do. The second half I had to piece together from a table with
means, a panel with medians, a number I don't understand, and a project that changed its name on
me. I got there. I'm not fully sure I got there right."

## Would she use this instead of Cytoscape?

"For looking? Maybe. The cluster table with the module and the density in one place is something I
can't get in Cytoscape without three apps and an Excel sheet, and the run record with the seed is
nice for reviewer 2."

"Instead of Cytoscape -- no. It's Louvain, not MCODE, so I'd have to defend that. There's no
enrichment, it says so itself, so I'd leave for that anyway. And how do I cite it? My PI won't
accept a figure from a tool nobody cites. I'd explore here and then go redo the clusters in
Cytoscape for the paper, because that's what the reviewers know. And honestly -- 'the ribosome
clusters together and doesn't change' is not something I needed a network for. The hub thing was
the only bit I couldn't have seen in a table."

## Problems observed

1. **The "hub" column names generic connector proteins as each cluster's hub.** Community 1 is 56
   of 62 ribosomal, but its "hub" is AKT1; the proteasome's is UBC, complex I's is MYC. She read
   this as misleading for a figure. The node table shows these proteins are "Unassigned" in the
   file's modules, and she only worked that out by cross-checking two screens.
2. **No way to test her own explanation.** She suspected the biggest cluster is loose because it
   absorbed AKT1 and HSP90AA1, and wanted to see it without them; she found no route.
3. **A row in the Communities table does nothing when clicked.** She reached a single community only
   by guessing that the canvas legend was clickable, then stepping with the arrows.
4. **"Compared with the rest" appeared under a different project name** ("Stress response study",
   "ppi-core-300" instead of "Human protein interactions", "Interactions"). She had to check the
   numbers by hand to trust it was the same network.
5. **Two summaries of the same difference disagree in form.** The table gives mean log2FoldChange
   (+0.02 vs +0.09); the comparison panel gives medians (-0.02 vs 0.05) and a rank-biserial r she
   did not understand. She asked which one she would report. Neither shows how many members are up
   or down, or uses the p-value she would filter on.
6. **Same colours, different meanings across screens.** Orange is Community 1 (ribosome) under the
   Louvain colouring and Proteasome under the module colouring; light blue swaps the other way. She
   expected to mix them up.
7. **Proteins with no interaction are counted as communities** ("10 communities", two of them single
   proteins). She wanted "8 clusters and 2 unconnected", and a way to keep the largest component.
8. **The legend names clusters "Community 1" to "4" and hides six behind "6 more".** Useless in a
   figure; the biological name is only in the table.
9. **Modularity 0.716 vs "the file's modules 0.663" has no reading.** She guessed at what it meant.
10. **The run record popup covers a cluster** on a 14-inch screen.
11. **Louvain is not the method her field reports** (MCODE, MCL); nothing helps her justify it or cite
    it in methods.
12. **Two screens on the way were off-task** (the betweenness colouring, which hid the clusters, and a
    payments comparison page); she skipped both.

What worked for her: the Communities table answered "what groups are there" in one click, with the
file's module named per cluster and a count ("56 of 62"); the two unconnected proteins named rather
than silently dropped; "Weight: confidence, used as similarity" with its range; the run record with
seed and a Copy button for methods; "Descriptive only; no statistical test" and "Enrichment analysis
isn't part of graphty" -- "at least it says so instead of pretending."
