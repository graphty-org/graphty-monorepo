# Session: top 50 by betweenness into pandas -- Chris, ML engineer (recommendation systems)

**Task as given by the moderator:** "Get the top 50 nodes by betweenness into Excel or pandas with
their original ids, and say how sure you are of the order."

**Screens used:** the Results panel (finished betweenness on the 300-protein interaction graph,
and the sampled betweenness on the 124,318-node patent citation graph), then the bottom dock
table and its Export table as CSV dialog. Played at 1440 by 900.

**Outcome:** success with difficulty. On the small graph the path is short and honest. The export
itself makes a file I would have to clean before pandas is happy, and the big-graph case -- the
only one I actually have -- is not something I could finish.

## Think-aloud transcript

**1. The finished Results panel.** OK, betweenness already ran. First thing I read is the grey
line: "on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected. WebGPU." Good,
that's the denominator and the exactness in one line, before any number. That's what I'd check in
a notebook anyway. "Unweighted" -- fine for this graph, "Weight: None declared".

The (i) on Exact: "Computed on every node, not estimated. It does not say the ranking is
meaningful." Ha. OK, somebody's been burned. I like that.

Distribution: 300 nodes, highest 0.138, zero 10 nodes "all 291=". So ties get a shared rank. Noted.

**2. Top nodes.** At 900 tall the Top nodes header is right at the bottom of the popover and the
list is cut off -- I have to scroll inside the popover to see it. Minor. It's five rows: MAPK1
0.1379, TP53 0.1139, YWHAZ 0.0695, CDK1 0.0687, AKT1 0.0642. I need 50, so five is useless for the
task, but there's a link: "295 more in the table". 5 + 295 = 300, OK, it adds up.

I expect that to open some table. Clicking.

**3. The table.** Dock opens under the canvas, Nodes tab, "Full graph: 300 nodes. Sorted by
betweenness, highest first." Columns: id, module, degree, betweenness "exact, full graph", rank
"of 300, ties share". Good -- the header carries the method. MAPK1 #1 of 300, TP53 #2... down to
HSP90AA1 #10. Ten rows visible, the dock eats the bottom third of my canvas. Whatever, I'm not
here for the picture.

There's a little magenta "blocked" tag on the rank column in some of these renders. I don't know
what that means. Is the rank column not going to exist? If it's not there, fine, I'll rank in
pandas -- but then the "ties share" business goes with it.

I'm looking for "export top 50" or "export selected rows". There isn't one. There's "Export table
as CSV..." and nothing else. OK -- I'll take all 300 and do `df.nlargest(50, ...)`. That's
honestly what I'd do anyway. I'd rather have all rows than a tool guessing my cutoff.

**4. The export dialog.** "Rows: All 300: Nodes, full graph." Good, it says the count, no cap
anxiety. "Order: pagerank, highest first" -- wait, why pagerank? I sorted by betweenness. Oh, this
example came from the table sorted by pagerank. So the file order follows whatever the table sort
is. Fine, I don't trust file order anyway, I sort myself.

"The first column is the file's own id." Good. That's the thing I actually care about.

Now the preview:

    id,module,degree (full graph),"degree rank (of 300, full graph)","betweenness (exact, unweighted, full graph)","betweenness rank (of 300, exact, unweighted, full graph)",...

Ugh. Those are column names I have to type with `df["betweenness rank (of 300, exact, unweighted,
full graph)"]`. Commas inside quoted headers. pandas will read it, but the first thing I do is
`df.columns = [...]`. I get why the method is in there -- provenance -- but put it in a sidecar
or a comment line, or give me short names plus a metadata file. Excel users will be fine; I'm not.

Values are full precision, 0.13785223783101427. Good, not the rounded 0.1379. That matters for
the order question.

Ranks "as whole numbers". YWHAZ's degree rank is 4 in the CSV, and in the table it was "#4=" --
tied with AKT1. So in the file the "=" is gone. I can recompute ties from the full-precision
values, so it's not fatal, but the one bit of certainty info the UI gave me is dropped on export.

No Parquet. CSV only. For 300 rows who cares. For my data, CSV of 4 million user ids is slow but
works.

File name ppi-core-300-nodes.csv. Export. Done.

**5. "How sure are you of the order?"** On this graph: exact Brandes on every node, full
precision values in the file. The order is deterministic -- I'm sure of it as arithmetic. Near
the top the gaps are real except YWHAZ 0.0695 vs CDK1 0.0687, which is close but exact is exact.
What I can't see from the UI is what happens around rank 50: betweenness has a long flat tail and
269 of 300 nodes sit in the lowest bin, so ranks 40-60 are probably a pile of near-equal tiny
values. The table would show "=" only for exact ties, not for "0.0021 vs 0.0020". Whether that
ordering means anything is a different question, and the (i) already told me it doesn't promise
that. Also it's unweighted -- on my interaction graph I'd want weights, and here "None declared".

**6. The graph I actually have.** I looked at the sampled state on the 124k-node patent graph,
because that's my scale. This is actually the good part: "Sampled, 50 sources", seed 7, error
bound +/- 0.00035, and Top nodes shows rank RANGES -- "#3 to #7" -- and "Ranks below #2 may swap
between runs." That's the honest answer to the moderator's question and I haven't seen a tool do
that. The run record has a Copy button. Nice.

But then: "124,313 more in the table". The table on that graph says "rows blocked: paged listing".
So on a big graph the rows I need aren't listable yet? Does Export table as CSV still write all
124,318? The dialog is only drawn for the 300-node case, so I don't know. And if the export does
work, does it carry the rank range or the error bound? The CSV preview has one rank integer, no
low/high, no bound. So the thing that answers "how sure" in the panel doesn't make it into
pandas. I'd have to paste the run record into my notebook by hand.

Also the patent ids render as "6,117,075" in that table -- with thousands separators -- while the
Top nodes list shows "5879702" plain. If the CSV writes "6,117,075" my join against the item
catalog breaks. That's the thing that would make me close the tab. Show me the id exactly as it
came in.

## After the task

**Single Ease Question:** 5 of 7. The path from result to file is two clicks and the dialog is
straightforward. Lost points on the column names, the dropped tie marker, and not knowing whether
any of it works past the drawing limit.

**Would I use this instead of my current tool?** For this exact task on 300 nodes, no --
`nx.betweenness_centrality(G)` and `pd.Series(...).nlargest(50)` is four lines and I already have
the ids. On my real graph, maybe, and only because of the sampled mode: GPU betweenness with a
seed, a stated error bound and rank ranges is something my notebook doesn't give me for free.
But only if the export keeps my ids byte-for-byte, writes the bound and rank range as columns,
and works on a graph too big to draw -- which is the only kind of graph I have.

"Two clicks to the file is great. Then I spend five minutes renaming columns, and the one thing
that told me how sure to be -- the rank range -- stayed in the popover."
