# Session: top 50 by betweenness into Excel or pandas -- Expert Emma

**Participant:** Expert Emma, network scientist, lives in notebooks (networkx, igraph, pandas),
uses Gephi for the final figure. See ../../personas/expert-emma.md.

**Task, as the moderator gave it:** "Get the top 50 nodes by betweenness into Excel or pandas with
their original ids, and say how sure you are of the order."

**Screens, in order:** the finished betweenness result on the protein network
(screens/results-panel.html, finished), "295 more in the table" opened into the Nodes tab
(screens/results-panel.html, in the table), the ranked Nodes tab with every run's columns
(screens/table-dock.html, ranked), the Export dialog that "Export table..." opens, drawn beside the
frame on the same page (screens/table-dock.html), and the header Export dialog with Table chosen
(screens/export-dialog.html, table).

**Renders she saw:** shots/tasks/top-50-to-excel/01-results-panel-finished.png,
shots/tasks/top-50-to-excel/02-results-panel-in-the-table.png,
shots/tasks/top-50-to-excel/03-table-dock-ranked.png, and full-page renders of
screens/table-dock.html and screens/export-dialog.html (study view) for the two export dialogs.

---

## Think-aloud transcript

**Reading the task.** Same as last time. In the notebook this is
`pd.Series(nx.betweenness_centrality(G)).nlargest(50)`. So the only things that matter: is the
number the number networkx would give me, is the id the id in the file, does the file carry enough
that I can write the methods paragraph without reopening this app, and what can I honestly say
about the order. "How sure of the order" splits in two: is the arithmetic exact (not sampled, not
single precision), and are the gaps big enough that the order means anything. The tool can help
with both, but only the first is really its job.

**The finished result.** (01.) Same panel as before. "on: full graph, 300 nodes, 3 components.
Exact. Undirected. WebGPU. Details. Weight: confidence, not used yet. Change..." And the tooltip:
"Computed on every node, not estimated. It does not say the ranking is meaningful." Still the best
sentence in the product. Options block below says "Weight: None for this run". Good, unweighted,
and it told me there was a weight column it ignored. For PPI confidence scores I would actually
want it unweighted -- confidence is not a distance, and feeding it in as one would be wrong -- so
that is the right default here, and I did not have to go looking.

Normalization: still not on this line. MAPK1 0.1379 is obviously normalized, raw would be in the
thousands. I know from other states of this panel that the run record says "Divided by
(n-1)(n-2)/2, the node pairs of an undirected graph; n = ...". For this protein run I did not see
it drawn. With 3 components, n = 300 versus n = 298 is a small but real difference. One click
away is acceptable. On the main line would be better. I say this every round.

"Every step in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%."
0.0695 vs 0.0687, 1.16%. Checks out. Still only the top 5, and I still do not know who picked 1%.
But see below -- the table picks this up now.

Precision. "WebGPU" still makes me ask float32 or float64. "Not estimated" is about sampling, not
precision. Nothing on this screen answers it.

**"295 more in the table".** (02.) Nodes tab under the canvas: "Full graph: 300 nodes. Sorted by
betweenness, highest first; PageRank's columns beside it." Good, it says what it is sorted by, in
words. Top 10 by betweenness readable: MAPK1, TP53, YWHAZ, CDK1, AKT1, UBC, UBB, EP300, MYC,
HSP90AA1. Rank column "of 300, ties share". Let me check gaps in my head: UBC 0.0579 to UBB 0.0561
is 3%, UBB to EP300 4%, EP300 0.0539 to MYC 0.0530 is 1.7%, MYC to HSP90AA1 2.9%. So the top 10 is
clean, the closest pair is still 3 and 4.

The column header here says "exact, full graph". Where is "unweighted"? It is in the run, and in
the other view of this same table, but not in this header. Small, but headers end up in files.

**The ranked table.** (03.) Grouped headers: "Betweenness exact, unweighted, full graph",
"PageRank damping 0.85, unweighted, full graph", a Louvain column with "weighted, seed 7". Good,
that is what I want in a header.

Scope line: "Full graph: 300 nodes, 1 selected. Sorted by pagerank, the run that opened the
table." Hm. I did not open it from PageRank. I opened it from betweenness, one screen ago, and that
screen said "sorted by betweenness". So either this is a different visit to the table, or the
sentence is wrong. Either way it now tells me it is sorted by PageRank, which is better than last
round, when I had to catch it by noticing UBC was missing and MYC was above EP300. At least I am
not going to export the PageRank order by accident thinking it is betweenness. I would still like
it to stop changing the sort under me. I click the betweenness header; nothing says whether first
click is descending. I assume it is.

New since last time: "Near tie: the next rank's value is within 1%, so a small change in the data
could swap them. '=' marks an exact tie." And in the PageRank rank column, "#6, near #7", "#7, near
#8", "#9, near #10". OK. That is the thing I asked for last round -- the tie flag now runs down the
whole column, not just the top 5 in the side panel. In the betweenness rank column, rows 1 to 10
have no "near" marks, which matches my arithmetic. I cannot see 11 to 50 in this picture. The
distribution is a spike near zero (middle 0.0038), so I would bet the 30-50 range is full of
"near" marks.

My quibble with the wording: "a small change in the data could swap them" is a robustness claim,
and a 1% relative gap is not evidence of robustness, it is just a gap. A bootstrap or an
edge-perturbation run would tell me that; a threshold does not. I would write "within 1% of the
next value; do not quote their order". I would still use the flag. Also still no source for 1%.

Degree ranks show "#4=", "#7=", "#11=". Exact ties on integers. Fine.

**Export.** "Export table..." top right. (The Export dialog drawn beside the frame.) "Rows: All
300: Nodes, full graph. Order: pagerank, highest first. Columns: 10, hidden ones included.
Methods: Always written beside it. The first column is the file's own id." File name
ppi-core-300-nodes.csv, "Beside it: ppi-core-300-nodes-methods.txt".

Good, that closes last round's question: exporting from the table does write the methods file.
Two files, and it says so before I press Export.

- All 300 rows, no top-50 cut. Correct. I will `nlargest(50)` myself; I do not want someone else's
  cut-off.
- Order is "pagerank, highest first" because I had not re-sorted yet when I looked. If I sort by
  betweenness first, it follows. For pandas irrelevant. For Excel-by-eye, a trap, but the dialog
  says it plainly.
- Preview: `MAPK1,MAPK signaling,5,34,1,0.13785223783101427,1,...` Full double digits, not the four
  decimals shown. Good. Whether they started life as float32 I still cannot tell from 17 digits.
  I will compare with networkx anyway.
- Header: `"betweenness (exact, unweighted, full graph)"`,
  `"betweenness rank (of 300, exact, unweighted, full graph)"`. Long, quoted, commas inside.
  pandas handles it. Still no normalization in the header. The methods file will presumably say
  it -- in the other example the methods text says "degree: exact, full graph, not normalized" and
  "pagerank: ... normalized to sum 1", so I expect a betweenness line in the same style. I did not
  see the protein one written out. I would open it before trusting it.
- Here is the new problem. `YWHAZ,Unassigned,6,24,4=,...` The degree rank column now has "4=" in
  it. Last round I complained the "=" was lost. Now it is kept -- inside the numeric column. So
  `pd.read_csv` gives me an object column for every rank column that has a single tie, and the
  betweenness rank column will have "291=" for the ten zeros at the bottom, so it is an object
  column too. `df["betweenness rank ..."].astype(int)` fails. I strip the "=" with a regex, or I
  ignore the column and rank myself. In Excel, "4=" is text; sort that column and "10" comes before
  "2". I wanted the tie information, not a string in a number column. A separate boolean "tied"
  column, or just the integer rank with ties sharing it (which already tells you it is a tie when
  two rows have the same number), would have done it. And if the "near #8" marks also go into the
  file -- the dialog note says the rank is written "as shown" -- that is "7, near #8" in a CSV cell,
  which is worse. The preview does not show a near-tie row, so I cannot tell.
- For me this is a nuisance, not a blocker: I recompute rank from the value column in one line and
  get ties exactly. For the biologist opening it in Excel it is a real problem, plus the old one:
  double-click a CSV with gene symbols and Excel turns SEPT7 and MARCH1 into dates. Still no .xlsx,
  still nothing protecting the id column. So: pandas, not Excel.

**The header Export dialog.** (screens/export-dialog.html, Table.) Same Table choice, laid out
bigger, with the CSV preview on the left and "Beside it: ...-methods.txt" on the right. The
methods text there is what I want: rows and scope, data file, how columns were read, weight not
used, each measure with its method and normalization, and the graphty-element version at the end.
That is a methods paragraph. But the example is a mule-ring case with 14 accounts, not my protein
network, so I am reading someone else's file to guess what mine will say. "Nothing is uploaded" at
the bottom, next to "2 files go to your Downloads folder". Good, that is the sentence I look for.

**What I would do next, in real life.**

```python
df = pd.read_csv("ppi-core-300-nodes.csv")
b = df.set_index("id")["betweenness (exact, unweighted, full graph)"]
top = b.nlargest(50)
ref = pd.Series(nx.betweenness_centrality(G, normalized=True)).loc[top.index]
(top - ref).abs().max()
(top / top.shift(-1) - 1).lt(0.01)
```

Match against networkx to about 1e-12, then look at the relative gaps myself.

**How sure am I of the order.** The arithmetic: as sure as I can be without having run the
networkx check -- exact, full graph, unweighted, full-precision values in the file, ids from the
file. I would put it at "sure, pending one comparison against networkx", and the comparison is two
lines. The order: the top 10 is solid for this graph, every gap at least 1.2%, most 2-4%. Ranks 3
and 4 (YWHAZ, CDK1) I would not quote as an order in a paper. Past rank 10 I do not know yet; the
distribution says the tail is packed, so I expect several near ties between 20 and 50 and I would
report the top 50 as a set with near-tied pairs marked, not as a strict ranking. None of this says
the ranking is robust to missing edges -- a PPI network is a sample of interactions, and the tool,
to its credit, says so in the tooltip.

## Single Ease Question

**5 of 7.** Better than last round. The table now says what it is sorted by, the near-tie flag
runs down the whole rank column, and exporting from the table visibly writes the methods file.
It loses points for: a scope line that says PageRank opened the table when I opened it from
betweenness; rank columns in the CSV that carry "4=" as text, which breaks the dtype in pandas and
sorting in Excel; normalization still one click away and absent from the column header; no word on
float precision; and no Excel-safe option for gene symbols.

## Would I use this instead of my current tool?

No, not for this. `nlargest(50)` in a notebook is four seconds and I already trust it. I would use
this export if the data came to me as a graphty project from a collaborator, because the methods
file is better than what I write by hand, and I might send the biologist the table view instead
of a spreadsheet. But the CSV has to be clean numbers before I hand it to anyone: integer ranks,
ties in their own column, normalization in the header.

## Problems, in her words

1. "Sorted by pagerank, the run that opened the table" -- I opened it from betweenness. The
   sentence contradicts the screen before it. (ranked table, scope line)
2. Rank columns in the CSV contain "4=" and "291=". That makes them text in pandas and in Excel.
   Put ties in their own column. If "near #8" is also written, it is worse. (export preview)
3. Normalization is not in the result line and not in the column header. It is the most common
   reason betweenness disagrees across tools. (results panel; CSV header)
4. "Exact" does not say float32 or float64, and "WebGPU" makes me ask. (results panel)
5. "A small change in the data could swap them" claims robustness from a 1% gap. Say "within 1%;
   do not quote the order". And say who chose 1%. (ranked table, near-tie line)
6. The betweenness header in the table opened from the run says "exact, full graph" without
   "unweighted"; the ranked view says it. Same column, two headers. (in the table vs ranked)
7. No .xlsx or Excel-safe export; gene symbols like SEPT7 turn into dates on double-click.
   (export dialog)
8. The example methods file I could read belongs to a different project (mule ring); I never saw
   what mine says about betweenness. (export dialog)

## What she liked

- "Computed on every node, not estimated. It does not say the ranking is meaningful." Still right.
- Weight column named and "not used yet" stated before I asked.
- The table says what it is sorted by, in words.
- Near-tie marks down the whole rank column, with the rule stated once above the grid.
- Export states the row count, that ids are the file's own, full-precision values, and that a
  methods file is written beside the CSV. "Nothing is uploaded" at the bottom of the dialog.
