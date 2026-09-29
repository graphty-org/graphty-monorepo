# Session: measure who bridges groups on the whole citation graph -- Analyst Alex

Participant: Alex, data analyst on an operations analytics team at a logistics company. He computes
metrics in NetworkX and draws in Gephi. His worst memory is a betweenness run on a 42k-node graph
that went "over lunch and then some" with no warning, so a big betweenness run is the thing he is
most nervous about clicking.

Task as given by the moderator: "Measure who bridges groups on the whole citation graph."

Dataset: the patent citation sample, 124,318 nodes and 1,480,221 directed edges (citations
1999 to 2001).

Screens seen, in order, as a participant sees them (design notes hidden), all rendered fresh for
this session:

1. `shots/tasks/costly-measure/01-option-form-cost-within-budget.png` -- the betweenness settings
   card over the canvas, a sampled run of 101 sources in progress
2. `shots/tasks/costly-measure/02-option-form-cost-sample-over-budget.png` -- the same card after
   the run, with the sample size changed to 500
3. `shots/tasks/costly-measure/03-results-panel-refused.png` -- the Results panel on "Betweenness,
   exact": not run, with the ways that fit the time limit
4. `shots/tasks/costly-measure/04-results-panel-finished-sampled.png` -- the finished sampled
   result, with its run record open
5. `shots/tasks/costly-measure/05-past-drawing-limit.png` -- the canvas with nothing drawn and the
   node table below it

## Think-aloud

**Screen 1 -- the settings card, already running.**

"OK, 'who bridges groups' -- that's betweenness. That's the one I'd run in NetworkX. And it's the
one that ate my lunch last time, so. 124 thousand nodes, 1.4 million edges. Yeah, in NetworkX
exact on that I'm not even starting it.

So it's... already running? 'Betweenness (sampled).' I didn't pick sampled, I don't think. It
just went there. 'Running, under a minute, within the time limit.' OK. That's -- honestly that's
the sentence I wanted four hours into that NetworkX run. There's a bar, there's a Cancel up in the
card and another Cancel down in the black strip at the bottom. Two cancels, fine, I'd rather two
than none. The blue one in the card header looks like the main button though -- blue usually means
'go', and here it means stop. I'd hesitate on that for a second.

Sample size 101 of 124,318. Hmm. A hundred and one? That's -- what, a tenth of a percent of the
nodes. 'The largest sample that fits the time limit.' So it picked the number for me off a clock,
not off how accurate it'll be. In NetworkX I'd use k equals, like, 500 or 1000 and go get coffee.
A hundred and one sounds small. I'd want to know if that's good enough before I put it in front of
anyone.

Seed 7, and a little refresh button. Good, there's a seed. That's the thing I never remember to
set in NetworkX and then I can't reproduce it.

'Readings, when it finishes: Scores are estimated from 101 sources. The top of the ranking is
usually stable; a single score can be well off.' OK, that I can actually say out loud. 'The top
of the list is solid, the exact numbers are rough.' That's a director sentence. Good.

'Edits wait for Re-run.' I don't really know what that means. I guess if I change something now it
won't do anything until I re-run. Fine.

Canvas is empty. '124,318 nodes not drawn. Narrow the graph...' OK, too big to draw, it says so,
it says how many. I'll come back to that."

**Screen 2 -- finished, and I try 500.**

"'Finished on 101 sources, seed 7. Directed.' Right. So now I bump it to 500 because 101 bugs me.
And it tells me: '500 sources take a few minutes, past the 30-second time limit. Run starts it in
the background.' Yellow warning. 101 is the largest that fits.

Wait. So the 30-second limit isn't actually a limit? It'll just run it in the background if I say
so. OK -- then why did it pick 101 for me in the first place, if 500 in a few minutes is allowed?
A few minutes is nothing. I'd have taken the few minutes. I'd take 500 every time for something
going in a deck.

And who set 30 seconds? Not me. I don't see where I'd change it. Whatever, 'a few minutes' in the
background is fine, I'd press Run.

'Edit held.' Same thing as before I think. Held where?"

**Screen 3 -- 'Betweenness, exact', not run.**

"OK so this is the Results side, and it's on 'Betweenness, exact'. 'Not run: would take about 10
hours. The time limit is 30 seconds.' Ha. Ten hours. Yeah, that tracks with my lunch disaster.
Good -- it didn't start it and let me find out the hard way. And it's grey, not red, so it doesn't
look like I broke something. It just didn't do it. That's right.

Then it gives me options. 'Fits the time limit: Sampled, 101 sources, under a minute.' 'Exact, on
the 5,318 nodes in Drug patents granted in 2001 -- this is a different graph.' OK, that's honest,
it's telling me that's not the same question. I wouldn't pick that one for 'the whole citation
graph' -- the task says whole graph.

'Past the time limit: Exact, on the full graph, hours.' And it's got a play arrow. So... can I
run it? It said 'Not run' because of the limit, but then it lists it with a play button. So the
limit's the same as on the last screen -- a speed bump, not a wall? Then 'Not run' just means
'not run yet'? I'd probably not click it, ten hours in a browser tab on my laptop, no. But I don't
know if that play arrow would warn me again or just go.

Wait -- 'On the full graph, 124,318 nodes; the directed citations read as undirected.' Undirected?
The card said 'As the graph: directed.' Hmm. Park that.

'Run sampled' button at the bottom. Fine, that's the obvious one."

**Screen 4 -- the finished sampled result, with the run record.**

"OK now there's a result. 'Betweenness (sampled), 101 sources, Sep 28 09:52.' Top nodes.

#1 5879702, about 0.0160. #2 5902311, about 0.0037. So number one is four times number two. That's
a big gap -- that's either a real bridge or something weird in the data. I'd want to know what
that patent is. It's just a number. I'd have to go look it up. For a director, 'patent 5879702' is
nothing -- I need a title or a category next to it.

Then #3-#7, #3-#7, #3-#7. Three rows all labelled 3 to 7. OK, I get it, they're tied within the
error, so it won't give them an order. That's actually fair. But it says 3 to 7, that's five
patents, and I only see three. Where are the other two? '124,313 more in the table' -- 124,318
minus 5, so the other two are in the table I guess. Weird to cut a tie group in half.

'rank, low-high' as a column header. I don't know what that means. Lowest rank to highest? The
column's just rank. Skip.

'Ranks below #2 may swap between runs.' Good, that's the sentence. I'd paste that.

Distribution: middle about 0, highest 0.016, zero about 79,554 nodes. So most patents bridge
nothing. Sure, most patents aren't cited much. Makes sense.

Run record -- 'Details' opened this. Method: 'Brandes betweenness from 101 random sources, scaled up
by 124,318 / 101.' Seed 7. Normalization divided by (n-1)(n-2)/2, 'the node pairs of an
undirected graph'. Error bound plus or minus 0.00035 on each value, 95 runs out of 100. Engine
WebGPU. Took 29.9 seconds. And a Copy button. OK -- this is good. This is the box I'd paste into
the appendix slide, or into my notebook so I can check it in NetworkX. I haven't seen a tool just
hand me this before. Gephi certainly doesn't.

Plus or minus 0.00035. So #3 at 0.0029 and #4 at 0.0025 are 0.0004 apart -- about one error bound.
Yeah, that's why they're tied. OK, the tie thing checks out. And #1 at 0.016 plus or minus 0.00035
is way clear of everything. So I can say number one with confidence. That I like.

But: Direction, 'Citations read as undirected.' And up top in the header it says 'Directed.' And
under Options, 'Direction: Directed.' So which one did it actually compute? This is the thing. If
I run nx.betweenness_centrality on a DiGraph with k=101, seed=7, I get directed numbers, and they
won't match this if this was undirected. And if they don't match, I'm not using it -- that's the
first thing I check. Three places say directed, two say undirected. I genuinely can't tell. My
guess is it ran undirected, because the record is the more detailed one and the 'Not run' note
said the same. For 'who bridges groups', honestly undirected is probably what I'd want -- a
citation link is a link either way when you're asking about bridging. But I want it to say one
thing, not two.

'Runs of this measure: 1. Run 1, 101 sources, shown.' 'Re-run (keeps Run 1)' is greyed out --
because nothing's changed I guess. OK. Keeps Run 1 is good, it's not going to overwrite my first
one. 'Compare with...' -- I'd use that after the 500 run to see if the top ten moved. That's
exactly the 'is it stable' check I'd want to show someone.

The ten-hour exact one isn't in 'Runs of this measure'. I guess it's a different measure -- exact
versus sampled. The 'Not run' one lives on its own. Fine, I didn't run it, it shouldn't count as a
run.

Graph name: left says 'Patent citations', right says 'Citations 1999 to 2001'. Same thing? I
assume."

**Screen 5 -- nothing drawn, the table.**

"'124,318 nodes not drawn. More than this browser draws at once (50,000). Every node is counted in
Statistics and listed in the table.' OK. So no picture of the whole thing. That's -- I mean, the
whole thing would be a hairball anyway. I don't need the picture for this question; I need the
list. The picture is a second job, I'd narrow to the giant component or the top few thousand for
the slide.

The table. Sorted by citationsReceived, highest first. id, grantYear, category, citationsReceived.
Where's betweenness? The result said '124,313 more in the table', so I'd expect a betweenness
column, sorted. It's not here. Maybe I have to add the column, maybe it's off to the right. I'd
scroll right, then I'd hit the three dots. If it's not there I'd go back to the result and try
clicking '124,313 more in the table' directly -- that's probably what opens it sorted. But on this
screen, no, I can't find my number.

Export -- probably the three dots. No 'Export' word anywhere I can see. I'd find it, but I'd have
to look.

On the right: weak components 3,912, the big one is 116,905 nodes, 94%. Isolates 2,406. That's
useful -- betweenness on the dust is zero anyway, and that explains some of the 79 thousand
zeros. I'd tell the director 'the main network is 94% of patents.'"

## What I'd tell my manager (as Alex would write it)

"Ran betweenness on the full citation network (124k patents) as an estimate from 101 random
starting points, seed 7, about 30 seconds. Exact would take ~10 hours. The #1 bridge (5879702) is
clearly ahead of everyone -- about 4x the next one, well outside the error. #2 is solid. Positions
3 to 7 are within the margin and may swap on a re-run. Checking the direction setting before I
send the numbers."

## Single Ease Question

**4 out of 7.**

What took longest: working out whether it ran directed or undirected, and then not finding the
betweenness column in the table. The cost part -- the estimate before running, the ten-hour
warning, the progress bar and Cancel -- was the easiest a big betweenness run has ever been for me.
The number I'd actually put in a deck is the part I couldn't pin down.

## Would I use this instead of my current tool?

For this step, partly. I'd use it to find out, in thirty seconds, whether a betweenness run is
even worth doing and who the obvious top bridges are, instead of starting NetworkX and hoping. The
run record with the seed and the error bound is better than anything I get in Gephi, and I'd
paste it. But I would still re-run the final numbers in Python until I've seen them match
NetworkX once, and right now I can't set up that check because the screen says both directed and
undirected. If that were one answer and it matched, I'd switch for this job.

## Findings (for the studio)

| Screen | What happened | Severity (1 low - 4 blocks) |
|---|---|---|
| Finished result, run record; settings card; not-run note | The direction is stated both ways. The card ("As the graph: directed"), the result header ("Directed.") and the Options list ("Direction: Directed") say directed; the run record ("Citations read as undirected", normalised by the pairs of an undirected graph) and the not-run note ("the directed citations read as undirected") say undirected. He cannot set up the NetworkX check that decides whether he trusts the tool. Quote: "Three places say directed, two say undirected. I genuinely can't tell." | 3 |
| Settings card at 500; not-run note | The 30-second time limit acts as a wall in one place and a speed bump in another. 500 sources "past the time limit" will run in the background, but exact is "Not run" because of the same limit, then listed under "Past the time limit" with a play arrow. He cannot tell whether the play arrow runs ten hours or asks first. Quote: "So the limit's... a speed bump, not a wall? Then 'Not run' just means 'not run yet'?" | 2 |
| Settings card, running | The sample size is chosen by the clock (101, "the largest sample that fits") with no statement of what accuracy 101 buys. The accuracy shows only after the run, in the run record. He would have chosen 500 at once had he known it takes only "a few minutes". Quote: "It picked the number for me off a clock, not off how accurate it'll be." | 2 |
| Past the drawing limit, table | The table after the run shows no betweenness column and stays sorted by citationsReceived, although the result says "124,313 more in the table". He could not find his result in the table from this screen. Export has no visible label (presumably under the three dots). | 2 |
| Finished result, top nodes | The tie group is labelled "#3-#7" but only three of its five members are shown; the other two are cut off into the table. The column header "rank, low-high" meant nothing to him. | 2 |
| Finished result, top nodes | The top nodes are shown by patent number only. He cannot say "patent 5879702" to a director and would have to look up what it is. | 2 |
| Settings card, running | The primary blue button in the card header is Cancel. He reads blue as "go" and hesitated. A second Cancel in the progress strip is welcome. | 1 |
| Settings card | "Edits wait for Re-run" and "Edit held." read as developer phrasing; he guessed what they meant. | 1 |
| All | The graph has three names: "Patent citations" (left), "Citations 1999 to 2001" (right on the results screens), "Citations" (the table screen). | 1 |
| Not-run note (worked) | "Not run: would take about 10 hours. The time limit is 30 seconds." shown in grey, with the routes that fit and their time bands, before anything started. The different-graph route says "This is a different graph." He did not misread any of it. Quote: "Good -- it didn't start it and let me find out the hard way." | positive |
| Run record (worked) | Method, seed, normalisation, error bound, engine and time in one copyable box; he checked the #3-#7 tie against the error bound himself and it held. "Ranks below #2 may swap between runs" is a sentence he would paste. | positive |
| Running (worked) | A time band, a progress bar and Cancel, both in the card and at the bottom of the canvas. Quote: "That's the sentence I wanted four hours into that NetworkX run." | positive |
