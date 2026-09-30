# Session: measuring who bridges the groups in a large citation graph -- knowledge graph engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (composite persona, see
`study/personas/knowledge-engineer.md`). Expert in graphs; knows betweenness and asks which
centrality any tool means.

Task as given by the moderator: "Measure who bridges the groups across this whole citation graph."

Screens used, in order: the measure options with a time cost (`screens/option-form-cost.html`,
states 3, 4 and 5), the results panel (`screens/results-panel.html#finished-sampled`), and the
graph past the drawing limit (`screens/past-drawing-limit.html`).
Renders looked at: `shots/option-form-cost-over-budget.png`,
`shots/option-form-cost-within-budget.png`, `shots/option-form-cost-sample-over-budget.png`,
`shots/record/r3-ke-costly-finished-sampled.png`, `shots/record/r3-ke-costly-pdl.png`.

Outcome: success with difficulty. She got a ranked answer and could say how sure it was, then
found the run's own record contradicting the options it was run with, and stopped trusting the
numbers until someone explains which direction was used.

## Think-aloud transcript

**1. The first screen opens on a protein network, not my citation graph.**

"This is 'Human protein interactions', 300 nodes. Not what you asked me about. There is a
weight warning about 'confidence' -- not my problem today. I will skip to the patent graph."
(Moderator moves her to the citation graph state.)

**2. Patent citations, Betweenness already open, and it refuses.**

"OK. 124,318 nodes, 1,480,221 edges, directed. 'Who bridges the groups' -- that is not one
measure. Betweenness is the usual proxy; a participation coefficient over a community split would
be the honest one. There is nothing like that in the list, so Betweenness it is. At least the
panel says Betweenness, not 'importance'.

It says 'Takes hours. The time limit is 30 seconds.' Good. That is exactly what Neo4j Browser
never told me -- it just hung. And it tells me before anything runs. I like that. I would like it
more with a number: 'hours' could be two or twenty.

Four ways forward. 'Sampled, 101 sources, under a minute' is highlighted. 'Exact, on 5,318
nodes' -- that is the drug-patents set on the right, so not the whole graph; you said the whole
graph, so no. 'Sampled, 500 sources, a few minutes' and 'Exact, on the full graph, hours'.

Wait. The heading says 'Fits the time limit' and the time limit is 30 seconds, and the row says
'under a minute'. Under a minute is not under 30 seconds. Which is it? Small, but that is the
kind of rounding I notice.

Why 101? That is an oddly specific number. I assume it is computed from some cost model. Fine.
I would actually prefer exact, but I am not leaving a laptop tab open for 'hours' with no number.
I will take the sample and look at the error it reports. Run sampled."

**3. Running.**

"Progress bar, a cancel button in two places, direction shown, seed 7, sample size 101 of
124,318. Seed visible -- good, I can reproduce it. 'Readings, when it finishes: the top of the
ranking is usually stable; a single score can be well off.' Honest. There is a pink 'proposed'
tag on that sentence; I do not know what it means, I ignore it.

The canvas is empty and says '124,318 nodes not drawn.' Good. Keep the hairball in the database.
I did not want a picture of 124,000 dots."

**4. Finished. The result.**

"Top nodes: #1 5879702 at about 0.0160, #2 5902311 at about 0.0037, then '#3-#7' three times.
It says ranks below #2 may swap. So the tool is telling me it can only really vouch for the top
two. That is more honesty than Gephi ever gave me. 'rank, low-high' as a column header -- I had
to read the rows to understand it means a range of ranks. Fine once you see it.

But these are patent numbers. 5879702 means nothing to me. Where is the title, the assignee?
I would have to go to the table or hover. For a 'who' question the answer is a name.

Distribution: middle about 0, highest about 0.016, zero about 79,554 nodes. In a citation
graph that is plausible -- most patents are leaves or roots of the citation order. OK.

Let me open Details, the run record. Method: Brandes from 101 random sources, scaled up.
Seed 7. Error bound plus or minus 0.00035, 95 runs out of 100. Good, that is what I wanted.

Then: 'Normalization: divided by (n-1)(n-2)/2, the node pairs of an undirected graph.' And
'Direction: Citations read as undirected.'

No. Stop. The options above it say 'Direction: Directed' and the summary line says 'Unweighted,
directed.' The option form said 'Directed, on the full graph' before I ran it. The record says
undirected. One of them is wrong. For a citation graph that matters enormously: in the directed
version a patent bridges old work and new work along the citation order; in the undirected one
it bridges anything to anything. Those are different rankings. I cannot report either number
until I know which one ran.

And the engine says WebGPU. My laptop only gets WebGPU on the newer machines. Was the 'under a
minute' estimate for WebGPU? Nothing on the options screen said the estimate depended on the
engine."

**5. Small inconsistencies I noticed on the way.**

"The graph is 'Patent citations' on one screen, 'Citations 1999 to 2001' on the next, and
'Citations' on the empty canvas screen. The component result is 'Connected components 3,912'
before the run and 'Weakly connected c... 3,912' after. Statistics shows 'average total degree'
in one place and 'average degree' in another. Each one alone is nothing. Together, on a tool that
has just contradicted itself about direction, they make me check every label twice."

**6. The empty canvas screen.**

"'124,318 nodes not drawn. More than this browser draws at once (50,000). Every node is counted
in Statistics and listed in the table.' That is the right message. The table is there, sorted by
citations received, the weak components listed with sizes -- 116,905 nodes, 94.0 percent in the
biggest. That is a real known-answer check I can compare with a SPARQL count. I like this screen
best of the three."

## After the task

**Single Ease Question: 4 of 7.**

"Getting a ranking was easy -- two clicks, and it warned me before it wasted my afternoon. The
hard part is that I do not know what I got. The options said directed, the record says
undirected. That is one unexplained contradiction. One more and I would close it."

**Would she use this instead of her current tool?**

"For this question, my current tool is networkx in a notebook over a SPARQL export, run
overnight, exact. This would be faster and the sample with an error bar is honestly presented,
better than most tools. But I would not put a number from it in a report until the direction
question is fixed, and I would want patent titles, not numbers, in the answer. Maybe as a quick
first look before the overnight exact run. Not instead of it."

## Problems found

1. The run record contradicts the options: the form and summary say directed, the record says
   "Citations read as undirected" and normalizes by undirected node pairs. Severity 3.
2. "Fits the time limit" (30 seconds) above a row that says "under a minute". Severity 2.
3. Exact on the full graph shows only "hours", no estimate; she wanted the exact run and had no
   basis to choose it. Severity 2.
4. Top nodes shows bare patent numbers; a "who" answer needs a readable label. Severity 2.
5. The time estimate does not say it assumes WebGPU; her laptop may not have it. Severity 2.
6. Graph and result names drift between screens ("Patent citations" / "Citations 1999 to
   2001" / "Citations"; "Connected components" / "Weakly connected components"; "average total
   degree" / "average degree"). Severity 1.
7. The catalog has no measure that means "bridges groups" directly (a participation or
   community-bridging score); betweenness is a proxy. Severity 1.
8. The "rank, low-high" column header needs the rows to decode it. Severity 1.

## What worked for her

- Being told "takes hours" before anything ran, with priced ways forward.
- The seed shown and editable, and an error bound in the run record.
- "Ranks below #2 may swap between runs" -- the tool saying where its answer stops being firm.
- Not drawing 124,318 nodes, and saying so plainly, with counts and the table still available.
