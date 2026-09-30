# A weight read the wrong way -- ML engineer Chris

**Participant:** Chris, senior ML engineer on a retailer's recommendations team. Lives in PyTorch
Geometric, Spark and notebooks; opens a graph viewer for a couple of hours a week to debug single
bad recommendations. Compares everything to "fifteen lines of networkx". Checks the denominator,
the direction and the weights of any number before he believes it.

**Task as given by the moderator:** "The Les Miserables edges carry a number. Rank the characters,
then tell me whether you trust the ranking and why."

**Screens seen:** the load step for miserables.json, the project after Betweenness ran, the
Betweenness editor, the Edges editor, the project with Betweenness out of date, the project after
the re-run; the Run a measure menu, the main menu's Algorithms list and the inspector at rest (on
the protein sample); the recipe binding step (glanced at, left).

Renders the participant looked at:
- `../../../shots/record/screens__weight-role-trap-a1--study.png` through `a5--study.png`
- the last state of `../../../screens/weight-role-trap.html` (after the re-run), read on the page
- `../../../shots/record/screens__run-and-read-task-quiet-weight-trap--study.png`
- `../../../shots/record/screens__results-panel-task-quiet-weight-trap--study.png`
- `../../../shots/record/screens__inspector-task-quiet-weight-trap--study.png`
- `../../../shots/record/screens__binding-step--study.png` (glanced at, left)

## Think-aloud

**Load step.** "OK, miserables.json. I know this one -- it's the Knuth co-appearance graph, it's in
networkx as `les_miserables_graph()`. 77 nodes, 254 edges, undirected, zero isolated. Matches what
I remember. Good, it counted before it asked me anything."

"'Edge attribute value -- whole numbers, 1 to 31; most edges 1 to 3.' And a histogram. That's the
right thing to show me. Long tail, a couple of big pairs -- that'll be Valjean and Cosette or
whoever."

"'For value, a higher number means...' Huh. That's actually the question. Nobody asks this. In
networkx, `betweenness_centrality(G, weight='value')` just treats it as a distance and says
nothing. I have shipped that bug. Twice, probably."

"Options. 'A longer or costlier step -- distance. Read by shortest path, betweenness, closeness.'
'A closer or stronger link -- similarity, such as a count of shared scenes.' Well -- that's
literally my data. Count of shared scenes. It's a co-occurrence count, it's a similarity. Same as
co-purchase counts."

"Wait. The first one's already filled in. Is that the default? The radio's filled and the row is
highlighted blue. If I'm skimming at 6pm I hit Load and I've just told it counts are distances.
That's the one row I'd want empty until I pick. Or at least not pre-picked to the wrong one for a
column of small positive integers." *Clicks 'a closer or stronger link'.* "That one. Load."

"The mock only goes on down the other road, so -- fine, let me pretend I was the guy who hit Load
without reading. The question is whether the tool would have caught me."

**After Betweenness ran (read as distance).** "Valjean 0.454, Gavroche 0.285, Javert 0.193,
Myriel, Thenardier, Fantine, Mabeuf. Honestly? I'd believe that. Javert's a bridge character.
Nothing on here looks wrong. That's the scary part."

"But -- the Statistics block says 'Weight: value, used as distance'. And the result row under
Betweenness says 'Weight: value, used as distance' too. OK. That's the line I would read, because
I read the weights before the numbers. So I'd have caught it. Someone who reads the table first
wouldn't: the column header says 'betweenness, 0 to 0.454' and nothing about the weight. If I
screenshot that table for my manager, the reading is gone."

"'Full graph: 77 nodes. Sorted by betweenness.' Good, denominator's there."

**How did it run, though.** *Looks at the Run a measure menu on the protein sample.* "Betweenness,
hover, 'how often a node lies on the shortest paths between other nodes... Click to run.' Shortest
paths by what? It doesn't say which weight it's about to use, or which way it reads it. It just
runs. I only find out afterwards on the result row. I'd want the weight on this tooltip, or on the
menu row like the 'needs direction' hint -- 'value, as distance'. Before, not after."

*Main menu, Algorithms.* "Same list, dark menu. Fine. Ctrl+K for quick actions, I'd use that."

**Betweenness editor.** *Clicks the Betweenness row.* "Scope: Full graph, 77. Weight -- from
Edges: 'value, used as distance'. 'Read as a distance: a bigger value is a longer step.' OK,
that's unambiguous. And it says where it's set -- from Edges -- so I know it's a property of the
column, not of this run. That's the right model: the column means one thing."

*Hovers the little icon by the weight.* "'Detach: read value another way for this run only.' OK,
per-run override. I wouldn't have found that without hovering, but I also wouldn't want to use it
-- I want the column fixed, not one run lying about it."

"'Normalized', on. Normalized by what? (n-1)(n-2)/2? networkx's convention? If I'm comparing to a
notebook I need to know. One line would do it. And 'Details' -- I'd click that hoping for the
formula, the exact-vs-sampled and a timing. Top 5 with three decimals, fine."

**Edges editor.** *Clicks the weight value; the Edges editor opens.* "Direction undirected,
weight 'value', 'a higher value means' -- change to 'a closer or stronger link'. Done. And the
result says 'Out of date' immediately, with a Re-run button, and the table column says Out of
date too. Good. It didn't silently recompute, and it didn't pretend the old numbers are still
right."

"'How it is converted.' That's the thing I actually care about. Betweenness needs lengths. If
value is a similarity, how does it get a length -- 1/value? max minus value? -log? Those give
different rankings. I'd click it. The fact it's collapsed is OK, but the result row should say it,
not just 'used as similarity'. 'Used as similarity' for a path measure is half an answer."

**Out of date.** "Old numbers still up, marked Out of date. Nothing reran by itself. Re-run."

**After the re-run.** "Valjean 0.795, Marius 0.499, Myriel 0.224, Fantine 0.193, Courfeyrac 0.177,
Thenardier 0.172, Gavroche 0.102. Result row: 'Weight: value, used as similarity'. Range 0 to
0.795."

"Marius shot up. Javert's gone from the top 7 -- I can't even see where he went. That's the bit I
want: old run next to new run, rank change per node, sort by the biggest move. Same thing I want
for heuristic versus model score. Here the old column just got overwritten. To answer 'how much did
the weight reading matter' I'd have to Detach and run it twice and eyeball it... or open a
notebook."

**Recipe binding step.** *Glances.* "This is about applying someone's recipe to a gene table.
Not my task." *Leaves.*

**Inspector at rest (protein sample).** "Results list says 'PageRank -- full graph, unweighted' and
'Louvain -- 10 communities, confidence used as similarity'. OK, so every result carries its
reading. Consistent. That's good. At this width the right column's cut off, though -- 'undirecte',
'confidence, not used y', '0.028' with the label pushed off. On my laptop screen that's what I'd
get."

## The answer

"Ranking, with value read as shared-scene counts, which it is: Valjean, Marius, Myriel, Fantine,
Courfeyrac, Thenardier, Gavroche."

"Do I trust it? Partly. I trust that I know what it computed -- it told me the weight and which way
it read it, on the result itself. That's more than networkx does. I don't fully trust the ranking,
for three reasons. One: it's betweenness, and 'rank the characters' on a co-occurrence count --
I'd run weighted degree and PageRank too, which the load step itself says are the similarity
measures, and only believe names that are top in all of them. Two: path measures on a similarity
depend on the conversion, and I don't see it on the result. Three: Valjean is top either way, but
everything below number two moved a lot between the two readings -- Javert went from third to out
of sight -- so the middle of this list is fragile, and the tool doesn't show me how fragile. And
I'd want to know what 'normalized' divides by before I compare it to anything."

## Single Ease Question

**5 of 7.** "Easy to get a number, and the weight question at load is genuinely good. Minus one for
the pre-filled distance answer, minus one because checking whether the reading mattered means
digging through Detach and re-runs instead of seeing two runs side by side."

## Would he use this instead of his current tool?

"Not instead of the notebook -- that's where my data is and where the numbers go. But for the two
hours a week I'm poking at one neighbourhood, this weight handling is better than what I have: in
networkx the weight is a distance whether you meant it or not, and nothing tells you. If it showed
the conversion on the result, and let me put two runs next to each other, I'd open it. Also: none
of this was my data. Until I can drop my Parquet edge list in, it's a nice demo."
