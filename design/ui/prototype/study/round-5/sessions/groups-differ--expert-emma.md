# Session: what groups are there, and how is the biggest different -- Expert Emma

**Participant:** Expert Emma, network scientist, lives in notebooks (networkx, igraph, leidenalg),
uses Gephi for the final figure. See ../../personas/expert-emma.md.

**Task, as the moderator gave it:** "On the protein network, what groups are there, and how is the
biggest one different from the rest?"

**Screens, in order:** the method catalog (screens/results-panel.html state 1, and
screens/styles-list.html frame 25), the finished Louvain result and its run record
(screens/results-panel.html state 14), the communities tab in the table dock (state 15), the group
inspector for one community (screens/inspector.html, the group states), Community 1 compared with the
rest (screens/styles-list.html frames 23, 24 and 26), and a look at the comparison surface
(screens/comparison.html).

**Renders she saw:** shots/screens__results-panel.png, shots/screens__styles-list-catalog.png,
shots/screens__results-panel--louvain.png, shots/screens__results-panel--louvain-table.png,
shots/screens__inspector-group.png, shots/screens__inspector-group-row.png,
shots/screens__styles-list-group-compare.png, shots/screens__styles-list-group-columns.png,
shots/screens__styles-list-meanings.png, shots/screens__comparison.png.

---

## Think-aloud transcript

**Reading the task.** "What groups are there." Groups means communities, and communities means I
pick an algorithm and a resolution, and whoever asked will read the answer as if the groups were in
the data. They are not; they are in the algorithm. So what I want out of this is: which method, which
resolution, which seed, the Q, and then per-community numbers I can compare. "How is the biggest one
different" -- different on what? Size, obviously. Beyond that I'd look at internal density,
conductance, and whatever node attributes the biologist gave me. Let's see what it gives me.

**The overview, before anything runs.** (results-panel, state 1.) Right side: 300 nodes, 1,262
edges, 3 components, average degree 8.41, "edges undirected; confidence, not used yet". Good, that
last bit is the thing I always check. It knows there is a weight column and it tells me nobody has
used it yet. 1,262 times 2 over 300 is 8.41. Fine.

Three components on 300 nodes. I can see two stray dots on the canvas, far right and lower right.
So probably a giant component plus two isolates. I'll hold that thought.

**Finding the method.** Main menu, Algorithms, Community: Girvan-Newman, Label propagation, Leiden,
Louvain. In the later catalog frame each one has a one-liner, and Leiden carries "Start here" with
"Groups tighter inside than out", and Louvain says "Like Leiden; a group may split apart". Huh. That
is actually the Traag et al. result in six words. I'm mildly impressed someone put that in a menu.
"Groups tighter inside than out" is a bit cute for modularity, but I'm not the audience for that
line.

I'd pick Leiden. The mock I'm given has a finished Louvain run, so I'll read Louvain and keep in
mind that I'd rerun it with Leiden before anyone saw it.

**The finished Louvain result.** (results-panel, state 14.) Top of the inspector: "on: full graph,
300 nodes, 3 components. Seeded. Undirected. CPU. Details. Weight: confidence, used as similarity."
Then Groups: 10 communities, modularity 0.716, "the file's modules 0.663", largest 62 proteins,
single proteins "2, no interaction". Options: Scope full graph, Weight confidence, Resolution 1,
Seed 7.

Okay. That's most of my first five questions answered without me asking. The run record popover:
"Louvain, weighted modularity, resolution 1", seed 7, "Normalization: modularity divided by twice
the total confidence of all edges" -- that's the standard 2m with m as total weight, so resolution
here is the multiplier on the null term, the Newman convention, not Gephi's inverted one. It doesn't
say "gamma" anywhere, and it doesn't say outright "higher resolution means more, smaller groups". I
had to infer the convention from the normalization line. I'd want one more clause.

"Weight conversion: confidence used as given, 0.40 to 0.99, as similarity: higher = stronger link."
Good. That's the Gephi-2012 trap closed. "Engine: CPU: Louvain has no WebGPU version." Fine, I
don't care, at 300 nodes it took 0.4 s.

The Q of the file's own modules next to Louvain's Q -- 0.663 against 0.716. That's a nice touch. The
algorithm beat the curated annotation on modularity, which surprises nobody who knows modularity
optimizers, but it's the right thing to show because it stops people from treating Louvain's
partition as "the" modules.

Now, "10 communities" with "2, no interaction". So two of the ten are isolated proteins that Louvain
trivially puts in groups of their own. Those are not communities. They are nodes with degree zero.
Reporting "10 communities" when eight of them have edges is how a client ends up saying "we found
ten functional modules" in a slide. I'd have wanted the headline to say 8, plus 2 isolates, or at
least list them apart. It says it, one row down, but the number the eye lands on is 10.

**The communities table.** (results-panel, state 15.) "Communities table" opens a tab in the dock:
one row per community. Size, edges inside, edges out, density inside, log2FoldChange mean vs the
rest, hub (highest degree), module from the file with most members. Sorted by size.

This is the thing I'd actually build in pandas, so let me check it. Sizes: 62, 43, 36, 36, 31, 31,
30, 29, 1, 1 -- sums to 300. Edges inside add to 1,026. Edges out add to 472, and every between-group
edge is counted twice, once from each side, so 236 between. 1,026 plus 236 is 1,262. It adds up.
Density for Community 1: 232 over 62 choose 2, which is 1,891 -- 0.123. Right. Community 8: 104 over
406, 0.256. Right. Good. I'd trust this table enough to keep going.

"edges out" is a count of edges, not of weight. The run was weighted. The table's columns are
unweighted counts. That's fine as long as I know it, but nothing in the header says "count" versus
"total confidence". I'd guess count, because 232 is an integer. Hover on the column name would
probably tell me; in the group inspector later, edges inside and out have the dotted underline, so
presumably yes.

Community 9 and 10: size 1, 0 edges, density "not defined". Honest -- it didn't write 0 or NaN.
Module "Unassigned 1 of 1". So these are the two isolates, GSK3B and NOTCH1. GSK3B and NOTCH1
isolated in a human PPI? Biologically odd, but that's the file, not the tool.

**So, what groups are there.** Eight real communities, 29 to 62 proteins, and the "module" column
lines them up with the file's annotation: Ribosome 56 of 62, Proteasome 40 of 43, Complex I 35 of 36,
Spliceosome 32 of 36, MAPK signaling 31 of 31, TGF-beta 21 of 31, Cell cycle 29 of 30, DNA repair
29 of 29. So Louvain mostly recovers the curated modules, with TGF-beta the messiest at 21 of 31.
That's a real answer and I got it in about a minute. I would put that sentence in an email.

What I don't have: a proper agreement number between the Louvain partition and the file's modules.
The "most members" column is the majority label per community; it isn't NMI or ARI, and it can't
show me a module split across two communities. I looked at the comparison surface for that -- it
compares two rankings (PageRank against betweenness, top-k overlap, Spearman). Nothing for two
partitions. I'd go to sklearn's adjusted_rand_score for that. Not fatal, but it's the obvious next
question after "the file's modules 0.663".

Also: did Louvain leave any community internally disconnected? That's the whole reason the catalog
tells me to use Leiden. The result doesn't say. With these sizes and densities I'd bet not, but "I'd
bet" is not a methods section. One line, "all 8 connected inside", would close it.

**How is the biggest different -- first pass, from the table.** Community 1: 62 proteins, Ribosome,
hub AKT1. Wait. AKT1 is the hub of the ribosome community? AKT1 is a kinase. "hub: highest degree" --
highest degree in the whole graph, or highest degree inside the community? If it's total degree,
the hub is probably a promiscuous signaling protein Louvain dragged into the biggest group, not a
ribosomal protein at all. That matters for anyone reading "hub" as "the protein this group is about".
The header just says "highest degree". I'd want "degree inside" and "degree" as two things, or at
least the header to say which.

Density 0.123 is the lowest of the eight. But density falls with size -- a 62-node group can't be as
dense as a 29-node one at the same average degree. I did the average internal degree by hand: 2 times
232 over 62 is 7.5. Community 2 is 7.3, Community 3 is 7.9, Community 8 is 7.2. So on internal degree
the biggest one is typical. Conductance, edges out over total degree: 93 over 557 is about 0.17. The
others run 0.15 to 0.27. Also typical. So far, the biggest group is just... bigger. The table led me
toward "least dense", which is the wrong conclusion, and I only avoided it because I know density
scales with size. A junior would write "Community 1 is the loosest group". I'd want average internal
degree or conductance in this table, or instead of density.

log2FoldChange: +0.02 vs +0.09. So no difference in expression change either.

**Getting to Community 1 on its own.** The table notes say selecting a row selects that community's
proteins, and the inspector reads the selection. I'm not sure what I'd get: a thing called
"Community 1", or "62 selected, Nodes"? Those are different objects in this app -- I've seen both.
The legend has Community 1 as a row too; in the Community 4 frame the legend row is highlighted and
the inspector says "Community 4, 4 of 10" with arrows. So clicking the legend row gives me the
group. Clicking the table row, I'd guess, also does. I'll assume so.

**The group inspector, Community 4 version.** (inspector, group.) "Community 4, 4 of 10", Created
from "Louvain run, conf..." truncated. Attributes: size 36 nodes, edges inside 104, edges out 44,
"log2FoldCha" -- truncated -- -0.10, "mean; rest of graph +0.10". Members by degree with ranks "#7 to
#10 of 300" -- tie ranges, good. Appearance, Notes, Export. That's fine for a quick look, but it
isn't a comparison; it's one number against one number.

**The group inspector with "Compared with the rest".** (styles-list, frame 23.) Now Community 1:
created from Louvain run, seed 7. Size 62, edges inside 232, out 93, density 0.123. Then "Compared
with the rest. Descriptive only; no statistical test. 62 proteins in Community 1, 238 in the rest."

Thank you. Someone understood that ten communities times N columns of Mann-Whitney tests is a
p-hacking machine, and the partition was fitted on the same graph, so any "significant" difference in
degree is circular anyway. Saying "no test" up front is correct.

log2FoldChange: a box plot with a strip of points, group in orange, rest in grey, linear scale.
Median -0.02 vs 0.05, IQR -0.61 to 0.75 vs -0.69 to 0.85. Rank-biserial r -0.02, "effect size, not
a significance test". Degree: median 9 vs 8, IQR 7-10 vs 6-10, r 0.14.

Rank-biserial r is a reasonable choice -- it's Cliff's delta by another name, bounded, rank-based,
no normality assumption. The tooltip, when I tab to it: "Effect size, -1 to 1: how far this group's
values sit above (+) or below (-) the rest's. Near 0, they overlap." Correct and short. I'd have
used the exact same statistic in scipy.

Hold on. The table said log2FoldChange +0.02 vs +0.09. Here it says -0.02 vs 0.05. Different sign
for the group. Then I see it: the table's column says "mean, vs the rest" in small grey under the
header, and this says "median". Both are fine. But the same group gets a positive number in one
place and a negative number in the other, and the only thing telling me why is a 10-pixel
sub-header. Someone will paste one into a slide and the other into the notes. Pick one, or show both
in both places.

The columns button: a checkbox menu, "Compare on": log2FoldChange, degree, betweenness, pagerank.
"Number columns only." I add betweenness: log scale, median 0.0047 vs 0.0037, r 0.08. Menu stays
open. Good, I didn't have to reopen it three times.

"Enrichment analysis isn't part of graphty. Copy members." Honest. I'd copy the 62 symbols into
g:Profiler. That's what I'd do anyway, and I respect a tool that says where it stops instead of
shipping a half-baked GO enrichment.

**Wait, which project is this.** The comparison frames say "Stress response study, ppi-core-300", the
Louvain frames said "Human protein interactions, Interactions". Same numbers -- 300, 62, 232, 93 --
so I assume it's the same file under a different project name. In a real session that would make me
stop and check I hadn't opened a different dataset.

**My answer to the moderator.** Louvain, weighted by confidence, resolution 1, seed 7, Q = 0.716:
eight communities of 29 to 62 proteins plus two isolated proteins (GSK3B, NOTCH1). Each lines up with
one of the file's modules -- ribosome, proteasome, complex I, spliceosome, MAPK, TGF-beta, cell
cycle, DNA repair -- TGF-beta the loosest match. The biggest, Community 1, is mostly the ribosome (56
of 62). Apart from being biggest, it is not different: average internal degree and conductance are
in the same range as the others (I computed those by hand), and on log2FoldChange, degree and
betweenness it overlaps the rest almost completely (r = -0.02, 0.14, 0.08). Its lower density is a
size effect. Its "hub" is AKT1, which is suspicious for a ribosome group and needs checking. I'd
rerun with Leiden and a couple of seeds before I believed the eight.

That's a fair answer. The tool got me to it faster than a notebook would for the reading part, but
the two numbers I cared most about -- internal degree and partition agreement -- came out of my own
head.

**Seed stability.** "Seeded", seed 7. Would a different seed give a different ten? It doesn't say,
and there's no "run 10 seeds and show me how stable this is". "Compare with..." under Runs might let
me compare run 1 against run 2, but the comparison surface I saw is for rankings, not partitions. I
don't know what it would show me for two Louvain runs.

---

## Single Ease Question

**5 of 7.** Finding the groups and reading the per-community numbers was easy, and the numbers added
up. The "how is it different" half cost me: the table's density column points the wrong way, the
mean in the table and the median in the inspector disagree in sign, "hub" is ambiguous, and I had to
compute internal degree and conductance myself.

## Would she use this instead of her current tool?

"For the analysis, no -- the analysis is networkx plus leidenalg plus twenty lines of pandas, and I
need ARI against the curated modules and a seed sweep that this doesn't do. For handing it to the
biologist, yes, probably. The communities table with the module column, the legend, 'descriptive
only, no test', and 'Copy members' for enrichment -- that's a view I could send to her and not have
to be on the call. That's the day it saves me. If the table exported with the run record attached, I'd
do it this week. And I still want to drive it from the notebook, not the other way round."

---

## Problems found

1. **The headline says "10 communities" when two are isolated proteins.** (results-panel, finished
   Louvain.) The number the eye reads is 10; the "2, no interaction" line is one row down, and the
   table lists them as Community 9 and 10. A reader will report ten modules. Severity 3.
2. **Density is the only cohesion column, and it scales with size.** (results-panel, communities
   table.) The biggest community reads as the loosest (0.123) although its average internal degree
   (7.5) and conductance (0.17) are typical. No average internal degree, conductance or edges-out
   fraction is offered. Severity 3.
3. **Mean in the table, median in the inspector, opposite signs for the same group.** (results-panel
   communities table vs styles-list group compare.) log2FoldChange for Community 1 is +0.02 (mean) in
   one and -0.02 (median) in the other; only a small sub-header says which. Severity 3.
4. **"hub, highest degree" does not say whether it is degree inside the community or total.**
   (results-panel, communities table.) Community 1 (ribosome) has AKT1 as its hub, which reads as
   "the group is about AKT1" when it is probably a bridging protein. Severity 2.
5. **No agreement measure between Louvain's partition and the file's modules.** (results-panel,
   communities table; comparison.) "Module, most members" is a majority label, not ARI or NMI, and the
   comparison surface compares rankings only, not partitions or two runs of the same method.
   Severity 3.
6. **No statement that each community is connected inside.** (results-panel, finished Louvain.) The
   catalog warns that Louvain may leave a group in pieces, but the result never says whether it did.
   Severity 2.
7. **No seed-stability check.** (results-panel, finished Louvain.) One seed, no way to see how the
   partition moves across seeds. Severity 2.
8. **Resolution convention is only inferable from the normalization line.** (results-panel, run
   record.) It never says gamma, or that higher means more, smaller groups. Severity 1.
9. **Table-row click versus legend-row click: unclear whether you get the community or a bare
   62-node selection.** (results-panel table vs inspector group.) Severity 2.
10. **Two group inspectors.** (inspector group vs styles-list group compare.) One shows a mean against
    the rest and members; the other shows density and box plots but no members. Which one appears
    depends on the frame, not on anything she did. Severity 2.
11. **Truncated labels.** (inspector group.) "log2FoldCha" and "Louvain run, conf..." cut off at 100
    percent zoom; at her evening 125 percent they will be worse. Severity 1.
12. **Project name changes between frames.** ("Human protein interactions" vs "Stress response study,
    ppi-core-300", same numbers.) She stopped to check she had the same data. Severity 1.

## What she liked

- The overview says the weight column exists and is "not used yet"; the run says "confidence, used as
  similarity, higher = stronger link".
- Louvain's Q shown beside the Q of the file's own modules.
- The run record: method, seed, resolution, normalization written out, and a Copy button.
- The communities table adds up: sizes to 300, edges inside plus between to 1,262, densities check.
- "Density: not defined" for a single protein instead of 0 or NaN.
- The catalog line "Like Leiden; a group may split apart", and Leiden marked as the one to start with.
- "Descriptive only; no statistical test", compared with the rest, never group against group, rank-
  biserial r with a one-line meaning.
- "Enrichment analysis isn't part of graphty. Copy members." -- saying where the tool stops.
