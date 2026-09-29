# Session: a graph too big to draw -- Dr. Min-ji Kim, knowledge graph engineer

Participant: Min-ji, knowledge graph engineer and ontologist at a financial-services company. Owns
a 40-million-triple corporate graph; lives in SPARQL, Protege and a spreadsheet. Company Windows
laptop, integrated graphics, two 1440p monitors, reads at 110 percent. Mild red-green colour
weakness.

Task as given by the moderator: "Here is last period's citation data. Find anything worth a closer
look."

Screens, in order: the patent citation graph opened past the drawing limit (the first look, the
isolates opened in the table, the filter steps popover, the rule editor, the filtered and drawn
result, the offered sample), then Find with three pasted patent ids, then Find with an id that
does not match, then the filter chip and its steps on a small sample graph.

Outcome: finished, with difficulty. She found three things she would look at more closely, but
one of them is a number the tool itself does not explain, and she stopped trusting the filter
counts after two screens disagreed about the same filtered graph.

## Part 1 -- the first look

**Opened, nothing drawn.** "OK. It opened. Nothing on the canvas, and a box in the middle: '124,318
nodes not drawn. More than this browser draws at once (50,000). Every node is counted in Statistics
and listed in the table.' Good. That is the first time a graph tool has told me before it hung
instead of after. Neo4j Browser would be spinning now with a display limit of three hundred and
chewing through every row anyway."

"So it did load everything and it is refusing to draw it. That is the right order. Keep the
hairball in the database."

"Before anything else -- what does it think the data IS. I did not get to see an import. 'Last
import, patent-citations-s...' truncated at the bottom right. 'Edges: directed, weight not set.'
Directed is right for citations. 'Attributes 4.' The table has id, grantYear, category,
citationsReceived. Fine. That is a property graph, not a knowledge graph, and nobody is pretending
otherwise, so I will not complain about that today."

**Statistics.** "nodes 124,318, edges 1,480,221. Labelled nodes and edges, not 'items', thank you.
Density 0.0000958 -- fine, it is sparse, that tells me nothing. Average total degree 23.8. Total, so
in plus out; 2 times 1.48 million over 124 thousand is 23.8. That checks. Good."

"Isolates 2,406. Weak components 3,912. Weak -- it named which kind. Good. 116,905 nodes in the
biggest, 94.0 percent. Then 41 nodes, 23, 19, and '3,908 more, each 19 nodes or fewer'. Wait --
3,912 components, I see four, plus 3,908 is 3,912. OK, that adds up."

"That 41-node component is the first thing worth a closer look. In a citation sample a
41-patent island that cites nothing in the main body is either one company citing itself or a
data problem. Same instinct as a bad entity-resolution cluster. I would click it." (The 41 nodes
entry is a link, but in this prototype it goes nowhere. She read that as "would open its rows",
because the isolates count behaves that way.) "I assume it opens the rows the way the isolates do.
If it does not, that is a broken promise, it is blue."

**Degree distribution.** "In, Out, Total -- someone knows a citation graph is directed. In-degree,
complementary cumulative, both axes log. Correct thing to draw for a heavy tail. And the zero
count is beside it, not silently dropped off the log axis: 41,873 patents with in-degree zero, 'the
2,406 isolates are among them.' That is exactly what I would have asked and it answered it first."

"Now. Max in-degree on this curve is 238." She points at the table. "The top row, 6,117,075,
citationsReceived 779. The column header says citationsReceived 0 to 779. So which is it? A patent
cited 779 times, and the graph says the most-cited node has 238 incoming edges. That is a
known-answer check and it fails on the first screen."

"I can guess why -- citationsReceived is probably counted over all patents, and the edges are only
within this sample. But I am guessing. The screen does not say that here. If that attribute came
from the source file, it should say so beside the column, because right now the table and the
Statistics disagree and I cannot defend either number."

**Isolates opened.** She clicks the 2,406 link. "Table becomes 'Selected: 2,406 nodes, the
isolates', with a way back. Right panel: 2,406 nodes, edges between them 0, in 0, out 0. And there
it is: 'None of these patents cites or is cited by another patent in this sample. Their
citationsReceived counts citations from patents outside it.' OK. So my guess was right -- but the
explanation lives only here, under the isolates. It should be on the column, on every screen.
That is the second thing worth a closer look, by the way: an isolate with 46 citations from
outside is a sampling artefact, and whoever sampled this should know that 2,406 patents fell off
the edge."

"Also, 'Selection' -- it selected them. That is fine, but I did not ask to select anything. I asked
to see them. Minor."

## Part 2 -- narrowing

**Narrow the graph.** "One button. 'Narrow the graph...'. It opened a popover off the little chip
at the top left that says 'Full graph'. I had not noticed that chip was a control; it looked like
a label. 'Filter steps. No filter steps. Every number reads the full graph: 124,318 nodes, more
than this browser draws at once.' Suggested for this graph: 'Top 3 by total degree, with
neighbors -- a sample: favors hubs -- 586'."

"It says 'favors hubs'. At least it warns me. Hubs are the least interesting thing in a citation
graph, I already know which patents are big from the table. No."

"'Create rule set' at the top right, greyed. I do not know what that is versus a step. Skip."

**Add step, the rule editor.** "Keep Nodes or Edges. Where category is Drugs and medical, AND
citationsReceived at least 25. 612 nodes, 1,843 edges, 'will draw'. That is the thing I wanted in
Neo4j -- tell me the count before you commit, not after. Good."

"But 1,843 edges -- between the 612? Or touching them? I assume between, because the next screen
says '1,843 of 1,480,221' and that only makes sense as induced. Say 'edges between them' like the
isolates panel did."

"And I am filtering on citationsReceived, which I just established is not the in-degree in this
graph. So I am filtering on an outside number and then looking at the inside edges. I would do it
anyway, it is what an analyst would do, but it is exactly the confusion that ends up in a slide."

**Filtered and drawn.** "'Filtered to 612 of 124,318 nodes', Undo. The chip now says 'Filtered: 612
of 124K nodes, 1 step'. 124K. Rounded. The toast says 124,318 and the chip says 124K. Pick one --
I will not quote a rounded number."

"Canvas: a hairball of about 545, labels on the top ones, and a grid of little pairs and triples
on the right. ForceAtlas2, 'Engine: WebGPU'. Is position meaningful? No, it is a force layout; the
only thing position tells me is the big blob is connected. The grid on the right is honest though:
those are the 44 components, and the isolates -- 31 -- line up as dots. That I like. It shows me
the fragments instead of flinging them to the edge."

"Weak components 44, largest 545, 89.1 percent. In-degree 0 count 326, 'cited by none of the other
patents the rule keeps.' Good, it re-scoped the sentence to the filter."

"Third thing worth a look: in Drugs and medical, 31 patents with 25 or more citations have no link
to any other well-cited drug patent. That is a real question. I would want those in a list."

**The sample route.** She goes back and tries the suggested sample to see what it does. "Three
stars, 586 nodes. 'Describes a sample: top 3 by total degree, with neighbors. It favors hubs, so
density and clustering read high.' And the density row has a tag, 'sample, reads high'. That is
honest. I would never show this picture to anyone, it is three hubs by construction, but it does
not lie about what it is. Chip: 'Sample: 586 of 124K nodes'. 124K again."

## Part 3 -- Find

**Three ids pasted.** "Find is in the left panel. I paste three patent numbers, space separated.
'3 results in all 124,318 nodes', listed with category. Pasting a list of ids is exactly how I
would use this, from a SPARQL result. Click the first: right panel, 'Not drawn: the graph is past
the drawing limit. Counted everywhere.' Attributes, memberships. Fine."

"But this 'not drawn' note is now a small card at the bottom left of the canvas with a link, where
before it was a box in the middle with a button. Same state, two different looks. Which is the
real one?"

"I would have liked Find to tell me in-degree here too, the edge count in the graph, beside
citationsReceived 779. It is the same question again."

**An id that is not there.** "Different graph now, the Les Miserables one. ACC-365386. '0 matches
for ACC-365386.' Plainly said. Does it search the full 77 or the 28 filtered? It says 'in all 77
nodes'. Good, it searched outside the filter."

## Part 4 -- the filter chip, on the small graph

"Same Les Miserables graph, 28 of 77 nodes, 3 steps. Filter to Largest component 76, Filter to
degree at least 5, 41, 'Filter out group = 8', 28. And under the degree step: '3 dropped below degree
5 by Filter out group = 8'. So a step lower in the list changes the result of a step above it?
Degree is recomputed after the later filter? Then the order of the list is not the order of
evaluation, and I do not know what the 41 means any more. I read it twice. I would need the rule
written down somewhere -- is degree on the full graph or the filtered one?"

"And now the numbers. On the Find screen, same graph, same 28 of 77 nodes, 3 steps: edges 106,
density 0.280. Here: edges 105 of 254, density 0.278. One edge difference. Same filter, same
dataset, two screens. 105 over 378 is 0.278, 106 over 378 is 0.280, so each screen is consistent
with itself and they disagree with each other."

"That is it for me. That is the mismatch without an explanation. I do not care that it is one
edge; one edge is the difference between two components and one. If the product does that, I stop
trusting every count on screen."

(Moderator note: she did not continue into the other filter chip states.)

"The legend: group 4 green, 3 dark orange, 2 yellow-orange, 5 pink. The green and the orange I can
tell apart by the numbers beside them, not by the colour. There are labels, so fine."

## After the task

**What she found worth a closer look.**
1. The 41-node component isolated from the main body of citations.
2. 2,406 isolates whose citationsReceived is non-zero -- a sampling artefact that whoever made the
   sample should hear about.
3. In Drugs and medical, 31 well-cited patents with no link to any other well-cited drug patent.

And one thing about the tool: citationsReceived (up to 779) versus in-degree (up to 238) is
explained only under the isolates, nowhere else.

**Single Ease Question: 4.** "The finding part was easy -- the statistics did half my job before I
touched anything, and the count before commit is exactly right. It was the checking that was hard.
Two numbers that disagree on the first screen, explained only if you happen to click isolates. Two
screens disagreeing about one edge. And the filter order I could not reason about."

**Would she use it instead of her current tool?** "For this, a big property graph I want a first
look at without hanging my laptop? Honestly, yes, before Gephi, if the counts hold up. The
not-drawn message, the weak-components breakdown and the zero count beside the log plot are
better than what I get from anything I have used. But it is not replacing SPARQL -- I would
check every one of those numbers in a notebook first, and the day a count disagrees with my query
without a sentence explaining why, I close it. And for my actual graph it still needs to know what
a class and a literal are. This was patents. My data is triples."
