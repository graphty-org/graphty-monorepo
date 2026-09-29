# Top 50 by betweenness into Excel or pandas -- Analyst Alex

Participant: Alex, operations data analyst (NetworkX, pandas, Excel, Gephi for pictures).
Task as given by the moderator: "Get the top 50 nodes by betweenness into Excel or pandas with
their original ids, and say how sure you are of the order."
Screens: the Results panel (all its states) and the bottom table dock. Alex saw the rendered
screens; where he clicked, the moderator showed the state that click leads to.

Outcome: done on the 300-protein network, with an honest answer about the order. On the
124,318-patent network, not done: the table had no betweenness rows to export, and the
confidence answer stopped at rank 2.

## Transcript

**First screen (patent citations, PageRank running).**

> OK. "Patent citations", 124,318 nodes, 1.48 million edges. Big one. Something's already
> running -- PageRank, "on WebGPU, under a minute". I didn't ask for PageRank, but fine, it
> has a bar and a Cancel, so at least it isn't one of those "is it doing anything" moments.
>
> I want betweenness. Left side, "In this project" -- there's "Betweenness (sampled)". And down
> in the catalog, "Betweenness ... hours". Yeah. That's the four-hours-over-lunch thing. I'm
> not clicking the one that says hours. Sampled is already there, so I'll open that.

**Betweenness (sampled), finished.**

> "Sampled, 50 sources", seed 7. Good, there's a seed. Top nodes: #1 5879702, #2 5902311,
> then three of them all "#3 to #7". Huh. OK, that's actually honest -- it's telling me it
> doesn't know the order past two. "Ranks below #2 may swap between runs."
>
> The Run record thing on the right -- "Error bound plus or minus 0.00035 on each value, 95
> runs out of 100". Copy button. I like that, I can paste that under the table in the email.
>
> But I need fifty, and it shows me five. "124,313 more in the table." Click.

**The table on the patent graph.**

> Right, the table opens big because nothing's drawn. Columns: id, grantYear, category,
> citationsReceived, some "Drug patents cited 25+" column. Where's betweenness? There's no
> betweenness column. And there's a pink tag, "rows blocked: paged listing". I don't know what
> that means. Is that an error? (Moderator: it marks something not built yet.) So on this graph
> I can't actually get the list out. That's -- that's the graph I'd actually have at work.
>
> Also the ids here are "6,117,075" with commas, and in the panel it said "5879702" with no
> commas. Which one goes in the file? If it writes the comma one I'm going to spend twenty
> minutes cleaning it in Excel. These are ids, not quantities.
>
> And even if the rows were there -- the "#3 to #7" ranges are only on the top five in the
> panel. For number 40, 45, 50, how sure is it? Plus or minus 0.00035 on values that are like
> 0.0025 at number three... by number fifty that's going to be all noise. I'd have to do that
> maths myself. I can't tell my manager "the top 50" off a 50-source sample. I'd say "the top
> two are solid, the rest is a rough shortlist", and then honestly I'd go back to NetworkX with
> k=500 overnight.

**Moderator switches him to the protein network (300 proteins), betweenness finished.**

> OK, small one. "on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected.
> WebGPU." Good, that's the line I want to check before anything. Hover on the (i) by
> Exact: "Computed on every node, not estimated. It does not say the ranking is meaningful."
> ...Meaningful how? I think it's saying "don't read too much into it". Fine. Exact is what I
> care about.
>
> Top nodes, MAPK1 0.1379 first. Again only a few. "295 more in the table." Click.

**The table, sorted by betweenness.**

> There we go. "Full graph: 300 nodes. Sorted by betweenness, highest first." id, module,
> degree, betweenness "exact, full graph", betweenness rank "of 300, ties share". MAPK1 #1 of
> 300, TP53 #2, YWHAZ, CDK1, AKT1... That's what I wanted. Rank column already there, so I
> don't have to rank it myself.
>
> Now out. My eye goes to the big blue "Export files..." top right first -- that's the export
> button, right? (Moderator: that one does figures, the graph file, the recipe and styles, not
> tables.) Then why is it the big blue one... OK. There's "Export table as CSV..." on the
> table's own bar. That one.

**Export table as CSV dialog.**

> "Rows: All 300: Nodes, full graph." "Order: pagerank, highest first" -- wait, I sorted by
> betweenness. (Checks the table again: it says betweenness.) OK, I think that's just the
> example. It'd better follow what the table says. If it writes pagerank order I won't notice
> until my director does.
>
> No way to say "just the top 50". Whatever -- I'll take all 300 and do
> `df.nsmallest(50, ...)`, or sort in Excel and delete rows. It says 300 up front so I know
> nothing got cut off. Good.
>
> Preview: `id,module,degree (full graph),"degree rank (of 300, full graph)","betweenness
> (exact, unweighted, full graph)","betweenness rank (of 300, exact, unweighted, full
> graph)"...` Oh come on. I have to type `df["betweenness rank (of 300, exact, unweighted,
> full graph)"]`? I'll rename every column on line two of the notebook. I get why it's there,
> it's the provenance, and in Excel it's actually fine for whoever opens it. But it's long.
>
> First column is the real id, MAPK1, not some internal number. Good. Values at full
> precision, ranks as whole numbers. File name ppi-core-300-nodes.csv. Export.

**How sure is he of the order (his answer to the moderator).**

> Protein one: the values are exact, every node was a source, so the order is the order. Ties
> share a rank -- the ten zeros all come out 291=. In the CSV the tie shows as the same number,
> which is fine. What I can't see is how close #50 and #51 are without scrolling down and
> reading four decimals. If I was going to defend "top 50" I'd want to know whether 50 and 51
> are 0.0120 vs 0.0119. I'd check that in pandas. But no sampling, so I'd say: "exact order;
> any ties shown as ties".
>
> Patent one: top 2 sure, 3 to 7 it gave me a range, after that I don't know, and the screen
> doesn't know either. And I couldn't export it anyway.

## Single Ease Question

**4 of 7.** The small graph was a 5 -- three clicks, and the counts and "exact" were right there.
The big graph I couldn't finish, and that's the one that looks like my work data.

## Would he use this instead of his current tool

> For the picture and for handing a table to someone in Excel, maybe, yeah -- the table with the
> rank column and the export saying how many rows it writes is better than Gephi's Data
> Laboratory, where I once exported the edges by mistake. The seed and the run record I'd
> actually paste into an email. But the number I defend in the meeting, on a graph our size,
> I'd still compute in NetworkX. It stopped being sure at rank two, and it wouldn't give me the
> rows. Show me it gets the same top 50 as NetworkX on the exact run and I'll stop
> double-checking.
