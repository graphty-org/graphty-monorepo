# Session: a measure too costly to run exactly -- Expert Emma

**Participant:** Emma, network scientist and consultant (notebook user: networkx, igraph, graph-tool; Gephi for final figures).
**Task as given by the moderator:** "Measure who bridges the groups across this whole citation graph."
**Screens used, in order:** the measure options with cost (four states), the results panel (the refused state and the finished sampled state with its run record), the frame past the drawing limit.

## Transcript (thinking aloud)

**Before touching anything.** "Who bridges the groups." Fine. Strictly speaking that is not one measure. If you have groups, bridging is participation coefficient or bridging centrality over a partition, and you need the partition first. But nobody in the room means that; they mean betweenness. I will do betweenness and complain later. On 124 thousand nodes and 1.48 million edges, exact Brandes is O(nm) -- I already know that is hours. In igraph I would set a cutoff or sample pivots. Let's see whether this thing knows that, or just pins my fan.

**Option form, first state (the protein network).** This first frame is a different graph, 300 proteins. The weight question: "does a bigger number mean a stronger tie, a longer distance, or an amount that flows?" -- with actual values from the column. Good. That is exactly the question Gephi never asked me. "Read as a distance. Not used while its meaning is not set." So it tells me it is dropping the weight. I prefer that to silently using it. Moving on, this is not my graph.

**Option form, second state (patents, over the limit).** I click Betweenness in the catalog. Before I even click, the catalog row says "hours". OK, that is useful. And the panel: "Takes hours. The time limit is 30 seconds. Directed, on the full graph: 124,318 nodes." Then four routes: sampled with 101 sources under a minute, exact on 5,318 nodes, sampled 500 sources a few minutes, exact on full graph, hours.

That is... actually the right menu. That is what I would do by hand: k-sample Brandes, or restrict to a subgraph. Two questions immediately. First, why is there a 30-second limit and who set it? It says the limit "is 30 seconds" as if it were physics. I want to know if I can raise it. I look for a setting -- nothing on screen. Second, "Exact, on 5,318 nodes" -- which 5,318? I have to look over at the right panel to see "Drug patents granted in 2..." with 5,318 next to it and guess. Betweenness on an induced subgraph is a different quantity, not an exact version of the same thing; calling it "Exact" is going to mislead a junior. I would label it "on the subgraph" not "exact".

"Directed." It is a citation graph. Directed betweenness on a citation network is a legitimate thing -- a patent sits on directed paths from later patents to older ones -- but it is not the same as "bridges the groups". I leave it directed for now.

I click "Run sampled". Default is 101 sources.

**Option form, third state (running).** Progress bar, Cancel in the panel header and in a bar at the bottom. It is not blocking the UI, apparently. Sample size 101 "of 124,318", seed 7 with a reroll button. A seed. Thank you. "The largest sample that fits the time limit." Fine. There is an info icon next to Sample size; I would click it to find out whether this is uniform random source sampling, as in networkx's k parameter, or something adaptive. The screen itself does not say.

There is a line tagged "proposed": "The top of the ranking is usually stable; a single score can be well off." That is honest and roughly true for pivot sampling. But "usually" -- give me the bound.

**Option form, fourth state (500 sources).** After it finished I type 500. It warns: "500 sources take a few minutes, past the 30-second time limit. Run starts it in the background." So the "limit" is not a limit, it is a gate for whether the thing runs in the foreground. Then why did the first screen say the exact run was refused? The words are inconsistent: sometimes past the limit means refused, sometimes it means background. Exact-on-full-graph is also listed as a route I can click, so presumably it too runs in the background. I would have liked one sentence: "anything past 30 seconds runs in the background with Cancel." I had to piece that together across three states.

"Top nodes" appears collapsed in the readings. I want to see it.

**Results panel, refused state.** Same refusal, but now it says "Fits the budget" and "Over the budget", and the sample is 50 sources, not 101, and the line says "Undirected, on the full graph". Budget? Earlier it said time limit. And undirected? A minute ago the same graph was directed. Which is it? If the same button on the same graph gives me a different default direction and a different sample size, I do not trust the default. This is exactly the kind of thing I check. I would stop here in real life and go read the docs.

**Results panel, finished sampled state.** OK, this is the one I care about. The state line: "Sampled, 50 sources. Unweighted, undirected. WebGPU. Details." So it ran undirected -- the Direction field says "Read as undirected". On a citation graph. I did not choose that, or at least I do not remember choosing it; in the option form it said "As the graph: directed". Somebody flipped it. That changes the ranking completely. Not a disaster since it is stated right there, but I would have run the wrong thing if I had not read the state line.

I click Details. The run record: "Brandes betweenness from 50 random sources, scaled up by 124,318 / 50. Seed 7. Normalization: divided by (n-1)(n-2)/2, the node pairs of an undirected graph; n = 124,318. Weight conversion: none. Error bound +/- 0.00035 on each value, 95 runs out of 100. Direction: citations read as undirected. Engine: WebGPU." And a Copy button.

Fine. That is good. That is the paragraph for a methods section, and the normalization matches networkx's undirected convention, so I can reproduce it with `betweenness_centrality(G.to_undirected(), k=50, normalized=True, seed=7)` -- except networkx's seed will not draw the same 50 sources, so the numbers will not match exactly. I would want to know which sources it drew, or an export of them. "95 runs out of 100" is a strange way to say a 95 percent interval, but at least a student will understand it.

Top nodes: #1 5879702 ~0.0160, #2 5902311 ~0.0037, then "#3 to #7" for three nodes, and "Ranks below #2 may swap between runs." I like the rank ranges. Nobody does that. One node at 0.016 and the next at 0.0037 -- a factor of four -- that top one is worth a look. The IDs are bare patent numbers; I would want the title or at least the category column next to them. "124,313 more in the table" -- so there is a node table, and elsewhere I see "Export table as CSV". Good, that is my exit to pandas.

Distribution: "zero ~79,554 nodes". Two thirds of the nodes have zero estimated betweenness -- plausible for a citation graph with 50 sources, but a "~" on a count of zeros from sampling is correct and I appreciate it.

**Frame past the drawing limit.** "124,318 nodes not drawn. More than this browser draws at once (50,000). Every node is counted in Statistics and listed in the table." Honestly -- good. I did not want the hairball. A table sorted by citations received, the statistics, and a Narrow the graph button. For this task I never needed a picture. If anything I would want the betweenness column to show up in that table so I can sort by it.

**Did I answer the question?** I have a sampled betweenness ranking with a stated error, seed, normalization and direction. It is undirected, which I did not intend, and 50 sources, which is thin. I would re-run directed with 500 in the background, and I would still tell the moderator that "bridges the groups" wants a community partition plus participation coefficient, which I did not see offered anywhere.

## After the task

**Single Ease Question: 5 of 7.** The routes and the run record made it easy. The direction flipping from directed to undirected between screens, "time limit" versus "budget", and 101 versus 50 sources cost me trust I had to rebuild by reading every line.

**Would I use this instead of my notebook?** "For the analysis, no -- I will run igraph with a cutoff in the notebook where I can script it. But I would open this to hand a sampled ranking with its error bars and methods paragraph to a client, and the refusal with four priced routes is better than anything Gephi does, which is freeze. Show me the API and the same seed reproducing the same sources, and I will think about it."

## Problems observed

1. Direction default changes between screens for the same graph and measure: "Directed" in the refusal and running form, "Undirected" / "Read as undirected" in the results panel refusal and finished result. For betweenness on a citation graph this changes the answer. Severity 3.
2. Default sample size differs: 101 sources in one screen, 50 in another, for the same graph and time limit. Severity 2.
3. "Time limit" and "budget" both used for the same gate; "past the time limit" means refused in one place and "runs in the background" in another. No sentence says what happens to any run past 30 seconds, or whether the limit can be changed. Severity 2.
4. "Exact, on 5,318 nodes" calls betweenness on an induced subgraph "exact", which it is not relative to the full-graph question; the set is only named in a tooltip or truncated as "Exact on Drug patent...". Severity 2.
5. The sampled run records a seed but not the drawn sources, so it cannot be reproduced outside the tool. Severity 2.
6. Top nodes show bare patent numbers with no label or attribute column. Severity 1.
7. No bridging measure over groups (participation coefficient, bridging centrality) is offered; the task wording leads to betweenness without saying it is a proxy. Severity 1.
