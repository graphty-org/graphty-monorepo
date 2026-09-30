# Session: the 200 patents most in between, and who surrounds the first -- the recommendations ML engineer

**Participant:** Chris (fictional), senior ML engineer on a retail recommendations team. Lives in
PyTorch Geometric, Spark and notebooks; reads counts and denominators first; keyboard-heavy.
See ../../personas/ml-engineer-recsys.md.

**Task, as the moderator gave it:** "This citation graph is too big to draw. Find the 200 patents
that sit most in between, then look at who surrounds the first one."

**Screens, in order:** the frame past the drawing limit (screens/past-drawing-limit.html: not
drawn, the filter steps menu, Keep top rows, kept and drawn, a rule, two steps); Quick actions and
the refused run (screens/results-panel.html: quick actions, refused, finished sampled with its run
record, and "more in the table", which exists only on the 300-protein graph); the option form with
its cost gate (screens/option-form-cost.html: over the time limit, running sampled, sample size
past the limit); the table dock (screens/table-dock.html: ranked, on proteins; limit, on
citations); Find (screens/find.html: a node found past the drawing limit); the selection past the
drawing cap (screens/selection-over-cap.html, on transfers). Viewed at 1440 x 900 in the study
view (design notes hidden).

**Renders he saw:** shots/record/r6-chris-t200-past-drawing-limit-not-drawn.png, -narrow.png, -keep.png,
-kept.png, -rule.png, -drawn.png, -sample.png; shots/record/r6-chris-t200-results-panel-quick-actions.png,
-catalog.png, -refused.png, -finished-sampled.png, -in-the-table.png;
shots/record/r6-chris-t200-option-form-cost-over-budget.png, -within-budget.png, -sample-over-budget.png;
shots/record/r6-chris-t200-table-dock-ranked.png, -limit.png; shots/record/r6-chris-t200-find-s7.png, -s14.png;
shots/record/r6-chris-t200-selection-over-cap-e1.png, -e2.png, -e3.png.

**What no screen shows:** betweenness run on the citation graph and then open in the table
sorted by it, and Keep top rows with a betweenness column chosen. Both steps were inferred from
the protein version of the same table and from the Keep popup's "In the table's order". Nor does
any screen show selecting the neighbors of a node inside a 200-node filtered graph.

---

## Think-aloud transcript

**1. It opens and does not draw.** (past-drawing-limit, not drawn.) "'124,318 nodes not drawn.
More than this browser draws at once (50,000). Every node is counted in Statistics and listed in
the table.' Good. That's the right default, same as last time -- no hairball, no frozen tab.
Right panel: 124,318 nodes, 1,480,221 edges, density, average total degree 23.8, 2,406 isolates,
3,912 weak components, the giant one 116,905 nodes, 94.0%. In-degree distribution log-log, and it
tells me the 41,873 in-degree-zero nodes are off the axis instead of silently dropping them. That's
the stats panel I'd write in the notebook first. Down the bottom: 'Edges: directed, weight not set.'
Citations, directed, unweighted. OK."

**2. What 'in between' means.** "Sit most in between -- betweenness centrality. Not most cited.
The table's sorted by citationsReceived and the big blue button is 'Narrow the graph...'. If you
just follow the blue button you get the most-cited 200, which is in-degree. Different question.
I'm not doing that."

**3. Checking the blue button anyway.** (filter steps menu.) "Filter steps: 'No filter steps.
Every number reads the full graph.' Suggested: 'Keep top rows by citationsReceived -- the table's
first rows, in its order; you set how many' and 'Neighbors of a node -- a row you pick in the
table, or find by name.' Right, so this thing keeps whatever order the table has. So the plan
writes itself: get betweenness into the table, sort by it, keep 200. And 'Neighbors of a node' is
my second half. Nothing here computes anything, which is fine -- a filter shouldn't."

**4. Finding betweenness.** (results-panel, quick actions.) "Lightning bolt with 'Quick actions'
on it now, good, it has a label. That's my Cmd+K. The menu says Ctrl+K, by the way -- I'm on a
Mac, hope Cmd works too. Type 'centrality'. Betweenness 'hours', Closeness 'hours', Harmonic
'hours', Eigenvector, HITS, Katz, PageRank 'under a minute'. Nice that the cost is on the row
before I press Enter. 'Hours' is vague, though. Enter on Betweenness."

**5. It refuses, and offers a way.** (results-panel, refused.) "'Not run: would take about 10
hours. The time limit is 30 seconds.' OK -- now it gives me a number, 10 hours; the list one
line ago just said 'hours'. Say 10 hours there too. 'Fits the time limit: Sampled, 101 sources,
under a minute. Exact, on the 5,318 nodes in Drug patents granted in 2001. This is a different
graph.' -- thank you for saying that in bold, because that's not what I asked. 'Past the time
limit: Exact, on the full graph, hours.' Button 'Run sampled'.

Wait. The grey line up top: 'On the full graph, 124,318 nodes; the directed citations read as
undirected.' Hmm. Hold that thought."

**6. The other version of the form.** (option-form-cost, over the time limit.) "Same choice in a
popup on the canvas. This one says 'Directed, on the full graph: 124,318 nodes.' And it has a
fourth option: 'Sampled, 500 sources, a few minutes.' The side panel one doesn't have that. So
which is it -- directed or undirected? For betweenness on a citation DAG that matters a lot:
directed shortest paths on citations are short and mostly go backwards in time; undirected you
get bridges between fields. Those are two different 'in between' lists."

**7. Sample size.** (option-form-cost, running sampled; sample past the limit.) "Running:
'Sample size 101 of 124,318. The largest sample that fits the time limit.' Seed 7, with a
re-roll. I like that there's a seed. 'Readings, when it finishes: Scores are estimated from 101
sources. The top of the ranking is usually stable; a single score can be well off.' That's honest.
But I'm asking for the top 200, not the top 5. 101 sources out of 124k -- that's 0.08%. Rank 200
is going to be noise. If I type 500: 'past the 30-second time limit. Run starts it in the
background.' OK, so I can have the better sample if I wait a few minutes. For a top-200 list I'd
take that. Honestly I'd go to 1,000 and go get coffee, but it's not telling me how long 1,000 is."

**8. The result.** (results-panel, finished sampled.) "'Betweenness (sampled), 101 sources, Sep 28
09:52. On: full graph, 124,318 nodes. Sampled, 101 sources. Directed. WebGPU.' Top nodes: #1
5879702 at ~0.0160, #2 5902311 at ~0.0037, then '#3-#7' three times at 0.0029, 0.0025, 0.0025.
'Ranks below #2 may swap between runs.' Distribution: ~79,554 nodes at zero, estimated.

#1 is four times #2. That's either a real bridge patent or an artifact of the sample. I'd want to
see it survive a second seed before I believe it. There's 'Re-run (keeps Run 1)' and 'Compare
with...', so I could actually do that. Good.

'#3-#7' is a clever way to say 'these are tied inside the error'. And I see what it'll do at rank
200 -- everything will be '#150-#260' or whatever. Which is the truth, so fine.

Now the run record, 'Details'. 'Method: Brandes betweenness from 101 random sources, scaled up by
124,318 / 101. Seed 7. Normalization: divided by (n-1)(n-2)/2, the node pairs of an undirected
graph. Error bound +/- 0.00035 on each value, 95 runs out of 100. Direction: Citations read as
undirected. Engine WebGPU. Took 29.9 s.'

There it is again. The summary line above it says 'Directed'. The Options block says 'Direction:
Directed'. The run record says 'read as undirected' and normalizes by the undirected pair count.
Same run, two answers on one screen. I'd stop here in real life and go compute it in networkx to
find out which one it actually did, because I can't report a list I can't describe.

Also the error bound: +/- 0.00035 on every value. #5 is 0.0025, so the top ones are fine. But the
200th patent is going to have a score way below 0.0025 -- probably a few ten-thousandths -- and
then the error bar is as big as the value. So the 200 list is 'roughly the top few hundred',
not 'the top 200'. The tool is telling me that, if I do the arithmetic. It'd be nicer if it did the
arithmetic -- 'ranks past about N cannot be told apart at this sample size'.

Took 29.9 s against a 30 s limit. Cutting it close, but fine. And it says WebGPU with a real
timing, not a badge. That's what I want."

**9. Getting the ranking into the table.** "'124,313 more in the table.' Hmm -- 124,318 minus the 5
shown. OK. I don't have this screen on citations, so I'm guessing from the protein one
(results-panel, in the table; table-dock, ranked): it opens the Nodes tab sorted by the result,
highest first, with a rank column 'of 300, ties share', and near-ties marked. Assuming the same
happens here, I'd get a betweenness column, estimated, and a rank column with ranges. Good. The
protein one also has the column header saying 'exact, full graph' under the name. For mine I'd
want 'sampled 101, full graph' there, so when I export the column I know what it is."

**10. Keep 200.** (past-drawing-limit, keep.) "Back to 'Keep top rows...' in the table header.
'Keep the first 200 rows. In the table's order: [citationsReceived] [Highest first]. Row 200 has
citationsReceived 358; 1 more patent also has 358 and is left out. Scope: Full graph, no steps
above. 200 nodes, 288 edges, will draw.' I like this a lot -- it tells me the tie at the cut and
what falls off. I'm assuming the dropdown lists my betweenness column once it's in the table. It
should. But with a sampled score, what does 'row 200 has ~0.0003; 1 more also has' even mean when
everything around 200 is inside the error bar? I'd want that line to say 'ranks 170 to 240 are
within the error; this cut is arbitrary there'. Otherwise somebody will publish this list as
'the 200'. I'd still press 'Keep these 200 rows'."

**11. Kept and drawn.** (past-drawing-limit, kept -- shown for citations, not betweenness.) "Chip
now says '200 of 124K nodes - 1 step'. Toast 'Filtered to 200 of 124,318 nodes', with Undo. The
graph draws. Stats switch to the subgraph and it warns: 'Describes the 200 most cited patents, not
a random sample. Density reads high: highly cited patents cite each other.' That's the kind of
note I'd put in a notebook cell. I'd expect it to say 'the 200 highest by betweenness' for mine.
Edges '288 of 1,480,221'. 16 isolates, 21 components. For betweenness I'd expect it to be MORE
connected than the most-cited list -- that's sort of the point of betweenness -- so if this came
out with lots of isolates I'd be suspicious of the direction thing again."

**12. The first one.** "The first one is #1 on the list, 5879702 (or whatever the betweenness #1
is). I don't need to scroll: Find. (find, past the drawing limit.) Search panel on the left, I type
the id, '1 result in all 124,318 nodes', Enter. Inspector: the node, its attributes, 'In no sets'.
There's an icon pair up top -- the split-arrow thing with a chevron. Hover: 'Select neighbors' and
'Neighbor options'. There we go. The chevron presumably is in / out / both and hops.

Now the question the tool doesn't answer for me: I'm in a filtered graph of 200. 'Select
neighbors' -- neighbors in the 200, or in the full graph? 'Who surrounds the first one' in my head
means its real ego graph -- everything it cites and everything that cites it, across all 124k --
not just the other top-200 patents it happens to touch. The Find panel says 'results in all
124,318 nodes', so search goes past the filter. Does 'Select neighbors' too? No screen tells me.

The filter menu had 'Neighbors of a node', and the two-step screen (past-drawing-limit, two steps)
shows 'the 3 most cited patents and all their neighbors, 586 nodes', with a note that it favors
hubs. So the honest way is probably: second step, Neighbors of a node, pick my #1, and it pulls
its neighbors from the full graph. But that's a 'Neighbors of what a step keeps' thing -- it would
give me neighbors of all 200, not of #1. I'd have to set it to the one node. I'd fiddle with this
for a minute. I think I'd get there."

**13. Selecting past the cap.** (selection-over-cap.) "This is a transfers graph, not mine, but it
shows what happens when a selection is bigger than it can draw: density hexes, the selection count
in a pill, the inspector summarizing '3,000 nodes, 9,113 edges' as ranges. OK, so if #1 has 2,000
neighbors in the full graph it won't just die. That's reassuring. A bridge patent in a citation
graph probably doesn't have that many, though."

**14. Wrap-up, thinking about what I'd hand over.** "What I'd actually do next: export the 200
with id, estimated betweenness, rank range, and the run record, and the neighbor list of #1 with
direction. 'Export table...' is in the dock header on some screens; I didn't try it this time. The
run record has 'Copy', which is nice for pasting into a doc."

---

## Single Ease Question

**4 / 7.** "The skeleton is right: it doesn't draw what it can't, it refuses the 10-hour run with
a number and hands me a sampled option with a seed and an error bound, and Keep top rows works off
whatever the table is sorted by. That's a real path. What costs me: the same run says Directed in
three places and 'read as undirected' in the run record, and I can't hand over a list I can't
describe. The 200 list is inside the noise past maybe the top few dozen, and the Keep step doesn't
say so. And for the last step I don't know if 'Select neighbors' in a filtered graph means the 200
or the whole graph. Two of those three I'd have to guess at."

## Would he use this instead of his current tool?

"Not instead of the notebook for this one. networkx `betweenness_centrality(G, k=500, seed=7)`
and a sort is a few lines, and I know what direction it used. Where this beats the notebook is the
second half: once I have the #1 node, clicking out to its neighbors and seeing it with the stats
next to it is faster than writing the ego-graph plot. If the direction line were consistent and
the Keep step told me where the ranking stops being real, I'd use it for the 'find a candidate,
then go look at it' loop, next to the notebook, not in place of it."

---

## Findings (his words where quoted; severity 1 = cosmetic to 4 = blocks the task)

1. **The same sampled betweenness run states two directions.** (results-panel, finished sampled;
   results-panel, refused.) Severity 3. Summary line and Options say "Directed"; the run record
   says "Citations read as undirected" and normalizes by the undirected pair count; the refused
   state says "the directed citations read as undirected", while the option form says "Directed".
   "Same run, two answers on one screen. I can't report a list I can't describe."
2. **Keep top rows on a sampled score does not say where the ranking stops being meaningful.**
   (past-drawing-limit, keep; results-panel, finished sampled.) Severity 3. The error bound is
   +/-0.00035 on every value; at rank 200 that is about the size of the value. The Keep popup
   reports the tie at row 200 as if the score were exact. "Somebody will publish this as 'the 200'."
3. **"Select neighbors" in a filtered graph does not say whether it reaches past the filter.**
   (find, past the drawing limit; past-drawing-limit, two steps.) Severity 3. Find searches "all
   124,318 nodes"; nothing says whether neighbors come from the 200 or the full graph, which is the
   whole difference between "its ego graph" and "its friends in my list".
4. **No citation screen shows betweenness open in the table or chosen in Keep top rows.**
   (results-panel, in the table; table-dock, ranked -- both on proteins.) Severity 2. The join
   between "run finished" and "200 kept" is inferred. "I'm assuming the dropdown lists my column."
5. **The side-panel cost choice lacks the 500-source option the canvas popup has.**
   (results-panel, refused vs option-form-cost, over the time limit.) Severity 2. Same decision,
   two lists of choices.
6. **Quick actions says "hours"; the refusal one step later says "about 10 hours".**
   (results-panel, quick actions vs refused.) Severity 1. "Say 10 hours there too."
7. **Sample size past the limit does not estimate the time for a custom value.**
   (option-form-cost, sample past the limit.) Severity 2. 500 gives "a few minutes"; he wanted to
   know what 1,000 would cost before starting it.
8. **Quick actions shows Ctrl+K only.** (results-panel, catalog.) Severity 1. He is on a Mac.

## What pleased him

- The graph is not drawn by default, with honest counts and the in-degree-zero nodes named rather
  than dropped from the log axis.
- The refusal gives a number (about 10 hours), a time limit, and a sampled way that fits, with a
  seed; the drug-patent option says in bold that it is a different graph.
- The run record: Brandes, sources, scaling, normalization formula, a 95% error bound and a real
  timing on WebGPU (29.9 s), with Copy.
- Tied ranks shown as "#3-#7" rather than a false order.
- Keep top rows states the tie at the cut and how many rows it leaves out, and the kept graph's
  statistics warn that the 200 are not a random sample.
