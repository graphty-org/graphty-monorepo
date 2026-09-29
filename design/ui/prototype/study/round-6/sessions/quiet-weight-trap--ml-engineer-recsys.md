# Session: rank the Les Miserables characters and say whether to trust it -- Chris (ML engineer, recommendations)

Task as given by the moderator: "The Les Miserables edges carry a number. Rank the characters,
then tell me whether you trust the ranking and why."

Screens seen, in the participant view (design notes hidden), at 1440 x 900: the weight screen in
its six states (load, the run form, its answers, the first result, the change, the re-run), the
table dock (single-measure, ranked and export states), the results panel and run-and-read catalog,
and the data panel. Chris also ran the same three computations in networkx on his own machine,
which he does with any number a tool shows him.

## Think-aloud

**The load dialog.** "OK, miserables.json. 77 nodes, 254 edges, undirected, zero isolated. Those
are the right numbers, that's the networkx les_miserables_graph. Edge attribute `value`, whole
numbers 1 to 31, most edges 1 to 3. Fine -- it's the co-appearance count, heavy-tailed like every
interaction count I've ever seen. The histogram has no axis ticks, so I can't read the tail off
it, but the text line gives me the range, which is what I actually wanted. 'A measure that reads
value asks, each time it runs, what a bigger value means.' Short enough that I read it. Load."

**Picking a ranking.** "Rank the characters -- by what? The task doesn't say. Degree is already in
the table, Valjean 36, Gavroche 22. That's a count, not a ranking I'd defend. The number on the
edge only matters for something path-based or something that sums weights. Betweenness is the
one everyone runs on this graph, so Betweenness in the Catalog."

**The run form.** "Scope full graph, 77. Weight: value. 'In this run, a bigger value means:
Choose...' and Run is greyed with a tooltip 'Choose what a bigger value means first.' Huh. That's
the exact bug networkx doesn't protect you from -- `betweenness_centrality(G, weight='weight')`
treats the weight as a length, silently, and on a co-occurrence graph that's backwards. I've seen
a teammate ship a 'most central items' dashboard that way. So this is making me answer the
question I'd normally forget to ask. Mildly annoying if I already know, but I'd rather that than
the default."

**The two answers.** "'a longer or costlier step -- Distance = value.' 'a closer or stronger link
-- Distance = 1 / value, such as a count of shared scenes.' Good: it tells me the actual
transform, not a vibe. Shared scenes is a strength, so 1 / value. But why only 1/value? I'd
at least want -log(value / max) or max + 1 - value, and ideally a free expression, because the
choice of transform moves ranks 2 through 10 and I'd want to check that. Also, 'such as a count of
shared scenes' is suspiciously specific to this file -- on my data does it say 'such as a count of
co-purchases'? If it's reading my column name to guess, I want to know that."

"Where's unweighted? It says Weight: value -- I assume I open that dropdown and there's a None.
I'd want that as run zero, the baseline. Not obvious from the closed form."

**The first result (Distance = value).** "The scripted path shows someone picking the wrong one
first: Valjean 0.454, Gavroche 0.285, Javert 0.193, Myriel 0.177. Looks plausible, which is the
point -- nothing screams. The run row says 'Run 1. Distance = value', so at least the wrong
choice is written down next to the result and not hidden in a settings drawer."

**Changing the answer.** "Open the run, switch to closer/stronger. Run 1 goes 'Out of date', the
button says 'Re-run (keeps Run 1)', the old numbers stay with 'Out of date' in the column header.
Good. I hate tools that overwrite the previous result when you touch a parameter -- this is
basically an MLflow run list. Two runs, each with its transform on the row."

**Run 2 (Distance = 1 / value).** "Valjean 0.795, Marius 0.499, Myriel 0.224, Fantine 0.193,
Courfeyrac 0.177, Thenardier 0.172, Gavroche 0.102."

**Checking it.** "I don't take a centrality number from a GUI without reproducing it. networkx,
three lines each:
- unweighted: Valjean 0.570, Myriel 0.177, Gavroche 0.165, Marius 0.132, Fantine 0.130
- weight = value: Valjean 0.454, Gavroche 0.285, Javert 0.193, Myriel 0.177, Thenardier 0.129
- weight = 1/value: Valjean 0.795, Marius 0.499, Myriel 0.224, Fantine 0.193, Courfeyrac 0.177,
  Thenardier 0.172, Gavroche 0.102; Marius is 2nd, Javert 45th.
Every number on screen matches to three decimals. Normalized is on and it matches networkx's
default normalization for undirected graphs, so I'll assume that's what the toggle means -- but
nothing on screen says 2 / ((n-1)(n-2)). The Catalog tooltip says 'how often a node lies on the
shortest paths between other nodes' -- doesn't say *weighted* shortest paths, doesn't give the
normalization. That's the one-line definition I'd actually read."

**Comparing the runs.** "Now the question is whether the ranking is stable. In this table there's
one betweenness column, 'Sorted by betweenness, Run 2'. Where's Run 1 as a column? I want Run 0
(unweighted), Run 1 and Run 2 side by side with rank columns and a rank correlation. The table
dock on the other screen has exactly the thing: a group header 'Betweenness exact, unweighted,
full graph', a rank column 'of 77', and an agreement line 'Valjean is #1 on both measures. At #2
they part.' plus 'Compare rankings...' to a rank-vs-rank scatter. If that works for two runs of
the same measure with different transforms, that's my trust check in one line. I can't tell from
the weight screen that it does -- its column header just says 'betweenness 0 to 0.795', no
'1 / value', no 'exact'. The caption says 'Run 2'; the header should too, the way the table dock
header does."

"And that table dock screen shows Valjean at 0.570 -- unweighted. So in this product I've now
seen Valjean at 0.570, 0.454 and 0.795. All correct, all different. The only thing keeping them
apart is a header line, so that header line has to be on every table, not just one screen."

**Export.** "Export table: all rows, 'never a sample', first column is the file's own id, 'each
run's columns carry its method and scope in the header', plus a methods .txt beside it. That's
what I'd need to paste into a notebook and diff. Good."

## Answer to the task

Ranking (betweenness, co-appearance count read as strength, so distance = 1 / value, normalized,
exact, full graph): Valjean, Marius, Myriel, Fantine, Courfeyrac, Thenardier, Gavroche.

Do I trust it? Partly.
- Valjean at #1: yes. He's first unweighted, first with value as length, first with 1/value.
  Nothing I do moves him.
- 1 / value over value as the reading: yes, a shared-scene count is a strength, and the tool made
  me say so and wrote it on the run.
- The numbers: yes, they reproduce in networkx to three decimals.
- Ranks 2 to 7: no, not as an ordering. Marius is 2nd with 1/value, 4th unweighted, 10th with
  value as length; Gavroche goes 3rd, 2nd, 7th. The order below Valjean depends on the transform,
  and 1/value is one arbitrary choice among several (-log, max minus value) that the tool doesn't
  let me try. I'd report "Valjean, then a group of Marius, Myriel, Fantine, Gavroche whose order
  depends on how you turn counts into distances", not a strict top 7.

## Single Ease Question

**5 / 7.** Getting a ranking was quick, and the forced "what does a bigger value mean" question
plus the transform printed on the run row is the right design. The points off: I had to leave the
screen (networkx) to judge stability, the run table doesn't put the runs side by side or name the
transform in the column header, only two transforms are offered, and the tooltip doesn't define
the weighted, normalized measure.

## Would I use this instead of my current tool?

For this exact job, no -- it's fifteen lines of networkx and I'd run the three variants in a loop
and print a Kendall tau. But I'd hand it to a merchandiser or a PM over networkx, because networkx
would have let them produce Run 1 and never know it was wrong, and this won't. If the run list
could lay two runs of the same measure side by side with ranks and an agreement line, I'd use it
myself for the "is this ranking robust" check on an ego graph -- that part is genuinely more
annoying in a notebook.
