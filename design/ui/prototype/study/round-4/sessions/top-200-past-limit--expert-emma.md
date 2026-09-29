# Session: the 200 patents most in between, past the drawing limit -- network scientist (Emma)

Participant: Emma, network scientist and consultant (study/personas/expert-emma.md). She lives in
networkx and igraph, trusts a degree distribution over any layout, and writes a tool off when the
parameters of a run are not visible or two screens disagree about them.

Task as given: "This citation graph is too big to draw. Find the 200 patents that sit most in
between, then look at who surrounds the first one."

Material worked from, as the participant sees it (study view, 1440 x 900, rendered fresh for this
session):

- the patent citation graph past the drawing limit: nothing drawn, the table, the filter steps,
  Keep top rows, the 200 kept and drawn, the most cited patents plus their neighbors
  (shots/r4-emma-top200-pdl-not-drawn.png, -pdl-narrow, -pdl-keep, -pdl-kept, -pdl-sample;
  screens/past-drawing-limit)
- Betweenness on the same graph: refused for time with routes, the sampled run running, a larger
  sample offered after it finished (shots/r4-emma-top200-ofc-over-budget.png, -ofc-within-budget,
  -ofc-sample-over-budget; screens/option-form-cost)
- the Betweenness result as a result: the refusal and the finished sampled run with its run record
  open (shots/r4-emma-top200-rp-refused.png, -rp-finished-sampled; screens/results-panel)
- one patent found by id and selected while nothing is drawn (shots/r4-emma-top200-find-s7.png;
  screens/find, state 7)

Page HTML was read only to see what a control does when clicked (tooltips, the options of the
neighbor step). No screen shows a Keep top rows step over a betweenness column, and no screen shows
the neighbors of the top betweenness patent; where she has to cross that gap she says what she
assumes.

## Think-aloud

**1. The file, nothing drawn.** (pdl-not-drawn)

"OK. 124,318 nodes, 1,480,221 edges. 'Not drawn, more than this browser draws at once (50,000).'
Good, that is a number and a reason, not a spinner. And it did not try, which is correct: nobody
reads 124k dots. Every node counted in Statistics and listed in the table. Fine.

Top left, 'Assistant: Off. Nothing is sent.' I will take that for now; I would want the statement
somewhere I can cite, not in the rail. Density 0.0000958, average total degree 23.8 -- so they say
'total', meaning in plus out. Good. Weak components 3,912, and the giant one is 94.0 percent.
'Weak', thank you, it is directed. Isolates 2,406. In-degree CCDF on log-log, max 236. Good, that is
the plot I would have made first.

Wait. The table's citationsReceived runs 0 to 779 and the top patent has 779. The in-degree max is
236. So citationsReceived is not the in-degree in this graph; it is a column that came in the file,
counting citations from outside the sample, I assume. The protein table elsewhere says 'from the
file' under its column; this one just says '0 to 779'. A junior would sort by it and call it
degree. That is a note, not a blocker.

And the table is sorted by citations received. The task says 'most in between'. That is
betweenness, not citations. So the table's order is not my answer. Keep top rows is right there,
and it would give me the 200 most cited. Not what I was asked."

**2. Finding betweenness.** (menu, then ofc-over-budget and rp-refused)

"There is no betweenness column. So I have to run it. The lightning bolt I assume is quick actions;
the main menu has Algorithms, Centrality, Betweenness. I would press Ctrl-K and type 'betw'
honestly.

It refuses. 'Takes hours. The time limit is 30 seconds. Directed, on the full graph: 124,318
nodes.' Then four ways: sampled 101 sources under a minute; exact on 5,318 nodes, under a minute;
sampled 500 sources, a few minutes; exact on the full graph, hours. That is exactly the menu I would
want. This is what I do in igraph anyway -- nobody runs exact Brandes on 124k by accident twice.
Hover on the sampled row: 'estimated from 101 source nodes drawn at random, seed 7, on the full
graph.' Good. Seed. Random sources. I know what that is.

'Exact on 5,318 nodes' is betweenness of a subgraph, which is a different quantity, not a cheaper
version of the same one. The tooltip does say 'within Drug patents granted in 2001 only, not the
full graph'. OK, it is honest. I would not pick it; the paths through the rest of the graph are the
point.

Now the other version of this refusal, the one in the result panel. It says: 'On the full graph,
124,318 nodes; the directed citations read as undirected.' The first one said 'Directed'. Which is
it? For a citation graph that is not a detail. Directed betweenness on a citation graph counts
paths from newer to older patents, through the patent in the middle. Undirected counts paths that
go up one citation and down another -- two patents that both cite the same old patent are
'connected' through it. Those give different top 200s. I need to know which one I am about to run."

**3. Running the sample.** (ofc-within-budget, ofc-sample-over-budget)

"Running. Direction: 'As the graph: directed'. Sample size 101 of 124,318, with a little info
icon -- 'k of betweennessCentrality', fine, that is the networkx name. Seed 7, a regenerate button.
Progress bar in the panel and a toast at the bottom with Cancel. Good: it does not freeze and it
says what it is doing.

'Readings, when it finishes: scores are estimated from 101 sources. The top of the ranking is
usually stable; a single score can be well off.' Usually. For a top 200 out of 124k, from 101
sources, I do not believe 'usually'. 101 is less than one tenth of one percent of the sources.

After it finished, I set 500. It tells me 500 take a few minutes, past the time limit, and Run
starts it in the background. Good. That is what I would actually do: 500 sources, seed fixed, in
the background, and go get coffee. I would also run it twice with two seeds and compare the two
top 200s, and I do not see how to do that here without Compare with... which I saw on the result."

**4. Reading the result.** (rp-finished-sampled)

"Finished in 14.8 s on WebGPU. Top nodes: number 1 is 5879702, about 0.0160. Number 2, 5902311,
0.0037. Then '#3-#7' for the next three at 0.0029 and 0.0025. 'Ranks below #2 may swap between
runs.' That is honest, and I like that the rank is a range. Number 1 is four times number 2, so
the first one is not in doubt. Good, because the task hangs on the first one.

Interesting: 5879702 is not among the most cited. That is why you do not use citations as a proxy
for betweenness. Fine.

Details. Run record. 'Brandes betweenness from 101 random sources, scaled up by 124,318 / 101.
Seed 7. Normalization: divided by (n-1)(n-2)/2, the node pairs of an undirected graph; n = 124,318.
Error bound plus or minus 0.00035 on each value, 95 runs out of 100. Direction: Citations read as
undirected. Engine: WebGPU.' And there is Copy, for the methods section. This is the most useful
panel in the whole product. I would paste that into a paper.

Except the summary line two inches to the right says 'Directed.' and the Options block says
'Direction: Directed.' And the record says undirected, and the normalization is the undirected
one, (n-1)(n-2)/2, not (n-1)(n-2). So the record agrees with itself and disagrees with the panel.
If it is directed, the normalization is off by a factor of two against networkx. If it is
undirected, the panel is lying to me. Either way I cannot put this number in a report until I know,
and I would open the source to find out. In a real tool this is where I stop trusting it.

Now the top 200. The error bound is 0.00035. Ranks 3 to 7 are already at 0.0025. The distribution
says the middle is about 0 and about 79,554 nodes are at zero. So by rank 200 I would guess the
values are down near 0.0003 or 0.0004 -- inside the error bound of each other and of a few thousand
patents below them. The top 20 or so from this run are a finding. Rank 150 to 250 is a coin toss.
The 200 is only defensible from the 500-source run, and even then I want to see where the cut sits
against the bound."

**5. Keeping the 200.** (pdl-narrow, pdl-keep, pdl-kept -- all drawn on citations; she assumes
the same for betweenness)

"'124,313 more in the table' -- that link takes me to the table sorted by betweenness, the page
says. Then Keep top rows... on the table, which is where I would look. The editor: 'Keep the first
200 rows, in the table's order', a column dropdown and 'Highest first'. I assume the dropdown now
has the betweenness column in it. The screen only shows citationsReceived.

On citations it says: 'Row 200 has citationsReceived 358; 1 more patent also has 358 and is left
out.' That is good for an exact column with ties. For an estimated column, a tie is the wrong
question. I would want: 'Row 200 is about 0.0004; within the error bound, rows 140 to 290 could
swap.' The result panel already knows its error bound -- it printed '#3-#7'. If Keep top rows does
not carry that through to the cut, it will hand me a crisp 200 that is not crisp. It does not say
'estimated' anywhere in this editor. I cannot tell from these screens whether it would.

'200 nodes, 288 edges, will draw.' Counted before commit. Good. Keep these 200 rows. It draws,
gray, arrows on, with a toast and Undo. The chip reads '200 of 124K nodes, 1 step'. Statistics now
says 'Describes the 200 most cited patents, not a random sample. Density reads high.' Good -- it
says what the step did. For mine I would hope it says 'the 200 highest by betweenness (sampled, 101
sources, seed 7)'. And weak components 21, 174 in the biggest. Fine.

One thing I would check: if I now run betweenness again, it runs on the 200, not the 124k. That is
a different number with the same name. The scope line in the result said 'on: full graph', so I
would expect it to say 'on: filtered graph, 200 nodes' then. I did not see that case."

**6. Who surrounds the first one.** (find-s7, pdl-narrow, pdl-sample)

"The first one is 5879702. Two ways I can see. Type it into Find -- the find screen shows a patent
id found in all 124,318 nodes, selected, 'Not drawn: the graph is past the drawing limit. Counted
everywhere.' The inspector has three icons with no words: a fork thing, a funnel, three dots. The
fork is 'Select neighbors' with a chevron for 'Neighbor options', the funnel is 'Filter to'. I
found that by hovering. At 125 percent zoom at six in the evening I would not have guessed the fork.

The inspector shows grantYear, category, citationsReceived. It does not show in-degree and
out-degree. For 'who surrounds it' the first thing I want is how many cite it and how many it cites,
before I draw anything.

Or the filter chip: 'Neighbors of a node...' -- around a patent, '1 hop', 'Both directions',
counted before commit. That is my ego network. Both directions is the right default for 'who
surrounds', but I would switch it once to 'cites it' and once to 'it cites', because on a citation
graph those are two different stories: who built on it, and what it built on. I assume the
dropdown has those two.

Here is the question the screens do not answer. I already kept the 200. Is 'Neighbors of a node'
a new step on top of Keep top rows? Then it is the neighbors among the 200, which is a tiny and
misleading neighborhood. Or is it from the full graph? The two-step example (most cited, then 'Add
their neighbors') counts 586 nodes, so the neighbors do come from the full graph there -- 'Add'
reaches outside. Good. But 'Neighbors of a node' from the chip, with a step already in the list, I
would have to try it and read the node count to know. I would probably turn off the Keep step, or
undo it, and do the neighbors from the full graph. Two different questions, and I would keep them
as two views.

The drawing of the neighbors, if it looks like the sample state: a star around the hub, arrows on,
with the patents that link two hubs in between. For a betweenness node that is the picture: the
few patents on either side it connects. Then I sort that table by category and see if it sits
between, say, drug patents and chemical ones. That is the finding, not the star."

## Single Ease Question

**3 of 7.** "The pieces are there and some of them are better than anything I use -- the refusal
with priced routes and the copyable run record. But I had to assemble the path from four screens,
the one step that joins them, keep the top 200 by an estimated score, is not shown, and the result
told me 'directed' and 'undirected' about the same run. That last one alone costs it two points."

## Would she use this instead of her current tool?

"For the analysis, no. In igraph this is two lines: sampled betweenness with a seed, sort, take
200, then neighborhood of the first. I would run it with 500 sources twice and compare, in a
notebook, in five minutes. That will not change.

For what comes after, maybe. The not-drawn page with the degree distribution and the table is a
good first look, the run record with Copy is exactly what I want to paste, and a view I can hand an
IP lawyer -- 'here is the patent in the middle, here is who cites it, click around' -- is the thing
Gephi does badly. If it states which direction it used, one way, everywhere, and if Keep top rows
knows the scores are estimates, I would use it for the hand-off. Not before."

## Problems observed

1. **The same run says both directed and undirected.** The result's summary line and Options read
   "Directed"; its run record reads "Citations read as undirected" with the undirected
   normalization, (n-1)(n-2)/2; the refusal in the result panel says the directed citations are
   read as undirected while the refusal on the options page says "Directed". On a citation graph
   the two readings rank different patents and differ in normalization by a factor of two. Severity:
   high -- she would not report a number from this run.
2. **No screen shows Keep top rows over an estimated result, and the cut ignores uncertainty.** The
   editor reports ties at row N ("1 more patent also has 358"), which is the right check for an
   exact column; for a sampled betweenness the question is which rows around N lie within the run's
   own error bound. The result panel already shows rank ranges ("#3-#7"); the keep step does not
   carry them. Severity: high -- the task's "200" is a noise cut below the top few dozen at 101
   sources.
3. **Scope of a neighbor step after a keep step is not stated.** With "Keep top 200" in the step
   list, it is not clear whether "Neighbors of a node" finds neighbors among the 200 or in the full
   graph. "Add their neighbors" reaches the full graph (586 nodes); the chip's "Neighbors of a
   node" is not shown in that position. Severity: medium.
4. **citationsReceived looks like in-degree but is not.** Its header reads "0 to 779" with no
   provenance, while the graph's in-degree maximum is 236; only the isolates state explains that
   the column counts citations from outside the sample. The protein table labels its file column
   "from the file". Severity: medium.
5. **The inspector of a selected patent shows no in-degree and out-degree,** and its neighbor
   actions are unlabeled icons (a fork, a funnel) found only by hovering. Severity: medium.
6. **"Usually stable" in the readings is unquantified until the run finishes;** the error bound
   appears only in the record. Severity: low.
7. **The same graph is named three ways** across screens ("Citations", "Citations 1999 to 2001",
   "Patent citations"), and the not-drawn message moves from the canvas center to a corner card
   depending on the screen. Severity: low.

## What delighted her

- The refusal with priced routes: sampled at 101 sources, exact on a subset (honestly labeled as a
  different graph), 500 sources in the background, exact in hours.
- Seed shown and editable, "k of betweennessCentrality" named, run time and engine recorded.
- The run record with Copy: method, seed, normalization, error bound, direction, engine -- "I would
  paste that into a paper."
- Rank ranges on the top nodes ("#3-#7") and "Ranks below #2 may swap between runs."
- The not-drawn page: counts, weak components, isolates, the in-degree CCDF on log-log, and a table
  that works with nothing drawn.
- Counts before commit on every narrowing step, and Statistics stating what the step kept and that
  density reads high.
