# Session: measuring who bridges the groups on a large graph -- Chris, ML engineer (recommendation systems)

- **Participant:** Chris, senior ML engineer on a retail recommendations team (simulated; see study/personas/ml-engineer-recsys.md)
- **Task as given by the moderator:** "Measure who bridges the groups across this whole citation graph."
- **Screens used:** the measure options with cost (over budget, within budget and running, sample size past the budget, as the element ships today), the results panel (finished and its other states), and the graph past the drawing limit (not drawn, filtered and drawn).
- **Outcome:** success with difficulty. He started a sampled betweenness run on the whole graph within a minute of reading the refusal, but finished unsure how good the estimate was and could not find a way to get the scores out.
- **Single Ease Question:** 5 of 7.

## Transcript (thinking aloud)

**Getting oriented.** "OK, patent citations. Right panel: 124,318 nodes, 1,480,221 edges, directed, average degree 23.8. That's the denominator I wanted, good, first thing I check. Canvas is empty and there's a little card: '124,318 nodes not drawn. Narrow the graph...' Honestly? Thank you. Every other tool I've opened would have tried to force-layout this and frozen my tab. I don't need to see 124k patents, I need a number per node."

**Choosing the measure.** "'Who bridges the groups.' In my head that's betweenness -- nodes sitting on a lot of shortest paths between clusters. If it meant 'bridges between communities' specifically I'd want communities first and then something like a participation coefficient, but I don't see that anywhere, so betweenness it is. The catalog on the left is already filtered to Centrality. Betweenness, and it says 'hours' next to it. Hours. OK, at least it warned me before I clicked. There's an (i) -- I'd hover it hoping for a one-line definition. Clicking Betweenness."

**The refusal.** "Popover: 'Takes hours; exact runs stop at 30 seconds.' Then 'Undirected, on the full graph: 124,318 nodes.' Wait -- my graph is directed. So it's silently symmetrising citations? Well, not silently, it says undirected, I'll give it that. For bridging I'd probably want undirected anyway, but I'd like to choose it, not be told it. There's no direction control on this screen.

Then E_CAP_EXCEEDED in monospace. Fine, I'm an engineer, I can grep for that.

Three routes. 'Sampled, 50 sources -- under a minute.' 'Exact on Drug patents granted in 2001 -- under a minute.' 'Exact on the full graph -- hours.' Cheapest first, I like that it's a ranked menu with costs. But 'exact runs stop at 30 seconds' and then offering me 'Exact on the full graph, hours' as a choice -- which is it? Does it stop at 30 seconds or will it run for hours? I'm guessing if I pick it, it runs anyway in the background. I'd want that on a work box overnight, honestly -- a nightly batch is fine for me -- but the popover contradicts itself.

The drug-patents one is a trap for this task. The moderator said the WHOLE graph. Betweenness on a subgraph isn't betweenness on the graph -- the paths that go through other categories vanish. That's not a cheaper version of the same answer, it's a different question. It sits right in the 'fits the budget' group like it's equivalent. I'd skip it.

'Hours' -- how many hours? Two? Forty? 'Under a minute' -- 5 seconds or 55? Give me the estimate. And is that on the GPU or CPU? Nothing says."

**Starting the sampled run.** "The blue button already says 'Run sampled' because the first row is highlighted. Clicking it. Now the popover title is 'Betweenness (sampled)' with Cancel, progress bar, 'Running, under a minute, within the budget. Undirected.' There's a status line at the bottom with the same progress. Good -- a bar, though I'd rather see 'source 23 of 50'.

Sample size 50 of 124,318, 'About 100 fits the budget.' OK, so why did it default to 50 if 100 fits? I'd bump it to 100 straight away. Seed: 'random'. I want a fixed seed -- if I can't reproduce the ranking tomorrow I can't put it in a doc. It looks like a field; can I type 42 in it? Unclear.

'Readings, when it finishes: Scores are estimated from 50 sources. The top of the ranking is usually stable; a single score can be well off.' That's the most honest sentence on the page, and it's still vague. 'Usually stable' -- by what measure? Give me a confidence band or a rank-stability number, something like 'top 20 unchanged across 5 seeds'. Fifty sources out of 124k is 0.04 percent. For a graph with 3,912 components, how many of those 50 even land in the giant component? I'd want to know the sampling is uniform over nodes and whether the scores are scaled back up to the full-graph estimate or just raw partial sums."

**Trying a bigger sample.** "Let me try 500 after it finishes. Red: '500 sources take a few minutes; runs stop at 30 seconds.' Run button greys out. So I can't pay for accuracy at all -- the cap is hard even when I'm willing to wait a few minutes? That's annoying. If exact-on-full-graph is allowed to run for hours, why is a 500-source sample that takes a few minutes refused? That rule makes no sense to me. I'd type 100 and move on."

**The fourth variant (no sampled method).** "In this version there's no sampled row at all -- only drug patents or the full graph for hours. For this task that's basically a dead end: the only whole-graph option is 'hours' with no number. I'd close it and write 20 lines of networkit in a notebook, which has approximate betweenness built in."

**Reading the result.** "The finished panel I'm shown is on a different graph -- human protein interactions, 300 nodes -- so I'm reading the layout, not my citation result. Top: 'on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected. WebGPU. Details.' Now THAT is the header I want: scope, exact vs sampled, weights, direction, engine. I'd hope mine says 'Sampled, 50 of 124,318 sources, seed X'. It says WebGPU but no time -- 'computed in 0.8 s' would sell me more than the badge.

Distribution histogram: 'bar height: square root of the count'. Fine, betweenness is heavy-tailed, I'd actually prefer a log x-axis. Middle 0.0038, highest 0.138, zero 10 nodes. Those are normalised scores I assume; it doesn't say normalised by what. Top nodes list is cut off at the bottom -- I have to scroll inside a popover to get to the one thing I came for. On a 1440x900 laptop that's cramped.

Where do I get the scores out? There's an 'Export...' button top right but it's global; I don't know if it exports this column. In the right panel there's an 'Export +' section. I want 'betweenness as a CSV with the patent number' and I can't tell which of those gives it."

**Looking at the graph after.** "On my citation graph nothing is drawn, which is right. The node table is useful though -- id, grantYear, category, citationsReceived, sortable. If the betweenness column shows up there and I can sort by it, I'm mostly done: top patents by betweenness, category next to it. I'd check whether the top bridges are just the most-cited patents -- if betweenness and citationsReceived rank the same, it's telling me nothing degree didn't. The screens don't show the betweenness column in the table, so I don't know.

If I narrow to drug patents I get 612 of 124K drawn -- 'Filtered: 612 of 124K nodes' at the top, 1,843 of 1,480,221 edges, and a big hairball in the middle. Expected. Not what the task asked."

## After the task

**SEQ: 5.** "Getting a run started was easy -- the cost words before I clicked and the ranked routes are genuinely better than anything I've used. It's a 5 not a 6 because I don't know how good my answer is, I can't pay for a bigger sample, and I can't see how to export it."

**Would he use it instead of his current tool?** "For this job, probably not yet. My current tool is networkit or igraph in a notebook: approximate betweenness with a known epsilon, a fixed seed, and the result is a DataFrame I can join back to my table. This has better manners -- it told me the cost up front and didn't freeze -- but the notebook tells me the error bound and gives me the numbers. If the sampled result said 'estimated from 100 of 124,318 sources, seed 42, top 20 stable across seeds, 3.1 s on GPU', let me raise the sample if I'm willing to wait, and let me sort the node table by the score and download it with the patent ids, I'd use it for the first look before going to code. Right now it's a nicer front door to a number I can't fully trust."

## Problems observed

1. **The refusal contradicts itself** (option-form-cost, over budget; severity 3). "Exact runs stop at 30 seconds" sits above an offered route "Exact on the full graph -- hours". He could not tell whether choosing it would run for hours or be stopped.
2. **The cost has no numbers** (option-form-cost, catalog and routes; severity 2). "Hours" and "under a minute" gave him no estimate and did not say whether it was the GPU or the CPU.
3. **A subgraph shown as the same answer** (option-form-cost, routes; severity 3). "Exact on Drug patents granted in 2001" is grouped under "Fits the budget" as if it answered the same question. Betweenness on a subset drops every path through the rest of the graph, and the task asked for the whole graph.
4. **No accuracy for the sampled estimate** (option-form-cost, within budget; severity 3). "The top of the ranking is usually stable; a single score can be well off" gives no rank stability, error band or scaling rule. Fifty of 124,318 sources is 0.04 percent.
5. **He cannot choose to wait longer** (option-form-cost, sample past the budget; severity 3). A 500-source sample that takes "a few minutes" is refused, while the full exact run for hours is offered. The limit reads as arbitrary.
6. **The default sample is below what fits** (option-form-cost, within budget; severity 1). The sample defaults to 50 although "About 100 fits the budget".
7. **The seed looks unusable** (option-form-cost, within budget; severity 2). The seed reads "random", and he could not tell whether he could type a fixed seed.
8. **Direction is not his choice** (option-form-cost, over budget; severity 2). The citation graph is directed and the measure says "Undirected". It is named but there is no control to change it.
9. **No path from the result to exported scores** (results panel, finished; severity 3). Neither "Export..." nor the right panel's "Export" said whether it would export this score column with the original ids.
10. **The ranking is squeezed** (results panel, finished; severity 2). "Top nodes" is cut off at the bottom of a scrolling popover at 1440x900, and the scores do not say what they are normalised by.
11. **The route menu depends on the build** (option-form-cost, as the element ships today; severity 3). With no sampled method the only whole-graph route is "hours" with no number, a dead end for this task.
