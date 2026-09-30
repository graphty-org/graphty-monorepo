# Session: do two scorings agree on who matters? -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional composite persona: associate professor, Gephi
user since 0.8, checks every number against NetworkX).
**Task as given by the moderator:** "Do these two ways of scoring agree on who matters?"
**Screens seen:** the comparison mock (`screens/comparison.html`), first view "Two measures:
PageRank against betweenness on the April transfers", then the second view (March against April)
and the small state panels under it; then the Results panel mock
(`screens/results-panel.html`), the finished and sampled states.
**Renders read:** `shots/record/r3-mara-rankings-comparison-full.png`,
`shots/record/r3-mara-rankings-results-full.png`, `shots/record/r3-mara-rankings-results-sampled.png`,
`shots/screens__results-panel--finished.png` (study view: design notes hidden).

**Outcome:** finished, with difficulty. She answered correctly -- no, they do not agree on who
matters at the top -- but did not trust the supporting number and could not check how either
score was computed from the comparison screen itself.
**Single Ease Question:** 5 of 7.

---

## Transcript (think-aloud, lightly cleaned)

**[Opens the comparison screen.]**

"Okay. 'Payments network review', full graph. Left side, the project list -- Degree, Louvain,
PageRank with an A, Betweenness with a B. So A and B are the two scorings. Fine, that's clear
enough, I don't need the letters explained."

"The map is colored by PageRank, log scale, viridis. 3,093 accounts. That's small, I'd expect
it to be quick. The picture is a hairball, as it always is before you spatialize properly, but I
am not here for the picture."

"Right column. 'Agreement.' Bold sentence: *The rankings disagree at the top: none of the top 10
are the same.* Hm. Good. That's the answer to the question, stated first. I didn't expect a tool
to just say it. Most would give me a correlation and let me misread it."

"Under it: Spearman 0.781 over all 3,093 accounts. Now wait. Zero of the top 10 in common and
Spearman is 0.78? Those two things together means the agreement is coming from somewhere else --
the tail. Let me see."

**[Reads the rows under Agreement.]**

"Tied lowest on A: 1,153, thirty-seven percent. Tied at 0 on B: 1,314, forty-two percent. In both
tie blocks: 1,153. So a third of the graph is tied at the bottom on *both* measures. Of course the
rank correlation is high -- a third of your observations agree perfectly because they're all
nobodies on both. That 0.781 is mostly the leaves agreeing that they are leaves."

**[Hovers the little info icon next to Spearman. Nothing appears in the prototype.]**

"What does this icon say? Nothing. I want to know how the ties are handled -- average rank?
Is that 0.781 with the tie block in or out? I'd report Kendall's tau-b here, or Spearman on the
accounts that are not tied at zero on both. If I put 0.781 in a paper, reviewer two will say
exactly what I just said."

**[Clicks Top 5, 10, 20, 50, 100 in turn -- reads the line under it instead.]**

"'In both at the other choices of Top: 0 of 5, 0 of 20, 0 of 50, 18 of 100.' Oh, it already tells
me all of them. Nice, I don't have to click. Nothing shared until the top hundred, and then only
eighteen. So no. They don't agree on who matters. That's my answer."

"I would like a free number there -- top 1 percent, top 250. But five choices is fine for a first
look."

**[Looks at the scatter in the bottom dock.]**

"Oh, it's the Data Laboratory at the bottom -- Nodes, Edges, Table, and a Scatter view. Rank on
PageRank across the top, rank on betweenness down the side, log axes, rank 1 at the top left.
Diagonal is 'same rank on both'. Shaded corner is top 10 of both, and it says 0 accounts in it."

"The dots are all to the right of about rank 70 on PageRank. Nothing sits in the top-left
corner. That's the picture of 'they disagree at the top', and it matches the sentence. Good --
the picture and the number say the same thing."

"There's a grey band along the bottom -- '1,314 accounts tied at 0' -- and one down the right --
turn my head -- '1,153 accounts tied at the lowest PageRank.' Sideways text. I'm going to zoom
this in, my eyes are not what they were. And '1,153 accounts are in both tie blocks, in the
bottom-right corner, not plotted.' Okay, so the corner I was complaining about is left out of the
picture but left *in* the Spearman. That's inconsistent, or at least it's a choice nobody told me
about."

"ACC-139419 is circled: number 76 on PageRank, number 1 on betweenness. Classic broker -- money
goes through it, doesn't pile up in it."

**[Looks at Differences, Higher on B.]**

"Higher on B, top 100 on either side, sorted by rank on B. ACC-139419 again, #76 against #1, gap
75, and when it's selected it gives me the raw values -- PageRank 4.24e-4, betweenness 1.15e-4.
Hm. 1.15e-4 for the *top* broker in a 3,000-node graph? That's normalized by something, and
tiny for the maximum. Normalized how? Directed pairs, (n-1)(n-2)? It doesn't say here. In
NetworkX I'd get a very different looking number if normalized is False."

**[Clicks Details under B: "Exact. Unweighted, directed. Details".]**

"Details. ... Nothing opens. [Moderator: this link isn't wired in the prototype.] Then I'd go
back to the Results panel, I suppose. It should open here, right beside the number I'm
questioning."

**[Clicks "Higher on A" -- seen in the state panels further down.]**

"Higher on A. ACC-393859, #1 on PageRank, '#1,780=' on betweenness, gap 1,779. And the next seven
are all #1,780= on B. So the top PageRank accounts have zero betweenness. Every one. That's actually
the finding -- the accounts that collect the money are dead ends; nothing passes through them.
Sinks. That's interesting and I'd say it in a talk."

"But '#1,780=' -- I take it the equals sign means tied. 1,780 is where the zero block starts
(3,093 minus 1,314, plus one). So here the tie gets the *top* rank of its block and the gap is
computed from that, but Spearman presumably uses the average rank. Two conventions on one screen.
Pick one, or write it down."

"'Unweighted, directed.' On a *payments* network. Why unweighted? The amounts are the whole point.
It's honest that it says so, I'll give it that -- Gephi wouldn't have told me anything -- but I'd
want weighted PageRank here before I believed which accounts 'collect money'."

**[Glances at "Export table as CSV..." top right of the dock.]**

"Export table as CSV. If that gives me account, PageRank, PageRank rank, betweenness, betweenness
rank in one file, I'll compute tau myself in R and be done. That's the button I'd actually use."

**[Scrolls to the second view, PageRank March against April.]**

"Same layout, two months. 'The rankings agree at the top: all 10 of the top 10.' Spearman 0.876
over 2,961 accounts in both months, 39 only in March, 132 only in April -- and it tells me it
matched them by id and left the unmatched out. That's the thing Gephi would silently get wrong.
'PageRank gives the same result every run, so a re-run cannot tell change from noise' and a link
to a randomized baseline. Good. Somebody here has read a methods section."

**[Opens the Results panel mock to find how the two were computed.]**

"Results panel. Different dataset in this one -- patent citations, proteins -- but the idea is the
same. The state line: 'on: full graph, 124,318 nodes. Exact. Directed. Values shown: run 1,
damping 0.85.' There it is -- damping on the line. That is what I wanted under A on the comparison
screen."

"And Details here opens a run record: Method, Brandes from 101 random sources, seed 7,
normalization divided by (n-1)(n-2)/2, error bound, engine. *That* is what I cite. That's better
than Gephi's report window, frankly. It just needs to open from the comparison screen, not only
from here."

"Normalization '(n-1)(n-2)/2, the node pairs of an undirected graph' -- and the citations read as
undirected. Fine, at least it says it. If the payments betweenness is divided by the undirected
pair count on a directed graph, that explains why my 1.15e-4 looked small, and it's exactly the
kind of thing I'd need to know before comparing it to NetworkX."

---

## Her answer to the task

"No. They don't agree on who matters. None of the top 10 are shared, none of the top 50, 18 of the
top 100. The high Spearman is the bottom third of the graph tied at zero on both -- it tells you the
nobodies agree, not the somebodies. The accounts PageRank ranks highest have no betweenness at all:
money ends there, it doesn't flow through. The brokers sit around 70 to 300 on PageRank."

## Single Ease Question

**5 of 7.** "The answer was on the screen in one sentence, and the scatter agreed with it. It lost
points because I couldn't check the number I'd cite: the Spearman icon says nothing, the Details
link doesn't open, and the tie handling changes between the gap column and the correlation."

## Would she use this instead of her current tool?

"Instead of Gephi, no -- this isn't the part of Gephi I use it for, and my figures and my course
live there. But for *this* question, yes, I'd rather do it here than in Gephi, where there's no
way to put two statistics side by side at all and I'd be exporting to R anyway. The plain sentence,
the overlap at every top-k and the unmatched-by-id counts are better than what I'd write in a
hurry. If the Spearman came with its tie handling spelled out, or a tau-b beside it, and the run
record opened right there, I'd trust it enough to paste into a draft -- after I checked it in R the
first time."

---

## Problems observed

1. **Spearman is inflated by the shared bottom tie block and the screen does not say so.** 1,153
   accounts (37%) are tied at the bottom on both measures; they are left out of the scatter but
   (apparently) kept in Spearman 0.781. The info icon beside Spearman gives nothing. She read 0.781
   as "the leaves agree" and would not cite it. Wants: tie handling stated, and Kendall tau-b or
   Spearman excluding the joint tie block beside it. Severity 3.
2. **Details under A and B on the comparison does not open a run record.** She had to leave for
   the Results panel to learn damping and normalization. The Results panel's run record is what she
   wanted. Severity 2.
3. **Betweenness values give no normalization on this screen.** 1.15e-4 for the top broker looked
   wrong to her until she found the normalization in another screen. Severity 2.
4. **Two tie conventions on one screen.** The Higher on A list shows the tie block at its top rank
   ("#1,780="), and the gap is computed from that, while Spearman is said to use average ranks.
   Severity 2.
5. **Sideways text on the scatter's right-hand band** ("1,153 accounts tied at the lowest
   PageRank") is small and rotated; she had to zoom. Severity 1.
6. **Top offers only 5, 10, 20, 50, 100.** She wanted a free value or a percentage. Severity 1.
7. **"Unweighted" on a payments network** is stated honestly, but she questioned whether an
   unweighted PageRank answers "who collects money". Not a screen defect; a content one. Severity 1.

## What worked for her

- The answer first, as a sentence, before any statistic.
- The overlap at every top-k on one line, so she did not have to click through.
- The scatter agreeing visibly with the sentence (an empty top-left corner).
- Unmatched accounts counted and named when comparing two months; "matched by id".
- "PageRank gives the same result every run" plus a randomized baseline link.
- The Results panel's state line with damping, and its run record (method, seed, normalization,
  error bound) -- "better than Gephi's report window".
