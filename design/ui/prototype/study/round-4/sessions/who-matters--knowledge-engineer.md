# Who matters -- Knowledge Engineer (Min-ji)

**Participant:** Min-ji, knowledge graph engineer and ontologist at a financial-services company.
Owns an RDF/OWL enterprise knowledge graph; works in SPARQL, GraphDB and Python notebooks
(networkx, pandas). Mild red-green colour weakness. Knows centrality measures and asks which one.

**Task as given by the moderator:** "You have the Les Miserables co-appearance network open. Find
the few characters who matter most to how the story hangs together, and tell me how sure you are
of their order."

**Screens seen:** the project at rest (Les Miserables), the rebuilt navigation with a character
selected, the main menu's Algorithms list, the Results panel (a Betweenness result on the novel
after a filter; a finished Betweenness result and its table view on a protein network), the
inspector for one node (protein network), and the bottom table dock (the novel with degree and
betweenness ranked side by side; the same table after three filter steps; the column header and
its histogram popover).

Renders the participant looked at (all in the participant's view, design notes hidden):
- `../../../shots/r4-minji-who-frame-at-rest.png`
- `../../../shots/r4-minji-who-nav-new.png`, `../../../shots/r4-minji-who-nav-new-node.png`,
  `../../../shots/r4-minji-who-nav-new-menu.png`
- `../../../shots/r4-minji-who-rp-catalog.png`, `../../../shots/r4-minji-who-rp-filtered.png`,
  `../../../shots/r4-minji-who-rp-finished.png`, `../../../shots/r4-minji-who-rp-in-the-table.png`
- `../../../shots/r4-minji-who-ins-one-node.png`
- `../../../shots/r4-minji-who-td-small.png`, `../../../shots/r4-minji-who-td-stale.png`,
  `../../../shots/r4-minji-who-td-header.png`

## Think-aloud

**Before touching anything.** "'Matter most to how the story hangs together.' That is not a
measure, that is a sentence. If you mean who has the most co-appearances, that is degree. If you
mean who holds it together -- remove them and it falls apart -- that is betweenness, or bridges,
or cut vertices. Those give different answers on this graph; I have seen this graph in every
networkx tutorial for ten years. I am going to read 'hangs together' as brokerage, so betweenness,
and check it against degree. And I want to know which betweenness."

"Also, it is a property graph with one edge attribute. Not my world. No classes, no predicates.
Fine, it is a demo; I will judge it on whether it tells me the truth about the numbers."

**Project at rest.** "Les Miserables, 77 nodes, 254 edges, density 0.0868, one connected
component. Those match what I remember from networkx -- 77 and 254. Good, it did not invent
anything on load. 'Loaded: miserables.json, undirected, value not used yet.' OK -- so there is an
edge attribute called value, the number of scenes two characters share, and it is telling me it is
ignoring it. I like that it says so. Most tools weight silently or ignore silently."

"The legend: 'Group color. 2, 8, 4, 1, 3, 5, 0, Other.' Group of what? Who assigned group 2? It is
a column in the file, I assume, but nothing on this screen says where it came from or what it
means. And the labels, 'the 18 characters with the most connections' -- connections meaning
degree, unweighted, I assume. Fine."

"Colours: the orange and the vermillion are close for me, 2 and 3. The green and the vermillion,
4 and 3, I can tell apart, but I am reading the legend numbers, not the hue. Not a blocker here
because I do not care about the groups for this task."

"Is position meaningful? Force-directed. No. Valjean is in the middle because he is connected to
everything, which is already a hint, but I do not read centrality off a layout."

**Looking for where to run a measure.** "Results, with a plus. That is where computed things go,
I assume. In the other frame the hamburger menu has Algorithms, Centrality: Betweenness,
Closeness 'WF-corrected', Eigenvector, Harmonic, HITS, Katz, PageRank. Good -- a real list, named
properly. 'WF-corrected' on Closeness -- Wasserman-Faust, for disconnected graphs. Someone here
knows the literature. That buys some trust."

"But that menu is on the protein graph. The moderator said Les Miserables. Why am I looking at
MAPK1? ... OK, I am told this is the same menu. I will take it. But in a real test, if the screen
changed dataset under me I would stop and ask what I loaded."

**Selected Valjean (navigation frame).** "Now the novel again, Valjean selected. Inspector: group 2,
degree 36. Results: betweenness 0.57, highest. Bridges: on no bridge."

"Wait. The graph-level Results list, before I selected him, showed one thing: Bridges, done.
Nothing about betweenness. So where did 0.57 come from? Which run? Exact or sampled? Weighted?
If a number shows up on a node and there is no run behind it in the list, I do not know what it
is."

"And the table underneath is 'sorted by betweenness': Valjean 0.57, Myriel 0.177, Gavroche 0.165,
Marius 0.132, Fantine 0.13, Thenardier 0.075. Those are the networkx unweighted, normalized
numbers. I know them. Myriel second."

"Myriel second is the classic trap. The bishop is in the first book only. He is 'central' because
nine or so minor characters -- Napoleon, the Count, Old Man, Cravatte -- appear only with him.
Every shortest path to a leaf goes through the node it hangs from. That is not holding the story
together, that is holding up the bishop's own chapter. So the measure is right and the reading
would be wrong."

**The table with both rankings (small graph).** "This is the one. Columns: degree with rank of 77,
betweenness 'exact, unweighted, full graph' with rank of 77. Good -- every qualifier I would have
asked for is in the column header. Exact, unweighted, full graph. That is what I would write in a
methods section."

"And a sentence above the table: 'Valjean is #1 on both measures. At #2 they part: Gavroche by
degree, Myriel by betweenness.' That is exactly the question I would ask first. I would normally
write a pandas merge and a rank correlation to get this sentence. 'Compare rankings...' presumably
a scatter of rank against rank. Fine."

"Ties share a rank, #6= Enjolras and Fantine on degree. Correct handling. Many tools break ties by
row order and pretend there is an order."

"Now the known-answer check. Scroll down the betweenness ranks. Brujon 0.000, rank #31. Mme.
Pontmercy 0.000, #32. Magnon 0.000, #33. Grantaire 0.000, #34. Then Prouvaire 0.000, #35=, and
everyone else 0.000 #35=. So four characters show 0.000 but have their own ranks -- they must be
tiny nonzero values rounded to three places. That makes 43 true zeros."

"Now the column header. Click the little distribution, betweenness popover: '77 nodes, 47 at 0.'
Forty-seven. The ranks say forty-three. One of them is counting 'rounds to zero' as zero. That is
precisely the kind of thing I stop trusting a tool over. It is four characters with nothing to do
with the answer, but if the histogram and the rank column disagree about how many zeros there
are, which one of them is wrong elsewhere? I would check it in a notebook -- and in my notebook,
networkx says 43 exactly zero. So the popover is the one that is off. And the table showing
'0.000' next to a distinct rank needs more digits or a less-than sign, '<0.001', or it looks like
a tie that is not tied."

"Also the inspector here puts betweenness 0.57 under 'Attributes', next to group, which came from
the file. On the protein screen the inspector says 'from ppi-core-300.graphml' versus 'counted by
graphty' and puts results in their own Results section with rank. That is right. Here it is all
one bag. For me provenance is the whole point -- was this in the data, or did the tool compute it
-- and the two screens disagree on whether it is shown."

**Results panel, after a filter (60 of 77).** "Here is a Betweenness result on the novel, but
someone filtered to degree 2 or more first. 'Filtered: 60 of 77 nodes, 1 step.' 'on: filtered
graph, 60 nodes, 1 component.' Scope is said twice. Good."

"Top 5: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073. Myriel is gone
-- of course, his leaves were cut, so he brokers nothing. This screen alone would have misled me if
I did not know a filter was on, but it does say it, in two places, so I cannot miss it."

"Details, the run record: Brandes, exact, every node is a source. Normalization divided by
(n-1)(n-2)/2 = 1,711 pairs, n = 60, the filtered graph. Weight conversion: none, value not used.
Engine WebGPU. That is a proper provenance record. I would paste this into a ticket. Copy button,
good."

"'Every step in the top 5 is over the 1% tie line; the smallest, ranks 2 and 3, is 4.7%.' Hm. So
it is telling me the numbers are not tied. Gavroche 0.172 versus Marius 0.164, about 5% apart. OK,
that is honest about numeric separation. But that is not what 'how sure' means. 'How sure' is:
would the order survive a different reasonable choice. Weighted or not. Leaves in or out. That, it
does not tell me. The little (i) on Exact says 'It does not say the ranking is meaningful.' Thank
you. That is the most honest tooltip I have seen in a graph tool."

"'Weight: value, not used yet. Change...' So I could run it weighted. But value is a count of
shared scenes: more scenes means closer, and shortest-path betweenness reads weight as distance.
If Change just plugs 'value' in as a distance, it will rank the characters who share the most
scenes as farthest apart. I want to see what Change... offers -- invert, or 1/value -- before I
trust a weighted run. None of these screens show it for this graph."

"So I run it myself in my notebook, weighted with distance = 1/value: Valjean 0.79, Marius 0.50,
Myriel 0.22, Fantine 0.19, Courfeyrac 0.18, Thenardier 0.17. Gavroche drops out of the top five
entirely. So everything below Valjean moves when you change one defensible choice."

**Table after three filter steps.** "Filtered 27 of 77. Betweenness header says 'full graph,
Out of date, Re-run'. Degree says 'filtered graph, rank of 27'. Good -- it will not let a stale
measure pass for a current one, and it dropped the agreement sentence because one measure is out
of date. That is right."

"But the label column still says '77 values' while the table lists 27 rows, and the Graphs list on
the left says 'Co-appearances 77 nodes' while the filter chip says 27 of 77. The results-panel
screen showed '60 of 77' in that same Graphs row under a filter. So which is it -- does that row
follow the filter or not? Small, but counts are what I check first."

**Protein screens (results finished, table, inspector).** "Different dataset, but the pattern is
the same: rank columns 'of 300, ties share', PageRank next to betweenness, a histogram, the
inspector with '#2 of 300' beside each result. If the novel had this full-graph result panel I
would have used it. It is fine for a demo."

## Answer to the moderator

"Jean Valjean, first, and I am sure of that: he is number one on degree, on unweighted
betweenness, on the filtered graph, and on the weighted run I did in my notebook. That does not
depend on any choice."

"After him there is a tier: Marius, Gavroche, Fantine, and then Javert and Thenardier. Marius is
the most robust of those -- top four on every variant I looked at. I would not give you an order
inside that tier. Gavroche is #2 by degree and by betweenness once the one-off characters are
removed, but he falls out of the top five when you weight by shared scenes. Myriel is #2 on plain
betweenness, and that is an artefact of the leaf characters who appear only with him; I would
leave him out of 'how the story hangs together'."

"So: one I am certain of, four or five I am confident belong in the set, and no order I would
defend among them. The tool told me that the numbers are exact and not tied, and it was honest
that exact does not mean meaningful. It did not tell me the order is fragile -- I found that
because I know this graph and ran a weighted version myself."

## Single Ease Question

**4 of 7.** "The table with the two rank columns and the 'at #2 they part' sentence did half my job
in one glance, and the run record is what I would want in every tool. But I had to piece the task
together across three datasets, I could not see a full-graph betweenness result on this graph,
a betweenness value showed up on a node with no run behind it, and the zero count disagreed
between the histogram and the ranks. For 'how sure', I had to go to my own notebook."

## Would she use this instead of her current tool?

"No. Not for my work -- there is no way to get RDF in, and nothing here knows a class from an
instance, so for the knowledge graph it is not a candidate. For a question like this one on a
small property graph, the ranked table with the agreement line and the run record is better than
what I would throw together in pandas in ten minutes, and I would show the run record to my
colleagues as the standard. But I would still recompute the numbers in networkx before I put them
in a report, because of the 43 versus 47 zeros, and because nothing here tells me whether the
order survives weighting or dropping the leaves. If it showed me that -- the same ranking with
and without weights, with and without degree-one nodes, and where the order changes -- I would
trust it more than my notebook, because I usually skip that step."

## Observations for the study team

- **Task path crosses datasets.** The screens that carry a full-graph Betweenness result, its
  table view and the one-node inspector exist only for the protein network; the novel has only a
  filtered result. The participant accepted it, but called it a stop-and-ask moment in a real test.
- **Count mismatch in the table dock.** The betweenness histogram popover says "77 nodes, 47 at 0";
  the rank column has 43 true zeros (#35=) and four rounded-to-0.000 values with their own ranks
  (#31 to #34). Networkx: 43 exact zeros. A known-answer check caught it within the session.
- **"0.000" next to a distinct rank** reads as a false tie; she wanted "<0.001" or more digits.
- **A value with no run.** With Valjean selected, the node's Results show betweenness 0.57, but the
  graph's Results list holds only Bridges; nothing says which run produced the number.
- **Provenance is inconsistent across inspectors.** The novel's inspector lists betweenness under
  Attributes with the file's group column; the protein inspector separates "from the file",
  "counted by graphty" and Results. She relies on that split.
- **Graphs row count under a filter** reads "77 nodes" in the three-step table and "60 of 77" in
  the filtered results panel.
- **Numeric tie line versus robustness.** The "1% tie line" statement and the Exact tooltip were
  praised as honest, but "how sure" to her means sensitivity to modelling choices (weighting,
  leaf characters, filtering); she found the order below #1 unstable only by recomputing.
- **Weight as distance.** "Weight: value, not used yet. Change..." raised the question whether a
  co-occurrence count would be converted to a distance for shortest paths; no screen for this
  graph answers it.
- **Group legend has no provenance or meaning** on the frame at rest ("2, 8, 4..."). Orange and
  vermillion (groups 2 and 3) were close for her colour vision; she read the numbers instead.
- **Praised:** column headers that carry "exact, unweighted, full graph"; shared ranks for ties;
  the agreement sentence "At #2 they part"; the run record with normalization n and Copy; the
  Out of date / Re-run header that drops the agreement line; the Exact tooltip "does not say the
  ranking is meaningful"; "WF-corrected" on Closeness.
