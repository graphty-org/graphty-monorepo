# Top 50 by betweenness into pandas -- Chris, ML engineer (recommendation systems)

**Task, as the moderator gave it:** "Get the top 50 nodes by betweenness into Excel or pandas with
their original ids, and say how sure you are of the order."

**Dataset on screen:** Human protein interactions, 300 nodes (ppi-core-300.graphml). Not my data;
the moderator said the import had already been done.

**Screens seen (renders, 1440 x 900, study view):**
- `shots/tasks/top-50-to-excel/01-results-panel-finished.png` -- the Betweenness result in the right panel
- `shots/tasks/top-50-to-excel/02-results-panel-in-the-table.png` -- after "295 more in the table"
- `shots/tasks/top-50-to-excel/03-table-dock-ranked.png` -- the table with three measures ranked
- `tmp/chris-top50/table-out.png` -- the "Export table as CSV" popover from the table
- `tmp/chris-top50/export-table.png` -- the full Export dialog with the Table row ticked (drawn on a different dataset)

---

## Think-aloud

**1. The result panel.**

> OK, betweenness already ran. First thing I read is the header line: "on: full graph, 300 nodes,
> 3 components. Exact. Undirected. WebGPU." Good, that is the denominator, and it says exact, not
> sampled. Hovering the little (i): "Computed on every node, not estimated. It does not say the
> ranking is meaningful." Ha. Fair. I like that it says that.
>
> "Weight: confidence, not used yet." So the file has an edge weight and this run ignored it. Fine
> for now, but that is the first thing a reviewer would ask me. Noted.
>
> Timing: "Run 1, 1.2 s". A real number instead of a GPU badge. For 300 nodes that is not
> impressive -- networkx does this in well under a second -- but at least it is honest.
>
> Top nodes: MAPK1 0.1379, TP53 0.1139, YWHAZ 0.0695, CDK1 0.0687, AKT1 0.0642. And then "Every
> step in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%." OK, that is
> exactly the kind of sentence I want. But it is about the top 5. I asked about the top 50. Ranks 3
> and 4 are already only 1.2% apart; what happens around rank 40-55 where these things usually
> flatten out? Nothing here says.
>
> Distribution: "zero 10 nodes, all 291=". Good, ties at zero share a rank. So the tail is flat,
> which means my rank 50 might be sitting in a crowd.
>
> Is it normalized? 0.1379 for the top node looks like networkx's default normalization, divided
> by (n-1)(n-2)/2. It does not say. I would guess yes.

**2. "295 more in the table."**

> That is the only thing that looks like "get me more rows", so I click it.

> Table opens under the canvas. "Full graph: 300 nodes. Sorted by betweenness, highest first;
> PageRank's columns beside it." Good -- sorted the way I want without me touching it. Columns:
> id, module, degree, betweenness (exact, full graph), betweenness rank (of 300, ties share),
> PageRank, PageRank rank. "ties share" -- so equal values get the same rank. That is standard
> competition ranking, fine.
>
> id column is MAPK1, TP53... Are those the file's node ids or a label attribute? For a PPI file
> they could be either. I cannot tell from this screen. In my own data this would matter a lot --
> user_ids are integers and I do not want them turned into "Node 1234".
>
> Values are shown to 4 decimals. At the top that is fine. Around rank 50 I would expect values
> like 0.00xx and four decimals will make distinct values look equal. I would not trust the
> screen for order down there; I want the full floats.

**3. The ranked table (three measures).**

> Different state -- somebody ran Louvain and PageRank too. There is a nice line: "MAPK1 and TP53
> are the top 2 on all three measures. At #3 they part..." Cool, but not my question.
>
> Wait. The rows here go MAPK1, TP53, YWHAZ, CDK1, AKT1, UBB, MYC, EP300, HSP90AA1. Betweenness
> rank column reads 1, 2, 3, 4, 5, 7, 9, 8, 10. That is not betweenness order. Where is UBC, #6?
> ... The little caret is on the pagerank header. It is sorted by pagerank. The two orderings agree
> for the first five, so at a glance you think it is sorted by betweenness. If I had exported from
> this view and taken the first 50 rows in Excel I would have got the top 50 by PageRank. That is
> exactly the silent-wrong-answer kind of thing I hate.
>
> Fine, click the betweenness header. It says descending on first click. Good.
>
> The scope line says "Full graph: 300 nodes, 1 selected". One node selected (TP53). Does the
> export take just the selection? Let me look.

**4. "Export table as CSV..."**

> Top right of the table, "Export table as CSV...". The popover:
> - Rows: "All 300: Nodes, full graph" -- so not the selection. Good. But there is no "top 50" or
>   "first N rows". I get all 300 and cut it myself. For me that is actually fine,
>   `df.nsmallest(50, rank)` or `head(50)`. For someone in Excel it is one more step, and they will
>   cut by row position, which is the thing that just bit me in step 3.
> - Order: "pagerank, highest first". There it is again -- the export follows the table sort. It
>   told me, at least. If I had not caught it in the table, this line is my second chance. I would
>   have skimmed past it, honestly. It is small grey-ish text next to "Rows".
> - Columns: "10, hidden ones included".
> - "The first column is the file's own id." OK, that answers my step 2 question. Original ids.
>
> The CSV preview:
> ```
> id,module,"community (Louvain, weighted, seed 7, full graph)",degree (full graph),...
> MAPK1,MAPK signaling,5,34,1,0.13785223783101427,1,0.011825221838590017,1,-0.52
> ```
> Full-precision floats. Good -- that is what I need to decide the order myself.
>
> Column names are long, with commas and parentheses inside quotes: `"betweenness (exact,
> unweighted, full graph)"`. pandas reads that fine, but I will rename it to `betweenness` on line
> two of my notebook. I do like that the method is in the header, because the CSV will outlive
> the app and in three weeks nobody will remember it was unweighted.
>
> The rank columns: YWHAZ row says degree rank `4`. In the table that was `#4=` -- tied with AKT1.
> In the CSV the `=` is gone. So from the file alone I cannot tell a tied 4 from a clean 4 without
> comparing the values. I will compare the values anyway, but the header should say what kind of
> rank this is -- the table header said "ties share", the CSV header just says "of 300".
>
> File name "ppi-core-300-nodes.csv", Export. It says nothing is uploaded, files go to Downloads.
> Local-only is the right answer; I would ask about it otherwise.
>
> The big Export dialog (the one drawn on the bank data) also writes a methods text file beside
> the CSV with "exact... unweighted, normalized to sum to 1" for PageRank. That is good. Does the
> quick popover from the table write that too? The popover does not say. And for betweenness, I
> never saw the word "normalized" anywhere on these screens.

**5. In pandas (what I would do next).**

```python
df = pd.read_csv("ppi-core-300-nodes.csv")
b = [c for c in df.columns if c.startswith("betweenness (")][0]
top = df.sort_values(b, ascending=False).head(55)
top["gap_to_next"] = top[b].pct_change(-1)   # relative gap to the next rank
```

> I take 55, not 50, to see whether rank 50 and 51 are separable. That is the check the app did
> for me on the top 5 and did not do for the rest.

**6. How sure am I of the order?**

> - The values: sure. Exact, all 300 nodes, not sampled, and I have full-precision floats.
> - Top 5: sure, the app told me every gap is over 1%.
> - Ranks 6 to 50: the order is reproducible, but I cannot say how meaningful it is from the
>   app. It never told me where the near-ties are below rank 5, and the 4-decimal display hides
>   them. I would say "exact computation; the top 5 are clearly separated; below that I checked the
>   gaps myself in pandas". If the gap at 50/51 is under 1%, the "top 50" is really "top 49 or 51".
> - The bigger doubt is not numerical: it ignored the confidence weights. The unweighted order
>   and the weighted order can differ a lot. I would run it again weighted and compare before
>   anyone quotes this list.
> - And one scare: if I had exported from the three-measure view, the file would have been in
>   PageRank order. The app did write "Order: pagerank" in the popover, so it was not hiding it,
>   but I only caught it because the rank column did not count 1, 2, 3.

---

## Single Ease Question

**5 / 7.** Getting the rows out with original ids and full floats was easy and the headers carry
the method. What cost me: the table in one state was sorted by a different measure than the one I
asked about, there is no "top N" in the export, the rank column loses its tie marker in the file,
and the "how sure" part only covers the top 5.

## Would I use this instead of my current tool?

**No, not for this.** On 300 nodes this is three lines of networkx and I get the order, the ties
and the normalization flag I chose myself. Where I would open this is the step before: seeing that
the result panel says exact, unweighted, 3 components, and the 1% tie line on the top ranks,
without writing it. If the tie line covered the whole top N I asked for, and the export had a
"top N by this column" option with the methods file beside it, I would use it to hand a list to a
non-coder on my team, because then they cannot get the order wrong by sorting the wrong column.
