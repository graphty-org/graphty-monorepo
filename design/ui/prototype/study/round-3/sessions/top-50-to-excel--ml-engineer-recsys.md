# Session: top 50 by betweenness into Excel or pandas -- Chris, ML engineer (recommendations)

- **Participant:** Chris, senior ML engineer on a retail recommendations team; lives in notebooks,
  PyG and Spark; judges every graph tool against "15 lines of networkx".
- **Task, as the moderator gave it:** "Get the top 50 nodes by betweenness into Excel or pandas
  with their original ids, and say how sure you are of the order."
- **Data on screen:** the human protein interaction network (300 proteins, 1,262 interactions,
  3 components), with Betweenness already run.
- **Screens, in order:** the Results panel with the finished Betweenness editor open; the same
  window after "295 more in the table"; the bottom table with three measures ranked, and the
  Export table as CSV dialog it opens.
- **Outcome:** success. A CSV of all 300 rows, sorted by betweenness, original ids first, full
  precision scores and ranks. Top 50 is a `head(50)` away. The "how sure" half was only partly
  answered by the screen.
- **Single Ease Question:** 5 of 7.

## Think-aloud

**1. The Results panel, Betweenness finished.**

"OK, not my data, it's a protein thing. Fine. 300 nodes, so honestly this is a networkx one-liner,
but let's see.

First thing I read is the grey line at the top of the popover: 'on: full graph, 300 nodes, 3
components. Exact. Unweighted, undirected. WebGPU.' Good, that's the denominator, that's what I'd
check first anyway. Exact, not sampled -- so it's not the k-pivot approximation. I hover the little
(i) next to Exact: 'Computed on every node, not estimated. It does not say the ranking is
meaningful.' Ha. OK, somebody's been burned. I like that, honestly. That's the right caveat.

'WebGPU.' -- for 300 nodes? Whatever. No timing next to it, so it's a badge. There's a 'Details'
link, I'm not clicking it for this.

What I don't see: is this normalized? 0.1379 for the top node -- that looks like networkx's
normalized=True, divided by (n-1)(n-2)/2. But it doesn't say. If I'm going to compare this against
something I computed in a notebook I need to know. Across three components, too -- normalized by
the whole 300 or by the component? I'm guessing whole graph. Moving on.

Distribution histogram, 'bar height: square root of the count'. Fine, skewed, most nodes near zero,
10 at zero. Expected.

Then 'Top nodes' -- MAPK1 0.1379, TP53 0.1139, YWHAZ 0.0695, CDK1 0.0687 ... and it's cut off at
the bottom of the popover. I need 50 anyway, this is a five-row teaser. I scroll the popover.
Under the list: 'No near-ties in the top 5: the closest, ranks 3 and 4, differ by 1.2%.' Oh, nice
-- that is literally half my question. But only for the top 5. I was asked about 50. And I only
found it because I scrolled; at this window size it's below the fold.

Then '295 more in the table'. Hover says it opens the Nodes tab sorted by betweenness. That's what
I want. I did look at the big blue 'Export files...' up in the corner first -- it's the most
obvious button on the screen -- but 'files' sounds like images or a project file, and the table
link is right here. Click."

**2. The table opens under the canvas.**

"OK. Nodes tab, 'Full graph: 300 nodes. Sorted by betweenness, highest first.' Columns: id,
module, degree, betweenness 'exact, full graph', betweenness rank 'of 300, ties share'. The ids are
the gene symbols, which I assume are the file's ids -- the id column doesn't actually say 'from the
file' the way module does, but they look like original ids, not 0..299. Good.

Rank column: '#1 of 300' and so on. 'Ties share' -- so equal values get the same rank, like
pandas rank(method='min'). Fine. Is 'equal' exact float equality? Betweenness is a sum of
fractions; two nodes that are structurally the same can come out 1e-15 apart and get different
ranks. I'd want to know. Can't tell from here.

Ranks 6 to 10: 0.0579, 0.0561, 0.0539, 0.0530, 0.0515. 8 and 9 are about 1.7% apart. Nobody's
telling me anything about ranks 6 to 50. I could scroll 50 rows and eyeball the gaps, but I'm not
going to -- I'll do that in pandas: `df.betweenness.diff()`.

Canvas got squeezed to the top half, which I don't care about for this task.

'Export table as CSV...' top right of the table. Click."

**3. The export dialog.**

"'Rows: All 300: Nodes, full graph.' Good, it tells me it's not capped at the 50 on screen or
sampled. 'Order: [the sort], highest first.' 'Columns: 10, hidden ones included.' 'The first column
is the file's own id.' OK, there's my original-id answer, stated plainly. Good.

Preview of the file. Header:

`id,module,...,"betweenness (exact, unweighted, full graph)","betweenness rank (of 300, exact,
unweighted, full graph)",...`

Hmm. So in pandas that's `df["betweenness (exact, unweighted, full graph)"]`. I get why -- the
method's in the header so the file carries its own provenance, and I actually respect that, the
number never gets separated from how it was computed. But the first thing I'm doing is
`df.columns = [...]` to rename everything. And somebody parsing this later will split on the
comma inside the quotes if they're sloppy. I'd take a short name plus a sidecar, or a second header
row, over this. Minor.

Values are full precision -- 0.13785223783101427, not the rounded 0.1379 from the screen. Good,
that's what I need to judge gaps myself. Ranks are whole numbers -- so the '=' tie mark is gone,
but ties would show as the same number twice, which pandas handles fine.

File name ppi-core-300-nodes.csv. Export.

Top 50: `pd.read_csv(...).head(50)` since it's already sorted. Or open it in Excel and take
the first 51 rows. Done."

**4. How sure am I of the order?**

"Numerically: it's exact, deterministic, unweighted, undirected, on all 300 nodes. The top 5 is
clean, the tool told me so, 1.2% between 3 and 4. Ranks 6 to 10 are a few percent apart, so I'd
believe those. For 11 to 50 the screen told me nothing -- I'll compute the gaps from the CSV, and
further down the list I would bet there are near-ties where the order is basically a coin flip,
especially among the Ribosome/Proteasome-type clusters where nodes are structurally similar.

But honestly the real uncertainty isn't the arithmetic, it's the edges. One missing interaction
in a PPI network and rank 30 becomes rank 45. No tool tells you that from one run. What I'd
actually want is 'drop 5% of edges, rerun 20 times, show me the rank spread' -- or at least a
button that gives me that snippet. Short answer: top 2 I'd stake money on, top 5 fairly sure, past
about 10 I'd treat as bands, not an order."

## After the task

**Single Ease Question: 5.** "Found it in three clicks: popover, table, export. The ids and the
denominator were right there, the dialog told me it's all 300 rows. I lose points because the
near-tie line is below the fold and only covers five rows when I asked about fifty, and I had to
guess whether the numbers are normalized."

**Would you use this instead of your current tool?** "For this exact task, no -- `nx.betweenness_centrality(G)`
and `sorted()` is faster than opening a browser, and I'd have the normalization flag in my own
hands. But if I was already in here looking at a neighbourhood and wanted the numbers out, yes,
this export is good: original ids, full precision, and the method written into the header so the
file can't lie about where it came from. That's better than what I get from most GUI tools, which
either don't export or hand me internal indexes. Give me Parquet, a normalized/raw flag in the
status line, and the near-tie check over the whole top-N I'm looking at, and I'd stop grumbling."

## Problems observed

1. **The near-tie check covers only the top 5** (Results panel, Top nodes). The one sentence that
   answers "how sure of the order" stops at rank 5; for any top-N beyond that the reader computes
   the gaps themselves. Severity 3.
2. **The near-tie sentence and "295 more in the table" are below the fold** of the Betweenness
   editor at 1440 by 900; the Top nodes list is cut off mid-row. Found only by scrolling the popover.
   Severity 2.
3. **Normalization is never stated** (status line, table header, CSV header). A reader comparing
   with networkx cannot tell whether 0.1379 is normalized, or over what n with 3 components.
   Severity 3.
4. **CSV headers are long, quoted and contain commas**, e.g. `"betweenness (exact, unweighted,
   full graph)"`. Good provenance, awkward in pandas; every column gets renamed first. Severity 2.
5. **Two exports, and the prominent one is not for tables.** The blue "Export files..." in the
   header draws the eye first; rows leave only through "Export table as CSV..." in the table.
   Severity 2.
6. **"Ties share" does not say what counts as equal** (exact float equality or a tolerance).
   Severity 1.
7. **The table's betweenness header omits "unweighted"** ("exact, full graph") while the ranked
   table and the CSV say "exact, unweighted, full graph". Severity 1.
8. **"WebGPU." with no timing** reads as a badge. Severity 1.
9. **No Parquet, no code snippet** for the same export. Not blocking at 300 rows. Severity 1.
