# Do betweenness and PageRank agree? Reading the rank scatter -- Expert Emma, round 3

**Participant:** Expert Emma, network scientist and consultant (notebook user: networkx, igraph; Gephi for figures).
**Task as given by the moderator:** "Do betweenness and PageRank agree about who matters here?"
**Pages used:** the comparison screen (first frame: PageRank against betweenness on the April payments data, with the table dock on its Scatter view; the Differences tile switched to Higher on A lower on the page), then the bottom dock table screen (three measures ranked on the protein network; the CSV export).
**Renders seen (study view, design notes hidden):** `shots/r3-emma-scatter-comparison-full.png`, `shots/r3-emma-scatter-table-ranked.png`, `shots/r3-emma-scatter-table-out.png`.

## Think-aloud

**1. First look.** "Payments network review. On the left, PageRank with an A and Betweenness with a B. Fine, someone has already set up the comparison, I do not need to hunt for it. The hairball in the middle is coloured by PageRank on a log scale, 1.63e-4 to 6.90e-2. I am not reading the hairball. Where is the actual comparison?"

"Right column: 'The rankings disagree at the top: none of the top 10 are the same.' Then Spearman 0.781 over all 3,093 accounts. So the one-line answer to the moderator's question is 'no at the top, sort of overall'. That is a reasonable first sentence. But 0.781 with a third of the graph tied -- I already do not trust that number. Let me look at the plot before I believe anything."

**2. The scatter.** "Bottom dock, Scatter is selected next to Table. Rank on A, PageRank, across the top, 1 to 3,093, log. Rank on B, betweenness, down the side, log, rank 1 top left. Dashed diagonal. OK, it is a rank-rank plot. Log rank axes are the right call, otherwise the top 10 is three pixels."

"Now, what do I actually see. The top-left corner, the shaded 'top 10' box, is empty. Legend says it: 'The corner is the top 10 of both: 0 accounts.' Consistent with the sentence. Good."

"The column for PageRank rank 1 to about 60 -- there are no dots in it at all, except down in the bottom band. The bottom band is '1,314 accounts tied at 0' on betweenness. So PageRank's top 60 or so all have zero betweenness. Wait, is that right? ... Yes: the legend says the tied accounts 'sit on the band's middle line, placed by their rank on the other side'. So those dots at x = 1, 2, 3 on the bottom band are PageRank's best accounts, and their betweenness is zero."

"That makes sense in a directed payments graph: an account that only receives money is a sink, no shortest path goes through it, betweenness zero, and PageRank loves it. So the real answer is: PageRank is finding collectors, betweenness is finding pass-through accounts. They are measuring different things, which is why they disagree at the top. That is a finding. And the page never says it -- the sentence says 'none of the top 10 are the same', which is true but is the boring half. I had to work out from the band that the PageRank top 10 are all at betweenness zero. A student would have missed that completely."

**3. The other direction.** "Above the diagonal, up at betweenness rank 1 to 10: a handful of dots between PageRank rank 60 and 300. ACC-139419 is circled, 'selected: #76 on A, #1 on B'. The canvas has the same account labelled. Good, the selection follows between the plot and the picture, that is the one thing a matplotlib scatter cannot do for me."

"The right edge: '1,153 accounts tied at the lowest PageRank.' Those are the accounts with nothing coming in, they all get the teleport floor. And '1,153 accounts are in both tie blocks, in the bottom-right corner, not plotted.' Thank you for saying 'not plotted' instead of stacking 1,153 dots on one pixel. Honest."

"But hang on. The legend minimum is 1.63e-4. 0.15 over 3,093 is about 4.9e-5. So the floor is not just (1-d)/N; dangling mass is being handed back somewhere. networkx spreads it uniformly by default. Probably the same. Probably. I would like to be told."

**4. The Spearman problem.** "In the Agreement block: tied lowest on A 1,153, 37%; tied at 0 on B 1,314, 42%; in both tie blocks 1,153. So every single bottom-of-PageRank account is also zero betweenness. Those 1,153 agree perfectly with each other by construction, and they are what gives you 0.781. The informative part of the plot -- the cloud in the middle -- looks much weaker than 0.78 to my eye. I click the little i next to Spearman to see how ties are handled."

*(The info icon does nothing in the prototype.)*

"Nothing. I would want, right under 0.781, the same coefficient with the shared tie block removed, or Kendall tau-b. Otherwise a client reads 0.78 and says 'so they mostly agree', and that is the wrong conclusion for the people who matter."

**5. Top control.** "Top: 5, 10, 20, 50, 100. 'In both at the other choices of Top: 0 of 5, 0 of 20, 0 of 50, 18 of 100.' That is useful, that is the overlap curve in one line. Zero shared until 100. Fine. That, plus the band observation, is my answer."

**6. Differences, both ways.** "Higher on B: ACC-139419 #76 on A, #1 on B, gap 75. Expanded it gives the raw values: PageRank 4.24e-4, betweenness 1.15e-4. Normalized how? 1.15e-4 for the top broker is small -- if it is divided by (n-1)(n-2) that is about a thousand pairs, plausible for a sparse transfer graph. For ranks it does not matter. For a slide it does."

"I switch to Higher on A, which is further down the page. ACC-393859 #1 on A, '#1,780=' on B, gap 1,779. ACC-697114 #2, #1,780=. All eight visible are #1,780=. There it is -- confirmation that PageRank's top are the zero-betweenness block. This list says it more plainly than the headline does. It should be the headline."

"Small thing: '#1,780=' is the lowest number in the tie block, 3,093 minus 1,314 plus 1. So the gap is computed with min rank. Spearman, if it is standard, uses average rank, which would put them at about 2,436. Two tie conventions on one screen. Not wrong, but say which is which."

**7. How was each side computed.** "Under A: 'Unweighted, directed. Details.' Under B: 'Exact. Unweighted, directed. Details.' Exact betweenness, good, not sampled. Unweighted on a payments graph with amounts on every edge -- I saw 'amount' on the Edges tab. Weighted betweenness on amounts would treat amount as distance, which is nonsense anyway, so unweighted might be right for B. For PageRank, weighting by amount is the obvious thing to try. I would want to rerun A weighted and compare again. Where is damping? I click Details."

*(Details has no target in the prototype; nothing opens.)*

"Nothing again. On the protein table screen the column header says 'PageRank damping 0.85, unweighted, full graph' right there. Why does the comparison, which is the place I am checking parameters, say less than the table header?"

**8. Table and export.** "On the protein example, the table puts the three measures side by side with a rank column each, and a line above it: 'MAPK1 and TP53 are the top 2 on all three measures. At #3 they part.' That is the kind of sentence I wanted on the payments comparison. Export table as CSV: all 300 rows, pagerank order, 10 columns including hidden ones, the header carries 'Louvain, weighted, seed 7, full graph'. Full precision in the preview, 0.13785223783101427. Good, pandas reads that. Then I recompute Spearman with and without ties myself in two lines, which I would have done anyway."

"In the comparison itself I could not tell whether Export table as CSV from the Scatter view exports the ranks of both sides or just the current table. I would assume it is the table, and switch to Table first."

**9. Answer to the moderator.** "No, they do not agree about who matters. PageRank's top accounts are collectors -- they sit in the zero-betweenness block. Betweenness's top accounts are brokers ranked roughly 60 to 300 on PageRank. They share nothing until the top 100, where they share 18. The 0.78 Spearman is mostly the 1,153 leaf accounts agreeing that they are leaves, and I would not quote it without a version that drops them."

## Single Ease Question

**5 of 7.** "The plot gave me the answer in about a minute, once I understood how the tie band places dots. The sentence at the top gave me the less useful half of it, and the two places I clicked to check parameters and the tie convention did nothing."

## Would she use it instead of her current tool?

"For the analysis, no -- I would still compute this in the notebook, with Kendall and without the tie block. But the linked scatter and canvas, with the counts of what is not plotted, is the thing I would hand to the fraud investigator. 'Here are the brokers, click one, see it in the graph.' That saves me a meeting. If Details actually shows damping and normalization and the export carries both rank columns, I would use it for the hand-off, not for the science."

## Problems observed

1. **The headline states the boring half of the answer.** "None of the top 10 are the same" is true, but the finding is where each side's top went: PageRank's top sit in the zero-betweenness block, betweenness's top sit around PageRank #60-#300. Emma had to infer it from how the tie band places dots; the Higher on A list said it more plainly than the headline. Severity 2.
2. **Spearman over everything is dominated by the shared tie block** (1,153 of 3,093 accounts tied at the bottom of both). No coefficient without the ties, no Kendall tau-b, and the info icon next to Spearman opens nothing, so the tie handling is unknown. She would not quote 0.781. Severity 3.
3. **Parameters are thinner on the comparison than in the table header.** The comparison says "Unweighted, directed. Details" and Details opens nothing; the table header on the protein screen shows "damping 0.85". Normalization of the betweenness value and the dangling-node handling for PageRank are not stated anywhere she could find. Severity 3.
4. **Two tie conventions on one screen.** The Differences gap uses the lowest rank in the tie block ("#1,780="), while Spearman presumably uses average rank. Not labelled. Severity 2.
5. **No route to a weighted rerun from the comparison.** The payments edges carry an amount, both sides are unweighted, and there is no visible way to swap A for a weighted PageRank and compare again. Severity 2.
6. **Unclear what Export table as CSV writes from the Scatter view** -- both rank columns, or the current table. Severity 1.

## What worked

- Log rank axes with rank 1 top left, the diagonal, and a legend that names every mark.
- Tie blocks drawn as bands with counts, and "1,153 accounts ... not plotted" stated instead of hidden.
- The overlap at every Top choice on one line (0 of 5 ... 18 of 100).
- Selection linked between scatter, Differences list and canvas.
- "Exact" betweenness stated; CSV export at full precision with the run's method in the header.
- "Assistant: Off. Nothing is sent." visible on the rail without looking for it.
