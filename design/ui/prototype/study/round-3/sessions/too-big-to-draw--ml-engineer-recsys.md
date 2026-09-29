# Session: a graph too big to draw -- Chris, ML engineer (recommendation systems)

Participant: Chris, senior ML engineer on a retail recommendations team (see
study/personas/ml-engineer-recsys.md). Laptop-size screen, 1440 by 900.

Task as given by the moderator: "Here is last period's citation data. Find anything worth a
closer look."

Screens used, in order: past-drawing-limit (states 1 to 5), find (the pasted-ids state), filter-chip.

---

## Think-aloud transcript

**Before starting.** "Citation data. OK, so not my user-item graph, it's patents citing patents.
Directed, one node type. Fine, it's still a sparse matrix. First question: where did it come
from? I didn't import anything. Left panel says 'Patent citations', and down in Statistics
there's 'Last import patent-citations-s...' truncated. So somebody loaded it for me. I'd want to
see that it read my file, not a demo, and that it didn't upload it anywhere. The rail says
'Assistant: Off. Nothing is sent.' That's about the assistant, not the data. I'll assume local
until someone tells me otherwise, but I'd ask."

**State 1, not drawn.** "OK, this is actually the first thing I like. Big box in the middle:
'124,318 nodes not drawn. More than this browser draws at once (50,000). Every node is counted in
Statistics and listed in the table.' Good. It didn't try to force-layout 1.4 million edges and
freeze my tab. That's the Gephi experience I was bracing for.

Denominator check, right side: nodes 124,318, edges 1,480,221, density 0.0000958, average total
degree 23.8. 1,480,221 times 2 over 124,318 is about 23.8, so 'total' means in plus out. Good,
it says which degree. Isolates 2,406. Weak components 3,912, and the big one is 116,905 nodes,
94.0%. Then 41, 23, 19, and '3,908 more, each 19 nodes or fewer'. That's the shape of the graph
in six lines. I'd have written that in a notebook cell, but I'd have had to write it.

Degree distribution: 'Nodes with in-degree k or more, both axes log.' A CCDF on log-log. Yes.
Heavy tail, 'max 236'. And 'In-degree 0, not on the log axis: 41,873'. It counted the zeros
instead of silently dropping them. That's the correct thing and nobody does it.

Wait. Max in-degree 236, but the table's top row says citationsReceived 779. Those should be the
same number. Either the table is wrong or the graph is missing edges. That's a leakage-level red
flag for me -- which one is the truth?" (Moderator does not answer. He keeps going.) "I'm
guessing citationsReceived is a column from the source data counting citations from outside the
sample. But nothing on this screen tells me that. I only find out later, when I click isolates."

**State 1, the table.** "Table is sorted by citationsReceived, highest first. Column headers
have little ranges under them, '1999 to 2001', '6 values', '0 to 779'. Nice, that's df.describe()
for free. The subtitle text is tiny though, that's under 12px.

Hm. In this render the ids read '6,117,075' with thousands commas. It's a patent NUMBER, it's an
id, don't format it like a count. If I paste that back into my pipeline with commas it won't
join. In the other renders I've seen it's '6117075'. If the real product does the comma thing,
that's a problem."

**State 1b, isolates.** "Isolates count is a link. Click. 'Selected: 2,406 nodes, the isolates.'
Chip still says Full graph, good, it selected rather than filtered. Right side: 'None of these
patents cites or is cited by another patent in this sample. Their citationsReceived counts
citations from patents outside it.' THERE it is. That explains the 779 versus 236. It should have
been next to the degree chart, not buried behind a click on isolates. But OK, now I trust the
numbers again."

**What looks worth a closer look so far.** "Three things, already, without drawing anything:
41,873 patents nobody in the sample cites -- that's a third of the graph, cold-start in my world;
2,406 fully isolated; and a 41-node component off on its own, which in my data would be a bot
cluster or a single merchant gaming things. I'd click that 41."

**State 2, Narrow the graph.** "Button opens a popover off the chip. 'No filter steps. Every
number reads the full graph.' Two suggestions. 'Top 3 by citationsReceived, with neighbors, 586,
follows the table's sort; favors hubs.' OK, I appreciate that it says 'favors hubs'. Most tools
would call that a sample. Why 3 though? Magic number." (Later, in the editor inset:) "'graphty
chose 3, the most that reads at the fitted zoom.' Fine, it's editable. I'd have preferred it to
just say that in the row.

'Around a node...' is the ego graph. That's the one I'd actually use. Where's k-hop? It says
'1 hop' in the editor. I'd want 2."

**State 3, rule editor.** "category is Drugs and medical AND citationsReceived >= 25. And before
I press anything: '612 nodes, 1,843 edges will draw.' That's the dry run I always want and never
get. The too-big case says 'will not draw' and tells me the limit. The nothing-matches case
tells me the actual max is 779 -- actually useful, it saved me a guess. Filter to is the only
commit. Good."

**State 4, narrowed and drawn.** "Toast: 'Filtered to 612 of 124,318 nodes. Undo.' Chip reads
'Filtered: 612 of 124K nodes - 1 step'. Every count still says 'of the total'. Edges 1,843 of
1,480,221. Good, the denominator never disappears.

The picture... it's a smaller hairball. 545 of them in one blob with labels on top of each other,
then a grid of tiny pairs on the right. The grid of little components is more useful than the
blob, honestly. 'Engine: WebGPU'. Cool, how long did it take? No number. A badge without a
timing tells me nothing."

**State 5, top 3 with neighbors.** "Three stars, 6117075, 6031111, 5960121, with a few nodes in
between them. A grey box says 'Describes the 3 most cited patents and all their neighbors, not a
random sample. It favors hubs, so density and clustering read high', and density has a 'reads
high' tag. That's honest. I'd put that in a slide.

The stars themselves are boring, I knew they were hubs from the table. The interesting nodes are
the handful in the middle -- 6018952, 5907468, 6112268, 5882034, 6228917 -- the ones touching two
hubs. That's the common-neighbours question. I want to sort by 'how many of these hubs does it
touch' and I don't see a way. I'd end up exporting and doing it in pandas."

**Find, pasted ids.** "I paste three ids in the search: '3 results in all 124,318 nodes'. Good,
paste-a-list works, that's how I'd drive it from a notebook. Selecting one: inspector says 'Not
drawn: the graph is past the drawing limit. Counted everywhere.' Attributes: grantYear 2000,
category, citationsReceived 779. Where's its in-degree and out-degree? Where are its neighbors?
There's a funnel icon and a branching icon in the inspector header with no labels. I'd guess the
funnel is 'filter to neighbors'. I'd hover and hope for a tooltip.

And again, the ids here are '6,117,075' with commas, in the search box and in the result list.
That's the thing I'd complain about in the feedback form."

**Filter chip screen.** "Wait, now I'm in Les Miserables? 77 nodes. Why did my patent data
become a novel? OK, it's a demo of the chip. Moving on.

The chip opens a list of steps with checkboxes. Each one says 'took out 17 - 60 left'. I like
that a lot, it's a pipeline with the row counts per stage, like a Spark DAG. You can tick one
off and see what changes. Editing a step: 'Degree counts neighbors in the graph this step reads.'
So degree is recomputed after the earlier filters. That's correct and also a trap; I'm glad it
says so. On my citation graph I'd need to know: in, out or total? Here it just says degree.

'Leaves 0 nodes': the table says 'emptied by Filter to degree >= 40. Turn off step.' Good, it
tells me which step killed it.

'While a step is being recounted -- Counting...' with spinners. On 124K nodes, how long is that?
If it spins for ten seconds with no number I'll think it hung."

**Export.** "'Export files...' top right. What does it export -- the filtered subgraph, the table,
with my original ids? CSV? Parquet? I can't tell from here, and that decides whether this goes in
my workflow or back in the drawer."

---

## What I found worth a closer look

1. A third of the patents (41,873) have in-degree 0 in the sample; 2,406 are fully isolated.
2. A 41-node component detached from the giant one -- I'd open that first.
3. The gap between citationsReceived (up to 779) and in-sample in-degree (max 236): most
   citations come from outside the sample, so any centrality here is biased toward whatever
   the sample kept.
4. The few patents that touch two or more of the top hubs -- the bridges -- not the hubs.

## Single Ease Question

**5 out of 7.** Getting the whole-graph picture without drawing was easy and honest, easier than
I expected. Getting from "interesting" to "why" was not: no way to rank the bridge patents, no
degree or neighbors on a node's inspector, and the in-degree versus citationsReceived mismatch had
me doubting the data for a few minutes.

## Would I use this instead of my current tool?

"Not instead of. Alongside, maybe. The not-drawn screen with the stats, the CCDF with the zeros
counted, and the filter steps with row counts at every stage -- that's better than a notebook for
the first ten minutes on a new dataset, and it's better than anything Gephi ever showed me. It's
the first graph tool that didn't try to draw a million points at me.

But my data is a bipartite user-item table in Parquet, and I didn't see an import, two node
types, a 2-hop ego graph, a common-neighbours or Adamic-Adar column, or an export I trust with my
ids intact. If those are there, I'd use it every week for the 'why did we recommend this' debug.
If I have to write a conversion script, I'll just plot it in the notebook."
