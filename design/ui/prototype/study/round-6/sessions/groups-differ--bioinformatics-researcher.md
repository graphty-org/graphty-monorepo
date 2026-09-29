# Session: "What groups are there, and how is the biggest one different?" -- Dr. Chen, computational biologist

Participant: Dr. Chen, group leader in a translational institute that partners with a pharma
company (persona: study/personas/bioinformatics-researcher.md). Laptop on a 27-inch monitor, Chrome.

Screens used, in the order she met them (participant view, rendered 2026-09-29): the Louvain result
in the right panel (screens/results-panel.html#louvain), the same result with its communities table
open in the bottom dock (#louvain-table), the style stack (screens/styles-list.html), a set selected
in the inspector (screens/inspector.html#set), and the node table ranked by three measures
(screens/table-dock.html#ranked). She also opened the comparison page (screens/comparison.html).
Off the scripted path, she clicked a community in the canvas legend, which on the inspector page
selects the whole community (screens/inspector.html#group, shown for Community 4) and from there
"Compare with the rest" (screens/styles-list.html#group-compare, shown for Community 1).

Moderator's task, as given: "On the protein network, what groups are there, and how is the
biggest one different from the rest?"

## Transcript (thinking aloud)

### 1. The Louvain result

"Human protein interactions, 300 nodes, 1,262 edges, 3 components. Coloured by community already.
I read the left side before the picture, because the picture is what I don't trust."

"'on: full graph, 300 nodes, 3 components. Seeded. Undirected. CPU. Weight: confidence, used as
similarity.' Right. That is the question I ask first with STRING scores, and it is answered
before I ask it."

"Groups: 10 communities. Modularity 0.716, 'the file's modules 0.663'. So the annotation column,
scored as a partition, is less modular than what Louvain found. Largest 62 proteins. 'Single
proteins 2, no interaction.' So eight real communities and two isolates. Three components -- the
main one and the two isolates. Adds up."

"Details. Run record: 'Louvain, weighted modularity, resolution 1', seed 7, 'confidence used as
given, 0.40 to 0.99, as similarity', numbering by size, largest first. Engine: CPU, 'Louvain has
no WebGPU version'. 0.4 seconds. Copy at the top. That goes in the methods section as it is. I
still want to know which Louvain -- one level or iterated to convergence -- and why not Leiden,
which is what a reviewer will ask in 2026. And one run, one seed. Nothing tells me seed 8 gives
the same eight groups."

"Picture: amber cluster around RPL28, RPS8, RPL23 is Community 1. Ribosomal proteins. I think.
I'll take the table."

### 2. The communities table

"Communities table. It opens in the bottom: 'Full graph: 10 communities, 2 of them a single
protein. Sorted by size.' Size, edges inside, edges out, density inside, log2FoldChange 'mean, vs
the rest', hub 'highest degree', module 'from the file; most members'."

"I'll check it adds up, because that is the thing I do in R before I believe anything. Sizes: 62,
43, 36, 36, 31, 31, 30, 29, 1, 1 -- 300. Good. Edges inside: 232 + 156 + 142 + 104 + 109 + 82 + 97
+ 104 = 1,026. Edges out: 93 + 56 + 63 + 44 + 59 + 60 + 56 + 41 = 472, each crossing edge counted
from both ends, so 236. 1,026 plus 236 is 1,262, the overview number. Density, Community 1: 232
over 62 times 61 over 2, which is 1,891 -- 0.123. Community 8: 104 over 406, 0.256. Right."

"So, what groups: eight communities that map almost one to one onto the file's module labels --
Ribosome 56 of 62, Proteasome 40 of 43, Complex I 35 of 36, Spliceosome 32 of 36, MAPK signalling
31 of 31, TGF-beta 21 of 31, Cell cycle 29 of 30, DNA repair 29 of 29 -- and two isolates, GSK3B
and NOTCH1."

"How is the biggest one different. Density: 0.123, the loosest of the eight; the others run 0.165
to 0.256. Most edges out, 93. That is backwards for a ribosome -- in real STRING the ribosome is
nearly a clique. Something has been pulled into it. And the 'hub' is AKT1. AKT1 is not ribosomal.
Same pattern: MYC is the 'hub' of Complex I, UBC of the proteasome, UBB of the spliceosome. The
header says 'highest degree', so it is not lying, but a student will read 'hub' and put AKT1 in
the paper as the ribosome's key protein. And GSK3B is the 'hub' of a community with zero edges.
That should be a dash."

"Expression: +0.02 against +0.09. The biggest group is flat. The one that moves is Community 2,
the proteasome, +0.29 against +0.04. A mean of logFC with no test is not something I can write
down, though."

"If I click a row, I expect the community to be selected on the canvas and its genes listed on
the right. That's what I would do in Cytoscape with a cluster column."

### 3. What came after clicking the row

(The next screen she is shown is the style stack.)

"Stress response study? ppi-core-300? Everything is orange-brown, betweenness, log scale. The sets
are 'Hubs, degree 17 to 34', 'TP53 neighbors', 'Down in stress'. This is not the project I was
in. I clicked Community 1 and I got a betweenness colouring of something else. Same 300 and 1,262,
so maybe it is the same graph under another name. I think I have lost my place."

"The betweenness popover is careful, I'll give it that -- 'each value is divided by 0.000077, the
smallest above 0, before the log', and 'on a straight scale 289 of 300 proteins would share the
lightest of the 5 colors'. That sentence belongs in a figure legend. It has nothing to do with my
question."

### 4. The inspector with a set

"'DNA repair, 30 nodes, Rule set.' Not Community 1 again. Rule 'module = DNA re...', created from
'Same value as TP...' -- truncated, both. Edges inside 105, out 42, neighbours out 40, average
degree 8.4. Twice 105 plus 42 over 30 -- 8.4, fine. Members by degree: TP53 32 '#2 of 300', BRCA1
and WRN 13, '#16 to #23 of 300'. Ties shown as a range. Good."

"There is a new button across the top: 'Compare with the rest'. The tooltip says 'Compare DNA
repair with the rest: size, edges inside and out, density, then each column'. That is exactly the
second half of the question, so I press it."

"And it takes me to -- the comparison page. 'Payments network review'. PageRank against
betweenness on 3,093 accounts. A rank scatter, 0 of the top 50 in both, Spearman 0.40. It's a good
rankings comparison. It is not my network and it is not a group against the rest. So the button
promised one thing and the screen behind it is another."

"Colours on this screen: canvas coloured by module. Ribosome is light blue here, Proteasome amber.
On the Louvain screen Community 1 -- which is the ribosome -- was amber, and the proteasome was
light blue. DNA repair is vermilion here and Community 8, which is DNA repair, was yellow. I read
the picture wrong once already. That goes into a figure by accident."

"DNA repair is 30 as a module and Community 8 is 29. Where is the thirtieth? I still can't see a
module-by-community cross-tab anywhere."

### 5. The node table

"Nodes, ranked. Community column header says 'Louvain weighted, seed 7, full graph'. Good -- when
I rerun with seed 8 I want a second column, not an overwrite. Degree, betweenness, pagerank, each
with a rank; ties as '#4=' and '#7='. In the inspector the same tie is written '#7 to #10 of
300'. I prefer the range, but pick one."

"'MAPK1 and TP53 are the top 2 on all three measures.' Of course they are. Export table as CSV.
If that file has id, module, community, degree and betweenness with these headers, I can finish
the question in R in five lines: group_by community, summarise, wilcox.test. Sort by community,
take Community 1, I have my 62 genes. Spreadsheet move, but it works."

"The legend up here: Ribosome 56, Proteasome 40, Complex I 35, Spliceosome 32, '4 more', then
'Other 26' and 'Unassigned' with no number. Is 'Other' the unassigned proteins, or something else?
The inspector's legend on the other screen had no 'Other' at all. I have to add it up to find out:
the eight modules come to 274, so 26 is the unassigned. Then why two lines?"

### 6. Off the path: the legend, then Compare with the rest

"Let me try the legend instead of the table. Clicking 'Community 4' in the canvas legend selects
the whole community -- 'Community 4, 4 of 10', with arrows to step through. Size 36, edges inside
104, out 44, 'log2FoldCha...' cut off, -0.10, 'mean; rest of graph +0.10'. Members by degree, UBB
first -- unassigned ubiquitin again, heading the spliceosome. There's a copy icon on Members, 'Keep
as set', and 'Compare with the rest' on its own line. The '4 of 10' stepper is nice; I'd step to 1."

"Compare with the rest for Community 1. 'Descriptive only; no statistical test. 62 proteins in
Community 1, 238 in the rest.' Box plots with the points. log2FoldChange median -0.02 against 0.05,
IQR, rank-biserial r -0.02, 'effect size, not a significance test'. Degree median 9 against 8, r
0.14. That is honest and it is the answer: the biggest group does not differ in expression, and
it is barely different in degree. I'd still want the Wilcoxon p-value beside the r. I have to
report one anyway, and the tool has everything it needs to compute it."

"'Enrichment analysis isn't part of graphty.' 'Copy members.' Fine. But if I paste 62 symbols into
g:Profiler without the 300 as background, every module comes out enriched. A 'copy the whole graph
as background' next to it would stop the classic mistake."

"And -- this page says 'Stress response study' and 'ppi-core-300' in the corner again, while the
inspector a click ago said 'Human protein interactions' and 'Interactions'. The node attribute on
another screen says 'from ppi-core-300.graphml'. So it's one file with two names. That is the
kind of thing that makes me stop trusting a session."

## Her answer to the moderator

"Louvain, seed 7, resolution 1, weighted by STRING confidence as similarity, finds eight
communities plus two isolated proteins, modularity 0.716. They line up almost one to one with the
file's module labels -- Ribosome, Proteasome, Complex I, Spliceosome, MAPK signalling, TGF-beta,
Cell cycle, DNA repair. The biggest, Community 1, is 62 proteins, 56 labelled Ribosome. It differs
in structure, not expression: it is the least dense of the eight (0.123 against 0.165 to 0.256),
has the most edges leaving it (93), and its highest-degree member is AKT1, which is not ribosomal
-- a well-studied kinase Louvain has pulled in. On log fold change it is flat: median -0.02
against 0.05 for the rest, rank-biserial r -0.02. The group that differs in expression is
Community 2, the proteasome, mean +0.29. None of that goes in a paper without a test, a second seed
and an enrichment run against the right background."

## Single Ease Question

**5 out of 7.** Reading the groups was easy -- the run summary plus the communities table is a 6,
and the table reconciles to the edge count to the last edge. It stays at 5 because the obvious
move, clicking the Community 1 row, still does not select Community 1; the path went to a
differently named project and a DNA repair set; the new "Compare with the rest" button on that set
led to a payments rankings page; and the colours for the same clusters swap between the community
view and the module view. The group-against-the-rest panel I found through the legend is the right
answer to the second half of the question -- if I had landed on it from the table row, this would
be a 6.

## Would she use it instead of her current tool?

"Beside, not instead. For reading modules this is better than Cytoscape out of the box --
clusterMaker2 gives me a column and I build this table myself in R, and the run record with the
seed and the weight conversion is what a reviewer asks for. But 'how is it different' ends at an
effect size with no p-value and no enrichment, I can't compare two seeds or Louvain against the
annotation, and I still don't know if I can drive it from R. If the node and communities tables
export as files with these headers, I would use it to look at modules and make the figure, and do
the statistics in igraph. That is what I do with Cytoscape too, so on the reading side it wins."

## Problems observed

1. Clicking a row in the communities table does not select that community. The path went to the
   style stack of a project named "Stress response study" (graph "ppi-core-300", betweenness
   colouring, other sets) and then to a "DNA repair" rule set. She asked whether it was the same
   project. Unchanged from the previous round. Severity 3.
2. "Compare with the rest" on the DNA repair set promises "size, edges inside and out, density,
   then each column" but leads to the comparison page for a payments network (PageRank against
   betweenness), not a group-against-rest comparison. Severity 3.
3. The same clusters take different colours in the community view and the module view (ribosome
   cluster amber as Community 1, light blue as Ribosome; proteasome the reverse; DNA repair yellow
   as Community 8, vermilion as a module). She misread the picture. Severity 3.
4. One graph carries two names: "Human protein interactions" / "Interactions" on some screens,
   "Stress response study" / "ppi-core-300" on others, while an attribute cites
   "ppi-core-300.graphml". Severity 2.
5. "How is it different" stops at an effect size (rank-biserial r) with no p-value; enrichment is
   out of scope and "Copy members" offers no way to copy the background set, inviting the
   whole-genome background mistake in g:Profiler. Severity 2.
6. The "hub" column names the highest-degree member, which in four communities is a well-studied,
   unannotated protein (AKT1, MYC, UBC, UBB); singletons show a "hub" with zero edges (GSK3B,
   NOTCH1). Severity 2.
7. One run, one seed; no way to compare two partitions (cross-tab, adjusted Rand, NMI) against a
   second seed or the file's modules, so she cannot find where the thirtieth DNA repair protein
   went. Severity 2.
8. Truncated labels in the inspector: "module = DNA re...", "Same value as TP...", "Louvain run,
   conf...", "log2FoldCha...". Severity 1.
9. The node table legend lists "Other 26" and then "Unassigned" with no count; she had to add up
   the modules to learn they are the same 26 proteins. Severity 1.
10. The same tie is written "#7=" in the node table and "#7 to #10 of 300" in the inspector.
    Severity 1.
11. The run record names Louvain but not the variant, and Leiden is not offered from this screen.
    Severity 1.
