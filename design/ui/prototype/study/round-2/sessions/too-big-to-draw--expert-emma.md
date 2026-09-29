# Session: a citation graph too big to draw -- Expert Emma

Participant: Emma, network scientist, half academic and half consultant. Lives in Jupyter with
networkx and igraph; uses Gephi for the final figure. 14-inch laptop, Firefox, browser zoomed a
little. Default stance: prove it.

Task as given by the moderator: "Here is last period's citation data. Find anything worth a closer
look."

Screens, in the order she met them: the main window with a patent citation graph open that is too
big to draw (124,318 patents, 1,480,221 citations), the isolates opened in the table, the "Narrow
the graph..." list of filter steps, the rule editor and its three outcomes, the narrowed and drawn
graph, the offered "top 3 by total degree, with neighbors" route; then Find with a pasted list of
patent ids on the same graph; then the filter chip and its steps (shown on a different, small
graph -- Les Miserables).

## Part 1 -- the file opens and nothing is drawn

**First glance.** "OK. Big empty grey canvas and a box in the middle: '124,318 nodes not drawn.
More than this browser draws at once (50,000). Every node is counted in Statistics and listed in
the table.' Good. That is the honest version. Gephi would have tried, pinned my fan for ten
minutes and then frozen. I prefer being told no."

"First thing I actually look for is where the data goes. Left rail -- 'Assistant. Off. Nothing is
sent.' Fine, that is about the assistant. It does not say anything about the file. I want that
sentence about the file, not about the chatbot. I will assume it is on some other screen. Moving
on, but I have noted it."

"Right panel, Statistics. nodes 124,318, edges 1,480,221, density 0.0000958, average total degree
23.8. 'Total' -- thank you, it says which. On a directed graph that is in plus out, so mean
in-degree is 11.9. That is plausible for a three-year window of US patents. Isolates 2,406. 'Weak
components' 3,912 -- again, it says weak. Somebody here has read a textbook. Giant component
116,905 nodes, 94.0 percent. Then 41, 23, 19, and '3,908 more, each 19 nodes or fewer'. That's a
normal citation graph: one giant component and dust."

"Degree distribution: In, Out, Total. In is selected. 'Nodes with in-degree k or more, both axes
log.' Complementary cumulative on log-log. That is exactly the plot I would have made in the
notebook as cell three. And the zeros are not silently dropped -- 'In-degree 0, not on the log
axis: 41,873. Never cited by a patent in this sample.' Good. That is correct and most tools get it
wrong."

"'Edges: directed, weight not set.' Yes, citations are unweighted and directed. Detected
correctly. That was my check."

**The first thing that looks wrong.** "Now. The chart says 'max 236'. The table below is sorted by
citationsReceived, top row patent 6,117,075, 779. So the most cited patent has 779 citations but
the maximum in-degree is 236? Those cannot both be the same quantity. My guess: citationsReceived
is an attribute from the source -- all later citations, including from outside the sample window
-- and in-degree is what is inside this file. That would be the right explanation. But the screen
does not tell me that. A junior analyst would sort by citationsReceived, call it 'in-degree', and
put it in a slide."

"I want in-degree as a column in the table next to citationsReceived. It is the first thing I would
compute. I don't see a way to add it here. Maybe the three dots on the table."

**Clicks the isolates count (2,406).** "It's a link, so -- oh, it selected them and put them in the
table. 'Selected: 2,406 nodes, the isolates. Show full graph.' Right side: nodes 2,406, edges
between them 0, in-degree 0, out-degree 0. And then: 'None of these patents cites or is cited by
another patent in this sample. Their citationsReceived counts citations from patents outside it.'"

"There it is. That is my explanation, stated. Good. But it is on the screen I reached by clicking
the isolates, not on the screen where I saw 779 against 236. Put that sentence where the
discrepancy is. Actually, the finding here is the boundary effect: a patent with 46 citations is an
isolate because the window is three years. Anything I compute on this sample penalizes 2001
patents relative to 1999 ones -- less time to be cited. That is worth a closer look, and the tool
got me to it, partly by accident."

"Also: 6,117,075. Patent numbers with thousands separators. It is an identifier, not a quantity.
If I paste 6117075 from my DataFrame into a search box, will it match? I would bet not."

## Part 2 -- narrowing

**Clicks "Narrow the graph...".** "A popover off the chip at the top left. 'No filter steps. Every
number reads the full graph.' Then 'Suggested for this graph: Top 3 by total degree, with
neighbors -- a sample: favors hubs -- 586.' And 'Add step'."

"Two objections. One, 'total degree' on a citation graph mixes citing and being cited. If I want
hubs, I want in-degree, or I want to know which. Two, calling it a 'sample' is wrong vocabulary.
A sample means random. This is the union of three ego networks. It is a deliberately biased
subgraph. It does at least say 'favors hubs', so someone was worried about it, which I appreciate.
But I teach juniors, and 'sample' will be what they write in the methods section."

"I'd rather write my own rule. 'Add step'."

**The rule editor.** "Keep: Nodes or Edges. Where: category is 'Drugs and medical', AND
citationsReceived >= 25. And at the bottom, before I commit: '612 nodes, 1,843 edges, will draw'.
OK, that is actually nice. I get the count before I pay for it. In Gephi I would filter, wait,
look, undo, filter again."

"But it is a form. Dropdown, dropdown, dropdown. I want to type
`category == 'Drugs and medical' and citationsReceived >= 25`. I cannot see anywhere to type an
expression. For three conditions this is fine; for the tenth time this week it is not."

"And the attribute list -- is in-degree in there, or only the columns from the file? It shows
category and citationsReceived. If I can only filter on attributes I imported, I would filter on
the wrong quantity again. I cannot tell from here."

**The three outcomes underneath.** "The 'still too many' one: citationsReceived >= 5 gives 58,316
nodes, 'will not draw: more than this browser draws at once (50,000). Add a condition to narrow it
further.' But the Filter to button is still live. So I can commit a filter that will not draw. I
suppose that is fine -- I might want the statistics of that subset. Fine."

"'Nothing matches' with >= 800: 'The highest citationsReceived in Drugs and medical is 779.' Yes.
That is a good message. It tells me the boundary instead of just 'no'."

**Filter to -> the narrowed graph.** "Chip now says 'Filtered: 612 of 124K nodes, 1 step'. A little
toast: 'Filtered to 612 of 124,318 nodes -- Undo'. The canvas draws a grey hairball on the left and
a grid of little pieces on the right. I'll be honest, the hairball tells me nothing, as usual. The
grid of small components is more useful than the hairball."

"Statistics now: 612 nodes, edges '1,843 of 1,480,221' -- good, it keeps the denominator. Density
0.00493, 31 isolates, 44 weak components, largest 545 nodes, 89.1 percent. In-degree max 158. So
6,117,075 went from 236 to 158 because I dropped its citers in other categories. That is correct
behaviour for an induced subgraph. It would be nice if it said 'in-degree within the filter'.
It does say 'Cited by none of the other patents the rule keeps' for the zeros, which is right."

"Layout row: 'ForceAtlas2, Engine: WebGPU'. And in the variant without WebGPU: 'Engine: CPU; WebGPU
not available.' Good, no drama, and I know what ran. What I don't see is the ForceAtlas2
parameters. Gravity, scaling, iterations, seed. If I screenshot this for a client I want to write
down how it was laid out. Probably behind the play arrow. Not today's task."

**The offered route (top 3 with neighbors).** "Chip: 'Sample: 586 of 124K nodes, 1 step'. Statistics
has a grey box: 'Describes a sample: top 3 by total degree, with neighbors. It favors hubs, so
density and clustering read high.' And density has a badge, 'sample, reads high'. OK. That is
more honesty than I usually get. Three star-shaped ego networks, drawn. Nice picture. Means
nothing, but nice picture."

"Hold on. The in-degree chart says 'max 217'. If this is the top three hubs with ALL their
neighbours, 6,117,075 keeps every one of its citers, so its in-degree in this subgraph must still be
236. It cannot go down. 217 is wrong, or 'neighbors' means something narrower than I think, or the
hub with 236 is not one of the three -- but 6,117,075 is labelled right there on the canvas. Either
way, I don't trust that number. And this is exactly the moment I close a tool: a number that
contradicts another number on the same screen with no stated reason."

(Moderator note: she said this firmly and went back to compare the two frames twice.)

## Part 3 -- Find

**Pastes three patent ids into Find.** "Search box on the left. I paste '6,117,075 6,231,106
6,287,586' -- well, in this mock they already have commas; mine wouldn't. '3 results in all
124,318 nodes'. Clicking the first: inspector says 'Not drawn: the graph is past the drawing
limit. Counted everywhere.' Attributes: grantYear 2000, category Drugs and medical,
citationsReceived 779."

"And again no in-degree. The inspector for a node on a graph shows me the imported attributes and
not a single computed number about the node. That is the first thing I want: in-degree, out-degree,
which component. The one fact I care about -- 236 inside versus 779 total -- is not on this node's
page."

"Small thing: the zoom box top right says '100%'. On the other screen with nothing drawn it was
greyed out and said 'Zoom'. One of them is wrong."

"Pasting a list of ids works as one query. Good, I'll use that. Whitespace-separated? Comma-separated?
Commas are also inside the ids here. That is going to break."

## Part 4 -- the filter chip and its steps

"This one is on a different graph. Les Miserables, 77 nodes. Everyone's first graph. Fine, it's a
prototype."

"Three steps: 'Filter to Largest component, 76', 'Filter to degree >= 5, 41', and under it '3
dropped below degree 5 by Filter out group = 8', then 'Filter out group = 8, 28'. Wait. The third
step changes what the second step kept? So degree in step two is recomputed after step three
removes nodes? That is not a pipeline, that is a fixed point. Maybe it is the right design --
degree on the final graph -- but I need it stated: is degree computed on each step's input or on
the final result? If I reorder the steps, do I get the same 28? Order-dependence is exactly the
Gephi bug I complain about. Here I cannot tell whether it is a bug or a feature."

"Table has 'degree' and 'degree on: full graph' side by side. Thenardier 11 versus 16. Good. That
is the column I wanted on the citation graph, in-degree next to citationsReceived. So the tool can
do it -- it just did not show it to me on the data I was given."

"'Create rule set from step' in a menu. I don't know what a rule set is versus a step. I'd skip it."

"Ctrl+Z undoes. Checkboxes to turn steps off without deleting them. That is sensible. I like being
able to switch the filter off and watch the numbers come back."

## After the task

**What she would report as "worth a closer look".** "Three things. First, the window effect: 2,406
patents with outside citations but no inside ones, and 41,873 with in-degree zero, so any
centrality on this file is biased toward 1999 grants. I would want grantYear against in-degree
before anything else. Second, Drugs and medical dominates the very top of the citation counts --
four of the top seven -- worth checking if that holds after normalising by grant year. Third, the
giant component is 94 percent, so community detection is the next step, and I did not see where
that lives on these screens. I would go to 'Results' next, but nobody asked me to."

**Single Ease Question: 5 of 7.** "The mechanics were easy. The filter with a count before commit,
the undo, the statistics on first open -- easy. What cost me was reconciling numbers: 779 against
236 until I clicked into the isolates, and then 217 in the ego network that should be 236. That is
not a UI difficulty, it is a trust difficulty, and it is worse."

**Would she use it instead of her current tool?** "Instead of the notebook: no, never, and I don't
think that is what it is for. Instead of Gephi, for this particular job -- a graph too big to draw,
where I want the numbers first and a picture of a subset second -- possibly, yes. It told me what it
would not draw instead of freezing. The first-look statistics are the right ones, labelled the
right way: total degree, weak components, a CCDF with the zeros counted. The filter shows the count
before it commits. That is better than Gephi's filter panel."

"Conditions. Tell me in one sentence that the file does not leave the machine -- the file, not the
assistant. Put computed in-degree on the node and in the table next to the imported attribute.
Let me type the filter as an expression. Show me the layout parameters. And fix whatever produced
217, because the day I find a number I can't reconcile in front of a client, I am back in
networkx for good."

"And stop calling a hub neighbourhood a sample."

## Problems observed

1. **Imported citationsReceived and computed in-degree disagree on the first screen with no
   explanation there.** Top row 779, chart max 236. The explanation exists but only appears after
   clicking the isolates count. Severity 3. "The most cited patent has 779 but the max in-degree is
   236? Put that sentence where the discrepancy is."
2. **The "top 3 with neighbors" subgraph reports in-degree max 217, but a hub keeping all its
   neighbours must keep in-degree 236.** Two numbers on two screens contradict each other with no
   stated reason. Severity 4 for this participant: it is her stated give-up condition. "217 is
   wrong, or 'neighbors' means something narrower than I think."
3. **No computed per-node metrics on the citation graph's inspector or table.** Only imported
   attributes; in-degree is absent even though the filter-chip screen shows a computed degree
   column next to "degree on full graph". Severity 3. "The inspector shows me the imported
   attributes and not a single computed number about the node."
4. **The offered step is called a "sample" and ranks by total degree.** It is a biased union of ego
   networks, and total degree mixes citing with cited on a citation graph. Severity 2. "Calling it a
   sample is wrong vocabulary. A sample means random."
5. **The rule editor is dropdowns only; no expression entry, and it is unclear whether computed
   metrics (in-degree) can be filtered on or only imported columns.** Severity 2. "I want to type
   the condition."
6. **Step semantics unclear on the filter chip: a later step changes what an earlier degree step
   kept.** Whether degree is computed per step or on the final graph, and whether reordering steps
   changes the result, is not stated. Severity 3. "Order-dependence is exactly the Gephi bug I
   complain about."
7. **Patent ids are formatted with thousands separators.** Identifiers shown as quantities; pasting
   ids from code (no commas) or comma-separated lists into Find looks likely to fail. Severity 2.
8. **No statement on the main window that the file stays local** -- only "Assistant: Off. Nothing
   is sent." Severity 2 in this session (she noted it and moved on), higher on a first run.
9. **Layout parameters (ForceAtlas2 settings, seed) not visible** after the narrowed graph draws;
   only the engine is named. Severity 2.
10. **Zoom control inconsistent when nothing is drawn:** disabled "Zoom" on one screen, "100%" on
    the Find screen for the same undrawn graph. Severity 1.
11. **Find and filter-chip screens switch to Les Miserables** mid-task on citation data, so the step
    list could not be tried on the data she was given. Severity 1 (prototype, not product).

## What worked

- Being told what was not drawn and why, instead of a frozen view.
- First-open statistics: total degree named as total, "weak components", giant component share,
  "3,908 more, each 19 nodes or fewer", "Edges: directed, weight not set".
- The degree distribution as a log-log CCDF with in-degree 0 counted beside it, not dropped.
- The count before commit ("612 nodes, 1,843 edges, will draw"), and the "nothing matches" message
  that names the highest value.
- Denominators kept after filtering ("1,843 of 1,480,221") and the sample caution on density.
- The layout engine named plainly, CPU or WebGPU, without a warning.
- Undo on the filter toast, and steps that can be switched off without deleting them.
