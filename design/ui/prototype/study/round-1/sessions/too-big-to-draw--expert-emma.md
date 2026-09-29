# Session: a graph too big to draw -- Expert Emma

Participant: Expert Emma (network scientist, notebook-first, uses Gephi for final figures).
Task, as the moderator gave it: "Here is last period's citation data. Find anything worth a
closer look."
Screens worked through, in order: the frame past the drawing limit, Find, the filter chip and
its steps. Emma looked at the rendered screens and was told what a control does when she asked
to click it, as with a clickable prototype. Magenta annotation markers were ignored as not part
of the product.

## Transcript (thinking aloud)

**Opening the file.** "OK. Patent citations, 124,318 nodes. Canvas is empty. Good, actually.
It says '124,318 nodes not drawn: more than this browser draws at once (50,000).' That is an
honest error message with the limit in it. I have waited ten minutes for Gephi to recenter a
graph this size, so an empty canvas that tells me why is fine by me."

"First thing I want to know: where did the file go. I see 'Last import patent-citations-s...'
on the right. Nothing on this screen says it stayed on my laptop. I would go hunting for a
privacy or 'how it works' page before I did anything else with client data. For last period's
public patents I will carry on, but note that I looked and did not find it."

"Right panel, Statistics. nodes 124,318, edges 1,480,221, density 0.0000958, average degree
23.8. Let me check: 1,480,221 over 124,318 times 124,317 is about 9.6e-5, so they used the
directed denominator. Average degree 23.8 is 2m/n, so total degree, in plus out. Fine, those
are consistent. 'Edges: directed, weight not set' -- good, it detected direction and it says
there is no weight instead of pretending. That is my step four passed."

"Components 3,912, the biggest has 116,905 nodes, 94.0%. Weakly connected, I assume, since it
is directed. It does not say weak or strong. For a citation graph strong components are nearly
meaningless -- it is close to a DAG -- so it should be weak, but I would like the word."

"Isolates 2,406. That is worth a look already -- patents in the sample that cite nothing in the
sample and are cited by nothing. Probably boundary effects of the sampling window. I would want
to click that number and get those rows in the table. Can I? The row does not look clickable."

"Table. Sorted by citationsReceived, highest first: 6,117,075 with 779, Drugs and medical.
Is citationsReceived the attribute from the file, or in-degree computed here? If it is the file
attribute, it counts citations from outside this sample too, and it will not match in-degree.
I would want an in-degree column next to it to compare. No button for that on this screen."

"What I actually want first is the degree distribution. In-degree, log-log. That is where
anything 'worth a closer look' in citation data shows up. Statistics has 'Overview: General'
and '4 more'. Maybe it is behind '4 more'. Not on the first screen, anyway."

**Narrow the graph.** "Fine, click 'Narrow the graph...'. A popover: 'No filter steps. Every
number reads the full graph.' Suggested: 'Top 3 by degree, with neighbors -- a sample: favors
hubs -- 586'. At least it admits it favors hubs. Which degree? This is a directed graph. Top 3
by in-degree is 'most cited'; by out-degree is 'longest reference list', which is a different
and much less interesting set. Total degree mixes both. It does not say. I am not clicking a
sample I cannot describe in a methods section."

"'Add step'. New rule. Keep: Nodes. Where category is Drugs and medical, AND citationsReceived
>= 25. Dropdowns, one condition at a time. I would much rather type
category == 'Drugs and medical' and citationsReceived >= 25. This is the Gephi filter panel
again, just tidier. But -- 'Scope: Full graph, no steps above' and '612 nodes, 1,843 edges will
draw' before I commit. That I like. Gephi makes you run the filter to find out it was empty."

**Drawn.** "Filter to. Toast: 'Filtered to 612 of 124,318 nodes', with Undo. The chip says
'Filtered: 612 of 124K nodes, 1 step'. Why 124K on the chip when every other place says
124,318? Small, but I copy numbers from wherever I happen to be looking."

"Statistics now: 612 nodes, edges '1,843 of 1,480,221', density 0.00493, average degree 6.0,
isolates 31, components 44, largest 545 at 89.1%. The 'of 1,480,221' tells me the statistics
follow the filter. Good. Density 1,843 over 612 times 611 is 0.00493, checks. The picture is a
hairball in the middle with 43 little bits laid out in a grid to the right. I do not read
anything off the hairball. The small components are more interesting -- drug patents with 25+
citations that do not connect to the main body. That is my 'closer look' candidate. How do I
get just those into the table? I would expect a right-click on a component size in Statistics,
or a filter step 'not in largest component'. The filter chip screen later shows a 'Largest
component' step, so the inverse might exist. Not sure."

**Same view, the other state.** "Now this frame with the layout on the CPU. 'ForceAtlas2, on
the CPU: this browser has no WebGPU.' Said plainly, no drama. Good. But hold on. Same chip,
'Filtered: 612 of 124,318 nodes'. Edges 1,904. Components 1. Density 0.0051. Max degree 92.
The other frame said 1,843 edges and 44 components for the same 612 nodes. Is that the same
filter? If it is, the number changed because the engine changed, and that is exactly what I
cannot have. The table header here also still says category '6 values' and citationsReceived
'0 to 779' while every row is Drugs and medical -- the other frame said '1 value' and '25 to
779'. One of these is stale. I would stop here in a real session and write down steps."

(Moderator: this frame shows the no-WebGPU case; please treat the filter as the same.)
"Then the numbers disagree and I want to know why. 61 edges and 43 components do not come from
a layout engine."

**Sample route.** "OK, for completeness, the sample. 'Sample: 586 of 124K nodes, 1 step'. The
Statistics box: 'Describes a sample: top 3 by degree, with neighbors. It favors hubs, so
density and clustering read high.' Density has a little tag 'sample, reads high'. That is
honest, I like that a lot. It would stop a junior putting 0.0026 in a report as the density of
the network. Clustering is mentioned but I do not see a clustering row. And still -- which
degree."

"Three stars, obviously. Three hub patents and their neighbours. It is a picture of the
selection rule, not of the data. Nothing worth a closer look here that the table did not
already tell me: 6,117,075, 6,031,111, 5,960,121 are the most cited."

**Find.** "Search. It switched to Les Miserables -- fine, the moderator says it is the same
search box. I type 'thenard'. Two results, Thenardier 'group 4, degree 11' and Mme.Thenardier
'degree 9'. The table shows degree for the filtered graph and for the full graph in two
columns, labelled. Good. The inspector says 'degree 11 -- 16 in the full graph'. Good."

"On the other Find frame the same Thenardier row says 'degree 16'. So the hit list sometimes
shows filtered degree and sometimes full degree, with the same label."

"'ma' -- 14 results, 10 filtered out, and each says which step removed it: 'Filtered out by
Filter to degree >= 5'. That is very good. But Gillenormand and Mlle.Gillenormand say 'degree
3' and are not filtered out, and there is a 'degree >= 5' step. So that 3 must be degree in the
filtered graph, while the step ran on an earlier graph. Probably right, but the list does not
tell me, and it reads like the filter is broken."

"Betweenness column: Valjean 0.547. My memory of networkx normalized betweenness on Les Mis is
nearer 0.57, but I do not trust my memory to three decimals and I do not know which Les Mis
this is. The column does not say normalized or raw, or how. I would check it in the notebook
before I believed any of them."

"Typing 'betweenness' into Find offers 'Run Betweenness centrality...' as a command. OK, that
is a shortcut. The Quick actions list 'who matters most' -- Degree, Betweenness, Closeness,
PageRank, Eigenvector, Katz. At least they are named properly and not 'influence score'.
'HITS gives the same here' on an undirected graph is correct, which surprised me."

"Paste of ids on the citation graph: '6,117,075 6,231,106 6,287,586' gives 3 results, even
though nothing is drawn, and the inspector says 'Not drawn: the graph is past the drawing
limit. Counted everywhere.' That is useful. My clients send me lists of ids in emails. This I
would use. The not-drawn card here is shorter, it has lost the '(50,000)' -- small."

**Filter chip.** "Three steps: Filter to Largest component 76, Filter to degree >= 5 41,
Filter out group = 8 28. Counts after each step. Checkboxes to switch a step off. This is
Gephi's filter stack done properly, and it is reversible. Double-click to edit: 'Degree counts
neighbors in the graph this step reads. Scope: After step 1: 76 nodes. Result: Leaves 41;
takes out 35.' That sentence answers the question I asked on the Find screen. Put it on the
Find screen too."

"Statistics: edges '105 of 254', density 0.278, average degree 7.50. On the Find screen the
same 'Filtered: 28 of 77 nodes, 3 steps' said edges 106, density 0.280. 105 or 106? Same data,
same three steps. That is the second time today a count moved between two screens for the same
filter. I cannot put either in a paper until I know which is right."

"Leaves 0 nodes: 'Filtered graph: 0 of 77 nodes, emptied by Filter to degree >= 40. Turn off
step.' It names the step that emptied it and gives the fix. Fine, that is good."

**Wrapping up.** "What did I find worth a closer look? The 2,406 isolates, the 43 small
components among highly cited drug patents, and a question about whether citationsReceived
matches in-degree. I found those from the numbers, not the picture, which is how it should be.
But I could not act on any of them in two clicks, and I cannot export the step list as
something I can rerun."

## Single Ease Question

4 out of 7. "Getting to a drawable subset was easy. Knowing whether the numbers were the same
numbers on every screen was not."

## Would she use it instead of her current tool?

"Not instead of the notebook. For a first look at a file too big for Gephi, yes, maybe: it does
not freeze, it tells me the limit, it gives me the statistics first, and it counts before I
commit a filter. The filter steps with counts and the 'filtered out by' lines are better than
Gephi. But two screens gave me two edge counts for the same filter, it never says which degree
on a directed graph, and I could not see where the data goes or how to get the steps and
numbers out. Fix the counts and tell me in-degree or out-degree, and I would hand this to an
investigator. Until then it is a nicer screenshot tool."
