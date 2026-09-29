# Session: narrow to the biggest piece, then say who matters -- knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (study/personas/knowledge-engineer.md).
Task as given by the moderator: "Look only at the biggest connected piece, and tell me its size
and who matters most in it."
Mocks, in order: the filter chip screen, the frame at rest, the results panel.

Renders used in this session (in shots/):

- screens__filter-chip.png -- the starting screen, three filter steps already on
- r3-ke-narrow-addmenu.png -- the Add step menu open
- r3-ke-narrow-lcc-appended.png -- Largest component added after the three steps
- r3-ke-narrow-lcc-only.png -- the three steps turned off, Largest component alone
- r3-ke-narrow-none.png -- the same screen with no steps, for comparison
- screens__frame-at-rest.png -- the frame at rest, full graph
- r3-ke-narrow-rp-filtered.png -- the results panel, a betweenness result under a filter

## Transcript

**Filter chip screen, first look.**

"Les Miserables. Fine, the Knuth co-appearance graph, I know roughly what it should be: 77
characters, 254 co-occurrence pairs, and it is one connected graph. Good -- a known answer.

Right panel, Statistics. 'largest component 27'. So the answer is 27? No. Wait. The line above it
says 'Filtered graph: 27 of 77 nodes', and there are little funnel marks on every number. Somebody
left filters on. The chip on the left says '27 of 77 nodes - 3 steps'. I did not make these
steps. If I had read only the 'largest component' row I would have told you 27, and it would have
been the largest component of somebody else's filter, not of the graph. The funnels are small.
The line 'Filtered graph: 27 of 77' is what saved me, and I read counts; most people would not."

**The step list is already open.**

"Three steps: 'Filter to degree >= 2, took out 17, 60 left', 'Filter to degree >= 5, took out 20,
40 left', 'Filter out group 8, took out 13, 27 left'. And under the second one: 'keeps only nodes
with at least 5 neighbors among the 60 it reads'. Good. That tells me degree is recomputed on the
input of that step, not on the loaded graph. That is exactly the thing tools usually hide. I will
remember that line.

The moderator said the biggest connected piece. Of the graph, I assume, not of this filter. But
first let me see what the tool thinks 'largest component' means. Add step."

**Add step menu (r3-ke-narrow-addmenu.png).**

"'Filter to: Largest component, k-core..., Rule...'. 'Filter out: Rule...'. Largest component is
right there, first item. Component, not 'cluster' or 'island' -- thank you. I click it."

**After adding it (r3-ke-narrow-lcc-appended.png).**

"Fourth row: 'Filter to Largest component, took out 0 - 27 left'. Chip now '27 of 77 nodes - 4
steps'. Took out zero. So the 27 were already one piece. But it does not say so. The degree step
above had a sentence explaining what it read. This one has nothing. I want 'reads 1 connected
piece; keeps all of it'. 'Took out 0' could also mean it did not run. I only believe it because the
Statistics panel on the right still says components 1.

And it was appended at the end. It reads the 27, not the 77. That is correct for a pipeline, but it
is not the question. I do not want the biggest piece of a degree-5 filter, I want the biggest piece
of the graph. Turn the other three off."

**Three steps off (r3-ke-narrow-lcc-only.png).**

"I tick off the three checkboxes. Each says 'off - takes nothing out'. Chip: '77 of 77 nodes - 1 of 4
steps'. Largest component: 'took out 0 - 77 left'. Statistics: edges 254 of 254, components 1,
largest component 77, isolated nodes 0, average degree 6.60, density 0.0868.

Check: 2 times 254 over 77 is 6.597, so 6.60. 254 over 77 times 76 over 2, which is 2,926 pairs, is
0.0868. Those agree with each other and with what I remember of the dataset. Good. The known-answer
check passes.

So the answer to 'how big is the biggest piece' is: the whole graph. 77 nodes, 254 edges, one
component. The filter step was pointless on this graph, and the tool could have told me that before
I added it -- the Statistics panel already said components 1. I would rather it had said 'the graph
is one piece' in the menu, or greyed the item.

I would also have deleted the three old steps rather than turn them off, but I left them; the chip
says '1 of 4 steps', which is honest.

Small thing: 'Filter to Largest component' -- on a directed graph, is that weakly or strongly
connected? Here it is undirected, so it does not matter, but the row does not say, and the results
catalog in the other screen says 'Weakly connected components'. Pick one vocabulary."

**Frame at rest (screens__frame-at-rest.png), as a cross-check.**

"Full graph, no filter. Statistics: Nodes 77, Edges 254, 'undirected, weight: value', Density
0.0868, Connected components 1. Same numbers. Consistent across screens -- that matters more to me
than how it looks. Also here is where I would have started: 'Connected components 1' answers half
the question with no filter at all.

'weight: value'. So the edges carry a weight. Degree in the table is a plain count, I assume, not
the sum of weights. The column header just says 'degree'. It should say which."

**Who matters most -- the table first.**

"The node table under the canvas: 'Filtered graph: 77 of 77 nodes. Sorted by degree.' Valjean 36,
Gavroche 22, Marius 19, Javert 17. Two columns, 'degree' and 'degree on: full graph', which now
hold the same numbers -- redundant when the filter keeps everything, but I understand why it is
there. Valjean 36 is right.

But 'who matters most' is not a degree question. Which centrality? Degree says who co-occurs with
the most people. Betweenness says who connects the book's threads. In Les Miserables both say
Valjean, but I am not going to answer with degree and call it 'mattering'. Where do I run
betweenness? The rail on the left says 'Results'. I click it."

**Results panel (r3-ke-narrow-rp-filtered.png).**

"In the prototype the Results button on the filter screen does nothing; the moderator hands me the
results screen instead. It shows Betweenness already run, and -- careful -- its Scope says
'Filtered graph, 60 of 77', and the run record says 'after Filter to degree >= 2'. That is not my
filter. Mine was Largest component, 77 of 77. So this result is for a different subgraph, and I
am not going to quote its numbers as the answer.

What I do like, a lot: the run record. 'Method: Brandes betweenness, exact: every node is a source.
Normalization: divided by (n-1)(n-2)/2 = 1,711 node pairs; n = 60, the filtered graph. Weight
conversion: none, unweighted. Scope: filtered graph, 60 of 77: after Filter to degree >= 2.' It
names the algorithm, the normalization, the n, and the filter step. That is the first graph tool
I have seen that tells me which betweenness it computed. I can reproduce that in networkx.

Top nodes: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073. 'No near-ties
in the top 5.' Fine.

Two things bother me. 'zero: 32 nodes, all 29=' -- what is 'all 29='? That reads like a broken
string. On a real screen, one line of garbage next to a number and I start distrusting the
numbers beside it. And 32 of 60 nodes with zero betweenness after removing the degree-1 nodes --
possible, there are cliques in this book, but I would check it.

Second, Weight says 'None declared', but the frame at rest said the edges have 'weight: value'. So
which is it? Either the result ignored a weight that exists, or the frame is wrong. The run record
says 'unweighted', which is at least explicit. I would want the Weight field to say 'value exists,
not used' rather than 'None declared'."

**My answer to the moderator.**

"The biggest connected piece is the whole graph: 77 nodes, 254 edges, one component. Nothing to
cut. Who matters most: Valjean. Degree 36, twice the next one. For betweenness I can only give you
the number on a different filter, 0.419 on the 60-node degree >= 2 graph, and he is still first by
a wide margin. If you want betweenness on exactly my piece, I would have to run it with Scope
'Filtered graph, 77 of 77', which is the full graph in disguise."

## Single Ease Question

5 of 7.

"Adding the step was one click and the numbers were right. What cost me was the starting state:
somebody else's three filters, and a 'largest component 27' that is the right label on the wrong
graph. And for 'who matters' the tool hands me degree by default and makes me go elsewhere to
choose a real centrality."

## Would she use this instead of her current tool?

"Instead of SPARQL and a spreadsheet? No -- it does not read Turtle, and a CSV export loses my
datatypes and named graphs. For this kind of question on an export -- how many components, is
there one monster cluster from a bad merge, who is the hub -- yes, I would use it, and faster than
writing the SPARQL for connected components, which is painful. The step list that says what each
step read, and the run record that names Brandes and the normalization, are the reasons. The
first time a number disagrees with my SPARQL count and the screen cannot say why, I stop."

## Problems observed

1. A filter left on from before made "largest component 27" look like the answer; only the small
   "Filtered graph: 27 of 77" line and funnel marks said it was a filtered number. (severity 3)
2. The Largest component step appended after existing steps reads their output, not the graph; the
   task needed the three old steps turned off first, and nothing pointed that out. (severity 2)
3. On a graph already in one piece the step reads "took out 0" with no note; it should say it
   read one connected piece and kept all of it, or the menu should say the graph is one piece.
   (severity 2)
4. The node table sorts by degree and offers nothing else; "who matters most" needs a named
   centrality, which lives in a different panel the filter screen's Results button does not open
   in the prototype. (severity 2)
5. The results panel shows a betweenness run on a different filter (degree >= 2, 60 of 77), so the
   task's own scope never appears there. (severity 2)
6. "zero: 32 nodes, all 29=" in the betweenness distribution reads as a broken string. (severity 2)
7. Frame at rest says edges carry "weight: value"; the result's Weight field says "None declared".
   (severity 2)
8. "Largest component" does not say weak or strong; the results catalog elsewhere says "Weakly
   connected components". (severity 1)
9. "degree" and "degree on: full graph" columns repeat identical numbers when the filter keeps all
   nodes. (severity 1)
