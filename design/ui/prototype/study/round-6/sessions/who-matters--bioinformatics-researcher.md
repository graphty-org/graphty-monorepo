# Session: who matters most in Les Miserables, and how sure

Participant: Dr. Chen, computational biologist, drug target discovery; R and igraph for anything she
has to reproduce, Cytoscape for figures (persona: bioinformatics-researcher).
Screen: 1440 x 900, Chrome.
Task as given by the moderator: "You have the Les Miserables co-appearance network open. Find the few
characters who matter most to how the story hangs together, and tell me how sure you are of their
order."

Screens used, in the order she met them (all rendered in the participant view, design notes hidden):

- The project at rest, Les Miserables: `screens/frame-at-rest.html?dataset=lesmis` (render `shots/record/r6-chen-who-frame-at-rest.png`)
- The main menu's Algorithms list: `shots/tasks/who-matters/02-results-panel-new-project.png` (drawn over the protein network)
- A finished betweenness result: `shots/tasks/who-matters/03-results-panel-finished.png` (protein network, see the moderator note)
- Its table: `shots/tasks/who-matters/04-results-panel-in-the-table.png` (protein network)
- The Les Miserables table with degree and betweenness side by side, Valjean selected, and the betweenness column popover: `screens/table-dock.html?dataset=lesmis` (render `shots/record/r6-chen-who-table-dock.png`)
- Betweenness re-run after "Filter to degree >= 2", 60 of 77, with Valjean selected: `screens/run-and-read.html#subset` (render `shots/record/r6-chen-who-run-and-read.png`, the Les Miserables state)
- Closeness on "76 of 77 nodes, 1 step": `screens/closeness-variant.html` (render `shots/record/r6-chen-who-closeness-variant.png`)
- The Compare with... menu: `shots/screens__results-panel--compare-with.png` (patent network)
- The inspector on one node: `shots/tasks/who-matters/05-inspector-one-node.png` (protein network)

Moderator note: the task's screens for the finished result, its table and the inspector are drawn on
the 300-protein network. When she reached them the moderator said "imagine it is your characters; the
Les Miserables numbers are in the table and the filtered run". She had already spotted the switch.

## Transcript (thinking aloud)

**The network, at rest.** Les Miserables. The Knuth co-appearance graph -- every network methods
paper has it in a figure somewhere, so I know what the right answer roughly looks like. That's useful,
actually; I can check the tool instead of trusting it.

77 nodes, 254 edges, one connected component. Density 0.0868. Degree distribution sparkline. Fine,
that's the summary block I'd print from igraph first. "Loaded: miserables.json, undirected, value not
used yet. Change..." Right -- the edge value is the number of chapters two characters share. That's
my STRING combined score, more or less. It's the most important column in the file and it's switched
off by default. I'll note that and come back.

The legend: "Group color", 2, 8, 4, 1, 3, 5, 0, Other "Groups 6, 7 and 10". Groups from the file. It
says so later, "from the file", but here it doesn't say who made them or how. Somebody's community
call, probably. I don't trust a partition I didn't run.

"Labels: the 18 characters with the most connections." So the labels are a degree ranking. Don't show
me the top by degree -- in my networks that's a list of the most-published proteins. In a novel it's
the characters in the most chapters, which is not the same as holding the story together. At least it
tells me what the labels mean. Most tools don't.

**Picking a measure.** Main menu, Algorithms. Centrality: Betweenness, Closeness "WF-corrected",
Eigenvector with a warning "3 components", Harmonic, HITS, Katz, PageRank.

"3 components"? My graph has one. And the list is sitting over a protein network labelled MAPK1, TP53.
(Moderator: same list.) Fine. But if the warning is about somebody else's graph I've just learned to
ignore the warnings, which is the wrong lesson.

No Degree in the list. It's in the table as a column apparently. No bridging centrality, no
bottleneck -- fine, I'd do those in R anyway. Betweenness is the one that answers "holds the story
together", in the sense of lying on paths between other characters. Betweenness.

**The result (protein screen, reading it as mine).** "on: full graph, 300 nodes, 3 components. Exact.
Undirected. WebGPU. Details." "Weight: confidence, not used yet. Change..." So again: unweighted by
default, and it tells me. Good that it tells me. I'd rather it asked.

The (i) on Exact: "Computed on every node, not estimated. It does not say the ranking is meaningful."
That's the most honest sentence I've read in a network tool in a while. Keep that.

Top nodes, five, four decimals. "Every step in the top 5 is over the 1% tie line; the smallest,
ranks 3 and 4, is 1.2%." Hm. So the tool's idea of "how sure" is: are two neighbouring numbers more
than 1% apart. That's rounding, not uncertainty. 0.0695 against 0.0687 is not a tie in arithmetic, and
it tells me nothing about whether YWHAZ would still be above CDK1 if I dropped 5% of the edges or used
a different STRING release. Which is exactly the thing a reviewer asks now. Where's the resampling?
Edge-dropout, bootstrap, rank intervals -- anything. The 1% line is a sensible guard against
over-reading the fourth decimal, and I'll take it as that, but it's not "how sure".

Distribution, "bar height: square root of the count". Fine. "zero: 10 nodes". Fine.

**The Les Miserables table.** Now it's my characters. "Full graph: 77 nodes." Two column groups:
"Degree" and "Betweenness exact, unweighted, full graph". Each with a rank "of 77". Good -- the
header carries the parameters. That's the column heading I'd want in the supplementary table.

Above it: "Valjean is #1 on both measures. At #2 they part: Gavroche by degree, Myriel by
betweenness." That's the sentence I'd have to write myself after merging two cytoHubba exports. I
like it. And "Compare rankings..." -- that's the scatter I'd make in ggplot.

Rows: Valjean 36 #1, 0.570 #1. Gavroche 22 #2, 0.165 #3. Marius 19 #3, 0.132 #4. Javert 17 #4,
0.054 #7.

I open the popover on the betweenness column. "77 nodes, 47 at 0. Shaded: 1 past the outlier fence."
Valjean 0.570, Myriel 0.177, Gavroche 0.165, Marius 0.132, Fantine 0.130.

Two things. First, 47 of 77 at exactly zero. So more than half the network carries no betweenness at
all -- the ranking below about #30 is meaningless, and it tells me that, in effect. Good. Second,
Marius 0.132 and Fantine 0.130: that's under 2%. On the protein screen there was a sentence about the
1% line. Here there isn't one; I'd have to divide myself. And Myriel at #2 with degree 10 -- the
bishop. Looking at the drawing, he's the hub of that little blue fan of one-scene people at the top
right, Napoleon, the Countess, Cravatte. They only connect through him, so every path to them passes
him. That's a topology artefact of the first book's structure, not "holding the story together". In a
PPI I'd call it a well-studied protein with a bag of single-study partners.

**Checking whether the order survives.** What I'd do in R: drop the degree-1 leaves, rerun, see who
moves. There's a run for exactly that. Header "Filtered: 60 of 77 characters". The result:
"Betweenness, on 60 of 77, Sep 29 10:14". "on: filtered graph, 60 of 77 characters. After Filter to
degree >= 2. Exact. Unweighted, undirected. CPU." -- the scope, the filter, the method and the
hardware in one line. That's my methods sentence.

Top nodes on 60 of 77: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073.

Myriel is gone from the top five. As I expected. Valjean stays first. Gavroche over Marius holds.
Fantine climbs close under Marius.

No tie sentence on this run, though. 0.172 / 0.164 is under 5%, 0.164 / 0.154 about 6%. It said
something on the protein run and nothing here. Is that because nothing is tied, or because this panel
doesn't do it? I can't tell, and I don't like having to wonder.

Valjean selected, right side: "betweenness 0.419, on 60 of 77, #1 of 60" and underneath "betweenness
0.57, on: full graph, #1 of 77", and "degree 36, on: full graph". Two runs of the same measure, each
labelled with the graph it was computed on. That is genuinely rare. Cytoscape overwrites the column
and you find out three weeks later which network it came from.

"Runs of this measure 2: Run 2 on 60 of 77 ... Run 1 full graph". And "Compare with...". Good,
that's where I'd see who moved between Run 1 and Run 2. I click. The menu I'm shown is on a patent
network: "Earlier runs of PageRank", "Other runs on this graph", "The same run on another data
version...". So it would let me pick Run 1. What I get after picking, I don't see -- the "Compare
rankings" scatter from the table, I assume. I'll assume that and not bet on it. That last item, "the
same run on another data version", is interesting for me: STRING v11.5 against v12 is exactly the
comparison I need and never get.

**Closeness, and the weights.** There's a closeness screen too. "76 of 77 nodes, 1 step". Wait -- 76?
Which one is missing? I look at the drawing and there's no big orange node in the middle. Valjean's
gone. Somebody filtered out Valjean. The chip says "1 step" but not what the step was; I'd have to
open it. OK, it's a what-if: the story without its protagonist. Seven components, five isolated. The
tooltip: "Closeness. 7 components: each score is scaled by the share of the graph the node can reach
(Wasserman-Faust)." Right, that's the correction you need or the bishop's little isolated household
wins. I know the paper. And next to it "Harmonic centrality" as the other option. Sensible.

But look at the right side: "Weight: value, shared scenes, 1 to 31". And under the runs, "Distance =
1 / value". So THIS run used the co-appearance counts, as distances, inverse. That's the conversion
I'd have chosen. So the tool can do it -- it just isn't what the betweenness runs I was reading did.
Every betweenness number I've quoted so far ignored the counts.

Top by closeness without Valjean: Javert 0.997, Enjolras 0.983, Courfeyrac 0.960, Marius 0.930,
Combeferre 0.928. With Valjean removed, Javert becomes the centre -- which is literally the plot: he
hunts Valjean through every part of the book. Nice. But this is a different measure, a different graph
and a different weighting, all at once. I cannot line it up against the betweenness run and say what
changed because of what. I'd need weighted betweenness on the full graph, and I don't see it.

**My answer.** Valjean first, and I'm certain: he's first by degree, by betweenness on the full graph
(0.570, three times the next) and still first after removing the leaves (0.419). Then Gavroche and
Marius, second and third, in that order in both runs -- but I'd report them as a pair, not an order;
the gap after the filter is under 5% and I haven't seen what the co-appearance weights do to it.
Fantine is fourth-ish, within a hair of Marius in both runs. Javert is fifth by betweenness but
seventh on the full graph, and becomes the centre if Valjean is removed -- so he's the one whose rank
depends most on the question. Myriel is second on the unfiltered betweenness only because of his
one-scene neighbours; I'd leave him out.

How sure of the order: #1 certain. #2-#3 fairly sure as a set, not as an order. #4-#5 depend on
filter and measure. And none of this used the edge weights, which is the choice I'd expect a reviewer
to ask about first. The tool gave me honest labels for everything it did; it didn't give me any
estimate of how stable the ranks are, and the "1% tie line" isn't one.

## After the task

**Single Ease Question (1-7): 5.** Finding the numbers and knowing exactly which graph each was
computed on was easy -- easier than Cytoscape, where I'd be merging columns in Excel. The two things
that cost me: the edge weights are off by default on every betweenness run I could see, and the
"how sure" part is left to me. The 1% tie sentence appears on one screen and not on the other, and
even where it appears it measures rounding, not robustness.

**Would I use this instead of what I use now?** Not instead of igraph. Beside it, maybe. What I'd
actually use: the run record that names the scope, the filter and the weighting in one line; both runs'
values on the node, each with its graph; the table sentence that says where two rankings part. Those
are things I build by hand today. What stops it replacing R: I can't see a way to script it or pull
the ranked table back into R except "Export table...", which I didn't open, and it doesn't give me any
rank stability -- no edge resampling, no rank intervals. For a novel that's fine. For a target list I
hand to the bench, "exact" is not the question; "would it still be in the top ten on next year's STRING
release" is, and "the same run on another data version" in the compare menu is the first hint I've seen
that someone thought about that. Show me that working and I'd give it a Friday afternoon with a real
network.

## Observations for the studio (moderator's notes, not the participant's words)

- She read the tie sentence ("over the 1% tie line") as a claim about confidence and rejected it as
  rounding. It is useful as a guard against over-reading decimals; as an answer to "how sure" it
  reads as a false reassurance to a statistically literate reader.
- The tie sentence is on the full-graph protein result but absent from the filtered Les Miserables
  run (Gavroche 0.172 / Marius 0.164). She noticed the absence and could not tell whether it meant
  "no ties" or "not computed".
- The betweenness column popover lists Marius 0.132 and Fantine 0.130 (under 2% apart) with no tie
  note; she had to divide by hand.
- Weights: every betweenness run she saw was unweighted; the only weighted run (closeness,
  distance = 1 / value) was also on a different graph (Valjean removed). She could not isolate the
  effect of the weighting.
- The "76 of 77 nodes, 1 step" chip does not say which step; she inferred "Valjean removed" from the
  drawing.
- The Eigenvector "3 components" warning in a menu opened over what she was told was her
  one-component graph taught her that warnings may not be about her data.
- Compare with... was drawn on the patent network and she never saw its result for her two runs; she
  assumed it opens the rank scatter.
- Most valued: the per-node listing of both runs with their scopes ("0.419, on 60 of 77, #1 of 60" /
  "0.57, on: full graph, #1 of 77"), the one-line run scope ("After Filter to degree >= 2. Exact.
  Unweighted, undirected. CPU."), and the Exact tooltip's "It does not say the ranking is meaningful".
