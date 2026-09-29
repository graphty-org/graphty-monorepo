# Session: reading a finished community detection -- Dr. Chen, computational biologist

Participant: the computational biologist persona (study/personas/bioinformatics-researcher.md), played in character.
Task as given by the moderator: "Community detection has finished. Say what groups it found, how good the split is, and whether you could reproduce it."
Screens seen, in order: the Results panel with a finished Louvain run and its run record open
(shots/tasks/groups-differ-finished/01-results-panel-louvain.png), the same run's groups in the table
(02-results-panel-louvain-table.png), and the node table with the community column
(03-table-dock-ranked.png).

## Think-aloud transcript

**Screen 1 -- the Louvain editor with the run record open.**

"OK. Human protein interactions, 300 nodes, 1,262 edges, three components. Somebody ran Louvain. Left
list says 'Louvain 10', so ten groups. Fine."

"The panel. 'Groups: 10 communities. Modularity 0.716.' Then 'the file's modules 0.663.' ... That's the
modularity of the module annotation that came in with the file, scored on the same graph? I think that's
what it means. Useful, actually -- it tells me Louvain found a partition that's *more* modular than the
curated one, which is what Louvain does, it optimises exactly that number. So 0.716 beating 0.663 is not
evidence it's biologically better, it's evidence the optimiser worked. I'd want to know: is 0.663 computed
with the confidence weights too? It doesn't say. If one is weighted and one isn't, the comparison is
meaningless."

"'Largest 62 proteins, single proteins 2, no interaction.' Two isolates. That matches three components --
the big one plus two loners. Good, the counts reconcile. I'll check the table later."

"The state line: 'Seeded. Undirected. CPU. Weight: confidence, higher = stronger link (your answer).' My
answer to what? I don't remember being asked anything. I suppose someone was asked at some point. It's
the right way round for STRING scores, so I'll let it go."

"The run record box -- this is the thing I actually care about. Method: Louvain, weighted modularity,
resolution 1. Seed 7. Damping 'does not apply' -- why is that even listed for Louvain? Fine, it's
honest. Normalization: modularity over twice the total confidence. Weight conversion: confidence 0.40 to
0.99 used as given. Numbering by size. Engine: CPU. And a Copy button. Right, so this is my methods
paragraph. That's better than Cytoscape, where I copy parameters out of a dialog by hand."

"But -- what's missing for reproduce. Which Louvain implementation and which version of it? Seed 7 in
your random number generator is not seed 7 in igraph's `cluster_louvain`. If I run it in R I will not get
the same ten groups, and Reviewer 2 will ask me why. And which STRING release, which cut-off -- the
0.40 is there as a range of the data, not as 'the network was built at score >= 0.4 from STRING v12'.
And nothing about which Louvain level -- final level, I assume."

"And how good is the split? One number, one seed. Louvain is not deterministic. I want to see it run
with, say, 20 seeds and how stable the membership is -- or at minimum the modularity of a degree-preserving
randomised graph so I know 0.716 means something. Neither is here. 'Compare with...' -- let me see... it
doesn't say compare with what. I'd hope it's 'another run', but I'm not going to guess."

"I'll click 'Communities table'."

**Screen 2 -- the Communities tab in the table.**

"Now we're talking. 'Full graph: 10 communities, 2 of them a single protein. Sorted by size.' One row
per community: size, edges inside, edges out, density, log2FoldChange mean versus the rest, hub, and
'module, from the file, most members'."

"Let me check the arithmetic, because that's what I do. Sizes: 62, 43, 36, 36, 31, 31, 30, 29, 1, 1 --
that's 300. Edges inside add to 1,026. Edges out add to 472, so 236 edges between groups, and 1,026 plus
236 is 1,262. It adds up. Density 232 over 62-choose-2 is 0.123. Correct. Good. I trust the table more
now than I did thirty seconds ago."

"So the groups: Ribosome 56 of 62, Proteasome 40 of 43, Complex I 35 of 36, Spliceosome 32 of 36,
MAPK signalling 31 of 31, TGF-beta only 21 of 31, cell cycle 29 of 30, DNA repair 29 of 29. So it's
basically recovering the annotated complexes -- which is what you'd expect, complexes are dense cliques
in STRING. The interesting one is community 6: TGF-beta, 21 of 31. Ten proteins came along that aren't
TGF-beta. That's the row I'd actually open. I'd click the row, it says it selects them on the canvas --
but I want the ten names as a list, not dots."

"The 'hub, highest degree' column. AKT1 is the hub of the ribosome community? UBC for proteasome, MYC
for Complex I, UBB for spliceosome, TP53 for DNA repair. That's the list of the most-published proteins
in the building again. AKT1 is not a ribosomal protein. Highest degree in the whole graph, or highest
degree *inside* the community? It doesn't say. If it's global degree it's telling me which famous
protein Louvain dumped into each group, which is the opposite of 'hub of the module'. I'd delete this
column or make it within-community."

"log2FoldChange '+0.02 vs +0.09'. OK, a mean against the rest. No test, no p-value. That's not
something I can put in a paper, but as a flag it's fine. Community 2, proteasome, +0.29 versus +0.04
-- that's the only one that looks like it's moving. I'd want a real enrichment test on that."

"Community 9 and 10 are GSK3B and NOTCH1, zero edges. GSK3B with no interaction at 0.4 in STRING? That's
odd for real data, but the tool says it plainly, 'not defined' for density instead of 0. Good. I don't
like calling a single isolated protein a 'community' -- in my head that's 'unassigned' -- but they've said
so in the numbering rule."

"'Export table as CSV...' top right. That's the ten summary rows. Can I get the per-protein membership
as well? ..."

**Screen 3 -- the node table.**

"Right, Nodes tab. There's a 'community' column under a header 'Louvain weighted, seed 7, full graph'.
Good -- the parameters travel with the column. So if I export the node table I get protein ID,
file module, community, degree, betweenness, pagerank. That joins onto my data frame. That's the thing
I need."

"And here it confirms what I suspected: AKT1 -- module Unassigned, community 1. YWHAZ, UBB, MYC,
HSP90AA1, all 'Unassigned' in the file and sprinkled into communities. So the hubs are exactly the
proteins that don't belong to any module. The hub column on the previous screen is misleading."

"The canvas here is coloured by the file's modules, not by Louvain, and ribosome is blue here but was
amber a minute ago. I understand why -- different grouping, different palette -- but when I flip
between them I'll have to reread the legend every time."

## Answer to the task (in her words)

"It found ten groups: eight real modules that line up with the annotated complexes -- ribosome,
proteasome, complex I, spliceosome, MAPK, TGF-beta, cell cycle, DNA repair -- and two isolated proteins
it calls communities. The split: modularity 0.716 against 0.663 for the file's own modules, and the
overlap is high except TGF-beta at 21 of 31. How good is it really? I can't tell from one seed and no
null model. Reproduce: inside this tool, yes -- seed 7, resolution 1, confidence as weight, and I can copy
the record. Outside it, in R, no -- there's no implementation or version, no STRING version, and no way I
can see to drive it from a script."

## Single Ease Question

5 of 7. Finding the groups and the numbers was easy and the numbers add up. The "how good" half isn't
answerable on this screen, and the reproducibility half is only half there.

## Would she use this instead of her current tool?

"For looking at a module result and making the supplementary table -- maybe, yes. That communities table
with 'N of M from the file' is the thing I build by hand in R every time, and the run record is better
than anything Cytoscape gives me. For the analysis itself, no, I stay in igraph until it tells me the
implementation and version, runs more than one seed, and I can call it from R. Right now it's a very
good viewer for a result I'd still have to recompute to publish."

## Problems observed

1. No stability or significance for the split (severity 3): one seed, one modularity value; no multi-seed
   agreement or randomised-graph baseline, so "how good" cannot be answered.
2. Run record lacks implementation name/version and source-data version (STRING release, score cut-off
   as applied) (severity 3): reproducible in the tool, not outside it.
3. "hub, highest degree" column is ambiguous (global vs within community) and in these fixtures names
   well-studied proteins that are Unassigned in the file (AKT1 as hub of Ribosome) (severity 3).
4. "the file's modules 0.663" does not say whether it was computed with the same weights as 0.716
   (severity 2).
5. "(your answer)" on the weight line refers to a question she never saw in this session (severity 1).
6. Community colours and module colours use different palettes, so Ribosome is amber in one view and
   blue in another (severity 1).
7. "Compare with..." does not say what it compares against (severity 2).
8. log2FoldChange mean vs rest has no test; fine as a flag, not quotable (severity 1).
9. Per-community member list is reachable only via selecting a row on the canvas or exporting the node
   table; no copyable gene list from the Communities tab (severity 2).
