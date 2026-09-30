# Session: measuring who bridges the groups in a large citation graph -- knowledge graph engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (composite persona, see
`study/personas/knowledge-engineer.md`). Expert in graphs; knows betweenness and asks which
centrality any tool means. She ran this same task on an earlier version of these screens and
remembers what bothered her then.

Task as given by the moderator: "Measure who bridges the groups on the whole citation graph."

Screens used, in order: the measure options with a time cost (`screens/option-form-cost.html`,
the over-the-limit, running and sample-past-the-limit states), the results panel
(`screens/results-panel.html`: the runs list, the refused "Not run" state, the finished sampled
state with its run record), and the graph past the drawing limit
(`screens/past-drawing-limit.html`, the not-drawn state).
Renders looked at: `shots/record/screens__option-form-cost-over-budget--study.png`,
`shots/record/screens__option-form-cost-within-budget--study.png`,
`shots/record/screens__option-form-cost-sample-over-budget--study.png`,
`shots/record/screens__results-panel-running--study.png`,
`shots/record/screens__results-panel-refused--study.png`,
`shots/record/screens__results-panel--not-run.png`,
`shots/record/screens__results-panel-finished-sampled--study.png`,
`shots/record/screens__past-drawing-limit-not-drawn--study.png`.

Outcome: success with difficulty. She got a ranked, error-bounded answer quickly and liked how
the refused exact run is presented. She still cannot say whether the ranking is directed or
undirected: the contradiction she reported last time is still there, and the new "Not run" card
adds a third wording of it. She would not report the numbers.

## Think-aloud transcript

**1. The options for Betweenness on the patent graph.**

"Patent citations, 124,318 nodes, 1,480,221 edges, directed. Betweenness is open. 'Takes hours.
The time limit is 30 seconds. Directed, on the full graph.' Same as last time. Still 'hours', no
number. Two hours or twenty? I asked for that.

Four rows. 'Fits the time limit': Sampled, 101 sources, under a minute. Exact, on 5,318 nodes,
under a minute. 'Past the time limit': Sampled, 500 sources, a few minutes; Exact on the full
graph, hours.

And again: the heading says it fits a 30-second limit, and the row says 'under a minute'. Under a
minute is not under thirty seconds. I said this last time. Nobody changed it. That tells me
either nobody read it, or somebody decided it does not matter. To me it matters -- it is the
only number on the screen that is supposed to justify the choice.

The 5,318 row -- I remember that is the drug-patents set on the left, not the whole graph. On
this screen it still does not say so. I only know because I was burned last time."

**2. What happens if I ask for 500 sources.**

"Sample size 500 of 124,318. Amber mark: '500 sources take a few minutes, past the 30-second
time limit. Run starts it in the background. 101 is the largest that fits.' Good. It does not
forbid me, it tells me the price and lets me pay it. That is the right attitude. 'A few
minutes' is vague but tolerable for a background job.

The header line says 'Finished on 101 sources, seed 7. Directed. Edit held.' 'Edit held'? And
lower down 'Edit waits for Run'. On the running screen it was 'Edits wait for Re-run'. I think
it means my change has not been applied yet. Three phrasings for one idea. I will leave it.

Direction dropdown: 'As the graph: directed.' Fine. That is what I want for citations. Hold on
to that."

**3. What if I insist on the exact run -- the 'Not run' card.**

"The moderator shows me what happens when I ask for exact on the full graph. The results rail
switches to 'Betweenness, exact' with a grey box: 'Not run: would take about 10 hours. The time
limit is 30 seconds.'

About ten hours. Now there is a number. Good -- why is it here and not on the options screen
where I actually choose? Same estimate, two places, one of them says 'hours' and the other says
'about 10 hours'. At least this one I can plan around: ten hours is an overnight job, and that is
what I do today in networkx anyway.

It is grey, not red, no error icon. Correct. Nothing failed; the tool declined. I like that it
does not pretend this is an error.

The routes under it: Sampled 101, under a minute. 'Exact, on the 5,318 nodes in Drug patents
granted in 2001. This is a different graph.' Thank you. That sentence is exactly what I wanted
last time. But the options screen still does not have it, and this list has three routes where
the options had four -- the 500-source sample is missing here. Two lists of 'ways forward' for
the same refusal, and they disagree. Minor, but I notice.

Now read the grey line again: 'On the full graph, 124,318 nodes; the directed citations read as
undirected.'

Read as undirected. The options I was looking at a minute ago said 'As the graph: directed'. So
which is it? If the exact run can only read the graph undirected, say so on the options form, and
do not show me a dropdown set to directed. This is the same contradiction as last time, and it
is now written in a third place."

**4. Running the sample and finding it on the rail.**

"I run 'Sampled, 101 sources'. Progress in the panel, progress in a bar over the canvas, Cancel
in both. 'Running, under a minute, within the time limit. Directed.' There it is again:
'Directed.'

The Results rail is new to me. 'Every run of a measure, with its settings and date.' Runs, 4,
newest first: two PageRank runs with their damping, 'Betweenness (sampled), 101 sources, Sep 28
09:52', 'Weakly connected components, 3,912'. That is a run log. I like a run log. Settings and a
timestamp in the row label is what I would write in my notebook anyway.

But where is the exact run that was refused? It had its own name and its own page a moment ago.
If it is a record, I expect it in the list, greyed, 'Not run'. In this list it is not there. So
either a refusal is not a run, or it silently disappeared. I would want it kept -- it is the
evidence that I asked for exact and why I did not get it."

**5. Finished. The result and the record.**

"Top nodes: #1 5879702 at about 0.0160, #2 5902311 at about 0.0037, '#3-#7' three times, and
'Ranks below #2 may swap between runs.' Same as before, still honest, still good. 'rank,
low-high' still needs the rows to decode.

Patent numbers only. I went and looked at the table on the not-drawn screen: the columns are id,
grantYear, category, citationsReceived. There is no title in this data at all. So that one is
the dataset's fault, not the tool's. Fine.

'Runs of this measure 1. Run 1, 101 sources, Sep 28 09:52, shown.' 'Re-run (keeps Run 1)'.
Good: a re-run does not overwrite. That is what I would want for comparing a 101 sample against
a 500 sample.

Now Details, the run record. Method: Brandes from 101 random sources, scaled up by 124,318/101.
Seed 7. Error bound plus or minus 0.00035, 95 runs out of 100. Engine WebGPU. Took 29.9 s.

Normalization: divided by (n-1)(n-2)/2, the node pairs of an undirected graph. Direction:
'Citations read as undirected.'

And directly under the record, in Options: 'Direction: Directed.' The summary line at the top:
'Directed.' The running line: 'Directed.' The record: undirected.

This is the same thing I stopped on last time, word for word. It is not fixed. If it were
deliberate -- say the engine only computes undirected betweenness -- then the Options row and
the dropdown are lying. If it is a mistake in the record, then the normalization is wrong and
every value is off by a factor of two. Either way I cannot use the numbers. In a citation graph
directed and undirected betweenness answer different questions.

And 'Took 29.9 s' against a 30-second limit, with the row having promised 'under a minute'. So
it fit by a tenth of a second, on WebGPU. My laptop does not always have WebGPU. Nothing on the
options screen said the estimate assumes it. On my machine that 'fits' could be a refusal."

**6. The not-drawn canvas.**

"'124,318 nodes not drawn. More than this browser draws at once (50,000).' The table is there,
counts on the right: isolates 2,406, weak components 3,912, biggest 116,905 at 94.0 percent. I
can check those against SPARQL. Still the best screen of the three.

The graph is called 'Citations' here, 'Patent citations' in the left panel, 'Citations 1999 to
2001' in the right panel of the results screen. 'average total degree' in one, 'average degree'
in the other. The components name is now consistent -- 'Weakly connected components'
everywhere I looked. One fixed, the others not."

## After the task

**Single Ease Question: 4 of 7.**

"Getting a ranking is easy, and the new pieces -- the run log, 'Not run' with ten hours and no
red, 'This is a different graph', 'Re-run keeps Run 1' -- are real improvements. But the one
thing I said would stop me last time still stops me. The tool tells me directed in four places
and undirected in two, and it has now had a whole round to decide which. That is the same
unexplained contradiction, and it counts twice now because it was reported."

**Would she use this instead of her current tool?**

"No. Not for a number I have to put in a report. My current tool is networkx over a SPARQL
export, exact, overnight -- and this tool itself now tells me exact is about ten hours, which is
the same overnight job. What it would give me is a first look in thirty seconds with an honest
error bound and a run log, and I would use it for that, if and only if the direction question is
answered. Until then I cannot even use it as a first look, because a first look in the wrong
direction points me at the wrong patents."

## Problems found

1. Still unfixed from last time: the run record says "Citations read as undirected" and
   normalizes by undirected node pairs, while the direction dropdown, the Options section, the
   summary line and the running line all say "Directed". The new "Not run" card adds a third
   wording ("the directed citations read as undirected"). Severity 3.
2. Still unfixed: "Fits the time limit" (30 seconds) above rows that say "under a minute"; the
   finished run then took 29.9 s. Severity 2.
3. The options form still says only "hours" for the exact run, while the "Not run" card for the
   same run says "about 10 hours". The number belongs where the choice is made. Severity 2.
4. The refused exact run does not appear in the Results rail's list of runs; after it is
   refused there is no record that exact was asked for and declined. Severity 2.
5. The routes offered on the "Not run" card (three) differ from the options form (four: the
   500-source sample is missing), and only the card says the 5,318-node route is "a different
   graph". Severity 2.
6. The time estimates do not say they assume WebGPU; a run that took 29.9 s on WebGPU would not
   fit on a machine without it. Severity 2.
7. Graph name drifts between "Patent citations", "Citations 1999 to 2001" and "Citations";
   "average total degree" versus "average degree". Severity 1.
8. Three phrasings for an unapplied edit: "Edit held", "Edit waits for Run", "Edits wait for
   Re-run". Severity 1.
9. Still no measure that means "bridges groups" directly (a participation coefficient over a
   community split); betweenness remains a proxy. Severity 1.
10. "rank, low-high" column header still needs the rows to decode it. Severity 1.

## What worked for her

- "Not run: would take about 10 hours" in grey, with no error mark: a refusal, not a failure,
  with a number she can plan an overnight run around.
- "This is a different graph" on the 5,318-node route.
- The Results rail as a run log: each run named with its settings and date, newest first.
- "Re-run (keeps Run 1)": a re-run never overwrites the earlier result.
- A sample past the time limit is offered with its price and run in the background, not
  forbidden.
- Seed, method, error bound and "ranks below #2 may swap" still stated plainly.
- The weak component counts and isolates on the not-drawn screen, usable as a known-answer check.
