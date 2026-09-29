# Session: do two scores agree on who matters -- Dr. Chen, computational biologist

Participant: the computational biologist persona (study/personas/bioinformatics-researcher.md), a group
leader who ranks proteins in interaction networks in R (igraph) and Cytoscape.
Task as the moderator gave it: "Do these two ways of scoring agree on who matters?"
Screens: the comparison mock (screens/comparison.html), then the results panel mock
(screens/results-panel.html) to check how she would have got there on her own network.
Outcome: success, with some difficulty. Single Ease Question: 5 of 7.

## Transcript (think-aloud, lightly trimmed)

**Opening the comparison screen.**

"OK. This is not my data -- 'Payments network review', 'accounts', ACC-something. Fine, I'll read
accounts as proteins. PageRank against betweenness. That's actually the comparison I'd run: are the
things everything points at the same as the things everything passes through. In a PPI network that is
hubs versus bottlenecks, and they are not the same thing, and a reviewer knows that."

"Left column: In this project, Degree, Louvain, PageRank marked A, Betweenness marked B. So A and B are
the two sides. Good, I don't have to guess which is which."

"The canvas is the usual hairball coloured by PageRank. I'm ignoring it. It tells me nothing about
agreement. Where's the number?"

**The right column, Agreement.**

"Kendall tau-b 0.656. OK, tau-b, so someone thought about ties. Spearman 0.781, and it says 'ties
inflate this'. Hmm. Inflate relative to what? Spearman on mid-ranks is a legitimate statistic; what
inflates it here is the two tie blocks agreeing with each other, and the grey note underneath does
sort of say that -- 'Ties are over 10% of a side, so tau-b leads'. I'd accept that in a methods
section if there were a reference. There's an info icon next to Kendall tau-b; I hover it..." (In the
prototype the icon shows nothing.) "...nothing. I wanted it to tell me the formula or cite something.
If it's just going to say 'a rank correlation', don't bother."

"What I don't see is a p-value or any null. 0.656 on 3,093 nodes is going to be 'significant' against
zero, fine, but what I want is: is 0.656 more than you'd get from the degree sequence alone? Every
centrality correlates with degree. If PageRank and betweenness both mostly track degree, of course they
agree. There's no 'compared with degree' or 'compared with a randomized network' here."

(Later, on the second example further down the page, she spots "Compare with randomized baseline..."
under the March-versus-April comparison.) "So there IS a randomized baseline -- but only when it's one
measure on two data versions? That's the case where I need it least. For two measures on one network it
is the thing I need most. Why is it not here?"

"'top 5 in both: 0 of 5'. That's the headline for me, honestly. The tops don't overlap at all. But
five? Where did five come from?" (She reads the scatter key.) "'the length of its Top nodes list'. So
it's set somewhere else, in the result, not here. I want a top-k I can change right here -- 10, 20,
50 -- or better, overlap as a curve over k. Nobody hands the bench five."

"accounts compared 3,093, tied lowest on A 1,153, 37%, tied at 0 on B 1,314, 42%. Good. I like that
it shows me the ties as counts. In a STRING network expanded from seeds, half my first-shell proteins
have betweenness zero, so this matters, and Cytoscape would never tell me."

"Under the A and B names: 'Unweighted, directed' and 'Exact. Unweighted, directed.' I appreciate
that it says so. On my network I'd immediately ask whether it could use the STRING combined score as
the weight. It doesn't say it can't, and there's a Details link, so I'd assume that's where the
parameters live. Damping factor isn't in this header; I'd want it there, it goes in the legend."

**The scatter in the bottom dock.**

"Rank on A across the top, rank on B down the side, log scale, rank 1 top left, diagonal dashed. OK,
that's a rank-rank plot, I can read that. The grey band on the right and bottom is the tie blocks,
'1,153 accounts are in both tie blocks, in the bottom-right corner, not plotted'. That's a good
decision actually -- otherwise that corner would be a solid black blob and would drive the whole
picture."

"Above the diagonal, higher on B. So there's a cloud of things that are near the top on betweenness
and down around 70 to 300 on PageRank. Those are my bottlenecks that aren't hubs. That's exactly the
list I'd want to look at -- in biology those are often the interesting ones, the adaptors between
modules."

"The dots are all grey. I'd want to colour them by my own column -- logFC, or module -- so I can see
if the bottlenecks are the differentially expressed ones. I don't see how."

**Differences list.**

"'Higher on B', 'Higher on A', toggle. Top 100 on either side, by rank on B. ACC-139419, #76 on A,
#1 on B, gap 75. Click it: it shows both raw values, 4.24e-4 and 1.15e-4, and 'Create set', 'Add
note'. OK, Create set I'd use -- that's my candidate list. It's also selected on the canvas, fine."

"Then I look at 'Higher on A' further down the page: '#1 #1,780=' -- ah, the equals sign means it's
tied, sharing rank 1,780. Took me a second. So the top PageRank nodes have betweenness zero. That's
the 'merchants' story. In my world that would be a protein with lots of incoming edges and no
shortest paths through it, which in an undirected PPI can't really happen, so this example is odd for
me, but the display is clear."

"'Export table as CSV...' -- good, top right of the dock. If that CSV has both ranks, both values and
the tie flags, I can read.csv it into R and redo the correlation myself, which is what I'd do anyway
for the paper. CSV not TSV, I can live with that."

"'90%' with a chevron at the top of the comparison panel. Is that a zoom? A confidence level? A
percentile? I have no idea what 90% is here." (She does not click it.)

**Save and Done.**

"Save comparison, Done. I read the little tiles below: Done throws it away with no question and
offers Reopen. Fine, as long as Reopen is there. Save makes it a result called 'PageRank and
betweenness'. Good, that's what I'd call it."

**Checking how she would get here on her own network (results panel).**

"On the protein network, the Betweenness result panel: distribution, top nodes... I don't see
anything about comparing until I scroll down past Top nodes, and there's 'Compare with...'. I wouldn't
have found that without scrolling; I'd have looked for it next to Color by and Label with, and in the
running state it is there, but in the finished one it's below the fold. The picker offers only
things that can be ranked -- Louvain left out, correct, a partition isn't a score."

**Her answer to the task.**

"Partly. Overall they agree moderately -- tau-b 0.66 -- but most of that agreement is the leaves
agreeing that they're leaves. At the top they disagree completely: none of the top five are shared,
and the betweenness leaders sit around 70 to 300 on PageRank. So no, they don't agree on who matters,
they agree on who doesn't."

## Ratings

- Single Ease Question: 5. "I got the answer, and the numbers were honest about ties. I lost points
  on the empty info icons, the fixed top five, the missing null model and the '90%' I can't decode."
- Would she use it instead of her current tool: "For this particular question, it's better than
  Cytoscape, which doesn't have it at all -- I'd be in R with cor(method = 'kendall') and a ggplot. The
  scatter with the tie blocks pulled out, and the list of who moved, is nicer than what I'd make in ten
  minutes. But I'd still redo the statistic in R for the paper, because I can't see a null, and I
  can't see a way to script it. So: a place to look, and the CSV goes into my pipeline. Not a
  replacement."

## Problems she ran into

1. No null model or significance for two measures on one graph; the randomized baseline is offered
   only for one measure on two data versions (severity 3).
2. "top 5 in both" is fixed by a setting elsewhere (the length of the Top nodes list); no top-k control
   or overlap-by-k here (severity 3).
3. The info icons beside Kendall tau-b and top 5 in both show nothing; she wanted the definition and a
   reference (severity 2).
4. "90%" at the top of the comparison panel is undecodable in this context (severity 2).
5. "ties inflate this" on Spearman reads as a judgement without a reference; she half agrees
   (severity 1).
6. Scatter dots cannot be coloured by her own column (logFC, module) to see who the outliers are
   (severity 2).
7. "Compare with..." sits below Top nodes in the finished result panel, off the first screen
   (severity 2).
8. Damping factor and weighting not shown in the comparison header, only behind Details; they belong
   in a figure legend (severity 1).
9. The "#1,780=" tie notation took a moment to decode (severity 1).

## What pleased her

- Kendall tau-b as the headline, with the ties counted and the reason stated.
- The tie blocks drawn as bands and counted rather than plotted as a blob.
- The "Higher on B" list: bottlenecks that are not hubs, with both raw values and Create set.
- Export table as CSV from the same dock.
- "Unweighted, directed" and "Exact" stated next to each side.
