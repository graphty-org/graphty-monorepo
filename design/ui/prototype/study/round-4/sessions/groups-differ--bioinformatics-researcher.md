# Session: "What groups are there, and how is the biggest one different?" -- Dr. Chen, computational biologist

Participant: Dr. Chen, group leader in a translational institute that partners with a pharma
company (persona: study/personas/bioinformatics-researcher.md). Laptop on a 27-inch monitor, Chrome.

Screens used, in the order she met them (participant view): the Louvain result in the right panel
(screens/results-panel.html#louvain), the same result with its communities table open in the
bottom dock (#louvain-table), the style stack (screens/styles-list.html), a set selected in the
inspector (screens/inspector.html#set), and the node table ranked by three measures
(screens/table-dock.html#ranked). She also looked at the comparison page (screens/comparison.html).
After the task, the moderator showed one more state as a probe: a community selected with
"Compared with the rest" (screens/styles-list.html#group-compare). Her reaction to it is recorded
separately at the end, because the task's own path never reached it.

Moderator's task, as given: "On the protein network, what groups are there, and how is the
biggest one different from the rest?"

## Transcript (thinking aloud)

### 1. The Louvain result (right panel)

"OK. Human protein interactions, 300 nodes. Somebody has already run Louvain, it is colored by
community. Fine. Before I look at the picture I look at the right side, because the picture is the
part I do not trust."

"'on: full graph, 300 nodes, 3 components. Seeded. Undirected. CPU.' Then 'Weight: confidence, used
as similarity.' Good -- that is the first thing I would ask. If it had treated the STRING score as
a distance I would have got the opposite partition and not known."

"Groups: '10 communities'. Modularity 0.716. And 'the file's modules 0.663'. Hm. So the module
column that came in with the file, if you scored it as a partition, is less modular than what
Louvain found. That is a nice touch, actually; it stops me from confusing the two. But where did
'the file's modules' come from? It is a GraphML. Is that a Reactome annotation somebody put in?
A KEGG pathway per gene? I would want to know what version. The screen does not say and it is not
its job to know, but I would write it in my notes."

"'largest 62 proteins'. 'single proteins 2, no interaction'. So ten communities, but two of them
are one protein each with no edges. So really eight groups. OK, and three components -- the main
one plus those two isolates. That adds up."

"Options: Scope full graph, weight confidence, resolution 1, seed 7. Runs: 1, 0.4 s. I click
'Details' next to Seeded."

"Run record. Method: 'Louvain, weighted modularity, resolution 1'. Seed 7. Damping 'Does not
apply' -- fine, it is a generic form. 'Weight conversion: confidence used as given, 0.40 to 0.99,
as similarity: higher = stronger link.' 0.40 is STRING's medium cut-off. I usually go to 0.7, but
at least it tells me the range, so I know what the file contains. Numbering 'by size, largest
first; a protein with no interaction is a community of its own'. Good, that tells me Community 1
is the biggest and that the number means nothing biologically. 'Copy' at the top -- I would paste
that straight into the methods section. That is the right idea."

"What I do not see: which Louvain. Is it the igraph one, the Blondel original, one pass or until
convergence? Louvain is known to give badly connected communities; that is why everybody moved to
Leiden. I would at least want 'Leiden' next to it. And there is exactly one run. One seed is one
sample. Nothing tells me whether seed 8 gives me the same ten groups."

"The legend on the canvas shows Community 1 to 4 and '6 more'. The picture: the amber one on the
right, around RPL28, RPS8, RPL23 -- ribosomal proteins. So Community 1 is the ribosome, I would
guess. I do not want to guess, I want the table."

### 2. The communities table (bottom dock)

"'Communities table'. I click it. A tab opens in the bottom: 'Communities: Louvain'. 'Full graph:
10 communities, 2 of them a single protein. Sorted by size.' Oh, this is what I wanted."

"Columns: size, edges inside, edges out, density inside, log2FoldChange mean vs the rest, hub
highest degree, module 'from the file; most members'. Right, let me read Community 1: 62 proteins,
232 edges inside, 93 out, density 0.123, log2FoldChange +0.02 vs +0.09, hub AKT1, module Ribosome,
56 of 62."

"Let me check the numbers add up, because that is what I would do in R. Edges inside across the
eight real communities: 232, 156, 142, 104, 109, 82, 97, 104 -- that is 1,026. Edges out: 93, 56,
63, 44, 59, 60, 56, 41 -- 472, and each crossing edge is counted from both ends, so 236 edges
between communities. 1,026 plus 236 is 1,262. Hmm -- where did I see 1,262... the overview on the
styles page said 1,262 edges. Good, it reconciles. Density for Community 1: 232 over 62 times 61
over 2, 1,891 -- 0.123. Correct. I am a little impressed; most tools would not survive that."

"So the answer to the question. What groups: eight real communities plus two isolated proteins,
GSK3B and NOTCH1. And the file's module column maps almost one to one: Ribosome, Proteasome,
Complex I, Spliceosome, MAPK signalling, TGF-beta, Cell cycle, DNA repair. MAPK signalling is 31
of 31, DNA repair 29 of 29. Louvain has basically rediscovered the annotation, which is
reassuring, or suspicious if the annotation was used to build the network. I would want to know."

"How is the biggest one different. Look down the density column: Community 1 is 0.123, and every
other real community is 0.165 to 0.256. So the biggest one is the loosest. And it has the most
edges out, 93. Honestly -- that is backwards for a ribosome. In real STRING the ribosome is almost
a clique, it is the densest thing in the network. So either this is not STRING, or something has
been glued onto it. And the hub is AKT1. AKT1 is not a ribosomal protein. Its module says
'Unassigned' in the node table. So the 'hub' of the ribosome community is a kinase that is in
every paper. That is exactly the study-bias hub I complain about: Louvain pulled a promiscuous
hub into the biggest module, and the table calls it the hub of that module. Same pattern, by the
way: MYC is the 'hub' of Complex I, UBC of the Proteasome. The table is honest, it says 'highest
degree', but a student would read 'hub' and write it in the paper."

"And the singletons: 'hub: GSK3B' for Community 9, with zero edges. A hub with degree zero. That
should be a dash."

"Expression: '+0.02 vs +0.09'. So the biggest group is not different in expression, it is flat.
The one that is different is Community 2, the proteasome: +0.29 against +0.04. That is the
interesting row, not the biggest one. But a mean of log fold change is not what I would report.
I would want how many are significantly up and down, with the adjusted p-value cut-off, or at
least a test. Mean of +0.02 versus +0.09 over 62 genes -- is that anything? The table does not
claim it is, which I respect, but it gives me nothing to say whether it is not."

"'Export table...' at the top right. For this table that is the thing I need: the ten rows as a
TSV I can join in R. I do not know what format it gives me. I would also want the per-node
membership, and I think that is the Nodes tab. Fine."

"What I cannot do here: enrichment. The 'module' column is whatever was in the file. I cannot run
GO BP or Reactome per community and get an FDR. So I cannot 'name' Community 1 with a statistic;
I can only say '56 of 62 carry the Ribosome label'."

### 3. Selecting the biggest community

"Now I want Community 1's genes as a list. I click its row in the table."

(The next screen she is shown is the style stack with a betweenness coloring.)

"Wait, where am I. The project is called 'Stress response study' now, the graph is 'ppi-core-300'
instead of 'Interactions', and everything is orange-brown -- 'Betweenness color', log scale. The
sets on the left are different too: 'Hubs, degree 17 to 34', 'TP53 neighbors', 'Down in stress'.
Is this the same project? I did not ask for betweenness. I clicked a community."

"I'll read what is here anyway. Overview: 300 nodes, 1,262 edges, 3 components, density 0.0281 --
that is where I got 1,262. Style stack: Betweenness color on top, Hub labels, Size: degree, Base
style. 'Top wins each property it sets.' OK, layers, like Cytoscape's style but stacked. The
betweenness popover is careful -- log scale, 'Each value is divided by 0.000077, the smallest above
0, before the log', 10 proteins at 0 drawn lightest, a histogram of the domain. That is good work,
honestly, and 'On a straight scale 289 of 300 proteins would share the lightest of the 5 colors'
is the kind of sentence I would put in a figure legend. But it has nothing to do with my
question. There is nothing on this screen about communities except that 'Louvain color' is not in
this stack at all."

(Moderator moves her on.)

### 4. The inspector with a set selected

"OK, a group is selected. 'DNA repair, 30 nodes, Rule set.' Not Community 1. The rule is 'module
= DNA re...', truncated. 'Created from: Same value as TP...' -- same value as TP53, I suppose; I
can't read the rest. So somebody made a set from TP53's module value. That is a useful trick,
actually, 'all the genes with the same annotation as this one'. But I wanted Community 1."

"Still -- statistics: edges inside 105, edges out 42, neighbors out 40, average degree 8.4. Members
by degree: TP53 32, '#2 of 300', BRCA1 13, WRN 13, '#16 to #23 of 300' -- that is ties shown as a
range, good, I hate fake ranks. '27 more members'. Where is 'copy'? There is a '...' menu at the
top; I suppose copy member list is in there. I would look there first and I would be annoyed if it
is not."

"Now let me compare with the table I just read. DNA repair as a module: 30 proteins in this set.
Community 8 was 29 proteins, 'DNA repair 29 of 29'. So one DNA repair protein ended up in another
community. Which one? I cannot tell from here. That is the kind of thing I would want: module
versus community, the cross-tab. Where did the thirtieth go?"

"And the colors. On this screen the canvas is colored by module: Ribosome is light blue,
Proteasome is amber. On the Louvain screen Community 1 -- the ribosome cluster -- was amber, and
light blue was Community 2, the proteasome. The same two clusters, colors swapped between the two
views. I switched between them twice and the second time I read the picture wrong. That is the
kind of thing that ends up in a figure by mistake. If a community is 56 of 62 Ribosome, give it
the Ribosome color, or at least do not reuse the same palette in a different order."

"'Appearance, top wins': Module color, Size: degree, Base style. The 'color', 'size', 'shape' tags
on the right say which property each layer writes. OK."

### 5. The node table, ranked

"Nodes tab: 300 nodes, 1 selected, TP53. Columns: id, module, community -- with the header 'Louvain
weighted, seed 7, full graph' -- degree, betweenness, pagerank, each with a rank. I like that the
header says which run the column came from. If I rerun with seed 8 I want a second column, not an
overwrite."

"'MAPK1 and TP53 are the top 2 on all three measures.' Of course they are. TP53. 'Don't show me the
top ten by degree.' The table does not pretend otherwise, so fine. 'Export table as CSV...' -- CSV,
not TSV, I can live with it. This is the thing that gets it into R: node id, module, community,
degree, betweenness. If this export contains exactly those columns with those headers, I can do
the rest of the question in R in five lines."

"Answering from here: sort by community, filter Community 1, and I have the 62 genes. That works.
It is a spreadsheet move rather than a network move, but it works."

### 6. The comparison page

"There is a 'Compare with...' under Runs on the Louvain panel, so I look at the comparison page to
see whether I could compare two seeds or Louvain against the file's modules. It is PageRank against
betweenness on a payments network -- a rank scatter, top-50 agreement, Spearman. Well done for
rankings. But for groups I need a different thing: two partitions, a cross-tab, and one number --
adjusted Rand or NMI. There is nothing like that. So 'is this partition stable' and 'how much does
it agree with the annotation' I would have to do in R."

## Her answer to the moderator

"Louvain, seed 7, resolution 1, weighted by STRING confidence, finds eight communities plus two
isolated proteins, modularity 0.716. They line up almost one to one with the module labels in the
file -- Ribosome, Proteasome, Complex I, Spliceosome, MAPK signalling, TGF-beta, Cell cycle, DNA
repair. The biggest, Community 1, is 62 proteins, 56 of them labelled Ribosome. It is different in
structure, not in expression: it is the least dense of the eight (0.123 against 0.165 to 0.256) and
has the most edges leaving it (93), and its highest-degree member is AKT1, which is not ribosomal.
On log fold change it is flat, +0.02 against +0.09 for the rest. If you want the group that differs
in expression, it is Community 2, the proteasome, at +0.29. I would not publish any of that without
a significance test, a second seed and an enrichment run."

## Single Ease Question

**5 out of 7.** Finding the groups and reading the biggest one's numbers was easy -- the right
panel and the communities table together are a 6, and the table reconciles to the edge count,
which almost nothing does. It drops to 5 because clicking a community took me somewhere else (a
different project name, a betweenness coloring, then a DNA repair set instead of Community 1), the
two views swap colors for the same clusters, and "how is it different" stops at a mean with no
test and no enrichment.

## Would she use it instead of her current tool?

"Not instead. Beside. For this question, the communities table is better than anything Cytoscape
gives me out of the box -- clusterMaker2 gives you a cluster column and you build this table
yourself in R. The run record with the seed and the weight conversion is what a reviewer asks for,
and it copies. But the real answer to 'how is it different' is enrichment with an FDR and a test on
expression, and both are outside. And I still do not know whether I can drive it from R. If the
node table and the communities table export as real files with these headers, I would use it to
look at modules and make the figure, and do the statistics in igraph. That is what I do with
Cytoscape too -- so it is a fair fight, and on the reading side it wins."

## Problems observed

1. Selecting a community row did not lead to that community: the next screens were the style stack
   for a differently named project ("Stress response study", graph "ppi-core-300", with a
   betweenness coloring and other sets) and then a "DNA repair" rule set rather than Community 1.
   She asked "is this the same project?". Severity 3.
2. The same clusters take different colors in the community view and the module view (the ribosome
   cluster is amber as Community 1 and light blue as Ribosome; the proteasome the reverse), and she
   misread the picture after switching. Severity 3.
3. "How is the biggest one different" stops at a mean of log2FoldChange "vs the rest" with no test,
   no count of up or down genes and no enrichment, so the tool cannot support the claim she would
   have to write. Severity 3.
4. The "hub" column names the highest-degree member, which in three communities is a well-studied,
   unannotated protein (AKT1 in the ribosome group, MYC in Complex I, UBC in the proteasome); a
   reader will take it as the group's defining protein. Singletons show a "hub" with zero edges
   (GSK3B, NOTCH1). Severity 2.
5. One Louvain run, one seed: nothing shows whether the partition is stable, and "Compare with..."
   leads to a rankings comparison with no partition comparison (cross-tab, adjusted Rand, NMI)
   against another seed or the file's modules. Severity 2.
6. The run record names Louvain but not which implementation or variant, and Leiden or MCL were not
   visible from this screen. Severity 1.
7. In the inspector, the rule and "Created from" values are truncated ("module = DNA re...", "Same
   value as TP...") and no Copy members is visible for the set; she would have to find it in the
   "..." menu. Severity 2.
8. She could not see which DNA repair protein fell outside Community 8 (30 in the module, 29 in the
   community); there is no module-by-community cross-tab. Severity 1.
9. The table exports as CSV, not TSV, and nothing says what the communities table export contains.
   Severity 1.

## Probe after the task: "Compared with the rest" for Community 1

The moderator showed her the style-stack page with Community 1 selected
(screens/styles-list.html#group-compare), which the task's own path did not reach.

"Oh -- this is what I wanted to land on when I clicked the row. 'Community 1, created from Louvain
run, seed 7', 62 proteins, edges inside, out, density, the same numbers as the table. Then
'Compared with the rest. Descriptive only; no statistical test. 62 proteins in Community 1, 238 in
the rest.' Box plots per column: log2FoldChange median -0.02 against 0.05, IQR, rank-biserial r
-0.02, 'effect size, not a significance test'. Degree median 9 against 8, r 0.14."

"That sentence 'descriptive only' is honest, and an effect size is better than a bare mean. With
r of -0.02 I can say in one line that the biggest group does not differ in expression. I would
still want a Wilcoxon p-value next to it; it costs nothing and I have to report one anyway."

"'Enrichment analysis isn't part of graphty.' and 'Copy members'. Fine -- honest again. I copy 62
symbols and paste them into g:Profiler. But then I also need the background, the 300 proteins, or
g:Profiler uses the whole genome and every module comes out enriched. A 'copy all as background'
next to it would save the classic mistake."

"If clicking the Community 1 row in the table had brought me here, this task would have been a 6."
