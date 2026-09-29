# Session: weights end to end -- network scientist (Emma)

Participant: Emma, network scientist and consultant (study/personas/expert-emma.md). She lives in
networkx and igraph, uses Gephi for the one figure, and checks weight handling in every tool
because she has been burned by it before.

Task as given: "The transfers have an amount on each one. Find the cheapest route between two
accounts and the most central accounts, and tell me what each answer used."

Material worked from, as the participant sees it (study view, 1440 x 900, rendered fresh for this
session):

- the load step on the March transfers file (shots/r4-emma-e2e-ld-clean.png) and a file at rest
  after Load (shots/r4-emma-e2e-ld-loaded.png)
- the Path tool bar with its scope warning, the found path, and the "what amount means"
  popover (shots/r4-emma-e2e-sp3.png, -sp4, -sp5), plus the sets-and-paths flow page for what
  the path form offers
- the Algorithms menu, a finished Betweenness result, a Louvain result with its run record open
  (shots/r4-emma-e2e-rp-cat.png, -rp-fin, -rp-lou; screens/results-panel)
- the node table with ranked result columns (shots/r4-emma-e2e-td-ranked.png, -td-edges) and the
  run-and-read rank state (shots/r4-emma-e2e-rr-rank.png)

Page HTML was read only to see what a control does when clicked. The centrality screens are drawn
on a protein network, not the transfers; the only transfers centrality she sees is a PageRank
column header in the table page. She reads them as "this is what the transfers would look like".

## Think-aloud

**1. The load step.** (ld-clean)

"transfers-2026-03.csv. Each row is an edge, from_account to to_account, directed. Good, it
guessed directed and it says so. amount: read as Currency (USD), Role... None. Can I make it a
weight here? The Role list -- no. There's no Weight in it. At the bottom: 'Weight: amount, not
used yet'.

"Mixed feelings. In networkx I'd write weight='amount' on the call, not on the load, so fine, it
matches how I think: the graph has an attribute, the algorithm decides whether to read it. And
'not used yet' is honest. What I don't want is some later screen quietly deciding for me. I'll
watch for that.

"3,000 nodes, 9,113 edges. No word on multi-edges. Two accounts that transfer to each other five
times -- is that five edges or one with a summed amount? That changes a cheapest route
completely. The loaded-file page for the protein data talks about 'pairs that appear more than
once, each pair's rows kept', so I'll assume parallel edges are kept. For a shortest path that
means it takes the cheapest single transfer between two accounts, which is what I'd want. For
betweenness it's the same. For PageRank, parallel edges add up. I'd want that written down
somewhere. I'll look for it in the result."

Load.

**2. The Path tool.** (sp3)

"Path tool, second icon in the bottom toolbar. From ACC-271813, To ACC-233575. Scope: 'Filtered
graph' with a warning, and a line: 'From is outside the filtered graph. Set Scope to Full graph to
search it.' Okay, someone left a filter on -- riskScore 20 or more, the inspector says. That's a
real trap and it caught it. Run is grey until I change it. Good. Full graph.

"Weight: 'amount, not used yet'. It's a dropdown. So I can pick amount here. The flow page says
picking amount makes Run refuse until I say what amount means. Fine. But I want to see what it
does by default first, because that's what a junior would get. Run."

**3. The found path.** (sp4)

"'Found path (unweighted)'. 3 hops. And in the inspector: 'Weight: amount, not used yet. Paths
ignore amount: hops were counted, not dollars.' Thank you. That sentence is exactly right; it's
the sentence Gephi never writes. 'Ties: 1 of 2 as short' -- so two 3-hop routes exist and it drew
one. I like that it tells me; networkx just hands you one and you never know. 'Direction: follows
transfers.' Scope: full graph, 3,000. Endpoint 'outside filter'. That is basically a run record.

"The edges table below: 3 transfers, $3,530.28, $9,782.05, $9,616.72. So this unweighted route
costs about $22,900. That's not the cheapest route, it's the fewest-hops route. Now the weight."

**4. What amount means.** (sp5)

"I click the Weight row. A popover: 'amount: what it means. Applies to every result that reads
amount. For amount, a higher number means [a closer or stronger link]. A path prefers big
transfers.'

"No. Stop. Why is 'a closer or stronger link' already filled in? I didn't pick that. If I'm tired
and I click Run, I get the route through the BIGGEST transfers, which is the opposite of what I
was asked. For this task the reading is obvious: amount is a cost. Cheapest route is minimum total
amount, sum of weights, plain Dijkstra with weight='amount'. I open the list. The flow page says
the options are 'a closer or stronger link (similarity) / a longer or costlier step (distance) /
more can pass through (capacity) / Don't use amount'. I pick 'a longer or costlier step'.

"Then I read the flow page's own table, and it calls the distance reading of amount 'the wrong
reading here... Treating money as a cost makes the strongest ties the longest.' That depends
entirely on the question! If I'm asking which accounts are closely tied, sure, big transfers are
strong ties. If I'm asking the cheapest way to move money from A to B, amount is a cost. The tool
doesn't know my question, and whoever designed that default thinks it does. At least it asks.
But the preselected answer in the dropdown is a leading question.

"'How it is converted' -- collapsed. The notes say 1/w is the default for similarity to distance.
For my pick, distance, there should be no conversion at all. I'd open it to check it says
'used as given'. If it said 1/amount for a distance I'd close the tab.

"And the path result would say, per the flow page: 'Found path, 3 hops, distance $22,397.82';
'Weight: amount, used as distance'. Good -- the total in dollars, the reading named. Through
ACC-670564 instead of ACC-242954. About $500 cheaper than the hop route, and the tie is gone.
That's my first answer, and the inspector's Created from block is what it used: shortest path,
full graph, amount as distance, follows transfers."

**5. The catch: 'Applies to every result that reads amount'.**

"Now read that first line again. 'Applies to every result that reads amount.' So amount is now a
distance for everything. That's fine for betweenness -- weighted betweenness wants a distance,
shortest paths by cost. It's wrong for PageRank. In PageRank the edge weight is a transition
probability; a bigger transfer should carry more of the walk. If PageRank reads amount 'as a
distance', what does it do -- invert it? So the biggest transfers matter least? Or does PageRank
simply refuse a distance? Nothing on these screens tells me. The weight-role page I was not
shown apparently has a 'Detach: read value another way for this run only', but on my screens I
don't see it. On the results panel the Weight row just says a value and 'Change...'.

"This is the core of it. In code, the meaning of a weight is a property of the CALL, not the
column: nx.shortest_path(G, weight='amount') and nx.pagerank(G, weight='amount') are both
correct and read the same number in two different ways, and nobody gets confused. Here it's one
answer per column. For this dataset, 'cheapest route' and 'most money flows through' need amount
read two ways in the same session. Either I flip the column back and forth -- and then which
results go out of date? -- or I make a copy of the column. I'd make a copy. amount_cost and
amount_flow. That's a workaround and I'd be annoyed doing it."

**6. Most central.** (rp-cat, rp-fin)

"Menu, Algorithms. Centrality: Betweenness, Closeness 'WF-corrected' -- somebody knows
Wasserman-Faust, nice -- Eigenvector, Harmonic, HITS, Katz, PageRank. 'Most central' isn't one
thing. On transfers I'd run two: betweenness weighted by amount as cost (who sits on the cheap
routes, the brokers) and PageRank on the directed graph (where money ends up). I'd report both
and say they disagree, because they will.

"Betweenness result. It's the protein data, so I read the shape. The state line: 'on: full
graph, 300 nodes, 3 components. Exact. Undirected. WebGPU. Weight: confidence, not used yet.
Change...' Every one of those words is something I'd write in a methods section. Exact versus
sampled, the scope, directed or not, what hardware -- fine -- and the weight state. On transfers
it would say 'Directed. Weight: amount, used as distance' if I'd done step 4 first. If I hadn't,
it would say 'not used yet', and I'd see it. Good.

"Top nodes with values to four places, and 'Every step in the top 5 is over the 1% tie line'.
I'd want to know how that 1% was chosen but it's a sensible caution. Normalization -- not on the
face. Is this betweenness divided by (n-1)(n-2), or by 2 for undirected, or raw? MAPK1 0.1379 on
300 nodes looks normalized. I need to know which, because networkx and igraph differ here and I
will check against one of them."

**7. The run record.** (rp-lou)

"Details. 'Run record: Method: Louvain, weighted modularity, resolution 1. Seed: 7. Normalization:
modularity divided by twice the total confidence of all edges. Weight conversion: confidence used
as given, 0.40 to 0.99, as similarity: higher = stronger link. Engine: CPU: Louvain has no
WebGPU version.' And a Copy button.

"That's it. That's the thing I wanted. Seed, resolution, the normalization written as a formula
in words, the weight's range and reading. If Betweenness has the same block with 'Normalization:
divided by (n-1)(n-2), directed' and 'Weight conversion: amount used as given, as distance', then
'tell me what each answer used' is: open Details, press Copy, paste. That part I'd trust.

"I didn't see a Betweenness run record, only this Louvain one, so I'm assuming it has the same
rows. If Betweenness's Details doesn't state normalization, the whole thing is worth half as
much."

**8. The table.** (td-ranked)

"Column groups named 'Betweenness exact, unweighted, full graph', 'PageRank damping 0.85,
unweighted, full graph'. The method and the weight state are in the header, and the page says the
CSV header carries the same words. That's what I'd hand on to R. 'unweighted' in the header is
correct and I'd want 'weighted: amount as distance' there when it's weighted -- the header
examples I see are all unweighted or 'Louvain weighted', which doesn't say weighted BY what or
READ HOW. 'weighted' alone is not enough when the same column can be read two ways.

"On the transfers page, 'PageRank damping 0.85, unweighted, full graph', and degree labelled
'total, full graph'. In-degree or out-degree or total -- it says total. Good. For PageRank on a
directed graph I'd also want dangling-node handling stated, but I'll accept damping as enough on
the face and the rest in Details."

**9. What each answer used, as I'd tell the moderator.**

"Cheapest route: shortest path, ACC-271813 to ACC-233575, full graph -- not the filtered one I
started in -- directed along transfers, amount read as a cost with no conversion, total
$22,397.82 over 3 hops, one route, no tie. It came from the inspector's 'Created from' block.
Before I set the weight it was a 3-hop fewest-transfers route with a 2-way tie, and it said so.

"Most central: betweenness, exact, directed, full graph, amount as a cost -- from the state line
and Details. And I'd want PageRank unweighted or amount as flow, which I can't set on the same
column without the other result changing under me. I'd report PageRank unweighted and say so,
because that's what the tool let me do cleanly."

## Single Ease Question

4 out of 7.

"The reading-back part is a 6. The path's Created from, the state line, the run record with
Copy, the table headers -- I can say exactly what each number used, which I can't in Gephi. The
setting-up part is a 3: the weight question has an answer preselected, and it's the wrong one for
this task; and one meaning per column means I can't do cheapest route and money-weighted PageRank
side by side without copying the column."

## Would she use it instead of her current tool

"Instead of networkx? No. Nothing on these screens is callable from my notebook, and 'the
cheapest route by amount' is one line of code for me. Instead of Gephi, for the part where I
hand a fraud investigator something to click around in -- yes, possibly, and that's a bigger
compliment than it sounds. The investigator can find a path and the tool tells them it counted
hops, not dollars. Gephi would never tell them that. I'd check two numbers against networkx
first: the weighted path total and the top-5 betweenness with the normalization from Details.
If they match, I'd use it for handing work on. If the dropdown default stays on 'closer or
stronger link', I'd warn every junior I gave it to."

## Problems observed

1. **The weight question arrives with an answer already filled in.** The "what amount means"
   popover shows "a closer or stronger link" selected before she has chosen anything, with "A path
   prefers big transfers." For "cheapest route" that is the opposite of the task. The flow page
   also calls the cost reading of money "the wrong reading here", which assumes one question.
   Severity 4 (a tired or junior user clicks Run and gets a confidently wrong route).
   Quote: "Why is 'a closer or stronger link' already filled in? I didn't pick that."
2. **One meaning per column blocks a normal two-measure analysis.** "Applies to every result that
   reads amount" means cost-weighted betweenness and money-weighted PageRank cannot both be
   right at once. Nothing on her screens says what PageRank does with a weight read as a distance,
   and the per-run "read another way for this run" control is not visible on the results panel or
   the path form. Severity 4. Quote: "In code, the meaning of a weight is a property of the call,
   not the column."
3. **Normalization is not on the face of a centrality result.** She saw it only in a Louvain run
   record; whether Betweenness's Details states its normalization (and directed or undirected
   divisor) is not shown. Severity 3. Quote: "If Betweenness's Details doesn't state normalization,
   the whole thing is worth half as much."
4. **"weighted" in a column header does not say by what or read how.** "Louvain weighted, seed 7"
   names neither the column nor the reading; with one column readable two ways, the header must
   say "amount as distance". Severity 3.
5. **Parallel transfers between the same two accounts are not explained at load or on the path.**
   Whether repeated transfers are kept as separate edges, summed, or collapsed changes both the
   cheapest route and PageRank; the transfers load step is silent about it. Severity 2.
   Quote: "Two accounts that transfer to each other five times -- is that five edges or one with a
   summed amount?"
6. **The weight cannot be declared at load.** Role offers no Weight. She accepted it ("matches how
   I think") but only because each result shows "not used yet". Severity 1.

## What worked for her

- "Found path (unweighted)" and "Paths ignore amount: hops were counted, not dollars." -- the
  sentence she said Gephi never writes.
- "Ties: 1 of 2 as short": she has never had a tool tell her a shortest path was not unique.
- The scope warning when From is outside the filter, with Run held until Scope is Full graph.
- The state line (exact, directed, scope, weight state) and the run record with its Copy button:
  "open Details, press Copy, paste" answers "what did each answer used".
- Table and CSV headers that carry the method, damping and scope.
- "Closeness WF-corrected" in the catalog: "somebody knows Wasserman-Faust".
