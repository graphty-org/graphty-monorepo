# Session: "who matters most to the story, and how sure" -- the Gephi holdout

Participant: Dr. Mara Lindqvist (fictional composite), associate professor of computational social
science, Gephi user since 0.8, teaches it every year, checks every number against NetworkX. Played
at 1440 by 900.

Moderator task, as given: "You have the Les Miserables co-appearance network open. Find the few
characters who matter most to how the story hangs together, and tell me how sure you are of their
order."

Screens used (participant view, design notes hidden; renders in shots/):
- the main window at rest, older right panel with "Statistics" (r6-mara-who-frame-at-rest.png)
- the main window at rest in the new layout (r6-mara-who-nav-new.png); the Results place in the
  rail (r6-mara-who-nav-new-results.png); a Betweenness run opened there (r6-mara-who-nav-new-run.png);
  Valjean selected (r6-mara-who-nav-new-node.png); the Data place (r6-mara-who-nav-new-data.png)
- the table under the graph with degree and betweenness ranked, Valjean selected
  (r6-mara-who-td-small.png); every row was read from the page
- Betweenness on the graph filtered to degree 2 or more, with its run record open
  (r6-mara-who-rp-filtered.png), and the same filtered run with Valjean selected, showing both
  runs' values on the node (r6-mara-who-rr-subset.png)
- closeness with Valjean filtered out, before and after the run (r6-mara-who-cv-b1.png,
  r6-mara-who-cv-b2.png)
- the Algorithms menu, finished Betweenness, "more in the table", the three-measure table, the
  run opened in the right panel, closeness WF-corrected, the compare menu, an unrun PageRank
  (r6-mara-who-rp-catalog.png, rp-finished, rp-in-the-table, td-ranked, ins-result, rp-variant,
  rp-compare-with, rr-rank, rr-done, rr-unrun). All of these are a protein network or a patent
  network, not Les Miserables.

Numbers she checked were compared, out of the session, against NetworkX 3.x
(`nx.les_miserables_graph()`): every Les Miserables value she read matched to the digits shown,
including the weighted closeness run (distance = 1/value, Wasserman-Faust, Valjean removed).

## Think-aloud

**At rest.** Les Miserables again. 77 nodes, 254 edges, density 0.0868, one component. Right.
The first screen I get still has the old right panel -- "Statistics", "Change overview..." -- and
the next one has "Overview" and a style stack. Two versions of the same window. I'll take the new
one.

Layout: "Force-directed". Still not a name. Which force? I'm not putting that map in a slide. For
this task I don't need the map, I need numbers, so I let it go -- again.

The table at rest: label, group, degree. Sorted by degree. Valjean 36, Gavroche 22, Marius 19,
Javert 17, Thenardier 16, Fantine 15. Those are the degrees. Fine. But "matters to how the story
hangs together" is not degree. That's brokerage. I want betweenness, and I want to know whether
it survives dropping the walk-on characters and whether it survives the weights.

**Where are the statistics.** Rail on the left: Graph, Data, Results, Notes. Results. In Gephi
it's the Statistics panel, on the right. Here it's a place. OK, click Results.

"Every run of a measure, with its settings and date." Two rows: Betweenness, today 14:02,
"Exact, normalized, no weight. Full graph, 77 nodes." Bridges, 27 Sep. Good -- last time this list
said only Bridges and the table had a betweenness column from nowhere. Now the run is here, and
the second line is the methods sentence. "Exact, normalized, no weight, full graph." I'd put that
in a paper.

And the table grew a betweenness column when I opened Results. It wasn't there at rest. So the
column shows up depending on which panel is open? Odd, but at least it's there when I need it.

Open the run. "Ran on the full graph, 77 nodes. No weight: every edge counts the same." Settings:
exact, every node; normalized yes; undirected; weight none; ran 29 Sep 2026, 14:02. Top nodes:
Valjean 0.57, Myriel 0.177, Gavroche 0.165. Table re-sorted by betweenness.

Valjean 0.57, Myriel 0.177, Gavroche 0.165, Marius 0.132, Fantine 0.13, Thenardier 0.075. Those
are NetworkX's numbers. Correct.

But "0.57" and "0.13" in a column next to "0.177" and "0.165". Same complaint as before. The other
table shows 0.570 and 0.130. I paste this column into a paper. Pick one precision.

**Valjean selected.** Right panel: Attributes -- group 2, degree 36. Results -- betweenness "0.57,
highest"; bridges "on no bridge". OK, results under Results. That's the separation I asked for.

Then the other table screen, same Valjean: Attributes -- group 2, degree 36, betweenness 0.57.
Betweenness under Attributes again. And the filtered screen, Valjean selected: Attributes --
betweenness 0.419 on 60 of 77, betweenness 0.57 on full graph, degree 36 on full graph, group 2.
So on one screen it's a Result, on two it's an Attribute. And degree sits under Attributes
everywhere, and degree is not in miserables.json -- the Data place says the file has "label,
group" on nodes. Degree was computed. So "Attributes" means "anything with a number", which is not
what I want the word to mean. In the Data Lab I at least know which columns Statistics wrote.

**The part I trust: the table.** Header: "Betweenness exact, unweighted, full graph." Degree
"(full graph)". Ranks with ties shared: Enjolras and Fantine both #6= on degree, all the zeros #35=
on betweenness -- 43 of them, which is right. And Brujon, Mme.Pontmercy, Magnon, Grantaire show
"0.000" but ranks #31 to #34, not #35=. So they're not zero, they're under 0.0005. NetworkX has
them at 0.0001 to 0.0004. The ranks are right; the display hides why. A student will ask me why
four "0.000" rows outrank the other "0.000" rows. Show one more digit or a "<0.001".

The line over the table: "Valjean is #1 on both measures. At #2 they part: Gavroche by degree,
Myriel by betweenness." Still the right sentence. That's the Myriel artefact in one line.

"Compare rankings..." -- on this Les Mis screen it goes nowhere I can follow. On the protein
screen it goes to a scatter. Not on my graph.

**The Myriel check.** Filter to degree >= 2. The chip says "Filtered: 60 of 77 characters". The
run: "on: filtered graph, 60 of 77 characters. After Filter to degree >= 2. Exact. Unweighted,
undirected." Top: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073. That's
NetworkX on the 60-node subgraph. Myriel is gone from the top five, as he should be. Edges 237 of
254 -- seventeen leaves, seventeen edges. Density 0.134. Correct.

And this I like: select Valjean on that screen and the right panel gives BOTH -- 0.419 "on 60 of
77, #1 of 60" and 0.57 "on full graph, #1 of 77". Two runs, each with its scope, on one node. In
Gephi the second run overwrites the first in the same column and you never know. That is the thing
I test every tool for, and it passes.

The run record: "Brandes betweenness, exact: every node is a source. Normalization: divided by
(n-1)(n-2)/2 = 1,711 node pairs; n = 60, the filtered graph." That's the formula. That's what I
want when a term is ambiguous -- the formula, not a tutorial.

Small thing: the filtered run is "Run 1, Sep 28 11:02" on one screen and "Run 2, Sep 29 10:14" on
the other, and the Results list I opened earlier had neither. I assume these are different
mock-ups; in a real project I'd want one list.

**The weights. The one that decides the order.** The Data place: "Edges: value, 254. Weight:
value, not used yet." Good, it knows. "Change..." on the filtered run next to "Weight: value, not
used yet." I click it in my head -- the screens don't show what it opens. So I still can't see how
I'd say "these are strengths, make them distances".

But then the closeness screen, same Les Mis: the Results list shows "Betweenness -- Distance = 1 /
value". There it is. Somebody ran betweenness with 1/value as the distance. That's the right
conversion for co-appearance counts. And the right panel reads "Weight: value, shared scenes, 1 to
31". Shared scenes -- Knuth counted chapters, not scenes, but fine.

So the conversion exists and it is printed on the run. What I haven't seen is where I choose it,
or what the choices are -- 1/value, max minus value, value as is. And this project's Results list
shows a weighted betweenness while the other Les Mis screens show an unweighted one, with no
weighted numbers anywhere. I know from NetworkX what happens: with 1/value as distance, Marius goes
to second, 0.499, and Gavroche drops out of the top five. That's the whole answer to "how sure are
you of the order", and I didn't get to see the tool show it to me on this graph.

**The closeness screen as a robustness check.** Valjean filtered out: 76 of 77, 218 of 254 edges,
7 components, 5 isolated. Correct -- thirty-six edges go with him. The Closeness tooltip before
the run: "7 components: each score is scaled by the share of the graph the node can reach
(Wasserman-Faust)." Good -- that's the correction, named, before I run it, on a disconnected
graph, which is exactly when plain closeness lies.

After: Javert 0.997, Enjolras 0.983, Courfeyrac 0.960, Marius 0.930, Combeferre 0.928. NetworkX,
distance 1/value, wf_improved: same, to three digits. Myriel 62nd -- also right. And the offer:
"Scaled for 7 components -- Harmonic centrality". Yes, that's what I'd tell a student to run next.

But: the column header says "closeness (WF-corrected), 0 to 0.997" and nothing about the distance
being 1/value. With 1/value distances closeness isn't bounded by one; 0.997 looks like a share and
it isn't. The run line in Results says "Distance = 1 / value"; the column doesn't. The column is
what gets exported.

And it's a nice question -- who holds the story once Valjean is gone: Javert and the barricade
students -- but it's closeness on a cut graph, not betweenness on the whole one. It doesn't answer
the order question; it tells me the rest of the order is soft.

**The tie line.** On the protein table: "Near tie: the next rank's value is within 1%, so a small
change in the data could swap them. '=' marks an exact tie." At least now it says what it means.
It's still somebody's rule of thumb. On Les Mis, Marius 0.132 and Fantine 0.130 are 1.8% apart and
not flagged, and I'd tell a reviewer they're interchangeable. The tool is honest about what 1%
means; it's my call whether 1% is the right line, and I'd set it at five.

**Triangulation.** I wanted PageRank on Les Mis. The Algorithms menu lists it, the unrun screen
shows damping 0.85 and direction before it runs -- good -- but every PageRank result I see is
patents or proteins. From memory: unweighted PageRank gives Valjean, Myriel, Gavroche, Marius,
Javert; weighted puts Marius second. I can't show that here.

The run opened in the right panel (protein): "Shortest paths counted hops; confidence was not
used." That's the plainest sentence in the whole tool. Same run, though, opens in the left panel on
the other screens. Where does a run live -- left or right? I read it in both and they say the same
thing, so I'll let it go.

## What I'd tell the moderator

Valjean holds the story together, and I'm certain of that: first on degree, first on betweenness
at about three times anyone else (0.570), and still first when you drop the one-scene characters
(0.419 on 60 of 77).

Behind him, a group rather than an order: Gavroche, Marius and Fantine, then Javert and
Thenardier. On the filtered graph it's Gavroche 0.172, Marius 0.164, Fantine 0.154 -- the first two
are 5% apart, which I'd call real but thin.

Myriel's second place on the full graph is the leaf artefact: seven walk-ons who only meet him.
Filter the degree-1 characters and he leaves the top five. I would not put him in the answer.

How sure: completely sure of Valjean. Not sure of the order behind him, and I can say why: the
edges carry co-appearance counts, and when those are used as closeness (1/value as distance)
Marius moves up to second and Gavroche falls back. The tool clearly can run that -- one screen
shows a betweenness run with "Distance = 1 / value" -- but I never saw its numbers on this graph,
nor where I choose the conversion. So the second-to-fourth order is conditional on a weighting
choice.

## Single Ease Question

5 out of 7.

Faster than last time. Results is a real place now and the run says "exact, normalized, no weight,
full graph" in its list. Every number was right, and the filtered screen that shows 0.419 on 60 and
0.57 on 77 on the same node is the best thing I've seen in a tool for this. I lose points because
betweenness is still a "Result" on one screen and an "Attribute" on two, degree is filed as an
attribute although the file doesn't have it, and the weighted run -- the one that decides the order
past Valjean -- appears only as a line of text, with no numbers on Les Mis and no form I could
choose it in.

## Would I use it instead of my current tool?

Not instead of Gephi. For this question -- rank the characters and say how sure -- it does what
Gephi can't: every run carries its scope and its formula, two runs of the same measure sit on one
node without overwriting each other, and it names Wasserman-Faust before it scales anything. That
earns a second session and a slot in the methods lab, where the filtered-run screen is the lesson.

For papers I'd still compute the ranking in NetworkX and use this to look at it, until I see the
weight conversion chosen in a form and its numbers on my graph, a named layout, and my GEXF open
with every attribute.

## Problems observed

1. **Betweenness still has no single home, and degree is filed as an attribute.** With Valjean
   selected, betweenness sits under Results on one screen (r6-mara-who-nav-new-node.png) and under
   Attributes on two (td-small, rr-subset; also the protein rr-rank). Degree is under Attributes
   everywhere, but the Data place lists the file's node columns as label and group only, so degree
   was computed. She could not use the heading to tell file columns from computed ones. Severity 3.
2. **The weight conversion is shown after the fact but never chosen or seen in numbers on Les
   Miserables.** One screen lists "Betweenness -- Distance = 1 / value"; the others say "Weight:
   value, not used yet. Change..." and the Change... target is not shown. She never saw where
   1/value is chosen, what the other choices are, or the weighted ranking, which is what moves
   Marius to second. Severity 3.
3. **Values that round to 0.000 carry distinct ranks.** Brujon, Mme.Pontmercy, Magnon and
   Grantaire show "0.000" at #31 to #34 while 43 true zeros share #35=. The ranks are correct but
   the display hides why; a student would read it as a bug. Severity 2.
4. **The weighted closeness column does not say its distance.** "closeness (WF-corrected), 0 to
   0.997" omits "distance = 1/value"; with that distance closeness is not bounded by one, so 0.997
   reads as a share when it is not. The run line says it; the exported column does not. Severity 2.
5. **Still no full-graph triangulation on Les Miserables.** PageRank, the three-measure table and
   the "Compare rankings..." scatter appear only on protein and patent data; on the Les Mis table
   "Compare rankings..." leads nowhere she could follow. Severity 2.
6. **The 1% near-tie line is now defined but remains a fixed rule of thumb.** It says what it means
   ("a small change in the data could swap them"), but Marius 0.132 and Fantine 0.130 (1.8% apart)
   are not flagged, and she would set the line herself. Severity 1.
7. **Same column, two number formats.** "0.57" and "0.13" beside "0.177" and "0.165" in one table
   and inspector; "0.570" and "0.130" in the other. Severity 1.
8. **The layout is still unnamed.** "Force-directed" does not say which algorithm or parameters.
   Severity 1.
9. **Mock inconsistencies she noticed.** The first screen shows the older right panel
   ("Statistics") while the rest show "Overview"; the same filtered run is "Run 1, Sep 28 11:02" on
   one screen and "Run 2, Sep 29 10:14" on another; the Results panel lists only what ran on one
   screen and carries a Catalog on another; a run opens in the left panel on some screens and in
   the right panel on another. Severity 1.

## What worked for her

- Counts, density, components, and the filtered and Valjean-removed edge counts all matched.
- Every Les Miserables value matched NetworkX, including weighted, WF-corrected closeness.
- Results is now a place, and the at-rest run list shows the betweenness run with "Exact,
  normalized, no weight. Full graph, 77 nodes."
- With the filter on, the selected node shows both runs, each with its scope and rank ("0.419, on
  60 of 77, #1 of 60"; "0.57, on full graph, #1 of 77") instead of one overwriting the other.
- The run record gives the formula: Brandes, exact, divided by (n-1)(n-2)/2 = 1,711 pairs, n = 60.
- Closeness names Wasserman-Faust before running on a disconnected graph and offers harmonic
  centrality after.
- The agreement line states the Myriel artefact in one sentence.
- "Shortest paths counted hops; confidence was not used." -- a run that says what it ignored.
