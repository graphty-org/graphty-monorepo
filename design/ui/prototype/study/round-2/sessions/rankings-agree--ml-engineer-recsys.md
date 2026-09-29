# Session: do two scores agree on who matters -- Chris, ML engineer (recommendations)

Participant: Chris, senior ML engineer on a retail recommendations team (persona:
study/personas/ml-engineer-recsys.md). Lives in notebooks; judges every number by its denominator.

Task as given by the moderator: "Do these two ways of scoring agree on who matters?"

Screens used: the comparison surface (screens/comparison.html) and the Results panel
(screens/results-panel.html), viewed as renders at 1440 x 900 and scrolled.

## Think-aloud

**Opening the comparison screen.** "OK, it's a payments graph, not mine, fine. Two scores:
PageRank is A, betweenness is B. The little A and B boxes in the left list match the A and B on the
right. Good, I don't have to guess which is which."

"First thing I look for is the number. Right column, Agreement: Kendall tau-b 0.656. Spearman
0.781 'ties inflate this'. Huh -- somebody actually thought about ties. That's the thing I'd get
wrong in a notebook the first time: `scipy.stats.spearmanr` on a column that's 40% zeros, and you
get a nice big number that means nothing. So tau-b 0.656 is the honest one. Moderate agreement."

"Next line: top 5 in both, 0 of 5. So they agree overall and disagree completely at the top.
That's actually the answer, isn't it? They agree on who DOESN'T matter and disagree on who does."

"Denominators: accounts compared 3,093. Tied lowest on A 1,153, 37%. Tied at 0 on B 1,314, 42%.
Counts AND percentages. Thank you. The line under it says ties are over 10% of a side so tau-b
leads. Fine, I buy that rule."

"I hover the little (i) next to Kendall tau-b to see if it says tau-b versus tau-a, and next to
'top 5 in both'... nothing happens here in the mock. I want that tooltip to be one line and exact:
'tau-b: concordant minus discordant pairs, corrected for ties.' If it's a paragraph, I skip it."

**Why top 5?** "Top 5 is a weird K. My whole life is Recall@50, top-100 overlap. Where do I change
the 5? I click the '0 of 5'... nothing. The key down in the scatter says 'the length of its Top
nodes list', so the 5 is borrowed from some other panel's list length? So to get top-50 overlap I
go change a list length somewhere else? That's backwards. I'd want an overlap curve -- overlap at
K for K = 5, 10, 50, 100 -- or at least a K box right here."

**The scatter.** "Bottom dock, Scatter tab. Rank on A across the top, rank on B down the side, log
axes, rank 1 top left, diagonal dashed. At 1440 x 900 I get maybe 150 pixels of it before the
window ends -- I have to scroll the whole page or drag the dock up. The chart is the good part and
it gets the smallest slice of the screen. The canvas above it is the usual purple hairball and it's
telling me nothing for this question -- I'd collapse it."

"Once I scroll: grey band at the bottom, '1,314 accounts tied at 0', band on the right, '1,153
accounts tied at the lowest PageRank', and '1,153 accounts are in both tie blocks, in the
bottom-right corner, not plotted'. OK, so the leaves are all leaves on both. That's what's
propping up Spearman. I get it. The cloud of dots above the diagonal on the right, low PageRank,
high betweenness -- that's the brokers. Makes sense for money flows."

"Axis label on the left is clipped: 'Rank on B: betweenness, 1' and then it runs off. Minor."

"The '90%' dropdown at the top of the right column -- what is that? Zoom? Confidence? It sits
right above the statistics so I first read it as a confidence level for the tau. It's probably the
canvas zoom. It should not be sitting next to my statistics."

**The difference list.** "Right column, Differences, 'Higher on B' is selected. Top 100 on either
side by rank on B. ACC-139419: #76 on A, #1 on B, gap 75. Expanded row shows the raw values,
4.24e-4 and 1.15e-4, and 'of 3,093'. Good -- raw values and ranks, not just ranks. 'Create set'
would be how I'd pull these out. I'd rather sort the list by gap than by rank on B, though -- 'the
biggest disagreements' should mean biggest gap first. Here it's ordered by rank on B and the gaps
go 75, 314, 273, 67... so the big ones aren't first. Is there a sort? I don't see a column header
I can click."

"Export table as CSV... in the dock: 'writes every account with both values and both ranks'. That
is the single most important button on this page for me. If that CSV keeps my original ids, I'll
take it into the notebook and do the rest there."

**Second example: the same score on March versus April data.** "tau-b 0.781, top 5 in both 5 of 5,
39 only in March, 132 only in April, counted not plotted. 'Compare with randomized baseline...'
-- OK, that's a noise floor, I'd click that. And there's a note that PageRank is deterministic so
re-running doesn't tell you anything. Correct. For something seeded like Louvain it says it shows
the re-run agreement -- that's the right instinct. That's the part I'd use for model versions:
last night's scores versus tonight's."

**How do I get here?** "Now I go back to the Results panel to see how I'd start this myself.
Finished Betweenness result: Scope, Weight, Appearance with Color by and Label with, then a
distribution, then Top nodes... no Compare. I scroll -- 'Compare with...' is at the very bottom,
under the top nodes. On the running-state render it's up in Appearance with Color by and Label with.
Which is it? I'd have typed Cmd+K 'compare' after 30 seconds either way."

"The picker at the bottom of the comparison page: 'Compare PageRank with' -- PageRank on March
data, Betweenness (not run), Degree. It lists 'what can be ranked against a score'. My real
question is: can I pick a column I imported? My model score, or Adamic-Adar that I computed
upstream? If this only compares graphty's own algorithms against each other, it answers a question
I don't have. The screen doesn't say either way."

"And the scale thing: the note says 'past about 2,000 accounts dots overlap; binning is deferred'.
My item side is 600k. So on my data the scatter is a solid grey rectangle until you build the
binning. The statistic and the list would still be fine."

## Answer to the moderator

"They partly agree. Kendall tau-b is 0.656 over 3,093 accounts, but a big chunk of that is the
1,153 accounts that are at the bottom of both -- the leaves. At the top they don't agree at all:
zero of the top 5 overlap, and the top of betweenness sits around #70 to #300 on PageRank. So:
they agree on who doesn't matter, not on who does."

## After the task

Single Ease Question: 5 of 7. "Reading the answer was easy -- one number, one overlap, one
picture. Getting to the comparison, changing K, and knowing whether my own column can go in, not
so easy."

Would he use it instead of his current tool: "Not instead of the notebook -- tau is one line of
scipy. But the tie handling, the scatter with the tie bands, and a list of the disagreeing ids I
can turn into a set is more than I'd bother to build for a one-off. If I can drop my model score
in as B and export the CSV with my ids, I'd use this for the 'where does the GNN disagree with
the heuristic' question. If it only compares its own algorithms, it's a demo."
