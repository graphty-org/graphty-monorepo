# Session: a costly measure on the whole citation graph -- Expert Emma

Participant: Emma, network scientist (notebooks with networkx and igraph; Gephi for figures).
Task as given by the moderator: "Measure who bridges the groups across this whole citation graph."
Screens used, in order: the measure options with cost (four states), the results panel, the
graph past the drawing limit. The participant saw the rendered screens only.

Outcome: finished with difficulty. She started a sampled betweenness estimate and would accept
it for a first look, but could not confirm direction handling, normalization or the seed, so she
would not put the number in a report.
Single Ease Question: 4 of 7.

## Think-aloud transcript

**Reading the task.** "Who bridges the groups. Fine -- that is betweenness, at least as a first
pass. If they meant bridging between communities specifically I would want participation
coefficient or brokerage, but I doubt that is in here. Let me look for betweenness."

**First screen, left panel.** "Patent citations, full graph. Catalog, filtered to Centrality:
Betweenness, Closeness, Eigenvector, Harmonic, HITS, Katz, PageRank. Reasonable list. Harmonic
is there, good, someone read Boldi and Vigna. Betweenness says 'hours' on the right. Hours on
what machine? No hardware named. But at least it warns me before I click, which is more than
Gephi does -- Gephi just freezes and I find out 40 minutes later."

"Right panel: 124,318 nodes, 1,480,221 edges, directed, average degree 23.8. Directed was
detected. Good, that is the thing I check first."

**Clicks Betweenness.** "It refused. 'Takes hours; exact runs stop at 30 seconds.' Who decided
30 seconds? Can I change that? I do not see a setting. There is an error code, E_CAP_EXCEEDED --
I actually like that, I can grep for it."

"Wait. 'Undirected, on the full graph.' Undirected? The inspector just told me this graph is
directed. It is a citation graph -- direction is the whole point. Is it symmetrizing the edges
for betweenness? Is that a choice or a limitation? There is no toggle in this popover. On a
citation DAG directed betweenness is quite different -- most shortest paths do not even exist.
Maybe undirected is the right thing for 'bridges' here, honestly, but I want to be the one who
decides that, and I want it to say why."

**Reads the three routes.** "Fits the budget: 'Sampled, 50 sources, under a minute.' OK, that is
Brandes-Pich pivot sampling presumably. Fifty pivots out of 124 thousand is thin. Which
sampling? Uniform? Is it rescaled by n over k so the values are comparable to exact? Not said."

"'Exact on Drug patent...' -- truncated, I cannot read the set name. I have to guess it is the
'Drug patents granted in 2...' set on the right, 5,318 nodes. But 'exact' here is misleading:
exact betweenness on an induced subgraph is a different quantity from betweenness on the full
graph restricted to those nodes. A junior would read that as 'the exact numbers for the drug
patents' and it is not. I would not want that labelled 'Exact' without a qualifier."

"'Exact on the full graph, hours.' So I can run it anyway? It is under 'Over the budget', but
there is no button on that row that I can see. The header button says 'Run sampled' and the
first row is highlighted. I assume clicking the last row changes the button. If it runs in the
background and I can close the laptop lid... no, it is a browser tab. I would just run it in
igraph overnight."

**Takes Run sampled.** "Fine. Run sampled." (Selects the highlighted first row, clicks the blue
button.)

**Running state.** "There is a new row, 'Betweenness (sampled), under a minute'. Progress bar
in the panel and a toast at the bottom with Cancel. Good -- the UI is not blocked, I can still
click around. That alone beats Gephi on a graph this size."

"Parameters: Scope, full graph. Sample size 50 of 124,318. 'About 100 fits the budget.' Seed:
random. Random! And there is a little dashed 'proposed' tag next to Seed, so I think the seed
field does not really exist yet? If I cannot set the seed and see which one was drawn, I get a
different ranking every time I press the button. That is my Gephi import-order problem again,
just with a different cause. For a first look I will live with it. For anything I hand on, no."

"Still no direction control, no normalization. It says 'Undirected' again in the status line.
Nowhere does it say normalized or raw."

"'Readings: scores are estimated from 50 sources. The top of the ranking is usually stable; a
single score can be well off.' That is honest and roughly true of pivot sampling. I would rather
have a number -- a standard error, or the rank stability between two seeds -- but I appreciate
that it does not pretend."

**Tries a bigger sample.** "Let me push the sample to 500, that is what I would actually use."
(Third state.) "Red: '500 sources take a few minutes; runs stop at 30 seconds. About 100 fits the
budget.' Run is greyed out. So I cannot run a few minutes? A few minutes is nothing. I would sit
and wait for a few minutes. The budget is the tool's comfort, not mine. This is where I start
looking for the notebook. Fine, 100 then -- 'about 100' is a strange thing to say about an
integer, though. Is 101 allowed or not?"

**Also notices** the fourth state, where there is no sampled route at all, only 'Exact on Drug
patents' and 'Exact on the full graph'. "So depending on the version, I might not even get the
sampled option and would be pushed into the subgraph one -- which is the misleading one. That
would be worse."

**Results panel.** (The finished screen shows a different, smaller graph -- 300 proteins -- so
she reads it as what her result would look like.) "OK, this is better. 'On: full graph, 300
nodes, 3 components. Exact. Unweighted, undirected. WebGPU. Details.' That is the line I want on
every result: scope, exact or estimated, weights, direction, engine. Give me that on the sampled
one plus the seed and the sample size and I am mostly happy."

"Distribution with square-root bar heights, and it tells me it is square root. Median 0.0038,
max 0.138, ten nodes at zero. Max 0.138 on 300 nodes -- so this is normalized, probably by
(n-1)(n-2)/2 like networkx. Probably. It should say. networkx and igraph disagree on this and I
have to reconcile them every single time."

"Top nodes: MAPK1 first. I would compare that against my notebook value right now. The log
colour legend with the zeros named is nice. Export at the top right; I assume the betweenness
column goes into the node table and exports to CSV. I did not see that confirmed on this
screen."

**Past the drawing limit.** "Here is the citation graph again: '124,318 nodes not drawn: more
than this browser draws at once (50,000). Narrow the graph...' Good. I do not want a
124-thousand-node hairball, nobody reads it. And there is a node table underneath sorted by
citations received with ranges on each column. This is the view I would actually use for this
task: run betweenness, get a column in this table, sort it, export. I do not need a picture of
who bridges anything; I need a ranked list."

"Components 3,912, giant component 94 percent. Fine. The 'Sample: 586 of 124K, top 3 by degree,
with neighbors' state even says 'favors hubs, so density and clustering read high'. Whoever
wrote that knows the field. I wish that same person had written the betweenness popover."

"What I did not find: a sorted betweenness column in this table for the citation graph, so I
cannot say I finished the task. I got to 'estimate running'."

## After the task

**Single Ease Question: 4.** "Finding betweenness and starting it was easy -- two clicks, and it
warned me before it burned an hour, which I respect. What pulled it down: it quietly treats my
directed graph as undirected with no control, it will not tell me the normalization, the seed is
'random' with no way to see or fix it, and it refuses a run that would take a few minutes."

**Would she use it instead of her current tool?** "For this task, no. Betweenness on 124
thousand nodes is exactly what igraph is for: I set directed or not, k, the seed, and I know the
normalization because I read the source. Here I cannot reproduce the sampled number and I cannot
cite what it computed. Where I would use it is after: load the CSV with my igraph betweenness
column, filter to the giant component or the drug patents, and hand the investigator the table
and a picture. The provenance line on the results panel is right, and the not-drawn message is
the most honest scale statement I have seen in a GUI. Put the seed, the direction choice and the
normalization in that provenance line, let me raise the budget myself, and I would try it for
the first look instead of a notebook cell."
