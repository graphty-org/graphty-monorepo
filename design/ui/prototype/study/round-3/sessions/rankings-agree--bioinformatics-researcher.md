# Session: do two ways of scoring agree on who matters? -- the computational biologist

Participant: the computational biologist who builds protein interaction networks and hands a ranked short list
of candidate targets to the bench (persona file: study/personas/bioinformatics-researcher.md).
Task as given by the moderator: "Do these two ways of scoring agree on who matters?"
Screens: the comparison surface (screens/comparison.html), then the Results panel (screens/results-panel.html).
Renders read: shots/screens__comparison.png, shots/r3-emma-rankings-comparison-full.png (the full page),
shots/screens__results-panel--finished.png.

## Think-aloud

**1. First look at the comparison surface.**
"OK. This is not my data -- 'Payments network review', 3,093 accounts. Fine, I'll pretend accounts are
proteins. Two things on the left marked A and B: A is PageRank, B is betweenness. Good, the two scores are
named, not 'score 1' and 'score 2'."

"Right-hand column, under the letters: 'PageRank. Unweighted, directed.' and 'Betweenness. Exact. Unweighted,
directed.' That's the first thing I would have asked, so I'm glad it's there before I ask. For my networks
'unweighted' would be the wrong answer -- I'd want the STRING combined score as the weight -- but at least
it tells me, and there's a Details link. I'd click Details on PageRank to see the damping factor. I'm assuming
it says 0.85; if it doesn't, I'd want to know why."

**2. The answer.**
"'The rankings disagree at the top: none of the top 10 are the same.' Well, that answers the moderator's
question in one line. I don't usually trust a sentence from a tool, but this one is checkable: 'in both top 10:
0 of 10' right under it. Then 'Spearman 0.781 over all 3,093 accounts'. So the global correlation is
decent and the top is completely different. That's the classic pattern -- the tail agrees, the head doesn't."

"And here's the thing I'd have gone looking for: 'tied lowest on A 1,153, 37%', 'tied at 0 on B 1,314, 42%',
'in both tie blocks 1,153'. So more than a third of the network is tied at the bottom on both scores. That's
what's holding Spearman up. Leaves agree they're leaves. Big surprise. So 0.781 is mostly telling me the
periphery is the periphery. I worked that out by adding up three rows in my head; the panel doesn't say it.
I want to see Spearman with the tied block taken out, or Spearman on the top few hundred only -- that's the
number I'd actually put in a paper, and it's the number a reviewer would ask for."

"The little info circle after Spearman -- I'd hover it. I'm guessing it says ties get their average rank. I'd
also want to know if there's a p-value or a permutation null. With 3,093 points any correlation is
'significant', so I don't really need the p-value, but a reviewer will ask."

**3. The Top control.**
"Top: 5, 10, 20, 50, 100. I click 20 and 50 in my head -- actually I don't need to, there's a line:
'In both at the other choices of Top: 0 of 5, 0 of 20, 0 of 50, 18 of 100.' That's good. That's the
overlap curve as a sentence. I'd rather have it as a small plot -- overlap against k -- because that's the
figure I'd put in a supplement, and I'd want k up to 500 on a 10,000-node network. 100 is a small ceiling
when my wet-lab collaborators are going to screen from a longer list anyway. No box to type my own k."

**4. The scatter in the bottom dock.**
"Rank on PageRank across the top, rank on betweenness down the side, both log. Rank 1 top left, so the
diagonal is agreement. Dashed line. The shaded corner is the top 10 of both and it's empty. There's a band
along the bottom, '1,314 accounts tied at 0', and one down the right, '1,153 accounts tied at the lowest
PageRank'. Good -- they drew the ties as bands instead of pretending they have ranks. And the note says
the 1,153 in both blocks aren't plotted and says how many. I don't like things disappearing but it tells me,
so fine."

"I had to read the key twice for the direction. 'Above the line, higher on B'. Higher meaning better rank --
closer to 1 -- not a higher number. On a plot where the y-axis runs 1 at the top to 1,000 at the bottom,
'higher' is ambiguous. I'd have got it wrong on the first read if I hadn't seen the selected account:
ACC-139419, #76 on A, #1 on B, sitting at the top. OK, above the line means betweenness likes it more.
The brokers. That's my bottleneck proteins -- the ones betweenness finds and degree-like scores miss."

**5. The differences list.**
"'Higher on B' is selected. ACC-139419, A #76, B #1, gap 75. Then #316 vs #2, gap 314. So the betweenness
top 10 are all sitting between #70 and #316 on PageRank. That's actually the list I'd want -- in my world, the
bottlenecks that aren't hubs are the interesting targets, because the hubs are just the most-studied
proteins. I can expand a row and see both raw values, 4.24e-4 and 1.15e-4, and 'Create set'. I'd make a set
of these ten and look at them on the network."

"Same wording problem again: 'Higher on B' and 'Higher on A' as the toggle. I'd call it 'ranked better by
betweenness'. And 'gap' is a difference in rank positions, not in scores -- fine, but a gap of 75 at the
top and a gap of 75 at rank 2,000 mean completely different things. On a log axis they'd be sorted
differently. I'd want the ratio or the log difference, or at least to know it's linear."

**6. The network picture.**
"There's a hairball in the middle, coloured by PageRank. It isn't helping me answer the question at all. If I
select a row it rings the node, fine, but I'm reading the numbers on the right and the dots at the bottom.
I'd shrink the canvas. At least it's 2D."

**7. Getting the data out.**
"'Export table as CSV...' -- writes every account with both values and both ranks, according to the page. CSV,
not TSV, but read.csv doesn't care. That's the important button. I'd export, open R, do cor(..., method =
'kendall') myself on the non-tied nodes and make my own overlap plot. What I'd also need in that file, or next
to it: the parameters of both runs -- damping, weighting, directedness, and the version of the network --
because six months from now I won't remember. The panel shows them on screen; I don't know if the CSV carries
them. And 'Save comparison' -- saves it where? In the project, I assume. I'd want to know it reopens with the
same numbers."

**8. The Results panel, to see how I would have got here.**
"This one is proteins -- MAPK1, TP53, AKT1. Betweenness finished, 'Exact. Unweighted, undirected. WebGPU.'
Distribution, top nodes, 'No near-ties in the top 5: the closest, ranks 3 and 4, differ by 1.2%.' I like
that line; nobody tells you that. Under Top nodes: 'Compare with...'. So from a finished score I click Compare
with... and pick the other one. I assume it gives me a list of the other results in the project. That's
straightforward. I would have found it."

"And TP53 is number 2 on betweenness. Of course it is. Everything finds TP53."

## Answer to the task

"No, they don't agree on who matters. Spearman is 0.78 but that's carried by the third of the network that's
tied at the bottom on both. At the top they share nothing until you go out to the top 100, and then only 18.
Betweenness picks out a different set -- nodes PageRank puts around 70 to 300. If I were choosing targets I'd
look at those."

## Single Ease Question

5 of 7. "Getting the answer took ten seconds -- the sentence is right there. Knowing whether to believe the
0.78 took me adding up three rows myself, and I still want the version without the ties."

## Would she use this instead of her current tool?

"Instead of R, no. In R this is two lines and a ggplot, and it's in my pipeline. As a place to look at it and
decide what to export, yes -- the tie handling is more honest than what I'd bother to do by hand on a first
pass, and the top-k overlap line is the thing I always forget to compute. It's better than Cytoscape for this,
which can't do it at all without me pulling the node table out. If the CSV carries the run parameters and I can
regenerate it from a script, it goes into the workflow. Otherwise it's a nice viewer."

## Problems seen

1. Spearman is not qualified for the tie blocks (severity 3). The panel lists the tie counts but does not
   say that 1,153 shared bottom ties are inflating the 0.781, and gives no correlation over the untied nodes
   or the top slice. She had to infer it. Quote: "So 0.781 is mostly telling me the periphery is the
   periphery. I worked that out by adding up three rows in my head."
2. "Higher on A / Higher on B" is ambiguous on an inverted rank axis (severity 2). Higher score or better
   rank? She resolved it only from the selected account's numbers.
3. Top stops at 100 with fixed presets, and the overlap at every k is a sentence, not a plot (severity 2).
   On 10,000-node networks she needs k up to several hundred and wants the overlap curve as a figure.
4. The difference list's "gap" is a linear rank difference while the scatter is log (severity 2). A gap of
   75 at the top and at rank 2,000 read the same.
5. Unclear whether the exported CSV carries the run parameters and network version, and where Save
   comparison keeps things (severity 2). Needed for reproducibility and a reviewer.
6. The canvas takes the most space and does not help answer an agreement question (severity 1).
7. No significance or null model next to Spearman (severity 1; she does not need it, a reviewer will ask).

## What pleased her

- The plain sentence answering the question, with the checkable count right under it.
- Each side's method line (weighted or not, directed or not, exact) on the comparison itself.
- Tie blocks drawn as bands and counted in the key, never silently dropped.
- The overlap at every choice of Top in one line.
- The difference list with Create set: the betweenness-not-PageRank nodes are the targets she cares about.
- "No near-ties in the top 5" on the Results panel.
