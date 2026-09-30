# Two runs of one measure, compared -- Chris (ML engineer, recommendation systems)

**Task, as the moderator read it:** "Yesterday you ranked the Les Miserables characters one way. A
colleague asks you to rank them again with one thing changed, and to tell her what differs between
the two rankings and how each was made."

**Screens worked through (renders the participant saw, all 1440 x 900, participant view):**

| What | Render |
|---|---|
| Les Miserables at rest, new rail | `shots/record/r4-chris-tworuns-nav-new.png` |
| Les Miserables, Data panel | `shots/record/r4-chris-tworuns-nav-new-data.png` |
| Les Miserables, today's rail with Results | `shots/record/r4-chris-tworuns-nav-today-results.png` |
| Navigation page opened directly in the participant view (blank) | `shots/record/r4-chris-tworuns-navigation.png` |
| Results in the inspector, 21 states | `shots/record/r4-chris-tworuns-results-panel.png` |
| Run a measure and read it | `shots/record/r4-chris-tworuns-run-and-read.png` |
| Comparison surface | `shots/record/r4-chris-tworuns-comparison.png` |
| Table dock | `shots/record/r4-chris-tworuns-table-dock.png` |
| Inspector, 19 states | `shots/record/r4-chris-tworuns-inspector.png` |

Moderator's note on the setup: the navigation page opened in the participant view renders as a
blank white page (`shots/record/r4-chris-tworuns-navigation.png`). Its full-size frames (`?frame=new`,
`?frame=new-data`, `?frame=today-results`) do render, and the session used those. Most of the
results, run and comparison states are drawn on the protein, patent and payments datasets, not on
Les Miserables. Chris was told to read them as "the same controls, other data".

---

## 1. Finding yesterday's ranking

*(Les Miserables at rest, new rail.)*

"OK, Les Mis, 77 nodes, 254 edges, one component. Fine, that's the karate club of co-occurrence
graphs. First thing: where's the ranking I made yesterday? Right side, Results... one row,
'Bridges, done'. That's not a ranking. I ranked characters, so it would be PageRank or
betweenness or something. It's not here."

"Left side. Graphs, Sets and paths, Views. 'The whole novel', 'Valjean and his neighbors' --
those are camera views, not results. Nope."

*(Clicks Data.)*

"Sources, miserables.json, nodes label and group, edges 'value', and -- oh, this is good --
'Weight: value, not used yet'. That's the one-thing-changed, right there. The edge value is the
chapter co-occurrence count and nothing has used it. So yesterday's ranking was unweighted. I'd
bet on that anyway, but it's nice that it says so on the data, not buried in a run."

"Versions: 'Version 1, miserables.json, current'. So the data didn't change since yesterday. Good,
that rules out the other one-thing-changed. But I still don't see yesterday's ranking anywhere."

*(Looks at today's rail with Results.)*

"This one has a Results button on the rail and it lists 'Betweenness done' and 'Bridges done'.
And the table has a betweenness column, 0.57 for Valjean. OK, so yesterday was betweenness. But
wait -- which one is the real app? One screen has Results on the rail, the other has a Results
section at the bottom of the right panel that doesn't list Betweenness at all. If I came back
tomorrow and my run was gone from the list, I'd assume the tool lost it."

*(Table dock, Les Miserables.)*

"The table's header over the betweenness column: 'Betweenness exact, unweighted, full graph'.
That's exactly what I want. The column carries how it was made. Rank column 'of 77'. OK, I'm
settling on: yesterday = betweenness, exact, unweighted, full graph. Valjean #1 at 0.570,
Gavroche 0.165, Marius 0.132."

"Time to here: honestly, a couple of minutes of hunting. In a notebook it's
`nx.betweenness_centrality(G)` in a cell I can scroll up to."

## 2. Changing the one thing

*(Results in the inspector, the finished Betweenness result.)*

"Right, so I click the result and the right panel becomes the result. Top line: 'on: full graph,
300 nodes, 3 components. Exact (i). Undirected. WebGPU. Details'. Then 'Weight: confidence, not
used yet. Change...'. That's the denominator line, that's the thing I read first, and it's right
where I look. Good."

"'Change...' -- I'd click that. Further down there's 'Options: Scope Full graph, Weight None for
this run'. And 'Runs 1: Run 1, 1.2 s, shown' and 'Compare with...'. OK. So the model is: a result
has runs. I change the weight, I hit Run, I get Run 2 and Run 1 stays. That's the right model --
it's basically an MLflow run under one experiment."

*(The running state, and the 'Edits wait for Run' line in the run-and-read card.)*

"'Edits wait for Run'. Good, it doesn't silently recompute when I touch a dropdown. And while Run 2
goes, Run 1 stays 'shown' and Run 2 says 'running, 62%'. That's correct behaviour. I'd trust
that."

"Now here's my problem. I'm switching the weight from None to 'value'. For betweenness that means
shortest paths over weighted edges. Is 'value' a distance or a similarity? For Les Mis, value is
the number of chapters two characters share. Higher means CLOSER. If the tool uses it as a
distance, Valjean-Cosette with value 31 becomes a long edge and the whole ranking inverts in a
dumb way. That's the leakage-level bug I'd lose a day to."

"The weight dropdown is drawn closed. I can't see what it offers. I did see, on the out-of-date
state, 'Louvain used confidence as a distance. It is now used as similarity'. So the tool knows
the two readings exist. That's reassuring. But on the screen where I actually pick the weight I
don't get to see that choice. I'll guess the dropdown says 'value, as similarity' and 'value, as
distance'. If it only says 'value', I'm stuck and I'd go read the docs -- which I won't."

"Second thing: the out-of-date popover says 'Re-run' and 'Re-run all'. Does Re-run replace Run 1,
or make Run 2? The Runs list suggests it adds. The word 'Re-run' suggests it overwrites. For this
task that's the difference between being able to answer the colleague and not."

## 3. Putting the two side by side

*(Comparison surface.)*

"OK, 'Compare with...'. The comparison page is on some payments dataset but the shape is clear.
Two sections: 'two measures' -- PageRank against betweenness -- and 'two data versions' --
PageRank on March against April. There's no 'same measure, same data, two option settings'
section. Which is exactly my case. Hmm."

"The picker when I click 'Compare with...': header 'Compare PageRank with', search box says 'Find
a result or run', then the list: 'PageRank on March data', 'Betweenness -- Not run', 'Degree'. It
says 'or run' in the placeholder, but no run of the same measure is in the list. I'd type 'run'
in the search box and hope 'Betweenness, Run 1' shows up. If it doesn't, I give up on the
comparison surface and go to the table."

"Assuming it works, the comparison itself is really good, I'll give it that. Scatter of rank vs
rank on log axes, the tie band is drawn as a band not a smear of dots, 'Not plotted: the 1,153
tied at the bottom of both' -- it tells me what it dropped, with a count. 'Agreement: 0 of the top
50 in both', 'At the other lengths: 0 of 5, 0 of 10...'. Spearman 0.40 'leaving out the 1,153
tied at the bottom (0.78 with them)'. That's the most honest Spearman I've seen in a GUI. Usually
people report the tie-inflated one and call it agreement."

"The March/April one has 'PageRank gives the same result every run, so a re-run cannot tell change
from noise. Compare with randomized baseline...'. Whoa, OK, that's a real statistician's caveat.
For my case -- weighted vs unweighted -- that sentence would be wrong, or at least irrelevant,
since the difference is an option, not noise. I'd want it to say 'these differ only in the
weight' at the top of the comparison, in the header where it currently says 'PageRank on March
data / PageRank on April data'."

"Differences table on the right: account, rank A, rank B, 'moved'. Sortable by 'Moved', 'March
only', 'April only'. For my case I want 'moved' sorted by absolute rank change. That's the
disagreement sort I always ask for between Adamic-Adar and the model. It's here, basically."

"Each side has 'Unweighted, directed. Details'. That per-side summary is what the colleague asked
for -- how each was made. Two lines. I could screenshot that."

## 4. "How each was made"

*(Run record card on the comparison page.)*

"'Run record, PageRank, Copy'. Method, seed 'Does not apply: the same result every run', damping,
normalization, 'Weight conversion: None: unweighted', iterations 100 fixed, what happens to nodes
with no out-edges, scope with the count. And a Copy button. This is the part I'd actually use.
That's the MLflow params block. If I click Copy and get something I can paste in Slack, the
'how each was made' half of the colleague's question is done in one click per run."

"What I'd want: 'Weight conversion' on the weighted run to say 'value, as similarity, turned into
distance by 1/value' or whatever it does. If it says just 'value' I don't know what it did."

## 5. Handing it over

*(Table dock: three measures ranked, and Export table as CSV.)*

"The table can hold several measures with rank columns, and the header group says 'PageRank
damping 0.85, unweighted, full graph'. So if I run betweenness twice, I assume I get two column
groups, 'Betweenness exact, unweighted' and 'Betweenness exact, weighted by value'. The summary
line over the table -- 'MAPK1 and TP53 are the top 2 on all three measures. At #3 they part' --
that's a nice one-sentence diff. For my case it would say 'Valjean is #1 in both. At #2 they
part'. That's literally the sentence the colleague wants."

"Export: 'Each run's columns carry its method and scope in the header, as in the table', and the
preview shows `"community (Louvain, weighted, seed 7, full ...`. Original ids first column. OK.
That I can read in pandas. The headers are long and full of commas-in-quotes, which will annoy
me, but they're self-describing, which is worth it."

## 6. What I'd tell the colleague

"If the mocks work the way they look: 'Two rankings of Les Mis characters by betweenness, exact,
full graph, 77 nodes. Yesterday's ignored edge weights. Today's uses the co-appearance count as
a similarity. Here's the top-10 diff and the two run records.' And I'd paste the two Copy blocks
and the Differences table."

"But I got there by assuming three things I couldn't see: that my run from yesterday is still
listed somewhere I'd find it, that the weight dropdown asks me distance vs similarity, and that
'Compare with...' lists Run 1 of the same measure. Any of those is wrong and I'm back in the
notebook."

---

## Single Ease Question

**4 out of 7.**

"The reading side is a 6 -- the trust line, the ranks 'of 77', the tie handling, the run record
with Copy. The doing side is a 3 -- I couldn't find yesterday's run with confidence, I couldn't
see the weight-meaning choice, and the comparison screen doesn't have a 'same measure, two
settings' case. Average it, 4."

## Would I use this instead of my current tool?

"For this exact task, no. It's 77 nodes. `betweenness_centrality(G)` and
`betweenness_centrality(G, weight='dist')` with `dist = 1/value`, merge two Series, sort by the
diff -- fifteen lines, and the notebook IS the run record. The tool would have to beat that."

"Where it would beat it: the colleague. She doesn't read notebooks. The run record with Copy, the
'Unweighted, directed' line on each side, and the scatter that tells you what it dropped -- I'd
send her a link to that instead of a notebook. So: not instead of my tool, but I'd use it as the
thing I hand over, if the run-vs-run comparison actually exists."

---

## Observer notes (not the participant's words)

- **Yesterday's result was hard to find.** The new-rail Les Miserables frame lists only "Bridges"
  under Results; betweenness appears only in the older rail's Results panel and as a table column.
  The participant settled on the table header as the source of truth.
- **The weight choice is not visible where it is made.** "Change..." and the Weight dropdown ("None
  for this run") are drawn closed. The distance-vs-similarity reading appears only after the fact,
  in the out-of-date review. For this participant that choice decides whether a weighted ranking is
  meaningful.
- **"Re-run" vs "Runs: Run 1, Run 2".** The out-of-date review's "Re-run" reads as overwrite; the
  Runs list reads as append. The participant could not tell which applies.
- **No run-vs-run comparison is drawn.** The comparison page covers two measures and two data
  versions; the picker's placeholder says "Find a result or run" but lists no second run of the
  same measure. The March/April noise caveat would be wrong copy for an option-only difference.
- **Two result inspectors disagree.** The results-panel page draws a result with "Runs 1 / Run 1 /
  Compare with..." rows; the inspector page draws the same result with "Compare with..." and "Show
  as style layer" buttons and "1 run this one, on the full graph". The run-and-read page draws it
  as a floating card instead. The participant noticed the layouts differ but did not dwell on it.
- **Strongest positives:** the trust line under the result title, the table's column-group headers
  carrying method and options, the run record with Copy, the tie-aware Spearman with both values,
  "Not plotted: ..." with a count, and "Weight: value, not used yet" on the Data panel.
- **Mock defect:** `screens/navigation.html` opened with `?study` and no frame renders blank.
