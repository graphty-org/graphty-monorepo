# Session: who matters most, and how sure -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional composite), associate professor, Gephi user since
2012. Laptop size, 1440 x 900.
**Task given:** "Your manager wants the people who matter most in this network, and how sure you
are."
**Screens used:** the Results panel (its finished, sampled, table and filtered states), the
Inspector (one protein selected), the frame at rest (Les Miserables). The red banner across the top
of each mock is the prototype's own state switcher; the moderator told her to ignore it.
**Outcome:** success, with difficulty. **Single Ease Question:** 5 of 7.

## Transcript (thinking aloud)

**1. Opening the Results panel (patent citations, PageRank running).**
"'Manager' -- I don't have a manager, I have a department chair, but fine. 'Matter most' is not a
measure. Matter how? Degree, betweenness, PageRank, eigenvector -- they answer different questions.
So first I want to see what it offers."

Looks at the left column. "OK, a catalog. Betweenness, closeness, eigenvector, HITS, Katz, PageRank.
That's my Statistics panel in Gephi, except it tells me how long each will take -- 'hours' for
betweenness, 'under a minute' for PageRank. Gephi just starts and then the progress bar lies to
you. That I like."

Looks at the PageRank card. "'on: full graph, 124,318 nodes. Exact. Directed. Values shown: run 1,
damping 0.85.' Good -- it says what it ran on. That is the first thing I check, because in Gephi
the statistic runs on whatever the filter left on screen and never tells you. And someone typed
damping 0.5 and it says it hasn't run yet and is queued. Fine, that's honest."

"124,318 nodes and nothing drawn? 'More than this browser draws at once.' There's the web tool
problem I expected. I'll come back to that."

**2. Betweenness, sampled (the citation graph).**
"Betweenness on 124k nodes, exact is 'hours', so it sampled. 'Sampled, 50 sources.' Fifty? Out of
124 thousand. Let me see Details."

Clicks Details. A Run record opens: "Brandes betweenness from 50 random sources, scaled up by
124,318 / 50. Seed 7. Normalization divided by (n-1)(n-2)/2. Error bound plus or minus 0.00035 on
each value, 95 runs out of 100. Citations read as undirected."

"OK. This is -- honestly this is more than Gephi gives me. Gephi gives me an HTML report with a
histogram and no seed. Seed 7, I can reproduce that. 'Citations read as undirected' -- that's a
choice I'd argue with for a citation network, but at least it's written down and there's a
Direction dropdown. The error bound -- what bound is that? Brandes and Pich? Hoeffding? I'd want
the reference, not 'runs out of 100'. But it's there. There's a Copy button, so it goes into my
methods section. Good."

Reads Top nodes. "#1 5879702, 0.0160. #2 5902311. Then '#3 to #7' on three rows. 'Ranks below #2
may swap between runs.' So that's the 'how sure' answer, right there: the top two are solid, three
to seven are a tie within noise. That is exactly the sentence I'd have to write myself. I've never
had a tool write it for me."

Pause. "But '#3 to #7' is five nodes and I see three. Where are the other two? In the table, I
suppose -- '124,313 more in the table'. And these are patent numbers. My chair isn't going to know
what 5879702 is. Where's the label column? In Gephi I'd flip to Data Laboratory and see the Label."

**3. Compare with...**
"The question is 'who matters', and one measure isn't an answer. If PageRank and betweenness agree
on the top ten, I'm sure. If they don't, that *is* the finding. There's 'Compare with...'."
Clicks it. Nothing happens in the prototype.
"Nothing. OK, so I'd have to run PageRank separately and eyeball the two lists. That's what I do in
Gephi anyway -- export both columns to CSV and do a Spearman in R."

**4. The finished, exact run (human protein interactions, 300 nodes).**
"Different network, whatever. 300 proteins, 1,262 edges, 3 components. 'on: full graph, 300
nodes, 3 components. Exact. Unweighted, undirected.' Hovers 'Exact': 'Computed on every node, not
estimated. It does not say the ranking is meaningful.'"
Laughs. "Ha. Put that on a T-shirt. That's the note I write on every student's lab report."

Reads the distribution. "269 of 300 in the lowest bin, ten at zero, 'all 291='. Ties share a rank.
Good, that's correct behaviour -- NetworkX doesn't even give you ranks."

"Top nodes: MAPK1 0.1379, TP53 0.1139, YWHAZ 0.0695, CDK1 0.0687. YWHAZ and CDK1 are 0.0008 apart.
It's exact, so that order is real for *this* edge list, but a protein interaction network is noisy
-- drop five percent of edges and those two swap. The tool tells me how sure it is about the
arithmetic. It doesn't tell me how sure I should be about the network. To be fair, nothing does;
I'd bootstrap it in Python."

The Top nodes list is cut off at #4 at the bottom of the card. "I have to scroll a little card to
see five names. Tiny."

**5. The table (clicked '295 more in the table').**
"There it is. Nodes tab. 'Full graph: 300 nodes. Sorted by betweenness, highest first.' Columns:
id, module, degree, betweenness -- 'exact, full graph' under the header -- and 'betweenness rank,
of 300, ties share'. This is my Data Lab, and it says under the column header what the column was
computed on. That is the thing Gephi gets wrong; its modularity_class column can hold two runs mixed
together and never tells you. Export table as CSV. Good. That's where I'd actually do the work."

"Can I add a PageRank column here? I don't see how. I'd need to run PageRank first, I suppose,
and hope it shows up as another column."

**6. The Inspector (TP53 selected).**
"Now this is useful for 'who matters'. TP53: degree 32, #2 of 300. Betweenness 0.1139, #2 of 300.
PageRank 0.01137, #2 of 300. Three measures, same rank. That's the comparison I wanted -- but only
for one node at a time. I'd want exactly this, for the top twenty, as a table. Then I'd tell my
chair: MAPK1 and TP53, by every measure, and the rest depends on how you define 'matters'."

"The legend says module color, Ribosome 56, Proteasome 40 -- named groups, from the file. Not
'community 7'. Good."

**7. The frame at rest (Les Miserables), and the filter test.**
"Les Mis. I teach with this. 77 nodes, 254 edges -- correct. 'Connected components: 2 (1
isolate).'" Frowns. "Les Mis is connected. There's no isolated character in Les Mis. Which one is
the dot off on the left?"

"Group color '2, 8, 4, 1...' -- those are the numbers from the file, fine."

She deliberately checks the filtered state: 'Filtered: 76 of 77 nodes, 1 step'. Betweenness card:
"'on: filtered graph, 76 nodes, 1 component.' And the Scope dropdown reads 'Filtered graph, 76 of
77.' And the header stats have a little funnel on every number. OK -- that is the Gephi trap, and
it's fixed. It tells me it ran on the subset. I would have tested that deliberately and it passed."

Details: "Brandes, exact, every node a source. Divided by (n-1)(n-2)/2 = 2,775, n = 76."

"Valjean 0.547." Pause. "NetworkX gives Valjean about 0.57 on Les Mis. Removing an isolate
doesn't change any shortest path, so the raw count is the same and dividing by a *smaller*
denominator should push it *up*, not down to 0.547. Either this isn't the Les Mis I know -- which
the isolate already suggests -- or the number's wrong. I'd need to see the edge list. At least the
record gives me enough to check it. In a real session I'd export the table and run NetworkX on it
right now, and if they didn't match I'd be done."

## After the task

**Her answer to the task:** "MAPK1 and TP53, by degree, betweenness and PageRank alike -- sure of
those two. Positions three to seven are a tie within the sampling error on the big graph and a
near-tie on the small one; I wouldn't rank them for anyone. And I'd tell my chair that 'sure'
means sure about the computation, not about the network."

**Single Ease Question:** 5. "Finding a ranking was easy. Finding the 'how sure' was easier than
in any tool I've used -- the rank ranges and the run record did the work. It loses points because
comparing two measures, which is the actual question, went nowhere, and the patent list had no
names."

**Would she use it instead of Gephi?** "No. Not instead. For this question -- a ranking with its
caveats written out -- it's better than Gephi, honestly. The run record with the seed and the
normalization is going in my methods sections if I can get it out as text. And the funnel on the
numbers after a filter is the fix I've wanted for ten years. But it didn't draw my 124k graph at
all, I can't see ForceAtlas2 anywhere, I haven't seen it open a GEXF, and the one number I could
check from memory didn't match. I'd try it with the students for statistics. Research stays in
Gephi until it opens my files and matches NetworkX."

## Problems observed

1. **Compare with... leads nowhere** (Results panel, finished rows). The one control that answers
   "matters by which measure?" did nothing. Severity 3.
2. **No comparison of several measures at once** (Results panel, table). The Inspector shows
   degree, betweenness and PageRank ranks for one node; she wanted that same view for the top
   twenty rows. Severity 3.
3. **Les Miserables numbers do not match what she knows** (frame at rest, filtered state). An
   isolate she knows is not in the novel graph, and Valjean's betweenness moves the wrong way
   compared with NetworkX. Nothing on screen says this copy differs from the published graph.
   Severity 3 for trust.
4. **Sampled Top nodes show raw ids, no labels** (Results panel, sampled). Patent numbers mean
   nothing to a reader. Severity 2.
5. **"#3 to #7" band shows three of its five members** (Results panel, sampled). Severity 2.
6. **Error bound gives no method or reference** (Run record). She wants the paper, not "95 runs out
   of 100". Severity 1.
7. **Top nodes cut off inside the card** (Results panel, finished). Only four names visible without
   scrolling. Severity 1.
8. **No drawing at 124k nodes** (Results panel, citation graph). Expected for a web tool, still
   counts against it. Severity 2.

## What worked for her

- "on: full graph / filtered graph, N nodes" on every result, plus a funnel on each header number
  after a filter: the Gephi filter trap, answered.
- Rank ranges and "Ranks below #2 may swap between runs" on a sampled run: the "how sure" sentence
  written for her.
- The Run record: method, seed, normalization formula, direction, error bound, with Copy.
- "Exact -- it does not say the ranking is meaningful."
- The table column header naming what it was computed on; ties sharing a rank; CSV export.
- The Inspector listing a node's rank for three measures side by side.
