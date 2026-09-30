# Two runs of one measure, compared -- Chris (ML engineer, recommendation systems)

**Task, as the moderator read it:** "Yesterday you ranked the Les Miserables characters one way. A
colleague asks you to rank them again with one thing changed, and to tell her what differs between
the two rankings and how each was made."

The same task, in the same words, was given in the previous round. Chris took part in it then and
gave it 4 of 7; across all participants it averaged 3.83.

**Screens worked through (renders the participant saw, 1440 x 900 wide, participant view):**

| What | Render |
|---|---|
| Navigation, every frame (Les Miserables: at rest, main menu, Results list, Betweenness opened, Data) | `shots/record/chris-r6-tworuns-navigation.png` |
| Results panel, every state | `shots/record/chris-r6-tworuns-results-panel.png` |
| Results panel: a second run going, Run 1 kept | `shots/record/chris-r6-tworuns-rp-running.png` |
| Results panel: the running run opened, options popover | `shots/record/chris-r6-tworuns-rp-running-result.png` |
| Results panel: a finished Betweenness | `shots/record/chris-r6-tworuns-rp-finished.png` |
| Results panel: "Compare with..." menu | `shots/record/chris-r6-tworuns-rp-compare-with.png` |
| Results panel: Louvain with its run record open | `shots/record/chris-r6-tworuns-rp-louvain.png` |
| Results panel: Les Miserables, Betweenness on a filtered graph, run record open | `shots/record/chris-r6-tworuns-rp-filtered.png` |
| Results panel: out of date review | `shots/record/chris-r6-tworuns-rp-outofdate.png` |
| Results panel: a node selected | `shots/record/chris-r6-tworuns-rp-node-selected.png` |
| Comparison, every state (including "PageRank at damping 0.85 and 0.5") | `shots/record/chris-r6-tworuns-comparison.png` |
| Table dock, every state | `shots/record/chris-r6-tworuns-table-dock.png` |
| Table dock: three measures ranked | `shots/record/chris-r6-tworuns-td-ranked.png` |
| Table dock: Les Miserables, a betweenness column out of date | `shots/record/chris-r6-tworuns-td-stale.png` |
| Table dock: Export | `shots/record/chris-r6-tworuns-td-out.png` |

Moderator's note on the setup: the navigation page renders this round (last round it came up blank
without a frame). Les Miserables is drawn in the navigation frames, in one results state (a filtered
run) and in one table state. Everything about a second run and about comparing two runs is drawn on
the patent-citations and payments datasets, with damping as the option that changed. Chris was told
to read those as "the same controls, other data".

---

## 1. Finding yesterday's ranking

*(Navigation: Les Miserables at rest, then the Results frame.)*

"Les Mis again. 77, 254, one component. OK, rail on the left: Graph, Data, Results, Notes. Last time
I spent two minutes digging for my own run. Click Results."

"'Results. Every run of a measure, with its settings and date. Newest first.' Two rows: 'Betweenness,
today 14:02 -- Exact, normalized, no weight. Full graph, 77 nodes.' and 'Bridges, 27 Sep'. Good.
That's the list I wanted last time. One click. It says 'today' and the task says yesterday, but
whatever, it's a mock."

"And the one-liner under the row is the settings. 'Exact, normalized, no weight.' That's already
half of 'how was it made'. I didn't even open it."

*(Betweenness opened, navigation frame.)*

"'Ran on the full graph, 77 nodes. No weight: every edge counts the same.' Settings block: method
exact every node, normalized yes, edges undirected, weight none, on 29 Sep 14:02. Top nodes
Valjean 0.57, Myriel 0.177, Gavroche 0.165. Those are the real networkx numbers, by the way --
Valjean 0.570, Myriel 0.177, Gavroche 0.165. Somebody actually ran it. That buys some trust."

"Buttons: 'Re-run' and 'Compare with...'. Hmm. 'Re-run'. Last time my whole question was whether
Re-run overwrites. Hold that thought."

*(Data frame.)*

"Data: miserables.json, edges 'value', 'Weight: value, not used yet'. Version 1, current. So the
data didn't change since yesterday, and the weight has never been used. Fine. The one thing I'm
going to change is the weight. That's the only change that's interesting on this graph."

"Time to here: under a minute. Big improvement."

## 2. Changing the one thing

*(Results panel: finished Betweenness on the protein data, then the running state on the patents.)*

"Right, the full result view is richer than the one in the navigation frames. Top: 'on: full graph,
300 nodes, 3 components. Exact (i). Undirected. WebGPU. Details. Weight: confidence, not used yet.
Change...'. And the button, top right: 'Re-run (keeps Run 1)'. THERE it is. That answers last round
in three words. It doesn't overwrite. Thank you."

"It's greyed out, I assume because I haven't changed anything yet. Makes sense."

"Options: Scope Full graph, Weight None for this run. 'Runs of this measure 1: Run 1, shown.
Compare with...' OK, same MLflow model as before -- experiment has runs."

*(The running state.)*

"Patents, PageRank. The list: 'PageRank, damping 0.5, Sep 28 10:21, running on WebGPU, under a
minute. Keeps Run 1.' Below it, 'PageRank, damping 0.85, 10:14'. Each run is labelled by the option
that differs. That's exactly the naming I'd want: I don't care it's 'Run 2', I care it's the one
with damping 0.5. For me it would say 'Betweenness, weight value' versus 'Betweenness'."

*(The running run opened, options popover.)*

"Options popover: 'Options wait for Run'. Scope, Direction, Weight dropdown, Damping 0.7 with a dot
next to it -- changed, not run. 'Damping 0.7 has not run. Run queues it after this run, and keeps
Run 1.' Nice, that's queued, not clobbered. 'Runs of this measure 2: Run 2 damping 0.5, running 62%.
Run 1 damping 0.85, shown.' Run 1 stays on screen while Run 2 cooks. Correct."

"Now the weight. On the patents the dropdown just says 'No numeric edge column', closed. So I still
can't see what it would offer me for Les Mis. And that is THE question for weighted betweenness:
is 'value' a distance or a strength? Value is how many chapters two characters share. Higher means
closer. If it goes into Dijkstra as a length, Valjean-Cosette with 31 chapters becomes the longest
edge in the book and the ranking is garbage."

*(Out-of-date review, and the right-hand Overview.)*

"OK, wait. The Overview on the right says 'edges undirected; confidence, used as similarity'. And
the review popover: 'Louvain used confidence as a distance. It is now used as similarity. Re-run to
update. Betweenness and Closeness did not use the weight, so they stay current. Each re-run is
added as Run 2; Run 1 of each stays.' So the similarity-or-distance thing is set once, on the data,
not per run. That's... actually defensible. It's a property of the column, not of the algorithm.
Same as declaring a dtype."

"But then for betweenness, which needs lengths, something has to turn a similarity into a length.
1/value? max minus value? -log? Those give different rankings. I looked at the Louvain run record:
'Weight conversion: confidence used as given, 0.40 to 0.99, as similarity: higher = stronger link'.
Good for Louvain, it wants strengths. I never see a betweenness record with a weight in it, so I
don't know what it would write there. If it says 'value, as similarity, length = 1/value' I'm happy.
If it's silent, I'm writing the notebook anyway to check."

"And 'Change...' next to 'Weight: value, not used yet' -- I'd click that expecting the dropdown.
No idea where it goes. I'd guess the Data panel. I'd give it the 30 seconds."

*(Les Miserables, Betweenness on the filtered graph.)*

"Oh, here's Les Mis in the results panel, but it's a different 'one thing changed' -- a filter.
'Betweenness, on 60 of 77 nodes', Valjean 0.419, Gavroche 0.172, Marius 0.164. And 'Runs of this
measure 1'. Hmm. So a filtered run is its own result with its own Run 1, not Run 2 of yesterday's?
Or it just doesn't show yesterday's because this frame was drawn another day. If I'd changed the
scope instead of the weight, I'm not sure it would be listed as a run of the same thing. For a
damping change it is. I'd want the rule to be the same for any option: same measure, same data,
different option = another run."

"Also -- the navigation frame's result has a plain 'Re-run' button, no '(keeps Run 1)'. And the
table's out-of-date column says 'Re-run' too. So two out of three places still say the ambiguous
word. The results panel is the one I'd trust, but I'd notice the other two."

## 3. Putting the two side by side

*(Compare with... menu.)*

"'Compare with...' on the damping 0.5 row. Menu: 'Earlier runs of PageRank: PageRank, damping 0.85,
Sep 28 10:14' first, highlighted. Then 'Other runs on this graph', then 'The same run on another
data version...'. That's the case I said was missing last time, and it's first in the list. Good."

*(Comparison page, the strip "PageRank at damping 0.85 and 0.5".)*

"Header: 'PageRank at damping 0.85 and 0.5'. The title IS the one thing that changed. That's the
sentence I wanted at the top last round. Each side: 'Damping 0.85 -- PageRank run 2. Unweighted,
directed. Details.' 'Damping 0.5 -- PageRank run 1. Unweighted, directed. Details.'"

"Hang on. Run 2 is damping 0.85? On the results panel, Run 1 was damping 0.85 at 10:14 and Run 2 was
damping 0.5 at 10:21, 'keeps Run 1'. Here they're flipped. And the little Compare picker further
down says 'PageRank, damping 0.5 -- Run 1'. So which is it? This is exactly the kind of thing I'd
lose an afternoon to if I were reporting 'the new run'. Label by the option, fine, but if you also
show a run number it has to be the same number everywhere. Right now I'd ignore the run numbers
entirely and go by the damping value, and I'd tell the colleague to do the same."

"Agreement: 'The rankings agree at the top. Spearman 0.998, leaving out the 1,153 accounts tied at
the bottom of both (1.000 with them).' Still the honest Spearman, both values. And no 'PageRank gives
the same result every run, so a re-run cannot tell change from noise' line here -- that was wrong
for an option change and it's gone. Good."

"Differences: 'Ranked higher at: Damping 0.85 | Damping 0.5'. 'Top 100 on either, by rank at damping
0.85. Rank 1 is the top.' Rows: ACC-233575 #89 vs #124, ACC-309606 #94 vs #122, ACC-577269 #85 vs
#110, ACC-815942 #95 vs #119. Wait, that's not sorted by rank at 0.85 -- 89, 94, 85, 95. It's
sorted by how far they moved: 35, 28, 25, 24. Which is the sort I actually want, the disagreement
sort. But the caption says it's by rank. Caption and rows disagree. I'd read the numbers and trust
the numbers."

"What's missing from this strip compared to the big comparisons: no scatter, no 'X of the top 50 in
both', no 'Moved' toggle like the March/April one has. For a same-measure, two-option comparison I'd
want the Moved sort and the top-K overlap more than anything. The March/April one has 'Moved |
March only | April only'. Put 'Moved' here too. Maybe the full version has it and the strip is just
a strip; I can't tell."

"For Les Mis, where it's 77 characters, I'd want this to basically be: top 10 in each, side by side,
with a rank-change column. 'Valjean #1 in both. Myriel drops from #2 to #whatever once weights are
in.' That's the whole message."

## 4. "How each was made"

*(Run record on the Les Miserables filtered run, and the Louvain one.)*

"Run record, Betweenness, Copy. Method 'Brandes betweenness, exact: every node is a source'. Seed
'None: nothing is sampled'. Normalization 'Divided by (n-1)(n-2)/2 = 1,711 node pairs; n = 60, the
filtered graph'. Weight conversion 'None: value not used'. Scope 'Filtered graph, 60 of 77: after
Filter to degree >= 2'. Engine WebGPU. Took 0.1 s."

"This is the best thing in the product. It names the algorithm variant, the normalization with the
actual denominator, the scope with the filter that made it, and a timing on the engine instead of a
'GPU' badge. That's the 'how each was made' answer, per run, with a Copy button. I'd paste two of
these into Slack and be done with that half of the question."

"Each side of the comparison has 'Details', which I assume opens exactly this card for that run.
Good."

"The one line I haven't seen filled in for my case is 'Weight conversion' on a weighted betweenness.
Louvain's says 'as similarity: higher = stronger link'. Betweenness would need to say how that
became a path length. That's the line the colleague will ask about."

## 5. Handing it over

*(Table dock: three measures ranked; the out-of-date column on Les Mis; Export.)*

"The table: column groups carry the method -- 'Betweenness exact, unweighted, full graph',
'PageRank damping 0.85, unweighted, full graph' -- and each has a rank column 'of 300'. Summary
line: 'MAPK1 and TP53 are the top 2 on all three measures. At #3 they part.' and a 'Compare
rankings...' link. So with two betweenness runs I'd expect two column groups, 'Betweenness exact,
unweighted' and 'Betweenness exact, weighted by value, as similarity', and the sentence 'Valjean is
#1 on both. At #2 they part.' Not drawn with two runs of one measure, but the pattern's obvious."

"Les Mis table with a filter on: betweenness column says 'exact, unweighted, full graph', 'Out of
date, Re-run'. Ranks 'of 77' while degree ranks 'of 27'. Good, it doesn't pretend the old column is
about the filtered graph."

"Export: Table .csv, 'Methods: Always written beside it', 'The first column is the file's own id.
Each run's columns carry its method and scope in the header', and 'Beside it:
ppi-core-300-nodes-methods.txt'. A methods sidecar file. That's MLflow-grade. I'd send her the CSV
and the txt, or a link to the saved comparison."

"'Save comparison' on the comparison page, and a toast 'Comparison saved, Undo', and it shows up in
the Runs list as 'PageRank and betweenness'. So the side-by-side is an object I can come back to.
That's what I'd hand over."

## 6. What I'd tell the colleague

"'Two betweenness rankings of Les Mis, exact, full graph, 77 characters. Yesterday's ignored the edge
weights; today's uses the chapter co-appearance count as a similarity, converted to a path length
by [whatever the record says]. Top 10 side by side with the rank change attached, and the two run
records.' Then I paste two Copy blocks and the Differences list, or send the saved comparison."

"What I actually confirmed on screen: my old run is one click away with its settings; a new run is
added, not overwritten, and the list labels it by the changed option; Compare with... offers the
earlier run of the same measure first; the comparison titles itself by the change; each run has a
full record with Copy; the export writes the methods beside the data."

"What I still had to assume: what the weight dropdown offers on Les Mis, and how a 'similarity'
weight becomes a length for betweenness. And I'd tell her to ignore the run numbers because two
screens disagree on which one is Run 1."

---

## Single Ease Question

**5 out of 7.**

"Up from 4. Finding the old run, knowing a re-run keeps it, and picking it in Compare with... all
work now, and the comparison names the change in its title. I lose two points on the weight --
I still can't see the distance-versus-similarity choice or the conversion where I make the run --
and on the run numbers contradicting each other between the results panel and the comparison. For
a task that is literally 'tell her how each was made', a wrong run number is a real defect, not a
cosmetic one."

## Would I use this instead of my current tool?

"For the computing: no. It's 77 nodes. `betweenness_centrality(G)` and
`betweenness_centrality(G, weight='dist')` with `dist = 1/value`, merge, sort by rank change. I know
exactly what the weight did because I wrote the line."

"For the handing over: yes, more convincingly than last time. She doesn't read notebooks. A saved
comparison titled by the one thing that changed, a run record per side with the normalization
denominator and the timing, a CSV with a methods file next to it -- that's better than what I'd
produce by hand, and it's reproducible because the record is attached, not in my head. I'd use it
as the thing I send, as long as the weight conversion shows up in the record. If it doesn't, I'd
still be pasting my own line of code next to it, and at that point why am I here."

---

## Observer notes (not the participant's words)

- **Resolved since last round:** the Results list is on the rail and yesterday's run was found in
  one click with its settings in the row; "Re-run (keeps Run 1)" and "Keeps Run 1" on the running
  row settled the overwrite-or-append question; "Compare with..." lists earlier runs of the same
  measure first; a same-measure, two-option comparison is drawn ("PageRank at damping 0.85 and
  0.5"), titled by the changed option, without the noise caveat that would be wrong for it.
- **Run numbers contradict between pages.** Results panel (running and compare-with states): Run 1 is
  damping 0.85 at 10:14, Run 2 is damping 0.5 at 10:21. Comparison strip: "Damping 0.85 -- PageRank
  run 2" and "Damping 0.5 -- PageRank run 1"; the comparison picker also lists "PageRank, damping
  0.5 -- Run 1". The participant decided to ignore run numbers and go by the option value. For a
  "how was each made" task he rated this as a real defect.
- **Differences caption does not match its rows.** The two-runs strip says "Top 100 on either, by
  rank at damping 0.85" but the rows (#89, #94, #85, #95) are ordered by places moved (35, 28, 25,
  24). The participant preferred the moved order and wanted the caption, and a "Moved" toggle like
  the two-versions comparison, to say so.
- **The weight role is still not visible where the run is made.** The participant worked out from
  the Overview ("confidence, used as similarity") and the out-of-date review that the role is set on
  the data, and found that reasonable. He never saw a weighted betweenness run record, so he could
  not see how a similarity becomes a path length, which he says decides whether the weighted ranking
  means anything. "Change..." beside the weight line has no visible destination.
- **"Re-run" wording is split.** The results panel says "Re-run (keeps Run 1)"; the navigation
  frame's opened result and the table's out-of-date column header still say plain "Re-run". The
  navigation frame's opened result is also a different layout (a Settings block, no "Runs of this
  measure") from the results panel's.
- **Scope change vs option change.** The Les Miserables filtered run shows "Runs of this measure 1",
  so the participant could not tell whether a change of scope adds a run to the same result (as a
  damping change does) or starts a new result.
- **Strongest positives:** the run record (normalization with the actual denominator, scope with the
  filter that produced it, engine with a timing) with Copy; the Results row summarising settings;
  the running row labelled by the changed option; Spearman with and without ties; the table's column
  headers carrying method and scope; the export's methods file written beside the CSV; saving a
  comparison as an object in Results.
- **Coverage gap for this task:** no Les Miserables frame shows a second run, a weighted run, or a
  run-vs-run comparison; all of that is on the patent and payments data with damping as the change.
