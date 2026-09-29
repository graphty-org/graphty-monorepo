# Session: can these rankings be trusted? -- Chris, ML engineer (recommendations)

Task as given by the moderator: "Something about these rankings bothers a reviewer. Find out
whether the numbers can be trusted." The planted problem: an edge weight that is a similarity
(Les Miserables co-appearance counts -- more scenes together means closer) being read by path
algorithms as a distance (bigger means farther), which quietly turns betweenness and closeness
upside down.

Screens used: the Results panel (all 14 states) and the load step (all 8 states), as rendered PNGs.

## Transcript (think-aloud)

**Opening the Results panel, first state (PageRank running on patent citations).**
"OK, this isn't Les Mis. It's a patent citation graph, 124k nodes, 1.48M edges. Fine, I'll assume
the mock is a stand-in. First thing I look for is the denominator -- and it's right there: 'on:
full graph, 124,318 nodes. Exact. Directed.' Good. 'Values shown: run 1, damping 0.85' while the
field says 0.5 -- so the numbers on screen are from the old setting and the new one is queued.
That's honest. I like that it says which run the numbers came from. Most tools don't."

"Weight: 'None declared'. So PageRank here is unweighted. For the task, that's the field I care
about. If the reviewer's problem is weights, I need a run where a weight is actually used."

**Clicks through the states looking for a weighted run. Lands on 'Finished' (betweenness on the
protein network).**
"'Exact. Unweighted, undirected. WebGPU.' Unweighted again. Distribution, 300 nodes, 10 at zero,
top nodes list. This is the ranking. The numbers look plausible for betweenness on a 300-node
PPI -- MAPK1 at 0.138. But nothing here says anything about what a weight means, because there's
no weight. So if this is 'the ranking that bothers the reviewer', the answer is: it didn't use
weights at all, and it says so. Can't be a weight problem."

"Wait -- the right panel says Edges: 'undirected, no weight'. OK, consistent. So on THIS graph
there's nothing to get wrong."

**Goes to 'Out of date' (state 10).**
"Now this is interesting. Edges now say 'undirected, similarity weight'. And the popover:
'confidence is now read as a similarity; these read it as a distance. Louvain. Shortest path
TP53 to SMAD3.' So someone changed what confidence means, and the two runs that used it went
stale. That's exactly the trap -- a similarity read as a distance -- except here it's being
caught after somebody fixed the declaration. And it says 'Betweenness and Closeness read no
weight, so they stay current.' OK, that's a good sentence. It tells me which numbers I can keep."

"But hold on. Louvain 'read it as a distance'? Louvain doesn't do distances, modularity uses
weights as strengths. So what did it actually do with a distance -- invert it? Ignore it? That
sentence tells me something happened but not what. I'd want the formula. 1/w? max - w? Nothing."

"And the question I actually got asked: if the shortest path WAS run with confidence as a
distance, how would I have known, before somebody re-declared it? Let me check whether a single
run tells me how it read the weight."

**Opens 'Editor error' (state 13) to see a run with the Weight field filled.**
"Weight: 'confidnce' -- typo, it catches it, 'Closest: confidence'. Fine. But look at the state
line above: still 'Exact. Unweighted, undirected.' That's the old run, fair. What I don't see
anywhere on the run itself is 'weight: confidence, read as similarity' or 'as distance'. The
Weight field is a column name. The role -- similarity vs distance -- lives somewhere else. On a
finished weighted run, I'd expect 'Weighted by co-appearances, as a distance (shorter = closer)'
in that 'on:' line, same place it says Exact and Directed. It's the one fact the reviewer is
asking about, and I can't find a mock that shows it on a result."

**Opens the load step, first state ('Clean').**
"OK, here's where it's asked. 'amount as a weight means: Similarity / Distance / Capacity /
Unknown'. Default Unknown. And the line under it: 'Paths ignore it; PageRank and communities
read it as a similarity.' Hmm. So Unknown is not really unknown -- half the algorithms treat it
as similarity and the path ones drop it. That's a default dressed up as a non-choice. I'd
rather it said 'Unknown: paths run unweighted, PageRank and communities treat bigger as
stronger.' Actually that's roughly what it says. OK, I'll give it that, it's honest. It's just
two different behaviours under one word."

"For Les Mis: co-appearance counts. If whoever loaded it clicked 'Distance', every
character who shares a lot of scenes with Valjean is now FAR from him, and betweenness goes to
the minor characters who barely appear together. Rankings would look weird -- Valjean not at the
top -- which is probably what bothered the reviewer. The fix is to flip it to Similarity. Where?
The Add-data state says 'the role belongs to the attribute and is changed in Statistics'. So
the right panel, the Edges row, presumably under '4 more'. Not shown in these mocks, I'm
guessing."

**Looks at the right panel Statistics again.**
"'Edges: undirected, similarity weight'. That's the only place on the main screen where the
weight role shows. It's a small grey line in a side panel. If it said 'distance weight' on Les
Mis, would I have noticed? Honestly, only because I'm looking for it. Nothing next to the
betweenness number says 'this was computed treating co-appearance as distance'. A reviewer
reading a screenshot of the Results panel would never see it."

**Conclusion, in his words.**
"So can the numbers be trusted? The tool gives me enough to answer: I check the Edges line for
the weight role, check the run's 'on:' line for Weighted/Unweighted, and if the role is
distance on a co-occurrence count, that's the bug -- re-declare as similarity and the stale
runs get flagged and I hit Re-run all. That's actually a decent workflow once you know it.
But I pieced it together from three places, and the run itself never says how it read the
weight. Also no sanity check -- no 'your weight column looks like a count; counts are usually
similarities' hint. Well -- they said nothing is guessed from a name, which I respect. I'd
still want a one-line check, not a guess."

## Single Ease Question

4 of 7. "Not hard once I found the Edges line and the out-of-date note, but the run that
produced the ranking doesn't tell me the one thing I was asked to check."

## Would he use it instead of his current tool?

"For this kind of check -- 'is the weight direction wrong' -- in a notebook I'd print
`G.edges(data=True)[:5]` and the algorithm's `weight=` argument and I'd know in 30 seconds.
Here I have to hunt. What would win me over is the 'out of date' behaviour: change the meaning
of a column and it tells me exactly which results are now stale and which are fine. Nobody's
notebook does that; mine certainly doesn't. If the run header said 'weighted by X, read as
distance', I'd trust it more than my notebook. Right now: maybe, for exploration, not as the
thing I'd put in front of a reviewer."

## Problems

1. Results panel, run state line: a weighted run does not say how its weight was read
   (similarity or distance). The line says "Weighted/Unweighted" but the role -- the thing that
   flips a ranking -- is only in the Statistics Edges row. Severity 3.
2. Results panel, Weight field: shows only the column name; no role next to it, no way to see or
   change the reading from the result. Severity 3.
3. Load step, "Unknown" role: reads as "no choice" but it silently means two different things
   (paths ignore the weight; PageRank and communities treat it as similarity). Severity 2.
4. Out-of-date note: "these read it as a distance" for Louvain does not say what a
   distance-read weight does in a modularity method (inverted? how?). Severity 2.
5. No hint when a weight's role looks unlikely for its data (a count or co-occurrence declared as
   a distance). Understood that names are not guessed; a check on the values would still help.
   Severity 2.
6. The mocks show patent citations and a protein network, not the dataset in the task; could not
   see the actual planted ranking. Severity 1.
