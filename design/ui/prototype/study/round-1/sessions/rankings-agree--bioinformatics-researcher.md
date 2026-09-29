# Session: do two rankings agree? -- Dr. Chen, computational biologist

Task given by the moderator: "Do these two ways of scoring agree on who matters?"

Screens used: the comparison surface (first), then the results panel. Participant is the composite
persona in `study/personas/bioinformatics-researcher.md`, a group leader who builds protein
interaction networks in R and Cytoscape and has to defend every ranked gene to a reviewer.

## Transcript (think-aloud)

**Comparison surface, first look.**

"OK. Two scores... I assume this is degree against betweenness, that's the usual fight. Let me look.
Oh -- this isn't a protein network, it's 'Payments network review', accounts. Fine, I'll pretend
ACC-139419 is a gene. The moderator said use what's there."

"I skip the paragraph at the top, that's the sales pitch. Two canvases side by side: A is PageRank,
B is betweenness, both 'April data'. Two hairballs coloured by rank. Honestly the pictures tell me
nothing. Left one has a lot of dark purple, right one has a lot of grey. I can't compare 3,000 dots
by eye and nobody should try."

"The legend says 'Rank, both sides', #3,093 to #1 highest, viridis. Good, viridis survives grayscale.
Dark purple on A is 'tied lowest', 1,153 of them. Grey on B is 'betweenness 0', 1,314 of them. So
about 40% of the network is tied at the bottom on each side. That matters, hold that thought."

"Right column, 'Agreement'. This is where I actually look. Spearman rank correlation 0.781. Top 50
in both: 0 of 50. Accounts compared 3,093. Tied lowest on A 1,153, tied at 0 on B 1,314. And a
footnote: 1 means same order, 0 no relation, ties share their average rank."

"So the honest answer to the question is: they agree on the overall ordering, and they completely
disagree on who's at the top. Zero overlap in the top 50. That's the answer, and it's the bit I'd
care about, because the bench only ever gets the top 15."

"But I don't trust that 0.781. With 40% of the nodes tied at the bottom on both sides, a big chunk
of that correlation is just 'the boring ones are boring on both measures'. Mid-ranks for a thousand
ties will pull rho up. I'd want Spearman over the non-tied nodes, or Kendall's tau-b, and a
confidence interval or at least a p-value. There's a little info icon next to Spearman; I'd hover
it, but I bet it's a definition, not a number."

"Top 50 is a fixed cut. Why 50? For me it's top 10, top 20, top 100 -- I'd want the overlap as a
curve, or at least let me type k. I don't see a way to change 50."

"And where's the scatter plot? Rank on A against rank on B. That's the first thing I'd draw in R,
and it would show me the tie wall and the off-diagonal hubs in one glance. Two hairballs is the
wrong picture for this question."

**The Differences list.**

"'Higher on B' is selected. Top 100 on either side, by rank on B. ACC-139419: #76 on A, #1 on B,
gap 75. Expanded row shows the raw values -- PageRank 4.24e-4, #76 of 3,093; betweenness 1.15e-4,
#1 of 3,093. Good, raw value and rank together, that's what I'd put in a supplementary table."

"'Create set' -- that would be my 'bottleneck but not hub' gene list. That's actually useful. In
biology those are exactly the interesting ones: high betweenness, not a well-studied hub. I'd
click Create set and then want to copy the gene symbols out."

"'Higher on A' tab -- I'd click it. The strip below shows it: #1, #2... on A and 'tied' on B, 1,780
to 3,093, gap '1,779+'. OK, that's honest about the tie. I like that it says 'tied' instead of
inventing a rank."

"What's the '90%' dropdown next to 'Comparison'? Zoom? A threshold? Confidence? I don't know and
it's next to the statistics, so I half suspect it's a confidence level. That worries me."

"How can I get this out? No Export button on the header. There's a '...' -- I'd click it. Yes,
Export..., 'the comparison as a figure of both sides or the difference list as data'. I need the
whole table, all 3,093 with both values and both ranks, as TSV, not just the top 100 differences.
Can't tell from here which one I get."

"Also -- what PageRank? Damping? Directed? Weighted? The comparison screen doesn't say. A
reviewer will ask. I have to go look somewhere else."

**Results panel.**

"Now this is my kind of data -- 'Human protein interactions', 300 nodes, 1,262 edges, TP53, MYC,
AKT1. Betweenness panel: 'on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected.
WebGPU.' Good, that's the methods sentence I need. Weight: 'None declared'. My STRING file has
combined_score; for betweenness that's a similarity, it should be turned into a distance, one minus
score or minus log. If I pick it here, does the tool know that, or does it treat 0.9 confidence as
a long edge? It doesn't say."

"Top nodes list at the bottom, MAPK1 first. So in this project, to answer 'do they agree' I'd open
Betweenness, look at Top nodes, open the other measure, look at its Top nodes, and compare by eye.
That's what I'd do in Cytoscape too, and it's miserable."

"Is there a 'Compare with' here? I don't see one. The catalog on the left, the editor, the '...'
at the top of the editor. I'd try the '...' -- nothing I can see tells me it has compare. On the
payments screen they had A and B badges in the list, so there must be a way in, but from this
panel I would not find it. I'd probably go back to R: `cor(rank(bt), rank(pr), method='kendall')`
and a scatter. Two minutes."

**Answer given to the moderator:** "Broadly, yes -- rho 0.78 -- but not on who's at the top: none
of the top 50 overlap. And I'd want the correlation without the thousand-plus ties before I
believed the 0.78."

## After the task

**Single Ease Question: 4 of 7.** Reading the answer off the comparison screen was quick once I was
on it. Getting there from my own results, and trusting the number, was not.

**Would I use this instead of what I use now?** "Not instead of R. For this question R gives me the
correlation, a scatter and the table in three lines, and I can put it in the methods. What this
has that R doesn't is the 'higher on B' list sitting next to the network with Create set -- the
bottleneck-not-hub genes, clickable. If it gave me a rank scatter, a tie-aware statistic with an
interval, a top-k I can change, the parameters of both runs on the same screen, and the full table
out as TSV, I'd use it to explore and then re-run the numbers in R for the paper. As it stands it's
a nice viewer for the answer, not the place I'd get the answer."

## Problems observed

1. No way to start a comparison from the results panel. The protein-network results panel shows no
   "Compare with..." on the result, the editor or the catalog; the entry point only appears in an
   annotated strip on the comparison page. She would have gone back to R. (severity 3)
2. The statistic is not trustworthy with heavy ties and no uncertainty. About 40% of nodes are tied
   at the bottom on each side; Spearman on average ranks is inflated by them, and there is no
   Kendall tau, no p-value or interval, no "excluding ties" figure. (severity 3)
3. No rank-vs-rank scatter plot. Two side-by-side hairballs coloured by rank cannot be compared by
   eye; the scatter is the standard picture for "do these agree". (severity 3)
4. The comparison surface does not state how each measure was run (weighted, directed, damping,
   exact or sampled); she has to go find it on the results panel. (severity 2)
5. "Top 50 in both" is a fixed cut with no visible way to change k or see overlap as a curve.
   (severity 2)
6. The "90%" dropdown next to the comparison title is unlabeled and sits beside statistics, so she
   read it as a possible confidence level. (severity 2)
7. Export is only in the overflow menu, and it is unclear whether "the difference list as data" is
   the top-100 differences or all nodes with both values and ranks. (severity 2)
8. Weight "None declared" gives no hint whether a confidence score would be converted to a distance
   for betweenness. (severity 2)
9. The comparison mock uses a payments network; the question was about her own kind of data, which
   only the results panel shows. (severity 1)

## What worked

- Agreement numbers in plain words with a one-line reading ("1 means the same order, 0 no
  relation. Tied accounts share their average rank.").
- Ties reported as counts and as "tied" with a range instead of fake ranks ("1,779+").
- One colour scale across both sides, viridis.
- Difference list rows show raw value and rank of N for both sides; Create set makes the
  "bottleneck, not hub" list in one click.
- The results panel's methods line: "Exact. Unweighted, undirected. WebGPU."
