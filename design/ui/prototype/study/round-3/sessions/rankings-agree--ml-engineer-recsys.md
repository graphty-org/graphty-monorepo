# Session: do two rankings agree -- Chris, ML engineer (recommendation systems)

Participant: Chris, senior ML engineer who owns candidate retrieval at an online retailer. Lives in
notebooks and PyTorch Geometric; opens a graph viewer a couple of hours a week to debug single
recommendations. Played at 1440 x 900, light theme first, then dark.

Task as given by the moderator: "Do these two ways of scoring agree on who matters?"

Screens: the comparison surface (two measures, then the same measure on two data versions), then
the Results panel to see how I would have got there.

Render used for the full page: shots/r3-chris-rankings-comparison-full.png (study view).

---

## Think-aloud transcript

**0:00 -- first look at the comparison screen.**
"OK, payments network, 3,093 accounts. Not my data, which I'll hold against it later, but fine for
the task. Two scorings -- the left rail says A is PageRank and B is betweenness. The right column
has a sentence in bold: 'The rankings disagree at the top: none of the top 10 are the same.' So
that's the answer, before I've done anything. Honestly that's what I want. Most tools make me
eyeball two bar charts and guess."

**0:20 -- the denominator.**
"First thing I look for: over what? 'Spearman 0.781 over all 3,093 accounts', 'accounts compared
3,093', 'Full graph'. Under A: 'Unweighted, directed.' Under B: 'Exact. Unweighted, directed.'
Good -- it tells me directed, unweighted and that betweenness is exact, not sampled. That's the
stuff I'd normally have to go read the source for. Damping for PageRank is behind Details; I'd
rather see 'd=0.85' inline, it's four characters, but I can live with a click."

**0:45 -- where the Spearman is coming from.**
"Now wait. 'tied lowest on A: 1,153, 37%'. 'tied at 0 on B: 1,314, 42%'. 'in both tie blocks:
1,153'. So more than a third of the whole set is a tie block that agrees on both sides -- the leaf
accounts are last on both. That's going to pad Spearman. A 0.781 that's mostly 'the zeros agree
with the zeros' is not the same claim as 'these measures agree'. I hover the little (i) next to
Spearman hoping it tells me how ties are handled or gives me Spearman over the non-tied accounts.
[The mock shows only the icon; no tooltip text is visible.] I'd want either that number or a
top-weighted one -- Kendall, rank-biased overlap, whatever -- right there. As it stands the bold
sentence is honest and the 0.781 under it is kind of misleading if you don't read the tie rows."

**1:15 -- the Top control.**
"Top: 5, 10, 20, 50, 100. And the line under it: 'In both at the other choices of Top: 0 of 5, 0
of 20, 0 of 50, 18 of 100.' That's basically overlap@K -- I think in Recall@K all day, so this
lands. 0 of 50 and then 18 of 100 is a strong statement: these two scores pick different
accounts at the top. I didn't even need to click the segmented control because the line gives me
all of them. I would want K past 100 though -- on 3,093 nodes, K=300 or K=10% is a normal thing to
ask. And a little curve of overlap vs K would beat a sentence of numbers."

**1:40 -- the scatter.**
"The dock at the bottom says Scatter. At laptop height I only get the top of it -- the hairball
takes the middle of the screen and the chart I actually care about is half below the fold. I
scroll. Rank on A across, rank on B down, log-log, rank 1 top-left, dashed diagonal. OK, that's
the right plot. Tie blocks drawn as bands at the right and bottom edge, labelled '1,314 accounts
tied at 0' and '1,153 accounts tied at the lowest PageRank', and a note that 1,153 in both blocks
are not plotted. I like that it tells me what it dropped instead of silently dropping it."

"The legend says 'Above the line, higher on B; below it, higher on A.' Took me a second -- 'higher'
means better rank, and rank 1 is at the top, so above the diagonal is 'B likes it more'. Fine once
I parse it, but 'higher' on a chart where the numbers go down is a small trip."

"The cloud is mostly below the diagonal, in the tail. The top-left shaded corner, 'top 10', is
empty. There's a sparse column of dots up near the top on B that sit around 100 on A. The
selected one, ACC-139419: '#76 on A, #1 on B'. So the number-one broker by betweenness is only
#76 on PageRank."

**2:30 -- differences list.**
"Right column, Differences, 'Higher on B' tab: ACC-139419 #76/#1 gap 75, ACC-701495 #316/#2 gap
314, ACC-951032 #276/#3 gap 273. So the top betweenness accounts are sitting at #70 to #300 on
PageRank. Clicking the row expands it with the raw values -- 4.24e-4 and 1.15e-4 -- and 'Create
set' / 'Add note'. Good: values, not just ranks."

"I click 'Higher on A'. ACC-393859 #1 vs #1,780=, gap 1,779; #2 vs #1,780=; ... all the top
PageRank accounts are in the zero-betweenness tie. Oh -- that's actually the finding. The accounts
PageRank loves have zero betweenness: money flows IN and never passes through. Sinks. And the
brokers that everything passes through are mid-pack on PageRank. That's a real answer to 'who
matters', and it depends which kind of 'matters' you mean."

"Nit: sorting by raw rank gap means every 'Higher on A' row is just 'something vs the tie', gap
~1,780. A log-rank gap or 'rank on A within the non-tied set' would sort these more usefully. And
'#1,780=' -- the equals sign for a tie, I got it, but I had to look twice."

**3:20 -- does it link?**
"The canvas has ACC-139419 ringed in the same place, and the legend note says the selection is
shared. Clicking a dot, a row or a node selects the same account everywhere. That part my notebook
does not do -- in matplotlib I'd be printing ids and grepping."

**3:40 -- export.**
"'Export table as CSV...' in the dock -- the design says every account, both values and both
ranks. With the original account ids, I assume, because they're shown as ACC-xxxxx. CSV is fine.
No Parquet, which I'll mention every time."

**4:00 -- second example, same measure on two months.**
"Here it's PageRank March vs April. Bold sentence: 'agree at the top: all 10 of the top 10 are the
same.' Spearman 0.876 over the 2,961 accounts in both months. And a 'Not matched' block: 39 only
in March, 132 only in April -- counted, not plotted. That's the join-on-id problem handled for me,
which is usually where my notebook version has a bug. There's a line: 'PageRank gives the same
result every run, so a re-run cannot tell change from noise' and 'Compare with randomized
baseline...'. Someone here has thought about noise floors. I'd click that."

**4:40 -- the Results panel: how would I have got here?**
"The moderator sends me to the Results panel to see the way in. I'm on Betweenness finished,
the editor card is open with Run, the dots menu and a close. Scope, Weight, Appearance, a
distribution, Top nodes. I don't see 'Compare' anywhere in view. I check the dots menu first
because that's where secondary actions live in every tool. [The mock does not show that menu's
contents.] In another state of the same panel there's a 'Compare with...' button next to 'Color
by...' and a popover: 'Compare PageRank with' -- PageRank on March data, Betweenness 'Not run',
Degree. So it's there, but it's below Label with..., in the Appearance area, which is a weird home
-- comparing isn't appearance. I'd probably have found it by typing 'compare' into the 'Find a
result or algorithm' box, if that searches actions. Half a minute of hunting, not a blocker."

"The popover lists results in this project. What it does not show: can B be a column I imported?
My whole reason to be here is 'Adamic-Adar vs my model score on the same pairs'. If Compare with...
only takes things the app computed, then this is a nice demo of PageRank vs betweenness and not my
job."

---

## Answer to the task (in my words)

No, not at the top. None of the top 10 (and none of the top 50) are shared; 18 of the top 100 are.
Spearman 0.781 looks like agreement but a big chunk of it is the ~1,150 zero/leaf accounts being
last on both. The top-PageRank accounts all have zero betweenness -- money comes in and stops --
while the top betweenness accounts, the pass-through brokers, sit around #70-#300 on PageRank.
So they measure two different kinds of "matters". For the March-vs-April version of PageRank: yes,
they agree, all 10 of the top 10.

## Single Ease Question

**6 / 7.** The answer was a sentence at the top of the column. What cost me time was deciding
whether to believe the Spearman, and scrolling to the scatter.

## Would I use this instead of my current tool?

"For this exact question, my current tool is `spearmanr` plus a set intersection -- five lines. So
the number itself doesn't win me over. What wins me over is the rest: the tie blocks counted
instead of hidden, the overlap at every K in one line, the unmatched ids counted, and clicking a
dot or a row and having the same account ringed on the graph and ready to turn into a set. That's
the part I'd otherwise glue together with print statements. I'd use it -- if side B can be a column
I imported, like my model score, so I can do heuristic vs model. If it only compares its own
algorithms to each other, it stays a nice demo."

---

## Problems observed

1. **Spearman over everything is inflated by the shared zero tie block, and there's no number
   without it** (severity 3). 1,153 of 3,093 accounts are tied last on both sides. The screen
   counts them honestly but the headline statistic still includes them, and the (i) shows no
   explanation. Wanted: Spearman over the non-tied accounts, or a top-weighted measure, beside it.
2. **The scatter is below the fold at laptop height; the hairball takes the centre** (severity 3).
   At 1440 x 900 only the top of the rank-vs-rank chart is visible under a canvas that says nothing
   for this task.
3. **Can't tell if an imported column can be one side** (severity 3). Compare with... lists only
   results computed in the project. Comparing a heuristic with my own model score is my main reason
   to open a graph tool.
4. **Compare with... is hard to find from a finished result** (severity 2). Not visible in the
   finished editor view; it lives under Appearance, below Color by... and Label with..., where I did
   not look. I checked the dots menu first.
5. **Top stops at 100** (severity 2). On 3,093 nodes I'd want K=300 or a percentage, and an
   overlap-vs-K curve rather than a sentence of numbers.
6. **"Higher on A" list sorted by raw rank gap is dominated by the tie** (severity 2). Every row is
   "#n vs #1,780=, gap ~1,780", so the sort order carries almost no information.
7. **"Above the line, higher on B" with rank 1 at the top** (severity 1). "Higher" means better
   rank while the axis numbers grow downward; took a second parse.
8. **PageRank damping only under Details** (severity 1). A short "d=0.85" in the state line would
   save a click.
9. **CSV only, no Parquet** (severity 1).
