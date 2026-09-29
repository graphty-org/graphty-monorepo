# Session: "who matters most to the story, and how sure" -- the Gephi holdout

Participant: Dr. Mara Lindqvist (fictional composite), associate professor of computational social
science, Gephi user since 0.8, teaches it every year, checks every number against NetworkX. Played
at 1440 by 900.

Moderator task, as given: "You have the Les Miserables co-appearance network open. Find the few
characters who matter most to how the story hangs together, and tell me how sure you are of their
order."

Screens used (as the participant saw them, design notes hidden):
- the main window with Les Miserables at rest, old right panel with Statistics
  (shots/screens__frame-at-rest.png)
- the main window at rest in the new layout (shots/r4-mara-who-nav-new.png), its project menu
  (shots/r4-mara-who-nav-menu.png), and with Valjean selected, table sorted by betweenness
  (shots/r4-mara-who-nav-node.png)
- the table under the graph with degree and betweenness ranked, Valjean selected
  (shots/r4-mara-who-td-small.png); the full row list was read from the page
- the Betweenness result on Les Miserables after a filter to degree 2 or more, with its run record
  open (shots/r4-mara-who-rp-filtered.png)
- the Algorithms menu (shots/r4-mara-who-rp-catalog.png), the finished Betweenness result, its
  "more in the table" view, the node-selected, Louvain, closeness and options-editor states
  (shots/r4-mara-who-rp-finished.png, r4-mara-who-rp-in-the-table.png,
  r4-mara-who-rp-node-selected.png, r4-mara-who-rp-louvain.png, r4-mara-who-rp-variant.png,
  r4-mara-who-rp-editor.png). All of these are a protein network, not Les Miserables.
- a three-measure table (shots/r4-mara-who-td-ranked.png) and a selection state
  (shots/r4-mara-who-td-selected.png), a protein network and a payments network.

Numbers she checked were compared, out of the session, against NetworkX 3.1
(`nx.les_miserables_graph()`, unweighted): every value she read on the Les Miserables screens
matched to the digits shown.

## Think-aloud

**Frame at rest, first ten seconds.** Les Miserables. Fine, the Knuth co-appearance graph, I have
shown it to students more times than I can count. 77 nodes, 254 edges. Correct. Density 0.0868 --
that's 2 times 254 over 77 times 76, yes. One component, yes. Good, it didn't lose anything, I'll
keep going.

"Loaded: miserables.json, undirected, value not used yet." Right -- the edges carry the number of
chapters two characters share. Noted. That will matter. Everyone forgets that the weights are
there.

Layout says "Force-directed". Which one? Is that Force Atlas, Fruchterman-Reingold, something
homemade? I'm not reading positions off a layout I can't name. For this task I don't need the
picture to be right, I need the numbers, so I'll let it go -- but I would not put this map in a
slide.

The legend says "Group color": 2, 8, 4, 1, 3... Those are the `group` numbers from the file, not a
modularity class. Fine, at least it says "group". And the labels are "the 18 characters with the
most connections." So the labels are a degree ranking already. OK.

**What does "hangs together" mean.** Before I click anything: "matters most to how the story hangs
together" is not degree. Degree is who has the most scenes. Hanging together is brokerage --
betweenness -- and I'd want to see whether it survives weighting and whether it's just Myriel's
bishop chapter again. Everyone who has taught this graph knows the Myriel artefact: seven
characters who appear once, only with Myriel, and they inflate his betweenness.

**Where do statistics live?** In Gephi it's the Statistics panel on the right of Overview. Here
the old frame has "Statistics" on the right, but it's an overview, not a list of things to run.
The new layout (nav-new): right panel says Co-appearances, Graph; Overview; Style stack; Results
with one row, "Bridges done". So somebody ran bridges. Where's betweenness? Not in Results.

But the table at the bottom... in the new layout at rest it's label, group, degree. With Valjean
selected (nav-node) the table has a betweenness column, "Sorted by betweenness", and on the right,
under Results, "betweenness 0.57, highest". So betweenness HAS been run. Then why did Results, one
screen earlier, only list Bridges? Either Results lies at rest, or that betweenness column came
from somewhere else. I actually stopped here. That's the question I ask of every column: is this
from my file, or did you compute it, and on what?

And then the other table (td-small), same graph, same Valjean: the right panel lists betweenness
0.57 under "Attributes", next to group and degree. Attributes is where the file's columns go. So
is it in the file? In nav-node it's under Results. Same number, same node, two homes. I don't like
that. In Gephi at least it's always a column in the Data Lab and you know Statistics wrote it.

**The table, which is the part I trust.** OK, td-small. This is the Data Laboratory, more or
less. Header: "Betweenness exact, unweighted, full graph." Good. That's the sentence I need in a
methods section: exact, unweighted, full graph. Degree header says "degree (full graph)". Good --
that's precisely the thing Gephi never tells you, that you ran it under a filter.

Reading it. Valjean 0.570, #1. Myriel 0.177, #2. Gavroche 0.165, #3. Marius 0.132, #4. Fantine
0.130, #5. Thenardier 0.075, #6. Javert 0.054, #7. Mlle.Gillenormand 0.048, #8.

Those are the NetworkX numbers. Valjean 0.5699, Myriel 0.1768, Gavroche 0.1651, Marius 0.1320,
Fantine 0.1296. I know these; they are in every notebook I've graded. So the arithmetic is right,
and normalized the NetworkX way.

And the line over the table: "Valjean is #1 on both measures. At #2 they part: Gavroche by degree,
Myriel by betweenness." That is... actually the right sentence. That is the Myriel artefact, stated
in one line, without me having to sort twice. I'd have sorted twice in Gephi. Fine, that's good.

Ranks: the zeros all share a rank, "#35=". Right, 43 characters with zero betweenness, they're all
tied, so they are not "#77". Gephi doesn't do that. Good.

"Compare rankings..." -- I'd click it. The mocks I have don't show where it goes. Dead end for me.

**How sure of the order.** The moderator's real question. Betweenness is exact here, so there's
no sampling error -- rerun it and you get the same number. The uncertainty isn't the computation,
it's the choices:

1. Unweighted. The file has co-appearance counts. Marius and Cosette share a lot of chapters;
   weighted, the order moves. Where do I switch weight on? Right panel (filtered state): "Weight:
   value, not used yet. Change..." OK, so it knows. And the options editor I found (protein
   network, but same form): Scope, Weight -- a dropdown with an attribute name. That's all. For
   betweenness a weight is a DISTANCE. Co-appearance counts are a strength -- more chapters,
   closer. If the tool feeds counts straight in as distances, Valjean's strongest ties become his
   longest paths and the ranking is nonsense. The run record has a "Weight conversion" row, which
   tells me someone thought about it, but I can't see how I'd choose it in the form, and the
   Louvain record says "used as similarity" without saying what betweenness would do. I would not
   trust a weighted betweenness from this until I saw that row filled in, and I'd check it against
   NetworkX with `1/weight` as distance.

2. The leaf artefact. The filtered run answers that, and I like how. "on: filtered graph, 60
   nodes, 1 component", Scope "Filtered graph, 60 of 77", and the run record: "n = 60, the
   filtered graph", "after Filter to degree >= 2". That is exactly what Gephi hides from my
   students. There: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073.
   Myriel is gone from the top five, as he should be. That's my second-order check, done in one
   screen.

   But -- it says "Weight: value, not used yet" in the state line and "Weight: None for this run"
   under Options. Two sentences for one fact. I'll allow it; they don't contradict.

   And the Betweenness color layer is "not shown" -- fine, I kept group colour. I'd rather that
   than a tool that repaints my graph because I ran a statistic.

3. The "1% tie line". "Every step in the top 5 is over the 1% tie line; the smallest, ranks 2 and
   3, is 4.7%." One percent of what, and says who? That's a rule of thumb somebody invented. On an
   exact computation there's no noise, so a 1% gap is a real gap; the tie line is a judgement about
   how much a difference MEANS, which is my job, not the tool's. On the full graph Marius 0.132 and
   Fantine 0.130 are 1.8% apart. The tool would call that "over the tie line", and I would tell a
   reviewer those two are interchangeable. So I read the numbers and ignore the sentence. At least
   it prints the numbers next to it.

**Other measures.** I wanted PageRank and closeness on Les Mis for a triangulation. The Algorithms
menu (main menu, Algorithms, Centrality) has Betweenness, Closeness "WF-corrected", Eigenvector,
Harmonic, HITS, Katz, PageRank. Fine, that's a proper list with the names I use. "WF-corrected" --
Wasserman-Faust, the tooltip explains it and says rank changes. Good, that's a real answer. But
every one of these result screens is the protein network; I never saw PageRank on Les Mis, so I
can't tell you whether PageRank agrees. From memory: unweighted PageRank gives Valjean, Myriel,
Gavroche, Marius, Javert. Weighted puts Marius second. The three-measure table in the protein mock
has an agreement line across three measures -- if that works on Les Mis it would tell me that in
one line. I'd want it.

Also the right panel's "+" is "Run a method" on one screen and "Run a measure" on another. Pick
one.

**Precision.** The nav-node table shows 0.57, 0.177, 0.165, 0.132, 0.13, 0.075. "0.13" and
"0.177" in the same column. The other table shows 0.570 and 0.130. Same column, two formats,
depending on which screen. It's small, but it's the column I'd paste into a paper.

## What I'd tell the moderator

The characters who hold the story together are Valjean, clearly first -- about three times anyone
else on betweenness, and first on degree too; I'm certain of that on any measure. Behind him,
Gavroche and Marius are solidly in the top group: second and third by degree, third and fourth by
betweenness, and they stay near the top when you drop the one-scene characters. Fantine belongs
with them on brokerage -- she's the bridge from the first volume -- and Javert and Thenardier are
next.

Myriel shows up second by betweenness, but that's an artefact of seven walk-on characters who only
meet him; filter out the degree-1 characters and he drops out of the top five. I would not put
him in the answer.

How sure: Valjean first, completely sure. The next three (Gavroche, Marius, Fantine) are a group,
not an order: Gavroche over Marius holds on degree and betweenness, but Marius over Fantine is
0.132 against 0.130, which I'd call a tie. And I haven't seen the weighted run, which I know from
NetworkX moves Marius up, so the order within that group depends on a weight choice this tool
didn't show me how it would make.

The tool got me there. Every Les Mis number matched what I know from NetworkX, and the one-line
"at #2 they part" plus the filtered run's scope line did the checking I normally do by hand.

## Single Ease Question

5 out of 7.

The table was quick, the numbers were right, and the scope in the headers and run record is
better than Gephi. It loses two points because I spent real time working out whether betweenness
was a file attribute or a result -- it's in Attributes on one screen, in Results on another, and
missing from the Results list at rest -- and because I couldn't see how a weighted run would treat
the co-appearance counts, which is the one thing that decides the order past Valjean.

## Would I use it instead of my current tool?

Not instead of Gephi. For this job -- rank the characters and say how sure -- it did the thing
Gephi never does: every column says "exact, unweighted, full graph", the filtered run says "60 of
77" and names the filter step, and the agreement line tells me where two rankings part. That earns
it a second session, and I might use it in the methods lab to show students why a statistic under
a filter is a different statistic.

But I haven't seen it open my GEXF, I don't know what "Force-directed" is, I haven't seen an SVG
export with a legend, and I can't yet see how it converts a weight for a path-based measure. Until
it shows me that last one I'd compute the ranking in NetworkX and use this to look at it.

## Problems observed

1. **Betweenness has no single home.** With Valjean selected, betweenness 0.57 sits under
   Attributes (td-small) on one screen and under Results ("0.57, highest") on another (nav-node);
   and at rest the Results list shows only "Bridges done" although the table carries a
   betweenness column. She could not tell whether the value came from the file or from a run, and
   on what scope, which is the first thing she checks. Severity 3 (of 4).
2. **No visible way to say how a weight is converted for a path measure.** The options editor
   offers only Scope and a Weight attribute; the run record has a "Weight conversion" row but the
   form does not show where it is chosen. For co-appearance counts on betweenness this decides
   the ranking below #1. Severity 3.
3. **The "1% tie line" is an unexplained rule of thumb.** On an exact run it is a judgement about
   meaning, not error, and it would call Marius (0.132) and Fantine (0.130) distinct. She ignored
   the sentence and read the numbers. Severity 2.
4. **The Les Miserables result was never shown on the full graph.** Only the filtered run appears
   as a result on Les Mis; every full-graph result state, the three-measure table, the
   node-selected state and the options editor are a protein network, and "Compare rankings..." has
   no destination in these screens. She could not triangulate with PageRank on the graph she was
   asked about. Severity 2.
5. **Same column, two number formats.** Betweenness shows "0.13" beside "0.177" in one table and
   "0.130" in the other. Severity 1.
6. **The layout is unnamed.** "Force-directed" does not say which algorithm or parameters; she
   would not put the map in a slide. Not central to this task. Severity 1.
7. **One button, two names.** The right panel's add button under Results is "Run a method" on one
   screen and "Run a measure" on another. Severity 1.

## What worked for her

- Counts, density and components matched her memory of the file on the first screen.
- Every Les Miserables centrality value matched NetworkX to the digits shown.
- Column headers that name method, weighting and scope ("Betweenness exact, unweighted, full
  graph"; "degree (full graph)").
- The agreement line ("Valjean is #1 on both measures. At #2 they part: Gavroche by degree, Myriel
  by betweenness.") stated the Myriel artefact without a second sort.
- Tied zero values share a rank (#35=) instead of being ordered arbitrarily.
- The filtered run names its scope in three places, including n = 60 in the normalization and the
  filter step that produced it -- the opposite of Gephi's silent visible-graph statistics.
- Running a measure did not repaint her graph; the new colour layer waited, "not shown".
