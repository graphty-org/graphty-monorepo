# Session: first weighted run -- Dr. Min-ji Kim, knowledge graph engineer

Task given by the moderator: "Run PageRank on a network whose edges have a confidence column you
have never thought about."

Screens used: the measure-options screen (first frame: the 300-protein network, Betweenness
open, weight question showing) and the results panel (PageRank running and finished frames).

## Transcript (think-aloud)

**1. Landing on the options screen.**
"OK. Human protein interactions, 300 nodes, 1,262 edges. Right side, Statistics: 'weight --
confidence, meaning not set.' Good. That is the first honest thing I have seen in a viewer in a
while: it knows there is a numeric column on the edges and it admits it does not know what the
number means. In my world 'confidence' is almost always the entity-resolution or extraction
score, how sure the pipeline is that the statement is true. So it is not a distance. Keep that in
mind."

**2. Wait -- this is Betweenness, not PageRank.**
"The panel that is open says Betweenness. I was asked for PageRank. PageRank is in the Catalog
list on the left, under Centrality. I click it."
(Moderator: in the prototype, PageRank in the Catalog is not clickable; the only weighted-form
frame is the Betweenness one.)
"Nothing. So I cannot see what PageRank's form looks like on this graph. I will have to reason
from the Betweenness form and the other screen, which I do not love -- the whole question is
what PageRank does with my weight, and the one form I can look at is for a different measure."

**3. Reading the weight question.**
"'In confidence, does a bigger number mean a stronger tie, a longer distance, or an amount that
flows? Examples: 0.99, 0.79, 0.40.' That is a good question. Better than a checkbox that says
'weighted'. And it shows real values from my column, which tells me it is 0 to 1, not 0 to 100.
Stronger tie -- similarity. Longer distance -- distance. Amount that flows -- capacity. The
secondary words are the proper terms, I appreciate that they are there and not instead of the
plain words."

"For confidence the answer is obviously 'Stronger tie'. A statement we are 0.99 sure of should
count more than one we are 0.40 sure of. Although -- honestly -- for PageRank I would argue it
should not be a weight at all, it should be a filter. I do not want a 0.40 edge to count 40
percent; I want edges below some threshold gone. There is no threshold here. Fine, that is
Scope, maybe. I will not go looking."

**4. The line under the Weight field.**
"'Read as a distance. Not used while its meaning is not set.' That is about Betweenness. So for
Betweenness, if I do nothing, confidence is ignored. Fine."

**5. The note that pops out next to it.**
"'Until it is set, paths and Betweenness leave confidence out. PageRank and community detection
read a bigger number as a stronger tie.'"
"Hold on. So 'not set' does NOT mean 'not used' for PageRank. For PageRank, not answering the
question means it silently assumes stronger tie and uses the column. For Betweenness, not
answering means ignore it. The same unanswered state does two opposite things depending on the
measure. That is exactly the kind of default I would never find unless I read a tooltip. And
the only place it is written is a hover card next to a Betweenness form."
"In my case the assumption happens to be the right one. On someone else's graph where the column
is a cost, PageRank would have quietly ranked by the wrong thing and the form would say 'not
set' the whole time."

**6. 'Not sure -- decide later'.**
"There is an info icon. Presumably the same text. 'Kept on confidence, so no run asks again.'
So if I pick 'Not sure' it never asks again? Then 'decide later' is a lie -- later never comes.
I would call that 'Leave unset' and say what each measure does with it. I am not picking that."

**7. 'How it is converted'.**
"Collapsed link. I click it -- in a real session I would, because if I say 'stronger tie' and
then Betweenness wants a distance, something turns 0.99 into a distance. I want to know if it is
1/w, 1 - w or minus log w; those give very different betweenness."
(The prototype notes say it lists those three conversions.)
"Good that it exists. For PageRank it should not matter, PageRank uses the strength directly.
Does it normalize per node? Out-weight divided by total out-weight? That is what I would assume,
but nothing says it."

**8. I choose 'Stronger tie' and go to the PageRank result.**
"'Kept on confidence' -- so the answer is stored on the column, not on this run. That is right;
it is a property of the data, not of the measure. I would want to see it in the export though,
so the meaning travels with the file."
"Now the results panel. The PageRank frames are on a different graph -- patent citations -- and
Weight says 'None declared'. So I cannot see what a PageRank run on my weighted protein network
looks like. I expected the state line to say 'Weighted by confidence, bigger is stronger'. The
Betweenness frame says 'Exact. Unweighted, undirected.' -- that format is good. If the PageRank
line said 'Weighted: confidence (stronger tie)' I would be satisfied."
"Also: the finished frame for the SAME protein network says 'Edges: undirected, no weight' in
Statistics. The first screen said 'weight: confidence, meaning not set'. Which is it? Does this
graph have a weight column or not? One of those two numbers-panels is wrong, and I do not know
which one to believe."

**9. 'None declared'.**
"'Weight: None declared.' Declared by whom? By me? By the file? If my file has a numeric edge
column that nobody has 'declared', does it show up in that dropdown or not? I would open the
dropdown to find out."

## Single Ease Question

**4 of 7.** The question itself is easy and well phrased; I answered it in five seconds. What
made it hard was everything around it: PageRank could not be opened, the only form I saw belonged
to another measure, and I found out from a hover card that 'not set' means 'used as a strength'
for PageRank. I cannot confirm from the screens that my run was weighted.

## Would I use this instead of my current tool?

"For this job my current tool is networkx in a notebook: `nx.pagerank(G, weight='confidence')`.
One line, and I know exactly what it does. This screen is better than networkx at one thing --
it asks me what the number means instead of assuming, and it remembers the answer on the column.
That is genuinely good and I have not seen a GUI do it. But it only earns my trust if the result
tells me afterwards, on the result, which column it used and in which direction. Right now the
defaults differ between measures and the evidence is a tooltip. Not yet. Show me the weight on
the result's state line and make 'not set' mean the same thing everywhere, and I would use it
for the first look before the notebook."

## Problems observed

1. PageRank in the Catalog does nothing; the weight question can only be seen on Betweenness.
   The task could not be performed on the measure asked for. (Prototype coverage gap.) Severity 3.
2. An unanswered weight means opposite things per measure: ignored by paths and Betweenness,
   used as a strength by PageRank and community detection. The only disclosure is a hover card
   beside a Betweenness form. Severity 3.
3. "Not sure -- decide later" is final ("no run asks again"); the label promises a later that
   never comes. Severity 2.
4. The same protein network shows "weight: confidence, meaning not set" on one screen and "Edges:
   undirected, no weight" on another. A count/metadata contradiction costs trust. Severity 3.
5. The PageRank result frames show no weighted run, so there is no evidence the state line names
   the weight column and its reading. Severity 2.
6. "None declared" does not say whether an undeclared numeric column is offered. Severity 1.
7. Minor: search box reads "Find a result or algorithm" on one screen and "Find a result or
   method" on another. Severity 1.

## Quote

"The question is the right question. But if I skip it, PageRank uses my confidence as a strength
and Betweenness throws it away, and the only place that says so is a tooltip on the wrong measure."
