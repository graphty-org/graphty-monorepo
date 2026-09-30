# Top 50 by betweenness, into pandas -- Dr. Mara Lindqvist (the Gephi holdout)

**Task, as given:** "Get the top 50 nodes by betweenness into Excel or pandas with their original
ids, and say how sure you are of the order."

**Data on screen:** Human protein interactions, 300 proteins, 1,262 interactions, 3 components,
loaded from `ppi-core-300.graphml`. Betweenness has already been run.

**Screens seen (study view, 1440 x 900):**
`shots/record/r6-mara-top50-rp-finished.png` (Results panel, the betweenness run),
`shots/record/r6-mara-top50-rp-in-the-table.png` (after "295 more in the table"),
`shots/record/r6-mara-top50-td-ranked.png` (the table with three measures ranked),
`shots/record/r6-mara-top50-td-full.png` (the whole table page, including the Export dialog opened from
Export table...), `shots/record/screens__inspector-result--study.png` (the run's record in the right
panel), and `shots/record/r6-mara-top50-ex-ways-in-menu.png` and `shots/record/r6-mara-top50-ex-table.png`
(the Export dialog page itself).

## Think-aloud

**1. The Results panel.**
"Right. Betweenness, Sep 28 09:12. 'on: full graph, 300 nodes, 3 components.' Good -- that is the
first thing I look for, and it is the first thing it says. In Gephi I would have to remember
whether I had the giant-component filter on. 'Exact.' 'Undirected.' 'Weight: confidence, not used
yet.' Fine, I did not ask for weighted, and it tells me it did not do it. That is honest.

The hover on Exact: 'Computed on every node, not estimated. It does not say the ranking is
meaningful.' Ha. Somebody has read a reviewer's letter. I like that.

Top five: MAPK1, TP53, YWHAZ, CDK1, AKT1. 'Every step in the top 5 is over the 1% tie line; the
smallest, ranks 3 and 4, is 1.2%.' So YWHAZ over CDK1 is 0.0695 against 0.0687. That is 1.2
percent relative, I assume -- one percent of what, exactly? The larger value? I'd guess relative
difference. It is a threshold someone picked, not a confidence interval, but at least it is a
number and not a traffic light.

I need fifty, not five. '295 more in the table.' That's the link."

**2. Into the table.**
"There it is. Nodes tab, 'Full graph: 300 nodes. Sorted by betweenness, highest first.' Good, it
kept the sort from where I came in -- in Data Lab I'd click the column header and pray it sorted
numerically and not as strings. id column: MAPK1, TP53, YWHAZ... Those are the ids from my GraphML?
Or labels? The column is called id, so I'll take it at its word for now and check the file.

Column header says 'betweenness, exact, full graph' and the rank column 'of 300, ties share'. I
only see ten rows, down to HSP90AA1 at #10. I'd scroll. Fine.

The other table picture has more columns: degree, betweenness and PageRank, each with a rank, and
'#6, near #7' in the PageRank ranks. So near ties are marked in the cell. Nothing in the betweenness
ranks is marked near in the ten I can see -- UBC 0.0579 and UBB 0.0561, that's three percent, fine.
EP300 0.0539 and MYC 0.0530, under two. I would want to see ranks 40 to 50, because that is where
betweenness values get small and bunch up. I can't see that part here. That is where my honest
answer about the order lives."

**3. Checking what it computed.**
"Before I export anything I want to know if this number matches NetworkX. Click Details / the run
in the right panel: 'Scope: Full graph, 300. Weight: confidence, not used yet. Shortest paths
counted hops; confidence was not used. Normalized: yes.' Undirected from the panel. So that should
be `nx.betweenness_centrality(G)` with the defaults -- normalized, no endpoints, unweighted. It does
not say endpoints. I'd assume not. I would check MAPK1 = 0.1379 in NetworkX in thirty seconds, and
if it disagrees, we are done here. But it tells me enough to run the check, which is more than
Gephi's report window does -- Gephi tells me the algorithm and a plot, not whether it normalized."

**4. Getting it out.**
"Export table..., top right of the table. There's the dialog. Table (.csv) is ticked. 'Rows: All
300: Nodes, full graph.' 'Order: pagerank, highest first' -- in the picture they showed me it's
PageRank, because that table was opened from the PageRank run. From mine it would say betweenness,
I assume. I'd check that line before clicking.

There is no 'first 50 rows'. I don't care. I'll take all 300 and do
`df.sort_values(...).head(50)` -- actually I'd rather have all 300, I always want the tail too.
Someone in Excel would want a 'top 50' box, though. My students would.

'The first column is the file's own id.' Good, that answers my question from before: it's the id
as it came in. And a methods file beside it, always. That is actually nice. In Gephi I export from
Data Lab and three months later I have no idea which filter was on when I ran it.

Now the preview:

    id,module,"community (Louvain, weighted, seed 7, full graph)",degree (full graph),
    "degree rank (of 300, full graph)","betweenness (exact, unweighted, full graph)",
    "betweenness rank (of 300, exact, unweighted, full graph)", ...
    YWHAZ,Unassigned,6,24,4=,0.06954041304050429,3,...

Two things. The headers: every column name has commas and parentheses in it. pandas will read it,
it's quoted, but I'm going to rename every column on line two of my script. I understand why --
the method travels with the number -- but put that in the methods file and give me
`betweenness` and `betweenness_rank`. Or give me both. I'd honestly settle for the long ones if
the methods file maps them.

Second: the rank column. '4=' is a string. So the degree rank column comes into pandas as object
dtype, half ints and half strings. I can't sort it or subtract it without cleaning it. The '='
belongs in its own column, a boolean, `tied`. The value is right; the type is wrong.

And does the file carry the 'near' marks? The table says '#9, near #10'. If that goes into the
rank column too, that's worse, that's free text in a numeric column. If it doesn't go in, then
the file has less than the screen, and the answer to 'how sure' stays behind on the screen. I
can't tell from this preview -- the first three rows have no near ties. I'd have to export and
look."

**5. The Export dialog page on its own.**
"This one is a different project -- 'Mule ring, case ACC-233575', accounts, riskScore. Not my
proteins. And the File menu one is a stress-response study. I'll assume those are the same dialog
on somebody else's data. It says the same things: rows, filter step, order, methods beside it.
'2 files go to your Downloads folder. Nothing is uploaded.' Good. That's the sentence I need for
the IRB."

**6. How sure am I of the order.**
"Of the computation: sure. It's exact, on the whole graph, unweighted, normalized, and I can
re-run it in NetworkX and diff the two columns. The first five are each more than one percent
apart. Ties at the same value share a rank, and I'll see the '=' in the file.

Of the order meaning anything: that's a different question and the tool is right not to answer
it. Past about rank 20 I'd expect betweenness gaps under one percent, and the table will say
'near' in those cells. I would report the top 50 as a set with the near ties grouped, not as a
strict ordering. And this is a protein network with a confidence column that was ignored --
if I wanted to know whether the order holds, I'd run it weighted and compare the two rankings.
There's a 'Compare with...' for that. That's the real test of the order, not the one-percent
line."

## Single Ease Question

**5 of 7.**

"The path was obvious: result, 'more in the table', Export table, done. It told me what it ran
on, and the methods file comes along without asking. I lose two points for the file itself: a
rank column that is a string because of the '=', and column names I have to rename before I can
type them. And I still don't know whether the near-tie marks make it into the CSV, which is the
one thing the task actually asked about."

## Would I use this instead of what I use now?

"For this task, no. For this task my current tool is NetworkX: three lines, and it's already in
the notebook where the regression is. I wouldn't open Gephi for it either.

But if I'm already in the map -- if I spatialized it here and I'm looking at who bridges what --
then yes, this export is better than Data Lab's. Gephi's CSV doesn't know which filter was on or
which run wrote the column. This one does and writes it down. That's worth something to me.
Still wouldn't switch over it. It earns a second session, not my course."

## Problems noted

- The rank columns in the CSV mix numbers and strings ("4=" beside "3"), so pandas and Excel read
  them as text; a tie wants its own column, and the rank stays a number.
- Column headers carry the whole method in parentheses with commas; accurate, but she renames
  every one before use. A short name with the method in the methods file (or a mapping there)
  would do.
- The dialog preview does not show whether the table's "near #10" marks are written to the file,
  and those marks are the only answer to "how sure of the order" past the top five.
- No "first N rows" option; she did not need it, but her Excel-using students would.
- The 1% tie line does not say what the 1% is of.
- The run record says normalized, unweighted, hops and undirected, but not whether endpoints are
  counted, which she needs to reproduce the value in NetworkX.
- The Export dialog page shown on its own is another project's data (accounts, riskScore), so the
  export for her proteins could only be seen in the smaller inset on the table page.
