# Cheapest route and most central accounts -- Chris, ML engineer (recommendations)

**Participant:** Chris, senior ML engineer on a retail recommendations team. Lives in notebooks
(networkx, PyTorch Geometric, Spark). Opens a graph GUI a couple of hours a week to look at one
neighbourhood, and compares everything to "15 lines of networkx".

**Task as given by the moderator:** "The transfers have an amount on each one. Find the cheapest
route between two accounts and the most central accounts, and tell me what each answer used."

**Screens seen:** the load step for `transfers-2026-03.csv`; the Apply recipe dialog (binding step),
including its "What a weight means" section; Run a measure and a finished result (run and read);
the Path tool on the March transfers (sets and paths, states 3 to 6); the sets-and-paths flow page;
the table dock (ranked measures on 3,000 accounts, the path's Edges tab, CSV export); the results
panel (finished betweenness, Louvain run record).

Renders the participant looked at (all in study view):
- `../../../shots/record/r4-chris-we2e-load-step.png`
- `../../../shots/record/r4-chris-we2e-binding-step.png`
- `../../../shots/record/r4-chris-we2e-run-and-read.png`
- `../../../shots/record/r4-chris-we2e-sp-s3.png`, `../../../shots/record/r4-chris-we2e-sp-s4.png`,
  `../../../shots/record/r4-chris-we2e-sp-s5.png`, `../../../shots/record/r4-chris-we2e-sp-s6.png`
- `../../../shots/flows__sets-and-paths.png` (the flow page; the study-view render came out blank)
- `../../../shots/record/r4-chris-we2e-table-dock.png`
- `../../../shots/record/r4-chris-we2e-results-panel.png`, `../../../shots/screens__results-panel--finished.png`,
  `../../../shots/record/screens__results-panel--louvain.png`

## Think-aloud

**Before touching anything.** "Cheapest route. OK, so I'm reading that as: the path between A and B
where the sum of amounts is smallest. Amount is the edge cost. That's `nx.shortest_path(G, a, b,
weight='amount')`. 'Most central' is underspecified -- I'd do PageRank and betweenness and see if
they agree. And for betweenness on money I'd want the same weight as the path, otherwise the two
answers aren't even about the same graph. Let's see if it lets me say that."

**Load step.** "Open transfers-2026-03.csv. Good -- it sniffed CSV, from_account to to_account,
directed. 3,000 nodes, 9,113 edges, it shows me the numbers before I commit. Amount is 'Currency
(USD)', timestamp is a date with a range, Mar 1 to Mar 31 UTC. Nice, it actually tells me the
range."

"Role column. from_account 'source', to_account 'target', amount... 'None'. Hm. It's a dropdown.
I'd click that expecting a 'Weight' option." *Reads the HTML to see what the list offers.* "No
Weight in there. OK, and down on the right: 'Weight: amount, not used yet.' So it knows amount is
the candidate and it's refusing to guess. Fine, I actually prefer that to a tool that silently
weights by the first float column. But 'not used yet' -- used by what, when? I'll find out."

"Ids kept as ACC-whatever. Good. Load."

**The Apply recipe dialog.** "This is... a lab recipe on a protein network. Expression overlay,
genes, fold change. Not my data, not my task. I'm skimming." *Stops at the Weight row.* "Wait,
this one's useful. 'For confidence, a higher number means: a closer or stronger link (similarity) /
a longer or costlier step (distance) / more can pass through (capacity) / Don't use.' That's the
actual question. Similarity versus distance. That's the thing that bites everyone in networkx --
you pass a similarity as `weight=` to Dijkstra and it routes through your weakest ties. OK, so
that's the vocabulary this tool uses. Noted. Why was I shown a recipe dialog for a transfer task?
No idea. Moving on."

**Run a measure (protein network).** "Catalog: Betweenness, Closeness, Eigenvector, PageRank,
Louvain... tooltip on Betweenness: 'How often a node lies on the shortest paths between other
nodes.' One line, precise enough. Ctrl+K type 'centr', gives me Run Betweenness etc. Good, that's
my VS Code muscle memory."

"The result popover: 'on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected.
CPU.' That's the denominator line I always want and never get. Scope: Full graph. Weight: 'None
for this run'. OK so here's where I'd pick amount on my graph. But this is still the protein
network -- the mock switched datasets on me. I can't see a weighted centrality on the transfers
anywhere. I'll have to reason from the protein one."

**Path tool, transfers.** "Back on March transfers. Filtered: 1,071 of 3,000 nodes -- somebody left
a filter on. Path tool. From ACC-271813, To ACC-233575, Run is grey. Warning: 'From is outside the
filtered graph. Set Scope to Full graph to search it.' Good. That's exactly the silent bug I'd have
in a notebook -- I'd have run it on the subgraph and got 'no path' and blamed the data."

"Weight: 'amount, not used yet'. So the field SAYS amount, but it's not used. That's confusing
wording in a Weight field. If I glance at it I read 'Weight: amount' and think the path is
weighted." *Looks at state 4.* "Found path, three hops, and the title says '(unweighted)' in grey.
'Paths ignore amount: hops were counted, not dollars.' OK, fair, it does tell me. But only after
the run. On the bar before the run it reads like it's weighted."

"The Edges tab under it: step 1, 2, 3 -- $3,530.28, $9,782.05, $9,616.72. Path order, amounts right
there. That's genuinely nice. That's the 'one hover away' thing I want for recommendations too."

"Ties: '1 of 2 as short'. There are two equally short paths and it tells me. networkx would just
hand me one and I'd never know."

**Telling it amount is a cost.** *State 5.* "Weight row, click, popover: 'amount: what it means.
Applies to every result that reads amount. For amount, a higher number means [a closer or stronger
link].' It's preselected to 'closer or stronger link' in this state. 'A path prefers big
transfers.' No. For cheapest route I want the opposite -- a bigger amount is a costlier step. I'd
switch it to 'a longer or costlier step (distance)'."

*Reads the flow page to see what that produces.* "OK, the flow page has the table. Distance reading:
ACC-271813, ACC-946224, ACC-670564, ACC-233575. 'Found path, 3 hops, distance $22,397.82.' 'Weight:
amount, used as distance.' Let me check: 3,530.28 plus 9,468.23 plus 9,399.31 -- yeah, 22,397.82.
It adds up. And the total is in dollars, not some normalised 0.000489 number. Good."

"But next to it: '(the wrong reading here)'. Wrong for whom? That's the fraud analyst's story --
she wanted strong ties. My question literally says cheapest. The tool, or whoever wrote this, has an
opinion about what amount means on transfers, and my task is the case where the opinion is wrong. If
the product ever shows me a hint like that I'd be annoyed."

"And 'cheapest' across only three hops -- there's no tie any more once it's weighted, it says one
route drawn. Fine. That's what Dijkstra does."

**Most central accounts.** "Table dock on the transfers: Degree and PageRank columns, 'PageRank
damping 0.85, unweighted, full graph', rank of 3,000. The header says the method, the scope and
that it's unweighted. That's the 'what did each answer use' part of the task, basically done for
free. And the CSV export writes the same words into the column header -- 'pagerank (damping 0.85,
unweighted, full graph)'. OK, that I like. My notebook doesn't do that; I lose track of which
column came from which run constantly."

"'The top 10 are the same on both measures, led by ACC-393859.' Degree and PageRank agree. Not
surprising on unweighted, PageRank on a sparse transfer graph is mostly degree."

"Now: I want betweenness weighted by the same cost as my path. Otherwise 'central' means 'on the
most fewest-hop paths' and 'cheapest' means 'fewest dollars' and those aren't the same graph. In the
results panel I'd go Options, Weight, pick amount. And amount already has an answer: distance. So
betweenness reads amount as distance. Good -- that's consistent, betweenness over cheapest routes."

"Then PageRank. PageRank weighted by amount -- I'd want money flowing through an account to count
MORE. That's amount as strength. But the popover said 'Applies to every result that reads amount.'
One answer on the column. I just set it to distance for the path. So what does weighted PageRank do
with a distance? Flip it, 1/w? The popover has a 'How it is converted' thing, collapsed, and the code
comment mentions 1/w, 1 - w, -log w. So weighted PageRank would give big transfers LESS pull. That's
backwards for what I mean by central in a money graph."

"So what do I do -- change the answer on amount to 'stronger link' for PageRank? Then my path is
now... what? Out of date? Silently recomputed with the other meaning? 'Applies to every result that
reads amount' -- does that include the result I already have? I can't tell from any screen here. In
networkx I'd just make two columns, `cost = amount` and `strength = amount`, and pass the right one.
Here I'd probably add a derived column, but I didn't see where. There's a 'New column' item in the
table's header menu, maybe. I'm guessing."

"Honestly, the one-answer-per-column thing is right for most people -- it stops the idiot error of
feeding a similarity to Dijkstra. But my task has two measures that legitimately want opposite
readings of the same number, and the model doesn't have a place for that."

**What each answer used -- can I say it?** "The path: inspector says Query shortest path, Scope
full graph 3,000, Weight amount (used as distance), Direction follows transfers, Ties. Endpoints,
and it marks the start as outside the filter. That's a complete sentence I could paste into a
ticket. The Louvain run record has Method, Seed, Normalization, Weight conversion, Engine, and a
Copy button. That's the MLflow-params panel I wish every tool had. PageRank: the column header
says damping 0.85, unweighted, full graph. Betweenness weighted: I'd expect the same record, but I
never actually saw a weighted betweenness on the transfers, only the unweighted protein one, so
I'm trusting that it would say 'amount, used as distance'."

"No timing on the path. The centrality result had '1.2 s' next to Run 1. Fine."

## My answer to the moderator

"Cheapest route from ACC-271813 to ACC-233575: 3 transfers, through ACC-946224 and ACC-670564,
$22,397.82 total. It used amount as a cost -- I had to tell it that, it refused to guess -- on the
full graph of 3,000 accounts, following transfer direction. The unweighted answer is different:
two equally short routes of 3 hops."

"Most central: unweighted PageRank, damping 0.85, full graph: top 10 same as degree, led by
ACC-393859. I'd also run betweenness with amount as distance so it's consistent with the path;
the screens suggest that works but I didn't see it on this data. Weighted PageRank I would NOT
trust here, because the tool only lets amount mean one thing and I just told it amount is a cost."

## Single Ease Question

**4 out of 7.** The path part was a 5 or 6: it stopped me running on the filtered graph, it refused
to weight by amount until I said what amount means, and the result says exactly what it used. The
centrality part dropped it: the mocks never show a weighted centrality on the transfers, and the
one-meaning-per-column rule fights a task where the path wants amount as a cost and PageRank wants
it as a strength.

## Would I use this instead of my current tool?

"Instead of networkx? No. Next to it, for this kind of question, maybe. The things it does that my
notebook doesn't: it tells me the scope before the run, it tells me there were two tied paths, it
puts amounts and dates on each hop in path order, and every result's column header and run record
says method, scope and weight -- and that survives into the CSV. That's real. What stops me: I
can't make the same column mean two things for two measures, and I'd have to trust that 'applies to
every result that reads amount' doesn't quietly change a path I already wrote down. If I have to
reverse-engineer that, I'm back in the notebook where I know what `weight=` did."

## Problems observed

1. **One meaning per column blocks a two-measure task** (severity 4). The cheapest route needs amount
   as a cost; weighted PageRank needs amount as a strength. The popover says "Applies to every result
   that reads amount", so answering one way for the path forces the other measure onto the wrong
   reading. No screen shows a per-run override or a way to make a second column from amount.
   Quote: "My task has two measures that legitimately want opposite readings of the same number, and
   the model doesn't have a place for that."
2. **Unclear what changing the answer does to finished results** (severity 3). "Applies to every
   result that reads amount" does not say whether the path already found becomes out of date, is
   recomputed, or keeps the old meaning. Quote: "Does that include the result I already have? I
   can't tell."
3. **"Weight: amount, not used yet" reads as weighted before the run** (severity 2). In the Path bar
   the field shows the column name; only the result title "(unweighted)" and the line "hops were
   counted, not dollars" make it clear afterwards. Quote: "If I glance at it I read 'Weight: amount'
   and think the path is weighted."
4. **The flow labels the distance reading "the wrong reading here"** (severity 2). For a question
   about the cheapest route it is the right reading; if the product ever hints the same, it second-
   guesses a correct answer. Quote: "Wrong for whom? My question literally says cheapest."
5. **No weighted centrality on the transfers anywhere in the screens** (severity 2). Run-and-read and
   the results panel use the protein network; the ranked table on the transfers is unweighted only.
   The participant had to infer how a weighted betweenness would be labelled.
6. **Role dropdown next to amount at load has no Weight option** (severity 1). An ML engineer
   reaches for it first; the "Weight: amount, not used yet" line on the right explains it, but only
   if read.
7. **The recipe dialog appears in a task that has no recipe** (severity 1). It was only useful for
   its weight-meaning vocabulary. Quote: "Why was I shown a recipe dialog for a transfer task?"

## What earned praise

- The scope warning before the run: "From is outside the filtered graph. Set Scope to Full graph."
- Refusing to weight by amount until its meaning is given, with similarity / distance / capacity in
  plain words.
- "Ties: 1 of 2 as short" on an unweighted path.
- Weighted path total shown in dollars ("distance $22,397.82"), and it adds up.
- Run headers and CSV column headers that carry method, scope and weight ("PageRank damping 0.85,
  unweighted, full graph").
- The Louvain run record with Weight conversion, Engine and a Copy button.
