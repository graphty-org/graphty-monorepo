# Session: do two scorings agree on who matters? -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional composite persona: associate professor, Gephi
user since 0.8, checks every number against NetworkX).
**Task as given by the moderator:** "Do these two ways of scoring agree on who matters?"
**Screens seen, in order:** the Results panel's Compare with... menu on a run row
(`screens/results-panel.html#compare-with`), the opened finished run
(`screens/results-panel.html#finished`), the comparison page (`screens/comparison.html`: the
PageRank-against-betweenness view, the March-against-April view, and the small panels under them,
including the Compare with... picker, the computing state, About Spearman and the run record),
and the table with its column menu (`screens/table-dock.html#large`).
**Renders read (study view, design notes hidden):** `shots/record/r6-mara-agree-rp-compare-with.png`,
`shots/record/r6-mara-agree-rp-finished.png`, `shots/record/r6-mara-agree-comparison.png`,
`shots/record/r6-mara-agree-table-large.png`.
**Earlier result on this task:** 5.5 of 7 on average in the third round; she gave it 5.

**Outcome:** finished, with minor difficulty. Correct answer -- no, they do not agree on who
matters at the top -- and this time she could check both the correlation and each score's
method without leaving the screen.
**Single Ease Question:** 6 of 7.

---

## Transcript (think-aloud, lightly cleaned)

**[Opens Results on the rail. The run rows are listed; one row shows a small icon on hover.]**

"Results. 'Every run of a measure, with its settings and date.' Four runs, newest first. PageRank
at damping 0.5, PageRank at 0.85, betweenness sampled from 101 sources, weakly connected
components. So this is my Statistics panel, except it remembers the runs. Gephi forgets the
moment you rerun; the column just gets overwritten. I like this already, and I'm annoyed that I
like it."

"This is patent citations, not the payments data the moderator talked about. Fine, I'll assume
the payments project looks the same."

"There's a little icon at the end of the hovered row. Two arrows. I would not have found that
without the hover -- it's an icon with no word on it. [Hovers.] 'Compare with...'. Okay."

**[The menu is open: "Earlier runs of PageRank", "Other runs on this graph", "The same run on
another data version...".]**

"Earlier runs of PageRank first -- damping 0.85. Then 'other runs on this graph': betweenness,
sampled, 101 sources. It says 'sampled' in the name. Good. I'd pick that one for the question,
PageRank against betweenness. Louvain isn't in the list, which is right, you can't rank a
partition."

**[Opens the finished run in the protein example to see where the command lives when a run is
open.]**

"When the run is open: 'on: full graph, 300 nodes, 3 components. Exact. Undirected. WebGPU.
Details.' The Exact tooltip -- 'Computed on every node, not estimated. It does not say the ranking
is meaningful.' Ha. That's the sentence I say to students every year. Somebody wrote that on
purpose."

"Where's Compare with here? ... Top nodes, the histogram, Options, Runs of this measure --
there, at the very bottom, 'Compare with...'. That's nearly below the fold on this screen. And on
the comparison page there's a picture where it's a button right under the result's name, next to
'Show as style layer'. So which is it? I don't care much where it is, but I'd like it to be in
one place so I can put it in the handout."

**[Opens the comparison page, first view: PageRank and betweenness on the April transfers.]**

"Payments network review, 3,093 accounts. Right column: 'PageRank and betweenness.' PageRank:
unweighted, directed, Details. Betweenness: exact, unweighted, directed, Details. Named by the
measure this time, not A and B. Good."

"Agreement. '0 of the top 50 in both. The rankings disagree at the top.' Answer first again.
'At the other lengths: 0 of 5, 0 of 10, 0 of 20, 18 of 100.' Same numbers as before, which is
reassuring."

"And now -- 'Spearman 0.40, leaving out the 1,153 accounts tied at the bottom of both (0.78 with
them).' THAT is what I asked for last time. The leaves agreeing that they are leaves was
inflating it to 0.78; without them it's 0.40. Moderate, and it's coming from the middle of the
distribution, not the top. That's a number I could put in a paper, with the bracket in a
footnote."

**[Clicks the info icon beside Spearman. The About Spearman panel opens.]**

"'Ties take the average of their ranks.' Good, that's what I'd do in R. 'The accounts tied at the
bottom of both measures agree only because both give them the least, which pulls the number
toward 1. The first number leaves them out; the one in brackets counts everyone.' Plain and
correct. I'd still want Kendall's tau-b beside it -- reviewers in my field ask for it when there
are this many ties -- but I'll compute that from the CSV. It is not a blocker."

"And the scatter now says 'Not plotted: the 1,153 tied at the bottom of both, in the bottom-right
corner.' So the picture and the Spearman leave out the same accounts. Last time those two
disagreed. Fixed."

**[Looks at the scatter.]**

"Rank on PageRank across, rank on betweenness down, rank 1 at top left, the top-50 corner shaded
and empty. Nothing to the left of about rank 70 on PageRank. The band down the right side is
still sideways text -- '1,153 accounts tied at the lowest PageRank', rotated. I'm tilting my head
again. I'll live."

**[Clicks Details under Betweenness. The run record opens beside the column.]**

"Run record: 'Brandes betweenness, exact, directed. Seed: does not apply. Damping: does not
apply. Normalization: divided by (n-1)(n-2), the ordered pairs of accounts, n = 3,093. Weight
conversion: none.' There. Directed, ordered pairs. So the top broker's 1.15e-4 means it sits on
about a thousand of the nine and a half million ordered shortest-path pairs. On a sparse payments
graph where 1,314 accounts have zero betweenness, that is believable. I can check it in NetworkX
with normalized=True on a DiGraph and it should match. That's the first time this screen let me
check a number on the screen itself."

"'Copy' -- for a methods section. What I'd want on it that isn't there: the software and version,
and whether endpoints are counted. 'Computed with graphty version whatever' is the sentence the
reviewer will ask for. Gephi at least has a version number people recognise."

**[Clicks Details under PageRank.]**

"Damping 0.85, values sum to 1, unweighted, 100 iterations, fixed. 'No transfers out: its share
is spread evenly over every account.' Dangling nodes handled the standard way, and it tells me.
Fixed iterations rather than a tolerance -- I'd rather see a tolerance, but at least it's stated."

**[Reads the Differences list, Ranked higher by Betweenness.]**

"'Top 100 on either, by rank on betweenness.' Wait -- the Top selector above says 50. The list
says 100. So which top is the list? I suppose the list is fixed at 100 and the selector only
drives the overlap count. That's the kind of thing that makes me double-check everything else on
the page."

"ACC-139419: #76 on PageRank, #1 on betweenness. Same broker as before. Then 'Ranked higher by
PageRank' down in the panels: ACC-393859, #1 against '#1,780='. The top eight PageRank accounts
all have zero betweenness. Sinks. Money ends there; nothing flows through. That's still the
finding."

"The '=' is the tied block starting at 1,780, and the gap is computed from the top of the block,
while Spearman uses the average rank. The About Spearman note now says Spearman averages, so at
least the two conventions are both written down somewhere. I'd rather the '=' had a tooltip
saying 'tied, shown at the best rank of the tie'."

**[Looks at the picker from the rail in the strip, on the payments data: "Compare PageRank with":
"PageRank, damping 0.5 -- Run 1", "PageRank on March data", "Betweenness -- Not run", "Degree".]**

"'Betweenness, not run.' And the computing panel: it runs betweenness first, in place, with
Cancel, then the comparison fills in. Handy. But with what settings? Exact or sampled? Directed?
Weighted by amount or not? It just goes. On three thousand nodes, exact is fine, and the record
tells me afterwards -- but I'd like to see the options before it spends my time, the way the
Results panel's 'Run a measure' would show them."

**[Looks at the Saved panel and the runs list after Save comparison.]**

"Save comparison, and it shows up in the runs list as 'PageRank and betweenness', under the
runs, with Undo on the toast. So the comparison is a thing I can reopen next week. In Gephi this
comparison doesn't exist at all; I'd be in R."

**[Opens the table with its column menu.]**

"The table -- March transfers here, degree and PageRank columns with their rank columns beside
them, '#348=' for ties. Column menu has 'Compare with...' too. And 'Export table...' is there.
If the export gives me id, PageRank, rank, betweenness, rank, I compute tau-b in R the first time
to check it, and after that I'd trust the screen."

**[Glances at the second view, March against April.]**

"'49 of the top 50 in both months', Spearman 0.76 leaving out 900 tied, 0.88 with them, 39 only
in March, 132 new in April, matched by id. And 'PageRank gives the same result every run, so a
re-run cannot tell change from noise', with a randomized baseline. Still the best part of the
page."

---

## Her answer to the task

"No. They don't agree on who matters. None of the top 5, 10, 20 or 50 are shared; 18 of the top
100. Spearman is 0.40 once you drop the 1,153 accounts that sit at the bottom of both -- 0.78 if
you leave them in, which is the leaves agreeing with each other. The accounts PageRank ranks
highest have zero betweenness: they are where the money ends, not where it passes. The brokers
sit around rank 70 to 300 on PageRank. All of that unweighted, which on a payments network I'd
redo weighted by amount before I said 'collects money' in print."

## Single Ease Question

**6 of 7.** "Everything I complained about last time is fixed: the Spearman is honest about the
tie block, the icon explains the tie handling, Details opens the record right there, and the
normalization is on it. It isn't a 7 because the top-50 selector and the top-100 list disagree,
Compare with... lives in two different places depending on which picture you believe, and the
betweenness run started without showing me its settings."

## Would she use this instead of her current tool?

"For this question, yes, without hesitation -- Gephi has no way to put two statistics side by
side, and I'd be in R for all of it. This does the R part and tells me what it did, which is more
than Gephi's report window ever did. Instead of Gephi overall? Not yet. My figures, my course and
my coauthors' .gephi files live there, and I haven't seen it hold my 23,000-node retweet network.
But I'd use this for the statistics and the comparison, export the CSV, and check it against
NetworkX once. If it matches, the Copy button on the run record goes straight into my methods
section -- once it carries a version number."

---

## Problems observed

1. **The Top selector and the Differences list use different tops.** The selector is set to 50
   and the overlap reads "0 of the top 50", but the list under Differences says "Top 100 on
   either". She could not tell whether the selector drives the list and began re-checking the
   rest of the page. Severity 2.
2. **Compare with... sits in two places.** On an opened run it is a row at the bottom, under
   Runs of this measure and below Options, nearly below the fold; the comparison page's
   "Getting here" picture shows it as the first button under the result's name. On a run row it is
   an unlabeled icon that appears only on hover. She wanted one place she could write into her
   handout. Severity 2.
3. **Picking a measure that has not run starts it with no chance to see or set its options.**
   "Betweenness, Not run" in the picker runs it immediately (exact or sampled, directed or not,
   weighted or not, all chosen for her); she learns the settings only afterwards from the run
   record. Severity 2.
4. **The run record has no software version and does not say how endpoints are counted.**
   Copy is meant for a methods section; a reviewer will ask which tool and version produced the
   number. Severity 1.
5. **No Kendall tau-b beside Spearman.** With over a third of accounts tied she would report
   tau-b; she will compute it herself from the export. Severity 1.
6. **The tie sign "=" in the difference lists is unexplained where it appears**, and the gap is
   computed from the best rank of the tie while Spearman averages. Both conventions are now
   written down (About Spearman), so this is smaller than before. Severity 1.
7. **Sideways text on the scatter's right-hand band** is still small and rotated. Severity 1.
8. **Unweighted PageRank on a payments network** is stated honestly but does not answer "who
   collects money"; a content question, not a screen defect. Severity 1.
9. **The rail's Compare with... is drawn on a different project (patent citations)** than the
   comparison (payments), so the walk from rail to comparison does not read as one path.
   Severity 1.

## What worked for her

- Spearman shown both ways, "leaving out the 1,153 tied at the bottom of both (0.78 with them)",
  and the scatter leaving out the same accounts: the round-3 inconsistency is gone.
- About Spearman in four plain sentences, including "ties take the average of their ranks" and
  why the tie block pulls the number toward 1.
- Details opening the run record beside the column, with normalization written as "(n-1)(n-2),
  the ordered pairs", damping, dangling-node handling and weight conversion, and Copy.
- Sides named by measure, never by letter; the run name carries the option that differs.
- The Exact tooltip: "It does not say the ranking is meaningful."
- Compare with... listing earlier runs of the same measure first, and leaving out groupings.
- A saved comparison becoming an item in the runs list, with Undo.
- The March-against-April view: unmatched accounts counted, matched by id, and the note that a
  re-run of PageRank cannot tell change from noise.
