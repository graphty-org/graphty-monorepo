# Session: do two rankings agree? -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (simulated), associate professor, a decade of Gephi, checks
everything against NetworkX.
**Task as given by the moderator:** "Do these two ways of scoring agree on who matters?"
**Screens used:** the comparison screen (first), then the results panel.
**Window:** 1440 x 900 laptop.
**Outcome:** answered the question, but did not trust the headline number, and could not see how
she would have got to this screen on her own.

---

## Think-aloud

**1. First look at the comparison screen.**

> "OK, two canvases side by side. A is PageRank, B is betweenness, both on 'April data'. This is
> not my data -- payment accounts, three thousand of them -- fine, I'll play along. First thing:
> where did this screen come from? I'm dropped into it. In Gephi I would run both statistics,
> go to the Data Lab, sort by one column, eyeball the other, and then export the table to R and
> run `cor(..., method = "spearman")`. So I'm looking for the number."

**2. Finds the number.**

> "Right column, 'Agreement'. Spearman rank correlation 0.781. Good -- it's named, it's the
> correct statistic for this, not Pearson on raw scores. 'Accounts compared 3,093' -- that's all of
> them, nothing silently dropped. Then 'top 50 in both: 0 of 50'. Zero. Hm."

> "So my answer is: broadly yes, 0.78, but not at the top. That's a real finding, actually --
> the brokers are not the collectors."

**3. Gets suspicious of the 0.781.**

> "Wait. 'Tied at 0 on B: 1,314.' Forty-two percent of the accounts have zero betweenness, and
> 1,153 tie for lowest PageRank on A. Those are mostly the same leaf accounts, I'd bet. They all
> sit at the bottom of both rankings, share an average rank, and they will pull Spearman up on
> their own. A 0.78 that's mostly driven by a big block of tied periphery nodes is not the same
> claim as 'the two measures agree on who matters'. The top-50 row is telling the truer story."

> "The little note says 'Tied accounts share their average rank.' OK, so it's the usual mid-rank
> Spearman. What I want next to it is the same number over only the accounts with nonzero
> betweenness, or Kendall's tau-b, or at least a scatterplot of rank against rank so I can see the
> block of ties in the corner. There's no plot. I hover the (i) -- I'd expect the formula and it
> probably says what the mock prose says, 1 means same order, 0 no relation. I know what
> Spearman is. Tell me what it was computed ON."

**4. Looks at the canvases.**

> "Both sides are colored by rank on one ramp. Honestly this is the hairball twice. I can't read
> agreement off two clouds of green and purple dots; nobody can. The gray on the right is the
> zero-betweenness block, at least that's legible -- lots of gray. The yellow ring on ACC-139419
> is on both sides at the same spot, that's nice, the camera is linked. But I'd give up the whole
> second canvas for one rank-rank scatter."

**5. The difference list.**

> "Differences, 'Higher on B'. ACC-139419: #76 on A, #1 on B, gap 75. So the top broker is 76th
> by PageRank. Scroll: #2 on B is #316 on A, #3 is #276. Fine, this is the Data Lab sort I would
> have done by hand. Sorting is by rank on B -- can I sort by gap? I click the 'gap' header --
> it's just a label, nothing happens. And the gap has no sign; I have to remember which tab I'm
> on. In a spreadsheet I'd have a signed difference."

> "I click the first row. It opens: PageRank 4.24e-4, #76 of 3,093; betweenness 1.15e-4, #1 of
> 3,093. Good, raw values with the ranks, three significant figures. Betweenness 1.15e-4 is
> clearly normalized -- normalized how? Over (n-1)(n-2)? Directed or not? And PageRank, what
> damping? Directed edges or not? Money flows have direction. This panel does not say. If this
> doesn't match NetworkX, I can't tell whether it's the tool or the settings."

**6. Goes to the results panel to find the settings.**

> "In the left list, 'A PageRank', 'B Betweenness'. I'd click PageRank to see how it was run."
> (Looks at the results-panel render.) "Here -- 'on: full graph, 300 nodes, 3 components. Exact.
> Unweighted, undirected.' That's exactly the line I want. It says what it ran on, full graph
> versus a subset. Gephi never tells me that; I have been burned by filter-then-modularity. This
> line should be on the comparison, under each side's letter, not one click away in another
> panel."

> "And from here -- how would I have started a comparison in the first place? I'm looking for
> 'Compare', a right-click on the result, anything. The row has a '...' menu; I'd guess it's in
> there. I don't see it on the screen. If I were alone I'd export both columns and do it in R,
> which is what I do now."

**7. Wrapping up.**

> "Where's export? Top right: 'Save comparison', 'Done', and three dots. I'd look in the dots for
> export. I need the difference list as CSV -- the whole thing, not the top 100 -- for the paper.
> 'Top 100 on either side' worries me; is the export also capped?"

> "Answer to the question: moderately, 0.78, but they disagree completely at the top -- no
> account in both top 50s, and the top brokers are 70th to 90th by PageRank. I'd want the
> Spearman without the zero block before I wrote that down."

## Single Ease Question

**4 of 7.** Reading the answer was quick once I was on the screen. Trusting it and getting to the
screen were not.

## Would she use this instead of her current tool?

> "Not instead of anything. This replaces ten minutes of export-to-R, and it's the first tool
> that puts Spearman and a top-N overlap next to each other and counts the ties, which is more
> honest than most papers. But I'd still export both columns and check the number in R, because
> it doesn't show the directedness and damping next to the result, and it doesn't give me a
> scatter. Give me the plot, the settings under each letter and a full CSV and I'd use it for
> this job. Gephi can't do this job at all, so for comparisons specifically I'd try it again."

---

## Problems observed

1. **Ties inflate the headline statistic, unflagged.** 1,314 accounts tied at 0 betweenness and
   1,153 tied lowest on PageRank are counted, but the Spearman over all 3,093 is presented as the
   answer. An expert reads it as driven by the tied periphery. Wants the statistic without the
   tied block, or tau-b, or at least a warning that ties dominate. Severity 3.
2. **No rank-against-rank scatter.** Two colored node clouds do not show agreement; the one chart
   an analyst would draw is missing. Severity 3.
3. **Settings not shown on the comparison.** Directed or undirected, weighted, damping,
   normalization -- visible in the results panel ("Exact. Unweighted, undirected.") but not under
   each side of the comparison. Without them she cannot reconcile with NetworkX. Severity 3.
4. **No visible way into the comparison from the results panel.** Guessed the "..." menu; nothing
   on screen says Compare. Severity 2.
5. **Difference list cannot be sorted by gap; gap is unsigned.** She clicked the column header;
   direction lives only in the segmented control. Severity 2.
6. **Export is hidden in the overflow menu and "Top 100" makes her fear a capped export.**
   Severity 2.
