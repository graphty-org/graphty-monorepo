# Session: do two ways of scoring agree on who matters? -- Expert Emma

Participant: Emma, network scientist and consultant (fraud networks, protein interaction sets).
Lives in Jupyter with networkx and igraph; uses Gephi for final figures. 27-inch monitor, Firefox.

Task as given by the moderator: "Do these two ways of scoring agree on who matters?"

Screens: the comparison screen (PageRank against betweenness on the April transfers, then the same
surface for PageRank on March against April, and the states around it: computing, the other
direction of the difference list, accounts on one side only, saved, closed without saving, and the
"Compare with" picker), then the Results panel (a finished ranking, its Details run record, the
"Exact" info note).

## Part 1 -- what is on the screen

**First look, comparison surface.** "Two ways of scoring. The left column says PageRank with an A
badge and Betweenness with a B. So I am already inside a comparison. Fine. Right column: 'PageRank
and betweenness', then A, 'Unweighted, directed. Details', and B, 'Exact. Unweighted, directed.
Details'. Good, it says exact, so this is not some sampled estimate."

"Stop. Unweighted. These are transfers. Transfers have amounts. If the question is 'who matters'
in a money network, I would at least want to know whether the amount column was offered and
refused, or just never used. Let me look at Details."

**Details on A (the run record, as the Results panel shows it).** "Method, seed, damping,
normalization, weight conversion, direction, engine, and a Copy button for a methods section.
Damping 0.85, the usual. 'Weight conversion: None, unweighted'. OK -- it is written out, not
missing. That I respect. And 'Does not apply' written for things that do not apply. Somebody has
read a reviewer's comments before."

"Betweenness normalization for a directed graph: divided by (n-1)(n-2). That matches networkx with
normalized=True for a directed graph. Good. I would still want to check one value against my
notebook before I believed any of it, but I can at least see what I would be checking against."

"But I still ran both of them unweighted on a payments graph. That is my own fault as much as the
tool's, but nothing on this screen says 'amount is available and unused'. I would have to remember
to go back to the Results panel and change the Weight dropdown. For 'who matters' in money flows,
that is not a detail."

## Part 2 -- the agreement numbers

**Agreement section.** "Kendall tau-b 0.656. Named as tau-b, not just 'tau' or 'correlation'. Good,
because tau-a with this many ties would be nonsense. Spearman 0.781, labeled 'ties inflate this'.
Hmm."

"No. That label is wrong, or at least it teaches the wrong thing. Spearman is on a different scale
from tau; on the same data rho usually comes out bigger than tau, ties or no ties. Rough rule is
something like three halves. So 0.781 against 0.656 is not 'inflation', it is two different
statistics. What actually inflates both here is the big block of leaves that both measures put at
the bottom. If a junior analyst reads 'ties inflate Spearman' they will repeat it in a report and
someone like me will circle it."

"The little (i) next to Kendall tau-b. I hover it. Nothing I can read in this prototype. I would
want one line: tau-b, pairs tied on either side dropped from the numerator, the denominator
corrected. And which rank convention -- average ranks for ties, or minimum? The differences list
shows '#1,780=' for the betweenness zeros, which is minimum rank, top of the tie. If the Spearman
uses that instead of average ranks, it is not the textbook Spearman. I cannot tell from here."

"'top 5 in both: 0 of 5'. Now that is the interesting line. That is the answer to the moderator's
question in one number, more than the tau is. The tau says 'broadly yes', the top 5 says 'not at
all at the top'. Those are both true and the screen shows both, which is correct."

"Accounts compared 3,093. Tied lowest on A 1,153, 37 percent. Tied at 0 on B 1,314, 42 percent. Ties
are over 10 percent of a side, so tau-b leads. Right. And the text says the 1,153 PageRank-bottom
accounts are all inside the 1,314 zero-betweenness ones. Of course they are -- an account with
nothing flowing in has the minimum PageRank and cannot sit on anybody's shortest path in a directed
graph. That checks out. I like that I can check it."

**What 90% is.** "What is the '90%' next to 'Comparison' in that header? Ninety percent what?
Confidence? A threshold for 'agree'? A top ten percent cut? ... It has a chevron. I click it -- it is
the zoom of the canvas. Why is the canvas zoom sitting in the header of a statistics panel, next to
a statistic? I read it as a confidence level for a good ten seconds."

## Part 3 -- the scatter

"Scatter in the bottom dock. Rank on A across the top, rank on B down the side, log scales, rank 1
top left. The diagonal is the 'same rank on both' line. Top-5 corner shaded. ACC-139419 circled at
the top: #76 on PageRank, #1 on betweenness. So the number one broker is not even top fifty on
PageRank. That is a finding."

"The dots: a column climbing up from the right side and a cloud above the diagonal in the lower
right. So, above the line, higher on betweenness. The brokers are the ones sitting in the middle of
PageRank and high on betweenness. Fine, that reads."

"Underneath the plot, '1,314 accounts tied at 0'. That label is under the horizontal axis, the
PageRank axis, but 1,314 is the betweenness tie. I read it as a PageRank count first, then the key
on the right explains the grey band. The label for the vertical band is written sideways on the
right, '1,153 accounts tied at the lowest PageRank'. So each band is labeled on the side opposite
its own axis. Once you know, it is fine. The first time, I got it backwards."

"And '1,153 accounts are in both tie blocks, in the bottom-right corner, not plotted'. Good. Saying
what is not plotted is exactly right. Most tools just pile them on top of each other and you think
there are ten dots."

## Part 4 -- who, specifically

**Differences list, Higher on B.** "Top 100 on either side, by rank on B. ACC-139419 #76 on A, #1
on B, gap 75. Click it: raw values, PageRank 4.24e-4, betweenness 1.15e-4, #76 of 3,093, #1 of
3,093. Create set, Add note. Fine."

"Betweenness of 1.15e-4 for the top broker is small, but with n(n-1) normalization on a sparse
directed graph with lots of sinks, I can believe it. I would check it."

"Higher on A: the ones at the top of PageRank at '#1,780=' on betweenness, meaning at zero. Those
are sinks. Money goes in and stops. Merchants, I would bet -- but the list does not say what kind of
account they are. I would have to flip to Table view to see the kind column. For 'who matters' I
want to know WHO, not a string of account numbers."

**What I actually want and do not see.** "The overall tau is dominated by leaf versus everybody.
Of course two centralities agree that a leaf is unimportant. The question is whether they agree
among the accounts that matter. I want the tau on the accounts that are not in either tie block, or
a weighted tau, or rank-biased overlap, or at least overlap at k for k = 10, 20, 50, 100 as a
little curve. 'Top 5' is a single point, and the text says 5 comes from the length of the Top nodes
list, which is a display setting. Why would a display setting decide my statistic?"

"There is no way here to narrow the comparison to the non-tied accounts. There is 'Export table as
CSV'. The design notes say it writes every account with both values and both ranks. Then fine: I
export and do the restricted tau in scipy in two lines. That is what I would do anyway. At least the
export is there and it is the whole table, not a top-100."

## Part 5 -- getting here and the second example

**Getting here, from the Results panel.** "On the PageRank row, 'Compare with...'. The picker lists
only things you can rank against, and Louvain is left out because it is a grouping. That is
correct. Betweenness shows 'Not run' and picking it runs it first with a progress bar and Cancel.
Fine, that is the one-command version. No wizard. Good."

**March against April.** "Same surface, one measure on two months. 'Compare with randomized
baseline...' shows up here, and a line saying PageRank gives the same answer every run so a re-run
cannot tell change from noise. That is a thoughtful sentence. Why is there no baseline link for the
PageRank-against-betweenness case? A degree-preserving rewiring null would tell me whether 0.656
is anything more than 'both measures like high-degree nodes'. I would actually want that more for
two measures than for two months."

"'Only in March, closed 39', 'only in April, opened 132', counted and not plotted. Good."

## After the task

**Answer to the moderator.** "Broadly, and only in the boring part. Tau-b 0.656 overall, but most of
that is both measures agreeing that the leaves are leaves. At the top they do not agree at all: none
of the top 5 overlap, and the biggest broker by betweenness is #76 on PageRank. PageRank's top is
where money ends up; betweenness's top is where it passes through. Different accounts matter for
different reasons. And both were unweighted on a transfer graph, so I would rerun with amount
before I told a client anything."

**Single Ease Question: 5 of 7.** "Getting the answer was easy. The screen put tau-b and the top-5
overlap next to each other, which is the right pairing, and the scatter plus the differences list
told me who. I lose points for 'ties inflate Spearman', for a top-k fixed by a display setting, for
the zoom looking like a confidence level, and for the weight thing not being in my face on a
payments graph."

**Would I use this instead of my current tool?** "Instead of the notebook, no -- the statistic I
actually want, tau on the non-tied accounts or overlap at k, I would compute in scipy from the
exported CSV. But the scatter with the tie bands drawn and counted, the differences list I can
click through, and the run record I can copy into a methods section -- that is what I would put in
front of a fraud investigator, and it is faster than building that plot in matplotlib and far
faster than doing it in Gephi, which cannot do it at all. So: alongside, for the hand-off. Fix the
Spearman label before a student of mine sees it."
