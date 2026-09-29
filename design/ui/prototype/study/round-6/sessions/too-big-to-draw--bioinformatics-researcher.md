# Session: a graph too big to draw -- Dr. Chen, computational biologist

Participant: Dr. Chen (persona: study/personas/bioinformatics-researcher.md). Fifteen years of protein
interaction networks; Cytoscape for figures, R and igraph for anything she has to reproduce. She has
watched a 600k-edge interactome merge sit at "finalizing" for a day, and she distrusts any tool that
rounds a number or hides what it dropped.

Task as read by the moderator: "This citation data is too big to draw. Is anything here worth a look?"

Screens seen, as a participant sees them (design notes hidden), in the order she met them:

- screens/past-drawing-limit.html, first state (shots/tasks/too-big-to-draw/01-past-drawing-limit.png),
  then the states she reached by clicking: isolates opened, Narrow the graph..., Keep top rows, the 200
  kept and drawn, the rule editor, the rule's 612 drawn, and the two-step sample
  (tmp/chen-r6-toobig/pdl-isolates.png, pdl-narrow.png, pdl-keep.png, pdl-kept.png, pdl-rule.png,
  pdl-drawn.png, pdl-sample.png)
- screens/find.html, state 7, past the drawing limit (shots/tasks/too-big-to-draw/02-find-s7.png)
- screens/table-dock.html, the large-graph state (shots/tasks/too-big-to-draw/03-table-dock-limit.png)
- screens/selection-over-cap.html, all frames (tmp/chen-r6-toobig/soc.png)

## Think-aloud

### 1. First look: nothing drawn

"Patent citations. Not my field, but a citation graph is a directed graph like any other. 124,318 nodes
not drawn, 'more than this browser draws at once (50,000)'. Good. It tells me the limit and the number.
That is precisely what the stringApp never did for me: it said 'null'. So I already like it more than I
expected to.

The table is there with every row, sorted by citationsReceived, highest first. Statistics on the right:
124,318 nodes, 1,480,221 edges, density 0.0000958, average total degree 23.8. Let me check that.
Two times 1.48 million over 124 thousand is 23.8. Fine. Density, 1.48 million over n times n minus one,
is about 9.6e-5, so that's the directed density. It should say directed, but the numbers agree with
themselves.

Isolates 2,406, weak components 3,912, the big one 116,905 nodes, 94.0%. That's 94.04, fine. And then
41, 23, 19 nodes, and '3,908 more, each 19 nodes or fewer'. That's actually a nice way to say it.

Now the degree distribution. In-degree, both axes log, complementary cumulative, 'max 236'. Hold on.
The top row of the table says citationsReceived 779. The maximum in-degree is 236. Those are not the same
number. Then underneath: 'In-degree 0, not on the log axis: 41,873. Never cited by a patent in this
sample.' In this sample. So citationsReceived is a column that came with the file, counted against
the whole patent database, and in-degree is what's actually inside this file. OK, I think I see it, but
I had to reason it out from the word 'sample'. If I had pasted this into a figure legend I'd have got it
wrong. The column header should say where that number comes from, or the table should give me in-degree
as a column next to it."

### 2. The isolates

"I click 2,406 isolates. It selects them and the table shows them: 'Selected: 2,406 nodes, the isolates'.
The first one has citationsReceived 46 and the panel says in-degree 0, out-degree 0, and in plain words:
'Their citationsReceived counts citations from patents outside it.' Right, that confirms what I worked out.
This is the sentence I wanted on the first screen, not one click deep. But it's here, and it's correct,
and 'Show full graph' gets me back. Good."

### 3. Narrow the graph

"The one blue button. It opens a small panel off the 'Full graph' chip: 'No filter steps. Every number
reads the full graph: 124,318 nodes, more than this browser draws at once.' Two suggestions: keep top rows
by citationsReceived, or neighbours of a node. And 'Add step'. It covers half of the message it came
from, but it repeats the count, so I don't lose anything.

Keep top rows. First 200, citationsReceived, highest first. And then this: 'Row 200 has citationsReceived
358; 1 more patent also has 358 and is left out.' Oh, that is good. Nobody tells you about the tie at the
cut. My students cut 'top 10 hub genes' all the time and never check whether number 11 has the same
degree. My only complaint: which one is left out, and on what rule? Row order? Patent number? If the tie
break is arbitrary, I want to know that it is, and I want an option to keep the ties.

'200 nodes, 288 edges, will draw.' It tells me the edge count before I commit. Fine. Keep these 200
rows."

### 4. The 200 most cited, drawn

"Now there's a picture. Gray, arrows, labelled with patent numbers. A 'Filtered to 200 of 124,318 nodes'
toast with Undo. The chip says '200 of 124K nodes, 1 step'. 124K. Everywhere else the number is exact;
on the chip it's rounded. I know it's for space, but I dislike it on principle.

Statistics now: 'Describes the 200 most cited patents, not a random sample. Density reads high: highly
cited patents cite each other.' Density 0.00724 with a 'reads high' tag. I check: 288 over 200 times
199, 0.00724. Average degree 2.9, correct. 16 isolates, 21 components. In-degree max 17, and 72 of the
200 are cited by none of the others.

That is the honest statement. The most-cited patents mostly don't cite each other; this is a picture of
a selection effect, and the tool says so. That's more caveat than I get from Cytoscape, ever."

### 5. Writing a rule instead

"Back up. The rule editor: Keep nodes, where category is 'Drugs and medical', AND citationsReceived
>= 25. '612 nodes, 1,843 edges, will draw.' Filter to.

Drawn: 612, 1,843 edges, density 0.00493, average total degree 6.0. 612 times 611 into 1,843, yes. 44
components, 545 nodes in the big one, 89.1%, 31 isolates. The picture is a hairball in the middle and a
little grid of small pieces on the right. The grid of isolates and pairs off to the side I actually like;
it doesn't pretend they're part of the blob.

The blob itself is ForceAtlas2, 'Engine: WebGPU'. No seed shown on the row. If I press play twice, do I
get the same blob? I would not put this picture in a paper, but I wasn't going to. What I'd take away is
the table and the numbers.

And in the large-graph table, the rule turned up as a set, 'Drug patents cited 25+', rule, 612, with a
member column in the table and a highlight layer in the style stack. So I could have kept the whole
graph and just marked those 612. That's the distinction I want: filter changes the numbers, a set just
labels rows. It's there, if you look for it."

### 6. The two-step sample

"'586 of 124K nodes, 2 steps': the 3 most cited, then their neighbours. Three big starbursts joined by a
handful of patents in between: 6228917, 5882034, 6018952 and a couple more. And the note: 'not a random
sample. It favors hubs, so density and clustering read high.'

This is the one I'd actually look at. The patents sitting between the three hubs are the interesting ones,
the bridges. In my world, that's the gene that sits between two modules. I'd want betweenness on this,
but I'd want it on the full graph, not on this biased 586, and I'd want the tool to warn me if I ran it
on the sample. It hasn't let me do that here, so I can't tell."

### 7. Find, on a graph it isn't drawing

"I paste three patent numbers into Find. '3 results in all 124,318 nodes.' It found all three, even
though nothing is drawn. The panel on the right: 'Not drawn: the graph is past the drawing limit. Counted
everywhere.' Attributes: grantYear 2000, Drugs and medical, citationsReceived 779.

What it doesn't show is the node's degree in this graph. Two icons at the top: 'Select neighbors' and
'Filter to', from the tooltips. So I could get its neighbourhood, and presumably that would be small
enough to draw. That's how I'd use it with the interactome: find my 30 seed genes, take the first shell,
draw that. But I'd like in-degree and out-degree on this panel without having to go and fetch them."

### 8. The last screens

"This one isn't my data at all. 'Transfers, March 2026', flagged accounts, a hexagon density plot, a lasso
around the whole thing with '12,113' on it. 3,000 nodes and 9,113 edges is 12,113 elements, I suppose.
Then an Edit menu with Undo 'Add style layer Flagged accounts' and Redo 'Create set Mule ring'. I don't
see what this has to do with citations. I skipped it."

## Answers

**Single Ease Question: 6 of 7.**

"It didn't hide anything. It told me the limit and the number, it gave me the statistics without the
picture, it showed the edge count before I cut, it told me about the tie at the cut, and it said out loud
that the top-200 view is biased. I can't remember the last time a tool told me my own filter was
inflating the density. Not a 7 because I had to work out the citationsReceived versus in-degree business
for myself, and because I still don't know which patent lost the tie or whether the layout has a seed."

**Would she use this instead of her current tool?**

"Instead of Cytoscape for looking at a network that's too big to look at, yes, probably. Cytoscape would
have tried to draw 124,000 nodes and I'd have gone for coffee and come back to a frozen window. Here I get
the counts, the table, and three honest ways down. Instead of igraph, no. I haven't seen how I get this
from R, and I don't know whether 'Export table' gives me in-degree as a column. If it does, and it writes
the filter steps into the methods file, then it sits next to R rather than replacing it, and that's the
best any GUI gets from me."

## Findings

Ranked by what they cost her.

1. **citationsReceived and in-degree are different numbers with no label telling them apart.** The table's
   top row says 779; the degree distribution says max 236. The explanation ("counts citations from patents
   outside it") appears only after she opened the isolates. She reasoned it out, but a less careful reader
   would quote the wrong one. Severity 3.
2. **The tie at the Keep top rows cut is disclosed, but not resolved.** "1 more patent also has 358 and
   is left out" does not say which patent, or by what order ties are broken, and offers no "keep ties".
   Severity 2.
3. **The Find inspector for an undrawn node shows no degree.** The attributes are there, in- and
   out-degree in this graph are not, which is what she'd check first before taking its neighbours.
   Severity 2.
4. **Density is not labelled directed or undirected.** The numbers are directed and consistent, but she
   had to compute it to find out. Severity 1.
5. **ForceAtlas2's row names the engine but no seed.** She would not trust the drawn blob without one.
   Severity 1.
6. **The filter chip rounds ("200 of 124K nodes") where every other place is exact.** Severity 1.
7. **The selection-over-cap screens show a different dataset (bank transfers) and an unlabelled
   "12,113" badge.** They had no bearing on her task and she skipped them. Severity 1.

What she liked, in her words: "It said the limit and the number." "It told me about the tie at the cut."
"It said my top-200 was biased, and marked the density that it inflates." "It found my three IDs in a
graph it wasn't drawing."
