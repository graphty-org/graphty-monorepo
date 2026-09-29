# Session: top 50 by betweenness into Excel -- Analyst Alex

**Participant:** Analyst Alex, data analyst in logistics operations; computes metrics in NetworkX,
draws in Gephi, hands tables over in Excel.

**Task, as the moderator gave it:** "Get the top 50 nodes by betweenness into Excel or pandas with
their original ids, and say how sure you are of the order."

**Screens seen, in order (as the participant sees them, design notes hidden):**

1. The Results panel after Betweenness finished on the human protein network (300 proteins)
2. The same app with the table open under the graph, sorted by betweenness
3. The table after more runs (degree, Louvain, PageRank), and the "Export table as CSV" dialog

**Outcome:** done, with some detours. Single Ease Question: 5 of 7.

---

## Think-aloud transcript

### Screen 1 -- the Results panel

> OK. Human protein interactions. Not my world, but a graph is a graph. First thing -- counts.
> Top right, 300 nodes, 1,262 edges, 3 components. Fine, I'll take that.
>
> Betweenness is already run, there's a panel open. "on: full graph, 300 nodes, 3 components.
> Exact. Unweighted, undirected. WebGPU." Good. That's the line I want before I look at any
> number. Exact means it didn't sample. There's a little popup on "Exact": "Computed on every node,
> not estimated. It does not say the ranking is meaningful." ... Bit of a weird thing to tell me.
> I know it doesn't mean it's meaningful. But fine, I guess that's for my director.
>
> Top nodes. 1 MAPK1 0.1379, 2 TP53 0.1139, 3 YWHAZ 0.0695, 4 CDK1 0.0687 ... and it's cut off. I
> need 50, not 4. Let me scroll the panel.

*(Scrolls the panel.)*

> AKT1 at 5. Then: "No near-ties in the top 5: the closest, ranks 3 and 4, differ by 1.2%." OK,
> that's actually useful. That's the sentence I'd paste. But it's the top 5. I was asked for 50.
> What about 30 and 31? It doesn't say.
>
> "295 more in the table." That's probably my way out. But first -- the blue button up top says
> "Export files...". That's where I'd normally go. Let me try that.

*(Clicks "Export files..." in the top right.)*

> Nothing I can see. Hm. There's also "Export" with a plus in the right panel. I don't know what the
> plus adds. I'm not going to guess -- I'll go through the table, that's the table I want anyway.
>
> Also, "Details" next to WebGPU. I want to know if this is normalized the way NetworkX does it,
> because if my 0.1379 comes out 0.07 in Python I'm not using it.

*(Clicks "Details".)*

> ... nothing opens. OK. So I don't actually know the normalization. Park that.

*(Clicks "295 more in the table".)*

### Screen 2 -- the table, sorted by betweenness

> Right, so the table slid up under the graph. "Full graph: 300 nodes. Sorted by betweenness,
> highest first; PageRank's columns beside it." That's the sentence I wanted. It says the scope and
> the sort. Nobody has to wonder.
>
> Columns: id, module, degree, betweenness "exact, full graph", betweenness rank "of 300, ties
> share", PageRank, PageRank rank. MAPK1 #1, TP53 #2, YWHAZ #3 ... HSP90AA1 #10. And UBC is #6 on
> betweenness but #10 on PageRank, fine, I can read that straight across the row. That's better than
> Gephi's Data Laboratory, where I'd have to sort twice and write it down.
>
> "Ties share" -- so if two are equal they get the same number. Good. That's the rule I'd want and
> I usually have to do it myself in pandas with rank(method="min").
>
> Now, 50. I can see ten rows here. The values are four decimals. 0.0539 and 0.0530 at 8 and 9 --
> fine, those are different. But further down the middle value was 0.0038 in the panel. Down there
> four decimals is going to make things look tied that aren't, or look different when they're
> basically the same. I can't tell from this. I'd want the raw numbers.
>
> There's "Export table as CSV..." on the right of the tabs. That's the button. Clicking.

### Screen 3 -- the dialog, and the table it was opened from

> Wait, the table changed. Now it's got Louvain, degree rank, betweenness, PageRank -- and the
> little arrow's on pagerank. Is it sorted by PageRank now? The order is MAPK1, TP53, YWHAZ, CDK1,
> AKT1, UBB, MYC ... UBB is #7 on betweenness and it's sixth in the list. So yes, this is PageRank
> order. I didn't ask for that. I guess because PageRank was run last? Whatever -- I'll sort in
> Excel. But if I'd sent this straight to someone, the rows would be in the wrong order for the
> question.
>
> There's a line on top: "MAPK1 and TP53 are the top 2 on all three measures. At #3 they part:
> CDK1 by degree, YWHAZ by betweenness and pagerank." That's the sentence my director actually
> wants. I'd steal that.
>
> The dialog.
> "Rows: All 300: Nodes, full graph." OK -- no top-50 option. That's fine honestly, I'd rather have
> all 300 and cut it myself. At least it tells me it's all 300 and not some capped number.
> "Order: pagerank, highest first." Yeah, see. Pagerank. I wanted betweenness. There's no way to
> change it here that I can see. I'd have to cancel, click the betweenness header, and export again.
> Or just sort in Excel. I'll sort in Excel.
> "Columns: 10, hidden ones included." Good, it's not dropping stuff.
> "The first column is the file's own id." That's the question I was asked -- original ids.
> Great, it says so.
>
> The preview: `id,module,"community (Louvain, weighted, seed 7, full graph)",...` and
> `"betweenness (exact, unweighted, full graph)"`, `"betweenness rank (of 300, exact, unweighted,
> full graph)"`. OK. It's honest. It's also going to be a pain in pandas --
> `df["betweenness rank (of 300, exact, unweighted, full graph)"]`, nobody's typing that. I'll
> rename on the first line. In Excel it's just a long header, that's fine, people can read it.
>
> And the values are full precision: 0.13785223783101427. Good. That's what I need to check ties
> myself. Ranks are whole numbers. File name ppi-core-300-nodes.csv. Export.

*(Clicks Export.)*

> Then in pandas: read_csv, sort by the betweenness column descending, head(50). Two lines. Or in
> Excel, sort, top 50 rows. Done.

### "How sure are you of the order?"

> Of the order itself -- it's exact, not sampled, so if I run it again I get the same list. That's
> the part I care about for the deck. Top 5, the tool says, no near-ties, closest is 1.2%. Ties
> share a rank, so anything showing the same rank number really is equal. Beyond the top 5 the
> tool didn't tell me anything, so for places 6 to 50 I'd check the gaps myself from the full
> values in the CSV -- and my guess is somewhere in the 30s and 40s there are a few that are within
> a hair of each other and I'd call those "about the same". What I'm NOT sure of yet is whether
> these numbers are the same as NetworkX's, because Details didn't open and I couldn't see the
> normalization. Until I've run it once in NetworkX and it matches, I'd put a footnote on it.

---

## After the task

**Single Ease Question:** 5 of 7.

> "Longest bit was figuring out where export was -- the big blue Export button didn't do it, and
> the real one is down on the table. And then the export came out in PageRank order. Everything else
> was quick."

**Would you use this instead of your current tool?**

> "For this job -- get a ranked list out with the right ids -- probably, yeah. It's quicker than
> NetworkX-then-Gephi, and the headers say exactly what was run, which is more than my notebook
> does half the time. The 'ties share' ranks and the 'top 2 on all three measures' line are things
> I currently do by hand. But I'd run it side by side with NetworkX the first time. If the numbers
> match, I'm in. If they don't, I'm back in Python."

---

## Problems observed

| Screen | What happened | Severity (1-4) |
| --- | --- | --- |
| Results panel | The near-tie sentence covers only the top 5; nothing says how firm ranks 6 to 50 are, which was half the task | 3 |
| Results panel | "Export files..." is the obvious export button but does not lead to a table; the CSV route is only reachable through "295 more in the table", below the fold | 2 |
| Results panel | "Details" did nothing, so the normalization (does 0.1379 match NetworkX?) could not be checked | 2 |
| Table after more runs, and the export dialog | The table came back sorted by PageRank, not betweenness, and the dialog exports in that order with no way to change it there | 2 |
| Table | Scores shown to four decimals; further down the list values like 0.0038 cannot be told apart by eye, so near ties past row 10 are invisible without the CSV | 2 |
| Export dialog | Headers like "betweenness rank (of 300, exact, unweighted, full graph)" are honest but awkward as pandas column names | 2 |
| Export dialog | No "top N" or "these rows only" option; all 300 rows always (acceptable to this participant) | 1 |
| Results panel | The Exact popover's "It does not say the ranking is meaningful" read as slightly odd, but harmless | 1 |

## What worked

- The line above the table, "Full graph: 300 nodes. Sorted by betweenness, highest first", answered
  scope and sort before he asked.
- Rank columns "of 300, ties share" and "#4=" style ties: he usually builds this himself in pandas.
- The dialog saying "All 300" and "The first column is the file's own id" -- no wondering whether it
  is capped or whether ids were rewritten.
- Full-precision values in the CSV, so he can check ties himself.
- The agreement line ("top 2 on all three measures") -- "that's the sentence my director wants".
