# Who matters -- Knowledge Engineer (Min-ji)

**Participant:** Min-ji, knowledge graph engineer and ontologist at a financial-services company.
Owns an RDF/OWL enterprise knowledge graph; works in SPARQL, GraphDB and Python notebooks
(networkx, pandas). Mild red-green colour weakness. Knows centrality measures and asks which one.
Saw this task on the previous version of the screens and remembers what she checked then.

**Task as given by the moderator:** "You have the Les Miserables co-appearance network open. Find
the few characters who matter most to how the story hangs together, and tell me how sure you are
of their order."

**Screens seen (participant view, design notes hidden):**
- the project at rest, Les Miserables -- `../../../shots/record/screens__frame-at-rest--study.png`
- the rebuilt layout: at rest, Valjean selected, the Results list, one run opened --
  `../../../shots/record/screens__navigation-frame-new--study.png`,
  `../../../shots/record/screens__navigation-frame-new-node--study.png`,
  `../../../shots/record/screens__navigation-frame-new-results--study.png`,
  `../../../shots/record/screens__navigation-frame-new-run--study.png`
- the main menu's Algorithms list and the Results panel's "Run a measure..." list (protein network) --
  `../../../shots/record/screens__results-panel-catalog--study.png`,
  `../../../shots/record/screens__run-and-read-catalog--study.png`
- a finished Betweenness result, its table view, a Closeness (Wasserman-Faust) result, and a run
  read with one protein selected (protein network) --
  `../../../shots/record/screens__results-panel-finished--study.png`,
  `../../../shots/record/screens__results-panel-in-the-table--study.png`,
  `../../../shots/record/screens__results-panel-variant--study.png`,
  `../../../shots/record/screens__run-and-read-rank--study.png`
- the bottom table with degree and betweenness ranked side by side, and its column header and
  histogram popover (the novel) -- `../../../shots/record/screens__table-dock-small--study.png`,
  `../../../shots/record/screens__table-dock-header--study.png`
- the novel with Valjean filtered out, Closeness before and after it runs --
  `../../../shots/record/screens__closeness-variant-b1--study.png`,
  `../../../shots/record/screens__closeness-variant-b2--study.png`

## Think-aloud

**Before touching anything.** "Same sentence as last time. 'Matter most to how the story hangs
together' is not a measure. I read it as brokerage -- betweenness -- checked against degree,
and I want to know which betweenness: exact or sampled, weighted or not, normalized how. Then
'how sure' means: does the order survive a different reasonable choice. I already know from my
notebook that it does not, below Valjean. So the question for me today is whether the tool tells
me that, or whether I have to go to the notebook again."

"And it is still a property graph with one edge attribute. No classes, no predicates. A demo. I
judge it on whether it tells the truth about the numbers."

**Project at rest.** "77 nodes, 254 edges, one component, density 0.0868. Matches networkx.
'Edges: 254 edges (rows)' and 'Linked pairs: 254 linked pairs' -- so it distinguishes a row in
the file from a distinct pair. Good; on this file they are the same, and it says both. 'Loaded:
miserables.json, undirected, value not used yet. Change...' Still says it is ignoring value.
Still good."

"Legend: 'Group color: 2, 8, 4, 1, 3, 5, 0, Other -- Groups 6, 7 and 10.' Now the counts are
there, 14, 13, 11. Still nothing says what a group is or where it came from. The rebuilt screen
says 'Group color group' -- so group is the column name. That is provenance by inference. Fine
for this task, I do not need the groups."

"Colours: 2 is amber, 3 is vermillion, 4 is green. Amber and vermillion are close for me. I read
the numbers."

**Where do I run a measure.** "Main menu, Algorithms, Centrality: Betweenness, Closeness
'WF-corrected', Eigenvector with a warning '3 components', Harmonic, HITS, Katz, PageRank. Same
list as before, still named properly. On the Results panel there is 'Run a measure...' with the
same list and a hover card on Betweenness: 'How often a node lies on the shortest paths between
other nodes: the brokers and bottlenecks.' One line, correct. I would not have read a longer one."

"Both of those are on the protein graph again. I will assume the menu does not change per dataset.
In a real session I would want to see it on the graph I have open."

**The Results list on the novel.** "This is what was missing last time. Results, 'Newest first':
'Betweenness, today 14:02. Exact, normalized, no weight. Full graph, 77 nodes.' and 'Bridges, 27
Sep, 16:40.' So the betweenness number now has a run behind it, and the run is described in the
list itself -- exact, normalized, unweighted, which graph. That is the sentence I would write in a
methods section. Good."

**Opening the run.** "'Ran on the full graph, 77 nodes. No weight: every edge counts the same.'
Settings: method 'exact, every node', normalized yes, edges undirected, weight none, ran 29 Sep
2026 14:02. Re-run, Compare with... Top nodes: Valjean 0.57, Myriel 0.177, Gavroche 0.165."

"Those are the networkx numbers. Myriel second. Same trap as always: the bishop brokers for his
own leaves -- Napoleon, Cravatte, the Countess -- who appear with no one else. The measure is right;
reading him as 'holding the story together' would be wrong."

"Two things I do not like here. One: 'Valjean 0.57' next to 'Myriel 0.177'. Two digits and three
digits in the same list. The table under it says 0.570 in one place and 0.57 in another, and
Fantine is '0.13' in the table where the histogram says '0.130'. Pick a precision per column. When
the trailing zero disappears I start wondering whether it was rounded differently."

"Two: on the protein run there was a line under the top five -- 'every step in the top 5 is over
the 1% tie line; the smallest is 1.2%'. On the novel's run there is no such line, and only three
top nodes. So the one statement that says anything about separation is on the other dataset.
Gavroche 0.165 and Myriel 0.177 are 7% apart; Marius 0.132 and Fantine 0.130 are under 2%.
I want the tool to say that on THIS graph."

**Valjean selected.** "Inspector on the rebuilt screen: 'Attributes: group 2, degree 36.'
'Results: betweenness 0.57, highest. bridges: on no bridge.' So computed results are separated
from attributes. But degree is under Attributes, next to group, and degree is not in the file --
the tool counted it. On the protein screen it said 'from the file' under module. Here nothing says
which of group and degree came from where."

"Then the table screen, same node, different inspector: 'Attributes: group 2, degree 36,
betweenness 0.57.' All one bag again. And on the protein run screen, TP53: 'Attributes:
betweenness 0.1139, #2 of 300, on: full graph', then module, degree. So I have now seen three
inspectors that disagree about whether a computed number is an attribute. Last time I said
provenance is the whole point for me. It is still not settled."

**The table with both rankings.** "This is still the best screen. 'Valjean is #1 on both measures.
At #2 they part: Gavroche by degree, Myriel by betweenness. Compare rankings...' The header says
'Betweenness exact, unweighted, full graph', with 'rank of 77'. Ties share a rank: Enjolras and
Fantine #6= by degree. Javert is #4 by degree and #7 by betweenness; Fantine is #6= and #5.
That is the kind of disagreement I need to see and it is right in front of me."

"Now my known-answer check from last time. Scroll the betweenness ranks. Combeferre and Feuilly
0.001, #29=. Grantaire 0.000, #34. Prouvaire 0.000, #35=. So Grantaire still shows 0.000 with a
rank of his own, and Prouvaire shows 0.000 as a tie. They look identical and they are not tied.
That is the same as last time."

"And the histogram popover on betweenness: '77 nodes, 47 at 0.' Still 47. The ranks still say
43 true zeros -- everyone from #35= down -- and networkx says 43. Four characters are being counted
as zero because they round to zero. I reported this. It has not changed. Same four characters,
nothing to do with the answer, and still I cannot put a number from this popover in a report
without checking it."

"'Compare rankings...' -- the notes say it opens a scatter of rank against rank. I did not see it
drawn for the novel. I would click it; I assume it is fine."

**Protein screens.** "The finished Betweenness result there has 'Exact' with the hover card:
'Computed on every node, not estimated. It does not say the ranking is meaningful.' Still the most
honest tooltip I know. The run shows 'Weight: confidence, not used yet. Change...' at the top and
'Weight: None for this run' under Options. Two places saying the same thing in different words;
harmless. 'zero: 10 nodes, all 291=' -- that is how the zero line should read, with the shared
rank. The novel's popover should say it that way too."

"The Closeness result there says 'Wasserman-Faust corrected', explains it in one paragraph, and
'Ranks 3 and 4 differ by less than 0.2%, under the 1% tie line; treat them as tied.' That is a
real statement about the order. Again: on the protein graph."

**The novel with Valjean filtered out.** "Now this is interesting, and it is the closest thing to
what I actually asked for. Someone filtered out Valjean: '76 of 77 nodes, 1 step'. Statistics:
76 nodes, '218 of 254' edges, 7 components, 5 isolated nodes, and 'Weight: value, shared scenes,
1 to 31'. In the Results list: 'Betweenness -- Distance = 1 / value.'"

"So this answers my question from last time. When value is used for shortest paths it is turned
into a distance as one over the count, so characters who share more scenes are closer. That is
the conversion I would have made. Good. I would still want to see where that choice is offered
-- the 'Change...' dialog -- but at least the run says what it did."

"'Closeness WF-corrected': the hover card says '7 components: each score is scaled by the share of
the graph the node can reach (Wasserman-Faust).' Correct, and it says it before I run anything.
After the run: 'closeness (WF-corrected)', Javert 0.997, Enjolras 0.983, Courfeyrac 0.960, Marius
0.930, Combeferre 0.928. And the variant word is a control that offers Harmonic centrality. That is
the right alternative for a graph in pieces."

"Two doubts. First, closeness with distances of 1/value -- most distances are below 1, so the raw
score is not bounded by 1. The top value is 0.997 and the range says '0 to 0.997'. Either it has
been rescaled again, or it is a coincidence that it stops just below 1. I would open Details to
see the normalization before I believed it. Second, the Betweenness with distance 1/value is in the
list, but I did not see its numbers. That is the run I actually want next to the unweighted one."

"But note what this screen is. Removing Valjean is a robustness check -- it is what I would do in a
notebook to ask 'who holds it together without the protagonist'. Here it is a filter someone
happened to make. The tool does not offer it as 'how stable is this ranking'."

## Answer to the moderator

"Jean Valjean first, and I am certain: number one by degree, by unweighted betweenness, and in
every variant I have ever run. The tool shows him #1 on both measures and says so in one sentence."

"After him, a tier: Marius, Gavroche, Fantine, and then Javert and Thenardier. Marius is the most
robust -- top four on degree, on betweenness, and still near the top of weighted closeness when
Valjean is gone. Gavroche is #2 by degree and #3 by betweenness. Myriel is #2 on unweighted
betweenness and I leave him out: that is his own leaf characters, not the story. Inside the tier
I would not defend an order."

"How sure: sure of one, confident about the set of four or five, not sure of any order among them.
This time the tool gave me more of that than before. The table shows where degree and betweenness
part, and the Valjean-removed screen with a weighted distance shows another ordering entirely --
Javert, Enjolras, Courfeyrac, Marius. But it gave it to me as separate screens I had to line up
myself. Nothing puts the unweighted run, the weighted run and the without-Valjean run side by side
and says 'rank 1 holds; ranks 2 to 6 move'. I got to my answer because I know this graph."

## Single Ease Question

**5 of 7.** "Better than last time. The betweenness number now has a run behind it, the run says
exact, normalized, unweighted, full graph in the list itself, and the weighted run says
'Distance = 1 / value', which was my open question. The two-measure table still does half my job
in one glance. What costs me points: the zero count is still 47 in the popover against 43 in the
ranks, 0.000 still sits next to a distinct rank, precision changes between 0.57 and 0.570, three
inspectors disagree on whether a computed value is an attribute, and the statement about ties is
only on the protein graph. And for 'how sure' I still assemble it myself."

## Would she use this instead of her current tool?

"Not for my work. There is still no way to get RDF in, and nothing here knows a class from an
instance; for the knowledge graph it is not a candidate. For a question like this on a small
property graph, yes, over pandas for the first look: the ranked table with the agreement line,
the run record that says exactly what was computed, and the closeness variant that names its
formula before it runs are better than what I write in ten minutes. I would still recompute in
networkx before anything goes in a report -- because the zero count I reported is still wrong, and
because nothing here tells me whether the order survives weighting, dropping the leaf characters
or removing the protagonist. The pieces for that are all on these screens now. Put them in one
table -- the same measure under three choices, with rank columns -- and I would stop checking."

## Observations for the study team

- **Resolved since the last round: the value with no run.** The novel's Results list now holds
  "Betweenness -- Exact, normalized, no weight. Full graph, 77 nodes" and the opened run lists
  method, normalization, edges, weight and date. The participant said this closed her main
  complaint.
- **Resolved: how a count weight becomes a distance.** The filtered novel's run reads
  "Distance = 1 / value", which is the conversion she expected. She still wants to see where the
  choice is made, and the weighted betweenness values themselves.
- **Still open: the zero count.** The betweenness histogram popover on the novel still says
  "77 nodes, 47 at 0"; the rank column has 43 true zeros (#35= onward) and networkx agrees. The
  protein result already writes zeros as "10 nodes, all 291=", which she wants on the novel too.
- **Still open: "0.000" beside a distinct rank.** Grantaire 0.000 #34 next to Prouvaire 0.000
  #35= reads as a false tie; she wants "<0.001" or more digits.
- **Precision changes within one number.** Valjean is 0.57 in the run's top nodes, the rebuilt
  table and the inspector, and 0.570 in the ranked table and the popover; Fantine is 0.13 and
  0.130. She read the dropped zero as a possible second rounding.
- **Three inspectors, three answers on provenance.** The rebuilt node inspector separates Results
  from Attributes but files computed degree under Attributes beside the file's group; the table
  screen's inspector puts betweenness under Attributes; the protein run screen puts betweenness
  with its rank under Attributes. She relies on "in the file" versus "computed by the tool".
- **The tie statement exists only on the protein network.** The novel's run shows three top nodes
  and no "1% tie line" sentence; ranks 4 and 5 there (0.132, 0.130) are under 2% apart.
- **"How sure" is still assembled by the reader.** The unweighted run, the weighted run and the
  Valjean-removed run all exist on the novel, on separate screens. She asked for one view with the
  same measure under several defensible choices and where the order changes.
- **Weighted closeness range.** With distances of 1/value most below 1, she doubted that
  "0 to 0.997" is the unrescaled Wasserman-Faust score and would open Details to check.
- **Task path still crosses datasets** for the measure list and the finished-result screens.
- **Praised:** the run record in the Results list; "Exact ... does not say the ranking is
  meaningful"; "At #2 they part"; ties sharing a rank; the Closeness hover card naming
  Wasserman-Faust before the run; the variant word offering Harmonic centrality; "254 edges
  (rows)" beside "254 linked pairs".
