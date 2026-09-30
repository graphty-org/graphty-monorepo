# Session: "This citation data is too big to draw. Is anything here worth a look?"

Participant: Chris, senior ML engineer, recommendation systems (persona: study/personas/ml-engineer-recsys.md).
Screens seen, as the participant sees them (design notes hidden), 1440 x 900, light theme:
the too-big-to-draw state and its filter steps (screens/past-drawing-limit.html), find by id
(screens/find.html), the table past the drawing limit (screens/table-dock.html), and the selection
over the cap (screens/selection-over-cap.html).
Renders: shots/tasks/too-big-to-draw/01-past-drawing-limit.png, 02-find-s7.png, 03-table-dock-limit.png;
shots/r6-chris-t200-past-drawing-limit-*.png; shots/r6-chris-t200-selection-over-cap-e1..e5.png;
shots/record/r6-chris-tbd-pdl-full.png (every state of the too-big-to-draw page, one image).

## Think-aloud

**Opening the file (01-past-drawing-limit).**
"OK. Patent citations. Not my data -- this is a directed citation graph, not a user-item bipartite
thing -- but the size is roughly my ballpark, so this is the test I actually care about.

First thing: it did NOT try to draw it. '124,318 nodes not drawn. More than this browser draws at
once (50,000).' Good. That is the single thing that has made me close every other tool: the tab
freezes on a force layout of a million edges. Here the canvas is empty and says why, with one blue
button. I'll take it.

'This browser' -- is 50,000 a fixed number or is it measured on my machine? On the 4K monitor with
the M-series I'd expect more. It doesn't say. Minor, but I'd want to know if it's a constant.

Now the right panel, which is where I actually look. nodes 124,318, edges 1,480,221, density
0.0000958, average total degree 23.8. Let me check that. 2 x 1.48M / 124k is 23.8, yes. Density,
1.48M over n(n-1), about 9.6e-5, yes. Numbers are honest, directed density. Good.

Isolates 2,406, weak components 3,912, and the largest is 116,905 nodes, 94.0%. Then 41, 23, 19,
'3,908 more, each 19 nodes or fewer.' That is exactly the component-size readout I'd write in three
lines of networkx, and here it is without me writing it. And the counts are links, so I assume they
open the rows.

Degree distribution, In / Out / Total, 'Nodes with in-degree k or more, both axes log.' A CCDF on
log-log. Somebody here knows what they're doing -- that's the right plot, not a bar chart with 200
empty bins. And they put the zero-degree count beside it instead of pretending: 'In-degree 0, not
on the log axis: 41,873.' That's a third of the graph never cited. Worth a look, actually.

Wait. Max in-degree on the plot says 236. The table's top row has citationsReceived 779. So
citationsReceived is not in-degree here. The note under the plot says 'Never cited by a patent in
this sample' -- 'sample'. So this file is a sample of a bigger corpus and citationsReceived counts
citations from outside it? I'm guessing. That's the denominator question and it's the most
important thing on the screen, and I had to put it together from a word in a footnote."

**Clicking the isolates count (r6-chris-t200-past-drawing-limit-isolates).**
"Click 2,406. Selection, 2,406 nodes, edges between them 0, in-degree 0, out-degree 0. And there's
the sentence I wanted: 'None of these patents cites or is cited by another patent in this sample.
Their citationsReceived counts citations from patents outside it.' OK -- confirmed. That sentence
should be next to the degree plot, not behind a click on isolates. I only found it because I
always check the zero-degree nodes first. Most people won't.

The table became the selection, 'Selected: 2,406 nodes, the isolates. Show full graph.' Top isolate
has 46 citations from outside. Fine, so the isolates are mostly just sample boundary artefacts,
not dead patents. Good to know before I read anything into them."

**Narrow the graph (narrow, keep, kept).**
"Narrow the graph... opens 'Filter steps'. 'No filter steps. Every number reads the full graph.'
Two suggestions: 'Keep top rows by citationsReceived' and 'Neighbors of a node'. Two things I'd
actually do. No 'AI suggest' nonsense.

Keep top rows: type 200, sorted by citationsReceived, highest first. 'Row 200 has citationsReceived
358; 1 more patent also has 358 and is left out.' Ha. It tells me about the tie at the cut. I have
been bitten by that in a top-K eval. And '200 nodes, 288 edges will draw' before I press anything.
That's the pre-count I want every filter to give me.

Keep these 200 rows. Now it draws. 'Filtered to 200 of 124,318 nodes', Undo. The chip up top says
'200 of 124K nodes, 1 step'. Stats switch to the subgraph, and there's a grey box: 'Describes the
200 most cited patents, not a random sample. Density reads high: highly cited patents cite each
other.' And a 'reads high' tag on density. That's the caveat I'd write in a notebook comment and
nobody else ever does. Edges '288 of 1,480,221' -- denominator right there. Density 0.00724 checks
out.

The picture is... fine. A small hairball with ids on the biggest nodes. 16 isolates, 174 in the
big component, 87.0%. It's readable at 200. The drawing itself doesn't tell me much, but the
statistics next to it do, and I can see the hubs cluster on the right. ForceAtlas2 row says
'Engine: WebGPU'. OK, how long did it take? No timing. A badge without a number is marketing."

**Rule and neighbors (the rule and neighbors editors, the sample state).**
"Narrow again, 'Add step', a rule: category is Drugs and medical AND citationsReceived >= 25.
'612 nodes, 1,843 edges will draw.' Then I tried the obvious wrong one: citationsReceived >= 5
gives '58,316 nodes, 702,440 edges will not draw: more than this browser draws at once (50,000).
Add a condition to narrow it further.' It tells me before I commit. And >= 800 says 'No nodes match.
The highest citationsReceived in Drugs and medical is 779.' That's a good error message. It tells
me the max so I don't bisect by hand.

Neighbors of a node: Around 6117075, 1 hop, Both directions. '242 nodes, 348 edges will draw.'
There it is. That's the ego graph, the one view I actually come to these tools for. Hops and
direction are right there. For my own data this would be 'around user X, 2 hops' and I'd be happy.
Consistent too: the most cited patent has 779 citations but only 242 neighbours in the sample --
same outside-the-sample story as before. At least I understand it now.

The last state keeps the 3 most cited, then adds their neighbours: 586 nodes, two steps on the
chip, 'Describes the 3 most cited patents and all their neighbors, not a random sample. It favors
hubs, so density and clustering read high.' Three stars, and only a handful of patents bridge them
-- 6228917, 5882034, 6018952 and a couple of others. That's the thing worth a look in this data:
the three most-cited patents barely share citers. Two of them are Computers and communications
and one is Drugs and medical, so that's not surprising, but I found it in about a minute, which is
the point."

**Find (02-find-s7).**
"Search. I pasted three ids with spaces: '3 results in all 124,318 nodes'. It takes a list. My
first move on any tool is 'find user id X' and this works on the full graph without drawing
anything. The inspector for 6117075 says 'Not drawn: the graph is past the drawing limit. Counted
everywhere.' Attributes grantYear 2000, category, citationsReceived 779. And there's a filter icon
up there -- I'm guessing that's 'neighbours of this', which is where I'd go next. It's an icon
with no label, so I'm guessing. The result list shows 'category Drugs and medical' under each id;
I'd rather see the number I sorted by, but whatever.

The table row for 6117075 lit up, so node -> row works. That's one of my deal-breakers and it
passes."

**Table past the limit (03-table-dock-limit).**
"I made the 612-patent rule into a set, 'Drug patents cited 25+', and highlighted it. Nothing to
draw, so the highlight shows up as a 'member' column in the table. That's actually a sensible
place for it -- I'd rather have a boolean column than a colour I can't see anyway. Export table...
is right there.

The column headers: category has a little bar strip, but grantYear and citationsReceived have empty
dashed boxes. Is that loading? Broken? A histogram that isn't there? I don't know and nothing
says. If it's 'not computed yet' just say so.

Export: from what I saw of the dialog on the other screens it's CSV, first column is the file's
own id, and a methods file next to it. Original ids intact is the thing I care about. No Parquet.
For 124k rows CSV is fine. For my 40M-row interaction table CSV is a joke, but I wouldn't export
that from a browser anyway -- I'd export the filtered ego graph, which is small."

**Selection over the cap (selection-over-cap, E1-E5).**
"This is a different dataset -- 'Transfers, March 2026', 3,000 accounts. Not the citation data.
I'm not sure why I'm being shown this for this task. Select all draws one ring around everything
with a badge that says 12,113. 12,113 of what? The panel says 3,000 nodes, 9,113 edges. Oh --
it added them. Don't add nodes and edges into one number; those are different units. That's an
unexplained magic number and I'd have spent a minute trying to reconcile it.

The rest is Ctrl+Z undoing a set creation, which is an undo thing, not a big-graph thing. For
my question it's noise. The one relevant bit: on the citation graph, clicking '116,905 nodes' to
select the giant component would put me way past any selection cap, and nothing is drawn anyway,
so I'd expect the table to carry it like the isolates did. I didn't see that case."

## Single Ease Question

**6 out of 7.**

"Getting from 'too big to draw' to something I could read was easy: the stats were there
immediately, the CCDF was the right plot, the filters told me the count before I committed, and
the ego-graph step is exactly the view I want. I lost a point on having to reverse-engineer why
max in-degree is 236 while citationsReceived goes to 779 -- the explanation exists, but only
behind the isolates click -- and on the small stuff: empty dashed histogram boxes, a WebGPU label
with no timing, and the 12,113 badge on the other screen."

## Would you use this instead of your current tool?

"Instead of the notebook? No. Alongside it, for this exact job, yes -- which is more than I'd say
about Gephi.

My current way to answer 'is anything in this big graph worth a look' is pandas plus networkx:
degree CCDF, component sizes, top-k by degree, then an ego graph of one node drawn with matplotlib.
That's 15 lines and I know what every number means. This tool gave me all of it without writing
the 15 lines, it didn't hang, it didn't draw the hairball, it told me every denominator, and it
warned me that 'top 200' and 'hubs plus neighbours' bias density. The ego graph with hops and
direction, with the count before it draws, is the part the notebook does badly -- matplotlib ego
graphs are ugly and not interactive.

What keeps it next to the notebook rather than instead of it: I bring a bipartite user-item table
with tens of millions of rows and Parquet, and I haven't seen it handle either here. And I still
want a timing next to 'WebGPU'. Show me 'around user X, 2 hops' on my interaction data with my
model score as a column, and I'd open it every week."

## Findings (in the participant's words, most important first)

1. **The denominator of citationsReceived is hidden.** Max in-degree on the plot is 236 but the
   top citationsReceived is 779; the reason ("counts citations from patents outside this sample")
   appears only after clicking the isolates count. It belongs beside the degree distribution or on
   the citationsReceived column header. Severity: high for anyone who reads numbers carefully.
2. **Empty dashed boxes in the table headers** (grantYear, citationsReceived) past the drawing
   limit read as broken or loading. Say what they are, or leave the space empty.
3. **"Engine: WebGPU" with no time.** A layout on 200 or 612 nodes should say how long it took.
4. **The selection badge "12,113" adds nodes and edges** into one number (3,000 + 9,113) and is
   not labelled.
5. **The inspector's filter icon on a found node is unlabelled**; the neighbours step is the most
   valuable action on that screen and it's hidden behind an icon.
6. **"More than this browser draws at once (50,000)"** does not say whether 50,000 is fixed or
   measured on this machine.
7. **No Parquet export.** CSV with original ids and a methods file is acceptable for filtered
   subsets.

## What delighted him

- Nothing is drawn by default past the limit, and the screen says why, with one next step.
- Honest whole-graph statistics that check out by hand: density, average degree, isolates,
  component sizes with share of nodes, a log-log CCDF with the zero-degree count stated beside it.
- Every filter step shows "N nodes, M edges will draw" (or "will not draw") before committing, and
  "No nodes match" names the actual maximum.
- The top-K cut reports the tie at the boundary ("1 more patent also has 358 and is left out").
- The bias caveats on filtered statistics: "not a random sample", "density reads high".
- Neighbors of a node with hops and direction: the ego graph, on the full graph, from a found id.
- Find accepts several pasted ids and searches all 124,318 nodes without drawing any.
- A highlight that cannot be drawn becomes a membership column in the table.
