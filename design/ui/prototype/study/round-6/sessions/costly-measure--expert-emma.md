# Session: a measure too costly to run exactly -- Expert Emma

**Participant:** Expert Emma, network scientist, lives in notebooks (networkx, igraph, graph-tool),
uses Gephi for the final figure. See ../../personas/expert-emma.md.

**Task, as the moderator gave it:** "Measure who bridges groups on the whole citation graph."

**Screens, in order:** the Betweenness option popover over the time limit, the option form while
the sampled run is going and with a sample of 500 typed in (screens/option-form-cost.html), the
Results rail place showing the exact run as "Not run", the finished sampled run with its run record,
the same measure set up but "Not run yet" (screens/results-panel.html), and the not-drawn view of the
graph with its table (screens/past-drawing-limit.html).

**Renders she saw (study view):** shots/record/r6-emma-costly-over-budget.png,
shots/tasks/costly-measure/01-option-form-cost-within-budget.png,
shots/tasks/costly-measure/02-option-form-cost-sample-over-budget.png,
shots/tasks/costly-measure/03-results-panel-refused.png,
shots/tasks/costly-measure/04-results-panel-finished-sampled.png,
shots/record/r6-emma-costly-not-run.png, shots/tasks/costly-measure/05-past-drawing-limit.png,
shots/record/r6-emma-costly-catalog.png (the algorithm menu, shown on another graph).

---

## Think-aloud transcript

**Reading the task.** "Who bridges groups." Same question as last time, and my objection is the same:
which groups? If it is the patent categories, I want a participation coefficient over that column. If
it is communities, I want Leiden first and then a bridging measure over the result. If the moderator
just means brokers, betweenness is the proxy everybody grabs. I'll grab it too, and see whether this
time the tool lets me say anything about groups.

**Asking for Betweenness: the popover over the time limit.** Left: Patent citations, full graph,
one set "Drug patents granted in 2..." with 5,318. Right: 124,318 nodes, 1,480,221 edges, directed,
average total degree 23.8. Good, that is what I check first and it is just there.

Popover: "Takes hours. The time limit is 30 seconds. Directed, on the full graph: 124,318 nodes."
Hours, yes. Brandes is O(nm) on unweighted; 124k times 1.5M is not happening in a browser tab. It
refused before pinning my fan. Fine.

Routes: "Fits the time limit: Sampled, 101 sources, under a minute; Exact, on 5,318 nodes, under a
minute. Past the time limit: Sampled, 500 sources, a few minutes; Exact, on the full graph, hours."
The grouping by "fits / past the time limit" is better than last time -- I can see immediately that
the time limit is a sorting line, not a wall. "Exact, on 5,318 nodes" in this popover still does not
say which 5,318. I know from last time it is the drug patents set, but a junior would not. Hold that
thought, because the other screen does it properly.

And it says "Directed". On a citation graph. Citations point back in time, it is nearly a DAG,
directed betweenness is mostly zeros. The popover gives me no way to change that before I pick a
route. I pick "Sampled, 101 sources" and plan to fix direction afterwards.

**The sampled run going.** "Running, under a minute, within the time limit. Directed." Progress bar,
and a second one at the bottom with Cancel. Scope: Full graph. Direction: "As the graph: directed" as
a dropdown. Sample size 101 "of 124,318", "The largest sample that fits the time limit." Seed 7 with a
reroll button. "Edits wait for Re-run." Seed visible and editable -- that is the thing I care about
most on this form and it is still here. "Readings, when it finishes: Scores are estimated from 101
sources. The top of the ranking is usually stable; a single score can be well off." True. I would
still like a citation for the estimator, but it says the right thing.

It says Directed three times on this screen. So, whatever else happens, I believe I am running
directed betweenness. I would cancel and switch to undirected, honestly. Let me first see what it
does with a bigger sample.

**Typing 500.** "500 sources take a few minutes, past the 30-second time limit. Run starts it in the
background. 101 is the largest that fits." Good. That tells me the limit is a background threshold,
and it tells me in place, next to the number I typed. Last time I had to discover this. Header now
says "Finished on 101 sources, seed 7. Directed. Edit held." So the first run finished and my 500 is
pending. Clear enough. "Edit held" versus "Edits wait for Re-run" versus "Edit waits for Run" -- three
wordings for one idea on two screens of the same form. Nitpick, but I notice.

**The Results rail: "Betweenness, exact -- Not run."** Here is the new bit. The exact run shows as
"Not run: would take about 10 hours. The time limit is 30 seconds." No red, no error. That is right:
nothing failed, it declined. I actually like "Not run" as a status. It is what I would write in a
log.

Then the grey line: "On the full graph, 124,318 nodes; **the directed citations read as undirected**."

Stop. The popover a minute ago said "Directed, on the full graph". The option form said "As the graph:
directed", three times. This screen, for the same measure on the same graph, says it reads the
citations as undirected. That is the exact contradiction I reported last round, and now it is in
the first sentence of the refusal.

Also "about 10 hours" here versus "hours" in the popover. Not a contradiction, but the precise one
should be everywhere or nowhere. And this list has three routes, the popover had four: "Sampled, 500
sources, a few minutes" is gone. Same graph, same measure, two different menus.

What this screen does well: "Exact, on the 5,318 nodes in Drug patents granted in 2001. **This is a
different graph.**" Yes. That is exactly the sentence I asked for. It is betweenness inside the
island, and it says so. Put that sentence in the popover too.

The Notes and "Used by: Nothing uses it yet" underneath -- fine. What I do not see is the refusal
kept anywhere as a record once I move on. For a methods section I would write "exact betweenness
was not computed (estimated 10 h); sampled, k = 101, seed 7". If the refused attempt is not among
the runs, I have to remember that myself.

**The finished sampled run.** Header: "Betweenness (sampled), 101 sources, Sep 28 09:52". State line:
"on: full graph, 124,318 nodes. Sampled, 101 sources. Directed. WebGPU. Details. Weight: no numeric
edge column." Options block: Direction Directed. "Re-run (keeps Run 1)" is greyed; I assume because
nothing changed. "Runs of this measure 1: Run 1, 101 sources, Sep 28 09:52, shown. Compare with..."

The runs list is the right idea: each run with its settings and date, and Re-run keeps the old one so
I can compare seed 7 against seed 8 later. That is how I would work in a notebook, one cell per run.
But the run row says "101 sources" and a date. Not direction, not seed. If I run it once directed and
once undirected, both rows will read "101 sources" and I will be clicking into each to find out
which is which.

Details, the run record. Method: "Brandes betweenness from 101 random sources, scaled up by 124,318 /
101." Seed 7. Damping does not apply. Normalization: "Divided by (n-1)(n-2)/2, the node pairs of an
undirected graph; n = 124,318." Weight conversion: none. Error bound: "+-0.00035 on each value, 95
runs out of 100." **Direction: Citations read as undirected.** Engine WebGPU. Took 29.9 s.

So now I have: popover says directed, form says directed, state line says directed, options block
says directed; refusal says read as undirected, run record says undirected, normalization is the
undirected one. Four to two, and the two are the ones I would actually paste into a paper. I have no
way from this screen to tell which one ran.

Can I tell from the numbers? Distribution: "zero ~79,554 nodes". The statistics page says 41,873
nodes have in-degree zero. On a directed near-DAG, every source patent and every patent that cites
nothing in-sample gets zero directed betweenness, so 79k zeros smells directed to me. Undirected, on
a graph with average degree 24 and a 94% giant component, I would not expect two thirds of the nodes
at zero, even from 101 sources. That is a back-of-envelope argument, not proof -- a sampled estimate
gives zero to anything no sampled path went through. Which is the other point: "zero" on a sampled
estimate means "no sampled path", not zero betweenness. Still labelled "zero".

If the numbers are directed and the normalization is undirected, then every value is off by a factor
of two against networkx, and the reader cannot know. Either way I would have to rerun a subsample in
igraph to find out which it did. That is the thing I came here to not have to do.

Top nodes: #1 5879702 ~0.0160, #2 5902311 ~0.0037, #3-#7 three times, "Ranks below #2 may swap
between runs." The rank ranges from the error bound are still the best thing on this screen. I still
read "rank, low-high" as a sort order for a second. And they are still bare patent numbers. For
"bridges groups" I need the category beside each one, and it is not there.

Copy on the run record: still excellent, if it told the truth about direction.

**The same measure, "Not run yet".** Betweenness (sampled), 101 sources: "Not run yet. Run takes under
a minute. on: full graph, 124,318 nodes. Directed. Sampled, 101 sources." Run button. "Runs of this
measure: none yet." OK, so "Not run" is refused and "Not run yet" is not started. That distinction
works for me: one is a verdict, one is a to-do. I would not mix them up. A junior might; the only
difference is "yet".

**The table.** "124,318 nodes not drawn. More than this browser draws at once (50,000). Every node is
counted in Statistics and listed in the table." Good. Nodes table: id (patent number), grantYear,
category (6 values), citationsReceived, sorted by citations. Statistics: density, isolates 2,406,
weak components 3,912 with the giant at 116,905 nodes, 94.0%, and an in-degree distribution on
log-log with "In-degree 0, not on the log axis: 41,873". Somebody here knows what a log axis does to
zeros. Respect.

So the category column exists. If the betweenness result is also a column in this table (the run said
"124,313 more in the table"), I can sort by it and read category beside it. That gets me "top
betweenness nodes and their categories". It does not get me "who bridges categories" -- that is
participation coefficient, or betweenness counted only over between-category pairs. I looked at the
algorithm menu: Centrality has Betweenness, Closeness, Eigenvector, Harmonic, HITS, Katz, PageRank.
Community has Girvan-Newman, Label propagation, Leiden, Louvain. Nothing that takes a partition and
tells me who straddles it. So: export the betweenness column and category, five lines of pandas.
Same as last round.

The graph is called "Patent citations" in the header, "Citations 1999 to 2001" in the inspector,
and "Citations" in the graph list. I assume those are one graph. I should not have to assume.

**Where I ended.** A sampled betweenness ranking with seed, sample size and error bound, which I
would trust as a ranking of the top two and a band after that -- if I knew which direction it ran
in. The refused exact run is presented honestly. The groups part of the question is still mine to do
outside the tool.

---

## Single Ease Question

**3 out of 7.** Getting a number was easy, easier than last time: the routes are grouped by the
time limit, the subgraph route says it is a different graph, the 500-sample warning is in place,
"Not run" is the right word for a refusal. Getting a number I can sign is exactly as hard as last
round, because the direction contradiction is not fixed -- it has spread to the refusal. And the
"groups" in the question still is not something the tool does.

## Would she use this instead of her current tool?

"Not instead. Next to, same as I said before. The refusal with routes, the seed in the form, the rank
ranges and the copyable run record are better than anything Gephi does with 124k nodes -- Gephi just
freezes. The runs list is how I think, one run per setting, keep the old one. But I told you last
time the form says directed and the record says undirected, and now the refusal says undirected too.
The first thing I do with a sampled betweenness number is check its normalization against networkx.
If the tool cannot tell me which direction it counted, that check fails before it starts, and I am
back in igraph where at least I know what I typed. Fix that and give me a bridging measure that takes
a column as the partition, and I would run it here and paste the methods line."

---

## Problems found

1. **Direction still contradicts itself, now in the refusal too.** (option-form-cost popover and
   running form; results-panel refused, finished-sampled.) Popover, form, state line and Options say
   "Directed"; the Not-run line says "the directed citations read as undirected"; the run record says
   "Citations read as undirected" with the undirected normalization. The zero count (~79,554 against
   41,873 in-degree zeros) suggests a directed computation, which would make the stated normalization
   off by a factor of two. Severity 4: she cannot tell which computation produced the numbers.
2. **The refusal's routes differ between the popover and the Results rail.** (option-form-cost over
   the time limit vs results-panel refused.) Four routes vs three (the 500-source sample is missing
   from the rail); "hours" vs "about 10 hours". Severity 2.
3. **Direction cannot be chosen before a route starts.** (option-form-cost over the time limit.) All
   routes inherit Directed; the Direction dropdown appears only once a run is going. On a near-DAG,
   directed betweenness is mostly zeros. Severity 3.
4. **"Exact, on 5,318 nodes" in the popover still does not name the set or say it is a different
   graph.** (option-form-cost over the time limit.) The rail's version ("the 5,318 nodes in Drug
   patents granted in 2001. This is a different graph.") does, so the two disagree. Severity 2.
5. **A refused run is not kept among the runs.** (results-panel refused, finished-sampled.) Runs of
   this measure lists only Run 1; the fact that the exact run was declined at an estimated 10 hours,
   which belongs in a methods note, is not recorded next to it. Severity 2.
6. **Run rows show sample size and date only.** (results-panel finished-sampled, Runs of this
   measure.) No direction or seed, so two runs differing only in direction or seed would read the
   same. Severity 2.
7. **No bridging measure over a chosen partition.** (algorithm menu.) Participation coefficient or
   between-group betweenness over a column (category) or a Leiden result is missing; the task's real
   question goes to pandas. Severity 3.
8. **Top nodes shows bare patent numbers.** (results-panel finished-sampled.) No category beside
   them, so "bridges which groups" cannot be read off the list. Severity 2.
9. **"zero ~79,554 nodes" on a sampled estimate.** (results-panel finished-sampled.) An estimated
   zero means no sampled path went through the node, not zero betweenness. Severity 2.
10. **One graph, three names.** (results-panel header "Patent citations", inspector "Citations 1999 to
    2001", past-drawing-limit graph list "Citations".) Severity 1.
11. **Three wordings for a held edit.** (option-form-cost: "Edits wait for Re-run", "Edit held",
    "Edit waits for Run".) Severity 1.
12. **"rank, low-high" column head** still reads first as a sort order. (results-panel
    finished-sampled.) Severity 1.

## What she liked

- "Not run" for a refusal: no red, no error, an estimate and the time limit in one line.
- "This is a different graph." on the subgraph route in the rail.
- The routes grouped under "Fits the time limit" and "Past the time limit".
- The 500-source warning in place: past the limit, runs in the background, 101 is the largest that fits.
- Seed visible and editable; Re-run keeps the earlier run; a list of runs with Compare with....
- The run record with method, seed, normalization with its n, error bound and Copy.
- Rank ranges ("#3-#7") and "Ranks below #2 may swap between runs."
- A table, a log-log degree distribution and "In-degree 0, not on the log axis: 41,873" instead of a hairball.
