# Session: the 200 most in-between patents, past the drawing limit -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional), associate professor of computational social
science, Gephi since 0.8, NetworkX for anything Gephi cannot do. See ../../personas/gephi-holdout.md.

**Task, as the moderator gave it:** "This citation graph is too big to draw. Find the 200 patents
that sit most in between, then look at who surrounds the first one."

**Screens, in order:** the not-drawn patent graph and its filter steps
(screens/past-drawing-limit.html: not drawn, Narrow the graph, Keep top rows, the rule editor with
its three insets, kept and drawn, the two-step neighbors sample); the Algorithms menu
(screens/results-panel.html, catalog); the cost form (screens/option-form-cost.html: over the time
limit, running the largest sample that fits, a larger sample past the limit); the Results panel
refused and finished sampled with its run record, and a finished run opened in the table
(screens/results-panel.html); the table dock with a set column and with ranked measures
(screens/table-dock.html); Find with a patent selected (screens/find.html, state 7). All at
1440 x 900 in the participant view.

**Renders she saw:** shots/r4-mara-top200-pdl-not-drawn.png, shots/r4-mara-top200-pdl-narrow.png,
shots/r4-mara-top200-pdl-keep.png, shots/r4-mara-top200-pdl-rule.png,
shots/r4-mara-top200-pdl-rule-insets.png, shots/r4-mara-top200-pdl-kept.png,
shots/r4-mara-top200-pdl-sample.png, shots/r4-mara-top200-rp-catalog.png,
shots/r4-mara-top200-ofc-over-budget.png, shots/r4-mara-top200-ofc-within-budget.png,
shots/r4-mara-top200-ofc-sample-over-budget.png, shots/r4-mara-top200-rp-refused.png,
shots/r4-mara-top200-rp-finished-sampled.png, shots/r4-mara-top200-rp-in-the-table.png,
shots/r4-mara-top200-td-limit.png, shots/r4-mara-top200-td-ranked.png,
shots/r4-mara-top200-find-s7.png.

---

## Think-aloud transcript

**Reading the task.** "Sit most in between" is betweenness. In Gephi I would press Network
Diameter in the Statistics panel, because that is where betweenness lives -- which I tell my
students every year is a stupid place for it -- and on 124 thousand nodes it would sit there with
the progress bar at 0 percent until I killed it. So my real workflow would be NetworkX,
`betweenness_centrality(G, k=...)` with a sample, write a GEXF, open it in Gephi, filter by the
attribute. Let us see if this saves me the round trip.

**The patent graph, not drawn.** "124,318 nodes not drawn. More than this browser draws at once
(50,000). Every node is counted in Statistics and listed in the table." Honestly -- that is better
than Gephi. Gephi would try to draw it and freeze my Mac. And there is a table under the canvas,
sortable, with the patent number, year, category. That is my Data Laboratory, and it is not hidden
on another tab. Good. Statistics on the right: nodes, edges, density, isolates, weak components
with the giant one at 94 percent. That is the first minute of my lab handout, done for me.

The text is small. The table header "patent number" and "1999 to 2001" under the column names are
grey and tiny; I would be bumping the font on the projector.

One thing I notice immediately, because I always look at the degree distribution: the in-degree
plot says "max 236". The table's citationsReceived column goes up to 779. So citationsReceived is
not in-degree in this graph. I assume it counts citations from outside the 1999 to 2001 window --
but nowhere does it say that. A student would think the tool has a bug. I would think the tool has
a bug, until I thought about it for a minute.

**Narrow the graph...** It offers "Keep top rows by citationsReceived" and "Neighbors of a node".
Keep top rows by citationsReceived is not what I was asked; that is most cited, not most in
between. I know the difference. Half my students would not, and this is the first thing offered to
them in bold. I close it. I need betweenness first.

**Finding betweenness.** There is a lightning bolt in the toolbar; no idea what it is. I go to the
hamburger menu, Algorithms, Centrality, Betweenness -- first in the list. Fine, easier than Gephi's
Network Diameter. (The menu I was shown was on a protein graph, not my patents, which confused me
for a second -- different graph name at the top. I assume it is the same menu.)

**The cost warning.** "Betweenness. Takes hours. The time limit is 30 seconds. Directed, on the
full graph: 124,318 nodes." Then choices: Sampled, 101 sources, under a minute; Exact, on 5,318
nodes, under a minute; Sampled 500 sources, a few minutes; Exact on the full graph, hours.

This is the part I like most so far. Gephi would just start and not tell me it takes hours. This
tells me, and it gives me the NetworkX `k` parameter as a list. I know what "sampled, 101 sources"
means -- it is Brandes with k pivots. My students will not; "sources" means nothing to them.

"Exact, on 5,318 nodes" -- which 5,318? I scroll my eyes left and see "Drug patents granted in 2..."
with 5,318 in Sets and paths. So it is betweenness on a subgraph. That is not "exact" anything for
my question; it is a different graph. If a student picked that because the word "exact" sounds
safer, they would publish betweenness on the drug subgraph as betweenness in the citation network.
The row should say what it is computed on, in the row.

Also: why 101? Not 100. It is the largest that fits the limit, it says. Fine. I would pick 500 --
a few minutes is nothing, I let Gephi run over lunch -- and the form says that 500 runs "in the
background, past the 30-second limit". Good, it lets me. But on the screen I actually have, the
default is 101, so that is what most people will run.

**Directed or not.** Here is where I stop. The cost form says "Directed". The Options in the
finished result say "Direction: Directed", and the summary line says "Directed. WebGPU." Then I open
Details, the run record, which is a lovely thing -- seed, error bound, method, normalization -- and
it says "Direction: Citations read as undirected", and normalization "divided by (n-1)(n-2)/2, the
node pairs of an undirected graph". And the refused screen said "the directed citations read as
undirected" too.

So which is it? On a citation network this matters a lot. Directed betweenness on a citation DAG
is near zero for most patents -- nobody can be "between" unless they both cite and are cited
inside the window. The distribution line says 79,554 nodes are zero -- that is about two thirds,
which smells like directed. The normalization says undirected. I cannot write the methods sentence.
In Gephi at least the Network Diameter dialog has a Directed / Undirected radio button and the
column is whatever I chose. This is the exact thing that makes me drop a tool: a number that does
not say what it was computed on -- or worse, says two things.

**The finished sampled result.** Top nodes: #1 5879702 at about 0.0160, #2 5902311 at about 0.0037,
then three rows all labelled "#3-#7". "Ranks below #2 may swap between runs." The header says
"rank, low-high patent" -- I read that three times; I think it means the rank range, low to high,
then the patent. It reads like a typo.

I appreciate that it admits the uncertainty; Gephi never does. But the question was the top 200,
not the top 2. If ranks 3 to 7 are already tied inside the error bound, what is rank 200? With 101
sources and two thirds of the graph at zero, my guess is that rank 200 is somewhere in a big flat
pile of tiny estimates and the cut is basically random. The panel does not tell me that, and it is
the one thing I would need to know before I say "these are the 200". I would rerun with a
different seed and compare the two lists. There is a "Compare with..." under Runs -- I think that
is for this, but I am guessing.

**The first one.** #1 is 5879702, and at 0.016 against 0.0037 for #2 it is clearly first. That, at
least, I would trust. Good -- "the first one" is solid even if the 200 is not.

**Getting the 200.** "124,313 more in the table" -- I click it. On the protein example the table
sorts by betweenness with rank columns and the other measures beside it, and the column header says
"exact, full graph" under the measure. That subtitle is exactly what I asked for a minute ago. On my
patents I expect it would say "sampled, full graph" -- and hopefully a direction.

Then Keep top rows... on the table. The editor says keep the first N rows "in the table's order",
with a dropdown that says citationsReceived. I am assuming that once the table is sorted by
betweenness, that dropdown says betweenness. I did not see that screen, only the citations one. I
type 200. It tells me where row 200 falls and whether it will draw: "Row 200 has citationsReceived
358; 1 more patent also has 358 and is left out." That is careful -- Gephi's top-N filter never
tells me about ties -- but for a sampled estimate it is the wrong worry. The honest sentence would
be "rows 150 to 260 are within the error bound of row 200".

"200 nodes, 288 edges, will draw." Keep these 200 rows. Then it draws, with ForceAtlas2 on WebGPU
offered in the right panel. The statistics box says "Describes the 200 most cited patents, not a
random sample. Density reads high." I like that it warns me the statistics now describe the subset.
That is precisely the Gephi trap where Modularity runs on the filtered graph without saying so. Here
it says so. That is worth something to me.

The drawing of the 200 is a scatter of small pieces -- 21 components, 16 isolates. Of course: top
patents by anything do not cite each other much. It will not be a pretty map. That is the data, not
the tool.

**Who surrounds the first one.** Two ways offered. On the node itself: I found 6117075 in Find and
the inspector has a little forked icon and a funnel at the top, no labels. I hovered: "Select
neighbors" on one; I am guessing the funnel is "Filter to neighbors". Icons without words -- my
students will not find them. The other way is Narrow the graph, "Neighbors of a node", around a
patent, 1 hop, both directions: "242 nodes, 348 edges, will draw". That is my Ego Network filter
from Gephi, with the depth and the direction as dropdowns. I know that one. Good.

Now, the question I cannot answer from these screens: if I already have the "keep 200" step and add
"Neighbors of a node" around 5879702, do I get its neighbors among the 200 -- which would be almost
none -- or its neighbors in the full graph? The editor says "Scope: Full graph, no steps above",
but that is when there are no steps above. In Gephi the ego filter inside a filter chain reads only
what the parent passes through. I would expect the same here and get the wrong answer, and "who
surrounds it" should mean in the whole citation network. I would probably delete the keep step and
start again from the full graph to be sure. I do not want to guess about what a step reads.

And again the 779 thing: the neighbors example is for 6117075, which says citationsReceived 779,
and the neighbors filter gives 242 nodes. A reviewer would ask me which number is the citation
count. The tool needs one sentence on the column: "citations received, including from patents
outside this sample" -- if that is what it is.

**The picture.** The two-step sample (top 3 and their neighbors) draws three big stars with a few
bridges between them. It is a readable picture, labels on the hubs, ForceAtlas2 ready. I would want
to size by betweenness and colour by category, then export SVG. None of those screens were in front
of me, so I cannot say whether that works.

**Done?** I have the first one, and I trust it. I have a list of 200 that I do not trust past the
first handful, computed with a direction I cannot state. And the neighborhood -- I think I would get
it right, but only because I would start over from the full graph to be safe.

---

## Single Ease Question

**3 out of 7.** The route was findable -- menu, cost warning, sample, table, keep 200, neighbors --
and several steps are better than Gephi: it tells me it would take hours instead of freezing, and it
tells me when statistics describe a subset. But I had to reason my way past the direction
contradiction, the "exact on 5,318" row, the citationsReceived that is not in-degree, and a top 200
that the tool itself says is shaky past rank 2. A student would finish the task and be wrong without
knowing it.

## Would she use this instead of Gephi?

"Not for this, not yet. For a graph this size Gephi does not even open, so the honest comparison is
NetworkX, and in NetworkX I choose `k`, I choose directed or undirected, and I know which I chose.
Here I got a nicer workflow and a number I cannot describe in a methods section. Fix the direction
so the summary and the run record agree -- and give me the control -- and tell me where the ranking
stops being reliable at the row I cut at, and I would use it as the step before Gephi: find the
interesting 200 here, export them, lay them out there. The not-drawn screen with the statistics and
the table is already better than anything Gephi does at this size. I would show that screen in my
course. But I would not put my name on the list yet."

## What she said afterwards

- "Directed in one line, undirected in the record. Pick one, show it in both places, and let me
  change it. That is the whole difference between a result and a rumour."
- "Do not call it exact if it is on a subset. Say 'on the 5,318 drug patents granted in 2001'."
- "You told me ranks 3 to 7 might swap. Tell me the same thing about rank 200, because that is
  where I am cutting."
- "Explain citationsReceived. Its maximum is 779 and the in-degree maximum is 236. A reviewer will
  catch that before I do."
- "When I add neighbors after keeping 200, tell me in the editor whether it looks in the 200 or in
  the whole graph."
- "The statistics box that says it describes the 200, not the whole graph -- keep that. Gephi has
  been lying to me about that for ten years."

---

## Problems observed

| Screen | What | Severity (1-4) |
| --- | --- | --- |
| results-panel, finished sampled | The summary line and Options say "Directed"; the run record says "Citations read as undirected" and normalizes by undirected node pairs; the refused screen also says "read as undirected". She cannot state which measure was computed, which for her is a reason to abandon the tool. | 4 |
| results-panel, finished sampled / past-drawing-limit, keep top rows | A 200-row cut on a 101-source estimate is, by the panel's own admission, unstable below rank 2; nothing says how firm rank 200 is. The keep editor reports exact ties at the cut, which is the wrong uncertainty for an estimate. | 3 |
| option-form-cost / results-panel, refused | "Exact, on 5,318 nodes" does not name the 5,318 in the row; betweenness on a subgraph is a different measure, and the word "exact" makes it look like the safe choice. | 3 |
| past-drawing-limit, not drawn / neighbors editor | citationsReceived runs to 779 while in-degree peaks at 236 and the top patent's neighbors number 242; nothing explains that the column counts something other than in-sample citations. | 3 |
| past-drawing-limit, Neighbors of a node | When added after a Keep step, it is not shown whether the neighbors are taken within the kept 200 or the full graph; she expects Gephi's filter-chain behavior (within the parent) and would get a nearly empty neighborhood. | 3 |
| results-panel, refused / option-form-cost | No direction control on the cost form or refusal; the direction is decided for her. Gephi's betweenness dialog asks. | 2 |
| past-drawing-limit, narrow | The first suggested step is "Keep top rows by citationsReceived", which invites a novice to answer "most in between" with "most cited". | 2 |
| results-panel, finished sampled | Column header "rank, low-high patent" reads as a typo; "#3-#7" repeated on three rows needs a word to be read as a range. | 2 |
| find, state 7 (node inspector) | The neighbor and filter actions on a node are unlabeled icons; she found "Select neighbors" only by hovering. | 2 |
| past-drawing-limit, keep top rows | The mock only shows the Keep editor ordered by citationsReceived; she assumed but did not see that it orders by betweenness after the run. | 2 |
| option-form-cost | "Sample size" and "sources" carry no explanation a student would understand; the default of 101 is what most people will run. | 2 |
| results-panel, catalog | The Algorithms menu was shown over a different graph (human proteins), so for a moment she was unsure it applied to her patents. | 1 |
| all | Grey subtitle text in table headers and panels is small for her eyes and for a projector at 1280 x 800. | 1 |
