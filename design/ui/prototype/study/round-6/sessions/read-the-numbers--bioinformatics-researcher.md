# Session: read every number -- Dr. Chen, computational biologist

Participant: Dr. Chen, computational biologist (persona: study/personas/bioinformatics-researcher.md).
Task given by the moderator, and nothing more: "You loaded 300 proteins and filtered to one module.
Explain every count on screen, and why the node count is not 300."
She ran this task once before, on an earlier version of the same screens (study/round-3/sessions/),
and gave it 3 of 7.

Renders she saw, in the order she saw them (all in shots/, participant view, design notes hidden):

- tasks/read-the-numbers/01-load-step-graphml.png -- opening ppi-core-300.graphml, before Load
- tasks/read-the-numbers/02-frame-at-rest.png -- "Human protein interactions" after Load, colored by module
- tasks/read-the-numbers/03-filter-chip-proteins.png -- the same graph filtered to the Ribosome module
- tasks/read-the-numbers/04-results-panel-finished.png -- Betweenness on the full protein graph
- chen-r6-numbers-load-step-html-loaded.png -- the evidence-rows TSV of the same proteins, right after Load
- chen-r6-numbers-load-step-html-report.png -- that TSV's import report in Version history
- chen-r6-numbers-frame-evidence.png -- the TSV at rest, with the statistics panel settled
- chen-r6-numbers-results-panel-html-filtered.png -- Betweenness after a filter, run record open (Les Miserables)
- chen-r6-numbers-navigation-html.png -- the navigation overview (Les Miserables)

## Think-aloud transcript

**1. Opening the GraphML.** "ppi-core-300.graphml. GraphML, undirected 'as the file declares' -- good,
it didn't guess. Node attributes 2: module, category, 9 values; log2FoldChange, number. Edge
attributes 1: confidence, number. Role None on all three. Sample, first 5 of 300 nodes, PSMA1 to
PSMA5, proteasome, fold changes between -0.87 and 0.48. Fine.

'What will load: nodes 300, edges 1,262.' So in this file it IS 300. Weight: 'confidence, not used
yet.' I'd rather it said 'no run has used it yet', but I know what it means now; I learned it last
time. Nothing here tells me that two of the 300 have no edges. I'll find that out later, or I won't."

**2. The screen at rest.** "Statistics. First line: 'Loaded: ppi-core-300.graphml, undirected,
confidence not used yet.' OK, the load settings in one sentence at the top. That's the line I'd
paste into a legend.

Nodes 300 nodes. Edges 1,262 edges (rows). Linked pairs 1,262 linked pairs. Well. That's new. So an
edge is a row of the file and a linked pair is two proteins counted once. In a GraphML with no
duplicates they're the same number, which is why it looks silly here -- two rows saying 1,262. But I
know what it's for. It's for my evidence file.

Density 0.0281. 300 choose 2 is 44,850; 1,262 over that is 0.02814. Right. Connected components 3,
'2 isolates'. So 300 is one big component of 298 plus two proteins on their own. That's my answer to
'why not 300' before I've even filtered: it is 300, but two of them are touching nothing. It doesn't
tell me which two on this screen. Last time the TSV report named them, GSK3B and NOTCH1. I'd bet it's
them again.

Attributes 4. Hm. The load dialog said two node attributes and one edge attribute. That's three.
What's the fourth? The id? If the id counts, say so, because I just counted three and got a
different answer than the tool. '5 more' underneath -- five more statistics, I assume, not five more
attributes. It reads like the second.

Legend: Ribosome 56, Proteasome 40, Complex I 35, Spliceosome 32, MAPK signaling 31, DNA repair 30,
Cell cycle 29, TGF-beta 21, Other 26. 56+40 is 96, +35 is 131, +32 is 163, +31 is 194, +30 is 224,
+29 is 253, +21 is 274, +26 is 300. Adds up. Then a grey 'Unassigned' under Other with no count.
Is that a tenth group with nobody in it? Or is it telling me Other means unassigned? I think the
second -- the load dialog said the module column has 9 values, and there are 9 rows with counts, so
Other must be a value or... no, 8 modules plus Other is 9. So 'Other' is literally a value in my
file? Or it's the blanks? I asked for 'no module, 26' last time. This is closer, but I'm still
guessing which one it is.

'Labels: the 22 proteins with the most partners, 7 more hidden where they overlap.' I count the
labels on the canvas: NDUFB5, NDUFB1, NDUFA1, MAPK1, HSP90AA1, MYC, AKT1, UBB, UBC, YWHAZ, RPL28,
RPS8, RPL23, TP53, BRCA1. Fifteen. 22 minus 7 is 15. Correct. 'Partners' -- that's degree, in a
biologist's word. Fine.

The table strip at the bottom: 300 nodes, 1,262 edges (rows). Same units as the panel. Good."

**3. Filtering to Ribosome.** "The chip in the top left now says '56 of 300 proteins, 1 step'.
Proteins, not nodes. I like that it says proteins. Filter steps: 'Filter to module Ribosome, took
out 244, 56 left.' 300 minus 244 is 56, and the legend said Ribosome 56. Three numbers, one
story. That's the answer to the moderator: after the filter the count is 56 because the filter keeps
only the Ribosome module; 244 went out; the graph underneath is still 300 -- the Graphs list on the
left still says 'Interactions, 300 proteins'.

Statistics on the right, each with 'of the filtered graph (56 of 300 proteins)'. Proteins 56 of 300.
Interactions 217 of 1,262. Components 1. Largest component 56. Isolated proteins 0. Average degree
7.75: 217 times 2 is 434, over 56 is 7.75. Density 0.141: 56 choose 2 is 1,540, 217 over 1,540 is
0.1409. Both right. It repeats '(56 of 300 proteins)' six times, which is a lot of ink, but I would
rather it repeat itself than leave me wondering which graph a number is on.

Now -- 'Interactions 217 of 1,262'. On the previous screen the same thing was 'Edges, 1,262 edges
(rows)' and 'Linked pairs'. Here it's 'Interactions', with no rows or pairs. On this file it doesn't
matter, rows and pairs are both 1,262. On my evidence file it would matter a lot: is 'interactions'
the 2,298 rows or the 1,262 pairs? The units I was just promised are gone on the one panel where I'm
most likely to quote a number.

Also missing: how many interactions leave the module. 217 are inside it. For a disease module that's
half the point -- the boundary. The table has 'Degree (filtered)' and 'Degree (full graph)' side by
side, RPL28 14 and 17, so RPL28 has three partners outside the ribosome. That's exactly the pair of
columns I'd export. But the total leaving the module I'd have to sum myself from the table.

Sets and paths: 'Hubs, rule, 0 of 10' with a funnel. I think: my hubs set has 10 proteins and none
of them is ribosomal, so none survive the filter. Plausible -- the hubs are UBC, UBB, HSP90AA1. I
didn't make a 'Hubs' set, somebody did, and I can't see the rule from here. I'd click it.

Legend: 'Module color, module, Ribosome 56.' One row. Consistent. Style stack has 'Size: degree' --
is the size the filtered degree or the full degree? There's no size key on this screen to tell me."

**4. Betweenness on the full graph.** "'on: full graph, 300 nodes, 3 components. Exact. Undirected.
WebGPU.' Weight: 'confidence, not used yet.' Options: Weight 'None for this run.' OK -- the graph
has a confidence column, this run didn't use it. Last time the three panels said three different
things about the weight; now they say the same thing two ways. Better.

Overview on the right: nodes 300, edges 1,262, components 3, average degree 8.41. 1,262 times 2
over 300 is 8.41. Right. But 'edges 1,262' -- no '(rows)' here. Third panel, third way of writing
the edge count. And average degree is here and not on the rest screen. On my evidence file, would
this be 2,298 times 2 over 300, 15.3, or 8.41? I don't know, and that's the number a reviewer would
recompute.

Top nodes: MAPK1 0.1379, TP53 0.1139, YWHAZ, CDK1, AKT1. 'Every step in the top 5 is over the 1%
tie line; the smallest, ranks 3 and 4, is 1.2%.' 0.0695 minus 0.0687 is 0.0008, over 0.0687 is
1.16%. Right. And yes, it's TP53 and AKT1 and YWHAZ -- the most-published proteins in the building.
Raw betweenness on a literature-biased interactome. The tool isn't wrong; it's just not telling me
anything I didn't know. '295 more in the table' -- 300 minus 5. Fine.

Distribution: 300 nodes. Middle 0.0038, highest 0.138. 'zero: 10 nodes, all 291='. Last time I saw
'all 29=' on the other graph and took it for a bug. This time I did the sum: 300 minus 10 plus 1 is
291. So the ten zeros are tied for rank 291. It's a league-table notation. I got it, but only
because I'd seen it before and I bothered to do the arithmetic. 'Tied at rank 291' is three more
characters. The colour key agrees: 'the 10 proteins at 0 take the lightest color.' Ten zeros on 300
proteins: the two isolates plus eight leaves, I'd guess.

The normalization isn't on this panel; it's behind Details. On the Les Miserables filtered run the
run record says 'Divided by (n-1)(n-2)/2 = 1,711 node pairs; n = 60, the filtered graph' -- 59
times 58 over 2 is 1,711, correct. For mine it would be 299 times 298 over 2, 44,551, with n
including the two isolates. I'd want to know whether it normalizes by the whole graph or per
component when there are three. It says n; it doesn't say which n it would use for a disconnected
graph. I'd check that in igraph before I trusted it."

**5. The same proteins from the evidence TSV.** "Now the file where the units actually matter.
ppi-core-300-evidence.tsv, one row per STRING evidence channel.

Right after Load: Nodes 300, Edges 2,298, 'undirected; 865 pairs appear more than once.' Density
0.0281. Connected components 3. Stop. This is the exact thing I complained about last time. Edges
2,298, density 0.0281 right under it, and 2,298 over 44,850 is 0.051, not 0.0281. The density is on
the 1,262 pairs and nothing on this screen says there are 1,262 pairs. No 'linked pairs' row here.
And 'components 3' without the '2 isolates'.

The import report, though: 'Read as TSV: 300 nodes, 2,298 edges. confidence: Number, NA as missing,
150 edges with no confidence. Pairs: Keep each, 2,298 edges; 865 pairs appear more than once, one
row per evidence source. Nodes 300: 2 proteins have no partner in the file: GSK3B, NOTCH1. They are
loaded unconnected. Distinct pairs 1,262.' That's much better than last time. It names them, it
says they were loaded -- last time I had to infer that -- and it gives me distinct pairs.
865 pairs repeated and 2,298 minus 1,262 is 1,036 extra rows; so some pairs have three or more
channels. That's consistent. I checked it.

Then the rest screen for the same file: Edges 2,298 edges (rows), Linked pairs 1,262 linked pairs,
Density 0.0281, Connected components 3 (2 isolates). Now it adds up on one panel. 1,262 over 44,850.
That is the fix I asked for. If they'd done it on the post-Load screen too I'd have nothing to say.

But look at the first line: 'Loaded: ppi-core-300-evidence.tsv, undirected, NA read as missing,
repeated pairs kept, no numeric edge column.' No numeric edge column? The import report on the
screen before says confidence was read as Number with NA as missing, and the post-Load panel says
'Weight: confidence, not used yet'. So which is it? Is my confidence a number or not? This is the
single thing I care about in a STRING file, and two screens about the same load disagree.

And 'Degree distribution' on this file -- is that counting rows? If a protein has four channels to
one partner, is that degree 4? The Load step used to say 'degree counts every source'. Nothing here
does."

**6. The navigation page.** "Les Miserables in two small frames, one with the menu open. Graphs:
Co-appearances, 77 nodes. Sets: Friends of Valjean, frozen, 26; The barricade, size, 13; Fantine to
Marius, path, 3. Views. Nothing about my proteins. It's the map of where things live, not the
numbers. I'd skip it."

## Answering the moderator's question, in her words

"The node count IS 300 until you filter -- in both files. Two of the 300, GSK3B and NOTCH1, have no
partner in the file; they are loaded as isolates, which is why components is 3 and not 1: one
component of 298 and two singletons. After 'Filter to module Ribosome' the chip says 56 of 300
proteins: the step took out 244 and the Ribosome module had 56 members, which the legend says too.
Every statistic on the filtered panel is on the 56: 217 interactions inside the module out of
1,262, one component, average degree 7.75, density 0.141 -- I checked all of them. The table gives
both degrees, within the module and on the full graph.

Edges: in the GraphML, 1,262 rows and 1,262 linked pairs, the same thing. In the evidence TSV,
2,298 rows, one per evidence channel, for 1,262 distinct pairs; 865 pairs appear more than once,
1,036 extra rows. Density is always on the pairs. On the rest screen that's now written down;
on the screen right after Load it still isn't."

## Single Ease Question

5 of 7. "Every number I checked is right -- eleven of them -- and this time I could explain the
module filter on my own data instead of on Les Miserables. The linked-pairs row next to the edges
row is the fix I asked for; on the rest screen density finally has its denominator in view. It
loses two points because the units only hold on one panel: the filtered stats say 'interactions',
the results panel says bare 'edges', and the screen straight after Load still shows 2,298 with a
density that only makes sense for 1,262. And two screens disagree about whether my confidence
column is a number."

## Would she use it instead of her current tool?

"For this job -- reading a module and writing down what every number means -- instead of Cytoscape,
yes, probably. The import report that names the dropped-to-isolate proteins, the 'took out 244, 56
left' step, the within-module and full-graph degree side by side, the run record with n and the
normalization: I get none of that from Cytoscape without diffing lists in R. Instead of igraph, no.
I still haven't seen that node table leave as a TSV from a script, and while one panel says
'interactions', another 'edges (rows)', and a third bare 'edges' for the same thing, I'd recompute
every number in R before it went into a figure legend. Make the units say the same thing on every
panel and fix the confidence contradiction, and I'd take it to my postdocs."
