# Session: a costly measure on a large graph -- Chris, ML engineer (recommendation systems)

**Task, as the moderator gave it:** "Measure who bridges the groups across this whole citation graph."

**Participant:** Chris, senior ML engineer on a retail recommendations team (persona:
`study/personas/ml-engineer-recsys.md`). Dark mode, 1440 x 900 laptop screen.

**Screens used, in order:** the measure options with cost (`screens/option-form-cost.html`,
states 3, 4 and 5), the Results panel (`screens/results-panel.html`, the finished sampled
state), and the graph past its drawing limit (`screens/past-drawing-limit.html`).
Render of the finished result as Chris saw it: `shots/record/r3-chris-costly-finished-sampled.png`.

## Transcript (think-aloud)

**Opening the patent citations project.**

> OK, "Patent citations". 124,318 nodes, 1,480,221 edges, directed, average total degree
> 23.8. Good, it leads with the numbers. And the canvas is empty with "124,318 nodes not drawn"
> -- honestly, thank you. Every other tool would have tried to draw that and frozen my tab.

> "Who bridges the groups." Groups of what? Nobody told me what the groups are. If this were my
> notebook I'd either run Louvain and count edges between communities, or just run betweenness
> and call it bridging. There's no "bridging" item in the catalog, so... betweenness. That's the
> textbook proxy. I'll take it. I don't love that I had to translate the question myself.

**Clicking Betweenness in the catalog.** The catalog row already says "hours" next to it.

> It says "hours" before I've even clicked. That's nice, I don't have to find out the hard way.
> But "hours" -- two hours? Twenty? I'd want an actual estimate. Anyway.

**The refusal panel (state 3).** "Takes hours. The time limit is 30 seconds. Directed, on the
full graph: 124,318 nodes." Then two groups: "Fits the time limit" (Sampled, 101 sources --
under a minute; Exact, on 5,318 nodes -- under a minute) and "Past the time limit" (Sampled,
500 sources -- a few minutes; Exact, on the full graph -- hours). Primary button: "Run sampled".

> OK this is actually the right answer. Sampled Brandes is what I'd do anyway -- networkx
> `betweenness_centrality(G, k=...)` or NetworKit's approximate one. It's giving me the choice
> up front instead of just spinning. I like that the default is the sampled one and the button
> literally says what it'll do.

> 101 sources. Why 101 and not 100? Guess it's "the biggest that fits 30 seconds". Fine. What I
> can't tell is how the sources are picked -- uniform over nodes? Degree-weighted? That changes
> the variance a lot on a citation graph with hubs.

> "Exact, on 5,318 nodes" -- that's the "Drug patents granted in 2001" set on the right. Not
> what I was asked, the task says the whole graph. Skip.

> The 30-second limit -- where did that come from? Can I change it? I'd happily wait five
> minutes for 500 sources if it's running in the background. Oh, it does say "Past the time
> limit" ones still run, they're just in the second group. OK.

**Clicks "Run sampled" (state 4).** Panel turns into "Betweenness (sampled)", "Running, under a
minute, within the time limit. Directed." Progress bar. Sample size 101 of 124,318, Seed 7,
"Edits wait for Re-run". A bar at the bottom: "Running Betweenness (sampled) ... Cancel".

> Seed is shown. Good, I can reproduce it. Progress bar, no numbers -- I'd like "sources done:
> 40 of 101", but it's under a minute, I'll wait.

> "Readings, when it finishes: Scores are estimated from 101 sources. The top of the ranking is
> usually stable; a single score can be well off." -- yeah, that's correct, and it's one line, I
> actually read it.

**The finished result (Results panel, finished sampled).** Status: "on: full graph, 124,318
nodes. Sampled, 101 sources. Unweighted, directed. WebGPU." Distribution: middle ~0, highest
~0.016, zero ~79,554 nodes. Top nodes with rank ranges: #1 5879702 ~0.0160, #2 5902311 ~0.0037,
then three rows all "#3-#7". "Ranks below #2 may swap between runs."

> Rank ranges. OK, that's genuinely good. I've never seen a tool admit that #3 through #7 are a
> coin flip. #1 is miles ahead of #2 -- 0.016 versus 0.0037 -- so that one's real.

> "zero ~79,554 nodes" -- is that zero betweenness, or just "no sampled path went through it"?
> On a citation DAG a lot of old leaf patents really are zero, but with 101 sources I can't tell
> which. The tilde helps, but I'd want it said.

> "WebGPU." How long did it take? It says WebGPU and no timing. That's a badge. Give me "0.8 s".

**Opens Details (the run record).**

> Method: "Brandes betweenness from 101 random sources, scaled up by 124,318 / 101." Seed 7.
> Error bound "± 0.00035 on each value, 95 runs out of 100". Nice, that's a confidence interval
> I can actually use.

> Wait. "Direction: Citations read as undirected." And normalization "Divided by (n-1)(n-2)/2,
> the node pairs of an undirected graph." But the line I just read two inches to the left says
> "Unweighted, directed", and the dropdown says "Directed". Which one did it compute? On a
> citation graph that is not a detail -- directed betweenness on a DAG is a completely different
> ranking from undirected. Also the earlier refusal said "Directed", and I think I saw
> "Undirected" on the other version of that refusal. So now I don't trust the number at all.
> This is the exact thing I check first, and it's contradicting itself.

**Clicks "124,313 more in the table".** Expects the Nodes table sorted by the estimate, with
the patent id and the estimate side by side.

> The table shows patent ids as "6,117,075" with thousands separators, and the top-nodes list
> shows "5879702" without them. That's an id, not a quantity. If I export this and the id column
> comes out as a number with commas, my join against the patent table breaks. Which one is the
> real string? Does the export keep the original id?

> The table has citationsReceived, grantYear, category. If the betweenness column lands in here
> and I can export it as CSV with the original patent numbers, that's the thing I'd actually
> use -- dump it, join it in the notebook, done. I don't see the betweenness column in the
> table view I was shown, I'm assuming it gets added. "Export files..." up top, I assume that
> gets me there.

**Looks at the past-drawing-limit screen with a sample drawn.**

> The drawn sample is "top 3 by degree, with neighbors" -- three hub stars. That's just the
> hairball in miniature, and it says itself it favours hubs. For "who bridges" I'd rather it
> drew the top 20 by betweenness and the edges between them. I don't see a way to say "draw the
> neighbourhood of #1" from the result -- maybe it's there, but not on what I was shown.

**Done.**

> So I got an answer: 5879702 is the bridge by a mile, the next few are a tie. Getting there was
> easy -- easier than I expected. But I'd re-run it in NetworKit before I told anyone, because
> the panel told me "directed" and the record told me "undirected", and I don't know which ranking
> I'm looking at.

## After the task

**Single Ease Question (1 very hard -- 7 very easy):** 5

> Clicking through it was a 6. The routes, the default, the seed, the rank ranges -- that's
> better than most tools. I knocked it down for the direction contradiction; that's a
> correctness thing, and correctness is the part I care about.

**Would you use this instead of your current tool?**

> For this -- one centrality on a 124k-node graph -- not instead, but next to it. The notebook is
> 15 lines of NetworKit and I trust it. What this has that my notebook doesn't: it tells me the
> cost before I start, it defaults to the sane approximate run, and it tells me which ranks are
> noise. If the record agreed with the panel on direction, showed a real GPU timing, and exported
> the column with my original ids, I'd use it as the first look and only go to code to confirm.
> Right now I'd go to code to confirm anyway, which means I'd skip the first look.

## Problems observed

| Screen | What happened | Severity (1-4) |
|---|---|---|
| Results panel, finished sampled: run record | The status line and Direction field say "directed"; the run record says "Citations read as undirected" and normalizes by the undirected pair count. The participant could not tell which ranking he was reading and stopped trusting the result. | 4 |
| Measure options with cost vs Results panel, refused | One refusal reads "Directed, on the full graph", the other version of the same refusal reads "Undirected, on the full graph". | 3 |
| Results panel top nodes vs Nodes table | Patent ids appear as "5879702" in the result and "6,117,075" in the table -- the id is formatted like a quantity in one place. Raised doubt that the export keeps original ids. | 3 |
| Results panel, finished sampled | "WebGPU" with no elapsed time; read as a badge. | 2 |
| Measure options with cost, refusal | Time words only ("hours", "a few minutes", "under a minute"); no estimate in numbers and no way to see or change the 30-second limit. How the 101 sources are chosen (uniform or weighted) is not stated. | 2 |
| Results panel, finished sampled | "zero ~79,554 nodes" does not say whether that is true zero or "no sampled path passed through". | 2 |
| Catalog | No measure named for bridging between groups; the participant had to decide betweenness was the proxy, with no group definition offered. | 2 |
| Graph past its drawing limit | The drawn sample is hubs and their neighbours; no visible way to draw the top of the betweenness ranking or the neighbourhood of the #1 node from the result. | 2 |

## What worked for him

- The canvas not drawing 124,318 nodes, and saying so with the count.
- The refusal offering the sampled run as the default, with the cost of each route beside it.
- Seed shown and editable, so the sampled run can be repeated.
- Rank ranges ("#3-#7") and "Ranks below #2 may swap between runs".
- The run record's method line and 95% error bound.
- "Assistant off. Nothing is sent." -- local processing without asking.
