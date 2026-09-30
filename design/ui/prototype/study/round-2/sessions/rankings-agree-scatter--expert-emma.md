# Do betweenness and PageRank agree? -- Expert Emma (network scientist)

**Task given by the moderator:** "Do betweenness and PageRank agree about who matters here?"

**Screens used:** the comparison screen (PageRank against betweenness on the April payments
transfers, 3,093 accounts), then the bottom dock table (the ranked protein table and the CSV
export dialog). Renders: `shots/record/emma-r2-rankings-comparison-full.png`,
`shots/record/emma-r2-rankings-tabledock-full.png`.

**Outcome:** answered the question, with her own caveat added. SEQ 5 of 7.

## Think-aloud

**1. First look at the comparison screen.**
"OK. Comparison is already open, PageRank is A and betweenness is B. Hairball in the middle,
coloured by PageRank. I am going to ignore that entirely; a force layout tells me nothing
about whether two rankings agree. What I want is under it. Oh -- there is a rank-against-rank
scatter in the dock. Good. That is the right picture. That is literally the plot I would make
in matplotlib, and it would take me twenty minutes to get the ties right."

**2. The sides, top right.**
"A: PageRank, 'Unweighted, directed.' B: Betweenness, 'Exact. Unweighted, directed.' Fine,
it says exact rather than sampled -- I like that it says so. Unweighted, on money transfers?
There will be amounts on those edges. I would want to know whether I could have weighted it,
but at least it is not pretending. Where is the damping factor? And is betweenness normalized?
The row says 'Details'. I click Details on PageRank."

(The prototype shows nothing when Details is clicked.)

"Nothing. So the two numbers I actually need to cite -- alpha and the normalization -- are one
click away and the click does not tell me. In a real build I assume it opens something. But
I notice the table screen prints 'PageRank damping 0.85' right in the column header, and this
screen hides it. Why is the table more honest than the comparison?"

**3. The selected account's values.**
"ACC-139419: PageRank 4.24e-4, #76. Betweenness 1.15e-4, #1 of 3,093. 1.15e-4 for the top
broker? That is normalized, obviously -- raw betweenness on 3,000 nodes would be in the
hundreds or thousands. Normalized by what? (n-1)(n-2) for directed? networkx and igraph do not
agree on this and I cannot tell which this is. For the ranking question it does not matter --
ranks are invariant to a constant. For anything I put in a paper it does. I am writing that
down as a problem, not a blocker today."

**4. The Agreement block.**
"Kendall tau-b 0.656 headlined, Spearman 0.781 with '(ties inflate this)'. OK, someone here
knows what they are doing -- tau-b is the right headline with 37 and 42 percent ties. Top 5 in
both: 0 of 5. Accounts compared 3,093, 1,153 tied lowest on A, 1,314 tied at 0 on B. Good, it
gives me denominators and percentages together."

"But -- hang on. 'Ties inflate this' is on Spearman only. Tau-b is inflated by the same thing.
The 1,153 accounts tied at the bottom of both are all concordant against every account above
them on both measures. That is over a million concordant pairs of 'leaf is below non-leaf'
before you get to anything interesting. The tie correction in tau-b handles pairs tied within
the block; it does nothing about the block agreeing with everyone else. So 0.656 is mostly
'both measures agree that leaves are leaves'. The label is implying tau-b is the clean number.
It is not clean, it is less dirty."

**5. The scatter.**
"Log rank axes, rank 1 top left, diagonal dashed. Top-5 shaded corner, empty. The tie blocks
are drawn as bands along the bottom and the right edge, labeled with counts -- '1,314 accounts
tied at 0', '1,153 accounts tied at the lowest PageRank'. And the ones in both blocks are
counted in the key but not plotted. Good. That is correct and I have seen tools just drop them
silently."

"The actual picture: nothing near the diagonal in the top 50. The top of betweenness -- the
column of dots up at ranks 1 to 30 -- sits at PageRank rank 70 to 300. Classic: brokers are
not sinks. Money passes through them, it does not pool there. Below rank a few hundred it
fans out into the middle and then collapses into the tie blocks."

"So my answer is already here: no, they do not agree on who matters at the top. They agree on
who does not matter. The headline number mostly reflects the second part."

**6. Looking for a way to prove that.**
"What I want now is tau on the accounts outside both tie blocks, or a top-k overlap curve --
top 10, 50, 100, 500 -- or rank-biased overlap. Is there a control for the top 5? No. The key
says 'the length of its Top nodes list'. So if I want top 50 I go and change some other list
somewhere? That is backwards. Five is an arbitrary number and 0 of 5 is not much of a
statistic."

"No way to exclude the tie block from the correlation either. Fine. I will do it in pandas."

**7. Differences list.**
"'Higher on B' -- top 100 by betweenness rank, with the A rank and the gap. ACC-139419 #76 vs
#1, ACC-701495 #316 vs #2. That is the useful list for the client: here are the accounts money
flows through that you would not find by PageRank. 'Create set' on the row -- OK, I can see
using that to hand the investigator the brokers. 'Higher on A' -- the sinks at the top of
PageRank that are at 0 betweenness. Also correct, and also useful. That list, frankly, is the
deliverable."

**8. The info icons and the 90%.**
"There is an (i) next to Kendall tau-b and top 5. I hover. Nothing in this mock. I would expect
the formula or at least 'tau-b, Kendall 1945' there. And what is '90%' next to 'Comparison'?
Zoom? Of what? I do not know and I am not going to find out."

**9. Getting the numbers out.**
"'Export table as CSV...' in the dock. I switch to the table screen to see what that writes."

(Moves to the dock table screen, the three-measures state and the export dialog.)

"Here the table has group headers: 'Betweenness exact, unweighted, full graph', 'PageRank
damping 0.85, unweighted, full graph', each with a score column and a rank column, '#4=' for
ties. Good. The agreement sentence above it: 'MAPK1 and TP53 are the top 2 on all three
measures. At #3 they part.' That is the right kind of sentence. Compare rankings... link.
Right, that is how you get to the scatter."

"Export dialog: all 300 rows, 9 columns, hidden ones included, file's own id first, the run's
method and scope in the header. Preview shows full-precision floats. Ranks as whole numbers.
That is exactly what I want. I load that in pandas, drop the double-tie block, call
scipy.stats.kendalltau and I have my number in two lines. I will also check the betweenness
column against networkx -- and I cannot until I know the normalization. Header says
'betweenness exact, unweighted'. Not 'normalized'. Hm."

"And the comparison header row has no export of its own. The dock's CSV is the only way out.
I am fine with that, as long as the CSV from the comparison view carries both ranks, which it
says it does."

**10. Wrap-up answer to the moderator.**
"No. They disagree about who matters. None of the top 5 overlap, and the top brokers by
betweenness are around #70 to #300 on PageRank. The 0.656 tau-b looks like moderate agreement
but most of it is the 1,153 leaf accounts that both measures put at the bottom. They agree who
is irrelevant; they disagree about who is important. Which, for a payments network, is the
interesting finding -- sinks and conduits are different accounts."

## Single Ease Question

**5 of 7.** "The picture and the lists got me the answer fast. I lost points because I had to
do the last step -- 'how much of this agreement is just the leaves' -- in my head, and I would
have to do it in pandas to report it. And I still do not know the betweenness normalization."

## Would she use it instead of her current tool?

"Not instead of the notebook -- kendalltau is one line and I trust it. But as the thing I put
in front of the client? Yes. This scatter with the tie bands drawn honestly, plus the 'Higher
on B' list with a Create set button, is a better exhibit than anything I would build in
matplotlib by Thursday. And the export gives me every value with its method in the header, so
I can check it. Tell me the normalization and the damping on this screen and I would stop
being suspicious of it."

## Problems she ran into

| Where | What | Severity (1-4) |
|---|---|---|
| Comparison, Agreement | "ties inflate this" sits on Spearman only; tau-b is lifted just as much by the shared bottom tie block agreeing with every account above it. The labeling suggests tau-b is the clean number when it mostly measures "leaves are leaves". | 3 |
| Comparison, Agreement | No way to see agreement outside the tie blocks (tau on the untied accounts) or at other top-k sizes; the answer to "who matters" needs one of those. She had to reason it out and plans to redo it in pandas. | 3 |
| Comparison, sides | Betweenness normalization is never stated anywhere (1.15e-4 for rank 1 is plainly normalized, by what?). Same in the table header and export header. | 3 |
| Comparison, sides | Damping factor hidden behind Details here, while the table header shows "PageRank damping 0.85" in plain view. Inconsistent, and Details showed nothing. | 2 |
| Comparison, scatter | Top-5 corner fixed to the length of some other Top nodes list, no control on this screen; 0 of 5 is a weak statistic. | 2 |
| Comparison, Agreement | The (i) icons next to Kendall tau-b and top 5 reveal nothing; she expected the definition or citation. | 1 |
| Comparison, header | "90%" dropdown next to "Comparison" -- meaning unknown. | 1 |
| Comparison, sides | "Unweighted" on a money-transfer graph with amounts; stated honestly, but no hint whether a weighted run is possible. | 1 |

## What delighted her

- The rank-against-rank scatter on log axes with the diagonal, and tie blocks drawn as labeled
  bands with the double-tied accounts counted rather than silently dropped.
- Kendall tau-b as the headline with the tie percentages and denominators shown.
- "Exact" stated on betweenness.
- The "Higher on B" / "Higher on A" lists with the gap, and Create set on a row -- that is the
  client deliverable.
- The CSV export: every row, the file's own ids, full precision, each run's method and scope in
  the column header.
