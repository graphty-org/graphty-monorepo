# Session: narrow to the biggest piece, then say who matters -- Expert Emma

**Participant:** Expert Emma, network scientist (Python notebooks, igraph, Gephi for figures).
**Task as given by the moderator:** "Look only at the biggest connected piece, and tell me its
size and who matters most in it."
**Screens used, in order:** the filter chip and its steps (Les Miserables co-appearances, 77
nodes), the main window at rest (same graph), the results panel (a 300-protein interaction
network and a 124,318-node patent citation network).
**Outcome:** finished, with a caveat. She reported the size with confidence and a "who matters"
answer she would only half sign.
**Ease (1 very hard -- 7 very easy):** 4.

## Think-aloud transcript

### 1. Filter chip, "No steps" state

> "OK. Les Miserables. Of course it is. Seventy-seven nodes, I know this graph by heart, so at
> least I can check the numbers."

She reads the right-hand Statistics panel before touching anything.

> "Nodes 77, edges 254, components 2, largest component 76, isolated nodes 1. Good -- that is
> the question answered already, frankly. Largest component is 76. The isolate is the little
> blue dot sitting on its own on the left. Fine."

> "Density 0.0865. Hm. 254 over 77 times 76 over 2... that is 254 over 2926, which is 0.0868,
> not 0.0865. Let me not get excited yet, maybe it is rounding something I do not know about."

(She comes back to this at step 3.)

> "But you said 'look only at' it, so you want me to restrict to it, not just read a count. In a
> notebook this is one line: `G.subgraph(max(nx.connected_components(G), key=len))`. Where is
> that here?"

She looks at the blue pill under the project name, "Full graph", with a funnel icon.

> "Funnel, so that is the filter. The popover is already open: 'No filter steps. Every number
> reads the full graph.' That sentence is actually useful -- it tells me what the numbers are
> computed on. I like that."

She clicks "Add step". The menu has two headings, "Filter to" and "Filter out". Under "Filter
to": "Largest component", "k-core...", "Rule...".

> "Oh. 'Largest component' is a first-class thing. Good, I was bracing for having to write a
> rule on some component-id attribute. And k-core right under it. Somebody here has used
> networkx."

She clicks "Largest component".

### 2. After adding the step

(From the prototype's behaviour: the chip reads "Filtered: 76 of 77 nodes -- 1 step"; the step
row reads "Filter to Largest component 76"; Statistics reads "Filtered graph: 76 of 77 nodes",
edges 254 of 254, components 1.)

> "76 of 77. With the denominator. Thank you. Edges 254 of 254, which is right -- the isolate had
> no edges to lose. Components 1. Good, it is internally consistent."

> "So the size: 76 nodes, 254 edges. That part took me thirty seconds, and most of that was me
> checking the arithmetic."

She looks at the "Three steps" tab to see what a longer pipeline looks like.

> "Steps stacked, each with the count left after it: 76, 41, 28. That is a pipeline, I can read
> that. Filter to largest component, then degree at least 5, then drop group 8. And the table
> keeps a 'degree on: full graph' column next to 'degree' when they differ -- Valjean 18 here
> against 36 in the full graph. That is exactly the thing that bites people: is the degree
> computed inside the filtered graph or on the original? It says so. Good."

She opens the "Component step after a removal" tab.

> "Remove Valjean, then take the largest component: 61 left, and there is a yellow exclamation
> mark next to the component step. What is that warning? It does not say. I would hover. If it
> is telling me 'the largest component changed because of the step above it', good, that is the
> right thing to warn about -- but I am guessing. A warning icon with no words is a riddle."

### 3. Main window at rest

She goes to the at-rest screen to see the normal view with the full statistics.

> "Different Statistics panel. Now it is 'Overview: General' with a 'Replace' link, and density
> 0.0868. So it IS 0.0868. The other screen said 0.0865 for the same graph. Same 77 nodes, same
> 254 edges, two different densities. That is the kind of thing I would write the tool off for
> if it happened in the real product -- if two panels disagree on the third decimal of the
> simplest number there is, why would I trust betweenness?"

> "And this panel says 'Connected components 2 (1 isolate)' but not the size of the largest one.
> The filter screen had 'largest component 76' as its own row. I want that row everywhere. It is
> the first number I look at on any network."

> "The degree distribution is a sparkline. Tiny. Fine for a glance. No axis, no log option; I
> will want to click it."

### 4. "Who matters most"

> "Now the actual question. 'Who matters most' is not a question, it is three questions. Most
> connected: degree. Most on the paths between others: betweenness. Most connected to the
> well-connected: eigenvector. On Les Mis they will all say Valjean anyway, but I would not put
> 'matters most' in a report without saying which."

> "Degree I already have: the table under the graph is sorted by degree, Valjean 36, then
> Gavroche 22, Marius 19, Javert 17, Thenardier 16. With the isolate gone nothing changes,
> obviously."

She goes to the results panel for betweenness.

> "Results tab. A catalog: Betweenness, Closeness, Eigenvector, Harmonic, HITS, Katz, PageRank.
> Proper names, no 'influence score'. Good. Eigenvector has a warning, '3 components', on the
> protein graph. Correct -- eigenvector centrality on a disconnected graph is not well defined,
> and I have seen tools just silently return something. That one earns a point."

> "Closeness says 'WF-corrected'. Wasserman-Faust. And the note explains what the correction
> does and that on this graph no rank changes. That is the kind of honesty I want. networkx has
> `wf_improved=True` as the default, so it matches."

She opens the finished betweenness state.

> "State line: 'on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected.
> WebGPU.' Good, it names the scope, whether it is sampled, and how it read the edges. That is
> the trust check I would otherwise do by hand."

> "Then there is a Scope dropdown: 'Full graph'. So here is my question: I filtered to the
> largest component. Does the run follow the filter, or do I have to change Scope? And what is
> in that dropdown -- 'Filtered graph'? 'Largest component'? A named set? I cannot see it, it is
> closed. If it defaults to the full graph after I have filtered, people will run betweenness on
> the full graph and read it as if it were on the component. The state line would save them only
> if they read it."

> "For betweenness it does not matter much -- isolates contribute nothing -- but for closeness it
> does, and for anything with normalization by n minus 1 it does. On 76 versus 77 nodes the
> normalized values shift."

> "Top nodes: MAPK1 0.1379, TP53 0.1139. Normalized how? Divided by (n-1)(n-2)/2, like networkx
> with `normalized=True`? Or igraph's raw counts? The number 0.1379 is clearly normalized, but
> the panel does not say by what. There is a 'Details' link; I would click it and I would expect
> the formula there. If it is not there, I would open the source."

> "Also -- this is a protein network, not my Les Mis graph. So in this prototype I cannot
> actually get betweenness on the component I just filtered. I will answer with degree, and say
> so."

### Her answer to the moderator

> "The largest connected component is 76 of the 77 nodes and all 254 edges; the one left out is
> an isolate. By degree, Valjean matters most -- 36 neighbours, next is Gavroche at 22. I would
> want betweenness on the component before I said 'matters most' in writing, and I could not
> confirm from these screens that a run would use the filtered graph instead of the full one."

## After the task

**Single Ease Question:** 4 of 7.

> "The first half was a 6. 'Filter to largest component' is right there, the counts have
> denominators, and it tells me which graph each number is on. The second half dropped it: I
> could not see whether an algorithm follows my filter, I could not see how the values are
> normalized, and two panels gave me two densities for the same graph."

**Would she use this instead of her current tool?**

> "Instead of the notebook, no -- the notebook is where the analysis lives and I can rerun it.
> Instead of Gephi's filter panel for handing a view to someone? Possibly, yes. That filter
> pipeline with counts after each step is clearer than Gephi's drag-a-query-into-a-tree thing,
> and the 'degree on the full graph' column is something I have had to explain to students a
> dozen times. But fix the density. If I see one number that disagrees with networkx and nobody
> says why, that is the end of it."

## Problems observed

1. **Algorithm scope after filtering is not visible.** The results panel's Scope reads "Full
   graph" in a closed dropdown; she could not tell whether a run follows the filter chip, nor
   what the other choices are. Risk: centrality run on the full graph and read as if on the
   component. Severity 3.
2. **Two different densities for the same graph.** The filter chip screen shows 0.0865 for 77
   nodes and 254 edges; the at-rest screen shows 0.0868, which is correct (254 / 2926). Severity
   3 for this participant: a wrong basic number is a stated reason to write a tool off.
3. **Normalization of centrality values not stated.** Top nodes show 0.1379 etc. with no
   statement of how betweenness is normalized; only a "Details" link. Severity 2.
4. **Statistics panels differ between screens.** One lists "largest component 76", the other only
   "Connected components 2 (1 isolate)". The size of the largest component is the first number
   she wants and it should always be there. Severity 2.
5. **Unexplained warning icon on a filter step.** In the "Component step after a removal" state,
   a yellow "!" appears on the largest-component step with no visible words. Severity 2.
6. **"Who matters most" had no single path in the mocks.** Degree came from the table; a
   centrality run on the filtered Les Miserables graph was not reachable because the results
   panel shows other datasets. (A limit of the prototype, noted so it is not mistaken for a
   finding about the design.) Severity 1.

## What she liked

- "Filter to: Largest component" as a named step, with k-core beside it.
- Every filtered count carries its denominator ("76 of 77 nodes", "105 of 254" edges).
- "No filter steps. Every number reads the full graph." -- it names what the numbers are on.
- The table's "degree on: full graph" column next to the filtered degree.
- The run state line: scope, node count, components, exact or sampled, edge reading, engine.
- Eigenvector flagged on a disconnected graph; closeness names its Wasserman-Faust correction.
