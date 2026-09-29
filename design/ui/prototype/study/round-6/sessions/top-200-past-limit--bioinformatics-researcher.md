# Session: "Find the 200 patents that sit most in between, then look at who surrounds the first one" -- Dr. Chen, computational biologist

Participant: Dr. Chen, group leader in a translational institute that partners with a pharma
company (persona: study/personas/bioinformatics-researcher.md). Laptop on a 27-inch monitor, Chrome.
Not her domain -- patents, not proteins -- but the task is the one she runs on the full human
interactome: a measure too expensive for the whole graph, a short list, then the neighbourhood of the
top hit.

Screens used, in the order she met them (participant view, rendered 2026-09-29): the citation graph
past the drawing limit (screens/past-drawing-limit.html, "not drawn" and the "Narrow the graph..."
list), the betweenness cost form over its time limit and with a larger sample typed in
(screens/option-form-cost.html), the refused and the finished-sampled betweenness results with the
run record open (screens/results-panel.html), the "Keep top rows" editor and the 200 kept patents
drawn (past-drawing-limit.html, states 2b and 2c), the "Add their neighbors" editor and the three
most cited patents with their neighbours (state 5), the node table ranked by several measures on the
protein network (screens/table-dock.html#ranked), Find with one patent in the inspector
(screens/find.html), and a large selection shown as a hull and a count (screens/selection-over-cap.html).

Moderator's task, as given: "This citation graph is too big to draw. Find the 200 patents that sit
most in between, then look at who surrounds the first one."

## Transcript (thinking aloud)

### 1. Opening the graph: nothing drawn

"'124,318 nodes not drawn. More than this browser draws at once (50,000). Every node is counted in
Statistics and listed in the table.' Good. That is the message stringApp never gave me -- it tells
me the limit and the number. And it doesn't pretend: no hairball of a random 50,000."

"Statistics on the right: 124,318 nodes, 1,480,221 edges, density 0.0000958, 2,406 isolates, 3,912
weak components, the big one 116,905 nodes, 94.0%. That's the table I'd print from igraph with
`components()`. Degree distribution, in-degree, log-log, cumulative. 'max 236'."

"Wait. The table's citationsReceived column goes up to 779 and the degree plot says the maximum
in-degree is 236. In a citation graph those are the same thing. Unless citationsReceived is a
column from the file counting citations from outside this sample. 'Never cited by a patent in this
sample' under the zero count half-says so. I'd want that said on the column header, not left for me
to work out, because I'd have ranked on the wrong one."

"Betweenness isn't anywhere here. The table is sorted by citationsReceived. So 'sit most in between'
is something I have to compute. Where? 'Narrow the graph...' is a filter. Results on the left rail
-- the flask -- that's where computations would be."

### 2. Asking for betweenness: the cost form

"Betweenness. 'Takes hours. The time limit is 30 seconds. Directed, on the full graph: 124,318
nodes.' Then it offers me four ways: sampled with 101 sources, under a minute; exact on 5,318 nodes,
under a minute; sampled with 500 sources, a few minutes; exact on the full graph, hours."

"This is honest, and it's the right menu. Brandes with sampled pivots is what I'd do in networkit on
the cluster. In Cytoscape, CytoNCA would just hang and I'd find out tomorrow. The refused version in
the panel is even plainer: 'Not run: would take about 10 hours.' And the 5,318-node option says
'This is a different graph.' Yes. Thank you. Every hub-gene paper that computed betweenness on a
subnetwork and called it network betweenness should have had that sentence printed on it."

"But 101 sources out of 124,318. That's 0.08 percent of the sources. For the top five, fine. For
the top 200? I'd want more. I type 500 in 'Sample size': '500 sources take a few minutes, past the
30-second time limit. Run starts it in the background. 101 is the largest that fits.' OK -- it
doesn't refuse, it just tells me. I'd actually go further, 2,000, and I can't see what that would
cost until I type it. Fine, I'd type it."

"Seed 7, with a reroll button. Good. A seed is the first thing I look for on anything random."

"'The top of the ranking is usually stable; a single score can be well off.' Usually, according to
whom? Give me the reference -- Brandes and Pich 2007, or whatever the estimator is -- and a number,
not 'usually'."

### 3. The finished run

"Betweenness (sampled), 101 sources. Top nodes with rank ranges: #1 5879702, #2 5902311, then three
patents all marked '#3-#7'. 'Ranks below #2 may swap between runs.' That is the most honest ranking
display I've seen in a graph tool. It's also, read literally, telling me that the answer to the
moderator's question is two patents and then a fog."

"Run record, Details: 'Brandes betweenness from 101 random sources, scaled up by 124,318 / 101.
Seed 7. Normalization divided by (n-1)(n-2)/2, the node pairs of an undirected graph. Error bound
+/- 0.00035 on each value, 95 runs out of 100. Direction: citations read as undirected. Engine
WebGPU. Took 29.9 s.' And a Copy button. That goes straight into a methods paragraph. Good."

"Hold on. Direction. The form said 'As the graph: directed'. The Options block in this same panel
says 'Direction Directed'. The run record under it says 'Citations read as undirected', and the
normalization is for an undirected graph. The refused panel said 'the directed citations read as
undirected'. So which one ran? On a citation network that is not a detail: directed, a path only
runs backwards in time; undirected, a patent that cites two unrelated fields becomes a bridge. It
is a different measure. Two screens say one thing and two say the other. If a reviewer read my
methods section and then the tool's own panel, they'd find the contradiction before I did. I would
not use this run until I knew."

"Error bound 0.00035. The #3 to #7 values are 0.0029 and 0.0025. Distribution: 'middle ~0',
'highest ~0.016', '~79,554 nodes' at zero. So most of the graph is zero and the scores fall off a
cliff. What is the estimate at rank 200? I don't know -- nothing shows me -- but if it's anywhere
near 0.00035 then patent 200 and patent 400 are the same number within the error, and 'the top
200' is a line drawn through noise. That's the thing I actually need the tool to tell me."

### 4. Getting the 200 out

"'124,313 more in the table.' So the table becomes the ranked list. I've seen that table on the
protein network -- betweenness column with 'exact, unweighted, full graph' in the header, a rank
column 'of 300', near ties marked. Good. I assume on this graph it would say 'sampled, 101 sources'
in the header. I never saw the patent table sorted by betweenness, so I'm assuming."

"Then 'Keep top rows...' on the table. 'Keep the first 200 rows. In the table's order:
citationsReceived, Highest first.' There's a dropdown for the column, so I'd switch it to
betweenness, or it follows the sort. 'Row 200 has citationsReceived 358; 1 more patent also has 358
and is left out.' Now that is exactly right -- it tells me where the cut falls and who was cut on a
tie. '200 nodes, 288 edges, will draw.' Keep these 200 rows."

"And for betweenness, what would that sentence say? For a count, ties are exact. For a sampled
estimate the question isn't a tie at 358, it's 'row 200 is estimated at x plus or minus 0.00035,
and so are the next several hundred'. If it tells me that, I'd trust the cut. If it says '1 more
patent has the same value', that's false precision on an estimate, and I'd be back in R running
networkit with 5,000 pivots."

"Kept: '200 of 124K nodes, 1 step', canvas draws them, Undo in the toast. Statistics rewritten for
the 200, with a grey note: 'Describes the 200 most cited patents, not a random sample. Density
reads high.' Very good -- that is the caveat I put in every subnetwork figure legend and nobody
else does. 16 isolates, 21 components. So 200 nodes, and most of them don't touch each other. Of
course -- the top 200 by betweenness are bridges between different places. Drawing only them
mostly shows you nothing. That's not the tool's fault."

"ForceAtlas2, Engine WebGPU, play button. No seed shown next to the layout. I'd want that too."

### 5. Who surrounds the first one

"First one. In the kept table, first row. Click it -- I expect the right panel to become that
patent. On the Find screen it does: patent id, 'Not drawn: the graph is past the drawing limit.
Counted everywhere.' grantYear, category, citationsReceived, memberships. Two icons at the top: one
with a little caret, tooltip 'Select neighbors', 'Neighbor options'; a funnel, 'Filter to'. Icons
with no words. I found them by hovering. I'd have looked for a right-click 'First neighbours' like
Cytoscape's."

"Neighbours in which direction, though? The patents it cites, the ones that cite it, or both? The
'Add their neighbors' editor I saw has it: '1 hop', 'Both directions', and a count before it
commits -- '586 nodes, 893 edges, will draw.' The same controls presumably sit behind that caret.
I'd pick both and then look at the two sides separately, because in a citation network 'surrounds'
means two different things: what it builds on and what builds on it."

"And the neighbourhood of the top betweenness patent must include patents that are NOT in the 200
I kept -- that's the whole point of a bridge. The 'Neighbors of a node' step on the filter list says
'a row you pick in the table, or find by name', and the state with three hubs shows it working on
the full graph as a second step, not only inside the 200. So I'd either stack it on the kept step
-- and get only its neighbours among the 200, which is wrong -- or go back to the full graph and
filter to the one patent's neighbours. The filter chip shows 'Keep top 200 by citationsReceived'
then 'Add their neighbors' as two steps, so stacking is add, not intersect. I think. It's the
'Add' in the name that tells me."

"If its neighbourhood is huge -- 700 citations on a hub -- selection shows a hull and a count
rather than 700 rings. Fine. And the table becomes 'Selected: N nodes', which is the list I'd copy.
As long as I can export that list with the betweenness column attached, I have what I came for."

"What I didn't see anywhere: the first patent's betweenness in its own inspector with the rank
range. On the protein network the inspector says '0.1139 #2 of 300'. On this one it should say
'~0.016, #1, could be #1-#2'. I assume it does. I didn't see it."

## Her answer to the moderator

"Betweenness on the full 124,318-patent graph is refused at about 10 hours, so I'd run the sampled
estimate -- the app offers 101 sources in under a minute; I'd raise it to 500 or more and let it run
in the background, seed recorded. The two highest are 5879702 and 5902311; below #2 the ranks
already overlap. I'd take the ranked table, keep its first 200 rows, and draw them -- mostly
disconnected, as bridges should be. Then I'd open the first patent, 5879702, and filter the full
graph to its neighbours in both directions, then split them into what it cites and what cites it.
But I would not hand anyone '200' as a list until I know whether the run was directed or undirected
-- the panel says both -- and how far the error bar reaches down the ranking. My guess is that past
the first few dozen, the order is noise at 101 sources."

## Single Ease Question

**4 out of 7.** The hard part -- a measure that cannot run on the whole graph -- is handled better
than anything I use: it tells me the cost, offers a sample, keeps the seed, prints the error bound
and gives ranks as ranges. Keeping the top rows says where the cut falls. That alone would be a 6.
It drops to 4 because the run contradicts itself on direction, which on a citation graph changes the
answer; because the cut at 200 has no statement of how uncertain it is for an estimate; because I
never saw the patent table actually ranked by betweenness or the first patent's neighbours drawn, so
two of the steps I'm assuming rather than seeing; and because "who surrounds" hides behind two
unlabeled icons and a direction choice I had to go looking for.

## Would she use it instead of her current tool?

"Not instead. For this job I'd compute betweenness in networkit or igraph on the cluster, exact or
with thousands of pivots, and I'd want that number to be the one I defend. But this is the first
browser tool I'd load a 124,000-node graph into and not regret it: it tells me what it can't draw
and why, it doesn't fake a picture, and the cost form is what I'd want a student to see before they
press Run. If I can load my own betweenness column from R, keep the top 200 by it and pull a
first-neighbour table back out as a TSV, I'd use it as the looking step. And if the direction
contradiction is fixed and the run record is right, the sampled run is good enough for a first pass
-- with the error bound in the legend."

## Problems observed

1. The betweenness run contradicts itself on direction: the option form and the results panel's
   Options say "Directed", while the run record says "Citations read as undirected" with an
   undirected normalization, and the refused panel says "the directed citations read as
   undirected". On a citation graph these are different measures. Severity 3.
2. "Keep top rows" states where a cut falls for an exact count ("1 more patent also has 358 and is
   left out") but nothing tells her how uncertain the cut at row 200 is when the column is a
   sampled estimate with a +/- 0.00035 error bound, and the top-nodes list already says ranks below
   #2 may swap. She suspects the top 200 are mostly noise at 101 sources and cannot check.
   Severity 3.
3. No patent screen shows the node table ranked by the sampled betweenness, the "Keep top rows"
   editor choosing betweenness, or the first patent's neighbours drawn; she had to assume those
   steps from the protein and three-hubs examples. Severity 2.
4. "Who surrounds this one" lives behind two unlabeled icons on the inspector ("Select neighbors"
   with a caret for options, and a funnel for "Filter to"); she found them by hovering and expected
   a labelled "First neighbours" command. Severity 2.
5. It is unclear whether "Neighbors of a node" stacked after "Keep top 200" returns neighbours from
   the whole graph or only from inside the 200; for a bridge node the difference is the whole
   answer. The word "Add" in "Add their neighbors" was the only hint. Severity 2.
6. citationsReceived (0 to 779) and the in-degree plot (max 236) disagree on the same graph; the
   explanation that the column counts citations from outside the sample is only implied by a note
   under the zero count. She nearly ranked on the wrong column. Severity 2.
7. The sample size field shows the time only for 101 and 500 sources; she had to type another
   number to learn what it costs. "The top of the ranking is usually stable" has no citation and no
   number. Severity 1.
8. The same "not drawn" notice appears in three places across screens (centred on the canvas, a
   pill bottom-left, a pill bottom-right), and the graph is named "Citations", "Patent citations"
   and "Citations 1999 to 2001" on different screens. Severity 1.
9. The layout row shows the engine but no seed for ForceAtlas2, while every algorithm shows one.
   Severity 1.
