# Costly measure: who bridges groups on the whole citation graph -- Dr. Chen (computational biologist)

Task as given: "Measure who bridges groups on the whole citation graph."

Participant: Dr. Chen, computational biologist, igraph and Cytoscape user
(study/personas/bioinformatics-researcher.md). Not her domain -- patents, not proteins -- but the
question is one she asks weekly: betweenness on a big network.

Screens seen (study view, 1440 x 900), in the order she met them:

- shots/record/r6-chen-cm-results-panel-quick-actions.png (Quick actions, "centrality" typed)
- shots/record/r6-chen-cm-option-form-cost-over-budget.png (Betweenness chosen: the cost popover)
- shots/record/r6-chen-cm-results-panel-refused.png (Betweenness, exact: "Not run")
- shots/record/r6-chen-cm-option-form-cost-within-budget.png (the sampled run, running)
- shots/record/r6-chen-cm-results-panel-running.png (the Runs list while something runs)
- shots/record/r6-chen-cm-results-panel-finished-sampled.png (the finished sampled run, Details open)
- shots/record/r6-chen-cm-option-form-cost-sample-over-budget.png (asking for 500 sources)
- shots/record/r6-chen-cm-results-panel-not-run.png (a run brought back "Not run yet")
- shots/record/r6-chen-cm-past-drawing-limit.png and -not-drawn.png (the graph too big to draw)
- For comparison: shots/record/r6-chen-cm-results-panel-in-the-table.png (exact betweenness on the 300-protein network)

## Think-aloud

**1. Where am I.** "Patent citations. 124,318 nodes, 1,480,221 edges, directed. Nothing drawn --
'124,318 nodes not drawn, more than this browser draws at once (50,000).' Fine. Honestly I prefer
that to a hairball of 124,000 dots. It says every node is still counted and in the table, which is
the part I care about."

"Top right says 'Citations 1999 to 2001'. Left says 'Patent citations'. The not-drawn screen says
'Citations'. Is that three things or one? I assume one graph with three names. I'd want one name,
because that name goes into my methods paragraph."

**2. Finding betweenness.** "'Who bridges groups' -- that's betweenness. Maybe bridging centrality
if you're fancy, but betweenness is what a reviewer expects." She opens Quick actions and types
"centrality". "Oh, that's useful. It tells me the cost before I click: Betweenness 'hours',
Closeness 'hours', Harmonic 'hours', the rest 'under a minute'. Cytoscape just starts and I find
out at 2am. Good."

"Harmonic 'hours' too, sure, all-pairs shortest paths. That's honest."

**3. Pressing Betweenness.** The popover: "Takes hours. The time limit is 30 seconds. Directed, on
the full graph: 124,318 nodes." Then two groups, "Fits the time limit" and "Past the time limit".
Preselected: "Sampled, 101 sources -- under a minute". Button reads "Run sampled".

"Thirty seconds is a time limit I didn't set. Where is it set? I don't see it. On the cluster I'd
just let exact run overnight. But okay, in a browser, fine."

"101 sources. Odd number. Why 101 and not 100?" (Later the sample-size form says 101 is 'the
largest sample that fits the time limit', which answers it. It's not on this first screen.)

"'Exact, on 5,318 nodes' -- which 5,318? I guess the drug patents set on the left, 5,318. It
doesn't say so here." (The Not-run page says it: 'Exact, on the 5,318 nodes in Drug patents
granted in 2001. This is a different graph.' Good wording. I would want it here too.)

**4. The refused one.** "Say I'm stubborn and ask for exact anyway, via the menu." The Results
panel: "Betweenness, exact. Not run: would take about 10 hours. The time limit is 30 seconds. On
the full graph, 124,318 nodes; the directed citations read as undirected."

"Wait. Stop. The popover a second ago said 'Directed'. This says the directed citations are read
as undirected. Which is it? For a citation network that is not a detail. Directed betweenness on
a DAG and undirected betweenness are different numbers, different rankings. In a citation DAG a
lot of nodes are zero directed -- anything never cited or citing nothing."

"And 'hours' in the popover, 'about 10 hours' here. Fine, more precise, but pick one. If it knows
10, say 10 both places."

"'Not run' with no red, no error. Good. Nothing failed, it just refused. I like that it hands me
three routes and doesn't pretend. The stringApp 'null' thing -- this is the opposite of that. It
tells me the limit and what I can do instead."

**5. Looking for it on the rail.** "You told me the refused one sits in my runs list as 'Not run'.
I don't see it. When I'm on the Not-run page, the list is gone -- I'm inside it. The list I did
see had PageRank twice, the sampled betweenness, weakly connected components. No 'Betweenness,
exact -- Not run'. Maybe it's there after I press Back. I'd have to take it on faith."

"Also 'Not run' means two things. On the refused one: 'Not run: would take 10 hours'. On the one
brought back with Redo: 'Not run yet. Run takes under a minute.' One is 'we won't', the other is
'you haven't'. Close enough that I'd glance past the difference in a list."

**6. Running the sampled route.** "Run sampled." The popover: "Running, under a minute, within the
time limit. Directed." Progress bar. Seed 7. Sample size 101 of 124,318. "Seed shown. Seed
editable. That alone puts it above half the tools I've reviewed. I can reproduce this."

"Direction: 'As the graph: directed'. So I can choose. Good. That's the popover though; the refused
page still says undirected."

"Below: 'Edits wait for Re-run'. Another screen says 'Edit waits for Run', another 'Edit held.'
Three phrasings of the same thing. Minor."

**7. The result.** "Betweenness (sampled), 101 sources, Sep 28 09:52. on: full graph, 124,318
nodes. Sampled. Directed. WebGPU. Weight: no numeric edge column." Top nodes: patents 5879702
~0.0160, 5902311 ~0.0037, then three at ~0.0029, ~0.0025, ~0.0025 all labelled '#3-#7'.

"Tildes on estimates. Ranks as a band, '#3-#7', and 'Ranks below #2 may swap between runs.'
That's... actually right. That's what I would write in the legend by hand. The top one is four
times the next -- that one is a real bridge, the rest is noise at 101 sources. It says so."

"The column header says 'rank, low-high'. Low-high what? The rank goes #1 at top, so that's
high-low by score. Confusing."

"'124,313 more in the table'. 124,318 minus 5. It adds up. Good."

"Distribution: middle ~0, highest ~0.016, zero ~79,554 nodes. Estimated zero. Hmm. Is that
'zero betweenness' or 'no sampled path went through them'? At 101 sources those are not the same
thing. For directed, lots of true zeros -- 41,873 never cited, per the Statistics panel. But
79,554 'estimated zero' I would not put in a paper without a caveat."

**8. Details -- the run record.** She opens Details. "Method: Brandes betweenness from 101 random
sources, scaled up by 124,318 / 101. Seed 7. Normalization: divided by (n-1)(n-2)/2, the node
pairs of an undirected graph. Error bound +-0.00035 on each value, 95 runs out of 100. Direction:
Citations read as undirected. Engine WebGPU. Took 29.9 s."

"There it is again. The header of this very run says 'Directed', the Options block says
'Direction: Directed', and the run record -- the thing I would copy into my methods -- says 'read
as undirected' and normalizes by the undirected pair count. One of those is wrong. If the numbers
were computed undirected, the ranking is not the directed ranking I thought I asked for. I cannot
defend this number to a reviewer until I know which it was. That's a stop for me."

"The rest of the record is exactly what I want. Method, seed, normalization, error bound with a
confidence level, engine, wall time. A 'Copy' button. Give me a citation for the sampling
estimator -- Brandes and Pich 2007 or whatever you use -- and I'd paste that straight in."

"+-0.00035 on each value. #3 is 0.0029, #4 and #5 are 0.0025. Difference 0.0004. Barely over the
bound. So the band '#3-#7' is honest. Fine."

**9. Can I do better than 101.** Sample size to 500: "500 sources take a few minutes, past the
30-second time limit. Run starts it in the background. 101 is the largest that fits." "Oh, so the
time limit is not a wall -- I can go past it, it just goes to the background. Then why did exact
refuse? Because 10 hours is too long for a browser tab, I suppose. It doesn't say where the line
is between 'background' and 'refused'. A few minutes allowed, ten hours not. What about an hour?"

"And the Re-run button on the finished run is greyed out. 'Re-run (keeps Run 1)'. Why greyed? I
haven't changed anything, maybe that's why. It doesn't say."

**10. Getting it out.** "Now the part that decides whether this goes in a pipeline. I want the
node table with the betweenness column as a TSV. The protein network's table has 'Export
table...' and columns that say 'exact, full graph'. Here I'd expect 'estimated, 101 sources'
under the header. I assume the table link works the same. I didn't see an API or R path anywhere.
Same answer as last time: viewer, not pipeline."

## Single Ease Question

**5 of 7.**

"Getting to the number was easy. It told me the cost before I clicked, refused the ten-hour run
without drama, preselected a sensible sampled run, showed the seed, and banded the ranks it wasn't
sure of. That's better than I expected and better than Cytoscape, which would have just frozen.
I'm not giving it a 6 or 7 because the same run says 'Directed' in three places and 'read as
undirected' in two, including the run record I'd quote. And the 'Not run' entry in my runs list
I was told about, I never actually saw."

## Would she use this instead of her current tool?

"No, not instead. For this I'd run exact betweenness on the cluster with igraph overnight and
have a number nobody can argue with. But as a first look -- 30 seconds, a banded top list with an
error bound and a seed -- yes, I'd use it to decide whether the overnight run is worth doing, and
to show a collaborator which patents to look at. It moves up to 'alongside igraph' the day the
direction is stated once and consistently, and the table comes out as a TSV I can join in R."

## Problems, in her words, with where she saw them

1. **Direction contradicts itself within one run** (severity 4). Refused page: "the directed
   citations read as undirected". Popover and run header: "Directed". Options: "Direction:
   Directed". Run record: "Direction: Citations read as undirected", normalization by undirected
   node pairs. "I cannot defend this number until I know which it was."
2. **The refused run never appears on the Runs list I could see** (severity 3). The task promised a
   'Not run' row; the refused page replaces the list and no list view shows it.
3. **"Not run" means both "won't" and "haven't yet"** (severity 2). "Not run: would take about 10
   hours" versus "Not run yet. Run takes under a minute."
4. **"hours" versus "about 10 hours"** for the same estimate (severity 2), popover versus refused
   page.
5. **No stated line between "runs in the background" and "refused"** (severity 2). 500 sources for
   a few minutes is allowed past the 30-second limit; 10 hours is not; the rule is not shown.
6. **"Exact, on 5,318 nodes" in the popover does not name the set** (severity 2); the refused page
   does ("in Drug patents granted in 2001. This is a different graph.").
7. **"~79,554 nodes" at estimated zero** is ambiguous under sampling (severity 2): true zero, or no
   sampled path through them?
8. **Three names for one graph** (severity 1): "Patent citations", "Citations 1999 to 2001",
   "Citations".
9. **Re-run greyed out with no reason** on the finished sampled run (severity 1).
10. **"rank, low-high" header** reads backwards against a list sorted highest first (severity 1).
11. **Three phrasings of the held-edit note**: "Edits wait for Re-run", "Edit waits for Run", "Edit
    held." (severity 1).
12. **No citation for the sampling estimator** in the run record, and no scripting or R path seen
    (severity 2).

## What pleased her

- Cost words in Quick actions before anything runs ("hours" beside Betweenness).
- A refusal that is not an error: no red, the limit stated, three routes, the cheapest preselected.
- Seed shown and editable; sample size explained as "the largest that fits".
- Ranks banded ("#3-#7") with "Ranks below #2 may swap between runs", tildes on estimates.
- Run record with method, normalization, error bound with confidence, engine and wall time, and a
  Copy button.
- "124,313 more in the table" adds up to the node count.
