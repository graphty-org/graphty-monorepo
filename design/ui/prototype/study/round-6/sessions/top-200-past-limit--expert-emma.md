# Session: the 200 most in-between patents, past the drawing limit -- Expert Emma

Participant: Expert Emma (network scientist; networkx, igraph and graph-tool in notebooks, Gephi
for the final figure).

Task as read to her: "This citation graph is too big to draw. Find the 200 patents that sit most
in between, then look at who surrounds the first one."

Screens she saw, in the study view (design notes hidden): the frame past the drawing limit, the
betweenness cost form, the Results panel, the table, Find, and the large-selection frame. The
renders are in `shots/r6-emma-t200-*.png`.

## Think-aloud

**1. The frame with nothing drawn** (`r6-emma-t200-past-drawing-limit-not-drawn.png`, first frame)

"OK. '124,318 nodes not drawn. More than this browser draws at once (50,000). Every node is
counted in Statistics and listed in the table.' Good. That is the right sentence. I do not want
the hairball anyway. And the numbers are all here: 124,318 nodes, 1,480,221 edges, density,
3,912 weak components, the giant one at 94.0 percent, isolates 2,406. In-degree distribution on
log-log. That is my first minute in a notebook, done for me."

"Left rail says 'Assistant Off. Nothing is sent.' and there is a 'Nothing has been sent from this
project' link on some of these screens. Fine. That was question one. I would click it later to
see what it actually claims."

"Bottom right: 'Edges: directed, weight not set'. Good, it read the direction. Citations are
directed, remember that, I am going to check it."

"Now: 'most in between.' That is betweenness. There is no betweenness column in this table: id,
grantYear, category, citationsReceived. So I have to compute it first. The big blue button says
'Narrow the graph...' -- that is not what I want yet. I want a measure."

**2. The isolates** (second frame)

"Side trip: I clicked the 2,406 isolates. 'None of these patents cites or is cited by another
patent in this sample. Their citationsReceived counts citations from patents outside it.' So an
isolate with citationsReceived 46. That would have confused me for five minutes; the sentence
saves it. Honest. Moving on."

**3. Finding betweenness** (Results panel, `r6-emma-t200-v-results-panel-running.png`, and the
catalog)

"Results in the rail, 'Run a measure...'. The catalog lists 'Betweenness -- hours', 'Closeness --
hours', 'Eigenvector -- under a minute'. I like that the cost is on the list, before I click.
Ctrl+K opens the same list, it says. Good, keyboard."

**4. The refusal** (`r6-emma-t200-v-results-panel-refused.png` and
`r6-emma-t200-option-form-cost-over-budget.png`)

"'Not run: would take about 10 hours. The time limit is 30 seconds.' Honest error that names the
limit. I respect that. The options: 'Sampled, 101 sources -- under a minute'; 'Exact, on the
5,318 nodes in Drug patents granted in 2001. This is a different graph.' -- thank you for saying
that, a student would have run it and called it the answer. 'Sampled, 500 sources -- a few
minutes'; 'Exact, on the full graph -- hours'."

"Wait. The refusal says: 'On the full graph, 124,318 nodes; the directed citations read as
undirected.' Undirected? Nobody asked it to read them as undirected. The other form of the same
screen says 'Directed, on the full graph'. Which one is it? I will check on the result."

"A 30-second limit that cannot be raised is a bit precious, but the long runs go to the
background with a Cancel, so it is not blocking me. Fine."

"Which one do I pick? For a top 200, 101 sources is too few. I know that from Brandes-Pich
sampling; the head is fine, rank 150 to 250 is noise. I would pick 500 sources and go get coffee.
But the mock only shows me the 101 result, so let me read that."

**5. The sampled result** (`r6-emma-t200-v-results-panel-finished-sampled.png`, Run record open)

"'Betweenness (sampled), 101 sources, Sep 28 09:52'. Top nodes with a tilde: #1 5879702 ~0.0160,
#2 ~0.0037, then '#3-#7' three times. 'Ranks below #2 may swap between runs.' OK -- that is
exactly the honest answer. It is telling me the top 200 from this run is not a top 200. I would
have had to work that out myself in the notebook. That is a real point in its favour."

"Run record. Method: 'Brandes betweenness from 101 random sources, scaled up by 124,318 / 101'.
Seed 7. Normalization: 'Divided by (n-1)(n-2)/2, the node pairs of an undirected graph'. Error
bound: plus or minus 0.00035, 95 runs out of 100. Engine WebGPU, took 29.9 s. Copy button. This
is better than Gephi has ever given me."

"And then: 'Direction: Citations read as undirected.'"

"Now look at the panel behind it. The state line says 'Directed.' The Options block says
'Direction: Directed.' The Run record says undirected, and the normalization is the undirected
one. So this run's own screen tells me two things about the one parameter that changes every
number. For a citation DAG that is not a detail: directed betweenness on citations is a
different measure from undirected -- in a DAG most patents sit on almost no directed paths. This
is exactly how numbers end up in a paper that nobody can reproduce."

"If this were the real thing I would stop here and run it in graph-tool both ways to see which
one it did. As a mock -- I am going to assume the Run record is the truth, because it is the more
detailed one, and I would say so in any write-up. But I trust the panel less now."

"'Distribution, 124,318 nodes, estimated: middle ~0, zero ~79,554 nodes.' Plausible for a
sampled run, many nodes never land on a sampled path. It does not tell me whether those are
true zeros or 'not hit by the sample'. Those are different things."

**6. Into the table** ("124,313 more in the table")

"The link opens the Nodes tab sorted by betweenness, it says, the other measures beside it. I saw
the ranked table on the protein data: rank column 'of 300, ties share', '#4=', 'near #7', a line
at the top saying where the ties are. Good design. On the citation data I never actually saw
this table with a betweenness column. I am guessing it shows the estimate with the same range
ranks. I would want 'estimated, 101 sources' under the column header like the protein one says
'exact, full graph'."

**7. Keeping the top 200** (the keep-top-rows frames)

"'Keep top rows...' sits in the table header. It opens: 'Keep the first [200] rows. In the
table's order: [citationsReceived] [Highest first]. Row 200 has citationsReceived 358; 1 more
patent also has 358 and is left out. 200 nodes, 288 edges will draw.' Nice -- the tie at the
cut is stated. That is the thing everyone gets wrong in a top-k."

"But the demo is by citationsReceived, not betweenness. The suggested step in 'Narrow the
graph...' is also 'Keep top rows by citationsReceived'. Nothing on these screens says the word
betweenness. I assume the dropdown lists betweenness once I have run it, and I would switch it.
If it did not, I would be stuck here."

"Second worry: with a sampled measure, the cut at row 200 is not a tie of one patent, it is a
band of dozens that are inside the error bound. Does this form say that, the way the Results
panel did with '#3-#7'? I do not see it. On an exact column the sentence is right. On an
estimate it should say 'rows 170 to 240 are within the error bound of row 200' or something. As
shown it would give me false precision at exactly the point the task depends on."

"After 'Keep these 200 rows': the graph draws, 200 of 124,318 in the chip, and the Statistics
panel says 'Describes the 200 most cited patents, not a random sample. Density reads high:
highly cited patents cite each other.' And a 'reads high' tag on density. I would put that
sentence in front of every student I have. Good. Undo in the toast. Also good."

"Layout here is ForceAtlas2 on WebGPU. It is a picture of 200 nodes and 288 edges, fine. I do not
read distance off it."

**8. Who surrounds the first one**

"Now the first one. In my table, sorted by betweenness, the first row -- 5879702 from the run. I
click it and I expect the inspector on the right with a neighbours action. On the Find screen
the inspector has a row of icons with no labels: a branching one with a dropdown, a funnel, a
pin, three dots. The funnel is probably 'Filter to neighbors' -- the 'Neighbors of a node' step
says it is 'the same step as Filter to neighbors on a node's inspector'. So, funnel. Guessing."

"The 'Neighbors of a node' form: 'Around [6117075], 1 hop, Both directions'. I can change
direction -- good, in citations I want cited-by and cites separately, that is the whole point.
'242 nodes, 348 edges will draw.'"

"But the scope line on that one says 'Full graph, no steps above'. After my 'keep top 200' step,
would neighbours of the first one come from the full 124K graph or only from the 200? I want the
full graph -- who surrounds it, not who among my 200 surrounds it. The 'Add their neighbors'
step says 'Of the 3 patents the step above keeps ... Favors hubs, so density and clustering read
high' and it clearly pulls from the full graph, but that is for all of them, not the first one.
I cannot tell from these screens which one I get when I click the funnel on one node inside a
filtered view. I would probably end up doing 'Add step', 'Neighbors of a node', type the id --
which works because it has a picker 'you pick in the table, or find by name'."

"Find: search box, 'thenard' gives 2 results in all 77 nodes, Enter to select, Esc to close.
That is fine; I would type the patent number there. Works."

**9. Select all** (the large-selection frame)

"Not needed for this task. Select all draws one hull and a badge '12,113'. Twelve thousand what?
The panel says 3,000 nodes, 9,113 edges, so it is nodes plus edges. A count that adds nodes and
edges together is not a number I would ever use. Minor."

**10. What I did not find**

"No API or notebook route anywhere on these screens. 'Export table...' exists, good, I would
export the betweenness column with the patent ids and check it against graph-tool. If the export
carries the run's settings -- sampled, 101 sources, seed 7, direction -- I can live with it."

## Outcome

Completed, with guesses: she ran the sampled measure, would have chosen 500 sources for a stable
200, kept the top 200 through the table's keep-rows step assuming it offers the betweenness
column, and reached the first patent's neighbourhood through the neighbours step rather than the
inspector icon she could not name.

## Single Ease Question

**4 out of 7.**

"The route exists and most of it is honest -- the refusal, the '#3-#7' ranks, the Run record,
the 'reads high' tags. It is a 4 and not a 5 or 6 because of two things. The direction: the same
screen says 'Directed' twice and 'read as undirected' once, on a directed citation graph. That is
the one thing I cannot afford to get wrong. And the top-200 cut: the screen that does the cutting
never mentions betweenness and never says the cut is inside the error band. The last step, the
neighbours of one node inside a filtered view, I had to guess."

## Would she use this instead of her current tool?

"For computing the betweenness? No. I would run it exactly in graph-tool on the desk machine
overnight and bring the column in. For what comes after -- a drawn 200-node subgraph with a
tie-aware cut, the ego network of the top one with direction split, 'Nothing is sent', and a view
I could hand to the client's patent analyst -- yes, that is faster than Gephi's filter panel, and
the density warning alone would save me an argument with a reviewer. Fix the direction label and
make the keep-top step say it is cutting an estimate, and I would open it for that."

## Problems she raised

1. The sampled betweenness result states the direction twice as 'Directed' (state line, Options)
   and once as 'Citations read as undirected' (Run record, and the refusal), with the undirected
   normalization. On a directed graph this makes every number untrustworthy. Severity: high.
2. The keep-top-rows step is only ever shown on citationsReceived; nothing on the drawing-limit
   screens shows betweenness as the order, and the "Narrow the graph" suggestions do not offer
   the measure just run. Severity: medium.
3. The keep-top-rows tie sentence ("1 more patent also has 358") is exact-only; for an estimated
   column the cut at row 200 falls inside the error bound and the step does not say so.
   Severity: medium-high.
4. The citation table's betweenness column is never shown; she had to assume it says "estimated,
   101 sources" and carries range ranks. Severity: medium.
5. Neighbours of one node inside a filtered view: unclear whether it draws neighbours from the
   full graph or only from the kept 200; the inspector icons that would do it are unlabeled.
   Severity: medium.
6. "zero ~79,554 nodes" in a sampled distribution does not separate true zeros from nodes no
   sampled path hit. Severity: low.
7. The select-all badge "12,113" adds nodes and edges into one unlabeled count. Severity: low.
8. The graph is called "Citations", "Patent citations" and "Citations 1999 to 2001" on different
   screens of the same project. Severity: low.
9. No API or notebook route visible. Severity: medium (her standing objection, not fatal).

## What she liked

- The not-drawn frame counts everything and lists everything; nothing is hidden because it is
  not drawn.
- The cost is on the catalog entry before she clicks, and the refusal names the limit and offers
  a sampled route, a smaller exact route labelled "This is a different graph", and background
  runs.
- Range ranks ("#3-#7") and "Ranks below #2 may swap between runs" on the sampled result.
- The Run record: method, scale factor, seed, normalization formula, error bound, engine, time,
  with Copy.
- "Describes the 200 most cited patents, not a random sample. Density reads high" and the "reads
  high" tag after narrowing.
- The keep-top-rows step states the tie at the cut.
