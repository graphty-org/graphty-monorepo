# Session: reading a finished community detection -- Dr. Chen, computational biologist

Participant: Dr. Chen (persona: study/personas/bioinformatics-researcher.md). Round 2.

Task as given by the moderator: "Community detection has finished. Say what groups it found, how good
the split is, and whether you could reproduce it."

Screens used: the Results panel mock (the finished Louvain state, then the same result opened in the
table) and the bottom table dock mock. Renders: shots/record/r2-bio-gd-louvain.png,
shots/record/r2-bio-gd-louvain-table.png, shots/record/r2-bio-gd-tabledock.png.

Outcome: completed. SEQ 5 of 7.

## Transcript (think-aloud)

**1. First look at the finished result.**

"OK. Human protein interactions, 300 nodes, 1,262 edges, three components. Left, under 'In this
project', there's a Louvain row with a 10 next to it. I'm guessing 10 is the number of communities.
The editor panel is open: Louvain, on full graph, 300 nodes, 3 components. 'Seeded', then
'confidence as similarity, undirected. CPU.' Good -- it says it used the confidence score as a
weight. That's the first thing I'd have asked. And it says CPU. Fine, I don't care what it ran on
as long as it says so."

"Resolution 1, seed 7. Both are fields, not hidden. Good. That's the MCL-inflation equivalent for
Louvain and it's right there."

**2. What does 'Seeded' mean?** (hovers the (i))

"'The grouping depends on the seed. The same seed gives the same groups; another seed can place some
proteins differently.' Correct, and one line. I'd actually like it to tell me HOW differently --
how many proteins move if I change the seed. Louvain is not stable on a PPI network of this density;
a few boundary genes flip every run. If I'm going to call community 3 'Complex I' in a paper I want
to know it's the same 35 proteins across ten seeds, not just seed 7."

**3. How good is the split.** (reads the Groups block)

"Groups, 10 communities. Modularity 0.716. 'The file's modules 0.663.' ... Hm. What's 'the file's
modules'? Oh -- I think it means the module column that came in with my file, scored the same way.
So the detected partition beats the annotated one, 0.716 against 0.663. That's actually a useful
comparison; I'd normally have to compute that in igraph with `modularity(g, membership, weights=)`.
But the label is cryptic. I had to think about it for ten seconds. 'Modularity of your imported
modules' would be clearer."

"Largest 62 proteins. Single proteins: 2, no interaction. So two genes with no edge each become their
own community. That's honest. It doesn't silently drop them, which Cytoscape apps sometimes do. But
I'd not call those communities -- counting them in the '10' inflates the number. Eight real
communities plus two orphans."

"0.716 is high, but modularity on its own tells you nothing about significance. There's no null
model here -- no 'compared to a degree-preserving randomisation'. For a reviewer I'd still have to
do that in R. I'm not surprised, nobody gives you that. Would be nice."

**4. The run record.** (clicks Details)

"Run record. Method: Louvain, weighted modularity, resolution 1. Seed 7. Damping 'does not apply' --
fine, that's a generic field. Normalization: divided by twice the total confidence of all edges.
Correct, that's standard weighted modularity. Weight conversion: confidence used as given, 0.40 to
0.99, bigger is closer. Good, that tells me the cut-off I used was 0.4, which I'd want. Numbering:
by size, largest first. Engine: CPU, no WebGPU version."

"And there's a Copy button. If that copies this as text I can paste it into a methods section.
That's the thing I've wanted from Cytoscape for years."

"What's missing: which version of the Louvain implementation, which version of this tool, and where
the network came from -- STRING version, evidence channels. The 0.40 is there but only as a weight
range, not as 'STRING v12, combined score >= 0.4'. Maybe that's recorded on the import somewhere, I
can't see it from here. For reproduction in six months, 'Louvain, seed 7' is not enough if the
implementation changes underneath me."

**5. What groups did it find.** (clicks 'Communities table')

"Table at the bottom, tab 'Communities: Louvain'. 'Full graph: 10 communities, 2 of them a single
protein. Sorted by size.' Good, it says it straight."

"Community 1: 62 proteins, 232 edges inside, 93 out, density 0.123, hub AKT1, module Ribosome 56 of
62. Community 2: 43, hub UBC, Proteasome 40 of 43. 3 is Complex I 35 of 36, 4 Spliceosome, 5 MAPK
signalling 31 of 31, 6 TGF-beta, 7 Cell cycle, 8 DNA repair with TP53 as hub, 9 and 10 are GSK3B and
NOTCH1 alone, 'not defined' density, 'Unassigned'."

"Let me check one number. 62 proteins, 62 times 61 over 2 is 1,891 possible pairs, 232 over 1,891 is
0.123. Right. OK, I trust the density column."

"The module column is nice -- it tells me each community is mostly one known module. But that's
'from the file', most members. It is not enrichment. There's no p-value, no GO term, no FDR. I'd
still take the gene lists to g:Profiler. Which means I need the gene lists."

"Hub is 'highest degree'. AKT1 as the hub of a ribosome community is exactly the study-bias thing
-- AKT1 has a thousand published interactors. At least the column says 'highest degree' so I know
what it is. I'd not put it in a paper."

"log2FoldChange 'mean, vs the rest'. +0.02 vs +0.09 for community 1. So community 1 is basically not
differentially expressed. Community 9, GSK3B alone, +0.54. Fine, a mean of one gene. Useful column,
honestly -- I'd have computed that with dplyr."

**6. Getting it out.**

"'Export table as CSV...' top right of the table. That gives me the per-community summary. What I
actually need in R is one row per protein with its community number, so I can join it onto my DE
table. This tab doesn't show that. I'd guess the Nodes tab has a Louvain column -- the other mock
says every run adds a column there -- but I can't see it from this screen, so I'm guessing. If it
isn't there, the whole thing is a picture."

"And I still don't see anything about R. No API, no 'script this'. Copy of the run record plus a CSV
is manual, but it's reproducible by hand. Not in my pipeline."

**7. The picture.**

"Colours by community, largest first. Legend shows four and '6 more'. Community 1 is amber and
community 8 is yellow; on the canvas those two are close, I'd zoom. Two grey dots for the orphans.
No red-green pair at least. I'd recolour for a figure anyway."

"It's 2D. Good."

**Answer to the moderator.**

"It found eight real communities and two single proteins with no interactions. They line up with
known complexes and pathways: ribosome, proteasome, Complex I, spliceosome, MAPK, TGF-beta, cell
cycle, DNA repair. Weighted modularity 0.716, better than the annotated modules at 0.663. Could I
reproduce it? In this tool, yes -- seed 7, resolution 1, confidence as weight, and the record says so
and I can copy it. Outside this tool, in igraph, probably close but not identical: Louvain
implementations differ and it doesn't tell me which one. And I don't know how stable the groups are
across seeds."

## Single Ease Question

5 of 7. "Everything I needed to answer was on two screens. I lost time on 'the file's modules' and on
where the per-protein membership lives."

## Would she use it instead of her current tool?

"For looking at a module result and writing the methods paragraph -- yes, over Cytoscape. The run
record with a Copy button and the community table with density and mean logFC are genuinely ahead of
clusterMaker2. For the analysis itself, no, not until I can get a protein-to-community table back
into R and see how stable the partition is across seeds. Right now it's the best viewer I've tried,
not my pipeline."

## Problems observed

1. 'the file's modules 0.663' -- label is cryptic; she took ten seconds to work out it is the
   modularity of the imported module column. (severity 2)
2. No stability across seeds: the tooltip admits another seed can move proteins, but nothing reports
   how many or how consistent the groups are. Blocks naming communities in a paper. (severity 3)
3. Run record lacks implementation/tool version and data provenance (STRING version, score cut-off as
   a filter rather than a weight range). Reproduction outside the tool is uncertain. (severity 3)
4. The communities tab is per community; per-protein membership for a join in R is not visible from
   here. She guessed the Nodes tab has it. (severity 3)
5. Two single proteins counted as communities inflates '10 communities' (the table does say so).
   (severity 1)
6. No null model or significance for modularity. (severity 2)
7. 'module' column is majority overlap, not enrichment; no p-value or FDR. Clear label, but she still
   leaves for g:Profiler. (severity 2)
8. Amber (community 1) and yellow (community 8) are close on the canvas. (severity 1)
9. No scripting path mentioned anywhere on these screens. (severity 2)
