# Session: do two scorings agree on who matters -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (simulated), associate professor, a decade of Gephi, checks
everything against NetworkX.
**Task as given:** "Do these two ways of scoring agree on who matters?"
**Screens:** the comparison surface (PageRank against betweenness on the April transfers, then
March PageRank against April PageRank), then the Results panel.
**Viewport:** 1440 x 900.

## Transcript (thinking aloud)

**On the comparison screen, first look.**

"Okay. Payments network, 3,093 accounts. Two scores, A is PageRank, B is betweenness -- the
letters are in the left list and again on the right, good, I don't have to guess which is which.
The canvas is colored by PageRank. Fine, I don't need the hairball for this question, I need the
numbers."

She goes straight to the right column.

"Agreement. Kendall tau-b 0.656, in bold. Spearman 0.781, labeled 'ties inflate this'. Top 5 in
both: 0 of 5. So that's the answer, really -- a moderate overall correlation and zero overlap at
the top. That's the classic pattern: the leaves agree they're leaves, and the hubs disagree.
37 percent tied lowest on PageRank, 42 percent tied at zero on betweenness. Yes, of course --
anything with no in-links gets the same teleport PageRank, and anything that's never on a
shortest path has betweenness zero. Half the correlation is those two blocks agreeing with each
other."

"It actually says tau-b and not just 'correlation'. Thank you. scipy's kendalltau is tau-b by
default, so I can check that."

**The 'ties inflate this' label.**

"Now, 'Spearman, ties inflate this' -- no. That's not what ties do. Spearman on midranks is
perfectly well defined; it comes out higher than tau-b because they're on different scales, it
always does, rho is roughly one and a half times tau for this kind of data. Calling it inflated
tells my students one of them is wrong. I'd rather see both numbers plain and a line that says
what they each measure. Or better: give me the correlation with the tied block taken out, because
that's the number I'd actually report -- 'among accounts that carry any flow, do they agree?'"

She hovers the little info icon next to tau-b, reads the one line under the numbers ("Ties are
over 10% of a side, so tau-b leads...").

"Ten percent is a rule somebody picked. Fine, at least it's written down."

**Top 5.**

"Top 5 in both, 0 of 5. Why five? My reviewers ask about top 10 or top 20 -- top 1 percent,
sometimes. Where do I change that?" She looks around the Agreement section and the scatter key.
"The key says 'the length of its Top nodes list'. So it's five because some other list is five.
I can't set it here. That's a hidden default; I'd want k right next to the number."

**The scatter in the bottom dock.**

"Scatter tab, next to Table. Rank on A across the top, rank on B down the side, log scales, rank 1
top left, diagonal dashed. Hmm, log rank -- okay, that's sensible with 3,000 accounts, otherwise
the top would be one pixel. The grey strip along the bottom, '1,314 accounts tied at 0', and the
one down the right side for the lowest PageRank. And the note: '1,153 accounts are in both tie
blocks, in the bottom-right corner, not plotted.' Not plotted but counted. I can live with that,
because it says so. If it had just dropped them I'd be out."

"Everything the brokers do is above the diagonal and to the right: top of betweenness, somewhere
between 70 and a few hundred on PageRank. The ring at the top is ACC-139419 -- #76 on PageRank, #1
on betweenness. That's a bridge account. That matches the picture I'd expect in a flow network."

She clicks a row in the Differences list.

"Higher on B, higher on A -- that's the direction toggle. Top 100 on either side by rank on B.
The selected row opens with both values: PageRank 4.24e-4, betweenness 1.15e-4, #1 of 3,093. And
the canvas and the scatter both ring the same account. Linked selection -- that's the thing I do
in Gephi by clicking in the Data Lab and hunting on the canvas."

"But betweenness 1.15e-4 for the number-one broker? Normalized by what? (n-1)(n-2)? Directed?
It says 'Exact. Unweighted, directed.' Unweighted -- on payments? Money has amounts. I'd want
the amount as the weight, or at least a sentence saying why not."

She clicks **Details** under B.

"Nothing. It's dead." (The mock marks it 'Not working in this mock'.) "That's where I'd go for
the normalization and the damping. In a real session that link is the most important thing on
this screen for me. If it tells me normalized=True, directed, endpoints=False, I can reproduce it
in NetworkX in two minutes. If it doesn't, the number isn't citable."

**Export.**

"Export table as CSV... -- the text says every account with both values and both ranks. Good.
That's how I'd actually answer the question: dump it, run kendalltau and spearmanr in Python, and
see if I get 0.656 and 0.781. If I do, I trust the rest of the screen."

**Second scenario on the same page: March PageRank against April PageRank.**

"Same score, two months. 2,961 in both, 39 only in March, 132 only in April -- counted and named,
closed and opened. That's better than Gephi, which would just give me two workspaces and let me
figure it out. Tau-b 0.781, top 5 in both 5 of 5. So the top is stable across months; the churn
is in the middle. 'PageRank gives the same result every run, so a re-run cannot tell change from
noise. Compare with randomized baseline...' -- hm, I'd need to know what they randomize. Degree-
preserving rewiring? Configuration model? I'm not clicking that until it says."

"ACC-488401 went from #1,575= to #88. The equals sign means tied rank, I get it -- that's the
competition-ranking convention. I'd have written 1575.5 for the midrank, but okay."

**Results panel.**

She moves to the Results panel mock to see where the run parameters live and how she'd start a
comparison herself.

"This is a different graph -- protein interactions, 300 nodes. Betweenness card: 'on: full graph,
300 nodes, 3 components. Exact. Unweighted, undirected. WebGPU. Details.' Good, it says what it
ran on. That line is the one I've wanted in Gephi for ten years -- in Gephi the statistic runs
on whatever the filter left visible and never tells you."

"Scope: Full graph. Weight: None declared. Distribution histogram, top nodes. This is my
Statistics panel plus the report window, in one card. Fine."

"How did I get to the comparison from here? Appearance: Betweenness color, Color by..., Label
with... I don't see a 'compare'." She scrolls the card mentally, then checks the other states.
"In the running state there's a 'Compare with...' under Label with. In the finished one I'm
looking at, I don't see it. If that's where it lives, I'd have missed it. I'd have gone to the
table and looked for a column menu -- I'd sort the column, not look under 'Appearance'. Compare
isn't appearance."

## Answer to the task

"Do they agree? At the bottom, yes, trivially -- the zeros agree with the zeros. At the top, no:
none of the top five on one is in the top five on the other, and the biggest brokers sit around
70 to 300 on PageRank. Tau-b 0.656 is mostly the tie blocks. That's what I'd write, after I'd
checked the numbers in Python."

## Single Ease Question

**5 of 7.** "The answer was on the screen within a minute. I lost points on the things I'd need to
publish it: a dead Details link, a top-k I can't set, and a label that tells my students Spearman
is wrong."

## Would she use this instead of her current tool?

"For this question, maybe -- Gephi doesn't do this at all, I do it in a notebook. The scatter with
the tie blocks counted, the linked selection and the two-months matching are genuinely better than
what I'd hack together. But I'd export the CSV and rerun it in NetworkX before I believed a digit,
and if Details doesn't give me normalization, direction and weights, I can't cite it. It doesn't
move my paper figures off Gephi; it might replace the notebook cell."

## Problems observed

1. The "Details" link under each side's method line did nothing; it is where she needed the
   normalization, weight and direction to reproduce the number. (severity 3)
2. "Spearman (ties inflate this)" reads as a statistical claim she believes is wrong: rho is
   higher than tau-b because the two are on different scales, not because ties inflate it. She
   wants both numbers plain, plus a correlation over the untied accounts. (severity 3)
3. Top-k overlap is fixed at 5 by another list's length, with no control where the number is.
   (severity 2)
4. Betweenness is unweighted and directed on a payments network, and the screen does not say
   whether the value is normalized; "1.15e-4 for the #1 broker" looked wrong to her. (severity 2)
5. "Compare with..." was not visible in the finished Results panel card and sits under
   "Appearance", where she would not look for an analysis action; she expected it on the table
   column. (severity 2)
6. "Compare with randomized baseline..." does not say what is randomized, so she would not use
   it. (severity 1)
