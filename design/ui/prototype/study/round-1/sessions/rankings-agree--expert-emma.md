# Do two scores agree on who matters? -- Expert Emma

Participant: Expert Emma, network scientist and consultant (persona in study/personas/expert-emma.md).
Task as given by the moderator: "Do these two ways of scoring agree on who matters?"
Screens used: the comparison surface (first state, PageRank against betweenness on the April
transfers), then the finished state of the results panel for how a run describes its settings.

Outcome: answered the question, but did not trust the headline number enough to put it in a
report. Single Ease Question: 5 of 7.

## Transcript

**Landing on the comparison.** "OK. There is a paragraph of text at the top about what this
surface is and that it is 'not buildable yet'. I am not reading that; that is for your
developers. Below it: two graphs side by side, PageRank on the left, betweenness on the right,
same April data. Right column says Agreement. That is where I am going first -- I do not read
answers off hairballs."

**The headline numbers.** "Spearman rank correlation 0.781. Top 50 in both: 0 of 50. Good --
those are the two numbers I would compute myself, and the second one is the one that matters
for 'who matters'. So the answer is: broadly correlated across everybody, no overlap at all at
the top. That is a real finding. It took me about ten seconds, which is faster than writing
`scipy.stats.spearmanr` and remembering to align the index."

**The ties.** "Now wait. 'Tied lowest on A: 1,153. Tied at 0 on B: 1,314.' Out of 3,093. So
roughly forty percent of the accounts are sitting in one tie block on each side. The footnote
says ties share their average rank -- fine, that is the standard fix -- but it also means a big
chunk of that 0.781 is just the leaf accounts agreeing that they are leaves. Both measures put
the dead-end accounts at the bottom; of course that correlates. I want Spearman over the
accounts that are not in either tie block, or Kendall's tau-b, or at least a switch to drop the
zeros. As it stands I would not quote 0.781 to a client without a footnote, and I cannot get
the other number from here."

I hovered the (i) next to Spearman. "It tells me 1 means the same order and 0 no relation. I
know what Spearman is. What I need from the (i) is: over which accounts, and how ties are
handled. The second half is there in the footnote; the first half is not, except 'accounts
compared 3,093', which is what worries me."

**Which PageRank, which betweenness.** "Next question: which PageRank? Damping? Directed? This
is a payments network -- did it use the direction of the transfers, and did it weight by
amount? Same for betweenness: directed or not, weighted or not, normalized how? The pills just
say 'PageRank, April data' and 'Betweenness, April data'. Nothing in the right column. If I
click the PageRank row on the left, I would go back to the results panel, I suppose."

Looked at the results panel (finished state). "Here, on a different dataset, the betweenness
card says 'Exact. Unweighted, undirected. WebGPU. Details.' Good, that is the sentence I want.
But I had to leave the comparison to find it, and if the payments run says 'unweighted,
undirected' then this whole comparison is on the wrong model of a money network, and the
comparison surface would not have told me. Put that line under each side's name, A and B, right
where the letters are."

**The values themselves.** "The selected account, ACC-139419: betweenness 1.15e-4, number 1 of
3,093. That is the top betweenness value? Normalized, in a 3,000-node network, the top broker
at 0.000115? That is suspiciously small. Either the giant component is tiny, or it is
normalized by something I do not expect, or it is wrong. I would check it against networkx
before I believed it. I am not saying it is wrong -- I cannot show a number yet -- but the
screen gives me no way to know which normalization it used."

"PageRank 4.24e-4 at rank 76. Uniform would be 1/3093, about 3.2e-4, so rank 76 barely above
uniform. Plausible with that many ties at the bottom. Fine."

**The difference list.** "Differences: Higher on B / Higher on A, top 100 on either side,
account, A rank, B rank, gap. This is actually useful. Top ten on betweenness sit at PageRank 71
to 94, with a couple of wild ones at 316 and 496. That is the story for the fraud people:
pass-through accounts that do not collect money. I clicked the first row and it opened in place
with both values and 'Create set'. Create set is the thing I would use -- make a set, hand it to
the investigator."

"Can I change 50 to 10 or 100? 'Top 50 in both' is fixed. For a client with 3,000 accounts I
would want 10 and 100 as well. I did not see a control for it."

**What is missing.** "Where is the scatter plot? Rank on A against rank on B, log axes, one dot
per account. That is the picture that answers 'do they agree' -- you see the tie blocks as
lines on the axes, you see the off-diagonal brokers, and you see whether 0.781 comes from the
bulk or the tail. Instead I get two force layouts coloured by rank. I will say the shared
camera and the ring on the same account on both sides is well done. But I learned nothing from
the two pictures that the list did not tell me better."

**The legend.** "Legend says 'Rank, both sides', a viridis ramp from 3,093 to 1. Then 'A: tied
lowest 1,153' with a dark dot and 'B: betweenness 0 1,314' with a grey dot. Why is a tie on A
coloured on the ramp and a tie on B grey and off the ramp? They are the same kind of thing --
the bottom tie block. I get that zero betweenness 'means something', but so does minimum
PageRank: no in-links. It made me stop and work out whether the two sides were coloured the
same way, which is the one thing the shared legend is supposed to save me."

**Getting the numbers out.** "Export -- the header has Save comparison and Done. Export is in
the three-dot menu, I found it second try. I want one CSV: account, PageRank, rank A,
betweenness, rank B, gap. If that is what it gives me, fine. I did not see what the export
contains."

**Done.** "Answer to your question: they agree on the rank order of the bulk, mostly because
they agree on who is at the bottom, and they do not agree at all on who is at the top. The
screen gave me the second part cleanly. The first part I had to work out from the tie counts,
and I would have to go to the notebook to confirm it."

## After the task

**Single Ease Question: 5.** "Finding the answer was easy. Trusting it was not, and that is the
part that matters."

**Would she use this instead of her current tool?** "Not for the analysis -- I would still
compute Spearman in pandas, because I need the version without the ties and I need to see the
parameters. But the difference list with Create set, handed to a fraud investigator who does
not code, is better than anything I have. If this said 'directed, weighted by amount, damping
0.85' next to each side, gave me the rank-rank scatter and a Spearman without the zero block,
I would use it for the client deck instead of Gephi, yes."
