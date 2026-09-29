# Session: rank again with one thing changed, and say what differs -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional), associate professor of computational social
science, Gephi since 0.8, NetworkX for anything reproducible. See ../../personas/gephi-holdout.md.

**Task, as the moderator gave it:** "Yesterday you ranked the Les Miserables characters one way. A
colleague asks you to rank them again with one thing changed, and to tell her what differs between
the two rankings and how each was made." (Repeated from round 5, wording unchanged.)

**What the task tests:** whether a second run of the same measure, with one option changed, sits
beside the first instead of overwriting it; whether the two can be compared; and whether each
run's method and settings can be read and handed on.

**Screens, in order:** the navigation page (screens/navigation.html: the new layout at rest, the
Results rail place listing runs, and one run opened in place); the results panel
(screens/results-panel.html: the filtered Les Miserables run with its run record open, the
running state with a changed option, Compare with... open on a run, the result sent to the
table); the comparison page (screens/comparison.html: the two measures section, the two data
versions section, and the row of smaller states, including "two runs of one measure" and
"getting here"); the bottom dock table (screens/table-dock.html: the ranked table and the column
header states). Viewed at 1440 x 900, participant view.

**Renders she saw:** shots/screens__navigation-frame-new-results--study.png,
shots/screens__navigation-frame-new-run--study.png, shots/screens__results-panel-filtered--study.png,
shots/screens__results-panel-running--study.png, shots/screens__results-panel--compare-with.png,
shots/screens__results-panel-in-the-table--study.png, shots/screens__comparison--study.png,
shots/r6-mara-tworuns-comparison-full.png (the whole comparison page, including the row of
smaller states), shots/screens__table-dock-ranked--study.png,
shots/screens__table-dock-header--study.png, and full-page participant renders of the other three
pages (shots/r6-mara-tworuns-navigation-full.png, shots/r6-mara-tworuns-results-panel-full.png,
shots/r6-mara-tworuns-table-dock-full.png). She had a Jupyter notebook open beside the mocks, as
she always does when a tool shows her a number, with NetworkX's Les Miserables graph loaded.

---

## Think-aloud transcript

**Same change as last time.** Yesterday: betweenness, whole co-appearance graph, unweighted. The
one thing I change is the weight. The edges carry `value`, the number of chapters two characters
share, and unweighted betweenness treats Valjean and Cosette the same as two people who pass in
one scene. So: same measure, same graph, weight on. And the same trap as always. Betweenness
needs a length. A co-appearance count is a strength. Somebody has to turn one into the other,
and whoever does it decides the answer.

I did it myself this morning so I know what I am looking for. `1/value` as the distance: Valjean
still first, 0.79 now; Marius jumps to second at 0.50; Gavroche falls from third to seventh.
Spearman against the unweighted run 0.75, Kendall's tau 0.68. And the zero block grows, 43
characters at zero unweighted, 54 weighted. So whatever this tool shows me, those are the numbers
it should land near if it uses the reciprocal, and it should tell me if it does something else.

**Finding yesterday's run.** The new layout. Left rail: Graph, Data, Results, Notes. I click
Results. "Every run of a measure, with its settings and date. Newest first." Then "Betweenness,
today 14:02 -- Exact, normalized, no weight. Full graph, 77 nodes." and "Bridges, 27 Sep".

Good. Last time I thought my run had vanished overnight in this layout. Now it is there, with the
settings on the row. And the table at the bottom has a betweenness column, 0 to 0.57, Valjean
0.57, Gavroche 0.165, Marius 0.132, Fantine 0.13, Thenardier 0.075, Javert 0.054. I check them
against the notebook. They match NetworkX's normalized values to the last digit shown. 77 nodes,
254 edges. Fine. I trust the graph.

So the Data Lab has a column, and there is a list of runs. That is "Statistics" and "Data
Laboratory" in my words, and the mapping is clean enough.

**Opening the run.** I click the Betweenness row. It opens in place: "Ran on the full graph, 77
nodes. No weight: every edge counts the same." Then Settings: method exact, every node;
normalized yes; edges undirected; weight none; ran 29 Sep 2026, 14:02. Then two buttons, Re-run
and Compare with..., then top nodes: Valjean 0.57, Myriel 0.177, Gavroche 0.165.

"No weight: every edge counts the same." That is a sentence I can put in a methods section. Good.

Now I want the weighted run. There is "Re-run". But I don't want the same run again, I want it
with the weight. Does Re-run open the settings first, or does it just go? On this page I cannot
tell. There is no weight control on this record at all, just the word "none". In Gephi the
Statistics "Run" button opens the parameter dialog every time, which is annoying and at least
predictable.

**Where the weight is changed.** I go to the results panel page, the Les Mis state -- it is a
filtered one, 60 of 77, not mine, but it is the only Les Mis state drawn. Here the state line
says "Weight: value, not used yet. Change..." I like that line as much as I did last time. It
knows `value` is there and it says, plainly, that it did not use it.

I click "Change...". Nothing. Still nothing, same as last round. And this link is the entire task.
The one thing I am changing is behind a control that does nothing in any of these pages.

There is an Options section lower down with an icon, Scope and Weight "None for this run". The
patent PageRank state shows what that icon opens for damping: the new value is held, "Run 2
running, keeps Run 1". So I understand the mechanism: change an option, run, and the old run
stays as Run 1. That was the best thing on these screens last round and it still is. What I do not
see, anywhere, for betweenness: the Weight dropdown with `value` in it, and what it says it will
do with `value`. Similarity? Distance? One over it? That line is what my colleague will ask me
first.

**Checking the run record.** I open Details on the filtered Les Mis run. Method: "Brandes
betweenness, exact: every node is a source." Normalization: "Divided by (n-1)(n-2)/2 = 1,711 node
pairs; n = 60." That is 59 times 58 over 2, and it is NetworkX's normalization for an undirected
graph. Weight conversion: "None: value not used." Scope: "Filtered graph, 60 of 77: after Filter to
degree >= 2." Engine WebGPU, took 0.1 s. Copy button.

This is better than anything Gephi gives me. The Gephi statistics report is a chart and a
citation. This is a paragraph I can paste.

I check the filtered numbers in the notebook, since the filter is written out. Degree at least 2:
60 nodes, 237 edges, one component. Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154,
Javert 0.073. All match.

Then "zero: 32 nodes, all 29=". The notebook says 28 at zero, not 32.

Hm. Let me look at the full graph too. The betweenness column header in the table page has a
histogram popover: "77 nodes, 47 at 0." The notebook says 43. Four too many, both times.

No. That is wrong. The top values are right, so I don't think the algorithm is wrong; I think
whatever counts "zero" is counting something that isn't zero -- maybe everything that rounds to
zero at three places. But I cannot tell, and this is not a cosmetic number. The whole comparison
screen is built on "leaving out the accounts tied at the bottom of both". If the tie block is the
wrong size, the headline Spearman is computed over the wrong set. And "all 29=" is the rank those
characters get in the CSV I would send. With 28 at zero they would be 33=.

I note it and keep going, because the rest of the task is about the comparison, but I would not
send a table with that rank column in it.

**Comparing the two runs.** Compare with... on a run. The patent page shows the picker: "Earlier
runs of PageRank" first, then "Other runs on this graph", then "The same run on another data
version...". Yes. That is exactly the order I would want. For me it would say "Earlier runs of
Betweenness: Betweenness, no weight, today 14:02".

And this time the page has the comparison I asked about: in the row of small states at the
bottom of the comparison page, "PageRank at damping 0.85 and 0.5". The sides are named "Damping
0.85" and "Damping 0.5", not Run 1 and Run 2, not A and B. The difference list's switch says
"Ranked higher at: Damping 0.85 / Damping 0.5" and the columns are "0.85" and "0.5". That is what
I asked for last round and they did it. For me it would read "No weight" and "Weight: value", and
I would never have to open Details to remember which axis is which.

Then I read the small print under the names. "Damping 0.85 -- PageRank run 2." "Damping 0.5 --
PageRank run 1."

Wait. On the results panel page it is the other way round: "Run 1, damping 0.85, shown. Run 2,
damping 0.5, running." Same graph, same two runs. And the "getting here" picker on this very
comparison page says "PageRank, damping 0.5 -- Run 1". So which one ran first? If I cannot trust
the run number, I cannot trust "keeps Run 1", which is the feature I liked most. In a methods
paragraph I would write "the first run used 0.85". Somebody here says it didn't.

And the Agreement box: "Spearman 0.998, leaving out the 1,153 accounts tied at the bottom of both
(1.000 with them)." 1,153. That is the same number as the PageRank-against-betweenness comparison
at the top of the page. Two PageRank runs share exactly the betweenness tie block? I doubt it.
Looks copied. On a mock that's forgivable; it is the kind of thing that, in a real tool, would
make me recompute everything by hand.

Still no Kendall. The page's own rule, a tie over 10% of a side drawn as a band, says the ties are
big here -- 1,153 of 3,093 is over a third. With that many ties Kendall's tau-b is what a reviewer
asks for. For Les Mis weighted versus unweighted, more than half the characters sit at zero. I
want tau-b beside Spearman, and I asked last time.

What the drawn comparison does give me for the colleague's email: the overlap line (on the big
scatter, "49 of the top 50 in both"), Top 5/10/20/50/100 written out, the movers list with ranks on
both sides, and a Details link per side that opens the run record with Copy. That is "what
differs" and "how each was made". The pieces are all on the page.

**Getting there from the result.** The "getting here" strip on the comparison page draws Compare
with... as the first button under the result's name, in a right-panel list of runs. The results
panel draws it at the bottom under "Runs of this measure". The navigation page draws it next to
Re-run, in the left panel. Three pages, three places. Last round I asked which one is the product.
Now there are three answers.

**The table.** The ranked table names every column by its run: "PageRank damping 0.85,
unweighted, full graph", with a rank column beside it. So I assume a weighted betweenness run
would come in as its own column, "Betweenness exact, weight: value, full graph", next to the
unweighted one. Nothing shows two runs of the same measure as two columns. The results panel
sends a result to the table as "betweenness, exact, full graph" with "PageRank's columns beside
it" -- two measures again. I would bet on two columns. I'd still be betting.

**What I would send her, if the missing pieces behave as I guess.** "Unweighted betweenness
(Brandes, exact, normalized by (n-1)(n-2)/2, hops counted) against betweenness weighted by
co-appearance count (value turned into a length by ___). Top 10 overlap: __ of 10. Spearman __
without the tied zeros, __ with them. Biggest movers: Marius up to 2nd, Gavroche down to 7th."
The movers I can get from the comparison. The conversion I still can't. And I would have to
recount the zeros myself before I believed the Spearman.

---

**Single Ease Question (1 = very difficult, 7 = very easy):** 3.

"Three. It went down, and not because they did less. They did what I asked: my run is kept, the
two runs of one measure are drawn and named by what differs, the picker puts the earlier run
first. But I checked the numbers, which is what I do, and the zero count is wrong on both Les Mis
states, and the two pages disagree about which run was Run 1. The Change... link next to the
weight, the one thing the task is about, still does nothing. And I still have not seen what it
does with a co-appearance count on a shortest-path measure. Last round I got there by assuming.
This round I got there by assuming and then finding two numbers I don't believe."

**Would she use this instead of her current tool?** "No. For this task, NetworkX: two calls, one
with `1/value` as the distance, `spearmanr`, `kendalltau`, count the zeros, ten lines, and I know
what every number is. I would open this comparison screen in class -- the scatter with the tie
band and the movers list teaches the idea better than two printed lists -- but only once the tie
count agrees with NetworkX and the run record says how a weight becomes a length. A wrong tie
count on a ranking screen is not a small bug. It is the number the whole screen is built on."

---

## Moderator notes

- **Choice of change:** weight by co-appearance count (`value`), same as round 5. Before opening
  anything she ran it in NetworkX with `1/value` as distance and quoted Spearman 0.75, Kendall 0.68,
  and 43 zero-betweenness characters unweighted against 54 weighted.
- **Fixed since round 5, and she noticed:** yesterday's run is listed on the Results rail place
  with its settings and date, and the at-rest table carries its betweenness column. The round-5
  scare that the run had been lost overnight did not recur.
- **Fixed since round 5, and she noticed:** two runs of one measure are drawn, with each side and
  the difference list named by the option that differs ("Damping 0.85" / "Damping 0.5"). She said
  this was exactly her round-5 request.
- **Numbers she checked and found wrong:** the zero counts. The filtered Les Mis run says "zero: 32
  nodes, all 29=" (screens/results-panel.html); NetworkX gives 28 at zero on the degree >= 2 graph
  (60 nodes, 237 edges), so the tie rank would be 33=. The table's betweenness header popover says
  "77 nodes, 47 at 0" (screens/table-dock.html); NetworkX gives 43. The top values on both match.
  She tied this directly to the comparison's "leaving out the tied" Spearman and to the rank column
  in an export, and it is why her score dropped.
- **Numbers she checked and found right:** the full-graph betweenness column (Valjean 0.57 through
  Javert 0.054), 77 nodes and 254 edges, the filtered top 5, and the normalization line (1,711
  node pairs for n = 60).
- **Run numbering contradicts itself:** the results panel says Run 1 is damping 0.85 and Run 2 is
  damping 0.5; the comparison page's two-runs state says damping 0.85 is "PageRank run 2" and 0.5
  is "run 1", and its "getting here" picker lists "PageRank, damping 0.5 -- Run 1". She read this
  as undermining "keeps Run 1".
- **Suspect repeated number:** the two-runs state's "1,153 accounts tied at the bottom of both" is
  the same count as the PageRank-against-betweenness comparison. She read it as copied.
- **Still missing from round 5:** "Change..." next to Weight is unwired on every state; no mock
  shows the Weight choice for betweenness or a filled "Weight conversion" row for a shortest-path
  measure; Kendall tau-b does not appear on any comparison although the decision log proposes it as
  the headline when ties exceed 10% of a side (the two-runs state has over a third tied); no mock
  shows two runs of the same measure as two table columns.
- **Compare with... placement:** now three places across three pages (bottom of the results panel
  under Runs; beside Re-run on the navigation page's opened run; first button under the result's
  name in a right-panel runs list on the comparison page's "getting here" state). The comparison
  page's right-panel runs list also contradicts the Results rail place the navigation page shows.
- **Re-run ambiguity:** the navigation page's opened run offers "Re-run" with no weight control
  and no "(keeps Run 1)"; she could not tell whether it would open settings or repeat the run
  unchanged.
- **Unwired controls she tried:** "Change..." next to Weight.
