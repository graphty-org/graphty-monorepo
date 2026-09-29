# Session: top 50 by betweenness into Excel or pandas -- Expert Emma

**Participant:** Expert Emma, network scientist, lives in notebooks (networkx, igraph, pandas),
uses Gephi for the final figure. See ../../personas/expert-emma.md.

**Task, as the moderator gave it:** "Get the top 50 nodes by betweenness into Excel or pandas with
their original ids, and say how sure you are of the order."

**Screens, in order:** the finished betweenness result on the protein network
(screens/results-panel.html, finished), "295 more in the table" opened into the Nodes tab
(screens/results-panel.html, in the table), the ranked Nodes tab with every run's columns
(screens/table-dock.html, ranked), what "Export table as CSV..." opens (screens/table-dock.html, the
export dialog drawn beside the frame), and the header Export dialog (screens/export-dialog.html,
opening view and the Table choice).

**Renders she saw:** shots/tasks/top-50-to-excel/01-results-panel-finished.png,
shots/tasks/top-50-to-excel/02-results-panel-in-the-table.png,
shots/tasks/top-50-to-excel/03-table-dock-ranked.png, shots/r4-emma-top50-table-dock-full.png (the
CSV export dialog, lower part of the page), shots/r4-emma-top50-export.png,
shots/r4-emma-top50-export-table.png.

---

## Think-aloud transcript

**Reading the task.** Top 50 by betweenness, original ids, into pandas. In a notebook this is
`pd.Series(nx.betweenness_centrality(G)).nlargest(50)` and I'm done in four seconds. So what I'm
actually testing is: does the number I get out of here mean the same thing as the number networkx
would give me, is the id the id from the file and not some display label, and does the file tell
me enough that I can put it in a methods section without opening this app again. "How sure of the
order" -- two different questions hiding in there. One: is the arithmetic exact, or sampled, or
single precision. Two: is the ordering robust, i.e. would it survive a slightly different edge set.
The tool can answer the first. Nobody can answer the second from one run.

**The finished result.** (results-panel, finished.) Right side: "on: full graph, 300 nodes, 3
components". "Exact", with a tooltip already open: "Computed on every node, not estimated. It does
not say the ranking is meaningful." Ha. OK, somebody here has sat through a review. I like that
sentence a lot; it's the thing I end up saying to clients out loud. "Undirected. WebGPU." Then
"Weight: confidence, not used yet. Change..." Good -- so this is unweighted betweenness and it tells
me there's a weight column it did not use. That's the first thing I check, and it's answered before
I asked.

What's missing on this line is normalization. MAPK1 is 0.1379, so it's normalized by something --
raw betweenness on 300 nodes would be in the thousands. Divided by what? (n-1)(n-2)/2, like networkx
undirected? And n is 300 or 298? There are 3 components -- the histogram says 10 nodes at zero, and I
can see two stray dots on the canvas -- so the choice of n matters a little. There's a "Details"
link. I'd click it. (Reading what it does: it opens a run record with method, seed, damping,
normalization and weight conversion, and a Copy button. In the other betweenness states the
normalization row reads "Divided by (n-1)(n-2)/2, the node pairs of an undirected graph; n = ...".
The run record for this protein run isn't drawn, but if it says n = 300 then it matches networkx's
`normalized=True` for undirected, and igraph's too. Fine. I'd still check it. I'd have liked the
word "normalized" on the main line though, not one click away. This is the single most common reason
two tools disagree on betweenness.)

Sanity check in my head: 0.1379 times 299*298/2, that's about 44,500 pairs, so MAPK1 sits on roughly
6,100 pair-shortest-paths' worth. On 1,262 edges with a hub of degree 34, plausible.

"Top nodes": MAPK1, TP53, YWHAZ, CDK1, AKT1. Then: "Every step in the top 5 is over the 1% tie line;
the smallest, ranks 3 and 4, is 1.2%." Let me check: 0.0695 minus 0.0687 is 0.0008, over 0.0687 is
1.16%. Right. So the tool is telling me gaps as relative differences. OK. It's a nice idea but I
don't know where 1% comes from. For an exact computation any difference is real arithmetic; a 1%
line is a statement about... what? Floating point? Robustness? It doesn't say. And it's the top 5.
My task is the top 50. Ranks 3 and 4 at 1.2% is already close enough that I'd flag it, and down at
rank 30-50 the values are going to be packed much tighter -- the "middle" is 0.0038 and the
distribution is a spike near zero. So the one sentence that addresses my question stops exactly
where my question gets interesting.

"WebGPU." Now I'm wondering. GPU code is usually float32. Brandes accumulation in single precision
on 300 nodes is probably fine, but for near-ties at rank 40 I'd want to know whether "exact" means
"exact algorithm, float32" or "exact algorithm, float64". The tooltip says "not estimated", which is
about sampling, not precision. I'll look at the export to see what comes out.

**"295 more in the table".** (results-panel, in the table.) Opens the Nodes tab under the canvas:
"Full graph: 300 nodes. Sorted by betweenness, highest first; PageRank's columns beside it." Columns
id, module, degree, betweenness ("exact, full graph"), betweenness rank ("of 300, ties share"),
PageRank, PageRank rank. Good: the rank column says ties share a rank, so if two values are equal
I'd see "#7=" style. I can see down to HSP90AA1 at #10. I can't see 11 to 50 in this picture, so I
can't tell you if there are ties down there. I'd have to scroll; in real life I'd skip that and
export.

The header here says "exact, full graph". Where did "unweighted" go? The run said "Weight: None for
this run". Small, but that's the column header that ends up in my file, so it matters.

There's "Export table..." top right of the table.

**The ranked table.** (table-dock, ranked.) This is the same Nodes tab but it looks different:
grouped headers now, "Betweenness exact, unweighted, full graph", "PageRank damping 0.85,
unweighted, full graph", a Louvain community column, little histograms. Fine, better. The id column
says "300 values" -- so ids are unique, good, that's a quick check I'd do anyway.

Wait. The order. MAPK1, TP53, YWHAZ, CDK1, AKT1, UBB, MYC, EP300, HSP90AA1. Where's UBC? In the
previous view UBC was #6 by betweenness. And MYC is above EP300 here though its betweenness rank is
#9 and EP300's is #8. Look at the headers -- the little arrow is on "pagerank". This table is sorted
by PageRank, not betweenness. UBC is PageRank #10, it's just below the fold. Nothing at the top says
"sorted by"; the other view did say it in words. If I hadn't compared the rank column I'd have
exported and called this the betweenness top 10. That's exactly the kind of mistake a junior
analyst makes and then it's in a slide.

Fine. I'd click the "betweenness" header to sort by it. Nothing tells me whether the first click
sorts descending or ascending; I'll assume descending because the other column did.

**Export.** Here the button says "Export table as CSV..." -- in the other view it said "Export
table...". Same thing? I assume so. (Reading what it opens: a small dialog. "Rows: All 300: Nodes,
full graph. Order: pagerank, highest first. Columns: 10, hidden ones included. The first column is
the file's own id." Then a preview of the first lines, and a file name ppi-core-300-nodes.csv.)

OK, this is actually good:

- All 300 rows. There's no "top 50" option and I don't want one. I'll `nlargest(50)` myself; I'd
  rather have every row than trust a cut-off someone else chose. The dialog says the count, so I'm
  not wondering whether it's silently capped at 100 or whatever.
- "The first column is the file's own id." That's the answer to "original ids". It's said in the
  export dialog, not in the table. In the table the column is just "id". For this file the id is the
  gene symbol, so I can't tell by looking whether it's the GraphML `id` attribute or a label that
  happens to match. I'll take the sentence at its word, but I'd check one node against the XML.
- The preview: `0.13785223783101427` -- full double precision, not the four-decimals display value.
  Good. That also mostly answers my float32 question: those digits aren't a float32 rounded
  value... well, a float32 cast to double prints something like 0.137852236628532, which is
  different, but honestly I can't tell from 17 digits which one I'm looking at without the source.
  I'd want the run record to say "float64" or "float32". I'll check against networkx anyway.
- The header: `"betweenness (exact, unweighted, full graph)"`,
  `"betweenness rank (of 300, exact, unweighted, full graph)"`. Long, quoted, has commas and
  parentheses. pandas reads it fine with the quoting. I'll rename the columns on the first line of
  code, but I'd rather have it long and honest than short and ambiguous. Still no normalization in
  the header.
- Order: "pagerank, highest first" -- because I pressed Export while the table was sorted by
  PageRank. So the file follows the table's sort. If I hadn't re-sorted, the file would come out in
  PageRank order with a betweenness rank column. For pandas, irrelevant; I sort anyway. For someone
  opening it in Excel and taking the top 50 rows by eye: wrong list. The dialog does say it, to be
  fair.
- The rank column: in the table YWHAZ's degree rank was "#4=" (tied with AKT1). In the CSV it's
  just `4`. So the "=" -- the only tie flag -- doesn't survive into the file. For betweenness I can
  recompute ties from the full values, so it's not fatal for me. For an Excel user it's lost.

What I did not see: does this write the methods file? The header Export dialog (the one from
"Export..." on the Data side) has a Table (.csv) choice with "Methods: Always written beside it",
and that methods text is exactly what I want -- in that example it says "degree: exact, full graph,
not normalized" and "pagerank: exact (power iteration, damping 0.85), full graph, unweighted,
normalized to sum 1", plus the graphty-element version. That's a methods section. But the
"Export table as CSV..." dialog I actually used shows one file name and nothing about a methods
file. So from the table, do I get it or not? I can't tell. And the big Export dialog I looked at was
for a different project -- a mule ring with accounts -- and another one for "Stress response study",
while my data is "Human protein interactions". I had to stop and check that I hadn't loaded the
wrong thing. (Same numbers, 300 proteins, 1,262 interactions -- so it's the same file with a
different project name.)

Also, Excel. If the biologist opens this CSV by double-clicking it, Excel will do its thing to gene
symbols -- SEPT7 becomes a date, MARCH1 becomes a date. This set might not have any, but there's no
.xlsx option and nothing that protects the id column. For pandas it doesn't matter. The task said
"Excel or pandas", so I'm going with pandas.

**Result.**
```
df = pd.read_csv("ppi-core-300-nodes.csv")
top50 = df.nlargest(50, "betweenness (exact, unweighted, full graph)")
```
Ids are the file's ids, per the dialog. 300 rows in, 50 out.

**How sure am I of the order?** Of the arithmetic: fairly sure. It says exact, the file has full
precision, the run record (one click) states the normalization, and the value for MAPK1 is the kind
of number networkx gives. I'd confirm with one `nx.betweenness_centrality(G)` call and a Spearman
correlation, which takes a minute, and until I've done that I'd say "probably identical". What I
don't know: float32 or float64, and whether n in the normalization is 300 or 298 -- neither changes
the order, but the second changes every value.

Of the order as a finding: ranks 1 and 2 are clear. 3 and 4 are 1.2% apart, which I'd call a tie in
anything I wrote. Beyond 5 the tool says nothing, and I couldn't see ranks 11 to 50 on these
screens at all, so I can't tell you whether 40 and 41 are 0.1% apart. More to the point, the edges
have a confidence column that this run ignored. The honest answer is: the top two are robust, the
rest of the top 10 is a cluster, and for 11 to 50 I'd bootstrap edges by confidence and report rank
intervals. The tool doesn't do that. I didn't expect it to. It did at least say "it does not say
the ranking is meaningful", which is more than most tools manage.

---

## Single Ease Question

**5 of 7.** Getting the file with ids was easy and the export dialog says clearly what it will write:
all 300 rows, the file's own ids, full-precision values, the run's method and scope in the header.
What cost me: the ranked table was silently sorted by PageRank and nothing but a tiny arrow said so;
two different export buttons with two names and I don't know which one writes the methods file;
normalization isn't in the header or on the result line; and the tie statement stops at rank 5 when
I asked about 50.

## Would she use this instead of her current tool?

"For this task, no. It's one line in the notebook and I'd get the same file with fewer questions.
But I don't see it as instead. If I'd already opened the network here to make the figure for the
biologist, then yes, I'd export from here rather than recompute -- because the header says exact,
unweighted, full graph, and the methods file, if I get it, is a paragraph I don't have to write.
What would make me trust it outright: normalization and precision written in the file, the tie flag
kept in the CSV, and a way to check it against networkx without clicking -- I still want to call this
from the notebook, not export from it."

---

## Problems found

1. **The ranked table is sorted by PageRank and only a small arrow says so.** (table-dock, ranked.)
   The previous view said "Sorted by betweenness, highest first" in words; this one has no scope
   line for the sort. The top rows look like the betweenness top 10 but UBC (betweenness #6) is
   missing and MYC and EP300 are swapped. Exporting from here writes PageRank order. Severity 3.
2. **Normalization is not on the result line or in the CSV header.** (results-panel, finished;
   table-dock export dialog.) It is one click away in the run record, but the file carries only
   "exact, unweighted, full graph". Betweenness normalization is the most common cause of
   tool-to-tool disagreement. With 3 components, whether n is 300 or 298 is not stated where she
   looked. Severity 3.
3. **Two export routes, two labels, and only one says it writes the methods file.**
   (results-panel, in the table: "Export table..."; table-dock: "Export table as CSV..."; the header
   Export dialog: "Methods: Always written beside it".) The table's own export dialog shows a single
   file name and says nothing about the methods text. Severity 3.
4. **The tie statement covers the top 5 only, and the 1% line is unexplained.** (results-panel,
   finished.) For a top-50 request there is no statement about ranks 6 to 50, and "1% tie line" does
   not say what it protects against. Severity 2.
5. **The tie flag is dropped in the CSV.** (table-dock export preview.) "#4=" in the table becomes a
   plain `4` in the file, so an Excel reader cannot see ties. Severity 2.
6. **"Exact" says nothing about numeric precision.** (results-panel, finished.) Run on WebGPU; she
   cannot tell whether values are float32 or float64, which matters for near-ties deep in the list.
   Severity 2.
7. **Column header drops "unweighted" in one view.** (results-panel, in the table: "exact, full
   graph"; table-dock: "exact, unweighted, full graph".) The same column is named two ways. Severity 1.
8. **"The file's own id" is only said inside the export dialog.** (table-dock.) The table's column is
   just "id"; for gene-symbol ids she cannot tell a file id from a label by looking. Severity 1.
9. **No Excel-safe option.** (table-dock export.) CSV only; gene symbols such as SEPT or MARCH
   families are turned into dates when a collaborator double-clicks the file. Severity 1.
10. **Project name changes between screens.** ("Human protein interactions" vs "Stress response
    study", and the Export dialog shown for a mule-ring case.) She stopped to check it was the same
    data. Severity 1.
11. **Ranks 11 to 50 are never visible on these screens.** (table-dock, ranked; results-panel, in
    the table.) She could not judge ties in the range she was asked about without exporting.
    Severity 1.

## What she liked

- "Exact: computed on every node, not estimated. It does not say the ranking is meaningful."
- "Weight: confidence, not used yet" -- the unused weight column named before she asked.
- The export dialog states the row count ("All 300"), so nobody wonders whether it is capped.
- "The first column is the file's own id."
- Full double-precision values in the file, not the rounded display values.
- Column headers that carry method and scope, and a rank column that says "ties share".
- The methods text in the header Export dialog, with normalization and the graphty-element version:
  a methods paragraph she would not have to write.
