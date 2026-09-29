# Session: "who bridges groups on the whole citation graph" -- the Gephi holdout

Participant: Dr. Mara Lindqvist (fictional composite), associate professor of computational social
science, Gephi user since 0.8, teaches it every year, checks every number against NetworkX. Played
at 1440 by 900.

Moderator task, as given: "Measure who bridges groups on the whole citation graph."

Screens used (participant view, design notes hidden; renders in shots/):
- the citation graph opened past the drawing limit (screens__past-drawing-limit.png) and a narrowed
  sample of it (screens__past-drawing-limit-sample.png)
- the Algorithms menu and Quick actions with cost words (screens__results-panel.png,
  screens__results-panel--quick-actions.png)
- Betweenness's options, past the time limit, with four routes
  (screens__option-form-cost-over-budget--study.png)
- the refused run in the Results place, "Not run: would take about 10 hours"
  (screens__results-panel--refused.png)
- the sampled run running, from the options and from the Results list
  (screens__option-form-cost-within-budget--study.png, screens__results-panel--running.png)
- the finished sampled run with its run record open (screens__results-panel--finished-sampled.png)
- a larger sample of 500 asked for after the first finished
  (screens__option-form-cost-sample-over-budget--study.png)
- a redone run waiting to run (screens__results-panel--not-run.png)
- for comparison, a finished exact run on the protein network with the table open
  (screens__results-panel--in-the-table.png)

## Think-aloud

**The graph.** Patent citations. 124,318 nodes, 1,480,221 edges, directed. I don't know this
dataset by heart, so I can't check the count the way I would on my own crawl -- I'll take it.
"124,318 nodes not drawn. More than this browser draws at once (50,000)." Fine. Honest. Gephi
would have drawn it and then frozen my laptop for ten minutes. But I'll say this now: "who bridges
groups" is something I normally READ off a spatialized map. Here there is no map. So this is a
numbers-only job. That's fine for today, but it is not visual network analysis.

"Bridges groups" -- that's betweenness. In Gephi it's buried under Network Diameter, which nobody
can ever find the first time. And on 124,000 nodes Gephi's betweenness is exact Brandes, no
sampling, so I'd raise the heap in gephi.conf, start it before lunch and hope. In practice I'd do
this in NetworkX with `betweenness_centrality(G, k=..., seed=...)`.

**Where are the statistics.** My hand goes to the right, where Statistics lives in Gephi.
Right panel says "Statistics, Overview: General, Change overview..." with nodes, edges, direction.
No list of measures to run. That's a summary, not my Statistics panel. OK. Menu, top left:
Algorithms, Centrality, Betweenness. First entry. Good, it's called betweenness, not "influence"
or "bridge score".

Quick actions shows the same list with a word on the right: Betweenness "hours", Closeness
"hours", Harmonic "hours", PageRank "under a minute". I like that. Before I click, it tells me this
is the expensive one. Gephi never told me anything; it just showed a progress bar that didn't move.

**Options, past the time limit.** I open Betweenness. Yellow mark: "Takes hours. The time limit is
30 seconds. Directed, on the full graph: 124,318 nodes." Then four rows:

- Fits the time limit: Sampled, 101 sources -- under a minute. Exact, on 5,318 nodes -- under a
  minute.
- Past the time limit: Sampled, 500 sources -- a few minutes. Exact, on the full graph -- hours.

Button: "Run sampled".

So it refused to just start. Good. And it didn't lie to me -- "exact on the full graph, hours" is
still on the list, it's not pretending the full run is impossible. That's what I want: tell me the
price, let me pay it.

Who decided the limit is 30 seconds? Can I change it? Nothing here says. I'd want to set it to
"overnight" for a paper.

"Exact, on 5,318 nodes." Which 5,318? On the Results version of this it says "Exact, on the 5,318
nodes in Drug patents granted in 2001. This is a different graph." Thank you. That sentence is the
thing Gephi never says. In Gephi, if my filter is on, my betweenness is on the filter and the
column doesn't tell me. Here it says out loud that it's a different graph. That one I'd put in my
handout.

But the task says the whole citation graph. So not the 5,318. Sampled or exact-in-the-background.

Why 101? Odd number. "The largest sample that fits the time limit." OK, so the tool picked it
from the clock, not from any accuracy target. 101 sources out of 124,318 is less than a tenth of a
percent. NetworkX people use k in the hundreds or thousands. I'd want 1,000 or more for a paper.
I'll take 101 as a first look.

**The refused run in Results.** Moderator says a refused run shows as "Not run". I open Results.
"Betweenness, exact. Not run: would take about 10 hours. The time limit is 30 seconds. On the full
graph, 124,318 nodes; the directed citations read as undirected."

Wait. Stop. The options form just said "Directed, on the full graph." This says "the directed
citations read as undirected." Which one is it? Those are different numbers. Directed betweenness
on a citation network counts paths that follow citations; undirected counts any chain in either
direction. On a DAG like this those two rankings can be very different. I note it and keep going,
but I'm now watching for it.

Also, "about 10 hours" here, only "hours" on the options. Fine, same thing, more precise here.

The route list here has three rows, not four. The sample of 500 is gone. Why is it in one place
and not the other?

And where is this "Not run" row in the list of runs? The moderator said the refused run is in the
list. What I see is the detail page. When I go back to the list (the Runs list with PageRank,
Betweenness sampled, Weakly connected components) I don't see a "Betweenness, exact -- Not run"
row. Maybe it's there on some screen I didn't get. I'd want it there, greyed, so I remember in a
week that I decided not to pay 10 hours.

**Running.** I press "Run sampled". Progress bar, "Running, under a minute, within the time
limit. Directed." There's a Cancel on the panel and a Cancel in the bar at the bottom. Scope Full
graph, Direction "As the graph: directed", Sample size 101 of 124,318, Seed 7. A seed. Good. I can
reproduce it. "Edits wait for Re-run" -- so if I change something now it doesn't kill the run.
Fine.

In the Results list the running one is at the top with a bar, "Running on WebGPU, under a minute.
Keeps Run 1." Newest first, with dates. That's the thing I've wanted in Gephi for ten years: each
run is a row with its settings and its date, and a rerun doesn't overwrite the last one. In Gephi
the column just gets overwritten and you find out in the response letter.

**Finished.** "Betweenness (sampled), 101 sources, Sep 28 09:52. On: full graph, 124,318 nodes.
Sampled, 101 sources. Directed. WebGPU."

Top nodes: #1 5879702 ~0.0160, #2 5902311 ~0.0037, then three rows all "#3-#7", ~0.0029, ~0.0025,
~0.0025. "Ranks below #2 may swap between runs." I actually like that. It tells me how far I can
trust the order, from the sample's own error. #1 is four times #2, so #1 is real. Below that it's
a tie band. That's honest. The column header "rank, low-high" I had to stare at -- it means the
range of ranks. Say "possible ranks".

Distribution: middle ~0, highest ~0.016, zero ~79,554 nodes. Two-thirds of the patents at zero.
That makes sense for DIRECTED betweenness on citations -- everything that is only cited, or only
cites, sits on no directed path. Read undirected, far fewer would be zero. So the zero count says
directed.

**The run record.** Details. Method: "Brandes betweenness from 101 random sources, scaled up by
124,318 / 101." Seed 7. Normalization: "Divided by (n-1)(n-2)/2, the node pairs of an undirected
graph." Error bound "+/- 0.00035 on each value, 95 runs out of 100." Direction: "Citations read as
undirected." Engine WebGPU. Took 29.9 s.

No. That's the contradiction again, and now it's in the record I'm meant to paste into my methods
section. The header says Directed. The Options say Directed. The run record says undirected, and
it normalized by the undirected pair count. NetworkX normalizes a directed graph by (n-1)(n-2), not
half that. So either every value on this page is off by a factor of two, or the ranking was
computed on the wrong graph. I can't tell which from here. And that ~79,554 zeros only makes sense
if it was directed.

This is exactly what I test every tool for. It does say what it computed on -- it says it twice,
two different ways. I can't cite this. I'd rerun it in NetworkX with k=101, seed 7, directed, and
see which one matches. If neither matches, I'm done with it.

"Copy" on the run record -- lovely idea, I'd paste that straight into a methods paragraph. Which is
exactly why it has to be right.

Also "Took 29.9 s" against a 30-second limit. That's a tenth of a second of margin. On a student's
laptop that run gets refused. The "under a minute" word hides that.

And WebGPU. Will seed 7 give the same numbers on a machine without WebGPU? Floating point on a GPU
isn't always bit-identical. The record doesn't say.

**A bigger sample.** I change the sample size to 500. Yellow: "500 sources take a few minutes,
past the 30-second time limit. Run starts it in the background. 101 is the largest that fits."
Button becomes Run. OK -- past the limit isn't forbidden, it just goes to the background. So the
"limit" is really "how long before you're sent to the background". Then call it that. I'd put
2,000 and go get coffee. I'd have liked to see the error bound it WOULD give at 500 before I run,
so I could pick k from the accuracy I need rather than from the clock.

"Edit held." Readings still show the 101-source result until I run the 500. Fine; the old run
stays as Run 1.

**Redone, not run.** The one where I undo during a run and redo: "Not run yet. Run takes under a
minute." Redo doesn't start work by itself. Good. I hate tools that fire off a computation because I
pressed Ctrl+Shift+Z.

**Is it who bridges groups?** Honestly -- betweenness answers "who sits on many shortest paths".
"Bridges groups" in my field is betweenness PLUS communities: which nodes connect modularity
classes. Nothing here puts the two together, and there's no map to see it on. I'd have to run
Louvain too and cross them in the table. The table on the protein network shows two measures side
by side, so I assume I could do that here. That's not a failure of this screen, but the tool does
not help me read "between which groups".

And the result can't be seen. "No Appearance here: nothing is drawn past the drawing limit." I'd
have to "Narrow the graph" to the top few and their neighbours to see anything -- and then I'm on
a subset again, which, to its credit, it would tell me.

## What I'd tell the moderator

The flow is better than Gephi for this. It priced the run before I clicked, refused to hang my
machine, gave me a sampled route with a seed and an error bound, said out loud that the 5,318-node
route is a different graph, and kept every run as its own row with a date. Those are real.

But the direction contradiction kills the number. Directed on the header and options, undirected in
the refused message and in the run record, with the undirected normalization. That's the one thing
I cannot have in a statistic. Fix that and I'd run this again.

## Single Ease Question

**4 out of 7.**

Finding it and getting a number took almost no effort -- menu, the cost word, the routes, Run
sampled, done. That part is a 6. What drags it to 4 is that I then had to stop and work out what it
actually computed, and I couldn't: directed or undirected depends on which part of the screen I
believe. The route list has four rows in one place and three in the other, the refused run I was
told is in the list I never saw there, and the sample size is chosen by a clock I can't change.

## Would I use it instead of my current tool?

No. For betweenness on 124,000 nodes my current tool isn't Gephi, it's NetworkX with k and a seed,
and NetworkX tells me once, consistently, whether the graph is directed and how it normalized. This
is nicer to drive than a notebook -- the price before the click, the error bound, the run history
-- and if the record agreed with itself I might use it as a first look before the notebook. But I
would still recompute the number in NetworkX before citing it, and as it stands the record
contradicts itself, so I can't even use it as the first look.

## Problems observed

1. **Direction contradicts itself.** The options and the finished run say "Directed"; the refused
   run says "the directed citations read as undirected"; the run record says "Citations read as
   undirected" and normalizes by (n-1)(n-2)/2, "the node pairs of an undirected graph". The
   distribution (~79,554 zeros of 124,318) only fits directed. The record meant for a methods
   section cannot be cited. Severity 4.
2. **The refused run's "Not run" row never appears in the runs list.** The Results list she saw
   (running, quick actions) shows only runs that ran; the refused exact run exists only as its
   detail page. Severity 2.
3. **The routes differ between the two places.** The options list four routes (including
   "Sampled, 500 sources, a few minutes"); the refused run in Results lists three, without the
   500. Severity 2.
4. **Sample size is picked by the clock, not by accuracy.** 101 is "the largest that fits"; no
   route or field shows the error bound a larger sample would give before running, so she cannot
   choose k for the precision she needs. Severity 2.
5. **The time limit is unexplained and looks fixed.** "The time limit is 30 seconds" with no say in
   it; she learns only by typing 500 that past the limit means "in the background", not "refused".
   Severity 2.
6. **"Under a minute" hides a 29.9-second run.** The run that "fits" took 29.9 s against a 30 s
   limit; a slower machine would refuse it. Severity 1.
7. **"rank, low-high" header is cryptic.** She read "#3-#7" correctly only after staring; "possible
   ranks" would say it. Severity 1.
8. **Nothing links betweenness to groups.** "Who bridges groups" needs communities too; nothing
   pairs the two, and past the drawing limit there is no map to read bridges from. Severity 1.
9. **Reproducibility across engines is not stated.** The record names WebGPU and seed 7 but does
   not say whether the same seed gives the same values without WebGPU. Severity 1.
10. **Mock inconsistencies she noticed.** The same graph is "Patent citations" in the left panel,
    "Citations 1999 to 2001" in the right, and "Citations" on the drawing-limit screen; a sampled
    run dated 09:52 is already in the list before she runs one. Severity 1.

## What worked for her

- Cost words in the catalog ("hours", "under a minute") before she clicked.
- Refusal instead of a hang, with the full exact run still offered at its price ("hours", "about
  10 hours") rather than hidden.
- "Exact, on the 5,318 nodes in Drug patents granted in 2001. This is a different graph." -- the
  subset trap she fights in Gephi, named in one sentence.
- A seed, a sample size "of 124,318", and a run record with method, normalization and error bound,
  with Copy for a methods section.
- Rank ranges from the run's own error bound and "Ranks below #2 may swap between runs."
- Runs kept as separate dated rows, newest first; a rerun keeps Run 1 instead of overwriting it.
- Redo brings a run back unrun and never starts work by itself.
