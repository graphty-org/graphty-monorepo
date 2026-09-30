# Session: top 50 by betweenness into pandas, with original ids -- knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (study/personas/knowledge-engineer.md).
Task as given: "Get the top 50 nodes by betweenness into Excel or pandas with their original ids,
and say how sure you are of the order."
Material, in the study view (design notes hidden): the Results panel (finished, and with the table
opened from it), the table dock (ranked state, and the "Getting rows out" page with its Export
dialog), and the Export dialog page (Table chosen, the ways in, and the finished export). Dataset:
the 300-protein interaction network from ppi-core-300.graphml, except the Export dialog page's
Table state, which shows a 3,000-account transfers project.
Renders she looked at: shots/record/r6-ke-top50-results-finished.png, r6-ke-top50-results-in-the-table.png,
r6-ke-top50-table-ranked.png, r6-ke-top50-table-out.png, r6-ke-top50-table-large.png,
r6-ke-top50-export-table.png, r6-ke-top50-export-ways-in.png, r6-ke-top50-export-done.png.

Outcome: done, with some difficulty. The file is right and she would load it. The top-50 cut is
still hers to make in pandas. The "how sure" answer is now mostly readable from the table, which it
was not before, but she has to scroll to rank 50 to read it and the reason for the 1% rule is thin.

## Transcript (thinking aloud)

**1. Results panel.** "Same place as before. Betweenness, Sep 28 09:12. 'On: full graph, 300
nodes, 3 components. Exact. Undirected. WebGPU. Weight: confidence, not used yet.' Good, still the
right order: which betweenness first, number second. Still no normalization on that line. For
betweenness that matters -- raw pair counts or divided by (n-1)(n-2)/2 changes nothing about the
order but everything about whether I can compare it to my networkx run. MAPK1 at 0.1379 looks
normalized. I am guessing."

"Top five, the same numbers. The sentence: 'Every step in the top 5 is over the 1% tie line; the
smallest, ranks 3 and 4, is 1.2%.' Same as last time. Still five. I need fifty."

"Distribution block: 'zero: 10 nodes, all 291='. Oh, that I like. Ten nodes at zero all share rank
291. That is the bottom of the order stated honestly. The tie at the bottom is where most tools
hide the mess. Not my cut, though."

**2. Into the table.** "'295 more in the table.' Dock opens: 'Full graph: 300 nodes. Sorted by
betweenness, highest first; PageRank's columns beside it.' Columns id, module from the file,
degree, betweenness exact full graph, betweenness rank of 300 ties share, PageRank, PageRank rank.
Fine. The rank for UBC is #6 at 0.0579, UBB #7 at 0.0561. I did the ratio in my head: about 3%.
Good."

"Now this is new. In the PageRank rank column some cells say '#6, near #7', '#9, near #10'. And
the other table view has a line over the table: 'Near tie: the next rank's value is within 1%, so
a small change in the data could swap them. \"=\" marks an exact tie.' So the tool now marks, per
row, where the order is soft. That is the thing I asked for. In the betweenness rank column I see
no 'near' in the first ten rows, which I read as: the first ten are all more than 1% apart. EP300
0.0539 against MYC 0.0530 -- 1.7%. Yes, consistent."

"So to answer 'how sure' at the cut I scroll to rank 50 and look at whether it says '#50, near
#51' or '#50=' . That is a real answer from the tool, not from my notebook. I cannot see row 50 in
the render; I am trusting the mark behaves the same way down there."

"The 1%. 'A small change in the data could swap them.' That is at least a reason now, but it is a
hand-wave. Small change in which data? An edge added? For betweenness a single edge can move a
node much more than 1%. 1% of value is a display convention, not a stability test. I would call it
a 'within 1% of the next value' flag and not a claim about the data. And I would want to set the
threshold. I do not see where."

**3. Cutting to fifty.** "Still no 'first 50 rows'. The column menu has 'Filter to...' on a
numeric column. Could I filter betweenness rank to 50 or less? Maybe. But the rank column shows
'#4=' strings. Is rank a number I can filter on, or text? It does not say. And a filter step here
becomes a step in the project, with its own name, feeding the scope line. I am not going to build
a filter just to make a CSV shorter. I take all 300 and head(50). Which I would do anyway: I want
rows 45 to 55 to see the cut."

**4. Export.** "'Export table...' at the top right of the dock. Same label on both table views
this time. Good. It opens the Export dialog with Table (.csv) ticked, and Figures and Findings
report as unticked boxes above and below. 'Rows: All 300: Nodes, full graph.' 'Order: pagerank,
highest first.' 'Columns: 10, hidden ones included.' 'Methods: Always written beside it.' 'The
first column is the file's own id.' File name ppi-core-300-nodes.csv, 'Beside it:
ppi-core-300-nodes-methods.txt'."

"Last round I found two exports that wrote two different files. Now there is one dialog, and it
always writes the methods file. That was my biggest complaint and it is gone. The big Export page
says the same thing: 'The first column is the file's own id, written as it came in. The CSV holds
only the header and the rows.' And the methods file there lists rows, scope, order, data source,
how each column was computed, 'graphty-element 2.6.2'. That is the provenance note I would
otherwise write by hand."

"Order: pagerank, highest first. Hm. This dialog was opened from the view that was sorted by
PageRank. So it follows the table's sort, and it is stated, not chosen. If I had come from the
betweenness view it would say betweenness. The rank column is in the file, so it is recoverable. I
would still rather pick it in the dialog."

"Why is the Export page's Table example a different project? Mule ring suspects, 14 accounts,
riskScore. I was working on proteins. For a mock I understand. But I cannot see the betweenness
line of the methods file for my run. I see degree 'not normalized' and pagerank 'normalized to sum
to 1'. I assume the betweenness line says how it was normalized. Still an assumption, second round
running."

**5. The file in pandas.** "Preview line: 'YWHAZ,Unassigned,6,24,4=,0.06954041304050429,3,...'.
Full precision, good. But '4=' is in the degree rank column. So the rank columns are text. In
pandas that is dtype object: 1, 2, '4=', ... I have to strip the '=' before I can sort or compare.
On screen the '=' is useful. In a file it should be a number, and the tie should be its own column
or left for me to see from equal values. And if 'near #7' goes into the file too, that column is
useless as a number. The preview is cut off at the right so I cannot tell."

"Headers: 'community (Louvain, weighted, seed 7, full ...' and, on the other project,
'pagerank (exact, unweighted, normalized to sum 1, full graph)'. The method is still in the column
name. Now that the methods file is always written beside it, the parentheses are redundant. In a
notebook I rename them on line two, every time. And if the wording changes in a version, my
notebook breaks. Short stable names, method in the methods file."

"read_csv(..., dtype={'id': str}). Still nothing says UTF-8. Proteins are ASCII; my labels are
not. And for Excel: nothing warns that SEPT2 and MARCH1 become dates. I would not open this in
Excel first."

"'2 files go to your Downloads folder. Nothing is uploaded.' Good. After the export the Data panel
lists it under 'Sent and saved' with the date and 'and its methods file'. That is a log of what
left the tool. I like that more than I expected."

**6. Original ids.** "'The file's own id, written as it came in.' For proteins id and name are the
same string, so I still cannot see the difference. On my data the id is an IRI. The sentence is the
right promise. I have not seen it kept on an IRI."

**7. How sure of the order.** "What I can say now:

- The order is exact as computed: every node a source, undirected, unweighted, deterministic. The
  file carries full-precision values, so I can check every gap.
- The tool now tells me, row by row, where two neighbouring ranks are within 1% ('near') or equal
  ('='). The top ten by betweenness carry neither mark, so ranks 1 to 10 are each more than 1%
  apart. For the cut at 50 I would read the mark on row 50. If it says near or equal, I take 51 or
  52 rows and say so.
- What the 1% means is a convention, not a stability measure, and I cannot change it. I would
  report 'within 1% of the next value', not 'could swap'.
- Unchanged caveat: undirected and unweighted, with a confidence column available and unused. I
  trust the order of this computation fully and its fitness for my question less.

So: certain of the order as computed; fairly sure where it is soft, because the table marks it;
the cut at exactly 50 I would still confirm with diff() on the file."

## Single Ease Question

**5 of 7.** Better than last round in the ways that mattered to me: one export, one file shape,
methods always beside it, and the soft spots in the order marked in the table. Not higher because I
still cannot ask for 50 rows, the export order follows whatever the table happened to be sorted by,
the rank columns come out as text with '=' in them, and the headers still need renaming.

## Would she use this instead of her current tool?

"No, not instead. My notebook does betweenness, sort, head(50) in four lines and I pick directed
and weighted myself. But beside it, yes, more than last time: if the graph is already open here,
this export gives me the rows plus a methods file with the engine version, and the near-tie marks
answer the 'how sure' question I usually answer by hand. It is still the protein demo. Show me an
IRI in the id column and I will believe the 'original ids' line."

## Problems observed

1. **Rank columns export as text.** The CSV preview writes '4=' in a rank column, so pandas reads
   the column as strings; if 'near #7' is also written, the column cannot be used as a number at
   all. The screen marks are useful; the file should carry a numeric rank. Severity: medium.
2. **No way to take the first N rows.** Rows is 'All 300'; the only route to 50 is building a
   filter step, and it is not clear whether a rank column can be filtered as a number. Severity:
   medium.
3. **The 1% near-tie rule is a display convention presented as a data claim.** "A small change in
   the data could swap them" is not what a 1% value gap shows for betweenness, and the threshold
   cannot be set. Severity: medium.
4. **Export order is the table's current sort, stated but not chosen.** Coming from a PageRank view
   gives a PageRank-ordered file for a betweenness question. Severity: low (rank columns recover it).
5. **Headers still carry the method in parentheses**, now redundant with the methods file that is
   always written; scripts rename them every time and break if the wording changes. Severity:
   medium.
6. **Betweenness normalization is still not visible** on the Results summary line, in the table
   header, or in any methods file example for a betweenness run. Severity: low.
7. **The Export page's Table example is another project** (transfers, not proteins), so the
   participant never sees the methods file for the run she exported. Severity: low.
8. **Encoding not stated, and no warning about Excel turning gene symbols into dates.**
   Severity: low.
9. **Near-tie marks at rank 50 are not shown in any render**; she trusts they continue down the
   table. Severity: low for the mock.

## What worked

- One Export dialog: the table's Export table... opens it with Table (.csv) chosen, and the methods
  file is always written beside the CSV. Last round's contradiction is gone.
- Per-row near-tie and exact-tie marks in the rank columns ('#6, near #7', '#4='), with a one-line
  legend over the table. The first time a tool has told her where its ranking is soft.
- 'zero: 10 nodes, all 291=' in the distribution: the bottom tie stated plainly.
- 'The first column is the file's own id, written as it came in.'
- Full double precision in the file.
- 'Nothing is uploaded' in the dialog, and the 'Sent and saved' list in the Data panel afterwards.
- 'Exact: computed on every node, not estimated. It does not say the ranking is meaningful.'
