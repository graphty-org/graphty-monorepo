# Session: narrow to the biggest piece, then rank it -- knowledge graph engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (composite persona, see
`study/personas/knowledge-engineer.md`). Expert, skeptical, reads counts and scope lines closely.

Task as the moderator gave it: "Look only at the biggest connected piece, and tell me its size
and who matters most in it."

Screens, in the order she met them: the filter chip with its steps panel
(`screens/filter-chip.html`, the "Three steps" state it opens in, then "One step off"), the
frame at rest with nothing filtered (`screens/frame-at-rest.html`), and the Results panel with
a filter on (`screens/results-panel.html`, "Results after a filter", rendered to
`shots/record/r2-ke-rp-filtered.png`).

Outcome: success. SEQ 6 of 7.

## Think-aloud transcript

**Filter chip, "Three steps" state.**

"OK. Les Miserables, co-appearances. I know this graph, 77 characters, 254 co-appearance links,
and I know there is one isolate, so the answer to 'biggest piece' should be 76. That is my
known-answer check before I believe anything else here.

Someone has already been here: the chip under the title says 'Filtered: 28 of 77 nodes, 3
steps'. So I am not looking at the whole graph, and good, it says so right under the name.
The panel lists three steps: 'Filter to Largest component, 76', 'Filter to degree >= 5, 41',
'Filter out group = 8, 28'. The 76 on the first row is the number I expected. Fine.

The second step has a second line: '3 dropped below degree 5 by Filter out group = 8'. I had to
read that twice. So degree is recomputed after the later step removes nodes, and three nodes
the degree rule kept now fail it. That is actually honest -- most tools would just quietly show
me 28 and I would have to work out why -- but the sentence is backwards for me, it names the
cause at the end. Still, I read it.

The task is only the largest component, so I do not want the other two steps. I untick the
degree step and the group step. I expect the chip to go to 76 of 77."

(She unticks both. In the prototype the "One step off" render shows what she passed through
with only the degree step off: chip '63 of 77 nodes, 2 of 3 steps', Statistics 'components 4,
largest component 58'.)

"Wait -- halfway through, with the group step still on, Statistics said 'largest component 58'
and 'components 4'. If I had stopped there I would have reported 58. That is the trap: the
'largest component' number in Statistics is the largest component of whatever the chip leaves,
not of my graph. The first row still says 76. Two different 'largest component' numbers on one
screen. The funnel icons next to the Statistics numbers tell me they follow the filter, and the
grey line says 'Filtered graph: 63 of 77 nodes', so it is not lying, but I only noticed because
I already knew the answer. A person who did not know Les Mis would read 58.

Group step off as well. Now it is one step. Chip: 76 of 77. That matches."

**Checking the count against what she knows (frame at rest, no filter).**

"Before I trust the 76 I want to see the unfiltered numbers. The frame at rest says nodes 77,
edges 254, 'Connected components 2 (1 isolate)'. Good: 77 minus the isolate is 76, and an
isolate has no edges, so the piece should still have all 254 edges. And there it is, the dot
on its own at the far left of the canvas, no label. I would like to know WHO that is -- the
steps panel tells me one node went, not which one. In my own data the dropped entity is the
interesting one: an orphan is a data-quality ticket. I would have to go find it in the table.

One thing I do like: '2 (1 isolate)'. It separates the isolate from the real second
component. Most tools say '2' and let me guess."

**Results panel, "Who matters most".**

"'Who matters most' is not a question, it is three questions. Degree, betweenness,
eigenvector or PageRank -- they answer different things. The tool does not pick for me, which
I prefer. The table under the canvas was already sorted by degree, and Valjean is first there
on both the filtered and full columns, 36 on the full graph. For a co-appearance network I
would rather use betweenness: who sits between the groups.

I click the flask, Results, on the left rail. There is a catalog grouped as Centrality,
Community, Path, Structure. I pick Betweenness.

The panel's first line: 'on: filtered graph, 76 nodes, 1 component. Exact. Unweighted,
undirected. WebGPU.' That is exactly the sentence I want before any number: what it ran on,
whether it is exact, how it read the edges. The Scope field says 'Filtered graph, 76 of 77',
so it followed my filter without me having to set it twice. I would have checked that anyway.

I open 'Details'. Run record: 'Brandes betweenness, exact: every node is a source',
'Normalization: divided by (n-1)(n-2)/2 = 2,775 node pairs; n = 76, the filtered graph',
'Scope: Filtered graph, 76 of 77: after Filter to Largest component'. This is the part I
would screenshot and put in the ticket. It names the algorithm and the denominator, and the
denominator uses 76, not 77. I can reproduce that in NetworkX. That is the first graph viewer
in a while that tells me which betweenness it computed.

Top nodes: Valjean 0.547, then Gavroche 0.163, Myriel 0.151, Marius 0.131, Fantine 0.127.
That matches what I remember from the literature on this dataset. Valjean by a mile.

The Distribution block has a line 'zero -- 46 nodes, all 31=' and I do not know what 'all 31='
means. Thirty-one ties at rank something? It is cut off or it is shorthand. I would ignore it,
but in a report I would not trust a line I cannot read.

Also 'Top nodes' says nodes. In my world these are individuals. Fine for a property graph; I
will not fight that battle today."

**Her answer to the moderator.** "The biggest connected piece is 76 of the 77 characters, with
all 254 edges; only one isolate is left out. Who matters most: Valjean, on every measure I
looked at -- highest degree, and betweenness 0.547 against 0.163 for the next one, Gavroche."

## Single Ease Question

6 of 7. "The steps and the run record did the work. I lose a point because 'largest component'
in Statistics silently means 'of what the filter left' and I nearly reported 58, and because
the task started from someone else's three filters that I had to undo."

## Would she use this instead of her current tool?

"For this exact task on an edge list, yes, over Gephi. Gephi would make me run 'Connected
Components', then build a filter on the component ID, then rerun betweenness and hope it ran
on the filtered workspace. Here the scope is written on every number and the run record names
the normalization. That is the honesty I keep asking for.

For my actual work, not yet. My data is Turtle and SPARQL results, and this still wants CSV or
GraphML, which means literals turning into nodes unless I clean them first. And I would ask:
what happens at ten million triples? 'Under a minute on WebGPU' is fine, but half our laptops
do not have WebGPU. Show me the CPU estimate before I click Run."

## Problems observed

1. Two different "largest component" numbers on one screen (the step row's 76, and Statistics'
   58 when a later step splits the graph). The funnel marks and scope line are there, but she
   only caught it because she knew the answer. Severity 3.
2. The steps panel says how many nodes a step removed, not which ones. The removed isolate is
   the interesting node for data-quality work; she has to hunt for it. Severity 2.
3. "zero -- 46 nodes, all 31=" in the Results distribution is unreadable shorthand. Severity 2.
4. The second-line note "3 dropped below degree 5 by Filter out group = 8" puts the cause last
   and needed two reads. Severity 1.
5. No hint of the CPU-only cost on a machine without WebGPU before Run (she has one such
   laptop). Severity 2.

## What worked for her

- "2 (1 isolate)" in the frame's Statistics: it separates the isolate from a real component.
- The Results state line naming scope, node count, component count, exactness, edge reading
  and engine before any number.
- Scope following the filter, shown as "Filtered graph, 76 of 77".
- The run record: algorithm by name (Brandes), normalization with the denominator and the n it
  used, and the filter step the scope came from.
