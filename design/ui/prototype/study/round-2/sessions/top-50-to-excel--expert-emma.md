# Session: top 50 by betweenness into pandas -- Expert Emma

Participant: Expert Emma, a network scientist who works in Python notebooks (networkx, igraph)
and uses Gephi for figures. Simulated participant, playing the persona in
`study/personas/expert-emma.md`.

Task as the moderator gave it: "Get the top 50 nodes by betweenness into Excel or pandas with
their original ids, and say how sure you are of the order."

Screens used: the Results panel mock (starting at its first state) and the bottom dock table
mock.

Outcome: done for the 300-protein graph, where betweenness is exact. Not done for the
124,318-patent graph, where betweenness is sampled: the table shows no rows there, and nothing
on screen says whether the CSV export would still write them or would carry the uncertainty.

## Transcript

**Starting screen (Results panel, PageRank running on the patent citations).**

"OK. Patent citations, 124,318 nodes, 1.48 million edges, directed, no weight. Good, it tells
me that before I ask. Left rail: 'Assistant: Off. Nothing is sent.' Fine, noted. I would still
want the one-line statement about where the file itself is processed, but that is not today's
task.

Betweenness. There is a 'Betweenness (sampled)' already in 'In this project'. The catalog says
exact Betweenness is 'hours' on this graph. Right, it would be, it is Brandes on 124k nodes in a
browser. So someone already ran the sampled one. I click that."

**Betweenness (sampled), finished.**

"'on: full graph, 124,318 nodes. Sampled, 50 sources. Unweighted, undirected. WebGPU.' Fifty
sources. Out of a hundred and twenty-four thousand. OK. At least it says so in the first line
and does not make me dig.

Direction: 'Read as undirected.' It is a citation graph. That is a choice somebody made, and it
changes the answer. Fine, it is stated, and there is a dropdown for it.

I open Details. Run record: 'Brandes betweenness from 50 random sources, scaled up by
124,318 / 50.' That is networkx's `k=` estimator, n over k. Seed 7. 'Normalization: divided by
(n-1)(n-2)/2, the node pairs of an undirected graph.' That is networkx's `normalized=True` for
undirected. Good. That is the first thing I would have checked and it is right there. There is a
Copy button, so I can paste this into a methods section. I like that. Genuinely.

'Error bound: plus or minus 0.00035 on each value, 95 runs out of 100.' Hm. Per value? Or
simultaneous over all 124,318? If it is per value, then across a hundred thousand values
thousands of them are outside it. It does not say. I would want to know which bound this is --
Hoeffding, empirical, what.

Top nodes: '#1 5879702 ~0.0160, #2 5902311 ~0.0037, then #3 to #7' for three patents at 0.0029,
0.0025, 0.0025. 'Ranks below #2 may swap between runs.' That is honest, and it is the answer to
half my task already: with fifty sources, only the top two are stable. And the error bound is
0.00035 against values of 0.0025 -- by rank 50 the values will be well below 0.001, so the
bound is a big fraction of the value. Ranks 3 to 50 from fifty sources are close to noise. I
would not report that order to anyone.

So what I actually want is to set 'Sample size' to, say, 5,000, run it twice with two seeds and
see if the top 50 agree. The fields are there, sample size and seed, next to each other. I would
do that. It does not tell me how long 5,000 sources takes until I type it, I assume the Run line
gives an estimate like it did for PageRank ('under a minute'). OK.

Now to get them out. '124,313 more in the table.' I click it."

**The table for the patent graph (dock mock, 'Past the drawing limit').**

"Nothing drawn -- fine, I do not want 124k dots anyway. The table takes two thirds of the
column. Good, that is the right instinct. Headers: id, grantYear, category, citationsReceived...
and then no rows. There is a small tag, 'rows blocked: paged listing'. So the table has
headers and a scope line and no content. I cannot see my top 50 in the table at all on this
graph.

Is 'Export table as CSV...' still going to work here? It is there in the corner. The only
dialog I can see is for a 300-row graph. Does it write 124,318 rows when it cannot list them?
Does the betweenness column in the file carry the '#3 to #7' ranges and the error bound, or does
it write a bare rank 3, 4, 5 as if it knew? Nothing on this screen tells me. If it writes a bare
integer rank for a sampled estimate, that is exactly the kind of number that ends up in a
client's slide with no caveat.

Also the ids. In Top nodes the patent is '5879702'. In the table it is '6,117,075', with
thousands separators. That is an identifier, not a quantity. What goes in the file -- 6117075
or '6,117,075' in quotes? If a client's ids had leading zeros I would already be worried.

I stop on this graph. I cannot get the 50 rows out from what I can see."

**Switching to the protein graph (Results panel 'Finished', 300 proteins).**

"The other state is a protein interaction graph, 300 nodes, 1,262 edges, 3 components,
undirected, no weight. 'Exact. Unweighted, undirected. WebGPU.' And an (i) saying 'Computed on
every node, not estimated. It does not say the ranking is meaningful.' Ha. Correct, and more
honest than most papers.

Distribution: highest 0.138, 10 nodes at zero. Top nodes: MAPK1 0.1379, TP53 0.1139, YWHAZ,
CDK1, AKT1. The list is cut off at the bottom of the panel at this window size, I had to scroll.
'295 more in the table.' Click."

**Table, sorted by betweenness.**

"Right. 'Full graph: 300 nodes. Sorted by betweenness, highest first.' Columns: id, module
('from the file'), degree, betweenness ('exact, full graph'), betweenness rank ('of 300, ties
share'). MAPK1 #1 of 300, TP53 #2, YWHAZ #3, CDK1 #4 ... HSP90AA1 #10. Ties share a rank -- so
the ten zeros are all 291=. Good, that is min-rank, which is what I would do in pandas with
`method='min'`.

I do not need it to give me 'top 50', I will do that myself. 'Export table as CSV...'."

**Export dialog.**

"'Rows: All 300: Nodes, full graph.' Good, it says all, not 'first 100'. 'Columns: 9, hidden
ones included.' 'The first column is the file's own id.' That is the thing I wanted to hear.
The preview shows the first lines of the file:
`MAPK1,MAPK signaling,34,1,0.13785223783101427,1,...`. Full precision, ranks as integers. File
name ppi-core-300-nodes.csv. Export.

Then in pandas: `df = pd.read_csv(...)`, and `df.nlargest(50, <that column>)`. Except the column
is called `betweenness (exact, unweighted, full graph)`. With commas and parentheses in it. It
reads fine, pandas handles the quoting, but I am going to rename it on line two every single
time. I would like a plain header option -- `betweenness` -- with the method in a sidecar or a
comment line. And the run record (normalization, seed, engine) is only in the Copy on the
Details popover, not in the file. The provenance and the numbers leave by two different doors.
In six months I will have the CSV and not the paste.

One more thing. It ran on WebGPU. Is that float32? The preview writes 17 significant digits,
0.13785223783101427. If the kernel accumulates in float32, the last nine or so of those digits
are invented. And 'ties share' -- tied by exact equality, or within a tolerance? On a GPU with a
different summation order two structurally equivalent nodes can come out 1e-9 apart and then
they are not a tie. I would check this against networkx before I trusted the ties, and on a
300-node graph that takes me four seconds in the notebook."

**How sure of the order.**

"Protein graph: exact, so the order is as sure as the arithmetic -- I would say certain for the
top 50 here, given the gaps between values, after one check against networkx for the float
question. Patent graph: sure of #1 and #2, not of anything after that, and the tool says so
itself. For a top 50 I would need far more sources and two seeds that agree, and I could not
get the rows out to check."

## After the task

**Single Ease Question: 5 of 7.** On the small graph it is three clicks and a dialog that
answers the questions I would ask. It loses points on the big graph, where I got headers and
no rows, and on the export not carrying the method and the uncertainty with the numbers.

**Would she use this instead of her current tool?**

"For this task? No. On 300 nodes this is `nx.betweenness_centrality(G)` and
`pd.Series(...).nlargest(50)` -- two lines, and I already have the notebook open. On 124,000
nodes I would use igraph or graph-tool, and I would control the sampling myself. What I would
use it for is the part before and after: the run record with the normalization written out is
better than what Gephi gives me, and the honest 'ranks below #2 may swap' line is something I
would happily show a client instead of explaining it. If the CSV carried the run record and the
rank ranges, and the big graph actually listed its rows, I would use it to hand results to a
non-coder. Not to do the analysis."

## Problems seen

1. **Past the drawing limit, the table has no rows** (dock table, 124,318 patents). "124,313
   more in the table" leads to headers and a scope line only; the top 50 cannot be seen. Whether
   Export table as CSV still writes the rows here is not shown. Severity 3.
2. **The export does not say how it writes a sampled result.** The panel shows rank ranges ("#3
   to #7") and an error bound; nothing shows whether the CSV carries them or writes a bare
   integer rank for an estimate. Severity 3.
3. **The error bound does not say what kind it is.** "Plus or minus 0.00035 on each value, 95
   runs out of 100" -- per value or simultaneous over all values, and from which bound. Severity
   2.
4. **Provenance does not travel with the file.** The run record (normalization, seed, engine) is
   copied from a popover; the CSV has only "exact, unweighted, full graph" in each header.
   Normalization and seed are not in the file. Severity 2.
5. **Column headers are unfriendly to code.** "betweenness (exact, unweighted, full graph)" has
   commas and parentheses; she renames it every time. She wants a plain-header option with the
   method elsewhere (a sidecar or a comment line). Severity 2.
6. **Precision and ties on the GPU are unstated.** The file writes 17 significant digits from a
   WebGPU run; whether the kernel is float32, and whether "ties share" means exact equality or a
   tolerance, is not said. Severity 2.
7. **Patent ids are formatted as numbers in the table** ("6,117,075") but not in Top nodes
   ("5879702"); what the file writes is not shown. Severity 2.
8. **Top nodes is cut off at 1440 x 900** in the exact finished state; she had to scroll the
   editor to read past MAPK1. Severity 1.

## What worked

- The first line of a result states the scope, the counts, exact or sampled, the edge reading
  and the engine, before any number.
- The run record gives the normalization formula, and it matches networkx's `normalized=True`
  and its `k=` estimator (scaled by n/k).
- "Ranks below #2 may swap between runs" answers the confidence question for her, in plain words.
- The export dialog states "All 300", says the first column is the file's own id, and previews
  the file's first lines at full precision.
- The rank column says "of 300, ties share" and ties use min-rank, as she would in pandas.
