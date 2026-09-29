# Session: measure who bridges the groups across a whole citation graph

Participant: Chris, ML engineer on a retail recommendations team (persona:
study/personas/ml-engineer-recsys.md). Laptop screen, 1440 by 900, dark mode habit.

Task as given by the moderator: "Measure who bridges the groups across this whole citation
graph."

Screens used, in order: the measure options form with a cost (option-form-cost, states 1 to 4),
the results panel (refused and finished-sampled states), and the graph past the drawing limit
(not drawn).

## Think-aloud

**Reading the task.** "Who bridges the groups. OK, that's betweenness, or if you want to be
fancy, run communities first and then participation coefficient. Betweenness is the one
everybody has, I'll start there. 'Whole graph' -- you know that's the expensive part, right?
Exact betweenness is O(nm). On 1.5 million edges that's not happening in a browser."

**First screen, state 1 (the 300-protein network).** "This isn't the citation graph, it's the
protein demo. Fine, the moderator says start here. Left side has Betweenness, 'Not run'. The
form is asking me what 'confidence' means -- stronger tie, longer distance, amount that flows.
Honestly? That's a good question to ask. Half the bugs I've shipped were a similarity fed in as
a distance. The examples 0.99, 0.79, 0.40 are real values, good. I'd pick Stronger tie and move
on. But this isn't my graph, so I skip it." (Spends about 10 seconds, moves on.)

**State 2, patent citations: the refusal.** "OK, here's the real one. 124,318 nodes, 1,480,221
edges, directed. Right panel gives me the denominator before I do anything, I like that. I hit
Betweenness and it says 'Takes hours. The time limit is 30 seconds.' Yeah. Correct. Thank you
for not freezing my tab.

Then four options. 'Sampled, 101 sources, under a minute.' 'Exact, on 5,318 nodes, under a
minute.' 'Sampled, 500 sources, a few minutes.' 'Exact, on the full graph, hours.' This is
basically what I'd do in networkx -- `betweenness_centrality(G, k=...)`. The k is right there.
Good.

What I want to know: what's the error on 101 sources? 'Under a minute' vs 'a few minutes' --
that's a vibe, not a number. Is under a minute 4 seconds or 55? And is this GPU or CPU? Nothing
says. There's a 'Details' link, I'd click that." (Reads the HTML: Details goes to the run's
record.) "Fine.

The 5,318-node one is 'Drug patents granted in 2001', which is in the right panel under Sets.
That's not the whole graph, and the task says whole graph. Skip it. I pick 'Sampled, 101
sources'. Button already says 'Run sampled'. Click."

**Why can I not raise the 30 seconds?** "Wait, where do I say 'I'm fine waiting 10 minutes,
it's my laptop'? The 500 option runs in the background, so I guess that's the answer. But the
limit itself -- can I change it? No settings for it. It's a weird thing to hard-code. OK, the
background route covers me. I'll live."

**State 3, running.** "Progress bar, 'Running Betweenness (sampled), under a minute', Cancel.
The form shows Direction: As the graph, directed. Sample size 101 of 124,318. Seed 7 with a
reroll button. Seed! Somebody here has been burned by non-reproducible runs. That's the first
thing in this session that makes me think a real engineer is behind it.

Still no percentage or ETA in seconds. A bar with no number, but it's short, so I'll allow it.

'Scores are estimated from 101 sources. The top of the ranking is usually stable; a single score
can be well off.' Usually stable according to what? Give me the bound."

**State 4, bumping to 500.** "Say the first run finishes and I want more sources. I type 500.
Warning: 'a few minutes, past the 30-second time limit. Run starts it in the background.' And
101 stays on screen until 500 finishes. That's how it should work -- don't blow away my result
while the new one is cooking. Good."

**Results panel, finished sampled (patent citations).** "Now the result. Hang on -- this one
says 'Sampled, 50 sources', not 101, and 'Read as undirected'. The form I just filled in said
directed and 101. Did it change my settings? Or is this a different run? The direction dropdown
here says 'Read as undirected'. On a citation graph that's a real choice -- directed betweenness
on a DAG-ish citation network is going to be mostly zeros. So which did I get? I can't tell from
these two screens if they're the same product.

OK, reading it anyway. 'on: full graph, 124,318 nodes. Sampled, 50 sources. Unweighted,
undirected. WebGPU.' Good, it tells me the engine. Still no time in seconds. I clicked Details:
the run record. Method: Brandes from 50 random sources, scaled by n/k. Seed 7. Normalization
formula written out. Error bound plus or minus 0.00035, 95 runs out of 100. THAT is the thing I
wanted. And a Copy button so I can paste it into the doc for my manager. Nice.

Distribution: middle ~0, highest ~0.016, zero ~79,554 nodes. 80k zeros. With 50 sources, a lot
of those are 'no sampled path hit you', not real zeros. The tilde is doing a lot of work there.
It should say 'zero in this sample' or something. I'd have filed a bug thinking the algorithm
was wrong.

Top nodes: #1 5879702 at ~0.0160, #2 ~0.0037, then '#3 to #7' for three of them. Rank ranges
from the error bound. Honestly, that's clever. 'Ranks below #2 may swap between runs.' Yes.
That's exactly the caveat I'd write in a notebook comment.

But -- the task was 'who bridges the groups'. It gives me top patents by betweenness. It does not
tell me which groups they bridge. I'd want the category column next to it, or communities. There's
'124,313 more in the table' and 'Compare with...'. The table is where I'd join category."

**Past the drawing limit.** "Nothing is drawn: '124,318 nodes not drawn: more than this browser
draws at once (50,000).' Good. I did not want a hairball. The table below has id, grantYear,
category, citationsReceived, sorted by citations. Original patent numbers kept. If the
betweenness column lands in this table and I can sort on it and export CSV, I'm done. The results
panel mentions 'Export table as CSV...' in the notes. Not Parquet. Of course not Parquet.

To see the bridges I'd have to narrow the graph to, what, the top hubs and their neighbours.
There's a 'Narrow the graph...' link. Fine for later."

## Outcome

Done, with a sampled estimate on the full graph and an honest error bound. Took longer than it
should because the two result screens disagree with the form I filled in (101 vs 50 sources,
directed vs undirected), and I had to guess whether the result I was looking at was mine.

**Single Ease Question: 5 of 7.**

**Would I use this instead of my notebook?** "For this exact task? It's close. In a notebook
it's three lines, `nx.betweenness_centrality(G, k=100, seed=7)`, and then I wait eight minutes
because networkx is slow on 1.5M edges. If this really runs on WebGPU in under a minute, with the
seed, the error bound and a copyable record, that's actually better than my notebook, because my
notebook doesn't give me an error bound for free. But I'd need: the time in seconds, not 'under
a minute'; the direction choice to stay what I set; and the betweenness column in a CSV with
the original ids. And 'who bridges the groups' really wants groups -- give me Louvain plus
betweenness side by side, or a participation score, and I'd actually open it again."
