# Session: read every number -- Dr. Chen, computational biologist

Participant: Dr. Chen, computational biologist (persona: study/personas/bioinformatics-researcher.md).
Task given by the moderator, and nothing more: "You loaded 300 proteins and filtered to one module.
Explain every count on screen, and why the node count is not 300."
Screens, in order: the load step (screens/load-step.html), the screen at rest
(screens/frame-at-rest.html), the filter chip (screens/filter-chip.html) and the Results panel
(screens/results-panel.html).

Renders she saw, in the order she saw them (all in shots/):

- screens__load-step.png -- the load step's first state (a bank transfers CSV, not her data)
- screens__load-step.html#blocked.png -- ppi-core-300-evidence.tsv, confidence read as text, Load off
- screens__load-step.html#policy.png -- the same file, the repeated-pairs menu open
- screens__load-step-loaded.png -- the screen right after Load: 298 nodes, 2,298 edges
- screens__load-step-report.png -- the import report in Version history
- screens__frame-at-rest-dataset-ppi.png -- "Human protein interactions", 300 nodes, colored by module
- screens__filter-chip.png -- the filter steps open (Les Miserables, 27 of 77 nodes, 3 steps)
- screens__results-panel--finished.png -- Betweenness on the protein network, full graph
- r3-chen-numbers-rp-filtered.png -- Betweenness after a filter (Les Miserables, 60 of 77)
- r3-chen-numbers-rp-louvain.png -- Louvain on the protein network, run record open

## Think-aloud transcript

**1. The first load screen.** "Open a graph. Recent: 'Card and transfer transactions, February'.
That's not mine. transfers-2026-03.csv, 3,000 nodes, 9,113 edges, currency, timestamp... This is
somebody's bank data. Where are my proteins?"

(Moderator: this state of the load step uses a different file. She moved to the protein file's
states.)

**2. The protein file, Load is off.** "OK, ppi-core-300-evidence.tsv. Tab, header row, protein_a --
protein_b, undirected. Good, it didn't make it directed. Red: 'confidence is read as text, so it
cannot weigh edges. 150 of 2,298 values are NA.' Fair. That's R's NA, that's my export. And it shows
me the lines, 29, 31, 44 -- all coexpression. That makes sense, coexpression is the channel that's
missing for those pairs. I'd pick 'Number, NA as missing'. I do not want the rows dropped, the
experiments rows for the same pair are still real.

Now: 'What will load: nodes 298, edges 2,298.' Stop. The file is called core-300. I have 300
proteins. Where are two of them? Under the numbers -- no, in this state I don't see the sentence. I
see 298 and nothing else."

(Moderator note: the sentence naming the two dropped proteins is on the clean state of this file,
under the counts. In the blocked render she looked at, it is below the fold of the dialog or absent;
she did not find it here.)

**3. The repeated-pairs menu.** "1,036 extra parallel edges, one per evidence source. Right, STRING
gives me one row per channel if I export it that way. Keep all is 2,298, merge by max of confidence
is 1,262. 2,298 minus 1,036 is 1,262. Good, that adds up. Keep all means degree counts evidence
channels, and it says so -- 'degree counts every source.' That's honest. That's also wrong for me; a
protein with four channels to one partner is not four times as connected. I'd merge. But I note that
the default is Keep all, which is the one that inflates degree. A student would never change it."

**4. After Load.** "298 nodes, 2,298 edges, 'undirected, 1,036 parallel; confidence: numbers, not
used.' Not used? I told it confidence is a weight. Oh -- not used yet, nothing's run. OK, I think.
Density 0.0285. Let me check that. 298 choose 2 is 44,253. 2,298 over that is 0.052. 1,262 over
that is 0.0285. So density is using the distinct pairs, and the Edges row right above it says 2,298.
Those two numbers on the same panel are counting different things and neither says so. A reviewer
would do this sum. I just did it on a napkin in ten seconds."

**5. The import report.** "Here it is: 'Nodes 298. 2 proteins in the file have no interaction:
GSK3B, NOTCH1.' OK. So there are two rows with one end empty. That's the answer to 'why not 300',
and it names them, which is more than Cytoscape does -- Cytoscape just gives you the number and you
diff the lists in R. But 'have no interaction' is the wrong way to say it. GSK3B has plenty of
interactions in STRING; it has none that passed my 0.7 cut-off. The tool doesn't know that. What it
knows is the row had an empty partner. Say 'appear only on rows with no partner, lines 2,299 and
2,300'. And say they were not loaded. I had to infer that.

Also, 'Pairs 1,262 distinct' is here, and 'Keep all: 2,298 edges' is here. So the report knows both.
Good. Put that on the statistics panel too."

**6. The screen at rest -- the Proteins dataset.** "Human protein interactions. Nodes 300. Edges
1,262. Components 3, 2 isolates. Wait. It's 300 now? And 1,262? The chip says ppi-core-300.g-- it's
cut off. .graphml? So this is a different load. Same project name, 'Human protein interactions',
different file, different counts. If I had both in my Recent list I would not know which one I'm in.
The chip truncates exactly the part that tells me.

OK, taking this one as the one I 'loaded': 300 nodes, 3 components, 2 of which are isolates -- so
GSK3B and NOTCH1 are here as single nodes, the GraphML carries them. 300, fine. Average degree...
not on this panel, density 0.0281. 1,262 over 300 choose 2, 44,850, is 0.0281. Correct.

Legend: Ribosome 56, Proteasome 40, Complex I 35, Spliceosome 32, MAPK signaling 31, DNA repair 30,
Cell cycle 29, TGF-beta 21, Other 26. That's 300. Good, it adds up to the node count, I like that.
'Other' -- is that 'no module' or 'the modules after the eighth'? It's the grey ones, and the grey
ones are UBC, UBB, MYC, AKT1, HSP90AA1 -- the hubs in the middle. So probably no module. I'd want it
to say 'no module, 26'. 'Other' reads like it's hiding modules."

**7. Now filter to one module.** "I want Ribosome only. In Cytoscape I'd select by the column and make
a subnetwork. Here -- the legend has no funnel on this screen. The chip says 'Full graph'. Click it."

(Moderator: the filter chip mock uses the Les Miserables graph; there is no state with the protein
network filtered to a module. She was asked to read it as if it were her network.)

"Les Miserables. Fine, I know that one, igraph ships it. 'Filter to degree >= 2, took out 17, 60
left. Filter to degree >= 5, took out 20, 40 left, keeps only nodes with at least 5 neighbors among
the 60 it reads.' Oh, that's good. That's the thing that bites people: degree after the first filter,
not the original degree. It says it. And the chip: '27 of 77 nodes, 3 steps.' So for me it would say
'56 of 300 nodes, 1 step', 'Filter to module Ribosome, took out 244, 56 left'. I'm guessing that. I
think that's what it would do. The legend here has a little funnel next to 'Group color', so maybe I
click that and pick a module. On my protein screen that funnel wasn't there."

**8. The counts after a filter.** "Statistics: 'Filtered graph: 27 of 77 nodes'. Edges 104 of 254,
components 1, largest component 27, isolated nodes 0, average degree 7.70, density 0.296. Each has a
funnel, which I take to mean 'this is on the filtered graph'. 104 times 2 over 27 is 7.70. 27 choose
2 is 351, 104 over 351 is 0.296. Right. The table has 'degree' and 'degree on: full graph' side by
side -- Valjean 17 and 36. That is exactly what I need to defend a number: the within-module degree
and the whole-network degree next to each other. That's the column I'd export.

The legend: 4 is 9, 3 is 8, 2 is 7, 5 is 3. 27. Adds up. Good."

**9. Betweenness after a filter.** "'on: filtered graph, 60 nodes, 1 component. Exact. Unweighted,
undirected. WebGPU.' Scope: Filtered graph, 60 of 77. Run record: Brandes, exact, 'Divided by
(n-1)(n-2)/2 = 1,711 node pairs; n = 60, the filtered graph.' 59 times 58 over 2, 1,711. Yes. This is
the part I never get from cytoHubba. It tells me the normalization and the n. I'd paste that into a
methods section.

Distribution: middle 0.000, highest 0.419, zero '32 nodes, all 29='. What is 'all 29='? That's cut
off, or it's some notation I don't know. Twenty-nine tied? If I can't read it I assume it's a bug."

**10. Betweenness on the full protein network.** "300 nodes, 3 components, exact, unweighted. Edges
on the right: 'undirected, no weight.' On the at-rest screen the same graph said 'weight:
confidence'. Now it says no weight. Did the run throw away my weight or does the graph not have one?
I think the first means 'this run didn't use it' and the second means 'the graph has one'. But the
right-hand panel is the graph, not the run. Three spellings of the same edges across three screens:
'weight: confidence', 'no weight', 'similarity weight'."

**11. Louvain on the protein network.** "10 communities. Modularity 0.716, 'the file's modules 0.663'
-- oh, that's nice, it scores my own annotation against the same measure. 'single proteins 2, no
interaction' -- so of the 10 communities, 2 are GSK3B and NOTCH1 on their own, and there are really 8.
It says it, in the run record: 'a protein with no interaction is a community of its own'. Seed 7.
Resolution 1. 'CPU: Louvain has no WebGPU version.' Fine, honest.

Legend: Community 1 is 62, and my Ribosome module was 56. So Louvain isn't reproducing my modules
exactly. That's fine, it shouldn't. But if I'd 'filtered to one module' I'd need to know whether that
was the file's module or Louvain's community -- the task says 'module', and both are on screen."

## Answering the moderator's question, in her words

"Why not 300? Two reasons, depending on which file. From the TSV, 298, because GSK3B and NOTCH1 are on
rows with no partner and an edge list can't carry a node with no edge; the import report names them.
From the GraphML it is 300, with those two as isolates, which is why components is 3. After filtering
to Ribosome it would say 56 of 300, and every statistic with a funnel is on the 56, not the 300; the
table keeps a full-graph degree column. Edges: 2,298 rows, 1,262 distinct pairs, 1,036 extra from
evidence channels. Density is computed on the 1,262, even when the Edges row says 2,298 -- that one I
had to work out myself, and it should not be left to me."

## Single Ease Question

3 of 7. "The numbers are right. I checked six of them and they all add up, which I can't say for most
tools. But I had to go to three screens and do two sums to explain one panel, and the filter I was
asked about isn't on my data."

## Would she use it instead of her current tool?

"For looking at a module and writing the methods paragraph -- maybe, yes. The run record with n and
the normalization, the 'degree on full graph' column, the import report that names the dropped
proteins: that's better than Cytoscape, where I diff the node list in R to find out what went
missing. Instead of igraph? No. I still haven't seen a way to get that node table out as a TSV from
a script, and until the density and the edge count agree on the same panel, I'd recompute everything
in R anyway before it goes in a paper."
