# Session: the 200 patents most in between, and who surrounds the first -- the recommendations ML engineer

**Participant:** Chris (fictional), senior ML engineer on a retail recommendations team; PyTorch
Geometric, Spark and notebooks, not GUI tools; reads counts and denominators first; keyboard-heavy
(Cmd+K). See ../../personas/ml-engineer-recsys.md.

**Task, as the moderator gave it:** "This citation graph is too big to draw. Find the 200 patents
that sit most in between, then look at who surrounds the first one."

**Screens, in order:** the frame past the drawing limit (screens/past-drawing-limit.html: not
drawn, isolates in the table, the filter chip's steps, Keep top rows, kept and drawn, the rule
editor, two steps); the option form with its cost gate (screens/option-form-cost.html: over the
time limit, running sampled, sample size past the limit); the results panel (screens/results-panel.html:
quick actions, refused by the cost gate, finished sampled with its run record, in the table);
the table dock (screens/table-dock.html: ranked, limit); Find (screens/find.html: past the drawing
limit, bring in its links). No page shows the whole path on the citation data -- betweenness is
never run and then kept as 200 rows on one screen -- so the steps between "betweenness finished"
and "200 kept" were guessed from the citations-sorted version of the same controls. Viewed at
1440 x 900, study view (design notes hidden).

**Renders he saw:** shots/r4-chris-top200-past-drawing-limit.png,
shots/r4-chris-top200-option-form-cost.png, shots/r4-chris-top200-results-panel.png,
shots/r4-chris-top200-table-dock.png, shots/r4-chris-top200-table-dock-limit.png,
shots/r4-chris-top200-find-s7.png, shots/r4-chris-top200-find-s14.png (the full-page renders were
read one 1440 x 900 viewport at a time).

---

## Think-aloud transcript

**1. It opens.** (past-drawing-limit, not drawn.) "OK, '124,318 nodes not drawn. More than this
browser draws at once, 50,000.' Good. That's the first graph tool that didn't try to draw a
million-edge hairball and freeze my tab. Nodes 124,318, edges 1,480,221, density, average degree
23.8, isolates 2,406, weak components 3,912, the giant one is 94.0%. In-degree distribution on
log-log, and it says 41,873 have in-degree zero and are off the log axis. That's -- honestly that's
the panel I'd write in a notebook first. Edges: directed, weight not set. Fine, citations are
directed and unweighted."

**2. What does 'in between' mean here.** "'Sit most in between' -- that's betweenness centrality.
Not most cited. The big blue button says 'Narrow the graph...' and the table is sorted by
citationsReceived. If I just hit the suggested thing I get the 200 most cited, which is in-degree,
which is a different question. I bet half the people you test take that. I'm not."

**3. The narrow button, to see what it offers.** (filter chip's steps.) Clicks "Narrow the
graph...". "'Keep top rows by citationsReceived' and 'Neighbors of a node'. Nothing about
computing anything first. So I need to run betweenness somewhere and then come back here. Where
are the algorithms?" Looks at the toolbar. "Lightning bolt is probably algorithms. No label.
I'm not hovering around, I'll do Cmd+K."

**4. Quick actions.** (results-panel, quick actions.) Types `centrality`. "Betweenness -- 'hours'.
Closeness 'hours', Harmonic 'hours', PageRank 'under a minute'. Nice that it tells me before I
press Enter. 'Hours' is not a number though. Is that two hours or twenty? If it's two I'll kick it
off before lunch. Enter."

**5. The cost gate.** (results-panel, refused; option-form-cost, over the time limit.) "'Takes
hours. The time limit is 30 seconds.' OK so there's a hard budget. Choices: 'Sampled, 101 sources,
under a minute'; 'Exact, on 5,318 nodes' -- that's some drug-patents set, not what I asked about --
and 'Exact, on the full graph, hours.' The other version of this popup also has 'Sampled, 500
sources, a few minutes'. The side-panel version doesn't. Whatever. Tooltip: 'Betweenness estimated
from 101 source nodes drawn at random, seed 7, on the full graph.' Good, that's the Brandes
pivot-sampling thing, and it gives me the seed. I'd honestly want 500 or 1,000 sources and let it
run in the background -- a few minutes is nothing, I wait longer for a Spark job -- but let's see
what 101 gives."

**6. Wait, directed or undirected?** Reads the two refusal boxes side by side. "The popover says
'Directed, on the full graph'. The panel says 'the directed citations read as undirected'. Those
are not the same algorithm. On a citation graph directed betweenness is basically 'lies on paths
from new patents back to old ones' -- it's a DAG, everything flows backward in time, so the middle
years win. Undirected is 'bridges between clusters'. The 200 you get are different. Which one am
I running?" Leaves it on the default and presses "Run sampled". "I'll check the run record."

**7. Running.** (option-form-cost, running.) "Progress bar, 'under a minute, within the time
limit, Directed.' No rows or sources counter -- 'source 40 of 101' would be nice -- but there's a
bar and a cancel, so I don't think it's hung. Sample size 101 'of 124,318', seed 7, reroll button.
Fine."

**8. Finished.** (results-panel, finished sampled.) "14.8 s, WebGPU. OK -- an actual timing, not
a badge. That's what I want. Top nodes: #1 5879702 about 0.0160, #2 5902311 0.0037, then '#3-#7'
three times at 0.0029, 0.0025, 0.0025. 'Ranks below #2 may swap between runs.' Hm. So the tool is
telling me it can only vouch for two ranks, and I asked for two hundred." Column header says 'rank,
low-high patent' -- "took me a second: the rank is a range, low to high. Fine once you get it."

**9. The run record.** Clicks Details. "Method: Brandes from 101 random sources, scaled up by
124,318/101. Seed 7. Normalization: divided by (n-1)(n-2)/2, 'the node pairs of an undirected
graph'. Error bound plus or minus 0.00035 on each value, 95 runs out of 100. Direction: 'Citations
read as undirected'. Engine WebGPU. And there's a Copy button, so I can paste it into the MLflow
run notes. This is the good stuff -- this is more honest than most papers."

"But: the header right above it says 'Directed.' The Options block says 'Direction: Directed.' The
record says undirected and normalizes like undirected. So one of those is lying. If this were my
pipeline I'd stop here and rerun both ways in networkx on a 5k-node sample to see which one it
actually computed. That's the kind of thing that makes me not trust the other numbers."

**10. Is 200 even meaningful.** "Error bound 0.00035. The #3-#7 bunch are at 0.0025 to 0.0029.
The zero bucket is about 79,554 nodes. Somewhere around rank 50 or so the scores are going to be
the same size as the error bound, and then rank 200 versus rank 260 is a coin flip. It doesn't say
where that line is. What I'd want is either 'ranks you can trust: top N' or two seeds and the
overlap of the top 200 -- Jaccard of seed 7 and seed 8 top-200 sets. There's a 'Compare with...'
under Runs. If that lets me compare two runs of the same thing with different seeds, that's the
check. I'd rerun with 500 sources in the background and compare. For the moderator's task I'll go
on with what I have and say the tail of the 200 is soft."

**11. Getting the 200.** "'124,313 more in the table.' Click." (results-panel, in the table, read
off the protein example.) "Table opens sorted by betweenness, highest first, with the other ranking
beside it. Good -- and the column header says 'exact, full graph' or in my case presumably
'estimated'. Now 'Keep top rows...' in the table header." (past-drawing-limit, Keep top rows.)
"Keep the first [200] rows, in the table's order, column dropdown, Highest first. In the mock it's
citationsReceived; I'm assuming the dropdown lists the betweenness result now that it exists,
because the table is sorted by it. If it doesn't, this whole task is dead -- I'd have to export,
sort in pandas and come back with ids. Nothing on the screen promises it does."

"The preview is good: 'Row 200 has citationsReceived 358; 1 more patent also has 358 and is left
out.' It tells me about the tie at the cut. With sampled scores that sentence should also say
'these values are estimates, the cut is within the error bound' -- it won't know to, probably.
'200 nodes, 288 edges, will draw.' Keep these 200 rows."

**12. Drawn.** (past-drawing-limit, kept and drawn.) "Now it draws. 200 nodes, 288 of 1,480,221
edges, 16 isolates, 21 components, and a grey note: 'Describes the 200 most cited patents, not a
random sample. Density reads high.' -- that's the citations version, but I like that it tells me
the stats are biased by how I cut. Filter chip says '200 of 124K nodes, 1 step', Undo in the toast.
ForceAtlas2 is ready, WebGPU. Fine. The canvas itself, 200 grey dots with patent numbers --
I'm not learning much from the picture, but at least it's the picture of my 200, not the galaxy."

**13. The first one.** "First one is #1, 5879702. Click its row, or Cmd+F and paste the id."
(find, past the drawing limit.) "Find says '3 results in all 124,318 nodes', so it searches the
full graph, not just the drawn part. Good. Inspector: grantYear, category, citationsReceived.
There's no degree, no in and out counts, no 'cites 12, cited by 40'. For 'who surrounds it' that's
the first number I want and it isn't in the inspector. I have to go through a filter to learn it."

**14. Neighbors.** Two icons next to the node name: "Select neighbors" and "Filter to". (past-
drawing-limit, the Neighbors of a node form.) "'Neighbors of a node: around 6117075, 1 hop, Both
directions. 242 nodes, 348 edges, will draw.' Counted before I commit -- good. Direction choice is
right there, and for citations that matters: who cites it versus what it cites are different
stories. I'd do 1 hop both directions first, then look at the split."

"What I can't tell: I already have a step 'Keep top 200'. If I add 'neighbors of 5879702' now,
are those neighbours looked up in the full graph, or only among my 200? The 'Add their neighbors'
version says 'Of the 3 patents the step above keeps', so steps chain. For 'who surrounds the first
one' I want the full-graph neighbourhood -- most of its neighbours won't be in the top 200.
Scope line on the form says 'Full graph, no steps above' when it's the first step; I'd expect it to
change to 'Keep top 200 by betweenness' as the second step, and then I'd have to delete the first
step to get what I want, or it would add the neighbours to the 200 and I'd get 200 plus 250 mixed.
I'd probably just uncheck the top-200 step and run the neighbours step alone. Check the count:
if it says ~250 I got the full-graph neighbourhood; if it says 20 I got the inside-the-200 one."

**15. Looking at them.** (past-drawing-limit, two steps.) "The two-step example: the three hubs
and all their neighbours, drawn, 586 nodes, 893 edges, one component, and again the note 'favors
hubs, so density and clustering read high'. That's the shape I'd get: a star around 5879702. And
now what I'd actually want is the neighbours in the table with direction and year -- which of them
cite it, which it cites, which category. The table filters with the graph, and 'Export table as
CSV...' is there. That's how I'd finish: export the ego net with the original patent numbers,
load it in a notebook, groupby category and year. Parquet would be nicer but CSV with my ids is
fine for 250 rows."

---

## After the task

**Single Ease Question (1-7):** 4. I got there, and several pieces are better than what I use:
the not-drawn frame with real statistics, a cost gate that offers a sampled run with a seed, a
14.8 s GPU timing, and a run record with an error bound I can paste into my notes. What cost me:
the direction contradiction (header says directed, run record says undirected), no statement of
how many of the 200 ranks the sample actually supports, having to trust that "Keep top rows" can
use the betweenness column because no screen shows it, and not knowing whether "neighbors of the
first one" looks in the full graph or only inside my 200.

**What worked:**
- Not drawing 124k nodes, and saying so with the limit and the counts; statistics and log-log
  degree distribution instead of a hairball.
- Cost shown in the Cmd+K list before running; the refusal offers a way that fits instead of just
  saying no.
- Seed, sample size and "of 124,318" on the form; a real timing (14.8 s, WebGPU) after the run.
- The run record: method, scaling, normalization, error bound, engine, and Copy.
- "Ranks below #2 may swap between runs" -- honest, even if it undercuts the task.
- Keep top rows telling me about the tie at the cut and the node/edge count before committing.
- Neighbours form with hops and direction, counted before commit.
- Find searching all 124,318 nodes, not just drawn ones. Export table as CSV. "Nothing is sent."

**What did not:**
- Direction is reported three ways for one run: "Directed" (option form, result header, Options)
  and "Citations read as undirected" (run record, the refusal box), with undirected normalization.
  On a citation DAG these are different answers. This alone would make me re-verify everything.
- The suggested narrowing step is "Keep top rows by citationsReceived". Someone who does not know
  betweenness will take the 200 most cited and think they answered the question.
- Time estimates are words ("hours", "a few minutes"), not numbers.
- The two versions of the cost gate offer different choices (one has "Sampled, 500 sources", one
  doesn't).
- No line saying how deep the sampled ranking is trustworthy; an error bound per value but no
  "ranks 1 to N are stable". Want a seed-vs-seed top-200 overlap, and it isn't clear whether
  "Compare with..." does that.
- No screen shows Keep top rows choosing a result column; I had to assume it.
- The node inspector for an undrawn node has no degree or in/out counts.
- Unclear whether a neighbours step after "Keep top 200" looks in the full graph or inside the 200.
- The lightning-bolt toolbar button has no label; I went to Cmd+K instead.

**Would I use it instead of my current tool?** Not instead -- next to it. Sampled betweenness on
1.5M edges in 15 seconds in a browser tab, with a seed and an error bound, is something I would
otherwise do with a networkx k-sample run that takes a coffee break, or a GPU job I have to
submit. And the ego-net-with-counts-before-commit is nicer than what I hack in matplotlib. But I
would not hand anyone these 200 until the direction contradiction is fixed and it tells me how many
of the 200 the sample supports; for now I'd use it to explore, then confirm the final list in a
notebook. And it has to read my Parquet, or it stays a demo.
