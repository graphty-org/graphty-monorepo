# Weighted path and centrality, end to end -- Expert Emma

**Participant:** Expert Emma, network scientist, lives in networkx and igraph, uses Gephi for the one
figure a deck needs.

**Task as given:** "The transfers have an amount on each one. Find the cheapest route between two
accounts and the most central accounts, and tell me what each answer used."

**Screens seen (study view, transfers dataset where the page offers it):** frame-at-rest (at rest and
the file popover), sets-and-paths (states s1 to s9), run-and-read (catalog, money search, money read,
quick search, rank, done), weight-role-trap (a1 to a6), results-panel (finished, variant, in the
table), table-dock (ranked, edges, header).

Renders: `shots/r6-emma-we2e-*.png`.

---

## Think-aloud

### 1. Landing on the transfers graph (frame-at-rest)

"Transfers, March 2026. 3,000 nodes, 9,113 edges, 'rows' in brackets, fine, and a linked-pairs count
equal to the edge count, so no multi-edges collapsed. One weak component. Density 0.00101. Good, that is
my first minute done without asking."

"And the line I actually came for: 'direction followed, amount not used yet. Change...'. Right. That is
the sentence I have been asking tools for since Gephi ran Louvain without weights. It says the weight
exists and nothing is reading it. I believe that more than I believe a checkbox."

"'Nothing has been sent from this project', and the file popover says projects are kept in this browser.
OK. I would still click 'Where your data goes' before I opened a client file, but the answer is at least
on the first screen."

"Hexagons. It is drawing 3,000 accounts as density. Fine, I did not want the hairball."

"Question one: cheapest route. What does 'cheapest' mean on a transfer graph? Nobody pays to route
money through an account; amount is not a fee. Taken literally it is the route with the smallest total
amount moved: distance equals amount, minimize the sum. That is the reading I will go with, and I am
going to check the tool does not quietly pick the opposite one."

### 2. The path tool (sets-and-paths)

"There is a path icon in the bottom toolbar, the one that looks like a route. From, To, Scope, Weight.
'Weight: amount, not used yet'. So the path bar also says it is not using amount. Consistent with the
statistics panel. Good."

"s3: I typed ACC-271813 to ACC-233575, and it refuses because From is outside the filtered graph --
'Set Scope to Full graph to search it.' Honest error, names the limit. I would have preferred it to
just offer the button, but fine."

"s6: 'No directed path; one exists ignoring direction' with an 'Ignore direction' button. That is
correct behaviour. It did not silently symmetrize my graph. I like that more than I will say out loud."

"s4: there is a result. 'Found path (unweighted)', 3 hops. Right panel: Weight 'amount, not used yet',
and under it 'Paths ignore amount: hops were counted, not dollars.' Ties: '1 of 2 as short'. Somebody
here has been burned before. That is exactly what I want to see on a result: what it used, and that
there was a tie."

"The edge table under it: three rows, step 1 to 3, amounts $3,530.28, $9,782.05, $9,616.72. So this
hop-shortest route moves about $22,900. That is not the answer to my question; that is the fewest hops."

"The edges state of the table shows both tied hop paths, 'Sum of amount, 5 rows: 41,796.59 USD'. Handy
footer, but again, that is a sum over two hop-shortest paths, not a weighted path."

"s5: now there is a popover on the path, 'Found path', with a Re-run button. Weight: amount. 'In this
run, a bigger amount means: a closer or stronger link'. 'Distance = 1 / amount. The path prefers big
transfers.'"

"Stop. That is the opposite of cheapest. If I press Re-run like this I get the route through the
biggest transfers and a tool that calls it the shortest path. Now -- did I choose 'closer or stronger',
or did it come filled in? On this screen I cannot tell. The betweenness editor on the other page
(weight-role-trap, a2) makes me pick, 'Choose...', Run disabled with 'Choose what a bigger value means
first'. That is the right design. If the path popover pre-fills 'closer or stronger' for money, that is
the Gephi trap all over again, just with a nicer sentence under it. If it was my pick, fine. The mock
does not tell me which, and I would click Re-run on autopilot."

"I would open that dropdown and, going by the betweenness editor, expect two choices: 'a longer or
costlier step, Distance = value' and 'a closer or stronger link, Distance = 1 / value'. For cheapest I
want the first. The formula written under each option is what makes this usable: I can check it against
networkx's `weight=` without reading source. Good."

"Then I press Re-run and... there is no screen with the weighted result. I never see the cheapest route,
its total, or a 'Found path (weighted, distance = amount)' header. I am taking it on faith that the name
changes from '(unweighted)' and the Weight row changes from 'not used yet'. So for question one I can
tell you what the unweighted answer used, and I can tell you where I would set the weighting, but I
have not seen the cheapest route."

"Also: is it Dijkstra? Amounts are positive, so Dijkstra is fine, but a line saying 'Dijkstra, directed,
distance = amount' on the result would cost them nothing."

### 3. Most central accounts on the transfers (run-and-read)

"'Most central' -- which centrality? I would do weighted betweenness for brokers in money flow and
PageRank on the directed graph for where money pools. Let me see what it offers for transfers."

"Typing 'money' in the command box: 'Run Money in', 'Money out', 'Money in minus out', then 'Links in
(count)', 'Links out (count)'. Those are strength and degree. Useful, and they are labelled honestly --
'sums of amount, in dollars' versus 'counts of transfers, not money'. But that is not centrality. If a
junior brought me 'Money in' as 'the most central account' I would send them back."

"The money-read screen: ACC-393859 at $440,784 in, #1 by links too. ACC-893168 is #3 by money and #37 by
count: 'fewer and larger' transfers. That sentence is actually a finding. Options: Sums amount,
Direction In. It states what it used. Good. Still not centrality."

"Where is betweenness on the transfers graph? Every centrality screen I can find is on the protein
network or Les Miserables. On transfers I never see the betweenness editor with 'amount' in the Weight
field. So I have to assume the same editor appears here. I will work from the Les Mis one."

### 4. The weight question in the centrality editor (weight-role-trap)

"a1, the import: 'Edge attribute value, whole numbers, 1 to 31; most edges 1 to 3', with a histogram,
and 'A measure that reads value asks, each time it runs, what a bigger value means.' That is the right
place to warn me, at import, before I have run anything."

"a2: Betweenness. Scope, Weight 'value', then 'In this run, a bigger value means: Choose...', and Run is
greyed out until I answer. Yes. This is the one thing I would put on a slide for other tool builders.
No default."

"a3: the two options, each with its formula. 'a longer or costlier step, Distance = value'. 'a closer or
stronger link, Distance = 1 / value, such as a count of shared scenes'. The example is for Les Mis; for
my transfers I would want to think about it, but the formulas let me."

"a4: 'Run 1. Distance = value' in the run list, and the table column says 'Sorted by betweenness', range
0 to 0.454. The run records its reading of the weight. That is 'what did the answer use', answered in
the list, not buried."

"a5: I change my mind to 'closer or stronger'. The run is marked 'Out of date', the button says 'Re-run
(keeps Run 1)', and the old top 5 is still shown with 'Distance = value' in the heading. Nothing
silently overwritten. Good."

"a6: Run 2, 'Distance = 1 / value', top is Valjean 0.795, then Marius, Myriel. The two runs sit side by
side in the list with their formulas. Gavroche drops from #2 to #7 between them. That is the whole point
of asking, and it is visible."

"But: 'Normalized' is a switch, on. Normalized how? By (n-1)(n-2)? Divided by 2 for undirected like
networkx? igraph does not normalize by default. I cannot put 0.795 in a report without knowing, and I
cannot compare it with my notebook. The toggle needs one line of formula, the same way the weight
options have one."

"And the table shows one betweenness column for Run 2. To compare Run 1 and Run 2 per account I would
want both as columns. There is a 'Compare with...' elsewhere; I would try that."

### 5. Reading the result (results-panel, table-dock)

"results-panel finished: 'on: full graph, 300 nodes, 3 components. Exact. Undirected. WebGPU. Weight:
confidence, not used yet. Change...'. Scope, exactness, direction, hardware, weight. That is most of my
provenance line. 'Exact' has a tooltip: 'Computed on every node, not estimated. It does not say the
ranking is meaningful.' Somebody has read the same referee reports I have."

"'Every step in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%.' Ties, stated.
Distribution with its bar-height scale named. Legend says log scale. I have no complaint I can make
without a number."

"The closeness variant: 'Wasserman-Faust corrected' named in the header and explained. That is the
difference between a number I can cite and one I cannot. Why can the closeness variant be named and the
betweenness normalization cannot?"

"Small inconsistency: on the run-and-read version of the same run it says 'Exact. Unweighted,
undirected. CPU.' and on the results panel 'Exact. Undirected. WebGPU. Weight: confidence, not used
yet.' Same numbers to four places, different hardware. If it is two different runs, fine, but I noticed
and a reviewer would."

"The table with the ranking in it: column headers carry 'exact, full graph', 'PageRank damping 0.85,
unweighted', 'Louvain weighted, seed 7'. That is it. That is what 'tell me what each answer used' looks
like. Every column says its own settings. 'Export table...' is there. '#4=' marks exact ties, 'near #7'
marks near ones. I would export this and check against networkx before I trusted it, but the header
alone saves me a paragraph of methods."

"Louvain, though. 'Louvain weighted, seed 7'. Weighted by what, with what resolution? Next round."

---

## Answer to the moderator

- **Cheapest route:** Not found. The only route I saw is the fewest-hops route, ACC-271813 to
  ACC-233575, 3 hops, about $22,929 moved, one of two tied routes. The tool says clearly that it used
  hops, not amount ("Found path (unweighted)", "hops were counted, not dollars"). I found where to make
  amount the distance (the path's popover, "In this run, a bigger amount means"), but it showed "a closer
  or stronger link, Distance = 1 / amount", which is the opposite of cheapest, and no screen shows the
  result after Re-run. Used: hop count, directed, full graph.
- **Most central accounts:** On the transfers I only found strength, not centrality: Money in (sum of
  amount into each account, directed in) puts ACC-393859 first. For real centrality I had to go to the
  other datasets: betweenness asks what a bigger weight means before it will run, records "Distance =
  value" or "Distance = 1 / value" on each run, and keeps both runs. Used: scope, exact, direction,
  hardware and weight reading are all stated. Not stated: what "Normalized" divides by.

## Single Ease Question

**4 out of 7.**

"The pieces are right and some of them are better than anything I use. The run that refuses to start
until I say what the weight means, and then writes 'Distance = 1 / value' next to the run, is the
single best thing here. The column headers that carry their own settings are the second. But I did not
finish the task. I never saw a weighted path, the path popover showed me the wrong reading for 'cheapest'
with no sign of whether I chose it, and there is no centrality screen on the transfer data at all. I
spent my effort stitching Les Miserables onto bank transfers."

## Would I use this instead of my current tool?

"No, not for the analysis. The notebook wins: I get weighted Dijkstra and weighted betweenness in two
lines with the normalization I choose, and it is reproducible. Nothing here shows me an API, and I
cannot see normalization."

"Yes, maybe, for the hand-off. If I could send a fraud investigator this view with the path tool,
with the 'hops were counted, not dollars' line and the weight question in front of them, they would get
fewer things wrong than they do with a Gephi file. That is a real use. Fix the path popover so money
starts at 'Choose...' like betweenness does, show me the weighted result, and put a formula next to
'Normalized', and I would try it on a client file."

---

## Problems observed

| Where | What happened | Severity (1 low - 4 blocks) |
|---|---|---|
| sets-and-paths s5 | Path popover shows "a bigger amount means: a closer or stronger link" already set, with no sign whether the user chose it. For money that is the reverse of "cheapest"; the betweenness editor forces a choice, the path editor appears not to. | 3 |
| sets-and-paths | No state shows a weighted path result after Re-run: no header change, total or distance rule on the result. The cheapest route is never seen. | 3 |
| run-and-read, results-panel | No centrality run on the transfers dataset; weighted centrality is shown only on proteins and Les Miserables. The transfer-data search offers strength (Money in/out) and counts, not centrality. | 3 |
| weight-role-trap a2-a6 | "Normalized" switch with no formula; cannot compare with networkx or igraph. | 2 |
| run-and-read rank vs results-panel finished | The same betweenness numbers say "CPU, unweighted" in one and "WebGPU, weight: confidence, not used yet" in the other. | 1 |
| path result | The algorithm is not named (Dijkstra or otherwise) on the path result. | 1 |
| weight-role-trap a6 | After Run 2, only one betweenness column remains in the table; comparing the two runs per node needs another step. | 1 |
| table-dock ranked | "Louvain weighted, seed 7" does not say which weight or which resolution. | 1 |

## What delighted her

- Frame at rest says "direction followed, amount not used yet" before anything is run.
- "Found path (unweighted)" and "Paths ignore amount: hops were counted, not dollars", plus "Ties: 1 of 2
  as short".
- Betweenness will not run until "a bigger value means" is answered, and each choice shows its
  distance formula.
- Runs listed as "Run 1. Distance = value" and "Run 2. Distance = 1 / value", the old run kept and
  marked out of date instead of overwritten.
- Table column headers that carry their own settings ("PageRank damping 0.85, unweighted", "exact, full
  graph").
- "No directed path; one exists ignoring direction" instead of silently making the graph undirected.
- Wasserman-Faust named for closeness, and "Exact" explained as not a claim that the ranking means
  anything.
