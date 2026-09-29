# Session: a graph too big to draw -- Chris, ML engineer (recommendations)

Participant: Chris, senior ML engineer on a retail recommendations team (see
`../../personas/ml-engineer-recsys.md`). Laptop size, 1440 by 900.

Task as given by the moderator, and nothing more: "Here is last period's citation data. Find
anything worth a closer look."

Screens used, in order: the drawing-limit screen (a 124,318-patent citation graph that is too big
to draw), Find, and the filter chip. The filter chip mock shows a small character co-appearance
graph rather than the patents; the moderator said to treat it as "how the filter works".

## Think-aloud transcript

**Opening the file (not-drawn state).**

"OK, first thing -- I didn't import this, you did. So I'm not testing the part I care most about,
which is whether it eats my Parquet. Noted, moving on.

Empty canvas, box in the middle: '124,318 nodes not drawn. More than this browser draws at once
(50,000). Every node is counted in Statistics and listed in the table.' Good. Honestly that's the
best thing I've seen from one of these tools. Gephi would have sat there spinning the fan for ten
minutes and then shown me a grey hairball. This just tells me the number and the limit. I believe
it.

Right side, Statistics. Nodes 124,318, edges 1,480,221, density 0.0000958, average total degree
23.8 -- 2 times 1.48M over 124k is 23.8, fine, and it says 'total', so in plus out. Isolates
2,406. Weak components 3,912, and the big one is 116,905 nodes, 94.0 percent. So it's basically
one giant component plus dust. Expected for citations.

Degree distribution, In selected. 'Nodes with in-degree k or more, both axes log.' That's a CCDF
on log-log. Nice, that's actually the plot I'd make in the notebook. Heavy tail, max 236. And
underneath: 'In-degree 0, not on the log axis: 41,873. Never cited by a patent in this sample.'
That's the denominator I always ask for and it's just there. A third of the patents are never
cited inside the sample. That's worth a closer look already -- that's my long tail.

Wait. Table's sorted by citationsReceived and the top row is 779. The chart says max in-degree
236. Which one is the degree? Those can't both be the citation count of 6,117,075." (Pauses, reads
the column header.) "citationsReceived, 0 to 779. OK, I'm guessing that's a column that came in
the file and the chart is computed from the edges in this sample. That's the classic
'feature table vs graph' mismatch. Nothing on this screen tells me that, though. I only figure it
out because I've been burned by it."

**Clicking the isolates count (state 1b).**

"Isolates is a link, click it. Table now says 'Selected: 2,406 nodes, the isolates.' Top one has
citationsReceived 46 -- an isolate with 46 citations. And there it is, the inspector explains it:
'citationsReceived counts citations from patents outside it.' OK, so my guess was right. That
sentence should be on the first screen, next to the chart, not buried in the isolates view. Most
people will never click the isolates.

Also -- the table has no in-degree column. The graph-computed degree is only in the chart. I want
to sort the table by in-degree and by citationsReceived side by side and look at the ones where
they disagree the most. That's the 'closer look' I'd actually do. Model score versus heuristic,
same instinct. Can't do it here."

**Narrow the graph... (the filter chip's list).**

"Blue button, 'Narrow the graph...'. Opens a list: 'Top 3 by total degree, with neighbors -- a
sample: favors hubs -- 586.' At least it admits it's hubs. Hubs are the least interesting thing in
a citation graph; I already know from the table who's most cited. Skip. 'Add step.'

I'd rather write a rule."

**Rule editor.**

"Keep Nodes, where category is Drugs and medical, AND citationsReceived >= 25. Bottom line says
'612 nodes, 1,843 edges, will draw' before I commit. That's good. That's the thing -- I get the
count before it does anything. I tried citationsReceived >= 5 alone: '58,316 nodes, 702,440 edges,
will not draw: more than this browser draws at once.' Clear. And >= 800 says 'No nodes match. The
highest citationsReceived in Drugs and medical is 779.' That's a thoughtful error message, I'll
give them that.

Filter to."

**Narrowed and drawn.**

"Chip says 'Filtered: 612 of 124K nodes, 1 step.' Toast: 'Filtered to 612 of 124,318 nodes,
Undo.' Statistics now: edges '1,843 of 1,480,221', 44 components, 31 isolates, a new in-degree
chart with max 158, and 326 with in-degree 0.

And the canvas... is a hairball. A 600-node grey ball with a halo of little components on the
right. Every time. 'Gray because no style layer is bound yet', fine, but even colored this tells me
nothing. The labels overlap in the middle. The Statistics and the chart are more useful than the
picture. What I'd want now is: pick one patent in that ball and see its 2-hop, not the ball.

Layout row says 'Engine: WebGPU' and a play button. No timing. If you're going to tell me it's on
the GPU, tell me it took 0.8 seconds, otherwise it's a badge."

**The sample route, out of curiosity.**

"Went back and tried the hubs sample anyway. Three starbursts, 586 nodes, and Statistics have a
note at the top: 'Describes a sample... density and clustering read high.' And density has a
'sample, reads high' tag. That's honest, I like that.

But hold on. 'Top 3 by total degree, with neighbors.' 6,117,075 is one of the three hubs. On the
full graph the in-degree chart said max 236, and your earlier note said that's 6,117,075. If you
kept all its neighbors, its in-degree in the sample should still be 236. The sample chart says max
217. So either 'with neighbors' drops some neighbors, or one of these numbers is wrong. Either way,
now I don't trust the sample stats. This is exactly the kind of thing that makes me go back to
networkx -- 15 lines and I know what I computed."

**Find, past the drawing limit.**

"Back to the full graph. What I really want: one specific patent and its neighborhood. Search
icon in Graphs. I paste three ids, '6,117,075 6,231,106 6,287,586' -- '3 results in all 124,318
nodes.' Pasting a list of ids works, good, that's how I'd paste candidate ids out of a notebook.

But why are the ids printed with commas? 6,117,075. That's an identifier, not a quantity. If my
item ids come out as '6,117,075' it means you parsed them as numbers. What happens to an id with a
leading zero, or 'SKU-00481'? And if I type 6117075 without commas, does it match? The screen
doesn't tell me. That's my ids-getting-mangled alarm going off.

Inspector for 6,117,075: 'Not drawn: the graph is past the drawing limit. Counted everywhere.'
Attributes: grantYear 2000, category, citationsReceived 779. No in-degree, no out-degree. So on
the node I care about, I can't see the graph number, only the file number. That's backwards for a
graph tool.

Icons up top on the inspector: a forky one with a caret, a funnel, three dots. Hovering the forky
one: 'Select neighbors'. Caret: 'Neighbor options.' I'm guessing the caret is where hops live --
1-hop, 2-hop, in, out? Nothing shows me. Then I guess Funnel is 'Filter to' the selection, which
would give me the ego graph drawn. Two clicks, and I'm guessing at both. I'd have liked one thing
called 'Show 2-hop neighborhood' that tells me the node and edge count before it draws, like the
rule editor does. I gave it about 30 seconds, then I'd go look for a command palette." (Moderator
notes: he looked for Cmd+K; the Quick actions tab exists on the Find screen but he did not open
it.)

**Filter chip (the co-appearance example).**

"This is the list of steps. Each step shows what's left after it -- 76, 41, 28 -- and one says '3
dropped below degree 5 by Filter out group = 8'. Checkboxes to turn a step off. That's basically a
pipeline of dataframe filters with row counts after each one, which is how I think anyway. Good.
On the patent screen the step row said '-123,706' and '612' -- what it removed and what's left.
Nice.

'Counting...' with a spinner while a big graph recounts -- as long as that's seconds, fine. If it
sits there with no number past ten seconds I'll assume it hung.

Export files... is up in the corner. I didn't click it because nothing tells me what it writes.
If it's the 612 nodes as CSV with the original ids -- not '6,117,075' -- then fine. If it's a
picture, useless to me."

## What he found for the task

- A third of the patents (41,873) are never cited inside the sample; 2,406 are fully isolated.
- One giant component holds 94.0 percent; the rest is dust (3,912 components).
- The file's citationsReceived and the in-sample in-degree disagree a lot (an isolate with 46
  citations); the ones with the biggest gap are what he would look at next, but the table cannot
  show in-degree, so he could not rank them.
- The most cited patents (6,117,075 and the rest of the table's top rows) -- "the boring answer".

## Single Ease Question

**4 of 7.** "Getting numbers was easy. Getting from the numbers to one patent's neighborhood was
guesswork, and one of the numbers doesn't add up."

## Would he use this instead of his current tool?

"Not instead of the notebook. Maybe next to it. The not-drawn screen with the stats and the
log-log degree chart is genuinely better than what I get from Gephi, and it's faster than me
writing the CCDF plot -- if it loads my 10M-edge interaction table locally, I'd open it for a
first look at a new dataset. But my actual job is 'why did retrieval pull this item for this
user', which is one node's 2-hop neighborhood with my scores on it, and I couldn't get there
without guessing. And until I see it import Parquet, keep my ids as strings and export the subset,
it stays a toy."
