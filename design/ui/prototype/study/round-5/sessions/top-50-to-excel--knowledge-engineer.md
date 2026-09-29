# Session: top 50 by betweenness into pandas, with original ids -- knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (study/personas/knowledge-engineer.md).
Task as given: "Get the top 50 nodes by betweenness into Excel or pandas with their original ids,
and say how sure you are of the order."
Material: the Results panel (finished and "in the table" states), the table dock (ranked state and
"Getting rows out"), and the Export dialog (the Table state and the three ways in). Dataset on
every screen: the 300-protein interaction network, loaded from ppi-core-300.graphml.

Outcome: done, with difficulty. She got a file she would load, but the top-50 cut and the "how
sure" half of the answer were done by her in pandas, not by the tool.

## Transcript (thinking aloud)

**1. Where is the betweenness result.** "OK, Results panel, Betweenness. First line: on full graph,
300 nodes, 3 components. Exact. Undirected. WebGPU. Weight: confidence, not used yet. Good, that is
the first tool this year that tells me which betweenness before it tells me the number. I would
still ask: normalized how? It does not say on this line. There is a Details link, so I will hold
that thought."

"Top nodes: five of them. MAPK1 0.1379, TP53 0.1139, YWHAZ, CDK1, AKT1. I asked for fifty. Five is
a teaser. There is no 'show 50' here, but '295 more in the table' is right under it, so that is
where I go."

"And the tooltip on Exact: 'Computed on every node, not estimated. It does not say the ranking is
meaningful.' Yes. Thank you. That sentence is correct and I have never seen a tool say it."

**2. The sentence under the top five.** "'Every step in the top 5 is over the 1% tie line; the
smallest, ranks 3 and 4, is 1.2%.' Let me check: 0.0695 against 0.0687 -- about 1.2% of the lower
one. Fine, the arithmetic holds. But what is the 1% tie line? This is an exact run. The order is
not uncertain in the computing sense; floating point aside it is deterministic. So the 1% must be
about whether a gap that small means anything in the data. Who picked 1%? It does not say. I would
not repeat '1% tie line' in a report without being able to defend where it came from. And it covers
five ranks. My question is about fifty, and specifically about whether rank 50 and rank 51 are
really different. The panel says nothing about that."

**3. The table.** "Clicked '295 more in the table.' The dock opens on the Nodes tab, sorted by
betweenness, highest first, PageRank beside it. Scope line says 'Full graph: 300 nodes.' Good,
it says it is not a sample. Columns: id, module 'from the file', degree, betweenness 'exact, full
graph', betweenness rank 'of 300, ties share'. 'Ties share' -- so competition ranking, 1, 2, 2, 4?
In the other table view I see '#4=' on two degree rows and then '#6', so yes, the gap after a tie
is kept. I would rather it said 'standard competition ranking' once somewhere, but '#4=' is
readable."

"The id column says MAPK1. Is that the file's id or a label? The column is called id and there is
no separate label column, so I assume the GraphML node id. For proteins the id and the name are the
same string, so this demo cannot show me the difference. On my data the id is an IRI. I would want
to see a full IRI in that column, not a prefixed name and not rdfs:label, before I trust 'original
ids'."

"There is no way to cut the table to the top 50 that I can see. No 'first N rows', no LIMIT. I
could maybe build a filter on betweenness rank, but I am not going to invent a filter step just to
make an export smaller. I will take all 300 and do head(50) in pandas. Honestly I prefer that: I
want the rows around the cut anyway."

**4. Export, first attempt.** "Top right of the dock: 'Export table...' on the Results-panel view,
'Export table as CSV...' on the other table view. Two different labels for what I assume is the
same button. Minor, but I notice it."

"The small dialog on the table page: Rows 'All 300: Nodes, full graph'. Good, it says the count
before I write it, so it is not silently capped. Order: 'pagerank, highest first'. Wait. Order
follows whatever the table is sorted by. On that view it was sorted by PageRank. If I had come in
from a PageRank run I would get a file in PageRank order and might not notice. It is not a control
in the dialog, it is just stated. At least it is stated. And the rank columns are in the file, so
I can re-sort. I would sort by betweenness in the table first anyway."

"The preview. Header: id, module, then 'community (Louvain, weighted, seed 7, full graph)', then
'betweenness (exact, unweighted, full graph)', 'betweenness rank (of 300, exact, unweighted, full
graph)'. Hm. The method is inside the column name. That is honest, but in pandas I now have a
column called 'betweenness rank (of 300, exact, unweighted, full graph)'. I will rename it on line
two of every notebook. And the page itself says the header spelling is 'proposed, not decided'.
If it changes between versions, my notebook breaks. That is a file format, it needs to be pinned."

"The values: 0.13785223783101427. Full double precision, not the 0.1379 on screen. Good. That is
what lets me answer the second half of the question myself."

**5. Export, second look: the big Export dialog.** "Now the Export dialog page says the opposite
of what the table page said. The table page: 'Export table as CSV is the table's one exit' and the
header's Export files 'no longer offers tables'. The Export dialog page: 'Everything that leaves
graphty is written by one Export dialog', three ways in, and Table (.csv) is a checkbox under
Rows. So which is it? And the two write different files. The big one writes plain headers, like
'pagerank (exact, unweighted, normalized to sum 1, full graph)', plus a methods file beside it:
rows, scope, order, data source, 'degree: exact, full graph, not normalized', 'pagerank: exact
(power iteration, damping 0.85) ... normalized to sum to 1', and the graphty-element version. The
small one puts the method in each header and writes no methods file."

"I want the second one. The methods file is exactly the provenance note I would otherwise type by
hand into the notebook. It names the version of the engine. That is what I would attach to a
governance report. But if both of these exist in the product I will get whichever button I clicked,
and the two files will not match. That is the kind of thing that makes me stop trusting exports."

"Also: that methods file, in the example, lists degree and pagerank normalization. For my task I
need the betweenness line. The Results panel Details for the sampled betweenness run shows
'Normalization: divided by (n-1)(n-2)/2'. I assume the exact run writes the same kind of line.
I did not see it drawn for the protein betweenness, so I am assuming."

"Bottom of the dialog: '2 files go to your Downloads folder. Nothing is uploaded.' Good. That is
the first thing I look for on a corporate laptop."

**6. Excel or pandas.** "pandas. read_csv with dtype={'id': str}. I would not open this in Excel
first: gene symbols like SEPT2 or MARCH1 turn into dates in Excel, and long numeric ids lose
digits. The tool cannot fix Excel, but it could say the encoding. Nothing says UTF-8. My labels
have accents and Korean in them."

**7. How sure of the order.** "Here is what I can say, and none of it comes from the tool except
the inputs.

- The ranking itself is exact: every node a source, deterministic. The order in the file is the
  order of the computed values. So I am certain the order is what this algorithm, on this graph,
  undirected, unweighted, produces.
- Whether it is meaningful is a different question, and the tool is right to say it does not
  know. The top five are separated by at least 1.2% of value, the tool says so.
- For ranks 6 to 50 it says nothing. I would compute the gaps myself: df.betweenness.diff() over
  the first 51 rows, and look at the gap between 50 and 51 specifically. If two rows at the cut
  share a rank, the file shows the same rank number twice and I need 51 or 52 rows, not 50.
- Two things I would flag regardless: it ran undirected and unweighted. Confidence exists and was
  not used. On a knowledge graph direction matters; an object property is not symmetric. So I
  trust the order of this computation fully and its fitness for my question much less.

So: confident in the order as computed, down to the full precision in the file. The tool helped me
with ranks 1 to 5 only. For the cut at 50 I had to do the work."

## Single Ease Question

**5 of 7.** Getting a correct, complete, precise file with the real ids was easy once I found
the table. Taking off: no way to ask for 50 rows or to see where the order stops being firm past
rank 5; two export dialogs that write different files; column names I would rename every time.

## Would she use this instead of her current tool?

"No, not instead. For this task my current path is a notebook: networkx betweenness on the
graph I already pulled with SPARQL, sort, head(50), done, and I control directed versus undirected
and the weight. graphty adds a step. Where I would use it is beside the notebook: when the graph is
already open here and someone asks 'who is central', the Results panel answers honestly in one
screen, and the export with the methods file is better provenance than what I write by hand. But
this was the protein demo. It is fine for a demo. It has not seen an IRI yet."

## Problems observed

1. **No top-N and no how-sure past five.** The Results panel stops at five, and the tie sentence
   covers those five only. Nothing says where the order stops being firm at the rank the reader
   cares about (here 50), and the table offers no way to take the first N rows. Severity: medium.
2. **Two table exports that contradict each other.** The table page's own dialog ("the table's one
   exit"; Export files "no longer offers tables") and the Export dialog page ("everything that
   leaves graphty is written by one Export dialog", with Table (.csv) inside it) describe different
   routes, and they write different files: method-in-header columns with no methods file, versus
   plain headers with a methods file beside. Severity: high -- it is a file format.
3. **CSV header names carry the method in parentheses.** Honest, but every downstream script has to
   rename them, and the page says the spelling is not decided. A pinned short column name plus the
   methods file would serve pandas and Excel better. Severity: medium.
4. **Export order silently follows the table's current sort.** It is stated ("Order: pagerank,
   highest first") but not a choice in the dialog; a reader coming from another run gets another
   order. Rank columns in the file make it recoverable. Severity: low.
5. **"1% tie line" is unexplained.** On an exact run the order is not in doubt computationally; the
   1% is a judgment about meaningful difference, and nothing says who set it or why 1%.
   Severity: medium.
6. **"Original id" not demonstrable on this data.** id and name are the same string for proteins, so
   the mocks never show an id that differs from its label (for her, a full IRI). Severity: low for
   the mock, high for her trust.
7. **Encoding not stated** (UTF-8 or not) for the CSV. Severity: low.
8. **Button label differs** between views: "Export table..." and "Export table as CSV...".
   Severity: low.
9. **Betweenness normalization not visible in the table header or the Results summary line**; it
   is only in the run record behind Details. Severity: low.

## What worked

- "Exact: computed on every node, not estimated. It does not say the ranking is meaningful." The
  most correct sentence about centrality she has seen in a tool.
- The dialog states the row count before writing ("All 300"), so nothing is silently capped.
- Full double precision in the file, not the rounded screen values.
- The methods file beside the CSV, with normalization, damping, weight answer and engine version.
- "Nothing is uploaded" at the foot of the Export dialog.
- The first column is the file's own id, stated in the dialog.
