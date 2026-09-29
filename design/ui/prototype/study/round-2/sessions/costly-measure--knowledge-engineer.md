# Session: a costly measure on the whole citation graph -- knowledge graph engineer

Participant: Min-ji Kim, knowledge graph engineer (composite persona, see
`../../personas/knowledge-engineer.md`). Round 2.

Task given by the moderator, and nothing more: "Measure who bridges the groups across this whole
citation graph."

Screens, in order: the measure options with a time cost (`screens/option-form-cost.html`), the
results panel (`screens/results-panel.html`), the graph past the drawing limit
(`screens/past-drawing-limit.html`).

Outcome: success with difficulty. Single Ease Question: 5 of 7.

## Transcript (think-aloud)

**1. First frame of the options screen.** "This is a protein network, three hundred nodes, not a
citation graph. Someone left the wrong file open. It is asking me whether a bigger 'confidence'
means a stronger tie or a longer distance -- that is actually the right question to ask about a
weight, I will give it that. But it is not my graph. Next."

**2. Patent citations, Betweenness, over the time limit.** "Right. 124,318 nodes, 1,480,221
edges, directed. Those two counts are labelled nodes and edges, good. First: 'who bridges the
groups'. Which groups? Nobody has defined any groups. If the question is about groups I want a
partition first -- Louvain, Leiden, whatever -- and then something that reads the partition, a
participation coefficient or Burt's constraint. I do not see anything like that in the catalog.
Betweenness is the nearest thing, so I click Betweenness. I would have typed 'bridge' in the find
box first, but I have no idea whether that finds anything."

"It refuses. 'Takes hours. The time limit is 30 seconds.' Fine -- that is what I have been asking
Neo4j Browser to do for years: tell me before the tab freezes, not after. It gives four routes,
two that fit and two that do not. 'Exact, on 5,318 nodes' -- no, the moderator said the whole
graph, a kept subset is a different question. 'Sampled, 101 sources, under a minute'. Why 101?
That is an odd number. I assume it is the largest that fits. And 'sources' -- in a citation graph
a source is the citing patent. Do you mean source nodes of shortest paths? I think so, but that
word is doing two jobs here."

**3. Running the sampled estimate.** "Direction: 'As the graph: directed'. Hm. Directed
shortest paths on a citation graph only run backwards in time. A patent that bridges two fields
by being cited from both sides has no directed path through it. For 'bridging' I would read it
undirected. The dropdown lets me change it, good, but the default is a modelling decision the
tool made for me without a word. Sample size 101, seed 7, a refresh button for the seed. The
seed on screen is the first thing on this page I actually trust -- I can reproduce it."

"'The top of the ranking is usually stable; a single score can be well off.' Usually? By how
much? That sentence has a 'proposed' tag on it, so apparently somebody is not sure either."

**4. A sample of 500.** "I type 500. It warns me: a few minutes, past the limit, runs in the
background, and the 101 result stays until the new one finishes. That is honest and I would do
it. 'Edit held', 'Edits wait for Re-run', 'Edit waits for Run' -- three spellings of one idea on
two frames. I skip it."

**5. The results panel.** "Wait. Here the same Betweenness on the same citation graph says
'Undirected, on the full graph', the sampled route is 50 sources, not 101, the heading says
'Fits the budget' where the other screen said 'time limit', the graph is called 'Citations 1999
to 2001' instead of 'Patent citations', and the component row says 'Weakly connected
components' here and 'Connected components' there. Which one is it? If the default direction
depends on which screen I came from, I cannot defend the number. This is the thing that costs
trust."

"The finished sampled result is much better. Top nodes: #1 and #2, then '#3 to #7' as a range,
and 'Ranks below #2 may swap between runs.' That is the first graph tool I have seen admit its
own rank uncertainty. Run record: 'Brandes betweenness from 50 random sources, scaled up by
124,318 / 50', seed 7, normalization written out with n, 'Error bound: +/- 0.00035 on each value,
95 runs out of 100', 'Citations read as undirected', engine WebGPU. And a Copy button for my
methods section. Good. That is a record I can put in a governance report. But that error bound
should sit next to the Top nodes, not behind Details; with values around 0.0025 a bound of
0.00035 is the whole story of #3 to #7."

"'zero: ~79,554 nodes'. Two thirds of the graph with no betweenness at all. On an undirected read
that is surprising; I would want to know if those are in the 3,911 small components or just
leaves. It does not say."

"Engine: WebGPU. My work laptop mostly does not have WebGPU. Are 'under a minute' and 'hours'
estimated for my machine or for yours? I expect the answer is 'your machine', but nothing here
tells me."

**6. The graph past the drawing limit.** "Nothing drawn, and it says so: 124,318 nodes, more than
this browser draws at once, 50,000. Excellent. Keep the hairball in the database. The table
stands in, sorted by citations received, and the result's '124,313 more in the table' opens it
sorted by the measure. That is where I would actually read the answer."

"But look at the id column: '6,117,075'. A patent number is an identifier, not a quantity. Do not
put thousands separators in it. And in the Top nodes list the same kind of id is '5879702' with no
commas. Two renderings of one identifier. If I copy '6,117,075' into a SPARQL filter it matches
nothing."

## Answers after the task

**Single Ease Question:** 5 of 7. "Getting a number was easy. Getting a number I would defend
took reading three screens and noticing that two of them disagree about direction."

**Would she use it instead of her current tool?** "For this question, possibly -- today I would
run a sampled betweenness in networkx in a notebook and fight the memory. This tells me the cost
before it runs, lets me pick the sample, records the seed and the error bound and gives me
text to paste. That is more than my notebook does without effort. But I would not use it until
the default direction is the same everywhere and stated where I choose, and I still have to
flatten my data to CSV to get it in at all. And it did not answer 'bridges the groups' -- it
answered 'high betweenness'. Those are not the same question, and the tool let me pretend they
were."

## Problems observed

| Screen | What happened | Severity (1-4) |
| --- | --- | --- |
| Options with cost vs results panel | The same Betweenness on the same citation graph defaults to directed on one screen and undirected on the other; sample 101 vs 50; "time limit" vs "budget"; graph and components rows named differently. She stops trusting the default. | 3 |
| Options with cost | Direction defaults to "as the graph: directed" for a bridging question on a citation graph, where directed paths only run back in time; the choice is changeable but not explained. | 3 |
| Options with cost / catalog | "Groups" has no home: no measure reads a partition (participation coefficient, constraint), and it is unknown whether searching "bridge" finds anything, so betweenness stands in silently. | 2 |
| Graph past the drawing limit | Patent ids are formatted with thousands separators in the table ("6,117,075") and without them in Top nodes ("5879702"). | 2 |
| Results panel, finished sampled | The error bound is only in the run record behind Details; the rank ranges are shown but the size of the bound beside the values is not. | 2 |
| Options with cost | "Sources" is ambiguous on a citation graph (citing patent vs shortest-path source); "101" is unexplained until the helper line. | 1 |
| Options with cost | "Edit held" / "Edits wait for Re-run" / "Edit waits for Run": three phrasings of one state. | 1 |
| Options with cost / results panel | Time bands do not say whether they are for this machine (she often has no WebGPU). | 1 |
| Options with cost, first frame | The first frame is a protein network, not the citation graph she was asked about. | 1 |

## What worked for her

- Being refused before the run instead of a frozen tab, with routes grouped by whether they fit.
- The seed shown and editable; a background run offered past the limit instead of refused.
- Rank ranges ("#3 to #7") and "Ranks below #2 may swap between runs".
- The run record: method, sample, normalization, error bound, direction, engine, and Copy.
- "124,318 nodes not drawn" with the reason, and the table as the place to read the answer.
