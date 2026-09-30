# Top 50 by betweenness into pandas -- Chris, ML engineer (recommendation systems)

This participant is simulated: a persona played from `study/personas/ml-engineer-recsys.md`.

**Task, as the moderator gave it:** "Get the top 50 nodes by betweenness into Excel or pandas with
their original ids, and say how sure you are of the order."

**Dataset on screen:** Human protein interactions, 300 nodes, 1,262 edges, 3 components
(ppi-core-300.graphml). Not my data; the moderator said it was already loaded and betweenness had
already run.

**Screens seen (renders, 1440 x 900, study view):**
- `shots/record/r6-chris-top50-results-finished.png` -- the Betweenness run in the Results place, info tooltip open
- `shots/record/r6-chris-top50-results-in-the-table.png` -- after clicking "295 more in the table"
- `shots/record/r6-chris-top50-table-ranked.png` -- the table with degree, Louvain, betweenness and PageRank columns
- `shots/record/r6-chris-top50-table-out.png` -- the Export dialog as "Export table..." opens it from that table
- `shots/record/r6-chris-top50-export-table.png` -- the full Export dialog with Table chosen (drawn on a different dataset, a bank case)

---

## Think-aloud

**1. The run.**

> Results is on the left rail now, and the run is called "Betweenness, Sep 28 09:12". Fine, a
> date, not a duration.
>
> Denominator first: "on: full graph, 300 nodes, 3 components. Exact. Undirected. WebGPU." The
> (i) says "Computed on every node, not estimated. It does not say the ranking is meaningful."
> Still the most honest tooltip I have seen in a graph tool.
>
> "Weight: confidence, not used yet. Change..." and further down "Weight: None for this run". So
> unweighted. Same as last time; I will come back to it.
>
> No timing in the header any more. "Details" probably has it. I do not care much for 300 nodes.
>
> Top 5, and "Every step in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is
> 1.2%." Good sentence. Still only about the top 5. I asked for 50.
>
> Distribution: "zero 10 nodes, all 291=". Middle 0.0038. So half the graph is under 0.004 and my
> rank 50 is going to be somewhere in the flat part. That is where the order gets shaky.
>
> Normalized or not? Still not said on this screen. 0.1379 looks like networkx normalization. I
> am guessing again.

**2. "295 more in the table."**

> Only thing that looks like "more rows", click.
>
> "Full graph: 300 nodes. Sorted by betweenness, highest first; PageRank's columns beside it."
> Good. Caret on the betweenness header. Rank column counts 1, 2, 3 ... 10 straight down. That is
> the check I do by eye now after last time: if the rank column does not count up, the table is
> sorted by something else.
>
> id column: MAPK1, TP53... gene symbols. File ids or a label? Can't tell here. I will find out
> in the export.
>
> Values to 4 decimals. UBB 0.0561, EP300 0.0539, MYC 0.0530 -- EP300 and MYC are 1.7% apart, so
> no near-tie mark there, fine. I cannot scroll the mock to rank 40-55, which is the part that
> matters.

**3. The table with three measures.**

> Now somebody has run Louvain and PageRank too. Scope line: "Full graph: 300 nodes, 1 selected.
> Sorted by pagerank, the run that opened the table."
>
> Hang on. I opened this table from the betweenness run. One screen ago it said "Sorted by
> betweenness". Now it says the run that opened it is PageRank. Did I open it from PageRank? No.
> Either somebody reopened it or this line is wrong. Whichever it is, the rows are in PageRank
> order again, and the betweenness rank column reads 1, 2, 3, 4, 5, 7, 9, 8, 10, 6, 15. Same trap
> as last round. The difference is that the line now tells me, in words, which is better than a
> caret. I still caught it from the rank column, not the sentence -- I skim sentences.
>
> The new line above the grid: "Near tie: the next rank's value is within 1%, so a small change in
> the data could swap them. '=' marks an exact tie." That is what I asked for. It covers every
> rank, not just the top 5. PageRank shows "#6, near #7", "#7, near #8", "#9, near #10". The
> betweenness rank column in the rows I can see has none. So if I get to rank 50 and see "#50,
> near #51" I know my cut is soft. That directly answers the "how sure" half of the task, as long
> as it goes all the way down.
>
> Rule check: "within 1%" -- 1% of what? Relative to the higher value, I assume. The line says
> "the next rank's value is within 1%", I read that as relative. Fine.
>
> Degree rank: "#4=" for YWHAZ and AKT1 (both 24), "#7=" for four of them. Standard competition
> ranking. OK.
>
> Click the betweenness header to re-sort. The mock does not show the result, but the note says
> sorting a rank column sorts its score, so either header works.

**4. "Export table..."**

> Top right of the table. Opens the Export dialog with Table (.csv) ticked.
>
> - "Rows: All 300: Nodes, full graph". Not the 1 selected node. Good.
> - "Order: pagerank, highest first". Second warning. If I had not re-sorted, this is the file I
>   would get. For me it is harmless, I sort in pandas anyway. For the marketing person I hand
>   this to, they open it in Excel and take rows 1-50 and it is the wrong list. There is still no
>   "Order: betweenness" picker right here and still no "top N".
> - "Methods: Always written beside it", "Beside it: ppi-core-300-nodes-methods.txt". Last round
>   I could not tell if the table route wrote the methods file. Now it says so. Good.
> - "The first column is the file's own id." Answers step 2.
>
> The preview is cut off with "..." at the right edge in this small dialog. Earlier text says the
> full header is `"betweenness (exact, unweighted, full graph)"` and `"betweenness rank (of 300,
> exact, unweighted, full graph)"`. Long, but the method travels with the file. I rename on line 2.
>
> Now the rank column. YWHAZ's degree rank is written as `4=`. Last round I asked for the tie
> marker to survive into the file, and it does. But think about what pandas does with that:
>
> ```python
> df = pd.read_csv("ppi-core-300-nodes.csv")
> df["degree rank (of 300, full graph)"].dtype   # object, because of "4="
> ```
>
> One "=" anywhere and the whole column is strings. `sort_values` on it gives 1, 10, 100, 101 ...
> 2. In Excel the "4=" cells are text and sort after or before the numbers depending on version.
> And the note says the CSV writes the rank "as shown" -- if that includes "6, near 7" for the
> near ties, the pagerank rank column is strings too. So the thing that makes the rank honest also
> makes it unsortable. I would never sort by the rank column; I sort by the float. But a less
> paranoid colleague would, and get a lexicographic order with no error. I would want the rank as
> an integer and the tie and near-tie as their own columns (`betweenness tie` = exact / near / "").
>
> Does the methods file say whether betweenness is normalized? The big dialog, drawn on the bank
> data, shows a methods file that says "pagerank: exact ... normalized to sum to 1" and "degree:
> exact, full graph, not normalized". So the file probably says it for betweenness too. I have
> still never seen it on a protein screen. I would open the .txt before quoting a number.
>
> "2 files go to your Downloads folder. Nothing is uploaded." Local only. That is what my privacy
> review needs to hear.

**5. In pandas.**

```python
df = pd.read_csv("ppi-core-300-nodes.csv")
b = next(c for c in df.columns if c.startswith("betweenness (exact"))
top = df.sort_values(b, ascending=False).head(55)[["id", b]]
top["gap_to_next"] = top[b] / top[b].shift(-1) - 1
top.iloc[45:55]
```

> Same as last round: take 55, look at the gap around 50/51. The difference is that the app now
> would have told me the answer in the rank column before I wrote this. I would still write it,
> because I do not trust a mark I cannot scroll to in a mock.

**6. How sure am I of the order?**

> - Values: sure. Exact, all 300, full-precision floats in the file.
> - Top 5: sure; the panel says every gap is over 1%.
> - Ranks 6 to 50: now the app marks every place where the next value is within 1%. If there is no
>   "near" between rank 50 and 51, the top 50 is a clean cut. If there is, I report "top 50, with
>   rank 50 and 51 interchangeable". That is a real answer instead of "I checked it myself".
> - What the near-tie mark does not cover: it says the numbers are close, not whether the
>   ordering is stable. And it is unweighted. The file has confidence weights on the edges and this
>   run ignored them. I would re-run weighted and compare the two top-50 lists before anyone
>   quotes it.
> - The scare is the same as last round: the ranked table opened in PageRank order, with a line
>   that claims PageRank opened it when I opened it from betweenness. And the export writes
>   whatever order the table is in.

---

## Single Ease Question

**5 / 7.** The near-tie marks on every rank, the "=" in the file and the methods file on the
table route are exactly what I asked for last time, and they answer the "how sure" half. What
kept it at 5: the three-measure table was in PageRank order again, now with a scope line saying
PageRank opened it when I had come from betweenness; the export follows that order and still has
no "top N by this column"; and the tie marks turn the rank columns into text, which sorts wrong in
pandas and Excel without any error.

## Would I use this instead of my current tool?

**Not for this task.** For 300 nodes it is still `nx.betweenness_centrality` and a sort, and I
choose the normalization myself. But the near-tie column is something I would not bother to write
in the notebook, and it is the part a reviewer asks about. If the export let me pick "top 50 by
betweenness", kept the rank as a number with the tie marks in their own column, and never
inherited a sort from another measure, I would send non-coders on my team here for these lists
instead of sending them my notebook, because then they could not get the order wrong.
