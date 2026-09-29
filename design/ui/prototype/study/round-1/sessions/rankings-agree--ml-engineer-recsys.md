# Session: do two scorings agree on who matters? -- Chris, ML engineer (recommendation systems)

**Task as given by the moderator:** "Do these two ways of scoring agree on who matters?"

**Screens used:** the comparison surface (first state: PageRank against betweenness on the April
transfers), its other states further down the same page, and the finished state of the Results
panel. Viewed at 1440 x 900 in dark mode, which is how Chris runs everything.

**Outcome:** success. He answered the question in under a minute from the right column, then spent
the rest of the session trying to decide whether to trust the answer.

**Single Ease Question:** 6 of 7.

---

## Transcript (think-aloud, lightly trimmed)

**0:00 -- first look.**
"OK, dark mode, good, it didn't flash white at me. Two canvases side by side, A is PageRank, B is
betweenness, both 'April data'. This is not my data -- payments accounts, 3,093 of them. Fine, it's
your sample, I'll play along, but my first question in real life would be whether I can put my own
column on side B.

Two hairballs. Colored by rank. I'm not going to learn anything from two galaxies of dots, so I'm
going straight to the numbers on the right."

**0:15 -- the Agreement block.**
"Spearman rank correlation 0.781. Top 50 in both: 0 of 50. Ha. OK, that's actually the interesting
bit, that's the thing I'd want to see. Correlated overall, zero overlap at the head. That's the
classic 'correlation over the whole population is driven by the long tail agreeing that nobody
matters' situation.

Accounts compared 3,093 -- so nothing dropped, good, that's my denominator. Tied lowest on A 1,153,
tied at 0 on B 1,314. Wait. 1,314 accounts are tied at zero betweenness and they're IN the Spearman?
'Tied accounts share their average rank.' So a third of the population is one giant tie on B and
more than a third is a giant tie on A. How much of that 0.781 is just the two big tie blocks
lining up? I'd want Spearman on the accounts that are non-zero on both sides, or on the union of
the top K. There's no way to get that here."

He hovers the (i) next to Spearman and next to "top 50 in both".
"Info icons. In the prototype nothing comes up, so I'll assume it says what the line under it says.
What I want the tooltip to tell me is: is it scipy's spearmanr with average ranks, is it over 3,093
or over the non-tied subset, and why 50. Is 50 fixed? I can't change K. At K=50 it's zero -- what
is it at 100, at 500? That curve is the actual answer to 'do they agree on who matters.'"

**0:50 -- his answer to the task.**
"So: no. They agree broadly on the bulk, they disagree completely on the top. If 'who matters' means
the top 50, the two scores pick disjoint sets. That's the answer, and I got it from two numbers.
That part is good."

**1:10 -- the Differences list.**
"'Higher on B' is selected. Top 100 on either side, by rank on B. Columns: account, A, B, gap.
ACC-139419 is #76 on PageRank and #1 on betweenness, gap 75. Then #316 to #2, #276 to #3...

Hang on, the header says 'gap' but it's sorted by rank on B, not by the gap. ACC-976722 has a gap of
485 and it's at row eleven. If I'm hunting disagreement I want to sort by the gap. Can I click the
column header? Nothing in this suggests I can. In a notebook that's `df.sort_values('gap')`.

The gap is unsigned and the toggle above tells me direction. That's fine, I get it, 'Higher on A'
flips it."

He clicks the selected row, which is already open.
"PageRank 4.24e-4, #76 of 3,093. Betweenness 1.15e-4, #1 of 3,093. Good -- the raw value AND the
rank AND the denominator. That's what I check first on anything. Betweenness 1.15e-4 as the max
though -- is that normalized? Weighted by transfer amount? Directed? PageRank on a payments graph
should be directed and probably weighted. Nothing on this screen tells me how either side was
computed. The pills say 'PageRank, April data'. That's not enough. On the Results panel for
betweenness there was a line 'Exact. Unweighted, undirected.' -- I want that line on each pill
here, because if one side is weighted and the other isn't, the whole comparison is apples and
oranges."

**2:00 -- trying the canvas.**
"Both sides ring ACC-139419 in the same place, same camera. OK, that's nice, I can see it's in the
dense bit. But honestly the left canvas is mostly teal-green-yellow and the right is gray and yellow.
The legend says teal is 'A: tied lowest' and the ramp in dark mode also starts at teal, so I can't
tell 'tied at the bottom' from 'low but ranked' on side A. On side B the grays are the zero
betweenness ones -- that one I can read.

What I'd actually want in the middle of the screen is a rank-versus-rank scatter. x = PageRank
rank, y = betweenness rank, log axes, click a point to select the account. That one picture shows
me the tie blocks, the head disagreement, and the outliers at once. Two force layouts side by side
don't show me agreement, they show me two hairballs that happen to be the same shape."

**2:40 -- getting the list out.**
"If this is the answer I want the table. account, rank A, rank B, value A, value B. Where's
export?" He looks at the header: Save comparison, Done, three dots.
"Save comparison -- that saves it in the tool, I don't care about that. Three dots. Probably there."
(The overflow menu in the page's later state shows Export..., which writes the difference list as
data.)
"OK, it's in there. I'd have found it in about ten seconds, but it's the one thing I want and it's
behind a menu while 'Save comparison' is the big blue button. And 'the difference list as data' --
is that the top 100 or all 3,093 with both ranks? I want all 3,093. And with my original ids."

**3:20 -- how did I get here?**
The moderator asks how he'd open this from the normal view. He looks at the Results panel render.
"There's the result row, Betweenness, a popover with Run and three dots. I don't see 'compare'
anywhere. I'd guess the three dots on the result, or right-click on the row in the left list. If
it's not there I'd type 'compare' in the 'Find a result or method' box. I wouldn't have found it
without guessing." (The page's own caption says it is "Compare with..." on the PageRank row.)

"And the picker 'lists only what can be compared with a score: its own earlier run and the other
scores.' Is an imported column a score? My model score for each item is a column I bring in. If I
can't put 'model score' on side B and 'Adamic-Adar' or 'degree' on side A, this doesn't do my job.
Also my real comparison is on pairs -- user-item candidate scores -- not on nodes. This screen is
nodes only."

**4:00 -- the top of the page.**
"And the banner at the top says 'Not buildable yet' and that the whole thing waits on the
underlying component. So this is a mockup of a feature that doesn't exist. Noted."

**4:10 -- the other direction.**
He switches to "Higher on A" (shown in a state further down the page).
"Merchants top on PageRank and zero betweenness, B rank shown as 'tied' with a range, gap '1,779+'.
OK, that's honest. I like that it doesn't pretend a tie of 1,314 accounts has a single rank. Most
tools would just print #3,093 or #2,437 and lie to me."

---

## Post-task

**Single Ease Question (1-7): 6.**
"Answering the question was easy -- two numbers on the right told me: broadly correlated, zero
overlap in the top 50. I'm knocking one off because I had to work to trust it: I don't know how
either score was computed, the ties are inside the correlation, and K is stuck at 50."

**Would you use this instead of your current tool?**
"For this exact question on node scores, on a graph this size -- honestly, maybe, for the first
look. Five minutes in a notebook gets me spearmanr, a top-K overlap loop and a scatter, and I trust
it because I wrote it. This got me the headline faster and the tie handling is more careful than my
first notebook would be. But I'd go back to the notebook as soon as I wanted K to vary, the
non-tied subset, a rank-rank scatter, or the full table. And the day it lets me put MY model score
column against a heuristic on the same nodes, and export the whole joined table with my ids, it
earns a place. Until then it's a nice screenshot for a slide."

---

## Problems observed

1. **No rank-versus-rank view; the canvas does not show agreement.** Two force layouts colored by
   rank carry no reading of agreement. He wanted a scatter of rank A against rank B. Severity 3.
2. **Ties are inside the headline statistic with no alternative.** 1,153 and 1,314 accounts are
   tied at the bottom on each side and still count toward Spearman 0.781; there is no Spearman on
   the non-tied accounts or on the top K. Severity 3.
3. **Top-K overlap is fixed at 50.** No way to see overlap at other K, which is the actual answer to
   "who matters". Severity 2.
4. **How each side was computed is not shown on the comparison surface.** No weighted / directed /
   normalized / exact line on the side pills, so he could not tell whether the comparison was
   like-for-like. Severity 3.
5. **The difference list is sorted by rank on B under a column headed "gap".** He expected to sort
   by the gap and saw no way to. Severity 2.
6. **Export is behind the overflow menu, and its scope is unclear.** The one action he wanted is
   hidden while "Save comparison" is the filled button; he could not tell whether export gives the
   top 100 or all 3,093 rows with both ranks. Severity 2.
7. **The way into the comparison is not visible from the Results panel.** He had to guess where
   "Compare with..." lives. Severity 2.
8. **Unclear whether an imported column can be a side.** His real use is model score against a
   heuristic; the picker is described as "other scores" only, and pairs (user-item) are not covered.
   Severity 3.
9. **Dark-mode legend: "A: tied lowest" swatch matches the low end of the ramp.** On side A he could
   not tell tied-lowest accounts from low-ranked ones. Severity 2.
10. **(i) icons next to the statistics give no definition in the prototype.** He wanted the exact
    formula and the population it runs over. Severity 1.

## What worked for him

- The two numbers side by side -- Spearman 0.781 and "0 of 50" in the top 50 -- answered the task in
  seconds and told the real story (agree in bulk, disagree at the head).
- Every value came with its rank and its denominator ("#76 of 3,093"); accounts compared was stated
  and nothing was silently dropped.
- Ties are counted and named, and a tied rank is shown as a range ("1,779+") instead of a fake
  single rank.
- Dark mode respected; one shared camera with the selected account ringed on both sides.
