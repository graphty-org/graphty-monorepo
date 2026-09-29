# Do these two ways of scoring agree on who matters? -- Analyst Alex

Participant: Analyst Alex, a data analyst who does network questions in NetworkX and draws them in Gephi.
Task as given: "Do these two ways of scoring agree on who matters?"
Data in the task: April transfers, 3,093 accounts, PageRank and betweenness already run.

Screens seen, in order: the Results place on the left rail with a run's "Compare with..." menu open
(`shots/screens__results-panel--compare-with.png`), the comparison
(`shots/tasks/rankings-agree/01-comparison.png`, and the whole page in
`tmp/alex-r6-rank/cmp-full.png`), then the table (`shots/tasks/rankings-agree/02-table-dock-large.png`).

## Think-aloud

**1. Finding where to start.**
"OK. Two scores, do they agree. In Python this is `spearmanr` and a top-20 overlap, ten lines. Let's see
if it's quicker here. I've run both already, so... Results, on the left. There's my runs list, newest
first. Good, that's where I'd look."

"Where's compare, though? There's a little icon on the right of the row, two arrows. I only see it
because it's already highlighted. If it only shows on hover I'd have gone to Quick actions and typed
'compare' instead. Would have found it one way or the other, but I wouldn't bet on the icon."

**2. The Compare with... menu.**
"Earlier runs of PageRank first, highlighted. Then 'Other runs on this graph', and betweenness is in
there. Fine. But the one that's pre-selected is PageRank against PageRank -- if I'm fast and hit Enter,
I compare PageRank to itself. For my question I want the second group. Small thing. I'd notice when the
screen said 'damping 0.5 and 0.85'."

"This one says 'Betweenness (sampled), 101 sources'. Hm. That's on some patent graph, not my payments
data, but if I compare an exact PageRank to a sampled betweenness, does the comparison tell me? I'd want
that on the result, not just in the run name."

**3. The comparison: the headline.**
"'0 of the top 50 in both. The rankings disagree at the top.' OK -- that's the sentence. That's what my
director wants. Not a correlation, just: none of the top 50 overlap. I can say that out loud."

"Top 5, 10, 20, 50, 100 buttons, and underneath: 0 of 5, 0 of 10, 0 of 20, 18 of 100. So they start to
overlap somewhere past 50. Good, I don't have to click through each one."

"Spearman 0.40, leaving out the 1,153 tied at the bottom -- 0.78 with them. Two numbers. Which one do I
put in the deck? If I ran `scipy.stats.spearmanr` on the whole thing I'd get the one with everybody in,
I think, so 0.78 is what I'd match against. But 0.78 sounds like 'they agree', and the page is telling
me they don't. I clicked the little i: ties take the average of their ranks, the bottom ones agree
because both give them the least. OK, that actually explains why 0.78 is flattering. I'd quote 0.40 and
the top-50 overlap, and I'd check the 0.78 against scipy once before I trust any of it."

**4. The scatter.**
"Rank against rank, log axes, rank 1 top-left. Dashed diagonal is 'same rank on both'. The shaded box is
the top 50. And the top-left corner of the box is empty -- the betweenness top ones are all out to the
right, past PageRank 50. Yes, that's the picture of 'they disagree'. I could screenshot that."

"The right edge: '1,153 accounts tied at the lowest PageRank'. Bottom: '1,314 accounts tied at 0'. Then
the key says 'Not plotted: the 1,153 tied at the bottom of both'. Is that the same 1,153? The band says
lowest PageRank, the note says bottom of both. If it's the same people, fine, but I had to read it
three times and I'm still not sure. That's the sort of thing a director asks about and I don't have an
answer."

**5. Who differs.**
"Right side, 'Ranked higher by betweenness'. ACC-139419: #76 on PageRank, #1 on betweenness. Then #2 is
#316 on PageRank. So the top betweenness accounts are nowhere near the top on PageRank. Those are your
go-between accounts, then -- the money passes through them but doesn't pile up there. That's actually
the interesting part of the answer, and it's right there with the ranks side by side. 'Create set' --
I'd make a set of these and hand the list over."

"The picture is coloured by PageRank, log scale, purple to yellow. I can read that one. Nothing
red-green, thank you. But the graph only shows one of the two scores, so the picture itself doesn't
answer the question -- the scatter does."

**6. The table.**
"Now I want both columns in Excel. Table... this is 'March transfers', 3,000 nodes. Wait, the
comparison said 3,093 accounts in April. Different month? OK, maybe. But the line at the top of the
table says 'The top 10 are the same on both measures, led by ACC-393859.' The comparison just told me
zero of the top 10. Which two measures is it talking about? Degree and PageRank, from the columns I can
see? I don't know. If I'd seen this screen first I'd have written 'they agree' in my deck. That's the
one that scares me."

"The column menu has Compare with... too, so I could have started here. Rank columns next to the
values, '#348=' with the equals for ties -- good, I get that. 'Export table...' is up in the corner.
Whether it gives me both ranks in the file I can't tell from here; I'd find out by opening it in Excel."

## After the task

**Single Ease Question (1-7): 5.**
What took longest: working out what the two Spearman numbers mean and which 1,153 accounts are left off
the plot, then the table saying the top 10 agree when the comparison had just said none do.

**Would I use this instead of what I do now?**
"For this question, for the readout -- yes, probably. The headline sentence, the top-N overlap row and
the list of who's ranked higher by which measure is what I'd spend an hour building in matplotlib and
Excel. I'd still check the Spearman against scipy the first time, and if it matched I'd stop doing
that. What would stop me is the table: a screen that says 'the same' while the other says 'disagree' is
exactly how a wrong sentence ends up in a report."

## Problems seen

1. The table's summary line ("The top 10 are the same on both measures") contradicts the comparison
   ("0 of the top 50 in both") without saying which two measures or which month it means. (Severity: high)
2. Two Spearman figures (0.40 and 0.78) with no hint which one to report; the tie explanation is behind
   a small info icon. (Severity: medium)
3. "1,153 tied at the lowest PageRank" on the plot edge versus "1,153 tied at the bottom of both" in the
   key: unclear whether they are the same accounts. (Severity: medium)
4. The run row's Compare button shows only on hover; a first-time user may not find it. (Severity: low)
5. Compare with... pre-selects an earlier run of the same measure; comparing against the other measure
   needs a second choice. (Severity: low)
6. Unclear whether the comparison warns when one side is a sampled run. (Severity: low)
