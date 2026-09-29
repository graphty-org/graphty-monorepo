# Session: top 200 past the drawing limit -- Gephi holdout (Mara)

Participant: Dr. Mara Lindqvist, associate professor of computational social science, Gephi user
since 0.8, teaches it every year (study/personas/gephi-holdout.md). Skeptical, fast, reads
parameter names and numbers and skims everything else. Checks every statistic against what
NetworkX would give.

Task as given, and nothing more: "This citation graph is too big to draw. Find the 200 patents
that sit most in between, then look at who surrounds the first one."

Material worked from, all rendered in the participant view (design notes hidden), 1440 x 900:
the past-drawing-limit page (not drawn; Narrow the graph; Keep top rows; kept and drawn; the
rule editor; drawn; the two-step "most cited, then neighbors" state), the option form's cost
states (within budget, over budget, sample over budget), the results panel (catalog, refused,
finished sampled with its run record open, in the table), the table dock (limit, large), Find
(past the drawing limit; Quick actions by question) and selection-over-cap. Page HTML was read
only to see what a control offers when opened.

Moderator note on coverage: no page shows the citation table sorted by the betweenness result,
or the Keep top rows editor with betweenness chosen as the order, or a patent's neighbors opened
from a betweenness-kept graph. The pages' notes say Keep top rows follows "the table's order;
after a run, that run's result", and the Neighbors-of-a-node editor exists as an inset. Mara was
told what those controls would do and asked to say whether she would have found them.

## Think-aloud

**1. The file opens past the limit.** (shots/screens__past-drawing-limit-not-drawn--study.png)

"124,318 nodes not drawn. More than this browser draws at once, 50,000. Fine -- Gephi would
have tried and I'd be staring at a beach ball for four minutes, so honestly, thank you for not
trying. Counts first: 124,318 nodes, 1,480,221 edges. I don't know this file by heart, so I'll
take them, but it's the NBER-style patent citations, 1999 to 2001, that's plausible.

The table is open with every patent. Good, that's my Data Lab. Sorted by citationsReceived,
highest first, 779 at the top.

Wait. The degree distribution on the right says in-degree max 236. And the column says 779.
So citationsReceived is not in-degree in this graph. It's an attribute from the file -- probably
citations from the whole patent universe, not just this sample. Nothing tells me that. A
student would sort by it and write 'most cited in the network'. That's a column I would rename
before I taught with it. I'll leave it; it isn't my task.

My task is betweenness. There's no betweenness column. 'Keep top rows...' up there is by
citationsReceived. That's in-degree-ish, not in-between. Not what I want."

**2. Where do I run a statistic?** (shots/screens__results-panel-catalog--study.png,
shots/screens__find-s8--study.png)

"In Gephi, Statistics is a panel on the right with Run buttons. Here the right side says
Statistics, but it's the overview numbers, no Run. There's 'Results' in the left strip. The
flask. I'd try that. Or the hamburger: Algorithms, Centrality, Betweenness. There it is, first
item. Also the lightning bolt, Quick actions -- I'd type 'betweenness' there; the search box on
the left apparently hands a verb over to it too. Three ways in. Fine. I picked the menu because
that's where Gephi people look."

**3. Betweenness on 124k nodes.** (shots/screens__option-form-cost-over-budget--study.png)

"'Takes hours. The time limit is 30 seconds.' Whose time limit? I didn't set 30 seconds. In
Gephi I would start exact betweenness at five o'clock and look at it in the morning. Hours is
not a refusal, hours is Tuesday.

But then it offers: Sampled, 101 sources, under a minute. Exact on 5,318 nodes -- that's some
other set, drug patents, not mine, skip. Sampled, 500 sources, a few minutes. Exact on the full
graph, hours. So I *can* run exact, it's just below the line. OK. That's fair, actually. It
tells me what each costs before I press anything. Gephi tells me nothing and then hangs.

I'd take 500 sources, not 101. I'm about to cut at rank 200, and with 101 sources the scores
around rank 200 are going to be noise. Let me check it lets me."

(shots/screens__option-form-cost-sample-over-budget--study.png)

"Sample size 500, of 124,318. 'Past the 30-second time limit. Run starts it in the
background.' Seed 7, with a reroll button. Good -- a seed I can write in a methods section.
Direction: 'As the graph: directed.' Good, citations are directed, that's what I want.

'Scores are estimated from 101 sources. The top of the ranking is usually stable; a single
score can be well off.' That's the honest sentence. I'd have written it myself for my students.
Though it still says 101 after I typed 500 -- it's the reading of the last run, I suppose. I
have to guess that."

**4. The finished run and its record.** (shots/screens__results-panel-finished-sampled--study.png)

"Betweenness (sampled), 101 sources. I'm reading the one that exists. 'On: full graph, 124,318
nodes.' Good, it says what it ran on. That's the thing Gephi never does -- my filter-at-ten-percent
problem. 'Sampled, 101 sources. Directed. WebGPU.' Top nodes: 5879702 at about 0.0160, then
5902311, then three tied as '#3-#7'. 'Ranks below #2 may swap between runs.' Honest.

Details. Run record. Method: Brandes betweenness from 101 random sources, scaled up by
124,318 / 101. Seed 7. Normalization: divided by (n-1)(n-2)/2, the node pairs of an undirected
graph. Error bound plus or minus 0.00035, 95 runs in 100. Direction: 'Citations read as
undirected.'

No. Stop. The panel above says Directed. The options block says Direction: Directed. The form
said 'As the graph: directed'. And the record says it read the citations as undirected and
normalized like an undirected graph. Which is it? Directed and undirected betweenness on a
citation DAG are not the same ranking -- on a DAG the directed version is dominated by patents
that are both cited and citing across generations; undirected rewards anything bridging
technology classes. That is the whole question 'who sits in between'.

The 'Not run' state says it too: 'the directed citations read as undirected'. So the tool may
well be treating it as undirected on purpose, and the label is what's wrong. Either way, three
places say directed and two say undirected. If I run nx.betweenness_centrality on the DiGraph
I will not get this number, and I cannot tell which one to compare against. I can't publish a
number I can't check.

Also: plus or minus 0.00035 on each value. The top one is 0.016, fine. Number three is 0.0029.
Somewhere around rank 200 the values must be down near 0.0003 or 0.0004. Then the error bar is
as big as the score. The 200 I'm about to cut are, at the bottom, a coin toss. The tool gave me
the bound -- credit for that -- but it doesn't tell me how many of the 200 are solid. I'd want
'the top N are stable at this sample size' in plain words. I'd rerun with 500, and a second
seed, and compare. There is a 'Compare with...' under Runs of this measure. I'd use it."

**5. From the result to the 200.** (shots/screens__results-panel-in-the-table--study.png,
shots/screens__past-drawing-limit-keep--study.png)

"'124,313 more in the table.' The protein example shows that opens the table sorted by the
measure, with the value column saying 'exact, full graph' under its name. For mine it would
presumably say 'estimated' or 'sampled'. I'd check that the header says sampled; if it says
nothing I'd be annoyed.

Then 'Keep top rows...' on the table. I saw it with citationsReceived: Keep the first [200]
rows, in the table's order, 'Row 200 has citationsReceived 358; 1 more patent also has 358 and
is left out.' That's a good line. It tells me about the tie at the cut. Then '200 nodes, 288
edges, will draw' before I press it. I like the count before the commit. Gephi's filter makes
me press Filter and then read the context panel.

Moderator tells me the order dropdown would list the betweenness run after it finishes. Would
I have found it? Probably -- I'd sort the table by betweenness first and then the 'table's
order' follows. But the dropdown only showed column names. If the run isn't in it by a name I
recognize, 'Betweenness (sampled), 101 sources, seed 7', I'd not be sure I'm cutting on the
right run. And the tie line matters more here: with estimates, the cut isn't a tie, it's a blur.
'Row 200 has 0.00041, and the next 40 are within the error bound' is what I'd want it to say.

So: 'Keep these 200 rows.' The chip says '200 of 124K nodes, 1 step'. Undo in a toast. Undo!
I'd press Ctrl+Z right away just to see it works. That's worth something to me."

(shots/screens__past-drawing-limit-kept--study.png)

"It draws. ForceAtlas2 by name, engine WebGPU, with a play button. I'd want scaling, gravity,
LinLog behind that -- not shown here, I'm not getting into it. The statistics describe the
kept 200 and say so: 'Describes the 200 most cited patents, not a random sample. Density reads
high.' Good that it says so. For my run it would say 'the 200 with the highest betweenness' I
hope. If statistics after the filter silently described the 200 I'd be furious; this one
announces it. That's exactly what I wanted from Gephi for ten years."

**6. Who surrounds the first one.** (shots/screens__find-s7--study.png,
shots/screens__past-drawing-limit-sample--study.png,
shots/screens__selection-over-cap-e1--study.png)

"First one is 5879702. I'd type it in the search box at the left -- the find page shows a pasted
id selecting the patent even when nothing is drawn, and the right panel shows it: attributes,
memberships, and two icons at the top. One looks like expand, one is a funnel. No labels. I'd
hover. The page says the funnel is 'Filter to neighbors'. In Gephi I'd right-click, Select in
Data Lab, or use the Ego Network filter with depth 1. The ego filter is the thing I want.

The steps list also offers 'Neighbors of a node...': around [the node], 1 hop, both directions,
with a count before commit. Good -- 1 hop and direction are the two parameters of Gephi's ego
filter, and here direction is actually a choice. For citations I want to see 'cites' and 'cited
by' separately, so I'd do it twice, In then Out.

Here's my question, and nothing on the screen answers it: I have the 200 kept. Is 'neighbors of
5879702' taken inside my 200, or from the full 124,318? In Gephi, filters stack, so a second
filter under the first works on the subset -- students get this wrong every year. Here the
two-step example says 'Add their neighbors' works on 'what the step above keeps', but that's
adding neighbors *of* the kept set from the full graph, I think, since the 3 most cited went to
586. For one node I don't know. I'd want the full-graph neighbors -- who surrounds it in the
real network, not among the other 199. I'd probably clear the 200 step, or uncheck it, and add
the neighbors step alone. That's a guess.

And if 5879702 has, say, 1,500 neighbors, the count says whether it will draw. The
selection-over-cap page is on a transfers graph, so I can't judge it for my patents, but a
number before the draw is right."

**7. The shell itself, briefly.**

"The 'not drawn' message moves around -- middle of the canvas on one screen, a little box
bottom left on another, bottom right on a third. The graph is called Citations, Patent
citations, and Citations 1999 to 2001 depending where I look. Small, but on a projector with
twenty-five students every one of those is a hand up."

## Single Ease Question

**4 of 7.** Finding the command and cutting the top 200 is easier than Gephi -- the cost before
running, the count before filtering, and statistics that say what they describe are all better
than what I have. But the direction contradiction in the run record stopped me cold on the
number itself, the cut at 200 on a 101-source estimate is noise at the bottom and the tool only
half says so, and I had to guess whether "neighbors of the first one" reads the 200 or the whole
graph.

## Would she use this instead of her current tool?

"Not for this. For a paper, no: the run says directed in three places and undirected in two,
and until it says one thing I can't check it against NetworkX, so I can't cite it. What I'd
actually do is compute betweenness with k=500 in NetworkX, write it as a node attribute, and
load that. For a first look at a graph this size, and for teaching the lab -- it doesn't choke,
it tells students what a statistic ran on, and it has undo -- I'd open it again. A second
session, not a switch. I'd stay on Gephi."

## Findings (moderator summary)

1. **Direction contradicts itself on the sampled betweenness run (severe).** The option form
   ("As the graph: directed"), the result header ("Directed") and the Options block
   ("Direction: Directed") say directed; the run record ("Citations read as undirected", and
   normalization by "(n-1)(n-2)/2, the node pairs of an undirected graph") and the Not-run state
   ("the directed citations read as undirected") say undirected. Screens: option-form-cost,
   results-panel finished-sampled and refused. For this participant it ended trust in the number.
2. **The cut at rank 200 is inside the error bound and nothing says how many of the 200 are
   stable (high).** The run record gives +/- 0.00035 per value and "Ranks below #2 may swap
   between runs", but Keep top rows reports only exact ties at the cut ("1 more patent also
   has 358"). On an estimated order it should say how far down the ranking holds.
3. **Whether "neighbors of one node" reads the kept 200 or the full graph is not stated
   (high).** The steps list offers Neighbors of a node and the inspector offers Filter to
   neighbors, but with a step already active nothing says which graph the neighbors come from.
   The participant guessed she would have to remove the 200 step first.
4. **The citationsReceived column is not in-degree and does not say so (medium).** Its range
   is 0 to 779 while the in-degree distribution tops out at 236 on the same screen.
5. **The time limit is presented as a rule nobody set (medium).** "The time limit is 30
   seconds" reads as a refusal to someone who runs exact statistics overnight; the exact row is
   there below the line, but the wording made her think it was forbidden first.
6. **The form keeps the last run's reading after the sample size changes (low).** With 500
   typed, "Readings" still says "estimated from 101 sources".
7. **Inconsistent chrome across screens (low).** The graph is named "Citations", "Patent
   citations" and "Citations 1999 to 2001"; the not-drawn notice sits mid-canvas, bottom-left
   and bottom-right on different screens; the inspector's neighbor and filter icons have no
   labels.
8. **Nothing shows the citation table sorted by the betweenness result or the Keep top rows
   order picker naming a run (coverage gap).** The participant would want the run named with
   its sample size and seed in that picker.

Delights: cost shown per option before running; exact still reachable; seed field; "On: full
graph, 124,318 nodes" on the result; the honest "Ranks below #2 may swap"; count before commit
on Keep top rows, including the tie at the cut; statistics after a filter that say what they
describe; Undo in the toast; ForceAtlas2 named.
